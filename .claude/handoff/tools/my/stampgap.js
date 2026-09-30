const { open } = require('../harness');
(async () => {
  const { browser, page } = await open({ width: 1280, height: 800 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.evaluate(async () => { renderTrueBlogs(); await eggFonts(); });
    await page.waitForTimeout(500);
    const widths = (process.argv[2] || '600,601,700,768,820,900,940,960,980,1000,1020,1040,1100,1280').split(',').map(Number);
    for (const hold of [false, true]) {
      await page.evaluate(h => document.body.classList.toggle('egg-hold-fonts', h), hold);
      for (const w of widths) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.waitForTimeout(60);
        const m = await page.evaluate(() => {
          const h1 = document.querySelector('.blog-hero h1');
          const rg = document.createRange(); rg.selectNodeContents(h1);
          const rs = [...rg.getClientRects()];
          const t = { l: Math.min(...rs.map(r => r.left)), r: Math.max(...rs.map(r => r.right)), t: Math.min(...rs.map(r => r.top)), b: Math.max(...rs.map(r => r.bottom)) };
          const s = document.querySelector('.egg-stamp').getBoundingClientRect();
          const st = getComputedStyle(document.querySelector('.egg-stamp')).position;
          const overlapX = Math.min(t.r, s.right) - Math.max(t.l, s.left), overlapY = Math.min(t.b, s.bottom) - Math.max(t.t, s.top);
          return { text: [Math.round(t.l), Math.round(t.r), Math.round(t.t), Math.round(t.b)], stamp: [Math.round(s.left), Math.round(s.right), Math.round(s.top), Math.round(s.bottom)], pos: st, gapX: Math.round(s.left - t.r), overlap: overlapX > 0 && overlapY > 0, lines: rs.length, sw: document.documentElement.scrollWidth };
        });
        console.log(hold ? 'hold' : 'real', w, JSON.stringify(m));
      }
    }
  } finally { await browser.close(); }
})();
