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
     async build(k) { ...; return { update(t, e, dt) {}, draw2d(q, t, e) {} } }
   }
   Coordinates: world units are CSS px, origin at the avatar centre, y up, z toward
   the viewer. k.at(u, v, z) converts a pixel of the 512 x 512 photo to world.
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
      }, undefined, reject);
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
  }

  toggle() {
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
      const slow = setTimeout(() => this.wrap.classList.add('pfx-loading'), 150);
      try {
        await this.build();
      } catch (err) {
        console.warn('avatar effect unavailable:', err);
        this.teardown();
        this.on = false;
        this.wrap.classList.remove('pfx-on');
        this.wrap.setAttribute('aria-pressed', 'false');
        return;
      } finally {
        clearTimeout(slow);
        this.wrap.classList.remove('pfx-loading');
      }
      if (!this.on) { this.teardown(); return; }   // switched off while loading
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
    this.wrap.classList.remove('pfx-on');
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
    const W = document.documentElement.clientWidth || innerWidth;
    const H = document.documentElement.clientHeight || innerHeight;
    const ox = this.wrap.offsetLeft, oy = this.wrap.offsetTop;      // layout box, not the hover transform
    const D = this.wrap.offsetWidth, R = D / 2;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

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
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); this.on = false; this.teardown(); }, { once: true });

    const fov = 24;
    const dist = (H / 2) / Math.tan(fov * Math.PI / 360);
    const camera = new THREE.PerspectiveCamera(fov, W / H, 1, dist * 4);
    camera.position.set(W / 2 - ox - R, oy + R - H / 2, dist);

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
      THREE, renderer, scene, camera, root, dist, W, H, D, R, dpr, INK, Z_BACK,
      layers: { photo, plate, person, mask },
      t: 0, e: 0,
      clamp, lerp, env, ease, presence, rng, toon, canvasTexture, glowSprite, loadTexture, STATIC,
      /** photo pixel (0..512) -> world; z toward the viewer */
      at(u, v, z = 0) {
        const s = depthScale(z);
        return new THREE.Vector3((u / 512 - 0.5) * D * s, (0.5 - v / 512) * D * s, z);
      },
      /** world -> CSS px on the 2D layer (follows the tilt) */
      toScreen(v3) {
        const p = v3.clone().applyMatrix4(root.matrixWorld).project(camera);
        return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H];
      },
      /** photo pixel -> CSS px on the 2D layer */
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
      /** add an ink outline (inverted hull, constant pixel width) to a mesh */
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
    const fx = await this.mod.build(k);
    this.gl = { renderer, scene, camera, root, canvas, q, flat, fx, k, W, H };
    this.stage.appendChild(canvas);
    if (flat) this.stage.appendChild(flat);
    // first frame = the photo, then swap the <img> for the canvas without a flash
    this.render(0);
    canvas.style.opacity = '1';
    if (flat) flat.style.opacity = '1';
    this.photo.style.visibility = 'hidden';
  }

  render(dt) {
    const { renderer, scene, camera, root, q, flat, fx, k } = this.gl;
    // tilt toward the pointer (critically damped spring); phones sway a little on their own
    const tl = this.tilt;
    const idle = matchMedia('(hover: none)').matches;
    const tx = idle ? Math.sin(this.t * 0.9) * 0.35 : tl.tx;
    const ty = idle ? Math.sin(this.t * 0.7 + 1) * 0.25 : tl.ty;
    const w = 9;
    for (const [p, v, target] of [['x', 'vx', tx * (1 - this.e)], ['y', 'vy', ty * (1 - this.e)]]) {
      const a = w * w * (target - tl[p]) - 2 * w * tl[v];
      tl[v] += a * Math.min(dt, 0.05);
      tl[p] += tl[v] * Math.min(dt, 0.05);
    }
    const maxTilt = 0.075;                     // radians
    root.rotation.set(tl.y * maxTilt, tl.x * maxTilt, 0);
    // photo -> plate behind the person once the effect is under way (needed for the parallax)
    if (this.mod.plate !== false) {
      const s = clamp(this.t / 0.35) * (1 - this.e);
      k.layers.plate.material.opacity = s;
      k.layers.photo.material.opacity = 1 - s * 0.999;
    }
    k.t = this.t; k.e = this.e;
    root.updateMatrixWorld(true);
    fx.update?.(this.t, this.e, dt);
    renderer.render(scene, camera);
    if (q && flat) {
      q.clear();
      const c = q.ctx || q.drawingContext;
      c.save();
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
    if (!gl) return;
    try {
      gl.fx.dispose?.();
      gl.scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        ms.forEach(m => {
          for (const v of Object.values(m)) if (v && v.isTexture && !texCache.has(v.source?.data?.src)) v.dispose?.();
          m.dispose();
        });
      });
      gl.renderer.dispose();
      gl.renderer.forceContextLoss();
    } catch (_) {}
    gl.canvas.remove();
    gl.flat?.remove();
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
