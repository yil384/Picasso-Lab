#!/usr/bin/env python3
"""What was on screen when, for the quantum course (CSE 291P Quantum Computing Systems, 2024 and 2025 recordings).

    ~/miniforge3/bin/python3 .claude/films/edu/tools/qc_slides.py Q25-06 Q24-04     # these lectures
    ~/miniforge3/bin/python3 .claude/films/edu/tools/qc_slides.py --all             # every QYY-NN.mp4 / .pdf of hers
        [--force] [--sheet-only]

Reads course-qc/QYY-NN.mp4 and, when the lecture has a deck, course-qc/QYY-NN.pdf (QYY-NN.notes.pdf files are typed or
handwritten notes, never matched; a deck without a recording just gets its pages and a sheet). Writes into course-qc/
(git-ignored; never commit any of it):
  QYY-NN.slides/       pNN.png  deck pages (1280 wide)
                       sNNN.png frames cut from the recording: the shared screen only (Zoom's camera tiles and the
                                participant strip are painted over or cut away, an iPad's status bar is cut), 1280 on
                                the long side (portrait pages are 1280 tall)
  QYY-NN.slides.json   no deck:   {"lecture", "pdf": null, "notes"?, "segments": [{"slide", "start", "end", "png",
                                   "kind"}], "slides": {"N": {"png", "first", "last", "total", "size", "deck"?}}}
                       with deck: transcribe.py's slide timing ({"lecture", "pdf", "pages", "step", "segments":
                                   [{"slide", "start", "end", "score", "png"}], "slides"}) plus "gaps": the spans no
                                   deck page matched, cut from the recording like a lecture without a deck
                                   ([{"slide", "start", "end", "png", "kind", "deck"?}], "gap_slides")
                       times in seconds of the recording; kind "screen" (a PNG), "camera" (moving pictures: gallery
                       view, a video, a face), "other" (a dark screen: gallery view, a desktop) or "blank": no PNG, so
                       no face or student name is saved; "deck": {"pdf", "page", "score"} when a cut frame looks like a
                       page of one of the decks in course-qc/ (a clean source for the film); "faces": a cut frame
                       with a photo of someone on it
  QYY-NN.sheet.png     contact sheet, 6 columns, in time order: slide number (p = deck page) and mm:ss-mm:ss

How a lecture without a deck is cut: the recording is decoded at 1 frame/s, 192 px wide, grey (cached in
~/picasso-work/cache/qc-thumbs). Pixels that keep moving while the rest of the screen holds still are camera tiles (a
face in the top-right corner is Zoom's 16:9 tile); they are left out of the comparison and always painted over. The
participant strip is found in each saved frame by its avatar squares and the dark gutter beside them, and its whole
column is cut away (a slide shown under the strip loses its right edge: use the deck page when "deck" names one). A new
slide starts when content disappears between two seconds (a slide change, a page turn, a scroll, an eraser) or has
drifted away since the slide began; ink and builds that only add to the screen stay in the same slide, and its PNG is
the last second before the change (the finished page). A slide held under HOLD s is a transition and joins the next one;
a slide that looks like an earlier one (going back) keeps the earlier number and PNG. Every PNG is checked for faces
(macOS Vision, a small Swift tool compiled into ~/picasso-work/cache/qc-faces): a camera picture is deleted.
Lectures with a deck: transcribe.align_slides on thumbnails of the letterboxed slide area, with the camera column left
out of the match on both sides.

Only Prof. Ding's own lectures: GUEST lectures (outside speakers, students) are refused. Each function returns
(value, None) on success and (None, 'error') on failure.
"""
import argparse, glob, json, os, re, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
COURSE = os.path.abspath(os.path.join(HERE, '..', 'course-qc'))
CACHE = os.path.expanduser('~/picasso-work/cache/qc-thumbs')
GUEST = {'Q24-06': 'guest lecture (Xanadu)', 'Q24-07': 'guest lecture (Quantinuum, TKET)',
         'Q24-10': 'guest lecture (Amazon Web Services, near-term algorithms)',
         'Q24-12': 'guest lecture (University of Pennsylvania, compiler optimization)',
         'Q25-12': 'guest lecture (a PhD student of her group, surface codes)'}
TW = 192                       # analysis width
HOLD = 6.0                     # s: a shorter hold is a transition
OUT_W = 1280
GAP_MIN = 12.0                 # s: an unmatched span this long in a deck lecture is cut from the recording


def mmss(t):
    return f'{int(t // 60):02d}:{int(t % 60):02d}'


def probe(mp4):
    """Frame size, frame rate and duration. Returns ({'w', 'h', 'fps', 'dur'}, None) or (None, 'error')."""
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,r_frame_rate', '-show_entries', 'format=duration', '-of', 'json', mp4],
                       capture_output=True, text=True)
    try:
        j = json.loads(r.stdout)
        s = j['streams'][0]
        a, b = s['r_frame_rate'].split('/')
        return {'w': int(s['width']), 'h': int(s['height']), 'fps': float(a) / float(b),
                'dur': float(j['format']['duration'])}, None
    except (ValueError, KeyError, IndexError, ZeroDivisionError) as e:
        return None, f'ffprobe {os.path.basename(mp4)}: {type(e).__name__}: {e} {r.stderr[-200:]}'


def thumbs(lec, mp4, info):
    """Grey frames, one per second, TW wide (cached). Returns (array F x h x TW uint8, None) or (None, 'error')."""
    import numpy as np
    os.makedirs(CACHE, exist_ok=True)
    th = round(TW * info['h'] / info['w'] / 2) * 2
    out = os.path.join(CACHE, f'{lec}.{TW}.npy')
    if os.path.exists(out):
        a = np.load(out)
        if a.shape[1:] == (th, TW) and abs(len(a) - info['dur']) < 3:
            return a, None
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', mp4, '-an', '-vf',
                        f'fps=1,scale={TW}:{th}:flags=area,format=gray', '-f', 'rawvideo', '-'], capture_output=True)
    if r.returncode or not r.stdout:
        return None, 'ffmpeg thumbnails: ' + r.stderr.decode('utf-8', 'replace')[-300:]
    a = np.frombuffer(r.stdout, np.uint8).reshape(-1, th, TW)
    np.save(out + '.part.npy', a)
    os.replace(out + '.part.npy', out)
    return a, None


def blur(a):
    import cv2, numpy as np
    return np.stack([cv2.GaussianBlur(f, (3, 3), 0) for f in a])


def camera_tiles(th):
    """Where camera pictures sit: pixels that keep changing on seconds when the rest of the screen holds still.
    Returns ({'mask': bool h x w (camera tiles at any time, as rectangles), 'rects': [(x0, y0, x1, y1)],
    'busy': bool per frame (most of the screen moving: gallery view or a video)}, None) or (None, 'error')."""
    import cv2, numpy as np
    F, h, w = th.shape
    if F < 40:
        return None, 'recording too short'
    count = np.zeros((h, w), np.int32)
    busy = np.zeros(F, bool)
    win = 30
    for s in range(0, F - 1, win // 2):
        e = min(F, s + win + 1)
        d = np.abs(np.diff(th[s:e].astype(np.int16), axis=0))
        g = (d > 12).mean(axis=(1, 2))
        q = d[g < 0.03]
        if len(q) < 8:
            continue
        m = (q > 4).mean(axis=0)
        cam = m > 0.3
        if cam.mean() > 0.2:                         # gallery view, a video: not an overlay
            busy[s:e] = True
            continue
        count += cam
    union = count >= 3                               # a camera moves in many windows; a burst of writing in one
    u8 = cv2.morphologyEx(union.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(u8)
    rects = []
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        edge = x <= 2 or y <= 2 or x + ww >= w - 2 or y + hh >= h - 2
        if area >= 20 and ww >= 6 and hh >= 6 and (edge or x + ww / 2 > 0.6 * w):   # Zoom puts tiles at the side
            rects.append([int(x), int(y), int(x + ww), int(y + hh)])
    mask = np.zeros((h, w), bool)
    for x0, y0, x1, y1 in rects:
        mask[max(0, y0 - 2):y1 + 2, max(0, x0 - 2):x1 + 2] = True
    return {'mask': mask, 'rects': rects, 'busy': busy}, None


def strip_rect(th, cam):
    """Zoom's participant strip: the column of tiles under a camera tile at the right edge (the other tiles show a
    name or a photo and do not move). Returns ((x0, y0, x1, y1) in thumbnail pixels or None, None)."""
    import numpy as np
    F, h, w = th.shape
    right = [r for r in cam['rects'] if r[2] >= w - 0.2 * w and r[1] <= 0.25 * h]
    if not right:
        return None, None
    x0 = min(r[0] for r in right)
    y_top = min(r[1] for r in right)
    y_cam = max(r[3] for r in right)
    pick = th[::5, :, x0:]                                     # how often each strip pixel is black (tile gutters)
    black = (pick < 24).mean(axis=0)
    rows = (black > 0.5).mean(axis=1)                          # per row: share of the column that is mostly black
    y1 = y_cam
    gap = 0
    for y in range(y_cam, h):
        if rows[y] > 0.12:
            y1, gap = y + 1, 0
        else:
            gap += 1
            if gap > 6:
                break
    return (int(x0), int(y_top), int(w), int(y1)), None


def segment(th, keep, frames, hold=HOLD):
    """Cut a run of seconds into slides. keep: bool h x w of pixels to compare (camera tiles left out).
    Returns ([[a, b], ...] frame ranges, None)."""
    import numpy as np
    if len(frames) == 0:
        return [], None
    f = th[frames].astype(np.int16)
    k = keep
    n = max(1, int(k.sum()))
    segs, a = [], 0
    anchor = f[0]
    for i in range(1, len(f)):
        d = f[i] - f[i - 1]
        light = ((d > 20) & k).sum() / n                       # content gone (on a light page)
        dark = ((d < -20) & k).sum() / n
        drift = (((f[i] - anchor) > 20) & k).sum() / n
        if light > 0.006 or light + dark > 0.05 or drift > 0.02:
            segs.append([a, i - 1])
            a = i
            anchor = f[i]
    segs.append([a, len(f) - 1])
    out = []                                                   # a short hold joins the next slide
    pend = None
    for s in segs:
        if pend is not None:
            s = [pend, s[1]]
            pend = None
        if s[1] - s[0] + 1 < hold:
            pend = s[0]
            continue
        out.append(s)
    if pend is not None:
        if out:
            out[-1][1] = len(f) - 1
        else:
            out.append([pend, len(f) - 1])
    return [[int(frames[a]), int(frames[b])] for a, b in out], None


def same_slide(x, y, keep):
    import numpy as np
    d = np.abs(x.astype(np.int16) - y.astype(np.int16))[keep]
    return d.mean() < 3.0 and (d > 25).mean() < 0.004


def grab(mp4, info, times, tmp):
    """Full-size frames at these times (s): one seek each, three at a time. Returns ({time: png path}, None) or
    (None, 'error')."""
    from concurrent.futures import ThreadPoolExecutor

    def one(t):
        out = os.path.join(tmp, f'g{t:09.2f}.png')
        r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', mp4, '-an',
                            '-frames:v', '1', out], capture_output=True, text=True)
        return t, (out if not r.returncode and os.path.exists(out) else None), r.stderr[-200:]
    got = {}
    with ThreadPoolExecutor(3) as ex:
        for t, out, err in ex.map(one, sorted(set(times))):
            if not out:
                return None, f'ffmpeg grab at {t:.1f} s: {err}'
            got[t] = out
    return got, None


def find_strip(img):
    """Zoom's participant strip in one full-size frame, found by its avatar tiles (squares of one strong colour with a
    letter) at the right edge and the dark gutter to their left. Returns (left edge x or None, None)."""
    import cv2, numpy as np
    H, W = img.shape[:2]
    xs = int(W * 0.7)
    hsv = cv2.cvtColor(img[:, xs:], cv2.COLOR_RGB2HSV)
    sat = ((hsv[:, :, 1] > 90) & (hsv[:, :, 2] > 60)).astype(np.uint8)
    sat = cv2.morphologyEx(sat, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(sat)
    sq = []
    for i in range(1, n):
        x, y, w, h, area = stats[i]
        if 0.06 * H <= w <= 0.22 * H and h >= 0.8 * w and area >= 0.5 * w * h:   # a square or a column of them
            sq.append((x + xs, y, x + xs + w, y + h))
    if not sq:
        return None, None
    lum = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    rows = np.zeros(H, bool)
    for x0, y0, x1, y1 in sq:
        rows[y0:y1] = True
    x = start = min(q[0] for q in sq)
    while x > W * 0.55 and (lum[rows, x - 1] < 40).mean() > 0.5:
        x -= 1
    right = (lum[rows, max(q[2] for q in sq):] < 40).mean() if max(q[2] for q in sq) < W else 1.0
    if start - x < 12 and right < 0.5:               # no gutter on either side: a coloured box on a slide
        return None, None
    return int(x), None


def content_crop(img, cover, strip_x0=None):
    """The shared screen of a full-size RGB frame. cover: rectangles (full-size pixels) of camera tiles to paint over;
    strip_x0: left edge of the participant strip under the camera tile at the right (its other tiles are found here:
    rows of that column with black gutters). Returns ((crop RGB, box), None) or (None, 'error')."""
    import cv2, numpy as np
    H, W = img.shape[:2]
    lum = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
    hidden = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in cover:
        hidden[max(0, y0):y1, max(0, x0):x1] = True
    sx0, _ = find_strip(img)
    if sx0 is not None:                              # the whole strip column goes, top to bottom
        hidden[:, max(0, sx0 - 2):] = True
    bright = ((lum > 34) & ~hidden).astype(np.uint8)
    bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bright)
    if n < 2:
        return None, 'nothing on screen'
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    x, y, ww, hh, area = stats[i]
    if area < 0.05 * H * W:
        return None, 'nothing on screen'
    x0, y0, x1, y1 = int(x), int(y), int(x + ww), int(y + hh)
    if cover and strip_x0 is not None and strip_x0 < x1 - 20:
        top = max([cy1 for cx0, cy0, cx1, cy1 in cover if cx1 > strip_x0], default=0)
        col = lum[:, max(0, strip_x0):x1] < 34
        share = col.mean(axis=1)
        end, quiet = top, 0
        for yy in range(top, y1):
            if share[yy] > 0.2:
                end, quiet = yy + 1, 0
            else:
                quiet += 1
                if quiet > 24:
                    break
        if end > top:
            hidden[:end, max(0, strip_x0):x1] = True
            below = np.where(share[end:y1] > 0.6)[0] + end     # the black column left under the last tile
            hidden[below, max(0, strip_x0):x1] = True
    dark = (lum < 34) & ~hidden                       # black bars and stray cursor bits at the edges go
    while y1 - y0 > 40 and dark[y0, x0:x1].mean() > 0.85:
        y0 += 1
    while y1 - y0 > 40 and dark[y1 - 1, x0:x1].mean() > 0.85:
        y1 -= 1
    while x1 - x0 > 40 and dark[y0:y1, x0].mean() > 0.85:
        x0 += 1
    while x1 - x0 > 40 and dark[y0:y1, x1 - 1].mean() > 0.85:
        x1 -= 1
    hsv = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_RGB2HSV)
    rows_sat = np.median(hsv[:, :, 1], axis=1)
    rows_val = np.median(hsv[:, :, 2], axis=1)
    top = 0                                          # an iPad's status and title bars (saturated, darker) go
    while top < len(rows_sat) // 4 and rows_sat[top] > 60 and rows_val[top] < 200:
        top += 1
    if top >= 8:
        y0 += top
    crop = img[y0:y1, x0:x1].copy()
    hid = hidden[y0:y1, x0:x1]
    if hid.any():
        bg = np.median(crop[~hid].reshape(-1, 3), axis=0) if (~hid).any() else np.array([255, 255, 255])
        crop[hid] = bg.astype(np.uint8)
    return (crop, (x0, y0, x1, y1)), None


FACES_SWIFT = r"""import Foundation
import Vision
import AppKit
// faces IMG... : one line per image: "<faces> <largest face height / image height> <path>" (-1: unreadable)
for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("-1 0 \(path)"); continue }
    let req = VNDetectFaceRectanglesRequest()
    do { try VNImageRequestHandler(cgImage: cg, options: [:]).perform([req]) } catch { print("-1 0 \(path)"); continue }
    let faces = (req.results ?? []).filter { $0.confidence > 0.5 }
    let big = faces.map { Double($0.boundingBox.height) }.max() ?? 0
    print("\(faces.count) \(String(format: "%.3f", big)) \(path)")
}
"""


def faces(path):
    """Faces in a picture (macOS Vision, compiled once into the cache). Returns ((count, largest face height as a
    share of the picture), None) or (None, 'error')."""
    d = os.path.join(os.path.dirname(CACHE), 'qc-faces')
    exe = os.path.join(d, 'faces')
    if not os.path.exists(exe):
        os.makedirs(d, exist_ok=True)
        src = os.path.join(d, 'faces.swift')
        with open(src, 'w') as f:
            f.write(FACES_SWIFT)
        r = subprocess.run(['swiftc', '-O', src, '-o', exe], capture_output=True, text=True)
        if r.returncode:
            return None, 'swiftc faces: ' + r.stderr[-300:]
    r = subprocess.run([exe, path], capture_output=True, text=True)
    try:
        n, big = r.stdout.split()[:2]
        n, big = int(n), float(big)
    except ValueError:
        return None, 'face check: ' + (r.stderr or r.stdout)[-200:]
    if n < 0:
        return None, f'face check cannot read {path}'
    return (n, big), None


def save_png(crop, path):
    """Landscape: 1280 wide; portrait: 1280 tall. Returns (path, None) or (None, 'error')."""
    import cv2
    h, w = crop.shape[:2]
    s = OUT_W / w if w >= h else OUT_W / h
    im = cv2.resize(crop, (max(1, round(w * s)), max(1, round(h * s))),
                    interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LANCZOS4)
    if not cv2.imwrite(path, cv2.cvtColor(im, cv2.COLOR_RGB2BGR)):
        return None, f'cannot write {path}'
    return path, None


def deck_thumbs():
    """64x36 grey thumbnails of every deck page in course-qc/ (for naming a cut frame's source).
    Returns ([(pdf name, page, thumb)], None) or (None, 'error')."""
    import numpy as np
    sys.path.insert(0, HERE)
    import transcribe
    out = []
    for pdf in sorted(glob.glob(os.path.join(COURSE, 'Q[0-9][0-9]-[0-9][0-9].pdf'))):
        st = os.stat(pdf)
        cf = os.path.join(CACHE, f'{os.path.basename(pdf)}.{st.st_size}.{int(st.st_mtime)}.pages.npy')
        if os.path.exists(cf):
            pages = np.load(cf)
        else:
            pages, err = transcribe.page_thumbs(pdf)
            if err:
                return None, err
            np.save(cf, pages)
        out += [(os.path.basename(pdf), i + 1, p) for i, p in enumerate(pages)]
    return out, None


def deck_match(crop, decks, min_score=0.85):
    """The deck page a cut frame shows, if any. Returns ({'pdf', 'page', 'score'} or None, None)."""
    import cv2, numpy as np
    h, w = crop.shape[:2]
    if not decks or w < 1.5 * h:
        return None, None
    g = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    t = cv2.GaussianBlur(cv2.resize(g, (64, 36), interpolation=cv2.INTER_AREA), (3, 3), 0).astype(np.float32).ravel()
    t -= t.mean()
    t /= max(np.linalg.norm(t), 1e-6)
    best = None
    for pdf, page, p in decks:
        v = p.astype(np.float32).ravel()
        v = v - v.mean()
        v /= max(np.linalg.norm(v), 1e-6)
        sc = float(t @ v)
        if best is None or sc > best['score']:
            best = {'pdf': pdf, 'page': page, 'score': round(sc, 3)}
    return (best if best and best['score'] >= min_score else None), None


def cut_screen(lec, mp4, info, th, spans, decks, outdir, start_no=1, prefix='s'):
    """Slides cut from the recording within spans [(t0, t1)] (s). Returns ({'segments': [...], 'slides': {...},
    'overlay': {...}}, None) or (None, 'error')."""
    import cv2, numpy as np
    thb = blur(th)
    cam, err = camera_tiles(thb)
    if err:
        return None, err
    strip, _ = strip_rect(th, cam)
    h, w = th.shape[1:]
    sx, sy = info['w'] / w, info['h'] / h
    tiles = []                                       # full-size camera tiles: a moving face at the top right is
    for x0, y0, x1, y1 in cam['rects']:              # Zoom's 16:9 tile in the corner, the rest as found
        X0, Y0, X1, Y1 = int(x0 * sx) - 4, int(y0 * sy) - 4, int(np.ceil(x1 * sx)) + 4, int(np.ceil(y1 * sy)) + 4
        if y0 <= 2 and X1 > 0.85 * info['w']:
            X0, Y0, X1 = min(X0, int(info['w'] - Y1 * 16 / 9)), 0, info['w']
        tiles.append([max(0, X0), max(0, Y0), min(info['w'], X1), min(info['h'], Y1)])
    corner = [t for t in tiles if t[1] == 0 and t[2] == info['w']]
    strip_x0 = min(t[0] for t in corner) if corner else None
    keep = ~cam['mask']
    for X0, Y0, X1, Y1 in tiles:
        keep[int(Y0 / sy):int(np.ceil(Y1 / sy)), int(X0 / sx):int(np.ceil(X1 / sx))] = False
    if strip:
        keep[strip[1]:strip[3], min(strip[0], int(strip_x0 / sx) if strip_x0 else w):strip[2]] = False
    segs = []
    for t0, t1 in spans:
        fr = np.arange(int(np.ceil(t0)), min(len(th), int(t1)))
        fr = fr[~cam['busy'][fr]] if len(fr) else fr
        busy_fr = np.arange(int(np.ceil(t0)), min(len(th), int(t1)))
        busy_fr = busy_fr[cam['busy'][busy_fr]] if len(busy_fr) else busy_fr
        # contiguous runs of non-busy frames are cut; busy runs become camera segments
        for run, kind in ((fr, 'screen'), (busy_fr, 'camera')):
            if not len(run):
                continue
            parts = np.split(run, np.where(np.diff(run) > 1)[0] + 1)
            for p in parts:
                if len(p) < HOLD:
                    continue
                if kind == 'camera':
                    segs.append({'a': int(p[0]), 'b': int(p[-1]), 'kind': 'camera'})
                    continue
                ss, err = segment(thb, keep, p)
                if err:
                    return None, err
                segs += [{'a': a, 'b': b, 'kind': 'screen'} for a, b in ss]
    segs.sort(key=lambda s: s['a'])
    for s in segs:                                   # moving pictures inside a slide's hold: camera, not a slide
        if s['kind'] == 'screen' and s['b'] - s['a'] >= 4:
            d = np.abs(np.diff(thb[s['a']:s['b'] + 1].astype(np.int16), axis=0))
            if ((d > 6).mean(axis=0)[keep] > 0.3).mean() > 0.25:
                s['kind'] = 'camera'
    # one PNG per distinct slide; the representative frame is the last second of the hold
    reps, slides, out = [], {}, []
    no = start_no
    with tempfile.TemporaryDirectory(dir=os.path.dirname(CACHE)) as tmp:
        times = [float(s['b']) for s in segs if s['kind'] == 'screen']
        got, err = grab(mp4, info, times, tmp)
        if err:
            return None, err
        for s in segs:
            seg = {'start': float(s['a']), 'end': float(min(s['b'] + 1, info['dur'])), 'kind': s['kind']}
            if s['kind'] == 'camera':
                seg.update({'slide': None, 'png': None})
                out.append(seg)
                continue
            rep = thb[s['b']]
            hit = next((r for r in reps if same_slide(r['thumb'], rep, keep)), None)
            if hit:
                seg.update({'slide': hit['slide'], 'png': hit['png']})
                if hit.get('deck'):
                    seg['deck'] = hit['deck']
                if hit.get('faces'):
                    seg['faces'] = hit['faces']
                out.append(seg)
                continue
            img = cv2.cvtColor(cv2.imread(got[float(s['b'])]), cv2.COLOR_BGR2RGB)
            res, err = content_crop(img, tiles, strip_x0)       # tiles are painted over whether or not they show
            if err:
                seg.update({'slide': None, 'png': None, 'kind': 'blank'})
                out.append(seg)
                continue
            crop, box = res
            if (cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY) > 170).mean() < 0.35:
                seg.update({'slide': None, 'png': None, 'kind': 'other'})   # gallery view, a desktop, a dark window
                out.append(seg)
                continue
            name = f'{prefix}{no:03d}.png'
            _, err = save_png(crop, os.path.join(outdir, name))
            if err:
                return None, err
            fc, err = faces(os.path.join(outdir, name))
            if err:
                return None, err
            if fc[0] and (fc[1] > 0.12 or (cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY) > 170).mean() < 0.6):
                os.remove(os.path.join(outdir, name))   # a camera picture: never kept
                seg.update({'slide': None, 'png': None, 'kind': 'camera'})
                out.append(seg)
                continue
            if fc[0]:
                seg['faces'] = fc[0]                    # a photo of someone on the slide: never shown in a film
            png = f'{lec}.slides/{name}'
            dm, _ = deck_match(crop, decks)
            reps.append({'thumb': rep, 'slide': no, 'png': png, 'deck': dm, 'faces': fc[0]})
            seg.update({'slide': no, 'png': png})
            if dm:
                seg['deck'] = dm
            slides[str(no)] = {'png': png, 'first': seg['start'], 'last': seg['end'], 'total': 0.0,
                               'size': [int(crop.shape[1]), int(crop.shape[0])], **({'deck': dm} if dm else {}),
                               **({'faces': fc[0]} if fc[0] else {})}
            no += 1
            out.append(seg)
    merged = []                                      # the same slide again right after a pause: one segment
    for seg in out:
        p = merged[-1] if merged else None
        if p and p['kind'] == seg['kind'] and p.get('slide') == seg.get('slide') and seg['start'] - p['end'] <= 1:
            p['end'] = seg['end']
        else:
            merged.append(seg)
    out = merged
    for seg in out:
        if seg.get('slide') is not None:
            d = slides[str(seg['slide'])]
            d['last'] = max(d['last'], seg['end'])
            d['total'] = round(d['total'] + seg['end'] - seg['start'], 1)
    ov = {'camera_tiles': tiles,
          'strip': [round(strip[0] * sx), round(strip[1] * sy), round(strip[2] * sx), round(strip[3] * sy)]
          if strip else None}
    return {'segments': out, 'slides': slides, 'overlay': ov}, None


def align_deck(mp4, pdf, th):
    """transcribe.py's slide timing, fed with thumbnails of the slide area only: these recordings letterbox the 16:9
    slide in a taller frame, which throws the whole-frame match off. Returns (its result, None) or (None, 'error')."""
    import cv2, numpy as np
    sys.path.insert(0, HERE)
    import transcribe
    lit = (th[::3] > 34).mean(axis=0)                # how often each pixel is lit; letterbox bars almost never
    y0, y1, x0, x1 = 0, th.shape[1], 0, th.shape[2]
    while y1 - y0 > 20 and lit[y0].mean() < 0.15:
        y0 += 1
    while y1 - y0 > 20 and lit[y1 - 1].mean() < 0.15:
        y1 -= 1
    while x1 - x0 > 20 and lit[y0:y1, x0].mean() < 0.15:
        x0 += 1
    while x1 - x0 > 20 and lit[y0:y1, x1 - 1].mean() < 0.15:
        x1 -= 1
    TW_, TH_ = transcribe.TW, transcribe.TH
    hide = np.zeros((TH_, TW_), bool)                # the camera corner and the strip under it: left out of the match
    cam, err = camera_tiles(blur(th))
    if not err:
        for rx0, ry0, rx1, ry1 in cam['rects']:
            if ry0 <= 2 and rx1 >= th.shape[2] - 2:
                tx0 = min(rx0, th.shape[2] - ry1 * 16 / 9)   # Zoom's 16:9 tile in the corner (same scale x, y)
                c0 = int((tx0 - x0) / (x1 - x0) * TW_) - 1
                hide[:, max(0, c0):] = True

    def masked(a):
        a = a.astype(np.float32)
        if hide.any():
            for f in a:
                f[hide] = f[~hide].mean()
        return a
    step = int(transcribe.STEP)
    vt = masked(np.stack([cv2.GaussianBlur(cv2.resize(f[y0:y1, x0:x1], (TW_, TH_), interpolation=cv2.INTER_AREA),
                                           (3, 3), 0) for f in th[::step]]))
    orig_v, orig_p = transcribe.video_thumbs, transcribe.page_thumbs
    transcribe.video_thumbs = lambda _mp4: (vt, None)

    def pages(pdf_):
        p, e = orig_p(pdf_)
        return (masked(p), None) if not e else (None, e)
    transcribe.page_thumbs = pages
    try:
        res, err = transcribe.align_slides(mp4, pdf)
    finally:
        transcribe.video_thumbs, transcribe.page_thumbs = orig_v, orig_p
    if res:
        res['masked_right'] = round(float(hide.mean()), 3)
    return res, err


def render_deck(lec, pdf, outdir):
    """Every page of the deck as pNN.png, 1280 wide. Returns (number of pages, None) or (None, 'error')."""
    with tempfile.TemporaryDirectory(dir=os.path.dirname(CACHE)) as tmp:
        r = subprocess.run(['pdftoppm', '-png', '-scale-to-x', str(OUT_W), '-scale-to-y', '-1', pdf,
                            os.path.join(tmp, 'p')], capture_output=True, text=True)
        if r.returncode:
            return None, 'pdftoppm: ' + r.stderr[-300:]
        files = sorted(glob.glob(os.path.join(tmp, 'p-*.png')), key=lambda f: int(re.findall(r'-(\d+)\.png$', f)[0]))
        for i, f in enumerate(files):
            shutil.move(f, os.path.join(outdir, f'p{i + 1:02d}.png'))
        return len(files), None


def sheet(lec, entries, out, cols=6, tw=312):
    """Contact sheet in time order. entries: [{'png' or None, 'label', 'sub'}]. Returns (out, None) or (None, err)."""
    from PIL import Image, ImageDraw, ImageFont
    if not entries:
        return None, 'nothing to show'
    sizes = []
    for e in entries:
        if e['png']:
            with Image.open(os.path.join(COURSE, e['png'])) as im:
                sizes.append(im.size)
    portrait = sum(1 for w, h in sizes if h > w) > len(sizes) / 2
    bw, bh = (tw, round(tw * 1.3)) if portrait else (tw, round(tw * 9 / 16))
    pad, lab = 10, 40
    rows = (len(entries) + cols - 1) // cols
    head = 44
    S = Image.new('RGB', (cols * (bw + pad) + pad, head + rows * (bh + lab + pad) + pad), (28, 28, 32))
    d = ImageDraw.Draw(S)
    try:
        f1 = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 15)
        f2 = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 22)
    except OSError:
        f1 = f2 = None
    d.text((pad, 10), f'{lec}  {len(entries)} segments', fill=(235, 235, 235), font=f2)
    for k, e in enumerate(entries):
        x = pad + (k % cols) * (bw + pad)
        y = head + (k // cols) * (bh + lab + pad)
        d.rectangle([x, y, x + bw - 1, y + bh - 1], fill=(50, 50, 56))
        if e['png']:
            with Image.open(os.path.join(COURSE, e['png'])) as im:
                im = im.convert('RGB')
                s = min(bw / im.width, bh / im.height)
                im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
                S.paste(im, (x + (bw - im.width) // 2, y + (bh - im.height) // 2))
        else:
            d.text((x + 12, y + bh // 2 - 8), e.get('empty') or 'no PNG', fill=(160, 160, 160), font=f1)
        d.text((x, y + bh + 3), e['label'], fill=(255, 214, 90), font=f1)
        if e.get('sub'):
            d.text((x, y + bh + 21), e['sub'], fill=(170, 170, 170), font=f1)
    try:
        S.save(out, optimize=True)
    except OSError as e:
        return None, f'cannot write {out}: {e}'
    return out, None


EMPTY = {'camera': 'moving picture, no PNG', 'other': 'dark screen, no PNG', 'blank': 'nothing shared'}


def sheet_entries(j):
    """Contact-sheet tiles from a slides.json, in time order."""
    ents = []
    for s in j['segments']:
        tag = f"p{s['slide']}" if j.get('pdf') else (f"#{s['slide']}" if s.get('slide') is not None else s['kind'])
        sub = f"score {s['score']}" if 'score' in s else (
            f"~{s['deck']['pdf'][:-4]} p{s['deck']['page']}" if s.get('deck') else '')
        ents.append({'t': s['start'], 'png': s.get('png'), 'label': f"{tag}  {mmss(s['start'])}-{mmss(s['end'])}",
                     'sub': sub, 'empty': EMPTY.get(s.get('kind'), '')})
    for g in j.get('gaps', []):
        tag = f"#{g['slide']}" if g.get('slide') is not None else g['kind']
        sub = 'not in deck' + (f"; ~{g['deck']['pdf'][:-4]} p{g['deck']['page']}" if g.get('deck') else '')
        ents.append({'t': g['start'], 'png': g.get('png'), 'label': f"{tag}  {mmss(g['start'])}-{mmss(g['end'])}",
                     'sub': sub, 'empty': EMPTY.get(g.get('kind'), '')})
    ents.sort(key=lambda e: e['t'])
    return ents


def run(lec, force=False, sheet_only=False):
    """Slides, slides.json and the sheet for one lecture. Returns (summary line, None) or (None, 'error')."""
    if lec in GUEST:
        return None, f'{lec}: skipped, {GUEST[lec]} - only Prof. Ding\'s own lectures'
    mp4 = os.path.join(COURSE, f'{lec}.mp4')
    pdf = os.path.join(COURSE, f'{lec}.pdf')
    sj = os.path.join(COURSE, f'{lec}.slides.json')
    outdir = os.path.join(COURSE, f'{lec}.slides')
    sh = os.path.join(COURSE, f'{lec}.sheet.png')
    t0 = time.time()
    if sheet_only or (os.path.exists(sj) and not force):
        try:
            j = json.load(open(sj))
        except (OSError, ValueError) as e:
            return None, f'{lec}: {e}'
        _, err = sheet(lec, sheet_entries(j), sh)
        return (f'{lec}  sheet only', None) if not err else (None, f'{lec}: {err}')
    if not os.path.exists(mp4) and os.path.exists(pdf):   # a deck without a recording (2024 lectures 1-3)
        if os.path.isdir(outdir):
            shutil.rmtree(outdir)
        os.makedirs(outdir)
        n, err = render_deck(lec, pdf, outdir)
        if err:
            return None, f'{lec}: {err}'
        j = {'lecture': lec, 'pdf': os.path.basename(pdf), 'pages': n, 'recording': None, 'segments': [],
             'slides': {str(i): {'png': f'{lec}.slides/p{i:02d}.png'} for i in range(1, n + 1)},
             'made': time.strftime('%Y-%m-%d %H:%M')}
        with open(sj, 'w') as f:
            json.dump(j, f, indent=1)
        _, err = sheet(lec, [{'png': f'{lec}.slides/p{i:02d}.png', 'label': f'p{i}', 'sub': 'no recording'}
                             for i in range(1, n + 1)], sh)
        return (f'{lec}  deck {n} pages, no recording', None) if not err else (None, f'{lec}: {err}')
    if not os.path.exists(mp4):
        return None, f'{lec}: no recording at {mp4}'
    info, err = probe(mp4)
    if err:
        return None, f'{lec}: {err}'
    if os.path.isdir(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    th, err = thumbs(lec, mp4, info)
    if err:
        return None, f'{lec}: {err}'
    decks, err = deck_thumbs()
    if err:
        return None, f'{lec}: deck thumbnails: {err}'
    if os.path.exists(pdf):
        al, err = align_deck(mp4, pdf, th)
        if err:
            return None, f'{lec}: slide timing: {err}'
        n, err = render_deck(lec, pdf, outdir)
        if err:
            return None, f'{lec}: {err}'
        for s in al['segments']:
            s['png'] = f'{lec}.slides/p{s["slide"]:02d}.png'
        for k, d in al['slides'].items():
            d['png'] = f'{lec}.slides/p{int(k):02d}.png'
        spans, t = [], 0.0
        for s in al['segments'] + [{'start': info['dur'], 'end': info['dur']}]:
            if s['start'] - t >= GAP_MIN:
                spans.append((t, s['start']))
            t = max(t, s['end'])
        own = [x for x in decks if x[0] != os.path.basename(pdf)]
        cut, err = cut_screen(lec, mp4, info, th, spans, own, outdir) if spans else ({'segments': [], 'slides': {},
                                                                                      'overlay': None}, None)
        if err:
            return None, f'{lec}: {err}'
        j = {'lecture': lec, **al, 'gaps': cut['segments'], 'gap_slides': cut['slides'], 'overlay': cut['overlay'],
             'duration': round(info['dur'], 1), 'made': time.strftime('%Y-%m-%d %H:%M')}
        covered = sum(s['end'] - s['start'] for s in al['segments'])
        summary = (f'{lec}  deck {al["pages"]} pages, {len(al["slides"])} timed, {len(al["segments"])} segments, '
                   f'{covered / info["dur"]:.0%} of the recording matched; {len(cut["slides"])} slides cut from '
                   f'{len(spans)} unmatched spans')
    else:
        cut, err = cut_screen(lec, mp4, info, th, [(0.0, info['dur'])], decks, outdir)
        if err:
            return None, f'{lec}: {err}'
        notes = os.path.join(COURSE, f'{lec}.notes.pdf')
        j = {'lecture': lec, 'pdf': None, **({'notes': os.path.basename(notes)} if os.path.exists(notes) else {}),
             'step': 1.0, 'hold': HOLD, 'segments': cut['segments'], 'slides': cut['slides'],
             'overlay': cut['overlay'], 'duration': round(info['dur'], 1), 'made': time.strftime('%Y-%m-%d %H:%M')}
        cam = sum(s['end'] - s['start'] for s in cut['segments'] if s['kind'] != 'screen')
        nd = sum(1 for d in cut['slides'].values() if d.get('deck'))
        summary = (f'{lec}  {len(cut["slides"])} slides cut, {len(cut["segments"])} segments'
                   f'{f", {nd} look like deck pages" if nd else ""}'
                   f'{f", {cam / 60:.0f} min camera/blank" if cam >= 60 else ""}')
    with open(sj + '.part', 'w') as f:
        json.dump(j, f, indent=1)
    os.replace(sj + '.part', sj)
    _, err = sheet(lec, sheet_entries(j), sh)
    if err:
        return None, f'{lec}: {err}'
    return f'{summary}  ({time.time() - t0:.0f} s)', None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('lectures', nargs='*')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--sheet-only', action='store_true')
    a = ap.parse_args()
    lecs = sorted({os.path.basename(p)[:6] for p in glob.glob(os.path.join(COURSE, 'Q2[0-9]-[0-9][0-9].mp4')) +
                   glob.glob(os.path.join(COURSE, 'Q2[0-9]-[0-9][0-9].pdf'))}) if a.all else [x.upper() for x in a.lectures]
    if a.all:
        lecs = [x for x in lecs if x not in GUEST]
    if not lecs:
        sys.exit('nothing to do: name lectures (Q25-06 Q24-04) or --all')
    bad = []
    for lec in lecs:
        line, err = run(lec, a.force, a.sheet_only)
        print(err or line, flush=True)
        if err:
            bad.append(lec)
    if bad:
        sys.exit(f'failed: {" ".join(bad)}')


if __name__ == '__main__':
    main()
