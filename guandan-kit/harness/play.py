"""Full-round play-through against the in-memory Firebase stub (never touches production).
Serves https://yil384.github.io/Picasso-Lab/** from GD_ROOT. Base harness — selectors may need adapting to the current UI.
Usage: GD_ROOT=<worktree> python3 play.py [desk|phone]"""
import asyncio, json, os, sys, time, mimetypes
from playwright.async_api import async_playwright

ROOT = os.environ.get('GD_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')))
D = os.path.dirname(os.path.abspath(__file__))
SH = os.path.join(D, 'shots')
os.makedirs(SH, exist_ok=True)
PREFIX = 'https://yil384.github.io/Picasso-Lab/'

def body_for(url):
    path = url[len(PREFIX):].split('?')[0].split('#')[0]
    fp = os.path.join(ROOT, path)
    if os.path.isfile(fp):
        ct = mimetypes.guess_type(fp)[0] or 'application/octet-stream'
        if fp.endswith('.js') or fp.endswith('.mjs'):
            ct = 'text/javascript'
        return open(fp, 'rb').read(), ct
    return None, None

async def setup(ctx):
    async def gh(route):
        b, ct = body_for(route.request.url)
        if b is None:
            await route.fulfill(status=404, body='nf')
        else:
            await route.fulfill(status=200, body=b, headers={'content-type': ct, 'access-control-allow-origin': '*'})
    await ctx.route(PREFIX + '**', gh)
    def stub_handler(body):
        async def h(route):
            await route.fulfill(status=200, body=body, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})
        return h
    for mod, fname in (('app', 'fb-stub-app.js'), ('database', 'fb-stub-db.js')):
        await ctx.route(f'https://www.gstatic.com/firebasejs/12.8.0/firebase-{mod}.js', stub_handler(open(os.path.join(D, fname)).read()))

STATE_JS = """(()=>{const k=Object.keys(window.__fbStore||{})[0];if(!k)return null;const g=window.__fbStore[k];
const mine=g.seats.findIndex(s=>s&&s.clientId==='c_shooter');
return {k,turn:g.currentTurn,mine,phase:g.phase,hand:(g.hands&&g.hands[mine]||[]).length,hist:(g.history||[]).length,finished:g.finished||[],deal:g.dealStartedAt}})()"""

async def shot(pg, name):
    await pg.screenshot(path=f'{SH}/{name}.jpg', type='jpeg', quality=82)

async def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else 'desk'
    w, h, dpr = (1440, 900, 2) if tag == 'desk' else (844, 390, 3)
    mobile = tag != 'desk'
    async with async_playwright() as p:
        br = await p.chromium.launch()
        try:
            ctx = await br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, has_touch=mobile, is_mobile=mobile)
            await setup(ctx)
            await ctx.add_init_script("try{localStorage.setItem('picasso.guandan.client','c_shooter');localStorage.setItem('picasso.guandan.name','Yichen');}catch(e){}")
            pg = await ctx.new_page()
            errors = []
            pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errors.append(f'PAGEERROR: {e}'))
            await pg.goto(PREFIX + 'events/guandan.html', wait_until='load')
            await pg.wait_for_timeout(1400)
            await shot(pg, f'{tag}-01-lobby')
            await pg.click('#create-room'); await pg.wait_for_timeout(900)
            await shot(pg, f'{tag}-02-room')
            await pg.click('#fill-ai'); await pg.wait_for_timeout(600)
            await pg.click('#start-game'); await pg.wait_for_timeout(1500)
            await shot(pg, f'{tag}-03-dealing')
            await pg.wait_for_timeout(3200)
            t0 = time.time(); plays = passes = 0; shot_turn = False
            while time.time() - t0 < 420:
                st = await pg.evaluate(STATE_JS)
                if st['phase'] in ('roundOver', 'gameOver'):
                    break
                if st['phase'] == 'playing' and st['turn'] == st['mine']:
                    if await pg.evaluate("document.querySelector('#hint-btn')?.disabled"):
                        await pg.wait_for_timeout(250); continue
                    await pg.click('#hint-btn'); await pg.wait_for_timeout(300)
                    if not shot_turn:
                        await shot(pg, f'{tag}-04-myturn-hint'); shot_turn = True
                    # #play-btn is soft-disabled (aria-disabled) so a tap can toast 牌型不符 — check both
                    if await pg.evaluate("(()=>{const b=document.querySelector('#play-btn');return !!b && !b.disabled && b.getAttribute('aria-disabled')!=='true'})()"):
                        await pg.click('#play-btn'); plays += 1
                    elif await pg.evaluate("(()=>{const b=document.querySelector('#pass-btn');return !!b && !b.disabled && b.getAttribute('aria-disabled')!=='true'})()"):
                        await pg.click('#pass-btn'); passes += 1
                    await pg.wait_for_timeout(400)
                else:
                    await pg.wait_for_timeout(300)
            st = await pg.evaluate(STATE_JS)
            print('ROUND END', json.dumps(st), f'plays={plays} passes={passes} secs={time.time()-t0:.0f}')
            await pg.wait_for_timeout(1500)
            await shot(pg, f'{tag}-05-roundover')
            try:
                await pg.click('#next-round', timeout=3000); await pg.wait_for_timeout(6000)
                print('ROUND 2', json.dumps(await pg.evaluate(STATE_JS)))
                await shot(pg, f'{tag}-06-round2')
            except Exception as e:
                print('next-round click failed', e)
            print('ERRORS', errors)
        finally:
            await br.close()

if __name__ == "__main__":
    asyncio.run(main())
