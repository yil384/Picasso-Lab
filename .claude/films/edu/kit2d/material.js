// kit2d/material.js - paper-theatre materials for 2D frames: procedural paper and felt fibre textures, hand-cut wobbly
// polygons, felt fuzz, thread stitches, organic splines and tapered strips, torn paper edges, and baked sprites with a
// soft drop shadow. Everything is deterministic: a sprite is baked once from a seed, so nothing boils unless a scene
// asks it to (per-step jitter of whole pieces, see stage.js / cat.js).
//
// Ported and adapted from MIT-licensed code (full notices in THIRD_PARTY.md):
//   ledbetterljoshua/bohemian-tokenry-video, video/styles/papertheater/kit.js  (c) 2026 Joshua Ledbetter
//     - texture tiles, polygon kit (rrect, ellipseP, polarP, densify, wobble), cut(), fuzz(), bake(), spr()
//   illodev/drawn-by-code, styles/paper-cutout/paper.js + detail.js            (c) 2026 illodev
//     - resample(), torn() (torn paper edges), spline(), cspline(), taper(), shade()
// Changes: ES module, explicit seeds instead of call-order randomness, origin-mode sprites (bake a box in a part's own
// coordinates and draw it at the rig's origin), thread stitches drawn stitch by stitch with a shadow, felt tiles that
// work on white felt, one texture cache per page.

export const PI = Math.PI, TAU = PI * 2;
export const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a, b, k) => a + (b - a) * k;
export const sst = (a, b, x) => { const k = cl((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const eio = (k) => { k = cl(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
export const eo = (k) => 1 - Math.pow(1 - cl(k), 3);
export const ei = (k) => Math.pow(cl(k), 3);
/** Hash of a number to [0,1). */
export const hs = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const h2 = (a, b) => hs(a * 57.31 + b * 13.17 + .71);
export function strHash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/** mulberry32 from a number or a string. */
export function rngFrom(seed) {
  let s = (typeof seed === 'number' ? seed : strHash(seed)) >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let q = s; q = Math.imul(q ^ q >>> 15, q | 1); q ^= q + Math.imul(q ^ q >>> 7, q | 61); return ((q ^ q >>> 14) >>> 0) / 4294967296; };
}
/** Drawings per second for stop-motion pieces: 15 = on twos at the series' 30 fps (12 for 24 fps films). */
export let DRAW_FPS = 15;
export function drawRate(fps) { DRAW_FPS = fps; }
/** Drawing step (which stop-motion drawing is showing) and the time of that step. */
export const step = (t, fps = DRAW_FPS) => Math.floor(t * fps + 1e-6);
export const twos = (t, fps = DRAW_FPS) => step(t, fps) / fps;
export const spring = (x, k = 7, w = 13) => x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x);
export const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
export const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// ---------- colour ----------
export function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hexToHsl(hex) {
  const [r0, g0, b0] = hexRgb(hex), r = r0 / 255, g = g0 / 255, b = b0 / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) { const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  return [h, s * 100, l * 100];
}
/** Lighter/darker version of a hex colour (dl, ds in HSL percent). Returns hex. (drawn-by-code detail.js) */
export function shade(hex, dl, ds = 0) {
  const [h, s0, l0] = hexToHsl(hex);
  const s = cl((s0 + ds) / 100), l = cl((l0 + dl) / 100);
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------- texture tiles (512 px, wrap-around, built once per page) ----------
let TX = null;
function wrapDraw(size, x, y, r, fn) { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue; fn(x + dx, y + dy); } }
/** { PAPER, FELT, FELTW, GRAIN }: cardstock fibres, felt fibres (for coloured felt), felt fibres for white felt, grain. */
export function textures() {
  if (TX) return TX;
  const N = 512;
  const PAPER = mk(N, N); { const x = PAPER.getContext('2d'), r = rngFrom(11);
    for (let i = 0; i < 320; i++) { const px = r() * N, py = r() * N, rad = 16 + r() * 60, d = r() < .5;
      wrapDraw(N, px, py, rad, (X, Y) => { const g = x.createRadialGradient(X, Y, 0, X, Y, rad); g.addColorStop(0, d ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.07)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(X - rad, Y - rad, rad * 2, rad * 2); }); }
    x.lineCap = 'round';
    for (let i = 0; i < 4200; i++) { const px = r() * N, py = r() * N, L = 3 + r() * 16, a = r() * TAU, d = r() < .45, cu = (r() - .5) * 8;
      x.strokeStyle = d ? `rgba(40,20,0,${.05 + r() * .09})` : `rgba(255,255,245,${.07 + r() * .12})`; x.lineWidth = .4 + r() * .8;
      wrapDraw(N, px, py, L, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + Math.cos(a) * L * .5 - Math.sin(a) * cu, Y + Math.sin(a) * L * .5 + Math.cos(a) * cu, X + Math.cos(a) * L, Y + Math.sin(a) * L); x.stroke(); }); }
    for (let i = 0; i < 9000; i++) { x.fillStyle = r() < .5 ? `rgba(0,0,0,${r() * .12})` : `rgba(255,255,255,${r() * .12})`; x.fillRect(r() * N, r() * N, 1, 1); } }
  const felt = (seed, dark, light, nb, nf) => { const c = mk(N, N), x = c.getContext('2d'), r = rngFrom(seed);
    for (let i = 0; i < nb; i++) { const px = r() * N, py = r() * N, rad = 10 + r() * 40, d = r() < .5;
      wrapDraw(N, px, py, rad, (X, Y) => { const g = x.createRadialGradient(X, Y, 0, X, Y, rad); g.addColorStop(0, d ? `rgba(${dark},.08)` : `rgba(${light},.08)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(X - rad, Y - rad, rad * 2, rad * 2); }); }
    x.lineCap = 'round';
    for (let i = 0; i < nf; i++) { const px = r() * N, py = r() * N, L = 1.5 + r() * 5, a = r() * TAU, d = r() < .5, cu = (r() - .5) * 5;
      x.strokeStyle = d ? `rgba(${dark},${.08 + r() * .12})` : `rgba(${light},${.07 + r() * .14})`; x.lineWidth = .35 + r() * .5;
      wrapDraw(N, px, py, L, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + cu, Y - cu, X + Math.cos(a) * L, Y + Math.sin(a) * L); x.stroke(); }); }
    return c; };
  const FELT = felt(23, '30,5,0', '255,240,220', 200, 14000);
  // white felt: cool grey fibres and pure white ones (warm-brown fibres read as dirt on white)
  const FELTW = felt(29, '150,148,160', '255,255,255', 260, 16000);
  const GRAIN = mk(256, 256); { const x = GRAIN.getContext('2d'), id = x.createImageData(256, 256), r = rngFrom(5);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (r() - .5) * 150; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); }
  TX = { PAPER, FELT, FELTW, GRAIN };
  return TX;
}

// ---------- polygon kit ----------
export function segP(pts, x0, y0, x1, y1, step) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step)); for (let i = 0; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); }
export function arcP(pts, cx, cy, rx, ry, a0, a1, step) { const n = Math.max(2, Math.ceil(Math.max(rx, ry) * Math.abs(a1 - a0) / step)); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } }
export function rrect(x, y, w, h, r, step = 3) { r = Math.min(r, w / 2, h / 2); const p = [];
  segP(p, x + r, y, x + w - r, y, step); arcP(p, x + w - r, y + r, r, r, -PI / 2, 0, step); segP(p, x + w, y + r, x + w, y + h - r, step); arcP(p, x + w - r, y + h - r, r, r, 0, PI / 2, step);
  segP(p, x + w - r, y + h, x + r, y + h, step); arcP(p, x + r, y + h - r, r, r, PI / 2, PI, step); segP(p, x, y + h - r, x, y + r, step); arcP(p, x + r, y + r, r, r, PI, 1.5 * PI, step); return p; }
export const ellipseP = (cx, cy, rx, ry, step = 3) => { const p = []; arcP(p, cx, cy, rx, ry, 0, TAU, step); return p; };
export function polarP(cx, cy, rx, ry, fn, step = 3) { const n = Math.ceil(Math.max(rx, ry) * TAU / step), p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = fn(a); p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return p; }
export function densify(pts, step, closed = true) { const p = []; const n = closed ? pts.length : pts.length - 1; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; segP(p, a[0], a[1], b[0], b[1], step); } if (!closed) p.push(pts[pts.length - 1]); return p; }
export function starP(cx, cy, r1, r2, n = 5, rot = -PI / 2) { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * PI / n, r = i % 2 ? r2 : r1; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return densify(p, 3); }
export const xform = (pts, fn) => pts.map(([x, y]) => fn(x, y));
export const mirrorX = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
/** Hand-cut edge: low-frequency wander plus rare nicks along the outline normal. `r` is an rng (rngFrom). */
export function wobble(pts, amp, r) {
  if (!r) throw new Error('wobble needs an rng (rngFrom(seed)): call-order randomness would boil');
  const ph = [r() * TAU, r() * TAU, r() * TAU], n = pts.length;
  return pts.map((p, i) => { const u = i / n * TAU; let o = amp * (.5 * Math.sin(u * 3 + ph[0]) + .3 * Math.sin(u * 8 + ph[1]) + .25 * Math.sin(u * 23 + ph[2])); if (r() < .025) o += amp * 1.4 * (r() - .5);
    const q = pts[(i + 1) % n], pr = pts[(i - 1 + n) % n]; let nx = q[1] - pr[1], ny = -(q[0] - pr[0]); const L = Math.hypot(nx, ny) || 1; return [p[0] + nx / L * o, p[1] + ny / L * o]; });
}
export function toPath(polys, closed = true) { if (!Array.isArray(polys[0][0])) polys = [polys]; const p = new Path2D(); for (const pts of polys) { p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]); if (closed) p.closePath(); } return p; }
export function bbox(polys) { if (!Array.isArray(polys[0][0])) polys = [polys]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const ps of polys) for (const [x, y] of ps) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; }

// organic shapes (drawn-by-code detail.js)
/** Closed (or open) Catmull-Rom spline through control points. */
export function spline(pts, n = 10, closed = true) {
  const out = [], m = pts.length, get = (i) => (closed ? pts[((i % m) + m) % m] : pts[Math.max(0, Math.min(m - 1, i))]), last = closed ? m : m - 1;
  for (let i = 0; i < last; i++) { const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((a) => .5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3))); } }
  if (!closed) out.push(pts[m - 1]);
  return out;
}
/** Centripetal Catmull-Rom: never overshoots where a long segment meets a short one. */
export function cspline(pts, n = 8, closed = true) {
  const out = [], m = pts.length, get = (i) => (closed ? pts[((i % m) + m) % m] : pts[Math.max(0, Math.min(m - 1, i))]), last = closed ? m : m - 1;
  const lp = (a, b, ta, tb, t) => { const k = tb - ta < 1e-6 ? 0 : (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; };
  for (let i = 0; i < last; i++) {
    let p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    if (!closed && i === 0) p0 = [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
    if (!closed && i === last - 1) p3 = [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
    const t0 = 0, t1 = t0 + Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])) + 1e-4, t2 = t1 + Math.sqrt(Math.hypot(p2[0] - p1[0], p2[1] - p1[1])) + 1e-4, t3 = t2 + Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) + 1e-4;
    for (let k = 0; k < n; k++) { const t = t1 + ((t2 - t1) * k) / n; const a1 = lp(p0, p1, t0, t1, t), a2 = lp(p1, p2, t1, t2, t), a3 = lp(p2, p3, t2, t3, t); out.push(lp(lp(a1, a2, t0, t2, t), lp(a2, a3, t1, t3, t), t1, t2, t)); }
  }
  if (!closed) out.push(pts[m - 1]);
  return out;
}
/** Tapered strip with round caps along a centreline (tails, stems, tentacles): widths per control point. */
export function taper(ctrl, widths, n = 8) {
  const pts = spline(ctrl, n, false);
  const ws = pts.map((_, i) => { const u = Math.min(ctrl.length - 1, i / n), k = Math.floor(u), f = u - k; return widths[k] + ((widths[Math.min(k + 1, widths.length - 1)] ?? widths[k]) - widths[k]) * f; });
  const m = pts.length, L = [], R = [], T = [];
  for (let i = 0; i < m; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(m - 1, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d;
    T.push([tx, ty]); L.push([pts[i][0] - ty * ws[i] / 2, pts[i][1] + tx * ws[i] / 2]); R.push([pts[i][0] + ty * ws[i] / 2, pts[i][1] - tx * ws[i] / 2]); }
  const cap = (p, t, w, dir) => Array.from({ length: 11 }, (_, k) => { const th = ((k + 1) / 12) * PI, nx = -t[1] * dir, ny = t[0] * dir; return [p[0] + w * (Math.cos(th) * nx + Math.sin(th) * t[0] * dir), p[1] + w * (Math.cos(th) * ny + Math.sin(th) * t[1] * dir)]; });
  return [...L, ...cap(pts[m - 1], T[m - 1], ws[m - 1] / 2, 1), ...R.reverse(), ...cap(pts[0], T[0], ws[0] / 2, -1)];
}
/** Inset (or outset, d < 0) a closed outline along its normals (for stitch lines just inside an edge). */
export function inset(pts, d) {
  const n = pts.length; let area = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1;
  return pts.map((p, i) => { const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; let nx = -(b[1] - a[1]) * sg, ny = (b[0] - a[0]) * sg; const L = Math.hypot(nx, ny) || 1; return [p[0] + nx / L * d, p[1] + ny / L * d]; });
}

/** The longest cyclic run of a closed outline whose points satisfy pred, in order (an open polyline: a seam that
 *  stops short of an edge, a stitch along a brim only). */
export function runWhere(pts, pred) {
  const n = pts.length, ok = pts.map(pred); if (ok.every(Boolean)) return pts.slice(); if (!ok.some(Boolean)) return [];
  let best = [], i0 = ok.findIndex((v) => !v);
  for (let k = 1, cur = []; k <= n; k++) { const i = (i0 + k) % n; if (ok[i]) cur.push(pts[i]); else { if (cur.length > best.length) best = cur; cur = []; } if (k === n && cur.length > best.length) best = cur; }
  return best;
}

// torn paper (drawn-by-code paper.js)
function loopNoise1(seed, knots) { const r = rngFrom(seed), v = Array.from({ length: knots }, () => r() * 2 - 1);
  return (u) => { const x = (((u % 1) + 1) % 1) * knots, i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return v[i % knots] + (v[(i + 1) % knots] - v[i % knots]) * s; }; }
/** Even resampling of a closed outline with outward normals. */
export function resample(poly, step) {
  const n = poly.length, seg = []; let L = 0;
  for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], d = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push(d); L += d; }
  const m = Math.max(12, Math.round(L / step)), pts = []; let si = 0, acc = 0;
  for (let k = 0; k < m; k++) { const target = (k * L) / m; while (si < n - 1 && acc + seg[si] < target) acc += seg[si++]; const t = seg[si] ? (target - acc) / seg[si] : 0, a = poly[si], b = poly[(si + 1) % n]; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  let ar = 0; for (let i = 0; i < m; i++) { const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % m]; ar += x1 * y2 - x2 * y1; }
  const sign = ar > 0 ? 1 : -1;
  const nrm = pts.map((_, i) => { const a = pts[(i - 1 + m) % m], b = pts[(i + 1) % m], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [(sign * dy) / d, (-sign * dx) / d]; });
  return { pts, nrm, L };
}
/** A torn edge: the outline pushed out by `offset` (slowly varying by offVar) plus a fine jag and the odd bite. */
export function torn(poly, seed, { offset = 0, offVar = 0, jag = .9, step = 2.2 } = {}) {
  const res = resample(poly, step), r = rngFrom(seed), low = loopNoise1(seed + ':low', Math.max(5, Math.round(res.L / 70))), m = res.pts.length;
  return res.pts.map((p, i) => { let o = offset * (1 + offVar * low(i / m)) + (r() * 2 - 1) * jag; if (r() < .05) o -= r() * jag * 2.2; return [p[0] + res.nrm[i][0] * o, p[1] + res.nrm[i][1] * o]; });
}

// ---------- cutting pieces ----------
// While a sprite bakes, BK is its pixel scale (texture and shadow sizes stay in pixels) and R its rng.
let BK = 1, R = rngFrom(1);
/** The rng of the sprite being baked (for wobble etc. inside a bake callback). */
export const bakeRng = () => R;
/**
 * Cut a piece of paper or felt: fill + fibre texture + top-light shading + light core edge (+ felt fuzz).
 * o: felt (felt texture) | white (white-felt texture) | halo (soft blurred outline colour: wool) | haloW, haloB | tex (texture alpha) | ts (texture scale) | hi, lo (shading) |
 *    shade:false | edge (CSS colour or false) | ew | fuzz (fibre length) | fuzzColor | fuzzDensity | sh (drop shadow
 *    alpha inside the sprite, 0 = none) | sb, sx, sy (its blur/offset) | rule ('evenodd' for holes)
 */
export function cut(x, polys, color, o = {}) {
  const T = textures(), p = toPath(polys), rule = o.rule || 'nonzero';
  if (o.halo) { x.save(); x.filter = `blur(${(o.haloB ?? 2) * BK}px)`; x.strokeStyle = o.halo; x.lineWidth = o.haloW ?? 4; x.lineJoin = 'round'; x.stroke(p); x.restore(); }
  x.save(); if (o.sh !== 0) { x.shadowColor = `rgba(25,10,5,${o.sh ?? .45})`; x.shadowBlur = (o.sb ?? 5) * BK; x.shadowOffsetX = (o.sx ?? 2.5) * BK; x.shadowOffsetY = (o.sy ?? 3.5) * BK; }
  x.fillStyle = color; x.fill(p, rule); x.restore();
  x.save(); x.clip(p, rule);
  const tile = o.white ? T.FELTW : o.felt ? T.FELT : T.PAPER;
  const P = x.createPattern(tile, 'repeat'); P.setTransform(new DOMMatrix().translate(R() * 500, R() * 500).scale((o.ts ?? 1.3) / BK));
  x.globalAlpha = o.tex ?? 1; x.fillStyle = P; x.fill(p, rule); x.globalAlpha = 1;
  if (o.shade !== false) { const b = bbox(polys), g = x.createLinearGradient(0, b.y0, 0, b.y1); g.addColorStop(0, `rgba(255,240,220,${o.hi ?? .1})`); g.addColorStop(1, `rgba(40,10,0,${o.lo ?? .18})`); x.fillStyle = g; x.fill(p, rule); }
  if (o.inner) o.inner(x, bbox(polys));
  x.restore();
  if (o.edge !== false) { x.save(); x.strokeStyle = o.edge ?? 'rgba(255,244,228,.5)'; x.lineWidth = o.ew ?? .9; x.stroke(p); x.restore(); }
  if (o.fuzz) fuzz(x, polys, o.fuzzColor || color, o.fuzz, o.fuzzDensity ?? 3, o.fuzzAlpha ?? 1);
  return p;
}
/** Felt fibres standing out of an outline (n per outline point, length ~len, alpha scale a). */
export function fuzz(x, polys, color, len, n = 3, a = 1) {
  if (!Array.isArray(polys[0][0])) polys = [polys];
  x.save(); x.lineCap = 'round';
  for (const pts of polys) { const m = pts.length;
    for (let i = 0; i < m; i++) { const p = pts[i], q = pts[(i + 1) % m], pr = pts[(i - 1 + m) % m]; let nx = q[1] - pr[1], ny = -(q[0] - pr[0]); const L0 = Math.hypot(nx, ny) || 1; nx /= L0; ny /= L0;
      for (let k = 0; k < n; k++) { const L = len * (.3 + R() * (R() < .12 ? 1.8 : 1)), sx = (R() - .5) * 2;
        x.strokeStyle = color; x.globalAlpha = (.4 + R() * .55) * a; x.lineWidth = .35 + R() * .55; x.beginPath();
        x.moveTo(p[0] - nx * 1.2 + sx * ny, p[1] - ny * 1.2 - sx * nx);
        x.quadraticCurveTo(p[0] + nx * L * .5 + (R() - .5) * L, p[1] + ny * L * .5 + (R() - .5) * L, p[0] + nx * L + (R() - .5) * L * .9, p[1] + ny * L + (R() - .5) * L * .9); x.stroke(); } } }
  x.restore();
}
/** Surface fibres inside a piece (felt nap): short strokes of `color`, ~density per 100 square units. */
export function nap(x, polys, color, density = 6, len = 5) {
  const b = bbox(polys), p = toPath(polys), n = Math.round((b.x1 - b.x0) * (b.y1 - b.y0) / 100 * density);
  x.save(); x.clip(p); x.lineCap = 'round'; x.strokeStyle = color;
  for (let i = 0; i < n; i++) { const px = mix(b.x0, b.x1, R()), py = mix(b.y0, b.y1, R()), a = R() * TAU, L = len * (.4 + R());
    x.globalAlpha = .15 + R() * .35; x.lineWidth = .3 + R() * .5; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (R() - .5) * L, py + (R() - .5) * L, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  x.restore();
}
/**
 * Thread stitches along a polyline: each stitch a short rounded thread with a shadow and a highlight, so it reads as
 * thread through felt rather than a dashed line. o: color, w (thread width), len, gap, closed, shadow, hi, cross
 * (blanket-stitch ticks towards the edge, length in units, + = left of travel).
 */
export function stitch(x, pts, o = {}) {
  const w = o.w ?? 1.4, len = o.len ?? w * 3.4, gap = o.gap ?? w * 2.4, col = o.color ?? 'rgba(255,236,210,.92)';
  const P = o.closed !== false ? [...pts, pts[0]] : pts;
  // walk the polyline by arc length
  const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = S[S.length - 1]; let j = 0;
  const at = (s) => { while (j < S.length - 2 && S[j + 1] < s) j++; const f = (s - S[j]) / ((S[j + 1] - S[j]) || 1); return [mix(P[j][0], P[j + 1][0], f), mix(P[j][1], P[j + 1][1], f)]; };
  const segs = []; for (let s = gap * .5; s + len < total; s += len + gap) { j = 0; segs.push([at(s), at(s + len)]); }
  x.save(); x.lineCap = 'round';
  x.strokeStyle = o.shadow ?? 'rgba(30,15,10,.35)'; x.lineWidth = w * 1.15;
  x.beginPath(); for (const [a, b] of segs) { x.moveTo(a[0] + w * .45, a[1] + w * .6); x.lineTo(b[0] + w * .45, b[1] + w * .6); } x.stroke();
  x.strokeStyle = col; x.lineWidth = w;
  x.beginPath(); for (const [a, b] of segs) { x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); } x.stroke();
  x.strokeStyle = o.hi ?? 'rgba(255,255,255,.45)'; x.lineWidth = w * .35;
  x.beginPath(); for (const [a, b] of segs) { x.moveTo(a[0] - w * .15, a[1] - w * .2); x.lineTo(mix(a[0], b[0], .7) - w * .15, mix(a[1], b[1], .7) - w * .2); } x.stroke();
  x.restore();
}
/** A single thread line (embroidery: mouths, lash lines, whiskers): a polyline in thread with a soft shadow. */
export function thread(x, pts, o = {}) {
  const w = o.w ?? 1.6; x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
  const path = toPath(pts, false);
  if (o.shadow !== false) { x.strokeStyle = o.shadow ?? 'rgba(20,10,10,.28)'; x.lineWidth = w * 1.2; x.save(); x.translate(w * .4, w * .55); x.stroke(path); x.restore(); }
  x.strokeStyle = o.color ?? '#3a2420'; x.lineWidth = w; x.stroke(path);
  if (o.hi !== false) { x.strokeStyle = o.hi ?? 'rgba(255,255,255,.22)'; x.lineWidth = w * .3; x.save(); x.translate(-w * .15, -w * .2); x.stroke(path); x.restore(); }
  x.restore();
}

// ---------- baking ----------
/**
 * Bake a sprite once: fn(x) draws in the box's own coordinates (box = {x, y, w, h}; a plain number pair w, h means
 * the box 0,0,w,h). Returns { c (colour canvas), s (soft dark silhouette for the drop shadow), box, K, pad }.
 * o: K (pixels per unit), pad (units), blur (shadow blur, units), seed (texture offsets and wobble), shadow ('#rrggbb').
 */
export function bake(box, o, fn) {
  if (typeof box === 'number') box = { x: 0, y: 0, w: box, h: o };
  if (typeof o === 'number' || o == null) o = {};
  const K = o.K ?? 2, pad = o.pad ?? 10, blur = o.blur ?? 5;
  const c = mk((box.w + 2 * pad) * K, (box.h + 2 * pad) * K), x = c.getContext('2d');
  const BK0 = BK, R0 = R; BK = K; R = rngFrom(o.seed ?? 1);
  x.scale(K, K); x.translate(pad - box.x, pad - box.y); fn(x);
  BK = BK0; R = R0;
  const s = mk(c.width, c.height), sx = s.getContext('2d');
  sx.filter = `blur(${blur * K}px)`; sx.drawImage(c, 0, 0); sx.filter = 'none';
  sx.globalCompositeOperation = 'source-in'; sx.fillStyle = o.shadow ?? '#12080a'; sx.fillRect(0, 0, s.width, s.height);
  return { c, s, box, K, pad, w: box.w, h: box.h };
}
/**
 * Draw a baked sprite. Origin mode (default): the sprite's own coordinate origin lands at (px, py). Anchor mode: pass
 * ax, ay (0..1 of the box). o: sc, alpha, shadow:false, so:[dx,dy] (shadow offset, units), sa (shadow alpha), rot.
 */
export function spr(x, S, px, py, o = {}) {
  const sc = o.sc ?? 1, sx = o.sx ?? sc, sy = o.sy ?? sc, b = S.box;
  const ox = o.ax != null ? b.x + b.w * o.ax : 0, oy = o.ay != null ? b.y + b.h * o.ay : 0;
  const dx = (b.x - S.pad - ox), dy = (b.y - S.pad - oy), dw = b.w + 2 * S.pad, dh = b.h + 2 * S.pad, a = o.alpha ?? 1;
  x.save(); x.translate(px, py); if (o.rot) x.rotate(o.rot); x.scale(sx, sy);
  if (o.shadow !== false) { const so = o.so ?? [6, 9]; x.globalAlpha = (o.sa ?? .5) * a; x.drawImage(S.s, dx + so[0] / sx, dy + so[1] / sy, dw, dh); }
  x.globalAlpha = a; x.drawImage(S.c, dx, dy, dw, dh);
  x.restore();
}

/**
 * A sprite from a painted, keyed image (RGBA): placed so it covers `box` ({x, y, w, h} in the rig's own units), with
 * the same soft drop-shadow silhouette as baked pieces. For Codex-painted parts dropped into a code rig.
 */
export function imageSprite(img, box, o = {}) {
  const K = o.K ?? img.width / box.w, pad = o.pad ?? 10, blur = o.blur ?? 5;
  const c = mk((box.w + 2 * pad) * K, (box.h + 2 * pad) * K), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high'; x.drawImage(img, pad * K, pad * K, box.w * K, box.h * K);
  const s = mk(c.width, c.height), sx = s.getContext('2d');
  sx.filter = `blur(${blur * K}px)`; sx.drawImage(c, 0, 0); sx.filter = 'none';
  sx.globalCompositeOperation = 'source-in'; sx.fillStyle = o.shadow ?? '#12080a'; sx.fillRect(0, 0, s.width, s.height);
  return { c, s, box, K, pad, w: box.w, h: box.h };
}
