// pure API check: what does document.fonts.check return for a family with no @font-face and not installed?
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.setContent('<html><body><p style="font-family:Georgia">x</p></body></html>');
  console.log(await p.evaluate(() => ({
    ua: navigator.userAgent,
    playfair: document.fonts.check('900 40px "Playfair Display"'),
    plex: document.fonts.check('600 12px "IBM Plex Mono"'),
    bogus: document.fonts.check('12px "Totally Bogus Font 123"'),
    size: document.fonts.size
  })));
  await b.close();
})();
