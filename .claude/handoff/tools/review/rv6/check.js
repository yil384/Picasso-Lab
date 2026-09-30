// usage: node review/rv6/check.js <snippet> <prefix> <phone 0|1> <times csv> [reduced 0|1]
// run from scratchpad dir. Writes PNGs to review/rv6/out/<prefix>_*.png and a JSON report.
const { open } = require('../../harness');
const fs = require('fs');
const DSF = +(process.env.DSF || 1);
const OUT = __dirname + '/out';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const [snip, pre, phone = '0', tcsv = '0,0.5,1,2,3', reduced = '0'] = process.argv.slice(2);
  const times = tcsv.split(',').map(Number);
  const isPhone = phone === '1';
  const TW = isPhone ? 257 : 266, TH = isPhone ? 274 : 284;
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844, dsf: DSF });
  if (reduced === '1') await page.emulateMedia({ reducedMotion: 'reduce' });
  const errs = [];
  const report = { snip, pre, phone: isPhone, DSF, checks: {} };
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|WebGL-/i.test(m.text())) errs.push(m.text().slice(0, 400)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(`/home/user/Picasso-Lab/people/${snip}.html`, 'utf8');
    await page.evaluate(([code, TW, TH]) => {
      const mv = document.createElement('meta'); mv.name = 'viewport'; mv.content = 'width=device-width, initial-scale=1'; document.head.appendChild(mv);
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe');
      f.id = 'tile';
      f.style.cssText = `width:${TW}px;height:${TH}px;border:0;display:block`;
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, [code, TW, TH]);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    // instrument WebGL contexts + rAF loops
    await frame.evaluate(() => {
      window.__ctxs = [];
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        const c = orig.call(this, type, ...a);
        if (c && /webgl/.test(type) && !window.__ctxs.includes(c)) window.__ctxs.push(c);
        return c;
      };
      window.__rafCount = 0;
      const oraf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => { window.__rafCount++; return oraf(cb); };
    });
    await page.waitForTimeout(600);
    const el = await page.$('#tile');
    const box = await el.boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const shot = (name) => page.screenshot({ path: `${OUT}/${pre}_${name}.png`, clip });
    await frame.evaluate(() => { window.__pfxT = 0; window.__pfxClock = () => window.__pfxT; });
    const pfx = await frame.$('#pfx');
    const pb = await pfx.boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(2500);
    await shot('hov');
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy);
    await frame.evaluate(async () => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const c = await m.attach(document.getElementById('pfx'));
      window.__av = c.avatar;
    });
    await page.waitForTimeout(700);
    const raf2 = () => frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const probe = () => frame.evaluate(() => {
      const av = window.__av; if (!av.gl) return { nogl: true };
      const k = av.gl.k; const bad = [];
      av.gl.scene.traverse(o => {
        const arr = [...o.matrixWorld.elements, o.position.x, o.position.y, o.position.z, o.scale.x, o.scale.y, o.scale.z];
        if (arr.some(v => !Number.isFinite(v))) bad.push(o.type + ':' + (o.name || o.id));
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of ms) {
          if (!Number.isFinite(m.opacity)) bad.push('opacity ' + o.id);
          if (m.uniforms) for (const [n, u] of Object.entries(m.uniforms)) if (typeof u.value === 'number' && !Number.isFinite(u.value)) bad.push('uniform ' + n + ' ' + o.id);
        }
      });
      const L = k.layers;
      const col = (m) => [m.color.r, m.color.g, m.color.b, m.opacity, m.visible].map(v => typeof v === 'number' ? +v.toFixed(4) : v);
      return { bad: bad.slice(0, 10), nbad: bad.length, photo: col(L.photo.material), plate: col(L.plate.material), person: col(L.person.material),
        vis: [L.photo.visible, L.plate.visible, L.person.visible], root: [k.root.position.x, k.root.position.y, k.root.position.z].map(v => +v.toFixed(3)),
        t: av.t, e: av.e, ctxs: window.__ctxs.length, lost: window.__ctxs.map(c => c.isContextLost()) };
    });
    report.checks.on = [];
    for (const t of times) {
      await frame.evaluate(t => { window.__pfxT = t; }, t);
      await raf2();
      await shot('t' + String(Math.round(t * 100)).padStart(3, '0'));
      report.checks.on.push({ t, ...(await probe()) });
    }
    // e = 1 while on (the exit end state), at each t
    await frame.evaluate(() => { window.__pfxExit = () => 1; });
    report.checks.e1 = [];
    for (const t of times) {
      await frame.evaluate(t => { window.__pfxT = t; }, t);
      await raf2();
      await shot('e1_t' + String(Math.round(t * 100)).padStart(3, '0'));
      report.checks.e1.push({ t, ...(await probe()) });
    }
    // mid-exit states at t=2.0
    report.checks.mid = [];
    for (const e of [0.25, 0.5, 0.75, 0.95]) {
      await frame.evaluate(([e]) => { window.__pfxT = 2.0; window.__pfxExit = () => e; }, [e]);
      await raf2();
      await shot('mid_e' + String(Math.round(e * 100)).padStart(3, '0'));
      report.checks.mid.push({ e, ...(await probe()) });
    }
    await frame.evaluate(() => { delete window.__pfxExit; window.__pfxT = 2.0; });
    await page.waitForTimeout(800);
    await shot('ref_t200');
    // reversal: off, let the exit reach e >= 0.5, on again (debounce bypassed: lastToggle reset)
    await frame.evaluate(() => { window.__av.gl.__id = 'first'; });
    const eMid = await frame.evaluate(() => new Promise(res => {
      const av = window.__av; av.lastToggle = -1e9; av.toggle();
      const poll = () => { if (!av.gl || av.e >= 0.5) { const r = [av.e, !!av.gl, av.gl && av.gl.__id]; av.lastToggle = -1e9; av.toggle(); res(r); } else requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
    }));
    await page.waitForTimeout(1000);
    const after = await frame.evaluate(() => [window.__av.e, window.__av.on, !!window.__av.gl, window.__av.gl && window.__av.gl.__id]);
    await frame.evaluate(() => { window.__av.lastToggle = -1e9; });
    report.checks.reverse = { eAtSecondClick: eMid, after };
    await shot('rev_t200');
    report.checks.reverseProbe = await probe();
    // off fully
    await frame.evaluate(() => { window.__av.lastToggle = -1e9; });
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(1200);
    report.checks.off1 = await frame.evaluate(() => ({ gl: !!document.querySelector('.pfx-gl'), flat: !!document.querySelector('.pfx-2d'), vis: document.querySelector('.pfx-photo').style.visibility,
      pressed: document.getElementById('pfx').getAttribute('aria-pressed'), raf: window.__av.raf, ctxs: window.__ctxs.map(c => c.isContextLost()) }));
    await shot('off1');
    // on again (fresh build): t=0 and t=2 must match the first build
    await frame.evaluate(() => { window.__pfxT = 0; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(700);
    await shot('again_t000');
    await frame.evaluate(() => { window.__pfxT = 2.0; });
    await page.waitForTimeout(700);
    await shot('again_t200');
    report.checks.again = await probe();
    await frame.evaluate(() => { window.__pfxExit = () => 1; });
    await raf2();
    await shot('again_e1_t200');
    await frame.evaluate(() => { delete window.__pfxExit; window.__av.lastToggle = -1e9; });
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(1200);
    report.checks.off2 = await frame.evaluate(() => ({ gl: !!document.querySelector('.pfx-gl'), vis: document.querySelector('.pfx-photo').style.visibility,
      pressed: document.getElementById('pfx').getAttribute('aria-pressed'), raf: window.__av.raf, ctxs: window.__ctxs.map(c => c.isContextLost()), canvases: document.querySelectorAll('canvas').length }));
    const r0 = await frame.evaluate(() => window.__rafCount);
    await page.waitForTimeout(500);
    report.checks.rafIdle = (await frame.evaluate(() => window.__rafCount)) - r0;
  } catch (err) {
    report.error = String(err && err.stack || err).slice(0, 600);
  } finally {
    report.console = errs.slice(0, 12);
    fs.writeFileSync(`${OUT}/${pre}_report.json`, JSON.stringify(report, null, 1));
    console.log(JSON.stringify({ err: report.error, console: report.console, reverse: report.checks.reverse, off1: report.checks.off1, off2: report.checks.off2, rafIdle: report.checks.rafIdle,
      nan: (report.checks.on || []).concat(report.checks.e1 || []).filter(x => x.nbad).map(x => [x.t, x.bad]),
      e1layers: (report.checks.e1 || []).map(x => [x.t, x.plate, x.person, x.root]) }, null, 0));
    await browser.close();
  }
})();
