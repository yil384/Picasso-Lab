const { open, gotoSites } = require('./harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const mobile = W < 800;
  const { browser, page } = await open({ width: W, height: H, swaps: { 'Blog – Picasso Lab': '/home/user/Picasso-Lab/blogs/blogs.html' } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|play\.google|gstatic|CORS|Failed to load resource|allow-scripts/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/blogs');
    let fr = null;
    for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame(); } catch (_) { return false; } }); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
    if (!fr) throw new Error('embed not found');
    await page.waitForTimeout(2500);
    const hero = await fr.$('.blog-hero');
    const box = await hero.boundingBox();
    if (mobile) {
      for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5); await page.waitForTimeout(120); }
    } else {
      await page.mouse.click(box.x + box.width - 20, box.y + box.height - 10);
      await page.keyboard.type('picasso', { delay: 60 });
    }
    // real-time: sample a few moments
    for (const ms of [250, 450, 700, 1000, 2600]) {
      await page.waitForTimeout(ms === 2600 ? 1600 : (ms === 250 ? 250 : 250));
      await page.screenshot({ path: `shots/${pre}_in_${ms}.jpg`, type: 'jpeg', quality: 60 });
    }
    console.log('after in:', await fr.evaluate(() => [document.body.className, document.querySelector('.blog-hero h1').textContent, !!document.querySelector('.egg-fx'), getComputedStyle(document.querySelector('.blog-hero h1')).fontFamily]));
    if (mobile) {
      for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width * 0.5, box.y + 40); await page.waitForTimeout(120); }
    } else {
      await page.keyboard.type('picasso', { delay: 60 });
    }
    for (const ms of [250, 500, 2600]) {
      await page.waitForTimeout(ms === 2600 ? 1600 : 250);
      await page.screenshot({ path: `shots/${pre}_out_${ms}.jpg`, type: 'jpeg', quality: 60 });
    }
    console.log('after out:', await fr.evaluate(() => [document.body.className, document.querySelector('.blog-hero h1').textContent, !!document.querySelector('.egg-fx')]));
  } finally {
    console.log('console:', errs.slice(0, 8));
    await browser.close();
  }
})();
