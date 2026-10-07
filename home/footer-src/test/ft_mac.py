#!/usr/bin/python3
"""Footer screenshots on the Mac (ft.js needs the cloud container's /opt/pw-browsers): the Sites-like nesting (top page
-> sandboxed frame filled with document.write, quirks mode), production Supabase answered with [] and geo-IP aborted
(never written to), https://yil384.github.io/Picasso-Lab/** served from the checkout with the CORS header.

    python3 home/footer-src/test/ft_mac.py home/footer.html OUT_PREFIX 957x200 700x146 352x73@phone 352x107@phone 600x420
"""
import json, mimetypes, os, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
GEO = ('ipapi', 'ipwho', 'ip-api', 'ipinfo', 'geojs')


def route(r):
    u = r.request.url
    if 'supabase.co' in u:
        return r.fulfill(status=200, content_type='application/json', body='[]')
    if any(k in u for k in GEO):
        return r.abort()
    if u.startswith('https://yil384.github.io/Picasso-Lab/'):
        p = os.path.join(REPO, u.split('/Picasso-Lab/', 1)[1].split('?')[0])
        if os.path.isfile(p):
            return r.fulfill(status=200, body=open(p, 'rb').read(), headers={'Access-Control-Allow-Origin': '*'},
                             content_type=mimetypes.guess_type(p)[0] or 'application/octet-stream')
        return r.fulfill(status=404, body='')
    return r.continue_()


def shoot(embed, prefix, specs, wait_ms=4500):
    """Screenshot the embed at each WxH[@phone]. Returns (list of png paths, None) or (None, 'error')."""
    try:
        code = open(embed, encoding='utf-8').read()
    except OSError as e:
        return None, f'cannot read {embed}: {e}'
    js = json.dumps(code).replace('</', '<\\/')          # a literal </script> would end the host script early
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots'); os.makedirs(out, exist_ok=True)
    from playwright.sync_api import sync_playwright
    files = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            try:
                for spec in specs:
                    size, _, mode = spec.partition('@'); W, H = map(int, size.split('x')); phone = mode == 'phone'
                    ctx = b.new_context(viewport={'width': W + 40, 'height': H + 40}, device_scale_factor=2 if phone else 1, is_mobile=phone, has_touch=phone)
                    pg = ctx.new_page(); pg.route('**/*', route)
                    pg.set_content('<!doctype html><html><body style="margin:20px;background:#fff">'
                                   f'<iframe id="f" sandbox="allow-scripts allow-same-origin allow-popups" style="border:0;display:block;width:{W}px;height:{H}px"></iframe>'
                                   f'<script>const d=document.getElementById("f").contentDocument;d.open();d.write({js});d.close();</script></body></html>')
                    pg.wait_for_timeout(wait_ms)
                    fn = os.path.join(out, f'{prefix}_{size}{"_" + mode if mode else ""}.png')
                    pg.locator('#f').screenshot(path=fn); files.append(fn); ctx.close()
            finally:
                b.close()
    except Exception as e:  # browser or file errors
        return None, f'{type(e).__name__}: {e}'
    return files, None


if __name__ == '__main__':
    files, err = shoot(sys.argv[1], sys.argv[2], sys.argv[3:])
    if err:
        sys.exit(err)
    print('\n'.join(files))
