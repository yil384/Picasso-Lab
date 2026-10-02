#!/usr/bin/env python3
"""Make the far snow peak for people/fx/parikshit.js.

    people/static/fx/parikshit-peak.webp   Ama Dablam, sky keyed out, scaled and hazed for the V between
                                           the near ridges of Parikshit's photo (RGBA, 2 px per photo px)

Source: Wikimedia Commons, File:Ama_Dablam.jpg, photo by Lerian, released into the public domain.

    pip install opencv-python-headless pillow
    python3 people/fx/tools/parikshit_peak.py [path/to/Ama_Dablam.jpg]

Without a path it downloads the 1920 px rendition. The sky is keyed with a flood fill from the top
edge on a bilateral-smoothed copy (the sky is a smooth gradient; the skyline is a step), then the crop
is placed so the summit (source px SUM_S) lands on photo px SUM_P at S photo px per source px, and
hazed toward the valley haze of the photo. The scene's PB box must match the printed box.
"""
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'people', 'static', 'fx', 'parikshit-peak.webp')
URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/Ama_Dablam.jpg?width=1600'
SUM_S, SUM_P, S = (1000, 140), (316, 20), 0.33          # summit in source px (1920 wide) -> photo px; scale
CROP = (740, 110, 1360, 460)                           # source px: only what can ever show in the V
HAZE = np.array([118, 182, 208]) / 255                 # the photo's valley haze round the V


def load(path):
    if not path:
        path = os.path.join(os.path.dirname(__file__), '.ama_dablam.jpg')
        if not os.path.exists(path):
            req = urllib.request.Request(URL, headers={'User-Agent': 'PicassoLabSite/1.0 (https://github.com/yil384/Picasso-Lab)'})
            with urllib.request.urlopen(req) as r, open(path, 'wb') as f:
                f.write(r.read())
    im = Image.open(path).convert('RGB')
    if im.width != 1920:
        im = im.resize((1920, round(im.height * 1920 / im.width)), Image.LANCZOS)
    return np.asarray(im)


def key_sky(im):
    H, W = im.shape[:2]
    sm = cv2.GaussianBlur(cv2.bilateralFilter(im, 9, 30, 9), (0, 0), 1.2)
    mask = np.zeros((H + 2, W + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    for x in range(5, W, 40):
        cv2.floodFill(sm.copy(), mask, (x, 3), 0, (2.6,) * 3, (2.6,) * 3, flags)
    sky = cv2.morphologyEx((mask[1:-1, 1:-1] > 0).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)) > 0
    n, lab, st, _ = cv2.connectedComponentsWithStats((~sky).astype(np.uint8))
    keep = np.zeros((H, W), bool)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 5000:
            keep |= lab == i
    return cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 1.1)


def main():
    im = load(sys.argv[1] if len(sys.argv) > 1 else None)
    a = key_sky(im)
    src = np.dstack([im.astype(np.float32) / 255, a])
    x0, y0, x1, y1 = CROP
    w, h = round((x1 - x0) * 2 * S), round((y1 - y0) * 2 * S)
    c = cv2.resize(src[y0:y1, x0:x1], (w, h), interpolation=cv2.INTER_AREA)
    rgb, al = c[..., :3], c[..., 3]
    lum = rgb.mean(2, keepdims=True)
    rgb = rgb * 0.82 + HAZE * 0.18                     # far away: into the haze, a little flatter and softer
    rgb = lum + (rgb - lum) * 0.9
    rgb = cv2.GaussianBlur(rgb, (0, 0), 0.55)
    al = cv2.GaussianBlur(al, (0, 0), 0.6)
    out = np.dstack([np.clip(rgb, 0, 1), np.clip(al, 0, 1)])
    Image.fromarray((out * 255).round().astype(np.uint8)).save(OUT, quality=86, method=6)
    box = [SUM_P[0] + (x0 - SUM_S[0]) * S, SUM_P[1] + (y0 - SUM_S[1]) * S, SUM_P[0] + (x1 - SUM_S[0]) * S, SUM_P[1] + (y1 - SUM_S[1]) * S]
    print(OUT, (w, h), 'PB =', [round(v, 1) for v in box])


if __name__ == '__main__':
    main()
