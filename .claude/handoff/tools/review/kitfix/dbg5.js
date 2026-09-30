const { setup } = require('./common');
(async () => {
  const { browser, page, frame, pb, errs, state } = await setup({});
  page.on('framenavigated', f => console.log('navigated', f.url()));
  page.on('frameattached', f => console.log('attached', f.url()));
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    try { console.log('toggle via evaluate', await frame.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js').then(m => m.attach(document.getElementById('pfx'))).then(c => { c.toggle(); return 1; }))); } catch (e) { console.log('ERR1', e.message.slice(0, 100)); }
    await page.waitForTimeout(2000);
    const fr = page.frames().find(f => f.parentFrame() && f.url() === 'about:blank');
    console.log('same frame obj', fr === frame, page.frames().length);
    console.log(JSON.stringify(await fr.evaluate(() => ({ gl: document.querySelectorAll('.pfx-gl').length, p: document.getElementById('pfx').getAttribute('aria-pressed') }))));
  } catch (e) { console.log('ERR', e.message.slice(0, 200)); } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8)));
    await browser.close();
  }
})();
