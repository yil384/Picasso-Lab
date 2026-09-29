#!/usr/bin/env python3
"""Review images from JPEG stills written by shoot.py (never PNG folders).

  python3 review.py sheet OUT.jpg DIR PREFIX [--cols 6 --thumb 320 --frames ...]   labelled contact sheet / strip
  python3 review.py card  OUT.jpg DIR PREFIX [--cols 4 --frames ...]               real Projects-page card emulation

The card emulation follows projects/projects.html: the 960x528 card loop (centre 1.82:1 crop of the master) is
shown with object-fit: cover in a 515x195 desktop card (2.64:1) / 400x195 / 330x165 mobile card, with the LIVE pill
(top-right), the dashed corner brackets (55% opacity) and the 18 px white bottom fade. 1x device pixels (strict).
"""
import argparse
import glob
import os
import re

from PIL import Image, ImageDraw, ImageFilter


def load(d, prefix, frames):
    out = []
    for p in sorted(glob.glob(os.path.join(d, f"{prefix}_*.jpg"))):
        m = re.search(r"_(\d+)\.jpg$", p)
        if m and (not frames or int(m.group(1)) in frames):
            out.append((int(m.group(1)), p))
    if frames:                                   # keep the requested order (e.g. a loop seam 712..719, 0..7)
        out.sort(key=lambda fp: frames.index(fp[0]))
    return out


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 8 + 7 * len(text), 15], fill=(0, 0, 0))
    d.text((4, 2), text, fill=(255, 255, 255))


def card_loop_frame(im):
    """master still -> the 960x528 card-loop frame (centre crop 1.82:1, lanczos)."""
    w, h = im.size
    ch = round(w / 1.82)
    y0 = (h - ch) // 2
    return im.crop((0, y0, w, y0 + ch)).resize((960, 528), Image.LANCZOS)


def card(im, W, H, accent=(2, 132, 199)):
    """object-fit: cover of the 960x528 loop frame into W x H plus the page chrome."""
    src = card_loop_frame(im)
    s = max(W / src.width, H / src.height)
    r = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    x0, y0 = (r.width - W) // 2, (r.height - H) // 2
    c = r.crop((x0, y0, x0 + W, y0 + H)).convert("RGBA")
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # bottom fade (18 px): transparent -> 60% white at 60% -> 97% white
    for y in range(18):
        t = y / 17
        a = 0.6 * t / 0.6 if t < 0.6 else 0.6 + (0.97 - 0.6) * (t - 0.6) / 0.4
        d.line([(0, H - 18 + y), (W, H - 18 + y)], fill=(255, 255, 255, round(255 * a)))
    # corner brackets (viewBox 480x195, preserveAspectRatio none), 55% opacity
    sx, sy = W / 480, H / 195
    bc = (56, 189, 248, round(255 * 0.7 * 0.55))
    for pts in ([(14, 30), (14, 13), (30, 13)], [(450, 13), (466, 13), (466, 30)], [(14, 165), (14, 182), (30, 182)], [(450, 182), (466, 182), (466, 165)]):
        d.line([(x * sx, y * sy) for x, y in pts], fill=bc, width=2)
    # LIVE pill: top 12, right 12, ~52 x 21 px, dark translucent
    pw, ph = 52, 21
    d.rounded_rectangle([W - 12 - pw, 12, W - 12, 12 + ph], radius=10, fill=(10, 12, 24, 150), outline=(255, 255, 255, 30))
    d.ellipse([W - 12 - pw + 9, 12 + 7, W - 12 - pw + 15, 12 + 13], fill=(34, 212, 107, 255))
    d.text((W - 12 - pw + 20, 12 + 5), "LIVE", fill=(255, 255, 255, 255))
    c = Image.alpha_composite(c, ov).convert("RGB")
    # accent bar on top (3 px) like the card
    top = Image.new("RGB", (W, 3), accent)
    out = Image.new("RGB", (W, H + 3), (255, 255, 255))
    out.paste(top, (0, 0)); out.paste(c, (0, 3))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["sheet", "card"])
    ap.add_argument("out")
    ap.add_argument("dir")
    ap.add_argument("prefix")
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--thumb", type=int, default=320)
    ap.add_argument("--frames", type=int, nargs="*")
    ap.add_argument("--fps", type=int, default=24)
    a = ap.parse_args()
    items = load(a.dir, a.prefix, a.frames)
    if not items:
        raise SystemExit(f"no stills {a.prefix}_*.jpg in {a.dir}")
    pad = 6
    if a.mode == "sheet":
        th = round(a.thumb * 9 / 16)
        rows = (len(items) + a.cols - 1) // a.cols
        sheet = Image.new("RGB", (a.cols * (a.thumb + pad) + pad, rows * (th + pad) + pad), (24, 22, 30))
        for j, (f, p) in enumerate(items):
            im = Image.open(p).convert("RGB").resize((a.thumb, th), Image.LANCZOS)
            label(im, f"f{f} {f / a.fps:.2f}s")
            sheet.paste(im, (pad + (j % a.cols) * (a.thumb + pad), pad + (j // a.cols) * (th + pad)))
    else:
        tiles = []
        for f, p in items:
            im = Image.open(p).convert("RGB")
            if im.width < 1920:
                im = im.resize((1920, 1080), Image.LANCZOS)
            row = [card(im, 515, 195), card(im, 400, 195), card(im, 330, 165)]
            w = sum(t.width for t in row) + pad * 2
            h = max(t.height for t in row) + 16
            t = Image.new("RGB", (w, h), (238, 240, 245))
            x = 0
            for c in row:
                t.paste(c, (x, 16)); x += c.width + pad
            ImageDraw.Draw(t).text((2, 2), f"f{f} {f / a.fps:.2f}s   desktop 515x195 | 400x195 | mobile 330x165", fill=(40, 40, 60))
            tiles.append(t)
        cols = max(1, min(a.cols, 2))
        rows = (len(tiles) + cols - 1) // cols
        tw, th = tiles[0].width, tiles[0].height
        sheet = Image.new("RGB", (cols * (tw + 14) + 14, rows * (th + 14) + 14), (255, 255, 255))
        for j, t in enumerate(tiles):
            sheet.paste(t, (14 + (j % cols) * (tw + 14), 14 + (j // cols) * (th + 14)))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sheet.save(a.out, quality=90)
    print("->", a.out, sheet.size)


if __name__ == "__main__":
    main()
