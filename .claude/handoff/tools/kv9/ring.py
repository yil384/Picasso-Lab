"""count focus-ring pixels (#00629b) in a band around the photo circle.
usage: python3 kv9/ring.py <png> <cx css> <cy css> <radius css> [dsf]"""
import sys
import numpy as np
from PIL import Image
p, cx, cy, R = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
dsf = float(sys.argv[5]) if len(sys.argv) > 5 else 2
a = np.asarray(Image.open(p).convert('RGB')).astype(int)
H, W = a.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
r = np.hypot((xx + 0.5) / dsf - cx, (yy + 0.5) / dsf - cy)
band = np.abs(r - R) < 4
blue = (np.abs(a[..., 0] - 0) < 40) & (np.abs(a[..., 1] - 98) < 40) & (np.abs(a[..., 2] - 155) < 40)
n = (band & blue).sum()
# angular coverage: fraction of 5-degree sectors that contain ring pixels
ang = np.degrees(np.arctan2((yy + 0.5) / dsf - cy, (xx + 0.5) / dsf - cx)) % 360
sec = set((ang[band & blue] // 5).astype(int).tolist())
print('%s: ring px %d of band %d, sectors %d/72' % (p.split('/')[-1], n, band.sum(), len(sec)))
