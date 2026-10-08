"""The service restarts in the middle of a hand (DESIGN §9): the page shows 重新连接中…, keeps the table, disables the
pills, reconnects with backoff; the hand in progress was called off (its deck is never written to disk): the page says
so, my chips are back and a new hand is dealt. Needs the real dealer (events/holdem-dealer).
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
            toast = await s.pg.evaluate("[...document.querySelectorAll('.show')].map(e => e.textContent).join(' ')")
            check('back: the page says the hand was called off and the chips went back', '已取消' in toast, toast)
            # a new hand is dealt (the hand number moves on) and play goes on
            ok = True
            try:
                await s.pg.wait_for_function("h => { const t = document.querySelector('.hd-mark span'); return t && t.textContent !== h && /手|Hand/.test(t.textContent); }", arg=hand, timeout=15000)
            except Exception:
                ok = False
            hand2 = await s.pg.evaluate("document.querySelector('.hd-mark span').textContent")
            check('back: a new hand is dealt', ok, f'{hand} -> {hand2}')
            await s.shot('back')
            try:
                await s.pg.wait_for_selector('.hd-actions [data-act]', timeout=30000)
                await s.press('[data-act=fold]')
                await s.pg.wait_for_timeout(1500)
                check('back: my turn comes and my actions go through', True)
            except Exception as e:
                check('back: my turn comes and my actions go through', False, str(e)[:80])
            errors = [e for e in s.errors if 'WebSocket' not in e and 'ERR_CONNECTION_REFUSED' not in e]
            check('no console errors besides the dropped socket', not errors, str(errors[:3]))
    print('FAILED' if FAILS else 'ALL PASS', FAILS)
    return not FAILS


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'desk')) else 1)
