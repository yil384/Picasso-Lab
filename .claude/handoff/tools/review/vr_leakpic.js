// Sites-like embed: host -> sandboxed cross-origin frame -> about:blank frame with document.write(blogs.html)
const { open } = require('../harness');
const fs = require('fs');
(async () => {
  const W = 1280, H = 800;
  const { browser, page } = await open({ width: W, height: H });
  const logs = [];
  page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 250)); });
  const code = fs.readFileSync('/home/user/Picasso-Lab/blogs/blogs.html', 'utf8');
  await page.route('https://host.vrtest/**', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><body style="margin:0"><iframe id="outer" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox" src="https://embed.vrtest/inner.html" style="width:${W}px;height:${H}px;border:0"></iframe></body>` }));
  await page.route('https://embed.vrtest/**', r => r.fulfill({ contentType: 'text/html', body: `<!doctype html><body style="margin:0"><script>
    const f = document.createElement('iframe'); f.id='userHtmlFrame'; f.style.cssText='width:100vw;height:100vh;border:0;display:block';
    document.body.appendChild(f);
    window.__code = null;
    window.addEventListener('message', e => { if (e.data && e.data.code) { f.contentDocument.open(); f.contentDocument.write(e.data.code); f.contentDocument.close(); } });
  </script></body>` }));
  try {
    await page.goto('https://host.vrtest/', { waitUntil: 'load' });
    const outer = page.frames().find(fr => fr.url().startsWith('https://embed.vrtest'));
    await outer.evaluate(code => window.postMessage({ code }, '*'), code);
    await page.waitForTimeout(2500);
    const fr = page.frames().find(f => f.parentFrame() === outer && f.name() !== 'picasso-nav-frame' && f.url() === 'about:blank');
    const state = () => fr.evaluate(() => ({
      body: document.body.className, h1: document.querySelector('.blog-hero h1').textContent,
      article: document.getElementById('article-view').classList.contains('active') ? document.getElementById('article-view').dataset.articleKey : null,
      blogView: JSON.stringify(blogView), desired: desiredTrueBlogs,
      navHash: (() => { try { return document.getElementById('picasso-nav-frame').contentWindow.location.hash; } catch (e) { return 'x-origin'; } })(),
      histLen: history.length, focus: document.activeElement && (document.activeElement.className || document.activeElement.tagName)
    }));
    console.log('loaded:', await state());
    await page.mouse.move(W - 20, 300);
    await page.mouse.click(W - 20, 300);
    await fr.evaluate(() => { window.__eggClock = () => 99; });
    await page.keyboard.type('picasso', { delay: 30 });
    await page.waitForTimeout(2500);
    console.log('after egg:', await state());
    const card = await fr.$('#blog-list .blog-card[data-fake-index="1"]');
    await card.click();
    await page.waitForTimeout(1000);
    console.log('leak open:', await state());
    await page.screenshot({ path: 'shots/vrlp_leak.jpg', type: 'jpeg', quality: 60 });
    await fr.evaluate(() => {
      const t0 = performance.now(); window.__seq = [];
      const snap = (why) => window.__seq.push(Math.round(performance.now() - t0) + 'ms ' + why + ' | body=' + document.body.className + ' | h1=' + document.querySelector('.blog-hero h1').textContent + ' | article=' + document.getElementById('article-view').classList.contains('active') + ' | fx=' + !!document.querySelector('.egg-fx,.egg-wipe'));
      new MutationObserver(() => snap('mut')).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('message', e => { if (e.data && 'picassoNav' in e.data) snap('nav "' + e.data.picassoNav + '"'); });
    });
    await page.keyboard.type('picasso', { delay: 30 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: 'shots/vrlp_mid.jpg', type: 'jpeg', quality: 60 });
    await page.waitForTimeout(3000);
    console.log((await fr.evaluate(() => window.__seq)).join('\n'));
    console.log('final:', await state());
    await page.screenshot({ path: 'shots/vrlp_final.jpg', type: 'jpeg', quality: 60 });
  } finally { console.log(logs.slice(0, 20)); await browser.close(); }
})();
