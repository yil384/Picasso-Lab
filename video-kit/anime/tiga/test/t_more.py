import asyncio, time
from playwright.async_api import async_playwright
from t_tiga import start, type_picasso, watch, local, fb, R
async def main():
    async with async_playwright() as p:
        # standalone guandan.html: exit button -> return film here -> events.html?from=guandan
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800})
        await ctx.route('https://yil384.github.io/Picasso-Lab/events/**', local)
        await ctx.route('https://www.gstatic.com/firebasejs/**', fb)
        await ctx.route('**/*firebaseio.com/**', lambda r: r.abort())
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        await pg.goto('https://yil384.github.io/Picasso-Lab/events/guandan.html', wait_until='load'); await pg.wait_for_timeout(1500)
        await pg.click('#back-events-btn'); t0 = time.time()
        for k in range(8):
            await pg.wait_for_timeout(1000)
            st = await pg.evaluate("(() => { const v = document.querySelector('.return-film video'); return { url: location.href.slice(-40), film: !!v, t: v ? +v.currentTime.toFixed(2) : null } })()")
            print(f'  standalone +{time.time()-t0:.1f}s', st)
            if k == 2: await pg.screenshot(path='shots/standalone_film.jpg', type='jpeg', quality=55)
        print('standalone errors', errs); await b.close()
        # portrait phone inside Google Sites
        h = await start(p, vw=390, vh=844)
        await type_picasso(h)
        await watch(h, 8.5, 'port', every=0.7, shots=(0.5, 3.0, 5.5, 8.0))
        await h.stop()
asyncio.run(main())
