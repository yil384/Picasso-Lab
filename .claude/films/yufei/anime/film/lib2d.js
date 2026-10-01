// 2D helpers shared with films/yufei (copied): eases, ink fx, hand-built comic lettering
import { ease, clamp, lerp } from '/pv/runtime/pv.js';
export const TAU = Math.PI * 2;
export const PAL = {
  paper: '#f4ebd6', ink: '#14122a', gold: '#f6c445', goldD: '#c98a1e', goldL: '#fff0a8', red: '#e5463b',
  cyan: '#53d8f2', cream: '#fff6e0', yellow: '#ffe14d', pink: '#ff5a8a', white: '#ffffff',
};
export const st = { S: 1 };
// =====================================================================================================
const sm = (x) => ease.smooth(clamp(x));
const io = (x) => ease.inOutSine(clamp(x));
const ob = (x) => ease.outBack(clamp(x));
const ic = (x) => ease.inCubic(clamp(x));
const oc = (x) => ease.outCubic(clamp(x));
const ioc = (x) => ease.inOutCubic(clamp(x));
const twos = (F) => F - (F % 2);
const ringv = (a, amp, w = 1.1, k = 0.2) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.cos(w * a));
const bumpv = (a, amp, w = 0.9, k = 0.16) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.sin(w * a));
const hsh = (...n) => { let x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); };
function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); }
function star4Path(g, x, y, r, rot = 0, k = 0.28) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * k : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath();
}

// ---- cat face (equirect sphere map: face centre at u = .25, the equator) ----
function taper(g, pts, w0, w1, col) {
  // filled tapered stroke through pts (design px)
  if (pts.length < 2) return;
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (pts.length - 1), w = lerp(w0, w1, t) / 2;
    L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  g.fillStyle = col; g.fill();
}
function sparkle(g, x, y, r, rot, fill = PAL.goldL) {
  if (r < 2) return;
  star4Path(g, x + r * 0.08, y + r * 0.1, r, rot); g.fillStyle = PAL.ink; g.fill();
  star4Path(g, x, y, r, rot); g.lineWidth = Math.max(3, r * 0.16); g.strokeStyle = PAL.ink; g.lineJoin = 'round'; g.stroke(); g.fillStyle = fill; g.fill();
}
function drop(g, x, y, r, col, dx = 0, dy = 0) {
  // a paint drop with a motion tail, ink edge
  g.lineCap = 'round';
  if (Math.hypot(dx, dy) > 2) { g.beginPath(); g.moveTo(x - dx, y - dy); g.lineTo(x, y); g.lineWidth = r * 1.1 + 6; g.strokeStyle = PAL.ink; g.stroke(); g.lineWidth = r * 1.1; g.strokeStyle = col; g.stroke(); }
  ellipse(g, x, y, r + 3.2, r + 3.2); g.fillStyle = PAL.ink; g.fill();
  ellipse(g, x, y, r, r); g.fillStyle = col; g.fill();
  ellipse(g, x - r * 0.3, y - r * 0.35, r * 0.28, r * 0.22); g.fillStyle = '#ffffffcc'; g.fill();
}
function puff(g, x, y, s, a) {
  if (a <= 0 || s < 3) return;
  g.globalAlpha = a; g.lineWidth = 5; g.strokeStyle = PAL.ink; g.fillStyle = PAL.cream;
  for (let q = 0; q < 3; q++) { const cx = x + (q - 1) * s * 0.8, cy = y - (q === 1 ? s * 0.4 : 0); g.beginPath(); g.arc(cx, cy, s * 0.6, Math.PI, TAU); g.fill(); g.stroke(); }
  g.globalAlpha = 1;
}
function zap(g, a, b, r, w, col) {
  // jagged electric spark from a to b
  const n = 6, pts = [];
  for (let k = 0; k <= n; k++) { const t = k / n, j = k === 0 || k === n ? 0 : (r() - 0.5) * 34; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; pts.push([a[0] + dx * t - dy / l * j, a[1] + dy * t + dx / l * j]); }
  g.lineJoin = 'miter'; g.lineCap = 'round';
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w + 7; g.strokeStyle = PAL.ink; g.stroke();
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = w; g.strokeStyle = col; g.stroke();
}

function ellPts(x, y, rx, ry, n = 20) { const out = []; for (let i = 0; i <= n; i++) { const a = i / n * TAU; out.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } return out; }
const GLYPH = {
  B: { w: 0.6, s: [[[0, 0], [0, 1]], [[0, 0.02], [0.36, 0.0], [0.53, 0.1], [0.54, 0.3], [0.38, 0.47], [0.02, 0.48]], [[0.02, 0.48], [0.42, 0.48], [0.6, 0.62], [0.6, 0.86], [0.4, 1.0], [0, 1.0]]], smooth: true },
  Z: { w: 0.66, s: [[[0.02, 0.02], [0.66, 0.0], [0.0, 1.0], [0.68, 0.98]]] },
  T: { w: 0.66, s: [[[0, 0.02], [0.66, 0.0]], [[0.33, 0.0], [0.34, 1.0]]] },
  S: { w: 0.62, s: [[[0.6, 0.12], [0.36, 0.0], [0.08, 0.1], [0.06, 0.32], [0.3, 0.47], [0.56, 0.6], [0.62, 0.84], [0.38, 1.0], [0.02, 0.9]]], smooth: true },
  H: { w: 0.62, s: [[[0, 0], [0, 1]], [[0.62, 0], [0.62, 1]], [[0, 0.52], [0.62, 0.5]]] },
  I: { w: 0.0, s: [[[0, 0], [0, 1]]] },
  N: { w: 0.64, s: [[[0, 1], [0, 0], [0.64, 1], [0.64, 0]]] },
  G: { w: 0.7, s: [[[0.66, 0.14], [0.46, 0.0], [0.2, 0.04], [0.03, 0.26], [0.0, 0.52], [0.08, 0.82], [0.3, 1.0], [0.54, 0.98], [0.7, 0.84], [0.7, 0.58], [0.42, 0.58]]], smooth: true },
  P: { w: 0.6, s: [[[0, 1], [0, 0], [0.38, 0], [0.6, 0.14], [0.6, 0.36], [0.38, 0.5], [0, 0.5]]], smooth: true },
  L: { w: 0.52, s: [[[0, 0], [0, 1], [0.54, 0.99]]] },
  A: { w: 0.74, s: [[[0, 1], [0.37, 0], [0.74, 1]], [[0.16, 0.66], [0.58, 0.66]]] },
  C: { w: 0.68, s: [[[0.66, 0.15], [0.46, 0.0], [0.2, 0.04], [0.03, 0.26], [0.0, 0.52], [0.08, 0.82], [0.3, 1.0], [0.52, 0.98], [0.68, 0.84]]], smooth: true },
  O: { w: 0.78, s: [ellPts(0.39, 0.5, 0.39, 0.5, 22)] },
  '!': { w: 0.0, s: [[[0, 0], [0, 0.62]]], dots: [[0, 0.93]] },
};
function smoothPts(pts, n = 5) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); }
  }
  out.push(pts[pts.length - 1]); return out;
}
function plen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }
function cutPts(pts, L) { // first L units of a polyline
  const out = [pts[0]]; let s = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s + d >= L) { const t = (L - s) / (d || 1); out.push([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]); return out; } s += d; out.push(pts[i]); }
  return out;
}
/** word at centre (x, y), cap height `size`. o: fill, ink, stroke2 (keyline), sheen, rot, arc, fan, pops(i), jitter rng,
 *  alpha, skew, weight, reveal (0..1: stroke-by-stroke write-on), head (callback with the write head) */
function handWord(g, word, x, y, size, o) {
  const lw = size * (o.weight ?? 0.24), gap = size * (o.gap ?? 0.2);
  const L = [...word].map((ch) => GLYPH[ch]);
  const widths = L.map((G) => G.w * size + lw);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (L.length - 1);
  const r = o.jitter;
  const letters = [];
  let cx = -total / 2;
  L.forEach((G, i) => {
    const w = widths[i], lx = cx + w / 2, t = L.length > 1 ? i / (L.length - 1) - 0.5 : 0;
    const k = o.pops ? o.pops(i) : 1;
    const ly = -(o.arc || 0) * (1 - 4 * t * t) + (hsh(i, word.length, 3) - 0.5) * size * 0.1;
    const rot = (hsh(i, word.length, 5) - 0.5) * 0.2 + t * (o.fan ?? 0.2);
    const strokes = G.s.map((s) => (G.smooth ? smoothPts(s) : s).map(([u, v]) => [(u - G.w / 2) * size + (r ? r.gauss(0, size * 0.005) : 0), (v - 0.5) * size + (r ? r.gauss(0, size * 0.005) : 0)]));
    letters.push({ lx, ly, rot, k, strokes, dots: (G.dots || []).map(([u, v]) => [(u - G.w / 2) * size, (v - 0.5) * size]) });
    cx += w + gap;
  });
  // write-on: reveal a fraction of the total stroke length, letter by letter
  let budget = Infinity;
  if (o.reveal != null) { const tot = letters.reduce((s, Lt) => s + Lt.strokes.reduce((a, st2) => a + plen(st2), 0) + Lt.dots.length * size * 0.2, 0); budget = o.reveal * tot; }
  const vis = [];
  let headPt = null;
  for (const Lt of letters) {
    const ss = [];
    for (const s of Lt.strokes) { if (budget <= 0) break; const l = plen(s); if (budget >= l) { ss.push(s); budget -= l; } else { const c = cutPts(s, budget); ss.push(c); headPt = [Lt, c[c.length - 1]]; budget = 0; } }
    const dots = budget > 0 ? Lt.dots : [];
    if (budget > 0) budget -= Lt.dots.length * size * 0.2;
    vis.push({ ...Lt, strokes: ss, dots });
  }
  g.save();
  g.translate(x, y); g.rotate(o.rot || 0);
  if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0);
  g.globalAlpha = o.alpha ?? 1;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const pass = (col, w, dx, dy) => {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w;
    for (const Lt of vis) {
      if (Lt.k <= 0.01) continue;
      g.save(); g.translate(Lt.lx + dx, Lt.ly + dy); g.rotate(Lt.rot); g.scale(Lt.k, Lt.k);
      for (const s of Lt.strokes) { if (s.length < 2) continue; g.beginPath(); s.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); }
      for (const [px, py] of Lt.dots) { g.beginPath(); g.arc(px, py, w * 0.55, 0, TAU); g.fill(); }
      g.restore();
    }
  };
  pass(o.ink, lw + size * 0.14, size * 0.07, size * 0.085);   // ink drop shadow
  pass(o.ink, lw + size * 0.14, 0, 0);                          // ink outline
  if (o.stroke2) pass(o.stroke2, lw + size * 0.065, 0, 0);       // keyline
  pass(o.fill, lw, 0, 0);
  if (o.sheen) { g.globalAlpha = (o.alpha ?? 1) * 0.6; pass(o.sheen, lw * 0.26, -lw * 0.16, -lw * 0.2); }
  if (headPt && o.head) { const [Lt, p] = headPt; const ca = Math.cos(Lt.rot), sa = Math.sin(Lt.rot); const hx = Lt.lx + (p[0] * ca - p[1] * sa) * Lt.k, hy = Lt.ly + (p[0] * sa + p[1] * ca) * Lt.k;
    const M = g.getTransform(), q = M.transformPoint(new DOMPoint(hx, hy)), S0 = st.S || 1; st.writeHead = [q.x / S0, q.y / S0]; o.head(hx, hy, g); }
  g.restore();
}
// jagged electric balloon (BZZT)
function burstBalloon(g, x, y, rx, ry, k, rr, fill, edge) {
  if (k <= 0.02) return;
  const n = 18, pts = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rad = i % 2 ? 0.74 + 0.08 * rr() : 1.0 + 0.16 * rr(); pts.push([x + Math.cos(a) * rx * rad * k, y + Math.sin(a) * ry * rad * k]); }
  const path = () => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); };
  g.save(); g.translate(10, 12); path(); g.fillStyle = PAL.ink; g.fill(); g.restore();
  path(); g.fillStyle = fill; g.fill(); g.lineJoin = 'miter'; g.lineWidth = 9; g.strokeStyle = PAL.ink; g.stroke();
  g.save(); path(); g.clip(); g.lineWidth = 14; g.strokeStyle = edge; g.stroke(); g.restore();
}
// paint splat blob (SPLAT)
function splatBlob(g, x, y, R, k, seed) {
  if (k <= 0.02) return;
  const n = 26, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU, rad = (i % 3 === 0 ? 1.18 + 0.2 * hsh(seed, i) : 0.86 + 0.1 * hsh(seed, i, 2)); pts.push([x + Math.cos(a) * R * rad * k, y + Math.sin(a) * R * rad * 0.72 * k]); }
  const path = () => { g.beginPath(); const sp = smoothPts([...pts, pts[0], pts[1]], 4); sp.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); };
  g.save(); g.translate(10, 12); path(); g.fillStyle = PAL.ink; g.fill(); g.restore();
  path(); g.fillStyle = PAL.gold; g.fill(); g.lineWidth = 9; g.strokeStyle = PAL.ink; g.stroke();
  for (let i = 0; i < 5; i++) { const a = hsh(seed, i, 7) * TAU, d = R * (1.35 + 0.3 * hsh(seed, i, 8)) * k, rr = R * 0.09 * k * (1 + hsh(seed, i, 9));
    ellipse(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.72, rr + 4, rr + 4); g.fillStyle = PAL.ink; g.fill(); ellipse(g, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.72, rr, rr); g.fillStyle = PAL.gold; g.fill(); }
}

export { GLYPH, bumpv, burstBalloon, cutPts, drop, ellPts, ellipse, handWord, hsh, ic, io, ioc, ob, oc, plen, puff, ringv, sm, smoothPts, sparkle, splatBlob, star4Path, taper, twos, zap };
