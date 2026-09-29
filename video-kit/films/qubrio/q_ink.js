// q_ink.js - hand-drawn 2D marks tracked to the 3D world (Canvas2D, design units 1920x1080):
// minimal faces drawn in each head's tangent plane (so they turn and foreshorten with the body), emotes,
// and the hand-built comic lettering (stroke skeletons -> ink shadow, ink outline, colour; no web font).
// through()/ribbon() and the take/emote recipes follow ClaudeAnimationBase src/core.js (MIT, (c) JohnHeibel),
// by way of the two earlier Qubrio films (reference/story-picturebook/qb_ink.js, reference/style-comic/comic.html).
import { clamp, lerp } from '/pv/runtime/pv.js';

export const TAU = Math.PI * 2;
export const INK = '#1a1530', CREAM = '#fff6e0';

// ---- geometry helpers ------------------------------------------------------------------------------------
export function through(P, n = 6) {
  if (P.length < 3) return P.slice();
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
/** Tapered brush ribbon around a polyline (closed polygon). */
export function ribbon(P, w0, w1 = w0, smooth = true) {
  const C = smooth ? through(P) : P, n = C.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const t = i / Math.max(1, n - 1), w = lerp(w0, w1, t) / 2 * (0.35 + 0.65 * Math.sin(Math.PI * clamp(t * 0.9 + 0.05)));
    L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
  }
  return L.concat(R.reverse());
}
/** first fraction k of a polyline (by length) */
export function trunc(pts, k) {
  if (k >= 1) return pts;
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let need = L * clamp(k); const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (need <= seg[i - 1]) { const u = need / (seg[i - 1] || 1); out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); return out; }
    need -= seg[i - 1]; out.push(pts[i]);
  }
  return out;
}
export function fillPoly(g, pts, col) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = col; g.fill(); }
export function stroke(g, pts, w, col = INK, w1 = null) { fillPoly(g, ribbon(pts, w, w1 ?? w), col); }
export const backOut = (x, s = 1.9) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const jit = (r, a) => (r ? r.gauss(0, a) : 0);
export function starPts(cx, cy, r, inner = 0.4, n = 4, rot = -Math.PI / 2) {
  const P = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * TAU, rr = i % 2 ? r * inner : r; P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return P;
}
function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.8, y - s * 0.95, x, y - s * 0.3);
  g.bezierCurveTo(x + s * 0.8, y - s * 0.95, x + s * 1.3, y + s * 0.1, x, y + s * 0.9); g.closePath();
}

// ---- faces (unit space: the head radius is 1; x right, y down) ---------------------------------------------
// Minimal P(doom) faces: two dots or slits; the eye shape carries the emotion; a mouth only on takes.
export const FACE_LAYOUT = {
  atom: { ex: 0.34, ey: -0.02, es: 1.25, my: 0.34, bx: 0.58, by: 0.24 },
  hero: { ex: 0.32, ey: -0.06, es: 1.1, my: 0.32, bx: 0.56, by: 0.2 },
  dial: { ex: 0.3, ey: 0.2, es: 0.85, my: 0.5, bx: 0.52, by: 0.36 },   // below the hands' hub
  flat: { ex: 0.34, ey: -0.1, es: 1.1, my: 0.34, bx: 0.6, by: 0.16 },
};
function eye(g, type, x, y, s, side, look, r, ph = 0) {
  const lx = (look?.[0] || 0) * 0.07 * s, ly = (look?.[1] || 0) * 0.07 * s;
  g.save(); g.translate(x + jit(r, 0.006), y + jit(r, 0.006));
  switch (type) {
    case 'dot': case 'wide': {
      const w = type === 'wide' ? 1.3 : 1;
      g.beginPath(); g.ellipse(lx, ly, 0.085 * s * w, 0.13 * s * w, jit(r, 0.05), 0, TAU); g.fillStyle = INK; g.fill();
      if (type === 'wide') { g.beginPath(); g.arc(lx - 0.028 * s * w, ly - 0.05 * s * w, 0.03 * s * w, 0, TAU); g.fillStyle = CREAM; g.fill(); }
      break;
    }
    case 'half': {   // sleepy / unimpressed: a lid over a dot
      g.save(); g.beginPath(); g.rect(-0.3 * s, -0.005 * s, 0.6 * s, 0.4 * s); g.clip();
      g.beginPath(); g.ellipse(lx * 0.5, 0, 0.09 * s, 0.12 * s, 0, 0, TAU); g.fillStyle = INK; g.fill(); g.restore();
      stroke(g, [[-0.14 * s, -0.005 * s], [0, -0.025 * s], [0.14 * s, -0.005 * s]], 0.055 * s);
      break;
    }
    case 'sleep': stroke(g, [[-0.12 * s, -0.01 * s], [0, 0.06 * s], [0.12 * s, -0.01 * s]], 0.055 * s); break;
    case 'happy': stroke(g, [[-0.12 * s, 0.05 * s], [0, -0.065 * s], [0.12 * s, 0.05 * s]], 0.06 * s); break;
    case 'squeeze': { const d = -side; stroke(g, [[-0.1 * s * d, -0.09 * s], [0.08 * s * d, 0], [-0.1 * s * d, 0.09 * s]], 0.06 * s); break; }
    case 'slit': {   // determined: a flat lid line over a small dot, brow tilted in
      g.beginPath(); g.ellipse(lx, ly + 0.025 * s, 0.075 * s, 0.06 * s, 0, 0, TAU); g.fillStyle = INK; g.fill();
      stroke(g, [[-0.14 * s, -0.09 * s + side * 0.035 * s], [0.14 * s, -0.09 * s - side * 0.035 * s]], 0.05 * s);
      break;
    }
    case 'worried': {
      g.beginPath(); g.ellipse(lx, ly, 0.08 * s, 0.11 * s, 0, 0, TAU); g.fillStyle = INK; g.fill();
      stroke(g, [[-0.13 * s, -0.16 * s - side * 0.04 * s], [0.13 * s, -0.16 * s + side * 0.04 * s]], 0.045 * s);
      break;
    }
    case 'x': {
      stroke(g, [[-0.1 * s, -0.1 * s], [0.1 * s, 0.1 * s]], 0.055 * s, INK); stroke(g, [[0.1 * s, -0.1 * s], [-0.1 * s, 0.1 * s]], 0.055 * s, INK);
      break;
    }
    case 'star': {
      const P = starPts(0, 0, 0.2 * s, 0.36);
      fillPoly(g, P, '#ffcf3d'); g.lineWidth = 0.028 * s; g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
      break;
    }
    case 'dizzy': {
      const P = [], rot = (ph || 0) * side;
      for (let i = 0; i <= 30; i++) { const u = i / 30, a = rot + side * u * TAU * 2.1, rr = (0.02 + 0.13 * u) * s; P.push([Math.cos(a) * rr, Math.sin(a) * rr * 1.1]); }
      stroke(g, P, 0.045 * s, INK, 0.055 * s);
      break;
    }
    case 'heart': heartPath(g, 0, 0, 0.14 * s); g.fillStyle = '#ff3d7f'; g.fill(); g.lineWidth = 0.025 * s; g.strokeStyle = INK; g.stroke(); break;
    default: break;
  }
  g.restore();
}
function mouth(g, type, y, s, r) {
  switch (type) {
    case 'smile': stroke(g, [[-0.12 * s, y - 0.03 * s], [0, y + 0.05 * s + jit(r, 0.005)], [0.12 * s, y - 0.03 * s]], 0.055 * s); break;
    case 'flat': stroke(g, [[-0.1 * s, y], [0.1 * s, y + 0.01 * s]], 0.05 * s); break;
    case 'grin': {
      g.beginPath(); g.moveTo(-0.17 * s, y - 0.04 * s); g.lineTo(0.17 * s, y - 0.04 * s);
      g.quadraticCurveTo(0.16 * s, y + 0.22 * s, 0, y + 0.22 * s); g.quadraticCurveTo(-0.16 * s, y + 0.22 * s, -0.17 * s, y - 0.04 * s);
      g.closePath(); g.fillStyle = INK; g.fill();
      g.save(); g.clip(); g.beginPath(); g.ellipse(0, y + 0.17 * s, 0.09 * s, 0.06 * s, 0, 0, TAU); g.fillStyle = '#ff7a8a'; g.fill(); g.restore();
      break;
    }
    case 'o': g.beginPath(); g.ellipse(0, y + 0.02 * s, 0.055 * s, 0.075 * s, 0, 0, TAU); g.fillStyle = INK; g.fill(); break;
    case 'yawn': {
      g.beginPath(); g.ellipse(0, y + 0.05 * s, 0.085 * s, 0.13 * s, 0, 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(0, y + 0.12 * s, 0.055 * s, 0.04 * s, 0, 0, TAU); g.fillStyle = '#ff7a8a'; g.fill();
      break;
    }
    case 'wobble': stroke(g, [[-0.13 * s, y], [-0.065 * s, y - 0.03 * s], [0, y + 0.01 * s], [0.065 * s, y - 0.03 * s], [0.13 * s, y]], 0.045 * s); break;
    case 'teeth': {
      const P = [[-0.16 * s, y - 0.05 * s], [0.16 * s, y - 0.05 * s], [0.14 * s, y + 0.08 * s], [-0.14 * s, y + 0.08 * s]];
      fillPoly(g, P, CREAM); g.lineWidth = 0.035 * s; g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(-0.15 * s, y + 0.015 * s); g.lineTo(0.15 * s, y + 0.015 * s); g.stroke();
      break;
    }
    default: break;
  }
}
function blushMarks(g, L, amt, r) {
  if (amt <= 0.02) return;
  for (const sgn of [-1, 1]) {
    const x = sgn * L.bx, y = L.by;
    g.beginPath(); g.ellipse(x, y, 0.15, 0.08, 0, 0, TAU); g.fillStyle = `rgba(255,105,125,${0.55 * amt})`; g.fill();
    g.globalAlpha = amt;
    for (let k = -1; k <= 1; k++) stroke(g, [[x + k * 0.07 - 0.02, y + 0.05 + jit(r, 0.004)], [x + k * 0.07 + 0.03, y - 0.05]], 0.022, '#c7406a');
    g.globalAlpha = 1;
  }
}
/**
 * Draw one face. F = { layout, a:{x,y}, b:{x,y}, c:{x,y}, vis, face:{eyes, mouth, look, blush, ph} } where a is the
 * projected face centre, b the projected point one radius to the head's right, c one radius up (tangent plane).
 */
export function drawFace(g, F, r) {
  if (F.vis <= 0.01) return;
  const { a, b, c } = F, L = FACE_LAYOUT[F.layout] || FACE_LAYOUT.atom, fc = F.face;
  g.save();
  g.globalAlpha = F.vis;
  g.transform(b.x - a.x, b.y - a.y, -(c.x - a.x), -(c.y - a.y), a.x, a.y);
  blushMarks(g, L, fc.blush || 0, r);
  const look = fc.look || [0, 0];
  for (const side of [-1, 1]) eye(g, fc.eyes, side * L.ex + look[0] * 0.06, L.ey + look[1] * 0.06, L.es, side, look, r, fc.ph);
  if (fc.mouth) mouth(g, fc.mouth, L.my + look[1] * 0.03, L.es, r);
  g.restore();
}

// ---- emotes (screen space around a projected head of radius rs px) ----------------------------------------------
export function drawEmote(g, E, r) {
  const { x, y, rs, type, age = 0, f = 0 } = E;
  g.save();
  if (type === 'bang' || type === 'bang2') {
    const k = backOut(age / 4), fade = 1 - clamp((age - 12) / 5);
    if (fade > 0) {
      g.globalAlpha = fade; g.translate(x + rs * (E.dx ?? 0.95), y - rs * 1.3); g.rotate(E.rot ?? 0.15); g.scale(k, k);
      const s = Math.max(rs * 1.15, 34);
      const bar = ribbon([[0, -s * 0.62], [s * 0.02, -s * 0.12], [0, s * 0.18]], s * 0.3, s * 0.08, false);
      const draw = (dx, dy, col) => { g.save(); g.translate(dx, dy); fillPoly(g, bar, col); g.beginPath(); g.arc(0, s * 0.42, s * 0.11, 0, TAU); g.fillStyle = col; g.fill(); g.restore(); };
      draw(s * 0.06, s * 0.07, INK);
      draw(0, 0, type === 'bang2' ? '#b48cff' : '#f2a922');
      g.lineWidth = Math.max(3, s * 0.05); g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); bar.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
      g.beginPath(); g.arc(0, s * 0.42, s * 0.11, 0, TAU); g.stroke();
    }
  } else if (type === 'sweat') {
    const fade = 1 - clamp((age - 18) / 8);
    g.globalAlpha = Math.max(0, fade); g.translate(x + rs * 1.02, y - rs * 0.55 + age * rs * 0.025);
    const s = Math.max(rs, 24) * 0.26;
    g.beginPath(); g.moveTo(0, -s * 1.3); g.quadraticCurveTo(s * 0.9, 0, 0, s * 0.8); g.quadraticCurveTo(-s * 0.9, 0, 0, -s * 1.3);
    g.fillStyle = '#9fdcf5'; g.fill(); g.lineWidth = Math.max(3, s * 0.18); g.strokeStyle = INK; g.stroke();
  } else if (type === 'sparkle') {
    for (let i = 0; i < 3; i++) {
      const ph = (age / 10 + i / 3) % 1, sc = Math.sin(Math.PI * ph);
      const ang = -0.9 + i * 0.9 + 0.2 * Math.sin(i * 3.1);
      const px = x + Math.cos(ang - Math.PI / 2) * rs * (1.3 + 0.2 * i), py = y + Math.sin(ang - Math.PI / 2) * rs * (1.3 + 0.2 * i);
      const P = starPts(px, py, Math.max(rs, 24) * 0.24 * sc, 0.32);
      fillPoly(g, P, '#ffd84a'); g.lineWidth = Math.max(2.5, rs * 0.035); g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
    }
  } else if (type === 'zzz') {
    for (let i = 0; i < 3; i++) {
      const ph = (((f + i * 12) % 36) + 36) % 36 / 36;
      const a = Math.sin(Math.PI * ph);
      const s = Math.max(rs, 22) * (0.2 + 0.2 * ph);
      const px = x + rs * (0.7 + ph * 1.1), py = y - rs * (0.9 + ph * 1.6);
      g.globalAlpha = a * 0.9;
      stroke(g, [[px - s, py - s], [px + s, py - s * 1.05], [px - s, py + s], [px + s * 1.05, py + s * 0.95]], Math.max(4, s * 0.32), '#4a3a82', Math.max(3, s * 0.22));
    }
  } else if (type === 'ping') {
    for (let i = 0; i < 2; i++) {
      const a = age - i * 2; if (a < 0 || a > 10) continue;
      const k = 1 - Math.pow(1 - a / 10, 3), rr = rs * (1.05 + 0.7 * k);
      g.globalAlpha = 1 - k; g.lineWidth = Math.max(4, rs * 0.1 * (1 - k * 0.6)); g.strokeStyle = E.col || '#ffc02e';
      g.beginPath(); g.ellipse(x, y, rr, rr * 0.96, 0, 0, TAU); g.stroke();
    }
  } else if (type === 'question') {
    const k = backOut(age / 4), fade = 1 - clamp((age - 14) / 5);
    if (fade > 0) {
      g.globalAlpha = fade; g.translate(x + rs * 0.9, y - rs * 1.3); g.rotate(0.2); g.scale(k, k);
      const s = Math.max(rs, 26) * 0.55;
      const P = [[-0.35 * s, -0.45 * s], [-0.2 * s, -0.8 * s], [0.25 * s, -0.8 * s], [0.4 * s, -0.45 * s], [0.05 * s, -0.1 * s], [0, 0.15 * s]];
      stroke(g, P.map(([u, v]) => [u + s * 0.08, v + s * 0.08]), s * 0.28, INK); stroke(g, P, s * 0.22, '#ffb020');
      g.beginPath(); g.arc(0, 0.45 * s, s * 0.13, 0, TAU); g.fillStyle = '#ffb020'; g.fill(); g.lineWidth = s * 0.06; g.strokeStyle = INK; g.stroke();
    }
  }
  g.restore();
}

// ---- brush wipe (P(doom) recipe after ClaudeAnimationBase brushWipe, MIT): five fat strokes tilted -0.1 rad sweep in
// with staggered starts, full cover is held a few frames (the cut hides under it), then they drag off with ragged
// ends. Each stroke: a watercolour body (two glazes, wet edge), dry-brush bristle streaks in cream, ink-free.
// p in [0,1] over the whole wipe; `cover` = fraction of p where full cover holds (centre of the wipe).
export function brushWipe(g, p, { c1 = '#4b2a9e', c2 = '#7c3aed', bristle = '#f4e6c8', seed = 3, cover = 0.3 } = {}) {
  if (p <= 0 || p >= 1) return;
  const Wd = 1920, Hd = 1080, nS = 5, bh = (Hd + 460) / nS + 46;
  const rot = -0.1, rc = Math.cos(rot), rs = Math.sin(rot);
  const R = ([px, py]) => [Wd / 2 + (px - Wd / 2) * rc - (py - Hd / 2) * rs, Hd / 2 + (px - Wd / 2) * rs + (py - Hd / 2) * rc];
  const h = (i) => { const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };
  const inEnd = (1 - cover) / 2, outStart = inEnd + cover;
  const eo = (x) => 1 - Math.pow(1 - clamp(x), 3), eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  for (let i = 0; i < nS; i++) {
    const y0 = -250 + i * (Hd + 460) / nS, d = [0, 0.14, 0.06, 0.18, 0.1][i] * 0.8;
    let x0, x1;
    if (p < inEnd) { const q = eo((p / inEnd - d) / (1 - d)); x0 = -320; x1 = lerp(-320, Wd + 420, q); }
    else if (p < outStart) { x0 = -320; x1 = Wd + 420; }
    else { const q = eio(((p - outStart) / (1 - outStart) - d) / (1 - d)); x0 = lerp(-320, Wd + 420, q); x1 = Wd + 420; }
    if (x1 - x0 < 30) continue;
    const pts = [], rag = (k) => 40 + 55 * h(i * 31 + k);
    for (let k = 0; k <= 10; k++) pts.push([lerp(x0, x1, k / 10), y0 + Math.sin(k * 0.9 + i) * 16]);
    for (let k = 1; k < 9; k++) pts.push([x1 + rag(k) - 40, y0 + bh * k / 9]);
    for (let k = 10; k >= 0; k--) pts.push([lerp(x0, x1, k / 10), y0 + bh + Math.sin(k * 0.8 + i * 2) * 16]);
    if (p >= outStart) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);
    const RP = pts.map(R);
    const body = i % 2 ? c1 : c2, glaze = i % 2 ? c2 : c1;
    g.save();
    fillPoly(g, RP, body);
    g.clip();   // everything below stays inside the stroke
    // second glaze, offset (wet edge / uneven pigment)
    g.globalAlpha = 0.35; g.translate(0, 10); fillPoly(g, RP, glaze); g.translate(0, -10); g.globalAlpha = 1;
    // dry-brush bristle streaks along the stroke
    g.strokeStyle = bristle; g.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const yy = y0 + bh * (0.08 + 0.84 * h(i * 17 + k)) + 4 * Math.sin(p * 40 + k), len = 0.25 + 0.6 * h(i * 5 + k * 3), xs = lerp(x0, x1, h(i * 7 + k * 11) * (1 - len)) + (p - 0.5) * (240 + 160 * h(k * 3 + i));   // the bristles drag on every frame
      g.globalAlpha = 0.25 + 0.35 * h(k + i);
      g.lineWidth = 2 + 5 * h(i + k * 13);
      const A = R([xs, yy]), B = R([xs + (x1 - x0) * len, yy + 6 * Math.sin(k)]);
      g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
    }
    g.restore();
  }
}
