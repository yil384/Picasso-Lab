// count dead WebGL contexts retained after N on/off cycles; variant 'orig' or 'fix' (dispose cached textures too)
const { setup } = require('../kitrev/common');
const fs = require('fs');
(async () => {
  const snip = process.argv[2] || 'zhuo_gold_medal';
  const N = +(process.argv[3] || 10);
  const variant = process.argv[4] || 'orig';
  const before = async (page, ctx) => {
    if (variant === 'fix') {
      let src = fs.readFileSync('/home/user/Picasso-Lab/people/fx/kit.js', 'utf8');
      const a = "if (v && v.isTexture && !texCache.has(v.source?.data?.src)) v.dispose?.();";
      if (!src.includes(a)) throw new Error('pattern');
      src = src.replace(a, "if (v && v.isTexture) v.dispose?.();");
      await ctx.route('**/people/fx/kit.js', r => r.fulfill({ body: src, headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' } }));
    }
  };
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip, before });
  const cdp = await page.context().newCDPSession(page);
  const ctxs = [];
  cdp.on('Runtime.executionContextCreated', e => ctxs.push(e.context));
  await cdp.send('Runtime.enable');
  const mainId = (await cdp.send('Page.getFrameTree')).frameTree.frame.id;
  const count = async () => {
    await cdp.send('HeapProfiler.enable');
    const fc = ctxs.filter(c => c.auxData && c.auxData.isDefault && c.auxData.frameId !== mainId).pop();
    for (let i = 0; i < 3; i++) await cdp.send('HeapProfiler.collectGarbage');
    const out = {};
    for (const cls of ['WebGL2RenderingContext', 'WebGLRenderingContext', 'HTMLCanvasElement', 'WebGLTexture', 'WebGLProgram']) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `${cls}.prototype`, contextId: fc.id });
      const { objects } = await cdp.send('Runtime.queryObjects', { prototypeObjectId: result.objectId });
      const { result: len } = await cdp.send('Runtime.callFunctionOn', { objectId: objects.objectId, functionDeclaration: 'function(){return this.length}', returnByValue: true });
      out[cls] = len.value;
    }
    const hu = await cdp.send('Runtime.getHeapUsage');
    out.heapMB = +(hu.usedSize / 1048576).toFixed(2);
    return out;
  };
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    console.log(variant, 'fresh', JSON.stringify(await count()));
    for (let i = 0; i < N; i++) {
      await page.mouse.click(cx, cy);
      await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
      await page.waitForTimeout(600);
      if (i === 0) console.log(variant, 'active#1', JSON.stringify(await count()));
      await page.mouse.click(cx, cy);
      await frame.waitForFunction(() => !document.querySelector('.pfx-gl'), null, { timeout: 10000 });
      await page.waitForTimeout(450);
      if (i === 0 || i === 4) console.log(variant, 'after', i + 1, JSON.stringify(await count()));
    }
    await page.waitForTimeout(1000);
    const lst = await frame.evaluate(async () => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const name = document.getElementById('pfx').dataset.fx;
      const urls = [document.querySelector('.pfx-photo').currentSrc || document.querySelector('.pfx-photo').src, `${m.STATIC}fx/${name}-plate.webp`, `${m.STATIC}fx/${name}-cut.webp`];
      const r = [];
      for (const u of urls) { const t = await m.loadTexture(u); r.push(((t._listeners && t._listeners.dispose) || []).length); }
      return r;
    });
    console.log(variant, `after ${N}`, JSON.stringify(await count()), 'disposeListeners', JSON.stringify(lst), 'state', JSON.stringify(await state()));
    // one more activation: must still render
    await frame.evaluate(() => { window.__pfxClock = () => 2.4; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `review/texlv/tl_${variant}_${N}.png`, clip });
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
