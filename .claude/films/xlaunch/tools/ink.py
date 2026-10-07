#!/usr/bin/env python3
"""Ink on white paper -> a transparent overlay: art/ink/<name>.png (stamps, seal, red ballpoint, photographed on
white) -> OUT/ink_<name>.png, RGBA trimmed to the mark. Ink is subtractive: alpha comes from how far a pixel is
below the paper white (per pixel, so the paper's own shading drops out), the colour from un-mixing the white.
The gold seal is an opaque object, so it is cut by distance from white instead and keeps its own shading.
usage: OUT=cut_dir python3 tools/ink.py [names...]"""
import glob, os, sys
import cv2, numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('OUT', 'cut')
names = sys.argv[1:] or [os.path.basename(p)[:-4] for p in sorted(glob.glob(os.path.join(HERE, 'art/ink/*.png')))]
for n in names:
    im = np.array(Image.open(os.path.join(HERE, 'art/ink', n + '.png')).convert('RGB')).astype(np.float32) / 255
    paper = cv2.GaussianBlur(cv2.dilate(im, np.ones((25, 25), np.uint8)), (0, 0), 25)          # the local paper white
    paper = np.maximum(paper, 1e-3)
    rel = np.clip(im / paper, 0, 1)                                                              # 1 on bare paper
    if n.startswith('seal'):
        d = 1 - rel.min(2)
        a = np.clip((d - 0.06) / 0.12, 0, 1)
        a = cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
        rgb = im
    else:
        a = np.clip((1 - rel.min(2) - 0.05) / 0.55, 0, 1)                                        # ink density
        a = np.where(a < 0.04, 0, a)
        # colour of the ink itself: rel = 1 - a * (1 - ink)  ->  ink = 1 - (1 - rel) / a
        ink = 1 - (1 - rel) / np.maximum(a[..., None], 1e-3)
        rgb = np.clip(ink, 0, 1)
        # one ink colour per mark: the median of the dense pixels, so thin spots do not shift hue
        dense = a > 0.6
        if dense.sum() > 50: rgb = np.where(a[..., None] > 0, np.median(rgb[dense], axis=0), rgb)
    ys, xs = np.nonzero(a > 0.05); m = 12
    y0, y1, x0, x1 = max(0, ys.min() - m), ys.max() + m, max(0, xs.min() - m), xs.max() + m
    out = np.dstack([rgb, a])[y0:y1, x0:x1]
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(OUT, f'ink_{n}.png'))
    print(n, 'ink', (x1 - x0, y1 - y0), flush=True)
