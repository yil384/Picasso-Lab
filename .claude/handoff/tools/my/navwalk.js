const { setup, state, settle } = require('../review/rv_common');
(async () => {
  const { browser, page, logs } = await setup();
  const S = async (label) => { const s = await state(page); console.log(label.padEnd(34), s.body.padEnd(28), (s.article || '-').slice(0, 16).padEnd(16), decodeURIComponent(s.navHash).replace(/&n=.*/, '').slice(0, 30).padEnd(24), 'len', s.histLen); return s; };
  const back = async () => { await page.evaluate(() => history.back()); await settle(page, 400); };
  const fwd = async () => { await page.evaluate(() => history.forward()); await settle(page, 400); };
  try {
    await page.evaluate(() => { window.__eggClock = () => 99; });
    await page.click('#blog-list .blog-card:nth-child(2)'); await settle(page, 400); await S('open official article');
    await page.click('.article-back'); await settle(page, 400); await S('Blogs button (pop)');
    await page.keyboard.type('picasso', { delay: 10 }); await settle(page, 400); await S('picasso (push t=1)');
    await page.click('#blog-list .blog-card[data-fake-index="0"]'); await settle(page, 400); await S('open leak (push f=0)');
    await page.keyboard.press('Escape'); await settle(page, 400); await S('Escape (pop -> t=1)');
    await back(); await S('Back (external -> official)');
    await fwd(); await S('Forward (external -> Real)');
    await page.click('#blog-list .blog-card[data-fake-index="2"]'); await settle(page, 400); await S('open leak 2 (push f=2)');
    await page.keyboard.type('picasso', { delay: 10 }); await settle(page, 400); await S('picasso w/ leak (2 steps? stack 1)');
    await back(); await S('Back');
    await page.keyboard.type('picasso', { delay: 10 }); await settle(page, 400); await S('picasso (return, replace)');
    await page.keyboard.type('picasso', { delay: 10 }); await settle(page, 400); await S('picasso (push t=1)');
    await page.click('#blog-list .blog-card[data-fake-index="1"]'); await settle(page, 400); await S('open leak 1 (push)');
    await page.keyboard.type('picasso', { delay: 10 }); await settle(page, 400); await S('picasso w/ leak (pop 2)');
    await back(); await S('Back');
    await fwd(); await S('Forward');
  } finally { console.log('logs', logs); await browser.close(); }
})();
