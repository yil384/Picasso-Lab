// npr/camera.js - deterministic camera rigs: orbit / dolly / crane paths with easing, handheld drift,
// whip pans and hit shakes. Every function is a pure function of t (loop phase 0..1) or seconds;
// loop-safe variants use integer cycles or periodic noise so frame N == frame 0.
import * as THREE from 'three';
import { loopNoise, ease, clamp, lerp } from '/pv/runtime/pv.js';

export { ease };

/** Keyframes: kf(t, [[t0, v0], [t1, v1], ...], easeFn). Values can be numbers or arrays. */
export function kf(t, keys, e = ease.inOutSine) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
      return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * A rig is a plain object: { pos:[x,y,z], target:[x,y,z], roll (rad), fov (deg) }.
 * orbit(): spherical placement around target. az 0 looks from +z, positive az swings to +x. el is elevation.
 */
export function orbit({ target = [0, 0, 0], radius = 10, az = 0, el = 0.3, roll = 0, fov = 30 } = {}) {
  const ce = Math.cos(el);
  return {
    pos: [target[0] + radius * ce * Math.sin(az), target[1] + radius * Math.sin(el), target[2] + radius * ce * Math.cos(az)],
    target: [...target], roll, fov,
  };
}

/** Move the camera along its view direction by `d` world units (positive = towards the target). */
export function dolly(rig, d) {
  const v = new THREE.Vector3(...rig.target).sub(new THREE.Vector3(...rig.pos)).normalize().multiplyScalar(d);
  return { ...rig, pos: [rig.pos[0] + v.x, rig.pos[1] + v.y, rig.pos[2] + v.z] };
}

/** Crane: raise camera by dy and aim `tilt` of that at the target too (0 = pure pedestal, 1 = target follows). */
export function crane(rig, dy, tilt = 0.3) {
  return { ...rig, pos: [rig.pos[0], rig.pos[1] + dy, rig.pos[2]], target: [rig.target[0], rig.target[1] + dy * tilt, rig.target[2]] };
}

/** Dolly-zoom (vertigo): keep the subject size while changing fov. k in 0..1 blends fov0 -> fov1. */
export function vertigo(rig, fov1, k) {
  const fov = lerp(rig.fov, fov1, k);
  const dist0 = new THREE.Vector3(...rig.pos).distanceTo(new THREE.Vector3(...rig.target));
  const dist1 = dist0 * Math.tan(THREE.MathUtils.degToRad(rig.fov) / 2) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  return { ...dolly(rig, dist0 - dist1), fov };
}

/**
 * Handheld drift (loop-safe): periodic noise on position (world units) and rotation (rad).
 * speed = how many "wanders" per loop (noise circle radius). Returns {pos:[dx,dy,dz], rot:[pitch,yaw,roll]}.
 */
export function handheld(t, { amp = 0.03, rot = 0.004, speed = 3, seed = 1 } = {}) {
  const n = (ch) => loopNoise(t, ch, { seed, radius: speed }) + 0.5 * loopNoise(t, ch + 50, { seed, radius: speed * 2.3 });
  return { pos: [n(1) * amp, n(2) * amp * 0.7, n(3) * amp * 0.5], rot: [n(4) * rot, n(5) * rot, n(6) * rot * 0.6] };
}

/**
 * Whip pan: yaw offset that snaps through `angle` rad in `dur` seconds starting at t0 (sec), with a
 * slight overshoot-settle. Returns {yaw, speed} where speed is rad/s (use it for smear + speed lines).
 */
export function whip(sec, t0, dur, angle) {
  const f = (s) => {
    const k = clamp((s - t0) / dur);
    const base = ease.inOutQuint(k);
    const settle = s > t0 + dur ? Math.exp(-(s - t0 - dur) * 9) * Math.sin((s - t0 - dur) * 22) * 0.04 : 0;
    return angle * (base + settle);
  };
  const h = 1 / 240;
  return { yaw: f(sec), speed: (f(sec + h) - f(sec - h)) / (2 * h) };
}

/** Hit shake (changes at `fps` drawings/s, decays over `decay` s after t0). Returns [dx, dy, droll]. */
export function shake(sec, t0, amount = 0.05, { decay = 0.35, fps = 24, seed = 3 } = {}) {
  if (sec < t0) return [0, 0, 0];
  const f = Math.floor(sec * fps), k = Math.exp(-(sec - t0) / decay) * amount;
  const h = (i) => { const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  return [h(f * 1.7) * k, h(f * 2.3 + 9) * k, h(f * 3.1 + 5) * k * 0.3];
}

/** Apply a rig (+ optional handheld {pos, rot} and yaw offset) to a PerspectiveCamera. */
export function applyRig(camera, rig, { hand = null, yaw = 0, aspect = null } = {}) {
  const p = new THREE.Vector3(...rig.pos), tg = new THREE.Vector3(...rig.target);
  if (hand) p.add(new THREE.Vector3(...hand.pos));
  if (yaw) { // pan: rotate the target around the camera (camera stays put)
    const d = tg.clone().sub(p); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw); tg.copy(p).add(d);
  }
  camera.position.copy(p);
  camera.up.set(0, 1, 0);
  camera.lookAt(tg);
  const r = (rig.roll || 0) + (hand ? hand.rot[2] : 0);
  if (hand) { camera.rotateX(hand.rot[0]); camera.rotateY(hand.rot[1]); }
  if (r) camera.rotateZ(r);
  if (rig.fov && camera.fov !== rig.fov) camera.fov = rig.fov;
  if (aspect) camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

/** Screen-space smear (design px per frame) for a yaw speed (rad/s): feed into npr.setSmear(). */
export function yawSmear(camera, speed, fps, designH = 1080) {
  const pxPerRad = (designH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  return -speed / fps * pxPerRad;
}
