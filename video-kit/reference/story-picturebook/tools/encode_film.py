#!/usr/bin/env python3
"""Encode the film deliverables from the lossless segments in out/seg/.

    python3 tools/encode_film.py master|card|poster|sheet|all [--poster 272]

master : 1920x1080 24 fps H.264 High, CRF 18, yuv420p (bt709), +faststart, exactly 360 frames
card   : centre crop 1.82:1 -> 960x528 lanczos, lowest CRF >= 22 that fits 2.5 MB
poster : one frame, same crop, 960x528 WebP q80
sheet  : 4x4 contact sheet JPEG (every 22.5 frames) from the master
Every function returns (value, None) on success or (None, "error") on failure.
"""
import glob
import io
import os
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
NAME = "qubrio_picturebook"
N, FPS = 360, 24
BT709 = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
TO_YUV = "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p"
CARD_VF = "crop=1920:1054:0:13,scale=960:528:flags=lanczos"


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        return None, (p.stderr or p.stdout)[-800:]
    return p.stdout, None


def seg_list():
    segs = sorted(glob.glob(os.path.join(OUT, "seg", "s_*_*.mkv")))
    if not segs:
        return None, "no segments in out/seg"
    covered = []
    for s in segs:
        a, b = [int(x) for x in os.path.basename(s)[2:-4].split("_")]
        covered.append((a, b))
    expect = 0
    for a, b in covered:
        if a != expect:
            return None, f"gap/overlap at frame {expect} (next segment starts {a})"
        expect = b
    if expect != N:
        return None, f"segments end at {expect}, expected {N}"
    lst = os.path.join(OUT, "seg", "list.txt")
    with open(lst, "w") as f:
        for s in segs:
            f.write(f"file '{s}'\n")
    return lst, None


def count_frames(path):
    out, err = run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries",
                    "stream=nb_read_frames", "-of", "csv=p=0", path])
    if err:
        return None, err
    return int(out.strip()), None


def master():
    lst, err = seg_list()
    if err:
        return None, err
    dst = os.path.join(OUT, f"{NAME}_master.mp4")
    _, err = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                  "-vf", TO_YUV, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
                  "-r", str(FPS), *BT709, "-movflags", "+faststart", "-an", dst])
    if err:
        return None, err
    n, err = count_frames(dst)
    if err:
        return None, err
    if n != N:
        return None, f"master has {n} frames"
    return (dst, n, os.path.getsize(dst)), None


def card_intermediate():
    """Crop + lanczos to 960x528 once, losslessly (RGB), so each CRF trial is quick."""
    lst, err = seg_list()
    if err:
        return None, err
    dst = os.path.join(OUT, "card_intermediate.mkv")
    if os.path.exists(dst):
        n, err = count_frames(dst)
        if not err and n == N:
            return dst, None
    _, err = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                  "-vf", CARD_VF, "-c:v", "libx264rgb", "-qp", "0", "-preset", "ultrafast", "-r", str(FPS), dst])
    if err:
        return None, err
    return dst, None


def card(max_mb=2.5, start=None):
    src, err = card_intermediate()
    if err:
        return None, err
    dst = os.path.join(OUT, f"{NAME}_loop.mp4")
    tries = []
    crf = start or 22
    while crf <= 34:
        _, err = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src,
                      "-vf", TO_YUV, "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
                      "-crf", str(crf), "-profile:v", "high", "-g", "48", "-r", str(FPS), *BT709,
                      "-movflags", "+faststart", "-an", dst])
        if err:
            return None, err
        mb = os.path.getsize(dst) / 1e6
        tries.append((crf, round(mb, 2)))
        print("  card crf", crf, round(mb, 2), "MB", flush=True)
        if mb <= max_mb:
            n, err = count_frames(dst)
            if err:
                return None, err
            return (dst, crf, mb, n, tries), None
        crf += 1 if mb < max_mb * 1.25 else 2
    return None, f"could not fit {max_mb} MB: {tries}"


def frame_rgb(i):
    """Frame i (0..359) as a PIL image from the lossless segments."""
    for s in sorted(glob.glob(os.path.join(OUT, "seg", "s_*_*.mkv"))):
        a, b = [int(x) for x in os.path.basename(s)[2:-4].split("_")]
        if a <= i < b:
            p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", s, "-vf", f"select=eq(n\\,{i - a})", "-vsync", "0",
                                "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"], capture_output=True)
            if p.returncode != 0 or not p.stdout:
                return None, p.stderr.decode()[-400:]
            return Image.open(io.BytesIO(p.stdout)).convert("RGB"), None
    return None, f"frame {i} not in segments"


def poster(i=272):
    im, err = frame_rgb(i)
    if err:
        return None, err
    im = im.crop((0, 13, 1920, 13 + 1054)).resize((960, 528), Image.LANCZOS)
    dst = os.path.join(OUT, f"{NAME}_poster.webp")
    im.save(dst, "WEBP", quality=80, method=6)
    return (dst, os.path.getsize(dst)), None


def sheet():
    src = os.path.join(OUT, f"{NAME}_master.mp4")
    if not os.path.exists(src):
        return None, "encode the master first"
    frames = [round(k * N / 16) for k in range(16)]
    tw, th = 480, 270
    p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", src, "-vf", f"scale={tw}:{th}:flags=lanczos",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    want, got, n = set(frames), {}, 0
    while n <= max(frames):
        buf = p.stdout.read(tw * th * 3)
        if len(buf) < tw * th * 3:
            break
        if n in want:
            got[n] = Image.frombytes("RGB", (tw, th), buf)
        n += 1
    p.kill()
    if len(got) != len(frames):
        return None, f"read {len(got)} of {len(frames)} frames"
    sh = Image.new("RGB", (tw * 4, th * 4), (20, 20, 20))
    d = ImageDraw.Draw(sh)
    for k, f in enumerate(frames):
        x, y = (k % 4) * tw, (k // 4) * th
        sh.paste(got[f], (x, y))
        lab = f"f{f}  {f / FPS:.2f}s"
        d.rectangle([x, y, x + 7 * len(lab) + 8, y + 16], fill=(20, 20, 20))
        d.text((x + 4, y + 2), lab, fill=(255, 255, 255))
    dst = os.path.join(OUT, f"{NAME}_sheet.jpg")
    sh.save(dst, quality=88)
    return (dst, sh.size), None


def main():
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    pf = int(sys.argv[sys.argv.index("--poster") + 1]) if "--poster" in sys.argv else 272
    cs = int(sys.argv[sys.argv.index("--crf") + 1]) if "--crf" in sys.argv else None
    steps = {"master": master, "card": lambda: card(start=cs), "cardint": card_intermediate, "poster": lambda: poster(pf), "sheet": sheet}
    order = ["master", "card", "poster", "sheet"] if what == "all" else [what]
    for k in order:
        val, err = steps[k]()
        print(k, "ERROR" if err else "ok", err or val, flush=True)
        if err:
            sys.exit(1)


if __name__ == "__main__":
    main()
