// q_letters.js - hand-built comic lettering for SFX and the payoff numbers (Canvas2D, design px).
// No web font: every glyph is a stroke skeleton, laid down as a tapered brush ribbon (pressure swell, dry ends,
// boil jitter), with an offset ink drop shadow and an ink keyline, P(doom)-style pop (backOut), -0.08 rad tilt
// and a decaying wobble. No glossy sheen (the round-1 reviewers read that as WordArt).
import { clamp } from '/pv/runtime/pv.js';
import { through, INK, TAU, backOut } from './q_ink.js';

// glyph skeletons: unit height (0 = cap line, 1 = baseline, y down), w = advance width
const E = (cx, cy, rx, ry, n = 18, a0 = 0, a1 = TAU) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
export const GLYPH = {
  A: { w: 0.78, s: [[[0, 1], [0.39, 0], [0.78, 1]], [[0.17, 0.64], [0.62, 0.62]]] },
  B: { w: 0.62, s: [[[0, 1], [0, 0]], [[0, 0], [0.42, 0.0], [0.56, 0.12], [0.52, 0.36], [0.3, 0.47], [0, 0.47]], [[0.3, 0.47], [0.56, 0.56], [0.62, 0.8], [0.44, 0.98], [0, 1]]], smooth: [false, true, true] },
  C: { w: 0.7, s: [E(0.4, 0.5, 0.4, 0.5, 16, -0.75, -0.75 - TAU * 0.78)] },
  E: { w: 0.56, s: [[[0.56, 0], [0, 0], [0, 1], [0.56, 1]], [[0, 0.5], [0.44, 0.5]]] },
  H: { w: 0.64, s: [[[0, 0], [0, 1]], [[0.64, 0], [0.64, 1]], [[0, 0.52], [0.64, 0.5]]] },
  I: { w: 0.0, s: [[[0, 0], [0, 1]]] },
  K: { w: 0.62, s: [[[0, 0], [0, 1]], [[0.62, 0], [0.04, 0.58]], [[0.2, 0.44], [0.64, 1]]] },
  L: { w: 0.52, s: [[[0, 0], [0, 1], [0.52, 1]]] },
  M: { w: 0.86, s: [[[0, 1], [0.04, 0], [0.43, 0.62], [0.82, 0], [0.86, 1]]] },
  N: { w: 0.66, s: [[[0, 1], [0, 0], [0.66, 1], [0.66, 0]]] },
  O: { w: 0.8, s: [E(0.4, 0.5, 0.4, 0.5, 20, -1.6, -1.6 + TAU * 1.04)] },
  P: { w: 0.6, s: [[[0, 1], [0, 0]], [[0, 0], [0.4, 0], [0.6, 0.15], [0.6, 0.35], [0.4, 0.5], [0, 0.5]]], smooth: [false, true] },
  R: { w: 0.62, s: [[[0, 1], [0, 0]], [[0, 0], [0.4, 0], [0.6, 0.14], [0.58, 0.34], [0.36, 0.48], [0, 0.48]], [[0.3, 0.48], [0.64, 1]]], smooth: [false, true, false] },
  S: { w: 0.62, s: [[[0.6, 0.12], [0.36, 0.0], [0.08, 0.1], [0.06, 0.32], [0.3, 0.47], [0.56, 0.6], [0.62, 0.84], [0.38, 1.0], [0.02, 0.9]]], smooth: [true] },
  T: { w: 0.66, s: [[[0, 0], [0.66, 0]], [[0.33, 0], [0.33, 1]]] },
  U: { w: 0.64, s: [[[0, 0], [0, 0.72], [0.12, 0.96], [0.32, 1.0], [0.52, 0.96], [0.64, 0.72], [0.64, 0]]], smooth: [true] },
  V: { w: 0.72, s: [[[0, 0], [0.36, 1], [0.72, 0]]] },
  W: { w: 1.0, s: [[[0, 0], [0.22, 1], [0.5, 0.34], [0.78, 1], [1.0, 0]]] },
  X: { w: 0.66, s: [[[0, 0], [0.66, 1]], [[0.66, 0], [0, 1]]] },
  Z: { w: 0.7, s: [[[0.02, 0.02], [0.7, 0.0], [0.0, 1.0], [0.72, 0.98]]] },
  '!': { w: 0.0, s: [[[0, 0], [0, 0.64]]], dots: [[0, 0.93]] },
  '?': { w: 0.5, s: [[[0.0, 0.2], [0.18, 0.0], [0.42, 0.04], [0.5, 0.24], [0.28, 0.44], [0.24, 0.66]]], smooth: [true], dots: [[0.24, 0.93]] },
  // numerals for the payoff (clear, classic comic numerals: a closed 4 so it never reads as "Y")
  '0': { w: 0.62, s: [E(0.31, 0.5, 0.31, 0.5, 20, -1.6, -1.6 + TAU * 1.04)] },
  '1': { w: 0.36, s: [[[0.0, 0.2], [0.3, 0.0], [0.3, 1.0]]] },
  '3': { w: 0.6, s: [[[0.02, 0.1], [0.28, 0.0], [0.54, 0.1], [0.54, 0.32], [0.26, 0.47]], [[0.26, 0.47], [0.58, 0.6], [0.6, 0.84], [0.34, 1.0], [0.0, 0.9]]], smooth: [true, true] },
  '4': { w: 0.72, s: [[[0.52, 1.02], [0.52, 0.0], [0.0, 0.68], [0.72, 0.68]]] },
  '7': { w: 0.64, s: [[[0.0, 0.02], [0.64, 0.0], [0.26, 1.02]]] },
  '.': { w: 0.0, s: [], dots: [[0, 0.9]] },
  '×': { w: 0.6, s: [[[0.0, 0.34], [0.6, 0.98]], [[0.6, 0.34], [0.0, 0.98]]] },
};

/** Lay out a word: returns letters [{lx, ly, rot, k, strokes:[[x,y]...], dots}] in word-local px around (0,0). */
function layoutWord(word, size, o, r) {
  const lw = size * (o.weight ?? 0.24), gap = size * (o.gap ?? 0.2);
  const L = [...word].map((ch) => GLYPH[ch] || GLYPH['?']);
  const widths = L.map((G) => G.w * size + lw);
  const total = widths.reduce((s, w) => s + w, 0) + gap * (L.length - 1);
  const hs = (i, k) => { const v = Math.sin((i + 1) * 127.1 + k * 311.7 + word.length * 17.3) * 43758.5453; return v - Math.floor(v); };
  const out = [];
  let cx = -total / 2;
  L.forEach((G, i) => {
    const w = widths[i], lx = cx + w / 2, t = L.length > 1 ? i / (L.length - 1) - 0.5 : 0;
    const k = o.pops ? o.pops(i) : 1;
    const ly = -(o.arc || 0) * (1 - 4 * t * t) + (hs(i, 1) - 0.5) * size * (o.bounce ?? 0.1);
    const rot = (hs(i, 2) - 0.5) * (o.jiggle ?? 0.2) + t * (o.fan ?? 0.2);
    const sc = (1 + (hs(i, 3) - 0.5) * (o.sizeVar ?? 0.1)) * (1 + (o.ramp || 0) * (L.length > 1 ? 1 - i / (L.length - 1) : 0));
    const strokes = G.s.map((s, j) => {
      const sm = G.smooth ? G.smooth[j] : false;
      const pts = (sm ? through(s, 5) : densify(s)).map(([u, v]) => [(u - G.w / 2) * size * sc + (r ? r.gauss(0, size * 0.007) : 0), (v - 0.5) * size * sc + (r ? r.gauss(0, size * 0.007) : 0)]);
      return pts;
    });
    out.push({ lx, ly, rot, k, sc, strokes, dots: (G.dots || []).map(([u, v]) => [(u - G.w / 2) * size * sc, (v - 0.5) * size * sc]), lw, seed: i });
    cx += w + gap;
  });
  return { letters: out, total, lw };
}
function densify(P) {   // straight strokes: add points so the brush pressure has somewhere to swell
  const out = [];
  for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 4; k++) { const u = k / 4; out.push([P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u]); }
  out.push(P[P.length - 1]);
  return out;
}
/** brush ribbon with pressure: blunt start, swell, dry taper at the end (a loaded marker/brush) */
function brushRibbon(C, w, seed, chisel = false) {
  const n = C.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const t = i / Math.max(1, n - 1);
    const press = chisel
      ? (0.66 + 0.56 * Math.sin(Math.PI * Math.min(1, t * 1.25))) * (1 - 0.45 * Math.pow(Math.max(0, t - 0.72) / 0.28, 1.6))   // thick-thin
      : (0.78 + 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.15))) * (1 - 0.3 * Math.pow(Math.max(0, t - 0.8) / 0.2, 2));
    const wob = 1 + 0.06 * Math.sin(t * 9.1 + seed * 2.3);
    const hw = w / 2 * press * wob;
    L.push([C[i][0] - dy / d * hw, C[i][1] + dx / d * hw]); R.push([C[i][0] + dy / d * hw, C[i][1] - dx / d * hw]);
  }
  // round-ish caps
  const cap = (c, p, hw, dir) => { const out = []; const a0 = Math.atan2(p[1] - c[1], p[0] - c[0]); for (let j = 1; j < 6; j++) { const a = a0 + dir * (j / 6) * Math.PI; out.push([c[0] + Math.cos(a) * hw, c[1] + Math.sin(a) * hw]); } return out; };
  const hwE = Math.hypot(L[n - 1][0] - C[n - 1][0], L[n - 1][1] - C[n - 1][1]), hwS = Math.hypot(R[0][0] - C[0][0], R[0][1] - C[0][1]);
  if (chisel) {   // cut terminals: the pen leaves at a slant (one corner pulled along the stroke)
    const e = C[n - 1], p = C[Math.max(0, n - 2)], dl = Math.hypot(e[0] - p[0], e[1] - p[1]) || 1, ux = (e[0] - p[0]) / dl, uy = (e[1] - p[1]) / dl;
    L[n - 1] = [L[n - 1][0] + ux * hwE * 0.9, L[n - 1][1] + uy * hwE * 0.9];
    const s0 = C[0], s1 = C[Math.min(n - 1, 1)], dl0 = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]) || 1, vx = (s0[0] - s1[0]) / dl0, vy = (s0[1] - s1[1]) / dl0;
    R[0] = [R[0][0] + vx * hwS * 0.7, R[0][1] + vy * hwS * 0.7];
    return [...L, ...R.reverse()];
  }
  return [...L, ...cap(C[n - 1], L[n - 1], hwE, -1), ...R.reverse(), ...cap(C[0], R[R.length - 1], hwS, -1)];
}
function polyPath(g, P) { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }

/**
 * brushWord(g, word, x, y, size, o): comic SFX / number lettering centred at (x, y), cap height `size` design px.
 * o: { fill, ink=INK, shadow=[dx,dy] (fraction of size), key (keyline width fraction), rot, arc, fan, pops(i)->0..1+,
 *      jitter (boil rng), alpha, skew, weight }
 */
export function brushWord(g, word, x, y, size, o = {}) {
  const r = o.jitter;
  const { letters, lw } = layoutWord(word, size, o, r);
  g.save();
  g.translate(x, y); g.rotate(o.rot ?? -0.08);
  if (o.skew) g.transform(1, 0, o.skew, 1, 0, 0);
  g.globalAlpha = o.alpha ?? 1;
  const ink = o.ink || INK, key = (o.key ?? 0.12) * size, sh = o.shadow || [0.06, 0.075];
  const shapes = letters.map((Lt) => ({ Lt, polys: Lt.strokes.map((s) => brushRibbon(s, lw, Lt.seed, !!o.chisel)) }));
  const pass = (col, grow, dx, dy) => {
    g.fillStyle = col; g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round';
    for (const { Lt, polys } of shapes) {
      if (Lt.k <= 0.01) continue;
      g.save(); g.translate(Lt.lx + dx, Lt.ly + dy); g.rotate(Lt.rot); g.scale(Lt.k, Lt.k);
      g.beginPath(); for (const P of polys) polyPath(g, P); g.fill();
      if (grow > 0) { g.lineWidth = grow; g.beginPath(); for (const P of polys) polyPath(g, P); g.stroke(); }
      for (const [px, py] of Lt.dots) { g.beginPath(); g.arc(px, py, lw * 0.62 + grow / 2, 0, TAU); g.fill(); }
      g.restore();
    }
  };
  pass(ink, key, sh[0] * size, sh[1] * size);   // ink drop shadow
  pass(ink, key, 0, 0);                          // ink keyline
  pass(o.fill || '#ff3d7f', 0, 0, 0);            // colour
  if (o.shade) {                                 // Ben-Day shade band on the lower part of each letter (one fill + dots)
    const dp = Math.max(4, size * 0.075), rr = dp * 0.36;
    g.fillStyle = o.shade;
    for (const { Lt, polys } of shapes) {
      if (Lt.k <= 0.01) continue;
      g.save(); g.translate(Lt.lx, Lt.ly); g.rotate(Lt.rot); g.scale(Lt.k, Lt.k);
      g.beginPath(); for (const P of polys) polyPath(g, P); g.clip();
      const h = size * Lt.sc;
      for (let yy = h * 0.05; yy < h * 0.7; yy += dp) {
        const k = clamp((yy - h * 0.05) / (h * 0.35)), row = Math.round(yy / dp);
        g.beginPath();
        for (let xx = -h; xx < h; xx += dp) { const ox = (row % 2) * dp / 2; g.moveTo(xx + ox + rr * (0.4 + 0.6 * k), yy); g.arc(xx + ox, yy, rr * (0.4 + 0.6 * k), 0, TAU); }
        g.fill();
      }
      g.restore();
    }
  } else if (o.inner) {                          // optional second colour on the lower half (two-tone print)
    g.save(); g.beginPath(); g.rect(-9999, size * 0.12, 19999, 9999); g.clip(); g.globalAlpha = (o.alpha ?? 1) * 0.85; pass(o.inner, 0, 0, 0); g.restore();
  }
  g.restore();
}

/** P(doom) SFX timing: pop (backOut 0.2 s), decaying wobble, fade over the last 0.25 s. age/life in frames. */
export function sfxState(age, life, fps = 24) {
  if (age < 0 || age >= life) return null;
  const pop = backOut(age / (0.2 * fps));
  const wob = Math.sin(age / fps * 20) * 0.03 * (1 - age / life);
  const alpha = 1 - clamp((age - (life - 0.25 * fps)) / (0.25 * fps));
  return { pop, wob, alpha };
}

// ---- hand-authored script for the "Qubrio" nameplate (stroke skeletons, cap height 1, y down; after the comic film)
const ell = (x, y, rx, ry, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const a = i / n * TAU - Math.PI / 2; return [x + Math.cos(a) * rx, y + Math.sin(a) * ry]; });
const SCRIPT = {
  Q: { w: 0.86, s: [ell(0.4, 0.5, 0.38, 0.47, 20), [[0.42, 0.72], [0.62, 0.98], [0.92, 1.04]]] },
  u: { w: 0.42, s: [[[0.0, 0.5], [0.0, 0.86], [0.1, 1.0], [0.25, 0.97], [0.34, 0.82]], [[0.34, 0.5], [0.35, 1.0]]] },
  b: { w: 0.42, s: [[[0.0, -0.02], [0.0, 1.0]], [[0.0, 0.66], [0.14, 0.5], [0.34, 0.56], [0.38, 0.8], [0.22, 1.0], [0.0, 0.96]]] },
  r: { w: 0.32, s: [[[0.0, 0.5], [0.0, 1.0]], [[0.0, 0.68], [0.12, 0.52], [0.32, 0.5]]] },
  i: { w: 0.08, s: [[[0.0, 0.52], [0.0, 1.0]]], dots: [[0.0, 0.3]] },
  o: { w: 0.44, s: [ell(0.22, 0.75, 0.22, 0.25, 14)] },
};
/** scriptWord(g, word, x, y, size, col, o): centred at (x, y) (in the current transform), cap height `size`. */
export function scriptWord(g, word, x, y, size, col, o = {}) {
  const lw = size * (o.weight ?? 0.17);
  let total = 0; for (const ch of word) total += (SCRIPT[ch].w + 0.18) * size; total -= 0.18 * size;
  g.save(); g.translate(x - total / 2, y - size / 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const pass = (c, w, dx, dy) => {
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = w;
    let cx = 0;
    for (const ch of word) {
      const G = SCRIPT[ch];
      for (const s of G.s) { const P = s.length > 2 ? through(s, 4) : s; g.beginPath(); P.forEach(([u, v], i) => (i ? g.lineTo(cx + u * size + dx, v * size + dy) : g.moveTo(cx + u * size + dx, v * size + dy))); g.stroke(); }
      for (const [u, v] of G.dots || []) { g.beginPath(); g.arc(cx + u * size + dx, v * size + dy, w * 0.6, 0, TAU); g.fill(); }
      cx += (G.w + 0.18) * size;
    }
  };
  if (o.shadow) pass(o.shadow, lw * 1.25, size * 0.05, size * 0.06);
  if (o.key) pass(o.key, lw * 1.7, 0, 0);
  pass(col, lw, 0, 0);
  g.restore();
}

/** jagged comic burst balloon (behind an SFX): ink drop shadow, fill, ink keyline; centred at (x, y), radii rx, ry */
export function burst(g, x, y, rx, ry, o = {}) {
  const n = o.spikes || 14, seed = o.seed || 1, P = [];
  const h = (i, k) => { const v = Math.sin(i * 91.7 + k * 37.1 + seed * 13.3) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU + (h(i, 1) - 0.5) * 0.12, out = i % 2 === 0;
    const r = out ? 1 + 0.22 * h(i, 2) : 0.72 + 0.08 * h(i, 3);
    P.push([x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r]);
  }
  const path = (dx, dy) => { g.beginPath(); P.forEach(([px, py], i) => (i ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy))); g.closePath(); };
  g.save(); g.globalAlpha = o.alpha ?? 1; g.lineJoin = 'miter';
  path(rx * 0.05, ry * 0.07); g.fillStyle = o.ink || INK; g.fill();
  path(0, 0); g.fillStyle = o.fill || '#fff6e0'; g.fill();
  g.lineWidth = o.lw || Math.max(3, rx * 0.035); g.strokeStyle = o.ink || INK; g.stroke();
  g.restore();
}
