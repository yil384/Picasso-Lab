#!/usr/bin/env python3
"""Persistent authoring studio for one pv scene (CPU WebGL boots are slow: keep one browser warm).

    python3 studio.py ../tritongym.html --width 960 --height 540 --port 8765 &      # start (background)
    curl -s 'localhost:8765/__ctl/snap?frames=0,48,96&tag=v1'                     # -> work/snaps/v1_00048.png ...
    curl -s 'localhost:8765/__ctl/reload'                                          # after editing the scene
    curl -s 'localhost:8765/__ctl/reload?width=1920&height=1080'                   # other size / extra query
    curl -s 'localhost:8765/__ctl/eval?js=window.__pv.timings'                    # debug
    curl -s 'localhost:8765/__ctl/quit'

It serves /pv/* (pipeline) and /scene/* (the scene folder) like pipeline/pvlib.py, and adds
POST /__bake/<key> so the scene can store baked p5.brush textures in <scene dir>/work/bake/<key>.png;
later boots (and render.py) load them instead of re-baking. Snaps are written as PNG (lossless) and a
JPEG copy for looking at.
"""
import argparse
import io
import json
import os
import queue
import re
import sys
import threading
import time
from http.server import ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, urlencode

HERE = os.path.dirname(os.path.abspath(__file__))
PIPE = os.path.normpath(os.path.join(HERE, "..", "..", "..", "pipeline"))
sys.path.insert(0, PIPE)
import pvlib  # noqa: E402
from render import GL_INFO_JS, launch_kwargs  # noqa: E402

JOBS = queue.Queue()


class Handler(pvlib._Handler):
    def do_POST(self):
        u = urlparse(self.path)
        m = re.match(r"^/__bake/([A-Za-z0-9_.-]+)$", u.path)
        if m:
            n = int(self.headers.get("Content-Length", "0"))
            data = self.rfile.read(n)
            d = os.path.join(self.server.scene_dir, "work", "bake")
            os.makedirs(d, exist_ok=True)
            dst = os.path.join(d, m.group(1) + ".png")
            tmp = dst + ".part"
            with open(tmp, "wb") as f:
                f.write(data)
            os.replace(tmp, dst)
            self._send(200, b"ok")
            return
        super().do_POST()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path.startswith("/__ctl/"):
            cmd = u.path[len("/__ctl/"):]
            q = {k: v[0] for k, v in parse_qs(u.query).items()}
            ev, box = threading.Event(), {}
            JOBS.put((cmd, q, ev, box))
            ev.wait(timeout=3600)
            self._send(200, (json.dumps(box.get("res"), indent=1) + "\n").encode(), "application/json")
            return
        super().do_GET()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--width", type=int, default=960)
    ap.add_argument("--height", type=int, default=540)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--gpu", default="swiftshader")
    a = ap.parse_args()
    scene = os.path.abspath(a.scene)
    sdir, sfile = os.path.split(scene)
    snaps = os.path.join(sdir, "work", "snaps")
    os.makedirs(snaps, exist_ok=True)
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    srv.daemon_threads = True
    srv.mounts = [("/pv/", PIPE), ("/scene/", sdir)]
    srv.upload_dirs = {"snap": snaps}
    srv.scene_dir = sdir
    srv.verbose = False
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{a.port}"
    size = {"width": a.width, "height": a.height}
    cur = {"file": sfile}
    extra = {}
    log = []

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(**launch_kwargs(a.gpu))
        page = b.new_page(viewport={"width": 960, "height": 600})
        page.on("pageerror", lambda e: log.append(f"pageerror: {e}"))
        page.on("console", lambda m: log.append(f"console.{m.type}: {m.text[:500]}") if m.type in ("error", "log") else None)

        def boot():
            log.clear()
            q = {"render": "1", **size, **extra}
            t0 = time.time()
            page.goto(f"{base}/scene/{cur['file']}?{urlencode(q)}")
            page.wait_for_function("() => window.__pv && (window.__pv.ready || window.__pv.error)", timeout=900000, polling=200)
            err = page.evaluate("() => window.__pv.error")
            return {"boot_s": round(time.time() - t0, 1), "error": err, "gl": page.evaluate(GL_INFO_JS), "log": log[-30:]}

        print("studio boot", boot(), flush=True)
        print(f"studio ready on {base}", flush=True)
        while True:
            cmd, q, ev, box = JOBS.get()
            try:
                if cmd == "quit":
                    box["res"] = "bye"
                    ev.set()
                    break
                if cmd == "reload":
                    if "file" in q:
                        cur["file"] = q.pop("file")
                    for k in ("width", "height"):
                        if k in q:
                            size[k] = int(q.pop(k))
                    if q:
                        extra.clear()
                        extra.update({k: v for k, v in q.items() if v != ""})
                    box["res"] = boot()
                elif cmd == "snap":
                    frames = [int(x) for x in q.get("frames", "0").split(",") if x != ""]
                    tag = q.get("tag", "s")
                    res = []
                    from PIL import Image
                    for i in frames:
                        t1 = time.time()
                        tm = page.evaluate("([i,u]) => window.__pv.capture(i,u,'png')", [i, f"{base}/__frame/{i}?dir=snap"])
                        src = pvlib.frame_path(snaps, i)
                        dst = os.path.join(snaps, f"{tag}_{i:05d}.png")
                        os.replace(src, dst)
                        Image.open(dst).convert("RGB").save(dst[:-4] + ".jpg", quality=88)
                        res.append({"f": i, "s": round(time.time() - t1, 2), "tm": tm, "png": dst})
                    box["res"] = {"frames": res, "log": log[-20:]}
                elif cmd == "eval":
                    box["res"] = page.evaluate(q.get("js", "1"))
                else:
                    box["res"] = {"error": "unknown command " + cmd}
            except Exception as e:  # noqa: BLE001
                box["res"] = {"error": repr(e)[:3000], "log": log[-20:]}
            ev.set()
        b.close()
    srv.shutdown()


if __name__ == "__main__":
    main()
