// visible sequence when typing picasso inside an open leak (real clock)
const { setup, state, settle } = require('./rv_common');
(async () => {
  const { browser, page, logs } = await setup();
  try {
    await page.keyboard.type('picasso', { delay: 30 });
    await settle(page, 500);
    await page.click('#blog-list .blog-card[data-fake-index="2"]');
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const t0 = performance.now(); window.__seq = [];
      const snap = (why) => window.__seq.push(Math.round(performance.now() - t0) + 'ms ' + why + ' | body=' + document.body.className + ' | h1=' + document.querySelector('.blog-hero h1').textContent + ' | article=' + document.getElementById('article-view').classList.contains('active') + ' | fx=' + !!document.querySelector('.egg-fx,.egg-wipe'));
      new MutationObserver(() => snap('mut')).observe(document.body, { attributes: true, childList: true, subtree: false, attributeFilter: ['class'] });
      window.addEventListener('message', e => { if (e.data && 'picassoNav' in e.data) snap('nav "' + e.data.picassoNav + '"'); });
    });
    await page.keyboard.type('picasso', { delay: 30 });
    await settle(page, 800);
    console.log((await page.evaluate(() => window.__seq)).join('\n'));
    console.log(await state(page));
    console.log(logs);
  } finally { await browser.close(); }
})();
