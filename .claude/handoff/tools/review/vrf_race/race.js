// verifier: on -> off -> on during first build(); count stages / contexts; screenshot after off
const { open } = require('../../harness');
const fs = require('fs');
(async () => {
  const snip = process.argv[2] || 'ohm';
  const fxname = process.argv[3] || 'ohm';
  const delay = +(process.argv[4] || 2500);
  const gaps = (process.argv[5] || '450,450').split(',').map(Number);
  const pre = process.argv[6] || 'vrfrace';
  const { browser, page } = await open({ width: 900, height: 844 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.route(`**/people/static/fx/${fxname}-plate.webp`, async r => { await new Promise(res => setTimeout(res, delay)); await r.fallback(); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(`/home/user/Picasso-Lab/people/${snip}.html`, 'utf8');
    await page.evaluate(([code]) => {
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe'); f.id = 'tile';
      f.style.cssText = 'width:266px;height:284px;border:0;display:block';
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, [code]);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    await page.waitForTimeout(500);
    await frame.evaluate(() => {
      window.__ctxs = [];
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...a) {
        const c = g.call(this, type, ...a);
        if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
        return c;
      };
    });
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const pb = await (await frame.$('#pfx')).boundingBox();
    const state = () => frame.evaluate(() => ({
      gl: document.querySelectorAll('.pfx-gl').length, flat: document.querySelectorAll('.pfx-2d').length,
      vis: document.querySelector('.pfx-photo').style.visibility,
      pressed: document.getElementById('pfx').getAttribute('aria-pressed'), cls: document.getElementById('pfx').className,
      live: window.__ctxs.filter(c => !c.isContextLost()).length,
      glOpac: [...document.querySelectorAll('.pfx-gl')].map(c => c.style.opacity).join(','),
    }));
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `review/vrf_race/${pre}_0idle.jpg`, type: 'jpeg', quality: 85, clip });
    const t0 = Date.now();
    await page.mouse.click(cx, cy);
    console.log('click1 (on) at', 0, JSON.stringify(await state()));
    for (const g of gaps) { await page.waitForTimeout(g); await page.mouse.click(cx, cy); console.log('click at', Date.now() - t0, JSON.stringify(await state())); }
    await page.waitForTimeout(delay + 2500);
    console.log('settled on:', JSON.stringify(await state()));
    await page.screenshot({ path: `review/vrf_race/${pre}_1on.jpg`, type: 'jpeg', quality: 85, clip });
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(2500);
    console.log('after off:', JSON.stringify(await state()));
    await page.screenshot({ path: `review/vrf_race/${pre}_2off.jpg`, type: 'jpeg', quality: 85, clip });
    // what's on top of the photo: probe via elementsFromPoint-ish -> list stage children
    console.log('stage children:', await frame.evaluate(() => [...document.querySelector('.pfx-stage').children].map(e => e.className + (e.style.opacity ? '[op=' + e.style.opacity + ']' : '')).join(' | ')));
    // control: fresh on/off now that textures are cached
    await page.waitForTimeout(400);
    await page.mouse.click(cx, cy); await page.waitForTimeout(2000);
    console.log('re-on:', JSON.stringify(await state()));
    await page.mouse.click(cx, cy); await page.waitForTimeout(2500);
    console.log('re-off:', JSON.stringify(await state()));
    await page.screenshot({ path: `review/vrf_race/${pre}_3reoff.jpg`, type: 'jpeg', quality: 85, clip });
    // simulate the browser evicting the oldest (orphan) context while the avatar is on again
    await page.waitForTimeout(400);
    await page.mouse.click(cx, cy); await page.waitForTimeout(2000);
    console.log('on again:', JSON.stringify(await state()));
    await page.screenshot({ path: `review/vrf_race/${pre}_4on.jpg`, type: 'jpeg', quality: 85, clip });
    const lost = await frame.evaluate(() => { const c = document.querySelector('.pfx-gl'); const gl = c.getContext('webgl2') || c.getContext('webgl'); gl.getExtension('WEBGL_lose_context').loseContext(); return 'lost orphan (first .pfx-gl)'; });
    await page.waitForTimeout(800);
    console.log(lost, '->', JSON.stringify(await state()));
    await page.screenshot({ path: `review/vrf_race/${pre}_5evict.jpg`, type: 'jpeg', quality: 85, clip });
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
