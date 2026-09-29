#!/usr/bin/env python3
"""Bake every p5.brush texture of the scene once into films/chipmate/work/tex/<key>-<hash>.png.

    python3 tools/bake.py [--scene chipmate.html]

The scene paints its textures with ?bake=1 and exposes them as data URLs; normal boots then load the PNGs
instead of repainting (painting ~70 textures takes minutes on CPU WebGL). File names carry a hash of the
painter source, so a changed painter simply produces a new file (stale files are removed).
"""
import argparse
import base64
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(FILM, "..", "..", "pipeline"))
import pvlib  # noqa: E402
from render import launch_kwargs  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scene", default=os.path.join(FILM, "chipmate.html"))
    ap.add_argument("--timeout", type=int, default=1500)
    a = ap.parse_args()
    scene = os.path.abspath(a.scene)
    sdir, sfile = os.path.split(scene)
    out = os.path.join(FILM, "work", "tex")
    os.makedirs(out, exist_ok=True)
    (srv, base), err = pvlib.start_server(sdir, {})
    if err:
        print("ERROR", err)
        return 2
    from playwright.sync_api import sync_playwright
    t0 = time.time()
    with sync_playwright() as pw:
        b = pw.chromium.launch(**launch_kwargs("swiftshader"))
        page = b.new_page(viewport={"width": 960, "height": 600})
        page.on("pageerror", lambda e: print("pageerror:", e, flush=True))
        page.on("console", lambda m: print(f"console.{m.type}:", m.text[:300], flush=True) if m.type in ("error",) else None)
        page.goto(f"{base}/scene/{sfile}?render=1&bake=1&width=960&height=540")
        page.wait_for_function("() => window.__bakeDone || (window.__pv && window.__pv.error)", timeout=a.timeout * 1000, polling=500)
        e = page.evaluate("() => window.__bakeDone ? null : window.__pv.error")
        if e:
            print("SCENE ERROR:", e)
            return 1
        n = page.evaluate("() => window.__bakeOut.length")
        names = set()
        for i in range(n):
            name, url = page.evaluate(f"() => [window.__bakeOut[{i}].name, window.__bakeOut[{i}].url]")
            data = base64.b64decode(url.split(",", 1)[1])
            with open(os.path.join(out, name + ".png"), "wb") as f:
                f.write(data)
            names.add(name + ".png")
        b.close()
    srv.shutdown()
    stale = [f for f in os.listdir(out) if f.endswith(".png") and f not in names]
    for f in stale:
        os.remove(os.path.join(out, f))
    print(f"baked {n} textures in {time.time() - t0:.0f}s -> {out} (removed {len(stale)} stale)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
