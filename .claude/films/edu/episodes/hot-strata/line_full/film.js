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

// ------------------------------------------------------------------ camera: one smooth path (monotone cubic per channel)
// reference framings: content of a section is laid out in screen px at its framing (inF), so it stays put on the sheet
const RC = { x: 540, y: 5091, z: .85 }, RD = { x: 540, y: 6860, z: 1 }, RF6 = { x: 275, y: 10665, z: .68 }, RF7 = { x: 1800, y: 10650, z: .8 };
const RG = { x: 540, y: 12900, z: .78 }, RG2 = { x: 540, y: 14000, z: .85 }, RH = { x: 540, y: 15400, z: 1 };
const CAM = [
  [0, 540, 960, 1], [2.2, 540, 960, 1], [3.35, 540, 2190, 1.12], [4.2, 540, 2215, 1.38], [4.5, 540, 2230, 1.38],
  [5.35, 540, 3290, 1.06], [7.8, 540, 3310, 1.06], [8.6, 540, 3330, 1.04], [10.2, 540, 3600, .97],
  [11.3, 540, 5091, .85], [19.6, 540, 5100, .86], [23.6, 540, 5100, .86], [24.0, 540, 4849, .62], [24.3, 540, 4849, .62], [25.3, 540, 5091, .86], [26.9, 540, 5080, .87],
  [27.8, 540, 6860, 1.0], [35.6, 540, 6880, 1.08],
  [36.9, 540, 8360, 1.0], [38.8, 540, 8360, 1.0], [40.6, 540, 8440, 1.2], [42.6, 540, 8440, 1.2], [44.4, 540, 8400, 1.03], [61.9, 540, 8420, 1.05],
  [63.1, 540, 10557, .7], [65.6, 540, 10557, .7], [69.8, 540, 10545, .72], [71.3, 470, 10371, 1.05], [73.9, 470, 10380, 1.06],
  [75.2, 520, 10995, .95], [78.9, 520, 10995, .96], [80.0, 380, 11150, 1.25], [81.2, 380, 11150, 1.22], [82.3, 560, 11000, .92],
  [83.4, 540, 10600, .72], [85.6, 560, 10620, .74], [86.6, 680, 10760, .9], [89.6, 680, 10740, .9], [90.8, 540, 10600, .72], [95.0, 540, 10600, .72],
  [96.4, RF6.x, RF6.y, RF6.z], [110.9, RF6.x + 5, RF6.y + 5, RF6.z + .01],
  [112.0, 1800, 10450, 1.22], [115.4, 1800, 10470, 1.18], [116.6, RF7.x, RF7.y, RF7.z], [121.5, RF7.x, RF7.y, RF7.z], [122.7, 1800, 10290, 1.6], [126.6, 1800, 10300, 1.62], [127.7, 2000, 10560, 1.0], [129.9, 2000, 10560, 1.0],
  [130.8, 1650, 10620, .82], [133.4, RF6.x, RF6.y, RF6.z],
  [134.3, RF6.x, RF6.y, RF6.z], [135.5, 440, 10360, 1.7], [140.2, 440, 10365, 1.72], [141.4, RF6.x, RF6.y, RF6.z], [166.6, RF6.x + 5, RF6.y + 5, RF6.z + .01], [179.0, RF6.x + 5, RF6.y + 5, RF6.z + .01],
  [180.4, RG.x, RG.y, RG.z], [186.4, 550, 12910, .8], [189.0, 580, 12940, .84],
  [189.9, RG2.x, RG2.y, RG2.z], [193.8, RG2.x, RG2.y + 10, RG2.z + .01],
  [194.7, RH.x, RH.y, RH.z], [201.6, 540, 15400, 1.02], [202.8, 540, 15420, .92], [DUR, 540, 15420, .92]];
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
  const bx = x + (flip ? -1 : 1) * h * .02, by = feet - h * .5, bw = h * .2, bh = h * .095;
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
    put(g, paint(sp, p, { ia: iaq }), m.x, m.y, w, { ay: 1, flip: m.flip });
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
const BLD = { x: 540, y: 10650, w: 1000, h: 1500 };
const bu = (u) => BLD.x - BLD.w / 2 + u * BLD.w, bv = (v) => BLD.y - BLD.h / 2 + v * BLD.h;
const CH = 110;                                           // chef height in the building (world px)
const UPQ = [], UPH = [], DOWN = [];
for (let i = 0; i < 32; i++) { const r = i < 16 ? 0 : 1, c = i % 16; UPQ.push([bu(.105 + c * .039 + (r ? 0 : .019)), bv(r ? .333 : .3), r]); }
for (let i = 0; i < 64; i++) { const r = Math.floor(i / 16), c = i % 16; UPH.push([bu(.105 + c * .039 + (r % 2 ? 0 : .019)), bv(.37 + r * .034), r]); }
for (let i = 0; i < 96; i++) { const r = Math.floor(i / 12), c = i % 12; DOWN.push([bu(.27 + c * .029 + (r % 2) * .0145 + (hs(i * 3.1) - .5) * .01), bv(.6 + r * .046), r, i]); }
const STAIR = [[bu(.79), bv(.94)], [bu(.955), bv(.335)]], STAIRH = [[bu(.79), bv(.94)], [bu(.955), bv(.475)]];
const STOVE = [[bu(.125), bv(.935)], [bu(.2), bv(.935)]];
const SEAT121 = 22;
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
  CALLS = [{ t0: 83.9, t1: 95.2, ids: hitsOf(1, set0) }];
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
const DOOR = [bu(-.02), bv(.94)];

function building(g, t) {
  if (t < 61.8 || t > 180.6) return;
  // the drawing: the first building, rebuilt with equal floors in B9
  const qOut = seg(t, 167.2, 167.7);
  if (qOut < 1) put(g, paint(S.bq, seg(t, 62.4, 63.6), { ia: 1 - qOut, fa: 1 - qOut, cache: qOut === 0 }), BLD.x, BLD.y, BLD.w);
  if (t > 167.4) put(g, paint(S.bh, seg(t, 167.5, 168.8)), BLD.x, BLD.y, BLD.w);
  const rebuilt = t >= 167.6;
  // --- downstairs: 96 walk in (B4), then rest in break poses; 32 go upstairs in the rebuild
  const crowd = [];
  if (t >= 74.6) for (let i = 0; i < 96; i++) {
    const [sx, sy, r] = DOWN[i], last = i === 95, t0 = 74.6 + i * .072, id = 1000 + i;
    if (t < t0) continue;
    const tgt = last ? [bu(.68), bv(.93)] : [sx, sy], path = [[bu(.0), tgt[1]], tgt], Lp = pathLen(path), dur = Lp / 950;
    const tq = q15(t - t0), arr = tq >= dur;
    let al = 1; if (rebuilt && i % 3 === 0) al = 1 - seg(t, 167.6 + (i % 7) * .05, 168.0 + (i % 7) * .05);
    if (al <= 0) continue;
    if (!arr) { const [x, y] = walkPath(path, tq * 950); crowd.push([y, () => smallChef(g, id, x, y, t, { cook: 0, bob: 3 * Math.abs(Math.sin(tq * Math.PI * 4)), alpha: al })]); continue; }
    const ta = t0 + dur, xf = seg(t, ta, ta + .2), b = S.brk[last ? 0 : (i * 5) % 6], bh = last ? CH * .62 : CH;
    crowd.push([tgt[1], () => {
      if (xf < 1) smallChef(g, id, tgt[0], tgt[1], t, { cook: 0, alpha: (1 - xf) * al });
      const flop = last ? spring(t - ta, 5, 9) : 1;
      put(g, paint(b, 1), tgt[0], tgt[1], bh * b.w / b.h, { ay: 1, alpha: xf * al, flip: (i * 7) % 2 === 1, rot: last ? mix(-.5, 0, flop) : 0 });
    }]);
  }
  crowd.sort((a, b) => a[0] - b[0]).forEach((c) => c[1]());
  // the little stove: two chefs cooking at half speed (B4 on)
  if (t >= 79.4) STOVE.forEach(([x, y], i) => {
    const id = [70, 1003][i], v = vOf(id), cs = S.cookT[v], f = .55, ph = i * 1.9, live = t - 79.4;
    const rot = .05 * Math.sin(2 * Math.PI * f * live + ph), bob = 3 * (.5 - .5 * Math.cos(2 * Math.PI * f * live + ph));
    put(g, paint(cs, seg(t, 79.4, 79.9), i === 0 && t > 83.9 && t < 95 ? COOK : {}), x, y - bob, CH * cs.w / cs.h, { ay: 1, flip: i === 1, rot });
  });
  // --- upstairs
  if (t >= 65.6) upstairs(g, t);
  stairs(g, t);
}
function upstairs(g, t) {
  let k = 0; while (k + 1 < UPS.length && t >= UPS[k + 1].t) k++;
  const cur = UPS[k], prv = k ? UPS[k - 1] : null, list = [];
  for (const [id, s] of cur.map) {
    const P = cur.n === 64 ? UPH : UPQ, [x, y] = P[s];
    if (k === 0) {   // B4: they walk in at the left door, along the floor, up the stairs and back to their seat
      const i = s, t0 = 65.8 + i * .085, path = [DOOR, STAIR[0], STAIR[1], [bu(.74), bv(.333)], [x, y]], Lp = pathLen(path), dur = Lp / 1100;
      if (t < t0) continue;
      const tq = q15(t - t0);
      if (tq < dur) { const [wx, wy] = walkPath(path, tq * 1100); list.push([wy, () => smallChef(g, id, wx, wy, t, { cook: 0, bob: 3 * Math.abs(Math.sin(tq * Math.PI * 4)) })]); continue; }
      list.push([y, () => smallChef(g, id, x, y, t)]); continue;
    }
    const st = cur.t + (s % 32) * .018, f = seg(t, st, st + .3);
    const was = prv && prv.map.has(id) ? upPos(prv.map, prv.n, id) : null;
    if (was && (was[0] !== x || was[1] !== y)) {   // moved (the rebuild): slide to the new seat
      const m = eio(seg(t, cur.t, cur.t + 1.0)); list.push([mix(was[1], y, m), () => smallChef(g, id, mix(was[0], x, m), mix(was[1], y, m), t)]); continue;
    }
    if (was) { list.push([y, () => smallChef(g, id, x, y, t)]); continue; }
    list.push([y, () => smallChef(g, id, x, y, t, { p: f })]);
    if (prv) for (const [oid, os] of prv.map) if (os === s && !cur.map.has(oid) && f < 1) { const [ox, oy] = upPos(prv.map, prv.n, oid); list.push([oy, () => smallChef(g, oid, ox, oy, t, { alpha: 1 - f })]); }
  }
  list.sort((a, b) => a[0] - b[0]).forEach((c) => c[1]());
}
// figures on the stairs: the B5 runner, the B6 misses, the B8 and B9 queues
function stairs(g, t) {
  const S0 = t >= 167.6 ? STAIRH : STAIR, at = (s) => [mix(S0[0][0], S0[1][0], s), mix(S0[0][1], S0[1][1], s)];
  const fig = (s, id, run = false, al = 1) => {
    const [x, y] = at(s);
    if (run) { const r = S.run[id % 6]; put(g, paint(r, 1), x, y, CH * r.w / r.h, { ay: 1, alpha: al }); return; }
    smallChef(g, id, x, y, t, { cook: 0, alpha: al });
  };
  if (t > 85.4 && t < 96) {   // the runner: slow, two steps a second
    const s = seg(q15(t), 85.6, 95.0) * .97 + .012 * Math.abs(Math.sin(q15(t) * Math.PI * 2));
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
function answerLine(g, t) {
  const a = fadeIO(t, 46.6, 179.4, .5, .5); if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const grd = g.createLinearGradient(0, 258, 0, 372); grd.addColorStop(0, css(PAPER, 0)); grd.addColorStop(.16, css(PAPER, .97)); grd.addColorStop(.84, css(PAPER, .97)); grd.addColorStop(1, css(PAPER, 0));
  g.fillStyle = grd; g.fillRect(0, 258, 1080, 114); g.restore();
  const x0 = 72, qpx = ZH ? 30 : 34, apx = ZH ? 38 : 44;
  hand(g, T.askQ, x0, 290, qpx, BLUE, { align: 'left', k: seg(t, 46.6, 47.4), alpha: a });
  const u = ansUnits(t), n = Math.floor(u), f = u - n, sep = T.ansSep;
  const done = T.ans.slice(0, n).join(sep), next = n < T.ans.length ? (n ? sep : '') + T.ans[n] : '';
  g.save(); g.font = `${HW} ${apx}px ${HAND}`;
  const w0 = done ? g.measureText(done).width : 0, w1 = next ? g.measureText(done + next).width - w0 : 0; g.restore();
  const shown = done + (f > 0 ? next : '');
  if (shown) {
    g.save(); g.beginPath(); g.rect(x0 - 10, 300, w0 + w1 * f + 10, 70); g.clip();
    hand(g, shown, x0, 334, apx, INK, { align: 'left', alpha: a }); g.restore();
  }
  // the cursor: red, blinking twice a second while waiting
  const cx = x0 + w0 + w1 * f + 8, blink = (Math.floor(t * 4) % 2 === 0 || (f > 0 && f < 1)) ? 1 : .15;
  if (n < T.ans.length || t < 179) { g.save(); g.globalAlpha = a * blink; g.fillStyle = css(RED); g.fillRect(cx, 316, 4, 38); g.restore(); }
  if (t > 93.5 && t < 95.8) hand(g, T.lag, cx + 60, 330, ZH ? 46 : 52, RED, { k: seg(t, 93.5, 93.8), rot: -.08, alpha: 1 - seg(t, 95.2, 95.8) });
}

// ------------------------------------------------------------------ the sheet, section by section
const SRV = { x: 540, y: 1320, w: 1000 }, BRAIN = { x: 540, y: 1180, w: 620 }, CARD = { x: 540, y: 2250, w: 560 };
const BY = [[0, BRAIN.y], [2.45, BRAIN.y], [3.0, 1850], [3.4, CARD.y - 6], [DUR, CARD.y - 6]], BW = [[0, BRAIN.w], [2.5, BRAIN.w], [3.0, 540], [3.4, 220], [DUR, 220]];
function brainAt(t) {
  const u = eio(seg(t, 2.5, 3.4)), a = seg(t, 2.25, 2.55);
  const st = 1 + .42 * Math.sin(Math.PI * u) - .08 * Math.sin(Math.PI * a), land = wobble(t - 3.4, .2, 5.5, 12), breathe = 1 + .012 * Math.sin(t * 2.3);
  return { x: BRAIN.x, y: hermite(BY.map((k) => k[0]), BY.map((k) => k[1]), t), w: hermite(BW.map((k) => k[0]), BW.map((k) => k[1]), t) * breathe, sx: (1 / st) * (1 + land), sy: st * (1 - land) };
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
  if (t >= C.gpu - .1 && !cover) { const bump = wobble(t - 3.4, .05, 6, 13); put(g, paint(S.gpu, seg(t, C.gpu, C.gpu + .5), { fill: wash(BLUE, .24) }), CARD.x, CARD.y, CARD.w, { sx: 1 + bump, sy: 1 - bump }); }
  const b = brainAt(t), pulse = .16 + .1 * eo(seg(t, .3, .8)) * (1 - seg(t, 1.6, 2.4)) + .12 * eo(seg(t, 3.4, 3.9));
  g.save(); const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.w * .85); gr.addColorStop(0, css(RED, pulse)); gr.addColorStop(1, css(RED, 0));
  g.fillStyle = gr; g.fillRect(b.x - b.w, b.y - b.w, b.w * 2, b.w * 2); g.restore();
  put(g, paint(S.brain, 1, { fill: wash(RED, .3) }), b.x, b.y, b.w, { sx: b.sx, sy: b.sy });
  if (!cover) L(g, t, T.card, 540, CARD.y - 215, ZH ? 54 : 62, RED, 3.55, 5.4, { patch: .5, rot: -.02, dur: .5 });
}
// B: the forum thread, the programmers, the comments that burst the window
const FORUM = { x: 540, top: 2650, w: 780 };
function secB(g, t) {
  if (t < 4.3 || t > 11.6) return;
  const fs = FORUM.w / S.forum.w, fx = (px) => FORUM.x - FORUM.w / 2 + px * fs, fy = (py) => FORUM.top + py * fs;
  put(g, paint(S.forum, seg(t, 4.6, 5.1)), FORUM.x, FORUM.top, FORUM.w, { ay: 0 });
  const tp = Math.min(fitPx(g, T.forumTitle[0], 58, 590), fitPx(g, T.forumTitle[1], 58, 590));
  L(g, t, T.forumTitle[0], fx(150), fy(225), tp, INK, 4.85, null, { align: 'left', dur: .45 });
  L(g, t, T.forumTitle[1], fx(150), fy(305), tp, INK, 5.25, null, { align: 'left', dur: .4 });
  L(g, t, T.forumDate, fx(150), fy(395), ZH ? 30 : 34, BLUE, 5.6, null, { align: 'left', dur: .3 });
  if (t > 5.0) { const sw = textW(g, T.forumStrata, tp); pen(g, ring(fx(150) + sw / 2, fy(225), sw / 2 + 26, tp * .62, 3), seg(t, 5.1, 5.45), RED, 6); }
  // the comments pile up and burst the window
  for (let k = 4; k <= 11; k++) {
    const t0 = 8.6 + (k - 4) * .2; if (t < t0) break;
    const sp = (k - 3) * .5, dx = (hs(k * 3.3) - .5) * 60 * sp, rot = (hs(k * 7.7) - .5) * .06 * sp, y = fy(603 + k * 229.5);
    put(g, paint(S.row, seg(t, t0, t0 + .25)), FORUM.x + dx, y, 900 * fs * (1 + .03 * sp), { rot });
    if (k <= 7) { const i = k - 4, t1 = t0 + .18; if (t > t1) hand(g, T.wow[i], FORUM.x + dx + (i % 2 ? 150 : -120), y - 6, ZH ? 60 : 70, i % 2 ? BLUE : RED, { k: seg(t, t1, t1 + .25), s: mix(.6, 1, spring(t - t1, 7, 13)), rot: rot + (i % 2 ? .1 : -.12) + wobble(t - t1, .08), knock: .3 }); }
  }
  if (t >= 7.9) { const pop = spring(t - 7.95, 6, 11); put(g, paint(S.coders, seg(t, 7.95, 8.45)), 540, 3860, 940 * mix(.92, 1, pop), { ay: 1 }); }
}
// C: the pile of numbers, the card, ten times, the press (laid out in screen px at framing RC)
const DEC = [[.2, .78, '0.013'], [.36, .86, '-0.27'], [.52, .8, '0.71'], [.68, .87, '-1.04'], [.82, .79, '0.05'], [.28, .64, '0.36'], [.46, .68, '-0.09'],
  [.62, .63, '0.88'], [.76, .69, '-0.52'], [.4, .52, '0.002'], [.56, .5, '-0.6'], [.5, .36, '1.2'], [.14, .9, '-0.33'], [.9, .9, '0.41']];
function secC(g, t) {
  if (t < 10.0 || t > 28.4) return;
  inF(g, RC, (g) => {
    const base = 1070, bh = 60, sq = eio(seg(t, C.pressDown, C.pressDown + .9)), hh = mix(650, 1.6 * bh, sq) * (1 + wobble(t - C.pressDown - .9, .06, 6, 14));
    const land = wobble(t - 23.95, .05, 7, 14);
    put(g, paint(S.heap, seg(t, C.heap, C.heap + 1.1)), 665, base, 650, { ay: 1, sx: mix(1, 1.18, sq), sy: hh / 650 * (1 - land) });
    const da = 1 - seg(t, 23.7, 24.0);
    if (da > 0) DEC.forEach(([u, v, s], i) => { const t0 = C.decimals + i * .1; if (t > t0) hand(g, s, 340 + u * 650, 420 + v * 650, 40, INK, { fam: LAT, w: 700, k: seg(t, t0, t0 + .25), rot: (hs(i) - .5) * .2, alpha: da, knock: .25 }); });
    // the card at the foot, and what fits on it
    const trem = wobble(t - C.stillNo, .05, 4, 30);
    put(g, paint(S.gpu, seg(t, C.heap + .4, C.heap + .9), { fill: wash(BLUE, .24) }), 226, 1128, 212, { rot: trem });
    L(g, t, T.card4090, 226, 1218, 30, INK, C.card4090, null, { fam: ZH ? LAT : HAND, dur: .4 });
    if (t >= C.fits) {
      dashBox(g, 124, base - bh, 328, base, seg(t, C.fits, C.fits + .4), RED, 4.5);
      L(g, t, T.fits, 226, base - bh / 2, ZH ? 28 : 32, RED, C.fits + .3, null, { dur: .4 });
    }
    for (let i = 1; i < 10; i++) { const t0 = C.x10 + i * .09; if (t > t0) dashBox(g, 124, base - (i + 1) * bh, 328, base - i * bh, seg(t, t0, t0 + .22), RED, 3, mix(.75, .22, seg(t, 25.2, 25.7))); }
    L(g, t, T.x10, 226, base - 10 * bh - 42, 66, RED, C.x10 + .9, null, { fam: LAT, dur: .3, alpha: mix(1, .35, seg(t, 25.2, 25.7)) });
    // the count
    const cf = 1 - seg(t, 21.6, 22.0);
    if (cf > 0) {
      const s = ZH ? T.count + T.countUnit : T.count + ' ' + T.countUnit, px = fitPx(g, s, ZH ? 110 : 96, 980);
      L(g, t, s, 540, 345, px, RED, C.count125, null, { dur: 1.2, patch: .4, alpha: cf, fam: ZH ? HAND : LAT });
      L(g, t, T.years, 540, 432, ZH ? 40 : 42, RED, C.years, null, { patch: .4, alpha: cf });
    }
    // the press: falls, presses, lifts a little; Strata on its beam
    if (t >= 23.4) {
      const fall = seg(t, 23.5, 23.95), top0 = base - 650, pb = t < 23.95 ? mix(-700, top0, fall * fall) : base - hh - 220 * eio(seg(t, 25.5, 26.1));
      const pw = 360, ph = pw * S.press.h / S.press.w, lw = wobble(t - 23.95, .04, 7, 16);
      put(g, paint(S.press, seg(t, 23.4, 23.85)), 665, pb, pw, { ay: 1, sy: 1 - lw });
      L(g, t, T.press, 665, pb - ph * .83, 54, RED, 23.95, null, { fam: LAT, dur: .35, patch: .3 });
    }
    if (t > 25.4) pen(g, [[124, base - bh], [1000, base - bh]], seg(t, 25.4, 25.8), RED, 3.5, { dash: [12, 9] });
    L(g, t, T.stillNo, 665, 872, ZH ? 60 : 68, RED, C.stillNo, null, { patch: .45, rot: -.04, dur: .5 });
  });
}
// D: the campus, a blank slip pinned to the notice board, the lab's name
function secD(g, t) {
  if (t < 26.8 || t > 37.4) return;
  inF(g, RD, (g) => {
    put(g, paint(S.geisel, seg(t, C.campus, C.campus + 1.3)), 540, 895, 1000);
    if (t >= 30.2) {
      const k = eio(seg(t, 30.2, 30.8)), x = mix(1150, 200, k), y = mix(200, 1095, k) - 160 * Math.sin(Math.PI * k), rot = mix(.9, -1.32, k) + wobble(t - 30.8, .1, 5, 12);
      const h = 250, w = h * S.ticket.w / S.ticket.h;
      put(g, paint(S.ticket, 1), x, y, w, { rot });
      if (t > 30.75) { g.save(); g.fillStyle = css(RED); g.beginPath(); g.arc(200 + Math.cos(rot - Math.PI / 2) * 95, 1095 + Math.sin(rot - Math.PI / 2) * 95, 8 * eo(seg(t, 30.75, 30.9)), 0, 7); g.fill(); g.restore(); }
      L(g, t, T.slip, 200, 1095, ZH ? 34 : 38, RED, 30.95, null, { rot: rot + Math.PI / 2, dur: .45 });
    }
    L(g, t, T.lab, 540, 400, ZH ? 100 : 120, RED, C.labName, 35.7, { patch: .4, dur: .6 });
    L(g, t, T.labSub, 540, 484, fitPx(g, T.labSub, ZH ? 34 : 38, 920), INK, C.labName + .7, 35.7, { patch: .4, dur: .7 });
  });
}
// E: the author's kitchen, 128 chefs, the slips, experts
function secE(g, t, cam) {
  if (t < 35.8 || t > 63.6) return;
  L(g, t, T.quote, 540, 8080, fitPx(g, T.quote, ZH ? 84 : 104, 960), INK, 36.3, 38.8, { patch: .45, dur: 1.0 });
  L(g, t, T.quoteBy, 720, 8190, ZH ? 50 : 56, RED, 37.2, 38.8, { patch: .4, dur: .5 });
  if (t >= 37.9) {
    const dim = mix(1, .55, eo(seg(t, 44.0, 45.4))) * mix(1, .7, eo(seg(t, 49.0, 49.5)));
    const kc = paint(S.kitchen, seg(t, 37.9, 38.9), { ia: Math.round(dim * 40) / 40, fa: 0 });
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
  L(g, t, T.chefs, 540, 405, ZH ? 88 : 100, RED, 44.4, 53.6, { patch: .45, rot: -.02, dur: .5 });
  L(g, t, T.station, 540, 484, ZH ? 38 : 42, INK, 45.0, 53.6, { patch: .4, dur: .4 });
  L(g, t, T.model, 540, 530, fitPx(g, T.model, ZH ? 28 : 30, 900), INK, 45.4, 53.6, { patch: .4, dur: .6 });
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
// F: labels on the building (world)
function secF(g, t) {
  if (t < 61.8 || t > 180.6) return;
  building(g, t);
  const lab = (s, u, v, px, col, t0, tout, o = {}) => L(g, t, s, bu(u), bv(v), px, col, t0, tout, Object.assign({ patch: .45 }, o));
  lab(T.cardLabel, .4, .045, ZH ? 66 : 64, RED, C.cardLabel, 74.4, { rot: -.02 });
  lab(T.ramLabel, .42, .44, ZH ? 72 : 76, INK, C.ramLabel, 83.0);
  lab(T.stove, .17, .66, ZH ? 40 : 44, INK, C.stoveCook, 95.4);
  if (t > 87.4 && t < 96) {
    const a = 1 - seg(t, 95.2, 95.8);
    arrow(g, [[bu(.75), bv(.93)], [bu(.82), bv(.6)], [bu(.9), bv(.36)]].flatMap((p, i, arr) => (i ? curve(arr[i - 1][0], arr[i - 1][1], p[0], p[1], 0).slice(1) : [p])), seg(t, 87.6, 88.6), RED, 6, { dash: [16, 12], alpha: a });
    lab(T.slower, .56, .55, ZH ? 58 : 58, RED, 87.7, 95.4, { rot: -.05 });
    lab(T.slower, .2, .58, ZH ? 46 : 46, RED, 88.1, 95.4, { rot: .03 });
  }
  lab(T.strata, .62, .1, 52, RED, 95.8, 179.0, { fam: LAT, dur: .35 });
  if (t > 160.9 && t < 179.4) { const cx = bu(.62) + 110, cy = bv(.1); arrow(g, ring(cx, cy, 34, 30, 2, .85), seg(t, 160.9, 161.5), RED, 5, { alpha: 1 - seg(t, 179.0, 179.4) }); }
  lab(T.quarter, .3, .12, ZH ? 50 : 54, RED, C.quarter, 167.3, { rot: -.03 });
  lab(T.half, .3, .12, ZH ? 50 : 54, RED, 168.9, 179.0, { rot: -.03 });
  lab(T.room2, .62, .2, ZH ? 54 : 60, RED, C.renovate, 168.6, { rot: -.04 });
  // 121: tally beside his face (B8), his reserved seat
  if (t > 135.6 && t < 141.6) {
    const [x, y] = UPQ[SEAT121], a = 1 - seg(t, 141.0, 141.6), n = Math.min(19, [...Array(40).keys()].filter((fi) => t >= 135.9 + fi * .042 && F[fi].experts.includes(121)).length);
    const ty = y - CH - 120, tx = x - 50;
    patch(g, tx - 14, ty - 28, tx + 150, ty + 82, a * .95 * seg(t, 135.7, 135.95), 10);
    for (let i = 0; i < n; i++) { const gI = Math.floor(i / 5), j = i % 5, gx = tx + gI * 34; if (j < 4) pen(g, [[gx + j * 7, ty - 14], [gx + j * 7 - 1, ty + 14]], 1, RED, 3, { alpha: a }); else pen(g, [[gx - 4, ty + 8], [gx + 26, ty - 8]], 1, RED, 3, { alpha: a }); }
    if (t > 136.0) pen(g, curve(tx + 20, ty + 22, x, y - CH - 6, .2), seg(t, 136.0, 136.3), RED, 2.4, { alpha: a });
    L(g, t, T.random23, tx + 68, ty + 44, 18, PENCIL, 138.3, 141.0, { dur: .4, align: 'center' });
    if (t > 138.6) for (let i = 0; i < 2; i++) pen(g, [[tx + 112 + i * 7, ty + 34], [tx + 111 + i * 7, ty + 56]], seg(t, 138.7 + i * .1, 138.8 + i * .1), PENCIL, 2.6, { alpha: a });
    L(g, t, T.slice, x, y + 18, 15, INK, 136.4, 141.0, { dur: .6, patch: .4 });
  }
  if (t > 152.2 && t < 167.6) { const [x, y] = UPQ[SEAT121], a = 1 - seg(t, 167.2, 167.6); L(g, t, T.reserved, x - 40, bv(-.035), ZH ? 50 : 50, RED, 152.3, 167.2, { patch: .45, dur: .4, rot: -.03 });
    arrow(g, curve(x - 40, bv(-.015), x, y - CH - 4, .15), seg(t, 152.6, 153.0), RED, 3.5, { alpha: a }); pen(g, [[x - 26, y + 4], [x + 26, y + 4]], seg(t, 152.3, 152.6), RED, 3, { alpha: a }); }
  if (t > 164.5 && t < 166.6) { const id = [...UPS[UPS.length - 2].map.keys()].find((e) => !UPS[UPS.length - 3].map.has(e)); if (id != null) { const p = upPos(UPS[UPS.length - 2].map, 32, id); pen(g, ring(p[0], p[1] - CH / 2, 40, 70, 9), seg(t, 164.7, 165.0), RED, 4, { alpha: 1 - seg(t, 166.0, 166.6) }); } }
}
// F, screen layout at framing RF6: the score card, the manager, the six slips of 121
function card(g, t) {
  if (t < 101.4 || t > 180.6) return;
  inF(g, RF6, (g) => {
    const a = 1;
    L(g, t, T.gridHead[0], 215, 584, ZH ? 28 : 30, INK, C.grid, 179.6, { dur: .4 });
    L(g, t, T.gridHead[1], 215, 618, fitPx(g, T.gridHead[1], ZH ? 28 : 30, 340), INK, C.grid + .3, 179.6, { dur: .5 });
    T.o8.forEach((s, i) => L(g, t, s, 215, 652 + i * 24, fitPx(g, s, 19, 350, SW, SANS), PENCIL, C.grid + .6, 179.6, { fam: SANS, w: SW, dur: .5 }));
    // the 10 x 10 grid: drawn once, filled per rule (hits in red ticks, misses as small grey chefs)
    const gx = 90, gy = 705, cs = 25, gk = seg(t, C.grid + .2, C.grid + 1.0), gout = 1 - seg(t, 179.4, 179.9);
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
      const y = 992 + i * 52, px = ZH ? 34 : 38, lbl = (r[0] ? r[0] + ' ' : '') + r[1];
      L(g, t, lbl, 50, y, fitPx(g, lbl, px, ZH ? 175 : 205), INK, t0, tout, { align: 'left', dur: .4 });
      L(g, t, r[2], ZH ? 278 : 300, y - 2, ZH ? 40 : 52, RED, t0 + .3, tout, { fam: ZH ? HAND : LAT, dur: .3 });
      if (extra) extra(y);
    };
    const gX = ZH ? 386 : 372;
    row(0, T.rows[0], C.s25, 168.4, (y) => { L(g, t, T.gradeF, gX, y - 2, ZH ? 30 : 58, RED, C.gradeF, 168.4, { fam: ZH ? HAND : LAT, dur: .25, rot: -.1, patch: ZH ? .3 : 0 }); if (t > C.gradeF + .2) pen(g, ring(gX, y - 2, ZH ? 56 : 30, ZH ? 26 : 30, 4), seg(t, C.gradeF + .2, C.gradeF + .55), RED, 3, { alpha: 1 - seg(t, 168.4, 168.8) }); });
    row(1, T.rows[1], C.s51, 168.4, (y) => L(g, t, T.double, 215, y + 25, 18, RED, C.double, 168.4, { dur: .4 }));
    row(2, T.rows[2], C.s77, 168.4, (y) => L(g, t, T.triple, 215, y + 25, 18, RED, C.triple, 168.4, { dur: .4 }));
    row(0, T.rowsH[0], C.s50, 179.6);
    row(1, T.rowsH[1], C.s93, 179.6, (y) => { L(g, t, T.gradeA, gX, y - 2, ZH ? 40 : 60, RED, C.gradeA, 179.6, { fam: ZH ? HAND : LAT, dur: .25, rot: -.1 }); if (t > C.gradeA + .2) pen(g, ring(gX, y - 2, 32, 32, 5), seg(t, C.gradeA + .2, C.gradeA + .55), RED, 3, { alpha: 1 - seg(t, 179.6, 180) }); });
    // the manager: blindfold, unmasked (magnifier), board, magnifier
    const mg = (sp, t0, t1, alpha = 1) => { if (t < t0 - .1 || t > t1 + .5) return; put(g, paint(sp, seg(t, t0, t0 + .6)), 185, 1478, 340 * sp.w / sp.h, { ay: 1, alpha: alpha * (1 - seg(t, t1, t1 + .4)) }); };
    mg(S.mgr[0], C.blindfold, C.unmask); mg(S.mgr[2], C.unmask + .2, C.rule2); mg(S.mgr[1], C.rule2, C.closer); mg(S.mgr[2], C.closer, 179.4);
    if (t > C.rule2 + .5 && t < C.closer + .4) {   // the tally on the manager's board
      const bx = 185 - 340 * S.mgr[1].w / S.mgr[1].h / 2, bw = 340 * S.mgr[1].w / S.mgr[1].h, x0 = bx + bw * .53, y0 = 1478 - 340 + 340 * .12, a = 1 - seg(t, C.closer, C.closer + .4);
      [121, 95, 23, 92].forEach((id, r) => {
        const n = Math.round(S.sets.cnt[id] / 2), y = y0 + r * 30;
        hand(g, String(id), x0 + 14, y, 18, INK, { fam: LAT, k: seg(t, C.rule2 + .5 + r * .15, C.rule2 + .7 + r * .15), alpha: a });
        for (let j = 0; j < n; j++) pen(g, [[x0 + 34 + j * 6, y - 8], [x0 + 33 + j * 6, y + 8]], seg(t, C.rule2 + .7 + r * .15 + j * .03, C.rule2 + .75 + r * .15 + j * .03), INK, 1.8, { alpha: a });
        if (r < 3) pen(g, ring(x0 + 34 + n * 3, y, n * 3 + 26, 15, r), seg(t, 142.2 + r * .15, 142.5 + r * .15), RED, 2.6, { alpha: a });
      });
    }
  });
}
function streak(g, t) {   // B8: slips of words 1-6 dealt out, 121 circled on each, linked
  if (t < 148.2 || t > 155.4) return;
  inF(g, RF6, (g) => {
    const out = eio(seg(t, 154.6, 155.3)), pts = [];
    for (let i = 0; i < 6; i++) {
      const t0 = 148.4 + i * .22, k = eio(seg(t, t0, t0 + .35)); if (k <= 0) continue;
      const cx = 432 + i * 70 + 58, top = 870 + (i % 2) * 22, h = 290, x = mix(1200, cx, k), rot = (i % 2 ? .04 : -.03) + wobble(t - t0 - .35, .05);
      slipDraw(g, x, top + out * 700, h, rot, F[i].experts, { head: '', circle: 121, ck: seg(t, (i < 3 ? 149.9 : 150.7) + (i % 3) * .1, (i < 3 ? 149.9 : 150.7) + (i % 3) * .1 + .25), seed: i });
      const j = F[i].experts.indexOf(121), sc = h / 900, lx = (j % 2 ? 72 : -72) - 8, ly = 360 + Math.floor(j / 2) * 135;
      pts.push([x + (lx * Math.cos(rot) - ly * Math.sin(rot)) * sc, top + out * 700 + (lx * Math.sin(rot) + ly * Math.cos(rot)) * sc]);
    }
    if (pts.length === 6) pen(g, pts, seg(t, C.link, C.link + .7), RED, 4.5, { alpha: 1 - out });
    [[149.9, 1], [150.7, 4]].forEach(([t0, i]) => L(g, t, T.again, 432 + i * 70 + 40, 845 + (i % 2) * 22, ZH ? 34 : 36, RED, t0, 154.6, { rot: -.08, patch: .4, dur: .3 }));
  });
}
// F': the serving-hatch side (B7), laid out at framing RF7
function secF7(g, t, cam) {
  if (t < 110.5 || t > 134.0) return;
  inF(g, RF7, (g) => {
    const bx = 540, by = 1000, bw = 900, bhh = bw * S.boxes.h / S.boxes.w, lab = (i) => [bx - bw / 2 + (.13 + i * .24) * bw, by - bhh / 2 + .63 * bhh];
    put(g, paint(S.boxes, seg(t, C.boxes, C.boxes + 2.8)), bx, by, bw);
    const MT = ZH ? [116.4, 117.4, 118.1, 118.8] : [116.4, 117.2, 117.9, 118.5];
    T.models.forEach((s, i) => { const [x, y] = lab(i); L(g, t, s, x, y, fitPx(g, s, 30, bw * .17, 700, LAT), INK, MT[i], null, { fam: LAT, w: 700, dur: .4 }); });
    L(g, t, T.requests, 540, by - bhh / 2 - 30, ZH ? 38 : 42, RED, 119.0, 121.2, { patch: .4, dur: .5 });
    // slips pop out of the boxes and fall back
    if (t > 119.6 && t < 121.6) for (let i = 0; i < 8; i++) {
      const t0 = 119.6 + i * .12, k = seg(t, t0, t0 + .9); if (k <= 0 || k >= 1) continue;
      const [x0] = lab(i % 4), x = x0 + (hs(i * 2.3) - .5) * 160, y = by - bhh * .35 - 420 * Math.sin(Math.PI * k), rot = (hs(i) - .5) * 2 + k * 3 * (i % 2 ? 1 : -1);
      slipDraw(g, x, y, 180, rot, F[(i * 5) % 40].experts, {});
    }
    // the spike with its stack, in front; the paper lands on top
    const sw = 300, sh = sw * S.spike.h / S.spike.w;
    put(g, paint(S.spike, seg(t, 111.3, 112.2)), 540, 985, sw, { ay: 1 });
    if (t >= C.paper) {
      const k = spring(t - C.paper, 7, 10), pw = 330, ph = pw * S.paper.h / S.paper.w, px = 540, top = mix(-900, 985 - sh * .92, k), rot = wobble(t - C.paper, .08, 4, 9) - .02;
      g.save(); g.translate(px, top); g.rotate(rot);
      put(g, paint(S.paper, seg(t, C.paper, C.paper + .5)), 0, 0, pw, { ay: 0 });
      const X = (u) => (u - .5) * pw, Y = (v) => v * ph;
      const tl = T.paper;
      L(g, t, tl[0], X(.42), Y(.13), fitPx(g, tl[0], 30, pw * .58, 700, LAT), INK, 121.9, null, { fam: LAT, w: 700, dur: .6 });
      if (ZH) { L(g, t, tl[1], X(.42), Y(.18), 15, INK, 122.6, null, { dur: .4 }); L(g, t, tl[2], X(.5), Y(.25), fitPx(g, tl[2], 12, pw * .8, 600, SANS), INK, 122.9, null, { fam: SANS, w: 600, dur: .5 }); }
      else { L(g, t, tl[1], X(.5), Y(.24), fitPx(g, tl[1], 13, pw * .8, 600, SANS), INK, 122.6, null, { fam: SANS, w: 600, dur: .5 }); L(g, t, tl[2], X(.5), Y(.275), fitPx(g, tl[2], 13, pw * .8, 600, SANS), INK, 122.9, null, { fam: SANS, w: 600, dur: .4 }); }
      L(g, t, tl[3], X(.5), Y(.33), fitPx(g, tl[3], 11, pw * .8, 500, SANS), INK, 123.3, null, { fam: SANS, w: 500, dur: .5 });
      L(g, t, T.award[0], X(.86), Y(.075), 19, RED, C.rosette, null, { dur: .2, fam: ZH ? HAND : LAT, patch: .3 });
      L(g, t, T.award[1], X(.86), Y(.115), 19, RED, C.rosette + .2, null, { dur: .2, fam: ZH ? HAND : LAT, patch: .3 });
      L(g, t, T.award[2], X(.86), Y(.155), 17, RED, C.rosette + .4, null, { dur: .2, fam: LAT, patch: .3 });
      g.restore();
    }
    // the Qwen box: a stack of its slips comes out
    const [qx, qy] = lab(3);
    if (t > C.qwenBox) for (let i = 0; i < 5; i++) { const k = spring(t - C.qwenBox - i * .12, 7, 10), fly = eio(seg(t, C.pretend + i * .15, C.pretend + 1.6 + i * .15)); if (k <= 0) continue;
      slipDraw(g, mix(qx + (i - 2) * 16, -900, fly), mix(qy - 160, qy - 330 - i * 26, k) - 300 * Math.sin(Math.PI * fly), 200, (i - 2) * .06 - fly * 1.5, F[30 + i].experts, {}); }
    L(g, t, T.cousin[0], qx - 40, qy - 420, ZH ? 46 : 42, RED, 129.0, 132.0, { patch: .45, rot: -.03, dur: .5 });
    L(g, t, T.cousin[1], qx - 40, qy - 372, 42, RED, 129.4, 132.0, { patch: .45, rot: -.03, dur: .5 });
  });
}
function hudF7(g, t) {
  if (t < 113.5 || t > 136.5) return;
  L(g, t, T.receipts, 540, 425, ZH ? 90 : 96, RED, 113.6, 121.0, { patch: .45, rot: -.03, dur: .5 });
  L(g, t, T.isca, 540, 1230, fitPx(g, T.isca, ZH ? 36 : 40, 880), INK, 125.0, 126.6, { patch: .45, dur: .6 });
  if (t > 127.4 && t < 132.5) {
    const k = eo(seg(t, 127.5, 128.8)), n = Math.round(6.8e6 * k / 1e5) * 1e5, s = ZH ? T.calls.replace('680', String(Math.round(n / 1e4))) : T.calls.replace('6,800,000', n.toLocaleString('en-US'));
    L(g, t, s, 860, 470, ZH ? 46 : 46, RED, 127.4, 132.0, { align: 'right', patch: .4, dur: .2, fam: ZH ? HAND : LAT });
  }
  L(g, t, T.pretend, 540, 400, fitPx(g, T.pretend, ZH ? 60 : 64, 900), RED, 132.8, 136.0, { patch: .45, rot: -.02, dur: .6 });
}
// G: the desk at home; G': the boxes open
function secG(g, t) {
  if (t < 179.0 || t > 195.0) return;
  if (t < 190.8) inF(g, RG, (g) => {
    put(g, paint(S.pc, seg(t, 179.3, 180.7)), 540, 1000, 760);
    L(g, t, T.cheaper, 260, 600, ZH ? 66 : 70, RED, C.cheaper, null, { patch: .45, rot: -.05 });
    L(g, t, T.ownPC, 420, 690, fitPx(g, T.ownPC, ZH ? 58 : 62, 640), RED, C.ownPC, null, { patch: .45, rot: -.03 });
    L(g, t, T.private, 420, 775, ZH ? 58 : 62, RED, C.private, null, { patch: .45, rot: -.04 });
  });
  if (t > 188.8) inF(g, RG2, (g) => {
    const bw = 900, bh = bw * S.boxes.h / S.boxes.w;
    put(g, paint(S.boxes, seg(t, 189.2, 190.0)), 540, 980, bw);
    for (let i = 0; i < 12; i++) {
      const t0 = 189.7 + i * .08, k = seg(t, t0, t0 + 1.4); if (k <= 0) continue;
      const x0 = 540 - bw / 2 + (.13 + (i % 4) * .24) * bw, ang = -Math.PI / 2 + (hs(i * 4.1) - .5) * 1.6, d = 380 + 260 * hs(i * 1.7), kk = eo(k);
      slipDraw(g, x0 + Math.cos(ang) * d * kk, 980 - bh * .3 + Math.sin(ang) * d * kk + 300 * k * k * .3, 150, (hs(i) - .5) * 4 * kk, F[(i * 7) % 40].experts, {});
    }
    const k = seg(t, 190.0, 190.8);
    if (k > 0) { g.save(); g.strokeStyle = css(RED); g.lineWidth = 6; g.setLineDash([2400 * k, 9999]); g.beginPath(); g.roundRect(70, 600, 940, 640, 40); g.stroke(); g.restore(); }
    L(g, t, T.open, 260, 600, ZH ? 66 : 72, RED, 190.2, null, { patch: .45, rot: -.04 });
    L(g, t, T.link, 690, 606, ZH ? 34 : 36, INK, 190.8, null, { patch: .45 });
  });
}
function hudG(g, t) {
  if (t < 181 || t > 194.8) return;
  L(g, t, T.smarter, 540, 400, fitPx(g, T.smarter, ZH ? 78 : 80, 940), RED, C.smarter, 189.2, { patch: .45, rot: -.02, dur: .8 });
  L(g, t, T.sys, 540, 1232, fitPx(g, T.sys, ZH ? 36 : 38, 800), RED, C.sysResearch, 189.2, { patch: .45, dur: .6 });
  if (t > C.you) {   // one slip comes to the middle: you?
    const k = spring(t - C.you, 7, 9), a = 1 - seg(t, 194.0, 194.6);
    g.save(); g.globalAlpha = a; slipDraw(g, mix(1300, 560, k), mix(1400, 520, k), mix(200, 640, k), mix(.8, -.06, k), [], {}); g.restore();
    L(g, t, T.you, 556, 860, ZH ? 120 : 130, RED, C.you + .45, 194.0, { dur: .4, rot: -.06 });
  }
}
// H: the finale, one station of tiny chefs, 40 real words
const HG = { x0: 112, y0: 640, dx: 57, dy: 86, h: 84 };
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
      const s = Math.floor(SEAT[id] / 16), c = SEAT[id] % 16, d = Math.hypot(c - 7.5, (s - 3.5) * 1.5) / 9;
      list.push([y, () => {
        const p = seg(t, 193.8 + d * .8, 194.4 + d * .8), on = lit.includes(id), v = vOf(id), sp = S.waitX[v];
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
    if (t > 199.8) {   // the upstairs block, circled; the next word lands mostly inside
      const [x0, y0] = hSeat(0), [x1, y1] = hSeat(3 * 16 + 7), k = seg(t, 199.8, 200.4);
      g.save(); g.strokeStyle = css(RED); g.lineWidth = 5; g.setLineDash([2200 * k, 9999]); g.beginPath(); g.roundRect(x0 - 40, y0 - HG.h - 26, x1 - x0 + 80, y1 - y0 + HG.h + 48, 34); g.stroke(); g.restore();
      if (t > 200.8) { const sk = spring(t - 200.8, 7, 9); g.save(); g.globalAlpha = sk > 0 ? 1 : 0; slipDraw(g, 900, mix(-300, 470, sk), 280, .06, [], {}); g.restore(); arrow(g, curve(x1 + 50, y0 - 40, 840, 560, -.25), seg(t, 201.0, 201.5), RED, 5); }
    }
    L(g, t, T.slice, 540, 1262, ZH ? 30 : 32, INK, 194.9, 202.6, { patch: .4, dur: .6 });
  });
}
function hudH(g, t) {
  if (t < 194.4 || t > 203.4) return;
  const a = 1 - seg(t, 202.4, 202.8), cx = ZH ? 390 : 380;
  L(g, t, T.chaos, cx, 420, ZH ? 90 : 100, INK, 194.8, null, { patch: .45, rot: -.04, dur: .4, alpha: a });
  if (t > 196.0) { const w = textW(g, T.chaos, ZH ? 90 : 100); pen(g, [[cx - w / 2 - 10, 430], [cx + w / 2 + 10, 410]], seg(t, 196.0, 196.25), RED, 7, { alpha: a }); }
  L(g, t, T.pattern, ZH ? 740 : 730, 430, ZH ? 90 : 100, RED, 196.2, null, { patch: .45, rot: -.03, dur: .45, alpha: a });
  // 121, up close
  if (t > 196.1 && t < 198.4) {
    const [sx, sy] = hSeat(SEAT[121]), k = eio(seg(t, 196.1, 196.7)) * (1 - eio(seg(t, 197.6, 198.3)));
    const sp = S.big121, h = mix(HG.h, 420, k), x = mix(sx, 540, k), y = mix(sy, 1150, k);
    if (k > .02) { patch(g, x - h * .4, y - h - 20, x + h * .4, y + 20, .9 * k, 30); put(g, paint(sp, 1), x, y, h * sp.w / sp.h, { ay: 1, flip: flipOf(121) }); badge(g, x, y, h, flipOf(121));
      pen(g, ring(x, y - h / 2, h * .42, h * .6, 21), seg(t, 196.7, 197.1), RED, 6, { alpha: 1 - seg(t, 197.6, 197.9) }); }
  }
}

// ------------------------------------------------------------------ section titles and notes in screen space
function hudTitles(g, t) {
  // B4: the cover's question, again, and its answer
  if (t > 62.6 && t < 68.6) {
    const a = 1 - seg(t, 67.8, 68.4), qpx = 200;
    L(g, t, '?', 300, 455, qpx, RED, C.qAgain, null, { fam: LAT, dur: .4, alpha: a });
    if (t > C.strikeQ) pen(g, [[220, 500], [380, 400]], seg(t, C.strikeQ, C.strikeQ + .25), RED, 9, { alpha: a });
    L(g, t, T.notHave, 640, 462, ZH ? 76 : 72, RED, C.strikeQ + .2, null, { patch: .45, rot: -.03, dur: .45, alpha: a });
  }
  // B6: the question of the film
  L(g, t, T.who, 540, 395, ZH ? 90 : 92, RED, C.question, 110.8, { patch: .45, rot: -.02, dur: .55, s: mix(1.15, 1, spring(t - C.question - .55, 7, 12)) });
  // B8: rule two and three titles are the score rows; the fine print, once
  if (t > C.finePrint && t < 166.6) {
    const a = fadeIO(t, C.finePrint, 166.0, .4, .5);
    patch(g, 56, 1128, 876, 1290, .95 * a, 16);
    T.fine.forEach((s, i) => { const px = fitPx(g, s, ZH ? 21 : 22, 790, SW, SANS); g.save(); g.globalAlpha = a; g.font = `${SW} ${px}px ${SANS}`; g.fillStyle = css(INK, .88); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 466, 1160 + i * 34); g.restore(); });
  }
}

// ------------------------------------------------------------------ the end card: the real logo printed on the paper
function endCard(g, t) {
  if (t < C.endCard) return;
  const up = eio(seg(t, C.endCard, C.endCard + .55)), away = eio(seg(t, C.loop, DUR - .02)), y = mix(H, 0, up) - away * H;
  g.save(); g.translate(0, y);
  g.fillStyle = css([252, 249, 242]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'multiply'; for (let ty = 0; ty < H; ty += A.paper.height) for (let tx = 0; tx < W; tx += A.paper.width) g.drawImage(A.paper, tx, ty); g.restore();
  g.strokeStyle = css(INK, .8); g.lineWidth = 3; g.shadowColor = 'rgba(0,0,0,.12)';
  pen(g, [[60, 300], [1020, 300], [1020, 1440], [60, 1440], [60, 300]], seg(t, C.endCard + .3, C.endCard + 1.2), INK, 3, { alpha: .8 });
  // logo: the three rings pop in, then the word, printed (multiply) on the paper
  const L0 = A.logo, lw = 700, lh = lw * L0.height / L0.width, lx = 540 - lw / 2, ly = 420, k0 = t - C.endCard - .5;
  const parts = [[0, 230, 410, 640], [370, 0, 790, 420], [760, 230, 1168, 640], [330, 600, 860, 720]];
  g.save(); g.globalCompositeOperation = 'multiply';
  parts.forEach(([u0, v0, u1, v1], i) => {
    const kk = spring((k0 - i * .14) * 1.0, 5.2, 8.5); if (k0 - i * .14 <= 0) return;
    const cx = lx + (u0 + u1) / 2 / L0.width * lw, cy = ly + (v0 + v1) / 2 / L0.height * lh, pw = (u1 - u0) / L0.width * lw, ph = (v1 - v0) / L0.height * lh;
    g.save(); g.translate(cx, cy); g.scale(kk, kk); g.drawImage(L0, u0, v0, u1 - u0, v1 - v0, -pw / 2, -ph / 2, pw, ph); g.restore();
  });
  g.restore();
  const e = T.end, e0 = C.endCard + 1.3;
  L(g, t, e[0], 540, 1080, fitPx(g, e[0], ZH ? 48 : 64, 900), INK, e0, null, { dur: .7 });
  L(g, t, e[1], 540, 1170, fitPx(g, e[1], ZH ? 54 : 60, 900), RED, e0 + .6, null, { dur: .6, fam: ZH ? HAND : LAT });
  L(g, t, e[2], 540, 1255, fitPx(g, e[2], ZH ? 40 : 44, 900), INK, e0 + 1.1, null, { dur: .6 });
  if (t > e0 + .9) pen(g, curve(380, 1205, 700, 1200, .02), seg(t, e0 + .9, e0 + 1.3), RED, 4);
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
function captions(g, t) {
  const s = captionAt(t); if (!s) return;
  const rows = s.split('/'), px = ZH ? 52 : 48, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.28;
  g.save(); g.font = `${wt} ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.min(860, Math.max(...rows.map((r) => g.measureText(r).width))), cy = 1372 - (rows.length - 1) * lh / 2;
  g.fillStyle = css(PAPER, .94); g.strokeStyle = css(INK, .9); g.lineWidth = 3;
  g.beginPath(); g.roundRect(540 - wmax / 2 - 28, cy - lh / 2 - 12, wmax + 56, rows.length * lh + 24, 16); g.fill(); g.stroke();
  rows.forEach((r, i) => { const f = Math.min(px, fitPx(g, r, px, 860, wt, fam)); g.font = `${wt} ${f}px ${fam}`; g.fillStyle = css(INK); g.fillText(r, 540, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1300, 840, 140, '#ffd24d'); g.restore(); }

// ------------------------------------------------------------------ setup
async function setup() {
  TL = await (await fetch('timeline.json')).json(); C = TL.cue;
  if (Math.abs(TL.dur - DUR) > .01) throw new Error('timeline.json dur ' + TL.dur + ' != film.js DUR ' + DUR);
  try { VO = await (await fetch(`vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  F = (await (await fetch('../film/anim.json')).json()).frames;
  await document.fonts.load('700 60px Caveat');
  const [servers, brain, gpu, coders, kitchen, tk, forum, paper, logo] = await Promise.all(['line_d_servers', 'line_brain', 'line_gpu', 'line_coders', 'line_d_kitchen', 'line_ticket', 'line_forum'].map(art)
    .concat([loadImg('/scene/tex/Paper001/Paper001_2K-JPG_Color.jpg'), loadImg('/edu/art/brand/picasso_logo.png')]));
  S.servers = sprite(servers); S.brain = sprite(brain, .75); S.gpu = sprite(gpu, .6, .25, 1); S.coders = sprite(coders); S.kitchen = sprite(kitchen); S.kitchen.cap = 3; S.ticket = sprite(tk, .6, .3);
  S.forum = sprite(forum); S.row = sprite(cropPacked(forum, 22, 494, 900, 216));
  A.logo = logo;
  const [heap, press, geisel, bq, bh, spike, boxes, paperP, pc] = await Promise.all(['line_heap', 'line_press', 'line_geisel', 'line_building_q', 'line_building_h', 'line_spike', 'line_slip_boxes', 'line_paper', 'line_pc_kitchen'].map(art));
  S.heap = sprite(heap); S.press = sprite(press); S.geisel = sprite(geisel); S.bq = sprite(bq); S.bh = sprite(bh); S.spike = sprite(spike); S.boxes = sprite(boxes); S.paper = sprite(paperP); S.pc = sprite(pc);
  for (const k of ['heap', 'press', 'geisel', 'bq', 'bh', 'spike', 'boxes', 'paper', 'pc']) S[k].cap = 4;
  const waits = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_d_chef_w' + i)));
  const cooks = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_d_chef_c' + i)));
  S.waitS = waits.map((im) => sprite(im, 280 / im.height, .5)); S.cook = cooks.map((im) => sprite(im, 1, .15));
  S.waitT = waits.map((im) => sprite(im, 190 / im.height, .9)); S.cookT = cooks.map((im) => sprite(im, 200 / im.height, .7));
  S.waitX = waits.map((im) => sprite(im, 110 / im.height, 1.3)); S.big121 = sprite(waits[5], 1, .1);
  const brk = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_chef_b' + i))), run = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => art('line_chef_r' + i)));
  S.brk = brk.map((im) => sprite(im, 190 / Math.max(im.height, im.width * .62), .9)); S.run = run.map((im) => sprite(im, 190 / im.height, .9));
  S.mgr = (await Promise.all([1, 2, 3].map((i) => art('line_manager_' + i)))).map((im) => sprite(im, 600 / im.height, .3));
  const pcv = mk(paper.width, paper.height), pg = pcv.getContext('2d', { willReadFrequently: true }); pg.drawImage(paper, 0, 0);
  const id = pg.getImageData(0, 0, pcv.width, pcv.height), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const v = Math.min(255, (d[j] * .2126 + d[j + 1] * .7152 + d[j + 2] * .0722) * 255 / 243); const l = 255 - (255 - v) * 1.6; d[j] = d[j + 1] = d[j + 2] = Math.max(0, l); }
  pg.putImageData(id, 0, 0); A.paper = pcv;
  buildCrew(); KP = kitchenPicks(); buildUpstairs();
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
      hudE(g, t, cam); answerLine(g, t); slots(g, t); hudTitles(g, t); hudF7(g, t); hudG(g, t); hudH(g, t);
    }
    endCard(g, t);
  } }],
  post(ctx, g) { if (CAPS && ctx.sec < C.endCard) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
