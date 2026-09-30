/* Xiang — 演唱会 Concert
   Click: the seaside dims into a concert stage (truss, halftone back-light, two spotlights that
   snap on and sweep, a laser fan behind him). The watermelon popsicle in his hand turns edge-on
   and POOF — it unfolds into a big handheld mic in the same fist, its grille right at his lips
   (the popsicle is gone: it is cut out of his layer and his shirt is filled in behind it; his
   real fingers are re-layered over the handle). An in-ear monitor pops into his ear, the crowd
   rises along the bottom with glow sticks, the LIVE box lights, then a WOW! burst and a XIANG!
   burst pop in.
   Loop (3.2 s bar = 4 beats): spots sweep once a bar, glow sticks sway, a music note floats off
   the mic every beat, a heart rises from the crowd every other beat, both bursts hop on the
   downbeat, the LIVE dot blinks.
   Photo landmarks (512 px): lips 338,192 · chin 322,222 · ear 207,163 · collar 232,262 ·
   popsicle 319-447 x 197-395 (stick into the fist at 385-413) · fist top edge 366,402 -> 424,381 ·
   mic grip 400,390 -> grille centre 347,220 (17 deg from vertical, along the popsicle). */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BAR = 3.2, BEAT = BAR / 4, T0 = 1.3;
const NC = [[98, 233, 255], [255, 95, 210], [255, 228, 92]];   // note colours
const TAU = Math.PI * 2;
const FONT = "'Arial Black', 'Helvetica Neue', Impact, sans-serif";

// the popsicle (melon + sticks), cut out of his layer when it turns into the mic
const MELON = [[318, 224], [330, 219], [341, 215], [347, 211], [354, 205], [371, 199.5], [390, 196.5], [406, 199.5], [419, 205],
  [423, 220], [425, 237], [428, 250], [431, 261], [434, 274], [437, 286], [440, 298], [443, 309], [447, 320], [448, 334],
  [446, 344], [440, 352], [434, 360], [427, 368], [419, 375], [417, 382], [415, 386], [408, 388.5], [402, 391], [397, 395.5],
  [388, 397.5], [383, 398], [381, 386], [379, 378], [364, 375], [352, 371.5], [342, 366], [336, 359], [334, 348], [332, 338],
  [330, 326], [328, 314], [326.5, 302], [325, 290], [323.5, 278], [322, 266], [320.5, 254], [319.5, 244], [318.5, 234]];
// his shirt behind the melon's lower-left edge (painted in when the melon is cut out)
const SHIRT = [[316, 259], [324, 259], [333, 272], [342, 294], [349, 318], [355, 342], [360, 360], [363, 368], [364.5, 377],
  [355, 374.5], [345, 369], [337, 363], [331.5, 350], [328.5, 336], [326, 320], [323.5, 302], [321, 284], [318.5, 270]];
// the fist, re-layered over the mic handle (top edge = the top of his fingers)
const FIST = [[356, 410], [364, 403.5], [372, 399], [380, 396], [388, 394], [396, 392], [401, 388], [407, 384.5], [414, 382.5],
  [423, 381.5], [428.5, 383.5], [432, 389], [436, 400], [440.5, 414], [444, 428], [442, 440], [430, 451], [412, 465],
  [395, 478], [372, 490], [350, 490], [343, 466], [345, 440], [350, 422]];

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
    const R = k.R;
    const cToon = (c, o) => k.clip(k.toon(c, o));
    const toWorld2 = (u, v) => new THREE.Vector2((u / 512 - 0.5) * k.D, (0.5 - v / 512) * k.D);
    const person = k.layers.person;
    const cutMap = person.material.map;
    // the photo and plate sit deeper than the stencil disc: clip them, or a sliver of the sea shows at the rim
    k.clip(k.layers.plate.material);
    k.clip(k.layers.photo.material);

    /* ① the stage behind him: indigo backdrop, a halftone back-light, a truss across the top */
    const stageTex = k.canvasTexture(512, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#1d1446'); gr.addColorStop(0.55, '#170d36'); gr.addColorStop(1, '#07050f');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      for (let y = 6; y < 512; y += 11) {
        for (let x = ((y / 11) % 2) * 5.5; x < 512; x += 11) {
          const d = Math.hypot(x - 250, y - 190) / 300;
          const r = 4.6 * Math.max(0, 1 - d) ** 1.2;
          if (r < 0.5) continue;
          g.fillStyle = d < 0.55 ? 'rgba(255,92,214,0.5)' : 'rgba(120,96,255,0.45)';
          g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        }
      }
      g.fillStyle = '#05030a'; g.fillRect(0, 430, 512, 82);
      g.strokeStyle = 'rgba(95,242,255,0.55)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 430); g.lineTo(512, 430); g.stroke();
      const truss = (col, lw) => {
        g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(0, 46); g.lineTo(512, 46); g.moveTo(0, 64); g.lineTo(512, 64); g.stroke();
        g.beginPath();
        for (let x = 0, i = 0; x <= 512; x += 14, i++) (i ? g.lineTo : g.moveTo).call(g, x, i % 2 ? 64 : 46);
        g.stroke();
      };
      truss('#0b0814', 6); truss('#6c6788', 2.6);
    });
    // 2 px wider than the photo (the stencil trims it), uvs still 0..1 over the photo
    const pad = 2, discGeo = new THREE.CircleGeometry(R + pad, 128), duv = discGeo.attributes.uv, pf = (R + pad) / R;
    for (let i = 0; i < duv.count; i++) duv.setXY(i, (duv.getX(i) - 0.5) * pf + 0.5, (duv.getY(i) - 0.5) * pf + 0.5);
    const stage = new THREE.Mesh(discGeo, k.clip(new THREE.MeshBasicMaterial({ map: stageTex, transparent: true, opacity: 0, depthWrite: false })));
    stage.position.z = k.Z_BACK + 1;
    stage.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    stage.renderOrder = -18;
    root.add(stage);

    /* ② two spot fixtures on the truss, each with a sweeping halftone cone */
    const spots = [
      { u: 128, v: 72, color: '#ff4fd2', base: 0.42, amp: 0.3, ph: 0 },
      { u: 378, v: 68, color: '#62e9ff', base: -0.36, amp: 0.3, ph: Math.PI },
    ].map((s) => {
      const g = new THREE.Group();
      const can = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 8, 20), cToon(0x2b2838));
      k.ink(can, 1.1);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(4.4, 20), k.clip(new THREE.MeshBasicMaterial({ color: 0xfff6fb })));
      lens.rotation.x = Math.PI / 2; lens.position.y = -4.05;
      const yoke = new THREE.Mesh(new THREE.TorusGeometry(6, 0.9, 6, 20, Math.PI), cToon(0x4a4660));
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

    /* ④ popsicle -> mic. His layer without the popsicle: the melon and sticks cut out, his shirt
       painted in behind the melon's lower-left edge. Swapped in the frame the popsicle starts to
       turn (the turning piece covers exactly the cut-out pixels, so the swap is invisible). */
    const noMelon = k.canvasTexture(512, 512, (g) => {
      g.drawImage(cutMap.image, 0, 0, 512, 512);
      const path = (pts) => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(u, v) : g.moveTo(u, v))); g.closePath(); };
      g.globalCompositeOperation = 'destination-out';
      path(MELON); g.fill();
      g.globalCompositeOperation = 'source-over';
      const sg = g.createLinearGradient(0, 259, 0, 377);
      sg.addColorStop(0, 'rgb(12,88,130)'); sg.addColorStop(0.35, 'rgb(10,74,113)'); sg.addColorStop(0.7, 'rgb(8,62,96)'); sg.addColorStop(1, 'rgb(5,52,80)');
      path(SHIRT); g.fillStyle = sg; g.fill();
      // the chest turns away from the light toward its front edge
      const sh = g.createLinearGradient(322, 0, 364, 0);
      sh.addColorStop(0, 'rgba(0,10,20,0)'); sh.addColorStop(1, 'rgba(0,10,20,0.35)');
      g.fillStyle = sh; g.fill();
    });
    noMelon.generateMipmaps = false;
    noMelon.minFilter = THREE.LinearFilter;
    noMelon.flipY = cutMap.flipY;

    // the turning popsicle: the real pixels on a flat piece that spins about the popsicle's own axis
    const melonAxis = { u: 384, v: 298, tilt: 0.14 };             // centre + lean (top to the left)
    const mGeo = new THREE.ShapeGeometry(new THREE.Shape(MELON.map(([u, v]) => toWorld2(u, v))));
    {
      const pos = mGeo.attributes.position, uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / k.D + 0.5; uv[i * 2 + 1] = pos.getY(i) / k.D + 0.5; }
      mGeo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    const mc = toWorld2(melonAxis.u, melonAxis.v);
    mGeo.translate(-mc.x, -mc.y, 0);
    mGeo.rotateZ(-melonAxis.tilt);
    const melonMat = new THREE.MeshBasicMaterial({ map: cutMap, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const melon = new THREE.Mesh(mGeo, melonMat);
    melon.renderOrder = 11;
    const melonSpin = new THREE.Group(); melonSpin.add(melon);
    const melonTilt = new THREE.Group(); melonTilt.add(melonSpin);
    melonTilt.position.set(mc.x, mc.y, 0);
    melonTilt.rotation.z = melonAxis.tilt;
    const melonG = new THREE.Group(); melonG.add(melonTilt);
    const MZ = 0.5;
    melonG.position.z = MZ; melonG.scale.setScalar(k.depthScale(MZ));
    melonG.visible = false;
    root.add(melonG);

    // the mic: origin at the grip (top of his fist), +y up the handle to the grille at his lips
    const G = k.at(400, 390, 13), H = k.at(347, 220, 9);
    const LEN = H.distanceTo(G);
    const RH = 11.4;                                             // grille radius
    const grilleTex = k.canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#d4d9e2'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#3a3f4c'; g.lineWidth = 3;
      for (let i = -h; i < w + h; i += 16) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
        g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
      }
    });
    grilleTex.wrapS = grilleTex.wrapT = THREE.RepeatWrapping;
    grilleTex.repeat.set(2, 1);
    const HANDLE_TOP = LEN - RH * 0.93 - 2.2, HANDLE_BOT = -22;
    const HL = HANDLE_TOP - HANDLE_BOT;
    const handleTex = k.canvasTexture(256, 512, (g, w, h) => {
      g.fillStyle = '#1f1d27'; g.fillRect(0, 0, w, h);
      // pink ring under the collar, the name printed up the front
      g.fillStyle = '#ff3fb4'; g.fillRect(0, 10, w, 16);
      g.save(); g.translate(w / 2, h * 0.45); g.rotate(-Math.PI / 2);
      g.font = `900 46px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 7; g.strokeStyle = '#0b0a10'; g.strokeText('XIANG', 0, 2);
      g.fillStyle = '#ff5fcf'; g.fillText('XIANG', 0, 2);
      g.restore();
    });
    const mic = new THREE.Group();
    const micIn = new THREE.Group();                             // unfolds (scale) and turns (label)
    mic.add(micIn);
    const grille = new THREE.Mesh(new THREE.SphereGeometry(RH, 32, 24), cToon(0xffffff, { map: grilleTex }));
    grille.scale.y = 1.04;
    grille.position.y = LEN;
    k.ink(grille, 1.4);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(RH * 0.995, 0.7, 6, 40), cToon(0x5a5f6c));
    seam.rotation.x = Math.PI / 2; seam.position.y = LEN - RH * 0.12;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(RH * 0.78, RH * 0.7, 4, 28), cToon(0xe9ecf2));
    collar.position.y = LEN - RH * 0.93;
    k.ink(collar, 1.2);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(RH * 0.64, RH * 0.46, HL, 28, 1, false, Math.PI, TAU), cToon(0xffffff, { map: handleTex }));
    handle.position.y = HANDLE_BOT + HL / 2;
    k.ink(handle, 1.3);
    const swb = new THREE.Mesh(new THREE.BoxGeometry(2.6, 5.5, 1.6), cToon(0xcfd4dd));
    swb.position.set(0, LEN - RH - 16, RH * 0.6);
    k.ink(swb, 0.9);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(1, 16), k.clip(new THREE.MeshBasicMaterial({ color: 0xffffff })));
    shine.scale.set(2.6, 1.5, 1);
    shine.rotation.z = 0.6;
    shine.position.set(-RH * 0.42, LEN + RH * 0.46, RH * 0.8);
    micIn.add(grille, seam, collar, handle, swb, shine);
    mic.position.copy(G);
    mic.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), H.clone().sub(G).normalize());
    micIn.rotation.y = -0.35;
    root.add(mic);
    // his fingers over the handle
    const fist = k.patch(FIST, 16);
    k.clip(fist.material);
    fist.material.depthTest = false;                             // over the handle's near side too

    /* ⑤ in-ear monitor in the visible ear, coiled cable down to the collar */
    const iem = new THREE.Group();
    const shellM = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), k.toon(0xff4fb8));
    shellM.scale.set(4.6, 3.8, 2.6);
    k.ink(shellM, 1.1);
    const plateM = new THREE.Mesh(new THREE.CircleGeometry(2.5, 22), k.toon(0x5fe9ff));
    plateM.position.set(-0.4, 0.2, 2.62);
    const ledM = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    ledM.position.set(0.5, 0.8, 2.7);
    iem.add(shellM, plateM, ledM);
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

    /* ⑥ LIVE box: an inked box with a lit red face, top right under the truss */
    const tally = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(38, 15, 6), k.toon(0x24222e));
    k.ink(box, 1.3);
    const faceCard = k.card(35, 12, (g, w, h) => {
      g.fillStyle = '#ff2e55';
      g.beginPath(); g.roundRect(0, 0, w, h, h * 0.22); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(w * 0.04, h * 0.1, w * 0.92, h * 0.16);
      g.fillStyle = '#fff';
      g.font = `900 ${Math.round(h * 0.7)}px ${FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('LIVE', w * 0.6, h * 0.55);
    }, { res: 2 });
    faceCard.position.z = 3.05;
    const recDot = new THREE.Mesh(new THREE.CircleGeometry(2, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    recDot.position.set(-12, 0, 3.2);
    const tallyGlow = k.glowSprite('rgba(255,46,85,0.9)', 42, 0);
    tallyGlow.position.z = -2;
    tally.add(tallyGlow, box, faceCard, recDot);
    tally.position.copy(k.at(412, 118, 20));
    tally.rotation.set(0.05, -0.3, -0.07);
    root.add(tally);

    /* ⑦ the crowd along the bottom edge: two rows of heads, glow sticks held up */
    const arcY = (x) => -Math.sqrt(Math.max(0, R * R - x * x));
    const crowdRow = (seed, z, fill, rim, lift, rMin, rMax, step, order) => {
      const Wc = 204, Hc = 78;
      const rnd = rng(seed);
      const tex = k.canvasTexture(512, 176, (g, w, h) => {
        const sx = w / Wc, sy = h / Hc;
        const toC = (x, y) => [(x + Wc / 2) * sx, (70 - R - y) * sy];
        const heads = [];
        for (let x = -Wc / 2 + 4; x <= Wc / 2; x += step * (0.85 + rnd() * 0.3)) {
          // keep his fist clear (it holds the mic)
          const dip = x > 30 && x < 78 ? 14 : 0;
          heads.push([x, arcY(x) + lift + rnd() * 3 - dip, rMin + rnd() * (rMax - rMin)]);
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
    const backRow = crowdRow(7, 3, '#1c1233', 'rgba(255,95,210,0.85)', 15, 4.2, 5.4, 10, 12);
    const frontRow = crowdRow(3, 5, '#08060e', 'rgba(98,233,255,0.9)', 5, 5.6, 7.2, 13, 14);

    const rs = rng(11);
    const sticks = [];
    for (let x = -86; x <= 86; x += 7.6 + rs() * 2.4) {
      if (x > 26 && x < 80) { rs(); rs(); rs(); rs(); continue; }   // none over his fist
      sticks.push([x + rs() * 2, arcY(x) + 16 + rs() * 7, 10.5 + rs() * 4, -x / R * 0.35 + (rs() - 0.5) * 0.25, rs() * 0.9]);
    }
    const SC = ['#62e9ff', '#62e9ff', '#62e9ff', '#ff5fd2', '#ffe45c'];
    const n = sticks.length;
    const sPos = new Float32Array(n * 3), sPh = new Float32Array(n), sLen = new Float32Array(n), sA0 = new Float32Array(n), sCol = new Float32Array(n * 3);
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
    stickGroup.position.z = 4;
    stickGroup.scale.setScalar(k.depthScale(4));
    root.add(stickGroup);

    const tint = new THREE.Color();
    const v3 = new THREE.Vector3();
    const hop = (t, t0) => {                          // a short hop on each beat (busy ~22 % of it)
      if (t < t0) return 0;
      const p = ((t - t0) % BEAT) / BEAT;
      return p < 0.22 ? Math.sin(Math.PI * p / 0.22) : 0;
    };
    const downbeat = (t) => {                         // a hop on the first beat of each bar
      if (t < T0) return 0;
      const p = ((t - T0) % BAR) / BAR;
      return p < 0.07 ? Math.sin(Math.PI * p / 0.07) : 0;
    };
    // popsicle turn (0 = flat, 1 = edge-on) and mic unfold, as functions of (t, e)
    const turnOf = (t, e) => ease.in(env(t, 0.26, 0.44)) * (1 - ease.out(env(e, 0.3, 0.7)));
    const unfoldOf = (t, e) => ease.outBack(env(t, 0.42, 0.74), 2.2) * (1 - ease.in(clamp(e * 2.6)));

    return {
      update(t, e) {
        // backdrop: the sea dims into the stage
        const b = presence(t, e, 0.0, 0.45, ease.out, 0);
        stage.material.opacity = b;
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.75 * b, 1 - 0.78 * b, 1 - 0.6 * b));
        tint.setRGB(1 - 0.05 * b, 1 - 0.1 * b, 1);
        person.material.color.copy(tint);
        melonMat.color.copy(tint);
        fist.material.color.copy(tint);

        // spots: fixtures pop in, cones snap on, then sweep once per bar
        spots.forEach((s, i) => {
          const a = presence(t, e, 0.1 + i * 0.1, 0.35, ease.outBack, 0.1 + i * 0.1);
          k.show(s.g, a);
          const on = presence(t, e, 0.28 + i * 0.1, 0.25, ease.out, 0.1 + i * 0.1);
          const flash = 1 + 0.35 * downbeat(t);
          s.mat.uniforms.uOpacity.value = on * 0.85 * flash;
          s.beam.scale.set(1, lerp(0.2, 1, on), 1);
          const sw = s.base + s.amp * Math.sin(TAU * t / BAR + s.ph) * env(t, 0.3, 0.9);
          s.beam.rotation.set(0.28, 0, sw);
          s.head.rotation.set(0, 0, sw);
        });

        // lasers: fan opens, breathes with the bar, brightens on the downbeat
        const lz = presence(t, e, 0.8, 0.35, ease.out, 0.2);
        const bar = ((t - T0) % BAR + BAR) % BAR / BAR;
        const down = t > T0 ? Math.max(0, 1 - bar / 0.18) : 0;
        laserMeshes.forEach((m, i) => {
          const spread = lerp(0.1, 1, lz) * (0.9 + 0.1 * Math.sin(TAU * t / BAR + i));
          m.rotation.z = -laserAngles[i] * spread;
          m.material.uniforms.uOpacity.value = lz * (0.5 + 0.4 * down);
          m.visible = lz > 0.004;
        });

        // the popsicle turns edge-on; his layer loses it in the same frame
        const cut = t >= 0.26 && e < 0.72;
        const turn = cut ? turnOf(t, e) : 0;
        melonG.visible = cut && turn < 0.995;
        melonSpin.rotation.y = turn * Math.PI / 2;
        melonSpin.position.y = turn * 3;
        const want = cut ? noMelon : cutMap;
        if (person.material.map !== want) person.material.map = want;

        // ...and the mic unfolds out of that edge, grille up to his lips
        const un = unfoldOf(t, e);
        mic.visible = un > 0.004;
        micIn.scale.set(Math.max(un, 0.004), lerp(0.72, 1, clamp(un)) + (un > 1 ? (un - 1) * 0.4 : 0), Math.max(un, 0.004));
        micIn.rotation.y = -0.35 + (1 - clamp(un)) * 1.4 + 0.06 * Math.sin(TAU * t / BAR);
        // it bobs a touch with the beat (he is singing)
        const bob = hop(t, T0);
        mic.position.set(G.x - bob * 0.5, G.y + bob * 0.9, G.z);

        // in-ear monitor pops into the ear, then the coil runs down
        const ie = presence(t, e, 0.6, 0.32, ease.outBack, 0.2);
        k.show(iem, ie);
        const cl = presence(t, e, 0.7, 0.4, ease.inOut, 0.1);
        coilGeo.setDrawRange(0, Math.min(coilTotal, Math.floor(cl * 440) * 5 * 6));
        coil.visible = cl > 0.004;

        // LIVE box
        const tl = presence(t, e, 0.78, 0.35, ease.outBack, 0.4);
        k.show(tally, tl);
        const blink = t > 1.1 ? (((t - 1.1) % BEAT) / BEAT < 0.55 ? 1 : 0.25) : 0;
        recDot.material.opacity = blink;
        tallyGlow.material.opacity = tl * (0.25 + 0.2 * blink);

        // crowd rises from the bottom edge, bobs on the beat
        const cr = presence(t, e, 0.45, 0.45, ease.out, 0.5);
        backRow.visible = frontRow.visible = cr > 0.004;
        backRow.position.y = -(1 - cr) * 34 + 1.2 * hop(t, T0 + BEAT / 2);
        frontRow.position.y = -(1 - cr) * 40 + 1.6 * hop(t, T0);
        const st = presence(t, e, 0.58, 0.45, ease.outBack, 0.5);
        stickPts.visible = st > 0.004;
        sMat.uniforms.uOpacity.value = clamp(st * 1.4) * (1 - clamp(e * 1.8));
        sMat.uniforms.uLift.value = -(1 - st) * 34;
        sMat.uniforms.uT.value = t;
        sMat.uniforms.uAmp.value = 0.3 * env(t, 0.6, 1.3);
      },

      // comic layer: the POOF, notes off the mic, hearts from the crowd, WOW! and XIANG!
      draw2d(q, t, e) {
        q.strokeJoin(q.ROUND);
        const fade = 1 - clamp(e * 2.2);
        const [hx, hy] = k.toScreen(v3.copy(H));
        // POOF: a cloud bursts over the popsicle as it turns edge-on, the mic unfolds behind it,
        // then the cloud breaks up; two sparkles on the grille as it lands
        if (t > 0.34 && t < 0.72 && fade > 0) {
          const [cx, cy] = k.screenAt(384, 292, 4);
          const g = ease.outBack(env(t, 0.34, 0.46), 2);
          cloud(q, cx, cy, g, t, fade);
        }
        const pk = env(t, 0.58, 0.9);
        if (pk > 0 && pk < 1 && fade > 0) {
          const a = Math.sin(Math.PI * pk) * fade;
          sparkle(q, hx + 13, hy - 11, 7.5 * a, a);
          sparkle(q, hx - 3, hy - 17, 4.5 * Math.sin(Math.PI * clamp(pk * 1.3 - 0.2)), a);
        }
        // music notes: one per beat from the grille, drifting right into the stage
        const life = 2.3;
        const n1 = Math.floor((t - 1.0) / BEAT);
        for (let m = Math.max(0, n1 - 3); m <= n1; m++) {
          const p = (t - (1.0 + m * BEAT)) / life;
          if (p < 0 || p > 1) continue;
          const a = Math.min(1, p / 0.12) * (1 - env(p, 0.65, 1)) * fade;
          if (a <= 0) continue;
          const lane = m % 2;
          const x = hx + 16 + 30 * p;
          const y = hy + (lane ? 20 : 2) - (lane ? 10 : 16) * p + 3 * Math.sin(p * 7 + m * 2);
          note(q, x, y, 13.5 + lane, m % 3 === 1, NC[m % 3], a, -0.2 + 0.3 * Math.sin(p * 5 + m));
        }
        // hearts: one every other beat from the crowd, left and right in turn
        const h1 = Math.floor((t - 1.2) / (BEAT * 2));
        for (let m = Math.max(0, h1 - 1); m <= h1; m++) {
          const p = (t - (1.2 + m * BEAT * 2)) / 2.2;
          if (p < 0 || p > 1) continue;
          const a = Math.min(1, p / 0.15) * (1 - env(p, 0.6, 1)) * fade;
          if (a <= 0) continue;
          const [bx, by] = m % 2 ? k.screenAt(462, 372, 6) : k.screenAt(74, 350, 6);
          heart(q, bx + 4 * Math.sin(p * 6 + m), by - 34 * ease.out(p), 8.5 + 1.5 * Math.sin(Math.PI * p), a, m % 2 ? [255, 95, 210] : [255, 64, 110]);
        }
        // WOW! (left, over the sea side) and XIANG! (the crowd's sign, bottom left)
        const pw = presence(t, e, 0.95, 0.35, ease.outBack, 0.7);
        if (pw > 0.004) {
          const [wx, wy] = k.screenAt(104, 244, 20);
          burst(q, wx, wy - 2.5 * downbeat(t), pw * (1 + 0.05 * downbeat(t)), -0.16, 16, [255, 214, 64], 'WOW!', [232, 36, 84], 12);
        }
        const px = presence(t, e, 1.1, 0.35, ease.outBack, 0.8);
        if (px > 0.004) {
          const [xx, xy] = k.screenAt(196, 440, 26);
          burst(q, xx, xy - 2.5 * downbeat(t - BEAT * 2), px * (1 + 0.05 * downbeat(t - BEAT * 2)), 0.09, 18, [255, 79, 184], 'XIANG!', [124, 58, 237], 12);
        }
      },
    };

    // a music note: an ink pass (thick) under a colour pass, so stems read on the dark stage
    function note(q, x, y, s, beamed, c, a, rot) {
      q.push(); q.translate(x, y); q.rotate(rot);
      const shape = (ink) => {
        if (ink) { q.stroke(22, 21, 26, 255 * a); q.strokeWeight(4.4); q.fill(22, 21, 26, 255 * a); }
        else { q.stroke(c[0], c[1], c[2], 255 * a); q.strokeWeight(1.9); q.fill(c[0], c[1], c[2], 255 * a); }
        if (beamed) {
          q.line(-s * 0.28, -s * 0.95, -s * 0.28, 0); q.line(s * 0.72, -s * 1.2, s * 0.72, -s * 0.25);
          q.beginShape(); q.vertex(-s * 0.28, -s * 1.08); q.vertex(s * 0.72, -s * 1.33); q.vertex(s * 0.72, -s * 1.05); q.vertex(-s * 0.28, -s * 0.8); q.endShape(q.CLOSE);
          if (!ink) q.noStroke();
          q.ellipse(-s * 0.55, 0, s * 0.66, s * 0.5);
          q.ellipse(s * 0.45, -s * 0.25, s * 0.66, s * 0.5);
        } else {
          q.line(s * 0.26, 0, s * 0.26, -s * 1.15);
          q.beginShape(); q.vertex(s * 0.26, -s * 1.15); q.bezierVertex(s * 0.6, -s * 0.95, s * 0.85, -s * 0.75, s * 0.62, -s * 0.38); q.bezierVertex(s * 0.62, -s * 0.62, s * 0.45, -s * 0.8, s * 0.26, -s * 0.82); q.endShape(q.CLOSE);
          if (!ink) q.noStroke();
          q.ellipse(0, 0, s * 0.7, s * 0.52);
        }
      };
      shape(true); shape(false);
      q.noStroke(); q.fill(255, 255, 255, 190 * a);
      if (beamed) { q.ellipse(-s * 0.66, -s * 0.07, s * 0.2, s * 0.13); q.ellipse(s * 0.34, -s * 0.32, s * 0.2, s * 0.13); }
      else q.ellipse(-s * 0.12, -s * 0.08, s * 0.22, s * 0.14);
      q.pop();
    }
    function heart(q, x, y, s, a, c) {
      q.push(); q.translate(x, y);
      const shape = () => {
        q.beginShape();
        q.vertex(0, s * 0.62);
        q.bezierVertex(-s * 1.25, -s * 0.2, -s * 0.55, -s * 1.05, 0, -s * 0.38);
        q.bezierVertex(s * 0.55, -s * 1.05, s * 1.25, -s * 0.2, 0, s * 0.62);
        q.endShape(q.CLOSE);
      };
      q.noStroke(); q.fill(22, 21, 26, 255 * a); q.push(); q.translate(1.2, 1.4); shape(); q.pop();
      q.stroke(22, 21, 26, 255 * a); q.strokeWeight(1.5); q.fill(c[0], c[1], c[2], 255 * a); shape();
      q.noStroke(); q.fill(255, 255, 255, 200 * a); q.ellipse(-s * 0.38, -s * 0.4, s * 0.34, s * 0.22);
      q.pop();
    }
    // a spiky comic burst behind a white pill with the word on it (sized to the word); hard ink shadow
    function burst(q, x, y, s, rot, spikes, col, word, tc, ts) {
      q.push(); q.translate(x, y); q.rotate(rot); q.scale(s);
      q.textFont(FONT); q.textSize(ts);
      q.textStyle?.(q.BOLD ?? 'bold');
      const tw = q.textWidth(word);
      const pw = tw + 9, ph = ts + 5;
      const rx = pw * 0.7, ry = ph * 1.28;
      const star = (dx, dy) => {
        q.beginShape();
        for (let i = 0; i < spikes * 2; i++) {
          const a = i / (spikes * 2) * TAU - Math.PI / 2;
          const r = i % 2 ? 0.7 : (i % 4 === 0 ? 1.08 : 0.94);
          q.vertex(dx + Math.cos(a) * rx * r, dy + Math.sin(a) * ry * r);
        }
        q.endShape(q.CLOSE);
      };
      q.noStroke(); q.fill(22, 21, 26); star(2.4, 2.8);
      q.stroke(22, 21, 26); q.strokeWeight(2); q.fill(col[0], col[1], col[2]); star(0, 0);
      q.noStroke(); q.fill(22, 21, 26); q.rect(-pw / 2 + 1.6, -ph / 2 + 1.8, pw, ph, ph / 2);
      q.stroke(22, 21, 26); q.strokeWeight(1.8); q.fill(255, 252, 244); q.rect(-pw / 2, -ph / 2, pw, ph, ph / 2);
      q.textAlign(q.CENTER, q.CENTER);
      q.stroke(22, 21, 26); q.strokeWeight(2.2); q.fill(tc[0], tc[1], tc[2]); q.text(word, 0, 0.8);
      q.pop();
    }
    // a white comic cloud (one ink outline round the whole silhouette, two ink curls) that breaks
    // up into puffs flying apart
    function cloud(q, x, y, g, t, a) {
      const P = [[0, -2, 14], [-12, -12, 10], [9, -15, 11], [-14, 7, 10.5], [13, 8, 11], [0, -26, 8.5], [-2, 21, 10.5], [18, -4, 8.5], [-18, -4, 8.5], [8, 22, 7.5]];
      const br = env(t, 0.5, 0.62);
      const puffs = P.map(([dx, dy, r], i) => {
        const d = ease.out(clamp(br * 1.5 - (i % 4) * 0.1));
        return [dx * (1 + 0.9 * d), dy * (1 + 0.9 * d) - 5 * d, r * g * (1 - d)];
      }).filter(p => p[2] > 0.4);
      const al = a * (1 - br * br);
      if (al <= 0.01) return;
      q.push(); q.translate(x, y);
      q.noStroke(); q.fill(22, 21, 26, 255 * al);
      for (const [dx, dy, r] of puffs) q.circle(dx, dy, 2 * r + 5);
      q.fill(255, 255, 255, 255 * al);
      for (const [dx, dy, r] of puffs) q.circle(dx, dy, 2 * r);
      if (br < 0.25) {
        q.noFill(); q.stroke(22, 21, 26, 255 * al); q.strokeWeight(1.6);
        q.arc(-6 * g, 4 * g, 12 * g, 10 * g, 0.3, 2.4);
        q.arc(8 * g, -8 * g, 10 * g, 9 * g, -0.4, 1.6);
      }
      q.pop();
    }
    function sparkle(q, x, y, s, a) {
      if (s < 1.5) return;
      q.push(); q.translate(x, y);
      q.stroke(22, 21, 26, 255 * a); q.strokeWeight(1.4); q.fill(255, 232, 92, 255 * a);
      q.beginShape();
      for (let i = 0; i < 8; i++) {
        const ang = i / 8 * TAU - Math.PI / 2, r = i % 2 ? s * 0.26 : s;
        q.vertex(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      q.endShape(q.CLOSE);
      q.pop();
    }
  },
};
