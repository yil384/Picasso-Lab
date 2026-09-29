"""Guandan harness library: serves https://yil384.github.io/Picasso-Lab/** from GD_ROOT and stubs Firebase in
memory (fb-stub-*.js: window.__fbStore / __fbSet / __fbGet), so nothing ever touches the production database.

    from gdh import *
    async with session('phone') as s:          # desk | hd | ifr | phone | portrait
        await s.goto()                          # lobby
        code = await s.create_room(); await s.fill_ai(); await s.start()
        await s.wait_deal_done()
        r = await s.play_round()                # plays my seat with 提示 -> 出牌 / 不出 until roundOver
        await s.shot('x')                       # JPEG into SHOTS (git-ignored)
        await s.set_game(lambda g: ...)         # (python) mutate the room state and push it (like a Firebase tick)
        print(s.errors, await s.long_tasks())

Viewports follow SPEC §6. Phone contexts are is_mobile + has_touch and s.press() uses real touch (page.tap)."""
import asyncio, contextlib, json, mimetypes, os, time
from playwright.async_api import async_playwright

ROOT = os.environ.get('GD_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')))
D = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.environ.get('GD_SHOTS', os.path.join(D, 'shots'))
PREFIX = 'https://yil384.github.io/Picasso-Lab/'
URL = PREFIX + 'events/guandan.html'
ME = 'c_shooter'

VIEWPORTS = {
    'desk':     dict(width=1440, height=900, dpr=2, mobile=False),
    'hd':       dict(width=1280, height=720, dpr=2, mobile=False),
    'ifr':      dict(width=1024, height=640, dpr=2, mobile=False),
    'phone':    dict(width=844, height=390, dpr=3, mobile=True),
    'portrait': dict(width=390, height=844, dpr=3, mobile=True),
}

LONGTASK_JS = """(()=>{window.__longTasks=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__longTasks.push(Math.round(e.duration))}).observe({type:'longtask',buffered:true})}catch(e){}})();"""

STATE_JS = """(()=>{const k=Object.keys(window.__fbStore||{}).find(p=>p.startsWith('guandanRooms/'));if(!k)return null;const g=window.__fbStore[k];
const seats=g.seats||[];const mine=seats.findIndex(s=>s&&s.clientId===%s);
const h=g.hands||{};return {k,code:k.split('/')[1],turn:g.currentTurn,mine,phase:g.phase,round:g.roundNo,hand:(h[mine]||[]).length,
hands:[0,1,2,3].map(i=>(h[i]||[]).length),hist:(g.history||[]).length,finished:g.finished||[],deal:g.dealStartedAt,lastPlay:!!g.lastPlay,levels:g.levels,msg:g.message}})()"""


def body_for(url):
    path = url[len(PREFIX):].split('?')[0].split('#')[0]
    fp = os.path.join(ROOT, path)
    if os.path.isfile(fp):
        ct = mimetypes.guess_type(fp)[0] or 'application/octet-stream'
        if fp.endswith(('.js', '.mjs')):
            ct = 'text/javascript'
        return open(fp, 'rb').read(), ct
    return None, None


async def route_context(ctx):
    async def gh(route):
        b, ct = body_for(route.request.url)
        if b is None:
            await route.fulfill(status=404, body='nf')
        else:
            await route.fulfill(status=200, body=b, headers={'content-type': ct, 'access-control-allow-origin': '*'})
    await ctx.route(PREFIX + '**', gh)

    def stub(body):
        async def h(route):
            await route.fulfill(status=200, body=body, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})
        return h
    for mod, fname in (('app', 'fb-stub-app.js'), ('database', 'fb-stub-db.js')):
        await ctx.route(f'https://www.gstatic.com/firebasejs/12.8.0/firebase-{mod}.js', stub(open(os.path.join(D, fname)).read()))


class Session:
    def __init__(self, br, vp, tag):
        self.br, self.vp, self.tag = br, vp, tag
        self.errors, self.ctx, self.pg = [], None, None
        self.mobile = VIEWPORTS[vp]['mobile']

    async def new_page(self, client=ME, name='Yichen', lang='zh', store=None, local=None, reduced_motion=False):
        """(Re)open a page. `store` pre-seeds the in-memory Firebase ({path: value}) before the module runs,
        so ?room=CODE rejoins / spectator / non-host views can be staged. `local` sets extra localStorage keys."""
        if self.ctx:
            await self.ctx.close()
        v = VIEWPORTS[self.vp]
        self.ctx = await self.br.new_context(viewport={'width': v['width'], 'height': v['height']}, device_scale_factor=v['dpr'],
                                             has_touch=v['mobile'], is_mobile=v['mobile'],
                                             reduced_motion='reduce' if reduced_motion else 'no-preference')
        await route_context(self.ctx)
        ls = {'picasso.guandan.client': client, 'picasso.guandan.name': name, 'picasso.guandan.lang': lang, 'picasso.guandan.music': 'off'}
        ls.update(local or {})
        init = 'try{' + ''.join(f'localStorage.setItem({json.dumps(k)},{json.dumps(val)});' for k, val in ls.items()) + '}catch(e){}'
        if store:
            init += f'window.__fbStore=Object.assign(window.__fbStore||{{}},{json.dumps(store)});'
        await self.ctx.add_init_script(init + LONGTASK_JS)
        await self.ctx.add_init_script(path=os.path.join(D, 'stage.js'))
        self.pg = await self.ctx.new_page()
        self.pg.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        self.pg.on('pageerror', lambda e: self.errors.append(f'PAGEERROR: {e}'))
        return self.pg

    async def goto(self, query='', wait=1400, **kw):
        if not self.pg or kw:
            await self.new_page(**kw)
        await self.pg.goto(URL + query, wait_until='load')
        await self.pg.wait_for_timeout(wait)

    async def press(self, selector, timeout=8000):
        """Real touch on phones (page.tap), mouse click on desktops."""
        if self.mobile:
            await self.pg.tap(selector, timeout=timeout)
        else:
            await self.pg.click(selector, timeout=timeout)

    async def shot(self, name, full=False):
        os.makedirs(SHOTS, exist_ok=True)
        path = os.path.join(SHOTS, f'{self.tag or self.vp}-{name}.jpg')
        await self.pg.screenshot(path=path, type='jpeg', quality=82, full_page=full)
        return path

    async def state(self):
        return await self.pg.evaluate(STATE_JS % json.dumps(ME))

    async def room_path(self):
        return await self.pg.evaluate("Object.keys(window.__fbStore||{}).find(p=>p.startsWith('guandanRooms/'))||null")

    async def get_game(self):
        p = await self.room_path()
        return p and await self.pg.evaluate(f'window.__fbGet({json.dumps(p)})')

    async def put_game(self, g, path=None):
        path = path or await self.room_path()
        await self.pg.evaluate('([p,v])=>window.__fbSet(p,v)', [path, g])

    async def set_game(self, fn):
        g = await self.get_game()
        out = fn(g)
        await self.put_game(out if out is not None else g)

    async def stage(self, body, arg=None):
        """Run async JS with the staging helpers (stage.js: __gd.make/give/play/pass/turn/put) and `code` =
        the attached room code, e.g. await s.stage("const g = await __gd.make({code}); __gd.put(g)")."""
        return await self.pg.evaluate(f"async (arg) => {{ const code = (__gd.path()||'').split('/')[1]; {body} }}", arg)

    async def long_tasks(self):
        return await self.pg.evaluate('window.__longTasks||[]')

    # ---- lobby / room ----
    async def create_room(self):
        await self.press('#create-room')
        await self.pg.wait_for_selector('.room', timeout=8000)
        await self.pg.wait_for_timeout(300)
        return (await self.state())['code']

    async def fill_ai(self):
        await self.press('#fill-ai')
        await self.pg.wait_for_timeout(500)

    async def start(self):
        await self.press('#start-game')
        await self.pg.wait_for_selector('.gd-stage', timeout=8000)

    async def quick_start(self):
        await self.press('.lobby-quick')
        await self.pg.wait_for_selector('.gd-stage', timeout=10000)

    async def until_deal(self, ms):
        """Wait until `ms` after the current deal started (dealStartedAt), for timeline shots."""
        st = await self.state()
        left = (st['deal'] or 0) + ms - await self.pg.evaluate('Date.now()')
        if left > 0:
            await self.pg.wait_for_timeout(left)

    async def wait_deal_done(self, extra=300):
        st = await self.state()
        left = (st['deal'] or 0) + 2800 + 980 - await self.pg.evaluate('Date.now()')
        await self.pg.wait_for_timeout(max(0, left) + extra)

    # ---- table ----
    async def my_turn_ready(self):
        return await self.pg.evaluate("(()=>!!document.querySelector('#play-btn')||!!document.querySelector('#pass-btn'))()")

    async def act(self):
        """One decision on my turn: 提示 then 出牌 when it is enabled, else 不出. Returns 'play' | 'pass' | None."""
        pg = self.pg
        if await pg.evaluate("!!document.querySelector('#hint-btn')"):
            await self.press('#hint-btn')
            for _ in range(30):
                await pg.wait_for_timeout(120)
                ok = await pg.evaluate("(()=>{const b=document.querySelector('#play-btn');return !!b&&b.getAttribute('aria-disabled')!=='true'})()")
                passy = await pg.evaluate("(()=>{const b=document.querySelector('#pass-btn');return !!b&&b.classList.contains('is-advised')})()")
                if ok or passy:
                    break
        if await pg.evaluate("(()=>{const b=document.querySelector('#play-btn');return !!b&&b.getAttribute('aria-disabled')!=='true'})()"):
            await self.press('#play-btn')
            return 'play'
        if await pg.evaluate("!!document.querySelector('#pass-btn')"):
            await self.press('#pass-btn')
            return 'pass'
        # a lead with no hint answer: play the rightmost single
        if await pg.evaluate("!!document.querySelector('#play-btn')"):
            await pg.evaluate("(()=>{const c=[...document.querySelectorAll('.gd-hand [data-card-id]')].pop();c&&c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9,isPrimary:true}))})()")
            await pg.evaluate("document.querySelector('.gd-hand').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9,isPrimary:true}))")
            await self.press('#play-btn')
            return 'play'
        return None

    async def play_round(self, limit=420, on_turn=None):
        t0 = time.time()
        plays = passes = 0
        while time.time() - t0 < limit:
            st = await self.state()
            if st['phase'] in ('roundOver', 'gameOver'):
                break
            if st['phase'] == 'playing' and st['turn'] == st['mine'] and st['mine'] >= 0 and await self.my_turn_ready():
                if on_turn:
                    await on_turn(self, plays + passes)
                r = await self.act()
                plays += r == 'play'
                passes += r == 'pass'
                await self.pg.wait_for_timeout(350)
            else:
                await self.pg.wait_for_timeout(250)
        st = await self.state()
        return dict(state=st, plays=plays, passes=passes, secs=round(time.time() - t0))

    async def next_round(self):
        await self.pg.wait_for_selector('#next-round', timeout=6000)
        await self.pg.wait_for_timeout(1500)   # the result lands after RESULT_IN_MS
        await self.press('#next-round')
        await self.pg.wait_for_timeout(400)

    async def rect(self, selector):
        return await self.pg.evaluate("(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}", selector)


@contextlib.asynccontextmanager
async def session(vp='desk', tag=None):
    async with async_playwright() as p:
        br = await p.chromium.launch()
        s = Session(br, vp, tag)
        try:
            yield s
        finally:
            with contextlib.suppress(Exception):
                if s.ctx:
                    await s.ctx.close()
            await br.close()
