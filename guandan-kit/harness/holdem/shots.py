"""Screenshots of every Hold'em screen and state, against the fake dealer's scripted scenes (HD_DEALER=fake, default).
Usage: python3 shots.py [desk hd ifr phone portrait] [--lang zh|en|both] [--only lobby,room,preflop,...]
Writes HD_SHOTS/<vp>-<lang>-<step>.jpg (default /tmp/holdem-shots) and prints console errors per viewport."""
import asyncio, sys
from hdh import dealer, hsession

TABLE_STEPS = ['preflop', 'raise', 'flop', 'turn', 'river', 'allin', 'showdown', 'split', 'quads', 'heads', 'nine',
               'waiting', 'sitout', 'busted', 'spectator', 'reconnect', 'menu', 'last', 'topup', 'hands']


async def run(vp, lang, only, d):
    want = lambda name: not only or name in only
    async with hsession(vp, d, f'{vp}-{lang}') as s:
        await s.goto(lang=lang, wait=1600)
        if want('lobby'):
            await s.shot('lobby')
        if want('board'):
            await s.press('[data-lobby="h-board"]')
            await s.pg.wait_for_selector('.hd-brow', timeout=6000)
            await s.pg.wait_for_timeout(600)
            await s.shot('board')
            await s.pg.keyboard.press('Escape')
            await s.pg.wait_for_timeout(300)
        if want('rules'):
            await s.press('[data-lobby="h-rules"]')
            await s.pg.wait_for_selector('.gd-rules-tab')
            await s.pg.wait_for_timeout(300)
            await s.shot('rules')
            tabs = await s.pg.query_selector_all('.gd-rules-tab')
            await tabs[3].click()
            await s.pg.wait_for_timeout(300)
            await s.shot('rules-hands')
            await s.pg.keyboard.press('Escape')
            await s.pg.wait_for_timeout(300)
        await s.press('.lobby-tile.is-holdem')
        await s.wait_screen('hroom')
        await s.pg.wait_for_timeout(900)
        if want('room'):
            await s.shot('room')
        await s.press('[data-host="fillBots"]')
        await s.pg.wait_for_timeout(700)
        if want('room'):
            await s.shot('room-full')
        if want('buyin'):
            await s.press('[data-stand]')
            await s.pg.wait_for_timeout(500)
            await s.press('[data-sit]')
            await s.pg.wait_for_selector('.hd-amount')
            await s.pg.wait_for_timeout(300)
            await s.shot('buyin')
            await s.press('.hd-amount [data-ok]')
            await s.pg.wait_for_timeout(600)
        await s.press('[data-host="start"]')
        await s.wait_screen('htable')
        await s.pg.wait_for_timeout(1600)
        for step in TABLE_STEPS:
            if not want(step):
                continue
            scene = {'raise': 'preflop', 'menu': 'flop', 'last': 'turn', 'topup': 'river', 'hands': 'river', 'reconnect': 'turn'}.get(step, step)
            await s.scene(scene)
            if step != 'reconnect':
                # after the reconnect step the socket may still be backing off: wait for the live table first
                await s.pg.wait_for_function("!document.querySelector('.hd-stage.is-stale')", timeout=20000)
            await s.pg.wait_for_timeout(2400 if scene in ('showdown', 'split', 'quads') else 1500)
            if step == 'raise':
                await s.press('[data-act="raise"]')
                await s.pg.wait_for_timeout(400)
                await s.press('[data-preset="0.6666666666666666"]')
                await s.pg.wait_for_timeout(300)
            elif step == 'menu':
                await s.press('[data-menu]')
                await s.pg.wait_for_timeout(400)
            elif step == 'last':
                await s.press('[data-pop="last"]')
                await s.pg.wait_for_selector('.hd-last')
                await s.pg.wait_for_timeout(400)
            elif step == 'topup':
                await s.press('[data-menu]')
                await s.pg.wait_for_timeout(300)
                await s.press('[data-m="topup"]')
                await s.pg.wait_for_selector('.hd-amount')
                await s.pg.wait_for_timeout(300)
            elif step == 'hands':
                await s.press('[data-menu]')
                await s.pg.wait_for_timeout(300)
                await s.press('[data-m="hands"]')
                await s.pg.wait_for_selector('.hd-rank-row')
                await s.pg.wait_for_timeout(400)
            elif step == 'reconnect':
                d.post('/__drop', {'ms': 4000})
                await s.pg.wait_for_timeout(500)
            elif step == 'turn':
                await s.press('[data-pre="call"]')
                await s.pg.wait_for_timeout(200)
            await s.shot(step)
            if step in ('menu', 'last', 'topup', 'hands'):
                await s.pg.keyboard.press('Escape')
                await s.pg.wait_for_timeout(300)
            if step == 'reconnect':
                await s.pg.wait_for_timeout(5000)
            while await s.pg.evaluate("!!document.querySelector('.gd-popup-layer.is-open')"):
                await s.pg.keyboard.press('Escape')
                await s.pg.wait_for_timeout(250)
        errors = [e for e in s.errors if 'ERR_CONNECTION_REFUSED' not in e and 'WebSocket' not in e]
        print(f'{vp}-{lang} console errors:', errors)
        return errors


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '') for a in sys.argv[1:] if a.startswith('--'))
    vps = args or ['desk', 'hd', 'ifr', 'phone', 'portrait']
    langs = ['zh', 'en'] if opts.get('lang', 'zh') == 'both' else [opts.get('lang', 'zh')]
    only = set(filter(None, opts.get('only', '').split(',')))
    bad = []
    with dealer('fake') as d:
        for vp in vps:
            for lang in langs:
                bad += await run(vp, lang, only, d)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    asyncio.run(main())
