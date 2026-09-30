const { open } = require('./harness');
(async () => {
  const [url, out, W, H, full] = process.argv.slice(2);
  const { browser, page } = await open({ width:+W, height:+H });
  try { await page.goto(url, {waitUntil:'load'}); await page.waitForTimeout(1500);
    await page.screenshot({path: out, type:'jpeg', quality:65, fullPage: full==='1'}); } finally { await browser.close(); }
})();
