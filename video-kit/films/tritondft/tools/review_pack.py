#!/usr/bin/env python3
"""Build a review pack from a folder of full-film JPEG stills (shoot.py stills --every 1).

  python3 tools/review_pack.py FRAMES_DIR PREFIX OUT_DIR

Writes into OUT_DIR: sheet_1fps.jpg (1 frame/s), shot_<name>.jpg (every 4th frame of each shot), card.jpg (real-size
Projects-page card emulation of key frames), seam.jpg (the loop seam, last 8 + first 8 frames) and key_<frame>.jpg
(full-size key stills). Shot boundaries follow STORYBOARD.md.
"""
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = [("S1_desk", 0, 96), ("S2_planner", 96, 176), ("S3_executor", 176, 280), ("S3b_desk", 280, 320),
         ("S4_analyzer", 320, 384), ("S5_refiner", 384, 460), ("S6_lap", 460, 508), ("S7_converged", 508, 576),
         ("S8_payoff", 576, 684), ("S9_home", 684, 720)]
KEYS = [0, 30, 66, 124, 150, 222, 262, 300, 350, 372, 384, 420, 446, 490, 532, 545, 600, 640, 664, 700]
CARD = [0, 66, 124, 222, 262, 300, 372, 420, 532, 600, 640, 664]


def run(*a):
    subprocess.run([sys.executable, os.path.join(HERE, "review.py"), *map(str, a)], check=True)


def main():
    d, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    run("sheet", os.path.join(out, "sheet_1fps.jpg"), d, prefix, "--cols", 6, "--thumb", 320, "--frames", *range(0, 720, 24))
    for name, a, b in SHOTS:
        run("sheet", os.path.join(out, f"shot_{name}.jpg"), d, prefix, "--cols", 6, "--thumb", 320, "--frames", *range(a, b, 4))
    run("card", os.path.join(out, "card.jpg"), d, prefix, "--cols", 3, "--frames", *CARD)
    run("sheet", os.path.join(out, "seam.jpg"), d, prefix, "--cols", 8, "--thumb", 240, "--frames", *range(712, 720), *range(0, 8))
    for f in KEYS:
        src = os.path.join(d, f"{prefix}_{f:04d}.jpg")
        if os.path.exists(src):
            shutil.copy(src, os.path.join(out, f"key_{f:04d}.jpg"))
    print("review pack ->", out)


if __name__ == "__main__":
    main()
