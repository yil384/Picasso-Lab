// official article open, type picasso; then close the article; then Back
const { setup, state, settle } = require('./rv_common');
(async () => {
  const { browser, page, logs } = await setup();
  try {
    await page.evaluate(() => { window.__eggClock = () => 99; });
    await page.click('#blog-list .blog-card:nth-child(2)');
    await page.waitForTimeout(1200);
    console.log('article open:', await state(page));
    await page.keyboard.type('picasso', { delay: 20 });
    await settle(page, 500);
    console.log('typed:', await state(page));
    await page.screenshot({ path: 'shots/rvt2_typed.jpg', type: 'jpeg', quality: 60 });
    await page.keyboard.press('Escape');
    await settle(page, 500);
    console.log('closed:', await state(page));
    await page.goBack().catch(e => console.log('goBack', e.message.slice(0, 80)));
    await page.waitForTimeout(300);
    await settle(page, 800);
    console.log('after Back:', await state(page));
    await page.screenshot({ path: 'shots/rvt2_back.jpg', type: 'jpeg', quality: 60 });
  } finally { console.log(logs.slice(0, 20)); await browser.close(); }
})();
