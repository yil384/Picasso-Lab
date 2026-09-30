// (a) the browser drops the live context while the effect is on (too many contexts / GPU reset)
// (b) timing of the kit's own webglcontextlost handler after a normal teardown
const { setup } = require('./common');
(async () => {
  const { browser, page, frame, pb, clip, errs, state } = await setup({});
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    console.log('on:', JSON.stringify(await state()));
    await frame.evaluate(() => {
      const c = document.querySelector('.pfx-gl');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      gl.getExtension('WEBGL_lose_context').loseContext();
    });
    await page.waitForTimeout(800);
    console.log('after the browser lost the context:', JSON.stringify(await state()));
    await page.screenshot({ path: 'review/kitfix/lost.jpg', type: 'jpeg', quality: 85, clip });
    // (b) normal on -> off, log when teardown happens and when the stale lost event arrives
    await page.waitForTimeout(500);
    await page.mouse.click(cx, cy);   // on again
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    console.log('on again:', JSON.stringify(await state()));
    await page.waitForTimeout(1200);
    await frame.evaluate(() => {
      window.__log = [];
      const c = document.querySelector('.pfx-gl');
      c.addEventListener('webglcontextlost', () => window.__log.push(['lost', performance.now()]));
      new MutationObserver(() => { if (!c.isConnected) window.__log.push(['removed', performance.now()]); }).observe(document.querySelector('.pfx-stage'), { childList: true });
    });
    await page.mouse.click(cx, cy);   // off
    await page.waitForTimeout(1500);
    console.log('teardown log:', JSON.stringify(await frame.evaluate(() => window.__log)));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
