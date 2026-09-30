/* Zaifeng — 院士 Academician
   Click: a mortarboard (toon black + ink, gold 「院士」 on the board, a gold tassel on a little
   pendulum) drops onto his head and squashes; confetti bursts; two freshly accepted papers (title,
   a figure, a red ACCEPTED stamp) pop up out of his V-sign hands and sit between his fingers (his
   real fingers are re-layered in front of them); "+1" pops over each paper.
   Loop (3.6 s beat): the tassel sways, the papers wiggle, one "+1" pops per beat, alternating.
   Photo landmarks (512 px): hair top 350,80 · head 277-415 x · eyes y 195 ·
   left V: index tip 215,213, middle tip 231,213, crotch 225,248 · right V: index tip 446,286,
   middle tip 461,301, crotch 427,326 · both palms below the crotches. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';

const BLACK = 0x2a2931, GOLD = 0xe8b43c, INK = 0x16151a;
const BEAT = 3.6;
const T_LAND = 0.46;

/** the real hand, re-layered in front: only skin-coloured pixels of the cut-out inside `box` */
function skinPatch(k, box, z) {
  const [u0, v0, u1, v1] = box, w = u1 - u0, h = v1 - v0;
  const img = k.layers.person.material.map.image;
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const sg = src.getContext('2d', { willReadFrequently: true });
  sg.drawImage(img, u0 * img.width / 512, v0 * img.height / 512, w * img.width / 512, h * img.height / 512, 0, 0, w, h);
  const d = sg.getImageData(0, 0, w, h);
  const p = d.data, keep = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2], a = p[i * 4 + 3];
    keep[i] = a > 20 && r > 95 && g > 60 && b > 45 && r >= g && r > b && g > 0.62 * r && (r - Math.min(g, b)) > 10 ? 1 : 0;
  }
  // grow the mask by a pixel: the darker edge pixels come along and read as a thin outline
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let on = keep[i];
    if (!on) for (let dy = -1; dy <= 1 && !on; dy++) for (let dx = -1; dx <= 1 && !on; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && keep[yy * w + xx] === 1) on = 1;
    }
    if (!on) p[i * 4 + 3] = 0;
  }
  sg.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  const D = k.D;
  const geo = new THREE.PlaneGeometry(w * D / 512, h * D / 512);
  geo.translate(((u0 + u1) / 2 / 512 - 0.5) * D, (0.5 - (v0 + v1) / 2 / 512) * D, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.position.z = z;
  m.scale.setScalar(k.depthScale(z));
  m.renderOrder = 20;
  k.root.add(m);
  return m;
}

/** a paper sheet, drawn once (canvas px = 8 per world px): the top stays clear of his fingers, so the
    title and the red ACCEPTED stamp sit there; columns and a figure fill the rest */
function drawPaper(accent, seed) {
  return (g, w, h) => {
    const s = w / 34, r = rng(seed);
    g.fillStyle = '#fdfcf6'; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(3 * s, 2.4 * s, 8 * s, 1.7 * s);
    g.fillStyle = '#20232c';
    g.fillRect(3 * s, 5.6 * s, 28 * s, 2.1 * s); g.fillRect(3 * s, 8.8 * s, 19 * s, 2.1 * s);
    g.fillStyle = '#868b98'; g.fillRect(7 * s, 12.2 * s, 20 * s, 0.9 * s);
    g.fillStyle = '#b7bbc5';
    for (let i = 0; i < 12; i++) g.fillRect(3 * s, (21 + i * 2.1) * s, (11 + r() * 2.5) * s, 0.8 * s);
    for (let i = 0; i < 6; i++) g.fillRect(18.5 * s, (32 + i * 2.1) * s, (10.5 + r() * 2) * s, 0.8 * s);
    // the figure: a small bar chart, the last bar (ours) wins
    g.strokeStyle = '#5a5f6e'; g.lineWidth = 0.45 * s;
    g.strokeRect(18.5 * s, 21 * s, 12.5 * s, 9 * s);
    [3.2, 4.6, 3.9, 7.4].forEach((hh, i) => { g.fillStyle = i === 3 ? accent : '#9aa0ad'; g.fillRect((19.8 + i * 2.8) * s, (29.4 - hh) * s, 1.9 * s, hh * s); });
    // the stamp, across the top half
    g.save();
    g.translate(17 * s, 15.6 * s); g.rotate(-0.2);
    g.strokeStyle = '#d3262b'; g.fillStyle = '#d3262b';
    g.lineWidth = 1.3 * s;
    g.beginPath(); if (g.roundRect) g.roundRect(-15.2 * s, -5.6 * s, 30.4 * s, 11.2 * s, 1.6 * s); else g.rect(-15.2 * s, -5.6 * s, 30.4 * s, 11.2 * s); g.stroke();
    g.lineWidth = 0.4 * s; g.strokeRect(-13.8 * s, -4.3 * s, 27.6 * s, 8.6 * s);
    g.font = `bold ${9.4 * s}px Impact, Haettenschweiler, 'Arial Narrow', 'Arial Black', sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ACCEPTED', 0, 0.4 * s, 25.5 * s);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 22; i++) { g.beginPath(); g.arc((r() - 0.5) * 31 * s, (r() - 0.5) * 11.5 * s, (0.12 + r() * 0.22) * s, 0, 6.283); g.fill(); }
    g.restore();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#a9adb8'; g.lineWidth = 0.5 * s; g.strokeRect(0.25 * s, 0.25 * s, w - 0.5 * s, h - 0.5 * s);
  };
}

export default {
  title: 'Academician',
  exit: 0.45,
  still: 2.4,
  async build(k) {
    const { root } = k;

    // ① the mortarboard: hat (placement) -> squash (landing) -> cap, board, label, button, cord
    const hat = new THREE.Group(), squash = new THREE.Group();
    hat.add(squash);
    const capR = 23, capH = 11, BW = 58, BT = 3.2;
    const clip = (m) => k.clip(m);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.97, capR, capH, 40), clip(k.toon(BLACK)));
    cap.position.y = capH / 2;
    k.ink(cap, 1.3);
    const board = new THREE.Mesh(new THREE.BoxGeometry(BW, BT, BW), clip(k.toon(BLACK)));
    board.position.y = capH + BT / 2;
    k.ink(board, 1.5);
    const goldMat = clip(k.toon(GOLD));
    const button = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.1, 1.6, 20), goldMat);
    button.position.y = capH + BT + 0.8;
    // gold 「院士」 on the board top
    const label = k.card(40, 20, (g, w, h) => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${h * 0.86}px 'Kaiti SC', STKaiti, KaiTi, 'Songti SC', STSong, SimSun, serif`;
      g.lineJoin = 'round';
      g.strokeStyle = '#4a2d05'; g.lineWidth = h * 0.1; g.strokeText('院士', w / 2, h * 0.54);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.5, '#f2c14e'); gr.addColorStop(1, '#c58a1c');
      g.fillStyle = gr; g.fillText('院士', w / 2, h * 0.54);
    }, { res: 3 });
    clip(label.material);
    label.rotation.x = -Math.PI / 2;
    label.rotation.z = 0;
    label.position.set(0, capH + BT + 0.08, 6);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, BW / 2, 8), goldMat);
    cord.rotation.z = Math.PI / 2;
    cord.position.set(BW / 4, capH + BT + 0.7, 0);
    squash.add(cap, board, button, label, cord);
    const hatHome = k.at(344, 110, 30);
    hat.position.copy(hatHome);
    hat.rotation.set(0.62, -0.22, 0.07);
    root.add(hat);
    // the tassel hangs from the board edge in world "down", so it lives in root and follows the anchor
    const tassel = new THREE.Group();
    const strandTex = k.canvasTexture(64, 64, (g, w, h) => {
      g.fillStyle = '#e8b43c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a8761a'; g.lineWidth = 2.5;
      for (let x = 2; x < w; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    });
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 11, 8), goldMat);
    hang.position.y = -5.5;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), goldMat);
    knot.position.y = -11.8;
    k.ink(knot, 1.1);
    const fringe = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.6, 11, 16), clip(k.toon(0xffffff, { map: strandTex })));
    fringe.position.y = -18.8;
    k.ink(fringe, 1.1);
    tassel.add(hang, knot, fringe);
    root.add(tassel);
    const anchorLocal = new THREE.Vector3(BW / 2 + 0.4, capH + BT + 0.4, 0);
    const anchor = new THREE.Vector3();

    // ② the papers, pivoting at the grip (bottom centre, hidden behind the curled fingers)
    const PW = 34, PH = 46, PB = 6;       // width, height, how far the bottom edge sits below the grip
    const mkPaper = (accent, seed) => {
      const tex = k.canvasTexture(272, 368, drawPaper(accent, seed));
      const side = k.toon(0xf4f2ea);
      const geo = new THREE.BoxGeometry(PW, PH, 0.8);
      geo.translate(0, PH / 2 - PB, 0);
      const m = new THREE.Mesh(geo, [side, side, side, side, k.toon(0xffffff, { map: tex }), side]);
      k.ink(m, 1.2);
      const g = new THREE.Group();
      g.add(m);
      root.add(g);
      return g;
    };
    const papers = [
      { g: mkPaper('#c8322f', 3), home: k.at(224, 276, 5), rz: 0.2, t0: 0.5, sway: 0 },
      { g: mkPaper('#2f6fc8', 8), home: k.at(411, 350, 5), rz: -0.46, t0: 0.62, sway: 1.9 },
    ];
    papers.forEach(p => p.g.position.copy(p.home));
    // his real fingers in front of the papers
    skinPatch(k, [188, 196, 266, 336], 10);
    skinPatch(k, [364, 272, 478, 404], 10);

    // "+1" and confetti (q5) — fixed random streams
    const rc = rng(21);
    const confetti = Array.from({ length: 26 }, (_, i) => {
      const a = -Math.PI / 2 + (rc() - 0.5) * 2.6;
      const sp = 70 + rc() * 90;
      return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 2.6 + rc() * 2.4, h: 1.6 + rc() * 1.4, spin: (rc() - 0.5) * 16, flip: 6 + rc() * 10,
        col: [[242, 193, 78], [228, 87, 46], [43, 179, 163], [58, 123, 213], [255, 255, 255], [242, 193, 78]][i % 6], d: rc() * 0.08 };
    });
    const tipL = new THREE.Vector3(), tipR = new THREE.Vector3();
    const plusOf = (t, e) => {
      // [paper index, start time] of the "+1"s that may be showing
      const list = [[0, 0.95], [1, 1.12]];
      if (t > 1.8) {
        const n = Math.floor((t - 1.8) / BEAT);
        for (let j = Math.max(0, n - 1); j <= n; j++) list.push([j % 2, 1.8 + j * BEAT + 0.35]);
      }
      return list;
    };

    return {
      update(t, e) {
        // hat: falls, squashes on landing, settles; tassel lags then swings
        const hin = presence(t, e, 0.06, T_LAND - 0.06, ease.out, 0.2);
        const fall = 1 - ease.in(env(t, 0.06, T_LAND));
        const fly = ease.in(clamp(e * 1.6 - 0.12));
        k.show(hat, Math.min(1, hin * 1.4));
        hat.position.set(hatHome.x + fly * 30, hatHome.y + fall * 42 + fly * 70, hatHome.z);
        const ts = t - T_LAND;
        const sq = ts > 0 ? Math.exp(-ts * 7) * Math.cos(ts * 26) : 0;
        squash.scale.set(1 + 0.14 * sq, 1 - 0.24 * sq, 1 + 0.14 * sq);
        squash.rotation.z = ts > 0 ? Math.exp(-ts * 5) * Math.sin(ts * 17) * 0.06 : 0;
        hat.updateMatrix(); squash.updateMatrix();
        anchor.copy(anchorLocal).applyMatrix4(squash.matrix).applyMatrix4(hat.matrix);
        tassel.position.copy(anchor);
        k.show(tassel, hat.visible ? hat.scale.x : 0);
        // pendulum: trails up while falling, kicks on landing, then a calm sway
        const kick = ts > 0 ? Math.exp(-ts * 2.6) * Math.sin(ts * 9.5) * 0.75 : -0.9 * env(t, 0.1, T_LAND);
        const sway = Math.sin(t * Math.PI * 2 / BEAT) * 0.12 + Math.sin(t * 1.3) * 0.04;
        tassel.rotation.set(sway * 0.8 + (ts > 0 ? Math.exp(-ts * 3) * Math.sin(ts * 8) * 0.3 : 0), 0, 0.12 + kick + sway);

        // papers pop up out of the hands
        papers.forEach((p, i) => {
          const a = presence(t, e, p.t0, 0.42, (x) => ease.outBack(x, 2.4), 0.4 + i * 0.2);
          k.show(p.g, a);
          const wig = Math.sin(t * Math.PI * 2 / BEAT + p.sway) * 0.045 + Math.sin(t * 2.3 + i) * 0.015;
          p.g.rotation.set(0, 0, p.rz + wig + (1 - Math.min(1, a)) * (i ? -0.6 : 0.6));
          p.g.position.set(p.home.x, p.home.y - (1 - Math.min(1, a)) * 6, p.home.z);
        });
      },

      draw2d(q, t, e) {
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const c = q.ctx || q.drawingContext;
        const [cx, cy] = k.screenAt(256, 256, 0);
        c.save();
        c.beginPath(); c.arc(cx, cy, k.R, 0, Math.PI * 2); c.clip();
        // confetti from the hat top on landing
        const ct = t - T_LAND;
        if (ct > 0 && ct < 1.2) {
          const [ox, oy] = k.screenAt(346, 70, 30);
          q.noStroke();
          for (const p of confetti) {
            const s = ct - p.d;
            if (s <= 0) continue;
            const x = ox + p.vx * s * 0.9, y = oy + p.vy * s + 170 * s * s;
            const a = (1 - env(ct, 0.75, 1.2)) * fade;
            q.push(); q.translate(x, y); q.rotate(p.spin * s);
            q.scale(1, Math.cos(p.flip * s));
            q.fill(p.col[0], p.col[1], p.col[2], 255 * a); q.rect(-p.w / 2, -p.h / 2, p.w, p.h);
            q.pop();
          }
        }
        c.restore();
        // "+1" over the papers
        tipL.set(0, 42, 0).applyMatrix4(papers[0].g.matrix);
        tipR.set(0, 42, 0).applyMatrix4(papers[1].g.matrix);
        c.save();
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        for (const [i, s0] of plusOf(t, e)) {
          const s = t - s0;
          if (s < 0 || s > 0.95) continue;
          const pop = ease.outBack(env(s, 0, 0.2), 2.6);
          const a = (1 - env(s, 0.6, 0.95)) * fade * (papers[i].g.visible ? 1 : 0);
          if (a <= 0) continue;
          const [x, y] = k.toScreen(i ? tipR : tipL);
          c.save();
          c.translate(x + (i ? 4 : -4), y - 6 - 16 * ease.out(env(s, 0, 0.95)));
          c.rotate(i ? 0.12 : -0.12);
          c.scale(pop, pop);
          c.globalAlpha = a;
          c.font = "900 13px 'Arial Black', Impact, sans-serif";
          c.strokeStyle = '#16151a'; c.lineWidth = 4; c.strokeText('+1', 0, 0);
          c.fillStyle = '#3ccf6b'; c.fillText('+1', 0, 0);
          c.restore();
        }
        c.restore();
      },
    };
  },
};
