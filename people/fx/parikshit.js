/* Parikshit (Prince Modi) — 登顶 Himalayan summit, the persona from his homepage (princemodi.me): LLM
   inference systems at Picasso Lab (prefill / decode), Flotilla (federated learning), Arch + NeoVim, F1,
   3D printing, tennis and pickleball. The photo: a trek in the Himalaya, pine ridges and haze.
   Click: an F1 start gantry drops in over the ridge and its five red lights come on one by one — LIGHTS
   OUT (a burst of speed ticks, the gantry is hauled away) and everything starts: a real snow peak (Ama
   Dablam) climbs up out of the haze in the V between the two near ridges and flushes with alpenglow (it
   stays behind the ridges: a mask in photo space hides it below their skyline); a string of prayer flags
   runs out across the sky behind his head, and the flags inside the circle spell PREFILL·DECODE; an
   Indian highway milestone (white stone, yellow dome) pops up out of the slope at his side, 「UCSD
   12,600 km」; a little 3D-printer head (carriage, fan, heater block, brass nozzle, Bowden tube) flies in
   and prints a red knit beanie onto his head layer by layer, a hot orange bead on the fresh layer, the
   pompom last — a tennis ball; a terminal-window speech balloon types out "btw, I use Arch".
   Loop (3.6 s beat): a gust from the left — the flags lift, stream and ripple, comic wind lines cross the
   slopes either side of him, spindrift blows off the summit, the tennis ball leans over; the terminal
   backspaces and types the next line ("$ sudo climb", ":wq  # summit"); a flotilla of birds in a V
   glides past the peak.
   The peak layer (people/static/fx/parikshit-peak.webp) is Ama Dablam, photo by Lerian, public
   domain (Wikimedia Commons, File:Ama_Dablam.jpg): sky keyed out, hazed toward the valley haze;
   rebuilt by people/fx/tools/parikshit_peak.py.
   Photo landmarks (512 px): hair top 255,176 · hair u 194-312 (v 210-235) · fringe v 222 ·
   brows v 240 · eyes 230,257 / 278,257 · ears 197-210 / 306-316 x v 255-300 · mouth 258,300 ·
   chin 263,318 · hood 300-345 x v 285-330 · shoulders 160,385 / 395,385 · the left mountain's
   sunlit edge 240,0 -> 304,96 · the right ridge 322,103 -> 520,30 (the haze V between them,
   bottom 316,105) · near slope with pines lower left (the milestone 106,448). */
import { THREE, presence, env, ease, clamp, rng } from './kit.js';

const BEAT = 3.6;
const T0 = 1.35;                             // the first gust = beat 0
const TAU = Math.PI * 2;
const PX = 200 / 512;                        // photo px -> logical px
const INK_RGB = [22, 21, 26];
const BLACKFONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

// the far haze between the near ridges (photo px): the peak shows only here
const HAZE = [[226, -40], [560, -40], [560, 24], [520, 30], [480, 40], [448, 50], [416, 64], [384, 78], [352, 92],
  [322, 103], [314, 104], [304, 96], [292, 80], [282, 64], [272, 48], [262, 32], [250, 16], [240, 0], [232, -20]];
// the peak layer's box (photo px) and its summit
const PB = [230.2, 10.1, 434.8, 125.6];
const APEX = [316, 20];

/** the haze mask (photo space, low res: bilinear sampling feathers the ridge line like the photo's blur) */
function drawHazeMask(g, w) {
  const s = w / 512;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#fff';
  g.beginPath(); HAZE.forEach(([u, v], i) => (i ? g.lineTo(u * s, v * s) : g.moveTo(u * s, v * s))); g.closePath(); g.fill();
}

const FLAGS = [['#2c69c2', '#163f80', true], ['#f7f4ec', '#b9b2a2', false], ['#d6342b', '#86190f', true], ['#2c9a49', '#15622c', true], ['#f3c22c', '#a87a12', false]];
// the flags inside the circle (5 .. 18) spell his research instead of a mantra: disaggregated LLM serving
const WORD = 'PREFILL·DECODE', WORD0 = 5;
function drawFlag([col, dark, light], ch) {
  return (g, w, h) => {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = dark; g.fillRect(0, 0, w, h * 0.1);                   // the hem round the string
    g.globalAlpha = 0.5;
    // the print: lines of prayer text, and a wind-horse medallion where there is no letter
    g.strokeStyle = dark; g.fillStyle = dark; g.lineWidth = w * 0.035;
    [0.2, 0.27, 0.88, 0.94].forEach((y) => {
      for (let x = w * 0.14; x < w * 0.86; x += w * 0.12) { g.beginPath(); g.moveTo(x, h * y); g.lineTo(x + w * 0.08, h * y); g.stroke(); }
    });
    if (!ch) {
      g.lineWidth = w * 0.045;
      g.beginPath(); g.arc(w / 2, h * 0.56, w * 0.2, 0, TAU); g.stroke();
      g.beginPath(); g.arc(w / 2, h * 0.56, w * 0.08, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    if (ch) {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${Math.round(h * 0.52)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
      g.lineJoin = 'round';
      g.lineWidth = w * 0.12; g.strokeStyle = light ? '#16151a' : col; g.strokeText(ch, w / 2, h * 0.58);
      g.fillStyle = light ? '#fffaf0' : '#16151a'; g.fillText(ch, w / 2, h * 0.58);
    }
    g.strokeStyle = '#16151a'; g.lineWidth = w * 0.07; g.strokeRect(w * 0.035, w * 0.035, w - w * 0.07, h - w * 0.07);
  };
}

export default {
  title: 'Himalayan summit',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const own = [];
    const tmp = new THREE.Vector3();
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const beatPh = (t) => (t < T0 ? -1 : (t - T0) % BEAT);
    /** the gust: in over 0.25 s, holds, out by 0.95 s of the beat */
    const gustAt = (t) => { const ph = beatPh(t); return ph < 0 ? 0 : ease.inOut(env(ph, 0, 0.25)) * (1 - ease.inOut(env(ph, 0.45, 0.95))); };

    /* ① the snow peak, behind the near ridges: the photo layer on a card at the back, masked to the haze V */
    const PZ = -32, PF = k.depthScale(PZ);
    const peakTex = await k.loadTexture(`${k.STATIC}fx/parikshit-peak.webp`);
    const maskTex = k.canvasTexture(128, 128, drawHazeMask, false);
    const peak = new THREE.Mesh(new THREE.PlaneGeometry((PB[2] - PB[0]) * PX, (PB[3] - PB[1]) * PX));
    const peakMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { map: { value: peakTex }, uMask: { value: maskTex }, uM: { value: peak.matrix }, uF: { value: k.D * PF }, uOp: { value: 1 }, uGlow: { value: 0 } },
      vertexShader: `uniform mat4 uM; uniform float uF; varying vec2 vUv, vP;
        void main() { vUv = uv; vec4 r = uM * vec4(position, 1.0); vP = r.xy / uF + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map, uMask; uniform float uOp, uGlow; varying vec2 vUv, vP;
        void main() {
          vec4 c = texture2D(map, vUv);
          float m = smoothstep(0.15, 0.85, texture2D(uMask, vP).r);
          float a = c.a * m * uOp;
          if (a < 0.004) discard;
          // alpenglow: the sunlit snow near the top flushes warm
          float snow = smoothstep(0.35, 0.8, dot(c.rgb, vec3(0.3, 0.5, 0.2)));
          vec3 col = mix(c.rgb, c.rgb * vec3(1.18, 0.86, 0.68) + vec3(0.1, 0.03, 0.0), uGlow * snow * smoothstep(0.1, 0.8, vUv.y));
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    own.push(peakMat);
    peak.material = peakMat;
    peak.renderOrder = -15;
    const peakHome = k.at((PB[0] + PB[2]) / 2, (PB[1] + PB[3]) / 2, PZ);
    peak.position.copy(peakHome);
    peak.scale.setScalar(PF);
    root.add(peak);

    /* ② prayer flags on a sagging string behind his head: sewn along their top edge, they ripple,
       lift toward us and stream to the right in the gust */
    const FZ = -14, FW = 9.2, FH = 11, GAP = 1.5;
    const SA = k.at(-30, -4, FZ), SB = k.at(545, 165, FZ);
    const SC = (sag) => k.at(257, 104 + sag, FZ);
    const bez = (C, s, out) => out.set(
      (1 - s) * (1 - s) * SA.x + 2 * (1 - s) * s * C.x + s * s * SB.x,
      (1 - s) * (1 - s) * SA.y + 2 * (1 - s) * s * C.y + s * s * SB.y, FZ);
    const NS = 96;
    const arc = new Float32Array(NS + 1);
    const pts = Array.from({ length: NS + 1 }, () => new THREE.Vector3());
    const layoutString = (C) => {
      for (let i = 0; i <= NS; i++) bez(C, i / NS, pts[i]);
      arc[0] = 0;
      for (let i = 1; i <= NS; i++) arc[i] = arc[i - 1] + pts[i].distanceTo(pts[i - 1]);
    };
    /** the point and the tangent angle at arc length L */
    const atLen = (L, out) => {
      let i = 1;
      while (i < NS && arc[i] < L) i++;
      const f = clamp((L - arc[i - 1]) / Math.max(1e-6, arc[i] - arc[i - 1]));
      out.lerpVectors(pts[i - 1], pts[i], f);
      return Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    };
    layoutString(SC(0));
    const total = arc[NS];
    const NF = Math.floor(total / (FW + GAP));
    const L0 = (total - NF * (FW + GAP)) / 2 + (FW + GAP) / 2;
    const plainMats = FLAGS.map((c) => k.clip(k.toon(0xffffff, { map: k.canvasTexture(64, 80, drawFlag(c)), side: THREE.DoubleSide })));
    const flagMat = (i) => {
      const ch = WORD[i - WORD0];
      if (!ch || ch === ' ') return plainMats[i % 5];
      return k.clip(k.toon(0xffffff, { map: k.canvasTexture(64, 80, drawFlag(FLAGS[i % 5], ch)), side: THREE.DoubleSide }));
    };
    const flags = [];
    for (let i = 0; i < NF; i++) {
      const geo = new THREE.PlaneGeometry(FW, FH, 5, 5);
      geo.translate(0, -FH / 2, 0);
      const base = Float32Array.from(geo.attributes.position.array);
      const m = new THREE.Mesh(geo, flagMat(i));
      const holder = new THREE.Group();
      holder.add(m);
      root.add(holder);
      flags.push({ m, holder, base, ph: i * 0.83, w: 7.5 + (i % 3) * 0.9 });
    }
    // the string: a dark cord (a ribbon rebuilt along the curve every frame, drawn up to how far it has run out)
    const cordGeo = new THREE.BufferGeometry();
    const cordPos = new Float32Array((NS + 1) * 6);
    cordGeo.setAttribute('position', new THREE.BufferAttribute(cordPos, 3));
    const cIdx = [];
    for (let i = 0; i < NS; i++) cIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    cordGeo.setIndex(cIdx);
    const cord = new THREE.Mesh(cordGeo, k.clip(new THREE.MeshBasicMaterial({ color: 0x2b2420, side: THREE.DoubleSide })));
    cord.frustumCulled = false;
    root.add(cord);
    // where the string enters the circle: it runs out from there, left to right
    let enter = 0;
    for (let i = 0; i <= NS; i++) { if (Math.hypot(pts[i].x, pts[i].y) < k.R * k.depthScale(FZ) + 4) { enter = arc[i]; break; } }
    const runAt = (L) => 0.48 + Math.max(0, L - enter) / Math.max(1, total - 2 * enter) * 0.5;     // the time a point of the string runs out

    /* ③ an Indian highway milestone at his side: white stone, yellow dome, 「UCSD 12,600 km」 */
    const MW = 25, MB = 16, MD = 6.5;
    const ms = new THREE.Group(), msSquash = new THREE.Group();
    ms.add(msSquash);
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-MW / 2, 0); bodyShape.lineTo(MW / 2, 0); bodyShape.lineTo(MW / 2, MB); bodyShape.lineTo(-MW / 2, MB); bodyShape.closePath();
    const capShape = new THREE.Shape();
    capShape.moveTo(MW / 2, MB); capShape.absarc(0, MB, MW / 2, 0, Math.PI, false); capShape.closePath();
    const ext = { depth: MD, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.7, bevelSegments: 2, curveSegments: 24 };
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(bodyShape, ext), k.clip(k.toon(0xf1eee4)));
    const capM = new THREE.Mesh(new THREE.ExtrudeGeometry(capShape, ext), k.clip(k.toon(0xf2c02c)));
    [body, capM].forEach((m) => { m.geometry.translate(0, 0, -MD / 2); k.ink(m, 1.3); msSquash.add(m); });
    // the painted face, a decal just off the front (polygon offset: no z-fighting with the stone's face)
    const faceShape = new THREE.Shape();
    faceShape.moveTo(-MW / 2, 0); faceShape.lineTo(MW / 2, 0); faceShape.lineTo(MW / 2, MB); faceShape.absarc(0, MB, MW / 2, 0, Math.PI, false); faceShape.closePath();
    const faceGeo = new THREE.ShapeGeometry(faceShape, 24);
    const MH = MB + MW / 2;
    {
      const p = faceGeo.attributes.position, uv = faceGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / MW + 0.5, p.getY(i) / MH);
    }
    const faceTex = k.canvasTexture(MW * 12, MH * 12, (g, w, h) => {
      const yC = h - MB * (h / MH);                         // canvas y of the dome's base line
      g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f3c12c'; g.fillRect(0, 0, w, yC);
      g.fillStyle = '#16151a'; g.fillRect(0, yC - 3, w, 6);
      g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, h - 26, w, 26);   // the foot, weathered
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#16151a';
      const fit = (txt, size, y, maxW) => { g.font = `900 ${size}px ${BLACKFONT}`; const tw = g.measureText(txt).width; g.save(); g.translate(w / 2, y); g.scale(Math.min(1, maxW / tw), 1); g.fillText(txt, 0, 0); g.restore(); };
      fit('UCSD', 62, yC - 50, w * 0.7);
      fit('12,600', 66, yC + 52, w * 0.86);
      fit('km', 50, yC + 112, w * 0.5);
    });
    const face = new THREE.Mesh(faceGeo, k.clip(k.toon(0xffffff, { map: faceTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
    face.position.z = MD / 2 + 0.9;
    msSquash.add(face);
    ms.rotation.y = 0.32;                         // turned a little toward him, so its side shows
    const MS_UV = [106, 448], MS_Z = -6;
    const msHome = k.at(MS_UV[0], MS_UV[1], MS_Z);
    ms.position.copy(msHome);
    root.add(ms);

    /* ④ the beanie: a red knit lathe (ribbed cuff, a cream band) worn low on his forehead, tipped a little
       toward us; a red-and-cream pompom on top */
    const R0 = 24.6, CH = 8.6, BH = 26;
    const prof = [[R0 + 0.3, 0], [R0 + 1.0, 0.9], [R0 + 1.3, 4.2], [R0 + 1.1, CH - 1.1], [R0 + 0.5, CH]];
    for (let i = 0; i <= 14; i++) {
      const f = i / 14, y = CH + 0.6 + (BH - CH - 0.6) * f;
      const r = R0 * Math.pow(1 - Math.pow(f, 2.2), 1 / 2.2) * (1 - 0.05 * f);
      prof.push([Math.max(0.01, r), y]);
    }
    const lathe = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64, Math.PI, TAU);
    {
      const p = lathe.attributes.position, uv = lathe.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / BH);
    }
    const knitTex = k.canvasTexture(512, 256, (g, w, h) => {
      const Yc = (y) => h - (y / BH) * h;                  // beanie height -> canvas y
      g.fillStyle = '#c8342a'; g.fillRect(0, 0, w, h);
      // knit stitches: rows of little Vs, a shade darker
      g.strokeStyle = 'rgba(110,20,14,0.35)'; g.lineWidth = 2;
      for (let y = Yc(BH); y < Yc(CH + 0.6); y += 9) for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 5); g.lineTo(x + 8, y); g.stroke(); }
      // the cream band with a red zigzag
      const b0 = Yc(CH + 7), b1 = Yc(CH + 2.2);
      g.fillStyle = '#f3e6cb'; g.fillRect(0, b0, w, b1 - b0);
      g.strokeStyle = '#c8342a'; g.lineWidth = 4; g.lineJoin = 'round';
      g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, (x / 16) % 2 ? b0 + 4 : b1 - 4); g.stroke();
      // the ribbed cuff
      g.fillStyle = '#b52c23'; g.fillRect(0, Yc(CH), w, h - Yc(CH));
      for (let x = 0; x < w; x += 8) { g.fillStyle = '#d24236'; g.fillRect(x, Yc(CH), 4, h - Yc(CH)); }
      g.fillStyle = 'rgba(80,12,8,0.5)'; g.fillRect(0, Yc(CH) - 2, w, 3);
    });
    const beanie = new THREE.Group(), bTilt = new THREE.Group(), bSquash = new THREE.Group();
    beanie.add(bTilt); bTilt.add(bSquash);
    bTilt.rotation.x = 0.1;
    // it is 3D printed onto his head (one of his hobbies): a clipping plane rises through it, outlines included
    k.renderer.localClippingEnabled = true;
    const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e4);
    const printable = (mesh, px) => {
      mesh.material.clippingPlanes = [cutPlane];
      const m = k.ink(mesh, px).material;
      m.clipping = true;
      m.clippingPlanes = [cutPlane];
      m.vertexShader = m.vertexShader.replace('void main() {', '#include <clipping_planes_pars_vertex>\nvoid main() {\n  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);\n  #include <clipping_planes_vertex>\n');
      m.fragmentShader = '#include <clipping_planes_pars_fragment>\n' + m.fragmentShader.replace('void main() {', 'void main() {\n  #include <clipping_planes_fragment>\n');
    };
    const shell = new THREE.Mesh(lathe, k.toon(0xffffff, { map: knitTex, side: THREE.DoubleSide }));
    printable(shell, 1.3);
    const fold = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.9, 0.85, 8, 72), k.toon(0xb52c23));
    fold.rotation.x = Math.PI / 2;
    fold.position.y = CH;
    printable(fold, 0.8);
    bSquash.add(shell, fold);
    // the pompom is a tennis ball (tennis and pickleball): optic yellow felt, the white seam, a fuzzy edge
    const pomGeo = new THREE.SphereGeometry(6.6, 40, 24);
    {
      const p = pomGeo.attributes.position, r = rng(11);
      for (let i = 0; i < p.count; i++) {
        const f = 1 + (r() - 0.5) * 0.035;
        p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
      }
      pomGeo.computeVertexNormals();
    }
    const ballTex = k.canvasTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#cfe12f'; g.fillRect(0, 0, w, h);
      const r = rng(5);
      for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,170,0.35)' : 'rgba(120,140,20,0.22)'; g.fillRect(r() * w, r() * h, 2, 2); }
      // the seam: a closed wave round the ball (two lobes)
      const seam = (lw, col) => {
        g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round';
        g.beginPath();
        for (let x = 0; x <= w; x += 4) { const y = h / 2 - Math.sin((x / w) * Math.PI * 4) * h * 0.26; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      };
      seam(15, 'rgba(150,160,120,0.6)'); seam(10, '#f7f8ef');
    });
    const pomPivot = new THREE.Group();
    pomPivot.position.y = BH - 1.2;
    const pom = new THREE.Mesh(pomGeo, k.toon(0xffffff, { map: ballTex }));
    pom.position.y = 5.6;
    pom.rotation.set(0.5, 0.9, 0.3);
    printable(pom, 1.1);
    pomPivot.add(pom);
    bSquash.add(pomPivot);
    const HEAD_UV = [255, 226], HEAD_Z = 30;
    const headHome = k.at(HEAD_UV[0], HEAD_UV[1], HEAD_Z);
    const HS = k.depthScale(HEAD_Z);
    beanie.position.copy(headHome);
    root.add(beanie);
    const POM_Y = BH - 1.2 + 5.6, POM_R = 6.8, TOP = POM_Y + POM_R + 0.6;
    /** the beanie's radius at height y (its profile, then the pompom) */
    const radiusAt = (y) => {
      if (y > BH - 0.5) return Math.sqrt(Math.max(0, POM_R * POM_R - (y - POM_Y) * (y - POM_Y)));
      for (let i = 1; i < prof.length; i++) {
        if (prof[i][1] >= y) { const [r0, y0] = prof[i - 1], [r1, y1] = prof[i]; return r0 + (r1 - r0) * clamp((y - y0) / Math.max(1e-6, y1 - y0)); }
      }
      return 0.01;
    };
    // the fresh layer: a hot orange bead round the beanie at the cut
    const bead = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 64), new THREE.MeshBasicMaterial({ color: 0xff8a2e }));
    bead.rotation.x = Math.PI / 2;
    bSquash.add(bead);

    /* ⑤ the print head: a dark carriage with a cooling fan, an aluminium heater block, a brass nozzle, a white
       Bowden tube up out of the frame. It flies in, runs round the front of each layer as the beanie grows
       from the cuff to the pompom, and flies off */
    const printer = new THREE.Group();                    // origin = the nozzle tip
    const pBody = new THREE.Group();
    printer.add(pBody);
    pBody.rotation.y = -0.35;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.4, 2.6, 14), k.clip(k.toon(0xe0a83e)));
    nozzle.position.y = 1.3;
    k.ink(nozzle, 0.9);
    const block = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.2, 4.6), k.clip(k.toon(0xc5cad3)));
    block.position.y = 4.2;
    k.ink(block, 1);
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(13.5, 7.6, 7.2), k.clip(k.toon(0x3d424c)));
    carriage.position.y = 9.6;
    k.ink(carriage, 1.2);
    const fanTex = k.canvasTexture(64, 64, (g) => {
      g.fillStyle = '#20232a'; g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.fill();
      g.fillStyle = '#8d939e';
      for (let i = 0; i < 5; i++) { g.save(); g.translate(32, 32); g.rotate(i * TAU / 5); g.beginPath(); g.ellipse(13, 0, 13, 5.5, 0.5, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = '#c5cad3'; g.beginPath(); g.arc(32, 32, 7, 0, TAU); g.fill();
    });
    const fan = new THREE.Mesh(new THREE.CircleGeometry(2.9, 28), k.clip(new THREE.MeshBasicMaterial({ map: fanTex })));
    fan.position.set(-2.4, 9.6, 3.65);
    const fanRim = new THREE.Mesh(new THREE.TorusGeometry(3, 0.35, 6, 28), k.clip(k.toon(0x2a2e35)));
    fanRim.position.copy(fan.position);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), k.clip(new THREE.MeshBasicMaterial({ color: 0x5dff8a })));
    led.position.set(4.3, 11.4, 3.65);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.5, 13.2, 0), new THREE.Vector3(3.5, 22, -1), new THREE.Vector3(9, 36, -3), new THREE.Vector3(20, 56, -5), new THREE.Vector3(34, 80, -6)]), 32, 1.0, 8),
    k.clip(k.toon(0xf1f3f6)));
    k.ink(tube, 0.9);
    pBody.add(nozzle, block, carriage, fan, fanRim, led, tube);
    printer.visible = false;
    root.add(printer);
    const parkA = k.at(470, -30, HEAD_Z + 30), parkB = k.at(500, -40, HEAD_Z + 30);

    /* ⑥ Formula 1: the start gantry drops in over the ridge, five red lights come on one by one, and when
       they all go out the race is on (everything else starts at LIGHTS OUT); the gantry is hauled away */
    const gantry = new THREE.Group();
    const gBlack = k.clip(k.toon(0x1c1e24)), podMat = k.clip(k.toon(0x111216));
    const beam = new THREE.Mesh(new THREE.BoxGeometry(60, 4.2, 4.4), gBlack);
    beam.position.y = 2.1;
    k.ink(beam, 1.2);
    gantry.add(beam);
    [-22, 22].forEach((x) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 40, 10), gBlack);
      pole.position.set(x, 24, -1);
      k.ink(pole, 0.9);
      gantry.add(pole);
    });
    const lampOff = new THREE.Color(0x3c1210), lampOn = new THREE.Color(0xff2b1c);
    const lamps = [];
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 11.2;
      const pod = new THREE.Mesh(new THREE.BoxGeometry(9, 17, 4.6), podMat);
      pod.position.set(x, -8.5, 0);
      k.ink(pod, 1.1);
      gantry.add(pod);
      const col = [];
      [-3.6, -12.6].forEach((y) => {
        const m = new THREE.Mesh(new THREE.CircleGeometry(2.9, 24), k.clip(new THREE.MeshBasicMaterial({ color: lampOff.clone() })));
        m.position.set(x, y + 0.3, 2.35);
        const hot = new THREE.Mesh(new THREE.CircleGeometry(0.95, 12), k.clip(new THREE.MeshBasicMaterial({ color: 0xfff2d8 })));
        hot.position.set(x - 0.8, y + 1.1, 2.4);
        hot.visible = false;
        gantry.add(m, hot);
        col.push({ m, hot });
      });
      lamps.push(col);
    }
    const GANTRY = k.at(256, 40, 14);
    gantry.position.copy(GANTRY);
    gantry.visible = false;
    root.add(gantry);

    // the beats of the entrance
    const LIGHTS = [0.08, 0.14, 0.2, 0.26, 0.32], OUT = 0.42;      // the start lights; LIGHTS OUT
    const PK0 = OUT, MS0 = 0.66, PR0 = 0.55, PR1 = 1.15, BUB0 = 0.84;  // PR0 .. PR1: the print; the terminal
    const tipAt = (t, out) => {                         // the nozzle on the front of the layer being printed
      const h = TOP * env(t, PR0, PR1);
      const ph = 1.1 * Math.sin((t - PR0) * 31);
      const r = radiusAt(h) + 0.5;
      return bSquash.localToWorld(out.set(r * Math.sin(ph), h + 0.3, r * Math.cos(ph)));
    };
    const nW = new THREE.Vector3(), qW = new THREE.Quaternion(), tip = new THREE.Vector3();
    const tint = new THREE.Color();

    return {
      update(t, e) {
        k.layers.photo.material.opacity = 1;
        const mood = presence(t, e, 0, 0.5, ease.out, 0);
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.02 * mood, 1 - 0.05 * mood, 1 - 0.1 * mood));
        const gust = gustAt(t);

        // the start gantry: drops in, lights 1..5, lights out, hauled up and away
        const gIn = env(t, 0, 0.1), gUp = ease.in(env(t, OUT + 0.04, OUT + 0.3));
        gantry.visible = t < OUT + 0.3 && e < 0.5;
        if (gantry.visible) {
          k.show(gantry, Math.min(1, gIn * 4) * (1 - clamp(e * 2)), k.depthScale(14));
          gantry.position.set(GANTRY.x, GANTRY.y + (1 - ease.outBack(gIn, 1.2)) * 40 + gUp * 75, GANTRY.z);
          gantry.rotation.z = gUp * -0.12;
          lamps.forEach((col, i) => col.forEach(({ m, hot }) => {
            const on = t >= LIGHTS[i] && t < OUT;
            m.material.color.copy(on ? lampOn : lampOff);
            hot.visible = on;
          }));
        }

        // the peak climbs up from behind the ridges, a flush of alpenglow as it tops out (then a warm glow stays)
        const pp = presence(t, e, PK0, 0.7, ease.out, 0.5);
        peak.visible = pp > 0.002;
        peak.position.set(peakHome.x, peakHome.y - (1 - pp) * 46, PZ);
        peakMat.uniforms.uOp.value = clamp(pp * 3);
        peakMat.uniforms.uGlow.value = 0.45 + 0.55 * hump(t, PK0 + 0.45, PK0 + 0.75, PK0 + 1.6);
        peak.updateMatrix();

        // the string sags and lifts a little; in the gust it bows
        const sag = 2.5 * Math.sin(t * 1.3) * env(t, 1, 1.6) - gust * 7;
        layoutString(SC(sag));
        const inkA = 0.46;
        let run = 0;                         // how far the string has run out (arc length)
        for (let i = 0; i <= NS; i++) if (t >= runAt(arc[i])) run = arc[i];
        const cut = run * (1 - ease.in(clamp(e * 1.6)));
        let seg = 0;
        for (let i = 0; i <= NS; i++) {
          const a = pts[Math.min(NS, i + 1)], b = pts[Math.max(0, i - 1)];
          const tx = a.x - b.x, ty = a.y - b.y, l = Math.hypot(tx, ty) || 1;
          const nx = -ty / l * inkA, ny = tx / l * inkA;
          cordPos.set([pts[i].x - nx, pts[i].y - ny, FZ - 0.2, pts[i].x + nx, pts[i].y + ny, FZ - 0.2], i * 6);
          if (arc[i] <= cut) seg = i;
        }
        cordGeo.attributes.position.needsUpdate = true;
        cordGeo.setDrawRange(0, seg * 6);
        cord.visible = seg > 0;

        flags.forEach((f, i) => {
          const L = L0 + i * (FW + GAP);
          const ti = runAt(L);
          const p = presence(t, e, ti, 0.32, ease.outBack, i / NF);
          f.holder.visible = p > 0.004 && L <= cut + FW;
          if (!f.holder.visible) return;
          f.holder.rotation.z = atLen(L, f.holder.position);
          f.holder.scale.setScalar(Math.max(0.004, p));
          // flip in about the string, then flutter: lift toward us, stream right, ripple
          const flip = (1 - ease.out(env(t, ti, ti + 0.5))) * 1.6;
          const lift = 0.22 + 0.08 * Math.sin(t * 2.1 + f.ph) + gust * (0.5 + 0.12 * Math.sin(i * 1.3)) + flip;
          const stream = 0.06 + 0.04 * Math.sin(t * 1.7 + f.ph) + gust * (0.8 + 0.12 * Math.sin(i * 2.1));
          const amp = 0.7 + 1.8 * gust;
          const w = f.w * (1 + 0.6 * gust);
          const pos = f.m.geometry.attributes.position, b = f.base;
          for (let j = 0; j < pos.count; j++) {
            const x0 = b[j * 3], y0 = b[j * 3 + 1];
            const d = -y0 / FH;
            const wave = Math.sin(x0 * 0.62 + y0 * 0.3 - t * w + f.ph) * amp * d;
            pos.setXYZ(j, x0 + (-y0) * stream + wave * 0.18, y0 * Math.cos(lift) + wave * 0.12, -y0 * Math.sin(lift) + wave);
          }
          pos.needsUpdate = true;
          f.m.geometry.computeVertexNormals();
        });

        // the milestone springs up out of the slope, squashes and settles
        const mp = presence(t, e, MS0, 0.3, ease.outBack, 0.25);
        k.show(ms, Math.min(1, mp * 1.4));
        ms.position.set(msHome.x, msHome.y - (1 - Math.min(1, mp)) * 22, MS_Z);
        const ml = t - (MS0 + 0.26);
        const msq = ml > 0 ? 0.1 * Math.exp(-6 * ml) * Math.cos(16 * ml) : 0;
        msSquash.scale.set(1 + msq, 1 - msq, 1);

        // the beanie is printed onto his head, cuff to pompom; it settles as it cools; the pompom wobbles,
        // and leans over in the gust
        const bOut = 1 - ease.in(clamp(e * 1.6 - 0.05));
        k.show(beanie, (t >= PR0 ? 1 : 0) * bOut, HS);
        beanie.position.set(headHome.x, headHome.y + (1 - bOut) * 12, HEAD_Z);
        const bl = t - PR1;
        const bsq = bl > 0 ? 0.07 * Math.exp(-7 * bl) * Math.cos(18 * bl) : 0;
        bSquash.scale.set(1 + bsq * 0.6, 1 - bsq, 1 + bsq * 0.6);
        const wob = bl > 0 ? 0.3 * Math.exp(-4.5 * bl) * Math.sin(13 * bl) : 0;
        pomPivot.rotation.z = -0.42 * gust + wob + 0.04 * Math.sin(t * 2.3) * env(t, 1.4, 2);
        beanie.updateMatrixWorld(true);
        const printing = t >= PR0 && t < PR1;
        const h = printing ? TOP * env(t, PR0, PR1) : 1e3;
        bSquash.getWorldQuaternion(qW);
        cutPlane.setFromNormalAndCoplanarPoint(nW.set(0, -1, 0).applyQuaternion(qW), bSquash.localToWorld(tmp.set(0, h, 0)));
        const br = printing ? radiusAt(h) : 0;
        bead.visible = printing && br > 0.6;
        bead.position.y = h - 0.15;
        bead.scale.set(br + 0.25, br + 0.25, 12);

        // the print head: in from the top right, round and round the layers, off again
        const fin = env(t, PR0 - 0.2, PR0), fout = env(t, PR1, PR1 + 0.3);
        printer.visible = fin > 0 && fout < 1 && e < 0.6;
        if (printer.visible) {
          if (t < PR0) { tipAt(PR0, tip); root.worldToLocal(tip); printer.position.lerpVectors(parkA, tip, ease.out(fin)); }
          else if (t < PR1) { tipAt(t, tip); root.worldToLocal(tip); printer.position.copy(tip); }
          else { tipAt(PR1, tip); root.worldToLocal(tip); printer.position.lerpVectors(tip, parkB, ease.in(fout)); }
          k.show(printer, (1 - ease.in(clamp(e * 2))) * Math.min(1, fin * 3) * (1 - ease.in(fout) * 0.3), k.depthScale(HEAD_Z + 24) * 1.3);
          fan.rotation.z = -t * 40;
        }
        pomPivot.rotation.x = 0.1 * Math.sin(t * 1.7) * env(t, 1.4, 2);
      },

      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0.001) return;
        const c = q.drawingContext;
        const ph = beatPh(t);
        const gust = gustAt(t);
        const [cx0, cy0] = k.screenAt(256, 256, 0);
        const inkS = (a) => q.stroke(INK_RGB[0], INK_RGB[1], INK_RGB[2], 255 * a);
        const star4 = (x, y, r, a) => {
          inkS(0.9 * a); q.strokeWeight(1.1); q.fill(255, 255, 255, 255 * a);
          q.beginShape();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.3 : r; const an = (i / 8) * TAU - Math.PI / 2; q.vertex(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
          q.endShape(q.CLOSE);
        };
        c.save();
        c.beginPath(); c.arc(cx0, cy0, k.R + 0.5, 0, TAU); c.clip();
        q.strokeCap(q.ROUND); q.strokeJoin(q.ROUND);

        // spindrift off the summit, blown to the right: soft white streams, longer in the gust
        const pk = presence(t, e, PK0 + 0.5, 0.5, ease.out, 0.4);
        if (pk > 0.01 && peak.visible) {
          peak.localToWorld(tmp.set((APEX[0] - (PB[0] + PB[2]) / 2) * PX, -(APEX[1] - (PB[1] + PB[3]) / 2) * PX, 0));
          root.worldToLocal(tmp);
          const [ax, ay] = k.toScreen(tmp);
          const len = (9 + 17 * gust) * pk;
          for (let s = 0; s < 4; s++) {
            let px = ax + 0.5, py = ay + 0.6 + s * 1.1;
            for (let j = 1; j <= 12; j++) {
              const f = j / 12;
              const x = ax + 0.5 + f * len * (1 - s * 0.14);
              const y = ay + 0.6 + s * 1.1 + f * (2 + s * 1.6) + Math.sin(f * 6 - t * 5 + s * 2) * 0.9 * f;
              const a = Math.pow(1 - f, 1.3) * pk * (0.45 + 0.4 * gust);
              q.stroke(255, 255, 255, 255 * a); q.strokeWeight((1.9 - 1.1 * f) * (1 - s * 0.15));
              q.line(px, py, x, y);
              px = x; py = y;
            }
          }
          // a twinkle on the summit as it tops out
          const tw = hump(t, PK0 + 0.62, PK0 + 0.72, PK0 + 0.98) * fade;
          if (tw > 0.02) star4(ax - 0.5, ay - 1.5, 6.5 * tw, tw);
        }

        // the gust: comic wind lines drawn on and off across the slopes either side of him (never over his
        // head or hood): thin at both ends, some with a loop; the left side first, then the right
        if (ph >= 0 && ph < 1.3) {
          const lanes = [[20, 184, 152, 0, 0.6], [-10, 150, 318, 0.1, 0], [334, 526, 202, 0.17, 0.45], [350, 524, 284, 0.27, 0]];
          const N = 72;
          lanes.forEach(([u0, u1, v0, d, loop], i) => {
            const p = env(ph, 0.04 + d, 0.7 + d);
            if (p <= 0 || p >= 1) return;
            const sH = ease.out(clamp(p * 1.6)), sT = ease.in(clamp(p * 1.6 - 0.6));
            if (sH - sT < 0.01) return;
            const pt = (s) => {
              let u = u0 + (u1 - u0) * s, v = v0 + Math.sin(s * 5.5 + i * 1.7) * 4;
              if (loop && Math.abs(s - loop) < 0.1) {
                const th = ((s - loop + 0.1) / 0.2) * TAU;
                u += 15 * Math.sin(th); v -= 13 * (1 - Math.cos(th));
              }
              return k.screenAt(u, v, -10);
            };
            const P = [];
            for (let j = 0; j <= N; j++) P.push(pt(sT + (sH - sT) * (j / N)));
            for (let pass = 0; pass < 2; pass++) {
              for (let j = 1; j <= N; j++) {
                const w = Math.pow(Math.sin(Math.PI * (j - 0.5) / N), 0.7);
                if (pass === 0) { inkS(0.85 * fade); q.strokeWeight(0.6 + 2.1 * w); } else { q.stroke(255, 255, 255, 250 * fade); q.strokeWeight(0.2 + 1.1 * w); }
                q.line(P[j - 1][0], P[j - 1][1], P[j][0], P[j][1]);
              }
            }
          });
        }

        // a flotilla of birds in a V (his federated-learning framework is Flotilla) glides past the peak, far away
        if (ph >= 0) {
          const bp = env(ph, 1.5, 3.4);
          if (bp > 0 && bp < 1) {
            const ba = Math.min(env(bp, 0, 0.1), 1 - env(bp, 0.88, 1)) * fade;
            const V = [[0, 0], [-9, -5.5], [-9, 5.5], [-18, -11], [-18, 11], [-27, -16.5], [-27, 16.5]];
            V.forEach(([du, dv], j) => {
              const u = 190 + 230 * bp + du, v = 42 - 16 * bp + dv * 0.8 + Math.sin(bp * 6 + j * 0.7) * 1.5;
              const [x, y] = k.screenAt(u, v, -30);
              const sz = j ? 0.72 : 0.85;
              const flap = Math.sin(ph * 10 + j * 0.9);
              const W = 4.4 * sz, H = (1.5 + 1.4 * flap) * sz;
              inkS(0.95 * ba); q.strokeWeight(1.15); q.noFill();
              q.beginShape(); q.vertex(x - W, y - H); q.quadraticVertex(x - W * 0.4, y - H - 1.2 * sz, x, y + 0.4); q.endShape();
              q.beginShape(); q.vertex(x, y + 0.4); q.quadraticVertex(x + W * 0.4, y - H - 1.2 * sz, x + W, y - H); q.endShape();
            });
          }
        }
        c.restore();

        // the start lights: a red bloom round each lit lamp; at LIGHTS OUT a burst of speed ticks off the gantry
        if (gantry.visible) {
          lamps.forEach((col, i) => {
            if (t < LIGHTS[i] || t >= OUT) return;
            const pop = 1 + 0.35 * (1 - env(t, LIGHTS[i], LIGHTS[i] + 0.08));
            col.forEach(({ m }) => {
              m.getWorldPosition(tmp); root.worldToLocal(tmp);
              const [lx, ly] = k.toScreen(tmp);
              q.noStroke();
              q.fill(255, 60, 30, 70 * fade); q.circle(lx, ly, 10 * pop);
              q.fill(255, 90, 50, 90 * fade); q.circle(lx, ly, 7 * pop);
            });
          });
        }
        const lo = hump(t, OUT, OUT + 0.05, OUT + 0.3) * fade;
        if (lo > 0.02) {
          const [gx, gy] = k.screenAt(256, 56, 14);
          inkS(0.95 * lo); q.strokeWeight(1.6);
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU + 0.13, r0 = 36 + 10 * (1 - lo), r1 = r0 + 7 * lo;
            q.line(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0 * 0.45, gx + Math.cos(a) * r1, gy + Math.sin(a) * r1 * 0.45);
          }
        }

        // the terminal: a comic speech balloon that is a terminal window (title bar, three dots), typing out
        // what he says; a new line once per beat
        const bub = presence(t, e, BUB0, 0.3, ease.outBack, 0.15);
        if (bub > 0.01) {
          const LINES = ['btw, I use Arch', '$ sudo climb', ':wq  # summit'];
          let idx = 0, typed = 1, back = 0;
          const tCh = BUB0 + 0.12;
          if (t < T0 + 1.9) typed = env(t, tCh, tCh + 0.5);
          else {
            const n = Math.floor((t - T0 - 1.9) / BEAT), lt = (t - T0 - 1.9) - n * BEAT;
            idx = (n + 1) % LINES.length;
            back = 1 - env(lt, 0, 0.16);                                   // the old line backspaces away
            typed = env(lt, 0.2, 0.62);
            if (back > 0) { idx = n % LINES.length; typed = back; }
          }
          const line = LINES[idx], shown = line.slice(0, Math.round(line.length * typed));
          const [bx0, by0] = k.screenAt(14, 184, 6), [bx1, by1] = k.screenAt(194, 256, 6);
          const [tx, ty] = k.screenAt(208, 286, 6);
          const W = bx1 - bx0, H = by1 - by0, TB = 6.4;
          q.push();
          q.translate(tx, ty); q.scale(bub); q.translate(-tx, -ty);
          const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
          const tail = () => { c.beginPath(); c.moveTo(bx1 - 30, by1 - 1); c.lineTo(tx, ty); c.lineTo(bx1 - 16, by1 - 1); c.closePath(); };
          c.save();
          c.globalAlpha = Math.min(1, bub);
          c.lineJoin = 'round';
          // white halo, ink outline, body
          c.lineWidth = 4.4; c.strokeStyle = 'rgba(255,255,255,0.9)'; rr(bx0, by0, W, H, 4); c.stroke(); tail(); c.stroke();
          c.lineWidth = 2.2; c.strokeStyle = '#16151a'; rr(bx0, by0, W, H, 4); c.stroke(); tail(); c.stroke();
          c.fillStyle = '#1d2129'; tail(); c.fill(); rr(bx0, by0, W, H, 4); c.fill();
          c.save(); rr(bx0, by0, W, H, 4); c.clip();
          c.fillStyle = '#323844'; c.fillRect(bx0, by0, W, TB);
          c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(bx0, by0 + TB, W, 1);
          c.restore();
          ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(bx0 + 4.4 + i * 4.4, by0 + TB / 2, 1.35, 0, TAU); c.fill(); });
          c.fillStyle = 'rgba(220,226,240,0.55)'; c.font = '600 3.6px Menlo, Consolas, "DejaVu Sans Mono", monospace'; c.textBaseline = 'middle';
          c.fillText('prince@summit: ~', bx0 + 18, by0 + TB / 2 + 0.2);
          // the line, and a block cursor (solid while typing, blinking after)
          c.font = '700 6.6px Menlo, Consolas, "DejaVu Sans Mono", monospace';
          const ly = by0 + TB + (H - TB) / 2 + 0.4;
          let x = bx0 + 4;
          if (shown.startsWith('$')) { c.fillStyle = '#7fb4ff'; c.fillText('$', x, ly); x += c.measureText('$').width; c.fillStyle = '#8af5a6'; c.fillText(shown.slice(1), x, ly); x += c.measureText(shown.slice(1)).width; }
          else { c.fillStyle = shown.startsWith(':') ? '#ffd479' : '#8af5a6'; c.fillText(shown, x, ly); x += c.measureText(shown).width; }
          const busy = typed < 1 || back > 0;
          if (busy || Math.floor(t * 2.4) % 2 === 0) { c.fillStyle = '#8af5a6'; c.fillRect(x + 0.6, ly - 3.4, 3.4, 6.6); }
          c.restore();
          q.pop();
        }

        // the milestone lands: pop lines out of the slope
        const ml = hump(t, MS0 + 0.22, MS0 + 0.28, MS0 + 0.55) * fade;
        if (ml > 0.02 && ms.visible) {
          ms.getWorldPosition(tmp); root.worldToLocal(tmp);
          const [mx, my] = k.toScreen(tmp);
          inkS(0.95 * ml); q.strokeWeight(1.7);
          [-1, 1].forEach((sd) => [[12, 5], [40, 6.5], [66, 4.5]].forEach(([deg, len]) => {
            const a = sd < 0 ? Math.PI + (deg * Math.PI) / 180 : -(deg * Math.PI) / 180;
            const r0 = 15 + 3 * (1 - ml), r1 = r0 + len * ml;
            q.line(mx + Math.cos(a) * r0, my - 12 + Math.sin(a) * r0 * 0.8, mx + Math.cos(a) * r1, my - 12 + Math.sin(a) * r1 * 0.8);
          }));
        }

        // the print: the hot nozzle tip glows, a fleck of hot plastic now and then; a twinkle on the pompom when done
        if (printer.visible && t >= PR0 && t < PR1) {
          printer.getWorldPosition(tmp); root.worldToLocal(tmp);
          const [nx, ny] = k.toScreen(tmp);
          const fl = 0.8 + 0.2 * Math.sin(t * 90);
          q.noStroke();
          q.fill(255, 140, 46, 120 * fade * fl); q.circle(nx, ny + 0.4, 5.2);
          q.fill(255, 236, 170, 255 * fade); q.circle(nx, ny + 0.3, 2.1);
          const sp = (t * 7) % 1;
          q.stroke(255, 170, 60, 220 * (1 - sp) * fade); q.strokeWeight(0.9);
          q.line(nx + 1.5 + sp * 3, ny - sp * 4, nx + 2 + sp * 4.5, ny - sp * 5.5);
        }
        const done = hump(t, PR1 + 0.04, PR1 + 0.14, PR1 + 0.4) * fade;
        if (done > 0.02) {
          pom.getWorldPosition(tmp); root.worldToLocal(tmp);
          const [px, py] = k.toScreen(tmp);
          star4(px + 7, py - 7, 6.5 * done, done);
        }
      },

      dispose() {
        own.forEach((o) => o.dispose?.());
        k.layers.plate.material.color.setRGB(1, 1, 1);
      },
    };
  },
};
