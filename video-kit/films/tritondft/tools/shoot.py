#!/usr/bin/env python3
"""Shoot a pv scene with ONE headless browser on the cloud VM (CPU WebGL / SwiftShader).

Like pipeline/tools/nshoot.py, but made for a slow CPU box: a long boot timeout, several frame lists per boot,
JPEG stills (optionally downscaled / cropped), purity hashes and a card-crop helper. Never writes PNG folders.

  python3 shoot.py SCENE.html stills 0 48 96 --out DIR [--prefix p] [--width 960 --height 540] [--q k=v]
  python3 shoot.py SCENE.html stills --every 24 --out DIR          # every 24th frame of the loop
  python3 shoot.py SCENE.html purity 0 50 13 50 0 --loop            # repeats must match, f N == f 0
  python3 shoot.py SCENE.html time 0 120 --repeat 2
  python3 shoot.py SCENE.html clip --range 0:48 --clip out.mp4 [--vf scale=...]
  python3 shoot.py SCENE.html bake --out work/bake     # paint every p5.brush texture once, save lossless PNGs
                                                       # (the scene loads them instead of re-painting: fast boot)
"""
import argparse
import base64
import io
import os
import statistics
import subprocess
import sys
import time
from urllib.parse import urlencode

PIPE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "pipeline")
sys.path.insert(0, os.path.abspath(PIPE))
import pvlib  # noqa: E402
from render import GL_INFO_JS, launch_kwargs  # noqa: E402

JS_SHOT = """async ([i, fmt, q]) => {
  const tm = await window.renderFrame(i);
  const url = fmt ? window.__pv.canvas.toDataURL(fmt, q) : null;
  return [tm, url];
}"""
JS_HASH = """async (i) => { const tm = await window.renderFrame(i); return [tm, window.__pv.hash()]; }"""


def boot(pw, a):
    scene = os.path.abspath(a.scene)
    sdir, sfile = os.path.split(scene)
    (srv, base), err = pvlib.start_server(sdir, {})
    if err:
        raise SystemExit("server: " + err)
    q = {"render": "1"}
    if a.width:
        q["width"] = a.width
    if a.height:
        q["height"] = a.height
    for kv in a.q:
        k, v = kv.split("=", 1)
        q[k] = v
    url = f"{base}/scene/{sfile}?{urlencode(q)}"
    b = pw.chromium.launch(**launch_kwargs("metal" if sys.platform == "darwin" else "swiftshader"))
    page = b.new_page(viewport={"width": 960, "height": 600})
    page.set_default_timeout(0)
    page.on("pageerror", lambda e: print("pageerror:", e, flush=True))
    page.on("response", lambda r: print("HTTP", r.status, r.url, flush=True) if r.status >= 400 and "favicon" not in r.url else None)
    page.on("console", lambda m: print(f"console.{m.type}:", m.text[:500], flush=True)
            if m.type in ("error", "log") and "favicon" not in m.text else None)
    t0 = time.time()
    page.goto(url)
    page.wait_for_function("() => window.__pv && (window.__pv.ready || window.__pv.error)", timeout=a.boot_timeout * 1000, polling=500)
    e = page.evaluate("() => window.__pv.error")
    if e:
        print("SCENE ERROR:", e, flush=True)
        os._exit(1)
    meta = page.evaluate("() => window.PV_META")
    print(f"boot {time.time() - t0:.1f}s  {meta['W']}x{meta['H']} N={meta['N']} gl={page.evaluate(GL_INFO_JS)}", flush=True)
    return srv, b, page, meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("mode", choices=["stills", "clip", "purity", "time", "bake"])
    ap.add_argument("frames", nargs="*", type=int)
    ap.add_argument("--every", type=int, help="stills: every k-th frame of the loop")
    ap.add_argument("--out", default=".")
    ap.add_argument("--prefix", default="f")
    ap.add_argument("--q", action="append", default=[])
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--range")
    ap.add_argument("--clip")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--quality", type=float, default=0.9)
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--loop", action="store_true")
    ap.add_argument("--vf")
    ap.add_argument("--crf", default="16")
    ap.add_argument("--boot-timeout", type=int, default=1500)
    a = ap.parse_args()
    if a.mode == "bake":
        a.q.append("rebake=1")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        srv, b, page, meta = boot(pw, a)
        try:
            if a.mode == "stills":
                os.makedirs(a.out, exist_ok=True)
                frames = list(a.frames)
                if a.every:
                    frames += list(range(0, meta["N"], a.every))
                for i in frames:
                    t1 = time.time()
                    tm, url = page.evaluate(JS_SHOT, [i, "image/jpeg", a.quality])
                    p = os.path.join(a.out, f"{a.prefix}_{i:04d}.jpg")
                    data = base64.b64decode(url.split(",", 1)[1])
                    if a.scale != 1.0:
                        from PIL import Image
                        im = Image.open(io.BytesIO(data)).convert("RGB")
                        im = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.LANCZOS)
                        im.save(p, quality=90)
                    else:
                        with open(p, "wb") as f:
                            f.write(data)
                    print(f"f{i:04d} {1000 * (time.time() - t1):.0f}ms wall  layers={tm}", flush=True)
            elif a.mode == "clip":
                A, B = (a.range or f"0:{meta['N']}").split(":")
                frames = list(range(int(A), int(B)))
                enc = ["-c:v", "libx264", "-preset", "medium", "-crf", a.crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
                if a.clip.endswith(".mkv"):
                    enc = ["-c:v", "libx264rgb", "-qp", "0", "-preset", "veryfast"]
                cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", str(a.fps),
                       "-c:v", "png", "-i", "-"] + (["-vf", a.vf] if a.vf else []) + enc + [a.clip]
                ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
                ms = []
                t0 = time.time()
                for i in frames:
                    tm, url = page.evaluate(JS_SHOT, [i, "image/png", 1])
                    ff.stdin.write(base64.b64decode(url.split(",", 1)[1]))
                    ms.append(tm["total"])
                    print(f"f{i:04d} {tm['total']}ms", flush=True)
                ff.stdin.close()
                ff.wait()
                print(f"{len(frames)} frames in {time.time() - t0:.1f}s; median {statistics.median(ms):.0f}ms -> {a.clip}", flush=True)
            elif a.mode == "purity":
                seen, ok = {}, True
                seq = list(a.frames) + ([meta["N"], 0] if a.loop else [])
                for i in seq:
                    tm, h = page.evaluate(JS_HASH, i)
                    key = i % meta["N"]
                    st = ""
                    if key in seen:
                        st = "MATCH" if seen[key] == h else "MISMATCH"
                        ok = ok and seen[key] == h
                    seen.setdefault(key, h)
                    print(f"f{i:04d} {h} {st} ({tm['total']}ms)", flush=True)
                print("PURITY OK" if ok else "PURITY FAIL", flush=True)
            elif a.mode == "bake":
                os.makedirs(a.out, exist_ok=True)
                keys = page.evaluate("() => Object.keys(window.__bakes || {})")
                for k in keys:
                    url = page.evaluate("(k) => window.__bakes[k].toDataURL('image/png')", k)
                    p = os.path.join(a.out, f"{k}.png")
                    with open(p, "wb") as f:
                        f.write(base64.b64decode(url.split(",", 1)[1]))
                print(f"baked {len(keys)} textures -> {a.out}", flush=True)
            elif a.mode == "time":
                for i in a.frames or [0]:
                    for _ in range(a.repeat):
                        t1 = time.time()
                        tm, _u = page.evaluate(JS_SHOT, [i, None, 1])
                        print(f"f{i:04d} {1000 * (time.time() - t1):.0f}ms wall {tm}", flush=True)
        finally:
            b.close()
            srv.shutdown()
    os._exit(0)


if __name__ == "__main__":
    main()
