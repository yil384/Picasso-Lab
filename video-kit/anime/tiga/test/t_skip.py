import asyncio
from playwright.async_api import async_playwright
from t_tiga import start, embed, type_picasso, watch, gframe
async def main():
    async with async_playwright() as p:
        h = await start(p)
        await type_picasso(h); await h.pg.wait_for_timeout(1200)
        await h.pg.keyboard.press('Escape')
        await watch(h, 2.5, 'skip', shots=(0.1, 2.0))
        g = await gframe(h)
        print('guandan focused after reveal:', await g.evaluate('document.hasFocus()'))
        await h.pg.keyboard.type('picasso', delay=80)          # leave, then skip the return film with a click
        await h.pg.wait_for_timeout(1500)
        await h.pg.mouse.click(640, 400)
        await watch(h, 2.0, 'skipout', shots=(0.1, 1.5))
        await h.stop()
asyncio.run(main())
