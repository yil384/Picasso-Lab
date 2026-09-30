// reduced motion: click -> still frame, click -> photo. usage: node review/rv6/rm.js <snippet> <prefix> <phone>
const { open } = require('../../harness');
const fs = require('fs');
const OUT = __dirname + '/out';
(async () => {
  const [snip, pre, phone = '0'] = process.argv.slice(2);
  const isPhone = phone === '1';
  const TW = isPhone ? 257 : 266, TH = isPhone ? 274 : 284;
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844, dsf: 2 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|WebGL-/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(`/home/user/Picasso-Lab/people/${snip}.html`, 'utf8');
    await page.evaluate(([code, TW, TH]) => {
      const mv = document.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width, initial-scale=1'; document.head.appendChild(mv);
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe'); f.id = 'tile';
      f.style.cssText = `width:${TW}px;height:${TH}px;border:0;display:block`;
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, [code, TW, TH]);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const pb = await (await frame.$('#pfx')).boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    await page.keyboard.press('Tab'); // focus it (keyboard path)
    const focused = await frame.evaluate(() => document.activeElement && document.activeElement.id);
    await frame.focus('#pfx');
    await page.keyboard.press('Enter');
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${pre}_rm_on.png`, clip });
    const st1 = await frame.evaluate(() => [document.getElementById('pfx').getAttribute('aria-pressed')]);
    await page.waitForTimeout(400);
    await page.keyboard.press(' ');
    await page.waitForTimeout(600);
    const st2 = await frame.evaluate(() => [!!document.querySelector('.pfx-gl'), document.querySelector('.pfx-photo').style.visibility, document.getElementById('pfx').getAttribute('aria-pressed')]);
    await page.screenshot({ path: `${OUT}/${pre}_rm_off.png`, clip });
    console.log(JSON.stringify({ focused, st1, st2, errs }));
  } finally { await browser.close(); }
})();
