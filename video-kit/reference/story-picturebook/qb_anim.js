// qb_anim.js - timeline, acting and camera for "The Convoy" (Qubrio picture-book film).
// Everything here is a pure function of the frame index f (0..359, 24 fps). Characters act on twos
// (tw(f)), the camera moves on ones. Frame 360 == frame 0.
import { ease, clamp, lerp, loopNoise } from '/pv/runtime/pv.js';

export const FPS = 24, NF = 360, TAU = Math.PI * 2;

// ---- world layout (units ~ 1 atom diameter = 0.6) -------------------------------------------------
export const PITCH = 0.9, AR = 0.3, HOVER = 0.68;
export const ROWZ = [1.0, 0.0, -1.0];
export const NCOL = 6, NROW = 3;
export const COLX = (c) => -4.6 + c * PITCH;                 // storage columns: -4.6 .. -0.1
export const DEST = { 2: 1.55, 3: 2.21, 4: 3.35, 5: 4.01 };  // pairs contract to 0.66 (no crossing: 2<3<4<5)
export const ZONE = { x0: 0.95, x1: 4.75, z0: -1.55, z1: 1.65 };
export const SLAB = { x0: -6.8, x1: 6.4, z0: -2.05, z1: 2.05, h: 0.34 };
export const ROOK0 = 1.1;                                    // loco centre x at rest (head of the convoy)
export const TICK = { x: 4.6, z: -3.1 };
export const CONVOY = (r, c) => r <= 1 && c >= 2;

// ---- timeline (frames) ------------------------------------------------------------------------------
export const F = {
  pipWake: 8, tapA: 46, tapB: 63, point: [64, 74],
  rookWake: 66, toot: 86, aodOn: [80, 92],
  move: [98, 140],
  whip: [154, 163],
  batonUp: [168, 184], down: 186, sweep: [187, 194], hit: 194,
  push4: [226, 244], click: 247, slam: 251,
  wipe: [294, 318], wipeCut: 306,
  back: [314, 346],
};

// ---- helpers ------------------------------------------------------------------------------------------
export const tw = (f) => Math.floor(f / 2) * 2;               // on twos
export const sg = (f, a, b, e = ease.linear) => e(clamp((f - a) / (b - a)));
export const mj = (x) => { x = clamp(x); return x * x * x * (10 - 15 * x + 6 * x * x); };
export const mjv = (x) => (x <= 0 || x >= 1 ? 0 : 30 * x * x * (1 - x) * (1 - x));   // d mj / dx (max 1.875)
export const spring = (df, k = 6, w = 18) => (df < 0 ? 0 : Math.exp(-k * df / FPS) * Math.sin(w * df / FPS));
export const easeOutBack = (x) => { x = clamp(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
/** Surprise take peaking at f0 (after ClaudeAnimationBase core.js, MIT): squash, then stretch up that springs back. */
export function take(f, f0, amt = 1) {
  const t = f / FPS, t0 = f0 / FPS;
  if (t < t0 - 0.12) return { sq: 0, dy: 0 };
  if (t < t0) return { sq: 0.14 * amt * ease.smooth(clamp((t - t0 + 0.12) / 0.12)), dy: 0 };
  const a = t - t0;
  return { sq: -0.24 * amt * Math.exp(-6 * a) * Math.cos(16 * a), dy: 0.5 * amt * Math.exp(-7 * a) * Math.max(0, Math.cos(9 * a)) };
}
/** Hop between f0 and f1 (frames): crouch, stretch, squash on landing. */
export function hop(f, f0, f1, h = 0.3) {
  if (f < f0 - 3) return { dy: 0, sq: 0 };
  if (f < f0) return { dy: 0, sq: 0.16 * sg(f, f0 - 3, f0, ease.smooth) };
  if (f < f1) { const k = (f - f0) / (f1 - f0); return { dy: h * 4 * k * (1 - k), sq: -0.14 * Math.abs(1 - 2 * k) }; }
  const a = (f - f1) / FPS; return { dy: 0, sq: 0.2 * Math.exp(-8 * a) * Math.cos(20 * a) };
}
const H = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const hash = H;

// ---- convoy (the ONE AOD move there and back) --------------------------------------------------------
export const convoyK = (f) => mj(sg(f, F.move[0], F.move[1])) - mj(sg(f, F.back[0], F.back[1]));
export const convoyV = (f) => {   // signed speed factor (0..1)
  const a = sg(f, F.move[0], F.move[1]), b = sg(f, F.back[0], F.back[1]);
  return (mjv(a) - mjv(b)) / 1.875;
};
/** AOD grip strength (rails drawn / cones ochre) 0..1 */
export const aodK = (f) => sg(f, F.aodOn[0], F.aodOn[1]) * (1 - sg(f, 346, 354));
export function atomX(r, c, f) {
  const x0 = COLX(c);
  if (!CONVOY(r, c)) return x0;
  return x0 + (DEST[c] - x0) * convoyK(f);
}
export const rookX = (f) => {
  const k = convoyK(f);
  const back = -0.1 * Math.sin(Math.PI * sg(f, 90, 98)) * (f < 120 ? 1 : 0);      // anticipation: backs into the couplings
  const brake = 0.06 * spring(f - F.move[1], 7, 16) - 0.05 * spring(f - F.back[1], 7, 16);
  return ROOK0 + (DEST[5] - COLX(5)) * k + back + brake;
};

// ---- the atoms' acting ----------------------------------------------------------------------------------
// eyes: sleep | half | open | wide | squeeze | happy | star | heart ;  mouth: null | o | smile | grin | yawn | wobble
export function atomActing(r, c, f) {
  const k = r * NCOL + c, ph = H(k + 3);
  const convoy = CONVOY(r, c);
  const o = { eyes: 'sleep', mouth: null, blush: 0, look: [0, 0], turn: [0, 0], sq: 0, st: 0, dy: 0, lean: 0, emote: null, zzz: 0 };
  // breathing: 30 f per breath (12 breaths per loop), own phase
  o.sq = 0.035 * Math.sin(TAU * (f / 30 + ph));
  o.dy = 0.018 * Math.sin(TAU * (f / 30 + ph + 0.25));
  if (!convoy) {
    // storage sleepers: two peek at the toot, a row-2 atom watches the convoy leave, all squint at the flash
    o.zzz = (k === 1 || k === 13) ? 1 : 0;
    if ((k === 6 || k === 13) && f >= F.toot && f < F.toot + 30) {
      o.eyes = f < F.toot + 3 ? 'squeeze' : 'wide'; o.emote = k === 13 ? { type: 'sweat', age: f - F.toot } : null;
      const tk = take(f, F.toot + 2, 0.6); o.sq += tk.sq; o.dy += tk.dy * 0.4; o.zzz = 0;
    }
    if (r === 2 && (c === 3 || c === 5) && f >= 100 && f < 160) { o.eyes = f < 104 ? 'half' : 'open'; o.look = [0.6, -0.1]; o.turn = [0.35, 0]; o.zzz = 0; }
    if (f >= F.hit && f < F.hit + 14) { o.eyes = 'squeeze'; o.zzz = 0; }
    if (f >= F.hit + 14 && f < F.hit + 40 && (k % 3 === 0)) { o.eyes = 'open'; o.look = [0.5, 0]; o.turn = [0.3, 0]; o.zzz = 0; }
    return o;
  }
  const pairA = c <= 3, tap = pairA ? F.tapA : F.tapB;
  const wake = r === 0 ? tap : tap + 5 + (c % 2) * 2;
  const partnerDir = c % 2 === 0 ? 1 : -1;            // 2,4 look right at 3,5; 3,5 look left
  if (f < wake - 3) { o.zzz = (k === 3 || k === 11) ? 1 : 0; return o; }
  const tk = take(f, wake, r === 0 ? 1 : 0.7);
  o.sq += tk.sq; o.dy += tk.dy * 0.5;
  if (f < wake) { o.eyes = 'squeeze'; return o; }
  if (f < wake + 9) { o.eyes = 'wide'; o.mouth = 'o'; o.emote = r === 0 ? { type: 'ping', age: f - wake } : null; return o; }
  if (r === 0 && f < wake + 12) o.emote = { type: 'ping', age: f - wake };
  if (f < 70) {
    o.eyes = f < wake + 20 ? 'open' : 'happy'; o.look = [0.55 * partnerDir, 0.05]; o.turn = [0.4 * partnerDir, 0];
    o.blush = sg(f, wake + 8, wake + 18) * 0.8; o.mouth = f > wake + 20 ? 'smile' : null;
    return o;
  }
  if (f < F.toot - 2) { o.eyes = 'open'; o.look = [0.7, -0.05]; o.turn = [0.45, 0]; o.blush = 0.5; o.mouth = 'smile'; return o; }
  if (f < F.move[0]) {   // anticipation: squeeze and crouch
    o.eyes = 'squeeze'; o.mouth = 'wobble'; o.blush = 0.4;
    o.sq += 0.13 * sg(f, F.toot, F.move[0] - 2, ease.smooth);
    return o;
  }
  if (f < F.move[1]) {   // the ride
    const v = convoyV(f);
    o.eyes = 'wide'; o.mouth = 'grin'; o.look = [0.6, -0.05]; o.turn = [0.25, 0]; o.blush = 0.35;
    o.st = 0.2 * v; o.sq = -0.06 * v;
    return o;
  }
  const land = (f - F.move[1]) / FPS;
  if (f < 160) {
    o.eyes = 'happy'; o.mouth = 'smile'; o.blush = 0.85;
    o.sq += 0.14 * Math.exp(-7 * land) * Math.cos(18 * land);
    o.lean = 0.07 * partnerDir * sg(f, 144, 150, ease.outBack) * (1 - sg(f, 160, 166));
    o.look = [0.5 * partnerDir, 0]; o.turn = [0.4 * partnerDir, 0];
    return o;
  }
  if (f < F.down) {      // watch the conductor, then turn to the partner
    const turnP = sg(f, 176, 182);
    o.eyes = 'open'; o.blush = 0.6; o.mouth = turnP > 0.5 ? 'smile' : 'wobble';
    o.look = [lerp(0.1, 0.6 * partnerDir, turnP), lerp(-0.55, 0, turnP)];
    o.turn = [lerp(0.05, 0.45 * partnerDir, turnP), lerp(-0.25, 0, turnP)];
    return o;
  }
  if (f < F.hit + 4) { o.eyes = 'squeeze'; o.blush = 0.8; o.sq += 0.1 * sg(f, F.down, F.hit); o.turn = [0.4 * partnerDir, 0]; return o; }
  if (f < 300) {
    const a = f - F.hit - 4;
    o.eyes = a < 40 ? 'star' : (a < 70 ? 'heart' : 'happy'); o.mouth = a < 40 ? 'grin' : 'smile';
    o.blush = 1; o.look = [0.4 * partnerDir, 0]; o.turn = [0.42 * partnerDir, 0];
    const tk2 = take(f, F.hit + 4, 0.8); o.sq += tk2.sq; o.dy += tk2.dy * 0.4;
    if (a > 8 && a < 50 && r === 0 && (c === 2 || c === 5)) o.emote = { type: 'sparkle', age: a - 8 };
    // cheer hops at offset phases (no twinning)
    const hp = hop(f, 262 + Math.round(H(k) * 10), 272 + Math.round(H(k) * 10), 0.18);
    o.dy += hp.dy; o.sq += hp.sq;
    return o;
  }
  // going home: sleepy, yawns, falling asleep one by one
  const sleepAt = 334 + (k % 4) * 4 + r * 3;
  o.blush = 0.5 * (1 - sg(f, 320, 350));
  if (f < sleepAt) {
    o.eyes = 'half';
    const yawnAt = 318 + ((k * 5) % 14);
    if (f >= yawnAt && f < yawnAt + 12) { o.mouth = 'yawn'; o.eyes = 'squeeze'; o.st -= 0.08 * Math.sin(Math.PI * (f - yawnAt) / 12); }
    const v = convoyV(f); o.st += 0.12 * v;
    return o;
  }
  o.zzz = f > sleepAt + 6 && (k % 3 === 0) ? 1 : 0;
  return o;
}

// ---- Pip: the placement compass ---------------------------------------------------------------------------
// A gait is a list of moves; in each, one foot swings round the other (pivot) in the slab plane,
// via the front (+z, towards the camera) or the back. Positions are [x, z].
const PZ = 1.36;
const PIP_HOME = { N: [-5.45, PZ], P: [-5.52, PZ] };
const MOVES = [
  // f0, f1, foot, from, to, via(+1 front,-1 back,0 straight), lift
  [12, 20, 'N', [-5.45, PZ], [-4.6, PZ], 0, 0.25],
  [20, 28, 'P', [-5.52, PZ], [-3.7, PZ], -1, 0.12],
  [28, 36, 'N', [-4.6, PZ], [-2.8, PZ], 1, 0.12],
  [36, 46, 'P', [-3.7, PZ], [-1.9, PZ], 1, 0.0, 'arcA'],       // measure pair A: pencil draws 60deg -> 0
  [48, 55, 'N', [-2.8, PZ], [-1.0, PZ], -1, 0.12],
  [55, 63, 'P', [-1.9, PZ], [-0.1, PZ], 1, 0.0, 'arcB'],       // measure pair B
  [74, 80, 'N', [-1.0, PZ], [-1.0, 1.72], 0, 0.1],             // step back out of the convoy's way
  [80, 86, 'P', [-0.1, PZ], [-0.4, 1.72], 0, 0.1],
  // home again (S5): alternate pivots walking left, then fold up
  [312, 319, 'P', [-0.4, 1.72], [-1.9, 1.62], 1, 0.12],
  [319, 326, 'N', [-1.0, 1.72], [-2.8, 1.52], -1, 0.12],
  [326, 333, 'P', [-1.9, 1.62], [-3.7, 1.44], 1, 0.12],
  [333, 340, 'N', [-2.8, 1.52], [-4.6, 1.36], -1, 0.12],
  [340, 347, 'P', [-3.7, 1.44], [-5.52, PZ], 1, 0.12],
  [347, 353, 'N', [-4.6, 1.36], [-5.45, PZ], 0, 0.08],
];
function swingPos(from, to, pivot, k, via) {
  if (!via) return [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
  const a0 = Math.atan2(from[1] - pivot[1], from[0] - pivot[0]);
  const a1 = Math.atan2(to[1] - pivot[1], to[0] - pivot[0]);
  let d = a1 - a0;
  while (d > Math.PI) d -= TAU; while (d <= -Math.PI) d += TAU;
  const alt = d - Math.sign(d || 1) * TAU;
  const good = (dd) => Math.sign(Math.sin(a0 + dd / 2)) === via;
  if (!good(d) && good(alt)) d = alt;
  const r0 = Math.hypot(from[0] - pivot[0], from[1] - pivot[1]), r1 = Math.hypot(to[0] - pivot[0], to[1] - pivot[1]);
  const a = a0 + d * k, rr = lerp(r0, r1, k);
  return [pivot[0] + Math.cos(a) * rr, pivot[1] + Math.sin(a) * rr];
}
export function pipState(f) {
  const ft = tw(f);
  let N = PIP_HOME.N.slice(), P = PIP_HOME.P.slice();
  let liftN = 0, liftP = 0, arc = null;
  // replay moves up to ft
  for (const m of MOVES) {
    const [f0, f1, foot, from, to, via, lift, tag] = m;
    if (ft < f0) break;
    const k = ft >= f1 ? 1 : ease.inOutSine((ft - f0) / (f1 - f0));
    const pivot = foot === 'N' ? P : N;
    const pos = swingPos(from, to, pivot, k, via);
    const l = ft < f1 ? lift * Math.sin(Math.PI * k) : 0;
    if (foot === 'N') { N = pos; liftN = l; } else { P = pos; liftP = l; }
    if (tag && ft >= f0) {
      // the pencil touches down at 60deg and draws the arc to 0deg (with a small overshoot)
      const a = Math.atan2(pos[1] - pivot[1], pos[0] - pivot[0]);
      const drawing = a < 1.08 + 1e-3;
      if (ft < f1) { liftP = drawing ? 0 : 0.22 * Math.sin(Math.PI * clamp(k / 0.6)); }
      arc = { tag, pivot: pivot.slice(), r: 0.9, a0: 1.05, a1: Math.max(0, Math.min(1.05, a)), done: ft >= f1, f1 };
    }
  }
  // folded (asleep) at home at start / end
  const d = Math.hypot(N[0] - P[0], N[1] - P[1]);
  const L = 2.0;
  const hgt = Math.sqrt(Math.max(0.2, L * L - (d / 2) * (d / 2)));
  const mid = [(N[0] + P[0]) / 2, (N[1] + P[1]) / 2];
  const asleep = ft < F.pipWake || ft >= 354;
  const tk = take(f, F.pipWake + 2, 0.8);
  const bob = asleep ? 0.02 * Math.sin(TAU * f / 30) : 0.04 * Math.abs(Math.sin(TAU * ft / 16));
  // point at the loco (f64-74): stand on N, raise P to the right
  let pointK = sg(ft, F.point[0], F.point[0] + 4, ease.outBack) * (1 - sg(ft, F.point[1], F.point[1] + 4));
  let headX = mid[0], headY = hgt + bob + tk.dy * 0.3;
  if (pointK > 0) {   // stand on the needle, fling the pencil leg out towards the loco
    headX = lerp(mid[0], N[0] + 0.12, pointK); headY = lerp(headY, L + 0.02, pointK);
    P = [lerp(P[0], headX + 1.75, pointK), P[1]]; liftP = lerp(liftP, headY - 0.55, pointK);
  }
  return {
    N, P, liftN, liftP, arc, head: [headX, headY, mid[1]], sq: tk.sq + (asleep ? 0.02 * Math.sin(TAU * f / 30) : 0),
    asleep, pointK, lean: asleep ? 0.12 : 0,
  };
}
export function pipFace(f) {
  const ft = tw(f);
  if (ft < F.pipWake - 2 || ft >= 354) return { eyes: 'sleep', mouth: null, zzz: 1, look: [0, 0], turn: [0, 0] };
  if (ft < F.pipWake + 1) return { eyes: 'squeeze', mouth: null, look: [0, 0], turn: [0, 0] };
  if (ft < F.pipWake + 8) return { eyes: 'wide', mouth: 'o', emote: { type: 'bang', age: ft - F.pipWake }, look: [0, 0], turn: [0, 0] };
  if (ft < 36) return { eyes: 'open', mouth: 'smile', look: [0.5, 0.1], turn: [0.35, 0] };
  if (ft < 64) {   // measuring: squint in concentration, then pleased
    const m = (ft >= 36 && ft < 46) || (ft >= 55 && ft < 63);
    return { eyes: m ? 'focus' : 'happy', mouth: m ? 'tongue' : 'smile', look: [0.3, 0.45], turn: [0.25, 0.25] };
  }
  if (ft < 90) return { eyes: 'open', mouth: 'grin', look: [0.7, 0], turn: [0.45, 0], emote: ft < 74 ? { type: 'sparkle', age: ft - 64 } : null };
  if (ft < 312) return { eyes: 'happy', mouth: 'smile', look: [0.5, 0], turn: [0.3, 0] };
  if (ft < 348) return { eyes: 'half', mouth: ft > 330 && ft < 342 ? 'yawn' : null, look: [-0.5, 0], turn: [-0.35, 0] };
  return { eyes: 'sleep', mouth: null, look: [0, 0], turn: [0, 0], zzz: ft > 352 ? 1 : 0 };
}

// ---- Rook: the routing locomotive -----------------------------------------------------------------------
export function rookState(f) {
  const ft = tw(f);
  const asleep = ft < F.rookWake || ft >= 350;
  let sq = 0, dy = 0, tilt = 0;
  if (asleep) { sq = 0.03 * Math.sin(TAU * f / 30 + 1); }
  const tk = take(ft, F.rookWake, 0.8); sq += tk.sq; dy += tk.dy * 0.3;
  // eager bounces on the beat before the toot
  if (ft > F.rookWake + 8 && ft < F.toot - 8) { const b = Math.abs(Math.sin(Math.PI * (ft - F.rookWake - 8) / 7.5)); dy += 0.06 * b; sq -= 0.05 * b; }
  // toot: squash down, then stretch up with the steam
  if (ft >= F.toot - 8 && ft < F.toot) sq += 0.16 * sg(ft, F.toot - 8, F.toot, ease.smooth);
  if (ft >= F.toot) sq += -0.22 * Math.exp(-5 * (ft - F.toot) / FPS) * Math.cos(14 * (ft - F.toot) / FPS);
  // pull: lean forward while moving; brake: rock back
  const v = convoyV(ft);
  tilt = -0.1 * v * (ft < 200 ? 1 : -1) + 0.07 * spring(ft - F.move[1], 6, 14) - 0.07 * spring(ft - F.back[1], 6, 14);
  // cheer at the hit
  const hp = hop(ft, F.hit + 6, F.hit + 16, 0.25); dy += hp.dy; sq += hp.sq;
  return { x: rookX(f), sq, dy, tilt, asleep, wheel: -(rookX(f) - ROOK0) / 0.2 };
}
export function rookFace(f) {
  const ft = tw(f);
  if (ft < F.rookWake - 2 || ft >= 350) return { eyes: 'sleep', mouth: null, zzz: 1, look: [0, 0] };
  if (ft < F.rookWake + 8) return { eyes: ft < F.rookWake ? 'squeeze' : 'wide', mouth: 'o', look: [0, 0], emote: ft >= F.rookWake ? { type: 'bang', age: ft - F.rookWake } : null };
  if (ft < F.toot - 8) return { eyes: 'happy', mouth: 'grin', look: [-0.3, 0] };
  if (ft < F.toot + 10) return { eyes: 'squeeze', mouth: 'o', look: [0, 0] };
  if (ft < F.move[1]) return { eyes: 'focus', mouth: 'grin', look: [0.5, 0] };
  if (ft < F.hit) return { eyes: 'happy', mouth: 'smile', look: [-0.6, 0] };
  if (ft < 300) return { eyes: ft < F.hit + 40 ? 'star' : 'happy', mouth: 'grin', look: [-0.5, 0] };
  if (ft < 344) return { eyes: 'open', mouth: 'smile', look: [-0.7, 0] };
  return { eyes: 'half', mouth: null, look: [0, 0] };
}

// ---- Tick: the optimize stopwatch -----------------------------------------------------------------------------
export const HAND_STOP = TAU / 4.7;             // the hand stops at 1/4.7 of a turn
export function tickState(f) {
  const ft = tw(f);
  let armR = 0.35, armL = -0.35, rise = 0, sq = 0, bow = 0, jump = 0, crown = 0;
  // idle sway
  const sway = 0.05 * Math.sin(TAU * f / 60);
  // baton up (anticipation) -> downbeat
  const up = sg(ft, F.batonUp[0], F.batonUp[1], ease.inOutSine);
  const down = sg(ft, F.down, F.down + 4, ease.inCubic);
  armR = lerp(0.35, 2.7, up); armR = lerp(armR, -0.3, down);
  rise = 0.1 * up * (1 - down);
  if (ft >= F.down) sq += 0.16 * Math.exp(-6 * (ft - F.down - 4) / FPS) * Math.cos(15 * Math.max(0, ft - F.down - 4) / FPS) * (ft >= F.down + 4 ? 1 : sg(ft, F.down, F.down + 4));
  bow = 0.35 * Math.sin(Math.PI * sg(ft, 204, 224));
  // the click: left hand to the crown
  const reach = sg(ft, 234, 243, ease.inOutSine) * (1 - sg(ft, 252, 258));
  armL = lerp(-0.35, 2.66, reach);
  crown = ft >= F.click && ft < F.click + 3 ? 1 : 0;
  if (ft >= F.click) sq += 0.12 * Math.exp(-7 * (ft - F.click) / FPS) * Math.cos(18 * (ft - F.click) / FPS);
  // leap of joy, baton raised in triumph
  const hp = hop(ft, F.slam + 1, F.slam + 13, 0.45); jump = hp.dy; sq += hp.sq;
  const proud = sg(ft, F.slam + 2, F.slam + 8, ease.outBack) * (1 - sg(ft, 300, 316));
  armR = lerp(armR, 2.5, proud);
  armL = lerp(armL, -1.9, proud * 0.8);
  // hand: reset at 12 o'clock; starts at the toot, stops at the click; resets off-screen in S5
  const hand = ft < F.toot ? 0 : ft < F.click ? HAND_STOP * (ft - F.toot) / (F.click - F.toot) : ft < 330 ? HAND_STOP : 0;
  return { armR, armL, rise, sq, bow, jump, crown, sway: sway * (1 - proud), hand };
}
export function tickFace(f) {
  const ft = tw(f);
  if (ft < 150) return { eyes: 'half', mouth: null, look: [0, 0.2] };
  if (ft < F.batonUp[0]) return { eyes: 'open', mouth: 'smile', look: [-0.3, 0.3] };
  if (ft < F.down) return { eyes: 'focus', mouth: 'wobble', look: [-0.2, 0.4] };
  if (ft < F.down + 8) return { eyes: 'squeeze', mouth: 'grin', look: [0, 0] };
  if (ft < 232) return { eyes: 'happy', mouth: 'smile', look: [0, 0] };
  if (ft < F.click) return { eyes: 'focus', mouth: 'tongue', look: [-0.2, -0.5] };
  if (ft < F.click + 4) return { eyes: 'squeeze', mouth: 'o', look: [0, 0] };
  if (ft < 300) return { eyes: 'star', mouth: 'grin', look: [0, 0], emote: ft < F.slam + 30 ? { type: 'sparkle', age: ft - F.click } : null };
  return { eyes: 'happy', mouth: 'smile', look: [0, 0] };
}

// ---- Slo: the baseline snail (one atom at a time) -------------------------------------------------------------------
// A foreground running gag on the bench's front lane (in front of the chip, never hidden by the atoms): it hauls
// ONE sleeping atom and inches right the whole loop - under one atom-width in 15 s. The convoy blasts past it in
// S2 (the gust spins it round, it ends up dizzy) and sweeps past again on the way home in S5. It is reset
// off-screen under the full wipe cover (f306).
export const SLO = { z: 2.62, x0: 0.02, x1: 0.95, reset: 306, scale: 1.3, gust: 102, spin: [104, 124], gust2: 322 };
export const sloG = (f) => (((f - SLO.reset) % NF) + NF) % NF;
const SLO_P = 24;                                          // inch-worm surge period (frames): 15 surges per loop
export const sloX = (f) => {
  const g = sloG(f);
  const w = (g - 0.85 * (SLO_P / TAU) * Math.sin(TAU * g / SLO_P)) / NF;   // monotone, surging
  return lerp(SLO.x0, SLO.x1, w);
};
export function sloState(f) {
  const g = sloG(f), gt = tw(g), ft = tw(f);
  const ph = TAU * gt / SLO_P;
  let st = 0.12 * (1 - Math.cos(ph)) / 2;                  // stretches forward while it surges
  let sway = 0.07 * Math.sin(ph + 0.9);                    // the cargo lags behind
  let stalk = 0.12 * Math.sin(ph + 1.6), sq = 0, dy = 0, yaw = 0, lean = 0;
  // S2 gust: flinch at the toot, brace, then the convoy's wind lifts it and spins it once round; dizzy wobble after
  { const tk = take(ft, F.toot + 2, 0.6); sq += tk.sq; dy += tk.dy * 0.3; }
  if (ft >= SLO.gust - 6 && ft < SLO.spin[1] + 30) {
    const brace = sg(ft, SLO.gust - 6, SLO.gust, ease.smooth) * (1 - sg(ft, SLO.spin[0], SLO.spin[0] + 2));
    sq += 0.12 * brace; st *= 1 - brace;
    const k = sg(ft, SLO.spin[0], SLO.spin[1]);
    yaw = TAU * ease.outCubic(k);
    const hp = hop(ft, SLO.spin[0], SLO.spin[0] + 10, 0.32); dy += hp.dy; sq += hp.sq;
    stalk = lerp(stalk, -0.85, sg(ft, SLO.spin[0], SLO.spin[0] + 3) * (1 - sg(ft, SLO.spin[1] - 4, SLO.spin[1] + 2)));
    const a = (ft - SLO.spin[1]) / FPS;
    if (a > 0) { lean = 0.16 * Math.exp(-2.2 * a) * Math.sin(TAU * a * 1.6); sway += 0.12 * Math.exp(-2 * a) * Math.sin(TAU * a * 1.6 + 1); }
    st *= 1 - k * (1 - sg(ft, SLO.spin[1], SLO.spin[1] + 20));
  }
  // S5 gust: the convoy sweeps home past it (right to left): stalks blown back the other way, a small take
  if (ft >= SLO.gust2 - 4 && ft < SLO.gust2 + 26) {
    const tk = take(ft, SLO.gust2, 0.7); sq += tk.sq; dy += tk.dy * 0.3;
    stalk = lerp(stalk, 0.6, sg(ft, SLO.gust2, SLO.gust2 + 3) * (1 - sg(ft, SLO.gust2 + 14, SLO.gust2 + 24)));
    lean -= 0.1 * sg(ft, SLO.gust2, SLO.gust2 + 3) * (1 - sg(ft, SLO.gust2 + 10, SLO.gust2 + 22));
  }
  return { x: sloX(f), st, sq, sway, dy, stalk, yaw, lean };
}
export function sloFace(f) {
  const g = sloG(f), ft = tw(f);
  const effort = { eyes: 'half', mouth: 'wobble', look: [0.55, 0.05], turn: [0.3, 0] };
  const sweatAge = g % 72;
  if (sweatAge < 24) effort.emote = { type: 'sweat', age: sweatAge };
  if (ft >= F.toot && ft < F.toot + 12) return { eyes: 'wide', mouth: 'o', look: [0.45, -0.35], turn: [0.3, -0.15], emote: { type: 'bang', age: ft - F.toot } };
  if (ft >= F.toot + 12 && ft < SLO.gust) return { eyes: 'focus', mouth: 'wobble', look: [0.6, 0], turn: [0.35, 0], emote: { type: 'sweat', age: ft - F.toot - 12 } };
  if (ft >= SLO.gust && ft < SLO.spin[1]) return { eyes: 'squeeze', mouth: 'o', look: [0, 0], turn: [0.3, 0] };
  if (ft >= SLO.spin[1] && ft < SLO.spin[1] + 30) return { eyes: 'dizzy', mouth: 'wobble', look: [0, 0], turn: [0.25, 0], ph: f * 0.45 };
  if (ft >= SLO.gust2 && ft < SLO.gust2 + 20) return { eyes: 'wide', mouth: 'o', look: [-0.5, -0.1], turn: [-0.2, 0], emote: { type: 'sweat', age: ft - SLO.gust2 } };
  return effort;
}
/** The atom it hauls: asleep, jolted awake by the gust, dizzy, then back to sleep. */
export function sloCargoFace(f) {
  const ft = tw(f);
  if (ft >= SLO.gust && ft < SLO.spin[1]) return { eyes: 'wide', mouth: 'o', look: [0, 0], turn: [0, 0] };
  if (ft >= SLO.spin[1] && ft < SLO.spin[1] + 34) return { eyes: 'dizzy', mouth: null, look: [0, 0], turn: [0, 0], ph: f * 0.45 + 1.7 };
  if (ft >= SLO.gust2 && ft < SLO.gust2 + 18) return { eyes: 'half', mouth: null, look: [-0.5, 0], turn: [-0.2, 0] };
  return { eyes: 'sleep', mouth: null, look: [0, 0], turn: [0, 0], zzz: 1 };
}

// ---- camera ------------------------------------------------------------------------------------------------------
// Rigs are orbit parameters { t:[x,y,z], r, az, el, fov } interpolated with Catmull-Rom (C1 through keys).
function cr(p0, p1, p2, p3, u) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (p2 - p0) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (3 * p1 - p0 - 3 * p2 + p3) * u3);
}
function flat(k) { return [...k.t, k.r, k.az, k.el, k.fov]; }
function unflat(v) { return { t: [v[0], v[1], v[2]], r: v[3], az: v[4], el: v[5], fov: v[6] }; }
function path(keys, f) {   // keys: [[frame, rig], ...] sorted
  if (f <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (f >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0; while (i < n - 2 && f >= keys[i + 1][0]) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = (f - k1[0]) / (k2[0] - k1[0]);
  const a = flat(k0[1]), b = flat(k1[1]), c = flat(k2[1]), d = flat(k3[1]);
  return unflat(b.map((_, j) => cr(a[j], b[j], c[j], d[j], u)));
}
// HOME path runs from S5 (frames -54..-1 == 306..359) through S1 and S2 (0..155): one continuous move,
// so the loop seam at frame 0 has no cut and no stop.
const HOME = [
  [-60, { t: [1.2, 0.6, 0.3], r: 10.8, az: 0.07, el: 0.41, fov: 30 }],
  [-54, { t: [0.9, 0.6, 0.3], r: 10.6, az: 0.05, el: 0.4, fov: 30 }],
  [-26, { t: [-1.5, 0.72, 0.4], r: 9.2, az: -0.1, el: 0.38, fov: 30 }],
  [8, { t: [-3.2, 0.9, 0.55], r: 7.8, az: -0.2, el: 0.38, fov: 30 }],
  [40, { t: [-2.5, 1.0, 0.7], r: 7.3, az: -0.1, el: 0.36, fov: 30 }],
  [62, { t: [-1.0, 0.95, 0.75], r: 7.0, az: 0.08, el: 0.32, fov: 30 }],
  [80, { t: [0.95, 0.78, 0.95], r: 5.7, az: 0.62, el: 0.24, fov: 30 }],
  [96, { t: [0.85, 0.74, 0.95], r: 5.25, az: 0.66, el: 0.22, fov: 30 }],
  [118, { t: [1.6, 0.72, 0.65], r: 6.5, az: 0.36, el: 0.23, fov: 34 }],
  [140, { t: [3.0, 0.74, 0.6], r: 6.5, az: 0.42, el: 0.26, fov: 31 }],
  [156, { t: [3.3, 0.74, 0.55], r: 6.6, az: 0.45, el: 0.28, fov: 30 }],
];
const S3 = [
  [163, { t: [3.45, 1.0, -0.85], r: 7.9, az: -0.05, el: 0.25, fov: 30 }],
  [226, { t: [3.5, 1.05, -0.95], r: 7.3, az: 0.03, el: 0.23, fov: 30 }],
];
const S4 = [
  [226, { t: [3.5, 1.05, -0.95], r: 7.3, az: 0.03, el: 0.23, fov: 30 }],
  [235, { t: [4.5, 1.4, -2.55], r: 5.2, az: 0.03, el: 0.44, fov: 34 }],
  [244, { t: [5.3, 1.36, -2.85], r: 3.35, az: 0.08, el: 0.13, fov: 44 }],
  [300, { t: [5.38, 1.4, -2.9], r: 3.1, az: -0.07, el: 0.13, fov: 44 }],
  [312, { t: [5.38, 1.4, -2.9], r: 3.05, az: -0.1, el: 0.13, fov: 44 }],
];
/** Camera rig at frame f: { rig, smear (yaw speed rad/s for whip) , shake:[dx,dy,droll] } */
export function cameraAt(f) {
  let rig;
  let yawSpeed = 0;
  if (f >= F.wipeCut) rig = path(HOME, f - NF);
  else if (f < F.whip[0]) {
    rig = path(HOME, f);
    // punch-in on the toot (the loco fills more of the frame for a beat), eased back out
    const pt = Math.exp(-Math.max(0, f - F.toot) / 7) * sg(f, F.toot - 3, F.toot, ease.smooth);
    rig = { ...rig, r: rig.r * (1 - 0.07 * pt) };
  }
  else if (f < F.whip[1]) {
    // whip pan from the end of S2 to the start of S3: fast ease with an overshoot
    const a = path(HOME, F.whip[0]), b = path(S3, F.whip[1]);
    const u = (f - F.whip[0]) / (F.whip[1] - F.whip[0]);
    const k = ease.inOutQuint(u);
    const A = flat(a), B = flat(b);
    rig = unflat(A.map((v, j) => lerp(v, B[j], k)));
  } else if (f < F.push4[0]) {
    rig = path(S3, f);
    // punch-in on the downbeat
    const p = Math.exp(-Math.max(0, f - F.hit) / 8) * sg(f, F.down, F.hit);
    rig = { ...rig, r: rig.r * (1 - 0.08 * p) };
    // whip settle overshoot
    rig.az += 0.03 * spring(f - F.whip[1], 8, 20);
  } else {
    rig = path(S4, f);
  }
  // hit shakes (world units), deterministic per frame, decaying
  let sh = [0, 0, 0];
  const kick = (f0, amt, dec = 0.3) => {
    if (f < f0 || f > f0 + 30) return;
    const k = Math.exp(-(f - f0) / FPS / dec) * amt;
    sh[0] += (H(f * 1.7 + f0) - 0.5) * 2 * k; sh[1] += (H(f * 2.3 + 9 + f0) - 0.5) * 2 * k; sh[2] += (H(f * 3.1 + 5 + f0) - 0.5) * 2 * k * 0.25;
  };
  kick(F.hit, 0.1); kick(F.down, 0.03); kick(F.click, 0.03); kick(F.slam, 0.08); kick(F.move[1], 0.025); kick(F.toot, 0.02);
  return { rig, yawSpeed, shake: sh };
}
