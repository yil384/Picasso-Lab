/* Keyi — 电竞天才 esports genius, MVP
   Click: the pond goes dark and turns into an esports arena at night (LED wall panels switching
   on from the centre, a lighting truss with two spotlights that snap on and sweep, a stage riser
   he sits on); a gold trophy rises beside him with a spin and a glint; a game controller floats
   up into his hands (his real fingers re-layered over the grips); a neon MVP sign drops in over
   his head and lights up letter by letter; the prize board reads $1,000,000; VICTORY slams in
   under him with one confetti burst.
   Loop (3.2 s): spotlights sweep, one confetti puff over the trophy, a glint on the trophy rim,
   a shine across VICTORY, one button press on the controller.
   Photo landmarks (512 px): head top v 80 · glasses 262,120 · shoulders v 170 (u 220-340) ·
   hands 178,365 / 283,375 · T-shirt hem v 318 · he sits on the rail at v ~335 (hip u 300-345). */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BEAT = 3.2, T0 = 1.35;
const INK = '#0b0a14';
const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export default {
  title: 'Esports MVP',
  exit: 0.45,
  still: 2.2,
  async build(k) {
    const { root } = k;
    const V = new THREE.Vector3();
    const atInto = (o, u, v, z) => { const s = k.depthScale(z); return o.set((u / 512 - 0.5) * k.D * s, (0.5 - v / 512) * k.D * s, z); };
    const scr = (u, v, z, out) => {
      atInto(V, u, v, z).applyMatrix4(root.matrixWorld).project(k.camera);
      out[0] = (V.x + 1) / 2 * k.W; out[1] = (1 - V.y) / 2 * k.H;
      return out;
    };
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const beatPh = t => (t < T0 ? -1 : (t - T0) % BEAT);

    // a backdrop disc 2 px wider than the photo (the stencil trims it to the circle, so no plate
    // pixels leak at the anti-aliased rim); uvs still map 0..1 onto the photo's 512 px
    const backdropDisc = () => {
      const pad = 2, geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };
    // the plate sits deeper than the stencil disc, so off-axis perspective shifts it ~2 px: clip it too
    k.clip(k.layers.plate.material);

    // ① LED wall (behind everything): 8 x 8 panels of halftone dots, a lighting truss, the prize board
    const wallTex = k.canvasTexture(512, 512, (g) => {
      g.fillStyle = '#0d0b20'; g.fillRect(0, 0, 512, 512);
      for (let py = 0; py < 8; py++) for (let px = 0; px < 8; px++) {
        const x0 = px * 64, y0 = py * 64;
        g.fillStyle = '#161236'; g.fillRect(x0 + 1.5, y0 + 1.5, 61, 61);
        for (let dy = 3; dy < 64; dy += 6) for (let dx = 3; dx < 64; dx += 6) {
          const x = x0 + dx, y = y0 + dy;
          const m = Math.exp(-((x - 40) ** 2 + (y - 300) ** 2) / (2 * 120 * 120));
          const c = Math.exp(-((x - 480) ** 2 + (y - 120) ** 2) / (2 * 130 * 130));
          const band = 0.5 + 0.5 * Math.sin((x * 0.6 - y) / 30);
          const s = Math.max(m, c) * 0.85 + 0.1 * band;
          g.fillStyle = m > c ? `rgba(255,64,190,${0.3 + 0.6 * s})` : `rgba(60,214,255,${0.3 + 0.6 * s})`;
          g.beginPath(); g.arc(x, y, 0.5 + 2.1 * s, 0, Math.PI * 2); g.fill();
        }
      }
      // prize board on the left panels
      g.fillStyle = '#07060f'; g.fillRect(20, 150, 180, 86);
      g.strokeStyle = '#ffc53d'; g.lineWidth = 2; g.strokeRect(24, 154, 172, 78);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff'; g.font = "900 20px 'Arial Black', Impact, sans-serif";
      g.fillText('PRIZE', 110, 172);
      g.save(); g.translate(110, 206); g.scale(0.78, 1);
      g.fillStyle = '#ffc53d'; g.font = "900 31px 'Arial Black', Impact, sans-serif";
      g.fillText('$1,000,000', 0, 0);
      g.restore();
      g.fillStyle = 'rgba(7,6,15,0.55)';
      for (let y = 154; y < 232; y += 3) g.fillRect(24, y, 172, 1);
      // lighting truss across the top, fixtures at both ends
      g.strokeStyle = '#3a3752'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, 8); g.lineTo(512, 8); g.moveTo(0, 26); g.lineTo(512, 26); g.stroke();
      g.lineWidth = 2.5; g.beginPath();
      for (let x = 0; x < 512; x += 18) { g.moveTo(x, 8); g.lineTo(x + 9, 26); g.lineTo(x + 18, 8); }
      g.stroke();
      for (const x of [78, 434]) {
        g.fillStyle = '#23213a'; g.strokeStyle = INK; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(x - 11, 24); g.lineTo(x + 11, 24); g.lineTo(x + 8, 42); g.lineTo(x - 8, 42); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff6d8'; g.beginPath(); g.ellipse(x, 42, 8, 3, 0, 0, Math.PI * 2); g.fill();
      }
    });
    const wallMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uMap: { value: wallTex }, uOn: { value: 0 }, uOp: { value: 0 }, uScan: { value: -1 } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uMap; uniform float uOn, uOp, uScan; varying vec2 vUv;
        void main() {
          vec3 tx = texture2D(uMap, vUv).rgb;
          vec2 cell = floor(vec2(vUv.x * 8.0, (1.0 - vUv.y) * 8.0));
          float delay = abs(cell.x - 3.5) * 0.1 + cell.y * 0.03;
          float on = smoothstep(delay, delay + 0.1, uOn);
          float y = 1.0 - vUv.y;
          float scan = smoothstep(0.07, 0.0, abs(y - uScan)) * 0.35;
          vec3 col = mix(vec3(0.004, 0.003, 0.012), tx * (1.0 + scan), max(on, step(y, 0.09)));
          gl_FragColor = vec4(col, uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const wall = new THREE.Mesh(backdropDisc(), wallMat);
    wall.position.z = k.Z_BACK + 1;
    wall.scale.setScalar(k.depthScale(k.Z_BACK + 1));
    wall.renderOrder = -18;
    root.add(wall);

    // ② spotlight beams from the two truss fixtures (flat comic beams, hard edges), sweeping
    const beamTex = k.canvasTexture(64, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0.12)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(29, 0); g.lineTo(35, 0); g.lineTo(64, 256); g.lineTo(0, 256); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.moveTo(29, 0); g.lineTo(31, 0); g.lineTo(7, 256); g.lineTo(0, 256); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(33, 0); g.lineTo(35, 0); g.lineTo(64, 256); g.lineTo(57, 256); g.closePath(); g.fill();
    });
    const beams = [[78, 0.34, 0xfff1c9, 0], [434, -0.34, 0xc9f4ff, 1.9]].map(([u, base, col, phase]) => {
      const L = 230, w = 78;
      const geo = new THREE.PlaneGeometry(w, L);
      geo.translate(0, -L / 2, 0);
      const m = new THREE.Mesh(geo, k.clip(new THREE.MeshBasicMaterial({ map: beamTex, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
      m.position.copy(k.at(u, 42, -30));
      m.renderOrder = -17;
      root.add(m);
      return { m, base, phase };
    });

    // ③ stage riser he sits on: top surface, LED edge strip, front face
    const RISER_V = 322;
    const riserTex = k.canvasTexture(512, 192, (g) => {
      g.fillStyle = '#34305a'; g.fillRect(0, 0, 512, 26);
      g.fillStyle = '#4a4577'; g.fillRect(0, 0, 512, 4);
      g.fillStyle = '#43e8ff'; g.fillRect(0, 24, 512, 5);
      g.fillStyle = INK; g.fillRect(0, 22, 512, 2); g.fillRect(0, 29, 512, 2);
      g.fillStyle = '#17142f'; g.fillRect(0, 31, 512, 161);
      for (let x = 0; x < 512; x += 64) { g.fillStyle = '#0b0a18'; g.fillRect(x, 31, 2, 161); }
      for (let y = 40; y < 192; y += 6) for (let x = 3; x < 512; x += 6) {
        const s = clamp((y - 60) / 130) * (0.5 + 0.5 * Math.sin(x / 40));
        if (s < 0.05) continue;
        g.fillStyle = `rgba(255,64,190,${0.25 + 0.5 * s})`;
        g.beginPath(); g.arc(x, y, 0.4 + 1.8 * s, 0, Math.PI * 2); g.fill();
      }
    });
    const riserMat = k.clip(new THREE.MeshBasicMaterial({ map: riserTex, transparent: true, opacity: 0, depthWrite: false }));
    const RZ = -8;
    const riser = new THREE.Mesh(new THREE.PlaneGeometry(k.D, 192 / 512 * k.D), riserMat);
    riser.position.copy(k.at(256, RISER_V + 96, RZ));
    riser.scale.setScalar(k.depthScale(RZ));
    riser.renderOrder = -10;
    root.add(riser);

    // ④ gold trophy on the stage to his left (viewer right). Origin = bottom of the plinth.
    const GOLD = 0xf2b632, GOLD_HI = 0xffd76a, GOLD_LO = 0xc98f1a;
    const trophy = new THREE.Group(), tSpin = new THREE.Group();
    trophy.add(tSpin);
    const lathe = (prof, color, seg = 28) => new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg), k.toon(color));
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(18, 6.5, 11), k.toon(0x2a2340));
    plinth.position.y = 3.25; k.ink(plinth, 1.3);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(10, 2.6, 0.5), k.toon(GOLD_HI));
    plate.position.set(0, 3.3, 5.6);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.6, 2.4, 28), k.toon(GOLD));
    foot.position.y = 7.7; k.ink(foot, 1.2);
    const stem = lathe([[1.4, 0], [1.6, 2.2], [3.1, 3.8], [1.6, 5.4], [1.8, 8.2], [3.4, 9.4]], GOLD);
    stem.position.y = 8.9; k.ink(stem, 1.1);
    const cup = lathe([[0.01, 0], [3, 0.2], [6.7, 2.2], [9.1, 6], [10.1, 11], [10.4, 15], [10.9, 16]], GOLD);
    cup.position.y = 18.2; k.ink(cup, 1.3);
    const inside = new THREE.Mesh(new THREE.CircleGeometry(10.5, 32), k.toon(GOLD_LO));
    inside.rotation.x = -Math.PI / 2; inside.position.y = 34.1;
    const rimT = new THREE.Mesh(new THREE.TorusGeometry(10.8, 0.9, 8, 36), k.toon(GOLD_HI));
    rimT.rotation.x = Math.PI / 2; rimT.position.y = 34.2; k.ink(rimT, 1.1);
    const handles = [-1, 1].map(sx => {
      const h = new THREE.Mesh(new THREE.TorusGeometry(5, 1.15, 8, 20, Math.PI * 1.05), k.toon(GOLD));
      h.position.set(sx * 9.8, 27.5, 0);
      h.rotation.z = sx > 0 ? -Math.PI / 2 - 0.05 : Math.PI / 2 + 0.05;
      k.ink(h, 1.1);
      return h;
    });
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 1.9 : 4.4, a = Math.PI / 2 + i * Math.PI / 5;
      if (i) starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r); else starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), new THREE.MeshBasicMaterial({ color: 0x2a2340 }));
    star.position.set(0, 26.8, 10.35);
    star.rotation.x = -0.08;
    tSpin.add(plinth, plate, foot, stem, cup, inside, rimT, ...handles, star);
    const T_U = 438, T_V = 342, T_Z = -4, T_S = 1.3;
    const trophyHome = k.at(T_U, T_V, T_Z);
    trophy.position.copy(trophyHome);
    root.add(trophy);

    // ⑤ controller (white, inked, coloured buttons) in his lap, grips under his real hands
    const pad = new THREE.Group(), padFit = new THREE.Group();
    pad.add(padFit);
    const s = new THREE.Shape();
    s.moveTo(-15, 11);
    s.bezierCurveTo(-6, 13, 6, 13, 15, 11);
    s.bezierCurveTo(20, 10.2, 24.5, 7, 26.3, 1.5);
    s.bezierCurveTo(28.4, -5, 29.5, -13, 26.5, -18.5);
    s.bezierCurveTo(24, -22.8, 18, -23, 15.8, -17.5);
    s.bezierCurveTo(14.2, -13.5, 12.5, -9, 7.5, -8.4);
    s.lineTo(-7.5, -8.4);
    s.bezierCurveTo(-12.5, -9, -14.2, -13.5, -15.8, -17.5);
    s.bezierCurveTo(-18, -23, -24, -22.8, -26.5, -18.5);
    s.bezierCurveTo(-29.5, -13, -28.4, -5, -26.3, 1.5);
    s.bezierCurveTo(-24.5, 7, -20, 10.2, -15, 11);
    const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: true, bevelThickness: 1.7, bevelSize: 1.5, bevelSegments: 3, curveSegments: 14 });
    bodyGeo.translate(0, 0, -2);
    const body = new THREE.Mesh(bodyGeo, k.toon(0xf3f5f9));
    k.ink(body, 1.4);
    const FZ = 3.7;
    const dark = k.toon(0x2b2d42);
    const dpad = new THREE.Group();
    dpad.add(new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.5, 1.4), dark), new THREE.Mesh(new THREE.BoxGeometry(2.5, 7.4, 1.4), dark));
    dpad.position.set(-11, 2, FZ + 0.5);
    const cylZ = (r, h, color, x, y, z) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), k.toon(color));
      m.rotation.x = Math.PI / 2; m.position.set(x, y, z);
      return m;
    };
    const stickL = cylZ(2.9, 1.6, 0x2b2d42, -4.8, -3.9, FZ + 0.6), stickR = cylZ(2.9, 1.6, 0x2b2d42, 4.8, -3.9, FZ + 0.6);
    const capL = cylZ(2.1, 0.8, 0x45485f, -4.8, -3.9, FZ + 1.6), capR = cylZ(2.1, 0.8, 0x45485f, 4.8, -3.9, FZ + 1.6);
    [stickL, stickR].forEach(m => k.ink(m, 0.9));
    const BTN = [[11, 5.6, 0xffd23f], [14.6, 2, 0xff4d5e], [7.4, 2, 0x3b82f6], [11, -1.6, 0x3ecf6e]];
    const buttons = BTN.map(([x, y, c]) => { const b = cylZ(1.75, 1.4, c, x, y, FZ + 0.5); k.ink(b, 0.8); return b; });
    const home = new THREE.Mesh(new THREE.CircleGeometry(2, 20), new THREE.MeshBasicMaterial({ color: 0x5ce8ff }));
    home.position.set(0, 6.4, FZ + 0.25);
    const homeRing = new THREE.Mesh(new THREE.RingGeometry(2, 2.7, 20), new THREE.MeshBasicMaterial({ color: 0x2b2d42 }));
    homeRing.position.set(0, 6.4, FZ + 0.2);
    padFit.add(body, dpad, stickL, stickR, capL, capR, ...buttons, home, homeRing);
    padFit.scale.set(0.95, 0.74, 0.95);
    const P_U = 232, P_V = 358, P_Z = 8;
    const padHome = k.at(P_U, P_V, P_Z);
    root.add(pad);
    // his real hands over the grips
    k.patch([[190, 322], [206, 322], [197, 335], [194, 343], [195, 351], [193, 356], [187, 364], [185, 375], [183, 379], [180, 380], [179, 379], [180, 364], [177, 363], [173, 368], [172, 392], [166, 391], [165, 376], [168, 362], [182, 344], [185, 335]], 26);
    k.patch([[292, 322], [311, 322], [304, 344], [301, 354], [303, 375], [300, 390], [292, 403], [289, 403], [287, 406], [285, 406], [283, 403], [278, 404], [278, 400], [274, 398], [274, 392], [278, 382], [279, 370], [277, 367], [272, 367], [269, 370], [266, 378], [263, 378], [262, 376], [263, 368], [271, 357], [282, 350], [288, 339]], 26);

    // ⑥ neon MVP sign on cables, dropping in over his head; letters light one by one
    const NEON = '#ff4fd8';
    const LET = {
      M: [[0, 1], [0, 0], [0.5, 0.62], [1, 0], [1, 1]],
      V: [[0, 0], [0.5, 1], [1, 0]],
      P: [[0, 1], [0, 0], [0.62, 0], [0.86, 0.1], [0.94, 0.27], [0.86, 0.44], [0.62, 0.55], [0, 0.55]],
    };
    const tube = (g, pts, x, y, w, h) => {
      g.beginPath();
      pts.forEach(([a, b], i) => { const px = x + a * w, py = y + b * h; if (i) g.lineTo(px, py); else g.moveTo(px, py); });
      g.stroke();
    };
    const PW = 62, PH = 24, LX0 = 44, LSP = 64, LW = 40, LY = 28, LH = 40;   // letters in canvas px (4 per CSS px)
    const signPlate = k.card(PW, PH, (g, w, h) => {
      const r = 10, x = 5, y = 5, W = w - 10, H = h - 10;
      g.fillStyle = '#15122c'; g.strokeStyle = INK; g.lineWidth = 6;
      g.beginPath(); g.roundRect ? g.roundRect(x, y, W, H, r) : g.rect(x, y, W, H); g.fill(); g.stroke();
      g.strokeStyle = '#43e8ff'; g.lineWidth = 2.2;
      g.beginPath(); g.roundRect ? g.roundRect(x + 6, y + 6, W - 12, H - 12, r * 0.6) : g.rect(x + 6, y + 6, W - 12, H - 12); g.stroke();
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 8; g.strokeStyle = '#3b2c52';
      ['M', 'V', 'P'].forEach((c, i) => tube(g, LET[c], LX0 + i * LSP, LY, LW, LH));
      g.fillStyle = '#9aa0b5';
      [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 2.4, 0, Math.PI * 2); g.fill(); });
    }, { res: 2 });
    k.clip(signPlate.material);
    const letters = ['M', 'V', 'P'].map((c, i) => {
      const card = k.card(PW, PH, (g) => {
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = 'rgba(255,79,216,0.3)'; g.lineWidth = 17; tube(g, LET[c], LX0 + i * LSP, LY, LW, LH);
        g.strokeStyle = NEON; g.lineWidth = 9; tube(g, LET[c], LX0 + i * LSP, LY, LW, LH);
        g.strokeStyle = '#fff1fb'; g.lineWidth = 3.2; tube(g, LET[c], LX0 + i * LSP, LY, LW, LH);
      }, { res: 2, depthWrite: false });
      k.clip(card.material);
      card.material.transparent = true;
      card.material.opacity = 0;
      card.position.z = 0.3;
      card.renderOrder = -11;
      return card;
    });
    const sign = new THREE.Group(), signSwing = new THREE.Group();
    signSwing.add(signPlate, ...letters);
    const cableMat = k.clip(new THREE.MeshBasicMaterial({ color: 0x0b0a14 }));
    [-1, 1].forEach(sx => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 30, 0.9), cableMat);
      c.position.set(sx * (PW / 2 - 8), PH / 2 + 15, -0.5);
      signSwing.add(c);
    });
    signPlate.renderOrder = -12;
    sign.add(signSwing);
    const S_Z = -14;
    const signHome = k.at(256, 44, S_Z);
    sign.position.copy(signHome);
    root.add(sign);

    // ── q5 helpers: VICTORY banner, confetti, glints ─────────────────────────
    const R = rng(21);
    const CONF_COL = [[255, 210, 63], [255, 79, 216], [67, 232, 255], [255, 255, 255], [124, 255, 107]];
    // two cannons at the banner ends shoot up and outward (so his face stays clear)
    const burst = Array.from({ length: 46 }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      return { vx: side * (40 + R() * 190), vy: -230 - R() * 200, spin: 6 + R() * 12, ph: R() * 6, w: 2.4 + R() * 1.6, h: 4 + R() * 2.5, c: CONF_COL[Math.floor(R() * 5)], ox: side * (40 + R() * 8) };
    });
    const puff = Array.from({ length: 11 }, () => ({
      vx: (R() - 0.5) * 150, vy: -170 - R() * 150, spin: 5 + R() * 9, ph: R() * 6, w: 2.2 + R() * 1.4, h: 3.6 + R() * 2, c: CONF_COL[Math.floor(R() * 5)], ox: (R() - 0.5) * 10,
    }));
    const KD = 2.6, G = 420;
    function confetti(q, list, x0, y0, tau, alpha) {
      if (tau < 0 || alpha < 0.004) return;
      const f = (1 - Math.exp(-KD * tau)) / KD;
      for (const p of list) {
        const x = x0 + p.ox + p.vx * f;
        const y = y0 + G * tau / KD + (p.vy - G / KD) * f;
        const a = alpha * (1 - env(tau, 1.1, 1.6));
        if (a < 0.004) continue;
        q.push();
        q.translate(x, y);
        q.rotate(p.ph + p.spin * tau * 0.6);
        q.fill(p.c[0], p.c[1], p.c[2], 255 * a);
        q.rect(-p.w / 2 * Math.cos(p.ph + p.spin * tau), -p.h / 2, p.w * Math.cos(p.ph + p.spin * tau), p.h);
        q.pop();
      }
    }
    function sparkle(q, x, y, r, a, rot) {
      if (a < 0.004) return;
      q.push(); q.translate(x, y); q.rotate(rot);
      q.strokeWeight(1); q.stroke(11, 10, 20, 255 * a); q.fill(255, 255, 255, 255 * a);
      q.beginShape();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r, an = i * Math.PI / 4; q.vertex(Math.cos(an) * rr, Math.sin(an) * rr); }
      q.endShape(q.CLOSE ?? true);
      q.pop();
    }
    const BAN = { w: 96, h: 21 };
    function banner(q, cx, cy, sc, alpha, shine) {
      if (alpha < 0.004) return;
      q.push();
      q.translate(cx, cy); q.scale(sc); q.shearX ? q.shearX(-0.2) : null;
      const w = BAN.w, h = BAN.h;
      q.strokeJoin?.(q.ROUND ?? 'round');
      // ribbon tails
      q.strokeWeight(2); q.stroke(11, 10, 20, 255 * alpha);
      q.fill(190, 40, 150, 255 * alpha);
      q.beginShape(); q.vertex(-w / 2 + 4, -4); q.vertex(-w / 2 - 12, -2); q.vertex(-w / 2 - 6, 5); q.vertex(-w / 2 - 12, 12); q.vertex(-w / 2 + 4, 10); q.endShape(q.CLOSE ?? true);
      q.beginShape(); q.vertex(w / 2 - 4, -4); q.vertex(w / 2 + 12, -2); q.vertex(w / 2 + 6, 5); q.vertex(w / 2 + 12, 12); q.vertex(w / 2 - 4, 10); q.endShape(q.CLOSE ?? true);
      // shadow block, plate
      q.noStroke(); q.fill(11, 10, 20, 200 * alpha); q.rect(-w / 2 + 3, -h / 2 + 3, w, h, 3);
      q.strokeWeight(2.2); q.stroke(11, 10, 20, 255 * alpha); q.fill(255, 210, 63, 255 * alpha);
      q.rect(-w / 2, -h / 2, w, h, 3);
      q.noStroke(); q.fill(255, 238, 160, 255 * alpha); q.rect(-w / 2 + 2, -h / 2 + 2, w - 4, 4, 2);
      // shine sweep
      if (shine > 0 && shine < 1) {
        const x = -w / 2 - 20 + (w + 40) * shine;
        q.fill(255, 255, 255, 150 * alpha);
        q.beginShape(); q.vertex(x - 5, -h / 2 + 1.5); q.vertex(x + 4, -h / 2 + 1.5); q.vertex(x - 2, h / 2 - 1.5); q.vertex(x - 11, h / 2 - 1.5); q.endShape(q.CLOSE ?? true);
      }
      // lettering
      q.textFont("'Arial Black', Impact, sans-serif"); q.textStyle(q.BOLDITALIC ?? q.BOLD ?? 'bold');
      q.textAlign(q.CENTER, q.CENTER); q.textSize(15.5);
      q.noStroke(); q.fill(255, 255, 255, 255 * alpha); q.text('VICTORY', 1, 0.2);
      q.fill(26, 20, 64, 255 * alpha); q.text('VICTORY', 0, -0.8);
      q.pop();
    }
    const A = [0, 0], B = [0, 0];

    const tint = new THREE.Color();
    return {
      update(t, e) {
        const ph = beatPh(t);
        // backdrop: lights out, then the LED panels come on from the centre
        const dark = ease.out(env(t, 0.02, 0.28)) * exitF(e, 1);
        wallMat.uniforms.uOp.value = dark;
        wallMat.uniforms.uOn.value = env(t, 0.18, 0.62) * 1.05;
        wallMat.uniforms.uScan.value = ph >= 0 ? -0.2 + (ph / BEAT) * 1.6 : -1;
        riserMat.opacity = ease.out(env(t, 0.08, 0.3)) * exitF(e, 0.9);
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.6 * dark, 1 - 0.6 * dark, 1 - 0.5 * dark));

        // spotlights snap on (with a flicker) and sweep slowly
        beams.forEach((b, i) => {
          const on = t < 0.34 + i * 0.07 ? 0 : (t < 0.38 + i * 0.07 ? 1 : t < 0.41 + i * 0.07 ? 0.3 : 1);
          b.m.material.opacity = 0.32 * on * exitF(e, 0.5);
          b.m.visible = b.m.material.opacity > 0.003;
          b.m.rotation.z = b.base + 0.24 * Math.sin((t - 0.34) * Math.PI * 2 / (BEAT * 2) + b.phase) * env(t, 0.34, 0.8);
        });

        // trophy rises out of the stage with a spin and lands
        const tr = presence(t, e, 0.3, 0.5, ease.outBack, 0.35);
        k.show(trophy, tr, T_S);
        tSpin.rotation.y = (1 - ease.out(env(t, 0.3, 0.8))) * Math.PI * 3 + Math.sin(t * 1.1) * 0.12 * env(t, 0.8, 1.4);
        trophy.position.set(trophyHome.x, trophyHome.y - (1 - ease.out(env(t, 0.3, 0.7))) * 22 - ease.in(clamp(e * 1.6 - 0.2)) * 20, trophyHome.z);
        trophy.rotation.x = 0.16;

        // controller floats up into his hands, settles; a button press each beat
        const pi = presence(t, e, 0.45, 0.2, ease.outBack, 0.15);
        const pin = ease.out(env(t, 0.45, 0.88));
        k.show(pad, pi * (0.6 + 0.4 * pin));
        const land = ease.outBack(env(t, 0.72, 0.95), 2.2);
        pad.position.set(
          lerp(padHome.x - 30, padHome.x, pin),
          lerp(padHome.y - 46, padHome.y, pin) + (1 - land) * 3 * (t > 0.72 ? 1 : 0) - ease.in(clamp(e * 1.6 - 0.2)) * 40,
          padHome.z);
        pad.rotation.set(-0.45 - (1 - pin) * 0.6, (1 - pin) * 0.7, 0.05 + (1 - pin) * 1.8);
        const press = ph >= 0 ? Math.sin(clamp((ph - 1.7) / 0.22) * Math.PI) : 0;
        buttons[3].position.z = FZ + 0.5 - press * 0.9;
        home.material.color.setHex(press > 0.5 ? 0xffffff : 0x5ce8ff);

        // neon sign drops on its cables, swings, letters light one by one
        const si = presence(t, e, 0.4, 0.3, ease.out, 0.3);
        const drop = ease.outBounce(env(t, 0.4, 0.72));
        sign.visible = si > 0.004;
        sign.position.set(signHome.x, signHome.y + (1 - drop) * 48 + ease.in(clamp(e * 1.6 - 0.3)) * 50, signHome.z);
        signSwing.rotation.z = Math.sin((t - 0.6) * 9) * 0.07 * Math.exp(-Math.max(0, t - 0.6) * 3.5) * (t > 0.6 ? 1 : 0)
          + (ph >= 0 ? Math.sin(ph / BEAT * Math.PI * 2) * 0.012 : 0);
        letters.forEach((L, i) => {
          const tl = t - (0.72 + i * 0.1);
          let on = tl < 0 ? 0 : tl < 0.035 ? 1 : tl < 0.07 ? 0.15 : tl < 0.1 ? 1 : 1;
          if (i === 1 && ph >= 2.1 && ph < 2.2) on = ph < 2.13 ? 0.2 : ph < 2.16 ? 1 : 0.35;
          L.material.opacity = on * exitF(e, 0.2);
        });
      },

      draw2d(q, t, e) {
        const ph = beatPh(t);
        const [cx, cy] = scr(256, 256, 0, A);
        const c = q.drawingContext || q.ctx;
        c.save();
        c.beginPath(); c.arc(cx, cy, k.R + 1, 0, Math.PI * 2); c.clip();
        q.noStroke();
        // confetti: one burst behind VICTORY, then one small puff over the trophy per beat
        const [bx, by] = scr(256, 432, 0, B);
        confetti(q, burst, bx, by - 4, t - 1.06, exitF(e, 0));
        if (ph >= 1.3 && e < 1) {
          const [px, py] = scr(T_U, T_V - 112, T_Z, B);
          confetti(q, puff, px, py, ph - 1.3, exitF(e, 0) * (1 - env(ph - 1.3, 1.1, 1.5)));
        }
        c.restore();

        // trophy glint: on landing, then mid-beat
        const [gx, gy] = scr(T_U - 30, T_V - 96, T_Z + 10, B);
        const land = 1 - Math.abs(clamp((t - 0.82) / 0.24) * 2 - 1);
        const mid = ph >= 0 ? 1 - Math.abs(clamp((ph - 0.5) / 0.3) * 2 - 1) : 0;
        const ga = Math.max(t > 0.82 && t < 1.06 ? land : 0, mid) * exitF(e, 0);
        sparkle(q, gx, gy, 7 * ga, ga, t * 2);

        // VICTORY slams in under him
        const sl = env(t, 0.98, 1.08);
        if (sl > 0) {
          const out = exitF(e, 0);
          const sc = sl < 1 ? lerp(1.32, 1, ease.in(sl)) : 1 + Math.sin(clamp((t - 1.08) / 0.25) * Math.PI * 2) * 0.05 * (1 - env(t, 1.08, 1.33));
          const shake = t > 1.08 && t < 1.25 ? Math.sin(t * 90) * 1.6 * (1 - env(t, 1.08, 1.25)) : 0;
          const shine = ph >= 0 ? env(ph, 0.9, 1.35) : 0;
          // impact lines
          const il = env(t, 1.08, 1.3);
          if (il > 0 && il < 1 && out > 0.004) {
            q.strokeWeight(1.6); q.stroke(11, 10, 20, 230 * (1 - il) * out);
            for (let i = 0; i < 10; i++) {
              const a = i / 10 * Math.PI * 2 + 0.3, r0 = 40 + il * 18, r1 = r0 + 8 * (1 - il);
              q.line(bx + Math.cos(a) * r0 * 1.25, by + Math.sin(a) * r0 * 0.5, bx + Math.cos(a) * r1 * 1.25, by + Math.sin(a) * r1 * 0.5);
            }
          }
          banner(q, bx + shake, by, sc * (0.4 + 0.6 * out), ease.out(clamp(sl * 3)) * out, shine);
        }
      },
    };
  },
};
