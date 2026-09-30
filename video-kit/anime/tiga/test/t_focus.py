import asyncio
from playwright.async_api import async_playwright
from t_tiga import start, embed, type_picasso, portal
async def main():
    async with async_playwright() as p:
        h = await start(p)
        await type_picasso(h)
        for k in range(6):
            await h.pg.wait_for_timeout(400)
            fr = await embed(h)
            print(k, await fr.evaluate("(document.activeElement && (document.activeElement.tagName + '#' + document.activeElement.id + '.' + document.activeElement.name)) + ' hasFocus=' + document.hasFocus()"))
        await h.stop()
asyncio.run(main())
