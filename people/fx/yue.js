/* Yue — 棒球 Home run, hot-blooded (熱血) manga style (M.S. at Waseda, hence the Japanese SFX)
   Click: the sunny sea window turns into a ballpark at night and the floodlight banks clunk on;
   a wooden bat (toon + ink, taped grip) spins into his folded hands and lies across his arms.
   Then one home run, drawn like a sports manga: his glasses flash, the background bursts into
   red / orange rays with focus lines closing in from the rim, he coils the bat back (it
   trembles), the pitch streaks in from the right with speed lines and a hand-lettered
   「シュバッ!」; a violent level swing with a smear across his chest — CONTACT: hit-stop, an
   impact frame (inverted, then posterised), a spiky impact star, the whole stage shakes and
   「カキーン!!」 punches in; the ball rockets off over the stands with a trail while sparks and
   wood chips burst from the bat, it leaves with a star twinkle, he whips the bat up high and
   「ホームラン!!」 pops in a spiky balloon; then he lowers the bat across his arms again.
   Loop (3.6 s beat): the bat rests across his arms and bobs, the floodlights flicker; every other
   beat the home run is replayed, softer (no rays, no impact frame, a small shake).
   Photo landmarks (512 px): face 273,110 · glasses: lenses 260,93 / 306,95 · fist 348,388 ·
   right shoulder 345,172 · elbow 440,300 · window x > 200 · deck / field y 190-310 ·
   table edge y ~315 (right) · chair 0-67 x 260-407. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const WOOD = 0xdba766, INK = 0x16151a, PAPER = 0xfff6dc;
const S0 = 0.6;            // first pitch sequence starts here (s = 0)
const CYCLE = 7.2;         // replay every other 3.6 s beat
const BEAT = 3.6;
const L = 125;             // bat length from the grip to the end (world px)
const SWEET = 100;         // grip -> sweet spot
// the sequence (s = seconds into it)
const COCKED = 0.2;        // the bat is cocked back (then it trembles)
const SWING = 0.285;       // the swing starts
const HIT = 0.33;          // contact
const STOP = 0.47;         // the hit-stop ends: the ball leaves, the bat follows through
const GONE = 0.92;         // the ball is out of the park
const LOWER = 2.3;         // he lowers the bat again
const SEQ_END = 2.95;      // back at rest

/* ── hand-lettered katakana: tapered brush strokes in a unit box (x right, y down) ────────── */
const GW = 0.15, GINK = 0.07;
const small = (pts) => pts.map(([x, y]) => [0.04 + x * 0.62, 0.36 + y * 0.62]);   // small kana sit low
const GLYPHS = {
  'シ': { a: 1, s: [
    { p: [[0.16, 0.2], [0.34, 0.32]], w: [1.05, 0.85] },
    { p: [[0.08, 0.46], [0.27, 0.58]], w: [1.05, 0.85] },
    { p: [[0.14, 0.9], [0.58, 0.76], [0.9, 0.2]], c: 1, w: [1.25, 0.5] }] },
  'ュ': { a: 0.72, s: [
    { p: small([[0.22, 0.3], [0.76, 0.3], [0.73, 0.8]]), w: [1, 1] },
    { p: small([[0.06, 0.82], [0.94, 0.82]]), w: [1.1, 0.9] }] },
  'バ': { a: 1, s: [
    { p: [[0.36, 0.3], [0.3, 0.62], [0.06, 0.86]], c: 1, w: [1.2, 0.55] },
    { p: [[0.56, 0.34], [0.78, 0.56], [0.94, 0.84]], c: 1, w: [1.05, 1.15] },
    { p: [[0.7, 0.04], [0.77, 0.18]], w: [0.9, 0.8] },
    { p: [[0.86, 0], [0.93, 0.14]], w: [0.9, 0.8] }] },
  'ッ': { a: 0.72, s: [
    { p: small([[0.12, 0.22], [0.24, 0.46]]), w: [1, 0.85] },
    { p: small([[0.42, 0.16], [0.54, 0.4]]), w: [1, 0.85] },
    { p: small([[0.9, 0.18], [0.82, 0.62], [0.32, 0.96]]), c: 1, w: [1.2, 0.5] }] },
  '!': { a: 0.44, s: [
    { p: [[0.23, 0.04], [0.21, 0.64]], w: [1.6, 0.7] },
    { p: [[0.2, 0.87], [0.205, 0.875]], w: [1.35, 1.35] }] },
  'カ': { a: 1, s: [
    { p: [[0.12, 0.34], [0.82, 0.3], [0.78, 0.86], [0.64, 0.78]], w: [1, 1] },
    { p: [[0.46, 0.05], [0.42, 0.56], [0.1, 0.92]], c: 1, w: [1.2, 0.5] }] },
  'キ': { a: 1, s: [
    { p: [[0.16, 0.33], [0.84, 0.25]], w: [1, 1] },
    { p: [[0.08, 0.6], [0.92, 0.51]], w: [1, 1] },
    { p: [[0.42, 0.05], [0.58, 0.95]], w: [1.15, 0.85] }] },
  'ー': { a: 1, s: [
    { p: [[0.06, 0.54], [0.5, 0.44], [0.94, 0.5]], c: 1, w: [1.15, 1] }] },
  'ン': { a: 1, s: [
    { p: [[0.13, 0.2], [0.34, 0.36]], w: [1.05, 0.85] },
    { p: [[0.14, 0.9], [0.6, 0.74], [0.9, 0.2]], c: 1, w: [1.25, 0.5] }] },
  'ホ': { a: 1, s: [
    { p: [[0.08, 0.34], [0.92, 0.33]], w: [1, 1] },
    { p: [[0.5, 0.04], [0.5, 0.9], [0.4, 0.83]], w: [1.1, 1] },
    { p: [[0.3, 0.52], [0.1, 0.8]], w: [1, 0.8] },
    { p: [[0.7, 0.52], [0.92, 0.8]], w: [1, 0.9] }] },
  'ム': { a: 1, s: [
    { p: [[0.44, 0.06], [0.16, 0.8], [0.86, 0.7]], w: [1.05, 1] },
    { p: [[0.66, 0.48], [0.9, 0.88]], w: [1, 1] }] },
  'ラ': { a: 1, s: [
    { p: [[0.24, 0.12], [0.76, 0.12]], w: [1, 1] },
    { p: [[0.14, 0.4], [0.84, 0.38], [0.8, 0.62], [0.62, 0.82], [0.3, 0.95]], w: [1, 0.6] }] },
};
/** sample a stroke: a quadratic through 3 points when `c`, else a polyline (corners flagged) */
function sampleStroke(st) {
  const p = st.p, out = [];
  if (st.c) {
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, v = 1 - u;
      out.push([v * v * p[0][0] + 2 * u * v * p[1][0] + u * u * p[2][0], v * v * p[0][1] + 2 * u * v * p[1][1] + u * u * p[2][1], false]);
    }
  } else {
    for (let j = 0; j < p.length - 1; j++) {
      for (let i = 0; i < 5; i++) out.push([p[j][0] + (p[j + 1][0] - p[j][0]) * i / 5, p[j][1] + (p[j + 1][1] - p[j][1]) * i / 5, i === 0 && j > 0]);
    }
    out.push([p[p.length - 1][0], p[p.length - 1][1], false]);
  }
  return out;
}
/** the outline of a tapered stroke with round caps, `grow` added to its width */
function strokePath(st, grow) {
  const P = sampleStroke(st), n = P.length - 1, Lf = [], Rt = [], len = [0];
  for (let i = 1; i <= n; i++) len.push(len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const wid = i => GW * (st.w[0] + (st.w[1] - st.w[0]) * (len[i] / (len[n] || 1))) + grow;
  for (let i = 0; i <= n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1], m = 1;
    if (P[i][2]) {                       // a corner: miter the two segments
      const d0x = P[i][0] - P[i - 1][0], d0y = P[i][1] - P[i - 1][1], d1x = P[i + 1][0] - P[i][0], d1y = P[i + 1][1] - P[i][1];
      const l0 = Math.hypot(d0x, d0y), l1 = Math.hypot(d1x, d1y);
      tx = d0x / l0 + d1x / l1; ty = d0y / l0 + d1y / l1;
      m = Math.min(2, 1 / Math.sqrt(Math.max(0.05, (1 + (d0x * d1x + d0y * d1y) / (l0 * l1)) / 2)));
    }
    const tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, h = wid(i) / 2 * m;
    Lf.push([P[i][0] + nx * h, P[i][1] + ny * h]);
    Rt.push([P[i][0] - nx * h, P[i][1] - ny * h]);
  }
  const path = new Path2D();
  path.moveTo(Lf[0][0], Lf[0][1]);
  for (let i = 1; i <= n; i++) path.lineTo(Lf[i][0], Lf[i][1]);
  const ea = Math.atan2(Lf[n][1] - P[n][1], Lf[n][0] - P[n][0]);
  path.arc(P[n][0], P[n][1], wid(n) / 2, ea, ea + Math.PI, true);
  for (let i = n; i >= 0; i--) path.lineTo(Rt[i][0], Rt[i][1]);
  const sa = Math.atan2(Rt[0][1] - P[0][1], Rt[0][0] - P[0][0]);
  path.arc(P[0][0], P[0][1], wid(0) / 2, sa, sa + Math.PI, true);
  path.closePath();
  return path;
}
const glyphCache = new Map();
function glyph(ch) {
  if (!glyphCache.has(ch)) {
    const g = GLYPHS[ch];                // one path per stroke: their windings differ
    glyphCache.set(ch, { a: g.a, fill: g.s.map(st => strokePath(st, 0)), ink: g.s.map(st => strokePath(st, GINK * 2)) });
  }
  return glyphCache.get(ch);
}
/** letter a word: items [{ ch, x, y, s (size), r (rotation), a (alpha) }]; shadow, ink, then fill */
function letter(c, items, { fill = '#ffe24a', shadow = '#e2362a', ink = '#16151a', dx = 2.4, dy = 2.4, skew = -0.18 } = {}) {
  for (const [col, key, ox, oy] of [[shadow, 'ink', dx, dy], [ink, 'ink', 0, 0], [fill, 'fill', 0, 0]]) {
    if (!col) continue;
    c.fillStyle = col;
    for (const it of items) {
      if (!(it.a > 0.01) || !(it.s > 0.05)) continue;
      const gp = glyph(it.ch);
      c.save();
      c.globalAlpha = Math.min(1, it.a);
      c.translate(it.x + ox, it.y + oy);
      c.rotate(it.r || 0);
      c.transform(1, 0, skew, 1, 0, 0);
      c.scale(it.s, it.s);
      c.translate(-0.5, -0.5);
      for (const pa of gp[key]) c.fill(pa);
      c.restore();
    }
  }
}
/** glyph centres along a straight baseline from (x, y) at angle `ang`, `track` = spacing factor */
function layout(word, x, y, size, ang, track = 0.9) {
  const out = [];
  let d = 0;
  for (const ch of word) {
    const a = GLYPHS[ch].a * size * track;
    out.push({ ch, x: x + Math.cos(ang) * (d + a / 2), y: y + Math.sin(ang) * (d + a / 2), s: size, r: ang, a: 1 });
    d += a;
  }
  return out;
}

/* the night ballpark painted over the window (canvas px = photo px) */
function drawPark(g) {
  const r = rng(11);
  g.save();
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(512, 0); g.lineTo(512, 330); g.lineTo(446, 320); g.lineTo(300, 306);
  g.lineTo(112, 302); g.lineTo(84, 262); g.lineTo(0, 258); g.closePath();
  g.clip();
  let gr = g.createLinearGradient(0, 0, 0, 200);
  gr.addColorStop(0, '#060a20'); gr.addColorStop(0.55, '#111a46'); gr.addColorStop(1, '#2b2c66');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 210);
  g.fillStyle = 'rgba(225,232,255,0.75)';
  for (let i = 0; i < 24; i++) { const x = r() * 512, y = r() * 140; g.fillRect(x, y, 2, 2); }
  // light towers: poles, then the lamp banks (unlit; the lit lamps are separate cards)
  g.fillStyle = '#0b1030';
  g.fillRect(124, 76, 8, 110); g.fillRect(459, 170, 6, 12);
  const bank = (cx, cy, w, h, rows, cols) => {
    g.fillStyle = '#1b2142'; g.strokeStyle = '#05071a'; g.lineWidth = 3;
    g.beginPath(); g.rect(cx - w / 2, cy - h / 2, w, h); g.fill(); g.stroke();
    g.fillStyle = '#3b4266';
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      g.beginPath(); g.arc(cx - w / 2 + (j + 0.5) * w / cols, cy - h / 2 + (i + 0.5) * h / rows, Math.min(w / cols, h / rows) * 0.34, 0, 6.283); g.fill();
    }
  };
  bank(128, 62, 64, 32, 3, 6);
  bank(462, 160, 44, 22, 2, 5);
  // the stands, with a halftone crowd
  g.fillStyle = '#0d1230';
  g.beginPath(); g.moveTo(0, 184); g.quadraticCurveTo(256, 160, 512, 176); g.lineTo(512, 240); g.lineTo(0, 240); g.closePath(); g.fill();
  for (let y = 190; y < 232; y += 6) {
    for (let x = (y % 12) ? 3 : 6; x < 512; x += 6) {
      const c = r();
      g.fillStyle = c < 0.07 ? '#f6e7ae' : c < 0.38 ? '#48538a' : c < 0.66 ? '#634f7c' : '#283061';
      g.beginPath(); g.arc(x, y, 2.1, 0, 6.283); g.fill();
    }
  }
  // outfield wall with the yellow home-run line, then the lit grass
  g.fillStyle = '#133d31'; g.fillRect(0, 234, 512, 14);
  g.fillStyle = '#f3cf3f'; g.fillRect(0, 231, 512, 4);
  gr = g.createLinearGradient(0, 248, 0, 334);
  gr.addColorStop(0, '#46a35c'); gr.addColorStop(1, '#236e3c');
  g.fillStyle = gr; g.fillRect(0, 248, 512, 90);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = -4; i < 14; i += 2) {
    g.beginPath(); g.moveTo(i * 44, 248); g.lineTo(i * 44 + 44, 248); g.lineTo(i * 64 - 30, 340); g.lineTo(i * 64 - 94, 340); g.closePath(); g.fill();
  }
  g.fillStyle = '#b8804b'; g.beginPath(); g.ellipse(446, 272, 22, 6, 0, 0, 6.283); g.fill();
  g.fillStyle = '#ffffff'; g.fillRect(442, 270, 8, 2.4);
  g.restore();
}

export default {
  title: 'Home run',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const R = k.R;
    const plate = k.layers.plate.material, person = k.layers.person.material;

    // ① the ballpark behind him, lamp banks, light cones
    const park = new THREE.Mesh(new THREE.CircleGeometry(R, 128), new THREE.MeshBasicMaterial({ map: k.canvasTexture(512, 512, drawPark), transparent: true, opacity: 0, depthWrite: false }));
    park.position.z = k.Z_BACK + 2;
    park.scale.setScalar(k.depthScale(k.Z_BACK + 2));
    park.renderOrder = -18;
    root.add(park);

    const lampDraw = (rows, cols) => (g, w, h) => {
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
        const x = (j + 0.5) * w / cols, y = (i + 0.5) * h / rows, rr = Math.min(w / cols, h / rows) * 0.36;
        g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(x, y, rr, 0, 6.283); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, rr * 0.55, 0, 6.283); g.fill();
      }
    };
    const banks = [
      { u: 128, v: 62, w: 64, h: 32, rows: 3, cols: 6, on: 0.30, to: [196, 330] },
      { u: 462, v: 160, w: 44, h: 22, rows: 2, cols: 5, on: 0.40, to: [380, 330] },
    ].map(b => {
      const s = 200 / 512;
      const card = k.card(b.w * s, b.h * s, lampDraw(b.rows, b.cols));
      card.material.transparent = true; card.material.depthWrite = false; card.material.opacity = 0;
      card.renderOrder = -17;
      card.position.copy(k.at(b.u, b.v, k.Z_BACK + 3));
      card.scale.setScalar(k.depthScale(k.Z_BACK + 3));
      const glow = k.glowSprite('rgba(255,240,200,0.85)', b.w * s * 1.9, 0);
      k.clip(glow.material);
      glow.position.copy(k.at(b.u, b.v, -31));
      glow.renderOrder = -15;
      root.add(card, glow);
      return { ...b, card, glow };
    });
    const coneTex = k.canvasTexture(128, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,246,214,0.95)'); gr.addColorStop(0.45, 'rgba(255,246,214,0.32)'); gr.addColorStop(1, 'rgba(255,246,214,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(w * 0.4, 0); g.lineTo(w * 0.6, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
    });
    banks.forEach(b => {
      const len = 130, wid = 58;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, len), k.clip(new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })));
      m.geometry.translate(0, -len / 2, 0);
      const p = k.at(b.u, b.v + 8, -30), q = k.at(b.to[0], b.to[1], -30);
      m.position.copy(p);
      m.rotation.z = Math.atan2(q.x - p.x, -(q.y - p.y));
      m.renderOrder = -16;
      root.add(m);
      b.cone = m;
    });

    // ② the 熱血 backdrop for the first home run: red / orange rays from his head, halftone on the red
    const raysGeo = new THREE.CircleGeometry(R + 2, 128);
    { const uv = raysGeo.attributes.uv, f = (R + 2) / R; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5); }
    const raysMat = k.clip(new THREE.ShaderMaterial({
      uniforms: {
        uOp: { value: 0 }, uRot: { value: 0 }, uCell: { value: 3.2 * k.dpr },
        uC: { value: new THREE.Vector2(273 / 512, 1 - 118 / 512) },
        uRed: { value: new THREE.Color(0xd8262a) }, uOrange: { value: new THREE.Color(0xff9d24) },
        uDot: { value: new THREE.Color(0x9c1219) }, uCore: { value: new THREE.Color(0xffe27a) },
      },
      vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uOp, uRot, uCell; uniform vec2 uC; uniform vec3 uRed, uOrange, uDot, uCore; varying vec2 vUv;
        void main() {
          vec2 d = vUv - uC;
          float r = length(d);
          float f = fract((atan(d.y, d.x) + uRot) / 6.2831853 * 20.0);
          bool red = f < 0.5;
          vec3 col = red ? uRed : uOrange;
          vec2 g = fract(gl_FragCoord.xy / uCell) - 0.5;
          if (red && length(g) < 0.1 + 0.32 * clamp(r * 1.7, 0.0, 1.0)) col = uDot;
          if (r < 0.2) col = uCore;
          gl_FragColor = vec4(col, uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const rays = new THREE.Mesh(raysGeo, raysMat);
    rays.position.z = k.Z_BACK + 2.5;
    rays.scale.setScalar(k.depthScale(k.Z_BACK + 2.5));
    rays.renderOrder = -14;
    root.add(rays);

    // ③ the bat: origin = the grip in his fist; `aim` turns +Y onto the bat direction
    const bat = new THREE.Group();
    const aim = new THREE.Group();
    bat.add(aim);
    const prof = [[0, -18], [3.3, -18], [3.8, -16.6], [3.4, -15], [2.3, -13.6], [2.05, -12], [2.15, 10], [2.45, 26], [3.2, 44],
      [4.4, 62], [5.4, 80], [5.95, 96], [6.05, 112], [5.7, 120], [4.4, 123.4], [2.3, 124.8], [0, 125.2]];
    const woodMat = k.toon(WOOD);
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 28), woodMat);
    k.ink(body, 1.35);
    const tapeTex = k.canvasTexture(64, 256, (g, w, h) => {
      g.fillStyle = '#221c28'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#b3313c'; g.lineWidth = 7;
      for (let y = -64; y < h + 64; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 30); g.stroke(); }
    });
    const tapeMat = k.toon(0xffffff, { map: tapeTex });
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(2.62, 2.42, 30, 24, 1, true), tapeMat);
    tape.position.y = 4;
    aim.add(body, tape);
    const gripHome = k.at(348, 388, 8);
    bat.position.copy(gripHome);
    root.add(bat);
    // his folded hands, re-layered in front of the handle
    const fist = k.patch([[298, 370], [318, 356], [336, 350], [354, 347], [372, 351], [392, 360], [398, 380], [390, 398],
      [372, 410], [356, 418], [338, 420], [318, 416], [300, 404], [292, 388]], 16);

    // ④ the ball (inside the circle: it streaks in through the rim)
    const ballTex = k.canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d42f37'; g.lineWidth = 6;
      for (const ph of [0, Math.PI]) {
        g.beginPath();
        for (let x = 0; x <= w; x += 4) { const y = h / 2 + Math.sin(x / w * Math.PI * 4 + ph) * h * 0.27; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 16), k.clip(k.toon(0xffffff, { map: ballTex })));
    k.ink(ball, 1.15);
    root.add(ball);

    // ⑤ impact frame: a flat disc behind him + his silhouette in one flat colour
    const flash = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0, depthWrite: false }));
    flash.position.z = k.Z_BACK + 0.5; flash.scale.setScalar(k.depthScale(k.Z_BACK + 0.5)); flash.renderOrder = 5;
    const silMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: person.map }, uColor: { value: new THREE.Color(PAPER) } },
      vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 uColor; varying vec2 vUv;\nvoid main() {\n  float a = texture2D(map, vUv).a;\n  if (a < 0.02) discard;\n  gl_FragColor = vec4(uColor, a);\n  #include <colorspace_fragment>\n}',
      transparent: true, depthWrite: false,
    });
    const sil = new THREE.Mesh(k.layers.person.geometry, silMat);
    sil.position.z = 0.5; sil.renderOrder = 11; sil.visible = false;
    root.add(flash, sil);
    const flatLight = new THREE.MeshBasicMaterial({ color: PAPER }), flatDark = new THREE.MeshBasicMaterial({ color: INK });

    // ── the swing: bat directions (world, y up, z toward the viewer) ──
    const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
    // a level swing seen from the front. At rest the bat lies across his arms to the left (as in the old
    // version); he dips it toward us, coils it back (it trembles), sweeps it left to right in front of his
    // chest (his face stays clear) to meet the ball front-right, whips it up and holds it high while the
    // ball flies off on the right, then lowers it past his chest back across his arms. The bat end stays
    // inside the circle all the way, on every tile size.
    const D_REST = V(-0.85, 0.35, 0.4), D_PRE = V(-0.62, 0.3, 0.72), D_COCK = V(-0.8, 0.52, 0.28);
    const D_HIT = V(0.24, 0.34, 0.91), D_UP = V(0.11, 1, 0.03), D_LOW = V(0.02, 0.42, 0.9);
    const UP = new THREE.Vector3(0, 1, 0);
    const contact = gripHome.clone().addScaledVector(D_HIT, SWEET);
    const P_IN = k.at(512, 110, 10);                // the pitch comes in through the rim, upper right
    const ballHit = contact.clone().addScaledVector(P_IN.clone().sub(contact).normalize(), 6);   // on the bat's face
    const PM = k.at(478, 236, 50);                  // bend of its flight out (right of the raised bat)
    const PV = k.at(448, 128, -30);                 // where it leaves, over the stands
    const nl = (a, b, u, out) => out.copy(a).lerp(b, u).normalize();
    const tmpD = new THREE.Vector3(), tmpA = new THREE.Vector3();

    /* the pitch sequence the clock is in: s = seconds into it (-1 = none), replay = not the first */
    const seqOf = (t) => {
      const s = t - S0;
      return s < 0 ? -1 : s - Math.floor(s / CYCLE) * CYCLE;
    };
    const replayOf = (t) => t - S0 >= CYCLE;
    /** weight of the idle bob: eased out before each pitch and back in after it, so the bat never snaps */
    const bobOf = (t) => {
      const s = t - S0;
      if (s < 0) return clamp(-s / 0.4);
      const q = s - Math.floor(s / CYCLE) * CYCLE;
      return Math.min(clamp((q - SEQ_END) / 0.4), clamp((CYCLE - q) / 0.4));
    };
    /** bat direction at sequence time s (+ the idle bob at clock t) */
    const batDir = (s, t, out) => {
      if (s < 0 || s >= SEQ_END) {
        const b = Math.sin(t * Math.PI * 2 / BEAT) * bobOf(t);
        return out.set(D_REST.x, D_REST.y + 0.04 * b, D_REST.z).normalize();
      }
      if (s < 0.08) return nl(D_REST, D_PRE, ease.inOut(s / 0.08), out);                   // dips toward us
      if (s < COCKED) return nl(D_PRE, D_COCK, ease.inOut((s - 0.08) / (COCKED - 0.08)), out);  // coils back
      if (s < SWING) {                                                                      // cocked: it trembles
        const j = Math.sin(s * 170) * 0.03 * env(s, COCKED, COCKED + 0.02);
        out.copy(D_COCK); out.y += j; out.x += j * 0.3;
        return out.normalize();
      }
      if (s < HIT) return nl(D_COCK, D_HIT, ease.in((s - SWING) / (HIT - SWING)), out);
      if (s < STOP) return out.copy(D_HIT);                                                 // hit-stop
      if (s < STOP + 0.2) return nl(D_HIT, D_UP, ease.outBack((s - STOP) / 0.2, 1.6), out); // whips it up
      if (s < LOWER) return out.copy(D_UP);                                                 // holds it high
      const u = ease.inOut(env(s, LOWER, SEQ_END));                                         // lowers it past his chest
      return u < 0.5 ? nl(D_UP, D_LOW, u * 2, out) : nl(D_LOW, D_REST, u * 2 - 1, out);
    };
    /** ball position at sequence time s; returns its scale (0 = hidden) */
    const ballAt = (s, out) => {
      if (s < 0.1 || s >= GONE) return 0;
      if (s < HIT) {
        const u = (s - 0.1) / (HIT - 0.1);
        out.copy(P_IN).lerp(ballHit, u);
        return lerp(0.8, 1.25, u);
      }
      if (s < STOP) { out.copy(ballHit); return 1.25; }
      // then it rockets off and slows
      const u = 1 - Math.pow(1 - (s - STOP) / (GONE - STOP), 3), v = 1 - u;
      out.set(0, 0, 0).addScaledVector(ballHit, v * v).addScaledVector(PM, 2 * u * v).addScaledVector(PV, u * u);
      return lerp(1.4, 0.08, Math.pow(u, 0.75));
    };
    const tipAt = (s, t, frac, out) => out.copy(gripHome).addScaledVector(batDir(s, t, tmpD), L * frac);
    const impactOf = (s, replay) => (replay || s < HIT || s >= 0.41) ? 0 : (s < 0.37 ? 1 : 2);
    /** the stage shake after contact (jerky: a new offset 45 times a second) */
    const shakeOf = (s, replay) => (s < HIT || s >= 0.72) ? 0 : (replay ? 1.6 : 4) * Math.pow(1 - (s - HIT) / (0.72 - HIT), 1.6);
    // how far the stage may move each way before the (hovered, 5 % larger) photo reaches the tile edge
    k.camera.updateMatrixWorld();                   // (the first render has not happened yet)
    root.updateMatrixWorld(true);
    const [acx, acy] = k.screenAt(256, 256, 0), band = 2.5 / k.s + 5;
    const room = { l: Math.max(0, acx - R - band), r: Math.max(0, k.W - acx - R - band), t: Math.max(0, acy - R - band - 2 / k.s), b: Math.max(0, k.H - acy - R - band) };
    const jit = (t, i) => { const x = Math.sin((Math.floor(t * 45) + i * 1013) * 12.9898 + i * 78.233) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

    // fixed random sets
    const rr = rng(5);
    const focus = Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * Math.PI * 2 + (rr() - 0.5) * 0.12, w: 0.012 + rr() * 0.03, f: 0.3 + rr() * 0.35 }));
    const rim = Array.from({ length: 44 }, (_, i) => ({ a: (i / 44) * Math.PI * 2 + (rr() - 0.5) * 0.1, w: 0.008 + rr() * 0.016, b: 12 + rr() * 22 }));
    const sparks = Array.from({ length: 16 }, () => ({ a: rr() * Math.PI * 2, v: 150 + rr() * 170, l: 6 + rr() * 8 }));
    const chips = Array.from({ length: 6 }, () => ({ a: -Math.PI * (0.15 + rr() * 0.7), v: 80 + rr() * 80, rot: rr() * 6, spin: (rr() - 0.5) * 30, w: 3 + rr() * 2 }));
    const balloon = Array.from({ length: 36 }, (_, i) => (i % 2 ? 0.8 : 1.1 + rr() * 0.12));
    const tint = new THREE.Color();
    const ballPos = new THREE.Vector3(), trailA = new THREE.Vector3(), tipTmp = new THREE.Vector3();

    return {
      update(t, e) {
        const s = seqOf(t), replay = replayOf(t);
        const out = 1 - ease.in(clamp(e * 1.6));
        // night: park fades in over the window, the room darkens, the banks clunk on
        const b = presence(t, e, 0.05, 0.4, ease.out, 0);
        park.material.opacity = b;
        plate.color.setRGB(lerp(1, 0.42, b), lerp(1, 0.47, b), lerp(1, 0.72, b));
        tint.setRGB(lerp(1, 0.84, b), lerp(1, 0.88, b), 1);
        person.color.copy(tint);
        fist.material.color.copy(tint);
        banks.forEach((bk, i) => {
          const on = (t >= bk.on && !(t > bk.on + 0.045 && t < bk.on + 0.085)) ? 1 : 0;
          const flick = 0.92 + 0.08 * Math.sin(t * 21 + i * 2) * Math.sin(t * 2.7 + i);
          const lv = on * out * flick;
          bk.card.material.opacity = lv;
          bk.glow.material.opacity = 0.55 * lv;
          bk.cone.material.opacity = 0.2 * lv * (0.86 + 0.14 * Math.sin(t * Math.PI * 2 / BEAT + i * 1.3));
        });
        // the rays burst in for the wind-up of the first home run and die down after the impact frame
        const ro = replay || s < 0 ? 0 : ease.out(env(s, 0.02, 0.08)) * (1 - ease.inOut(env(s, 0.42, 0.64))) * out;
        raysMat.uniforms.uOp.value = ro;
        raysMat.uniforms.uRot.value = t * 0.5;
        rays.visible = ro > 0.003;

        // bat: spins into his fist, then the swing / the rest upright
        const bi = presence(t, e, 0.1, 0.42, ease.out, 0.3);
        k.show(bat, bi);
        const swingIn = 1 - ease.outBack(env(t, 0.1, 0.55), 2.2);
        const fly = ease.in(clamp(e * 1.6 - 0.1));
        batDir(s, t, tmpD);
        if (swingIn !== 0) tmpD.applyAxisAngle(tmpA.set(0, 0, 1), -1.25 * swingIn);
        aim.quaternion.setFromUnitVectors(UP, tmpD);
        const bob = (s < 0 || s >= SEQ_END) ? Math.sin(t * Math.PI * 2 / BEAT) * 0.7 * bobOf(t) : 0;
        const pump = s >= 0 && s < SEQ_END ? Math.sin(Math.PI * env(s, 0.8, 1.08)) * 3.5 : 0;   // pumps it once
        bat.position.set(gripHome.x + 50 * fly, gripHome.y + 40 * fly + bob + pump, gripHome.z);

        // ball
        const bs = ballAt(s, ballPos) * (1 - clamp(e * 2.2));
        k.show(ball, bs);
        ball.position.copy(ballPos);
        const spin = s >= HIT && s < STOP ? t - (s - HIT) : t;       // frozen in the hit-stop
        ball.rotation.set(spin * 9, spin * 14, 0);

        // impact frame (first hit only): A inverted, B posterised; never once the exit runs
        const f = impactOf(s, replay) * (e > 0 ? 0 : 1);
        flash.material.opacity = f ? 1 : 0;
        flash.material.color.set(f === 1 ? INK : 0xffe27a);
        sil.visible = f > 0;
        silMat.uniforms.uColor.value.set(f === 1 ? PAPER : INK);
        body.material = f === 1 ? flatLight : f === 2 ? flatDark : woodMat;
        tape.material = f === 1 ? flatLight : f === 2 ? flatDark : tapeMat;
        fist.visible = f === 0;
        banks.forEach(bk => { bk.glow.visible = f === 0; bk.cone.visible = f === 0; });
        // the stage shakes on contact (it stops as soon as the exit starts: e = 1 is the photo in place)
        const sh = shakeOf(s, replay) * (1 - clamp(e * 4));
        const dx = lerp(-Math.min(sh, room.l), Math.min(sh, room.r), (jit(t, 1) + 1) / 2);
        const dy = lerp(-Math.min(sh, room.b), Math.min(sh, room.t), (jit(t, 2) + 1) / 2) * 0.8;
        root.position.set(dx, dy, 0);
        root.rotation.z += jit(t, 3) * sh * 0.009;
      },

      draw2d(q, t, e) {
        const s = seqOf(t), replay = replayOf(t);
        if (s < 0) return;
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const c = q.ctx || q.drawingContext;
        const [cx, cy] = k.screenAt(256, 256, 0);
        const [hx, hy] = k.toScreen(contact);
        const [fx, fy] = k.screenAt(273, 112, 0);
        const f = impactOf(s, replay) * (e > 0 ? 0 : 1);          // no impact frame once the exit runs (as in update)
        const X = x => cx - 100 + x, Y = y => cy - 100 + y;       // avatar px (0..200) -> screen
        c.save();
        c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
        c.lineCap = 'round'; c.lineJoin = 'round';

        // focus lines closing in from the rim during the wind-up (first home run)
        if (!replay && s < HIT) {
          const al = ease.out(env(s, 0.03, 0.12)) * fade;
          c.fillStyle = `rgba(255,250,236,${0.85 * al})`;
          const ox = fx - cx, oy = fy - cy;
          for (const l of rim) {
            const ux = Math.cos(l.a), uy = Math.sin(l.a), pu = ox * ux + oy * uy;
            const dExit = -pu + Math.sqrt(pu * pu - (ox * ox + oy * oy - R * R));
            const r1 = dExit + 30, r0 = dExit - l.b * (0.7 + 0.3 * al);
            c.beginPath();
            c.moveTo(fx + Math.cos(l.a - l.w) * r1, fy + Math.sin(l.a - l.w) * r1);
            c.lineTo(fx + Math.cos(l.a + l.w) * r1, fy + Math.sin(l.a + l.w) * r1);
            c.lineTo(fx + ux * r0, fy + uy * r0);
            c.fill();
          }
        }
        // the pitch: a comet tail and speed lines behind the ball
        if (s > 0.1 && s < HIT) {
          ballAt(s, trailA); const [bx, by] = k.toScreen(trailA);
          const [px, py] = k.toScreen(P_IN);
          const dx = bx - px, dy = by - py, dl = Math.hypot(dx, dy) || 1;
          const ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;
          const tail = Math.min(dl, 46), w = 5.5;
          c.beginPath();
          c.moveTo(bx + nx * w, by + ny * w); c.lineTo(bx - ux * tail, by - uy * tail); c.lineTo(bx - nx * w, by - ny * w); c.closePath();
          c.fillStyle = `rgba(22,21,26,${0.9 * fade})`; c.fill();
          c.beginPath();
          c.moveTo(bx + nx * (w - 1.6), by + ny * (w - 1.6)); c.lineTo(bx - ux * (tail - 5), by - uy * (tail - 5)); c.lineTo(bx - nx * (w - 1.6), by - ny * (w - 1.6)); c.closePath();
          c.fillStyle = `rgba(255,255,255,${fade})`; c.fill();
          for (let i = -3; i <= 3; i++) {
            if (!i) continue;
            const o = i * 4.2, ln = 14 + 9 * (3 - Math.abs(i)), st = 7 + Math.abs(i) * 3;
            const x0 = bx + nx * o - ux * st, y0 = by + ny * o - uy * st;
            c.strokeStyle = `rgba(22,21,26,${0.8 * fade})`; c.lineWidth = 2.6;
            c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - ux * ln, y0 - uy * ln); c.stroke();
            c.strokeStyle = `rgba(255,255,255,${fade})`; c.lineWidth = 1.2;
            c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 - ux * ln, y0 - uy * ln); c.stroke();
          }
        }
        // the swing smear: the whole arc of the bat end, thick at the bat, held through the hit-stop
        if (s > SWING && s < STOP + 0.1) {
          const a1 = Math.min(s, HIT);
          const al = (s < STOP ? 1 : 1 - (s - STOP) / 0.1) * fade;
          if (a1 > SWING + 0.002 && al > 0) {
            const N = 18, pts = [];
            for (let i = 0; i <= N; i++) {
              const u = i / N, ss = lerp(SWING, a1, u);
              const [ox, oy] = k.toScreen(tipAt(ss, t, 1.02, tipTmp));
              const [ix, iy] = k.toScreen(tipAt(ss, t, 1 - 0.46 * Math.pow(u, 0.7), tipTmp));
              pts.push([ox, oy, ix, iy, ss]);
            }
            c.beginPath();
            pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
            for (let i = N; i >= 0; i--) c.lineTo(pts[i][2], pts[i][3]);
            c.closePath();
            c.fillStyle = f === 1 ? `rgba(255,247,222,${al})` : f === 2 ? `rgba(22,21,26,${al})` : `rgba(255,252,236,${0.92 * al})`;
            c.fill();
            if (f !== 1) {
              c.strokeStyle = f === 2 ? `rgba(255,247,222,${al})` : `rgba(22,21,26,${al})`; c.lineWidth = 1.4;
              c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
              // speed lines inside the smear
              c.lineWidth = 0.9;
              for (const fr of [0.66, 0.78, 0.9]) {
                c.beginPath();
                for (let i = 4; i <= N; i++) { const [x, y] = k.toScreen(tipAt(pts[i][4], t, fr, tipTmp)); if (i > 4) c.lineTo(x, y); else c.moveTo(x, y); }
                c.stroke();
              }
            }
          }
        }
        // focus lines toward the contact
        if (s >= HIT && s < (replay ? 0.52 : 0.62)) {
          const al = f ? 1 : (replay ? 0.55 * (1 - (s - HIT) / 0.19) : 0.9 * Math.min(1, 1 - (s - 0.41) / 0.21)) * fade;
          c.fillStyle = f === 1 ? '#fff7de' : f === 2 ? '#16151a' : `rgba(255,250,236,${clamp(al)})`;
          const RR = R * 2.4, grow = f ? 1 : 1 + Math.max(0, s - (replay ? HIT : 0.41)) * 5;
          for (const l of focus) {
            const ir = RR * l.f * 0.45 * grow;
            c.beginPath();
            c.moveTo(hx + Math.cos(l.a - l.w) * RR, hy + Math.sin(l.a - l.w) * RR);
            c.lineTo(hx + Math.cos(l.a + l.w) * RR, hy + Math.sin(l.a + l.w) * RR);
            c.lineTo(hx + Math.cos(l.a) * ir, hy + Math.sin(l.a) * ir);
            c.fill();
          }
        }
        // shock ring
        if (s > 0.41 && s < 0.64) {
          const u = (s - 0.41) / 0.23, rad = 10 + 40 * ease.out(u), a = (1 - u) * fade;
          c.strokeStyle = `rgba(22,21,26,${a})`; c.lineWidth = 1.2 + 3.4 * (1 - u);
          c.beginPath(); c.ellipse(hx, hy, rad, rad * 0.8, -0.3, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 0.5 + 1.8 * (1 - u);
          c.beginPath(); c.ellipse(hx, hy, rad, rad * 0.8, -0.3, 0, Math.PI * 2); c.stroke();
        }
        // the impact star (over the ball: the flash of contact)
        if (s >= HIT && s < 0.6) {
          const u = s - HIT;
          const sc = (0.55 + 0.55 * ease.out(Math.min(1, u / 0.05))) * (s < STOP ? 1 : 1 + (s - STOP) * 2.5) * (replay ? 0.8 : 1);
          const al = (s < STOP ? 1 : 1 - (s - STOP) / 0.13) * fade;
          const star = (k1, k2, r0) => {
            c.beginPath();
            for (let i = 0; i < 24; i++) {
              const a = i / 24 * Math.PI * 2 + 0.2, rad = (i % 2 ? r0 : (i % 4 ? k1 : k2)) * sc;
              c.lineTo(hx + Math.cos(a) * rad, hy + Math.sin(a) * rad * 0.9);
            }
            c.closePath();
          };
          c.globalAlpha = clamp(al);
          star(24, 32, 11);
          c.fillStyle = f === 2 ? '#16151a' : '#fff7c4'; c.fill();
          c.strokeStyle = f === 2 ? '#fff7de' : '#16151a'; c.lineWidth = 1.8; c.stroke();
          if (f !== 2) {
            star(14, 19, 7); c.fillStyle = f === 1 ? '#fff7de' : '#ffb62e'; c.fill();
            c.beginPath(); c.arc(hx, hy, 5.5 * sc, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
          }
          c.globalAlpha = 1;
        }
        // sparks and wood chips burst from the bat as the ball leaves
        if (s > STOP && s < STOP + 0.5) {
          const tau = s - STOP;
          sparks.forEach((p, i) => {
            if (replay && i % 2) return;
            const a = (1 - tau / 0.36) * fade;
            if (a <= 0) return;
            const d = p.v * (1 - Math.exp(-6 * tau)) / 6 + 8, sp = Math.exp(-6 * tau);
            const ux = Math.cos(p.a), uy = Math.sin(p.a), l = p.l * (0.35 + 0.65 * sp);
            const x0 = hx + ux * d, y0 = hy + uy * d, x1 = hx + ux * (d - l), y1 = hy + uy * (d - l);
            c.strokeStyle = `rgba(22,21,26,${a})`; c.lineWidth = 2.8;
            c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
            c.strokeStyle = i % 3 ? `rgba(255,236,120,${a})` : `rgba(255,255,255,${a})`; c.lineWidth = 1.4;
            c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
          });
          if (!replay) {
            chips.forEach(p => {
              const a = (1 - env(tau, 0.3, 0.45)) * fade;
              if (a <= 0) return;
              const x = hx + Math.cos(p.a) * p.v * tau, y = hy + Math.sin(p.a) * p.v * tau + 210 * tau * tau;
              c.save(); c.translate(x, y); c.rotate(p.rot + p.spin * tau);
              c.globalAlpha = a;
              c.fillStyle = '#d9a35f'; c.strokeStyle = '#16151a'; c.lineWidth = 0.9;
              c.beginPath(); c.moveTo(-p.w / 2, -1); c.lineTo(p.w / 2, -1.6); c.lineTo(p.w / 2 - 0.6, 1.2); c.lineTo(-p.w / 2 + 0.4, 1.4); c.closePath();
              c.fill(); c.stroke();
              c.restore();
            });
          }
        }
        // the ball rockets away as a fireball: a fat inked comet back along its flight, speed lines beside it
        if (s > STOP && s < GONE + 0.06) {
          const al = (s < GONE - 0.12 ? 1 : 1 - (s - (GONE - 0.12)) / 0.18) * fade;
          const sHead = Math.min(s, GONE - 0.001), back = Math.min(sHead - STOP, 0.2);
          const scH = ballAt(sHead, trailA);
          const [bx, by] = k.toScreen(trailA);
          const rb = Math.abs(k.toScreen(tipTmp.copy(trailA).setX(trailA.x + 4.6 * scH))[0] - bx);
          const pts = [];
          for (let i = 0; i <= 14; i++) { ballAt(Math.max(STOP + 0.0005, sHead - back * i / 14), trailA); pts.push(k.toScreen(trailA)); }
          const wAt = i => (2 * rb + 7) * Math.pow(1 - i / 15, 0.9);     // a fireball: fat at the ball, pointed behind
          for (const [col, add, mul] of [[`rgba(22,21,26,${al})`, 3.4, 1], [`rgba(255,122,26,${al})`, 0, 1], [`rgba(255,214,62,${al})`, 0, 0.62], [`rgba(255,255,255,${al})`, 0, 0.3]]) {
            c.strokeStyle = col;
            for (let i = 1; i < pts.length; i++) {
              c.lineWidth = wAt(i - 1) * mul + add;
              c.beginPath(); c.moveTo(pts[i - 1][0], pts[i - 1][1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
            }
          }
          // speed lines on both sides, for the first burst
          if (s < STOP + 0.3) {
            const [x0, y0] = pts[0], [x1, y1] = pts[14], dl = Math.hypot(x0 - x1, y0 - y1);
            if (dl > 8) {
              const ux = (x0 - x1) / dl, uy = (y0 - y1) / dl, la = al * (1 - (s - STOP) / 0.3);
              for (const o of [-1, 1]) {
                const off = o * (rb + 9), ax = x0 + -uy * off - ux * 10, ay = y0 + ux * off - uy * 10;
                const ex = ax - ux * dl * 0.7, ey = ay - uy * dl * 0.7;
                c.strokeStyle = `rgba(22,21,26,${la})`; c.lineWidth = 2.4;
                c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
                c.strokeStyle = `rgba(255,255,255,${la})`; c.lineWidth = 1;
                c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
              }
            }
          }
          // the ball itself on top of its trail (flat, inked, red seams)
          if (rb > 0.6) {
            c.fillStyle = `rgba(251,248,238,${al})`; c.strokeStyle = `rgba(22,21,26,${al})`; c.lineWidth = Math.min(1.4, rb * 0.3);
            c.beginPath(); c.arc(bx, by, rb, 0, Math.PI * 2); c.fill(); c.stroke();
            if (rb > 2.5) {
              c.strokeStyle = `rgba(212,47,55,${al})`; c.lineWidth = Math.max(0.6, rb * 0.16);
              c.beginPath(); c.arc(bx - rb * 1.25, by, rb * 0.95, -0.6, 0.6); c.stroke();
              c.beginPath(); c.arc(bx + rb * 1.25, by, rb * 0.95, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
            }
          }
        }
        // the star twinkle where it leaves (キラーン)
        if (s > GONE - 0.08 && s < GONE + 0.36) {
          const u = (s - (GONE - 0.08)) / 0.44, a = Math.sin(Math.PI * u) * fade;
          const [x, y] = k.toScreen(PV);
          c.save(); c.translate(x, y); c.rotate(u * 1.4);
          c.fillStyle = `rgba(255,250,220,${a})`; c.strokeStyle = `rgba(22,21,26,${a})`; c.lineWidth = 1.3;
          const big = 12 * a, sm = 2.4 * a;
          c.beginPath();
          for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rad = i % 2 ? sm : (i % 4 ? big * 0.55 : big); c.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); }
          c.closePath(); c.fill(); c.stroke();
          c.rotate(Math.PI / 8 - u * 1.4);
          c.strokeStyle = `rgba(255,250,220,${a})`; c.lineWidth = 1.2;
          for (let i = 0; i < 8; i++) {
            const ang = i * Math.PI / 4, r0 = big * 0.9, r1 = big * (i % 2 ? 1.2 : 1.45);
            c.beginPath(); c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0); c.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); c.stroke();
          }
          c.restore();
        }
        // his glasses flash as he winds up
        if (s > 0.02 && s < 0.24) {
          const u = (s - 0.02) / 0.22, a = Math.sin(Math.PI * Math.min(1, u * 1.3)) * fade;
          if (a > 0) {
            const [x, y] = k.screenAt(316, 88, 0);
            c.save(); c.translate(x, y); c.rotate(0.3 + u * 0.8);
            c.fillStyle = `rgba(255,255,255,${a})`; c.strokeStyle = `rgba(22,21,26,${a})`; c.lineWidth = 1;
            const big = 10 * a, sm = 1.8 * a;
            c.beginPath();
            for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rad = i % 2 ? sm : big; c.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); }
            c.closePath(); c.fill(); c.stroke();
            c.restore();
          }
        }
        c.restore();

        // hand-lettered SFX (they may break the frame a little while they punch in)
        c.save();
        c.beginPath(); c.arc(cx, cy, R + 7, 0, Math.PI * 2); c.clip();
        // 「シュバッ!」 as the pitch comes (upper left)
        if (!replay && s > 0.12 && s < HIT) {                    // cut by the impact frame
          const items = layout('シュバッ!', X(24), Y(47), 17, 0.14);
          items.forEach((g, i) => {
            const u = env(s, 0.12 + i * 0.025, 0.12 + i * 0.025 + 0.09);
            const sc = ease.outBack(u, 2.4);
            g.s *= sc; g.a = Math.min(1, u * 3) * fade;
            g.x += (1 - u) * -10 + env(s, 0.12, HIT) * 6; g.r += (1 - u) * 0.4;
          });
          letter(c, items, { fill: '#ffffff', shadow: '#1fa7d9' });
        }
        // 「カキーン!!」 punches in on contact (upper left, rising)
        const kEnd = replay ? 0.82 : 0.92;
        if (s >= HIT && s < kEnd) {
          const size = replay ? 23 : 27;
          const items = layout('カキーン!!', X(14), Y(98), size, -0.58, 0.86);
          items.forEach((g, i) => {
            const t0 = HIT + i * 0.016, u = env(s, t0, t0 + 0.06);
            const jitter = s < STOP ? jit(t + i, 5) * 1.2 : 0;
            g.s *= lerp(1.9, 1, ease.out(u)) * (1 + 0.25 * env(s, kEnd - 0.12, kEnd));
            g.a = (s < t0 ? 0 : 1) * (1 - env(s, kEnd - 0.12, kEnd)) * fade;
            g.x += jitter; g.y += jit(t + i, 6) * (s < STOP ? 1.2 : 0);
            g.r = -0.3 + (i % 2 ? 0.08 : -0.06) + (1 - u) * 0.25;
          });
          if (f === 1) letter(c, items, { fill: '#fff6dc', shadow: null, ink: '#16151a' });
          else if (f === 2) letter(c, items, { fill: '#16151a', shadow: null, ink: '#fff6dc' });
          else letter(c, items, {});
        }
        // 「ホームラン!!」 in a spiky balloon (lower left) as he raises the bat
        const hold = replay ? 1.5 : 2.2, B0 = 0.8;
        if (s > B0 && s < hold + 0.24) {
          const pin = env(s, B0, B0 + 0.16), gone = ease.in(env(s, hold, hold + 0.24));
          const sc = ease.outBack(pin, 2.2) * (1 - 0.4 * gone) * (1 + 0.025 * Math.sin((s - B0) * 7));
          const a = Math.min(1, pin * 4) * (1 - gone) * fade;
          if (a > 0.01 && sc > 0.01) {
            c.save();
            c.translate(X(72), Y(142));
            c.rotate(-0.1 - (1 - ease.out(pin)) * 0.4);
            c.scale(sc, sc);
            c.globalAlpha = a;
            const blob = (fk, dx, dy) => {
              c.beginPath();
              balloon.forEach((m, i) => {
                const ang = i / balloon.length * Math.PI * 2, rad = 1 + (m - 1) * fk;
                c.lineTo(dx + Math.cos(ang) * 50 * rad, dy + Math.sin(ang) * 28 * rad);
              });
              c.closePath();
            };
            blob(1, 3, 3.5); c.fillStyle = '#16151a'; c.fill();
            blob(1, 0, 0); c.fillStyle = '#ff2d1b'; c.fill();
            c.strokeStyle = '#16151a'; c.lineWidth = 2.2; c.stroke();
            c.save(); c.scale(0.8, 0.78); blob(0.8, 0, 0); c.fillStyle = '#ffe84c'; c.fill(); c.restore();
            c.beginPath(); c.ellipse(0, 0, 36, 16, 0, 0, Math.PI * 2); c.fillStyle = '#fffef0'; c.fill();
            c.globalAlpha = 1;
            const items = layout('ホームラン!!', -45, 1, 17.5, -0.05, 0.86);
            items.forEach((g, i) => {
              const u = env(s, B0 + 0.05 + i * 0.03, B0 + 0.05 + i * 0.03 + 0.1);
              g.s *= ease.outBack(u, 2.6);
              g.y += Math.sin((s - B0) * 8 + i * 0.9) * 0.8;
              g.a = Math.min(1, u * 3) * a;
              g.r += (i % 2 ? 0.07 : -0.05);
            });
            letter(c, items, { fill: '#f5160b', shadow: '#fff1a6', dx: 1.6, dy: 1.6 });
            c.restore();
          }
        }
        c.restore();
      },
    };
  },
};
