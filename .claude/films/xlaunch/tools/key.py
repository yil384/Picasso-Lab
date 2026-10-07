#!/usr/bin/env python3
"""Green-screen key for the pose sprites: art/<name>.png (flat #00FF00) -> cut/<name>.png (RGBA, despilled,
trimmed to the figure + a margin). usage: python3 tools/key.py [names...]"""
import os, sys, glob
import numpy as np, cv2
from PIL import Image
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.environ.get('SRC', 'art'), os.environ.get('OUT', 'cut')
os.makedirs(os.path.join(HERE, OUT), exist_ok=True)
names = sys.argv[1:] or [os.path.basename(p)[:-4] for p in sorted(glob.glob(os.path.join(HERE, SRC, '*.png'))) if not os.path.basename(p).startswith(('y_ref', 'bg_'))]
for n in names:
    im = np.array(Image.open(os.path.join(HERE, SRC, n + '.png')).convert('RGB')).astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    gd = g - np.maximum(r, b)                          # green dominance
    a = 1 - np.clip((gd - 0.12) / 0.38, 0, 1)          # 0 on the screen, 1 on the figure, soft in between
    # keep only the regions connected to real figure pixels (kills stray specks)
    solid = (a > 0.5).astype(np.uint8)
    nl, lab, st, _ = cv2.connectedComponentsWithStats(solid, 8)
    keep = np.zeros(nl, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] > 400
    a = a * cv2.dilate(keep[lab].astype(np.uint8), np.ones((5, 5), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 0.6)
    # despill: clamp green to the max of red and blue where the screen bled in
    g2 = np.minimum(g, np.maximum(r, b) + 0.04)
    out = np.dstack([r, np.where(a < 0.999, g2, g), b, a])
    ys, xs = np.nonzero(a > 0.02); m = 16
    y0, y1, x0, x1 = max(0, ys.min() - m), min(a.shape[0], ys.max() + m), max(0, xs.min() - m), min(a.shape[1], xs.max() + m)
    Image.fromarray((out[y0:y1, x0:x1] * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(HERE, OUT, n + '.png'))
    print(n, 'bbox', (x0, y0, x1, y1))
