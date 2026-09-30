// shared setup for the kit review tests
const { open } = require('../harness');
const fs = require('fs');
async function setup({ snip = 'zhuo_gold_medal', phone = false, dsf = 1, reduced = false, code = null, before = null, tw = 0, th = 0 } = {}) {
  const TW = tw || (phone ? 257 : 266), TH = th || (phone ? 274 : 284);
  const { browser, ctx, page } = await open({ width: phone ? 390 : 900, height: 844, dsf });
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  if (before) await before(page, ctx);
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
  code = code || fs.readFileSync(`/home/user/Picasso-Lab/people/${snip}.html`, 'utf8');
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
  await page.waitForTimeout(500);
  const box = await (await page.$('#tile')).boundingBox();
  const clip = { x: box.x, y: box.y, width: box.width, height: box.height };
  const pb = await (await frame.$('#pfx')).boundingBox();
  const state = () => frame.evaluate(() => ({
    gl: document.querySelectorAll('.pfx-gl').length,
    flat: document.querySelectorAll('.pfx-2d').length,
    vis: document.querySelector('.pfx-photo').style.visibility,
    pressed: document.getElementById('pfx').getAttribute('aria-pressed'),
    cls: document.getElementById('pfx').className,
  }));
  return { browser, ctx, page, frame, pb, clip, errs, state };
}
module.exports = { setup };
