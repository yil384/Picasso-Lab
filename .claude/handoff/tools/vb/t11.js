// latency of the pop echo while the crumple film runs (held) vs without film
const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const mode = process.argv[2] || 'hold';
  const { browser, page, logs } = await setup();
  try {
    await page.keyboard.press('x'); await page.waitForTimeout(2500);
    await page.keyboard.type('picasso', { delay: 0 });
    await settle(page, 500);
    if (mode === 'rm') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate((mode) => {
      if (mode === 'hold') { window.__eggClock = () => 0.3; }
      const t0 = performance.now(); window.__seq = [];
      let frames = 0; const f = () => { frames++; requestAnimationFrame(f); }; requestAnimationFrame(f);
      window.addEventListener('message', e => { if (e.data && 'picassoNav' in e.data) window.__seq.push(Math.round(performance.now() - t0) + 'ms echo "' + e.data.picassoNav + '" frames=' + frames); });
      setTimeout(() => window.__seq.push('5000ms timer, frames=' + frames), 5000);
      requestBlogReturn();
    }, mode);
    await page.waitForTimeout(5500);
    console.log(mode, (await page.evaluate(() => window.__seq)).join(' ; '));
    await page.evaluate(() => { window.__eggClock = () => 99; });
    await settle(page, 300);
  } finally { await browser.close(); }
})();
