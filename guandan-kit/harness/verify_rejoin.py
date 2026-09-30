"""Rejoin by reload mid-round (state re-seeded into the in-memory Firebase): the table, hand, 首 tag and slots come back
consistent (no stale 不出 or cards once a trick is collected), and the round still plays to the end. Usage: python3 verify_rejoin.py [vp ...]"""
import asyncio, json, sys
from gdh import session
OUT = []
def rec(k, ok, d=''):
    OUT.append(ok); print(('PASS ' if ok else 'FAIL ') + f'{k} {d}'[:300], flush=True)
async def per_vp(vp):
    async with session(vp, f'rj-{vp}') as s:
        await s.goto(); await s.create_room(); await s.fill_ai(); await s.start(); await s.wait_deal_done()
        # play a few of my turns
        n = 0
        for _ in range(200):
            st = await s.state()
            if st['phase'] != 'playing': break
            if st['turn'] == st['mine'] and await s.my_turn_ready():
                await s.act(); n += 1; await s.pg.wait_for_timeout(400)
                if n >= 3: break
            else:
                await s.pg.wait_for_timeout(250)
        await s.pg.wait_for_timeout(800)
        g = await s.get_game(); code = g['roomCode']; st = await s.state()
        await s.goto(f'?room={code}', store={f'guandanRooms/{code}': g}, wait=2200)
        after = await s.state()
        hand = await s.pg.evaluate("document.querySelectorAll('.gd-hand [data-card-id]').length")
        rec(f'rejoin {vp}: the table returns with my whole hand ({hand} cards, state {st["hand"]})', hand == st['hand'] and hand > 0, json.dumps(after)[:120])
        first = await s.pg.evaluate("document.querySelectorAll('.gd-first').length")
        rec(f'rejoin {vp}: the 首 tag survives the reload', first >= 1, str(first))
        stale = await s.pg.evaluate("""(()=>{const g=window.__gd.get();return {last:!!g.lastPlay,words:document.querySelectorAll('.gd-pass-word').length,cards:document.querySelectorAll('.gd-slot .gd-played').length}})()""")
        rec(f'rejoin {vp}: slots follow the trick state', (stale['last'] or (stale['words'] == 0 and stale['cards'] == 0)), json.dumps(stale))
        r = await s.play_round(limit=200)
        rec(f'rejoin {vp}: the round plays to its end after the reload', r['state']['phase'] in ('roundOver', 'gameOver'), json.dumps(r['state'])[:120])
        rec(f'rejoin {vp}: no console errors', not s.errors, str(s.errors[:3]))
async def main():
    for vp in sys.argv[1:] or ['phone', 'desk']:
        try: await asyncio.wait_for(per_vp(vp), 300)
        except Exception as e: rec(f'run {vp}', False, repr(e)[:200])
    print('FAILED:', OUT.count(False))
asyncio.run(main())
