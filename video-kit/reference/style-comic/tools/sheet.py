#!/usr/bin/env python3
"""Contact sheet / strip from JPEG stills written by nshoot.py (labels = frame + seconds).

    python3 sheet.py OUT.jpg DIR PREFIX --cols 4 --thumb 480 [--frames 0 24 48 ...] [--card]

--card crops every still to the centre 1.82:1 band and shrinks it to 400 px wide (project-card size test).
Functions return (value, None) on success or (None, "error") on failure.
"""
import argparse
import glob
import os
import re

from PIL import Image, ImageDraw


def load_stills(d, prefix, frames):
    """Return ([(frame, path)], None) or (None, err)."""
    paths = sorted(glob.glob(os.path.join(d, f"{prefix}_*.jpg")))
    out = []
    for p in paths:
        m = re.search(r"_(\d+)\.jpg$", p)
        if not m:
            continue
        f = int(m.group(1))
        if frames and f not in frames:
            continue
        out.append((f, p))
    if not out:
        return None, f"no stills {prefix}_*.jpg in {d}"
    return out, None


def card_crop(im):
    w, h = im.size
    ch = round(w / 1.82)
    y0 = (h - ch) // 2
    im = im.crop((0, y0, w, y0 + ch))
    return im.resize((400, round(400 / 1.82)), Image.LANCZOS)


def build(out, items, cols, thumb, card, fps=24):
    """Write the sheet. Returns (path, None) or (None, err)."""
    ims = []
    for f, p in items:
        im = Image.open(p).convert("RGB")
        im = card_crop(im) if card else im.resize((thumb, round(thumb * im.height / im.width)), Image.LANCZOS)
        ims.append((f, im))
    tw, th = ims[0][1].size
    rows = (len(ims) + cols - 1) // cols
    pad = 6
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + pad) + pad), (24, 22, 30))
    dr = ImageDraw.Draw(sheet)
    for k, (f, im) in enumerate(ims):
        x, y = pad + (k % cols) * (tw + pad), pad + (k // cols) * (th + pad)
        sheet.paste(im, (x, y))
        lab = f"f{f} {f / fps:.2f}s"
        dr.rectangle([x, y, x + 8 + 7 * len(lab), y + 16], fill=(0, 0, 0))
        dr.text((x + 4, y + 2), lab, fill=(255, 255, 255))
    sheet.save(out, quality=88)
    return out, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("dir")
    ap.add_argument("prefix")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--thumb", type=int, default=480)
    ap.add_argument("--frames", type=int, nargs="*")
    ap.add_argument("--card", action="store_true")
    a = ap.parse_args()
    items, err = load_stills(a.dir, a.prefix, set(a.frames or []))
    if err:
        raise SystemExit(err)
    path, err = build(a.out, items, a.cols, a.thumb, a.card)
    if err:
        raise SystemExit(err)
    print("sheet ->", path, len(items), "frames")


if __name__ == "__main__":
    main()
