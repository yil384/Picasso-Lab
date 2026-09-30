// one real-clock run inside the live Sites page: in film, leak open, picasso inside the leak (#1), forward/back, out film
const { open, gotoSites } = require('../harness');
(async () => {
  const [W, H, pre] = [+process.argv[2], +process.argv[3], process.argv[4]];
  const mobile = W < 800;
  const { browser, page } = await open({ width: W, height: H, swaps: { 'Blog – Picasso Lab': '/home/user/Picasso-Lab/blogs/blogs.html' } });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall|play\.google|gstatic|CORS|Failed to load resource|allow-scripts|Automatic fallback/i.test(m.text())) errs.push(m.location()?.url?.slice(0, 60) + ' ' + m.text().slice(0, 200)); });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/blogs');
    let fr = null;
    for (let i = 0; i < 80 && !fr; i++) { await page.waitForTimeout(500); fr = page.frames().find(f => { try { return f.url() === 'about:blank' && f.parentFrame(); } catch (_) { return false; } }); if (fr && !(await fr.$('.blog-hero').catch(() => null))) fr = null; }
    if (!fr) throw new Error('embed not found');
    await page.waitForTimeout(2500);
    const st = () => fr.evaluate(() => ({ body: document.body.className, h1: document.querySelector('.blog-hero h1').textContent, fx: !!document.querySelector('.egg-fx,.egg-wipe'), art: document.getElementById('article-view').dataset.articleKey || null, nav: (() => { try { return decodeURIComponent(document.getElementById('picasso-nav-frame').contentWindow.location.hash); } catch (_) { return 'x'; } })(), bv: JSON.stringify(blogView), vp: eggViewport(), canv: [...document.querySelectorAll('.egg-fx canvas')].map(c => [c.width, c.height]) }));
    const settle = async (ms = 800) => { await page.waitForTimeout(250); await fr.waitForFunction(() => !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx, .egg-wipe'), null, { timeout: 20000 }).catch(() => console.log('(settle timeout)')); await page.waitForTimeout(ms); };
    const hero = await fr.$('.blog-hero'); const box = await hero.boundingBox();
    const trigger = async () => {
      if (mobile) { for (let i = 0; i < 3; i++) { await page.touchscreen.tap(box.x + box.width * 0.5, box.y + Math.min(60, box.height * 0.5)); await page.waitForTimeout(120); } }
      else { await page.mouse.click(box.x + box.width - 20, box.y + 30); await page.keyboard.type('picasso', { delay: 50 }); }
    };
    await trigger();
    await page.waitForTimeout(500);
    console.log('in +500ms', JSON.stringify(await st()));
    await page.screenshot({ path: `shots/${pre}_in500.jpg`, type: 'jpeg', quality: 60 });
    await settle();
    console.log('in done  ', JSON.stringify(await st()));
    await page.screenshot({ path: `shots/${pre}_egg.jpg`, type: 'jpeg', quality: 60 });
    const card = await fr.$('#blog-list .blog-card[data-fake-index="2"]');
    await card.scrollIntoViewIfNeeded(); const cb = await card.boundingBox();
    if (mobile) await page.touchscreen.tap(cb.x + cb.width / 2, cb.y + 40); else await page.mouse.click(cb.x + cb.width / 2, cb.y + 40);
    await page.waitForTimeout(1500);
    console.log('leak open', JSON.stringify(await st()));
    await page.screenshot({ path: `shots/${pre}_leak.jpg`, type: 'jpeg', quality: 60 });
    if (mobile) { await fr.evaluate(() => requestBlogReturn()); }             // phones: the hero is under the viewer; same call as the triple tap
    else await page.keyboard.type('picasso', { delay: 50 });
    await page.waitForTimeout(450);
    console.log('#1 +450  ', JSON.stringify(await st()));
    await page.screenshot({ path: `shots/${pre}_ret450.jpg`, type: 'jpeg', quality: 60 });
    await settle();
    console.log('#1 done  ', JSON.stringify(await st()));
    await page.screenshot({ path: `shots/${pre}_ret.jpg`, type: 'jpeg', quality: 60 });
    await fr.evaluate(() => history.forward()); await settle();
    console.log('forward  ', JSON.stringify(await st()));
    await fr.evaluate(() => history.forward()); await settle();
    console.log('forward2 ', JSON.stringify(await st()));
    await fr.evaluate(() => history.back()); await settle();
    console.log('back     ', JSON.stringify(await st()));
    await fr.evaluate(() => history.back()); await settle();
    console.log('back2    ', JSON.stringify(await st()));
    await page.screenshot({ path: `shots/${pre}_final.jpg`, type: 'jpeg', quality: 60 });
  } finally { console.log('console:', errs.slice(0, 8)); await browser.close(); }
})();
