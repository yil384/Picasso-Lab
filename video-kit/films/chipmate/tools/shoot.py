#!/usr/bin/env python3
"""Authoring stills: boot the scene once, render frames to JPEG, optionally a labelled contact sheet and a
card-size sheet (centre 1.82:1 crop shrunk to 400 px, like the Projects page card).

    python3 tools/shoot.py 0 96 200 --out work/snaps/a [--width 960 --height 540] [--q 'debug=1']
    python3 tools/shoot.py 0:720:24 --out work/snaps/all --sheet 6 --card
Frame specs: N, A:B (every frame) or A:B:S.
"""
import argparse
import base64
import io
import os
import sys
import time
from urllib.parse import urlencode

HERE = os.path.dirname(os.path.abspath(__file__))
FILM = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(FILM, "..", "..", "pipeline"))
import pvlib  # noqa: E402
from render import launch_kwargs  # noqa: E402

JS = """async ([i, q]) => { const tm = await window.renderFrame(i); return [tm, window.__pv.canvas.toDataURL('image/jpeg', q)]; }"""


def parse_frames(specs):
    out = []
    for s in specs:
        if ":" in s:
            p = [int(x) for x in s.split(":")]
            out += list(range(p[0], p[1], p[2] if len(p) > 2 else 1))
        else:
            out.append(int(s))
    return out


def label(im, text):
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    w = 9 * len(text) + 10
    d.rectangle([0, 0, w, 20], fill=(0, 0, 0))
    d.text((5, 4), text, fill=(255, 255, 255))
    return im


def sheet(paths, frames, fps, cols, thumb, out, card=False):
    from PIL import Image
    ims = []
    for p, f in zip(paths, frames):
        im = Image.open(p).convert("RGB")
        if card:
            w, h = im.size
            ch = round(w / 1.82)
            y0 = (h - ch) // 2
            im = im.crop((0, y0, w, y0 + ch)).resize((400, round(400 / 1.82)), Image.LANCZOS)
        else:
            im = im.resize((thumb, round(thumb * im.size[1] / im.size[0])), Image.LANCZOS)
        ims.append(label(im, f"f{f} {f / fps:.2f}s"))
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    g = 6
    S = Image.new("RGB", (cols * w + (cols + 1) * g, rows * h + (rows + 1) * g), (30, 30, 36))
    for k, im in enumerate(ims):
        S.paste(im, (g + (k % cols) * (w + g), g + (k // cols) * (h + g)))
    S.save(out, quality=88)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frames", nargs="+")
    ap.add_argument("--scene", default=os.path.join(FILM, "chipmate.html"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--prefix", default="f")
    ap.add_argument("--width", type=int, default=960)
    ap.add_argument("--height", type=int, default=540)
    ap.add_argument("--q", default="", help="extra query string, e.g. 'debug=1&cam=...'")
    ap.add_argument("--jpgq", type=float, default=0.9)
    ap.add_argument("--sheet", type=int, default=0, help="contact sheet columns (0 = none)")
    ap.add_argument("--thumb", type=int, default=480)
    ap.add_argument("--card", action="store_true", help="also a card-size (400 px, 1.82:1 crop) sheet")
    ap.add_argument("--timeout", type=int, default=900)
    a = ap.parse_args()
    frames = parse_frames(a.frames)
    scene = os.path.abspath(a.scene)
    sdir, sfile = os.path.split(scene)
    out = os.path.abspath(a.out)
    os.makedirs(out, exist_ok=True)
    (srv, base), err = pvlib.start_server(sdir, {})
    if err:
        print("ERROR", err)
        return 2
    q = {"render": "1", "width": a.width, "height": a.height}
    url = f"{base}/scene/{sfile}?{urlencode(q)}" + (("&" + a.q) if a.q else "")
    from playwright.sync_api import sync_playwright
    paths = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(**launch_kwargs("swiftshader"))
        page = b.new_page(viewport={"width": 960, "height": 600})
        page.on("pageerror", lambda e: print("pageerror:", e, flush=True))
        page.on("console", lambda m: print(f"console.{m.type}:", m.text[:300], flush=True) if m.type in ("error", "warning") and "GL Driver" not in m.text and "willReadFrequently" not in m.text else None)
        t0 = time.time()
        page.goto(url)
        page.wait_for_function("() => window.__pv && (window.__pv.ready || window.__pv.error)", timeout=a.timeout * 1000, polling=200)
        e = page.evaluate("() => window.__pv.error")
        if e:
            print("SCENE ERROR:", e)
            return 1
        fps = page.evaluate("() => window.PV_META.fps")
        print(f"boot {time.time() - t0:.1f}s", flush=True)
        for i in frames:
            t1 = time.time()
            tm, data = page.evaluate(JS, [i, a.jpgq])
            p = os.path.join(out, f"{a.prefix}_{i:04d}.jpg")
            with open(p, "wb") as f:
                f.write(base64.b64decode(data.split(",", 1)[1]))
            paths.append(p)
            print(f"f{i} {time.time() - t1:.2f}s total={tm.get('total')}", flush=True)
        b.close()
    srv.shutdown()
    if a.sheet:
        print("sheet", sheet(paths, frames, fps, a.sheet, a.thumb, os.path.join(out, f"{a.prefix}_sheet.jpg")))
    if a.card:
        print("card", sheet(paths, frames, fps, max(3, a.sheet or 4), 400, os.path.join(out, f"{a.prefix}_card.jpg"), card=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
