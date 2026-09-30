// Tiga transition films: shared engine for attack.html (events -> guandan) and light.html (guandan -> events).
//
// A film is a list of shots over painted key frames (art/*.png, 1536x1024 "art space"), each with a camera path
// per aspect (land = 16:9, port = 9:16), plus timed effects:
//   art layer (Canvas2D)   the key frame through the shot camera, art-space sprites (jet, rays, cracks glow)
//   three layer (three.js) 3D toon debris with ink hulls, the Guandan card stream / beam, sparks
//   fx layer (q5.js)       speed lines, dust, embers, cracks, flashes, katakana SFX, grain, vignette
//   post                   anime impact frames (posterised / inverted), fades
// Every visual is a pure function of the frame index (pv runtime contract).
import { defineScene, ease } from '/pv/runtime/pv.js';

export const AW = 1536, AH = 1024;
const Q = new URLSearchParams(location.search);
const OUT_W = +Q.get('width') || 1280, OUT_H = +Q.get('height') || 720;
export const PORTRAIT = OUT_H > OUT_W;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => u * u * (3 - 2 * u);
export const EASE = {
  lin: (u) => u, io: (u) => ease.inOutCubic ? ease.inOutCubic(u) : smooth(u),
  out: (u) => 1 - Math.pow(1 - u, 3), in: (u) => u * u * u, outQ: (u) => 1 - Math.pow(1 - u, 5),
  outBack: (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); },
};
/** 0..1 progress of t through [a, b] with an easing. */
export const prog = (t, a, b, e = EASE.lin) => e(clamp((t - a) / (b - a), 0, 1));
/** envelope: rises over `att`, holds, falls over `rel` inside [a, b]. */
export const env = (t, a, b, att = 0.05, rel = 0.2) =>
  t < a || t > b ? 0 : Math.min(1, (t - a) / Math.max(att, 1e-6), (b - t) / Math.max(rel, 1e-6));

function hash(...k) {
  let h = 2166136261 >>> 0;
  for (const s of k.join('|')) { h ^= s.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(...k) {
  let a = hash(...k) || 1;
  const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) / 0.577; };
  return r;
}
// smooth 1D value noise for shake / flicker
function vnoise(seed, x) {
  const i = Math.floor(x), f = x - i, a = rng(seed, i)(), b = rng(seed, i + 1)();
  return lerp(a, b, smooth(f)) * 2 - 1;
}

/* ---------------------------------------------------------------- camera */

// keys: [[u, x, y, z, rot(deg), easeName?], ...] with u in [0,1] of the shot; x,y art coords of the view centre.
function camAt(keys, u) {
  if (u <= keys[0][0]) return keys[0];
  for (let k = 1; k < keys.length; k++) {
    const A = keys[k - 1], B = keys[k];
    if (u <= B[0]) {
      const e = EASE[B[5] || 'io'], w = e((u - A[0]) / Math.max(B[0] - A[0], 1e-6));
      return [u, lerp(A[1], B[1], w), lerp(A[2], B[2], w), lerp(A[3], B[3], w), lerp(A[4] || 0, B[4] || 0, w)];
    }
  }
  return keys[keys.length - 1];
}

/** view of a shot at time t: art-space window + transform to output pixels. */
export function viewOf(shot, t, film) {
  const u = clamp((t - shot.t0) / (shot.t1 - shot.t0), 0, 1);
  const keys = (PORTRAIT && shot.cam.port) || shot.cam.land;
  let [, x, y, z, rot] = camAt(keys, u);
  const a = OUT_W / OUT_H;
  let vw, vh;
  if (!PORTRAIT) { vw = AW / z; vh = vw / a; } else { vh = AH / z; vw = vh * a; }
  // shake (output px) from the film's shake envelopes
  let amp = 0;
  for (const s of film.shakes) amp = Math.max(amp, s.amp * env(t, s.t0, s.t1, s.att ?? 0.02, s.rel ?? (s.t1 - s.t0) * 0.8));
  const k = OUT_W / vw;                         // output px per art px
  const m = amp / k * 1.2;                       // keep the shaken view inside the art
  x = clamp(x, vw / 2 + m, AW - vw / 2 - m); y = clamp(y, vh / 2 + m, AH - vh / 2 - m);
  const sx = amp * vnoise(hash('shx', shot.id), t * 38), sy = amp * vnoise(hash('shy', shot.id), t * 41 + 7);
  return { x, y, vw, vh, k, rot: rot || 0, sx, sy, z, u };
}
/** art point -> output px under a view */
export function toScreen(v, px, py) {
  const dx = (px - v.x) * v.k, dy = (py - v.y) * v.k, r = v.rot * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [OUT_W / 2 + dx * c - dy * s + v.sx, OUT_H / 2 + dx * s + dy * c + v.sy];
}
function applyView(g, v) {
  g.translate(OUT_W / 2 + v.sx, OUT_H / 2 + v.sy); g.rotate(v.rot * Math.PI / 180);
  g.scale(v.k, v.k); g.translate(-v.x, -v.y);
}

/* ---------------------------------------------------------------- film */

export function makeFilm(F) {
  const fps = F.fps || 30, N = Math.round(F.seconds * fps);
  F.shakes = F.shakes || [];
  const shotAt = (t) => F.shots.find((s) => t >= s.t0 && t < s.t1) || F.shots[F.shots.length - 1];
  const IMG = {};
  let q = null;                       // q5 graphics for the fx layer
  let grain = null;
  const T3 = {};

  const state = { t: 0, shot: null, view: null, prev: null };

  defineScene({
    meta: {
      title: F.title, durationFrames: N, fps, width: OUT_W, height: OUT_H, seed: 7,
      design: [OUT_W, OUT_H], background: '#000000', fonts: [], boil: { every: 2, variants: 1 }, poster: F.poster || 0,
    },
    async setup(ctx) {
      await Promise.all(Object.entries(F.art).map(async ([k, url]) => {
        const im = new Image(); im.src = url; await im.decode(); IMG[k] = im;
      }));
      q = new Q5('graphics');
      q.createCanvas(OUT_W, OUT_H, { alpha: true, pixelDensity: 1 });
      q.noLoop?.();
      // film grain tile
      grain = document.createElement('canvas'); grain.width = grain.height = 256;
      const gg = grain.getContext('2d'), id = gg.createImageData(256, 256), r = rng('grain');
      for (let i = 0; i < id.data.length; i += 4) { const v = 128 + r.gauss() * 40; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
      gg.putImageData(id, 0, 0);
      await F.setup?.({ IMG, rng });
    },
    update(ctx) {
      const t = ctx.i / fps;
      state.t = t; state.shot = shotAt(t); state.view = viewOf(state.shot, t, F);
      const i = F.shots.indexOf(state.shot), prev = F.shots[i - 1];
      state.prev = prev && state.shot.dissolve && t < state.shot.t0 + state.shot.dissolve
        ? { shot: prev, view: viewOf(prev, t, F), a: 1 - prog(t, state.shot.t0, state.shot.t0 + state.shot.dissolve, EASE.io) } : null;
    },
    layers: [
      { name: 'art', type: '2d', draw(ctx, g) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#000'; g.fillRect(0, 0, OUT_W, OUT_H);
        const drawShot = (shot, v, alpha) => {
          g.save(); g.globalAlpha = alpha;
          if (shot.grade) g.filter = typeof shot.grade === 'function' ? shot.grade(state.t, v) : shot.grade;
          applyView(g, v);
          g.imageSmoothingQuality = 'high';
          g.drawImage(IMG[shot.img], 0, 0, AW, AH);
          g.filter = 'none';
          shot.art?.(g, state.t, v, IMG);           // art-space sprites for this shot
          g.restore();
        };
        if (state.prev) drawShot(state.prev.shot, state.prev.view, 1);
        drawShot(state.shot, state.view, state.prev ? 1 - state.prev.a : 1);
      } },
      { name: 'three', type: 'three', init(ctx, { THREE, renderer }) {
        return initThree(THREE, renderer, T3, F);
      }, draw(ctx) {
        drawThree(T3, state, F);
      } },
      { name: 'fx', type: '2d', draw(ctx, g) {
        q.clear();
        const c = q.ctx || q.drawingContext;
        c.save();
        F.fx?.(q, c, state.t, state.shot, state.view, { toScreen: (x, y) => toScreen(state.view, x, y), rng, env, prog, EASE, W: OUT_W, H: OUT_H, IMG });
        c.restore();
        // vignette + grain
        const vg = c.createRadialGradient(OUT_W / 2, OUT_H / 2, Math.min(OUT_W, OUT_H) * 0.35, OUT_W / 2, OUT_H / 2, Math.hypot(OUT_W, OUT_H) * 0.62);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
        c.fillStyle = vg; c.fillRect(0, 0, OUT_W, OUT_H);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(q.canvas, 0, 0);
        const gr = rng('g', ctx.i);
        g.globalAlpha = 0.04; g.globalCompositeOperation = 'overlay';
        const ox = Math.floor(gr() * 256), oy = Math.floor(gr() * 256);
        const pat = g.createPattern(grain, 'repeat'); pat.setTransform(new DOMMatrix([1, 0, 0, 1, -ox, -oy]));
        g.fillStyle = pat; g.fillRect(0, 0, OUT_W, OUT_H);
        g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      } },
    ],
    post(ctx, g) {
      const t = ctx.i / fps;
      g.setTransform(1, 0, 0, 1, 0, 0);
      const im = (F.impacts || []).find((x) => t >= x.t && t < x.t + (x.frames || 2) / fps);
      if (im) {
        const k = Math.floor((t - im.t) * fps);
        const invert = (im.style || 'bw') === 'bw' ? k % 2 === 0 : false;
        g.filter = `grayscale(1) contrast(${im.contrast || 7}) brightness(${im.bright || 1.05})${invert ? ' invert(1)' : ''}`;
        g.drawImage(g.canvas, 0, 0);
        g.filter = 'none';
        if (im.style === 'red' || (im.style === 'mix' && k % 2 === 1)) {
          g.globalCompositeOperation = 'multiply'; g.fillStyle = im.color || '#e0152b'; g.fillRect(0, 0, OUT_W, OUT_H);
          g.globalCompositeOperation = 'source-over';
        }
      }
      // flashes (white or tinted), full frame
      for (const f of F.flashes || []) {
        const a = env(t, f.t0, f.t1, f.att ?? 0.02, f.rel ?? (f.t1 - f.t0) * 0.7) * (f.a ?? 1);
        if (a > 0) { g.globalAlpha = a; g.globalCompositeOperation = f.blend || 'source-over'; g.fillStyle = f.color || '#fff'; g.fillRect(0, 0, OUT_W, OUT_H); }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      F.post?.(g, t);
    },
  });
}

/* ---------------------------------------------------------------- three.js */

function initThree(THREE, renderer, T, F) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, OUT_W / OUT_H, 1, 20000);
  renderer.setClearColor(0x000000, 0);
  // toon lighting: warm key from the upper right, cool fill
  const key = new THREE.DirectionalLight(0xe8ecf4, 2.1); key.position.set(-0.5, 0.9, 0.8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a40, 2.4); rim.position.set(0.9, -0.2, -0.6); scene.add(rim);
  const fill = new THREE.HemisphereLight(0x8e96c0, 0x2a1a12, 0.35); scene.add(fill);
  T.key = key; T.fill = fill; T.rim = rim;
  const grad = new THREE.DataTexture(new Uint8Array([46, 46, 46, 255, 128, 128, 128, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

  // rocks: jittered icosahedra, instanced, with an inverted-hull ink outline
  const MAXR = 420;
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position, r = rng('rockgeo');
  const jit = new Map();
  for (let i = 0; i < p.count; i++) {
    const kk = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    if (!jit.has(kk)) jit.set(kk, 0.72 + r() * 0.5);
    const s = jit.get(kk); p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.8, p.getZ(i) * s);
  }
  geo.computeVertexNormals();
  const rockMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: grad });
  const inkMat = new THREE.MeshBasicMaterial({ color: 0x1c120c, side: THREE.BackSide });
  T.rocks = new THREE.InstancedMesh(geo, rockMat, MAXR); T.rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  T.rocks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXR * 3), 3);
  T.ink = new THREE.InstancedMesh(geo, inkMat, MAXR); T.ink.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(T.ink, T.rocks);

  // Guandan cards: one instanced mesh per face, plus additive glow quads
  const faces = cardFaces(THREE);
  T.cards = faces.map((tex) => {
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false }), 160);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; scene.add(m); return m;
  });
  const glowTex = radialTex(THREE, [[0, 'rgba(255,250,220,1)'], [0.25, 'rgba(255,214,110,0.75)'], [0.6, 'rgba(255,160,40,0.18)'], [1, 'rgba(255,120,0,0)']]);
  T.glowTex = glowTex;
  T.glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 900);
  T.glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T.glow.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(900 * 3), 3);
  T.glow.count = 0; scene.add(T.glow);
  // beam core: a long additive quad
  const beamTex = beamTexture(THREE);
  T.beam = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  T.beam.visible = false; scene.add(T.beam);

  // instance bounds are computed once at warm-up (count 0) and would cull every effect forever
  scene.traverse((o) => { o.frustumCulled = false; });
  T.THREE = THREE; T.scene = scene; T.camera = camera; T.dummy = new THREE.Object3D(); T.col = new THREE.Color();
  // precompute debris bursts
  T.bursts = (F.debris || []).map((b, bi) => {
    const R = rng('burst', bi), n = b.count;
    return { ...b, parts: Array.from({ length: n }, () => {
      const ang = (b.dir ?? -90) + R.gauss() * (b.spread ?? 35);
      const sp = (b.speed ?? 900) * (0.45 + R() * 0.75);
      return {
        x: b.x + R.gauss() * (b.rx ?? 40), y: b.y + R.gauss() * (b.ry ?? 20), z: R.range(b.z0 ?? 0, b.z1 ?? 300),
        vx: Math.cos(ang * Math.PI / 180) * sp, vy: Math.sin(ang * Math.PI / 180) * sp, vz: R.range(-100, 400) * (b.vz ?? 1),
        s: R.range(b.s0 ?? 6, b.s1 ?? 26) * (R() < 0.12 ? 1.8 : 1), ax: R() * 6, ay: R() * 6, az: R() * 6,
        wx: R.range(-6, 6), wy: R.range(-6, 6), wz: R.range(-6, 6), delay: R() * (b.stagger ?? 0.08), tint: 0.8 + R() * 0.35,
      };
    }) };
  });
  return { scene, camera };
}

function radialTex(THREE, stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function beamTexture(THREE) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,140,20,0)'); gr.addColorStop(0.3, 'rgba(255,190,70,0.55)'); gr.addColorStop(0.45, 'rgba(255,245,210,1)');
  gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,245,210,1)'); gr.addColorStop(0.7, 'rgba(255,190,70,0.55)'); gr.addColorStop(1, 'rgba(255,140,20,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Guandan card faces drawn in code: 2 (the level card), A, K, Q, J, 10, and both jokers. */
function cardFaces(THREE) {
  const specs = [['2', '♥', '#c8102e'], ['A', '♠', '#15151c'], ['K', '♦', '#c8102e'], ['Q', '♣', '#15151c'], ['J', '♥', '#c8102e'],
    ['10', '♠', '#15151c'], ['JOKER', '大王', '#c8102e'], ['JOKER', '小王', '#15151c']];
  return specs.map(([rank, suit, col]) => {
    const c = document.createElement('canvas'); c.width = 224; c.height = 320;
    const g = c.getContext('2d');
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    g.shadowColor = 'rgba(255,200,80,0.95)'; g.shadowBlur = 18;
    rr(10, 10, 204, 300, 18); g.fillStyle = '#fbf6e8'; g.fill(); g.shadowBlur = 0;
    g.lineWidth = 5; g.strokeStyle = '#e2b24a'; g.stroke();
    rr(20, 20, 184, 280, 12); g.lineWidth = 2; g.strokeStyle = 'rgba(200,150,50,0.8)'; g.stroke();
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (rank === 'JOKER') {
      g.font = '900 30px "Hiragino Sans", "PingFang SC", sans-serif';
      [...'JOKER'].forEach((ch, i) => g.fillText(ch, 42, 50 + i * 30));
      g.font = '900 86px "Hiragino Sans", "PingFang SC", sans-serif'; g.fillText(suit === '大王' ? '★' : '☆', 126, 150);
      g.font = '900 50px "Hiragino Sans", "PingFang SC", sans-serif'; g.fillText(suit, 126, 240);
    } else {
      g.font = `900 ${rank.length > 1 ? 50 : 60}px "Hiragino Sans", sans-serif`; g.fillText(rank, 52, 56);
      g.font = '900 44px "Hiragino Sans", sans-serif'; g.fillText(suit, 52, 110);
      g.font = '900 150px "Hiragino Sans", sans-serif'; g.fillText(suit, 118, 182);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  });
}

function drawThree(T, st, F) {
  const { THREE, camera, dummy } = T, t = st.t, v = st.view, shot = st.shot;
  // camera: the z = 0 plane shows exactly the art view (art y is flipped into world y)
  const fov = 30 * Math.PI / 180, D = (v.vh / 2) / Math.tan(fov / 2);
  const cx = v.x - v.sx / v.k, cy = v.y - v.sy / v.k;
  camera.position.set(cx, -cy, D); camera.up.set(Math.sin(-v.rot * Math.PI / 180), Math.cos(v.rot * Math.PI / 180), 0);
  camera.lookAt(cx, -cy, 0); camera.near = D * 0.05; camera.far = D * 4; camera.updateProjectionMatrix();
  const L = shot.light || {};
  T.key.color.set(L.key ?? 0xe8ecf4); T.key.intensity = L.ki ?? 2.1; T.rim.color.set(L.rim ?? 0xff9a40); T.rim.intensity = L.ri ?? 2.4;

  // debris
  let n = 0;
  for (const b of T.bursts) {
    if (b.shot && b.shot !== shot.id) continue;
    for (const P of b.parts) {
      const tau = t - b.t - P.delay;
      if (tau < 0 || tau > (b.life ?? 2.5)) continue;
      const g = b.g ?? 1400, drag = b.drag ?? 0.25;
      const d = (1 - Math.exp(-drag * tau)) / drag;
      const x = P.x + P.vx * d, y = P.y + P.vy * d + 0.5 * g * tau * tau, z = P.z + P.vz * d;
      const fade = 1 - prog(tau, (b.life ?? 2.5) * 0.75, b.life ?? 2.5);
      const s = P.s * fade * (b.grow ? Math.min(1, tau * 8) : 1);
      if (s < 0.3) continue;
      dummy.position.set(x, -y, z);
      dummy.rotation.set(P.ax + P.wx * tau, P.ay + P.wy * tau, P.az + P.wz * tau);
      dummy.scale.setScalar(s); dummy.updateMatrix();
      T.rocks.setMatrixAt(n, dummy.matrix);
      T.col.set(b.color ?? 0xb9a78e).multiplyScalar(P.tint); T.rocks.setColorAt(n, T.col);
      dummy.scale.setScalar(s * 1.07); dummy.updateMatrix(); T.ink.setMatrixAt(n, dummy.matrix);
      n++;
    }
  }
  T.rocks.count = T.ink.count = n;
  T.rocks.instanceMatrix.needsUpdate = T.ink.instanceMatrix.needsUpdate = true;
  if (T.rocks.instanceColor) T.rocks.instanceColor.needsUpdate = true;

  // cards + glows + beam (film-specific)
  const cardCounts = T.cards.map(() => 0);
  let gn = 0;
  const api = {
    card(face, x, y, z, rx, ry, rz, s) {
      const m = T.cards[face % T.cards.length], k = cardCounts[face % T.cards.length]++;
      if (k >= 160) return;
      dummy.position.set(x, -y, z); dummy.rotation.set(rx, ry, rz); dummy.scale.setScalar(s); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix);
    },
    glow(x, y, z, s, color = 0xffd070, a = 1) {
      if (gn >= 900) return;
      dummy.position.set(x, -y, z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(s); dummy.updateMatrix();
      T.glow.setMatrixAt(gn, dummy.matrix); T.col.set(color).multiplyScalar(a); T.glow.setColorAt(gn, T.col); gn++;
    },
    beam(x0, y0, x1, y1, width, a = 1) {
      T.beam.visible = a > 0.01;
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
      T.beam.position.set((x0 + x1) / 2, -(y0 + y1) / 2, 20);
      T.beam.rotation.set(0, 0, -Math.atan2(dy, dx));
      T.beam.scale.set(L, width, 1); T.beam.material.opacity = a;
    },
    camera: v, t,
  };
  T.beam.visible = false;
  F.three?.(api, t, shot, v);
  T.cards.forEach((m, i) => { m.count = cardCounts[i]; m.instanceMatrix.needsUpdate = true; });
  T.glow.count = gn; T.glow.instanceMatrix.needsUpdate = true; if (T.glow.instanceColor) T.glow.instanceColor.needsUpdate = true;
}
