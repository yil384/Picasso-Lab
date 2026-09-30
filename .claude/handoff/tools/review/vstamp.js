const { setup } = require('./rv_common');
(async () => {
  const [W, H] = [+(process.argv[2] || 1280), +(process.argv[3] || 800)];
  const pre = process.argv[4] || 'vst';
  const { browser, page, logs } = await setup(W, H);
  try {
    await page.keyboard.press('x'); await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    // hold near the end of the shatter: the film shows uBack everywhere
    await page.evaluate(() => { window.__eggT = 1.40; });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => { const s = document.querySelector('.egg-stamp'); const r = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { r: [r.left, r.top, r.width, r.height], tf: cs.transform, disp: cs.display, body: document.body.className }; });
    console.log('stamp', JSON.stringify(info));
    const clip = { x: Math.max(0, info.r[0] - 30), y: Math.max(0, info.r[1] - 30), width: info.r[2] + 60, height: info.r[3] + 60 };
    await page.screenshot({ path: `shots/${pre}_land.png`, clip });
    await page.evaluate(() => { window.__eggT = 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `shots/${pre}_live.png`, clip });
    // now the snapshot itself, drawn on a fixed overlay
    await page.evaluate(async () => {
      const c = await eggSnapshot();
      c.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999';
      c.id = 'vsnap'; document.body.appendChild(c);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `shots/${pre}_snap.png`, clip });
    console.log(logs);
  } finally { await browser.close(); }
})();
