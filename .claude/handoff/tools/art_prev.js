const { chromium } = require('playwright'); const fs=require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport:{width:1320,height:440} });
  const js = fs.readFileSync('egg_art.js','utf8');
  await p.setContent(`<body style="margin:0;display:flex;flex-wrap:wrap;gap:10px;padding:10px;background:#ccc"><script>${js}; document.body.innerHTML = Object.values(EGG_ART).map(s=>'<div style="width:640px;height:400px;border:2px solid #000;background:#fff">'+s+'</div>').join('');</script></body>`);
  await p.setViewportSize({width:1320,height:840});
  await p.waitForTimeout(500);
  await p.screenshot({path:'shots/egg_art.jpg', type:'jpeg', quality:80});
  await b.close();
})();
