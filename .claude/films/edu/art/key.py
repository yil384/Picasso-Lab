#!/usr/bin/env python3
"""Green-screen key for the explainer art: src/<name>.png (flat #00FF00) -> cut/<name>.png (RGBA, despilled, trimmed
to the figure + a margin). Same method as xlaunch/tools/key.py. usage: python3 art/key.py [names...]"""
import os, sys, glob
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def key(name, src='src', out='cut', margin=16, spill=0.0):
    path = os.path.join(HERE, src, name + '.png')
    if not os.path.exists(path):
        return None, 'missing ' + path
    src_im = Image.open(path)
    if src_im.mode == 'RGBA' and np.array(src_im)[..., 3].min() < 250:
        # the image tool sometimes returns a real cutout (alpha) instead of a green screen: keep its alpha as is
        rgba = np.array(src_im).astype(np.float32) / 255
        return _save(name, rgba, rgba[..., 3], out, margin)
    im = np.array(src_im.convert('RGB')).astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    gd = g - np.maximum(r, b)                          # green dominance
    a = 1 - np.clip((gd - 0.12) / 0.38, 0, 1)          # 0 on the screen, 1 on the figure, soft in between
    # keep only the regions connected to real figure pixels (kills stray specks)
    solid = (a > 0.5).astype(np.uint8)
    nl, lab, st, _ = cv2.connectedComponentsWithStats(solid, 8)
    keep = np.zeros(nl, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] > 400
    a = a * cv2.dilate(keep[lab].astype(np.uint8), np.ones((5, 5), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 0.6)
    # edge matte: in a band around the figure the pixel is a*F + (1-a)*green, and a red beret mixed with green fools
    # the green-dominance alpha (it reads as opaque olive). F is taken from the figure's interior (colours pushed
    # outward by normalised blur), and a is solved by projecting the pixel onto the line green -> F.
    G = np.array([0, 1, 0], np.float32)
    inner = cv2.erode((a > 0.98).astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2).astype(np.float32)
    wsum = cv2.GaussianBlur(inner, (0, 0), 4)[..., None]
    Fx = np.dstack([cv2.GaussianBlur(im[..., c] * inner, (0, 0), 4) for c in range(3)]) / np.maximum(wsum, 1e-4)
    Fx = np.where(wsum > 1e-3, Fx, im)
    band = (a > 0.01) & (inner < 0.5)
    d = Fx - G
    a1 = np.clip(((im - G) * d).sum(-1) / np.maximum((d * d).sum(-1), 1e-3), 0, 1)
    a = np.where(band, np.minimum(a, a1), a)
    F = np.where(band[..., None], Fx, im)
    r, g, b = F[..., 0], F[..., 1], F[..., 2]
    g2 = np.minimum(g, np.maximum(r, b) + spill)       # despill what is left (our art has no green in it)
    rgba = np.dstack([r, g2, b, a])
    return _save(name, rgba, a, out, margin)


def _save(name, rgba, a, out, margin):
    ys, xs = np.nonzero(a > 0.02)
    if not len(ys):
        return None, 'nothing left after keying ' + name
    y0, y1 = max(0, ys.min() - margin), min(a.shape[0], ys.max() + margin)
    x0, x1 = max(0, xs.min() - margin), min(a.shape[1], xs.max() + margin)
    os.makedirs(os.path.join(HERE, out), exist_ok=True)
    dst = os.path.join(HERE, out, name + '.png')
    Image.fromarray((rgba[y0:y1, x0:x1] * 255 + 0.5).astype(np.uint8), 'RGBA').save(dst)
    return (dst, (x0, y0, x1, y1)), None


if __name__ == '__main__':
    names = sys.argv[1:] or [os.path.basename(p)[:-4] for p in sorted(glob.glob(os.path.join(HERE, 'src', '*.png')))]
    for n in names:
        res, err = key(n)
        print(n, err or 'bbox %s' % (res[1],))
