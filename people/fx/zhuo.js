/* Zhuo — CPhO 金牌 (Chinese Physics Olympiad gold; Tsinghua Yao Class; quantum computing systems)
   翻手为云，覆手为雨: click and a gold CPhO medal on a red ribbon drops around his neck and
   swings to rest; a toon-gold CPhO trophy (two handles, a knob stem, a dark plinth with an
   engraved plate) spins up on the rock ledge beside him and lands with a glint; his pointing
   hand turns over (palm up) and a toon storm cloud rises out of it to hang over his arm; the
   hand turns back down and the rain comes straight down from the cloud (comic teardrops of
   mixed size, heavier near the cloud, splash crowns on his arm and ripples on the pond). His
   other fist swings up a big wok of 辣椒炒肉 (Hunan chili pork: glossy green and red chili
   strips, pork slices with a little char, steam) and a 「辣椒炒肉」 tag pops in the steam; an
   atom spins up beside his head (three electron orbits, a Bloch-sphere flicker); last, black
   comic shades drop onto his glasses and glint.
   Loop (3.6 s): hand over -> the cloud swells and darkens -> hand down, a crack of lightning,
   one burst of rain; then he tunnels (量子隧穿): glitch frames, gone for 0.22 s (a faint cyan
   probability cloud of his outline and a ψ where he was; medal, shades, wok and tag go with
   him, the cloud, rain, atom and trophy stay), back with a ripple and a glint of the shades;
   the medal glints; he tosses the wok once (颠勺: the pieces flip up and fall back, a puff of
   steam, the tag again); the atom flickers; the trophy glints.
   Photo landmarks (512 px): fingertip 52,179 · pointing hand u 50..106, v 178..203 (wrist
   104,190) · shoulder 195,215 · head top 263,145 · glasses: lenses u 239..252 and 254..268,
   v 167..178, temple to the ear 288,179 · neck 269,214 (collar v 227) · lower hand 258,433
   (fingers 238..270, 421..449; the wok's grip 257,433) · pond under the cloud v ~392 · rock
   ledge left of him (the trophy's plinth) 66,373. */
import { THREE, presence, env, ease, clamp } from './kit.js';

const GOLD = 0xf0b93a, GOLD_D = 0xcf8f25, RED = 0xc8302a;
const BEAT = 3.6;
const TAU = Math.PI * 2;
const PX = 200 / 512;                       // photo px -> CSS px
const EQS = ['E = ħω', '∇·E = ρ/ε₀', 'ΔxΔp ≥ ħ/2', 'F = ma'];

export default {
  title: 'CPhO gold medal',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const own = [];
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    /** flat ribbon along a curve (for straps): width w, uv.x across, uv.y along */
    const ribbonGeo = (curve, w, n = 14) => {
      const pos = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4), idx = [];
      const p = new THREE.Vector3(), tg = new THREE.Vector3();
      for (let i = 0; i <= n; i++) {
        curve.getPointAt(i / n, p); curve.getTangentAt(i / n, tg);
        const sx = -tg.y, sy = tg.x, l = Math.hypot(sx, sy) || 1;
        pos.set([p.x - (sx / l) * w / 2, p.y - (sy / l) * w / 2, p.z, p.x + (sx / l) * w / 2, p.y + (sy / l) * w / 2, p.z], i * 6);
        uv.set([0, i / n, 1, i / n], i * 4);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    /* ① gold medal on a red ribbon, pivoting at his neck */
    const PIV = [269, 214];
    const L = (u, v) => [(u - PIV[0]) * PX, -(v - PIV[1]) * PX];
    const medal = new THREE.Group();          // shown / dropped
    const swing = new THREE.Group();          // swings about the neck
    medal.add(swing);
    const ribTex = k.canvasTexture(32, 64, (g) => {
      g.fillStyle = '#c8302a'; g.fillRect(0, 0, 32, 64);
      g.fillStyle = '#f2c14e'; g.fillRect(6, 0, 3, 64); g.fillRect(23, 0, 3, 64);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(26, 0, 6, 64);
    });
    const ribMat = k.toon(0xffffff, { map: ribTex, side: THREE.DoubleSide });
    const inkMat = new THREE.MeshBasicMaterial({ color: k.INK, side: THREE.DoubleSide });
    const RING = L(265, 277);
    [[L(252, 211), L(254, 246), RING, -0.6], [L(287, 213), L(282, 246), [RING[0] + 1.2, RING[1]], 0.6]].forEach(([a, b, c, dz]) => {
      const curve = new THREE.CatmullRomCurve3([V(a[0], a[1], -1.5), V(b[0], b[1], 1.2 + dz), V(c[0], c[1], 1.6)]);
      const strap = new THREE.Mesh(ribbonGeo(curve, 4.4), ribMat);
      const edge = new THREE.Mesh(ribbonGeo(curve, 5.8), inkMat);
      edge.position.z = -0.25;
      swing.add(edge, strap);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.55, 8, 18), k.toon(GOLD));
    ring.position.set(RING[0] + 0.6, RING[1] - 0.6, 1.8);
    k.ink(ring, 0.8);
    swing.add(ring);
    const MR = 12;
    const faceTex = k.canvasTexture(256, 256, (g) => {
      const c = 128;
      g.fillStyle = '#e9ad3c'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#f6cc62'; g.beginPath(); g.arc(c, c, 104, 0, TAU); g.fill();
      g.fillStyle = '#fbe08e'; g.beginPath(); g.arc(c - 10, c - 12, 86, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(c, c, 104, 0, TAU); g.clip();
      g.fillStyle = '#e4a53a'; g.beginPath(); g.arc(c + 70, c + 78, 96, 0, TAU); g.fill();
      g.restore();
      // star (embossed)
      const star = (x, y, r, col) => {
        g.fillStyle = col; g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      };
      star(c + 2, 58, 17, '#a8680f'); star(c - 1, 55, 17, '#fff4c4'); star(c, 56, 17, '#e6a531');
      // CPhO lettering (embossed), fitted to the field
      g.font = '900 76px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText('CPhO').width, sx = Math.min(1, 186 / w);
      g.save(); g.translate(c, 136); g.scale(sx, 1);
      g.fillStyle = '#fff4c4'; g.fillText('CPhO', -2, -2);
      g.fillStyle = '#5a320a'; g.fillText('CPhO', 2, 2);
      g.fillStyle = '#6e3f0c'; g.fillText('CPhO', 0, 0);
      g.restore();
      // a small laurel of dots under the lettering
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.3 + 0.4 * i / 6); g.fillStyle = '#c0841f'; g.beginPath(); g.arc(c + Math.cos(a) * 58, c + 26 + Math.sin(a) * 44, 5.5, 0, TAU); g.fill(); }
    });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, 2.2, 48), k.toon(GOLD_D));
    disc.geometry.rotateX(Math.PI / 2);
    k.ink(disc, 1.4);
    const face = new THREE.Mesh(new THREE.CircleGeometry(MR - 0.3, 48), k.toon(0xffffff, { map: faceTex }));
    face.position.z = 1.12;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(MR - 0.4, 0.95, 10, 56), k.toon(GOLD));
    rim.position.z = 1.1;
    k.ink(rim, 0.6);
    const relief = new THREE.Mesh(new THREE.TorusGeometry(MR - 2.6, 0.5, 8, 56), k.toon(GOLD));
    relief.position.z = 1.2;
    const glintMat = new THREE.ShaderMaterial({
      uniforms: { uG: { value: -40 } },
      vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uG; varying vec2 vP;
        void main() { float d = vP.x + 0.7 * vP.y - uG;
          float a = smoothstep(2.6, 0.0, abs(d)) * 0.85 + smoothstep(0.9, 0.0, abs(d - 4.0)) * 0.6;
          gl_FragColor = vec4(1.0, 0.99, 0.9, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    own.push(glintMat);
    const glint = new THREE.Mesh(new THREE.CircleGeometry(MR - 0.2, 48), glintMat);
    glint.position.z = 1.35;
    glint.renderOrder = 12;
    const discG = new THREE.Group();
    discG.add(disc, face, rim, relief, glint);
    discG.position.set(RING[0] + 0.6, RING[1] - 1.6 - MR, 2.2);
    swing.add(discG);
    const medalHome = k.at(PIV[0], PIV[1], 3);
    medal.position.copy(medalHome);
    root.add(medal);
    // his neck and chin back in front of the ribbon straps
    const neck = k.patch([[247, 204], [258, 211], [272, 212], [285, 204], [288, 214], [288, 229], [276, 234], [262, 232], [254, 226], [248, 215]], 7);


    /* ② 翻手为云覆手为雨: his pointing hand, re-layered so it can turn over about the arm's axis;
       a patch of the plate covers the real hand while it turns (hidden at rest, so t = 0 is the photo) */
    const HAND = [[50, 178], [58, 176], [74, 177], [86, 180], [98, 182], [104, 183], [104, 197], [96, 199], [88, 201], [78, 203], [64, 204], [58, 200], [55, 191], [51, 184]];
    const COVER = [[46, 175], [58, 173], [75, 174], [88, 177], [100, 179], [104, 180], [104, 199], [97, 202], [88, 204], [78, 206], [63, 207], [55, 203], [52, 192], [47, 186]];
    const shapeGeo = (pts) => {
      const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2((u / 512 - 0.5) * k.D, (0.5 - v / 512) * k.D))));
      const pos = geo.attributes.position, uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / k.D + 0.5; uv[i * 2 + 1] = pos.getY(i) / k.D + 0.5; }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      return geo;
    };
    const coverMat = new THREE.MeshBasicMaterial({ map: k.layers.plate.material.map, transparent: true, depthWrite: false });
    const cover = new THREE.Mesh(shapeGeo(COVER), coverMat);
    cover.position.z = 1;
    cover.scale.setScalar(k.depthScale(1));
    cover.renderOrder = 15;
    cover.visible = false;
    root.add(cover);
    const hand = k.patch(HAND, 9);
    hand.material.side = THREE.DoubleSide;
    const WRIST = [104, 190], TIP = [52, 179];
    const PV = [(WRIST[0] / 512 - 0.5) * k.D, (0.5 - WRIST[1] / 512) * k.D];
    hand.geometry.translate(-PV[0], -PV[1], 0);
    hand.position.set(PV[0] * k.depthScale(9), PV[1] * k.depthScale(9), 9);
    const AXIS = new THREE.Vector3(TIP[0] - WRIST[0], -(TIP[1] - WRIST[1]), 0).normalize();

    /* ③ the storm cloud over his arm (it rises out of his palm the first time) and the rain curtain under it */
    const cloud = new THREE.Group();
    const cloudFit = new THREE.Group();
    cloud.add(cloudFit);
    const CLOUD_LIGHT = new THREE.Color(0x9fa9d2), CLOUD_DARK = new THREE.Color(0x5c6590);
    const cloudMat = k.clip(k.toon(0x9fa9d2));
    [[-16, -2, 8.5], [-5, 5, 10.5], [9, 5.5, 9.5], [19, -1, 8], [1, -4, 9.5], [-26, -5, 5.5], [27, -5.5, 5.5], [-10, -7, 6.5], [12, -7.5, 6.5]].forEach(([x, y, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), cloudMat);
      m.position.set(x, y, -r * 0.2);
      m.scale.set(1, 0.86, 0.55);
      k.ink(m, 1.4);
      cloudFit.add(m);
    });
    const CLOUD_UV = [134, 104], CLOUD_Z = -6;
    const cloudHome = k.at(CLOUD_UV[0], CLOUD_UV[1], CLOUD_Z);
    const palm = k.at(80, 186, CLOUD_Z);
    cloud.scale.setScalar(0.94);
    root.add(cloud);

    // rain: comic drops falling straight down, drawn by a shader on one plane behind his arm: teardrops
    // (round head below, thin tail above) of varied length, place and spacing in four layers (a main
    // layer, fine drizzle, a few big drops, and extra drops near the cloud). A burst is the drops that
    // left the cloud between RS and RE: at time t they fill the band (t - RE) * SPD .. (t - RS) * SPD
    // below the cloud (uTail .. uHead), so it starts and stops cleanly.
    const RBOX = [80, 128, 190, 392];                     // photo px: left, top (under the cloud), right, the pond
    const RW = (RBOX[2] - RBOX[0]) * PX, RH = (RBOX[3] - RBOX[1]) * PX;
    const SPD = 250;                                      // logical px / s
    const rainMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uHead: { value: -1 }, uTail: { value: -1 }, uSize: { value: new THREE.Vector2(RW, RH) }, uOp: { value: 1 }, uAA: { value: 0.6 / k.dpr } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uT, uHead, uTail, uOp, uAA; uniform vec2 uSize; varying vec2 vUv;
        float h1(float n) { return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
        float h2(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
        // signed distance to a teardrop: tail tip at yy = 0, head (radius rH) centred at yy = len
        float drop(float dx, float yy, float len, float rH, float rT) {
          float dh = length(vec2(dx, yy - len)) - rH;
          float t = clamp(yy / len, 0.0, 1.0);
          float db = yy < 0.0 ? length(vec2(dx, yy)) - rT : (yy > len ? 1e3 : abs(dx) - mix(rT, rH * 0.78, t * t));
          return min(dh, db);
        }
        vec2 layer(vec2 p, float cw, float per, float seed, float l0, float l1, float rH, float rT, float dens, float inkW) {
          float col = floor(p.x / cw);
          float y = p.y - uT * ${SPD.toFixed(1)} + h1(col * 1.7 + seed) * per;
          float row = floor(y / per);
          vec2 id = vec2(col, mod(row, 997.0));
          if (h2(id + seed) > dens) return vec2(0.0);
          float len = mix(l0, l1, h2(id * 1.3 + seed + 5.0));
          float y0 = h2(id + seed + 11.0) * max(per - len - 2.0 * rH - inkW - 1.0, 0.0) + rT + inkW;
          float cx = (col + 0.5) * cw + (h2(id + seed + 23.0) - 0.5) * max(cw - 2.0 * (rH + inkW) - 0.3, 0.0);
          float d = drop(p.x - cx, y - row * per - y0, len, rH, rT);
          return vec2(1.0 - smoothstep(-uAA, uAA, d), 1.0 - smoothstep(inkW - uAA, inkW + uAA, d));
        }
        void main() {
          vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);          // logical px, from the cloud down
          float band = step(uTail, p.y) * step(p.y, uHead);
          if (band < 0.5) discard;
          float side = smoothstep(0.0, 4.0, p.x) * (1.0 - smoothstep(uSize.x - 4.0, uSize.x, p.x));
          float nearCloud = 1.0 - smoothstep(0.08 * uSize.y, 0.42 * uSize.y, p.y);
          vec2 a = layer(p, 7.2, 30.0, 1.0, 7.0, 19.0, 1.5, 0.4, 0.72, 0.85);
          vec2 b = layer(p + vec2(3.1, 0.0), 5.4, 23.0, 7.0, 4.0, 11.0, 1.05, 0.3, 0.42, 0.7) * 0.85;
          vec2 c = layer(p + vec2(1.3, 0.0), 14.0, 52.0, 13.0, 4.0, 8.0, 2.5, 0.7, 0.38, 1.0);
          vec2 d = layer(p + vec2(5.2, 0.0), 6.3, 20.0, 19.0, 6.0, 15.0, 1.25, 0.35, 0.6 * nearCloud, 0.8);
          float ink = max(max(a.y, b.y), max(c.y, d.y)), fill = max(max(a.x, b.x), max(c.x, d.x));
          vec3 col = mix(vec3(0.086, 0.082, 0.1), vec3(0.8, 0.92, 1.0), clamp(fill / max(ink, 1e-3), 0.0, 1.0));
          gl_FragColor = vec4(col, ink * side * uOp);
        }`,
      transparent: true, depthWrite: false,
    }));
    own.push(rainMat);
    const rain = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), rainMat);
    rain.position.copy(k.at((RBOX[0] + RBOX[2]) / 2, (RBOX[1] + RBOX[3]) / 2, -7));
    rain.scale.setScalar(k.depthScale(-7));
    rain.renderOrder = 5;
    root.add(rain);

    /* ④ 辣椒炒肉 in a wok, the hero prop: held by the handle in his real fist (his fingers re-layered over
       the grip), tilted up and toward us so the dish shows: glossy green and red chili strips, pork
       slices with a little char, garlic; steam rises off it, and once per beat he tosses it (颠勺) */
    const wok = new THREE.Group();                 // pivot = the grip in his fist
    const wokFit = new THREE.Group();              // toss (颠勺)
    wok.add(wokFit);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, 15, 12), k.toon(0x4a2a18));
    grip.geometry.rotateZ(Math.PI / 2);
    grip.geometry.translate(3.5, 0, 0);
    k.ink(grip, 1.1);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, 10, 8), k.toon(0x6a6e78));
    rod.geometry.rotateZ(Math.PI / 2);
    rod.geometry.translate(16, 0, 0);
    k.ink(rod, 0.9);
    const WR = 25;                                  // wok radius (logical px)
    const bowlProf = [[0.01, 0], [8, 0.5], [15, 2.2], [20, 4.8], [23.4, 7.8], [WR, 10]].map(([r, y]) => new THREE.Vector2(r, y));
    const bowlG = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProf, 48), k.toon(0x383b43, { side: THREE.DoubleSide }));
    k.ink(bowl, 1.5);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(WR, 1.15, 8, 56), k.toon(0x8a8e98));
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 10;
    k.ink(lip, 1.1);
    const PORK = '#c8825a', PORK_E = '#3e1a0a', FAT = '#f6e2c4', GREEN = '#35a82e', GREEN_E = '#0c360c', RED = '#e3261c', RED_E = '#560b08';
    // the stir-fry, painted big and bold (it is seen at ~30 px on the smallest tile)
    const foodTex = k.canvasTexture(512, 512, (g) => {
      const c = 256;
      g.save(); g.beginPath(); g.arc(c, c, 250, 0, TAU); g.clip();
      g.fillStyle = '#5c2610'; g.fillRect(0, 0, 512, 512);
      g.fillStyle = '#86401a'; g.beginPath(); g.arc(c - 26, c - 34, 205, 0, TAU); g.fill();
      g.lineJoin = 'round'; g.lineCap = 'round';
      const shape = (x, y, a, w, h, fillC, edge, deco) => {
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, TAU);
        g.fillStyle = fillC; g.fill(); g.lineWidth = 8; g.strokeStyle = edge; g.stroke();
        deco(w, h);
        g.restore();
      };
      // pork slices: browned lean, a strip of fat along one edge, char flecks
      const pork = (x, y, a) => shape(x, y, a, 62, 34, PORK, PORK_E, (w, h) => {
        g.save(); g.beginPath(); g.ellipse(0, 0, w - 4, h - 4, 0, 0, TAU); g.clip();
        g.fillStyle = FAT; g.fillRect(-w, -h, 2 * w, h * 0.62);
        g.fillStyle = '#a45a32'; g.beginPath(); g.ellipse(10, h * 0.45, w * 0.55, 7, 0, 0, TAU); g.fill();
        g.fillStyle = '#3a1808';
        [[-w * 0.5, h * 0.3, 5], [w * 0.55, -h * 0.1, 4], [w * 0.1, h * 0.65, 3.5]].forEach(([u, v, r]) => { g.beginPath(); g.arc(u, v, r, 0, TAU); g.fill(); });
        g.restore();
      });
      // green chili strips cut on the bias (the heart of the dish): glossy, a few seeds
      const green = (x, y, a) => shape(x, y, a, 78, 22, GREEN, GREEN_E, (w) => {
        g.strokeStyle = '#b8f58a'; g.lineWidth = 7; g.beginPath(); g.moveTo(-w * 0.6, -9); g.lineTo(w * 0.45, -10); g.stroke();
        g.fillStyle = '#f4f0c2'; [[w * 0.3, 5], [w * 0.05, 7], [-w * 0.2, 6]].forEach(([u, v]) => { g.beginPath(); g.arc(u, v, 4, 0, TAU); g.fill(); });
      });
      const red = (x, y, a) => shape(x, y, a, 54, 17, RED, RED_E, (w) => {
        g.strokeStyle = '#ffa28a'; g.lineWidth = 6; g.beginPath(); g.moveTo(-w * 0.55, -6); g.lineTo(w * 0.4, -7); g.stroke();
      });
      pork(150, 170, 0.4); pork(330, 176, -0.5); pork(250, 342, 0.15); pork(118, 318, -0.9); pork(392, 330, 0.8); pork(256, 236, -0.2);
      green(250, 112, -0.3); green(116, 234, 1.25); green(342, 262, 0.55); green(196, 284, -0.8); green(424, 196, 1.7); green(262, 430, -0.2); green(356, 412, 2.3);
      red(300, 64, 0.9); red(178, 382, -0.6); red(376, 110, 0.2); red(86, 150, 0.35); red(318, 318, -1.1); red(436, 420, 0.6); red(210, 176, 1.4);
      g.fillStyle = '#fff5e4';                          // garlic slices
      [[210, 204], [372, 226], [136, 110], [298, 390], [96, 262]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 13, 9, 0.4, 0, TAU); g.fill(); });
      g.fillStyle = '#2a1206';                          // char
      [[176, 250], [288, 150], [360, 368], [212, 420], [420, 280], [104, 380]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); });
      g.fillStyle = 'rgba(255,255,255,0.75)';           // gloss
      [[160, 132], [300, 160], [226, 300], [368, 352]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 16, 5, -0.5, 0, TAU); g.fill(); });
      g.restore();
    });
    // the heap: a low dome inside the wok
    const FR = WR - 3.2, FY = 7.6;
    const heapGeo = new THREE.CircleGeometry(FR, 48, 0, TAU);
    {
      const p = heapGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getY(i)) / FR; p.setZ(i, 2.6 * (1 - r * r)); }
      heapGeo.computeVertexNormals();
    }
    const food = new THREE.Mesh(heapGeo, k.toon(0xffffff, { map: foodTex }));
    food.rotation.x = -Math.PI / 2;
    food.position.y = FY;
    bowlG.add(bowl, lip, food);
    // pieces in 3D on the heap: they flip up on the toss and fall back
    const porkTex = k.canvasTexture(64, 64, (g) => {
      g.fillStyle = PORK; g.fillRect(0, 0, 64, 64);
      g.fillStyle = FAT; g.fillRect(0, 0, 64, 20);
      g.fillStyle = '#3a1808'; [[18, 44], [46, 38]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); });
    });
    const bits = [];
    [[-10, 3, 'g'], [7, -6, 'r'], [1, 8, 'p'], [-5, -10, 'g'], [12, 5, 'p'], [-14, -3, 'r'], [9, 12, 'g'], [-2, -1, 'p']].forEach(([x, z, kind], i) => {
      let m;
      if (kind === 'p') {
        m = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 1.3, 18), [k.toon(0x8a4a2a), k.toon(0xffffff, { map: porkTex }), k.toon(0x8a4a2a)]);
        m.scale.set(1, 1, 0.62);
      } else {
        m = new THREE.Mesh(new THREE.CapsuleGeometry(kind === 'g' ? 1.75 : 1.45, kind === 'g' ? 6.4 : 4.4, 3, 10), k.toon(kind === 'g' ? 0x35a82e : 0xe3261c));
        m.rotation.z = Math.PI / 2;
      }
      k.ink(m, 0.9);
      const holder = new THREE.Group();
      holder.add(m);
      const r = Math.hypot(x, z) / FR;
      const y0 = FY + 2.6 * (1 - r * r) + 1.2;
      holder.position.set(x, y0, z);
      holder.rotation.y = i * 1.1;
      holder.userData = { x, z, y0, ry: i * 1.1, h: 24 + (i % 3) * 6, flip: (i % 2 ? 1 : -1) * (1 + (i % 3 === 0 ? 1 : 0)), lag: (i % 4) * 0.035 };
      bowlG.add(holder);
      bits.push(holder);
    });
    bowlG.position.x = 20 + WR - 3;
    wokFit.add(grip, rod, bowlG);
    const WOK_TILT = 0.74, WOK_ANG = 0.26;          // the opening toward the viewer; the handle up and to the right
    bowlG.rotation.x = WOK_TILT;
    const GRIP = [257, 433], WOK_Z = 20;
    const wokHome = k.at(GRIP[0], GRIP[1], WOK_Z);
    wok.position.copy(wokHome);
    wok.rotation.z = WOK_ANG;
    root.add(wok);
    const fingers = k.patch([[236, 448], [240, 440], [244, 431], [249, 424], [256, 420], [264, 422], [269, 429], [271, 437], [267, 444], [258, 448], [247, 450]], WOK_Z + 5);

    /* ⑤ an atom beside his head: three electron orbits round a nucleus */
    const atom = new THREE.Group();
    const nucleus = new THREE.Group();
    [[-1.1, 0.8, 0.6, 0xe0503a], [1.2, 0.6, 0.2, 0xd9d2c6], [0.1, -1.1, 0.9, 0xe0503a], [0.3, 0.4, -1.2, 0xd9d2c6]].forEach(([x, y, z, c]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 10), k.toon(c));
      s.position.set(x, y, z);
      k.ink(s, 0.8);
      nucleus.add(s);
    });
    atom.add(nucleus);
    const ORB = 16.5;
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x8ff3ff });
    const electronMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const electrons = [];
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Group();
      frame.rotation.z = (i * Math.PI) / 3 + 0.2;
      const tilt = new THREE.Group();
      tilt.rotation.x = 1.2;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(ORB, 0.45, 6, 72), orbitMat);
      k.ink(torus, 0.9);
      const el = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 8), electronMat);
      k.ink(core, 0.8);
      el.add(core);
      tilt.add(torus, el);
      frame.add(tilt);
      atom.add(frame);
      electrons.push(el);
    }
    const ATOM_UV = [392, 150];
    const atomHome = k.at(ATOM_UV[0], ATOM_UV[1], 4);
    atom.position.copy(atomHome);
    root.add(atom);

    /* ⑥ the CPhO trophy, standing on the rock ledge left of him (under his pointing arm, clear of the
       rain curtain's middle): a toon-gold cup with two handles on a knob stem and a foot, a dark wood
       plinth with an engraved gold plate; a glint band sweeps across the gold */
    const trophyGlint = { value: -99 };
    const glintGold = (color) => {
      const m = k.toon(color);
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTG = trophyGlint;
        sh.vertexShader = 'varying vec3 vTGw;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vTGw = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'uniform float uTG; varying vec3 vTGw;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          { float d = vTGw.x + 0.75 * vTGw.y - uTG;
            gl_FragColor.rgb += vec3(1.0, 0.97, 0.86) * (smoothstep(2.6, 0.0, abs(d)) * 0.85 + smoothstep(0.9, 0.0, abs(d - 4.2)) * 0.6); }`);
      };
      own.push(m);
      return m;
    };
    const tGold = glintGold(0xf4b52e), tGoldD = glintGold(0xd08a1c);
    const trophy = new THREE.Group();              // origin = the middle of the plinth's bottom (on the ledge)
    const trophyTilt = new THREE.Group();           // leans the top toward us so the cup's mouth shows
    const trophySpin = new THREE.Group();           // spins in, then sways a little
    trophy.add(trophyTilt);
    trophyTilt.add(trophySpin);
    trophyTilt.rotation.x = 0.3;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(18, 6.4, 9), k.toon(0x4b2a18));
    plinth.position.y = 3.2;
    k.ink(plinth, 1.3);
    const plateTex = k.canvasTexture(192, 64, (g) => {
      g.fillStyle = '#6a3c0a'; g.fillRect(0, 0, 192, 64);
      g.fillStyle = '#f6cd5c'; g.fillRect(5, 5, 182, 54);
      g.fillStyle = '#fde9a0'; g.fillRect(5, 5, 182, 10);
      g.strokeStyle = '#8a5410'; g.lineWidth = 3; g.strokeRect(13, 12, 166, 40);
      g.font = '900 34px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#fff6cc'; g.fillText('CPhO', 97, 35);
      g.fillStyle = '#5a320a'; g.fillText('CPhO', 96, 33);
    });
    const tPlate = new THREE.Mesh(new THREE.PlaneGeometry(13, 4.3), new THREE.MeshBasicMaterial({ map: plateTex }));
    tPlate.position.set(0, 3.3, 4.56);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 6.4, 2.4, 28), tGoldD);
    foot.position.y = 6.4 + 1.2;
    k.ink(foot, 1.1);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.7, 5, 14), tGoldD);
    stem.position.y = 8.8 + 2.4;
    k.ink(stem, 0.9);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(2.7, 18, 12), tGold);
    knob.scale.set(1, 0.72, 1);
    knob.position.y = 12.4;
    k.ink(knob, 1.0);
    const cupProf = [[0.01, 13.6], [2.4, 14.2], [4.9, 15.8], [7.0, 18.4], [8.5, 21.8], [9.4, 25.6], [9.8, 29.2], [9.9, 31]].map(([r, y]) => new THREE.Vector2(r, y));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProf, 40), tGold);
    k.ink(cup, 1.5);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(9.2, 40), k.toon(0x8a5410));
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.y = 30.4;
    const lipT = new THREE.Mesh(new THREE.TorusGeometry(9.9, 0.95, 8, 44), tGold);
    lipT.rotation.x = Math.PI / 2;
    lipT.position.y = 31;
    k.ink(lipT, 1.0);
    const handles = [1, -1].map((sx) => {
      const arc = Math.PI * 1.12;
      const hm = new THREE.Mesh(new THREE.TorusGeometry(5.1, 1.2, 8, 22, arc), tGold);
      hm.rotation.z = sx > 0 ? -arc / 2 : Math.PI - arc / 2;
      hm.position.set(sx * 8.7, 23.6, 0);
      k.ink(hm, 1.1);
      return hm;
    });
    const starTex = k.canvasTexture(64, 64, (g) => {
      g.fillStyle = '#e39a22'; g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.fill();
      g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(32, 32, 26, 0, TAU); g.fill();
      const st = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
      st(33.5, 34.5, 19, '#7a4608'); st(32, 33, 19, '#b8700f');
    });
    const emblem = new THREE.Mesh(new THREE.CircleGeometry(3.9, 28), new THREE.MeshBasicMaterial({ map: starTex, transparent: true }));
    emblem.position.set(0, 23.2, 9.05);
    emblem.rotation.x = -0.12;
    trophySpin.add(plinth, tPlate, foot, stem, knob, cup, mouth, lipT, ...handles, emblem);
    // a fixed white highlight streak down the cup's lit side (it stays put while the cup sways)
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 8.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false }));
    streak.position.set(-5.3, 24, 9.6);
    streak.rotation.z = 0.12;
    streak.renderOrder = 3;
    const streak2 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.4), streak.material);
    streak2.position.set(-3.3, 19.6, 9.9);
    streak2.rotation.z = 0.3;
    streak2.renderOrder = 3;
    trophyTilt.add(streak, streak2);
    const shadowT = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: 0x0c0a08, transparent: true, opacity: 0.4, depthWrite: false }));
    shadowT.scale.set(13, 2.6, 1);
    shadowT.position.set(1.5, 0.2, -3);
    trophy.add(shadowT);
    const TROPHY_UV = [66, 373], TROPHY_Z = -4;       // in front of the rain curtain (z = -7)
    const trophyHome = k.at(TROPHY_UV[0], TROPHY_UV[1], TROPHY_Z);
    trophy.position.copy(trophyHome);
    root.add(trophy);

    /* ⑦ quantum tunnelling: once per beat he flickers out (the whole cut-out person, and everything he
       wears or holds) and back. The person layer is swapped for this copy of it while it happens: glitch
       frames (sideways-shifted scanline slices, an RGB split), then a faint probability cloud where he
       was (a cyan outline of his silhouette over halftone dots), then he pops back */
    const ghostMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: k.layers.person.material.map }, uBody: { value: 1 }, uGlitch: { value: 0 }, uGhost: { value: 0 }, uEdge: { value: 0 }, uRip: { value: 0 }, uSeed: { value: 1 }, uT: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D uMap; uniform float uBody, uGlitch, uGhost, uEdge, uRip, uSeed, uT; varying vec2 vUv;
        float h(float n) { return fract(sin(n * 91.7 + uSeed * 17.3) * 43758.5453); }
        void main() {
          vec2 uv = vUv;
          vec4 c0 = texture2D(uMap, uv);
          vec4 B = vec4(0.0);
          if (uBody > 0.0) {
            // slices of ~5 photo px, a third of them shifted sideways; an RGB split; scan lines
            float band = floor(uv.y * 96.0);
            float sh = (h(band) - 0.5) * 2.0 * step(0.62, h(band + 3.1)) * uGlitch * 0.055;
            sh += sin(uv.y * 64.0 - uT * 48.0) * uRip * 0.008;          // the wave-function ripple as he lands back
            vec2 q = vec2(uv.x + sh, uv.y);
            float ca = uGlitch * 0.011;
            vec4 c = texture2D(uMap, q), cr = texture2D(uMap, q + vec2(ca, 0.0)), cb = texture2D(uMap, q - vec2(ca, 0.0));
            vec3 col = vec3(cr.r, c.g, cb.b);
            float a = max(c.a, max(cr.a, cb.a) * uGlitch);
            float sl = step(0.5, fract(uv.y * 128.0));
            col = mix(col, col * vec3(0.55, 1.05, 1.2) + vec3(0.0, 0.04, 0.06), uGlitch * sl * 0.6);
            B = vec4(col, a * uBody);
          }
          vec4 G = vec4(0.0);
          if (uGhost > 0.0 || uEdge > 0.0) {
            // the probability cloud: his outline in cyan (ink round it) over halftone dots
            float mx = 0.0, mn = 1.0, mo = 0.0;
            for (int i = 0; i < 8; i++) {
              float an = float(i) * 0.785398;
              vec2 dv = vec2(cos(an), sin(an));
              float s = texture2D(uMap, uv + dv * 0.0058).a;
              mx = max(mx, s); mn = min(mn, s);
              mo = max(mo, texture2D(uMap, uv + dv * 0.0115).a);
            }
            float edge = smoothstep(0.2, 0.55, mx - mn);
            float halo = smoothstep(0.1, 0.5, mo) * (1.0 - smoothstep(0.3, 0.7, c0.a));
            vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * (uv * 200.0);
            vec2 id = floor(g / 4.2);
            vec2 cell = fract(g / 4.2) - 0.5;
            float r = 0.34 * c0.a * (0.55 + 0.45 * h(id.x * 3.7 + id.y * 11.3 + floor(uT * 24.0)));
            float dots = 1.0 - smoothstep(r - 0.07, r + 0.07, length(cell));
            float wave = 0.5 + 0.5 * sin(uv.y * 90.0 - uT * 30.0);
            vec3 cyan = vec3(0.3, 0.9, 1.0);
            float ca = max(edge * 0.82, dots * 0.42 * (0.6 + 0.4 * wave) * c0.a) * uGhost + edge * 0.9 * uEdge;
            float ha = halo * 0.42 * max(uGhost, uEdge);
            vec3 col = mix(vec3(0.0086, 0.0080, 0.011), cyan, ca / max(ca + ha * (1.0 - edge), 1e-3));
            G = vec4(col, clamp(max(ca, ha), 0.0, 1.0));
          }
          float oa = G.a + B.a * (1.0 - G.a);
          gl_FragColor = vec4((G.rgb * G.a + B.rgb * B.a * (1.0 - G.a)) / max(oa, 1e-4), oa);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    });
    own.push(ghostMat);
    const ghost = new THREE.Mesh(k.layers.person.geometry, ghostMat);
    ghost.renderOrder = 10;
    ghost.visible = false;
    root.add(ghost);

    const tint = new THREE.Color();
    const tmp = new THREE.Vector3();
    const T0 = 0.28;                                     // the first turn of the hand = beat 0
    const beatPh = (t) => (t < T0 ? -1 : (t - T0) % BEAT);
    const beatIdx = (t) => Math.floor((t - T0) / BEAT);
    // the beat: 0-0.24 hand over (翻手) and the cloud swells; 0.5-0.72 hand back (覆手) + lightning;
    // rain leaves the cloud from RS to RE (it lands RH / SPD later); medal glint; wok toss; atom flicker
    const RS = 0.62, RE = 1.08, TOSS = 2.3, BLOCH = 2.95;
    const flipAngle = (t) => {
      const p = beatPh(t);
      if (p < 0) return 0;
      if (p < 0.24) return Math.PI * ease.inOut(p / 0.24);
      if (p < 0.5) return Math.PI;
      if (p < 0.72) return Math.PI * (1 + ease.inOut((p - 0.5) / 0.22));
      return 0;
    };
    // quantum tunnelling, once per beat after the rain (BLINK .. BLINK + 0.56 s): glitch frame, gone,
    // glitch frame, gone (the probability cloud) for 0.22 s, glitch frame, back with a ripple. Never
    // during the exit (he is simply there again), so e = 1 is the photo.
    const BLINK = 1.5;
    const blinkAt = (t, e) => {
      const ph = beatPh(t);
      if (ph < 0 || e > 0) return null;
      const b = ph - BLINK;
      if (b < 0 || b >= 0.56) return null;
      if (b < 0.05) return { b, body: 1, glitch: 1, seed: 1, jx: 1.8, props: true };
      if (b < 0.09) return { b, body: 0, ghost: 0.5, seed: 1, jx: 0, props: false };
      if (b < 0.14) return { b, body: 0.75, glitch: 1.2, seed: 2, jx: -2.4, props: true };
      if (b < 0.36) return { b, body: 0, ghost: Math.min(1, 0.55 + (b - 0.14) * 8) * (1 - 0.45 * env(b, 0.3, 0.36)), seed: 3, jx: 0, props: false };
      if (b < 0.41) return { b, body: 1, glitch: 0.8, seed: 4, jx: 1.4, props: true };
      return { b, body: 1, glitch: 0, seed: 5, jx: 0, props: true, back: (b - 0.41) / 0.15 };
    };
    // the trophy pops up on the ledge early in the entrance; the shades drop onto his eyes last
    const TR0 = 0.2, SH0 = 1.08;

    return {
      update(t, e) {
        k.layers.photo.material.opacity = 1;   // the plate fades in over an opaque photo (no see-through mid-fade)
        const mood = presence(t, e, 0, 0.45, ease.out, 0);
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.1 * mood, 1 - 0.08 * mood, 1 - 0.02 * mood));
        coverMat.color.copy(k.layers.plate.material.color);
        const ph = beatPh(t);

        // medal: drops over his head onto the chest, then swings to rest; later a slight sway + glint
        const land = t - 0.38;
        const mOut = 1 - ease.in(clamp(e * 1.6 - 0.12));
        k.show(medal, env(t, 0.08, 0.16) * mOut);
        medal.position.set(medalHome.x, medalHome.y + (1 - ease.in(env(t, 0.08, 0.38))) * 34 - (1 - mOut) * 6, medalHome.z);
        neck.visible = medal.visible;
        const settle = land > 0 ? 0.42 * Math.exp(-3.1 * land) * Math.sin(8.2 * land + 0.35) : 0.25;
        swing.rotation.z = settle + 0.03 * Math.sin((t * TAU) / BEAT) * env(t, 1.0, 1.6);
        discG.rotation.y = 0.25 * Math.exp(-2.5 * Math.max(0, land)) * Math.sin(6 * Math.max(0, land)) + 0.08 * Math.sin((t * TAU) / BEAT + 1);
        glintMat.uniforms.uG.value = t > 1.5 && ph > 1.75 && ph < 2.3 ? -18 + ((ph - 1.75) / 0.55) * 36 : -60;

        // the hand turns over and back once per beat (a full roll about the arm's axis)
        let a = flipAngle(t) % TAU;
        const ex = clamp(e * 2.2);
        a = a > Math.PI ? a + (TAU - a) * ex : a * (1 - ex);
        const turning = a > 0.005 && a < TAU - 0.005;
        cover.visible = turning;
        hand.quaternion.setFromAxisAngle(AXIS, turning ? a : 0);
        hand.scale.setScalar(k.depthScale(9) * (1 + 0.2 * Math.abs(Math.sin(a / 2))));

        // the cloud: rises out of his palm the first time, then swells and darkens as the hand turns over,
        // lightens again after the rain
        const cp = presence(t, e, 0.38, 0.44, ease.outBack, 0.3);
        k.show(cloud, cp, 0.94);
        const fly = ease.out(env(t, 0.38, 0.8));
        cloud.position.set(palm.x + (cloudHome.x - palm.x) * fly, palm.y + (cloudHome.y - palm.y) * fly + Math.sin((t * TAU) / BEAT) * 0.8 * env(t, 1, 1.6), CLOUD_Z);
        const swell = ph < 0 ? 0 : hump(ph, 0.05, 0.3, 0.75);
        cloudFit.scale.set(1 + 0.09 * swell, 1 + 0.12 * swell, 1);
        const dark = ph < 0 ? 0 : ph < 0.45 ? ease.out(env(ph, 0.05, 0.45)) : 1 - ease.inOut(env(ph, 1.1, 2.0));
        cloudMat.color.lerpColors(CLOUD_LIGHT, CLOUD_DARK, dark * 0.9);

        // rain burst, falling straight down under the cloud
        rainMat.uniforms.uT.value = t;
        rainMat.uniforms.uHead.value = ph < 0 ? -1 : (ph - RS) * SPD;
        rainMat.uniforms.uTail.value = ph < 0 ? -1 : (ph - RE) * SPD;
        rainMat.uniforms.uOp.value = 1 - e;
        rain.visible = ph > RS && ph < RE + RH / SPD + 0.05 && e < 1;

        // the wok swings up into his fist; once per beat he tosses it (颠勺): a push up and forward, the
        // pieces flip up and back and fall into the wok
        const wp = presence(t, 0, 0.55, 0.42, ease.outBack);
        k.show(wok, Math.min(1, wp * 1.6) * (1 - ease.in(clamp(e * 1.6 - 0.24))));
        fingers.visible = wok.visible;
        const tp = t > 1.5 ? env(ph, TOSS, TOSS + 0.72) : 0;
        const push = Math.sin(Math.min(1, tp / 0.55) * Math.PI);
        wok.position.set(wokHome.x, wokHome.y + (1 - wp) * 14 + 2.4 * push, wokHome.z);
        wok.rotation.z = WOK_ANG + (1 - Math.min(1, wp)) * -1.0;
        wokFit.rotation.z = 0.2 * Math.sin(Math.min(1, tp / 0.55) * TAU) * (tp < 1 ? 1 : 0);
        food.position.y = FY + 1.4 * push;
        bits.forEach((b) => {
          const { x, z, y0, ry, h, flip, lag } = b.userData;
          const q = clamp((tp - 0.1 - lag) / 0.68);
          const up = Math.sin(q * Math.PI);
          // straight up on screen is (0, cos, -sin) of the tilt in the wok's frame; they drift back toward him
          b.position.set(x - 4 * up, y0 + h * up * Math.cos(WOK_TILT), z - h * up * Math.sin(WOK_TILT));
          b.rotation.set(flip * q * TAU, ry + q * 1.5, flip * q * Math.PI * 0.5);
        });

        // the atom spins up beside his head
        const ap = presence(t, e, 0.75, 0.45, ease.outBack, 0.1);
        k.show(atom, ap);
        atom.rotation.z = (1 - Math.min(1, ap)) * -1.2;
        atom.rotation.y = 0.25 * Math.sin((t * TAU) / (BEAT * 2));
        atom.position.y = atomHome.y + 0.8 * Math.sin((t * TAU) / BEAT + 2);
        const spin = env(t, 0.75, 1.3);
        electrons.forEach((el, i) => {
          const an = t * (2.4 + i * 0.35) * (0.4 + 0.6 * spin) + i * 2.1;
          el.position.set(Math.cos(an) * ORB, Math.sin(an) * ORB, 0);
        });
        nucleus.rotation.set(t * 0.7, t * 0.9, 0);
        const bl = t > 1.5 ? hump(ph, BLOCH, BLOCH + 0.15, BLOCH + 0.75) : 0;
        nucleus.scale.setScalar(1 + 0.25 * bl);

        // the trophy pops up out of the ledge with a spin, lands with a glint; a slow sway, a glint per beat
        const tp0 = presence(t, e, TR0, 0.34, ease.outBack, 0.35);
        k.show(trophy, tp0);
        trophySpin.rotation.y = -(1 - ease.out(env(t, TR0, TR0 + 0.46))) * TAU * 0.75 + 0.22 * Math.sin((t * TAU) / (BEAT * 2) + 0.6) * env(t, 0.7, 1.4);
        trophy.getWorldPosition(tmp);
        const tg0 = tmp.x + 0.75 * tmp.y;
        const tgA = env(t, TR0 + 0.4, TR0 + 0.72), tgB = t > 2 ? env(ph, 3.15, 3.5) : 0;
        trophyGlint.value = tgA > 0 && tgA < 1 ? tg0 - 14 + 48 * tgA : tgB > 0 && tgB < 1 ? tg0 - 14 + 48 * tgB : -999;

        // quantum tunnelling: he (and all he wears or holds) blinks out and back
        const bk = blinkAt(t, e);
        k.layers.person.visible = !bk;
        ghost.visible = !!bk;
        if (bk) {
          ghostMat.uniforms.uBody.value = bk.body;
          ghostMat.uniforms.uGlitch.value = bk.glitch || 0;
          ghostMat.uniforms.uGhost.value = bk.ghost || 0;
          ghostMat.uniforms.uRip.value = bk.back !== undefined ? 1 - clamp(bk.back / 0.6) : 0;
          ghostMat.uniforms.uEdge.value = bk.back !== undefined ? 1 - clamp(bk.back / 0.6) : 0;   // the cloud collapses back onto him
          ghostMat.uniforms.uSeed.value = bk.seed;
          ghostMat.uniforms.uT.value = t;
          // the patches of him go (they would float), the props leave with him or jitter with the glitch
          neck.visible = false; fingers.visible = false; hand.visible = false;
          if (bk.back !== undefined && bk.back >= 0.6) { k.layers.person.visible = true; ghost.visible = false; neck.visible = medal.visible; fingers.visible = wok.visible; hand.visible = true; }
          if (!bk.props) { medal.visible = false; wok.visible = false; }
          medal.position.x += bk.jx; wok.position.x += bk.jx;
        } else hand.visible = true;
      },

      draw2d(q, t, e) {
        const fade = 1 - e;
        const c = q.drawingContext;
        const ph = beatPh(t);
        q.strokeJoin(q.ROUND);
        const star4 = (x, y, r, a, col = [255, 255, 255]) => {
          q.stroke(22, 21, 26, 230 * a); q.strokeWeight(1.1); q.fill(col[0], col[1], col[2], 255 * a);
          q.beginShape();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.3 : r; const an = (i / 8) * TAU - Math.PI / 2; q.vertex(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
          q.endShape(q.CLOSE);
        };
        const [cx0, cy0] = k.screenAt(256, 256, 0);

        // turning marks round the hand: an arc with an arrowhead over it (翻手) and under it (覆手)
        const [hx, hy] = k.screenAt(80, 189, 9);
        const arcs = [[hump(ph, 0, 0.1, 0.3), -1], [hump(ph, 0.5, 0.6, 0.8), 1]];
        arcs.forEach(([a, side]) => {
          a *= fade;
          if (a < 0.02) return;
          const R = 13, a0 = side < 0 ? Math.PI + 0.35 : 0.35, a1 = side < 0 ? TAU - 0.35 : Math.PI - 0.35;
          const aEnd = a0 + (a1 - a0) * Math.min(1, a * 1.4);
          for (let pass = 0; pass < 2; pass++) {
            q.noFill();
            if (pass === 0) { q.stroke(22, 21, 26, 235 * a); q.strokeWeight(3.4); } else { q.stroke(255, 255, 255, 255 * a); q.strokeWeight(1.5); }
            q.beginShape();
            for (let i = 0; i <= 14; i++) { const an = a0 + (aEnd - a0) * (i / 14); q.vertex(hx + Math.cos(an) * R, hy + Math.sin(an) * R * 0.62); }
            q.endShape();
            // arrowhead along the tangent at the end
            const ex = hx + Math.cos(aEnd) * R, ey = hy + Math.sin(aEnd) * R * 0.62;
            const tx = -Math.sin(aEnd), ty = Math.cos(aEnd) * 0.62, tl = Math.hypot(tx, ty) || 1;
            const ux = tx / tl, uy = ty / tl;
            q.line(ex, ey, ex - ux * 4.2 + uy * 3, ey - uy * 4.2 - ux * 3);
            q.line(ex, ey, ex - ux * 4.2 - uy * 3, ey - uy * 4.2 + ux * 3);
          }
        });

        // lightning out of the cloud as the hand comes down
        const lb = ph < 0 ? 0 : hump(ph, 0.52, 0.56, 0.7) * fade;
        if (lb > 0.02) {
          cloud.localToWorld(tmp.set(6, -9, 4)); root.worldToLocal(tmp);
          const [zx, zy] = k.toScreen(tmp);
          const pts = [[0, 0], [-4, 7], [1, 8], [-3, 17], [5, 7], [0, 6], [3, 0]];
          c.save(); c.beginPath(); c.arc(cx0, cy0, k.R, 0, TAU); c.clip();
          q.stroke(22, 21, 26, 255 * lb); q.strokeWeight(1.6); q.fill(255, 226, 70, 255 * lb);
          q.beginShape(); pts.forEach(([x, y]) => q.vertex(zx + x * 1.1, zy + y * 1.1)); q.endShape(q.CLOSE);
          c.restore();
        }

        // splash crowns where the rain lands, while it lands: on his arm and sleeve, and on the pond (with ripples)
        const splash = (x, y, p, s, sz, ripple) => {
          if (ripple) {
            q.noFill(); q.stroke(22, 21, 26, 190 * s); q.strokeWeight(1.1);
            q.ellipse(x, y + 1.2, sz * (1.2 + 2.2 * p), sz * (0.32 + 0.6 * p));
            q.stroke(225, 242, 255, 200 * s); q.strokeWeight(0.7);
            q.ellipse(x, y + 1.2, sz * (0.6 + 1.4 * p), sz * (0.16 + 0.36 * p));
          }
          for (let pass = 0; pass < 2; pass++) {
            if (pass === 0) { q.stroke(22, 21, 26, 235 * s); q.strokeWeight(2.5); } else { q.stroke(225, 242, 255, 255 * s); q.strokeWeight(1.15); }
            [-2.55, -2.05, -1.57, -1.09, -0.59].forEach((an, j) => {
              const r0 = 1.2 + 1.6 * p, r1 = r0 + sz * (0.45 + 0.35 * (j % 2)) * s;
              q.line(x + Math.cos(an) * r0, y + Math.sin(an) * r0 * 0.9, x + Math.cos(an) * r1, y + Math.sin(an) * r1 * 0.9);
            });
          }
          // two droplets thrown off the crown
          q.stroke(22, 21, 26, 220 * s); q.strokeWeight(0.9); q.fill(225, 242, 255, 255 * s);
          [-1, 1].forEach((sx) => q.circle(x + sx * (2 + sz * 0.7 * p), y - sz * (0.5 + 0.9 * Math.sin(p * Math.PI)), 1.5 + 0.4 * sz / 5));
        };
        if (ph > 0 && e < 1) {
          const sites = [
            ...[92, 116, 138, 160, 181].map((u, i) => ({ u, v: [184, 182, 189, 199, 211][i] - 1, z: 0, sz: 3.6, ripple: false })),
            ...[0, 1, 2, 3, 4, 5].map((i) => ({ u: RBOX[0] + 8 + (RBOX[2] - RBOX[0] - 16) * (i / 5), v: RBOX[3] - 2 + (i % 2) * 5, z: -7, sz: 5.2, ripple: true })),
          ];
          sites.forEach(({ u, v, z, sz, ripple }, i) => {
            const land0 = RS + (v - RBOX[1]) * PX / SPD, land1 = RE + (v - RBOX[1]) * PX / SPD;
            const on = env(ph, land0, land0 + 0.04) * (1 - env(ph, land1 - 0.02, land1 + 0.1)) * fade;
            if (on < 0.02) return;
            const cyc = (ph - land0) / 0.27 + i * 0.41;
            const p = cyc % 1, n = Math.floor(cyc);
            const s = Math.sin(p * Math.PI) * on;
            if (s < 0.05) return;
            const jx = (Math.sin(n * 12.9 + i * 7.1) * 0.5) * (ripple ? 12 : 6);
            const [x, y] = k.screenAt(u + jx, v, z);
            splash(x, y, p, s, sz, ripple);
          });
        }

        // while he tunnels, what he holds goes with him (and jitters with the glitch frames)
        const bk = blinkAt(t, e);
        const held = !bk || bk.props;
        const jx = bk ? bk.jx : 0;

        // steam off the wok: three wisps (white core, grey edge), a big puff after the toss
        const ws = presence(t, e, 0.95, 0.5, ease.out, 0.3) * (held ? 1 : 0);
        const kick = t > 1.5 ? hump(ph, TOSS + 0.35, TOSS + 0.6, TOSS + 1.4) : 0;
        let steamTop = null;
        if (ws > 0.01) {
          bowlG.localToWorld(tmp.set(0, 10, 0)); root.worldToLocal(tmp);
          const [bx, by] = k.toScreen(tmp);
          for (let pass = 0; pass < 2; pass++) {
            for (let w = 0; w < 3; w++) {
              const H = (22 + w * 6) * (1 + 0.55 * kick);
              const x0 = bx - 9 + w * 9;
              let px = x0, py = by - 2;
              for (let j = 1; j <= 14; j++) {
                const sN = j / 14;
                const x = x0 + Math.sin(sN * 5 + w * 2.4 - t * 1.6) * (1 + 3.5 * sN);
                const y = by - 2 - sN * H;
                const a = Math.pow(1 - sN, 0.9) * ws;
                const wt = (3.6 - 1.9 * sN) * (0.55 + 0.45 * Math.min(1, sN * 4));
                if (pass === 0) { q.stroke(110, 104, 100, 95 * a); q.strokeWeight(wt + 2); } else { q.stroke(255, 253, 248, 240 * a); q.strokeWeight(wt); }
                q.line(px, py, x, y);
                px = x; py = y;
              }
            }
          }
          if (kick > 0.02) {                      // the puff off the toss
            q.noStroke();
            [[-6, -14, 6], [4, -20, 7.5], [11, -12, 5]].forEach(([dx, dy, r]) => {
              q.fill(120, 114, 110, 90 * kick * ws); q.circle(bx + dx, by + dy * (0.6 + 0.6 * kick), (r + 1.6) * 2 * (0.6 + 0.5 * kick));
              q.fill(255, 253, 248, 230 * kick * ws); q.circle(bx + dx, by + dy * (0.6 + 0.6 * kick), r * 2 * (0.6 + 0.5 * kick));
            });
          }
          steamTop = [bx, by];
        }

        // 「辣椒炒肉」 in the steam: pops when the wok lands, and again after each toss
        if (steamTop) {
          let la = ease.outBack(env(t, 1.05, 1.32), 2) * (1 - env(t, 2.3, 2.6));
          if (t > 2.6) { const lp = env(ph, TOSS + 0.4, TOSS + 0.62); la = Math.max(la, ease.outBack(lp, 2) * (1 - env(ph, TOSS + 1.6, TOSS + 1.9))); }
          la *= fade;
          if (la > 0.01) {
            const [lx, ly] = k.screenAt(398, 334, WOK_Z);
            const rise = (1 - Math.min(1, la)) * 5;
            q.push();
            q.translate(lx + jx, ly + rise);
            q.rotate(-0.1);
            q.textFont('"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", "WenQuanYi Zen Hei", sans-serif');
            q.textStyle(q.BOLD);
            q.textSize(12.5);
            q.textAlign(q.CENTER, q.CENTER);
            const chars = ['辣', '椒', '炒', '肉'];
            chars.forEach((ch, i) => {
              const a = clamp(la * 1.6 - i * 0.15, 0, 1);
              if (a <= 0) return;
              q.push();
              q.translate((i - 1.5) * 12.6, (i % 2 ? -1.2 : 1.2));
              q.rotate((i % 2 ? 0.07 : -0.06));
              q.scale(ease.outBack(a, 2.2));
              const al = 255 * Math.min(1, la);
              q.fill(22, 21, 26, al); q.stroke(22, 21, 26, al); q.strokeWeight(4.6);
              q.text(ch, 1.2, 1.4);
              q.fill(227, 38, 28, al); q.stroke(22, 21, 26, al); q.strokeWeight(2.6);
              q.text(ch, 0, 0);
              q.noStroke(); q.fill(255, 214, 90, al);
              q.text(ch, -0.5, -0.6);
              q.fill(227, 38, 28, al);
              q.text(ch, 0, 0);
              q.pop();
            });
            q.pop();
          }
        }

        // equation under the atom, one per beat
        const [ex0, ey0] = k.screenAt(ATOM_UV[0], ATOM_UV[1] + 66, 0);
        let alpha = 0, reveal = 1, idx = 0;
        if (t < T0 + BEAT) { reveal = env(t, 1.0, 1.4); alpha = 1 - env(t, T0 + BEAT - 0.35, T0 + BEAT); }
        else { idx = beatIdx(t) % EQS.length; alpha = Math.min(env(ph, 0, 0.35), 1 - env(ph, BEAT - 0.35, BEAT)); }
        alpha *= fade;
        if (alpha > 0.01 && reveal > 0) {
          q.push();
          q.translate(ex0, ey0);
          q.rotate(-0.08);
          q.textFont('Georgia, "Times New Roman", serif');
          q.textStyle(q.BOLDITALIC ?? 'italic bold');
          q.textSize(10.5);
          q.textAlign(q.CENTER, q.CENTER);
          const s = EQS[idx];
          const w = q.textWidth(s), n = s.length;
          let x = -w / 2;
          for (let i = 0; i < n; i++) {
            const ch = s[i], cw = q.textWidth(ch);
            const a = clamp(reveal * (n + 2) - i, 0, 1);
            if (a > 0 && ch !== ' ') {
              q.push();
              q.translate(x + cw / 2, (1 - a) * 3);
              q.scale(ease.outBack(a, 2.4));
              q.fill(22, 21, 26, 255 * alpha); q.stroke(22, 21, 26, 255 * alpha); q.strokeWeight(3.4);
              q.text(ch, 0, 0);
              q.noStroke(); q.fill(255, 247, 214, 255 * alpha);
              q.text(ch, 0, 0);
              q.pop();
            }
            x += cw;
          }
          q.pop();
        }

        if (t > 1.5) {
          // Bloch-sphere flicker round the atom, once per beat
          const b = hump(ph, BLOCH, BLOCH + 0.15, BLOCH + 0.75) * fade;
          if (b > 0.01) {
            atom.getWorldPosition(tmp); root.worldToLocal(tmp);
            const [ox, oy] = k.toScreen(tmp);
            const fl = b * (0.8 + 0.2 * Math.sin(ph * 60));
            const R = 22;
            q.noFill(); q.stroke(210, 250, 255, 200 * fl); q.strokeWeight(1.2);
            q.circle(ox, oy, R * 2);
            c.save(); c.setLineDash([2.5, 2.5]);
            q.ellipse(ox, oy, R * 2, R * 0.6);
            c.restore();
            const th = -Math.PI / 2 + env(ph, BLOCH + 0.05, BLOCH + 0.65) * 2.4;
            const vx = ox + Math.cos(th) * R * 0.95, vy = oy + Math.sin(th) * R * 0.95 * 0.9;
            q.stroke(255, 230, 120, 255 * fl); q.strokeWeight(1.8);
            q.line(ox, oy, vx, vy);
            q.noStroke(); q.fill(255, 230, 120, 255 * fl);
            q.circle(vx, vy, 3.6);
          }
          // medal twinkle as the glint leaves the disc
          const mt = hump(ph, 2.2, 2.3, 2.55) * fade;
          if (mt > 0.01) { discG.localToWorld(tmp.set(7, 7, 2)); root.worldToLocal(tmp); const [dx, dy] = k.toScreen(tmp); star4(dx, dy, 5.5 * mt, mt); }
        }

        // the trophy: pop lines where it lands on the ledge, a twinkle on the rim after each glint
        if (trophy.visible) {
          const land = hump(t, TR0 + 0.2, TR0 + 0.27, TR0 + 0.5) * fade;
          const tw = Math.max(hump(t, TR0 + 0.6, TR0 + 0.7, TR0 + 0.92), t > 2 ? hump(ph, 3.4, 3.48, 3.6) : 0) * fade;
          if (land > 0.02) {
            trophy.getWorldPosition(tmp); root.worldToLocal(tmp);
            const [tx, ty] = k.toScreen(tmp);
            q.stroke(22, 21, 26, 240 * land); q.strokeWeight(1.7);
            [-1, 1].forEach((sd) => [[10, 5], [35, 6.5], [60, 4.5]].forEach(([deg, len]) => {
              const a = sd < 0 ? Math.PI + (deg * Math.PI) / 180 : -(deg * Math.PI) / 180;
              const r0 = 12 + 3 * (1 - land), r1 = r0 + len * land;
              q.line(tx + Math.cos(a) * r0, ty - 3 + Math.sin(a) * r0 * 0.8, tx + Math.cos(a) * r1, ty - 3 + Math.sin(a) * r1 * 0.8);
            }));
          }
          if (tw > 0.02) {
            trophyTilt.localToWorld(tmp.set(8.8, 31.4, 1)); root.worldToLocal(tmp);
            const [gx, gy] = k.toScreen(tmp);
            star4(gx, gy, 6 * tw, tw);
          }
        }

        // the shades: comic black wayfarers dropped onto his real glasses (the lenses over his eyes
        // u 239..268, v 167..178; the temple to his ear at 288,179), a white streak on each lens,
        // a glint on landing and again when he comes back from tunnelling
        const shIn = env(t, SH0, SH0 + 0.26);
        const shOut = 1 - ease.in(clamp(e * 1.6 - 0.05));
        if (shIn > 0 && shOut > 0.01 && held) {
          const SC = [254, 172], SZ = 3;
          const [sx, sy] = k.screenAt(SC[0], SC[1], SZ);
          const [ux, uy] = k.screenAt(SC[0] + 20, SC[1], SZ), [wx, wy] = k.screenAt(SC[0], SC[1] + 20, SZ);
          const eu = [(ux - sx) / 20, (uy - sy) / 20], ev = [(wx - sx) / 20, (wy - sy) / 20];
          const drop = (1 - ease.outBounce(shIn)) * 46 + (1 - shOut) * 10;
          const rot = (1 - ease.out(shIn)) * -0.5 - 0.03;
          const cr = Math.cos(rot), sr = Math.sin(rot);
          const M = (du, dv) => { const x = du * cr - dv * sr, y = du * sr + dv * cr; return [sx + x * eu[0] + y * ev[0] + jx, sy + x * eu[1] + y * ev[1] - drop]; };
          const lensPts = (cx, cy, w, hT, hB) => {
            const pts = [[cx - w / 2, cy - hT], [cx + w / 2, cy - hT]];
            for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; pts.push([cx + (w / 2) * (0.96 - 0.1 * Math.sin(a)) * Math.cos(a), cy + hB * Math.pow(Math.sin(a), 0.8)]); }
            return pts;
          };
          const LF = lensPts(-10.2, 0, 16.6, 6.2, 7.4), LN = lensPts(10.6, -0.4, 17.6, 6.2, 8.0);
          const addPath = (pts) => pts.forEach(([u, v], i) => { const [x, y] = M(u, v); i ? c.lineTo(x, y) : c.moveTo(x, y); });
          const lens = () => { c.beginPath(); addPath(LF); c.closePath(); addPath(LN); c.closePath(); };
          const seg = (pts, w, col) => { c.beginPath(); addPath(pts); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
          const al = shOut * Math.min(1, shIn * 8);
          c.save();
          c.globalAlpha = al;
          c.lineJoin = 'round'; c.lineCap = 'round';
          // the temple arm back to his ear, behind the lenses
          seg([[19, -5], [27, 0.5], [34, 6]], 2.9, '#16151a');
          seg([[19, -5], [27, 0.5], [34, 6]], 1.3, '#2a2c38');
          // lenses: black with a cel-shaded blue sheen low down, ink rim
          lens(); c.fillStyle = '#121319'; c.fill();
          c.save(); lens(); c.clip();
          c.beginPath(); addPath([[-24, 3.5], [24, -2.5], [24, 12], [-24, 12]]); c.closePath();
          c.fillStyle = '#35405f'; c.fill();
          c.beginPath(); addPath([[-24, 6.5], [24, 0.5], [24, 12], [-24, 12]]); c.closePath();
          c.fillStyle = '#4b5b86'; c.fill();
          // white highlight streaks (upper left of each lens)
          [[-10.2, 0], [10.6, -0.4]].forEach(([lx0, ly0]) => {
            c.beginPath(); addPath([[lx0 - 6.5, ly0 - 7], [lx0 - 3.2, ly0 - 7], [lx0 - 7.6, ly0 + 5], [lx0 - 10.9, ly0 + 5]]); c.closePath();
            c.fillStyle = 'rgba(255,255,255,0.92)'; c.fill();
            c.beginPath(); addPath([[lx0 - 1.6, ly0 - 7], [lx0 - 0.2, ly0 - 7], [lx0 - 4.4, ly0 + 5], [lx0 - 5.8, ly0 + 5]]); c.closePath();
            c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
          });
          // the glint: a bright band sweeping across both lenses
          const gA = env(t, SH0 + 0.24, SH0 + 0.46), gB = bk && bk.back !== undefined ? bk.back : 0;
          const g = gA > 0 && gA < 1 ? gA : gB > 0 && gB < 1 ? gB : -1;
          if (g >= 0) {
            const gx = -30 + 62 * ease.inOut(g);
            c.beginPath(); addPath([[gx - 2.5, -9], [gx + 4.5, -9], [gx - 0.5, 10], [gx - 7.5, 10]]); c.closePath();
            c.fillStyle = 'rgba(255,255,250,0.95)'; c.fill();
          }
          c.restore();
          lens(); c.lineWidth = 1.35; c.strokeStyle = '#16151a'; c.stroke();
          // the thick brow bar and the bridge
          seg([[-19.5, -6.6], [-1.5, -6.4], [1.5, -6.6], [20.2, -7.2]], 2.6, '#16151a');
          seg([[-18.4, -7.3], [-2, -7.1]], 0.7, 'rgba(150,158,182,0.9)');
          seg([[2.2, -7.3], [19, -7.9]], 0.7, 'rgba(150,158,182,0.9)');
          seg([[-2, -3.8], [0.1, -4.8], [2.2, -4]], 1.6, '#16151a');
          c.restore();
          const tw = hump(t, SH0 + 0.38, SH0 + 0.46, SH0 + 0.66) + (gB > 0 ? hump(gB, 0.5, 0.7, 1) : 0);
          if (tw > 0.02) { const [x, y] = M(19.5, -8.5); star4(x, y, 6.5 * tw * al, tw * al); }
        }

        // tunnelling: a faint ψ in the probability cloud where he was
        if (bk && !bk.props && bk.ghost > 0.6) {
          const [px, py] = k.screenAt(328, 292, 0);
          const a = (bk.ghost - 0.6) / 0.4 * (0.85 + 0.15 * Math.sin(t * 70));
          q.push();
          q.translate(px, py);
          q.textFont('Georgia, "Times New Roman", serif');
          q.textStyle(q.BOLDITALIC ?? 'italic bold');
          q.textSize(34);
          q.textAlign(q.CENTER, q.CENTER);
          q.fill(22, 21, 26, 150 * a); q.stroke(22, 21, 26, 150 * a); q.strokeWeight(4);
          q.text('ψ', 0, 0);
          q.noStroke(); q.fill(150, 238, 255, 215 * a);
          q.text('ψ', 0, 0);
          q.pop();
        }
      },

      dispose() {
        own.forEach(o => o.dispose?.());
        k.layers.plate.material.color.setRGB(1, 1, 1);
      },
    };
  },
};
