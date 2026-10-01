#!/usr/bin/env python3
"""Encode + check the Yufei avatar film from rendered PNG frames.

    python3 tools/finish.py FRAMES_DIR OUT_DIR [--crf 30] [--max-mb 1.2] [--search]

Writes OUT_DIR/yufei.mp4 (480x480, 24 fps, H.264 high, yuv420p, -tune animation, +faststart, no audio),
OUT_DIR/yufei_sheet.jpg (16 labelled frames from the DECODED mp4), OUT_DIR/yufei_circle_135.jpg (key frames
cropped to the circle at 135 px and 200 px), and prints ffprobe facts + the photo match of the first/last frames.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO = os.path.join(HERE, "assets", "yufei.webp")
SIZE = 480
KEY = [0, 11, 40, 64, 80, 104, 112, 140, 168, 191]


def encode(frames, out, crf):
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-framerate", "24", "-i", os.path.join(frames, "f_%05d.png"),
           "-vf", f"scale={SIZE}:{SIZE}:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-preset", "veryslow",
           "-tune", "animation", "-crf", str(crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]
    subprocess.run(cmd, check=True)
    return os.path.getsize(out) / 1e6


def decode(path):
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8)
    return a.reshape(-1, SIZE, SIZE, 3)


def probe(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                        "stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_read_frames,duration,bit_rate",
                        "-show_entries", "format=size,duration", "-of", "json", path], capture_output=True, check=True, text=True)
    return json.loads(p.stdout)


def photo_ref():
    im = Image.open(PHOTO).convert("RGBA")
    rgb = np.array(im.resize((SIZE, SIZE), Image.LANCZOS).convert("RGB")).astype(np.float32)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    inside = (xx + 0.5 - SIZE / 2) ** 2 + (yy + 0.5 - SIZE / 2) ** 2 < (SIZE / 2 - 2) ** 2
    return rgb, inside


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames"); ap.add_argument("out")
    ap.add_argument("--crf", type=float, default=30); ap.add_argument("--max-mb", type=float, default=1.2)
    ap.add_argument("--search", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    mp4 = os.path.join(a.out, "yufei.mp4")
    crf = a.crf
    mb = encode(a.frames, mp4, crf)
    print(f"crf {crf}: {mb:.3f} MB")
    if a.search:
        # lowest CRF (best quality) that fits the budget
        while mb > a.max_mb:
            crf += 1; mb = encode(a.frames, mp4, crf); print(f"crf {crf}: {mb:.3f} MB")
        while crf > 18:
            m2 = encode(a.frames, mp4, crf - 1)
            print(f"crf {crf - 1}: {m2:.3f} MB")
            if m2 > a.max_mb:
                encode(a.frames, mp4, crf); break
            crf -= 1; mb = m2
    info = probe(mp4)
    print(json.dumps(info, indent=1))
    V = decode(mp4)
    n = len(V)
    ref, inside = photo_ref()
    for name, k in (("first", 0), ("last", n - 1)):
        d = np.abs(V[k].astype(np.float32) - ref)
        print(f"{name} frame f{k}: mean abs diff vs photo (inside circle) {d[inside].mean():.2f}/255, max {d[inside].max():.0f}; "
              f"p99 {np.percentile(d[inside], 99):.1f}")
    for k in range(n - 10, n):
        d = np.abs(V[k].astype(np.float32) - ref)
        print(f"  f{k}: {d[inside].mean():.2f}")
    # contact sheet: 16 frames
    idx = np.linspace(0, n - 1, 16).round().astype(int)
    t = 240; pad = 6
    sh = Image.new("RGB", (4 * (t + pad) + pad, 4 * (t + pad) + pad), (24, 22, 30)); dr = ImageDraw.Draw(sh)
    for j, k in enumerate(idx):
        im = Image.fromarray(V[k]).resize((t, t), Image.LANCZOS)
        x, y = pad + (j % 4) * (t + pad), pad + (j // 4) * (t + pad)
        sh.paste(im, (x, y)); lab = f"f{k} {k / 24:.2f}s"
        dr.rectangle([x, y, x + 8 + 7 * len(lab), y + 14], fill=(0, 0, 0)); dr.text((x + 4, y + 1), lab, fill=(255, 255, 255))
    sh.save(os.path.join(a.out, "yufei_sheet.jpg"), quality=90)
    # circle crops at 135 and 200 px (page background white, like the Team page)
    keys = [k for k in KEY if k < n]
    W = len(keys) * 210 + 10
    cs = Image.new("RGB", (W, 380), (255, 255, 255)); dr = ImageDraw.Draw(cs)
    for j, k in enumerate(keys):
        for s, y0 in ((200, 10), (135, 225)):
            im = Image.fromarray(V[k]).resize((s, s), Image.LANCZOS)
            m = Image.new("L", (s, s), 0); ImageDraw.Draw(m).ellipse([0, 0, s - 1, s - 1], fill=255)
            x0 = 10 + j * 210 + (200 - s) // 2
            cs.paste(im, (x0, y0), m)
        dr.text((10 + j * 210 + 80, 364), f"f{k}", fill=(0, 0, 0))
    cs.save(os.path.join(a.out, "yufei_circle_135.jpg"), quality=92)
    print("frames decoded:", n, " size MB:", round(os.path.getsize(mp4) / 1e6, 3), " crf:", crf)


if __name__ == "__main__":
    sys.exit(main())
