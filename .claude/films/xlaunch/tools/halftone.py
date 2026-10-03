#!/usr/bin/env python3
"""Press photos for the opening's newspaper clippings: a real photo (CC BY / public domain, credited on the clipping)
-> a newsprint halftone, ink only (RGBA: ink colour, alpha = dot coverage), screened at 45 degrees like a paper's
black plate. The clipping canvas (props.js pressClip) prints it onto the newsprint stock.
usage: python3 tools/halftone.py SRC.jpg OUT.png --crop x0 y0 x1 y1 (0..1) --width 900 --pitch 7"""
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--crop', type=float, nargs=4, default=[0, 0, 1, 1])
ap.add_argument('--width', type=int, default=900)
ap.add_argument('--pitch', type=float, default=7.0)      # screen ruling in output pixels
ap.add_argument('--gamma', type=float, default=0.8)      # < 1 lifts the mid-tones (newsprint dot gain darkens them)
ap.add_argument('--angle', type=float, default=45)
a = ap.parse_args()

im = Image.open(a.src).convert('L')
W, H = im.size
x0, y0, x1, y1 = a.crop
im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
h = round(a.width * im.height / im.width)
im = im.resize((a.width, h), Image.LANCZOS)
im = ImageOps.autocontrast(im, cutoff=1)
im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=2))
L = (np.asarray(im).astype(np.float32) / 255) ** a.gamma

# dots on a rotated grid, drawn at 4x and scaled down for clean edges
S = 4
cov = Image.new('L', (a.width * S, h * S), 0)
d = ImageDraw.Draw(cov)
th = np.deg2rad(a.angle); c, s = np.cos(th), np.sin(th)
p = a.pitch
R = int(np.hypot(a.width, h) / p) + 2
cx, cy = a.width / 2, h / 2
for i in range(-R, R + 1):
    for j in range(-R, R + 1):
        u, v = i * p, j * p
        x, y = cx + u * c - v * s, cy + u * s + v * c
        if not (-p < x < a.width + p and -p < y < h + p):
            continue
        xi, yi = min(a.width - 1, max(0, int(x))), min(h - 1, max(0, int(y)))
        dark = 1 - L[yi, xi]
        if dark < 0.04:
            continue
        r = p * 0.5 * np.sqrt(dark) * 1.12                   # touching dots in the deep shadows
        d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=255)
cov = cov.resize((a.width, h), Image.LANCZOS)
# a soft edge: the photo's frame is a hairline rule, the screen fades a touch at the border like a worn plate
out = np.zeros((h, a.width, 4), np.uint8)
out[..., 0], out[..., 1], out[..., 2] = 26, 22, 19
out[..., 3] = np.asarray(cov)
Image.fromarray(out, 'RGBA').save(a.out)
print(a.out, (a.width, h))
