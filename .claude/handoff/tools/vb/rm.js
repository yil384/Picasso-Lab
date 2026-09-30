// reduced motion: instant switches both ways, the leak + picasso return (#1), Back/Forward
const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const { browser, page, logs } = await setup();
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const show = async (l) => { await page.waitForTimeout(120); const s = await state(page); console.log(l.padEnd(22), JSON.stringify({ body: s.body, h1: s.h1, fx: s.fx, art: s.article, nav: decodeURIComponent(s.navHash).slice(0, 20), hint: await page.evaluate(() => document.getElementById('blog-type-hint').classList.contains('show')) })); };
    await page.keyboard.type('picasso', { delay: 40 }); await show('picasso (in)');
    await page.click('#blog-list .blog-card[data-fake-index="1"]'); await page.waitForTimeout(500); await show('leak');
    await page.keyboard.type('picasso', { delay: 40 }); await show('picasso in leak');
    await page.evaluate(() => history.forward()); await page.waitForTimeout(300); await show('forward');
    await page.evaluate(() => history.forward()); await page.waitForTimeout(300); await show('forward2');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300); await show('escape');
    await page.keyboard.type('picasso', { delay: 40 }); await show('picasso (out)');
    await page.evaluate(() => history.forward()); await page.waitForTimeout(300); await show('forward');
    await page.evaluate(() => history.back()); await page.waitForTimeout(300); await show('back');
    console.log('logs', logs);
  } finally { await browser.close(); }
})();
