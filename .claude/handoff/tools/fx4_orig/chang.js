/* Chang — 高考状元 + 灭霸手套 (Gaokao top scorer + the Infinity Gauntlet)
   Click: a gold Infinity Gauntlet swings up out of her grip on the cup (her real index
   finger is re-layered over its cuff); the six stones light one by one (space, mind,
   reality, power, time, soul); SNAP — comic lettering and a ring shockwave, the hand ends
   on "No. 1"; two exam papers (数学 150, 理综 300) fly out of the snap and flip in with big
   red checks and a 满分 stamp; the gold 「温州市 · 高考状元」 plaque settles at the bottom.
   Loop (3.2 s): the stones shimmer in sequence, one small sparkle at the raised finger.
   Photo landmarks (512 px): eyes y 213 (x 65 / 190) · mouth 55-190 x 345 · cup 225-420 x 115-440 ·
   index finger across the cup 320-460 x 163-205 (the grip) · wall above the cup 250-480 x 0-115. */
import { THREE, presence, env, ease, clamp, lerp } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const GOLD = 0xeab53c, GOLD_D = 0xc98b1f, BRONZE = 0x6e4410, RED = '#d42a22', INK = '#16151a';
const KAI = "'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif";
const BLACK = "'Arial Black', 'Arial Bold', Impact, sans-serif";
const T_STONE = 0.3, D_STONE = 0.08;       // stone i lights at T_STONE + i * D_STONE
const T_SNAP = 0.82;
const T_LOOP = 1.6, BEAT = 3.2;
const bump = (x, w) => (x <= 0 || x >= w ? 0 : Math.sin(Math.PI * x / w));

export default {
  title: 'Gaokao top scorer with the Infinity Gauntlet',
  exit: 0.45,
  still: 2.2,
  plate: false,              // the plate's rim is black where the photo's circle is ragged; nothing parts here anyway
  async build(k) {
    const { root } = k;
    // one flat photo at z = 0 (no person/background parallax, so no ghost edge along her outline):
    // the props float in front of it and part from it when the stage tilts
    k.layers.photo.position.z = 0;
    k.layers.photo.scale.setScalar(1);
    k.layers.photo.material.depthTest = false;     // it is the backdrop: drawn first, never hides a prop
    k.layers.person.visible = false;
    const gold = k.toon(GOLD), goldD = k.toon(GOLD_D), bronze = k.toon(BRONZE);

    /* ① the gauntlet (a left hand, back to the viewer, thumb on the right) ---------------- */
    const pivot = new THREE.Group();                 // in her grip, behind her index finger
    const GRIP = k.at(382, 180, 10);
    pivot.position.copy(GRIP);
    root.add(pivot);
    const body = new THREE.Group();                  // centre of the back of the hand
    body.position.y = 18.5;
    pivot.add(body);

    const palm = new THREE.Mesh(new RoundedBoxGeometry(20, 18, 7.5, 3, 2.8), gold);
    k.ink(palm, 1.3);
    const ridge = new THREE.Mesh(new RoundedBoxGeometry(20.5, 5, 3.2, 2, 1.3), goldD);
    ridge.position.set(0, 6.4, 3.1);
    k.ink(ridge, 1);
    const plateM = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), goldD);
    plateM.scale.set(5.4, 5.8, 1.3);
    plateM.position.set(0, -1.8, 3.4);
    k.ink(plateM, 1);
    // wrist cuff: flared, elliptical, with a rolled rim (its lower half sits in her fist)
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 11.6, 13, 32, 1), goldD);
    cuff.position.y = -15.2;
    cuff.scale.z = 0.62;
    k.ink(cuff, 1.2);
    const band = new THREE.Mesh(new THREE.TorusGeometry(10.6, 1.2, 8, 40), gold);
    band.rotation.x = Math.PI / 2;
    band.scale.set(1, 0.62, 1);
    band.position.y = -13.4;
    k.ink(band, 0.9);
    body.add(palm, ridge, plateM, cuff, band);

    // fingers: pinky, ring, middle, index (left to right); each a chain of 3 armoured segments
    const FING = [
      { x: -7.3, w: 4.2, L: [5.4, 3.7, 3.1], rz: 0.12 },
      { x: -2.5, w: 4.8, L: [6.6, 4.4, 3.4], rz: 0.03 },
      { x: 2.4, w: 5.1, L: [7.2, 4.8, 3.6], rz: -0.02 },
      { x: 7.3, w: 4.9, L: [6.6, 4.4, 3.4], rz: -0.08 },
    ];
    const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 4, 12);
    const jointGeo = new THREE.TorusGeometry(1, 0.1, 6, 20);
    function chain(parent, def, mat) {
      const segs = [];
      let p = parent;
      def.L.forEach((L, i) => {
        const seg = new THREE.Group();
        if (i > 0) seg.position.y = def.L[i - 1];
        const r = def.w / 2 * (1 - i * 0.07);
        const m = new THREE.Mesh(capsule(r, Math.max(0.2, L - r * 0.4)), i === 0 ? mat : gold);
        m.position.y = L / 2;
        m.scale.z = 0.86;
        k.ink(m, 1.05);
        seg.add(m);
        if (i > 0) {                                   // armour joint: a thin dark band
          const band = new THREE.Mesh(jointGeo, bronze);
          band.scale.set(r * 1.01, r * 1.01 * 0.86, 5.5);
          band.rotation.x = Math.PI / 2;
          band.position.y = 0.3;
          seg.add(band);
        }
        p.add(seg);
        p = seg;
        segs.push(seg);
      });
      return segs;
    }
    const fingers = FING.map(def => {
      const base = new THREE.Group();
      base.position.set(def.x, 8, 0.2);
      base.rotation.z = def.rz;
      body.add(base);
      return { base, segs: chain(base, def, gold) };
    });
    const thumbBase = new THREE.Group();
    thumbBase.position.set(9.4, -3.6, 0.6);
    body.add(thumbBase);
    const thenar = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), gold);
    thenar.scale.set(4.2, 5.4, 3.4);
    thenar.position.set(7.2, -3.8, -0.4);
    k.ink(thenar, 1.1);
    body.add(thenar);
    const thumb = chain(thumbBase, { w: 5.4, L: [6.2, 4.6] }, gold);

    // the six stones, in the order they light (brief): space, mind, reality, power, time, soul
    const sockGeo = new THREE.TorusGeometry(1, 0.3, 8, 28);
    const gemGeo = new THREE.SphereGeometry(1, 20, 14);
    const hiGeo = new THREE.SphereGeometry(1, 10, 8);
    const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stoneDefs = [
      { c: 0x2f7dff, host: fingers[2].base, at: [0, -1.6, 4.9], r: 1.8 },    // space: middle knuckle
      { c: 0xffcc1a, host: body, at: [0, -1.8, 4.9], r: 2.9 },               // mind: back of the hand
      { c: 0xe3262d, host: fingers[1].base, at: [0, -1.6, 4.9], r: 1.7 },    // reality: ring knuckle
      { c: 0x9d3cf2, host: fingers[3].base, at: [0, -1.6, 4.9], r: 1.75 },   // power: index knuckle
      { c: 0x1dbf58, host: thumb[0], at: [0, 3.0, 2.6], r: 1.7 },            // time: thumb
      { c: 0xff8a1a, host: fingers[0].base, at: [0, -1.6, 4.9], r: 1.5 },    // soul: pinky knuckle
    ];
    const stones = stoneDefs.map((d) => {
      const g = new THREE.Group();
      g.position.set(...d.at);
      const sock = new THREE.Mesh(sockGeo, bronze);
      sock.scale.setScalar(d.r + 0.55);
      sock.scale.z = 1.4;
      const mat = k.toon(d.c);
      const gem = new THREE.Mesh(gemGeo, mat);
      gem.scale.set(d.r, d.r, d.r * 0.7);
      gem.position.z = 0.25;
      const hi = new THREE.Mesh(hiGeo, hiMat);
      hi.scale.setScalar(d.r * 0.28);
      hi.position.set(-d.r * 0.35, d.r * 0.38, d.r * 0.72);
      const glow = k.glowSprite('rgba(255,255,255,0.9)', d.r * 5.2, 0);
      glow.material.color.setHex(d.c);
      glow.position.z = 1.4;
      g.add(sock, gem, hi, glow);
      d.host.add(g);
      const base = new THREE.Color(d.c);
      return { g, gem, hi, glow, mat, base, dim: base.clone().multiplyScalar(0.3), r: d.r };
    });

    /* ② her real index and middle fingers (and the back of her hand) re-layered over the cuff */
    k.patch([
      // index finger: tip and top edge, then the back of her hand to the rim
      [319, 197], [322, 188], [329, 181], [339, 176], [352, 173], [370, 166], [385, 164], [400, 164],
      [415, 166], [430, 168], [446, 174], [456, 184], [464, 196], [478, 207], [496, 214], [512, 214],
      // down the hand, then back along the lower edge of the middle finger (the cuff passes behind both)
      [512, 300], [470, 262], [450, 236], [424, 231], [408, 234], [390, 239], [376, 243], [360, 247],
      [344, 251], [328, 259], [312, 267], [296, 271], [284, 267], [278, 256], [281, 246], [288, 237],
      [300, 226], [312, 215], [320, 207],
    ], 22);

    /* ③ exam papers: 数学 150 behind, 理综 300 in front (big red check, 满分 stamp) --------- */
    function roundRect(g, x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
      g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
      g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
    }
    const PW = 32, PH = 40;
    function drawPaper(g, W, H, subj, score, chk) {
      const s = W / PW;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#fffdf5'; g.strokeStyle = INK; g.lineWidth = 1.3 * s; g.lineJoin = 'round';
      roundRect(g, 0.8 * s, 0.8 * s, W - 1.6 * s, H - 1.6 * s, 1.6 * s);
      g.fill(); g.stroke();
      g.fillStyle = INK; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.font = `900 ${8.8 * s}px ${KAI}`;
      g.fillText(subj, 3.4 * s, 10.6 * s);
      g.strokeStyle = '#bdb6a8'; g.lineWidth = 1 * s; g.lineCap = 'round';
      [15.5, 19.5, 23.5, 27.5, 31.5, 35.5].forEach((y, i) => {
        g.beginPath(); g.moveTo(3.4 * s, y * s); g.lineTo((PW - 3.4 - (i % 2) * 5 - (i > 3 ? 12 : 0)) * s, y * s); g.stroke();
      });
      if (score) {
        // the teacher's score, red, double underlined, bottom right
        g.fillStyle = RED; g.font = `italic 700 ${10.5 * s}px Georgia, 'Times New Roman', serif`;
        g.textAlign = 'right';
        g.fillText(score, (PW - 3) * s, 35 * s);
        const sw = g.measureText(score).width;
        g.strokeStyle = RED; g.lineWidth = 0.9 * s;
        g.beginPath(); g.moveTo((PW - 3.4) * s - sw, 36.6 * s); g.lineTo((PW - 2.4) * s, 36.3 * s); g.stroke();
      }
      if (chk > 0) {
        // a teacher's big red check, drawn with the pen (fat stroke, thin tail)
        const pts = [[5, 19], [11.5, 29.5], [28.5, 7.5]];
        const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
        let d = chk * (l1 + l2);
        g.strokeStyle = RED; g.lineCap = 'round'; g.lineJoin = 'round';
        g.lineWidth = 3.1 * s;
        g.beginPath(); g.moveTo(pts[0][0] * s, pts[0][1] * s);
        const a = Math.min(1, d / l1);
        g.lineTo(lerp(pts[0][0], pts[1][0], a) * s, lerp(pts[0][1], pts[1][1], a) * s);
        g.stroke();
        d -= l1;
        if (d > 0) {
          const b = Math.min(1, d / l2);
          const n = 6;
          for (let i = 0; i < n; i++) {
            const u0 = (i / n) * b, u1 = ((i + 1) / n) * b;
            g.lineWidth = lerp(3.1, 1.4, u1) * s;
            g.beginPath();
            g.moveTo(lerp(pts[1][0], pts[2][0], u0) * s, lerp(pts[1][1], pts[2][1], u0) * s);
            g.lineTo(lerp(pts[1][0], pts[2][0], u1) * s, lerp(pts[1][1], pts[2][1], u1) * s);
            g.stroke();
          }
        }
      }
    }
    function makePaper(subj, score) {
      const grp = new THREE.Group();
      const card = k.card(PW, PH, (g, W, H) => drawPaper(g, W, H, subj, score, 0), { res: 2, side: THREE.DoubleSide, alphaTest: 0.05 });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(PW - 2, PH - 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
      shadow.position.set(1.4, -1.8, -0.6);
      grp.add(shadow, card);
      root.add(grp);
      return { grp, card, subj, score, drawn: -1 };
    }
    const paperB = makePaper('数学', '150');
    const paperF = makePaper('理综', '');
    const papers = [
      { p: paperB, home: k.at(281, 354, 6), rz: 0.16, t0: T_SNAP + 0.04, chkT: T_SNAP + 0.26 },
      { p: paperF, home: k.at(356, 360, 9), rz: -0.12, t0: T_SNAP + 0.1, chkT: T_SNAP + 0.32 },
    ];
    // 满分 stamp, pressed onto the front paper
    const stamp = k.card(23, 13, (g, W, H) => {
      const s = W / 23;
      g.save(); g.translate(W / 2, H / 2);
      g.strokeStyle = RED; g.fillStyle = 'rgba(255,250,240,0.55)'; g.lineWidth = 1.4 * s;
      roundRect(g, -10.6 * s, -5.6 * s, 21.2 * s, 11.2 * s, 1.8 * s); g.fill(); g.stroke();
      g.lineWidth = 0.6 * s;
      roundRect(g, -9.2 * s, -4.3 * s, 18.4 * s, 8.6 * s, 1.1 * s); g.stroke();
      g.fillStyle = RED; g.font = `900 ${8.2 * s}px ${KAI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('满分', 0, 0.5 * s);
      g.restore();
    }, { res: 3, alphaTest: 0.02, depthWrite: false });
    stamp.position.set(4.5, -11.5, 0.4);
    stamp.renderOrder = 2;
    paperF.card.add(stamp);

    /* ④ the plaque 「温州市 · 高考状元」: gold frame, red lacquer panel, gold letters ------- */
    const plaque = new THREE.Group();
    const PLW = 80, PLH = 31;
    const slab = new THREE.Mesh(new RoundedBoxGeometry(PLW, PLH, 5, 3, 2.2), gold);
    k.ink(slab, 1.4);
    const panel = k.card(PLW - 7, PLH - 7, (g, W, H) => {
      const s = W / (PLW - 7);
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#c9291f'); gr.addColorStop(1, '#9e1b15');
      g.fillStyle = gr; g.strokeStyle = INK; g.lineWidth = 1 * s;
      roundRect(g, 0.6 * s, 0.6 * s, W - 1.2 * s, H - 1.2 * s, 1.4 * s); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,214,110,0.75)'; g.lineWidth = 0.5 * s;
      roundRect(g, 2 * s, 2 * s, W - 4 * s, H - 4 * s, 0.8 * s); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffe7a0';
      g.font = `900 ${8 * s}px ${KAI}`;
      g.fillText('温 州 市', W / 2, 7 * s);
      g.font = `900 ${12 * s}px ${KAI}`;
      g.lineWidth = 1.2 * s; g.strokeStyle = '#5a0d0a'; g.lineJoin = 'round';
      g.strokeText('高考状元', W / 2, 17 * s);
      g.fillStyle = '#ffd766';
      g.fillText('高考状元', W / 2, 17 * s);
    }, { res: 2 });
    panel.position.z = 2.6;
    const studGeo = new THREE.SphereGeometry(1.3, 12, 8);
    [-1, 1].forEach(sx => {
      const st = new THREE.Mesh(studGeo, goldD);
      st.position.set(sx * (PLW / 2 - 2.2), 0, 2.4);
      plaque.add(st);
    });
    plaque.add(slab, panel);
    const PLAQUE_HOME = k.at(280, 441, 16);
    plaque.position.copy(PLAQUE_HOME);
    root.add(plaque);

    /* pose helpers -------------------------------------------------------------------- */
    // finger curl (proximal joint, radians; the next joints follow); + = toward the palm (away from us)
    const OPEN = [0.28, 0.22, 0.2, 0.16], PRE = [1.25, 1.2, 0.75, 0.22], SNAP = [1.35, 1.3, 1.5, 0.05];
    const TH_OPEN = [-0.8, -0.25], TH_PRE = [-0.2, -0.95], TH_SNAP = [-0.5, -0.5];
    const curl = [0, 0, 0, 0], th = [0, 0];
    function pose(a, b, u, a2, b2) {
      for (let i = 0; i < 4; i++) curl[i] = lerp(a[i], b[i], u);
      th[0] = lerp(a2[0], b2[0], u); th[1] = lerp(a2[1], b2[1], u);
    }
    // every prop goes in the transparent pass, after the photo backdrop (which ignores depth)
    const LAYERS = Object.values(k.layers);
    root.traverse(o => { if (o.material && !LAYERS.includes(o)) o.material.transparent = true; });

    const tmp = new THREE.Vector3();
    const P0 = new THREE.Vector3();
    const scr = [0, 0];
    function toScr(obj, x, y, z, out = scr) {
      tmp.set(x, y, z).applyMatrix4(obj.matrixWorld).project(k.camera);
      out[0] = (tmp.x + 1) / 2 * k.W; out[1] = (1 - tmp.y) / 2 * k.H;
      return out;
    }
    const loopT = t => (t < T_LOOP ? -1 : (t - T_LOOP) % BEAT);
    const lit = { on: 0, extra: 0 };
    function stoneLit(i, t) {
      lit.on = env(t, T_STONE + i * D_STONE, T_STONE + i * D_STONE + 0.09);
      const lt = loopT(t);
      lit.extra = 0.9 * bump(t - T_SNAP, 0.4) + (lt < 0 ? 0 : 0.85 * bump(lt - i * 0.07, 0.26));
      return lit;
    }

    return {
      update(t, e) {
        /* gauntlet: swing up out of the grip, light, snap */
        const inn = presence(t, e, 0.02, 0.3, ease.out, 0);
        k.show(pivot, inn, 1.45);
        const sw = ease.outBack(env(t, 0.02, 0.44), 1.4);
        const out = ease.in(clamp(e * 1.6));
        const lt = loopT(t);
        const sway = lt < 0 ? 0 : 0.025 * Math.sin(lt / BEAT * Math.PI * 2);
        const recoil = 0.07 * bump(t - T_SNAP, 0.22);
        pivot.rotation.set(-0.06, -0.3, lerp(-1.2, 0.42, sw) + sway + recoil - out * 1.1);

        if (t < T_SNAP - 0.14) pose(OPEN, OPEN, 0, TH_OPEN, TH_OPEN);
        else if (t < T_SNAP) pose(OPEN, PRE, ease.inOut(env(t, T_SNAP - 0.14, T_SNAP - 0.02)), TH_OPEN, TH_PRE);
        else pose(PRE, SNAP, ease.out(env(t, T_SNAP, T_SNAP + 0.06)), TH_PRE, TH_SNAP);
        // once per beat the raised finger gives a tiny flick (the sparkle is drawn in q5)
        const flick = lt < 0 ? 0 : 0.12 * bump(lt - 0.52, 0.26);
        fingers.forEach((f, i) => {
          const c = curl[i] + (i === 3 ? -flick : 0);
          f.segs[0].rotation.x = -c;
          f.segs[1].rotation.x = -c * 1.15;
          f.segs[2].rotation.x = -c * 0.8;
        });
        thumbBase.rotation.set(th[1], 0, th[0]);
        thumb[1].rotation.x = th[1] * 0.6;

        stones.forEach((s, i) => {
          const { on, extra } = stoneLit(i, t);
          const lv = on * (1 - e);
          s.mat.color.copy(s.dim).lerp(s.base, on);
          s.mat.emissive.copy(s.base).multiplyScalar(clamp(0.34 * lv + 0.35 * extra * lv, 0, 0.8));
          s.hi.visible = lv > 0.5;
          s.glow.material.opacity = clamp(lv * (0.35 + 0.5 * extra), 0, 1);
          s.glow.scale.setScalar(s.r * (4.4 + 2.6 * extra + 3 * bump(t - (T_STONE + i * D_STONE), 0.25)));
        });

        /* papers: fly out of the snap, flip in, get checked */
        pivot.updateMatrixWorld(true);
        P0.set(0, 12, 2).applyMatrix4(body.matrixWorld);
        root.worldToLocal(P0);
        papers.forEach((pp, i) => {
          const a = presence(t, e, pp.t0, 0.3, ease.out, 0.25 + i * 0.1);
          const u = ease.out(env(t, pp.t0, pp.t0 + 0.36));
          const g = pp.p.grp;
          k.show(g, a);
          g.position.lerpVectors(P0, pp.home, u);
          g.position.y += Math.sin(Math.PI * u) * 12;
          g.rotation.set(0, (1 - u) * Math.PI * 2.2, lerp(0.9, pp.rz, ease.outBack(env(t, pp.t0, pp.t0 + 0.4))));
          const chk = Math.round(env(t, pp.chkT, pp.chkT + 0.16) * 16) / 16;
          if (chk !== pp.p.drawn) {
            const cv = pp.p.card.material.map.image;
            drawPaper(cv.getContext('2d'), cv.width, cv.height, pp.p.subj, pp.p.score, chk);
            pp.p.card.material.map.needsUpdate = true;
            pp.p.drawn = chk;
          }
        });
        const st = env(t, T_SNAP + 0.47, T_SNAP + 0.58);
        k.show(stamp, st > 0 ? lerp(1.9, 1, ease.out(st)) : 0);
        stamp.material.opacity = st;
        stamp.rotation.z = -0.28 + (1 - st) * 0.3;

        /* plaque: rises and settles with a little rock */
        const pl = presence(t, e, T_SNAP + 0.12, 0.42, ease.outBack, 0.55);
        k.show(plaque, pl);
        const ps = env(t, T_SNAP + 0.12, T_SNAP + 0.9);
        plaque.position.set(PLAQUE_HOME.x, PLAQUE_HOME.y - 18 * (1 - ease.outBack(env(t, T_SNAP + 0.12, T_SNAP + 0.5))), PLAQUE_HOME.z);
        plaque.rotation.set(-0.12, 0.1, 0.06 * Math.sin(ps * Math.PI * 3) * (1 - ps) - 0.035);
      },

      // q5: stone glints, SNAP! lettering, ring shockwave, the loop sparkle
      draw2d(q, t, e) {
        const fade = 1 - e;
        if (fade <= 0 || t < T_STONE) return;
        const c = q.drawingContext || q.ctx;
        const star = (x, y, r, a, rot = 0) => {
          if (r <= 0.2 || a <= 0) return;
          c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha = a;
          c.beginPath();
          for (let i = 0; i < 8; i++) {
            const rr = i % 2 ? r * 0.28 : r, an = i * Math.PI / 4;
            c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
          }
          c.closePath();
          c.fillStyle = '#ffffff'; c.strokeStyle = INK; c.lineWidth = 1; c.lineJoin = 'round';
          c.fill(); c.stroke(); c.restore();
        };
        // a glint as each stone lights
        stones.forEach((s, i) => {
          const g = env(t, T_STONE + i * D_STONE, T_STONE + i * D_STONE + 0.22);
          if (g <= 0 || g >= 1) return;
          toScr(s.g, -s.r * 0.6, s.r * 0.7, 1.5);
          star(scr[0], scr[1], (3.2 + s.r) * Math.sin(Math.PI * g), fade, g * 1.2);
        });

        // SNAP: shockwave ring + impact lines + lettering
        toScr(body, 3, 13, 2);
        const sx = scr[0], sy = scr[1];
        const w = env(t, T_SNAP, T_SNAP + 0.5);
        if (w > 0 && w < 1) {
          const [cx, cy] = k.screenAt(256, 256, 0);
          c.save();
          c.beginPath(); c.arc(cx, cy, k.R, 0, Math.PI * 2); c.clip();
          const r = 5 + 190 * ease.out(w);
          const a = (1 - w) * fade;
          c.globalAlpha = a;
          c.lineWidth = 5; c.strokeStyle = INK;
          c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.stroke();
          c.lineWidth = 2.6; c.strokeStyle = '#fff4c9';
          c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.stroke();
          const r2 = r * 0.72;
          c.globalAlpha = a * 0.7; c.lineWidth = 1.4; c.strokeStyle = '#ffd24a';
          c.beginPath(); c.arc(sx, sy, r2, 0, Math.PI * 2); c.stroke();
          c.restore();
        }
        const il = env(t, T_SNAP, T_SNAP + 0.16);
        if (il > 0 && il < 1) {
          c.save(); c.strokeStyle = INK; c.lineCap = 'round'; c.globalAlpha = fade;
          for (let i = 0; i < 7; i++) {
            const an = -Math.PI * 0.95 + i * (Math.PI * 1.15 / 6);
            const r0 = 8 + 10 * il, r1 = r0 + 7 * (1 - il) + 2;
            c.lineWidth = 1.8;
            c.beginPath(); c.moveTo(sx + Math.cos(an) * r0, sy + Math.sin(an) * r0);
            c.lineTo(sx + Math.cos(an) * r1, sy + Math.sin(an) * r1); c.stroke();
          }
          c.restore();
        }
        const lp = env(t, T_SNAP, T_SNAP + 0.1);
        const lo = 1 - env(t, T_SNAP + 0.62, T_SNAP + 0.8);
        if (lp > 0 && lo > 0) {
          const [lx, ly] = k.screenAt(262, 70, 0);
          c.save();
          c.translate(lx, ly); c.rotate(-0.2);
          const sc = lerp(1.6, 1, ease.outBack(lp)) * (0.85 + 0.15 * lo);
          c.scale(sc, sc);
          c.globalAlpha = fade * lo;
          c.font = `italic 900 17px ${BLACK}`;
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.lineJoin = 'round';
          c.lineWidth = 5; c.strokeStyle = INK; c.strokeText('SNAP!', 0, 0);
          c.fillStyle = '#ffd33d'; c.fillText('SNAP!', 0, 0);
          c.restore();
        }

        // loop: one small sparkle at the raised index finger per beat
        const lt = loopT(t);
        if (lt >= 0) {
          const sp = env(lt, 0.54, 0.8);
          if (sp > 0 && sp < 1) {
            toScr(fingers[3].segs[2], 0, 4.4, 0);
            star(scr[0] + 3, scr[1] - 3, 5 * Math.sin(Math.PI * sp), fade, sp * 1.5);
          }
        }
      },
    };
  },
};
