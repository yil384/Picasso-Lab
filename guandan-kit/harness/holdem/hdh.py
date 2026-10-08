"""Hold'em harness library: the Guandan harness (gdh: GitHub Pages served from GD_ROOT, Firebase RTDB stubbed in
memory) plus a games service and a firebase-auth stub. Production Firebase and Supabase are aborted.

    from hdh import dealer, hsession
    with dealer() as d:                         # HD_DEALER=real -> events/holdem-dealer (npm test must pass), else the fake
        async with hsession('phone', d) as s:   # desk | hd | ifr | phone | portrait (is_mobile + has_touch on phones)
            await s.goto()                      # lobby; s.errors collects console errors
            d.post('/__scene', {...})           # fake only: push a scripted table state

The page reads window.__PICASSO_GAMES_ORIGIN (set here by an init script); production uses poker.picasso-lab.com."""
import contextlib, json, os, subprocess, sys, tempfile, time, urllib.request
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')))
from playwright.async_api import async_playwright
import gdh
from gdh import VIEWPORTS, LONGTASK_JS, ME, route_context

HD = os.path.dirname(os.path.abspath(__file__))
DEALER_DIR = os.path.join(gdh.ROOT, 'events', 'holdem-dealer')
SHOTS = os.environ.get('HD_SHOTS', '/tmp/holdem-shots')
# the routed page is "public" (yil384.github.io) and the test service is on loopback: Chromium's local network
# access checks would ask for a permission no test can grant (production talks to a public host)
LAUNCH_ARGS = ['--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights']


class Dealer:
    def __init__(self, kind, port):
        self.kind, self.port = kind, port
        self.origin = f'http://127.0.0.1:{port}'
        self.proc = None

    def post(self, path, body=None, token=None):
        req = urllib.request.Request(self.origin + path, data=json.dumps(body or {}).encode(), method='POST',
                                     headers={'content-type': 'application/json', **({'authorization': f'Bearer {token}'} if token else {})})
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read() or b'{}')

    def get(self, path):
        with urllib.request.urlopen(self.origin + path, timeout=5) as r:
            return json.loads(r.read() or b'{}')


@contextlib.contextmanager
def dealer(kind=None, data_dir=None):
    """data_dir (real dealer): reuse a data directory, e.g. to restart the service over its saved tables."""
    kind = kind or os.environ.get('HD_DEALER', 'fake')
    if kind == 'real':
        d = Dealer('real', 8787)
        env = dict(os.environ, PORT='8787', DATA_DIR=data_dir or tempfile.mkdtemp(prefix='hd-data-'), ALLOWED_ORIGINS='https://yil384.github.io',
                   BOT_THINK_SCALE='0.3', EMAIL_LINK='on')
        cmd, cwd = ['node', 'src/server.js'], DEALER_DIR
    else:
        d = Dealer('fake', 8790)
        env = dict(os.environ, PORT='8790')
        cmd, cwd = ['node', os.path.join(HD, 'fake-dealer.mjs')], HD
    log = open(os.path.join(tempfile.gettempdir(), f'hd-dealer-{kind}.log'), 'w')
    d.proc = subprocess.Popen(cmd, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT)
    try:
        for _ in range(100):
            try:
                d.get('/v1/health')
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError(f'{kind} dealer did not start, see {log.name}')
        yield d
    finally:
        d.proc.terminate()
        d.proc.wait(5)
        log.close()


async def route_holdem(ctx, origin):
    await route_context(ctx)
    auth = open(os.path.join(gdh.D, 'fb-stub-auth.js')).read()

    async def stub(route):
        await route.fulfill(status=200, body=auth, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})
    await ctx.route('https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js', stub)
    await ctx.route('**/*firebaseio.com*/**', lambda r: r.abort())
    await ctx.route('**/*supabase.co*/**', lambda r: r.abort())
    await ctx.add_init_script(f'window.__PICASSO_GAMES_ORIGIN = {json.dumps(origin)};')


class HSession(gdh.Session):
    def __init__(self, br, vp, tag, d):
        super().__init__(br, vp, tag)
        self.d = d

    async def new_page(self, client=ME, name='Yichen', lang='zh', store=None, local=None, reduced_motion=False, game='holdem'):
        if self.ctx:
            await self.ctx.close()
        v = VIEWPORTS[self.vp]
        self.ctx = await self.br.new_context(viewport={'width': v['width'], 'height': v['height']}, device_scale_factor=v['dpr'],
                                             has_touch=v['mobile'], is_mobile=v['mobile'],
                                             reduced_motion='reduce' if reduced_motion else 'no-preference')
        await route_holdem(self.ctx, self.d.origin)
        ls = {'picasso.guandan.lang': lang, 'picasso.guandan.music': 'off'}
        if client:
            ls['picasso.guandan.client'] = client
        if name:
            ls['picasso.guandan.name'] = name
        if game:
            ls['picasso.games.game'] = game
        ls.update(local or {})
        init = 'try{if(!sessionStorage.getItem("hd.seeded")){sessionStorage.setItem("hd.seeded","1");' + ''.join(
            f'localStorage.setItem({json.dumps(k)},{json.dumps(val)});' for k, val in ls.items() if val is not None) + '}}catch(e){}'
        if store:
            init += f'window.__fbStore=Object.assign(window.__fbStore||{{}},{json.dumps(store)});'
        await self.ctx.add_init_script(init + LONGTASK_JS)
        await self.ctx.add_init_script(path=os.path.join(gdh.D, 'stage.js'))
        self.pg = await self.ctx.new_page()
        self.pg.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        self.pg.on('pageerror', lambda e: self.errors.append(f'PAGEERROR: {e}'))
        return self.pg

    async def shot(self, name, full=False):
        os.makedirs(SHOTS, exist_ok=True)
        path = os.path.join(SHOTS, f'{self.tag or self.vp}-{name}.jpg')
        await self.pg.screenshot(path=path, type='jpeg', quality=82, full_page=full)
        return path

    async def token(self):
        return await self.pg.evaluate("localStorage.getItem('picasso.games.token')")

    async def wait_screen(self, name, timeout=8000):
        await self.pg.wait_for_function(f"document.body.dataset.screen === {json.dumps(name)}", timeout=timeout)

    async def scene(self, name, **kw):
        """Fake dealer: push a scripted scene onto the table this page watches."""
        code = await self.pg.evaluate("new URLSearchParams(location.search).get('room')")
        out = self.d.post('/__scene', dict(code=code, name=name, **kw))
        await self.pg.wait_for_timeout(500)
        return out


@contextlib.asynccontextmanager
async def hsession(vp, d, tag=None):
    async with async_playwright() as p:
        br = await p.chromium.launch(args=LAUNCH_ARGS)
        s = HSession(br, vp, tag, d)
        try:
            yield s
        finally:
            with contextlib.suppress(Exception):
                if s.ctx:
                    await s.ctx.close()
            await br.close()
