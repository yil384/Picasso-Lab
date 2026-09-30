// first frame (loop frozen) vs the <img>, same stage transform: does the avatar land exactly on the photo?
// usage: node align.js <snippet> <tw> <th> <phone 0|1> <dsf> <prefix>
const { setup } = require('./common');
(async () => {
  const [snip, tw, th, phone, dsf, pre] = process.argv.slice(2);
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip, tw: +tw, th: +th, phone: phone === '1', dsf: +dsf });
  try {
    await page.mouse.move(clip.x + clip.width - 2, clip.y + 2);
    await frame.evaluate(() => { window.requestAnimationFrame = () => 1; });
    await frame.focus('#pfx');
    await page.waitForTimeout(3000);
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const info = await frame.evaluate(() => { const w = document.getElementById('pfx'); const r = w.getBoundingClientRect(); return { cls: w.className, left: r.left, top: r.top, offL: w.offsetLeft, offT: w.offsetTop, cw: document.documentElement.clientWidth, ch: document.documentElement.clientHeight, dpr: devicePixelRatio, screen: [screen.width, screen.height] }; });
    console.log(JSON.stringify(info));
    await page.screenshot({ path: `review/kitrev/${pre}_canvas.png`, clip });
    await frame.evaluate(() => { document.querySelector('.pfx-gl').style.opacity = '0'; document.querySelector('.pfx-2d').style.opacity = '0'; document.querySelector('.pfx-photo').style.visibility = ''; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `review/kitrev/${pre}_photo.png`, clip });
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
