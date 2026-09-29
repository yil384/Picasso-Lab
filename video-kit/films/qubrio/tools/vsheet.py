#!/usr/bin/env python3
"""Labelled sheets straight from a video (no frame folders):

    python3 vsheet.py VIDEO OUT.jpg --every 12 [--start 0 --end N] [--cols 6 --thumb 320]     # motion strip / overview
    python3 vsheet.py VIDEO OUT.jpg --frames 0 100 200 [--cols 3 --thumb 640]                  # chosen frames
    python3 vsheet.py VIDEO OUT.jpg --frames ... --card                                        # real card chrome (515 + 400 px)
    python3 vsheet.py VIDEO OUT.jpg --seam 8                                                    # last 8 + first 8 frames
    python3 vsheet.py VIDEO --diff                                                              # per-frame mean abs diff stats + seam

Labels are frame index and seconds (24 fps). Returns non-zero on error.
"""
import argparse
import subprocess
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, __file__.rsplit("/", 1)[0])
from sheet import card_view  # noqa: E402


def probe(v):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries",
                        "stream=width,height,nb_read_packets", "-of", "csv=p=0", v], capture_output=True, text=True)
    w, h, n = r.stdout.strip().split(",")[:3]
    return int(w), int(h), int(n)


def read_frames(v, want, scale=None):
    W, H, N = probe(v)
    vf = []
    if scale:
        vf = ["-vf", f"scale={scale[0]}:{scale[1]}:flags=lanczos"]
        W, H = scale
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", v, *vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    got, n, last = {}, 0, max(want)
    while n <= last:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        if n in want:
            got[n] = Image.frombytes("RGB", (W, H), b)
        n += 1
    p.kill()
    return got, N


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out", nargs="?")
    ap.add_argument("--every", type=int)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int)
    ap.add_argument("--frames", type=int, nargs="*")
    ap.add_argument("--seam", type=int)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--thumb", type=int, default=320)
    ap.add_argument("--card", action="store_true")
    ap.add_argument("--diff", action="store_true")
    ap.add_argument("--fps", type=float, default=24)
    a = ap.parse_args()
    W, H, N = probe(a.video)
    if a.diff:
        import numpy as np
        want = set(range(N))
        got, _ = read_frames(a.video, want, scale=(480, 270))
        arr = [np.asarray(got[i], dtype=np.float32) for i in range(len(got))]
        d = [float(np.abs(arr[i + 1] - arr[i]).mean()) for i in range(len(arr) - 1)]
        seam = float(np.abs(arr[0] - arr[-1]).mean())
        srt = sorted(d)
        print(f"frames {len(arr)}  median diff {srt[len(srt) // 2]:.2f}  p90 {srt[int(len(srt) * 0.9)]:.2f}  max {srt[-1]:.2f} at {d.index(srt[-1])}")
        print(f"seam {len(arr) - 1}->0 diff {seam:.2f}")
        big = sorted(range(len(d)), key=lambda i: -d[i])[:12]
        print("largest jumps:", ", ".join(f"{i}->{i + 1}:{d[i]:.1f}" for i in sorted(big)))
        return 0
    if a.seam:
        idx = list(range(N - a.seam, N)) + list(range(0, a.seam))
    elif a.frames:
        idx = a.frames
    else:
        end = a.end if a.end is not None else N
        idx = list(range(a.start, end, a.every or 12))
    got, _ = read_frames(a.video, set(idx))
    pad, lab = 6, 14
    if a.card:
        cw, ch = 515 + 400 + 3 * pad, 195 + lab + pad
        cols = min(a.cols, 2)
        rows = (len(idx) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * cw + pad, rows * ch + pad), (246, 246, 248))
        d = ImageDraw.Draw(sheet)
        for j, f in enumerate(idx):
            if f not in got:
                continue
            x, y = pad + (j % cols) * cw, pad + (j // cols) * ch
            d.text((x, y), f"f{f}  {f / a.fps:.2f}s", fill=(40, 40, 40))
            sheet.paste(card_view(got[f], 515, 195), (x, y + lab))
            sheet.paste(card_view(got[f], 400, 195), (x + 515 + pad, y + lab))
    else:
        th = round(a.thumb * H / W)
        rows = (len(idx) + a.cols - 1) // a.cols
        sheet = Image.new("RGB", (a.cols * (a.thumb + pad) + pad, rows * (th + pad) + pad), (24, 22, 30))
        d = ImageDraw.Draw(sheet)
        for j, f in enumerate(idx):
            if f not in got:
                continue
            x, y = pad + (j % a.cols) * (a.thumb + pad), pad + (j // a.cols) * (th + pad)
            sheet.paste(got[f].resize((a.thumb, th), Image.LANCZOS), (x, y))
            t = f"f{f} {f / a.fps:.2f}s"
            d.rectangle([x, y, x + 6 + 6 * len(t), y + 12], fill=(0, 0, 0))
            d.text((x + 3, y + 1), t, fill=(255, 255, 255))
    sheet.save(a.out, quality=87)
    print(a.out, sheet.size)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
