// Where every paper is in each beat: {p:[x,y,z], r:[rx,ry,rz] (YXZ), s:height, dim:0..1 (0 = lit, 1 = dark)}.
// D = data.json (+ RANK, by-year / by-venue indices added by index()).
import { hsh, TAU } from '/scene/lib.js';

export const FLOOR = -0.62;
export const ASP = 0.773;

export function index(D) {
  D.RANK = {}; D.order.forEach((k, i) => { D.RANK[k] = i; });
  D.byYear = {}; D.byVenue = {}; D.byRing = [[], [], []];
  for (const k of D.order) {
    const p = D.pubs[k];
    if (p.yr != null) (D.byYear[p.yr] = D.byYear[p.yr] || []).push(k);
    (D.byVenue[p.venue] = D.byVenue[p.venue] || []).push(k);
    D.byRing[p.ring].push(k);
  }
  D.first = D.order[0];
  return D;
}

// the hero: the first paper alone under the light (v7 frame 1)
export const HERO = { p: [0, 0.55, 0], r: [-0.08, -0.5, 0.04], s: 1.25, dim: 0 };

// v7 frame 2: an S-curve gallery standing on the floor, newest in front, 2013 at the vanishing point
export function gallery(D, k) {
  const j = D.order.length - 1 - D.RANK[k];
  const row = Math.floor(j / 4), col = j % 4, z = 2.2 - row * 0.78;
  const x = (col - 1.5) * 0.74 + Math.sin(row * 0.21) * 1.2, s = 0.78;
  return { p: [x, FLOOR + s / 2 + 0.012, z], r: [0, -0.18 + (col - 1.5) * 0.05 + Math.cos(row * 0.21) * 0.12, (hsh(k, 7) - 0.5) * 0.02], s, dim: 0 };
}

// year by year: one column per year, papers standing upright and overlapping upwards like a bar. The chart runs
// diagonally towards the camera: 2013 far back on the left, 2026 near on the right, so growth comes at you.
export const YPOS = (y) => [-1.8 + (y - 2013) * 0.28, -1.9 + (y - 2013) * 0.16];
export const YX = (y) => YPOS(y)[0];
export const YZ = (y) => YPOS(y)[1];
export const YSTEP = 0.1, YS = 0.36, YROT = -Math.atan2(0.24, 0.34) + Math.PI / 2 - 0.9;
export function years(D, k) {
  const p = D.pubs[k];
  if (p.yr == null) {
    const j = D.order.filter((q) => D.pubs[q].yr == null).indexOf(k);
    return { p: [-2.6 + (hsh(k, 1) - 0.5) * 0.8, FLOOR + 0.004 + j * 0.003, -2.2 + (hsh(k, 2) - 0.5) * 0.9], r: [-Math.PI / 2, 0, hsh(k, 3) * TAU], s: YS, dim: 0.55 };
  }
  const j = D.byYear[p.yr].indexOf(k), [x, z] = YPOS(p.yr);
  return { p: [x + (hsh(k, 4) - 0.5) * 0.02, FLOOR + YS / 2 + 0.01 + j * YSTEP, z - j * 0.01], r: [0, -0.12 + (hsh(k, 5) - 0.5) * 0.1, (hsh(k, 6) - 0.5) * 0.05], s: YS, dim: 0 };
}

// by venue: eight towers of flat-stacked papers on floor plates, two staggered rows of four; the rest lie flat
// further back
export const VPOS = (c) => [((c % 4) - 1.5) * 0.86 + (c >= 4 ? 0.43 : 0), c >= 4 ? -1.1 : 0];
export const VX = (c) => VPOS(c)[0];
export const VZ = (c) => VPOS(c)[1];
export const VSTEP = 0.058;
export function venues(D, k) {
  const v = D.pubs[k].venue, c = D.topv.indexOf(v);
  if (c < 0) {
    const a = hsh(k, 8) * TAU, R = 2.4 + hsh(k, 9) * 3.0;
    return { p: [Math.cos(a) * R, FLOOR + 0.003 + hsh(k, 10) * 0.004, -2.6 + Math.sin(a) * R * 0.5 - 1.0], r: [-Math.PI / 2, 0, hsh(k, 7) * TAU], s: 0.5, dim: 0.65 };
  }
  const j = D.byVenue[v].indexOf(k), [x, z] = VPOS(c);
  return { p: [x + (hsh(k, 3) - 0.5) * 0.025, FLOOR + 0.008 + j * VSTEP, z + (hsh(k, 4) - 0.5) * 0.025], r: [-Math.PI / 2, 0, (hsh(k, 5) - 0.5) * 0.16], s: 0.52, dim: 0 };
}

// three directions: three glass rings in the logo's triangle (blue quantum, green ML systems, red architecture), each
// wreathed by its own papers like a fan of cards that slowly turns
export const RING_C = [[-0.74, 0.5, 0], [0, 1.74, -0.2], [0.74, 0.5, 0]];
export const RING_R = 0.4, WREATH = 0.64;
export function orbit(D, k, f) {
  const r = D.pubs[k].ring, mem = D.byRing[r], j = mem.indexOf(k), n = mem.length;
  const [cx, cy, cz] = RING_C[r];
  const a = (j / n) * TAU + f * 0.0032 * (r === 1 ? -1 : 1) + r * 0.7;
  const R = WREATH + (j % 2) * 0.05;
  return { p: [cx + R * Math.cos(a), cy + R * Math.sin(a), cz - 0.02 - (j % 2) * 0.03 + (hsh(k, 41) - 0.5) * 0.02],
    r: [0, (hsh(k, 42) - 0.5) * 0.2, a - Math.PI / 2], s: 0.155, dim: 0.14 };
}
// a representative paper pulled out of its wreath to face the camera, in front of its ring
export function orbitRep(r, j) {
  const [cx, cy, cz] = RING_C[r];
  return { p: [cx + (j - 1) * 0.27, cy - 0.66 + (j === 1 ? 0.03 : 0), cz + 0.42 + (j === 1 ? 0.04 : 0)], r: [0, -(j - 1) * 0.22, -(j - 1) * 0.06], s: 0.3, dim: 0 };
}

// the honours: six papers standing in a row, the best paper in the middle and forward
export function awardsRow(D, k) {
  const i = D.awards.indexOf(k);
  if (i < 0) return null;
  const slot = [0, -1, 1, -2, 2, 3][i];      // best paper at the centre, then outwards
  const x = slot * 0.62 - (slot === 3 ? 0 : 0), front = i === 0 ? 0.55 : 0;
  return { p: [x, FLOOR + (i === 0 ? 0.92 : 0.78) / 2 + 0.012 + (i === 0 ? 0.15 : 0), -Math.abs(slot) * 0.12 + front], r: [0, -slot * 0.08, 0], s: i === 0 ? 0.92 : 0.7, dim: 0 };
}

// a dim cloud of papers far behind, slowly drifting (bokeh behind the people)
export function farCloud(D, k, f) {
  const i = D.RANK[k], a = i * 2.39996 + f * 0.0016, R = 4.2 + (i % 7) * 0.45;
  return { p: [R * Math.cos(a) * 1.1, 0.1 + (hsh(k, 21) - 0.5) * 4.4, -4.5 + R * Math.sin(a) * 0.45], r: [(hsh(k, 23) - 0.5) * 0.5, -a * 0.3 + hsh(k, 24), (hsh(k, 22) - 0.5) * 0.5], s: 0.55, dim: 0.62 };
}

// v7 frame 3: the end card arc behind the rings
export function endArc(D, k) {
  if (D.RANK[k] % 2) return farCloud(D, k, 0);
  const a = -1.3 + hsh(k, 1) * 2.6, R = 9 + hsh(k, 2) * 5;
  return { p: [Math.sin(a) * R, -0.3 + hsh(k, 3) * 3.6, -Math.cos(a) * R + 1.0], r: [(hsh(k, 4) - 0.5) * 0.3, -a + (hsh(k, 5) - 0.5) * 0.5, (hsh(k, 6) - 0.5) * 0.3], s: 0.7, dim: 0.7 };
}

// a swarm swirling above the people: a slow vortex, rank decides the radius so the newest are innermost
export function swarm(D, k, f, c = [0, 1.4, 0]) {
  const i = D.RANK[k], n = D.order.length, u = i / n;
  // the vortex grows outwards: the oldest papers circle closest, each year adds a wider ring
  const a = i * 2.39996 + f * (0.014 + 0.008 * (1 - u)), R = 0.72 + 2.3 * Math.sqrt(u) + hsh(k, 31) * 0.22;
  return { p: [c[0] + R * Math.cos(a), c[1] + (hsh(k, 32) - 0.5) * 1.8 + Math.sin(a * 0.7 + i) * 0.15, c[2] + R * Math.sin(a) * 0.8], r: [Math.sin(a + i) * 0.4, -a + Math.PI / 2, Math.cos(a * 1.3) * 0.3], s: 0.34, dim: 0.1 };
}

export function mixL(a, b, t, o = {}) {
  const L = (x, y) => x + (y - x) * t;
  return { p: [L(a.p[0], b.p[0]), L(a.p[1], b.p[1]) + (o.lift || 0), L(a.p[2], b.p[2])],
    r: [L(a.r[0], b.r[0]) + (o.rx || 0), L(a.r[1], b.r[1]) + (o.ry || 0), L(a.r[2], b.r[2]) + (o.rz || 0)], s: L(a.s, b.s), dim: L(a.dim, b.dim) };
}
