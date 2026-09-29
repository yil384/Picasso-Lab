// td_glyph3d.js - hand-cut comic numerals as extruded 3D blocks ("98%", "68x", "$0.04"), like the series' 4.7x.
// Each glyph is a set of closed outlines (rings, arc bands, bars, polygons) in a unit box (cap height 1, y up),
// nudged by hand so no edge is machine-straight. Built as THREE.Shape and extruded with a small bevel.
import { TAU, hsh } from './td_core.js';

const D2R = Math.PI / 180;
function ellipsePts(cx, cy, rx, ry, a0 = 0, a1 = TAU, n = 28, seed = 1, jit = 0.012) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * i / n, k = 1 + (hsh(seed, i, 3) - 0.5) * jit * 2;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
}
const ring = (cx, cy, rx, ry, t, seed) => ({ outer: ellipsePts(cx, cy, rx, ry, 0, TAU, 32, seed).slice(0, -1), holes: [ellipsePts(cx, cy, rx - t, ry - t * 0.92, 0, TAU, 28, seed + 7).slice(0, -1).reverse()] });
const band = (cx, cy, rx, ry, t, a0, a1, seed) => {
  const o = ellipsePts(cx, cy, rx, ry, a0 * D2R, a1 * D2R, 22, seed), i = ellipsePts(cx, cy, rx - t, ry - t * 0.92, a0 * D2R, a1 * D2R, 22, seed + 5);
  return { outer: [...o, ...i.reverse()], holes: [] };
};
const bar = (x0, y0, x1, y1, t) => {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L * t / 2, ny = dx / L * t / 2;
  return { outer: [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], holes: [] };
};
const poly = (pts) => ({ outer: pts, holes: [] });

export const G3 = {
  0: { w: 0.62, parts: (s) => [ring(0.31, 0.5, 0.31, 0.5, 0.17, s)] },
  4: { w: 0.78, parts: () => [{ outer: [[0.44, 1.0], [0.63, 1.0], [0.63, 0.40], [0.77, 0.40], [0.77, 0.23], [0.63, 0.23], [0.63, 0.0], [0.43, 0.0], [0.43, 0.23], [0.0, 0.23], [0.0, 0.41]], holes: [[[0.43, 0.40], [0.43, 0.70], [0.21, 0.40]].reverse()] }] },
  6: { w: 0.62, parts: (s) => [ring(0.31, 0.31, 0.31, 0.31, 0.165, s), band(0.58, 0.32, 0.58, 0.68, 0.165, 92, 182, s + 3)] },
  8: { w: 0.62, parts: (s) => [ring(0.31, 0.27, 0.31, 0.27, 0.15, s), ring(0.31, 0.74, 0.26, 0.24, 0.14, s + 9)] },
  9: { w: 0.62, parts: (s) => [ring(0.31, 0.69, 0.31, 0.31, 0.165, s), band(0.04, 0.68, 0.58, 0.68, 0.165, -88, 2, s + 3)] },
  '%': { w: 0.78, parts: (s) => [ring(0.17, 0.78, 0.17, 0.21, 0.085, s), ring(0.61, 0.22, 0.17, 0.21, 0.085, s + 4), bar(0.66, 1.0, 0.12, 0.0, 0.12)] },
  $: { w: 0.62, parts: (s) => [band(0.31, 0.72, 0.28, 0.24, 0.14, 15, 272, s), band(0.31, 0.29, 0.3, 0.25, 0.145, -165, 92, s + 2), bar(0.31, -0.13, 0.31, 1.13, 0.09)] },
  '.': { w: 0.24, parts: (s) => [poly(ellipsePts(0.12, 0.12, 0.12, 0.12, 0, TAU, 16, s).slice(0, -1))] },
  x: { w: 0.62, parts: () => {
    const c = [0.31, 0.36], w = 0.08, L = 0.31, a = Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
    const plus = [[w, L], [w, w], [L, w], [L, -w], [w, -w], [w, -L], [-w, -L], [-w, -w], [-L, -w], [-L, w], [-w, w], [-w, L]];
    return [poly(plus.map(([px, py]) => [c[0] + px * ca - py * sa, c[1] + px * sa + py * ca]).reverse())];
  } },
};

/** subdivide + nudge straight edges (hand-cut) */
function wob(poly, seed) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.12));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      out.push([a[0] + (b[0] - a[0]) * t + (hsh(seed, i, j, 1) - 0.5) * 0.016, a[1] + (b[1] - a[1]) * t + (hsh(seed, i, j, 2) - 0.5) * 0.016]);
    }
  }
  return out;
}

/** Build a word as extruded glyph meshes. Returns { group, glyphs: [{ g, mesh, ch, x }], width }.
 *  o: { h (cap height, world), depth, gap, face (mat opts), side (mat opts), outline, layout: [{dy, rz, ry, s}] } */
export function buildWord3D(W, word, o = {}) {
  const { THREE, add } = W;
  const h = o.h ?? 1, depth = o.depth ?? 0.3, gap = o.gap ?? 0.1;
  const group = new THREE.Group();
  let x = 0;
  const glyphs = [...word].map((ch, i) => {
    const G = G3[ch]; const lay = (o.layout && o.layout[i]) || {};
    const sc = lay.s ?? 1;
    const shapes = G.parts(i * 13 + 5).map((P, k) => {
      const sh = new THREE.Shape(wob(P.outer, i * 31 + k).map((q) => new THREE.Vector2(q[0], q[1])));
      for (const hp of P.holes) sh.holes.push(new THREE.Path(wob(hp, i * 31 + k + 17).map((q) => new THREE.Vector2(q[0], q[1]))));
      return sh;
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2, curveSegments: 4 });
    geo.translate(-G.w / 2, 0, -depth / 2); geo.scale(h * sc, h * sc, 1);
    const g = new THREE.Group(); group.add(g);
    const mesh = add(geo, [o.face, o.side], { outline: o.outline ?? 1.2 }, [0, 0, 0], [0, 0, 0], g);
    const cx = x + (G.w * h * sc) / 2;
    g.position.set(cx, lay.dy ?? 0, 0); g.rotation.set(0, lay.ry ?? 0, lay.rz ?? 0);
    x += G.w * h * sc + gap * h;
    return { g, mesh, ch, x: cx, home: g.position.clone(), rz: lay.rz ?? 0, ry: lay.ry ?? 0 };
  });
  const width = x - gap * h;
  glyphs.forEach((q) => { q.g.position.x -= width / 2; q.home.x -= width / 2; });
  return { group, glyphs, width };
}
