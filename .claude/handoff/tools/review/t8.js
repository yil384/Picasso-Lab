// reduced motion: instant switch; is the "try typing picasso" hint left on screen?
const { setup, state, settle } = require('./rv_common');
(async () => {
  const { browser, page, logs } = await setup();
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.keyboard.type('picasso', { delay: 60 });
    await page.waitForTimeout(150);
    const s = await state(page);
    console.log('RM after typing:', s.body, s.h1, 'hint shown:', await page.evaluate(() => document.getElementById('blog-type-hint').classList.contains('show')));
    await page.screenshot({ path: 'shots/rvt8_rm.jpg', type: 'jpeg', quality: 60 });
    await page.waitForTimeout(3000);
    console.log('RM +3s hint shown:', await page.evaluate(() => document.getElementById('blog-type-hint').classList.contains('show')));
    console.log(logs);
  } finally { await browser.close(); }
})();
