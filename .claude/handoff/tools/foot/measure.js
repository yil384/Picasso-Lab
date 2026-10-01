// sizes of the footer embed boxes on the live site at several widths, and how Sites sizes them
const { open, gotoSites } = require('../harness');
(async () => {
  for (const [w, h] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
    const { browser, page } = await open({ width: w, height: h });
    try {
      await gotoSites(page, 'https://yufeiding.ucsd.edu/sponsors');
      await page.waitForTimeout(4000);
      const r = await page.evaluate(() => {
        const f = document.querySelector('footer') || document.body;
        const fr = f.getBoundingClientRect();
        const ifr = [...f.querySelectorAll('iframe')].map(e => { const b = e.getBoundingClientRect(); let p = e.parentElement, pad = ''; for (let i = 0; i < 6 && p; i++, p = p.parentElement) { const s = p.getAttribute('style') || ''; if (/padding-top/.test(s)) { pad = s.match(/padding-top:[^;]+/)[0]; break; } } return { x: Math.round(b.left), y: Math.round(b.top - fr.top), w: Math.round(b.width), h: Math.round(b.height), pad }; });
        return { footer: { w: Math.round(fr.width), h: Math.round(fr.height) }, ifr };
      });
      console.log(w, JSON.stringify(r));
    } finally { await browser.close(); }
  }
})();
