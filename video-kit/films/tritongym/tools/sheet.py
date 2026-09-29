#!/usr/bin/env python3
"""Contact sheets / card-size tests for looking at the film.

    python3 sheet.py snaps  OUT.jpg DIR TAG [--cols 4 --thumb 480] [--card]        # studio snaps TAG_00048.jpg ...
    python3 sheet.py video  OUT.jpg VIDEO --frames 0 24 48 ... [--cols 6 --thumb 320] [--card]
    python3 sheet.py video  OUT.jpg VIDEO --every 24                                 # 1 frame per second

--card shows every frame the way the Projects page does: a centre crop to 2.1:1 at 400 px (mobile / narrow) AND
to 2.64:1 at 515 px (desktop two-column grid), side by side, with the LIVE-pill zone and the bottom fade marked.
"""
import argparse
import glob
import os
import re
import subprocess

from PIL import Image, ImageDraw

INK = (30, 26, 40)


def label(im, text):
    d = ImageDraw.Draw(im)
    w = 8 + 7 * len(text)
    d.rectangle([0, 0, w, 16], fill=(20, 20, 20))
    d.text((4, 2), text, fill=(255, 255, 255))
    return im


def card_pair(im):
    W, H = im.size
    out = []
    for ar, tw in ((2.1, 400), (2.64, 515)):
        ch = round(W / ar)
        y0 = (H - ch) // 2
        c = im.crop((0, y0, W, y0 + ch)).resize((tw, round(tw / ar)), Image.LANCZOS)
        d = ImageDraw.Draw(c, "RGBA")
        cw, chh = c.size
        # the site's bottom white fade (18 css px) and the LIVE pill (top right)
        for k in range(18):
            d.line([(0, chh - 1 - k), (cw, chh - 1 - k)], fill=(255, 255, 255, int(200 * (1 - k / 18))))
        d.rounded_rectangle([cw - 58, 8, cw - 10, 26], 8, fill=(255, 255, 255, 230), outline=(0, 0, 0, 80))
        d.text((cw - 50, 12), "LIVE", fill=(5, 150, 105))
        out.append(c)
    both = Image.new("RGB", (out[0].width + out[1].width + 10, max(o.height for o in out)), (255, 255, 255))
    both.paste(out[0], (0, 0))
    both.paste(out[1], (out[0].width + 10, 0))
    return both


def tile(items, cols, thumb, card, out, fps=24):
    cells = []
    for f, im in items:
        if card:
            c = card_pair(im)
        else:
            c = im.resize((thumb, round(thumb * im.height / im.width)), Image.LANCZOS)
        cells.append(label(c, f"f{f} {f / fps:.2f}s"))
    cw, ch = max(c.width for c in cells), max(c.height for c in cells)
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (cw + 6) + 6, rows * (ch + 6) + 6), (235, 232, 226) if card else (24, 24, 28))
    for k, c in enumerate(cells):
        sheet.paste(c, (6 + (k % cols) * (cw + 6), 6 + (k // cols) * (ch + 6)))
    sheet.save(out, quality=88)
    return out


def read_video(path, frames):
    pr = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height",
                         "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip().split(",")
    W, H = int(pr[0]), int(pr[1])
    want = set(frames)
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    got, n = {}, 0
    while n <= max(frames):
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        if n in want:
            got[n] = Image.frombytes("RGB", (W, H), b)
        n += 1
    p.kill()
    return [(f, got[f]) for f in frames if f in got], n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["snaps", "video"])
    ap.add_argument("out")
    ap.add_argument("src")
    ap.add_argument("tag", nargs="?")
    ap.add_argument("--frames", nargs="*", type=int)
    ap.add_argument("--every", type=int)
    ap.add_argument("--nframes", type=int, default=720)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--thumb", type=int, default=480)
    ap.add_argument("--card", action="store_true")
    a = ap.parse_args()
    if a.mode == "snaps":
        items = []
        for p in sorted(glob.glob(os.path.join(a.src, f"{a.tag}_*.jpg"))):
            m = re.search(r"_(\d+)\.jpg$", p)
            if m and (not a.frames or int(m.group(1)) in a.frames):
                items.append((int(m.group(1)), Image.open(p).convert("RGB")))
    else:
        frames = a.frames or list(range(0, a.nframes, a.every or 24))
        items, _ = read_video(a.src, frames)
    print(tile(items, a.cols, a.thumb, a.card, a.out), len(items), "frames")


if __name__ == "__main__":
    main()
