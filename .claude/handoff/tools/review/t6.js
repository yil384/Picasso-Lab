// slow Google Fonts CSS for the egg fonts: does egg-hold-fonts engage?
const { open } = require('../harness');
const { state } = require('./rv_common');
(async () => {
  const delay = +(process.argv[2] || 2500);
  const { browser, ctx, page } = await open({ width: 1280, height: 800 });
  await ctx.route(/fonts\.googleapis\.com\/css2\?family=IBM/, async r => { await new Promise(s => setTimeout(s, delay)); return r.fallback(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(700);
    await page.mouse.move(1275, 5);
    // warm three.js only (not the fonts): import it directly
    await page.evaluate(() => eggThree());
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; window.__cls = []; new MutationObserver(() => window.__cls.push(Math.round(performance.now()) + ' ' + document.body.className)).observe(document.body, { attributes: true, attributeFilter: ['class'] }); });
    await page.keyboard.type('picasso', { delay: 60 });
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    const h1font = () => page.evaluate(() => { const h = document.querySelector('.blog-hero h1'); const r = h.getBoundingClientRect(); return [getComputedStyle(h).fontFamily, Math.round(r.width), Math.round(r.height), document.fonts.check('900 40px "Playfair Display"')]; });
    console.log('film start: body', await page.evaluate(() => document.body.className), 'h1', await h1font());
    await page.waitForTimeout(delay + 1500);
    console.log('fonts arrived mid-film: h1', await h1font());
    await page.evaluate(() => { window.__eggT = 1.35; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/rvt6_landing.jpg', type: 'jpeg', quality: 60 });
    await page.evaluate(() => { window.__eggT = 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/rvt6_after.jpg', type: 'jpeg', quality: 60 });
    console.log('after: h1', await h1font());
    console.log(await page.evaluate(() => window.__cls));
  } finally { await browser.close(); }
})();
