// does the tilt left over from the previous activation leak into the next one's first frame?
// usage: node tilt.js <snippet> <prefix> <control 0|1> [phone 0|1]
const { setup } = require('./common');
(async () => {
  const [snip = 'zhuo_gold_medal', pre = 'tl', control = '0', phone = '0'] = process.argv.slice(2);
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip, phone: phone === '1', dsf: 2 });
  const shot = async (name) => page.screenshot({ path: `review/kitfix/${pre}_${name}.png`, clip });
  const firstFrame = async (name) => {
    await frame.evaluate(() => { window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 1; });
    await frame.focus('#pfx');
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await shot(name + '_canvas');
    await frame.evaluate(() => { document.querySelector('.pfx-gl').style.opacity = '0'; document.querySelector('.pfx-2d').style.opacity = '0'; document.querySelector('.pfx-photo').style.visibility = ''; });
    await page.waitForTimeout(200);
    await shot(name + '_photo');
  };
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    if (control === '1') { await page.mouse.move(clip.x + clip.width - 2, clip.y + 2); await firstFrame('first'); return; }
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(2000);
    if (process.env.OFFCLICK) {
      const [dx, dy] = process.env.OFFCLICK.split(',').map(Number);
      await page.mouse.move(cx + dx, cy + dy, { steps: 5 });
      await page.waitForTimeout(1200);
      await page.mouse.click(cx + dx, cy + dy);                                 // switch off by clicking the avatar off-centre
    } else {
    await page.mouse.move(clip.x + clip.width - 2, clip.y + 2, { steps: 5 });   // pointer to the tile's top-right corner
    await page.waitForTimeout(1200);
    await frame.focus('#pfx');
    await page.keyboard.press('Enter');                                        // switch off from the keyboard, pointer stays
    }
    await page.waitForTimeout(1500);
    console.log('after off:', JSON.stringify(await state()));
    const tilt = await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); return c.avatar.tilt; });
    console.log('tilt left after teardown:', JSON.stringify(tilt), 'rad x', (tilt.y * 0.075).toFixed(4), 'rad y', (tilt.x * 0.075).toFixed(4));
    await firstFrame('second');
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
