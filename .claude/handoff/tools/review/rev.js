// usage: node rev.js <snippet> <prefix> [reduced 0|1]
const { open } = require('../harness');
const fs = require('fs');
const OUT = __dirname + '/shots/';
(async () => {
  const [snip, pre, reduced = '0'] = process.argv.slice(2);
  const { browser, page } = await open({ width: 900, height: 844, dsf: 1 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|WebGL-/i.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    if (reduced === '1') await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(`/home/user/Picasso-Lab/people/${snip}.html`, 'utf8');
    await page.evaluate((code) => {
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe'); f.id = 'tile';
      f.style.cssText = 'width:266px;height:284px;border:0;display:block';
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, code);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    await page.waitForTimeout(500);
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const pb = await (await frame.$('#pfx')).boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    const shot = async (n, q = 95) => page.screenshot({ path: OUT + `${pre}_${n}.png`, clip });
    const raf2 = () => frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const state = () => frame.evaluate(async () => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const c = await m.attach(document.getElementById('pfx'));
      const a = c.avatar;
      return { on: a.on, e: +a.e.toFixed(3), gl: !!a.gl, canv: document.querySelectorAll('canvas').length, raf: !!a.raf,
        mem: a.gl ? a.gl.renderer.info.memory : null, prog: a.gl ? a.gl.renderer.info.programs.length : null,
        vis: document.querySelector('.pfx-photo').style.visibility, plateCol: a.gl ? a.gl.k.layers.plate.material.color.getHexString() : null };
    });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(2500);
    await shot('hov');
    await frame.evaluate(() => { window.__pfxT = 0; window.__pfxClock = () => window.__pfxT; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(300);
    if (reduced === '1') {
      await shot('still');
      console.log('reduced on', JSON.stringify(await state()));
      await page.waitForTimeout(500);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(100);
      console.log('reduced off', JSON.stringify(await state()));
      await shot('still_off');
      return;
    }
    await shot('a_t0');
    await frame.evaluate(() => { window.__pfxT = 3.0; }); await raf2(); await page.waitForTimeout(200);
    await shot('a_t3');
    console.log('on t3', JSON.stringify(await state()));
    // exit to e=0.5 then reverse
    await frame.evaluate(() => { window.__pfxE = 0.5; window.__pfxExit = () => window.__pfxE; });
    await page.mouse.click(cx, cy);
    await raf2();
    await shot('b_e05');
    await page.waitForTimeout(450);
    await page.mouse.click(cx, cy);
    await frame.evaluate(() => { window.__pfxE = 0; }); await raf2();
    await frame.evaluate(() => { delete window.__pfxExit; }); await raf2(); await page.waitForTimeout(300);
    await shot('b_back');
    console.log('reversed', JSON.stringify(await state()));
    // full exit
    await page.waitForTimeout(450);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(1200);
    console.log('off', JSON.stringify(await state()));
    await shot('c_off');
    // second activation
    await frame.evaluate(() => { window.__pfxT = 0; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await shot('d_t0');
    await frame.evaluate(() => { window.__pfxT = 3.0; }); await raf2(); await page.waitForTimeout(200);
    await shot('d_t3');
    console.log('on2 t3', JSON.stringify(await state()));
    // rapid toggles incl. during load
    await page.waitForTimeout(450);
    await page.mouse.click(cx, cy); await page.waitForTimeout(1200);
    await frame.evaluate(() => { delete window.__pfxClock; });
    for (let i = 0; i < 6; i++) { await page.mouse.click(cx, cy); await page.waitForTimeout(390 + (i % 3) * 60); }
    await page.waitForTimeout(1500);
    console.log('after rapid', JSON.stringify(await state()));
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500);
    console.log('final', JSON.stringify(await state()));
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 10), null, 1));
    await browser.close();
  }
})();
