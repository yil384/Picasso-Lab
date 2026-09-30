// verify: official article open, type picasso, close with Esc, Back. arg: 'base' to serve base file
const { open } = require('../../harness');
const fs = require('fs');
const useBase = process.argv[2] === 'base';
const P = process.argv[3] || 'vfa';
(async () => {
  const { browser, ctx, page } = await open({ width: 1280, height: 800 });
  const logs = [];
  page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 200)); });
  if (useBase) await page.route('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', r => r.fulfill({ path: __dirname + '/base_blogs.html', headers: { 'Content-Type': 'text/html' } }));
  const state = () => page.evaluate(() => ({
    body: document.body.className,
    article: document.getElementById('article-view').classList.contains('active') ? document.getElementById('article-view').dataset.articleKey : null,
    blogView: JSON.stringify(blogView),
    navHash: (() => { try { return document.getElementById('picasso-nav-frame').contentWindow.location.hash; } catch (e) { return 'x'; } })(),
    histLen: history.length,
    hint: document.getElementById('blog-type-hint').classList.contains('show'),
    focus: document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)
  }));
  const settle = async (ms) => { await page.waitForTimeout(200); await page.waitForFunction(() => !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx, .egg-wipe, .blog-secret-transition.active'), null, { timeout: 20000 }).catch(() => console.log(' (settle timeout)')); await page.waitForTimeout(ms); };
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(1275, 5);
    console.log('start:', await state());
    await page.click('#blog-list .blog-card:nth-child(2)');
    await page.waitForTimeout(1200);
    console.log('article open:', await state());
    await page.keyboard.type('picasso', { delay: 30 });
    await page.waitForTimeout(150);
    console.log('typed (150ms):', await state());
    await page.screenshot({ path: `shots/${P}_typed.jpg`, type: 'jpeg', quality: 55 });
    await settle(3000);
    console.log('typed settled:', await state());
    await page.keyboard.press('Escape');
    await settle(500);
    console.log('closed:', await state());
    await page.screenshot({ path: `shots/${P}_closed.jpg`, type: 'jpeg', quality: 55 });
    await page.goBack().catch(e => console.log('goBack', e.message.slice(0, 80)));
    await page.waitForTimeout(300);
    await settle(1500);
    console.log('after Back:', await state());
    await page.screenshot({ path: `shots/${P}_back.jpg`, type: 'jpeg', quality: 55 });
    await page.goBack().catch(e => console.log('goBack2', e.message.slice(0, 80)));
    await page.waitForTimeout(300);
    await settle(1500);
    console.log('after Back2:', await state());
  } finally { console.log(logs.slice(0, 20)); await browser.close(); }
})();
