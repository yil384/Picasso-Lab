/* Zhengding — Sunshine (an affectionate "five-star general" parody)
   Click: the sky over the Golden Gate warms and god-rays sweep in from a sun at the
   upper left; a peaked officer's cap drops onto his head, aviator sunglasses slide
   down onto his eyes, a corncob pipe swings into the corner of his mouth (smoke curls
   up), and ribbon bars + star medals pin onto his jacket one by one. Then the hero
   moment: a comic sun-burst flash and "SUNSHINE!" lettering (once per activation).
   Loop (3.6 s): the rays breathe, the smoke curls, a glint crosses the sunglasses,
   one medal twinkles.
   Photo landmarks (512 px): head top 234,166 · hair u 179..289 · hairline v 197 ·
   brows v 224 · eyes 211,243 / 258,243 · mouth corner 214,287 · left chest 345,395. */
import { THREE, presence, env, ease, clamp } from './kit.js';

const INK = 0x16151a;
const GOLD = 0xf0b93a, KHAKI = 0xa38f5a, BAND = 0x3b2f1f, VISOR = 0x221d19;
const BEAT = 3.6, LOOP0 = 1.4;
const TAU = Math.PI * 2;

/* rays: [angle (rad, world, from +x, y up), far width, strength, depth at the far end] */
const RAYS = [
  [0.06, 22, 0.22, -20], [-0.16, 34, 0.30, -14], [-0.36, 18, 0.26, -24], [-0.52, 40, 0.34, -10],
  [-0.72, 22, 0.26, -18], [-0.9, 30, 0.28, -8], [-1.08, 16, 0.22, -22], [-1.26, 26, 0.20, -12],
  [-1.45, 14, 0.16, -20], [0.3, 14, 0.14, -24],
];

export default {
  title: 'Sunshine',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const own = [];                      // textures / materials we must free ourselves
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const fitUV = (geo) => {             // uv = position xy normalised to the bounding box
      geo.computeBoundingBox();
      const b = geo.boundingBox, p = geo.attributes.position, uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        uv[i * 2] = (p.getX(i) - b.min.x) / (b.max.x - b.min.x);
        uv[i * 2 + 1] = (p.getY(i) - b.min.y) / (b.max.y - b.min.y);
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      return geo;
    };
    const starShape = (ro, ri, n = 5) => {
      const s = new THREE.Shape();
      for (let i = 0; i < n * 2; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? ri : ro;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      return s;
    };

    /* ① sun + warm sky wash + god-rays, all behind him and inside the circle */
    const SUN_UV = [112, 108];
    const sunPos = k.at(SUN_UV[0], SUN_UV[1], -30);
    const wash = new THREE.Mesh(new THREE.CircleGeometry(k.R, 96), k.clip(new THREE.MeshBasicMaterial({
      map: k.canvasTexture(256, 256, (g) => {
        const sx = SUN_UV[0] / 2, sy = SUN_UV[1] / 2;
        const gr = g.createRadialGradient(sx, sy, 0, sx, sy, 250);
        gr.addColorStop(0, 'rgba(255,236,170,0.95)');
        gr.addColorStop(0.22, 'rgba(255,196,110,0.55)');
        gr.addColorStop(0.6, 'rgba(255,160,70,0.18)');
        gr.addColorStop(1, 'rgba(255,140,60,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      }),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    })));
    wash.position.z = k.Z_BACK + 1;
    wash.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    wash.renderOrder = -17;
    root.add(wash);

    const rayMat = (color, strength) => k.clip(new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
        void main() {
          float along = vUv.x, across = abs(vUv.y - 0.5) * 2.0;
          float a = pow(1.0 - along, 0.85) * (1.0 - smoothstep(0.62, 0.98, across)) * smoothstep(0.0, 0.1, along);
          gl_FragColor = vec4(uColor, a * uOpacity);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    const rays = new THREE.Group();
    rays.position.copy(sunPos);
    root.add(rays);
    const rayList = RAYS.map(([ang, w, s, zEnd], i) => {
      const L = 250;
      const geo = new THREE.BufferGeometry();
      // quad: apex (narrow) at the sun, far edge L away; the far end leans toward the viewer (3D fan)
      const z1 = zEnd - (-30);
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1.2, 0, 0, 1.2, 0, L, -w / 2, z1, L, w / 2, z1]), 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2));
      geo.setIndex([0, 2, 1, 1, 2, 3]);
      const m = new THREE.Mesh(geo, rayMat(i % 3 === 1 ? 0xffc766 : 0xffe19a, s));
      m.renderOrder = -16;
      m.userData = { ang, s, ph: i * 1.7 };
      rays.add(m);
      return m;
    });

    // the sun: a flat comic disc (cream core, gold ring, ink edge) with a soft halo
    const sun = new THREE.Group();
    const sunRing = new THREE.Mesh(new THREE.CircleGeometry(11.5, 48), k.clip(new THREE.MeshBasicMaterial({ color: 0xffc94a })));
    const sunCore = new THREE.Mesh(new THREE.CircleGeometry(9, 48), k.clip(new THREE.MeshBasicMaterial({ color: 0xfff7d6 })));
    sunCore.position.z = 0.1;
    const sunEdge = new THREE.Mesh(new THREE.RingGeometry(11.5, 12.6, 48), k.clip(new THREE.MeshBasicMaterial({ color: 0xe0902a })));
    const halo = k.glowSprite('rgba(255,226,140,0.9)', 70, 0);
    k.clip(halo.material);
    halo.position.z = -0.5;
    const corona = new THREE.Group();
    const spikeGeo = new THREE.BufferGeometry();
    spikeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-2.6, 13.2, 0, 2.6, 13.2, 0, 0, 19.5, 0]), 3));
    const spikeInkGeo = new THREE.BufferGeometry();
    spikeInkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-3.5, 12.6, -0.05, 3.5, 12.6, -0.05, 0, 20.8, -0.05]), 3));
    const spikeMat = k.clip(new THREE.MeshBasicMaterial({ color: 0xffc94a, side: THREE.DoubleSide }));
    const spikeInk = k.clip(new THREE.MeshBasicMaterial({ color: 0xe0902a, side: THREE.DoubleSide }));
    for (let i = 0; i < 12; i++) {
      const a = new THREE.Mesh(spikeGeo, spikeMat), b = new THREE.Mesh(spikeInkGeo, spikeInk);
      a.rotation.z = b.rotation.z = (i / 12) * TAU;
      a.renderOrder = b.renderOrder = -15;
      corona.add(b, a);
    }
    sun.add(halo, corona, sunRing, sunEdge, sunCore);
    [sunRing, sunCore, sunEdge].forEach(m => { m.renderOrder = -15; });
    halo.renderOrder = -15.5;
    sun.position.copy(sunPos);
    root.add(sun);

    /* ② the peaked officer's cap: khaki crown, dark band with a gold cord, black visor with gold trim */
    const cap = new THREE.Group();          // shown / scaled by k.show
    const capFit = new THREE.Group();       // squash on landing
    cap.add(capFit);
    const RB = 22.5, RZ = 0.84;             // band radius (x), depth ratio
    const band = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, 7, 48, 1, false), k.toon(BAND));
    band.geometry.scale(1, 1, RZ);
    band.position.y = 3.5;
    k.ink(band, 1.2);
    const prof = [[RB - 0.3, 0], [RB + 2.2, 1.6], [RB + 4.6, 4.2], [RB + 5.4, 6.6], [RB + 4.4, 8.6], [RB, 10], [14, 10.9], [6, 11.3], [0.01, 11.4]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const crownGeo = new THREE.LatheGeometry(prof, 48);
    crownGeo.scale(1, 1, RZ);
    {                                        // saddle: the front of the crown stands up, the sides sag
      const p = crownGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const f = clamp(y / 6);
        const front = Math.max(0, z / (RB * RZ + 5));
        const side = Math.abs(x) / (RB + 5);
        p.setY(i, y + f * (4.2 * Math.pow(front, 1.5) - 1.2 * side * side));
      }
      crownGeo.computeVertexNormals();
    }
    const crown = new THREE.Mesh(crownGeo, k.toon(KHAKI));
    crown.position.y = 7;
    k.ink(crown, 1.3);
    // visor: a half annulus in front of the band, bent down 32 degrees
    const vs = new THREE.Shape();
    const VI = [RB, RB * RZ], VO = [RB + 2.2, RB * RZ + 11];
    for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI; vs.lineTo(VO[0] * Math.cos(a), VO[1] * Math.sin(a)); }
    for (let i = 24; i >= 0; i--) { const a = (i / 24) * Math.PI; vs.lineTo(VI[0] * Math.cos(a), VI[1] * Math.sin(a) - 0.6); }
    const bendVisor = (geo, drop) => {
      geo.rotateX(Math.PI / 2);                // shape y -> +z (forward), extrusion goes down
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const zin = VI[1] * Math.sqrt(Math.max(0, 1 - (x / VI[0]) ** 2));
        p.setY(i, p.getY(i) - drop * Math.max(0, z - zin));
      }
      geo.computeVertexNormals();
      return geo;
    };
    const visorGeo = bendVisor(new THREE.ExtrudeGeometry(vs, { depth: 0.9, bevelEnabled: false, curveSegments: 24 }), 0.62);
    const visor = new THREE.Mesh(visorGeo, k.toon(VISOR));
    visor.position.y = 0.9;
    k.ink(visor, 1.1);
    // gold trim along the visor's edge (the "scrambled eggs", simplified to a braid)
    const trimS = new THREE.Shape();
    const TO = [VO[0] - 0.4, VO[1] - 0.5], TI = [VO[0] - 0.9, VO[1] - 3.6];
    for (let i = 0; i <= 24; i++) { const a = 0.12 + (i / 24) * (Math.PI - 0.24); trimS.lineTo(TO[0] * Math.cos(a), TO[1] * Math.sin(a)); }
    for (let i = 24; i >= 0; i--) { const a = 0.16 + (i / 24) * (Math.PI - 0.32); trimS.lineTo(TI[0] * Math.cos(a), TI[1] * Math.sin(a)); }
    const trim = new THREE.Mesh(bendVisor(new THREE.ExtrudeGeometry(trimS, { depth: 0.3, bevelEnabled: false, curveSegments: 24 }), 0.62), k.toon(GOLD));
    trim.position.y = 1.15;
    // gold chin cord across the front of the band + two buttons
    const cordPts = [];
    for (let i = 0; i <= 20; i++) { const a = 0.35 + (i / 20) * (Math.PI - 0.7); cordPts.push(new THREE.Vector3((RB + 0.7) * Math.cos(a), 2.4 + 0.6 * Math.sin(a), (RB * RZ + 0.7) * Math.sin(a))); }
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 40, 0.75, 6, false), k.toon(GOLD));
    k.ink(cord, 0.8);
    const buttons = [0.35, Math.PI - 0.35].map(a => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), k.toon(GOLD));
      b.position.set((RB + 0.9) * Math.cos(a), 2.4 + 0.6 * Math.sin(a), (RB * RZ + 0.9) * Math.sin(a));
      k.ink(b, 0.8);
      return b;
    });
    // badge: gold wreath ring with a white star, on the raised front of the crown
    const badge = new THREE.Group();
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.85, 8, 28), k.toon(GOLD));
    k.ink(wreath, 0.9);
    const bStar = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(3.1, 1.3), { depth: 0.6, bevelEnabled: false }), k.toon(0xfff4d8));
    k.ink(bStar, 0.8);
    badge.add(wreath, bStar);
    badge.position.set(0, 13.4, RB * RZ + 3.6);
    badge.rotation.x = -0.32;
    capFit.add(band, crown, visor, trim, cord, ...buttons, badge);
    capFit.rotation.set(0.1, 0, 0);
    const capHome = k.at(234, 203, 4);
    cap.position.copy(capHome);
    cap.rotation.z = 0.035;
    root.add(cap);

    /* ③ aviator sunglasses: gold wire frame, mirrored teardrop lenses with a sweeping glint */
    const glasses = new THREE.Group();
    const lensPts = [[-8.2, 5.8], [-3, 6.5], [3, 6.8], [8.4, 6.4], [9.9, 3.4], [9.6, -1.5], [7.4, -6.2], [3.2, -8.9], [-1.6, -8.9], [-5.8, -6.4], [-8.6, -2.4], [-9.4, 1.8]];
    const lensMat = new THREE.ShaderMaterial({
      uniforms: { uGlint: { value: -80 } },
      vertexShader: `varying vec2 vP; varying vec2 vW;
        void main() { vP = position.xy; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xy;
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uGlint; varying vec2 vP; varying vec2 vW;
        void main() {
          float y = vP.y;
          vec3 c;
          if (y > -1.2) {                       // sky in the mirror: teal at the horizon, dark at the top
            float s = clamp((y + 1.2) / 8.0, 0.0, 1.0);
            c = s < 0.4 ? vec3(0.17, 0.31, 0.35) : vec3(0.07, 0.11, 0.14);
          } else {                              // warm ground / sun reflection below the horizon
            float s = clamp((-1.2 - y) / 7.8, 0.0, 1.0);
            c = s < 0.32 ? vec3(0.86, 0.58, 0.24) : vec3(0.27, 0.15, 0.08);
          }
          float sl = vP.y - vP.x * 1.1;
          float streak = (step(abs(sl - 7.6), 0.65) + step(abs(sl - 10.0), 0.3)) * step(-1.0, vP.y);
          c = mix(c, vec3(0.92, 0.97, 1.0), streak * 0.85);
          float d = (vW.x + 0.55 * vW.y) - uGlint;
          c += vec3(1.0, 0.98, 0.9) * (smoothstep(2.4, 0.0, abs(d)) * 0.95 + smoothstep(1.0, 0.0, abs(d - 4.2)) * 0.6);
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    own.push(lensMat);
    const frameMat = k.toon(GOLD);
    const LX = 11.7;
    [-1, 1].forEach(sx => {
      const lens = new THREE.Group();
      const shape = new THREE.Shape();
      const pts = lensPts.map(([x, y]) => new THREE.Vector2(x * sx, y));
      shape.moveTo(pts[0].x, pts[0].y);
      shape.splineThru([...pts.slice(1), pts[0]]);
      const face = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), lensMat);
      const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0.2)), true), 72, 0.62, 6, true), frameMat);
      k.ink(rim, 1.0);
      // hinge stub toward the ear
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.1), frameMat);
      hinge.position.set(sx * 10.6, 5.2, -0.4);
      k.ink(hinge, 0.8);
      lens.add(face, rim, hinge);
      lens.position.x = sx * LX;
      lens.rotation.y = -sx * 0.14;
      glasses.add(lens);
    });
    // double bridge: a straight brow bar and an arched nose bridge
    const brow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-LX + 6.5, 6.9, 0.6), new THREE.Vector3(0, 7.3, 0.9), new THREE.Vector3(LX - 6.5, 6.9, 0.6)]), 16, 0.55, 6, false), frameMat);
    const nose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-LX + 8.6, 3.2, 0.5), new THREE.Vector3(0, 4.8, 1.0), new THREE.Vector3(LX - 8.6, 3.2, 0.5)]), 16, 0.6, 6, false), frameMat);
    k.ink(brow, 0.8); k.ink(nose, 0.8);
    glasses.add(brow, nose);
    const glassesHome = k.at(232, 247, 12);
    glasses.position.copy(glassesHome);
    root.add(glasses);

    /* ④ corncob pipe in the corner of his mouth (his real lips re-layered over the stem end) */
    const pipe = new THREE.Group();
    const pipeTilt = new THREE.Group();
    pipe.add(pipeTilt);
    const STEM = 17, STEM_A = -2.62;             // stem direction: down-left
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.2, STEM, 10), k.toon(0xd8c38a));
    stem.geometry.rotateZ(Math.PI / 2);          // along x
    stem.geometry.translate(STEM / 2, 0, 0);
    stem.rotation.z = STEM_A;
    k.ink(stem, 0.9);
    const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 3.2, 10), k.toon(0x1d1a18));
    bit.geometry.rotateZ(Math.PI / 2);
    bit.geometry.translate(1.2, 0, 0);
    bit.rotation.z = STEM_A;
    const ex = Math.cos(STEM_A) * STEM, ey = Math.sin(STEM_A) * STEM;
    const cobTex = k.canvasTexture(128, 128, (g) => {
      g.fillStyle = '#c99a4a'; g.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) {
        const x = c * 10.7 + (r % 2) * 5.3 + 5, y = r * 14 + 7;
        g.fillStyle = '#8a5f28'; g.beginPath(); g.ellipse(x, y + 1.5, 5, 6, 0, 0, TAU); g.fill();
        g.fillStyle = '#e8c27a'; g.beginPath(); g.ellipse(x - 0.8, y, 4, 5, 0, 0, TAU); g.fill();
      }
    });
    cobTex.wrapS = THREE.RepeatWrapping;
    const bowl = new THREE.Group();
    const cob = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.2, 11.5, 20, 1, true), k.toon(0xffffff, { map: cobTex }));
    k.ink(cob, 1.1);
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.75, 8, 24), k.toon(0xe0b565));
    rimT.rotation.x = Math.PI / 2;
    rimT.position.y = 5.75;
    k.ink(rimT, 0.9);
    const ash = new THREE.Mesh(new THREE.CircleGeometry(3.7, 20), new THREE.MeshBasicMaterial({ color: 0x2a1a10 }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.y = 5.5;
    const ember = new THREE.Mesh(new THREE.CircleGeometry(2.1, 16), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.8 }));
    ember.rotation.x = -Math.PI / 2;
    ember.position.y = 5.6;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.9, 1.6, 20), k.toon(0x8a5f28));
    base.position.y = -6.3;
    k.ink(base, 0.9);
    bowl.add(cob, rimT, ash, ember, base);
    bowl.position.set(ex - 3.4, ey + 3.6, 0.5);
    bowl.rotation.set(0.42, 0, 0.08);            // tip the mouth of the bowl toward the viewer
    pipeTilt.add(stem, bit, bowl);
    const pipeHome = k.at(224, 288, 5);
    pipe.position.copy(pipeHome);
    root.add(pipe);
    const lips = k.patch([[212, 283], [218, 279], [229, 279], [233, 283], [233, 292], [224, 296], [214, 293], [211, 288]], 9);
    const bowlTop = new THREE.Vector3(0, 7.5, 0);   // local to the bowl; smoke starts here
    const tmp = new THREE.Vector3();

    /* ⑤ ribbon rack (2 x 3 bars) + three star medals, on his left chest */
    const rack = new THREE.Group();
    const RIB = [
      ['#b3202a', '#ffffff', '#1f3c88', '#ffffff', '#b3202a'], ['#e8b923', '#1f7a3a', '#e8b923'], ['#1f3c88', '#e8b923', '#1f3c88'],
      ['#6b2a8a', '#ffffff', '#6b2a8a'], ['#c8302a', '#e8b923', '#c8302a', '#e8b923', '#c8302a'], ['#2a8a9a', '#ffffff', '#c8302a', '#ffffff', '#2a8a9a'],
    ];
    const DRAPE = [['#1f3c88', '#ffffff', '#c8302a', '#ffffff', '#1f3c88'], ['#c8302a', '#ffffff', '#c8302a'], ['#e8b923', '#1f3c88', '#e8b923']];
    const stripes = (cols, w = 64, h = 32) => k.canvasTexture(w, h, (g) => {
      const n = cols.length, widths = cols.map((_, i) => (i === (n - 1) / 2 ? 2.2 : 1));
      const sum = widths.reduce((a, b) => a + b, 0);
      let x = 0;
      cols.forEach((c, i) => { const ww = (widths[i] / sum) * w; g.fillStyle = c; g.fillRect(x, 0, ww + 0.5, h); x += ww; });
    });
    const pins = [];
    const BW = 8.6, BH = 3.3;
    RIB.forEach((cols, i) => {
      const tex = stripes(cols);
      const m = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, 1.1), [
        k.toon(0x444444), k.toon(0x444444), k.toon(0x444444), k.toon(0x444444), k.toon(0xffffff, { map: tex }), k.toon(0x444444)]);
      k.ink(m, 0.9);
      const r = Math.floor(i / 3), c = i % 3;
      const holder = new THREE.Group();
      holder.add(m);
      holder.position.set((c - 1) * (BW + 0.35) + r * 1.2, -r * (BH + 0.4), 0);
      rack.add(holder);
      pins.push({ obj: holder, t0: 0.84 + r * 0.1 + c * 0.03 });
    });
    const drapeShape = new THREE.Shape();
    drapeShape.moveTo(-3, 0); drapeShape.lineTo(3, 0); drapeShape.lineTo(3, -5.2); drapeShape.lineTo(0, -6.6); drapeShape.lineTo(-3, -5.2); drapeShape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(starShape(4.6, 2.0), { depth: 0.9, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 1 });
    starGeo.translate(0, 0, -0.45);
    const starMat = k.toon(GOLD);
    const medalStars = [];
    DRAPE.forEach((cols, i) => {
      const holder = new THREE.Group();
      const drape = new THREE.Mesh(fitUV(new THREE.ShapeGeometry(drapeShape)), k.toon(0xffffff, { map: stripes(cols, 32, 32), side: THREE.DoubleSide }));
      const drapeInk = new THREE.Mesh(fitUV(new THREE.ShapeGeometry(drapeShape)), new THREE.MeshBasicMaterial({ color: INK }));
      drapeInk.scale.set(1.14, 1.08, 1); drapeInk.position.set(0, 0.25, -0.3);
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(0, -10.4, 0.8);
      star.rotation.z = (i - 1) * 0.08;
      k.ink(star, 1.0);
      holder.add(drapeInk, drape, star);
      holder.position.set((i - 1) * (BW + 0.35) + 1.2, -2 * (BH + 0.4) + 0.2, 0.6);
      rack.add(holder);
      pins.push({ obj: holder, t0: 1.06 + i * 0.075 });
      medalStars.push(star);
    });
    rack.position.copy(k.at(344, 390, 6));
    rack.rotation.set(-0.12, 0.18, 0.06);
    rack.scale.setScalar(1.12);
    root.add(rack);

    const tint = new THREE.Color();
    const glintX = (t) => {                     // one glint pass per beat, 0.5 s long
      if (t < LOOP0 - 0.3) return -80;
      const ph = (t - (LOOP0 - 0.3)) % BEAT;
      return ph < 0.55 ? -34 + (ph / 0.55) * 52 : -80;
    };

    return {
      update(t, e) {
        // sky warms (plate tint + additive wash round the sun)
        k.layers.photo.material.opacity = 1;   // the plate fades in over an opaque photo (no see-through mid-fade)
        const sky = presence(t, e, 0, 0.5, ease.out, 0);
        k.layers.plate.material.color.copy(tint.setRGB(1, 1 - 0.12 * sky, 1 - 0.36 * sky));
        k.layers.person.material.color.copy(tint.setRGB(1, 1 - 0.03 * sky, 1 - 0.1 * sky));
        const flash = hump(t, 1.0, 1.1, 1.7) * (1 - e);
        wash.material.opacity = sky * (0.4 + 0.05 * Math.sin((t * TAU) / BEAT) + 0.4 * flash);

        // sun
        const sp = presence(t, e, 0.02, 0.45, ease.outBack, 0.2);
        k.show(sun, sp, 1 + 0.25 * flash + 0.03 * Math.sin((t * TAU) / BEAT));
        halo.material.opacity = Math.min(1, sp) * (0.45 + 0.4 * flash);
        halo.scale.setScalar(56 + 30 * flash);
        corona.rotation.z = -t * 0.12;

        // god-rays sweep in (fan swings down from above), then breathe
        const rp = presence(t, e, 0.12, 0.7, ease.out, 0.1);
        rays.rotation.z = (1 - rp) * 0.7 + 0.025 * Math.sin((t * TAU) / (BEAT * 2));
        rays.visible = rp > 0.004;
        for (const m of rayList) {
          const { ang, s, ph } = m.userData;
          m.rotation.z = ang;
          m.scale.set(0.2 + 0.8 * rp, 1, 1);
          const br = 0.72 + 0.28 * Math.sin((t * TAU) / BEAT + ph);
          m.material.uniforms.uOpacity.value = rp * s * (br + 0.9 * flash) * 1.25;
        }

        // cap drops onto his head, squashes a little, settles
        const cp = presence(t, e, 0.28, 0.42, ease.out, 0.5);
        k.show(cap, Math.min(1, cp * 1.6));
        const land = env(t, 0.62, 0.95);
        const squash = Math.sin(land * Math.PI) * (1 - land) * 0.16;
        capFit.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
        const lift = ease.in(clamp(e * 1.6 - 0.3));
        cap.position.set(capHome.x - lift * 10, capHome.y + (1 - cp) * 26 + lift * 34, capHome.z);
        cap.rotation.z = 0.035 + (1 - cp) * 0.25 - lift * 0.4;

        // sunglasses slide down from under the visor onto his eyes
        const gp = presence(t, e, 0.56, 0.36, ease.outBack, 0.35);
        k.show(glasses, Math.min(1, gp * 2.2));
        glasses.position.set(glassesHome.x, glassesHome.y + (1 - gp) * 11, glassesHome.z);
        lensMat.uniforms.uGlint.value = glintX(t) + (t < 1.0 ? -80 : 0);

        // pipe swings into the corner of his mouth
        const pp = presence(t, e, 0.72, 0.38, ease.outBack, 0.25);
        k.show(pipe, Math.min(1, pp * 2));
        pipeTilt.rotation.z = (1 - pp) * -0.9 + 0.03 * Math.sin((t * TAU) / BEAT + 0.8);
        lips.visible = pp > 0.004;
        ember.material.opacity = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.2));

        // ribbon bars and medals pin on one by one (a small stamp toward his chest)
        pins.forEach(({ obj, t0 }, i) => {
          const a = presence(t, e, t0, 0.24, ease.outBack, 0.1 + i * 0.05);
          k.show(obj, Math.min(1.2, a * (1 + 0.5 * (1 - env(t, t0, t0 + 0.24)))));
          obj.position.z = (1 - Math.min(1, a)) * 10 + (i >= 6 ? 0.6 : 0);
        });
        medalStars.forEach((s, i) => { s.rotation.y = 0.18 * Math.sin((t * TAU) / BEAT + i * 1.3); });
      },

      draw2d(q, t, e) {
        const c = q.drawingContext;
        const fade = 1 - e;
        const [cx, cy] = k.screenAt(256, 256, 0);
        const [sx, sy] = k.toScreen(sunPos);

        // hero moment: a comic sun-burst from the sun + a lens-flare streak, clipped to the avatar
        const hb = env(t, 0.98, 1.16), hout = 1 - env(t, 1.3, 1.85);
        const burst = ease.outBack(hb) * hout * fade;
        if (burst > 0.01) {
          c.save();
          c.beginPath(); c.arc(cx, cy, k.R + 1, 0, TAU); c.clip();
          const spikes = 16, R1 = 52 * burst, R2 = 30 * burst;
          q.stroke(22, 21, 26, 210 * hout); q.strokeWeight(1.6); q.strokeJoin(q.ROUND);
          q.fill(255, 238, 150, 215 * hout);
          q.beginShape();
          for (let i = 0; i < spikes * 2; i++) {
            const a = (i / (spikes * 2)) * TAU + 0.2 + t * 0.4;
            const r = i % 2 ? R2 : R1 * (i % 4 === 0 ? 1 : 0.78);
            q.vertex(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
          }
          q.endShape(q.CLOSE);
          q.noStroke(); q.fill(255, 253, 236, 240 * hout);
          q.circle(sx, sy, 34 * burst);
          // anamorphic streak through the sun
          q.stroke(255, 250, 225, 200 * hout); q.strokeWeight(2.2);
          q.line(sx - 70 * burst, sy + 5 * burst, sx + 150 * burst, sy - 11 * burst);
          q.stroke(255, 214, 120, 120 * hout); q.strokeWeight(5);
          q.line(sx - 40 * burst, sy + 3 * burst, sx + 110 * burst, sy - 8 * burst);
          // two flat flare ghosts toward his cap
          q.strokeWeight(1); q.stroke(255, 246, 210, 170 * hout);
          [[0.36, 7, [255, 214, 130]], [0.56, 4.5, [170, 220, 255]]].forEach(([f, r, col]) => {
            const gx = sx + (cx - sx) * f, gy = sy + (cy - sy) * f;
            q.fill(col[0], col[1], col[2], 90 * hout);
            q.beginShape();
            for (let j = 0; j < 6; j++) q.vertex(gx + Math.cos(j * TAU / 6) * r * burst, gy + Math.sin(j * TAU / 6) * r * burst);
            q.endShape(q.CLOSE);
          });
          c.restore();
        }

        // "SUNSHINE!" lettering: pops once with the flash, then leaves
        const lp = ease.outBack(env(t, 1.04, 1.3), 2.2) * (1 - ease.in(env(t, 2.95, 3.25))) * fade;
        if (lp > 0.01) {
          const [lx, ly] = k.screenAt(300, 92, 0);
          q.push();
          q.translate(lx, ly);
          q.rotate(-0.16);
          q.scale(lp);
          q.textFont("'Arial Black', Impact, sans-serif");
          q.textSize(15.5);
          q.textAlign(q.CENTER, q.CENTER);
          q.strokeJoin(q.ROUND);
          q.fill(22, 21, 26); q.stroke(22, 21, 26); q.strokeWeight(5);
          q.text('SUNSHINE!', 1.6, 1.8);
          q.fill(255, 214, 74); q.stroke(22, 21, 26); q.strokeWeight(3.2);
          q.text('SUNSHINE!', 0, 0);
          q.noStroke(); q.fill(255, 214, 74);
          q.text('SUNSHINE!', 0, 0);
          q.fill(255, 248, 214, 230);
          q.textSize(15.5);
          c.save(); c.beginPath(); c.rect(-80, -12, 160, 7); c.clip();
          q.text('SUNSHINE!', 0, 0);
          c.restore();
          q.pop();
        }

        // pipe smoke: three slow curling wisps + a puff now and then (comic: white core, grey edge)
        const sm = presence(t, e, 0.95, 0.5, ease.out, 0.25);
        if (sm > 0.01) {
          bowl.localToWorld(tmp.copy(bowlTop));
          root.worldToLocal(tmp);
          const [bx, by] = k.toScreen(tmp);
          const rise = Math.min(1, env(t, 0.95, 1.6) * 1.2 + e * 0);
          for (let pass = 0; pass < 2; pass++) {
            for (let w = 0; w < 3; w++) {
              const H = (30 + w * 8) * (0.3 + 0.7 * rise);
              const N = 18;
              let px = bx, py = by;
              for (let j = 1; j <= N; j++) {
                const s = j / N;
                const x = bx + Math.sin(s * 5.4 + w * 2.1 - t * 1.4) * (0.8 + 7 * s) - s * (7 + w * 3) - s * s * (6 + w * 4);
                const y = by - s * H;
                const a = Math.pow(1 - s, 0.9) * sm * (w === 1 ? 1 : 0.7);
                const wt = ((w === 1 ? 4.4 : 3.2) - 2.2 * s) * (0.55 + 0.45 * Math.min(1, s * 4));
                if (pass === 0) { q.stroke(110, 104, 100, 95 * a); q.strokeWeight(wt + 2); }
                else { q.stroke(255, 253, 248, 235 * a); q.strokeWeight(wt); }
                q.line(px, py, x, y);
                px = x; py = y;
              }
              if (w === 1) {                     // a curl at the top of the main wisp
                const cr = 3.2, cx0 = px - cr * 0.6, cy0 = py + 0.5;
                const a = 0.35 * sm;
                if (pass === 0) { q.stroke(110, 104, 100, 95 * a); q.strokeWeight(2.8); } else { q.stroke(255, 253, 248, 235 * a); q.strokeWeight(1.4); }
                q.noFill();
                q.arc(cx0, cy0, cr * 2, cr * 2, -0.3 + Math.sin(t) * 0.2, 3.6 + Math.sin(t) * 0.2);
              }
            }
          }
          // soft puffs drifting off
          q.noStroke();
          for (let i = 0; i < 2; i++) {
            const p = ((t - 0.95) / 2.6 + i * 0.5) % 1;
            if (p < 0) continue;
            const x = bx - 5 - 12 * p + Math.sin(p * 6 + i) * 2.5, y = by - 16 - 34 * p;
            const r = 2 + 3.2 * p, a = Math.sin(p * Math.PI) * sm;
            q.fill(255, 253, 248, 110 * a);
            q.circle(x, y, r * 2); q.circle(x + r * 0.8, y + r * 0.35, r * 1.5);
          }
        }

        // a "ting" star where the glint leaves the lens, and a twinkle on one medal, once per beat
        const star4 = (x, y, r, a) => {
          q.stroke(22, 21, 26, 220 * a); q.strokeWeight(1); q.fill(255, 255, 255, 255 * a);
          q.beginShape();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r; const an = (i / 8) * TAU; q.vertex(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
          q.endShape(q.CLOSE);
        };
        if (t > LOOP0 - 0.3) {
          const ph = (t - (LOOP0 - 0.3)) % BEAT;
          const g = hump(ph, 0.35, 0.47, 0.72) * fade;
          if (g > 0.01) { const [gx, gy] = k.screenAt(274, 234, 14); star4(gx, gy, 6.5 * g, g); }
          const m = hump(ph, 1.5, 1.62, 1.9) * fade;
          if (m > 0.01) {
            medalStars[1].getWorldPosition(tmp); root.worldToLocal(tmp);
            const [mx, my] = k.toScreen(tmp);
            star4(mx + 3.5, my - 3.5, 5.5 * m, m);
          }
        }
        // tiny pin "tick" marks as each medal lands
        q.strokeWeight(1.2);
        pins.forEach(({ obj, t0 }) => {
          const a = hump(t, t0 + 0.12, t0 + 0.18, t0 + 0.34) * fade;
          if (a < 0.02) return;
          obj.getWorldPosition(tmp); root.worldToLocal(tmp);
          const [px, py] = k.toScreen(tmp);
          q.stroke(255, 236, 170, 230 * a);
          for (let j = 0; j < 3; j++) {
            const an = -Math.PI / 2 + (j - 1) * 0.6;
            q.line(px + Math.cos(an) * 4.5, py - 1 + Math.sin(an) * 4.5, px + Math.cos(an) * 7.5, py - 1 + Math.sin(an) * 7.5);
          }
        });
      },

      dispose() {
        own.forEach(o => o.dispose?.());
        k.layers.plate.material.color.setRGB(1, 1, 1);
        k.layers.person.material.color.setRGB(1, 1, 1);
      },
    };
  },
};
