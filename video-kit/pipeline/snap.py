#!/usr/bin/env python3
"""Quick look while authoring: render a few frames of a scene to PNGs (single browser, no manifest).

    python3 snap.py SCENE.html 0 45 89 --out /tmp/snaps [--width 960 --height 540] [--gpu swiftshader]
    python3 snap.py SCENE.html 0 --repeat 3     # time the same frame several times

Prints per-layer timings and any console errors from the page.
"""
import argparse
import os
import sys
import time
from urllib.parse import urlencode

import pvlib
from render import GL_INFO_JS, launch_kwargs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("frames", nargs="*", type=int, default=[0])
    ap.add_argument("--out", default=None)
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--seed", type=int)
    ap.add_argument("--gpu", choices=["metal", "swiftshader"], default="metal" if sys.platform == "darwin" else "swiftshader")
    ap.add_argument("--repeat", type=int, default=1)
    a = ap.parse_args()
    scene = os.path.abspath(a.scene)
    sdir, sfile = os.path.split(scene)
    out = os.path.abspath(a.out or os.path.join(sdir, "_snaps"))
    os.makedirs(out, exist_ok=True)
    (srv, base), err = pvlib.start_server(sdir, {"snap": out})
    if err:
        print("ERROR", err)
        return 2
    q = {"render": "1"}
    for k in ("width", "height", "seed"):
        if getattr(a, k) is not None:
            q[k] = getattr(a, k)
    url = f"{base}/scene/{sfile}?{urlencode(q)}"
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch(**launch_kwargs(a.gpu))
        page = b.new_page(viewport={"width": 960, "height": 600})
        page.on("pageerror", lambda e: print("pageerror:", e))
        page.on("console", lambda m: print(f"console.{m.type}:", m.text[:400]) if m.type in ("error", "warning", "log") else None)
        t0 = time.time()
        page.goto(url)
        page.wait_for_function("() => window.__pv && (window.__pv.ready || window.__pv.error)", timeout=int(__import__("os").environ.get("PV_READY_MS", "240000")), polling=100)
        e = page.evaluate("() => window.__pv.error")
        if e:
            print("SCENE ERROR:", e)
            return 1
        print(f"boot {time.time() - t0:.2f}s  gl={page.evaluate(GL_INFO_JS)}")
        for i in a.frames:
            for r in range(a.repeat):
                t1 = time.time()
                tm = page.evaluate("([i,u]) => window.__pv.capture(i,u,'png')", [i, f"{base}/__frame/{i}?dir=snap"])
                print(f"f{i:05d} {time.time() - t1:.2f}s {tm}")
            print("  ->", pvlib.frame_path(out, i))
        b.close()
    srv.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
