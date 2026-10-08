"""Hold'em flows beyond one player: the service offline, invite links, a second player joining the waiting room,
a guest's view, the host starting, the leave paths. Usage: python3 flows.py [desk|phone|portrait]  (the real dealer,
events/holdem-dealer; HD_DEALER=fake for the scripted stand-in; the offline part needs no service). Prints PASS / FAIL;
shots in HD_SHOTS."""
import asyncio, sys
from playwright.async_api import async_playwright
from hdh import dealer, HSession, LAUNCH_ARGS, Dealer

FAILS = []


def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f' {detail}' if detail else ''), flush=True)
    if not ok:
        FAILS.append(name)


async def offline(br, vp):
    s = HSession(br, vp, f'off-{vp}', Dealer('none', 8799))   # nothing listens there
    await s.goto(wait=300)
    check('offline: the lobby is up at once', await s.pg.evaluate("document.body.dataset.screen") == 'lobby')
    await s.pg.wait_for_timeout(1500)
    plate = await s.pg.evaluate("(document.querySelector('.lobby-tile.is-holdem .tile-plate')||{}).textContent||''")
    check('offline: the 德州扑克 tile shows 离线', plate == '离线', plate)
    await s.press('.lobby-tile.is-practice')
    await s.pg.wait_for_timeout(300)
    toast = await s.pg.evaluate("document.getElementById('toast').textContent")
    check('offline: a tap says the table service is unavailable', '暂不可用' in toast, toast)
    await s.shot('lobby')
    await s.press('.lobby-game[data-game="guandan"]')
    await s.pg.wait_for_timeout(300)
    await s.create_room()
    await s.fill_ai()
    await s.start()
    check('offline: Guandan still deals', await s.pg.evaluate("document.body.dataset.screen") == 'table')
    await s.goto('?game=holdem&room=ABCDE', wait=4500)
    url = await s.pg.evaluate("location.search")
    check('offline: a Hold\'em link falls back to the lobby with a clean URL', await s.pg.evaluate("document.body.dataset.screen") == 'lobby' and url == '', url)
    errors = [e for e in s.errors if 'ERR_CONNECTION_REFUSED' not in e and 'WebSocket' not in e]
    check('offline: no console errors besides the refused connections', not errors, str(errors[:3]))
    await s.ctx.close()


async def two_players(br, vp, d):
    host = HSession(br, vp, f'host-{vp}', d)
    await host.goto(wait=1200)
    await host.press('.lobby-tile.is-holdem')
    await host.wait_screen('hroom')
    await host.pg.wait_for_timeout(800)
    code = await host.pg.evaluate("new URLSearchParams(location.search).get('room')")
    check('host: the URL carries the invite (?game=holdem&room=)', bool(code) and 'game=holdem' in await host.pg.evaluate("location.search"), code)
    guest = HSession(br, vp, f'guest-{vp}', d)
    await guest.goto(f'?game=holdem&room={code}', wait=2500, client='c_guest', name='Zaifeng')
    check('guest: the invite link opens the waiting room', await guest.pg.evaluate("document.body.dataset.screen") == 'hroom')
    wait = await guest.pg.evaluate("(document.querySelector('.room-wait')||{}).textContent||''")
    check('guest: not seated, asked to pick a seat', '入座' in wait, wait)
    await guest.shot('room-unseated')
    await guest.press('[data-sit]')
    await guest.pg.wait_for_selector('.hd-amount')
    await guest.press('.hd-amount [data-ok]')
    await guest.pg.wait_for_timeout(900)
    wait = await guest.pg.evaluate("(document.querySelector('.room-wait')||{}).textContent||''")
    check('guest: seated, waits for the host', '等待房主' in wait, wait)
    await guest.shot('room-seated')
    seated = await host.pg.evaluate("[...document.querySelectorAll('.hd-rseat:not(.is-empty) .hd-rplate b')].map(b => b.textContent)")
    check('host: sees the guest seated', 'Zaifeng' in seated, str(seated))
    await host.shot('room-two')
    await host.press('[data-host="start"]')
    await host.wait_screen('htable')
    await guest.wait_screen('htable')
    await host.pg.wait_for_timeout(2500)
    await host.shot('table-two')
    await guest.shot('table-two')
    hole = await guest.pg.evaluate("document.querySelectorAll('.hd-hole .card').length")
    check('guest: holds two cards at the table', hole == 2, str(hole))
    # nobody sees anyone else's cards: the host's page shows the guest as card backs only
    backs = await host.pg.evaluate("document.querySelectorAll('.hd-seat:not(.is-hero) .hd-backs .card.back').length")
    faces = await host.pg.evaluate("document.querySelectorAll('.hd-seat:not(.is-hero) .hd-shown .card').length")
    check('host: the guest is backs only', backs >= 2 and faces == 0, f'backs {backs} faces {faces}')
    # the guest leaves through the menu: the seat is given back and the page is the lobby again
    await guest.press('[data-menu]')
    await guest.pg.wait_for_timeout(300)
    await guest.press('[data-m="lobby"]')
    await guest.pg.wait_for_timeout(400)
    if await guest.pg.evaluate("!!document.querySelector('.gd-popup-layer [data-confirm=\"1\"]')"):
        await guest.press('.gd-popup-layer [data-confirm="1"]')
    await guest.pg.wait_for_timeout(1200)
    check('guest: 返回大厅 lands on the lobby', await guest.pg.evaluate("document.body.dataset.screen") == 'lobby')
    errors = host.errors + guest.errors
    check('two players: no console errors', not errors, str(errors[:3]))
    await guest.ctx.close()
    await host.ctx.close()


async def main(vp):
    async with async_playwright() as p:
        br = await p.chromium.launch(args=LAUNCH_ARGS)
        try:
            await offline(br, vp)
            with dealer() as d:
                await two_players(br, vp, d)
        finally:
            await br.close()
    print('FAILED' if FAILS else 'ALL PASS', FAILS)
    return not FAILS


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'desk')) else 1)
