// instrumented: return, re-trigger after ms, then Back after 400 ms; log nav frame messages
const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const ms = +(process.argv[2] || 300);
  const { browser, page, logs } = await setup();
  try {
    const rate = +(process.argv[3] || 1);
    if (rate > 1) { const cdp = await page.context().newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); }
    const backAfter = +(process.argv[4] || 400);
    await page.keyboard.press('x'); await page.waitForTimeout(2500);
    await page.keyboard.type('picasso', { delay: 0 });
    await settle(page, 300);
    await page.evaluate(() => {
      const t0 = performance.now(); window.__log = [];
      const L = (s) => window.__log.push(Math.round(performance.now() - t0) + ' ' + s);
      window.addEventListener('message', e => { if (e.data && typeof e.data.picassoNav === 'string') L('msg "' + e.data.picassoNav + '" body=' + document.body.className); }, true);
      for (const f of ['syncBlogFromHistory', 'requestBlogReturn', 'startBlogSecretTransition']) {
        const orig = window[f];
        window[f] = function (...a) { L(f + '(' + JSON.stringify(a).slice(0, 40) + ')'); return orig.apply(this, a); };
      }
    });
    await page.keyboard.type('picasso', { delay: 0 });
    await page.waitForTimeout(ms);
    await page.keyboard.type('picasso', { delay: 0 });
    await page.waitForTimeout(backAfter);
    await page.evaluate(() => window.__log.push('BACK'));
    await page.evaluate(() => history.back());
    await settle(page, 1500);
    console.log((await page.evaluate(() => window.__log)).join('\n'));
    const s = await state(page); const bv = JSON.parse(s.blogView); console.log((s.body.includes('true-blogs') === bv.trueBlogs && s.navHash.includes('t=1') === bv.trueBlogs ? 'CONSISTENT' : 'INCONSISTENT'), JSON.stringify(s.body), s.blogView, s.navHash);
  } finally { console.log(logs.slice(0, 10)); await browser.close(); }
})();
