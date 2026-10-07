// src/stream-page.js - what runs inside the streamer's own headless page, and nowhere else. Patches of
// prismarine-viewer's client bundles, served to that page only (the public /watch and /eyes pages keep the originals):
// the first-person camera, the render loop and the mesher worker count are handed to window.__muse, and the mesher
// leaves out leaf faces between leaves ("fast leaves"). pageScript() defines window.__muse: a smoothed camera
// (positions interpolated between the bot's irregular updates, then eased; turns eased and rate-limited, so a snapped
// look never whips the picture), a frame-rate cap, a fogged shorter view, a vertical band of drawn sections, and the
// numbers the streamer reads (frames, triangles, an optional per-frame camera trace).

import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * The places in prismarine-viewer 1.33's minified client (public/index.js) the streamer changes. Each must match
 * exactly once; names are captured, so another minifier run with new letters still matches.
 */
const CLIENT_PATCHES = [
  {
    name: 'first-person camera',
    re: /void (\w+)\.setFirstPersonCamera\((\w+),(\w+),(\w+)\)/g,
    to: (m, v, p, y, pi) => `void(window.__muse&&window.__muse.sample(${p},${y},${pi})||${v}.setFirstPersonCamera(${p},${y},${pi}))`,
  },
  {
    name: 'mesher worker count',
    re: /constructor\((\w+),(\w+)=4\)\{this\.sectionMeshs=\{\}/g,
    to: (m, a, b) => `constructor(${a},${b}=(window.__muse&&window.__muse.workers)||4){this.sectionMeshs={}`,
  },
  {
    name: 'render loop',
    re: /!function (\w+)\(\)\{window\.requestAnimationFrame\(\1\),(\w+)&&\2\.update\(\),(\w+)\.update\(\),(\w+)\.render\(\3\.scene,\3\.camera\)\}\(\)/g,
    to: (m, f, c, v, r) => `!function ${f}(){window.requestAnimationFrame(${f});const k=window.__muse;if(k&&!k.frame(${v},${r}))return;${c}&&${c}.update(),${v}.update(),k&&k.camera(${v}.camera),${r}.render(${v}.scene,${v}.camera),k&&k.rendered()}()`,
  },
];

function applyPatches(js, patches, what) {
  let out = String(js);
  for (const p of patches) {
    const hits = [...out.matchAll(p.re)];
    if (hits.length !== 1) return { ok: false, error: `prismarine-viewer ${what}: the ${p.name} was found ${hits.length} times (expected once)` };
    out = out.replace(p.re, p.to);
  }
  return { ok: true, js: out };
}

/**
 * Patch the client bundle for the streamer's page. Returns {ok: true, js} or {ok: false, error} (the bundle changed:
 * the stream then runs on the unpatched client, without smoothing).
 * @param {string} js   prismarine-viewer/public/index.js
 */
export const patchViewerBundle = (js) => applyPatches(js, CLIENT_PATCHES, 'client');

/**
 * The mesher (public/worker.js, 63 MB: it carries minecraft-data for every version) with "fast leaves": a leaf face
 * against a leaf of the same kind is left out, as glass already does. In a forest that halves the triangles, and
 * triangles are what SwiftShader spends its time on.
 */
export const patchWorkerBundle = (js) => applyPatches(js, [{
  name: 'glass rule',
  re: /const (\w+)=(\w+)\.name\.indexOf\("glass"\)>=0;/g,
  to: (m, d, b) => `const ${d}=${b}.name.indexOf("glass")>=0||${b}.name.endsWith("_leaves");`,
}], 'mesher');

const readPublic = (file) => fs.readFileSync(require.resolve(`prismarine-viewer/public/${file}`), 'utf8');

let cachedClient = null;
/** The installed client bundle, patched (read once, 1.2 MB). */
export function patchedBundle() {
  if (!cachedClient) {
    try { cachedClient = patchViewerBundle(readPublic('index.js')); } catch (err) { return { ok: false, error: `prismarine-viewer is not installed: ${err.message}` }; }
  }
  return cachedClient;
}

/** The installed mesher, patched, as base64 for Fetch.fulfillRequest (read again per browser start, not kept). */
export function patchedWorkerBase64() {
  let r;
  try { r = patchWorkerBundle(readPublic('worker.js')); } catch (err) { return { ok: false, error: `prismarine-viewer is not installed: ${err.message}` }; }
  return r.ok ? { ok: true, base64: Buffer.from(r.js).toString('base64') } : r;
}

/**
 * The camera smoother, plain functions only: it runs in the page (pageScript() inlines its source) and in the tests.
 *
 * Samples are the bot's pose as the viewer reports it (feet position, yaw, pitch), stamped with their arrival time;
 * updates that arrive together (a busy agent sends what it had at once) get their physics ticks back. pose(t) renders
 * `delayMs` behind the clock (a live video has seconds of delay anyway) and interpolates between the two samples around
 * that moment, so updates that come late or in bursts still give even motion. A gap (the bot stood still, so nothing
 * was sent) holds the pose until a tick before the next sample, so a start never jumps. A move longer than
 * `snapDistance` (a teleport, a respawn) is a cut. The result is then eased with a critically damped spring, lightly
 * for position and more for turns, and turns are held under `maxTurnDeg` per second.
 */
export function createCameraSmoother(opts = {}) {
  const delayMs = opts.delayMs ?? 300;
  const posMs = opts.posSmoothMs ?? 80;
  const rotMs = opts.rotSmoothMs ?? 250;
  const maxTurn = ((opts.maxTurnDeg ?? 270) * Math.PI) / 180;
  const snap = opts.snapDistance ?? 8;
  const eye = opts.eyeHeight ?? 1.62;
  const tick = opts.tickMs ?? 50; // mineflayer's physics tick: the bot reports its move at most this often
  const burstMs = opts.burstMs ?? 12;
  const keep = opts.keepMs ?? 2000;
  const TAU = Math.PI * 2;
  let samples = [];
  let s = null; // the eased pose and its velocities
  let lastT = 0;
  let cuts = 0;

  const near = (a, b) => b - TAU * Math.round((b - a) / TAU); // the angle b, moved to within half a turn of a

  function damp(x, v, target, smoothMs, dt) {
    // critically damped spring (Game Programming Gems 4; Unity's SmoothDamp)
    const omega = 2 / Math.max(1e-3, smoothMs / 1000);
    const k = omega * dt;
    const e = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
    const change = x - target;
    const temp = (v + omega * change) * dt;
    return [target + (change + temp) * e, (v - omega * temp) * e];
  }

  function turn(x, v, target, dt) {
    let [nx, nv] = damp(x, v, target, rotMs, dt);
    const step = maxTurn * dt;
    if (Math.abs(nx - x) > step) { nx = x + Math.sign(nx - x) * step; nv = Math.sign(nv) * Math.min(Math.abs(nv), maxTurn); }
    return [nx, nv];
  }

  function sample(pos, yaw, pitch, t) {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y) || !Number.isFinite(pos.z) || !Number.isFinite(t)) return;
    const prev = samples[samples.length - 1];
    const y0 = Number.isFinite(yaw) ? yaw : (prev ? prev.yaw : 0);
    const p0 = Number.isFinite(pitch) ? Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)) : (prev ? prev.pitch : 0);
    const next = { t, arr: t, x: pos.x, y: pos.y + eye, z: pos.z, yaw: prev ? near(prev.yaw, y0) : y0, pitch: p0 };
    if (prev && Math.hypot(next.x - prev.x, next.y - prev.y, next.z - prev.z) > snap) {
      samples = [next];
      s = null; // a cut: the next pose starts here
      cuts += 1;
      return;
    }
    samples.push(next);
    // updates that arrive together (the agent was busy, then sent what it had) were sent a tick apart: give the group
    // its ticks back, ending at the last arrival, never before the update ahead of it
    let g = samples.length - 1;
    while (g > 0 && samples[g].arr - samples[g - 1].arr < burstMs) g -= 1;
    const k = samples.length - g;
    if (k > 1) {
      const floor = g > 0 ? samples[g - 1].t : -Infinity;
      const step = Math.min(tick, (t - floor) / k);
      for (let i = g; i < samples.length; i += 1) samples[i].t = t - (samples.length - 1 - i) * step;
    } else if (prev && next.t <= prev.t) next.t = prev.t + 0.001;
    while (samples.length > 2 && samples[1].t < t - keep) samples.shift();
  }

  /** The interpolated (not yet eased) pose at time t. */
  function target(t) {
    if (!samples.length) return null;
    const at = t - delayMs;
    if (at <= samples[0].t) return samples[0];
    const last = samples[samples.length - 1];
    if (at >= last.t) return last;
    let i = samples.length - 1;
    while (i > 0 && samples[i - 1].t > at) i -= 1;
    const a = samples[i - 1];
    const b = samples[i];
    // a long gap: the bot stood still (nothing is sent then) until a tick before the next update
    const from = b.t - a.t > tick * 2.5 ? b.t - tick : a.t;
    if (at <= from) return a;
    const f = (at - from) / (b.t - from);
    const mix = (key) => a[key] + (b[key] - a[key]) * f;
    return { x: mix('x'), y: mix('y'), z: mix('z'), yaw: mix('yaw'), pitch: mix('pitch') };
  }

  /** The camera at time t (ms, the samples' clock), or null before the first sample. */
  function pose(t) {
    const g = target(t);
    if (!g) return null;
    if (!s) {
      s = { x: g.x, y: g.y, z: g.z, yaw: g.yaw, pitch: g.pitch, vx: 0, vy: 0, vz: 0, vyaw: 0, vpitch: 0 };
      lastT = t;
    } else {
      const dt = Math.min(0.25, Math.max(0, (t - lastT) / 1000));
      lastT = t;
      if (dt > 0) {
        [s.x, s.vx] = damp(s.x, s.vx, g.x, posMs, dt);
        [s.y, s.vy] = damp(s.y, s.vy, g.y, posMs, dt);
        [s.z, s.vz] = damp(s.z, s.vz, g.z, posMs, dt);
        [s.yaw, s.vyaw] = turn(s.yaw, s.vyaw, near(s.yaw, g.yaw), dt);
        [s.pitch, s.vpitch] = turn(s.pitch, s.vpitch, g.pitch, dt);
      }
    }
    return { x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch };
  }

  return { sample, pose, target, get size() { return samples.length; }, get cuts() { return cuts; } };
}

export const PAGE_DEFAULTS = Object.freeze({
  fps: 30, // render cap
  far: 48, // blocks; fog from 55 % of it (0: the viewer's own 1000)
  below: 24, // sections more than this far below the eye, or `above` above it, are not drawn (0: all)
  above: 32,
  workers: 1, // mesher workers (the viewer's 4 cost 260 MB each)
});

/**
 * The script the streamer's page runs before the client (Page.addScriptToEvaluateOnNewDocument). It defines
 * window.__muse for the patched bundle. Options: PAGE_DEFAULTS, smooth (false: the viewer's own camera), compare (the
 * viewer's camera on the left half, the smoothed one on the right), trace (keep every frame's camera), capture
 * ('blob': each frame as JPEG to window.__museFrame), quality (JPEG, 0-100), smoother (createCameraSmoother options).
 */
export function pageScript(opts = {}) {
  const o = {
    fps: opts.fps ?? PAGE_DEFAULTS.fps,
    far: opts.far ?? PAGE_DEFAULTS.far,
    below: opts.below ?? PAGE_DEFAULTS.below,
    above: opts.above ?? PAGE_DEFAULTS.above,
    workers: opts.workers ?? PAGE_DEFAULTS.workers,
    smooth: opts.smooth !== false,
    compare: opts.compare === true,
    trace: opts.trace === true,
    capture: opts.capture ?? 'screencast',
    quality: (opts.quality ?? 80) / 100,
    smoother: opts.smoother ?? {},
  };
  return `(() => {
const O = ${JSON.stringify(o)};
const createCameraSmoother = ${createCameraSmoother.toString()};
const cam = createCameraSmoother(O.smoother);
const stats = { frames: 0, samples: 0, skipped: 0, captureBusy: 0, lastFrameAt: 0, maxGapMs: 0 };
const trace = []; // [t, x, y, z, yaw, pitch(, the smoothed half's in compare mode)] per drawn frame
const interval = 1000 / O.fps;
let viewer = null;
let renderer = null;
let next = 0;
let prepared = false;
let encoding = 0;
let twin = null;
function prepare(v) {
  prepared = true;
  try {
    if (O.far > 0) {
      // a shorter view with fog, as in the game: sections past it are never drawn
      v.camera.far = O.far;
      v.camera.updateProjectionMatrix();
      const THREE = window.THREE;
      if (THREE && THREE.Fog && v.scene) v.scene.fog = new THREE.Fog(v.scene.background || 0xadd8e6, O.far * 0.55, O.far);
      if (v.world && v.world.material) v.world.material.needsUpdate = true;
    }
  } catch (e) { /* the world draws as it was */ }
}
// compare: the right half is drawn here with the smoothed camera, then the viewer draws its own camera on the left
function compareDraw(c) {
  const THREE = window.THREE;
  if (!THREE || !renderer || !viewer) return;
  if (!twin) twin = c.clone();
  const size = renderer.getSize(new THREE.Vector2());
  const w = Math.floor(size.x / 2);
  const h = size.y;
  for (const k of [c, twin]) { k.aspect = w / h; k.far = c.far; k.updateProjectionMatrix(); }
  const p = cam.pose(performance.now());
  if (p) { twin.position.set(p.x, p.y, p.z); twin.rotation.set(p.pitch, p.yaw, 0, 'ZYX'); }
  renderer.setScissorTest(true);
  renderer.setViewport(w, 0, w, h);
  renderer.setScissor(w, 0, w, h);
  renderer.render(viewer.scene, twin);
  renderer.setViewport(0, 0, w, h);
  renderer.setScissor(0, 0, w, h);
}
function capture(now) {
  if (encoding >= 2) { stats.captureBusy += 1; return; }
  encoding += 1;
  const at = performance.timeOrigin + now;
  renderer.domElement.toBlob((blob) => {
    if (!blob) { encoding -= 1; return; }
    blob.arrayBuffer().then((buf) => {
      const b = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      window.__museFrame(at.toFixed(1) + ',' + btoa(bin));
    }).finally(() => { encoding -= 1; });
  }, 'image/jpeg', O.quality);
}
window.__muse = {
  workers: O.workers,
  sample(pos, yaw, pitch) {
    stats.samples += 1;
    if (!O.smooth && !O.compare) return false; // the viewer's own camera
    cam.sample(pos, yaw, pitch, performance.now());
    return !O.compare; // compare: the viewer moves its own camera too (left half)
  },
  frame(v, r) {
    viewer = v;
    renderer = r;
    if (!prepared && v && v.world) prepare(v);
    const now = performance.now();
    if (now < next - 4) { stats.skipped += 1; return false; } // 4 ms early still counts: rAF ticks are not exact
    next += interval;
    if (next < now) next = now + interval; // behind (a slow frame): start the cadence again from now, no burst
    return true;
  },
  camera(c) {
    if (O.compare) compareDraw(c);
    else if (O.smooth) {
      const p = cam.pose(performance.now());
      if (p) { c.position.set(p.x, p.y, p.z); c.rotation.set(p.pitch, p.yaw, 0, 'ZYX'); }
    }
    // entities the viewer has no model for (dropped items, arrows, orbs) are magenta boxes: not shown on the stream
    if (viewer && viewer.entities && stats.frames % 10 === 0) {
      for (const m of Object.values(viewer.entities.entities || {})) {
        if (m.material && m.material.color && m.material.color.getHex() === 0xff00ff) m.visible = false;
      }
    }
    // a first-person camera on the surface never sees the caves far below it (nor a miner the surface far above):
    // sections outside a band around the eye are not drawn, a cheap stand-in for occlusion culling
    if (O.below > 0 && viewer && viewer.world) {
      const lo = c.position.y - O.below;
      const hi = c.position.y + O.above;
      for (const mesh of Object.values(viewer.world.sectionMeshs || {})) {
        const y = mesh.position.y;
        mesh.visible = y + 16 > lo && y < hi;
      }
    }
  },
  rendered() {
    const now = performance.now();
    if (stats.lastFrameAt) stats.maxGapMs = Math.max(stats.maxGapMs, now - stats.lastFrameAt);
    stats.lastFrameAt = now;
    stats.frames += 1;
    if (O.trace && viewer) {
      const c = viewer.camera;
      const row = [Math.round(now * 10) / 10, c.position.x, c.position.y, c.position.z, c.rotation.y, c.rotation.x];
      if (twin) row.push(twin.position.x, twin.position.y, twin.position.z, twin.rotation.y, twin.rotation.x);
      trace.push(row);
      if (trace.length > 20000) trace.shift();
    }
    if (O.capture === 'blob' && renderer && typeof window.__museFrame === 'function') capture(now);
  },
  /** The camera of every drawn frame since the last call (with trace on). */
  takeTrace() { return trace.splice(0); },
  /** Triangles per 16-block layer of the loaded world (for tuning). */
  layers() {
    const out = {};
    for (const [key, mesh] of Object.entries(viewer && viewer.world ? viewer.world.sectionMeshs || {} : {})) {
      const y = Number(key.split(',')[1]);
      const g = mesh.geometry;
      out[y] = (out[y] || 0) + (g && g.index ? g.index.count / 3 : 0);
    }
    return out;
  },
  info() {
    const sections = viewer && viewer.world ? Object.keys(viewer.world.sectionMeshs || {}).length : 0;
    const r = renderer && renderer.info ? renderer.info.render : {};
    return { ...stats, sections, calls: r.calls || 0, triangles: r.triangles || 0, cuts: cam.cuts };
  },
};
})();`;
}
