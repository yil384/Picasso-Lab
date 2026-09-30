const { open } = require('../harness');
(async () => {
  const { browser, page } = await open({ width: 1280, height: 800 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.evaluate(async () => { await eggFonts(); renderTrueBlogs(); });
    await page.waitForTimeout(600);
    for (const w of [601, 768, 1000, 1001, 390]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.waitForTimeout(150);
      await page.screenshot({ path: `shots/mymast_${w}.jpg`, type: 'jpeg', quality: 70, clip: { x: 0, y: 0, width: w, height: 420 } });
    }
  } finally { await browser.close(); }
})();
