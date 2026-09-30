// verifier: measure the tilt left at the exit swap and at the next activation's first frame,
// by rendering the same frame twice (as-is, and with the tilt zeroed) inside the kit's own teardown/render.
const { setup } = require('../kitrev/common');
const fs = require('fs');
const OUT = __dirname;
(async () => {
  const [snip = 'zhuo_gold_medal', pre = 'vt', dx = '80', dy = '-50', mode = 'click'] = process.argv.slice(2);
  const { browser, page, frame, pb, clip, errs, state } = await setup({ snip, dsf: 2 });
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    await frame.evaluate(async () => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const a = (await m.attach(document.getElementById('pfx'))).avatar;
      window.__A = a; window.__cap = [];
      const grab = (label) => {
        const c = a.gl.canvas;
        return { label, url: c.toDataURL('image/png'), tilt: { ...a.tilt }, t: a.t, e: a.e };
      };
      const both = (tag) => {
        const keep = { ...a.tilt };
        const x = grab(tag + '_asis');
        Object.assign(a.tilt, { x: 0, y: 0, vx: 0, vy: 0 });
        a.render(0);
        const z = grab(tag + '_zero');
        Object.assign(a.tilt, keep);
        a.render(0);
        window.__cap.push(x, z);
      };
      const td = a.teardown.bind(a);
      a.teardown = function () { if (this.gl && !this.on && this.e >= 1) both('exit'); return td(); };
      const rd = a.render.bind(a);
      let n = 0;
      a.render = function (dt) {
        const r = rd(dt);
        if (dt === 0 && this.t === 0 && this.on && this.gl && !this.raf && !this.__inBoth) { this.__inBoth = true; n++; both('first' + n); this.__inBoth = false; }
        return r;
      };
    });
    const ox = cx + Number(dx), oy = cy + Number(dy);
    await page.mouse.move(ox, oy, { steps: 5 });
    await page.mouse.click(ox, oy);                      // on, off-centre
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(2500);
    if (mode === 'key') {
      await page.mouse.move(clip.x + clip.width - 2, clip.y + 2, { steps: 5 });
      await page.waitForTimeout(1200);
      await frame.focus('#pfx');
      await page.keyboard.press('Enter');
    } else {
      await page.mouse.click(ox, oy);                    // off, same place
    }
    await page.waitForTimeout(1500);
    console.log('after off:', JSON.stringify(await state()));
    console.log('tilt now:', JSON.stringify(await frame.evaluate(() => window.__A.tilt)));
    if (mode === 'key') { await frame.focus('#pfx'); await page.keyboard.press('Enter'); }
    else await page.mouse.click(ox, oy);                 // on again
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.waitForTimeout(500);
    const caps = await frame.evaluate(() => window.__cap);
    for (const c of caps) {
      fs.writeFileSync(`${OUT}/${pre}_${c.label}.png`, Buffer.from(c.url.split(',')[1], 'base64'));
      console.log(c.label, 't', c.t.toFixed(3), 'e', c.e.toFixed(3), 'tilt', JSON.stringify(Object.fromEntries(Object.entries(c.tilt).map(([k, v]) => [k, +v.toFixed(3)]))));
    }
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8)));
    await browser.close();
  }
})();
