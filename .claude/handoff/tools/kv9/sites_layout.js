// live Team page: where does the swapped yue snippet put the photo relative to the Sites tile + name?
// usage: node sites_layout.js <vw> <vh> <sw> <sh> <mobile 0|1> <prefix>
const { open, gotoSites } = require('./harness2');
(async () => {
  const [vw, vh, sw, sh, mob, pre] = process.argv.slice(2);
  const { browser, page } = await open({ width: +vw, height: +vh, screen: { width: +sw, height: +sh }, mobileDev: mob === '1', swaps: { 'people/static/yue.webp': '/home/user/Picasso-Lab/people/yue_baseball.html' } });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
    let fr = null;
    for (let i = 0; i < 80 && !fr; i++) { await page.waitForTimeout(500); for (const f of page.frames()) { try { if (await f.$('#pfx[data-fx="yue"]')) fr = f; } catch (_) {} } }
    if (!fr) throw new Error('swapped embed not found');
    let top = fr; while (top.parentFrame() && top.parentFrame() !== page.mainFrame()) top = top.parentFrame();
    const host = await top.frameElement();
    await host.evaluate(n => n.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    const hb = await host.boundingBox();
    const pb = await (await fr.$('#pfx')).boundingBox();
    const inner = await fr.evaluate(() => ({ cls: document.getElementById('pfx').className, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight, screen: [screen.width, screen.height], iw: innerWidth }));
    const name = await page.evaluate(() => { const els = [...document.querySelectorAll('p, span, h1, h2, h3, div')].filter(e => e.children.length === 0 && /^\s*Yue\b/.test(e.textContent)); return els.slice(0, 3).map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 40), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height), getComputedStyle(e).textAlign]; }); });
    console.log(JSON.stringify({ vw, host: hb, pfx: pb, inner, name }));
    const x = Math.max(0, hb.x - 40), y = Math.max(0, hb.y - 40);
    await page.screenshot({ path: `kv9/${pre}.jpg`, type: 'jpeg', quality: 70, clip: { x, y, width: Math.min(+vw - x, hb.width + 80), height: Math.min(+vh - y, hb.height + 160) } });
  } finally { await browser.close(); }
})();
