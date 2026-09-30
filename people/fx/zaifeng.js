/* Zaifeng — 院士 Academician
   Click: a mortarboard (a fitted black skull cap with a gold 「院士」 band, a bevelled board, a gold
   button, cord and tassel on a little pendulum) drops onto his head and squashes; confetti and stars
   burst. He raises a paper in each V-sign hand: the sheet covers the V and its bottom edge sits in
   his fist (his curled fingers are re-layered in front of it). Then the paper mill starts: a volley
   of ten papers shoots out of the two hands in 0.5 s, each with its own "+1", and the counter races
   (its paper pile grows by a sheet per volley).
   Loop (4 s beat): one volley per beat (busy ~1.2 s with the sheets' flight), otherwise calm — the
   tassel sways, the papers breathe.
   Photo landmarks (512 px): hair top 345,80 · head 283-415 x at y 140 · glasses y 180-207 ·
   left V: index tip 215,212, middle tip 231,211, V base / curled fingers y 262, fist 190-262 x 262-318 ·
   right V: index tip 441,284, middle tip 458,299, crotch 427,321, V base y ~322, curled fingers
   380-447 x 327-352, palm 372-420 x 320-390. */
import { THREE, presence, env, ease, clamp, lerp, rng } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const BLACK = 0x2b2a33, GOLD = 0xe8b43c;
const BEAT = 4;
const T_LAND = 0.46;                        // the mortarboard lands
const T_PAPER = [0.5, 0.62];                // the papers come up out of the fists
const T_VOLLEY = 1.0;                       // the first volley; then one per beat
const SHOTS = [0, 0.08, 0.15, 0.21, 0.27, 0.32, 0.36, 0.4, 0.44, 0.48];   // accelerating, left / right in turn
const LIFE = 0.7;                           // a flying sheet's flight
const FONT_ZH = "'Songti SC', STSong, 'Noto Serif CJK SC', 'Source Han Serif SC', 'Microsoft YaHei', 'PingFang SC', 'WenQuanYi Zen Hei', serif";
const FONT_PLUS = "900 {px}px 'Arial Black', 'Helvetica Neue', Impact, sans-serif";
const VENUES = ['#c8322f', '#2f6fc8', '#2a9d5c', '#7b4bc4', '#e07a1f'];

/** the shots fired up to t (the counter), and the volley under way */
function volley(t) {
  if (t < T_VOLLEY) return { n: 0, b: -1, lt: -1 };
  const b = Math.floor((t - T_VOLLEY) / BEAT), lt = t - T_VOLLEY - b * BEAT;
  let n = 0;
  for (const s of SHOTS) if (s <= lt) n++;
  return { n: b * SHOTS.length + n, b, lt };
}
/** a few fixed random numbers for shot j of volley b */
function rand(b, j) {
  const r = rng(b * 131 + j * 17 + 7);
  r();
  return [r(), r(), r(), r(), r(), r()];
}

/** the real hand, re-layered in front: only skin-coloured pixels of the cut-out inside `poly` */
function skinPatch(k, poly, z) {
  const us = poly.map(p => p[0]), vs = poly.map(p => p[1]);
  const u0 = Math.floor(Math.min(...us)), v0 = Math.floor(Math.min(...vs));
  const u1 = Math.ceil(Math.max(...us)), v1 = Math.ceil(Math.max(...vs));
  const S = 2;                                   // canvas px per photo px
  const w = (u1 - u0) * S, h = (v1 - v0) * S;
  const img = k.layers.person.material.map.image;
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const sg = src.getContext('2d', { willReadFrequently: true });
  sg.beginPath();
  poly.forEach(([u, v], i) => (i ? sg.lineTo : sg.moveTo).call(sg, (u - u0) * S, (v - v0) * S));
  sg.closePath(); sg.clip();
  sg.drawImage(img, u0 * img.width / 512, v0 * img.height / 512, (u1 - u0) * img.width / 512, (v1 - v0) * img.height / 512, 0, 0, w, h);
  const d = sg.getImageData(0, 0, w, h);
  const p = d.data, keep = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2], a = p[i * 4 + 3];
    keep[i] = a > 20 && r > 95 && g > 60 && b > 45 && r >= g && r > b && g > 0.6 * r && (r - Math.min(g, b)) > 8 ? 1 : 0;
  }
  // grow the mask by two canvas px: the darker edge of the fingers comes along and reads as an outline
  for (let pass = 0; pass < 2; pass++) {
    const src2 = keep.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src2[i] || p[i * 4 + 3] < 20) continue;
      if ((x > 0 && src2[i - 1]) || (x < w - 1 && src2[i + 1]) || (y > 0 && src2[i - w]) || (y < h - 1 && src2[i + w])) keep[i] = 1;
    }
  }
  for (let i = 0; i < w * h; i++) if (!keep[i]) p[i * 4 + 3] = 0;
  sg.putImageData(d, 0, 0);
  const tex = new THREE.CanvasTexture(src);
  tex.colorSpace = THREE.SRGBColorSpace;
  const D = k.D;
  const geo = new THREE.PlaneGeometry((u1 - u0) * D / 512, (v1 - v0) * D / 512);
  geo.translate(((u0 + u1) / 2 / 512 - 0.5) * D, (0.5 - (v0 + v1) / 2 / 512) * D, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.position.z = z;
  m.scale.setScalar(k.depthScale(z));
  m.renderOrder = 20;
  k.root.add(m);
  return m;
}

/** the held paper (canvas px = 8 per world px). The bottom third sits in his fist, so the venue tag,
    the title and the red ACCEPTED stamp are in the top two thirds */
function drawPaper(venue, accent, seed) {
  return (g, w, h) => {
    const s = w / 32, r = rng(seed);
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    // venue tag
    g.fillStyle = accent;
    g.beginPath(); g.roundRect ? g.roundRect(2.6 * s, 2.4 * s, 15.5 * s, 5.6 * s, 1 * s) : g.rect(2.6 * s, 2.4 * s, 15.5 * s, 5.6 * s); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${4.3 * s}px 'Helvetica Neue', Arial, sans-serif`;
    g.fillText(venue, 10.35 * s, 5.35 * s, 14 * s);
    // title, authors
    g.fillStyle = '#1f2433';
    g.fillRect(2.6 * s, 10.2 * s, 26.5 * s, 2 * s); g.fillRect(2.6 * s, 13.3 * s, 18.5 * s, 2 * s);
    g.fillStyle = '#8a8f9c'; g.fillRect(2.6 * s, 16.7 * s, 22 * s, 0.8 * s);
    // two columns of text and a figure (ours wins)
    g.fillStyle = '#b9bdc7';
    for (let i = 0; i < 9; i++) g.fillRect(2.6 * s, (27 + i * 1.9) * s, (11.5 + r() * 2) * s, 0.75 * s);
    for (let i = 0; i < 5; i++) g.fillRect(17.6 * s, (35 + i * 1.9) * s, (11 + r() * 2) * s, 0.75 * s);
    g.strokeStyle = '#5a5f6e'; g.lineWidth = 0.4 * s; g.strokeRect(17.6 * s, 27 * s, 12 * s, 6.8 * s);
    [2.4, 3.6, 3, 5.6].forEach((hh, i) => { g.fillStyle = i === 3 ? accent : '#9aa0ad'; g.fillRect((18.8 + i * 2.7) * s, (33.2 - hh) * s, 1.8 * s, hh * s); });
    // the stamp
    g.save();
    g.translate(16 * s, 22 * s); g.rotate(-0.16);
    g.strokeStyle = '#d3262b'; g.fillStyle = '#d3262b';
    g.lineWidth = 1.1 * s;
    g.beginPath(); g.roundRect ? g.roundRect(-13.6 * s, -4.3 * s, 27.2 * s, 8.6 * s, 1.4 * s) : g.rect(-13.6 * s, -4.3 * s, 27.2 * s, 8.6 * s); g.stroke();
    g.font = `bold ${7.6 * s}px Impact, Haettenschweiler, 'Arial Narrow', 'Arial Black', sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ACCEPTED', 0, 0.35 * s, 24 * s);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc((r() - 0.5) * 27 * s, (r() - 0.5) * 8.6 * s, (0.1 + r() * 0.18) * s, 0, 6.283); g.fill(); }
    g.restore();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#a9adb8'; g.lineWidth = 0.4 * s; g.strokeRect(0.2 * s, 0.2 * s, w - 0.4 * s, h - 0.4 * s);
  };
}
/** a sheet under the top one, and the flying sheets: a coloured tag, a title, lines */
function drawSheet(accent, seed, stamp) {
  return (g, w, h) => {
    const s = w / 18, r = rng(seed);
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    g.fillStyle = accent; g.fillRect(1.6 * s, 1.5 * s, 8 * s, 3 * s);
    g.fillStyle = '#1f2433'; g.fillRect(1.6 * s, 6 * s, 14.5 * s, 1.5 * s); g.fillRect(1.6 * s, 8.4 * s, 10 * s, 1.5 * s);
    g.fillStyle = '#b9bdc7';
    for (let i = 0; i < 6; i++) g.fillRect(1.6 * s, (12 + i * 1.8) * s, (12 + r() * 2.5) * s, 0.7 * s);
    if (stamp) {
      g.save(); g.translate(11.5 * s, 15 * s); g.rotate(-0.2);
      g.strokeStyle = '#d3262b'; g.lineWidth = 0.9 * s; g.strokeRect(-5 * s, -2.2 * s, 10 * s, 4.4 * s);
      g.fillStyle = '#d3262b'; g.fillRect(-3.6 * s, -0.6 * s, 7.2 * s, 1.2 * s);
      g.restore();
    }
    g.strokeStyle = '#a9adb8'; g.lineWidth = 0.4 * s; g.strokeRect(0.2 * s, 0.2 * s, w - 0.4 * s, h - 0.4 * s);
  };
}

export default {
  title: 'Academician',
  exit: 0.45,
  still: 1.35,
  async build(k) {
    const { root } = k;
    const clip = (m) => k.clip(m);
    const smoothInk = (mesh, px) => {
      // an outline hull from a copy with shared (smooth) normals: no gaps at the bevelled corners
      const g = mesh.geometry.clone();
      g.deleteAttribute('uv');
      g.deleteAttribute('normal');
      const merged = mergeVertices(g, 1e-3);
      merged.computeVertexNormals();
      const tmp = new THREE.Mesh(merged, mesh.material);
      const o = k.ink(tmp, px);
      tmp.remove(o);
      mesh.add(o);
      return o;
    };

    // ① the mortarboard: hat (placement) -> squash (landing) -> cap + band, board (yawed), button, cord
    const hat = new THREE.Group(), squash = new THREE.Group(), boardG = new THREE.Group();
    hat.add(squash);
    const capR = 23.5, capH = 16, BW = 57, BT = 3.4, YAW = 0.2;
    const B0 = 1.3, B1 = 14.3;                   // the band's bottom and top on the cap
    // the skull cap: a lathe, a touch narrower at the top and flared at the rim, oval like the head
    const capRad = (y) => capR * (1 - 0.05 * Math.pow(y / capH, 1.4));
    const prof = [];
    for (let i = 0; i <= 10; i++) prof.push(new THREE.Vector2(capRad(capH * i / 10) + (i === 0 ? 0.5 : 0), capH * i / 10));
    const cap = new THREE.Mesh(new THREE.LatheGeometry(prof, 48, -Math.PI, Math.PI * 2), clip(k.toon(BLACK)));
    k.ink(cap, 1.4);
    // the gold band with 「院士」 on the front (u 0.5); its shading is baked, the sides darken below
    const TW_ = 2048, TH_ = 192;
    const bandTex = k.canvasTexture(TW_, TH_, (g, w, h) => {
      // the cap's black cloth, gold piping above and below, gold 「院士」 on the front
      const cl = g.createLinearGradient(0, 0, 0, h);
      cl.addColorStop(0, '#141319'); cl.addColorStop(0.3, '#34333d'); cl.addColorStop(0.7, '#2b2a33'); cl.addColorStop(1, '#1f1e25');
      g.fillStyle = cl; g.fillRect(0, 0, w, h);
      const gold = (y0, hh) => {
        const gr = g.createLinearGradient(0, y0, 0, y0 + hh);
        gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.45, '#f2c14e'); gr.addColorStop(1, '#a8721a');
        g.fillStyle = gr; g.fillRect(0, y0, w, hh);
      };
      gold(h * 0.01, h * 0.06); gold(h * 0.925, h * 0.065);
      const sx = (w / (2 * Math.PI * (capR + 0.35))) / (h / (B1 - B0));
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 ${h * 0.86}px ${FONT_ZH}`;
      g.lineJoin = 'round';
      g.save(); g.translate(w / 2, h * 0.5); g.scale(sx * 1.06, 1);
      g.strokeStyle = '#120d05'; g.lineWidth = h * 0.08; g.strokeText('院士', 0, 0);
      const gr = g.createLinearGradient(0, -h * 0.35, 0, h * 0.35);
      gr.addColorStop(0, '#fff3c0'); gr.addColorStop(0.45, '#f5c84f'); gr.addColorStop(1, '#c88a1e');
      g.fillStyle = gr; g.fillText('院士', 0, 0);
      g.restore();
    });
    const bandProf = [];
    for (let i = 0; i <= 8; i++) { const y = lerp(B0, B1, i / 8); bandProf.push(new THREE.Vector2(capRad(y) + 0.35, y)); }
    const band = new THREE.Mesh(new THREE.LatheGeometry(bandProf, 64, -Math.PI, Math.PI * 2), clip(new THREE.MeshBasicMaterial({ map: bandTex, vertexColors: true })));
    {
      // LatheGeometry's v runs along the (evenly spaced) profile points, so the texture spans the band
      const pos = band.geometry.attributes.position, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i) / (capR + 0.4), x = pos.getX(i) / (capR + 0.4);
        const f = clamp(0.45 + 0.55 * z - 0.12 * x, 0.25, 1);
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = f;
      }
      band.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    cap.scale.z = band.scale.z = 0.9;
    // the board: rounded (bevelled) edges catch the light; a charcoal top with a sheen
    const boardMat = clip(k.toon(0x303039));
    const board = new THREE.Mesh(new RoundedBoxGeometry(BW, BT, BW, 3, 1.1), boardMat);
    board.position.y = capH + BT / 2 - 0.2;
    smoothInk(board, 1.6);
    const topTex = k.canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#2c2c35'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(255,255,255,0.20)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.06)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 3; g.strokeRect(12, 12, w - 24, h - 24);
    });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(BW - 2.4, BW - 2.4), clip(new THREE.MeshBasicMaterial({ map: topTex })));
    top.rotation.x = -Math.PI / 2;
    top.position.y = capH + BT - 0.2 + 0.02;
    const goldMat = clip(k.toon(GOLD));
    const button = new THREE.Mesh(new THREE.SphereGeometry(2.7, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), goldMat);
    button.scale.y = 0.6;
    button.position.y = capH + BT - 0.2;
    k.ink(button, 1.0);
    // the cord: from the button across the board to the right corner (board space)
    const TOPY = capH + BT - 0.2;
    const corner = new THREE.Vector3(BW / 2 - 1.2, TOPY, BW / 2 - 1.2);
    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, TOPY + 0.9, 0),
      new THREE.Vector3(corner.x * 0.5, TOPY + 0.9, corner.z * 0.5),
      new THREE.Vector3(corner.x * 0.92, TOPY + 0.7, corner.z * 0.92),
      new THREE.Vector3(corner.x + 1.4, TOPY - 0.6, corner.z + 1.4),
    ]);
    const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 24, 0.75, 6), goldMat);
    boardG.add(board, top, button, cord);
    boardG.rotation.y = YAW;
    squash.add(cap, band, boardG);
    const hatHome = k.at(349, 124, 24);
    const HAT_ROT = [0.38, -0.08, 0.03];
    hat.position.copy(hatHome);
    hat.rotation.set(...HAT_ROT);
    root.add(hat);
    // the tassel hangs from the corner in world "down", so it lives in root and follows the anchor
    const tassel = new THREE.Group();
    const strandTex = k.canvasTexture(128, 64, (g, w, h) => {
      g.fillStyle = '#f0c24a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a8761a'; g.lineWidth = 3;
      for (let x = 3; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = '#fff0b0'; g.lineWidth = 1.5;
      for (let x = 7; x < w; x += 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    });
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 8, 8), goldMat);
    hang.position.y = -4;
    const knot = new THREE.Mesh(new RoundedBoxGeometry(4, 3.4, 4, 2, 1.2), goldMat);
    knot.position.y = -9.2;
    smoothInk(knot, 1.1);
    const fringe = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 3.9, 11, 20, 1, false), clip(k.toon(0xffffff, { map: strandTex })));
    fringe.position.y = -16.4;
    k.ink(fringe, 1.1);
    tassel.add(hang, knot, fringe);
    root.add(tassel);
    const anchorLocal = new THREE.Vector3(corner.x + 1.4, TOPY - 0.6, corner.z + 1.4);
    const anchor = new THREE.Vector3();

    // ② the papers, held up: each pivots at its grip (bottom centre, in the fist), a stack of three
    const PW = 32, PH = 44;
    const papers = [
      { venue: 'ICML', accent: '#c8322f', grip: [224, 302], rz: 0.08, t0: T_PAPER[0], fist: [[186, 266], [200, 261], [214, 265], [230, 266], [246, 262], [262, 264], [266, 330], [184, 330]] },
      { venue: 'NeurIPS', accent: '#2f6fc8', grip: [413, 361], rz: -0.26, t0: T_PAPER[1], fist: [[366, 322], [392, 320], [410, 322], [428, 325], [440, 328], [454, 332], [456, 400], [366, 400]] },
    ].map((p, i) => {
      const g = new THREE.Group();
      const home = k.at(p.grip[0], p.grip[1], 6);
      g.position.copy(home);
      const side = k.toon(0xf2efe6);
      const mk = (w, h, tex, dz, dx, dy, rz) => {
        const geo = new THREE.BoxGeometry(w, h, 0.7);
        geo.translate(0, h / 2, 0);
        const m = new THREE.Mesh(geo, [side, side, side, side, k.toon(0xffffff, { map: tex }), side]);
        m.position.set(dx, dy, dz);
        m.rotation.z = rz;
        k.ink(m, 1.2);
        g.add(m);
        return m;
      };
      mk(PW, PH, k.canvasTexture(128, 176, drawSheet('#9aa0ad', 40 + i, false)), -2.2, i ? 3.4 : -3.4, 1.6, i ? -0.07 : 0.07);
      mk(PW, PH, k.canvasTexture(128, 176, drawSheet(VENUES[2 + i], 50 + i, false)), -1.1, i ? 1.7 : -1.7, 0.8, i ? -0.035 : 0.035);
      const front = mk(PW, PH, k.canvasTexture(256, 352, drawPaper(p.venue, p.accent, 3 + i * 5)), 0, 0, 0, 0);
      root.add(g);
      // the top of the sheet in the group's space: where the volley comes out
      return { ...p, g, front, home, mouth: new THREE.Vector3(0, PH * 0.92, 1.5) };
    });
    // his curled fingers in front of the papers' lower edge
    for (const p of papers) {
      try { skinPatch(k, p.fist, 12); } catch (_) { k.patch(p.fist, 12); }
    }

    // ③ the volley: a pool of flying sheets, one per shot (a volley never overlaps the next)
    const flyers = SHOTS.map((_, j) => {
      const tex = k.canvasTexture(72, 96, drawSheet(VENUES[j % VENUES.length], 70 + j, j % 3 === 0));
      const side = clip(k.toon(0xf2efe6));
      const face = clip(k.toon(0xffffff, { map: tex }));
      const m = new THREE.Mesh(new THREE.BoxGeometry(16, 21, 0.5), [side, side, side, side, face, face]);
      clip(k.ink(m, 1.1).material);          // the mesh has a material array, so ink() can't see its clip
      m.visible = false;
      root.add(m);
      return m;
    });
    const mouthW = papers.map(p => {
      const g = new THREE.Group();
      g.position.copy(p.home); g.rotation.z = p.rz; g.updateMatrix();
      return p.mouth.clone().applyMatrix4(g.matrix);
    });

    // q5: confetti and stars on landing (fixed random streams)
    const rc = rng(21);
    const confetti = Array.from({ length: 26 }, (_, i) => {
      const a = -Math.PI / 2 + (rc() - 0.5) * 2.6;
      const sp = 70 + rc() * 90;
      return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 2.6 + rc() * 2.4, h: 1.6 + rc() * 1.4, spin: (rc() - 0.5) * 16, flip: 6 + rc() * 10,
        col: [[242, 193, 78], [228, 87, 46], [43, 179, 163], [58, 123, 213], [255, 255, 255], [242, 193, 78]][i % 6], d: rc() * 0.08 };
    });
    const stars = [[-40, -6, 7, 0.02], [44, -14, 6, 0.08], [-30, 22, 5, 0.12], [38, 18, 5.5, 0.05], [2, -30, 6.5, 0.1]];
    const tmp = new THREE.Vector3();
    const star = (c, x, y, r, rot) => {
      c.save(); c.translate(x, y); c.rotate(rot);
      c.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.36 : r; c.lineTo(Math.sin(a) * rr, -Math.cos(a) * rr); }
      c.closePath();
      c.lineWidth = 2.2; c.strokeStyle = '#16151a'; c.lineJoin = 'round'; c.stroke();
      c.fillStyle = '#ffd23f'; c.fill();
      c.restore();
    };

    return {
      update(t, e) {
        // hat: falls, squashes on landing, settles; tassel lags then swings
        const hin = presence(t, e, 0.06, T_LAND - 0.06, ease.out, 0.2);
        const fall = 1 - ease.in(env(t, 0.06, T_LAND));
        const fly = ease.in(clamp(e * 1.6 - 0.12));
        k.show(hat, Math.min(1, hin * 1.4));
        hat.position.set(hatHome.x + fly * 26, hatHome.y + fall * 46 + fly * 70, hatHome.z);
        hat.rotation.set(HAT_ROT[0] - fall * 0.25, HAT_ROT[1], HAT_ROT[2] + fly * 0.5 - fall * 0.1);
        const ts = t - T_LAND;
        const sq = ts > 0 ? Math.exp(-ts * 7) * Math.cos(ts * 26) : 0;
        squash.scale.set(1 + 0.12 * sq, 1 - 0.2 * sq, 1 + 0.12 * sq);
        squash.rotation.z = ts > 0 ? Math.exp(-ts * 5) * Math.sin(ts * 17) * 0.05 : 0;
        hat.updateMatrix(); squash.updateMatrix(); boardG.updateMatrix();
        anchor.copy(anchorLocal).applyMatrix4(boardG.matrix).applyMatrix4(squash.matrix).applyMatrix4(hat.matrix);
        tassel.position.copy(anchor);
        k.show(tassel, hat.visible ? hat.scale.x : 0);
        // pendulum: trails up while falling, kicks on landing, then a calm sway (a nudge with each volley)
        const V = volley(t);
        const kick = ts > 0 ? Math.exp(-ts * 2.6) * Math.sin(ts * 9.5) * 0.7 : -0.9 * env(t, 0.1, T_LAND);
        const vk = V.lt >= 0 ? Math.exp(-V.lt * 3) * Math.sin(V.lt * 11) * 0.12 : 0;
        const sway = Math.sin(t * Math.PI * 2 / BEAT) * 0.1 + Math.sin(t * 1.3) * 0.035;
        tassel.rotation.set(sway * 0.8 + (ts > 0 ? Math.exp(-ts * 3) * Math.sin(ts * 8) * 0.3 : 0), 0, 0.08 + kick + sway + vk);

        // papers come up out of the fists; each shot jolts its sheet
        papers.forEach((p, i) => {
          const a = presence(t, e, p.t0, 0.42, (x) => ease.outBack(x, 2.2), 0.3 + i * 0.2);
          k.show(p.g, a);
          let jolt = 0;
          if (V.lt >= 0) SHOTS.forEach((s, j) => { if (j % 2 === i && V.lt >= s) jolt = Math.max(jolt, Math.exp(-(V.lt - s) * 18)); });
          const breathe = Math.sin(t * Math.PI * 2 / BEAT + i * 1.9) * 0.03 + Math.sin(t * 2.3 + i) * 0.01;
          const rise = 1 - Math.min(1, a);
          p.g.rotation.set(0, 0, p.rz + breathe + rise * (i ? -0.5 : 0.5) + jolt * (i ? 0.05 : -0.05));
          p.g.position.set(p.home.x, p.home.y - rise * 16 + jolt * 2.2, p.home.z);
        });

        // the flying sheets
        const vis = 1 - clamp(e * 2.2);
        flyers.forEach((m, j) => {
          const age = V.lt - SHOTS[j];
          if (V.b < 0 || age < 0 || age > LIFE || vis <= 0) { m.visible = false; return; }
          const h = j % 2, [r0, r1, r2, r3, r4, r5] = rand(V.b, j);
          const th = h ? lerp(0.2, 0.75, r0) : lerp(-1.05, -0.3, r0);
          const sp = h ? lerp(230, 290, r1) : lerp(280, 350, r1);
          const tx = 0.34, ty = 0.22, vt = 85;
          const ex = 1 - Math.exp(-age / tx), ey = 1 - Math.exp(-age / ty);
          const o = mouthW[h];
          m.position.set(
            o.x + Math.sin(th) * sp * tx * ex + Math.sin(age * 9 + r2 * 6) * 3 * age,
            o.y + (Math.cos(th) * sp + vt) * ty * ey - vt * age,
            o.z + 2 + age * 6);
          m.rotation.set(age * lerp(5, 9, r3) * (r4 > 0.5 ? 1 : -1), Math.sin(age * 8 + r5 * 5) * 0.7, papers[h].rz + age * lerp(-6, 6, r2));
          const grow = ease.out(env(age, 0, 0.12)) * (1 - ease.in(env(age, LIFE - 0.2, LIFE)));
          k.show(m, grow * vis, 1);
        });
      },

      draw2d(q, t, e) {
        const fade = 1 - clamp(e * 2);
        if (fade <= 0) return;
        const c = q.ctx || q.drawingContext;
        const [cx, cy] = k.screenAt(256, 256, 0);
        c.save();
        c.beginPath(); c.arc(cx, cy, k.R, 0, Math.PI * 2); c.clip();
        // confetti from the hat top on landing, stars round the cap
        const ct = t - T_LAND;
        if (ct > 0 && ct < 0.95) {
          const [ox, oy] = k.screenAt(346, 60, 30);
          q.noStroke();
          for (const p of confetti) {
            const s = ct - p.d;
            if (s <= 0) continue;
            const x = ox + p.vx * s * 0.9, y = oy + p.vy * s + 170 * s * s;
            const a = (1 - env(ct, 0.55, 0.95)) * fade;
            q.push(); q.translate(x, y); q.rotate(p.spin * s);
            q.scale(1, Math.cos(p.flip * s));
            q.fill(p.col[0], p.col[1], p.col[2], 255 * a); q.rect(-p.w / 2, -p.h / 2, p.w, p.h);
            q.pop();
          }
          const [hx, hy] = k.screenAt(349, 110, 24);
          for (const [dx, dy, r, d] of stars) {
            const s = ct - d;
            if (s <= 0 || s > 0.7) continue;
            const pop = ease.outBack(env(s, 0, 0.18), 2.5) * (1 - ease.in(env(s, 0.4, 0.7)));
            c.globalAlpha = fade;
            star(c, hx + dx * (1 + s * 0.4), hy + dy * (1 + s * 0.4), r * pop, s * 2);
          }
          c.globalAlpha = 1;
        }
        c.restore();

        const V = volley(t);
        c.save();
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        // "+1" per shot, out of the top of its paper, and a little pop of lines where it left
        if (V.b >= 0) {
          SHOTS.forEach((s0, j) => {
            const s = V.lt - s0;
            if (s < 0 || s > 0.52) return;
            const h = j % 2, p = papers[h];
            if (!p.g.visible) return;
            const [r0, r1, r2, r3] = rand(V.b, j + 40);
            tmp.copy(p.mouth).applyMatrix4(p.g.matrix);
            const [x0, y0] = k.toScreen(tmp);
            // pop lines
            if (s < 0.14) {
              const a = 1 - s / 0.14;
              c.strokeStyle = `rgba(22,21,26,${0.9 * a * fade})`; c.lineWidth = 1.6; c.lineCap = 'round';
              for (let i = 0; i < 3; i++) {
                const an = -Math.PI / 2 + (i - 1) * 0.6 + (h ? 0.25 : -0.25);
                const r1a = 5 + s * 60, r2a = 9 + s * 80;
                c.beginPath(); c.moveTo(x0 + Math.cos(an) * r1a, y0 - 3 + Math.sin(an) * r1a); c.lineTo(x0 + Math.cos(an) * r2a, y0 - 3 + Math.sin(an) * r2a); c.stroke();
              }
            }
            const pop = ease.outBack(env(s, 0, 0.12), 3);
            const a = (1 - env(s, 0.32, 0.52)) * fade;
            const slot = Math.floor(j / 2) / 4;          // each hand's five fan out along the top of its paper
            const dx = h ? lerp(-13, 9, slot) + (r0 - 0.5) * 4 : lerp(-20, 6, 1 - slot) + (r0 - 0.5) * 4;
            const dy = -lerp(30, 40, r1) * (h ? 0.75 : 1);
            const px = lerp(12, 16, r2) * (j >= SHOTS.length - 2 ? 1.25 : 1);
            c.save();
            c.translate(x0 + dx * (0.35 + 0.65 * ease.out(env(s, 0, 0.52))), y0 - 9 + dy * ease.out(env(s, 0, 0.52)));
            c.rotate(lerp(-0.3, 0.3, r3));
            c.scale(pop, pop);
            c.globalAlpha = a;
            c.font = FONT_PLUS.replace('{px}', px.toFixed(1));
            c.strokeStyle = '#16151a'; c.lineWidth = 4; c.strokeText('+1', 0, 0);
            c.fillStyle = ['#3ccf6b', '#ffd23f', '#ff8a3d'][j % 3]; c.fillText('+1', 0, 0);
            c.restore();
          });
        }
        // the counter: a paper and the count, bumping with every shot
        if (V.n > 0) {
          const lastShot = V.lt >= 0 ? Math.max(...SHOTS.filter(s => s <= V.lt)) : 0;
          const since = V.lt - lastShot;
          const inn = ease.outBack(env(t, T_VOLLEY, T_VOLLEY + 0.2), 2.4);
          const bump = 1 + 0.32 * Math.exp(-since * 14) + (V.lt >= SHOTS[SHOTS.length - 1] ? 0.25 * Math.exp(-(V.lt - SHOTS[SHOTS.length - 1]) * 6) * Math.cos((V.lt - SHOTS[SHOTS.length - 1]) * 14) : 0);
          const [bx, by] = k.screenAt(110, 362, 0);
          c.save();
          c.translate(bx, by); c.rotate(-0.1); c.scale(inn * bump, inn * bump);
          c.globalAlpha = fade;
          // the paper pile: one more sheet with every volley (up to five)
          const pile = Math.min(5, 1 + V.b);
          c.lineWidth = 1.5; c.strokeStyle = '#16151a';
          for (let i = pile - 1; i >= 0; i--) {
            const ox = -19 - i * 1.6, oy = -8 + i * 2.2 - (pile - 1) * 1.1;
            c.fillStyle = i ? '#eeebe2' : '#fffdf6';
            c.fillRect(ox, oy, 11, 15); c.strokeRect(ox, oy, 11, 15);
          }
          const oy0 = -8 - (pile - 1) * 1.1;
          c.fillStyle = '#c8322f'; c.fillRect(-17.5, oy0 + 1.5, 5, 2.2);
          c.fillStyle = '#9aa0ad'; c.fillRect(-17.5, oy0 + 5.5, 8, 1.2); c.fillRect(-17.5, oy0 + 8, 7, 1.2); c.fillRect(-17.5, oy0 + 10.5, 8, 1.2);
          c.textAlign = 'left';
          c.font = FONT_PLUS.replace('{px}', '17');
          const txt = '×' + V.n;
          c.lineWidth = 4.5; c.strokeText(txt, -5, 0);
          c.fillStyle = '#ffd23f'; c.fillText(txt, -5, 0);
          c.restore();
        }
        c.restore();
      },
    };
  },
};
