const { open } = require('./harness');
(async () => {
  const { browser, page } = await open({ width: 390, height: 844 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.evaluate(() => { desiredTrueBlogs = true; reconcileBlogMode(false); });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'shots/egg_list_m.jpg', type: 'jpeg', quality: 62, fullPage: true });
    await page.click('.blog-card[data-fake-index="1"]');
    await page.waitForTimeout(2500);
    const f = page.frames().find(fr => fr !== page.mainFrame());
    await page.screenshot({ path: 'shots/egg_article_m.jpg', type: 'jpeg', quality: 62 });
    const h = await f.evaluate(() => document.documentElement.scrollHeight);
    await f.evaluate(() => scrollTo(0, 700)); await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/egg_article_m2.jpg', type: 'jpeg', quality: 62 });
    console.log('article height', h);
  } finally { await browser.close(); }
})();
