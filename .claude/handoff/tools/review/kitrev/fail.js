// failure paths: node fail.js plate-once | q5 | noimportmap
const { setup } = require('./common');
const fs = require('fs');
(async () => {
  const mode = process.argv[2];
  let code = null, n = 0;
  if (mode === 'noimportmap') code = fs.readFileSync('/home/user/Picasso-Lab/people/zhuo_gold_medal.html', 'utf8').replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
  const { browser, page, frame, pb, clip, errs, state } = await setup({
    code,
    before: async (page) => {
      if (mode === 'plate-once') await page.route('**/people/static/fx/zhuo-plate.webp', r => (n++ === 0 ? r.abort() : r.fallback()));
      if (mode === 'q5') await page.route('**/q5.min.js', r => r.abort());
    },
  });
  try {
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(3000);
    for (let i = 0; i < 3; i++) {
      await page.mouse.click(cx, cy);
      await page.waitForTimeout(2500);
      console.log(`click ${i + 1}:`, JSON.stringify(await state()), 'plate requests so far', n);
      await page.screenshot({ path: `review/kitrev/fail_${mode}_${i}.jpg`, type: 'jpeg', quality: 80, clip });
      if ((await state()).gl) { await page.mouse.click(cx, cy); await page.waitForTimeout(1500); console.log('  off:', JSON.stringify(await state())); }
    }
  } finally {
    console.log('console:', JSON.stringify(errs.slice(0, 8), null, 1));
    await browser.close();
  }
})();
