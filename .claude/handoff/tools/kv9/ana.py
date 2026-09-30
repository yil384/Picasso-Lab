"""usage: python3 kv9/ana.py <prefix>   (frames + json from kv9/reg.js, DSF 2)"""
import sys, glob, os, json
import numpy as np
from PIL import Image
pre = sys.argv[1]
O = 'kv9/out'
J = json.load(open(f'{O}/{pre}.json'))
dsf = J.get('dsf', 2)
TW, TH = J['TW'], J['TH']
if 'error' in J: print(pre, 'ERROR', J['error'])
l, t, r_, b = J['stageHover']
cx, cy, R = (l + r_) / 2, (t + b) / 2, (r_ - l) / 2
s = J.get('kit', {}).get('s', 1)
inside_tile = l >= -0.5 and t >= -0.5 and r_ <= TW + 0.5 and b <= TH + 0.5
def load(n):
    p = f'{O}/{pre}_{n}.png'
    return np.asarray(Image.open(p).convert('RGB')).astype(np.int16) if os.path.exists(p) else None
hov = load('hov')
H, W = hov.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
rr = np.hypot((xx + 0.5) / dsf - cx, (yy + 0.5) / dsf - cy)
inside = rr < R - 2
edge = (xx < 2 * dsf) | (yy < 2 * dsf) | (xx >= W - 2 * dsf) | (yy >= H - 2 * dsf)
def cmp(a, mask):
    d = np.abs(a - hov).max(axis=2)[mask]
    return 'mean %.2f p99 %d max %d n>30 %d' % (d.mean(), np.percentile(d, 99), d.max(), (d > 30).sum())
print(f"{pre}: tile {TW}x{TH} {J['mode']} layout {J['layout']} idle {J['pfxIdle']} hover-stage [{l:.1f},{t:.1f},{r_:.1f},{b:.1f}] inside tile: {inside_tile}")
if 'kit' in J: print('  kit', json.dumps(J['kit']))
for n in ['t000', 'zoff']:
    a = load(n)
    if a is not None: print(f'  {n} vs hovered photo: inside circle {cmp(a, inside)} | whole tile {cmp(a, np.ones_like(inside))}')
worst = 0
for f in sorted(glob.glob(f'{O}/{pre}_t*.png')) + [f'{O}/{pre}_tilt.png']:
    if not os.path.exists(f): continue
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.int16)
    d = np.abs(a - hov).max(axis=2)
    m = (d > 45) & (rr > R + 1)
    ov = (rr[m].max() - R) if m.any() else 0
    e = ((d > 45) & edge & (rr > R + 1)).sum()
    worst = max(worst, ov / (s * 1.05))
    n = os.path.basename(f)[len(pre) + 1:-4]
    flag = ' <-- over 8 logical px' if ov / (s * 1.05) > 8 else ''
    print(f'  {n:5s} overflow {ov:5.1f} css = {ov / (s * 1.05):5.1f} logical (n {m.sum():5d}) tile-edge px {e}{flag}')
print('  exit', json.dumps(J.get('exit')), '\n  afterOff', json.dumps(J.get('afterOff')), '\n  errs', J.get('errs'))
