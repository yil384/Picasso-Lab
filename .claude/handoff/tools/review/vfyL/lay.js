// usage: node lay.js <vw> <vh> <sw> <sh> <swap 0|1> <prefix>
const { open, gotoSites } = require('../kitrev/harness2');
(async () => {
  const [vw, vh, sw, sh, swap, pre] = process.argv.slice(2);
  const swaps = swap === '1' ? { 'people/static/yue.webp': '/home/user/Picasso-Lab/people/yue_baseball.html', 'people/static/zhuo.webp': '/home/user/Picasso-Lab/people/zhuo_gold_medal.html' } : {};
  const { browser, page } = await open({ width: +vw, height: +vh, screen: { width: +sw, height: +sh }, mobileDev: true, swaps });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
    const out = {};
    for (const who of ['yue', 'zhuo']) {
      let fr = null;
      for (let i = 0; i < 90 && !fr; i++) { await page.waitForTimeout(500); for (const f of page.frames()) { try { if (await f.$(`img[src*="people/static/${who}.webp"]`)) fr = f; } catch (_) {} } }
      if (!fr) { out[who] = 'notfound'; continue; }
      let top = fr; while (top.parentFrame() && top.parentFrame() !== page.mainFrame()) top = top.parentFrame();
      const host = await top.frameElement();
      await host.evaluate(n => n.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(2000);
      const hb = await host.boundingBox();
      const ib = await (await fr.$(`img[src*="people/static/${who}.webp"]`)).boundingBox();
      const inner = await fr.evaluate(() => ({ cls: (document.querySelector('#pfx')||{}).className, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight, screen: [screen.width, screen.height], iw: innerWidth }));
      const r = v => Math.round(v * 10) / 10;
      out[who] = { host: [r(hb.x), r(hb.y), r(hb.width), r(hb.height)], img: [r(ib.x), r(ib.y), r(ib.width), r(ib.height)], clipTop: r(hb.y - ib.y), clipBottom: r(ib.y + ib.height - hb.y - hb.height), clipLeft: r(hb.x - ib.x), clipRight: r(ib.x + ib.width - hb.x - hb.width), inner };
      const x = Math.max(0, hb.x - 40), y = Math.max(0, hb.y - 60);
      await page.screenshot({ path: `${pre}_${who}.jpg`, type: 'jpeg', quality: 70, clip: { x, y, width: Math.min(+vw - x, hb.width + 300), height: Math.min(+vh - y, hb.height + 120) } });
    }
    console.log(JSON.stringify({ vw, vh, swap, out }));
  } finally { await browser.close(); }
})();
