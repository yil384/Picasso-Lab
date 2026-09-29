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
