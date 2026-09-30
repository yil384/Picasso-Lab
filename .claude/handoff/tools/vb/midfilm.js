// #2 follow-ups: an article opened during the shatter film, and during the no-WebGL wipe
const { open } = require('../harness');
const { state, settle } = require('../review/rv_common');
(async () => {
  for (const mode of ['film-in', 'film-out', 'wipe-in', 'wipe-out']) {
    const { browser, page } = await open({ width: 1280, height: 800 });
    const errs = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    try {
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.waitForTimeout(700); await page.mouse.move(1275, 5);
      await page.keyboard.press('x'); await page.waitForTimeout(2500);
      if (mode.startsWith('wipe')) await page.evaluate(() => { window.eggWebGL = () => false; });
      if (mode.endsWith('out')) { await page.evaluate(() => { window.__eggClock = () => 99; }); await page.keyboard.type('picasso', { delay: 10 }); await settle(page, 300); }
      await page.evaluate(() => { window.__eggClock = () => 0.5; });
      if (mode.startsWith('wipe')) await page.evaluate(() => { window.__eggClock = undefined; });
      await page.keyboard.type('picasso', { delay: 10 });
      if (mode.startsWith('film')) await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 20000 });
      else await page.waitForFunction(() => document.querySelector('.egg-wipe.cover'), null, { timeout: 20000 });
      await page.waitForTimeout(mode.startsWith('wipe') ? 480 : 200);
      const before = await state(page);
      // click through the film/wipe onto a card of the page underneath
      const sel = mode.endsWith('in') ? '#blog-list .blog-card[data-fake-index="1"]' : '#blog-list .blog-card:nth-child(2)';
      await page.$eval(sel, el => el.click());
      await page.waitForTimeout(120);
      const mid = await state(page);
      await page.screenshot({ path: `shots/vb_mid_${mode}.jpg`, type: 'jpeg', quality: 55 });
      await page.evaluate(() => { window.__eggClock = undefined; });
      await settle(page, 800);
      const fin = await state(page);
      console.log(mode, '| before', before.body, 'fx', before.fx, '| +120ms', mid.body, 'fx', mid.fx, 'art', mid.article && mid.article.slice(0, 10), '| final', fin.body, 'fx', fin.fx, 'art', fin.article && fin.article.slice(0, 10), 'nav', decodeURIComponent(fin.navHash).slice(0, 30), 'bv', fin.blogView.slice(0, 50), errs);
    } finally { await browser.close(); }
  }
})();
