#!/usr/bin/env python3
"""Build a review evidence folder from a rendered clip (preview or master):

    python3 evidence.py VIDEO OUTDIR --strips 150:190 300:330 --stills 60 240 470 --card 0 120 240 360 470

Writes overview.jpg (every 12th frame), strips_A-B.jpg (every 2nd frame in each range), card.jpg (real card chrome),
seam.jpg (last 8 + first 8 frames), stills/fNNNN.jpg (full frames) and diff.txt (frame-difference stats + seam).
"""
import argparse
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VS = os.path.join(HERE, "vsheet.py")


def run(args):
    r = subprocess.run([sys.executable, VS] + args, capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip()[-400:])
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--strips", nargs="*", default=[])
    ap.add_argument("--stills", nargs="*", type=int, default=[])
    ap.add_argument("--card", nargs="*", type=int, default=[])
    a = ap.parse_args()
    os.makedirs(os.path.join(a.out, "stills"), exist_ok=True)
    run([a.video, os.path.join(a.out, "overview.jpg"), "--every", "12", "--cols", "8", "--thumb", "300"])
    for s in a.strips:
        lo, hi = s.split(":")
        run([a.video, os.path.join(a.out, f"strips_{lo}-{hi}.jpg"), "--start", lo, "--end", hi, "--every", "2", "--cols", "6", "--thumb", "320"])
    if a.card:
        run([a.video, os.path.join(a.out, "card.jpg"), "--frames", *map(str, a.card), "--card"])
    run([a.video, os.path.join(a.out, "seam.jpg"), "--seam", "8", "--cols", "8", "--thumb", "300"])
    for f in a.stills:
        run([a.video, os.path.join(a.out, "stills", f"f{f:04d}.jpg"), "--frames", str(f), "--cols", "1", "--thumb", "1920"])
    d = run([a.video, "--diff"])
    open(os.path.join(a.out, "diff.txt"), "w").write(d)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
