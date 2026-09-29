// tg_cam.js - the camera of "The Loop": two laps round the ring (720 degrees per loop), outside the track looking in.
// A rig is { c: [th, r, y] (camera, ring coords), t: [th, r, y] (target), fov, roll }. Angles are unwrapped, so the
// rig at F = NF equals the rig at F = 0 plus two turns (= the same camera).
import { TAU, clamp, lerp, sg, sm, io, ioc, ease } from './tg_time.js';
import { NF, K, A, R, L2, polar, kernState, oroState, tokState, kernTh, oroTh } from './tg_anim.js';

export const WATCH = { th: 3.92, r: 3.75, y: 3.3 };          // the timing stopwatch tower in the infield, mid-straight

const mix = (a, b, k) => ({ c: a.c.map((v, i) => lerp(v, b.c[i], k)), t: a.t.map((v, i) => lerp(v, b.t[i], k)), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const rig = (c, t, fov = 32, roll = 0) => ({ c, t, fov, roll });
/** ring coords of a world point */
export const toRing = (p) => { let th = Math.atan2(-p[2], p[0]); return [th, Math.hypot(p[0], p[2]), p[1]]; };
const near = (th, ref) => th + TAU * Math.round((ref - th) / TAU);   // unwrap th close to ref

// ------------------------------------------------------------------------------------------------
// shots
// ------------------------------------------------------------------------------------------------
function shotBench(F) {          // B1: low 3/4 on the bench, slow push, dutch settles
  const k = sm(F / 90);
  return rig([0.07 - 0.02 * k, 12.9 - 0.7 * k, 1.5 - 0.1 * k], [0.02, 7.9, 1.05 + 0.1 * sm((F - 8) / 20) * (1 - sm((F - 40) / 20))], 32, lerp(0.06, 0.0, sm(F / 40)));
}
function shotDrive(F) {          // B2 approach: knee-height tracking alongside Kern towards the gate
  const ks = kernState(F), [th] = toRing(ks.pos);
  return rig([th - 0.02, 10.6, 0.8], [th + 0.1, 6.3, 0.55], 32, -0.03);
}
function shotGate(F) {           // B2 at the gate: 3/4 on the gate, punch-in on the CLANG, pan with the flick, two-shot for the fix
  const punch = F >= K.clang && F < K.clang + 10 ? 0.06 * Math.exp(-(F - K.clang) / 5) : 0;
  const pan = sm((F - K.clang - 2) / 12);
  const base = rig([A.gate - 0.3 + 0.02 * pan, 11.6 * (1 - punch), 1.25], [A.gate - 0.1 - 0.1 * pan, 6.3, 1.0 - 0.1 * pan], 33, 0.02);
  return base;
}
function shotThrough(F) {        // B2 end: dolly behind Kern through the gate arch (camera inside the track, low)
  const ks = kernState(F), [th] = toRing(ks.pos);
  return rig([th - 0.36, 7.1, 1.35], [th + 0.1, 6.4, 0.45], 36, 0.0);
}
function shotScale(F) {          // B3: medium on the weigh-in, then a push onto the dial
  const push = sg(F, K.dialPush[0], K.dialPush[1], (x) => x * x * (3 - 2 * x));
  const a = rig([A.scale + 0.06, 12.6, 1.45], [A.scale - 0.02, 7.9, 1.05], 32, 0.0);
  const b = rig([A.scale, 9.85, 1.02], [A.scale, 8.2, 1.02], 30, 0.0);
  return mix(a, b, push);
}
function shotWatchToStart(F) {   // B4 open: from the stopwatch face (match cut) pull back and pan to the start line
  const k = sg(F, K.cut, K.cut + 16, ioc);
  const a = rig([WATCH.th, WATCH.r + 3.2, WATCH.y], [WATCH.th, WATCH.r, WATCH.y], 30, 0);
  const b = rig([A.start + 0.26, 10.0, 1.05], [A.start + 0.03, 6.0, 0.45], 32, 0.0);
  const s = mix(a, b, k);
  s.t[1] = lerp(WATCH.r, 5.95, k);
  return s;
}
function shotStart(F, lap = 0) { // B4 / B7: low 3/4-front two-shot at the start line (the racers face the lens)
  const drift = sm((F - (lap ? K.side2[0] : K.cut + 16)) / 40);
  return rig([lap + A.start + 0.26 - 0.03 * drift, 10.0 - 0.3 * drift, 1.05], [lap + A.start + 0.03, 6.0, 0.45], 32, -0.02);
}
function shotRace1(F) {          // B4: fast low tracking, loses Oro, settles on the lumbering Kern, pans on to the finish
  const kth = kernTh(F), oth = oroTh(F);          // unwrapped ring angles (atan2 would wrap past pi mid-straight)
  const lead = lerp(oth, kth, sm((F - K.go1 - 4) / 10));
  const track = rig([lead - 0.02, 10.4, 0.8], [lead + 0.09, 6.0, 0.5], 33, -0.03);
  const fin = rig([A.finish + 0.02, 12.4, 1.6], [A.finish + 0.08, 5.0, 1.2], 34, 0.0);
  return mix(track, fin, sg(F, K.kernRun1[1] - 20, K.kernRun1[1] - 4, sm));
}
function shotCrash(F) {          // B4 -> B5: crash zoom onto the square wheel, then the refine two-shot with a slow orbit
  const th = A.finish + 0.16;
  const z = sg(F, K.crash[0], K.crash[1], (x) => x * x);
  const fin = rig([A.finish + 0.02, 12.4, 1.6], [A.finish + 0.08, 5.0, 1.2], 34, 0.0);
  const wheel = rig([th + 0.02, 8.7, 0.42], [th - 0.01, 6.9, 0.16], 30, 0.04);
  const orb = sg(F, K.tokIn[1], K.rev[1], io);
  const two = rig([th + 0.02 + 0.16 * orb, 10.9 - 0.3 * orb, 1.3], [th + 0.06, 6.1, 0.7], 33, 0.02 - 0.04 * orb);
  if (F < K.crash[1]) return mix(fin, wheel, z);
  return mix(wheel, two, sg(F, K.crash[1] + 6, K.tokIn[1] + 4, ioc));
}
function shotLap2(F) {           // B6: high three-quarter crane over the ring following Kern (slot-car view)
  const ks = kernState(F), [kth0] = toRing(ks.pos);
  const kth = near(kth0, lerp(A.finish, L2 + A.start, sg(F, K.lap2[0], K.lap2[1])));
  return rig([kth - 0.35, 14.2, 7.6], [kth + 0.15, 4.2, 0.2], 36, 0.0);
}
function shotRace2(F) {          // B7: start two-shot (rhymes with B4), dolly-zoom on Oro's double-take, side tracking with growing dutch
  const st = shotStart(F, L2);
  // vertigo on Oro: keep Oro's size while the fov opens
  const vk = sg(F, K.dtake - 1, K.dtake + 9, ease.inCubic) * (1 - sg(F, K.go2 - 2, K.go2 + 4, sm));
  const fov = lerp(32, 52, vk);
  const d0 = 10.0 - 5.45, d1 = d0 * Math.tan((32 / 2) * Math.PI / 180) / Math.tan((fov / 2) * Math.PI / 180);
  st.c[1] = 5.45 + d1 + 0.0; st.fov = fov; st.t = [L2 + A.start + 0.03, 5.7, 0.5];
  if (F < K.go2) return st;
  const ks = kernState(F), [kth0] = toRing(ks.pos), kth = near(kth0, L2 + A.start);
  const trk = rig([kth - 0.0, 11.0, 1.0], [kth + 0.09, 5.9, 0.5], 33, lerp(-0.02, -0.1, sg(F, K.go2, K.cross)));
  return mix(st, trk, sg(F, K.go2, K.go2 + 8, sm));
}
function shotPayoff(F) {         // B8: low hero angle at the finish; slow push with an orbit
  const k = sg(F, K.freeze[1], K.away[0], io);
  // the orbit runs th-increasing so the finish pylon (nearer the lens) slides left, clear of the letters
  return rig([L2 + A.finish + 0.53 + 0.035 * k, 13.9 - 0.5 * k, 1.5], [L2 + A.finish + 0.53 + 0.012 * k, 3.4, 0.98], 35, 0.0);
}

// ------------------------------------------------------------------------------------------------
// the edit: shots joined by continuous moves and whips
// ------------------------------------------------------------------------------------------------
export const WHIPS = [[K.hopOff[0] + 2, K.drive1[0] + 6], [K.rev[1] - 2, K.lap2[0] + 8], [K.away[0], NF], [0, 6]];

export function camRig(F) {
  if (F < K.hopOff[0] + 2) return shotBench(F);
  if (F < K.drive1[0] + 6) return mix(shotBench(F), shotDrive(F), sg(F, K.hopOff[0] + 2, K.drive1[0] + 6, ease.inOutQuint));   // whip right after Kern
  if (F < K.clang - 10) return shotDrive(F);
  if (F < K.clang - 2) return mix(shotDrive(F), shotGate(F), sg(F, K.clang - 10, K.clang - 2, sm));
  if (F < K.lift[1]) return shotGate(F);
  if (F < K.through[0] + 6) return mix(shotGate(F), shotThrough(F), sg(F, K.lift[1], K.through[0] + 6, ioc));
  if (F < K.toScale[0] + 4) return shotThrough(F);
  if (F < K.toScale[1]) return mix(shotThrough(F), shotScale(F), sg(F, K.toScale[0] + 4, K.toScale[1], ioc));
  if (F < K.cut) return shotScale(F);
  if (F < K.cut + 16) return shotWatchToStart(F);                  // match cut: dial -> stopwatch face
  if (F < K.go1 + 2) return shotStart(F);
  if (F < K.crash[0]) return mix(shotStart(F), shotRace1(F), sg(F, K.go1 + 2, K.go1 + 8, sm));
  if (F < K.rev[1] - 2) return shotCrash(F);
  if (F < K.lap2[0] + 8) return mix(shotCrash(F), shotLap2(F), sg(F, K.rev[1] - 2, K.lap2[0] + 8, ease.inOutQuint));   // whip up into the crane
  if (F < K.lap2[1] - 10) return shotLap2(F);
  if (F < K.side2[0]) return mix(shotLap2(F), shotStart(F, L2), sg(F, K.lap2[1] - 10, K.side2[0], ioc));
  if (F < K.cross + 1) return shotRace2(F);
  if (F < K.freeze[1] + 2) return shotRace2(K.cross);             // the freeze: camera holds on the photo finish
  if (F < K.away[0]) return mix(shotRace2(K.cross), shotPayoff(F), sg(F, K.freeze[1] + 2, K.freeze[1] + 12, ioc));
  // B9: whip from the finish to the bench (two full turns == the f0 rig)
  const end = shotBench(0); end.c[0] += 2 * L2; end.t[0] += 2 * L2;
  return mix(shotPayoff(F), end, sg(F, K.away[0], NF, ease.inOutQuint));
}

/** world-space camera {pos, target, up-roll, fov} */
export function camWorld(F) {
  const r = camRig(F);
  return { pos: polar(r.c[0], r.c[1], r.c[2]), target: polar(r.t[0], r.t[1], r.t[2]), fov: r.fov, roll: r.roll, rig: r };
}
