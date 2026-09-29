// q_time.js - the timeline: key frames, camera rigs and every character's state as a pure function of the frame.
// 672 frames = 28 s at 24 fps. Compile first (place -> plan + verifier on a ghost dry run -> optimise on the
// simulator), then the real run (one convoy + one global pulse), then the honest race result. See STORYBOARD.md.
import * as P from './q_phys.js';
import { TAU, clamp, lerp, mj, mjv, sm, io, ob, oc, ic, q5, sg, twos, ringv, bumpv, takeSq, keyed, hsh, mixRig, shakeAt } from './q_util.js';

export const NF = 672, FPS = 24;

export const K = {
  // S1 wake (0-54): the lab asleep; Pip wakes, stretches, the take
  pipIn: [12, 30], pipTake: 34,
  // S2 placement (54-148): a circle of radius r round each partner; the mover's dock mark sits on it
  arcs: [[56, 72], [76, 90], [94, 106], [110, 120], [122, 132], [134, 144]],
  rise: [130, 150],
  // S3 plan + verifier on a ghost dry run (148-262)
  whip1: [146, 158], toot: 162, plan1: [166, 184], peel: [184, 190], steps1: [194, 200],
  loupeIn: [180, 196], whistle: 204, flag: [206, 214], erase: [226, 236], plan2: [236, 246], steps2: [248, 252, 256, 260], ok: 262,
  // S4 optimise on the simulator (262-344): try (too fast: a ghost flies off, fidelity drops) -> rejected; try -> accepted
  matchT: 268, tickWake: 271, tries: [[274, 318, false], [320, 352, true]],   // S3->S4: push into Loupe's lens, match cut on the circle to Tick's dial
  // S5 GO: the real run - one convoy (344-434)
  whipG: [362, 372], aodOn: [346, 358], click: 358, toot2: 360, crouch: [356, 362], glide: [362, 402], dock: 402,
  // S6 one global pulse (434-484)
  whip2: [428, 438], pulseClick: 444, zap: 450,
  // S7 the race result (484-640): Qubrio's hand stopped at the dock; PowerMove's ghost hand runs on while Slo ferries
  // two atoms per trip; it closes the lap as Slo drops the last pair -> 4.7x; then 1.3x
  wait: [484, 550], lap: 550, flagUp: 557, tagUp: 572, whip3: [482, 494],
  wipe: [645, 655],   // brush wipe: full cover only ~648-651, the cut (reset) at 650
};
export const CUT = 650;
if (K.glide[0] + Math.round((K.glide[1] - K.glide[0]) * 4.7) !== K.lap) throw new Error('K.lap must equal glide[0] + 4.7 x TQ');
export const TQ = K.glide[1] - K.glide[0];            // Qubrio's run: one convoy move (40 f)
export const TP = Math.round(TQ * 4.7);               // PowerMove's run: 4.7x as long (188 f); K.lap = glide[0] + TP
export const LAP_FINAL = 1 / 4.7;                     // Qubrio's run as a fraction of PowerMove's lap
// before optimisation Qubrio's schedule is 1.7x longer (site: "without optimization (K=0), schedules are 1.7x longer")
export const LAP_RAW = 1.7 / 4.7;
export const FID_FINAL = 1.3;                         // fidelity relative to PowerMove's mark

// ---------------------------------------------------------------------------------------------------------------
// convoy (real run) progress 0..1; the loop resets under the wipe cut
export function convoyP(F) { return F >= CUT ? 0 : mj((F - K.glide[0]) / TQ); }
export const convoyV = (F) => (F >= K.glide[0] && F < K.glide[1] ? mjv((F - K.glide[0]) / TQ) / 1.875 : 0);
export const aodK = (F) => (F >= CUT ? 0 : sg(F, K.aodOn[0], K.aodOn[1]) * (1 - sg(F, K.dock + 10, K.dock + 22)));

// routing plans (pencil) and the ghost dry run. Plan 2 IS the executed convoy (the same AOD path, sampled); plan 1 swaps
// the front row's two left columns, so those two AOD columns would have to cross: their ghosts meet (exactly two of them)
// at one point on the way, and that is where the verifier's flag lands.
export const SWAP = { 1: 2, 2: 1 };   // whole AOD columns 1 and 2 sent to each other's lanes (both rows)
export const WRONG = P.MOVERS.map((m) => m.pc in SWAP);   // whole columns: both rows
export const planPath = (m, p, bad) => P.planXZ(m, p, bad ? SWAP : null);
export const CROSS_AT = (() => {   // [x, z, p]: the first progress at which the two swapped ghosts touch (centres 2R apart)
  const [a, b] = P.MOVERS.filter((m, i) => WRONG[i] && m.pr === 1);   // the front row's pair (the flag marks it)
  for (let k = 0; k <= 2000; k++) {
    const p = k / 2000, A = planPath(a, p, true), B = planPath(b, p, true);
    if (Math.hypot(A[0] - B[0], A[1] - B[1]) <= 2 * P.R + 0.01) return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, p];
  }
  return [0, 0, 0.5];
})();
export const STEPS1 = [CROSS_AT[2] * 0.5, CROSS_AT[2]];   // dry-run steps of plan 1 (step 2 = the bump)
export const STEPS2 = [0.25, 0.5, 0.75, 1];               // the clean re-run of plan 2

/** ghost atoms (pencil stand-ins of the movers) for the dry run and the simulator replays: [{vis, x, y, z, spin, eyes}] */
export function ghostState(F) {
  const out = P.MOVERS.map(() => ({ vis: 0, x: 0, y: P.AY, z: 0, spin: 0, eyes: 'dot' }));
  if (F >= CUT) return out;
  const Fc = twos(F);
  // dry run of plan 1: peel off the sleeping atoms, then stop-motion steps; step 2 = the two swapped ghosts bump
  if (F >= K.peel[0] && F < K.erase[1]) {
    const pk = sm((F - K.peel[0]) / (K.peel[1] - K.peel[0]));
    const rew = sg(F, K.erase[0], K.erase[1]);   // rewound while the routes are rubbed out
    P.MOVERS.forEach((m, i) => {
      let p = 0;
      if (Fc >= K.steps1[0]) p = STEPS1[0];
      if (Fc >= K.steps1[1]) p = STEPS1[1];
      const [x0, z] = planPath(m, p * (1 - rew), true);
      const bump = Fc >= K.steps1[1] && WRONG[i] ? bumpv(Fc - K.steps1[1], 0.07, 1.2, 0.2) * Math.sign(m.pc - SWAP[m.pc]) : 0;
      const hop = (Fc >= K.steps1[0] && Fc < K.steps1[0] + 4) || (Fc >= K.steps1[1] && Fc < K.steps1[1] + 4) ? 0.08 : 0;
      const hit = WRONG[i] && Fc >= K.steps1[1] && rew < 0.5;
      const dim = WRONG[i] ? 1 : 1 - 0.6 * sg(F, K.steps1[1], K.steps1[1] + 4);
      const hov = lerp(0.55, 0.12, sm((Fc - K.steps1[0] + 2) / 4));   // peel up off the sleeper, then run low on the plate
      out[i] = { vis: pk * dim * (1 - sg(F, K.erase[1] - 3, K.erase[1])), x: x0 + bump, y: P.AY + hov * pk + hop, z, spin: 0, eyes: hit ? (Fc < K.steps1[1] + 6 ? 'x' : 'dizzy') : 'dot' };
    });
  }
  // re-run of plan 2 (the convoy path): four clean steps into the docks
  if (F >= K.plan2[1] && F < K.ok + 8) {
    const pk = sm((F - K.plan2[1]) / 4) * (1 - sg(F, K.ok + 2, K.ok + 8));
    P.MOVERS.forEach((m, i) => {
      let p = 0; K.steps2.forEach((s, k) => { if (Fc >= s) p = STEPS2[k]; });
      const [x, z] = planPath(m, p, false);
      out[i] = { vis: pk, x, y: P.AY + 0.3, z, spin: 0, eyes: F >= K.ok - 2 ? 'happy' : 'dot' };
    });
  }
  return out;
}
// Rook's pencil (the router's tool): pops out of the cab, draws plan 1's routes one after another (the reveal follows
// its tip), rubs out the two wrong ones with its eraser, redraws them in order, and ducks back into the cab.
const P0 = P.MOVERS.map((m) => { const h = P.homeXZ(m); for (let k = 0; k <= 48; k++) { const q = P.planXZ(m, k / 48); if (Math.hypot(q[0] - h[0], q[1] - h[1]) > P.R + 0.08) return k / 48; } return 0; });
const WI = P.MOVERS.map((_, i) => i).filter((i) => WRONG[i]);
// one sweeping pass: all routes of a plan grow together under the pencil, which rides the lead route's growing end
const SWEEP1 = [K.plan1[0], K.plan1[1]], SWEEP2 = [K.plan2[0] + 1, K.plan2[1]];
const LEAD1 = 1, LEAD2 = 1;   // the back-row middle mover: a swapped column (in both plans), and it stays in frame
const RUB = (j) => [K.erase[0] + 5 * j, K.erase[0] + 5 * j + 5];
/** revealed fraction of plan 1 / plan 2 route i at frame F (0..1) */
export function routeK(i, F, which) {
  if (F >= CUT || F >= K.glide[0]) return 0;
  const fade = 1 - sg(F, K.aodOn[0], K.glide[0]);
  if (which === 1) {
    let k = clamp((F - SWEEP1[0]) / (SWEEP1[1] - SWEEP1[0]));
    if (WI.includes(i)) k *= 1 - clamp((F - K.erase[0] - 1) / (K.erase[1] - K.erase[0] - 2));   // both rubbed out under the eraser
    return fade > 0.02 ? k : 0;
  }
  const j = WI.indexOf(i); if (j < 0) return 0;
  return fade > 0.02 ? clamp((F - SWEEP2[0]) / (SWEEP2[1] - SWEEP2[0])) : 0;
}
const tipAt = (i, k, bad) => { const p = P0[i] + (1 - P0[i]) * clamp(k); const [x, z] = planPath(P.MOVERS[i], p, bad); return [x, 0.03, z]; };
export function pencilState(F, cab) {
  // one continuous performance, always on screen: out of the cab, one sweeping pass drawing plan 1, hover by the crossing
  // (startle at the whistle), flip to the eraser (4 f, through horizontal), scrub, flip back, one pass redrawing in ochre,
  // then home. flip: 0 = tip down, 1 = eraser down.
  const Fc = F;   // (on ones: the pencil is the fastest thing in the shot)
  if (F >= CUT || Fc < K.plan1[0] - 8 || Fc >= K.plan2[1] + 12) return null;
  let tip, bob = 0, jolt = 0, flip = 0;
  const hover = [CROSS_AT[0] - 0.55, 1.25, CROSS_AT[1] - 0.7], X = [CROSS_AT[0], 0.03, CROSS_AT[1]];
  const arc = (a, b, u, h) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + h * Math.sin(Math.PI * u), lerp(a[2], b[2], u)];
  const f1 = K.erase[0] - 6, f2 = K.plan2[0] - 3;   // flip windows (4 f each)
  if (Fc < K.plan1[0]) tip = arc(cab, tipAt(LEAD1, 0, true), io((Fc - K.plan1[0] + 8) / 8), 0.8);
  else if (Fc < K.plan1[1]) tip = tipAt(LEAD1, (Fc - SWEEP1[0]) / (SWEEP1[1] - SWEEP1[0]), true);
  else if (Fc < f1) {   // hovers beside the crossing; startles at the whistle
    tip = arc(tipAt(LEAD1, 1, true), hover, io((Fc - K.plan1[1]) / 8), 0.5); bob = 0.05 * Math.sin(Fc * 0.5);
    if (Fc >= K.whistle && Fc < K.whistle + 8) jolt = 0.3 * Math.exp(-(Fc - K.whistle) / 3);
  } else if (Fc < K.erase[0]) {   // flips over (anticipation dip), then dives to the X eraser-first
    const u = clamp((Fc - f1) / 4); flip = sm(u);
    tip = u < 1 ? [hover[0], hover[1] - 0.12 * Math.sin(Math.PI * u), hover[2]] : arc(hover, X, io((Fc - f1 - 4) / 2), 0.1);
  } else if (Fc < K.erase[1]) {   // scrubs back and forth across the X
    const t = Fc - K.erase[0], w = Math.sin(t * 1.6); flip = 1;
    tip = [X[0] + 0.34 * w, X[1], X[2] + 0.12 + 0.14 * Math.cos(t * 1.1)];
  } else if (Fc < SWEEP2[0]) {   // lifts, flips back, lands on the redraw start
    const u = clamp((Fc - K.erase[1]) / (SWEEP2[0] - K.erase[1])); flip = 1 - sm(clamp((Fc - f2) / 4));
    tip = arc(X, tipAt(LEAD2, 0, false), io(u), 0.35);
  } else if (Fc < SWEEP2[1]) tip = tipAt(LEAD2, (Fc - SWEEP2[0]) / (SWEEP2[1] - SWEEP2[0]), false);
  else tip = arc(tipAt(LEAD2, 1, false), cab, io((Fc - K.plan2[1]) / 12), 0.8);
  const erase = flip > 0.5;
  return { tip: [tip[0], tip[1] + bob + jolt, tip[2]], erase, flip, drawing: (Fc >= K.plan1[0] && Fc < K.plan1[1]) || (Fc >= SWEEP2[0] && Fc < SWEEP2[1]), rub: Fc >= K.erase[0] && Fc < K.erase[1] ? Fc - K.erase[0] : -1 };
}
// Tick's slate (the simulator): the plan replays as a pencil diagram on the board Tick holds up. Try 1 (faster) rushes;
// one ghost is flung off the board at the lens and fidelity drops -> thrown away. Try 2 drops the set-down/re-pick
// hiccup: the block glides in one go, time shrinks, fidelity rises -> kept. The real chip stays asleep meanwhile.
export const tryVerdictAt = (a, ok) => a + (ok ? 12 : 21);   // X held 23 f, check held 20 f (to GO)   // the rejected try's stamp lands after the flung ghost thunks
export function slateState(F) {
  if (F >= CUT) return null;
  const vis = sg(F, K.tickWake + 2, K.tickWake + 8) * (1 - sg(F, K.click - 7, K.click - 2));
  if (vis < 0.01) return null;
  let p = 0, fling = -1, hic = 0, rewind = 0;
  for (const [a, b, ok] of K.tries) {
    if (F < a) break;
    const g0 = a + 4;
    if (ok) p = mj((F - g0) / 7);                            // one smooth glide (lands before the check)
    else {                                                  // rushed, with the old set-down/re-pick hiccup mid-way
      const u = clamp((F - g0) / 6);
      p = u < 0.4 ? mj(u / 0.4) * 0.45 : u < 0.6 ? 0.45 : 0.45 + 0.55 * mj((u - 0.6) / 0.4);
      hic = u >= 0.4 && u < 0.6 ? 1 : 0;
      fling = F >= g0 + 5 ? F - (g0 + 5) : -1;
      rewind = sg(F, b - 5, b - 1);
      if (F >= b - 1) { p = 0; fling = -1; }
      else p *= 1 - rewind;
    }
  }
  // the stamp lands: the slate jolts
  let jolt = 0;
  for (const [a, , ok] of K.tries) { const d = F - tryVerdictAt(a, ok); if (d >= 0 && d < 6) jolt = Math.max(jolt, Math.exp(-d / 2) * (d < 1 ? 1 : 0.6)); }
  return { vis, p, fling, flungIdx: 4, hic, rewind, jolt };
}
export function planState(F) {
  // pencil route arrows: plan 1 (two routes cross) is drawn, flagged, those two rubbed out; plan 2 in order; all fade at GO
  if (F >= CUT || F < K.plan1[0] || F >= K.glide[0]) return null;
  const d1 = sg(F, K.plan1[0], K.plan1[1], (x) => x);
  const erase = sg(F, K.erase[0], K.erase[1], (x) => x);
  const d2 = sg(F, K.plan2[0], K.plan2[1], (x) => x);
  const fade = 1 - sg(F, K.aodOn[0], K.glide[0]);
  return { d1, erase, d2, fade, flag: F >= K.whistle ? F - K.whistle : -1, ok: F >= K.ok ? F - K.ok : -1 };
}
/** the verifier's penalty flag: thrown from Loupe's hand, it lands exactly on the crossing */
export function flagState(F, hand) {
  if (F < K.flag[0] || F >= K.plan2[1] + 4 || F >= CUT) return null;
  const u = clamp((F - K.flag[0]) / (K.flag[1] - K.flag[0]));
  const x = lerp(hand[0], CROSS_AT[0], u), z = lerp(hand[2], CROSS_AT[1] - 0.12, u), y = lerp(hand[1], 0, u) + 0.9 * Math.sin(Math.PI * u);
  const off = F - K.plan2[1];   // after the ochre redraw: a 1-frame swell, then it pops off (no fade, no shrinking glyph)
  return { x, y: Math.max(0, y), z, rot: (1 - u) * 6, planted: u >= 1, age: F - K.flag[1], k: off < 0 ? 1 : off < 2 ? 1.15 : 0 };
}

// ---------------------------------------------------------------------------------------------------------------
// PowerMove (Slo): the same job with scalar routing: 2 atoms per trip (~1.7 per move on the site), legs at the SAME
// speed limit as the convoy, so it needs 3 loaded + 2 empty legs = 5 legs; TP = 4.7 x TQ.
export const SLO = { z: 3.15, xA: 0.1, xB: 0.1 + (P.PROW[1] - P.SROW[2]) };   // a front lane beside Tick, as long as the convoy's travel
export const LEG = TP / 5;                                      // 37.6 f per leg (the convoy's one move takes 40 f)
export function sloTrip(F) {
  if (F >= CUT || F < K.glide[0]) return { leg: -1, u: 0, x: SLO.xA, dir: 1, loaded: true, delivered: 0 };
  const t = (F - K.glide[0]) / LEG;
  if (t >= 5) return { leg: 5, u: 1, x: SLO.xB, dir: 1, loaded: false, delivered: 6 };
  const leg = Math.floor(t), u = t - leg, dir = leg % 2 ? -1 : 1;
  const x = dir > 0 ? lerp(SLO.xA, SLO.xB, mj(u)) : lerp(SLO.xB, SLO.xA, mj(u));
  return { leg, u, x, dir, loaded: dir > 0, delivered: 2 * Math.ceil(leg / 2) };
}
export function sloState(F) {
  const Fc = twos(F), T = sloTrip(F);
  let eyes = 'half', mouth = null, emote = null, st = 0, sq = 0, sway = 0, lean = 0, stalk = 0, yaw = T.dir > 0 ? 0 : Math.PI;
  if (T.leg >= 0 && T.leg < 5) {
    const v = mjv(T.u) / 1.875;
    st = 0.12 * v; lean = -0.05 * v; sway = 0.05 * Math.sin(Fc * 0.6) * v; eyes = 'slit'; mouth = 'teeth';
    if (T.leg > 0 && T.u < 0.14) yaw = lerp(T.dir > 0 ? Math.PI : 0, yaw, sm(T.u / 0.14));   // turns round at each end
    if (T.u > 0.9) sq = ringv((T.u - 0.9) * LEG, 0.12, 1.0, 0.25);
    if (T.leg >= 2 && T.u > 0.3 && T.u < 0.7) emote = { type: 'sweat', age: Math.floor((T.u - 0.3) * LEG) };
  }
  if (F >= K.glide[0] && F < K.glide[1]) stalk = 0.4 * convoyV(F);   // the convoy's wake
  if (T.leg === 5 && F < CUT) { const a = Fc - (K.glide[0] + TP); eyes = a < 10 ? 'dizzy' : 'half'; mouth = 'wobble'; sq = ringv(a, 0.2, 0.8, 0.14); if (a < 18) emote = { type: 'sweat', age: a }; }
  if (F < K.glide[0] || F >= CUT) eyes = 'sleep';
  return { x: T.x, z: SLO.z, yaw, lean, st, sq, sway, stalk, loaded: T.loaded, delivered: T.delivered, leg: T.leg, face: { eyes, mouth, ph: Fc * 0.25 }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// atoms: acting (faces + squash) on twos; centres only move by the AOD
export function atomState(a, F) {
  const Fc = twos(F), o = Math.floor(hsh(a.i, 7.7) * 4), ph = hsh(a.i, 3.3);
  let eyes = 'sleep', mouth = null, sq = 0, dy = 0, look = [0, 0], blush = 0, emote = null, zzz = true, st = 0, amber = 0;
  const breath = 0.03 * Math.sin(TAU * (F / 48 + ph));
  if (a.kind === 'partner') {
    const closed = K.arcs[a.k][1];
    const T = keyed(Fc, [[0, 's'], [closed - 2, 'take'], [closed + 12, 'wait'], [K.matchT, 's2'], [K.glide[1] - 10, 'see'], [K.dock + 2, 'love'], [K.zap - 6, 'sq'], [K.zap + 4, 'star'], [K.zap + 40, 'love'], [CUT, 's']]);
    zzz = T.v === 's';
    if (T.v === 'take') { eyes = T.age < 3 ? 'squeeze' : 'wide'; mouth = 'o'; sq = takeSq(T.age - 3); emote = { type: 'ping', age: T.age, col: '#f2a922' }; }
    if (T.v === 'wait') { eyes = 'dot'; look = [-0.8, 0]; }
    if (T.v === 's2') { eyes = 'half'; look = [-0.6, 0]; }
    if (T.v === 'see') { eyes = 'wide'; look = [-0.9, 0.1]; }
    if (T.v === 'love' || T.v === 'star') { eyes = T.v === 'star' ? 'star' : 'happy'; mouth = 'smile'; blush = 1; look = [-0.6, 0]; if (T.v === 'love' && T.age < 14 && Fc < K.zap) sq = ringv(T.age, 0.16, 0.9, 0.2); }
    if (T.v === 'sq') { eyes = 'squeeze'; mouth = 'flat'; sq = 0.1; }
    if (F >= K.flagUp && F < CUT && (T.v === 'love' || T.v === 'star')) dy = cheer(a, Fc);
  } else if (a.kind === 'mover') {
    const T = keyed(Fc, [[0, 's'], [K.peel[0] + o, 'peek'], [K.ok + 6, 's'], [K.aodOn[0] + 2 + o, 'wake'], [K.crouch[0], 'crouch'], [K.glide[0], 'whee'], [K.dock - 2, 'land'], [K.dock + 6, 'love'], [K.zap - 6, 'sq'], [K.zap + 4, 'star'], [K.zap + 40, 'love'], [CUT, 's']]);
    zzz = T.v === 's';
    if (T.v === 'peek') { eyes = 'half'; look = [0, 0.5]; }
    // dramatic irony: the two real atoms whose ghosts are about to collide see it coming, glance at each other, flinch
    if (T.v === 'peek' && a.pr === 1 && a.pc in SWAP && Fc >= K.steps1[0] - 4 && Fc < K.whistle + 10) {
      const t = Fc - (K.steps1[0] - 4);
      eyes = 'wide'; look = [Math.sign(SWAP[a.pc] - a.pc) * (t < 6 ? 0.9 : 0.5), 0.2];
      if (Fc >= K.steps1[1]) { eyes = Fc < K.steps1[1] + 4 ? 'squeeze' : 'worried'; mouth = 'wobble'; sq = takeSq(Fc - K.steps1[1]) * 0.6; emote = { type: 'sweat', age: Fc - K.steps1[1] }; }
    }
    if (T.v === 'wake') { eyes = T.age < 3 ? 'squeeze' : 'wide'; mouth = 'o'; sq = takeSq(T.age - 3); if (a.pr === 1) emote = { type: 'bang', age: T.age }; }
    if (T.v === 'crouch') { eyes = 'squeeze'; mouth = 'teeth'; sq = 0.14 * sm(T.age / 3); }
    if (T.v === 'whee') { eyes = 'happy'; mouth = 'grin'; st = 0.18 * convoyV(F); }
    if (T.v === 'land') { eyes = 'wide'; mouth = 'o'; sq = ringv(T.age, 0.2, 0.9, 0.18); }
    if (T.v === 'love' || T.v === 'star') { eyes = T.v === 'star' ? 'star' : 'happy'; mouth = 'smile'; blush = 1; look = [0.6, 0]; if (T.v === 'love' && T.age < 14 && Fc < K.zap) sq = ringv(T.age + 3, 0.16, 0.9, 0.2); }
    if (T.v === 'sq') { eyes = 'squeeze'; mouth = 'flat'; sq = 0.1; }
    if (F >= K.flagUp && F < CUT && (T.v === 'love' || T.v === 'star')) dy = cheer(a, Fc);
    amber = aodK(F);   // held by the AOD: tinted amber
  } else {   // storage atoms that stay: doze, peek at the fuss, flinch at the flash
    const T = keyed(Fc, [[0, 's'], [K.aodOn[0] + 6 + o, 'peek'], [K.glide[1] + 10 + o * 2, 's'], [K.zap - 6, 'sq'], [K.zap + 10 + o, 's']]);
    zzz = T.v === 's';
    if (T.v === 'peek') { eyes = 'half'; look = [0, 0.4]; }
    if (T.v === 'sq') { eyes = 'squeeze'; mouth = 'o'; sq = 0.08; }
  }
  return { eyes, mouth, sq: sq + (eyes === 'sleep' ? breath : breath * 0.4), dy, look, blush, emote, zzz, st, amber };
}
function cheer(a, Fc) {   // out-of-phase hops during the payoff (no twinning)
  const w0 = K.flagUp + 2 + (a.i % 5) * 3, w1 = K.wipe[0] - 4;
  if (Fc < w0 || Fc >= w1) return 0;
  const per = 14 + (a.i % 3) * 2, ph = ((Fc - w0) % per) / per;
  return 0.14 * Math.sin(Math.PI * ph);
}
export function atomXZ(a, F) { return a.kind === 'mover' ? P.moverXZ(a, convoyP(F)) : P.homeXZ(a); }

// ---------------------------------------------------------------------------------------------------------------
// Pip (placement compass): dozes at the back-left; wakes; draws a circle of radius r round each partner (needle on
// the partner, pencil at r); hops back to its spot and watches; cheers at the payoff.
export const PIP_REST = [-2.75, -3.2];
export function pipState(F) {
  const Fc = twos(F);
  const Fw = F >= CUT ? Fc - NF : Fc;
  let hip, N, Pn, liftN = 0, liftP = 0, lean = 0, yaw = 0.2, sq = 0, eyes = 'dot', mouth = null, emote = null, look = [0, 0];
  const L = 1.15;
  const stand = (cx, cz, spread, h = 1.0, ang = 0) => {
    const dx = Math.cos(ang) * spread / 2, dz = Math.sin(ang) * spread / 2;
    return { hip: [cx, h, cz], N: [cx - dx, cz - dz], Pn: [cx + dx, cz + dz] };
  };
  if (Fw < K.arcs[0][0] - 10) {
    const s = stand(PIP_REST[0], PIP_REST[1], 0.6); hip = s.hip; N = s.N; Pn = s.Pn;
    if (Fw < K.pipIn[0]) { eyes = 'sleep'; sq = 0.03 * Math.sin(TAU * Fw / 48); }
    else if (Fw < K.pipTake) { const a = Fw - K.pipIn[0]; eyes = a < 10 ? 'half' : 'dot'; mouth = a < 10 ? 'yawn' : null; sq = -0.12 * Math.sin(Math.PI * clamp(a / 12)); look = [0.9 * Math.sin(a * 0.3), 0]; hip = [hip[0], hip[1] + 0.12 * Math.sin(Math.PI * clamp(a / 12)), hip[2]]; }
    else { eyes = 'wide'; mouth = 'o'; sq = takeSq(Fw - K.pipTake); look = [0.6, -0.2]; emote = { type: 'bang', age: Fw - K.pipTake, sc: 2.2 }; }
  } else if (Fw < K.arcs[5][1] + 4) {
    let k = 0; for (let i = 0; i < 6; i++) if (Fw >= K.arcs[i][0] - 10) k = i;
    const [a0, a1] = K.arcs[k];
    const pc = P.PARTNERS[k], cx = P.PCOL[pc.c], cz = P.PROW[pc.r];
    const prev = k === 0 ? PIP_REST : [P.PCOL[P.PARTNERS[k - 1].c], P.PROW[P.PARTNERS[k - 1].r]];
    const hopT = clamp((Fw - (a0 - 10)) / 10);
    if (hopT < 1) {
      const x = lerp(prev[0], cx, io(hopT)), z = lerp(prev[1], cz, io(hopT)), h = 1.02 + (k === 0 ? 1.0 : 0.55) * Math.sin(Math.PI * hopT);
      const s = stand(x, z, 0.3, h, 0.3); hip = s.hip; N = s.N; Pn = s.Pn; liftN = liftP = h - 1.02; eyes = 'happy'; sq = -0.08 * Math.sin(Math.PI * hopT);
    } else {
      const u = clamp((Fw - a0) / (a1 - a0));
      const ang = Math.PI + TAU * io(u);
      const r = P.RINT;
      N = [cx, cz]; Pn = [cx + Math.cos(ang) * r, cz + Math.sin(ang) * r];
      hip = [cx + Math.cos(ang) * r * 0.5, Math.sqrt(Math.max(0.2, L * L - (r * 0.5) ** 2)) - 0.02, cz + Math.sin(ang) * r * 0.5];
      eyes = u < 0.95 ? 'slit' : 'happy'; mouth = u < 0.95 ? null : 'smile'; lean = 0.05 * Math.sin(u * TAU);
      look = [Math.cos(ang) * 0.5, 0.6]; yaw = -ang * 0.5;
      if (u >= 1) sq = ringv(Fw - a1, 0.12, 1.0, 0.25);
    }
  } else {
    const a = Fw - (K.arcs[5][1] + 4);
    const last = [P.PCOL[P.PARTNERS[5].c], P.PROW[P.PARTNERS[5].r]];
    const t = clamp(a / 16);
    const x = lerp(last[0], PIP_REST[0], io(t)), z = lerp(last[1], PIP_REST[1], io(t)), h = 1.02 + 0.9 * Math.sin(Math.PI * t);
    const s = stand(x, z, lerp(0.3, 0.6, t), h); hip = s.hip; N = s.N; Pn = s.Pn; liftN = liftP = h - 1.02;
    eyes = 'dot'; look = [0.6, 0.1];
    if (F >= K.whistle && F < K.whistle + 16) eyes = 'wide';
    if (F >= K.zap - 6 && F < K.zap + 6) { eyes = 'squeeze'; mouth = 'o'; sq = 0.1; }
    if (F >= K.flagUp && F < CUT) { eyes = 'happy'; mouth = 'grin'; const c = ((F - K.flagUp) % 16) / 16; hip = [hip[0], hip[1] + 0.12 * Math.sin(Math.PI * c), hip[2]]; }
  }
  return { hip, N, Pn, liftN, liftP, lean, yaw, sq, face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// Rook (routing loco) on its side track, facing +z; the AOD rows run from its coupling across the plate.
export function rookState(F) {
  const Fc = twos(F);
  const p = convoyP(F);
  const zFront = lerp(P.SROW[2], P.PROW[1], p);
  let dy = 0, tilt = 0, sq = 0, eyes = 'sleep', mouth = null, emote = null, look = [0, 0];
  const T = keyed(Fc, [[0, 's'], [K.whip1[0], 'wake'], [K.toot, 'toot'], [K.plan1[0], 'draw'], [K.whistle, 'oops'], [K.erase[0], 'fix'], [K.ok, 'proud'], [K.matchT + 6, 'idle'], [K.aodOn[0], 'ready'], [K.toot2, 'toot'], [K.glide[0], 'go'], [K.dock, 'stop'], [K.zap - 6, 'sq'], [K.zap + 8, 'happy'], [CUT, 's']]);
  switch (T.v) {
    case 's': eyes = 'sleep'; break;
    case 'wake': eyes = T.age < 4 ? 'squeeze' : 'dot'; sq = takeSq(T.age - 4); break;
    case 'toot': eyes = 'happy'; mouth = 'o'; sq = T.age < 3 ? 0.16 * sm(T.age / 3) : ringv(T.age - 3, -0.2, 0.9, 0.18); break;
    case 'draw': eyes = 'slit'; look = [0.7, 0.4]; break;
    case 'oops': eyes = T.age < 3 ? 'squeeze' : 'wide'; mouth = 'wobble'; sq = takeSq(T.age - 3); if (T.age < 18) emote = { type: 'sweat', age: T.age }; tilt = 0.06 * Math.sin(T.age * 0.8) * Math.exp(-T.age / 10); break;
    case 'fix': eyes = 'slit'; mouth = 'teeth'; look = [0.7, 0.4]; break;
    case 'proud': eyes = 'happy'; mouth = 'smile'; sq = ringv(T.age, 0.12, 0.9, 0.2); break;
    case 'idle': eyes = 'dot'; look = [0.8, 0]; break;
    case 'ready': eyes = 'slit'; mouth = 'grin'; sq = 0.1 * sm(T.age / 10); break;
    case 'go': eyes = 'happy'; mouth = 'grin'; tilt = -0.05 * convoyV(F); dy = 0.02 * Math.abs(Math.sin(Fc * 0.9)); break;
    case 'stop': eyes = 'wide'; mouth = 'o'; tilt = bumpv(T.age, 0.12, 0.8, 0.16); sq = ringv(T.age, 0.14, 0.9, 0.2); if (T.age > 8) { eyes = 'happy'; mouth = 'smile'; } break;
    case 'sq': eyes = 'squeeze'; mouth = 'o'; sq = 0.08; break;
    case 'happy': eyes = 'happy'; mouth = 'grin'; break;
    default: break;
  }
  if (F >= K.wait[0] && F < K.lap) { eyes = 'dot'; look = [0.8, 0.1]; mouth = null; }
  if (F >= K.flagUp && F < CUT) { eyes = 'happy'; mouth = 'grin'; dy = 0.06 * Math.abs(Math.sin((F - K.flagUp) * 0.4)); }
  return { x: P.TRACK_X, z: zFront - 0.05, yaw: -Math.PI / 2, dy, tilt, sq, dist: zFront - P.SROW[2], face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// Loupe (verifier): hops over to watch the dry run, blows the whistle at the exact step the two routes collide and
// throws its penalty flag onto that spot; beams at the in-order re-run; then watches from the right.
export const LOUPE_HOME = [2.35, -3.05];   // inside the card band, clear of the LIVE pill
export const LOUPE_WATCH = [2.3, -1.0];
export const LOUPE_RACE = [3.25, 1.15];   // behind Slo's lane, between the pairs and Tick   // beside Slo's lane for the race and the payoff
export const INSPECT = [2.6, CROSS_AT[1] - 0.1];   // level with the crossing, right of the whole block (never in front of it)
export function loupeState(F) {
  const Fc = twos(F);
  let x = LOUPE_HOME[0], z = LOUPE_HOME[1], y = 0, yaw = -0.6, lean = 0, pitch = 0, sq = 0, armL = 0.25, armR = 0.25, headTilt = 0;
  let eyes = 'dot', mouth = null, emote = null, look = [0, 0];
  const insp = INSPECT;
  if (Fc < K.loupeIn[0] || Fc >= CUT) { eyes = Fc < K.whip1[0] || Fc >= CUT ? 'sleep' : 'dot'; }
  else if (Fc < K.loupeIn[1]) {
    const u = (Fc - K.loupeIn[0]) / (K.loupeIn[1] - K.loupeIn[0]);
    const h = u < 0.5 ? 0 : 1, uu = (u - h * 0.5) / 0.5;
    const mid = [lerp(LOUPE_HOME[0], insp[0], 0.5), lerp(LOUPE_HOME[1], insp[1], 0.5)];
    const a = h ? mid : LOUPE_HOME, b = h ? insp : mid;
    x = lerp(a[0], b[0], io(uu)); z = lerp(a[1], b[1], io(uu)); y = 0.45 * Math.sin(Math.PI * uu); sq = -0.1 * Math.sin(Math.PI * uu); yaw = -0.5;
  } else if (Fc < K.ok + 14) {
    x = insp[0]; z = insp[1]; yaw = lerp(-0.5, -0.35, sm((Fc - K.loupeIn[1]) / 6));   // lens (face) to camera, eyes on the crossing
    pitch = -0.15; headTilt = -0.35; eyes = 'wide'; look = [-0.8, 0.5];   // lens tipped back to face the high camera
    if (Fc >= K.whistle - 4) {
      const w = Fc - K.whistle;
      armR = w < 0 ? lerp(0.25, 2.5, sm((w + 4) / 4)) : w < 10 ? 2.5 : lerp(2.5, 0.4, sm((w - 10) / 6));
      eyes = w < 0 ? 'dot' : w < 10 ? 'squeeze' : 'slit'; mouth = w >= 0 && w < 10 ? 'o' : null;
      sq = w >= 0 && w < 10 ? 0.08 + 0.04 * Math.sin(w * 2.2) : 0; pitch = lerp(-0.15, -0.3, sm((w + 4) / 4));
      if (w >= 0) armL = w < 2 ? lerp(0.25, 2.6, w / 2) : lerp(2.6, 1.3, sm((w - 2) / 5));   // the throw
    }
    if (Fc >= K.erase[0]) { armL = lerp(1.3, 0.25, sm((Fc - K.erase[0]) / 5)); armR = 0.25; pitch = -0.15; eyes = 'slit'; mouth = 'flat'; look = [-0.8, 0.5]; }
    if (Fc >= K.steps2[0]) { eyes = 'dot'; mouth = null; look = [-0.6, 0.3]; }
    if (Fc >= K.ok - 2) { const a = Fc - K.ok; eyes = 'happy'; mouth = 'grin'; look = [0, 0]; armR = lerp(0.25, 2.4, sm(a / 4)); sq = ringv(Math.max(0, a), 0.1, 0.9, 0.2); pitch = -0.15 - 0.15 * Math.sin(Math.max(0, a) * 0.8) * Math.exp(-Math.max(0, a) / 8); if (a >= 0 && a < 14) emote = { type: 'sparkle', age: a }; }
  } else if (Fc < K.aodOn[0]) {
    const u = clamp((Fc - K.ok - 14) / 16);
    x = lerp(insp[0], LOUPE_WATCH[0], io(u)); z = lerp(insp[1], LOUPE_WATCH[1], io(u)); y = 0.35 * Math.abs(Math.sin(Math.PI * u * 2)); yaw = lerp(-0.35, -0.8, io(u)); eyes = 'dot';
  } else {
    x = LOUPE_WATCH[0]; z = LOUPE_WATCH[1]; yaw = -0.8; eyes = 'dot'; look = [-0.5, 0.2];
    if (F >= K.zap - 6 && F < K.zap + 6) { eyes = 'squeeze'; sq = 0.08; }
    if (F >= K.wait[0] - 6 && F < CUT) {   // hop over beside Slo's lane, watch it go back and forth like tennis
      const u = clamp((Fc - K.wait[0] + 6) / 14), hop = Math.sin(Math.PI * clamp(u * 2 % 1)) * (u < 1 ? 1 : 0);
      x = lerp(LOUPE_WATCH[0], LOUPE_RACE[0], io(u)); z = lerp(LOUPE_WATCH[1], LOUPE_RACE[1], io(u)); y = 0.35 * hop; yaw = lerp(-0.8, 0.3, io(u));
      const sx = sloTrip(F).x; look = [clamp((sx - x) * 0.35, -0.9, 0.9), 0.3];
      if (F >= K.lap - 2) look = [0.8, 0.1];
    }
    if (F >= K.flagUp && F < CUT) { eyes = 'happy'; mouth = 'grin'; armR = 2.2 + 0.3 * Math.sin((F - K.flagUp) * 0.5); armL = 2.0 + 0.3 * Math.sin((F - K.flagUp) * 0.5 + 1.5); y = 0.1 * Math.abs(Math.sin((F - K.flagUp) * 0.35)); look = [0.3, 0]; }
  }
  return { x, z, y, yaw, lean, pitch, sq, armL, armR, headTilt, face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// Tick (optimise stopwatch) on its stool off the plate's front-right corner. Its dial is the simulator's time readout
// (a full lap = PowerMove's run), the gauge the fidelity readout. It keeps a change only if one improves and the
// other is not hurt. At GO both hands start from 12; its own stops when the convoy docks; PowerMove's ghost runs on.
export const TICK = { x: 5.75, z: 2.75 };
export const GAUGE = { x: 7.0, z: 2.3, yaw: 0.45 };
export function tickState(F) {
  const Fc = twos(F);
  let y = 0, sq = 0, rock = 0.05 * Math.sin(TAU * Fc / 26), yaw = 0.45, armL = 0.35, armR = 0.35, crown = 0, bow = 0;
  let eyes = 'dot', mouth = null, emote = null, look = [0, 0];
  let lap = LAP_RAW, fid = 1.12, ghost = null, verdict = null;
  if (F < K.tickWake || F >= CUT) { eyes = 'sleep'; sq = 0.03 * Math.sin(TAU * F / 50); rock = 0; lap = 0; }
  else if (F < K.tries[0][0] - 2) {
    const a = Fc - K.tickWake; eyes = a < 4 ? 'squeeze' : 'dot'; sq = takeSq(a - 4); yaw = 0.3; armL = lerp(0.35, 1.25, sm((Fc - K.tickWake - 2) / 6));
    ghost = Math.max(0.0001, sg(F, K.tickWake + 2, K.tickWake + 12) * 0.9999); lap = LAP_RAW * sg(F, K.tickWake + 6, K.tickWake + 14);
  }
  // simulator tries (compile time): Tick faces us, holds the slate up with its left arm, twists the crown with its right
  if (F >= K.tries[0][0] - 2 && F < K.click - 6) {
    ghost = 0.9999; yaw = 0.3; armL = 1.25 + 0.04 * Math.sin(Fc * 0.3);
    const lapSteps = [LAP_RAW, LAP_FINAL], fidSteps = [1.12, FID_FINAL];
    let acc = 0, lapNow = LAP_RAW, fidNow = 1.12;
    for (const [a, b, ok] of K.tries) {
      if (F < a - 2) break;
      const v0 = tryVerdictAt(a, ok);
      const u = sg(F, a + 5, v0), back = ok ? 0 : sg(F, b - 6, b);
      const tl = ok ? lapSteps[acc + 1] : lapSteps[acc] - 0.1, tf = ok ? fidSteps[acc + 1] : fidSteps[acc] - 0.45;
      lapNow = lerp(lapSteps[acc], tl, u * (1 - back)); fidNow = lerp(fidSteps[acc], tf, u * (1 - back));
      const vEnd = ok ? K.click - 6 : b;
      verdict = F >= v0 && F < vEnd ? { ok, age: F - v0, left: vEnd - F } : null;   // the kept stamp holds ~20 f, to GO
      if (F < b) {
        armR = F < a + 6 ? lerp(0.35, 2.7, sm((Fc - a + 2) / 4)) : lerp(2.7, 0.5, sm((Fc - a - 6) / 4));
        crown = F >= a && F < a + 6 ? 0.5 + 0.5 * Math.sin((Fc - a) * 1.4) : 0; eyes = 'slit'; look = [-0.7, 0.1];
      }
      if (!ok && F >= a + 9 && F < a + 18) { const d = Fc - a - 9; y = -0.28 * Math.sin(Math.PI * clamp(d / 9)); sq = 0.26 * Math.sin(Math.PI * clamp(d / 9)); eyes = 'squeeze'; mouth = 'o'; }   // ducks the flung ghost
      if (verdict && !ok && F >= a + 21) { eyes = 'worried'; mouth = 'wobble'; rock = 0.08 * Math.sin(verdict.age * 1.4) * Math.exp(-verdict.age / 12); }
      if (verdict && ok) { eyes = 'happy'; mouth = 'grin'; sq = ringv(verdict.age, 0.12, 0.9, 0.2); }
      if (verdict && verdict.age < 3) sq += 0.1 * (1 - verdict.age / 3);   // the stamp's contact squash
      if (F >= v0 - 5 && F < v0) { armL = lerp(1.25, 1.7, sm((F - v0 + 5) / 4)); sq -= 0.06; }   // anticipation: the slate goes up before it slams
      if (ok && F >= b) { acc++; lapNow = lapSteps[acc]; fidNow = fidSteps[acc]; }
    }
    lap = lapNow; fid = fidNow;
  }
  // GO: arm up to the crown, CLICK: both hands spin back to 12, then run with the real run
  if (F >= K.click - 6 && F < CUT) {
    fid = FID_FINAL;
    if (F < K.glide[0]) {
      const k = sm((F - K.click + 6) / 5); lap = lerp(LAP_FINAL, 0, k); ghost = lerp(0.9999, 0.0001, k);
      armR = lerp(0.35, 2.6, sm((Fc - K.click + 6) / 5)); crown = F >= K.click && F < K.click + 4 ? 1 : 0; eyes = F >= K.click ? 'squeeze' : 'slit'; mouth = 'grin'; yaw = 0.6;
      sq = F >= K.click ? ringv(Fc - K.click, -0.14, 0.9, 0.2) : 0.08;
    } else {
      const t = F - K.glide[0];
      lap = Math.min(t, TQ) / TP; ghost = Math.max(0.0001, Math.min(t, TP) / TP * 0.9999);
      armR = 0.35; eyes = 'dot'; look = [0, 0];
    }
  }
  // the pulse: slap the crown
  if (F >= K.pulseClick - 8 && F < K.zap + 16) {
    const a = Fc - K.pulseClick;
    if (a < 0) { armR = lerp(0.35, 2.7, sm((a + 8) / 5)); sq = 0.12 * sm((a + 8) / 6); eyes = 'slit'; mouth = 'grin'; }
    else { crown = Math.max(0, 1 - a / 4); armR = lerp(2.7, 0.5, sm((a - 3) / 6)); sq = ringv(a, -0.16, 0.9, 0.2); y = bumpv(a, 0.1, 0.5, 0.14); eyes = a < 8 ? 'squeeze' : 'happy'; mouth = a < 8 ? 'o' : 'grin'; }
    yaw = 0.3;
  }
  // the wait: its own hand stopped at 1/4.7; PowerMove's ghost runs on; Tick taps its foot, watches Slo, yawns
  if (F >= K.wait[0] && F < K.lap) {
    const a = Fc - K.wait[0], sx = sloTrip(F).x;
    eyes = a > 34 && a < 60 ? 'half' : 'dot'; mouth = a > 36 && a < 56 ? 'yawn' : null;
    if (a > 36 && a < 58) { sq = -0.1 * Math.sin(Math.PI * clamp((a - 36) / 20)); emote = { type: 'zzz', age: a - 36 }; }   // a big bored yawn
    look = [lerp(-1.0, -0.5, (sx - SLO.xA) / (SLO.xB - SLO.xA)), 0.3]; yaw = 0.45;
    y = 0.03 * Math.abs(Math.sin(a * 0.7));
    armL = 0.9 + 0.1 * Math.sin(a * 0.3);
  }
  // the lap closes: CLICK - the pennant pops out of the crown; arms up, star eyes
  if (F >= K.lap && F < CUT) {
    const a = Fc - K.lap;
    crown = a < 3 ? 1 : 0;
    eyes = a < 3 ? 'squeeze' : 'star'; mouth = 'grin';
    if (a < 4) rock = 0.1 * (a % 2 ? -1 : 1);   // the dial jolts on the CLICK
    armR = lerp(0.35, 2.8, ob(a / 6)); armL = lerp(0.9, 2.6, sm((a - 2) / 5)) + 0.15 * Math.sin(a * 0.5);   // both arms up: a cheer
    sq = a < 3 ? 0.14 * sm(a / 3) : ringv(a - 3, -0.2, 0.8, 0.16); y = a >= 3 ? 0.22 * Math.sin(Math.PI * clamp((a - 3) / 10)) : 0;
    yaw = 0.4; rock = 0.04 * Math.sin(a * 0.35);
  }
  return { x: TICK.x, z: TICK.z, y, yaw, sq, rock, armL, armR, crown, bow, hand: lap, ghost, fid, verdict, face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// camera: orbit rigs per shot, blended; whips get smear from the measured screen motion (q_story)
export const WHIPS = [K.whip1, K.whipG, K.whip2, K.whip3];
const R_A = (F) => {   // establishing: slow crane down towards the sleeping lattice, pushing in on Pip for its wake-up take
  const k = sm((F + 22) / 100), pk = sm((F - 10) / 30) * (1 - sm((F - 50) / 10));
  const base = { tg: [lerp(-0.4, -1.2, k), lerp(0.3, 0.5, k), lerp(-0.9, -1.6, k)], az: lerp(0.38, 0.2, k), el: lerp(0.68, 0.6, k), r: lerp(12.2, 9.4, k), fov: 30, roll: lerp(0, -0.03, k) };   // high enough that the storage grid never stacks
  const pip = { tg: [PIP_REST[0] + 0.9, 1.75, PIP_REST[1] + 0.8], az: 0.3, el: 0.5, r: 7.0, fov: 30, roll: -0.03 };   // the '!' stays below card row ~200
  return mixRig(base, pip, 0.75 * pk);
};
const R_B = (F) => {   // placement: follow Pip across the partners, then rise to see all six circles
  const k = sm((F - 54) / 90);
  const up = sm((F - K.rise[0]) / (K.rise[1] - K.rise[0]));
  return { tg: [lerp(-1.2, 1.2, k), lerp(0.8, 0.3, up), lerp(0.9, 1.0, k)], az: lerp(-0.2, 0.1, k), el: lerp(0.78, 0.85, up), r: lerp(7.6, 8.2, up), fov: 30, roll: lerp(0.04, 0, up) };
};
const R_C = (F) => {   // plan + dry run from high front-right; crash zoom onto the collision and the flag
  const cz = sm((F - K.steps1[1] + 2) / 6) * (1 - 0.45 * sm((F - K.erase[1] - 2) / 10));   // stays in through the fix, eases half out for the re-run
  const base = { tg: [0.05, 0.3, -1.15], az: 0.42, el: 0.68, r: 8.6, fov: 32, roll: 0.0 };   // Loupe (right) clear of the LIVE pill
  const zoom = { tg: [CROSS_AT[0] + 1.05, 0.95, CROSS_AT[1] + 0.1], az: 0.12, el: 0.58, r: 5.8, fov: 32, roll: -0.06 };
  return mixRig(base, zoom, cz);
};
// the match cut: Loupe's lens and Tick's dial fill the same circle on screen (lens radius 0.46, dial ring ~0.63)
const LENS = { tg: [INSPECT[0] + 0.06, 1.17, INSPECT[1] - 0.16], az: -0.35, el: 0.5, r: 1.55, fov: 30, roll: 0 };
const DIAL = { tg: [TICK.x, 1.08, TICK.z], az: 0.3, el: 0.04, r: 2.45, fov: 30, roll: 0 };
const R_F = (F) => {   // optimise: slate | Tick | gauge side by side in the card band, a slow push over the two tries;
  // then (GO) it eases back left so Slo at the start of its lane shares the frame with Tick's dial for the CLICK
  const k = sm((F - K.matchT - 16) / 56), g = sm((F - K.click + 16) / 13);
  const a = { tg: [lerp(5.3, 5.45, k), 1.15, 2.6], az: lerp(0.34, 0.28, k), el: 0.2, r: lerp(9.2, 8.3, k), fov: 30, roll: lerp(0.02, -0.01, k) };
  const b = { tg: [3.3, 0.95, 2.75], az: 0.22, el: 0.36, r: 10.0, fov: 30, roll: 0 };   // high enough that Slo's lane separates from the zone
  return mixRig(a, b, g);
};
const R_D = (F) => {   // the real run: high 3/4 from the front-right, Rook whole on the left towing the rows; the pairs separate
  const p = convoyP(F), k = sm((F - K.whipG[1]) / 16);
  return { tg: [lerp(-1.1, -0.5, p), 0.35, lerp(-0.6, 0.7, p)], az: lerp(0.4, 0.43, p), el: lerp(0.6, 0.52, p), r: lerp(9.6, 10.2, p) + 0.4 * (1 - k), fov: 30, roll: lerp(0.02, -0.02, p) };
};
const R_E = (F) => {   // Tick winds up (low hero), then after the flash: high 3/4 over the whole zone with a push
  if (F < K.zap) return { tg: [TICK.x - 0.4, 1.1, TICK.z - 0.2], az: 0.25, el: 0.12, r: lerp(4.9, 4.4, sm((F - K.whip2[1]) / 12)), fov: 30, roll: -0.04 };
  const push = sm((F - K.zap) / 30);
  return { tg: [0.4, 0.3, 0.8], az: lerp(0.42, 0.3, push), el: lerp(0.74, 0.64, push), r: lerp(9.4, 7.9, push), fov: 30, roll: lerp(0.03, -0.03, push) };
};
const R_G = (F) => {   // the race: Slo's lane across the front, Tick's dial right, the pairs behind; then the payoff band
  const o = io((F - K.wait[0]) / 60), pop = sm((F - K.lap + 24) / 16);   // settle into the payoff band BEFORE the lap closes
  const wide = { tg: [lerp(3.7, 4.0, o), 0.85, lerp(2.0, 2.15, o)], az: lerp(0.18, 0.24, o), el: lerp(0.45, 0.4, o), r: lerp(9.6, 9.1, o), fov: 30, roll: lerp(-0.02, 0.01, o) };
  const hero = { tg: [6.15, 1.5, 2.7], az: 0.28, el: 0.18, r: lerp(7.2, 6.6, sm((F - K.flagUp) / 70)), fov: 30, roll: 0.0 };   // flag | dial | gauge fill the band   // flag | dial | gauge + tag, inside rows ~250-760
  return mixRig(wide, hero, pop);
};
export function camRig(F) {
  if (F >= CUT) return R_A(F - NF);
  if (F < 54) return R_A(F);
  if (F < 64) return mixRig(R_A(F), R_B(F), io((F - 54) / 10));
  if (F < K.whip1[0]) return R_B(F);
  if (F < K.whip1[1]) return mixRig(R_B(F), R_C(F), q5((F - K.whip1[0]) / (K.whip1[1] - K.whip1[0])));
  if (F < K.ok - 2) return R_C(F);
  if (F < K.matchT) return mixRig(R_C(F), LENS, io(clamp((F - K.ok + 2) / 6)));   // push into the beaming lens (holds 2 frames)
  if (F < K.matchT + 16) return mixRig(DIAL, R_F(F), io((F - K.matchT) / 16));                     // cut on the circle: Tick's dial, pull back
  if (F < K.whipG[0]) return R_F(F);
  if (F < K.whipG[1]) return mixRig(R_F(F), R_D(F), q5((F - K.whipG[0]) / (K.whipG[1] - K.whipG[0])));
  if (F < K.whip2[0]) return R_D(F);
  if (F < K.whip2[1]) return mixRig(R_D(F), R_E(F), q5((F - K.whip2[0]) / (K.whip2[1] - K.whip2[0])));
  if (F < K.whip3[0]) return R_E(F);
  if (F < K.whip3[1]) return mixRig(R_E(F), R_G(F), q5((F - K.whip3[0]) / (K.whip3[1] - K.whip3[0])));
  return R_G(F);
}
export function camShake(F) {
  return shakeAt(F, [[K.pipTake, 0.006, 3], [K.steps1[1], 0.01, 4], [K.whistle, 0.012, 4], [K.flag[1], 0.01, 3], [K.tries[0][0] + 16, 0.035, 4], [K.dock, 0.008, 4], [K.zap, 0.022, 6], [K.lap, 0.012, 3], [K.flagUp + 1, 0.014, 4], [K.tagUp + 1, 0.009, 3]]);
}
