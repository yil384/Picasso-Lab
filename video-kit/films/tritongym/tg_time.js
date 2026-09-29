// tg_time.js - timing and acting helpers. Every function is a pure function of the frame index F (0..NF-1).
// Characters act on twos (tw(F)); the camera and the racers move on ones.
import { ease, clamp, lerp } from '/pv/runtime/pv.js';

export const FPS = 24, TAU = Math.PI * 2;
export { ease, clamp, lerp };

export const tw = (F) => F - (((F % 2) + 2) % 2);                         // on twos
export const sg = (F, a, b, e = (x) => x) => e(clamp((F - a) / (b - a)));  // progress through [a, b]
export const sm = (x) => ease.smooth(clamp(x));
export const io = (x) => ease.inOutSine(clamp(x));
export const ioc = (x) => ease.inOutCubic(clamp(x));
export const ob = (x, s = 1.9) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
export const mj = (x) => { x = clamp(x); return x * x * x * (10 + x * (-15 + 6 * x)); };   // minimum jerk
export const mjv = (x) => (x <= 0 || x >= 1 ? 0 : 30 * x * x * (1 - x) * (1 - x));          // d mj / dx (peak 1.875)
/** damped ring (a in frames): amp * e^(-k a) * cos(w a) */
export const ringv = (a, amp, w = 1.1, k = 0.2) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.cos(w * a));
export const bumpv = (a, amp, w = 0.9, k = 0.16) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.sin(w * a));
export const hsh = (...n) => { let x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); };

/** Surprise take peaking at frame f0 (after ClaudeAnimationBase's mood(), MIT): squash, stretch, ring. sq > 0 = squashed. */
export function take(F, f0, amt = 1) {
  const a = F - f0;
  if (a < -3) return 0;
  if (a < 0) return 0.14 * amt * sm((a + 3) / 3);
  return -0.24 * amt * Math.exp(-a / 4.5) * Math.cos(a * 0.75);
}
/** Hop from f0 to f1 of height h: crouch 3 frames before, stretch in the air, squash-ring on landing. */
export function hop(F, f0, f1, h = 0.3) {
  if (F < f0 - 3) return { y: 0, sq: 0 };
  if (F < f0) return { y: 0, sq: 0.16 * sm((F - f0 + 3) / 3) };
  if (F < f1) { const k = (F - f0) / (f1 - f0); return { y: h * 4 * k * (1 - k), sq: -0.14 * Math.abs(1 - 2 * k) }; }
  return { y: 0, sq: ringv(F - f1, 0.18, 0.9, 0.2) };
}
/** Keyframed scalar/array: keys [[F, v], ...] ascending, eased per segment with e. */
export function kf(F, keys, e = io) {
  if (F <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (F < keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((F - a) / (b - a));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
  }
  return keys[keys.length - 1][1];
}
/** Step timeline: keys [[F, value], ...] -> { v, age } (the last key at or before F). */
export function step(F, keys) {
  let v = keys[0][1], at = keys[0][0];
  for (const [f, x] of keys) if (F >= f) { v = x; at = f; }
  return { v, age: F - at };
}
