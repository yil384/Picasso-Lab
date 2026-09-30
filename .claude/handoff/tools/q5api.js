const { open } = require('./harness'); const fs = require('fs');
(async () => {
  const { browser: b, page: p } = await open({ width: 600, height: 400 });
  try {
    await p.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    await p.addScriptTag({ content: fs.readFileSync('vk/video-kit/anime/tiga/vendor/q5.min.js', 'utf8') });
    const r = await p.evaluate(() => {
      const out = [];
      const a = new Q5('graphics'); a.createCanvas(266, 284); out.push('plain', a.canvas.constructor.name, a.canvas.width, a.canvas.height, a.pixelDensity && a.pixelDensity());
      try { a.pixelDensity(2); out.push('pd2', a.canvas.width, a.canvas.height, a.width, a.height); } catch (e) { out.push('pd err ' + e.message); }
      const b = new Q5('graphics'); b.createCanvas(266, 284, { pixelDensity: 2 }); out.push('opt', b.canvas.width, b.canvas.height, b.width, b.height);
      a.clear(); a.fill(255,0,0); a.noStroke(); a.circle(133, 142, 50);
      const c = document.createElement('canvas'); c.width = 532; c.height = 568; const g = c.getContext('2d'); g.drawImage(a.canvas, 0, 0, 532, 568);
      out.push('px', Array.from(g.getImageData(266, 284, 1, 1).data).join(','));
      return out;
    });
    console.log(r);
  } finally { await b.close(); }
})();
