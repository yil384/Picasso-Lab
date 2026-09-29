// tg_anim.js - the timeline of "The Loop": key frames, paths and poses (pure functions of the frame F).
// Ring coordinates: an angle th (radians, +x towards +z) and a radius r; the track runs th-increasing.
import { TAU, clamp, lerp, sg, sm, io, ob, mj, mjv, ringv, bumpv, hsh, take, hop, tw, step } from './tg_time.js';

export const NF = 660;
// station angles (radians) and radii
export const A = { bench: 0.0, gate: 0.95, scale: 1.95, start: 3.0, finish: 4.85 };
export const R = { track: 6.0, lanes: [5.45, 6.55], ours: 6.55, oro: 5.45, bench: 8.3, tokBench: 7.72, kerb: 4.62, scale: 8.15 };
export const L2 = TAU;   // lap 2 offset

// ------------------------------------------------------------------------------------------------
// key frames (see STORYBOARD.md)
// ------------------------------------------------------------------------------------------------
export const K = {
  // B1 write
  skid: 8, lookUp: [10, 26], gulp: 18, crack: [26, 38], speak: [40, 64], tokEvery: 3, tokFly: 9,
  wheels: [58, 66], cow: 64, eyes: 70, wind: [72, 84], hopOff: [86, 95],
  // B2 compile
  drive1: [96, 128], dash: [112, 131], clang: 131, flick: [133, 147], slip: [134, 150], peel: [150, 160],
  press: [160, 168], lift: [166, 178], setDown: [164, 172], through: [172, 191], ripple: [180, 190],
  // B3 verify
  toScale: [192, 214], eject: [214, 223], settle: [223, 238], flag: 240, dialPush: [244, 264],
  // B4 race 1
  cut: 264, tune: [268, 284], side: [284, 296], kgulp: 292, go1: 300, oroRun1: [300, 326], kernRun1: [300, 352],
  buff: [330, 359], crash: [352, 362],
  // B5 refine
  tokIn: [356, 368], idea: 370, speak2: [378, 396], popOff: 380, snapOn: [386, 396], nose: 396, rev: [400, 418],
  // B6 lap 2
  lap2: [420, 486], gate2: 443, scale2: 459, oroBack: [420, 470],
  // B7 race 2
  side2: [488, 496], dtake: 497, go2: 508, run2: [508, 552], cross: 551, freeze: [552, 554],
  // B8 payoff
  slam: 566, check: 578, jaw: 586, laurel: 590, nod: [604, 614], leap: [596, 618],
  // B9 next
  away: [630, 660],
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
export function kernTh(F) {   // ring angle of Kern in the races (lap offset included for race 2)
  if (F < K.lap2[0]) return sprint(F, K.go1, K.kernRun1[1], A.start, A.finish, 1.25, 10, P1.kEnd);
  return L2 + sprint(F, K.go2, K.cross, A.start, A.finish, 1.5, 8, 0.2);
}
export function oroTh(F) {
  if (F < K.lap2[0]) return sprint(F, K.go1, K.oroRun1[1], A.start, A.finish, 1.4, 16, P1.oEnd);
  return L2 + sprint(F, K.go2, K.cross + 1.5, A.start, A.finish, 1.45, 18, 0.5);
}

/**
 * Kern's state: { vis, pos:[x,y,z], yaw, sq, bob, wheelAng, compiled (0..1 ripple), round, cow (0 crooked..1 flat),
 * nose, face, onBench, tiles (assembly progress per tile), stuckAt }
 */
export function kernState(F) {
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
  const benchTop = polar(A.bench + 0.1, R.bench - 0.05, 0.8);
  const laneStart = lanePos(A.bench + 0.16);
  if (F < K.hopOff[0]) {
    S.pos = benchTop; S.yaw = headingAt(A.bench) + 0.35; S.onBench = true;
    S.face = F < K.eyes ? 'shut' : F < K.eyes + 8 ? 'wide' : 'calm';
    if (F >= K.wind[0] && F < K.wind[1]) { const k = (F - K.wind[0]) % 4; S.sq = k < 2 ? 0.1 : -0.04; S.keySpin = (F - K.wind[0]) / 4 * Math.PI; S.face = 'squint'; }
    if (F >= K.eyes && F < K.eyes + 6) S.sq = take(F, K.eyes, 0.8);
    return S;
  }
  if (F < K.drive1[0]) {   // hop down
    const u = (F - K.hopOff[0]) / (K.hopOff[1] - K.hopOff[0]);
    S.pos = benchTop.map((v, i) => lerp(v, laneStart[i], sm(u)));
    S.pos[1] += 0.5 * Math.sin(Math.PI * u);
    S.yaw = lerp(headingAt(A.bench) + 0.35, headingAt(A.bench + 0.16), sm(u));
    S.sq = u < 0.2 ? 0.12 : -0.1 * Math.sin(Math.PI * u);
    S.face = 'determined';
    return S;
  }
  // ---- B2: drive to the gate, CLANG, flicked back to Tok, fixed, through the gate
  const thGateStop = A.gate - 0.105;
  if (F < K.clang) {
    const u = sg(F, K.drive1[0], K.drive1[1]);
    const th = lerp(A.bench + 0.16, thGateStop, u * 0.35 + 0.65 * u * u);
    const sb = squareBob((th - (A.bench + 0.16)) * R.ours);
    S.pos = lanePos(th, R.ours, sb.bob); S.yaw = headingAt(th); S.wheelAng = sb.ang; S.lurch = sb.thunk ? 1 : 0;
    S.pitch = 0.08 * Math.sin(sb.ang * 4);
    S.face = F > K.clang - 6 ? 'wide' : 'determined';
    return S;
  }
  const tokCatch = tokState(K.flick[1]).hands;   // where Tok's mitts are at the catch
  if (F < K.flick[1]) {    // bounce off the bars, flicked back in an arc, spinning
    const u = (F - K.clang) / (K.flick[1] - K.clang);
    const a = lanePos(thGateStop, R.ours, 0);
    S.pos = [lerp(a[0], tokCatch[0], sm(u)), lerp(0, tokCatch[1] - 0.25, u) + 0.9 * Math.sin(Math.PI * u), lerp(a[2], tokCatch[2], sm(u))];
    S.yaw = headingAt(thGateStop) + TAU * ob(u) * 0.9; S.roll = 0.6 * Math.sin(Math.PI * u);
    S.face = 'dizzy'; S.sq = F < K.clang + 3 ? 0.25 : 0;
    return S;
  }
  if (F < K.setDown[1]) {  // in Tok's mitts: held, cowlick pressed flat, then set down
    const h = tokState(F).hands;
    const u = sg(F, K.setDown[0], K.setDown[1], sm);
    const down = lanePos(thGateStop - 0.1, R.ours, 0);
    S.pos = [lerp(h[0], down[0], u), lerp(h[1] - 0.25, 0, u), lerp(h[2], down[2], u)];
    S.yaw = headingAt(thGateStop) + 0.4 * (1 - u);
    S.face = F < K.press[0] ? 'dizzy' : F < K.press[1] + 2 ? 'squint' : 'calm';
    if (F >= K.press[0] && F < K.press[1]) S.sq = 0.18 * Math.sin(Math.PI * sg(F, K.press[0], K.press[1]));
    return S;
  }
  // through the gate (still square wheels) and on towards the weigh-in
  const thAfter = A.gate + 0.42;
  if (F < K.toScale[0]) {
    const u = sg(F, K.through[0], K.toScale[0]);
    const th = lerp(thGateStop - 0.1, thAfter, u);
    const sb = squareBob((th - thGateStop) * R.ours);
    S.pos = lanePos(th, R.ours, sb.bob); S.yaw = headingAt(th); S.wheelAng = sb.ang; S.lurch = sb.thunk ? 1 : 0;
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
    if (F >= K.away[0]) S.vis = false;
    S.showCheck = F >= K.check;
    return S;
  }
}

// ------------------------------------------------------------------------------------------------
// Oro (the oracle)
// ------------------------------------------------------------------------------------------------
export function oroState(F) {
  const S = { vis: F >= K.cut - 20 && F < K.away[0] + 6, face: 'smug', wheelAng: 0, keySpin: 0, sq: 0, stretch: 0, laurelSlip: 0, wrench: 0, buff: 0, pitch: 0 };
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
  if (F < K.side2[0]) {   // cruises round ahead of Kern and parks at the start line again
    const u = sg(F, K.oroBack[0], K.oroBack[1], (x) => x * x * (3 - 2 * x));
    const th = lerp(thF + P1.oEnd, L2 + thS, u);
    S.pos = lane(th); S.yaw = headingAt(th); S.wheelAng = (th - thF) * R.oro / 0.1; S.face = 'smug';
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
  const S = { face: 'calm', sq: 0, lean: 0, armL: 0.35, armR: -0.35, armLz: 0, armRz: 0, lookUp: 0, speak: 0, tilt: 0, vis: true };
  const benchSpot = polar(A.bench - 0.02, R.tokBench, 0);
  const yawBench = faceOut(A.bench - 0.02);
  // ---- B9 -> B1: arrives from the finish (whip), skids at the bench
  const Fw = F >= K.away[0] ? F - NF : F;
  if (Fw < K.skid) {
    const fromP = polar(A.finish + 0.35 - L2, 7.4, 0);
    const P = pogo(Fw, K.away[0] - NF, K.skid, fromP, benchSpot, 4, 0.4);
    S.pos = P.pos; S.sq = Fw > K.skid - 3 ? 0.2 : P.sq; S.yaw = lerp(headingAt(A.finish) , yawBench, sm((Fw - K.away[0] + NF) / 30)); S.lean = -0.25;
    S.face = 'determined';
    S.hands = [S.pos[0], S.pos[1] + 0.9, S.pos[2]];
    return S;
  }
  if (F < K.hopOff[1] + 2) {
    S.pos = benchSpot; S.yaw = yawBench;
    if (F < K.skid + 6) S.sq = ringv(F - K.skid, 0.2, 0.9, 0.25);
    // look up at the stack (it stands to Tok's right), gulp
    if (F >= K.lookUp[0] && F < K.crack[0]) { S.lookUp = sm((F - K.lookUp[0]) / 5); S.yaw = yawBench + 0.5 * S.lookUp; S.face = F < K.gulp ? 'wide' : 'gulp'; S.tilt = -0.12 * S.lookUp; }
    if (F >= K.gulp && F < K.gulp + 6) S.sq = 0.1 * Math.sin(Math.PI * (F - K.gulp) / 6);
    // crack knuckles + inhale (balloon swells)
    if (F >= K.crack[0] && F < K.speak[0]) { const u = sg(F, K.crack[0], K.speak[0]); S.face = 'determined'; S.armL = 1.2; S.armR = -1.2; S.armLz = 0.9; S.armRz = -0.9; S.sq = -0.14 * sm(u); if (F < K.crack[0] + 8 && (F - K.crack[0]) % 4 < 2) S.armLz += 0.2; }
    // speak the tokens: the balloon pumps once per token
    if (F >= K.speak[0] && F < K.speak[1] + 4) { const k = (F - K.speak[0]) % K.tokEvery; S.speak = 1; S.face = k < 2 ? 'speak' : 'speak2'; S.sq = k < 1 ? 0.1 : -0.05; S.lean = 0.12; S.armL = 0.6; S.armR = -0.6; }
    if (F >= K.speak[1] + 4 && F < K.wind[0]) { S.face = 'happy'; }
    if (F >= K.wind[0] && F < K.wind[1]) { S.face = 'determined'; S.armR = -1.6 + 0.4 * Math.sin((F - K.wind[0]) * Math.PI / 2); S.lean = 0.2; }
    if (F >= K.hopOff[0]) { S.face = 'happy'; S.armR = -2.4; S.armRz = -0.4; }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  // ---- B2: follows Kern towards the gate (behind it, same lane), catches it, fixes it
  const thGateStop = A.gate - 0.105;
  const catchP = polar(thGateStop - 0.27, R.ours, 0);
  if (F < K.lift[1] + 6) {
    if (F < K.flick[1]) {
      const P = pogo(F, K.drive1[0] + 4, K.flick[1] - 4, polar(A.bench + 0.06, 7.2, 0), catchP, 6, 0.3);
      S.pos = P.pos; S.sq = P.sq; S.yaw = headingAt(lerp(A.bench, thGateStop, 0.6)); S.face = F < K.clang ? 'calm' : 'wide';
      if (F >= K.clang && F < K.clang + 6) S.sq = take(F, K.clang, 0.7);
      S.armL = F >= K.clang + 6 ? 1.3 : 0.35; S.armR = F >= K.clang + 6 ? -1.3 : -0.35;
    } else {
      S.pos = catchP; S.yaw = headingAt(thGateStop) + 0.9;
      S.armL = 1.25; S.armR = -1.25; S.armLz = 0.5; S.armRz = -0.5;
      if (F < K.flick[1] + 6) S.sq = ringv(F - K.flick[1], 0.18, 0.9, 0.25);
      S.face = F < K.peel[0] ? 'squint' : F < K.peel[1] ? 'think' : F < K.press[0] ? 'wide' : F < K.press[1] ? 'determined' : 'happy';
      if (F >= K.peel[0] && F < K.peel[1]) { S.armL = 2.2; S.armLz = 0.2; }
      if (F >= K.press[0] && F < K.press[1]) { S.armR = -0.9; S.armRz = -1.0; }
      if (F >= K.setDown[1]) { S.armL = 0.4; S.armR = -2.3; S.armLz = 0; S.armRz = 0; S.face = 'happy'; }
    }
    const fw = [Math.cos(S.yaw), 0, -Math.sin(S.yaw)];    // local +x in world
    const fz = [Math.sin(S.yaw), 0, Math.cos(S.yaw)];     // local +z (face) in world
    S.hands = [S.pos[0] + fz[0] * 0.55, S.pos[1] + 0.95, S.pos[2] + fz[2] * 0.55];
    return S;
  }
  // ---- B3 .. B4: hops along the infield kerb behind the action; watches the weigh-in and the race
  const kerb = (th) => polar(th, R.kerb, 0);
  if (F < K.go1) {
    const P = pogo(F, K.lift[1] + 6, K.toScale[1], catchP, kerb(A.scale - 0.05), 5, 0.3);
    S.pos = P.pos; S.sq = P.sq; S.yaw = faceOut(A.scale - 0.05) + 0.3;
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
    S.pos = polar(A.finish + 0.62, 2.95, 0); S.yaw = faceOut(A.finish + 0.62) - 0.9;
    S.face = F < K.go2 ? 'determined' : 'worried';
    if (F >= K.go2) { S.armL = 1.4 + 0.5 * Math.sin(F * 0.9); S.armR = -1.4 - 0.5 * Math.sin(F * 0.9 + 1); S.sq = 0.05 * Math.sin(F * 1.8); }
    S.hands = [S.pos[0], 0.9, S.pos[2]];
    return S;
  }
  // ---- B8: star-eyed leap at the left of the letters; B9: zips back to the bench
  {
    const base = polar(A.finish + 1.22, 5.3, 0);
    const hopIn = pogo(F, K.cross + 4, K.leap[0] - 2, polar(A.finish + 0.62, 2.95, 0), base, 3, 0.45);
    S.pos = F < K.leap[0] - 2 ? hopIn.pos : base.slice(); S.sq = F < K.leap[0] - 2 ? hopIn.sq : 0; S.yaw = faceOut(A.finish + 1.22) - 0.55;
    S.face = F < K.leap[0] ? 'wide' : 'star';
    if (F >= K.leap[0] && F < K.leap[1]) { const h = hop(F, K.leap[0] + 3, K.leap[1] - 4, 0.9); S.pos[1] += h.y; S.sq = h.sq; S.armL = 2.7; S.armR = -2.7; }
    if (F >= K.away[0]) {
      const P = pogo(F, K.away[0], NF + K.skid, base, polar(L2 + A.bench + 0.02, R.tokBench, 0), 4, 0.4);
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
    return { vis: true, pos: polar(th, R.oro, 0.45 + 0.1 * Math.sin(u * 9)), yaw: headingAt(th), roll: 0, quiver: 0 };
  }
  const a = F - K.clang;
  return { vis: true, pos: polar(thStick, R.oro, 0.45), yaw: headingAt(thStick), roll: 0.05, quiver: 0.12 * Math.exp(-a / 14) * Math.sin(a * 2.4) + 0.02 * Math.sin(a * 0.9), droop: sm(a / 40) };
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
  const face = F >= K.clang - 6 && F < K.flick[1] ? 'angry' : F >= K.lift[0] && F < K.lift[1] + 10 ? 'ok' : F >= K.gate2 - 6 && F < K.gate2 + 8 ? 'ok' : F > K.lift[1] + 10 && F < K.lap2[0] ? 'doze' : 'grump';
  const lamp = F >= K.clang - 4 && F < K.lift[0] ? 'coral' : (F >= K.lift[0] && F < K.lift[1] + 16) || (F >= K.gate2 - 6 && F < K.gate2 + 10) ? 'emerald' : 'off';
  const bat = F >= K.clang + 1 && F < K.flick[0] + 8 ? Math.sin(Math.PI * sg(F, K.clang + 1, K.flick[0] + 8)) : 0;
  return { ours: clamp(ours), theirs: clamp(theirs), face, lamp, bat, shake: F >= K.clang && F < K.clang + 8 ? Math.exp(-(F - K.clang) / 3) : 0 };
}

export function scaleState(F) {
  // beam tilt (rad, + = left pan down), needle angle, flag
  let tilt = 0, flag = 0, blockL = 0;
  const first = F >= K.eject[1] && F < K.cut + 30;
  const second = F >= K.scale2 && F < K.side2[0];
  if (first) { const a = F - K.eject[1]; tilt = 0.22 * Math.exp(-a / 5) * Math.cos(a * 0.55); blockL = 1; }
  if (second) { const a = F - K.scale2; tilt = 0.1 * Math.exp(-a / 3) * Math.cos(a * 0.7); blockL = 1; }
  if (F >= K.flag && F < K.cut + 20) flag = ob((F - K.flag) / 6);
  if (F >= K.scale2 + 3 && F < K.side2[0]) flag = ob((F - K.scale2 - 3) / 5);
  return { tilt, needle: -tilt * 1.6, flag, blockL };
}

/** stopwatch hands: returns angles (rad, clockwise from 12) for [coral (oracle), emerald (ours)] and the button press */
export function watchState(F) {
  const run = (f0, f1, stop) => (F < f0 ? 0 : (Math.min(F, stop) - f0) / 36 * TAU);   // one turn per 1.5 s
  let coral = 0, emerald = 0;
  if (F >= K.go1 - 20 && F < K.lap2[0] + 20) { coral = run(K.go1, 0, K.oroRun1[1]); emerald = run(K.go1, 0, K.kernRun1[1]); }
  if (F >= K.lap2[1] - 10) { coral = run(K.go2, 0, K.run2[1] + 1); emerald = run(K.go2, 0, K.cross); }
  const press = Math.max(F >= K.go1 - 2 && F < K.go1 + 4 ? 1 : 0, F >= K.go2 - 2 && F < K.go2 + 4 ? 1 : 0);
  return { coral, emerald, press };
}

/** token flights: B1 builds the shell (8 tokens), B5 the fresh parts. Returns per-token progress (0 = in the mouth, 1 = placed). */
export function tokenFlight(F, i, which = 1) {
  if (which === 1) { const f0 = K.speak[0] + i * K.tokEvery; return sg(F, f0, f0 + K.tokFly); }
  const f0 = K.speak2[0] + i * 3; return sg(F, f0, f0 + 8);
}

export { hsh, wrapF };
