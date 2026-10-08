"""Live Hold'em harness: the real dealer service (events/holdem-dealer) and several players in one browser, each in
its own context (phones are is_mobile + has_touch and tap for real). Every WebSocket frame every page receives is
kept and checked against the dealer's record of what it really dealt (test hooks, HOLDEM_TEST_HOOKS=1, loopback
only, never in production).

    from live import Service, KeyServer, FakeResend, Player, browser, check_frames
    with Service() as svc:                          # PORT 8787, a temp DATA_DIR, BOT_THINK_SCALE=0.2, test hooks on
        async with browser() as br:
            a = Player(br, 'desk', 'Ann', svc); await a.open()
            ...
            svc.stop() / svc.kill9() / svc.start()  # restart on the same data directory
            report = check_frames([a, b], svc)      # no page ever got a card it may not see

The page reads window.__PICASSO_GAMES_ORIGIN (hdh's init script); Firebase RTDB is stubbed in memory and production
Firebase / Supabase requests are aborted (hdh.route_holdem)."""
import asyncio, base64, contextlib, json, os, re, signal, subprocess, tempfile, threading, time, urllib.error, urllib.parse, urllib.request
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from playwright.async_api import async_playwright
from hdh import HSession, LAUNCH_ARGS, DEALER_DIR, SHOTS
import gdh

PORT = int(os.environ.get('HD_PORT', '8787'))
CARD_RE = re.compile(r'^[2-9TJQKA][shdc]$')
LINK = 'https://yil384.github.io/Picasso-Lab/events/account-link.html'
# console noise a restart produces by design: the socket's failed reconnects while the service is down
NET_NOISE = ('WebSocket connection to', 'ERR_CONNECTION_REFUSED', 'net::ERR_CONNECTION_RESET')


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ---------------------------------------------------------------- the dealer service
class Service:
    """The real dealer as a child process. stop() is a graceful SIGTERM, kill9() a crash; start() again reuses the
    data directory (the saved tables come back). The dealt-cards record is polled into self.truth all the time, so a
    crash loses nothing the checker needs."""

    def __init__(self, data_dir=None, email_link=False, jwks_url=None, env=None, tag='live', port=PORT):
        self.data = data_dir or tempfile.mkdtemp(prefix='hd-live-')
        self.origin = f'http://127.0.0.1:{port}'
        self.env = dict(os.environ, PORT=str(port), DATA_DIR=self.data, ALLOWED_ORIGINS='https://yil384.github.io',
                        BOT_THINK_SCALE='0.2', HOLDEM_TEST_HOOKS='1', EMAIL_LINK='on' if email_link else 'off', **(env or {}))
        if jwks_url:
            self.env['FIREBASE_JWKS_URL'] = jwks_url
        self.tag = tag
        self.proc = None
        self.truth = {}          # hand id -> [record, ...] (a crash can re-deal a hand number with new cards)
        self.starts = 0
        self.down_since = None   # wall time the service went down (None while up)
        self.windows = []        # [(down, up)] restart windows, for the console filter
        self._poll = None
        self._lock = threading.Lock()

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *exc):
        self.stop()

    def start(self):
        self.starts += 1
        self.logfile = open(os.path.join(tempfile.gettempdir(), f'hd-{self.tag}-{self.starts}.log'), 'w')
        self.proc = subprocess.Popen(['node', 'src/server.js'], cwd=DEALER_DIR, env=self.env, stdout=self.logfile, stderr=subprocess.STDOUT)
        for _ in range(150):
            if self.proc.poll() is not None:
                raise RuntimeError(f'dealer exited at start, see {self.logfile.name}')
            try:
                self.get('/v1/health')
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError(f'dealer did not start, see {self.logfile.name}')
        if self.down_since:
            self.windows.append((self.down_since, time.time()))
            self.down_since = None
        self._alive = True
        self._poll = threading.Thread(target=self._poller, daemon=True)
        self._poll.start()

    def _poller(self):
        proc = self.proc
        while self._alive and self.proc is proc:
            with contextlib.suppress(Exception):
                self.collect()
            time.sleep(.3)

    def _down(self, sig):
        if not self.proc or self.proc.poll() is not None:
            return
        with contextlib.suppress(Exception):
            self.collect()
        self._alive = False
        self.down_since = time.time()
        self.proc.send_signal(sig)
        self.proc.wait(10)
        self.logfile.close()

    def stop(self):
        """Graceful: SIGTERM (sockets close with 1012, both files flushed)."""
        self._down(signal.SIGTERM)

    def kill9(self):
        self._down(signal.SIGKILL)

    @property
    def up(self):
        return bool(self.proc) and self.proc.poll() is None

    def collect(self):
        hands = self.get('/__test/hands')['hands']
        with self._lock:
            for hid, rec in hands.items():
                versions = self.truth.setdefault(hid, [])
                same = next((v for v in versions if v['holes'] == rec['holes']), None)
                if same:
                    for k in ('folded', 'mucked', 'showed'):
                        same[k] = sorted(set(same[k]) | set(rec[k]))
                else:
                    versions.append(rec)

    def rig(self, code, holes=None, board=None):
        return self.post('/__test/deck', {'code': code, 'holes': {str(k): v for k, v in (holes or {}).items()}, 'board': board or []})

    def req(self, method, path, body=None, token=None, timeout=5):
        headers = {'content-type': 'application/json'}
        if token:
            headers['authorization'] = f'Bearer {token}'
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(self.origin + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(r, timeout=timeout) as res:
                return json.loads(res.read() or b'{}')
        except urllib.error.HTTPError as e:
            out = json.loads(e.read() or b'{}')
            out['__status'] = e.code
            return out

    def get(self, path, token=None):
        return self.req('GET', path, token=token)

    def post(self, path, body=None, token=None):
        return self.req('POST', path, body or {}, token=token)

    def me(self, token):
        return self.get('/v1/me', token=token).get('account')


# ---------------------------------------------------------------- a local Firebase key set + signer
def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


class KeyServer:
    """Serves a JWK set on loopback (FIREBASE_JWKS_URL) and signs Firebase-style ID tokens with its private key."""

    def __init__(self, port=8796, kid='e2e-key'):
        from cryptography.hazmat.primitives.asymmetric import rsa
        self.port, self.kid = port, kid
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        n = self.key.public_key().public_numbers().n
        self.jwk = {'kty': 'RSA', 'n': b64u(n.to_bytes((n.bit_length() + 7) // 8, 'big')), 'e': b64u((65537).to_bytes(3, 'big')),
                    'kid': kid, 'alg': 'RS256', 'use': 'sig'}
        self.fetches = 0
        body = json.dumps({'keys': [self.jwk]}).encode()
        outer = self

        class H(BaseHTTPRequestHandler):
            def do_GET(self):
                outer.fetches += 1
                self.send_response(200)
                self.send_header('content-type', 'application/json')
                self.send_header('cache-control', 'public, max-age=300')
                self.send_header('content-length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, *a):
                pass
        self.httpd = ThreadingHTTPServer(('127.0.0.1', port), H)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.url = f'http://127.0.0.1:{port}/jwks'

    def close(self):
        self.httpd.shutdown()

    def sign(self, email, other_key=False, **over):
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding, rsa
        t = int(time.time())
        uid = b64u(email.encode())[:28]
        claims = {'iss': 'https://securetoken.google.com/yichen-5e23e', 'aud': 'yichen-5e23e', 'auth_time': t - 5, 'user_id': uid,
                  'sub': uid, 'iat': t - 5, 'exp': t + 3600, 'email': email, 'email_verified': True,
                  'firebase': {'identities': {'email': [email]}, 'sign_in_provider': 'emailLink'}, **over}
        head = b64u(json.dumps({'alg': 'RS256', 'kid': self.kid, 'typ': 'JWT'}).encode())
        payload = b64u(json.dumps(claims).encode())
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048) if other_key else self.key
        sig = key.sign(f'{head}.{payload}'.encode(), padding.PKCS1v15(), hashes.SHA256())
        return f'{head}.{payload}.{b64u(sig)}'


# ---------------------------------------------------------------- a local stand-in for Resend's HTTP API
class FakeResend:
    """POST /emails on loopback, as the dealer calls it with EMAIL_SENDER=resend (RESEND_API_URL, test hooks only):
    keeps every request (headers + JSON body) and answers like Resend, 200 {id} by default or the next planned
    answer (fail(status, ...), slow(seconds, status)). The key it expects is a made-up one in a temp file
    (RESEND_API_KEY_FILE); nothing here reaches the network.

        mail = FakeResend(); svc = Service(email_link=True, env=mail.env())
        mail.calls        [{'headers': {...}, 'body': {...}}]
        mail.link(0)      -> ({'url', 'lid', 't', 'lang'}, None) or (None, 'why')"""

    def __init__(self, port=0):
        self.calls = []
        self.plan = []
        self.key = 're_harness_' + b64u(os.urandom(12))
        fd, self.key_file = tempfile.mkstemp(prefix='hd-resend-key-')
        with os.fdopen(fd, 'w') as f:
            f.write(self.key + '\n')
        outer = self

        class H(BaseHTTPRequestHandler):
            def do_POST(self):
                raw = self.rfile.read(int(self.headers.get('content-length') or 0))
                try:
                    body = json.loads(raw or b'{}')
                except ValueError:
                    body = None
                outer.calls.append({'path': self.path, 'headers': {k.lower(): v for k, v in self.headers.items()}, 'body': body,
                                    'at': time.time()})
                status, extra, out, delay = outer.plan.pop(0) if outer.plan else (200, {}, None, 0)
                if delay:
                    time.sleep(delay)
                if out is None:
                    out = {'id': f'em_{len(outer.calls)}'}
                data = json.dumps(out).encode()
                self.send_response(status)
                self.send_header('content-type', 'application/json')
                for k, v in extra.items():
                    self.send_header(k, v)
                self.send_header('content-length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *a):
                pass
        # a free port by default (a fixed one may be taken by something else on this machine)
        self.httpd = ThreadingHTTPServer(('127.0.0.1', port), H)
        self.port = self.httpd.server_address[1]
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.url = f'http://127.0.0.1:{self.port}'

    def env(self):
        return {'EMAIL_SENDER': 'resend', 'RESEND_API_URL': self.url, 'RESEND_API_KEY_FILE': self.key_file}

    def fail(self, status, retry_after=None, name='application_error', times=1):
        extra = {'retry-after': str(retry_after)} if retry_after else {}
        for _ in range(times):
            self.plan.append((status, extra, {'statusCode': status, 'name': name, 'message': 'planned failure'}, 0))

    def slow(self, seconds, status=200, name='application_error'):
        """The next answer comes after `seconds` (200 {id}, or a failure with that status)."""
        self.plan.append((status, {}, None if status == 200 else {'statusCode': status, 'name': name, 'message': 'planned failure'}, seconds))

    def link(self, i):
        """The sign-in link of email i, the same in its text and HTML parts."""
        if i >= len(self.calls) or not isinstance(self.calls[i]['body'], dict):
            return None, f'no email {i} (got {len(self.calls)})'
        b = self.calls[i]['body']
        m = re.search(r'https://\S+account-link\.html\?\S+', b.get('text') or '')
        if not m:
            return None, 'no link in the text part'
        url = m.group(0)
        if url.replace('&', '&amp;') not in (b.get('html') or ''):
            return None, 'the HTML part has another link'
        q = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).query))
        return {'url': url, 'lid': q.get('lid', ''), 't': q.get('t', ''), 'lang': q.get('lang', '')}, None

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        with contextlib.suppress(OSError):
            os.unlink(self.key_file)


# ---------------------------------------------------------------- players
DOM_JS = """(()=>{const q=s=>document.querySelector(s);
 return {screen:document.body.dataset.screen||'', acts:[...document.querySelectorAll('.hd-actions [data-act]')].map(b=>b.dataset.act),
   busy:!!q('.hd-actions .is-busy'), stale:!!q('.hd-stage.is-stale'), status:(q('.hd-status')||{}).textContent||'',
   panel:!!q('.hd-raise-panel'), popup:!!q('.gd-popup-layer.is-open'), amount:!!q('.gd-popup-layer.is-open .hd-amount'),
   confirm:!!q('.gd-popup-layer.is-open [data-confirm="1"]'), mine:(q('.hd-mineplate')||{}).textContent||'',
   url:location.search}})()"""


class Player(HSession):
    """One person: a browser context with its own localStorage (account token) and every frame it receives."""
    alive = []      # every player not yet closed (close_all() between scenarios: an old page would reconnect to
                    # the next scenario's service on the same port and recreate its account there)

    def __init__(self, br, vp, name, svc, client=None, lang='zh', tag=None):
        super().__init__(br, vp, tag or f'{name}-{vp}', svc)
        Player.alive.append(self)
        self.name, self.lang = name, lang
        self.client = client if client is not None else f'c_{name.lower()}'
        self.frames = []      # [(t, raw text)]
        self.sent = []
        self.console = []     # [(t, text)]
        self.snap = None     # latest parsed state frame
        self.pid = None
        self.acted = 0
        self.notes = []
        self.done = {}
        self.paused = False

    async def open(self, query='', wait=1500, client=..., name=..., game='holdem', local=None):
        client = self.client if client is ... else client
        name = self.name if name is ... else name
        await self.new_page(client=client, name=name, lang=self.lang, game=game, local=local)
        self.pg.on('websocket', self._on_ws)
        self.pg.on('console', lambda m: self.console.append((time.time(), m.text)) if m.type == 'error' else None)
        self.pg.on('pageerror', lambda e: self.console.append((time.time(), f'PAGEERROR: {e}')))
        await self.pg.goto(gdh.URL + query, wait_until='load')
        await self.pg.wait_for_timeout(wait)
        return self

    def _on_ws(self, ws):
        if '/v1/ws' not in ws.url:
            return

        def rx(payload):
            if isinstance(payload, bytes):
                payload = payload.decode('utf8', 'replace')
            t = time.time()
            self.frames.append((t, payload))
            try:
                m = json.loads(payload)
            except Exception:
                return
            if m.get('t') == 'state':
                self.snap = m
                h = m['table'].get('hand')
                if h and h.get('done') and h.get('winners'):
                    self.done[h['id']] = h
            elif m.get('t') == 'welcome':
                self.pid = (m.get('account') or {}).get('pid')
        ws.on('framereceived', rx)
        ws.on('framesent', lambda p: self.sent.append((time.time(), p)))

    @classmethod
    async def close_all(cls):
        for p in cls.alive:
            with contextlib.suppress(Exception):
                if p.ctx:
                    await p.ctx.close()
            p.ctx = p.pg = None
        cls.alive = []

    # ---- reading
    async def dom(self):
        return await self.pg.evaluate(DOM_JS)

    @property
    def hand(self):
        return ((self.snap or {}).get('table') or {}).get('hand')

    @property
    def seat(self):
        return ((self.snap or {}).get('me') or {}).get('seat')

    @property
    def code(self):
        return ((self.snap or {}).get('table') or {}).get('code')

    async def token(self):
        return await self.pg.evaluate("localStorage.getItem('picasso.games.token')")

    def hands_done(self):
        """Hands this page saw finish (winners known): {hand id: hand}."""
        return self.done

    def console_errors(self, svc=None):
        """Console errors that are not the expected refused reconnects while the service was down."""
        wins = [(a - 1, b + 20) for a, b in (svc.windows if svc else [])]
        if svc and svc.down_since:
            wins.append((svc.down_since - 1, time.time() + 1))
        bad = []
        for t, text in self.console:
            if any(a <= t <= b for a, b in wins) and any(n in text for n in NET_NOISE):
                continue
            bad.append(text)
        return bad

    def noise(self):
        return sum(1 for _, t in self.console if any(n in t for n in NET_NOISE))

    # ---- acting through the real UI (taps on phones)
    async def tap(self, selector, timeout=4000):
        await self.press(selector, timeout=timeout)

    async def close_popups(self):
        for _ in range(4):
            if not await self.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open')"):
                return
            await self.pg.keyboard.press('Escape')
            await self.pg.wait_for_timeout(250)

    async def step(self, policy):
        """One look at the table; acts when the pills are up. Returns the action taken or None."""
        d = await self.dom()
        if d['amount']:
            # the rebuy popup after busting: take it (play goes on)
            await self.tap('.gd-popup-layer.is-open [data-ok]')
            await self.pg.wait_for_timeout(300)
            return 'rebuy'
        if d['popup'] or d['screen'] != 'htable' or d['stale'] or d['busy']:
            return None
        acts = [a for a in d['acts'] if a != 'show']
        if not acts:
            return None
        choice = policy(self, acts)
        if not choice:
            return None
        if choice.startswith('raise') and 'raise' in acts:
            preset = choice.split(':')[1] if ':' in choice else 'min'
            await self.tap('[data-act=raise]')
            await self.pg.wait_for_selector('.hd-raise-panel', timeout=3000)
            sel = f'[data-preset="{preset}"]'
            if await self.pg.evaluate(f"!!document.querySelector('{sel}:disabled')"):
                sel = '[data-preset="min"]'
            await self.tap(sel)
            await self.pg.wait_for_timeout(120)
            await self.tap('[data-act=confirm]')
        elif choice == 'allin' and ('allin' in acts or 'raise' in acts):
            if 'allin' in acts:
                await self.tap('[data-act=allin]')
            else:
                await self.tap('[data-act=raise]')
                await self.pg.wait_for_selector('.hd-raise-panel', timeout=3000)
                await self.tap('[data-preset="max"]')
                await self.pg.wait_for_timeout(120)
                await self.tap('[data-act=confirm]')
        else:
            if choice not in acts:
                choice = 'check' if 'check' in acts else 'call' if 'call' in acts else acts[0]
            await self.tap(f'[data-act={choice}]')
        self.acted += 1
        return choice

    async def autoplay(self, policy, until, pause=.25):
        """Acts whenever it is this player's turn until until() is true."""
        while not until():
            if self.paused:
                await asyncio.sleep(pause)
                continue
            try:
                await self.step(policy)
            except Exception as e:      # the pills changed under the tap (a new state): look again
                self.notes.append(type(e).__name__)
            await asyncio.sleep(pause)


# ---------------------------------------------------------------- decision policies
def station(p, acts):
    return 'check' if 'check' in acts else 'call' if 'call' in acts else acts[0]


def mixed(p, acts):
    """Mostly calls; a pot-ish raise through the panel now and then; folds a few."""
    p.acted_seen = getattr(p, 'acted_seen', 0) + 1
    k = p.acted_seen
    if 'raise' in acts and k % 6 == 2:
        return 'raise:p12'
    if 'call' in acts and k % 9 == 8:
        return 'fold'
    return station(p, acts)


def pusher(p, acts):
    return 'allin' if ('allin' in acts or 'raise' in acts) else station(p, acts)


def idle(p, acts):
    return None


# ---------------------------------------------------------------- the frame checker
def cards_in(x, out):
    if isinstance(x, str):
        if CARD_RE.match(x):
            out.add(x)
    elif isinstance(x, list):
        for y in x:
            cards_in(y, out)
    elif isinstance(x, dict):
        for y in x.values():
            cards_in(y, out)
    return out


def _truth_for(svc, hid, seat, cards):
    """True when some dealt version of hand hid gave `seat` exactly these cards."""
    return any(v['holes'].get(str(seat)) == list(cards) for v in svc.truth.get(hid, []))


def check_frames(players, svc):
    """Every frame every page received, against what the dealer really dealt. Returns a report with violations."""
    svc.collect() if svc.up else None
    report = {'frames': 0, 'states': 0, 'violations': [], 'hands': set(), 'showdowns': set(), 'sidepots': set(), 'runouts': set()}

    def bad(p, why, raw):
        if len(report['violations']) < 30:
            report['violations'].append(f'{p.tag}: {why} :: {raw[:240]}')

    for p in players:
        pid = None
        for _, raw in p.frames:
            report['frames'] += 1
            m = json.loads(raw)
            found = cards_in(m, set())
            if m.get('t') == 'welcome':
                pid = m['account']['pid']
            if m.get('t') != 'state':
                if found:
                    bad(p, f'cards in a {m.get("t")} frame: {sorted(found)}', raw)
                continue
            report['states'] += 1
            tb, me, h = m['table'], m.get('me') or {}, m['table'].get('hand')
            allowed = set()
            if h:
                hid = h['id']
                report['hands'].add(hid)
                if len(h['pots']) > 1:
                    report['sidepots'].add(hid)
                allowed |= set(h['board'])
                if hid not in svc.truth:
                    bad(p, f'no dealer record for hand {hid}', raw)
                live = [s for s in tb['seats'] if s and s.get('inHand')]
                runout = len(live) >= 2 and sum(1 for s in live if s['state'] != 'allin') <= 1 and h['toAct'] is None
                for q, s in enumerate(tb['seats']):
                    if not s or not s.get('shown'):
                        continue
                    shown = s['shown']
                    voluntary = (s.get('last') or {}).get('a') == 'show'
                    if not _truth_for(svc, hid, q, shown):
                        bad(p, f'seat {q} shown {shown} is not what it was dealt', raw)
                    folded = any(q in v['folded'] or q in v['mucked'] for v in svc.truth.get(hid, []))
                    if folded and not any(q in v['showed'] for v in svc.truth.get(hid, [])):
                        bad(p, f'seat {q} folded or mucked but its cards are shown', raw)
                    if not (h['street'] == 'showdown' or h['done'] or voluntary or runout):
                        bad(p, f'seat {q} shown while betting is open ({h["street"]})', raw)
                    if h['street'] != 'showdown' and not h['done']:
                        report['runouts'].add(hid)
                    allowed |= set(shown)
                for w in h.get('winners') or []:
                    if w.get('hand'):
                        report['showdowns'].add(hid)
                        s = tb['seats'][w['seat']] if w['seat'] < len(tb['seats']) else None
                        mine = me.get('seat') == w['seat'] and me.get('hole')
                        own = set((s or {}).get('shown') or []) | (set(me['hole']) if mine else set())
                        extra = set(w['hand']['cards']) - set(h['board']) - own
                        if extra:
                            bad(p, f'winner {w["seat"]} best five has unshown cards {sorted(extra)}', raw)
            if me.get('hole'):
                if not h:
                    bad(p, 'own hole cards without a hand', raw)
                elif me.get('seat') is None or not _truth_for(svc, h['id'], me['seat'], me['hole']):
                    bad(p, f'own hole {me["hole"]} is not what seat {me.get("seat")} was dealt', raw)
                else:
                    rec = next(v for v in svc.truth[h['id']] if v['holes'].get(str(me['seat'])) == me['hole'])
                    if pid and rec['pids'].get(str(me['seat'])) != pid:
                        bad(p, f'hole cards of seat {me["seat"]} sent to another account', raw)
                allowed |= set(me['hole'])
            if me.get('best'):
                if not set(me['best']['cards']) <= set(me.get('hole') or []) | set((h or {}).get('board') or []):
                    bad(p, 'best five uses cards beyond my hole and the board', raw)
            last = tb.get('last')
            if last:
                lid = f'{tb["code"]}-{last["no"]}'
                allowed |= set(last['board'])
                for q, c in (last.get('shown') or {}).items():
                    if lid in svc.truth and not _truth_for(svc, lid, q, c):
                        bad(p, f'last hand: seat {q} shown {c} is not what it was dealt', raw)
                    folded = any(int(q) in v['folded'] or int(q) in v['mucked'] for v in svc.truth.get(lid, []))
                    if folded and not any(int(q) in v['showed'] for v in svc.truth.get(lid, [])):
                        bad(p, f'last hand: folded seat {q} shown', raw)
                    allowed |= set(c)
            leak = found - allowed
            if leak:
                bad(p, f'cards the page may not see: {sorted(leak)}', raw)
    for k in ('hands', 'showdowns', 'sidepots', 'runouts'):
        report[k] = len(report[k])
    return report


def done_hands(players):
    seen = {}
    for p in players:
        seen.update(p.hands_done())
    return seen


@contextlib.asynccontextmanager
async def browser():
    async with async_playwright() as pw:
        br = await pw.chromium.launch(args=LAUNCH_ARGS)
        try:
            yield br
        finally:
            await br.close()


async def until(pred, timeout, step=.25):
    """Waits for an async or plain predicate; returns its last value."""
    t0 = time.time()
    while True:
        v = pred()
        if asyncio.iscoroutine(v):
            v = await v
        if v or time.time() - t0 > timeout:
            return v
        await asyncio.sleep(step)
