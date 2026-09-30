/* Haotian — 叶神 = 雷神 Thor
   Click: the museum turns into a thunderstorm (layered cloud banks with lumpy tops, dark halftone
   undersides and edges that light up with every flash, a storm eye swirling over his head, a rock
   ledge) and the green cap in his lower hand fades away with it (an edited copy of the cut layer:
   his lap and knee in black trousers behind it); a red cape unfurls behind his shoulders and
   billows, pinned by two gold clasps; a winged helmet drops onto his head (worn: the band on his
   hairline) and its wings flare; Mjolnir rises into his empty lower hand (a chunky bevelled steel
   head with gold bands; his real fingers re-layered over the leather handle); a bold forked comic
   bolt (ink outline, cyan body, white core) strikes the hammer with a thunder flash (< 0.1 s) and a
   starburst, the big runes on the hammer glow electric blue, his eyes spark, and a round Norse rune
   seal reading 「叶神」 flips in beside him.
   Loop (3.4 s): the cape billows, the storm eye turns, arcs crackle round the hammer head (his eyes
   flicker with them; every other beat a thinner bolt strikes it again), a distant bolt forks through
   the clouds, the runes pulse (flaring with each crackle), the seal's rune ring turns.
   Exit: everything leaves, the cap comes back with the museum.
   Photo landmarks (512 px): hair u 182-297 (widest v 100-125), top v 76, fringe / hairline v 124-128,
   glasses top v 131, bridge u 252 (face turned a little to our right: nose 252, skull centre ~244) ·
   lenses 230,143 / 273,141 · collar 192-290 v 195-225 · shoulders 132,238 / 305,215 · V sign tips
   343,240 / 383,245 · lower hand 241-317 x 416-481 (index finger 248-306 v 417-442, the others
   v 452-480, the gap between them where the cap's crown sat 276-313 x 440-460), grip centre 292,452 ·
   cap 256-383 x 373-479 (behind it: his lap, left knee 337-381 x 415-488). */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const BEAT = 3.4, LOOP0 = 1.4;
const T_HELM = 0.58, T_HAM = 0.74, T_STRIKE = 0.86;
const INK = '#0a0f24';
const FONT_KAI = "'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif";
const GRIP = [292, 452], TILT = 0.34;          // hammer grip (photo px) and lean of the handle (rad, head up-left)
const SEAL = [405, 138];
const NOCAP = [232, 360, 400, 496];            // photo-px box of haotian-nocap.webp (u0, v0, u1, v1)

/* a comic zigzag between two points (deterministic), photo px */
function zig(x0, y0, x1, y1, n, jag, seed) {
  const r = rng(seed), pts = [[x0, y0]];
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  for (let i = 1; i < n; i++) {
    const f = i / n, off = (i % 2 ? 1 : -1) * jag * (0.45 + 0.55 * r()) * (1 - 0.6 * Math.abs(f - 0.5));
    pts.push([x0 + dx * f + nx * off, y0 + dy * f + ny * off]);
  }
  pts.push([x1, y1]);
  return pts;
}

/* a bolt as a filled comic ribbon: a jagged centre line widened from w0 to w1 with mitred corners
   (sharp zigzag spikes), returned as a polygon */
function ribbon(pts, w0, w1) {
  const n = pts.length, L = [], Rt = [];
  const nrm = (p0, p1) => { const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const nA = i > 0 ? nrm(pts[i - 1], p) : nrm(p, pts[i + 1]);
    const nB = i < n - 1 ? nrm(p, pts[i + 1]) : nA;
    let mx = nA[0] + nB[0], my = nA[1] + nB[1];
    const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const m = Math.min(2.2, 1 / Math.max(0.35, mx * nA[0] + my * nA[1]));
    const w = lerp(w0, w1, i / (n - 1)) / 2 * m;
    L.push([p[0] + mx * w, p[1] + my * w]); Rt.push([p[0] - mx * w, p[1] - my * w]);
  }
  return L.concat(Rt.reverse());
}
/* the three layers of a comic bolt: ink outline, cyan body, white core; `poly(points)` fills one */
function boltLayers(poly, pts, w0, w1, ink = 3) {
  poly(ribbon(pts, w0 + ink, w1 + ink), 0);
  poly(ribbon(pts, w0, w1), 1);
  poly(ribbon(pts, w0 * 0.36, w1 * 0.36), 2);
}
const BOLT_RGB = [[10, 15, 36], [72, 214, 255], [248, 253, 255]];

/* storm sky: layered cloud banks with lumpy tops, dark lumpy undersides with halftone, wisps of scud,
   the rock ledge he crouches on. `lit` draws the same sky as a lightning flash lights it (lighter
   bodies, bright rims along the cloud tops); the shader blends the two. */
function drawStorm(g, lit) {
  let gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, lit ? '#2a3a7c' : '#0c1230'); gr.addColorStop(0.5, lit ? '#3c4f9c' : '#1a2556'); gr.addColorStop(1, lit ? '#2c3a78' : '#141a40');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  // lumps along a cloud edge: mostly small, some medium, a few big heaps that rise higher
  const lumps = (r, x0, x1, scale = 1) => {
    const out = []; let x = x0;
    while (x < x1) {
      const k = r(), rad = (k < 0.55 ? 8 + r() * 9 : k < 0.87 ? 18 + r() * 10 : 30 + r() * 14) * scale;
      out.push([x + rad * 0.8, rad, r()]);
      x += rad * (0.9 + r() * 0.8);
    }
    return out;
  };
  const halftone = (y0, y1, a, rmax) => {
    g.fillStyle = `rgba(4,6,20,${a})`;
    for (let y = y0; y < y1; y += 5) for (let x = ((y / 5) % 2) * 2.5; x < 512; x += 5) {
      g.beginPath(); g.arc(x, y, rmax * clamp(0.25 + (y - y0) / (y1 - y0)), 0, TAU); g.fill();
    }
  };
  // one bank segment x0..x1: a lumpy top whose big heaps tower, a ragged underside, rounded ends;
  // body, dark lumpy underside with halftone, rims (faint on a few heaps, bright when lit)
  const bank = (x0, x1, top, depth, body, under, rim, rimA, seed) => {
    const r = rng(seed);
    const tops = lumps(r, x0, x1).map(([x, rad, j]) => {
      const end = Math.min(1, Math.min(x - x0, x1 - x) / 40);                // lumps sink toward the ends
      return [x, top - rad * 0.45 * end + (j - 0.5) * 12 + (1 - end) * depth * 0.35, rad];
    });
    const bots = lumps(r, x0, x1, 0.5).map(([x, rad, j]) => [x, top + depth + (j - 0.5) * 12, rad]);
    const outline = () => {
      g.beginPath(); g.moveTo(x0, top + depth);
      tops.forEach(([x, y, rad]) => g.arc(x, y, rad, Math.PI, 0, false));
      g.lineTo(x1, top + depth);
      bots.slice().reverse().forEach(([x, y, rad]) => g.arc(x, y, rad, 0, Math.PI, false));
      g.closePath();
    };
    // rim: the silhouette filled up-left of the body, so only the outer edge shows (bright when lit)
    g.save(); g.translate(-1.6, -2.6); g.globalAlpha = lit ? 1 : rimA; outline(); g.fillStyle = rim; g.fill(); g.restore();
    outline(); g.fillStyle = body; g.fill();
    g.save(); outline(); g.clip();
    const r2 = rng(seed + 7);
    const ub = lumps(r2, x0 - 20, x1 + 20, 1.1).map(([x, rad, j]) => [x, top + depth * 0.5 + (j - 0.5) * 16, rad]);
    g.beginPath(); g.moveTo(x0 - 30, top + depth + 40); g.lineTo(x0 - 30, top + depth * 0.5);
    ub.forEach(([x, y, rad]) => g.arc(x, y, rad, Math.PI, 0, false));
    g.lineTo(x1 + 30, top + depth + 40); g.closePath();
    g.fillStyle = under; g.fill();
    halftone(top + depth * 0.3, top + depth + 16, lit ? 0.3 : 0.5, 1.9);
    g.restore();
  };
  // the ceiling: hangs from the top with a lumpy lower edge
  const rc = rng(2);
  const ceil = lumps(rc, -30, 545).map(([x, rad, j]) => [x, 40 + (j - 0.5) * 26 - rad * 0.2, rad]);
  g.beginPath(); g.moveTo(-30, -10);
  ceil.forEach(([x, y, rad]) => g.arc(x, y, rad, Math.PI, 0, true));
  g.lineTo(545, -10); g.closePath();
  g.fillStyle = lit ? '#2f3d82' : '#141b45'; g.fill();
  // back banks (lighter), then the middle ones, staggered with sky between
  bank(-40, 236, 124, 64, lit ? '#5366b8' : '#2b3874', lit ? '#2c3a7e' : '#18204c', '#c6d2ff', 0.18, 11);
  bank(282, 552, 104, 70, lit ? '#5366b8' : '#2b3874', lit ? '#2c3a7e' : '#18204c', '#c6d2ff', 0.18, 5);
  bank(-40, 196, 222, 78, lit ? '#4658a8' : '#222e66', lit ? '#26336f' : '#131a42', '#c6d2ff', 0.14, 23);
  bank(250, 552, 206, 84, lit ? '#4658a8' : '#222e66', lit ? '#26336f' : '#131a42', '#c6d2ff', 0.14, 31);
  // wisps of scud
  g.strokeStyle = lit ? '#23306a' : '#0f153a'; g.lineCap = 'round';
  [[30, 186, 150, 6], [340, 176, 480, 7], [80, 280, 190, 5], [330, 278, 470, 6]].forEach(([x0, y, x1, w]) => {
    g.lineWidth = w; g.beginPath(); g.moveTo(x0, y); g.quadraticCurveTo((x0 + x1) / 2, y - 5, x1, y + 2); g.stroke();
  });
  bank(-40, 552, 304, 110, lit ? '#34448e' : '#1a2352', lit ? '#1e2a60' : '#0f1538', '#aebdff', 0.12, 37);
  // rock ledge he crouches on
  const ledge = [[-4, 430], [60, 418], [150, 426], [240, 410], [322, 398], [384, 388], [430, 400], [470, 392], [516, 404], [516, 516], [-4, 516]];
  g.beginPath(); ledge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = lit ? '#252c56' : '#0f1229'; g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(70,86,150,0.5)';
  for (let y = 400; y < 512; y += 6) for (let x = ((y / 6) % 2) * 3; x < 512; x += 6) { g.beginPath(); g.arc(x, y, 1.6 * (1 - (y - 400) / 140), 0, TAU); g.fill(); }
  g.restore();
  g.strokeStyle = lit ? '#c6d2ff' : '#7d93e0'; g.lineWidth = 3;
  g.beginPath(); ledge.slice(0, 9).forEach(([x, y], i) => (i ? g.lineTo(x, y + 2) : g.moveTo(x, y + 2))); g.stroke();
  g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); ledge.slice(0, 9).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.lineWidth = 2;
  [[396, 392, 408, 430], [408, 430, 400, 470], [452, 396, 470, 440]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
}

/* the storm eye: spiral cloud bands round (cx, cy) on a transparent square, drawn at 2x */
function drawVortex(g, w) {
  const c = w / 2, S = w / 600;
  g.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const r = (58 + i * 44) * S, a0 = i * 1.35 + 0.3, len = 1.25 + (i % 2) * 0.4;
    g.strokeStyle = 'rgba(52,68,138,0.72)'; g.lineWidth = (22 - i * 2) * S;
    g.beginPath(); g.arc(c, c, r, a0, a0 + len); g.stroke();
    g.strokeStyle = 'rgba(150,172,245,0.85)'; g.lineWidth = 2.4 * S;
    g.beginPath(); g.arc(c, c, r + (10 - i) * S, a0 + 0.12, a0 + len - 0.08); g.stroke();
  }
}

/* a bold lightning bolt drawn into a canvas box, for the distant bolts */
function drawBolt(pts, forks) {
  return (g) => {
    const poly = (P, layer) => {
      g.fillStyle = `rgb(${BOLT_RGB[layer].join(',')})`;
      g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    };
    forks.forEach(f => boltLayers(poly, f, 5, 0.6, 3.4));
    boltLayers(poly, pts, 9, 1, 4);
  };
}

export default {
  title: '叶神 Thor',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const own = [];
    const PX = k.D / 512;
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const beatPh = (t) => (t < LOOP0 ? -1 : (t - LOOP0) % BEAT);
    const beatN = (t) => (t < LOOP0 ? -1 : Math.floor((t - LOOP0) / BEAT));
    const plate = k.layers.plate.material, person = k.layers.person.material;
    k.clip(plate); k.clip(k.layers.photo.material);

    /* the green cap in his lower hand goes while the effect is on: haotian-nocap.webp is the cut layer's
       NOCAP box with the cap painted out (his lap and left knee in black trousers behind it, the part of
       the cap above his thigh cleared); the person layer and the fist patch blend to it by uCapMix, fading
       to the untouched cut layer over the last px of the box. uCapMix is 0 at t = 0 and after the exit. */
    const noCap = await k.loadTexture(`${k.STATIC}fx/haotian-nocap.webp`).catch(() => null);   // missing: the cap stays
    if (noCap) {
      noCap.generateMipmaps = false;              // sampled exactly like the cut layer (no seam at the box)
      noCap.minFilter = THREE.LinearFilter;
    }
    const capU = {
      uNoCap: { value: noCap }, uCapMix: { value: 0 },
      uCapBox: { value: new THREE.Vector4(NOCAP[0] / 512, 1 - NOCAP[3] / 512, (NOCAP[2] - NOCAP[0]) / 512, (NOCAP[3] - NOCAP[1]) / 512) },
    };
    const hideCap = (mat) => {
      if (!noCap) return;
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, capU);
        sh.fragmentShader = 'uniform sampler2D uNoCap; uniform float uCapMix; uniform vec4 uCapBox;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          if (uCapMix > 0.0) {
            vec2 q = (vMapUv - uCapBox.xy) / uCapBox.zw;
            vec2 edge = min(q, 1.0 - q) * uCapBox.zw * 512.0;
            float w = uCapMix * clamp((min(edge.x, edge.y) - 1.0) / 5.0, 0.0, 1.0);
            if (w > 0.0) sampledDiffuseColor = mix(sampledDiffuseColor, texture2D(uNoCap, q), w);
          }
          diffuseColor *= sampledDiffuseColor;
          #endif`);
      };
      mat.customProgramCacheKey = () => 'haotian-nocap';
      mat.needsUpdate = true;
    };
    hideCap(person);
    const clipAll = (obj) => obj.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => k.clip(m)));
    const backdropDisc = () => {
      const pad = 2, geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };

    /* ① the storm: sky with a flash uniform, the turning storm eye, two distant bolts */
    const stormMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: k.canvasTexture(512, 512, (g) => drawStorm(g, false)) }, uLit: { value: k.canvasTexture(512, 512, (g) => drawStorm(g, true)) }, uOp: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D uMap, uLit; uniform float uOp, uFlash; varying vec2 vUv;
        void main() {
          vec3 c = mix(texture2D(uMap, vUv).rgb, texture2D(uLit, vUv).rgb, clamp(uFlash * 1.3, 0.0, 1.0));
          gl_FragColor = vec4(c, uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    own.push(stormMat);
    const storm = new THREE.Mesh(backdropDisc(), stormMat);
    storm.position.z = k.Z_BACK + 1;
    storm.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    storm.renderOrder = -18;
    const EYE = [256, 18];
    const vortexMat = k.clip(new THREE.MeshBasicMaterial({ map: k.canvasTexture(1024, 1024, (g, w) => drawVortex(g, w)), transparent: true, opacity: 0, depthWrite: false }));
    const vortex = new THREE.Mesh(new THREE.PlaneGeometry(600 * PX, 600 * PX), vortexMat);
    vortex.position.copy(k.at(EYE[0], EYE[1], k.Z_BACK + 2));
    vortex.scale.setScalar(k.depthScale(k.Z_BACK + 2));
    vortex.renderOrder = -17;
    root.add(storm, vortex);
    // distant bolts: canvas cards behind him (photo-px boxes)
    const farBolts = [
      { box: [20, 0, 170, 220], a: [124, 0], b: [60, 212], fork: [[2, 26, 120], [4, 150, 196]], seed: 11 },
      { box: [404, 186, 512, 340], a: [476, 186], b: [440, 336], fork: [[3, 504, 300]], seed: 23 },
    ].map(({ box, a, b, fork, seed }) => {
      const [u0, v0, u1, v1] = box, w = u1 - u0, h = v1 - v0;
      const main = zig(a[0] - u0, a[1] - v0, b[0] - u0, b[1] - v0, 6, 20, seed);
      const forks = fork.map(([i, fu, fv]) => zig(main[i][0], main[i][1], fu - u0, fv - v0, 3, 10, seed + 1));
      const S = 2;
      const tex = k.canvasTexture(w * S, h * S, (g) => { g.scale(S, S); drawBolt(main, forks)(g); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w * PX, h * PX), k.clip(new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })));
      m.position.copy(k.at((u0 + u1) / 2, (v0 + v1) / 2, -30));
      m.scale.setScalar(k.depthScale(-30));
      m.renderOrder = -16;
      m.visible = false;
      root.add(m);
      return m;
    });

    /* ② the cape: a cloth sheet behind his shoulders (rebuilt each frame), an ink sheet behind it */
    const NA = 18, NB = 14;
    const clothGeo = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((NA + 1) * (NB + 1) * 3), 3));
      const idx = [];
      for (let j = 0; j < NB; j++) for (let i = 0; i < NA; i++) {
        const a = j * (NA + 1) + i, b = a + NA + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
      g.setIndex(idx);
      return g;
    };
    const capeGeo = clothGeo(), capeInkGeo = clothGeo();
    const foldTex = k.canvasTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#d12433'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        const x = (i + 0.5) * w / 9;
        g.fillStyle = '#951424'; g.fillRect(x - 5, 0, 10, h);
        g.fillStyle = '#b01a2b'; g.fillRect(x + 5, 0, 5, h);
        g.fillStyle = '#ee5058'; g.fillRect(x - 12, 0, 3, h);
      }
    });
    const capeUV = new Float32Array((NA + 1) * (NB + 1) * 2);
    for (let j = 0; j <= NB; j++) for (let i = 0; i <= NA; i++) { capeUV[(j * (NA + 1) + i) * 2] = i / NA; capeUV[(j * (NA + 1) + i) * 2 + 1] = 1 - j / NB; }
    capeGeo.setAttribute('uv', new THREE.BufferAttribute(capeUV, 2));
    const cape = new THREE.Mesh(capeGeo, k.clip(k.toon(0xffffff, { map: foldTex, side: THREE.DoubleSide })));
    const capeInk = new THREE.Mesh(capeInkGeo, k.clip(new THREE.MeshBasicMaterial({ color: 0x0a0f24, side: THREE.DoubleSide })));
    cape.frustumCulled = capeInk.frustumCulled = false;
    cape.renderOrder = -5; capeInk.renderOrder = -6;
    root.add(capeInk, cape);
    const bez = (p0, c, p1, a) => [(1 - a) * (1 - a) * p0[0] + 2 * (1 - a) * a * c[0] + a * a * p1[0], (1 - a) * (1 - a) * p0[1] + 2 * (1 - a) * a * c[1] + a * a * p1[1]];
    const TOP = [[146, 236], [228, 180], [304, 214]], BOT = [[-44, 404], [120, 566], [338, 426]];
    const cv = new THREE.Vector3();
    function capeAt(a, b, t, uf, dz, out) {
      const bb = b * uf;
      const [tu, tv] = bez(TOP[0], TOP[1], TOP[2], clamp(a));
      const [bu, bv] = bez(BOT[0], BOT[1], BOT[2], clamp(a));
      let u = lerp(tu, bu, bb), v = lerp(tv, bv, bb);
      // outside the [0, 1] range (the ink sheet's border) keep going along the edge
      if (a < 0) { u += a * 160 * (0.2 + bb); v += a * 30; }
      if (a > 1) { u += (a - 1) * 120 * (0.2 + bb); }
      const side = a < 0.5 ? (0.5 - a) * 2 : 0;
      const wind = Math.sin(t * 2.3 - bb * 4.2 + a * 3) * Math.pow(bb, 1.4);
      u += -26 * bb * bb * side * (1 + 0.25 * Math.sin(t * 1.7 + a * 2)) + 9 * wind;
      v += 6 * Math.pow(bb, 1.4) * Math.sin(t * 2 - a * 5 + bb * 2) - 18 * bb * side * (0.6 + 0.4 * Math.sin(t * 1.3));
      const z = -9 - 5 * bb * (1 - Math.abs(2 * a - 1)) + 3.2 * bb * Math.sin(t * 2.6 - bb * 5 + a * 4) + 3.4 * Math.pow(bb, 0.7) * Math.sin(a * 17 + t * 1.4) + dz;
      return out.copy(k.at(u, v, z));
    }
    function setCape(geo, t, uf, ext, dz) {
      const pos = geo.attributes.position.array;
      for (let j = 0; j <= NB; j++) for (let i = 0; i <= NA; i++) {
        const a = -ext + (1 + 2 * ext) * i / NA, b = (j / NB) * (1 + ext * 1.4);
        capeAt(a, b, t, uf, dz, cv);
        const o = (j * (NA + 1) + i) * 3;
        pos[o] = cv.x; pos[o + 1] = cv.y; pos[o + 2] = cv.z;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
    }
    // gold clasps on the front of his shoulders, with a fold of the cape over each shoulder
    const GOLD = 0xe6b13a;
    const ribbonGeo = (pts, w) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const n = 10, pos = new Float32Array((n + 1) * 6), idx = [];
      const p = new THREE.Vector3(), tg = new THREE.Vector3();
      for (let i = 0; i <= n; i++) {
        curve.getPointAt(i / n, p); curve.getTangentAt(i / n, tg);
        const sx = -tg.y, sy = tg.x, l = Math.hypot(sx, sy) || 1, ww = w * (1 - 0.35 * i / n);
        pos.set([p.x - (sx / l) * ww / 2, p.y - (sy / l) * ww / 2, p.z, p.x + (sx / l) * ww / 2, p.y + (sy / l) * ww / 2, p.z], i * 6);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const clasps = [[[168, 225], [150, 230], [131, 240]], [[294, 214], [304, 216], [312, 224]]].map(([c, m, e]) => {
      const grp = new THREE.Group();
      const home = k.at(c[0], c[1], 5);
      const L = (u, v, z) => { const p = k.at(u, v, z); return new THREE.Vector3(p.x - home.x, p.y - home.y, z - 5); };
      const pts = [L(c[0], c[1], 5), L(m[0], m[1], 4.2), L(e[0], e[1], 3)];
      const fold = new THREE.Mesh(ribbonGeo(pts, 7), k.toon(0xc81f2d, { side: THREE.DoubleSide }));
      const foldInk = new THREE.Mesh(ribbonGeo(pts, 9.2), new THREE.MeshBasicMaterial({ color: 0x0a0f24, side: THREE.DoubleSide }));
      foldInk.position.z = -0.3;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 1.8, 28), k.toon(GOLD));
      disc.rotation.x = Math.PI / 2; disc.position.z = 1.2;
      k.ink(disc, 1.2);
      const boss = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 10), k.toon(0xf6d36a));
      boss.position.z = 2.2; boss.scale.z = 0.6;
      k.ink(boss, 0.8);
      grp.add(foldInk, fold, disc, boss);
      grp.position.copy(home);
      root.add(grp);
      return grp;
    });

    /* ③ the winged helmet: steel dome, gold band with rivets and a crest, white feathered wings */
    const helm = new THREE.Group(), helmSq = new THREE.Group();
    helm.add(helmSq);
    const HR = 20.5;                             // band ~55 photo px round: his skull plus the squashed hair
    const steel = k.toon(0x94a0b6), gold = k.toon(GOLD);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(HR, 36, 18, 0, TAU, 0, Math.PI / 2), steel);
    dome.scale.set(1, 0.84, 0.92);
    k.ink(dome, 1.4);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(HR * 1.02, HR * 1.05, 5, 48, 1, true), gold);
    band.position.y = 1.6;
    band.scale.z = 0.92;
    k.ink(band, 1.3);
    const crest = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.99, 1.1, 8, 40, Math.PI), gold);
    crest.rotation.y = Math.PI / 2;
    crest.scale.set(1, 0.84, 0.92);
    const rivets = [-0.9, -0.45, 0, 0.45, 0.9].map(a => {
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), k.toon(0xfff0b0));
      r.position.set(Math.sin(a) * HR * 1.05, 1.6, Math.cos(a) * HR * 1.05 * 0.92);
      return r;
    });
    const feather = (L, W) => {
      const s = new THREE.Shape();
      s.moveTo(0, -W * 0.35);
      s.bezierCurveTo(L * 0.3, -W * 0.75, L * 0.86, -W * 0.5, L, 0);
      s.bezierCurveTo(L * 0.86, W * 0.55, L * 0.3, W * 0.72, 0, W * 0.35);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 10 });
      g.translate(0, 0, -0.6);
      return g;
    };
    const wings = [-1, 1].map(sx => {
      const wing = new THREE.Group();
      [[76, 21, 6.4, 0xeef2f9], [56, 18, 6, 0xdfe6f2], [36, 15, 5.4, 0xeef2f9], [17, 11.5, 4.8, 0xdfe6f2]].forEach(([deg, L, W, col], i) => {
        const f = new THREE.Mesh(feather(L, W), k.toon(col));
        f.rotation.z = (deg * Math.PI) / 180;
        f.position.z = i * 0.9;
        k.ink(f, 1.1);
        wing.add(f);
      });
      const root2 = new THREE.Group();
      root2.add(wing);
      root2.position.set(sx * HR * 0.9, 5, 3);
      root2.scale.set(sx * 1.3, 1.3, 1.3);
      helmSq.add(root2);
      return wing;
    });
    helmSq.add(dome, band, crest, ...rivets);
    // worn, not perched: the dome base sits on his skull (centre u 243), the band's front edge on his
    // hairline just above the glasses (v ~126), the crest over the bridge of his glasses (his face is
    // turned a little to our right, so the helmet yaws with it); seen a little from above like his head
    const HELM_Z = 24;
    const helmHome = k.at(243.5, 116, HELM_Z);
    helm.position.copy(helmHome);
    helm.rotation.set(0.2, 0.16, 0.02);
    clipAll(helm);                               // it drops in across the rim
    root.add(helm);

    /* ④ Mjolnir: a chunky bevelled steel head (engraved knots, big runes that glow electric blue),
       gold bands, a leather-wrapped handle, a gold pommel */
    const ham = new THREE.Group(), hamSpin = new THREE.Group();
    ham.add(hamSpin);
    const HW = 56, HH = 32, HD = 28, HY = 50, BEV = 3.4;     // head size, head centre above the grip, chamfer
    const hsh = new THREE.Shape();
    hsh.moveTo(-HW / 2 + BEV, -HH / 2 + BEV); hsh.lineTo(HW / 2 - BEV, -HH / 2 + BEV); hsh.lineTo(HW / 2 - BEV, HH / 2 - BEV); hsh.lineTo(-HW / 2 + BEV, HH / 2 - BEV); hsh.closePath();
    const headGeo = new THREE.ExtrudeGeometry(hsh, { depth: HD - 2 * BEV, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 1 });
    headGeo.translate(0, 0, -(HD - 2 * BEV) / 2);
    const head = new THREE.Mesh(headGeo, k.toon(0x5e6c86));       // flat faces: the chamfers catch their own tone
    head.position.y = HY;
    // the ink hull comes from a smooth rounded box of the same size (flat normals would crack it at the corners)
    const hull = new THREE.Mesh(new RoundedBoxGeometry(HW, HH, HD, 2, BEV), new THREE.MeshBasicMaterial({ visible: false }));
    hull.position.y = HY;
    k.ink(hull, 1.8);
    const bands = [-1, 1].map(sx => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(4.2, HH + 1.6, HD + 1.6, 2, 1), k.toon(GOLD));
      b.position.set(sx * (HW / 2 - 7.5), HY, 0);
      k.ink(b, 1.2);
      return b;
    });
    const FW = HW - 2 * BEV, FH = HH - 2 * BEV;                  // the flat front face
    const RUNES = [
      [[0, -30, 0, 30], [0, -20, 20, -4], [20, -4, 0, 12]],                      // thurisaz
      [[18, -30, -6, 0], [-6, 0, 18, 30]],                                        // kenaz
      [[0, -30, 0, 30], [-18, -12, 0, -30], [0, -30, 18, -12]],                  // tiwaz
      [[-10, -30, -10, 30], [-10, -30, 12, -18], [12, -18, -10, -4], [-10, -4, 14, 30]],  // raidho
    ];
    const runePaths = (g, w, h) => {
      const sc = h / 100;
      RUNES.forEach((segs, i) => {
        const cx = w * (0.2 + i * 0.2) + (i > 1 ? w * 0.02 : 0), cy = h / 2;
        segs.forEach(([a1, b1, c1, d1]) => { g.beginPath(); g.moveTo(cx + a1 * sc, cy + b1 * sc); g.lineTo(cx + c1 * sc, cy + d1 * sc); g.stroke(); });
      });
    };
    const faceTex = k.canvasTexture(512, 290, (g, w, h) => {
      // light from the upper left: a lit band at the top, halftone shade toward the lower right
      g.fillStyle = 'rgba(200,215,240,0.28)'; g.fillRect(0, 0, w, h * 0.16);
      g.fillStyle = 'rgba(8,12,30,0.4)';
      for (let y = 6; y < h; y += 12) for (let x = 6 + ((y / 12) % 2) * 6; x < w; x += 12) {
        const f = clamp((x / w) * 0.6 + (y / h) * 0.7 - 0.55);
        if (f > 0) { g.beginPath(); g.arc(x, y, 3.8 * f, 0, TAU); g.fill(); }
      }
      // interlaced knot bands along the top and bottom
      g.strokeStyle = '#1f2638'; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const y of [h * 0.1, h * 0.9]) for (const sgn of [1, -1]) {
        g.beginPath();
        for (let x = w * 0.08; x <= w * 0.92; x += 3) g.lineTo(x, y + sgn * Math.sin((x - w * 0.08) / 16) * h * 0.05);
        g.stroke();
      }
      // the runes cut in (dark grooves with a lit lower edge)
      g.lineWidth = 17; g.strokeStyle = '#141a2a'; runePaths(g, w, h);
      g.save(); g.translate(1.5, 3); g.lineWidth = 5; g.strokeStyle = 'rgba(180,196,225,0.5)'; runePaths(g, w, h); g.restore();
    });
    const runeTex = k.canvasTexture(512, 290, (g, w, h) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.shadowColor = '#2fb8ff'; g.shadowBlur = 22;
      g.strokeStyle = '#2aa8ff'; g.lineWidth = 16; runePaths(g, w, h);
      g.shadowBlur = 8;
      g.strokeStyle = '#7fe6ff'; g.lineWidth = 9; runePaths(g, w, h);
      g.shadowBlur = 0;
      g.strokeStyle = '#ffffff'; g.lineWidth = 3.5; runePaths(g, w, h);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, depthWrite: false }));
    face.position.set(0, HY, HD / 2 + 0.06);
    const glowMat = new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), glowMat);
    glow.position.set(0, HY, HD / 2 + 0.14);
    glow.renderOrder = 12;
    const leather = k.canvasTexture(32, 64, (g, w, h) => {
      g.fillStyle = '#6a3c1c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3a1d0a'; g.lineWidth = 7;
      for (let y = -32; y < h + 32; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 22); g.stroke(); }
      g.strokeStyle = '#9a6634'; g.lineWidth = 3;
      for (let y = -24; y < h + 32; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 22); g.stroke(); }
    });
    leather.wrapS = leather.wrapT = THREE.RepeatWrapping;
    leather.repeat.set(1, 8);
    const HANDLE0 = -17, HANDLE1 = HY - HH / 2;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, HANDLE1 - HANDLE0, 18), k.toon(0xffffff, { map: leather }));
    handle.position.y = (HANDLE0 + HANDLE1) / 2;
    k.ink(handle, 1.2);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 3.6, 18), k.toon(0x5e6c86));
    collar.position.y = HANDLE1 - 1.4;
    k.ink(collar, 1.1);
    const pommel = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 4.2, 4, 20), k.toon(GOLD));
    pommel.position.y = HANDLE0 - 1.4;
    k.ink(pommel, 1.2);
    hamSpin.add(head, hull, ...bands, face, glow, handle, collar, pommel);
    clipAll(ham);                                // it rises in across the rim
    const HAM_Z = 6;
    const hamHome = k.at(GRIP[0], GRIP[1], HAM_Z);
    ham.position.copy(hamHome);
    root.add(ham);
    // his real fingers and knuckles over the handle
    // his real fingers over the handle: traced round the skin only (the gap where the cap's crown sat
    // between his index finger and the others stays open, so the handle shows through it)
    const fist = k.patch([[247.5, 419.1], [254.8, 416.3], [266.9, 417.1], [280.4, 421.4], [293.7, 426.4], [300.6, 429], [305.3, 433.6], [306.2, 438.6], [302.2, 442.8],
      [293.2, 442.9], [283, 441.2], [277.1, 439.4], [275.4, 442], [276.1, 446.2], [280.7, 452.3], [293.6, 457.1], [306.6, 458.8], [312, 457.1], [316.1, 461.2],
      [317, 467], [312.4, 472.7], [300.4, 477.8], [288.5, 480.4], [271.6, 481.2], [262.9, 478.6], [254.4, 474.3], [245.8, 467.5], [240.5, 457], [240.5, 443.2], [243.9, 426.3]], 14);
    hideCap(fist.material);
    fist.visible = false;

    /* ⑤ the rune seal 「叶神」: gold coin, navy face, a turning ring of runes */
    const seal = new THREE.Group(), sealFlip = new THREE.Group();
    seal.add(sealFlip);
    const SR = 19;
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, 2.6, 56), k.toon(0xd9a534));
    coin.rotation.x = Math.PI / 2;
    k.ink(coin, 1.4);
    const sealFace = new THREE.Mesh(new THREE.CircleGeometry(SR * 0.72, 48), new THREE.MeshBasicMaterial({ map: k.canvasTexture(256, 256, (g, w) => {
      const c = w / 2;
      g.fillStyle = '#0f2448'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
      g.fillStyle = 'rgba(103,232,249,0.25)';
      for (let y = 8; y < w; y += 10) for (let x = 8 + ((y / 10) % 2) * 5; x < w; x += 10) { const d = Math.hypot(x - c, y - c) / c; if (d < 1) { g.beginPath(); g.arc(x, y, 2.6 * d * d, 0, TAU); g.fill(); } }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 92px ${FONT_KAI}`;
      g.lineJoin = 'round';
      [['叶', c - 50], ['神', c + 50]].forEach(([ch, y]) => {
        g.strokeStyle = '#67e8f9'; g.lineWidth = 14; g.strokeText(ch, c, y);
        g.strokeStyle = INK; g.lineWidth = 7; g.strokeText(ch, c, y);
        g.fillStyle = '#ffffff'; g.fillText(ch, c, y);
      });
    }) }));
    sealFace.position.z = 1.34;
    const ringTex = k.canvasTexture(512, 512, (g, w) => {
      const c = w / 2, ro = c, ri = c * (SR * 0.72 / SR);
      g.fillStyle = '#0a1830'; g.beginPath(); g.arc(c, c, ro, 0, TAU); g.arc(c, c, ri, 0, TAU, true); g.fill();
      g.strokeStyle = '#f6c64a'; g.lineWidth = 7;
      g.beginPath(); g.arc(c, c, ro - 6, 0, TAU); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.arc(c, c, ri + 4, 0, TAU); g.stroke();
      g.fillStyle = '#f6c64a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = "bold 46px 'Segoe UI Historic', 'Noto Sans Runic', serif";
      const R2 = (ro + ri) / 2;
      const runes = ['ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᛁ', 'ᛏ', 'ᛒ'];
      // draw the runes as strokes too (a missing rune font must not leave boxes): simple staves
      g.strokeStyle = '#f6c64a'; g.lineWidth = 6; g.lineCap = 'round';
      runes.forEach((_, i) => {
        const a = (i / runes.length) * TAU;
        g.save(); g.translate(c + Math.cos(a) * R2, c + Math.sin(a) * R2); g.rotate(a + Math.PI / 2);
        const h = 20;
        g.beginPath(); g.moveTo(0, -h); g.lineTo(0, h);
        if (i % 3 === 0) { g.moveTo(0, -h * 0.6); g.lineTo(h * 0.7, -h * 0.1); g.lineTo(0, h * 0.4); }
        else if (i % 3 === 1) { g.moveTo(0, -h * 0.2); g.lineTo(h * 0.7, -h); g.moveTo(0, -h * 0.2); g.lineTo(-h * 0.7, -h); }
        else { g.moveTo(0, -h); g.lineTo(h * 0.7, -h * 0.4); g.lineTo(0, 0); g.lineTo(h * 0.7, h); }
        g.stroke();
        g.restore();
        g.fillStyle = '#f6c64a';
        const b = a + Math.PI / runes.length;
        g.beginPath(); g.arc(c + Math.cos(b) * R2, c + Math.sin(b) * R2, 4, 0, TAU); g.fill();
      });
    });
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true });
    const ring = new THREE.Mesh(new THREE.RingGeometry(SR * 0.72, SR * 0.98, 64), ringMat);
    ring.position.z = 1.36;
    sealFlip.add(coin, sealFace, ring);
    const sealHome = k.at(SEAL[0], SEAL[1], 4);
    seal.position.copy(sealHome);
    root.add(seal);

    // the strike: a forked bolt from the upper left onto the top of the hammer head (photo px)
    const strike = zig(58, -24, 232, 292, 8, 26, 3);
    const strikeForks = [zig(...strike[2], 14, 118, 3, 12, 8), zig(...strike[4], 64, 226, 3, 12, 13), zig(...strike[5], 128, 300, 3, 10, 17)];
    const HEAD_EDGE = [[-HW / 2, HY + 9], [-HW / 2, HY - 7], [HW / 2, HY + 8], [HW / 2, HY - 8], [-14, HY + HH / 2], [12, HY + HH / 2], [-16, HY - HH / 2], [16, HY - HH / 2]];
    const tint = new THREE.Color();
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    const flashAt = (t) => {
      const ph = beatPh(t);
      let f = hump(t, T_STRIKE, T_STRIKE + 0.02, T_STRIKE + 0.12) + 0.55 * hump(t, T_STRIKE + 0.17, T_STRIKE + 0.2, T_STRIKE + 0.3);
      if (ph >= 0) f = Math.max(f, 0.35 * hump(ph, 1.62, 1.65, 1.8) + 0.25 * hump(ph, 1.86, 1.89, 1.98));
      if (ph >= 0 && beatN(t) % 2 === 1) f = Math.max(f, 0.4 * hump(ph, 0.02, 0.04, 0.16));
      return f;
    };
    // the full-disc flash over him: under 0.1 s (the sky keeps flickering on its own)
    const faceFlashAt = (t) => {
      const ph = beatPh(t);
      let f = hump(t, T_STRIKE, T_STRIKE + 0.012, T_STRIKE + 0.085);
      if (ph >= 0 && beatN(t) % 2 === 1) f = Math.max(f, 0.45 * hump(ph, 0.03, 0.04, 0.09));
      return f;
    };
    const crackleAt = (t) => {
      const ph = beatPh(t);
      let c = t > T_STRIKE ? hump(t, T_STRIKE, T_STRIKE + 0.05, T_STRIKE + 0.5) : 0;
      if (ph >= 0) c = Math.max(c, hump(ph, 0, 0.08, 0.55));
      return c;
    };

    return {
      update(t, e) {
        const ph = beatPh(t), bn = beatN(t);
        const fl = flashAt(t) * (1 - e);
        // storm in; lightning lights the sky and him
        const sk = presence(t, e, 0.02, 0.35, ease.out, 0.7);
        stormMat.uniforms.uOp.value = sk;
        stormMat.uniforms.uFlash.value = fl;
        vortexMat.opacity = presence(t, e, 0.12, 0.5, ease.out, 0.6);
        vortex.rotation.z = -0.9 * (1 - ease.out(env(t, 0.12, 0.9))) - t * 0.09;
        plate.color.setRGB(1 - 0.35 * sk, 1 - 0.3 * sk, 1 - 0.15 * sk);
        const cool = sk * (1 - fl);
        const ff = faceFlashAt(t) * (1 - e);
        person.color.copy(tint.setRGB(1 - 0.1 * cool + 0.3 * ff, 1 - 0.07 * cool + 0.35 * ff, 1 - 0.02 * cool + 0.45 * ff));
        farBolts.forEach((m, i) => {
          const on = ph >= 0 && bn % 2 === i ? Math.max(hump(ph, 1.6, 1.62, 1.76), 0.8 * hump(ph, 1.84, 1.86, 1.96)) : 0;
          m.material.opacity = on * (1 - e);
          m.visible = m.material.opacity > 0.01;
        });

        // cape unfurls down from the shoulders and billows
        const uf = presence(t, e, 0.1, 0.42, (x) => ease.outBack(x, 1.3), 0.35);
        cape.visible = capeInk.visible = uf > 0.01;
        if (cape.visible) {
          const tc = t + 0.6 * (1 - Math.min(1, uf));        // a whip as it opens
          setCape(capeGeo, tc, Math.max(uf, 0.02), 0, 0);
          setCape(capeInkGeo, tc, Math.max(uf, 0.02), 0.012, -0.7);
        }
        clasps.forEach((c, i) => k.show(c, presence(t, e, 0.3 + i * 0.05, 0.3, ease.outBack, 0.35)));

        // helmet drops onto his head and squashes, the wings flare open
        const hin = presence(t, e, 0.3, T_HELM - 0.3, ease.out, 0.3);
        const fall = 1 - ease.in(env(t, 0.3, T_HELM));
        const fly = ease.in(clamp(e * 1.6 - 0.2));
        k.show(helm, Math.min(1, hin * 1.4));
        helm.position.set(helmHome.x, helmHome.y + fall * 42 + fly * 50, helmHome.z);
        const hs = t - T_HELM;
        const sq = hs > 0 ? Math.exp(-hs * 7) * Math.cos(hs * 24) : 0;
        helmSq.scale.set(1 + 0.12 * sq, 1 - 0.2 * sq, 1 + 0.12 * sq);
        const wf = ease.outBack(env(t, T_HELM - 0.06, T_HELM + 0.22), 2.2);
        wings.forEach((w, i) => {
          w.scale.setScalar(Math.max(0.01, wf));
          w.rotation.z = (1 - wf) * -0.8 + 0.05 * Math.sin((t * TAU) / BEAT + i * 0.9) * env(t, 1.2, 1.8);
        });

        // the cap in his hand dissolves with the museum as the storm rolls in (his hand is open for the
        // hammer), and comes back with the museum on the way out
        capU.uCapMix.value = ease.inOut(env(t, 0.08, 0.34)) * (1 - ease.inOut(env(e, 0.4, 0.8)));

        // Mjolnir rises into his grip with a twirl, lands with a thunk
        const hp = presence(t, e, 0.42, T_HAM - 0.42, (x) => ease.outBack(x, 1.5), 0.5);
        const hk = presence(t, e, 0.42, 0.08, ease.out, 0.5);
        k.show(ham, hk);
        fist.visible = ham.visible;
        const rise = 1 - Math.min(1, hp);
        const hl = t - T_HAM;
        const thunk = hl > 0 ? Math.exp(-hl * 9) * Math.sin(hl * 40) : 0;
        ham.position.set(hamHome.x + rise * 10, hamHome.y - rise * 80 - thunk * 1.5 - ease.in(clamp(e * 1.6 - 0.3)) * 70, hamHome.z);
        ham.rotation.z = TILT + rise * 0.6 + thunk * 0.04;
        hamSpin.rotation.y = -0.24 + rise * rise * TAU * 0.75;
        // runes: light on the strike, then a slow pulse that flares with each crackle
        const ga = t > T_STRIKE - 0.01 ? 0.62 + 0.12 * Math.sin((t * TAU) / 1.7) + 0.38 * Math.max(hump(t, T_STRIKE, T_STRIKE + 0.03, T_STRIKE + 0.7), crackleAt(t)) : 0;
        glowMat.opacity = clamp(ga) * (1 - e);

        // the seal flips in after the strike; the rune ring turns
        const sp = presence(t, e, 0.98, 0.34, (x) => ease.outBack(x, 1.8), 0.2);
        k.show(seal, sp);
        sealFlip.rotation.y = (1 - ease.out(env(t, 0.98, 1.32))) * Math.PI * 1.5;
        seal.position.set(sealHome.x, sealHome.y + Math.sin((t * TAU) / BEAT) * 1.2 * env(t, 1.3, 1.8), sealHome.z);
        ring.rotation.z = -t * 0.35;
        ringMat.color.setRGB(1 + fl * 0.6, 1 + fl * 0.6, 1 + fl * 0.6);
      },

      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0) return;
        const c = q.drawingContext;
        q.strokeJoin(q.ROUND); q.strokeCap(q.ROUND);
        const line = (pts) => { q.beginShape(); pts.forEach(([x, y]) => q.vertex(x, y)); q.endShape(); };
        const polyA = (a) => (P, layer) => {
          const col = BOLT_RGB[layer];
          q.noStroke(); q.fill(col[0], col[1], col[2], 255 * a);
          q.beginShape(); P.forEach(([x, y]) => q.vertex(x, y)); q.endShape(q.CLOSE);
        };
        const S = (u, v, z = 0) => k.screenAt(u, v, z);
        const [cx, cy] = S(256, 256);
        const headTop = () => { hamSpin.localToWorld(tmp.set(0, HY + HH / 2, HD * 0.3)); root.worldToLocal(tmp); return k.toScreen(tmp); };
        // a bolt along the photo-px path, its last point pinned to the hammer head, revealed top-down
        const strikeBolt = (reveal, a, sc) => {
          const pts = strike.map(([u, v]) => S(u, v, 8));
          pts[pts.length - 1] = headTop();
          const n = Math.max(2, Math.ceil(reveal * (pts.length - 1)) + 1);
          c.save(); c.beginPath(); c.arc(cx, cy, k.R + 0.5, 0, TAU); c.clip();
          if (reveal >= 1) strikeForks.forEach((f, i) => { if (sc > 0.8 || i === 1) boltLayers(polyA(a), f.map(([u, v]) => S(u, v, 8)), 5.6 * sc, 0.6, 3); });
          boltLayers(polyA(a), pts.slice(0, n), 10 * sc, 6.5 * sc, 3.4);
          c.restore();
        };

        // thunder flash over the whole disc: one short white hit (< 0.1 s)
        const ff = faceFlashAt(t) * fade;
        if (ff > 0.01) {
          c.save(); c.beginPath(); c.arc(cx, cy, k.R + 0.5, 0, TAU); c.clip();
          q.noStroke(); q.fill(236, 248, 255, 150 * ff);
          q.rect(cx - k.R - 2, cy - k.R - 2, k.R * 2 + 4, k.R * 2 + 4);
          c.restore();
        }

        // the entrance strike: races down onto the hammer, flickers, fades by +0.3 s
        if (t > T_STRIKE - 0.035 && t < T_STRIKE + 0.3) {
          const reveal = env(t, T_STRIKE - 0.035, T_STRIKE);
          const a = (t < T_STRIKE + 0.12 ? 1 : t < T_STRIKE + 0.155 ? 0.3 : 1 - env(t, T_STRIKE + 0.2, T_STRIKE + 0.3)) * (1 - clamp(e * 3));
          if (a > 0.01) strikeBolt(reveal, a, 1);
        }
        // on alternate beats a thinner bolt strikes the hammer again
        const bn = beatN(t), ph = beatPh(t);
        if (ph >= 0 && bn % 2 === 1 && ph < 0.22) {
          const a = (ph < 0.1 ? 1 : ph < 0.13 ? 0.3 : 1 - env(ph, 0.13, 0.22)) * (1 - clamp(e * 3));   // gone before the hammer drops
          if (a > 0.01) strikeBolt(env(ph, 0, 0.03), a, 0.62);
        }
        // impact starburst on the hammer head, with speed lines
        const hb = hump(t, T_STRIKE, T_STRIKE + 0.04, T_STRIKE + 0.26) * (1 - clamp(e * 3));
        if (hb > 0.01) {
          const [bx, by] = headTop();
          q.stroke(10, 15, 36, 255 * hb); q.strokeWeight(2); q.fill(255, 250, 205, 255 * hb);
          q.beginShape();
          for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU, r = (i % 2 ? 8 : 20 + (i % 4) * 4) * (0.6 + 0.4 * hb); q.vertex(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.8); }
          q.endShape(q.CLOSE);
          q.noStroke(); q.fill(120, 225, 255, 255 * hb);
          q.beginShape();
          for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU, r = (i % 2 ? 4 : 10 + (i % 4) * 2) * (0.6 + 0.4 * hb); q.vertex(bx + Math.cos(a) * r, by + Math.sin(a) * r * 0.8); }
          q.endShape(q.CLOSE);
          q.stroke(10, 15, 36, 220 * hb); q.strokeWeight(1.6);
          for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.2, r0 = 27 + (1 - hb) * 12; q.line(bx + Math.cos(a) * r0, by + Math.sin(a) * r0 * 0.8, bx + Math.cos(a) * (r0 + 7), by + Math.sin(a) * (r0 + 7) * 0.8); }
        }

        // crackling arcs round the hammer head: short bold forked bolts, re-rolled every 60 ms
        const cr = crackleAt(t) * (1 - clamp(e * 3)) * (ham.visible ? 1 : 0);    // gone before the hammer drops out
        if (cr > 0.02) {
          const R = rng(1000 + Math.floor(t / 0.06));
          const P = polyA(Math.min(1, cr * 1.6));
          HEAD_EDGE.forEach(([x, y]) => {
            if (R() > 0.3 + 0.6 * cr) return;
            hamSpin.localToWorld(tmp.set(x, y, HD / 2 * 0.7)); root.worldToLocal(tmp);
            const out = 1.45 + R() * 0.35;
            hamSpin.localToWorld(tmp2.set(x * out + (R() - 0.5) * 8, HY + (y - HY) * (1.8 + R() * 0.6) + (R() - 0.5) * 8, HD / 2)); root.worldToLocal(tmp2);
            const [ax, ay] = k.toScreen(tmp), [bx, by] = k.toScreen(tmp2);
            const nx = -(by - ay), ny = bx - ax, l = Math.hypot(nx, ny) || 1;
            const pts = [[ax, ay]];
            for (let j = 1; j < 4; j++) { const f = j / 4, o = (j % 2 ? 1 : -1) * (2 + R() * 2.5); pts.push([lerp(ax, bx, f) + nx / l * o, lerp(ay, by, f) + ny / l * o]); }
            pts.push([bx, by]);
            boltLayers(P, pts, 3.6, 0.6, 2.4);
            if (R() < 0.5) {                      // a little fork
              const [fx, fy] = pts[2];
              boltLayers(P, [[fx, fy], [fx + (bx - ax) * 0.3 + ny / l * 3, fy + (by - ay) * 0.3 - nx / l * 3], [fx + (bx - ax) * 0.45 + ny / l * 6, fy + (by - ay) * 0.45 - nx / l * 6]], 2.2, 0.4, 2);
            }
          });
        }

        // electric eyes: a cyan glint in each lens, sparks when the lightning flashes
        const eg = (t > T_STRIKE ? 0.18 : 0) * fade;
        const spark = Math.max(ff, crackleAt(t) * 0.8) * fade;
        if (eg + spark > 0.02) {
          [[230, 144, -1], [273, 142, 1]].forEach(([u, v, sx]) => {
            const [x, y] = S(u, v, 0);
            const a = clamp(eg + spark);
            q.noStroke();
            q.fill(103, 232, 249, 150 * a); q.ellipse(x, y, 5.2, 3);
            q.fill(240, 255, 255, 255 * a); q.ellipse(x, y, 2.2, 1.5);
            if (spark > 0.1) {
              const R = rng(500 + Math.floor(t / 0.05) + sx);
              q.stroke(150, 245, 255, 255 * spark); q.strokeWeight(1.1); q.noFill();
              const x0 = x + sx * 3.8;
              line([[x0, y], [x0 + sx * 2, y - 1.5 - R()], [x0 + sx * 3, y + 0.5], [x0 + sx * 5, y - 1 - R()]]);
            }
          });
        }
      },

      dispose() {
        own.forEach(o => o.dispose?.());
        plate.color.setRGB(1, 1, 1);
        person.color.setRGB(1, 1, 1);
      },
    };
  },
};
