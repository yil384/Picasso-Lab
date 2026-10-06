// L01 "Background", the 5-minute line cut (../SCRIPT.md): Prof. Ding's CSE 291P Lecture 1, slides 9-11, told on one long
// sheet of warm paper. Black ink line drawings draw themselves, the red pen marks and corrects, watercolour washes give
// the colour, her three slides are taped onto the sheet as printouts, and her own voice plays in seven clips (mic tag
// top right, her words as captions; ZH marked 译). Fifteen panels stacked down the sheet; one smooth camera visits them.
// Machinery (ink sprites, lettering, pen, captions, end card) is the Strata line film's (../../hot-strata/line_full).
// Facts and wording: ../../l01-1-scale/FACTS.md. Every frame is a pure function of t.
import { defineScene } from '/pv/runtime/pv.js';
import { loadImg, mk, cl, mix, hs } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1';
const W = 1080, H = 1920, FPS = 30, DUR = 265.0;
const HAND = ZH ? '"ZCOOL KuaiLe", Caveat' : 'Caveat', HW = ZH ? 400 : 700, LAT = 'Caveat';
const SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter', SW = ZH ? 700 : 500;
const PAPER = [250, 246, 237], INK = [30, 28, 33], RED = [212, 56, 40], PENCIL = [150, 145, 138];
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
let TL, C, VO;
const A = {}, S = {};

const seg = (t, a, b) => cl((t - a) / (b - a));
const eio = (k) => { k = cl(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const eo = (k) => 1 - Math.pow(1 - cl(k), 3);
const spring = (x, k = 7, w = 13) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
const fadeIO = (t, a, b, fi = .3, fo = .4) => (t < a || t > b + fo ? 0 : Math.min(seg(t, a, a + fi), 1 - seg(t, b, b + fo)));

// ------------------------------------------------------------------ ink sprites (R ink, G paper fill, B pen time)
function sprite(img, scale = 1, boost = 0) {
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, n = w * h, ink = new Uint8Array(n), fil = new Uint8Array(n), tm = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) { ink[i] = boost ? 255 * (1 - Math.pow(1 - d[j] / 255, 1 + boost)) : d[j]; fil[i] = d[j + 1]; tm[i] = d[j + 2]; }
  const out = mk(w, h), og = out.getContext('2d');
  return { w, h, ink, fil, tm, out, og, od: og.createImageData(w, h), cache: new Map(), ph: !!img.ph, cap: 3 };
}
function paint(Sp, p, st = {}) {
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
function put(g, cv, x, y, w, o = {}) {
  if (!cv) return;
  const h = w * cv.height / cv.width, ax = o.ax ?? .5, ay = o.ay ?? .5;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.s != null) g.scale(o.s, o.s);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.drawImage(cv, -ax * w, -ay * h, w, h); g.restore();
}
// a drawing, drawn by the pen from t0 over dur, at centre (x, y), width w; returns its box for anchors
function draw(g, t, Sp, x, y, w, t0, dur, o = {}) {
  const h = w * Sp.h / Sp.w, box = { x0: x - w / 2, y0: y - h / 2, w, h, at: (u, v) => [x - w / 2 + u * w, y - h / 2 + v * h] };
  const k = t0 == null ? 1 : seg(t, t0, t0 + dur); if (k <= 0 || (o.alpha ?? 1) <= 0) return box;
  put(g, paint(Sp, k), x, y, w, { alpha: o.alpha, rot: o.rot });
  return box;
}
const MISSING = [];
function placeholder(name) {
  const c = mk(600, 400), g = c.getContext('2d'); g.fillStyle = 'rgb(0,255,255)'; g.fillRect(0, 0, 600, 400); c.ph = true; MISSING.push(name); return c;
}
async function art(name) { try { return await loadImg('/edu/art/cut/' + name + '.png'); } catch (e) { return placeholder(name); } }

// ------------------------------------------------------------------ hand lettering and the red pen
function fitPx(g, s, px, maxW, w = HW, fam = HAND) { g.font = `${w} ${px}px ${fam}`; const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function hand(g, s, x, y, px, col, o = {}) {
  const k = o.k ?? 1; if (k <= 0 || !s) return;
  const fam = o.fam ?? HAND, wt = o.w ?? HW, al = o.alpha ?? 1; if (al <= .002) return;
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
function L(g, t, s, x, y, px, col, t0, tout, o = {}) {
  if (t < t0 || (tout != null && t > tout + .45)) return;
  const dur = o.dur ?? Math.min(1.1, .25 + .03 * String(s).length);
  hand(g, s, x, y, px, col, Object.assign({}, o, { k: seg(t, t0, t0 + dur), alpha: (o.alpha ?? 1) * (tout == null ? 1 : 1 - seg(t, tout, tout + .4)) }));
}
function sans(g, s, x, y, px, col, a = 1, o = {}) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.font = `${o.w ?? SW} ${px}px ${SANS}`; g.fillStyle = css(col);
  g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore();
}
function pen(g, pts, k, col, lw, o = {}) {
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
function ring(cx, cy, rx, ry, seed = 0, turns = 1.12) {
  const p = [], a0 = -2.3 + hs(seed) * .7, n = 48;
  for (let i = 0; i <= n; i++) { const a = a0 + turns * 2 * Math.PI * i / n, r = 1 + .045 * Math.sin(3 * a + seed) + .03 * i / n; p.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]); }
  return p;
}
function curve(x0, y0, x1, y1, bend = .2) {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend, p = [];
  for (let i = 0; i <= 24; i++) { const s = i / 24; p.push([(1 - s) * (1 - s) * x0 + 2 * s * (1 - s) * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * s * (1 - s) * my + s * s * y1]); }
  return p;
}
function arrow(g, pts, k, col, lw, o = {}) {
  pen(g, pts, k / .85, col, lw, o);
  const hk = seg(k, .85, 1); if (hk <= 0) return;
  const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 3], a = Math.atan2(y1 - y0, x1 - x0), L1 = (o.head ?? lw * 5) * hk;
  for (const s of [-1, 1]) pen(g, [[x1, y1], [x1 - L1 * Math.cos(a + s * .5), y1 - L1 * Math.sin(a + s * .5)]], 1, col, lw, { alpha: o.alpha });
}
// a timed pen stroke: drawn t0..t0+d
const P = (g, t, pts, t0, d, col = RED, lw = 7, o = {}) => { if (t > t0) pen(g, pts, seg(t, t0, t0 + d), col, lw, o); };
const AR = (g, t, pts, t0, d, col = RED, lw = 6, o = {}) => { if (t > t0) arrow(g, pts, seg(t, t0, t0 + d), col, lw, o); };
const tickPts = (x, y, s) => [[x - .45 * s, y - .05 * s], [x - .12 * s, y + .35 * s], [x + .55 * s, y - .55 * s]];
function cardPts(x0, y0, x1, y1, r, seed = 0) {
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
function noteCard(g, x0, y0, x1, y1, k, o = {}) {
  if (k <= 0) return; const al = o.alpha ?? 1, Pp = cardPts(x0, y0, x1, y1, o.r ?? 14, o.seed ?? 0);
  g.save(); g.globalAlpha = al * eo(seg(k, 0, .5)); g.fillStyle = css(o.fill || PAPER); g.beginPath(); Pp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
  pen(g, Pp, k, o.ink || INK, o.lw ?? 3, { alpha: al * .9 });
}
// a group of drawing calls faded as one (an offscreen layer with the same transform), so overlaps never ghost
const LAYERS = [];
function layer(g, a, fn, depth = 0) {
  if (a <= .003) return; if (a >= .997) { fn(g); return; }
  const cw = g.canvas.width, ch = g.canvas.height;
  let c = LAYERS[depth]; if (!c || c.width !== cw || c.height !== ch) c = LAYERS[depth] = mk(cw, ch);
  const lg = c.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, cw, ch); lg.setTransform(g.getTransform());
  fn(lg);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(c, 0, 0); g.restore();
}

// ------------------------------------------------------------------ watercolour, tape, printouts
// wash_swatches.png, 3 x 2 blotches: 0 coral, 1 cobalt, 2 yellow, 3 sage, 4 ultramarine, 5 peach. Printed with multiply
// (its white paper disappears into ours); it blooms open from 70% size as it soaks in.
const WASH = [[28, 44, 471, 447], [547, 44, 448, 438], [1032, 44, 486, 445], [28, 539, 453, 427], [525, 527, 475, 449], [1035, 528, 472, 438]];
const CORAL = 0, COBALT = 1, YELLOW = 2, SAGE = 3, ULTRA = 4, PEACH = 5;
function wash(g, t, i, x, y, w, t0, o = {}) {
  if (t < t0) return; const k = eo(seg(t, t0, t0 + (o.dur ?? .9))), a = k * (o.a ?? .85) * (o.tout != null ? 1 - seg(t, o.tout, o.tout + .5) : 1);
  if (a <= 0) return; const [sx, sy, sw, sh] = WASH[i], h = (o.h ?? w * sh / sw), s = .7 + .3 * k;
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.translate(x, y); g.rotate(o.rot ?? (hs(i * 3.1 + x * .01) - .5) * .6); g.scale(s, s);
  g.drawImage(A.wash, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
}
const TAPE = [[56, 51, 843, 192], [1044, 70, 378, 164], [141, 295, 445, 168], [695, 298, 793, 207], [58, 534, 769, 182], [969, 576, 447, 139], [114, 776, 350, 164], [610, 775, 872, 204]];
function tape(g, t, i, x, y, w, rot, t0) {
  if (t < t0) return; const k = spring(t - t0, 9, 16), [sx, sy, sw, sh] = TAPE[i], h = w * sh / sw;
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .92 * cl((t - t0) * 8); g.translate(x, y); g.rotate(rot); g.scale(mix(1.25, 1, k), mix(1.25, 1, k));
  g.drawImage(A.tape, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
}
// a slide printout dropped onto the sheet at t0 (a soft shadow, the white margin of the paper, then the slide)
function printout(g, t, img, cx, cy, w, rot, t0, crop) {
  if (t < t0) return null;
  const [sx, sy, sw, sh] = crop || [0, 0, img.width, img.height], h = w * sh / sw, k = eo(seg(t, t0, t0 + .45)), s = mix(1.08, 1, k);
  g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(s, s); g.globalAlpha = k;
  g.save(); g.shadowColor = 'rgba(60,45,30,.28)'; g.shadowBlur = 26; g.shadowOffsetY = 10; g.fillStyle = '#fdfcf8';
  g.fillRect(-w / 2 - 18, -h / 2 - 18, w + 36, h + 36); g.restore();
  g.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h); g.restore();
  // the slide's own pixel (u, v in the crop, 0..1) on the sheet, for the red pen
  const c = Math.cos(rot), sn = Math.sin(rot);
  return (u, v) => { const x = (u - .5) * w, y = (v - .5) * h; return [cx + x * c - y * sn, cy + x * sn + y * c]; };
}

// ------------------------------------------------------------------ the sheet: 15 panels, one under the other
const GAP = 2000, PY = (k) => k * GAP;
const ARR = 1.0;   // a pan between panels takes this long (from cue pK)
function camKeys() {
  const K = [[0, 540, 960, 1]], at = (k) => C['p' + k];
  for (let k = 1; k <= 14; k++) {
    const t0 = at(k), y0 = PY(k - 1) + 960, y1 = PY(k) + 960, prev = K[K.length - 1];
    K.push([t0, prev[1], prev[2], prev[3]]); K.push([t0 + ARR * .5, 540, (y0 + y1) / 2, .86]); K.push([t0 + ARR, 540, y1, 1]);
    const nxt = k < 14 ? at(k + 1) : DUR;
    // a slow push-in while the panel holds (life without motion of the art)
    K.push([nxt - .02, 540, y1 + 6, 1.035]);
  }
  // panel 4: in on panel A of the chart (the clipping), back out for the correction
  K.splice(K.findIndex((k) => k[0] > C.arith), 0, [C.arith - .1, 540, PY(4) + 962, 1.01], [C.arith + 1.1, 600, PY(4) + 1010, 1.18], [C.mirage9 - .3, 600, PY(4) + 1012, 1.19], [C.mirage9 + .6, 540, PY(4) + 960, 1.0]);
  return K.sort((a, b) => a[0] - b[0]);
}
let CT, CX, CY, CZ;
function hermite(ts, ys, t) {
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
const camAt = (t) => ({ x: hermite(CT, CX, t), y: hermite(CT, CY, t), z: Math.exp(hermite(CT, CZ, t)) });

function grain(g, cam) {
  const im = A.paper, tw = im.width, th = im.height, x0 = cam.x - 540 / cam.z, x1 = cam.x + 540 / cam.z, y0 = cam.y - 960 / cam.z, y1 = cam.y + 960 / cam.z;
  g.save(); g.globalCompositeOperation = 'multiply';
  for (let ty = Math.floor(y0 / th) * th; ty < y1; ty += th) for (let tx = Math.floor(x0 / tw) * tw; tx < x1; tx += tw) g.drawImage(im, tx, ty);
  g.restore();
}

// ------------------------------------------------------------------ the panels (each in its own 1080 x 1920 frame)
// P0 the cover: the first time an AI answered (frame 0 is complete: it is the post's thumbnail and the loop's landing)
function p0(g, t) {
  const b = draw(g, t, S.chat, 600, 1040, 690, null, 0);
  wash(g, t, CORAL, ...b.at(.69, .1), 520, -1, { a: .8, rot: .2 });
  const t1 = ZH ? 132 : 150, t2 = ZH ? 128 : 118;
  hand(g, T.title[0], 70, 360, t1, INK, { align: 'left', rot: -.03 });
  hand(g, T.title[1], 84, ZH ? 500 : 482, t2, RED, { align: 'left', rot: -.03 });
  const uw = textW(g, T.title[1], t2), k = seg(t, C.title, C.title + .6);
  if (k > 0) pen(g, curve(90, ZH ? 572 : 548, 90 + uw, ZH ? 566 : 540, .03), k, RED, 7);
  sans(g, T.strip, 86, ZH ? 636 : 616, ZH ? 30 : 28, INK, .78, { align: 'left' });
}
function textW(g, s, px, w = HW, fam = HAND) { g.font = `${w} ${px}px ${fam}`; return g.measureText(s).width; }
// P1 2017-2020: small nets, scissors and a vice; the winter cloud
function p1(g, t) {
  hand(g, T.years, 80, 360, ZH ? 100 : 110, INK, { align: 'left', k: seg(t, C.p1 + .9, C.p1 + 1.6) });
  wash(g, t, COBALT, 250, 368, 380, C.p1 + 1.2, { a: .35, h: 140, rot: -.05 });
  const b = draw(g, t, S.lab, 540, 860, 1040, C.p1 + 1.1, 2.6);
  wash(g, t, ULTRA, ...b.at(.56, .08), 380, 26.0, { a: .5 });
  L(g, t, T.winter, ...b.at(.3, .1), ZH ? 60 : 66, RED, 26.0, null, { patch: .4, rot: -.05 });
  L(g, t, T.nets[0], 540, 1236, ZH ? 50 : 54, RED, 20.6, 31.0, { patch: .4 });
  const pr = b.at(.27, .62), qu = b.at(.6, .64);
  L(g, t, T.nets[1], 200, 1236, ZH ? 50 : 54, RED, 31.6, null, { patch: .4 });
  AR(g, t, curve(200, 1205, pr[0], pr[1] + 50, .15), 31.9, .45);
  L(g, t, T.nets[2], 860, 1236, ZH ? 50 : 54, RED, 32.6, null, { patch: .4, align: 'right' });
  AR(g, t, curve(780, 1205, qu[0] + 20, qu[1] + 50, -.15), 32.9, .45);
}
// P2 make it larger
function p2(g, t) {
  L(g, t, T.bigger, 80, 400, ZH ? 130 : 120, RED, 40.2, null, { align: 'left', rot: -.03, dur: .6 });
  const b = draw(g, t, S.grow, 540, 980, 1040, 40.4, 3.4);
  wash(g, t, COBALT, ...b.at(.9, .55), 520, 42.6, { a: .55, dur: 1.4 });
  wash(g, t, COBALT, ...b.at(.62, .7), 300, 41.6, { a: .4 });
  L(g, t, ZH ? '+ 数据' : '+ data', 700, 520, ZH ? 64 : 70, INK, 43.3, null, { align: 'left' });
  L(g, t, ZH ? '+ 参数' : '+ parameters', 700, 600, ZH ? 64 : 70, INK, 44.2, null, { align: 'left' });
}
// P3 chicken and egg (her clip C3)
function p3(g, t) {
  const b = draw(g, t, S.egg, 540, 900, 1040, C.p3 + 1.0, 2.6);
  wash(g, t, PEACH, ...b.at(.5, .55), 420, C.p3 + 2.2, { a: .5 });
  const s = T.loop.split(' / ');
  L(g, t, s[0], 540, 1186, 54, RED, 53.4, null, { patch: .3 });
  L(g, t, s[1], 540, 1250, 54, RED, 54.4, null, { patch: .3 });
}
// P4 her slide 9, taped; panel A clipped out and taped bigger; Illusion -> Mirage
const PA = { x: 640, y: 1010, w: 520 };
function p4(g, t) {
  L(g, t, T.slide9, 150, 392, ZH ? 50 : 52, RED, C.tape9 + .4, null, { rot: -.06 });
  const sl = printout(g, t, A.p09, 540, 860, 1000, -.015, C.p4 + .7);
  tape(g, t, 0, 90, 486, 240, -.55, C.tape9); tape(g, t, 5, 990, 482, 200, .5, C.tape9 + .15);
  if (!sl) return;
  // n3a: the flat runs and the jumps, traced on the slide's own panels (A-D, top row)
  const tr = (u0, u1, v, t0) => P(g, t, [sl(u0, v), sl(u1, v)], t0, .5, RED, 5);
  tr(.255, .335, .553, C.trace9); tr(.40, .46, .553, C.trace9 + .3); tr(.52, .58, .553, C.trace9 + .6);
  // the jump: a yellow wash over panel A's rise
  wash(g, t, YELLOW, ...sl(.345, .49), 150, C.jump9, { a: .7 });
  if (t > C.trace9 + 1) pen(g, ring(...sl(.31, .49), 84, 76, 2), seg(t, C.jump9 - .4, C.jump9 + .2), RED, 6);
  // the citation's slip: Illusion -> Mirage (struck at C4, the title written above)
  const ill = [sl(.61, .837), sl(.67, .837)];
  if (t > C.mirage9) { pen(g, ill, seg(t, C.mirage9, C.mirage9 + .3), RED, 5); L(g, t, T.mirage, ...sl(.64, .79), 40, RED, C.mirage9 + .3, null, { patch: .3, rot: -.04, fam: LAT }); }
  // the clipping (n3b): panel A, cut out and taped on bigger
  if (t > C.arith - .2) {
    const k = eo(seg(t, C.arith - .2, C.arith + .4)), a = 1 - seg(t, C.mirage9 - .2, C.mirage9 + .3);
    layer(g, a, (lg) => {
      const [x0, y0] = sl(.31, .49), cx = mix(x0, PA.x, k), cy = mix(y0, PA.y, k), w = mix(140, PA.w, k), rot = mix(0, .03, k);
      const cr = [0, 0, A.pA.width * .93, A.pA.height], pt = printout(lg, t, A.pA, cx, cy, w, rot, C.arith - .2, cr);
      tape(lg, t, 2, cx - w * .4, cy - w * .52, 180, -.35, C.arith + .3); tape(lg, t, 6, cx + w * .42, cy - w * .5, 150, .4, C.arith + .4);
      if (k < 1 || !pt) return;
      // GPT-3's curve (purple) on panel A: flat near zero, then up at 13B
      P(lg, t, [pt(.32, .87), pt(.69, .86)], C.arith + 1.0, .7, RED, 6);
      L(lg, t, T.flat, ...pt(.5, .78), 46, RED, C.arith + 1.4, null, { fam: LAT, patch: .3 });
      P(lg, t, [pt(.69, .86), pt(.715, .70), pt(.82, .415)], C.g13 - .2, .5, RED, 6);
      AR(lg, t, curve(...pt(.48, .5), ...pt(.695, .68), .2), C.g13, .4, RED, 5);
      L(lg, t, T.b13, ...pt(.38, .46), 52, RED, C.g13 + .1, null, { fam: LAT, patch: .3 });
      L(lg, t, T.jumpNote, ...pt(.84, .25), 44, RED, C.g13 + .6, null, { fam: LAT, rot: -.1 });
    }, 1);
  }
}
// P5 More Is Different: the essay card, the 1967 lecture card, UC San Diego
function p5(g, t) {
  const k1 = seg(t, C.essay, C.essay + 1.0);
  wash(g, t, YELLOW, 560, 640, 760, C.essay + .5, { a: .45, h: 300, rot: -.04 });
  noteCard(g, 160, 470, 920, 860, k1, { seed: 3 });
  L(g, t, T.essayT, 540, 590, ZH ? 92 : 96, INK, C.essay + .5, null, { fam: LAT });
  L(g, t, T.essayBy, 540, 700, ZH ? 54 : 56, INK, C.essay + 1.3, null);
  L(g, t, T.essayIn, 540, 780, ZH ? 46 : 48, RED, C.essay + 2.1, null);
  const k2 = seg(t, C.lajolla, C.lajolla + .8);
  if (k2 > 0) {
    g.save(); g.translate(330, 1090); g.rotate(-.04); noteCard(g, -230, -120, 230, 120, k2, { seed: 7 });
    L(g, t, T.lecture, 0, -44, ZH ? 44 : 48, INK, C.lajolla + .4, null);
    L(g, t, T.lecture2, 0, 36, ZH ? 58 : 64, RED, C.lajolla + 1.0, null); g.restore();
  }
  const b = draw(g, t, S.geisel, 790, 1110, 520, C.ucsd - .2, 1.6);
  wash(g, t, COBALT, ...b.at(.5, .55), 380, C.ucsd + .8, { a: .35 });
  L(g, t, T.ucsd, 790, 930, ZH ? 48 : 52, RED, C.ucsd + .9, null, { patch: .3 });
  L(g, t, T.ucsdSub, 790, 1290, ZH ? 38 : 40, INK, 95.2, null, { patch: .3 });
  AR(g, t, curve(560, 1090, 600, 980, -.3), C.ucsd + 1.3, .4, RED, 5);
}
// P6 one molecule, one wave
function p6(g, t) {
  L(g, t, T.physics, 80, 400, ZH ? 72 : 76, RED, 98.9, null, { align: 'left', rot: -.03 });
  const b = draw(g, t, S.wave, 540, 960, 1040, C.wave, 2.6);
  wash(g, t, ULTRA, ...b.at(.62, .45), 640, C.wave + 1.8, { a: .55, dur: 1.4 });
  wash(g, t, COBALT, ...b.at(.85, .7), 360, C.wave + 2.2, { a: .45 });
  L(g, t, T.one, 40, b.at(0, .55)[1], ZH ? 44 : 46, RED, C.wave + 2.6, null, { patch: .3, align: 'left' });
  AR(g, t, curve(...b.at(.07, .62), ...b.at(.05, .86), .1), C.wave + 2.9, .4, RED, 5);
  L(g, t, T.many, ...b.at(.5, .1), ZH ? 64 : 68, RED, C.wave + 3.3, null, { patch: .3 });
}
// P7 the Mirage paper: five digits at 90% each -> 59%; all-or-nothing vs partial credit; cliff vs slope
const DIG = ['3', '8', '4', '1', '7'];
function p7(g, t) {
  const fade = 1 - seg(t, C.either - .2, C.either + .3);
  layer(g, fade, (lg) => {
    const k = seg(t, C.paper23, C.paper23 + .9);
    noteCard(lg, 70, 330, 1010, 590, k, { seed: 11 });
    L(lg, t, T.paperT[0], 540, 400, 50, INK, C.paper23 + .3, null, { fam: LAT });
    L(lg, t, T.paperT[1], 540, 462, 50, INK, C.paper23 + .7, null, { fam: LAT });
    if (k > .6) sans(lg, T.paperBy, 540, 540, ZH ? 24 : 25, INK, .8 * seg(t, C.paper23 + 1.0, C.paper23 + 1.4));
    for (let i = 0; i < 5; i++) {
      const x = 180 + i * 180, y = 780, t0 = C.digits + i * .35;
      if (t < t0) continue;
      noteCard(lg, x - 70, y - 85, x + 70, y + 85, seg(t, t0, t0 + .5), { seed: 20 + i, r: 10 });
      L(lg, t, DIG[i], x, y + 4, 110, INK, t0 + .2, null, { fam: LAT, dur: .3 });
      L(lg, t, T.digit, x, y + 130, 48, RED, t0 + .45, null, { fam: LAT, dur: .3 });
      // partial credit: ticks on four, a cross on one
      if (t > C.partial) {
        const tk = seg(t, C.partial + .2 + i * .15, C.partial + .45 + i * .15);
        if (i === 3) { pen(lg, [[x - 40, y - 45], [x + 40, y + 45]], tk, RED, 7); pen(lg, [[x + 40, y - 45], [x - 40, y + 45]], seg(t, C.partial + .7, C.partial + .9), RED, 7); }
        else pen(lg, tickPts(x + 52, y - 70, 38), tk, RED, 6);
      }
    }
    // 0.9^5 = 0.59
    L(lg, t, T.all, 380, 1030, ZH ? 60 : 64, INK, C.x59 - .3, null);
    L(lg, t, T.p59, 690, 1028, 120, RED, C.x59, null, { fam: LAT, dur: .4 });
    if (t > C.x59 + .4) pen(lg, ring(690, 1028, 130, 72, 5), seg(t, C.x59 + .4, C.x59 + .9), RED, 6);
    wash(lg, t, YELLOW, 690, 1028, 340, C.x59 + .2, { a: .55, h: 200 });
    // the two rulers: all-or-nothing (a cliff) and partial credit (a slope)
    L(lg, t, T.aon, 300, 1140, ZH ? 44 : 46, INK, C.partial + .1, null);
    L(lg, t, T.part, 780, 1140, ZH ? 44 : 46, RED, C.partial + 1.0, null);
    const ax = (x0) => [[x0, 1176], [x0, 1262], [x0 + 300, 1262]];
    P(lg, t, ax(150), C.slope - .4, .4, INK, 4); P(lg, t, ax(630), C.slope - .4, .4, INK, 4);
    P(lg, t, [[160, 1256], [330, 1255], [345, 1186], [440, 1182]], C.slope, .6, INK, 6);
    P(lg, t, curve(640, 1256, 920, 1186, -.12), C.slope + .5, .7, RED, 6);
  });
  // n3f: either way
  if (t > C.either) {
    wash(g, t, YELLOW, 540, 820, 820, C.either + .2, { a: .4, h: 420 });
    L(g, t, T.either[0], 540, 700, ZH ? 96 : 100, INK, C.either + .2, null);
    L(g, t, T.either[1], 540, 830, ZH ? 96 : 100, RED, C.either + 1.0, null);
    L(g, t, T.either[2], 540, 960, ZH ? 96 : 100, INK, C.either + 1.8, null);
  }
}
// P8 her slide 10, whole; a blank sheet taped over the meme on its right (not reused: FACTS section 4), and the red
// corrections written on that sheet
function p8(g, t) {
  L(g, t, T.slide10, 150, 392, ZH ? 50 : 52, RED, C.tape10 + .4, null, { rot: -.06 });
  const sl = printout(g, t, A.p10, 540, 860, 1000, -.012, C.p8 + .7);
  tape(g, t, 1, 90, 486, 220, -.55, C.tape10); tape(g, t, 4, 990, 482, 230, .5, C.tape10 + .15);
  if (!sl) return;
  const U = (x) => x / 1650, V = (y) => y / 1275;
  // the sheet over the meme (slide x 820-1650, y 300-1150), slapped on with the slide
  const [nx, ny] = sl(U(1240), V(740)), nk = eo(seg(t, C.tape10 + .3, C.tape10 + .7));
  if (nk > 0) {
    g.save(); g.translate(nx, ny); g.rotate(.025); g.scale(mix(1.06, 1, nk), mix(1.06, 1, nk)); g.globalAlpha = nk;
    g.shadowColor = 'rgba(60,45,30,.22)'; g.shadowBlur = 14; g.shadowOffsetY = 5; g.fillStyle = css([252, 249, 241]);
    g.fillRect(-250, -250, 500, 500); g.restore();
    tape(g, t, 6, nx, ny - 252, 170, .04, C.tape10 + .55);
  }
  // sizes never published: the closed-model names struck through
  P(g, t, [sl(U(136), V(452)), sl(U(812), V(448))], C.fix1, .5, RED, 6);
  P(g, t, [sl(U(136), V(522)), sl(U(812), V(518))], C.fix1 + .3, .5, RED, 6);
  const n1 = ZH ? [T.fixSize] : ['sizes never', 'published'];
  n1.forEach((s2, i) => L(g, t, s2, nx, ny - 170 + i * 56, ZH ? 50 : 52, RED, C.fix1 + .6 + i * .4, null));
  AR(g, t, curve(nx - 150, ny - 150, ...sl(U(830), V(500)), .25), C.fix1 + 1.3, .4, RED, 5);
  // (Grok 3): one cluster
  if (t > C.fix2) pen(g, ring(...sl(U(720), V(695)), 58, 28, 9), seg(t, C.fix2, C.fix2 + .5), RED, 5);
  L(g, t, T.fixGpu, nx, ny + 10, fitPx(g, T.fixGpu, ZH ? 44 : 46, 500), RED, C.fix2 + .5, null);
  AR(g, t, curve(nx - 200, ny + 30, ...sl(U(780), V(700)), -.2), C.fix2 + .9, .4, RED, 5);
  // $500 Billion: planned, over 4 years
  P(g, t, [sl(U(350), V(808)), sl(U(575), V(806))], 142.6, .4, RED, 5);
  L(g, t, T.fixPlan, nx, ny + 150, fitPx(g, T.fixPlan, ZH ? 44 : 46, 500), RED, 142.9, null);
  AR(g, t, curve(nx - 200, ny + 160, ...sl(U(590), V(805)), .2), 143.3, .4, RED, 5);
}
// P9 the bill
function p9(g, t) {
  const b = draw(g, t, S.receipt, 760, 900, 560, C.p9 + .9, 2.2);
  wash(g, t, PEACH, ...b.at(.45, .4), 380, C.p9 + 1.6, { a: .4 });
  L(g, t, T.rTitle, 80, 380, ZH ? 84 : 90, INK, C.r1 - .4, null, { align: 'left', fam: ZH ? HAND : LAT });
  const item = (lines, y, t0, big) => {
    L(g, t, lines[0], 80, y, ZH ? 42 : 46, INK, t0, null, { align: 'left' });
    L(g, t, lines[1], 80, y + 68, fitPx(g, lines[1], big ? 74 : 64, 470), RED, t0 + .4, null, { align: 'left', fam: LAT });
    if (lines[2]) L(g, t, lines[2], 80, y + 124, 36, INK, t0 + .8, null, { align: 'left', alpha: .8 });
  };
  item(T.r1, 520, C.r1, true); item(T.r3, 780, C.r2, true);
  item(T.r4, 1000, C.r3, false);
  wash(g, t, YELLOW, 260, 1060, 400, C.r3 + .3, { a: .5, h: 150 });
  L(g, t, '?', 280, 1230, 150, RED, C.r4 + .4, null, { fam: LAT, rot: .1 });
}
// P10 a university lab (her clip C5)
function p10(g, t) {
  const b = draw(g, t, S.tiny, 520, 880, 700, C.p10 + .9, 2.6);
  wash(g, t, PEACH, ...b.at(.5, .5), 520, C.p10 + 2.0, { a: .35 });
  L(g, t, T.uni, 80, 352, ZH ? 66 : 72, INK, C.p10 + 1.6, null, { align: 'left', rot: -.03 });
  const pc = b.at(.72, .5);
  L(g, t, T.oneGpu, 760, 1190, ZH ? 54 : 58, RED, 167.6, null, { patch: .3 });
  AR(g, t, curve(740, 1150, pc[0] + 10, pc[1] + 70, .2), 167.9, .5, RED, 6);
}
// P11 her slide 11: the motto boxed and credited (her clip C6)
function p11(g, t) {
  L(g, t, T.slide11, 150, 392, ZH ? 50 : 52, RED, C.tape11 + .4, null, { rot: -.06 });
  const sl = printout(g, t, A.p11, 520, 830, 940, .01, C.p11 + .7);
  tape(g, t, 3, 110, 478, 230, -.5, C.tape11); tape(g, t, 7, 930, 474, 210, .5, C.tape11 + .15);
  if (!sl) return;
  const U = (x) => x / 1650, V = (y) => y / 1275;
  const bx = [sl(U(814), V(345)), sl(U(1534), V(345)), sl(U(1534), V(590)), sl(U(814), V(590)), sl(U(814), V(345))];
  P(g, t, bx, C.box11, .9, RED, 7);
  wash(g, t, YELLOW, ...sl(U(1170), V(468)), 560, C.box11 + .5, { a: .45, h: 200 });
  L(g, t, T.motto, 600, 1240, ZH ? 42 : 44, RED, C.box11 + 1.0, null, { patch: .3 });
  AR(g, t, curve(640, 1205, ...sl(U(1170), V(600)), .2), C.box11 + 1.3, .4, RED, 5);
  // right interpretation: algorithms that scale
  P(g, t, [sl(U(580), V(608)), sl(U(770), V(606))], C.right11, .3, RED, 6); P(g, t, [sl(U(184), V(656)), sl(U(370), V(654))], C.right11 + .3, .3, RED, 6);
}
// P12 why times: algorithms x44 and hardware x11 on the balance
function p12(g, t) {
  L(g, t, T.acc, 540, 380, fitPx(g, T.acc, ZH ? 76 : 72, 940), INK, C.p12 + .9, null, { fam: ZH ? HAND : LAT });
  const apx = fitPx(g, T.acc, ZH ? 76 : 72, 940, HW, ZH ? HAND : LAT), xi = T.acc.indexOf('×'), xx = 540 - textW(g, T.acc, apx, HW, ZH ? HAND : LAT) / 2 + textW(g, T.acc.slice(0, xi), apx, HW, ZH ? HAND : LAT) + textW(g, '×', apx, HW, ZH ? HAND : LAT) / 2;
  if (t > C.times) pen(g, ring(xx, 384, apx * .42, apx * .5, 4), seg(t, C.times, C.times + .4), RED, 6);
  const b = draw(g, t, S.balance, 540, 960, 900, C.p12 + 1.0, 2.2);
  const lp = b.at(.12, .66), rp = b.at(.88, .66);
  wash(g, t, COBALT, lp[0], lp[1] - 10, 320, C.alg, { a: .55, h: 160 });
  wash(g, t, YELLOW, rp[0], rp[1] - 10, 320, C.hw, { a: .6, h: 160 });
  L(g, t, T.alg, lp[0], lp[1] - 120, ZH ? 54 : 56, INK, C.alg, null, { patch: .3 });
  L(g, t, T.algX, lp[0], lp[1] - 40, 92, RED, C.alg + .5, null, { fam: LAT });
  L(g, t, T.hw, rp[0] - 40, rp[1] - 120, ZH ? 54 : 56, INK, C.hw, null, { patch: .3 });
  L(g, t, T.hwX, rp[0] - 40, rp[1] - 40, 92, RED, C.hw + .5, null, { fam: LAT });
  sans(g, T.alg7, 540, 452, ZH ? 26 : 26, INK, .75 * seg(t, C.alg + .8, C.alg + 1.3));
  L(g, t, T.mult, 540, 530, ZH ? 58 : 60, RED, C.times + .4, null, { patch: .3 });
}
// P13 DeepMind 2022: 400+ models, then the giant and the small one
function p13(g, t) {
  L(g, t, T.dm, 80, 360, ZH ? 66 : 70, INK, C.p13 + 1.0, C.score - .6, { align: 'left' });
  const out = 1 - seg(t, C.teams - .3, C.teams + .2);
  layer(g, out, (lg) => {
    if (t > C.grid400) for (let i = 0; i < 84; i++) {
      const r = Math.floor(i / 12), c = i % 12, t0 = C.grid400 + i * .025 + hs(i * 1.7) * .25;
      if (t < t0) continue;
      put(lg, A.bot, 177 + c * 66 + (r % 2) * 14, 520 + r * 64, 40, { s: mix(1.5, 1, spring(t - t0, 9, 15)) });
    }
    L(lg, t, T.m400, 540, 960, ZH ? 70 : 74, RED, C.grid400 + 1.4, null, { patch: .3 });
    L(lg, t, T.rule[0], 540, 1080, ZH ? 66 : 70, INK, C.rule, null);
    L(lg, t, T.rule[1], 540, 1170, ZH ? 66 : 70, RED, C.rule + 1.2, null);
  });
  if (t < C.teams - .3) return;
  const b = draw(g, t, S.teams, 540, 900, 1000, C.teams, 2.0);
  wash(g, t, COBALT, ...b.at(.22, .5), 420, C.teams + 1.0, { a: .35 });
  wash(g, t, CORAL, ...b.at(.86, .7), 360, C.teams + 1.4, { a: .35 });
  L(g, t, T.giant, ...b.at(.22, -.06), 74, INK, C.teams + 1.6, null, { fam: LAT, patch: .3 });
  L(g, t, T.small, 800, 700, 74, RED, C.teams + 3.0, null, { fam: LAT, patch: .3 });
  L(g, t, T.data4, 760, 1000, ZH ? 50 : 52, RED, C.books, null, { patch: .3 });
  const env = b.at(.62, .94);
  L(g, t, T.budget, env[0], 1250, ZH ? 46 : 46, INK, C.books + 1.6, C.cheap - .4, { patch: .3 });
  // the 57-subject exam
  sans(g, T.exam, 540, 312, ZH ? 30 : 30, INK, .8 * seg(t, C.score - .3, C.score + .2));
  L(g, t, T.s60, ...b.at(.22, -.2), 84, INK, C.score, null, { fam: LAT });
  L(g, t, T.s68, 800, 600, 96, RED, C.score + .8, null, { fam: LAT });
  if (t > C.score + 1.2) pen(g, ring(800, 600, 120, 60, 8), seg(t, C.score + 1.2, C.score + 1.7), RED, 6);
  L(g, t, T.cheaper, 540, 1250, ZH ? 46 : 48, RED, C.cheap, null, { patch: .3 });
}
// P14 the course: a road with stops (her clip C7), compute not included
const STOPS = [[.562, .855], [.574, .675], [.669, .511], [.329, .363], [.69, .265], [.351, .172], [.531, .044]];
function p14(g, t) {
  const b = draw(g, t, S.map, 540, 862, 640, C.road, 3.0);
  wash(g, t, SAGE, ...b.at(.3, .5), 520, C.road + 1.4, { a: .35 });
  wash(g, t, SAGE, ...b.at(.75, .3), 420, C.road + 1.8, { a: .3 });
  L(g, t, T.course, ...b.at(.66, -.03), 52, RED, C.road + 2.6, null, { fam: LAT, patch: .3 });
  const labels = T.stops.slice(0, 6).concat([T.stops[7]]);
  STOPS.forEach(([u, v], i) => {
    const t0 = 239.0 + i * .9, [x, y] = b.at(u, v), right = u < .5;
    L(g, t, labels[i], x + (right ? -70 : 70), y - 2, ZH ? 40 : 42, RED, t0, null, { patch: .3, align: right ? 'right' : 'left' });
  });
  L(g, t, T.notIncl, 330, 1236, ZH ? 58 : 60, RED, C.notIncl, null, { patch: .35, rot: -.03 });
}
const PANELS = [p0, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12, p13, p14];

// ------------------------------------------------------------------ her voice: the mic tag while a clip plays
function micTag(g, t) {
  for (const v of TL.vo) {
    if (v.id[0] !== 'c' || !VO || !VO[v.id]) continue;
    const r = VO[v.id], a = fadeIO(t, r.t - .15, r.t + r.dur, .3, .4); if (a <= 0) continue;
    g.save(); g.globalAlpha = a;
    wash(g, t, CORAL, 960, 410, 220, r.t - .3, { a: .55, rot: .3 });
    put(g, paint(S.mic, seg(t, r.t - .15, r.t + .5)), 960, 405, 120);
    g.restore();
    L(g, t, T.mic, 890, 545, ZH ? 34 : 36, RED, r.t, r.t + r.dur, { align: 'right', patch: .3 });
  }
}

// ------------------------------------------------------------------ the end card: the real logo printed on the paper
function endCard(g, t) {
  if (t < C.endCard) return;
  const loop = DUR - .6, up = eio(seg(t, C.endCard, C.endCard + .55)), away = eio(seg(t, loop, DUR - .02)), y = mix(H, 0, up) - away * H;
  g.save(); g.translate(0, y);
  g.fillStyle = css([252, 249, 242]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'multiply'; for (let ty = 0; ty < H; ty += A.paper.height) for (let tx = 0; tx < W; tx += A.paper.width) g.drawImage(A.paper, tx, ty); g.restore();
  const L0 = A.logo, lw = 700, lh = lw * L0.height / L0.width, lx = 540 - lw / 2, ly = 400, k0 = t - C.endCard - .4;
  const parts = [[0, 230, 410, 640], [370, 0, 790, 420], [760, 230, 1168, 640], [330, 600, 860, 720]];
  g.save(); g.globalCompositeOperation = 'multiply';
  parts.forEach(([u0, v0, u1, v1], i) => {
    const kk = spring((k0 - i * .12) * 1.0, 5.2, 8.5); if (k0 - i * .12 <= 0) return;
    const cx = lx + (u0 + u1) / 2 / L0.width * lw, cy = ly + (v0 + v1) / 2 / L0.height * lh, pw = (u1 - u0) / L0.width * lw, ph = (v1 - v0) / L0.height * lh;
    g.save(); g.translate(cx, cy); g.scale(kk, kk); g.drawImage(L0, u0, v0, u1 - u0, v1 - v0, -pw / 2, -ph / 2, pw, ph); g.restore();
  });
  g.restore();
  const e = T.end, e0 = C.endCard + .9;
  L(g, t, e[0], 540, 1030, fitPx(g, e[0], ZH ? 48 : 52, 900), INK, e0, null, { dur: .5 });
  L(g, t, e[1], 540, 1118, fitPx(g, e[1], ZH ? 60 : 66, 860), RED, e0 + .35, null, { dur: .45, fam: ZH ? HAND : LAT });
  L(g, t, e[2], 540, 1200, fitPx(g, e[2], ZH ? 42 : 46, 860), INK, e0 + .7, null, { dur: .45 });
  if (t > e0 + .65) pen(g, curve(360, 1153, 720, 1148, .02), seg(t, e0 + .65, e0 + 1.0), RED, 4);
  const fa = .78 * eo(seg(t, e0 + 1.1, e0 + 1.6));
  if (fa > 0) T.fine.forEach((s2, i) => { const px = fitPx(g, s2, ZH ? 20 : 20, 960, SW, SANS); sans(g, s2, 540, 1300 + i * 32, px, INK, fa); });
  g.restore();
}

// ------------------------------------------------------------------ captions: parts timed on word marks (clips: on length)
const normS = (s) => s.toLowerCase().replace(/[^0-9a-z㐀-鿿]/g, '');
const CAPT = {};
function capParts(id) {
  if (CAPT[id]) return CAPT[id];
  const r = VO[id], parts = (T.cap[id] || '').split('|'), words = r.words || [], out = [];
  if (!words.length) {   // her clips: parts share the clip's length by their number of letters
    const lens = parts.map((p) => Math.max(1, normS(p).length)), tot = lens.reduce((a, b) => a + b, 0); let acc = 0;
    parts.forEach((p, k) => { out.push({ s: p, t0: r.t + r.dur * acc / tot }); acc += lens[k]; });
  } else {
    let wi = 0, acc = 0;
    parts.forEach((p, k) => {
      if (k === 0) { out.push({ s: p, t0: r.t }); return; }
      const target = parts.slice(0, k).reduce((s, q) => s + normS(q.replace(/\//g, '')).length, 0);
      while (wi < words.length && acc + normS(words[wi][2]).length <= target * .98 + .5) { acc += normS(words[wi][2]).length; wi++; }
      let j = wi; const want = normS(p.replace(/\//g, '')), first = normS(p.trim().split(/[\s\/]+/)[0]), latin = /^[0-9a-z]/i.test(p.trim());
      const ok = (w) => { const n = normS(w); return n.length && (latin ? n === first || (want.startsWith(n) && n.length >= first.length) : want.startsWith(n)); };
      for (const d of [0, 1, -1, 2, -2, 3]) { const q = wi + d; if (q > 0 && q < words.length && ok(words[q][2])) { j = q; break; } }
      out.push({ s: p, t0: words[Math.min(j, words.length - 1)][0] });
    });
  }
  out.forEach((o, k) => { o.t1 = k + 1 < out.length ? out[k + 1].t0 - .04 : r.t + r.dur + .25; });
  return (CAPT[id] = out);
}
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) { const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    for (const p of capParts(v.id)) if (t >= p.t0 - .05 && t <= p.t1) return { s: p.s, her: v.id[0] === 'c' }; }
  return null;
}
const CAPX = 500, CAPW = 704;
function capRows(g, s, px, wt, fam) {
  g.font = `${wt} ${px}px ${fam}`;
  const rows = s.split('/').map((r) => r.trim());
  if (rows.length > 1 || g.measureText(rows[0]).width <= CAPW) return rows;
  const r = rows[0];
  if (!ZH) {
    let best = null, bw = 1e9;
    for (let i = 1; i < r.length; i++) if (r[i] === ' ') { const d = Math.abs(g.measureText(r.slice(0, i)).width - g.measureText(r.slice(i + 1)).width); if (d < bw) { bw = d; best = i; } }
    return best ? [r.slice(0, best), r.slice(best + 1)] : rows;
  }
  const mid = r.length / 2; let cut = -1, bd = 1e9;
  for (let i = 1; i < r.length - 1; i++) if ('，、：；'.includes(r[i]) && Math.abs(i + 1 - mid) < bd && Math.abs(i + 1 - mid) <= r.length * .3) { bd = Math.abs(i + 1 - mid); cut = i + 1; }
  if (cut < 0) { cut = Math.round(mid); while (cut < r.length && '，。、：；？！）」'.includes(r[cut])) cut++; }
  return [r.slice(0, cut), r.slice(cut)];
}
// her words: italic-free, but set in red ink with a red border, so they read as hers (the narrator's are black)
function captions(g, t) {
  const c = captionAt(t); if (!c) return;
  const px = ZH ? 50 : 46, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.28;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  const rows = capRows(g, c.s, px, wt, fam), fs = rows.map((r) => Math.min(px, fitPx(g, r, px, CAPW, wt, fam)));
  const wmax = Math.max(...rows.map((r, i) => { g.font = `${wt} ${fs[i]}px ${fam}`; return g.measureText(r).width; })), cy = 1370 - (rows.length - 1) * lh / 2;
  g.fillStyle = css(PAPER, .95); g.strokeStyle = css(c.her ? RED : INK, .9); g.lineWidth = 3;
  g.beginPath(); g.roundRect(CAPX - wmax / 2 - 28, cy - lh / 2 - 11, wmax + 56, rows.length * lh + 22, 16); g.fill(); g.stroke();
  rows.forEach((r, i) => { g.font = `${wt} ${fs[i]}px ${fam}`; g.fillStyle = css(c.her ? [150, 36, 26] : INK); g.fillText(r, CAPX, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1300, 760, 140, '#ffd24d'); g.restore(); }

// ------------------------------------------------------------------ setup
async function setup() {
  TL = await (await fetch('timeline.json')).json(); C = TL.cue;
  if (Math.abs(TL.dur - DUR) > .01) throw new Error('timeline.json dur ' + TL.dur + ' != film.js DUR ' + DUR);
  try { VO = await (await fetch(`vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  await document.fonts.load('700 60px Caveat');
  const names = ['line_chat_first', 'line_lab_2017', 'line_grow', 'line_chicken_egg', 'line_wave', 'line_receipt', 'line_tiny_lab', 'line_two_teams', 'line_balance', 'line_course_map', 'line_mic', 'line_geisel'];
  const im = await Promise.all(names.map(art));
  const [chat, lab, grow, egg, wave, rec, tiny, teams, bal, map, mic, gei] = im;
  S.chat = sprite(chat, 700 / chat.width, .2); S.lab = sprite(lab, 1040 / lab.width, .2); S.grow = sprite(grow, 1040 / grow.width, .2);
  S.egg = sprite(egg, 1040 / egg.width, .2); S.wave = sprite(wave, 1040 / wave.width, .2); S.receipt = sprite(rec, 560 / rec.width, .2);
  S.tiny = sprite(tiny, 700 / tiny.width, .2); S.teams = sprite(teams, 1000 / teams.width, .2); S.balance = sprite(bal, 900 / bal.width, .2);
  S.map = sprite(map, 700 / map.width, .25); S.mic = sprite(mic, 240 / mic.width, .3); S.geisel = sprite(gei, 520 / gei.width, .3);
  // the smallest robot of line_grow, finished, as a stamp (the 400 models)
  const gb = paint(sprite(grow, 1, .3), 1), bc = mk(100, 144); bc.getContext('2d').drawImage(gb, 50, 600, 135, 195, 0, 0, 100, 144); A.bot = bc;
  const [paper, logo, w, tp, p09, p10, p11, pA] = await Promise.all([loadImg('/scene/tex/Paper001/Paper001_2K-JPG_Color.jpg'), loadImg('/edu/art/brand/picasso_logo.png'),
    loadImg('/edu/art/src/wash_swatches.png'), loadImg('/edu/art/src/tape_strips.png'),
    loadImg('../slides/p09.png'), loadImg('../slides/p10.png'), loadImg('../slides/p11.png'), loadImg('../slides/p09_panelA.png')]);
  Object.assign(A, { logo, wash: w, tape: tp, p09, p10, p11, pA });
  const pcv = mk(paper.width, paper.height), pg = pcv.getContext('2d', { willReadFrequently: true }); pg.drawImage(paper, 0, 0);
  const id = pg.getImageData(0, 0, pcv.width, pcv.height), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const v = Math.min(255, (d[j] * .2126 + d[j + 1] * .7152 + d[j + 2] * .0722) * 255 / 243); const l = 255 - (255 - v) * 1.6; d[j] = d[j + 1] = d[j + 2] = Math.max(0, l); }
  pg.putImageData(id, 0, 0); A.paper = pcv;
  const K = camKeys(); CT = K.map((k) => k[0]); CX = K.map((k) => k[1]); CY = K.map((k) => k[2]); CZ = K.map((k) => Math.log(k[3]));
  if (ZH) await Promise.all(['400 100px "ZCOOL KuaiLe"', '700 52px "Noto Sans SC"'].map((f) => document.fonts.load(f, '多就不一样丁老师第讲原声')));
  if (MISSING.length) console.log('placeholders: ' + MISSING.join(' '));
}

defineScene({
  meta: { title: 'L01 Background line film', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 7, background: css(PAPER), fonts: ['Caveat', 'Inter'], poster: 0 },
  setup,
  layers: [{ name: 'sheet', type: '2d', draw(ctx, g) {
    const t = ctx.sec;
    g.fillStyle = css(PAPER); g.fillRect(0, 0, W, H);
    if (t >= DUR - .65) {   // under the end card as it lifts: the cover again (the loop lands on frame 0)
      p0(g, 0); grain(g, { x: 540, y: 960, z: 1 });
    } else {
      const cam = camAt(t);
      g.save(); g.translate(540, 960); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      PANELS.forEach((fn, k) => { if (Math.abs(cam.y - (PY(k) + 960)) < 960 / cam.z + 1000) { g.save(); g.translate(0, PY(k)); fn(g, t); g.restore(); } });
      grain(g, cam);
      g.restore();
      micTag(g, t);
    }
    endCard(g, t);
  } }],
  post(ctx, g) { if (CAPS && ctx.sec < C.endCard) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
