// Verifier: pop-echo latency and the "late echo cancels a re-trigger" race.
// usage: node ve_echo.js <iso 0/1> <mode: lat|retrig> [keyDelayMs] [waitMs]
// iso=1: site isolation ON and blogs.html served from a cross-site origin (like the Sites embed),
//        so the nav frame runs in its own renderer process.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REPO = '/home/user/Picasso-Lab';
const CACHE = path.join(__dirname, '..', 'cache');
const iso = process.argv[2] === '1';
const mode = process.argv[3] || 'lat';
const keyDelay = +(process.argv[4] || 0);
const waitMs = +(process.argv[5] || 0);
const PAGE = iso ? 'https://embed-test.googleusercontent.example/blogs.html' : 'https://yil384.github.io/Picasso-Lab/blogs/blogs.html';
const CT = { js: 'text/javascript', html: 'text/html', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', css: 'text/css', json: 'application/json' };
(async () => {
  const args = iso ? [] : ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
    await ctx.route('**/*', async route => {
      const req = route.request(); const url = req.url();
      if (/google-analytics|googletagmanager|doubleclick/.test(url)) return route.abort();
      if (url.startsWith('https://embed-test.googleusercontent.example/')) return route.fulfill({ path: path.join(REPO, 'blogs/blogs.html'), headers: { 'Content-Type': 'text/html' } });
      if (url.startsWith('https://yil384.github.io/Picasso-Lab/')) {
        let p = decodeURIComponent(url.slice('https://yil384.github.io/Picasso-Lab/'.length).split(/[?#]/)[0]);
        let f = path.join(REPO, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
        if (fs.existsSync(f)) return route.fulfill({ path: f, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': CT[f.split('.').pop()] || 'application/octet-stream' } });
      }
      const key = crypto.createHash('sha1').update(req.method() + ' ' + url + ' ' + (req.postData() || '')).digest('hex');
      const cf = path.join(CACHE, key);
      if (req.method() === 'GET' && fs.existsSync(cf + '.json')) {
        const { status, headers } = JSON.parse(fs.readFileSync(cf + '.json', 'utf8'));
        return route.fulfill({ status, headers, body: fs.readFileSync(cf + '.bin') });
      }
      let resp; for (let i = 0; i < 4; i++) { try { resp = await route.fetch({ timeout: 45000 }); break; } catch (e) { await new Promise(r => setTimeout(r, 700)); } }
      if (!resp) return route.abort().catch(() => {});
      const headers = resp.headers(); delete headers['content-encoding']; delete headers['content-length'];
      const body = await resp.body();
      if (req.method() === 'GET' && resp.status() < 400) { fs.writeFileSync(cf + '.json', JSON.stringify({ status: resp.status(), headers, url })); fs.writeFileSync(cf + '.bin', body); }
      return route.fulfill({ status: resp.status(), headers, body });
    });
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', m => { const t = m.text(); if (!/GL Driver|swiftshader|GPU stall|Automatic fallback/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 200)); });
    page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
    await page.goto(PAGE, { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(1275, 5);
    await page.keyboard.press('x'); await page.waitForTimeout(2500);   // warm three + fonts
    const settle = async (ms) => {
      await page.waitForTimeout(200);
      await page.waitForFunction(() => !document.body.classList.contains('blog-transitioning') && !document.querySelector('.egg-fx, .egg-wipe'), null, { timeout: 20000 }).catch(() => console.log('(settle timeout)'));
      await page.waitForTimeout(ms);
    };
    const navProcess = await page.evaluate(() => { try { void document.getElementById('picasso-nav-frame').contentWindow.location.hash; return 'same-origin'; } catch (e) { return 'cross-origin'; } });
    console.log('iso', iso, 'nav frame', navProcess, 'frames', page.frames().map(f => f.url().slice(0, 60)));
    await page.keyboard.type('picasso', { delay: keyDelay }); // into the Real Blogs
    await settle(400);
    await page.evaluate(() => {
      const t0 = performance.now(); window.__log = [];
      const L = (s) => window.__log.push(Math.round(performance.now() - t0) + ' ' + s);
      window.__L = L;
      addEventListener('message', e => { if (e.data && typeof e.data.picassoNav === 'string') L('echo "' + e.data.picassoNav + '" body=' + document.body.className); }, true);
      document.addEventListener('keydown', e => { L('key ' + e.key + ' true=' + document.body.classList.contains('true-blogs')); }, true);
      let frames = 0, last = performance.now(), worst = 0;
      const f = (now) => { frames++; worst = Math.max(worst, now - last); last = now; if (frames < 400) requestAnimationFrame(f); }; requestAnimationFrame(f);
      window.__frames = () => ({ frames, worst: Math.round(worst) });
      for (const fn of ['requestBlogReturn', 'startBlogSecretTransition', 'renderBlogMode', 'syncBlogFromHistory']) {
        const orig = window[fn];
        window[fn] = function (...a) { L(fn + JSON.stringify(a).slice(0, 40) + ' target=' + blogTransitionTarget); return orig.apply(this, a); };
      }
    });
    if (mode === 'lat') {
      await page.evaluate(() => requestBlogReturn());
      await settle(500);
    } else if (mode === 'human') {
      // wall-clock typing, not waiting for the renderer to ack each key (a human does not wait)
      const cdp = await page.context().newCDPSession(page);
      const text = 'picasso' + 'picasso';
      const sends = [];
      const t0 = Date.now();
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const at = i * keyDelay + (i >= 7 ? waitMs : 0);
        sends.push(new Promise(r => setTimeout(() => {
          const code = 'Key' + ch.toUpperCase();
          Promise.all([
            cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, code, text: ch, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) }),
            new Promise(rr => setTimeout(rr, 25)).then(() => cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch, code, windowsVirtualKeyCode: ch.toUpperCase().charCodeAt(0) }))
          ]).then(r, r);
        }, at)));
      }
      await Promise.all(sends);
      console.log('sent in', Date.now() - t0, 'ms');
      await settle(1500);
    } else {
      await page.keyboard.type('picasso', { delay: keyDelay });  // return
      if (waitMs) await page.waitForTimeout(waitMs);
      await page.keyboard.type('picasso', { delay: keyDelay });  // re-trigger
      await settle(1500);
    }
    console.log((await page.evaluate(() => window.__log)).join('\n'));
    const st = await page.evaluate(() => ({ body: document.body.className, blogView: JSON.stringify(blogView), fx: document.querySelectorAll('.egg-fx,.egg-wipe').length, frames: window.__frames() }));
    const nav = page.frames().find(f => f.url().includes('nav-frame'));
    st.nav = nav ? nav.url().split('#')[1] || '' : '?';
    const ok = st.body.includes('true-blogs') === JSON.parse(st.blogView).trueBlogs && (st.nav.includes('t=1') === JSON.parse(st.blogView).trueBlogs);
    console.log(ok ? 'CONSISTENT' : 'INCONSISTENT', JSON.stringify(st));
    if (logs.length) console.log('logs', logs.slice(0, 8));
  } finally { await browser.close(); }
})();
