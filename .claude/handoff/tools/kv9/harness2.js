// Sites harness: all requests go through Playwright's Node HTTP stack (with retries) + disk cache.
// Optional: swap embeds (by substring match of their code) with local files; route GitHub Pages to the checkout.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const REPO = '/home/user/Picasso-Lab';
const CACHE = path.join(__dirname, '../cache');
const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const unesc = s => s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
async function open(opts) {
  const { width=390, height=844, swaps={}, localPages=true, noCacheFor=[], dsf=null, screen=null, mobileDev=null } = opts;
  const mobile = mobileDev === null ? width < 800 : mobileDev;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--disable-site-isolation-trials','--disable-features=IsolateOrigins,site-per-process'] });
  const ctx = await browser.newContext({ ...(mobile ? devices['iPhone 13'] : {}), viewport:{width,height}, ignoreHTTPSErrors:true, serviceWorkers:'block', ...(dsf ? { deviceScaleFactor: dsf } : {}), ...(screen ? { screen } : {}) });
  await ctx.route('**/*', async route => {
    const req = route.request(); const url = req.url();
    if (/google-analytics|googletagmanager|play\.google\.com\/log|\/g\/collect|firebaseio|supabase\.co|doubleclick/.test(url)) return route.abort();
    if (localPages && url.startsWith('https://yil384.github.io/Picasso-Lab/')) {
      let p = decodeURIComponent(url.slice('https://yil384.github.io/Picasso-Lab/'.length).split(/[?#]/)[0]);
      let f = path.join(REPO, p); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html');
      if (fs.existsSync(f)) return route.fulfill({ path: f, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': ({ js: 'text/javascript', html: 'text/html', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', css: 'text/css', mp4: 'video/mp4', json: 'application/json' })[f.split('.').pop()] || 'application/octet-stream' } });
    }
    const key = crypto.createHash('sha1').update(req.method()+' '+url+' '+(req.postData()||'')).digest('hex');
    const cf = path.join(CACHE, key);
    const cacheable = req.method()==='GET' && !noCacheFor.some(r=>r.test(url));
    let status, headers, body;
    if (cacheable && fs.existsSync(cf+'.json')) {
      ({status, headers} = JSON.parse(fs.readFileSync(cf+'.json','utf8'))); body = fs.readFileSync(cf+'.bin');
    } else {
      let resp, err;
      for (let i=0;i<5;i++){ try { resp = await route.fetch({ maxRetries: 3, timeout: 45000 }); break; } catch(e){ err=e; await new Promise(r=>setTimeout(r,800*(i+1))); } }
      if (!resp) { return route.abort().catch(()=>{}); }
      status = resp.status(); headers = resp.headers(); body = await resp.body();
      delete headers['content-encoding']; delete headers['content-length'];
      if (cacheable && status < 400) { fs.writeFileSync(cf+'.json', JSON.stringify({status,headers,url})); fs.writeFileSync(cf+'.bin', body); }
    }
    // swap embed code in the Sites page HTML
    if (/text\/html/.test(headers['content-type']||'') && /yufeiding\.ucsd\.edu/.test(url) && Object.keys(swaps).length) {
      let s = body.toString('utf8');
      s = s.replace(/data-code="([^"]*)"/g, (m, c) => {
        const code = unesc(c);
        for (const [needle, file] of Object.entries(swaps)) if (code.includes(needle)) { console.log('swapped embed', needle, '->', file); return 'data-code="'+esc(fs.readFileSync(file,'utf8'))+'"'; }
        return m;
      });
      body = Buffer.from(s, 'utf8');
    }
    return route.fulfill({ status, headers, body });
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,200)));
  return { browser, ctx, page };
}
async function gotoSites(page, url) {
  for (let i=0;i<4;i++){ try { await page.goto(url, {waitUntil:'domcontentloaded', timeout:90000}); return; } catch(e){ console.log('goto retry', e.message.slice(0,80)); } }
}
module.exports = { open, gotoSites };
