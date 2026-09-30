/* Zhuo — CPhO 金牌 (Chinese Physics Olympiad gold; Tsinghua Yao Class; quantum computing systems)
   翻手为云，覆手为雨: click and a gold CPhO medal on a red ribbon drops around his neck and
   swings to rest; his pointing hand turns over (palm up) and a toon storm cloud rises out of
   it to hang over his arm; the hand turns back down and the rain comes straight down from the
   cloud (comic streaks behind his arm, splashes on the pond). His other hand swings in a wok
   of 辣椒炒肉 (Hunan chili pork: green and red chilies, pork slices, steam); an atom spins up
   beside his head (three electron orbits, a Bloch-sphere flicker).
   Loop (3.6 s): hand over -> the cloud swells and darkens -> hand down, a crack of lightning,
   one burst of rain; the medal glints; he tosses the wok once (颠勺); the atom flickers.
   Photo landmarks (512 px): fingertip 52,179 · pointing hand u 50..106, v 178..203 (wrist
   104,190) · shoulder 195,215 · head top 263,145 · neck 269,214 (collar v 227) · lower hand
   258,433 (fingers 238..270, 421..449) · pond under the cloud v ~392. */
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
          vec2 a = layer(p, 7.2, 30.0, 1.0, 7.0, 19.0, 1.5, 0.4, 0.62, 0.85);
          vec2 b = layer(p + vec2(3.1, 0.0), 5.4, 23.0, 7.0, 4.0, 11.0, 1.05, 0.3, 0.42, 0.7) * 0.85;
          vec2 c = layer(p + vec2(1.3, 0.0), 14.0, 52.0, 13.0, 4.0, 8.0, 2.5, 0.7, 0.3, 1.0);
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
      holder.userData = { x, z, y0, ry: i * 1.1, h: 15 + (i % 3) * 5, flip: (i % 2 ? 1 : -1) * (1 + (i % 3 === 0 ? 1 : 0)), lag: (i % 4) * 0.035 };
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
          b.position.set(x - 7 * up, y0 + h * up, z + 3 * up);
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

        // steam off the wok: three wisps (white core, grey edge), a big puff after the toss
        const ws = presence(t, e, 0.95, 0.5, ease.out, 0.3);
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
            q.translate(lx, ly + rise);
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
      },

      dispose() {
        own.forEach(o => o.dispose?.());
        k.layers.plate.material.color.setRGB(1, 1, 1);
      },
    };
  },
};
