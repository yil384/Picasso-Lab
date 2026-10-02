#!/usr/bin/env python3
"""Picasso Lab's first X post: a ~23 s 4:5 comic-page film introducing the lab, cut from the lab's own 3D comic films
(the four Projects card films + the ISCA 2026 Best Paper film) and a real team photo, laid out as comic panels on
cream paper with hand-lettered titles, caption boxes and whip-pan transitions.

    python3 social/x/intro.py --fonts DIR      ->  social/x/out/picasso_intro.mp4
Fonts: PermanentMarker.ttf (from video-kit/pipeline/fonts, woff2 -> ttf with fontTools) and NotoSansSC-Bold.ttf.
The Best Paper film is video-kit/films/xlaunch (branch video/x-launch); pass its master with --paper."""
import argparse, math, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ap = argparse.ArgumentParser()
ap.add_argument('--fonts', default=os.path.join(HERE, 'fonts'))
ap.add_argument('--paper', default='/home/user/vk/video-kit/out/xlaunch/xlaunch_master.mp4')
A = ap.parse_args()
W, H, FPS = 1080, 1350, 24
INK, PAPER, CREAM, RED, OCHRE, YEL = (26, 21, 48), (244, 235, 214), (255, 246, 224), (229, 70, 59), (242, 177, 52), (255, 225, 77)
MK = lambda s: ImageFont.truetype(os.path.join(A.fonts, 'PermanentMarker.ttf'), s)
TAU = 2 * math.pi
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
def sm(x): x = clamp(x); return x * x * (3 - 2 * x)
def ob(x, s=1.7): x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s)
def hsh(*n):
    x = math.sin(sum(v * (12.9898 + i * 78.233) for i, v in enumerate(n)) + 0.5) * 43758.5453
    return x - math.floor(x)

# ---------------------------------------------------------------------------------------------------------
# paper, sunburst
# ---------------------------------------------------------------------------------------------------------
def paper():
    rng = np.random.default_rng(4)
    a = np.ones((H, W, 3), np.float32) * np.array(PAPER, np.float32)
    low = np.asarray(Image.fromarray((rng.random((27, 22)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
    a *= (0.965 + 0.05 * low)[..., None]
    a += rng.normal(0, 4.5, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
PAPER_IMG = paper()

def sunburst(img, cx, cy, k, col=(250, 214, 140), n=36, rot=0.0):
    if k <= 0: return
    lay = Image.new('L', (W, H)); d = ImageDraw.Draw(lay)
    R = 1800 * k
    for i in range(n):
        a0 = rot + i / n * TAU; a1 = a0 + TAU / n * 0.5
        d.polygon([(cx, cy), (cx + R * math.cos(a0), cy + R * math.sin(a0)), (cx + R * math.cos(a1), cy + R * math.sin(a1))], fill=int(120 * min(1, k * 2)))
    img.paste(Image.new('RGB', (W, H), col), (0, 0), lay.filter(ImageFilter.GaussianBlur(1.2)))

def burst(img, cx, cy, rx, ry, k, fill=YEL, spikes=16, seed=1, rot=0.0):
    if k <= 0.01: return
    pts = []
    for i in range(spikes * 2):
        a = rot + i / (spikes * 2) * TAU
        r = (1.0 if i % 2 == 0 else 0.72 + 0.1 * hsh(seed, i)) * k
        pts.append((cx + math.cos(a) * rx * r, cy + math.sin(a) * ry * r))
    d = ImageDraw.Draw(img)
    d.polygon([(x + 12, y + 14) for x, y in pts], fill=INK)
    d.polygon(pts, fill=fill, outline=INK, width=7)

# ---------------------------------------------------------------------------------------------------------
# hand lettering: stroke skeletons -> ink shadow, ink outline, cream keyline, colour, sheen (as the films do)
# ---------------------------------------------------------------------------------------------------------
def ell(x, y, rx, ry, n=20, a0=0.0, a1=TAU):
    return [(x + rx * math.cos(a0 + (a1 - a0) * i / n), y + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]
GLYPH = {
    'H': (0.62, [[(0, 0), (0, 1)], [(0.62, 0), (0.62, 1)], [(0, 0.52), (0.62, 0.5)]]),
    'E': (0.54, [[(0.54, 0), (0, 0), (0, 1), (0.54, 1)], [(0, 0.5), (0.42, 0.5)]]),
    'L': (0.5, [[(0, 0), (0, 1), (0.5, 1)]]),
    'O': (0.8, [ell(0.4, 0.5, 0.4, 0.5)]),
    'X': (0.66, [[(0, 0), (0.66, 1)], [(0.66, 0), (0, 1)]]),
    'P': (0.58, [[(0, 1), (0, 0), (0.36, 0)] + ell(0.36, 0.25, 0.22, 0.25, 10, -math.pi / 2, math.pi / 2)[1:] + [(0, 0.5)]]),
    'I': (0.0, [[(0, 0), (0, 1)]]),
    'C': (0.7, [ell(0.42, 0.5, 0.42, 0.5, 18, -0.85, -TAU + 0.85)]),
    'A': (0.78, [[(0, 1), (0.39, 0), (0.78, 1)], [(0.17, 0.64), (0.61, 0.64)]]),
    'S': (0.62, [[(0.6, 0.12), (0.36, 0.0), (0.08, 0.1), (0.06, 0.32), (0.3, 0.47), (0.56, 0.6), (0.62, 0.84), (0.38, 1.0), (0.02, 0.9)]]),
    'B': (0.6, [[(0, 1), (0, 0), (0.32, 0)] + ell(0.32, 0.24, 0.2, 0.24, 8, -math.pi / 2, math.pi / 2)[1:] + [(0, 0.48), (0.36, 0.48)] + ell(0.36, 0.74, 0.24, 0.26, 8, -math.pi / 2, math.pi / 2)[1:] + [(0, 1)]]),
    '!': (0.0, [[(0, 0), (0, 0.62)]]),
    ',': (0.1, [[(0.1, 0.86), (0.0, 1.12)]]),
    ' ': (0.25, []),
}
def stroke(d, pts, col, w):
    d.line(pts, fill=col, width=int(w), joint='curve')
    for x, y in (pts[0], pts[-1]): d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=col)
def hand_word(img, word, cx, cy, size, fill, pops=None, rot=0.0, arc=0.0, seed=0, sheen=(255, 255, 255)):
    lw = size * 0.24; gap = size * 0.2
    widths = [GLYPH[c][0] * size + lw for c in word]
    total = sum(widths) + gap * (len(word) - 1)
    pad = int(size * 0.5)
    lay = Image.new('RGBA', (int(total + 2 * pad), int(size * 1.6 + 2 * pad)), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    ox, oy = pad, pad + size * 0.3
    letters, x = [], 0.0
    for i, c in enumerate(word):
        w, sk = GLYPH[c]
        t = i / max(1, len(word) - 1) - 0.5
        k = pops(i) if pops else 1.0
        ly = -arc * (1 - 4 * t * t) + (hsh(i, seed, 3) - 0.5) * size * 0.1
        rr = (hsh(i, seed, 5) - 0.5) * 0.2 + t * 0.2
        cxl = ox + x + widths[i] / 2; cyl = oy + size / 2 + ly
        strokes = []
        for s in sk:
            q = []
            for u, v in s:
                px, py = (u - w / 2) * size * k, (v - 0.5) * size * k
                q.append((cxl + px * math.cos(rr) - py * math.sin(rr), cyl + px * math.sin(rr) + py * math.cos(rr)))
            strokes.append(q)
        dot = c == '!'
        letters.append((strokes, k, (cxl - math.sin(rr) * 0.43 * size * k, cyl + math.cos(rr) * 0.43 * size * k) if dot else None))
        x += widths[i] + gap
    def passes(col, wd, dx, dy):
        for strokes, k, dotp in letters:
            if k <= 0.01: continue
            for s in strokes: stroke(d, [(a + dx, b + dy) for a, b in s], col, wd * k)
            if dotp: r = wd * 0.55 * k; d.ellipse((dotp[0] + dx - r, dotp[1] + dy - r, dotp[0] + dx + r, dotp[1] + dy + r), fill=col)
    passes(INK + (255,), lw + size * 0.13, size * 0.07, size * 0.085)
    passes(INK + (255,), lw + size * 0.13, 0, 0)
    passes(CREAM + (255,), lw + size * 0.06, 0, 0)
    passes(fill + (255,), lw, 0, 0)
    passes(sheen + (140,), lw * 0.28, -lw * 0.16, -lw * 0.2)
    if rot: lay = lay.rotate(math.degrees(-rot), resample=Image.BICUBIC, expand=True)
    img.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)), lay)

def marker(img, text, cx, cy, size, col=INK, rot=0.0, alpha=1.0, anchor='mm'):
    f = MK(size); d0 = ImageDraw.Draw(Image.new('L', (1, 1)))
    bb = d0.textbbox((0, 0), text, font=f)
    lay = Image.new('RGBA', (bb[2] - bb[0] + 40, bb[3] - bb[1] + 40), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((20 - bb[0], 20 - bb[1]), text, font=f, fill=col + (int(255 * alpha),))
    if rot: lay = lay.rotate(math.degrees(-rot), resample=Image.BICUBIC, expand=True)
    img.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)), lay)

def caption_box(img, title, cx, cy, k, rot=-0.025, fill=YEL):
    """a comic caption: yellow box, ink border and drop shadow, marker text"""
    if k <= 0.01: return
    f = MK(54); bb = ImageDraw.Draw(img).textbbox((0, 0), title, font=f)
    w, h = bb[2] - bb[0] + 64, bb[3] - bb[1] + 44
    lay = Image.new('RGBA', (w + 40, h + 40), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rectangle((24, 26, w + 24, h + 26), fill=INK + (255,))
    d.rectangle((10, 10, w + 10, h + 10), fill=fill + (255,), outline=INK + (255,), width=6)
    d.text((10 + 32 - bb[0], 10 + 22 - bb[1]), title, font=f, fill=INK + (255,))
    lay = lay.rotate(math.degrees(-rot), resample=Image.BICUBIC, expand=True)
    s = ob(k)
    if s != 1: lay = lay.resize((max(1, int(lay.width * s)), max(1, int(lay.height * s))), Image.BICUBIC)
    img.paste(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)), lay)

# ---------------------------------------------------------------------------------------------------------
# panels
# ---------------------------------------------------------------------------------------------------------
def read_clip(path, start, n, crop):
    """n frames from `start` s, cropped (x, y, w, h in source px) and scaled to the panel size later"""
    x, y, w, h = crop
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{start}', '-i', path, '-frames:v', str(n), '-vf', f'crop={w}:{h}:{x}:{y},fps={FPS}',
           '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, check=True, stdout=subprocess.PIPE).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    out = [Image.fromarray(f) for f in fr]
    while len(out) < n: out.append(out[-1])
    return out

def panel(img, src, cx, cy, pw, ph, zoom, rot, shift=0.0, blur=0.0):
    """a comic panel: picture (slow push-in), ink border, hard ink drop shadow; shift/blur for the whip"""
    s = 1 + zoom
    sw, sh = src.size; cw, chh = sw / s, sh / s
    pic = src.resize((pw, ph), Image.LANCZOS, box=((sw - cw) / 2, (sh - chh) / 2, (sw + cw) / 2, (sh + chh) / 2))
    lay = Image.new('RGBA', (pw + 60, ph + 60), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rectangle((26, 30, pw + 26 + 14, ph + 30 + 16), fill=INK + (255,))
    lay.paste(pic, (20, 20)); d.rectangle((20 - 4, 20 - 4, pw + 20 + 3, ph + 20 + 3), outline=INK + (255,), width=9)
    lay = lay.rotate(math.degrees(-rot), resample=Image.BICUBIC, expand=True)
    x0 = int(cx + shift - lay.width / 2); y0 = int(cy - lay.height / 2)
    if blur > 0.5:   # horizontal motion blur: average shifted copies
        acc = None; n = 7
        for i in range(n):
            o = int((i / (n - 1) - 0.5) * blur)
            c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(lay, (x0 + o, y0), lay)
            a = np.asarray(c, np.float32); acc = a if acc is None else acc + a
        c = Image.fromarray((acc / n).astype(np.uint8), 'RGBA'); img.paste(c, (0, 0), c)
    else:
        img.paste(lay, (x0, y0), lay)

def speed_lines(img, k, seed):
    if k <= 0.02: return
    d = ImageDraw.Draw(img)
    for i in range(26):
        y = 120 + hsh(seed, i) * (H - 240); x = hsh(seed, i, 2) * W; L = (200 + 500 * hsh(seed, i, 3)) * k
        d.line((x - L / 2, y, x + L / 2, y), fill=INK, width=int(2 + 4 * hsh(seed, i, 4)))

# ---------------------------------------------------------------------------------------------------------
# beats
# ---------------------------------------------------------------------------------------------------------
P = os.path.join(ROOT, 'projects')
TEAM = os.path.join(ROOT, 'events', 'static', 'firespot_welcome_0920', '1.jpg')
# (kind, source, start s, crop, frames, caption, name, fact line(s))
BEATS = [
    ('clip', f'{P}/qubrio/qubrio_loop.mp4', 24.6, (128, 0, 704, 528), 66, 'QUANTUM COMPUTING', 'Qubrio',
     ['LLM agents compile programs for', 'neutral-atom quantum computers: 4.7x faster']),
    ('clip', f'{P}/tritongym/tritongym_loop.mp4', 24.6, (128, 0, 704, 528), 66, 'LLMs THAT WRITE GPU KERNELS', 'TritonGym',
     ['An ICML 2026 benchmark:', '164 operators, a live leaderboard']),
    ('clip', f'{P}/tritondft/tritondft_loop.mp4', 26.9, (128, 0, 704, 528), 66, 'AI FOR SCIENCE', 'TritonDFT',
     ['Agents run quantum-chemistry (DFT)', 'end to end: 98% pass, 68x faster']),
    ('clip', f'{P}/chipmate/chipmate_loop.mp4', 15.6, (128, 0, 704, 528), 66, 'AI FOR CHIP DESIGN', 'ChipMATE',
     ['A 9B model writes Verilog:', '80.1% on VerilogEval v2']),
    ('clip', A.paper, 12.2, (90, 210, 900, 1000), 80, 'SYSTEMS FOR LLMs', 'ISCA 2026 Best Paper',
     ['Forecasting data movement in MoE models:', '6.6x on wafer-scale GPUs']),
    ('photo', TEAM, 0, None, 64, 'WHO WE ARE', 'The team',
     ['PhD students, postdocs and interns', 'at UC San Diego (and a lot of hot pot)']),
]
TITLE_N, END_N, WHIP = 84, 80, 6
PANEL_W = 1000

def title_frame(i):
    img = PAPER_IMG.copy()
    sunburst(img, W / 2, 470, sm(i / 10), rot=0.004 * i)
    burst(img, W / 2, 420, 430, 250, ob(i / 8), seed=3, rot=0.02 * math.sin(i * 0.2))
    hand_word(img, 'HELLO, X!', W / 2, 410, 128, RED, pops=lambda k: ob((i - 6 - k * 1.6) / 5), arc=18, seed=1)
    if i >= 30: marker(img, 'we are', W / 2, 700, 64, INK, rot=-0.04, alpha=sm((i - 30) / 6))
    hand_word(img, 'PICASSO LAB', W / 2, 830, 90, (91, 143, 216), pops=lambda k: ob((i - 36 - k * 1.3) / 5), arc=10, seed=2)
    if i >= 56:
        a = sm((i - 56) / 8)
        marker(img, 'UC San Diego  ·  Prof. Yufei Ding', W / 2, 1010, 50, INK, alpha=a)
        marker(img, 'systems for quantum computing, AI and chips', W / 2, 1090, 40, (120, 90, 80), alpha=a)
    return img

def beat_frame(b, i, n, src_frames, nxt=None):
    kind, src, st, crop, _, cap, name, fact = b
    img = PAPER_IMG.copy()
    sunburst(img, W / 2, 650, 0.9, col=(246, 224, 178), rot=0.002 * i)
    sw, sh = src_frames[0].size; pw = PANEL_W if sw > sh else 800; ph = int(pw * sh / sw)
    cy = 640 if ph < 800 else 625
    whip_in = 1 - sm(i / WHIP); whip_out = sm((i - (n - WHIP)) / WHIP)
    shift = 1150 * whip_in - 1150 * whip_out
    blur = 160 * (whip_in + whip_out) * (1 - abs(whip_in - whip_out) * 0.2) if (whip_in > 0.02 or whip_out > 0.02) else 0
    rot = (hsh(len(name)) - 0.5) * 0.03
    frame = src_frames[min(i, len(src_frames) - 1)]
    panel(img, frame, W / 2, cy, pw, ph, 0.05 * i / n, rot, shift, blur)
    speed_lines(img, max(whip_in, whip_out), i)
    top = cy - ph / 2
    caption_box(img, cap, W / 2 - 40 + shift * 0.6, top - 52, (i - 3) / 6)
    if i >= 8:
        a = sm((i - 8) / 6) * (1 - whip_out)
        yb = cy + ph / 2 + 70
        marker(img, name, W / 2, yb, 62, RED, rot=-0.02, alpha=a)
        for k, line in enumerate(fact): marker(img, line, W / 2, yb + 78 + k * 54, 40, INK, alpha=a)
    return img

def end_frame(i):
    img = PAPER_IMG.copy()
    sunburst(img, W / 2, 560, sm(i / 8), rot=-0.003 * i)
    hand_word(img, 'PICASSO LAB', W / 2, 360, 92, (91, 143, 216), pops=lambda k: ob((i - 2 - k * 1.0) / 5), arc=12, seed=5)
    if i >= 10: marker(img, 'UC San Diego  ·  Prof. Yufei Ding', W / 2, 520, 50, INK, alpha=sm((i - 10) / 6))
    burst(img, W / 2, 760, 470, 190, ob((i - 16) / 7), seed=8, rot=0.015 * math.sin(i * 0.25))
    if i >= 18: marker(img, '@PicassoLabUCSD', W / 2, 752, 84, RED, rot=-0.03, alpha=sm((i - 18) / 4))
    if i >= 30:
        a = sm((i - 30) / 6)
        marker(img, 'Follow along: papers, demos, lab life', W / 2, 960, 44, INK, alpha=a)
        marker(img, 'yufeiding.ucsd.edu', W / 2, 1040, 44, (120, 90, 80), alpha=a)
    return img

def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    out = os.path.join(HERE, 'out', 'picasso_intro.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
                           '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    only = os.environ.get('ONLY')   # authoring: ONLY=frame list -> stills
    frames = []
    for i in range(TITLE_N): frames.append(('t', i))
    for bi, b in enumerate(BEATS):
        for i in range(b[4]): frames.append(('b', bi, i))
    for i in range(END_N): frames.append(('e', i))
    want = set(int(x) for x in only.split(',')) if only else None
    cache = {}
    for fi, f in enumerate(frames):
        if want is not None and fi not in want: continue
        if f[0] == 't': img = title_frame(f[1])
        elif f[0] == 'e': img = end_frame(f[1])
        else:
            bi, i = f[1], f[2]; b = BEATS[bi]
            if bi not in cache:
                cache.clear()
                if b[0] == 'clip': cache[bi] = read_clip(b[1], b[2], b[4], b[3])
                else:
                    im = ImageOps.exif_transpose(Image.open(b[1])).convert('RGB'); im.thumbnail((1600, 1600))
                    cw = int(im.width * 0.87); ch = int(cw * 3 / 4); x0 = im.width - cw; y0 = int(im.height * 0.16)   # right of the no-trespassing sign
                    cache[bi] = [im.crop((x0, y0, x0 + cw, y0 + ch))]
            img = beat_frame(b, i, b[4], cache[bi])
        if want is not None: img.save(os.path.join(HERE, 'out', f'still_{fi:04d}.jpg'), quality=85); continue
        ff.stdin.write(img.tobytes())
    ff.stdin.close(); ff.wait()
    if want is None: print(out, len(frames), 'frames', os.path.getsize(out) // 1024, 'KB')

if __name__ == '__main__':
    main()
