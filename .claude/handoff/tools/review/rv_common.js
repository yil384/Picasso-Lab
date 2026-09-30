const { open } = require('../harness');
async function setup(W = 1280, H = 800, extra = {}) {
  const { browser, ctx, page } = await open({ width: W, height: H, ...extra });
  const logs = [];
  page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 250)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
  await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.mouse.move(W - 5, 5);
  return { browser, ctx, page, logs };
}
const state = (page) => page.evaluate(() => ({
  body: document.body.className,
  fx: document.querySelectorAll('.egg-fx, .egg-wipe').length,
  h1: document.querySelector('.blog-hero h1').textContent,
  article: document.getElementById('article-view').classList.contains('active') ? document.getElementById('article-view').dataset.articleKey : null,
  blogView: JSON.stringify(blogView),
  desired: desiredTrueBlogs, target: blogTransitionTarget, token: blogTransitionToken,
  navHash: (() => { try { return document.getElementById('picasso-nav-frame').contentWindow.location.hash; } catch (e) { return 'x-origin'; } })(),
  histLen: history.length,
  focus: document.activeElement && (document.activeElement.id || document.activeElement.className || document.activeElement.tagName)
}));
const settle = async (page, ms = 3000) => {
  await page.waitForTimeout(200);
  await page.waitForFunction(() => !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx, .egg-wipe'), null, { timeout: 20000 }).catch(() => console.log('  (settle timeout)'));
  await page.waitForTimeout(ms);
};
module.exports = { setup, state, settle };
