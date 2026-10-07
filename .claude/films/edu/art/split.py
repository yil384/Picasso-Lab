#!/usr/bin/env python3
"""Split a keyed sheet of several figures (cut/<name>.png) into one sprite per figure, left to right:
cut/<name>_1.png, _2.png ... usage: python3 art/split.py felt_ant_crowd"""
import os, sys
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def split(name, margin=12, min_area=4000):
    path = os.path.join(HERE, 'cut', name + '.png')
    if not os.path.exists(path):
        return None, 'missing ' + path
    im = np.array(Image.open(path))
    solid = (im[..., 3] > 30).astype(np.uint8)
    # join the pieces of one figure (a card above the head, thin legs) before labelling: close vertically
    joined = cv2.morphologyEx(solid, cv2.MORPH_CLOSE, np.ones((61, 9), np.uint8))
    nl, lab, st, _ = cv2.connectedComponentsWithStats(joined, 8)
    boxes = sorted([st[i] for i in range(1, nl) if st[i, cv2.CC_STAT_AREA] > min_area], key=lambda s: s[0])
    out = []
    for k, (x, y, w, h, _) in enumerate(boxes, 1):
        x0, y0 = max(0, x - margin), max(0, y - margin)
        x1, y1 = min(im.shape[1], x + w + margin), min(im.shape[0], y + h + margin)
        dst = os.path.join(HERE, 'cut', '%s_%d.png' % (name, k))
        Image.fromarray(im[y0:y1, x0:x1]).save(dst)
        out.append((dst, (x0, y0, x1, y1)))
    return out, None


if __name__ == '__main__':
    for n in sys.argv[1:]:
        res, err = split(n)
        print(n, err or [r[1] for r in res])
