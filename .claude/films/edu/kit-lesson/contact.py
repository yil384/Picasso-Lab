#!/usr/bin/env python3
"""Contact sheet of a lesson film at chosen seconds; with --ref, the same seconds of another scene beside it, pixel
differences measured, and (with --every) a dense numeric check over the whole film.

    python3 kit-lesson/contact.py EP --t 0 33.5 74 120 143.5 205 229 263 --out DIR [--lang en] [--workers 4]
    python3 kit-lesson/contact.py l01-01 --ref episodes/l01-5min/film/film.html --t ... --every 0.5 --out DIR

EP is the ep= value of kit-lesson/lesson.html (a folder under episodes/). Paths are relative to .claude/films/edu.
Writes DIR/sheet.jpg (one column per second: the lesson film; with --ref three rows: reference, lesson, difference x8),
DIR/report.json, and the frames in DIR/lesson, DIR/ref. Run it with the Python that has Playwright, numpy and Pillow
(~/miniforge3/bin/python3 on this Mac).
"""
import argparse, glob, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

EDU = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SNAP = os.path.join(EDU, 'tools', 'snap.py')


def render(scene, frames, out, q=(), workers=4):
    """Render frames of scene (path under edu/) to PNG in out with parallel snap.py workers.
    Returns ({frame: path}, None) or (None, 'error')."""
    os.makedirs(out, exist_ok=True)
    todo = sorted(set(frames))
    chunks = [todo[i::workers] for i in range(workers) if todo[i::workers]]
    procs = []
    for k, ch in enumerate(chunks):
        cmd = [sys.executable, SNAP, scene] + [str(i) for i in ch] + ['--out', out] + sum((['--q', x] for x in q), [])
        log = open(os.path.join(out, 'worker%d.log' % k), 'w')
        procs.append((subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, cwd=EDU), k))
    bad = [k for p, k in procs if p.wait() != 0]
    if bad:
        return None, 'snap workers %s failed (see %s/worker*.log)' % (bad, out)
    got = {}
    for i in todo:
        hits = glob.glob(os.path.join(out, 'f%05d*.png' % i))
        if not hits:
            return None, 'frame %d missing in %s' % (i, out)
        got[i] = sorted(hits)[0]
    errs = []
    for k in range(len(chunks)):
        for line in open(os.path.join(out, 'worker%d.log' % k)):
            if line.startswith(('pageerror', 'console.error', 'console.warning')) and 'favicon' not in line:
                errs.append(line.strip())
    return {'files': got, 'console': sorted(set(errs))}, None


def diff(a, b):
    """Pixel difference of two frames. Returns ({max, mean, changed, image}, None) or (None, 'error')."""
    try:
        A = np.asarray(Image.open(a).convert('RGB')).astype(np.int16)
        B = np.asarray(Image.open(b).convert('RGB')).astype(np.int16)
    except OSError as e:
        return None, str(e)
    if A.shape != B.shape:
        return None, 'sizes differ: %s %s' % (A.shape, B.shape)
    D = np.abs(A - B).max(2)
    img = Image.fromarray(np.clip(255 - D * 8, 0, 255).astype(np.uint8)).convert('RGB')
    return {'max': int(D.max()), 'mean': float(D.mean()), 'changed': int((D > 8).sum()), 'image': img}, None


def sheet(out, cols, rows, h=600, pad=14):
    """cols = [(title, [PIL images per row], note)], rows = row names. Returns (path, None) or (None, 'error')."""
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 20)
    except OSError:
        font = None
    w = round(h * 1080 / 1920)
    W = 150 + len(cols) * (w + pad) + pad
    Hh = 40 + len(rows) * (h + pad) + 60
    S = Image.new('RGB', (W, Hh), (30, 30, 34))
    d = ImageDraw.Draw(S)
    for r, name in enumerate(rows):
        d.text((12, 40 + r * (h + pad) + h // 2), name, fill=(220, 220, 220), font=font)
    for c, (title, ims, note) in enumerate(cols):
        x = 150 + pad + c * (w + pad)
        d.text((x, 10), title, fill=(240, 240, 240), font=font)
        for r, im in enumerate(ims):
            S.paste(im.convert('RGB').resize((w, h), Image.LANCZOS), (x, 40 + r * (h + pad)))
        d.text((x, 40 + len(rows) * (h + pad) + 4), note, fill=(200, 200, 160), font=font)
    try:
        S.save(out, quality=88)
    except OSError as e:
        return None, str(e)
    return out, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ep')
    ap.add_argument('--t', nargs='+', type=float, required=True, help='seconds for the sheet')
    ap.add_argument('--ref', help='reference scene (path under edu/) rendered at the same seconds')
    ap.add_argument('--every', type=float, help='with --ref: also compare every N seconds over the whole film')
    ap.add_argument('--lang', default='en')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    q = ['ep=' + a.ep] + (['lang=' + a.lang] if a.lang != 'en' else [])
    qref = ['lang=' + a.lang] if a.lang != 'en' else []
    frames = [round(t * a.fps) for t in a.t]
    dense = []
    if a.every and a.ref:
        tl = json.load(open(os.path.join(EDU, 'episodes', a.ep, 'timeline.json'))) if '/' not in a.ep else None
        if tl is None:
            sys.exit('--every needs ep as a folder name under episodes/')
        n = round(tl['dur'] * a.fps)
        dense = list(range(0, n, max(1, round(a.every * a.fps)))) + [n - 1]
    allf = sorted(set(frames + dense))
    les, err = render('kit-lesson/lesson.html', allf, os.path.join(a.out, 'lesson'), q, a.workers)
    if err:
        sys.exit(err)
    report = {'ep': a.ep, 'lang': a.lang, 'console_lesson': les['console'], 'sheet': {}, 'dense': {}}
    ref = None
    if a.ref:
        ref, err = render(a.ref, allf, os.path.join(a.out, 'ref'), qref, a.workers)
        if err:
            sys.exit(err)
        report['console_ref'] = ref['console']
    cols = []
    for t, i in zip(a.t, frames):
        L = Image.open(les['files'][i])
        if ref:
            dd, err = diff(ref['files'][i], les['files'][i])
            if err:
                sys.exit(err)
            report['sheet']['%.2f' % t] = {k: dd[k] for k in ('max', 'mean', 'changed')}
            note = 'max %d  >8: %d px' % (dd['max'], dd['changed'])
            cols.append(('t=%.1fs  f%d' % (t, i), [Image.open(ref['files'][i]), L, dd['image']], note))
        else:
            cols.append(('t=%.1fs  f%d' % (t, i), [L], ''))
    rows = ['reference', 'lesson', 'diff x8'] if ref else [a.ep]
    path, err = sheet(os.path.join(a.out, 'sheet.jpg'), cols, rows)
    if err:
        sys.exit(err)
    if dense:
        worst = []
        for i in dense:
            dd, err = diff(ref['files'][i], les['files'][i])
            if err:
                sys.exit(err)
            report['dense'][i] = {k: dd[k] for k in ('max', 'mean', 'changed')}
            if dd['changed']:
                worst.append((dd['changed'], i))
        report['dense_summary'] = {'frames': len(dense), 'identical': sum(1 for v in report['dense'].values() if v['max'] == 0),
                                   'with_changed_px': len(worst), 'worst': sorted(worst, reverse=True)[:10]}
    json.dump(report, open(os.path.join(a.out, 'report.json'), 'w'), indent=1)
    print(path)
    print(json.dumps({k: report[k] for k in report if k not in ('dense',)}, indent=1))


if __name__ == '__main__':
    main()
