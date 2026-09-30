// verify: open an official article during the egg's load wait (slow three.js)
const { open } = require('../harness');
const { state, settle } = require('./rv_common');
(async () => {
  const delay = Number(process.argv[2] || 1200);
  const clickAfter = Number(process.argv[3] || 250);
  const { browser, ctx, page } = await open({ width: 1280, height: 800 });
  const logs = [];
  page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 200)); });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three/, async r => { await new Promise(s => setTimeout(s, delay)); return r.fallback(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(700); await page.mouse.move(1275, 5);
    const t0 = Date.now();
    await page.keyboard.type('picasso', { delay: 60 });
    console.log('typed in', Date.now() - t0, 'ms', JSON.stringify(await state(page)).slice(0, 200));
    await page.waitForTimeout(clickAfter);
    const cardHref = await page.$eval('#blog-list .blog-card:nth-child(2)', a => a.getAttribute('href') + ' onclick=' + a.getAttribute('onclick'));
    console.log('card', cardHref);
    await page.click('#blog-list .blog-card:nth-child(2)');
    const t1 = Date.now();
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(150);
      const s = await state(page);
      const layer = await page.evaluate(() => { const l = document.querySelector('.egg-fx'); return l ? getComputedStyle(l).zIndex : null; });
      console.log(`${Date.now() - t1}ms body="${s.body}" article=${s.article} fx=${s.fx} layerZ=${layer} nav=${decodeURIComponent(s.navHash).slice(0, 50)}`);
      await page.screenshot({ path: `shots/vfy14_${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 55 });
    }
    await settle(page, 500);
    console.log('final', JSON.stringify(await state(page)));
    await page.screenshot({ path: 'shots/vfy14_final.jpg', type: 'jpeg', quality: 55 });
    console.log('logs', logs.join('\n'));
  } finally { await browser.close(); }
})();
