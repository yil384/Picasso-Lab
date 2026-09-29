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

// plan 1 (the verifier's catch): whole AOD columns 1 and 2 sent to each other's lanes (forward first, spread later):
// their rails must pass through each other. At the bump, the two swapped ghosts of each row touch; the bump point is
// clear of every other ghost and route; no ghost comes near a non-mover atom before the bump; columns stay straight.
{
  const SWAP = { 1: 2, 2: 1 }, path = (m, p) => P.planXZ(m, p, SWAP);
  const [a, b] = P.MOVERS.filter((m) => m.pr === 1 && m.pc in SWAP);
  let pb = -1, X = null;
  for (let k = 0; k <= 2000 && pb < 0; k++) { const p = k / 2000, A = path(a, p), B = path(b, p); if (Math.hypot(A[0] - B[0], A[1] - B[1]) <= 2 * P.R + 0.01) { pb = p; X = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; } }
  const near = P.MOVERS.map((m) => { const q = path(m, pb); return Math.hypot(q[0] - X[0], q[1] - X[1]); });
  let ghostAtom = 9, straight = 0;
  for (let k = 0; k <= Math.round(pb * 400); k++) {
    const p = k / 400, mv = P.MOVERS.map((m) => path(m, p));
    for (const at of P.ATOMS) if (at.kind !== 'mover') { const h = P.homeXZ(at); for (const q of mv) ghostAtom = Math.min(ghostAtom, Math.hypot(q[0] - h[0], q[1] - h[1])); }
    for (let c = 0; c < 3; c++) { const col = P.MOVERS.filter((m) => m.pc === c).map((m) => path(m, p)[0]); straight = Math.max(straight, Math.abs(col[0] - col[1])); }
  }
  console.log('plan1 (whole columns) bump at p', pb.toFixed(3), 'front-row point', X.map((v) => v.toFixed(2)).join(','), '| ghost dists to it', near.map((d) => d.toFixed(2)).join(' '),
    '| nearest ghost-to-atom before the bump', ghostAtom.toFixed(2), '| max column bend', straight.toFixed(3));
  console.log('r (Pip circle)', P.RINT, 'dock inside r:', P.PAIR < P.RINT, '| circles on the row pitch touch?', 2 * P.RINT >= P.PROW[1] - P.PROW[0], '| lane clearance', P.LANE);
}
