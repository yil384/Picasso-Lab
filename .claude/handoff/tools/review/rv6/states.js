// usage: node review/rv6/states.js <snippet> <prefix> <phone> "t:e,t:e,..." — holds the effect at each (t, e) while on
const { open } = require('../../harness');
const fs = require('fs');
const OUT = __dirname + '/out';
const DSF = +(process.env.DSF || 2);
(async () => {
  const [snip, pre, phone = '0', list] = process.argv.slice(2);
  const pairs = list.split(',').map(s => s.split(':').map(Number));
  const isPhone = phone === '1';
  const TW = isPhone ? 257 : 266, TH = isPhone ? 274 : 284;
  const { browser, page } = await open({ width: isPhone ? 390 : 900, height: 844, dsf: DSF });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|WebGL-/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
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
    const box = await (await page.$('#tile')).boundingBox();
    const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const pb = await (await frame.$('#pfx')).boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await frame.evaluate(() => { window.__pfxT = 0; window.__pfxE = 0; window.__pfxClock = () => window.__pfxT; window.__pfxExit = () => window.__pfxE; });
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${pre}_hov.png`, clip });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(700);
    for (const [t, e] of pairs) {
      await frame.evaluate(([t, e]) => { window.__pfxT = t; window.__pfxE = e; }, [t, e]);
      await frame.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: `${OUT}/${pre}_t${Math.round(t * 1000)}_e${Math.round(e * 100)}.png`, clip });
    }
    console.log(JSON.stringify({ errs }));
  } finally { await browser.close(); }
})();
