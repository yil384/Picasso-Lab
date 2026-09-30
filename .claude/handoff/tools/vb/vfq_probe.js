// verifier: live Sites embed, hold film at chosen times, capture last film frame and landing
const { open, gotoSites } = require('../harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const { browser, page } = await open({ width: W, height: H, swaps: { 'Blog – Picasso Lab': '/home/user/Picasso-Lab/blogs/blogs.html' } });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/blogs');
    let fr = null;
    for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame(); } catch (_) { return false; } }); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
    if (!fr) throw new Error('embed not found');
    await page.waitForTimeout(2500);
    console.log(JSON.stringify(await fr.evaluate(() => ({ compat: document.compatMode, dpr: devicePixelRatio, deCH: document.documentElement.clientHeight, ih: innerHeight, vp: eggViewport() }))));
    await fr.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    const hero = await fr.$('.blog-hero'); const box = await hero.boundingBox();
    if (W < 800) { for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5); await page.waitForTimeout(120); } }
    else { await page.mouse.click(box.x + box.width - 20, box.y + box.height - 10); await page.keyboard.type('picasso', { delay: 60 }); }
    await fr.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    console.log('canvas', JSON.stringify(await fr.evaluate(() => [...document.querySelectorAll('.egg-fx canvas')].map(c => [c.width, c.height, Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)]))));
    console.log('after swap', JSON.stringify(await fr.evaluate(() => ({ deCH: document.documentElement.clientHeight, ih: innerHeight, vp: eggViewport(), maxTex: (() => { const c = document.createElement('canvas').getContext('webgl'); return c && c.getParameter(c.MAX_TEXTURE_SIZE); })() }))));
    await page.screenshot({ path: `vb/out/${pre}_t0.jpg`, type: 'jpeg', quality: 70 });
    await fr.evaluate(() => { window.__eggT = 1.2; });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `vb/out/${pre}_t12.jpg`, type: 'jpeg', quality: 70 });
    // freeze just before END: patch eggRun duration unknown; use large t then the film ends; capture the canvas state just before removal via hold at 5 (clamped to END -> resolves)
    await fr.evaluate(() => { window.__eggT = 99; });
    await page.waitForTimeout(60);
    await page.screenshot({ path: `vb/out/${pre}_end.jpg`, type: 'jpeg', quality: 70 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `vb/out/${pre}_landed.jpg`, type: 'jpeg', quality: 70 });
    console.log('landed', JSON.stringify(await fr.evaluate(() => ({ body: document.body.className, fx: !!document.querySelector('.egg-fx'), deCH: document.documentElement.clientHeight, ih: innerHeight }))));
  } finally { await browser.close(); }
})();
