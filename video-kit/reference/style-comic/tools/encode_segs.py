#!/usr/bin/env python3
"""Encode deliverables straight from render.py's lossless segments (OUT/segments/seg_*.mkv).

pipeline/encode.py only reads PNG frames; render.py --store segments leaves bit-exact x264rgb segments instead.

    python3 encode_segs.py OUT master  NAME [--crf 18 --preset slow]
    python3 encode_segs.py OUT cardsrc NAME                      # once: 960x528 lossless intermediate
    python3 encode_segs.py OUT card    NAME [--max-mb 2.5 --crf-start 30]
    python3 encode_segs.py OUT poster  NAME --frame 300
    python3 encode_segs.py OUT sheet   NAME [--grid 4 --thumb 480]
    python3 encode_segs.py OUT still   NAME --frame K [--jpg path]

Master: 1920x1080, H.264 High, yuv420p, bt709 tagged, +faststart, no audio (same args as pipeline/encode.py).
Card: centre crop to 1.82:1, lanczos to 960x528, lowest CRF >= crf-start that fits --max-mb.
Every function returns (value, None) on success or (None, "error") on failure.
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
CARD_VF = ("crop='min(iw,trunc(ih*1.82/2)*2)':'min(ih,trunc(iw/1.82/2)*2)',"
           "scale=960:528:flags=lanczos+accurate_rnd+full_chroma_int,hqdn3d=1.2:1.2:4:4," + TO_YUV)
# (hqdn3d: the card is shown at ~400 px, where per-frame film grain is invisible but costs most of the bits)


def concat_list(out_dir):
    """Write OUT/segments/list.txt in frame order. Returns (path, None) or (None, err)."""
    segs = sorted(glob.glob(os.path.join(out_dir, "segments", "seg_*.mkv")))
    if not segs:
        return None, "no segments in " + out_dir
    spans = [tuple(int(x) for x in os.path.basename(s)[4:-4].split("_")) for s in segs]
    for (a0, b0), (a1, _) in zip(spans, spans[1:]):
        if b0 != a1:
            return None, f"gap between segments at frame {b0}..{a1}"
    if spans[0][0] != 0:
        return None, "first segment does not start at frame 0"
    p = os.path.join(out_dir, "segments", "list.txt")
    with open(p, "w") as f:
        for s in segs:
            f.write(f"file '{os.path.abspath(s)}'\n")
    return (p, spans[-1][1]), None


def ffmpeg(args, label):
    """Run ffmpeg with -progress on stdout so long encodes print progress. Returns (True, None) or (None, err)."""
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-progress", "pipe:1", "-nostats"] + args
    t0 = time.time()
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    last = 0
    for line in p.stdout:
        if line.startswith("frame=") and time.time() - last > 5:
            last = time.time()
            print(f"[{label}] {line.strip()}  {time.time() - t0:.0f}s", flush=True)
    rc = p.wait()
    if rc != 0:
        return None, f"ffmpeg failed ({rc}): {p.stderr.read()[-1500:]}"
    return True, None


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries",
                        "stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,color_space",
                        "-show_entries", "format=duration,size,bit_rate", "-of", "json", path],
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None, r.stderr
    d = json.loads(r.stdout)
    s, f = d["streams"][0], d["format"]
    return {"codec": s["codec_name"], "profile": s.get("profile"), "size": f"{s['width']}x{s['height']}",
            "pix_fmt": s["pix_fmt"], "fps": s["r_frame_rate"], "frames": int(s.get("nb_read_frames", 0)),
            "duration": float(f["duration"]), "bytes": int(f["size"]), "color_space": s.get("color_space")}, None


def encode_master(out_dir, name, crf, preset):
    (lst, n), err = concat_list(out_dir)
    if err:
        return None, err
    out = os.path.join(out_dir, f"{name}_master.mp4")
    ok, err = ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-vf", TO_YUV, "-c:v", "libx264", "-profile:v", "high",
                      "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", *BT709, "-movflags", "+faststart",
                      "-an", out], "master")
    if err:
        return None, err
    return probe(out)


def card_source(out_dir):
    """Decode the 1080p lossless segments once into a 960x528 lossless card intermediate (crop 1.82:1, lanczos).
    Returns (path, None) or (None, err)."""
    (lst, n), err = concat_list(out_dir)
    if err:
        return None, err
    src = os.path.join(out_dir, "card_src_lossless.mkv")
    vf = CARD_VF.split(",hqdn3d")[0]
    ok, err = ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-vf", vf, "-c:v", "libx264rgb", "-qp", "0",
                      "-preset", "ultrafast", src], "cardsrc")
    return (src, None) if ok else (None, err)


def encode_card(out_dir, name, max_mb, crf_start):
    """CRF search on the card intermediate (veryslow; light hqdn3d: grain is invisible at ~400 px)."""
    src = os.path.join(out_dir, "card_src_lossless.mkv")
    if not os.path.exists(src):
        return None, "run the cardsrc target first"
    out = os.path.join(out_dir, f"{name}_loop.mp4")
    vf = "hqdn3d=1.2:1.2:4:4," + TO_YUV
    crf = crf_start
    for _ in range(8):
        ok, err = ffmpeg(["-i", src, "-vf", vf, "-c:v", "libx264", "-profile:v", "high", "-preset", "veryslow",
                          "-crf", str(crf), "-pix_fmt", "yuv420p", *BT709, "-movflags", "+faststart", "-an", out],
                         f"card crf{crf}")
        if err:
            return None, err
        mb = os.path.getsize(out) / 1e6
        print(f"[card] crf {crf}: {mb:.2f} MB", flush=True)
        if mb <= max_mb:
            info, err = probe(out)
            if err:
                return None, err
            info["crf"] = crf
            return info, None
        crf += 1
    return None, "card did not fit the size budget"


def grab(out_dir, frame, vf, dst, extra=()):
    """Extract one frame (exact index) through filter vf into dst. Returns (dst, None) or (None, err)."""
    (lst, n), err = concat_list(out_dir)
    if err:
        return None, err
    ok, err = ffmpeg(["-f", "concat", "-safe", "0", "-i", lst, "-vf", f"select=eq(n\\,{frame})," + vf,
                      "-frames:v", "1", *extra, dst], "grab")
    return (dst, None) if ok else (None, err)


def frames_png(src, idx):
    """Decode exact frame indices from a video into PIL images (PNG over a pipe). Returns ([img], None) or (None, err)."""
    from io import BytesIO
    from PIL import Image
    sel = "+".join(f"eq(n\\,{i})" for i in idx)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", src, "-vf", f"select='{sel}'",
                        "-vsync", "0", "-f", "image2pipe", "-c:v", "png", "-"], capture_output=True)
    if r.returncode != 0:
        return None, r.stderr.decode()[-1500:]
    data, out, pos = r.stdout, [], 0
    sig = b"\x89PNG\r\n\x1a\n"
    starts = [k for k in range(len(data)) if data.startswith(sig, k)] if len(idx) > 1 else [0]
    starts.append(len(data))
    for k0, k1 in zip(starts, starts[1:]):
        out.append(Image.open(BytesIO(data[k0:k1])).convert("RGB"))
    if len(out) != len(idx):
        return None, f"expected {len(idx)} frames, decoded {len(out)}"
    return out, None


def encode_poster(out_dir, name, frame):
    """Poster = exact frame from the (pre-denoise) lossless card intermediate, WebP q80 via PIL."""
    src = os.path.join(out_dir, "card_src_lossless.mkv")
    ims, err = frames_png(src, [frame])
    if err:
        return None, err
    dst = os.path.join(out_dir, f"{name}_poster.webp")
    ims[0].save(dst, "WEBP", quality=80, method=6)
    return dst, None


def encode_sheet(out_dir, name, grid, thumb):
    """grid x grid contact sheet of evenly spaced master frames, labelled with frame and seconds (JPEG)."""
    from PIL import Image, ImageDraw
    master = os.path.join(out_dir, f"{name}_master.mp4")
    info, err = probe(master)
    if err:
        return None, err
    n, k = info["frames"], grid * grid
    idx = [round(i * n / k) for i in range(k)]
    ims, err = frames_png(master, idx)
    if err:
        return None, err
    th, pad = round(thumb * 9 / 16), 6
    sheet = Image.new("RGB", (grid * (thumb + pad) + pad, grid * (th + pad) + pad), (24, 22, 30))
    d = ImageDraw.Draw(sheet)
    for j, (f, im) in enumerate(zip(idx, ims)):
        x, y = pad + (j % grid) * (thumb + pad), pad + (j // grid) * (th + pad)
        sheet.paste(im.resize((thumb, th), Image.LANCZOS), (x, y))
        lab = f"f{f}  {f / 24:.2f}s"
        d.rectangle([x, y, x + 8 + 7 * len(lab), y + 16], fill=(0, 0, 0))
        d.text((x + 4, y + 2), lab, fill=(255, 255, 255))
    dst = os.path.join(out_dir, f"{name}_sheet.jpg")
    sheet.save(dst, quality=88)
    return dst, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("target", choices=["master", "cardsrc", "card", "poster", "sheet", "still"])
    ap.add_argument("name")
    ap.add_argument("--crf", type=int, default=18)
    ap.add_argument("--preset", default="slow")
    ap.add_argument("--max-mb", type=float, default=2.5)
    ap.add_argument("--crf-start", type=int, default=22)
    ap.add_argument("--frame", type=int, default=0)
    ap.add_argument("--grid", type=int, default=4)
    ap.add_argument("--thumb", type=int, default=480)
    ap.add_argument("--jpg")
    a = ap.parse_args()
    if a.target == "master":
        res, err = encode_master(a.out, a.name, a.crf, a.preset)
    elif a.target == "cardsrc":
        res, err = card_source(a.out)
    elif a.target == "card":
        res, err = encode_card(a.out, a.name, a.max_mb, a.crf_start)
    elif a.target == "poster":
        res, err = encode_poster(a.out, a.name, a.frame)
    elif a.target == "sheet":
        res, err = encode_sheet(a.out, a.name, a.grid, a.thumb)
    else:
        res, err = grab(a.out, a.frame, "null", a.jpg or os.path.join(a.out, f"{a.name}_f{a.frame:04d}.jpg"), ["-q:v", "2"])
    if err:
        print("ERROR", err, flush=True)
        sys.exit(1)
    print("OK", res, flush=True)


if __name__ == "__main__":
    main()
