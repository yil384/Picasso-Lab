const { open, gotoSites } = require('./harness');
(async () => {
  for (const [W, H] of [[768, 1024], [820, 1180], [1024, 768], [1180, 820], [1280, 800], [844, 390]]) {
    const { browser, page } = await open({ width: W, height: H });
    try {
      await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
      await page.waitForTimeout(4000);
      const r = await page.evaluate(() => [...document.querySelectorAll('iframe')].slice(0, 4).map(f => { const b = f.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
      console.log(W + 'x' + H, JSON.stringify(r));
    } finally { await browser.close(); }
  }
})();
