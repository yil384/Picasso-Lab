/* Jixuan — 国画 Chinese ink painting (水墨)
   Click: the white backdrop soaks into warm xuan paper (a round-fan painting with a bamboo rim);
   an ink orchid is painted up the left side stroke by stroke (long leaves crossing, short leaves,
   stem, pale petals, dark heart dots); a swallow glides in over it; a 3D calligraphy brush dips in
   on the right and writes 书法丹青 down a column; a red 笑 seal is pressed under the column.
   Loop (3.2 s): a drop of ink gathers on the brush tip, falls and blooms on the paper; the long
   orchid leaf sways; the swallow flaps once.
   Photo landmarks (512 px): head top v 40 · eyes v 208 · chin v 350 · hair edges u 138 / 376
   (v 150-360) · shoulders from v 400 (u < 119 / > 405) · paper left u < 130, right u > 390. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BEAT = 3.2, T0 = 1.45;            // calm loop starts after the entrance
const ZP = -33;                          // paper depth (just in front of the plate)
const COL_U = 426, COL_V0 = 157, CELL = 46, CHARS = ['书', '法', '丹', '青'];
const SEAL_V = 370, SEAL = 40;
const WRITE0 = 0.5, WD = 0.13;           // writing starts, seconds per character
const REST_U = 474, REST_V = 316, DROP_V = 352;
const KAI = "'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif";

const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/* ── ink strokes (photo px): spine = cubic bezier, width profile by kind ─────────────── */
const W_LEAF = s => Math.pow(Math.sin(Math.PI * Math.min(s * 0.94 + 0.03, 1)), 0.75) * (1 - 0.6 * Math.exp(-Math.pow((s - 0.6) / 0.08, 2))) + 0.08 * (1 - s);
const W_STEM = s => 0.55 + 0.45 * Math.sin(Math.PI * s);
const W_PETAL = s => Math.pow(Math.sin(Math.PI * Math.min(s * 0.9 + 0.08, 1)), 0.55);
const W_DOT = s => Math.pow(Math.sin(Math.PI * Math.min(s * 0.85 + 0.12, 1)), 0.5);
const W_WING = s => Math.pow(1 - s, 0.9) * Math.min(1, 0.35 + s * 4);
const W_BODY = s => Math.pow(Math.sin(Math.PI * (0.18 + 0.8 * s)), 0.6) * (1 - 0.55 * s);
const W_TAIL = s => 0.9 * Math.pow(1 - s, 1.2) + 0.1;

//          r   g   b   a
const TONE = [[24, 22, 19, 240], [52, 49, 44, 225], [92, 88, 80, 200], [100, 94, 84, 185]];
const petal = (cx, cy, deg, len, bend, t0, w = 11) => {
  len *= 1.15;
  const a = deg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  return { w: W_PETAL, width: w, tone: 3, t0, d: 0.07, sway: 3, p: [
    cx + ca * 3, cy + sa * 3,
    cx + ca * len * 0.35 - sa * bend, cy + sa * len * 0.35 + ca * bend,
    cx + ca * len * 0.7 - sa * bend, cy + sa * len * 0.7 + ca * bend,
    cx + ca * len, cy + sa * len] };
};
const dot = (x, y, dx, dy, t0) => ({ w: W_DOT, width: 4.2, tone: 0, t0, d: 0.04, sway: 3, p: [x, y, x + dx * 0.33, y + dy * 0.33, x + dx * 0.66, y + dy * 0.66, x + dx, y + dy] });

const STROKES = [
  // leaves, in painting order: the long first leaf, the crossing leaf ("phoenix eye"), two short ones
  { w: W_LEAF, width: 12, tone: 0, t0: 0.14, d: 0.19, sway: 1, p: [84, 416, 36, 330, 18, 212, 82, 124] },
  { w: W_LEAF, width: 10.5, tone: 0, t0: 0.31, d: 0.16, sway: 2, p: [90, 414, 124, 336, 62, 258, 16, 238] },
  { w: W_LEAF, width: 8.5, tone: 1, t0: 0.45, d: 0.1, sway: 0, p: [80, 420, 58, 404, 40, 384, 30, 354] },
  { w: W_LEAF, width: 8, tone: 0, t0: 0.53, d: 0.1, sway: 0, p: [94, 416, 108, 388, 116, 362, 112, 328] },
  // flower stem
  { w: W_STEM, width: 2.6, tone: 2, t0: 0.61, d: 0.11, sway: 3, p: [88, 410, 102, 330, 78, 252, 100, 192] },
  // blossom A at the stem tip, blossom B half way down
  petal(100, 190, -150, 20, -3, 0.71), petal(100, 190, -105, 22, 2, 0.74), petal(100, 190, -62, 21, 3, 0.77),
  petal(100, 190, -18, 18, 2, 0.8), petal(100, 190, 150, 16, -2, 0.83),
  petal(82, 262, -160, 17, -2, 0.85), petal(82, 262, -115, 19, 2, 0.87), petal(82, 262, -65, 18, 2, 0.89), petal(82, 262, 175, 13, -2, 0.91),
  // heart dots (点心)
  dot(95, 186, 3, 4, 0.95), dot(102, 184, 4, 3, 0.97), dot(99, 194, 4, 1, 0.99),
  dot(78, 258, 3, 4, 1.01), dot(85, 257, 3, 3, 1.03),
];
const SWAY_BASE = [null, [84, 416], [90, 414], [88, 410]];

export default {
  title: 'Chinese ink painting',
  exit: 0.45,
  still: 2.6,
  async build(k) {
    const { root } = k;
    const V = new THREE.Vector3();
    const atInto = (o, u, v, z) => { const s = k.depthScale(z); return o.set((u / 512 - 0.5) * k.D * s, (0.5 - v / 512) * k.D * s, z); };
    const proj = (u, v, z, out) => {
      atInto(V, u, v, z).applyMatrix4(root.matrixWorld).project(k.camera);
      out[0] = (V.x + 1) / 2 * k.W; out[1] = (1 - V.y) / 2 * k.H;
      return out;
    };
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));

    // a backdrop disc 2 px wider than the photo (the stencil trims it to the circle, so no plate
    // pixels leak at the anti-aliased rim); uvs still map 0..1 onto the photo's 512 px
    const backdropDisc = () => {
      const pad = 2, geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };
    // the photo and plate sit deeper than the stencil disc, so off-axis perspective shifts them ~2 px:
    // clip them too, or a sliver of the old background shows at the rim next to the new set
    k.clip(k.layers.plate.material);
    k.clip(k.layers.photo.material);

    // ① xuan paper: a warm round-fan painting that soaks in from behind her
    const paperTex = k.canvasTexture(512, 512, (g) => {
      const R = rng(11);
      const gr = g.createRadialGradient(256, 236, 30, 256, 256, 300);
      gr.addColorStop(0, '#f7efdc'); gr.addColorStop(0.65, '#f0e4c8'); gr.addColorStop(1, '#e2d0aa');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 150; i++) {
        const x = R() * 512, y = R() * 512, r = 14 + R() * 52, dark = R() < 0.55;
        const c = dark ? '172,140,92' : '255,251,238', a = dark ? 0.03 + R() * 0.04 : 0.06 + R() * 0.08;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, `rgba(${c},${a})`); rg.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.lineCap = 'round';
      for (let i = 0; i < 460; i++) {
        const x = R() * 512, y = R() * 512, a = R() * Math.PI * 2, L = 6 + R() * 28, b = (R() - 0.5) * 10, light = R() < 0.4;
        g.strokeStyle = light ? `rgba(255,253,244,${0.3 + R() * 0.35})` : `rgba(148,116,74,${0.06 + R() * 0.1})`;
        g.lineWidth = 0.5 + R() * 0.9;
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a) * L / 2 - Math.sin(a) * b, y + Math.sin(a) * L / 2 + Math.cos(a) * b, x + Math.cos(a) * L, y + Math.sin(a) * L);
        g.stroke();
      }
      // the fan's bamboo rim
      g.strokeStyle = '#8a6440'; g.lineWidth = 8; g.beginPath(); g.arc(256, 256, 253, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(38,24,12,0.9)'; g.lineWidth = 1.8; g.beginPath(); g.arc(256, 256, 248.5, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(138,100,64,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(256, 256, 241, 0, Math.PI * 2); g.stroke();
    });
    const noiseTex = k.canvasTexture(128, 128, (g) => {
      const R = rng(5), img = g.createImageData(128, 128);
      const oct = [[4, 0.5], [8, 0.3], [16, 0.2]].map(([n, w]) => ({ n, w, v: Array.from({ length: (n + 1) * (n + 1) }, R) }));
      const sm = x => x * x * (3 - 2 * x);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        let s = 0;
        for (const o of oct) {
          const fx = x / 128 * o.n, fy = y / 128 * o.n, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy), N = o.n + 1;
          const a = o.v[iy * N + ix], b = o.v[iy * N + ix + 1], c = o.v[(iy + 1) * N + ix], d = o.v[(iy + 1) * N + ix + 1];
          s += o.w * lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
        }
        const i = (y * 128 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(s * 255); img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, false);
    const paperMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: paperTex }, uNoise: { value: noiseTex }, uProg: { value: 0 }, uOp: { value: 0 } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uMap, uNoise; uniform float uProg, uOp; varying vec2 vUv;
        void main() {
          vec3 col = texture2D(uMap, vUv).rgb;
          float n = texture2D(uNoise, vUv).r;
          float d = distance(vUv, vec2(0.5, 0.46)) * 1.3 + (n - 0.5) * 0.4;
          float a = 1.0 - smoothstep(uProg - 0.05, uProg, d);
          float tide = smoothstep(uProg - 0.1, uProg - 0.015, d) * a;     // the wet edge of the soak
          col *= 1.0 - 0.13 * tide;
          gl_FragColor = vec4(col, a * uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const paper = new THREE.Mesh(backdropDisc(), paperMat);
    paper.position.z = ZP - 1;
    paper.scale.setScalar(k.depthScale(ZP - 1));
    paper.renderOrder = -18;
    root.add(paper);

    // ② calligraphy column 书法丹青: R = the glyphs, G = a soft bleed around them; revealed by the brush
    const calTex = k.canvasTexture(96, 384, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 80px ${KAI}`;
      g.globalCompositeOperation = 'lighter';
      g.filter = 'blur(4px)'; g.fillStyle = '#00ff00'; g.strokeStyle = '#00ff00'; g.lineWidth = 7;
      CHARS.forEach((c, i) => { g.fillText(c, 48, 50 + i * 96); g.strokeText(c, 48, 50 + i * 96); });
      g.filter = 'none'; g.fillStyle = '#ff0000';
      CHARS.forEach((c, i) => g.fillText(c, 48, 50 + i * 96));
    }, false);
    const calMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: calTex }, uRev: { value: 0 }, uOp: { value: 0 }, uWet: { value: new THREE.Vector4() }, uInk: { value: new THREE.Color('#17140f') } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uRev, uOp; uniform vec4 uWet; uniform vec3 uInk; varying vec2 vUv;
        void main() {
          vec4 tx = texture2D(uMap, vUv);
          float y = (1.0 - vUv.y) * 4.0, ci = floor(y), ly = fract(y);
          float sweep = ly * 0.82 + vUv.x * 0.18;
          float m = smoothstep(sweep - 0.07, sweep + 0.01, (uRev - ci) * 1.08);
          float wet = ci < 0.5 ? uWet.x : ci < 1.5 ? uWet.y : ci < 2.5 ? uWet.z : uWet.w;
          float a = max(tx.r, tx.g * (0.14 + 0.32 * wet)) * m;
          vec3 col = mix(uInk, vec3(0.2, 0.18, 0.15), (1.0 - tx.r) * 0.7);
          gl_FragColor = vec4(col, a * uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const colW = CELL / 512 * k.D, colH = CELL * 4 / 512 * k.D;
    const column = new THREE.Mesh(new THREE.PlaneGeometry(colW, colH), calMat);
    column.position.copy(k.at(COL_U, COL_V0 + CELL * 2, ZP));
    column.scale.setScalar(k.depthScale(ZP));
    column.renderOrder = -16;
    root.add(column);

    // ③ red seal 笑 (白文: the character is the paper showing through), slightly uneven red
    const sealTex = k.canvasTexture(128, 128, (g) => {
      const R = rng(7);
      g.fillStyle = '#b3261e';
      g.beginPath();
      g.moveTo(9 + R() * 3, 9 + R() * 3); g.lineTo(119 - R() * 3, 10 + R() * 3);
      g.lineTo(118 - R() * 3, 119 - R() * 3); g.lineTo(10 + R() * 3, 118 - R() * 3);
      g.closePath(); g.fill();
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 40; i++) {
        const x = R() * 128, y = R() * 128, r = 8 + R() * 22, lt = R() < 0.5;
        g.fillStyle = lt ? `rgba(226,86,62,${0.08 + R() * 0.14})` : `rgba(110,10,8,${0.06 + R() * 0.12})`;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 92px ${KAI}`;
      g.fillText('笑', 64, 68);
      for (let i = 0; i < 240; i++) {
        g.globalAlpha = 0.25 + R() * 0.75;
        g.beginPath(); g.arc(R() * 128, R() * 128, 0.4 + R() * 1.7, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    });
    const sealMat = k.clip(new THREE.MeshBasicMaterial({ map: sealTex, transparent: true, depthWrite: false, opacity: 0 }));
    const sealS = SEAL / 512 * k.D;
    const seal = new THREE.Mesh(new THREE.PlaneGeometry(sealS, sealS), sealMat);
    const sealHome = k.at(COL_U, SEAL_V, ZP + 0.5);
    seal.position.copy(sealHome);
    seal.renderOrder = -15;
    const sealBase = k.depthScale(ZP + 0.5);
    root.add(seal);

    // ④ the brush: wolf-hair tip (inked below the belly), dark ferrule, bamboo shaft with nodes, cap and cord.
    //    Group origin = the tip; +y runs up the shaft.
    const brush = new THREE.Group();
    const brushFit = new THREE.Group();
    brush.add(brushFit);
    const lathe = (prof, color, seg = 20) => new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg), k.toon(color));
    const cyl = (r0, r1, h, y, color, seg = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), k.toon(color)); m.position.y = y; return m; };
    const tipInk = lathe([[0.01, 0], [0.7, 1.1], [1.55, 3.0], [2.4, 5.4], [2.95, 7.6], [3.05, 8.3]], 0x1a1714);
    const tipHair = lathe([[3.05, 8.28], [2.95, 9.9], [2.6, 11.5], [2.25, 13.0]], 0xeee2c4);
    const ferrule = cyl(2.45, 2.35, 3.4, 14.6, 0x3a2519);
    const shaft = cyl(1.95, 2.05, 30, 31.3, 0xd6ab68, 14);
    const node1 = cyl(2.25, 2.25, 1.0, 25.5, 0xa77a42, 14), node2 = cyl(2.25, 2.25, 1.0, 37.5, 0xa77a42, 14);
    const cap = cyl(2.2, 2.1, 2.6, 47.6, 0x3a2519, 14);
    const cord = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.42, 6, 18), k.toon(0xb3281f));
    cord.position.y = 50.6;
    [tipInk, tipHair, ferrule, shaft, cap].forEach(m => k.ink(m, 1.1));
    k.ink(cord, 0.8);
    brushFit.add(tipInk, tipHair, ferrule, shaft, node1, node2, cap, cord);
    root.add(brush);

    // ink drop that gathers on the tip in the loop
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), k.toon(0x141210));
    k.ink(drop, 0.8);
    root.add(drop);

    // brush path: hover in, dip, write the column (a small scribble per character), lift to rest
    const SCRIB = [[-13, -14], [12, -12], [-2, -2], [-12, 9], [13, 13]];
    const pose = { u: 0, v: 0, z: 0, rz: 0, rx: 0 };
    const cellV = i => COL_V0 + CELL / 2 + i * CELL;
    // while writing it leans toward her (its top stays inside the circle); at rest it leans out to the rim
    const LEAN = 0.28, RX = [0.86, 0.72, 0.62, 0.56], HOVER = [442, 148, 14], REST_RZ = -0.16, REST_RX = 0.5;
    function brushPose(t) {
      const o = pose;
      if (t < 0.38) { o.u = HOVER[0]; o.v = HOVER[1]; o.z = HOVER[2]; o.rz = LEAN + 0.08; o.rx = 0.95; return o; }
      if (t < WRITE0) {
        const f = ease.inOut(env(t, 0.38, WRITE0));
        o.u = lerp(HOVER[0], COL_U + SCRIB[0][0], f); o.v = lerp(HOVER[1], cellV(0) + SCRIB[0][1], f);
        o.z = lerp(HOVER[2], ZP + 1.5, f); o.rz = lerp(LEAN + 0.08, LEAN, f); o.rx = lerp(0.95, RX[0], f);
        return o;
      }
      const tw = (t - WRITE0) / WD;
      if (tw < 4) {
        const ci = Math.floor(tw), f = tw - ci;
        o.rx = RX[ci];
        if (f < 0.84) {
          const s = f / 0.84 * (SCRIB.length - 1), si = Math.min(SCRIB.length - 2, Math.floor(s)), sf = ease.inOut(s - si);
          o.u = COL_U + lerp(SCRIB[si][0], SCRIB[si + 1][0], sf);
          o.v = cellV(ci) + lerp(SCRIB[si][1], SCRIB[si + 1][1], sf);
          o.z = ZP + 1.5;
          o.rz = LEAN + 0.07 * Math.sin(s * 2.1);
        } else {
          const h = (f - 0.84) / 0.16, last = SCRIB[SCRIB.length - 1];
          const nextV = ci < 3 ? cellV(ci + 1) + SCRIB[0][1] : cellV(3) + last[1];
          const nextU = ci < 3 ? COL_U + SCRIB[0][0] : COL_U + last[0];
          o.u = lerp(COL_U + last[0], nextU, ease.inOut(h));
          o.v = lerp(cellV(ci) + last[1], nextV, ease.inOut(h));
          o.z = ZP + 1.5 + 5 * Math.sin(Math.PI * h);
          o.rz = LEAN;
          if (ci < 3) o.rx = lerp(RX[ci], RX[ci + 1], h);
        }
        return o;
      }
      const tl = WRITE0 + 4 * WD;
      const f = ease.inOut(env(t, tl, tl + 0.24));
      const u0 = COL_U + SCRIB[4][0], v0 = cellV(3) + SCRIB[4][1];
      const m = 1 - f;
      o.u = m * m * u0 + 2 * m * f * 476 + f * f * REST_U;
      o.v = m * m * v0 + 2 * m * f * 300 + f * f * REST_V;
      o.z = lerp(ZP + 1.5, -20, f);
      o.rz = lerp(LEAN, REST_RZ, f); o.rx = lerp(RX[3], REST_RX, f);
      return o;
    }

    const beatPh = t => (t < T0 ? -1 : (t - T0) % BEAT);
    const scr = [0, 0], A = [0, 0], B = [0, 0], C = [0, 0];
    const calWet = calMat.uniforms.uWet.value;
    let paintA = 0;

    // ── q5 ink strokes ───────────────────────────────────────────────────────
    const NS = 30;
    const sp = new Float32Array((NS + 1) * 2), nr = new Float32Array((NS + 1) * 2), wd = new Float32Array(NS + 1), P = new Float32Array(8);
    function bez(p, s, i) {
      const m = 1 - s, a = m * m * m, b = 3 * m * m * s, c = 3 * m * s * s, d = s * s * s;
      sp[i] = a * p[0] + b * p[2] + c * p[4] + d * p[6];
      sp[i + 1] = a * p[1] + b * p[3] + c * p[5] + d * p[7];
    }
    function shape(q, p, prog, wfn, W) {
      const n = Math.max(3, Math.ceil(NS * prog));
      for (let i = 0; i <= n; i++) { const s = prog * i / n; bez(p, s, i * 2); wd[i] = W * wfn(s) * 0.5; }
      for (let i = 0; i <= n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n, i + 1);
        const dx = sp[b * 2] - sp[a * 2], dy = sp[b * 2 + 1] - sp[a * 2 + 1], l = Math.hypot(dx, dy) || 1;
        nr[i * 2] = -dy / l; nr[i * 2 + 1] = dx / l;
      }
      q.beginShape();
      for (let i = 0; i <= n; i++) q.vertex(sp[i * 2] + nr[i * 2] * wd[i], sp[i * 2 + 1] + nr[i * 2 + 1] * wd[i]);
      const hw = wd[n], tx = nr[n * 2 + 1], ty = -nr[n * 2];
      if (prog < 0.999 && hw > 0.25) {
        for (let j = 1; j < 6; j++) {
          const a = j / 6 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
          q.vertex(sp[n * 2] + (nr[n * 2] * ca + tx * sa) * hw, sp[n * 2 + 1] + (nr[n * 2 + 1] * ca + ty * sa) * hw);
        }
      }
      for (let i = n; i >= 0; i--) q.vertex(sp[i * 2] - nr[i * 2] * wd[i], sp[i * 2 + 1] - nr[i * 2 + 1] * wd[i]);
      q.endShape(q.CLOSE ?? true);
    }
    function rotInto(src, ang, cx, cy) {
      const c = Math.cos(ang), s = Math.sin(ang);
      for (let i = 0; i < 8; i += 2) {
        const x = src[i] - cx, y = src[i + 1] - cy;
        P[i] = cx + x * c - y * s; P[i + 1] = cy + x * s + y * c;
      }
      return P;
    }
    // wet-ink bleed colours, precomputed per tone (no string building per frame)
    const BLEED = TONE.map(T => Array.from({ length: 17 }, (_, i) => `rgba(${T[0]},${T[1]},${T[2]},${(0.25 + 0.4 * i / 16).toFixed(3)})`));
    const inkStroke = (q, c, p, prog, wfn, W, tone, wet, alpha) => {
      if (prog <= 0.003 || alpha < 0.004) return;
      const T = TONE[tone];
      c.shadowColor = BLEED[tone][Math.round(clamp(wet) * 16)];
      c.shadowBlur = (1.1 + 2.2 * wet) * k.dpr;
      q.fill(T[0], T[1], T[2], T[3] * alpha);
      shape(q, p, prog, wfn, W);
    };

    // swallow (local px, facing +x): body, forked tail, two swept wings
    const BODY = [15, 0, 8, -1, -2, 0, -9, 1], TAIL1 = [-8, 0.5, -14, -1, -20, -3.5, -26, -6], TAIL2 = [-8, 1.5, -14, 3, -20, 5.5, -25, 9];
    const WING = new Float32Array(8);
    function wing(ang, len, bow) {
      const sx = 3, sy = -0.5, ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
      const nx = -Math.sin(ang) * bow, ny = Math.cos(ang) * bow;
      WING[0] = sx; WING[1] = sy;
      WING[2] = lerp(sx, ex, 0.33) + nx; WING[3] = lerp(sy, ey, 0.33) + ny;
      WING[4] = lerp(sx, ex, 0.7) + nx * 0.8; WING[5] = lerp(sy, ey, 0.7) + ny * 0.8;
      WING[6] = ex; WING[7] = ey;
      return WING;
    }
    function bird(q, c, x, y, ang, flap, alpha, wet) {
      q.push();
      q.translate(x, y); q.rotate(ang); q.scale(1.3);
      inkStroke(q, c, wing(-2.5 + 0.8 * flap, 27, -4), 1, W_WING, 6.5, 1, wet, alpha);
      inkStroke(q, c, TAIL1, 1, W_TAIL, 2.4, 0, wet, alpha);
      inkStroke(q, c, TAIL2, 1, W_TAIL, 2.4, 0, wet, alpha);
      inkStroke(q, c, BODY, 1, W_BODY, 10, 0, wet, alpha);
      inkStroke(q, c, wing(2.55 - 0.8 * flap, 28, 4), 1, W_WING, 7, 0, wet, alpha);
      q.pop();
    }
    const BIRD_FROM = [-34, 168], BIRD_CTRL = [30, 70], BIRD_AT = [116, 84];

    return {
      update(t, e) {
        // paper soaks in, then leaves last on the way out
        paperMat.uniforms.uProg.value = 1.02 * ease.out(env(t, 0.04, 0.5));
        paperMat.uniforms.uOp.value = exitF(e, 1);

        // calligraphy follows the brush tip
        const tw = (t - WRITE0) / WD;
        let rev = 0;
        if (tw > 0) { const ci = Math.floor(tw), f = tw - ci; rev = ci >= 4 ? 4 : ci + Math.min(1, f / 0.84); }
        calMat.uniforms.uRev.value = rev;
        calMat.uniforms.uOp.value = exitF(e, 0.55);
        for (let i = 0; i < 4; i++) {
          const done = WRITE0 + (i + 0.84) * WD;
          const w = t < done ? 1 : 1 - ease.out(env(t, done, done + 0.9));
          if (i === 0) calWet.x = w; else if (i === 1) calWet.y = w; else if (i === 2) calWet.z = w; else calWet.w = w;
        }

        // seal: comes down, squashes on contact, settles
        const sp0 = env(t, 1.08, 1.34);
        const out = exitF(e, 0.4);
        let sx = 1, sy = 1;
        if (sp0 < 0.42) { const s = lerp(1.75, 1, ease.in(sp0 / 0.42)); sx = sy = s; }
        else { const f = (sp0 - 0.42) / 0.58, d = Math.sin(f * Math.PI * 2.2) * Math.pow(1 - f, 2) * 0.16; sx = 1 + d; sy = 1 - d; }
        seal.visible = sp0 > 0 && out > 0.004;
        seal.scale.set(sealBase * sx, sealBase * sy, 1);
        seal.rotation.z = -0.05 + (1 - ease.out(sp0)) * 0.25;
        sealMat.opacity = 0.93 * env(t, 1.08, 1.16) * out;

        // brush
        const o = brushPose(t);
        const ph = beatPh(t);
        let bob = 0, tap = 0;
        if (ph >= 0) {
          bob = Math.sin(ph / BEAT * Math.PI * 2) * 1.6 * env(t, T0, T0 + 0.6);
          tap = Math.sin(clamp((ph - 0.36) / 0.16) * Math.PI) * 3;     // a small flick releases the drop
        }
        const inn = ease.outBack(env(t, 0.22, 0.4));
        const bo = exitF(e, 0.15);
        const fly = 1 - bo;
        k.show(brush, inn * bo);
        atInto(brush.position, o.u + fly * 8, o.v + bob + tap - fly * 40, o.z + fly * 20);
        brush.rotation.set(o.rx, 0, o.rz + fly * 0.4 + (ph >= 0 ? Math.sin(ph / BEAT * Math.PI * 2 + 0.6) * 0.03 : 0));

        // drop: gathers on the tip, falls onto the paper (the bloom is painted in q5)
        let dS = 0;
        if (ph >= 0 && e === 0) {
          if (ph < 0.44) {
            dS = 1.25 * ease.out(ph / 0.44);
            atInto(drop.position, o.u, o.v + bob + tap + 1.6 + dS * 0.9, o.z);
          } else if (ph < 0.62) {
            const f = ease.in((ph - 0.44) / 0.18);
            dS = 1.25 * (1 - 0.25 * f);
            atInto(drop.position, o.u, lerp(o.v + bob + 3.3, DROP_V, f), lerp(o.z, ZP + 2, f));
          }
        }
        k.show(drop, dS > 0 ? 1 : 0, dS);
        drop.scale.y = dS * 1.18;
        paintA = exitF(e, 0);
      },

      draw2d(q, t, e) {
        if (paintA <= 0.003 || t < 0.1) return;
        const c = q.drawingContext || q.ctx;
        proj(0, 0, ZP, A); proj(512, 0, ZP, B); proj(0, 512, ZP, C);
        c.save();
        c.transform((B[0] - A[0]) / 512, (B[1] - A[1]) / 512, (C[0] - A[0]) / 512, (C[1] - A[1]) / 512, A[0], A[1]);
        c.beginPath(); c.arc(256, 256, 250, 0, Math.PI * 2); c.clip();
        q.noStroke();

        // sway (loop only)
        const ph = beatPh(t), sw = env(t, T0, T0 + 0.8);
        const swA = ph >= 0 ? Math.sin(ph / BEAT * Math.PI * 2) * sw : 0;
        const ang = [0, 0.035 * swA, 0.02 * Math.sin((ph >= 0 ? ph : 0) / BEAT * Math.PI * 2 - 0.9) * sw, 0.026 * Math.sin((ph >= 0 ? ph : 0) / BEAT * Math.PI * 2 - 0.45) * sw];

        // the orchid, stroke by stroke
        for (const s of STROKES) {
          const prog = ease.inOut(env(t, s.t0, s.t0 + s.d));
          if (prog <= 0) continue;
          const wet = 1 - ease.out(env(t, s.t0 + s.d, s.t0 + s.d + 0.9));
          const base = SWAY_BASE[s.sway];
          const p = base ? rotInto(s.p, ang[s.sway], base[0], base[1]) : s.p;
          inkStroke(q, c, p, prog, s.w, s.width, s.tone, wet, paintA);
        }

        // swallow: flies in over the orchid, then glides; one flap per beat
        const bf = env(t, 0.72, 1.2);
        if (bf > 0) {
          const f = ease.out(bf), m = 1 - f;
          let x = m * m * BIRD_FROM[0] + 2 * m * f * BIRD_CTRL[0] + f * f * BIRD_AT[0];
          let y = m * m * BIRD_FROM[1] + 2 * m * f * BIRD_CTRL[1] + f * f * BIRD_AT[1];
          const dx = 2 * m * (BIRD_CTRL[0] - BIRD_FROM[0]) + 2 * f * (BIRD_AT[0] - BIRD_CTRL[0]);
          const dy = 2 * m * (BIRD_CTRL[1] - BIRD_FROM[1]) + 2 * f * (BIRD_AT[1] - BIRD_CTRL[1]);
          let a = Math.atan2(dy, dx) * (1 - ease.inOut(env(bf, 0.6, 1))) + (-0.12) * ease.inOut(env(bf, 0.6, 1));
          let flap = bf < 1 ? Math.sin(t * 34) * (1 - env(bf, 0.75, 1)) : 0;
          if (ph >= 0) {
            flap += Math.sin(clamp((ph - 1.5) / 0.36) * Math.PI * 2) * 0.8;
            y += Math.sin(ph / BEAT * Math.PI * 2 + 1.2) * 2.4 * sw;
            x += Math.sin(ph / BEAT * Math.PI * 2) * 1.2 * sw;
          }
          const bo = exitF(e, 0.1);
          bird(q, c, x - e * 90, y - e * 40, a, flap, paintA * bo, 1 - ease.out(env(t, 1.2, 1.8)));
        }

        // the ink drop blooms on the paper, then dries away before the next one
        if (ph >= 0.6) {
          const g = ease.out(env(ph, 0.6, 1.25));
          const fade = 1 - ease.inOut(env(ph, 1.6, 3.1));
          const wet = 1 - env(ph, 0.8, 2.0);
          const T = TONE[0], L = TONE[3];
          c.shadowColor = BLEED[0][Math.round(clamp(wet) * 14)];
          c.shadowBlur = (2 + 3 * wet) * k.dpr;
          q.fill(L[0], L[1], L[2], 150 * fade * paintA);
          q.circle(REST_U, DROP_V, 30 * g);
          q.circle(REST_U + 7 * g, DROP_V - 4 * g, 14 * g);
          q.fill(T[0], T[1], T[2], 225 * fade * paintA);
          q.circle(REST_U - 1 * g, DROP_V + 1 * g, 13 * g);
          q.circle(REST_U + 4 * g, DROP_V - 2 * g, 6 * g);
        }
        c.shadowBlur = 0; c.shadowColor = 'rgba(0,0,0,0)';
        c.restore();
      },

      dispose() {
        paperTex.dispose(); noiseTex.dispose(); calTex.dispose();
      },
    };
  },
};
