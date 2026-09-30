import sys, glob
from PIL import Image
import numpy as np
pre = sys.argv[1]; dsf = float(sys.argv[2]); cx, cy, R = map(float, sys.argv[3:6])
ref = np.asarray(Image.open(f'shots/{pre}_hov.jpg').convert('RGB')).astype(int)
H, W = ref.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot((xx + 0.5) / dsf - cx, (yy + 0.5) / dsf - cy)
for f in sorted(glob.glob(f'shots/{pre}_t*.jpg')) + sorted(glob.glob(f'shots/{pre}_x*.jpg')):
    a = np.asarray(Image.open(f).convert('RGB')).astype(int)
    d = np.abs(a - ref).max(axis=2)
    m = (d > 45) & (r > R + 1)
    if m.any():
        i = np.argmax(np.where(m, r, 0)); y, x = divmod(i, W)
        print(f.split('/')[-1], 'max overflow %.1f px at css (%.0f,%.0f)' % (r[y, x] - R, x / dsf, y / dsf), 'n', m.sum())
    else:
        print(f.split('/')[-1], 'none')
