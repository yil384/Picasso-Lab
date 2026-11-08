/* Jiarui — statistics and economics (Toronto), now machine learning systems
   Click: the avatar becomes a Toronto snow globe: glass glints round the rim, the café cools to a winter night,
   a knit toque in the colours of her Fair Isle cardigan (blue, cream band, red diamonds, red ribbed cuff, cream
   pompom) drops onto her head with a squash; the CN Tower rises behind her on the right, its beacon blinking;
   snow starts. The flakes in front of her sway left and right on the way down, a coin flip per sway, so they land
   in a row of snow columns at the bottom that grows into a histogram of a normal distribution; a red bell curve
   draws itself over the columns, a mu marks the peak, and N(mu, sigma^2) stamps in.
   Loop (3.6 s): the snow keeps falling and landing (a puff on the column it lands on), the beacon blinks once per
   beat, the pompom bobs.
   Photo landmarks (512 px): hair top v 67 (u 165-345 below v 100) · eyes 237,163 / 293,163 · chin 267,247 ·
   shoulders 100,300 / 373,293 · white tee u 213-287 below v 300 · window and neon sign u 360-512, v 0-260 ·
   heater u 7-87, v 77-127. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BEAT = 3.6;
const ZB = -26;                               // back snow and the tower (behind her)
const ZC = 8;                                 // the snow columns (in front of her)
const NB = 11, B0 = 96, BW = 29.1, BASE = 530, HMAX = 128, SIG = 1.9;   // columns: count, left edge, width, base v, peak height (photo px)
const HAT = [262, 112];                       // toque: centre of the brim (photo px)
const TOWER = 420;                            // CN Tower: u of its axis
const SPAWN = 0.2, FALL = 2.3, T1 = 0.35;     // a front flake every 0.2 s, 2.3 s from the top to its column
const NF = Math.ceil(FALL / SPAWN) + 1;

const gauss = (i) => Math.exp(-((i - (NB - 1) / 2) ** 2) / (2 * SIG * SIG));

export default {
  title: 'Toronto snow globe: the normal distribution',
  exit: 0.45,
  still: 2.8,
  async build(k) {
    const { root } = k;
    const V = new THREE.Vector3();
    const toScr = (v3, out) => { V.copy(v3).applyMatrix4(root.matrixWorld).project(k.camera); out[0] = (V.x + 1) / 2 * k.W; out[1] = (1 - V.y) / 2 * k.H; return out; };
    const atInto = (o, u, v, z) => { const s = k.depthScale(z); return o.set((u / 512 - 0.5) * k.D * s, (0.5 - v / 512) * k.D * s, z); };
    const exitF = (e, order) => 1 - ease.in(clamp(e * 1.6 - order * 0.6));
    const PX = k.D / 512;                       // logical px per photo px
    k.clip(k.layers.plate.material);
    k.clip(k.layers.photo.material);
    const clipAll = (obj) => obj.traverse(o => (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => k.clip(m)));
    const fill = (t) => ease.out(env(t, 0.55, 1.45));          // how full the columns are

    // ── ① the CN Tower, behind her on the right: tapered shaft, main pod, SkyPod, antenna, red beacon ──────
    const tower = new THREE.Group(), towerFit = new THREE.Group();
    tower.add(towerFit);
    const vBase = 470, vTop = 72, Hp = vBase - vTop;           // photo px; the circle hides the foot
    const yOf = (v) => (vBase - v) * PX;                        // height above the foot, logical px
    const concrete = k.toon(0x9ea4b4), dark = k.toon(0x2c3246, { emissive: 0x4a3a10 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 7.6, yOf(vBase - 0.81 * Hp), 6), concrete);
    shaft.position.y = yOf(vBase - 0.81 * Hp) / 2;
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 7.8, 6.6, 24), concrete);
    pod.position.y = yOf(vBase - 0.62 * Hp);
    const podBand = new THREE.Mesh(new THREE.CylinderGeometry(10.8, 10.6, 2.2, 24), dark);
    podBand.position.y = pod.position.y + 0.6;
    const podCap = new THREE.Mesh(new THREE.SphereGeometry(8.4, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), concrete);
    podCap.scale.y = 0.38; podCap.position.y = pod.position.y + 3.3;
    const sky = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 3.6, 4.0, 16), concrete);
    sky.position.y = yOf(vBase - 0.81 * Hp) + 1.2;
    const antH = yOf(vTop) - sky.position.y - 1.7;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.5, antH, 6), k.toon(0xd6d9e2));
    ant.position.y = sky.position.y + 1.7 + antH / 2;
    [shaft, pod, podBand, podCap, sky, ant].forEach(m => { k.ink(m, 1.1); towerFit.add(m); });
    const beacon = k.glowSprite('rgba(255,70,60,1)', 9, 0);
    beacon.position.y = yOf(vTop) + 0.4;
    towerFit.add(beacon);
    clipAll(tower);
    const towerHome = k.at(TOWER, vBase, ZB);
    towerFit.scale.setScalar(k.depthScale(ZB));
    root.add(tower);

    // ── ② snow behind her: small flakes falling straight, wrapping round ──────────────────────────────
    const NBK = 46, R0 = rng(3);
    const back = Array.from({ length: NBK }, () => ({ u: R0() * 512, ph: R0(), sp: 0.16 + R0() * 0.1, r: 0.7 + R0() * 0.8, sw: R0() * 6 }));
    const backMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 10),
      new THREE.MeshBasicMaterial({ color: 0xf2f6ff, transparent: true, opacity: 0, depthWrite: false }), NBK);
    backMesh.renderOrder = -15;
    k.clip(backMesh.material);
    root.add(backMesh);
    const M4 = new THREE.Matrix4(), P3 = new THREE.Vector3(), Q = new THREE.Quaternion(), S3 = new THREE.Vector3();

    // ── ③ the snow columns: a histogram whose tops follow a bell curve, and the red curve over them ──────
    const cols = [];
    const snowMat = k.toon(0xf3f7ff, { emissive: 0x1a2236 });
    for (let i = 0; i < NB; i++) {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(BW * PX - 1.2, 1, 9).translate(0, 0.5, 0), snowMat);   // grows up from its base
      k.ink(box, 1.1);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), snowMat);
      cap.scale.set((BW * PX) / 2 - 0.2, 1.8, 4.6);
      k.ink(cap, 1.1);
      g.add(box, cap);
      g.position.copy(k.at(B0 + (i + 0.5) * BW, BASE, ZC));
      clipAll(g);
      root.add(g);
      cols.push({ g, box, cap, h: HMAX * gauss(i) });
    }
    const colTop = (i, t) => BASE - (cols[i].h + 14) * fill(t);   // photo v of a column's top (14 = under the circle)
    const pts = [];
    for (let j = 0; j <= 48; j++) {
      const x = j / 48 * (NB - 1 + 1.6) - 0.8, u = B0 + (x + 0.5) * BW;
      pts.push(k.at(u, BASE - HMAX * Math.exp(-((x - (NB - 1) / 2) ** 2) / (2 * SIG * SIG)) - 14 - 7, ZC + 6));
    }
    const curve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 1.25, 8, false), k.toon(0xd8363f, { emissive: 0x3a0608 }));
    k.ink(curve, 1.0);
    clipAll(curve);
    root.add(curve);
    const curveN = curve.geometry.index.count;

    // ── ④ the toque: knit dome in her cardigan's colours, ribbed red cuff, cream pompom ──────────────────
    const knit = k.canvasTexture(512, 256, (g) => {
      g.fillStyle = '#2f7fd6'; g.fillRect(0, 0, 512, 256);
      g.fillStyle = '#efe6d2'; g.fillRect(0, 150, 512, 76);              // the cream band near the brim
      g.fillStyle = '#a8283a';
      for (let x = 0; x < 512; x += 32) {                                // red diamonds
        g.beginPath(); g.moveTo(x + 16, 158); g.lineTo(x + 30, 188); g.lineTo(x + 16, 218); g.lineTo(x + 2, 188); g.closePath(); g.fill();
      }
      g.fillStyle = '#2f7fd6';
      for (let x = 0; x < 512; x += 32) { g.fillRect(x + 13, 185, 6, 6); }  // blue dots in the diamonds
      g.fillStyle = '#efe6d2';
      for (let x = 8; x < 512; x += 32) for (let y = 30; y < 140; y += 36) g.fillRect(x + ((y / 36) % 2) * 16, y, 5, 5);   // snow dots
      g.strokeStyle = 'rgba(10,30,70,0.18)'; g.lineWidth = 2;            // knit stitches (V rows)
      for (let y = 6; y < 256; y += 10) for (let x = 0; x < 512; x += 10) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y + 5); g.lineTo(x + 10, y); g.stroke(); }
    });
    const rib = k.canvasTexture(256, 32, (g) => {
      g.fillStyle = '#b3303f'; g.fillRect(0, 0, 256, 32);
      g.fillStyle = '#7e1b2a';
      for (let x = 0; x < 256; x += 8) g.fillRect(x, 0, 3, 32);
    });
    rib.wrapS = THREE.RepeatWrapping; rib.repeat.set(5, 1);
    const hat = new THREE.Group(), hatFit = new THREE.Group();
    hat.add(hatFit);
    const RH = 29;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(RH, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), k.toon(0xffffff, { map: knit }));
    dome.scale.set(1, 0.74, 0.8);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(RH * 1.05, RH * 1.08, 9, 40), k.toon(0xffffff, { map: rib }));
    cuff.scale.z = 0.8;
    cuff.position.y = -3.6;
    const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(5.6, 2), k.toon(0xf4eee0));
    pom.position.y = RH * 0.74 + 4.4;
    [dome, cuff, pom].forEach(m => { k.ink(m, 1.3); hatFit.add(m); });
    hatFit.rotation.set(0.12, 0, -0.04);
    clipAll(hat);
    const hatHome = k.at(HAT[0], HAT[1], 18);
    root.add(hat);

    // front flakes: each lands in the column of its coin flips (10 flips: a binomial, so a bell curve)
    const R1 = rng(17);
    const flakes = Array.from({ length: 64 }, () => {
      let b = 0;
      const flips = [];
      for (let j = 0; j < NB - 1; j++) { const f = R1() < 0.5 ? 1 : 0; b += f; flips.push(f); }
      const side = R1() < 0.5;
      return { b, flips, u0: side ? 70 + R1() * 112 : 344 + R1() * 100, r: 2.1 + R1() * 1.2 };
    });
    // where flake n is at fraction f of its fall (photo u, v), from its start towards its column, swaying once per flip
    const flakeAt = (fl, f, out) => {
      const land = B0 + (fl.b + 0.5) * BW;
      let sway = 0;
      const s = f * fl.flips.length, j = Math.min(fl.flips.length - 1, Math.floor(s));
      sway = (fl.flips[j] ? 1 : -1) * Math.sin((s - j) * Math.PI) * 9;     // a lean right or left per flip
      out[0] = lerp(fl.u0, land, ease.in(f)) + sway * (0.4 + 0.6 * f);   // beside her face first, inwards near the bottom
      out[1] = lerp(-12, colTop(fl.b, 99) - 3, f);
      return out;
    };
    const A = [0, 0], B = [0, 0], F = [0, 0];
    const flakeShape = (q, x, y, r, a) => {
      q.stroke(22, 21, 26, 210 * a); q.strokeWeight(1.1); q.fill(250, 252, 255, 255 * a);
      q.circle(x, y, 2 * r);
      q.noStroke(); q.fill(190, 210, 240, 200 * a); q.circle(x + r * 0.25, y + r * 0.3, r * 0.9);
    };

    return {
      update(t, e) {
        // winter night outside: the café behind her cools and dims, she stays as she is
        const night = 0.78 * ease.out(env(t, 0.05, 0.6)) * exitF(e, 1);
        k.layers.plate.material.color.setRGB(1 - night * 0.78, 1 - night * 0.62, 1 - night * 0.22);

        // the toque drops onto her head, squashes, settles; the pompom bobs once a beat
        const hp = presence(t, e, 0.05, 0.4, ease.out, 0);
        const land = env(t, 0.42, 0.75), sq = land > 0 && land < 1 ? Math.sin(land * Math.PI) * (1 - land) : 0;
        hat.visible = hp > 0.004;
        hat.position.set(hatHome.x, hatHome.y + (1 - hp) * 70, hatHome.z);
        hatFit.scale.set(1 + 0.16 * sq, 1 - 0.2 * sq, 1 + 0.16 * sq).multiplyScalar(Math.max(0.004, 1 - ease.in(clamp(e * 1.6 - 0.3))));
        const bt = (t - 1.2) % BEAT, bob = t > 1.2 && bt < 0.5 ? Math.sin(bt / 0.5 * Math.PI * 2) * (1 - bt / 0.5) : 0;
        pom.position.y = RH * 0.74 + 4.4 + bob * 1.6;
        pom.position.x = bob * 0.9;

        // the CN Tower rises from below, behind her; the beacon blinks once a beat
        const tp = presence(t, e, 0.15, 0.7, ease.outBack, 0.6);
        tower.visible = tp > 0.004;
        tower.position.set(towerHome.x, towerHome.y - (1 - tp) * 130, towerHome.z);
        const bl = ((t - 1.0) % BEAT + BEAT) % BEAT;
        beacon.material.opacity = t > 1.0 ? (bl < 0.25 || (bl > 0.45 && bl < 0.7) ? 1 : 0.15) * tp : 0;

        // snow behind her
        const bs = ease.out(env(t, 0.2, 0.7)) * exitF(e, 0.4);
        backMesh.material.opacity = 0.9 * bs;
        back.forEach((f, i) => {
          const y = ((f.ph + t * f.sp) % 1) * 560 - 24;
          const u = f.u + Math.sin(t * 1.3 + f.sw) * 5;
          P3.copy(k.at(u, y, ZB + 0.5));
          S3.setScalar(f.r * Math.max(0.001, bs));
          M4.compose(P3, Q, S3);
          backMesh.setMatrixAt(i, M4);
        });
        backMesh.instanceMatrix.needsUpdate = true;

        // the columns fill up as the snow lands, the curve draws on over them
        cols.forEach((c, i) => {
          const out = exitF(e, 0.1 + Math.abs(i - 5) * 0.04);
          const h = (c.h + 14) * fill(t) * out * PX;
          const s = k.depthScale(ZC);
          c.g.visible = h > 0.4;
          c.box.scale.y = Math.max(0.01, h * s);
          c.cap.position.y = h * s;
        });
        const cd = ease.inOut(env(t, 1.05, 1.5)) * exitF(e, 0);
        curve.visible = cd > 0.01;
        curve.geometry.setDrawRange(0, Math.floor(curveN * cd / 3) * 3);
      },

      draw2d(q, t, e) {
        const g = q.ctx || q.drawingContext;
        const o = k.screenAt(256, 256, 0);
        // ① the snow globe's glass: two crisp highlight arcs and a glint, top left
        const gl = presence(t, e, 0.0, 0.4, ease.out, 0);
        if (gl > 0.01) {
          q.noFill(); q.strokeCap(q.ROUND);
          q.stroke(255, 255, 255, 190 * gl); q.strokeWeight(3.2);
          q.arc(o[0], o[1], 2 * (k.R - 6), 2 * (k.R - 6), Math.PI * 1.08, Math.PI * 1.38);
          q.stroke(255, 255, 255, 120 * gl); q.strokeWeight(1.6);
          q.arc(o[0], o[1], 2 * (k.R - 12), 2 * (k.R - 12), Math.PI * 1.12, Math.PI * 1.26);
          q.stroke(205, 225, 255, 110 * gl); q.strokeWeight(2);
          q.arc(o[0], o[1], 2 * (k.R - 3), 2 * (k.R - 3), Math.PI * 0.05, Math.PI * 0.32);
          const gt = ((t - 0.8) % BEAT + BEAT) % BEAT, ga = t > 0.8 && gt < 0.6 ? Math.sin(gt / 0.6 * Math.PI) : 0;
          if (ga > 0) {
            const a = Math.PI * 1.2, x = o[0] + Math.cos(a) * (k.R - 7), y = o[1] + Math.sin(a) * (k.R - 7);
            q.stroke(255, 255, 255, 230 * ga * gl); q.strokeWeight(1.5);
            q.line(x - 5 * ga, y, x + 5 * ga, y); q.line(x, y - 5 * ga, x, y + 5 * ga);
          }
        }
        // ② flakes in front of her, swaying down into their columns; a puff where each lands
        g.save(); g.beginPath(); g.arc(o[0], o[1], k.R + 0.5, 0, Math.PI * 2); g.clip();
        const fo = exitF(e, 0.3);
        if (t > T1 && fo > 0.01) {
          const n = Math.floor((t - T1) / SPAWN);
          for (let m = Math.max(0, n - NF); m <= n; m++) {
            const f = (t - (T1 + m * SPAWN)) / FALL, fl = flakes[m % flakes.length];
            if (f < 0) continue;
            if (f <= 1) {
              flakeAt(fl, f, F);
              atInto(V, F[0], F[1], ZC + 7); toScr(V, A);
              flakeShape(q, A[0], A[1], fl.r, Math.min(1, f * 6) * fo);
            } else if (f < 1.22) {
              const s = (f - 1) / 0.22;
              atInto(V, B0 + (fl.b + 0.5) * BW, colTop(fl.b, t) - 2, ZC + 7); toScr(V, B);
              q.noFill(); q.stroke(255, 255, 255, 220 * (1 - s) * fo); q.strokeWeight(1.3);
              for (let i = 0; i < 4; i++) { const a = Math.PI * (1.1 + i * 0.27); q.line(B[0] + Math.cos(a) * (2 + s * 5), B[1] + Math.sin(a) * (2 + s * 5), B[0] + Math.cos(a) * (3 + s * 8), B[1] + Math.sin(a) * (3 + s * 8)); }
            }
          }
        }
        g.restore();
        // ③ mu over the peak, once the curve is drawn
        const mu = presence(t, e, 1.45, 0.3, ease.outBack, 0);
        if (mu > 0.01) {
          const p = k.screenAt(256, BASE - HMAX - 14 - 26, ZC + 8);
          q.push(); q.translate(p[0], p[1]); q.scale(mu);
          q.textAlign(q.CENTER, q.CENTER); q.textStyle(q.BOLDITALIC); q.textSize(13);
          q.stroke(255); q.strokeWeight(3.5); q.fill(200, 40, 50); q.text('μ', 0, 0);
          q.pop();
        }
        // ④ N(μ, σ²) stamps in, top left, then leaves
        const ns = env(t, 1.15, 1.35), no = env(t, 2.6, 2.85);
        if (ns > 0 && no < 1 && e < 0.5) {
          const p = k.screenAt(104, 196, 10), s = (ns < 1 ? ease.outBack(ns) : 1) * (1 - ease.in(no));
          q.push(); q.translate(p[0], p[1]); q.rotate(-0.16); q.scale(Math.max(0.01, s));
          q.textAlign(q.CENTER, q.CENTER); q.textStyle(q.BOLDITALIC); q.textSize(15);
          q.stroke(22, 21, 26); q.strokeWeight(4.5); q.fill(255, 250, 240); q.text('N(μ, σ²)', 0, 0);
          q.noStroke(); q.fill(216, 54, 63); q.text('N(μ, σ²)', -0.6, -0.8);
          q.pop();
        }
      },

      dispose() { knit.dispose(); rib.dispose(); },
    };
  },
};
