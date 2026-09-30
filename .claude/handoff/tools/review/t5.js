const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.setContent('<html><body>x</body></html>');
  console.log('no @font-face:', await p.evaluate(() => [document.fonts.check('900 40px "Playfair Display"'), document.fonts.check('600 12px "IBM Plex Mono"'), document.fonts.size]));
  await b.close();
})();
