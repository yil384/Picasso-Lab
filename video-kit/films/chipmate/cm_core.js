// cm_core.js - shared constants, palette, key frames, easing helpers and the baked-texture cache for the
// ChipMATE film ("Twin Check"). Everything here is a pure function of the frame index.
import { ease, clamp, lerp, hashSeed } from '/pv/runtime/pv.js';

export const Q = new URLSearchParams(location.search);
export const FPS = 24, NF = 720, TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------------
// palette (paint space). Amber dominant, teal pop, ink, cream paper; red only for the mismatch / bug.
// ---------------------------------------------------------------------------------------------------
export const PAL = {
  paper: '#f4ebd6', ink: '#1a1530', amber: '#d97706', amberL: '#f2a33a', amberD: '#9a4f06', ochre: '#f2b134',
  teal: '#1f9bc4', tealL: '#6cc6e0', tealD: '#155d7a', cream: '#fff6e0', red: '#e5463b', blush: '#ff7a6e',
  slate: '#5a5a86', slateD: '#35344f', pcb: '#1f5058', pcbD: '#153a41',
};
export const COL = {
  amber: 0xd97706, amberL: 0xf2a33a, amberD: 0x9a4f06, ochre: 0xf2b134, cream: 0xf8eed6, paper: 0xf6ecd4,
  teal: 0x1f9bc4, tealL: 0x6cc6e0, tealD: 0x155d7a, red: 0xe5463b, ink: 0x221c36, dark: 0x2b2447,
  slate: 0x5d5c8c, slateD: 0x3a3958, steel: 0xc7cde0, silver: 0xd9dde8, pcb: 0x2a6a70, pcbD: 0x1d4c52,
  die: 0xf3e6c8, dieSide: 0xb87a3a, gold: 0xe8b04a,
};

// ---------------------------------------------------------------------------------------------------
// timeline (frames). See STORYBOARD.md.
// ---------------------------------------------------------------------------------------------------
export const K = {
  // S1 order in
  tube: 28, pop: 40, split: 46, catchC: 52, catchP: 55, read: [56, 68],
  // S2 build (independently)
  screenUp: 72, peek: [84, 97], bonk: 97, hits: [100, 110, 120], fuse: 127, scribble: [112, 134], roll: [134, 144],
  showC: [132, 152], showP: [146, 164], screenDown: 156,
  // S3 run 1 (random stimuli, cycle by cycle)
  tossC: 168, landC: 186, tossP: 177, landP: 191, lever1: 194, dice1: 198,
  run1: 210, cyc1: 10, bad: 4,
  // S4 whose bug?
  slip: 294, planes: 314, landPl: [338, 341], blame: [298, 334], readPl: [342, 354],
  eject: 350, ejectLand: 364, bugPeek: 366, spot: 368,
  // S5 fix + round 2 of at most 5
  grab: 380, whack: 392, tally: 404, retoss: 404, retossLand: 418, lever2: 418, rewind: [420, 428],
  // S6 run 2 -> match rate 1.0
  run2: 432, cyc2: 8, gauge2: 490, ding: 492, five: [498, 508], lights: [504, 522],
  // S7 the giant
  whipG: [522, 534], stomp: 540, gHit: 568, puckG: [568, 582], pennant: 582, puckFall: [588, 598], duoIn: [594, 604],
  // S8 80.1%
  wind: [606, 617], dHit: 618, puckD: [618, 630], slam: 634,
  // S9 home
  whipH: [676, 696], reset: 684,
};
// cycle landing frames
export const cycF = (run, k) => (run === 1 ? K.run1 + K.cyc1 * k : K.run2 + K.cyc2 * k);
// output bits per cycle (single-bit output of the spec'd circuit), with fresh random inputs each run
export const BITS = {
  in1: [3, 5, 2, 6, 1, 4, 6, 2], in2: [5, 1, 4, 4, 6, 2, 3, 5],   // die faces (the random stimuli)
  v1: [0, 1, 1, 0, 1, 1, 0, 1],                                   // Verilog, round 1 (bug at cycle 5)
  p1: [0, 1, 1, 0, 0, 1, 0, 1],                                   // Python model, round 1
  v2: [1, 0, 1, 1, 0, 0, 1, 0], p2: [1, 0, 1, 1, 0, 0, 1, 0],       // round 2: every cycle agrees
};

// ---------------------------------------------------------------------------------------------------
// world layout (1 unit ~ Chip's body width x 1.6)
// ---------------------------------------------------------------------------------------------------
export const W = {
  die: { x0: -8.6, x1: 8.4, z0: -6.6, z1: 3.6, h: 0.6 },
  pcbY: -0.6,
  chip: [-5.55, -0.75], py: [-4.1, -0.75], screenX: -4.83,
  harness: { x: -2.75, z: -1.05, w: 1.0, h: 0.95, d: 0.9 },
  laneA: -1.6, laneB: -0.5, lampZ: -1.15, x0: -2.2, cw: 0.95, lo: 0.1, hi: 0.4,
  tower: [1.9, -4.3],
  stage: { x0: 4.15, x1: 8.25, z0: -1.75, z1: -0.2, h: 0.8 },
  striker: { x: 7.75, z: -1.35, y0: 1.05, y1: 3.25 }, pad: [7.75, -0.78], giant: [10.9, -2.25],
};
export const stationX = (k) => W.x0 + (k + 0.5) * W.cw;

// ---------------------------------------------------------------------------------------------------
// easing / acting helpers (pure)
// ---------------------------------------------------------------------------------------------------
export { ease, clamp, lerp };
export const mj = (x) => { x = clamp(x); return x * x * x * (10 + x * (-15 + 6 * x)); };      // minimum jerk
export const sm = (x) => ease.smooth(clamp(x));
export const io = (x) => ease.inOutSine(clamp(x));
export const ob = (x) => ease.outBack(clamp(x));
export const oc = (x) => ease.outCubic(clamp(x));
export const ic = (x) => ease.inCubic(clamp(x));
export const twos = (F) => F - (F % 2);                                                          // on twos
export const ringv = (a, amp, w = 1.1, k = 0.2) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.cos(w * a));
export const bumpv = (a, amp, w = 0.9, k = 0.16) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.sin(w * a));
export const hsh = (...n) => { let x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); };
export const arc = (a, b, x) => Math.sin(Math.PI * clamp((x - a) / (b - a)));                  // 0 -> 1 -> 0
export const win = (F, a, b) => F >= a && F < b;
/** take: squint-squash then stretch pop and ring (age in frames from the pop) */
export const takeSq = (age) => (age < -3 ? 0 : age < 0 ? 0.14 * sm((age + 3) / 3) : -0.24 * Math.exp(-age / 4.5) * Math.cos(age * 0.75));
/** keyed expression track: keys [[frame, expr], ...] ascending -> { e, age } */
export function track(F, keys) {
  let e = keys[0][1], last = -999;
  for (const [f, x] of keys) if (F >= f) { e = x; last = f; }
  return { e, age: F - last };
}
/** keyframed numbers with per-segment easing: keys [[f, v], ...] */
export function kv(F, keys, e = io) {
  if (F <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (F < keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((F - a) / (b - a));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
  }
  return keys[keys.length - 1][1];
}

// shared mutable scene state (rebuilt from the frame index every frame; never carried over)
export const T = {};
export const st = {};

// ---------------------------------------------------------------------------------------------------
// baked-texture cache. Painting ~60 p5.brush textures takes minutes on CPU WebGL, so each texture is
// baked once (tools/bake.py, ?bake=1) into work/tex/<key>-<hash>.png, where the hash covers the painter's
// source and its size/seed. Normal boots load the PNGs; a missing file is painted live (slow, same result).
// ---------------------------------------------------------------------------------------------------
export const BAKE = Q.get('bake') === '1';
window.__bakeOut = window.__bakeOut || [];
export async function cachedTexture(THREE, bakeBrushTexture, opts, paint, srcKey) {
  const h = hashSeed(opts.key, opts.width, opts.height, opts.seed ?? 1, srcKey || '', paint.toString()).toString(16);
  const name = `${opts.key}-${h}`;
  const finish = (canvas) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
    if (opts.wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true; tex.userData.canvas = canvas; tex.userData.name = name;
    return tex;
  };
  if (!BAKE) {
    const img = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `/scene/work/tex/${name}.png`; });
    if (img) {
      const c = document.createElement('canvas'); c.width = opts.width; c.height = opts.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return finish(c);
    }
    console.warn('texture cache miss: ' + name + ' (painting live)');
  }
  const tex = await bakeBrushTexture(THREE, opts, paint);
  if (BAKE) window.__bakeOut.push({ name, url: tex.userData.canvas.toDataURL('image/png') });
  tex.userData.name = name;
  if (opts.wrap) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.needsUpdate = true; }
  return tex;
}

// ---------------------------------------------------------------------------------------------------
// chip city: logic-gate buildings (footprint = the gate symbol, so the city reads as a schematic from
// above). type, x, z, footprint size s, height h. Gates point +x (inputs left, output right).
// ---------------------------------------------------------------------------------------------------
export const CITY = [
  // behind the check street
  ['and', -1.1, -3.05, 0.95, 1.05], ['ff', 0.35, -3.15, 0.8, 1.45], ['or', 3.45, -3.0, 0.95, 1.15],
  ['not', 4.95, -3.2, 0.85, 0.9], ['and', 6.35, -3.1, 0.85, 1.3],
  ['or', -2.6, -4.65, 1.05, 1.8], ['and', -0.55, -4.95, 1.1, 2.15], ['ff', 3.85, -4.85, 1.0, 2.4],
  ['or', 5.7, -5.0, 1.1, 1.9], ['and', 7.45, -4.55, 0.9, 1.6],
  ['and', -5.05, -5.8, 1.2, 2.6], ['ff', -2.95, -6.05, 1.0, 1.4], ['or', 0.35, -6.0, 1.15, 2.7], ['not', 6.3, -6.1, 0.9, 1.5],
  // behind the workshop
  ['or', -6.85, -3.5, 0.9, 1.35], ['ff', -7.6, -5.25, 0.9, 2.0], ['not', -5.1, -3.95, 0.8, 0.95],
  // front, low (the camera looks over them)
  ['not', -6.7, 1.95, 0.6, 0.42], ['and', -3.3, 2.3, 0.62, 0.5], ['ff', 0.55, 1.75, 0.6, 0.48],
  ['or', 3.05, 2.45, 0.7, 0.55], ['not', 5.35, 1.6, 0.55, 0.4], ['and', 7.3, 2.4, 0.6, 0.45],
];
// light-up order for the city (after match 1.0): a wave outward from the check street
export const cityDelay = (b) => Math.round(Math.hypot(b[1] - 1.5, (b[2] + 1.1) * 1.4) * 1.6);
