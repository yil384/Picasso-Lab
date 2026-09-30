const { open } = require('../../harness');
(async () => {
  const sizes = [[320,640],[360,740],[390,844],[640,900],[700,900],[761,900],[1024,800],[1440,900]];
  for (const [W,H] of sizes) {
    const { browser, page } = await open({ width:W, height:H });
    try {
      page.on('console', m => { if (m.type()==='error') console.log('CONSOLE', W, m.text().slice(0,200)); });
      await page.goto('https://yil384.github.io/Picasso-Lab/sponsors/sponsors.html', {waitUntil:'load'});
      await page.waitForTimeout(1200);
      const info = await page.evaluate(() => {
        const r = { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight };
        r.imgs = [...document.images].map(i => [i.alt.slice(0,8), Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height), i.complete && i.naturalWidth>0]);
        r.cols = getComputedStyle(document.querySelector('.wall')).gridTemplateColumns;
        return r; });
      console.log(W, JSON.stringify(info));
      await page.screenshot({path:`review/mob/spon_${W}.jpg`, type:'jpeg', quality:60, fullPage:true});
    } finally { await browser.close(); }
  }
})();
