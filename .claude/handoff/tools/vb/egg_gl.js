// egg film with options: GL1=1 forces WebGL1; FILE=path serves a modified blogs.html; frames at given times
const { open } = require('../harness');
const fs = require('fs');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const times = (process.argv[5] || '0.3,0.5,0.7').split(',').map(Number);
  const rtimes = (process.argv[6] || '0.2,0.5').split(',').map(Number);
  const { browser, ctx, page } = await open({ width: W, height: H });
  if (process.env.FILE) await page.route('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', r => r.fulfill({ path: process.env.FILE, headers: { 'Content-Type': 'text/html' } }));
  if (process.env.GL1) await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { if (type === 'webgl2') return null; return orig.call(this, type, ...a); };
  });
  if (process.env.SEED) await page.addInitScript(() => { let s = 12345; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning')) errs.push(m.type() + ': ' + m.text().slice(0, 400)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(W - 5, 5);
    await page.keyboard.type('pi', { delay: 30 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    const shoot = (name) => page.screenshot({ path: `vb/out/${pre}_${name}.png` });
    const film = async (label, arr) => {
      await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
      const gl = await page.evaluate(() => { const c = document.querySelector('.egg-fx canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); return g ? (g instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1') : 'none'; });
      console.log(label, 'context', gl);
      for (const tt of arr) {
        await page.evaluate(t => { window.__eggT = t; }, tt);
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        await shoot(`${label}_${String(Math.round(tt * 100)).padStart(3, '0')}`);
      }
      await page.evaluate(() => { window.__eggT = 99; });
      await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
      await page.waitForTimeout(300);
    };
    await page.keyboard.type('casso', { delay: 10 });
    await film('in', times);
    await page.evaluate(() => { window.__eggT = 0; });
    await page.keyboard.type('picasso', { delay: 10 });
    await film('out', rtimes);
    console.log('final:', await page.evaluate(() => [document.body.className, !!document.querySelector('.egg-fx')]));
  } finally {
    console.log('console:', errs.slice(0, 10));
    await browser.close();
  }
})();
