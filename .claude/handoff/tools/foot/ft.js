// Standalone footer test: Sites-like nesting (top page -> sandboxed "atari-embeds" frame -> about:blank frame filled
// with document.write, quirks mode), mocked Supabase + geo-IP, local GitHub Pages, screenshots of the box.
// usage: node ft.js <embed.html> <outPrefix> <WxH[@phone|@dsf1]> ...   env: HOVER=1 (hover a ping + card), LOG=1
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const HERE = __dirname, REPO = '/home/user/Picasso-Lab';
const CHROME = (() => { const d = fs.readdirSync('/opt/pw-browsers').filter(n => /^chromium-\d+$/.test(n)).sort().pop(); return path.join('/opt/pw-browsers', d, 'chrome-linux/chrome'); })();
const ROWS = fs.readFileSync(path.join(HERE, 'rows.json'));
const SEAL = fs.readFileSync(path.join(HERE, 'seal.png'));
const [file, prefix, ...specs] = process.argv.slice(2);
const CODE = fs.readFileSync(file, 'utf8');
const OUT = path.join(HERE, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const reqLog = [];

const TOP = (w, h) => `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
 html,body{margin:0;background:#000} .wrap{padding:24px 0 60px;display:flex;justify-content:center} iframe{border:0;display:block;width:${w}px;height:${h}px;outline:1px dashed rgba(255,0,0,.35)}
</style></head><body><div class="wrap"><iframe id="sb" sandbox="allow-scripts allow-popups allow-same-origin allow-forms allow-popups-to-escape-sandbox" src="https://4821-atari-embeds.googleusercontent.test/inner.html"></iframe></div></body></html>`;
const INNER = `<!doctype html><html><head><style>html,body{margin:0;height:100%;overflow:hidden;background:transparent}iframe{border:0;width:100%;height:100%;display:block}</style></head>
<body><iframe id="userHtmlFrame"></iframe><script>
 var f=document.getElementById('userHtmlFrame'), d=f.contentDocument; d.open(); d.write(${JSON.stringify(CODE).replace(/<\/script/gi, '<\\/script')}); d.close();
<\/script></body></html>`;

async function run() {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--disable-site-isolation-trials', '--disable-features=IsolateOrigins,site-per-process'] });
  try {
    for (const spec of specs) {
      const m = spec.match(/^(\d+)x(\d+)(?:@(\w+))?$/); const W = +m[1], H = +m[2], flag = m[3] || '';
      const phone = flag === 'phone' || (W < 420 && flag !== 'desk');
      const vw = phone ? 390 : Math.max(W + 40, 1000), vh = phone ? 844 : Math.max(H + 120, 700);
      const ctx = await browser.newContext({ ...(phone ? devices['iPhone 13'] : {}), viewport: { width: vw, height: vh },
        deviceScaleFactor: flag === 'dsf1' ? 1 : (phone ? 3 : 2), ignoreHTTPSErrors: true });
      await ctx.route('**/*', async route => {
        const req = route.request(), url = req.url();
        if (url.startsWith('https://sites.test/')) return route.fulfill({ contentType: 'text/html', body: TOP(W, H) });
        if (url.startsWith('https://4821-atari-embeds.googleusercontent.test/')) return route.fulfill({ contentType: 'text/html', body: INNER });
        if (/supabase\.co/.test(url)) {
          const hdr = req.headers(); reqLog.push({ method: req.method(), url, headers: hdr, body: req.postData() });
          if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: ROWS });
          if (req.method() === 'POST') return route.fulfill({ status: 201, body: '' });
          return route.fulfill({ status: 204, body: '' });
        }
        if (/ipwho\.is/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ success: true, latitude: 32.8801, longitude: -117.2340, city: 'La Jolla', country: 'United States' }) });
        if (/ipapi\.co|geojs\.io/.test(url)) return route.abort();
        if (/commons\.wikimedia\.org/.test(url)) return route.fulfill({ status: 200, contentType: 'image/png', body: SEAL });
        if (url.startsWith('https://yil384.github.io/Picasso-Lab/')) {
          const f = path.join(REPO, decodeURIComponent(url.slice(37).split(/[?#]/)[0]));
          if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ path: f });
          return route.fulfill({ status: 404, body: '' });
        }
        if (/^data:|^blob:/.test(url)) return route.continue();
        if (process.env.LOG) console.log('blocked', url.slice(0, 120));
        return route.abort();
      });
      const page = await ctx.newPage();
      page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 300)));
      page.on('console', msg => { if (process.env.LOG || msg.type() === 'error') console.log('console.' + msg.type(), msg.text().slice(0, 300)); });
      page.on('popup', p => console.log('POPUP', p.url()));
      await page.goto('https://sites.test/', { waitUntil: 'load' });
      await page.waitForTimeout(+(process.env.WAIT || 2600));
      const frame = page.frames().find(f => f.url() === 'about:blank' && f.parentFrame() && f.parentFrame().url().includes('atari'));
      const info = await frame.evaluate(() => ({ mode: document.compatMode, lay: (window.__pf && window.__pf()) || null,
        sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
      console.log(spec, JSON.stringify(info));
      const el = await page.$('#sb'); const bb = await el.boundingBox();
      const clip = { x: bb.x - 8, y: bb.y - 8, width: bb.width + 16, height: bb.height + 16 };
      const out = path.join(OUT, `${prefix}_${W}x${H}${flag ? '_' + flag : ''}.jpg`);
      await page.screenshot({ path: out, type: 'jpeg', quality: 80, clip });
      if (process.env.HOVER) {
        // hover the San Diego ping (the map canvas) and then the card corner
        const pt = await frame.evaluate(() => window.__pfPing ? window.__pfPing('San Diego') : null);
        if (pt) { await page.mouse.move(bb.x + pt.x, bb.y + pt.y); await page.waitForTimeout(400);
          await page.screenshot({ path: out.replace('.jpg', '_hov.jpg'), type: 'jpeg', quality: 80, clip }); }
        if (process.env.CLICK) { await page.mouse.click(bb.x + pt.x, bb.y + pt.y); await page.waitForTimeout(800); }
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, prefix + '_requests.json'), JSON.stringify(reqLog, null, 1));
  console.log('requests:', reqLog.map(r => r.method + ' ' + r.url.slice(0, 90)).join('\n  '));
}
run().catch(e => { console.error(e); process.exit(1); });
