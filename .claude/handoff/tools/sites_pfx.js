const { open, gotoSites } = require('./harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const { browser, page } = await open({ width: W, height: H, swaps: { 'people/static/yue.webp': '/home/user/Picasso-Lab/people/alon_iron_man.html' } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|play\.google|Failed to load resource|allow-scripts|CORS policy: Response to preflight/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
    let fr = null;
    for (let i = 0; i < 60 && !fr; i++) { await page.waitForTimeout(500); for (const f of page.frames()) { try { if (await f.$('#pfx[data-fx="alon"]')) fr = f; } catch (_) {} } }
    if (!fr) throw new Error('swapped embed not found');
    const el = await fr.$('#pfx');
    // scroll the outermost iframe of this embed into view (the snippet frame sits inside Google's frame)
    let top = fr; while (top.parentFrame() && top.parentFrame() !== page.mainFrame()) top = top.parentFrame();
    const host = await top.frameElement();
    await host.evaluate(n => n.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(1500);
    const b = await el.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(3000);
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(4500);
    const st = await fr.evaluate(() => [!!document.querySelector('.pfx-gl'), !!document.querySelector('.pfx-2d'), document.getElementById('pfx').className, location.href, screen.width]);
    console.log('state:', JSON.stringify(st));
    await page.screenshot({ path: `shots/${pre}.jpg`, type: 'jpeg', quality: 70, clip: { x: Math.max(0, b.x - 60), y: Math.max(0, b.y - 60), width: 360, height: 360 } });
  } finally { console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1)); await browser.close(); }
})();
