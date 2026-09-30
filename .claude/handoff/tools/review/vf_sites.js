const { open, gotoSites } = require('../harness');
(async () => {
  const sizes = process.argv.slice(2).map(s => s.split('x').map(Number));
  for (const [W, H] of sizes) {
    const { browser, page } = await open({ width: W, height: H, swaps: { 'Blog – Picasso Lab': '/home/user/Picasso-Lab/blogs/blogs.html' } });
    try {
      await gotoSites(page, 'https://yufeiding.ucsd.edu/blogs');
      let fr = null;
      for (let i = 0; i < 80 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame(); } catch (_) { return false; } }); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
      if (!fr) { console.log(W, 'embed not found'); continue; }
      await fr.evaluate(async () => { await eggFonts(); renderTrueBlogs(); await document.fonts.ready; });
      await page.waitForTimeout(800);
      const t = await fr.evaluate(() => {
        const h = document.querySelector('.blog-hero h1'); const tn = h.firstChild; const r = document.createRange();
        r.setStart(tn, tn.length - 5); r.setEnd(tn, tn.length); const b = r.getBoundingClientRect();
        const s = document.querySelector('.egg-stamp').getBoundingClientRect();
        return { embedW: innerWidth, pos: getComputedStyle(document.querySelector('.egg-stamp')).position, blogs: [b.left, b.right, b.top, b.bottom].map(Math.round), stamp: [s.left, s.right, s.top, s.bottom].map(Math.round), font: document.fonts.check('900 40px "Playfair Display"') };
      });
      console.log(W + 'x' + H, JSON.stringify(t));
      const el = await fr.$('.blog-hero'); const bb = await el.boundingBox();
      await page.screenshot({ path: `review/vfs_${W}.jpg`, type: 'jpeg', quality: 70, clip: { x: bb.x, y: bb.y, width: bb.width, height: Math.min(bb.height, 260) } });
    } catch (e) { console.log(W, 'ERR', e.message.slice(0, 200)); }
    finally { await browser.close(); }
  }
})();
