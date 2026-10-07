// pv.js - deterministic frame-by-frame scene runtime (p5.js + p5.brush + three.js + Canvas2D)
//
// A scene calls defineScene(spec). The runtime then exposes
//   window.renderFrame(i)  -> Promise, draws frame i into the final 2D canvas
//   window.__pv            -> { ready, error, meta, cfg, capture(i,url,fmt), canvas, ... }
// Every frame is a PURE function of i: all randomness is re-seeded from (seed, i or boil step),
// the animation clock is t = (i mod N) / N, and nothing may carry over from the previous frame.
// See README.md for the full contract.

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

/** Hash any list of numbers/strings to a non-zero uint32 (murmur3-style finaliser). */
export function hashSeed(...parts) {
  let h = 0x811c9dc5;
  const s = parts.map(String).join('␟');
  for (let k = 0; k < s.length; k++) {
    h = Math.imul(h ^ s.charCodeAt(k), 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) || 1;
}

/** mulberry32 PRNG. rng(...keys) -> r() in [0,1) plus helpers r.range/int/pick/gauss/sign/chance. */
export function rng(...parts) {
  let a = hashSeed(...parts);
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r()); // inclusive
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  r.chance = (p) => r() < p;
  r.gauss = (mu = 0, sd = 1) => {
    const u = 1 - r(), v = r();
    return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return r;
}

// ---------------------------------------------------------------------------
// Periodic (loop-safe) noise: 3D gradient noise sampled on a circle in t
// ---------------------------------------------------------------------------

function makeNoise3(seed) {
  const r = rng('noise3', seed);
  const p = new Uint8Array(512);
  const perm = [...Array(256).keys()];
  for (let k = 255; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [perm[k], perm[j]] = [perm[j], perm[k]]; }
  for (let k = 0; k < 512; k++) p[k] = perm[k & 255];
  const fade = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const grad = (h, x, y, z) => {
    const u = (h & 15) < 8 ? x : y, v = (h & 15) < 4 ? y : ((h & 15) === 12 || (h & 15) === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  const L = (a, b, t) => a + t * (b - a);
  return (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return L(L(L(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
               L(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u), v),
             L(L(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
               L(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  };
}
const _noiseCache = new Map();
/** noise3(seed)(x,y,z) in ~[-1,1]. */
export function noise3(seed = 0) {
  if (!_noiseCache.has(seed)) _noiseCache.set(seed, makeNoise3(seed));
  return _noiseCache.get(seed);
}
/** Loop-safe noise: value at loop phase t in [0,1) is periodic (t=0 == t=1). `x` separates channels. */
export function loopNoise(t, x = 0, { seed = 0, radius = 1 } = {}) {
  const a = t * Math.PI * 2;
  return noise3(seed)(x * 1.7 + 11.3, Math.cos(a) * radius + 5.1, Math.sin(a) * radius + 7.9);
}

// ---------------------------------------------------------------------------
// Timing helpers
// ---------------------------------------------------------------------------

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = {
  linear: (x) => x,
  inSine: (x) => 1 - Math.cos((x * Math.PI) / 2),
  outSine: (x) => Math.sin((x * Math.PI) / 2),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  smooth: (x) => x * x * (3 - 2 * x),
};
/** Normalised progress of t through [a,b], clamped and eased. */
export const seg = (t, a, b, e = ease.linear) => e(clamp((t - a) / (b - a)));
/** 0 -> 1 -> 0 envelope over [a,b] with ramps of width `r` (in t units). */
export const pulse = (t, a, b, r = 0.02, e = ease.inOutSine) => Math.min(seg(t, a, a + r, e), 1 - seg(t, b - r, b, e));

// ---------------------------------------------------------------------------
// Paper texture (procedural, deterministic, cached)
// ---------------------------------------------------------------------------

const _paperCache = new Map();
/**
 * Returns a canvas (w x h px) of paper tone + fibres + grain, meant to be drawn with
 * globalCompositeOperation 'multiply' (tone) or used as the base layer.
 */
export function paper(w, h, { seed = 1, tone = '#f4efe4', grain = 0.07, fibres = 0.05, blotch = 0.05 } = {}) {
  const key = [w, h, seed, tone, grain, fibres, blotch].join('|');
  if (_paperCache.has(key)) return _paperCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = tone; g.fillRect(0, 0, w, h);
  const r = rng('paper', seed);
  // Low-frequency blotches (paper sizing unevenness), rendered small then upscaled.
  const sw = Math.max(8, Math.round(w / 24)), sh = Math.max(8, Math.round(h / 24));
  const small = document.createElement('canvas'); small.width = sw; small.height = sh;
  const sg = small.getContext('2d'); const sd = sg.createImageData(sw, sh);
  const n = noise3(hashSeed('paperblotch', seed));
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const v = n(x / 9, y / 9, 0.5) * 0.6 + n(x / 3.3, y / 3.3, 3.1) * 0.4;
    const k = (y * sw + x) * 4; const d = v > 0 ? 0 : 255;
    sd.data[k] = sd.data[k + 1] = sd.data[k + 2] = d; sd.data[k + 3] = Math.min(255, Math.abs(v) * 255 * blotch * 4);
  }
  sg.putImageData(sd, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, w, h);
  // Fibres
  const nf = Math.round((w * h) / 900 * fibres * 10);
  g.lineCap = 'round';
  for (let k = 0; k < nf; k++) {
    const x = r() * w, y = r() * h, len = r.range(4, 22) * (w / 1920), a = r() * Math.PI;
    g.strokeStyle = r() < 0.5 ? `rgba(90,70,40,${r.range(0.03, 0.09)})` : `rgba(255,255,255,${r.range(0.05, 0.14)})`;
    g.lineWidth = r.range(0.4, 1.1) * (w / 1920);
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + r.range(-2, 2), y + Math.sin(a) * len * 0.5 + r.range(-2, 2), x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  // Per-pixel grain
  const id = g.getImageData(0, 0, w, h); const d = id.data;
  const amp = grain * 255;
  for (let k = 0; k < d.length; k += 4) {
    const v = (r() + r() - 1) * amp;
    d[k] = clamp(d[k] + v, 0, 255); d[k + 1] = clamp(d[k + 1] + v, 0, 255); d[k + 2] = clamp(d[k + 2] + v * 0.9, 0, 255);
  }
  g.putImageData(id, 0, 0);
  _paperCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------------------
// Scene runtime
// ---------------------------------------------------------------------------

const Q = new URLSearchParams(location.search);
const qnum = (k, d) => (Q.has(k) && Q.get(k) !== '' ? Number(Q.get(k)) : d);

const state = {
  ready: false, error: null, meta: null, cfg: null, canvas: null, timings: {},
  layers: [], p5: null, brushQueue: null, rendering: false, lastFrame: -1,
};
window.__pv = state;
window.addEventListener('error', (e) => { state.error = state.error || String(e.message || e); });
window.addEventListener('unhandledrejection', (e) => { state.error = state.error || String(e.reason && (e.reason.stack || e.reason)); });

function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

class LRU {
  constructor(n) { this.n = n; this.m = new Map(); }
  get(k) { const v = this.m.get(k); if (v) { this.m.delete(k); this.m.set(k, v); } return v; }
  set(k, v) { this.m.set(k, v); while (this.m.size > this.n) this.m.delete(this.m.keys().next().value); }
}

/**
 * defineScene(spec)
 *   spec.meta   : { title, width=1920, height=1080, fps=30, durationFrames, seed=1,
 *                   design:[1920,1080], background:'#fff', fonts:['Fraunces', ...],
 *                   boil:{every:3, variants:3}, poster: frameIndex }
 *   spec.setup  : async (ctx) => void      once per page (load assets, build geometry)
 *   spec.update : (ctx) => void            once per frame BEFORE layers (set all animated state from ctx.t)
 *   spec.layers : [ layer, ... ]           drawn in order and composited bottom -> top
 *   spec.post   : (ctx, g) => void          optional, draws on the final composite (design units)
 * layer = { name, type: '2d'|'brush'|'three', draw, init?, cache?, opacity=1, blend='source-over',
 *           underlay=false (brush only), clear=null (brush only: CSS colour for an opaque clear),
 *           boil = true|{every,variants}|false (brush only: re-seed per boil step, default true) }
 */
export function defineScene(spec) {
  const meta = Object.assign({
    title: 'untitled', width: 1920, height: 1080, fps: 30, durationFrames: 90, seed: 1,
    design: [1920, 1080], background: '#ffffff', fonts: [], boil: { every: 3, variants: 3 }, poster: 0,
  }, spec.meta || {});
  const cfg = {
    W: qnum('width', meta.width), H: qnum('height', meta.height), fps: qnum('fps', meta.fps),
    N: qnum('frames', meta.durationFrames), seed: qnum('seed', meta.seed),
    render: Q.get('render') === '1',
  };
  cfg.DW = meta.design[0]; cfg.DH = meta.design[1];
  cfg.S = Math.min(cfg.W / cfg.DW, cfg.H / cfg.DH);
  // Design space is letter-boxed/centred if output aspect differs from the design aspect.
  cfg.OX = (cfg.W - cfg.DW * cfg.S) / 2; cfg.OY = (cfg.H - cfg.DH * cfg.S) / 2;
  state.meta = meta; state.cfg = cfg; state.spec = spec;
  window.PV_META = { ...meta, ...cfg };
  boot(spec, meta, cfg).catch((e) => { state.error = String(e && (e.stack || e)); console.error(e); });
}

async function waitFonts(families) {
  const list = families || [];
  await Promise.all(list.flatMap((f) => [
    document.fonts.load(`400 32px "${f}"`), document.fonts.load(`700 32px "${f}"`),
    document.fonts.load(`italic 400 32px "${f}"`).catch(() => null),
  ]));
  await document.fonts.ready;
  const missing = list.filter((f) => !document.fonts.check(`32px "${f}"`));
  if (missing.length) throw new Error('fonts not available: ' + missing.join(', '));
}

async function boot(spec, meta, cfg) {
  const { W, H } = cfg;
  document.documentElement.style.background = '#222';
  const final = makeCanvas(W, H);
  final.id = 'pv-final';
  state.canvas = final;
  state.g = final.getContext('2d', { alpha: false });
  const host = document.createElement('div'); host.id = 'pv-host';
  host.style.cssText = cfg.render ? 'display:none' : 'position:fixed;inset:0 0 64px 0;display:flex;align-items:center;justify-content:center';
  final.style.cssText = 'max-width:100%;max-height:100%;box-shadow:0 2px 24px #0008';
  host.appendChild(final); document.body.appendChild(host);
  document.body.style.margin = '0';

  await waitFonts(meta.fonts);

  const types = new Set((spec.layers || []).map((l) => l.type));
  // --- three.js layers: one WebGLRenderer (own canvas/context) per layer
  let THREE = null;
  if (types.has('three')) THREE = await import('three');
  // --- p5 + p5.brush: ONE shared WEBGL instance, brush layers are sequential passes on it
  if (types.has('brush')) await bootP5(cfg);

  const baseCtx = makeCtxBase(cfg, meta);
  state.baseCtx = baseCtx;
  for (const L of spec.layers || []) {
    const rec = { spec: L, name: L.name, type: L.type, cache: L.cache ? new LRU(L.cacheSize || 6) : null };
    if (L.type === '2d') {
      rec.canvas = makeCanvas(W, H); rec.g = rec.canvas.getContext('2d');
    } else if (L.type === 'three') {
      rec.canvas = makeCanvas(W, H);
      const renderer = new THREE.WebGLRenderer({
        canvas: rec.canvas, antialias: L.antialias !== false, alpha: true,
        preserveDrawingBuffer: true, premultipliedAlpha: true, powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(1); renderer.setSize(W, H, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      rec.three = { THREE, renderer };
      if (L.init) Object.assign(rec.three, (await L.init(baseCtx, rec.three)) || {});
    } else if (L.type === 'brush') {
      rec.canvas = null; // drawn directly from the shared p5 canvas unless cached
    } else {
      throw new Error('unknown layer type ' + L.type);
    }
    state.layers.push(rec);
  }
  baseCtx.layers = Object.fromEntries(state.layers.map((r) => [r.name, r]));
  if (spec.setup) await spec.setup(baseCtx);
  // Warm-up: render frame 0 once so shader compilation / lazy init does not land inside a timed frame
  // and so any first-use state (p5.brush field tables, gaussian pools) exists before real frames.
  await renderFrame(0);
  state.ready = true;
  window.renderFrame = renderFrame;
  if (!cfg.render) buildPreviewUI(cfg);
}

function bootP5(cfg) {
  return new Promise((resolve, reject) => {
    if (typeof p5 === 'undefined' || typeof brush === 'undefined') {
      reject(new Error('brush layers need /pv/vendor/p5/p5.min.js and /pv/vendor/p5.brush/p5.brush.js loaded as classic scripts'));
      return;
    }
    new p5((p) => {
      brush.instance(p);
      p.setup = () => {
        p.pixelDensity(1);
        const c = p.createCanvas(cfg.W, cfg.H, p.WEBGL);
        c.elt.style.display = 'none';
        p.angleMode(p.RADIANS);
        p.noLoop();
        brush.load();
        state.p5 = p;
        state.p5underlay = p.createGraphics(cfg.W, cfg.H);
        state.p5underlay.pixelDensity(1);
        state.p5underlay.elt.style.display = 'none';
      };
      let first = true;
      p.draw = async () => {
        // p5 runs draw() once after setup even under noLoop(); only then is redraw() usable.
        if (first) { first = false; resolve(p); return; }
        const job = state.brushQueue; state.brushQueue = null;
        if (job) await job();
      };
    });
  });
}

function makeCtxBase(cfg, meta) {
  const { W, H, S, DW, DH, N, fps, seed } = cfg;
  return {
    W, H, S, DW, DH, N, fps, seed, meta, cfg,
    THREE: null,
    rng: (...k) => rng(seed, ...k),
    clamp, lerp, ease, seg, pulse, noise3, loopNoise,
    font: (family, size, weight = 400, style = 'normal') => `${style} ${weight} ${size}px "${family}"`,
    paper: (opts = {}) => paper(W, H, { seed, ...opts }),
  };
}

function frameCtx(i) {
  const cfg = state.cfg, base = state.baseCtx, N = cfg.N;
  const iw = ((i % N) + N) % N; // frame N == frame 0 (seamless loop)
  const every = state.meta.boil.every, variants = state.meta.boil.variants;
  const ctx = Object.create(base);
  Object.assign(ctx, {
    i, iw, t: iw / N, sec: iw / cfg.fps,
    /** Boil step: which hand-drawn variant is showing (changes every `every` frames, cycles `variants`). */
    boil: (ev = every, va = variants) => Math.floor(iw / ev) % va,
    /** RNG that is stable within a boil step and changes between steps (for hand-drawn jitter). */
    boilRng: (...k) => rng(cfg.seed, 'boil', Math.floor(iw / every) % variants, ...k),
    /** RNG unique to this frame (film grain etc). */
    frameRng: (...k) => rng(cfg.seed, 'frame', iw, ...k),
    project: (v3, cam) => project(v3, cam || ctx.camera),
    /** Activate a p5.brush vector field and regenerate it NOW (fields are cached inside p5.brush the
     *  first time they are used, which would make them depend on render order). */
    field: (name, time = 0) => { brush.field(name); brush.refreshField(time); },
    wiggle: (amount = 1) => { brush.wiggle(amount); brush.refreshField(0); },
  });
  return ctx;
}

/** Project a THREE.Vector3 (world) to design-space coordinates using `camera`. */
function project(v3, camera) {
  if (!camera) throw new Error('ctx.project needs a camera (set ctx.camera in update or pass one)');
  const v = v3.clone().project(camera);
  const cfg = state.cfg;
  const x = (v.x * 0.5 + 0.5) * cfg.W, y = (-v.y * 0.5 + 0.5) * cfg.H;
  return { x: (x - cfg.OX) / cfg.S, y: (y - cfg.OY) / cfg.S, z: v.z };
}

function seedMathRandom(...k) {
  const r = rng(...k);
  Math.random = r;
}

async function renderLayer(rec, ctx) {
  const cfg = state.cfg, L = rec.spec, { W, H, S, OX, OY } = cfg;
  if (rec.type === '2d') {
    const g = rec.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(S, 0, 0, S, OX, OY);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    await L.draw(ctx, g);
    return rec.canvas;
  }
  if (rec.type === 'three') {
    const T = rec.three;
    ctx.THREE = T.THREE;
    const res = await L.draw(ctx, T);
    if (res !== false && T.scene && T.camera) T.renderer.render(T.scene, T.camera);
    return rec.canvas;
  }
  if (rec.type === 'brush') {
    const p = state.p5;
    const boilCfg = L.boil === false ? null : (L.boil === true || L.boil == null ? state.meta.boil : L.boil);
    const step = boilCfg ? Math.floor(ctx.iw / boilCfg.every) % boilCfg.variants : 0;
    if (L.underlay) {
      const u = state.p5underlay;
      u.clear(); u.drawingContext.drawImage(state.canvas, 0, 0);
    }
    let err = null;
    state.brushQueue = async () => {
      try {
        p.resetMatrix();
        if (L.clear) p.background(L.clear); else p.clear();
        if (L.underlay) { p.push(); p.imageMode(p.CORNER); p.image(state.p5underlay, -W / 2, -H / 2, W, H); p.pop(); }
        p.randomSeed(hashSeed(cfg.seed, 'brush', L.name, step));
        p.noiseSeed(hashSeed(cfg.seed, 'brushnoise', L.name));
        brush.load();
        p.push();
        p.translate(-W / 2 + OX, -H / 2 + OY);
        p.scale(S);
        await L.draw(ctx, p, brush);
        p.pop();
      } catch (e) { err = e; }
    };
    await p.redraw();
    if (err) throw err;
    return p.canvas;
  }
  throw new Error('bad layer');
}

/** Draw frame i (pure function of i) into the final canvas. */
export async function renderFrame(i) {
  if (state.rendering) throw new Error('renderFrame is not re-entrant');
  state.rendering = true;
  const t0 = performance.now();
  const timings = {};
  try {
    const cfg = state.cfg, spec = state.spec, g = state.g;
    const ctx = frameCtx(i);
    seedMathRandom(cfg.seed, 'math', ctx.iw);
    if (spec.update) await spec.update(ctx);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = state.meta.background; g.fillRect(0, 0, cfg.W, cfg.H);
    for (const rec of state.layers) {
      const L = rec.spec, tl = performance.now();
      const key = rec.cache && !L.underlay ? L.cache(ctx) : null;
      let src = null;
      if (key != null) src = rec.cache.get(String(key));
      if (!src) {
        seedMathRandom(cfg.seed, 'math', ctx.iw, rec.name);
        src = await renderLayer(rec, ctx);
        if (key != null) {
          const copy = makeCanvas(cfg.W, cfg.H); copy.getContext('2d').drawImage(src, 0, 0);
          rec.cache.set(String(key), copy); src = copy;
        }
      }
      g.globalAlpha = L.opacity == null ? 1 : L.opacity;
      g.globalCompositeOperation = L.underlay ? 'copy' : (L.blend || 'source-over');
      g.drawImage(src, 0, 0);
      timings[rec.name] = +(performance.now() - tl).toFixed(1);
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (spec.post) {
      g.save(); g.setTransform(cfg.S, 0, 0, cfg.S, cfg.OX, cfg.OY);
      await spec.post(ctx, g);
      g.restore();
    }
    timings.total = +(performance.now() - t0).toFixed(1);
    state.timings = timings; state.lastFrame = i;
    return timings;
  } finally {
    state.rendering = false;
  }
}

/**
 * Render frame i and deliver it losslessly.
 *   fmt 'png'  : canvas.toBlob PNG, POSTed to url (server writes it as-is)
 *   fmt 'rgba' : raw RGBA bytes POSTed to url (server encodes)
 * Returns timings.
 */
state.capture = async (i, url, fmt = 'png') => {
  const timings = await renderFrame(i);
  const t1 = performance.now();
  let body;
  if (fmt === 'rgba') {
    body = state.g.getImageData(0, 0, state.cfg.W, state.cfg.H).data;
  } else {
    body = await new Promise((res) => state.canvas.toBlob(res, 'image/png'));
  }
  const t2 = performance.now();
  const r = await fetch(url, { method: 'POST', body, headers: { 'x-pv-width': state.cfg.W, 'x-pv-height': state.cfg.H, 'x-pv-format': fmt } });
  if (!r.ok) throw new Error('upload failed ' + r.status);
  timings.encode = +(t2 - t1).toFixed(1);
  timings.upload = +(performance.now() - t2).toFixed(1);
  return timings;
};

/** Pixel hash of the current final canvas (for determinism tests). */
state.hash = () => {
  const d = state.g.getImageData(0, 0, state.cfg.W, state.cfg.H).data;
  let h1 = 0x811c9dc5, h2 = 0x12345678;
  for (let k = 0; k < d.length; k += 4) {
    const v = d[k] | (d[k + 1] << 8) | (d[k + 2] << 16);
    h1 = Math.imul(h1 ^ v, 0x01000193); h2 = Math.imul(h2 ^ (v + k), 0x5bd1e995);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
};

// ---------------------------------------------------------------------------
// Interactive preview (only when not ?render=1): play/pause, scrub, step
// ---------------------------------------------------------------------------
function buildPreviewUI(cfg) {
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;height:64px;display:flex;gap:12px;align-items:center;padding:0 16px;background:#111;color:#ddd;font:13px system-ui';
  bar.innerHTML = `<button id="pvp">play</button><input id="pvs" type="range" min="0" max="${cfg.N}" value="0" style="flex:1">
    <span id="pvf" style="min-width:210px;font-variant-numeric:tabular-nums"></span>`;
  document.body.appendChild(bar);
  const s = bar.querySelector('#pvs'), f = bar.querySelector('#pvf'), b = bar.querySelector('#pvp');
  let playing = false, cur = Number(Q.get('f') || 0), busy = false;
  const show = async (k) => {
    if (busy) return; busy = true;
    cur = ((k % (cfg.N + 1)) + cfg.N + 1) % (cfg.N + 1);
    const tm = await renderFrame(cur);
    s.value = cur; f.textContent = `frame ${cur}/${cfg.N}  ${(cur / cfg.fps).toFixed(2)}s  ${tm.total}ms`;
    busy = false;
  };
  s.oninput = () => show(Number(s.value));
  b.onclick = () => { playing = !playing; b.textContent = playing ? 'pause' : 'play'; };
  window.addEventListener('keydown', (e) => {
    if (e.key === ' ') { b.click(); e.preventDefault(); }
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === 'ArrowLeft') show(cur - 1);
  });
  (async function loop() {
    for (;;) {
      if (playing && !busy) await show(cur >= cfg.N - 1 ? 0 : cur + 1);
      await new Promise((r) => setTimeout(r, playing ? 0 : 50));
    }
  })();
  show(cur);
}
