const { open } = require('./harness');
(async () => {
  const W=+process.argv[2]||1280, H=+process.argv[3]||800, pre=process.argv[4]||'old_d';
  const { browser, page } = await open({ width:W, height:H });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', {waitUntil:'load'});
    await page.waitForTimeout(1500);
    await page.screenshot({path:`shots/${pre}_0.jpg`, type:'jpeg', quality:60});
    await page.mouse.move(100,100); await page.mouse.click(600,500);
    await page.keyboard.type('picasso', {delay:40});
    for (const t of [150,400,700,1000,1300,1700,2200]) { await page.waitForTimeout(t - (page._last||0)); page._last=t; await page.screenshot({path:`shots/${pre}_t${t}.jpg`, type:'jpeg', quality:60}); }
    await page.waitForTimeout(800);
    await page.screenshot({path:`shots/${pre}_egg.jpg`, type:'jpeg', quality:60, fullPage:true});
  } finally { await browser.close(); }
})();
