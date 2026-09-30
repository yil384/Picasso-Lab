// node c291/tabs_shot.js W H prefix local "tab:y,y;tab:y"   (tab = overview|schedule|syllabus|faq)
const { open, gotoSites } = require('../harness');
(async () => {
  const [W, H, pre, local, plan] = [+process.argv[2], +process.argv[3], process.argv[4], process.argv[5], process.argv[6]];
  const { browser, page } = await open({ width: W, height: H, swaps: { 'CSE 291P: LLM System Optimization': local } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !/play\.google|gstatic|Failed to load resource|allow-scripts/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/teaching/cse291p-w26');
    let fr = null;
    for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame() && f.parentFrame().url().includes('atari'); } catch (_) { return false; } }); if (fr && !(await fr.$('.tabbar').catch(() => null))) fr = null; }
    if (!fr) throw new Error('embed not found');
    await page.waitForTimeout(2000);
    for (const part of plan.split(';')) {
      const [tab, ys] = part.split(':');
      await (await fr.$('#tab-' + tab)).click(); await page.waitForTimeout(400);
      const hgt = await fr.evaluate(() => document.body.scrollHeight);
      console.log(tab, 'height', hgt, 'overflowX', await fr.evaluate(() => document.body.scrollWidth > innerWidth));
      for (const y of ys.split(',')) {
        const yy = y === 'end' ? hgt : +y;
        await fr.evaluate(y => window.scrollTo(0, y), yy); await page.waitForTimeout(350);
        await page.screenshot({ path: `c291/${pre}_${tab}_${y}.jpg`, type: 'jpeg', quality: 70 });
      }
      await fr.evaluate(() => window.scrollTo(0, 0));
    }
  } finally { console.log('errors:', errs.slice(0, 6)); await browser.close(); }
})();
