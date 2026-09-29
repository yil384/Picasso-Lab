// tg_cam.js - the camera of "The Loop": two laps round the ring (720 degrees per loop), outside the track looking in.
// A rig is { c: [th, r, y] (camera, ring coords), t: [th, r, y] (target), fov, roll }. Angles are unwrapped, so the
// rig at F = NF equals the rig at F = 0 plus two turns (= the same camera).
import { TAU, clamp, lerp, sg, sm, io, ioc, ease } from './tg_time.js';
import { NF, K, A, R, L2, B2, polar, kernState, oroState, tokState, kernTh, oroTh, raceF } from './tg_anim.js';

// the timing stopwatch tower in the infield, mid-straight; its face is turned towards the race-1 finish and payoff cameras so the
// hands read there, and the match-cut / insert cameras sit on its face normal
export const WATCH = { th: 3.92, r: 3.75, y: 2.55 };
{
  const w = polar(WATCH.th, WATCH.r), p = polar(A.finish + 0.02, 12.4), q = polar(A.finish + 0.6, 12.4);
  const ya = Math.atan2(p[0] - w[0], p[2] - w[2]), yb = Math.atan2(q[0] - w[0], q[2] - w[2]);
  WATCH.yaw = ya + 0.1 * (yb - ya);   // rotation.y of the tower (face along +z): to the race-1 finish lens (edge-on, quiet, behind the payoff board)
  WATCH.n = [Math.sin(WATCH.yaw), 0, Math.cos(WATCH.yaw)];
  WATCH.pos = [w[0], WATCH.y, w[2]];
}

const mix = (a, b, k) => ({ c: a.c.map((v, i) => lerp(v, b.c[i], k)), t: a.t.map((v, i) => lerp(v, b.t[i], k)), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const rig = (c, t, fov = 32, roll = 0) => ({ c, t, fov, roll });
/** ring coords of a world point */
export const toRing = (p) => { let th = Math.atan2(-p[2], p[0]); return [th, Math.hypot(p[0], p[2]), p[1]]; };
const near = (th, ref) => th + TAU * Math.round((ref - th) / TAU);   // unwrap th close to ref
/** rig looking square at the stopwatch face from dist along its normal (ring coords unwrapped near thRef) */
function watchRig(dist, thRef, fov = 30, dy = 0, tdy = 0) {
  const W = WATCH.pos, c = [W[0] + WATCH.n[0] * dist, W[1] + dy, W[2] + WATCH.n[2] * dist];
  const rc = toRing(c), rt = toRing(W);
  return rig([near(rc[0], thRef), rc[1], c[1]], [near(rt[0], thRef), rt[1], W[1] + tdy], fov, 0);
}

// ------------------------------------------------------------------------------------------------
// shots
// ------------------------------------------------------------------------------------------------
function shotBench(F) {          // B1: low 3/4 on the bench, slow push, dutch settles
  const k = sm(F / 90);    // push in with a slow drift right (towards the bench) and a settling dutch
  // (the lens sits a little off-axis so the far stopwatch clears Tok's head)
  return rig([-0.06 + 0.05 * k, 13.5 - 0.9 * k, 1.5 - 0.1 * k], [-0.045 + 0.05 * k, 7.9, 1.05 + 0.1 * sm((F - 8) / 20) * (1 - sm((F - 40) / 20))], 33, lerp(0.06, 0.0, sm(F / 40)));
}
function shotDrive(F) {          // B2 approach: knee-height tracking alongside Kern towards the gate
  const ks = kernState(F), [th] = toRing(ks.pos);
  return rig([th - 0.02, 10.6, 0.8], [th + 0.1, 6.3, 0.55], 32, -0.03);
}
function shotGate(F) {           // B2 at the gate: 3/4 on the gate, punch-in on the CLANG, pan to Tok and Kern for the slip
  const punch = F >= K.clang && F < K.clang + 10 ? 0.06 * Math.exp(-(F - K.clang) / 5) : 0;
  const pan = sm((F - K.clang - 2) / 12) * (1 - sm((F - K.lift[0] + 2) / 6));
  const up = sg(F, K.closeup[1] + 4, K.lift[0] + 4, sm);  // tilt up for the lamp and the nod
  return rig([A.gate - 0.33 - 0.06 * pan, 12.8 * (1 - punch) - 0.6 * pan, 1.5], [A.gate - 0.12 - 0.16 * pan + 0.06 * up, 6.3, 1.45 - 0.3 * pan + 0.35 * up], 36, 0.02);   // the lamp is in frame before the slam
}
function shotPress(F) {          // B2 insert: close on the crooked token; a mitt comes down and presses it flat
  const k = sg(F, K.closeup[0], K.closeup[1], io), th = B2.thStop - 0.17, r = R.ours + 0.3;
  return rig([th + 0.05, r + 1.7 - 0.2 * k, 1.4], [th + 0.01, r, 0.58], 26, 0.03);   // tight, from the side and above: the crooked token and the mitt are the subject
}
function shotThrough(F) {        // B2 end: from ahead of the gate, low, looking back: Kern drives through the arch at us
  const k = sg(F, K.through[0], K.toScale[0], io);
  return rig([A.gate + 0.56, R.ours + 1.35, 0.8 + 0.1 * k], [A.gate - 0.02 + 0.2 * k, R.ours + 0.1, 0.62], 34, -0.02);
}
function shotScale(F) {          // B3: medium on the weigh-in, then a push onto the dial
  const push = sg(F, K.dialPush[0], K.dialPush[1], (x) => x * x * (3 - 2 * x));
  const k = sg(F, K.toScale[1], K.dialPush[0], io);        // slow push while the needle swings
  const a = rig([A.scale + 0.05, 14.1 - 0.6 * k, 1.6], [A.scale - 0.02, 7.9, 1.18], 32, 0.0);
  const b = rig([A.scale, 10.64, 1.02], [A.scale, 8.2, 1.02], 30, 0.0);        // the dial fills ~70% of the frame (the brass rim stays in shot)
  return mix(a, b, push);
}
function shotWatchToStart(F) {   // B4 open: from the stopwatch face (match cut) pull back and pan to the start line
  const k = sg(F, K.cut + 2, K.cut + 18, ioc);
  const a = watchRig(4.6, A.start);                        // same size and place as the dial
  const b = shotStart(K.cut + 18);
  return mix(a, b, k);
}
function shotStart(F, lap = 0) { // B4 / B7: low 3/4-front two-shot at the start line (the racers face the lens)
  const drift = sm((F - (lap ? K.side2[0] : K.cut + 18)) / 40);
  // 3/4 front, well ahead of the line: the two lanes separate side by side and both faces point at the lens
  // race 1: a push onto Oro for its smug side-eye, released for GO
  const po = lap ? 0 : sg(F, K.side[0] - 4, K.side[0] + 8, io) * (1 - sg(F, K.go1 - 3, K.go1 + 3, sm));
  return rig([lap + A.start + 0.5 - 0.03 * drift - 0.02 * po, 8.9 - 0.2 * drift - 0.6 * po, 2.2 - 0.4 * po], [lap + A.start + 0.02 + 0.01 * po, 6.0 - 0.4 * po, 0.35 + 0.1 * po], 32, -0.02);
}
function shotRace1(F) {          // B4: fast low tracking, loses Oro, settles on the lumbering Kern, pans on to the finish
  const kth = kernTh(F), oth = oroTh(F);          // unwrapped ring angles (atan2 would wrap past pi mid-straight)
  const lead = lerp(oth, kth, sm((F - K.go1 - 4) / 10));
  const track = rig([lead + 0.46, 9.0, 2.3], [lead + 0.01, 6.0, 0.35], 33, -0.03);   // leading 3/4 front: the lanes stay side by side
  const fin = rig([A.finish + 0.02, 13.4, 1.9], [A.finish + 0.06, 5.0, 1.2], 38, 0.0);   // wide enough for the stopwatch face (upper left)
  return mix(track, fin, sg(F, K.kernRun1[1] - 26, K.kernRun1[1] - 2, io));   // a slower crane up to the finish
}
function shotCrash(F) {          // B4 -> B5: crash zoom onto the square wheel, then the refine two-shot with a slow orbit
  const th = A.finish + 0.16;
  const z = sg(F, K.crash[0], K.crash[1], (x) => x * x);
  const fin = rig([A.finish + 0.02, 13.4, 1.9], [A.finish + 0.06, 5.0, 1.2], 38, 0.0);
  const wheel = rig([th + 0.02, 8.7, 0.42], [th - 0.01, 6.9, 0.16], 30, 0.04);
  const orb = sg(F, K.tokIn[1], K.rev[1], io);
  const two = rig([th + 0.0 + 0.3 * orb, 12.2 - 0.4 * orb, 1.5], [th + 0.07, 6.1, 1.05], 34, 0.02 - 0.05 * orb);
  if (F < K.crash[1]) return mix(fin, wheel, z);
  return mix(wheel, two, sg(F, K.crash[1] + 2, K.crash[1] + 22, ioc));   // pull out
}
function shotLap2(F) {           // B6: three quick panels linked by whips, rhyming with B2/B3: the arch, the weigh-in, the start
  const gEnd = K.gate2 + 7, sIn = gEnd + 6;
  const arch = rig([L2 + A.gate + 0.56, R.ours + 1.35, 0.85], [L2 + A.gate - 0.04, R.ours + 0.1, 0.7], 34, -0.02);
  const k = sg(F, sIn, K.lap2[1] - 10, io);
  const scale = rig([L2 + A.scale + 0.05, 13.6 - 0.5 * k, 1.6], [L2 + A.scale - 0.01, 7.9, 1.25], 32, 0.0);
  if (F < gEnd) return arch;
  return mix(arch, scale, sg(F, gEnd, sIn, ease.inOutQuint));
}
function shotRace2(F) {          // B7: start two-shot (rhymes with B4), dolly-zoom on Oro's double-take, raised side tracking
  const st = shotStart(F, L2);
  // vertigo on Oro: keep Oro's size while the fov opens
  const vk = sg(F, K.dtake - 1, K.dtake + 11, io) * (1 - sg(F, K.go2 - 4, K.go2 + 2, sm));
  const fov = lerp(32, 58, vk);
  {   // move the lens along its line to Oro so Oro keeps its size while the fov opens
    const o = polar(L2 + A.start, 5.45, 0.4), c = polar(...st.c), k = Math.tan((32 / 2) * Math.PI / 180) / Math.tan((fov / 2) * Math.PI / 180);
    const c2 = o.map((v, i) => v + (c[i] - v) * k), rc = toRing(c2);
    st.c = [near(rc[0], st.c[0]), rc[1], c2[1]]; st.fov = fov;
  }
  if (F < K.go2) return st;
  // track the pack from a raised lens (both lanes in separate screen bands)
  const rf = raceF(F), pack = (kernTh(rf) + oroTh(rf)) / 2;
  if (F < K.hold[0]) {
    const trk = rig([pack + 0.44, 9.0, 2.3], [pack + 0.0, 6.0, 0.35], 33, lerp(-0.02, -0.09, sg(F, K.go2, K.cross)));
    return mix(st, trk, sg(F, K.go2, K.go2 + 8, sm));
  }
  // the photo finish: cut (under the impact frame) to a raised 3/4-front panel on the line, both noses towards the lens
  const push = sg(F, K.hold[0], K.hold[1], io);
  // high, side-on to the line: both noses on the chequer, the lanes in separate bands
  return rig([L2 + A.finish + 0.03 - 0.01 * push, 10.6 - 0.6 * push, 5.2 - 0.3 * push], [L2 + A.finish - 0.02, 5.95, 0.2], 34, 0.02);
}
function shotWatch(F) {          // the insert after the photo finish: the stopwatch face, square on, slow push
  const k = sg(F, K.watch[0], K.watch[1], io);
  return watchRig(3.3 - 0.4 * k, L2 + A.finish, 42, 0, -0.24 + 0.04 * k);   // the dial sits high in the panel: the 6 o'clock stop stays above the card fade
}
function shotPayoff(F) {         // B8: low hero lens at the finish, a real push (~12%) with a ~16 deg orbit
  const k = sg(F, K.watch[1], K.away[0], io);
  return rig([L2 + A.finish + 0.61 + 0.05 * k, 13.0 - 1.2 * k, 1.7 + 0.1 * k], [L2 + A.finish + 0.62 + 0.02 * k, 3.0, 1.12 - 0.05 * k], lerp(40, 36, k), 0.0);   // push = dolly + zoom
}

// ------------------------------------------------------------------------------------------------
// the edit: shots joined by continuous moves and whips
// ------------------------------------------------------------------------------------------------
export const WHIPS = [[K.hopOff[0] + 2, K.drive1[0] + 6], [K.closeup[1] - 1, K.closeup[1] + 4], [K.through[0], K.through[0] + 6],
  [K.toScale[0] + 2, K.toScale[0] + 10], [K.cut + 4, K.cut + 18], [K.go1 + 5, K.go1 + 15], [K.rev[1] - 2, K.lap2[0] + 13],
  [K.gate2 + 7, K.gate2 + 13], [K.lap2[1] - 10, K.side2[0]], [K.hold[1] - 2, K.watch[0] + 5], [K.watch[1], K.watch[1] + 8], [K.away[0], NF], [0, 6]];

export function camRig(F) {
  if (F < K.hopOff[0] + 2) return shotBench(F);
  if (F < K.drive1[0] + 6) return mix(shotBench(F), shotDrive(F), sg(F, K.hopOff[0] + 2, K.drive1[0] + 6, ease.inOutQuint));   // whip right after Kern
  if (F < K.clang - 10) return shotDrive(F);
  if (F < K.clang - 2) return mix(shotDrive(F), shotGate(F), sg(F, K.clang - 10, K.clang - 2, sm));
  if (F < K.closeup[0] - 3) return shotGate(F);
  if (F < K.closeup[0] + 3) return mix(shotGate(F), shotPress(F), sg(F, K.closeup[0] - 3, K.closeup[0] + 3, ease.inOutCubic));   // push down onto the token
  if (F < K.closeup[1] - 1) return shotPress(F);
  if (F < K.closeup[1] + 4) return mix(shotPress(F), shotGate(F), sg(F, K.closeup[1] - 1, K.closeup[1] + 4, ease.inOutQuint));   // whip back out
  if (F < K.through[0]) return shotGate(F);                         // held: the lamp goes emerald, the gate nods and lifts
  if (F < K.through[0] + 6) return mix(shotGate(F), shotThrough(F), sg(F, K.through[0], K.through[0] + 6, ease.inOutQuint));   // whip ahead
  if (F < K.toScale[0] + 2) return shotThrough(F);
  if (F < K.toScale[0] + 10) return mix(shotThrough(F), shotScale(F), sg(F, K.toScale[0] + 2, K.toScale[0] + 10, ease.inOutQuint));   // whip to the weigh-in
  if (F < K.cut) return shotScale(F);
  if (F < K.cut + 18) return shotWatchToStart(F);                  // match cut: dial -> stopwatch face, then a whip-pull to the start
  if (F < K.go1 + 2) return shotStart(F);
  if (F < K.crash[0]) return mix(shotStart(F), shotRace1(F), sg(F, K.go1 + 4, K.go1 + 16, ioc));
  if (F < K.rev[1] - 2) return shotCrash(F);
  if (F < K.lap2[0] + 13) return mix(shotCrash(F), shotLap2(F), sg(F, K.rev[1] - 2, K.lap2[0] + 13, ease.inOutQuint));   // whip to the arch
  if (F < K.lap2[1] - 10) return shotLap2(F);
  if (F < K.side2[0]) return mix(shotLap2(F), shotStart(F, L2), sg(F, K.lap2[1] - 10, K.side2[0], ease.inOutQuint));   // whip to the start line
  if (F < K.hold[1] - 2) return shotRace2(F);                     // incl. the photo-finish hold (a slow push on the line)
  if (F < K.watch[0] + 5) return mix(shotRace2(F), shotWatch(F), sg(F, K.hold[1] - 2, K.watch[0] + 5, ease.inOutQuint));   // whip to the stopwatch
  if (F < K.watch[1]) return shotWatch(F);
  if (F < K.away[0]) return mix(shotWatch(K.watch[1] - 1), shotPayoff(F), sg(F, K.watch[1], K.watch[1] + 8, ease.inOutQuint));   // whip to the finish
  // B9: whip from the finish to the bench (two full turns == the f0 rig)
  const end = shotBench(0); end.c[0] += 2 * L2; end.t[0] += 2 * L2;
  return mix(shotPayoff(F), end, sg(F, K.away[0], NF, ease.inOutQuint));
}

/** world-space camera {pos, target, up-roll, fov} */
export function camWorld(F) {
  const r = camRig(F);
  return { pos: polar(r.c[0], r.c[1], r.c[2]), target: polar(r.t[0], r.t[1], r.t[2]), fov: r.fov, roll: r.roll, rig: r };
}
