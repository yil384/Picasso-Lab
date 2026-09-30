// Render each people snippet the way Sites does: document.write into an about:blank iframe of tile size.
const { open } = require('./harness');
const fs = require('fs');
(async () => {
  const names = process.argv.slice(2);
  const { browser, page } = await open({ width: 900, height: 420 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    for (const n of names) {
      const code = fs.readFileSync(`/home/user/Picasso-Lab/people/${n}.html`, 'utf8');
      await page.evaluate((code) => {
        document.body.innerHTML = '<div id="row" style="display:flex;gap:24px;padding:20px;background:#fff"></div>';
        document.body.style.margin = 0;
        for (let i = 0; i < 3; i++) {
          const f = document.createElement('iframe');
          f.style.cssText = 'width:266px;height:284px;border:1px dashed #ddd';
          document.getElementById('row').appendChild(f);
          f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
        }
      }, code);
      await page.waitForTimeout(1500);
      // click frames 2 and 3 at their centre (avatar)
      const frames = page.frames().slice(-3);
      for (const [i, fr] of frames.entries()) if (i > 0) {
        const el = await fr.$('body *'); 
        const box = await (await page.$$('#row iframe'))[i].boundingBox();
        await page.mouse.click(box.x + 108, box.y + 108);
        if (i === 1) await page.waitForTimeout(900);
      }
      await page.waitForTimeout(2200);
      await page.screenshot({ path: `shots/pp_${n}.jpg`, type: 'jpeg', quality: 72 });
      console.log('ok', n);
    }
  } finally { await browser.close(); }
})();
