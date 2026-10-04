#!/usr/bin/python3
"""Render a few frames of an edu scene to PNG on this Mac's GPU (headless Chromium, ANGLE/Metal).

    python3 .claude/films/edu/tools/snap.py look/look.html 0 1 2 --out DIR [--width 1080 --height 1920] [--q lang=zh]

URL map (nothing is fetched from the network):
  /pv/*     .claude/films/xlaunch/kit/assets/pv      runtime, vendored three/p5/p5.brush, Latin fonts
  /scene/*  .claude/films/xlaunch/scene              the launch film's studio, sprite, props, type modules
            (/scene/cut, /scene/pages, /scene/photos come from xlaunch/kit/assets)
  /edu/*    .claude/films/edu                        this series
"""
import argparse, base64, functools, http.server, os, socketserver, sys, threading, time

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
XL = os.path.join(REPO, '.claude/films/xlaunch')
EDU = os.path.join(REPO, '.claude/films/edu')
MAP = [('/scene/cut/', f'{XL}/kit/assets/cut/'), ('/scene/pages/', f'{XL}/kit/assets/pages/'),
       ('/scene/photos/', f'{XL}/kit/assets/photos/'), ('/pv/', f'{XL}/kit/assets/pv/'),
       ('/scene/', f'{XL}/scene/'), ('/edu/', f'{EDU}/')]


class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = path.split('?', 1)[0].split('#', 1)[0]
        for pre, d in MAP:
            if p.startswith(pre):
                return os.path.join(d, p[len(pre):])
        return os.path.join(EDU, p.lstrip('/'))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass


def render(scene, frames, out, width=1080, height=1920, q=()):
    """Render frames of an edu scene to PNG. Returns (list of files, None) or (None, 'error')."""
    try:
        os.makedirs(out, exist_ok=True)
        srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), H)
        srv.daemon_threads = True
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        port = srv.server_address[1]
        url = f'http://127.0.0.1:{port}/edu/{scene}?' + '&'.join([f'width={width}', f'height={height}', 'render=1'] + list(q))
        from playwright.sync_api import sync_playwright
        files = []
        with sync_playwright() as pw:
            b = pw.chromium.launch(channel='chromium', headless=True,
                                   args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist',
                                         '--disable-background-timer-throttling', '--disable-renderer-backgrounding'])
            page = b.new_page(viewport={'width': 600, 'height': 600})
            page.on('pageerror', lambda e: print('pageerror:', e, file=sys.stderr))
            page.on('console', lambda m: m.type in ('error', 'warning') and print(f'console.{m.type}:', m.text[:400], file=sys.stderr))
            t0 = time.time()
            page.goto(url, wait_until='load')
            page.wait_for_function('() => window.__pv && (window.__pv.ready || window.__pv.error)', timeout=90000, polling=100)
            err = page.evaluate('() => window.__pv.error')
            if err:
                b.close()
                return None, 'scene error: ' + err
            print(f'boot {time.time() - t0:.1f}s')
            tag = '_'.join(x.replace('=', '') for x in q)
            for i in frames:
                t = time.time()
                data = page.evaluate("async (i) => { await window.renderFrame(i); return window.__pv.canvas.toDataURL('image/png'); }", i)
                fn = os.path.join(out, f'f{i:05d}{"_" + tag if tag else ""}.png')
                with open(fn, 'wb') as fh:
                    fh.write(base64.b64decode(data.split(',', 1)[1]))
                print(f'{fn}  {time.time() - t:.2f}s')
                files.append(fn)
            b.close()
        return files, None
    except Exception as e:  # playwright, server or file errors
        return None, f'{type(e).__name__}: {e}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('scene')                     # path relative to .claude/films/edu
    ap.add_argument('frames', nargs='*', type=int, default=[0])
    ap.add_argument('--out', required=True)
    ap.add_argument('--width', type=int, default=1080)
    ap.add_argument('--height', type=int, default=1920)
    ap.add_argument('--q', action='append', default=[])   # extra query params, e.g. lang=zh guides=1
    a = ap.parse_args()
    _, err = render(a.scene, a.frames, a.out, a.width, a.height, a.q)
    if err:
        sys.exit(err)


if __name__ == '__main__':
    main()
