// q_marks.js - pencil / ink marks that lie ON the plate (placement circles, route arrows, the verifier's red circle).
// They are thin 3D decal strips sharing the plate top's surface id (no inked outline, correct occlusion by the atoms
// and the cast), drawn on progressively with setDrawRange (6 indices per strip quad).
import * as THREE from 'three';

const Y = 0.016;

/** strip along a polyline pts [[x,z],...] with half-width w (w can be a function of t in 0..1) */
export function stripGeo(pts, w) {
  const pos = [], idx = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    const hw = typeof w === 'function' ? w(i / (n - 1)) : w;
    pos.push(pts[i][0] - dz * hw, Y, pts[i][1] + dx * hw, pts[i][0] + dz * hw, Y, pts[i][1] - dx * hw);
  }
  for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.userData.quads = n - 1;
  return g;
}
export function circlePts(cx, cz, r, a0 = 0, turns = 1, n = 72, wob = 0.0, seed = 0) {
  const P = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + turns * Math.PI * 2 * i / n;
    const rr = r * (1 + wob * Math.sin(a * 3 + seed) + wob * 0.5 * Math.sin(a * 7 + seed * 2));
    P.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
  }
  return P;
}
/** quadratic-bezier route with an arrow head at the end (two barbs appended as separate strips) */
export function arrowPts(a, b, bend = 0.25, n = 28) {
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1];
  const c = [mx - dz * bend, mz + dx * bend];
  const P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; P.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
  return P;
}
export function barbs(P, len = 0.22, ang = 0.5) {
  const b = P[P.length - 1], a = P[P.length - 3];
  const d = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return [[b, [b[0] - Math.cos(d - ang) * len, b[1] - Math.sin(d - ang) * len]], [b, [b[0] - Math.cos(d + ang) * len, b[1] - Math.sin(d + ang) * len]]];
}
/** reveal fraction k of a strip */
export function reveal(m, k) {
  const q = m.geometry.userData.quads;
  const n = Math.max(0, Math.min(q, Math.round(q * k)));
  m.geometry.setDrawRange(0, n * 6);
  m.visible = n > 0;
}
