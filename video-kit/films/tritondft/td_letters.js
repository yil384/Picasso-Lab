// td_letters.js - hand-lettered comic SFX / numbers painted with p5.brush strokes (no web font).
// Every glyph is a stroke skeleton in a unit box (cap height 1, y down). A word is painted once per boil
// variant into a transparent sprite (bake cache), then popped / wobbled / tilted per frame on a 2D layer.
// Lettering recipe after ClaudeAnimationBase src/core.js (MIT, (c) JohnHeibel): pop with overshoot, ink drop
// shadow, tilt, decaying wobble.
import { TAU, hsh, PAL, bake } from './td_core.js';

const ellP = (cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 18) => Array.from({ length: n + 1 }, (_, i) => {
  const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
});
// stroke skeletons: w = advance width (cap-height units), s = strokes (polylines; smooth = splined), dots
export const GLYPH = {
  A: { w: 0.78, s: [[[0, 1], [0.39, 0], [0.78, 1]], [[0.17, 0.64], [0.61, 0.64]]] },
  B: { w: 0.62, s: [[[0, 0], [0, 1]], [[0, 0.02], [0.36, 0], [0.56, 0.1], [0.58, 0.3], [0.38, 0.47], [0, 0.48]], [[0, 0.48], [0.42, 0.48], [0.62, 0.62], [0.62, 0.86], [0.42, 1], [0, 1]]], smooth: true },
  C: { w: 0.7, s: [ellP(0.4, 0.5, 0.4, 0.5, 0.8, TAU - 0.8, 16)], smooth: true },
  D: { w: 0.68, s: [[[0, 0], [0, 1]], [[0, 0.02], [0.3, 0], [0.6, 0.18], [0.68, 0.5], [0.6, 0.82], [0.3, 1], [0, 0.98]]], smooth: true },
  E: { w: 0.54, s: [[[0.56, 0], [0, 0.02], [0, 1], [0.58, 0.98]], [[0, 0.5], [0.44, 0.48]]] },
  F: { w: 0.52, s: [[[0.56, 0], [0, 0.02], [0, 1]], [[0, 0.5], [0.44, 0.48]]] },
  G: { w: 0.78, s: [ellP(0.4, 0.5, 0.4, 0.5, TAU - 0.8, 0.15, 16), [[0.46, 0.56], [0.8, 0.56]]], smooth: true },
  H: { w: 0.64, s: [[[0, 0], [0, 1]], [[0.64, 0], [0.64, 1]], [[0, 0.5], [0.64, 0.49]]] },
  I: { w: 0.0, s: [[[0, 0], [0, 1]]] },
  K: { w: 0.62, s: [[[0, 0], [0, 1]], [[0.62, 0], [0.02, 0.62]], [[0.22, 0.44], [0.66, 1]]] },
  L: { w: 0.5, s: [[[0, 0], [0, 1], [0.54, 0.98]]] },
  M: { w: 0.9, s: [[[0, 1], [0.06, 0], [0.45, 0.64], [0.84, 0], [0.9, 1]]] },
  N: { w: 0.68, s: [[[0, 1], [0.01, 0], [0.67, 1], [0.68, 0]]] },
  O: { w: 0.8, s: [ellP(0.4, 0.5, 0.4, 0.5, -1.6, -1.6 + TAU * 1.04, 20)], smooth: true },
  P: { w: 0.6, s: [[[0, 1], [0, 0]], [[0, 0.02], [0.38, 0], [0.6, 0.14], [0.6, 0.36], [0.38, 0.5], [0, 0.5]]], smooth: true },
  R: { w: 0.64, s: [[[0, 1], [0, 0]], [[0, 0.02], [0.38, 0], [0.6, 0.14], [0.6, 0.34], [0.38, 0.48], [0, 0.49]], [[0.28, 0.49], [0.66, 1]]], smooth: true },
  S: { w: 0.62, s: [[[0.6, 0.12], [0.34, 0.0], [0.07, 0.1], [0.06, 0.32], [0.3, 0.47], [0.56, 0.6], [0.62, 0.84], [0.37, 1.0], [0.02, 0.9]]], smooth: true },
  T: { w: 0.66, s: [[[0, 0.01], [0.66, 0]], [[0.33, 0], [0.33, 1]]] },
  U: { w: 0.64, s: [[[0, 0], [0, 0.7], [0.1, 0.94], [0.32, 1], [0.54, 0.94], [0.64, 0.7], [0.64, 0]]], smooth: true },
  V: { w: 0.74, s: [[[0, 0], [0.37, 1], [0.74, 0]]] },
  W: { w: 1.0, s: [[[0, 0], [0.22, 1], [0.5, 0.34], [0.78, 1], [1.0, 0]]] },
  X: { w: 0.68, s: [[[0, 0], [0.68, 1]], [[0.68, 0], [0, 1]]] },
  Y: { w: 0.7, s: [[[0, 0], [0.35, 0.5], [0.7, 0]], [[0.35, 0.5], [0.35, 1]]] },
  Z: { w: 0.7, s: [[[0.02, 0.02], [0.7, 0.0], [0.0, 1.0], [0.72, 0.98]]] },
  0: { w: 0.62, s: [ellP(0.31, 0.5, 0.31, 0.5, -1.6, -1.6 + TAU * 1.04, 20)], smooth: true },
  1: { w: 0.3, s: [[[0, 0.2], [0.28, 0], [0.28, 1]]] },
  2: { w: 0.6, s: [[[0.02, 0.2], [0.15, 0.04], [0.36, 0], [0.56, 0.1], [0.58, 0.3], [0.42, 0.52], [0.02, 0.98], [0.62, 0.98]]], smooth: true },
  3: { w: 0.58, s: [[[0.02, 0.1], [0.28, 0], [0.52, 0.08], [0.54, 0.28], [0.28, 0.46]], [[0.28, 0.46], [0.54, 0.58], [0.58, 0.82], [0.34, 1], [0.0, 0.9]]], smooth: true },
  4: { w: 0.66, s: [[[0.5, 1], [0.5, 0]], [[0.5, 0.02], [0.0, 0.68], [0.68, 0.68]]] },
  5: { w: 0.6, s: [[[0.58, 0], [0.1, 0.01]], [[0.1, 0.01], [0.05, 0.45], [0.3, 0.38], [0.56, 0.5], [0.6, 0.76], [0.42, 0.98], [0.0, 0.92]]], smooth: true },
  6: { w: 0.6, s: [[[0.54, 0.05], [0.32, 0.0], [0.1, 0.16], [0.0, 0.56], [0.08, 0.88], [0.3, 1.0], [0.53, 0.9], [0.6, 0.7], [0.5, 0.5], [0.3, 0.45], [0.08, 0.55], [0.02, 0.66]]], smooth: true },
  7: { w: 0.6, s: [[[0, 0.01], [0.6, 0], [0.22, 1]]] },
  8: { w: 0.6, s: [[[0.3, 0.46], [0.08, 0.36], [0.06, 0.14], [0.3, 0.0], [0.54, 0.14], [0.52, 0.36], [0.3, 0.46], [0.04, 0.6], [0.02, 0.84], [0.3, 1.0], [0.58, 0.84], [0.56, 0.6], [0.3, 0.46]]], smooth: true },
  9: { w: 0.6, s: [[[0.06, 0.95], [0.28, 1.0], [0.5, 0.84], [0.6, 0.44], [0.52, 0.12], [0.3, 0.0], [0.07, 0.1], [0.0, 0.3], [0.1, 0.5], [0.3, 0.55], [0.52, 0.45], [0.58, 0.34]]], smooth: true },
  '%': { w: 0.74, s: [[[0.66, 0.02], [0.08, 0.98]], ellP(0.16, 0.2, 0.13, 0.17, 0, TAU * 1.05, 12), ellP(0.58, 0.8, 0.13, 0.17, 0, TAU * 1.05, 12)], smooth: true },
  $: { w: 0.62, s: [[[0.6, 0.14], [0.34, 0.02], [0.07, 0.12], [0.06, 0.32], [0.3, 0.47], [0.56, 0.6], [0.62, 0.84], [0.37, 0.98], [0.02, 0.88]], [[0.32, -0.14], [0.32, 1.14]]], smooth: true },
  '.': { w: 0.0, s: [], dots: [[0, 0.92]] },
  x: { w: 0.52, s: [[[0, 0.32], [0.52, 0.94]], [[0.52, 0.32], [0, 0.94]]] },     // the multiplication sign
  '!': { w: 0.0, s: [[[0, 0], [0, 0.62]]], dots: [[0, 0.93]] },
  '?': { w: 0.54, s: [[[0.02, 0.18], [0.2, 0.0], [0.46, 0.04], [0.54, 0.24], [0.28, 0.46], [0.27, 0.66]]], dots: [[0.27, 0.93]], smooth: true },
  ' ': { w: 0.35, s: [] },
};

function smoothPts(pts, n = 4) {
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

/** Layout a word: letters with jaunty per-letter rotation / bounce. Returns {letters, width} in px. */
export function layoutWord(word, size, o = {}) {
  const lw = size * (o.weight ?? 0.26), gap = size * (o.gap ?? 0.16);
  const L = [...word].map((ch) => GLYPH[ch] || GLYPH[' ']);
  const widths = L.map((G, i) => G.w * size * (o.scaleOf ? o.scaleOf(i) : 1) + lw);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (L.length - 1);
  const letters = [];
  let cx = -total / 2;
  L.forEach((G, i) => {
    const sc = o.scaleOf ? o.scaleOf(i) : 1, w = widths[i], lx = cx + w / 2, t = L.length > 1 ? i / (L.length - 1) - 0.5 : 0;
    const ly = -(o.arc ?? 0) * size * (1 - 4 * t * t) + (hsh(i, word.length, o.seed ?? 3) - 0.5) * size * (o.bounce ?? 0.1);
    const rot = (hsh(i, word.length, (o.seed ?? 3) + 2) - 0.5) * (o.jaunt ?? 0.2) + t * (o.fan ?? 0);
    letters.push({ G, lx, ly, rot, sc });
    cx += w + gap;
  });
  return { letters, width: total, lw };
}

/**
 * Paint a word with p5.brush centred at (x, y): extruded ink shadow, ink outline, colour, hatch shading on the
 * lower half of each stroke, a cream dry-brush nick. size = cap height (px). o: { fill, ink, shade, weight,
 * extrude: [dx, dy] (fraction of size), seed, arc, jaunt, bounce, skew, v (boil variant) }
 */
export function paintWord(brush, word, x, y, size, o = {}) {
  const { letters, lw } = layoutWord(word, size, o);
  const ink = o.ink || PAL.ink, fill = o.fill || PAL.pop, v = o.v ?? 0;
  const skew = o.skew ?? -0.12;
  const jit = (i, k) => (hsh(v * 7.1 + 1, i, k, o.seed ?? 1) - 0.5) * size * 0.018;
  const tf = (Lt, px, py) => {       // glyph unit coords -> sprite px
    const G = Lt.G, u = (px - G.w / 2) * size * Lt.sc, w = (py - 0.5) * size * Lt.sc;
    const c = Math.cos(Lt.rot), s = Math.sin(Lt.rot);
    const X = u * c - w * s, Y = u * s + w * c;
    return [x + Lt.lx + X - Y * skew, y + Lt.ly + Y];
  };
  const strokesOf = (Lt, li) => Lt.G.s.map((st, si) => (Lt.G.smooth ? smoothPts(st) : st)
    .map(([px, py], k) => { const [X, Y] = tf(Lt, px, py); return [X + jit(li * 31 + si, k), Y + jit(li * 31 + si, k + 50)]; }));
  const all = letters.map((Lt, li) => ({ Lt, st: strokesOf(Lt, li), dots: (Lt.G.dots || []).map(([px, py]) => tf(Lt, px, py)) }));
  const W = (px) => px / 11;                                     // 'fatink' is an 11-px brush
  const pass = (col, width, dx, dy, bname = 'fatink') => {
    brush.set(bname, col, W(width));
    for (const { st, dots } of all) {
      for (const s of st) {
        if (s.length === 2) brush.line(s[0][0] + dx, s[0][1] + dy, s[1][0] + dx, s[1][1] + dy);
        else brush.spline(s.map(([a, b]) => [a + dx, b + dy]), 0.35);
      }
      // dots as a short fat dab (a fill would pool like watercolour)
      for (const [a, b] of dots) brush.line(a + dx - width * 0.06, b + dy - width * 0.1, a + dx + width * 0.06, b + dy + width * 0.08);
    }
  };
  const ex = o.extrude ?? [0.07, 0.09], ol = size * 0.12;
  // extruded ink block (a few offsets so it reads as depth, not a blurry shadow)
  for (let k = 3; k >= 1; k--) pass(ink, lw + ol, ex[0] * size * k / 3, ex[1] * size * k / 3);
  pass(ink, lw + ol, 0, 0);
  // two-tone bevel: the colour's dark twin shows as a crescent on the lower-right inside the outline
  if (o.shade) { pass(o.shade, lw, 0, 0); pass(o.shade, lw, 0, 0); }
  const off = o.shade ? -lw * 0.16 : 0;
  pass(fill, lw * (o.shade ? 0.8 : 1), off, off);
  pass(fill, lw * (o.shade ? 0.8 : 1), off, off);
}

export function addLetterBrushes(brush) {
  brush.add('inkpen', { type: 'default', weight: 3.2, scatter: 0.12, sharpness: 0.85, grain: 30, opacity: 235, spacing: 0.2, pressure: [1.15, 0.75], rotate: 'natural', noise: 0.1 });
  brush.add('bigink', { type: 'default', weight: 6, scatter: 0.2, sharpness: 0.8, grain: 30, opacity: 235, spacing: 0.2, pressure: [1.2, 0.7], rotate: 'natural', noise: 0.15 });
  brush.add('fatink', { type: 'default', weight: 11, scatter: 0.18, sharpness: 0.75, grain: 24, opacity: 245, spacing: 0.16, pressure: [1.12, 0.82], rotate: 'natural', noise: 0.1 });
}

/** Bake a word sprite (transparent background) in `variants` boil drawings. Returns [canvas, ...]. */
export async function bakeWord(THREE, key, word, size, o = {}, variants = 2) {
  const { width } = layoutWord(word, size, o);
  const W = Math.ceil(width + size * 1.1), H = Math.ceil(size * 1.9 + (o.arc ?? 0) * size * 2);
  const out = [];
  for (let v = 0; v < variants; v++) {
    const tex = await bake(THREE, { width: W, height: H, seed: 300 + v * 11, key: `w-${key}-${v}`, background: null },
      (p, brush, w, h) => paintWord(brush, word, w / 2 - size * 0.04, h / 2 - size * 0.06, size, { ...o, v }));
    out.push(tex.userData.canvas);
  }
  return out;
}

const backOut = (x) => { x = Math.max(0, Math.min(1, x)); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
/** Draw a baked word sprite on a 2D layer: pops in (overshoot), wobbles, tilts, fades. age/life in frames. */
export function drawWord(g, sprites, F, x, y, age, { life = 26, rot = -0.08, scale = 1, popF = 5, fadeF = 5, squash = 0 } = {}) {
  if (age < 0 || age >= life || !sprites) return;
  const img = sprites[Math.floor(F / 2) % sprites.length];
  // exit: no alpha fade (a ghosted word over the next shot reads as a web cross-fade); it swells a touch, then
  // shrinks to nothing like a popped balloon
  const out = Math.max(0, Math.min(1, (age - (life - fadeF)) / fadeF));
  const pop = out < 0.3 ? 1 + 0.4 * out : 1.12 * (1 - out) / 0.7;
  const k = backOut(age / popF) * scale * pop;
  if (k < 0.02) return;
  const wob = Math.sin(age * 0.9) * 0.035 * Math.max(0, 1 - age / life);
  g.save();
  g.translate(x, y); g.rotate(rot + wob); g.scale(k * (1 + squash), k * (1 - squash));
  g.drawImage(img, -img.width / 2, -img.height / 2);
  g.restore();
}
