#!/usr/bin/env python3
"""Shoot a pv scene with one headless browser (Metal): JPEG stills, a clip streamed into ffmpeg,
purity/loop hash checks and ms/frame. Never writes PNG folders.

  python3 nshoot.py SCENE.html stills 0 36 71 --out DIR [--prefix p] [--q look=comic] [--width 960 --height 540]
  python3 nshoot.py SCENE.html clip --range 0:72 --clip out.mp4 [--q ...]      # H.264 (crf 16) via image2pipe
  python3 nshoot.py SCENE.html seg --range 0:36 --clip part0.mkv               # lossless chunk (concat later)
  python3 nshoot.py SCENE.html purity 0 50 13 50 0 --loop                       # hashes; repeats must match
  python3 nshoot.py SCENE.html time 0 --repeat 5                                # ms/frame
Prints progress lines for every frame.
"""
import argparse
import base64
import os
import statistics
import subprocess
import sys
import time
from urllib.parse import urlencode

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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
    page.on("pageerror", lambda e: print("pageerror:", e, flush=True))
    page.on("response", lambda r: print("HTTP", r.status, r.url, flush=True) if r.status >= 400 else None)
    page.on("console", lambda m: print(f"console.{m.type}:", m.text[:500], flush=True)
            if m.type in ("error", "warning", "log") and "favicon" not in m.text else None)
    t0 = time.time()
    page.goto(url)
    page.wait_for_function("() => window.__pv && (window.__pv.ready || window.__pv.error)", timeout=80000, polling=100)
    e = page.evaluate("() => window.__pv.error")
    if e:
        print("SCENE ERROR:", e, flush=True)
        os._exit(1)
    meta = page.evaluate("() => window.PV_META")
    print(f"boot {time.time() - t0:.2f}s  {meta['W']}x{meta['H']} N={meta['N']} gl={page.evaluate(GL_INFO_JS)}", flush=True)
    return srv, b, page, meta


def rng(s, meta):
    if not s:
        return list(range(meta["N"]))
    A, B = s.split(":")
    return list(range(int(A), int(B)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("mode", choices=["stills", "clip", "seg", "purity", "time"])
    ap.add_argument("frames", nargs="*", type=int)
    ap.add_argument("--out", default=".")
    ap.add_argument("--prefix", default="f")
    ap.add_argument("--q", action="append", default=[])
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--range")
    ap.add_argument("--clip")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--quality", type=float, default=0.92)
    ap.add_argument("--scale", type=float, default=1.0, help="downscale stills (PIL lanczos)")
    ap.add_argument("--crop", help="x,y,w,h crop (output px) for stills, applied before --scale")
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--loop", action="store_true")
    ap.add_argument("--vf", help="ffmpeg -vf filter for clip/seg (e.g. scale=960:540:flags=lanczos)")
    ap.add_argument("--crf", default="16")
    ap.add_argument("--deadline", type=float, default=92, help="hard wall-clock limit (s)")
    a = ap.parse_args()
    import threading

    def _kill():
        print(f"DEADLINE {a.deadline}s hit - exiting", flush=True)
        os._exit(3)
    threading.Timer(a.deadline, _kill).start() if a.deadline > 0 else None
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        srv, b, page, meta = boot(pw, a)
        try:
            if a.mode == "stills":
                os.makedirs(a.out, exist_ok=True)
                for i in a.frames:
                    t1 = time.time()
                    tm, url = page.evaluate(JS_SHOT, [i, "image/jpeg", a.quality])
                    p = os.path.join(a.out, f"{a.prefix}_{i:04d}.jpg")
                    data = base64.b64decode(url.split(",", 1)[1])
                    if a.scale != 1.0 or a.crop:
                        import io
                        from PIL import Image
                        im = Image.open(io.BytesIO(data)).convert("RGB")
                        if a.crop:
                            x, y, w, h = [int(v) for v in a.crop.split(",")]
                            im = im.crop((x, y, x + w, y + h))
                        if a.scale != 1.0:
                            im = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.LANCZOS)
                        im.save(p, quality=90)
                    else:
                        with open(p, "wb") as f:
                            f.write(data)
                    print(f"f{i:04d} {1000 * (time.time() - t1):.0f}ms wall  layers={tm}  -> {p}", flush=True)
            elif a.mode in ("clip", "seg"):
                frames = rng(a.range, meta)
                W, H = meta["W"], meta["H"]
                if a.mode == "clip":
                    enc = ["-c:v", "libx264", "-preset", "slow", "-crf", a.crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
                else:
                    enc = ["-c:v", "libx264rgb", "-qp", "0", "-preset", "veryfast"]
                cmd = ["ffmpeg", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", str(a.fps),
                       "-c:v", "png", "-i", "-"] + (["-vf", a.vf] if a.vf else []) + enc + [a.clip]
                ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
                ms = []
                t0 = time.time()
                for i in frames:
                    t1 = time.time()
                    tm, url = page.evaluate(JS_SHOT, [i, "image/png", 1])
                    ff.stdin.write(base64.b64decode(url.split(",", 1)[1]))
                    ms.append(tm["total"])
                    print(f"f{i:04d} render {tm['total']}ms wall {1000 * (time.time() - t1):.0f}ms {tm}", flush=True)
                ff.stdin.close()
                ff.wait()
                print(f"{len(frames)} frames {W}x{H} in {time.time() - t0:.1f}s; render ms/frame median "
                      f"{statistics.median(ms):.1f} mean {statistics.mean(ms):.1f} max {max(ms):.1f} -> {a.clip}", flush=True)
            elif a.mode == "purity":
                seen = {}
                ok = True
                seq = list(a.frames)
                if a.loop:
                    seq += [meta["N"], 0]
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
            elif a.mode == "time":
                for i in a.frames or [0]:
                    for _ in range(a.repeat):
                        tm, _u = page.evaluate(JS_SHOT, [i, None, 1])
                        print(f"f{i:04d} {tm}", flush=True)
        finally:
            b.close()
            srv.shutdown()
    os._exit(0)


if __name__ == "__main__":
    main()
