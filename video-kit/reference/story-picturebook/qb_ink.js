// qb_ink.js - hand-drawn 2D marks tracked to the 3D world: faces (drawn in each face's tangent plane,
// so they foreshorten and turn with the body), emotes, Pip's pencil arcs, pair ligatures, speed lines,
// the painted "4.7×" and the brush-wipe transition.
// ribbon()/through() and the brush-wipe recipe follow ClaudeAnimationBase src/core.js + src/timeline.js
// (MIT, (c) JohnHeibel), re-written for the pv runtime.
import * as A from './qb_anim.js';
import { clamp, lerp, ease } from '/pv/runtime/pv.js';

const TAU = Math.PI * 2;
const INK = '#2b2233', CREAM = '#fffaf0';

// ---- geometry helpers ----------------------------------------------------------------------------------
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
export function ribbon(P, w0, w1 = w0, smooth = true) {
  const C = smooth ? through(P) : P, n = C.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const t = i / Math.max(1, n - 1), w = lerp(w0, w1, t) / 2 * (0.35 + 0.65 * Math.sin(Math.PI * clamp(t * 0.9 + 0.05)));
    L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
  }
  return L.concat(R.reverse());
}
/** Marker stroke outline: near-constant width (w0 -> w1) with round caps, as one closed polygon. */
export function capsuleStroke(P, w0, w1 = w0) {
  const C = P.length > 2 ? through(P, 6) : P, n = C.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / Math.max(1, n - 1)) / 2;
    L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
  }
  const cap = (c, from, w, k) => { const out = []; const a0 = Math.atan2(from[1] - c[1], from[0] - c[0]); for (let j = 1; j < k; j++) { const a = a0 - (j / k) * Math.PI; out.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]); } return out; };
  const end = cap(C[n - 1], L[n - 1], w1 / 2, 8), start = cap(C[0], R[0], w0 / 2, 8);
  return [...L, ...end, ...R.reverse(), ...start];
}
function fillPoly(g, pts, col) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = col; g.fill(); }
function stroke(g, pts, w, col = INK, w1 = null) { fillPoly(g, ribbon(pts, w, w1 ?? w), col); }
function jit(r, a) { return r ? r.gauss(0, a) : 0; }
function trunc(pts, k) {   // first fraction k of a polyline (by length)
  if (k >= 1) return pts;
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let need = L * clamp(k), out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (need <= seg[i - 1]) { const u = need / (seg[i - 1] || 1); out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); return out; }
    need -= seg[i - 1]; out.push(pts[i]);
  }
  return out;
}
const backOut = (x) => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

// ---- faces ----------------------------------------------------------------------------------------------------
const LAYOUT = {
  atom: { ex: 0.35, ey: -0.03, es: 1.15, my: 0.31, bx: 0.57, by: 0.2 },
  pip: { ex: 0.31, ey: -0.04, es: 1.0, my: 0.3, bx: 0.54, by: 0.2 },
  rook: { ex: 0.36, ey: -0.14, es: 1.15, my: 0.34, bx: 0.6, by: 0.16 },
  tick: { ex: 0.31, ey: -0.2, es: 0.95, my: 0.3, bx: 0.52, by: 0.1 },
  slo: { ex: 0.34, ey: -0.08, es: 1.15, my: 0.33, bx: 0.58, by: 0.18 },
};
function starPts(cx, cy, r, inner = 0.4, n = 4, rot = -Math.PI / 2) {
  const P = []; for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * TAU, rr = i % 2 ? r * inner : r; P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return P;
}
function heartPath(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.8, y - s * 0.95, x, y - s * 0.3);
  g.bezierCurveTo(x + s * 0.8, y - s * 0.95, x + s * 1.3, y + s * 0.1, x, y + s * 0.9); g.closePath();
}
function eye(g, type, x, y, s, side, look, r, ph = 0) {
  const lx = (look?.[0] || 0) * 0.06, ly = (look?.[1] || 0) * 0.06;
  const J = (a) => jit(r, a);
  g.save(); g.translate(x + J(0.006), y + J(0.006));
  switch (type) {
    case 'open': case 'wide': {
      const w = type === 'wide' ? 1.25 : 1;
      g.beginPath(); g.ellipse(lx, ly, 0.095 * s * w, 0.14 * s * w, J(0.05), 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.arc(lx - 0.03 * s * w, ly - 0.05 * s * w, 0.034 * s * w, 0, TAU); g.fillStyle = CREAM; g.fill();
      if (type === 'wide') { g.beginPath(); g.arc(lx + 0.03 * s, ly + 0.05 * s, 0.016 * s, 0, TAU); g.fill(); }
      break;
    }
    case 'half': {
      g.save(); g.beginPath(); g.rect(-0.3 * s, -0.01 * s, 0.6 * s, 0.4 * s); g.clip();
      g.beginPath(); g.ellipse(lx * 0.5, 0, 0.1 * s, 0.13 * s, 0, 0, TAU); g.fillStyle = INK; g.fill(); g.restore();
      stroke(g, [[-0.14 * s, -0.005 * s], [0, -0.03 * s], [0.14 * s, -0.005 * s]], 0.05 * s);
      break;
    }
    case 'sleep': stroke(g, [[-0.12 * s, -0.01 * s], [0, 0.06 * s], [0.12 * s, -0.01 * s]], 0.05 * s); break;
    case 'happy': stroke(g, [[-0.12 * s, 0.05 * s], [0, -0.06 * s], [0.12 * s, 0.05 * s]], 0.055 * s); break;
    case 'squeeze': { const d = -side; stroke(g, [[-0.1 * s * d, -0.09 * s], [0.08 * s * d, 0], [-0.1 * s * d, 0.09 * s]], 0.055 * s); break; }
    case 'focus': {
      g.beginPath(); g.ellipse(lx, ly + 0.02 * s, 0.09 * s, 0.05 * s, 0, 0, TAU); g.fillStyle = INK; g.fill();
      stroke(g, [[-0.13 * s, -0.1 * s + side * 0.02 * s], [0.13 * s, -0.1 * s - side * 0.02 * s]], 0.04 * s);
      break;
    }
    case 'star': {
      const tw = 1 + 0.08 * Math.sin(r ? r() * TAU : 0);
      const P = starPts(0, 0, 0.2 * s * tw, 0.36);
      fillPoly(g, P, '#ffcf3d'); g.lineWidth = 0.025 * s; g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
      break;
    }
    case 'dizzy': {   // a spiral that keeps turning (ph advances with the frame)
      const P = [], rot = (ph || 0) * side;
      for (let i = 0; i <= 30; i++) { const u = i / 30, a = rot + side * u * TAU * 2.1, rr = (0.02 + 0.13 * u) * s; P.push([Math.cos(a) * rr, Math.sin(a) * rr * 1.1]); }
      stroke(g, P, 0.04 * s, INK, 0.05 * s);
      break;
    }
    case 'heart': {
      heartPath(g, 0, 0, 0.13 * s); g.fillStyle = '#ff4f7a'; g.fill(); g.lineWidth = 0.022 * s; g.strokeStyle = INK; g.stroke();
      break;
    }
    default: break;
  }
  g.restore();
}
function mouth(g, type, y, s, r) {
  const J = (a) => jit(r, a);
  switch (type) {
    case 'smile': stroke(g, [[-0.13 * s, y - 0.03 * s], [0, y + 0.05 * s + J(0.005)], [0.13 * s, y - 0.03 * s]], 0.05 * s); break;
    case 'grin': {
      g.beginPath(); g.moveTo(-0.17 * s, y - 0.04 * s); g.lineTo(0.17 * s, y - 0.04 * s);
      g.quadraticCurveTo(0.16 * s, y + 0.22 * s, 0, y + 0.22 * s); g.quadraticCurveTo(-0.16 * s, y + 0.22 * s, -0.17 * s, y - 0.04 * s);
      g.closePath(); g.fillStyle = INK; g.fill();
      g.save(); g.clip(); g.beginPath(); g.ellipse(0, y + 0.17 * s, 0.09 * s, 0.06 * s, 0, 0, TAU); g.fillStyle = '#ff7a8a'; g.fill(); g.restore();
      break;
    }
    case 'o': g.beginPath(); g.ellipse(0, y + 0.02 * s, 0.055 * s, 0.075 * s, 0, 0, TAU); g.fillStyle = INK; g.fill(); break;
    case 'yawn': {
      g.beginPath(); g.ellipse(0, y + 0.05 * s, 0.09 * s, 0.14 * s, 0, 0, TAU); g.fillStyle = INK; g.fill();
      g.beginPath(); g.ellipse(0, y + 0.13 * s, 0.06 * s, 0.045 * s, 0, 0, TAU); g.fillStyle = '#ff7a8a'; g.fill();
      break;
    }
    case 'wobble': stroke(g, [[-0.13 * s, y], [-0.065 * s, y - 0.03 * s], [0, y + 0.01 * s], [0.065 * s, y - 0.03 * s], [0.13 * s, y]], 0.04 * s); break;
    case 'tongue': {
      stroke(g, [[-0.1 * s, y - 0.01 * s], [0, y + 0.03 * s], [0.1 * s, y - 0.02 * s]], 0.045 * s);
      g.beginPath(); g.ellipse(0.07 * s, y + 0.05 * s, 0.04 * s, 0.055 * s, -0.4, 0, TAU); g.fillStyle = '#ff7a8a'; g.fill();
      g.lineWidth = 0.018 * s; g.strokeStyle = INK; g.stroke();
      break;
    }
    default: break;
  }
}
function blushMarks(g, L, amt, r) {
  if (amt <= 0.02) return;
  for (const sgn of [-1, 1]) {
    const x = sgn * L.bx, y = L.by;
    g.beginPath(); g.ellipse(x, y, 0.15, 0.085, 0, 0, TAU); g.fillStyle = `rgba(255,105,125,${0.5 * amt})`; g.fill();
    g.globalAlpha = amt;
    for (let k = -1; k <= 1; k++) stroke(g, [[x + k * 0.07 - 0.02, y + 0.05 + jit(r, 0.004)], [x + k * 0.07 + 0.03, y - 0.05]], 0.022, '#c7406a');
    g.globalAlpha = 1;
  }
}

/** Faces layer (Canvas2D, design units). Each face: {kind, anchor, right, up, R, vis, face} in world. */
export function facesLayer(ctx, g, st) {
  const r = ctx.boilRng('faces');
  for (const F of st.faces || []) {
    if (F.vis <= 0.01) continue;
    const a = ctx.project(F.anchor), b = ctx.project(F.px), c = ctx.project(F.py);
    const L = LAYOUT[F.kind], fc = F.face;
    g.save();
    g.globalAlpha = F.vis;
    g.transform(b.x - a.x, b.y - a.y, -(c.x - a.x), -(c.y - a.y), a.x, a.y);
    blushMarks(g, L, fc.blush || 0, r);
    const look = fc.look || [0, 0];
    for (const side of [-1, 1]) eye(g, fc.eyes, side * L.ex + look[0] * 0.05, L.ey + look[1] * 0.05, L.es, side, look, r, fc.ph);
    if (fc.mouth) mouth(g, fc.mouth, L.my + look[1] * 0.03, L.es, r);
    g.restore();
  }
  // emotes (screen space around the projected head)
  for (const E of st.emotes || []) drawEmote(ctx, g, E, r);
  // the one margin note: a pencilled "baseline" beside the snail, written on letter by letter, with a curly arrow
  if (st.sloNote) {
    const { at, age } = st.sloNote;
    const k = clamp(age / 10);
    const tx = at.x + 70, ty = at.y + 122;
    g.save();
    g.translate(tx, ty); g.rotate(-0.06);
    g.font = '600 60px Caveat'; g.textBaseline = 'alphabetic';
    const wT = g.measureText('baseline').width;
    g.save(); g.beginPath(); g.rect(-10, -64, (wT + 20) * k, 96); g.clip();
    g.fillStyle = '#3d2f6a'; g.fillText('baseline', 0, 0);
    g.restore();
    if (age > 7) {   // a little pencil arrow back to the snail's face
      const ka = clamp((age - 7) / 5);
      const P = trunc(through([[-8, -24], [-26, -44], [-34, -70], [-28, -92]], 6), ka);
      if (P.length > 1) stroke(g, P, 4.4, '#3d2f6a', 2.6);
      if (ka >= 1) stroke(g, [[-44, -80], [-28, -95], [-16, -78]], 3.8, '#3d2f6a');
    }
    g.restore();
  }
}

function drawEmote(ctx, g, E, r) {
  const { x, y, rs, type, age = 0, f } = E;
  g.save();
  if (type === 'bang') {
    const k = backOut(age / 4), fade = 1 - clamp((age - 12) / 5);
    if (fade <= 0) { g.restore(); return; }
    g.globalAlpha = fade; g.translate(x + rs * 0.95, y - rs * 1.25); g.rotate(0.15); g.scale(k, k);
    fillPoly(g, ribbon([[0, -rs * 0.55], [rs * 0.02, -rs * 0.1], [0, rs * 0.2]], rs * 0.26, rs * 0.07, false), '#e8423f');
    g.beginPath(); g.arc(0, rs * 0.42, rs * 0.1, 0, TAU); g.fillStyle = '#e8423f'; g.fill();
    g.lineWidth = Math.max(2.5, rs * 0.045); g.strokeStyle = INK; g.lineJoin = 'round';
    g.beginPath(); ribbon([[0, -rs * 0.55], [rs * 0.02, -rs * 0.1], [0, rs * 0.2]], rs * 0.26, rs * 0.07, false).forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
    g.beginPath(); g.arc(0, rs * 0.42, rs * 0.1, 0, TAU); g.stroke();
  } else if (type === 'sweat') {
    const fade = 1 - clamp((age - 18) / 8);
    g.globalAlpha = fade; g.translate(x + rs * 1.02, y - rs * 0.55 + age * rs * 0.025);
    const s = rs * 0.24;
    g.beginPath(); g.moveTo(0, -s * 1.3); g.quadraticCurveTo(s * 0.9, 0, 0, s * 0.8); g.quadraticCurveTo(-s * 0.9, 0, 0, -s * 1.3);
    g.fillStyle = '#9fdcf5'; g.fill(); g.lineWidth = Math.max(2.5, rs * 0.04); g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(-s * 0.2, s * 0.1, s * 0.18, 0, TAU); g.fillStyle = CREAM; g.fill();
  } else if (type === 'sparkle') {
    const n = 3;
    for (let i = 0; i < n; i++) {
      const ph = (age / 10 + i / n) % 1, sc = Math.sin(Math.PI * ph);
      const ang = -0.9 + i * 0.9 + 0.2 * Math.sin(i * 3.1);
      const px = x + Math.cos(ang - Math.PI / 2) * rs * (1.25 + 0.2 * i), py = y + Math.sin(ang - Math.PI / 2) * rs * (1.25 + 0.2 * i);
      const P = starPts(px, py, rs * 0.22 * sc, 0.32);
      fillPoly(g, P, '#ffd84a'); g.lineWidth = Math.max(1.8, rs * 0.03); g.strokeStyle = INK; g.lineJoin = 'round';
      g.beginPath(); P.forEach((p, k) => (k ? g.lineTo(...p) : g.moveTo(...p))); g.closePath(); g.stroke();
    }
  } else if (type === 'ping') {
    // tap acknowledged: two chalk rings burst out of the atom
    for (let i = 0; i < 2; i++) {
      const a = age - i * 2; if (a < 0 || a > 10) continue;
      const k = ease.outCubic(a / 10), rr = rs * (1.05 + 0.7 * k);
      g.globalAlpha = 1 - k; g.lineWidth = Math.max(3, rs * 0.09 * (1 - k * 0.6)); g.strokeStyle = '#ffe45c';
      g.beginPath(); g.ellipse(x, y, rr, rr * 0.96, 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  } else if (type === 'zzz') {
    for (let i = 0; i < 3; i++) {
      const ph = (((f + i * 12) % 36) + 36) % 36 / 36;
      const a = Math.sin(Math.PI * ph);
      const s = rs * (0.2 + 0.2 * ph);
      const px = x + rs * (0.65 + ph * 1.1), py = y - rs * (0.9 + ph * 1.6);
      g.globalAlpha = a * 0.9;
      stroke(g, [[px - s, py - s], [px + s, py - s * 1.05], [px - s, py + s], [px + s * 1.05, py + s * 0.95]], Math.max(3, s * 0.3), '#5a4a92', Math.max(2, s * 0.2));
    }
  }
  g.restore();
}

// ---- ink (p5.brush, multiplied): pencil arcs, ligatures, speed lines, toot & click marks -----------------------
function centred(p, pts, draw) {
  if (!pts.length) return;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  p.push(); p.translate(cx, cy); draw(pts.map(([x, y]) => [x - cx, y - cy])); p.pop();
}
function inkSpline(p, brush, pts, name, col, w, curv = 0.5) {
  if (pts.length < 2) return;
  // never draw a stroke whose points projected from behind the camera or far outside the frame
  if (pts.some((q) => !isFinite(q[0]) || !isFinite(q[1]) || q[0] < -300 || q[0] > 2220 || q[1] < -300 || q[1] > 1380)) return;
  centred(p, pts, (P) => { brush.noFill(); brush.noHatch(); brush.set(name, col, w); brush.spline(P, curv); });
}
export function inkLayer(ctx, p, brush, st, W) {
  const THREE = W.THREE, f = ctx.iw, r = ctx.boilRng('ink');
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const cam = ctx.camera, fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const P = (v) => { if (v.clone().sub(cam.position).dot(fwd) < 0.3) return [NaN, NaN]; const s = ctx.project(v); return [s.x, s.y]; };
  // Pip's pencil arcs on the slab (ochre pencil), with a tick where they reach the partner
  for (const arc of st.arcs || []) {
    const pts = [];
    const n = 16;
    for (let i = 0; i <= n; i++) {
      const a = lerp(arc.a0, arc.a1, i / n);
      pts.push(P(V(arc.pivot[0] + Math.cos(a) * arc.r, 0.006, arc.pivot[1] + Math.sin(a) * arc.r)));
    }
    const kept = arc.keep == null ? pts : trunc(pts, arc.keep);
    if (kept.length > 1) inkSpline(p, brush, kept, 'pencilo', '#ffe45c', 2.2, 0.6);
    if (arc.done) {
      const c = [arc.pivot[0] + arc.r, arc.pivot[1]];
      inkSpline(p, brush, [P(V(c[0] - 0.02, 0.006, c[1] - 0.2)), P(V(c[0] + 0.02, 0.006, c[1] + 0.2))], 'pencilo', '#ffe45c', 1.8, 0);
      inkSpline(p, brush, [P(V(c[0] - 0.14, 0.006, c[1] - 0.12)), P(V(c[0] + 0.14, 0.006, c[1] + 0.12))], 'pencilo', '#ffe45c', 1.6, 0);
    }
  }
  // the gust that spins the snail: curly wind swooshes blowing past it (cream, like the speed lines)
  if (st.gust) {
    const { x, y, R, age } = st.gust, u = age / 24;
    for (let i = 0; i < 4; i++) {
      const d = u * 1.25 - i * 0.12; if (d < 0 || d > 1) continue;
      const oy = (-1.0 + 0.62 * i) * R, x0 = x + (-2.4 + 3.6 * d) * R, s = R * (0.8 + 0.15 * i);
      const P = [[x0 - 1.3 * s, y + oy + 0.05 * s], [x0 - 0.5 * s, y + oy - 0.06 * s], [x0 + 0.2 * s, y + oy + 0.02 * s],
        [x0 + 0.55 * s, y + oy - 0.2 * s], [x0 + 0.38 * s, y + oy - 0.42 * s], [x0 + 0.15 * s, y + oy - 0.26 * s]];
      const shown = trunc(P, clamp((1 - d) * 3));
      if (shown.length > 1) inkSpline(p, brush, shown, 'bigink', '#fff4dc', 0.8, 0.5);
    }
  }
  // speed lines behind the moving convoy (and in front of the reversing loco)
  if (st.speed > 0.08) {
    const dir = st.speedDir;   // +1 moving right
    for (const row of st.speedRows || []) {
      const [x, y, z] = row.tail;
      for (let k = 0; k < 4; k++) {
        const oy = [-0.2, -0.02, 0.16, 0.3][k], L = (0.9 + 0.6 * ((k * 7) % 3) / 2) * st.speed;
        const a = P(V(x - dir * (0.1 + 0.1 * k), y + oy, z)), b = P(V(x - dir * (0.1 + 0.1 * k + L), y + oy, z));
        inkSpline(p, brush, [[a[0] + r.gauss(0, 1), a[1]], [b[0], b[1] + r.gauss(0, 1)]], 'bigink', '#fff4dc', 0.75, 0);
      }
    }
  }
  // toot marks by the whistle / click marks by the pusher
  if (st.dbgInk) console.log('ink', JSON.stringify({ arcs: (st.arcs || []).length, speed: st.speed, rows: st.speedRows, marks: st.marks, ligs: (st.ligs || []).length }));
  for (const m of st.marks || []) {
    // radiating tick marks drawn as small tapered ink wedges (filled), never as degenerate 2-point splines
    const k = backOut(m.age / 4), fade = 1 - clamp((m.age - 8) / 6);
    if (fade <= 0) continue;
    for (let i = 0; i < m.n; i++) {
      const a = m.a0 + (i / (m.n - 1)) * (m.a1 - m.a0);
      const r0 = m.r0 * k, r1 = (m.r0 + m.len * fade) * k, ww = 3.2 * fade + 1;
      const c = Math.cos(a), sn = Math.sin(a), nx = -sn, ny = c;
      const pts = [[m.x + c * r0 + nx * ww * 0.3, m.y + sn * r0 + ny * ww * 0.3], [m.x + c * r1 + nx * ww, m.y + sn * r1 + ny * ww],
        [m.x + c * (r1 + ww) , m.y + sn * (r1 + ww)], [m.x + c * r1 - nx * ww, m.y + sn * r1 - ny * ww], [m.x + c * r0 - nx * ww * 0.3, m.y + sn * r0 - ny * ww * 0.3]];
      if (pts.some((q) => !isFinite(q[0]) || !isFinite(q[1]))) continue;
      centred(p, pts, (Q) => { brush.noStroke(); brush.noHatch(); brush.fill(INK, 230); brush.fillBleed(0.02); brush.fillTexture(0.2, 0.2); brush.polygon(Q); brush.noFill(); });
    }
  }
  // pair bonds: a bold magenta infinity sign painted on above each entangled pair (camera-facing plane)
  for (const lg of st.ligs || []) {
    const pts = [];
    const n = 40, ax = 0.26, ay = 0.12;
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * TAU, d = 1 + Math.sin(u) * Math.sin(u);
      const px = ax * Math.cos(u) / d * 1.3, py = 0.08 + ay * Math.sin(u) * Math.cos(u) / d * 2.3;
      pts.push(P(lg.c.clone().addScaledVector(lg.right, px).addScaledVector(lg.up, py)));
    }
    const shown = trunc(pts, lg.k);
    inkSpline(p, brush, shown, 'bigink', '#e0206a', 2.0, 0.3);
  }
}

// ---- fx (p5.brush over the composite): painted "4.7×" and the brush wipe ------------------------------------------
const GLYPHS = {
  '4': { w: 0.92, s: [[[0.66, 0.02], [0.05, 0.68]], [[0.05, 0.68], [0.92, 0.66]], [[0.64, 0.3], [0.6, 1.02]]] },
  '.': { w: 0.36, dot: [0.14, 0.93, 0.105] },
  '7': { w: 0.9, s: [[[0.02, 0.05], [0.9, 0.02]], [[0.9, 0.02], [0.56, 0.48], [0.4, 1.02]]] },
  '×': { w: 0.78, s: [[[0.06, 0.4], [0.72, 1.0]], [[0.72, 0.4], [0.06, 1.0]]] },
};
function glyphStrokes(txt, size, x0, y0, rot, cx, cy) {
  const strokes = []; let x = 0;
  const tr = ([u, v]) => {   // glyph units -> design px, rotated around (cx, cy)
    const px = x0 + (x + u) * size, py = y0 + v * size;
    const c = Math.cos(rot), s = Math.sin(rot);
    return [cx + (px - cx) * c - (py - cy) * s, cy + (px - cx) * s + (py - cy) * c];
  };
  for (const ch of txt) {
    const G = GLYPHS[ch];
    if (G.s) for (const s of G.s) strokes.push({ pts: s.map(tr), w: (ch === '×' ? 0.2 : 0.21) * size });
    if (G.dot) strokes.push({ dot: tr([G.dot[0], G.dot[1]]), r: G.dot[2] * size });
    x += G.w + 0.06;
  }
  return { strokes, width: x * size };
}
function washPoly(brush, p, pts, col, inkW = 0) {
  centred(p, pts, (Q) => {
    brush.noStroke(); brush.noFill(); brush.noHatch();
    brush.wash(col, 255); brush.polygon(Q); brush.noWash();
    if (inkW > 0) { brush.set('bigink', INK, inkW); brush.beginShape(0); for (const q of Q) brush.vertex(q[0], q[1]); brush.endShape(true); }
  });
}
function dotPts(cx, cy, rr, n = 18) { const P = []; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return P; }

export function fxLayer(ctx, p, brush, st) {
  const f = ctx.iw, r = ctx.boilRng('fx');
  // --- 4.7x: a yellow burst pops, then the numerals are painted stroke by stroke
  if (st.slam) {
    const { x, y, age } = st.slam;
    const pop = backOut(age / 5), wob = Math.sin(age * 0.9) * 0.025 * Math.exp(-age / 14);
    const rot = -0.09 + wob;
    // burst
    const n = 15, pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU + 0.1, k = i % 2 ? 0.7 + r.gauss(0, 0.025) : 1 + ((i * 37) % 11) / 55 + r.gauss(0, 0.03);
      pts.push([x + Math.cos(a) * 470 * k * pop, y + Math.sin(a) * 300 * k * pop]);
    }
    washPoly(brush, p, pts, '#ffd23f', 2.2);
    const inner = pts.map(([px, py]) => [x + (px - x) * 0.78, y + (py - y) * 0.78]);
    centred(p, inner, (Q) => { brush.noStroke(); brush.fill('#fff0a0', 150); brush.fillBleed(0.04); brush.fillTexture(0.3, 0.3); brush.polygon(Q); brush.noFill(); });
    // numerals
    const size = 285 * clamp(pop, 0, 1.15);
    const { strokes, width } = glyphStrokes('4.7×', size, x - 1.6 * size, y - 0.55 * size, rot, x, y);
    const shadow = [0.05 * size, 0.06 * size];
    // two passes (all drop shadows, then all red strokes) so no shadow ever cuts across an earlier stroke
    for (const pass of [0, 1]) strokes.forEach((s, j) => {
      const start = 2 + j * 1.5, k = clamp((age - start) / 2.2);
      if (k <= 0) return;
      if (s.dot) {
        if (pass === 0) washPoly(brush, p, dotPts(s.dot[0] + shadow[0], s.dot[1] + shadow[1], s.r), INK);
        else washPoly(brush, p, dotPts(s.dot[0], s.dot[1], s.r * (0.6 + 0.4 * k)), '#e8403d', 2.0);
        return;
      }
      const pts2 = trunc(s.pts.length > 2 ? through(s.pts, 8) : [s.pts[0], s.pts[1]], k);
      if (pts2.length < 2) return;
      const dense = pts2.length > 2 ? pts2 : [pts2[0], [(pts2[0][0] + pts2[1][0]) / 2, (pts2[0][1] + pts2[1][1]) / 2], pts2[1]];
      if (pass === 0) washPoly(brush, p, capsuleStroke(dense.map(([a, b]) => [a + shadow[0], b + shadow[1]]), s.w, s.w * 0.86), INK);
      else washPoly(brush, p, capsuleStroke(dense, s.w, s.w * 0.86), '#e8403d', 2.0);
    });
    void width;
  }
  // --- brush wipe (after ClaudeAnimationBase brushWipe, MIT): five fat strokes cover, the cut happens under
  //     full cover, and they drag off with ragged ends
  if (st.wipe > 0 && st.wipe < 1) {
    const pw = st.wipe, Wd = 1920, Hd = 1080, nS = 5, bh = (Hd + 420) / nS + 40;
    const c1 = '#3e3f8e', c2 = '#7a55c0';
    const rotA = -0.1, rc = Math.cos(rotA), rsn = Math.sin(rotA);
    const R = ([px, py]) => [Wd / 2 + (px - Wd / 2) * rc - (py - Hd / 2) * rsn, Hd / 2 + (px - Wd / 2) * rsn + (py - Hd / 2) * rc];
    const h = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < nS; i++) {
      const y0 = -230 + i * (Hd + 420) / nS, d = [0, 0.14, 0.06, 0.18, 0.1][i];
      const q = pw < 0.5 ? ease.outCubic(clamp((pw * 2 - d) / (1 - d))) : ease.inOutSine(clamp(((pw - 0.5) * 2 - d) / (1 - d)));
      const x0 = pw < 0.5 ? -300 : lerp(-300, Wd + 400, q), x1 = pw < 0.5 ? lerp(-300, Wd + 400, q) : Wd + 400;
      if (x1 - x0 < 30) continue;
      const pts = [], rag = (k) => 40 + 50 * h(i * 31 + k) + r.gauss(0, 10);
      for (let k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y0 + Math.sin(k * 0.9 + i) * 14 + r.gauss(0, 4)]);
      for (let k = 1; k < 9; k++) pts.push([x1 + rag(k) - 40, y0 + bh * k / 9]);
      for (let k = 8; k >= 0; k--) pts.push([lerp(x0, x1, k / 8), y0 + bh + Math.sin(k * 0.8 + i * 2) * 14 + r.gauss(0, 4)]);
      if (pw >= 0.5) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);
      const RP = pts.map(R);
      centred(p, RP, (Q) => {
        brush.noStroke();
        brush.wash(i % 2 ? c1 : c2, 255);
        brush.fill(i % 2 ? c2 : c1, 70); brush.fillBleed(0.05); brush.fillTexture(0.8, 0.6);
        brush.hatch(40, 0, { rand: 0.6, gradient: 0.5 }); brush.hatchStyle('charcoal', i % 2 ? '#b89be8' : '#f3ebdc', 0.8);
        brush.polygon(Q);
        brush.noWash(); brush.noFill(); brush.noHatch();
      });
    }
  }
}
