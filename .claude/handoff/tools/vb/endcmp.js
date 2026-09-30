// regression: hold each film just before its end, screenshot, then compare with the live page after the film
const { open } = require('../harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const { browser, page } = await open({ width: W, height: H });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  if (process.env.FILE) await page.route('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', r => r.fulfill({ path: process.env.FILE, headers: { 'Content-Type': 'text/html' } }));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    if (W >= 800) await page.mouse.move(W - 5, 5);
    await page.keyboard.type('pi', { delay: 30 });
    await page.waitForTimeout(3500);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; const o = window.eggRun; window.eggRun = (d, l, f) => { window.__END = d; return o(d, l, f); }; });
    const film = async (label) => {
      await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
      const info = await page.evaluate(() => ({ END: window.__END, canv: [...document.querySelectorAll('.egg-fx canvas')].map(c => [c.width, c.height, Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)]), body: document.body.className }));
      await page.evaluate(() => { window.__eggT = window.__END - 0.001; });
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: `vb/out/${pre}_${label}_end.png` });
      await page.evaluate(() => { window.__eggT = 99; });
      await page.waitForFunction(() => !document.querySelector('.egg-fx') && !document.body.classList.contains('blog-transitioning'), null, { timeout: 30000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `vb/out/${pre}_${label}_live.png` });
      console.log(label, JSON.stringify(info), 'after:', await page.evaluate(() => document.body.className));
      await page.evaluate(() => { window.__eggT = 0; });
    };
    await page.keyboard.type('casso', { delay: 10 });
    await film('in');
    await page.keyboard.type('picasso', { delay: 10 });
    await film('out');
  } finally { console.log('console:', errs.slice(0, 10)); await browser.close(); }
})();
