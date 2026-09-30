const { chromium } = require('playwright');
const fs = require('fs');
const code = fs.readFileSync('/home/user/Picasso-Lab/sponsors/sponsors.html','utf8');
const hashLink = `<script>(function(){document.addEventListener('click',function(e){},true);})();<\/script>`;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  try {
    for (const [W,H,prefix] of [[1920,1024,'sites'],[1920,1024,'plain'],[1440,836,'sites'],[1440,836,'plain']]) {
      const ctx = await browser.newContext({ viewport:{width:W,height:H} });
      const page = await ctx.newPage();
      await page.route('https://yil384.github.io/Picasso-Lab/**', r => {
        const p = '/home/user/Picasso-Lab/' + r.request().url().slice('https://yil384.github.io/Picasso-Lab/'.length);
        return fs.existsSync(p) ? r.fulfill({ path: p, headers:{'Content-Type':'image/webp'} }) : r.abort();
      });
      await page.route('https://fonts.googleapis.com/**', r => r.abort());
      await page.setContent(`<!DOCTYPE html><html><body style="margin:0"><iframe id=f frameborder=0 scrolling=yes style="border:0;width:${W}px;height:${H}px;display:block"></iframe></body></html>`);
      await page.evaluate(({code, pre, hashLink}) => {
        const f = document.getElementById('f');
        const d = f.contentWindow.document;
        d.open();
        const content = pre ? '<base href="' + location.href + '" target="_blank">' + hashLink + code : code;
        d.write(content); d.close();
      }, { code, pre: prefix==='sites', hashLink });
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => {
        const d = document.getElementById('f').contentWindow.document;
        const b = d.body.getBoundingClientRect(), h = d.documentElement.getBoundingClientRect();
        const m = d.querySelector('main').getBoundingClientRect();
        return { mode: d.compatMode, bodyH: Math.round(b.height), htmlH: Math.round(h.height), mainBottom: Math.round(m.bottom), vh: d.defaultView.innerHeight, scrollH: d.documentElement.scrollHeight };
      });
      console.log(W, H, prefix, JSON.stringify(info));
      await page.screenshot({ path: `review/spbg/sp_${prefix}_${W}.png` });
      await ctx.close();
    }
  } finally { await browser.close(); }
})();
