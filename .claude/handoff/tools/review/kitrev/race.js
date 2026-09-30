// on -> off -> on while the first build() is still loading: how many stages end up in the DOM?
const { setup } = require('./common');
(async () => {
  const delay = +(process.argv[2] || 3000);
  const gaps = (process.argv[3] || '500,500').split(',').map(Number);
  const { browser, page, frame, pb, clip, errs, state } = await setup({
    before: async (page) => {
      await page.route('**/people/static/fx/zhuo-plate.webp', async r => { await new Promise(res => setTimeout(res, delay)); await r.fallback(); });
    },
  });
  try {
    await frame.evaluate(() => {
      window.__ctxs = [];
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        const c = g.call(this, type, ...a);
        if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
        return c;
      };
    });
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);     // kit + scene imported
    await page.mouse.click(cx, cy);
    for (const g of gaps) { await page.waitForTimeout(g); await page.mouse.click(cx, cy); console.log('after click', JSON.stringify(await state())); }
    await page.waitForTimeout(delay + 2500);
    console.log('settled on:', JSON.stringify(await state()), 'live contexts:', await frame.evaluate(() => window.__ctxs.filter(c => !c.isContextLost()).length));
    await page.screenshot({ path: 'review/kitrev/race_on.jpg', type: 'jpeg', quality: 85, clip });
    await page.mouse.click(cx, cy);         // switch off
    await page.waitForTimeout(2000);
    console.log('after off:', JSON.stringify(await state()), 'live contexts:', await frame.evaluate(() => window.__ctxs.filter(c => !c.isContextLost()).length));
    await page.screenshot({ path: 'review/kitrev/race_off.jpg', type: 'jpeg', quality: 85, clip });
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
