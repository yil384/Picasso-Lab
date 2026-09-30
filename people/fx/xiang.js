/* Xiang — 演唱会 Concert
   Click: the seaside dims into a concert stage (truss, halftone back-light), two spotlight
   cones snap on and sweep, a laser fan opens behind him; a stage mic on a leaning stand
   rises to his lips (the watermelon popsicle stays in his hand); an in-ear monitor pops
   into his visible ear and its coiled cable runs down to the collar; the LIVE tally
   lights; a crowd with glow sticks rises along the bottom edge and holds up a XIANG
   board, a WOW! sign pops next to the popsicle.
   Loop (3.2 s bar = 4 beats): spots sweep once per bar, glow sticks sway every 2 beats,
   boards hop on each beat, a note drifts off the mic every other beat, LIVE dot blinks.
   Photo landmarks (512 px): lips 330,192 · chin 318,230 · ear (concha) 207,163 ·
   collar 232,262 · popsicle 320-443 x 200-370 · fist 340-445 x 380-470. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BAR = 3.2, BEAT = BAR / 4;
const NC = [[98, 233, 255], [255, 95, 210], [255, 228, 92]];   // note colours
const TAU = Math.PI * 2;

const BEAM_VS = `
  uniform float uH;
  varying float vAlong; varying vec3 vN; varying vec3 vV;
  void main() {
    vAlong = -position.y / uH;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    vN = normalMatrix * normal;
    gl_Position = projectionMatrix * mv;
  }`;
// soft volumetric cone with a comic halftone grain (dots grow toward the lamp)
const BEAM_FS = `
  uniform vec3 uColor; uniform float uOpacity; uniform float uCell;
  varying float vAlong; varying vec3 vN; varying vec3 vV;
  void main() {
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float along = clamp(vAlong, 0.0, 1.0);
    float I = pow(facing, 1.4) * smoothstep(0.0, 0.08, along) * pow(1.0 - along, 1.3);
    vec2 f = fract(gl_FragCoord.xy / uCell) - 0.5;
    float r = 0.62 * sqrt(I);
    float dotv = 1.0 - smoothstep(r - 0.1, r + 0.1, length(f));
    float a = uOpacity * (0.34 * I + 0.42 * dotv * (0.35 + 0.65 * I));
    gl_FragColor = vec4(uColor, a);
  }`;
const LASER_VS = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LASER_FS = `
  uniform vec3 uColor; uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = abs(vUv.x - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.08, 0.3, x);
    float halo = pow(1.0 - x, 3.0) * 0.45;
    float along = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
    float a = uOpacity * along * (core + halo);
    gl_FragColor = vec4(mix(uColor, vec3(1.0), core * 0.55), a);
  }`;
// glow sticks: one point each, the stick is drawn rotated inside the point sprite
const STICK_VS = `
  attribute float aPhase; attribute float aLen; attribute float aA0; attribute vec3 aColor;
  uniform float uT; uniform float uAmp; uniform float uLift; uniform float uPx; uniform float uDist;
  varying float vA; varying vec3 vColor;
  void main() {
    float a = aA0 + uAmp * sin(uT * 6.28318 / ${(BEAT * 2).toFixed(3)} + aPhase);
    vec3 p = position;
    p.y += uLift;
    p.xy += vec2(-sin(a), cos(a)) * aLen * 0.5;
    vA = a; vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aLen * 1.3 * uPx * (uDist / -mv.z);
  }`;
const STICK_FS = `
  uniform float uOpacity;
  varying float vA; varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5; c.y = -c.y;
    float s = sin(vA), co = cos(vA);
    vec2 q = vec2(co * c.x + s * c.y, -s * c.x + co * c.y);
    float h = 0.385;
    float d = length(vec2(q.x, max(abs(q.y) - h, 0.0)));
    float handle = step(q.y, -0.2);
    float body = 1.0 - smoothstep(0.045, 0.075, d);
    float halo = exp(-d * d / 0.014) * 0.55 * (1.0 - handle);
    vec3 col = handle > 0.5 ? vec3(0.09, 0.08, 0.12) : mix(vColor, vec3(1.0), 0.55 * (1.0 - smoothstep(0.0, 0.05, d)));
    vec3 outc = mix(vColor, col, body);
    float a = max(body, halo) * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(outc, a);
  }`;

export default {
  title: 'Concert',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const P = k.D / 512;                             // photo px -> world px
    const R = k.R;
    const cToon = (c, o) => k.clip(k.toon(c, o));

    /* ① the stage behind him: indigo backdrop, a halftone back-light, a truss across the top */
    const stageTex = k.canvasTexture(512, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#1d1446'); gr.addColorStop(0.55, '#170d36'); gr.addColorStop(1, '#07050f');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      // halftone back-light: dots swell toward a hot spot behind his head
      for (let y = 6; y < 512; y += 11) {
        for (let x = ((y / 11) % 2) * 5.5; x < 512; x += 11) {
          const d = Math.hypot(x - 250, y - 190) / 300;
          const r = 4.6 * Math.max(0, 1 - d) ** 1.2;
          if (r < 0.5) continue;
          g.fillStyle = d < 0.55 ? 'rgba(255,92,214,0.5)' : 'rgba(120,96,255,0.45)';
          g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
      }
      // stage floor edge
      g.fillStyle = '#05030a'; g.fillRect(0, 430, 512, 82);
      g.strokeStyle = 'rgba(95,242,255,0.55)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 430); g.lineTo(512, 430); g.stroke();
      // truss: two chords and a zigzag, inked
      const truss = (col, lw) => {
        g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, 46); g.lineTo(512, 46); g.moveTo(0, 64); g.lineTo(512, 64); g.stroke();
        g.beginPath();
        for (let x = 0, i = 0; x <= 512; x += 14, i++) (i ? g.lineTo : g.moveTo).call(g, x, i % 2 ? 64 : 46);
        g.stroke();
      };
      truss('#0b0814', 6); truss('#6c6788', 2.6);
    });
    const stage = new THREE.Mesh(new THREE.CircleGeometry(R, 128), k.clip(new THREE.MeshBasicMaterial({ map: stageTex, transparent: true, opacity: 0, depthWrite: false })));
    stage.position.z = k.Z_BACK + 1;
    stage.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    stage.renderOrder = -18;
    root.add(stage);

    /* ② two spot fixtures on the truss, each with a sweeping halftone cone */
    const spots = [
      { u: 118, v: 72, color: '#ff4fd2', base: 0.42, amp: 0.3, ph: 0 },
      { u: 396, v: 70, color: '#62e9ff', base: -0.38, amp: 0.3, ph: Math.PI },
    ].map((s) => {
      const g = new THREE.Group();
      const can = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 8, 20), cToon(0x2b2838));
      k.ink(can, 1.1);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(4.4, 20), k.clip(new THREE.MeshBasicMaterial({ color: 0xfff6fb })));
      lens.rotation.x = Math.PI / 2; lens.position.y = -4.05;
      const yoke = new THREE.Mesh(new THREE.TorusGeometry(6, 0.9, 6, 20, Math.PI), cToon(0x4a4660));
      yoke.position.y = 0;
      const len = 175;
      const mat = k.clip(new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(s.color) }, uOpacity: { value: 0 }, uH: { value: len }, uCell: { value: 4.2 * k.dpr } },
        vertexShader: BEAM_VS, fragmentShader: BEAM_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      const geo = new THREE.ConeGeometry(46, len, 36, 1, true);
      geo.translate(0, -len / 2, 0);
      const beam = new THREE.Mesh(geo, mat);
      beam.renderOrder = -12;
      const head = new THREE.Group();
      head.add(can, lens);
      g.add(yoke, head, beam);
      g.position.copy(k.at(s.u, s.v, -26));
      root.add(g);
      return { ...s, g, head, beam, mat };
    });

    /* ③ laser fan from behind him (stage floor), visible either side of his silhouette */
    const lasers = new THREE.Group();
    lasers.position.copy(k.at(250, 520, -30));
    const laserAngles = [-1.02, -0.72, -0.42, 0.34, 0.64, 0.94];
    const laserCols = ['#6dff8e', '#6dff8e', '#ff5fd2', '#ff5fd2', '#6dff8e', '#6dff8e'];
    const laserMeshes = laserAngles.map((a, i) => {
      const geo = new THREE.PlaneGeometry(3.2, 260);
      geo.translate(0, 130, 0);
      const m = new THREE.Mesh(geo, k.clip(new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(laserCols[i]) }, uOpacity: { value: 0 } },
        vertexShader: LASER_VS, fragmentShader: LASER_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })));
      m.renderOrder = -11;
      lasers.add(m);
      return m;
    });
    root.add(lasers);

    /* ④ stage mic on a leaning stand: grille at his chin, pointing at his lips */
    const grilleTex = k.canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#c8cdd7'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2a2e38'; g.lineWidth = 2.4;
      for (let i = -h; i < w + h; i += 13) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
        g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
      }
    });
    grilleTex.wrapS = grilleTex.wrapT = THREE.RepeatWrapping;
    grilleTex.repeat.set(2, 1);
    const mic = new THREE.Group();                  // origin = grille centre, +y = mic axis
    const grille = new THREE.Mesh(new THREE.SphereGeometry(8, 30, 22), cToon(0xffffff, { map: grilleTex }));
    grille.scale.y = 1.08;
    k.ink(grille, 1.3);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 5.6, 3.4, 24), cToon(0xdde1e8));
    collar.position.y = -8.4;
    k.ink(collar, 1.1);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 3.5, 30, 24), cToon(0x1f2029));
    body.position.y = -25.1;
    k.ink(body, 1.2);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(4.95, 4.75, 2.2, 24), cToon(0xff3fb4));
    stripe.position.y = -16;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.3, 3, 20), cToon(0xdde1e8));
    tail.position.y = -41.5;
    k.ink(tail, 1);
    const clipM = new THREE.Mesh(new THREE.BoxGeometry(8.5, 7, 7.5), cToon(0x34333f));
    clipM.position.y = -33;
    k.ink(clipM, 1.1);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(2.8, 14, 10), cToon(0x34333f));
    knob.position.set(0, -45, 0);
    k.ink(knob, 1);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 160, 12), cToon(0xcfd4dd));
    pole.position.y = -45 - 80;
    k.ink(pole, 1.1);
    mic.add(grille, collar, body, stripe, tail, clipM, knob, pole);
    const MIC_TILT = -0.27;
    mic.rotation.set(0.1, 0.35, MIC_TILT);
    const micHome = k.at(329, 211, 12);
    const micAxis = new THREE.Vector3(-Math.sin(MIC_TILT), Math.cos(MIC_TILT), 0);
    root.add(mic);

    /* ⑤ in-ear monitor in the visible ear, coiled cable down to the collar */
    const iem = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), k.toon(0xff4fb8));
    shell.scale.set(4.6, 3.8, 2.6);
    k.ink(shell, 1.1);
    const plateM = new THREE.Mesh(new THREE.CircleGeometry(2.5, 22), k.toon(0x5fe9ff));
    plateM.position.set(-0.4, 0.2, 2.62);
    const ledM = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ledM.position.set(0.5, 0.8, 2.7);
    iem.add(shell, plateM, ledM);
    iem.position.copy(k.at(208, 166, 6));
    iem.rotation.set(0, -0.35, -0.25);
    root.add(iem);
    const A = k.at(212, 178, 5), B = k.at(238, 262, 5), C = k.at(214, 224, 5);
    class Coil extends THREE.Curve {
      getPoint(s, out = new THREE.Vector3()) {
        const i = 1 - s;
        out.set(i * i * A.x + 2 * i * s * C.x + s * s * B.x, i * i * A.y + 2 * i * s * C.y + s * s * B.y, 5);
        const ang = s * TAU * 11;
        const r = 1.55 * Math.min(1, s * 12);
        out.x += Math.cos(ang) * r;
        out.z += Math.sin(ang) * r;
        return out;
      }
    }
    const coilGeo = new THREE.TubeGeometry(new Coil(), 440, 0.48, 5, false);
    const coil = new THREE.Mesh(coilGeo, k.toon(0xbfeeff));
    const coilTotal = coilGeo.index.count;
    coilGeo.setDrawRange(0, 0);
    root.add(coil);

    /* ⑥ LIVE tally: a small inked box with a lit red face, left of him over the sea */
    const tally = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(36, 14, 6), k.toon(0x24222e));
    k.ink(box, 1.2);
    const faceCard = k.card(33, 11, (g, w, h) => {
      g.fillStyle = '#ff2e55';
      g.beginPath(); g.roundRect(0, 0, w, h, h * 0.22); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(w * 0.04, h * 0.1, w * 0.92, h * 0.16);
      g.fillStyle = '#fff';
      g.font = `900 ${Math.round(h * 0.66)}px 'Arial Black', Impact, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('LIVE', w * 0.6, h * 0.55);
    }, { res: 2 });
    faceCard.position.z = 3.05;
    const recDot = new THREE.Mesh(new THREE.CircleGeometry(1.9, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    recDot.position.set(-11.4, 0, 3.2);
    const tallyGlow = k.glowSprite('rgba(255,46,85,0.9)', 46, 0);
    tallyGlow.position.z = -2;
    tally.add(tallyGlow, box, faceCard, recDot);
    const tallyHome = k.at(74, 204, 20);
    tally.position.copy(tallyHome);
    tally.rotation.set(0, 0.28, 0.06);
    root.add(tally);

    /* ⑦ the crowd along the bottom edge: two rows of heads, glow sticks held up */
    const arcY = (x) => -Math.sqrt(Math.max(0, R * R - x * x));
    const crowdRow = (seed, z, fill, rim, lift, rMin, rMax, step, order) => {
      const Wc = 204, Hc = 78;                       // plane spans y -R-8 .. -R+70
      const rnd = rng(seed);
      const tex = k.canvasTexture(512, 176, (g, w, h) => {
        const sx = w / Wc, sy = h / Hc;
        const toC = (x, y) => [(x + Wc / 2) * sx, (70 - R - y) * sy];     // world (x, y) -> canvas
        const heads = [];
        for (let x = -Wc / 2 + 4; x <= Wc / 2; x += step * (0.85 + rnd() * 0.3)) {
          heads.push([x, arcY(x) + lift + rnd() * 3, rMin + rnd() * (rMax - rMin)]);
        }
        g.fillStyle = fill;
        for (const [x, y, r] of heads) {
          const [cx, cy] = toC(x, y);
          g.beginPath(); g.arc(cx, cy, r * sx, 0, TAU); g.fill();
          g.beginPath(); g.ellipse(cx, cy + r * 2.1 * sy, r * 1.9 * sx, r * 1.5 * sy, 0, 0, TAU); g.fill();
          g.fillRect(cx - r * 1.9 * sx, cy + r * 2.1 * sy, r * 3.8 * sx, h);
        }
        g.fillRect(0, h - 14 * sy, w, 14 * sy);
        g.strokeStyle = rim; g.lineWidth = 2.2; g.lineCap = 'round';
        for (const [x, y, r] of heads) {
          const [cx, cy] = toC(x, y);
          g.beginPath(); g.arc(cx, cy, r * sx - 1.4, -Math.PI * 0.95, -Math.PI * 0.55); g.stroke();
        }
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(Wc, Hc), k.clip(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })));
      m.renderOrder = order;
      const g = new THREE.Group();
      g.add(m);
      m.position.set(0, -R - 8 + Hc / 2, 0);
      g.position.z = z;
      g.scale.setScalar(k.depthScale(z));
      root.add(g);
      return g;
    };
    const backRow = crowdRow(7, 18, '#1c1233', 'rgba(255,95,210,0.85)', 15, 4.2, 5.4, 10, 12);
    const frontRow = crowdRow(3, 26, '#08060e', 'rgba(98,233,255,0.9)', 5, 5.6, 7.2, 13, 14);

    const rs = rng(11);
    const sticks = [];
    for (let x = -86; x <= 86; x += 7.6 + rs() * 2.4) {
      if (x > 34 && x < 70 && rs() < 0.6) continue;           // fewer over his fist
      sticks.push([x + rs() * 2, arcY(x) + 16 + rs() * 7, 10.5 + rs() * 4, -x / R * 0.35 + (rs() - 0.5) * 0.25, rs() * 0.9]);
    }
    const SC = ['#62e9ff', '#62e9ff', '#62e9ff', '#ff5fd2', '#ffe45c'];
    const sPos = new Float32Array(sticks.length * 3), sPh = new Float32Array(sticks.length), sLen = new Float32Array(sticks.length), sA0 = new Float32Array(sticks.length), sCol = new Float32Array(sticks.length * 3);
    const tmpC = new THREE.Color();
    sticks.forEach(([x, y, len, a0, ph], i) => {
      sPos.set([x, y, 0], i * 3); sPh[i] = ph; sLen[i] = len; sA0[i] = a0;
      tmpC.set(SC[i % SC.length]).convertSRGBToLinear();
      sCol.set([tmpC.r, tmpC.g, tmpC.b], i * 3);
    });
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPh, 1));
    sGeo.setAttribute('aLen', new THREE.BufferAttribute(sLen, 1));
    sGeo.setAttribute('aA0', new THREE.BufferAttribute(sA0, 1));
    sGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
    const sMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uAmp: { value: 0.28 }, uLift: { value: -30 }, uPx: { value: k.dpr }, uDist: { value: k.dist }, uOpacity: { value: 0 } },
      vertexShader: STICK_VS, fragmentShader: STICK_FS, transparent: true, depthWrite: false,
    }));
    const stickPts = new THREE.Points(sGeo, sMat);
    stickPts.renderOrder = 13;
    stickPts.frustumCulled = false;
    const stickGroup = new THREE.Group();
    stickGroup.add(stickPts);
    stickGroup.position.z = 22;
    stickGroup.scale.setScalar(k.depthScale(22));
    root.add(stickGroup);

    const tint = new THREE.Color();
    const v3 = new THREE.Vector3();
    const hop = (t, t0) => {                          // a short hop on each beat (busy ~22 % of it)
      if (t < t0) return 0;
      const p = ((t - t0) % BEAT) / BEAT;
      return p < 0.22 ? Math.sin(Math.PI * p / 0.22) : 0;
    };

    return {
      update(t, e) {
        // backdrop: the sea dims into the stage
        const b = presence(t, e, 0.0, 0.45, ease.out, 0);
        stage.material.opacity = b;
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.75 * b, 1 - 0.78 * b, 1 - 0.6 * b));
        k.layers.person.material.color.copy(tint.setRGB(1 - 0.05 * b, 1 - 0.1 * b, 1));

        // spots: fixtures pop in, cones snap on, then sweep once per bar
        spots.forEach((s, i) => {
          const a = presence(t, e, 0.12 + i * 0.12, 0.35, ease.outBack, 0.1 + i * 0.1);
          k.show(s.g, a);
          const on = presence(t, e, 0.3 + i * 0.12, 0.25, ease.out, 0.1 + i * 0.1);
          const flash = 1 + 0.35 * hop(t, 1.2) * (i === 0 ? 1 : 0.6);
          s.mat.uniforms.uOpacity.value = on * 0.85 * flash;
          s.beam.scale.set(1, lerp(0.2, 1, on), 1);
          const sw = s.base + s.amp * Math.sin(TAU * t / BAR + s.ph) * env(t, 0.3, 0.9);
          s.beam.rotation.set(0.28, 0, sw);
          s.head.rotation.set(0, 0, sw);
        });

        // lasers: fan opens, breathes with the bar, brightens on the downbeat
        const lz = presence(t, e, 0.75, 0.35, ease.out, 0.2);
        const bar = ((t - 1.2) % BAR + BAR) % BAR / BAR;
        const down = t > 1.2 ? Math.max(0, 1 - bar / 0.18) : 0;
        laserMeshes.forEach((m, i) => {
          const spread = lerp(0.1, 1, lz) * (0.9 + 0.1 * Math.sin(TAU * t / BAR + i));
          m.rotation.z = -laserAngles[i] * spread;
          m.material.uniforms.uOpacity.value = lz * (0.55 + 0.45 * down);
          m.visible = lz > 0.004;
        });

        // mic + stand rise along the stand axis up to his lips
        const mr = presence(t, e, 0.3, 0.5, ease.outBack, 0.3);
        mic.visible = mr > 0.004;
        mic.position.copy(micHome).addScaledVector(micAxis, -(1 - mr) * 135);

        // in-ear monitor pops into the ear, then the coil runs down
        const ie = presence(t, e, 0.5, 0.32, ease.outBack, 0.2);
        k.show(iem, ie);
        const cl = presence(t, e, 0.62, 0.4, ease.inOut, 0.1);
        const segs = Math.floor(cl * 440) * 5 * 6;
        coilGeo.setDrawRange(0, Math.min(coilTotal, segs));
        coil.visible = cl > 0.004;

        // LIVE tally
        const tl = presence(t, e, 0.7, 0.35, ease.outBack, 0.4);
        k.show(tally, tl);
        const blink = t > 1.05 ? (((t - 1.05) % BEAT) / BEAT < 0.55 ? 1 : 0.25) : 0;
        recDot.material.opacity = blink;
        tallyGlow.material.opacity = tl * (0.25 + 0.2 * blink);

        // crowd rises from the bottom edge, bobs on the beat
        const cr = presence(t, e, 0.4, 0.45, ease.out, 0.5);
        backRow.visible = frontRow.visible = cr > 0.004;
        backRow.position.y = -(1 - cr) * 34 + 1.2 * hop(t, 1.2 + BEAT / 2);
        frontRow.position.y = -(1 - cr) * 40 + 1.6 * hop(t, 1.2);
        const st = presence(t, e, 0.55, 0.45, ease.outBack, 0.5);
        stickPts.visible = st > 0.004;
        sMat.uniforms.uOpacity.value = clamp(st * 1.4) * (1 - clamp(e * 1.8));
        sMat.uniforms.uLift.value = -(1 - st) * 34;
        sMat.uniforms.uT.value = t;
        sMat.uniforms.uAmp.value = 0.3 * env(t, 0.6, 1.3);
      },

      // comic layer: cheer boards held up from the crowd, notes drifting off the mic
      draw2d(q, t, e) {
        q.strokeJoin(q.ROUND);
        // music notes: one per beat from the grille, drifting up and to the right
        const [mx, my] = k.toScreen(v3.copy(micHome).addScaledVector(micAxis, 6));
        const life = 2.4;
        const n1 = Math.floor((t - 1.0) / (BEAT * 2));
        for (let n = Math.max(0, n1 - 2); n <= n1; n++) {
          const p = (t - (1.0 + n * BEAT * 2)) / life;
          if (p < 0 || p > 1) continue;
          const a = Math.min(1, p / 0.12) * (1 - env(p, 0.65, 1)) * (1 - clamp(e * 2.2));
          if (a <= 0) continue;
          const x = mx + 9 + 40 * p;
          const y = my - 13 - 16 * p - 3.5 * Math.sin(p * 7 + n * 2);
          const c = NC[n % 3];
          note(q, x, y, 11.5 + (n % 2) * 1.5, (n % 3 === 1), c, a, -0.2 + 0.3 * Math.sin(p * 5 + n));
        }
        // boards
        const pb = presence(t, e, 0.95, 0.4, ease.outBack, 0.6);
        if (pb > 0.004) {
          const [bx, by] = k.screenAt(222, 455, 26);
          board(q, bx, by + (1 - pb) * 26 - 3 * hop(t, 1.2), pb, -0.08 + 0.05 * Math.sin(TAU * t / (BEAT * 2)));
        }
        const pw = presence(t, e, 1.1, 0.35, ease.outBack, 0.7);
        if (pw > 0.004) {
          const [wx, wy] = k.screenAt(452, 318, 20);
          wow(q, wx, wy - 2.5 * hop(t, 1.2 + BEAT / 2), pw, 0.12 + 0.05 * Math.sin(TAU * t / (BEAT * 2) + 1));
        }
      },
    };

    function note(q, x, y, s, beamed, c, a, rot) {
      q.push(); q.translate(x, y); q.rotate(rot);
      q.stroke(22, 21, 26, 255 * a); q.strokeWeight(1.4);
      q.fill(c[0], c[1], c[2], 255 * a);
      if (beamed) {
        q.beginShape(); q.vertex(-s * 0.28, -s * 1.05); q.vertex(s * 0.72, -s * 1.3); q.vertex(s * 0.72, -s * 1.02); q.vertex(-s * 0.28, -s * 0.77); q.endShape(q.CLOSE);
        q.line(-s * 0.28, -s * 0.9, -s * 0.28, 0); q.line(s * 0.72, -s * 1.15, s * 0.72, -s * 0.25);
        q.ellipse(-s * 0.55, 0, s * 0.62, s * 0.46);
        q.ellipse(s * 0.45, -s * 0.25, s * 0.62, s * 0.46);
      } else {
        q.line(s * 0.26, 0, s * 0.26, -s * 1.15);
        q.beginShape(); q.vertex(s * 0.26, -s * 1.15); q.bezierVertex(s * 0.6, -s * 0.95, s * 0.85, -s * 0.75, s * 0.62, -s * 0.38); q.bezierVertex(s * 0.62, -s * 0.62, s * 0.45, -s * 0.8, s * 0.26, -s * 0.82); q.endShape(q.CLOSE);
        q.ellipse(0, 0, s * 0.66, s * 0.5);
      }
      q.pop();
    }
    function board(q, x, y, s, rot) {
      q.push(); q.translate(x, y); q.rotate(rot); q.scale(s);
      q.stroke(22, 21, 26); q.strokeWeight(2);
      q.fill(60, 52, 70); q.rect(-1.6, 6, 3.2, 14, 1);                 // stick
      q.fill(22, 21, 26); q.noStroke(); q.rect(-25, -7.5, 54, 19, 4);   // hard shadow
      q.stroke(22, 21, 26); q.strokeWeight(2);
      q.fill(255, 250, 240); q.rect(-27, -10, 54, 19, 4);
      q.noStroke(); q.fill(255, 95, 210);
      q.textFont("'Arial Black', Impact, sans-serif"); q.textStyle(q.BOLD ?? 'bold');
      q.textAlign(q.CENTER, q.CENTER); q.textSize(12.5);
      q.stroke(22, 21, 26); q.strokeWeight(2.2); q.text('XIANG', 0, -0.2);
      q.pop();
    }
    function wow(q, x, y, s, rot) {
      q.push(); q.translate(x, y); q.rotate(rot); q.scale(s);
      q.stroke(22, 21, 26); q.strokeWeight(2);
      q.fill(60, 52, 70); q.rect(-1.4, 8, 2.8, 12, 1);
      const burst = (dx, dy) => {
        q.beginShape();
        for (let i = 0; i < 20; i++) {
          const a = i / 20 * TAU - Math.PI / 2;
          const r = i % 2 ? 9.5 : 16;
          q.vertex(dx + Math.cos(a) * r * 1.12, dy + Math.sin(a) * r * 0.86);
        }
        q.endShape(q.CLOSE);
      };
      q.noStroke(); q.fill(22, 21, 26); burst(2, 2.5);
      q.stroke(22, 21, 26); q.strokeWeight(2); q.fill(255, 214, 64); burst(0, 0);
      q.textFont("'Arial Black', Impact, sans-serif"); q.textAlign(q.CENTER, q.CENTER); q.textSize(9.5);
      q.fill(232, 36, 84); q.strokeWeight(1.8); q.text('WOW!', 0.5, 0.3);
      q.pop();
    }
  },
};
