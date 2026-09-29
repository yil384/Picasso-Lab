// cm_anim.js - every animated value as a pure function of the frame index F (0..719):
// camera rigs, acting (Chip, Py, the bug, the giant), props, the two harness runs, lights.
import { T, st, K, W, NF, FPS, TAU, BITS, CITY, COL, cycF, stationX, cityDelay, Q,
  clamp, lerp, ease, mj, sm, io, ob, oc, ic, twos, ringv, bumpv, hsh, arc, win, takeSq, track, kv } from './cm_core.js';
import { orbit, handheld, applyRig, yawSmear } from './npr/camera.js';
import { PY_SEG, PY_RAD } from './cm_world.js';
import { cityRoutes } from './cm_core.js';

const V3 = (x, y, z) => new T.THREE.Vector3(x, y, z);
const wrap = (F) => ((F % NF) + NF) % NF;
const H = W.harness;
const STG = W.stage.h + 0.06;                        // stage top
const HOP_A = [H.x - 0.25, H.h + 0.3, H.z - 0.33];   // back hopper mouth (the chip)
const HOP_B = [H.x - 0.25, H.h + 0.3, H.z + 0.3];    // front hopper mouth (the model)
const ANVIL = [-6.15, 0.36, -0.3];
const LECTERN = [-3.55, 0.47, -0.25];
const MOUTH = [W.screenX, 1.35, -1.45];
const FAIR_C = [9.86, STG, -0.52], FAIR_P = [9.42, STG, -1.18];

// ---------------------------------------------------------------------------------------------------
// camera
// ---------------------------------------------------------------------------------------------------
const R = {
  crane: { tg: [-2.3, 0.7, -1.7], az: -0.1, el: 0.64, r: 16.8, fov: 34, roll: 0 },
  after: { tg: [0.2, 1.4, -2.2], az: 0.02, el: 0.42, r: 13.5, fov: 34, roll: 0.02 },
  sign: { tg: [-4.85, 1.72, -1.4], az: 0.02, el: 0.2, r: 6.4, fov: 32, roll: 0.01 },
  shop: { tg: [-4.85, 0.8, -0.85], az: 0.03, el: 0.15, r: 4.4, fov: 32, roll: 0 },
  two: { tg: [-4.25, 0.72, -0.9], az: 0.0, el: 0.15, r: 4.4, fov: 32, roll: 0.01 },
  toss: { tg: [-3.9, 0.92, -1.0], az: -0.16, el: 0.22, r: 5.0, fov: 32, roll: -0.02 },
  anvil: { tg: [-5.75, 0.5, -0.55], az: 0.3, el: 0.18, r: 3.1, fov: 32, roll: 0.03 },
  inspect: { tg: [-4.85, 0.6, -0.45], az: 0.04, el: 0.2, r: 4.3, fov: 32, roll: 0.01 },
  harn: { tg: [-3.55, 0.78, -0.85], az: -0.18, el: 0.19, r: 3.9, fov: 32, roll: -0.02 },
  duo: { tg: [-4.8, 0.78, -0.75], az: 0.06, el: 0.13, r: 3.4, fov: 32, roll: 0.03 },
  city: { tg: [0.3, 0.9, -2.3], az: -0.06, el: 0.46, r: 12.8, fov: 34, roll: 0 },
  fair: { tg: [10.7, 1.95, -1.3], az: -0.45, el: 0.07, r: 8.8, fov: 36, roll: 0.02 },
  fairUp: { tg: [11.3, 3.1, -1.4], az: -0.5, el: -0.02, r: 9.6, fov: 36, roll: 0.0 },
  fairDuo: { tg: [9.75, 1.62, -0.85], az: -0.22, el: 0.16, r: 4.4, fov: 34, roll: -0.02 },
  gape: { tg: [12.2, 4.75, -2.15], az: -1.12, el: -0.06, r: 4.8, fov: 36, roll: -0.05 },
  pay: { tg: [9.3, 1.86, -0.8], az: -0.2, el: 0.1, r: 6.0, fov: 34, roll: 0.02 },
};
export const WHIPS = [[196, 210], [284, 298], [420, 432], [488, 498], [K.whipG[0], K.whipG[1]], [K.whipH[0], K.whipH[1]]];
function mixRig(a, b, k) {
  return { tg: a.tg.map((v, i) => lerp(v, b.tg[i], k)), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), r: lerp(a.r, b.r, k),
    fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) };
}
const withTg = (rg, tg, o = {}) => ({ ...rg, tg, ...o });
function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
function crRig(keys, u) {   // Catmull-Rom through rigs (end points duplicated), u in [0,1]
  const n = keys.length - 1, s = clamp(u) * n, i = Math.min(n - 1, Math.floor(s)), t = s - i;
  const k = (j) => keys[Math.max(0, Math.min(n, j))];
  const f = (g) => cr(g(k(i - 1)), g(k(i)), g(k(i + 1)), g(k(i + 2)), t);
  return { tg: [0, 1, 2].map((j) => f((r) => r.tg[j])), az: f((r) => r.az), el: f((r) => r.el), r: f((r) => r.r), fov: f((r) => r.fov), roll: f((r) => r.roll) };
}
// wavefront (x of the ribbons' growing end) for a run
function waveX(run, F) {
  const c = run === 1 ? K.cyc1 : K.cyc2;
  const f0 = cycF(run, 0);
  const g = (F - f0) / c;                 // cycle k grows during [f_k, f_k + 0.6 c]
  const k = Math.floor(g), fr = clamp((g - k) / 0.6);
  if (g < 0) return W.x0;
  if (k >= 8) return W.x0 + 8 * W.cw;
  return W.x0 + (k + fr) * W.cw;
}
function runRig(run, F) {
  const xw = waveX(run, F);
  return run === 1
    ? { tg: [xw - 0.25, 0.28, -1.05], az: -0.1, el: 0.6, r: 5.7, fov: 30, roll: -0.02 }
    : { tg: [xw - 0.1, 0.24, -1.05], az: -0.3, el: 0.48, r: 4.6, fov: 30, roll: 0.03 };
}
function homeRig(F) {   // 696 -> 720|0 -> 46: one continuous crane through the loop seam
  const G = wrap(F - K.whipH[1]), L = NF - K.whipH[1] + 46;
  return crRig([R.after, R.crane, R.sign, R.shop], io(G / L));
}
export function camRig(F) {
  if (F >= K.whipH[1] || F < 46) return homeRig(F);
  if (F < 160) {   // S2: truck from Chip's anvil to Py's lectern, punch-in on the bonk
    const a = mixRig(R.shop, withTg(R.shop, [-5.25, 0.72, -0.75], { r: 3.7, az: 0.1, el: 0.14 }), io((F - 60) / 34));
    const b = mixRig(a, withTg(R.shop, [-4.45, 0.72, -0.75], { r: 3.6, az: -0.06, el: 0.14 }), io((F - 104) / 40));
    b.r *= 1 - 0.07 * Math.sin(Math.PI * clamp((F - K.bonk) / 16));
    return b;
  }
  if (F < 196) return mixRig(camRig(159.999), R.toss, io((F - 160) / 22));
  if (F < 210) return mixRig(R.toss, runRig(1, F), ease.inOutQuint(clamp((F - 196) / 14)));
  if (F < 284) return runRig(1, F);
  if (F < 298) return mixRig(runRig(1, F), R.two, ease.inOutQuint(clamp((F - 284) / 14)));
  if (F < 350) { const k = sm((F - 298) / 50); return { ...R.two, r: lerp(5.4, 4.6, k), az: lerp(0, 0.06, k) }; }
  if (F < 376) return mixRig({ ...R.two, r: 4.6, az: 0.06 }, R.inspect, io((F - 350) / 14));
  if (F < 400) return mixRig(R.inspect, R.anvil, io((F - 376) / 10));
  if (F < 420) return mixRig(R.anvil, R.harn, io((F - 400) / 16));
  if (F < 432) return mixRig(R.harn, runRig(2, F), ease.inOutQuint(clamp((F - 420) / 12)));
  if (F < 488) return runRig(2, F);
  if (F < 498) return mixRig(runRig(2, F), withTg(R.harn, [-3.4, 0.9, -0.85], { r: 3.6 }), ease.inOutQuint(clamp((F - 488) / 10)));
  if (F < 506) return mixRig(withTg(R.harn, [-3.4, 0.9, -0.85], { r: 3.6 }), R.duo, io((F - 496) / 10));
  if (F < K.whipG[0]) return mixRig(R.duo, R.city, io((F - 506) / 16));
  if (F < K.whipG[1]) return mixRig(R.city, R.fair, ease.inOutQuint(clamp((F - K.whipG[0]) / 12)));
  if (F < 562) return mixRig(R.fair, R.fairUp, io((F - 540) / 16));
  if (F < 606) return mixRig(R.fairUp, R.fairDuo, io((F - 580) / 22));
  const mid = withTg(R.fairDuo, [9.9, 1.9, -0.9], { r: 5.0 });
  if (F < 632) return mixRig(R.fairDuo, mid, io((F - 619) / 10));
  const pay = (f) => { const p = mixRig(mid, R.pay, ease.inOutCubic(clamp((f - 630) / 10))); p.az += 0.1 * sm((f - 640) / 50); return p; };
  if (F < K.gape[0]) return pay(F);
  if (F < K.gape[0] + 10) return mixRig(pay(F), R.gape, io((F - K.gape[0]) / 10));
  if (F < 678) return { ...R.gape, r: R.gape.r - 0.4 * sm((F - K.gape[0] - 10) / 12) };
  if (F < 688) return mixRig({ ...R.gape, r: R.gape.r - 0.4 }, pay(F), io((F - 678) / 10));
  if (F < K.whipH[0]) return pay(F);
  return mixRig(pay(F), R.after, ease.inOutQuint(clamp((F - K.whipH[0]) / (K.whipH[1] - K.whipH[0]))));
}
const SHAKES = () => [[97, 0.006, 3], [K.catchC, 0.004, 3], [cycF(1, K.bad), 0.018, 5], [K.whack, 0.012, 4], [K.ding, 0.008, 4],
  [K.stomp, 0.02, 6], [K.gHit, 0.022, 6], [K.dHit, 0.02, 5], [K.slam, 0.02, 5], [K.landC, 0.004, 3]];
function camShake(F) {
  const s = [0, 0, 0];
  for (const [f0, amp, dec] of SHAKES()) {
    const a = F - f0; if (a < 0 || a > 30) continue;
    const k = amp * Math.exp(-a / dec);
    s[0] += (hsh(F, 1.3, f0) * 2 - 1) * k; s[1] += (hsh(F, 2.7, f0) * 2 - 1) * k; s[2] += (hsh(F, 5.1, f0) * 2 - 1) * k * 0.6;
  }
  return s;
}
function updateCamera(ctx, F) {
  const cam = T.camera;
  const rg = camRig(F), sh = camShake(F);
  const hand = handheld(ctx.t, { amp: 0.03, rot: 0.0035, speed: 5, seed: 7 });
  hand.rot = [hand.rot[0] + sh[0], hand.rot[1] + sh[1], hand.rot[2] + sh[2]];
  applyRig(cam, orbit({ target: rg.tg, radius: rg.r, az: rg.az, el: rg.el, fov: rg.fov, roll: rg.roll }), { hand });
  const yawAt = (f) => { const q = camRig(wrap(f)), o = orbit({ target: q.tg, radius: q.r, az: q.az, el: q.el }); return Math.atan2(q.tg[0] - o.pos[0], q.tg[2] - o.pos[2]); };
  const inWhip = WHIPS.some(([a, b]) => F > a && F < b);
  st.smear = 0;
  if (inWhip) {
    // screen-space smear from the projected motion of the look-at point (pans + trucks)
    const pa = camRig(wrap(F - 0.5)), pb = camRig(wrap(F + 0.5));
    let dy = yawAt(F + 0.5) - yawAt(F - 0.5); if (dy > Math.PI) dy -= TAU; if (dy < -Math.PI) dy += TAU;
    const truck = Math.hypot(pb.tg[0] - pa.tg[0], pb.tg[2] - pa.tg[2]) * Math.sign(pb.tg[0] - pa.tg[0]);
    const pxu = (ctx.DH / 2) / Math.tan(rg.fov * Math.PI / 360) / rg.r;
    const sx = yawSmear(cam, dy * FPS, FPS) - truck * pxu;
    st.smear = Math.abs(sx) > 12 ? clamp(sx, -170, 170) * 0.55 : 0;
  }
  st.rig = rg;
  ctx.camera = cam;
}

// ---------------------------------------------------------------------------------------------------
// runs: dice, ribbons, lamps, gauge, clock
// ---------------------------------------------------------------------------------------------------
function runOf(F) {   // which run's results are on the street at F
  if (F >= K.run1 - K.cyc1 && F < K.rewind[1]) return 1;
  if (F >= K.run2 - K.cyc2 && F < K.reset) return 2;
  return 0;
}
function bits(run) { return run === 1 ? [BITS.v1, BITS.p1, BITS.in1] : [BITS.v2, BITS.p2, BITS.in2]; }
function lampState(k, F) {   // 0 off, 1 amber (match), 2 red (mismatch); plus age since it lit
  const run = runOf(F); if (!run) return { s: 0, age: -1 };
  const [v, p] = bits(run), c = run === 1 ? K.cyc1 : K.cyc2;
  const f = cycF(run, k) + Math.round(c * 0.6) + 1;
  if (F < f) return { s: 0, age: -1 };
  if (run === 1 && F >= K.rewind[0] + (7 - k)) return { s: 0, age: -1 };
  return { s: v[k] === p[k] ? 1 : 2, age: F - f };
}
function matchRate(F) {
  let n = 0, m = 0;
  for (let k = 0; k < 8; k++) { const L = lampState(k, F); if (L.s) { n++; if (L.s === 1) m++; } }
  const run = runOf(F);
  return run ? m / 8 : 0;
}
function updateRuns(F) {
  // ---- ribbons ----
  const run = runOf(F);
  const [vb, pb] = run ? bits(run) : [[], []];
  let xw = run ? waveX(run, F) : W.x0;
  if (run === 1 && F >= K.rewind[0]) xw = lerp(W.x0 + 8 * W.cw, W.x0, ic((F - K.rewind[0]) / (K.rewind[1] - K.rewind[0])));
  const th = 0.075;
  for (let lane = 0; lane < 2; lane++) {
    const z = lane ? W.laneB : W.laneA, b = lane ? pb : vb, segs = T.ribbon[lane];
    const lvl = (k) => (k < 0 ? W.lo : (b[k] ? W.hi : W.lo));
    for (let k = 0; k < 9; k++) {
      const s = segs[k];
      const xa = k < 8 ? W.x0 + k * W.cw : W.x0 - 0.12, xb = k < 8 ? xa + W.cw : W.x0;
      if (!run) { s.h.visible = s.v.visible = false; continue; }
      if (k === 8) {   // lead from the port
        s.h.visible = true; s.v.visible = false;
        s.h.position.set((xa + xb) / 2, W.lo, z); s.h.scale.set(xb - xa + th, th, th);
        continue;
      }
      const vis = xw > xa + 0.001;
      s.h.visible = vis; s.v.visible = vis && lvl(k) !== lvl(k - 1);
      if (!vis) continue;
      const xe = Math.min(xb, xw);
      s.h.position.set((xa + xe) / 2, lvl(k), z); s.h.scale.set(xe - xa + th, th, th);
      const y0 = Math.min(lvl(k), lvl(k - 1)), y1 = Math.max(lvl(k), lvl(k - 1));
      s.v.position.set(xa, (y0 + y1) / 2, z); s.v.scale.set(th, y1 - y0 + th, th);
    }
  }
  // ---- lamps ----
  st.lamps = [];
  for (let k = 0; k < 8; k++) {
    const L = lampState(k, F), u = T.lamps[k].bulb.material.uniforms;
    const pop = L.s ? ob(L.age / 4) : 0;
    if (L.s === 1) { u.uAlbedo.value.set(1.0, 0.72, 0.22); u.uGlow.value = 0.55; }
    else if (L.s === 2) { const blink = (Math.floor(L.age / 3) % 2) ? 0.35 : 0.8; u.uAlbedo.value.set(0.95, 0.28, 0.22); u.uGlow.value = L.age < 30 ? blink : 0.5; }
    else { u.uAlbedo.value.set(0.81, 0.78, 0.72); u.uGlow.value = 0; }
    T.lamps[k].bulb.scale.setScalar(1 + (L.s ? 0.25 * (1 - pop) + ringv(L.age, 0.12, 0.9, 0.25) : 0));
    st.lamps.push(L);
  }
  st.match = matchRate(F);
  // ---- the hopping stimulus die ----
  const D = T.die6;
  D.visible = false;
  for (const r of [1, 2]) {
    const c = r === 1 ? K.cyc1 : K.cyc2, fStart = cycF(r, 0) - c, fEnd = cycF(r, 7) + (r === 1 ? 14 : 40);
    if (F < fStart || F >= fEnd) continue;
    const ins = bits(r)[2];
    const g = (F - fStart) / c, k = Math.min(7, Math.floor(g)), p = clamp(g - k);
    const from = k === 0 ? [H.x + H.w / 2 + 0.05, 0.55, W.lampZ] : [stationX(k - 1), 0.1, W.lampZ + 0.24];
    const to = [stationX(k), 0.1, W.lampZ + 0.24];
    const air = k === 7 && g >= 8 ? 1 : clamp(p / 0.8);
    const hgt = 0.42 + (k === 0 ? 0.25 : 0);
    D.visible = true;
    D.position.set(lerp(from[0], to[0], air), lerp(from[1], to[1], air) + hgt * Math.sin(Math.PI * air), lerp(from[2], to[2], air));
    // lands showing this cycle's random input on top; tumbles through the hop
    const n = ins[k];
    const target = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0] }[n];
    const qT = new T.THREE.Quaternion().setFromEuler(new T.THREE.Euler(...target));
    const spinAxis = V3(0.3 + hsh(k, r) * 0.5, 0.4, 1).normalize();
    const qS = new T.THREE.Quaternion().setFromAxisAngle(spinAxis, (1 - air) * TAU * (1 + (k % 2)));
    D.quaternion.copy(qS).multiply(qT);
    const land = F - (fStart + (k + 0.8) * c);
    const sq = land >= 0 && land < 10 ? ringv(land, 0.22, 1.0, 0.3) : 0;
    D.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    st.die = { x: D.position.x, y: D.position.y, z: D.position.z, land, k, run: r, air };
  }
  // ---- dice tumbling in the dome while a run is live ----
  const live = (F >= K.lever1 && F < cycF(1, 7) + 6) || (F >= K.lever2 && F < cycF(2, 7) + 6);
  T.domeDice.forEach((d, i) => {
    const ph = F * (0.45 + i * 0.13) + i * 2.1;
    const a = live ? 1 : 0;
    d.position.set(T.domeC[0] + a * 0.12 * Math.sin(ph) + (i - 1) * 0.1, T.domeC[1] + 0.1 + a * 0.13 * Math.abs(Math.sin(ph * 1.3)), T.domeC[2] + a * 0.1 * Math.cos(ph * 0.9) + (i === 1 ? 0.08 : -0.05));
    d.rotation.set(a * ph * 1.1 + i, a * ph * 0.7 + i * 0.5, a * ph * 0.9);
  });
  // ---- gauge needle (match rate) ----
  const m = st.match, needleK = F >= K.rewind[0] && F < K.lever2 + 12 ? 0 : m;
  T.needle.rotation.z = Math.PI / 2 - Math.PI * needleK + ringv(F - K.gauge2, 0.12, 1.2, 0.25) * (F >= K.gauge2 ? 1 : 0);
  // ---- tally: round 2 of at most 5 ----
  T.tallyM.material.uniforms.uMap.value = F >= K.tally && F < K.reset ? T.tx.tally[1] : T.tx.tally[0];
  // ---- clock tower: one tick per cycle ----
  let steps = 0, lastTick = -99;
  for (const r of [1, 2]) for (let k = 0; k < 8; k++) { const f = cycF(r, k); if (F >= f) { steps++; lastTick = f; } }
  T.clockHand.rotation.z = -steps * TAU / 8 + ringv(F - lastTick, 0.18, 1.3, 0.3);
  st.tick = F - lastTick;
  // ---- harness bell (DING) ----
  const dg = F - K.ding;
  T.bell.rotation.z = dg >= 0 && dg < 30 ? 0.5 * Math.exp(-dg / 8) * Math.sin(dg * 1.4) : 0;
  // ---- hoppers bump on landings ----
  const hb = (f) => (F >= f && F < f + 12 ? ringv(F - f, 0.18, 1.1, 0.3) : 0);
  const b0 = hb(K.landC) + hb(K.retossLand), b1 = hb(K.landP);
  T.hoppers[0].scale.set(1 - b0 * 0.5, 1 + b0, 1 - b0 * 0.5);
  T.hoppers[1].scale.set(1 - b1 * 0.5, 1 + b1, 1 - b1 * 0.5);
}

// ---------------------------------------------------------------------------------------------------
// city lights (after match 1.0), reset under the whip home
// ---------------------------------------------------------------------------------------------------
function updateCity(F) {
  st.cityLit = 0;
  T.city.forEach((c) => {
    const f = K.lights[0] + cityDelay(c.b);
    const lit = F >= f && F < K.reset;
    const u = c.mesh.material[1].uniforms;
    u.uMap.value = lit ? T.tx.winLit : T.tx.win;
    u.uGlow.value = lit ? 0.18 + 0.12 * Math.exp(-(F - f) / 6) : 0;
    c.mesh.material[0].uniforms.uGlow.value = lit ? 0.1 : 0;
    if (lit) st.cityLit++;
  });
  const tl = F >= K.lights[0] + 4 && F < K.reset;
  T.clockFace.material.uniforms.uGlow.value = tl ? 0.5 : 0;
}

let ROUTES = null;
function updatePulses(F) {   // loop-periodic: each pulse runs its route an integer number of times per loop
  if (!ROUTES) ROUTES = cityRoutes().map((r) => { const seg = []; let L = 0; for (let k = 0; k < r.length - 1; k++) { const l = Math.hypot(r[k + 1][0] - r[k][0], r[k + 1][1] - r[k][1]); seg.push([r[k], r[k + 1], L, l]); L += l; } return { seg, L }; }).filter((r) => r.L > 1.6);
  T.pulses.forEach((m, j) => {
    const rt = ROUTES[(j * 7) % ROUTES.length];
    const laps = Math.max(1, Math.round(rt.L * 4.5));        // ~1.5 units/s
    const u = ((F / NF) * laps + hsh(j, 4.4)) % 1, d = u * rt.L;
    const sg = rt.seg.find((q) => d >= q[2] && d <= q[2] + q[3]) || rt.seg[rt.seg.length - 1];
    const k = clamp((d - sg[2]) / sg[3]);
    m.visible = true;
    m.position.set(lerp(sg[0][0], sg[1][0], k), 0.055, lerp(sg[0][1], sg[1][1], k));
    m.rotation.set(0, -Math.atan2(sg[1][1] - sg[0][1], sg[1][0] - sg[0][0]), 0);
    const e = Math.min(u, 1 - u) * rt.L;                     // fade in/out at the route ends (pins)
    m.scale.setScalar(clamp(e / 0.25));
  });
}

// ---------------------------------------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------------------------------------
const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);
function hammerArm(F, hits) {   // right-arm forward angle for hammering at frames `hits`
  let f = 0.9;
  for (const h of hits) {
    if (F >= h - 7 && F < h - 2) f = lerp(0.9, 2.7, sm((F - h + 7) / 5));
    else if (F >= h - 2 && F < h) f = lerp(2.7, 0.35, ic((F - h + 2) / 2));
    else if (F >= h && F < h + 5) f = 0.35 + bumpv(F - h, 0.25, 0.9, 0.3);
  }
  return f;
}
export function chipPose(F) {
  const Fc = twos(F);
  const P = { x: W.chip[0], z: W.chip[1], y: 0, yaw: 0, lean: 0, tilt: 0, sq: 0.03 * Math.sin(TAU * F / 48), vis: true,
    aL: { f: 0.15, s: 0.18 }, aR: { f: 0.15, s: 0.18 }, e: 'calm', hat: 0 };
  // expression track
  const E = track(Fc, [[0, 'calm'], [K.tube + 2, 'surprised'], [40, 'determined'], [K.catchC, 'happy'], [K.read[0], 'determined'],
    [K.screenUp + 1, 'surprised'], [84, 'determined'], [98, 'strain'], [K.fuse, 'surprised'], [K.fuse + 4, 'grin'], [152, 'determined'],
    [188, 'happy'], [204, 'calm'], [cycF(1, K.bad) + 2, 'shock'], [cycF(1, K.bad) + 26, 'calm'],
    [K.blame[0], 'angry'], [K.landPl[0], 'squint'], [K.readPl[0], 'surprised'], [K.readPl[0] + 4, 'determined'],
    [K.eject, 'surprised'], [K.bugPeek + 2, 'sheepish'], [K.grab, 'determined'], [K.whack - 1, 'strain'], [K.whack + 3, 'grin'],
    [K.retoss + 6, 'determined'], [cycF(2, 7) + 8, 'happy'], [K.five[0], 'grin'], [520, 'happy'],
    [600, 'determined'], [K.wind[0], 'strain'], [K.dHit + 1, 'squint'], [K.dHit + 4, 'surprised'], [K.slam, 'grin'], [648, 'happy'], [662, 'grin'], [K.reset, 'calm']]);
  P.e = E.e;
  // ---- S1: look up at the tube, catch the ticket, read, tuck it under the hat
  if (F >= 22 && F < 52) { P.lean = -0.18 * sm((F - 22) / 6); P.yaw = 0.18 * sm((F - 30) / 8); }
  if (F >= K.tube && F < K.tube + 14) P.sq += takeSq(F - K.tube - 2);
  if (F >= 42 && F < 66) { const u = sm((F - 42) / 6); P.aL = { f: lerp(0.15, 1.5, u), s: 0.35 }; P.aR = { f: lerp(0.15, 1.5, u), s: 0.35 }; }
  if (F >= K.catchC && F < K.catchC + 12) P.sq += ringv(F - K.catchC, 0.14, 1.0, 0.25);
  if (F >= K.read[0] && F < K.read[1]) { P.yaw = 0.1 * Math.sin((F - K.read[0]) * 0.5); P.lean = 0.12; P.aL = { f: 1.2, s: 0.35 }; P.aR = { f: 1.2, s: 0.35 }; }
  if (F >= 64 && F < 74) { const u = arc(64, 74, F); P.aL = { f: 2.7 * u + 0.15, s: 0.5 }; P.aR = { f: 2.7 * u + 0.15, s: 0.5 }; P.hat = 0.12 * arc(64, 71, F); }
  // ---- S2: the screen springs up; hammer three gate-blocks into a chip; show it off
  if (F >= K.screenUp && F < K.screenUp + 14) { P.sq += takeSq(F - K.screenUp - 2); P.y = 0.1 * arc(K.screenUp + 1, K.screenUp + 9, F); }
  const toAnvil = yawTo([P.x, 0, P.z], ANVIL);
  if (F >= 82 && F < 132) {
    P.yaw = lerp(0, toAnvil, sm((F - 82) / 8));
    P.aR = { f: hammerArm(F, K.hits), s: 0.12 }; P.aL = { f: 0.7, s: 0.3 };
    for (const h of K.hits) if (F >= h && F < h + 8) { P.sq += ringv(F - h, 0.1, 1.0, 0.3); P.lean = 0.2 * Math.exp(-(F - h) / 4); }
    if (F >= K.fuse && F < K.fuse + 5) P.sq += takeSq(F - K.fuse - 1);
  }
  if (F >= 130 && F < 152) {
    P.yaw = lerp(toAnvil, 0, sm((F - 130) / 6));
    const u = sm((F - 132) / 6);
    P.aL = { f: lerp(0.9, 2.9, u), s: 0.35 }; P.aR = { f: lerp(0.9, 2.9, u), s: 0.35 };
    P.y = 0.12 * arc(134, 142, F); P.sq += F >= 142 && F < 152 ? ringv(F - 142, 0.12, 1.0, 0.3) : 0;
  }
  // ---- S3: toss the chip into the harness (over Py), watch it land, watch the run
  const toH = yawTo([P.x, 0, P.z], [H.x, 0, H.z]);
  if (F >= 150 && F < 200) {
    P.yaw = lerp(0, toH * 0.8, sm((F - 150) / 10));
    P.aL = { f: 0.3, s: 0.25 };
    if (F < K.tossC - 4) P.aR = { f: lerp(1.2, 1.0, sm((F - 150) / 8)), s: 0.2 };
    else if (F < K.tossC) { P.aR = { f: lerp(1.0, -0.9, sm((F - K.tossC + 4) / 4)), s: 0.2 }; P.lean = -0.18; P.sq += 0.08; }
    else { P.aR = { f: lerp(-0.9, 2.3, oc((F - K.tossC) / 4)), s: 0.2 }; P.lean = 0.15 * Math.exp(-(F - K.tossC) / 6); }
    if (F >= K.landC && F < K.landC + 14) { P.y = 0.12 * arc(K.landC, K.landC + 8, F); P.aL = { f: 2.4, s: 0.6 }; P.aR = { f: 2.4, s: 0.6 }; }
  }
  if (F >= 200 && F < K.blame[0]) { P.yaw = toH * 0.9; if (F >= cycF(1, K.bad) && F < cycF(1, K.bad) + 12) P.sq += takeSq(F - cycF(1, K.bad) - 2); }
  // ---- S4: blame Py (point, stomp), the plane lands, read, the chip comes back with a bug in it
  const toPy = yawTo([P.x, 0, P.z], [W.py[0], 0, W.py[1]]);
  if (F >= K.blame[0] && F < K.landPl[0] + 4) {
    P.yaw = lerp(toH * 0.9, toPy * 0.85, sm((F - K.blame[0]) / 5));
    P.aR = { f: 0.5, s: 1.45 + 0.1 * Math.sin(F * 0.8) }; P.aL = { f: 0.2, s: 0.5 };
    const st8 = (F - K.blame[0]) % 10; P.y = F < K.blame[1] ? 0.06 * arc(0, 5, st8) : 0; P.lean = -0.08;
  }
  if (F >= K.landPl[0] && F < K.landPl[0] + 10) P.sq += ringv(F - K.landPl[0], 0.16, 1.0, 0.25);
  if (F >= K.readPl[0] && F < K.eject + 4) { P.yaw = lerp(toPy * 0.85, 0, sm((F - K.readPl[0]) / 5)); P.aL = { f: 1.25, s: 0.35 }; P.aR = { f: 1.25, s: 0.35 }; P.lean = 0.1; }
  if (F >= K.eject + 4 && F < K.grab) {
    P.yaw = lerp(0, toAnvil * 0.8, sm((F - K.eject - 4) / 8));
    if (F >= K.bugPeek) { P.yaw = lerp(toAnvil * 0.8, 0.12, sm((F - K.bugPeek - 2) / 5)); P.aL = { f: 2.4, s: 0.7 }; P.aR = { f: 0.3, s: 0.3 }; P.tilt = 0.08 * Math.sin((F - K.bugPeek) * 0.5); P.lean = -0.06; }
  }
  // ---- S5: whack the bug out with the wrench, pick the chip up, toss it back
  if (F >= K.grab && F < K.retoss + 8) {
    P.yaw = toAnvil * 0.85; P.aL = { f: 0.5, s: 0.3 };
    if (F < K.whack - 10) P.aR = { f: lerp(0.3, 0.9, sm((F - K.grab) / 3)), s: 0.15 };
    else if (F < K.whack - 2) { P.aR = { f: lerp(0.9, 3.0, sm((F - K.whack + 10) / 8)), s: 0.15 }; P.lean = -0.18 * sm((F - K.whack + 10) / 8); P.sq += 0.06; }
    else if (F < K.whack) { P.aR = { f: lerp(3.0, 0.3, ic((F - K.whack + 2) / 2)), s: 0.15 }; P.lean = 0.2; }
    else { P.aR = { f: 0.3 + bumpv(F - K.whack, 0.4, 0.9, 0.3), s: 0.15 }; P.lean = 0.22 * Math.exp(-(F - K.whack) / 5); P.sq += ringv(F - K.whack, 0.12, 1.0, 0.3); }
    if (F >= 398) { P.aL = { f: lerp(0.5, 1.0, sm((F - 398) / 4)), s: 0.3 }; }
    if (F >= K.retoss - 3) { P.yaw = lerp(toAnvil * 0.85, toH * 0.8, sm((F - K.retoss + 3) / 4)); P.aL = { f: lerp(-0.6, 2.2, oc((F - K.retoss) / 4)), s: 0.3 }; }
  }
  if (F >= K.retoss + 8 && F < K.five[0]) {
    P.yaw = toH * 0.85;
    if (F >= K.ding && F < K.ding + 8) { P.y = 0.14 * arc(K.ding, K.ding + 8, F); P.sq += takeSq(F - K.ding - 2); }
  }
  // ---- S6: high five with Py's tail, cheer
  if (F >= K.five[0] && F < 530) {
    P.yaw = lerp(toH * 0.85, toPy * 0.7, sm((F - K.five[0]) / 4));
    const u = sm((F - K.five[0]) / 4);
    P.aR = { f: lerp(0.4, 2.6, u), s: 0.7 }; P.aL = { f: 0.4, s: 0.4 };
    if (F >= 503) { P.sq += ringv(F - 503, 0.12, 1.0, 0.3); P.y = 0.12 * arc(503, 511, F); }
    if (F >= 512) { P.y = 0.1 * Math.abs(Math.sin((F - 512) * 0.4)); P.aL = { f: 2.6, s: 0.6 }; }
  }
  // ---- S7/S8: the fairground
  if (F >= 528 && F < K.duoIn[0]) P.vis = false;
  if (F >= K.duoIn[0] && F < K.whipH[0] + 8) {
    P.x = FAIR_C[0]; P.z = FAIR_C[2];
    const toPad = yawTo([P.x, 0, P.z], [W.pad[0], 0, W.pad[1]]);
    P.yaw = toPad * 0.6;
    if (F < K.duoIn[1]) { const u = (F - K.duoIn[0]) / (K.duoIn[1] - K.duoIn[0]); P.x = lerp(8.6, FAIR_C[0], u); P.y = STG * sm(u * 1.4) + 0.5 * Math.sin(Math.PI * u); P.sq = -0.12 * Math.sin(Math.PI * u); P.aL = { f: 2.2, s: 0.6 }; P.aR = { f: 2.2, s: 0.6 }; }
    else P.y = STG;
    if (F >= K.duoIn[1] && F < K.duoIn[1] + 10) P.sq += ringv(F - K.duoIn[1], 0.14, 1.0, 0.25);
    if (F >= K.duoIn[1]) P.aR = { f: 0.9, s: 0.15 };
    if (F >= K.wind[0] && F < K.dHit) { const u = sm((F - K.wind[0]) / (K.wind[1] - K.wind[0])); P.aR = { f: lerp(0.9, 3.1, u), s: 0.15 }; P.aL = { f: lerp(0.3, 2.8, u), s: 0.2 }; P.lean = -0.25 * u; P.sq += 0.08 * u; P.yaw = toPad * 0.9; }
    if (F >= K.dHit - 1 && F < K.dHit + 12) { const a = F - K.dHit + 1; P.aR = { f: a < 2 ? lerp(3.1, 0.8, a / 2) : 0.8, s: 0.15 }; P.aL = { f: a < 2 ? lerp(2.8, 0.8, a / 2) : 0.8, s: 0.2 }; P.lean = 0.3 * Math.exp(-a / 4); P.sq += ringv(a, 0.14, 1.0, 0.3); P.yaw = toPad * 0.9; }
    if (F >= K.dHit + 12 && F < K.slam) { P.lean = -0.25 * sm((F - K.dHit - 12) / 4); P.yaw = toPad * 0.3; }
    if (F >= K.slam) {
      P.yaw = -0.35; const a = F - K.slam;
      P.y = STG + 0.14 * Math.abs(Math.sin(a * 0.3)) * (a > 4 ? 1 : 0);
      P.aL = { f: 2.7 + 0.2 * Math.sin(a * 0.6), s: 0.5 }; P.aR = { f: 2.4 + 0.3 * Math.sin(a * 0.6 + 1.7), s: 0.6 };
      if (a < 10) P.sq += takeSq(a - 2);
    }
  }
  if (F >= K.reset) { P.x = W.chip[0]; P.z = W.chip[1]; P.y = 0; P.vis = true; }
  return P;
}
function applyArm(arm, a, side) { arm.g.rotation.set(-a.f, 0, side * a.s); }
function updateChip(F) {
  const P = chipPose(F), C = T.chip;
  C.root.visible = P.vis;
  C.root.position.set(P.x, P.y, P.z);
  C.root.rotation.set(0, P.yaw, 0);
  C.body.rotation.set(P.lean, 0, P.tilt);
  C.body.scale.set(1 + P.sq * 0.5, 1 - P.sq, 1 + P.sq * 0.5);
  applyArm(C.arms[0], P.aL, -1); applyArm(C.arms[1], P.aR, 1);
  C.hat.position.y = 0.61 + P.hat;
  C.face.material.uniforms.uMap.value = T.tx.face.chip[P.e][Math.floor(F / 2) % 2];
  // walk the little legs when hopping
  C.legs.forEach((g, i) => { g.rotation.x = P.y > 0.02 && P.y < 0.7 ? (i ? -0.3 : 0.3) : 0; });
  C.root.updateMatrixWorld(true);
  st.chip = P;
  st.handL = C.arms[0].hand.getWorldPosition(V3(0, 0, 0));
  st.handR = C.arms[1].hand.getWorldPosition(V3(0, 0, 0));
  st.chipHead = C.hat.getWorldPosition(V3(0, 0, 0));
}

// ---------------------------------------------------------------------------------------------------
// Py: spine (tail tip -> coil -> neck -> head) rebuilt every frame
// ---------------------------------------------------------------------------------------------------
export function pyPose(F) {
  const Fc = twos(F);
  const P = { x: W.py[0], y: 0, z: W.py[1], yaw: 0, head: [0, 0, 0], hyaw: 0, hroll: 0, hpitch: 0, sq: 0, coil: 0,
    tail: null, e: 'calm', vis: true, quill: false };
  P.head[1] = 0.025 * Math.sin(TAU * F / 40);
  P.hroll = 0.05 * Math.sin(TAU * F / 60);
  const E = track(Fc, [[0, 'calm'], [K.tube + 2, 'surprised'], [40, 'determined'], [K.catchP, 'happy'], [K.read[0], 'determined'],
    [K.screenUp + 1, 'surprised'], [82, 'smug'], [K.bonk, 'shock'], [K.bonk + 2, 'swirl'], [114, 'determined'], [K.roll[1], 'smug'],
    [168, 'surprised'], [K.tossP, 'determined'], [K.landP, 'happy'], [K.lever1, 'determined'], [204, 'calm'],
    [cycF(1, K.bad) + 2, 'shock'], [cycF(1, K.bad) + 26, 'calm'],
    [K.blame[0], 'angry'], [K.landPl[1], 'squint'], [K.readPl[0], 'determined'], [K.eject, 'surprised'], [K.eject + 12, 'determined'], [K.check, 'happy'], [K.spot - 2, 'shock'], [K.spot + 3, 'smug'],
    [K.whack, 'squint'], [K.whack + 4, 'happy'], [K.lever2 - 2, 'determined'], [cycF(2, 7) + 8, 'happy'], [K.five[0], 'grin'], [520, 'happy'],
    [600, 'determined'], [K.wind[0], 'strain'], [K.dHit + 2, 'surprised'], [K.slam, 'grin'], [652, 'happy'], [666, 'grin'], [K.reset, 'calm']]);
  P.e = E.e === 'strain' ? 'squint' : E.e;
  const hopTo = (tgt, f0, f1) => { const u = sm((F - f0) / (f1 - f0)); P.head = [lerp(P.head[0], tgt[0], u), lerp(P.head[1], tgt[1], u), lerp(P.head[2], tgt[2], u)]; };
  // S1: look up, catch with the tail, read, set the ticket on the lectern
  if (F >= 22 && F < 56) { hopTo([0.02, 0.1, -0.04], 22, 30); P.hpitch = -0.35 * sm((F - 24) / 6); }
  if (F >= K.tube && F < K.tube + 14) P.sq += takeSq(F - K.tube - 2);
  if (F >= 42 && F < 72) P.tail = { w: [P.x + 0.25, 0.85, P.z + 0.3], k: sm((F - 42) / 8) };
  if (F >= K.read[0] && F < 66) { hopTo([0.16, 0.02, 0.12], K.read[0], K.read[0] + 5); P.hyaw = 0.5; P.hpitch = 0.15; P.tail = { w: [P.x + 0.3, 0.7, P.z + 0.35], k: 1 }; }
  if (F >= 66 && F < 76) P.tail = { w: [LECTERN[0] - 0.12, LECTERN[1] + 0.05, LECTERN[2] + 0.05], k: sm((F - 66) / 5) * (1 - sm((F - 72) / 4)) };
  // S2: screen take; the peek (stretch up over the screen) and the bonk
  if (F >= K.screenUp && F < K.screenUp + 14) { P.sq += takeSq(F - K.screenUp - 2); P.head[1] += 0.1 * arc(K.screenUp, K.screenUp + 8, F); }
  if (F >= K.peek[0] && F < K.bonk + 3) { const u = sm((F - K.peek[0]) / (K.peek[1] - K.peek[0])); P.head = [lerp(0, -0.52, u), lerp(0, 0.52, u), lerp(0, -0.02, u)]; P.hyaw = -0.9 * u; P.hpitch = 0.3 * u; P.hroll = 0.25 * u; }
  if (F >= K.bonk && F < 118) {
    const a = F - K.bonk;
    const back = [lerp(-0.52, 0.06, oc(a / 5)), lerp(0.52, -0.12, oc(a / 5)), 0.0];
    P.head = [back[0] + bumpv(a, 0.06, 0.9, 0.2), back[1] + ringv(a, 0.05, 1.0, 0.2), back[2]];
    P.hroll = 0.3 * Math.sin(a * 0.9) * Math.exp(-a / 8); P.hyaw = -0.2 * Math.exp(-a / 6); P.sq += ringv(a, 0.2, 0.9, 0.2);
  }
  // writing the reference model on the lectern (quill in the tail)
  if (F >= 112 && F < K.roll[1] + 2) {
    hopTo([0.3, -0.12, 0.14], 112, 118); P.hyaw = 0.7; P.hpitch = 0.4;
    const k = F - K.scribble[0], sc = F < K.scribble[1];
    P.tail = { w: [LECTERN[0] + (sc ? 0.08 * Math.sin(k * 1.35) - 0.04 + (k / 22) * 0.1 : 0.05), LECTERN[1] + 0.07 + (sc ? 0.025 * Math.abs(Math.sin(k * 0.9)) : 0.12), LECTERN[2] + (sc ? 0.06 - (k / 22) * 0.12 + 0.02 * Math.sin(k * 2.1) : 0)], k: sm((F - 112) / 5) };
    P.quill = F < K.roll[0] + 2;
  }
  // show the can proudly
  if (F >= K.roll[1] && F < K.tossP + 2) {
    P.tail = { w: [P.x + 0.34, lerp(0.55, 1.05, sm((F - K.showP[0]) / 6)), P.z + 0.28], k: sm((F - K.roll[1]) / 4) };
    hopTo([0.08, 0.05, 0.05], K.roll[1], K.roll[1] + 6); P.hyaw = 0.35;
  }
  // S3: duck under Chip's toss, toss the can, pull the lever, watch the run
  if (F >= 168 && F < 186) { const u = arc(168, 186, F); P.head = [P.head[0] - 0.05 * u, P.head[1] - 0.32 * u, P.head[2]]; P.hpitch = 0.4 * u; P.sq += 0.12 * u; }
  if (F >= K.tossP - 5 && F < K.tossP + 6) {
    const u = (F - K.tossP + 5) / 11;
    P.tail = { w: [P.x + lerp(-0.1, 0.55, oc(u)), lerp(0.7, 1.05, u), P.z + lerp(-0.35, 0.1, oc(u))], k: 1 };
  }
  const toStreet = yawTo([P.x, 0, P.z], [1.0, 0, -1.0]);
  if (F >= K.lever1 - 4 && F < K.lever1 + 12) { P.tail = { w: leverKnob(F), k: sm((F - K.lever1 + 4) / 4) * (1 - sm((F - K.lever1 - 7) / 5)) }; P.hyaw = 0.9; }
  if (F >= K.landP && F < K.blame[0]) { P.hyaw = lerp(P.hyaw, toStreet, sm((F - K.landP) / 10)); if (F >= cycF(1, K.bad) && F < cycF(1, K.bad) + 12) P.sq += takeSq(F - cycF(1, K.bad) - 2); }
  // S4: blame Chip, the plane, read, the bug
  const toChip = yawTo([P.x, 0, P.z], [W.chip[0], 0, W.chip[1]]);
  if (F >= K.blame[0] && F < K.landPl[1] + 3) {
    const u = sm((F - K.blame[0]) / 5);
    P.hyaw = lerp(toStreet, toChip, u); P.head = [-0.12 * u, 0.08 * u + 0.04 * Math.sin((F - K.blame[0]) * 0.9), 0];
    P.tail = { w: [P.x - 0.6, 0.55 + 0.05 * Math.sin(F * 0.7), P.z + 0.2], k: u };
  }
  if (F >= K.landPl[1] && F < K.landPl[1] + 10) P.sq += ringv(F - K.landPl[1], 0.16, 1.0, 0.25);
  if (F >= K.readPl[0] && F < K.eject + 6) { P.hyaw = 0.2; P.hpitch = 0.25; P.tail = { w: [P.x + 0.08, 0.72, P.z + 0.42], k: sm((F - K.readPl[0]) / 4) }; }
  if (F >= K.eject + 6 && F < K.spot - 3) {   // checks its own model on the lectern: clean
    hopTo([0.3, -0.12, 0.14], K.eject + 6, K.eject + 12); P.hyaw = 0.75; P.hpitch = 0.45;
  }
  if (F >= K.spot - 3 && F < K.grab + 4) {
    P.hyaw = lerp(0.75, toChip, sm((F - K.spot + 3) / 5));
    if (F >= K.spot - 3 && F < K.spot + 5) P.sq += takeSq(F - K.spot);
    if (F >= K.spot) P.tail = { w: [ANVIL[0] + 0.55, 0.62, ANVIL[2] + 0.25], k: sm((F - K.spot) / 4) * (1 - sm((F - K.grab - 2) / 4)) };
    P.head = [-0.08, 0.06, 0.02];
  }
  if (F >= K.retossP - 7 && F < K.retossP + 6) {   // pick the model up with the tail and toss it back in
    const pk = F < K.retossP - 3;
    P.tail = pk ? { w: [LECTERN[0] + 0.05, LECTERN[1] + 0.12, LECTERN[2]], k: sm((F - K.retossP + 7) / 3) }
      : { w: [P.x + lerp(-0.1, 0.55, oc((F - K.retossP + 3) / 9)), lerp(0.7, 1.05, (F - K.retossP + 3) / 9), P.z + lerp(-0.35, 0.1, oc((F - K.retossP + 3) / 9))], k: 1 };
    P.hyaw = 0.9;
  }
  if (F >= K.grab + 4 && F < K.retossLand) { P.hyaw = toChip * 0.8; if (F >= K.whack && F < K.whack + 10) P.sq += takeSq(F - K.whack - 1); }
  if (F >= K.lever2 - 4 && F < K.lever2 + 12) { P.tail = { w: leverKnob(F), k: sm((F - K.lever2 + 4) / 4) * (1 - sm((F - K.lever2 - 7) / 5)) }; P.hyaw = 0.9; }
  if (F >= K.lever2 + 12 && F < K.five[0]) { P.hyaw = toStreet; if (F >= K.ding && F < K.ding + 8) { P.sq += takeSq(F - K.ding - 2); P.head[1] += 0.12 * arc(K.ding, K.ding + 8, F); } }
  // S6: high five
  if (F >= K.five[0] && F < 530) {
    const mid = [(W.chip[0] + W.py[0]) / 2 + 0.12, 1.12, (W.chip[1] + W.py[1]) / 2 + 0.15];
    P.hyaw = toChip * 0.6; P.head = [-0.05, 0.08, 0.02];
    P.tail = { w: F < 503 ? [lerp(P.x + 0.2, mid[0], sm((F - K.five[0]) / 5)), lerp(0.6, mid[1], sm((F - K.five[0]) / 5)), mid[2]] : [mid[0] + 0.1, mid[1] + 0.08 * Math.exp(-(F - 503) / 4), mid[2]], k: 1 - sm((F - 520) / 6) };
    if (F >= 503) P.sq += ringv(F - 503, 0.12, 1.0, 0.3);
    if (F >= 512) P.head[1] += 0.06 * Math.abs(Math.sin((F - 512) * 0.37 + 1));
  }
  // S7/S8: the fairground
  if (F >= 528 && F < K.duoIn[0]) P.vis = false;
  if (F >= K.duoIn[0] && F < K.whipH[0] + 8) {
    P.x = FAIR_P[0]; P.z = FAIR_P[2]; P.y = STG;
    if (F < K.duoIn[1] + 2) { const u = clamp((F - K.duoIn[0] - 2) / (K.duoIn[1] - K.duoIn[0])); P.x = lerp(8.3, FAIR_P[0], u); P.y = STG * sm(u * 1.4) + 0.6 * Math.sin(Math.PI * u); P.sq = -0.2 * Math.sin(Math.PI * u); }
    if (F >= K.duoIn[1] + 2 && F < K.duoIn[1] + 12) P.sq += ringv(F - K.duoIn[1] - 2, 0.16, 1.0, 0.25);
    P.hyaw = 0.5;
    if (F >= K.wind[0] && F < K.dHit + 6) { P.tail = { w: 'mallet', k: sm((F - K.wind[0]) / 4) }; P.hyaw = 0.8; P.head = [0.05, -0.05 + 0.1 * sm((F - K.wind[0]) / 8), 0]; }
    if (F >= K.dHit + 6 && F < K.slam) { P.hyaw = 0.4; P.hpitch = -0.45 * sm((F - K.dHit - 6) / 5); P.head = [0.05, 0.12, 0]; }
    if (F >= K.slam) {
      const a = F - K.slam;
      P.hyaw = 0.35 + 0.25 * Math.sin(a * 0.25); P.hpitch = -0.15;
      P.head = [-0.06 + 0.02 * Math.sin(a * 0.5), 0.1 + 0.3 * sm(a / 8) + 0.08 * Math.abs(Math.sin(a * 0.33 + 1.1)), 0.1];
      P.tail = { w: [P.x + 0.3 + 0.1 * Math.sin(a * 0.6), STG + 0.95 + 0.1 * Math.sin(a * 0.45), P.z + 0.25], k: sm(a / 6) };
      if (a < 10) P.sq += takeSq(a - 2);
    }
  }
  if (F >= K.reset) { P.x = W.py[0]; P.z = W.py[1]; P.y = 0; P.vis = true; }
  return P;
}
function leverKnob(F) { const w = T.lever.localToWorld(V3(0, 0.38, 0)); return [w.x, w.y, w.z]; }
const HEAD0 = [0, 0.66, 0.06];
function updatePy(F) {
  const P = pyPose(F), Pq = T.py, THREE = T.THREE;
  Pq.root.visible = P.vis;
  Pq.root.position.set(P.x, P.y, P.z);
  Pq.root.rotation.set(0, P.yaw, 0);
  Pq.root.updateMatrixWorld(true);
  const hd = V3(HEAD0[0] + P.head[0], HEAD0[1] + P.head[1] - P.sq * 0.25, HEAD0[2] + P.head[2]);
  // tail tip target (local)
  const rest = V3(0.36 + 0.03 * Math.sin(F * 0.21), 0.07 + 0.05 * Math.abs(Math.sin(F * 0.13)), 0.22);
  let tip = rest.clone();
  if (P.tail) {
    let w = P.tail.w;
    if (w === 'mallet') { const m = T.mallet.localToWorld(V3(0, 0.2, 0)); w = [m.x, m.y, m.z]; }
    const loc = Pq.root.worldToLocal(V3(...w));
    const d = loc.clone().sub(V3(0.2, 0.08, 0.05)); if (d.length() > 1.25) loc.copy(V3(0.2, 0.08, 0.05).add(d.setLength(1.25)));
    tip = rest.clone().lerp(loc, clamp(P.tail.k));
  }
  // control points: tail tip -> tail bend -> coil (1.25 turns) -> neck -> head bottom
  const pts = [tip];
  const tb = V3(0.24, 0.08, 0.1);
  const mid = tip.clone().add(tb).multiplyScalar(0.5); mid.y += 0.12 * tip.distanceTo(tb);
  pts.push(mid, tb);
  const coilK = 1 + P.sq * 0.4;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, a = 0.35 + t * TAU * 1.2, r = lerp(0.27, 0.17, t) * coilK;
    pts.push(V3(Math.cos(a) * r, 0.085 + t * 0.07, -0.04 + Math.sin(a) * r * 0.95));
  }
  const nb = V3(0.02, 0.28, 0.0);
  nb.x += (hd.x) * 0.35; nb.z += hd.z * 0.35;
  pts.push(nb, hd.clone().add(V3(0, -0.17, -0.02)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const frames = curve.computeFrenetFrames(PY_SEG, false);
  const pos = Pq.body.geometry.attributes.position, nor = Pq.body.geometry.attributes.normal, hn = Pq.body.geometry.attributes.hullNormal;
  const p = V3(0, 0, 0), n = V3(0, 0, 0);
  for (let i = 0; i <= PY_SEG; i++) {
    const s = i / PY_SEG;
    curve.getPointAt(s, p);
    const r = (0.016 + 0.078 * sm(s / 0.3)) * (1 - 0.18 * sm((s - 0.8) / 0.2)) * (1 + P.sq * 0.25);
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= PY_RAD; j++) {
      const th = j / PY_RAD * TAU, c = Math.cos(th), sn = Math.sin(th);
      n.set(N.x * c + B.x * sn, N.y * c + B.y * sn, N.z * c + B.z * sn);
      const k = i * (PY_RAD + 1) + j;
      pos.setXYZ(k, p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
      nor.setXYZ(k, n.x, n.y, n.z); hn.setXYZ(k, n.x, n.y, n.z);
    }
  }
  pos.needsUpdate = nor.needsUpdate = hn.needsUpdate = true;
  Pq.body.geometry.computeBoundingSphere();
  // head
  Pq.head.position.copy(hd);
  const cam = T.camera.position.clone(), camL = Pq.root.worldToLocal(cam.clone());
  const toCam = Math.atan2(camL.x - hd.x, camL.z - hd.z);
  Pq.head.rotation.set(P.hpitch - 0.05, toCam * 0.55 + P.hyaw * 0.8, P.hroll, 'YXZ');
  Pq.headM.scale.set(1.12 * (1 + P.sq * 0.4), 0.96 * (1 - P.sq * 0.6), 1.0 * (1 + P.sq * 0.4));
  Pq.headM.material.uniforms.uMap.value = T.tx.face.py[P.e][Math.floor(F / 2) % 2];
  // quill at the tail tip
  Pq.quill.visible = P.quill;
  Pq.quill.position.copy(tip); Pq.quill.rotation.set(0.5, 0.3, -0.5);
  st.py = P;
  st.pyTail = Pq.root.localToWorld(tip.clone());
  st.pyHead = Pq.head.getWorldPosition(V3(0, 0, 0));
}

// ---------------------------------------------------------------------------------------------------
// props
// ---------------------------------------------------------------------------------------------------
const hide = (m) => { m.visible = false; };
const place = (m, p, rot = null) => { m.visible = true; m.position.set(p[0], p[1], p[2]); if (rot) m.rotation.set(...rot); };
const arcPos = (a, b, u, h) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u) + h * Math.sin(Math.PI * u), lerp(a[2], b[2], u)];
const v2a = (v) => [v.x, v.y, v.z];
function updateProps(F) {
  const THREE = T.THREE;
  const [tC, tP, t0] = T.tickets;
  const handsMid = () => { const a = st.handL, b = st.handR; return [(a.x + b.x) / 2, (a.y + b.y) / 2 + 0.03, (a.z + b.z) / 2 + 0.04]; };
  // ---- the order ticket: out of the tube, poof into two identical copies ----
  [tC, tP, t0].forEach(hide);
  t0.material.uniforms.uMap.value = T.tx.ticket; tC.material.uniforms.uMap.value = T.tx.ticket;
  const poofP = [MOUTH[0], 1.78, MOUTH[2] + 0.55];
  if (F >= K.pop && F < K.split) {
    const u = (F - K.pop) / (K.split - K.pop);
    place(t0, [MOUTH[0], lerp(MOUTH[1], poofP[1], oc(u)), lerp(MOUTH[2] + 0.1, poofP[2], oc(u))], [-0.3 + u * TAU, 0.2, 0.1]);
    t0.scale.setScalar(lerp(0.4, 1, oc(u * 2)));
  }
  if (F >= K.split && F < K.catchC) { const u = (F - K.split) / (K.catchC - K.split); place(tC, arcPos(poofP, handsMid(), oc(u), 0.2), [-0.4, 0.3 - u * 3, 0.2]); tC.scale.setScalar(1); }
  if (F >= K.catchC && F < 70) { place(tC, handsMid(), [-0.35, 0, 0]); }
  if (F >= 64 && F < 70) { const u = sm((F - 64) / 6), hp = st.chipHead; place(tC, [lerp(handsMid()[0], hp.x, u), lerp(handsMid()[1], hp.y + 0.05, u), lerp(handsMid()[2], hp.z + 0.05, u)], [-0.35 - u * 1.2, 0, 0]); tC.scale.setScalar(1 - 0.5 * u); }
  if (F >= K.split && F < K.catchP) { const u = (F - K.split) / (K.catchP - K.split); place(tP, arcPos(poofP, v2a(st.pyTail), oc(u), 0.2), [-0.4, -0.3 + u * 3, -0.2]); }
  if (F >= K.catchP && F < 76) place(tP, [st.pyTail.x, st.pyTail.y + 0.08, st.pyTail.z + 0.04], [-0.3, -0.4, 0]);
  if (F >= 72 && F < K.reset) {   // resting on the lectern's corner
    const u = sm((F - 72) / 5), rp = T.lecternTop.localToWorld(V3(-0.14, 0.03, -0.08));
    if (F < 76) place(tP, [lerp(st.pyTail.x, rp.x, u), lerp(st.pyTail.y + 0.08, rp.y, u), lerp(st.pyTail.z + 0.04, rp.z, u)], [lerp(-0.3, -Math.PI / 2 - 0.55, u), 0, 0]);
    else place(tP, v2a(rp), [-Math.PI / 2 - 0.55 + 0.35, 0.15, 0]);
    tP.scale.setScalar(0.8);
  }
  // ---- the folding screen ----
  const scU = F < K.screenUp ? 0 : F < K.screenDown ? ob((F - K.screenUp) / 8) : 1 - sm((F - K.screenDown) / 10);
  T.screen.root.visible = scU > 0.02;
  T.screen.root.scale.set(1, Math.max(0.02, scU), 1);
  T.screen.panels.forEach((pg, k) => { pg.rotation.y = (k % 2 ? -1 : 1) * lerp(0.9, 0.35, clamp(scU)); });
  const bk = F >= K.bonk - 2 && F < K.bonk + 16 ? (F < K.bonk ? sm((F - K.bonk + 2) / 2) : 1 - sm((F - K.bonk - 6) / 10)) : 0;
  T.screen.top.position.y = 0.9 - 0.48 + 0.48 * bk + (F >= K.bonk ? ringv(F - K.bonk, 0.05, 1.2, 0.3) : 0);
  T.screen.top.visible = bk > 0.01;
  // ---- gate blocks -> the chip (DUT) ----
  const hitN = K.hits.filter((h) => F >= h).length;
  T.blocks.forEach((b, i) => {
    if (F >= K.fuse && F < K.reset) { hide(b); return; }
    const spread = [0.13, 0.1, 0.075, 0.06][hitN];
    let y = ANVIL[1] + 0.065;
    for (const h of K.hits) if (F >= h && F < h + 8) y += 0.08 * Math.sin(Math.PI * (F - h) / 8) * (1 + (i % 2) * 0.4);
    place(b, [ANVIL[0] + (i - 1) * spread, y, ANVIL[2]], [0, -0.4 + (i - 1) * 0.1, 0]);
    if (F >= K.hits[2] + 3) { const u = sm((F - K.hits[2] - 3) / 4); b.scale.setScalar(1 - 0.3 * u); } else b.scale.setScalar(1);
  });
  // DUT path
  const D = T.dut; D.visible = false; D.scale.setScalar(1);
  const dutAnvil = [ANVIL[0], ANVIL[1] + 0.055, ANVIL[2]];
  if (F >= K.fuse && F < 132) { place(D, dutAnvil, [0, -0.5, 0]); D.scale.setScalar(ob((F - K.fuse) / 4)); }
  if (F >= 132 && F < K.tossC - 4) { const u = sm((F - 132) / 5); const hm = handsMid(); place(D, [lerp(dutAnvil[0], hm[0], u), lerp(dutAnvil[1], hm[1] + 0.06, u), lerp(dutAnvil[2], hm[2], u)], [0.2, 0.3, 0]); }
  if (F >= K.tossC - 4 && F < K.tossC) place(D, [st.handR.x, st.handR.y + 0.05, st.handR.z], [0.4, 0.3, 0.3]);
  if (F >= K.tossC && F < K.landC + 6) {
    const u = clamp((F - K.tossC) / (K.landC - K.tossC));
    place(D, F < K.landC ? arcPos([st.handR.x, st.handR.y, st.handR.z], HOP_A, u, 1.1) : [HOP_A[0], HOP_A[1] - 0.25 * sm((F - K.landC) / 5), HOP_A[2]], [u * 5.5, u * 2, 0.5]);
  }
  if (F >= K.eject && F < K.retoss) {
    const u = clamp((F - K.eject) / (K.ejectLand - K.eject));
    const p = F < K.ejectLand ? arcPos(HOP_A, dutAnvil, u, 1.0) : dutAnvil;
    const wk = F >= K.whack ? ringv(F - K.whack, 0.35, 1.2, 0.3) : 0;
    place(D, [p[0], p[1] + (F >= K.ejectLand && F < K.ejectLand + 8 ? 0.06 * Math.abs(Math.sin((F - K.ejectLand) * 0.8)) * Math.exp(-(F - K.ejectLand) / 4) : 0), p[2]], [F < K.ejectLand ? -u * 7 : 0, -0.5, 0]);
    D.scale.set(1 + wk * 0.5, 1 - wk, 1 + wk * 0.5);
    if (F >= 398) { const u2 = sm((F - 398) / 4); place(D, [lerp(dutAnvil[0], st.handL.x, u2), lerp(dutAnvil[1], st.handL.y + 0.05, u2), lerp(dutAnvil[2], st.handL.z, u2)], [0.2, -0.5, 0]); }
  }
  if (F >= K.retoss && F < K.retossLand + 6) {
    const u = clamp((F - K.retoss) / (K.retossLand - K.retoss));
    const src = [st.handL.x, st.handL.y, st.handL.z];
    place(D, F < K.retossLand ? arcPos(src, HOP_A, u, 1.0) : [HOP_A[0], HOP_A[1] - 0.25 * sm((F - K.retossLand) / 5), HOP_A[2]], [u * 5, u * 2.5, 0.4]);
  }
  st.dut = D.visible ? v2a(D.position) : null;
  // ---- the scroll -> the model can ----
  const sStage = F >= 126 ? 2 : F >= 118 ? 1 : 0;
  T.scrollM.material.uniforms.uMap.value = T.tx.scroll[F >= K.reset || F < 112 ? 0 : sStage];
  const rollU = F >= K.roll[0] && F < K.reset ? sm((F - K.roll[0]) / (K.roll[1] - K.roll[0])) : 0;
  T.scrollM.visible = rollU < 0.97;
  T.scrollM.scale.set(1 - rollU * 0.95, 1, 1);
  T.scrollM.position.x = -0.19 * rollU;
  const can = T.can; can.visible = false; can.scale.setScalar(1);
  if (F >= K.roll[1] - 4 && F < K.roll[1] + 2) { const p = T.lecternTop.localToWorld(V3(-0.17, 0.08, 0)); place(can, v2a(p), [0, 0, Math.PI / 2]); can.scale.setScalar(ob((F - K.roll[1] + 4) / 5)); }
  if (F >= K.roll[1] + 2 && F < K.tossP) place(can, [st.pyTail.x, st.pyTail.y + 0.1, st.pyTail.z], [0.2, 0, 0.3]);
  if (F >= K.tossP && F < K.landP + 6) {
    const u = clamp((F - K.tossP) / (K.landP - K.tossP));
    const src = [W.py[0] + 0.5, 1.1, W.py[1] + 0.1];
    place(can, F < K.landP ? arcPos(src, HOP_B, u, 0.8) : [HOP_B[0], HOP_B[1] - 0.25 * sm((F - K.landP) / 5), HOP_B[2]], [u * 6, 0, u * 3]);
  }
  const canDesk = v2a(T.lecternTop.localToWorld(V3(0.05, 0.08, 0.02)));
  if (F >= K.eject && F < K.retossP - 3) {   // the diagnostic sends both candidates back for inspection
    const u = clamp((F - K.eject) / (K.ejectLand - K.eject));
    place(can, F < K.ejectLand ? arcPos(HOP_B, canDesk, u, 0.8) : canDesk, [F < K.ejectLand ? u * 6 : 0, 0.3, Math.PI / 2]);
  }
  if (F >= K.retossP - 3 && F < K.retossP) place(can, [st.pyTail.x, st.pyTail.y + 0.1, st.pyTail.z], [0.2, 0, 0.3]);
  if (F >= K.retossP && F < K.retossPLand + 6) {
    const u = clamp((F - K.retossP) / (K.retossPLand - K.retossP));
    const src = [W.py[0] + 0.5, 1.0, W.py[1] + 0.1];
    place(can, F < K.retossPLand ? arcPos(src, HOP_B, u, 0.7) : [HOP_B[0], HOP_B[1] - 0.25 * sm((F - K.retossPLand) / 5), HOP_B[2]], [u * 6, 0, u * 3]);
  }
  st.can = can.visible ? v2a(can.position) : null;
  // ---- printer slip -> two paper planes ----
  const sl = T.slip; sl.visible = false;
  const slot = T.harness.localToWorld(V3(0.18, 0.26, 1.3 / 2 + 0.03));
  if (F >= K.slip && F < K.planes) {
    const u = sm((F - K.slip) / 14);
    place(sl, [slot.x, slot.y + 0.2 * u + 0.02 * Math.sin(F * 1.7), slot.z + 0.05 + 0.1 * u], [-0.4 - 0.2 * Math.sin(F * 0.9), 0, 0.05 * Math.sin(F * 1.3)]);
    sl.scale.set(1, Math.max(0.05, u), 1);
  }
  const plane = (m, target, land, side) => {
    m.visible = false;
    if (F < K.planes || F >= land + 4) return;
    const u = clamp((F - K.planes) / (land - K.planes));
    const a = [slot.x, slot.y + 0.3, slot.z + 0.15], b = [target.x, target.y + 0.3, target.z];
    const mid = [(a[0] + b[0]) / 2 + side * 0.2, Math.max(a[1], b[1]) + 0.9, (a[2] + b[2]) / 2 + 0.9];
    const q = (t) => [0, 1, 2].map((j) => (1 - t) * (1 - t) * a[j] + 2 * (1 - t) * t * mid[j] + t * t * b[j]);
    const p = F < land ? q(ease.inOutSine(u)) : [b[0], b[1] - 0.05 * sm((F - land) / 3), b[2]];
    const p2 = q(Math.min(1, ease.inOutSine(u) + 0.02));
    place(m, p);
    m.lookAt(V3(p2[0] + 1e-4, p2[1], p2[2] + 1e-4));
    m.rotateZ(side * 0.4 * Math.sin(u * TAU));
    m.scale.setScalar(ob(u * 4));
  };
  plane(T.planes[0], st.chipHead, K.landPl[0], -1);
  plane(T.planes[1], st.pyHead, K.landPl[1], 1);
  // slips read in hand (Chip: both hands; Py: tail)
  if (F >= K.readPl[0] && F < K.eject + 8) {
    tC.material.uniforms.uMap.value = T.tx.slip; place(tC, handsMid(), [-0.35, 0, 0]); tC.scale.setScalar(1);
    t0.material.uniforms.uMap.value = T.tx.slip; place(t0, [st.pyTail.x, st.pyTail.y + 0.08, st.pyTail.z + 0.04], [-0.3, -0.2, 0]); t0.scale.setScalar(1);
  }
  // ---- the bug ----
  const bg = T.bug; bg.visible = false;
  if (F >= K.bugPeek && F < K.whack) {
    const peek = sm((F - K.bugPeek) / 5);
    place(bg, [dutAnvil[0] + 0.02, dutAnvil[1] - 0.06 + 0.07 * peek + 0.01 * Math.sin(F * 0.8), dutAnvil[2] + 0.06], [0, 0.4 + 0.3 * Math.sin(F * 0.3), 0]);
    bg.scale.setScalar(1.3);
  }
  if (F >= K.whack && F < 430) {
    const a = F - K.whack;
    const land = [ANVIL[0] + 0.35, 0.0, ANVIL[2] + 0.45];
    if (a < 8) place(bg, arcPos([dutAnvil[0], dutAnvil[1] + 0.05, dutAnvil[2]], land, a / 8, 0.7), [a * 0.9, 0, a * 1.3]);
    else { const r = a - 8; place(bg, [land[0] - 0.05 * r, 0.0, land[2] + 0.06 * r], [0, -0.6 + 0.2 * Math.sin(r), 0]); }
    bg.scale.setScalar(1.3);
    T.bugLegs.forEach((L) => { L.g.rotation.set(0, 0.5 * Math.sin(F * 1.6 + L.k * 2 + (L.s > 0 ? Math.PI : 0)), 0); });
  }
  st.bug = bg.visible ? v2a(bg.position) : null;
}

function updateTools(F) {
  const THREE = T.THREE;
  const M = T.mallet; M.visible = false;
  const inHand = (m, hand, rot) => { m.visible = true; const g = T.chip.arms[1].hand; m.position.copy(hand); m.quaternion.copy(g.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot))); };
  if (F >= 88 && F < 130) inHand(M, st.handR, [Math.PI / 2 + 0.2, 0, 0]);
  if (F >= K.duoIn[0] && F < K.whipH[0] + 8) inHand(M, st.handR, [Math.PI / 2 + 0.2, 0, 0]);
  M.scale.setScalar(F >= K.duoIn[0] && F < K.whipH[0] + 8 ? 1.3 : 1);
  if (F >= K.slam && F < K.whipH[0] + 8) M.visible = false;
  const Wr = T.wrench; Wr.visible = false;
  if (F >= K.grab && F < 400) inHand(Wr, st.handR, [Math.PI / 2 + 0.3, 0, 0]);
  M.updateMatrixWorld(true); Wr.updateMatrixWorld(true);
}
function updateLever(F) {
  const pull = (f0) => (F >= f0 && F < f0 + 20 ? (F < f0 + 4 ? sm((F - f0) / 4) : Math.max(0, ringv(F - f0 - 4, 1, 0.5, 0.25))) : 0);
  T.lever.rotation.z = 1.05 * Math.max(pull(K.lever1), pull(K.lever2));
  T.lever.updateMatrixWorld(true);
}

// ---------------------------------------------------------------------------------------------------
// fairground: puck, pennant, numerals
// ---------------------------------------------------------------------------------------------------
function updateFair(F) {
  const S = W.striker, sh = W.stage.h;
  let p = 0;
  if (F >= K.gHit && F < K.puckFall[1]) {
    if (F < K.puckG[1]) p = 0.712 * oc((F - K.gHit) / (K.puckG[1] - K.gHit));
    else if (F < K.puckFall[0]) p = 0.712;
    else p = 0.712 * (1 - ic((F - K.puckFall[0]) / (K.puckFall[1] - K.puckFall[0])));
  }
  if (F >= K.dHit && F < K.reset) p = F < K.puckD[1] ? 0.801 * oc((F - K.dHit) / (K.puckD[1] - K.dHit)) : 0.801 + 0.004 * Math.sin((F - K.puckD[1]) * 0.8) * Math.exp(-(F - K.puckD[1]) / 8);
  T.puck.position.y = S.y0 - sh + p * (S.y1 - S.y0);
  st.puck = p;
  // pennant flips out at 71.2 % (the giant's mark) and stays
  const pn = F >= K.pennant && F < K.reset ? ob((F - K.pennant) / 6) : 0;
  T.pennant.visible = pn > 0.01;
  T.pennant.rotation.set(0, lerp(-Math.PI / 2, -0.25, clamp(pn)), 0.04 * Math.sin(F * 0.4));
  T.pennant.scale.setScalar(Math.max(0.01, pn));
  // "80.1%": the numerals fall onto the stage and slam, left of the striker
  const N = T.num, x0 = W.podium.x0 + 0.08, z = (W.podium.z0 + W.podium.z1) / 2 + 0.05;
  N.g.visible = F >= K.slam - 12 && F < K.reset;
  N.g.position.set(x0, STG + W.podium.h + 0.05, z);
  N.g.rotation.set(0, 0.08, 0);
  N.letters.forEach((L, i) => {
    const land = K.slam - 4 + i * 2, a = F - land;
    let y = 0, sy = 1, sxz = 1, rz = 0;
    if (a < 0) { const q = clamp((a + 12) / 12); y = 4.5 * (1 - q * q); sy = 1.1; sxz = 0.94; L.g.visible = a > -12; }
    else { sy = 1 - ringv(a, 0.3, 0.8, 0.18); sxz = 1 + ringv(a, 0.14, 0.8, 0.18); rz = bumpv(a, 0.07, 0.7, 0.15); L.g.visible = true; }
    L.g.position.set(L.x0, y, 0);
    L.g.rotation.set(0, 0, [-0.05, 0.04, 0, -0.03, 0.06][i] + rz);
    L.g.scale.set(sxz, sy, sxz);
  });
}

// ---------------------------------------------------------------------------------------------------
// the giant: stomps in, hammers the striker to 71.2 %, flexes; gapes at 80.1 %
// ---------------------------------------------------------------------------------------------------
function giantHit(G, lean) {   // aim the hammer arm (2-bone IK in the x-y plane) at the pad
  const pad = [W.pad[0], STG + 0.35];
  const hipY = W.pcbY + 2.7;
  const sx = G.root.position.x - 2.15 * Math.sin(lean), sy = hipY + 2.15 * Math.cos(lean);
  const dx = pad[0] - sx, dy = pad[1] - sy, d = Math.hypot(dx, dy);
  const L1 = 1.45, L2 = 1.3 + 1.77;
  const dd = clamp(d, Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  const base = Math.atan2(dx, -dy);                                   // angle from straight down (+ = +x)
  const a1 = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd)));
  const a2 = Math.acos(clamp((L1 * L1 + L2 * L2 - dd * dd) / (2 * L1 * L2)));
  return { sh: base + a1 - lean, el: -(Math.PI - a2) };
}
function updateGiant(F) {
  const G = T.giant;
  const vis = F >= K.whipG[0] + 4 && F < K.reset;
  G.root.visible = vis;
  if (!vis) return;
  const [gx, gz] = W.giant;
  // step in from the right: one big stride, THOOM at K.stomp
  const inU = clamp((F - (K.stomp - 12)) / 12);
  G.root.position.set(lerp(gx + 2.2, gx, sm(inU)), W.pcbY, gz);
  G.legs[0].g.rotation.z = F < K.stomp ? 0.35 * Math.sin(Math.PI * inU) : 0;
  G.legs[1].g.rotation.z = F < K.stomp ? -0.2 * Math.sin(Math.PI * inU) : 0;
  let lean = 0.06 * Math.sin(F * 0.1), shR = -0.15, elR = -0.2, shL = 0.1, elL = -0.3, jaw = 0, headYaw = 0, headPitch = 0, visorE = 'smug';
  if (F >= K.stomp && F < K.stomp + 10) lean += bumpv(F - K.stomp, 0.06, 0.8, 0.2);
  // wind-up (hammer back over the shoulder), WHAM, recoil, flex
  const hit = giantHit(G, 0.32);
  if (F >= 548 && F < K.gHit - 3) { const u = sm((F - 548) / 14); shR = lerp(-0.15, 2.7, u); elR = lerp(-0.2, -0.9, u); lean = lerp(0, -0.12, u); visorE = 'fierce'; }
  if (F >= K.gHit - 3 && F < K.gHit) { const u = ic((F - K.gHit + 3) / 3); shR = lerp(2.7, hit.sh, u); elR = lerp(-0.9, hit.el, u); lean = lerp(-0.12, 0.32, u); visorE = 'fierce'; }
  if (F >= K.gHit && F < 582) { const a = F - K.gHit; shR = hit.sh + bumpv(a, 0.12, 1.0, 0.3); elR = hit.el; lean = 0.32 - 0.1 * sm(a / 10); visorE = 'fierce'; }
  if (F >= 582 && F < K.slam) {   // flex: hammer on the shoulder, free arm curled
    const u = sm((F - 582) / 8);
    lean = lerp(0.22, 0.0, u); shR = lerp(hit.sh, 2.9, u); elR = lerp(hit.el, -2.2, u);
    shL = lerp(0.1, -1.6, u); elL = lerp(-0.3, -2.1, u); visorE = 'smug';
    headYaw = 0.25 * u;
  }
  if (F >= K.gape[0] + 4) {      // notices "80.1%": leans in, jaw drops, hammer droops
    const u = sm((F - K.gape[0] - 4) / 6);
    lean = lerp(0, 0.34, u); shR = lerp(2.9, 0.25, sm((F - K.gape[0] - 8) / 8)); elR = lerp(-2.2, -0.1, sm((F - K.gape[0] - 8) / 8));
    shL = lerp(-1.6, -0.2, u); elL = lerp(-2.1, -0.3, u);
    jaw = 0.34 * u + 0.03 * Math.sin((F - K.gape[0]) * 0.7); headPitch = 0.3 * u; headYaw = -0.12 * u; visorE = 'shock';
  }
  G.hips.rotation.z = lean;
  G.arms[1].sh.rotation.z = shR; G.arms[1].el.rotation.z = elR;
  G.arms[0].sh.rotation.z = shL; G.arms[0].el.rotation.z = elL;
  G.head.rotation.set(0, headYaw, headPitch);
  G.jaw.position.y = 0.12 - jaw * 0.6; G.jaw.rotation.z = -jaw * 0.3;
  G.visor.material.uniforms.uMap.value = T.tx.face.giant[visorE][Math.floor(F / 2) % 2];
  G.root.updateMatrixWorld(true);
  st.giantHead = G.head.getWorldPosition(V3(0, 0, 0)).add(V3(-0.6, 0.6, 0));
  st.giantVisorE = visorE;
}

// ---------------------------------------------------------------------------------------------------
// update entry
// ---------------------------------------------------------------------------------------------------
export function updateAll(ctx) {
  const F = ctx.iw;
  st.F = F;
  T.scene.updateMatrixWorld(true);
  updateCamera(ctx, F);
  updateChip(F);
  updateTools(F);
  updateLever(F);
  updatePy(F);
  updateRuns(F);
  updateCity(F);
  updatePulses(F);
  updateProps(F);
  updateFair(F);
  updateGiant(F);
  // the tube bulges when the order arrives
  const tb = F >= K.tube && F < K.pop + 4 ? Math.sin(Math.PI * clamp((F - K.tube) / (K.pop + 4 - K.tube))) : 0;
  T.tubeMouth.scale.set(1 + 0.4 * tb, 1 - 0.2 * tb, 1 + 0.4 * tb);
  T.scene.updateMatrixWorld(true);
}
