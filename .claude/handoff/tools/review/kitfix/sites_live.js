// live Team page with Yue's embed swapped for the working-tree snippet: fit, effect, t = 0 vs photo, exit
// usage: node sites_live.js <vw> <vh> <sw> <sh> <mobile 0|1> <prefix> [dsf]
const { open, gotoSites } = require('../kitrev/harness2');
(async () => {
  const [vw, vh, sw, sh, mob, pre, dsf = '0'] = process.argv.slice(2);
  const { browser, page } = await open({ width: +vw, height: +vh, screen: { width: +sw, height: +sh }, mobileDev: mob === '1', dsf: +dsf || null, swaps: { 'people/static/yue.webp': '/home/user/Picasso-Lab/people/yue_baseball.html' } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|play\.google|Failed to load resource|allow-scripts|CORS policy|preload/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
    let fr = null;
    for (let i = 0; i < 80 && !fr; i++) { await page.waitForTimeout(500); for (const f of page.frames()) { try { if (await f.$('#pfx[data-fx="yue"]')) fr = f; } catch (_) {} } }
    if (!fr) throw new Error('swapped embed not found');
    let top = fr; while (top.parentFrame() && top.parentFrame() !== page.mainFrame()) top = top.parentFrame();
    const host = await top.frameElement();
    await host.evaluate(n => n.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    const hb = await host.boundingBox();
    const pb = await (await fr.$('#pfx')).boundingBox();
    const inner = await fr.evaluate(() => ({ cls: document.getElementById('pfx').className, vw: innerWidth, vh: innerHeight, compat: document.compatMode }));
    const inside = pb.x >= hb.x - 0.5 && pb.y >= hb.y - 0.5 && pb.x + pb.width <= hb.x + hb.width + 0.5 && pb.y + pb.height <= hb.y + hb.height + 0.5;
    console.log(pre, JSON.stringify({ host: [hb.x, hb.y, hb.width, hb.height].map(v => +v.toFixed(1)), photo: [pb.x - hb.x, pb.y - hb.y, pb.width].map(v => +v.toFixed(1)), inside, inner }));
    const clip = { x: hb.x, y: hb.y, width: hb.width, height: hb.height };
    await fr.evaluate(() => { window.__pfxT = 0; window.__pfxClock = () => window.__pfxT; });
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(3000);
    await page.screenshot({ path: `shots/${pre}_hov.jpg`, type: 'jpeg', quality: 95, clip });
    await page.mouse.click(cx, cy);
    await fr.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 30000 });
    await page.mouse.move(cx, cy); await page.waitForTimeout(800);
    await page.screenshot({ path: `shots/${pre}_t000.jpg`, type: 'jpeg', quality: 95, clip });
    await fr.evaluate(() => { window.__pfxT = 3.1; }); await page.waitForTimeout(400);
    await page.screenshot({ path: `shots/${pre}_t310.jpg`, type: 'jpeg', quality: 85, clip });
    console.log(pre, 'k.s', await fr.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js').then(m => m.attach(document.getElementById('pfx'))).then(c => c.avatar.k.s)));
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500);
    await page.screenshot({ path: `shots/${pre}_zoff.jpg`, type: 'jpeg', quality: 95, clip });
    console.log(pre, 'after off', JSON.stringify(await fr.evaluate(() => [document.querySelectorAll('.pfx-gl').length, document.querySelector('.pfx-photo').style.visibility, document.getElementById('pfx').getAttribute('aria-pressed')])));
  } finally { console.log(pre, 'console:', JSON.stringify(errs.slice(0, 8))); await browser.close(); }
})();
