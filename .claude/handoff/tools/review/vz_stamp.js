const { open } = require('../harness');
(async () => {
  const [W, H] = [+process.argv[2], +process.argv[3]];
  const pre = `review/vz${W}`;
  const { browser, page } = await open({ width: W, height: H });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(W - 5, 5);
    await page.keyboard.type('pi', { delay: 30 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    await page.keyboard.type('casso', { delay: 10 });
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    // stamp rect in the (now true-blogs) DOM under the film
    const sr = await page.evaluate(() => { const b = document.querySelector('.egg-stamp').getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height, tf: getComputedStyle(document.querySelector('.egg-stamp')).transform }; });
    console.log('stamp bbox', JSON.stringify(sr));
    const clip = { x: Math.max(0, sr.x - 40), y: Math.max(0, sr.y - 30), width: Math.min(W - Math.max(0, sr.x - 40), sr.w + 80), height: sr.h + 60 };
    // a late film frame (most shards landed)
    for (const t of [1.2, 1.3, 1.38]) {
      await page.evaluate(t => { window.__eggT = t; }, t);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: `${pre}_film_${Math.round(t * 100)}.png`, clip });
    }
    // end the film and try to catch the 200ms cross-fade
    await page.evaluate(() => { window.__eggT = 99; });
    const fades = [];
    for (let i = 0; i < 6; i++) {
      const info = await page.evaluate(() => { const c = document.querySelector('.egg-fx canvas'); return c ? getComputedStyle(c).opacity : 'gone'; });
      await page.screenshot({ path: `${pre}_fade_${i}.png`, clip });
      fades.push(info);
    }
    console.log('fade opacities before shots', fades);
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${pre}_real.png`, clip });
    // the snapshot of the landed page, laid over the page
    await page.evaluate(async () => {
      const c = await eggSnapshot();
      c.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999';
      c.id = 'vzsnap';
      document.body.appendChild(c);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${pre}_snap.png`, clip });
    console.log('final:', await page.evaluate(() => document.body.className));
  } finally {
    console.log('console:', errs.slice(0, 10));
    await browser.close();
  }
})();
