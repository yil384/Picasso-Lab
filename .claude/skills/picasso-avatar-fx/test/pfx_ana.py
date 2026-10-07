"""usage: python3 pfx_ana.py <prefix> <TW> <TH> <phone 0|1> <dsf> [shots dir]
Frames from pfx_test.js (<shots dir>/<prefix>_*.jpg, tile iframe with a 1 px border).
 - t000 / x100 / zoff vs hov inside the photo circle (t = 0 = photo, e = 1 = photo, off = photo)
 - overflow: pixels changed vs hov outside the hovered circle, in CSS px and logical px
 - edge: changed pixels touching the tile's edge (something cut off by the tile)"""
import sys, glob, os
import numpy as np
from PIL import Image
pre, TW, TH, phone, dsf = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4] == '1', float(sys.argv[5])
SH = sys.argv[6] if len(sys.argv) > 6 else 'shots'
D = min(200, TW - 16, TH - 16)
s = D / 200
R = D / 2 * 1.05                       # hover: scale(1.05) about the centre, translateY(-2)
if phone:
    cx, cy = 1 + TW / 2, 1 + TH - 10 - D / 2 - 2
else:
    cx, cy = 1 + 8 + D / 2, 1 + 8 + D / 2 - 2
def load(n):
    p = f'{SH}/{pre}_{n}.jpg'
    return np.asarray(Image.open(p).convert('RGB')).astype(np.int16) if os.path.exists(p) else None
hov = load('hov')
H, W = hov.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot((xx + 0.5) / dsf - cx, (yy + 0.5) / dsf - cy)
inside = r < R - 2
edge = (xx < 2 * dsf) | (yy < 2 * dsf) | (xx >= W - 2 * dsf) | (yy >= H - 2 * dsf)
def cmp(a, mask):
    d = np.abs(a - hov).max(axis=2)[mask]
    return 'mean %.2f p99 %d max %d n>30 %d' % (d.mean(), np.percentile(d, 99), d.max(), (d > 30).sum())
print(f'{pre}: tile {TW:.0f}x{TH:.0f} D {D:.0f} s {s:.3f} dsf {dsf:g}')
for n in ['t000', 'x100', 'zoff']:
    a = load(n)
    if a is not None: print(f'  {n} vs photo: {cmp(a, inside)}  | whole tile: {cmp(a, np.ones_like(inside))}')
worst = (0, '')
for f in sorted(glob.glob(f'{SH}/{pre}_t*.jpg')) + sorted(glob.glob(f'{SH}/{pre}_x*.jpg')) + [f'{SH}/{pre}_tilt.jpg']:
    if not os.path.exists(f): continue
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.int16)
    d = np.abs(a - hov).max(axis=2)
    m = (d > 45) & (r > R + 1)
    n = os.path.basename(f)[len(pre) + 1:-4]
    ov = 0
    if m.any():
        i = np.argmax(np.where(m, r, 0)); y, x = divmod(i, W); ov = r[y, x] - R
    e = (d > 45) & edge & (r > R + 1)
    if ov > worst[0]: worst = (ov, n)
    flag = ' <-- over 8 logical px' if ov / (s * 1.05) > 8 else ''
    print(f'  {n:6s} overflow {ov:5.1f} css px = {ov / (s * 1.05):5.1f} logical  (n {m.sum():5d})  tile-edge px {e.sum()}{flag}')
