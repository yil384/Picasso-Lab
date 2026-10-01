// double click (desktop) / double tap (phone) plays the avatar film in the tile; a click skips it; one click still
// toggles the effect. usage: node film_test.js <snippet> <prefix> <phone 0|1>
const { open } = require('./harness');
const fs = require('fs');
process.chdir(__dirname);
(async () => {
  const [snip, pre, phone = '0'] = process.argv.slice(2);
  const isPhone = phone === '1', TW = isPhone ? 257 : 266, TH = isPhone ? 274 : 284;
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844, dsf: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
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
    await page.waitForTimeout(1500);
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const ib = await (await frame.$('img.pfx-photo')).boundingBox();
    const cx = ib.x + ib.width / 2, cy = ib.y + ib.height / 2;
    const state = () => frame.evaluate(() => {
      const w = document.getElementById('pfx'), v = w.querySelector('video.pfx-film');
      return { on: w.classList.contains('pfx-on'), film: w.classList.contains('pfx-film-on'), gl: !!w.querySelector('canvas'),
        v: v ? { t: +v.currentTime.toFixed(2), op: v.style.opacity, src: (v.currentSrc || '').split('/').pop(), rs: v.readyState, paused: v.paused,
          mp4: v.canPlayType('video/mp4; codecs="avc1.4d401e"'), webm: v.canPlayType('video/webm; codecs="vp9"') } : null };
    });
    const tap = async () => { if (isPhone) await page.touchscreen.tap(cx, cy); else await page.mouse.click(cx, cy); };
    const dbl = async () => { if (isPhone) { await page.touchscreen.tap(cx, cy); await page.waitForTimeout(110); await page.touchscreen.tap(cx, cy); } else await page.mouse.dblclick(cx, cy); };
    if (isPhone) await page.touchscreen.tap(5, 5); else await page.mouse.move(cx, cy);    // loads the kit (hover / touch)
    await page.waitForTimeout(2500);
    console.log('ready', JSON.stringify(await state()));
    // 1. double click plays the film
    await dbl(); const t0 = Date.now();
    for (const ms of [150, 1000, 4000, 7800, 8700]) {
      const w = ms - (Date.now() - t0); if (w > 0) await page.waitForTimeout(w);
      await page.screenshot({ path: `shots/${pre}_d${String(ms).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 80, clip });
      console.log('dbl', ms, JSON.stringify(await state()));
    }
    // 2. a click during the film skips it
    await dbl(); await page.waitForTimeout(1500);
    console.log('playing', JSON.stringify(await state()));
    await tap(); await page.waitForTimeout(400);
    console.log('skipped', JSON.stringify(await state()));
    await page.screenshot({ path: `shots/${pre}_skip.jpg`, type: 'jpeg', quality: 80, clip });
    // 3. one click still turns the effect on (after the double-click wait), a second one off
    await page.waitForTimeout(600);
    await tap(); await page.waitForTimeout(150);
    console.log('click+150', JSON.stringify(await state()));
    await page.waitForTimeout(1600);
    console.log('click+1750', JSON.stringify(await state()));
    await page.screenshot({ path: `shots/${pre}_fx.jpg`, type: 'jpeg', quality: 80, clip });
    await tap(); await page.waitForTimeout(1200);
    console.log('off', JSON.stringify(await state()));
  } finally { console.log('errors', JSON.stringify(errs)); await browser.close(); }
})();
