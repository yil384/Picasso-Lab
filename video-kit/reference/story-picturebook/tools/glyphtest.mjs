// Node check of the glyph stroke geometry (no pv imports): find NaN / huge coords in partial strokes.
import fs from 'fs';
const src = fs.readFileSync(new URL('../qb_ink.js', import.meta.url), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/export /g, '');
const pre = `const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)); const lerp=(a,b,t)=>a+(b-a)*t; const ease={outCubic:x=>1-Math.pow(1-x,3),inOutSine:x=>-(Math.cos(Math.PI*x)-1)/2};`;
const mod = new Function(pre + src + '; return { glyphStrokes, trunc, through, capsuleStroke };')();
const { glyphStrokes, trunc, through, capsuleStroke } = mod; const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
for (let age = 0; age <= 20; age++) {
  const x = 1395, y = 455, pop = 1, size = 285, rot = -0.09;
  const { strokes } = glyphStrokes('4.7×', size, x - 1.6 * size, y - 0.55 * size, rot, x, y);
  strokes.forEach((s, j) => {
    if (s.dot) return;
    const k = clamp((age - (2 + j * 1.5)) / 2.2); if (k <= 0) return;
    const pts2 = trunc(s.pts.length > 2 ? through(s.pts, 8) : [s.pts[0], s.pts[1]], k);
    if (pts2.length < 2) return;
    const dense = pts2.length > 2 ? pts2 : [pts2[0], [(pts2[0][0] + pts2[1][0]) / 2, (pts2[0][1] + pts2[1][1]) / 2], pts2[1]];
    const P = capsuleStroke(dense, s.w, s.w * 0.86);
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const bad = P.some((p) => !isFinite(p[0]) || !isFinite(p[1]));
    const span = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)].map(Math.round);
    if (bad || span[1] - span[0] > 700 || span[3] - span[2] > 700) console.log('age', age, 'stroke', j, 'k', k.toFixed(2), 'bad', bad, 'span', span, 'n', dense.length);
  });
}
console.log('done');
