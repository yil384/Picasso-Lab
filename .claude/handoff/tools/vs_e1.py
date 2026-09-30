"""usage: python3 vs_e1.py <prefix> <TW> <TH> <phone 0|1> <dsf>
x100 (WebGL at e = 1) vs t000 (WebGL at t = 0), both inside the hovered circle + 12 px: the exit must end on
exactly the frame the effect started from."""
import sys, os
import numpy as np
from PIL import Image
pre, TW, TH, phone, dsf = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4] == '1', float(sys.argv[5])
D = min(200, TW - 16, TH - 16)
R = D / 2 * 1.05
if phone:
    cx, cy = 1 + TW / 2, 1 + TH - 10 - D / 2 - 2
else:
    cx, cy = 1 + 8 + D / 2, 1 + 8 + D / 2 - 2
def load(n):
    p = f'shots/{pre}_{n}.jpg'
    return np.asarray(Image.open(p).convert('RGB')).astype(np.int16) if os.path.exists(p) else None
a, b = load('x100'), load('t000')
if a is None or b is None:
    print('  e1 vs t0: missing frames'); sys.exit()
H, W = a.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot((xx + 0.5) / dsf - cx, (yy + 0.5) / dsf - cy)
d = np.abs(a - b).max(axis=2)[r < R + 12]
print('  e1 vs t0 (both GL): mean %.2f p99 %d max %d n>30 %d' % (d.mean(), np.percentile(d, 99), d.max(), (d > 30).sum()))
