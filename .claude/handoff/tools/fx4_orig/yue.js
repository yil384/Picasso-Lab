/* Yue — 棒球 Home run (M.S. at Waseda, hence the Japanese manga SFX)
   Click: the sunny sea window turns into a ballpark at night and the floodlight banks clunk on;
   a wooden bat (toon + ink, taped grip) spins into his folded hands; a pitch comes in from the far
   field, he swings, CRACK: a two-frame impact frame (inverted, then posterised) with focus lines and
   a hand-lettered 「ホームラン！」, and the ball sails off over the stands with a speed-line trail
   and a twinkle where it leaves.
   Loop (3.6 s beat): the bat rests on his shoulder and bobs, the floodlights flicker; every other
   beat the pitch is replayed (softer: no inverted frame).
   Photo landmarks (512 px): face 273,110 · fist 348,388 · right shoulder 345,172 · elbow 440,300 ·
   window x > 200 · deck / field y 190-310 · table edge y ~315 (right) · chair 0-67 x 260-407. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const WOOD = 0xdba766, INK = 0x16151a, PAPER = 0xfff6dc;
const S0 = 0.6;            // first pitch starts here (s = 0)
const CYCLE = 7.2;         // replay every other 3.6 s beat
const BEAT = 3.6;
const L = 125;             // bat length from the grip to the end (world px)
const SWEET = 100;         // grip -> sweet spot
const FONT_JP = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', YuGothic, Meiryo, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK JP', sans-serif";

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

    // ② the bat: origin = the grip in his fist; `aim` turns +Y onto the bat direction
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

    // ③ the ball
    const ballTex = k.canvasTexture(256, 128, (g, w, h) => {
      g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d42f37'; g.lineWidth = 6;
      for (const ph of [0, Math.PI]) {
        g.beginPath();
        for (let x = 0; x <= w; x += 4) { const y = h / 2 + Math.sin(x / w * Math.PI * 4 + ph) * h * 0.27; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();
      }
    });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 16), k.toon(0xffffff, { map: ballTex }));
    k.ink(ball, 1.15);
    root.add(ball);

    // ④ impact frame: a flat disc behind him + his silhouette in one flat colour
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
    const D_REST = V(0.11, 1, 0.03), D_COCK = V(0.35, 0.88, -0.25), D_HIT = V(0.24, 0.34, 0.91);
    const D_FOLLOW = V(-0.5, 0.55, 0.67), D_FRONT = V(0.05, 0.3, 0.95);
    const UP = new THREE.Vector3(0, 1, 0);
    const contact = gripHome.clone().addScaledVector(D_HIT, SWEET);
    const P0 = k.at(446, 264, -30);                 // the pitcher's mound, far out
    const PV = k.at(426, 104, -33);                 // where the ball leaves (over the stands)
    const PM = k.at(402, 214, 45);                  // bend of its flight
    const nl = (a, b, u, out) => out.copy(a).lerp(b, u).normalize();
    const tmpD = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

    /* the pitch sequence the clock is in: s = seconds into it (-1 = none), replay = not the first */
    const seqOf = (t) => {
      const s = t - S0;
      return s < 0 ? -1 : s - Math.floor(s / CYCLE) * CYCLE;
    };
    const replayOf = (t) => t - S0 >= CYCLE;
    /** bat direction at sequence time s (+ the idle bob at clock t) */
    const batDir = (s, t, out) => {
      if (s < 0 || s >= 1.2) {
        const b = Math.sin(t * Math.PI * 2 / BEAT);
        return out.set(D_REST.x + 0.03 * b, D_REST.y, D_REST.z).normalize();
      }
      if (s < 0.22) return nl(D_REST, D_COCK, ease.inOut(s / 0.22), out);
      if (s < 0.26) return out.copy(D_COCK);
      if (s < 0.33) return nl(D_COCK, D_HIT, ease.in((s - 0.26) / 0.07), out);
      if (s < 0.40) return nl(D_HIT, D_FOLLOW, ease.out((s - 0.33) / 0.07), out);
      if (s < 0.55) return nl(D_FOLLOW, D_FRONT, 0.1 * (s - 0.4) / 0.15, out);
      if (s < 0.8) { nl(D_FOLLOW, D_FRONT, 0.1, tmpA); return nl(tmpA, D_FRONT, ease.inOut((s - 0.55) / 0.25), out); }
      return nl(D_FRONT, D_REST, ease.outBack((s - 0.8) / 0.35, 1.4), out);
    };
    /** ball position at sequence time s; returns its scale (0 = hidden) */
    const ballAt = (s, out) => {
      if (s < 0.12 || s >= 0.8) return 0;
      if (s < 0.33) {
        const u = (s - 0.12) / 0.21;
        out.copy(P0).lerp(contact, Math.pow(u, 1.5));
        return lerp(0.28, 1, u * u);
      }
      const u = ease.out((s - 0.33) / 0.47), v = 1 - u;
      out.set(0, 0, 0).addScaledVector(contact, v * v).addScaledVector(PM, 2 * u * v).addScaledVector(PV, u * u);
      return lerp(1, 0.06, Math.pow(u, 0.8));
    };
    const tipAt = (s, t, out) => out.copy(gripHome).addScaledVector(batDir(s, t, tmpD), L);

    // focus lines toward the contact point (angles / widths fixed)
    const rr = rng(5);
    const focus = Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * Math.PI * 2 + (rr() - 0.5) * 0.12, w: 0.012 + rr() * 0.03, f: 0.3 + rr() * 0.35 }));
    const sfx = [
      { ch: 'ホ', x: -64, y: 27, s: 27, r: -0.16 }, { ch: 'ー', x: -37, y: 23, s: 24, r: -0.1 }, { ch: 'ム', x: -11, y: 19, s: 25, r: 0.08 },
      { ch: 'ラ', x: -50, y: 51, s: 25, r: -0.06 }, { ch: 'ン', x: -24, y: 48, s: 26, r: 0.1 }, { ch: '！', x: -2, y: 44, s: 26, r: 0.18 },
    ];
    const tint = new THREE.Color(), cTmp = new THREE.Color();
    const ballPos = new THREE.Vector3(), trailA = new THREE.Vector3(), tipTmp = new THREE.Vector3();

    const impactOf = (s, replay) => (replay || s < 0.33 || s >= 0.41) ? 0 : (s < 0.37 ? 1 : 2);

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

        // bat: spins into his fist, then the swing / the rest on his shoulder
        const bi = presence(t, e, 0.1, 0.42, ease.out, 0.3);
        k.show(bat, bi);
        const swingIn = 1 - ease.outBack(env(t, 0.1, 0.55), 2.2);
        const fly = ease.in(clamp(e * 1.6 - 0.1));
        batDir(s, t, tmpD);
        if (swingIn !== 0) tmpD.applyAxisAngle(tmpA.set(0, 0, 1), -1.25 * swingIn);
        aim.quaternion.setFromUnitVectors(UP, tmpD);
        const bob = (s < 0 || s >= 1.2) ? Math.sin(t * Math.PI * 2 / BEAT) * 0.7 : 0;
        bat.position.set(gripHome.x + 50 * fly, gripHome.y + 40 * fly + bob, gripHome.z);

        // ball
        const bs = ballAt(s, ballPos) * (1 - clamp(e * 2.2));
        k.show(ball, bs);
        ball.position.copy(ballPos);
        ball.rotation.set(t * 9, t * 14, 0);

        // impact frame (first hit only): A inverted, B posterised
        const f = impactOf(s, replay) * (e > 0 ? 0 : 1);
        flash.material.opacity = f ? 1 : 0;
        flash.material.color.set(f === 1 ? INK : 0xffe27a);
        sil.visible = f > 0;
        silMat.uniforms.uColor.value.set(f === 1 ? PAPER : INK);
        body.material = f === 1 ? flatLight : f === 2 ? flatDark : woodMat;
        tape.material = f === 1 ? flatLight : f === 2 ? flatDark : tapeMat;
        fist.visible = f === 0;
        banks.forEach(bk => { bk.glow.visible = f === 0; bk.cone.visible = f === 0; });
        // a short shake on contact
        const sh = (s >= 0.33 && s < 0.55) ? (1 - (s - 0.33) / 0.22) * (replay ? 0.6 : 1.6) : 0;
        root.position.set(Math.sin(t * 97) * sh, Math.cos(t * 83) * sh * 0.7, 0);
      },

      draw2d(q, t, e) {
        const s = seqOf(t), replay = replayOf(t);
        if (s < 0) return;
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const c = q.ctx || q.drawingContext;
        const [cx, cy] = k.screenAt(256, 256, 0);
        const [hx, hy] = k.toScreen(contact);
        const f = impactOf(s, replay);
        c.save();
        c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();

        // pitch speed lines
        if (s > 0.14 && s < 0.33) {
          ballAt(s, trailA); const [bx, by] = k.toScreen(trailA);
          const [px, py] = k.toScreen(P0);
          const dx = bx - px, dy = by - py, dl = Math.hypot(dx, dy) || 1;
          const nx = -dy / dl, ny = dx / dl;
          q.stroke(255, 255, 255, 200 * fade); q.strokeWeight(1.2);
          for (let i = -2; i <= 2; i++) {
            const o = i * 3.2, ln = 10 + 6 * (2 - Math.abs(i));
            q.line(bx + nx * o - dx / dl * 5, by + ny * o - dy / dl * 5, bx + nx * o - dx / dl * (5 + ln), by + ny * o - dy / dl * (5 + ln));
          }
        }
        // swing smear: a crescent behind the bat end
        if (s > 0.26 && s < 0.47) {
          const a0 = Math.max(0.26, s - 0.09), a1 = Math.min(s, 0.4);
          const al = (s < 0.4 ? 1 : 1 - (s - 0.4) / 0.07) * fade;
          if (a1 > a0 && f === 0) {
            q.noStroke(); q.fill(255, 250, 225, 150 * al);
            q.beginShape();
            for (let i = 0; i <= 10; i++) { const [x, y] = k.toScreen(tipAt(lerp(a0, a1, i / 10), t, tipTmp)); q.vertex(x, y); }
            for (let i = 10; i >= 0; i--) {
              batDir(lerp(a0, a1, i / 10), t, tmpB);
              const [x, y] = k.toScreen(tipTmp.copy(gripHome).addScaledVector(tmpB, L * lerp(0.9, 0.62, i / 10)));
              q.vertex(x, y);
            }
            q.endShape(q.CLOSE);
          }
        }
        // focus lines
        if (s >= 0.33 && s < (replay ? 0.5 : 0.52)) {
          const al = (f ? 1 : replay ? 0.5 * (1 - (s - 0.33) / 0.17) : 0.8 * (1 - (s - 0.41) / 0.11)) * fade;
          if (f === 1) q.fill(255, 247, 222, 255); else q.fill(22, 21, 26, 235 * al);
          q.noStroke();
          const RR = R * 2.4;
          for (const l of focus) {
            const x0 = hx + Math.cos(l.a - l.w) * RR, y0 = hy + Math.sin(l.a - l.w) * RR;
            const x1 = hx + Math.cos(l.a + l.w) * RR, y1 = hy + Math.sin(l.a + l.w) * RR;
            const ir = RR * l.f * 0.45 * (f ? 1 : 1 + Math.max(0, s - (replay ? 0.33 : 0.41)) * 5);
            q.triangle(x0, y0, x1, y1, hx + Math.cos(l.a) * ir, hy + Math.sin(l.a) * ir);
          }
        }
        // impact star (hollow, so the ball stays visible)
        if (s >= 0.33 && s < 0.52) {
          const u = (s - 0.33) / 0.19;
          const al = (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4) * fade;
          const sc = 0.6 + 0.6 * ease.out(Math.min(1, u * 2.5));
          q.stroke(22, 21, 26, 255 * al); q.strokeWeight(1.6);
          if (f === 2) q.fill(22, 21, 26, 255); else q.fill(255, 236, 120, 255 * al);
          for (let i = 0; i < 10; i++) {
            const a = i / 10 * Math.PI * 2 + 0.3, len = (i % 2 ? 15 : 22) * sc, w = 0.2;
            q.triangle(hx + Math.cos(a - w) * 8 * sc, hy + Math.sin(a - w) * 8 * sc, hx + Math.cos(a + w) * 8 * sc, hy + Math.sin(a + w) * 8 * sc,
              hx + Math.cos(a) * len, hy + Math.sin(a) * len);
          }
        }
        // ball trail after the hit
        if (s > 0.34 && s < 0.86) {
          const al = (s < 0.74 ? 1 : 1 - (s - 0.74) / 0.12) * fade;
          let px = null, py = null;
          for (let i = 0; i <= 8; i++) {
            const ss = Math.max(0.331, Math.min(0.799, s) - i * 0.022);
            if (!ballAt(ss, trailA)) continue;
            const [x, y] = k.toScreen(trailA);
            if (px !== null) {
              q.stroke(22, 21, 26, 200 * al * (1 - i / 9)); q.strokeWeight((6.5 - i * 0.7) * 1.25);
              q.line(px, py, x, y);
              q.stroke(255, 247, 214, 255 * al * (1 - i / 9)); q.strokeWeight(6.5 - i * 0.7);
              q.line(px, py, x, y);
            }
            px = x; py = y;
          }
        }
        // twinkle where it leaves
        if (s > 0.74 && s < 1.12) {
          const u = (s - 0.74) / 0.38, a = Math.sin(Math.PI * u) * fade;
          const [x, y] = k.toScreen(PV);
          q.push(); q.translate(x, y); q.rotate(u * 1.2);
          q.stroke(22, 21, 26, 255 * a); q.strokeWeight(1.3); q.fill(255, 250, 220, 255 * a);
          const big = 11 * a, sm = 2.2 * a;
          q.beginShape();
          for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rad = i % 2 ? sm : big; q.vertex(Math.cos(ang) * rad, Math.sin(ang) * rad); }
          q.endShape(q.CLOSE);
          q.pop();
        }
        c.restore();

        // 「ホームラン！」 hand lettering over his left side
        const hold = replay ? 1.3 : 1.85;
        if (s > 0.41 && s < hold + 0.25) {
          c.save();
          c.lineJoin = 'round';
          c.textAlign = 'center'; c.textBaseline = 'middle';
          const out = 1 - ease.in(clamp((s - hold) / 0.25));
          sfx.forEach((g, i) => {
            const a = ease.outBack(env(s, 0.41 + i * 0.035, 0.41 + i * 0.035 + 0.16), 2.2) * out * fade;
            if (a <= 0.01) return;
            const wob = Math.sin(t * 3 + i) * 0.03;
            c.save();
            c.translate(cx + g.x, cy + g.y);
            c.rotate(g.r - 0.12 + wob);
            c.scale(a, a);
            c.font = `900 ${g.s}px ${FONT_JP}`;
            c.fillStyle = '#e2362a'; c.fillText(g.ch, 2.6, 2.6);
            c.strokeStyle = '#16151a'; c.lineWidth = 5.5; c.strokeText(g.ch, 0, 0);
            c.fillStyle = '#ffe24a'; c.fillText(g.ch, 0, 0);
            c.restore();
          });
          c.restore();
        }
      },
    };
  },
};
