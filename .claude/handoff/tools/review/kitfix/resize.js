// the tile changes size while the effect is on (rotation, window resize) or while it is loading
const { setup } = require('./common');
const hookCtx = (frame) => frame.evaluate(() => {
  window.__ctxs = [];
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = g.call(this, type, ...a);
    if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
    return c;
  };
});
(async () => {
  const delay = +(process.argv[2] || 0);
  const { browser, page, frame, pb, errs, state } = await setup({
    dsf: 2,
    before: async (page) => {
      if (process.env.SLOWSCENE) {   // the scene's build takes 3 s: the resize lands after the kit measured the tile
        const src = require('fs').readFileSync('/home/user/Picasso-Lab/people/fx/zhuo.js', 'utf8').replace('async build(k) {', 'async build(k) { await new Promise(r => setTimeout(r, 3000));');
        await page.route('**/people/fx/zhuo.js', r => r.fulfill({ body: src, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript' } }));
      }
      if (delay) await page.route('**/people/static/fx/zhuo-plate.webp', async r => { await new Promise(res => setTimeout(res, delay)); await r.fallback(); });
    },
  });
  const live = () => frame.evaluate(() => window.__ctxs.filter(c => !c.isContextLost()).length);
  const geo = () => frame.evaluate(() => { const c = document.querySelector('.pfx-gl'), r = document.getElementById('pfx').getBoundingClientRect(); return { vw: innerWidth, vh: innerHeight, photo: [r.left, r.top, r.width], canvas: c && [c.style.left, c.style.top, c.style.width, c.style.height, c.width, c.height] }; });
  const log = async (l) => console.log(l, JSON.stringify(await state()), 'live ctx', await live(), JSON.stringify(await geo()));
  const size = (w, h) => page.evaluate(([w, h]) => { const f = document.getElementById('tile'); f.style.width = w + 'px'; f.style.height = h + 'px'; }, [w, h]);
  try {
    await hookCtx(frame);
    let b = await (await frame.$('#pfx')).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(2500);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    if (delay) {
      await page.waitForTimeout(600);
      await size(163, 174); await page.waitForTimeout(300); await log('resized while loading');
      await page.waitForTimeout(delay + 1500 + +(process.env.LANDWAIT || 0)); await log('load landed');
    } else {
      await page.waitForTimeout(1500); await log('on at 266x284');
      await frame.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(300); await log('resize event, same size');
      await size(163, 174); await page.waitForTimeout(400); await log('tile resized to 163x174');
    }
    b = await (await frame.$('#pfx')).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(1500);
    await log('on again at the new size');
    await size(257, 274); await page.waitForTimeout(400); await log('rotated to 257x274');
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8)));
    await browser.close();
  }
})();
