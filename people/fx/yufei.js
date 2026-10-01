/* Yufei — San Diego: the sunset, a palm tree and her white cat
   Click: the garden behind her turns into a San Diego sunset over the Pacific (banded dusk sky,
   the sun setting on the horizon, Point Loma low in the distance, a shimmering sun path on the
   sea); a palm tree grows up behind her from the lower left and opens its fronds; her white cat
   peeks over her shoulder, hops up into the palm crown with a stretch and a squash, turns and
   sits there looking out.
   Loop (3.6 s): the fronds sway, the cat flicks its tail and gives a slow blink (an ear twitch on
   alternate beats), two gulls glide, the sea twinkles under the sun.
   Photo landmarks (512 px): head top v 52 · hair u 200-330 · glasses v 140 · chin v 230 ·
   left shoulder top 140,262 (blazer edge u 136 @ v 270, 125 @ 300, 113 @ 384, 108 @ 450) ·
   right blazer edge u 393 @ v 290, 400 @ 350 · horizon (new) v 300 · palm crown 100,200 ·
   the cat sits at 103,194 and peeks up from behind her shoulder at 160,305. */
import { THREE, presence, env, ease, clamp, lerp } from './kit.js';

const BEAT = 3.6, LOOP0 = 1.35;
const TAU = Math.PI * 2;
const HZ = 300;                                   // horizon, photo px
const SUN = [452, 297], SUN_R = 40;
const T_PEEK = 0.56, T_JUMP = 0.8, T_LAND = 1.06;

/* the dusk sky: flat bands with halftone seams, a few lit cloud streaks, first stars (canvas = photo px) */
function drawSky(g) {
  const bands = [[0, '#2d2b66'], [46, '#44357a'], [90, '#693d86'], [130, '#984687'], [166, '#c7547f'],
    [198, '#e56f70'], [226, '#f39262'], [252, '#fab366'], [276, '#fdd17f'], [512, '']];
  for (let i = 0; i < bands.length - 1; i++) { g.fillStyle = bands[i][1]; g.fillRect(0, bands[i][0], 512, bands[i + 1][0] - bands[i][0]); }
  for (let i = 1; i < bands.length - 1; i++) {
    g.fillStyle = bands[i][1];
    const y0 = bands[i][0];
    for (let row = 1; row <= 3; row++) for (let x = (row % 2) * 4; x < 512; x += 8) {
      g.beginPath(); g.arc(x, y0 - row * 4, 2.3 - row * 0.55, 0, TAU); g.fill();
    }
  }
  // stars in the top band
  g.fillStyle = '#fff3d2';
  [[150, 22], [212, 12], [330, 30], [372, 14], [96, 40], [420, 44], [262, 26]].forEach(([x, y], i) => {
    g.beginPath(); g.arc(x, y, i % 3 ? 1.6 : 2.3, 0, TAU); g.fill();
  });
  // cloud streaks: dark body, lit top edge
  const streak = (x0, x1, y, h, body, lit) => {
    g.fillStyle = body;
    g.beginPath(); g.moveTo(x0 + h / 2, y); g.lineTo(x1 - h / 2, y); g.arc(x1 - h / 2, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2); g.lineTo(x0 + h / 2, y + h); g.arc(x0 + h / 2, y + h / 2, h / 2, Math.PI / 2, Math.PI * 1.5); g.fill();
    g.fillStyle = lit; g.fillRect(x0 + h * 0.6, y, x1 - x0 - h * 1.2, 2.4);
  };
  streak(12, 150, 112, 11, '#7b3f86', '#e98fa6');
  streak(60, 196, 128, 8, '#8a4386', '#f09aa6');
  streak(318, 500, 184, 12, '#b9507c', '#ffb39a');
  streak(360, 470, 202, 8, '#c95d78', '#ffc29a');
  streak(0, 110, 234, 7, '#dd6d6c', '#ffcf9a');
}

/* the Pacific below the horizon, with Point Loma low on the left (transparent above the horizon) */
function drawSea(g) {
  let gr = g.createLinearGradient(0, HZ, 0, 512);
  gr.addColorStop(0, '#6a78b8'); gr.addColorStop(0.18, '#43589a'); gr.addColorStop(1, '#1d2d62');
  g.fillStyle = gr; g.fillRect(0, HZ, 512, 512 - HZ);
  // halftone swell, darker toward the bottom
  g.fillStyle = 'rgba(14,20,58,0.5)';
  for (let y = HZ + 40; y < 512; y += 7) for (let x = ((y / 7) % 2) * 3.5; x < 512; x += 7) {
    const r = 0.3 + 1.6 * clamp((y - HZ - 40) / 170);
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // wave dashes (perspective: short near the horizon, longer below)
  g.strokeStyle = 'rgba(160,178,232,0.85)'; g.lineCap = 'round';
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const f = r(), y = HZ + 5 + f * f * 190, len = 4 + f * 22;
    const x = r() * 512;
    g.lineWidth = 1 + f * 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
  }
  // Point Loma: a long low headland, rim-lit by the sun
  const loma = [[-4, HZ + 1], [-4, 274], [26, 270], [60, 272], [96, 279], [132, 288], [164, 296], [186, HZ + 1]];
  g.beginPath(); loma.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  g.fillStyle = '#3b2b5e'; g.fill();
  g.strokeStyle = '#f7a784'; g.lineWidth = 2;
  g.beginPath(); loma.slice(1, -1).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  // the lighthouse on the point
  g.fillStyle = '#f6e7c8'; g.fillRect(40, 262, 4, 9);
  g.fillStyle = '#3b2b5e'; g.fillRect(39, 259, 6, 3);
  // horizon line
  g.fillStyle = '#ffe6ad'; g.fillRect(186, HZ - 1, 326, 2);
}

/* the setting sun: pale core, warm rim */
function drawSun(g, w, h) {
  const c = w / 2;
  g.fillStyle = '#ffb454'; g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.fill();
  g.fillStyle = '#ffd97e'; g.beginPath(); g.arc(c, c, c * 0.86, 0, TAU); g.fill();
  g.fillStyle = '#fff1bd'; g.beginPath(); g.arc(c - c * 0.08, c - c * 0.1, c * 0.64, 0, TAU); g.fill();
}

/* a tapered tube along point(s), rebuilt in place (trunk, tail): rings of nRad vertices */
function tubeGeo(nSeg, nRad) {
  const g = new THREE.BufferGeometry();
  const n = (nSeg + 1) * (nRad + 1);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const idx = [];
  for (let i = 0; i < nSeg; i++) for (let j = 0; j < nRad; j++) {
    const a = i * (nRad + 1) + j, b = a + nRad + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  g.setIndex(idx);
  g.userData = { nSeg, nRad };
  return g;
}
const _P = new THREE.Vector3(), _Q = new THREE.Vector3(), _T = new THREE.Vector3(), _N = new THREE.Vector3(), _B = new THREE.Vector3(), _Z = new THREE.Vector3(0, 0, 1);
function setTube(g, point, radius, s0, s1, vScale = 1) {
  const { nSeg, nRad } = g.userData;
  const pos = g.attributes.position.array, nor = g.attributes.normal.array, uv = g.attributes.uv.array;
  for (let i = 0; i <= nSeg; i++) {
    const s = s0 + (s1 - s0) * i / nSeg;
    point(Math.min(1, s + 0.004), _Q); point(Math.max(0, s - 0.004), _P);
    _T.subVectors(_Q, _P).normalize();
    point(s, _P);
    _N.crossVectors(_T, _Z);
    if (_N.lengthSq() < 1e-6) _N.set(1, 0, 0);
    _N.normalize();
    _B.crossVectors(_T, _N);
    const r = radius(s, i / nSeg);
    for (let j = 0; j <= nRad; j++) {
      const a = (j / nRad) * TAU, c = Math.cos(a), sn = Math.sin(a);
      const nx = c * _N.x + sn * _B.x, ny = c * _N.y + sn * _B.y, nz = c * _N.z + sn * _B.z;
      const o = i * (nRad + 1) + j;
      pos[o * 3] = _P.x + nx * r; pos[o * 3 + 1] = _P.y + ny * r; pos[o * 3 + 2] = _P.z + nz * r;
      nor[o * 3] = nx; nor[o * 3 + 1] = ny; nor[o * 3 + 2] = nz;
      uv[o * 2] = j / nRad; uv[o * 2 + 1] = s * vScale;
    }
  }
  g.attributes.position.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
  g.attributes.uv.needsUpdate = true;
}

/* a palm frond: a jagged feather along a drooping arc, local +x = out from the crown */
function frondShape(L, W, droop, n) {
  const c = (s) => [L * s, -droop * s * s];
  const nrm = (s) => { const tx = L, ty = -2 * droop * s, l = Math.hypot(tx, ty); return [-ty / l, tx / l]; };
  const w = (s) => W * Math.pow(Math.sin(Math.PI * clamp(s * 0.9 + 0.1)), 0.65) * (1 - 0.3 * s);
  const up = [], lo = [];
  for (let i = 0; i < n; i++) {
    const s0 = 0.05 + (i / n) * 0.88, s1 = Math.min(0.98, s0 + 0.9 / n + 0.03);
    for (const [side, arr] of [[1, up], [-1, lo]]) {
      const [ax, ay] = c(s0), [anx, any] = nrm(s0);
      arr.push([ax + anx * side * w(s0) * 0.28, ay + any * side * w(s0) * 0.28]);
      const [bx, by] = c(s1), [bnx, bny] = nrm(s1);
      const tw = side > 0 ? 1 : 1.12;                   // the leaflets hang a little lower on the underside
      arr.push([bx + bnx * side * w(s1) * tw, by + bny * side * w(s1) * tw]);
    }
  }
  const sh = new THREE.Shape();
  sh.moveTo(0, W * 0.12);
  up.forEach(([x, y]) => sh.lineTo(x, y));
  const [tx, ty] = c(1);
  sh.lineTo(tx, ty);
  lo.slice().reverse().forEach(([x, y]) => sh.lineTo(x, y));
  sh.lineTo(0, -W * 0.12);
  sh.closePath();
  // the midrib: a thin strip along the arc
  const rib = new THREE.Shape();
  const m = 14;
  for (let i = 0; i <= m; i++) { const s = i / m * 0.96, [x, y] = c(s), [nx, ny] = nrm(s), h = 0.55 * (1 - s * 0.6); if (i) rib.lineTo(x + nx * h, y + ny * h); else rib.moveTo(x + nx * h, y + ny * h); }
  for (let i = m; i >= 0; i--) { const s = i / m * 0.96, [x, y] = c(s), [nx, ny] = nrm(s), h = 0.55 * (1 - s * 0.6); rib.lineTo(x - nx * h, y - ny * h); }
  rib.closePath();
  return { sh, rib };
}

export default {
  title: 'San Diego sunset with her cat',
  exit: 0.45,
  still: 2.6,
  async build(k) {
    const { root } = k;
    const own = [];
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const beatPh = (t) => (t < LOOP0 ? -1 : (t - LOOP0) % BEAT);
    const beatN = (t) => (t < LOOP0 ? -1 : Math.floor((t - LOOP0) / BEAT));
    const plate = k.layers.plate.material, person = k.layers.person.material;
    // the photo and the plate sit deeper than the stencil disc: clip them, or a sliver of the garden
    // shows at the rim next to the new sky
    k.clip(plate); k.clip(k.layers.photo.material);
    const backdropDisc = () => {
      const pad = 2, geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };
    const atDepth = (mesh, z) => { mesh.position.z = z; mesh.scale.setScalar(k.depthScale(z)); return mesh; };

    /* ① sky, sun, sea (back to front) */
    const skyMat = k.clip(new THREE.MeshBasicMaterial({ map: k.canvasTexture(512, 512, drawSky), transparent: true, opacity: 0, depthWrite: false }));
    const sky = atDepth(new THREE.Mesh(backdropDisc(), skyMat), k.Z_BACK + 1);
    sky.renderOrder = -18;
    const sunMat = k.clip(new THREE.MeshBasicMaterial({ map: k.canvasTexture(256, 256, drawSun), transparent: true, opacity: 0, depthWrite: false }));
    const sun = new THREE.Mesh(new THREE.CircleGeometry(SUN_R * k.D / 512, 48), sunMat);
    sun.renderOrder = -17.5;
    const sunHome = k.at(SUN[0], SUN[1], k.Z_BACK + 1.5);
    const seaMat = k.clip(new THREE.MeshBasicMaterial({ map: k.canvasTexture(512, 512, drawSea), transparent: true, opacity: 0, depthWrite: false }));
    const sea = atDepth(new THREE.Mesh(backdropDisc(), seaMat), k.Z_BACK + 2);
    sea.renderOrder = -17;
    // the sun path on the water: dashes that breathe and drift
    const pathMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uOp: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uT, uOp; varying vec2 vUv;
        void main() {
          float y = 1.0 - vUv.y;
          float rows = 8.0;
          float r = floor(y * rows), fy = fract(y * rows);
          float w = mix(0.44, 0.16, y) * (0.72 + 0.28 * sin(uT * 2.1 + r * 1.9));
          float cx = 0.5 + 0.07 * sin(uT * 1.2 + r * 2.7);
          float d = abs(vUv.x - cx);
          float a = smoothstep(w, w - 0.05, d) * smoothstep(0.12, 0.3, fy) * smoothstep(0.86, 0.68, fy) * (1.0 - y * 0.55);
          vec3 col = mix(vec3(1.0, 0.95, 0.7), vec3(1.0, 0.64, 0.38), y);
          gl_FragColor = vec4(col, a * uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    own.push(pathMat);
    const PW = 96, PH = 96;                         // photo px
    const sunPath = new THREE.Mesh(new THREE.PlaneGeometry(PW * k.D / 512, PH * k.D / 512), pathMat);
    const pathHome = k.at(SUN[0], HZ + 3 + PH / 2, k.Z_BACK + 2.5);
    sunPath.position.copy(pathHome);
    sunPath.scale.setScalar(k.depthScale(k.Z_BACK + 2.5));
    sunPath.renderOrder = -16.5;
    root.add(sky, sun, sea, sunPath);

    /* ② the palm: a tapered, ringed trunk from the lower left rim, fronds, coconuts */
    const barkTex = k.canvasTexture(64, 64, (g, w, h) => {
      g.fillStyle = '#c3935c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d9ad73'; g.fillRect(0, 6, w, 10);
      g.strokeStyle = '#6e4a2a'; g.lineWidth = 5;
      g.beginPath(); for (let x = 0; x <= w; x += 16) { g.lineTo(x, h - 4); g.lineTo(x + 8, h - 12); } g.stroke();
      g.fillStyle = '#8a5e36'; g.fillRect(0, h - 4, w, 4);
    });
    barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
    const trunkZ = -20;
    const trunkPts = [[136, 512], [104, 428], [74, 344], [71, 270], [100, 200]].map(([u, v]) => k.at(u, v, trunkZ));
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPts, false, 'centripetal');
    const trunkGeo = tubeGeo(40, 12);
    const trunk = new THREE.Mesh(trunkGeo, k.clip(k.toon(0xffffff, { map: barkTex })));
    trunk.frustumCulled = false;
    const trunkInk = k.ink(trunk, 1.3);
    trunkInk.frustumCulled = false;
    root.add(trunk);
    const crownAt = trunkCurve.getPoint(1);
    const crown = new THREE.Group();
    crown.position.copy(crownAt);
    root.add(crown);
    const FRONDS = [
      // angle (deg, 0 = right, ccw), length, half width, droop, tilt (about its own axis), z, colour
      [104, 30, 6.2, 5, 0.3, -3.5, 0x3f8d45],
      [58, 36, 7, 9, -0.25, -3, 0x46994a],
      [150, 40, 7.4, 13, 0.35, -2, 0x4ea651],
      [16, 40, 7.2, 14, -0.3, -2.5, 0x3f9147],
      [188, 42, 7.2, 16, 0.2, -1, 0x56b058],
      [-28, 34, 6.6, 9, 0.3, -1.5, 0x4a9e4e],
      [222, 34, 6.6, 8, -0.3, 0, 0x5bb45b],
      [256, 26, 6, 5, 0.25, 0.5, 0x4fa652],
    ];
    const ribMat = k.clip(new THREE.MeshBasicMaterial({ color: 0x2c5f30 }));
    const fronds = FRONDS.map(([deg, L, W, droop, tilt, z, col], i) => {
      const { sh, rib } = frondShape(L, W, droop, 9);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false });
      geo.translate(0, 0, -0.4);
      const m = new THREE.Mesh(geo, k.clip(k.toon(col)));
      k.ink(m, 1.0);
      const rm = new THREE.Mesh(new THREE.ShapeGeometry(rib), ribMat);
      rm.position.z = 0.45;
      const blade = new THREE.Group();
      blade.add(m, rm);
      blade.rotation.x = tilt;
      const pivot = new THREE.Group();
      pivot.add(blade);
      pivot.position.z = z;
      pivot.userData = { a: (deg * Math.PI) / 180, i };
      crown.add(pivot);
      return pivot;
    });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), k.clip(k.toon(0x7a8f3c)));
    knob.scale.set(1.1, 0.8, 0.8);
    k.ink(knob, 1.0);
    crown.add(knob);
    const nuts = [[-3.2, -4.2, 2.6], [2.6, -4.8, 2], [-0.4, -6.8, 3.6]].map(([x, y, z]) => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(3, 14, 10), k.clip(k.toon(0x76492a)));
      n.position.set(x, y, z);
      k.ink(n, 1.0);
      crown.add(n);
      return n;
    });

    /* ③ her white cat (toon + ink): body, head (ears, blue eyes, pink nose, muzzle), paws, a tapered tail */
    const furGrad = new THREE.DataTexture(new Uint8Array([168, 212, 246, 255]), 4, 1, THREE.RedFormat);
    furGrad.minFilter = furGrad.magFilter = THREE.NearestFilter;
    furGrad.needsUpdate = true;
    own.push(furGrad);
    const fur = k.clip(k.toon(0xf7f3ec, { gradientMap: furGrad }));
    const pink = k.clip(new THREE.MeshBasicMaterial({ color: 0xf0a3ab }));
    const flat = (c) => k.clip(new THREE.MeshBasicMaterial({ color: c }));
    const cat = new THREE.Group();          // placement + show
    const pose = new THREE.Group();         // squash / stretch / lean about the feet
    const facing = new THREE.Group();       // turn about y
    cat.add(pose); pose.add(facing);
    const body = new THREE.Mesh(new THREE.LatheGeometry([[0.01, 0], [7, 0.2], [9.2, 1.8], [9.8, 4.6], [9.2, 8], [7.9, 11.2], [6.5, 14], [5.5, 16.4], [4.8, 18.3], [0.01, 19.4]].map(([r, y]) => new THREE.Vector2(r, y)), 28), fur);
    body.scale.z = 0.82;
    k.ink(body, 1.2);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(4.4, 16, 12), fur);   // fluffy bib
    chest.position.set(0, 12.2, 3.6);
    chest.scale.set(1, 1.25, 0.75);
    const haunches = [-1, 1].map(sx => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12), fur);
      h.position.set(sx * 6.2, 4.4, -1.2);
      h.scale.set(0.9, 1, 1);
      k.ink(h, 1.2);
      return h;
    });
    const head = new THREE.Group();
    head.position.set(0, 21.4, 0.8);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(6.8, 24, 18), fur);
    skull.scale.set(1.14, 0.93, 0.95);
    k.ink(skull, 1.2);
    head.add(skull);
    [-1, 1].forEach(sx => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(3.1, 14, 10), fur);
      cheek.position.set(sx * 5.3, -2.4, 1.6);
      cheek.scale.set(1, 0.78, 0.8);
      head.add(cheek);
    });
    const ears = [-1, 1].map(sx => {
      const ear = new THREE.Group();
      ear.position.set(sx * 4.2, 4.6, -0.6);
      ear.rotation.z = -sx * 0.36;
      const outer = new THREE.Mesh(new THREE.ConeGeometry(2.9, 5.4, 3, 1, false, Math.PI), fur);
      outer.position.y = 2.7;
      outer.scale.z = 0.62;
      k.ink(outer, 1.0);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(1.75, 3.7, 3, 1, false, Math.PI), pink);
      inner.position.set(0, 2.25, 0.35);
      inner.scale.z = 0.62;
      ear.add(outer, inner);
      head.add(ear);
      return ear;
    });
    const eyes = [-1, 1].map(sx => {
      const eye = new THREE.Group();
      eye.position.set(sx * 2.75, 0.9, 6.02);
      eye.rotation.y = sx * 0.34;
      const ring = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20), flat(0x1b1a22));
      const iris = new THREE.Mesh(new THREE.CircleGeometry(1.46, 20), flat(0x74bdf0));
      iris.position.z = 0.02;
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.82, 16), flat(0x121218));
      pupil.scale.set(0.55, 1.06, 1); pupil.position.z = 0.04;
      const hi = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), flat(0xffffff));
      hi.position.set(0.45, 0.55, 0.06);
      eye.add(ring, iris, pupil, hi);
      head.add(eye);
      return eye;
    });
    const noseShape = new THREE.Shape();
    noseShape.moveTo(-0.85, 0.35); noseShape.lineTo(0.85, 0.35); noseShape.lineTo(0, -0.6); noseShape.closePath();
    const nose = new THREE.Mesh(new THREE.ShapeGeometry(noseShape), flat(0xe47f8c));
    nose.position.set(0, -1.15, 6.5);
    head.add(nose);
    [-1, 1].forEach(sx => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1.55, 12, 8), fur);
      m.position.set(sx * 1.05, -2.35, 5.55);
      head.add(m);
    });
    const paws = [-1, 1].map(sx => {
      const p = new THREE.Mesh(new THREE.SphereGeometry(2.3, 14, 10), fur);
      p.position.set(sx * 3.2, 1.2, 6.2);
      p.scale.set(1, 0.72, 1.2);
      k.ink(p, 1.0);
      return p;
    });
    const tailGeo = tubeGeo(18, 8);
    const tail = new THREE.Mesh(tailGeo, fur);
    tail.frustumCulled = false;
    const tailInk = k.ink(tail, 1.1);
    tailInk.frustumCulled = false;
    facing.add(body, chest, ...haunches, head, ...paws, tail);
    const CAT_S = 1.1, CAT_Z = -12;             // deep enough that her blazer hides the peeking cat's paws
    const catSit = k.at(103, 194, CAT_Z), catPeek0 = k.at(160, 350, CAT_Z), catPeek = k.at(160, 305, CAT_Z);
    root.add(cat);
    const tailCurve = new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map(() => new THREE.Vector3()), false, 'centripetal');

    const tint = new THREE.Color();
    const tmp = new THREE.Vector3();

    return {
      update(t, e) {
        const ph = beatPh(t), bn = beatN(t);
        // backdrop: sky, sea, the sun comes up to sit on the horizon
        const sk = presence(t, e, 0.02, 0.42, ease.out, 0.7);
        skyMat.opacity = sk; seaMat.opacity = sk;
        const sp = presence(t, e, 0.14, 0.5, ease.outBack, 0.6);
        sunMat.opacity = Math.min(1, sk * 1.2);
        sun.visible = sp > 0.004;
        sun.position.set(sunHome.x, sunHome.y - (1 - sp) * 22, sunHome.z);
        pathMat.uniforms.uOp.value = presence(t, e, 0.4, 0.4, ease.out, 0.5);
        pathMat.uniforms.uT.value = t;
        plate.color.setRGB(1, 1 - 0.1 * sk, 1 - 0.2 * sk);
        person.color.copy(tint.setRGB(1, 1 - 0.04 * sk, 1 - 0.1 * sk));

        // palm: the trunk grows up from the rim, the crown opens (and pulls back in on the exit)
        const grow = ease.out(env(t, 0.14, 0.6)) * (1 - ease.in(clamp(e * 1.6 - 0.45)));
        trunk.visible = grow > 0.01;
        if (trunk.visible) {
          setTube(trunkGeo, (s, out) => trunkCurve.getPoint(s * grow, out),
            (s) => lerp(6.4, 4.4, s * grow) * (grow < 1 ? Math.max(0.2, Math.sqrt(clamp((1 - s) / 0.08))) : 1), 0, 1, 14 * grow);
        }
        trunkCurve.getPoint(grow, tmp);
        crown.position.copy(tmp);
        const land = t - T_LAND;
        const kick = land > 0 ? Math.exp(-land * 5) * Math.sin(land * 17) : 0;
        fronds.forEach((p) => {
          const { a, i } = p.userData;
          const f = presence(t, e, 0.46 + (i % 4) * 0.05, 0.4, (x) => ease.outBack(x, 2), 0.3);
          k.show(p, f);
          const open = (1 - Math.min(1, f)) * (a > Math.PI / 2 && a < Math.PI * 1.5 ? -0.5 : 0.5);
          p.rotation.z = a + open + 0.045 * Math.sin((t * TAU) / BEAT + i * 0.8) * env(t, 0.8, 1.4) - 0.07 * kick * Math.cos(a);
        });
        const kn = presence(t, e, 0.5, 0.3, ease.outBack, 0.3);
        k.show(knob, kn, 1);
        nuts.forEach((n, i) => k.show(n, presence(t, e, 0.62 + i * 0.05, 0.3, ease.outBack, 0.25)));

        // the cat: peeks up from behind her shoulder, leaps into the crown, squashes, turns, sits
        const cin = presence(t, e, T_PEEK, 0.12, ease.out, 0);
        k.show(cat, cin, CAT_S);
        let sx = 1, sy = 1, lean = 0, turn = -0.3, headTurn = 0, stream = 0;
        if (t < T_JUMP) {
          const pk = ease.outBack(env(t, T_PEEK, T_JUMP - 0.04), 1.4);
          cat.position.lerpVectors(catPeek0, catPeek, pk);
          const crouch = hump(t, T_JUMP - 0.12, T_JUMP - 0.03, T_JUMP);
          sx = 1 + 0.12 * crouch; sy = 1 - 0.14 * crouch;
          headTurn = 0.25 * hump(t, T_PEEK + 0.08, T_PEEK + 0.18, T_JUMP - 0.05);
        } else if (t < T_LAND) {
          const j = env(t, T_JUMP, T_LAND);
          const jj = ease.inOut(j) * 0.35 + j * 0.65;
          cat.position.lerpVectors(catPeek, catSit, jj);
          cat.position.y += Math.sin(Math.PI * j) * 20;
          sx = 0.88; sy = 1.16;
          lean = 0.45 * Math.sin(Math.PI * clamp(j * 1.3));
          stream = Math.sin(Math.PI * j);
          turn = lerp(-0.3, -0.1, j);
        } else {
          cat.position.copy(catSit);
          const sq = Math.exp(-land * 7) * Math.cos(land * 22);
          sx = 1 + 0.16 * sq; sy = 1 - 0.2 * sq;
          turn = lerp(-0.1, 0.3, ease.inOut(env(t, T_LAND + 0.05, T_LAND + 0.35)));
          headTurn = 0.18 * ease.inOut(env(t, T_LAND + 0.12, T_LAND + 0.42)) + 0.06 * Math.sin((t * TAU) / (BEAT * 2));
        }
        pose.scale.set(sx, sy, sx);
        pose.rotation.z = lean;
        facing.rotation.y = turn;
        head.rotation.set(0.04, headTurn, 0.06 * Math.sin((t * TAU) / BEAT + 0.6) * env(t, 1.4, 2));
        // slow blink each beat; an ear twitch on alternate beats
        const blink = ph >= 0 ? hump(ph, 1.9, 2.12, 2.55) : hump(t, T_LAND + 0.4, T_LAND + 0.47, T_LAND + 0.56);
        eyes.forEach(ey => { ey.scale.y = 1 - 0.9 * clamp(blink * 1.25); });
        const tw = ph >= 0 && bn % 2 === 1 ? hump(ph, 3.0, 3.06, 3.2) : 0;
        ears[0].rotation.z = 0.36 + 0.35 * tw;
        ears[1].rotation.z = -0.36;
        // tail: hangs over the crown, streams out in the leap, flicks each beat
        const flick = ph >= 0 ? Math.sin(Math.PI * clamp((ph - 0.25) / 0.7)) : 0;
        const sw = Math.sin(t * 1.9) * 0.9;
        const P = tailCurve.points;
        P[0].set(-3.6, 3.2, -5.2);
        P[1].set(lerp(-8.4, -9, stream), lerp(1.6, 3, stream), -3.6);
        P[2].set(lerp(-11.2, -15, stream), lerp(-5, 3.6, stream), -1.2);
        P[3].set(lerp(-10.6 + sw * 0.4, -20, stream), lerp(-12, 4, stream), 1);
        P[4].set(lerp(-7.6 + sw + 3.4 * flick, -24, stream), lerp(-16.4 + 5.2 * flick, 5.6, stream), lerp(2.2, 1, stream));
        setTube(tailGeo, (s, out) => tailCurve.getPoint(s, out), (s) => lerp(2.1, 1.0, s) * Math.max(0.25, Math.sqrt(clamp((1 - s) / 0.1))), 0, 1);
      },

      draw2d(q, t, e) {
        const fade = 1 - e;
        const ph = beatPh(t);
        q.strokeJoin(q.ROUND);
        q.strokeCap(q.ROUND);
        // two gulls gliding in the upper right sky (far away: they follow the tilt as depth -30)
        const ga = presence(t, e, 1.0, 0.35, ease.out, 0) ;
        if (ga > 0.01) {
          [[372, 86, 0, 1], [420, 128, 1.7, 0.8]].forEach(([u, v, off, sc]) => {
            const du = Math.sin(t * 0.45 + off) * 10, dv = Math.sin(t * 0.8 + off) * 4;
            const [x, y] = k.screenAt(u + du, v + dv, -30);
            const flap = Math.sin(t * 5.2 + off * 2) * (0.5 + 0.5 * Math.sin(t * 0.9 + off)) ;
            const w = 8.5 * sc, h = (3.2 + 2 * flap) * sc;
            q.noFill();
            q.stroke(42, 30, 72, 255 * ga); q.strokeWeight(2 * sc);
            q.beginShape(); q.vertex(x - w, y - h * 0.3); q.quadraticVertex(x - w * 0.5, y - h, x, y); q.quadraticVertex(x + w * 0.5, y - h, x + w, y - h * 0.3); q.endShape();
          });
        }
        // the sea twinkles on the sun path
        if (t > 0.9 && fade > 0) {
          [[430, 318, 0.2], [468, 334, 1.4], [446, 352, 2.5]].forEach(([u, v, off]) => {
            const p = ((t - 0.9 + BEAT - off) % BEAT) / BEAT;
            const a = Math.sin(Math.PI * clamp(p / 0.14)) * fade;
            if (a < 0.02) return;
            const [x, y] = k.screenAt(u, v, -33);
            const r = 3.4 * a;
            q.noStroke(); q.fill(255, 250, 222, 255 * a);
            q.beginShape();
            for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU, rr = i % 2 ? r * 0.28 : r; q.vertex(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
            q.endShape(q.CLOSE);
          });
        }
        // the landing: little impact ticks round the crown
        const lt = hump(t, T_LAND, T_LAND + 0.05, T_LAND + 0.25) * fade;
        if (lt > 0.01) {
          const [cx, cy] = k.screenAt(103, 194, CAT_Z);
          q.stroke(40, 30, 60, 230 * lt); q.strokeWeight(1.4);
          [[-1, 0.2], [1, 0.2], [-1, -0.5], [1, -0.5]].forEach(([s, a]) => {
            const r0 = 9 + (1 - lt) * 3, x = cx + s * r0 * Math.cos(a), y = cy - 2 - r0 * Math.sin(a);
            q.line(x, y, x + s * 3.5 * Math.cos(a), y - 3.5 * Math.sin(a));
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
