// Clearance + pair-isolation check for q_phys.js. Run: (cd tools; sed "s#/pv/runtime/pv.js#./_pv.mjs#" ../q_phys.js > _phys.mjs; echo "export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)); export const lerp=(a,b,t)=>a+(b-a)*t;" > _pv.mjs; node check_phys.mjs; rm _phys.mjs _pv.mjs)
import * as P from './_phys.mjs';
let minD = 9, where = null, minMM = 9;
for (let i = 0; i <= 200; i++) {
  const p = i / 200;
  const mv = P.MOVERS.map((m) => P.moverXZ(m, p));
  for (const a of P.ATOMS) if (a.kind !== 'mover') {
    const h = P.homeXZ(a);
    for (let k = 0; k < mv.length; k++) {
      const d = Math.hypot(mv[k][0] - h[0], mv[k][1] - h[1]);
      const isPartner = a.kind === 'partner' && a === P.partnerOf(P.MOVERS[k]);
      if (!isPartner && d < minD) { minD = d; where = { p, k, a: a.i }; }
    }
  }
  for (let a = 0; a < mv.length; a++) for (let b = a + 1; b < mv.length; b++) minMM = Math.min(minMM, Math.hypot(mv[a][0] - mv[b][0], mv[a][1] - mv[b][1]));
}
console.log('min mover-to-non-partner distance', minD.toFixed(3), JSON.stringify(where), 'min mover-mover', minMM.toFixed(3));
const end = P.MOVERS.map((m) => P.moverXZ(m, 1));
// at docking: each mover's nearest other atom must be its partner at PAIR, and next nearest >= 2.5*PAIR
const all = P.ATOMS.map((a) => a.kind === 'mover' ? P.moverXZ(a, 1) : P.homeXZ(a));
for (const m of P.MOVERS) {
  const me = all[m.i]; const ds = all.map((q, j) => [Math.hypot(q[0] - me[0], q[1] - me[1]), j]).filter(([d, j]) => j !== m.i).sort((a, b) => a[0] - b[0]);
  console.log('mover', m.k, 'nearest', ds[0][0].toFixed(2), 'partner?', P.ATOMS[ds[0][1]] === P.partnerOf(m), 'second', ds[1][0].toFixed(2), 'ratio', (ds[1][0] / P.PAIR).toFixed(2));
}

// plan 1 (the verifier's catch): swap the front row's middle and right columns. At the bump exactly two ghosts touch, no third
// ghost or route is near the bump point, and the swap is plan 1's only violation (no ghost ever meets a real atom).
{
  const SWAP = { 1: 2, 2: 1 }, WRONG = P.MOVERS.map((m) => m.pr === 1 && m.pc in SWAP);
  const path = (m, p) => P.planXZ(m, p, SWAP);
  const [a, b] = P.MOVERS.filter((_, i) => WRONG[i]);
  let pb = -1, X = null;
  for (let k = 0; k <= 2000 && pb < 0; k++) { const p = k / 2000, A = path(a, p), B = path(b, p); if (Math.hypot(A[0] - B[0], A[1] - B[1]) <= 2 * P.R + 0.01) { pb = p; X = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; } }
  const g = P.MOVERS.map((m) => path(m, pb));
  const near = g.map((q) => Math.hypot(q[0] - X[0], q[1] - X[1]));
  let routeNear = 9;
  P.MOVERS.forEach((m, i) => { if (WRONG[i]) return; for (let k = 0; k <= 400; k++) { const q = path(m, k / 400); routeNear = Math.min(routeNear, Math.hypot(q[0] - X[0], q[1] - X[1])); } });
  let ghostAtom = 9;
  for (let k = 0; k <= pb * 400; k++) {
    const p = k / 400, mv = P.MOVERS.map((m) => path(m, p));
    for (const at of P.ATOMS) if (at.kind !== 'mover') { const h = P.homeXZ(at); for (const q of mv) ghostAtom = Math.min(ghostAtom, Math.hypot(q[0] - h[0], q[1] - h[1])); }
  }
  console.log('plan1 bump at p', pb.toFixed(3), 'point', X.map((v) => v.toFixed(3)).join(','), 'ghost dists to it', near.map((d) => d.toFixed(2)).join(' '),
    '| nearest other route', routeNear.toFixed(2), '| nearest ghost-to-atom before the bump', ghostAtom.toFixed(2));
  console.log('r (Pip circle)', P.RINT, 'dock inside r:', P.PAIR < P.RINT, '| circles on the row pitch touch?', 2 * P.RINT >= P.PROW[1] - P.PROW[0], '| lane clearance', P.LANE);
}
