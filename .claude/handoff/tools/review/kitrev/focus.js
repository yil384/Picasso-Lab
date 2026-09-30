// keyboard focus indicator with the effect on vs off; tilt after the pointer leaves the tile
const { setup } = require('./common');
(async () => {
  const { browser, page, frame, pb, clip, errs, state } = await setup({});
  try {
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'before'; b.textContent = 'before'; document.body.prepend(b); });
    const tf = () => frame.evaluate(() => [getComputedStyle(document.querySelector('.pfx-stage')).transform, getComputedStyle(document.getElementById('pfx')).outlineStyle, document.activeElement && document.activeElement.id, document.getElementById('pfx').matches(':focus-visible')]);
    await page.mouse.move(5, 800);
    console.log('unfocused, off :', JSON.stringify(await tf()));
    await page.focus('#before');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(3500);
    console.log('tab-focused, off:', JSON.stringify(await tf()));
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(800);
    console.log('tab-focused, on :', JSON.stringify(await tf()));
    await page.focus('#before');
    await page.waitForTimeout(800);
    console.log('unfocused, on   :', JSON.stringify(await tf()));
    // tilt after the pointer leaves the tile
    await page.mouse.move(clip.x + clip.width - 3, clip.y + 3, { steps: 4 });
    await page.waitForTimeout(600);
    await page.mouse.move(clip.x + clip.width + 200, clip.y - 10, { steps: 4 });
    await page.waitForTimeout(1200);
    const tilt = await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); return c.avatar.tilt; });
    console.log('tilt after pointer left the tile:', JSON.stringify(tilt));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
