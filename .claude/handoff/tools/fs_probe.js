// is the Fullscreen API allowed inside a Team-page avatar embed on the live Sites page?
const { open, gotoSites } = require('./harness');
(async () => {
  const { browser, page } = await open({ width: 1280, height: 800 });
  try {
    await gotoSites(page, 'https://yufeiding.ucsd.edu/people/team');
    await page.waitForTimeout(6000);
    const out = [];
    for (const f of page.frames()) {
      try {
        const r = await f.evaluate(() => ({ url: location.href.slice(0, 60), fs: document.fullscreenEnabled, pip: 'pictureInPictureEnabled' in document ? document.pictureInPictureEnabled : null, has: !!document.querySelector('.pfx, img') }));
        out.push(r);
      } catch (e) {}
    }
    const fr = await page.$$eval('iframe', els => els.slice(0, 6).map(e => ({ src: (e.src || '').slice(0, 60), allow: e.getAttribute('allow'), afs: e.hasAttribute('allowfullscreen'), sandbox: e.getAttribute('sandbox') })));
    console.log(JSON.stringify(fr, null, 0));
    console.log(JSON.stringify(out.filter(o => o.has).slice(0, 4)));
  } finally { await browser.close(); }
})();
