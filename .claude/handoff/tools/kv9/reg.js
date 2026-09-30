// regression pass for one snippet at one tile size (DSF 2, PNG frames in kv9/out/)
// usage: node kv9/reg.js <snippet> <prefix> <tw> <th> <mode d|p|pl> [times csv]
//   d = desktop viewport, p = portrait phone (iPhone 13), pl = landscape phone (screen 390 x 844)
const { open } = require('./harness2');
const fs = require('fs');
process.chdir(__dirname + '/..');
const OUT = 'kv9/out';
(async () => {
  const [snip, pre, tw, th, mode = 'd', tcsv = '0,0.3,0.6,0.9,1.3,2.0,3.1'] = process.argv.slice(2);
  const TW = +tw, TH = +th, times = tcsv.split(',').map(Number);
  const vp = mode === 'd' ? { width: 900, height: 844, mobileDev: false } : mode === 'p' ? { width: 390, height: 844, mobileDev: true, screen: { width: 390, height: 844 } } : { width: 844, height: 390, mobileDev: true, screen: { width: 390, height: 844 } };
  const DSF = +(process.env.DSF || 2);
  const { browser, page } = await open({ ...vp, dsf: DSF });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|WebGL-/i.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const res = { snip, TW, TH, mode, dsf: DSF };
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
    await frame.evaluate(() => {
      window.__ctxs = [];
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        const c = g.call(this, type, ...a);
        if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
        return c;
      };
    });
    await page.waitForTimeout(600);
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const rect = (sel) => frame.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(v => +v.toFixed(2)); }, sel);
    res.layout = await frame.evaluate(() => ({ vw: innerWidth, vh: innerHeight, cls: document.getElementById('pfx').className, compat: document.compatMode, d: getComputedStyle(document.getElementById('pfx')).width }));
    res.pfxIdle = await rect('#pfx');
    await page.screenshot({ path: `${OUT}/${pre}_idle.png`, clip });
    const pb = await (await frame.$('#pfx')).boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await frame.evaluate(() => { window.__pfxT = 0; window.__pfxClock = () => window.__pfxT; });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    res.stageHover = await rect('.pfx-stage');
    await page.screenshot({ path: `${OUT}/${pre}_hov.png`, clip });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(700);
    res.kit = await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); const a = c.avatar; const cv = a.gl.canvas; return { s: a.k.s, kdpr: a.k.dpr, W: a.k.W, H: a.k.H, canvasPx: [cv.width, cv.height], box: a.box }; });
    for (const t of times) {
      await frame.evaluate(t => { window.__pfxT = t; }, t);
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: `${OUT}/${pre}_t${String(Math.round(t * 100)).padStart(3, '0')}.png`, clip });
    }
    // tilt: pointer to the top-right of the tile, then a real (unheld) exit started from the API; record the applied rotation per frame
    await frame.evaluate(() => { window.__pfxT = 2.0; });
    await page.mouse.move(clip.x + clip.width - 2, clip.y + 2, { steps: 4 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${pre}_tilt.png`, clip });
    res.exit = await frame.evaluate(async () => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const c = await m.attach(document.getElementById('pfx'));
      const a = c.avatar, rec = [];
      a.lastToggle = 0;
      c.toggle();
      await new Promise(done => {
        const f = () => { if (a.gl) { rec.push([+a.e.toFixed(3), +a.gl.root.rotation.x.toFixed(5), +a.gl.root.rotation.y.toFixed(5)]); requestAnimationFrame(f); } else done(); };
        requestAnimationFrame(f);
      });
      return { frames: rec.length, first: rec[0], last3: rec.slice(-3), tiltAfter: { ...a.tilt } };
    });
    await page.waitForTimeout(400);
    res.afterOff = await frame.evaluate(() => ({ gl: document.querySelectorAll('.pfx-gl').length, flat: document.querySelectorAll('.pfx-2d').length, vis: document.querySelector('.pfx-photo').style.visibility, pressed: document.getElementById('pfx').getAttribute('aria-pressed'), cls: document.getElementById('pfx').className, liveCtx: window.__ctxs.filter(c => !c.isContextLost()).length, ctxCreated: window.__ctxs.length }));
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${pre}_zoff.png`, clip });
  } catch (e) { res.error = e.message.slice(0, 300); }
  finally {
    res.errs = errs.slice(0, 8);
    fs.writeFileSync(`${OUT}/${pre}.json`, JSON.stringify(res));
    console.log(JSON.stringify(res));
    await browser.close();
  }
})();
