const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const ms = +(process.argv[2] || 300);
  const { browser, page, logs } = await setup();
  try {
    await page.keyboard.press('x'); await page.waitForTimeout(2500);
    await page.evaluate(() => {
      const t0 = performance.now(); window.__log = [];
      const L = (s) => window.__log.push(Math.round(performance.now() - t0) + ' ' + s);
      window.addEventListener('message', e => { if (e.data && typeof e.data.picassoNav === 'string') L('msg "' + e.data.picassoNav + '" body=' + document.body.className); }, true);
      document.addEventListener('keydown', e => { if (e.key === 'o') L('key o body=' + document.body.className); }, true);
      for (const f of ['reconcileBlogMode', 'syncBlogFromHistory', 'requestBlogReturn', 'startBlogSecretTransition', 'renderBlogMode', 'eggSnapshot']) {
        const orig = window[f];
        window[f] = function (...a) { L(f + '(' + JSON.stringify(a).slice(0, 60) + ') desired=' + desiredTrueBlogs + ' target=' + blogTransitionTarget + ' body=' + document.body.className); return orig.apply(this, a); };
      }
    });
    await page.keyboard.type('picasso', { delay: 0 });
    await settle(page, 300);
    await page.keyboard.type('picasso', { delay: 0 });
    await page.waitForTimeout(ms);
    await page.keyboard.type('picasso', { delay: 0 });
    await settle(page, 1500);
    console.log((await page.evaluate(() => window.__log)).join('\n'));
    console.log(await state(page));
  } finally { console.log(logs.slice(0, 10)); await browser.close(); }
})();
