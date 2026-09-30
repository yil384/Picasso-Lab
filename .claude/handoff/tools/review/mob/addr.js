const { open } = require('../../harness'); const fs=require('fs');
(async () => {
  const [W,H,out,sizes] = process.argv.slice(2);
  const { browser, page } = await open({ width:+W, height:+H });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/home/address.html','utf8');
    const S = JSON.parse(sizes);
    await page.evaluate(([code,S])=>{ document.head.insertAdjacentHTML('beforeend','<meta name="viewport" content="width=device-width,initial-scale=1">'); document.body.style.cssText='margin:0;background:#444;display:flex;flex-wrap:wrap;gap:10px;padding:10px';
      for (const [w,h] of S) { const f=document.createElement('iframe'); f.style.cssText=`width:${w}px;height:${h}px;border:0;outline:1px solid #f0f`; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close(); } }, [code,S]);
    await page.waitForTimeout(3000);
    for (const fr of page.frames().slice(1)) {
      const r = await fr.evaluate(() => { const c=document.querySelector('.card'), t=document.querySelector('.title'), s=document.querySelector('.seal'), e=document.querySelector('.enter');
        const R = el => { const b=el.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]; };
        return { cls: document.documentElement.className, vw: innerWidth, vh: innerHeight, card: R(c), title: R(t), titleSW: t.scrollWidth, seal: getComputedStyle(s).display==='none'?null:R(s), sealOK: s.complete && s.naturalWidth, fs: getComputedStyle(t).fontSize, afs: getComputedStyle(document.querySelector('.addr')).fontSize, eSW: e.scrollWidth, eSH: e.scrollHeight }; });
      console.log(JSON.stringify(r));
    }
    await page.screenshot({path:out, type:'jpeg', quality:70, fullPage:true});
  } finally { await browser.close(); }
})();
