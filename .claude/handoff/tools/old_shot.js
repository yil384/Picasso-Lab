// Render an old (pre-kit, CSS/SVG) avatar snippet the way Google Sites does, click the photo, and screenshot
// the effect in real time. usage: node old_shot.js <snippet file> <prefix> [ms csv] [TW TH] [phone 0|1]
// -> shots/<prefix>_idle.jpg, _hov.jpg, _m<ms>.jpg (ms after the click)
const { open } = require('./harness');
const fs = require('fs');
process.chdir(__dirname);
(async () => {
  const [file, pre, mcsv = '150,400,800,1300,2000,3000,4500', tw = '266', th = '284', phone = '0'] = process.argv.slice(2);
  const TW = +tw, TH = +th, isPhone = phone === '1';
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844, dsf: +(process.env.DSF || 2) });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(file, 'utf8');
    await page.evaluate(([code, TW, TH]) => {
      const mv = document.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width, initial-scale=1'; document.head.appendChild(mv);
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe'); f.id = 'tile';
      f.style.cssText = `width:${TW}px;height:${TH}px;border:1px dashed #ccc;display:block`;
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, [code, TW, TH]);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    await page.waitForTimeout(2500);
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    await page.screenshot({ path: `shots/${pre}_idle.jpg`, type: 'jpeg', quality: 85, clip });
    const img = await frame.$('img.avatar') || await frame.$('img');
    const ib = await img.boundingBox();
    const cx = ib.x + ib.width / 2, cy = ib.y + ib.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(1200);
    await page.screenshot({ path: `shots/${pre}_hov.jpg`, type: 'jpeg', quality: 85, clip });
    await page.mouse.click(cx, cy);
    const t0 = Date.now();
    for (const ms of mcsv.split(',').map(Number)) {
      const wait = ms - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
      await page.screenshot({ path: `shots/${pre}_m${String(ms).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
    }
    console.log(pre, 'photo box', JSON.stringify(ib), 'errors', JSON.stringify(errs));
  } finally { await browser.close(); }
})();
