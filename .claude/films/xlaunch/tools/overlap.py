#!/usr/bin/env python3
"""Interpenetration check of the desk set: runs window.__deskCheck(f) (film10.html) at the given OLD-timeline frames
(the round-8 splice maps film frames to old ones; desk shots are old 0-362 and 1710-1829). Every pair of flat things
(clippings, sticky notes, pen, bill, page) whose height order flips inside their overlap is reported; 'clean' = none.
usage: python3 tools/overlap.py [frames...]   (needs ~/vk/video-kit/pipeline and the film dir, see tools/restore_workdir.sh)"""
import sys, os
sys.path.insert(0, os.path.expanduser('~/vk/video-kit/pipeline')); import pvlib
from playwright.sync_api import sync_playwright
frames = [int(x) for x in sys.argv[1:]] or [30, 52, 75, 96, 120, 141, 160, 180, 195, 220, 239, 270, 300, 345, 362, 1740, 1800]
(srv, base), err = pvlib.start_server(os.path.expanduser('~/vk/video-kit/films/xfilm'), {})
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(); pg.goto(f'{base}/scene/film10.html?render=1&width=216&height=270')
    pg.wait_for_function('window.__pv && (window.__pv.ready || window.__pv.error)', timeout=240000)
    for f in frames: print(f, pg.evaluate(f'window.__deskCheck({f})'))
    b.close()
