// cm_glyphs.js - hand-authored lettering data (no web font anywhere in the film).
//   SKEL: stroke skeletons for brush lettering (unit cap height, y down), used by the painted sign, badges,
//         pennant and the SFX (Canvas2D handWord in cm_ink.js).
//   glyphShape(): closed outlines (with holes) for the extruded 3D payoff numerals "80.1%".
const TAU = Math.PI * 2;
export const ell = (x, y, rx, ry, rot = 0, n = 22) => {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry; pts.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]); }
  return pts;
};
const loop = (p) => [...p, p[0]];

// width w (in cap heights), strokes s: arrays of [u, v] points (v down, 0 = cap top, 1 = baseline)
export const SKEL = {
  C: { w: 0.7, s: [[[0.68, 0.16], [0.5, 0.02], [0.26, 0.04], [0.06, 0.24], [0.02, 0.5], [0.08, 0.78], [0.3, 0.98], [0.52, 0.98], [0.7, 0.84]]], smooth: true },
  h: { w: 0.5, s: [[[0, -0.02], [0, 1]], [[0, 0.62], [0.14, 0.46], [0.36, 0.44], [0.48, 0.58], [0.5, 1]]], smooth: true },
  i: { w: 0.02, s: [[[0, 0.44], [0.01, 1]]], dots: [[0.01, 0.2]] },
  p: { w: 0.5, s: [[[0, 0.44], [0, 1.3]], [[0, 0.58], [0.16, 0.44], [0.4, 0.46], [0.5, 0.66], [0.42, 0.9], [0.2, 0.98], [0, 0.9]]], smooth: true },
  M: { w: 0.9, s: [[[0, 1], [0.04, 0], [0.45, 0.62], [0.86, 0], [0.9, 1]]] },
  A: { w: 0.78, s: [[[0, 1], [0.39, 0], [0.78, 1]], [[0.17, 0.64], [0.61, 0.64]]] },
  T: { w: 0.66, s: [[[0, 0.02], [0.66, 0]], [[0.33, 0.01], [0.34, 1]]] },
  E: { w: 0.56, s: [[[0.56, 0.02], [0, 0.02], [0, 1], [0.58, 0.98]], [[0, 0.5], [0.46, 0.5]]] },
  B: { w: 0.6, s: [[[0, 1], [0, 0], [0.34, 0], [0.54, 0.1], [0.54, 0.34], [0.32, 0.48], [0, 0.48]], [[0.32, 0.48], [0.58, 0.6], [0.6, 0.84], [0.4, 1], [0, 1]]], smooth: true },
  Z: { w: 0.66, s: [[[0.02, 0.02], [0.66, 0.0], [0.0, 1.0], [0.68, 0.98]]] },
  D: { w: 0.66, s: [[[0, 0], [0, 1]], [[0, 0], [0.34, 0.02], [0.62, 0.26], [0.66, 0.54], [0.54, 0.84], [0.3, 1], [0, 1]]], smooth: true },
  I: { w: 0.0, s: [[[0, 0], [0, 1]]] },
  N: { w: 0.66, s: [[[0, 1], [0, 0], [0.66, 1], [0.66, 0]]] },
  G: { w: 0.74, s: [[[0.7, 0.16], [0.5, 0.02], [0.26, 0.04], [0.06, 0.24], [0.02, 0.52], [0.1, 0.8], [0.34, 0.98], [0.58, 0.96], [0.74, 0.8], [0.74, 0.56], [0.44, 0.56]]], smooth: true },
  '!': { w: 0.0, s: [[[0, 0], [0, 0.62]]], dots: [[0, 0.93]] },
  '0': { w: 0.6, s: [loop(ell(0.3, 0.5, 0.3, 0.5, 0, 18))], smooth: true },
  '1': { w: 0.36, s: [[[0.02, 0.2], [0.3, 0], [0.3, 1]]] },
  '2': { w: 0.6, s: [[[0.04, 0.2], [0.2, 0.03], [0.44, 0.03], [0.58, 0.2], [0.54, 0.44], [0.02, 1], [0.62, 0.98]]], smooth: false },
  '6': { w: 0.6, s: [[[0.52, 0.04], [0.26, 0.12], [0.06, 0.4], [0.04, 0.72], [0.2, 0.96], [0.44, 0.96], [0.58, 0.8], [0.56, 0.6], [0.4, 0.48], [0.18, 0.5], [0.05, 0.66]]], smooth: true },
  '7': { w: 0.6, s: [[[0, 0.02], [0.62, 0], [0.22, 1]]] },
  '8': { w: 0.6, s: [loop(ell(0.3, 0.25, 0.22, 0.24, 0, 14)), loop(ell(0.3, 0.73, 0.28, 0.27, 0, 16))], smooth: true },
  '9': { w: 0.6, s: [[[0.56, 0.36], [0.44, 0.52], [0.2, 0.54], [0.04, 0.38], [0.08, 0.1], [0.3, 0.0], [0.52, 0.08], [0.58, 0.34], [0.52, 0.7], [0.3, 0.98], [0.06, 0.94]]], smooth: true },
  '.': { w: 0.0, s: [], dots: [[0, 0.92]] },
  '%': { w: 0.78, s: [[[0.7, 0.0], [0.08, 1.0]], loop(ell(0.16, 0.18, 0.14, 0.17, 0, 12)), loop(ell(0.62, 0.8, 0.14, 0.17, 0, 12))], smooth: true },
};

export function smoothPts(pts, n = 5) {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Lay out a word: returns { total, letters: [{ x (centre offset in cap heights), strokes (unit coords, centred), dots }] }
 * gap = inter-letter gap in cap heights.
 */
export function layoutWord(word, gap = 0.2) {
  const L = [...word].map((ch) => SKEL[ch]);
  const widths = L.map((G) => G.w + 0.12);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (L.length - 1);
  let cx = -total / 2;
  const letters = L.map((G, i) => {
    const lx = cx + widths[i] / 2;
    cx += widths[i] + gap;
    return {
      x: lx,
      strokes: G.s.map((s) => (G.smooth ? smoothPts(s) : s).map(([u, v]) => [u - G.w / 2, v - 0.5])),
      dots: (G.dots || []).map(([u, v]) => [u - G.w / 2, v - 0.5]),
    };
  });
  return { total, letters };
}

// ---------------------------------------------------------------------------------------------------
// 3D numeral outlines for "80.1%" (unit height 1, y up, x from 0). Each returns [outer, ...holes] polygons.
// ---------------------------------------------------------------------------------------------------
const circ = (cx, cy, rx, ry, n = 28, rev = false) => {
  const p = []; for (let i = 0; i < n; i++) { const a = (rev ? -1 : 1) * i / n * TAU; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
};
function unionTwoEllipses(a, b, n = 48) {   // outer outline of two overlapping ellipses (a below b)
  const inside = (e, x, y) => ((x - e[0]) / e[2]) ** 2 + ((y - e[1]) / e[3]) ** 2 < 1;
  const pts = [];
  for (let i = 0; i < n; i++) { const t = -Math.PI / 2 + i / n * TAU; const x = a[0] + Math.cos(t) * a[2], y = a[1] + Math.sin(t) * a[3]; if (!inside(b, x, y)) pts.push([x, y, Math.atan2(y - 0.5, x - a[0])]); }
  for (let i = 0; i < n; i++) { const t = -Math.PI / 2 + i / n * TAU; const x = b[0] + Math.cos(t) * b[2], y = b[1] + Math.sin(t) * b[3]; if (!inside(a, x, y)) pts.push([x, y, Math.atan2(y - 0.5, x - b[0])]); }
  // order by angle around the joint centre (the union is star-shaped from there)
  pts.sort((p, q) => p[2] - q[2]);
  return pts.map(([x, y]) => [x, y]);
}
export const NUMERAL = {
  '8': { w: 0.66, polys: () => [unionTwoEllipses([0.33, 0.28, 0.33, 0.29], [0.33, 0.76, 0.27, 0.24]), circ(0.33, 0.27, 0.15, 0.13, 22, true), circ(0.33, 0.77, 0.11, 0.1, 20, true)] },
  '0': { w: 0.64, polys: () => [circ(0.32, 0.5, 0.32, 0.5, 36), circ(0.32, 0.5, 0.15, 0.32, 28, true)] },
  '.': { w: 0.22, polys: () => [circ(0.11, 0.11, 0.11, 0.11, 16)] },
  '1': { w: 0.42, polys: () => [[[0.14, 0.0], [0.42, 0.0], [0.42, 1.0], [0.26, 1.0], [0.0, 0.8], [0.06, 0.66], [0.14, 0.72]]] },
  '%': { w: 0.8, polys: () => [[[0.62, 1.0], [0.76, 1.0], [0.18, 0.0], [0.04, 0.0]]], extra: () => [
    [circ(0.18, 0.8, 0.16, 0.2, 20), circ(0.18, 0.8, 0.07, 0.1, 16, true)],
    [circ(0.62, 0.2, 0.16, 0.2, 20), circ(0.62, 0.2, 0.07, 0.1, 16, true)]] },
};
