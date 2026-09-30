// a scene whose build() throws: is the renderer created before it released?
const { setup } = require('./common');
const fs = require('fs');
(async () => {
  const src = fs.readFileSync('/home/user/Picasso-Lab/people/fx/zhuo.js', 'utf8').replace('async build(k) {', 'async build(k) { if (k) throw new Error("scene build failed");');
  const { browser, page, frame, pb, clip, errs, state } = await setup({
    before: async (page) => {
      await page.route('**/people/fx/zhuo.js', r => r.fulfill({ body: src, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript' } }));
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
    await page.waitForTimeout(3000);
    for (let i = 0; i < 4; i++) { await page.mouse.click(cx, cy); await page.waitForTimeout(900); }
    console.log(JSON.stringify(await state()), 'webgl contexts created', await frame.evaluate(() => window.__ctxs.length), 'still live', await frame.evaluate(() => window.__ctxs.filter(c => !c.isContextLost()).length));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
