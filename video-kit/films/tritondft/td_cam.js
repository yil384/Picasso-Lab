// td_cam.js - closed-form camera: orbit rigs {tg, az, el, r, fov, roll}, blends, whip smear from the real
// view-direction yaw rate, decaying hash shakes on hits, loop-safe handheld drift. Pure functions of the frame.
import { orbit, handheld, applyRig, yawSmear } from './npr/camera.js';
import { lerp, hsh, TAU, FPS } from './td_core.js';

export function mixRig(a, b, k) {
  return { tg: a.tg.map((v, i) => lerp(v, b.tg[i], k)), az: lerp(a.az, b.az, k), el: lerp(a.el, b.el, k), r: lerp(a.r, b.r, k),
    fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll ?? 0, b.roll ?? 0, k) };
}
export const rigPos = (q) => orbit({ target: q.tg, radius: q.r, az: q.az, el: q.el }).pos;

/** shake: list of [frame, amplitude (rad), decay (frames)] -> [pitch, yaw, roll] offsets at F */
export function camShake(F, hits) {
  const s = [0, 0, 0];
  for (const [f0, amp, dec = 5] of hits) {
    const a = F - f0; if (a < 0 || a > 30) continue;
    const k = amp * Math.exp(-a / dec);
    s[0] += (hsh(F, 1.3, f0) * 2 - 1) * k; s[1] += (hsh(F, 2.7, f0) * 2 - 1) * k; s[2] += (hsh(F, 5.1, f0) * 2 - 1) * k * 0.6;
  }
  return s;
}

/**
 * Apply the rig for frame F to the camera. camRig(F) -> rig; whips: [[a, b], ...] frame windows where smear is
 * allowed; hits for shake. Returns the smear (design px) for npr.setSmear.
 */
export function applyCamera(cam, ctx, F, camRig, { whips = [], hits = [], hand = { amp: 0.03, rot: 0.0035, speed: 4, seed: 5 } } = {}) {
  const rg = camRig(F);
  const sh = camShake(F, hits);
  const hd = handheld(ctx.t, hand);
  hd.rot = [hd.rot[0] + sh[0], hd.rot[1] + sh[1], hd.rot[2] + sh[2]];
  applyRig(cam, orbit({ target: rg.tg, radius: rg.r, az: rg.az, el: rg.el, fov: rg.fov, roll: rg.roll }), { hand: hd });
  const yawAt = (f) => { const q = camRig(f), p = rigPos(q); return Math.atan2(q.tg[0] - p[0], q.tg[2] - p[2]); };
  const pitchAt = (f) => { const q = camRig(f), p = rigPos(q); return Math.atan2(q.tg[1] - p[1], Math.hypot(q.tg[0] - p[0], q.tg[2] - p[2])); };
  let dy = yawAt(F + 0.5) - yawAt(F - 0.5);
  if (dy > Math.PI) dy -= TAU; if (dy < -Math.PI) dy += TAU;
  const dp = pitchAt(F + 0.5) - pitchAt(F - 0.5);
  // whips: [a, b, cap?, 'h'?] - cap (design px) keeps the 9-tap smear a continuous streak instead of ghost copies on
  // slower moves; 'h' drops the vertical component (a horizontal pan whose tilt would draw rain-like streaks)
  const w = whips.find(([a, b]) => F > a && F < b);
  let sx = w && Math.abs(dy * FPS) > 0.5 ? yawSmear(cam, dy * FPS, FPS) * 0.9 : 0;
  let sy = w && Math.abs(dp * FPS) > 0.5 ? -yawSmear(cam, dp * FPS, FPS) * 0.9 : 0;
  if (w && w[3] === 'h') sy = 0;
  const L = Math.hypot(sx, sy);
  if (w && w[2] && L > w[2]) { sx *= w[2] / L; sy *= w[2] / L; }
  return [sx, sy];
}
