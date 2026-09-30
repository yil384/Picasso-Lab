// landing frame of the shatter vs the live page right after it (fonts warm)
const { setup } = require('../review/rv_common');
(async () => {
  const [W, H] = [+(process.argv[2] || 1280), +(process.argv[3] || 800)];
  const { browser, page, logs } = await setup(W, H);
  try {
    await page.keyboard.press('x'); await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; const o = window.eggRun; window.eggRun = (d, l, f) => { window.__END = d; return o(d, l, f); }; });
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    console.log('hold:', await page.evaluate(() => document.body.className));
    console.log("END", await page.evaluate(() => { window.__eggT = window.__END - 0.02; return window.__END; }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `shots/vb_rvt9_${W}_land.jpg`, type: 'jpeg', quality: 70 });
    await page.evaluate(() => { window.__eggT = 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `shots/vb_rvt9_${W}_live.jpg`, type: 'jpeg', quality: 70 });
    console.log(logs);
  } finally { await browser.close(); }
})();
