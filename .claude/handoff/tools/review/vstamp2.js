const { setup } = require('./rv_common');
(async () => {
  const [W, H] = [+(process.argv[2] || 1280), +(process.argv[3] || 800)];
  const pre = process.argv[4] || 'vst';
  const { browser, page, logs } = await setup(W, H);
  try {
    await page.keyboard.press('x'); await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; const o = window.eggRun; window.eggRun = (d, l, f) => { window.__END = d; return o(d, l, f); }; });
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    const END = await page.evaluate(() => { window.__eggT = window.__END - 0.02; return window.__END; });
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => { const s = document.querySelector('.egg-stamp'); const r = s.getBoundingClientRect(); return { r: [r.left, r.top, r.width, r.height], fx: !!document.querySelector('.egg-fx canvas') }; });
    console.log('END', END, 'stamp', JSON.stringify(info));
    const clip = { x: Math.max(0, info.r[0] - 30), y: Math.max(0, info.r[1] - 30), width: info.r[2] + 60, height: info.r[3] + 60 };
    await page.screenshot({ path: `shots/${pre}_land.png`, clip });
    await page.evaluate(() => { window.__eggT = 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `shots/${pre}_live.png`, clip });
    // reverse: hold the crumple at t=0
    await page.evaluate(() => { window.__eggT = 0; });
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `shots/${pre}_crumple0.png`, clip });
    await page.evaluate(() => { window.__eggT = 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    console.log('final', await page.evaluate(() => document.body.className));
    console.log(logs);
  } finally { await browser.close(); }
})();
