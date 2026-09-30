// #5/#9: eggSnapshot of the Real Blogs vs a real screenshot, same size (DSF 1), plus stamp-region diff
const { open } = require('../harness');
const fs = require('fs');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const { browser, page } = await open({ width: W, height: H, dsf: 1 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning')) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    if (process.env.FILE) await page.route('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', r => r.fulfill({ path: process.env.FILE, headers: { 'Content-Type': 'text/html' } }));
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); await document.fonts.ready; });
    await page.waitForTimeout(1500);
    await page.mouse.move(W - 3, H - 3);
    await page.screenshot({ path: `vb/out/${pre}_real.png` });
    const r = await page.evaluate(async () => {
      const before = getComputedStyle(document.querySelector('.egg-stamp')).transform;
      const c = await eggSnapshot();
      const after = getComputedStyle(document.querySelector('.egg-stamp')).transform;
      const sb = document.querySelector('.egg-stamp').getBoundingClientRect();
      return { url: c.toDataURL('image/png'), cw: c.width, ch: c.height, before, after, inline: document.querySelector('.egg-stamp').getAttribute('style'), stamp: [sb.left, sb.top, sb.right, sb.bottom].map(Math.round) };
    });
    fs.writeFileSync(`vb/out/${pre}_snap.png`, Buffer.from(r.url.split(',')[1], 'base64'));
    delete r.url; console.log(JSON.stringify(r));
  } finally { console.log('console:', errs.slice(0, 10)); await browser.close(); }
})();
