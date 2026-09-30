// regression fuzz: random picasso / leak / Escape / Back / Forward sequences with the real clock;
// at the end the page, blogView and the nav frame's entry must agree. FILE=... serves another blogs.html
const { open } = require('../harness');
const { state } = require('../review/rv_common');
const seed0 = +(process.argv[2] || 1), runs = +(process.argv[3] || 10);
function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
(async () => {
  let bad = 0;
  for (let k = 0; k < runs; k++) {
    const R = rng(seed0 * 1000 + k + 7);
    const { browser, page } = await open({ width: 1280, height: 800 });
    const logs = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader|GPU stall/i.test(m.text())) logs.push(m.text().slice(0, 160)); });
    page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
    if (process.env.FILE) await page.route('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', r => r.fulfill({ path: process.env.FILE, headers: { 'Content-Type': 'text/html' } }));
    const seq = [];
    try {
      await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
      await page.waitForTimeout(700); await page.mouse.move(1275, 5);
      await page.keyboard.press('x'); await page.waitForTimeout(2000);
      for (let i = 0; i < 7; i++) {
        const r = R();
        let act;
        if (r < 0.34) { act = 'picasso'; await page.keyboard.type('picasso', { delay: 0 }); }
        else if (r < 0.5) {
          act = 'card';
          const sel = await page.evaluate(() => document.body.classList.contains('true-blogs') ? '#blog-list .blog-card[data-fake-index="1"]' : '#blog-list .blog-card:nth-child(2)');
          const el = await page.$(sel);
          const open = await page.evaluate(() => document.getElementById('article-view').classList.contains('active'));
          if (el && !open) { await el.click({ timeout: 1000, force: true }).catch(() => {}); } else act = 'card(skip)';
        }
        else if (r < 0.62) { act = 'esc'; await page.keyboard.press('Escape'); }
        else if (r < 0.85) { act = 'back'; await page.evaluate(() => history.back()); }
        else { act = 'fwd'; await page.evaluate(() => history.forward()); }
        const d = Math.round(R() * R() * 1600);
        seq.push(act + '+' + d);
        await page.waitForTimeout(d);
      }
      await page.waitForTimeout(200);
      await page.waitForFunction(() => !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx, .egg-wipe'), null, { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(3500);
      const s = await state(page);
      const bv = JSON.parse(s.blogView);
      const nav = decodeURIComponent(s.navHash);
      const artNav = /[&#]a=/.test(nav) ? 'official' : /[&#]f=/.test(nav) ? 'fake' : null;
      const ok = s.body.includes('true-blogs') === bv.trueBlogs && nav.includes('t=1') === bv.trueBlogs && s.fx === 0 && !/transitioning|hold/.test(s.body)
        && (!!s.article) === (!!bv.article) && (bv.article?.kind || null) === artNav && s.body.includes('article-open') === !!s.article;
      if (!ok) bad++;
      console.log((ok ? 'OK  ' : 'BAD ') + seq.join(' '), JSON.stringify({ body: s.body, art: s.article && s.article.slice(0, 12), bv: s.blogView.slice(0, 60), nav: nav.slice(0, 40) }), logs.length ? logs.slice(0, 3) : '');
    } catch (e) { console.log('ERR', seq.join(' '), e.message.slice(0, 120)); }
    finally { await browser.close(); }
  }
  console.log('bad', bad, 'of', runs);
})();
