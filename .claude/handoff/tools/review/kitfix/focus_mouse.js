// a mouse click focuses the avatar (tabindex) but must not show the keyboard ring
const { setup } = require('./common');
(async () => {
  const { browser, page, frame, pb, errs } = await setup({});
  const q = () => frame.evaluate(() => [document.activeElement && document.activeElement.id, document.getElementById('pfx').matches(':focus-visible'), getComputedStyle(document.querySelector('.pfx-stage'), '::after').opacity]);
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500);
    console.log('mouse click (on): [active, focus-visible, ring opacity]', JSON.stringify(await q()));
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500);
    console.log('mouse click (off):', JSON.stringify(await q()));
  } finally { console.log('console:', JSON.stringify(errs)); await browser.close(); }
})();
