// toggle races and resize paths. usage: node kv9/races.js <scenario> [snippet]
//   offload   : on, off while loading (slow plate), build lands while off
//   flip4     : on, off, on, off while loading
//   flip3     : on, off, on while loading (ends on)
//   reenter   : on, off, on again mid-exit (same stage, no new context)
//   dbl       : two clicks 120 ms apart count once
//   resizeon  : tile resized while on -> back to the photo; on again builds at the new size
//   resizeld  : tile resized while loading -> back to the photo when the build lands
//   keys      : Enter / Space on and off, pointer elsewhere
const { setup } = require('./common');
(async () => {
  const [sc, snip = 'zhuo_gold_medal'] = process.argv.slice(2);
  const name = snip.split('_')[0] === 'ohm' ? 'ohm' : snip.split('_')[0];
  const slow = ['offload', 'flip4', 'flip3', 'resizeld'].includes(sc);
  const fs = require('fs');
  const sceneSrc = sc === 'resizebuild' ? fs.readFileSync(`/home/user/Picasso-Lab/people/fx/${name}.js`, 'utf8').replace('async build(k) {', 'async build(k) { await new Promise(r => setTimeout(r, 2500));') : null;
  const { browser, page, frame, pb, clip, errs, state } = await setup({
    snip, dsf: 2,
    before: async (page) => {
      if (sceneSrc) await page.route(`**/people/fx/${name}.js`, r => r.fulfill({ body: sceneSrc, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/javascript' } }));
      if (slow) await page.route(`**/people/static/fx/${name}-plate.webp`, async r => { await new Promise(res => setTimeout(res, 2500)); await r.fallback(); });
    },
  });
  const st = async () => ({ ...(await state()), ...(await frame.evaluate(() => ({ live: window.__ctxs.filter(c => !c.isContextLost()).length, made: window.__ctxs.length }))) });
  const log = async (l) => console.log(sc.padEnd(9), l.padEnd(28), JSON.stringify(await st()));
  try {
    await frame.evaluate(() => {
      window.__ctxs = [];
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        const c = g.call(this, type, ...a);
        if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
        return c;
      };
    });
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    const click = () => page.mouse.click(cx, cy);
    const onReady = () => frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    const resize = (w, h) => page.evaluate(([w, h]) => { const f = document.getElementById('tile'); f.style.width = w + 'px'; f.style.height = h + 'px'; }, [w, h]);
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    if (sc === 'offload') {
      await click(); await page.waitForTimeout(500); await click(); await log('off while loading');
      await page.waitForTimeout(3500); await log('after the build landed');
    } else if (sc === 'flip4' || sc === 'flip3') {
      const n = sc === 'flip4' ? 4 : 3;
      for (let i = 0; i < n; i++) { await click(); await page.waitForTimeout(450); await log(`click ${i + 1}`); }
      await page.waitForTimeout(3500); await log('settled');
      if (sc === 'flip3') { await click(); await page.waitForTimeout(1500); await log('off'); }
    } else if (sc === 'reenter') {
      await click(); await onReady(); await page.waitForTimeout(1200); await log('on');
      await click(); await page.waitForTimeout(150); await log('off (mid-exit)');
      await page.waitForTimeout(250); await click(); await page.waitForTimeout(1200); await log('on again mid-exit');
      await click(); await page.waitForTimeout(1500); await log('off');
    } else if (sc === 'dbl') {
      await click(); await page.waitForTimeout(120); await click(); await page.waitForTimeout(2500); await log('double click');
      await page.waitForTimeout(400); await click(); await page.waitForTimeout(1500); await log('single click');
    } else if (sc === 'resizeon') {
      await click(); await onReady(); await page.waitForTimeout(1000); await log('on at 266x284');
      await resize(163, 174); await page.waitForTimeout(800); await log('resized to 163x174');
      await page.screenshot({ path: `kv9/rc_${sc}_resized.png`, clip: { ...clip, width: 163, height: 174 } });
      const pb2 = await (await frame.$('#pfx')).boundingBox();
      await page.mouse.move(pb2.x + pb2.width / 2, pb2.y + pb2.height / 2);
      await page.waitForTimeout(500);
      await page.mouse.click(pb2.x + pb2.width / 2, pb2.y + pb2.height / 2); await onReady(); await page.waitForTimeout(800);
      console.log(sc.padEnd(9), 'rebuilt: box', JSON.stringify(await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); return { box: c.avatar.box, s: c.avatar.k.s }; })));
      await log('on at 163x174');
      await page.mouse.click(pb2.x + pb2.width / 2, pb2.y + pb2.height / 2); await page.waitForTimeout(1500); await log('off');
    } else if (sc === 'resizeld') {
      await click(); await page.waitForTimeout(500); await resize(163, 174); await page.waitForTimeout(300); await log('resized while loading');
      await page.waitForTimeout(3500); await log('after the build landed');
      console.log(sc.padEnd(9), 'built for', JSON.stringify(await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); return { box: c.avatar.box, s: c.avatar.k && c.avatar.k.s }; })));
    } else if (sc === 'resizebuild') {
      await click(); await page.waitForTimeout(1200); await resize(163, 174); await page.waitForTimeout(300); await log('resized while scene builds');
      await page.waitForTimeout(3500); await log('after the build landed');
      const pb2 = await (await frame.$('#pfx')).boundingBox();
      await page.mouse.click(pb2.x + pb2.width / 2, pb2.y + pb2.height / 2); await page.waitForTimeout(4500); await log('clicked on at new size');
      console.log(sc.padEnd(9), 'built for', JSON.stringify(await frame.evaluate(async () => { const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js'); const c = await m.attach(document.getElementById('pfx')); return { box: c.avatar.box, s: c.avatar.k && c.avatar.k.s }; })));
    } else if (sc === 'keys') {
      await page.mouse.move(5, 800);
      await frame.focus('#pfx');
      await page.keyboard.press('Enter'); await onReady(); await page.waitForTimeout(1000); await log('Enter on');
      await page.keyboard.press('Enter'); await page.waitForTimeout(1500); await log('Enter off');
      await page.keyboard.press(' '); await onReady(); await page.waitForTimeout(1000); await log('Space on');
      await page.keyboard.press(' '); await page.waitForTimeout(1500); await log('Space off');
    }
  } catch (e) { console.log(sc, 'ERROR', e.message.slice(0, 200)); }
  finally {
    console.log(sc.padEnd(9), 'console:', JSON.stringify(errs.slice(0, 6)));
    await browser.close();
  }
})();
