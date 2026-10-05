// L01-1 style cut v2 (B0-B2 + the logo end card, 25 s): the user's notes on v1 applied.
//  - The stage fills the frame: the camera looks into the toy theatre; the proscenium and curtains only frame the
//    edges. The whole theatre on the desk is shown once, as the reveal when the ants finally add.
//  - No random jitter or stepped (on twos) motion: every move is a smooth function of t (springs, eased walks,
//    pendulum swings, a card wave), the camera moves continuously.
//  - No mascot parked in the corner; the hero ant acts, then leaves and comes back on the poster.
//  - Sound is recorded (Kenney CC0) plus music (Kevin MacLeod, CC BY 4.0), see timeline2.json / mix.py.
// Coordinates: design px of the 1080x1920 frame at the rest camera. addD(K, z, fn) draws fn in design px on plane z.
import { defineScene } from '/pv/runtime/pv.js';
import { makeStage, makePress, tone, ramp, brushLine, loadImg, mk, cl, mix, eio, hs, TAU } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const GUIDES = Q.get('guides') === '1', CAPS = Q.get('cap') !== '0';
const W = 1080, H = 1920, FPS = 30, DUR = 25.0;
const ART = '/edu/art/cut/';
const SERIF = ZH ? '"Noto Serif SC", Fraunces' : 'Fraunces', SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter', MONO = ZH ? '"Noto Sans SC", "JetBrains Mono"' : '"JetBrains Mono"';
const HAND = ZH ? '"ZCOOL KuaiLe", Caveat' : 'Caveat', HANDW = ZH ? 400 : 700, DISP = ZH ? '"Noto Serif SC", Fraunces' : '"Instrument Serif"';

let TL, C, VO, ST, OPEN;
const A = {}, P = {}, SM = {};

// ------------------------------------------------------------------ smooth time helpers (no steps, no noise)
const seg = (t, a, b) => cl((t - a) / (b - a));
const sst = (k) => { k = cl(k); return k * k * (3 - 2 * k); };
const eo = (k) => 1 - Math.pow(1 - cl(k), 3);
const ei = (k) => Math.pow(cl(k), 3);
const settle = (x) => (x <= 0 ? 0 : 1 - Math.exp(-5.2 * x) * Math.cos(8.5 * x));      // drop with one soft overshoot
const swing = (x, a = .05) => (x <= 0 ? 0 : a * Math.exp(-2.4 * x) * Math.sin(7.5 * x));  // a pendulum dying out
const breathe = (t, ph, a = .012) => 1 + a * Math.sin(t * 3.6 + ph * 6.283);

// ------------------------------------------------------------------ layout: the opening fills the frame
const TF = { s: 1.62 }; TF.x = 540 - 509 * TF.s; TF.y = 330 - 373 * TF.s; TF.w = 1024 * TF.s; TF.h = 1386 * TF.s;
const tf = (u, v) => [TF.x + u * TF.s, TF.y + v * TF.s];
const Z = { desk: 3000, back: 1150, risers: 1110, rows: 1090, floor: 1060, pit: 1004, curtain: 1003, front: 1000, fly: 975, poster: 970, onTop: 960 };

function addD(K, z, fn, o) { K.add(z, (x, info) => { x.save(); x.scale(z / 1000, z / 1000); x.translate(-540, -960); fn(x, info); x.restore(); }, o); }
function lightD(K, X, Y, z, r, c, a = 1, o = {}) {
  const k = z / 1000; K.light(Object.assign({ x: (X - 540) * k, y: (Y - 960) * k, z, rx: r * k, c, a, soft: .85 }, o, { ry: (o.ry ?? r) * k }));
}
const clipOpen = (x, grow = 0) => { x.beginPath(); OPEN.forEach(([a, b], i) => { const gx = a + (a < 540 ? -grow : grow); i ? x.lineTo(gx, b) : x.moveTo(gx, b); }); x.closePath(); x.clip(); };
function pic(x, im, X, Y, w, o = {}) {
  if (!im) return; const h = w * im.height / im.width, ax = o.ax ?? .5, ay = o.ay ?? 1;
  x.save(); x.translate(X, Y); if (o.rot) x.rotate(o.rot); x.scale((o.flip ? -1 : 1) * (o.sx ?? 1), o.sy ?? 1);
  if (o.shadow) { x.save(); x.globalAlpha = (o.alpha ?? 1) * o.shadow; x.filter = 'blur(8px)'; x.drawImage(shadowOf(im), -ax * w + 8, -ay * h + 12, w, h); x.restore(); }
  x.globalAlpha = o.alpha ?? 1; x.drawImage(im, -ax * w, -ay * h, w, h); x.restore();
}
const SHD = new Map();
function shadowOf(im) {
  if (SHD.has(im)) return SHD.get(im); const c = mk(im.width / 4, im.height / 4), g = c.getContext('2d');
  g.drawImage(im, 0, 0, c.width, c.height); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#0b0607'; g.fillRect(0, 0, c.width, c.height); SHD.set(im, c); return c;
}
function smallOf(im, h, key) {
  const k = key + '@' + Math.round(h); if (SM[k]) return SM[k];
  const w = Math.round(h * im.width / im.height), c = mk(w * 2, h * 2), g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); SM[k] = c; return c;
}
function font(g, w, px, fam) { g.font = `${w} ${px}px ${fam}`; }
function fitPx(g, s, w, px, fam, maxW) { font(g, w, px, fam); const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function text(g, s, X, Y, w, px, fam, o = {}) { g.save(); font(g, w, px, fam); g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'alphabetic'; g.fillStyle = o.fill ?? '#000'; g.fillText(s, X, Y); g.restore(); }

// ------------------------------------------------------------------ riso prints
function copyOf(c) { const o = mk(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); return o; }
function riso(key, w, h, inks, draw, k = 2) {
  const press = makePress({ W: w * k, H: h * k, k, unit: k * .85, seed: key, inks });
  press.begin(); draw(press, w, h); const out = copyOf(press.print({ key })); out.w = w; out.h = h; return out;
}
function hit2(press, s, X, Y, w, px, fam, key = 'navy') { text(press.plate('pink'), s, X + 3, Y + 3, w, px, fam); text(press.plate(key), s, X, Y, w, px, fam); }
// the curve poster in two prints from one press (same paper, same register): without and with the data, so the curve
// can be revealed left to right while the voice says it
const CG = { x0: 60, y0: 196, cw: 660, ch: 500 };
CG.X = (u) => CG.x0 + 70 + u * (CG.cw - 110); CG.V = (v) => CG.y0 + CG.ch - 70 - (v / .4) * (CG.ch - 130);
const CPTS = [[.0, .01], [.16, .012], [.32, .015], [.48, .02], [.62, .03], [.72, .09], [.86, .2], [1.0, .38]];   // shape of Wei et al. Fig. 2A (GPT-3), schematic
const cf = (u) => { for (let i = 1; i < CPTS.length; i++) if (u <= CPTS[i][0]) { const a = CPTS[i - 1], b = CPTS[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * sst(k); } return .38; };
function curvePrints() {
  const w = 780, h = 800, k = 2, press = makePress({ W: w * k, H: h * k, k, unit: k * .85, seed: 'curve' + LANG, inks: ['yellow', 'pink', 'blue', 'navy'] });
  const N = press.plate('navy'), Y = press.plate('yellow');
  const base = () => {
    const ps = press.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .05, .14); ps.fillRect(0, 0, w, h);
    const tf_ = fitPx(N, T.curve.t, 900, 58, SERIF, w - 80); hit2(press, T.curve.t, w / 2, 86, 900, tf_, SERIF);
    text(N, T.curve.sub, w / 2, 130, 600, 30, SANS);
    text(N, T.curve.foot, w / 2, 168, 500, fitPx(N, T.curve.foot, 500, 24, SANS, w - 80), SANS);
    Y.fillStyle = tone(1); Y.fillRect(CG.x0, CG.y0, CG.cw, CG.ch);
    brushLine(N, [[CG.X(0) - 14, CG.V(0)], [CG.X(1) + 18, CG.V(0)]], 4, 'xa', { taper: .05 });
    brushLine(N, [[CG.X(0), CG.V(0) + 14], [CG.X(0), CG.V(.4) - 18]], 4, 'ya', { taper: .05 });
    N.fillStyle = '#000'; N.beginPath(); N.moveTo(CG.X(1) + 30, CG.V(0)); N.lineTo(CG.X(1) + 12, CG.V(0) - 9); N.lineTo(CG.X(1) + 12, CG.V(0) + 9); N.fill();
    for (let i = 1; i <= 3; i++) N.fillRect(CG.X(i / 4) - 2, CG.V(0) - 2, 4, 14);
    text(N, T.curve.x, CG.X(1), CG.V(0) + 54, 700, 34, SANS, { align: 'right' });
    N.save(); N.translate(CG.X(0) - 28, CG.V(.4) + 10); N.rotate(-Math.PI / 2); text(N, T.curve.y, 0, 0, 700, 34, SANS, { align: 'right' }); N.restore();
  };
  press.begin(); base(); const b = copyOf(press.print({ key: 'base' }));
  press.begin(); base();
  const PS = press.plate('pink', 'screen'); PS.fillStyle = tone(.55); PS.beginPath(); PS.moveTo(CG.X(0), CG.V(0));
  for (let i = 0; i <= 100; i++) PS.lineTo(CG.X(i / 100), CG.V(cf(i / 100))); PS.lineTo(CG.X(1), CG.V(0)); PS.closePath(); PS.fill();
  const line = []; for (let i = 0; i <= 80; i++) line.push([CG.X(i / 80), CG.V(cf(i / 80))]); brushLine(N, line, 7, 'curve', { taper: .03 });
  for (const [u, v] of CPTS) { N.beginPath(); N.arc(CG.X(u), CG.V(v), 9, 0, TAU); N.fill(); }
  press.knockout((g) => { for (const [u, v] of CPTS) { g.beginPath(); g.arc(CG.X(u), CG.V(v), 4.2, 0, TAU); g.fill(); } });
  const f = copyOf(press.print({ key: 'full' }));
  b.w = f.w = w; b.h = f.h = h; P.curveBase = b; P.curveFull = f;
}
function bakePrints() {
  P.title = riso('title' + LANG, 600, 290, ['yellow', 'pink', 'blue', 'navy'], (p, w, h) => {
    const ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .05, .18); ps.fillRect(0, 0, w, h);
    const wt = ZH ? 900 : 400, f = Math.min(fitPx(p.plate('navy'), T.title[0], wt, ZH ? 112 : 122, DISP, w - 60), fitPx(p.plate('navy'), T.title[1], wt, ZH ? 112 : 122, DISP, w - 60));
    hit2(p, T.title[0], w / 2, h * .43, wt, f, DISP, 'blue'); hit2(p, T.title[1], w / 2, h * .43 + f * .98, wt, f, DISP, 'blue');
    P.titleF = f;
  });
  P.sum = riso('sum', 430, 104, ['yellow', 'navy'], (p, w, h) => { p.plate('yellow').fillStyle = tone(1); p.plate('yellow').fillRect(0, 0, w, h); text(p.plate('navy'), T.sum, w / 2, h * .72, 900, 70, 'Fraunces'); });
  P.anderson = riso('anderson' + LANG, 560, 330, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const N = p.plate('navy'), ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .12, .3); ps.fillRect(0, 0, w, h);
    p.plate('yellow').fillStyle = tone(1); p.plate('yellow').fillRect(18, 18, w - 36, h - 36);
    if (ZH) { hit2(p, T.anderson.t[0], w / 2, 150, 900, 104, SERIF); text(N, T.anderson.sub, w / 2, 202, 700, 40, 'Fraunces'); }
    else { const f = fitPx(N, T.anderson.t[1], 900, 104, 'Fraunces', w - 70); hit2(p, T.anderson.t[0], w / 2, 40 + f * .95, 900, f, 'Fraunces'); hit2(p, T.anderson.t[1], w / 2, 40 + f * 1.9, 900, f, 'Fraunces'); }
    text(N, T.anderson.by, w / 2, h - 66, 700, fitPx(N, T.anderson.by, 700, 34, SANS, w - 60), SANS);
    text(N, T.anderson.note, w / 2, h - 32, 500, fitPx(N, T.anderson.note, 500, 24, SANS, w - 60), SANS);
  });
  curvePrints();
  // the end card: paper of the same press family, the lab's logo printed over it, two lines
  P.endCard = riso('end' + LANG, 600, 520, ['yellow', 'navy'], (p, w, h) => {
    const N = p.plate('navy'); N.fillStyle = tone(1); N.fillRect(40, 404, w - 80, 2);
    text(N, T.end[0], w / 2, 448, 700, fitPx(N, T.end[0], 700, 24, '"JetBrains Mono"', w - 70), '"JetBrains Mono"');
    text(N, T.end[1], w / 2, 492, 700, fitPx(N, T.end[1], 700, 30, ZH ? SERIF : '"JetBrains Mono"', w - 70), ZH ? SERIF : '"JetBrains Mono"');
  });
}

// ------------------------------------------------------------------ setup
async function setup(ctx) {
  TL = await (await fetch('timeline2.json')).json(); C = TL.cue;
  try { VO = await (await fetch(`vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  const names = ['theatre_front', 'curtain_closed', 'risers', 'judge_paddle', 'felt_ant_card', 'felt_ant_climb', 'felt_ant_sit', 'felt_ant_bow',
    'felt_ant_crowd_1', 'felt_ant_crowd_2', 'felt_ant_crowd_3', 'felt_ant_crowd_4'];
  await Promise.all(names.map(async (n) => { A[n] = await loadImg(ART + n + '.png'); }));
  A.desk = await loadImg('/edu/art/src/desk_night.png'); A.inside = await loadImg('/edu/art/src/stage_inside.png');
  A.logo = await loadImg('/edu/art/brand/picasso_logo.png');
  if (ZH) await Promise.all([`900 80px ${SERIF}`, `700 30px ${SANS}`, `400 40px ${HAND}`].map((f) => document.fonts.load(f, '一只蚂蚁不会算数多者异也算力另计')));
  else await Promise.all(['700 40px Caveat', '400 80px "Instrument Serif"'].map((f) => document.fonts.load(f)));
  traceOpening();
  bakePrints();
  A.antBlack = blackCard(A.felt_ant_card, [79, 17, 510, 433]);
  ST = makeStage({ W: ctx.W, H: ctx.H, S: ctx.S, OX: ctx.cfg.OX, OY: ctx.cfg.OY, DW: ctx.DW, DH: ctx.DH, bg: '#07050a' });
  bakeCrowd();
}
function traceOpening() {
  const im = A.theatre_front, c = mk(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, Wd = c.width, L = [], R = [];
  for (let v = 373; v <= 1198; v += 4) { const a0 = (u) => d[(v * Wd + u) * 4 + 3]; if (a0(512) > 60) continue;
    let a = 512, b = 512; while (a > 0 && a0(a - 1) < 60) a--; while (b < Wd - 1 && a0(b + 1) < 60) b++; L.push(tf(a + 2, v)); R.push(tf(b - 2, v)); }
  OPEN = [...L, ...R.reverse()];
}
function blackCard(im, [x0, y0, x1, y1]) {
  const c = mk(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#16141d'; g.fillRect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12);
  g.fillStyle = 'rgba(90,86,120,.35)'; g.fillRect(x0 + 6, y0 + 6, x1 - x0 - 12, (y1 - y0) * .22); return c;
}

// ------------------------------------------------------------------ the card stunt: 17 x 7 cards, three numbers
const DIG = { 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], 2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], 8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'] };
const on = (num, r, c) => { if (!num) return false; const s = String(num), d = Math.floor(c / 6), k = c % 6; return k < 5 && d < 3 && DIG[s[d]][r][k] === '1'; };
const PX = 44, PYY = 38, GX0 = 540 - 17 * 44 / 2, GY0 = 690, CARDW = PX - 2, CARDH = PYY - 2;
const BOX1 = [47, 17, 310, 242], BOX2 = [82, 19, 318, 247];
let FORM, EX2, EX3;
function bakeCrowd() {
  FORM = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 17; c++) FORM.push({ r, c, v: hs(r * 31 + c * 7) < .65 ? 1 : 2, id: r * 17 + c, d: hs(r * 13.1 + c * 3.7) });
  // extras for the second "more": the boards below and around the stunt; the third: everywhere (arch, pillars, apron, desk)
  EX2 = []; for (let i = 0; i < 150; i++) { const u = hs(i * 1.71 + 2), v = hs(i * 2.33 + 5); EX2.push({ X: 70 + u * 940, Y: 1090 + v * 200, h: 120 + 40 * v, p: Math.floor(hs(i * .77) * 4), d: hs(i * 9.1), side: u < .5 ? -1 : 1, id: i }); }
  EX3 = [];
  const add = (n, x0, y0, x1, y1, h0, h1, z, seed) => { for (let i = 0; i < n; i++) { const u = hs(i * 1.37 + seed), v = hs(i * 3.11 + seed * 2); EX3.push({ X: mix(x0, x1, u), Y: mix(y0, y1, v), h: mix(h0, h1, v), p: Math.floor(hs(i * .91 + seed) * 4), d: hs(i * 5.3 + seed), z, id: 1000 + EX3.length }); } };
  add(70, -150, -120, 1230, -60, 70, 80, 995, 1);     // on the crown
  add(60, -230, 200, 150, 1600, 70, 90, 995, 2);      // left pillar
  add(60, 930, 200, 1310, 1600, 70, 90, 995, 3);      // right pillar
  add(90, -200, 1700, 1280, 1780, 80, 95, 990, 4);    // the apron
  add(110, -400, 1980, 1480, 2160, 95, 120, 960, 5);  // the desk in front
}
function numAt(t, r, c, d) {    // which number a card shows, and its flip phase (0..1 while turning)
  const waves = [[C.wave1, 918], [C.wave2, 932], [C.wave3, 933]];
  let cur = 0, k = 1;
  for (const [tw, n] of waves) { const t0 = tw + c * .028 + r * .035 + d * .03; if (t >= t0) { const kk = cl((t - t0) / .24); if (kk < 1) return { prev: cur, next: n, k: kk }; cur = n; } }
  return { prev: cur, next: cur, k };
}
function card(x, X, Y, w, h, black, sq, lift = 0) {
  x.save(); x.translate(X + w / 2, Y + h / 2 - lift); x.scale(Math.max(.04, sq), 1);
  x.fillStyle = black ? '#c3261c' : '#efe8dc'; x.fillRect(-w / 2, -h / 2, w, h);
  x.fillStyle = black ? 'rgba(255,170,150,.28)' : 'rgba(255,255,255,.55)'; x.fillRect(-w / 2, -h / 2, w, h * .26);
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(-w / 2, h / 2 - 2, w, 2);
  x.restore();
}
// walking in from a wing: position along the walk, with a step bob
function walkIn(t, t0, dur, X0, X1) { const k = eo(seg(t, t0, t0 + dur)); const X = mix(X0, X1, k), bob = k < 1 ? Math.abs(Math.sin((X - X0) / 38)) * 9 * (1 - k * .6) : 0; return { X, bob, k }; }
function stunt(K, t) {
  addD(K, Z.risers, (x) => { x.save(); clipOpen(x); pic(x, A.risers, 540, 1170, 1000, { ay: 1 }); x.restore(); });   // part of the set from frame 0
  const show = t >= C.march1 && t < C.endHoist + .5; if (!show) return;
  addD(K, Z.rows, (x) => {
    x.save(); clipOpen(x);
    for (const f of FORM) {
      const im = f.v === 1 ? A.felt_ant_crowd_1 : A.felt_ant_crowd_2, box = f.v === 1 ? BOX1 : BOX2, sc = (CARDW + 2) / (box[2] - box[0]);
      const sx = GX0 + f.c * PX, sy = GY0 + f.r * PYY, from = f.c < 8.5 ? -260 - f.d * 200 : 1340 + f.d * 200;
      const w = walkIn(t, C.march1 + f.r * .07 + f.d * .35, .85, from, sx);
      const br = breathe(t, f.d, .01), h = im.height * sc, ww = im.width * sc;
      const s = smallOf(im, h, 'f' + f.v);
      x.save(); x.translate(w.X - box[0] * sc, sy - box[1] * sc - w.bob); x.translate(ww / 2, h); x.scale(1, br); x.translate(-ww / 2, -h); x.drawImage(s, 0, 0, ww, h); x.restore();
      const n = numAt(t, f.r, f.c, f.d), face = n.k < .5 ? n.prev : n.next, sq = Math.abs(Math.cos(Math.PI * n.k));
      card(x, w.X, sy - w.bob - (br - 1) * 30, CARDW, CARDH, on(face, f.r, f.c), sq, n.k > 0 && n.k < 1 ? Math.sin(Math.PI * n.k) * 6 : 0);
    }
    x.restore();
  });
  // the second wave of ants: the boards below the stunt fill up from both wings
  if (t >= C.march2) addD(K, Z.floor, (x) => { x.save(); clipOpen(x); crowd(x, t, EX2, C.march2, true); x.restore(); });
  // the third: everywhere, dropping in from the fly loft
  if (t >= C.march3) for (const z of [995, 990, 960]) addD(K, z, (x) => crowd(x, t, EX3.filter((e) => e.z === z), C.march3, false));
}
const POSE = () => [A.felt_ant_crowd_1, A.felt_ant_crowd_2, A.felt_ant_crowd_4, A.felt_ant_crowd_3];
function crowd(x, t, list, t0, walk) {
  const poses = POSE(); const sorted = list; // drawn far rows first (smaller Y first)
  for (const e of sorted) {
    const im = poses[e.p], h = e.h, w = h * im.width / im.height, s = smallOf(im, h, 'p' + e.p);
    let X = e.X, Y = e.Y, a = 1;
    if (walk) { const wk = walkIn(t, t0 + e.d * .6, .8, e.X + (e.X < 540 ? -700 : 700), e.X); X = wk.X; Y -= wk.bob; }
    else { const k = settle((t - t0 - e.d * .55) * 1.4); if (t < t0 + e.d * .55) continue; Y = mix(e.Y - 900, e.Y, Math.min(1.04, k)); a = cl((t - t0 - e.d * .55) * 6); }
    const br = breathe(t, e.d, .012);
    x.save(); x.globalAlpha = a; x.translate(X, Y); x.scale(1, br); x.drawImage(s, -w / 2, -h, w, h); x.restore();
  }
}

// ------------------------------------------------------------------ the hero ant (B0), back on the poster in B2
const FLIPS = (() => { const out = []; let tt = 2.8, gap = .26; while (tt < 4.2) { out.push([tt, Math.min(.22, gap * .8)]); tt += gap; gap = Math.max(.07, gap * .8); } return out; })();
function heroCard(t) { // black?, squash
  let black = false, sq = 1;
  for (let i = 0; i < FLIPS.length; i++) { const [t0, d] = FLIPS[i]; if (t >= t0 + d) black = !black; else if (t >= t0) { const k = (t - t0) / d; sq = Math.abs(Math.cos(Math.PI * k)); if (k >= .5) black = !black; break; } }
  return { black, sq };
}
function hero(K, t) {
  if (t >= C.march1 + 1.1) return;
  addD(K, Z.floor, (x) => {
    x.save(); clipOpen(x);
    const h = 380, im = A.felt_ant_card, ww = h * im.width / im.height, cb = 433 / im.height * h;
    let X = 540, Yf = 1250, rot = 0, sy = breathe(t, .3, .014);
    if (t >= C.slump) { const k = eo(seg(t, C.slump, C.slump + .3)); rot = -.05 * k; sy *= 1 - .035 * k; }
    if (t >= C.heroAside) { const w = walkIn(t, C.heroAside, 1.0, 540, -260); X = w.X; Yf -= w.bob; rot = -.05 + .03 * Math.sin(t * 9); }
    const { black, sq } = heroCard(t), src = black ? A.antBlack : im;
    // the spotlight pool and the contact shadow
    x.save(); x.globalAlpha = .55; x.fillStyle = '#0b0607'; x.filter = 'blur(10px)'; x.beginPath(); x.ellipse(X + 10, Yf - 2, ww * .45, 16, 0, 0, TAU); x.fill(); x.restore();
    x.translate(X, Yf); x.rotate(rot); x.scale(1, sy);
    x.drawImage(im, 0, 433, im.width, im.height - 433, -ww / 2, -h + cb, ww, h - cb);
    x.save(); x.translate(0, -h + cb * .5); x.scale(1, Math.max(.05, sq)); x.drawImage(src, 0, 0, im.width, 433, -ww / 2, -cb * .5, ww, cb); x.restore();
    x.restore();
  });
}

// ------------------------------------------------------------------ the judges
function paddles(K, t) {
  if (t < C.pad1 || t >= C.endHoist + .5) return;
  addD(K, Z.pit, (x) => { x.save(); clipOpen(x);
    [300, 540, 780].forEach((X, i) => {
      const up = settle((t - C.pad1 - i * .08) * 1.6), Y = mix(1860, 1160, Math.min(1.02, up));
      const nod = t >= C.pad2 && t < C.pad2 + .6 ? Math.sin((t - C.pad2) * 16) * Math.exp(-(t - C.pad2) * 5) * 10 : 0;
      const fk = seg(t, C.pad3 + i * .07, C.pad3 + i * .07 + .3), sq = Math.abs(Math.cos(Math.PI * fk)), v = fk < .5 ? '0' : '100';
      paddle(x, X, Y + nod, 150, v, sq, Math.sin(t * 1.3 + i) * .015);
    });
    x.restore(); });
}
function paddle(x, X, Y, d, v, sq, rot) {
  const im = A.judge_paddle, s = d / 566;
  x.save(); x.translate(X, Y); x.rotate(rot);
  // the stick runs on down behind the footlights: held up from the pit
  x.fillStyle = '#cdb185'; x.fillRect(-5, d * .4, 10, 900); x.fillStyle = 'rgba(90,64,32,.45)'; x.fillRect(1, d * .4, 4, 900);
  x.scale(Math.max(.05, sq), 1);
  x.drawImage(im, -318 * s, -318 * s, im.width * s, im.height * s);
  const f = fitPx(x, v, 900, d * .5, 'Fraunces', d * .76); text(x, v, 0, f * .36, 900, f, 'Fraunces', { fill: '#1d1b28' }); x.restore();
}
function confetti(K, t) {
  if (t < C.pad3 || t > C.pad3 + 3) return;
  addD(K, 1030, (x) => { for (let i = 0; i < 220; i++) { const u = t - C.pad3 - hs(i * 1.3) * .6; if (u < 0) continue;
    const X = -300 + hs(i * 2.9) * 1680 + Math.sin(u * 2.6 + i) * 30, Y = -500 + u * (420 + hs(i * 4.1) * 260) + hs(i * 7.7) * 200;
    x.save(); x.translate(X, Y); x.rotate(u * (2 + hs(i) * 4) + i); x.scale(1, Math.cos(u * (5 + hs(i * 3) * 6) + i));
    x.fillStyle = ['#f24cb7', '#ffd23f', '#3a92c5'][i % 3]; x.fillRect(-9, -5, 18, 10); x.restore(); } });
}

// ------------------------------------------------------------------ flown prints
function hangCard(K, z, im, X, Ytop, w, t, o = {}) {
  addD(K, z, (x) => {
    const h = w * im.h / im.w, rot = (o.rot ?? 0) + Math.sin(t * .8 + (o.ph ?? 0)) * .004;
    x.save(); x.strokeStyle = 'rgba(232,222,204,.6)'; x.lineWidth = 2; for (const s of [-.38, .38]) { x.beginPath(); x.moveTo(X + s * w, Ytop + 4); x.lineTo(X + s * w * .98, Ytop - 2400); x.stroke(); } x.restore();
    x.save(); x.translate(X, Ytop); x.rotate(rot);
    x.save(); x.globalAlpha = .5; x.fillStyle = '#0b0607'; x.filter = 'blur(14px)'; x.fillRect(-w / 2 + 14, 22, w, h); x.restore();
    x.fillStyle = '#cfc6b6'; x.fillRect(-w / 2 + 3, 4, w, h);
    if (o.draw) o.draw(x, w, h); else x.drawImage(im, -w / 2, 0, w, h);
    for (const s of [-.3, .3]) { x.fillStyle = '#b48a55'; x.fillRect(s * w - 8, -14, 16, 36); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(s * w - 8, 16, 16, 5); }
    x.restore();
  });
}
function flown(K, t) {
  // the title card: frame 0; hoisted at titleUp with a little swing
  if (t < C.titleUp + 1) { const up = ei(seg(t, C.titleUp, C.titleUp + .8)); hangCard(K, Z.fly, P.title, 540, mix(380, -900, up), 860, t, { rot: swing(t - C.titleUp, .03) }); }
  // the sum on the backdrop (seen when the title goes up)
  if (t < C.march1 + 1.5) addD(K, Z.back - 8, (x) => { x.save(); clipOpen(x); pic(x, P.sum, 540, 500, 560, { ay: .5, shadow: .45 }); x.restore(); });
  // Anderson
  if (t >= C.anderson && t < C.curve + .6) { const k = t < C.curve ? settle((t - C.anderson) * 1.2) : 1 - ei(seg(t, C.curve, C.curve + .55));
    hangCard(K, Z.fly, P.anderson, 540, mix(-900, 330, k), 860, t, { rot: swing(t - C.anderson, .05), ph: 1 }); }
  // the curve poster: drops in; the data draws itself with the voice; hoisted at the end
  if (t >= C.curve) {
    let y = mix(-1100, 262, settle((t - C.curve) * 1.15)); if (t >= C.endHoist) y = mix(262, -1300, ei(seg(t, C.endHoist, C.endHoist + .6)));
    hangCard(K, Z.poster, P.curveFull, 540, y, 940, t, { rot: swing(t - C.curve, .04), ph: 2, draw: (x, w, h) => curveDraw(x, t, w, h) });
  }
  // the end card
  if (t >= C.logo) hangCard(K, Z.fly, P.endCard, 540, mix(-900, 520, settle((t - C.logo) * 1.3)), 860, t, { rot: swing(t - C.logo, .035), ph: 3, draw: (x, w, h) => endDraw(x, t, w, h) });
}
function curveU(t) {    // how much of the curve is drawn
  if (t < C.curve + .6) return 0;
  if (t < C.flatEnd) return .6 * sst(seg(t, C.curve + .6, C.flatEnd));
  return .6 + .4 * sst(seg(t, C.flatEnd, C.jumpEnd));
}
function curveDraw(x, t, w, h) {
  const s = w / 780, u = curveU(t), xr = CG.X(u) * s;
  x.drawImage(P.curveBase, -w / 2, 0, w, h);
  if (u > 0) { x.save(); x.beginPath(); x.rect(-w / 2, 0, xr + 6 * s, h); x.clip(); x.drawImage(P.curveFull, -w / 2, 0, w, h); x.restore(); }
  const at = (uu, v) => [-w / 2 + CG.X(uu) * s, CG.V(v) * s];
  // the pen dot riding the curve's tip
  if (u > 0 && u < 1) { const [px, py] = at(u, cf(u)); x.save(); x.fillStyle = 'rgba(32,56,146,.95)'; x.beginPath(); x.arc(px, py, 10, 0, TAU); x.fill(); x.restore(); }
  // 13B pops
  if (t >= C.label13) { const k = settle((t - C.label13) * 1.6), [kx, ky] = at(.72, .09); x.save(); x.translate(kx - 24, ky - 30); x.scale(k, k); x.globalCompositeOperation = 'multiply';
    text(x, T.curve.k, 3, 3, 900, 60, 'Fraunces', { fill: 'rgb(240,76,183)', align: 'right' }); text(x, T.curve.k, 0, 0, 900, 60, 'Fraunces', { fill: 'rgb(32,56,146)', align: 'right' }); x.restore(); }
  // red pen: x100 between the ticks of the log axis, the footnote by the flat run
  [0, 1, 2].forEach((i) => { const tt = C.x100 + i * .25; if (t < tt) return; const [px, py] = at((i + .5) / 4, 0); hand(x, '×100', px, py - 46, 46, seg(t, tt, tt + .3)); });
  if (t >= C.footnote) { const [px, py] = at(.45, .33); hand(x, T.antFoot, px, py, 36, seg(t, C.footnote, C.footnote + .8), 540); }
  // the hero ant climbs up the poster to the knee and sits there
  if (t >= C.antClimb) {
    const [kx, ky] = at(.72, .09);
    if (t < C.antSit) { const k = sst(seg(t, C.antClimb, C.antSit)), X = kx + 6, Y = mix(h + 160, ky + 10, k), bob = Math.sin(k * 40) * 4;
      pic(x, A.felt_ant_climb, X + bob, Y, 150 * A.felt_ant_climb.width / A.felt_ant_climb.height, { ay: .55, shadow: .35 }); }
    else { const sit = settle((t - C.antSit) * 2), br = breathe(t, .7, .015);
      pic(x, A.felt_ant_sit, kx + 4, ky + 14, 140 * A.felt_ant_sit.width / A.felt_ant_sit.height, { ay: 1, sy: br * mix(.9, 1, sit), shadow: .35 }); }
  }
}
function hand(x, s, X, Y, px, k, maxW = 600) {
  if (k <= 0) return; x.save(); px = fitPx(x, s, HANDW, px, HAND, maxW); font(x, HANDW, px, HAND); const w = x.measureText(s).width;
  x.beginPath(); x.rect(X - w / 2 - 6, Y - px * 1.2, (w + 12) * eo(k), px * 1.7); x.clip(); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#c42a1f'; x.textAlign = 'center'; x.fillText(s, X, Y); x.restore();
}
function endDraw(x, t, w, h) {
  const s = w / 600; x.drawImage(P.endCard, -w / 2, 0, w, h);
  // the logo, printed over the paper: the three rings pop in one after another, then the word
  const L = A.logo, lw = 520 * s, lh = lw * L.height / L.width, lx = -lw / 2, ly = 24 * s, k0 = t - C.logo - .25;
  const parts = [[0, 230, 410, 640], [370, 0, 790, 420], [760, 230, 1168, 640], [330, 600, 860, 720]];
  x.save(); x.globalCompositeOperation = 'multiply';
  parts.forEach(([u0, v0, u1, v1], i) => { const k = settle((k0 - i * .12) * 2.2); if (k <= 0) return;
    const cx = lx + (u0 + u1) / 2 / L.width * lw, cy = ly + (v0 + v1) / 2 / L.height * lh, pw = (u1 - u0) / L.width * lw, ph = (v1 - v0) / L.height * lh;
    x.save(); x.translate(cx, cy); x.scale(k, k); x.drawImage(L, u0, v0, u1 - u0, v1 - v0, -pw / 2, -ph / 2, pw, ph); x.restore(); });
  x.restore();
}

// ------------------------------------------------------------------ set: desk, interior, curtain, front
function desk(K, t) { addD(K, Z.desk, (x) => { const w = 2300, h = w * A.desk.height / A.desk.width; x.drawImage(A.desk, 540 - w / 2 - 120, 960 - h / 2 - 260, w, h); }); }
function interior(K) { addD(K, Z.back, (x) => { x.save(); clipOpen(x, 40); x.drawImage(A.inside, -40, 0, 1160, 1160 * A.inside.height / A.inside.width); x.restore(); }); }
function curtain(K, t) {
  if (t < C.curtain) return; const k = sst(seg(t, C.curtain, C.curtainClosed));
  addD(K, Z.curtain, (x) => { x.save(); clipOpen(x, 10);
    const w = 1180, h = w * A.curtain_closed.height / A.curtain_closed.width, y = mix(320 - h, 300, k);
    // the hem ripples as it falls and settles
    const strips = 24; for (let i = 0; i < strips; i++) { const sx = i / strips, dy = Math.sin(sx * 9 + t * 7) * 18 * (1 - k) + swing(t - C.curtainClosed, 10) * Math.sin(sx * 6);
      x.drawImage(A.curtain_closed, sx * A.curtain_closed.width, 0, A.curtain_closed.width / strips + 1, A.curtain_closed.height, 540 - w / 2 + sx * w, y + dy, w / strips + 1, h); }
    x.restore(); });
}
function front(K) { addD(K, Z.front, (x) => { x.save(); x.fillStyle = 'rgba(6,3,4,.8)'; x.filter = 'blur(26px)'; x.beginPath(); x.ellipse(540, 1990, 860, 50, 0, 0, TAU); x.fill(); x.restore(); x.drawImage(A.theatre_front, TF.x, TF.y, TF.w, TF.h); }); }

// ------------------------------------------------------------------ camera and light
const CAM = () => [
  [0, [540, 900, 1.0]], [4.45, [540, 900, 1.035]], [C.march1 + 1.1, [540, 880, .9]], [C.march2, [540, 880, .905]], [C.march2 + .95, [540, 880, .76]],
  [C.march3, [540, 870, .765]], [C.march3 + 1.0, [540, 860, .58]], [C.anderson - .05, [540, 860, .585]], [C.anderson + 1.0, [540, 640, 1.04]],
  [C.curve - .05, [540, 650, 1.05]], [C.curve + .7, [540, 790, 1.0]], [C.drift, [540, 790, 1.035]], [C.drift + .9, [450, 760, 1.07]],
  [C.endHoist, [450, 760, 1.08]], [C.endHoist + .7, [540, 900, 1.0]], [DUR, [540, 900, 1.03]],
];
function camera(K, t) {
  const keys = CAM(); let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const k = eio(seg(t, a[0], b[0])), fx = mix(a[1][0], b[1][0], k), fy = mix(a[1][1], b[1][1], k), zm = mix(a[1][2], b[1][2], k);
  K.cam.z = 1000 * (1 - 1 / zm); K.cam.x = fx - 540; K.cam.y = fy - 960;
  let fz = 1080; if (t >= C.anderson + .3) fz = Z.fly; if (t >= C.march1 - .2 && t < C.anderson + .3) fz = mix(1080, 1090, 1);
  K.focus(fz, 30, 18);
}
function lights(K, t) {
  K.ambient(96, 90, 102); K.flicker(0); K.vignette(.38); K.grain(.045); K.haze(.04);
  lightD(K, 540, 960, Z.desk, 3600, [150, 146, 150], 1, { zmin: 2000, soft: 1 });
  lightD(K, 380, 700, 1000, 1500, [150, 124, 96], 1, { zmin: 980, zmax: 1009, soft: 1 });
  lightD(K, 540, 700, Z.back, 900, [46, 60, 116], 1, { zmin: 1120, soft: 1 });
  // the amber spot inside: on the hero, then wide on the stunt
  const wide = sst(seg(t, C.march1, C.march1 + 1)), sx = 540, sy = mix(1080, 820, wide), sr = mix(300, 760, wide);
  lightD(K, sx, sy, 1080, sr, [180, 136, 92], 1, { zmin: 1010, zmax: 1300, soft: .7, ry: sr * 1.2 });
  lightD(K, 540, 1100, 1080, 900, [70, 62, 60], 1, { zmin: 1010, zmax: 1300, soft: 1 });
  // the flown pieces and everything in front: a warm key from the upper left
  lightD(K, 380, 640, 970, 1200, [160, 140, 112], 1, { zmin: 900, zmax: 999, soft: 1 });
  lightD(K, 700, 1100, 970, 900, [56, 50, 56], 1, { zmin: 900, zmax: 999, soft: 1 });
  const beamA = (1 - wide) * (t < C.march1 + 1 ? 1 : 0) + (t >= C.logo ? sst(seg(t, C.logo, C.logo + .4)) : 0);
  if (beamA > .02) K.beam({ src: { x: -700, y: -1100, z: 1060 }, x: t >= C.logo ? 0 : 0, y: t >= C.logo ? -40 : 260, z: 1060, rx: 260, c: [255, 210, 165], a: .2 * beamA,
    dust: 80, dustA: .9, dustSize: 1.4, u0: .3, w0: 30, soft: 14, fade: .9 });
}

// ------------------------------------------------------------------ captions (screen space)
function captionAt(t) {
  if (!VO) return null;
  for (const id of TL.vo.map((v) => v.id)) { const r = VO[id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    const parts = (T.cap[id] || '').split('|'), lens = parts.map((p) => p.replace(/\//g, '').length), tot = lens.reduce((a, b) => a + b, 0);
    let acc = r.t; for (let i = 0; i < parts.length; i++) { const d = r.dur * lens[i] / tot; if (t < acc + d + (i === parts.length - 1 ? .25 : 0)) return parts[i]; acc += d; } }
  return null;
}
function captions(g, t) {
  const s = captionAt(t); if (!s) return;
  const rows = s.split('/'), px = ZH ? 56 : 54, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.24;
  g.save(); font(g, wt, px, fam); g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.min(780, Math.max(...rows.map((r) => g.measureText(r).width))), cy = 1376 - (rows.length - 1) * lh / 2;
  g.fillStyle = 'rgba(12,8,10,.55)'; g.beginPath(); g.roundRect(540 - wmax / 2 - 26, cy - lh / 2 - 12, wmax + 52, rows.length * lh + 24, 20); g.fill();
  rows.forEach((r, i) => { const f = Math.min(px, fitPx(g, r, wt, px, fam, 780)); font(g, wt, f, fam); g.fillStyle = '#fbf7ef'; g.fillText(r, 540, cy + i * lh + 2); });
  g.restore();
}
function guides(g) {
  g.save(); g.lineWidth = 3; g.font = '600 22px Inter';
  const box = (x, y, w, h, c, l) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); g.setLineDash([]); g.fillStyle = c; g.fillText(l, x + 8, y + 26); };
  box(0, 0, W, 260, '#ff4d6d', 'UI'); box(0, 1480, W, 440, '#ff4d6d', 'UI'); box(880, 700, 200, 780, '#ff4d6d', 'buttons'); box(120, 1200, 760, 240, '#ffd24d', 'captions'); g.restore();
}

defineScene({
  meta: { title: 'L01-1 style cut v2', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 7,
    background: '#07050a', fonts: ['Fraunces', 'Inter', 'JetBrains Mono', 'Caveat', 'Instrument Serif'], poster: 0 },
  setup,
  layers: [{ name: 'film', type: '2d', draw(ctx, g) {
    const t = ctx.sec, K = ST.frame(t);
    camera(K, t); lights(K, t);
    desk(K, t); interior(K); stunt(K, t); hero(K, t); confetti(K, t); paddles(K, t); curtain(K, t); front(K); flown(K, t);
    ST.render(K, g);
  } }],
  post(ctx, g) { if (CAPS && ctx.sec < C.endHoist) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
