const { setup } = require('./common');
(async () => {
  const { browser, page, frame, pb, errs, state } = await setup({});
  page.on('framenavigated', f => console.log('navigated', f.url(), f === frame));
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500);
    console.log(JSON.stringify(await state()));
    console.log('t1', await frame.evaluate(() => 1 + 1));
    console.log('t2', await frame.evaluate(() => typeof import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js').then));
    console.log('t4', await frame.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js').then(m => m.attach(document.getElementById('pfx'))).then(c => { c.avatar.teardown(); return 4; })));
    console.log(JSON.stringify(await state()));
    console.log('t5', await frame.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js').then(m => m.attach(document.getElementById('pfx'))).then(c => { setTimeout(() => c.avatar.turnOn(), 0); return 5; })));
    await page.waitForTimeout(1500);
    console.log(JSON.stringify(await state()));
    console.log('t3', await frame.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js').then(m => typeof m.attach)));
  } catch (e) { console.log('ERR', e.message.slice(0, 200)); } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8)));
    await browser.close();
  }
})();
