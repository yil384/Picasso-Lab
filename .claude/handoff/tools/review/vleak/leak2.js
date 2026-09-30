// verify: failing scene build leaks WebGL contexts; does it harm a live effect in another embed?
const { open } = require('../../harness');
const fs = require('fs');
const N = +(process.argv[2] || 20);
const REDUCED = process.argv[3] === '1';
(async () => {
  const bad = fs.readFileSync('/home/user/Picasso-Lab/people/fx/zhuo.js', 'utf8').replace('async build(k) {', 'async build(k) { if (k) throw new Error("scene build failed");');
  const { browser, page } = await open({ width: 1200, height: 844 });
  if (REDUCED) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/people/fx/zhuo.js', r => r.fulfill({ body: bad, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript' } }));
  const logs = [];
  page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 160)));
  page.on('requestfailed', r => logs.push('REQFAIL ' + r.url()));
  await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
  const good = fs.readFileSync('/home/user/Picasso-Lab/people/chang_top_scorer.html', 'utf8');
  const badSnip = fs.readFileSync('/home/user/Picasso-Lab/people/zhuo_gold_medal.html', 'utf8');
  await page.evaluate(([a, b]) => {
    document.body.style.cssText = 'margin:0;background:#fff;padding:20px;display:flex;gap:20px';
    for (const [id, code] of [['good', a], ['bad', b]]) {
      const f = document.createElement('iframe'); f.id = id;
      f.style.cssText = 'width:266px;height:284px;border:0;display:block';
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }
  }, [good, badSnip]);
  await page.waitForTimeout(600);
  const frames = page.frames().filter(fr => fr.parentFrame() && fr.url() === 'about:blank');
  const [fg, fb] = frames;
  // count contexts WITHOUT holding strong refs (WeakRef)
  for (const fr of frames) await fr.evaluate(() => {
    window.__made = 0; window.__refs = [];
    const g = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) {
      const c = g.call(this, type, ...a);
      if (/webgl/.test(type) && c && !this.__counted) { this.__counted = 1; window.__made++; window.__refs.push(new WeakRef(c)); this.addEventListener('webglcontextlost', () => console.log('CTX LOST in ' + (document.querySelector('#pfx').dataset.fx))); }
      return c;
    };
  });
  const box = async (fr) => { const f = await fr.frameElement(); const fb2 = await f.boundingBox(); const p = await (await fr.$('#pfx')).boundingBox(); return { x: p.x + p.width / 2, y: p.y + p.height / 2 }; };
  const g = await box(fg), b = await box(fb);
  await page.mouse.move(g.x, g.y); await page.waitForTimeout(2500);
  await page.mouse.click(g.x, g.y); await page.waitForTimeout(2500);
  const st = (fr) => fr.evaluate(() => ({ gl: document.querySelectorAll('.pfx-gl').length, pressed: document.getElementById('pfx').getAttribute('aria-pressed'), vis: document.querySelector('.pfx-photo').style.visibility }));
  console.log('good after on', JSON.stringify(await st(fg)));
  await page.mouse.move(b.x, b.y); await page.waitForTimeout(2500);
  console.log('bad box', JSON.stringify(b), 'good box', JSON.stringify(g));
  console.log('probe', await fb.evaluate(async () => { try { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/zhuo.js'); return 'ok ' + typeof m.default.build; } catch (e) { return 'ERR ' + e.message; } }));
  for (let i = 0; i < N; i++) { await page.mouse.click(b.x, b.y); await page.waitForTimeout(400); if (i % 10 === 9) console.log("after", i + 1, JSON.stringify(await fb.evaluate(() => { const r = window.__refs.map(w => w.deref()); return { made: window.__made, live: r.filter(x => x && !x.isContextLost()).length }; }))); }
  await page.waitForTimeout(1000);
  console.log('frames', frames.length, 'bad fx', await fb.evaluate(() => document.querySelector('#pfx').dataset.fx + ' ' + document.querySelector('#pfx').className), 'good fx', await fg.evaluate(() => document.querySelector('#pfx').dataset.fx));
  const alive = (fr) => fr.evaluate(() => { const r = window.__refs.map(w => w.deref()); return { made: window.__made, collected: r.filter(x => !x).length, live: r.filter(x => x && !x.isContextLost()).length, lost: r.filter(x => x && x.isContextLost()).length }; });
  console.log('bad ctxs', JSON.stringify(await alive(fb)), 'state', JSON.stringify(await st(fb)));
  console.log('good ctxs', JSON.stringify(await alive(fg)), 'state', JSON.stringify(await st(fg)));
  await page.screenshot({ path: __dirname + '/vl_after' + (REDUCED ? '_red' : '') + '.jpg', clip: { x: 0, y: 0, width: 620, height: 330 } });
  const seen = {}; for (const l of logs) seen[l] = (seen[l] || 0) + 1;
  console.log(JSON.stringify(seen, null, 1).slice(0, 2500));
  await browser.close();
})();
