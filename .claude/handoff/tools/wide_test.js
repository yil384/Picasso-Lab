const { open } = require('./harness'); const fs=require('fs');
(async () => {
  const { browser, page } = await open({ width: 1300, height: 300 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/home/address.html','utf8');
    await page.evaluate((code)=>{ document.body.style.cssText='margin:0;background:#000;display:flex;gap:20px;padding:10px';
      for (const [w,h] of [[562,237],[352,148],[266,237]]) { const f=document.createElement('iframe'); f.style.cssText=`width:${w}px;height:${h}px;border:1px solid #333`; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close(); } }, code);
    await page.waitForTimeout(2500);
    await page.screenshot({path:'shots/addr_wide.jpg', type:'jpeg', quality:70});
  } finally { await browser.close(); }
})();
