// kit-lesson/ink.js - the line look's drawing primitives: ink sprites that draw themselves, hand lettering, the red pen,
// note cards, watercolour washes, tape, taped slide printouts, paper grain and the camera curve.
// A clean copy of the machinery of episodes/l01-5min/film/film.js (itself from episodes/hot-strata/line_full/film.js),
// with the per-language fonts moved into F so one module serves every episode. Every call is a pure function of t.
import { mk, cl, mix, hs } from '/edu/kit2d/index.js';

export const W = 1080, H = 1920;
export const PAPER = [250, 246, 237], INK = [30, 28, 33], RED = [212, 56, 40], PENCIL = [150, 145, 138];
export const COLORS = { ink: INK, red: RED, pencil: PENCIL, paper: PAPER, sheet: [252, 249, 241], white: [255, 255, 255] };
export const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// fonts per language (setLang): hand = the lettering, latin = Caveat in every language, sans = small print
export const F = { lang: 'en', zh: false, HAND: 'Caveat', HW: 700, LAT: 'Caveat', SANS: 'Inter', SW: 500 };
export function setLang(lang) {
  const zh = lang === 'zh';
  Object.assign(F, { lang: zh ? 'zh' : 'en', zh, HAND: zh ? '"ZCOOL KuaiLe", Caveat' : 'Caveat', HW: zh ? 400 : 700,
    SANS: zh ? '"Noto Sans SC", Inter' : 'Inter', SW: zh ? 700 : 500 });
}
// shared images, set by lesson.js: paper (processed grain), wash, tape, logo
export const A = {};

export const seg = (t, a, b) => cl((t - a) / (b - a));
export const eio = (k) => { k = cl(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const eo = (k) => 1 - Math.pow(1 - cl(k), 3);
export const spring = (x, k = 7, w = 13) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
export const fadeIO = (t, a, b, fi = .3, fo = .4) => (t < a || t > b + fo ? 0 : Math.min(seg(t, a, a + fi), 1 - seg(t, b, b + fo)));

// ------------------------------------------------------------------ ink sprites (R ink, G paper fill, B pen time)
export function sprite(img, scale = 1, boost = 0) {
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, n = w * h, ink = new Uint8Array(n), fil = new Uint8Array(n), tm = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) { ink[i] = boost ? 255 * (1 - Math.pow(1 - d[j] / 255, 1 + boost)) : d[j]; fil[i] = d[j + 1]; tm[i] = d[j + 2]; }
  const out = mk(w, h), og = out.getContext('2d');
  return { w, h, ink, fil, tm, out, og, od: og.createImageData(w, h), cache: new Map(), ph: !!img.ph, cap: 3 };
}
export function paint(Sp, p, st = {}) {
  p = cl(p); if (p <= 0) return null;
  const ink = Sp.ph ? PENCIL : (st.ink || INK), fc = st.fill || PAPER, fa = st.fa ?? 1, ia = st.ia ?? 1, soft = .06;
  const key = p >= 1 ? `${ink}|${fc}|${fa.toFixed(3)}|${ia.toFixed(3)}` : null;
  if (key && Sp.cache.has(key)) return Sp.cache.get(key);
  const P = p * (1 + soft) * 255, k = 1 / (soft * 255), d = Sp.od.data, n = Sp.w * Sp.h, I = Sp.ink, Fl = Sp.fil, M = Sp.tm;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let r = (P - M[i]) * k; r = r < 0 ? 0 : r > 1 ? 1 : r;
    const a1 = I[i] * r * ia / 255, a2 = Fl[i] * r * fa / 255 * (1 - a1), a = a1 + a2;
    if (a <= .002) { d[j + 3] = 0; continue; }
    d[j] = (ink[0] * a1 + fc[0] * a2) / a; d[j + 1] = (ink[1] * a1 + fc[1] * a2) / a; d[j + 2] = (ink[2] * a1 + fc[2] * a2) / a; d[j + 3] = a * 255;
  }
  Sp.og.putImageData(Sp.od, 0, 0);
  if (!key) return Sp.out;
  const c = mk(Sp.w, Sp.h); c.getContext('2d').drawImage(Sp.out, 0, 0);
  if (Sp.cache.size > Sp.cap) Sp.cache.delete(Sp.cache.keys().next().value);
  Sp.cache.set(key, c); return c;
}
export function put(g, cv, x, y, w, o = {}) {
  if (!cv) return;
  const h = w * cv.height / cv.width, ax = o.ax ?? .5, ay = o.ay ?? .5;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.s != null) g.scale(o.s, o.s);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.drawImage(cv, -ax * w, -ay * h, w, h); g.restore();
}
// a drawing, drawn by the pen from t0 over dur, at centre (x, y), width w; returns its box (at(u, v) -> sheet point)
export function draw(g, t, Sp, x, y, w, t0, dur, o = {}) {
  const h = w * Sp.h / Sp.w, box = { x0: x - w / 2, y0: y - h / 2, w, h, at: (u, v) => [x - w / 2 + u * w, y - h / 2 + v * h] };
  const k = t0 == null ? 1 : seg(t, t0, t0 + dur); if (k <= 0 || (o.alpha ?? 1) <= 0) return box;
  put(g, paint(Sp, k), x, y, w, { alpha: o.alpha, rot: o.rot });
  return box;
}

// ------------------------------------------------------------------ hand lettering and the red pen
export function fitPx(g, s, px, maxW, w = F.HW, fam = F.HAND) { g.font = `${w} ${px}px ${fam}`; const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
export function textW(g, s, px, w = F.HW, fam = F.HAND) { g.font = `${w} ${px}px ${fam}`; return g.measureText(s).width; }
export function hand(g, s, x, y, px, col, o = {}) {
  const k = o.k ?? 1; if (k <= 0 || !s) return;
  const fam = o.fam ?? F.HAND, wt = o.w ?? F.HW, al = o.alpha ?? 1; if (al <= .002) return;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.s != null) g.scale(o.s, o.s);
  g.font = `${wt} ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(s).width;
  if (o.align === 'left') g.translate(tw / 2, 0); else if (o.align === 'right') g.translate(-tw / 2, 0);
  const x0 = -tw / 2 - px * .25, span = tw + px * .5;
  if (o.patch) {
    const pw = tw + px * o.patch, ph = px * 1.05, pk = cl(k * 1.15), r = ph * .3;
    g.save(); g.globalAlpha = al; g.fillStyle = css(PAPER); g.shadowColor = css(PAPER); g.shadowBlur = px * .18;
    g.beginPath(); g.roundRect(-pw / 2, -ph / 2, Math.max(2 * r, pw * pk), ph, r); g.fill(); g.fill(); g.restore();
  }
  const dr = (a) => { g.globalAlpha = a * al; g.fillStyle = css(col); g.fillText(s, 0, 0); };
  if (k >= 1) dr(1);
  else {
    const e = px * .6, xe = x0 + (span + e) * k;
    g.save(); g.beginPath(); g.rect(x0 - 4, -px * 2, Math.max(0, xe - e - x0 + 4), px * 4); g.clip(); dr(1); g.restore();
    for (let i = 0; i < 6; i++) { g.save(); g.beginPath(); g.rect(xe - e + i * e / 6, -px * 2, e / 6 + .5, px * 4); g.clip(); dr(1 - (i + .5) / 6); g.restore(); }
  }
  g.restore();
}
// a label written at t0 (over dur) and faded out at tout
export function L(g, t, s, x, y, px, col, t0, tout, o = {}) {
  if (t < t0 || (tout != null && t > tout + .45)) return;
  const dur = o.dur ?? Math.min(1.1, .25 + .03 * String(s).length);
  hand(g, s, x, y, px, col, Object.assign({}, o, { k: seg(t, t0, t0 + dur), alpha: (o.alpha ?? 1) * (tout == null ? 1 : 1 - seg(t, tout, tout + .4)) }));
}
export function sans(g, s, x, y, px, col, a = 1, o = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `${o.w ?? F.SW} ${px}px ${o.fam ?? F.SANS}`; g.fillStyle = css(col);
  g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore();
}
export function pen(g, pts, k, col, lw, o = {}) {
  if (k <= 0 || pts.length < 2) return;
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L1 = d[d.length - 1] * cl(k);
  g.save(); g.strokeStyle = css(col, o.alpha ?? 1); g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; if (o.dash) g.setLineDash(o.dash);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (d[i] <= L1) g.lineTo(pts[i][0], pts[i][1]);
    else { const f = (L1 - d[i - 1]) / (d[i] - d[i - 1]); g.lineTo(mix(pts[i - 1][0], pts[i][0], f), mix(pts[i - 1][1], pts[i][1], f)); break; }
  }
  g.stroke(); g.restore();
}
export function ring(cx, cy, rx, ry, seed = 0, turns = 1.12) {
  const p = [], a0 = -2.3 + hs(seed) * .7, n = 48;
  for (let i = 0; i <= n; i++) { const a = a0 + turns * 2 * Math.PI * i / n, r = 1 + .045 * Math.sin(3 * a + seed) + .03 * i / n; p.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]); }
  return p;
}
export function curve(x0, y0, x1, y1, bend = .2) {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend, p = [];
  for (let i = 0; i <= 24; i++) { const s = i / 24; p.push([(1 - s) * (1 - s) * x0 + 2 * s * (1 - s) * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * s * (1 - s) * my + s * s * y1]); }
  return p;
}
export function arrow(g, pts, k, col, lw, o = {}) {
  pen(g, pts, k / .85, col, lw, o);
  const hk = seg(k, .85, 1); if (hk <= 0) return;
  const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 3], a = Math.atan2(y1 - y0, x1 - x0), L1 = (o.head ?? lw * 5) * hk;
  for (const s of [-1, 1]) pen(g, [[x1, y1], [x1 - L1 * Math.cos(a + s * .5), y1 - L1 * Math.sin(a + s * .5)]], 1, col, lw, { alpha: o.alpha });
}
export const tickPts = (x, y, s) => [[x - .45 * s, y - .05 * s], [x - .12 * s, y + .35 * s], [x + .55 * s, y - .55 * s]];
export function cardPts(x0, y0, x1, y1, r, seed = 0) {
  const p = [], n = 72, w = x1 - x0, h = y1 - y0, per = 2 * (w + h - 4 * r) + 2 * Math.PI * r;
  for (let i = 0; i <= n; i++) {
    let s = per * i / n, x, y;
    const runs = [w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2, w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2];
    let j = 0; while (j < 7 && s > runs[j]) { s -= runs[j]; j++; }
    const arc = (cx, cy, a0) => [cx + r * Math.cos(a0 + s / r), cy + r * Math.sin(a0 + s / r)];
    if (j === 0) [x, y] = [x0 + r + s, y0]; else if (j === 1) [x, y] = arc(x1 - r, y0 + r, -Math.PI / 2);
    else if (j === 2) [x, y] = [x1, y0 + r + s]; else if (j === 3) [x, y] = arc(x1 - r, y1 - r, 0);
    else if (j === 4) [x, y] = [x1 - r - s, y1]; else if (j === 5) [x, y] = arc(x0 + r, y1 - r, Math.PI / 2);
    else if (j === 6) [x, y] = [x0, y1 - r - s]; else [x, y] = arc(x0 + r, y0 + r, Math.PI);
    const wob = 1.3 * Math.sin(i * .9 + seed) + .8 * Math.sin(i * 2.3 + seed * 1.7);
    p.push([x + wob * .6, y + wob * .6]);
  }
  return p;
}
export function noteCard(g, x0, y0, x1, y1, k, o = {}) {
  if (k <= 0) return; const al = o.alpha ?? 1, Pp = cardPts(x0, y0, x1, y1, o.r ?? 14, o.seed ?? 0);
  g.save(); g.globalAlpha = al * eo(seg(k, 0, .5)); g.fillStyle = css(o.fill || PAPER); g.beginPath(); Pp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
  pen(g, Pp, k, o.ink || INK, o.lw ?? 3, { alpha: al * .9 });
}
// a group of drawing calls faded as one (an offscreen layer with the same transform), so overlaps never ghost
const LAYERS = [];
export function layer(g, a, fn, depth = 0) {
  if (a <= .003) return; if (a >= .997) { fn(g); return; }
  const cw = g.canvas.width, ch = g.canvas.height;
  let c = LAYERS[depth]; if (!c || c.width !== cw || c.height !== ch) c = LAYERS[depth] = mk(cw, ch);
  const lg = c.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, cw, ch); lg.setTransform(g.getTransform());
  fn(lg);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(c, 0, 0); g.restore();
}

// ------------------------------------------------------------------ watercolour, tape, printouts
// art/src/wash_swatches.png, 3 x 2 blotches. Printed with multiply (its white paper disappears into ours); it blooms
// open from 70% size as it soaks in. The boxes are measured on that file: a new swatch sheet needs new boxes.
export const WASH = [[28, 44, 471, 447], [547, 44, 448, 438], [1032, 44, 486, 445], [28, 539, 453, 427], [525, 527, 475, 449], [1035, 528, 472, 438]];
export const WASHES = { coral: 0, cobalt: 1, yellow: 2, sage: 3, ultra: 4, peach: 5 };
export function wash(g, t, i, x, y, w, t0, o = {}) {
  if (t < t0) return; const k = eo(seg(t, t0, t0 + (o.dur ?? .9))), a = k * (o.a ?? .85) * (o.tout != null ? 1 - seg(t, o.tout, o.tout + .5) : 1);
  if (a <= 0) return; const [sx, sy, sw, sh] = WASH[i], h = (o.h ?? w * sh / sw), s = .7 + .3 * k;
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.translate(x, y); g.rotate(o.rot ?? (hs(i * 3.1 + x * .01) - .5) * .6); g.scale(s, s);
  g.drawImage(A.wash, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
}
// art/src/tape_strips.png, 8 strips (measured on that file)
export const TAPE = [[56, 51, 843, 192], [1044, 70, 378, 164], [141, 295, 445, 168], [695, 298, 793, 207], [58, 534, 769, 182], [969, 576, 447, 139], [114, 776, 350, 164], [610, 775, 872, 204]];
export function tape(g, t, i, x, y, w, rot, t0) {
  if (t < t0) return; const k = spring(t - t0, 9, 16), [sx, sy, sw, sh] = TAPE[i], h = w * sh / sw;
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .92 * cl((t - t0) * 8); g.translate(x, y); g.rotate(rot); g.scale(mix(1.25, 1, k), mix(1.25, 1, k));
  g.drawImage(A.tape, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
}
// a slide printout dropped onto the sheet at t0 (a soft shadow, the white margin of the paper, then the slide);
// returns a mapper from the slide's u, v (0..1 in the crop) to the sheet, for the red pen
export function printout(g, t, img, cx, cy, w, rot, t0, crop) {
  if (t < t0) return null;
  const [sx, sy, sw, sh] = crop || [0, 0, img.width, img.height], h = w * sh / sw, k = eo(seg(t, t0, t0 + .45)), s = mix(1.08, 1, k);
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(s, s); g.globalAlpha = k;
  g.save(); g.shadowColor = 'rgba(60,45,30,.28)'; g.shadowBlur = 26; g.shadowOffsetY = 10; g.fillStyle = '#fdfcf8';
  g.fillRect(-w / 2 - 18, -h / 2 - 18, w + 36, h + 36); g.restore();
  g.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
  const c = Math.cos(rot), sn = Math.sin(rot);
  return (u, v) => { const x = (u - .5) * w, y = (v - .5) * h; return [cx + x * c - y * sn, cy + x * sn + y * c]; };
}

// ------------------------------------------------------------------ paper grain and the camera curve
export function grain(g, cam) {
  const im = A.paper, tw = im.width, th = im.height, x0 = cam.x - 540 / cam.z, x1 = cam.x + 540 / cam.z, y0 = cam.y - 960 / cam.z, y1 = cam.y + 960 / cam.z;
  g.save(); g.globalCompositeOperation = 'multiply';
  for (let ty = Math.floor(y0 / th) * th; ty < y1; ty += th) for (let tx = Math.floor(x0 / tw) * tw; tx < x1; tx += tw) g.drawImage(im, tx, ty);
  g.restore();
}
// the paper texture as a multiply grain (light, neutral)
export function grainTexture(paper) {
  const pcv = mk(paper.width, paper.height), pg = pcv.getContext('2d', { willReadFrequently: true }); pg.drawImage(paper, 0, 0);
  const id = pg.getImageData(0, 0, pcv.width, pcv.height), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const v = Math.min(255, (d[j] * .2126 + d[j + 1] * .7152 + d[j + 2] * .0722) * 255 / 243); const l = 255 - (255 - v) * 1.6; d[j] = d[j + 1] = d[j + 2] = Math.max(0, l); }
  pg.putImageData(id, 0, 0); return pcv;
}
// monotone cubic (Fritsch-Carlson) through the camera keys: no overshoot, so the camera never swings past a panel
export function hermite(ts, ys, t) {
  const n = ts.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / Math.max(1e-6, ts[i + 1] - ts[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s2 = a * a + b * b;
    if (s2 > 9) { const tau = 3 / Math.sqrt(s2); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  if (t <= ts[0]) return ys[0]; if (t >= ts[n - 1]) return ys[n - 1];
  let i = 0; while (t > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i], s = (t - ts[i]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
}
