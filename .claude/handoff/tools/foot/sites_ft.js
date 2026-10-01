// live Sites footer with one embed swapped for footer.html; Supabase + geo-IP mocked (never production)
const { open, gotoSites } = require('/tmp/picasso-tools/harness');
const fs = require('fs'), path = require('path');
const ROWS = fs.readFileSync(path.join(__dirname, 'rows.json'));
(async () => {
  const [W, H, out, needle] = process.argv.slice(2);
  const { browser, ctx, page } = await open({ width: +W, height: +H, swaps: { [needle || 'YOUR visitor map']: '/home/user/Picasso-Lab/home/footer.html' } });
  const log = [];
  await ctx.route(/supabase\.co/, r => { const q = r.request(); log.push(q.method() + ' ' + q.url().slice(0, 100) + ' ' + (q.postData() || ''));
    return q.method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: ROWS }) : r.fulfill({ status: 201, body: '' }); });
  await ctx.route(/ipwho\.is/, r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, latitude: 32.88, longitude: -117.23, city: 'La Jolla', country: 'United States' }) }));
  await ctx.route(/ipapi\.co|geojs\.io/, r => r.abort());
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/sponsors');
    await page.waitForTimeout(5000);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(150); }
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(4000);
    for (const f of page.frames()) { try { const r = await f.evaluate(() => window.__pf ? window.__pf() : null); if (r) console.log('layout', JSON.stringify(r)); } catch (e) {} }
    await page.screenshot({ path: out, type: 'jpeg', quality: 70 });
    console.log(log.join('\n'));
  } finally { await browser.close(); }
})();
