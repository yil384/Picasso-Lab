"""Fit each icon of an n x n green-screen sheet inside its own cell before key.mjs splits the sheet: an icon that
reaches over its cell's edge (a torch's flame into the cell above) is moved, unchanged, just far enough to sit inside
its cell with a margin. The original is kept as art/orig/<sheet>.png.
usage: python fit-cells.py art/items3.png [n=3]"""
import os
import sys
import numpy as np
import cv2

MARGIN = 10

def fit(path, n=3):
    im = cv2.imread(path, cv2.IMREAD_COLOR)
    if im is None:
        return None, f'cannot read {path}'
    b, g, r = [im[..., i].astype(int) for i in range(3)]
    fg = ((g - np.maximum(r, b)) <= 60).astype(np.uint8)
    fg = cv2.dilate(fg, np.ones((7, 7), np.uint8))
    k, lab, st, cen = cv2.connectedComponentsWithStats(fg, 8)
    h, w = fg.shape
    cw, ch = w / n, h / n
    groups = {}
    for i in range(1, k):
        if st[i, cv2.CC_STAT_AREA] < 20:
            continue
        cx = min(n - 1, int(cen[i][0] // cw))
        cy = min(n - 1, int(cen[i][1] // ch))
        groups.setdefault((cx, cy), []).append(i)
    out = np.zeros_like(im)
    out[:] = (0, 255, 0)
    moved = []
    for (cx, cy), ids in groups.items():
        m = np.isin(lab, ids)
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        lx0, lx1 = int(cx * cw) + MARGIN, int((cx + 1) * cw) - 1 - MARGIN
        ly0, ly1 = int(cy * ch) + MARGIN, int((cy + 1) * ch) - 1 - MARGIN
        dx = (lx0 - x0) if x0 < lx0 else (lx1 - x1) if x1 > lx1 else 0
        dy = (ly0 - y0) if y0 < ly0 else (ly1 - y1) if y1 > ly1 else 0
        if (x1 - x0) > (lx1 - lx0) or (y1 - y0) > (ly1 - ly0):
            return None, f'cell {cy * n + cx}: the icon is larger than its cell'
        out[ys + dy, xs + dx] = im[ys, xs]
        if dx or dy:
            moved.append(f'cell {cy * n + cx} moved by {dx},{dy}')
    if not moved:
        return 'every icon already inside its cell', None
    od = os.path.join(os.path.dirname(path), 'orig')
    os.makedirs(od, exist_ok=True)
    cv2.imwrite(os.path.join(od, os.path.basename(path)), im)
    cv2.imwrite(path, out)
    return '; '.join(moved), None

if __name__ == '__main__':
    res, err = fit(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 3)
    print(err or res)
    sys.exit(1 if err else 0)
