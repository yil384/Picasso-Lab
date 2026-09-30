/* Hezi — 量子计算学者 (quantum computing scholar; quantum computer architecture and compilers)
   Click: the white ID-photo backdrop dims into a quiet deep-navy lab with a faint grid; a
   Bloch sphere assembles at the upper right and its state arrow precesses; a small 3 x 3
   neutral-atom array appears at the upper left with one site empty, and an optical-tweezer
   beam carries a spare atom into the gap; a curved waveguide draws itself across the
   bottom and a light pulse runs along it; |psi> = a|0> + b|1> is hand-lettered in.
   Loop (3.2 s): the arrow keeps precessing (one turn per beat), one light pulse per beat.
   Photo landmarks (512 px): hair/face 121-386 wide from v 40 · eyes y 208 (x 210 / 300) ·
   chin 256,345 · collar v 410 · black shirt below v 420 · white background left of u 120,
   right of u 390. */
import { THREE, presence, env, ease, clamp, lerp } from './kit.js';

const LINE = 0xcfe6ff, GOLD = 0xffc24d, ATOM = 0xdff3ff, BEAM = '#b79cff';
const T_LOOP = 1.6, BEAT = 3.2;
const KET = Array.from('|\u03C8\u27E9 = \u03B1|0\u27E9 + \u03B2|1\u27E9');
const JIT = [0.4, -0.6, 0.2, 0.9, -0.3, -0.8, 0.5, 0.1, -0.5, 0.7, -0.2];
const bump = (x, w) => (x <= 0 || x >= w ? 0 : Math.sin(Math.PI * x / w));

export default {
  title: 'Quantum computing scholar',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;
    const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

    /* ① backdrop: quiet navy lab with a faint grid, behind her -------------------------- */
    const lab = k.canvasTexture(512, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#0d1832'); gr.addColorStop(0.6, '#15254a'); gr.addColorStop(1, '#1b2f5a');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(150,190,255,0.09)'; g.lineWidth = 1;
      for (let i = 0; i <= 512; i += 24) { g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, 512); g.moveTo(0, i + 0.5); g.lineTo(512, i + 0.5); g.stroke(); }
      g.strokeStyle = 'rgba(150,190,255,0.16)';
      for (let i = 0; i <= 512; i += 96) { g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, 512); g.moveTo(0, i + 0.5); g.lineTo(512, i + 0.5); g.stroke(); }
    });
    const zS = k.Z_BACK + 2;
    const set = new THREE.Mesh(new THREE.CircleGeometry(k.R, 128), new THREE.MeshBasicMaterial({ map: lab, transparent: true, opacity: 0, depthWrite: false }));
    set.position.z = zS;
    set.scale.setScalar(k.depthScale(zS));
    set.renderOrder = -18;
    root.add(set);

    // the cut-out was matted off a white wall: darken its half-transparent rim while the lab is up,
    // so no white fringe shows against the navy
    const uFr = { value: 0 };
    const pm = k.layers.person.material;
    pm.onBeforeCompile = (sh) => {
      sh.uniforms.uFr = uFr;
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', 'uniform float uFr;\nvoid main() {')
        .replace('#include <map_fragment>', '#include <map_fragment>\n\tdiffuseColor.rgb *= mix(1.0, smoothstep(0.2, 0.95, diffuseColor.a), uFr);');
    };
    pm.customProgramCacheKey = () => 'hezi-fringe';
    pm.needsUpdate = true;

    /* ② Bloch sphere (upper right): wire sphere, equator, axes, precessing state arrow ------ */
    const BR = 18;
    const bloch = new THREE.Group();
    const blochHome = k.at(428, 137, 18);
    bloch.position.copy(blochHome);
    root.add(bloch);
    const outline = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.5, 6, 72), basic(LINE));    // silhouette, faces us
    const shell = new THREE.Mesh(new THREE.SphereGeometry(BR, 40, 24), new THREE.MeshBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.1, depthWrite: false }));
    const sph = new THREE.Group();                   // the tilted sphere frame
    sph.rotation.set(0.38, -0.5, 0);
    const lineMat = basic(LINE, { transparent: true, opacity: 0.9 });
    const faintMat = basic(LINE, { transparent: true, opacity: 0.4 });
    const equator = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.34, 5, 72), lineMat);
    equator.rotation.x = Math.PI / 2;
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.26, 5, 72), faintMat);
    const zAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, BR * 2.5, 6), lineMat);
    const xAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, BR * 2.2, 6), faintMat);
    xAxis.rotation.z = Math.PI / 2;
    const yAxis = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, BR * 2.2, 6), faintMat);
    yAxis.rotation.x = Math.PI / 2;
    const poleGeo = new THREE.SphereGeometry(0.9, 10, 8);
    const north = new THREE.Mesh(poleGeo, lineMat); north.position.y = BR;
    const south = new THREE.Mesh(poleGeo, lineMat); south.position.y = -BR;
    // the precession path (a faint latitude ring) and the state arrow
    const THETA = 0.85;
    const lat = new THREE.Mesh(new THREE.TorusGeometry(BR * Math.sin(THETA), 0.22, 4, 64), basic(GOLD, { transparent: true, opacity: 0.45 }));
    lat.rotation.x = Math.PI / 2;
    lat.position.y = BR * Math.cos(THETA);
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, BR - 4, 10), k.toon(GOLD));
    shaft.position.y = (BR - 4) / 2;
    k.ink(shaft, 0.9);
    const head = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.6, 16), k.toon(GOLD));
    head.position.y = BR - 2.2;
    k.ink(head, 0.9);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), k.toon(GOLD));
    arrow.add(shaft, head, hub);
    sph.add(equator, meridian, zAxis, xAxis, yAxis, north, south, lat, arrow);
    bloch.add(shell, outline, sph);

    /* ③ neutral-atom array (upper left): 3 x 3 sites, one empty; a tweezer fills it ------- */
    const SP = 10.5;
    const grid = new THREE.Group();
    grid.position.copy(k.at(100, 150, 16));
    grid.rotation.set(-0.62, 0.3, 0.04);
    root.add(grid);
    const atomGeo = new THREE.SphereGeometry(1.9, 16, 12);
    const atomMat = basic(ATOM);
    const siteXY = (c, r) => [(c - 1) * SP, (r - 1) * SP];
    const VAC = [1, 0];                                  // bottom-middle site is empty
    const atoms = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (c === VAC[0] && r === VAC[1]) continue;
      const a = new THREE.Group();
      const m = new THREE.Mesh(atomGeo, atomMat);
      const gl = k.glowSprite('rgba(170,220,255,0.95)', 9, 0.55);
      a.add(m, gl);
      const [x, y] = siteXY(c, r);
      a.position.set(x, y, 0);
      grid.add(a);
      atoms.push({ a, gl, i: atoms.length, c, r });
    }
    // the empty site: a faint ring, and the spare atom outside the array
    const vac = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.22, 4, 24), basic(LINE, { transparent: true, opacity: 0.6 }));
    vac.position.set(...siteXY(VAC[0], VAC[1]), 0);
    grid.add(vac);
    const spare = new THREE.Group();
    const spareGl = k.glowSprite('rgba(170,220,255,0.95)', 9, 0.6);
    spare.add(new THREE.Mesh(atomGeo, atomMat), spareGl);
    const SPARE0 = new THREE.Vector3(0, -SP * 2.4, 0), SPARE1 = new THREE.Vector3(...siteXY(VAC[0], VAC[1]), 0);
    grid.add(spare);
    // the tweezer: a focused beam (narrow at the atom) standing on the plane's normal
    const beamTex = k.canvasTexture(8, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
      g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
    });
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: new THREE.Color(BEAM), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 0.5, 24, 20, 1, true), beamMat);
    beam.rotation.x = Math.PI / 2;
    const beamG = new THREE.Group();
    beam.position.z = 12;
    beamG.add(beam);
    grid.add(beamG);

    /* ④ curved waveguide across the bottom, with grating couplers at both ends ----------- */
    const wpts = [[-64, -66], [-36, -79], [-4, -74], [28, -68], [58, -76]].map(([x, y]) => new THREE.Vector3(x, y, 12));
    const curve = new THREE.CatmullRomCurve3(wpts, false, 'centripetal');
    const TSEG = 120, RSEG = 8;
    const tubeGeo = new THREE.TubeGeometry(curve, TSEG, 0.75, RSEG, false);
    const tube = new THREE.Mesh(tubeGeo, k.toon(0x78aef0));
    k.ink(tube, 0.7);
    root.add(tube);
    const couplers = [0, 1].map((end) => {
      const g = new THREE.Group();
      const p = curve.getPointAt(end), tg = curve.getTangentAt(end);
      g.position.copy(p);
      g.rotation.z = Math.atan2(tg.y, tg.x);
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(1, 5.2 - i * 0.6, 1), k.toon(0x9cc8ff));
        b.position.x = (end ? 1 : -1) * (2 + i * 1.9);
        k.ink(b, 0.7);
        g.add(b);
      }
      root.add(g);
      return g;
    });
    const pulseGl = k.glowSprite('rgba(200,240,255,0.95)', 12, 0);
    root.add(pulseGl);

    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    const tint = new THREE.Color();
    let drawn = 0;                                   // how much of the waveguide is drawn (0..1)
    const scr = [0, 0];
    const toScr = (v, obj) => {
      tmp.copy(v);
      if (obj) tmp.applyMatrix4(obj.matrixWorld); else tmp.applyMatrix4(root.matrixWorld);
      tmp.project(k.camera);
      scr[0] = (tmp.x + 1) / 2 * k.W; scr[1] = (1 - tmp.y) / 2 * k.H;
      return scr;
    };
    const loopT = t => (t < T_LOOP ? -1 : (t - T_LOOP) % BEAT);
    const pulseS = (t) => {                           // position of the light pulse along the guide (or -1)
      if (t < 1.0) return -1;
      if (t < T_LOOP) return env(t, 1.0, 1.75);
      const lt = loopT(t);
      return lt < 0.8 ? lt / 0.8 : -1;
    };

    return {
      update(t, e) {
        /* backdrop */
        const b = presence(t, e, 0.02, 0.45, ease.out, 0);
        set.material.opacity = b;
        tint.setRGB(1 - 0.96 * b, 1 - 0.94 * b, 1 - 0.86 * b);     // the photo's white rim goes navy too
        k.layers.plate.material.color.copy(tint);
        k.layers.photo.material.color.copy(tint);
        uFr.value = b;

        /* Bloch sphere: the outline and equator grow, then the arrow rises and precesses */
        const bs = presence(t, e, 0.22, 0.45, ease.outBack, 0.2);
        k.show(bloch, bs);
        bloch.position.set(blochHome.x, blochHome.y + Math.sin(t * Math.PI * 2 / BEAT) * 0.8, blochHome.z);
        const ar = presence(t, e, 0.5, 0.35, ease.outBack, 0.3);
        k.show(arrow, ar);
        const phi = t * Math.PI * 2 / BEAT;
        const th = lerp(0.1, THETA, ease.out(env(t, 0.5, 0.95)));
        arrow.rotation.set(0, phi, 0);
        arrow.rotateZ(-th);
        lat.visible = ar > 0.3;
        lat.material.opacity = 0.45 * env(t, 0.8, 1.1) * (1 - e);

        /* atoms: pop in site by site, the tweezer carries the spare atom into the gap */
        atoms.forEach((o) => {
          const d = 0.36 + (o.r * 3 + o.c) * 0.035;
          k.show(o.a, presence(t, e, d, 0.25, ease.outBack, 0.2));
          o.gl.material.opacity = 0.5 + 0.15 * Math.sin(t * 2.1 + o.i * 1.7);
        });
        k.show(vac, presence(t, e, 0.4, 0.2, ease.out, 0.2) * (1 - env(t, 1.08, 1.2)));
        k.show(spare, presence(t, e, 0.62, 0.25, ease.outBack, 0.2));
        const mv = ease.inOut(env(t, 0.86, 1.2));
        spare.position.lerpVectors(SPARE0, SPARE1, mv);
        spare.position.z = Math.sin(Math.PI * mv) * 2.5;   // lifted a little while it is carried
        beamG.position.copy(spare.position);
        const bOn = env(t, 0.66, 0.84) * (1 - 0.7 * env(t, 1.24, 1.5)) * (1 - e);
        beamMat.opacity = bOn;
        beam.visible = bOn > 0.01;

        /* waveguide: draws itself left to right (and retracts on exit), then the pulses */
        const draw = ease.inOut(env(t, 0.58, 1.0)) * (1 - ease.out(clamp(e * 2.2)));
        const segs = Math.round(TSEG * clamp(draw));
        tubeGeo.setDrawRange(0, segs * RSEG * 6);
        tube.visible = segs > 0;
        drawn = draw;
        couplers.forEach((c, i) => k.show(c, presence(t, e, i ? 0.98 : 0.6, 0.25, ease.outBack, 0) * (i ? 1 - ease.out(clamp(e * 3)) : 1)));
        const s = pulseS(t);
        if (s >= 0 && s <= Math.min(1, drawn) && e < 1) {
          curve.getPointAt(s, tmp2);
          pulseGl.position.set(tmp2.x, tmp2.y, tmp2.z + 1);
          pulseGl.material.opacity = 0.9 * bump(s, 1) ** 0.4 * (1 - e);
          pulseGl.visible = true;
        } else pulseGl.visible = false;
      },

      // q5: |0> |1> labels, the light pulse streak, the hand-lettered ket
      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0 || t < 0.3) return;
        const c = q.drawingContext || q.ctx;

        // pole labels (follow the tilt of the sphere)
        const la = presence(t, e, 0.5, 0.3, ease.out, 0.2);
        if (la > 0) {
          c.save();
          c.globalAlpha = la;
          c.font = "italic 600 9px Georgia, 'Times New Roman', serif";
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillStyle = '#e6f2ff';
          toScr(tmp2.set(0, BR, 0), sph); c.fillText('|0⟩', scr[0] - 9, scr[1] - 3);
          toScr(tmp2.set(0, -BR, 0), sph); c.fillText('|1⟩', scr[0] - 9, scr[1] + 4);
          c.restore();
        }

        // the light pulse: a short bright streak with a tiny star at its head
        const s = pulseS(t);
        if (s > 0 && s < Math.min(1, drawn)) {
          c.save(); c.globalAlpha = fade * bump(s, 1) ** 0.4; c.lineCap = 'round';
          c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2.2;
          c.beginPath();
          for (let i = 0; i <= 6; i++) {
            const u = clamp(s - 0.09 * (1 - i / 6), 0, 1);
            curve.getPointAt(u, tmp2);
            toScr(tmp2);
            if (i === 0) c.moveTo(scr[0], scr[1]); else c.lineTo(scr[0], scr[1]);
          }
          c.stroke();
          c.restore();
        }

        // |psi> = a|0> + b|1>, written on glyph by glyph in a light, slightly uneven hand
        const w = env(t, 1.0, 1.4);
        if (w > 0) {
          const [ex, ey] = k.screenAt(258, 424, 0);
          c.save();
          c.globalAlpha = fade * fade * presence(t, e, 1.0, 0.1, ease.out, 0.5);
          c.font = "italic 500 10.5px Georgia, 'Times New Roman', serif";
          c.textBaseline = 'middle'; c.textAlign = 'left';
          c.fillStyle = '#eaf4ff';
          let tw = 0;
          for (const ch of KET) tw += c.measureText(ch).width;
          let x = ex - tw / 2;
          const n = KET.length, shown = w * n;
          for (let i = 0; i < n; i++) {
            const ch = KET[i], adv = c.measureText(ch).width;
            if (i < shown) {
              const a = clamp(shown - i);
              c.save();
              c.globalAlpha *= a;
              c.translate(x + adv / 2, ey - (x - ex) * 0.035 + JIT[i % JIT.length] * 0.7);
              c.rotate(JIT[(i + 3) % JIT.length] * 0.05 - 0.035);
              c.fillText(ch, -adv / 2, (1 - a) * 2);
              c.restore();
            }
            x += adv;
          }
          c.restore();
        }
      },
    };
  },
};
