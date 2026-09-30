const { open } = require('./harness'); const fs=require('fs');
(async () => {
  const { browser, page } = await open({ width: 390, height: 844 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/home/address.html','utf8');
    const r = await page.evaluate((code)=>{ const f=document.createElement('iframe'); f.style.cssText='width:257px;height:228px'; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
      const d=f.contentDocument; return [d.documentElement.className, f.contentWindow.screen.width, getComputedStyle(d.querySelector('.enter')).alignItems, getComputedStyle(d.querySelector('.enter')).textAlign]; }, code);
    console.log(r);
  } finally { await browser.close(); }
})();
