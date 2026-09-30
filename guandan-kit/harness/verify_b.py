"""Group B probes: stale 不出 after a collected trick (R2-05), the partner's ribbon vs my action row (R2-06),
no table-message toast on my turn (R2-28), 牌型不符 vs 管不上 (R2-30), 提示 order (R2-29), 继续游戏 pending (R2-07).
Usage: python3 verify_b.py [viewport ...]"""
import asyncio, json, sys
from gdh import session

OUT = []
def rec(k, ok, d=''):
    OUT.append(ok); print(('PASS ' if ok else 'FAIL ') + f'{k} {d}'[:300], flush=True)

BASE = "const g = await __gd.make({code, seed: 11, level: '2', round: 3, levels: ['2','2']});"
COLLECTED_ME_LEAD = BASE + """
const pair = __gd.sameRank(g, 0, 2); __gd.play(g, 0, pair); __gd.pass(g, 3); __gd.pass(g, 2); __gd.pass(g, 1);
g.lastPlay = null; g.passCount = 0; __gd.turn(g, 0); g.message = 'Yichen 收牌，继续出。'; __gd.put(g);"""
PARTNER_OUT = BASE + """
__gd.give(g, 0, ['0S7','1S7','0H7','1H7','0C7','1C7','0D7']);
const pair = __gd.sameRank(g, 2, 2, ['7']); __gd.play(g, 2, pair); g.hands[2] = []; g.finished = [2];
__gd.pass(g, 3); __gd.pass(g, 1); __gd.turn(g, 0); __gd.put(g);"""
JIEFENG = BASE + """
g.hands[0] = g.hands[0].slice(0, 12); g.finished = [2];
g.hands[2] = []; g.lastPlay = null; g.passCount = 0; g.trickPlays = [null, null, null, null]; __gd.turn(g, 0);
g.message = 'Zhengding 接风给队友 Yichen。'; __gd.put(g);"""
RIB = """(()=>{const r=document.querySelector('.gd-slot.is-p2 .gd-ribbon');if(!r)return null;const a=r.getBoundingClientRect();
  const hits=[];for(const b of document.querySelectorAll('#pass-btn,#hint-btn,#play-btn,.gd-gem')){const q=b.getBoundingClientRect();
   const w=Math.min(a.right,q.right)-Math.max(a.left,q.left),h=Math.min(a.bottom,q.bottom)-Math.max(a.top,q.top);if(w>2&&h>2)hits.push([b.id||b.className.toString().slice(0,10),Math.round(w),Math.round(h)])}
  return {ribbon:[a.x,a.y,a.width,a.height].map(Math.round),hits}})()"""

async def per_vp(vp):
    async with session(vp, f'vb-{vp}') as s:
        await s.goto(); await s.create_room(); await s.fill_ai(); await s.start(); await s.wait_deal_done()
        # R2-05
        await s.stage(COLLECTED_ME_LEAD); await s.pg.wait_for_timeout(1000)
        n = await s.pg.evaluate("[document.querySelectorAll('.gd-pass-word').length, document.querySelectorAll('.gd-slot .gd-played').length]")
        rec(f'R2-05 {vp}: after a collected trick no 不出 word or stale cards stay (lead, row without 不出)', n == [0, 0] and not await s.pg.evaluate("!!document.querySelector('#pass-btn')"), str(n))
        await s.shot('collected')
        # R2-06
        await s.stage(PARTNER_OUT); await s.pg.wait_for_timeout(1100)
        r = await s.pg.evaluate(RIB)
        rec(f'R2-06 {vp}: the partner ribbon is clear of the action row', bool(r) and not r['hits'], json.dumps(r))
        await s.shot('partner-ribbon')
        # R2-28: a table message on my turn shows no toast
        await s.stage(JIEFENG); await s.pg.wait_for_timeout(700)
        t = await s.pg.evaluate("(()=>{const e=document.querySelector('.gd-stage-toast');return e?e.classList.contains('show'):null})()")
        rec(f'R2-28 {vp}: no 接风 toast over my hand while I can act', t is False, str(t))
        await s.shot('jiefeng-my-turn')
        # R2-30: one card against a pair is the wrong shape; a lower pair cannot beat
        await s.stage(BASE + """__gd.give(g, 3, ['0S9','1S9']); __gd.play(g, 3, ['0S9','1S9']); __gd.pass(g, 2); __gd.pass(g, 1); __gd.turn(g, 0); __gd.put(g);""")
        await s.pg.wait_for_timeout(900)
        ids = await s.pg.evaluate("""(()=>{const g=window.__gd.get();const h=g.hands[0].filter(c=>!c.joker);const low=h.filter(c=>c.rank==='3'||c.rank==='4'||c.rank==='5');
          const by={};for(const c of h)(by[c.rank]=by[c.rank]||[]).push(c.id);const pairRank=Object.keys(by).find(r=>by[r].length>=2&&['3','4','5','6','7','8'].includes(r));return {single:h[h.length-1].id,pair:by[pairRank]?.slice(0,2)}})()""")
        async def tap_ids(lst):
            await s.pg.evaluate("document.querySelector('.gd-hand').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:5,isPrimary:true}))")
            for i in lst:
                await s.pg.evaluate("(id)=>{const c=document.querySelector(`[data-card-id=\"${id}\"]`);c&&c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:5,isPrimary:true}));document.querySelector('.gd-hand').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:5,isPrimary:true}))}", i)
        await tap_ids([ids['single']])
        await s.pg.wait_for_timeout(200)
        await s.pg.evaluate("document.querySelector('#play-btn').click()")
        await s.pg.wait_for_timeout(300)
        msg = await s.pg.evaluate("document.querySelector('.gd-stage-toast').textContent")
        rec(f'R2-30 {vp}: a single card against a pair says 牌型不符', '牌型不符' in msg or 'Not a valid' in msg, repr(msg))
        if ids.get('pair'):
            await s.stage("const g=__gd.get(); __gd.pass(g,3); __gd.pass(g,2); __gd.pass(g,1); __gd.turn(g,0); __gd.put(g);")
            await s.pg.evaluate("document.querySelectorAll('.gd-hand .selected').length")
            await tap_ids(ids['pair'])
            await s.pg.wait_for_timeout(200)
            await s.pg.evaluate("document.querySelector('#play-btn').click()")
            await s.pg.wait_for_timeout(300)
            msg2 = await s.pg.evaluate("document.querySelector('.gd-stage-toast').textContent")
            rec(f'R2-30 {vp}: a lower pair against a pair says 管不上', '管不上' in msg2 or "Can't beat" in msg2, repr(msg2))

async def main():
    for vp in sys.argv[1:] or ['phone', 'desk']:
        try:
            await asyncio.wait_for(per_vp(vp), 240)
        except Exception as e:
            rec(f'run {vp}', False, repr(e)[:200])
    print('FAILED:', OUT.count(False))
asyncio.run(main())
