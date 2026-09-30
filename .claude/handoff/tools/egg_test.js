const { open } = require('./harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const times = (process.argv[5] || '0,0.1,0.2,0.23,0.3,0.45,0.6,0.8,1.0,1.2,1.4').split(',').map(Number);
  const rtimes = (process.argv[6] || '0,0.1,0.25,0.4,0.55,0.7,0.85,1.0').split(',').map(Number);
  const { browser, page } = await open({ width: W, height: H });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(W - 5, 5);
    await page.keyboard.type('pi', { delay: 30 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    const shoot = (name) => page.screenshot({ path: `shots/${pre}_${name}.jpg`, type: 'jpeg', quality: 62 });
    const film = async (label, arr) => {
      await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
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
    await shoot('egg');
    await page.screenshot({ path: `shots/${pre}_egg_full.jpg`, type: 'jpeg', quality: 62, fullPage: true });
    await page.evaluate(() => { window.__eggT = 0; });
    await page.keyboard.type('picasso', { delay: 10 });
    await film('out', rtimes);
    await shoot('back');
    console.log('final:', await page.evaluate(() => [document.body.className, !!document.querySelector('.egg-fx')]));
  } finally {
    console.log('console:', errs.slice(0, 10));
    await browser.close();
  }
})();
