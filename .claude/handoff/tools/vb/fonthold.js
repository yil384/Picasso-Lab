// #11: fonts CSS slower than the budget -> the transition must hold the fallback fonts (egg-hold-fonts)
const { open } = require('../harness');
(async () => {
  const delay = +(process.argv[2] || 3000);
  const { browser, page } = await open({ width: 1280, height: 800 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  if (delay) await page.route(/fonts\.googleapis\.com\/css2\?family=IBM\+Plex/, async r => { await new Promise(res => setTimeout(res, delay)); r.continue(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(700); await page.mouse.move(1275, 5);
    await page.evaluate(() => {
      window.__cls = []; const t0 = performance.now();
      new MutationObserver(() => window.__cls.push(Math.round(performance.now() - t0) + 'ms ' + document.body.className + ' faces=' + [...document.fonts].filter(f => /Playfair|Plex/.test(f.family)).length + ' h1font=' + getComputedStyle(document.querySelector('.blog-hero h1')).fontFamily.slice(0, 20))).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    });
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForTimeout(5000);
    console.log('delay', delay); console.log((await page.evaluate(() => window.__cls)).join('\n'));
    console.log('errs', errs);
  } finally { await browser.close(); }
})();
