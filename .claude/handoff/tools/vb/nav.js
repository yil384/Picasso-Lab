// regression: open/close views and move Back/Forward through the nav frame; check page == nav entry at each step
const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const fast = process.argv[2] !== 'real';
  const { browser, page, logs } = await setup(1280, 800);
  let bad = 0;
  const step = async (label, expect) => {
    await settle(page, 600);
    const s = await state(page);
    const bv = JSON.parse(s.blogView);
    const nav = decodeURIComponent(s.navHash);
    const art = s.article || '-';
    const ok = expect.every(([k, v]) => ({ t: s.body.includes('true-blogs'), nav: nav.replace(/&?n=[a-z0-9]+/, '').replace(/^#/, ''), art, h1: s.h1 })[k] === v)
      && (s.body.includes('true-blogs') === bv.trueBlogs) && (nav.includes('t=1') === bv.trueBlogs) && s.fx === 0 && !/transitioning|hold/.test(s.body);
    if (!ok) bad++;
    console.log((ok ? 'OK  ' : 'BAD ') + label.padEnd(34), JSON.stringify({ body: s.body, h1: s.h1, art, nav: nav.slice(0, 60), bv: s.blogView.slice(0, 70), hl: s.histLen }));
  };
  try {
    if (fast) await page.evaluate(() => { window.__eggClock = () => 99; });
    const back = () => page.evaluate(() => history.back()), fwd = () => page.evaluate(() => history.forward());
    await page.keyboard.type('picasso', { delay: 20 });
    await step('type picasso', [['t', true], ['nav', 't=1']]);
    await page.click('#blog-list .blog-card[data-fake-index="2"]'); await page.waitForTimeout(600);
    await step('open leak 2', [['t', true], ['nav', 't=1&f=2'], ['art', 'fake:2']]);
    await page.keyboard.type('picasso', { delay: 20 });
    await step('picasso inside leak (#1)', [['t', false], ['nav', ''], ['art', '-']]);
    await fwd(); await page.waitForTimeout(300);
    await step('Forward -> Real Blogs', [['t', true], ['nav', 't=1'], ['art', '-']]);
    await fwd(); await page.waitForTimeout(300);
    await step('Forward -> leak 2', [['t', true], ['nav', 't=1&f=2'], ['art', 'fake:2']]);
    await back(); await page.waitForTimeout(300);
    await step('Back -> Real Blogs', [['t', true], ['nav', 't=1'], ['art', '-']]);
    await back(); await page.waitForTimeout(300);
    await step('Back -> official', [['t', false], ['nav', ''], ['art', '-']]);
    await page.click('#blog-list .blog-card:nth-child(2)'); await page.waitForTimeout(800);
    await step('open official article', [['t', false]]);
    await page.keyboard.press('Escape');
    await step('Escape closes article', [['t', false], ['nav', ''], ['art', '-']]);
    await fwd(); await page.waitForTimeout(300);
    await step('Forward -> article again', [['t', false]]);
    await back(); await page.waitForTimeout(300);
    await step('Back -> list', [['t', false], ['nav', ''], ['art', '-']]);
    await page.keyboard.type('picasso', { delay: 20 });
    await step('picasso again', [['t', true], ['nav', 't=1']]);
    await page.click('#blog-list .blog-card[data-fake-index="0"]'); await page.waitForTimeout(600);
    await step('open leak 0', [['t', true], ['nav', 't=1&f=0'], ['art', 'fake:0']]);
    await page.keyboard.press('Escape');
    await step('Escape closes leak', [['t', true], ['nav', 't=1'], ['art', '-']]);
    await page.click('.egg-back');
    await step('Back-to-official button', [['t', false], ['nav', ''], ['art', '-']]);
    await back(); await page.waitForTimeout(300);
    await step('Back -> official (article entry gone)', [['t', false]]);
    console.log(bad ? `FAILED ${bad}` : 'ALL OK', 'logs', logs);
  } finally { await browser.close(); }
})();
