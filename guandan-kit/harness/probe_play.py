import asyncio, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from play import setup, PREFIX, STATE_JS
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        try:
            ctx = await br.new_context(viewport={'width': 844, 'height': 390}, device_scale_factor=2, has_touch=True, is_mobile=True)
            await setup(ctx)
            await ctx.add_init_script("try{localStorage.setItem('picasso.guandan.client','c_shooter');localStorage.setItem('picasso.guandan.name','Yichen');}catch(e){}")
            pg = await ctx.new_page(); errs=[]
            pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
            await pg.goto(PREFIX + 'events/guandan.html', wait_until='load'); await pg.wait_for_timeout(1200)
            await pg.click('#create-room'); await pg.wait_for_timeout(800); await pg.click('#fill-ai'); await pg.wait_for_timeout(500)
            await pg.click('#start-game'); await pg.wait_for_timeout(5000)
            for _ in range(200):
                st = await pg.evaluate(STATE_JS)
                if st['phase']=='playing' and st['turn']==st['mine'] and not await pg.evaluate("document.querySelector('#hint-btn')?.disabled"): break
                await pg.wait_for_timeout(300)
            print('my turn', st)
            await pg.wait_for_timeout(1200)
            for t in range(40):
                if t in (0,16): await pg.click('#hint-btn'); print('-- hint click')
                info = await pg.evaluate("""(()=>{const b=[...document.querySelectorAll('#play-btn')];return {n:b.length, dis:b.map(x=>x.disabled), sel:document.querySelectorAll('.card.selected').length, vis:b.map(x=>{const r=x.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}), cls:b.map(x=>x.className), top:(()=>{const r=b[0]?.getBoundingClientRect(); if(!r) return null; const el=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return el?el.id||el.className:null})()}})()""")
                st = await pg.evaluate(STATE_JS)
                print(t*250,'ms', info['sel'], info['cls'], await pg.evaluate("document.querySelector('#play-btn')?.getAttribute('aria-disabled')"), 'turn', st['turn'], 'phase', st['phase'])
                await pg.wait_for_timeout(250)
            print('errors', errs)
        finally:
            await br.close()
asyncio.run(main())
