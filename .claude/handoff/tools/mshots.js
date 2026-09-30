const { open, gotoSites } = require('./harness');
(async () => {
  const [url, prefix, W='390', H='844', maxShots='14'] = process.argv.slice(2);
  const { browser, page } = await open({ width:+W, height:+H });
  try {
    await gotoSites(page, url);
    await page.waitForTimeout(6000);
    let h = await page.evaluate(()=>document.documentElement.scrollHeight);
    for (let y=0;y<h;y+=400){ await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(300); }
    await page.waitForTimeout(5000);
    h = await page.evaluate(()=>document.documentElement.scrollHeight);
    const info = await page.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>{const b=f.getBoundingClientRect(); return [Math.round(b.x),Math.round(b.y+scrollY),Math.round(b.width),Math.round(b.height)];}));
    console.log('H', h, 'iframes', JSON.stringify(info));
    const n = Math.min(+maxShots, Math.ceil(h/+H));
    for (let i=0;i<n;i++){ await page.evaluate(y=>scrollTo(0,y), i*(+H)); await page.waitForTimeout(1500); await page.screenshot({path:`${prefix}-${String(i).padStart(2,'0')}.jpg`, type:'jpeg', quality:55}); }
  } finally { await browser.close(); }
})();
