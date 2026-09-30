// phone: triple-tap in, triple-tap out, egg-back tap; states + console
const { setup, state, settle } = require('./rv_common');
(async () => {
  const { browser, page, logs } = await setup(390, 844);
  try {
    const tap3 = async () => { for (let i = 0; i < 3; i++) { await page.touchscreen.tap(200, 60); await page.waitForTimeout(120); } };
    await tap3();
    await page.waitForTimeout(200);
    console.log('after 3 taps:', (await state(page)).body);
    await settle(page, 400);
    console.log('in:', JSON.stringify(await state(page)));
    await page.screenshot({ path: 'shots/rvt13_in.jpg', type: 'jpeg', quality: 60 });
    await tap3();
    await settle(page, 400);
    console.log('out via taps:', JSON.stringify(await state(page)));
    await tap3(); await settle(page, 400);
    const bb = await page.evaluate(() => { const r = document.querySelector('.egg-back').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    await page.touchscreen.tap(bb[0], bb[1]);
    await settle(page, 400);
    console.log('out via egg-back:', JSON.stringify(await state(page)));
    // taps during the shatter: in, then 3 more taps immediately
    await tap3(); await page.waitForTimeout(250); await tap3();
    await settle(page, 400);
    console.log('in+out quick:', JSON.stringify(await state(page)));
    console.log(logs);
  } finally { await browser.close(); }
})();
