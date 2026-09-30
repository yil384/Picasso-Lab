const { open } = require('./harness'); const fs = require('fs');
(async () => {
  const { browser, page } = await open({ width: 900, height: 600 });
  const errs = []; page.on('console', m => errs.push(m.type() + ' ' + m.text().slice(0, 300)));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/people/alon_iron_man.html', 'utf8');
    await page.evaluate((code) => { const f = document.createElement('iframe'); f.style.cssText='width:266px;height:284px'; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close(); }, code);
    const fr = page.frames().find(f => f.parentFrame());
    await page.waitForTimeout(500);
    await fr.click('#pfx'); await page.waitForTimeout(6000);
    console.log(await fr.evaluate(() => [typeof window.Q5, !!document.querySelector('.pfx-2d'), document.querySelector('.pfx-2d') && document.querySelector('.pfx-2d').width, [...document.querySelectorAll('canvas')].map(c => c.className + ':' + c.width + 'x' + c.height + ':' + c.style.opacity + ':' + c.parentNode.className)]));
  } finally { console.log(errs.filter(e => !/GL Driver|GPU stall/.test(e)).slice(0, 10)); await browser.close(); }
})();
