// Bake-off look "line" (SCRIPT_v2 opening, 17.5 s): black ink line drawings on warm paper that draw themselves.
// One long drawing on a tall sheet; the camera glides down it: the server wall with the AI model in it (cover), the model
// squeezing into one gaming card, the programmers losing it, the kitchen, 128 chefs, the order ticket and the 8 who cook.
// Every drawing is packed by ink.py (R ink, G paper fill, B pen time): a threshold on the pen time draws the line along
// the stroke itself. One red and one muted blue accent; hand-lettered labels; every frame a pure function of t.
import { defineScene } from '/pv/runtime/pv.js';
import { loadImg, mk, cl, mix, hs } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1';
const W = 1080, H = 1920, FPS = 30, DUR = 17.5;
const HAND = ZH ? '"ZCOOL KuaiLe", Caveat' : 'Caveat', HW = ZH ? 400 : 700;
const PAPER = [250, 246, 237], INK = [30, 28, 33], RED = [212, 56, 40], BLUE = [76, 112, 154];
const wash = (c, k) => c.map((v, i) => Math.round(mix(PAPER[i], v, k)));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
// the 8 cooks: red-pen line work on clean paper (?cook=wash: black ink on a red wash)
const COOK = Q.get('cook') === 'wash' ? { fill: wash(RED, .2) } : { ink: [196, 46, 34], fill: PAPER };
let TL, C, VO;
const A = {}, S = {};

const seg = (t, a, b) => cl((t - a) / (b - a));
const eio = (k) => { k = cl(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const eo = (k) => 1 - Math.pow(1 - cl(k), 3);
const spring = (x, k = 7, w = 13) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
const wobble = (x, a, k = 5, w = 11) => (x <= 0 ? 0 : a * Math.exp(-k * x) * Math.sin(w * x));

// ------------------------------------------------------------------ ink sprites
// a packed drawing, optionally resampled (small chefs); boost keeps thin lines dark after downscaling
function sprite(img, scale = 1, boost = 0, grow = 0) {
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = mk(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, n = w * h, ink = new Uint8Array(n), fil = new Uint8Array(n), tm = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) { ink[i] = boost ? 255 * (1 - Math.pow(1 - d[j] / 255, 1 + boost)) : d[j]; fil[i] = d[j + 1]; tm[i] = d[j + 2]; }
  // grow: widen the pen line by `grow` px (a max filter that carries each stroke's pen time with it), to match line weights
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
  return { w, h, ink, fil, tm, out, og, od: og.createImageData(w, h), cache: new Map() };
}
// the drawing at pen progress p: ink colour, fill colour + opacity, ink opacity (dim); finished states are cached
function paint(Sp, p, st = {}) {
  p = cl(p); if (p <= 0) return null;
  const ink = st.ink || INK, fc = st.fill || PAPER, fa = st.fa ?? 1, ia = st.ia ?? 1, soft = st.soft ?? .06;
  const key = p >= 1 && st.cache !== false ? `${ink}|${fc}|${fa.toFixed(3)}|${ia.toFixed(3)}` : null;
  if (key && Sp.cache.has(key)) return Sp.cache.get(key);
  const P = p * (1 + soft) * 255, k = 1 / (soft * 255), d = Sp.od.data, n = Sp.w * Sp.h, I = Sp.ink, F = Sp.fil, M = Sp.tm;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let r = (P - M[i]) * k; r = r < 0 ? 0 : r > 1 ? 1 : r;
    const a1 = I[i] * r * ia / 255, a2 = F[i] * r * fa / 255 * (1 - a1), a = a1 + a2;
    if (a <= .002) { d[j + 3] = 0; continue; }
    d[j] = (ink[0] * a1 + fc[0] * a2) / a; d[j + 1] = (ink[1] * a1 + fc[1] * a2) / a; d[j + 2] = (ink[2] * a1 + fc[2] * a2) / a; d[j + 3] = a * 255;
  }
  Sp.og.putImageData(Sp.od, 0, 0);
  if (!key) return Sp.out;
  const c = mk(Sp.w, Sp.h); c.getContext('2d').drawImage(Sp.out, 0, 0);
  if (Sp.cache.size > (Sp.cap ?? 24)) Sp.cache.delete(Sp.cache.keys().next().value);
  Sp.cache.set(key, c); return c;
}
// place a painted drawing: (x, y) is the anchor (ax, ay of the box), w the width in world units
function put(g, cv, x, y, w, o = {}) {
  if (!cv) return;
  const h = w * cv.height / cv.width, ax = o.ax ?? .5, ay = o.ay ?? .5;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale((o.sx ?? 1) * (o.flip ? -1 : 1), o.sy ?? 1);
  if (o.alpha != null) g.globalAlpha = o.alpha;
  g.drawImage(cv, -ax * w, -ay * h, w, h); g.restore();
}

// ------------------------------------------------------------------ hand lettering (vector text, written on left to right)
function fitPx(g, s, px, maxW, w = HW, fam = HAND) { g.font = `${w} ${px}px ${fam}`; const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function hand(g, s, x, y, px, col, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  const fam = o.fam ?? HAND, wt = o.w ?? HW, al = o.alpha ?? 1;
  g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.s != null) g.scale(o.s, o.s);
  g.font = `${wt} ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tw = g.measureText(s).width, x0 = -tw / 2 - px * .25, span = tw + px * .5;
  if (o.patch) {   // a soft paper patch the size of the words, laid down with the first stroke
    const pw = tw + px * o.patch, ph = px * 1.05, pk = cl(k * 1.15), r = ph * .3;   // follows the pen, slightly ahead
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

// ------------------------------------------------------------------ camera: one smooth path (monotone cubic per channel)
const CAM = [[0, 540, 960, 1], [3.9, 540, 1010, 1.05], [4.55, 540, 1060, 1.04], [5.7, 540, 1960, 0.98], [6.2, 540, 2220, 1.22], [6.75, 540, 2228, 1.42],
  [7.45, 540, 2620, 1.06], [8.8, 540, 2650, 1.1], [9.9, 540, 4100, 1.0], [10.75, 540, 4180, 1.2], [12.9, 540, 4100, 1.0], [DUR, 540, 4080, 1.04]];
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
function camAt(t) {
  const ts = CAM.map((k) => k[0]);
  return { x: hermite(ts, CAM.map((k) => k[1]), t), y: hermite(ts, CAM.map((k) => k[2]), t), z: Math.exp(hermite(ts, CAM.map((k) => Math.log(k[3])), t)) };
}

// ------------------------------------------------------------------ the world (one tall sheet of paper)
const SRV = { x: 540, y: 1290, w: 1000 }, BRAIN = { x: 540, y: 1150, w: 620 }, CARD = { x: 540, y: 2250, w: 560 };
const CODERS = { x: 540, y: 3018, w: 980 }, KIT = { x: 540, y: 3140, h: 1920 };
// the brigade: 8 rows x 16, back row first; the 8 who cook are spread over rows 1-4 (clear of captions and side UI)
const CREW = [], PICK = [[1, 4], [1, 11], [2, 2], [2, 9], [3, 5], [3, 10], [4, 3], [4, 8]], PICKV = [3, 0, 5, 2, 1, 4, 2, 3];
for (let r = 0; r < 8; r++) for (let c = 0; c < 16; c++) {
  const x = 540 + (c - 7.5) * 66 + (r % 2 ? 17 : -17), y = 3690 + r * 178, hh = 214 + r * 3;
  const pk = PICK.findIndex(([a, b]) => a === r && b === c);
  const v = pk >= 0 ? PICKV[pk] : Math.floor(hs(r * 31.7 + c * 7.3) * 6), flip = pk >= 0 ? pk >= 6 : hs(r * 13.1 + c * 3.9 + 2) < .5;
  const d = Math.hypot((c - 7.5) * 66, (r - 3.5) * 178) / Math.hypot(7.5 * 66, 3.5 * 178);
  CREW.push({ r, c, x, y, hh, v, flip, t0: C0(d, r, c), pick: pk });
}
function C0(d, r, c) { return 10.35 + 1.45 * d + .18 * hs(r * 5.1 + c * 9.7); }

function grain(g, cam) {
  const im = A.paper, tw = im.width, th = im.height, x0 = cam.x - 540 / cam.z, x1 = cam.x + 540 / cam.z, y0 = cam.y - 960 / cam.z, y1 = cam.y + 960 / cam.z;
  g.save(); g.globalCompositeOperation = 'multiply';
  for (let ty = Math.floor(y0 / th) * th; ty < y1; ty += th) for (let tx = Math.floor(x0 / tw) * tw; tx < x1; tx += tw) g.drawImage(im, tx, ty);
  g.restore();
}

const BY = [[0, BRAIN.y], [4.6, BRAIN.y], [5.7, 1880], [6.15, CARD.y - 6], [DUR, CARD.y - 6]], BW = [[0, BRAIN.w], [4.7, BRAIN.w], [5.65, 540], [6.15, 220], [DUR, 220]];
function brainAt(t) {
  const u = eio(seg(t, 4.75, 6.15)), a = seg(t, 4.4, 4.85);
  const st = 1 + .42 * Math.sin(Math.PI * u) - .08 * Math.sin(Math.PI * a), land = wobble(t - 6.15, .2, 5.5, 12);
  const breathe = 1 + .012 * Math.sin(t * 2.3);
  return { x: BRAIN.x, y: hermite(BY.map((k) => k[0]), BY.map((k) => k[1]), t), w: hermite(BW.map((k) => k[0]), BW.map((k) => k[1]), t) * breathe,
    sx: (1 / st) * (1 + land), sy: st * (1 - land) };
}

function world(g, t, cam) {
  // --- the data center and the model (cover)
  if (t < 7.6) {
    put(g, paint(S.servers, 1), SRV.x, SRV.y, SRV.w);
    const hk = 1 - seg(t, 3.8, 4.25);
    if (hk > 0) {
      const f1 = fitPx(g, T.hook[0], ZH ? 100 : 120, 960), f2 = fitPx(g, T.hook[1], ZH ? 100 : 120, 960);
      hand(g, T.hook[0], 540, 345, f1, INK, { alpha: hk }); hand(g, T.hook[1], 540, 345 + f1 * .6 + f2 * .6, f2, RED, { alpha: hk });
    }
  }
  if (t >= 4.95 && t < 10) {   // the gaming card is drawn and waiting before the model gets there; it gives when it lands
    const pc = seg(t, 5.0, 5.55), bump = wobble(t - 6.15, .05, 6, 13);
    put(g, paint(S.gpu, pc, { fill: wash(BLUE, .24) }), CARD.x, CARD.y, CARD.w, { sx: 1 + bump, sy: 1 - bump });
  }
  if (t < 10) {
    const b = brainAt(t), pulse = .16 + .1 * eo(seg(t, 1.9, 2.4)) * (1 - seg(t, 3, 4)) + .12 * eo(seg(t, 6.15, 6.7));
    g.save(); const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.w * .85); gr.addColorStop(0, css(RED, pulse)); gr.addColorStop(1, css(RED, 0));
    g.fillStyle = gr; g.fillRect(b.x - b.w, b.y - b.w, b.w * 2, b.w * 2); g.restore();
    put(g, paint(S.brain, 1, { fill: wash(RED, .3) }), b.x, b.y, b.w, { sx: b.sx, sy: b.sy });
  }
  // labels on the sheet
  if (t > 1.9 && t < 4.8) hand(g, T.model, 540, 830, ZH ? 70 : 84, RED, { k: seg(t, 1.95, 2.45), patch: .5, rot: -.03, alpha: 1 - seg(t, 4.4, 4.8) });
  if (t > 6.2 && t < 9.2) hand(g, T.card, 540, 2040, ZH ? 54 : 62, RED, { k: seg(t, 6.25, 6.8), patch: .5, rot: -.02, alpha: 1 - seg(t, 8.7, 9.1) });
  // --- programmers lose their minds
  if (t >= 6.8 && t < 10.2) {
    const pop = spring(t - 6.85, 6, 11);
    put(g, paint(S.coders, seg(t, 6.85, 7.4)), CODERS.x, CODERS.y, CODERS.w * mix(.92, 1, pop), { ay: 1 });
    const wa = 1 - seg(t, 8.7, 9.0);
    if (wa > 0) [[T.wow[0], 182, 2165, -.14, RED, 7.15], [T.wow[1], 905, 2335, .12, BLUE, 7.4], [T.wow[2], ZH ? 192 : 172, ZH ? 2448 : 2405, .08, RED, 7.7]].forEach(([s, x, y, r, col, t0]) => {
      if (t < t0) return;
      hand(g, s, x, y, ZH ? 68 : 78, col, { k: seg(t, t0, t0 + .3), s: mix(.6, 1, spring(t - t0, 7, 13)), rot: r + wobble(t - t0, .08), knock: .3, alpha: wa });
    });
  }
  // --- the kitchen and its 128 chefs
  if (t >= 8.85) {
    const dim = mix(1, .55, eo(seg(t, 10.6, 12.2))) * mix(1, .6, eo(seg(t, 13.7, 14.2))) * mix(1, .75, eo(seg(t, 14.6, 15.3)));
    const kc = paint(S.kitchen, seg(t, 8.95, 10.0), { ia: dim, fa: 0, cache: t > 15.3 || (t > 12.2 && t < 13.7) || t < 10.6 });
    put(g, kc, KIT.x, KIT.y, KIT.h * S.kitchen.w / S.kitchen.h, { ay: 0 });
    if (t > 9.3 && t < 10.75) hand(g, '?', 540, 3905, 320, RED, { fam: 'Caveat', w: 700, k: seg(t, 9.35, 9.7), alpha: 1 - seg(t, 10.3, 10.75), s: mix(.85, 1, spring(t - 9.35, 6, 10)) });
    crew(g, t);
    if (t > 11.6 && t < 13.9) {
      const k = seg(t, 11.7, 12.3);
      hand(g, T.chefs, 540, cam.y + (330 - 960) / cam.z, (ZH ? 84 : 100) / cam.z, RED, { k, patch: .55, rot: -.025, alpha: 1 - seg(t, 13.5, 13.9) });
    }
  }
}

function crew(g, t) {
  if (t < 10.3) return;
  const wait = mix(1, .5, eo(seg(t, 13.7, 14.2))) * mix(1, .52, eo(seg(t, 14.6, 15.3)));
  const iaq = Math.round(wait * 40) / 40;
  for (const m of CREW) {
    const p = seg(t, m.t0, m.t0 + .6); if (p <= 0) continue;
    const sp = S.waitS[m.v], w = m.hh * sp.w / sp.h;
    if (m.pick >= 0 && t >= 14.6) continue;     // drawn on top, below
    put(g, paint(sp, p, { ia: iaq }), m.x, m.y, w, { ay: 1, flip: m.flip });
  }
  // the 8 who cook: step forward (spring), the waiting pose fades, the cooking pose draws itself in red-washed ink
  if (t < 14.6) return;
  const picks = CREW.filter((m) => m.pick >= 0).sort((a, b) => a.r - b.r);
  for (const m of picks) {
    const t0 = 14.62 + m.pick * .085, x = t - t0, s = spring(x, 6.5, 11), sc = mix(1, 1.62, s), dy = 26 * s;
    const sw = S.waitS[m.v], ww = m.hh * sw.w / sw.h;
    const xf = eio(seg(t, t0 + .05, t0 + .22));
    const sel = Math.round(mix(iaq, 1, eo(seg(t, 14.6, 14.85))) * 40) / 40;   // picked: back to full ink first
    if (xf < 1) put(g, paint(sw, 1, { ia: sel }), m.x, m.y + dy, ww * sc, { ay: 1, flip: m.flip, alpha: 1 - xf });
    if (xf <= 0) continue;
    const cs = S.cook[m.v], cw = m.hh * sc * cs.w / cs.h;
    const live = eo(seg(t, t0 + .25, t0 + .8)), ph = m.pick * 1.7, f = 1.15 + .12 * (m.pick % 3);
    const rot = live * .045 * Math.sin(2 * Math.PI * f * (t - t0) + ph), bob = live * 8 * (.5 - .5 * Math.cos(2 * Math.PI * f * (t - t0) + ph * 1.3));
    put(g, paint(cs, 1, COOK), m.x, m.y + dy - bob, cw, { ay: 1, flip: m.flip, rot, alpha: xf });
  }
}

// the order ticket (screen space: it comes to the front of the sheet)
function ticket(g, t) {
  if (t < 13.6) return;
  const k = spring(t - 13.6, 8, 9), mv = eio(seg(t, 14.5, 15.1));
  const h = mix(1010, 330, mv), cx = mix(540, 958, mv), top = mix(-1250, 285, k);
  const rot = wobble(t - 13.6, .06, 3.2, 8) + wobble(t - 14.5, -.05, 3.5, 9);
  g.save(); g.translate(cx, top); g.rotate(rot); const sc = h / 900; g.scale(sc, sc);
  put(g, paint(S.ticket, 1), 0, 0, 900 * S.ticket.w / S.ticket.h, { ay: 0 });
  const lines = T.ticket, px = ZH ? 150 : 136, y0 = ZH ? 330 : 420;
  if (ZH) [...lines[0]].forEach((ch, i) => hand(g, ch, 0, y0 + i * 150, px, RED, { k: seg(t, 13.85 + i * .1, 14.05 + i * .1) }));
  else lines.forEach((s, i) => hand(g, s, 0, y0 + i * 140, px, RED, { k: seg(t, 13.85 + i * .16, 14.1 + i * .16) }));
  g.restore();
  if (t > 15.9) hand(g, T.eight, ZH ? 430 : 420, 330, ZH ? 92 : 112, RED, { k: seg(t, 15.95, 16.5), patch: .5, rot: -.03 });
}

// ------------------------------------------------------------------ captions (copied from the hot-strata film, paper box)
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) { const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    const parts = (T.cap[v.id] || '').split('|'), lens = parts.map((p) => p.replace(/\//g, '').length), tot = lens.reduce((a, b) => a + b, 0);
    let acc = r.t; for (let i = 0; i < parts.length; i++) { const d = r.dur * lens[i] / tot; if (t < acc + d + (i === parts.length - 1 ? .25 : 0)) return parts[i]; acc += d; } }
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
  TL = await (await fetch('../timeline.json')).json(); C = TL.cue;
  try { VO = await (await fetch(`../vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  const cut = (n) => loadImg('/edu/art/cut/' + n + '.png');
  const [servers, brain, gpu, coders, kitchen, tk, paper] = await Promise.all(['line_d_servers', 'line_brain', 'line_gpu', 'line_coders', 'line_d_kitchen', 'line_ticket'].map(cut)
    .concat([loadImg('/scene/tex/Paper001/Paper001_2K-JPG_Color.jpg')]));
  S.servers = sprite(servers); S.brain = sprite(brain, .75); S.gpu = sprite(gpu, .6, .25, 1); S.coders = sprite(coders); S.kitchen = sprite(kitchen); S.kitchen.cap = 3; S.ticket = sprite(tk);
  const waits = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => cut('line_d_chef_w' + i)));
  const cooks = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => cut('line_d_chef_c' + i)));
  S.waitS = waits.map((im) => sprite(im, 280 / im.height, .5));
  S.cook = cooks.map((im) => sprite(im, 1, .15));
  // paper: the real sheet's grain as a multiply layer, its median lifted to white so it only adds tooth
  const pc = mk(paper.width, paper.height), pg = pc.getContext('2d', { willReadFrequently: true }); pg.drawImage(paper, 0, 0);
  const id = pg.getImageData(0, 0, pc.width, pc.height), d = id.data;
  for (let j = 0; j < d.length; j += 4) { const v = Math.min(255, (d[j] * .2126 + d[j + 1] * .7152 + d[j + 2] * .0722) * 255 / 243); const l = 255 - (255 - v) * 1.6; d[j] = d[j + 1] = d[j + 2] = Math.max(0, l); }
  pg.putImageData(id, 0, 0); A.paper = pc;
  const fl = ZH ? ['400 100px "ZCOOL KuaiLe"', '700 52px "Noto Sans SC"'] : [];
  await Promise.all(fl.map((f) => document.fonts.load(f, '数据中心的大模型塞进一张游戏显卡厨师字只要位上手')));
}

defineScene({
  meta: { title: 'Strata bake-off: line', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 5, background: css(PAPER), fonts: ['Caveat', 'Inter'], poster: 0 },
  setup,
  layers: [{ name: 'sheet', type: '2d', draw(ctx, g) {
    const t = ctx.sec, cam = camAt(t);
    g.fillStyle = css(PAPER); g.fillRect(0, 0, W, H);
    g.save(); g.translate(540, 960); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
    world(g, t, cam); grain(g, cam);
    g.restore();
    ticket(g, t);
  } }],
  post(ctx, g) { if (CAPS) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
