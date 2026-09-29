// q_phys.js - the physical layout and the AOD convoy move (pure functions; checked by tools/check_phys.mjs).
//
// Plate (top at y = 0): storage zone at the back (teal), entanglement zone in front (violet).
//  * Atoms: radius R, hovering at AY above the plate on their trap pedestals.
//  * Storage SLM grid: pitch 1.0 = 2.3 atom diameters, so "close" can only mean "interacting".
//  * Entanglement zone: 6 partner atoms at pitch 1.9 (x) x 1.4 (z). A mover docks PAIR = 0.52 to the left of its partner
//    (surface gap 0.08): an isolated pair. Nearest non-partner is >= 1.38 away (2.65x the pair distance): no crosstalk.
//  * Convoy: the 3 x 2 block of movers (storage rows 1-2; the back row stays) is picked up by 3 AOD columns x 2 AOD rows and moved
//    in ONE min-jerk AOD move: forward out of storage, the columns stretch 1.0 -> 1.9 and the rows 1.0 -> 1.4 (never
//    crossing: order is kept), then it glides into the zone. Lanes sit between the partner columns, so no mover ever
//    passes through another atom.
import { clamp, lerp } from '/pv/runtime/pv.js';

export const R = 0.22, AY = 0.44, PAIR = 0.52;
export const RINT = 0.65;                            // the interaction radius r (Pip's circle): a docked mover sits well inside it
export const SCOL = [-1.0, 0.0, 1.0];                // storage columns (x)
export const SROW = [-3.5, -2.5, -1.5];              // storage rows (z), back -> front
export const PCOL = [-1.42, 0.48, 2.38];            // partner columns (x) in the entanglement zone
export const PROW = [0.35, 2.05];                   // partner rows (z), back -> front (pitch 1.7: r-circles keep a clear 0.4 gap)
export const MCOL = [0, 1, 2], MROW = [1, 2];         // movers: storage columns 0-2 in rows 1-2
export const ZONE = { x0: -2.55, x1: 3.35, z0: -0.35, z1: 2.75 };
export const STORE = { x0: -1.65, x1: 1.65, z0: -4.05, z1: -0.95 };
export const PLATE = { x0: -4.5, x1: 5.0, z0: -4.6, z1: 3.8, h: 0.3 };
export const TRACK_X = -3.55;                      // Rook's side track (along z)
export const BUFFER = [2.0, -2.5];                   // spare trap used as a buffer position

export const ATOMS = [];   // { kind: 'store'|'mover'|'partner', c, r, k(index within kind) }
for (let r = 0; r < SROW.length; r++) for (let c = 0; c < SCOL.length; c++) {
  const mover = MCOL.includes(c) && MROW.includes(r);
  ATOMS.push({ kind: mover ? 'mover' : 'store', c, r });
}
for (let r = 0; r < PROW.length; r++) for (let c = 0; c < PCOL.length; c++) ATOMS.push({ kind: 'partner', c, r });
ATOMS.forEach((a, i) => { a.i = i; });
export const MOVERS = ATOMS.filter((a) => a.kind === 'mover');
export const PARTNERS = ATOMS.filter((a) => a.kind === 'partner');
MOVERS.forEach((a, k) => { a.k = k; a.pc = MCOL.indexOf(a.c); a.pr = MROW.indexOf(a.r); });
PARTNERS.forEach((a, k) => { a.k = k; });
export const partnerOf = (m) => PARTNERS.find((p) => p.c === m.pc && p.r === m.pr);

/** mover target (docked) position */
export const dockXZ = (m) => [PCOL[m.pc] - PAIR, PROW[m.pr]];
export const homeXZ = (a) => a.kind === 'partner' ? [PCOL[a.c], PROW[a.r]] : [SCOL[a.c], SROW[a.r]];

/**
 * AOD convoy geometry at progress p in [0,1] (p = 0 at storage, 1 docked). Column / row lines are rigid rails:
 * each mover sits at the intersection of its column line and its row line.
 *   phase A (0 .. 0.3): forward out of storage (+z 1.3), no stretch
 *   phase B (0.15 .. 0.65): columns stretch to the lanes, rows stretch to the partner-row pitch
 *   phase C (0.3 .. 1): glide forward to the partner rows
 * Returns { colX: [3], rowZ: [2] }.
 */
const mjx = (x) => { x = clamp(x); return x * x * x * (10 + x * (-15 + 6 * x)); };
// the columns glide down BUFFER LANES midway between the partner columns (0.95 from each partner, well outside r), and
// only when the rows have arrived do all three columns contract together onto the docks (+0.43): no mover ever passes
// within r of a non-partner, and the column order never changes.
export const LANE = 0.95;
export const stretchAt = (p) => mjx((clamp(p) - 0.08) / 0.36);   // columns out to the lanes (before the zone)
export const dockAt = (p) => mjx((clamp(p) - 0.84) / 0.16);       // the final contraction onto the docks
export function aodAt(p) {
  p = clamp(p);
  const s = stretchAt(p), d = dockAt(p);
  const colX = MCOL.map((c, i) => lerp(SCOL[c], PCOL[i] - LANE, s) + (LANE - PAIR) * d);
  const z0 = SROW[MROW[0]], z1 = SROW[MROW[1]];
  const fwd = mjx(p / 0.86);                   // forward travel, done before the contraction
  const pitch = lerp(z1 - z0, PROW[1] - PROW[0], s);
  const front = lerp(z1, PROW[1], fwd);
  const rowZ = [front - pitch, front];
  return { colX, rowZ };
}
export function moverXZ(m, p) { const A = aodAt(p); return [A.colX[m.pc], A.rowZ[m.pr]]; }

/**
 * A routing plan's path for mover m at progress p. The good plan IS the executed convoy (moverXZ). A 'swap' plan sends the
 * listed front-row movers to each other's docks: their AOD columns would have to cross (the verifier's catch).
 */
export function planXZ(m, p, swap = null) {
  const [x, z] = moverXZ(m, p);
  if (!swap || m.pr !== 1 || !(m.pc in swap)) return [x, z];
  const c = swap[m.pc];
  return [lerp(SCOL[MCOL[m.pc]], PCOL[c] - LANE, stretchAt(p)) + (LANE - PAIR) * dockAt(p), z];
}
