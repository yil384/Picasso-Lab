// node c291/sites_shot.js W H prefix [local file to swap in] [scrollY list]
const { open, gotoSites } = require('../harness');
(async () => {
  const [W, H, pre, local, ys] = [+process.argv[2], +process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
  const swaps = local ? { 'CSE 291P: LLM System Optimization': local } : {};
  const { browser, page } = await open({ width: W, height: H, swaps });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error') && !/GL Driver|play\.google|gstatic|Failed to load resource|allow-scripts/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/teaching/cse291p-w26');
    let fr = null;
    for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame() && f.parentFrame().url().includes('atari'); } catch (_) { return false; } }); if (fr && !(await fr.$('main').catch(() => null))) fr = null; }
    if (!fr) throw new Error('embed not found');
    await page.waitForTimeout(2500);
    const el = await fr.frameElement(); const box = await el.boundingBox();
    const outer = await (await fr.parentFrame().frameElement()).boundingBox();
    console.log('embed box', JSON.stringify(box), 'outer', JSON.stringify(outer), await fr.evaluate(() => [innerWidth, innerHeight, document.compatMode, document.documentElement.scrollHeight]));
    for (const y of (ys || '0').split(',').map(Number)) {
      await page.evaluate(y => window.scrollTo(0, y), y); await page.waitForTimeout(600);
      await page.screenshot({ path: `c291/${pre}_${y}.jpg`, type: 'jpeg', quality: 70 });
    }
  } finally { console.log('errors:', errs.slice(0, 6)); await browser.close(); }
})();
