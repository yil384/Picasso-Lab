const { chromium, devices } = require('playwright');
(async () => {
  const url = process.argv[2], out = process.argv[3];
  const w = +(process.argv[4]||390);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' , args:['--ignore-certificate-errors']});
  try {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport:{width:w,height:844} });
    const page = await ctx.newPage();
    for (let i=0;i<3;i++){ try { await page.goto(url, {waitUntil:'domcontentloaded', timeout:60000}); break;} catch(e){ console.log('retry',e.message);} }
    await page.waitForTimeout(9000);
    const h = await page.evaluate(()=>document.documentElement.scrollHeight);
    console.log('height',h);
    await page.screenshot({ path: out, fullPage: true, type:'jpeg', quality:70 });
  } finally { await browser.close(); }
})();
