// toggle races: (1) on-off-on while loading, (2) on-off while loading, (3) click during the exit,
// (4) stale webglcontextlost from a released stage while a new one is building
const { setup } = require('./common');
const which = process.argv[2] || 'all';
const hookCtx = (frame) => frame.evaluate(() => {
  window.__ctxs = [];
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const c = g.call(this, type, ...a);
    if (/webgl/.test(type) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c);
    return c;
  };
});
const live = (frame) => frame.evaluate(() => window.__ctxs.filter(c => !c.isContextLost()).length);
async function run(name, delay, body) {
  const { browser, page, frame, pb, errs, state } = await setup({
    tw: +(process.env.TW || 0), th: +(process.env.TH || 0),
    before: async (page) => {
      if (delay) await page.route('**/people/static/fx/zhuo-plate.webp', async r => { await new Promise(res => setTimeout(res, delay)); await r.fallback(); });
    },
  });
  try {
    await hookCtx(frame);
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(2500);
    await body({ page, frame, cx, cy, state, log: async (label) => console.log(name, label, JSON.stringify(await state()), 'live ctx', await live(frame)) });
  } finally {
    console.log(name, 'console:', JSON.stringify(errs.slice(0, 8)));
    await browser.close();
  }
}
(async () => {
  if (which === 'all' || which === '1') await run('on-off-on-loading', 3000, async ({ page, cx, cy, log }) => {
    await page.mouse.click(cx, cy); await page.waitForTimeout(500);
    await page.mouse.click(cx, cy); await log('after off (loading)'); await page.waitForTimeout(500);
    await page.mouse.click(cx, cy); await log('after on (loading)');
    await page.waitForTimeout(5000); await log('settled');
    await page.mouse.click(cx, cy); await page.waitForTimeout(2000); await log('after off');
  });
  if (which === 'all' || which === '2') await run('on-off-loading', 3000, async ({ page, cx, cy, log }) => {
    await page.mouse.click(cx, cy); await page.waitForTimeout(500);
    await page.mouse.click(cx, cy); await log('after off (loading)');
    await page.waitForTimeout(5000); await log('settled');
  });
  if (which === 'all' || which === '3') await run('click-during-exit', 0, async ({ page, cx, cy, log }) => {
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log('on');
    for (const gap of [390, 420, 440, 450, 460, 480]) {
      await page.mouse.click(cx, cy); await page.waitForTimeout(gap);        // off, then on again gap ms into the 450 ms exit
      await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log(`back on ${gap} ms into the exit`);
    }
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log('off');
  });
  if (which === 'all' || which === '5') await run('stale-lost-during-build', 0, async ({ page, frame, cx, cy, log }) => {
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log('on');
    // a click whose capture listener releases the live stage first: the snippet's toggle then builds a new
    // one at once, and the released context's lost event lands while that build is loading
    await frame.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js')
      .then(m => m.attach(document.getElementById('pfx')))
      .then(c => {
        const a = c.avatar, wrap = document.getElementById('pfx');
        window.__order = [];
        wrap.addEventListener('click', () => {
          const A = document.querySelector('.pfx-gl'), t0 = performance.now();
          A.addEventListener('webglcontextlost', () => window.__order.push(['old context lost', Math.round(performance.now() - t0), 'building', !!a.building, 'live stage', !!a.gl, 'on', a.on]));
          a.teardown(); a.on = false; a.lastToggle = 0;
          const b = a.build.bind(a);
          a.build = () => { window.__order.push(['build starts', Math.round(performance.now() - t0)]); return b().then(() => window.__order.push(['build done', Math.round(performance.now() - t0)])); };
        }, { capture: true, once: true });
        return 1;
      }));
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(2500); await log('after release + rebuild'); console.log('  order', JSON.stringify(await frame.evaluate(() => window.__order)));
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log('off');
  });
  if (which === 'all' || which === '4') await run('stale-lost', 0, async ({ page, frame, cx, cy, log }) => {
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log('on');
    // release the live stage and start a new one in the same task: the old context's lost event lands later
    await frame.evaluate(() => import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js')
      .then(m => m.attach(document.getElementById('pfx')))
      .then(c => {
        const a = c.avatar, A = document.querySelector('.pfx-gl'), t0 = performance.now();
        window.__order = [];
        A.addEventListener('webglcontextlost', () => window.__order.push(['old context lost', Math.round(performance.now() - t0), 'building', !!a.building, 'live stage', !!a.gl]));
        a.teardown();
        setTimeout(() => { window.__order.push(['turnOn', Math.round(performance.now() - t0)]); a.turnOn().then(() => window.__order.push(['new stage live', Math.round(performance.now() - t0)])); }, 0);
        return 1;
      }));
    await page.waitForTimeout(2000); await log('after release + rebuild'); console.log('  order', JSON.stringify(await frame.evaluate(() => window.__order)));
    await page.mouse.click(cx, cy); await page.waitForTimeout(1500); await log('off');
  });
})();
