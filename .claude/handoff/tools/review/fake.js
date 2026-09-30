const { open } = require('../harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const { browser, page } = await open({ width: W, height: H });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(W - 5, 5);
    await page.evaluate(() => { window.__eggClock = () => 99; });
    await page.keyboard.type('picasso', { delay: 20 });
    await page.waitForFunction(() => document.body.classList.contains('true-blogs') && !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    for (const i of [0, 1, 3]) {
      await page.evaluate(i => document.querySelectorAll('.blog-card')[i].click(), i);
      await page.waitForTimeout(1800);
      const fr = page.frames().find(f => f.url() === 'about:srcdoc');
      const m = fr ? await fr.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, fonts: document.fonts.check('900 40px "Playfair Display"') })) : null;
      console.log(i, JSON.stringify(m), await page.evaluate(() => document.body.className));
      await page.screenshot({ path: `review/${pre}_fake${i}.jpg`, type: 'jpeg', quality: 70 });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } finally { console.log('console:', errs); await browser.close(); }
})();
