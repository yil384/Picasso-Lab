// a stale webglcontextlost from an earlier stage (A) must not switch off the live stage (B)
const { setup } = require('./common');
(async () => {
  const { browser, page, frame, pb, errs, state } = await setup({});
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    const onReady = () => frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    await page.mouse.click(cx, cy); await onReady(); await page.waitForTimeout(800);
    // keep A's context alive past its teardown, so its lost listener is still armed
    await frame.evaluate(async () => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const c = await m.attach(document.getElementById('pfx'));
      window.__A = c.avatar.gl.canvas;
      window.__gA = c.avatar.gl.renderer.getContext();
      c.avatar.gl.renderer.forceContextLoss = () => {};
    });
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500);
    console.log('A off          ', JSON.stringify(await state()), 'A lost?', await frame.evaluate(() => window.__gA.isContextLost()));
    await page.mouse.click(cx, cy); await onReady(); await page.waitForTimeout(800);
    console.log('B on           ', JSON.stringify(await state()), 'B is A?', await frame.evaluate(() => document.querySelector('.pfx-gl') === window.__A));
    await frame.evaluate(() => window.__gA.getExtension('WEBGL_lose_context').loseContext());
    await page.waitForTimeout(1000);
    console.log('A lost, B live ', JSON.stringify(await state()));
    await frame.evaluate(() => { const g = document.querySelector('.pfx-gl').getContext('webgl2'); g.getExtension('WEBGL_lose_context').loseContext(); });
    await page.waitForTimeout(1000);
    console.log('B lost         ', JSON.stringify(await state()));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 6)));
    await browser.close();
  }
})();
