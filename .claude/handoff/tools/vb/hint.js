// #4: the hint pill after the instant paths (article open; reduced motion + triple tap on a phone)
const { open } = require('../harness');
const { state, settle } = require('../review/rv_common');
(async () => {
  {
    const { browser, page } = await open({ width: 1280, height: 800 });
    try {
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.waitForTimeout(700); await page.mouse.move(1275, 5);
      await page.click('#blog-list .blog-card:nth-child(2)'); await page.waitForTimeout(1000);
      await page.keyboard.type('picasso', { delay: 60 });
      await page.waitForTimeout(150);
      const s = await state(page);
      console.log('article open + picasso:', s.body, '| hint shown:', await page.evaluate(() => document.getElementById('blog-type-hint').classList.contains('show')));
      await page.screenshot({ path: 'shots/vb_hint_article.jpg', type: 'jpeg', quality: 60 });
    } finally { await browser.close(); }
  }
  {
    const { browser, page } = await open({ width: 390, height: 844 });
    try {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.waitForTimeout(700);
      const box = await (await page.$('.blog-hero')).boundingBox();
      for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(120); }
      await page.waitForTimeout(150);
      console.log('RM phone triple tap:', await page.evaluate(() => document.body.className), '| hint shown:', await page.evaluate(() => document.getElementById('blog-type-hint').classList.contains('show')));
      for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width / 2, box.y + 40); await page.waitForTimeout(120); }
      await page.waitForTimeout(150);
      console.log('RM phone triple tap back:', await page.evaluate(() => document.body.className), '| hint shown:', await page.evaluate(() => document.getElementById('blog-type-hint').classList.contains('show')), 'nav', await page.evaluate(() => document.getElementById('picasso-nav-frame').contentWindow.location.hash));
    } finally { await browser.close(); }
  }
})();
