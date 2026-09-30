// keyboard focus ring: visible while off and while on (over the effect canvas), gone when unfocused or mouse-focused
// usage: node kv9/focus2.js <snippet> <prefix> [phone 0|1] [tw] [th]
const { setup } = require('./common');
(async () => {
  const [snip = 'zhuo_gold_medal', pre = 'fr', phone = '0', tw = '0', th = '0'] = process.argv.slice(2);
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip, phone: phone === '1', dsf: 2, tw: +tw, th: +th });
  const shot = (n) => page.screenshot({ path: `kv9/${pre}_${n}.png`, clip });
  const info = () => frame.evaluate(() => {
    const st = document.querySelector('.pfx-stage');
    const a = getComputedStyle(st, '::after');
    const r = document.getElementById('pfx').getBoundingClientRect();
    return { fv: document.getElementById('pfx').matches(':focus-visible'), ringOpacity: a.opacity, pfx: [r.left, r.top, r.width], vp: [innerWidth, innerHeight], cls: document.getElementById('pfx').className };
  });
  try {
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'before'; b.textContent = 'before'; b.style.cssText = 'position:absolute;left:340px;top:0'; document.body.prepend(b); });
    await frame.evaluate(() => { window.__pfxClock = () => 2.4; });
    await page.mouse.move(5, 800);
    await shot('0_idle');
    console.log('idle        ', JSON.stringify(await info()));
    await page.focus('#before');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(3500);
    await shot('1_focus_off');
    console.log('focus, off  ', JSON.stringify(await info()));
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await shot('2_focus_on');
    console.log('focus, on   ', JSON.stringify(await info()));
    await page.focus('#before');
    await page.waitForTimeout(900);
    await shot('3_blur_on');
    console.log('blurred, on ', JSON.stringify(await info()));
    // mouse click on the avatar: no ring
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.click(cx, cy);          // off
    await page.waitForTimeout(1500);
    await page.mouse.move(5, 800);
    await page.waitForTimeout(900);
    await shot('4_mouse_off');
    console.log('mouse, off  ', JSON.stringify(await info()), JSON.stringify(await state()));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
