// Native-text versions of the embed pages, for search engines.
//
// Publications, Projects, Events and Teaching on yufeiding.ucsd.edu are whole-page Google Sites embeds: Google indexes
// the page, but none of its text (the pasted code sits in a data-code attribute; it renders in a sandboxed
// googleusercontent frame). This script renders each page from this checkout in headless Chromium, reads what a visitor
// sees (papers, project cards, news, courses) and writes seo/sites-text.html - one copy button per page, to paste into a
// native text box on a hidden "text version" subpage in Sites - plus seo/sites-text.json, a fingerprint of each section
// with the date it last changed, so the sheet can say which pages need a re-paste.
//
//   NODE_PATH=$(npm root -g) node seo/sites_text.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REPO = path.resolve(__dirname, '..'), OUT = __dirname, SITE = 'https://yufeiding.ucsd.edu';
const CHROME = (() => { try { const d = fs.readdirSync('/opt/pw-browsers').filter((n) => /^chromium-\d+$/.test(n)).sort().pop(); return d && path.join('/opt/pw-browsers', d, 'chrome-linux/chrome'); } catch (e) { return undefined; } })();

// each page: the embed file, the Sites page it lives on, the hidden subpage to create, and how to read it
const PAGES = [
  { key: 'publications', file: 'pub/pub.html', live: '/publications', sub: 'list', name: 'Publication List',
    intro: 'Publications of Picasso Lab at UC San Diego, led by Prof. Yufei Ding: machine learning systems, LLM inference, GPU kernels, compilers, computer architecture and quantum computing.' },
  { key: 'projects', file: 'projects/projects.html', live: '/projects', sub: 'overview', name: 'Project Overview',
    intro: 'Projects and live demos from Picasso Lab at UC San Diego (Prof. Yufei Ding).' },
  { key: 'events', file: 'events/events.html', live: '/events', sub: 'news', name: 'Lab News',
    intro: 'News and events from Picasso Lab at UC San Diego (Prof. Yufei Ding): awards, papers, new members and lab life.' },
  { key: 'teaching', file: 'teaching/teaching.html', live: '/teaching', sub: 'courses', name: 'Course List',
    intro: 'Courses taught by Prof. Yufei Ding at UC San Diego.' },
];

// runs inside the rendered page: returns [{h: heading} | {title, meta, text, links:[[label, href]], tags}]
function extract(key) {
  const T = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const links = (root) => [...root.querySelectorAll('a[href^="http"]')].map((a) => [T(a) || a.href, a.href])
    .filter(([l]) => !/^try typing/i.test(l));
  const out = [];
  if (key === 'publications') {
    document.querySelectorAll('h1.section-title, .paper').forEach((el) => {
      if (el.matches('h1')) { out.push({ h: T(el) }); return; }
      const p = el.querySelector('p'); if (!p) return;
      const venue = T(p.querySelector('b')), title = T(p.querySelector('i')).replace(/\.$/, '');
      let rest = p.cloneNode(true); rest.querySelectorAll('b, i, a').forEach((n) => n.remove());
      const authors = T(rest).replace(/\[\s*\]/g, '').replace(/\s*\.\s*$/, '').replace(/^\W+/, '');
      out.push({ title: title || venue, meta: venue, text: authors, links: links(p) });
    });
  } else if (key === 'projects') {
    document.querySelectorAll('.project-card').forEach((c) => out.push({
      title: T(c.querySelector('.card-name')), meta: T(c.querySelector('.card-category')), text: T(c.querySelector('.card-desc')),
      tags: [...c.querySelectorAll('.card-tags > *')].map(T).filter(Boolean), links: links(c) }));
  } else if (key === 'events') {
    document.querySelectorAll('.event-content').forEach((c) => out.push({
      title: T(c.querySelector('.event-title')), meta: T(c.querySelector('.event-date')), text: T(c.querySelector('.event-text')), links: links(c) }));
  } else if (key === 'teaching') {
    document.querySelectorAll('.course-card').forEach((c) => {
      const lines = c.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
      const title = T(c.querySelector('.course-title')), kicker = T(c.querySelector('.course-kicker'));
      const body = lines.filter((l) => l !== title && l.toLowerCase() !== kicker.toLowerCase() && !/^(course page|official page|website tbd)$/i.test(l));
      // label / value rows (INSTRUCTOR, EMAIL, TIME, LOCATION) read as "Label: value"
      const txt = []; for (let i = 0; i < body.length; i++) {
        if (/^[A-Z ]{3,}$/.test(body[i]) && body[i + 1] && /^(INSTRUCTOR|EMAIL|TIME|LOCATION)$/.test(body[i])) { txt.push(body[i][0] + body[i].slice(1).toLowerCase() + ': ' + body[i + 1]); i++; }
        else txt.push(body[i]);
      }
      out.push({ title, meta: kicker, text: txt.join(' · '), links: links(c) });
    });
  }
  // no emoji on the site: the award marker becomes words
  const clean = (v) => typeof v === 'string' ? v.replace(/\u{1F3C6}\s*/gu, 'Award: ').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?\s*/gu, '').trim() : v;
  out.forEach((o) => { for (const k of ['h', 'title', 'meta', 'text']) if (o[k]) o[k] = clean(o[k]); });
  return out;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toHtml(pg, items) {
  let h = `<h2>${esc(pg.name)} - Picasso Lab, UC San Diego</h2><p>${esc(pg.intro)} Interactive version: <a href="${SITE}${pg.live}">${SITE}${pg.live}</a></p>`;
  for (const it of items) {
    if (it.h) { h += `<h3>${esc(it.h)}</h3>`; continue; }
    const lk = (it.links || []).map(([l, u]) => `<a href="${esc(u)}">${esc(l.replace(/^\[|\]$/g, ''))}</a>`).join(' · ');
    h += `<p><b>${esc(it.title)}</b>${it.meta ? ` <i>(${esc(it.meta)})</i>` : ''}<br>${esc(it.text)}` +
         `${it.tags && it.tags.length ? `<br>Topics: ${esc(it.tags.join(', '))}` : ''}${lk ? `<br>${lk}` : ''}</p>`;
  }
  return h;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const snapPath = path.join(OUT, 'sites-text.json'), old = fs.existsSync(snapPath) ? JSON.parse(fs.readFileSync(snapPath, 'utf8')) : {};
  const today = new Date().toISOString().slice(0, 10), snap = {}, blocks = [];
  try {
    for (const pg of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.route('**/*', (r) => {
        const u = r.request().url();
        if (u.startsWith('https://page.test/')) return r.fulfill({ path: path.join(REPO, pg.file), contentType: 'text/html' });
        if (u.startsWith('https://yil384.github.io/Picasso-Lab/')) {
          const f = path.join(REPO, decodeURIComponent(u.slice(37).split(/[?#]/)[0]));
          return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
        }
        return r.abort();   // no network: no analytics, no Supabase / Firebase writes
      });
      const page = await ctx.newPage();
      await page.goto('https://page.test/index.html', { waitUntil: 'load' }).catch(() => {});
      await page.waitForTimeout(1500);
      const items = await page.evaluate(extract, pg.key);
      await ctx.close();
      const html = toHtml(pg, items), hash = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
      const prev = old[pg.key], changed = !prev || prev.hash !== hash;
      snap[pg.key] = { hash, changed: changed ? today : prev.changed, items: items.filter((i) => !i.h).length };
      blocks.push({ pg, html, info: snap[pg.key], fresh: changed && !!prev });
      console.log(`${pg.key.padEnd(13)} ${String(snap[pg.key].items).padStart(3)} items  ${changed ? (prev ? 'CHANGED - re-paste' : 'new') : 'unchanged'}`);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(snapPath, JSON.stringify(snap, null, 1) + '\n');

  const home = blocks.map(({ pg }) => `<a href="${SITE}${pg.live}/${pg.sub}">${esc(pg.name)}</a>`).join(' · ');
  const sec = (id, label, how, inner, badge) => `<section class="blk"><div class="bh"><div><b>${label}</b>${badge || ''}<span>${how}</span></div>
<button data-copy="${id}">复制</button></div><div class="paste" id="${id}">${inner}</div></section>`;
  const page = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Site Text for Search</title>
<style>
:root { --bg:#f6f7f9; --card:#fff; --ink:#1b1f24; --mut:#5d6672; --line:#e3e6ea; --acc:#1a5fd0; --new:#c2410c; }
@media (prefers-color-scheme: dark) { :root { --bg:#111418; --card:#1a1e24; --ink:#e8ebef; --mut:#9aa4b0; --line:#2b313a; --acc:#7fb0ff; --new:#fb923c; } }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 -apple-system, "Segoe UI", Roboto, "PingFang SC", sans-serif; }
main { max-width:880px; margin:0 auto; padding:28px 16px 80px; }
h1.t { font-size:24px; margin:0 0 6px; } .lead { color:var(--mut); margin:0 0 18px; }
ol.steps { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 18px 14px 36px; }
code { font-size:13px; word-break:break-all; }
.blk { background:var(--card); border:1px solid var(--line); border-radius:10px; margin:18px 0; overflow:hidden; }
.bh { display:flex; gap:12px; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--line); }
.bh b { margin-right:8px; } .bh span { display:block; color:var(--mut); font-size:13px; }
.badge { font-size:12px; font-weight:600; color:var(--new); border:1px solid var(--new); border-radius:99px; padding:1px 8px; }
button { flex:none; border:0; border-radius:8px; background:var(--acc); color:#fff; font:600 14px/1 inherit; padding:9px 16px; cursor:pointer; }
.paste { padding:6px 18px 14px; max-height:360px; overflow:auto; font-size:14px; }
</style></head><body><main>
<h1 class="t">搜索用的原生文字版</h1>
<p class="lead">Publications、Projects、Events、Teaching 是整页 embed，Google 收录了页面却读不到里面的字。给每个板块建一个隐藏的"文字版"子页面，把下面对应的块粘进去即可。生成于 ${today}；内容有变化的块会标"有更新"。重新生成：<code>NODE_PATH=$(npm root -g) node seo/sites_text.js</code></p>
<ol class="steps">
<li>在 Sites 里，每个板块下面新建一个子页面（下表），右键 &rarr; Hide from navigation；页面设置 &rarr; Advanced 里填自定义路径。</li>
${blocks.map(({ pg }) => `<li>${esc(pg.name)}：<code>${SITE}${pg.live}/${pg.sub}</code>（放在 ${esc(pg.live.slice(1))} 下面）</li>`).join('\n')}
<li>每个子页面放一个文本框，粘贴对应的块（会带着标题、粗体和链接）。</li>
<li>在 Home 页已有的文字下面加一行"文字版入口"（最后一块），让 Google 能顺着链接找到这些子页面。</li>
<li>Publish 后在 Search Console 对四个新网址点 Request indexing。以后某块标了"有更新"，就重新粘贴那一块。</li>
</ol>
${blocks.map(({ pg, html, info, fresh }) => sec(pg.key, `${esc(pg.name)}（${SITE}${pg.live}/${pg.sub}）`, `${info.items} 条 · 内容最近变化 ${info.changed}`, html, fresh ? '<span class="badge">有更新，需重新粘贴</span>' : '')).join('\n')}
${sec('home', 'Home 页的文字版入口', '加在 Home 页已有文字的末尾，一行即可', `<p>Text versions: ${home}</p>`)}
</main><script>
document.querySelectorAll('button[data-copy]').forEach(function (b) { b.onclick = function () {
  var el = document.getElementById(b.dataset.copy), done = function () { b.textContent = '已复制'; setTimeout(function () { b.textContent = '复制'; }, 1600); };
  function fallback() { var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); done(); }
  try { navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([el.innerHTML], { type: 'text/html' }), 'text/plain': new Blob([el.innerText], { type: 'text/plain' }) })]).then(done, fallback); } catch (e) { fallback(); }
}; });
</script></body></html>`;
  fs.writeFileSync(path.join(OUT, 'sites-text.html'), page);
  console.log('wrote seo/sites-text.html');
})().catch((e) => { console.error(e); process.exit(1); });
