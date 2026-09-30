const { chromium, devices } = require('playwright');
(async () => {
  const url = process.argv[2], prefix = process.argv[3];
  const w = +(process.argv[4]||390), hgt=+(process.argv[5]||844), mobile = w<800;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--proxy-server=http://127.0.0.1:41825','--disable-quic','--disable-http2']});
  try {
    const ctx = await browser.newContext(mobile? { ...devices['iPhone 13'], viewport:{width:w,height:hgt}, ignoreHTTPSErrors:true } : {viewport:{width:w,height:hgt}, ignoreHTTPSErrors:true});
    const page = await ctx.newPage();
    for (let i=0;i<3;i++){ try { await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000}); break;} catch(e){ console.log('retry',e.message);} }
    await page.waitForTimeout(8000);
    const info = await page.evaluate(()=>{
      const r=[]; document.querySelectorAll('iframe').forEach(f=>{const b=f.getBoundingClientRect(); r.push([Math.round(b.x),Math.round(b.y+scrollY),Math.round(b.width),Math.round(b.height),(f.src||'').slice(0,80)]);});
      return {h:document.documentElement.scrollHeight, iframes:r};
    });
    console.log(JSON.stringify(info,null,0));
    const n = Math.min(12, Math.ceil(info.h/hgt));
    for (let i=0;i<n;i++){ await page.evaluate(y=>scrollTo(0,y), i*hgt); await page.waitForTimeout(1200); await page.screenshot({path:`${prefix}-${String(i).padStart(2,'0')}.jpg`, type:'jpeg', quality:60}); }
  } finally { await browser.close(); }
})();
