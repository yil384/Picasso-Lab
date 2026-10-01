"""overflow / tile-edge for fx4_states frames (tile without a border). usage: st_ana.py <prefix> <phone 0|1>"""
import sys, glob, os
import numpy as np
from PIL import Image
pre, phone = sys.argv[1], sys.argv[2] == '1'
TW, TH = (257, 274) if phone else (266, 284); dsf = 2
D = min(200, TW - 16, TH - 16); s = D / 200; R = D / 2 * 1.05
cx, cy = (TW / 2, TH - 10 - D / 2 - 2) if phone else (8 + D / 2, 8 + D / 2 - 2)
hov = np.asarray(Image.open(f'fx4_out/{pre}_hov.png').convert('RGB')).astype(int)
H, W = hov.shape[:2]; yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot((xx + .5) / dsf - cx, (yy + .5) / dsf - cy)
edge = (xx < 2 * dsf) | (yy < 2 * dsf) | (xx >= W - 2 * dsf) | (yy >= H - 2 * dsf)
worst = 0
for f in sorted(glob.glob(f'fx4_out/{pre}_t*.png'), key=lambda f: int(f.split('_t')[-1].split('_')[0])):
    a = np.asarray(Image.open(f).convert('RGB')).astype(int); d = np.abs(a - hov).max(axis=2)
    m = (d > 45) & (r > R + 1); ov = (r - R)[m].max() / (s * 1.05) if m.any() else 0
    e = ((d > 45) & edge & (r > R + 1)).sum(); worst = max(worst, ov)
    print(f'  {os.path.basename(f)[len(pre)+1:-4]:12s} overflow {ov:4.1f} logical  tile-edge {e}')
print('worst', round(worst, 1))
