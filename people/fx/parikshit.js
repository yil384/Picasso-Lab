/* Prince Modi — 3 AM Summit Push (凌晨三点冲顶)
   His own words carry it: the blog post "Federated Learning Looks Different at 3am When Your Nodes Are
   Dropping", Flotilla's server-failure recovery in under 820 ms (the part of his work he is proudest of),
   "Dead Nodes Tell No Tales", and his line "making distributed systems not fall apart when things go wrong".
   The photo is his Himalayan trek; the effect moves the clock to 3 a.m. on summit day.
   Click: night wipes down over the sunny ridge (baked moonlit layers; he cools evenly); moonlit Chaukhamba
   climbs up out of the haze V between the near ridges; stars come out above it; a trekking headlamp drops
   onto his fringe (a painted lamp housing on a steel-blue strap with a reflective stripe that wraps round
   behind his hair, the crown of his hair above it) and CLICKS on; then his team's headlamps come online up
   the switchbacks of the right-hand ridge - four at once (prefill), then one by one (decode); a "3 AM"
   caption box drops in.
   Loop (3.6 s beat): a heartbeat - the lamp's status light blinks green and an acknowledgement ripples up
   the trail. Every other beat a lamp drops out (it flickers off, a dashed ring marks the gap); his lamp
   flashes twice, a ping runs from his lamp up the trail to the gap, and the lamp relights: BACK UP!
   Exit: the trail lamps go out top-down, the headlamp pops off, the night lifts bottom-up to the photo.
   Assets: people/static/fx/parikshit-headlamp.webp (painted with Codex on green, keyed);
   parikshit-night / -plate-night / -cut-night.webp (people/fx/tools/parikshit_night.py: the day layers
   baked to moonlight; a night reference photo lends colour statistics only); parikshit-peak.webp
   (people/fx/tools/parikshit_peak.py: Chaukhamba, keyed and graded to moonlight; source and licence there).
   Photo landmarks (512 px): hair top 255,176 · hair u 194-312 (v 210-235) · fringe v 222 · brows v 240 ·
   eyes 230,257 / 278,257 · ears 197-210 / 306-316 x v 255-300 · mouth 258,300 · chin 263,318 · hood
   300-345 x v 285-330 · shoulders 160,385 / 395,385 · the left mountain's edge 240,0 -> 304,96 · the right
   ridge 322,103 -> 520,30 (the haze V between them, bottom 316,105) · the right-hand slope (the trail)
   u 360-470 x v 80-280. */
import { THREE, presence, env, ease, clamp } from './kit.js';

const BEAT = 3.6;
const T0 = 1.35;                              // the loop starts
const TAU = Math.PI * 2;
const PX = 200 / 512;                         // photo px -> logical px
const INK = '#16151a';
const BLUE = '#3776AD';                       // his site's colour
const FONT = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

// the far haze between the near ridges (photo px): the peak and the stars show only here
const HAZE = [[226, -40], [560, -40], [560, 24], [520, 30], [480, 40], [448, 50], [416, 64], [384, 78], [352, 92],
  [322, 103], [314, 104], [304, 96], [292, 80], [282, 64], [272, 48], [262, 32], [250, 16], [240, 0], [232, -20]];
// the peak layer's box (photo px, printed by tools/parikshit_peak.py) and its main summit
const PB = [254.3, 33.2, 437.9, 111.4];
const SUMMIT = [322, 40];
// the headlamp sprite: aspect, and the lens and status-light centres (fractions of the sprite, y down)
const LAMP_ASPECT = 630 / 995, LENS = [0.4975, 0.5214], LED = [0.732, 0.299];
// his team on the switchbacks of the right-hand ridge, low to high (photo px)
const TRAIL = [[372, 272], [440, 238], [392, 206], [452, 176], [404, 140], [438, 114], [418, 84]];
const DROPS = [4, 2, 5];                      // which lamp drops out, in turn (L5, L3, L6)
const STARS = [[272, 26, 0], [340, 22, 0], [298, 14, 1], [362, 32, 1]];   // u, v, big

function drawHazeMask(g, w) {
  const s = w / 512;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
  g.fillStyle = '#fff';
  g.beginPath(); HAZE.forEach(([u, v], i) => (i ? g.lineTo(u * s, v * s) : g.moveTo(u * s, v * s))); g.closePath(); g.fill();
}

export default {
  title: '3 AM summit push',
  exit: 0.45,
  still: 3.75,
  async build(k) {
    const { root } = k;
    const own = [];
    const tmp = new THREE.Vector3();
    const hump = (t, a, b, c) => (t < a || t > c ? 0 : t < b ? (t - a) / (b - a) : 1 - (t - b) / (c - b));
    const beat = (t) => (t < T0 ? { n: -1, p: -1 } : { n: Math.floor((t - T0) / BEAT), p: (t - T0) % BEAT });

    /* ① the night: the three photo layers crossfade to their baked moonlit twins. The background (photo and
       plate) wipes in top-down and lifts bottom-up on the exit; he cools evenly (no edge across his face) */
    const tex = async (name) => {
      const t = await k.loadTexture(`${k.STATIC}fx/${name}`).catch(() => null);
      if (t) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; own.push(t); }
      return t;
    };
    const [nightPhoto, nightPlate, nightCut, lampTex, peakTex] = await Promise.all([
      tex('parikshit-night.webp'), tex('parikshit-plate-night.webp'), tex('parikshit-cut-night.webp'),
      k.loadTexture(`${k.STATIC}fx/parikshit-headlamp.webp`), k.loadTexture(`${k.STATIC}fx/parikshit-peak.webp`),
    ]);
    const night = { uK: { value: 0 }, uP: { value: 0 } };
    const toNight = (mat, map, wipe, key) => {
      if (!map) return;
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uNight = { value: map };
        sh.uniforms.uK = night.uK; sh.uniforms.uP = night.uP;
        sh.fragmentShader = 'uniform sampler2D uNight; uniform float uK, uP;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
          #ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          float w = ${wipe ? 'clamp((uK * 1.25 - (1.0 - vMapUv.y)) / 0.25, 0.0, 1.0)' : 'uP'};
          if (w > 0.0) sampledDiffuseColor = mix(sampledDiffuseColor, texture2D(uNight, vMapUv), w);
          diffuseColor *= sampledDiffuseColor;
          #endif`);
      };
      mat.customProgramCacheKey = () => key;
      mat.needsUpdate = true;
    };
    toNight(k.layers.photo.material, nightPhoto, true, 'pm-night-photo');
    toNight(k.layers.plate.material, nightPlate, true, 'pm-night-plate');
    toNight(k.layers.person.material, nightCut, false, 'pm-night-cut');
    // moonlight on the 3D strap: the key light swings to the upper right and goes cool
    const keyLight = k.scene.children.find((o) => o.isDirectionalLight);
    const hemi = k.scene.children.find((o) => o.isHemisphereLight);
    const day = { kp: keyLight.position.clone(), kc: keyLight.color.clone(), ki: keyLight.intensity, hs: hemi.color.clone(), hg: hemi.groundColor.clone(), hi: hemi.intensity };
    const MOON = { kp: new THREE.Vector3(1.1, 0.9, 1.4), kc: new THREE.Color(0xc8d6ff), ki: 1.7, hs: new THREE.Color(0x9fb4ff), hg: new THREE.Color(0x1a2238), hi: 1.0 };

    /* ② moonlit Chaukhamba on a card at the back, masked to the haze V so it stays behind the near ridges
       and climbs up from behind them */
    const PZ = -32, PF = k.depthScale(PZ);
    const maskTex = k.canvasTexture(128, 128, drawHazeMask, false);
    const peak = new THREE.Mesh(new THREE.PlaneGeometry((PB[2] - PB[0]) * PX, (PB[3] - PB[1]) * PX));
    const peakMat = k.clip(new THREE.ShaderMaterial({
      uniforms: { map: { value: peakTex }, uMask: { value: maskTex }, uM: { value: peak.matrix }, uF: { value: k.D * PF }, uOp: { value: 1 } },
      vertexShader: `uniform mat4 uM; uniform float uF; varying vec2 vUv, vP;
        void main() { vUv = uv; vec4 r = uM * vec4(position, 1.0); vP = r.xy / uF + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map, uMask; uniform float uOp; varying vec2 vUv, vP;
        void main() {
          vec4 c = texture2D(map, vUv);
          float a = c.a * smoothstep(0.15, 0.85, texture2D(uMask, vP).r) * uOp;
          if (a < 0.004) discard;
          gl_FragColor = vec4(c.rgb, a);
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

    /* ③ the headlamp. The housing is a painted card on his fringe; the strap is a toon band round an ellipse
       about his head: its front runs across his hair in front of the person layer, its sides go behind the
       layer (z < 0) and vanish into his hair, as if round the back of his head */
    const LZ = 9, LW = 48 * PX, LH = LW * LAMP_ASPECT;
    const lamp = new THREE.Group(), lampSquash = new THREE.Group();
    lamp.add(lampSquash);
    const housing = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshBasicMaterial({ map: lampTex, transparent: true, depthWrite: false, color: 0xd9dee8 }));
    housing.renderOrder = 12;
    lampSquash.add(housing);
    const lampHome = k.at(255, 222, LZ);
    lamp.position.copy(lampHome);
    root.add(lamp);
    const SZ = -12, SRX = 53 * PX, SRZ = 20, SH = 3.5, SEG = 64;
    const strapTex = k.canvasTexture(256, 32, (g, w, h) => {
      g.fillStyle = '#34618f'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.10)'; for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 2, h);   // the weave
      g.fillStyle = '#d5dde8'; g.fillRect(0, h * 0.42, w, h * 0.17);                                  // the reflective stripe
      g.fillStyle = INK; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);                           // the inked edges
    });
    const strapGeo = new THREE.CylinderGeometry(1, 1, SH, SEG, 1, true, -Math.PI, TAU);
    strapGeo.scale(SRX, 1, SRZ);
    const strap = new THREE.Mesh(strapGeo, k.toon(0xffffff, { map: strapTex }));
    strap.renderOrder = 5;
    const strapG = new THREE.Group();
    strapG.add(strap);
    strapG.rotation.x = -0.2;                      // the back rides higher, so the sides dip a little
    strapG.position.copy(k.at(253, 224, SZ));
    strapG.scale.setScalar(k.depthScale(SZ));
    root.add(strapG);
    // a soft contact shadow under the strap and the housing (the card spans photo px u 196..316, v 196..256)
    const shadowTex = k.canvasTexture(256, 128, (g, w, h) => {
      const X = (u) => (u - 196) / 120 * w - 1000, Y = (v) => (v - 196) / 60 * h;
      g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 7; g.shadowOffsetX = 1000;   // a blur every browser does
      g.fillStyle = '#000';
      g.beginPath(); g.ellipse(X(252), Y(237), 26 / 120 * w, 5 / 60 * h, 0, 0, TAU); g.fill();
      g.lineWidth = 3 / 60 * h; g.strokeStyle = '#000';
      g.beginPath(); g.moveTo(X(206), Y(232)); g.quadraticCurveTo(X(253), Y(233), X(300), Y(232)); g.stroke();
    });
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0, color: 0x000000 });
    const shadowCard = new THREE.Mesh(new THREE.PlaneGeometry(120 * PX, 60 * PX), shadowMat);
    shadowCard.position.copy(k.at(256, 226, 0.5));
    shadowCard.scale.setScalar(k.depthScale(0.5));
    shadowCard.renderOrder = 11;
    root.add(shadowCard);
    const lensAt = (out) => { housing.localToWorld(out.set((LENS[0] - 0.5) * LW, (0.5 - LENS[1]) * LH, 0.1)); return root.worldToLocal(out); };
    const ledAt = (out) => { housing.localToWorld(out.set((LED[0] - 0.5) * LW, (0.5 - LED[1]) * LH, 0.1)); return root.worldToLocal(out); };

    // the beats of the entrance
    const LAMP0 = 0.38, CLICK = 0.62, ON = [0.70, 0.70, 0.70, 0.70, 0.82, 0.90, 0.98];

    /** each trail lamp at (t, e): how lit, its pop, the gap ring, the relight */
    const lampState = (i, t, e) => {
      let lit = t >= ON[i] ? 1 : 0;
      let pop = t >= ON[i] ? hump(t, ON[i], ON[i] + 0.05, ON[i] + 0.14) * 0.35 : 0;
      const { n, p } = beat(t);
      let ring = 0, back = 0;
      if (n >= 0) {
        pop = Math.max(pop, 0.25 * hump(p, 0.1 + i * 0.07, 0.16 + i * 0.07, 0.22 + i * 0.07));   // the ack wave
        if (n % 2 === 0 && DROPS[(n / 2) % 3] === i) {
          if (p >= 1.2 && p < 2.1) {
            lit = p < 1.4 ? [1, 0, 1, 0.6, 0][Math.min(4, Math.floor((p - 1.2) / 0.04))] : 0;
            ring = p >= 1.4 ? ease.outBack(env(p, 1.4, 1.5)) : 0;
          } else if (p >= 2.1) {
            back = env(p, 2.1, 2.35);
            ring = 1 - env(p, 2.1, 2.18);
            pop = Math.max(pop, 0.7 * (1 - ease.out(env(p, 2.1, 2.35))));
          }
        }
      }
      const out = e > 0 ? clamp(1 - (e - (6 - i) * 0.089) / 0.12) : 1;   // top-down, L7 first, 40 ms apart
      return { lit: lit * out, pop, ring: ring * out, back };
    };

    return {
      update(t, e) {
        k.layers.photo.material.opacity = 1;
        const out = 1 - ease.inOut(env(e, 0.1, 1));
        night.uK.value = ease.inOut(env(t, 0, 0.45)) * out;
        night.uP.value = ease.inOut(env(t, 0.1, 0.5)) * out;
        const nk = Math.min(1, night.uK.value * 1.25);
        keyLight.position.lerpVectors(day.kp, MOON.kp, nk);
        keyLight.color.lerpColors(day.kc, MOON.kc, nk);
        keyLight.intensity = day.ki + (MOON.ki - day.ki) * nk;
        hemi.color.lerpColors(day.hs, MOON.hs, nk);
        hemi.groundColor.lerpColors(day.hg, MOON.hg, nk);
        hemi.intensity = day.hi + (MOON.hi - day.hi) * nk;

        // the peak climbs up from behind the ridges; it sinks and fades on the exit
        const pp = presence(t, e, 0.12, 0.63, ease.out, 0.12);
        peak.visible = pp > 0.002;
        peak.position.set(peakHome.x, peakHome.y - (1 - pp) * 44, PZ);
        peakMat.uniforms.uOp.value = clamp(pp / 0.35) * (1 - env(e, 0.67, 1));
        peak.updateMatrix();

        // the headlamp drops onto his fringe and squashes; it pops off up and away on the exit
        const li = env(t, LAMP0, LAMP0 + 0.14);
        const lo = ease.in(env(e, 0.55, 1));
        const la = li > 0 ? ease.outBack(li, 1.4) * (1 - lo) : 0;
        k.show(lamp, Math.max(0, la * (0.3 + 0.7 * Math.min(1, li * 1.4))), k.depthScale(LZ));
        lamp.position.set(lampHome.x, lampHome.y + (1 - ease.out(li)) * 26 + lo * 30, LZ);
        lamp.rotation.z = (1 - ease.out(li)) * 0.24;
        const sl = t - (LAMP0 + 0.14);
        const sq = sl > 0 ? 0.12 * Math.exp(-14 * sl) * Math.cos(26 * sl) : 0;
        lampSquash.scale.set(1 + sq, 1 - sq, 1);
        // the strap snaps open from behind the housing round to the back of his head; retracts on the exit
        const so = env(t, LAMP0 + 0.14, LAMP0 + 0.22) * (1 - env(e, 0.33, 0.67));
        const ang = (10 + 80 * ease.outBack(so, 1.6)) / 180 * Math.PI;             // half-angle shown, from the front
        const segs = Math.max(0, Math.min(SEG / 2, Math.round(ang / Math.PI * (SEG / 2))));
        strap.visible = so > 0 && segs > 0 && la > 0.05;
        strap.geometry.setDrawRange((SEG / 2 - segs) * 6, segs * 12);
        shadowMat.opacity = 0.42 * Math.min(1, la) * so;
      },

      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0.001) return;
        const c = q.drawingContext;
        const { n, p } = beat(t);
        const [cx0, cy0] = k.screenAt(256, 256, 0);
        const star4 = (x, y, rx, ry, a, fill = '#fffdf3', w = 0.8, inkA = 0.8) => {
          c.beginPath();
          [[0, -ry], [w, -w], [rx, 0], [w, w], [0, ry], [-w, w], [-rx, 0], [-w, -w]].forEach(([dx, dy], i) => (i ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)));
          c.closePath();
          c.globalAlpha = a; c.fillStyle = fill; c.fill();
          c.globalAlpha = a * inkA; c.lineWidth = 0.8; c.strokeStyle = INK; c.stroke();
          c.globalAlpha = 1;
        };
        c.save();
        c.beginPath(); c.arc(cx0, cy0, k.R + 0.5, 0, TAU); c.clip();
        c.lineJoin = 'round'; c.lineCap = 'round';

        // stars over the massif, coming out one by one, twinkling
        STARS.forEach(([u, v, big], i) => {
          const a = env(t, 0.3 + i * 0.07, 0.42 + i * 0.07) * (1 - env(e, 0, 0.67));
          if (a <= 0.01) return;
          const [x, y] = k.screenAt(u, v, -34);
          const tw = 1 + 0.18 * Math.sin(t * (2.1 + i * 0.7) + i * 1.9);
          if (big) star4(x, y, 2.8 * tw, 2.8 * tw, a, '#f4f7ff', 0.55, 0.6);
          else { c.globalAlpha = a; c.fillStyle = '#eef3ff'; c.beginPath(); c.arc(x, y, 0.75 * tw, 0, TAU); c.fill(); c.globalAlpha = 1; }
        });
        // a glint on the summit as it tops out
        const sg = hump(t, 0.74, 0.84, 0.98) * fade;
        if (sg > 0.02) { const [x, y] = k.screenAt(SUMMIT[0], SUMMIT[1] - 2, -32); star4(x, y, 6.5 * sg, 6.5 * sg, sg, '#ffffff', 1.2, 0.9); }

        // his team: headlamps up the switchbacks (warm four-point lights, a white core); the gap and the relight
        const P = TRAIL.map(([u, v]) => k.screenAt(u, v, -20));
        TRAIL.forEach((_, i) => {
          const st = lampState(i, t, e);
          const [x, y] = P[i];
          const s = 1 - 0.3 * i / 6;
          if (st.ring > 0.01) {
            c.save();
            c.translate(x, y); c.rotate(t * 0.7);
            c.globalAlpha = Math.min(1, st.ring); c.strokeStyle = '#a9c6ff'; c.lineWidth = 1.2;
            c.setLineDash([2.6, 2.6]);
            c.beginPath(); c.arc(0, 0, Math.max(0, 5 * Math.min(1.2, st.ring)), 0, TAU); c.stroke();
            c.restore();
          }
          if (st.lit <= 0.01) return;
          // a short beam up the trail, toward the next lamp (it is what makes them read as people, not stars)
          const [nx, ny] = P[Math.min(6, i + 1)], [px0, py0] = P[Math.max(0, i - 1)];
          const dx = i < 6 ? nx - x : x - px0, dy = i < 6 ? ny - y : y - py0, dl = Math.hypot(dx, dy) || 1;
          const bl = 10 * s, ux = dx / dl, uy = dy / dl, sp = 0.36;
          const bg = c.createLinearGradient(x, y, x + ux * bl, y + uy * bl);
          bg.addColorStop(0, 'rgba(255,244,214,0.5)'); bg.addColorStop(1, 'rgba(255,244,214,0)');
          c.globalAlpha = st.lit; c.fillStyle = bg;
          c.beginPath(); c.moveTo(x, y);
          c.lineTo(x + (ux * Math.cos(sp) - uy * Math.sin(sp)) * bl, y + (uy * Math.cos(sp) + ux * Math.sin(sp)) * bl);
          c.lineTo(x + (ux * Math.cos(-sp) - uy * Math.sin(-sp)) * bl, y + (uy * Math.cos(-sp) + ux * Math.sin(-sp)) * bl);
          c.closePath(); c.fill(); c.globalAlpha = 1;
          const tw = 1 + 0.08 * Math.sin(t * TAU / (1.1 + (i * 0.37) % 0.6) + i);
          const g = (1 + st.pop) * tw;
          star4(x, y, 5.5 * s * g, 5.5 * s * g, st.lit, '#fff1cf', 0.9 * s, 0.75);
          c.globalAlpha = st.lit; c.fillStyle = '#ffffff';
          c.beginPath(); c.arc(x, y, 1.0 * s * (1 + st.pop * 0.5), 0, TAU); c.fill();
          c.globalAlpha = 1;
          if (st.back > 0 && st.back < 1) {
            const r0 = 4 + 2 * st.back, r1 = r0 + 7 * Math.sin(st.back * Math.PI);
            for (let j = 0; j < 8; j++) {
              const a = j / 8 * TAU + 0.2;
              c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
              c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
              c.strokeStyle = '#ffffff'; c.lineWidth = 0.9; c.stroke();
            }
          }
        });
        c.restore();

        // the lens: off until CLICK, then a white disc and a crisp horizontal flare; a burst on the click, a
        // pulse on every heartbeat, two quick flashes when it retries a dropped node; the ping up the trail
        if (t >= CLICK && e < 0.22) {
          const [lx, ly] = k.toScreen(lensAt(tmp));
          const offA = 1 - env(e, 0.18, 0.22);
          let g = 1 + 0.05 * Math.sin(t * TAU / 2.4);
          if (n >= 0) g += 0.15 * hump(p, 0, 0.05, 0.15);
          if (n >= 0 && n % 2 === 0) g += 0.45 * (hump(p, 1.75, 1.79, 1.83) + hump(p, 1.87, 1.91, 1.95));
          const burst = env(t, CLICK, CLICK + 0.23);
          if (burst < 1) {
            const R = 1 - Math.abs(burst - 0.35) / 0.65;
            [[0, 30], [-30, 22], [-60, 22], [-90, 18], [-120, 22], [-150, 22], [180, 30]].forEach(([deg, len]) => {
              const a = deg / 180 * Math.PI, r0 = 6, r1 = r0 + len * Math.max(0, R);
              c.beginPath(); c.moveTo(lx + Math.cos(a) * r0, ly + Math.sin(a) * r0); c.lineTo(lx + Math.cos(a) * r1, ly + Math.sin(a) * r1);
              c.strokeStyle = INK; c.lineWidth = 2.2; c.stroke();
              c.strokeStyle = '#fffdf3'; c.lineWidth = 1; c.stroke();
            });
          }
          const grow = Math.max(0, ease.outBack(env(t, CLICK, CLICK + 0.12)));
          star4(lx, ly, 13 * g * grow, 3.5 * g * grow, offA, '#fffdf3', 1.3, 0.8);
          c.globalAlpha = offA; c.fillStyle = '#fffbea'; c.strokeStyle = INK; c.lineWidth = 0.8;
          c.beginPath(); c.arc(lx, ly, 3.4 * grow, 0, TAU); c.fill(); c.stroke(); c.globalAlpha = 1;
          const hb = Math.max(hump(t, CLICK, CLICK + 0.03, CLICK + 0.15), n >= 0 ? hump(p, 0, 0.03, 0.15) : 0) * offA;
          if (hb > 0.02) {
            const [gx, gy] = k.toScreen(ledAt(tmp));
            c.globalAlpha = hb; c.fillStyle = '#38e07a'; c.strokeStyle = INK; c.lineWidth = 0.6;
            c.beginPath(); c.arc(gx, gy, 0.9, 0, TAU); c.fill(); c.stroke(); c.globalAlpha = 1;
          }
          if (n >= 0 && n % 2 === 0 && p >= 1.85 && p < 2.1) {
            const d = DROPS[(n / 2) % 3];
            const path = [[lx, ly], ...P.slice(0, d + 1)];
            const segL = path.slice(1).map((b, i) => Math.hypot(b[0] - path[i][0], b[1] - path[i][1]));
            const total = segL.reduce((a, b) => a + b, 0);
            const at = (s) => {
              let L = s * total;
              for (let i = 0; i < segL.length; i++) {
                if (L <= segL[i] || i === segL.length - 1) { const f = Math.min(1, L / segL[i]); return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f]; }
                L -= segL[i];
              }
              return path[path.length - 1];
            };
            const s = ease.inOut(env(p, 1.85, 2.1));
            for (let j = 6; j >= 0; j--) {
              const [x, y] = at(Math.max(0, s - j * 0.03));
              c.globalAlpha = (1 - j / 7) * 0.9; c.fillStyle = '#ffffff';
              c.beginPath(); c.arc(x, y, 1.6 * (1 - j / 9), 0, TAU); c.fill();
            }
            const [x, y] = at(s);
            c.globalAlpha = 1; c.strokeStyle = INK; c.lineWidth = 0.6; c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.stroke();
          }
        }

        // lettering, never more than two on screen: CLICK! on the click, the 3 AM caption, BACK UP! on a relight
        const word = (txt, x, y, size, rot, a, s, o) => {
          if (a <= 0.01) return;
          c.save();
          c.translate(x, y); c.rotate(rot); c.scale(s * 0.9, s);
          c.globalAlpha = a;
          c.font = `900 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
          c.lineJoin = 'round';
          c.strokeStyle = BLUE; c.fillStyle = BLUE; c.lineWidth = o.ink; c.strokeText(txt, 1.4, 1.4); c.fillText(txt, 1.4, 1.4);
          c.strokeStyle = INK; c.lineWidth = o.ink; c.strokeText(txt, 0, 0);
          c.fillStyle = o.fill; c.fillText(txt, 0, 0);
          c.restore();
        };
        const ck = (t < CLICK ? 0 : ease.outBack(env(t, CLICK, CLICK + 0.1), 2)) * (1 - env(t, 0.88, 1.0));
        if (ck > 0.01) {
          const [x, y] = k.screenAt(176, 166, 10);
          word('CLICK!', x, y, 10, -0.21, Math.min(1, ck), ck, { fill: '#ffffff', ink: 2 });
          const [lx, ly] = k.toScreen(lensAt(tmp));
          c.strokeStyle = INK; c.lineWidth = 1.2; c.globalAlpha = Math.min(1, ck);
          [-0.5, 0, 0.5].forEach((o) => {
            const ax = lx - 12, ay = ly - 3 + o * 7, bx = x + 16, by = y - 2 + o * 5;
            c.beginPath(); c.moveTo(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25); c.lineTo(ax + (bx - ax) * 0.6, ay + (by - ay) * 0.6); c.stroke();
          });
          c.globalAlpha = 1;
        }
        const cap = presence(t, e, 1.0, 0.25, ease.outBack, 0);
        if (cap > 0.01) {
          const [x, y] = k.screenAt(170, 84, 6);
          c.save();
          c.translate(x, y - (1 - Math.min(1, cap)) * 18); c.rotate(-0.052); c.scale(Math.min(1.05, cap), Math.min(1.05, cap));
          c.globalAlpha = Math.min(1, cap * 1.5);
          c.fillStyle = '#0e1426'; c.fillRect(-23.5 + 2, -9 + 2, 47, 18);
          c.fillStyle = '#f3ead6'; c.fillRect(-23.5, -9, 47, 18);
          c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(-23.5, -9, 47, 18);
          c.font = `900 14px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = INK; c.scale(0.9, 1); c.fillText('3 AM', 0, 1);
          c.restore();
        }
        if (n >= 0 && n % 2 === 0) {
          const wa = (s0) => ease.outBack(env(p, s0, s0 + 0.22), 1.8) * (1 - env(p, 3.0, 3.3)) * (1 - env(e, 0, 0.6));
          const a1 = wa(2.12), a2 = wa(2.18);
          const line = (txt, u, v, a) => {
            if (a <= 0.01) return;
            const [x, y] = k.screenAt(u, v, 6);
            c.save(); c.translate(x, y); c.rotate(-0.105 + (1 - Math.min(1, a)) * -0.14);
            c.font = `900 20px ${FONT}`;
            const ws = [...txt].map((ch) => c.measureText(ch).width * 0.9);
            let xx = -ws.reduce((sum, w) => sum + w, 0) / 2;
            [...txt].forEach((ch, i) => {
              word(ch, xx + ws[i] / 2, 0, 20, (i % 2 ? 1 : -1) * 0.05, Math.min(1, a), 0.6 + 0.4 * Math.min(1.1, a), { fill: '#eef5ff', ink: 2.6 });
              xx += ws[i];
            });
            c.restore();
          };
          line('BACK', 105, 230, a1);
          line('UP!', 113, 280, a2);
        }
      },

      dispose() {
        own.forEach((o) => o.dispose?.());
      },
    };
  },
};
