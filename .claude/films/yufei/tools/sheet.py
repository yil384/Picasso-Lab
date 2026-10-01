#!/usr/bin/env python3
"""Contact sheet from JPEG stills (f_XXXX.jpg) with frame labels:  sheet.py OUT.jpg DIR [--cols 8 --thumb 240 --circle]"""
import argparse, glob, os, re
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument("out"); ap.add_argument("dir"); ap.add_argument("--cols", type=int, default=8)
ap.add_argument("--thumb", type=int, default=240); ap.add_argument("--circle", action="store_true"); ap.add_argument("--prefix", default="f")
a = ap.parse_args()
items = sorted((int(re.search(r"_(\d+)\.jpg$", p).group(1)), p) for p in glob.glob(os.path.join(a.dir, f"{a.prefix}_*.jpg")))
t = a.thumb; pad = 6; rows = (len(items) + a.cols - 1) // a.cols
sh = Image.new("RGB", (a.cols * (t + pad) + pad, rows * (t + pad) + pad), (24, 22, 30)); dr = ImageDraw.Draw(sh)
mask = Image.new("L", (t, t), 0); ImageDraw.Draw(mask).ellipse([0, 0, t - 1, t - 1], fill=255)
for k, (f, p) in enumerate(items):
    im = Image.open(p).convert("RGB").resize((t, t), Image.LANCZOS)
    x, y = pad + (k % a.cols) * (t + pad), pad + (k // a.cols) * (t + pad)
    if a.circle: sh.paste((40, 38, 48), (x, y, x + t, y + t)); sh.paste(im, (x, y), mask)
    else: sh.paste(im, (x, y))
    lab = f"f{f}"; dr.rectangle([x, y, x + 8 + 7 * len(lab), y + 14], fill=(0, 0, 0)); dr.text((x + 4, y + 1), lab, fill=(255, 255, 255))
sh.save(a.out, quality=88); print("sheet ->", a.out, len(items))
