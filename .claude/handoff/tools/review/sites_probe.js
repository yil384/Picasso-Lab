// inside the live Sites page: compat mode, viewport numbers, snapshot size, one held film frame
const { open, gotoSites } = require('../harness');
const fs = require('fs');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const { browser, page } = await open({ width: W, height: H, swaps: { 'Blog – Picasso Lab': '/home/user/Picasso-Lab/blogs/blogs.html' } });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/blogs');
    let fr = null;
    for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame(); } catch (_) { return false; } }); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
    if (!fr) throw new Error('embed not found');
    await page.waitForTimeout(2500);
    const info = await fr.evaluate(() => ({
      compat: document.compatMode, doctype: !!document.doctype,
      deCW: document.documentElement.clientWidth, deCH: document.documentElement.clientHeight,
      bodyCH: document.body.clientHeight, iw: innerWidth, ih: innerHeight,
      vp: eggViewport(), scrollH: document.documentElement.scrollHeight,
      firstChild: document.documentElement.outerHTML.slice(0, 80)
    }));
    console.log(JSON.stringify(info));
    const url = await fr.evaluate(async () => (await eggSnapshot()).toDataURL('image/jpeg', 0.7));
    fs.writeFileSync(`review/${pre}_snap.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    await page.screenshot({ path: `review/${pre}_real.jpg`, type: 'jpeg', quality: 70 });
    // hold the film at t=0 (the first GL frame) and t=0.1
    await fr.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    const hero = await fr.$('.blog-hero'); const box = await hero.boundingBox();
    if (W < 800) { for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5); await page.waitForTimeout(120); } }
    else { await page.mouse.click(box.x + box.width - 20, box.y + box.height - 10); await page.keyboard.type('picasso', { delay: 60 }); }
    await fr.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `review/${pre}_t0.jpg`, type: 'jpeg', quality: 70 });
    console.log('canvas', await fr.evaluate(() => [...document.querySelectorAll('.egg-fx canvas')].map(c => [c.width, c.height, c.getBoundingClientRect().width, c.getBoundingClientRect().height])));
    await fr.evaluate(() => { window.__eggT = 99; });
    await page.waitForTimeout(1500);
  } finally { await browser.close(); }
})();
