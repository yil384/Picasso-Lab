// td_core.js - TritonDFT film: palette, timeline helpers (pure functions of the frame) and the bake cache.
import { ease, clamp, lerp } from '/pv/runtime/pv.js';
import { bakeBrushTexture } from './npr/brush.js';

export const FPS = 24;
export const TAU = Math.PI * 2;
export const Q = new URLSearchParams(location.search);

// ---------------------------------------------------------------------------------------------------
// palette: cream paper + sky blue (the TritonDFT accent #0284c7) dominant + vermilion pop + ink
// ---------------------------------------------------------------------------------------------------
export const PAL = {
  paper: '#f4ebd6', cream: '#fff6e0', ink: '#16162c',
  sky: '#0284c7', skyL: '#6cc4ee', skyP: '#bfe6f7', navy: '#0b3558', steel: '#9fb9cc',
  pop: '#ff5a2e', popD: '#c8361c', popL: '#ffb08a', gold: '#ffc94a',
};
export const COL = {
  paper: 0xf4ebd6, cream: 0xfff6e0, ink: 0x16162c,
  // 3D albedos: the blues are pre-rotated a few degrees toward violet so that after the warm paper multiply they render
  // at the accent hue (#0284c7, ~200 deg) instead of drifting teal; navy lifted a step (the film ran darker than the series)
  sky: 0x0a80d8, skyL: 0x6ab9f4, skyP: 0xbfe6f7, navy: 0x245f94, steel: 0x9fb9cc, steelD: 0x5d7a92,
  pop: 0xff5a2e, popD: 0xc8361c, popL: 0xffb08a, gold: 0xffc94a,
};

// ---------------------------------------------------------------------------------------------------
// timeline helpers (all pure)
// ---------------------------------------------------------------------------------------------------
export { ease, clamp, lerp };
export const mj = (x) => { x = clamp(x); return x * x * x * (10 + x * (-15 + 6 * x)); };        // minimum jerk
export const sm = (x) => ease.smooth(clamp(x));
export const io = (x) => ease.inOutSine(clamp(x));
export const ob = (x) => ease.outBack(clamp(x));
export const oc = (x) => ease.outCubic(clamp(x));
export const ic = (x) => ease.inCubic(clamp(x));
export const twos = (F) => F - (F % 2);                                                           // acting on twos
export const ringv = (a, amp, w = 1.1, k = 0.2) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.cos(w * a)); // a: frames
export const bumpv = (a, amp, w = 0.9, k = 0.16) => (a < 0 ? 0 : amp * Math.exp(-k * a) * Math.sin(w * a));
export const hsh = (...n) => { let x = Math.sin(n.reduce((s, v, i) => s + v * (12.9898 + i * 78.233), 0.5)) * 43758.5453; return x - Math.floor(x); };
export const win = (F, a, b) => F >= a && F < b;
export const arc = (F, a, b) => Math.sin(Math.PI * clamp((F - a) / (b - a)));                  // 0 -> 1 -> 0
/** keyframes on frames: kf(F, [[f0, v0], [f1, v1], ...], ease) with numbers or arrays */
export function kf(F, keys, e = io) {
  if (F <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (F < keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((F - a) / (b - a));
      return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
    }
  }
  return keys[keys.length - 1][1];
}
/** take: squint-squash, then stretch pop and ring (age in frames from the eye pop) */
export function takeSq(age) {
  if (age < -3) return 0;
  if (age < 0) return 0.14 * sm((age + 3) / 3);
  return -0.24 * Math.exp(-age / 4.5) * Math.cos(age * 0.75);
}
/** expression timeline: keys [[frame, expr], ...] ascending -> { e, age } */
export function exprAt(F, keys) {
  let e = keys[0][1], last = -999;
  for (const [f, x] of keys) if (F >= f) { e = x; last = f; }
  return { e, age: F - last };
}

// ---------------------------------------------------------------------------------------------------
// bake cache: p5.brush textures are painted ONCE (?rebake=1, see tools/shoot.py bake) and saved as lossless
// PNGs in work/bake/; every later boot loads the PNGs (CPU WebGL paints them far too slowly for each boot).
// The cache key carries a version so an edited painter never picks up a stale texture.
// ---------------------------------------------------------------------------------------------------
const REBAKE = Q.get('rebake') === '1';
window.__bakes = window.__bakes || {};
export async function bake(THREE, opts, draw) {
  const key = opts.key;
  let canvas = null;
  if (!REBAKE) {
    try {
      const r = await fetch(`./work/bake/${key}.png`, { cache: 'no-store' });
      if (r.ok) {
        const bmp = await createImageBitmap(await r.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
        canvas = document.createElement('canvas'); canvas.width = bmp.width; canvas.height = bmp.height;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
      }
    } catch (e) { canvas = null; }
  }
  if (!canvas) {
    const tex = await bakeBrushTexture(THREE, opts, draw);
    canvas = tex.userData.canvas;
    window.__bakes[key] = canvas;
    if (!REBAKE) console.log('bake miss (painted live): ' + key);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  if (opts.wrap) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  tex.userData.canvas = canvas;
  return tex;
}
