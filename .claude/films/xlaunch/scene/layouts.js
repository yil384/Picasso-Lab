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

// year by year: an isotype chart, one small page per paper stacked into a column, so a column's height is exactly
// its count. The columns run slightly into depth (2026 nearest) but little enough that a long lens reads them true.
export const YPOS = (y) => [-1.51 + (y - 2013) * 0.218, -0.6];   // level: no slope into depth
export const YX = (y) => YPOS(y)[0];
export const YZ = (y) => YPOS(y)[1];
export const YS = 0.112, YSTEP = 0.118;                        // brick height, row pitch
export const YTOP = (n) => FLOOR + 0.006 + n * YSTEP;          // top of a column of n
export function years(D, k) {
  const p = D.pubs[k];
  if (p.yr == null) {
    // the twelve papers without a year: a small loose pile beside the axis, labelled as such
    const j = D.order.filter((q) => D.pubs[q].yr == null).indexOf(k);
    // the twelve without a year (7 preprints, 5 patents): a small fanned stack leaning against nothing, faces out
    return { p: [YX(2027) + (j - 5.5) * 0.008, FLOOR + 0.006 + YS / 2 + 0.002 * j, YZ(2027) - j * 0.004], r: [-0.22, (j - 5.5) * 0.05, (j - 5.5) * 0.035], s: YS, dim: 0.35 };
  }
  const j = D.byYear[p.yr].indexOf(k), [x, z] = YPOS(p.yr);
  return { p: [x + (hsh(k, 4) - 0.5) * 0.006, FLOOR + 0.006 + YS / 2 + j * YSTEP, z], r: [0, (hsh(k, 5) - 0.5) * 0.08, (hsh(k, 6) - 0.5) * 0.03], s: YS, dim: 0 };
}

// by venue: eight stacks of bound papers on a shallow arc, the two 15s side by side in the middle and the rest
// stepping down outwards (a pyramid), so the tie is the centre of the frame
export const VSLOT = [3, 4, 2, 5, 1, 6, 0, 7];                 // by index in D.topv (ASPLOS, ISCA, MICRO, NeurIPS, OSDI, SC, ATC, ICML)
export const VPOS = (c) => { const a = (VSLOT[c] - 3.5) * 0.17; return [3.2 * Math.sin(a), 3.2 * (Math.cos(a) - 1) - 0.1]; };
export const VX = (c) => VPOS(c)[0];
export const VZ = (c) => VPOS(c)[1];
export const VSTEP = 0.04, VS = 0.52;
export function venues(D, k) {
  const v = D.pubs[k].venue, c = D.topv.indexOf(v);
  if (c < 0) {
    const a = hsh(k, 8) * TAU, R = 2.4 + hsh(k, 9) * 3.0;
    return { p: [Math.cos(a) * R, FLOOR + 0.003 + hsh(k, 10) * 0.004, -2.6 + Math.sin(a) * R * 0.5 - 1.0], r: [-Math.PI / 2, 0, hsh(k, 7) * TAU], s: 0.5, dim: 0.65 };
  }
  const j = D.byVenue[v].indexOf(k), [x, z] = VPOS(c), a = (VSLOT[c] - 3.5) * 0.17;
  return { p: [x + (hsh(k, 3) - 0.5) * 0.02, FLOOR + 0.006 + (j + 1) * VSTEP, z + (hsh(k, 4) - 0.5) * 0.02], r: [-Math.PI / 2, 0, -a + (hsh(k, 5) - 0.5) * 0.05], s: VS, dim: 0 };
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

// the honours: five slots on a gentle arc, the Best Paper in the middle, one step forward and larger; the two
// ASPLOS'24 Distinguished Artifacts share the last slot, overlapped
export const AW_SLOT = { 4: 0, 63: -1, 66: -2, 89: 1, 42: 2, 43: 2 };
export function awardsRow(D, k) {
  if (!(k in AW_SLOT)) return null;
  const sl = AW_SLOT[k], best = sl === 0 && k === D.awards[0], pair = k === 43 ? 1 : 0;
  const s = best ? 0.78 : 0.48, a = sl * 0.27;
  const x = Math.sin(a) * 2.4 + pair * 0.07, z = (best ? 0.42 : 0) - (1 - Math.cos(a)) * 2.4 - pair * 0.04;
  return { p: [x, FLOOR + s / 2 + 0.012 + pair * 0.01, z], r: [0, -a + (best ? 0.16 : 0) + pair * 0.12, pair * 0.03], s, dim: 0 };
}

// a dim cloud of papers far behind, slowly drifting (bokeh behind the people)
export function farCloud(D, k, f) {
  const i = D.RANK[k], a = i * 2.39996 + f * 0.0016, R = 4.2 + (i % 7) * 0.45;
  return { p: [R * Math.cos(a) * 1.1, 0.1 + (hsh(k, 21) - 0.5) * 4.4, -4.5 + R * Math.sin(a) * 0.45], r: [(hsh(k, 23) - 0.5) * 0.5, -a * 0.3 + hsh(k, 24), (hsh(k, 22) - 0.5) * 0.5], s: 0.55, dim: 0.62 };
}

// v7 frame 3: the end card arc behind the rings
export function endArc(D, k) {
  if (D.RANK[k] % 2) return farCloud(D, k, 0);
  let a = -1.3 + hsh(k, 1) * 2.6, R = 9 + hsh(k, 2) * 5, y = -0.3 + hsh(k, 3) * 3.6;
  if (Math.abs(a) < 0.55 && y < 1.4) { R += 5; y += 1.2; }           // nothing bright behind the call to action
  const x = Math.sin(a) * R, z = -Math.cos(a) * R + 1.0, face = Math.atan2(0 - x, 5.6 - z);
  return { p: [x, y, z], r: [(hsh(k, 4) - 0.5) * 0.25, face + (hsh(k, 5) - 0.5) * 0.3, (hsh(k, 6) - 0.5) * 0.3], s: 0.7, dim: 0.78 };
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
