/* ════════════════════════════════════════════════════════════════════════
   people/fx/kit.js — shared runtime for the Team page avatar effects

   Every avatar on https://yufeiding.ucsd.edu/people/team is its own Google Sites
   embed (people/<name>.html, pasted). The pasted snippet only shows the photo and
   a tiny loader; on the first hover / touch it imports this kit and the person's
   scene (people/fx/<name>.js, served by GitHub Pages, so scene changes go live on
   push without a re-paste). A click turns the effect on:

     - three.js renders the avatar as layers: the background plate (the photo with
       the person inpainted out), the person cut out on top, and 3D props in
       between / in front, in a toon + ink "3D comic" look; the stage tilts a few
       degrees toward the pointer, so the layers part in real parallax;
     - q5.js (the p5.js API, a tenth of the size) draws the 2D comic layer on top:
       lettering, sparks, speed lines, brush strokes.

   Default state is the plain photo. The WebGL context exists only while an effect
   is on and is released after it switches off: the page has 15 of these embeds and
   a phone allows far fewer live WebGL contexts than that.

   A scene module exports default {
     title,                     // for aria-label
     exit: 0.45,                // seconds the exit takes (props leave as k.e goes 0 -> 1)
     still: 2.4,                // time shown when the visitor prefers reduced motion
     plate: true,               // swap the photo for the plate behind the person (needed for parallax)
     film: 'film/<name>',       // optional: a short square film under people/static/ (<name>.mp4 + <name>.webm)
                                //   that starts and ends on the photo; a double click / double tap plays it in
                                //   the circle (a click or Esc ends it)
     async build(k) { ...; return { update(t, e, dt) {}, draw2d(q, t, e) {} } }
   }
   Coordinates: world units are the CSS px of a 200 px avatar ("logical px"), origin
   at the avatar centre, y up, z toward the viewer. k.at(u, v, z) converts a pixel of
   the 512 x 512 photo to world. The Team page tiles shrink with the window, and the
   snippet sizes the photo to its tile: the kit shows the whole stage scaled by k.s =
   photo size / 200 (through the camera), so k.D = 200 and k.R = 100 always, and
   k.W / k.H, k.toScreen() and the q5 layer (scaled by k.s around draw2d) are in
   logical px too. k.dpr = canvas px per logical px (for shadowBlur, shader sizes).
   Ink outlines keep their width in real screen px. A stage is built for one tile
   size: a resize or rotation switches the effect off.
   ════════════════════════════════════════════════════════════════════════ */
import * as THREE from 'three';

const KIT_URL = import.meta.url;
export const STATIC = new URL('../static/', KIT_URL).href;
const Q5_URL = 'https://cdn.jsdelivr.net/npm/q5@4.8.3/q5.min.js';
export { THREE };

/* ── small maths ───────────────────────────────────────────────────────── */
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const env = (t, a, b) => clamp((t - a) / (b - a));           // 0..1 progress of t through [a, b]
export const ease = {
  inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outBack: (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};
/** 0 before `t0`, eases in over `dur`, and leaves as the exit `e` runs (staggered by `order` 0..1). */
export function presence(t, e, t0, dur = 0.45, fn = ease.outBack, order = 0) {
  const inn = fn(env(t, t0, t0 + dur));
  const out = 1 - ease.in(clamp(e * 1.6 - order * 0.6));
  return inn * out;
}
/** deterministic pseudo random stream */
export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ── loading ───────────────────────────────────────────────────────────── */
let q5Promise = null;
function loadQ5() {
  if (window.Q5) return Promise.resolve(true);
  if (!q5Promise) {
    q5Promise = new Promise(resolve => {
      const s = document.createElement('script');
      s.src = Q5_URL;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }
  return q5Promise;
}
const texCache = new Map();
export function loadTexture(url, srgb = true) {
  if (!texCache.has(url)) {
    texCache.set(url, new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(url, tex => {
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        resolve(tex);
      }, undefined, (err) => { texCache.delete(url); reject(err); });   // a failed fetch is tried again next time
    }));
  }
  return texCache.get(url);
}

/* ── materials and helpers the scenes share ────────────────────────────── */
let gradient = null;
function toonGradient() {
  if (!gradient) {
    gradient = new THREE.DataTexture(new Uint8Array([90, 170, 235, 255]), 4, 1, THREE.RedFormat);
    gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
    gradient.needsUpdate = true;
  }
  return gradient;
}
/** matte cel-shaded material (3 tones) */
export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });
}
/** a canvas you draw on once, as a texture */
export function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
/** soft round glow sprite (additive) */
export function glowSprite(color = '#ffffff', size = 60, strength = 1) {
  const tex = canvasTexture(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, color);
    gr.addColorStop(0.25, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const m = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: strength });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

/* ── the avatar ────────────────────────────────────────────────────────── */
const INK = 0x16151a;
const Z_BACK = -36;           // depth of the background plate

/** free a stage: meshes, materials, every texture (the cached photo layers too: they keep their
    image and upload again into the next renderer, but must drop this renderer's listeners) and the
    WebGL context, then remove its canvases */
function release({ renderer, scene, canvas, flat, fx }) {
  try {
    fx?.dispose?.();
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach(m => {
        const uniforms = m.uniforms ? Object.values(m.uniforms).map(u => u && u.value) : [];
        for (const v of [...Object.values(m), ...uniforms]) if (v && v.isTexture) v.dispose();
        m.dispose();
      });
    });
    renderer.dispose();
    if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
  } catch (_) {}
  canvas.remove();
  flat?.remove();
}

class Avatar {
  constructor(wrap, mod) {
    this.wrap = wrap;
    this.stage = wrap.querySelector('.pfx-stage');
    this.photo = wrap.querySelector('.pfx-photo');
    this.name = wrap.dataset.fx;
    this.mod = mod;
    this.on = false;
    this.e = 1;                // exit progress: 0 = fully on, 1 = gone
    this.t = 0;
    this.gl = null;
    this.building = null;      // the build under way: one at a time
    this.box = null;           // the viewport and photo box the stage was built for
    this.lastToggle = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.tilt = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    this.onMove = (ev) => {
      if (!this.gl) return;
      const r = this.wrap.getBoundingClientRect();
      const nx = clamp((ev.clientX - (r.left + r.width / 2)) / (r.width * 0.75), -1, 1);
      const ny = clamp((ev.clientY - (r.top + r.height / 2)) / (r.height * 0.75), -1, 1);
      this.tilt.tx = nx; this.tilt.ty = ny;
    };
    this.onLeave = () => { this.tilt.tx = 0; this.tilt.ty = 0; };
    document.addEventListener('pointermove', this.onMove);
    document.addEventListener('pointerleave', this.onLeave);
    wrap.addEventListener('pointerleave', this.onLeave);
    // the stage fits one tile size: a rotation or a window resize switches the effect off
    this.onResize = () => { if (this.gl && this.resized()) this.stop(); };
    window.addEventListener('resize', this.onResize);
    // a short film (scene `film`: a square video under people/static/ that starts and ends on the photo):
    // a double click / double tap plays it in the avatar circle; a click or Esc ends it
    this.film = null;
    this.filmOn = false;
    this.pending = null;       // a first click, waiting to see whether a second one follows
    if (mod.film && !this.reduced) this.makeFilm(mod.film);
  }

  makeFilm(src) {
    const v = this.film = document.createElement('video');
    v.className = 'pfx-film';
    v.muted = v.defaultMuted = true;
    v.playsInline = true;
    for (const a of ['muted', 'playsinline', 'disablepictureinpicture']) v.setAttribute(a, '');
    v.setAttribute('aria-hidden', 'true');
    v.preload = 'auto';
    v.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;border-radius:50%;'
      + 'z-index:3;opacity:0;pointer-events:none;transition:opacity .16s';
    // H.264 for Safari and most browsers, VP9 for the builds without H.264 (open-source Chromium, some Linux)
    for (const [ext, type] of [['mp4', 'video/mp4'], ['webm', 'video/webm']]) {
      const so = document.createElement('source');
      so.src = new URL(`${src}.${ext}`, STATIC).href;
      so.type = type;
      v.appendChild(so);
    }
    // shown once it plays: until then (and after it) the photo underneath is the same picture
    v.addEventListener('playing', () => { if (this.filmOn) { v.style.transition = 'none'; v.style.opacity = '1'; } });
    v.addEventListener('ended', () => this.endFilm(false));
    v.lastElementChild.addEventListener('error', () => this.endFilm(false));     // no source played
    this.stage.appendChild(v);
    this.wrap.style.touchAction = 'manipulation';       // a double tap is ours, not the browser's zoom
    this.onKey = (ev) => { if (this.filmOn && ev.key === 'Escape') this.endFilm(true); };
    document.addEventListener('keydown', this.onKey);
  }

  playFilm() {
    const v = this.film;
    if (this.on || this.gl || this.building) this.stop();     // straight back to the photo: the film starts on it
    this.filmOn = true;
    this.wrap.classList.add('pfx-film-on');
    try { v.currentTime = 0; } catch (_) {}
    const p = v.play();
    if (p && p.catch) p.catch(() => this.endFilm(false));
  }

  /** back to the photo: at the natural end at once (the last frame is the photo), on a skip with a short fade */
  endFilm(fade) {
    const v = this.film;
    if (!v || !this.filmOn) return;
    this.filmOn = false;
    this.wrap.classList.remove('pfx-film-on');
    v.style.transition = fade ? 'opacity .16s' : 'none';
    v.style.opacity = '0';
    v.pause();
  }

  /** the viewport and the photo's layout box, in CSS px. The pasted embed has no doctype, so it runs in
      quirks mode, where the viewport size is on <body>; the hover transform is on the stage, not here.
      The offset is whole px: the canvases then sit on the same sub-pixel phase as the <img> (the phone
      layout centres it at x.5) and snap to device pixels the same way. */
  measure() {
    const vp = document.compatMode === 'BackCompat' ? document.body : document.documentElement;
    const r = this.wrap.getBoundingClientRect();
    return { W: vp.clientWidth || innerWidth, H: vp.clientHeight || innerHeight, ox: Math.round(r.left), oy: Math.round(r.top), D: r.width };
  }

  resized() {
    const a = this.box, b = this.measure();
    return !a || ['W', 'H', 'ox', 'oy', 'D'].some(p => Math.abs(a[p] - b[p]) > 0.5);
  }

  /** straight back to the photo, button state included (context lost, tile resized, build failed) */
  stop() {
    this.on = false;
    this.wrap.classList.remove('pfx-on', 'pfx-loading');
    this.wrap.setAttribute('aria-pressed', 'false');
    this.teardown();
  }

  toggle() {
    if (this.film) {
      // with a film, a click waits a moment: a second one makes it a double click, which plays the film
      if (this.filmOn) { this.endFilm(true); return; }
      if (this.pending) { clearTimeout(this.pending); this.pending = null; this.playFilm(); return; }
      this.pending = setTimeout(() => { this.pending = null; this.flip(); }, 280);
      return;
    }
    this.flip();
  }

  flip() {
    const now = performance.now();
    if (now - this.lastToggle < 380) return;      // a double click counts once
    this.lastToggle = now;
    if (this.on) this.turnOff(); else this.turnOn();
  }

  async turnOn() {
    this.on = true;
    this.wrap.classList.add('pfx-on');
    this.wrap.setAttribute('aria-pressed', 'true');
    if (!this.gl) {
      // a click while a build is loading (on, off, on) only flips this.on: that build reads it when it lands
      if (this.building) { this.wrap.classList.add('pfx-loading'); return; }
      const slow = setTimeout(() => { if (this.on) this.wrap.classList.add('pfx-loading'); }, 150);
      try {
        this.building = this.build();
        await this.building;
      } catch (err) {
        console.warn('avatar effect unavailable:', err);
        this.stop();
        return;
      } finally {
        this.building = null;
        clearTimeout(slow);
        this.wrap.classList.remove('pfx-loading');
      }
      if (!this.on || this.resized()) { this.stop(); return; }   // switched off, or the tile changed, while loading
      this.t = 0;
      this.e = 0;
    }
    if (this.reduced) {
      this.t = this.mod.still ?? 2.4;
      this.e = 0;
      this.render(0);
      return;
    }
    this.loop();
  }

  turnOff() {
    this.on = false;
    this.wrap.classList.remove('pfx-on', 'pfx-loading');
    this.wrap.setAttribute('aria-pressed', 'false');
    if (!this.gl) return;
    if (this.reduced) { this.teardown(); return; }
    this.loop();
  }

  async build() {
    const [photoTex, plateTex, cutTex] = await Promise.all([
      loadTexture(this.photo.currentSrc || this.photo.src),
      loadTexture(`${STATIC}fx/${this.name}-plate.webp`),
      loadTexture(`${STATIC}fx/${this.name}-cut.webp`),
      loadQ5(),
    ]);
    // W, H and the photo box are real CSS px: they place the canvas and the camera. The scene is
    // modelled for a 200 px avatar (D, R and everything in k are logical px) and shown at s.
    const box = this.box = this.measure();
    const { W, H, ox, oy } = box;
    if (!(box.D > 0 && W > 0 && H > 0)) throw new Error('the avatar is not laid out');
    const s = box.D / 200;
    const D = 200, R = 100;
    // canvas px per CSS px: the screen's, 2 at most. When the photo would cover fewer than ~350 of them (a
    // small tile, a pixel ratio of 1) linear sampling aliases next to the browser's own downscale of the
    // <img>: render at twice that and let the browser halve it (a 2 x 2 box filter)
    const dev = Math.min(window.devicePixelRatio || 1, 2);
    const dpr = box.D * dev < 350 ? dev * 2 : dev;
    // the 512 px photo is drawn at 350 - 700 canvas px: plain linear sampling keeps it as crisp as the <img>
    // (mipmaps soften busy detail like foliage, which read as a blur when the effect switched on; they
    // also match the <img> worse than the 2x render on small tiles)
    for (const t of [photoTex, plateTex, cutTex]) {
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'pfx-gl';
    const place = (el) => {
      el.style.cssText = `position:absolute;left:${-ox}px;top:${-oy}px;width:${W}px;height:${H}px;pointer-events:none;opacity:0`;
    };
    place(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    // the browser dropped the context (too many on the page, GPU reset): back to the photo. A stage
    // already released, or one still loading, fires this too and is left alone.
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); if (this.gl?.canvas === canvas) this.stop(); }, { once: true });

    // The camera sits right above the avatar centre (on its axis) and an off-axis view offset slides
    // the frame so the avatar lands where the <img> was (in real px). On-axis, a layer at any depth z
    // scaled by depthScale(z) covers exactly the photo pixels under it; a centred camera would shift it
    // sideways. The camera distance is in logical px (the real-px distance / s), so one logical px covers
    // s real px: the stage looks scaled by s, and view-space depth stays logical for scene shaders.
    const ax = ox + box.D / 2, ay = oy + box.D / 2;                  // avatar centre in canvas px
    const FW = 2 * Math.max(ax, W - ax), FH = 2 * Math.max(ay, H - ay);
    const fov = 24;
    const dist = (FH / 2) / Math.tan(fov * Math.PI / 360) / s;      // logical px
    const camera = new THREE.PerspectiveCamera(fov, FW / FH, 1, dist * 4);
    camera.position.set(0, 0, dist);
    camera.setViewOffset(FW, FH, FW / 2 - ax, FH / 2 - ay, W, H);

    const scene = new THREE.Scene();
    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a4, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-0.8, 1.4, 1.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(1.2, 0.4, -0.6);
    scene.add(rim);

    // photo layers: at rest they composite to exactly the photo
    const disc = new THREE.CircleGeometry(R, 160);
    const depthScale = (z) => (dist - z) / dist;          // keeps a layer at depth z the same size on screen
    const photo = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ map: photoTex, transparent: true, depthWrite: false }));
    photo.position.z = Z_BACK; photo.scale.setScalar(depthScale(Z_BACK)); photo.renderOrder = -20;
    const plate = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, depthWrite: false, opacity: 0 }));
    plate.position.z = Z_BACK; plate.scale.setScalar(depthScale(Z_BACK)); plate.renderOrder = -19;
    const person = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ map: cutTex, transparent: true, depthWrite: false }));
    person.renderOrder = 10;
    // stencil: set pieces made with k.clip() stay inside the circle, even while the stage tilts
    const mask = new THREE.Mesh(new THREE.CircleGeometry(R + 0.5, 160), new THREE.MeshBasicMaterial({
      colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1,
      stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
    }));
    mask.renderOrder = -100;
    root.add(mask, photo, plate, person);

    // q5 comic layer (screen space, over the 3D). q5's graphics mode draws into an OffscreenCanvas,
    // which is copied onto a visible canvas every frame.
    let q = null, flat = null;
    if (window.Q5) {
      try {
        q = new window.Q5('graphics');
        q.createCanvas(W, H, { alpha: true });
        q.pixelDensity(dpr);
        q.noLoop?.();
        flat = document.createElement('canvas');
        flat.width = Math.round(W * dpr); flat.height = Math.round(H * dpr);
        place(flat);
        flat.className = 'pfx-2d';
      } catch (err) { console.warn('q5 layer unavailable:', err); q = null; flat = null; }
    }

    const k = {
      THREE, renderer, scene, camera, root, dist, D, R, INK, Z_BACK,
      s, W: W / s, H: H / s, dpr: dpr * s,                           // logical px (see the header)
      layers: { photo, plate, person, mask },
      t: 0, e: 0,
      clamp, lerp, env, ease, presence, rng, toon, canvasTexture, glowSprite, loadTexture, STATIC,
      /** photo pixel (0..512) -> world; z toward the viewer */
      at(u, v, z = 0) {
        const f = depthScale(z);
        return new THREE.Vector3((u / 512 - 0.5) * D * f, (0.5 - v / 512) * D * f, z);
      },
      /** world -> logical px on the 2D layer (follows the tilt) */
      toScreen(v3) {
        const p = v3.clone().applyMatrix4(root.matrixWorld).project(camera);
        return [(p.x + 1) / 2 * k.W, (1 - p.y) / 2 * k.H];
      },
      /** photo pixel -> logical px on the 2D layer */
      screenAt(u, v, z = 0) { return k.toScreen(k.at(u, v, z)); },
      depthScale,
      /** show an object at `amount` (0..1) of its size; hidden at 0 (so ink outlines leave no specks) */
      show(obj, amount, base = 1) {
        obj.visible = amount > 0.004;
        obj.scale.setScalar(base * Math.max(amount, 0.004));
        return amount;
      },
      /** re-layer part of the real photo (a hand, fingers, a sleeve) in front of props: `points` is a
          polygon in photo px ([[u, v], ...]); at rest it covers exactly the same pixels, so it is
          invisible until a prop passes under it. Put the prop between z = 0 and the patch's z. */
      patch(points, z = 8) {
        const shape = new THREE.Shape(points.map(([u, v]) => new THREE.Vector2((u / 512 - 0.5) * D, (0.5 - v / 512) * D)));
        const geo = new THREE.ShapeGeometry(shape);
        const pos = geo.attributes.position;
        const uv = new Float32Array(pos.count * 2);
        for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / D + 0.5; uv[i * 2 + 1] = pos.getY(i) / D + 0.5; }
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cutTex, transparent: true, depthWrite: false }));
        m.position.z = z;
        m.scale.setScalar(depthScale(z));
        m.renderOrder = 20;
        root.add(m);
        return m;
      },
      /** keep a material inside the avatar circle */
      clip(material) {
        material.stencilWrite = true;
        material.stencilRef = 1;
        material.stencilFunc = THREE.EqualStencilFunc;
        material.stencilZPass = THREE.KeepStencilOp;
        return material;
      },
      /** add an ink outline (inverted hull, constant width in real screen px at every tile size) to a mesh */
      ink(mesh, px = 1.3, color = INK) {
        const m = new THREE.ShaderMaterial({
          uniforms: { uColor: { value: new THREE.Color(color) }, uPx: { value: px * dpr }, uRes: { value: new THREE.Vector2(W * dpr, H * dpr) } },
          vertexShader: `
            uniform float uPx; uniform vec2 uRes;
            void main() {
              vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              vec3 n = normalize(normalMatrix * normal);
              vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
              float l = length(d);
              if (l > 1e-5) clip.xy += d / l * uPx * 2.0 / uRes * clip.w;
              gl_Position = clip;
            }`,
          fragmentShader: `uniform vec3 uColor; void main() { gl_FragColor = vec4(uColor, 1.0); }`,
          side: THREE.BackSide,
        });
        if (mesh.material && mesh.material.stencilWrite) k.clip(m);
        const o = new THREE.Mesh(mesh.geometry, m);
        o.renderOrder = mesh.renderOrder;
        mesh.add(o);
        return o;
      },
      /** a flat image (canvas drawing) on a plane, w x h world px */
      card(w, h, draw, opts = {}) {
        const tex = canvasTexture(Math.round(w * 2 * (opts.res || 1)), Math.round(h * 2 * (opts.res || 1)), draw);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: opts.side ?? THREE.FrontSide, depthWrite: opts.depthWrite ?? true, alphaTest: opts.alphaTest ?? 0.02 });
        return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      },
      q,
    };
    this.k = k;
    let fx;
    try {
      fx = await this.mod.build(k);
      if (renderer.getContext().isContextLost()) throw new Error('WebGL context lost while loading');
    } catch (err) {
      release({ renderer, scene, canvas, flat });          // a failed build must not keep its context
      throw err;
    }
    this.gl = { renderer, scene, camera, root, canvas, q, flat, fx, k, s };
    this.stage.appendChild(canvas);
    if (flat) this.stage.appendChild(flat);
    // first frame = the photo, then swap the <img> for the canvas without a flash
    this.render(0);
    canvas.style.opacity = '1';
    if (flat) flat.style.opacity = '1';
    this.photo.style.visibility = 'hidden';
  }

  render(dt) {
    const { renderer, scene, camera, root, q, flat, fx, k, s } = this.gl;
    // tilt toward the pointer (critically damped spring); phones sway a little on their own, from flat at t = 0
    const tl = this.tilt;
    const idle = matchMedia('(hover: none)').matches;
    const sway = ease.inOut(env(this.t, 0, 1));
    const tx = idle ? Math.sin(this.t * 0.9) * 0.35 * sway : tl.tx;
    const ty = idle ? Math.sin(this.t * 0.7 + 1) * 0.25 * sway : tl.ty;
    const w = 9;
    for (const [p, v, target] of [['x', 'vx', tx * (1 - this.e)], ['y', 'vy', ty * (1 - this.e)]]) {
      const a = w * w * (target - tl[p]) - 2 * w * tl[v];
      tl[v] += a * Math.min(dt, 0.05);
      tl[p] += tl[v] * Math.min(dt, 0.05);
    }
    // the spring lags its target, so the applied tilt also fades with the exit: e = 1 is exactly flat
    const maxTilt = 0.075 * (1 - this.e);      // radians
    root.rotation.set(tl.y * maxTilt, tl.x * maxTilt, 0);
    // photo -> plate behind the person once the effect is under way (needed for the parallax); the photo
    // stays opaque underneath, so the page never shows through the crossfade
    if (this.mod.plate !== false) {
      k.layers.plate.material.opacity = clamp(this.t / 0.35) * (1 - this.e);
      k.layers.photo.material.opacity = 1;
    }
    k.t = this.t; k.e = this.e;
    root.updateMatrixWorld(true);
    fx.update?.(this.t, this.e, dt);
    renderer.render(scene, camera);
    if (q && flat) {
      q.clear();
      const c = q.ctx || q.drawingContext;
      c.save();
      c.scale(s, s);                           // the scene draws in logical px
      fx.draw2d?.(q, this.t, this.e);
      c.restore();
      const g = flat.getContext('2d');
      g.clearRect(0, 0, flat.width, flat.height);
      g.drawImage(q.canvas, 0, 0, flat.width, flat.height);
    }
  }

  loop() {
    if (this.raf) return;
    let last = null;
    const step = (now) => {
      this.raf = null;
      if (!this.gl) return;
      const dt = last === null ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
      last = now;
      const clock = window.__pfxClock;           // tests hold the effect at chosen times
      if (typeof clock === 'function') this.t = clock(); else this.t += dt;
      const exitDur = this.mod.exit ?? 0.45;
      this.e = clamp(this.e + (this.on ? -1 : 1) * dt / exitDur);
      if (typeof window.__pfxExit === 'function') this.e = window.__pfxExit();
      this.render(dt);
      if (!this.on && this.e >= 1) { this.teardown(); return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  teardown() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.photo.style.visibility = '';
    const gl = this.gl;
    this.gl = null;
    this.e = 1;
    this.t = 0;
    Object.assign(this.tilt, { x: 0, y: 0, vx: 0, vy: 0 });      // the next activation starts flat
    if (gl) release(gl);
  }
}

const avatars = new WeakMap();
/** called by the pasted snippet: returns { toggle } */
export async function attach(wrap) {
  if (avatars.has(wrap)) return avatars.get(wrap);
  const p = (async () => {
    const name = wrap.dataset.fx;
    const mod = (await import(new URL(`./${name}.js`, KIT_URL).href)).default;
    const a = new Avatar(wrap, mod);
    return { toggle: () => a.toggle(), avatar: a };
  })();
  avatars.set(wrap, p);
  return p;
}
