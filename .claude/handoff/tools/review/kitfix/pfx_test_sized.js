// usage: node pfx_test.js <snippet> <out-prefix> [times csv] [exit csv] [phone 0|1]
const { open } = require('../../harness');
const DSF = +(process.env.DSF || 1);
process.chdir(__dirname + '/../..');
const fs = require('fs');
(async () => {
  const [snip, pre, tcsv = '0,0.15,0.35,0.6,0.9,1.3,2.0,3.1', ecsv = '0.3,0.6,1', phone = '0', tw = '0', th = '0'] = process.argv.slice(2);
  const times = tcsv.split(',').map(Number), exits = ecsv ? ecsv.split(',').map(Number) : [];
  const isPhone = phone === '1';
  const TW = +tw || (isPhone ? 257 : 266), TH = +th || (isPhone ? 274 : 284);
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844, dsf: DSF });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.text().slice(0, 400)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(`/home/user/Picasso-Lab/people/${snip}.html`, 'utf8');
    await page.evaluate(([code, TW, TH]) => {
      const mv = document.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width, initial-scale=1'; document.head.appendChild(mv);
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe');
      f.id = 'tile';
      f.style.cssText = `width:${TW}px;height:${TH}px;border:1px dashed #ccc;display:block`;
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, [code, TW, TH]);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    await page.waitForTimeout(800);
    const el = await page.$('#tile');
    const box = await el.boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    await page.screenshot({ path: `shots/${pre}_idle.jpg`, type: 'jpeg', quality: 80, clip });
    await frame.evaluate(() => { window.__pfxT = 0; window.__pfxClock = () => window.__pfxT; });
    const pfx = await frame.$('#pfx');
    const pb = await pfx.boundingBox();
    console.log('tile', TW, TH, 'photo box in tile', JSON.stringify(await frame.evaluate(() => { const r = document.getElementById('pfx').getBoundingClientRect(); return { x: r.left, y: r.top, d: r.width, h: r.height, vw: innerWidth, vh: innerHeight, cls: document.getElementById('pfx').className, compat: document.compatMode }; })));
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);   // hover: preload
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `shots/${pre}_hov.jpg`, type: 'jpeg', quality: 95, clip });
    await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);   // centred pointer -> no tilt
    await page.waitForTimeout(700);
    for (const t of times) {
      await frame.evaluate(t => { window.__pfxT = t; }, t);
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: `shots/${pre}_t${String(Math.round(t * 100)).padStart(3, '0')}.jpg`, type: 'jpeg', quality: t === 0 ? 95 : 80, clip });
    }
    // tilt check: pointer to the top-right of the avatar
    await page.mouse.move(pb.x + pb.width * 0.95, pb.y + pb.height * 0.05);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `shots/${pre}_tilt.jpg`, type: 'jpeg', quality: 80, clip });
    await page.mouse.move(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.waitForTimeout(700);
    if (exits.length) {
      await frame.evaluate(() => { window.__pfxE = 0; window.__pfxExit = () => window.__pfxE; });
      await page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2);
      for (const e of exits) {
        await frame.evaluate(e => { window.__pfxE = e; }, e);
        await frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.screenshot({ path: `shots/${pre}_x${String(Math.round(e * 100)).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
      }
      await frame.evaluate(() => { delete window.__pfxExit; });
      await page.waitForTimeout(600);
      const st = await frame.evaluate(() => [!!document.querySelector('.pfx-gl'), document.querySelector('.pfx-photo').style.visibility, document.getElementById('pfx').getAttribute('aria-pressed')]);
      console.log('after off (gl present, img visibility, pressed):', JSON.stringify(st));
      await page.screenshot({ path: `shots/${pre}_zoff.jpg`, type: 'jpeg', quality: 95, clip });
      console.log('kit s', await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); return c.avatar.k && c.avatar.k.s; }));
    }
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
