// no three.js (CDN blocked): wipe fallback, with Back / re-trigger at various offsets
const { open } = require('../harness');
const { state, settle } = require('../review/rv_common');
async function run(name, fn) {
  const { browser, ctx, page } = await open({ width: 1280, height: 800 });
  const logs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text().slice(0, 200)); });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three/, r => r.abort());
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(700); await page.mouse.move(1275, 5);
    await page.keyboard.press('x'); await page.waitForTimeout(1500);
    await fn(page);
    await settle(page, 1200);
    const s = await state(page);
    const bv = JSON.parse(s.blogView);
    const ok = s.body.includes('true-blogs') === bv.trueBlogs && s.navHash.includes('t=1') === bv.trueBlogs && s.fx === 0 && !/transitioning|hold/.test(s.body);
    console.log(ok ? 'OK ' : 'BAD', name, JSON.stringify({ body: s.body, bv: s.blogView, nav: s.navHash, fx: s.fx }), logs.filter(l => !/Failed to load resource|net::ERR|GL Driver|swiftshader/.test(l)).slice(0, 3));
  } finally { await browser.close(); }
}
(async () => {
  for (const ms of [0, 100, 250, 450, 700]) {
    await run('wipe: picasso, Back after ' + ms, async p => { await p.keyboard.type('picasso', { delay: 0 }); await p.waitForTimeout(ms); await p.evaluate(() => history.back()); });
    await run('wipe: picasso, picasso after ' + ms, async p => { await p.keyboard.type('picasso', { delay: 0 }); await p.waitForTimeout(ms); await p.keyboard.type('picasso', { delay: 0 }); });
  }
})();
