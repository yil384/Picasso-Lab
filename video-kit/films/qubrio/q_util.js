// q_util.js - timeline helpers (every animated value is a pure function of the frame index).
import { ease, clamp, lerp } from '/pv/runtime/pv.js';

export const TAU = Math.PI * 2;
export { clamp, lerp, ease };
/** minimum-jerk 0..1 (AOD moves: s = 10t^3 - 15t^4 + 6t^5, no overshoot) */
export const mj = (x) => { x = clamp(x); return x * x * x * (10 + x * (-15 + 6 * x)); };
/** its derivative (peak 1.875 at 0.5) */
export const mjv = (x) => { x = clamp(x); return 30 * x * x * (1 - x) * (1 - x); };
export const sm = (x) => ease.smooth(clamp(x));
export const io = (x) => ease.inOutSine(clamp(x));
export const ob = (x) => ease.outBack(clamp(x));
export const oc = (x) => ease.outCubic(clamp(x));
export const ic = (x) => ease.inCubic(clamp(x));
export const q5 = (x) => ease.inOutQuint(clamp(x));
/** progress of f through [a, b] with easing e */
export const sg = (f, a, b, e = sm) => e((f - a) / (b - a));
/** window: 0 before a, ramps to 1 over [a, a+r], back to 0 over [b-r, b] */
export const win = (f, a, b, r = 4) => Math.min(sg(f, a, a + r), 1 - sg(f, b - r, b));
/** characters act on twos */
export const twos = (F) => F - (F % 2);
/** damped ring / bump after a hit (age in frames) */
export const ringv = (a, amp, w = 1.1, k = 0.2) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.cos(w * a));
export const bumpv = (a, amp, w = 0.9, k = 0.16) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.sin(w * a));
/** P(doom) take: squint-squash for 2 frames, then stretch pop and rebound (age in frames from the eye pop) */
export function takeSq(age) {
  if (age < -3) return 0;
  if (age < 0) return 0.14 * sm((age + 3) / 3);
  return -0.22 * Math.exp(-age / 4.5) * Math.cos(age * 0.75);
}
/** keyed state timeline: keys [[frame, value], ...] ascending -> { v, age, i } */
export function keyed(F, keys) {
  let v = keys[0][1], last = keys[0][0], i = 0;
  for (let k = 0; k < keys.length; k++) if (F >= keys[k][0]) { v = keys[k][1]; last = keys[k][0]; i = k; }
  return { v, age: F - last, i };
}
/** piecewise keyframes of numbers/arrays with per-segment easing: [[f, value, ease?], ...] */
export function kfs(F, keys, e0 = io) {
  if (F <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (F < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb, e] = keys[i], k = (e || e0)((F - a) / (b - a));
      return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}
export const hsh = (...n) => { const x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); };
export const hs2 = (...n) => hsh(...n) * 2 - 1;
/** camera rig mixing (orbit parameter space) */
export function mixRig(a, b, k) {
  return { tg: a.tg.map((v, i) => lerp(v, b.tg[i], k)), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), r: lerp(a.r, b.r, k),
    fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll || 0, b.roll || 0, k) };
}
/** decaying hash shake (radians) for a list of hits [[frame, amp, decay]] */
export function shakeAt(F, hits) {
  const s = [0, 0, 0];
  for (const [f0, amp, dec = 5] of hits) {
    const a = F - f0; if (a < 0 || a > 30) continue;
    const k = amp * Math.exp(-a / dec), Fh = F - (F % 2);   // shake on twos (comic)
    s[0] += hs2(Fh, 1.3, f0) * k; s[1] += hs2(Fh, 2.7, f0) * k; s[2] += hs2(Fh, 5.1, f0) * k * 0.6;
  }
  return s;
}
