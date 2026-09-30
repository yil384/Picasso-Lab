import asyncio
from playwright.async_api import async_playwright
from t_tiga import start, type_picasso, watch
async def main():
    async with async_playwright() as p:
        h = await start(p)
        await type_picasso(h); await h.pg.wait_for_timeout(8500)
        await h.pg.keyboard.type('picasso', delay=80)
        await watch(h, 7.6, 'out2', every=0.4, shots=(0.25, 0.8, 1.6, 2.6, 3.5, 4.3, 5.2, 6.0, 6.9, 7.4))
        await h.stop()
asyncio.run(main())
