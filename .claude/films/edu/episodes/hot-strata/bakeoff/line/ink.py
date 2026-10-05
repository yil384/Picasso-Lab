#!/usr/bin/env python3
"""Line look: a black-ink drawing on white (art/src/<name>.png) -> one packed sprite art/cut/<name>.png for film.js.

  R = ink coverage (the line, anti-aliased)
  G = paper fill (the silhouette: everything the outline encloses), so a figure hides what is behind it
  B = pen time 0..255: when the pen reaches this pixel. Each connected stroke grows from its first point along the
      line itself (geodesic distance inside the ink), strokes start one after another in sweep order, so a reveal
      threshold on B looks like the drawing being drawn, not wiped.
  A = 255 (kept opaque so the browser does not premultiply the data channels)

usage: python3 ink.py name[:sweep[:fill]] ...     sweep = y (top first, default) | x (left first) | c (centre out)
                                                  fill = 1 (default) | 0 (backdrops)
"""
import os, sys
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from skimage.graph import MCP_Geometric

ART = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'art'))


def pack(name, sweep='y', fill=True, spread=.55, margin=10):
    """Write art/cut/<name>.png. Returns ((w, h), None) or (None, 'error')."""
    p = os.path.join(ART, 'src', name + '.png')
    if not os.path.exists(p):
        return None, 'missing ' + p
    a = np.array(Image.open(p).convert('RGBA')).astype(np.float32) / 255
    rgb = a[..., :3] * a[..., 3:] + (1 - a[..., 3:])
    L = rgb @ np.array([.2126, .7152, .0722], np.float32)
    bg = float(np.median(np.concatenate([L[0], L[-1], L[:, 0], L[:, -1]])))
    ink = np.clip((bg - .06 - L) / .55, 0, 1)
    core = (ink > .4).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(core, 8)
    small = st[:, cv2.CC_STAT_AREA] < 10
    small[0] = False
    ink[small[lab]] = 0
    core[small[lab]] = 0
    if not core.any():
        return None, 'no ink in ' + name
    H, W = core.shape
    # paper fill: what the (gap-closed) outline encloses
    if fill:
        closed = cv2.morphologyEx(core, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        pad = np.pad(1 - closed, 1, constant_values=1).astype(np.uint8)
        mask = np.zeros((H + 4, W + 4), np.uint8)
        cv2.floodFill(pad, mask, (0, 0), 2)
        outside = (pad[1:-1, 1:-1] == 2)
        fil = cv2.GaussianBlur((~outside).astype(np.float32), (0, 0), .8)
    else:
        fil = np.zeros_like(ink)
    # pen time: geodesic distance inside each stroke from its first point, strokes staggered in sweep order
    n, lab = cv2.connectedComponents(core, connectivity=8)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if sweep == 'x':
        sw = xx / W + .15 * yy / H
    elif sweep == 'c':
        sw = np.hypot(xx - W / 2, yy - H / 2) / np.hypot(W / 2, H / 2)
    else:
        sw = yy / H + .15 * xx / W
    idx = np.arange(1, n)
    seeds = ndimage.minimum_position(sw, lab, idx)
    cost = np.where(core > 0, 1.0, -1.0)          # negative = impassable
    dist, _ = MCP_Geometric(cost, fully_connected=True).find_costs(seeds)
    dist = np.where(core > 0, dist, 0)
    dmax = np.ones(n, np.float32)
    dmax[1:] = np.maximum(ndimage.maximum(dist, lab, idx), 1)
    size = np.zeros(n, np.float32)
    size[1:] = ndimage.sum(np.ones_like(dist), lab, idx)
    s0 = np.zeros(n, np.float32)
    s0[1:] = [sw[s] for s in seeds]
    lo, hi = float(sw.min()), float(sw.max())
    start = spread * (s0 - lo) / max(hi - lo, 1e-6)
    dur = (1 - spread) * np.clip(.35 + .65 * np.sqrt(size / size.max()), 0, 1)
    tcore = start[lab] + dur[lab] * dist / dmax[lab]
    tcore = np.where(core > 0, tcore, 0)
    tcore /= max(tcore.max(), 1e-6)
    # every other pixel (soft line edge, paper fill) takes the time of the nearest line pixel
    _, lbl = cv2.distanceTransformWithLabels((1 - core).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    lut = np.zeros(lbl.max() + 1, np.float32)
    lut[lbl[core > 0]] = tcore[core > 0]
    T = lut[lbl]
    # trim
    m = (ink > .02) | (fil > .02)
    ys, xs = np.nonzero(m)
    y0, y1 = max(0, ys.min() - margin), min(H, ys.max() + margin)
    x0, x1 = max(0, xs.min() - margin), min(W, xs.max() + margin)
    out = np.dstack([ink, fil, T, np.ones_like(ink)])[y0:y1, x0:x1]
    os.makedirs(os.path.join(ART, 'cut'), exist_ok=True)
    Image.fromarray((out * 255 + .5).astype(np.uint8), 'RGBA').save(os.path.join(ART, 'cut', name + '.png'))
    return (x1 - x0, y1 - y0), None


if __name__ == '__main__':
    for arg in sys.argv[1:]:
        parts = arg.split(':')
        res, err = pack(parts[0], parts[1] if len(parts) > 1 else 'y', (parts[2] != '0') if len(parts) > 2 else True)
        print(parts[0], err or res)
