// regression: open a leak from the Real Blogs (after the real film), read it, close with the viewer's back button and Escape
const { open } = require('../harness');
const { state, settle } = require('../review/rv_common');
(async () => {
  for (const [W, H] of [[1280, 800], [390, 844]]) {
    const { browser, page } = await open({ width: W, height: H });
    const errs = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
    page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
    try {
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.waitForTimeout(800);
      if (W < 800) {
        const box = await (await page.$('.blog-hero')).boundingBox();
        for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(120); }
      } else { await page.mouse.move(W - 5, 5); await page.keyboard.type('picasso', { delay: 40 }); }
      await settle(page, 500);
      for (const [idx, how] of [[1, 'button'], [3, 'escape']]) {
        const card = await page.$(`#blog-list .blog-card[data-fake-index="${idx}"]`);
        await card.scrollIntoViewIfNeeded();
        if (W < 800) { const b = await card.boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + 40); } else await card.click();
        await page.waitForTimeout(1800);
        const fr = page.frames().find(f => f.name() === '' && f !== page.mainFrame() && !/nav-frame/.test(f.url()));
        const h1 = fr ? await fr.evaluate(() => document.querySelector('h1')?.textContent) : null;
        const s1 = await state(page);
        await page.screenshot({ path: `shots/vb_fake_${W}_${idx}.jpg`, type: 'jpeg', quality: 60 });
        if (how === 'button') { if (W < 800) { const b = await (await page.$('.article-back')).boundingBox(); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); } else await page.click('.article-back'); }
        else await page.keyboard.press('Escape');
        await settle(page, 400);
        const s2 = await state(page);
        console.log(W, 'leak', idx, '| open:', s1.article, s1.body, decodeURIComponent(s1.navHash).slice(0, 18), 'h1:', (h1 || '').slice(0, 40), '| closed by', how + ':', s2.article, s2.body, decodeURIComponent(s2.navHash).slice(0, 18), 'focus', s2.focus);
      }
      console.log(W, 'console', errs);
    } finally { await browser.close(); }
  }
})();
