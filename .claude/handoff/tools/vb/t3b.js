// #3 follow-up: return, re-trigger, then a real Back while our pop's landing may still be pending
const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const xs = (process.argv[2] || '0,30,120,300,600,900,1200').split(',').map(Number);
  const ys = (process.argv[3] || '100,400,900').split(',').map(Number);
  let bad = 0;
  for (const x of xs) for (const y of ys) {
    const { browser, page, logs } = await setup();
    try {
      await page.keyboard.press('x'); await page.waitForTimeout(2500);
      await page.keyboard.type('picasso', { delay: 0 }); await settle(page, 300);
      await page.keyboard.type('picasso', { delay: 0 });
      await page.waitForTimeout(x);
      await page.keyboard.type('picasso', { delay: 0 });
      await page.waitForTimeout(y);
      await page.evaluate(() => history.back());
      await settle(page, 1500);
      const s = await state(page);
      const bv = JSON.parse(s.blogView);
      const ok = s.body.includes('true-blogs') === bv.trueBlogs && s.navHash.includes('t=1') === bv.trueBlogs && s.fx === 0 && !/transitioning|hold/.test(s.body);
      if (!ok) bad++;
      console.log((ok ? 'OK  ' : 'BAD ') + `return, picasso +${x}ms, Back +${y}ms`, JSON.stringify({ body: s.body, bv: s.blogView, nav: s.navHash, hl: s.histLen }), logs.length ? logs.slice(0, 3) : '');
    } catch (e) { console.log('ERR', x, y, e.message.slice(0, 100)); }
    finally { await browser.close(); }
  }
  console.log('bad', bad);
})();
