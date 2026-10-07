#!/usr/bin/env python3
"""Relief maps for the painted characters: cut/<name>.png -> cut/<name>_d.png, an 8-bit near-is-white depth map
(Depth Anything V2 small, ONNX on the CPU, ~1 s per image) that sprite.js uses to push the billboard into a
relief, so the figure has volume when the camera moves and casts a rounded shadow. The background is filled with
the nearest figure depth (no cliffs at the silhouette, so nothing stretches) and the map is smoothed a little.
The model (~100 MB) is fetched once into ~/.cache/picasso/.
usage: OUT=cut_dir python3 tools/depth.py [names...]   (default: every png in OUT without _d)"""
import glob, os, sys, urllib.request
import cv2, numpy as np, onnxruntime as ort
from PIL import Image

OUT = os.environ.get('OUT', 'cut')
MODEL = os.path.expanduser('~/.cache/picasso/depth-anything-v2-small.onnx')
URL = 'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx'
if not os.path.exists(MODEL):
    os.makedirs(os.path.dirname(MODEL), exist_ok=True); urllib.request.urlretrieve(URL, MODEL)
sess = ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
NAME = sess.get_inputs()[0].name

names = sys.argv[1:] or [os.path.basename(p)[:-4] for p in sorted(glob.glob(os.path.join(OUT, '*.png'))) if not p.endswith('_d.png')]
for n in names:
    im = Image.open(os.path.join(OUT, n + '.png')).convert('RGBA')
    a = np.array(im)[..., 3].astype(np.float32) / 255
    rgb = np.array(im.convert('RGB')).astype(np.float32) / 255
    rgb = rgb * a[..., None] + 0.5 * (1 - a[..., None])              # on mid grey: the background reads flat
    H, W = a.shape; s = 518 / max(H, W)
    h, w = max(14, int(round(H * s / 14)) * 14), max(14, int(round(W * s / 14)) * 14)
    x = np.array(Image.fromarray((rgb * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)).astype(np.float32) / 255
    x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
    d = sess.run(None, {NAME: x})[0][0]
    d = cv2.resize(d, (W, H), interpolation=cv2.INTER_CUBIC)
    fg = a > 0.5
    lo, hi = np.percentile(d[fg], 1), np.percentile(d[fg], 99.5)
    d = np.clip((d - lo) / max(1e-6, hi - lo), 0, 1)
    # fill the background with the nearest figure depth (each pixel takes the label of its nearest figure pixel),
    # then soften
    _, lab = cv2.distanceTransformWithLabels((~fg).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    flat = lab.ravel(); idx = np.zeros(flat.max() + 1, np.int64)
    idx[flat[fg.ravel()]] = np.nonzero(fg.ravel())[0]
    d = d.ravel()[idx[flat]].reshape(H, W)
    d = cv2.GaussianBlur(d, (0, 0), max(1.0, 0.004 * H))
    Image.fromarray((d * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, n + '_d.png'))
    print(n, 'depth', (W, H), flush=True)
