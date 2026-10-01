// the danmaku input placeholder on the live Events page (local events.html swapped in), phone and desktop
const { open, gotoSites } = require('./harness');
(async () => {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const { browser, page } = await open({ width: w, height: h, swaps: { 'Lab Events - Live Danmaku': '/home/user/Picasso-Lab/events/events.html' } });
    try {
      await gotoSites(page, 'https://yufeiding.ucsd.edu/events');
      let fr = null;
      for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); for (const f of page.frames()) { try { if (await f.$('#dm-input')) { fr = f; break; } } catch (_) {} } }
      if (!fr) throw new Error('no dm-input');
      await page.waitForTimeout(3000);
      const info = await fr.evaluate(() => { const i = document.getElementById('dm-input'); const r = i.getBoundingClientRect(); return { ph: i.placeholder, vw: innerWidth, w: Math.round(r.width) }; });
      console.log(w, JSON.stringify(info));
      const el = await fr.$('.danmaku-input-area');
      await el.screenshot({ path: `shots/ev_ph_${w}.png` });
    } finally { await browser.close(); }
  }
})();
