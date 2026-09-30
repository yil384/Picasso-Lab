// races: Back/Forward/re-trigger at many offsets during the transitions (real clock)
const { setup, state, settle } = require('./rv_common');
const scen = process.argv[2] || 'all';
async function run(name, fn) {
  const { browser, page, logs } = await setup();
  try {
    // warm three + fonts so the transition runs the WebGL path
    await page.keyboard.press('x'); await page.waitForTimeout(2500);
    await fn(page);
    await settle(page, 1500);
    const s = await state(page);
    const ok = (s.body.includes('true-blogs') === JSON.parse(s.blogView).trueBlogs) && (s.navHash.includes('t=1') === JSON.parse(s.blogView).trueBlogs) && s.fx === 0 && !s.body.includes('transitioning') && !s.body.includes('hold');
    console.log(ok ? 'OK  ' : 'BAD ', name, JSON.stringify({ body: s.body, bv: s.blogView, nav: s.navHash, fx: s.fx, hl: s.histLen }));
    if (logs.length) console.log('   logs', logs.slice(0, 6));
  } finally { await browser.close(); }
}
const type = (page, t) => page.keyboard.type(t, { delay: 0 });
const back = page => page.evaluate(() => history.back());
const fwd = page => page.evaluate(() => history.forward());
(async () => {
  const S = {
    back_at: async (ms) => run('picasso then Back after ' + ms + 'ms', async page => { await type(page, 'picasso'); await page.waitForTimeout(ms); await back(page); }),
    retrig_at: async (ms) => run('picasso, picasso again after ' + ms + 'ms', async page => { await type(page, 'picasso'); await page.waitForTimeout(ms); await type(page, 'picasso'); }),
    backfwd_at: async (ms) => run('picasso, Back+Forward after ' + ms + 'ms', async page => { await type(page, 'picasso'); await page.waitForTimeout(ms); await back(page); await page.waitForTimeout(60); await fwd(page); }),
    ret_back_at: async (ms) => run('in egg; picasso(return) then Forward after ' + ms + 'ms', async page => { await type(page, 'picasso'); await settle(page, 300); await type(page, 'picasso'); await page.waitForTimeout(ms); await fwd(page); }),
    ret_retrig_at: async (ms) => run('in egg; picasso(return) then picasso after ' + ms + 'ms', async page => { await type(page, 'picasso'); await settle(page, 300); await type(page, 'picasso'); await page.waitForTimeout(ms); await type(page, 'picasso'); }),
  };
  const offsets = [0, 30, 120, 300, 600, 900];
  for (const k of Object.keys(S)) {
    if (scen !== 'all' && scen !== k) continue;
    for (const ms of offsets) await S[k](ms);
  }
})();
