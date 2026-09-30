// verifier: real eviction (too many active WebGL contexts in the renderer process), not a manual loseContext()
const { setup } = require('../kitrev/common');
(async () => {
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip: process.argv[2] || 'ohm' });
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(2500);
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    console.log('on:', JSON.stringify(await state()));
    await frame.evaluate(() => { window.__lost = 0; document.querySelector('.pfx-gl').addEventListener('webglcontextlost', () => window.__lost++); });
    // other embeds on the Team page (each its own avatar) = other contexts in the same renderer process
    await page.evaluate(() => {
      window.__ctxs = [];
      for (let i = 0; i < 18; i++) {
        const c = document.createElement('canvas'); c.width = c.height = 8;
        const g = c.getContext('webgl2');
        g.clearColor(0, 0, 0, 1); g.clear(g.COLOR_BUFFER_BIT); g.flush();
        window.__ctxs.push(g);
      }
    });
    await page.waitForTimeout(1000);
    console.log('lost events on avatar:', await frame.evaluate(() => window.__lost));
    console.log('after eviction:', JSON.stringify(await state()));
    await page.mouse.move(5, 5);
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'review/ctxv/evicted.jpg', type: 'jpeg', quality: 85, clip });
    const tr = await frame.evaluate(() => getComputedStyle(document.querySelector('.pfx-stage')).transform);
    console.log('stage transform (no hover):', tr);
    // next activation (keyboard, as a screen-reader user would)
    await frame.focus('#pfx');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    console.log('after next Enter:', JSON.stringify(await state()));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 10), null, 1));
    await browser.close();
  }
})();
