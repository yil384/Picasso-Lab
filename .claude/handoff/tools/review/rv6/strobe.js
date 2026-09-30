// Yue: count real rAF frames that show the full-frame impact (flash disc opaque), over 3 cycles
const { open } = require('../../harness');
const fs = require('fs');
const OUT = __dirname + '/out';
(async () => {
  const { browser, page } = await open({ width: 900, height: 844, dsf: 1 });
  try {
    await page.goto('https://yil384.github.io/Picasso-Lab/nav-frame.html');
    const code = fs.readFileSync(`/home/user/Picasso-Lab/people/yue_baseball.html`, 'utf8');
    await page.evaluate((code) => {
      document.body.style.cssText = 'margin:0;background:#fff;padding:20px';
      const f = document.createElement('iframe'); f.id = 'tile';
      f.style.cssText = `width:266px;height:284px;border:0;display:block`;
      document.body.appendChild(f);
      f.contentDocument.open(); f.contentDocument.write(code); f.contentDocument.close();
    }, code);
    const frame = page.frames().find(fr => fr.parentFrame() && fr.url() === 'about:blank');
    const pb = await (await frame.$('#pfx')).boundingBox();
    const cx = pb.x + pb.width / 2, cy = pb.y + pb.height / 2;
    await page.mouse.move(cx, cy); await page.waitForTimeout(2500);
    await page.mouse.click(cx, cy);
    const res = await frame.evaluate(() => new Promise(async res => {
      const m = await import('https://yil384.github.io/Picasso-Lab/people/fx/kit.js');
      const av = (await m.attach(document.getElementById('pfx'))).avatar;
      while (!av.gl) await new Promise(r => requestAnimationFrame(r));
      // find the flash disc: CircleGeometry mesh with MeshBasicMaterial colour, renderOrder 5
      let flash = null; av.gl.scene.traverse(o => { if (o.renderOrder === 5 && o.isMesh) flash = o; });
      const log = []; const t0 = performance.now();
      const step = () => {
        if (!av.gl) return res({ log, err: 'gl gone' });
        log.push([+(performance.now() - t0).toFixed(1), +av.t.toFixed(3), flash.material.opacity, '#' + flash.material.color.getHexString()]);
        if (av.t < 16) requestAnimationFrame(step); else res({ log });
      };
      requestAnimationFrame(step);
    }));
    const flashes = res.log.filter(r => r[2] > 0);
    const dts = res.log.slice(1).map((r, i) => r[0] - res.log[i][0]);
    console.log(JSON.stringify({ frames: res.log.length, meanDt: (dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(2), flashFrames: flashes }));
  } finally { await browser.close(); }
})();
