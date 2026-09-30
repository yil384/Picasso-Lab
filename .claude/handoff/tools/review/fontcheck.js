// what fontsIn sees when the Google Fonts CSS is slower than the 600 ms budget
const { open } = require('../harness');
(async () => {
  const { browser, page } = await open({ width: 800, height: 700 });
  // delay the egg font stylesheet by 3 s
  await page.route(/fonts\.googleapis\.com\/css2\?family=IBM\+Plex/, async r => { await new Promise(res => setTimeout(res, 3000)); r.continue(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const p = eggFonts();
      await eggWithin(p, 600);
      const fontsIn = document.fonts.check('900 40px "Playfair Display"') && document.fonts.check('600 12px "IBM Plex Mono"');
      return { fontsIn, faces: [...document.fonts].map(f => f.family).filter(f => /Playfair|Plex/.test(f)).length };
    });
    console.log('after 600 ms:', JSON.stringify(r));
    await page.waitForTimeout(4000);
    console.log('later:', await page.evaluate(() => [document.fonts.check('900 40px "Playfair Display"'), [...document.fonts].filter(f => /Playfair|Plex/.test(f.family)).length]));
  } finally { await browser.close(); }
})();
