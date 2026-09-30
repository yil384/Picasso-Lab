const { open } = require('../../harness'); const fs=require('fs');
(async () => {
  const [W,H,tag] = process.argv.slice(2);
  const { browser, page } = await open({ width:+W, height:+H });
  try {
    page.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text().slice(0,160)); });
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/events/events.html','utf8');
    await page.evaluate((code)=>{ document.head.insertAdjacentHTML('beforeend','<meta name="viewport" content="width=device-width,initial-scale=1">'); document.body.style.cssText='margin:0';
      const f=document.createElement('iframe'); f.id='ef'; f.style.cssText=`position:fixed;inset:0;width:100%;height:100%;border:0`; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close(); }, code);
    await page.waitForTimeout(9000);
    const fr = page.frames().find(f => f !== page.mainFrame());
    // dismiss splash if any
    const info = await fr.evaluate(() => {
      const bar = document.querySelector('.danmaku-input-area'); const b = bar.getBoundingClientRect();
      const kids = [...bar.children].filter(c=>getComputedStyle(c).display!=='none').map(c => { const r=c.getBoundingClientRect(); return [c.id||c.className, Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; });
      return { inFrame: document.documentElement.classList.contains('in-frame'), iw: innerWidth, ih: innerHeight, bar:[Math.round(b.left),Math.round(b.right),Math.round(b.top),Math.round(b.bottom)], sw: bar.scrollWidth, cw: bar.clientWidth, kids };
    });
    console.log(W,H,JSON.stringify(info));
    await page.screenshot({path:`review/mob/ev_${tag}.jpg`, type:'jpeg', quality:60});
  } finally { await browser.close(); }
})();
