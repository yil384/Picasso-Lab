const { open, gotoSites } = require('../../harness');
(async () => {
  const names = {chang:'chang_top_scorer',jixuan:'jixuan_painting',keyi:'keyi_esports_genius',ohm:'ohm',xiang:'xiang_concert',yichen:'yichen_card_master',yue:'yue_baseball',zaifeng:'zaifeng_academician',zhengding:'zhengding_sunshine',zhongkai:'zhongkai_academician',zhuo:'zhuo_gold_medal'};
  const swaps = {}; for (const [k,f] of Object.entries(names)) swaps[`people/static/${k}.webp`] = `/home/user/Picasso-Lab/people/${f}.html`;
  const { browser, page } = await open({ width:390, height:844, swaps });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
    await page.waitForTimeout(6000);
    const h = await page.evaluate(()=>document.documentElement.scrollHeight);
    for (let y=0;y<h;y+=500){ await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(250); }
    await page.waitForTimeout(4000);
    // find iframes positions
    const fr = await page.evaluate(()=>[...document.querySelectorAll('iframe')].map(f=>{const b=f.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top+scrollY),Math.round(b.width),Math.round(b.height)];}));
    console.log(JSON.stringify(fr));
    let i=0; for (const y of [0, 1400, 2800, 4200, 5600, 7000, 8400, 9800]) { await page.evaluate(y=>scrollTo(0,y), y); await page.waitForTimeout(1200); await page.screenshot({path:`review/mob/team_${i++}.jpg`, type:'jpeg', quality:50}); }
  } finally { await browser.close(); }
})();
