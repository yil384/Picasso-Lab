"""Live Google Sites /blogs page with the embed code optionally swapped for a local file, plus a real
back/forward (chrome.tabs.goBack = the browser's own back button path, including skipped entries)."""
import asyncio, html, os, re, shutil, tempfile
from playwright.async_api import async_playwright
EXT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ext')
SITE = 'https://yufeiding.ucsd.edu/blogs'

class H:
    async def start(self, p, local=None, routes=None, vw=1280, vh=900):
        self.dir = tempfile.mkdtemp()
        self.ctx = await p.chromium.launch_persistent_context(self.dir, channel='chromium', headless=True,
            viewport={'width': vw, 'height': vh}, args=[f'--disable-extensions-except={EXT}', f'--load-extension={EXT}'])
        self.sw = self.ctx.service_workers[0] if self.ctx.service_workers else await self.ctx.wait_for_event('serviceworker')
        self.pg = self.ctx.pages[0] if self.ctx.pages else await self.ctx.new_page()
        self.cdp = await self.ctx.new_cdp_session(self.pg)
        if local:
            code = open(local, encoding='utf-8').read()
            async def site(route):
                r = await route.fetch(); body = await r.text()
                new, n = re.subn(r'data-code="[^"]*"', lambda m: 'data-code="' + html.escape(code, quote=True) + '"', body, count=1)
                assert n == 1
                await route.fulfill(response=r, body=new)
            await self.ctx.route(SITE, site)
        for pat, fn in (routes or {}).items(): await self.ctx.route(pat, fn)
        return self

    async def open(self, url=SITE, probe="!!document.getElementById('blog-list')"):
        for attempt in range(3):
            try:
                await self.pg.goto(url, wait_until='domcontentloaded', timeout=45000); break
            except Exception:
                if attempt == 2: raise
        if url != SITE: return await self.pg.wait_for_timeout(3500)
        for _ in range(60):                       # until the embed has rendered
            if await self.embed(probe): break
            await self.pg.wait_for_timeout(500)
        await self.pg.wait_for_timeout(1500)      # let the history frame load and report

    async def embed(self, probe="!!document.getElementById('blog-list')"):
        for f in self.pg.frames:
            try:
                if await f.evaluate(probe): return f
            except Exception: pass

    async def hist(self):
        h = await self.cdp.send('Page.getNavigationHistory'); return h['currentIndex'], len(h['entries'])

    async def ui_back(self, wait=2000):
        await self.sw.evaluate('uiBack()'); await self.pg.wait_for_timeout(wait)

    async def ui_fwd(self, wait=2000):
        await self.sw.evaluate('uiFwd()'); await self.pg.wait_for_timeout(wait)

    async def view(self):
        fr = await self.embed()
        top = self.pg.url
        if not fr: return {'top': top, 'blank': True}
        v = await fr.evaluate("""({article: document.getElementById('article-view').classList.contains('active')
            ? document.getElementById('article-url-text').textContent : null,
            trueBlogs: document.body.classList.contains('true-blogs'),
            cards: document.querySelectorAll('.blog-card').length})""")
        v['top'] = top; return v

    async def stop(self):
        await self.ctx.close(); shutil.rmtree(self.dir, ignore_errors=True)
