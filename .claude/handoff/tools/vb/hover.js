// #5/#9 side effects: a hovered (lifted) official card in the snapshot, and its transform/transition after the snapshot
const { open } = require('../harness');
const fs = require('fs');
(async () => {
  const { browser, page } = await open({ width: 1280, height: 800, dsf: 1 });
  try {
    if (process.env.FILE) await page.route('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', r => r.fulfill({ path: process.env.FILE, headers: { 'Content-Type': 'text/html' } }));
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const card = await page.$('#blog-list .blog-card:nth-child(1)');
    const b = await card.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `vb/out/${process.env.PRE || 'vbhov'}_real.png` });
    const r = await page.evaluate(async () => {
      const c = document.querySelector('#blog-list .blog-card:nth-child(1)');
      const svg = c.querySelector('.card-cta svg');
      const before = [getComputedStyle(c).transform, svg && getComputedStyle(svg).transform, getComputedStyle(c).transition.slice(0, 60)];
      const snap = await eggSnapshot();
      const after = [getComputedStyle(c).transform, svg && getComputedStyle(svg).transform, getComputedStyle(c).transition.slice(0, 60)];
      return { url: snap.toDataURL('image/png'), before, after, inline: c.getAttribute('style') };
    });
    fs.writeFileSync(`vb/out/${process.env.PRE || 'vbhov'}_snap.png`, Buffer.from(r.url.split(',')[1], 'base64'));
    delete r.url; console.log(JSON.stringify(r), JSON.stringify(b));
    // move away: the lift must animate back as usual
    await page.mouse.move(5, 790);
    await page.waitForTimeout(80);
    const mid = await page.evaluate(() => getComputedStyle(document.querySelector('#blog-list .blog-card:nth-child(1)')).transform);
    await page.waitForTimeout(500);
    const end = await page.evaluate(() => getComputedStyle(document.querySelector('#blog-list .blog-card:nth-child(1)')).transform);
    console.log('unhover +80ms', mid, '+580ms', end);
  } finally { await browser.close(); }
})();
