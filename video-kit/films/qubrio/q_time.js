// q_time.js - the timeline: key frames, camera rigs and every character's state as a pure function of the frame.
// 624 frames = 26 s at 24 fps. See STORYBOARD.md for the shot list.
import * as P from './q_phys.js';
import { TAU, clamp, lerp, mj, mjv, sm, io, ob, oc, ic, q5, sg, win, twos, ringv, bumpv, takeSq, keyed, kfs, hsh, hs2, mixRig, shakeAt } from './q_util.js';

export const NF = 624, FPS = 24;

export const K = {
  // S1 wake (0-60) + tail of S8 (596-624): calm lab, then Pip boings onto the plate
  pipIn: [14, 34], pipTake: 40,
  // S2 placement (60-156): Pip draws a circle of radius r round each partner; the mover's dock sits on it
  arcs: [[62, 80], [84, 100], [104, 118], [122, 132], [134, 144], [146, 156]],
  rise: [140, 162],
  // S3 routing plan + verifier (156-252)
  whip1: [154, 166], toot: 170,
  plan1: [176, 196], loupeIn: [186, 204], look: 204, whistle: 214, erase: [230, 240], plan2: [240, 254], ok: 256,
  // S4 convoy (252-348)
  aodOn: [258, 272], crouch: [270, 276], glide: [276, 336], dock: 336,
  // S5 global pulse (348-408)
  whip2: [344, 354], click: 364, zap: 370,
  // S6 optimize (408-480): try, reject, try, accept, accept
  tries: [[416, 434, false], [438, 454, true], [458, 472, true]],
  // S7 payoff (480-588)
  race: [486, 556], flag: 502, therm: 516, sloArrive: 556,
  tickHop: [330, 346],
  wipe: [584, 604],   // brush wipe: covered 590-598, the cut (reset) at 594
};
export const CUT = 594;
// schedule clock: fraction of a PowerMove lap on Tick's dial. Before optimisation Qubrio's run is 1.7x longer than
// after (site: "without optimization (K=0), schedules are 1.7x longer"): 1.7 / 4.7 = 0.362 -> 1 / 4.7 = 0.213.
export const LAP_FINAL = 1 / 4.7, LAP_RAW = 1.7 / 4.7;
export const FID_PM = 1.0, FID_FINAL = 1.3;

// ---------------------------------------------------------------------------------------------------------------
// convoy progress (0 in storage, 1 docked); the loop resets under the wipe cut
export function convoyP(F) {
  if (F >= CUT) return 0;
  return mj((F - K.glide[0]) / (K.glide[1] - K.glide[0]));
}
export const convoyV = (F) => (F >= K.glide[0] && F < K.glide[1] ? mjv((F - K.glide[0]) / (K.glide[1] - K.glide[0])) / 1.875 : 0);
export const aodK = (F) => (F >= CUT ? 0 : sg(F, K.aodOn[0], K.aodOn[1]) * (1 - sg(F, K.dock + 10, K.dock + 22)));

// PowerMove baseline race: Slo starts with the convoy and needs 4.7x as long for the same job.
export const SLO = { x: 3.95, z0: -3.3, z1: 2.3 };
export const SLO_DUR = Math.round((K.glide[1] - K.glide[0]) * 4.7);   // 282 frames
export function sloZ(F) {
  if (F >= CUT || F < K.glide[0]) return SLO.z0;
  return lerp(SLO.z0, SLO.z1, clamp((F - K.glide[0]) / SLO_DUR));
}

// ---------------------------------------------------------------------------------------------------------------
// atoms: acting (faces + squash) on twos; centres only move by the AOD
export function atomState(a, F) {
  const Fc = twos(F), o = Math.floor(hsh(a.i, 7.7) * 4), ph = hsh(a.i, 3.3);
  let eyes = 'sleep', mouth = null, sq = 0, dy = 0, look = [0, 0], blush = 0, emote = null, zzz = true, st = 0;
  const breath = 0.03 * Math.sin(TAU * (F / 48 + ph));
  const pz = F >= K.zap - 6 && F < K.zap + 6;   // everyone flinches at the flash
  if (a.kind === 'partner') {
    const arc = K.arcs[a.k === undefined ? 0 : [0, 1, 2, 3, 4, 5][a.k]];
    const closed = arc[1];
    const T = keyed(Fc, [[0, 's'], [closed - 2, 'take'], [closed + 12, 'wait'], [K.glide[1] - 8, 'see'], [K.dock + 2, 'love'], [K.zap - 6, 'sq'], [K.zap + 4, 'star'], [K.zap + 40, 'love'], [CUT, 's']]);
    zzz = T.v === 's';
    if (T.v === 'take') { eyes = T.age < 3 ? 'squeeze' : 'wide'; mouth = 'o'; sq = takeSq(T.age - 3); emote = { type: 'ping', age: T.age, col: '#ffb020' }; }
    if (T.v === 'wait') { eyes = 'dot'; look = [-0.8, 0]; }
    if (T.v === 'see') { eyes = 'wide'; look = [-0.9, 0.1]; }
    if (T.v === 'love' || T.v === 'star') { eyes = T.v === 'star' ? 'star' : 'happy'; mouth = 'smile'; blush = 1; look = [-0.6, 0]; if (T.v === 'love' && T.age < 14 && Fc < K.zap) sq = ringv(T.age, 0.16, 0.9, 0.2); }
    if (T.v === 'sq') { eyes = 'squeeze'; mouth = 'flat'; sq = 0.1; }
    if (T.v === 's') { eyes = 'sleep'; }
    if (F >= K.tries[0][0] && F < CUT && (T.v === 'love' || T.v === 'star')) dy = cheer(a, Fc);
  } else if (a.kind === 'mover') {
    const T = keyed(Fc, [[0, 's'], [K.aodOn[0] + o, 'wake'], [K.crouch[0], 'crouch'], [K.glide[0], 'whee'], [K.dock - 2, 'land'], [K.dock + 6, 'love'], [K.zap - 6, 'sq'], [K.zap + 4, 'star'], [K.zap + 40, 'love'], [CUT, 's']]);
    zzz = T.v === 's';
    if (T.v === 'wake') { eyes = T.age < 3 ? 'squeeze' : 'wide'; mouth = 'o'; sq = takeSq(T.age - 3); if (a.pr === 1) emote = { type: 'bang', age: T.age }; }
    if (T.v === 'crouch') { eyes = 'squeeze'; mouth = 'teeth'; sq = 0.14 * sm(T.age / 3); }
    if (T.v === 'whee') { eyes = 'happy'; mouth = 'grin'; st = 0.18 * convoyV(F); }
    if (T.v === 'land') { eyes = 'wide'; mouth = 'o'; sq = ringv(T.age, 0.2, 0.9, 0.18); }
    if (T.v === 'love' || T.v === 'star') { eyes = T.v === 'star' ? 'star' : 'happy'; mouth = 'smile'; blush = 1; look = [0.6, 0]; if (T.v === 'love' && T.age < 14 && Fc < K.zap) sq = ringv(T.age + 3, 0.16, 0.9, 0.2); }
    if (T.v === 'sq') { eyes = 'squeeze'; mouth = 'flat'; sq = 0.1; }
    if (F >= K.tries[0][0] && F < CUT && (T.v === 'love' || T.v === 'star')) dy = cheer(a, Fc);
  } else {   // storage atoms that stay: they doze, flinch at the flash
    const T = keyed(Fc, [[0, 's'], [K.aodOn[0] + 6 + o, 'peek'], [K.glide[1] + 10 + o * 2, 's'], [K.zap - 6, 'sq'], [K.zap + 10 + o, 's']]);
    zzz = T.v === 's';
    if (T.v === 'peek') { eyes = 'half'; look = [0, 0.4]; }
    if (T.v === 'sq') { eyes = 'squeeze'; mouth = 'o'; sq = 0.08; }
  }
  if (pz && !(a.kind === 'store')) { /* handled by 'sq' */ }
  return { eyes, mouth, sq: sq + (eyes === 'sleep' ? breath : breath * 0.4), dy, look, blush, emote, zzz, st };
}
function cheer(a, Fc) {   // out-of-phase hops during the payoff (no twinning)
  const w0 = K.flag + 4 + (a.i % 5) * 3, w1 = K.wipe[0] - 4;
  if (Fc < w0 || Fc >= w1) return 0;
  const per = 14 + (a.i % 3) * 2, ph = ((Fc - w0) % per) / per;
  return 0.14 * Math.sin(Math.PI * ph);
}
export function atomXZ(a, F) {
  if (a.kind === 'mover') return P.moverXZ(a, convoyP(F));
  return P.homeXZ(a);
}

// ---------------------------------------------------------------------------------------------------------------
// Pip (placement compass). Off-plate left at the loop start; boings in; measures circles of radius r round each
// partner (needle on the partner's site, pencil swings a full turn at r); walks off to the left edge to watch.
export const PIP_REST = [-2.4, -4.1];   // where it dozes / watches from (front-left of the plate)
export function pipState(F) {
  const Fc = twos(F);
  const Fw = F >= CUT ? Fc - NF : Fc;
  let hip, N, Pn, liftN = 0, liftP = 0, lean = 0, yaw = 0.2, sq = 0, eyes = 'dot', mouth = null, emote = null, look = [0, 0];
  const L = 1.15;   // leg length
  const stand = (cx, cz, spread, h = 1.0, ang = 0) => {
    const dx = Math.cos(ang) * spread / 2, dz = Math.sin(ang) * spread / 2;
    return { hip: [cx, h, cz], N: [cx - dx, cz - dz], Pn: [cx + dx, cz + dz] };
  };
  if (Fw < K.arcs[0][0] - 8) {       // dozing at its spot; wakes, stretches, the take ("!"), looks at the zone
    const s = stand(PIP_REST[0], PIP_REST[1], 0.6); hip = s.hip; N = s.N; Pn = s.Pn;
    if (Fw < K.pipIn[0]) { eyes = 'sleep'; sq = 0.03 * Math.sin(TAU * Fw / 48); }
    else if (Fw < K.pipTake) { const a = Fw - K.pipIn[0]; eyes = a < 10 ? 'half' : 'dot'; mouth = a < 10 ? 'yawn' : null; sq = -0.12 * Math.sin(Math.PI * clamp(a / 12)); look = [0.9 * Math.sin(a * 0.3), 0]; hip = [hip[0], hip[1] + 0.12 * Math.sin(Math.PI * clamp(a / 12)), hip[2]]; }
    else { eyes = 'wide'; mouth = 'o'; sq = takeSq(Fw - K.pipTake); look = [0.8, -0.1]; emote = { type: 'bang', age: Fw - K.pipTake }; }
  } else if (Fw < K.arcs[5][1] + 6) {   // hop from partner to partner; at each: needle down, pencil swings a full circle
    let k = 0; for (let i = 0; i < 6; i++) if (Fw >= K.arcs[i][0] - 8) k = i;
    const [a0, a1] = K.arcs[k];
    const pc = P.PARTNERS[k], cx = P.PCOL[pc.c], cz = P.PROW[pc.r];
    const prev = k === 0 ? PIP_REST : [P.PCOL[P.PARTNERS[k - 1].c], P.PROW[P.PARTNERS[k - 1].r]];
    const hopT = clamp((Fw - (a0 - 8)) / 8);
    if (hopT < 1) {   // hop to the next partner
      const x = lerp(prev[0], cx, io(hopT)), z = lerp(prev[1], cz, io(hopT)), h = 1.02 + 0.55 * Math.sin(Math.PI * hopT);
      const s = stand(x, z, 0.3, h, 0.3); hip = s.hip; N = s.N; Pn = s.Pn; liftN = liftP = h - 1.02; eyes = 'happy'; sq = -0.08 * Math.sin(Math.PI * hopT);
    } else {         // needle planted beside the partner's site (just behind it), pencil swings round at radius r
      const u = clamp((Fw - a0) / (a1 - a0));
      const ang = Math.PI + TAU * io(u);                     // start at the dock side (-x) and go round once
      const r = P.PAIR;
      N = [cx, cz]; Pn = [cx + Math.cos(ang) * r, cz + Math.sin(ang) * r];
      hip = [cx + Math.cos(ang) * r * 0.5, Math.sqrt(Math.max(0.2, L * L - (r * 0.5) ** 2)) - 0.02, cz + Math.sin(ang) * r * 0.5];
      eyes = u < 0.95 ? 'slit' : 'happy'; mouth = u < 0.95 ? null : 'smile'; lean = 0.05 * Math.sin(u * TAU);
      look = [Math.cos(ang) * 0.5, 0.6];
      yaw = -ang * 0.5;
      if (u >= 1) sq = ringv(Fw - a1, 0.12, 1.0, 0.25);
    }
  } else {          // skip off to the front-left corner and watch; later cheers
    const a = Fw - (K.arcs[5][1] + 6);
    const last = [P.PCOL[P.PARTNERS[5].c], P.PROW[P.PARTNERS[5].r]];
    const t = clamp(a / 14);
    const x = lerp(last[0], PIP_REST[0], io(t)), z = lerp(last[1], PIP_REST[1], io(t)), h = 1.02 + 0.5 * Math.sin(Math.PI * t);
    const s = stand(x, z, lerp(0.3, 0.6, t), h); hip = s.hip; N = s.N; Pn = s.Pn; liftN = liftP = h - 1.02;
    eyes = 'dot'; look = [0.6, 0.1];
    if (F >= K.whistle && F < K.whistle + 16) { eyes = 'wide'; emote = null; }
    if (F >= K.zap - 6 && F < K.zap + 6) { eyes = 'squeeze'; mouth = 'o'; sq = 0.1; }
    if (F >= K.flag && F < K.wipe[0]) { eyes = 'happy'; mouth = 'grin'; const c = ((F - K.flag) % 16) / 16; hip = [hip[0], hip[1] + 0.12 * Math.sin(Math.PI * c), hip[2]]; }
  }
  return { hip, N, Pn, liftN, liftP, lean, yaw, sq, face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// Rook (routing loco) on its side track (x = TRACK_X, facing +z). Its coupler holds the AOD rows.
export function rookState(F) {
  const Fc = twos(F);
  const p = convoyP(F);
  const zFront = lerp(P.SROW[2], P.PROW[1], p);   // it rides level with the front AOD row
  let dy = 0, tilt = 0, sq = 0, eyes = 'sleep', mouth = null, emote = null, look = [0, 0];
  const T = keyed(Fc, [[0, 's'], [K.whip1[0], 'wake'], [K.toot, 'toot'], [K.plan1[0], 'draw'], [K.whistle, 'oops'], [K.erase[0], 'fix'], [K.ok, 'proud'], [K.aodOn[0], 'ready'], [K.glide[0], 'go'], [K.dock, 'stop'], [K.zap - 6, 'sq'], [K.zap + 8, 'happy'], [CUT, 's']]);
  switch (T.v) {
    case 's': eyes = 'sleep'; break;
    case 'wake': eyes = T.age < 4 ? 'squeeze' : 'dot'; sq = takeSq(T.age - 4); break;
    case 'toot': eyes = 'happy'; mouth = 'o'; sq = T.age < 4 ? 0.16 * sm(T.age / 4) : ringv(T.age - 4, -0.2, 0.9, 0.18); break;
    case 'draw': eyes = 'slit'; look = [0.7, 0.4]; break;
    case 'oops': eyes = T.age < 3 ? 'squeeze' : 'wide'; mouth = 'wobble'; sq = takeSq(T.age - 3); if (T.age < 18) emote = { type: 'sweat', age: T.age }; tilt = 0.06 * Math.sin(T.age * 0.8) * Math.exp(-T.age / 10); break;
    case 'fix': eyes = 'slit'; mouth = 'teeth'; look = [0.7, 0.4]; break;
    case 'proud': eyes = 'happy'; mouth = 'smile'; sq = ringv(T.age, 0.12, 0.9, 0.2); break;
    case 'ready': eyes = 'slit'; mouth = 'grin'; sq = 0.1 * sm((Fc - K.aodOn[0]) / 10); break;
    case 'go': eyes = 'happy'; mouth = 'grin'; tilt = -0.05 * convoyV(F); dy = 0.02 * Math.abs(Math.sin(Fc * 0.9)); break;
    case 'stop': eyes = 'wide'; mouth = 'o'; tilt = bumpv(T.age, 0.12, 0.8, 0.16); sq = ringv(T.age, 0.14, 0.9, 0.2); if (T.age > 8) { eyes = 'happy'; mouth = 'smile'; } break;
    case 'sq': eyes = 'squeeze'; mouth = 'o'; sq = 0.08; break;
    case 'happy': eyes = 'happy'; mouth = 'grin'; break;
    default: break;
  }
  if (T.v === 'happy' && F >= K.flag && F < K.wipe[0]) dy = 0.06 * Math.abs(Math.sin((F - K.flag) * 0.4));
  return { x: P.TRACK_X, z: zFront - 0.05, yaw: -Math.PI / 2, dy, tilt, sq, dist: zFront - P.SROW[2], face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// Loupe (verifier): waits at the back-right of the plate, hops over to the plan, looks through its lens at the crossing,
// blows the whistle, points; approves the new plan with a nod; then watches the run from the right edge.
export const LOUPE_HOME = [2.9, -2.9];
export const CROSS_AT = [-0.014, -0.379];   // where the two wrong routes cross (on the plate)
export function loupeState(F) {
  const Fc = twos(F);
  let x = LOUPE_HOME[0], z = LOUPE_HOME[1], y = 0, yaw = -0.6, lean = 0, pitch = 0, sq = 0, armL = 0.25, armR = 0.25, headTilt = 0;
  let eyes = 'dot', mouth = null, emote = null, look = [0, 0];
  const insp = [CROSS_AT[0] + 0.62, CROSS_AT[1] - 0.52];   // just behind-right of the crossing: never between it and the lens
  if (Fc >= K.loupeIn[0] && Fc < K.loupeIn[1]) {
    const u = (Fc - K.loupeIn[0]) / (K.loupeIn[1] - K.loupeIn[0]);
    const k2 = u < 0.5 ? 0 : 1, uu = (u - k2 * 0.5) / 0.5;
    const a = k2 ? [lerp(LOUPE_HOME[0], insp[0], 0.5), lerp(LOUPE_HOME[1], insp[1], 0.5)] : LOUPE_HOME, b = k2 ? insp : [lerp(LOUPE_HOME[0], insp[0], 0.5), lerp(LOUPE_HOME[1], insp[1], 0.5)];
    x = lerp(a[0], b[0], io(uu)); z = lerp(a[1], b[1], io(uu)); y = 0.45 * Math.sin(Math.PI * uu); sq = -0.1 * Math.sin(Math.PI * uu); yaw = -1.9; eyes = 'dot';
  } else if (Fc >= K.loupeIn[1] && Fc < K.ok + 14) {
    x = insp[0]; z = insp[1]; yaw = lerp(-1.9, -2.6, sm((Fc - K.loupeIn[1]) / 6));
    const lookA = sm((Fc - K.look) / 6);
    pitch = 0.5 * lookA; headTilt = 0.35 * lookA; eyes = 'wide'; look = [0, 0.6];
    if (Fc >= K.whistle - 4) {                           // whistle: arm up to the mouth, blow, point at the crossing
      const w = Fc - K.whistle;
      armR = w < 0 ? lerp(0.25, 2.5, sm((w + 4) / 4)) : w < 12 ? 2.5 : lerp(2.5, 0.9, sm((w - 12) / 6));
      eyes = w < 0 ? 'dot' : w < 12 ? 'squeeze' : 'slit'; mouth = w >= 0 && w < 12 ? 'o' : null;
      sq = w >= 0 && w < 12 ? 0.08 + 0.04 * Math.sin(w * 2.2) : 0; pitch = lerp(0.5, 0.15, sm((w + 4) / 4));
      if (w >= 12) { armL = lerp(0.25, 1.5, sm((w - 12) / 4)); }   // pointing at the flagged crossing
    }
    if (Fc >= K.erase[0]) { armL = lerp(1.5, 0.25, sm((Fc - K.erase[0]) / 5)); armR = 0.25; pitch = 0.4; eyes = 'dot'; mouth = null; }
    if (Fc >= K.ok - 2) { const a = Fc - K.ok; eyes = 'happy'; mouth = 'smile'; armR = lerp(0.25, 2.2, sm(a / 4)); pitch = 0.4 - 0.15 * Math.sin(Math.max(0, a) * 0.8) * Math.exp(-Math.max(0, a) / 8); }
  } else if (Fc >= K.ok + 14 && Fc < K.aodOn[1] + 8) {  // hops back to the right edge, out of the convoy's way
    const u = (Fc - K.ok - 14) / (K.aodOn[1] + 8 - K.ok - 14);
    x = lerp(insp[0], 2.75, io(u)); z = lerp(insp[1], -1.1, io(u)); y = 0.35 * Math.abs(Math.sin(Math.PI * u * 2)); yaw = lerp(-2.6, -0.8, io(u)); eyes = 'dot';
  } else if (Fc >= K.aodOn[1] + 8 && Fc < CUT) {
    x = 2.75; z = -1.1; yaw = -0.8; eyes = 'dot'; look = [-0.5, 0.2];
    if (F >= K.zap - 6 && F < K.zap + 6) { eyes = 'squeeze'; sq = 0.08; }
    if (F >= K.flag && F < K.wipe[0]) { eyes = 'happy'; mouth = 'smile'; armR = 2.0 + 0.3 * Math.sin((F - K.flag) * 0.5); }
  }
  return { x, z, y, yaw, lean, pitch, sq, armL, armR, headTilt, face: { eyes, mouth, look }, emote };
}
export function planState(F) {
  // pencil route arrows drawn by Rook: plan 1 (two routes cross) is drawn, flagged, scribbled out; plan 2 (order kept)
  if (F >= CUT || F < K.plan1[0] || F >= K.glide[0] + 4) return null;
  const d1 = sg(F, K.plan1[0], K.plan1[1], (x) => x);
  const erase = sg(F, K.erase[0], K.erase[1], (x) => x);
  const d2 = sg(F, K.plan2[0], K.plan2[1], (x) => x);
  const fade2 = 1 - sg(F, K.aodOn[1], K.glide[0] + 4);
  return { d1, erase, d2, fade2, flag: F >= K.whistle ? F - K.whistle : -1, ok: F >= K.ok ? F - K.ok : -1 };
}

// ---------------------------------------------------------------------------------------------------------------
// Tick (optimize stopwatch) on its podium off the front-right corner. Clicks the crown for the pulse; then tries
// schedule changes (turn the crown): the dial hand = this schedule's run time (a lap = PowerMove), the thermometer =
// fidelity. A try is accepted only if one gets better and the other no worse.
export const TICK = { x: 3.3, z: 3.05 };
export const TICK_HOME = { x: 6.55, z: 3.0 };   // its stool off the plate's front-right corner
export function tickState(F) {
  const Fc = twos(F);
  let y = 0, sq = 0, rock = 0.05 * Math.sin(TAU * Fc / 26), yaw = -0.55, armL = 0.35, armR = 0.35, crown = 0, bow = 0;
  let eyes = 'dot', mouth = null, emote = null, look = [0, 0];
  let lap = LAP_RAW, fid = 1.12, ghost = null, verdict = null;
  let x = TICK.x, z = TICK.z;
  if (F < K.tickHop[0] || F >= CUT) { x = TICK_HOME.x; z = TICK_HOME.z; eyes = 'sleep'; sq = 0.03 * Math.sin(TAU * F / 50); }
  else if (F < K.tickHop[1]) {   // two hops from the stool onto the plate, ready for its cue
    const p = (F - K.tickHop[0]) / (K.tickHop[1] - K.tickHop[0]), h = p < 0.5 ? 0 : 1, u = (p - h * 0.5) / 0.5;
    const a = h ? [(TICK_HOME.x + TICK.x) / 2, (TICK_HOME.z + TICK.z) / 2] : [TICK_HOME.x, TICK_HOME.z], b = h ? [TICK.x, TICK.z] : [(TICK_HOME.x + TICK.x) / 2, (TICK_HOME.z + TICK.z) / 2];
    const air = clamp((u - 0.2) / 0.7);
    x = lerp(a[0], b[0], sm(air)); z = lerp(a[1], b[1], sm(air)); y = 0.55 * Math.sin(Math.PI * air);
    sq = u < 0.2 ? 0.16 * sm(u / 0.2) : -0.14 * Math.sin(Math.PI * air); armL = armR = lerp(0.35, 2.2, Math.sin(Math.PI * air)); eyes = 'wide'; mouth = 'o'; yaw = -0.9;
  } else if (F < K.whip2[0]) { sq = ringv(F - K.tickHop[1], 0.18, 0.9, 0.2); eyes = 'dot'; yaw = lerp(-0.9, -0.55, sm((F - K.tickHop[1]) / 6)); }
  if (F >= K.whip2[0] && F < K.click) { eyes = 'slit'; mouth = 'grin'; yaw = lerp(-0.55, -0.2, sm((F - K.whip2[0]) / 8)); armR = lerp(0.35, 2.6, sm((Fc - K.click + 8) / 6)); sq = 0.12 * sm((Fc - K.click + 8) / 6); }
  if (F >= K.click && F < K.zap + 20) {
    const a = Fc - K.click;
    crown = Math.max(0, 1 - a / 4); armR = lerp(2.6, 0.5, sm((a - 4) / 6)); sq = ringv(a, -0.16, 0.9, 0.2); y = bumpv(a, 0.1, 0.5, 0.14);
    eyes = a < 8 ? 'squeeze' : 'happy'; mouth = a < 8 ? 'o' : 'grin'; yaw = -0.2;
  }
  // optimisation tries
  const tries = K.tries;
  let lapNow = LAP_RAW, fidNow = 1.12;
  const lapSteps = [LAP_RAW, 0.29, LAP_FINAL], fidSteps = [1.12, 1.2, FID_FINAL];
  let acc = 0;
  for (let i = 0; i < tries.length; i++) {
    const [a, b, ok] = tries[i];
    if (F < a) break;
    const u = sg(F, a, a + 8), back = ok ? 0 : sg(F, b - 6, b);
    const targetLap = ok ? lapSteps[acc + 1] : lapSteps[acc] - 0.06;
    const targetFid = ok ? fidSteps[acc + 1] : fidSteps[acc] - 0.14;
    lapNow = lerp(lapSteps[acc], targetLap, u * (1 - back));
    fidNow = lerp(fidSteps[acc], targetFid, u * (1 - back));
    if (F >= a + 8 && F < b) verdict = { ok, age: F - a - 8, i };
    if (ok && F >= b) acc++;
    if (ok && F >= b) { lapNow = lapSteps[acc]; fidNow = fidSteps[acc]; }
  }
  if (F >= tries[0][0] - 6 && F < K.flag) {
    yaw = -0.15; look = [0.5, 0.2];
    const cur = tries.find(([a, b]) => F >= a - 4 && F < b);
    if (cur) { armL = lerp(0.35, 2.7, sm((Fc - cur[0] + 4) / 4)); crown = 0.5 + 0.5 * Math.sin((Fc - cur[0]) * 1.2); eyes = 'slit'; }
    if (verdict && !verdict.ok) { eyes = verdict.age < 3 ? 'squeeze' : 'worried'; mouth = 'wobble'; if (verdict.age < 16) rock = 0.08 * Math.sin(verdict.age * 1.4); }
    if (verdict && verdict.ok) { eyes = 'happy'; mouth = 'smile'; sq = ringv(verdict.age, 0.12, 0.9, 0.2); }
    if (F >= K.race[0] - 6 && F < K.flag) {   // the replay race: Tick holds its breath, then CLICKS when its hand stops
      eyes = F < K.flag - 3 ? 'wide' : 'squeeze'; mouth = 'o'; armL = 0.5; sq = 0.06 * sm((F - K.race[0]) / 10);
      if (F >= K.flag - 3) { crown = 1; armR = 2.6; }
    }
  }
  lap = lapNow; fid = fidNow;
  if (F >= tries[0][0] - 10 && F < CUT) ghost = 0.9999;   // PowerMove's lap, for reference
  // the race replay on the dial: both hands spin back to 12, then run at the SAME speed; Qubrio's stops at 1/4.7 turn,
  // PowerMove's ghost runs on and closes the full turn 4.7x later (as Slo crawls in)
  const [r0, r1] = K.race;
  if (F >= r0 - 6 && F < r0) { const k = sm((F - r0 + 6) / 6); lap = lerp(LAP_FINAL, 0, k); ghost = lerp(0.9999, 0, k); }
  if (F >= r0 && F < CUT) { const g = clamp((F - r0) / (r1 - r0)); ghost = Math.max(0.0001, g * 0.9999); lap = Math.min(g, LAP_FINAL); }
  if (F >= K.flag && F < CUT) {                           // payoff: arms up, holds the flag; star eyes
    const a = Fc - K.flag;
    eyes = a < 4 ? 'squeeze' : 'star'; mouth = 'grin';
    armR = lerp(0.35, 2.9, ob(a / 6)); armL = lerp(0.35, 1.2, sm((a - 4) / 6)) + 0.15 * Math.sin(a * 0.5);
    sq = a < 4 ? 0.14 * sm(a / 4) : ringv(a - 4, -0.2, 0.8, 0.16); y = a >= 4 ? 0.25 * Math.sin(Math.PI * clamp((a - 4) / 10)) : 0;
    yaw = -0.3; rock = 0.04 * Math.sin(a * 0.35);
    if (F >= K.sloArrive && F < K.sloArrive + 24) { look = [0.9, 0.5]; eyes = 'happy'; }
  }
  return { x, z, y, yaw, sq, rock, armL, armR, crown, bow, hand: lap, ghost, fid, verdict, face: { eyes, mouth, look }, emote };
}

// ---------------------------------------------------------------------------------------------------------------
// Slo (PowerMove): starts with the convoy, one atom on its back, 4.7x slower; arrives at the zone at K.sloArrive.
export function sloState(F) {
  const Fc = twos(F);
  const z = sloZ(F);
  const moving = F >= K.glide[0] && F < K.glide[0] + SLO_DUR && F < CUT;
  let eyes = 'half', mouth = null, emote = null, st = 0, sq = 0, sway = 0, lean = 0, stalk = 0, dy = 0;
  if (moving) { st = 0.05 * Math.sin(Fc * 0.5); sway = 0.04 * Math.sin(Fc * 0.25); eyes = 'slit'; mouth = 'teeth'; }
  if (F >= K.glide[0] && F < K.glide[1]) {   // the convoy whooshes past: stalks blown back, a sweat drop
    const v = convoyV(F); stalk = 0.5 * v; lean = -0.06 * v; eyes = 'wide'; mouth = 'o';
    if (F >= K.glide[0] + 20 && F < K.glide[0] + 44) emote = { type: 'sweat', age: F - K.glide[0] - 20 };
  }
  if (F >= K.sloArrive && F < CUT) { const a = Fc - K.sloArrive; eyes = a < 6 ? 'dizzy' : 'half'; mouth = 'wobble'; sq = ringv(a, 0.18, 0.8, 0.14); if (a < 20) emote = { type: 'sweat', age: a }; }
  return { x: SLO.x, z, dy, yaw: -Math.PI / 2, lean, st, sq, sway, stalk, face: { eyes, mouth, ph: Fc * 0.25 }, emote, cargo: { eyes: 'sleep' } };
}

// ---------------------------------------------------------------------------------------------------------------
// camera: orbit rigs per shot, blended; whips get smear from the measured screen motion (q_story)
export const WHIPS = [K.whip1, K.whip2, [400, 413]];
const R_A = (F) => {   // establishing (S8 tail + S1): slow crane down towards the plate
  const k = sm((F + 28) / 110);
  return { tg: [lerp(-0.4, -1.2, k), lerp(0.2, 0.6, k), lerp(-0.8, 0.4, k)], az: lerp(0.42, 0.18, k), el: lerp(0.62, 0.36, k), r: lerp(14.5, 9.2, k), fov: 30, roll: lerp(0, -0.03, k) };
};
const R_B = (F) => {   // placement: follow Pip across the partners, then rise to see all six circles
  const k = sm((F - 60) / 90);
  const up = sm((F - K.rise[0]) / (K.rise[1] - K.rise[0]));
  return { tg: [lerp(-1.2, 1.2, k), lerp(0.8, 0.3, up), lerp(0.9, 1.0, k)], az: lerp(-0.2, 0.1, k), el: lerp(0.36, 0.8, up), r: lerp(6.8, 8.2, up), fov: 30, roll: lerp(0.04, 0, up) };
};
const R_C = (F) => {   // routing plan from high front-right: Rook, the arrows, Loupe; crash-zoom into the lens on the whistle
  const cz = sm((F - K.look) / 7) * (1 - sm((F - K.whistle - 12) / 8));
  const base = { tg: [-0.6, 0.2, -1.1], az: 0.42, el: 0.72, r: 8.2, fov: 32, roll: 0.0 };
  const lens = { tg: [CROSS_AT[0] + 0.3, 0.85, CROSS_AT[1] - 0.25], az: 0.18, el: 0.46, r: 4.9, fov: 32, roll: -0.08 };
  return mixRig(base, lens, cz);
};
const R_D = (F) => {   // convoy: head-on from the front, dollying back as the block comes at us - Rook (left) and Slo (right) in frame
  const p = convoyP(F);
  const zc = lerp(P.SROW[2] - 0.5, P.PROW[1] - 0.7, p);
  const k = sm((F - K.aodOn[0]) / 16);
  return { tg: [0.15, 0.5, zc - 0.3], az: lerp(0.1, 0.02, p), el: lerp(0.36, 0.24, k), r: lerp(7.8, 8.8, p), fov: 34, roll: lerp(0.0, -0.04, k) };
};
const R_E = (F) => {   // Tick winds up (low hero), then after the flash: high 3/4 over the whole zone with a push
  if (F < K.zap) return { tg: [TICK.x - 0.3, 1.1, TICK.z - 0.3], az: 0.35, el: 0.12, r: lerp(4.9, 4.4, sm((F - K.whip2[1]) / 16)), fov: 30, roll: -0.04 };
  const push = sm((F - K.zap) / 30);
  return { tg: [0.3, 0.3, 0.8], az: lerp(0.42, 0.3, push), el: lerp(0.74, 0.64, push), r: lerp(9.4, 7.9, push), fov: 30, roll: lerp(0.03, -0.03, push) };
};
const R_F = (F) => {   // optimise: Tick's dial and the fidelity gauge, front, slightly low
  const k = sm((F - 404) / 14);
  return { tg: [TICK.x + 0.55, 1.2, TICK.z], az: lerp(0.12, -0.02, sm((F - 410) / 70)), el: 0.14, r: lerp(5.6, 4.7, k), fov: 30, roll: 0.02 };
};
const R_G = (F) => {   // payoff: hero orbit - Tick, the pennant, the gauge; the entangled pairs behind; Slo arrives
  const o = io((F - K.flag) / 100);
  return { tg: [lerp(TICK.x + 0.62, TICK.x + 0.5, o), 1.78, TICK.z - 0.15], az: lerp(0.3, 0.14, o), el: lerp(0.12, 0.18, o), r: lerp(6.1, 6.5, o), fov: 30, roll: lerp(-0.04, 0.02, o) };
};
export function camRig(F) {
  if (F >= K.wipe[0] + 10) return R_A(F - NF);                         // after the cut: the loop's opening move
  if (F < 60) return R_A(F);
  if (F < 70) return mixRig(R_A(F), R_B(F), io((F - 60) / 10));
  if (F < K.whip1[0]) return R_B(F);
  if (F < K.whip1[1]) return mixRig(R_B(F), R_C(F), q5((F - K.whip1[0]) / (K.whip1[1] - K.whip1[0])));
  if (F < K.aodOn[0] - 4) return R_C(F);
  if (F < K.aodOn[0] + 10) return mixRig(R_C(F), R_D(F), io((F - K.aodOn[0] + 4) / 14));
  if (F < K.whip2[0]) return R_D(F);
  if (F < K.whip2[1]) return mixRig(R_D(F), R_E(F), q5((F - K.whip2[0]) / (K.whip2[1] - K.whip2[0])));
  if (F < 400) return R_E(F);
  if (F < 412) return mixRig(R_E(F), R_F(F), io((F - 400) / 12));
  if (F < K.flag - 6) return R_F(F);
  if (F < K.flag + 4) return mixRig(R_F(F), R_G(F), io((F - K.flag + 6) / 10));
  return R_G(F);
}
export function camShake(F) {
  return shakeAt(F, [[K.pipTake, 0.006, 3], [K.whistle, 0.012, 4], [K.dock, 0.008, 4], [K.zap, 0.022, 6], [K.flag + 4, 0.012, 4], [K.sloArrive, 0.004, 3]]);
}
