"""The service restarts in the middle of a hand (DESIGN §9): the page shows 重新连接中…, keeps the table, disables the
pills, reconnects with backoff, and the hand goes on from the saved table. Needs the real dealer (events/holdem-dealer).
Usage: python3 restart.py [desk|phone|portrait]"""
import asyncio, sys, tempfile
from hdh import dealer, hsession

FAILS = []


def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f' {detail}' if detail else ''), flush=True)
    if not ok:
        FAILS.append(name)


async def main(vp):
    data = tempfile.mkdtemp(prefix='hd-restart-')
    async with hsession(vp, None, f'restart-{vp}') as s:
        with dealer('real', data) as d:
            s.d = d
            await s.goto(wait=1500)
            await s.press('.lobby-tile.is-practice')
            await s.wait_screen('htable', 10000)
            await s.pg.wait_for_selector('.hd-actions [data-act]', timeout=30000)
            hand = await s.pg.evaluate("document.querySelector('.hd-mark span').textContent")
            hole = await s.pg.evaluate("[...document.querySelectorAll('.hd-hole .card')].map(c => c.getAttribute('aria-label')).join(' ')")
        # the service is down: the table stays, a small pill says so, the pills stop taking taps
        await s.pg.wait_for_timeout(1200)
        pill = await s.pg.evaluate("(document.querySelector('.hd-status')||{}).textContent||''")
        check('down: 重新连接中… pill', '重新连接' in pill, pill)
        stale = await s.pg.evaluate("document.querySelector('.hd-stage').classList.contains('is-stale')")
        check('down: the action pills are disabled', stale)
        check('down: still on the table screen', await s.pg.evaluate("document.body.dataset.screen") == 'htable')
        await s.shot('down')
        with dealer('real', data) as d:
            s.d = d
            await s.pg.wait_for_function("!(document.querySelector('.hd-status')||{}).textContent", timeout=20000)
            await s.pg.wait_for_timeout(800)
            hand2 = await s.pg.evaluate("document.querySelector('.hd-mark span').textContent")
            hole2 = await s.pg.evaluate("[...document.querySelectorAll('.hd-hole .card')].map(c => c.getAttribute('aria-label')).join(' ')")
            check('back: the same hand resumes', hand2 == hand and hole2 == hole, f'{hand} {hole} -> {hand2} {hole2}')
            turn = await s.pg.evaluate("!!document.querySelector('.hd-actions [data-act]') && !document.querySelector('.hd-stage').classList.contains('is-stale')")
            check('back: my turn is live again (fresh timer)', turn)
            await s.shot('back')
            if turn:
                await s.press('[data-act=fold]')
                await s.pg.wait_for_timeout(1500)
            errors = [e for e in s.errors if 'WebSocket' not in e and 'ERR_CONNECTION_REFUSED' not in e]
            check('no console errors besides the dropped socket', not errors, str(errors[:3]))
    print('FAILED' if FAILS else 'ALL PASS', FAILS)
    return not FAILS


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'desk')) else 1)
