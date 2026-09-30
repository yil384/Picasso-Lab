const { open } = require('../harness');
(async () => {
  const pre = process.argv[2];
  const widths = process.argv.slice(3).map(Number);
  const { browser, page } = await open({ width: 1024, height: 800 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); });
    await page.waitForTimeout(800);
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 760 });
      await page.waitForTimeout(250);
      const t = await page.evaluate(() => { const r = document.createRange(); const h = document.querySelector('.blog-hero h1'); r.selectNodeContents(h); const b = r.getBoundingClientRect(); const s = document.querySelector('.egg-stamp').getBoundingClientRect(); return { h1text: [b.left, b.top, b.right, b.bottom].map(Math.round), stamp: [s.left, s.top, s.right, s.bottom].map(Math.round) }; });
      console.log(w, JSON.stringify(t));
      await page.screenshot({ path: `review/${pre}_${w}.jpg`, type: 'jpeg', quality: 70 });
    }
  } finally { await browser.close(); }
})();
