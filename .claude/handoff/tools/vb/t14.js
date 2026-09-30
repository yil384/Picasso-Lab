// open an official article while the egg is still loading three.js (slow CDN)
const { open } = require('../harness');
const { state, settle } = require('../review/rv_common');
(async () => {
  const { browser, ctx, page } = await open({ width: 1280, height: 800 });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three/, async r => { await new Promise(s => setTimeout(s, 1200)); return r.fallback(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(700); await page.mouse.move(1275, 5);
    await page.keyboard.type('picasso', { delay: 40 });
    await page.waitForTimeout(250);
    await page.click('#blog-list .blog-card:nth-child(2)');
    const seq = [];
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(200);
      const s = await state(page);
      seq.push(`${(i + 1) * 200}ms body=${s.body} article=${!!s.article} fx=${s.fx} nav=${decodeURIComponent(s.navHash).slice(0, 40)}`);
      if (i === 5) await page.screenshot({ path: 'shots/vb_rvt14_mid.jpg', type: 'jpeg', quality: 60 });
    }
    console.log(seq.join('\n'));
    await settle(page, 300);
    console.log('final', JSON.stringify(await state(page)));
  } finally { await browser.close(); }
})();
