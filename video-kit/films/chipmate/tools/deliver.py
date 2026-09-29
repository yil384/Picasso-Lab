#!/usr/bin/env python3
"""Encode the ChipMATE deliverables from render.py's lossless segments (adapted from
reference/style-comic/tools/encode_segs.py).

    python3 tools/deliver.py RENDER_OUT DEST all --poster 648
    python3 tools/deliver.py RENDER_OUT DEST master|cardsrc|card|poster|sheet|seam

master : 1920x1080 (the render size), H.264 High, yuv420p, CRF 18 (raised if > --master-mb), bt709, +faststart
card   : centre 1.82:1 crop, lanczos 960x528, H.264 High yuv420p +faststart, lowest CRF >= --crf-start that fits
         --max-mb; the loop is rotated to start on the poster frame (the file's first frame == the poster)
poster : 960x528 WebP of the poster frame (same crop)
sheet  : contact sheet at 1 frame per second, labelled
seam   : strip of the last 6 + first 6 frames (loop seam check) + mean abs frame differences
Functions return (value, None) or (None, "error").
"""
import argparse
import glob
import json
import os
import subprocess
import sys
import time

BT709 = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"]
TO_YUV = "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p"
CROP = ("crop='min(iw,trunc(ih*1.82/2)*2)':'min(ih,trunc(iw/1.82/2)*2)',"
        "scale=960:528:flags=lanczos+accurate_rnd+full_chroma_int")


def concat_list(src):
    segs = sorted(glob.glob(os.path.join(src, "segments", "seg_*.mkv")))
    if not segs:
        return None, "no segments in " + src
    spans = [tuple(int(x) for x in os.path.basename(s)[4:-4].split("_")) for s in segs]
    for (a0, b0), (a1, _) in zip(spans, spans[1:]):
        if b0 != a1:
            return None, f"gap between segments at frame {b0}..{a1}"
    if spans[0][0] != 0:
        return None, "first segment does not start at frame 0"
    p = os.path.join(src, "segments", "list.txt")
    with open(p, "w") as f:
        for s in segs:
            f.write(f"file '{os.path.abspath(s)}'\n")
    return (p, spans[-1][1]), None


def ffmpeg(args, label):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-progress", "pipe:1", "-nostats"] + args
    t0, last = time.time(), 0
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    for line in p.stdout:
        if line.startswith("frame=") and time.time() - last > 10:
            last = time.time()
            print(f"[{label}] {line.strip()}  {time.time() - t0:.0f}s", flush=True)
    if p.wait() != 0:
        return None, f"ffmpeg failed: {p.stderr.read()[-1500:]}"
    return True, None


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries",
                        "stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,color_space",
                        "-show_entries", "format=duration,size", "-of", "json", path], capture_output=True, text=True)
    if r.returncode != 0:
        return None, r.stderr
    d = json.loads(r.stdout)
    s, f = d["streams"][0], d["format"]
    return {"file": os.path.basename(path), "codec": s["codec_name"], "profile": s.get("profile"), "size": f"{s['width']}x{s['height']}",
            "pix_fmt": s["pix_fmt"], "fps": s["r_frame_rate"], "frames": int(s.get("nb_read_frames", 0)),
            "duration": float(f["duration"]), "MB": round(int(f["size"]) / 1e6, 2), "color_space": s.get("color_space")}, None


def master(src, dst, crf, max_mb):
    (lst, n), err = concat_list(src)
    if err:
        return None, err
    out = os.path.join(dst, "chipmate_master.mp4")
    for c in range(crf, crf + 6):
        ok, err = ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-vf", TO_YUV, "-c:v", "libx264", "-profile:v", "high",
                          "-preset", "slow", "-crf", str(c), "-pix_fmt", "yuv420p", *BT709, "-movflags", "+faststart", "-an", out], f"master crf{c}")
        if err:
            return None, err
        mb = os.path.getsize(out) / 1e6
        print(f"[master] crf {c}: {mb:.1f} MB", flush=True)
        if mb <= max_mb:
            info, err = probe(out)
            if info:
                info["crf"] = c
            return info, err
    return None, "master over budget"


def cardsrc(src, work):
    (lst, n), err = concat_list(src)
    if err:
        return None, err
    out = os.path.join(work, "card_src_lossless.mkv")
    ok, err = ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-vf", CROP, "-c:v", "libx264rgb", "-qp", "0", "-preset", "ultrafast", out], "cardsrc")
    return (out, None) if ok else (None, err)


def card(work, dst, poster, max_mb, crf_start):
    src = os.path.join(work, "card_src_lossless.mkv")
    if not os.path.exists(src):
        return None, "run cardsrc first"
    out = os.path.join(dst, "chipmate_loop.mp4")
    # rotate: [poster .. N-1] + [0 .. poster-1] (the loop is seamless, so the rotation is too)
    fc = (f"[0:v]split[a][b];[a]trim=start_frame={poster},setpts=PTS-STARTPTS[x];[b]trim=end_frame={poster},setpts=PTS-STARTPTS[y];"
          f"[x][y]concat=n=2:v=1:a=0,hqdn3d=1.2:1.2:4:4,{TO_YUV}[v]")
    crf = crf_start
    for _ in range(10):
        ok, err = ffmpeg(["-i", src, "-filter_complex", fc, "-map", "[v]", "-c:v", "libx264", "-profile:v", "high", "-preset", "veryslow",
                          "-crf", str(crf), "-pix_fmt", "yuv420p", *BT709, "-movflags", "+faststart", "-an", out], f"card crf{crf}")
        if err:
            return None, err
        mb = os.path.getsize(out) / 1e6
        print(f"[card] crf {crf}: {mb:.2f} MB", flush=True)
        if mb <= max_mb:
            info, err = probe(out)
            if info:
                info["crf"] = crf
                info["starts_at_frame"] = poster
            return info, err
        crf += 1
    return None, "card over budget"


def frames_png(src, idx):
    from io import BytesIO
    from PIL import Image
    sel = "+".join(f"eq(n\\,{i})" for i in idx)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", f"select='{sel}'", "-vsync", "0",
                        "-f", "image2pipe", "-c:v", "png", "-"], capture_output=True)
    if r.returncode != 0:
        return None, r.stderr.decode()[-1500:]
    data, sig = r.stdout, b"\x89PNG\r\n\x1a\n"
    starts, k = [], data.find(sig)
    while k >= 0:
        starts.append(k)
        k = data.find(sig, k + 8)
    starts.append(len(data))
    ims = [Image.open(BytesIO(data[a:b])).convert("RGB") for a, b in zip(starts, starts[1:])]
    if len(ims) != len(idx):
        return None, f"expected {len(idx)} frames, decoded {len(ims)}"
    by = dict(zip(sorted(set(idx)), ims))
    return [by[i] for i in idx], None


def poster(work, dst, frame):
    ims, err = frames_png(os.path.join(work, "card_src_lossless.mkv"), [frame])
    if err:
        return None, err
    out = os.path.join(dst, "chipmate_poster.webp")
    ims[0].save(out, "WEBP", quality=82, method=6)
    return out, None


def sheet(src_video, dst, fps=24, cols=6, thumb=480, name="chipmate_sheet.jpg", every=24, frames=None):
    from PIL import Image, ImageDraw
    info, err = probe(src_video)
    if err:
        return None, err
    idx = frames or list(range(0, info["frames"], every))
    ims, err = frames_png(src_video, idx)
    if err:
        return None, err
    w0, h0 = ims[0].size
    th, pad = round(thumb * h0 / w0), 6
    rows = (len(idx) + cols - 1) // cols
    S = Image.new("RGB", (cols * (thumb + pad) + pad, rows * (th + pad) + pad), (24, 22, 30))
    d = ImageDraw.Draw(S)
    for j, (f, im) in enumerate(zip(idx, ims)):
        x, y = pad + (j % cols) * (thumb + pad), pad + (j // cols) * (th + pad)
        S.paste(im.resize((thumb, th), Image.LANCZOS), (x, y))
        lab = f"f{f}  {f / fps:.2f}s"
        d.rectangle([x, y, x + 8 + 7 * len(lab), y + 16], fill=(0, 0, 0))
        d.text((x + 4, y + 2), lab, fill=(255, 255, 255))
    out = os.path.join(dst, name)
    S.save(out, quality=88)
    return out, None


def seam(src_video, dst, n):
    from PIL import ImageChops, ImageStat
    idx = list(range(n - 6, n)) + list(range(0, 6))
    ims, err = frames_png(src_video, idx)
    if err:
        return None, err
    diffs = [sum(ImageStat.Stat(ImageChops.difference(ims[k + 1], ims[k])).mean) / 3 for k in range(len(ims) - 1)]
    out, err = sheet(src_video, dst, cols=6, thumb=320, name="seam_strip.jpg", frames=idx)
    return {"strip": out, "adjacent_mean_abs_diff": [round(x, 2) for x in diffs], "seam_pair": f"{n - 1}->0 = {diffs[5]:.2f}"}, err


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("targets", nargs="+")
    ap.add_argument("--poster", type=int, default=648)
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--master-mb", type=float, default=70)
    ap.add_argument("--max-mb", type=float, default=4.0)
    ap.add_argument("--crf-start", type=int, default=23)
    ap.add_argument("--work", default=None)
    a = ap.parse_args()
    os.makedirs(a.dst, exist_ok=True)
    work = a.work or a.src
    targets = ["master", "cardsrc", "card", "poster", "sheet", "seam"] if a.targets == ["all"] else a.targets
    res = {}
    for t in targets:
        if t == "master":
            r, err = master(a.src, a.dst, a.crf, a.master_mb)
        elif t == "cardsrc":
            r, err = cardsrc(a.src, work)
        elif t == "card":
            r, err = card(work, a.dst, a.poster, a.max_mb, a.crf_start)
        elif t == "poster":
            r, err = poster(work, a.dst, a.poster)
        elif t == "sheet":
            r, err = sheet(os.path.join(a.dst, "chipmate_master.mp4"), a.dst)
        elif t == "seam":
            m = os.path.join(a.dst, "chipmate_master.mp4")
            info, err = probe(m)
            r, err = (seam(m, work, info["frames"]) if info else (None, err))
        else:
            r, err = None, "unknown target " + t
        if err:
            print("ERROR", t, err, flush=True)
            sys.exit(1)
        res[t] = r
        print("OK", t, r, flush=True)
    with open(os.path.join(work, "deliver.json"), "w") as f:
        json.dump(res, f, indent=2)


if __name__ == "__main__":
    main()
