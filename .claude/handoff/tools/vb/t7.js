// many toggles: WebGL contexts / listeners / leftover nodes
const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const N = +(process.argv[2] || 20);
  const { browser, page, logs } = await setup();
  try {
    await page.evaluate(() => { window.__eggClock = () => 99; });
    const cdp = await page.context().newCDPSession(page);
    for (let i = 0; i < N; i++) {
      await page.keyboard.type('picasso', { delay: 0 });
      await settle(page, 50);
    }
    const s = await state(page);
    console.log('after', N, 'toggles:', s.body, 'fx', s.fx, 'histLen', s.histLen);
    await cdp.send('HeapProfiler.collectGarbage');
    const counts = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length, links: document.querySelectorAll('link[href*="IBM"]').length }));
    console.log(counts);
    console.log('logs:', logs.filter(l => !/Context Lost/.test(l)).slice(0, 12), 'contextLost logs:', logs.filter(l => /Context Lost/.test(l)).length);
  } finally { await browser.close(); }
})();
