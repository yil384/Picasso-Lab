const { open } = require('./harness'); const fs = require('fs');
(async () => {
  const { browser, page } = await open({ width: 900, height: 600 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/people/alon_iron_man.html', 'utf8');
    await page.evaluate((code) => { const f = document.createElement('iframe'); f.style.cssText='width:266px;height:284px'; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close(); }, code);
    const fr = page.frames().find(f => f.parentFrame());
    await page.waitForTimeout(500);
    await fr.click('#pfx'); await page.waitForTimeout(6000);
    console.log(await fr.evaluate(() => { const out = [typeof Q5]; try { const q = new Q5('graphics'); out.push('ctor ok'); q.createCanvas(266, 284, { alpha: true, pixelDensity: 1 }); out.push('cc ok', q.canvas.width); q.noLoop?.(); out.push('nl ok'); } catch (e) { out.push('ERR ' + e.message + ' | ' + (e.stack||'').slice(0, 400)); } return out; }));
  } finally { await browser.close(); }
})();
