const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--proxy-server=http://127.0.0.1:41825','--disable-quic','--disable-http2']});
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], ignoreHTTPSErrors:true });
    const page = await ctx.newPage();
    page.on('requestfailed', r=>console.log('FAIL', r.url().slice(0,120), r.failure()&&r.failure().errorText));
    page.on('response', r=>{ if(/atari|embed|github/.test(r.url())) console.log(r.status(), r.url().slice(0,140)); });
    page.on('console', m=>console.log('CONSOLE', m.text().slice(0,200)));
    for(let i=0;i<4;i++){try{await page.goto('https://yufeiding.ucsd.edu/', {waitUntil:'domcontentloaded', timeout:60000});break;}catch(e){console.log('retry');await page.waitForTimeout(3000);}}
    await page.waitForTimeout(4000);
    await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await page.waitForTimeout(12000);
    console.log(page.frames().map(f=>f.url().slice(0,100)).join('\n'));
  } finally { await browser.close(); }
})();
