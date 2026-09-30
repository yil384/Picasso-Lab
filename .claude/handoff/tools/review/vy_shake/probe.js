// usage: node review/vy_shake/probe.js <phone 0|1> <offT csv>
// Real-clock exits of yue_baseball: switch off when the effect clock reads offT, let e run on its own,
// log root.position / t / e for every rendered frame; then held-state shots at e=0.9.
const { open } = require('../../harness');
const fs = require('fs');
const OUT = __dirname + '/out';
(async () => {
  const [phone = '0', ocsv = '0.55,0.7,8.4,2.0'] = process.argv.slice(2);
  const offs = ocsv.split(',').map(Number);
  const isPhone = phone === '1';
  const TW = isPhone ? 257 : 266, TH = isPhone ? 274 : 284;
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|WebGL-/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/people/yue_baseball.html', 'utf8');
    await page.evaluate(([code, TW, TH]) => {
      const mv = document.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width, initial-scale=1'; document.head.appendChild(mv);
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe'); f.id = 'tile';
      f.style.cssText = `width:${TW}px;height:${TH}px;border:0;display:block`;
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, [code, TW, TH]);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    await page.waitForTimeout(600);
    const el = await page.$('#tile'); const box = await el.boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const pfx = await frame.$('#pfx'); const pb = await pfx.boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/p${phone}_img.png`, clip });
    for (const off of offs) {
      // clock: runs in real time from a base we can move
      await frame.evaluate(() => { window.__base = 0; window.__t0 = performance.now(); window.__pfxClock = () => window.__base + (performance.now() - window.__t0) / 1000; });
      await page.mouse.click(cx, cy);
      await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
      await page.mouse.move(cx, cy);
      await page.waitForTimeout(500);
      await frame.evaluate(async () => {
        const kit = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
        const a = (await kit.attach(document.getElementById('pfx'))).avatar;
        window.__av = a;
        if (!a.__wrapped) {
          const orig = a.render.bind(a);
          a.render = (dt) => { orig(dt); if (window.__log && a.gl) { const r = a.gl.root; window.__log.push([+a.t.toFixed(3), +a.e.toFixed(3), +r.position.x.toFixed(3), +r.position.y.toFixed(3), +r.rotation.x.toFixed(4), +r.rotation.y.toFixed(4)]); } };
          a.__wrapped = true;
        }
      });
      // move the clock so it reads `off` right now, wait ~1 frame, then click off
      await frame.evaluate((off) => { window.__base = off; window.__t0 = performance.now(); window.__log = []; }, off);
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(1200);
      const st = await frame.evaluate(() => ({ log: window.__log, gl: !!document.querySelector('.pfx-gl'), vis: document.querySelector('.pfx-photo').style.visibility }));
      const exitFrames = st.log.filter(r => r[1] > 0);
      console.log(`--- off at t~${off} (phone=${phone}) gl after: ${st.gl} vis:'${st.vis}' frames=${st.log.length}`);
      for (const r of exitFrames) console.log('  t,e,x,y,rotx,roty', JSON.stringify(r));
      await page.waitForTimeout(500);
    }
    // held-state visual: e = 0.9 (all props gone), t in the shake window vs t = 2.0
    await frame.evaluate(() => { window.__T = 0; window.__pfxClock = () => window.__T; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(800);
    await frame.evaluate(() => { window.__E = 0.9; window.__pfxExit = () => window.__E; });
    for (const t of [2.0, 0.93, 0.95, 0.99, 1.05]) {
      await frame.evaluate(t => { window.__T = t; }, t);
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: `${OUT}/p${phone}_e90_t${Math.round(t * 100)}.png`, clip });
    }
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8)));
    await browser.close();
  }
})();
