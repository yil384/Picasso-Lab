/* Chenyang — 美国队长 Captain America
   Click: the patio behind him cools to a deep navy with faint flag stripes (he keeps a crisp
   sticker edge, so he stays readable); the vibranium shield is thrown in from off-frame,
   spinning, skims over his head, ricochets off the rim and lands in the lower right — CLANG!,
   with a red-white-blue ripple; white helmet wings grow from the sides of his head; a white
   star on a blue roundel pops onto his chest.
   Loop (3.2 s): a glint sweeps across the shield, then the wings give a small flutter.
   Photo landmarks (512 px): head 94-189 x 92-207 (temples v 136) · eyes y 153 · chin 142,207 ·
   T-shirt 108-173 from v 232 (chest 140,288) · stone wall 290-500 x 290-480. */
import { THREE, presence, env, ease, clamp, lerp } from './kit.js';

const RED = 0xc62a30, WHITE = 0xf4f2ec, BLUE = 0x1f3f94, STEEL = 0xb9c1cc;
const INK = '#141726';
const BLACK = "'Arial Black', 'Arial Bold', Impact, sans-serif";
const T_RICO = 0.42, T_LAND = 0.7;
const T_LOOP = 1.6, BEAT = 3.2;
const bump = (x, w) => (x <= 0 || x >= w ? 0 : Math.sin(Math.PI * x / w));

function starShape(ro, ri) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro, a = Math.PI / 2 + i * Math.PI / 5;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  return s;
}

export default {
  title: 'Captain America',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const cutTex = k.layers.person.material.map;

    /* ① backdrop: navy tint on the patio + faint flag stripes (between the plate and him) ---- */
    const stripes = k.canvasTexture(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      for (let i = 0; i < 13; i++) {
        g.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(214,40,52,0.1)';
        g.fillRect(0, i * 256 / 13, 256, 256 / 13);
      }
      // a few small stars in the upper left canton
      g.fillStyle = 'rgba(255,255,255,0.16)';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const x = 26 + c * 22 + (r % 2) * 11, y = 22 + r * 20;
        g.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? 2.2 : 5.4, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.fill();
      }
    });
    const zS = k.Z_BACK + 2;
    const set = new THREE.Mesh(new THREE.CircleGeometry(k.R, 128), new THREE.MeshBasicMaterial({ map: stripes, transparent: true, opacity: 0, depthWrite: false }));
    set.position.z = zS;
    set.scale.setScalar(k.depthScale(zS));
    set.renderOrder = -18;
    root.add(set);
    const tint = new THREE.Color();

    /* ② sticker edge round him: white line with an ink rim, from the cut-out's alpha -------- */
    const edgeMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: cutTex }, uIn: { value: 1.5 / 200 }, uOut: { value: 2.7 / 200 }, uOpacity: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float uIn, uOut, uOpacity; varying vec2 vUv;
        void main() {
          float a1 = 0.0, a2 = 0.0;
          for (int i = 0; i < 12; i++) {
            float an = float(i) * 0.5235988;
            vec2 d = vec2(cos(an), sin(an));
            a1 = max(a1, texture2D(map, vUv + d * uIn).a);
            a2 = max(a2, texture2D(map, vUv + d * uOut).a);
          }
          float w = smoothstep(0.25, 0.6, a1);
          float o = smoothstep(0.25, 0.6, a2);
          gl_FragColor = vec4(mix(vec3(0.08, 0.09, 0.15), vec3(1.0), w), o * uOpacity);
        }`,
      transparent: true, depthWrite: false,
    });
    const edge = new THREE.Mesh(new THREE.CircleGeometry(k.R, 160), edgeMat);
    edge.position.z = -0.4;
    edge.scale.setScalar(k.depthScale(-0.4));
    edge.renderOrder = 9;
    root.add(edge);

    /* ③ the shield: a slightly convex dish, painted rings, a raised star, a glint ---------- */
    const prof = [];
    for (let i = 0; i <= 12; i++) { const r = i / 12; prof.push(new THREE.Vector2(r, 0.2 * (1 - r * r))); }
    prof.push(new THREE.Vector2(1.03, -0.02), new THREE.Vector2(1.045, -0.07), new THREE.Vector2(1.01, -0.11), new THREE.Vector2(0.95, -0.1));
    const dishGeo = new THREE.LatheGeometry(prof, 72);
    {
      const p = dishGeo.attributes.position, uv = dishGeo.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / 2.1, 0.5 - p.getZ(i) / 2.1);
    }
    const face = k.canvasTexture(512, 512, (g) => {
      const c = 256, s = 256 / 1.05;
      const ring = (r, col) => { g.beginPath(); g.arc(c, c, r * s, 0, Math.PI * 2); g.fillStyle = col; g.fill(); };
      g.fillStyle = '#9a1e24'; g.fillRect(0, 0, 512, 512);
      ring(1.05, '#c62a30'); ring(0.8, '#f4f2ec'); ring(0.61, '#c62a30'); ring(0.42, '#1f3f94');
      g.strokeStyle = INK; g.lineWidth = 3;
      [0.8, 0.61, 0.42].forEach(r => { g.beginPath(); g.arc(c, c, r * s, 0, Math.PI * 2); g.stroke(); });
      g.lineWidth = 5; g.beginPath(); g.arc(c, c, 1.0 * s, 0, Math.PI * 2); g.stroke();
    });
    const shield = new THREE.Group();
    const dish = new THREE.Mesh(dishGeo, k.toon(0xffffff, { map: face, side: THREE.DoubleSide }));
    dish.rotation.x = Math.PI / 2;
    k.ink(dish, 1.5);
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.36, 0.145), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }), k.toon(WHITE));
    star.position.z = 0.16;
    k.ink(star, 1.1);
    // comic shine: a white diagonal band that sweeps across the dish
    const glintTex = k.canvasTexture(256, 256, (g) => {
      g.clearRect(0, 0, 256, 256);
      g.save(); g.translate(128, 128); g.rotate(-0.6);
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(-20, -200, 22, 400);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(10, -200, 7, 400);
      g.restore();
    });
    glintTex.wrapS = glintTex.wrapT = THREE.ClampToEdgeWrapping;
    const glintMat = new THREE.MeshBasicMaterial({ map: glintTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, opacity: 0 });
    const glint = new THREE.Mesh(dishGeo, glintMat);
    glint.rotation.x = Math.PI / 2;
    glint.scale.set(1, 1.04, 1);
    glint.renderOrder = 3;
    shield.add(dish, star, glint);
    root.add(shield);
    const SH_R = 30;
    const P0 = k.at(-150, 20, 34), P1 = k.at(404, 156, 34), P2 = k.at(372, 386, 26);
    const pos = new THREE.Vector3();

    /* ④ helmet wings: three white feathers each, behind the sides of his head ------------- */
    function feather(L, w) {
      const s = new THREE.Shape();
      s.moveTo(0, -w * 0.32);
      s.quadraticCurveTo(L * 0.55, -w * 0.62, L, w * 0.12);
      s.quadraticCurveTo(L * 0.62, w * 0.74, 0, w * 0.36);
      s.closePath();
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.8, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 2, curveSegments: 10 });
      geo.translate(0, 0, -0.4);
      const m = new THREE.Mesh(geo, k.toon(WHITE));
      k.ink(m, 1.1);
      return m;
    }
    const FEATH = [{ L: 15, w: 5.4, a: -0.05 }, { L: 19, w: 5.8, a: 0.3 }, { L: 21, w: 6.2, a: 0.66 }];
    function wing(sx, home) {
      const g = new THREE.Group();
      const fs = FEATH.map((f, i) => {
        const piv = new THREE.Group();
        piv.position.set(i * 0.8, i * 1.4, -i * 0.3);
        piv.rotation.z = f.a;
        piv.add(feather(f.L, f.w));
        g.add(piv);
        return { piv, a: f.a };
      });
      g.position.copy(home);
      g.scale.x = sx;
      root.add(g);
      return { g, fs, sx };
    }
    // his right (viewer left) and his left temple; the roots sit just inside the hair so they grow from behind it
    const wingL = wing(-1, k.at(103, 144, -3));
    const wingR = wing(1, k.at(181, 144, -3));

    /* ⑤ chest emblem: a blue roundel with a white star -------------------------------- */
    const emblem = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.16, 48), k.toon(BLUE));
    disc.rotation.x = Math.PI / 2;
    k.ink(disc, 1.2);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.05, 6, 48), k.toon(WHITE));
    rim.position.z = 0.09;
    const eStar = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.66, 0.26), { depth: 0.08, bevelEnabled: false }), k.toon(WHITE));
    eStar.position.z = 0.08;
    k.ink(eStar, 0.9);
    emblem.add(disc, rim, eStar);
    const EMB = k.at(141, 290, 5);
    emblem.position.copy(EMB);
    root.add(emblem);

    const tmp = new THREE.Vector3();
    const scr = [0, 0];
    const toScr = (v) => { tmp.copy(v).applyMatrix4(root.matrixWorld).project(k.camera); scr[0] = (tmp.x + 1) / 2 * k.W; scr[1] = (1 - tmp.y) / 2 * k.H; return scr; };
    const loopT = t => (t < T_LOOP ? -1 : (t - T_LOOP) % BEAT);
    const trail = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

    function shieldAt(t, out) {
      if (t < T_RICO) {
        const u = env(t, 0.06, T_RICO);
        out.lerpVectors(P0, P1, u);
        out.y += Math.sin(Math.PI * u) * 18;
      } else {
        const u = ease.out(env(t, T_RICO, T_LAND));
        out.lerpVectors(P1, P2, u);
        out.x += Math.sin(Math.PI * u) * 10;
      }
      return out;
    }

    return {
      update(t, e) {
        /* backdrop */
        const b = presence(t, e, 0.05, 0.4, ease.out, 0);
        tint.setRGB(1 - 0.955 * b, 1 - 0.915 * b, 1 - 0.68 * b);   // linear multiply: the patio sinks to deep navy
        k.layers.plate.material.color.copy(tint);
        k.layers.photo.material.color.copy(tint);
        set.material.opacity = b;
        edgeMat.uniforms.uOpacity.value = b;

        /* shield: thrown in, ricochet, landing, settle */
        const inFlight = env(t, 0.06, 0.12);
        const out = ease.in(clamp(e * 1.6 - 0.1));
        k.show(shield, inFlight * (1 - out * 0.3), SH_R);
        shield.visible = inFlight > 0 && out < 1;
        shieldAt(t, pos);
        const land = env(t, T_LAND, T_LAND + 0.45);
        const wob = land > 0 ? Math.sin(land * Math.PI * 4) * (1 - land) : 0;
        pos.y += land > 0 ? 2.5 * Math.abs(Math.sin(land * Math.PI * 2)) * (1 - land) : 0;
        pos.x += out * 150; pos.y += out * 20;
        shield.position.copy(pos);
        const spin = t < T_LAND ? -t * 26 : -T_LAND * 26 - (1 - Math.pow(1 - clamp((t - T_LAND) / 0.3), 2)) * 1.2;
        const settle = ease.out(env(t, T_RICO, T_LAND));
        shield.rotation.set(lerp(0.55, 0.16, settle) + 0.18 * wob, lerp(0.35, -0.42, settle) + 0.12 * wob, spin);

        // loop glint: sweeps across during the first ~0.6 s of each beat
        const lt = loopT(t);
        const gs = lt < 0 ? (t > T_LAND ? env(t, T_LAND + 0.05, T_LAND + 0.6) : 0) : env(lt, 0, 0.6);
        glintMat.opacity = gs > 0 && gs < 1 ? 1 - e : 0;
        glintTex.offset.set(lerp(-0.75, 0.75, gs), 0);

        /* wings: feathers grow one by one, then flutter once per beat */
        const flutter = lt < 0 ? 0 : bump(lt - 1.5, 0.5);
        [wingL, wingR].forEach((w, wi) => {
          w.fs.forEach((f, i) => {
            const a = presence(t, e, 0.52 + i * 0.07 + wi * 0.03, 0.34, ease.outBack, 0.3 + i * 0.1);
            k.show(f.piv, a);
            f.piv.rotation.z = f.a - (1 - Math.min(a, 1)) * 0.6 + 0.12 * flutter * Math.sin(lt * 18 + i);
          });
          w.g.rotation.y = w.sx * 0.3;
          w.g.visible = true;
        });

        /* chest emblem: pops and spins onto the chest */
        const em = presence(t, e, 0.82, 0.36, ease.outBack, 0.5);
        k.show(emblem, em, 9.6);
        emblem.rotation.set(0.12, (1 - ease.out(env(t, 0.82, 1.15))) * Math.PI * 2, 0);
      },

      // q5: speed lines on the throw, ricochet spark, CLANG!, the red-white-blue ripple
      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0 || t < 0.06) return;
        const c = q.drawingContext || q.ctx;
        const [cx, cy] = k.screenAt(256, 256, 0);

        // speed lines trailing the shield in flight
        if (t < T_LAND + 0.04) {
          const [sx, sy] = toScr(shield.position);
          shieldAt(Math.max(0.06, t - 0.07), trail[0]);
          const [tx, ty] = toScr(trail[0]);
          const dx = sx - tx, dy = sy - ty, l = Math.hypot(dx, dy);
          if (l > 2) {
            const nx = -dy / l, ny = dx / l;
            c.save(); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineCap = 'round'; c.globalAlpha = fade;
            [-18, -6, 8, 18].forEach((o, i) => {
              c.lineWidth = i % 2 ? 1.2 : 2;
              const back = 28 + (i % 2) * 12;
              c.beginPath();
              c.moveTo(sx - dx / l * 20 + nx * o, sy - dy / l * 20 + ny * o);
              c.lineTo(sx - dx / l * (20 + back) + nx * o, sy - dy / l * (20 + back) + ny * o);
              c.stroke();
            });
            c.restore();
          }
        }
        // ricochet: a spark off the rim
        const rk = env(t, T_RICO - 0.02, T_RICO + 0.16);
        if (rk > 0 && rk < 1) {
          const [rx, ry] = toScr(P1);
          const px = rx + 25, py = ry - 17;
          c.save(); c.globalAlpha = fade * (1 - rk); c.strokeStyle = '#ffffff'; c.lineCap = 'round'; c.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const an = -Math.PI * 0.1 + i * 0.5, r0 = 3 + 9 * rk, r1 = r0 + 7;
            c.beginPath(); c.moveTo(px + Math.cos(an) * r0, py + Math.sin(an) * r0); c.lineTo(px + Math.cos(an) * r1, py + Math.sin(an) * r1); c.stroke();
          }
          c.restore();
        }
        // the ripple: red, white, blue rings from the landing, clipped to the circle
        const rp = env(t, T_LAND, T_LAND + 0.6);
        const [lx, ly] = toScr(P2);
        if (rp > 0 && rp < 1) {
          c.save();
          c.beginPath(); c.arc(cx, cy, k.R, 0, Math.PI * 2); c.clip();
          c.globalAlpha = fade * (1 - rp);
          ['#c62a30', '#f4f2ec', '#1f3f94'].forEach((col, i) => {
            const r = SH_R + 4 + (150 * ease.out(rp)) * (1 - i * 0.18);
            c.lineWidth = 4.5; c.strokeStyle = INK;
            c.beginPath(); c.arc(lx, ly, r, 0, Math.PI * 2); c.stroke();
            c.lineWidth = 2.8; c.strokeStyle = col;
            c.beginPath(); c.arc(lx, ly, r, 0, Math.PI * 2); c.stroke();
          });
          c.restore();
        }
        // CLANG!
        const lp = env(t, T_LAND, T_LAND + 0.1);
        const lo = 1 - env(t, T_LAND + 0.72, T_LAND + 0.92);
        if (lp > 0 && lo > 0) {
          const [ax, ay] = k.screenAt(398, 278, 0);
          c.save();
          c.translate(ax, ay); c.rotate(-0.14);
          const sc = lerp(1.7, 1, ease.outBack(lp)) * (0.85 + 0.15 * lo);
          c.scale(sc, sc);
          c.globalAlpha = fade * lo;
          c.font = `italic 900 15px ${BLACK}`;
          c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
          c.fillStyle = '#c62a30'; c.fillText('CLANG!', 1.8, 2);
          c.lineWidth = 4.5; c.strokeStyle = INK; c.strokeText('CLANG!', 0, 0);
          c.fillStyle = '#ffffff'; c.fillText('CLANG!', 0, 0);
          c.restore();
          // impact ticks round the shield
          const il = env(t, T_LAND, T_LAND + 0.18);
          if (il < 1) {
            c.save(); c.strokeStyle = INK; c.lineCap = 'round'; c.lineWidth = 1.8; c.globalAlpha = fade;
            for (let i = 0; i < 6; i++) {
              const an = -Math.PI * 0.95 + i * 0.36, r0 = SH_R + 3 + 8 * il;
              c.beginPath(); c.moveTo(lx + Math.cos(an) * r0, ly + Math.sin(an) * r0);
              c.lineTo(lx + Math.cos(an) * (r0 + 6), ly + Math.sin(an) * (r0 + 6)); c.stroke();
            }
            c.restore();
          }
        }
      },
    };
  },
};
