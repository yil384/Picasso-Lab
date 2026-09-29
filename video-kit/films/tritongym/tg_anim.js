// tg_anim.js - the timeline of "The Loop": key frames, paths and poses (pure functions of the frame F).
// Ring coordinates: an angle th (radians, +x towards +z) and a radius r; the track runs th-increasing.
import { TAU, clamp, lerp, sg, sm, io, ob, mj, mjv, ringv, bumpv, hsh, take, hop, tw, step } from './tg_time.js';

export const NF = 660;
// station angles (radians) and radii
export const A = { bench: 0.0, gate: 0.95, scale: 1.95, start: 3.0, finish: 4.85 };
A.words = A.finish + 0.69;      // the payoff letters, on top of the graphics card (clear of the finish pylon from the payoff lens)
A.tokWin = A.finish + 1.62;     // Tok's star-eyed spot at the payoff
export const R = { track: 6.0, lanes: [5.45, 6.55], ours: 6.55, oro: 5.45, bench: 8.3, tokBench: 7.72, kerb: 4.62, scale: 8.15 };
export const L2 = TAU;   // lap 2 offset

// ------------------------------------------------------------------------------------------------
// key frames (see STORYBOARD.md)
// ------------------------------------------------------------------------------------------------
export const K = {
  // B1 write
  skid: 8, lookUp: [10, 22], gulp: 15, pull: [22, 28], show: [28, 38], cardDown: [38, 44], inhale: [42, 47],
  speak: [47, 68], tokEvery: 3, tokFly: 8, wheels: [64, 72], cow: 70, plate: [74, 80], eyes: 80, wind: [81, 87], hopOff: [88, 95],
  // B2 compile
  drive1: [96, 128], dash: [112, 131], clang: 131, flick: [133, 145], slip: [134, 142], peel: [146, 154],
  closeup: [154, 168], press: [159, 165], lift: [168, 178], through: [174, 192], ripple: [181, 190],
  // B3 verify
  toScale: [192, 214], eject: [214, 223], settle: [223, 238], flag: 240, dialPush: [244, 264],
  // B4 race 1: the oracle always runs ORO_RUN frames; Kern takes 56 (Perf@1 ~ 0.64)
  cut: 264, tune: [268, 284], side: [284, 296], kgulp: 292, go1: 300, oroRun1: [300, 336], kernRun1: [300, 356],
  buff: [340, 363], crash: [356, 366],
  // B5 refine
  tokIn: [360, 372], idea: 374, speak2: [382, 400], popOff: 384, snapOn: [390, 400], nose: 400, rev: [404, 420],
  // B6 lap 2 (only Kern laps; the oracle backs up the home straight to the start line)
  lap2: [422, 486], gate2: 445, scale2: 461, oroBack: [424, 474],
  // B7 race 2: Kern takes 33 frames (Perf@1 ~ 1.09), the photo finish holds 12 frames, then the stopwatch insert
  side2: [488, 496], dtake: 497, go2: 515, run2: [515, 551], cross: 548, freeze: [548, 550], hold: [548, 560], watch: [560, 580],
  // B8 payoff
  slam: 590, check: 598, jaw: 602, laurel: 606, nod: [616, 626], leap: [608, 628],
  // B9 next
  away: [632, 660],
};

// ------------------------------------------------------------------------------------------------
// helpers
// ------------------------------------------------------------------------------------------------
// world = (cos th * r, y, -sin th * r): seen from outside the ring the track runs left to right
export const polar = (th, r, y = 0) => [Math.cos(th) * r, y, -Math.sin(th) * r];
/** rotation.y of something built pointing +x (racers) so it points along the track at angle th */
export const headingAt = (th) => th + Math.PI / 2;
/** rotation.y of something built facing +z (faces) so it faces outward, towards a camera outside the ring */
export const faceOut = (th) => th + Math.PI / 2;
const wrapF = (F) => ((F % NF) + NF) % NF;
/** B1 spots, from the bench station's layout (x along the track, z outward; see buildBench) */
const bx = (x) => A.bench + x / R.bench;
/** B2: where Tok waits behind Kern at the gate, and where Kern lands after the CLANG (in front of Tok, nearer the lens) */
export const B2 = { thStop: A.gate - 0.105 };
B2.tok = polar(B2.thStop - 0.33, R.ours - 0.3, 0); B2.land = polar(B2.thStop - 0.17, R.ours + 0.3, 0);
export const B1 = {
  tok: polar(bx(-0.55), R.bench + 0.08, 0),            // Tok stands between the stack and the bench, nothing in front of it
  kern: polar(bx(1.05), R.bench, 0.8),                  // Kern is built on the bench top
  stackTop: polar(bx(-1.75), R.bench + 0.05, 1.655),     // the top card of the 164 stack
  cardRest: polar(bx(0.42), R.bench + 0.2, 0.812),      // where Tok lays the operator card down
  thTok: bx(-0.55), thKern: bx(1.05),
};
/** the photo-finish hold: every character is frozen on the crossing frame */
const held = (F) => (F >= K.hold[0] && F < K.hold[1] ? K.hold[0] : F);

// ------------------------------------------------------------------------------------------------
// Kern (the generated kernel)
// ------------------------------------------------------------------------------------------------
// square-wheel lurch: the chassis rides between half the side and half the diagonal
function squareBob(dist, wheelR = 0.12) {
  const ang = dist / wheelR;                         // rolled angle
  const ph = ((ang % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2) - Math.PI / 4;
  return { bob: wheelR * (1 / Math.cos(ph) - 1), ang, thunk: Math.abs(ph) > Math.PI / 4 - 0.12 };
}

/** Race curves: ring angle of each racer during the sprints (thS -> past thF), with a coast-to-stop after the line. */
const P1 = { kEnd: 0.16, oEnd: 0.42 };
function sprint(F, f0, fLine, thS, thF, pw, coastF, over) {
  if (F < f0) return thS;
  const T_ = fLine - f0, u = (F - f0) / T_;
  if (u <= 1) return thS + (thF - thS) * Math.pow(u, pw);
  const v = (thF - thS) * pw / T_;                  // speed at the line (rad / frame)
  const a = Math.min(F - fLine, coastF), k = a / coastF;
  return thF + Math.min(over, v * coastF * (k - k * k / 2));
}
export const ORO_RUN = 36;
// the races are timed nose-on-the-line: centre angles at which each nose touches the finish line
const LINE = { k1: A.finish - 0.65 / R.ours, k2: A.finish - 0.94 / R.ours, o: A.finish - 1.31 / R.oro };    // the oracle's time, identical in both races (it is the fixed yardstick)
/** race time: the photo-finish hold freezes the racers at the crossing frame */
export const raceF = (F) => (F >= K.hold[0] && F < K.hold[1] ? K.hold[0] : F >= K.hold[1] ? F - (K.hold[1] - K.hold[0]) : F);
export function kernTh(F) {   // ring angle of Kern in the races (lap offset included for race 2)
  if (F < K.lap2[0]) return sprint(F, K.go1, K.kernRun1[1], A.start, LINE.k1, 1.25, 10, P1.kEnd + A.finish - LINE.k1);
  // race 2: slow off the line (pw 1.5), fastest at the end; rolls on past the line and parks ahead
  return L2 + sprint(raceF(F), K.go2, K.cross, A.start, LINE.k2, 1.5, 18, 0.6 + A.finish - LINE.k2);   // go2..cross = 33 f (Perf@1 ~ 1.09)
}
export function oroTh(F) {
  if (F < K.lap2[0]) return sprint(F, K.go1, K.go1 + ORO_RUN, A.start, LINE.o, 1.1, 16, P1.oEnd + A.finish - LINE.o);   // blasts off
  // race 2: the same run (36 f, same launch), but brakes hard at the line in shock
  return L2 + sprint(raceF(F), K.go2, K.go2 + ORO_RUN, A.start, LINE.o, 1.1, 6, 0.06 + A.finish - LINE.o);
}

/**
 * Kern's state: { vis, pos:[x,y,z], yaw, sq, bob, wheelAng, compiled (0..1 ripple), round, cow (0 crooked..1 flat),
 * nose, face, onBench, tiles (assembly progress per tile), stuckAt }
 */
export function kernState(F) {
  F = held(F);
  const S = { vis: true, sq: 0, pitch: 0, roll: 0, wheelAng: 0, round: false, cow: 0, nose: false, compiled: 0, face: 'calm', keySpin: 0, lurch: 0, dizzy: 0 };
  const lanePos = (th, r = R.ours, y = 0) => polar(th, r, y);
  // compiled state: first ripple at the gate in B2; the refined parts are cream again from B5 until the lap-2 gate
  S.compiled = sg(F, K.ripple[0], K.ripple[1]);
  S.freshParts = F >= K.snapOn[0] && F < K.gate2 + 3;       // the new wheels + nose are source until recompiled
  S.round = F >= K.snapOn[0] || F < 0;
  S.nose = F >= K.nose;
  S.cow = sg(F, K.press[0], K.press[1], sm);
  if (F < K.speak[0]) { S.vis = false; return S; }
  // ---- B1: built on the bench top, then hops down to the lane
  const benchTop = B1.kern;
  const laneStart = lanePos(A.bench + 0.2);
  if (F < K.hopOff[0]) {
    S.pos = benchTop; S.yaw = headingAt(B1.thKern) - 0.4; S.onBench = true;      // nose and plate side 3/4 to the lens
    S.face = F < K.eyes ? 'shut' : F < K.eyes + 8 ? 'wide' : 'calm';
    if (F >= K.wind[0] && F < K.wind[1]) { const k = (F - K.wind[0]) % 4; S.sq = k < 2 ? 0.1 : -0.04; S.keySpin = (F - K.wind[0]) / 4 * Math.PI; S.face = 'squint'; }
    if (F >= K.eyes && F < K.eyes + 6) S.sq = take(F, K.eyes, 0.8);
    return S;
  }
  if (F < K.drive1[0]) {   // hop down
    const u = (F - K.hopOff[0]) / (K.hopOff[1] - K.hopOff[0]);
    S.pos = benchTop.map((v, i) => lerp(v, laneStart[i], sm(u)));
    S.pos[1] += 0.5 * Math.sin(Math.PI * u);
    S.yaw = lerp(headingAt(B1.thKern) - 0.4, headingAt(A.bench + 0.2), sm(u));
    S.sq = u < 0.2 ? 0.12 : -0.1 * Math.sin(Math.PI * u);
    S.face = 'determined';
    return S;
  }
  // ---- B2: drive to the gate, CLANG, flicked back to Tok, fixed, through the gate
  const thGateStop = A.gate - 0.105;
  if (F < K.clang) {
    const u = sg(F, K.drive1[0], K.drive1[1]);
    const th = lerp(A.bench + 0.2, thGateStop, u * 0.35 + 0.65 * u * u);
    const sb = squareBob((th - (A.bench + 0.2)) * R.ours);
    S.pos = lanePos(th, R.ours, sb.bob); S.yaw = headingAt(th); S.wheelAng = sb.ang; S.lurch = sb.thunk ? 1 : 0;
    S.pitch = 0.08 * Math.sin(sb.ang * 4);
    S.face = F > K.clang - 6 ? 'wide' : 'determined';
    return S;
  }
  if (F < K.flick[1]) {    // bounces off the bars, back in two hops, lands on the ground in front of Tok, spinning
    const u = (F - K.clang) / (K.flick[1] - K.clang);
    const a = lanePos(thGateStop, R.ours, 0), b = B2.land;
    const h = u < 0.65 ? 0.85 * Math.sin(Math.PI * u / 0.65) : 0.22 * Math.sin(Math.PI * (u - 0.65) / 0.35);
    S.pos = [lerp(a[0], b[0], sm(u)), h, lerp(a[2], b[2], sm(u))];
    S.yaw = headingAt(thGateStop) + TAU * ob(u); S.roll = 0.5 * Math.sin(Math.PI * u);
    S.face = 'dizzy'; S.sq = F < K.clang + 3 ? 0.25 : Math.abs(u - 0.65) < 0.06 ? 0.2 : 0;
    return S;
  }
  if (F < K.through[0]) {  // sits dizzy in front of Tok; the crooked token is pressed flat (close-up), then it perks up
    S.pos = B2.land; S.yaw = headingAt(thGateStop) - 0.35;
    if (F < K.flick[1] + 6) S.sq = ringv(F - K.flick[1], 0.2, 0.9, 0.25);
    S.face = F < K.press[0] ? 'dizzy' : F < K.press[1] + 2 ? 'squint' : F < K.lift[0] ? 'calm' : 'determined';
    if (F >= K.press[0] && F < K.press[1]) S.sq = 0.2 * Math.sin(Math.PI * sg(F, K.press[0], K.press[1]));
    return S;
  }
  // through the gate (still square wheels) and on towards the weigh-in
  const thAfter = A.gate + 0.42;
  if (F < K.toScale[0]) {
    const u = sg(F, K.through[0], K.toScale[0]);
    const th = lerp(thGateStop - 0.17, thAfter, u);
    const sb = squareBob((th - thGateStop) * R.ours);
    S.pos = lanePos(th, R.ours + 0.3 * (1 - sm(u * 2.5)), sb.bob); S.yaw = headingAt(th); S.wheelAng = sb.ang; S.lurch = sb.thunk ? 1 : 0;
    S.face = F >= K.ripple[0] && F < K.ripple[1] + 6 ? 'wide' : 'happy';
    return S;
  }
  // ---- B3: to the weigh-in (leaves the track outward), parks beside the left pan, ejects its output block
  const park = polar(A.scale - 0.12, R.scale - 0.15, 0);
  if (F < K.cut) {
    const u = sg(F, K.toScale[0], K.toScale[1], sm);
    const a = lanePos(thAfter, R.ours, 0);
    const mid = polar(lerp(thAfter, A.scale - 0.12, 0.7), R.ours + 0.6, 0);
    const bez = (p0, p1, p2, t) => p0.map((v, i) => (1 - t) * (1 - t) * v + 2 * t * (1 - t) * p1[i] + t * t * p2[i]);
    S.pos = bez(a, mid, park, u);
    const sb = squareBob(u * 5);
    S.pos[1] = u < 1 ? sb.bob : 0; S.wheelAng = sb.ang;
    S.yaw = lerp(headingAt(thAfter), headingAt(A.scale - 0.12) - 0.9, sm(u));
    S.face = F >= K.eject[0] && F < K.settle[1] ? 'nervous' : F >= K.flag ? 'happy' : 'calm';
    if (F >= K.eject[0] && F < K.eject[0] + 5) S.sq = 0.12 * Math.sin(Math.PI * (F - K.eject[0]) / 5);
    return S;
  }
  // ---- B4: race 1 on square wheels
  const thS = A.start, thF = A.finish;
  if (F < K.tokIn[0] + 4) {
    const th = kernTh(F);
    const sb = squareBob((th - thS) * R.ours);
    S.pos = lanePos(th, R.ours, F >= K.go1 && F < K.kernRun1[1] ? sb.bob : 0); S.yaw = headingAt(th); S.wheelAng = sb.ang;
    S.lurch = F >= K.go1 && sb.thunk ? 1 : 0;
    S.pitch = F >= K.go1 && F < K.kernRun1[1] ? 0.1 * Math.sin(sb.ang * 4) : 0;
    S.face = F < K.side[0] ? 'calm' : F < K.go1 - 2 ? (F >= K.kgulp ? 'nervous' : 'calm') : F < K.kernRun1[1] ? 'squint' : 'dizzy';
    if (F >= K.kgulp && F < K.kgulp + 6) S.sq = 0.08 * Math.sin(Math.PI * (F - K.kgulp) / 6);
    S.steam = F >= K.kernRun1[1] - 10 && F < K.kernRun1[1] + 14;
    return S;
  }
  // ---- B5: refine at the finish
  const thRef = thF + P1.kEnd;
  if (F < K.lap2[0]) {
    S.pos = lanePos(thRef, R.ours, 0); S.yaw = headingAt(thRef);
    S.face = F < K.idea ? 'dizzy' : F < K.snapOn[1] ? 'wide' : 'determined';
    if (F >= K.rev[0]) { S.face = 'determined'; S.wheelAng = (F - K.rev[0]) * 0.9; S.sq = 0.05 * Math.sin(F * 1.7); }
    if (F >= K.snapOn[0] && F < K.snapOn[1] + 4) S.sq = take(F, K.snapOn[1] - 2, 0.6);
    return S;
  }
  // ---- B6: lap 2 (finish -> gate -> weigh-in detour -> start), round wheels
  if (F < K.side2[0]) {
    const keys = [[K.lap2[0], thRef], [K.gate2, L2 + A.gate], [K.scale2 - 5, L2 + A.scale - 0.18], [K.scale2 + 5, L2 + A.scale - 0.02], [K.lap2[1], L2 + thS]];
    let th = keys[keys.length - 1][1];
    for (let i = 1; i < keys.length; i++) if (F < keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i]; const u = (F - a) / (b - a); th = lerp(va, vb, i === 1 ? u * u * (3 - 2 * u) * 0.5 + 0.5 * u : i === keys.length - 1 ? 1 - (1 - u) * (1 - u) : u); break; }
    const off = 1.2 * Math.sin(Math.PI * sg(F, K.scale2 - 9, K.scale2 + 9));      // swerve out to the weigh-in pan
    S.pos = lanePos(th, R.ours + off, 0); S.yaw = headingAt(th) - 0.5 * Math.cos(Math.PI * sg(F, K.scale2 - 9, K.scale2 + 9)) * (off > 0.05 ? 1 : 0);
    S.wheelAng = (th - thRef) * R.ours / 0.13; S.face = 'determined';
    return S;
  }
  // ---- B7: race 2 (the nose win) and B8 payoff parked past the line
  {
    const th = kernTh(F);
    S.pos = lanePos(th, R.ours, 0); S.yaw = headingAt(th) + 0.95 * sg(F, K.check - 8, K.check + 2, sm); S.wheelAng = (th - L2 - thS) * R.ours / 0.16;
    S.face = F < K.go2 ? 'determined' : F < K.cross ? 'squint' : F < K.check ? 'wide' : 'star';
    S.stretch = F >= K.cross - 4 && F < K.cross + 2 ? 0.25 : 0;
    if (F >= K.check && F < K.check + 18) { const h = hop(F, K.check, K.check + 10, 0.35); S.pos[1] += h.y; S.sq = h.sq; }
    if (F >= K.away[0] + 10) S.vis = false;              // gone once the whip has left the finish
    S.showCheck = F >= K.check;
    return S;
  }
}

// ------------------------------------------------------------------------------------------------
// Oro (the oracle)
// ------------------------------------------------------------------------------------------------
export function oroState(F) {
  F = held(F);
  const S = { vis: F >= K.cut - 20 && F < K.away[0] + 10, face: 'smug', wheelAng: 0, keySpin: 0, sq: 0, stretch: 0, laurelSlip: 0, wrench: 0, buff: 0, pitch: 0 };
  const lane = (th) => polar(th, R.oro, 0);
  const thS = A.start, thF = A.finish;
  if (F < K.go1) {
    S.pos = lane(thS); S.yaw = headingAt(thS);
    S.wrench = F >= K.tune[0] && F < K.tune[1] ? Math.sin(Math.PI * sg(F, K.tune[0], K.tune[1])) : 0;
    S.face = F >= K.side[0] ? 'smug' : 'shut';
    S.lookAt = F >= K.side[0] ? 1 : 0;
    S.keySpin = F * 0.05;
    return S;
  }
  if (F < K.lap2[0]) {
    const th = oroTh(F);
    S.pos = lane(th); S.yaw = headingAt(th); S.wheelAng = (th - thS) * R.oro / 0.1;
    S.stretch = F < K.oroRun1[0] + 8 ? 0.35 * Math.sin(Math.PI * sg(F, K.go1, K.go1 + 8)) : 0;
    S.keySpin = (F - K.go1) * 0.9;
    S.face = F < K.oroRun1[1] ? 'determined' : 'smug';
    S.buff = F >= K.buff[0] && F < K.snapOn[1] ? 1 : 0;
    if (F >= K.idea) S.face = F < K.idea + 20 ? 'smug' : 'smug';
    return S;
  }
  if (F < K.side2[0]) {   // backs up the home straight to the start line (it never runs the loop), smug
    const u = sg(F, K.oroBack[0], K.oroBack[1], (x) => x * x * (3 - 2 * x));
    const th = lerp(thF + P1.oEnd, thS, u);
    S.pos = lane(th); S.yaw = headingAt(th); S.wheelAng = (th - thF) * R.oro / 0.1; S.face = 'smug';
    S.keySpin = F * 0.05;
    return S;
  }
  {
    const th = oroTh(F);
    S.pos = lane(th); S.yaw = headingAt(th) + 0.85 * sg(F, K.jaw - 8, K.jaw, sm); S.wheelAng = (th - L2 - thS) * R.oro / 0.1;
    S.face = F < K.dtake ? 'smug' : F < K.go2 ? 'sweat' : F < K.cross + 2 ? 'shut' : F < K.jaw ? 'wide' : F < K.nod[0] ? 'sweat' : 'nod';
    S.keySpin = F >= K.go2 ? (F - K.go2) * 2.2 : F * 0.05;
    if (F >= K.dtake && F < K.dtake + 8) S.sq = take(F, K.dtake, 0.9);
    S.laurelSlip = sg(F, K.laurel, K.laurel + 6, ob);
    S.nod = F >= K.nod[0] && F < K.nod[1] ? Math.sin(Math.PI * sg(F, K.nod[0], K.nod[1])) : 0;
    S.jaw = F >= K.jaw ? 1 : 0;
    return S;
  }
}

// ------------------------------------------------------------------------------------------------
// Tok (the LLM): pogo-hops on its tail
// ------------------------------------------------------------------------------------------------
/** hop travel between two ring points: returns pos + squash for a sequence of pogo hops */
function pogo(F, f0, f1, P0, P1, nh = 3, h = 0.35) {
  const u = clamp((F - f0) / (f1 - f0));
  const k = u * nh, ph = k - Math.floor(k);
  const pos = P0.map((v, i) => lerp(v, P1[i], sm(u)));
  const inAir = u > 0 && u < 1;
  pos[1] += inAir ? h * 4 * ph * (1 - ph) : 0;
  return { pos, sq: inAir ? (ph < 0.12 || ph > 0.9 ? 0.14 : -0.1 * Math.sin(Math.PI * ph)) : 0 };
}

export function tokState(F) {
  F = held(F);
  const S = { face: 'calm', sq: 0, lean: 0, armL: 0.35, armR: -0.35, armLz: 0, armRz: 0, lookUp: 0, speak: 0, tilt: 0, vis: true };
  const benchSpot = B1.tok;
  const yawBench = faceOut(B1.thTok) + 0.3;                  // faces the lens, turned a little towards the bench
  // ---- B9 -> B1: arrives from the finish (whip), skids beside the stack
  const Fw = F >= K.away[0] ? F - NF : F;
  if (Fw < K.skid) {
    const fromP = polar(A.tokWin, 5.3, 0);                       // from its payoff spot (waits there while the whip starts)
    const P = pogo(Fw, K.away[0] + 8 - NF, K.skid, fromP, benchSpot, 3, 0.45);
    S.pos = P.pos; S.sq = Fw > K.skid - 3 ? 0.2 : P.sq; S.yaw = lerp(faceOut(A.tokWin) - 0.55, yawBench, sm((Fw - K.away[0] + NF) / 26)); S.lean = -0.2 * sg(Fw, K.away[0] + 8 - NF, K.away[0] + 12 - NF);
    if (Fw < K.away[0] + 8 - NF) { S.face = 'star'; S.hands = [S.pos[0], 0.9, S.pos[2]]; return S; }
    S.face = 'determined';
    S.hands = [S.pos[0], S.pos[1] + 0.9, S.pos[2]];
    return S;
  }
  if (F < K.hopOff[1] + 2) {
    S.pos = benchSpot; S.yaw = yawBench;
    if (F < K.skid + 6) S.sq = ringv(F - K.skid, 0.2, 0.9, 0.25);
    // looks up at the 164 stack beside it (to its right, screen left) and gulps
    if (F >= K.lookUp[0] && F < K.show[0]) { S.lookUp = sm((F - K.lookUp[0]) / 4) * (1 - sm((F - K.pull[1] + 2) / 3)); S.yaw = yawBench - 1.0 * sm((F - K.lookUp[0]) / 4); S.face = F < K.gulp ? 'wide' : 'gulp'; S.tilt = 0.1 * S.lookUp; }
    if (F >= K.gulp && F < K.gulp + 6) S.sq = 0.1 * Math.sin(Math.PI * (F - K.gulp) / 6);
    // takes the top card off the stack ...
    if (F >= K.pull[0] && F < K.show[0]) { S.face = 'determined'; S.armL = lerp(0.35, 2.7, sm(sg(F, K.pull[0], K.pull[0] + 3))) - 1.3 * sm(sg(F, K.pull[1] - 2, K.pull[1] + 1)); S.armLz = 0.3; }
    // ... and holds it up to the lens: THIS operator
    if (F >= K.show[0] && F < K.cardDown[0]) { const u = sg(F, K.show[0], K.show[0] + 4, sm); S.yaw = lerp(yawBench - 1.0, yawBench - 0.3, u); S.face = 'determined'; S.armL = 2.3; S.armR = -0.5; S.armLz = 0.6; S.armRz = 0; S.sq = take(F, K.show[0] + 1, 0.4); }
    // lays it on the bench, inhales (the balloon swells) ...
    if (F >= K.cardDown[0] && F < K.speak[0]) { S.armR = -1.1; S.armRz = -0.6; S.lean = 0.1; S.face = F < K.inhale[0] ? 'calm' : 'determined'; S.sq = -0.16 * sg(F, K.inhale[0], K.speak[0], sm); }
    // ... and speaks the tokens: O-mouth, the balloon pumps once per token
    if (F >= K.speak[0] && F < K.speak[1] + 3) { const k = (F - K.speak[0]) % K.tokEvery; S.speak = 1; S.face = k < 2 ? 'speak2' : 'speak'; S.sq = k < 1 ? 0.12 : -0.06; S.lean = 0.14; S.armL = 0.7; S.armR = -0.9; }
    if (F >= K.speak[1] + 3 && F < K.wind[0]) { S.face = 'happy'; if (F >= K.plate[0] && F < K.plate[1]) { S.armR = -1.3; S.armRz = -0.7; } }
    if (F >= K.wind[0] && F < K.wind[1]) { S.face = 'determined'; S.armR = -1.5 + 0.35 * Math.sin((F - K.wind[0]) * Math.PI / 2); S.armRz = -0.4; S.lean = 0.2; }
    if (F >= K.hopOff[0]) { S.face = 'happy'; S.armR = -2.4; S.armRz = -0.4; }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  // ---- B2: follows Kern towards the gate; CLANG; the error slip slaps its face; peels and reads it; fixes the token
  const thGateStop = B2.thStop;
  const catchP = B2.tok;
  const yawG = faceOut(thGateStop - 0.33) + 0.45;              // faces the lens, turned towards Kern and the gate
  if (F < K.lift[1] + 6) {
    if (F < K.flick[1]) {
      const P = pogo(F, K.drive1[0] + 4, K.clang - 2, B1.tok, catchP, 6, 0.3);
      S.pos = P.pos; S.sq = P.sq; S.yaw = F < K.clang - 2 ? headingAt(lerp(A.bench, thGateStop, 0.6)) : lerp(headingAt(thGateStop), yawG, sg(F, K.clang - 2, K.clang + 6, sm));
      S.face = F < K.clang ? 'calm' : 'wide';
      if (F >= K.clang && F < K.clang + 6) S.sq = take(F, K.clang, 0.8);
      if (F >= K.slip[1]) { S.armL = 2.6; S.armR = -2.6; S.face = 'shut'; }       // splat: the slip is on its face
    } else {
      S.pos = catchP; S.yaw = yawG;
      S.face = F < K.peel[0] ? 'shut' : F < K.peel[1] ? 'think' : F < K.lift[0] ? 'determined' : 'happy';
      if (F < K.peel[0]) { S.armL = 2.6 - 0.4 * Math.sin(F * 1.3); S.armR = -2.6 + 0.4 * Math.sin(F * 1.1); }
      if (F >= K.peel[0] && F < K.peel[1]) { S.armL = lerp(2.4, 1.3, sg(F, K.peel[0], K.peel[0] + 3)); S.armLz = 0.9; S.lookUp = -0.3; }
      if (F >= K.peel[1] && F < K.lift[0]) { S.lean = 0.3; S.lookUp = -0.35; S.armR = -1.0; S.armRz = -0.9; }   // leans over Kern
      if (F >= K.lift[0]) { S.armL = 0.4; S.armR = -2.3; S.face = 'happy'; if (F < K.lift[0] + 8) S.sq = take(F, K.lift[0], 0.5); }
    }
    S.hands = [S.pos[0], S.pos[1] + 0.95, S.pos[2]];
    return S;
  }
  // ---- B3 .. B4: hops along the infield kerb behind the action; watches the weigh-in and the race
  const kerb = (th) => polar(th, R.kerb, 0);
  if (F < K.go1) {
    const spot = polar(A.scale - 0.3, 7.25, 0);                // the open side of the scale, behind Kern, in view
    const P = pogo(F, K.lift[1] + 6, K.toScale[1], catchP, spot, 5, 0.3);
    S.pos = P.pos; S.sq = P.sq; S.yaw = faceOut(A.scale - 0.3) + 0.45;
    S.face = F >= K.settle[0] && F < K.flag ? 'worried' : F >= K.flag ? 'happy' : 'calm';
    if (F >= K.flag && F < K.flag + 14) { S.armR = -2.4; S.sq = -0.08 * Math.sin(Math.PI * (F - K.flag) / 14); }
    if (F >= K.cut) { S.pos = polar(A.finish + 0.4, 3.9, 0); S.yaw = faceOut(A.finish + 0.4) - 0.9; S.face = 'worried'; }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  if (F < K.tokIn[1]) {   // watches the race from the infield, covers its eyes, then hops to the finish
    if (F < K.tokIn[0]) {
      S.pos = polar(A.finish + 0.4, 3.9, 0); S.yaw = faceOut(A.finish + 0.4) - 0.9 + 0.3 * sm((F - K.go1) / 20);
      S.face = F < K.oroRun1[1] ? 'wide' : 'shut'; if (F >= K.oroRun1[1] + 6) { S.armL = 2.6; S.armR = -2.6; S.armLz = 0.9; S.armRz = -0.9; }
    } else {
      const P = pogo(F, K.tokIn[0], K.tokIn[1], polar(A.finish + 0.4, 3.9, 0), polar(A.finish + 0.27, 5.95, 0), 2, 0.5);
      S.pos = P.pos; S.sq = P.sq; S.yaw = faceOut(A.finish + 0.27) - 0.5; S.face = 'determined';
    }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  // ---- B5: the idea + speaking the fix, beside Kern at the finish (inner side of Kern)
  const refP = polar(A.finish + 0.27, 5.95, 0);
  if (F < K.lap2[0] + 4) {
    S.pos = refP; S.yaw = faceOut(A.finish + 0.27) - 0.5;
    if (F < K.tokIn[1] + 4) S.sq = ringv(F - K.tokIn[1], 0.2, 0.9, 0.25);
    S.face = F < K.idea ? 'think' : F < K.speak2[0] ? 'idea' : F < K.speak2[1] + 2 ? ((F - K.speak2[0]) % 3 < 2 ? 'speak' : 'speak2') : 'happy';
    if (F >= K.idea && F < K.idea + 10) { S.sq = take(F, K.idea, 1.1); S.lookUp = 0.4; }
    if (F >= K.speak2[0] && F < K.speak2[1]) { S.sq = (F - K.speak2[0]) % 3 < 1 ? 0.1 : -0.05; S.lean = 0.15; }
    if (F >= K.rev[0]) { S.armR = -2.3; S.face = 'happy'; }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  // ---- B6..B7: rides the infield in the lap, watches race 2 from the kerb near the finish
  if (F < K.cross) {
    S.pos = polar(A.finish + 0.85, 3.3, 0); S.yaw = faceOut(A.finish + 0.85) - 0.9;
    S.face = F < K.go2 ? 'determined' : 'worried';
    if (F >= K.go2) { S.armL = 1.4 + 0.5 * Math.sin(F * 0.9); S.armR = -1.4 - 0.5 * Math.sin(F * 0.9 + 1); S.sq = 0.05 * Math.sin(F * 1.8); }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  // ---- B8: star-eyed leap at the left of the letters; B9: zips back to the bench
  {
    const base = polar(A.tokWin, 5.3, 0);
    const hopIn = pogo(F, K.hold[1], K.watch[1] + 2, polar(A.finish + 0.85, 3.3, 0), base, 3, 0.45);
    S.pos = F < K.watch[1] + 2 ? hopIn.pos : base.slice(); S.sq = F < K.watch[1] + 2 ? hopIn.sq : 0; S.yaw = faceOut(A.tokWin) - 0.55;
    S.face = F < K.leap[0] ? 'wide' : 'star';
    if (F >= K.leap[0] && F < K.leap[1]) { const h = hop(F, K.leap[0] + 3, K.leap[1] - 4, 0.6); S.pos[1] += h.y; S.sq = h.sq; S.armL = 2.7; S.armR = -2.7; }
    if (F >= K.away[0]) {
      const P = pogo(F, K.away[0], NF + K.skid, base, B1.tok, 4, 0.4);
      S.pos = P.pos; S.sq = P.sq; S.yaw = headingAt(A.finish + 0.4); S.lean = -0.25; S.face = 'determined';
    }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
}

// ------------------------------------------------------------------------------------------------
// Dash (the one-shot kernel): zips in on the inner lane, sticks in the gate, stays stuck
// ------------------------------------------------------------------------------------------------
export function dashState(F) {
  if (F < K.dash[0] || F >= K.away[0]) return { vis: false };
  const thStick = A.gate - 0.02;
  if (F < K.clang + 1) {
    const u = sg(F, K.dash[0], K.clang + 1);
    const th = lerp(A.bench - 0.5, thStick, u);
    return { vis: true, pos: polar(th, R.oro, 0.9 + 0.12 * Math.sin(u * 9)), yaw: headingAt(th), roll: 0, quiver: 0 };
  }
  const a = F - K.clang;
  return { vis: true, pos: polar(thStick, R.oro, 0.9), yaw: headingAt(thStick), roll: 0.05, quiver: 0.12 * Math.exp(-a / 14) * Math.sin(a * 2.4) + 0.02 * Math.sin(a * 0.9), droop: sm(a / 40) };
}

// ------------------------------------------------------------------------------------------------
// the gate, the weigh-in, the stopwatch, the tokens
// ------------------------------------------------------------------------------------------------
export function gateState(F) {
  // grate drop: 0 = raised, 1 = shut. lane 0 = outer (ours), lane 1 = inner (Dash)
  const slam = (f) => (F < f - 2 ? 0 : F < f ? sm((F - f + 2) / 2) : 1);
  let ours = slam(K.clang), theirs = slam(K.clang);
  ours -= sg(F, K.lift[0], K.lift[1], sm);
  if (F >= K.gate2 - 12 && F < K.gate2 + 10) ours = 0;
  if (F < K.drive1[0] - 30 || F >= K.away[0]) { ours = 0; theirs = 0; }      // (reset while off-screen, before B2)
  if (F >= K.away[0] || F < K.clang - 2) theirs = 0;
  const face = F >= K.clang - 6 && F < K.lift[0] ? 'angry' : F >= K.lift[0] && F < K.lift[1] + 10 ? 'ok' : F >= K.gate2 - 6 && F < K.gate2 + 8 ? 'ok' : F > K.lift[1] + 10 && F < K.lap2[0] ? 'doze' : 'grump';
  const lamp = F >= K.clang - 4 && F < K.lift[0] ? 'coral' : (F >= K.lift[0] && F < K.lift[1] + 16) || (F >= K.gate2 - 6 && F < K.gate2 + 10) ? 'emerald' : 'off';
  const bat = 0;
  const nod = F >= K.lift[0] && F < K.lift[0] + 10 ? Math.sin(Math.PI * sg(F, K.lift[0], K.lift[0] + 10)) : F >= K.gate2 - 4 && F < K.gate2 + 6 ? Math.sin(Math.PI * sg(F, K.gate2 - 4, K.gate2 + 6)) : 0;
  return { ours: clamp(ours), theirs: clamp(theirs), face, lamp, bat, nod, shake: F >= K.clang && F < K.clang + 8 ? Math.exp(-(F - K.clang) / 3) : 0 };
}

export function scaleState(F) {
  // beam tilt (rad, + = left pan down), needle angle, flag, PASS flood. With only the reference block on the right pan the
  // beam hangs right-down and the needle is pegged in the coral; when Kern's output lands it swings, overshoots, settles.
  const TILT0 = 0.2, swing = (a) => -TILT0 * Math.exp(-a / 6) * Math.cos(a * 0.5);
  let tilt = -TILT0, flag = 0, blockL = 0, flood = 0;
  const first = F >= K.eject[1] && F < K.cut + 30;
  const second = F >= K.scale2 && F < K.side2[0];
  if (first) { tilt = swing(F - K.eject[1]); blockL = 1; }
  if (second) { tilt = swing((F - K.scale2) * 1.6); blockL = 1; }
  if (F >= K.flag && F < K.cut + 20) { flag = ob((F - K.flag) / 6); flood = sg(F, K.flag - 2, K.flag + 5, sm) * (1 - 0.6 * sg(F, K.flag + 14, K.flag + 22, sm)); }
  if (F >= K.scale2 + 5 && F < K.side2[0]) { flag = ob((F - K.scale2 - 5) / 5); flood = sg(F, K.scale2 + 3, K.scale2 + 8, sm); }
  return { tilt, needle: tilt * 3.0, flag, blockL, flood };
}

/** stopwatch hands: angles (rad, clockwise from 12) for [coral (oracle), emerald (ours)] and the button press.
 *  One turn per WATCH_TURN frames, so no hand laps: the coral hand stops at 6 o'clock in both races (the oracle's fixed
 *  time); race 1 the emerald hand stops far past it, race 2 just short of it. The insert after the photo finish replays the
 *  last race frames slowed down (race time 541 -> 552), so the emerald hand visibly stops first. */
export const WATCH_TURN = 72;
export function watchState(F) {
  const ang = (t, f0, stop) => (Math.max(0, Math.min(t, stop) - f0)) / WATCH_TURN * TAU;
  let coral = 0, emerald = 0, rt = F;
  if (F >= K.go1 - 20 && F < K.lap2[0] + 20) { coral = ang(F, K.go1, K.go1 + ORO_RUN); emerald = ang(F, K.go1, K.kernRun1[1]); }
  if (F >= K.lap2[1] - 10) {
    rt = raceF(F);
    if (F >= K.watch[0] && F < K.watch[1]) rt = lerp(K.cross - 3, K.go2 + ORO_RUN + 1, sg(F, K.watch[0] + 1, K.watch[1] - 5));
    coral = ang(rt, K.go2, K.go2 + ORO_RUN); emerald = ang(rt, K.go2, K.cross);
  }
  const press = Math.max(F >= K.go1 - 2 && F < K.go1 + 4 ? 1 : 0, F >= K.go2 - 2 && F < K.go2 + 4 ? 1 : 0);
  // stop clicks (race time) for the insert: the emerald hand stops first
  const inIns = F >= K.watch[0] && F < K.watch[1];
  return { coral, emerald, press, rt, stopE: inIns && rt >= K.cross, stopC: inIns && rt >= K.go2 + ORO_RUN, inIns };
}

/** token flights: B1 builds the shell (8 tokens), B5 the fresh parts. Returns per-token progress (0 = in the mouth, 1 = placed). */
export function tokenFlight(F, i, which = 1) {
  if (which === 1) { const f0 = K.speak[0] + i * K.tokEvery; return sg(F, f0, f0 + K.tokFly); }
  const f0 = K.speak2[0] + i * 3; return sg(F, f0, f0 + 8);
}

export { hsh, wrapF };
