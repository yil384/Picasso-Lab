// prefers-reduced-motion: on shows the still, off restores; keyboard only
const { setup } = require('./common');
(async () => {
  const snip = process.argv[2] || 'zhuo_gold_medal';
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip, reduced: true });
  try {
    await frame.evaluate(() => {
      window.__rafCount = 0;
      const r = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (f) => { window.__rafCount++; return r(f); };
    });
    await frame.focus('#pfx');
    await page.waitForTimeout(3000);
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(1000);
    console.log('on:', JSON.stringify(await state()), 'rafs', await frame.evaluate(() => window.__rafCount));
    await page.screenshot({ path: `kv9/red_${snip}_on.jpg`, type: 'jpeg', quality: 85, clip });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    console.log('off:', JSON.stringify(await state()));
    await page.keyboard.press(' ');
    await page.waitForTimeout(1500);
    console.log('on (space):', JSON.stringify(await state()));
    await page.keyboard.press(' ');
    await page.waitForTimeout(600);
    console.log('off (space):', JSON.stringify(await state()), 'rafs', await frame.evaluate(() => window.__rafCount));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
