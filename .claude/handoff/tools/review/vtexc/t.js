// cut texture fails once (keyi), later requests succeed; count requests and state after each click
const { setup } = require('../kitrev/common');
(async () => {
  let n = 0;
  const { browser, page, frame, pb, clip, errs, state } = await setup({
    snip: 'keyi_esports_genius',
    before: async (page) => {
      await page.route('**/people/static/fx/keyi-cut.webp', r => { n++; return n === 1 ? r.abort('internetdisconnected') : r.fallback(); });
    },
  });
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(2000);
    for (let i = 0; i < 4; i++) {
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(3000);
      const s = await state();
      console.log(`click ${i + 1}:`, JSON.stringify(s), 'cut requests', n);
      await page.screenshot({ path: `review/vtexc/vtexc_${i}.jpg`, type: 'jpeg', quality: 80, clip });
      if (s.gl) { await page.mouse.click(cx, cy); await page.waitForTimeout(1500); console.log('  off:', JSON.stringify(await state())); }
    }
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
