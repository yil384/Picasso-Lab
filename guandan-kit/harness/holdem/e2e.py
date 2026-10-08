"""The Hold'em stack end to end: the real dealer service (events/holdem-dealer, test hooks on), several players in one
browser (one context each; phones tap for real), every received WebSocket frame checked for cards the page may not
see, zero console errors on every page.

Usage: python3 e2e.py [scenario ...]        (no argument: all of them, in this order)
  checker   the frame checker catches planted leaks in synthetic frames (no browser)
  heads     2 seats, two humans (desk + phone): full hands, showdowns, reload mid-hand (waiting and on my turn)
  six       6 seats: 3 humans (desk, portrait, ifr) + 3 AI; one player leaves mid-hand through the menu
  nine      9 seats: 4 humans (hd, phone, portrait, desk) + 5 AI
  sidepots  3 humans all in with 800 / 1,400 / 2,000 on a rigged deck: main pot and side pot to different players
  timeout   a player who never acts: the clock, the time bank, 超时, then 暂离 after two timeouts, 回来 and 补盲
  restart   the service restarts mid-hand, gracefully (SIGTERM) and with kill -9 right after an action
  accounts  continue-as prompt (fresh browsers only, only on click), save with email through account-link.html with a
            locally signed ID token, a protected name reverted, a Guandan round reported once
Prints PASS / FAIL lines and a JSON summary per scenario; screenshots in HD_SHOTS (default /tmp/holdem-shots)."""
import asyncio, json, sys, time
from live import Service, KeyServer, Player, browser, check_frames, done_hands, until, log, station, mixed, pusher, idle, LINK

RESULTS = {}


class Scenario:
    def __init__(self, name):
        self.name, self.fails, self.passes, self.info = name, [], 0, {}
        RESULTS[name] = self

    def check(self, what, ok, detail=''):
        log(('PASS ' if ok else 'FAIL ') + f'[{self.name}] {what}' + (f'  {detail}' if detail != '' else ''))
        if ok:
            self.passes += 1
        else:
            self.fails.append(what)
        return ok

    def frames(self, players, svc):
        r = check_frames(players, svc)
        self.check(f'frames: no page received a card it may not see ({r["frames"]} frames, {r["states"]} states, {len(players)} pages)',
                   not r['violations'], '\n    ' + '\n    '.join(r['violations'][:8]) if r['violations'] else '')
        for k in ('hands', 'showdowns', 'sidepots', 'runouts'):
            self.info[k] = max(self.info.get(k, 0), r[k])
        return r

    def console(self, players, svc):
        errs = {p.tag: p.console_errors(svc) for p in players}
        n = sum(len(v) for v in errs.values())
        self.check(f'console: zero errors on {len(players)} pages', n == 0, json.dumps({k: v[:3] for k, v in errs.items() if v}, ensure_ascii=False) if n else '')
        self.info['console_errors'] = n
        self.info['refused_reconnects'] = sum(p.noise() for p in players)


# ---------------------------------------------------------------- shared steps
async def host_table(p, seats=None, action_sec=None):
    """The 德州扑克 tile opens a friends table; the host sits at seat 0. Returns the table code."""
    await p.tap('.lobby-tile.is-holdem')
    await p.wait_screen('hroom', 10000)
    await until(lambda: p.code, 8)
    if seats:
        for _ in range(12):
            v = await p.pg.evaluate("+(document.querySelector('.hd-step-v')||{}).textContent")
            if v == seats:
                break
            await p.tap(f'.room-step-btn[data-v="{v - 1 if v > seats else v + 1}"]')
            await until(lambda: p.snap['table']['settings']['seats'] != v, 4)
    if action_sec:
        await p.tap(f'[data-set=actionSec][data-v="{action_sec}"]')
        await until(lambda: p.snap['table']['settings']['actionSec'] == action_sec, 4)
    await until(lambda: (p.snap.get('me') or {}).get('seat') is not None, 6)
    return p.code


async def join(p, code, buy_in=None):
    """An invite link, then the first empty seat through the buy-in popup."""
    await p.open(f'?game=holdem&room={code}', wait=600)
    await p.wait_screen('hroom', 10000)
    await p.pg.wait_for_selector('[data-sit]', timeout=6000)
    await p.tap('[data-sit]')
    await p.pg.wait_for_selector('.hd-amount', timeout=4000)
    if buy_in:
        await p.pg.evaluate("v => { const r = document.querySelector('.hd-amount .hd-range'); r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); }", buy_in)
    await p.tap('.hd-amount [data-ok]')
    ok = await until(lambda: (p.snap.get('me') or {}).get('seat') is not None, 6)
    return ok


async def start(host, players):
    await host.tap('[data-host="start"]')
    for p in players:
        await p.wait_screen('htable', 12000)


def playing(players, want, svc, extra=lambda: True, cap=600):
    t0 = time.time()

    def stop():
        n = len(done_hands(players))
        return (n >= want and extra()) or time.time() - t0 > cap or not svc.up
    return stop


async def play(players, policies, want, svc, extra=lambda: True, cap=600):
    stop = playing(players, want, svc, extra, cap)
    await asyncio.gather(*(p.autoplay(policies.get(p.name, mixed), stop) for p in players))
    return done_hands(players)


def showdowns(hands):
    return sum(1 for h in hands.values() if any(w.get('hand') for w in h['winners']))


async def leave_all(players):
    for p in players:
        with_seat = p.seat is not None
        try:
            await p.tap('[data-menu]')
            await p.pg.wait_for_timeout(250)
            await p.tap('[data-m="lobby"]')
            await p.pg.wait_for_timeout(350)
            if await p.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open [data-confirm=\"1\"]')"):
                await p.tap('.gd-popup-layer.is-open [data-confirm="1"]')
            await p.wait_screen('lobby', 6000)
        except Exception as e:
            p.notes.append(f'leave {type(e).__name__} seated={with_seat}')


# ---------------------------------------------------------------- scenarios
async def heads(br):
    sc = Scenario('heads')
    with Service(tag='heads') as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b = Player(br, 'phone', 'Bo', svc)
        code = await host_table(a, seats=2)
        sc.check('host: a 2-seat friends table, host seated', a.snap['table']['settings']['seats'] == 2 and a.seat == 0, code)
        sc.check('guest: joins through the invite link and buys in', await join(b, code))
        await start(a, [a, b])
        await a.shot('heads-start')
        # some hands, then a reload while waiting, then a reload on my turn
        hands = await play([a, b], {'Ann': mixed, 'Bo': mixed}, 4, svc)
        sc.check('4 hands played heads-up', len(hands) >= 4, len(hands))

        async def reload_mid_hand(on_turn):
            # Bo plays on until the moment comes (after the flop, Ann to act / Bo to act), then reloads
            ok = await until(lambda: b.hand and not b.hand['done'] and b.hand['board'] and ((b.hand['toAct'] == b.seat) == on_turn), 90, .05)
            b.paused = True
            if not ok:
                return sc.check(f'reload ({"my turn" if on_turn else "waiting"}): reached the moment', False)
            hid, hole = b.hand['id'], b.snap['me']['hole']
            await b.pg.reload(wait_until='load')
            back = await until(lambda: b.snap and b.hand and b.hand['id'] == hid and b.snap['me'].get('hole'), 15)
            await b.wait_screen('htable', 10000)
            sc.check(f'reload ({"my turn" if on_turn else "waiting"}): back at the table in the same hand with the same cards',
                     bool(back) and b.snap['me']['hole'] == hole and b.seat is not None, f'{hid} {hole} -> {b.hand and b.hand["id"]} {b.snap["me"].get("hole")}')
            url = await b.pg.evaluate('location.search')
            sc.check('reload: the URL keeps ?game=holdem&room=', f'room={code}' in url, url)
            if on_turn:
                pills = await until(lambda: b.pg.evaluate("!!document.querySelector('.hd-actions [data-act=fold]') && !document.querySelector('.hd-stage.is-stale')"), 8)
                sc.check('reload on my turn: the pills are back', bool(pills))
                await b.shot('heads-reloaded-turn')
            b.paused = False

        stop = playing([a, b], 99, svc, cap=200)
        tasks = [asyncio.ensure_future(p.autoplay(station, stop)) for p in (a, b)]
        await reload_mid_hand(False)
        await reload_mid_hand(True)
        for t in tasks:
            t.cancel()
        hands = await play([a, b], {'Ann': mixed, 'Bo': station}, 10, svc, extra=lambda: showdowns(done_hands([a, b])) >= 2)
        sc.info['hands_played'] = len(hands)
        sc.check('10+ hands to the end, 2+ showdowns', len(hands) >= 10 and showdowns(hands) >= 2, f'{len(hands)} hands, {showdowns(hands)} showdowns')
        await a.shot('heads-end')
        sc.frames([a, b], svc)
        # both leave: their stacks go back, chips conserved (no AI at this table)
        await leave_all([a, b])
        await asyncio.sleep(1.5)
        ma, mb = svc.me(await a.token()), svc.me(await b.token())
        sc.check('both back in the lobby, chips conserved (20,000 between them)', ma['chips'] + mb['chips'] == 20000, f'{ma["chips"]} + {mb["chips"]}')
        sc.check('records: hands counted for both', ma['holdem']['hands'] >= 10 and mb['holdem']['hands'] >= 10, f'{ma["holdem"]} {mb["holdem"]}')
        sc.console([a, b], svc)
    return sc


async def fill_bots(host, total):
    await host.tap('[data-host="fillBots"]')
    return await until(lambda: sum(1 for x in host.snap['table']['seats'] if x) == total, 8)


def seats_of(p):
    return p.snap['table']['seats']


async def six(br):
    sc = Scenario('six')
    with Service(tag='six') as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'portrait', 'Bo', svc), Player(br, 'ifr', 'Cy', svc)
        code = await host_table(a)
        sc.check('guests join (portrait taps, ifr clicks)', await join(b, code) and await join(c, code))
        sc.check('AI 补位 fills the other 3 seats', await fill_bots(a, 6), [x and x['name'] for x in seats_of(a)])
        await a.shot('six-room')
        await start(a, [a, b, c])
        players = [a, b, c]
        hands = await play(players, {}, 5, svc)
        sc.check('5 hands with 3 humans and 3 AI', len(hands) >= 5, len(hands))
        await b.shot('six-portrait')
        # Cy leaves in the middle of a hand through ☰ -> 返回大厅 (confirm: folds, chips go back)
        stop = playing([a, b], 99, svc, cap=240)
        tasks = [asyncio.ensure_future(p.autoplay(mixed, stop)) for p in (a, b, c)]
        ok = await until(lambda: c.hand and not c.hand['done'] and seats_of(c)[c.seat]['inHand'] and c.hand['toAct'] != c.seat and c.hand['board'], 120, .05)
        c.paused = True
        sc.check('leave: reached a hand where Cy is in and not to act', bool(ok))
        token_c = await c.token()
        before = svc.me(token_c)['chips']
        cseat = c.seat
        await c.tap('[data-menu]')
        await c.pg.wait_for_timeout(250)
        await c.tap('[data-m="lobby"]')
        await c.pg.wait_for_selector('.gd-popup-layer.is-open [data-confirm="1"]', timeout=4000)
        await c.shot('six-leave-confirm')
        stack = seats_of(c)[cseat]['stack']
        hid = c.hand['id']
        await c.tap('.gd-popup-layer.is-open [data-confirm="1"]')
        await c.wait_screen('lobby', 6000)
        sc.check('leave: Cy is back in the lobby with a clean URL', await c.pg.evaluate('location.search') == '')
        folded = await until(lambda: a.hand and a.hand['id'] == hid and seats_of(a)[cseat] and seats_of(a)[cseat]['state'] == 'folded', 5)
        sc.check('leave: the others see Cy fold at once', bool(folded) or (a.hand and a.hand['id'] != hid))
        gone = await until(lambda: a.snap['table']['seats'][cseat] is None, 60)
        sc.check('leave: the seat is empty after the hand', bool(gone))
        after = svc.me(token_c)['chips']
        sc.check('leave: the stack went back to the bankroll', after == before + stack, f'{before} + {stack} -> {after}')
        for t in tasks:
            t.cancel()
        hands = await play([a, b], {}, 10, svc, extra=lambda: showdowns(done_hands(players)) >= 1)
        sc.info['hands_played'] = len(hands)
        sc.check('10+ hands, 1+ showdowns', len(hands) >= 10 and showdowns(hands) >= 1, f'{len(hands)} hands, {showdowns(hands)} showdowns')
        sc.frames(players, svc)
        sc.console(players, svc)
    return sc


async def nine(br):
    sc = Scenario('nine')
    with Service(tag='nine') as svc:
        a = await Player(br, 'hd', 'Ann', svc).open()
        others = [Player(br, 'phone', 'Bo', svc), Player(br, 'portrait', 'Cy', svc), Player(br, 'desk', 'Di', svc)]
        code = await host_table(a, seats=9)
        sc.check('host: 9 seats', a.snap['table']['settings']['seats'] == 9)
        joined = [await join(p, code) for p in others]
        sc.check('3 guests join', all(joined))
        sc.check('AI 补位 fills 5 seats', await fill_bots(a, 9))
        players = [a, *others]
        await start(a, players)
        hands = await play(players, {}, 4, svc)
        for p in players:
            await p.shot('nine')
        hands = await play(players, {}, 8, svc, extra=lambda: showdowns(done_hands(players)) >= 1)
        sc.info['hands_played'] = len(hands)
        sc.check('8+ hands at 9 seats, 1+ showdowns', len(hands) >= 8 and showdowns(hands) >= 1, f'{len(hands)} hands, {showdowns(hands)} showdowns')
        sc.frames(players, svc)
        sc.console(players, svc)
    return sc


async def sidepots(br):
    sc = Scenario('sidepots')
    with Service(tag='sidepots') as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'phone', 'Bo', svc), Player(br, 'portrait', 'Cy', svc)
        code = await host_table(a, seats=3)
        sc.check('buy-ins 2,000 / 1,400 / 800', await join(b, code, 1400) and await join(c, code, 800))
        st = [x['stack'] for x in seats_of(a)]
        sc.check('stacks staged by the buy-ins', st == [2000, 1400, 800], st)
        players = [a, b, c]
        tokens = [await p.token() for p in players]
        # hand 1: the short stack has aces, the middle kings, the big queens; a dry board
        svc.rig(code, {0: ['Qs', 'Qd'], 1: ['Kh', 'Kc'], 2: ['As', 'Ad']}, ['2c', '7d', '9h', 'Js', '3h'])
        await start(a, players)
        side_seen = []

        async def watch_pots():
            while True:
                t = await c.pg.evaluate("[...document.querySelectorAll('.hd-sidepot')].map(e => e.textContent.replace(/\\s+/g, ' ').trim())")
                if t and t not in side_seen:
                    side_seen.append(t)
                await asyncio.sleep(.1)
        watcher = asyncio.ensure_future(watch_pots())
        hands = await play(players, {n: pusher for n in ('Ann', 'Bo', 'Cy')}, 1, svc, cap=60)
        await asyncio.sleep(.5)
        watcher.cancel()
        h1 = next(iter(hands.values()))
        wins = sorted((w['seat'], w['pot'], w['amt']) for w in h1['winners'])
        sc.check('hand 1: main pot 2,400 to the aces, side pot 1,200 to the kings', wins == [(1, 1, 1200), (2, 0, 2400)], wins)
        await c.pg.wait_for_timeout(600)
        await c.shot('sidepot-end')
        st = [x['stack'] for x in seats_of(a)]
        sc.check('hand 1: stacks 600 (uncalled back) / 1,200 / 2,400', st == [600, 1200, 2400], st)
        sc.check('the pot pills showed 主池 2,400 and 边池 1 1,200', any('主池 2,400' in ' '.join(x) and '边池 1 1,200' in ' '.join(x) for x in side_seen), side_seen[-3:])
        # hand 2: the big stack (now seat 2) takes everything: two players are busted and offered a rebuy
        svc.rig(code, {0: ['Qs', 'Qd'], 1: ['Kh', 'Kc'], 2: ['As', 'Ad']}, ['2c', '7d', '9h', 'Js', '3h'])
        rebuy_seen = {}

        async def watch_rebuy(p):
            ok = await until(lambda: p.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open .hd-amount')"), 40, .1)
            rebuy_seen[p.name] = bool(ok)
            if ok:
                await p.shot('rebuy')
        watchers = [asyncio.ensure_future(watch_rebuy(p)) for p in (a, b)]
        for p in (a, b):
            p.paused = True       # they look at the rebuy popup before taking it
        stop = playing(players, 2, svc, cap=60)
        tasks = [asyncio.ensure_future(p.autoplay(pusher, stop)) for p in players]
        # a and b push too, but stay paused for the popup: drive them by hand until their stacks are in
        for _ in range(200):
            if len(done_hands(players)) >= 2:
                break
            for p in (a, b):
                d = await p.dom()
                if [x for x in d['acts'] if x != 'show'] and not d['amount']:
                    await p.step(pusher)
            await asyncio.sleep(.2)
        await asyncio.gather(*watchers)
        for t in tasks:
            t.cancel()
        hands = done_hands(players)
        h2 = [h for h in hands.values() if h['no'] == 2]
        sc.check('hand 2: the aces take both pots', bool(h2) and {w['seat'] for w in h2[0]['winners']} == {2}, h2 and h2[0]['winners'])
        sc.check('busted players get the rebuy popup', rebuy_seen.get('Ann') and rebuy_seen.get('Bo'), rebuy_seen)
        for p in (a, b):
            if await p.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open .hd-amount')"):
                await p.tap('.gd-popup-layer.is-open [data-ok]')
        rebought = await until(lambda: all(x['stack'] > 0 for x in seats_of(a)), 10)
        sc.check('both rebuy and are dealt back in', bool(rebought), [x['stack'] for x in seats_of(a)])
        for p in players:
            p.paused = False
        hands = await play(players, {}, 5, svc, cap=180)
        sc.info['hands_played'] = len(hands)
        r = sc.frames(players, svc)
        sc.check('run-outs exposed every all-in hand (frames)', r['runouts'] >= 2, r['runouts'])
        await leave_all(players)
        await asyncio.sleep(1.5)
        total = sum(svc.me(t)['chips'] for t in tokens)
        sc.check('chips conserved: 30,000 across the three bankrolls after leaving', total == 30000, total)
        sc.console(players, svc)
    return sc


async def timeout(br):
    sc = Scenario('timeout')
    with Service(tag='timeout') as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        t = Player(br, 'phone', 'Tim', svc)
        code = await host_table(a, seats=4, action_sec=15)
        sc.check('host: 4 seats, 15 s to act (from the room pills)', a.snap['table']['settings']['actionSec'] == 15)
        sc.check('Tim joins', await join(t, code))
        await fill_bots(a, 4)
        players = [a, t]
        await start(a, players)
        stop = playing(players, 999, svc, cap=400)
        task = asyncio.ensure_future(a.autoplay(station, stop))
        ok = await until(lambda: t.hand and not t.hand['done'] and t.hand['toAct'] == t.seat, 120, .1)
        sc.check("Tim's turn comes", bool(ok))
        await t.pg.wait_for_timeout(1200)
        clock = await t.pg.evaluate("(document.querySelector('.hd-hero-clock .gd-clock b')||{}).textContent")
        sc.check('his clock counts down from 15', clock and 8 <= int(clock) <= 15, clock)
        await t.shot('timeout-clock')
        bank = await until(lambda: t.hand and t.hand['usingBank'], 20, .2)
        await t.pg.wait_for_timeout(600)
        mine = await t.pg.evaluate("(()=>{const c=document.querySelector('.hd-hero-clock .gd-clock.is-bank');return c&&c.textContent.replace(/\\s+/g,' ').trim()})()")
        theirs = await a.pg.evaluate("(()=>{const c=document.querySelector('.hd-seat .hd-clock.is-bank');return c&&c.textContent.replace(/\\s+/g,' ').trim()})()")
        sc.check('then the time bank runs: shown on his page and on the others', bool(bank) and mine and '时间银行' in mine and theirs and '时间银行' in theirs, f'{mine} | {theirs}')
        await t.shot('timeout-bank')
        await a.shot('timeout-bank-other')
        first = await until(lambda: (seats_of(a)[t.seat].get('last') or {}).get('a') == 'timeout', 40, .1)
        label = await a.pg.evaluate("[...document.querySelectorAll('.hd-act')].map(e => e.textContent).join(' ')")
        sc.check('the bank runs out: auto check / fold, logged as 超时', bool(first), label)
        sc.check('his bank is spent', seats_of(a)[t.seat]['timeBank'] == 0, seats_of(a)[t.seat]['timeBank'])
        out = await until(lambda: seats_of(a)[t.seat]['state'] == 'out', 120, .2)
        sc.check('a second timeout in a row sits him out', bool(out))
        await t.pg.wait_for_timeout(800)
        plate = (await t.dom())['mine']
        sc.check('his page: 暂离中 · 回来', '暂离中' in plate, plate)
        tag = await a.pg.evaluate("[...document.querySelectorAll('.hd-tag')].map(e => e.textContent).join(' ')")
        sc.check('the others see 暂离', '暂离' in tag, tag)
        await t.shot('timeout-away')
        await t.tap('[data-do="back"]')
        back = await until(lambda: seats_of(t)[t.seat]['state'] in ('waiting', 'playing'), 8)
        sc.check('回来 brings him back (waiting for the big blind)', bool(back), seats_of(t)[t.seat]['state'])
        plate = await until(lambda: t.pg.evaluate("!!document.querySelector('[data-do=\"postBB\"]')"), 10, .1)
        sc.check('his page: 等待大盲 · 立即补盲', bool(plate) and '等待大盲' in (await t.dom())['mine'], (await t.dom())['mine'])
        if plate:
            await t.shot('timeout-waiting')
            hid = t.hand and t.hand['id']
            await t.tap('[data-do="postBB"]')
        dealt = await until(lambda: t.hand and not t.hand['done'] and t.hand['id'] != hid and (t.snap['me'] or {}).get('hole'), 60, .2)
        posted = dealt and any(e['seat'] == t.seat and e['a'] == 'bb' for e in t.snap['table']['log'])
        sc.check('立即补盲: dealt into the next hand, posting a big blind', bool(dealt) and posted, t.snap['table']['log'][:4] if dealt else '')
        task.cancel()
        hands = await play(players, {'Ann': station, 'Tim': station}, len(done_hands(players)) + 2, svc, cap=120)
        sc.info['hands_played'] = len(hands)
        sc.frames(players, svc)
        sc.console(players, svc)
    return sc


async def restart(br):
    sc = Scenario('restart')
    with Service(tag='restart') as svc:
        a = await Player(br, 'desk', 'Ann', svc).open()
        b, c = Player(br, 'portrait', 'Bo', svc), Player(br, 'phone', 'Cy', svc)
        code = await host_table(a)
        await join(b, code)
        await join(c, code)
        await fill_bots(a, 6)
        players = [a, b, c]
        await start(a, players)
        # a spectator follows the table through the invite link without sitting
        spec = await Player(br, 'ifr', 'Spec', svc).open(f'?game=holdem&room={code}', wait=1500)
        everyone = [*players, spec]
        await play(players, {}, 2, svc)

        async def bounce(kind):
            stop = playing(players, 999, svc, cap=300)
            tasks = [asyncio.ensure_future(p.autoplay(station, stop)) for p in players]
            human = lambda: a.hand and not a.hand['done'] and a.hand['board'] and a.hand['toAct'] is not None and not seats_of(a)[a.hand['toAct']]['bot']
            ok = await until(human, 120, .02)
            if kind == 'lost':
                # the worst case of a crash: 2.5 s of play never reached the disk (writes held by a test hook)
                svc.post('/__test/hold-writes', {'ms': 6000})
                await asyncio.sleep(2.5)
                svc.kill9()
            elif kind == 'kill':
                # right after a human acts: the last ~200 ms may be lost, the pages are ahead of the restored table
                actor = next(p for p in players if p.seat == a.hand['toAct'])
                for p in players:
                    p.paused = p is not actor
                before = actor.acted
                await until(lambda: actor.acted > before, 30, .01)
                svc.kill9()
            else:
                for p in players:
                    p.paused = True
                svc.stop()
            for t in tasks:
                t.cancel()
            for p in players:
                p.paused = False
            sc.check(f'{kind}: stopped mid-hand with a human to act', bool(ok))
            hid = a.hand['id']
            revs = [p.snap['rev'] for p in everyone]
            marks = [len(p.frames) for p in everyone]
            await asyncio.sleep(1.2)
            pills = [await p.pg.evaluate("(document.querySelector('.hd-status')||{}).textContent||''") for p in everyone]
            stale = [await p.pg.evaluate("!!document.querySelector('.hd-stage.is-stale')") for p in everyone]
            sc.check(f'{kind}: every page shows 重新连接中… and disables the pills', all('重新连接' in x for x in pills) and all(stale), pills)
            await b.shot(f'restart-{kind}-down')
            await asyncio.sleep(1.5)
            svc.start()
            t0 = time.time()
            live = await until(lambda: all_live(everyone), 25)
            sc.check(f'{kind}: every page reconnects ({time.time() - t0:.1f} s)', bool(live), [await p.dom() for p in everyone] if not live else '')
            first = []
            for p, k in zip(everyone, marks):
                st = next((json.loads(raw) for _, raw in p.frames[k:] if raw.startswith('{"t":"state"')), None)
                first.append(st and st['rev'])
            sc.info[f'{kind}_revs'] = f'{revs} -> {first}'
            same = [p.hand and p.hand['id'] for p in everyone]
            if kind == 'lost':
                sc.check('lost: the pages were ahead of the restored table (their revs went back)', any(f is not None and f < r for f, r in zip(first, revs)), f'{revs} -> {first}')
                hid = same[0]
            sc.check(f'{kind}: every page is in the same hand ({hid})', all(x == hid for x in same), f'{hid} -> {same}')
            stop = playing(players, 999, svc, cap=300)
            tasks = [asyncio.ensure_future(p.autoplay(station, stop)) for p in players]
            fin = await until(lambda: all(hid in p.done for p in everyone), 90)
            sc.check(f'{kind}: the hand finishes on every page', bool(fin), [hid in p.done for p in everyone])
            agree = await until(lambda: len({p.snap['rev'] for p in everyone}) == 1 and len({json.dumps(p.snap['table']['seats']) for p in everyone}) == 1, 15, .1)
            sc.check(f'{kind}: all pages agree on the table afterwards', bool(agree), [p.snap['rev'] for p in everyone])
            for t in tasks:
                t.cancel()

        async def all_live(ps):
            for p in ps:
                d = await p.dom()
                if d['stale'] or d['status'] or d['screen'] != 'htable':
                    return False
            return True
        await bounce('graceful')
        await play(players, {}, len(done_hands(players)) + 1, svc)
        await bounce('kill')
        await play(players, {}, len(done_hands(players)) + 1, svc)
        await bounce('lost')
        hands = await play(players, {}, len(done_hands(players)) + 2, svc)
        sc.info['hands_played'] = len(hands)
        sc.frames(everyone, svc)
        sc.console(everyone, svc)
    return sc


async def accounts(br):
    sc = Scenario('accounts')
    keys = KeyServer()
    try:
        with Service(tag='accounts', email_link=True, jwks_url=keys.url) as svc:
            # 1. a returning Guandan player from this network: its name goes into the IP memory
            z = await Player(br, 'desk', 'Zhuo', svc).open(game='guandan')
            zpid = svc.me(await z.token())['pid']
            # 2. a fresh browser: offered "继续以 Zhuo 的身份？", nothing changes until the click
            f = await Player(br, 'portrait', 'Fresh', svc).open(client=None, name=None, game=None, wait=2500)
            prompt = await f.pg.evaluate("(()=>{const p=document.querySelector('.ga-suggest');return p&&p.textContent.replace(/\\s+/g,' ').trim()})()")
            sc.check('fresh browser: asked 继续以 Zhuo 的身份？', bool(prompt) and '继续以 Zhuo 的身份' in prompt, prompt)
            await f.shot('suggest')
            ftok = await f.token()
            fme = svc.me(ftok)
            sc.check('before the click: still its own new guest', ftok and fme['pid'] != zpid and await f.pg.evaluate("localStorage.getItem('picasso.guandan.name')") != 'Zhuo', fme['name'])
            await f.tap('.ga-claim')
            await until(lambda: f.pg.evaluate("!document.querySelector('.ga-suggest')"), 5)
            ftok2 = await f.token()
            fme2 = svc.me(ftok2)
            sc.check('after 继续: the Zhuo account on a new device token', ftok2 != ftok and fme2['pid'] == zpid and await f.pg.evaluate("localStorage.getItem('picasso.guandan.name')") == 'Zhuo', fme2['name'])
            g = await Player(br, 'phone', 'Fresh2', svc).open(client=None, name=None, game=None, wait=2500)
            sc.check('another fresh browser is asked too', await g.pg.evaluate("!!document.querySelector('.ga-suggest')"))
            await g.tap('.ga-suggest [data-new]')
            await g.pg.wait_for_timeout(500)
            gme = svc.me(await g.token())
            sc.check('我是新玩家 keeps the new guest', gme['pid'] != zpid and gme['name'] != 'Zhuo', gme['name'])
            h = await Player(br, 'desk', 'Hana', svc).open(game='guandan', wait=2500)
            sc.check('a returning player (name, no token) is never asked', not await h.pg.evaluate("!!document.querySelector('.ga-suggest')"))
            await f.pg.reload(wait_until='load')
            await f.pg.wait_for_timeout(2000)
            sc.check('nor is the fresh browser after a reload', not await f.pg.evaluate("!!document.querySelector('.ga-suggest')"))
            # 3. save with email: the 账号 popup, Firebase's link (stub), account-link.html with a locally signed token
            e = await Player(br, 'desk', 'Yufei', svc).open(game='guandan')
            await e.tap('.hud-avatar')
            await e.pg.wait_for_selector('.ga-profile', timeout=5000)
            await e.tap('[data-ga=email]')
            await e.pg.wait_for_selector('.ga-email-input', timeout=4000)
            await e.pg.fill('.ga-email-input', 'yufei@ucsd.edu')
            await e.tap('.ga-email [type=submit]')
            await e.pg.wait_for_selector('.ga-email.is-sent', timeout=6000)
            sent = [x for x in await e.pg.evaluate('window.__authCalls') if x['fn'] == 'sendSignInLinkToEmail']
            url = sent[0]['url'] if sent else ''
            sc.check('the link is sent through Firebase Auth to account-link.html', url.startswith(LINK + '?lid='), url)
            lid = url.split('lid=')[1].split('&')[0] if url else ''

            async def landing(token, expect):
                pg = await e.ctx.new_page()
                pg.on('console', lambda m: e.console.append((time.time(), m.text)) if m.type == 'error' else None)
                pg.on('pageerror', lambda x: e.console.append((time.time(), f'LINK PAGEERROR: {x}')))
                await pg.goto(f'{LINK}?lid={lid}&lang=zh&mode=signIn&oobCode=e2e', wait_until='load')
                await pg.wait_for_selector('#al-go', timeout=5000)
                await pg.evaluate('t => { window.__authIdToken = t; }', token)
                pre = await pg.evaluate("document.getElementById('al-email').value")
                await pg.click('#al-go')
                await pg.wait_for_function("!document.querySelector('.al-ring')", timeout=8000)
                text = await pg.evaluate("document.getElementById('al-body').textContent.replace(/\\s+/g, ' ').trim()")
                await pg.screenshot(path=f'/tmp/holdem-shots/accounts-link-{expect[:2]}.jpg', type='jpeg', quality=80)
                await pg.close()
                return pre, text
            pre, text = await landing(keys.sign('yufei@ucsd.edu', other_key=True), 'bad')
            sc.check('a token with a bad signature is refused', '没有通过' in text, text[:60])
            sc.check('the landing page prefills the email', pre == 'yufei@ucsd.edu', pre)
            _, text = await landing(keys.sign('other@ucsd.edu'), 'mismatch')
            sc.check('a token for another email is refused', '不一致' in text, text[:60])
            _, text = await landing(keys.sign('yufei@ucsd.edu'), 'done')
            sc.check('a good token completes the link', '已完成' in text, text[:60])
            sc.check('the dealer fetched the keys from the local JWK set', keys.fetches >= 1, keys.fetches)
            done = await until(lambda: e.pg.evaluate("!!document.querySelector('.ga-email.is-done')"), 10)
            sc.check('the game page picks the saved account up by polling', bool(done))
            await e.shot('email-done')
            eme = svc.me(await e.token())
            sc.check('saved: email masked, name protected', not eme['guest'] and eme['email'] == 'y***@ucsd.edu' and eme['protected'], eme)
            # 4. a protected name cannot be taken: the lobby field reverts with a toast
            r = await Player(br, 'phone', 'Rui', svc).open(game='guandan')
            await r.pg.fill('#nick-input', ' yufei ')
            await r.pg.keyboard.press('Enter')
            await r.pg.wait_for_timeout(1200)
            name = await r.pg.evaluate("document.getElementById('nick-input').value")
            toast = await r.pg.evaluate("document.getElementById('toast').textContent")
            sc.check('a protected name is reverted with a toast', name == 'Rui' and '已被绑定邮箱' in toast and svc.me(await r.token())['name'] == 'Rui', f'{name} / {toast}')
            await r.shot('protected-name')
            await r.pg.fill('#nick-input', 'Rui L')
            await r.pg.keyboard.press('Enter')
            await r.pg.wait_for_timeout(900)
            sc.check('a free name reaches the service', svc.me(await r.token())['name'] == 'Rui L')
            # 5. a finished Guandan round is reported once
            posts = []
            r.pg.on('request', lambda q: posts.append(q.post_data) if q.method == 'POST' and q.url.endswith('/v1/guandan/round') else None)
            await r.create_room()
            await r.fill_ai()
            await r.start()
            await r.pg.wait_for_timeout(600)

            def over(gm):
                gm['phase'] = 'roundOver'
                gm['finished'] = [0, 2, 1, 3]
                gm['roundResult'] = {'first': 0, 'firstTeam': 0, 'order': [0, 2, 1, 3], 'advance': 3, 'tributePayers': [1, 3], 'nextStarter': 0}
            await r.set_game(over)
            await r.pg.wait_for_timeout(1200)
            for k in range(3):
                await r.set_game(lambda gm: gm.update(message=f'tick{k}'))
                await r.pg.wait_for_timeout(500)
            gd = svc.me(await r.token())['guandan']
            sc.check('a finished Guandan round is reported once', gd['rounds'] == 1 and gd['wins'] == 1 and len(posts) == 1, f'{gd} posts={posts}')
            dup = svc.post('/v1/guandan/round', json.loads(posts[0]), token=await r.token()) if posts else None
            gd2 = svc.me(await r.token())['guandan']
            sc.check('the service ignores a repeat of the same round', gd2['rounds'] == 1, f'{dup} {gd2}')
            ps = [z, f, g, h, e, r]
            # the refused name (409) and the two refused tokens (401 / 409) are logged by Chrome as failed loads
            refused = 0
            for p in ps:
                keep = [(t, x) for t, x in p.console if not ('Failed to load resource' in x and ('409' in x or '401' in x))]
                refused += len(p.console) - len(keep)
                p.console = keep
            sc.info['expected_refusals_logged'] = refused
            sc.console(ps, svc)
    finally:
        keys.close()
    return sc


async def checker(br):
    """The frame checker itself: synthetic frames with planted leaks must each be caught (no browser needed)."""
    sc = Scenario('checker')

    class FakeSvc:
        up = False
        truth = {'T-1': [{'holes': {'0': ['As', 'Ah'], '1': ['Kd', 'Kc'], '2': ['7s', '2d']}, 'pids': {'0': 'pa', '1': 'pb', '2': 'pc'},
                          'folded': [2], 'mucked': [], 'showed': []}]}

    class FakePage:
        def __init__(self, frames):
            self.tag, self.frames = 'fake', [(0, json.dumps(f)) for f in frames]

    def seat(state='playing', shown=None, last=None):
        return {'pid': 'p', 'name': 'x', 'bot': None, 'stack': 900, 'bet': 0, 'state': state, 'connected': True,
                'inHand': state in ('playing', 'allin'), 'shown': shown, 'last': last, 'timeBank': 30}

    def state(seats, me_seat=0, hole=('As', 'Ah'), street='flop', done=False, to_act=1, board=('2c', '3c', '4h'), winners=None, last=None):
        return {'t': 'state', 'rev': 5, 'serverTime': 0, 'me': {'pid': 'pa', 'seat': me_seat, 'chips': 0, 'hole': list(hole) if hole else None, 'best': None, 'legal': None, 'canShow': False, 'pendingTopUp': 0},
                'table': {'code': 'T', 'phase': 'running', 'host': 'pa', 'rev': 5, 'settings': {}, 'seats': seats, 'log': [], 'last': last,
                          'hand': {'id': 'T-1', 'no': 1, 'street': street, 'board': list(board), 'button': 0, 'sbSeat': 1, 'bbSeat': 2, 'toAct': to_act,
                                   'deadline': None, 'usingBank': False, 'currentBet': 0, 'minRaiseTo': 20, 'pots': [], 'winners': winners, 'done': done}}}
    welcome = {'t': 'welcome', 'account': {'pid': 'pa'}, 'serverTime': 0, 'features': {}}
    good = [welcome, state([seat(), seat(), seat('folded')]),
            state([seat('allin', ['As', 'Ah']), seat('allin', ['Kd', 'Kc']), seat('folded')], to_act=None),
            state([seat(), seat(shown=['Kd', 'Kc'], last={'a': 'show', 'amt': None}), seat('folded')], street='showdown', done=True, to_act=None, board=('2c', '3c', '4h', '9s', 'Jd'),
                  winners=[{'seat': 1, 'amt': 100, 'pot': 0, 'hand': {'cat': 'pair', 'name': 'Pair', 'cards': ['Kd', 'Kc', 'Jd', '9s', '4h']}}])]
    r = check_frames([FakePage(good)], FakeSvc())
    sc.check('clean synthetic frames pass', not r['violations'], r['violations'][:2])
    planted = {
        "another seat's cards shown while betting is open": [welcome, state([seat(), seat(shown=['Kd', 'Kc']), seat('folded')])],
        'a folded hand shown at the showdown': [welcome, state([seat(), seat(), seat('folded', shown=['7s', '2d'])], street='showdown', done=True, to_act=None)],
        'a hole card in an account frame': [welcome, {'t': 'account', 'account': {'pid': 'pa', 'note': 'Kd'}}],
        'another seat\'s hole as my own': [welcome, state([seat(), seat(), seat('folded')], hole=('Kd', 'Kc'))],
        'a card hidden in an unexpected field': [welcome, dict(state([seat(), seat(), seat('folded')]), extra={'deck': ['Qs']})],
        'a winner\'s best five with unshown cards': [welcome, state([seat(), seat(), seat('folded')], street='showdown', done=True, to_act=None, board=('2c', '3c', '4h', '9s', 'Jd'),
                                                                winners=[{'seat': 1, 'amt': 100, 'pot': 0, 'hand': {'cat': 'pair', 'name': 'Pair', 'cards': ['Kd', 'Kc', 'Jd', '9s', '4h']}}])],
        'last hand: a folded seat shown': [welcome, state([seat(), seat(), seat('folded')], last={'no': 1, 'board': [], 'winners': [], 'shown': {'2': ['7s', '2d']}})],
    }
    for what, frames in planted.items():
        r = check_frames([FakePage(frames)], FakeSvc())
        sc.check(f'caught: {what}', bool(r['violations']), r['violations'][:1])
    return sc


SCENARIOS = {'checker': checker, 'heads': heads, 'six': six, 'nine': nine, 'sidepots': sidepots, 'timeout': timeout, 'restart': restart, 'accounts': accounts}


async def main(names):
    async with browser() as br:
        for n in names:
            log(f'===== {n}')
            try:
                await SCENARIOS[n](br)
            except Exception as e:
                import traceback
                traceback.print_exc()
                sc = RESULTS.get(n) or Scenario(n)
                sc.check('scenario ran to the end', False, repr(e))
    ok = True
    for n, sc in RESULTS.items():
        print(json.dumps({'scenario': n, 'pass': sc.passes, 'fail': sc.fails, **sc.info}, ensure_ascii=False))
        ok = ok and not sc.fails
    print('ALL PASS' if ok else 'FAILED')
    return ok


if __name__ == '__main__':
    names = sys.argv[1:] or list(SCENARIOS)
    sys.exit(0 if asyncio.run(main(names)) else 1)
