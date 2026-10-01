const { open, gotoSites } = require('./harness');
(async () => {
  const [W,H,out] = process.argv.slice(2);
  const { browser, page } = await open({ width:+W, height:+H, swaps: {
    'padding-top:5px;padding-left:30px': process.env.UCSD || '/home/user/Picasso-Lab/home/ucsd.html',
    'detect embed (footer iframe)': process.env.ADDR || '/home/user/Picasso-Lab/home/address.html' } });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/sponsors');
    await page.waitForTimeout(5000);
    const h = await page.evaluate(()=>document.documentElement.scrollHeight);
    for (let y=0;y<h;y+=400){ await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(200); }
    await page.waitForTimeout(5000);
    const fy = await page.evaluate(()=>{ const f=document.querySelector('footer'); return f.getBoundingClientRect().top+scrollY; });
    await page.evaluate(y=>scrollTo(0,y-60), fy); await page.waitForTimeout(2000);
    await page.screenshot({path:out, type:'jpeg', quality:60});
  } finally { await browser.close(); }
})();
