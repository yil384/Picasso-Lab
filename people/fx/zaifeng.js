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
// the two held stacks: in front of his hands (nothing of the hands is re-layered over them)
const SW = 40, SH = 58;                     // a stack's top sheet, world px
const NB = 7, BT = 2.2;                     // bundles of sheets behind the top one, each BT thick
const Z_STACK = 26;                         // the stacks' front, in front of everything of his hands
const RX = -0.36, RY = 0.34;                // they lean back and turn a little: bottom and left edges show
const T_SLAM = 0.22;                        // a stack slams in (from bigger, toward the viewer) this fast

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

/** the top sheet of a held stack (SW x SH world px; its top edge is under the binder clip's jaw): the
    venue tag, a bold title, the red ACCEPTED stamp, two columns of text and a figure */
function drawTop(venue, accent, seed) {
  return (g, w, h) => {
    const s = w / SW, r = rng(seed);
    const box = (x, y, ww, hh, rad) => { g.beginPath(); g.roundRect ? g.roundRect(x * s, y * s, ww * s, hh * s, rad * s) : g.rect(x * s, y * s, ww * s, hh * s); };
    g.fillStyle = '#fffdf6'; g.fillRect(0, 0, w, h);
    // venue tag
    g.fillStyle = accent; box(3, 9.5, 19, 6.4, 1.2); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${4.9 * s}px 'Helvetica Neue', Arial, sans-serif`;
    g.fillText(venue, 12.5 * s, 12.85 * s, 17 * s);
    // the title (two bold bars) and the authors
    g.fillStyle = '#1f2433';
    g.fillRect(3 * s, 18.6 * s, 34 * s, 2.8 * s); g.fillRect(3 * s, 22.8 * s, 23 * s, 2.8 * s);
    g.fillStyle = '#8a8f9c'; g.fillRect(3 * s, 27.4 * s, 27 * s, 1 * s);
    // two columns of text, a figure (ours wins) at the top of the right one
    g.fillStyle = '#b9bdc7';
    for (let i = 0; i < 9; i++) g.fillRect(3 * s, (39 + i * 2.05) * s, (14.5 + r() * 2) * s, 0.85 * s);
    for (let i = 0; i < 4; i++) g.fillRect(21.5 * s, (49.25 + i * 2.05) * s, (13.5 + r() * 2) * s, 0.85 * s);
    g.strokeStyle = '#5a5f6e'; g.lineWidth = 0.45 * s; g.strokeRect(21.5 * s, 39 * s, 15.5 * s, 8 * s);
    [2.6, 4, 3.3, 6.4].forEach((hh, i) => { g.fillStyle = i === 3 ? accent : '#9aa0ad'; g.fillRect((23 + i * 3.4) * s, (46.4 - hh) * s, 2.3 * s, hh * s); });
    // the stamp
    g.save();
    g.translate(20 * s, 33 * s); g.rotate(-0.14);
    g.strokeStyle = '#d3262b'; g.fillStyle = '#d3262b';
    g.lineWidth = 1.2 * s;
    box(-15.5, -4.4, 31, 8.8, 1.5); g.stroke();
    g.font = `bold ${7.8 * s}px Impact, Haettenschweiler, 'Arial Narrow', 'Arial Black', sans-serif`;
    g.fillText('ACCEPTED', 0, 0.35 * s, 28 * s);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 20; i++) { g.beginPath(); g.arc((r() - 0.5) * 31 * s, (r() - 0.5) * 8.8 * s, (0.1 + r() * 0.2) * s, 0, 6.283); g.fill(); }
    g.restore();
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = '#a9adb8'; g.lineWidth = 0.4 * s; g.strokeRect(0.2 * s, 0.2 * s, w - 0.4 * s, h - 0.4 * s);
  };
}
/** the edge of a bundle of sheets: cream with the thin lines between its sheets (along u or along v) */
function drawEdge(alongU) {
  return (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#b3ad9f';
    for (const f of [0.34, 0.67]) {
      if (alongU) g.fillRect(0, Math.round(f * h) - 1, w, 2); else g.fillRect(Math.round(f * w) - 1, 0, 2, h);
    }
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

    // ② two thick stacks of papers, held up in front of his hands (the hands are hidden behind them).
    //    A stack: NB bundles of sheets, each a little off (their layered edges show at the bottom and on
    //    the outer side), two loose sheets fanned under the top sheet, and a black binder clip on top.
    //    g (placement, jolt, slam) -> body (the lean: bottom edge and outer side toward the viewer).
    const edgeX = k.canvasTexture(16, 64, drawEdge(false));       // the ±x faces: u runs along the depth
    const edgeY = k.canvasTexture(64, 16, drawEdge(true));        // the ±y faces: v runs along the depth
    const CREAM = [0xfaf6ea, 0xf3eee1, 0xfffdf6, 0xe9e3d3, 0xfaf6ea, 0xefe9da, 0xfffcf2];
    const clipMat = k.toon(0x2a2930), wireMat = k.toon(0xd9dce3);
    const papers = [
      { venue: 'ICML', accent: '#c8322f', c: [219, 280], rz: 0.05, t0: T_PAPER[0], from: 1.35 },
      { venue: 'NeurIPS', accent: '#2f6fc8', c: [410, 343], rz: -0.3, t0: T_PAPER[1], from: 1.15 },
    ].map((p, i) => {
      const g = new THREE.Group(), body = new THREE.Group();
      const home = k.at(p.c[0], p.c[1], Z_STACK);
      g.position.copy(home);
      g.rotation.z = p.rz;
      body.rotation.set(RX, RY, 0);
      g.add(body);
      const out = -1;                            // the left side (it faces the viewer)
      const r = rng(90 + i * 7);
      for (let b = 0; b < NB; b++) {
        const back = NB - 1 - b;                 // 0 = the front bundle
        const m = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, BT), [
          k.toon(CREAM[b], { map: edgeX }), k.toon(CREAM[b], { map: edgeX }),
          k.toon(CREAM[b], { map: edgeY }), k.toon(CREAM[b], { map: edgeY }),
          k.toon(CREAM[b]), k.toon(CREAM[b]),
        ]);
        m.position.set(out * back * 0.35 + (r() - 0.5) * 1.4, -back * 0.3 + (r() - 0.5) * 1.2, -BT / 2 - back * BT);
        m.rotation.z = (r() - 0.5) * 0.07;
        k.ink(m, 1.15);
        body.add(m);
      }
      // two loose sheets fanned under the top one, then the top sheet
      const sheet = (dz, dx, dy, rz, mat) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(SW, SH, 0.45), mat);
        m.position.set(dx, dy, dz); m.rotation.z = rz;
        k.ink(m, 1.1);
        body.add(m);
        return m;
      };
      const side = k.toon(0xf2efe6);
      sheet(0.3, -out * 0.8, 0.4, -out * 0.06, side);
      sheet(0.8, out * 0.6, -0.5, out * 0.045, k.toon(0xfaf7ee));
      const topTex = k.canvasTexture(256, Math.round(256 * SH / SW), drawTop(p.venue, p.accent, 3 + i * 5));
      const front = sheet(1.3, 0, 0, out * 0.012, [side, side, side, side, k.toon(0xffffff, { map: topTex }), side]);
      // the binder clip on the top edge: the jaw over the front, the spine over the top, two wire handles up
      const jaw = new THREE.Mesh(new RoundedBoxGeometry(14, 7.5, 1.5, 2, 0.5), clipMat);
      jaw.position.set(0, SH / 2 - 3.1, 2.2);
      smoothInk(jaw, 1.2);
      const spine = new THREE.Mesh(new THREE.BoxGeometry(14, 1.6, NB * BT + 3.6), clipMat);
      spine.position.set(0, SH / 2 + 0.55, 1.5 - (NB * BT + 3.6) / 2 + 0.6);
      k.ink(spine, 1.2);
      const handle = (z0, z1, hgt) => {
        const path = new THREE.CurvePath();
        const P = [[-4.8, SH / 2 - 1.4, z0], [-3.6, SH / 2 + hgt, z1], [3.6, SH / 2 + hgt, z1], [4.8, SH / 2 - 1.4, z0]].map(v => new THREE.Vector3(...v));
        for (let j = 0; j < 3; j++) path.add(new THREE.LineCurve3(P[j], P[j + 1]));
        const m = new THREE.Mesh(new THREE.TubeGeometry(path, 36, 0.62, 6), wireMat);
        k.ink(m, 0.9);
        return m;
      };
      body.add(jaw, spine, handle(3.0, 4.6, 8), handle(-NB * BT - 1.2, -NB * BT - 4.2, 6.5));
      // the top of the top sheet, just under the clip: where the volley comes out
      const mouthB = new THREE.Vector3(0, SH / 2 - 1, 2);
      root.add(g);
      return { ...p, g, body, front, home, mouthB, mouth: new THREE.Vector3() };
    });
    /** the mouth of stack p in root space for its current pose */
    const mouthOf = (p, v) => {
      p.g.updateMatrix(); p.body.updateMatrix();
      return v.copy(p.mouthB).applyMatrix4(p.body.matrix).applyMatrix4(p.g.matrix);
    };

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
    const mouthW = papers.map(p => mouthOf(p, new THREE.Vector3()));

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

        // the stacks slam into his hands (from bigger and nearer, so a hand never shows beside one), sit
        // there breathing a little, jolt with each of their shots, and swell and pop on the exit
        papers.forEach((p, i) => {
          const popE = 0.3 + i * 0.08;
          if (t < p.t0 || e >= popE) { p.g.visible = false; return; }
          p.g.visible = true;
          const slam = ease.out(env(t, p.t0, p.t0 + T_SLAM)), rest = 1 - slam;
          const land = t - p.t0 - T_SLAM;
          const sq = land > 0 ? Math.exp(-land * 12) * Math.sin(land * 32) * 0.03 : 0;
          const sc = lerp(p.from, 1, slam) * (1 + (i ? 0.05 : 0.1) * ease.out(e / popE));
          let jolt = 0;
          if (V.lt >= 0) SHOTS.forEach((s, j) => { if (j % 2 === i && V.lt >= s) jolt = Math.max(jolt, Math.exp(-(V.lt - s) * 18)); });
          const breathe = Math.sin(t * Math.PI * 2 / BEAT + i * 1.9) * 0.018 + Math.sin(t * 2.3 + i) * 0.006;
          p.g.scale.set(sc * (1 + sq), sc * (1 - sq), sc);
          p.g.rotation.set(0, 0, p.rz + breathe + rest * (i ? -0.22 : 0.22) + jolt * (i ? 0.035 : -0.035));
          p.g.position.set(p.home.x, p.home.y + jolt * 1.8, p.home.z + rest * 30);
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
            o.z + 8 + age * 6);            // in front of the stack and its clip
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
            mouthOf(p, tmp);
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
