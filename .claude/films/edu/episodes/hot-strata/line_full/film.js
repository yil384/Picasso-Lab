// The full line-art cut of the Strata hot-topic film (SCRIPT.md, 3:27): black ink line drawings on warm paper that draw
// themselves, red-pen notes and hand lettering, one smooth camera over one long sheet. Grown from the bake-off opening
// (../bakeoff/line/film.js): same ink sprites (ink.py packs R ink, G paper fill, B pen time), lettering and captions.
// The sheet, top to bottom (SCRIPT.md section 2): A server wall + card, B forum, C pile of numbers, D campus, E kitchen,
// F the two-storey building (F' the serving-hatch side to its right), G the desk at home, G' the open boxes, H the
// finale, then the logo end card. Drawings not made yet (ART.md) load by name and fall back to a grey pencil box with
// the name in it, so the film runs end to end; drop the PNG into art/src, run ink.py and it is picked up.
// Real data on screen: chef numbers, picks and the "upstairs" sets come from ../film/anim.json (our released
// Qwen3-235B traces, one layer, 40 generated words); scores from ../res_32.json and ../res_64.json via SCRIPT.md.
// Every frame is a pure function of t.
import { defineScene } from '/pv/runtime/pv.js';
import { loadImg, mk, cl, mix, hs } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1';
const W = 1080, H = 1920, FPS = 30, DUR = 207.0;
const HAND = ZH ? '"ZCOOL KuaiLe", Caveat' : 'Caveat', HW = ZH ? 400 : 700, LAT = 'Caveat';
const SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter', SW = ZH ? 700 : 500;
const PAPER = [250, 246, 237], INK = [30, 28, 33], RED = [212, 56, 40], BLUE = [76, 112, 154], PENCIL = [150, 145, 138];
const wash = (c, k) => c.map((v, i) => Math.round(mix(PAPER[i], v, k)));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const COOK = { ink: [196, 46, 34], fill: PAPER };
let TL, C, VO, F;
const A = {}, S = {};

const seg = (t, a, b) => cl((t - a) / (b - a));
const eio = (k) => { k = cl(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const eo = (k) => 1 - Math.pow(1 - cl(k), 3);
const spring = (x, k = 7, w = 13) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
const wobble = (x, a, k = 5, w = 11) => (x <= 0 ? 0 : a * Math.exp(-k * x) * Math.sin(w * x));
const fadeIO = (t, a, b, fi = .3, fo = .4) => (t < a || t > b + fo ? 0 : Math.min(seg(t, a, a + fi), 1 - seg(t, b, b + fo)));
const q15 = (t) => Math.floor(t * 15) / 15;                                              // figures move on twos

// ------------------------------------------------------------------ ink sprites (bake-off machinery)
function sprite(img, scale = 1, boost = 0, grow = 0) {
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, n = w * h, ink = new Uint8Array(n), fil = new Uint8Array(n), tm = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) { ink[i] = boost ? 255 * (1 - Math.pow(1 - d[j] / 255, 1 + boost)) : d[j]; fil[i] = d[j + 1]; tm[i] = d[j + 2]; }
  for (let r = 0; r < grow; r++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const i0 = ink.slice(), t0 = tm.slice();
    for (let y = dy; y < h - dy; y++) for (let x = dx; x < w - dx; x++) {
      const i = y * w + x, a = i - dx - dy * w, b = i + dx + dy * w;
      let m = i0[i], tt = t0[i];
      if (i0[a] > m) { m = i0[a]; tt = t0[a]; }
      if (i0[b] > m) { m = i0[b]; tt = t0[b]; }
      ink[i] = m; tm[i] = tt;
    }
  }
  const out = mk(w, h), og = out.getContext('2d');
  return { w, h, ink, fil, tm, out, og, od: og.createImageData(w, h), cache: new Map(), ph: !!img.ph };
}
// the drawing at pen progress p; a placeholder is always grey pencil
function paint(Sp, p, st = {}) {
  p = cl(p); if (p <= 0) return null;
  const ink = Sp.ph ? PENCIL : (st.ink || INK), fc = Sp.ph ? PAPER : (st.fill || PAPER), fa = st.fa ?? 1, ia = (st.ia ?? 1) * (Sp.ph ? .85 : 1), soft = st.soft ?? .06;
  const key = p >= 1 && st.cache !== false ? `${ink}|${fc}|${fa.toFixed(3)}|${ia.toFixed(3)}` : null;
  if (key && Sp.cache.has(key)) return Sp.cache.get(key);
  const P = p * (1 + soft) * 255, k = 1 / (soft * 255), d = Sp.od.data, n = Sp.w * Sp.h, I = Sp.ink, Fl = Sp.fil, M = Sp.tm;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let r = (P - M[i]) * k; r = r < 0 ? 0 : r > 1 ? 1 : r;
    const a1 = I[i] * r * ia / 255, a2 = Fl[i] * r * fa / 255 * (1 - a1), a = a1 + a2;
    if (a <= .002) { d[j + 3] = 0; continue; }
    d[j] = (ink[0] * a1 + fc[0] * a2) / a; d[j + 1] = (ink[1] * a1 + fc[1] * a2) / a; d[j + 2] = (ink[2] * a1 + fc[2] * a2) / a; d[j + 3] = a * 255;
  }
  Sp.og.putImageData(Sp.od, 0, 0);
  if (!key) return Sp.out;
  const c = mk(Sp.w, Sp.h); c.getContext('2d').drawImage(Sp.out, 0, 0);
  if (Sp.cache.size > (Sp.cap ?? 24)) Sp.cache.delete(Sp.cache.keys().next().value);
  Sp.cache.set(key, c); return c;
}
function put(g, cv, x, y, w, o = {}) {
  if (!cv) return;
  const h = w * cv.height / cv.width, ax = o.ax ?? .5, ay = o.ay ?? .5;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale((o.sx ?? 1) * (o.flip ? -1 : 1), o.sy ?? 1);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.drawImage(cv, -ax * w, -ay * h, w, h); g.restore();
}
// a region of a packed drawing as its own drawing (its pen time re-spread over 0..1)
function cropPacked(img, x, y, w, h) {
  const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, x, y, w, h, 0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data; let lo = 255, hi = 0;
  for (let j = 0; j < d.length; j += 4) if (d[j] > 60) { lo = Math.min(lo, d[j + 2]); hi = Math.max(hi, d[j + 2]); }
  for (let j = 0; j < d.length; j += 4) d[j + 2] = cl((d[j + 2] - lo) / Math.max(1, hi - lo)) * 255;
  g.putImageData(id, 0, 0); return c;
}

// ------------------------------------------------------------------ drawings by name, with pencil placeholders
// Placeholder sizes follow the Codex sizes in ART.md; zones mark where film.js puts things on the drawing (align the
// real art to them, or move the anchors below once it exists).
const PH = {
  line_heap: { w: 1024, h: 1024 },
  line_press: { w: 1024, h: 1536, z: [[.15, .12, .85, .22, 'crossbeam'], [.2, .88, .8, .98, 'platen']] },
  line_geisel: { w: 1536, h: 1024, z: [[.06, .7, .26, .93, 'notice board']] },
  line_building_q: { w: 1024, h: 1536, z: [[.06, .06, .74, .335, 'upstairs kitchen'], [.06, .37, .74, .94, 'staff room'], [.76, .335, .97, .94, 'stairs'],
    [.08, .72, .24, .94, 'stove'], [.6, .82, .74, .94, 'sofa'], [0, .78, .05, .94, 'door']] },
  line_building_h: { w: 1024, h: 1536, z: [[.06, .06, .74, .475, 'upstairs kitchen'], [.06, .51, .74, .94, 'staff room'], [.76, .475, .97, .94, 'stairs'],
    [.08, .76, .24, .94, 'stove'], [.6, .84, .74, .94, 'sofa']] },
  line_spike: { w: 1024, h: 1536, z: [[.25, .08, .75, .8, 'slip stack']] },
  line_slip_boxes: { w: 1536, h: 1024, z: [0, 1, 2, 3].map((i) => [.04 + i * .24, .56, .22 + i * .24, .7, 'label ' + (i + 1)]) },
  line_paper: { w: 1024, h: 1536, z: [[.1, .08, .7, .2, 'title'], [.73, .03, .97, .2, 'rosette'], [.1, .22, .9, .38, 'subtitle, authors']] },
  line_pc_kitchen: { w: 1024, h: 1536, z: [[.52, .38, .92, .78, 'glass panel'], [.05, .25, .48, .8, 'person typing']] },
  line_manager_1: { w: 480, h: 900 }, line_manager_2: { w: 560, h: 900, z: [[.5, .08, .97, .48, 'board']] }, line_manager_3: { w: 480, h: 900 },
};
for (let i = 1; i <= 6; i++) { PH['line_chef_b' + i] = i === 1 ? { w: 400, h: 260 } : { w: 240, h: 400 }; PH['line_chef_r' + i] = { w: 260, h: 400 }; }

function placeholder(name, p) {
  const k = Math.min(1, 900 / Math.max(p.w, p.h)), w = Math.round(p.w * k), h = Math.round(p.h * k);
  const a = mk(w, h), ga = a.getContext('2d', { willReadFrequently: true }), b = mk(w, h), gb = b.getContext('2d', { willReadFrequently: true });
  const lw = Math.max(3, w / 160), m = lw * 3, e = lw * 2.5;
  ga.strokeStyle = '#fff'; ga.lineCap = 'round'; ga.lineWidth = lw;
  for (let pass = 0; pass < 2; pass++) {
    const o = pass * lw * .7; ga.globalAlpha = pass ? .5 : 1; ga.beginPath();
    ga.moveTo(m - e, m + o); ga.lineTo(w - m + e, m - o); ga.moveTo(w - m - o, m - e); ga.lineTo(w - m + o, h - m + e);
    ga.moveTo(w - m + e, h - m - o); ga.lineTo(m - e, h - m + o); ga.moveTo(m + o, h - m + e); ga.lineTo(m - o, m - e); ga.stroke();
  }
  gb.textAlign = 'center'; gb.textBaseline = 'middle';
  for (const [u0, v0, u1, v1, s] of p.z || []) {
    gb.save(); gb.strokeStyle = 'rgba(255,255,255,.5)'; gb.lineWidth = lw * .6; gb.setLineDash([lw * 4, lw * 3]);
    gb.strokeRect(u0 * w, v0 * h, (u1 - u0) * w, (v1 - v0) * h);
    let px = Math.min((v1 - v0) * h * .32, 40); gb.font = `700 ${px}px Caveat`; const tw = gb.measureText(s).width;
    if (tw > (u1 - u0) * w * .9) { px *= (u1 - u0) * w * .9 / tw; gb.font = `700 ${px}px Caveat`; }
    gb.fillStyle = 'rgba(255,255,255,.62)'; gb.fillText(s, (u0 + u1) / 2 * w, (v0 + v1) / 2 * h); gb.restore();
  }
  gb.fillStyle = '#fff';
  const fit = (s, px, maxW) => { gb.font = `700 ${px}px Caveat`; const tw = gb.measureText(s).width; return tw > maxW ? px * maxW / tw : px; };
  const ny = p.z ? .5 : .5, one = fit(name, Math.min(h * .12, w * .2), w * .84);
  if (one > h * .07 || one > 30) { gb.font = `700 ${one}px Caveat`; gb.fillText(name, w / 2, ny * h); }
  else {   // narrow box: small prefix, big suffix ("line_chef_" / "b3")
    const cut = name.lastIndexOf('_') + 1, pre = name.slice(0, cut), suf = name.slice(cut);
    const p1 = fit(pre, w * .2, w * .84), p2 = fit(suf, h * .3, w * .8);
    gb.font = `700 ${p1}px Caveat`; gb.fillText(pre, w / 2, h * .42); gb.font = `700 ${p2}px Caveat`; gb.fillText(suf, w / 2, h * .42 + p1 * .55 + p2 * .5);
  }
  const da = ga.getImageData(0, 0, w, h).data, db = gb.getImageData(0, 0, w, h).data, out = mk(w, h), go = out.getContext('2d'), od = go.createImageData(w, h), o = od.data;
  const per = 2 * (w + h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, ia = da[i + 3], ib = db[i + 3];
    let tt;
    if (ia >= ib) {   // the box: once round the perimeter, clockwise from the top-left corner
      const dt = y, dr = w - x, dbm = h - y, dl = x, mn = Math.min(dt, dr, dbm, dl);
      const s = mn === dt ? x : mn === dr ? w + y : mn === dbm ? w + h + (w - x) : 2 * w + h + (h - y);
      tt = .55 * s / per;
    } else tt = .5 + .38 * x / w + .12 * y / h;
    o[i] = Math.max(ia, ib); o[i + 1] = x > m && x < w - m && y > m && y < h - m ? 255 : 0; o[i + 2] = cl(tt) * 255; o[i + 3] = 255;
  }
  go.putImageData(od, 0, 0); out.ph = true; return out;
}
const MISSING = [];
async function art(name) {
  try { return await loadImg('/edu/art/cut/' + name + '.png'); }
  catch (e) { MISSING.push(name); return placeholder(name, PH[name] || { w: 600, h: 600 }); }
}

// the press with the plain middle of its posts cut out: rows PR.r0..r1 go, so the plate ends 1.57 "what fits" boxes above the
// feet at the heap's scale (line_press: plate bottom row 876, feet bottom row 1336 of 1347; only post sides between them)
function pressSprite(img, heap) {
  const H0 = HW0 * heap.h / heap.w, clr = 1.57 * H0 / 10.4, FB = 1336 / 1347 * img.height, plate = PR.plate * img.height;
  const r0 = Math.round(PR.r0 / 1347 * img.height), r1 = Math.round(1225 / 1347 * img.height), k = clr / ((r0 - plate) + (FB - r1));
  const c = mk(img.width, r0 + img.height - r1), g = c.getContext('2d');
  g.drawImage(img, 0, 0, img.width, r0, 0, 0, img.width, r0);
  g.drawImage(img, 0, r1, img.width, img.height - r1, 0, r0, img.width, img.height - r1);
  const P = sprite(c); P.k = k; P.src = img.height; return P;
}

// ------------------------------------------------------------------ hand lettering and the red pen
function fitPx(g, s, px, maxW, w = HW, fam = HAND) { g.font = `${w} ${px}px ${fam}`; const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function hand(g, s, x, y, px, col, o = {}) {
  const k = o.k ?? 1; if (k <= 0 || !s) return;
  const fam = o.fam ?? HAND, wt = o.w ?? HW, al = o.alpha ?? 1; if (al <= .002) return;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.s != null) g.scale(o.s, o.s);
  g.font = `${wt} ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(s).width;
  if (o.align === 'left') g.translate(tw / 2, 0); else if (o.align === 'right') g.translate(-tw / 2, 0);
  const x0 = -tw / 2 - px * .25, span = tw + px * .5;
  if (o.patch) {
    const pw = tw + px * o.patch, ph = px * 1.05, pk = cl(k * 1.15), r = ph * .3;
    if (pk > 0) {
      g.save(); g.globalAlpha = al; g.fillStyle = css(PAPER); g.shadowColor = css(PAPER); g.shadowBlur = px * .18;
      g.beginPath(); g.roundRect(-pw / 2, -ph / 2, Math.max(2 * r, pw * pk), ph, r); g.fill(); g.fill(); g.restore();
    }
  }
  const draw = (a) => {
    g.globalAlpha = a * al;
    if (o.knock) { g.lineJoin = 'round'; g.lineWidth = px * o.knock; g.strokeStyle = css(PAPER); g.strokeText(s, 0, 0); }
    g.fillStyle = css(col); g.fillText(s, 0, 0);
  };
  if (k >= 1) draw(1);
  else {
    const e = px * .6, xe = x0 + (span + e) * k;
    g.save(); g.beginPath(); g.rect(x0 - 4, -px * 2, Math.max(0, xe - e - x0 + 4), px * 4); g.clip(); draw(1); g.restore();
    for (let i = 0; i < 6; i++) { g.save(); g.beginPath(); g.rect(xe - e + i * e / 6, -px * 2, e / 6 + .5, px * 4); g.clip(); draw(1 - (i + .5) / 6); g.restore(); }
  }
  g.restore();
}
// a label written at t0 (over dur) and faded out at tout
function L(g, t, s, x, y, px, col, t0, tout, o = {}) {
  if (t < t0 || (tout != null && t > tout + .45)) return;
  const dur = o.dur ?? Math.min(1.1, .25 + .03 * String(s).length);
  hand(g, s, x, y, px, col, Object.assign({}, o, { k: seg(t, t0, t0 + dur), alpha: (o.alpha ?? 1) * (tout == null ? 1 : 1 - seg(t, tout, tout + .4)) }));
}
function textW(g, s, px, w = HW, fam = HAND) { g.font = `${w} ${px}px ${fam}`; return g.measureText(s).width; }

// a pen stroke along a polyline, drawn up to fraction k of its length
function pen(g, pts, k, col, lw, o = {}) {
  if (k <= 0 || pts.length < 2) return;
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L1 = d[d.length - 1] * cl(k);
  g.save(); g.strokeStyle = css(col, o.alpha ?? 1); g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; if (o.dash) g.setLineDash(o.dash);
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (d[i] <= L1) g.lineTo(pts[i][0], pts[i][1]);
    else { const f = (L1 - d[i - 1]) / (d[i] - d[i - 1]); g.lineTo(mix(pts[i - 1][0], pts[i][0], f), mix(pts[i - 1][1], pts[i][1], f)); break; }
  }
  g.stroke(); g.restore();
}
function ring(cx, cy, rx, ry, seed = 0, turns = 1.12) {
  const p = [], a0 = -2.3 + hs(seed) * .7, n = 48;
  for (let i = 0; i <= n; i++) { const a = a0 + turns * 2 * Math.PI * i / n, r = 1 + .045 * Math.sin(3 * a + seed) + .03 * i / n; p.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]); }
  return p;
}
function curve(x0, y0, x1, y1, bend = .2) {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend, p = [];
  for (let i = 0; i <= 24; i++) { const s = i / 24; p.push([(1 - s) * (1 - s) * x0 + 2 * s * (1 - s) * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * s * (1 - s) * my + s * s * y1]); }
  return p;
}
function arrow(g, pts, k, col, lw, o = {}) {
  pen(g, pts, k / .85, col, lw, o);
  const hk = seg(k, .85, 1); if (hk <= 0) return;
  const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[pts.length - 3], a = Math.atan2(y1 - y0, x1 - x0), L1 = (o.head ?? lw * 5) * hk;
  for (const s of [-1, 1]) pen(g, [[x1, y1], [x1 - L1 * Math.cos(a + s * .5), y1 - L1 * Math.sin(a + s * .5)]], 1, col, lw, { alpha: o.alpha });
}
const tickPts = (x, y, s) => [[x - .45 * s, y - .05 * s], [x - .12 * s, y + .35 * s], [x + .55 * s, y - .55 * s]];
function dashBox(g, x0, y0, x1, y1, k, col, lw, alpha = 1) { pen(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], k, col, lw, { dash: [lw * 3.5, lw * 2.4], alpha }); }
function patch(g, x0, y0, x1, y1, a = .94, r = 18) {
  if (a <= 0) return; g.save(); g.globalAlpha = a; g.fillStyle = css(PAPER); g.shadowColor = css(PAPER); g.shadowBlur = 16;
  g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, r); g.fill(); g.restore();
}
// a group of drawing calls faded as one (an offscreen layer with the same transform), so overlapping parts never ghost
const LAYERS = [];
function layer(g, a, fn, depth = 0) {
  if (a <= .003) return; if (a >= .997) { fn(g); return; }
  const cw = g.canvas.width, ch = g.canvas.height;
  let c = LAYERS[depth]; if (!c || c.width !== cw || c.height !== ch) c = LAYERS[depth] = mk(cw, ch);
  const lg = c.getContext('2d'); lg.setTransform(1, 0, 0, 1, 0, 0); lg.clearRect(0, 0, cw, ch); lg.setTransform(g.getTransform());
  fn(lg);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.drawImage(c, 0, 0); g.restore();
}
// a small paper card with a hand-inked border (a note pinned on the sheet): the border is drawn by the pen (k), the paper
// fill comes with it; the wobble is fixed per card (seed), so the edge never crawls
function cardPts(x0, y0, x1, y1, r, seed = 0) {
  const p = [], n = 72, w = x1 - x0, h = y1 - y0, per = 2 * (w + h - 4 * r) + 2 * Math.PI * r;
  for (let i = 0; i <= n; i++) {
    let s = per * i / n, x, y;
    const runs = [w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2, w - 2 * r, Math.PI * r / 2, h - 2 * r, Math.PI * r / 2];
    let j = 0; while (j < 7 && s > runs[j]) { s -= runs[j]; j++; }
    const arc = (cx, cy, a0) => [cx + r * Math.cos(a0 + s / r), cy + r * Math.sin(a0 + s / r)];
    if (j === 0) [x, y] = [x0 + r + s, y0]; else if (j === 1) [x, y] = arc(x1 - r, y0 + r, -Math.PI / 2);
    else if (j === 2) [x, y] = [x1, y0 + r + s]; else if (j === 3) [x, y] = arc(x1 - r, y1 - r, 0);
    else if (j === 4) [x, y] = [x1 - r - s, y1]; else if (j === 5) [x, y] = arc(x0 + r, y1 - r, Math.PI / 2);
    else if (j === 6) [x, y] = [x0, y1 - r - s]; else [x, y] = arc(x0 + r, y0 + r, Math.PI);
    const wob = 1.3 * Math.sin(i * .9 + seed) + .8 * Math.sin(i * 2.3 + seed * 1.7);
    p.push([x + wob * .6, y + wob * .6]);
  }
  return p;
}
function noteCard(g, x0, y0, x1, y1, k, o = {}) {
  if (k <= 0) return; const al = o.alpha ?? 1, P = cardPts(x0, y0, x1, y1, o.r ?? 14, o.seed ?? 0);
  g.save(); g.globalAlpha = al * eo(seg(k, 0, .5)); g.fillStyle = css(o.fill || PAPER); g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.restore();
  pen(g, P, k, o.ink || INK, o.lw ?? 3, { alpha: al * .9 });
}

// ------------------------------------------------------------------ camera: one smooth path (monotone cubic per channel)
// reference framings: content of a section is laid out in screen px at its framing (inF), so it stays put on the sheet
const RC = { x: 540, y: 5091, z: .85 }, RD = { x: 540, y: 6860, z: 1 }, RF6 = { x: 275, y: 10665, z: .68 }, RF7 = { x: 1800, y: 10650, z: .8 };
const RG = { x: 540, y: 12900, z: .78 }, RG2 = { x: 540, y: 14650, z: .85 }, RH = { x: 540, y: 16000, z: 1 };
const CAM = [
  [0, 540, 960, 1], [2.2, 540, 960, 1], [3.35, 540, 2190, 1.12], [4.2, 540, 2230, 1.2], [4.5, 540, 2235, 1.2],
  [5.35, 540, 3290, 1.06], [7.8, 540, 3310, 1.06], [8.6, 540, 3330, 1.04], [10.2, 540, 3600, .97],
  // B1: hold on the pile; ease out (1 s) to let the press fall in; push in on the squashed pile and the card; hold the
  // question; then a 1.45 s pan down to the campus
  [11.3, 540, 5091, .93], [19.6, 540, 5100, .94], [22.9, 540, 5100, .94], [23.9, 540, 4900, .64], [24.3, 540, 4900, .64],
  [26.0, 400, 5197, 1.3], [28.45, 402, 5195, 1.31],
  [29.9, 540, 6860, 1.14], [35.6, 540, 6880, 1.22],
  [36.9, 540, 8360, 1.0], [38.8, 540, 8360, 1.0], [40.6, 540, 8440, 1.2], [42.6, 540, 8440, 1.2], [44.4, 540, 8400, 1.03], [61.6, 540, 8420, 1.05],
  // B4: the house; then down to its door while the 32 walk in and up (the queue stays above the caption)
  [63.1, 540, 10638, .74], [65.6, 540, 10638, .74], [66.9, 540, 10950, .85], [69.8, 540, 10950, .85], [71.3, 540, 10420, 1.2], [73.9, 540, 10425, 1.21],
  [75.2, 540, 11000, 1.1], [78.9, 540, 11000, 1.11], [80.0, 560, 11070, 1.15], [81.2, 590, 11075, 1.15], [82.3, 560, 11000, .92],
  // B5: close on the small stove and the stairs together (the runner about 150 px tall), then back out for the crawl
  [83.6, 420, 10900, 1.5], [85.2, 425, 10900, 1.5], [86.4, 760, 10900, 1.5], [89.0, 762, 10902, 1.5], [91.2, 540, 10640, .76], [95.0, 540, 10640, .76],
  [96.4, RF6.x, RF6.y, RF6.z], [110.9, RF6.x + 5, RF6.y + 5, RF6.z + .01],
  [112.3, 1830, 10520, 1.22], [115.4, 1830, 10530, 1.18], [116.4, 1510, 10700, 1.2], [118.7, 2000, 10700, 1.2], [119.6, RF7.x, RF7.y, RF7.z], [121.5, RF7.x, RF7.y, RF7.z], [122.7, 1769, 10498, 1.6], [126.6, 1769, 10500, 1.62], [127.7, RF7.x, RF7.y, RF7.z], [129.9, RF7.x + 5, RF7.y, RF7.z + .005],
  [130.8, 1650, 10620, .82], [133.4, RF6.x, RF6.y, RF6.z],
  [134.3, RF6.x, RF6.y, RF6.z], [135.5, 430, 10600, 1.7], [140.2, 430, 10605, 1.72], [141.4, RF6.x, RF6.y, RF6.z], [166.6, RF6.x + 5, RF6.y + 5, RF6.z + .01],
  // B9: in on the house while it is rebuilt, back to the score card for the new scores
  [167.4, 560, 10600, .86], [168.5, 562, 10600, .86], [169.3, RF6.x + 5, RF6.y + 5, RF6.z + .01], [179.0, RF6.x + 5, RF6.y + 5, RF6.z + .01],
  [180.4, RG.x, RG.y, RG.z], [187.4, 545, 12905, .8], [189.0, 753, 12975, 1.22],
  [190.45, RG2.x, RG2.y, RG2.z], [193.6, RG2.x, RG2.y + 10, RG2.z + .01],
  [194.8, RH.x, RH.y, RH.z], [201.6, 540, RH.y, 1.02], [202.8, 540, RH.y + 20, .92], [DUR, 540, RH.y + 20, .92]];
function hermite(ts, ys, t) {
  const n = ts.length, d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (ts[i + 1] - ts[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s2 = a * a + b * b;
    if (s2 > 9) { const tau = 3 / Math.sqrt(s2); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  if (t <= ts[0]) return ys[0]; if (t >= ts[n - 1]) return ys[n - 1];
  let i = 0; while (t > ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i], s = (t - ts[i]) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
}
const CT = CAM.map((k) => k[0]), CX = CAM.map((k) => k[1]), CY = CAM.map((k) => k[2]), CZ = CAM.map((k) => Math.log(k[3]));
const camAt = (t) => ({ x: hermite(CT, CX, t), y: hermite(CT, CY, t), z: Math.exp(hermite(CT, CZ, t)) });
const toScr = (cam, x, y) => [540 + (x - cam.x) * cam.z, 960 + (y - cam.y) * cam.z];
function inF(g, R, fn) { g.save(); g.translate(R.x - 540 / R.z, R.y - 960 / R.z); g.scale(1 / R.z, 1 / R.z); fn(g); g.restore(); }

function grain(g, cam) {
  const im = A.paper, tw = im.width, th = im.height, x0 = cam.x - 540 / cam.z, x1 = cam.x + 540 / cam.z, y0 = cam.y - 960 / cam.z, y1 = cam.y + 960 / cam.z;
  g.save(); g.globalCompositeOperation = 'multiply';
  for (let ty = Math.floor(y0 / th) * th; ty < y1; ty += th) for (let tx = Math.floor(x0 / tw) * tw; tx < x1; tx += tw) g.drawImage(im, tx, ty);
  g.restore();
}

// ------------------------------------------------------------------ the chefs (real numbers from anim.json)
// chef id -> drawing variant: 121 is the old master with the white beard (cast no. 6), and only he has it
const vOf = (id) => (id === 121 ? 5 : Math.floor(hs(id * 7.13 + 1.7) * 5));
const flipOf = (id) => hs(id * 3.91 + .3) < .5;
function badge(g, x, feet, h, flip, alpha = 1) {   // the red "121" tag on his chest
  const bx = x + (flip ? -1 : 1) * h * .02, by = feet - h * .5, bw = h * .27, bh = h * .125;
  g.save(); g.globalAlpha = alpha; g.fillStyle = css(PAPER); g.strokeStyle = css(RED); g.lineWidth = Math.max(1.2, h * .012);
  g.beginPath(); g.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh * .25); g.fill(); g.stroke(); g.restore();
  hand(g, T.badge, bx, by + bh * .04, bh * .9, RED, { fam: LAT, w: 700, alpha });
}

// the kitchen brigade (B3): 8 rows x 16; the chefs on the first two real slips get seats in rows 1-5
const KY0 = 7950, KIT = { x: 540, top: 7400, h: 1920 };
const KFIX = { 88: [1, 4], 21: [1, 11], 97: [2, 2], 0: [2, 8], 126: [3, 5], 71: [3, 12], 121: [4, 9], 58: [4, 3], 55: [2, 12], 70: [5, 6], 89: [1, 7] };
const SEAT = {}, CREW = [];
function buildCrew() {
  const used = new Set(Object.values(KFIX).map(([r, c]) => r * 16 + c)), free = [];
  for (let s = 0; s < 128; s++) if (!used.has(s)) free.push(s);
  free.sort((a, b) => hs(a * 1.37 + .2) - hs(b * 1.37 + .2));
  let j = 0;
  for (let id = 0; id < 128; id++) { if (KFIX[id]) SEAT[id] = KFIX[id][0] * 16 + KFIX[id][1]; else SEAT[id] = free[j++]; }
  for (let id = 0; id < 128; id++) {
    const s = SEAT[id], r = Math.floor(s / 16), c = s % 16, x = 540 + (c - 7.5) * 66 + (r % 2 ? 17 : -17), y = KY0 + r * 178, hh = 214 + r * 3;
    const d = Math.hypot((c - 7.5) * 66, (r - 3.5) * 178) / Math.hypot(7.5 * 66, 3.5 * 178);
    CREW.push({ id, r, c, x, y, hh, v: vOf(id), flip: flipOf(id), t0: 43.0 + 1.45 * d + .18 * hs(r * 5.1 + c * 9.7) });
  }
  CREW.sort((a, b) => a.r - b.r || a.c - b.c);
}
// pick windows in the kitchen: [start, end] per chef id
function kitchenPicks() {
  const P = {}, f0 = F[0].experts, f1 = F[1].experts;
  f0.forEach((id, i) => { P[id] = [50.0 + i * .085, f1.includes(id) ? 1e9 : 51.3 + i * .03]; });
  f1.filter((id) => !f0.includes(id)).forEach((id, i) => { P[id] = [51.4 + i * .1, 1e9]; });
  return P;
}
let KP;
function pickState(id, t) {
  const p = KP[id]; if (!p || t < p[0]) return null;
  const [ts, te] = p;
  if (t < te) return { s: spring(t - ts, 6.5, 11), xf: eio(seg(t, ts + .05, ts + .22)), live: eo(seg(t, ts + .25, ts + .8)), ts };
  const back = eio(seg(t, te, te + .35)); if (back >= 1) return null;
  return { s: (1 - back) * spring(te - ts, 6.5, 11), xf: 1 - eio(seg(t, te, te + .2)), live: 1 - back, ts };
}
function crew(g, t) {
  if (t < 42.9 || t > 63.6) return;
  const wait = mix(1, .55, eo(seg(t, 49.0, 49.5))) * mix(1, .9, eo(seg(t, 50.0, 50.4)));
  const iaq = Math.round(wait * 40) / 40, top = [];
  for (const m of CREW) {
    const p = seg(t, m.t0, m.t0 + .6); if (p <= 0) continue;
    const ps = pickState(m.id, t); if (ps) { top.push([m, ps]); continue; }
    const sp = S.waitS[m.v], w = m.hh * sp.w / sp.h;
    put(g, paint(sp, p, { ia: iaq, fa: seg(p, .35, 1) }), m.x, m.y, w, { ay: 1, flip: m.flip });   // paper fill follows the ink
    if (m.id === 121 && p >= 1) badge(g, m.x, m.y, m.hh, m.flip, iaq);
  }
  for (const [m, ps] of top) {
    const sc = mix(1, 1.62, ps.s), dy = 26 * ps.s, sw = S.waitS[m.v], ww = m.hh * sw.w / sw.h;
    if (ps.xf < 1) { put(g, paint(sw, 1), m.x, m.y + dy, ww * sc, { ay: 1, flip: m.flip, alpha: 1 - ps.xf }); if (m.id === 121) badge(g, m.x, m.y + dy, m.hh * sc, m.flip, 1 - ps.xf); }
    if (ps.xf <= 0) continue;
    const cs = S.cook[m.v], cw = m.hh * sc * cs.w / cs.h, ph = m.id * .37, f = 1.15 + .12 * (m.id % 3);
    const rot = ps.live * .045 * Math.sin(2 * Math.PI * f * (t - ps.ts) + ph), bob = ps.live * 8 * (.5 - .5 * Math.cos(2 * Math.PI * f * (t - ps.ts) + ph * 1.3));
    put(g, paint(cs, 1, COOK), m.x, m.y + dy - bob, cw, { ay: 1, flip: m.flip, rot, alpha: ps.xf });
    if (m.id === 121) badge(g, m.x, m.y + dy - bob, m.hh * sc, m.flip, ps.xf);
  }
}
const crewOf = (id) => CREW.find((m) => m.id === id);
// world point of a kitchen chef's body (popped if picked)
function chefBody(id, t, up = .5) {
  const m = crewOf(id), ps = pickState(id, t), s = ps ? ps.s : 0, sc = mix(1, 1.62, s);
  return [m.x, m.y + 26 * s - m.hh * sc * up, m.hh * sc];
}

// ------------------------------------------------------------------ the building (B4-B9)
// line_building_q (cut 997 x 1295) is drawn BLD.w wide standing on the ground line BLD.g; line_building_h (997 x 1315) is
// redrawn over it at the same width on the same ground line. Every anchor is [u, v] on the packed drawing, measured at full
// size (scratchpad INTEGRATE.md):
//   q  kitchen floor: back edge v .442 (stove feet .458), front edge .505, left edge (.07,.505)-(.2,.442), stair post u .78
//      stair treads (foot to top): QSTAIR; small two-burner stove u .165-.275, top v .68-.70, pot .655; left sofa u .175-.454,
//      back top .737, base .813 (QSOFA); armchair u .71-.85, seat ~.84; door sill (.107,.862); downstairs floor v .765-.985
//   h  kitchen floor: back .452, front .555, left edge (.07,.555)-(.18,.452); treads HSTAIR; stove u .157-.279, top .70-.724;
//      left sofa u .176-.453, back top .753, base .827 (HSOFA)
const BLD = { x: 540, g: 11300, w: 1000 };
let BQH = 1299, BHH = 1319;                               // drawn heights of _q and _h (set from the drawings in setup)
const bu = (u) => BLD.x + (u - .5) * BLD.w, bv = (v) => BLD.g - BQH + v * BQH, bvH = (v) => BLD.g - BHH + v * BHH;
const CH = 110;                                           // chef height in the building (world px)
const QSTAIR = [[.92, .955], [.91, .83], [.897, .70], [.878, .614], [.847, .529], [.82, .486], [.808, .46]];
const HSTAIR = [[.925, .955], [.915, .83], [.903, .71], [.885, .627], [.863, .565], [.84, .515], [.825, .485]];
const QSOFA = [[.177, .812], [.177, .758], [.2, .756], [.204, .74], [.434, .74], [.437, .756], [.452, .758], [.452, .812]];
const HSOFA = [[.178, .826], [.178, .768], [.2, .766], [.204, .755], [.431, .755], [.434, .766], [.451, .768], [.451, .826]];
const UPQ = [], UPH = [], DOWN = [];
let STAIR, STAIRH, STOVE, STOVEH, DOOR, FLOP;
const SEAT121 = 22;                                       // front row, 7th from the left
const DN = 48;                                            // chefs drawn downstairs
// u, v boxes on line_building_q nobody stands in: table, two chairs, armchair, the stove corner behind the left sofa
const NOGO = [[.35, .822, .575, .962], [.258, .835, .405, .968], [.515, .835, .665, .968], [.69, .77, .875, .912], [.14, .75, .3, .812]];
function crowdSpots() {
  const cand = [];
  for (let v = .822; v <= .984; v += .0075) for (let u = .14; u <= .785; u += .009) cand.push([u, v]);
  cand.sort((a, b) => hs(a[0] * 91.7 + a[1] * 53.3) - hs(b[0] * 91.7 + b[1] * 53.3));
  for (let sp = 1; sp > .3; sp -= .05) {   // the widest spacing that still seats everyone
    const out = [];
    for (const [u, v] of cand) {
      if (NOGO.some(([u0, v0, u1, v1]) => u > u0 && u < u1 && v > v0 && v < v1)) continue;
      if (out.some(([a, b]) => ((u - a) / (.056 * sp)) ** 2 + ((v - b) / (.034 * sp)) ** 2 < 1)) continue;
      out.push([u, v]); if (out.length >= DN) return out;
    }
  }
  return null;
}
function layoutBuilding() {
  BQH = BLD.w * S.bq.h / S.bq.w; BHH = BLD.w * S.bh.h / S.bh.w;
  UPQ.length = 0; UPH.length = 0; DOWN.length = 0;
  // 32 upstairs on the small floor: back row 16 between the stoves and the front row, front row 16 on the floor's edge
  for (let i = 0; i < 32; i++) { const r = i < 16 ? 0 : 1, c = i % 16, u0 = r ? .1 : .165, u1 = r ? .745 : .755; UPQ.push([bu(u0 + c * (u1 - u0) / 15), bv(r ? .503 : .476), r]); }
  // 64 on the rebuilt floor: four rows, the back rows narrower (the floor's left edge runs diagonally)
  const HV = [.474, .5, .526, .551], HU0 = [.165, .137, .109, .08];
  for (let i = 0; i < 64; i++) { const r = Math.floor(i / 16), c = i % 16; UPH.push([bu(HU0[r] + c * (.772 - HU0[r]) / 15), bvH(HV[r]), r]); }
  // downstairs: DN chefs spread loosely over the free floor (in front of the sofas, by the door, around and in front of
  // the table), never on the furniture, so the table, the chairs and the armchair stay readable and the room has space
  // left; a stand-in for "everyone else" (96 would be a solid block at this scale)
  crowdSpots().forEach(([u, v], i) => DOWN.push([bu(u), bv(v), 0, i]));
  STAIR = QSTAIR.map(([u, v]) => [bu(u), bv(v)]); STAIRH = HSTAIR.map(([u, v]) => [bu(u), bvH(v)]);
  STOVE = [[bu(.192), bv(.778)], [bu(.255), bv(.778)]]; STOVEH = [[bu(.19), bvH(.8)], [bu(.255), bvH(.8)]];
  DOOR = [bu(.107), bv(.862)]; FLOP = [bu(.778), bv(.872)];
}
// stable seat maps for the upstairs sets
function seatMap(prev, set, n, fixed) {
  const map = new Map(), taken = new Set();
  if (set.includes(121) && fixed != null) { map.set(121, fixed); taken.add(fixed); }
  if (prev) for (const [id, s] of prev) if (set.includes(id) && !map.has(id) && s < n) { map.set(id, s); taken.add(s); }
  const free = []; for (let s = 0; s < n; s++) if (!taken.has(s)) free.push(s);
  set.filter((id) => !map.has(id)).sort((a, b) => a - b).forEach((id, i) => map.set(id, free[i]));
  return map;
}
let UPS;                                                  // [{t, map, n}] upstairs occupancy over time
let CALLS;                                                // [{t0, t1, ids}] upstairs chefs cooking for a slip
function buildUpstairs() {
  const cnt = new Array(128).fill(0); F.forEach((f) => f.experts.forEach((e) => cnt[e]++));
  const set0 = F[0].resident.slice(), setR = [121];
  for (let i = 0; setR.length < 32; i++) { const e = Math.floor(hs(i * 5.17 + 91.3) * 128); if (!setR.includes(e)) setR.push(e); }
  const setP = [...Array(128).keys()].sort((a, b) => cnt[b] - cnt[a] || a - b).slice(0, 32);
  const R9 = F[9].resident, R10 = F[10].resident, R13 = F[13].resident, R15 = F[15].resident;
  const extra = [...Array(128).keys()].filter((e) => !R15.includes(e)).sort((a, b) => cnt[b] - cnt[a] || a - b).slice(0, 32);
  const seq = [[65.6, set0], [106.6, setR], [142.6, setP], [155.4, R9], [155.9, R10], [156.4, R13], [164.6, R15]];
  UPS = []; let prev = null;
  for (const [t, set] of seq) { prev = seatMap(prev, set, 32, SEAT121); UPS.push({ t, map: prev, n: 32 }); }
  // room for half: everyone moves to the front two rows of the new floor, 32 more come up behind
  const mh = new Map(); for (const [id, s] of prev) mh.set(id, s + 32);
  extra.sort((a, b) => a - b).forEach((id, i) => mh.set(id, i));
  UPS.push({ t: 167.6, map: mh, n: 64 });
  S.sets = { set0, setR, setP, extra, cnt };
  // slips that make the upstairs chefs cook (hits only)
  const hitsOf = (fi, set) => F[fi].experts.filter((e) => set.includes(e));
  // "the busiest work upstairs" (b10): the 32 cook while the voice says it, then wait; later only a slip's hits cook
  CALLS = [{ t0: 68.0, t1: 72.6, ids: set0 }, { t0: 83.9, t1: 95.2, ids: hitsOf(1, set0) }];
  [2, 3, 4, 5].forEach((fi, i) => CALLS.push({ t0: 107.6 + i * .3, t1: 107.6 + i * .3 + .32, ids: hitsOf(fi, setR) }));
  [[9, R9], [10, R10], [13, R13]].forEach(([fi, R], i) => CALLS.push({ t0: 155.4 + i * .5, t1: 155.4 + i * .5 + .5, ids: hitsOf(fi, R) }));
  CALLS.push({ t0: 164.6, t1: 165.4, ids: hitsOf(15, R15) });
}
const cookLvl = (id, t) => { let l = 0; for (const c of CALLS) if (t > c.t0 && t < c.t1 + .2 && c.ids.includes(id)) l = Math.max(l, eo(seg(t, c.t0, c.t0 + .12)) * (1 - seg(t, c.t1, c.t1 + .2))); return l; };
function upPos(map, n, id) { const s = map.get(id); if (s == null) return null; const P = n === 64 ? UPH : UPQ; return P[s]; }

// a small chef: waiting pose, or cooking in red when called
function smallChef(g, id, x, feet, t, o = {}) {
  const v = vOf(id), fl = flipOf(id), al = o.alpha ?? 1, p = o.p ?? 1, cl0 = o.cook ?? cookLvl(id, t), h = o.h ?? CH;
  if (al <= .01) return;
  if (cl0 < 1) { const sp = S.waitT[v]; put(g, paint(sp, p, o.ia != null ? { ia: o.ia } : {}), x, feet - (o.bob ?? 0), h * sp.w / sp.h, { ay: 1, flip: fl, alpha: al * (1 - cl0) }); }
  if (cl0 > 0) {
    const cs = S.cookT[v], f = 1.3 + .1 * (id % 3), ph = id * .37, rot = .05 * Math.sin(2 * Math.PI * f * t + ph), bob = 4 * (.5 - .5 * Math.cos(2 * Math.PI * f * t + ph));
    put(g, paint(cs, 1, COOK), x, feet - bob, h * 1.06 * cs.w / cs.h, { ay: 1, flip: fl, alpha: al * cl0, rot });
  }
  if (id === 121 && p >= 1) badge(g, x, feet, h, fl, al);
}
function walkPath(pts, d) {           // position at distance d along a polyline
  for (let i = 1; i < pts.length; i++) { const L1 = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (L1 < 1e-6) continue; if (d <= L1) { const f = d / L1; return [mix(pts[i - 1][0], pts[i][0], f), mix(pts[i - 1][1], pts[i][1], f)]; } d -= L1; }
  return pts[pts.length - 1];
}
const pathLen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
// the left sofa redrawn over the two chefs at the small stove, so they stand behind it
function sofaOver(g, t, cv, rebuilt) {
  if (!cv) return;
  const P = rebuilt ? HSOFA : QSOFA, bvv = rebuilt ? bvH : bv;
  g.save(); g.beginPath(); P.forEach(([u, v], i) => (i ? g.lineTo(bu(u), bvv(v)) : g.moveTo(bu(u), bvv(v)))); g.closePath(); g.clip();
  put(g, cv, BLD.x, BLD.g, BLD.w, { ay: 1 }); g.restore();
}
function building(g, t) {
  if (t < 61.8 || t > 180.6) return;
  // the drawing: the first building, rebuilt with equal floors in B9 (same width, same ground line)
  // the rebuild: _h is drawn over _q in register (same roof, walls and ground line), and _q only fades once _h's pen has
  // passed, so the floors the chefs stand on are never missing
  const qOut = seg(t, 168.35, 168.85), rebuilt = t >= 167.6;
  let bq = null, bh = null;
  if (qOut < 1) { bq = paint(S.bq, seg(t, 62.2, 63.4), { ia: 1 - qOut, fa: 1 - qOut, cache: qOut === 0 }); put(g, bq, BLD.x, BLD.g, BLD.w, { ay: 1 }); }
  if (t > 167.2) { bh = paint(S.bh, seg(t, 167.25, 168.35)); put(g, bh, BLD.x, BLD.g, BLD.w, { ay: 1 }); }
  // --- upstairs (behind the floor slab's edge nothing is drawn, so order does not matter)
  if (t >= 65.6) upstairs(g, t);
  // --- the little stove: two chefs cooking at half speed (B4 on), behind the left sofa
  if (t >= 79.4) {
    (rebuilt ? STOVEH : STOVE).forEach(([x, y], i) => {
      const id = [70, 1003][i], v = vOf(id), cs = S.cookT[v], f = .55, ph = i * 1.9, live = t - 79.4;
      const rot = .05 * Math.sin(2 * Math.PI * f * live + ph), bob = 3 * (.5 - .5 * Math.cos(2 * Math.PI * f * live + ph));
      put(g, paint(cs, seg(t, 79.4, 79.9), i === 0 && t > 83.9 && t < 95 ? COOK : {}), x, y - bob, CH * cs.w / cs.h, { ay: 1, flip: i === 1, rot });
    });
    sofaOver(g, t, rebuilt ? bh : bq, rebuilt);
  }
  // --- downstairs: DN walk in (B4), then rest in break poses; a third of them go upstairs in the rebuild
  const crowd = [];
  if (t >= 74.6) for (let i = 0; i < DN; i++) {
    const [sx, sy] = DOWN[i], last = i === DN - 1, t0 = 74.6 + i * (6.84 / (DN - 1)), id = 1000 + i;
    if (t < t0) continue;
    const tgt = last ? FLOP : [sx, sy], path = last ? [DOOR, [bu(.25), bv(.978)], [bu(.72), bv(.975)], tgt] : [DOOR, tgt], Lp = pathLen(path), dur = Lp / 950;
    const tq = q15(t - t0), arr = tq >= dur;
    let al = 1; if (rebuilt && i % 3 === 0) al = 1 - seg(t, 167.6 + (i % 7) * .05, 168.0 + (i % 7) * .05);
    if (al <= 0) continue;
    if (!arr) { const [x, y] = walkPath(path, tq * 950); crowd.push([y, () => smallChef(g, id, x, y, t, { cook: 0, bob: 3 * Math.abs(Math.sin(tq * Math.PI * 4)), alpha: al })]); continue; }
    // arrived: a clean pose change on the next drawing (on twos), never two poses blended
    const ta = t0 + dur, b = S.brk[last ? 0 : 1 + (i * 3) % 4], bh2 = last ? CH * .9 : CH;
    crowd.push([tgt[1], () => {
      const flop = last ? spring(t - ta, 5, 9) : 1;
      put(g, paint(b, 1), tgt[0], tgt[1], bh2 * b.w / b.h, { ay: 1, alpha: al, flip: !last && (i * 7) % 2 === 1, rot: last ? mix(-.5, 0, flop) : 0 });
    }]);
  }
  crowd.sort((a, b) => a[0] - b[0]).forEach((c) => c[1]());
  stairs(g, t);
}
function upstairs(g, t) {
  let k = 0; while (k + 1 < UPS.length && t >= UPS[k + 1].t) k++;
  const cur = UPS[k], prv = k ? UPS[k - 1] : null, list = [];
  for (const [id, s] of cur.map) {
    const P = cur.n === 64 ? UPH : UPQ, [x, y] = P[s];
    if (k === 0) {   // B4: they walk in at the left door, along the front of the room, up the stairs and back to their seat
      const i = s, t0 = 65.8 + i * .085, path = [DOOR, [bu(.25), bv(.978)], [bu(.9), bv(.97)], ...STAIR, [bu(.765), y], [x, y]], Lp = pathLen(path), dur = Lp / 1100;
      if (t < t0) continue;
      const tq = q15(t - t0);
      if (tq < dur) { const [wx, wy] = walkPath(path, tq * 1100); list.push([wy, () => smallChef(g, id, wx, wy, t, { cook: 0, bob: 3 * Math.abs(Math.sin(tq * Math.PI * 4)) })]); continue; }
      list.push([y, () => smallChef(g, id, x, y, t)]); continue;
    }
    // a swap is sequential: the old chef fades off the seat first, then the new one is inked in (no double exposure)
    const st = cur.t + (s % 32) * .018, gone = seg(t, st, st + .18), f = seg(t, st + .16, st + .5);
    const was = prv && prv.map.has(id) ? upPos(prv.map, prv.n, id) : null;
    if (was && (was[0] !== x || was[1] !== y)) {   // moved (the rebuild): slide to the new seat
      const m = eio(seg(t, cur.t, cur.t + 1.0)); list.push([mix(was[1], y, m), () => smallChef(g, id, mix(was[0], x, m), mix(was[1], y, m), t)]); continue;
    }
    if (was) { list.push([y, () => smallChef(g, id, x, y, t)]); continue; }
    if (f > 0) list.push([y, () => smallChef(g, id, x, y, t, { p: f })]);
    if (prv) for (const [oid, os] of prv.map) if (os === s && !cur.map.has(oid) && gone < 1) { const [ox, oy] = upPos(prv.map, prv.n, oid); list.push([oy, () => smallChef(g, oid, ox, oy, t, { alpha: 1 - gone, cook: 0 })]); }
  }
  list.sort((a, b) => a[0] - b[0]).forEach((c) => c[1]());
}
// figures on the stairs (along the treads): the B5 runner, the B6 misses, the B8 and B9 queues
function stairs(g, t) {
  const S0 = t >= 167.6 ? STAIRH : STAIR, L0 = pathLen(S0), at = (s) => walkPath(S0, cl(s) * L0);
  const fig = (s, id, run = false, al = 1) => {
    const [x, y] = at(s);
    if (run) { const r = S.run[vOf(id)]; put(g, paint(r, 1), x, y, CH * r.w / r.h, { ay: 1, alpha: al, flip: true }); return; }
    smallChef(g, id, x, y, t, { cook: 0, alpha: al });
  };
  if (t > 85.4 && t < 96) {   // the runner: slow, two steps a second (he starts a few treads up, clear of the caption)
    const s = .2 + seg(q15(t), 85.6, 95.0) * .77 + .012 * Math.abs(Math.sin(q15(t) * Math.PI * 2));
    fig(s, 89, true, 1 - seg(t, 95.2, 95.8));
  }
  if (t > 107.6 && t < 111.2) {   // B6: one figure per miss, up to 8
    let n = 0; [2, 3, 4, 5].forEach((fi, i) => { if (t >= 107.6 + i * .3) n += F[fi].experts.filter((e) => !S.sets.setR.includes(e)).length; });
    n = Math.min(8, Math.round(n / 3));
    for (let i = 0; i < n; i++) fig(.08 + i * .11, 2000 + i, false, 1 - seg(t, 110.7, 111.2));
  }
  const queue = (t0, n, dur) => { if (t < t0 || t > t0 + dur + 1.2) return; for (let i = 0; i < n; i++) { const s = seg(q15(t), t0 + i * .18, t0 + i * .18 + dur); if (s > 0 && s < 1) fig(s, 3000 + i + Math.round(t0)); } };
  queue(142.2, 6, 1.4); queue(167.6, 8, 1.2);
}
// ------------------------------------------------------------------ the slips (screen space, top right; real numbers)
function slipDraw(g, cx, top, h, rot, nums, o = {}) {
  g.save(); g.translate(cx, top); g.rotate(rot); const sc = h / 900; g.scale(sc, sc);
  put(g, paint(S.ticket, 1), 0, 0, 900 * S.ticket.w / S.ticket.h, { ay: 0 });
  const k = o.k ?? 1;
  if (o.head) hand(g, o.head, 0, 230, ZH ? 72 : 80, RED, { k: o.hk ?? 1 });
  nums.forEach((n, i) => {
    const x = (i % 2 ? 72 : -72), y = 360 + Math.floor(i / 2) * 135, kk = seg(k, i / 8, (i + 1) / 8);
    const hit = o.marks ? o.marks[i] : null;
    hand(g, String(n), x - 8, y, 96, hit === false ? PENCIL : INK, { fam: LAT, w: 700, k: kk });
    if (o.circle != null && n === o.circle) pen(g, ring(x - 8, y, 62, 50, n + (o.seed ?? 0)), o.ck ?? 1, RED, 9);
    if (hit === true && o.mk > 0) pen(g, tickPts(x + 58, y + 8, 50), o.mk, RED, 9);
    if (hit === false && o.mk > 0) pen(g, [[x - 50, y + 4], [x + 34, y - 4]], o.mk, PENCIL, 7);
  });
  g.restore();
}
// the slot: B3 (big first, then into the slot), B5, B6, B8; each slip drops in on a short spring
const SLOT = { cx: 958, top: 290, h: 330 };
function slots(g, t) {
  // B3: the first slip comes to the front, then moves to the slot; the second drops on top of it
  if (t >= 49.0 && t < 62.6) {
    const k = spring(t - 49.0, 8, 9), mv = eio(seg(t, 49.85, 50.4)), out = eio(seg(t, 61.9, 62.5));
    const h = mix(1010, SLOT.h, mv), cx = mix(540, SLOT.cx, mv) + out * 300, top = mix(-1250, 250, k) + mv * (SLOT.top - 250);
    const rot = wobble(t - 49.0, .06, 3.2, 8) + wobble(t - 49.85, -.05, 3.5, 9);
    slipDraw(g, cx, top, h, rot, F[0].experts, { head: T.ticket, k: seg(t, 49.2, 49.8), hk: seg(t, 49.15, 49.5), circle: t > 50.75 ? 121 : null, ck: seg(t, 50.8, 51.1) });
    if (t >= 51.3) { const d = spring(t - 51.3, 9, 10); slipDraw(g, SLOT.cx + 6 + out * 300, mix(-500, SLOT.top + 10, d), SLOT.h, .03 + wobble(t - 51.3, .05, 4, 9), F[1].experts, { head: T.ticket }); }
  }
  const drop = (t0, fi, o = {}) => { const d = spring(t - t0, 10, 11); slipDraw(g, SLOT.cx + (o.dx ?? 0), mix(-450, SLOT.top, d), SLOT.h, (o.rot ?? 0) + wobble(t - t0, .05, 4, 9), F[fi].experts, o); };
  const seq = (list, t1) => {   // list of [t0, fi, opts]; the last one that has arrived is on top, the one below shows under it
    if (t < list[0][0] || t > t1 + .5) return;
    const out = eio(seg(t, t1, t1 + .5)) * 320;
    let i = 0; while (i + 1 < list.length && t >= list[i + 1][0]) i++;
    g.save(); g.translate(out, 0);
    if (i > 0) drop(list[i - 1][0] - 9, list[i - 1][1], Object.assign({ head: T.ticket }, list[i - 1][2], { mk: 1, k: 1 }));
    drop(list[i][0], list[i][1], Object.assign({ head: T.ticket }, list[i][2]));
    g.restore();
  };
  const marks = (fi, set) => F[fi].experts.map((e) => set.includes(e));
  if (S.sets) {
    seq([[83.6, 1, { marks: F[1].hit, mk: seg(t, 84.0, 84.6) }]], 95.4);
    seq([2, 3, 4, 5].map((fi, i) => [107.6 + i * .3, fi, { marks: marks(fi, S.sets.setR), mk: seg(t, 107.7 + i * .3, 107.85 + i * .3), k: 1 }]), 110.4);
    seq([...Array(40).keys()].map((fi) => [135.9 + fi * .042, fi, { circle: 121, ck: 1, k: 1 }]), 140.2);
    seq([[155.4, 9, { marks: F[9].hit, mk: seg(t, 155.5, 155.7) }], [155.9, 10, { marks: F[10].hit, mk: seg(t, 156.0, 156.2) }], [156.4, 13, { marks: F[13].hit, mk: seg(t, 156.5, 156.7) }]], 158.6);
  }
}

// ------------------------------------------------------------------ the answer line (B3-B9): the AI writes a recipe, word by word
// [time, units written] keyframes; between two keys the new units are written (a crawl when the gap is long)
const ANS = ZH ? [[50.0, 0], [50.3, 1], [51.3, 1], [51.6, 2], [83.9, 2], [84.2, 3], [90.8, 3], [95.0, 4], [107.6, 4], [108.9, 6], [155.4, 6], [157.2, 7], [177.8, 7], [178.6, 11]]
  : [[50.0, 0], [50.3, 1], [51.3, 1], [51.6, 2], [83.9, 2], [84.2, 3], [90.8, 3], [95.0, 4], [107.6, 4], [108.9, 6], [155.4, 6], [157.2, 7], [177.8, 7], [178.6, 9]];
function ansUnits(t) {
  if (t <= ANS[0][0]) return 0; if (t >= ANS[ANS.length - 1][0]) return ANS[ANS.length - 1][1];
  let i = 0; while (t > ANS[i + 1][0]) i++;
  const [t0, u0] = ANS[i], [t1, u1] = ANS[i + 1];
  if (u1 === u0) return u0;
  const k = (t - t0) / (t1 - t0);
  return u0 + (t1 - t0 > 2 ? Math.floor(k * 9) / 9 : k) * (u1 - u0);   // the crawl goes in jerks
}
// the chat: a small inked card in the top-left corner (sized to the whole answer, so it never grows or crawls); each new
// word is tied to the slip that called it by a short red arrow the first two times
const ACARD = { x0: 44, y0: 270, y1: 392 };
function answerLine(g, t) {
  const a = fadeIO(t, 46.8, 178.9, .5, .4); if (a <= 0) return;
  const x0 = 70, qpx = ZH ? 36 : 40, apx = ZH ? 44 : 50, qy = 302, ay = 356;
  g.save(); g.font = `${HW} ${apx}px ${HAND}`; const full = g.measureText(T.ans.join(T.ansSep)).width; g.font = `${HW} ${qpx}px ${HAND}`; const qw = g.measureText(T.askQ).width; g.restore();
  const x1 = Math.min(1000, x0 + Math.max(full + 40, qw) + 26);
  noteCard(g, ACARD.x0, ACARD.y0, x1, ACARD.y1, seg(t, 46.8, 47.3), { alpha: a, seed: 3, lw: 2.6 });
  hand(g, T.askQ, x0, qy, qpx, BLUE, { align: 'left', k: seg(t, 47.0, 47.8), alpha: a });
  const u = ansUnits(t), n = Math.floor(u), f = u - n, sep = T.ansSep;
  const done = T.ans.slice(0, n).join(sep), next = n < T.ans.length ? (n ? sep : '') + T.ans[n] : '';
  g.save(); g.font = `${HW} ${apx}px ${HAND}`;
  const w0 = done ? g.measureText(done).width : 0, w1 = next ? g.measureText(done + next).width - w0 : 0; g.restore();
  const shown = done + (f > 0 ? next : '');
  if (shown) {
    g.save(); g.beginPath(); g.rect(x0 - 10, qy + 18, w0 + w1 * f + 10, 70); g.clip();
    hand(g, shown, x0, ay, apx, INK, { align: 'left', alpha: a }); g.restore();
  }
  // the cursor: red, blinking twice a second while waiting
  const cx = x0 + w0 + w1 * f + 8, blink = (Math.floor(t * 4) % 2 === 0 || (f > 0 && f < 1)) ? 1 : .15;
  if (n < T.ans.length || t < 179) { g.save(); g.globalAlpha = a * blink; g.fillStyle = css(RED); g.fillRect(cx, ay - 22, 4, 42); g.restore(); }
  // the slip in the slot -> the word it wrote (B3, the first two words)
  [[50.3, 1], [51.6, 2]].forEach(([t0, w]) => {
    if (t < t0 || t > t0 + 1.4) return;
    g.save(); g.font = `${HW} ${apx}px ${HAND}`; const wa = g.measureText(T.ans.slice(0, w - 1).join(sep) + (w > 1 ? sep : '')).width, wb = g.measureText(T.ans.slice(0, w).join(sep)).width; g.restore();
    const wx = x0 + (wa + wb) / 2, al = a * (1 - seg(t, t0 + 1.0, t0 + 1.4));
    arrow(g, curve(SLOT.cx - 70, SLOT.top + 150, wx + 6, ACARD.y1 + 10, -.22), seg(t, t0 + .05, t0 + .4), RED, 4.5, { alpha: al });
  });
  if (t > 93.5 && t < 95.8) hand(g, T.lag, cx + 60, ay - 4, ZH ? 46 : 52, RED, { k: seg(t, 93.5, 93.8), rot: -.08, alpha: 1 - seg(t, 95.2, 95.8) });
}

// ------------------------------------------------------------------ the sheet, section by section
const SRV = { x: 540, y: 1320, w: 1000 }, BRAIN = { x: 540, y: 1180, w: 620 }, CARD = { x: 540, y: 2250, w: 560 };
// the brain drops onto the card and does NOT fit: it lands wider than the card, squashes, bulges over both edges and
// keeps pushing (two shoves) while the card shakes under it
const BY = [[0, BRAIN.y], [2.45, BRAIN.y], [3.0, 1880], [3.4, CARD.y - 326], [DUR, CARD.y - 326]], BW = [[0, BRAIN.w], [2.5, BRAIN.w], [3.0, 560], [3.4, 640], [DUR, 640]];
const SHOVES = [3.4, 4.0, 4.6];
function brainAt(t) {
  const u = eio(seg(t, 2.5, 3.4)), a = seg(t, 2.25, 2.55);
  const st = 1 + .3 * Math.sin(Math.PI * u) - .08 * Math.sin(Math.PI * a), breathe = 1 + .012 * Math.sin(t * 2.3);
  let push = 0; for (const s of SHOVES) push += wobble(t - s, s === 3.4 ? .2 : .1, 5, 11);
  const flat = .1 * eo(seg(t, 3.4, 3.7));                          // settles squashed, bulging past the card
  return { x: BRAIN.x, y: hermite(BY.map((k) => k[0]), BY.map((k) => k[1]), t), w: hermite(BW.map((k) => k[0]), BW.map((k) => k[1]), t) * breathe,
    sx: (1 / st) * (1 + push + flat), sy: st * (1 - push - flat) };
}
function secA(g, t, cover = false) {
  if (t >= 5.8) return;
  put(g, paint(S.servers, 1), SRV.x, SRV.y, SRV.w);
  const hk = 1 - seg(t, C.hookOut, C.hookOut + .4);
  if (hk > 0) {
    const f1 = fitPx(g, T.hook[0], ZH ? 80 : 96, 940), f2 = fitPx(g, T.hook[1], ZH ? 110 : 128, 960), y2 = 330 + f1 * .55 + f2 * .62;
    hand(g, T.hook[0], 540, 330, f1, INK, { alpha: hk }); hand(g, T.hook[1], 540, y2, f2, RED, { alpha: hk });
    hand(g, T.hookTag, 540, y2 + f2 * .55 + 26, fitPx(g, T.hookTag, ZH ? 32 : 36, 900), INK, { alpha: hk * .85 });
  }
  if (t >= C.gpu - .1 && !cover) {
    let bump = 0, rot = 0; for (const s of SHOVES) { bump += wobble(t - s, s === 3.4 ? .06 : .035, 6, 13); rot += wobble(t - s - .02, .025, 5, 19); }
    put(g, paint(S.gpu, seg(t, C.gpu, C.gpu + .5), { fill: wash(BLUE, .24) }), CARD.x, CARD.y, CARD.w, { sx: 1 + bump, sy: 1 - bump, rot });
  }
  const b = brainAt(t), pulse = .16 + .1 * eo(seg(t, .3, .8)) * (1 - seg(t, 1.6, 2.4)) + .12 * eo(seg(t, 3.4, 3.9));
  // anchored at its bottom, so the squash presses down onto the card
  const bh = b.w * S.brain.h / S.brain.w, by = b.y + bh / 2;
  g.save(); const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.w * .85); gr.addColorStop(0, css(RED, pulse)); gr.addColorStop(1, css(RED, 0));
  g.fillStyle = gr; g.fillRect(b.x - b.w, b.y - b.w, b.w * 2, b.w * 2); g.restore();
  put(g, paint(S.brain, 1, { fill: wash(RED, .3) }), b.x, by, b.w, { sx: b.sx, sy: b.sy, ay: 1 });
  if (!cover) L(g, t, T.card, 540, CARD.y + 190, ZH ? 54 : 62, RED, 3.55, 5.4, { patch: .5, rot: -.02, dur: .5 });
}
// B: the forum thread, the programmers, the comments that burst the window
const FORUM = { x: 540, top: 2650, w: 780 };
// the four reactions, lettered over the window around the programmers' heads (world x, y, rotation): inside the safe band
// at every camera position of the beat, left of the right rail, never under the caption
const WOW = [[235, 3300, -.12], [445, 3205, .08], [655, 3292, -.07], [745, 3196, .1]];
function secB(g, t) {
  if (t < 4.3 || t > 11.7) return;
  layer(g, 1 - seg(t, 11.05, 11.6), (g) => secB0(g, t));
}
function secB0(g, t) {
  const fs = FORUM.w / S.forum.w, fx = (px) => FORUM.x - FORUM.w / 2 + px * fs, fy = (py) => FORUM.top + py * fs;
  // the burst behind the programmers (and behind the window): drawn from the centre out as they pop in
  if (t >= 7.9) { const pop = spring(t - 7.95, 6, 11); put(g, paint(S.burst, seg(t, 7.95, 8.4)), 540, 3640, 1240 * mix(.8, 1, pop)); }
  put(g, paint(S.forum, seg(t, 4.6, 5.1)), FORUM.x, FORUM.top, FORUM.w, { ay: 0 });
  const tp = Math.min(fitPx(g, T.forumTitle[0], 58, 590), fitPx(g, T.forumTitle[1], 58, 590));
  L(g, t, T.forumTitle[0], fx(150), fy(225), tp, INK, 4.85, null, { align: 'left', dur: .45 });
  L(g, t, T.forumTitle[1], fx(150), fy(305), tp, INK, 5.25, null, { align: 'left', dur: .4 });
  L(g, t, T.forumDate, fx(150), fy(395), ZH ? 30 : 34, BLUE, 5.6, null, { align: 'left', dur: .3 });
  if (t > 5.0) { const sw = textW(g, T.forumStrata, tp); pen(g, ring(fx(150) + sw / 2, fy(225), sw / 2 + 26, tp * .62, 3), seg(t, 5.1, 5.45), RED, 6); }
  // the comments pile up and burst the window (blank rows: they run off the bottom of the frame)
  for (let k = 4; k <= 8; k++) {
    const t0 = 8.6 + (k - 4) * .2; if (t < t0) break;
    const sp = (k - 3) * .5, dx = (hs(k * 3.3) - .5) * 60 * sp, rot = (hs(k * 7.7) - .5) * .06 * sp, y = fy(603 + k * 229.5);
    put(g, paint(S.row, seg(t, t0, t0 + .25)), FORUM.x + dx, y, 900 * fs * (1 + .03 * sp), { rot });
  }
  if (t >= 7.9) { const pop = spring(t - 7.95, 6, 11); put(g, paint(S.coders, seg(t, 7.95, 8.45)), 540, 3860, 940 * mix(.92, 1, pop), { ay: 1 }); }
  // what they shout, over the window, above their heads
  WOW.forEach(([x, y, r], i) => {
    const t1 = 8.78 + i * .2; if (t < t1) return;
    const px = ZH ? (i === 3 ? 54 : 60) : (i === 3 ? 62 : 70);
    hand(g, T.wow[i], x, y, px, i % 2 ? BLUE : RED, { k: seg(t, t1, t1 + .25), s: mix(.6, 1, spring(t - t1, 7, 13)), rot: r + wobble(t - t1, .08), knock: .32 });
  });
}
// C: the pile of numbers, the card, ten times, the press (laid out in screen px at framing RC)
// line_heap (cut 1254 x 991) is drawn HW wide on the ground line HB; the dashed "what fits" box is a tenth of its height
// (250 GB / 24 GB = 10.4 boxes), and the press stops at 1.57 boxes (37.6 GB / 24 GB). DEC: [u, v on the heap drawing, text].
const HB = 1070, HX = 665, HW0 = 680;
const DEC = [[.2, .72, '0.013'], [.36, .82, '-0.27'], [.52, .75, '0.71'], [.68, .83, '-1.04'], [.8, .73, '0.05'], [.28, .55, '0.36'], [.46, .6, '-0.09'],
  [.62, .53, '0.88'], [.74, .62, '-0.52'], [.4, .39, '0.002'], [.56, .37, '-0.6'], [.5, .2, '1.2'], [.12, .88, '-0.33'], [.79, .91, '0.41']];
// line_press with the plain middle of its two posts cut out (rows PR0..PR1 of the packed drawing, only post sides there),
// so that the plate sits 1.57 boxes above the feet: the press lands on its feet and the heap ends exactly under the plate.
const PR = { plate: 876 / 1347, band: .237, r0: 900 };
function secC(g, t) {
  if (t < 10.0 || t > 30.2) return;
  inF(g, RC, (g) => {
    const H0 = HW0 * S.heap.h / S.heap.w, bh = H0 / 10.4, clr = 1.57 * bh, P = S.press, pw = P.w * P.k, ph = P.h * P.k;
    const sq = eio(seg(t, C.pressDown, C.pressDown + .9)), land = wobble(t - 23.95, .05, 7, 14);
    const hh = t < 23.95 ? H0 : mix(H0 * (1 - land), clr, sq);
    // the press: falls until its plate meets the top of the heap, then rides the heap down to its own feet
    let pb = null;
    if (t >= 23.4) { const fall = seg(t, 23.5, 23.95); pb = t < 23.95 ? mix(-200, HB - H0 + clr, fall * fall) : HB - hh + clr; }
    const bulge = mix(1, 1.12, sq) * (1 + wobble(t - C.pressDown - .9, .03, 6, 14));
    // squashed, the drawing's lines pile up; thin the ink as it flattens so the pile keeps the weight of the other lines
    put(g, paint(S.heap, seg(t, C.heap, C.heap + 1.1), { ia: mix(1, .62, sq), cache: sq === 0 }), HX, HB, HW0, { ay: 1, sx: bulge, sy: hh / H0 });
    // what still does not fit: the part of the squashed pile above the "what fits" line, hatched in red
    if (t > C.stillNo - .3) {
      const hk = seg(t, C.stillNo - .3, C.stillNo + .5), x0 = HX - HW0 * bulge / 2 + 30, x1 = HX + HW0 * bulge / 2 - 30, yT = HB - hh, yF = HB - bh;
      g.save(); g.beginPath(); g.rect(x0, yT - 4, x1 - x0, yF - yT + 4); g.clip();
      for (let i = 0, n = Math.ceil((x1 - x0 + 60) / 13); i < n; i++) { const x = x0 - 30 + i * 13; pen(g, [[x, yF + 2], [x + 30, yT - 6]], seg(hk, i / n * .7, i / n * .7 + .3), RED, 2.6, { alpha: .85 }); }
      g.restore();
    }
    const da = 1 - seg(t, 23.7, 24.0);
    if (da > 0) DEC.forEach(([u, v, s], i) => { const t0 = C.decimals + i * .1; if (t > t0) hand(g, s, HX + (u - .5) * HW0, HB - H0 + v * H0, 40, INK, { fam: LAT, w: 700, k: seg(t, t0, t0 + .25), rot: (hs(i) - .5) * .2, alpha: da, knock: .25 }); });
    // the card at the foot, and what fits on it
    const trem = wobble(t - C.stillNo, .05, 4, 30);
    put(g, paint(S.gpu, seg(t, C.heap + .4, C.heap + .9), { fill: wash(BLUE, .24) }), 226, 1128, 212, { rot: trem });
    L(g, t, T.card4090, 226, 1218, 30, INK, C.card4090, null, { fam: ZH ? LAT : HAND, dur: .4 });
    if (t >= C.fits) {
      dashBox(g, 124, HB - bh, 328, HB, seg(t, C.fits, C.fits + .4), RED, 4.5);
      L(g, t, T.fits, 226, HB - bh / 2, fitPx(g, T.fits, ZH ? 28 : 32, 190), RED, C.fits + .3, null, { dur: .4 });
    }
    // ten times: nine more boxes stacked to the height of the pile, each holding a small drawing of the same card
    for (let i = 1; i < 10; i++) {
      const t0 = C.x10 + i * .09; if (t <= t0) continue;
      const fa = mix(.75, .22, seg(t, 25.2, 25.7));
      dashBox(g, 124, HB - (i + 1) * bh, 328, HB - i * bh, seg(t, t0, t0 + .22), RED, 3, fa);
      put(g, paint(S.gpuS, seg(t, t0 + .05, t0 + .3), { fill: wash(BLUE, .24) }), 226, HB - (i + .5) * bh, 76, { alpha: fa / .75 });
    }
    L(g, t, T.x10, 226, HB - 10 * bh - 42, 66, RED, C.x10 + .9, 25.2, { fam: LAT, dur: .3 });
    // the count
    const cf = 1 - seg(t, 21.6, 22.0);
    if (cf > 0) {
      const s = ZH ? T.count + T.countUnit : T.count + ' ' + T.countUnit, px = fitPx(g, s, ZH ? 110 : 96, 980);
      L(g, t, s, 540, 410, px, RED, C.count125, null, { dur: 1.2, patch: .4, alpha: cf, fam: ZH ? HAND : LAT });
      L(g, t, T.years, 540, 492, ZH ? 40 : 42, RED, C.years, null, { patch: .4, alpha: cf });
    }
    if (pb != null) {
      put(g, paint(P, seg(t, 23.4, 23.85)), HX, pb, pw, { ay: 1 });
      L(g, t, T.press, HX, pb - ph + PR.band * P.src * P.k, 58, RED, 23.95, 25.1, { fam: LAT, w: 700, dur: .35 });   // rests before the close-up crops it
    }
    if (t > 25.4) pen(g, [[124, HB - bh], [1000, HB - bh]], seg(t, 25.4, 25.8), RED, 3.5, { dash: [12, 9] });
    // written where the close-up after the press looks: above the pile, under the plate's shadow
    L(g, t, T.stillNo, 420, 712, fitPx(g, T.stillNo, ZH ? 60 : 64, 520), RED, C.stillNo, null, { patch: .45, rot: -.04, dur: .5 });
  });
}
// D: the campus, a blank slip pinned to the notice board, the lab's name
// line_geisel (cut 1536 x 921): the notice board's panel is u .130-.212, v .748-.848; the slip is a long receipt pinned at
// the top of the panel, hanging past its lower edge; "pattern?" is a red-pen note beside it on the lawn.
const GEI = { x: 540, y: 895, w: 1000, pin: [.171, .762] };
function secD(g, t) {
  if (t < 28.3 || t > 37.4) return;
  inF(g, RD, (g) => {
    const gh = GEI.w * S.geisel.h / S.geisel.w, px = GEI.x + (GEI.pin[0] - .5) * GEI.w, py = GEI.y + (GEI.pin[1] - .5) * gh;
    put(g, paint(S.geisel, seg(t, C.campus, C.campus + 1.3)), GEI.x, GEI.y, GEI.w);
    if (t >= 30.2) {
      const k = eio(seg(t, 30.2, 30.8)), x = mix(1150, px, k), y = mix(200, py, k) - 160 * Math.sin(Math.PI * k), rot = mix(.9, -.05, k) + wobble(t - 30.8, .12, 4, 10);
      const h = mix(300, 96, k), w = h * S.ticketM.w / S.ticketM.h;   // small enough to hang on the board
      put(g, paint(S.ticketM, 1), x, y, w, { rot, ay: .03 });
      if (t > 30.75) { g.save(); g.fillStyle = css(RED); g.beginPath(); g.arc(px, py, 6 * eo(seg(t, 30.75, 30.9)), 0, 7); g.fill(); g.restore(); }
      const lx = 400, ly = py + 92, spx = ZH ? 44 : 48;
      L(g, t, T.slip, lx, ly, spx, RED, 30.95, null, { rot: -.05, dur: .45, patch: .4 });
      if (t > 31.2) arrow(g, curve(lx - textW(g, T.slip, spx) / 2 - 10, ly - 6, px + 34, py + 52, .25), seg(t, 31.2, 31.5), RED, 4);
    }
    L(g, t, T.lab, 540, 505, ZH ? 100 : 116, RED, C.labName, 35.3, { patch: .4, dur: .6 });
    L(g, t, T.labSub, 540, 585, fitPx(g, T.labSub, ZH ? 34 : 38, 860), INK, C.labName + .7, 35.3, { patch: .4, dur: .7 });
  });
}
// E: the author's kitchen, 128 chefs, the slips, experts
function secE(g, t, cam) {
  if (t < 35.8 || t > 63.6) return;
  L(g, t, T.quote, 520, 8080, fitPx(g, T.quote, ZH ? 84 : 104, 820), INK, 36.3, 38.8, { patch: .45, dur: 1.0 });
  L(g, t, T.quoteBy, 720, 8190, ZH ? 50 : 56, RED, 37.2, 38.8, { patch: .4, dur: .5 });
  if (t >= C.kitchen) {   // drawn as the camera arrives, under the quote, so the frame is never empty
    const dim = mix(1, .55, eo(seg(t, 44.0, 45.4))) * mix(1, .7, eo(seg(t, 49.0, 49.5)));
    const kc = paint(S.kitchen, seg(t, C.kitchen, C.kitchen + 1.5), { ia: Math.round(dim * 40) / 40, fa: 0 });
    put(g, kc, KIT.x, KIT.top, KIT.h * S.kitchen.w / S.kitchen.h, { ay: 0 });
  }
  crew(g, t);
  // seed: 121 is circled once, without a word
  if (t > 50.8 && t < 52.0) { const [x, y, h] = chefBody(121, t, .5); pen(g, ring(x, y, h * .42, h * .62, 7), seg(t, 50.8, 51.1), RED, 7, { alpha: 1 - seg(t, 51.5, 52.0) }); }
  // the name tags that don't apply
  [[58, 0], [71, 1]].forEach(([id, i]) => {
    if (t < 56.0 + i * .5 || t > 62.4) return;
    const [x, y, h] = chefBody(id, t, 1.0), ty = y - 30, s = T.titles[i], px = ZH ? 44 : 46, a = 1 - seg(t, 61.8, 62.3);
    L(g, t, s, x, ty, px, INK, 56.0 + i * .5, null, { patch: .5, dur: .4, alpha: a });
    const tw = textW(g, s, px);
    if (t > 58.7) pen(g, [[x - tw / 2 - 8, ty + 4], [x + tw / 2 + 8, ty - 6]], seg(t, 58.7 + i * .15, 58.95 + i * .15), RED, 6, { alpha: a });
    L(g, t, T.q, x + tw / 2 + 34, ty - 6, 64, RED, 58.95 + i * .15, null, { fam: ZH ? HAND : LAT, dur: .2, alpha: a });
  });
}
function hudE(g, t, cam) {
  if (t < 44.0 || t > 62.6) return;
  // (gone before the chat card and the first slip arrive; the model's name waits for its box label in B7)
  L(g, t, T.chefs, 540, 420, ZH ? 88 : 100, RED, 44.4, 46.3, { patch: .45, rot: -.02, dur: .5 });
  L(g, t, T.station, 540, 500, ZH ? 40 : 44, INK, 45.0, 46.3, { patch: .4, dur: .4 });
  // experts: a red arrow to one of the cooks
  if (t > 54.3 && t < 62.6) {
    const a = 1 - seg(t, 61.8, 62.3), [wx, wy] = chefBody(88, t, .55), [sx, sy] = toScr(cam, wx, wy);
    L(g, t, T.experts, 165, sy + 250, ZH ? 70 : 78, RED, 54.35, null, { patch: .45, rot: -.06, dur: .35, alpha: a });
    arrow(g, curve(170, sy + 205, sx - 50, sy + 30, -.25), seg(t, 54.55, 54.95), RED, 7, { alpha: a });
  }
  // learned: an arc from the slip to the eight it called
  if (t > 59.5 && t < 62.6) {
    const a = 1 - seg(t, 61.8, 62.3), pts = F[1].experts.map((id) => toScr(cam, ...chefBody(id, t, .55).slice(0, 2)));
    const cx = pts.reduce((s, p) => s + p[0], 0) / 8, cy = pts.reduce((s, p) => s + p[1], 0) / 8;
    arrow(g, curve(SLOT.cx - 80, SLOT.top + 200, cx + 40, cy - 40, .3), seg(t, 59.6, 60.2), RED, 7, { alpha: a });
    pts.forEach(([x, y], i) => pen(g, ring(x, y, 46, 62, i + 3, 1.05), seg(t, 60.1 + i * .06, 60.35 + i * .06), RED, 4.5, { alpha: a * .9 }));
  }
}
// F: labels on the building (world); [u, v] on line_building_q. The attic (inside the roof, v .03-.19) and the blank wall
// band under the downstairs ceiling (v .53-.57) take the lettering; nothing sits on the stoves, the lockers or the stairs.
function secF(g, t) {
  if (t < 61.8 || t > 180.6) return;
  building(g, t);
  const lab = (s, u, v, px, col, t0, tout, o = {}) => L(g, t, s, bu(u), bv(v), px, col, t0, tout, Object.assign({ patch: .45 }, o));
  lab(T.cardLabel, .5, .135, fitPx(g, T.cardLabel, ZH ? 66 : 64, 640), RED, C.cardLabel, 74.4, { rot: -.02 });
  lab(T.ramLabel, .6, .548, ZH ? 66 : 64, INK, C.ramLabel, 83.0);
  lab(T.stove, .29, .556, fitPx(g, T.stove, ZH ? 40 : 42, 270), INK, C.stoveCook, 95.4);
  if (t > 87.4 && t < 96) {
    const a = 1 - seg(t, 95.2, 95.8), P = QSTAIR.map(([u, v]) => [bu(u - .04), bv(v - .012)]);
    arrow(g, P.flatMap((p, i) => (i ? curve(P[i - 1][0], P[i - 1][1], p[0], p[1], 0).slice(1) : [p])), seg(t, 87.6, 88.6), RED, 6, { dash: [16, 12], alpha: a });
    lab(T.slower, .655, .552, fitPx(g, T.slower, ZH ? 52 : 52, 290), RED, 87.7, 95.4, { rot: -.04 });
  }
  const zf = t > 134.5 && t < 141.8 ? 1 - Math.min(seg(t, 134.5, 135.1), 1 - seg(t, 141.0, 141.6)) : 1;   // out of frame-top during the 121 close-up
  lab(T.strata, .62, .1, 52, RED, 95.8, 179.0, { fam: LAT, dur: .35, alpha: zf });
  if (t > 160.9 && t < 179.4) { const cx = bu(.62) + textW(g, T.strata, 52, HW, LAT) / 2 + 74, cy = bv(.1); arrow(g, ring(cx, cy, 34, 30, 2, .85), seg(t, 160.9, 161.5), RED, 5, { alpha: 1 - seg(t, 179.0, 179.4) }); }
  lab(T.quarter, .355, .135, ZH ? 50 : 54, RED, C.quarter, 167.3, { rot: -.03, alpha: zf });
  lab(T.half, .355, .135, ZH ? 50 : 54, RED, 168.9, 179.0, { rot: -.03 });
  lab(T.room2, .64, .165, ZH ? 50 : 56, RED, C.renovate, 168.6, { rot: -.04 });
  // 121: the tally on a small inked card just above his head (B8): his 19 calls in red, and what chance would give, in ink
  if (t > 135.6 && t < 141.6) {
    const [x, y] = UPQ[SEAT121], a = 1 - seg(t, 141.0, 141.6), n = Math.min(19, [...Array(40).keys()].filter((fi) => t >= 135.9 + fi * .042 && F[fi].experts.includes(121)).length);
    const cx = x - 62, cy = y - CH - 92, x0 = cx - 118, x1 = cx + 118, y0 = cy - 70, y1 = cy + 70;
    noteCard(g, x0, y0, x1, y1, seg(t, 135.65, 136.0), { alpha: a, seed: 11, lw: 2.2, r: 10 });
    const ty = cy - 30, tx = x0 + 26;
    for (let i = 0; i < n; i++) { const gI = Math.floor(i / 5), j = i % 5, gx = tx + gI * 50; if (j < 4) pen(g, [[gx + j * 9, ty - 17], [gx + j * 9 - 1, ty + 17]], 1, RED, 3.4, { alpha: a }); else pen(g, [[gx - 5, ty + 10], [gx + 34, ty - 10]], 1, RED, 3.4, { alpha: a }); }
    if (t > 136.0) pen(g, curve(cx + 60, y1 - 2, x + 4, y - CH - 4, .2), seg(t, 136.0, 136.3), RED, 2.6, { alpha: a });
    const rpx = ZH ? 26 : 30, rw = textW(g, T.random23, rpx);
    L(g, t, T.random23, x0 + 22, cy + 34, rpx, INK, 138.3, 141.0, { dur: .4, align: 'left' });
    if (t > 138.6) for (let i = 0; i < 2; i++) { const gx = x0 + 22 + rw + 18 + i * 10; pen(g, [[gx, cy + 18], [gx - 1, cy + 50]], seg(t, 138.7 + i * .1, 138.8 + i * .1), INK, 3.2, { alpha: a }); }
    L(g, t, T.slice, x, bv(.535), 20, INK, 136.4, 141.0, { dur: .6, patch: .4 });
  }
  // "reserved: 121" on the blank wall band just under his spot, a red line under his feet
  if (t > 152.2 && t < 167.6) { const [x, y] = UPQ[SEAT121], a = 1 - seg(t, 167.2, 167.6); L(g, t, T.reserved, x + 10, bv(.556), ZH ? 50 : 50, RED, 152.3, 167.2, { patch: .45, dur: .4, rot: -.03 });
    arrow(g, curve(x + 10, bv(.536), x, y + 6, .15), seg(t, 152.6, 152.9), RED, 3.5, { alpha: a }); pen(g, [[x - 26, y + 4], [x + 26, y + 4]], seg(t, 152.3, 152.6), RED, 3, { alpha: a }); }
  if (t > 164.5 && t < 166.6) { const id = [...UPS[UPS.length - 2].map.keys()].find((e) => !UPS[UPS.length - 3].map.has(e)); if (id != null) { const p = upPos(UPS[UPS.length - 2].map, 32, id); pen(g, ring(p[0], p[1] - CH / 2, 40, 70, 9), seg(t, 164.7, 165.0), RED, 4, { alpha: 1 - seg(t, 166.0, 166.6) }); } }
}
// F, screen layout at framing RF6: the score card, the manager, the six slips of 121
// the score card rests (fades as one layer) while the camera is pushed in on the building, so no half words sit at the edge
const cardRest = (t) => Math.min(1 - Math.min(seg(t, 134.2, 134.7), 1 - seg(t, 140.9, 141.4)), 1 - Math.min(seg(t, 166.7, 167.1), 1 - seg(t, 168.6, 169.1)));
function card(g, t) {
  if (t < 101.4 || t > 180.6) return;
  layer(g, cardRest(t), (g) => card0(g, t));
}
function card0(g, t) {
  inF(g, RF6, (g) => {
    L(g, t, T.gridHead[0], 215, 478, fitPx(g, T.gridHead[0], ZH ? 36 : 38, 340), INK, C.grid, 179.6, { dur: .4 });
    L(g, t, T.gridHead[1], 215, 520, fitPx(g, T.gridHead[1], ZH ? 36 : 38, 345), INK, C.grid + .3, 179.6, { dur: .5 });
    L(g, t, T.sim, 215, 568, fitPx(g, T.sim, ZH ? 26 : 30, 345), RED, C.grid + .6, 179.6, { dur: .5 });
    // the 10 x 10 grid: drawn once, filled per rule (hits in red ticks, misses as small grey chefs)
    const gx = 90, gy = 598, cs = 25, gk = seg(t, C.grid + .2, C.grid + 1.0), gout = 1 - seg(t, 179.4, 179.9);
    for (let i = 0; i <= 10; i++) {
      pen(g, [[gx, gy + i * cs], [gx + 10 * cs, gy + i * cs]], seg(gk, i * .05, i * .05 + .5), INK, 1.4, { alpha: .55 * gout });
      pen(g, [[gx + i * cs, gy], [gx + i * cs, gy + 10 * cs]], seg(gk, i * .05, i * .05 + .5), INK, 1.4, { alpha: .55 * gout });
    }
    const fills = [[107.8, 108.8, 25, 141.6], [143.2, 144.4, 51, 155.2], [155.6, 157.5, 77, 168.4], [169.0, 169.6, 50, 171.4], [171.5, 172.4, 93, 179.4]];
    for (const [t0, t1, n, tout] of fills) {
      if (t < t0 || t > tout + .4) continue;
      const out = 1 - seg(t, tout, tout + .4), prev = fills.find((f) => f[3] === t0 || Math.abs(f[3] - t0) < .2), keep = prev && t0 > 169 ? prev[2] : 0;
      for (let c = 0; c < 100; c++) {
        const k = seg(t, mix(t0, t1, c / 100), mix(t0, t1, c / 100) + .12); if (k <= 0 && c >= keep) continue;
        const x = gx + (c % 10) * cs + cs / 2, y = gy + Math.floor(c / 10) * cs + cs / 2;
        if (c < n) pen(g, tickPts(x, y, cs * .62), c < keep ? 1 : k, RED, 2.6, { alpha: out * gout });
        else { const sp = S.waitX[c % 5]; put(g, paint(sp, 1, { ia: .45 }), x, y + cs * .45, cs * .82 * sp.w / sp.h, { ay: 1, alpha: k * out * gout }); }
      }
    }
    if (t > 173.6 && t < 179.9) for (let c = 93; c < 100; c++) { const x = gx + (c % 10) * cs + cs / 2, y = gy + Math.floor(c / 10) * cs + cs / 2; pen(g, ring(x, y, cs * .55, cs * .55, c), seg(t, 173.6 + (c - 93) * .08, 173.9 + (c - 93) * .08), RED, 2.4, { alpha: gout }); }
    // the score rows: page one (room for 1/4), then page two (room for 1/2)
    const row = (i, r, t0, tout, extra) => {
      const y = 882 + i * 50, px = ZH ? 34 : 38, lbl = (r[0] ? r[0] + ' ' : '') + r[1];
      L(g, t, lbl, 50, y, fitPx(g, lbl, px, ZH ? 168 : 205), INK, t0, tout, { align: 'left', dur: .4 });
      L(g, t, r[2], ZH ? 262 : 300, y - 2, ZH ? 46 : 52, RED, t0 + .3, tout, { fam: LAT, w: 700, dur: .3 });
      if (extra) extra(y);
    };
    // (the grade sits left of the building's wall; "double / triple the blindfold" is left to the voice)
    const gX = ZH ? 334 : 368;
    row(0, T.rows[0], C.s25, 168.4, (y) => { L(g, t, T.gradeF, gX, y - 2, ZH ? 24 : 58, RED, C.gradeF, 168.4, { fam: ZH ? HAND : LAT, dur: .25, rot: -.1, patch: ZH ? .3 : 0 }); if (t > C.gradeF + .2) pen(g, ring(gX, y - 2, ZH ? 44 : 28, ZH ? 22 : 28, 4), seg(t, C.gradeF + .2, C.gradeF + .55), RED, 3, { alpha: 1 - seg(t, 168.4, 168.8) }); });
    row(1, T.rows[1], C.s51, 168.4);
    row(2, T.rows[2], C.s77, 168.4);
    row(0, T.rowsH[0], C.s50, 179.6);
    row(1, T.rowsH[1], C.s93, 179.6, (y) => { L(g, t, T.gradeA, gX, y - 2, ZH ? 40 : 60, RED, C.gradeA, 179.6, { fam: ZH ? HAND : LAT, dur: .25, rot: -.1 }); if (t > C.gradeA + .2) pen(g, ring(gX, y - 2, 32, 32, 5), seg(t, C.gradeA + .2, C.gradeA + .55), RED, 3, { alpha: 1 - seg(t, 179.6, 180) }); });
    // the manager: blindfold, unmasked (magnifier), board, magnifier. line_manager_2 (cut 561 x 776): the easel board's
    // inner panel is u .61-.94, v .155-.575; her hand and pencil cover its upper left (to v .34), so the tally rows sit
    // in v .36-.56, below the pencil and above the caption band.
    // the manager: blindfolded, unmasked (magnifier), at the board, magnifier again. Pose changes are clean cuts on a held
    // drawing with a small settle, never two poses blended; only her first entrance is inked in.
    const MG = { x: 190, feet: 1478, h: 432 };
    const POSES = [[S.mgr[0], C.blindfold], [S.mgr[2], C.unmask], [S.mgr[1], C.rule2], [S.mgr[2], C.closer]];
    let pi = -1; POSES.forEach(([, t0], i) => { if (t >= t0) pi = i; });
    if (pi >= 0 && t < 179.8) {
      const [sp, t0] = POSES[pi], sc = pi ? .955 + .045 * spring(t - t0, 9, 14) : 1;
      put(g, paint(sp, pi ? 1 : seg(t, t0, t0 + .6)), MG.x, MG.feet, MG.h * sp.w / sp.h, { ay: 1, sx: sc, sy: sc, alpha: 1 - seg(t, 179.4, 179.8) });
    }
    if (pi === 2) {   // the tally on her board (u .62-.93, v .37-.56: below her pencil): 121, 95, 23
      const sp = S.mgr[1], mw = MG.h * sp.w / sp.h, x0 = MG.x - mw / 2 + .625 * mw, top = MG.feet - MG.h, t0 = C.rule2 + .2;
      [121, 95, 23].forEach((id, r) => {
        const n = Math.min(9, Math.round(S.sets.cnt[id] / 2)), y = top + (.395 + r * .068) * MG.h;
        hand(g, String(id), x0 + 17, y, 24, INK, { fam: LAT, w: 700, k: seg(t, t0 + r * .15, t0 + .2 + r * .15) });
        for (let j = 0; j < n; j++) pen(g, [[x0 + 40 + j * 6.5, y - 10], [x0 + 39 + j * 6.5, y + 10]], seg(t, t0 + .2 + r * .15 + j * .03, t0 + .25 + r * .15 + j * .03), INK, 2, {});
        pen(g, ring(x0 + 17, y, 22, 15, r), seg(t, 142.2 + r * .15, 142.5 + r * .15), RED, 2.6, {});
      });
    }
  });
}
function streak(g, t) {   // B8: slips of words 1-6 dealt out, 121 circled on each, linked; they fade where they lie
  if (t < 148.2 || t > 155.3) return;
  layer(g, 1 - seg(t, 154.6, 155.2), (g) => inF(g, RF6, (g) => {
    const out = 0, pts = [];
    for (let i = 0; i < 6; i++) {
      const t0 = 148.4 + i * .22, k = eio(seg(t, t0, t0 + .35)); if (k <= 0) continue;
      const cx = 432 + i * 70 + 58, top = 870 + (i % 2) * 22, h = 290, x = mix(1200, cx, k), rot = (i % 2 ? .04 : -.03) + wobble(t - t0 - .35, .05);
      slipDraw(g, x, top + out * 700, h, rot, F[i].experts, { head: '', circle: 121, ck: seg(t, (i < 3 ? 149.9 : 150.7) + (i % 3) * .1, (i < 3 ? 149.9 : 150.7) + (i % 3) * .1 + .25), seed: i });
      const j = F[i].experts.indexOf(121), sc = h / 900, lx = (j % 2 ? 72 : -72) - 8, ly = 360 + Math.floor(j / 2) * 135;
      pts.push([x + (lx * Math.cos(rot) - ly * Math.sin(rot)) * sc, top + out * 700 + (lx * Math.sin(rot) + ly * Math.cos(rot)) * sc]);
    }
    if (pts.length === 6) pen(g, pts, seg(t, C.link, C.link + .7), RED, 4.5, { alpha: 1 - out });
    [[149.9, 1], [150.7, 4]].forEach(([t0, i]) => L(g, t, T.again, 432 + i * 70 + 40, 845 + (i % 2) * 22, ZH ? 34 : 36, RED, t0, null, { rot: -.08, patch: .4, dur: .3 }));
  }));
}
// F': the serving-hatch side (B7), laid out at framing RF7. The spike stands behind the four boxes (only its upper stack
// shows above their lids); the paper lands on the spike, impaled at the middle of its top edge, so the boxes' labels stay
// readable. line_slip_boxes (cut 1521 x 464): label rectangles at u .045-.21, .295-.465, .545-.715, .79-.955, v .68-.89.
// line_spike (753 x 1422): spindle u .315, tip v 0. line_paper (983 x 1408): title space u .05-.70, v .06-.31 (the
// rosette and its tails fill u .70-.98, v 0-.34); author lines v .325 / .35; rosette centre (.835, .117), radius .095 u.
const BOX = { x: 480, y: 1060, w: 840 }, BOXL = [[.128, .785], [.38, .785], [.63, .785], [.873, .785]], BOXLW = .15;
const SPK = { x: 515, foot: 1150, w: 300 }, PAP = { w: 380, poke: 34 };
const boxLab = (i) => { const bh = BOX.w * S.boxes.h / S.boxes.w; return [BOX.x + (BOXL[i][0] - .5) * BOX.w, BOX.y + (BOXL[i][1] - .5) * bh]; };
function secF7(g, t, cam) {
  if (t < 110.5 || t > 134.0) return;
  inF(g, RF7, (g) => {
    const bw = BOX.w, bhh = bw * S.boxes.h / S.boxes.w, by = BOX.y;
    // the spike (behind the boxes), and the paper that lands on it
    const sh = SPK.w * S.spike.h / S.spike.w, sx = SPK.x + (.5 - .315) * SPK.w, stop = SPK.foot - sh;
    put(g, paint(S.spike, seg(t, 111.3, 112.2)), sx, SPK.foot, SPK.w, { ay: 1 });
    if (t >= C.paper) {
      const k = spring(t - C.paper, 7, 10), pw = PAP.w, ph = pw * S.paper.h / S.paper.w, top = mix(-900, stop + PAP.poke, k), rot = wobble(t - C.paper, .08, 4, 9) - .015;
      g.save(); g.translate(SPK.x, top); g.rotate(rot);
      put(g, paint(S.paper, seg(t, C.paper, C.paper + .5)), 0, 0, pw, { ay: 0 });
      // the title stays in the clear part of the head (u .15-.65: right of the dog-ear, left of the rosette)
      const X = (u) => (u - .5) * pw, Y = (v) => v * ph, tw = .5 * pw, tl = T.paper;
      L(g, t, tl[0], X(.4), Y(.125), fitPx(g, tl[0], 34, tw, 700, LAT), INK, 121.9, null, { fam: LAT, w: 700, dur: .6 });
      const sub = ZH ? [tl[2].split(' Large')[0], 'Large' + tl[2].split(' Large')[1]] : [tl[1], tl[2]];
      if (ZH) L(g, t, tl[1], X(.4), Y(.18), 17, INK, 122.4, null, { dur: .4 });
      const sy = ZH ? [.225, .258] : [.215, .25];
      sub.forEach((q, i) => L(g, t, q, X(.4), Y(sy[i]), fitPx(g, q, 13, .58 * pw, 600, SANS), INK, 122.6 + i * .3, null, { fam: SANS, w: 600, dur: .45 }));
      L(g, t, tl[3], X(.4), Y(.305), fitPx(g, tl[3], 12, .62 * pw, 500, SANS), INK, 123.3, null, { fam: SANS, w: 500, dur: .5 });
      // inside the rosette's inner circle (centre .832, .117; radius .097 u): three short lines that keep clear of the petals
      const rw = .135 * pw;
      L(g, t, T.award[0], X(.832), Y(.088), fitPx(g, T.award[0], 17, rw, ZH ? HW : 700, ZH ? HAND : LAT), RED, C.rosette, null, { dur: .2, fam: ZH ? HAND : LAT, w: ZH ? HW : 700 });
      L(g, t, T.award[1], X(.832), Y(.117), fitPx(g, T.award[1], 17, rw * 1.1, ZH ? HW : 700, ZH ? HAND : LAT), RED, C.rosette + .2, null, { dur: .2, fam: ZH ? HAND : LAT, w: ZH ? HW : 700 });
      L(g, t, T.award[2], X(.832), Y(.145), fitPx(g, T.award[2], 14, rw * .95, 700, LAT), RED, C.rosette + .4, null, { dur: .2, fam: LAT, w: 700 });
      g.restore();
    }
    // the boxes in front, named one by one on their own labels
    put(g, paint(S.boxes, seg(t, C.boxes, C.boxes + 2.8)), BOX.x, by, bw);
    const MT = ZH ? [116.4, 117.4, 118.1, 118.8] : [116.4, 117.2, 117.9, 118.5];
    // (the labels rest under the paper close-up, where they would sit in the bottom UI zone, and come back for the Qwen box)
    const la = Math.max(1 - seg(t, 121.3, 122.2), seg(t, 126.8, 127.7));
    T.models.forEach((s, i) => {
      const [x, y] = boxLab(i), lw = BOXLW * bw * .9, two = s.length > 12 && s.includes(' ');
      if (!two) { L(g, t, s, x, y, fitPx(g, s, 34, lw, 700, LAT), INK, MT[i], null, { fam: LAT, w: 700, dur: .4, alpha: la }); return; }
      const cut = s.indexOf(' ', 4), a1 = s.slice(0, cut), a2 = s.slice(cut + 1), px = Math.min(fitPx(g, a1, 24, lw, 700, LAT), fitPx(g, a2, 24, lw, 700, LAT));
      L(g, t, a1, x, y - px * .5, px, INK, MT[i], null, { fam: LAT, w: 700, dur: .3, alpha: la }); L(g, t, a2, x, y + px * .58, px, INK, MT[i] + .2, null, { fam: LAT, w: 700, dur: .3, alpha: la });
    });
    L(g, t, T.requests, BOX.x, by + bhh / 2 + 40, ZH ? 38 : 42, RED, 119.0, 121.2, { patch: .4, dur: .5 });
    // slips pop out of the boxes and fall back
    if (t > 119.6 && t < 121.6) for (let i = 0; i < 8; i++) {
      const t0 = 119.6 + i * .12, k = seg(t, t0, t0 + .9); if (k <= 0 || k >= 1) continue;
      const [x0] = boxLab(i % 4), x = x0 + (hs(i * 2.3) - .5) * 160, y = by - bhh * .35 - 420 * Math.sin(Math.PI * k), rot = (hs(i) - .5) * 2 + k * 3 * (i % 2 ? 1 : -1);
      slipDraw(g, x, y, 180, rot, F[(i * 5) % 40].experts, {});
    }
    // the Qwen box: a stack of its slips comes out
    const [qx, qy] = boxLab(3);
    if (t > C.qwenBox) for (let i = 0; i < 5; i++) { const k = spring(t - C.qwenBox - i * .12, 7, 10), fly = eio(seg(t, C.pretend + i * .15, C.pretend + 1.6 + i * .15)); if (k <= 0) continue;
      slipDraw(g, mix(qx - 10 + (i - 2) * 16, -2600, fly), mix(qy - 170, qy - 340 - i * 26, k) - 300 * Math.sin(Math.PI * fly), 200, (i - 2) * .06 - fly * 1.5, F[30 + i].experts, {}); }
  });
}
function hudF7(g, t, cam) {
  if (t < 113.5 || t > 136.5) return;
  L(g, t, T.receipts, 540, 452, ZH ? 90 : 96, RED, 113.6, 121.0, { patch: .45, rot: -.03, dur: .5 });
  // the award, lettered big above the paper while the voice says it, an arrow to the rosette; ISCA explained under it
  L(g, t, T.awardBig, 520, 440, fitPx(g, T.awardBig, ZH ? 84 : 80, 760), RED, C.rosette, 126.4, { patch: .45, rot: -.03, dur: .5 });
  if (t > C.rosette + .45 && t < 126.9) {
    const sh = SPK.w * S.spike.h / S.spike.w, ph = PAP.w * S.paper.h / S.paper.w, lx = SPK.x + (.832 - .5) * PAP.w, ly = SPK.foot - sh + PAP.poke + .117 * ph;
    const [rx, ry] = toScr(cam, RF7.x + (lx - 540) / RF7.z, RF7.y + (ly - 960) / RF7.z), ex = textW(g, T.awardBig, fitPx(g, T.awardBig, ZH ? 84 : 80, 760)) / 2 + 520;
    arrow(g, curve(Math.min(ex + 10, 860), 452, rx + 8, ry - 100, .25), seg(t, C.rosette + .45, C.rosette + .8), RED, 5, { alpha: 1 - seg(t, 126.4, 126.8) });
  }
  L(g, t, T.isca, 520, 514, fitPx(g, T.isca, ZH ? 34 : 36, 760), INK, 125.0, 126.4, { patch: .45, dur: .6 });
  // the count of chef calls in our sample (on screen only), then the cousin note right above the Qwen box's slips
  const callsOut = ZH ? 129.1 : 129.6, cousinIn = ZH ? 127.6 : 129.0, cousinOut = ZH ? 129.1 : 130.7;
  if (t > 127.4 && t < callsOut + .5) {
    const k = eo(seg(t, 127.5, 128.5)), n = Math.round(6.8e6 * k / 1e5) * 1e5, s = ZH ? T.calls.replace('680', String(Math.round(n / 1e4))) : T.calls.replace('6,800,000', n.toLocaleString('en-US'));
    L(g, t, s, 860, 470, 46, RED, 127.4, callsOut, { align: 'right', patch: .4, dur: .2, fam: ZH ? HAND : LAT });
  }
  L(g, t, T.cousin[0], 790, 590, fitPx(g, T.cousin[0], ZH ? 52 : 46, 300), RED, cousinIn, cousinOut, { patch: .45, rot: -.03, dur: .5 });
  if (T.cousin[1]) L(g, t, T.cousin[1], 790, 636, fitPx(g, T.cousin[1], 46, 300), RED, cousinIn + .4, cousinOut, { patch: .45, rot: -.03, dur: .5 });
  if (t > cousinIn + .5 && t < cousinOut + .4) arrow(g, curve(806, T.cousin[1] ? 664 : 618, 798, 706, .1), seg(t, cousinIn + .5, cousinIn + .8), RED, 4, { alpha: 1 - seg(t, cousinOut, cousinOut + .4) });
  // whose kitchen the rest of the film is: ours (a simulation), not Strata
  const pin = ZH ? 129.4 : 132.6, pout = ZH ? 133.8 : 134.3;
  // (right of the score card's heading, above the roof, once the camera is back on the house)
  L(g, t, T.pretend[0], 640, 432, fitPx(g, T.pretend[0], ZH ? 60 : 58, 600), RED, pin, pout, { patch: .45, rot: -.02, dur: .6 });
  L(g, t, T.pretend[1], 660, 484, fitPx(g, T.pretend[1], ZH ? 36 : 38, 420), INK, pin + .5, pout, { patch: .45, dur: .5 });
}
// G: the desk at home; G': the boxes open
const PCD = { x: 540, y: 1045, w: 900 };
function secG(g, t) {
  if (t < 178.8 || t > 194.9) return;
  // line_pc_kitchen (cut 1019 x 843) fills the width under the three notes; its glass panel (u .48-.89, v .1-.84) is where
  // the camera pushes in at the end of the beat. It is inked while the camera travels down to it.
  if (t < 191.6) inF(g, RG, (g) => {
    put(g, paint(S.pc, seg(t, 178.9, 180.3)), PCD.x, PCD.y, PCD.w);
    L(g, t, T.cheaper, 90, 518, fitPx(g, T.cheaper, ZH ? 58 : 62, 880), RED, C.cheaper, 187.3, { patch: .45, rot: -.03, align: 'left' });
    L(g, t, T.ownPC, 90, 588, fitPx(g, T.ownPC, ZH ? 58 : 62, 880), RED, C.ownPC, 187.3, { patch: .45, rot: -.02, align: 'left' });
    L(g, t, T.private, 90, 658, fitPx(g, T.private, ZH ? 58 : 62, 880), RED, C.private, 187.3, { patch: .45, rot: -.03, align: 'left' });
  });
  // G': the open boxes (narrower than the frame, clear of the right rail), with their model names, and the open-data frame
  if (t > 188.6) inF(g, RG2, (g) => {
    const bx = 455, bw = 800, bh = bw * S.boxes.h / S.boxes.w;
    // the slips fall from the PC down the empty stretch of paper into the open boxes while the camera travels down
    // (the frame is never empty on the way): drawn first, so the boxes' fronts hide them as they land
    for (let i = 0; i < 10; i++) {   // the last slips land in the boxes as the camera arrives (the pan itself is covered by hudG)
      const t0 = 189.55 + i * .07, k = seg(t, t0, t0 + 1.0); if (k <= 0 || k >= 1) continue;
      const lane = bx - bw / 2 + (.13 + (i % 4) * .24) * bw + (hs(i * 2.3) - .5) * 60, x = lane + Math.sin(k * 7 + i * 1.7) * 40 * (1 - k);
      const y = mix(-260, 980 - bh * .28, Math.pow(k, 1.5)), rot = Math.sin(k * 5.2 + i * 2.1) * .5 * (1 - k * .6);
      layer(g, 1 - seg(k, .88, 1), (g) => slipDraw(g, x, y, 150, rot, F[(i * 5) % 40].experts, {}));
    }
    put(g, paint(S.boxes, seg(t, 188.9, 189.8)), bx, 980, bw);
    T.models.forEach((m, i) => {
      const x = bx + (BOXL[i][0] - .5) * bw, y = 980 + (BOXL[i][1] - .5) * bh, lw = BOXLW * bw * .9, two = m.length > 12 && m.includes(' ');
      if (!two) { L(g, t, m, x, y, fitPx(g, m, 30, lw, 700, LAT), INK, 190.0 + i * .1, null, { fam: LAT, w: 700, dur: .3 }); return; }
      const cut = m.indexOf(' ', 4), a1 = m.slice(0, cut), a2 = m.slice(cut + 1), px = Math.min(fitPx(g, a1, 22, lw, 700, LAT), fitPx(g, a2, 22, lw, 700, LAT));
      L(g, t, a1, x, y - px * .5, px, INK, 190.0 + i * .1, null, { fam: LAT, w: 700, dur: .25 }); L(g, t, a2, x, y + px * .58, px, INK, 190.1 + i * .1, null, { fam: LAT, w: 700, dur: .25 });
    });
    for (let i = 0; i < 12; i++) {   // slips fly up and out, above the frame's labels
      const t0 = 190.75 + i * .08, k = seg(t, t0, t0 + 1.8); if (k <= 0 || k >= 1) continue;   // after the falling slips land; they leave the frame long before k = 1
      const x0 = bx - bw / 2 + (.13 + (i % 4) * .24) * bw, ang = -Math.PI / 2 + (hs(i * 4.1) - .5) * 1.1, d = 1300 + 300 * hs(i * 1.7), kk = eo(k);
      slipDraw(g, x0 + Math.cos(ang) * d * kk, 980 - bh * .3 + Math.sin(ang) * d * kk, 150, (hs(i) - .5) * 4 * kk, F[(i * 7) % 40].experts, {});
    }
    const P = [[40, 600], [860, 600], [860, 1240], [40, 1240], [40, 600]];
    pen(g, P, seg(t, 190.4, 191.1), RED, 6);
    L(g, t, T.open, 230, 600, ZH ? 66 : 72, RED, 190.5, null, { patch: .45, rot: -.04 });
    L(g, t, T.link, 450, 1192, fitPx(g, T.link, ZH ? 40 : 42, 700), INK, 191.0, null, { patch: .45 });
  });
}
function hudG(g, t) {
  if (t < 181 || t > 194.8) return;
  // both notes leave before the camera pushes into the PC, so nothing slides over the drawing
  L(g, t, T.smarter, 540, 410, fitPx(g, T.smarter, ZH ? 78 : 80, 940), RED, C.smarter, 187.2, { patch: .45, rot: -.02, dur: .8 });
  L(g, t, T.sys, 540, 410, fitPx(g, T.sys, ZH ? 50 : 54, 900), RED, C.sysResearch - (ZH ? .4 : 0), 188.9, { patch: .45, dur: .6 });
  // during the pan from the PC down to the boxes the slips flutter down through the screen itself, so no frame of the
  // move is empty paper (screen space: they keep falling while the sheet slides up under them)
  for (let i = 0; i < 20; i++) {
    const t0 = 188.85 + i * .075, k = seg(t, t0, t0 + .95); if (k <= 0 || k >= 1) continue;
    const x = 140 + hs(i * 3.7 + .4) * 780 + Math.sin(k * 6 + i) * 40, y = mix(-220, 2080, Math.pow(k, 1.15)), rot = Math.sin(k * 5 + i * 2.3) * .6;
    slipDraw(g, x, y, 170 + 40 * hs(i * 1.9), rot, F[(i * 3) % 40].experts, {});
  }
  if (t > C.you) {   // one blank slip comes in, lower left, clear of the link: you?
    const k = spring(t - C.you, 7, 9);
    layer(g, 1 - seg(t, 193.4, 193.85), (g) => {
      slipDraw(g, mix(1300, 470, k), mix(1400, 540, k), mix(200, 600, k), mix(.8, -.06, k), [], {});
      L(g, t, T.you, 466, 830, ZH ? 120 : 130, RED, C.you + .45, null, { dur: .4, rot: -.06 });
    });
  }
}
// H: the finale, one station of tiny chefs, 40 real words
const HG = { x0: 112, y0: 612, dx: 57, dy: 80, h: 80 };
function hSeat(s) { return [HG.x0 + (s % 16) * HG.dx + (Math.floor(s / 16) % 2 ? 14 : -14), HG.y0 + Math.floor(s / 16) * HG.dy]; }
function secH(g, t) {
  if (t < 193.6 || t > 203.8) return;
  inF(g, RH, (g) => {
    // which word is lit: fast through chaos, slow after
    const fr = t < 196.0 ? Math.floor((t - 194.4) / .11) : t < 199.0 ? 14 + Math.floor((t - 196.0) / .5) : -1;
    const lit = fr >= 0 && fr < 40 ? F[fr].experts : t >= 200.4 && t < 202.6 ? F[2].experts : [];
    const res = F[2].resident, blk = eio(seg(t, 199.0, 199.8));
    // block seats for the 32 upstairs chefs at the end: top-left 4 x 8; everyone else keeps order
    const order = [...Array(128).keys()].sort((a, b) => SEAT[a] - SEAT[b]), rest = order.filter((id) => !res.includes(id));
    const blockSeat = {}; res.slice().sort((a, b) => SEAT[a] - SEAT[b]).forEach((id, i) => { blockSeat[id] = Math.floor(i / 8) * 16 + (i % 8); });
    const other = []; for (let s = 0; s < 128; s++) if (s % 16 >= 8 || s >= 64) other.push(s);
    rest.forEach((id, i) => { blockSeat[id] = other[i]; });
    const list = [];
    for (let id = 0; id < 128; id++) {
      const a = hSeat(SEAT[id]), b = hSeat(blockSeat[id]), x = mix(a[0], b[0], blk), y = mix(a[1], b[1], blk);
      const d = SEAT[id] / 127;   // inked row by row, left to right, as a pen would
      list.push([y, () => {
        const p = seg(t, 193.7 + d * 1.1, 194.1 + d * 1.1), on = lit.includes(id), v = vOf(id), sp = S.waitX[v];
        put(g, paint(sp, p, on ? { ink: RED } : { ia: .8 }), x, y, HG.h * sp.w / sp.h, { ay: 1, flip: flipOf(id) });
        if (id === 121 && p >= 1) badge(g, x, y, HG.h, flipOf(id));
      }]);
    }
    list.sort((p, q) => p[0] - q[0]).forEach((c) => c[1]());
    // 121, 95, 23: the regulars, linked
    if (t > 197.6 && t < 199.2) {
      const al = 1 - seg(t, 198.8, 199.2), P = [121, 95, 23].map((id) => { const [x, y] = hSeat(SEAT[id]); return [x, y - HG.h / 2]; });
      P.forEach(([x, y], i) => pen(g, ring(x, y, 30, 42, i + 11), seg(t, 197.6 + i * .15, 197.9 + i * .15), RED, 4, { alpha: al }));
      pen(g, P, seg(t, 198.1, 198.6), RED, 3.5, { alpha: al });
    }
    if (t > 199.8) {   // the upstairs block, boxed and named; the next word's slip comes in, its chefs ticked, and points into it
      const [x0, y0] = hSeat(0), [x1, y1] = hSeat(3 * 16 + 7), bx0 = x0 - 40, by0 = y0 - HG.h - 26, bx1 = x1 + 40, by1 = y1 + 22;
      pen(g, cardPts(bx0, by0, bx1, by1, 30, 5), seg(t, 199.8, 200.4), RED, 5);
      L(g, t, T.upBox, bx0 + 16, by0, ZH ? 46 : 44, RED, 200.2, null, { align: 'left', patch: .4, dur: .35, rot: -.03 });
      if (t > 200.8) {
        const sk = spring(t - 200.8, 7, 9), ids = F[2].experts;
        slipDraw(g, 830, mix(-300, 440, sk), 280, .05, ids, { marks: ids.map((e) => res.includes(e)), mk: seg(t, 201.2, 201.6) });
        arrow(g, curve(768, 600, bx1 + 8, 640, .2), seg(t, 201.5, 201.9), RED, 5);
      }
    }
    L(g, t, T.slice, 540, 1236, ZH ? 30 : 32, INK, 194.9, 199.3, { patch: .4, dur: .6 });
    L(g, t, T.nextUp, 540, 1238, fitPx(g, T.nextUp, ZH ? 72 : 68, 780), RED, C.nextUp, null, { patch: .45, rot: -.03, dur: .5 });
  });
}
function hudH(g, t) {
  if (t < 194.4 || t > 203.4) return;
  const a = 1 - seg(t, 202.4, 202.8), cx = ZH ? 390 : 380;
  // 121, up close: the crowd dims under a paper wash (no cut-out), he steps forward big
  if (t > 196.1 && t < 198.4) {
    const [sx, sy] = toScr(camAt(t), RH.x + (hSeat(SEAT[121])[0] - 540) / RH.z, RH.y + (hSeat(SEAT[121])[1] - 960) / RH.z), k = eio(seg(t, 196.1, 196.7)) * (1 - eio(seg(t, 197.6, 198.3)));
    const sp = S.big121, h = mix(HG.h, 420, k), x = mix(sx, 540, k), y = mix(sy, 1150, k);
    if (k > .02) { g.save(); g.fillStyle = css(PAPER, .74 * k); g.fillRect(0, 0, W, H); g.restore();
      put(g, paint(sp, 1), x, y, h * sp.w / sp.h, { ay: 1, flip: flipOf(121) }); badge(g, x, y, h, flipOf(121));
      pen(g, ring(x, y - h / 2, h * .42, h * .6, 21), seg(t, 196.7, 197.1), RED, 6, { alpha: 1 - seg(t, 197.6, 197.9) }); }
  }
  L(g, t, T.chaos, cx, 420, ZH ? 90 : 100, INK, 194.8, null, { patch: .45, rot: -.04, dur: .4, alpha: a });
  if (t > 196.0) { const w = textW(g, T.chaos, ZH ? 90 : 100); pen(g, [[cx - w / 2 - 10, 430], [cx + w / 2 + 10, 410]], seg(t, 196.0, 196.25), RED, 7, { alpha: a }); }
  L(g, t, T.pattern, ZH ? 740 : 730, 430, ZH ? 90 : 100, RED, 196.2, null, { patch: .45, rot: -.03, dur: .45, alpha: a });
}

// ------------------------------------------------------------------ section titles and notes in screen space
function hudTitles(g, t) {
  // B1 -> B2: "so how does it run?" over the squashed pile, before the camera leaves for the campus
  L(g, t, '?', 800, 640, 230, RED, 27.62, 28.5, { fam: LAT, dur: .35, rot: .06 });
  // B4: the cover's question, again, and its answer (gone before the camera drops to the door)
  if (t > 62.6 && t < 66.6) {
    const a = 1 - seg(t, 65.6, 66.1), qpx = 200;
    L(g, t, '?', 300, 455, qpx, RED, C.qAgain, null, { fam: LAT, dur: .4, alpha: a });
    if (t > C.strikeQ) pen(g, [[220, 500], [380, 400]], seg(t, C.strikeQ, C.strikeQ + .25), RED, 9, { alpha: a });
    L(g, t, T.notHave, 640, 462, ZH ? 76 : 72, RED, C.strikeQ + .2, null, { patch: .45, rot: -.03, dur: .45, alpha: a });
  }
  // B6: the question of the film (right of the score card's heading, under the chat card)
  L(g, t, T.who, ZH ? 600 : 640, 438, ZH ? 88 : 80, RED, C.question, 110.8, { patch: .45, rot: -.02, dur: .55, s: mix(1.15, 1, spring(t - C.question - .55, 7, 12)) });
}

// ------------------------------------------------------------------ the end card: the real logo printed on the paper
function endCard(g, t) {
  if (t < C.endCard) return;
  const up = eio(seg(t, C.endCard, C.endCard + .55)), away = eio(seg(t, C.loop, DUR - .02)), y = mix(H, 0, up) - away * H;
  g.save(); g.translate(0, y);
  g.fillStyle = css([252, 249, 242]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'multiply'; for (let ty = 0; ty < H; ty += A.paper.height) for (let tx = 0; tx < W; tx += A.paper.width) g.drawImage(A.paper, tx, ty); g.restore();
  // the paper is the card (no frame): logo, three lines, then the fine print, centred in the safe band
  const L0 = A.logo, lw = 700, lh = lw * L0.height / L0.width, lx = 540 - lw / 2, ly = 400, k0 = t - C.endCard - .4;
  const parts = [[0, 230, 410, 640], [370, 0, 790, 420], [760, 230, 1168, 640], [330, 600, 860, 720]];
  g.save(); g.globalCompositeOperation = 'multiply';
  parts.forEach(([u0, v0, u1, v1], i) => {
    const kk = spring((k0 - i * .12) * 1.0, 5.2, 8.5); if (k0 - i * .12 <= 0) return;
    const cx = lx + (u0 + u1) / 2 / L0.width * lw, cy = ly + (v0 + v1) / 2 / L0.height * lh, pw = (u1 - u0) / L0.width * lw, ph = (v1 - v0) / L0.height * lh;
    g.save(); g.translate(cx, cy); g.scale(kk, kk); g.drawImage(L0, u0, v0, u1 - u0, v1 - v0, -pw / 2, -ph / 2, pw, ph); g.restore();
  });
  g.restore();
  const e = T.end, e0 = C.endCard + .9;
  L(g, t, e[0], 540, 1030, fitPx(g, e[0], ZH ? 48 : 64, 860), INK, e0, null, { dur: .5 });
  L(g, t, e[1], 540, 1118, fitPx(g, e[1], ZH ? 54 : 60, 860), RED, e0 + .35, null, { dur: .45, fam: ZH ? HAND : LAT });
  L(g, t, e[2], 540, 1200, fitPx(g, e[2], ZH ? 44 : 48, 860), INK, e0 + .7, null, { dur: .45 });
  if (t > e0 + .65) pen(g, curve(380, 1153, 700, 1148, .02), seg(t, e0 + .65, e0 + 1.0), RED, 4);
  const fa = .78 * eo(seg(t, e0 + 1.1, e0 + 1.6));
  if (fa > 0) T.fine.forEach((s2, i) => { const px = fitPx(g, s2, ZH ? 22 : 23, 900, SW, SANS); g.save(); g.globalAlpha = fa; g.font = `${SW} ${px}px ${SANS}`; g.fillStyle = css(INK); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s2, 540, 1300 + i * 34); g.restore(); });
  g.restore();
}

// ------------------------------------------------------------------ captions: parts timed on the voice's word marks
const normS = (s) => s.toLowerCase().replace(/[^0-9a-z㐀-鿿]/g, '');
const CAPT = {};
function capParts(id) {
  if (CAPT[id]) return CAPT[id];
  const r = VO[id], parts = (T.cap[id] || '').split('|'), words = r.words, out = [];
  let wi = 0, acc = 0;
  parts.forEach((p, k) => {
    if (k === 0) { out.push({ s: p, t0: r.t }); return; }
    const target = parts.slice(0, k).reduce((s, q) => s + normS(q.replace(/\//g, '')).length, 0);
    while (wi < words.length && acc + normS(words[wi][2]).length <= target * .98 + .5) { acc += normS(words[wi][2]).length; wi++; }
    let j = wi; const want = normS(p.replace(/\//g, '')), first = normS(p.trim().split(/[\s\/]+/)[0]), latin = /^[0-9a-z]/i.test(p.trim());
    const ok = (w) => { const n = normS(w); return n.length && (latin ? n === first || (want.startsWith(n) && n.length >= first.length) : want.startsWith(n)); };
    for (const d of [0, 1, -1, 2, -2, 3]) { const q = wi + d; if (q > 0 && q < words.length && ok(words[q][2])) { j = q; break; } }
    out.push({ s: p, t0: words[Math.min(j, words.length - 1)][0] });
  });
  out.forEach((o, k) => { o.t1 = k + 1 < out.length ? out[k + 1].t0 - .04 : r.t + r.dur + .25; });
  return (CAPT[id] = out);
}
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) { const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    for (const p of capParts(v.id)) if (t >= p.t0 - .05 && t <= p.t1) return p.s; }
  return null;
}
// the caption box stays inside x 120-880 (left of the right rail): centred at x 500, text at most 704 wide; a row that is
// too long is broken in two (EN at the space nearest the middle, ZH at a comma near the middle, else mid-way), and only
// a part that already has two rows is set smaller
const CAPX = 500, CAPW = 704;
function capRows(g, s, px, wt, fam) {
  g.font = `${wt} ${px}px ${fam}`;
  const rows = s.split('/').map((r) => r.trim());
  if (rows.length > 1 || g.measureText(rows[0]).width <= CAPW) return rows;
  const r = rows[0];
  if (!ZH) {
    let best = null, bw = 1e9;
    for (let i = 1; i < r.length; i++) if (r[i] === ' ') { const d = Math.abs(g.measureText(r.slice(0, i)).width - g.measureText(r.slice(i + 1)).width); if (d < bw) { bw = d; best = i; } }
    return best ? [r.slice(0, best), r.slice(best + 1)] : rows;
  }
  const mid = r.length / 2; let cut = -1, bd = 1e9;
  for (let i = 1; i < r.length - 1; i++) if ('，、：；'.includes(r[i]) && Math.abs(i + 1 - mid) < bd && Math.abs(i + 1 - mid) <= r.length * .3) { bd = Math.abs(i + 1 - mid); cut = i + 1; }
  if (cut < 0) { cut = Math.round(mid); while (cut < r.length && '，。、：；？！）」'.includes(r[cut])) cut++; }
  return [r.slice(0, cut), r.slice(cut)];
}
function captions(g, t) {
  const s = captionAt(t); if (!s) return;
  const px = ZH ? 52 : 48, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.28;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  const rows = capRows(g, s, px, wt, fam), fs = rows.map((r) => Math.min(px, fitPx(g, r, px, CAPW, wt, fam)));
  const wmax = Math.max(...rows.map((r, i) => { g.font = `${wt} ${fs[i]}px ${fam}`; return g.measureText(r).width; })), cy = 1370 - (rows.length - 1) * lh / 2;
  g.fillStyle = css(PAPER, .94); g.strokeStyle = css(INK, .9); g.lineWidth = 3;
  g.beginPath(); g.roundRect(CAPX - wmax / 2 - 28, cy - lh / 2 - 11, wmax + 56, rows.length * lh + 22, 16); g.fill(); g.stroke();
  rows.forEach((r, i) => { g.font = `${wt} ${fs[i]}px ${fam}`; g.fillStyle = css(INK); g.fillText(r, CAPX, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1300, 760, 140, '#ffd24d'); g.restore(); }

// ------------------------------------------------------------------ setup
async function setup() {
  TL = await (await fetch('timeline.json')).json(); C = TL.cue;
  if (Math.abs(TL.dur - DUR) > .01) throw new Error('timeline.json dur ' + TL.dur + ' != film.js DUR ' + DUR);
  try { VO = await (await fetch(`vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  F = (await (await fetch('../film/anim.json')).json()).frames;
  await document.fonts.load('700 60px Caveat');
  const [servers, brain, gpu, coders, kitchen, tk, forum, burst, paper, logo] = await Promise.all(['line_servers', 'line_brain', 'line_gpu', 'line_coders', 'line_kitchen', 'line_ticket', 'line_forum', 'line_burst'].map(art)
    .concat([loadImg('/scene/tex/Paper001/Paper001_2K-JPG_Color.jpg'), loadImg('/edu/art/brand/picasso_logo.png')]));
  S.servers = sprite(servers); S.brain = sprite(brain, .75); S.gpu = sprite(gpu, .6, .25, 1); S.gpuS = sprite(gpu, 150 / gpu.width, .7); S.coders = sprite(coders); S.kitchen = sprite(kitchen); S.kitchen.cap = 3; S.ticket = sprite(tk, .6, .3);
  S.burst = sprite(burst, .8, .2); S.ticketM = sprite(tk, 200 / tk.height, 1.1);   // the slip on the notice board (~120 px)
  S.forum = sprite(forum); S.row = sprite(cropPacked(forum, 22, 494, 900, 216));
  A.logo = logo;
  const [heap, press, geisel, bq, bh, spike, boxes, paperP, pc] = await Promise.all(['line_heap', 'line_press', 'line_geisel', 'line_building_q', 'line_building_h', 'line_spike', 'line_slip_boxes', 'line_paper', 'line_pc_kitchen'].map(art));
  S.heap = sprite(heap); S.press = pressSprite(press, S.heap); S.geisel = sprite(geisel); S.bq = sprite(bq); S.bh = sprite(bh); S.spike = sprite(spike); S.boxes = sprite(boxes); S.paper = sprite(paperP); S.pc = sprite(pc);
  for (const k of ['heap', 'press', 'geisel', 'bq', 'bh', 'spike', 'boxes', 'paper', 'pc']) S[k].cap = 4;
  const waits = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_d_chef_w' + i)));
  const cooks = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_d_chef_c' + i)));
  S.waitS = waits.map((im) => sprite(im, 280 / im.height, .5)); S.cook = cooks.map((im) => sprite(im, 1, .15));
  S.waitT = waits.map((im) => sprite(im, 190 / im.height, .9)); S.cookT = cooks.map((im) => sprite(im, 200 / im.height, .7));
  S.waitX = waits.map((im) => sprite(im, 110 / im.height, 1.3)); S.big121 = sprite(waits[5], 1, .1);
  const brk = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_chef_b' + i))), run = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_chef_r' + i)));
  S.brk = brk.map((im) => sprite(im, 190 / Math.max(im.height, im.width * .62), .5)); S.run = run.map((im) => sprite(im, 190 / im.height, .9));
  S.mgr = (await Promise.all([1, 2, 3].map((i) => art('line_manager_' + i)))).map((im) => sprite(im, 600 / im.height, .3));
  const pcv = mk(paper.width, paper.height), pg = pcv.getContext('2d', { willReadFrequently: true }); pg.drawImage(paper, 0, 0);
  const id = pg.getImageData(0, 0, pcv.width, pcv.height), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const v = Math.min(255, (d[j] * .2126 + d[j + 1] * .7152 + d[j + 2] * .0722) * 255 / 243); const l = 255 - (255 - v) * 1.6; d[j] = d[j + 1] = d[j + 2] = Math.max(0, l); }
  pg.putImageData(id, 0, 0); A.paper = pcv;
  layoutBuilding(); buildCrew(); KP = kitchenPicks(); buildUpstairs();
  if (ZH) await Promise.all(['400 100px "ZCOOL KuaiLe"', '700 52px "Noto Sans SC"'].map((f) => document.fonts.load(f, '数据中心的大模型塞进一张游戏显卡厨师字只要位上手')));
  if (MISSING.length) console.log('placeholders: ' + MISSING.join(' '));
}

function world(g, t, cam) {
  secA(g, t); secB(g, t); secC(g, t); secD(g, t); secE(g, t, cam);
  secF(g, t); card(g, t); streak(g, t); secF7(g, t, cam); secG(g, t); secH(g, t);
}
defineScene({
  meta: { title: 'Strata line film', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 5, background: css(PAPER), fonts: ['Caveat', 'Inter'], poster: 0 },
  setup,
  layers: [{ name: 'sheet', type: '2d', draw(ctx, g) {
    const t = ctx.sec;
    g.fillStyle = css(PAPER); g.fillRect(0, 0, W, H);
    if (t >= C.loop - .05) {   // under the end card as it lifts: the cover again (the X loop lands on frame 0)
      g.save(); secA(g, 0, true); grain(g, { x: 540, y: 960, z: 1 }); g.restore();
    } else {
      const cam = camAt(t);
      g.save(); g.translate(540, 960); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      world(g, t, cam); grain(g, cam);
      g.restore();
      hudE(g, t, cam); answerLine(g, t); slots(g, t); hudTitles(g, t); hudF7(g, t, cam); hudG(g, t); hudH(g, t);
    }
    endCard(g, t);
  } }],
  post(ctx, g) { if (CAPS && ctx.sec < C.endCard) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
