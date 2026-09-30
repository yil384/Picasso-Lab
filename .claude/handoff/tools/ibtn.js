const { open, gotoSites } = require('./harness');
(async () => {
  const [W,H] = process.argv.slice(2);
  const { browser, page } = await open({ width:+W, height:+H });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/events');
    await page.waitForTimeout(5000);
    const r = await page.evaluate(()=>{
      const out=[]; for (const el of document.querySelectorAll('body *')) { const cs=getComputedStyle(el); if (cs.position==='fixed') { const b=el.getBoundingClientRect(); if (b.width>0 && b.width<120 && b.bottom>innerHeight-120) out.push([el.tagName, el.className.slice(0,40), el.getAttribute('aria-label'), Math.round(b.left),Math.round(b.top),Math.round(b.right),Math.round(b.bottom)]); } } return [innerWidth, innerHeight, out]; });
    console.log(JSON.stringify(r));
  } finally { await browser.close(); }
})();
