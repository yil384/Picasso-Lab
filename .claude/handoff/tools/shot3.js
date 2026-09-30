const { chromium, devices } = require('playwright');
(async () => {
  const [url, prefix, W, H, scrollTo_] = process.argv.slice(2);
  const w=+W, hgt=+H, mobile=w<800;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--proxy-server=http://127.0.0.1:41825','--disable-quic','--disable-http2']});
  try {
    const ctx = await browser.newContext(mobile? { ...devices['iPhone 13'], viewport:{width:w,height:hgt}, ignoreHTTPSErrors:true } : {viewport:{width:w,height:hgt}, ignoreHTTPSErrors:true});
    const page = await ctx.newPage();
    for (let i=0;i<3;i++){ try { await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000}); break;} catch(e){ console.log('retry',e.message);} }
    await page.waitForTimeout(5000);
    const H2 = await page.evaluate(()=>document.documentElement.scrollHeight);
    // slow scroll to trigger lazy loads
    for (let y=0;y<H2;y+=300){ await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(250);}
    await page.waitForTimeout(6000);
    const y = scrollTo_==='bottom'? H2 : +scrollTo_;
    await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(2500);
    await page.screenshot({path:`${prefix}.jpg`, type:'jpeg', quality:60});
    console.log('H',H2);
  } finally { await browser.close(); }
})();
