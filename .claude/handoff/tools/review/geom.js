const { open } = require('../harness');
(async () => {
  const widths = process.argv.slice(2).map(Number);
  const { browser, page } = await open({ width: 1024, height: 800, localPages: true });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); });
    await page.waitForTimeout(800);
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.waitForTimeout(200);
      const r = await page.evaluate(() => {
        const out = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
        out.cards = [...document.querySelectorAll('#blog-list .blog-card')].map(c => {
          const cr = c.getBoundingClientRect(); const a = c.querySelector('.egg-art').getBoundingClientRect();
          const cs = getComputedStyle(c);
          const inner = cr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - parseFloat(cs.borderLeftWidth)*2;
          const over = [...c.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.right > cr.right + 0.5 || b.left < cr.left - 0.5; }).map(e => e.className.baseVal ?? e.className).slice(0,3);
          return `card ${cr.width.toFixed(0)} inner ${inner.toFixed(0)} art ${a.width.toFixed(0)}x${a.height.toFixed(0)} disp ${cs.display} over ${JSON.stringify(over)}`;
        });
        const st = document.querySelector('.egg-stamp').getBoundingClientRect();
        const h1 = document.querySelector('.blog-hero h1').getBoundingClientRect();
        const back = document.querySelector('.egg-back').getBoundingClientRect();
        out.stamp = [st.left, st.top, st.right, st.bottom].map(Math.round); out.h1 = [h1.left, h1.top, h1.right, h1.bottom].map(Math.round); out.back=[back.left, back.top, back.right, back.bottom].map(Math.round);
        return out;
      });
      console.log(w, JSON.stringify(r));
    }
  } finally { await browser.close(); }
})();
