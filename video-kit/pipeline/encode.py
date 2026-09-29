#!/usr/bin/env python3
"""Encode rendered PNG frames (OUT/frames/f_00000.png ...) into deliverables.

    python3 encode.py OUT all                 # master + card + poster + sheet + preview
    python3 encode.py OUT master  [--crf 18 --preset slow]
    python3 encode.py OUT card    [--max-mb 2.5 --size 960x528 --aspect 1.82]
    python3 encode.py OUT poster  [--frame K --q 80 --size 960x528]
    python3 encode.py OUT sheet   [--grid 4x4 --thumb 480]
    python3 encode.py OUT preview [--range A:B --preview-fps 15 --preview-width 640 --gif]

Frames are read losslessly and streamed in order into ffmpeg's stdin (image2pipe, PNG codec).
Every function returns (value, None) on success or (None, "error") on failure.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

import pvlib

BT709 = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
TO_YUV = "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p"


# ---------------------------------------------------------------------------
def load_job(out_dir, name=None):
    """Resolve frame list and naming from OUT/render.json. Returns (job, None) or (None, err)."""
    man, err = pvlib.read_manifest(out_dir)
    if err:
        return None, err
    frames_dir = os.path.join(out_dir, "frames")
    n = int(man["frames"])
    missing = [i for i in range(n) if not pvlib.png_complete(pvlib.frame_path(frames_dir, i))]
    job = {
        "out": out_dir, "frames_dir": frames_dir, "N": n, "fps": man["fps"],
        "W": man["width"], "H": man["height"], "name": name or man.get("name", "scene"),
        "poster": man.get("poster", 0), "missing": missing,
        "paths": [pvlib.frame_path(frames_dir, i) for i in range(n)],
    }
    return job, None


def require_complete(job):
    if job["missing"]:
        m = job["missing"]
        shown = ", ".join(map(str, m[:12])) + (" ..." if len(m) > 12 else "")
        return None, f"{len(m)} of {job['N']} frames missing ({shown}); run render.py first"
    return True, None


class FrameStreamer:
    """Streams PNG files, in order, into an ffmpeg process (stdin, image2pipe)."""

    def __init__(self, fps, out_args, out_path, vf=None):
        self.cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                    "-f", "image2pipe", "-framerate", str(fps), "-c:v", "png", "-i", "-"]
        if vf:
            self.cmd += ["-vf", vf]
        self.cmd += list(out_args) + [out_path]
        self.out_path = out_path
        self.proc = subprocess.Popen(self.cmd, stdin=subprocess.PIPE)
        self.count = 0

    def feed(self, path):
        with open(path, "rb") as f:
            self.proc.stdin.write(f.read())
        self.count += 1

    def close(self):
        self.proc.stdin.close()
        rc = self.proc.wait()
        if rc != 0:
            return None, f"ffmpeg failed ({rc}): {' '.join(self.cmd)}"
        return self.out_path, None


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return None, f"command failed: {' '.join(cmd)}\n{r.stderr[-2000:]}"
    return r.stdout, None


def probe(path):
    out, err = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames",
                    "-show_entries", "stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,color_space",
                    "-show_entries", "format=duration,size,bit_rate", "-of", "json", path])
    if err:
        return None, err
    d = json.loads(out)
    s, f = d["streams"][0], d["format"]
    return {"codec": s["codec_name"], "profile": s.get("profile"), "size": f"{s['width']}x{s['height']}",
            "pix_fmt": s["pix_fmt"], "fps": s["r_frame_rate"], "frames": int(s.get("nb_read_frames", 0)),
            "duration": float(f["duration"]), "bytes": int(f["size"]), "kbps": round(int(f["bit_rate"]) / 1000),
            "color_space": s.get("color_space")}, None


def master_args(crf=18, preset="slow"):
    return ["-c:v", "libx264", "-profile:v", "high", "-preset", preset, "-crf", str(crf),
            "-pix_fmt", "yuv420p", *BT709, "-movflags", "+faststart", "-an"]


def crop_filter(aspect_w, aspect_h, size):
    w, h = size
    # centre crop to the card aspect, then resample (in RGB) to the card size
    return (f"crop='min(iw,trunc(ih*{aspect_w}/{aspect_h}/2)*2)':'min(ih,trunc(iw*{aspect_h}/{aspect_w}/2)*2)',"
            f"scale={w}:{h}:flags=lanczos+accurate_rnd+full_chroma_int")


# ---------------------------------------------------------------------------
def encode_master(job, crf=18, preset="slow"):
    ok, err = require_complete(job)
    if err:
        return None, err
    out = os.path.join(job["out"], f"{job['name']}_master.mp4")
    s = FrameStreamer(job["fps"], master_args(crf, preset), out, vf=TO_YUV)
    for p in job["paths"]:
        s.feed(p)
    return s.close()


def encode_card(job, max_mb=2.5, size=(960, 528), aspect=(182, 100), crf_start=22, crf_max=36):
    """Centre-crop to aspect, scale to size, x264 with the lowest CRF (>= crf_start) under max_mb."""
    ok, err = require_complete(job)
    if err:
        return None, err
    tmpdir = tempfile.mkdtemp(prefix="pvcard_", dir=job["out"])
    try:
        src = os.path.join(tmpdir, "card_src.mkv")
        s = FrameStreamer(job["fps"], ["-c:v", "ffv1", "-level", "3", "-pix_fmt", "bgr0"], src,
                          vf=crop_filter(aspect[0], aspect[1], size))
        for p in job["paths"]:
            s.feed(p)
        _, err = s.close()
        if err:
            return None, err
        out = os.path.join(job["out"], f"{job['name']}_loop.mp4")
        budget = max_mb * 1e6
        tries = []
        crf = crf_start
        while True:
            trial = os.path.join(tmpdir, f"crf{crf}.mp4")
            _, err = run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-vf", TO_YUV,
                          "-c:v", "libx264", "-profile:v", "high", "-preset", "veryslow", "-crf", str(crf),
                          "-pix_fmt", "yuv420p", *BT709, "-movflags", "+faststart", "-an", trial])
            if err:
                return None, err
            size_b = os.path.getsize(trial)
            tries.append((crf, size_b))
            if size_b <= budget or crf >= crf_max:
                shutil.copyfile(trial, out)
                break
            crf += 1 if size_b < budget * 1.25 else 2
        info, err = probe(out)
        if err:
            return None, err
        info["crf"] = crf
        info["tries"] = [f"crf{c}={b / 1e6:.2f}MB" for c, b in tries]
        info["within_budget"] = tries[-1][1] <= budget
        return (out, info), None
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _card_crop(im, size, aspect):
    from PIL import Image
    W, H = im.size
    target = aspect[0] / aspect[1]
    if W / H > target:
        cw, ch = round(H * target), H
    else:
        cw, ch = W, round(W / target)
    x0, y0 = (W - cw) // 2, (H - ch) // 2
    return im.crop((x0, y0, x0 + cw, y0 + ch)).resize(size, Image.LANCZOS)


def encode_poster(job, frame=None, q=80, size=(960, 528), aspect=(182, 100)):
    from PIL import Image
    k = job["poster"] if frame is None else frame
    path = pvlib.frame_path(job["frames_dir"], k)
    if not pvlib.png_complete(path):
        return None, f"poster frame {k} not rendered"
    im = _card_crop(Image.open(path).convert("RGB"), size, aspect)
    out = os.path.join(job["out"], f"{job['name']}_poster.webp")
    im.save(out, "WEBP", quality=q, method=6)
    return (out, k), None


def contact_sheet(job, grid=(4, 4), thumb_w=480):
    from PIL import Image, ImageDraw, ImageFont
    cols, rows = grid
    n = cols * rows
    idx = sorted({round(k * (job["N"] - 1) / (n - 1)) for k in range(n)})
    avail = [i for i in idx if pvlib.png_complete(pvlib.frame_path(job["frames_dir"], i))]
    if not avail:
        return None, "no frames to put on a contact sheet"
    th = round(thumb_w * job["H"] / job["W"])
    label_h = 22
    sheet = Image.new("RGB", (cols * thumb_w, rows * (th + label_h)), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.load_default(size=14)
    except TypeError:
        font = ImageFont.load_default()
    for k, i in enumerate(avail):
        im = Image.open(pvlib.frame_path(job["frames_dir"], i)).convert("RGB").resize((thumb_w, th), Image.LANCZOS)
        x, y = (k % cols) * thumb_w, (k // cols) * (th + label_h)
        sheet.paste(im, (x, y))
        d.text((x + 6, y + th + 3), f"f{i:04d}  {i / job['fps']:.2f}s", fill=(220, 220, 220), font=font)
    out = os.path.join(job["out"], f"{job['name']}_sheet.png")
    sheet.save(out, optimize=True)
    return (out, avail), None


def preview(job, rng=None, fps=15, width=640, gif=False):
    """Animated preview of a short range (default: first 3 s), subsampled to `fps`."""
    from PIL import Image
    a, b = rng if rng else (0, min(job["N"], int(round(3 * job["fps"]))))
    step = max(1, round(job["fps"] / fps))
    idx = [i for i in range(a, b, step) if pvlib.png_complete(pvlib.frame_path(job["frames_dir"], i))]
    if not idx:
        return None, "no frames for preview"
    real_fps = job["fps"] / step
    h = round(width * job["H"] / job["W"] / 2) * 2
    if gif:
        out = os.path.join(job["out"], f"{job['name']}_preview.gif")
        vf = (f"scale={width}:{h}:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];"
              f"[b][p]paletteuse=dither=sierra2_4a")
        s = FrameStreamer(real_fps, ["-loop", "0"], out, vf=vf)
        for i in idx:
            s.feed(pvlib.frame_path(job["frames_dir"], i))
        _, err = s.close()
        if err:
            return None, err
        return (out, idx), None
    frames = [Image.open(pvlib.frame_path(job["frames_dir"], i)).convert("RGB").resize((width, h), Image.LANCZOS)
              for i in idx]
    out = os.path.join(job["out"], f"{job['name']}_preview.webp")
    frames[0].save(out, "WEBP", save_all=True, append_images=frames[1:], duration=round(1000 / real_fps),
                   loop=0, quality=78, method=4)
    return (out, idx), None


# ---------------------------------------------------------------------------
def run_targets(out_dir, targets, opts):
    job, err = load_job(out_dir, opts.get("name"))
    if err:
        return None, err
    report = {}
    size = tuple(int(v) for v in opts.get("size", "960x528").split("x"))
    aspect = (round(float(opts.get("aspect", 1.82)) * 100), 100)
    for t in targets:
        t0 = time.time()
        if t == "master":
            res, err = encode_master(job, opts.get("crf", 18), opts.get("preset", "slow"))
            if not err:
                info, err = probe(res)
                res = (res, info)
        elif t == "card":
            res, err = encode_card(job, opts.get("max_mb", 2.5), size, aspect, opts.get("crf_start", 22))
        elif t == "poster":
            res, err = encode_poster(job, opts.get("frame"), opts.get("q", 80), size, aspect)
        elif t == "sheet":
            g = tuple(int(v) for v in opts.get("grid", "4x4").split("x"))
            res, err = contact_sheet(job, g, opts.get("thumb", 480))
        elif t == "preview":
            r = opts.get("range")
            r = tuple(int(v) for v in r.split(":")) if r else None
            res, err = preview(job, r, opts.get("preview_fps", 15), opts.get("preview_width", 640), opts.get("gif", False))
        else:
            err = f"unknown target {t}"
        if err:
            return None, f"[{t}] {err}"
        report[t] = {"result": res, "seconds": round(time.time() - t0, 2)}
        print(f"[encode] {t:8s} {time.time() - t0:6.1f}s  {res}", flush=True)
    return report, None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out")
    ap.add_argument("targets", nargs="*", default=["all"])
    ap.add_argument("--name")
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--preset", default="slow")
    ap.add_argument("--max-mb", type=float, default=2.5)
    ap.add_argument("--crf-start", type=int, default=22)
    ap.add_argument("--size", default="960x528")
    ap.add_argument("--aspect", type=float, default=1.82)
    ap.add_argument("--frame", type=int)
    ap.add_argument("--q", type=int, default=80)
    ap.add_argument("--grid", default="4x4")
    ap.add_argument("--thumb", type=int, default=480)
    ap.add_argument("--range")
    ap.add_argument("--preview-fps", type=float, default=15)
    ap.add_argument("--preview-width", type=int, default=640)
    ap.add_argument("--gif", action="store_true")
    a = ap.parse_args()
    targets = ["master", "card", "poster", "sheet", "preview"] if a.targets == ["all"] else a.targets
    report, err = run_targets(os.path.abspath(a.out), targets, vars(a))
    if err:
        print("ERROR", err, file=sys.stderr)
        return 1
    with open(os.path.join(a.out, "encode.json"), "w") as f:
        json.dump(report, f, indent=2, default=str)
    return 0


if __name__ == "__main__":
    sys.exit(main())
