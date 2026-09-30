// delay the egg font CSS so it misses the 600 ms budget and lands during the film
const { open } = require('../../harness');
const PRE2=1;const DELAY = +(process.argv[2] || 2500), PRE = process.argv[3] || 'vfc';
(async () => {
  const { browser, page } = await open({ width: 1100, height: 760 });
  const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|swiftshader/i.test(m.text())) errs.push(m.text().slice(0, 200)); });
  let cssAt = null;
  await page.route(/fonts\.googleapis\.com\/css2\?family=IBM\+Plex/, async r => {
    await new Promise(res => setTimeout(res, DELAY)); cssAt = Date.now(); r.fallback();
  });
  const shoot = n => page.screenshot({ path: `shots/${PRE}_${n}.jpg`, type: 'jpeg', quality: 70 });
  const probe = () => page.evaluate(() => {
    const h = document.querySelector('.blog-hero h1'); const card = document.querySelector('#blog-list > *');
    return { cls: document.body.className, h1font: getComputedStyle(h).fontFamily.slice(0, 40), h1w: Math.round(h.getBoundingClientRect().width), h1h: Math.round(h.getBoundingClientRect().height),
      range: (() => { const r = document.createRange(); r.selectNodeContents(h); return Math.round(r.getBoundingClientRect().width); })(),
      cardH: card ? Math.round(card.getBoundingClientRect().height) : null,
      faces: [...document.fonts].filter(f => /Playfair|Plex/.test(f.family)).map(f => f.status).join(','),
      chk: document.fonts.check('900 40px "Playfair Display"') };
  });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/blogs/blogs.html', { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.mouse.move(1095, 5);
    const t0 = Date.now();
    await page.keyboard.type('pi', { delay: 30 });
    await page.waitForFunction(() => eggThreePromise && eggThreePromise.then, null);
    await page.evaluate(() => eggThreePromise);            // three ready (cached)
    await page.evaluate(() => { window.__eggT = 0.1; window.__eggClock = () => window.__eggT; const o = eggRun; eggRun = (d, l, f) => { window.__END = d; return o(d, l, f); }; });
    await page.keyboard.type('casso', { delay: 10 });
    const tType = Date.now() - t0;
    await page.waitForFunction(() => document.querySelector('.egg-fx') && !document.querySelector('.egg-fx .egg-cover'), null, { timeout: 30000 });
    console.log('typed at +' + tType + 'ms; film running at +' + (Date.now() - t0) + 'ms; css arrived yet?', cssAt ? '+' + (cssAt - t0) : 'no');
    console.log('film start (back snapshot taken):', JSON.stringify(await probe()));
    // film held at 0.1 s; wait for the CSS + fonts to arrive under it
    await page.waitForFunction(() => [...document.fonts].some(f => /Playfair/.test(f.family) && f.status === 'loaded'), null, { timeout: 20000 });
    await page.waitForTimeout(300);
    console.log('css arrived at +' + (cssAt - t0) + 'ms');
    console.log('under film after fonts:', JSON.stringify(await probe()));
    await page.evaluate(() => { window.__eggT = window.__END - 0.0005; });   // last frame = back snapshot
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await shoot('end');
    await page.evaluate(() => { document.querySelector('.egg-fx').style.visibility = 'hidden'; });
    await shoot('live');
    await page.evaluate(() => { const l = document.querySelector('.egg-fx'); l.style.visibility = ''; l.querySelector('canvas').style.opacity = '0.5'; });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await shoot('midfade');
    await page.evaluate(() => { document.querySelector('.egg-fx canvas').style.opacity = ''; window.__eggT = 99; });
    await page.waitForFunction(() => !document.querySelector('.egg-fx'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    await shoot('final');
    console.log('final:', JSON.stringify(await probe()));
  } finally {
    console.log('console:', errs.slice(0, 10));
    await browser.close();
  }
})();
