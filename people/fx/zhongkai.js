/* Zhongkai — 院士 · 权威 Academician / Authority (ISCA'26 Best Paper)
   Click: the night sky warms into a banded sunset; two cliff faces rise behind him on either side
   and a light sweep reveals the gold characters 「权」「威」 carved into them (layered bevel);
   a mortarboard with a gold 「院士」 band drops onto his head (tassel on a little pendulum); a gold
   ISCA'26 medal on a red-blue ribbon swings onto his chest.
   Loop (3.6 s beat): tassel and medal sway, a glint travels across the characters.
   Photo landmarks (512 px): hair top 260,146 · head 215-303 x · eyes y 203 · chin 242 ·
   collar sides 240,258 / 284,258 · collar V 261,303 · chest 262,340 · skyline y ~235 ·
   real rock peaks 20,158 / 68,168 (covered by the left cliff). */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BLACK = 0x2a2931, GOLD = 0xe6b13a, INK = 0x16151a;
const BEAT = 3.6;
const T_HAT = 0.78;        // the mortarboard lands
const T_MEDAL = 0.86;      // the medal starts to swing in
const FONT_KAI = "'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif";

/* the sunset: flat colour bands with halftone seams, fading out at the skyline (canvas px = photo px) */
function drawSky(g) {
  const bands = [[0, '#23194a'], [56, '#3a2258'], [100, '#66295e'], [140, '#a13d5b'], [176, '#d9644a'], [204, '#f29a4e'], [224, '#ffcf7c'], [512, '']];
  for (let i = 0; i < bands.length - 1; i++) { g.fillStyle = bands[i][1]; g.fillRect(0, bands[i][0], 512, bands[i + 1][0] - bands[i][0]); }
  for (let i = 1; i < bands.length - 1; i++) {
    g.fillStyle = bands[i][1];
    const y0 = bands[i][0];
    for (let row = 1; row <= 3; row++) for (let x = (row % 2) * 4; x < 512; x += 8) {
      g.beginPath(); g.arc(x, y0 - row * 4, 2.3 - row * 0.55, 0, 6.283); g.fill();
    }
  }
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(214 / 512, 'rgba(0,0,0,1)'); gr.addColorStop(246 / 512, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.globalCompositeOperation = 'source-over';
}

/* a cliff face in the toon style: warm lit right side, shadowed left side with halftone, facet lines,
   an alpenglow rim, ink outline. `pts` = silhouette (photo px), `ridge` = apex -> down (photo px) */
function drawCliff(pts, ridge, box, seed) {
  return (g, w, h) => {
    const [u0, v0, u1] = box, S = w / (u1 - u0), r = rng(seed);
    const X = (u) => (u - u0) * S, Y = (v) => (v - v0) * S;
    const path = () => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v)))); g.closePath(); };
    g.save();
    path(); g.clip();
    let gr = g.createLinearGradient(0, Y(40), 0, Y(290));
    gr.addColorStop(0, '#f2a468'); gr.addColorStop(0.4, '#c56a45'); gr.addColorStop(1, '#6a2f2c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // shadow side: left of the ridge
    g.beginPath(); g.moveTo(X(-40), Y(ridge[0][1])); ridge.forEach(([u, v]) => g.lineTo(X(u), Y(v))); g.lineTo(X(-40), Y(320)); g.closePath();
    gr = g.createLinearGradient(0, Y(40), 0, Y(290));
    gr.addColorStop(0, '#9c4a45'); gr.addColorStop(1, '#3f1d2c');
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    g.fillStyle = 'rgba(30,10,24,0.45)';
    for (let y = 0; y < h; y += 7 * S) for (let x = ((y / (7 * S)) % 2) * 3.5 * S; x < w; x += 7 * S) { g.beginPath(); g.arc(x, y, 1.3 * S, 0, 6.283); g.fill(); }
    g.restore();
    // facets and strata
    g.strokeStyle = 'rgba(40,14,16,0.75)'; g.lineWidth = 1.6 * S; g.lineCap = 'round';
    for (let i = 1; i < ridge.length; i++) {
      const [u, v] = ridge[i];
      for (const dir of [-1, 1]) {
        g.beginPath(); g.moveTo(X(u), Y(v));
        g.lineTo(X(u + dir * (18 + r() * 22)), Y(v + 14 + r() * 18)); g.stroke();
      }
    }
    g.lineWidth = 1.1 * S;
    for (let i = 0; i < 5; i++) {
      const y = 150 + i * 26 + r() * 10, x = u0 + r() * (u1 - u0) * 0.7;
      g.beginPath(); g.moveTo(X(x), Y(y)); g.quadraticCurveTo(X(x + 20), Y(y - 5), X(x + 38 + r() * 20), Y(y + 2)); g.stroke();
    }
    g.restore();
    // alpenglow along the lit edges near the top, then the ink line
    g.save(); path(); g.clip();
    g.strokeStyle = 'rgba(255,214,140,0.9)'; g.lineWidth = 5 * S;
    g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(X(u), Y(v)) : g.moveTo(X(u), Y(v)))); g.stroke();
    g.restore();
    path(); g.strokeStyle = '#24100e'; g.lineWidth = 3 * S; g.lineJoin = 'round'; g.stroke();
    // the foot dissolves into the lit shoreline
    g.globalCompositeOperation = 'destination-in';
    const fade = g.createLinearGradient(0, Y(236), 0, Y(284));
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fade; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  };
}

/* a carved gold character: groove shadow (up-left), lit groove edge (down-right), gilded face, ink */
function drawGlyph(ch) {
  return (g, w, h) => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${w * 0.86}px ${FONT_KAI}`;
    const x = w / 2, y = h * 0.52, o = w * 0.018;
    g.lineJoin = 'round';
    g.fillStyle = '#2a0c08'; g.fillText(ch, x - o * 1.6, y - o * 1.6);
    g.strokeStyle = '#2a0c08'; g.lineWidth = w * 0.03; g.strokeText(ch, x, y);
    g.fillStyle = '#fff1b8'; g.fillText(ch, x + o, y + o);
    const gr = g.createLinearGradient(0, h * 0.1, 0, h * 0.95);
    gr.addColorStop(0, '#ffe38a'); gr.addColorStop(0.5, '#e9a93a'); gr.addColorStop(1, '#b8701f');
    g.fillStyle = gr; g.fillText(ch, x, y);
  };
}

/* the medal face: ISCA / '26 in raised letters */
function drawMedalFace(g, w, h) {
  const cx = w / 2, cy = h / 2;
  const gr = g.createRadialGradient(cx - w * 0.15, cy - h * 0.2, w * 0.05, cx, cy, w * 0.5);
  gr.addColorStop(0, '#ffe79a'); gr.addColorStop(0.6, '#f0bf4c'); gr.addColorStop(1, '#c98a22');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, w / 2, 0, 6.283); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const put = (txt, y, size) => {
    g.font = `900 ${size}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
    g.fillStyle = '#fff4c8'; g.fillText(txt, cx - w * 0.012, y - w * 0.012, w * 0.86);
    g.fillStyle = '#7a4a0c'; g.fillText(txt, cx + w * 0.014, y + w * 0.014, w * 0.86);
    g.fillStyle = '#d9a032'; g.fillText(txt, cx, y, w * 0.86);
  };
  put('ISCA', cy - h * 0.1, w * 0.3);
  put("'26", cy + h * 0.22, w * 0.26);
  // a small star on top
  g.fillStyle = '#7a4a0c';
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? w * 0.035 : w * 0.08; g.lineTo(cx + Math.cos(a) * rr, cy - h * 0.36 + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

export default {
  title: 'Academician, authority',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const D = k.D;
    const plate = k.layers.plate.material, person = k.layers.person.material;
    const clip = (m) => k.clip(m);

    // ① sunset sky over the night sky
    const sky = new THREE.Mesh(new THREE.CircleGeometry(k.R, 128), new THREE.MeshBasicMaterial({ map: k.canvasTexture(512, 512, drawSky), transparent: true, opacity: 0, depthWrite: false }));
    sky.position.z = k.Z_BACK + 1;
    sky.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    sky.renderOrder = -18;
    root.add(sky);

    /** a canvas card spanning a photo-px box at depth z, its origin at the bottom centre of the box */
    const boxCard = (box, z, tex, mat) => {
      const [u0, v0, u1, v1] = box;
      const geo = new THREE.PlaneGeometry((u1 - u0) * D / 512, (v1 - v0) * D / 512);
      geo.translate(0, (v1 - v0) * D / 1024, 0);
      const m = new THREE.Mesh(geo, mat || clip(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })));
      const p = k.at((u0 + u1) / 2, v1, z);
      m.position.copy(p);
      m.userData.ds = k.depthScale(z);
      m.scale.setScalar(m.userData.ds);
      return m;
    };

    // ② the two cliffs, and the carved characters
    const cliffs = [
      { box: [-12, 36, 222, 290], seed: 3, t0: 0.14, ch: '权', glyph: [98, 174],
        pts: [[-12, 290], [-12, 188], [8, 166], [20, 150], [30, 153], [42, 124], [56, 112], [66, 96], [78, 86], [88, 62], [104, 44], [115, 58], [126, 62], [138, 84], [150, 90], [160, 110], [172, 120], [184, 146], [196, 170], [206, 202], [214, 240], [222, 290]],
        ridge: [[104, 46], [96, 104], [108, 160], [98, 230], [104, 290]] },
      { box: [292, 36, 526, 290], seed: 9, t0: 0.22, ch: '威', glyph: [414, 174],
        pts: [[292, 290], [299, 236], [307, 204], [318, 176], [330, 150], [342, 140], [352, 114], [366, 104], [378, 80], [392, 70], [410, 44], [422, 60], [434, 64], [446, 88], [458, 96], [468, 120], [480, 124], [492, 150], [504, 164], [524, 192], [526, 290]],
        ridge: [[410, 44], [404, 100], [418, 158], [406, 226], [412, 290]] },
    ].map(c => {
      const [u0, v0, u1, v1] = c.box;
      const sc = Math.min(2, 512 / Math.max(u1 - u0, v1 - v0));
      const tex = k.canvasTexture(Math.round((u1 - u0) * sc), Math.round((v1 - v0) * sc), drawCliff(c.pts, c.ridge, c.box, c.seed));
      const mesh = boxCard(c.box, -22, tex);
      mesh.renderOrder = -12;
      root.add(mesh);
      // glyph card with a reveal / glint shader
      const G = 104;                                    // photo px
      const gtex = k.canvasTexture(256, 256, drawGlyph(c.ch));
      const gmat = clip(new THREE.ShaderMaterial({
        uniforms: { map: { value: gtex }, uReveal: { value: 0 }, uGlint: { value: -1 }, uOpacity: { value: 1 } },
        vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform sampler2D map; uniform float uReveal; uniform float uGlint; uniform float uOpacity; varying vec2 vUv;',
          'void main() {',
          '  vec4 c = texture2D(map, vUv);',
          '  float d = vUv.x * 0.7 + (1.0 - vUv.y) * 0.5;',
          '  float f = uReveal * 1.45 - 0.12;',
          '  float vis = smoothstep(f + 0.02, f - 0.1, d);',
          '  float band = exp(-pow((d - f) / 0.06, 2.0)) * step(0.001, uReveal) * step(uReveal, 0.999);',
          '  float glint = exp(-pow((d - uGlint) / 0.05, 2.0));',
          '  vec3 col = c.rgb + (band * 1.3 + glint * 0.9) * vec3(1.0, 0.93, 0.72);',
          '  float a = c.a * max(vis, band) * uOpacity;',
          '  if (a < 0.01) discard;',
          '  gl_FragColor = vec4(col, a);',
          '  #include <colorspace_fragment>',
          '}',
        ].join('\n'),
        transparent: true, depthWrite: false,
      }));
      const gm = boxCard([c.glyph[0] - G / 2, c.glyph[1] - G / 2, c.glyph[0] + G / 2, c.glyph[1] + G / 2], -21, null, gmat);
      gm.renderOrder = -11;
      root.add(gm);
      return { ...c, mesh, gm, gmat, home: mesh.position.clone() };
    });

    // ③ the mortarboard: hat (placement) -> squash (landing) -> cap, gold 「院士」 band, board, button, cord
    const hat = new THREE.Group(), squash = new THREE.Group();
    hat.add(squash);
    const capR = 18, capH = 11, BW = 44, BT = 2.6;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.97, capR, capH, 40), clip(k.toon(BLACK)));
    cap.position.y = capH / 2;
    k.ink(cap, 1.3);
    const bandTex = k.canvasTexture(320, 96, (g, w, h) => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${h * 0.86}px ${FONT_KAI}`;
      g.lineJoin = 'round';
      g.strokeStyle = '#3a2204'; g.lineWidth = h * 0.12; g.strokeText('院士', w / 2, h * 0.54);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.5, '#f2c14e'); gr.addColorStop(1, '#c58a1c');
      g.fillStyle = gr; g.fillText('院士', w / 2, h * 0.54);
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.985 + 0.3, capR + 0.3, capH * 0.92, 24, 1, true, -0.95, 1.9),
      clip(new THREE.MeshBasicMaterial({ map: bandTex, transparent: true, alphaTest: 0.05 })));
    band.position.y = capH / 2;
    const board = new THREE.Mesh(new THREE.BoxGeometry(BW, BT, BW), clip(k.toon(BLACK)));
    board.position.y = capH + BT / 2;
    k.ink(board, 1.4);
    const goldMat = clip(k.toon(GOLD));
    const button = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 1.4, 18), goldMat);
    button.position.y = capH + BT + 0.7;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, BW / 2, 8), goldMat);
    cord.rotation.z = Math.PI / 2;
    cord.position.set(BW / 4, capH + BT + 0.6, 0);
    squash.add(cap, band, board, button, cord);
    const hatHome = k.at(259, 163, 30);
    hat.position.copy(hatHome);
    hat.rotation.set(0.3, -0.18, 0.02);
    root.add(hat);
    const tassel = new THREE.Group();
    const strandTex = k.canvasTexture(64, 64, (g, w, h) => {
      g.fillStyle = '#e8b43c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a8761a'; g.lineWidth = 2.5;
      for (let x = 2; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    });
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 9, 8), goldMat);
    hang.position.y = -4.5;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(1.8, 14, 10), goldMat);
    knot.position.y = -9.8;
    k.ink(knot, 1.0);
    const fringe = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3, 9, 16), clip(k.toon(0xffffff, { map: strandTex })));
    fringe.position.y = -15.6;
    k.ink(fringe, 1.0);
    tassel.add(hang, knot, fringe);
    root.add(tassel);
    const anchorLocal = new THREE.Vector3(BW / 2 + 0.3, capH + BT + 0.3, 0);
    const anchor = new THREE.Vector3();

    // ④ the medal on a red-blue ribbon, pivoting at the neck
    const pivot = new THREE.Group();
    const pivotHome = k.at(262, 252, 6);
    pivot.position.copy(pivotHome);
    root.add(pivot);
    const s = D / 512;                                // photo px -> world px
    const P = (u, v) => [(u - 262) * s, -(v - 252) * s];
    const ribTex = k.canvasTexture(64, 256, (g, w, h) => {
      g.fillStyle = '#c8262e'; g.fillRect(0, 0, w / 2, h);
      g.fillStyle = '#1f4fb0'; g.fillRect(w / 2, 0, w / 2, h);
      g.fillStyle = '#f2c14e'; g.fillRect(w / 2 - 2, 0, 4, h);
    });
    const ribMat = k.toon(0xffffff, { map: ribTex });
    const strap = (top, bot, flip) => {
      const [x0, y0] = P(...top), [x1, y1] = P(...bot);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(6.2, len, 0.5), ribMat);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
      m.rotation.z = Math.atan2(x1 - x0, -(y1 - y0)) + Math.PI;
      if (flip) m.scale.x = -1;
      k.ink(m, 1.0);
      return m;
    };
    pivot.add(strap([241, 256], [258, 311], false), strap([283, 256], [266, 311], true));
    const medal = new THREE.Group();
    const MR = 15.5;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, 2.6, 48), k.toon(GOLD));
    disc.rotation.x = Math.PI / 2;
    k.ink(disc, 1.4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(MR - 3.1, 0.95, 10, 48), k.toon(0xf6cf60));
    ring.position.z = 1.35;
    const face = new THREE.Mesh(new THREE.CircleGeometry(MR - 4.1, 40), new THREE.MeshBasicMaterial({ map: k.canvasTexture(256, 256, drawMedalFace) }));
    face.position.z = 1.32;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.8, 8, 20), k.toon(GOLD));
    loop.position.y = MR + 1.6;
    k.ink(loop, 0.9);
    medal.add(disc, ring, face, loop);
    const [mx, my] = P(262, 350);
    medal.position.set(mx, my, 1.8);
    pivot.add(medal);

    const tint = new THREE.Color(), shine = new THREE.Vector3();

    return {
      update(t, e) {
        // sky, warm tint
        const b = presence(t, e, 0.02, 0.45, ease.out, 0);
        sky.material.opacity = b;
        plate.color.setRGB(1, lerp(1, 0.86, b), lerp(1, 0.76, b));
        person.color.copy(tint.setRGB(1, lerp(1, 0.96, b), lerp(1, 0.9, b)));

        // cliffs rise (pop-up book), characters swept in, a glint once per beat
        cliffs.forEach((c, i) => {
          const g = presence(t, e, c.t0, 0.42, (x) => ease.outBack(x, 1.6), 0.1 + i * 0.1);
          const ds = c.mesh.userData.ds;
          c.mesh.visible = g > 0.004;
          c.mesh.scale.set(ds, ds * Math.max(g, 0.004), 1);
          const rv = env(t, 0.55 + i * 0.13, 0.95 + i * 0.13);
          c.gmat.uniforms.uReveal.value = rv;
          const out = 1 - ease.in(clamp(e * 1.8 - i * 0.1));
          c.gmat.uniforms.uOpacity.value = out * (g > 0.9 ? 1 : 0);
          c.gm.visible = rv > 0 && out > 0.01 && g > 0.9;
          const ph = ((t - 1.6 - i * 0.22) % BEAT + BEAT) % BEAT;
          c.gmat.uniforms.uGlint.value = t > 1.6 ? lerp(-0.25, 1.45, ph / 0.55) : -1;
        });

        // mortarboard: falls in, squashes, settles; tassel pendulum
        const hin = presence(t, e, 0.4, T_HAT - 0.4, ease.out, 0.3);
        const fall = 1 - ease.in(env(t, 0.4, T_HAT));
        const fly = ease.in(clamp(e * 1.6 - 0.2));
        k.show(hat, Math.min(1, hin * 1.4));
        hat.position.set(hatHome.x + fly * 25, hatHome.y + fall * 40 + fly * 60, hatHome.z);
        const ts = t - T_HAT;
        const sq = ts > 0 ? Math.exp(-ts * 7) * Math.cos(ts * 26) : 0;
        squash.scale.set(1 + 0.14 * sq, 1 - 0.24 * sq, 1 + 0.14 * sq);
        squash.rotation.z = ts > 0 ? Math.exp(-ts * 5) * Math.sin(ts * 17) * 0.06 : 0;
        hat.updateMatrix(); squash.updateMatrix();
        anchor.copy(anchorLocal).applyMatrix4(squash.matrix).applyMatrix4(hat.matrix);
        tassel.position.copy(anchor);
        k.show(tassel, hat.visible ? hat.scale.x : 0);
        const kick = ts > 0 ? Math.exp(-ts * 2.6) * Math.sin(ts * 9.5) * 0.7 : -0.9 * env(t, 0.4, T_HAT);
        const sway = Math.sin(t * Math.PI * 2 / BEAT) * 0.12 + Math.sin(t * 1.3) * 0.04;
        tassel.rotation.set(sway * 0.8 + (ts > 0 ? Math.exp(-ts * 3) * Math.sin(ts * 8) * 0.3 : 0), 0, 0.1 + kick + sway);

        // medal: swings in from his left, damped, then a slow sway with a turn of the disc
        const mi = presence(t, e, T_MEDAL, 0.3, ease.out, 0.5);
        k.show(pivot, mi);
        const ms = Math.max(0, t - T_MEDAL);
        const swing = 0.85 * Math.exp(-ms * 3.2) * Math.cos(ms * 7.5);
        pivot.rotation.z = swing + Math.sin(t * Math.PI * 2 / BEAT + 0.8) * 0.035;
        medal.rotation.y = 0.9 * Math.exp(-ms * 2.5) * Math.sin(ms * 6.5) + Math.sin(t * Math.PI * 2 / BEAT) * 0.22;
        pivot.position.set(pivotHome.x - fly * 10, pivotHome.y - fly * 40, pivotHome.z);
      },

      draw2d(q, t, e) {
        // a four-point twinkle on the medal and on each character as the glint passes
        if (t < 1.6) return;
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const star = (x, y, a, size) => {
          if (a <= 0.01) return;
          q.push(); q.translate(x, y); q.rotate(a * 0.8);
          q.stroke(22, 21, 26, 230 * a * fade); q.strokeWeight(1.1); q.fill(255, 248, 214, 255 * a * fade);
          q.beginShape();
          for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = i % 2 ? size * 0.2 * a : size * a; q.vertex(Math.cos(ang) * rr, Math.sin(ang) * rr); }
          q.endShape(q.CLOSE);
          q.pop();
        };
        cliffs.forEach((c, i) => {
          const ph = ((t - 1.6 - i * 0.22) % BEAT + BEAT) % BEAT;
          const a = Math.sin(Math.PI * clamp((ph - 0.38) / 0.3));
          const [x, y] = k.screenAt(c.glyph[0] + (i ? 30 : 28), c.glyph[1] + 30, -21);
          star(x, y, a, 7);
        });
        const ph = ((t - 2.4) % BEAT + BEAT) % BEAT;
        const [x, y] = k.toScreen(shine.set(mx - 8, my + 8, 4).applyMatrix4(pivot.matrix));
        star(x, y, Math.sin(Math.PI * clamp(ph / 0.35)), 6);
      },
    };
  },
};
