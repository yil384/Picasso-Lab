// toggle the egg many times with the film clock at the end, watch for context warnings / leftovers
const { open } = require('../harness');
(async () => {
  const N = +(process.argv[2] || 20);
  const { browser, page } = await open({ width: 800, height: 700 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(795, 5);
    await page.keyboard.type('pi', { delay: 30 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      window.__eggClock = () => 99;
      window.__ctx = 0;
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t, ...a) { const r = orig.call(this, t, ...a); if (/webgl/.test(t) && r && !this.__counted) { this.__counted = 1; window.__ctx++; } return r; };
    });
    for (let i = 0; i < N; i++) {
      await page.keyboard.type('picasso', { delay: 5 });
      await page.waitForFunction(() => !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    }
    console.log('contexts created', await page.evaluate(() => window.__ctx), 'body', await page.evaluate(() => document.body.className));
  } finally {
    console.log('console:', errs.slice(0, 12), errs.length);
    await browser.close();
  }
})();
