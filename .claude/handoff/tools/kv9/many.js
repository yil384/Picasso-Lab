// toggle many times (incl. re-entry during the exit), then look for leftovers
const { setup } = require('./common');
(async () => {
  const snip = process.argv[2] || 'zhuo_gold_medal';
  const N = +(process.argv[3] || 12);
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip });
  try {
    await frame.evaluate(() => {
      window.__ctxs = [];
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        const c = g.call(this, type, ...a);
        if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
        return c;
      };
      window.__docL = 0;
      const ae = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function (...a) { window.__docL++; return ae.apply(this, a); };
    });
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    for (let i = 0; i < N; i++) {
      await page.mouse.click(cx, cy);                  // on
      await page.waitForTimeout(i % 3 === 2 ? 450 : 1100);
      await page.mouse.click(cx, cy);                  // off
      if (i % 3 === 1) { await page.waitForTimeout(400); await page.mouse.click(cx, cy); await page.waitForTimeout(700); await page.mouse.click(cx, cy); } // re-enter during the exit, then off
      await page.waitForTimeout(800);
    }
    await page.waitForTimeout(1000);
    const info = await frame.evaluate(async (snip) => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const name = document.getElementById('pfx').dataset.fx;
      const urls = [document.querySelector('.pfx-photo').src, `${m.STATIC}fx/${name}-plate.webp`, `${m.STATIC}fx/${name}-cut.webp`];
      const lst = [];
      for (const u of urls) { const t = await m.loadTexture(u); lst.push((t._listeners && t._listeners.dispose || []).length); }
      return { disposeListenersOnCachedTextures: lst, live: window.__ctxs.filter(c => !c.isContextLost()).length, created: window.__ctxs.length, docListeners: window.__docL };
    }, snip);
    console.log('state', JSON.stringify(await state()), JSON.stringify(info));
    await frame.evaluate(() => { window.__pfxClock = () => 2.4; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx + 1, cy); await page.mouse.move(cx, cy);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `kv9/many_${snip}_${N}.png`, clip });
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
