// egg-hold-fonts must be set when the egg fonts miss the budget, and not set when they are in
const { open } = require('../harness');
(async () => {
  const delay = +(process.argv[2] || 0);
  const { browser, page } = await open({ width: 1280, height: 800 });
  const logs = [];
  page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 200)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  if (delay) await page.route(/fonts\.googleapis\.com\/css2\?family=IBM\+Plex/, async r => { await new Promise(res => setTimeout(res, delay)); r.continue(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(600); await page.mouse.move(1275, 5);
    await page.evaluate(() => { window.__eggClock = () => 0.5; window.__cls = []; new MutationObserver(() => window.__cls.push(document.body.className)).observe(document.body, { attributes: true, attributeFilter: ['class'] }); });
    await page.keyboard.type('picasso', { delay: 30 });
    await page.waitForFunction(() => document.querySelector('.egg-fx canvas') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 20000 });
    const during = await page.evaluate(() => ({ body: document.body.className, faces: [...document.fonts].filter(f => /Playfair|Plex/.test(f.family)).length, h1Font: getComputedStyle(document.querySelector('.blog-hero h1')).fontFamily }));
    await page.evaluate(() => { window.__eggClock = () => 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 20000 });
    await page.waitForTimeout(delay ? delay + 500 : 300);
    const after = await page.evaluate(() => ({ body: document.body.className, faces: [...document.fonts].filter(f => /Playfair|Plex/.test(f.family)).length, h1Font: getComputedStyle(document.querySelector('.blog-hero h1')).fontFamily, loaded: document.fonts.check('900 40px "Playfair Display"') }));
    console.log('delay', delay, 'during film:', JSON.stringify(during));
    console.log('after:', JSON.stringify(after));
    console.log('classes seen:', JSON.stringify([...new Set(await page.evaluate(() => window.__cls))]));
  } finally { console.log('logs', logs); await browser.close(); }
})();
