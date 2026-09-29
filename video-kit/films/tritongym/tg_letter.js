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
  '@': { w: 0.96, s: [{ c: true, p: [[0.66, 0.54], [0.52, 0.76], [0.3, 0.72], [0.25, 0.5], [0.42, 0.3], [0.66, 0.34], [0.66, 0.74], [0.8, 0.8], [0.95, 0.56], [0.88, 0.2], [0.56, 0.02], [0.2, 0.1], [0.0, 0.5], [0.15, 0.92], [0.54, 1.02], [0.8, 0.94]] }] },   // an open inner 'a' (it filled in at payoff weight)
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
    out.push({ lx, ly: -arc * (1 - 4 * t * t), rot: t * fan, strokes, dots: (G.dots || []).map(([u, v]) => [(u - G.w / 2) * size, (v - 0.5) * size]) });
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
 * 3D block lettering from the same hand-built skeletons: every stroke's brush outline is extruded (with a bevel) into
 * a mesh; strokes of a glyph share two materials (face, side), so overlaps merge visually. Returns { root, glyphs:[{g, w}] }
 * with the word laid out along +x, baseline at y = 0, facing +z.
 */
export function word3D(THREE, add, parent, word, size, { face, side, depth = 0.22, weight = 0.24, track = 0.16, nib = -0.6, seed = 3 } = {}) {
  const root = new THREE.Group(); parent.add(root);
  const lay = layoutWord(word, size, { track, r: null });
  const lw = size * weight;
  const glyphs = [];
  lay.letters.forEach((Lt, i) => {
    const g = new THREE.Group(); g.position.set(Lt.lx + lay.width / 2, size / 2, 0); root.add(g);
    const toShape = (poly) => { const pts = poly.map(([x, y]) => new THREE.Vector2(x, -y)); return new THREE.Shape(pts); };
    const ext = { depth, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: lw * 0.08, bevelSegments: 2, curveSegments: 4 };
    for (const s of Lt.strokes) {
      if (s.P.length < 2) continue;
      const poly = nibStroke(s.P, lw, nib, null, 0);
      const geo = new THREE.ExtrudeGeometry(toShape(poly), ext); geo.translate(0, 0, -depth / 2);
      add(geo, [face, side], { outline: 1.15 }, [0, 0, 0], [0, 0, 0], g);
    }
    for (const [dx, dy] of Lt.dots) {
      const geo = new THREE.ExtrudeGeometry(new THREE.Shape(ellipsePts(dx, -dy, lw * 0.62, lw * 0.62, 0, 20).map(([x, y]) => new THREE.Vector2(x, y))), ext); geo.translate(0, 0, -depth / 2);
      add(geo, [face, side], { outline: 1.15 }, [0, 0, 0], [0, 0, 0], g);
    }
    glyphs.push({ g, x: Lt.lx + lay.width / 2 });
  });
  return { root, glyphs, width: lay.width };
}
