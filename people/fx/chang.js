/* Chang — 高考状元 + 灭霸手套 (Gaokao top scorer + the Infinity Gauntlet)
   Click: a gold Infinity Gauntlet forms ON her real hand, from the wrist cuff to the
   fingertips: armour plates clamp over the back of the hand and each finger segment,
   wrapped across the cup exactly where her fingers are (her hand never shows through).
   The six stones light one by one — power (index knuckle), space (middle knuckle),
   reality (ring), soul (little finger), time (cuff) and the big mind stone on the back
   of the hand — then SNAP: flash at the fingertips, comic SNAP! burst, shockwave, the
   cup bursts with coffee beans, two exam papers (数学 150, 理综) fly out of the snap
   onto the top left and get big red checks and a 满分 stamp, and the gold
   「温州市 · 高考状元」 plaque rises at the bottom.
   Loop (3.2 s): the stones shimmer in sequence, a few beans hop out of the cup, a
   shine runs over the plaque.
   Photo landmarks (512 px): eyes y 213 (x 65 / 190) · mouth 55-190 x 345 · cup 225-440 x 115-445 ·
   fingertips (index 322,191 · middle 278,250 · ring 303,292 · little 402,258) · knuckle bends
   index 446,186 · middle 438,212 · the back / heel of the hand 405-512 x 170-460 · wrist 400-440 x 400-460. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const GOLD = 0xe8b13a, GOLD_HI = 0xf5cf68, GOLD_D = 0xbf8420, BRONZE = 0x5e360c;
const RED = '#d42a22', INK = '#16151a';
const KAI = "'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif";
const BLACK = "'Arial Black', 'Arial Bold', Impact, sans-serif";
const PX = 200 / 512;                                                 // photo px -> logical px
const F = (u, v) => [(u / 512 - 0.5) * 200, (0.5 - v / 512) * 200];   // photo px -> flat world (z = 0)

// timeline (s)
const T_STONE = 0.5, D_STONE = 0.065;    // stone i lights at T_STONE + i * D_STONE (the mind stone last)
const T_SNAP = 0.92;
const T_LOOP = 1.6, BEAT = 3.2;
const bump = (x, w) => (x <= 0 || x >= w ? 0 : Math.sin(Math.PI * x / w));
const hump = (t, a, b) => bump(t - a, b - a);

export default {
  title: 'Gaokao top scorer with the Infinity Gauntlet',
  exit: 0.45,
  still: 2.4,
  plate: false,              // one flat photo backdrop: nothing parts here, the gauntlet covers her hand
  async build(k) {
    const { root } = k;
    k.layers.photo.position.z = 0;
    k.layers.photo.scale.setScalar(1);
    k.layers.photo.material.depthTest = false;     // the backdrop: drawn first, never hides a prop
    k.layers.person.visible = false;

    // gauntlet gold: 4-band toon (shadow / mid / light / specular) lit from the top left; a flat
    // face can get a dome normal (uDome: centre xy, radius, strength) so the shell reads as convex.
    // Kept inside the circle (the back of the hand runs out of the photo).
    const GOLD_VS = `varying vec3 vN; varying vec3 vV; varying vec2 vP;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position.xy; gl_Position = projectionMatrix * mv; }`;
    const GOLD_FS = `uniform vec3 uS, uM, uL, uH; uniform float uFlash; uniform vec4 uDome;
      varying vec3 vN; varying vec3 vV; varying vec2 vP;
      void main() {
        vec3 n = normalize(vN);
        if (uDome.w > 0.0 && n.z > 0.95) { vec2 d = (vP - uDome.xy) / uDome.z; n = normalize(vec3(d * uDome.w, 1.0)); }
        vec3 v = normalize(vV);
        vec3 L = normalize(vec3(-0.5, 0.7, 0.55));
        float dl = dot(n, L);
        vec3 col = dl > 0.64 ? uL : (dl > 0.2 ? uM : uS);
        float sp = pow(max(dot(n, normalize(L + v)), 0.0), 28.0);
        if (sp > 0.6) col = uH;
        col = mix(col, vec3(1.0, 0.96, 0.72), uFlash);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`;
    const goldMat = (cols, dome = [0, 0, 1, 0]) => k.clip(new THREE.ShaderMaterial({
      uniforms: {
        uS: { value: new THREE.Color(cols[0]) }, uM: { value: new THREE.Color(cols[1]) },
        uL: { value: new THREE.Color(cols[2]) }, uH: { value: new THREE.Color(cols[3]) },
        uFlash: { value: 0 }, uDome: { value: new THREE.Vector4(...dome) },
      },
      vertexShader: GOLD_VS, fragmentShader: GOLD_FS,
    }));
    const C_GOLD = [0x9c5810, 0xdc9a24, 0xf6cb58, 0xfff6d2];
    const C_HI = [0xb4701a, 0xebb238, 0xfde07a, 0xffffff];
    const C_DARK = [0x6e3a0c, 0xb0701a, 0xd99f36, 0xffeab4];
    const gold = goldMat(C_GOLD), goldHi = goldMat(C_HI), goldD = goldMat(C_DARK);
    const shellMat = goldMat(C_GOLD, [...F(452, 316), 60, 0.95]);
    const cuffMat = goldMat(C_DARK, [...F(436, 426), 34, 0.9]);
    const bronze = k.clip(k.toon(BRONZE));
    const armour = [gold, goldHi, goldD, shellMat, cuffMat];

    /* ① the gauntlet ------------------------------------------------------------------ */
    // hand: pivot at the wrist for the snap jolt; layers at their own depth, drawn 1:1 over the photo
    const WRIST = F(440, 420);
    const hand = new THREE.Group();
    hand.position.set(WRIST[0], WRIST[1], 0);
    root.add(hand);
    const inner = new THREE.Group();
    inner.position.set(-WRIST[0], -WRIST[1], 0);
    hand.add(inner);
    const layer = (z) => { const g = new THREE.Group(); g.position.z = z; g.scale.setScalar(k.depthScale(z)); inner.add(g); return g; };
    /** a part that scales in about its anchor (photo px) */
    const part = (parent, u, v) => {
      const p = new THREE.Group(), [x, y] = F(u, v);
      p.position.set(x, y, 0);
      const off = new THREE.Group();
      off.position.set(-x, -y, 0);
      p.add(off);
      parent.add(p);
      return { p, off };
    };
    const shapeOf = (pts) => new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(...F(u, v))));
    const extrude = (pts, depth, bev, size) => {
      const g = new THREE.ExtrudeGeometry(shapeOf(pts), { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: size, bevelSegments: 3, curveSegments: 4 });
      g.translate(0, 0, -(depth + bev));           // front face at z = 0
      return g;
    };
    /** tapered capsule along +y from 0 to L (radii r0 at 0, r1 at L), the far cap stretched by `tip` */
    const capGeo = (L, r0, r1, tip = 1) => {
      const pts = [], N = 7;
      for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + (i / N) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-3, Math.cos(a) * r0), Math.sin(a) * r0)); }
      // tip > 1: a stretched, pointed claw end
      for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-3, Math.pow(Math.cos(a), tip > 1 ? 1.35 : 1) * r1), L + Math.sin(a) * r1 * tip)); }
      return new THREE.LatheGeometry(pts, 18);
    };
    const jointGeo = new THREE.TorusGeometry(1, 0.1, 6, 24);
    /** one armour plate from photo point a to b (radii in photo px); origin at a, so it grows toward b */
    function plate(parent, a, b, ra, rb, mat, { flat = 0.5, tip = 1, ink = 1.1, band = false, z = 0, top = null, topK = 0.72, gap0 = false, gap1 = false } = {}) {
      const [ax, ay] = F(...a), [bx, by] = F(...b);
      const L = Math.hypot(bx - ax, by - ay);
      const g = new THREE.Group();
      g.position.set(ax, ay, z);
      g.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
      const m = new THREE.Mesh(capGeo(L, ra * PX, rb * PX, tip), mat);
      m.scale.z = flat;
      k.ink(m, ink);
      g.add(m);
      if (top) {
        // the raised armour plate riding on the darker base; its round ends stop short of the joints
        // (gap0 / gap1), so each finger segment reads as its own plate
        const r0 = ra * PX, r1 = rb * PX, rAt = y => lerp(r0, r1, clamp(y / L));
        const GAP = 0.7;
        const y0 = gap0 ? topK * r0 + GAP : 0;
        const y1 = Math.max(y0 + 0.01, gap1 ? L - topK * r1 - GAP : L);
        const t = new THREE.Mesh(capGeo(y1 - y0, rAt(y0) * topK, rAt(y1) * topK, gap1 ? 1 : tip), top);
        t.position.set(0, y0, Math.max(r0, r1) * flat * 0.72);
        t.scale.z = flat;
        k.ink(t, 0.85);
        g.add(t);
      }
      if (band) {                                  // the dark joint line where this plate meets the one before
        const j = new THREE.Mesh(jointGeo, bronze);
        const r = ra * PX + 0.12;
        j.rotation.x = Math.PI / 2;                // ring around the plate's axis (local y)
        j.scale.set(r, r * flat, 7);               // flattened in depth like the plate; ~1.4 px wide

        g.add(j);
      }
      parent.add(g);
      return g;
    }
    const parts = [];                              // { obj, t0, dur, order } shown by the timeline

    // the back / heel of the hand: one shell from the knuckle bends to the photo's rim
    const Lshell = layer(6);
    const SHELL = [[440, 167], [449, 168], [456, 177], [460, 188], [463, 199], [465, 209], [468, 219], [471, 228], [478, 237],
      [487, 246], [496, 255], [510, 264], [540, 272], [552, 360], [505, 480], [430, 505], [406, 466], [394, 442], [392, 426],
      [396, 405], [399, 380], [400, 350], [401, 322], [403, 300], [414, 288], [426, 262], [430, 238], [436, 214], [438, 190]];
    {
      const { p, off } = part(Lshell, 452, 420);
      const m = new THREE.Mesh(extrude(SHELL, 1.2, 2.4, 1.1), shellMat);
      k.ink(m, 1.4);
      off.add(m);
      parts.push({ obj: p, t0: 0.08, dur: 0.22, order: 0.55 });
    }
    // the fingers' base plates running into the back of the hand (index along the rim, middle)
    {
      const { p, off } = part(Lshell, 470, 250);
      plate(off, [452, 190], [502, 262], 7.5, 6.5, goldD, { flat: 0.45, z: 0.6, ink: 1, top: goldHi });
      plate(off, [442, 222], [512, 266], 10, 9, goldD, { flat: 0.45, z: 0.6, ink: 1, top: goldHi });
      parts.push({ obj: p, t0: 0.14, dur: 0.18, order: 0.5 });
    }

    // the mind stone's setting on the back of the hand
    const MIND = [452, 358];
    const setting = part(Lshell, ...MIND);
    {
      const [x, y] = F(...MIND);
      const base = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), goldHi);
      base.scale.set(29 * PX, 29 * PX, 3.2);
      base.position.set(x, y, 0.2);
      k.ink(base, 1.2);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(20.5 * PX, 1.2, 8, 36), bronze);
      ring.position.set(x, y, 2.4);
      ring.scale.z = 0.8;
      setting.off.add(base, ring);
      // four prongs
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2;
        const pr = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), goldD);
        pr.position.set(x + Math.cos(a) * 23.5 * PX, y + Math.sin(a) * 23.5 * PX, 2.6);
        setting.off.add(pr);
      }
      parts.push({ obj: setting.p, t0: 0.2, dur: 0.2, order: 0.45 });
    }

    // the wrist cuff (darker gold, rolled rims)
    const Lcuff = layer(8);
    {
      const { p, off } = part(Lcuff, 430, 440);
      const m = new THREE.Mesh(extrude([[390, 396], [500, 386], [528, 470], [400, 492], [386, 448]], 1, 1.8, 0.9), cuffMat);
      k.ink(m, 1.3);
      off.add(m);
      plate(off, [390, 400], [494, 389], 6, 6, goldHi, { flat: 0.55, z: 0.4, ink: 1.1 });
      plate(off, [393, 452], [500, 440], 4.6, 4.6, gold, { flat: 0.55, z: 0.4, ink: 1 });
      parts.push({ obj: p, t0: 0.04, dur: 0.18, order: 0.6 });
    }

    // the fingers: knuckle -> tip, each plate slightly wider than her finger (ink covers the rest)
    // [u, v, radius] joints in photo px; drawn back to front: ring, middle, index, little finger
    const FINGERS = [
      { z: 9, t0: 0.18, j: [[400, 268, 30], [358, 279, 28], [322, 292, 21]] },                   // ring
      { z: 11, t0: 0.2, j: [[437, 209, 22], [380, 219, 27], [338, 234, 29], [300, 250, 24]] },    // middle
      { z: 13, t0: 0.22, j: [[442, 181, 12.5], [358, 187, 16], [334, 190, 15]] },                // index
      { z: 15, t0: 0.16, j: [[474, 312, 22], [440, 283, 22], [412, 261, 14]] },                  // little finger
    ];
    const tips = [];
    FINGERS.forEach((f, fi) => {
      const L = layer(f.z);
      const n = f.j.length - 1;
      for (let s = 0; s < n; s++) {
        const a = f.j[s], b = f.j[s + 1];
        const last = s === n - 1;
        const g = plate(L, [a[0], a[1]], [b[0], b[1]], a[2], b[2], goldD, { tip: last ? 1.55 : 1, band: s > 0, ink: 1.15, top: last ? goldHi : gold, gap0: s > 0, gap1: !last });
        parts.push({ obj: g, t0: f.t0 + s * 0.07, dur: 0.15, order: 0.1 + 0.3 * (1 - s / n), finger: fi });
        if (last) tips.push({ layer: L, u: b[0], v: b[1], r: b[2] });
      }
      f.layer = L;
    });

    // knuckle guards with the stones: [u, v, gem r, colour, host finger index, guard r]
    const STONES = [
      { name: 'power', c: 0x9d3cf2, at: [446, 186], r: 9, host: 2, guard: 13 },
      { name: 'space', c: 0x2f7dff, at: [437, 214], r: 10, host: 1, guard: 15 },
      { name: 'reality', c: 0xe3262d, at: [383, 273], r: 10, host: 0, guard: 15 },
      { name: 'soul', c: 0xff8a1a, at: [441, 284], r: 10, host: 3, guard: 15 },
      { name: 'time', c: 0x1dbf58, at: [418, 427], r: 9.5, host: -1, guard: 14 },
      { name: 'mind', c: 0xffc81a, at: MIND, r: 18, host: -2, guard: 0 },
    ];
    const sockGeo = new THREE.TorusGeometry(1, 0.22, 8, 28);
    const gemGeo = new THREE.SphereGeometry(1, 22, 14);
    const hiGeo = new THREE.SphereGeometry(1, 10, 8);
    const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stones = STONES.map((d, i) => {
      const L = d.host >= 0 ? FINGERS[d.host].layer : d.host === -1 ? Lcuff : Lshell;
      const zf = d.host >= 0 ? 9.6 : d.host === -1 ? 1.6 : 2.9;
      const { p, off } = part(L, ...d.at);
      const [x, y] = F(...d.at);
      const g = new THREE.Group();
      g.position.set(x, y, zf);
      off.add(g);
      if (d.guard) {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 12), goldHi);
        dome.scale.set(d.guard * PX, d.guard * PX, 2.1);
        dome.position.z = -1.6;
        k.ink(dome, 1.05);
        g.add(dome);
      }
      const r = d.r * PX;
      const sock = new THREE.Mesh(sockGeo, bronze);
      sock.scale.set(r + 0.45, r + 0.45, 1.4);
      const mat = k.toon(d.c);
      const gem = new THREE.Mesh(gemGeo, mat);
      gem.scale.set(r, r, r * 0.62);
      gem.position.z = 0.35;
      const hi = new THREE.Mesh(hiGeo, hiMat);
      hi.scale.setScalar(r * 0.26);
      hi.position.set(-r * 0.36, r * 0.38, r * 0.7);
      const glow = k.glowSprite('rgba(255,255,255,0.95)', r * 4, 0);
      glow.material.color.setHex(d.c);
      glow.position.z = 1.2;
      g.add(sock, gem, hi, glow);
      const base = new THREE.Color(d.c);
      // a knuckle stone appears with its finger's base plate, the mind stone with its setting
      const t0 = d.host >= 0 ? FINGERS[d.host].t0 + 0.06 : d.host === -1 ? 0.12 : 0.26;
      parts.push({ obj: p, t0, dur: 0.16, order: 0.3 });
      return { g, gem, hi, glow, mat, base, dim: base.clone().multiplyScalar(0.28), r, big: d.host === -2 };
    });

    /* ② exam papers: 数学 150 and 理综 (big red checks, a 满分 stamp) ------------------- */
    function roundRect(g, x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
      g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
    }
    const PW = 33, PH = 40;
    function drawPaper(g, W, H, subj, score, chk) {
      const s = W / PW;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#fffdf5'; g.strokeStyle = INK; g.lineWidth = 1.4 * s; g.lineJoin = 'round';
      roundRect(g, 0.8 * s, 0.8 * s, W - 1.6 * s, H - 1.6 * s, 1.6 * s);
      g.fill(); g.stroke();
      g.fillStyle = INK; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.font = `900 ${8.6 * s}px ${KAI}`;
      g.fillText(subj, 3.2 * s, 10.4 * s);
      g.strokeStyle = '#bdb6a8'; g.lineWidth = 1 * s; g.lineCap = 'round';
      [15, 19, 23, 27, 31].forEach((y, i) => {
        g.beginPath(); g.moveTo(3.2 * s, y * s); g.lineTo((PW - 3.2 - (i % 2) * 5 - (i > 2 ? 11 : 0)) * s, y * s); g.stroke();
      });
      if (score) {
        g.fillStyle = RED; g.font = `italic 700 ${10.5 * s}px Georgia, 'Times New Roman', serif`;
        g.textAlign = 'right';
        g.fillText(score, (PW - 2.8) * s, 34.2 * s);
        const sw = g.measureText(score).width;
        g.strokeStyle = RED; g.lineWidth = 0.9 * s;
        g.beginPath(); g.moveTo((PW - 3.2) * s - sw, 35.8 * s); g.lineTo((PW - 2.2) * s, 35.5 * s); g.stroke();
      }
      if (chk > 0) {
        // a teacher's big red check, drawn with the pen (fat stroke, thin tail)
        const pts = [[4.6, 18.5], [11, 29], [28, 6.5]];
        const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
        let d = chk * (l1 + l2);
        g.strokeStyle = RED; g.lineCap = 'round'; g.lineJoin = 'round';
        g.lineWidth = 3.3 * s;
        g.beginPath(); g.moveTo(pts[0][0] * s, pts[0][1] * s);
        const a = Math.min(1, d / l1);
        g.lineTo(lerp(pts[0][0], pts[1][0], a) * s, lerp(pts[0][1], pts[1][1], a) * s);
        g.stroke();
        d -= l1;
        if (d > 0) {
          const b = Math.min(1, d / l2), n = 6;
          for (let i = 0; i < n; i++) {
            const u0 = (i / n) * b, u1 = ((i + 1) / n) * b;
            g.lineWidth = lerp(3.3, 1.4, u1) * s;
            g.beginPath();
            g.moveTo(lerp(pts[1][0], pts[2][0], u0) * s, lerp(pts[1][1], pts[2][1], u0) * s);
            g.lineTo(lerp(pts[1][0], pts[2][0], u1) * s, lerp(pts[1][1], pts[2][1], u1) * s);
            g.stroke();
          }
        }
      }
    }
    function makePaper(subj, score) {
      const grp = new THREE.Group();
      const card = k.card(PW, PH, (g, W, H) => drawPaper(g, W, H, subj, score, 0), { res: 2, side: THREE.DoubleSide, alphaTest: 0.05 });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(PW - 2, PH - 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24, depthWrite: false }));
      shadow.position.set(1.5, -1.8, -0.6);
      grp.add(shadow, card);
      root.add(grp);
      return { grp, card, subj, score, drawn: -1 };
    }
    const paperB = makePaper('数学', '150');
    const paperF = makePaper('理综', '');
    // on the top left, over her hair (her eyes and mouth stay clear)
    const SNAP_AT = [290, 236];
    const papers = [
      { p: paperB, home: k.at(128, 126, 14), rz: 0.2, t0: T_SNAP + 0.03, chkT: T_SNAP + 0.24 },
      { p: paperF, home: k.at(214, 90, 17), rz: -0.13, t0: T_SNAP + 0.08, chkT: T_SNAP + 0.3 },
    ];
    const stamp = k.card(22, 12.5, (g, W, H) => {
      const s = W / 22;
      g.save(); g.translate(W / 2, H / 2);
      g.strokeStyle = RED; g.fillStyle = 'rgba(255,250,240,0.55)'; g.lineWidth = 1.4 * s;
      roundRect(g, -10.2 * s, -5.4 * s, 20.4 * s, 10.8 * s, 1.8 * s); g.fill(); g.stroke();
      g.lineWidth = 0.6 * s;
      roundRect(g, -8.8 * s, -4.1 * s, 17.6 * s, 8.2 * s, 1.1 * s); g.stroke();
      g.fillStyle = RED; g.font = `900 ${8 * s}px ${KAI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('满分', 0, 0.5 * s);
      g.restore();
    }, { res: 3, alphaTest: 0.02, depthWrite: false });
    stamp.position.set(4.2, -10.5, 0.4);
    stamp.renderOrder = 2;
    paperF.card.add(stamp);

    /* ③ the plaque 「温州市 · 高考状元」: gold frame, red lacquer panel, gold letters ------ */
    const plaque = new THREE.Group();
    const PLW = 88, PLH = 32;
    const slab = new THREE.Mesh(new RoundedBoxGeometry(PLW, PLH, 5, 3, 2.2), k.toon(GOLD));
    k.ink(slab, 1.4);
    const panel = k.card(PLW - 7, PLH - 7, (g, W, H) => {
      const s = W / (PLW - 7);
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#c9291f'); gr.addColorStop(1, '#9e1b15');
      g.fillStyle = gr; g.strokeStyle = INK; g.lineWidth = 1 * s;
      roundRect(g, 0.6 * s, 0.6 * s, W - 1.2 * s, H - 1.2 * s, 1.4 * s); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,214,110,0.75)'; g.lineWidth = 0.5 * s;
      roundRect(g, 2 * s, 2 * s, W - 4 * s, H - 4 * s, 0.8 * s); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe7a0';
      g.font = `900 ${8 * s}px ${KAI}`;
      g.fillText('温 州 市', W / 2, 6.8 * s);
      g.font = `900 ${13 * s}px ${KAI}`;
      g.lineWidth = 1.2 * s; g.strokeStyle = '#5a0d0a'; g.lineJoin = 'round';
      g.strokeText('高考状元', W / 2, 17.4 * s);
      g.fillStyle = '#ffd766';
      g.fillText('高考状元', W / 2, 17.4 * s);
    }, { res: 2 });
    panel.position.z = 2.6;
    // the shine that runs over the panel once per beat
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(5, PLH - 8), shineMat);
    shine.rotation.z = -0.35;
    shine.position.z = 2.8;
    const panelMask = new THREE.Group();
    panelMask.add(shine);
    const studGeo = new THREE.SphereGeometry(1.3, 12, 8);
    [-1, 1].forEach(sx => {
      const st = new THREE.Mesh(studGeo, k.toon(GOLD_D));
      st.position.set(sx * (PLW / 2 - 2.2), 0, 2.4);
      plaque.add(st);
    });
    plaque.add(slab, panel, panelMask);
    const PLAQUE_HOME = k.at(262, 446, 18);
    plaque.position.copy(PLAQUE_HOME);
    root.add(plaque);

    // every prop goes in the transparent pass, after the photo backdrop (which ignores depth)
    const LAYERS = Object.values(k.layers);
    root.traverse(o => { if (o.material && !LAYERS.includes(o)) o.material.transparent = true; });

    /* helpers ------------------------------------------------------------------------ */
    const tmp = new THREE.Vector3();
    const scr = [0, 0], scr2 = [0, 0];
    function toScr(obj, x, y, z, out = scr) {
      tmp.set(x, y, z).applyMatrix4(obj.matrixWorld).project(k.camera);
      out[0] = (tmp.x + 1) / 2 * k.W; out[1] = (1 - tmp.y) / 2 * k.H;
      return out;
    }
    const loopT = t => (t < T_LOOP ? -1 : (t - T_LOOP) % BEAT);
    const lit = { on: 0, extra: 0 };
    function stoneLit(i, t) {
      const t0 = T_STONE + i * D_STONE;
      lit.on = env(t, t0, t0 + 0.08);
      const lt = loopT(t);
      lit.extra = 1.3 * bump(t - T_SNAP + 0.06, 0.4) + 0.9 * bump(t - t0, 0.28) + (lt < 0 ? 0 : 0.8 * bump(lt - 0.1 - i * 0.08, 0.3));
      return lit;
    }
    const P0 = new THREE.Vector3();
    const snapW = k.at(SNAP_AT[0], SNAP_AT[1], 14);

    // coffee beans: one burst out of the cup at the snap, a few hops per beat
    const R = rng(11);
    const burstBeans = Array.from({ length: 16 }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return { u: 300 + R() * 90, vx: side * (25 + R() * 95) + 20, vy: -(150 + R() * 140), rot: R() * 6, spin: (R() - 0.5) * 16, s: 0.9 + R() * 0.4, d: R() * 0.07 };
    });
    const hopBeans = [0, 1, 2].map(i => ({ u: 305 + i * 36, vx: (i - 1) * 16, vy: -(118 + i * 12), rot: i * 2.1, spin: (i - 1) * 7 + 3, s: 0.95, d: i * 0.1 }));

    return {
      update(t, e) {
        // gauntlet: plates clamp on, from the wrist to the fingertips
        for (const pp of parts) k.show(pp.obj, presence(t, e, pp.t0, pp.dur, ease.outBack, pp.order));
        // snap jolt: a quick squeeze of the whole hand about the wrist (never smaller than her hand)
        const jolt = bump(t - T_SNAP, 0.16);
        hand.scale.setScalar(1 + 0.03 * jolt);
        hand.rotation.z = 0.012 * jolt;
        // the gold flashes with the snap
        const flash = 0.42 * Math.max(0, 1 - Math.abs(t - T_SNAP - 0.02) / 0.1) * (1 - e);
        armour.forEach(m => { m.uniforms.uFlash.value = flash; });
        // a tiny camera shake on the snap
        const sh = bump(t - T_SNAP, 0.14) * (1 - e);
        root.position.set(Math.sin(t * 97) * 1.1 * sh, Math.cos(t * 83) * 0.9 * sh, 0);

        stones.forEach((s, i) => {
          const { on, extra } = stoneLit(i, t);
          const lv = on * (1 - e);
          s.mat.color.copy(s.dim).lerp(s.base, on);
          s.mat.emissive.copy(s.base).multiplyScalar(clamp(0.3 * lv + 0.35 * extra * lv, 0, 0.85));
          s.hi.visible = lv > 0.5;
          s.glow.material.opacity = clamp(lv * (0.3 + 0.55 * extra), 0, 1);
          s.glow.scale.setScalar(s.r * (s.big ? 3.4 : 3.8) * (1 + 0.55 * extra));
        });

        /* papers: burst out of the snap at the fingertips, flip in, get checked */
        root.updateMatrixWorld(true);
        P0.copy(snapW);
        papers.forEach((pp, i) => {
          const a = presence(t, e, pp.t0, 0.22, ease.out, 0.2 + i * 0.1);
          const u = ease.out(env(t, pp.t0, pp.t0 + 0.34));
          const g = pp.p.grp;
          k.show(g, a);
          g.position.lerpVectors(P0, pp.home, u);
          g.position.y += Math.sin(Math.PI * u) * 10;
          g.rotation.set(0, (1 - u) * Math.PI * 2, lerp(-0.9, pp.rz, ease.outBack(env(t, pp.t0, pp.t0 + 0.4))));
          const chk = Math.round(env(t, pp.chkT, pp.chkT + 0.15) * 16) / 16;
          if (chk !== pp.p.drawn) {
            const cv = pp.p.card.material.map.image;
            drawPaper(cv.getContext('2d'), cv.width, cv.height, pp.p.subj, pp.p.score, chk);
            pp.p.card.material.map.needsUpdate = true;
            pp.p.drawn = chk;
          }
        });
        const st = env(t, T_SNAP + 0.4, T_SNAP + 0.48);
        k.show(stamp, st > 0 ? lerp(2, 1, ease.out(st)) * (1 - ease.in(clamp(e * 1.6 - 0.2))) : 0);
        stamp.material.opacity = st;
        stamp.rotation.z = -0.3 + (1 - st) * 0.3;

        /* plaque: rises and settles with a little rock; a shine per beat */
        const pl = presence(t, e, T_SNAP + 0.06, 0.34, ease.outBack, 0.5);
        k.show(plaque, pl);
        const ps = env(t, T_SNAP + 0.06, T_SNAP + 0.7);
        plaque.position.set(PLAQUE_HOME.x, PLAQUE_HOME.y - 18 * (1 - ease.outBack(env(t, T_SNAP + 0.06, T_SNAP + 0.4))), PLAQUE_HOME.z);
        plaque.rotation.set(-0.12, 0.08, 0.06 * Math.sin(ps * Math.PI * 3) * (1 - ps) - 0.03);
        const lt = loopT(t);
        const sw = lt < 0 ? -1 : env(lt, 1.5, 2.0);
        shineMat.opacity = sw > 0 && sw < 1 ? 0.55 * bump(sw, 1) * (1 - e) : 0;
        shine.position.x = lerp(-PLW / 2 + 6, PLW / 2 - 6, clamp(sw));
        shine.visible = shineMat.opacity > 0.01;
      },

      // q5: stone glints, the snap (flash, SNAP! burst, shockwave), coffee beans
      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0 || t < 0.1) return;
        const c = q.drawingContext || q.ctx;
        const [cx, cy] = k.screenAt(256, 256, 0);
        const star = (x, y, r, a, rot = 0, fill = '#ffffff') => {
          if (r <= 0.2 || a <= 0) return;
          c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 ? r * 0.28 : r, an = i * Math.PI / 4;
            c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
          }
          c.closePath();
          c.fillStyle = fill; c.strokeStyle = INK; c.lineWidth = 1; c.lineJoin = 'round';
          c.fill(); c.stroke(); c.restore();
        };
        const spiky = (x, y, rx, ry, n, a, fill, lw = 1.4, rot = 0, inner = 0.62) => {
          if (a <= 0 || rx <= 0.3) return;
          c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
          c.beginPath();
          for (let i = 0; i < n * 2; i++) {
            const f = i % 2 ? inner : 1, an = i * Math.PI / n;
            c.lineTo(Math.cos(an) * rx * f, Math.sin(an) * ry * f);
          }
          c.closePath();
          c.fillStyle = fill; c.fill();
          c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.stroke();
          c.restore();
        };
        const bean = (x, y, s, rot, a) => {
          c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
          c.beginPath(); c.ellipse(0, 0, 3.2 * s, 2.3 * s, 0, 0, Math.PI * 2);
          c.fillStyle = '#6e3b16'; c.fill();
          c.lineWidth = 1; c.strokeStyle = INK; c.stroke();
          c.beginPath(); c.moveTo(-2.5 * s, 0.6 * s); c.bezierCurveTo(-0.8 * s, -1 * s, 0.8 * s, 1 * s, 2.5 * s, -0.6 * s);
          c.lineWidth = 0.9; c.strokeStyle = '#2a1406'; c.stroke();
          c.beginPath(); c.ellipse(-1.1 * s, -1.2 * s, 1 * s, 0.42 * s, -0.25, 0, Math.PI * 2);
          c.fillStyle = 'rgba(255,222,176,0.75)'; c.fill();
          c.restore();
        };
        const G = 430;
        const beans = (list, tau, alpha, f0 = 0.75, f1 = 1.05) => {
          for (const b of list) {
            const tt = tau - b.d;
            if (tt <= 0) continue;
            const [x0, y0] = k.screenAt(b.u, 142, 0);
            const x = x0 + b.vx * tt, y = y0 + b.vy * tt + 0.5 * G * tt * tt;
            const a = alpha * clamp(tt / 0.04) * (1 - env(tt, f0, f1));
            if (a > 0.01) bean(x, y, b.s, b.rot + b.spin * tt, a);
          }
        };

        // a glint as each stone lights (a bigger burst for the mind stone)
        stones.forEach((s, i) => {
          const t0 = T_STONE + i * D_STONE;
          const g = env(t, t0, t0 + (s.big ? 0.3 : 0.22));
          if (g <= 0 || g >= 1) return;
          toScr(s.g, -s.r * 0.55, s.r * 0.65, 1.5);
          star(scr[0], scr[1], (s.big ? 7.5 : 4.2) * Math.sin(Math.PI * g), fade, g * 1.2);
          if (s.big) {
            toScr(s.g, 0, 0, 1.5, scr2);
            c.save(); c.globalAlpha = fade * (1 - g); c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = 1.5;
            for (let j = 0; j < 8; j++) {
              const an = j * Math.PI / 4 + 0.2, r0 = s.r + 3 + 6 * g, r1 = r0 + 5 * (1 - g) + 1;
              c.beginPath(); c.moveTo(scr2[0] + Math.cos(an) * r0, scr2[1] + Math.sin(an) * r0);
              c.lineTo(scr2[0] + Math.cos(an) * r1, scr2[1] + Math.sin(an) * r1); c.stroke();
            }
            c.restore();
          }
        });
        // loop: one small glint travels over the stones
        const lt = loopT(t);
        if (lt >= 0) {
          stones.forEach((s, i) => {
            const g = env(lt, 0.1 + i * 0.08, 0.34 + i * 0.08);
            if (g <= 0 || g >= 1) return;
            toScr(s.g, -s.r * 0.5, s.r * 0.6, 1.5);
            star(scr[0], scr[1], (s.big ? 5 : 3.2) * Math.sin(Math.PI * g), fade, g);
          });
        }

        // inside the circle: shockwave ring, beans
        c.save();
        c.beginPath(); c.arc(cx, cy, k.R + 0.5, 0, Math.PI * 2); c.clip();
        const [hx, hy] = k.screenAt(SNAP_AT[0], SNAP_AT[1], 14);
        const w = env(t, T_SNAP, T_SNAP + 0.5);
        if (w > 0 && w < 1) {
          const r = 14 + 190 * ease.out(w), a = (1 - w) * fade;
          c.globalAlpha = a;
          c.lineWidth = 5; c.strokeStyle = INK;
          c.beginPath(); c.arc(hx, hy, r, 0, Math.PI * 2); c.stroke();
          c.lineWidth = 2.6; c.strokeStyle = '#fff1b8';
          c.beginPath(); c.arc(hx, hy, r, 0, Math.PI * 2); c.stroke();
          c.globalAlpha = a * 0.8; c.lineWidth = 1.4; c.strokeStyle = '#ffc93a';
          c.beginPath(); c.arc(hx, hy, r * 0.74, 0, Math.PI * 2); c.stroke();
          c.globalAlpha = 1;
        }
        beans(burstBeans, t - T_SNAP, fade);
        if (lt >= 0) beans(hopBeans, lt - 0.2, fade, 0.5, 0.62);      // they drop back into the cup
        c.restore();

        // the snap itself at the fingertips: flash burst + impact lines
        const [fx, fy] = k.screenAt(SNAP_AT[0], SNAP_AT[1], 16);
        const fl = env(t, T_SNAP - 0.02, T_SNAP + 0.2);
        if (fl > 0 && fl < 1) {
          const sz = Math.sin(Math.PI * Math.min(1, fl * 1.6));
          spiky(fx, fy, 11 * sz, 11 * sz, 9, fade, '#fffbe6', 1.3, 0.3, 0.45);
          c.save(); c.strokeStyle = INK; c.lineCap = 'round'; c.globalAlpha = fade * (1 - fl);
          for (let i = 0; i < 9; i++) {
            const an = i * Math.PI * 2 / 9 + 0.15, r0 = 12 + 12 * fl, r1 = r0 + 7 * (1 - fl) + 2;
            c.lineWidth = 1.7;
            c.beginPath(); c.moveTo(fx + Math.cos(an) * r0, fy + Math.sin(an) * r0);
            c.lineTo(fx + Math.cos(an) * r1, fy + Math.sin(an) * r1); c.stroke();
          }
          c.restore();
        }
        // SNAP! in a comic burst above the cup
        const lp = env(t, T_SNAP, T_SNAP + 0.1);
        const lo = 1 - env(t, T_SNAP + 0.62, T_SNAP + 0.82);
        if (lp > 0 && lo > 0) {
          const [lx, ly] = k.screenAt(352, 100, 0);
          c.save();
          c.translate(lx, ly); c.rotate(-0.16);
          const sc = lerp(1.3, 1, ease.outBack(lp)) * (0.85 + 0.15 * lo);
          c.scale(sc, sc);
          const a = fade * lo;
          spiky(0, 0, 33, 17, 11, a, '#ffffff', 1.6, 0, 0.74);
          c.globalAlpha = a;
          c.font = `italic 900 16px ${BLACK}`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.lineWidth = 4.6; c.strokeStyle = INK; c.strokeText('SNAP!', 0, 0.5);
          c.fillStyle = '#ffcc2e'; c.fillText('SNAP!', 0, 0.5);
          c.restore();
        }
      },
    };
  },
};
