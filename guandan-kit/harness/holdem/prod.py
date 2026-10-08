"""Hold'em end to end against the DEPLOYED dealer (https://poker.picasso-lab.com on picasso, behind the FRAS Caddy).

The page is served from this checkout as https://yil384.github.io/Picasso-Lab/** (gdh routing, Firebase RTDB stubbed in
memory, production Firebase / Supabase aborted), but unlike e2e.py the games service is NOT stubbed or redirected: the
page uses its built-in origin, so REST calls and the table socket go to the real service over the internet. Restarts
are done on picasso over ssh (docker compose stop / kill -s SIGKILL / start in ~/workspace/holdem-dealer).

Production has no test hooks (no rigged decks, no dealt-cards record), so the frame checker here works from the frames
alone: every card a page receives must be the board, its own seat's hole cards, or cards the rules expose (showdown,
all-in run-out, a voluntary show, the last hand); a seat's hole cards go to one account only and never change within
a hand; shown cards of a human seat equal what its owner was dealt; no card sits in two places in one hand; folded
hands are never shown; winners' best five use shown cards only.

Usage: python3 prod.py [scenario ...]      (no argument: all, in this order)
  checker   the truth-free frame checker catches planted leaks (no network)
  latency   socket ping round trips through Caddy (30), REST round trips (20)
  heads     2 seats, Ann desk + Bo phone: hands to showdowns, Bo reloads mid-hand (waiting, then on his turn)
  headsai   2 seats, Di desk against one AI
  six       6 seats: Ann desk, Bo portrait, Cy ifr + 3 AI; Cy leaves mid-hand
  sidepots  Ann 2,000 / Bo 1,400 / Cy 800 all in: a main pot and a side pot, run-out, rebuy, chips conserved
  restart   Ann desk, Bo portrait, Cy phone + 3 AI + a spectator; the real service stopped gracefully, then killed
            (SIGKILL) mid-hand: pages reconnect, the hand is called off with every chip back, play goes on
Env: HD_PROD_ORIGIN (default https://poker.picasso-lab.com), HD_PROD_SSH (default picasso),
     HD_PROD_DIR (default ~/workspace/holdem-dealer). Every scenario adds guest accounts to the live service (about
     16 for a full run; the per-network limit is 30 an hour)."""
import asyncio, contextlib, json, os, statistics, subprocess, sys, time, urllib.error, urllib.request
import hdh, gdh
import live
from live import Player, browser, until, log, station, mixed, pusher, cards_in
import e2e
from e2e import Scenario, RESULTS, host_table, join, start, playing, play, showdowns, leave_all, fill_bots, seats_of

ORIGIN = os.environ.get('HD_PROD_ORIGIN', 'https://poker.picasso-lab.com')
SSH = os.environ.get('HD_PROD_SSH', 'picasso')
RDIR = os.environ.get('HD_PROD_DIR', '~/workspace/holdem-dealer')
# while the service is down on purpose: Chrome's lines for the refused socket and REST calls (Caddy answers 502)
DOWN_NOISE = ('WebSocket connection to', 'status of 502', 'ERR_CONNECTION', 'ERR_FAILED', 'blocked by CORS policy')
LAT = {'act': [], 'reconnect': {}}


# ---------------------------------------------------------------- the deployed service
class ProdService:
    """The live dealer. up is False only inside a restart this script caused; stop / kill9 / start run on picasso."""

    def __init__(self):
        self.origin = ORIGIN
        self.truth = {}
        self.windows = []
        self.down_since = None

    def __enter__(self):
        h = self.get('/v1/health')
        if not h.get('ok'):
            raise RuntimeError(f'the live service is not healthy: {h}')
        return self

    def __exit__(self, *exc):
        if self.down_since:
            self.start()

    @property
    def up(self):
        return self.down_since is None

    def collect(self):
        pass

    def ssh(self, cmd, timeout=60):
        r = subprocess.run(['ssh', SSH, f'cd {RDIR} && {cmd}'], capture_output=True, text=True, timeout=timeout)
        log(f'ssh: {cmd} -> {r.returncode} {(r.stdout + r.stderr).strip()[-200:]}')
        return r

    def stop(self):
        self.down_since = time.time()
        self.ssh('docker compose stop holdem-dealer')

    def kill9(self):
        self.down_since = time.time()
        self.ssh('docker compose kill -s SIGKILL holdem-dealer')

    def crash(self):
        """node dies inside the container (SIGKILL), as in a real crash: tini exits, Docker's restart policy
        (unless-stopped) brings the container back without anyone running a command."""
        self.down_since = time.time()
        self.ssh('docker compose exec -T holdem-dealer sh -c "kill -9 \\$(pidof node)"')

    def restarts(self):
        r = subprocess.run(['ssh', SSH, 'docker inspect -f "{{.RestartCount}}" holdem-dealer-holdem-dealer-1'], capture_output=True, text=True, timeout=30)
        return int(r.stdout.strip() or -1)

    def wait_up(self):
        """Waits for the service to answer again by itself (after crash())."""
        for _ in range(240):
            if self.get('/v1/health').get('ok'):
                break
            time.sleep(.25)
        else:
            raise RuntimeError('the live service did not come back by itself')
        self.windows.append((self.down_since, time.time()))
        self.down_since = None

    def start(self):
        self.ssh('docker compose start holdem-dealer')
        for _ in range(120):
            if self.get('/v1/health').get('ok'):
                break
            time.sleep(.25)
        else:
            raise RuntimeError('the live service did not come back')
        if self.down_since:
            self.windows.append((self.down_since, time.time()))
            self.down_since = None

    def req(self, method, path, body=None, token=None, timeout=10):
        headers = {'content-type': 'application/json'}
        if token:
            headers['authorization'] = f'Bearer {token}'
        data = json.dumps(body).encode() if body is not None else None
        r = urllib.request.Request(self.origin + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(r, timeout=timeout) as res:
                return json.loads(res.read() or b'{}')
        except urllib.error.HTTPError as e:
            try:
                out = json.loads(e.read() or b'{}')
            except Exception:
                out = {}
            out['__status'] = e.code
            return out
        except Exception as e:
            return {'__error': repr(e)}

    def get(self, path, token=None):
        return self.req('GET', path, token=token)

    def post(self, path, body=None, token=None):
        return self.req('POST', path, body or {}, token=token)

    def me(self, token):
        return self.get('/v1/me', token=token).get('account')


async def prod_route(ctx, origin):
    """gdh routing without the games-service stub and without an origin override: the page talks to the real
    service at its built-in origin. Firebase stays stubbed; production Firebase / Supabase are aborted."""
    await gdh.route_context(ctx)
    await ctx.unroute(gdh.GAMES + '**')
    auth = open(os.path.join(gdh.D, 'fb-stub-auth.js')).read()

    async def stub(route):
        await route.fulfill(status=200, body=auth, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})
    await ctx.route('https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js', stub)
    await ctx.route('**/*firebaseio.com*/**', lambda r: r.abort())
    await ctx.route('**/*supabase.co*/**', lambda r: r.abort())

hdh.route_holdem = prod_route     # HSession.new_page looks the name up in hdh at call time


# diagnostics: every request to the service, kept per page, printed when a screen does not come
_new_page = Player.new_page


async def _new_page_tracked(self, *a, **kw):
    pg = await _new_page(self, *a, **kw)
    self.reqs = []
    host = ORIGIN.split('//')[1]
    pg.on('request', lambda r: self.reqs.append((time.time(), r.method, r.url[:100])) if host in r.url else None)
    pg.on('requestfinished', lambda r: self.reqs.append((time.time(), 'done', r.url[:100])) if host in r.url else None)
    pg.on('requestfailed', lambda r: self.reqs.append((time.time(), f'FAILED {r.failure}', r.url[:100])) if host in r.url else None)
    return pg
Player.new_page = _new_page_tracked
_wait_screen = Player.wait_screen


async def _wait_screen_diag(self, name, timeout=8000):
    try:
        return await _wait_screen(self, name, timeout)
    except Exception:
        t = time.time()
        info = await self.pg.evaluate("({screen: document.body.dataset.screen, toast: (document.getElementById('toast')||{}).textContent, "
                                      "shows: [...document.querySelectorAll('.show')].map(e => e.textContent).join('|'), url: location.search, "
                                      "popup: (document.querySelector('.gd-popup-layer.is-open')||{}).textContent})")
        log(f'DIAG {self.tag}: screen {name!r} did not come in {timeout} ms: {json.dumps(info, ensure_ascii=False)[:300]}')
        log(f'DIAG requests (s before now): {[(round(x - t, 2), m, u) for x, m, u in getattr(self, "reqs", [])[-12:]]}')
        log(f'DIAG frames: {[(round(x - t, 2), r[:90]) for x, r in self.frames[-6:]]}')
        log(f'DIAG sent: {[(round(x - t, 2), r[:70]) for x, r in self.sent[-6:]]}')
        log(f'DIAG console: {self.console[-5:]}')
        with contextlib.suppress(Exception):
            await self.shot(f'diag-{name}')
        raise
Player.wait_screen = _wait_screen_diag


def console_errors(p, svc):
    wins = [(a - 1, b + 20) for a, b in svc.windows]
    if svc.down_since:
        wins.append((svc.down_since - 1, time.time() + 1))
    bad, noise = [], 0
    for t, text in p.console:
        if any(a <= t <= b for a, b in wins) and any(n in text for n in DOWN_NOISE):
            noise += 1
            continue
        bad.append(text)
    return bad, noise


# ---------------------------------------------------------------- the frame checker without a dealt-cards record
def check_frames_prod(players):
    rep = {'frames': 0, 'states': 0, 'violations': [], 'hands': set(), 'showdowns': set(), 'sidepots': set(), 'runouts': set(),
           'hole_views': 0, 'shown_views': 0}
    holes = {}      # (hid, seat) -> (cards, pid, tag)
    shown = {}      # (hid, seat) -> cards
    shows = set()   # (hid, seat) that showed voluntarily
    folded = {}     # hid -> {seat}
    boards = {}     # hid -> longest board

    def bad(tag, why, raw=''):
        if len(rep['violations']) < 30:
            rep['violations'].append(f'{tag}: {why} :: {raw[:200]}')

    def note_shown(key, cards, tag, raw):
        prev = shown.get(key)
        if prev is not None and prev != list(cards):
            bad(tag, f'seat {key[1]} of {key[0]} shown as {prev} and as {cards}', raw)
        shown[key] = list(cards)

    for p in players:
        pid = None
        for _, raw in p.frames:
            rep['frames'] += 1
            m = json.loads(raw)
            found = cards_in(m, set())
            if m.get('t') == 'welcome':
                pid = (m.get('account') or {}).get('pid')
            if m.get('t') != 'state':
                if found:
                    bad(p.tag, f'cards in a {m.get("t")} frame: {sorted(found)}', raw)
                continue
            rep['states'] += 1
            tb, me, h = m['table'], m.get('me') or {}, m['table'].get('hand')
            allowed = set()
            if h:
                hid = h['id']
                rep['hands'].add(hid)
                if len(h.get('pots') or []) > 1:
                    rep['sidepots'].add(hid)
                b = list(h['board'])
                old = boards.get(hid, [])
                if b[:len(old)] != old[:len(b)]:
                    bad(p.tag, f'board of {hid} changed: {old} -> {b}', raw)
                if len(b) > len(old):
                    boards[hid] = b
                allowed |= set(b)
                live_seats = [s for s in tb['seats'] if s and s.get('inHand')]
                runout = len(live_seats) >= 2 and sum(1 for s in live_seats if s['state'] != 'allin') <= 1 and h['toAct'] is None
                for q, s in enumerate(tb['seats']):
                    if not s:
                        continue
                    if s.get('state') == 'folded':
                        folded.setdefault(hid, set()).add(q)
                    if not s.get('shown'):
                        continue
                    rep['shown_views'] += 1
                    voluntary = (s.get('last') or {}).get('a') == 'show'
                    if voluntary:
                        shows.add((hid, q))
                    if s.get('state') == 'folded' and not voluntary:
                        bad(p.tag, f'seat {q} folded but its cards are shown', raw)
                    if not (h['street'] == 'showdown' or h['done'] or voluntary or runout):
                        bad(p.tag, f'seat {q} shown while betting is open ({h["street"]})', raw)
                    if h['street'] != 'showdown' and not h['done']:
                        rep['runouts'].add(hid)
                    note_shown((hid, q), s['shown'], p.tag, raw)
                    allowed |= set(s['shown'])
                for w in h.get('winners') or []:
                    if w.get('hand'):
                        rep['showdowns'].add(hid)
                        s = tb['seats'][w['seat']] if w['seat'] < len(tb['seats']) else None
                        mine = me.get('seat') == w['seat'] and me.get('hole')
                        own = set((s or {}).get('shown') or []) | (set(me['hole']) if mine else set())
                        extra = set(w['hand']['cards']) - set(b) - own
                        if extra:
                            bad(p.tag, f'winner {w["seat"]} best five has unshown cards {sorted(extra)}', raw)
            if me.get('hole'):
                rep['hole_views'] += 1
                if not h or me.get('seat') is None:
                    bad(p.tag, 'hole cards without a hand or a seat', raw)
                else:
                    key = (h['id'], me['seat'])
                    prev = holes.get(key)
                    if prev and prev[0] != me['hole']:
                        bad(p.tag, f'hole cards of seat {key[1]} in {key[0]} changed: {prev[0]} -> {me["hole"]}', raw)
                    if prev and pid and prev[1] and prev[1] != pid:
                        bad(p.tag, f'hole cards of seat {key[1]} in {key[0]} went to two accounts ({prev[2]} and {p.tag})', raw)
                    holes[key] = (list(me['hole']), pid, p.tag)
                    allowed |= set(me['hole'])
            if me.get('best'):
                if not set(me['best']['cards']) <= set(me.get('hole') or []) | set((h or {}).get('board') or []):
                    bad(p.tag, 'best five uses cards beyond my hole and the board', raw)
            last = tb.get('last')
            if last:
                lid = f'{tb["code"]}-{last["no"]}'
                allowed |= set(last['board'])
                for q, c in (last.get('shown') or {}).items():
                    note_shown((lid, int(q)), c, p.tag, raw)
                    allowed |= set(c)
            leak = found - allowed
            if leak:
                bad(p.tag, f'cards the page may not see: {sorted(leak)}', raw)
    # across pages: a human seat's shown cards are what its owner was dealt
    for key, c in shown.items():
        if key in holes and holes[key][0] != c:
            bad(holes[key][2], f'seat {key[1]} of {key[0]} shown {c} but dealt {holes[key][0]}')
        if key[1] in folded.get(key[0], set()) and key not in shows:
            bad('all', f'seat {key[1]} of {key[0]} folded, yet shown {c}')
    # one deck per hand: no card in two places
    for hid in set(boards) | {k[0] for k in holes} | {k[0] for k in shown}:
        where = {}
        for c in boards.get(hid, []):
            where.setdefault(c, set()).add('board')
        for (h2, q), (c, _, _) in holes.items():
            if h2 == hid:
                for x in c:
                    where.setdefault(x, set()).add(f'seat{q}')
        for (h2, q), c in shown.items():
            if h2 == hid:
                for x in c:
                    where.setdefault(x, set()).add(f'seat{q}')
        dup = {c: sorted(w) for c, w in where.items() if len(w) > 1}
        if dup:
            bad('all', f'{hid}: a card in two places {dup}')
    rep['dealt_seats_seen'] = len(holes)
    for k in ('hands', 'showdowns', 'sidepots', 'runouts'):
        rep[k] = len(rep[k])
    return rep


def act_latency(players, svc=None):
    """Seconds from each action a page sent to the next frame it received (the service answers every action with a
    state broadcast, or an error). Actions sent within 2 s of a restart this script caused are left out."""
    out = []
    wins = [(a - 2, b + 2) for a, b in (svc.windows if svc else [])]
    for p in players:
        rx = [t for t, _ in p.frames]
        j = 0
        for ts, payload in p.sent:
            try:
                m = json.loads(payload)
            except Exception:
                continue
            if m.get('t') != 'act' or any(a <= ts <= b for a, b in wins):
                continue
            while j < len(rx) and rx[j] < ts:
                j += 1
            if j < len(rx) and rx[j] - ts < 5:
                out.append(rx[j] - ts)
    return out


class ProdScenario(Scenario):
    def frames(self, players, svc=None):
        r = check_frames_prod(players)
        self.check(f'frames: no page received a card it may not see ({r["frames"]} frames, {r["states"]} states, '
                   f'{r["hole_views"]} own-hole views, {r["shown_views"]} shown-seat views, {len(players)} pages)',
                   not r['violations'], '\n    ' + '\n    '.join(r['violations'][:8]) if r['violations'] else '')
        for k in ('hands', 'showdowns', 'sidepots', 'runouts', 'dealt_seats_seen'):
            self.info[k] = max(self.info.get(k, 0), r[k])
        lat = act_latency(players, svc)
        LAT['act'] += lat
        if lat:
            self.info['act_ms_median'] = round(statistics.median(lat) * 1000)
            self.info['act_ms_p95'] = round(sorted(lat)[int(len(lat) * .95) - 1 if len(lat) > 1 else 0] * 1000)
            self.info['act_ms_max'] = round(max(lat) * 1000)
            self.info['acts_timed'] = len(lat)
        return r

    def console(self, players, svc):
        errs, noise = {}, 0
        for p in players:
            b, n = console_errors(p, svc)
            noise += n
            if b:
                errs[p.tag] = b
        n = sum(len(v) for v in errs.values())
        self.check(f'console: zero errors on {len(players)} pages', n == 0, json.dumps({k: v[:3] for k, v in errs.items()}, ensure_ascii=False) if n else '')
        self.info['console_errors'] = n
        self.info['refused_while_down'] = noise


# ---------------------------------------------------------------- scenarios
async def checker(br):
    sc = ProdScenario('checker')

    class Page:
        def __init__(self, tag, frames):
            self.tag, self.frames = tag, [(0, json.dumps(f)) for f in frames]

    def seat(state='playing', shown=None, last=None):
        return {'pid': 'p', 'name': 'x', 'bot': None, 'stack': 900, 'bet': 0, 'state': state, 'connected': True,
                'inHand': state in ('playing', 'allin'), 'shown': shown, 'last': last, 'timeBank': 30}

    def state(seats, me_seat=0, hole=('As', 'Ah'), street='flop', done=False, to_act=1, board=('2c', '3c', '4h'), winners=None, last=None, pid='pa'):
        return {'t': 'state', 'rev': 5, 'me': {'pid': pid, 'seat': me_seat, 'hole': list(hole) if hole else None, 'best': None},
                'table': {'code': 'T', 'seats': seats, 'log': [], 'last': last,
                          'hand': {'id': 'T-1', 'no': 1, 'street': street, 'board': list(board), 'toAct': to_act, 'pots': [], 'winners': winners, 'done': done}}}

    def wel(pid):
        return {'t': 'welcome', 'account': {'pid': pid}}
    good_a = [wel('pa'), state([seat(), seat(), seat('folded')]),
              state([seat('allin', ['As', 'Ah']), seat('allin', ['Kd', 'Kc']), seat('folded')], to_act=None),
              state([seat(), seat(shown=['Kd', 'Kc'], last={'a': 'show', 'amt': None}), seat('folded')], street='showdown', done=True, to_act=None,
                    board=('2c', '3c', '4h', '9s', 'Jd'), winners=[{'seat': 1, 'amt': 100, 'pot': 0, 'hand': {'cards': ['Kd', 'Kc', 'Jd', '9s', '4h']}}])]
    good_b = [wel('pb'), state([seat(), seat(), seat('folded')], me_seat=1, hole=('Kd', 'Kc'), pid='pb')]
    r = check_frames_prod([Page('a', good_a), Page('b', good_b)])
    sc.check('clean synthetic frames pass (two pages)', not r['violations'], r['violations'][:2])
    planted = {
        "another seat's cards shown while betting is open": [Page('a', [wel('pa'), state([seat(), seat(shown=['Kd', 'Kc']), seat('folded')])])],
        'a folded hand shown at the showdown': [Page('a', [wel('pa'), state([seat(), seat(), seat('folded', shown=['7s', '2d'])], street='showdown', done=True, to_act=None)])],
        'a hole card in an account frame': [Page('a', [wel('pa'), {'t': 'account', 'account': {'pid': 'pa', 'note': 'Kd'}}])],
        "another seat's hole as my own (the same cards on two seats)": [Page('a', [wel('pa'), state([seat(), seat(), seat('folded')], hole=('Kd', 'Kc'))]), Page('b', good_b)],
        'one seat\'s hole cards sent to two accounts': [Page('a', good_a[:2]), Page('x', [wel('px'), state([seat(), seat(), seat('folded')], pid='px')])],
        'a card hidden in an unexpected field': [Page('a', [wel('pa'), dict(state([seat(), seat(), seat('folded')]), extra={'deck': ['Qs']})])],
        "a winner's best five with unshown cards": [Page('a', [wel('pa'), state([seat(), seat(), seat('folded')], street='showdown', done=True, to_act=None, board=('2c', '3c', '4h', '9s', 'Jd'),
                                                                     winners=[{'seat': 1, 'amt': 100, 'pot': 0, 'hand': {'cards': ['Kd', 'Kc', 'Jd', '9s', '4h']}}])])],
        'last hand: a folded seat shown': [Page('a', [wel('pa'), state([seat(), seat(), seat('folded')]), state([seat(), seat(), seat()], last={'no': 1, 'board': [], 'shown': {'2': ['7s', '2d']}})])],
        'a human seat shown with other cards than it was dealt': [Page('a', good_a[:2]), Page('b', [wel('pb'), state([seat(), seat(), seat('folded')], me_seat=1, hole=('Kd', 'Kc'), pid='pb'),
                                                                                                state([seat(shown=['As', 'Ad']), seat(), seat('folded')], me_seat=1, hole=('Kd', 'Kc'), pid='pb', street='showdown', done=True, to_act=None)])],
    }
    for what, pages in planted.items():
        r = check_frames_prod(pages)
        sc.check(f'caught: {what}', bool(r['violations']), r['violations'][:1])
    return sc


async def latency(br):
    sc = ProdScenario('latency')
    with ProdService() as svc:
        p = await Player(br, 'desk', 'Lat', svc).open(game='holdem')
        rtts = await p.pg.evaluate("""async (origin) => {
            const ws = new WebSocket(origin.replace('https', 'wss') + '/v1/ws');
            await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
            const out = [];
            for (let i = 0; i < 30; i++) {
                const t0 = performance.now();
                await new Promise(ok => { ws.onmessage = e => { if (JSON.parse(e.data).t === 'pong') ok(); }; ws.send(JSON.stringify({t: 'ping'})); });
                out.push(performance.now() - t0);
            }
            ws.close();
            return out;
        }""", ORIGIN)
        rtts.sort()
        sc.info['ws_ping_ms'] = {'n': len(rtts), 'min': round(rtts[0], 1), 'median': round(statistics.median(rtts), 1), 'p95': round(rtts[int(len(rtts) * .95) - 1], 1), 'max': round(rtts[-1], 1)}
        sc.check('socket ping through Caddy: 30 round trips, median under 150 ms', len(rtts) == 30 and statistics.median(rtts) < 150, sc.info['ws_ping_ms'])
        rest = []
        for _ in range(20):
            t0 = time.time()
            ok = svc.get('/v1/health').get('ok')
            rest.append((time.time() - t0) * 1000)
        rest.sort()
        sc.info['rest_health_ms_new_tls_each'] = {'median': round(statistics.median(rest), 1), 'p95': round(rest[18], 1)}
        sc.check('REST /v1/health answers 200 (20 requests, a new TLS connection each)', ok, sc.info['rest_health_ms_new_tls_each'])
        LAT['ws_ping'] = sc.info['ws_ping_ms']
        sc.console([p], svc)
    return sc


async def heads(br):
    sc = ProdScenario('heads')
    with ProdService() as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b = Player(br, 'phone', 'Bo', svc)
        code = await host_table(a, seats=2)
        sc.check('host: a 2-seat friends table on the live service, host seated', a.snap['table']['settings']['seats'] == 2 and a.seat == 0, code)
        sc.check('guest: joins through the invite link and buys in', await join(b, code))
        await start(a, [a, b])
        await a.shot('prod-heads-start')
        hands = await play([a, b], {'Ann': mixed, 'Bo': mixed}, 3, svc)
        sc.check('3 hands played heads-up', len(hands) >= 3, len(hands))

        async def reload_mid_hand(on_turn):
            ok = await until(lambda: b.hand and not b.hand['done'] and b.hand['board'] and ((b.hand['toAct'] == b.seat) == on_turn), 120, .05)
            b.paused = True
            if not ok:
                return sc.check(f'reload ({"my turn" if on_turn else "waiting"}): reached the moment', False)
            hid, hole = b.hand['id'], b.snap['me']['hole']
            t0 = time.time()
            await b.pg.reload(wait_until='load')
            # a new socket said welcome after the reload, and its state has the same hand and cards
            back = await until(lambda: any(t > t0 and r.startswith('{"t":"welcome"') for t, r in b.frames[-60:]) and b.frames[-1][0] > t0
                               and b.snap and b.hand and b.hand['id'] == hid and b.snap['me'].get('hole'), 15)
            await b.wait_screen('htable', 10000)
            sc.info[f'reload_{"turn" if on_turn else "wait"}_s'] = round(time.time() - t0, 2)
            sc.check(f'reload ({"my turn" if on_turn else "waiting"}): back at the table in the same hand with the same cards ({time.time() - t0:.1f} s)',
                     bool(back) and b.snap['me']['hole'] == hole and b.seat is not None, f'{hid} {hole} -> {b.hand and b.hand["id"]} {b.snap["me"].get("hole")}')
            url = await b.pg.evaluate('location.search')
            sc.check('reload: the URL keeps ?game=holdem&room=', f'room={code}' in url, url)
            if on_turn:
                pills = await until(lambda: b.pg.evaluate("!!document.querySelector('.hd-actions [data-act=fold]') && !document.querySelector('.hd-stage.is-stale')"), 8)
                sc.check('reload on my turn: the pills are back', bool(pills))
                await b.shot('prod-heads-reloaded-turn')
            b.paused = False

        stop = playing([a, b], 99, svc, cap=240)
        tasks = [asyncio.ensure_future(p.autoplay(station, stop)) for p in (a, b)]
        await reload_mid_hand(False)
        await reload_mid_hand(True)
        for t in tasks:
            t.cancel()
        hands = await play([a, b], {'Ann': mixed, 'Bo': station}, 8, svc, extra=lambda: showdowns(done_hands([a, b])) >= 2, cap=420)
        sc.info['hands_played'] = len(hands)
        sc.check('8+ hands to the end, 2+ showdowns', len(hands) >= 8 and showdowns(hands) >= 2, f'{len(hands)} hands, {showdowns(hands)} showdowns')
        await a.shot('prod-heads-end')
        sc.frames([a, b])
        await leave_all([a, b])
        await asyncio.sleep(1.5)
        ma, mb = svc.me(await a.token()), svc.me(await b.token())
        sc.check('both back in the lobby, chips conserved (20,000 between them)', ma['chips'] + mb['chips'] == 20000, f'{ma["chips"]} + {mb["chips"]}')
        sc.check('records: hands counted for both', ma['holdem']['hands'] >= 8 and mb['holdem']['hands'] >= 8, f'{ma["holdem"]} {mb["holdem"]}')
        sc.console([a, b], svc)
    return sc


def done_hands(players):
    return live.done_hands(players)


async def headsai(br):
    sc = ProdScenario('headsai')
    with ProdService() as svc:
        d = await Player(br, 'desk', 'Di', svc).open()
        code = await host_table(d, seats=2)
        sc.check('AI 补位 fills the second seat', await fill_bots(d, 2), [x and x['name'] for x in seats_of(d)])
        await start(d, [d])
        hands = await play([d], {'Di': station}, 5, svc, extra=lambda: showdowns(done_hands([d])) >= 1, cap=300)
        sc.info['hands_played'] = len(hands)
        sc.check('5+ hands against the AI, 1+ showdown', len(hands) >= 5 and showdowns(hands) >= 1, f'{len(hands)} hands, {showdowns(hands)} showdowns')
        await d.shot('prod-headsai')
        sc.frames([d])
        tok = await d.token()
        before = svc.me(tok)['chips']
        await leave_all([d])
        await asyncio.sleep(1.5)
        # the stack at the moment of leaving: the last frame that still had Di seated
        last = next(m for m in (json.loads(r) for _, r in reversed(d.frames) if r.startswith('{"t":"state"')) if (m.get('me') or {}).get('seat') is not None)
        stack = last['table']['seats'][last['me']['seat']]['stack']
        after = svc.me(tok)['chips']
        sc.check('leaving: the stack goes back to the bankroll', after == before + stack, f'{before} + {stack} -> {after}')
        sc.console([d], svc)
    return sc


async def six(br):
    sc = ProdScenario('six')
    with ProdService() as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'portrait', 'Bo', svc), Player(br, 'ifr', 'Cy', svc)
        code = await host_table(a)
        sc.check('guests join (portrait taps, ifr clicks)', await join(b, code) and await join(c, code))
        sc.check('AI 补位 fills the other 3 seats', await fill_bots(a, 6), [x and x['name'] for x in seats_of(a)])
        await a.shot('prod-six-room')
        await start(a, [a, b, c])
        players = [a, b, c]
        hands = await play(players, {}, 4, svc)
        sc.check('4 hands with 3 humans and 3 AI', len(hands) >= 4, len(hands))
        await b.shot('prod-six-portrait')
        stop = playing([a, b], 99, svc, cap=240)
        tasks = [asyncio.ensure_future(p.autoplay(mixed, stop)) for p in (a, b, c)]
        ok = await until(lambda: c.hand and not c.hand['done'] and seats_of(c)[c.seat]['inHand'] and seats_of(c)[c.seat]['state'] == 'playing'
                         and c.hand['toAct'] is not None and c.hand['toAct'] != c.seat and c.hand['board'], 180, .05)
        c.paused = True
        sc.check('leave: reached a hand where Cy is in and not to act', bool(ok))
        token_c = await c.token()
        before = svc.me(token_c)['chips']
        cseat = c.seat
        await c.tap('[data-menu]')
        await c.pg.wait_for_timeout(250)
        await c.tap('[data-m="lobby"]')
        await c.pg.wait_for_selector('.gd-popup-layer.is-open [data-confirm="1"]', timeout=4000)
        stack = seats_of(c)[cseat]['stack']
        hid = c.hand['id']
        await c.tap('.gd-popup-layer.is-open [data-confirm="1"]')
        await c.wait_screen('lobby', 6000)
        sc.check('leave: Cy is back in the lobby with a clean URL', await c.pg.evaluate('location.search') == '')
        folded = await until(lambda: a.hand and a.hand['id'] == hid and seats_of(a)[cseat] and seats_of(a)[cseat]['state'] == 'folded', 5)
        sc.check('leave: the others see Cy fold at once', bool(folded) or (a.hand and a.hand['id'] != hid))
        gone = await until(lambda: a.snap['table']['seats'][cseat] is None, 90)
        sc.check('leave: the seat is empty after the hand', bool(gone))
        after = svc.me(token_c)['chips']
        sc.check('leave: the stack went back to the bankroll', after == before + stack, f'{before} + {stack} -> {after}')
        for t in tasks:
            t.cancel()
        hands = await play([a, b], {}, 8, svc, extra=lambda: showdowns(done_hands(players)) >= 1, cap=480)
        sc.info['hands_played'] = len(hands)
        sc.check('8+ hands, 1+ showdowns', len(hands) >= 8 and showdowns(hands) >= 1, f'{len(hands)} hands, {showdowns(hands)} showdowns')
        sc.frames(players)
        sc.console(players, svc)
    return sc


async def sidepots(br):
    sc = ProdScenario('sidepots')
    with ProdService() as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'phone', 'Bo', svc), Player(br, 'portrait', 'Cy', svc)
        code = await host_table(a, seats=3)
        sc.check('buy-ins 2,000 / 1,400 / 800', await join(b, code, 1400) and await join(c, code, 800))
        st = [x['stack'] for x in seats_of(a)]
        sc.check('stacks staged by the buy-ins', st == [2000, 1400, 800], st)
        players = [a, b, c]
        tokens = [await p.token() for p in players]
        await start(a, players)
        side_seen = []

        async def watch_pots():
            while True:
                t = await c.pg.evaluate("[...document.querySelectorAll('.hd-sidepot')].map(e => e.textContent.replace(/\\s+/g, ' ').trim())")
                if t and t not in side_seen:
                    side_seen.append(t)
                await asyncio.sleep(.1)
        watcher = asyncio.ensure_future(watch_pots())
        hands = await play(players, {n: pusher for n in ('Ann', 'Bo', 'Cy')}, 1, svc, cap=90)
        await asyncio.sleep(.5)
        watcher.cancel()
        h1 = next(iter(hands.values()))
        pots = [p_['amt'] for p_ in h1.get('pots') or []]
        won = sum(w['amt'] for w in h1['winners'])
        sc.check('hand 1: all three all in, a main pot and a side pot (3,600 paid out over pots 0 and 1)', won == 3600 and {w['pot'] for w in h1['winners']} == {0, 1},
                 f'pots {pots}, winners {[(w["seat"], w["pot"], w["amt"]) for w in h1["winners"]]}')
        await c.pg.wait_for_timeout(600)
        await c.shot('prod-sidepot-end')
        st = [x['stack'] for x in seats_of(a)]
        sc.check('hand 1: 4,200 still on the table (600 uncalled back to the big stack)', sum(st) == 4200, st)
        sc.check('the pot pills showed 主池 2,400 and 边池 1 1,200', any('主池 2,400' in ' '.join(x) and '边池 1 1,200' in ' '.join(x) for x in side_seen), side_seen[-3:])
        split = len({w['seat'] for w in h1['winners']}) > 1
        word = await c.pg.evaluate("(document.querySelector('.hd-word-in')||{}).textContent||''")
        sc.info['hand1_winners'] = [(w['seat'], w['pot'], w['amt']) for w in h1['winners']]
        if split and len({w['pot'] for w in h1['winners']}) > 1:
            sc.check('main and side pot to different players is not called a split pot', '平分' not in word, word)
        hands = await play(players, {n: pusher for n in ('Ann', 'Bo', 'Cy')}, 4, svc, cap=240)
        sc.info['hands_played'] = len(hands)
        r = sc.frames(players)
        sc.check('run-outs exposed the all-in hands (frames)', r['runouts'] >= 1, r['runouts'])
        await leave_all(players)
        await asyncio.sleep(1.5)
        total = sum(svc.me(t)['chips'] for t in tokens)
        sc.check('chips conserved: 30,000 across the three bankrolls after leaving (rebuys included)', total == 30000, total)
        sc.console(players, svc)
    return sc


async def restart(br):
    sc = ProdScenario('restart')
    with ProdService() as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'portrait', 'Bo', svc), Player(br, 'phone', 'Cy', svc)
        code = await host_table(a)
        await join(b, code)
        await join(c, code)
        await fill_bots(a, 6)
        players = [a, b, c]
        await start(a, players)
        spec = await Player(br, 'ifr', 'Spec', svc).open(f'?game=holdem&room={code}', wait=1500)
        everyone = [*players, spec]
        await play(players, {}, 2, svc)

        async def all_live(ps):
            for p in ps:
                d = await p.dom()
                if d['stale'] or d['status'] or d['screen'] != 'htable':
                    return False
            return True

        def on_table(snap):
            t = snap['table']
            h = t.get('hand') or {}
            return sum((x['stack'] + x['bet']) for x in t['seats'] if x) + sum(p_['amt'] for p_ in h.get('pots') or []) + (h.get('dead') or 0)

        async def bounce(kind):
            told = {p.tag: '' for p in players}
            back_at = {}

            async def watch_toasts():
                while True:
                    for p in players:
                        with contextlib.suppress(Exception):
                            t = await p.pg.evaluate("[...document.querySelectorAll('.show')].map(e => e.textContent).join(' ')")
                            if '已取消' in t:
                                told[p.tag] = t
                    await asyncio.sleep(.15)
            stop = playing(players, 999, svc, cap=300)
            tasks = [asyncio.ensure_future(p.autoplay(station, stop)) for p in players]
            human = lambda: a.hand and not a.hand['done'] and a.hand['board'] and a.hand['toAct'] is not None and not seats_of(a)[a.hand['toAct']]['bot']
            ok = await until(human, 180, .02)
            if kind in ('kill', 'crash'):
                actor = next(p for p in players if p.seat == a.hand['toAct'])
                for p in players:
                    p.paused = p is not actor
                before = actor.acted
                await until(lambda: actor.acted > before, 30, .01)
                restarts0 = await asyncio.to_thread(svc.restarts) if kind == 'crash' else 0
                await asyncio.to_thread(svc.kill9 if kind == 'kill' else svc.crash)
            else:
                for p in players:
                    p.paused = True
                await asyncio.to_thread(svc.stop)
            for t in tasks:
                t.cancel()
            for p in players:
                p.paused = False
            sc.check(f'{kind}: stopped mid-hand with a human to act', bool(ok))
            hid, hno = a.hand['id'], a.hand['no']
            chips_before = on_table(a.snap)
            watcher = asyncio.ensure_future(watch_toasts())
            t_down = time.time()
            await asyncio.sleep(.6 if kind == 'crash' else 1.2)
            pills = [await p.pg.evaluate("(document.querySelector('.hd-status')||{}).textContent||''") for p in everyone]
            stale = [await p.pg.evaluate("!!document.querySelector('.hd-stage.is-stale')") for p in everyone]
            sc.check(f'{kind}: every page shows 重新连接中… and disables the pills', all('重新连接' in x for x in pills) and all(stale), pills)
            await b.shot(f'prod-restart-{kind}-down')

            async def all_live_timed():
                for p in everyone:
                    if p.tag not in back_at:
                        d = await p.dom()
                        if not (d['stale'] or d['status'] or d['screen'] != 'htable'):
                            back_at[p.tag] = time.time()
                return len(back_at) == len(everyone)
            if kind == 'crash':
                t0 = t_down
                await asyncio.to_thread(svc.wait_up)
                up_s = time.time() - t0
                sc.check('crash: Docker restarted the container by itself (restart count +1)', await asyncio.to_thread(svc.restarts) == restarts0 + 1)
            else:
                await asyncio.sleep(1.5)
                t0 = time.time()
                await asyncio.to_thread(svc.start)
                up_s = time.time() - t0
            live_ok = await until(all_live_timed, 40, .1)
            rs = time.time() - t0
            per_page = sorted(round(v - t0, 1) for v in back_at.values())
            LAT['reconnect'][kind] = {'service_healthy_s': round(up_s, 1), 'pages_live_s': per_page}
            since = 'the kill' if kind == 'crash' else 'the start command'
            sc.check(f'{kind}: every page reconnects (pages live {per_page} s after {since}, service healthy after {up_s:.1f} s)', bool(live_ok),
                     [await p.dom() for p in everyone] if not live_ok else '')
            voided = [p.snap['table'].get('voided') for p in everyone]
            sc.check(f'{kind}: the hand in progress (#{hno}) was called off on every page', all(v == hno for v in voided), voided)
            await until(lambda: all(told.values()), 5, .2)
            watcher.cancel()
            sc.check(f'{kind}: the players in it are told (已取消, chips back)', all('已取消' in x for x in told.values()), told)
            chips_after = on_table(a.snap)
            sc.check(f'{kind}: every chip on the table is back on the seats ({chips_before} -> {chips_after})', chips_after == chips_before)
            stop = playing(players, 999, svc, cap=300)
            tasks = [asyncio.ensure_future(p.autoplay(station, stop)) for p in players]
            fin = await until(lambda: all(any(h['no'] > hno for h in p.done.values()) for p in everyone), 120)
            sc.check(f'{kind}: play goes on: a new hand finishes on every page', bool(fin), [sorted(h['no'] for h in p.done.values())[-2:] for p in everyone])
            sc.check(f'{kind}: the called-off hand never finishes anywhere', not any(hid in p.done for p in everyone))
            agree = await until(lambda: len({p.snap['rev'] for p in everyone}) == 1 and len({json.dumps(p.snap['table']['seats']) for p in everyone}) == 1, 15, .1)
            sc.check(f'{kind}: all pages agree on the table afterwards', bool(agree), [p.snap['rev'] for p in everyone])
            for t in tasks:
                t.cancel()

        await bounce('graceful')
        await play(players, {}, len(done_hands(players)) + 1, svc)
        await bounce('kill')
        await play(players, {}, len(done_hands(players)) + 1, svc)
        await bounce('crash')
        hands = await play(players, {}, len(done_hands(players)) + 2, svc)
        sc.info['hands_played'] = len(hands)
        sc.info['reconnect'] = LAT['reconnect']
        sc.frames(everyone, svc)
        sc.console(everyone, svc)
    return sc


# ---------------------------------------------------------------- where do slow moments come from?
PINGER_JS = """async ([origin, token, secs]) => {
    const ws = new WebSocket(origin.replace('https', 'wss') + '/v1/ws');
    await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
    ws.send(JSON.stringify({t: 'hello', v: 1, token}));
    const out = [], t0 = Date.now();
    while (Date.now() - t0 < secs * 1000) {
        const s = performance.now();
        await new Promise(ok => { ws.onmessage = e => { if (JSON.parse(e.data).t === 'pong') ok(); }; ws.send(JSON.stringify({t: 'ping'})); });
        out.push([Date.now(), performance.now() - s]);
        await new Promise(ok => setTimeout(ok, 200));
    }
    ws.close();
    return out;
}"""
# the same pinger inside the container, on loopback (no internet, no Caddy): the service's own share of a delay
SERVER_PINGER = r"""
const WebSocket = require('ws');
const secs = +process.env.SECS;
(async () => {
  const r = await fetch('http://127.0.0.1:8787/v1/session', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({clientId: 'c_loop_pinger', name: 'LoopPinger'})});
  const {token} = await r.json();
  const ws = new WebSocket('ws://127.0.0.1:8787/v1/ws', {origin: 'https://yil384.github.io'});
  await new Promise((ok, no) => { ws.on('open', ok); ws.on('error', no); });
  ws.send(JSON.stringify({t: 'hello', v: 1, token}));
  const out = [], t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    const s = process.hrtime.bigint();
    await new Promise(ok => { const h = d => { if (JSON.parse(d).t === 'pong') { ws.off('message', h); ok(); } }; ws.on('message', h); ws.send(JSON.stringify({t: 'ping'})); });
    out.push([Date.now(), Number(process.hrtime.bigint() - s) / 1e6]);
    await new Promise(ok => setTimeout(ok, 200));
  }
  ws.close();
  console.log(JSON.stringify(out));
})().catch(e => { console.error(e.message); process.exit(1); });
"""


def slow_acts(players, svc, over=.3):
    out = []
    wins = [(a - 2, b + 2) for a, b in svc.windows]
    for p in players:
        rx = p.frames
        j = 0
        for ts, payload in p.sent:
            m = json.loads(payload) if payload.startswith('{') else {}
            if m.get('t') != 'act' or any(a <= ts <= b for a, b in wins):
                continue
            while j < len(rx) and rx[j][0] < ts:
                j += 1
            if j < len(rx) and over <= rx[j][0] - ts < 5:
                out.append((ts, p.tag, round((rx[j][0] - ts) * 1000), m.get('action'), rx[j][1][:60]))
    return sorted(out)


def summary(xs):
    v = sorted(x for _, x in xs)
    return {'n': len(v), 'median': round(statistics.median(v), 1), 'p99': round(v[int(len(v) * .99) - 1], 1), 'max': round(v[-1], 1)} if v else {}


async def stalls(br):
    """A 6-seat game (3 humans + 3 AI) for about two minutes while a page pings the service through Caddy every
    200 ms and a pinger inside the container pings it on loopback: a slow action that shows in the page's pings
    but not on loopback is the network, one that shows on loopback too is the service."""
    sc = ProdScenario('stalls')
    secs = int(os.environ.get('HD_STALL_SECS', '120'))
    with ProdService() as svc:
        pg = await Player(br, 'desk', 'Pinger', svc).open()
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'portrait', 'Bo', svc), Player(br, 'phone', 'Cy', svc)
        code = await host_table(a)
        await join(b, code)
        await join(c, code)
        await fill_bots(a, 6)
        players = [a, b, c]
        await start(a, players)
        await asyncio.sleep(.5)
        tok = await pg.pg.evaluate("localStorage.getItem('picasso.games.token')")
        if not tok:
            r = svc.post('/v1/session', {'clientId': 'c_pinger', 'name': 'Pinger'})
            tok = r.get('token')
        server = asyncio.ensure_future(asyncio.to_thread(subprocess.run, ['ssh', SSH, f'cd {RDIR} && docker compose exec -T -e SECS={secs} holdem-dealer node -'],
                                                         input=SERVER_PINGER, capture_output=True, text=True, timeout=secs + 60))
        client = asyncio.ensure_future(pg.pg.evaluate(PINGER_JS, [ORIGIN, tok, secs]))
        t0 = time.time()
        await play(players, {}, 999, svc, cap=secs)
        cpings = await client
        sres = await server
        try:
            spings = json.loads(sres.stdout.strip().splitlines()[-1])
        except Exception:
            spings = []
            log(f'server pinger: {sres.returncode} {sres.stderr[-300:]}')
        cp = [(t / 1000, x) for t, x in cpings]
        sp = [(t / 1000, x) for t, x in spings]
        sc.info['client_ping_ms'] = summary(cp)
        sc.info['loopback_ping_ms'] = summary(sp)
        sc.info['client_ping_over_300ms'] = [(time.strftime('%H:%M:%S', time.localtime(t)), round(x)) for t, x in cp if x > 300]
        sc.info['loopback_ping_over_50ms'] = [(time.strftime('%H:%M:%S', time.localtime(t)), round(x)) for t, x in sp if x > 50]
        slow = slow_acts(players, svc)
        sc.info['acts_over_300ms'] = [(time.strftime('%H:%M:%S', time.localtime(t)), tag, ms, act, nxt) for t, tag, ms, act, nxt in slow]
        sc.info['hands_played'] = len(done_hands(players))
        sc.check(f'pings during play: {len(cp)} through Caddy and {len(sp)} on loopback', len(cp) > secs * 3 and len(sp) > secs * 3, (len(cp), len(sp)))
        sc.frames(players, svc)
        sc.console(players + [pg], svc)
    return sc


SCENARIOS = {'checker': checker, 'latency': latency, 'heads': heads, 'headsai': headsai, 'six': six, 'sidepots': sidepots, 'restart': restart, 'stalls': stalls}


async def main(names):
    async with browser() as br:
        for n in names:
            log(f'===== {n}')
            try:
                await SCENARIOS[n](br)
            except Exception as e:
                import traceback
                traceback.print_exc()
                sc = RESULTS.get(n) or ProdScenario(n)
                sc.check('scenario ran to the end', False, repr(e))
            finally:
                await Player.close_all()
    ok = True
    for n, sc in RESULTS.items():
        print(json.dumps({'scenario': n, 'pass': sc.passes, 'fail': sc.fails, **sc.info}, ensure_ascii=False))
        ok = ok and not sc.fails
    if LAT['act']:
        lat = sorted(LAT['act'])
        print(json.dumps({'action_to_state_ms': {'n': len(lat), 'median': round(statistics.median(lat) * 1000), 'p95': round(lat[int(len(lat) * .95) - 1] * 1000),
                                                 'max': round(lat[-1] * 1000)}, 'ws_ping': LAT.get('ws_ping'), 'reconnect': LAT['reconnect']}))
    print('ALL PASS' if ok else 'FAILED')
    return ok


if __name__ == '__main__':
    names = sys.argv[1:] or list(SCENARIOS)
    sys.exit(0 if asyncio.run(main(names)) else 1)
