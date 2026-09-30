// fake article open in the Real Blogs, then type picasso (the page says "type picasso again to return")
const { setup, state, settle } = require('./rv_common');
(async () => {
  const { browser, page, logs } = await setup();
  try {
    await page.evaluate(() => { window.__eggClock = () => 99; });
    await page.keyboard.type('picasso', { delay: 20 });
    await settle(page, 500);
    console.log('after egg:', await state(page));
    await page.click('#blog-list .blog-card[data-fake-index="1"]');
    await page.waitForTimeout(800);
    console.log('fake open:', await state(page));
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForTimeout(100);
    console.log('+100ms:', await state(page));
    await settle(page, 800);
    console.log('final:', await state(page));
    await page.screenshot({ path: 'shots/rvt1_final.jpg', type: 'jpeg', quality: 60 });
  } finally { console.log(logs.slice(0, 20)); await browser.close(); }
})();
