#!/usr/bin/env python3
"""Low-res full pass of the film as one H.264 clip (for review sheets), rendered in parallel chunks.

    python3 preview.py SCENE.html OUT.mp4 [--frames N] [--jobs 2] [--chunk 96] [--width 960 --height 540] [--q k=v ...]

Each chunk is a pipeline/tools/nshoot.py 'clip' run (one browser each, no frame folders); chunks are then joined
losslessly with the concat demuxer. Resumable: finished chunk files are kept in OUT's folder (_prev_XXXX.mp4) and
skipped on the next run unless --fresh. Prints progress per chunk.
"""
import argparse
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
NSHOOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "pipeline", "tools", "nshoot.py"))


def run_chunk(a, lo, hi, path):
    if os.path.exists(path) and not a.fresh:
        return lo, hi, 0.0, "cached"
    tmp = path + ".part.mp4"
    cmd = [sys.executable, NSHOOT, a.scene, "clip", "--range", f"{lo}:{hi}", "--clip", tmp,
           "--width", str(a.width), "--height", str(a.height), "--crf", "20", "--deadline", "0"]
    for q in a.q:
        cmd += ["--q", q]
    t0 = time.time()
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(NSHOOT))
    if r.returncode != 0 or not os.path.exists(tmp):
        return lo, hi, time.time() - t0, "FAILED " + (r.stdout[-800:] + r.stderr[-800:])
    errs = [l for l in r.stdout.splitlines() if "pageerror" in l or "SCENE ERROR" in l or "console.error" in l]
    os.replace(tmp, path)
    return lo, hi, time.time() - t0, ("errors: " + " | ".join(errs[:3])) if errs else "ok"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("out")
    ap.add_argument("--frames", type=int, required=True)
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--chunk", type=int, default=96)
    ap.add_argument("--width", type=int, default=960)
    ap.add_argument("--height", type=int, default=540)
    ap.add_argument("--q", action="append", default=[])
    ap.add_argument("--fresh", action="store_true")
    a = ap.parse_args()
    a.scene = os.path.abspath(a.scene)
    out = os.path.abspath(a.out)
    d = os.path.dirname(out)
    os.makedirs(d, exist_ok=True)
    stem = os.path.splitext(os.path.basename(out))[0]
    chunks = [(lo, min(a.frames, lo + a.chunk)) for lo in range(0, a.frames, a.chunk)]
    paths = [os.path.join(d, f"_{stem}_{lo:04d}.mp4") for lo, _ in chunks]
    t0 = time.time()
    with ThreadPoolExecutor(a.jobs) as ex:
        for lo, hi, dt, st in ex.map(lambda c: run_chunk(a, c[0][0], c[0][1], c[1]), zip(chunks, paths)):
            print(f"chunk {lo}:{hi} {dt:.0f}s {st}", flush=True)
    missing = [p for p in paths if not os.path.exists(p)]
    if missing:
        print("MISSING", missing)
        return 1
    lst = os.path.join(d, f"_{stem}_list.txt")
    with open(lst, "w") as f:
        for p in paths:
            f.write(f"file '{p}'\n")
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", "-movflags", "+faststart", out])
    if r.returncode:
        return 1
    print(f"-> {out}  ({time.time() - t0:.0f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
