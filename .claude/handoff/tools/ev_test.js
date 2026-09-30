const { open, gotoSites } = require('./harness');
(async () => {
  const { browser, page } = await open({ width:390, height:844, swaps: { 'Lab Events - Live Danmaku': '/home/user/Picasso-Lab/events/events.html' } });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/events');
    await page.waitForTimeout(16000);
    await page.screenshot({path:'shots/ev_m.jpg', type:'jpeg', quality:60});
  } finally { await browser.close(); }
})();
