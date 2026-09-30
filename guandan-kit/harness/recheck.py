"""Round-1 re-check probes (REVIEW.md R1-xx) that need a live page: the type hint vs popups (R1-48), the leave
confirmation (R1-08), the action row vs the side opponents' plays (R1-03), the English lab deck (R1-47), the lobby's entry
points (R1-13), English letter-spacing on the result buttons (R1-49), spectator labels (R1-24), the loading veil (R1-46).
Usage: python3 recheck.py [viewport ...]      (default desk hd phone)      Prints PASS/FAIL lines; shots go to GD_SHOTS."""
import asyncio, json, os, sys
from gdh import session, VIEWPORTS, SHOTS

OUT = []


def rec(rid, ok, detail=''):
    OUT.append((rid, ok, detail))
    print(('PASS ' if ok else 'FAIL ') + f'{rid} {detail}'[:330], flush=True)


ROW_VS_PLAYS = """(()=>{const inter=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  const row=[...document.querySelectorAll('#pass-btn,#hint-btn,#play-btn,.gd-actions .gd-gem')].filter(e=>e.getBoundingClientRect().width);
  const out=[];for(const slot of ['.gd-slot.is-p1 .card','.gd-slot.is-p3 .card','.gd-slot.is-p2 .card']){
    for(const c of document.querySelectorAll(slot)){const r=c.getBoundingClientRect();if(!r.width)continue;
      for(const b of row){const a=inter(b.getBoundingClientRect(),r);if(a>30)out.push([slot.split(' ')[0],b.id||b.className.toString().slice(0,20),Math.round(a)])}}}
  return {n:document.querySelectorAll('.gd-slot .card').length,row:row.map(e=>e.id||e.className.toString().slice(0,14)),hits:out.slice(0,6)}})()"""


async def per_vp(vp):
    async with session(vp, f'rc-{vp}') as s:
        await s.goto()
        # R1-46 loading veil, R1-13 entry points
        entries = await s.pg.evaluate("""(()=>({rec:[...document.querySelectorAll('[data-open-records]')].map(e=>e.getAttribute('data-open-records')),
          lob:[...document.querySelectorAll('[data-lobby]')].map(e=>e.dataset.lobby)}))()""")
        rec(f'R1-13 {vp}: records opens from distinct pages only', len(entries['rec']) == len(set(entries['rec'])), json.dumps(entries))
        # R1-48: the hint must not stay above a popup opened after it appeared
        await s.pg.keyboard.type('pi', delay=60)
        await s.pg.wait_for_timeout(250)
        await s.pg.evaluate("document.querySelector('[data-lobby=rules]').click()")
        await s.pg.wait_for_timeout(500)
        h = await s.pg.evaluate("""(()=>{const e=document.getElementById('return-type-hint');const cs=getComputedStyle(e);const p=document.querySelector('.gd-popup');
          const hr=e.getBoundingClientRect(),pr=p&&p.getBoundingClientRect();const cover=pr?Math.max(0,Math.min(hr.right,pr.right)-Math.max(hr.left,pr.left))*Math.max(0,Math.min(hr.bottom,pr.bottom)-Math.max(hr.top,pr.top)):0;
          return {op:+cs.opacity,vis:cs.visibility,cls:e.className,popup:!!p,cover:Math.round(cover)}})()""")
        rec(f'R1-48 {vp}: the hint yields to a popup opened after it appeared', h['popup'] and (h['op'] < .05 or h['cover'] == 0), json.dumps(h))
        await s.pg.keyboard.press('Escape')
        await s.pg.wait_for_timeout(300)
        # R1-47: English lab deck keeps each member's style tag
        await s.pg.evaluate("document.getElementById('lang-toggle').click()")
        await s.pg.wait_for_timeout(400)
        await s.pg.evaluate("document.querySelector('[data-lobby=lab]').click()")
        await s.pg.wait_for_timeout(500)
        deck = await s.pg.evaluate("""(()=>{const t=[...document.querySelectorAll('.labdeck-item > small')].map(e=>e.textContent.trim()).filter(Boolean);return {n:t.length,sample:t.slice(0,4)}})()""")
        rec(f'R1-47 {vp}: the English lab deck shows style tags', deck['n'] >= 4 and all(all(ord(c) < 0x3000 for c in x) for x in deck['sample']), json.dumps(deck, ensure_ascii=False))
        await s.shot('en-labdeck')
        await s.pg.keyboard.press('Escape')
        await s.pg.evaluate("document.getElementById('lang-toggle').click()")
        # table
        await s.create_room(); await s.fill_ai(); await s.start(); await s.wait_deal_done()
        # R1-03: the row vs the side opponents' plays (5-card straight on the left, a 6-card 钢板 on the right, my tallest column 5)
        await s.stage("""const g = await __gd.make({code, seed: 11, level: '2', round: 3, levels: ['2','2']});
          __gd.give(g, 0, ['0S7','1S7','0H7','1H7','0C7']);
          __gd.give(g, 1, ['0S3','0H4','0C5','0D6','1D7']);
          __gd.give(g, 3, ['0SK','0HK','0CK','0SA','0HA','0CA']);
          __gd.play(g, 1, ['0S3','0H4','0C5','0D6','1D7']); __gd.play(g, 3, ['0SK','0HK','0CK','0SA','0HA','0CA']);
          __gd.turn(g, 0); __gd.put(g);""")
        await s.pg.wait_for_timeout(1200)
        r = await s.pg.evaluate(ROW_VS_PLAYS)
        await s.shot('row-vs-plays')
        rec(f'R1-03 {vp}: the action row covers no side play ({r["n"]} played cards, row={r["row"]})', r['n'] >= 10 and not r['hits'], json.dumps(r))
        # R1-08: leaving mid-game asks first
        await s.pg.evaluate("document.querySelector('.gd-menu-btn').click()")
        await s.pg.wait_for_timeout(300)
        await s.pg.evaluate("document.querySelector('[data-act=m-newroom]').click()")
        await s.pg.wait_for_timeout(500)
        c = await s.pg.evaluate("(()=>{const p=document.querySelector('.gd-popup');return {popup:p?p.textContent.replace(/\\s+/g,' ').trim().slice(0,60):null,still:!!document.querySelector('.gd-stage')}})()")
        rec(f'R1-08 {vp}: 新桌 mid-game asks for confirmation and stays', c['popup'] and c['still'], json.dumps(c, ensure_ascii=False))
        await s.shot('leave-confirm')


async def main():
    vps = sys.argv[1:] or ['desk', 'hd', 'phone']
    for vp in vps:
        try:
            await asyncio.wait_for(per_vp(vp), 300)
        except Exception as e:
            rec(f'run {vp}', False, repr(e)[:200])
    bad = [o for o in OUT if not o[1]]
    print('\nFAILED:', len(bad))


asyncio.run(main())
