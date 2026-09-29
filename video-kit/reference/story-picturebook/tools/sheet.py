#!/usr/bin/env python3
"""Tile JPEG stills into a labelled contact sheet: sheet.py OUT.jpg COLS img1 img2 ..."""
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
W, H = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, H * rows), (30, 30, 30))
d = ImageDraw.Draw(sheet)
for k, (im, f) in enumerate(zip(ims, files)):
    x, y = (k % cols) * W, (k // cols) * H
    sheet.paste(im, (x, y))
    lab = f.split('/')[-1].rsplit('.', 1)[0]
    d.rectangle([x, y, x + 8 * len(lab) + 8, y + 16], fill=(20, 20, 20))
    d.text((x + 4, y + 2), lab, fill=(255, 255, 255))
sheet.save(out, quality=88)
print('sheet', out, sheet.size)
