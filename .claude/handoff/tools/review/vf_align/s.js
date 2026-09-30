const { open, gotoSites } = require('../../harness');
(async () => {
  const widths = process.argv.slice(2).map(Number);
  for (const W of widths) {
    const { browser, page } = await open({ width: W, height: 844, swaps: { 'Blog – Picasso Lab': '/home/user/Picasso-Lab/blogs/blogs.html' } });
    try {
      await gotoSites(page, 'https://yufeiding.ucsd.edu/blogs');
      let fr = null;
      for (let i = 0; i < 80 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame(); } catch (_) { return false; } }); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
      if (!fr) throw new Error('embed not found');
      await page.waitForTimeout(1500);
      await fr.evaluate(async () => { await eggFonts(); renderTrueBlogs(); });
      await page.waitForTimeout(800);
      const r = await fr.evaluate(() => ({ vw: innerWidth, cards: [...document.querySelectorAll('#blog-list .blog-card')].map(c => {
        const cs = getComputedStyle(c); const ab = c.querySelector('.egg-art').getBoundingClientRect(); const cb = c.getBoundingClientRect();
        return `${cs.display} inner ${(cb.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2*parseFloat(cs.borderLeftWidth)).toFixed(0)} art ${ab.width.toFixed(0)}x${ab.height.toFixed(0)} rightGap ${(cb.right-ab.right).toFixed(0)}`; }) }));
      console.log(W, JSON.stringify(r));
      const card = await fr.$('#blog-list .blog-card');
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: __dirname + `/sites_${W}.jpg`, type: 'jpeg', quality: 70 });
    } catch (e) { console.log(W, 'ERR', e.message); } finally { await browser.close(); }
  }
})();
