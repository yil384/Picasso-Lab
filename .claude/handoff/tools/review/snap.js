// dump eggSnapshot() next to a real screenshot, official and egg states
const { open } = require('../harness');
const fs = require('fs');
(async () => {
  const [W, H, pre, dsf] = [+process.argv[2], +process.argv[3], process.argv[4], +(process.argv[5]||0)];
  const { browser, page } = await open({ width: W, height: H, ...(dsf ? { dsf } : {}) });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning')) errs.push(m.type()+': '+m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const dump = async (name) => {
      await page.screenshot({ path: `review/${pre}_${name}_real.png` });
      const url = await page.evaluate(async () => (await eggSnapshot()).toDataURL('image/png'));
      fs.writeFileSync(`review/${pre}_${name}_snap.png`, Buffer.from(url.split(',')[1], 'base64'));
    };
    await dump('off');
    await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); });
    await page.waitForTimeout(1500);
    await dump('egg');
    if (process.argv[6]) { await page.evaluate(y => window.scrollTo(0, y), +process.argv[6]); await page.waitForTimeout(300); await dump('eggscroll'); }
  } finally {
    console.log('console:', errs.slice(0, 10));
    await browser.close();
  }
})();
