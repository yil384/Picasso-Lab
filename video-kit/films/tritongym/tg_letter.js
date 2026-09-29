// tg_letter.js - hand-built comic lettering (no web font). Every glyph is a stroke skeleton (cap height 1,
// y down, x from 0 to w). A word is inked like a letterer's brush pen: a broad-nib width that swells and
// thins with the stroke direction, square-ish ends, an ink keyline, an offset ink drop shadow and a
// halftone shade in the lower half. It pops in with an overshoot, tilts, wobbles and boils.
import { pen, smooth, ribbon, fillPoly, ellipsePts, INK, CREAM, TAU } from './tg_paint.js';

const E = (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });

// skeletons: s = list of strokes (polylines; `c: true` = smooth curve), w = advance width
export const GLYPHS = {
  A: { w: 0.78, s: [[[0, 1], [0.39, 0], [0.78, 1]], [[0.18, 0.64], [0.6, 0.64]]] },
  B: { w: 0.62, s: [[[0, 0], [0, 1]], { c: true, p: [[0, 0], [0.42, 0.0], [0.56, 0.12], [0.5, 0.4], [0.05, 0.48]] }, { c: true, p: [[0.05, 0.48], [0.5, 0.52], [0.62, 0.72], [0.5, 0.95], [0, 1]] }] },
  C: { w: 0.66, s: [{ c: true, p: E(0.4, 0.5, 0.4, 0.5, -0.75, -TAU + 0.75, 12).map(([x, y]) => [x, y]) }] },
  D: { w: 0.68, s: [[[0, 0], [0, 1]], { c: true, p: [[0, 0], [0.4, 0.02], [0.66, 0.3], [0.66, 0.66], [0.4, 0.98], [0, 1]] }] },
  E: { w: 0.56, s: [[[0.56, 0], [0, 0], [0, 1], [0.56, 1]], [[0, 0.5], [0.44, 0.5]]] },
  F: { w: 0.54, s: [[[0.54, 0], [0, 0], [0, 1]], [[0, 0.5], [0.42, 0.5]]] },
  G: { w: 0.7, s: [{ c: true, p: E(0.4, 0.5, 0.4, 0.5, -0.7, -TAU + 0.2, 12) }, [[0.72, 0.56], [0.72, 0.9]], [[0.44, 0.58], [0.74, 0.58]]] },
  H: { w: 0.64, s: [[[0, 0], [0, 1]], [[0.64, 0], [0.64, 1]], [[0, 0.5], [0.64, 0.5]]] },
  I: { w: 0.0, s: [[[0, 0], [0, 1]]], lb: -0.05, rb: -0.05 },
  K: { w: 0.62, s: [[[0, 0], [0, 1]], [[0.62, 0], [0.04, 0.58]], [[0.2, 0.44], [0.64, 1]]] },
  L: { w: 0.46, s: [[[0, 0], [0, 1], [0.46, 1]]], rb: -0.08 },
  M: { w: 0.86, s: [[[0, 1], [0.04, 0], [0.43, 0.7], [0.82, 0], [0.86, 1]]] },
  N: { w: 0.66, s: [[[0, 1], [0, 0], [0.66, 1], [0.66, 0]]] },
  O: { w: 0.8, s: [{ c: true, p: E(0.4, 0.5, 0.4, 0.5, -Math.PI / 2, -Math.PI / 2 + TAU, 14) }] },
  P: { w: 0.6, s: [[[0, 1], [0, 0]], { c: true, p: [[0, 0], [0.4, 0], [0.6, 0.14], [0.6, 0.36], [0.4, 0.52], [0, 0.52]] }] },
  R: { w: 0.62, s: [[[0, 1], [0, 0]], { c: true, p: [[0, 0], [0.4, 0], [0.6, 0.14], [0.6, 0.34], [0.4, 0.5], [0, 0.5]] }, [[0.26, 0.5], [0.64, 1]]] },
  S: { w: 0.62, s: [{ c: true, p: [[0.6, 0.12], [0.36, 0.0], [0.08, 0.1], [0.06, 0.32], [0.3, 0.47], [0.56, 0.6], [0.62, 0.84], [0.38, 1.0], [0.0, 0.9]] }] },
  T: { w: 0.68, s: [[[0, 0], [0.68, 0]], [[0.34, 0], [0.34, 1]]], lb: -0.06, rb: -0.06 },
  U: { w: 0.66, s: [{ c: true, p: [[0, 0], [0, 0.7], [0.12, 0.94], [0.33, 1], [0.54, 0.94], [0.66, 0.7], [0.66, 0]] }] },
  W: { w: 1.0, s: [[[0, 0], [0.22, 1], [0.5, 0.34], [0.78, 1], [1.0, 0]]] },
  Y: { w: 0.7, s: [[[0, 0], [0.35, 0.52], [0.7, 0]], [[0.35, 0.52], [0.35, 1]]] },
  Z: { w: 0.66, s: [[[0.02, 0.02], [0.66, 0.0], [0.0, 1.0], [0.68, 0.98]]] },
  '0': { w: 0.62, s: [{ c: true, p: E(0.31, 0.5, 0.31, 0.5, -Math.PI / 2, -Math.PI / 2 + TAU, 14) }] },
  '1': { w: 0.3, s: [[[0.0, 0.2], [0.26, 0.0], [0.26, 1]]] },
  '2': { w: 0.6, s: [{ c: true, p: [[0.02, 0.2], [0.2, 0.02], [0.44, 0.02], [0.6, 0.2], [0.52, 0.46], [0.02, 1.0] ] }, [[0.02, 1], [0.62, 1]]] },
  '3': { w: 0.58, s: [{ c: true, p: [[0.02, 0.12], [0.28, 0], [0.52, 0.1], [0.52, 0.34], [0.2, 0.47]] }, { c: true, p: [[0.2, 0.47], [0.56, 0.58], [0.6, 0.84], [0.36, 1.0], [0.0, 0.9]] }] },
  '4': { w: 0.66, s: [[[0.46, 1], [0.46, 0], [0.0, 0.7], [0.66, 0.7]]] },
  '5': { w: 0.6, s: [[[0.56, 0], [0.08, 0], [0.04, 0.44]], { c: true, p: [[0.04, 0.44], [0.36, 0.38], [0.6, 0.56], [0.58, 0.84], [0.32, 1.0], [0.0, 0.92]] }] },
  '6': { w: 0.6, s: [{ c: true, p: [[0.52, 0.02], [0.2, 0.2], [0.02, 0.6], [0.1, 0.92], [0.34, 1.0], [0.58, 0.84], [0.56, 0.58], [0.32, 0.46], [0.06, 0.6]] }] },
  '7': { w: 0.6, s: [[[0, 0], [0.6, 0], [0.2, 1]]] },
  '8': { w: 0.6, s: [{ c: true, p: [[0.3, 0.46], [0.08, 0.3], [0.12, 0.06], [0.3, 0.0], [0.5, 0.06], [0.52, 0.3], [0.3, 0.46], [0.04, 0.66], [0.1, 0.94], [0.3, 1.0], [0.52, 0.94], [0.58, 0.66], [0.3, 0.46]] }] },
  '9': { w: 0.6, s: [{ c: true, p: [[0.54, 0.4], [0.3, 0.52], [0.06, 0.4], [0.06, 0.14], [0.3, 0.0], [0.54, 0.12], [0.58, 0.44], [0.44, 0.8], [0.12, 1.0]] }] },
  '!': { w: 0.0, s: [[[0, 0], [0, 0.64]]], dots: [[0, 0.94]] },
  '.': { w: 0.0, s: [], dots: [[0, 0.94]] },
  '@': { w: 1.02, wk: 0.62, s: [{ c: true, p: E(0.5, 0.56, 0.19, 0.21, 0, TAU, 14) }, { c: true, p: [[0.7, 0.34], [0.7, 0.7], [0.76, 0.8], [0.88, 0.8], [0.99, 0.6], [0.98, 0.34], [0.84, 0.1], [0.54, 0.0], [0.22, 0.06], [0.03, 0.3], [0.0, 0.6], [0.14, 0.9], [0.42, 1.04], [0.68, 1.02]] }] },   // an 'a' (ring + stem) and the outer swing, drawn lighter (wk) so both counters stay open at payoff weight
  '>': { w: 0.56, s: [[[0.02, 0.18], [0.56, 0.52], [0.02, 0.86]]] },
  '<': { w: 0.56, s: [[[0.54, 0.18], [0.0, 0.52], [0.54, 0.86]]] },
  '=': { w: 0.56, s: [[[0, 0.38], [0.56, 0.38]], [[0, 0.68], [0.56, 0.68]]] },
  '-': { w: 0.4, s: [[[0, 0.55], [0.4, 0.55]]] },
  'x': { w: 0.5, s: [[[0.0, 0.34], [0.5, 1.0]], [[0.5, 0.34], [0.0, 1.0]]] },
  ' ': { w: 0.3, s: [] },
};

const backOut = (x, s = 1.9) => { x = Math.max(0, Math.min(1, x)); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

/** Stroke list of a word in local px (centred on 0,0), plus its width. */
export function layoutWord(word, size, { track = 0.2, r = null, fan = 0, arc = 0 } = {}) {
  const L = [...word].map((ch) => GLYPHS[ch] || GLYPHS[' ']);
  const lw0 = size * 0.22;
  const widths = L.map((G) => G.w * size + lw0);
  const total = widths.reduce((a, b) => a + b, 0) + track * size * (L.length - 1) + L.reduce((a, G) => a + ((G.lb || 0) + (G.rb || 0)) * size, 0);
  const out = [];
  let x = -total / 2;
  L.forEach((G, i) => {
    x += (G.lb || 0) * size;
    const w = widths[i], lx = x + w / 2, t = L.length > 1 ? i / (L.length - 1) - 0.5 : 0;
    const j = (a) => (r ? r.gauss(0, a) : 0);
    const strokes = G.s.map((st) => {
      const pts = Array.isArray(st) ? st : st.p;
      const P = pts.map(([u, v]) => [(u - G.w / 2) * size + j(size * 0.008), (v - 0.5) * size + j(size * 0.008)]);
      return { P: st.c ? smooth(P, 4) : P, curve: !!st.c };
    });
    out.push({ lx, ly: -arc * (1 - 4 * t * t), rot: t * fan, wk: G.wk || 1, strokes, dots: (G.dots || []).map(([u, v]) => [(u - G.w / 2) * size, (v - 0.5) * size]) });
    x += w + track * size + (G.rb || 0) * size;
  });
  return { letters: out, width: total };
}

/** Broad-nib stroke outline: width follows the direction against a 35 deg nib, square-ish ends. */
function nibStroke(P, w, nib, r, rough) {
  // densify so the width can change along the stroke
  const D = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (w * 0.5)));
    for (let k = 0; k < n; k++) D.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  D.push(P[P.length - 1]);
  const widths = D.map((p, i) => {
    const a = D[Math.max(0, i - 1)], b = D[Math.min(D.length - 1, i + 1)];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return w * (0.62 + 0.38 * Math.abs(Math.sin(th - nib)));
  });
  let k = 0;
  return ribbon(D, () => widths[Math.min(widths.length - 1, k++ >> 0)] || w, r, rough);
}

/**
 * Draw a comic word. g: Canvas2D in design px. o: { fill, shade (halftone colour), ink, keyline (cream), pop (0..>1 appear),
 * perLetter (fn i -> 0..1 pop), rot, alpha, r (boil rng), track, fan, arc, skew, weight, nib }
 */
export function comicWord(g, word, x, y, size, o = {}) {
  const r = o.r || null;
  const lay = layoutWord(word, size, { track: o.track ?? 0.18, r, fan: o.fan ?? 0.12, arc: o.arc ?? 0 });
  const lw = size * (o.weight ?? 0.2), ol = size * 0.075, nib = o.nib ?? -0.6;
  const k = o.pop == null ? 1 : backOut(o.pop);
  if (k <= 0.01) return;
  g.save();
  g.translate(x, y); g.rotate(o.rot ?? -0.08); g.scale(k, k);
  if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0);
  g.globalAlpha = o.alpha ?? 1;
  const letters = lay.letters.map((Lt, i) => ({ ...Lt, k: o.perLetter ? backOut(o.perLetter(i)) : 1 }));
  const each = (fn) => letters.forEach((Lt) => { if (Lt.k <= 0.01) return; g.save(); g.translate(Lt.lx, Lt.ly); g.rotate(Lt.rot); g.scale(Lt.k, Lt.k); fn(Lt); g.restore(); });
  const shape = (Lt, w, col) => {
    for (const s of Lt.strokes) if (s.P.length > 1) fillPoly(g, nibStroke(s.P, w, nib, r, 0.012 * size), col);
    for (const [dx, dy] of Lt.dots) fillPoly(g, ellipsePts(dx, dy, w * 0.62, w * 0.62, 0, 16), col);
  };
  const ink = o.ink || INK;
  each((Lt) => { g.save(); g.translate(size * 0.07, size * 0.08); shape(Lt, lw + 2 * ol, ink); g.restore(); });   // drop shadow
  each((Lt) => shape(Lt, lw + 2 * ol, ink));                                                                   // ink keyline
  if (o.keyline) each((Lt) => shape(Lt, lw + ol * 0.7, o.keyline));                                           // cream keyline
  each((Lt) => shape(Lt, lw, o.fill || '#ef4b5f'));                                                            // colour
  if (o.shade) {   // halftone shade on the lower half of the colour (printed comic feel, not a gloss)
    each((Lt) => {
      g.save();
      g.beginPath();
      for (const s of Lt.strokes) if (s.P.length > 1) { const pts = nibStroke(s.P, lw, nib, null, 0); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
      g.clip();
      g.fillStyle = o.shade;
      const step = Math.max(4, size * 0.07);
      for (let yy = size * 0.05; yy < size * 0.62; yy += step) for (let xx = -size; xx < size; xx += step) {
        const rr = step * 0.42 * Math.min(1, (yy - size * 0.05) / (size * 0.4));
        if (rr > 0.4) { g.beginPath(); g.arc(xx + ((yy / step) % 2) * step * 0.5, yy, rr, 0, TAU); g.fill(); }
      }
      g.restore();
    });
  }
  g.restore();
}

/** Comic "!" emote (Canvas2D): tapered bar + dot with ink keyline and drop shadow. */
export function bang(g, x, y, s, rot, col = '#ef4b5f', r = null, key = null) {
  if (s < 3) return;
  const j = () => (r ? r.gauss(0, s * 0.012) : 0);
  const bar = [[-0.21, -1.0], [0.21, -1.03], [0.075, -0.3], [-0.075, -0.29]].map(([u, v]) => [u * s + j(), v * s + j()]);
  const shape = (dx, dy, grow, colr) => {
    const b = bar.map(([u, v]) => [u * (1 + grow) + dx, v * (1 + grow * 0.2) + dy]);
    fillPoly(g, b, colr); fillPoly(g, ellipsePts(dx, dy, 0.14 * s * (1 + grow), 0.14 * s * (1 + grow), 0, 14), colr);
  };
  g.save(); g.translate(x, y); g.rotate(rot);
  if (key) { shape(s * 0.06, s * 0.07, 0.8, INK); shape(0, 0, 0.8, INK); shape(0, 0, 0.55, key); shape(0, 0, 0.3, INK); shape(0, 0, 0, col); }   // (with a keyline)
  else { shape(s * 0.06, s * 0.07, 0.35, INK); shape(0, 0, 0.35, INK); shape(0, 0, 0, col); }
  g.restore();
}

export { CREAM };

/**
 * 3D block lettering from the same hand-built skeletons: each glyph's merged brush outline is extruded into one mesh
 * with two materials (face, side). Returns { root, glyphs:[{g, w}] }
 * with the word laid out along +x, baseline at y = 0, facing +z.
 */
// A glyph's strokes overlap at every join; extruded one by one, each has its own hull, and a hull edge lying in the
// neighbour's front cap z-fights (crawling ink specks at the joins). So the strokes are merged first: rasterised with
// coverage AA as quads (a folded ribbon still fills), traced at 50% coverage (marching squares, sub-cell), simplified,
// nested into outlines with holes. One outline per glyph -> one extrusion, one hull, no joins inside a letter.
function traceUnion(polys, cell) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const P of polys) for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 -= 3 * cell; y0 -= 3 * cell; x1 += 3 * cell; y1 += 3 * cell;
  const W = Math.ceil((x1 - x0) / cell), H = Math.ceil((y1 - y0) / cell);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(1 / cell, 0, 0, 1 / cell, -x0 / cell, -y0 / cell);
  for (const P of polys) fillPoly(g, P, '#fff');
  const px = g.getImageData(0, 0, W, H).data, v = (i, j) => px[(j * W + i) * 4 + 3] / 255;
  // marching squares: sample (i, j) sits at the pixel centre; a crossing point is keyed by its grid edge
  const pos = new Map(), adj = new Map();
  const cross = (key, ax, ay, bx, by, a, b) => { if (!pos.has(key)) { const t = (0.5 - a) / (b - a); pos.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]); } return key; };
  const link = (p, q) => { (adj.get(p) || adj.set(p, []).get(p)).push(q); (adj.get(q) || adj.set(q, []).get(q)).push(p); };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const tl = v(i, j), tr = v(i + 1, j), br = v(i + 1, j + 1), bl = v(i, j + 1);
    const c = (tl >= 0.5 ? 8 : 0) | (tr >= 0.5 ? 4 : 0) | (br >= 0.5 ? 2 : 0) | (bl >= 0.5 ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const T_ = () => cross(`h${i},${j}`, i, j, i + 1, j, tl, tr), B_ = () => cross(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1, bl, br);
    const L_ = () => cross(`v${i},${j}`, i, j, i, j + 1, tl, bl), R_ = () => cross(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1, tr, br);
    const mid = (tl + tr + br + bl) / 4 >= 0.5;
    switch (c) {
      case 1: case 14: link(L_(), B_()); break;
      case 2: case 13: link(B_(), R_()); break;
      case 3: case 12: link(L_(), R_()); break;
      case 4: case 11: link(T_(), R_()); break;
      case 6: case 9: link(T_(), B_()); break;
      case 7: case 8: link(L_(), T_()); break;
      case 5: if (mid) { link(L_(), T_()); link(B_(), R_()); } else { link(T_(), R_()); link(L_(), B_()); } break;
      case 10: if (mid) { link(T_(), R_()); link(L_(), B_()); } else { link(L_(), T_()); link(B_(), R_()); } break;
    }
  }
  const seen = new Set(), loops = [];
  for (const k0 of adj.keys()) {
    if (seen.has(k0)) continue;
    const loop = []; let prev = null, k = k0;
    while (k && !seen.has(k)) { seen.add(k); const [x, y] = pos.get(k); loop.push([x0 + (x + 0.5) * cell, y0 + (y + 0.5) * cell]); const nb = adj.get(k); const nx = nb[0] !== prev ? nb[0] : nb[1]; prev = k; k = nx; }
    if (loop.length >= 4) loops.push(simplifyLoop(loop, cell * 0.12));
  }
  // nesting: a loop inside an even number of others is an outline, inside an odd number a hole (of its tightest container)
  const area = (L) => L.reduce((s, p, i) => { const q = L[(i + 1) % L.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const inside = (L, [x, y]) => { let c = false; for (let i = 0, j = L.length - 1; i < L.length; j = i++) { const [xi, yi] = L[i], [xj, yj] = L[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const info = loops.map((L) => ({ L, a: Math.abs(area(L)), holes: [] }));
  for (const o of info) o.parents = info.filter((p) => p !== o && p.a > o.a && inside(p.L, o.L[0]));
  const outers = info.filter((o) => o.parents.length % 2 === 0);
  for (const o of info) if (o.parents.length % 2 === 1) o.parents.reduce((m, p) => (p.a < m.a ? p : m)).holes.push(o.L);
  return outers.map((o) => ({ outline: o.L, holes: o.holes }));
}
function simplifyLoop(L, tol) {   // Ramer-Douglas-Peucker on a closed loop (split at the point farthest from L[0])
  const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1e-12; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)); return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2; };
  const rdp = (P) => { let m = 0, k = 0; for (let i = 1; i < P.length - 1; i++) { const d = d2(P[i], P[0], P[P.length - 1]); if (d > m) { m = d; k = i; } } return m > tol * tol ? rdp(P.slice(0, k + 1)).slice(0, -1).concat(rdp(P.slice(k))) : [P[0], P[P.length - 1]]; };
  let f = 0, fm = 0; L.forEach((p, i) => { const d = (p[0] - L[0][0]) ** 2 + (p[1] - L[0][1]) ** 2; if (d > fm) { fm = d; f = i; } });
  return rdp(L.slice(0, f + 1)).slice(0, -1).concat(rdp(L.slice(f).concat([L[0]])).slice(0, -1));
}
const nibQuads = (P, w, nib) => { const R = nibStroke(P, w, nib, null, 0), n = R.length / 2, q = []; for (let i = 0; i < n - 1; i++) q.push([R[i], R[i + 1], R[2 * n - 2 - i], R[2 * n - 1 - i]]); return q; };
// hulls pushed back a hair along the eye ray, so a hull edge never z-fights a neighbouring letter's front cap
const pushHull = (m) => { for (const c of m.children) if (c.material?.uniforms?.uHullPush) c.material.uniforms.uHullPush.value = 0.05; return m; };
export function word3D(THREE, add, parent, word, size, { face, side, depth = 0.22, weight = 0.24, track = 0.16, nib = -0.6, seed = 3 } = {}) {
  const root = new THREE.Group(); parent.add(root);
  const lay = layoutWord(word, size, { track, r: null });
  const lw = size * weight;
  const glyphs = [];
  lay.letters.forEach((Lt, i) => {
    const g = new THREE.Group(); g.position.set(Lt.lx + lay.width / 2, size / 2, 0); root.add(g);
    const ext = { depth, bevelEnabled: false, curveSegments: 4 };   // (no bevel: at concave corners its offset faces z-fought the hull: dotted specks)
    const polys = [];
    for (const s of Lt.strokes) if (s.P.length > 1) polys.push(...nibQuads(s.P, lw * Lt.wk, nib));
    for (const [dx, dy] of Lt.dots) polys.push(ellipsePts(dx, dy, lw * 0.62, lw * 0.62, 0, 24));
    if (polys.length) {
      const shapes = traceUnion(polys, size / 180).map(({ outline, holes }) => {
        const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, -y)));
        for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, -y))));
        return sh;
      });
      const geo = new THREE.ExtrudeGeometry(shapes, ext); geo.translate(0, 0, -depth / 2);
      pushHull(add(geo, [face, side], { outline: 1.15 }, [0, 0, 0], [0, 0, 0], g));
    }
    glyphs.push({ g, x: Lt.lx + lay.width / 2 });
  });
  return { root, glyphs, width: lay.width };
}
