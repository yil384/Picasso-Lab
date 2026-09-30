/* Zhuo — CPhO 金牌 (Chinese Physics Olympiad gold; Tsinghua Yao Class; quantum computing systems)
   Click: a gold CPhO medal on a red ribbon drops around his neck and swings to rest; a
   small gold trophy settles into his lower hand (his real fingers re-layered over the
   stem); above his head a little storm cloud gathers and an atom spins up in front of
   it — three electron orbits, a nucleus, a Bloch-sphere flicker; an equation writes
   itself along his pointing arm and his fingertip sparkles.
   Loop (3.6 s): electrons orbit, the medal swings slightly and glints, the Bloch sphere
   flickers once with a crackle, one equation per beat, fingertip twinkle.
   Photo landmarks (512 px): fingertip 52,179 · wrist 107,185 · shoulder 195,215 ·
   head top 263,145 · neck 269,214 (collar v 227) · lower hand 258,433 (fingers 238..270, 421..449). */
import { THREE, presence, env, ease, clamp } from './kit.js';

const GOLD = 0xf0b93a, GOLD_D = 0xcf8f25, RED = 0xc8302a;
const BEAT = 3.6, LOOP0 = 1.3;
const TAU = Math.PI * 2;
const PX = 200 / 512;                       // photo px -> CSS px
const EQS = ['E = ħω', '∇·E = ρ/ε₀', 'ΔxΔp ≥ ħ/2', 'F = ma'];

export default {
  title: 'CPhO gold medal',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const own = [];
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
    const starShape = (ro, ri, n = 5) => {
      const s = new THREE.Shape();
      for (let i = 0; i < n * 2; i++) {
        const a = Math.PI / 2 + (i * Math.PI) / n, r = i % 2 ? ri : ro;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      s.closePath();
      return s;
    };
    /** flat ribbon along a curve (for straps): width w, uv.x across, uv.y along */
    const ribbonGeo = (curve, w, n = 14) => {
      const pos = new Float32Array((n + 1) * 6), uv = new Float32Array((n + 1) * 4), idx = [];
      const p = new THREE.Vector3(), tg = new THREE.Vector3();
      for (let i = 0; i <= n; i++) {
        curve.getPointAt(i / n, p); curve.getTangentAt(i / n, tg);
        const sx = -tg.y, sy = tg.x, l = Math.hypot(sx, sy) || 1;
        pos.set([p.x - (sx / l) * w / 2, p.y - (sy / l) * w / 2, p.z, p.x + (sx / l) * w / 2, p.y + (sy / l) * w / 2, p.z], i * 6);
        uv.set([0, i / n, 1, i / n], i * 4);
        if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    /* ① gold medal on a red ribbon, pivoting at his neck */
    const PIV = [269, 214];
    const L = (u, v) => [(u - PIV[0]) * PX, -(v - PIV[1]) * PX];
    const medal = new THREE.Group();          // shown / dropped
    const swing = new THREE.Group();          // swings about the neck
    medal.add(swing);
    const ribTex = k.canvasTexture(32, 64, (g) => {
      g.fillStyle = '#c8302a'; g.fillRect(0, 0, 32, 64);
      g.fillStyle = '#f2c14e'; g.fillRect(6, 0, 3, 64); g.fillRect(23, 0, 3, 64);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(26, 0, 6, 64);
    });
    const ribMat = k.toon(0xffffff, { map: ribTex, side: THREE.DoubleSide });
    const inkMat = new THREE.MeshBasicMaterial({ color: k.INK, side: THREE.DoubleSide });
    const RING = L(265, 277);
    [[L(252, 211), L(254, 246), RING, -0.6], [L(287, 213), L(282, 246), [RING[0] + 1.2, RING[1]], 0.6]].forEach(([a, b, c, dz]) => {
      const curve = new THREE.CatmullRomCurve3([V(a[0], a[1], -1.5), V(b[0], b[1], 1.2 + dz), V(c[0], c[1], 1.6)]);
      const strap = new THREE.Mesh(ribbonGeo(curve, 4.4), ribMat);
      const edge = new THREE.Mesh(ribbonGeo(curve, 5.8), inkMat);
      edge.position.z = -0.25;
      swing.add(edge, strap);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.55, 8, 18), k.toon(GOLD));
    ring.position.set(RING[0] + 0.6, RING[1] - 0.6, 1.8);
    k.ink(ring, 0.8);
    swing.add(ring);
    const MR = 12;
    const faceTex = k.canvasTexture(256, 256, (g) => {
      const c = 128;
      g.fillStyle = '#e9ad3c'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#f6cc62'; g.beginPath(); g.arc(c, c, 104, 0, TAU); g.fill();
      g.fillStyle = '#fbe08e'; g.beginPath(); g.arc(c - 10, c - 12, 86, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(c, c, 104, 0, TAU); g.clip();
      g.fillStyle = '#e4a53a'; g.beginPath(); g.arc(c + 70, c + 78, 96, 0, TAU); g.fill();
      g.restore();
      // star (embossed)
      const star = (x, y, r, col) => {
        g.fillStyle = col; g.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath(); g.fill();
      };
      star(c + 2, 58, 17, '#a8680f'); star(c - 1, 55, 17, '#fff4c4'); star(c, 56, 17, '#e6a531');
      // CPhO lettering (embossed), fitted to the field
      g.font = '900 76px "Arial Black", Impact, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText('CPhO').width, sx = Math.min(1, 186 / w);
      g.save(); g.translate(c, 136); g.scale(sx, 1);
      g.fillStyle = '#fff4c4'; g.fillText('CPhO', -2, -2);
      g.fillStyle = '#5a320a'; g.fillText('CPhO', 2, 2);
      g.fillStyle = '#6e3f0c'; g.fillText('CPhO', 0, 0);
      g.restore();
      // a small laurel of dots under the lettering
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.3 + 0.4 * i / 6); g.fillStyle = '#c0841f'; g.beginPath(); g.arc(c + Math.cos(a) * 58, c + 26 + Math.sin(a) * 44, 5.5, 0, TAU); g.fill(); }
    });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(MR, MR, 2.2, 48), k.toon(GOLD_D));
    disc.geometry.rotateX(Math.PI / 2);
    k.ink(disc, 1.4);
    const face = new THREE.Mesh(new THREE.CircleGeometry(MR - 0.3, 48), k.toon(0xffffff, { map: faceTex }));
    face.position.z = 1.12;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(MR - 0.4, 0.95, 10, 56), k.toon(GOLD));
    rim.position.z = 1.1;
    k.ink(rim, 0.6);
    const relief = new THREE.Mesh(new THREE.TorusGeometry(MR - 2.6, 0.5, 8, 56), k.toon(GOLD));
    relief.position.z = 1.2;
    const glintMat = new THREE.ShaderMaterial({
      uniforms: { uG: { value: -40 } },
      vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uG; varying vec2 vP;
        void main() { float d = vP.x + 0.7 * vP.y - uG;
          float a = smoothstep(2.6, 0.0, abs(d)) * 0.85 + smoothstep(0.9, 0.0, abs(d - 4.0)) * 0.6;
          gl_FragColor = vec4(1.0, 0.99, 0.9, a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    own.push(glintMat);
    const glint = new THREE.Mesh(new THREE.CircleGeometry(MR - 0.2, 48), glintMat);
    glint.position.z = 1.35;
    glint.renderOrder = 12;
    const discG = new THREE.Group();
    discG.add(disc, face, rim, relief, glint);
    discG.position.set(RING[0] + 0.6, RING[1] - 1.6 - MR, 2.2);
    swing.add(discG);
    const medalHome = k.at(PIV[0], PIV[1], 3);
    medal.position.copy(medalHome);
    root.add(medal);
    // his neck and chin back in front of the ribbon straps
    const neck = k.patch([[247, 204], [258, 211], [272, 212], [285, 204], [288, 214], [288, 229], [276, 234], [262, 232], [254, 226], [248, 215]], 7);

    /* ② small gold trophy in his lower hand; his real fingers over the stem */
    const trophy = new THREE.Group();
    const cupFit = new THREE.Group();
    trophy.add(cupFit);
    const prof = [[0.01, 0], [4.4, 0], [4.4, 1.5], [3.4, 1.8], [2.6, 2.6], [1.05, 3.4], [0.95, 8.4], [1.9, 9.0], [1.9, 9.7], [1.1, 10.3], [1.5, 11.0], [3.3, 11.9], [4.9, 13.8], [5.6, 16.6], [5.9, 18.6], [6.3, 19.2], [5.5, 19.2], [0.01, 17.6]]
      .map(([r, y]) => new THREE.Vector2(r, y - 6));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), k.toon(GOLD));
    k.ink(cup, 1.1);
    const handles = [-1, 1].map(sx => {
      const h = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.62, 8, 18, Math.PI), k.toon(GOLD));
      h.rotation.z = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      h.position.set(sx * 5.4, 16.0 - 6, 0);
      k.ink(h, 0.9);
      return h;
    });
    const tStar = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(2.3, 1.0), { depth: 0.6, bevelEnabled: false }), k.toon(RED));
    tStar.position.set(0, 15.2 - 6, 5.3);
    tStar.rotation.x = -0.12;
    k.ink(tStar, 0.7);
    cupFit.add(cup, ...handles, tStar);
    cupFit.scale.setScalar(1.22);
    const trophyHome = k.at(254, 437, 3);
    trophy.position.copy(trophyHome);
    trophy.rotation.z = 0.3;
    root.add(trophy);
    const fingers = k.patch([[236, 448], [240, 440], [244, 431], [249, 424], [256, 420], [264, 422], [269, 429], [271, 437], [267, 444], [258, 448], [247, 450]], 8);

    /* ③ quantum storm over his head: a toon cloud, and an atom in front of it */
    const storm = new THREE.Group();
    const cloud = new THREE.Group();
    const cloudMat = k.clip(k.toon(0x7468c4));
    [[-17, -2, 8.5], [-6, 5, 10.5], [8, 5.5, 9.5], [18, -1, 8], [0, -3.5, 9.5], [-26, -5, 5.5], [26, -5.5, 5.5]].forEach(([x, y, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), cloudMat);
      m.position.set(x, y, -r * 0.2);
      m.scale.set(1, 0.86, 0.55);
      k.ink(m, 1.3);
      cloud.add(m);
    });
    cloud.position.z = -8;
    const atom = new THREE.Group();
    const nucleus = new THREE.Group();
    [[-1.1, 0.8, 0.6, 0xe0503a], [1.2, 0.6, 0.2, 0xd9d2c6], [0.1, -1.1, 0.9, 0xe0503a], [0.3, 0.4, -1.2, 0xd9d2c6]].forEach(([x, y, z, c]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.8, 14, 10), k.toon(c));
      s.position.set(x, y, z);
      k.ink(s, 0.8);
      nucleus.add(s);
    });
    atom.add(nucleus);
    const ORB = 17.5;
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x8ff3ff });
    const electronMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const orbits = [], electrons = [];
    for (let i = 0; i < 3; i++) {
      const frame = new THREE.Group();
      frame.rotation.z = (i * Math.PI) / 3 + 0.2;
      const tilt = new THREE.Group();
      tilt.rotation.x = 1.2;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(ORB, 0.42, 6, 72), orbitMat);
      k.ink(torus, 0.8);
      const el = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), electronMat);
      k.ink(core, 0.8);
      const glow = k.glowSprite('rgba(120,240,255,0.95)', 11, 0.9);
      el.add(glow, core);
      tilt.add(torus, el);
      frame.add(tilt);
      atom.add(frame);
      orbits.push(frame);
      electrons.push(el);
    }
    atom.position.z = 12;
    storm.add(cloud, atom);
    const stormHome = k.at(262, 90, 0);
    storm.position.copy(stormHome);
    root.add(storm);

    const tint = new THREE.Color();
    const tmp = new THREE.Vector3();
    const beatIdx = (t) => Math.floor((t - LOOP0) / BEAT);
    const beatPh = (t) => ((t - LOOP0) % BEAT + BEAT) % BEAT;

    return {
      update(t, e) {
        k.layers.photo.material.opacity = 1;   // the plate fades in over an opaque photo (no see-through mid-fade)
        const mood = presence(t, e, 0, 0.45, ease.out, 0);
        k.layers.plate.material.color.copy(tint.setRGB(1 - 0.1 * mood, 1 - 0.08 * mood, 1 - 0.02 * mood));

        // medal: drops over his head onto the chest, then swings to rest; later a slight sway + glint
        const land = t - 0.38;
        const mOut = 1 - ease.in(clamp(e * 1.6 - 0.12));
        k.show(medal, env(t, 0.08, 0.16) * mOut);
        medal.position.set(medalHome.x, medalHome.y + (1 - ease.in(env(t, 0.08, 0.38))) * 34 - (1 - mOut) * 6, medalHome.z);
        neck.visible = medal.visible;
        const settle = land > 0 ? 0.42 * Math.exp(-3.1 * land) * Math.sin(8.2 * land + 0.35) : 0.25;
        swing.rotation.z = settle + 0.03 * Math.sin((t * TAU) / BEAT) * env(t, 1.0, 1.6);
        discG.rotation.y = 0.25 * Math.exp(-2.5 * Math.max(0, land)) * Math.sin(6 * Math.max(0, land)) + 0.08 * Math.sin((t * TAU) / BEAT + 1);
        const gp = beatPh(t);
        glintMat.uniforms.uG.value = t > LOOP0 && gp > 1.7 && gp < 2.25 ? -18 + ((gp - 1.7) / 0.55) * 36 : -60;

        // trophy settles into his hand
        const tp = presence(t, e, 0.55, 0.42, ease.outBack, 0.4);
        k.show(trophy, Math.min(1, tp * 1.8));
        trophy.position.set(trophyHome.x, trophyHome.y + (1 - tp) * 16, trophyHome.z);
        trophy.rotation.z = 0.3 + (1 - tp) * 0.5;
        fingers.visible = tp > 0.004;

        // storm cloud gathers, the atom spins up
        const cp = presence(t, e, 0.22, 0.4, ease.outBack, 0.3);
        k.show(cloud, cp);
        cloud.position.y = Math.sin((t * TAU) / BEAT) * 0.8;
        const ap = presence(t, e, 0.4, 0.45, ease.outBack, 0.1);
        k.show(atom, ap);
        atom.rotation.z = (1 - Math.min(1, ap)) * -1.2;
        atom.rotation.y = 0.25 * Math.sin((t * TAU) / (BEAT * 2));
        const spin = env(t, 0.4, 1.0);
        electrons.forEach((el, i) => {
          const a = t * (2.4 + i * 0.35) * (0.4 + 0.6 * spin) + i * 2.1;
          el.position.set(Math.cos(a) * ORB, Math.sin(a) * ORB, 0);
        });
        nucleus.rotation.set(t * 0.7, t * 0.9, 0);
        const bl = hump(beatPh(t), 0.25, 0.4, 1.05) * (t > LOOP0 ? 1 : 0);
        nucleus.scale.setScalar(1 + 0.25 * bl);
      },

      draw2d(q, t, e) {
        const fade = 1 - e;
        const c = q.drawingContext;
        q.strokeJoin(q.ROUND);
        const star4 = (x, y, r, a, col = [255, 255, 255]) => {
          q.stroke(22, 21, 26, 230 * a); q.strokeWeight(1.1); q.fill(col[0], col[1], col[2], 255 * a);
          q.beginShape();
          for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.3 : r; const an = (i / 8) * TAU - Math.PI / 2; q.vertex(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
          q.endShape(q.CLOSE);
        };

        // equation along his pointing arm: writes on once, then one equation per beat
        const [ax, ay] = k.screenAt(78, 160, 0), [bx, by] = k.screenAt(190, 190, 0);
        const ang = Math.atan2(by - ay, bx - ax);
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        let idx = 0, alpha = 0, reveal = 1;
        if (t < LOOP0 + BEAT) {
          reveal = env(t, 0.8, 1.25);
          alpha = t < LOOP0 + BEAT - 0.35 ? 1 : 1 - env(t, LOOP0 + BEAT - 0.35, LOOP0 + BEAT);
        } else {
          idx = beatIdx(t) % EQS.length;
          const ph = beatPh(t);
          alpha = Math.min(env(ph, 0, 0.35), 1 - env(ph, BEAT - 0.35, BEAT));
        }
        alpha *= fade;
        if (alpha > 0.01 && reveal > 0) {
          q.push();
          q.translate(mx, my);
          q.rotate(ang);
          q.textFont('Georgia, "Times New Roman", serif');
          q.textStyle(q.BOLDITALIC ?? 'italic bold');
          q.textSize(11.5);
          q.textAlign(q.CENTER, q.CENTER);
          const s = EQS[idx];
          const w = q.textWidth(s), n = s.length;
          let x = -w / 2;
          for (let i = 0; i < n; i++) {           // letters pop in one by one as it "writes"
            const ch = s[i], cw = q.textWidth(ch);
            const a = clamp(reveal * (n + 2) - i, 0, 1);
            if (a > 0 && ch !== ' ') {
              q.push();
              q.translate(x + cw / 2, (1 - a) * 3);
              q.scale(ease.outBack(a, 2.4));
              q.fill(22, 21, 26, 255 * alpha); q.stroke(22, 21, 26, 255 * alpha); q.strokeWeight(3.6);
              q.text(ch, 0, 0);
              q.noStroke(); q.fill(255, 247, 214, 255 * alpha);
              q.text(ch, 0, 0);
              q.pop();
            }
            x += cw;
          }
          q.pop();
        }

        // fingertip sparkle: a pop when the equation lands, then a twinkle at the start of each beat
        const [fx, fy] = k.screenAt(50, 178, 0);
        let sp = hump(t, 1.1, 1.22, 1.55);
        if (t > LOOP0) sp = Math.max(sp, hump(beatPh(t), 0, 0.12, 0.45) * 0.8);
        sp *= fade;
        if (sp > 0.01) {
          star4(fx, fy, 8.5 * sp, sp, [255, 246, 200]);
          q.stroke(255, 236, 150, 230 * sp); q.strokeWeight(1.3);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + 0.3;
            q.line(fx + Math.cos(a) * 10 * sp, fy + Math.sin(a) * 10 * sp, fx + Math.cos(a) * 14 * sp, fy + Math.sin(a) * 14 * sp);
          }
        }

        // Bloch-sphere flicker round the atom + a crackle from the cloud, once per beat
        if (t > LOOP0) {
          const ph = beatPh(t);
          const b = hump(ph, 0.25, 0.4, 1.05) * fade;
          if (b > 0.01) {
            storm.localToWorld(tmp.set(0, 0, 12)); root.worldToLocal(tmp);
            const [ox, oy] = k.toScreen(tmp);
            const fl = b * (0.8 + 0.2 * Math.sin(ph * 60));
            const R = 23;
            q.noFill(); q.stroke(210, 250, 255, 200 * fl); q.strokeWeight(1.2);
            q.circle(ox, oy, R * 2);
            c.save(); c.setLineDash([2.5, 2.5]);
            q.ellipse(ox, oy, R * 2, R * 0.6);
            c.restore();
            const th = -Math.PI / 2 + env(ph, 0.3, 0.9) * 2.4;
            const vx = ox + Math.cos(th) * R * 0.95, vy = oy + Math.sin(th) * R * 0.95 * 0.9;
            q.stroke(255, 230, 120, 255 * fl); q.strokeWeight(1.8);
            q.line(ox, oy, vx, vy);
            q.noStroke(); q.fill(255, 230, 120, 255 * fl);
            q.circle(vx, vy, 3.6);
            // crackles: two short zigzags off the cloud's lower corners
            const cr = hump(ph, 0.3, 0.38, 0.62) * fade;
            if (cr > 0.01) {
              [[-1, 0], [1, 1]].forEach(([sx, j]) => {
                storm.localToWorld(tmp.set(sx * 22, -8, -4)); root.worldToLocal(tmp);
                const [zx, zy] = k.toScreen(tmp);
                q.stroke(22, 21, 26, 230 * cr); q.strokeWeight(3.2); q.noFill();
                const pts = [[0, 0], [sx * 3, 4], [sx * 0.5, 6], [sx * 4, 11]];
                q.beginShape(); pts.forEach(([x, y]) => q.vertex(zx + x, zy + y)); q.endShape();
                q.stroke(255, 232, 90, 255 * cr); q.strokeWeight(1.6);
                q.beginShape(); pts.forEach(([x, y]) => q.vertex(zx + x, zy + y)); q.endShape();
              });
            }
          }
          // trophy twinkle
          const tw = hump(ph, 2.55, 2.65, 2.95) * fade;
          if (tw > 0.01) { trophy.localToWorld(tmp.set(-5.5, 13.3, 3)); root.worldToLocal(tmp); const [tx, ty] = k.toScreen(tmp); star4(tx, ty, 5.5 * tw, tw); }
          // medal twinkle as the glint leaves the disc
          const mt = hump(ph, 2.15, 2.25, 2.5) * fade;
          if (mt > 0.01) { discG.localToWorld(tmp.set(7, 7, 2)); root.worldToLocal(tmp); const [dx, dy] = k.toScreen(tmp); star4(dx, dy, 5.5 * mt, mt); }
        }
      },

      dispose() {
        own.forEach(o => o.dispose?.());
        k.layers.plate.material.color.setRGB(1, 1, 1);
      },
    };
  },
};
