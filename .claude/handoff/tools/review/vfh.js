const { setup, state } = require('./rv_common');
const hint = (page) => page.evaluate(() => { const h = document.getElementById('blog-type-hint'); return { show: h.classList.contains('show'), op: getComputedStyle(h).opacity, text: h.textContent }; });
(async () => {
  // 1) reduced motion
  {
    const { browser, page, logs } = await setup();
    try {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.keyboard.type('picasso', { delay: 60 });
      await page.waitForTimeout(400);
      const s = await state(page);
      console.log('RM +400ms body:', s.body, '| h1:', s.h1, '| hint:', JSON.stringify(await hint(page)));
      await page.screenshot({ path: 'shots/vfh_rm.jpg', type: 'jpeg', quality: 60 });
      await page.waitForTimeout(1500);
      console.log('RM +1.9s hint:', JSON.stringify(await hint(page)));
      await page.waitForTimeout(1500);
      console.log('RM +3.4s hint:', JSON.stringify(await hint(page)));
      console.log('logs', logs);
    } finally { await browser.close(); }
  }
  // 2) animated path for comparison
  {
    const { browser, page, logs } = await setup();
    try {
      await page.keyboard.type('picasso', { delay: 60 });
      await page.waitForTimeout(400);
      console.log('ANIM +400ms hint:', JSON.stringify(await hint(page)));
    } finally { await browser.close(); }
  }
  // 3) article open
  {
    const { browser, page, logs } = await setup();
    try {
      const opened = await page.evaluate(() => {
        const a = document.querySelector('[onclick*="openArticle"], .blog-card a, .blog-card, article a');
        if (!a) return 'none';
        a.click(); return a.outerHTML.slice(0, 120);
      });
      console.log('clicked', opened);
      await page.waitForTimeout(1500);
      let s = await state(page);
      console.log('article:', s.article);
      await page.mouse.move(640, 400);
      await page.keyboard.type('picasso', { delay: 60 });
      await page.waitForTimeout(400);
      s = await state(page);
      console.log('ART +400ms body:', s.body, '| article:', s.article, '| hint:', JSON.stringify(await hint(page)));
      await page.screenshot({ path: 'shots/vfh_art.jpg', type: 'jpeg', quality: 60 });
      console.log('logs', logs);
    } finally { await browser.close(); }
  }
})();
