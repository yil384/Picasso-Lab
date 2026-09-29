#!/usr/bin/env python3
"""Contact sheets and card-size tests from JPEG stills written by pipeline/tools/nshoot.py (PREFIX_0123.jpg).

    python3 sheet.py OUT.jpg DIR PREFIX [--cols 4 --thumb 480] [--frames 0 24 ...]          # labelled contact sheet
    python3 sheet.py OUT.jpg DIR PREFIX --card [--cols 3]                                     # real card chrome test

--card shows every still the way the Projects page shows the loop: object-fit: cover into a 515x195 box (desktop,
2 columns) and a 400x195 box (narrow), with the white 18 px bottom fade and a stand-in for the LIVE pill (top right),
at 1x CSS size, so what you see is what a visitor sees. Frame labels are frame number + seconds at 24 fps.
Functions return (value, None) on success or (None, "error") on failure.
"""
import argparse
import glob
import os
import re

from PIL import Image, ImageDraw


def load_stills(d, prefix, frames):
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


def card_view(im, bw, bh):
    """object-fit: cover of the 16:9 still into a bw x bh box, plus the page's bottom fade and LIVE pill."""
    W, H = im.size
    s = max(bw / W, bh / H)
    sw, sh = round(W * s), round(H * s)
    big = im.resize((sw, sh), Image.LANCZOS)
    x0, y0 = (sw - bw) // 2, (sh - bh) // 2
    c = big.crop((x0, y0, x0 + bw, y0 + bh)).convert("RGBA")
    fade = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(fade)
    for k in range(18):
        a = int(255 * (k + 1) / 18)
        d.line([(0, bh - 18 + k), (bw, bh - 18 + k)], fill=(255, 255, 255, a))
    # LIVE pill stand-in (top right)
    d.rounded_rectangle([bw - 62, 10, bw - 12, 30], radius=10, fill=(20, 20, 28, 200))
    d.text((bw - 52, 14), "LIVE", fill=(255, 255, 255, 255))
    return Image.alpha_composite(c, fade).convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("dir")
    ap.add_argument("prefix")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--thumb", type=int, default=480)
    ap.add_argument("--frames", type=int, nargs="*")
    ap.add_argument("--card", action="store_true")
    ap.add_argument("--fps", type=float, default=24)
    a = ap.parse_args()
    items, err = load_stills(a.dir, a.prefix, a.frames)
    if err:
        print("ERROR", err)
        return 1
    pad, lab = 8, 16
    if a.card:
        cols = a.cols
        cw, ch = 515 + 400 + 3 * pad, 195 + lab + pad
        rows = (len(items) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cw + pad, rows * ch + pad), (246, 246, 248))
        d = ImageDraw.Draw(sheet)
        for j, (f, p) in enumerate(items):
            im = Image.open(p).convert("RGB")
            x, y = pad + (j % cols) * cw, pad + (j // cols) * ch
            d.text((x, y), f"f{f}  {f / a.fps:.2f}s", fill=(40, 40, 40))
            sheet.paste(card_view(im, 515, 195), (x, y + lab))
            sheet.paste(card_view(im, 400, 195), (x + 515 + pad, y + lab))
    else:
        th = round(a.thumb * 9 / 16)
        rows = (len(items) + a.cols - 1) // a.cols
        sheet = Image.new("RGB", (a.cols * (a.thumb + pad) + pad, rows * (th + pad) + pad), (24, 22, 30))
        d = ImageDraw.Draw(sheet)
        for j, (f, p) in enumerate(items):
            im = Image.open(p).convert("RGB").resize((a.thumb, th), Image.LANCZOS)
            x, y = pad + (j % a.cols) * (a.thumb + pad), pad + (j // a.cols) * (th + pad)
            sheet.paste(im, (x, y))
            t = f"f{f}  {f / a.fps:.2f}s"
            d.rectangle([x, y, x + 8 + 7 * len(t), y + 15], fill=(0, 0, 0))
            d.text((x + 4, y + 2), t, fill=(255, 255, 255))
    sheet.save(a.out, quality=88)
    print(a.out, sheet.size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
