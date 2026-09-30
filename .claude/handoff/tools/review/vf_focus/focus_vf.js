// verify: is there any visible keyboard-focus indicator on an avatar whose effect is on?
const { open } = require('../../harness');
const fs = require('fs');
const OUT = __dirname + '/';
(async () => {
  const { browser, page } = await open({ width: 900, height: 700, dsf: 1 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const a = fs.readFileSync('/home/user/Picasso-Lab/people/zhuo_gold_medal.html', 'utf8');
    const b = fs.readFileSync('/home/user/Picasso-Lab/people/chang_top_scorer.html', 'utf8');
    await page.evaluate(([a, b]) => {
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px;display:flex;gap:20px;align-items:flex-start';
      const btn = document.createElement('button'); btn.id = 'before'; btn.textContent = 'before'; document.body.appendChild(btn);
      for (const [id, code] of [['t1', a], ['t2', b]]) {
        const f = document.createElement('iframe'); f.id = id;
        f.style.cssText = 'width:266px;height:284px;border:0;display:block';
        document.body.appendChild(f);
        f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
      }
    }, [a, b]);
    await page.waitForTimeout(600);
    const fr = page.frames().filter(f => f.parentFrame() && f.url() === 'about:blank');
    const [f1, f2] = fr;
    for (const f of fr) await f.evaluate(() => { window.__pfxClock = () => 4.0; });
    const st = (f) => f.evaluate(() => { const w = document.getElementById('pfx'); return { tf: getComputedStyle(w.querySelector('.pfx-stage')).transform, outline: getComputedStyle(w).outlineStyle, fv: w.matches(':focus-visible'), focus: w.matches(':focus'), pressed: w.getAttribute('aria-pressed'), gl: !!document.querySelector('.pfx-gl') }; });
    await page.mouse.move(890, 690);
    await page.focus('#before');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(600);
    console.log('zhuo tab-focused off:', JSON.stringify(await st(f1)));
    await page.keyboard.press('Enter');
    await f1.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    console.log('zhuo tab-focused on :', JSON.stringify(await st(f1)));
    const t1 = await page.$('#t1');
    await t1.screenshot({ path: OUT + 'vff_zhuo_on_focused.png' });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(600);
    console.log('after Tab -> zhuo  :', JSON.stringify(await st(f1)));
    console.log('after Tab -> chang :', JSON.stringify(await st(f2)));
    await t1.screenshot({ path: OUT + 'vff_zhuo_on_unfocused.png' });
    await page.keyboard.press('Enter');
    await f2.waitForFunction(() => document.querySelector('.pfx-gl') && document.querySelector('.pfx-gl').style.opacity === '1', null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: OUT + 'vff_both_on_focus_chang.png', clip: { x: 0, y: 0, width: 700, height: 330 } });
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(800);
    console.log('shift-tab back zhuo:', JSON.stringify(await st(f1)));
    console.log('shift-tab back chang:', JSON.stringify(await st(f2)));
    await page.screenshot({ path: OUT + 'vff_both_on_focus_zhuo.png', clip: { x: 0, y: 0, width: 700, height: 330 } });
    await t1.screenshot({ path: OUT + 'vff_zhuo_on_focused2.png' });
  } finally {
    console.log('console errors:', JSON.stringify(errs.slice(0, 6)));
    await browser.close();
  }
})();
