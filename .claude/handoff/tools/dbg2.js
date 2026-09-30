const { open, gotoSites } = require('./harness');
(async () => {
  const { browser, page } = await open({ width:390, height:844, swaps: {
    'padding-top:5px;padding-left:30px': '/home/user/Picasso-Lab/home/ucsd.html',
    'detect embed (footer iframe)': '/home/user/Picasso-Lab/home/address.html' } });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/sponsors');
    await page.waitForTimeout(4000);
    await page.evaluate(()=>scrollTo(0,99999)); await page.waitForTimeout(6000);
    for (const f of page.frames()) {
      try { const r = await f.evaluate(()=>[document.documentElement.className, screen.width, !!document.querySelector('.enter'), document.querySelector('.enter') && getComputedStyle(document.querySelector('.enter')).textAlign, innerWidth, innerHeight]); if (r[2]) console.log(f.url().slice(0,60), r); } catch(e) {}
    }
  } finally { await browser.close(); }
})();
