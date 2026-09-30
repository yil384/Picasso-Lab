const { open } = require('../../harness');
(async () => {
  const widths = process.argv.slice(2).map(Number);
  for (const w of widths) {
    const { browser, page } = await open({ width: w, height: 844, localPages: true });
    try {
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); });
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => [...document.querySelectorAll('#blog-list .blog-card')].map(c => {
        const cs = getComputedStyle(c); const a = c.querySelector('.egg-art'); const ab = a.getBoundingClientRect(); const cb = c.getBoundingClientRect();
        const t = c.querySelector('.card-title').getBoundingClientRect();
        return { disp: cs.display, dir: cs.flexDirection, ai: cs.alignItems, inner: +(cb.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2*parseFloat(cs.borderLeftWidth)).toFixed(1), art: [+ab.width.toFixed(1), +ab.height.toFixed(1)], artLeftGap: +(ab.left-cb.left).toFixed(1), rightGap: +(cb.right - ab.right).toFixed(1), titleW: +t.width.toFixed(1) };
      }));
      console.log(w, JSON.stringify(r));
      if (process.env.SHOT) await page.screenshot({ path: __dirname + `/vf_${w}.jpg`, type: 'jpeg', quality: 70, fullPage: false });
    } finally { await browser.close(); }
  }
})();
