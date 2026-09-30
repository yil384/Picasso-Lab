// Minimal emulation of Google Sites' inner-frame: document.write('<base ...>' + userHtml) into about:blank iframe.
// usage: node review/vq_quirks.js W H prefix mode(quirks|std) [inTimes] [outTimes]
const { open } = require('../harness');
const fs = require('fs');
(async () => {
  const [W, H, pre, mode] = [+process.argv[2], +process.argv[3], process.argv[4], process.argv[5] || 'quirks'];
  const tin = (process.argv[6] || '0,0.1,0.5,1.4').split(',').map(Number);
  const tout = (process.argv[7] || '0,0.3,0.7,1.0').split(',').map(Number);
  const mobile = W < 800;
  const { browser, page } = await open({ width: W, height: H });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|ReadPixels/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  const user = fs.readFileSync(process.env.SRC || '/home/user/Picasso-Lab/blogs/blogs.html', 'utf8');
  const OUTER = 'https://2092248872-atari-embeds.googleusercontent.com/embeds/x/inner-frame-minified.html';
  await page.route(OUTER, r => r.fulfill({ contentType: 'text/html', body: `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body,html,iframe{margin:0;padding:0;height:100%;width:100%;overflow:hidden}</style></head>
<body><iframe id='userHtmlFrame' frameborder='0' scrolling='yes'></iframe>
<script>
  const userHtml = ${JSON.stringify(user).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029")};
  const frame = document.getElementById('userHtmlFrame');
  frame.contentWindow.document.open();
  const content = ${mode === 'std' ? "'<!DOCTYPE html>' + " : ''}'<base href="' + window.location.href + '" target="_blank">' + userHtml;
  frame.contentWindow.document.write(content);
  frame.contentWindow.document.close();
</script></body></html>` }));
  try {
    await page.goto(OUTER, { waitUntil: 'load' });
    let fr = null;
    for (let i = 0; i < 40 && !fr; i++) { await page.waitForTimeout(250); fr = page.frames().find(f => f !== page.mainFrame() && f.url() === 'about:blank'); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
    if (!fr) throw new Error('no frame');
    await page.waitForTimeout(1500);
    const info = await fr.evaluate(() => ({ compat: document.compatMode, doctype: !!document.doctype, deCW: document.documentElement.clientWidth, deCH: document.documentElement.clientHeight, bodyCH: document.body.clientHeight, iw: innerWidth, ih: innerHeight, vp: eggViewport(), scrollH: document.scrollingElement.scrollHeight, dpr: devicePixelRatio }));
    console.log('info', JSON.stringify(info));
    await fr.evaluate(() => { window.__eggT = 0; window.__eggClock = () => window.__eggT; });
    const hero = await fr.$('.blog-hero'); const box = await hero.boundingBox();
    const trigger = async () => {
      if (mobile) { for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width * 0.5, box.y + Math.min(60, box.height * 0.5)); await page.waitForTimeout(120); } }
      else { await page.mouse.click(box.x + box.width - 20, box.y + box.height - 10); await page.keyboard.type('picasso', { delay: 40 }); }
    };
    const film = async (label, arr) => {
      await fr.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
      console.log(label, 'canvases', JSON.stringify(await fr.evaluate(() => { const L = document.querySelector('.egg-fx').getBoundingClientRect(); return { layer: [L.width, L.height], vp: eggViewport(), c: [...document.querySelectorAll('.egg-fx canvas')].map(c => [c.width, c.height, Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)]) }; })));
      for (const tt of arr) {
        await fr.evaluate(t => { window.__eggT = t; }, tt);
        await fr.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.screenshot({ path: `review/vq/${pre}_${label}_${String(Math.round(tt * 100)).padStart(3, '0')}.jpg`, type: 'jpeg', quality: 62 });
      }
      await fr.evaluate(() => { window.__eggT = 99; });
      await fr.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
      await page.waitForTimeout(400);
    };
    await trigger();
    await film('in', tin);
    await page.screenshot({ path: `review/vq/${pre}_landed.jpg`, type: 'jpeg', quality: 62 });
    console.log('after in', JSON.stringify(await fr.evaluate(() => [document.body.className, document.documentElement.clientHeight, innerHeight, eggViewport()])));
    await fr.evaluate(() => { window.__eggT = 0; });
    if (mobile) { const b2 = await (await fr.$('.blog-hero')).boundingBox(); for (let i = 0; i < 3; i++) { await page.touchscreen.tap(b2.x + b2.width * 0.5, b2.y + 40); await page.waitForTimeout(120); } }
    else await page.keyboard.type('picasso', { delay: 40 });
    await film('out', tout);
    await page.screenshot({ path: `review/vq/${pre}_back.jpg`, type: 'jpeg', quality: 62 });
    console.log('final', JSON.stringify(await fr.evaluate(() => [document.body.className, !!document.querySelector('.egg-fx')])));
  } finally {
    console.log('console:', errs.slice(0, 8));
    await browser.close();
  }
})();
