#!/usr/bin/env python3
"""Run the pipeline tools (render / snap / nshoot) with a Chromium the installed Playwright can launch.

This VM's Playwright (1.63) expects a headless-shell build that is not installed; the full Chromium 1194 in
/opt/pw-browsers is. This wrapper patches launch_kwargs() to add executable_path (override with $PV_CHROME)
and then runs the tool unchanged:

    python3 tools/pv.py render  yufei.html --out ../../out/yufei_960 --width 960 --height 960 --range 0:30
    python3 tools/pv.py nshoot  yufei.html stills 0 40 80 --out work/st --scale 0.5 --deadline 400
    python3 tools/pv.py snap    yufei.html 0 --repeat 2

The patch is applied at import time, so render.py's spawned worker processes (which re-import this file as
__mp_main__) get it too.
"""
import os
import sys

PIPE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "pipeline")
PIPE = os.path.abspath(PIPE)
sys.path.insert(0, PIPE)
sys.path.insert(0, os.path.join(PIPE, "tools"))

import render  # noqa: E402

_orig = render.launch_kwargs


def launch_kwargs(gpu):
    k = _orig(gpu)
    exe = os.environ.get("PV_CHROME", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    if os.path.exists(exe):
        k["executable_path"] = exe
    return k


render.launch_kwargs = launch_kwargs

if __name__ == "__main__":
    tool = sys.argv[1]
    sys.argv = [tool + ".py"] + sys.argv[2:]
    if tool == "render":
        sys.exit(render.main())
    if tool == "snap":
        import snap
        snap.launch_kwargs = launch_kwargs
        sys.exit(snap.main())
    if tool == "nshoot":
        import nshoot
        nshoot.launch_kwargs = launch_kwargs
        sys.exit(nshoot.main())
    raise SystemExit("tool must be render | snap | nshoot")
