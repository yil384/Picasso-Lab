const { open } = require('../harness');
(async () => {
  const widths = process.argv.slice(2).map(Number);
  for (const w of widths) {
    const { browser, page } = await open({ width: w, height: 760 });
    try {
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); await document.fonts.ready; });
      await page.waitForTimeout(700);
      const t = await page.evaluate(() => {
        const h = document.querySelector('.blog-hero h1');
        const r = document.createRange();
        // last text node characters: per-letter rects
        const tn = h.firstChild; const n = tn.length; const letters = [];
        for (let i = 0; i < n; i++) { r.setStart(tn, i); r.setEnd(tn, i+1); const b = r.getBoundingClientRect(); letters.push([tn.data[i], Math.round(b.left), Math.round(b.right), Math.round(b.top), Math.round(b.bottom)]); }
        const s = document.querySelector('.egg-stamp'); const sb = s.getBoundingClientRect(); const cs = getComputedStyle(s);
        const hb = h.getBoundingClientRect();
        return { vw: innerWidth, font: getComputedStyle(h).fontFamily.slice(0,30), fontLoaded: document.fonts.check('900 40px "Playfair Display"'), pos: cs.position, stamp: [sb.left, sb.top, sb.right, sb.bottom].map(Math.round), h1: [hb.left,hb.top,hb.right,hb.bottom].map(Math.round), last: letters.slice(-5) };
      });
      console.log(w, JSON.stringify(t));
      const s = t.stamp;
      await page.screenshot({ path: `vb/out/vbstamp_${w}.png`, clip: { x: Math.max(0, w - 420), y: 0, width: Math.min(420, w), height: 220 } });
    } finally { await browser.close(); }
  }
})();
