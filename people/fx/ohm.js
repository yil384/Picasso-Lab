/* Ohm — AMMA: a multi-chiplet, memory-centric architecture
   Click: the garden turns into a dark silicon interposer (spreading out from the compute die);
   gold traces etch in from the die outward (a ring bus round the rim, stubs to the stacks, two
   bundles into the die); a compute die with the AMMA silkscreen rises at his feet; four HBM
   memory stacks build up layer by layer at the rim; data packets start racing round the ring and
   between the stacks and the die (passing behind him); an Ω badge (Ohm) stamps onto his chest.
   Loop (3.2 s): packets circulate, the die takes a heat pulse (warm glow + shimmer lines).
   Photo landmarks (512 px): cap top v 17 · glasses 263,57 · collar v 100 · chest logo 285,142 ·
   shoulders u 175-340 · hands 183,327 / 319,327 · shirt hem v 310 · jeans below. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BEAT = 3.2, T0 = 1.3;
const ZI = -34;                               // interposer depth
const VS = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const DIE = [256, 444];                       // compute die centre (photo px)
const STACKS = [[84, 170, 0.36], [428, 170, -0.36], [64, 356, 0.42], [448, 356, -0.42]];   // base u, v, turn
const RING = [229, 236, 243];
const BUNDLE_L = [[178, 452], [132, 452], [96, 416], [96, 386]];
const BUNDLE_R = BUNDLE_L.map(([u, v]) => [512 - u, v]);

export default {
  title: 'AMMA chiplets',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const V = new THREE.Vector3();
    const atInto = (o, u, v, z) => { const s = k.depthScale(z); return o.set((u / 512 - 0.5) * k.D * s, (0.5 - v / 512) * k.D * s, z); };
    const toScr = (v3, out) => { V.copy(v3).applyMatrix4(root.matrixWorld).project(k.camera); out[0] = (V.x + 1) / 2 * k.W; out[1] = (1 - V.y) / 2 * k.H; return out; };
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const beatPh = t => (t < T0 ? -1 : (t - T0) % BEAT);

    // a backdrop disc 2 px wider than the photo (the stencil trims it to the circle, so no plate
    // pixels leak at the anti-aliased rim); uvs still map 0..1 onto the photo's 512 px
    const backdropDisc = () => {
      const pad = 2, geo = new THREE.CircleGeometry(k.R + pad, 128), uv = geo.attributes.uv, f = (k.R + pad) / k.R;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * f + 0.5, (uv.getY(i) - 0.5) * f + 0.5);
      return geo;
    };
    // the photo and plate sit deeper than the stencil disc, so off-axis perspective shifts them ~2 px:
    // clip them too, or a sliver of the old background shows at the rim next to the new set
    k.clip(k.layers.plate.material);
    k.clip(k.layers.photo.material);

    // ── ① the interposer: silicon base + gold traces, revealed from the die outward ──────────
    const siTex = k.canvasTexture(512, 512, (g) => {
      const R = rng(4);
      const gr = g.createRadialGradient(256, 330, 20, 256, 256, 330);
      gr.addColorStop(0, '#20273b'); gr.addColorStop(1, '#0e111c');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      const sh = g.createLinearGradient(0, 0, 512, 512);
      sh.addColorStop(0.25, 'rgba(120,140,210,0)'); sh.addColorStop(0.42, 'rgba(120,140,210,0.09)'); sh.addColorStop(0.6, 'rgba(120,140,210,0)');
      g.fillStyle = sh; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(210,220,255,0.05)'; g.lineWidth = 1;
      for (let i = 16; i < 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      // micro-bump fields
      const field = (x0, y0, w, h) => {
        g.fillStyle = 'rgba(200,210,235,0.16)';
        for (let y = y0; y < y0 + h; y += 7) for (let x = x0; x < x0 + w; x += 7) { g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill(); }
      };
      field(20, 230, 70, 60); field(430, 230, 64, 60); field(150, 40, 60, 40); field(310, 40, 60, 40); field(120, 470, 60, 30); field(340, 470, 60, 30);
      // decoupling caps
      for (let i = 0; i < 14; i++) {
        const a = R() * Math.PI * 2, r = 120 + R() * 100, x = 256 + Math.cos(a) * r, y = 256 + Math.sin(a) * r;
        g.save(); g.translate(x, y); g.rotate(R() < 0.5 ? 0 : Math.PI / 2);
        g.fillStyle = '#6b5a45'; g.fillRect(-5, -2.5, 10, 5);
        g.fillStyle = '#d7dbe3'; g.fillRect(-5, -2.5, 2.5, 5); g.fillRect(2.5, -2.5, 2.5, 5);
        g.restore();
      }
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 253, 0, Math.PI * 2); g.stroke();
    });
    const trTex = k.canvasTexture(512, 512, (g) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const paths = [];
      const poly = (pts) => paths.push(pts);
      // stubs: stack base -> ring, three lines each
      for (const [u, v] of STACKS) {
        const dx = u - 256, dy = v - 256, l = Math.hypot(dx, dy), nx = dx / l, ny = dy / l;
        for (const o of [-7, 0, 7]) {
          const px = -ny * o, py = nx * o;
          poly([[u + px + nx * 10, v + py + ny * 10], [256 + nx * 243 + px, 256 + ny * 243 + py]]);
        }
      }
      // die bundles
      for (const B of [BUNDLE_L, BUNDLE_R]) for (const o of [-7, 0, 7]) {
        const sx = B === BUNDLE_L ? 1 : -1;
        poly(B.map(([u, v], i) => [u + (i >= 2 ? o * sx : o * 0.4 * sx), v + (i < 2 ? o : o * 0.4)]));
      }
      const strokeAll = (w, c) => {
        g.strokeStyle = c; g.lineWidth = w;
        for (const r of RING) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
        for (const p of paths) { g.beginPath(); p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
      };
      strokeAll(5.2, '#2a1c06');
      strokeAll(2.8, '#e2a93a');
      strokeAll(0.9, 'rgba(255,236,170,0.8)');
      // vias where the stubs meet the ring
      for (const [u, v] of STACKS) {
        const dx = u - 256, dy = v - 256, l = Math.hypot(dx, dy);
        for (const o of [-7, 0, 7]) {
          const x = 256 + dx / l * 236 - dy / l * o, y = 256 + dy / l * 236 + dx / l * o;
          g.fillStyle = '#2a1c06'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#f4c45a'; g.beginPath(); g.arc(x, y, 2.8, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2a1c06'; g.beginPath(); g.arc(x, y, 1.1, 0, Math.PI * 2); g.fill();
        }
      }
    });
    const ipMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { uSi: { value: siTex }, uTr: { value: trTex }, uP1: { value: 0 }, uP2: { value: 0 }, uOp: { value: 0 } },
      vertexShader: VS,
      fragmentShader: `
        uniform sampler2D uSi, uTr; uniform float uP1, uP2, uOp; varying vec2 vUv;
        void main() {
          float d = distance(vUv, vec2(0.5, ${(1 - DIE[1] / 512).toFixed(4)}));
          float a = smoothstep(uP1, uP1 - 0.06, d);
          vec3 col = texture2D(uSi, vUv).rgb;
          vec4 tr = texture2D(uTr, vUv);
          float et = smoothstep(uP2, uP2 - 0.02, d);
          float hot = smoothstep(0.07, 0.0, abs(d - uP2)) * (1.0 - smoothstep(0.9, 1.05, uP2));
          col = mix(col, tr.rgb, tr.a * et);
          col += tr.a * hot * vec3(1.0, 0.82, 0.45);
          gl_FragColor = vec4(col, a * uOp);
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false,
    }));
    const interposer = new THREE.Mesh(backdropDisc(), ipMat);
    interposer.position.z = ZI;
    interposer.scale.setScalar(k.depthScale(ZI));
    interposer.renderOrder = -18;
    root.add(interposer);

    // ── ② four HBM stacks: base logic die + four DRAM dies, built up layer by layer ──────────
    const stacks = STACKS.map(([u, v, turn], si) => {
      const g = new THREE.Group(), fit = new THREE.Group();
      g.add(fit);
      fit.rotation.set(-0.95, turn, 0);
      const layers = [];
      const base = new THREE.Mesh(new THREE.BoxGeometry(27, 27, 3), k.toon(0x2d3446));
      base.position.z = 1.5; k.ink(base, 1.2);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(29, 29, 0.8), k.toon(0x1a1e2a));
      pad.position.z = 0.4;
      fit.add(pad);
      layers.push(base);
      for (let i = 0; i < 4; i++) {
        const L = new THREE.Mesh(new THREE.BoxGeometry(22, 22, 2.3), k.toon(i % 2 ? 0xaab3c3 : 0xd3d9e3));
        L.userData.z = 3.6 + i * 2.9 + 1.15;
        L.position.z = L.userData.z;
        k.ink(L, 0.9);
        layers.push(L);
      }
      const top = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), k.toon(0xe2a93a));
      layers[4].add(top);
      top.position.set(0, 0, 1.17);
      layers.forEach(L => fit.add(L));
      base.userData.z = 1.5;
      g.position.copy(k.at(u, v, ZI + 2));
      root.add(g);
      return { g, fit, layers, pad, t0: 0.36 + si * 0.08 };
    });

    // ── ③ compute die at his feet, AMMA silkscreen on the lid ─────────────────────────────
    const die = new THREE.Group(), dieFit = new THREE.Group();
    die.add(dieFit);
    dieFit.rotation.x = -0.42;
    const pkg = new THREE.Mesh(new THREE.BoxGeometry(66, 30, 3.2), k.toon(0x1f5a3c));
    pkg.position.z = 1.6; k.ink(pkg, 1.4);
    const lidTex = k.canvasTexture(256, 112, (g, w, h) => {
      g.fillStyle = '#2c3346'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(160,175,210,0.18)'; g.lineWidth = 1.5;
      for (let x = 16; x < w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = '#e2a93a'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
      g.fillStyle = '#f2f5fb'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = "800 52px ui-monospace, Menlo, Consolas, monospace";
      g.fillText('AMMA', w / 2, h / 2 + 3);
      g.fillStyle = '#e2a93a'; g.beginPath(); g.arc(20, 20, 6, 0, Math.PI * 2); g.fill();
    });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(52, 23, 3), [
      k.toon(0x3a4157), k.toon(0x3a4157), k.toon(0x3a4157), k.toon(0x3a4157),
      k.toon(0xffffff, { map: lidTex }), k.toon(0x3a4157),
    ]);
    lid.position.z = 3.2 + 1.5; k.ink(lid, 1.2);
    const heatTex = k.canvasTexture(128, 64, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,190,90,1)'); gr.addColorStop(0.5, 'rgba(255,110,40,0.55)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    const heat = new THREE.Mesh(new THREE.PlaneGeometry(50, 22), new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    heat.position.z = 6.3;
    heat.renderOrder = 30;
    dieFit.add(pkg, lid, heat);
    const D_Z = 12;
    const clipAll = (obj) => obj.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => k.clip(m)));
    clipAll(die);                           // it rises in from below the rim
    const dieHome = k.at(DIE[0], DIE[1], D_Z);
    root.add(die);

    // ── ④ data packets (bright pills, inked) running along the traces, behind him ─────────
    const pktGeo = new THREE.CapsuleGeometry(1.25, 3.6, 3, 8);
    pktGeo.rotateZ(Math.PI / 2);
    const pktMat = new THREE.MeshBasicMaterial({ color: 0xc8fbff });
    const tailMat = new THREE.MeshBasicMaterial({ color: 0x3fd8f0, transparent: true, opacity: 0.8, depthWrite: false });
    const mkPkt = () => {
      const g = new THREE.Group();
      const head = new THREE.Mesh(pktGeo, pktMat);
      k.ink(head, 0.8);
      const tail = new THREE.Mesh(pktGeo, tailMat);
      tail.scale.set(1.9, 0.7, 0.7); tail.position.x = -4.2;
      g.add(tail, head);
      root.add(g);
      return g;
    };
    // ring packets: [lane radius, angular speed (rad/s, + = clockwise on screen), phase]
    const RINGP = [[243, 0.98, 0], [243, 0.98, Math.PI], [236, -0.98, 0.9], [236, -0.98, 0.9 + Math.PI], [229, 0.98, 2.2], [229, 0.98, 2.2 + Math.PI]];
    const ringPk = RINGP.map(mkPkt);
    const busPk = [mkPkt(), mkPkt()];
    const pathLen = (P) => { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; };
    const LEN_L = pathLen(BUNDLE_L);
    const along = (P, s, out) => {        // point + direction at arc length s
      let acc = 0;
      for (let i = 1; i < P.length; i++) {
        const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], l = Math.hypot(dx, dy);
        if (acc + l >= s || i === P.length - 1) { const f = clamp((s - acc) / l); out[0] = P[i - 1][0] + dx * f; out[1] = P[i - 1][1] + dy * f; out[2] = Math.atan2(-dy, dx); return out; }
        acc += l;
      }
      return out;
    };
    const tmp = [0, 0, 0];

    // ── ⑤ the Ω badge: a gold-rimmed coin stamped onto his chest ──────────────────────────
    const badge = new THREE.Group(), badgeFit = new THREE.Group();
    badge.add(badgeFit);
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.4, 2, 40), k.toon(0xe2a93a));
    coin.rotation.x = Math.PI / 2; k.ink(coin, 1.3);
    const faceTex = k.canvasTexture(128, 128, (g) => {
      g.fillStyle = '#16203a'; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e2a93a'; g.lineWidth = 4; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ffd76a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = "700 88px Georgia, 'Times New Roman', serif";
      g.fillText('Ω', 64, 70);
    });
    const face = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ map: faceTex }));
    face.position.z = 1.05;
    badgeFit.add(coin, face);
    const B_Z = 7;
    const badgeHome = k.at(286, 160, B_Z);
    root.add(badge);

    const A = [0, 0], B = [0, 0], C = [0, 0];
    const R = rng(9);
    const shimmer = [0, 1, 2].map(i => ({ x: -16 + i * 16, ph: R() * 6 }));

    return {
      update(t, e) {
        const ph = beatPh(t);
        // interposer: silicon spreads out of the die, then the traces etch in behind it
        ipMat.uniforms.uP1.value = 1.05 * ease.out(env(t, 0.02, 0.4));
        ipMat.uniforms.uP2.value = 1.08 * env(t, 0.2, 0.72);
        ipMat.uniforms.uOp.value = exitF(e, 1);
        const dim = 0.7 * ease.out(env(t, 0.02, 0.4)) * exitF(e, 1);
        k.layers.plate.material.color.setRGB(1 - dim, 1 - dim, 1 - dim * 0.8);

        // stacks: base pops, DRAM dies drop on one by one
        stacks.forEach((S, si) => {
          const out = exitF(e, 0.3 + si * 0.05);
          const any = presence(t, e, S.t0, 0.2, ease.outBack, 0.3);
          S.g.visible = any > 0.004;
          S.g.scale.setScalar(Math.max(0.004, lerp(0.6, 1, Math.min(1, any)) * out * 1.12));
          S.layers.forEach((L, li) => {
            const a = env(t, S.t0 + li * 0.07, S.t0 + li * 0.07 + 0.16);
            k.show(L, a > 0 ? 1 : 0);
            L.position.z = L.userData.z + (1 - ease.outBounce(a)) * 16;
          });
          S.fit.rotation.z = Math.sin((ph >= 0 ? ph : 0) / BEAT * Math.PI * 2 + si) * 0.02;
        });

        // die: rises from the bottom edge
        const di = presence(t, e, 0.18, 0.4, ease.outBack, 0.2);
        k.show(die, di);
        die.position.set(dieHome.x, dieHome.y - (1 - ease.out(env(t, 0.18, 0.5))) * 30 - ease.in(clamp(e * 1.6 - 0.1)) * 30, dieHome.z);
        const hp = ph >= 0 ? Math.sin(clamp(ph / 0.8) * Math.PI) : 0;
        heat.material.opacity = 0.75 * hp * exitF(e, 0);
        heat.visible = heat.material.opacity > 0.003;

        // packets: fade in once the traces are etched
        const pk = presence(t, e, 0.62, 0.3, ease.out, 0) ;
        const tt = Math.max(0, t - 0.62);
        ringPk.forEach((p, i) => {
          const [r, w, p0] = RINGP[i];
          const a = p0 + w * tt;                     // screen angle, clockwise positive (y down)
          atInto(p.position, 256 + Math.cos(a) * r, 256 + Math.sin(a) * r, ZI + 1.5);
          p.rotation.z = -a + (w > 0 ? -Math.PI / 2 : Math.PI / 2);
          k.show(p, pk);
        });
        // bus packets: stack -> die on the left, die -> stack on the right, once a beat each
        // (the first runs finish by T0, where the loop windows take over)
        busPk.forEach((p, i) => {
          const f = ph >= 0 ? env(ph, 0.1 + i * 1.5, 0.95 + i * 1.5) : (t > 0.7 ? env(t, 0.7 + i * 0.15, 1.15 + i * 0.15) : 0);
          const P = i === 0 ? BUNDLE_L : BUNDLE_R;
          const s = i === 0 ? (1 - f) * LEN_L : f * LEN_L;    // left: from the stack into the die; right: out of the die
          along(P, s, tmp);
          atInto(p.position, tmp[0], tmp[1], ZI + 1.5);
          p.rotation.z = tmp[2] + (i === 0 ? Math.PI : 0);
          k.show(p, f > 0 && f < 1 ? pk : 0);
        });

        // Ω badge stamps onto his chest: comes in big, squashes on contact, settles
        const bs = env(t, 0.98, 1.24);
        const bo = exitF(e, 0.1);
        let sx = 1, sy = 1, z = B_Z;
        if (bs < 0.45) { const f = ease.in(bs / 0.45); sx = sy = lerp(1.9, 1, f); z = lerp(B_Z + 50, B_Z, f); }
        else { const f = (bs - 0.45) / 0.55, d = Math.sin(f * Math.PI * 2.2) * Math.pow(1 - f, 2) * 0.22; sx = 1 + d; sy = 1 - d; }
        badge.visible = bs > 0 && bo > 0.004;
        badge.scale.set(sx * bo, sy * bo, bo);
        atInto(badge.position, 286, 160, z);
        badgeFit.rotation.set(0.12, -0.2 + (1 - ease.out(bs)) * 1.2, -0.12);
      },

      draw2d(q, t, e) {
        const ph = beatPh(t);
        // stamp shock ring round the badge
        const sr = env(t, 1.08, 1.34);
        if (sr > 0 && sr < 1 && e < 0.5) {
          toScr(badge.position, A);
          q.noFill(); q.strokeWeight(2 * (1 - sr)); q.stroke(255, 215, 106, 230 * (1 - sr));
          q.circle(A[0], A[1], 22 + sr * 22);
          q.strokeWeight(1.4); q.stroke(255, 255, 255, 200 * (1 - sr));
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2 + 0.2, r0 = 13 + sr * 12, r1 = r0 + 5 * (1 - sr);
            q.line(A[0] + Math.cos(a) * r0, A[1] + Math.sin(a) * r0, A[0] + Math.cos(a) * r1, A[1] + Math.sin(a) * r1);
          }
        }
        // heat shimmer over the die (loop)
        if (ph >= 0 && ph < 0.9 && e < 0.6) {
          toScr(die.position, B);
          const a = Math.sin(clamp(ph / 0.9) * Math.PI) * (1 - e / 0.6);
          if (a > 0.01) {
            q.noFill(); q.strokeWeight(1.5);
            for (const s of shimmer) {
              const rise = ph * 14;
              q.stroke(255, 170, 90, 210 * a);
              q.beginShape();
              for (let j = 0; j <= 8; j++) {
                const y = B[1] - 16 - rise - j * 2.2;
                q.vertex(B[0] + s.x + Math.sin(j * 0.9 + ph * 9 + s.ph) * 2.2, y);
              }
              q.endShape();
            }
          }
        }
      },

      dispose() { siTex.dispose(); trTex.dispose(); },
    };
  },
};
