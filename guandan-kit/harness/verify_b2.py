"""Group B pending states: 继续游戏 (R2-07), the level steppers and 解散 (R2-27) on a slow connection (__fbDelay 2000)."""
import asyncio, json, sys
from gdh import session
RESULT = """const g = await __gd.make({code, seed: 11, level: '7', round: 3, levels: ['7','5'], me: 0, host: 0});
__gd.put(g); await new Promise(r => setTimeout(r, 300));
g.phase = 'roundOver'; g.finished = [0, 2, 1, 3]; g.levels = ['10', '5'];
for (const s of [0, 2]) g.hands[s] = [];
g.roundResult = { first: 0, firstTeam: 0, order: [0, 2, 1, 3], advance: 3, aceChallenge: false, acePassed: false, tributePayers: [3], nextStarter: 0 };
__gd.put(g);"""
OUT = []
def rec(k, ok, d=''):
    OUT.append(ok); print(('PASS ' if ok else 'FAIL ') + f'{k} {d}'[:300], flush=True)
async def per_vp(vp):
    async with session(vp, f'vb2-{vp}') as s:
        await s.goto(); await s.create_room(); await s.fill_ai()
        await s.pg.evaluate("window.__fbDelay = 2000")
        await s.press('#level-0-up')
        await s.pg.wait_for_timeout(250)
        c = await s.pg.evaluate("document.querySelector('#level-0-up').className")
        rec(f'R2-27 {vp}: a level arrow is pressed while its write waits', 'is-pending' in c, c)
        await s.pg.wait_for_timeout(2600)
        lv = await s.pg.evaluate("document.querySelector('#level-team-0 .room-step-v').textContent")
        rec(f'R2-27 {vp}: the step lands (start level 2 -> 3)', lv == '3', lv)
        await s.pg.evaluate("window.__fbDelay = 2000")
        await s.press('#delete-room')
        await s.pg.wait_for_selector('[data-confirm="1"]', timeout=4000)
        await s.press('[data-confirm="1"]')
        await s.pg.wait_for_timeout(500)
        st = await s.pg.evaluate("({pending:document.querySelector('#delete-room')?.className, toast:document.querySelector('.toast.show')?.textContent})")
        rec(f'R2-27 {vp}: 解散 confirms with a pressed button and a toast', st['pending'] and 'is-pending' in st['pending'] and '解散' in (st['toast'] or ''), json.dumps(st, ensure_ascii=False))
        await s.shot('dissolve-pending')
    async with session(vp, f'vb2r-{vp}') as s:
        await s.goto(); await s.create_room(); await s.fill_ai(); await s.start(); await s.wait_deal_done()
        await s.stage(RESULT)
        await s.pg.wait_for_selector('#next-round', timeout=8000)
        await s.pg.wait_for_timeout(1800)
        await s.pg.evaluate("window.__fbDelay = 2000")
        await s.press('#next-round')
        cls = []
        for ms in (150, 600, 1200):
            await s.pg.wait_for_timeout(ms if not cls else ms - 150)
            cls.append(await s.pg.evaluate("document.querySelector('#next-round')?.className"))
        rec(f'R2-07 {vp}: 继续游戏 shows a pending state during the write', all('is-pending' in (c or '') for c in cls), str(cls))
        await s.shot('next-pending')
        await s.pg.evaluate("document.querySelector('#next-round')?.click()")   # a second tap
        await s.pg.wait_for_timeout(300)
        t = await s.pg.evaluate("(()=>{const e=document.querySelector('.gd-stage-toast');return e&&e.classList.contains('show')?e.textContent:''})()")
        rec(f'R2-07 {vp}: a second tap raises no false "not ready" toast', '还没准备好' not in t and 'not ready' not in t, repr(t))
async def main():
    for vp in sys.argv[1:] or ['phone']:
        try: await asyncio.wait_for(per_vp(vp), 200)
        except Exception as e: rec(f'run {vp}', False, repr(e)[:200])
    print('FAILED:', OUT.count(False))
asyncio.run(main())
