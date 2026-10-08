"""Screenshots of the key Hold'em states from real play: the real dealer (its test hooks rig the decks so every state
comes up on cue), the screenshot player (the hero, at the given viewport and language: Yichen) and two helpers
(Zaifeng, Yufei) who act when it is their turn. Nothing is scripted on the client side: every state is a real table.
Usage: python3 shots_live.py [desk hd ifr phone portrait] [--lang=zh|en|both] [--par=2]
Writes HD_SHOTS/live-<vp>-<lang>-<step>.jpg (default /tmp/holdem-shots; never commit them) and prints, per run, the
steps that failed and the console errors of the three pages.
Steps: lobby board profile room room-seated buyin preflop raise flop turn river showdown allin sidepots busted split
topup burst quads last menu hands sitout waiting spectator reconnect heads nine"""
import asyncio, json, os, sys, time
from live import Service, Player, browser, until, log, station, pusher

PRE = '[data-pre]'


class Run:
    def __init__(self, br, vp, lang, port):
        self.vp, self.lang, self.port = vp, lang, port
        self.svc = Service(tag=f'shots-{vp}-{lang}', port=port)
        self.hero = Player(br, vp, 'Yichen', self.svc, lang=lang, tag=f'live-{vp}-{lang}')
        self.h1 = Player(br, 'ifr', 'Zaifeng', self.svc, lang=lang, tag=f'live-{vp}-{lang}-h1')
        self.h2 = Player(br, 'ifr', 'Yufei', self.svc, lang=lang, tag=f'live-{vp}-{lang}-h2')
        self.failed, self.taken, self.trace = [], [], []
        self.helper_policy = station
        self.hero_auto = False

    @property
    def all(self):
        return [self.hero, self.h1, self.h2]

    async def shot(self, name, settle=900):
        await self.hero.pg.wait_for_timeout(settle)
        await self.hero.shot(name)
        self.taken.append(name)
        h = self.hero.hand or {}
        self.trace.append(f'{name}: hand {h.get("no")} {h.get("street")} done={h.get("done")}')

    async def step(self, name, coro):
        try:
            await coro
        except Exception as e:
            self.failed.append(f'{name}: {type(e).__name__} {str(e)[:120]}')
            log(f'[{self.vp}-{self.lang}] {name} failed: {e!r}'[:900])
            for p in self.all:
                if p.pg:
                    try:
                        await p.shot(f'fail-{name}')
                    except Exception:
                        pass
            with_popup = await self.hero.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open')")
            if with_popup:
                await self.hero.close_popups()

    # ---- helpers act on their own whenever it is their turn
    async def helpers(self):
        while True:
            for p in (self.h1, self.h2):
                try:
                    if p.pg and not p.paused:
                        await p.step(lambda pl, acts: self.helper_policy(pl, acts))
                except Exception:
                    pass
            if self.hero_auto:
                try:
                    await self.hero.step(lambda pl, acts: 'call')
                except Exception:
                    pass
            await asyncio.sleep(.2)

    def seat(self, p):
        return p.seat

    async def new_hand(self, prev):
        await until(lambda: self.hero.hand and self.hero.hand['id'] != prev and not self.hero.hand['done'], 40, .05)
        return self.hero.hand['id']

    async def hand_done(self, hid, timeout=60):
        return await until(lambda: hid in self.hero.done, timeout, .05)

    async def my_turn(self, timeout=40):
        return await until(lambda: self.hero.pg.evaluate(
            "!!document.querySelector('.hd-actions [data-act=fold]') && !document.querySelector('.hd-actions .is-busy') && !document.querySelector('.hd-stage.is-stale')"), timeout, .05)

    async def hero_act(self, choice):
        for _ in range(3):
            if await self.hero.step(lambda p, acts: choice):
                return True
            await asyncio.sleep(.2)
        return False

    async def play_hand(self, hero_choice, shots=None, raise_shot=False, timeout=90, once=False):
        """Plays the current hand: the hero acts `hero_choice` on each turn, taking the street shot first
        (once: returns after the hero's first action)."""
        hid = self.hero.hand['id']
        shots, seen = shots or {}, set()
        t0 = time.time()
        while hid not in self.hero.done and time.time() - t0 < timeout:
            if self.hero.hand and self.hero.hand['id'] == hid and await self.hero.pg.evaluate(
                    "!!document.querySelector('.hd-actions [data-act=fold]') && !document.querySelector('.hd-actions .is-busy')"):
                street = self.hero.hand['street']
                if street in shots and street not in seen:
                    seen.add(street)
                    await self.shot(shots[street], 1300)
                    if raise_shot and street == 'preflop':
                        await self.hero.tap('[data-act=raise]')
                        await self.hero.pg.wait_for_selector('.hd-raise-panel', timeout=3000)
                        await self.hero.tap('[data-preset="p23"]')
                        await self.shot('raise', 400)
                        await self.hero.pg.keyboard.press('Escape')
                        await self.hero.pg.wait_for_timeout(300)
                await self.hero_act(hero_choice)
                if once:
                    break
            await asyncio.sleep(.1)
        return hid

    async def menu(self, item):
        await self.hero.tap('[data-menu]')
        await self.hero.pg.wait_for_timeout(300)
        await self.hero.tap(f'[data-m="{item}"]')
        await self.hero.pg.wait_for_timeout(300)

    async def confirm_if_asked(self, p):
        if await p.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open [data-confirm=\"1\"]')"):
            await p.tap('.gd-popup-layer.is-open [data-confirm="1"]')

    async def to_lobby(self, p):
        for attempt in range(3):
            if await p.pg.evaluate("document.body.dataset.screen") == 'lobby':
                return
            try:
                if not await p.pg.evaluate("!!document.querySelector('[data-m=\"lobby\"]')"):
                    await p.tap('[data-menu]')
                    await p.pg.wait_for_timeout(300)
                await p.tap('[data-m="lobby"]', timeout=2000)
                await p.pg.wait_for_timeout(400)
                await self.confirm_if_asked(p)
                await p.wait_screen('lobby', 8000)
                return
            except Exception:
                if attempt == 2:
                    raise

    async def join(self, p, code, buy_in=None):
        await p.open(f'?game=holdem&room={code}', wait=600)
        await p.wait_screen('hroom', 10000)
        await p.pg.wait_for_selector('[data-sit]', timeout=6000)
        await p.tap('[data-sit]')
        await p.pg.wait_for_selector('.hd-amount', timeout=4000)
        if buy_in:
            await p.pg.evaluate("v => { const r = document.querySelector('.hd-amount .hd-range'); r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); }", buy_in)
        await p.tap('.hd-amount [data-ok]')
        await until(lambda: p.seat is not None, 6)

    def rig(self, holes, board):
        """holes by player: {player: [c1, c2]}"""
        self.svc.rig(self.hero.code, {p.seat: c for p, c in holes.items()}, board)

    # ---------------------------------------------------------------- the run
    async def go(self):
        hero, h1, h2, svc = self.hero, self.h1, self.h2, self.svc
        svc.start()
        helper_task = None
        try:
            await hero.open(wait=1800)
            await self.shot('lobby', 300)

            async def board():
                await hero.tap('[data-lobby="h-board"]')
                await hero.pg.wait_for_selector('.hd-brow, .hd-board-empty', timeout=6000)
                await self.shot('board', 700)
                await hero.pg.keyboard.press('Escape')
                await hero.pg.wait_for_timeout(400)
            await self.step('board', board())

            async def profile():
                await hero.tap('.hud-avatar')
                await hero.pg.wait_for_selector('.ga-profile', timeout=5000)
                await self.shot('profile', 600)
                await hero.close_popups()
            await self.step('profile', profile())

            await hero.tap('.lobby-tile.is-holdem')
            await hero.wait_screen('hroom', 10000)
            await until(lambda: hero.seat is not None, 8)
            await self.shot('room', 600)
            code = hero.code
            await self.join(h1, code, 1400)
            await self.join(h2, code, 800)
            await self.shot('room-seated', 600)

            async def buyin():
                await hero.tap('[data-stand]')
                await until(lambda: hero.seat is None, 5)
                await hero.tap('[data-sit]')
                await hero.pg.wait_for_selector('.hd-amount', timeout=4000)
                await self.shot('buyin', 500)
                await hero.tap('.hd-amount [data-ok]')
                await until(lambda: hero.seat is not None, 5)
            await self.step('buyin', buyin())

            # Each rig is posted as soon as the hand before it is dealt, so it always lands on the hand it is for.
            # hand 1: every street, my turn each time, a flush on the river
            self.rig({hero: ['Ah', 'Kh'], h1: ['Qs', 'Qd'], h2: ['7c', '7d']}, ['Qh', '7h', '2c', '9s', '3h'])
            await hero.tap('[data-host="start"]')
            for p in self.all:
                await p.wait_screen('htable', 12000)
            helper_task = asyncio.ensure_future(self.helpers())
            hid = await self.new_hand(None)
            # hand 2: three all-ins: the short stack's aces take the main pot, my kings the side pot
            self.rig({hero: ['Ks', 'Kd'], h1: ['Qc', 'Qd'], h2: ['As', 'Ah']}, ['2c', '7d', '9h', 'Js', '3s'])
            await self.play_hand('call', {'preflop': 'preflop', 'flop': 'flop', 'turn': 'turn', 'river': 'river'}, raise_shot=True)
            await self.hand_done(hid)
            await self.shot('showdown', 1400)
            self.helper_policy = pusher
            hid = await self.new_hand(hid)
            # hand 3: I lose everything (hand 4 is dealt without me: the rebuy popup)
            self.rig({hero: ['7c', '2d'], h1: ['Kc', 'Kh'], h2: ['As', 'Ad']}, ['3c', '8d', '9h', 'Js', '4s'])

            async def allin():
                await self.play_hand('allin', timeout=20, once=True)
                ok = await until(lambda: hero.hand and hero.hand['id'] == hid and len([s for s in hero.snap['table']['seats'] if s and s.get('shown')]) >= 3 and 3 <= len(hero.hand['board']) < 5, 20, .05)
                if not ok:
                    raise RuntimeError('no run-out with three hands up')
                await self.shot('allin', 250)
            await self.step('allin', allin())
            await self.hand_done(hid)
            await self.shot('sidepots', 1400)
            hid = await self.new_hand(hid)
            await self.play_hand('allin')
            await self.hand_done(hid)
            self.helper_policy = station
            hid = await self.new_hand(hid)
            # hand 5: the board plays a royal flush: everyone splits
            self.rig({hero: ['2c', '3d'], h1: ['4c', '5d'], h2: ['6c', '7d']}, ['As', 'Ks', 'Qs', 'Js', 'Ts'])

            async def busted():
                await hero.pg.wait_for_selector('.gd-popup-layer.is-open .hd-amount', timeout=15000)
                await self.shot('busted', 600)
                await hero.tap('.gd-popup-layer.is-open .hd-amount-presets [data-v]')
                await hero.tap('.gd-popup-layer.is-open [data-ok]')
            await self.step('busted', busted())
            await self.hand_done(hid)
            hid = await self.new_hand(hid)
            # hand 6: quads for me, a full house against them
            self.rig({hero: ['9c', '9d'], h1: ['Kc', 'Kd'], h2: ['2h', '5c']}, ['9h', '9s', 'Kh', '5d', '3c'])
            await self.play_hand('call')
            await self.hand_done(hid)
            await self.shot('split', 1400)

            async def topup():
                await self.menu('topup')
                await hero.pg.wait_for_selector('.gd-popup-layer.is-open .hd-amount', timeout=4000)
                await self.shot('topup', 500)
                await hero.close_popups()
            await self.step('topup', topup())
            hid = await self.new_hand(hid)
            await self.play_hand('call')
            await self.hand_done(hid)

            # the quads burst, frozen 300 ms in: rays and sparks behind the board, centred on the word
            async def burst():
                await hero.pg.wait_for_selector('.hd-fx-under .gd-fx', timeout=4000, state='attached')
                await hero.pg.evaluate("document.querySelectorAll('.hd-fx-under *').forEach(e => e.getAnimations().forEach(a => { a.pause(); a.currentTime = 300; }))")
                await self.shot('burst', 0)
                await hero.pg.evaluate("document.querySelectorAll('.hd-fx-under *').forEach(e => e.getAnimations().forEach(a => a.play()))")
            await self.step('burst', burst())
            await self.shot('quads', 1100)

            # sitting out from the next hand: the others play on; then the popups while I am away
            async def sitout():
                await self.menu('away')
                ok = await until(lambda: hero.seat is not None and hero.snap['table']['seats'][hero.seat]['state'] == 'out' and hero.hand and not hero.hand['done'], 40, .1)
                await self.shot('sitout', 1000)
                if not ok:
                    raise RuntimeError('never sat out during a hand')
            await self.step('sitout', sitout())

            async def last():
                await hero.tap('[data-pop="last"]')
                await hero.pg.wait_for_selector('.hd-last', timeout=4000)
                await self.shot('last', 500)
                await hero.close_popups()
            await self.step('last', last())

            async def menu():
                await hero.tap('[data-menu]')
                await self.shot('menu', 500)
                await hero.pg.keyboard.press('Escape')
                await hero.pg.wait_for_timeout(300)
                if await hero.pg.evaluate("!!document.querySelector('.gd-menu')"):
                    await hero.tap('.gd-scrim')
            await self.step('menu', menu())

            async def hands():
                await self.menu('hands')
                await hero.pg.wait_for_selector('.hd-rank-row', timeout=4000)
                await self.shot('hands', 500)
                await hero.close_popups()
            await self.step('hands', hands())

            async def waiting():
                await until(lambda: hero.hand and not hero.hand['done'], 30, .1)
                await hero.tap('[data-do="back"]')
                ok = await until(lambda: hero.pg.evaluate("!!document.querySelector('[data-do=\"postBB\"]')"), 8, .05)
                await self.shot('waiting', 500)
                if not ok:
                    raise RuntimeError('no 立即补盲 plate')
            await self.step('waiting', waiting())

            async def spectator():
                await self.menu('stand')
                await self.confirm_if_asked(hero)
                await until(lambda: hero.seat is None, 20, .1)
                await self.shot('spectator', 1000)
                await hero.tap('[data-sit]')
                await hero.pg.wait_for_selector('.hd-amount', timeout=4000)
                await hero.tap('.hd-amount [data-ok]')
                await until(lambda: hero.seat is not None, 5)
                self.hero_auto = True
            await self.step('spectator', spectator())

            async def reconnect():
                await until(lambda: hero.hand and not hero.hand['done'], 30, .1)
                svc.stop()
                await self.shot('reconnect', 1500)
                svc.start()
                await until(lambda: hero.pg.evaluate("!document.querySelector('.hd-stage.is-stale')"), 25)
            await self.step('reconnect', reconnect())

            # heads-up: a new 2-seat table with Zaifeng
            async def heads():
                self.hero_auto = False
                h2.paused = True
                await hero.pg.wait_for_timeout(600)    # the helpers' loop finishes a tap it may have started for me
                await self.to_lobby(hero)
                await self.to_lobby(h1)
                await hero.tap('.lobby-tile.is-holdem')
                await hero.wait_screen('hroom', 10000)
                await until(lambda: hero.code and hero.code != code, 8)
                for _ in range(6):
                    v = await hero.pg.evaluate("+(document.querySelector('.hd-step-v')||{}).textContent")
                    if v <= 2:
                        break
                    await hero.tap(f'.room-step-btn[data-v="{v - 1}"]')
                    await until(lambda: hero.snap['table']['settings']['seats'] == v - 1, 4)
                h1.paused = True       # the helpers' loop takes any open amount popup (a rebuy): not this buy-in
                await self.join(h1, hero.code)
                h1.paused = False
                await hero.tap('[data-host="start"]')
                await hero.wait_screen('htable', 12000)
                await self.my_turn(30)
                await self.shot('heads', 1200)
                await self.hero_act('call')
            await self.step('heads', heads())

            async def nine():
                h1.paused = True
                await self.to_lobby(hero)
                await hero.tap('.lobby-tile.is-holdem')
                await hero.wait_screen('hroom', 10000)
                await until(lambda: hero.snap['table']['code'] and not hero.snap['table']['hand'] and hero.seat is not None, 8)
                for _ in range(6):
                    v = await hero.pg.evaluate("+(document.querySelector('.hd-step-v')||{}).textContent")
                    if v >= 9:
                        break
                    await hero.tap(f'.room-step-btn[data-v="{v + 1}"]')
                    await until(lambda: hero.snap['table']['settings']['seats'] == v + 1, 4)
                await hero.tap('[data-host="fillBots"]')
                await until(lambda: all(hero.snap['table']['seats']), 8)
                await self.shot('nine-room', 600)
                await hero.tap('[data-host="start"]')
                await hero.wait_screen('htable', 12000)
                await self.my_turn(60)
                await self.shot('nine', 1300)
            await self.step('nine', nine())
        except Exception as e:
            self.failed.append(f'run: {type(e).__name__} {str(e)[:200]}')
            log(f'[{self.vp}-{self.lang}] run stopped: {e!r}'[:300])
            with_ctx = self.hero.pg
            if with_ctx:
                await self.hero.shot('stopped')
        finally:
            if helper_task:
                helper_task.cancel()
            errors = {p.tag: p.console_errors(svc) for p in self.all if p.pg}
            for p in self.all:
                if p.ctx:
                    await p.ctx.close()
            svc.stop()
        if os.environ.get('HD_TRACE'):
            log('\n  '.join(self.trace))
        return {'run': f'{self.vp}-{self.lang}', 'shots': len(self.taken), 'failed': self.failed,
                'console_errors': {k: v[:3] for k, v in errors.items() if v}}


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '') for a in sys.argv[1:] if a.startswith('--'))
    vps = args or ['desk', 'hd', 'ifr', 'phone', 'portrait']
    langs = ['zh', 'en'] if opts.get('lang', 'both') == 'both' else [opts['lang']]
    par = int(opts.get('par', '2'))
    jobs = [(vp, lang) for vp in vps for lang in langs]
    results = []
    async with browser() as br:
        sem = asyncio.Semaphore(par)
        ports = list(range(8801, 8801 + par))

        async def one(vp, lang):
            async with sem:
                port = ports.pop()
                try:
                    r = await Run(br, vp, lang, port).go()
                finally:
                    ports.append(port)
                log(json.dumps(r, ensure_ascii=False))
                results.append(r)
        await asyncio.gather(*(one(vp, lang) for vp, lang in jobs))
    bad = [r for r in results if r['failed'] or r['console_errors']]
    print(json.dumps({'runs': len(results), 'shots': sum(r['shots'] for r in results), 'bad': bad}, ensure_ascii=False, indent=1))
    return not bad


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
