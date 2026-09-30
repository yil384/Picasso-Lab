"""Tiga portal on the live Google Sites Events page, with local events.html (data-code swap), local guandan.html,
static/, nav-frame.html, and stubbed Firebase. Real back button via the extension (harness.H)."""
import asyncio, html, os, re, sys, mimetypes, time
from playwright.async_api import async_playwright
import harness
from harness import H
# SITE_ROOT: a checkout of main (the site files under test); GD_HARNESS: guandan-kit/harness from branch guandan-cloud
R = os.environ.get('SITE_ROOT', os.path.expanduser('~/claude-work/picasso/wt/release')).rstrip('/') + '/'
GH = os.environ.get('GD_HARNESS', os.path.expanduser('~/claude-work/picasso/wt/gcloud/guandan-kit/harness')).rstrip('/') + '/'
sys.path.insert(0, GH)
from mustkeep import DB_STUB
APP_STUB = open(GH + 'fb-stub-app.js').read()
SITE = 'https://yufeiding.ucsd.edu/events'
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shots')
os.makedirs(SHOTS, exist_ok=True)

async def local(route):
    u = route.request.url.split('?')[0].split('#')[0]
    rel = u.replace('https://yil384.github.io/Picasso-Lab/', '')
    f = R + rel
    if not os.path.isfile(f): return await route.continue_()
    ct = mimetypes.guess_type(f)[0] or 'application/octet-stream'
    if f.endswith('.js'): ct = 'text/javascript'
    await route.fulfill(status=200, path=f, headers={'content-type': ct, 'access-control-allow-origin': '*'})

async def fb(route):
    u = route.request.url
    body = APP_STUB if u.endswith('firebase-app.js') else DB_STUB
    await route.fulfill(status=200, body=body, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})

async def start(p, vw=1280, vh=800):
    harness.SITE = SITE
    h = H()
    await h.start(p, vw=vw, vh=vh, routes={
        'https://yil384.github.io/Picasso-Lab/nav-frame.html*': local,
        'https://yil384.github.io/Picasso-Lab/events/guandan.html*': local,
        'https://yil384.github.io/Picasso-Lab/events/static/**': local,
        'https://www.gstatic.com/firebasejs/**': fb,
        '**/*firebaseio.com/**': lambda r: r.abort(), '**/*supabase.co/**': lambda r: r.abort(),
    })
    code = open(R + 'events/events.html', encoding='utf-8').read()
    async def site(route):
        r = await route.fetch(); body = await r.text()
        new, n = re.subn(r'data-code="[^"]*"', lambda m: 'data-code="' + html.escape(code, quote=True) + '"', body, count=1)
        assert n == 1
        await route.fulfill(response=r, body=new)
    await h.ctx.route(SITE, site)
    h.errors = []
    h.pg.on('pageerror', lambda e: h.errors.append(str(e)[:200]))
    await h.open('https://yufeiding.ucsd.edu/')
    await h.open(SITE, "!!document.querySelector('.news-banner')")
    await h.pg.wait_for_timeout(4500)          # let the splash film finish
    return h

async def embed(h):
    return await h.embed("!!document.querySelector('.news-banner')")

async def portal(h):
    fr = await embed(h)
    if not fr: return {'blank': True}
    return await fr.evaluate("""(() => { const p = document.getElementById('gd-portal'); const v = p && p.querySelector('video');
        return { cls: p ? p.className : null, t: v ? +v.currentTime.toFixed(2) : null, src: v ? (v.currentSrc || '').split('/').pop() : null,
          frame: !!(p && p.querySelector('iframe')), white: p ? getComputedStyle(p.querySelector('.gdp-white')).opacity : null,
          bodyCls: document.body.className } })()""")

async def gframe(h):
    for f in h.pg.frames:
        if f.name == 'gd-portal': return f

async def watch(h, secs, tag, every=0.5, shots=()):
    t0 = time.time(); k = 0
    while time.time() - t0 < secs:
        el = time.time() - t0
        st = await portal(h)
        print(f'  {tag} +{el:4.1f}s', st.get('cls'), 't=', st.get('t'), st.get('src'), 'white', st.get('white'), 'frame', st.get('frame'))
        if k < len(shots) and el >= shots[k]:
            await h.pg.screenshot(path=f'{SHOTS}/{tag}_{shots[k]:.1f}.jpg', type='jpeg', quality=55); k += 1
        await h.pg.wait_for_timeout(int(every * 1000))

async def type_picasso(h):
    fr = await embed(h)
    await fr.evaluate("document.body.focus()")
    await h.pg.keyboard.type('picasso', delay=90)

async def main():
    async with async_playwright() as p:
        # 1. type picasso -> attack film -> table; leave from inside guandan (typing picasso there)
        h = await start(p)
        print('hist before', await h.hist())
        await type_picasso(h)
        await watch(h, 9.5, 'in', shots=(0.4, 2.0, 4.2, 6.2, 7.2, 9.0))
        g = await gframe(h)
        print('guandan frame', bool(g), g and g.url[:80], 'hist', await h.hist())
        await h.pg.keyboard.type('picasso', delay=90)      # focus is in the guandan frame
        await watch(h, 8.0, 'out', shots=(0.3, 1.5, 3.5, 5.0, 6.8, 7.8))
        print('hist after leave', await h.hist())
        await h.ui_back(3000); print('back after leave ->', h.pg.url)
        print('errors', h.errors[:5]); await h.stop()
        # 2. open, then the browser back button while the table is up
        h = await start(p)
        await type_picasso(h); await h.pg.wait_for_timeout(9000)
        print('table?', (await portal(h)).get('cls'), await h.hist())
        await h.ui_back(500)
        await watch(h, 7.5, 'back', shots=(0.5, 3.0, 7.0))
        await h.ui_back(3000); print('second back ->', h.pg.url, await h.hist())
        await h.stop()
        # 3. skip with Escape during the film
        h = await start(p)
        await type_picasso(h); await h.pg.wait_for_timeout(1200)
        await h.pg.keyboard.press('Escape')
        await watch(h, 3.0, 'skip', shots=(0.2, 2.5))
        await h.stop()
if __name__ == "__main__": asyncio.run(main())
