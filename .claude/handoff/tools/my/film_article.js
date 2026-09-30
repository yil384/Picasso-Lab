// open an article while a film is held on screen: the film must stop and uncover the viewer
const { open } = require('../harness');
const { state, settle } = require('../review/rv_common');
(async () => {
  const dir = process.argv[2] || 'in';
  const { browser, page } = await open({ width: 1280, height: 800 });
  const logs = [];
  page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 200)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(700); await page.mouse.move(1275, 5);
    await page.keyboard.press('x'); await page.waitForTimeout(2500);
    if (dir === 'out') {
      await page.evaluate(() => { window.__eggClock = () => 99; });
      await page.keyboard.type('picasso', { delay: 10 });
      await settle(page, 300);
    }
    await page.evaluate(() => { window.__eggClock = () => 0.5; });
    await page.keyboard.type('picasso', { delay: 10 });
    await page.waitForFunction(() => document.querySelector('.egg-fx canvas') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 20000 });
    await page.waitForTimeout(300);
    console.log('film held:', JSON.stringify(await state(page)));
    // click the first card of the page underneath (through the pointer-events:none layer)
    const box = await page.evaluate(() => { const r = document.querySelector('#blog-list .blog-card').getBoundingClientRect(); return { x: r.left + 40, y: Math.min(r.top + 40, innerHeight - 20) }; });
    await page.evaluate(() => document.querySelector('#blog-list .blog-card').scrollIntoView({ block: 'center' }));
    const b2 = await page.evaluate(() => { const r = document.querySelector('#blog-list .blog-card').getBoundingClientRect(); return { x: r.left + 40, y: r.top + 40 }; });
    await page.mouse.click(b2.x, b2.y);
    await page.waitForTimeout(400);
    const s = await state(page);
    console.log('after click:', JSON.stringify(s));
    await page.screenshot({ path: `shots/my_filmart_${dir}.jpg`, type: 'jpeg', quality: 55 });
    console.log(s.fx === 0 && s.article && !s.body.includes('transitioning') ? 'PASS' : 'FAIL');
    await page.evaluate(() => { window.__eggClock = undefined; });
    await page.click('.article-back');
    await page.waitForTimeout(800);
    console.log('closed:', JSON.stringify(await state(page)));
  } finally { console.log('logs', logs); await browser.close(); }
})();
