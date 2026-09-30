const { open } = require('../harness'); const fs = require('fs');
(async () => {
  const { browser, page } = await open({ width: 900, height: 844, dsf: 2 });
  try {
    await page.route('**/people/fx/chang.js', r => r.fulfill({ body: fs.readFileSync(__dirname + '/chang_clip.js', 'utf8'), headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' } }));
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync('/home/user/Picasso-Lab/people/chang_top_scorer.html', 'utf8');
    await page.evaluate((code) => { document.body.style.cssText = 'margin:0;background:#fff;padding:20px'; const f = document.createElement('iframe'); f.id = 'tile'; f.style.cssText = 'width:266px;height:284px;border:1px dashed #ccc;display:block'; document.body.appendChild(f); f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close(); }, code);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    await page.waitForTimeout(500);
    const box = await (await page.$('#tile')).boundingBox(); const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
    const pb = await (await frame.$('#pfx')).boundingBox(); const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    await page.screenshot({ path: __dirname + '/shots/cclip_hov.jpg', type: 'jpeg', quality: 95, clip });
    await frame.evaluate(() => { window.__pfxClock = () => 0; });
    await page.mouse.click(cx, cy);
    await frame.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy); await page.waitForTimeout(700);
    await page.screenshot({ path: __dirname + '/shots/cclip_t000.jpg', type: 'jpeg', quality: 95, clip });
  } finally { await browser.close(); }
})();
