#!/usr/bin/env python3
"""Serve a scene for interactive preview in a normal browser (play/pause, scrub, arrow keys).

    python3 serve.py SCENE.html [--port 8765] [--width 960 --height 540]

Open the printed URL. Without ?render=1 the runtime shows a scrubber; frames are still drawn by
the same pure renderFrame(i), so what you scrub is exactly what render.py will produce.
"""
import argparse
import os
import sys
import time
from urllib.parse import urlencode

import pvlib


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene")
    ap.add_argument("--width", type=int)
    ap.add_argument("--height", type=int)
    ap.add_argument("--seed", type=int)
    a = ap.parse_args()
    scene = os.path.abspath(a.scene)
    sdir, sfile = os.path.split(scene)
    (srv, base), err = pvlib.start_server(sdir)
    if err:
        print("ERROR", err)
        return 2
    q = {k: getattr(a, k) for k in ("width", "height", "seed") if getattr(a, k) is not None}
    print(f"{base}/scene/{sfile}" + (f"?{urlencode(q)}" if q else ""), flush=True)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        srv.shutdown()
    return 0


if __name__ == "__main__":
    sys.exit(main())
