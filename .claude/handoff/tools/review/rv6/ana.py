"""usage: python3 review/rv6/ana.py <prefix> <phone 0|1> <dsf>
Compares the PNGs written by check.js:
 - t000 vs hov (the <img>): exact-photo check at t = 0
 - e1_t* vs t000 (both WebGL): the exit end state must be the photo
 - again_* vs first build
 - overflow: pixels changed vs hov outside the hover circle (+8 px), and changes touching the tile edge
"""
import sys, glob, os, json
import numpy as np
from PIL import Image
pre, phone, dsf = sys.argv[1], sys.argv[2] == '1', float(sys.argv[3])
D = os.path.dirname(__file__) + '/out'
def load(n):
    p = f'{D}/{pre}_{n}.png'
    return np.asarray(Image.open(p).convert('RGB')).astype(np.int16) if os.path.exists(p) else None
hov = load('hov')
H, W = hov.shape[:2]
# avatar centre / radius (CSS px): hover = translateY(-2) scale(1.05) about the centre; on = same while hovered
if phone:
    cxc, cyc = 257 / 2, 274 - 10 - 100 - 2
else:
    cxc, cyc = 8 + 100, 8 + 100 - 2
R = 105
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot(xx / dsf - cxc, yy / dsf - cyc)
inside = r < R - 2
def diff(a, b):
    return np.abs(a - b).max(axis=2)
def stats(a, b, mask):
    d = diff(a, b)[mask]
    return dict(mean=round(float(d.mean()), 2), p99=int(np.percentile(d, 99)), max=int(d.max()), n30=int((d > 30).sum()))
out = {}
t0 = load('t000')
out['t0_vs_img'] = stats(t0, hov, inside)
for f in sorted(glob.glob(f'{D}/{pre}_e1_t*.png')):
    n = os.path.basename(f)[len(pre) + 1:-4]
    out[n + '_vs_t0'] = stats(load(n), t0, r < R + 12)
for n in ['again_t000']:
    a = load(n)
    if a is not None: out[n + '_vs_t0'] = stats(a, t0, r < R + 12)
a, b = load('again_t200'), load('t200')
if a is not None and b is not None: out['again_t200_vs_t200'] = stats(a, b, r < R + 40)
a = load('again_e1_t200')
if a is not None: out['again_e1_vs_t0'] = stats(a, t0, r < R + 12)
a, b = load('rev_t200'), load('ref_t200')
if a is not None and b is not None: out['rev_vs_ref'] = stats(a, b, r < R + 40)
a = load('off1')
if a is not None: out['off1_vs_hov'] = stats(a, hov, r < R + 12)
# overflow per on-frame
ov = {}
for f in sorted(glob.glob(f'{D}/{pre}_t*.png')) + sorted(glob.glob(f'{D}/{pre}_mid_*.png')):
    n = os.path.basename(f)[len(pre) + 1:-4]
    d = diff(load(n), hov) > 40
    outside = d & (r > R + 8)
    edge = d.copy(); m = int(2 * dsf)
    edge[m:-m, m:-m] = False
    edge &= r > R + 2
    if outside.sum() > 3 * dsf * dsf or edge.sum() > 0:
        ys, xs = np.nonzero(outside)
        ov[n] = dict(px_out=int(outside.sum()), max_r=round(float(r[outside].max()), 1) if outside.any() else None,
                     bbox=[int(xs.min() / dsf), int(ys.min() / dsf), int(xs.max() / dsf), int(ys.max() / dsf)] if outside.any() else None,
                     edge=int(edge.sum()))
out['overflow'] = ov
for k_, v_ in out.items(): print(k_, json.dumps(v_))
