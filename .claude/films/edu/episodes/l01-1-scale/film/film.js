// L01-1 "One Ant Can't Add" / 《一只蚂蚁不会算数》 - the whole film (80 s, 1080x1920, 30 fps) as one pv scene.
// A toy paper theatre on the lab's night desk. Painted felt puppets and set pieces (art/cut, keyed from Codex images)
// are flat planes seen through kit2d's stage camera (depth of field by plane, a multiply light map per plane, beams with
// dust); every piece of information is a risograph print (kit2d riso press); the cat's notes and red pen are drawn live.
// Every frame is a pure function of t. Cues: timeline.json (shared with mix.py). Words: strings.js (?lang=en|zh).
//
// Coordinates: design px of the 1080x1920 frame. addD(K, z, fn) draws fn in design px on the plane at depth z, so at
// the rest camera every plane lines up with the layout below; camera moves give real parallax between planes.
import { defineScene } from '/pv/runtime/pv.js';
import { makeStage, makePress, tone, ramp, brushLine, loadImg, mk, cl, mix, eo, eio, ei, hs, step, twos, TAU } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const GUIDES = Q.get('guides') === '1', CAPS = Q.get('cap') !== '0';
const W = 1080, H = 1920, FPS = 30, DUR = 81.0;
const ART = '/edu/art/cut/';

// fonts
const SERIF = ZH ? '"Noto Serif SC", Fraunces' : 'Fraunces', SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter', MONO = ZH ? '"Noto Sans SC", "JetBrains Mono"' : '"JetBrains Mono"';
const HAND = ZH ? '"ZCOOL KuaiLe", Caveat' : 'Caveat', HANDW = ZH ? 400 : 700, DISP = ZH ? '"Noto Serif SC", Fraunces' : '"Instrument Serif"';
const SERIFW = ZH ? 900 : 900, SANSW = ZH ? 700 : 700;

let TL, C, VO, ST;
const A = {}, SH = {}, P = {}, SM = {};
let OPEN, OPENP;

// ------------------------------------------------------------------------------------------------ time helpers
const seg = (t, a, b) => cl((t - a) / (b - a));
const after = (t, a) => t >= a;
const tw = (t) => twos(t, 15);                      // puppets move on twos
const sst = (k) => k * k * (3 - 2 * k);
const back = (k) => { k = cl(k); const s = 1.4; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
const settle = (x) => (x <= 0 ? 0 : 1 - Math.exp(-6 * x) * Math.cos(11 * x));   // a flown piece lands with a small bob
const jit = (id, t, a = 1) => { const s = step(t, 15); return { dx: (hs(s * 3.1 + id * 7.7) - .5) * 1.2 * a, dy: (hs(s * 5.3 + id * 3.3) - .5) * 1.0 * a, r: (hs(s * 2.9 + id * 1.9) - .5) * .008 * a }; };

// ------------------------------------------------------------------------------------------------ layout
// the painted theatre front (art/cut/theatre_front.png, 1024 x 1386) at 0.86, centred, top at y 210
const TF = { x: 540 - 1024 * .86 / 2, y: 210, s: .86, w: 1024 * .86, h: 1386 * .86 };
const tf = (u, v) => [TF.x + u * TF.s, TF.y + v * TF.s];
const FLOOR = 1002, APRON = 1240;                       // backdrop / boards line, stage front edge
const Z = { desk: 3000, back: 1150, rows: 1100, floor: 1070, inner: 1030, curtain: 1003, pit: 1004, front: 1000, notes: 997,
  fly: 982, cat: 965, pen: 960 };

function addD(K, z, fn, o) {
  K.add(z, (x, info) => { x.save(); x.scale(z / 1000, z / 1000); x.translate(-540, -960); fn(x, info); x.restore(); }, o);
}
function lightD(K, X, Y, z, r, c, a = 1, o = {}) {
  K.light(Object.assign({ x: (X - 540) * z / 1000, y: (Y - 960) * z / 1000, z, rx: r * z / 1000, ry: (o.ry ?? r) * z / 1000, c, a, soft: o.soft ?? .8 }, o, { ry: (o.ry ?? r) * z / 1000 }));
}
const clipOpen = (x, grow = 0) => { x.beginPath(); OPEN.forEach(([a, b], i) => { const gx = a + (a < 540 ? -grow : grow); i ? x.lineTo(gx, b) : x.moveTo(gx, b); }); x.closePath(); x.clip(); };

// draw an image by an anchor (ax, ay in 0..1 of the image), width w in design px
function pic(x, im, X, Y, w, o = {}) {
  if (!im) return;
  const h = w * im.height / im.width, ax = o.ax ?? .5, ay = o.ay ?? 1;
  x.save(); x.translate(X, Y); if (o.rot) x.rotate(o.rot); if (o.flip) x.scale(-1, 1); if (o.sy) x.scale(1, o.sy);
  if (o.shadow) { const s = SH[im.src] || shadowOf(im); x.globalAlpha = (o.alpha ?? 1) * o.shadow; x.drawImage(s, -ax * w + (o.so ?? 6), -ay * h + (o.so ?? 6) * 1.4, w, h); }
  x.globalAlpha = o.alpha ?? 1; x.drawImage(im, -ax * w, -ay * h, w, h); x.restore();
}
function shadowOf(im) {
  const c = mk(im.width / 3, im.height / 3), g = c.getContext('2d');
  g.filter = 'blur(6px)'; g.drawImage(im, 0, 0, c.width, c.height); g.filter = 'none';
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#0b0607'; g.fillRect(0, 0, c.width, c.height);
  SH[im.src] = c; return c;
}
function smallOf(im, h, key) {      // a pre-scaled copy for crowds (fast and clean at 30-90 px)
  const k = key || im.src + '@' + h; if (SM[k]) return SM[k];
  const w = Math.round(h * im.width / im.height), c = mk(w * 2, h * 2), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); SM[k] = c; return c;
}

// ------------------------------------------------------------------------------------------------ text helpers
function font(g, w, px, fam) { g.font = `${w} ${px}px ${fam}`; }
function fitPx(g, s, w, px, fam, maxW) { font(g, w, px, fam); const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function text(g, s, X, Y, w, px, fam, o = {}) {
  g.save(); font(g, w, px, fam); g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'alphabetic';
  if (o.fill) g.fillStyle = o.fill; g.fillText(s, X, Y); g.restore();
}

// ------------------------------------------------------------------------------------------------ riso prints
function riso(key, w, h, inks, draw, k = 1.6) {
  const press = makePress({ W: w * k, H: h * k, k, unit: k * .85, seed: key, inks });
  press.begin(); draw(press, w, h);
  const c = press.print({ key }), out = mk(c.width, c.height);
  out.getContext('2d').drawImage(c, 0, 0); out.w = w; out.h = h; return out;
}
// a title in two hits: pink just off register, then the key ink
function hit2(press, s, X, Y, w, px, fam, key = 'navy', o = {}) {
  text(press.plate('pink'), s, X + 3, Y + 3, w, px, fam, Object.assign({ fill: '#000' }, o));
  text(press.plate(key), s, X, Y, w, px, fam, Object.assign({ fill: '#000' }, o));
}

function bakePrints() {
  const N = (p) => p.plate('navy'), Y = (p) => p.plate('yellow'), PK = (p) => p.plate('pink'), B = (p) => p.plate('blue');
  const fill = (g, a = 1) => { g.fillStyle = tone(a); };
  // the course strip over the arch
  P.strip = riso('strip' + LANG, 840, 62, ['yellow', 'navy'], (p, w, h) => {
    fill(Y(p), .55); Y(p).fillRect(0, 0, w, h);
    const px = fitPx(N(p), T.strip, 700, 38, MONO, w - 40); text(N(p), T.strip, w / 2, h / 2 + px * .36, 700, px, MONO, { fill: '#000' });
  });
  // the title card
  P.title = riso('title' + LANG, 560, 290, ['yellow', 'pink', 'blue', 'navy'], (p, w, h) => {
    const ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .06, .2); ps.fillRect(0, 0, w, h);
    const px = ZH ? 108 : 118, fam = ZH ? DISP : DISP, wt = ZH ? 900 : 400;
    const f1 = fitPx(N(p), T.title[0], wt, px, fam, w - 60), f2 = fitPx(N(p), T.title[1], wt, px, fam, w - 60), f = Math.min(f1, f2);
    hit2(p, T.title[0], w / 2, h * .43, wt, f, fam, 'blue'); hit2(p, T.title[1], w / 2, h * .43 + f * .98, wt, f, fam, 'blue');
  });
  P.sum = riso('sum', 430, 104, ['yellow', 'navy'], (p, w, h) => {
    fill(Y(p), 1); Y(p).fillRect(0, 0, w, h); text(N(p), T.sum, w / 2, h * .72, 900, 70, 'Fraunces', { fill: '#000' });
  });
  // Anderson poster
  P.anderson = riso('anderson' + LANG, 560, 330, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .12, .3); ps.fillRect(0, 0, w, h);
    fill(Y(p), 1); Y(p).fillRect(18, 18, w - 36, h - 36);
    if (ZH) { hit2(p, T.anderson.t[0], w / 2, 150, 900, 104, SERIF); text(N(p), T.anderson.sub, w / 2, 202, 700, 40, 'Fraunces', { fill: '#000' }); }
    else { const f = fitPx(N(p), T.anderson.t[1], 900, 104, 'Fraunces', w - 70); hit2(p, T.anderson.t[0], w / 2, 40 + f * .95, 900, f, 'Fraunces'); hit2(p, T.anderson.t[1], w / 2, 40 + f * 1.9, 900, f, 'Fraunces'); }
    const pf = fitPx(N(p), T.anderson.by, 700, 34, SANS, w - 60); text(N(p), T.anderson.by, w / 2, h - 66, 700, pf, SANS, { fill: '#000' });
    const nf = fitPx(N(p), T.anderson.note, 500, 24, SANS, w - 60); text(N(p), T.anderson.note, w / 2, h - 32, 500, nf, SANS, { fill: '#000' });
  });
  // the curve poster: the shape of Wei et al. 2022 Fig. 2A (GPT-3, modified arithmetic), schematic
  P.curve = riso('curve' + LANG, 780, 800, ['yellow', 'pink', 'blue', 'navy'], (p, w, h) => {
    const ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .05, .14); ps.fillRect(0, 0, w, h);
    const tf_ = fitPx(N(p), T.curve.t, 900, 58, ZH ? SERIF : 'Fraunces', w - 80); hit2(p, T.curve.t, w / 2, 86, 900, tf_, ZH ? SERIF : 'Fraunces');
    text(N(p), T.curve.sub, w / 2, 134, 600, 32, SANS, { fill: '#000' });
    const x0 = 60, y0 = 170, cw = w - 120, ch = 500;
    fill(Y(p), 1); Y(p).fillRect(x0, y0, cw, ch);
    const X = (u) => x0 + 70 + u * (cw - 110), V = (v) => y0 + ch - 70 - v * (ch - 130);
    // GPT-3 family on Fig. 2A, as a shape: flat near zero, then up from the 13B point (judge's reading: 6.7B ~1%, 13B ~8%, 175B ~32%)
    const pts = [[.0, .01], [.16, .012], [.32, .015], [.48, .02], [.62, .03], [.72, .09], [.86, .2], [1.0, .38]];
    const f = (u) => { for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) { const a = pts[i - 1], b = pts[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * sst(k); } return pts[pts.length - 1][1]; };
    const sc = (v) => v / .4;
    const PS = p.plate('pink', 'screen'); PS.fillStyle = tone(.55); PS.beginPath(); PS.moveTo(X(0), V(0));
    for (let i = 0; i <= 100; i++) PS.lineTo(X(i / 100), V(sc(f(i / 100)))); PS.lineTo(X(1), V(0)); PS.closePath(); PS.fill();
    brushLine(N(p), [[X(0) - 14, V(0)], [X(1) + 18, V(0)]], 4, 'xa', { taper: .05 });
    brushLine(N(p), [[X(0), V(0) + 14], [X(0), V(1) - 18]], 4, 'ya', { taper: .05 });
    N(p).fillStyle = '#000'; N(p).beginPath(); N(p).moveTo(X(1) + 30, V(0)); N(p).lineTo(X(1) + 12, V(0) - 9); N(p).lineTo(X(1) + 12, V(0) + 9); N(p).fill();
    for (let i = 1; i <= 3; i++) { const u = i / 4; N(p).fillRect(X(u) - 2, V(0) - 2, 4, 14); }
    const line = []; for (let i = 0; i <= 80; i++) line.push([X(i / 80), V(sc(f(i / 80)))]); brushLine(N(p), line, 7, 'curve', { taper: .03 });
    for (const [u, v] of pts) { N(p).beginPath(); N(p).arc(X(u), V(sc(v)), 9, 0, TAU); N(p).fill(); }
    p.knockout((g) => { for (const [u, v] of pts) { g.beginPath(); g.arc(X(u), V(sc(v)), 4.2, 0, TAU); g.fill(); } });
    text(N(p), T.curve.k, X(.72) - 16, V(sc(.09)) - 22, 900, 46, 'Fraunces', { fill: '#000', align: 'right' });
    text(N(p), T.curve.x, X(1), V(0) + 54, 700, 34, SANS, { fill: '#000', align: 'right' });
    const g = N(p); g.save(); g.translate(X(0) - 28, V(1) + 10); g.rotate(-Math.PI / 2); text(g, T.curve.y, 0, 0, 700, 34, SANS, { fill: '#000', align: 'right' }); g.restore();
    const ff = fitPx(N(p), T.curve.foot, 500, 26, SANS, w - 80); text(N(p), T.curve.foot, w / 2, h - 20, 500, ff, SANS, { fill: '#000' });
    P.curveXY = { X: (u) => X(u), V: (v) => V(sc(v)), x0, y0, cw, ch };
  });
  // house rule
  P.rule = riso('rule' + LANG, 600, 270, ['yellow', 'pink', 'navy'], (p, w, h) => {
    fill(Y(p), 1); Y(p).fillRect(0, 0, w, h);
    const ps = p.plate('pink', 'screen'); ps.fillStyle = tone(.35); ps.fillRect(0, 0, w, 58);
    text(N(p), T.rule.h, w / 2, 44, 800, 36, SANS, { fill: '#000' });
    const f = Math.min(fitPx(N(p), T.rule.t[1], 900, 62, ZH ? SERIF : 'Fraunces', w - 50), 62);
    hit2(p, T.rule.t[0], w / 2, 58 + f * 1.05, 900, f, ZH ? SERIF : 'Fraunces'); hit2(p, T.rule.t[1], w / 2, 58 + f * 2.05, 900, f, ZH ? SERIF : 'Fraunces');
    const sf = Math.min(fitPx(N(p), T.rule.s[0], 500, 24, SANS, w - 40), 24);
    text(N(p), T.rule.s[0], w / 2, h - 40, 500, sf, SANS, { fill: '#000' }); text(N(p), T.rule.s[1], w / 2, h - 12, 500, sf, SANS, { fill: '#000' });
  });
  const tag = (key, s, w, h, ink = 'navy', bg = 'yellow', px = 34) => riso(key + LANG, w, h, [bg, ink], (p, ww, hh) => {
    fill(p.plate(bg), 1); p.plate(bg).fillRect(0, 0, ww, hh); const f = Math.min(px, fitPx(p.plate(ink), s, 800, px, SANS, ww - 24)); text(p.plate(ink), s, ww / 2, hh / 2 + f * .36, 800, f, SANS, { fill: '#000' });
  });
  P.years1 = tag('y1', T.years1, 250, 60, 'navy', 'yellow', 40);
  P.years2 = tag('y2', T.years2, 250, 60, 'navy', 'yellow', 40);
  P.tagCat = tag('tc', T.tagCat, 300, 56, 'navy', 'yellow', 32);
  P.tagJudge = tag('tj', T.tagJudge, 350, 56, 'navy', 'pink', 32);
  P.upper = tag('up', T.upper, 400, 54, 'navy', 'blue', 32);
  P.lower = tag('lo', T.lower, 400, 54, 'navy', 'yellow', 32);
  P.exam = tag('ex', T.exam, 380, 54, 'navy', 'yellow', 30);
  P.year = riso('year', 300, 190, ['yellow', 'pink', 'navy'], (p, w, h) => { fill(Y(p), 1); Y(p).fillRect(0, 0, w, h); hit2(p, T.year, w / 2, h * .72, 900, 132, 'Fraunces'); });
  P.banner = riso('banner' + LANG, 560, 120, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const ps = p.plate('pink', 'screen'); ps.fillStyle = tone(.4); ps.fillRect(0, 0, w, h);
    hit2(p, T.banner, w / 2, 62, 900, Math.min(52, fitPx(N(p), T.banner, 900, 52, ZH ? SERIF : 'Fraunces', w - 40)), ZH ? SERIF : 'Fraunces');
    const f = fitPx(N(p), T.bannerS, 500, 22, SANS, w - 30); text(N(p), T.bannerS, w / 2, h - 18, 500, f, SANS, { fill: '#000' });
  });
  // easel pages
  const page = (key, label, v, unit, ink) => riso(key + LANG, 200, 240, [...new Set(['yellow', 'pink', ink, 'navy'])], (p, w, h) => {
    text(N(p), label, w / 2, 40, 800, ZH ? 34 : 28, SANS, { fill: '#000' });
    const f = Math.min(ZH ? 56 : 74, fitPx(N(p), v, 900, 74, 'Fraunces', w - 24)); hit2(p, v, w / 2, 140, 900, f, ZH ? SERIF : 'Fraunces', 'navy');
    text(N(p), unit, w / 2, 196, 600, ZH ? 30 : 30, SANS, { fill: '#000' });
  });
  P.cast = T.castV.map((v, i) => page('c' + i, T.cast, v, T.unitC, 'pink'));
  P.reh = T.rehV.map((v, i) => page('r' + i, T.reh, v, T.unitR, 'blue'));
  P.x2 = riso('x2', 200, 240, ['yellow', 'pink', 'navy'], (p, w, h) => { hit2(p, '×2', w / 2, 160, 900, 110, 'Fraunces'); });
  // the bill board pages
  const bill = (key, a, b, c) => riso(key + LANG, 900, 400, ['yellow', 'pink', 'navy'], (p, w, h) => {
    fill(Y(p), .9); Y(p).fillRect(0, 0, w, h); const ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .1, .35); ps.fillRect(0, 0, w, h);
    const f = Math.min(110, fitPx(N(p), a, 900, 110, ZH ? SERIF : 'Fraunces', w - 70)); hit2(p, a, w / 2, b ? 168 : 250, 900, f, ZH ? SERIF : 'Fraunces');
    if (b) text(N(p), b, w / 2, 250, 700, Math.min(46, fitPx(N(p), b, 700, 46, SANS, w - 80)), SANS, { fill: '#000' });
    if (c) text(N(p), c, w / 2, h - 34, 500, Math.min(26, fitPx(N(p), c, 500, 26, SANS, w - 60)), SANS, { fill: '#000' });
  });
  P.bills = [bill('b0', T.bill0[0]), ...T.bills.map((b, i) => bill('b' + (i + 1), b[0], b[1], b[2]))];
  // motto card, wrong-reading card, programme
  P.motto = riso('motto' + LANG, 840, 400, ['yellow', 'pink', 'navy'], (p, w, h) => {
    fill(Y(p), 1); Y(p).fillRect(0, 0, w, h);
    const fam = ZH ? SERIF : 'Fraunces', f = Math.min(ZH ? 92 : 64, fitPx(N(p), T.motto.t[1], 900, 64, fam, w - 60));
    hit2(p, T.motto.t[0], w / 2, 34 + f, 900, f, fam); hit2(p, T.motto.t[1], w / 2, 34 + f * 2.15, 900, f, fam);
    text(N(p), T.motto.by, w / 2, 268, 600, Math.min(28, fitPx(N(p), T.motto.by, 600, 28, SANS, w - 60)), SANS, { fill: '#000' });
    text(N(p), T.motto.law, w / 2, 302, 600, 26, SANS, { fill: '#000' });
    N(p).fillStyle = tone(1); N(p).fillRect(40, 322, w - 80, 2);
    // where EFFICIENCY sits on the card (for the cat's red circle)
    font(N(p), 900, f, fam); const full = N(p).measureText(T.motto.t[1]).width, ew = N(p).measureText(T.motto.eff).width;
    P.mottoEff = { x: w / 2 - full / 2 + ew / 2, y: 34 + f * 2.15 - f * .36, rw: ew / 2 + 18, rh: f * .62 };
  });
  P.wrong = riso('wrong' + LANG, 680, 150, ['yellow', 'navy'], (p, w, h) => {
    text(N(p), T.wrong[0], 30, 48, 600, 32, SANS, { fill: '#000', align: 'left' });
    const f = Math.min(54, fitPx(N(p), T.wrong[1], 900, 54, ZH ? SERIF : 'Fraunces', w - 60)); text(N(p), T.wrong[1], w / 2, 118, 900, f, ZH ? SERIF : 'Fraunces', { fill: '#000' });
    P.wrongW = N(p).measureText(T.wrong[1]).width;
  });
  P.prog = riso('prog' + LANG, 400, 250, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const ps = p.plate('pink', 'screen'); ps.fillStyle = tone(.3); ps.fillRect(0, 0, w, 54);
    text(N(p), T.prog[0], w / 2, 40, 800, 30, SANS, { fill: '#000' });
    hit2(p, T.prog[1], w / 2, 118, 900, 58, 'Fraunces');
    text(N(p), T.prog[2], w / 2, 166, 700, Math.min(34, fitPx(N(p), T.prog[2], 700, 34, ZH ? SERIF : 'Fraunces', w - 30)), ZH ? SERIF : 'Fraunces', { fill: '#000' });
    text(N(p), T.prog[3], w / 2, 214, 600, Math.min(24, fitPx(N(p), T.prog[3], 600, 24, SANS, w - 30)), SANS, { fill: '#000' });
  });
}

// an ink stamp (live overprint): text in a rubber-stamp frame, eaten by grain
function inkStamp(lines, w, h, rgb, key) {
  const c = mk(w * 2, h * 2), g = c.getContext('2d'); g.scale(2, 2);
  g.strokeStyle = '#000'; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12); g.lineWidth = 2; g.strokeRect(13, 13, w - 26, h - 26);
  const f = Math.min(lines[1] ? 40 : 52, fitPx(g, lines[0], 800, 52, ZH ? SERIF : 'Fraunces', w - 50));
  text(g, lines[0], w / 2, lines[1] ? h / 2 - 4 : h / 2 + f * .36, 800, f, ZH ? SERIF : 'Fraunces', { fill: '#000' });
  if (lines[1]) text(g, lines[1], w / 2, h / 2 + 34, 600, Math.min(24, fitPx(g, lines[1], 600, 24, SANS, w - 40)), SANS, { fill: '#000' });
  // starved ink: knock out a grain of speckles and a few blotches (hashed)
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w * h / 6; i++) { const a = hs(i * 1.37 + key.length), b = hs(i * 2.71 + 5), r = hs(i * .93 + 2); g.globalAlpha = .35 + .6 * r; g.fillRect(a * c.width, b * c.height, 1 + r * 2.4, 1 + r * 2); }
  for (let i = 0; i < 9; i++) { g.globalAlpha = .45; g.beginPath(); g.ellipse(hs(i * 7.1) * c.width, hs(i * 3.3 + 1) * c.height, 10 + 30 * hs(i), 6 + 14 * hs(i + 4), hs(i + 9) * 3, 0, TAU); g.fill(); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, c.width, c.height);
  c.w = w; c.h = h; return c;
}

// ------------------------------------------------------------------------------------------------ setup
async function setup(ctx) {
  TL = await (await fetch('timeline.json')).json(); C = TL.cue;
  try { VO = await (await fetch(`vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  const names = ['theatre_front', 'curtain_closed', 'risers', 'judge_paddle', 'flip_easel', 'light_bar', 'sticky_note',
    'felt_ant_card', 'felt_ant_climb', 'felt_ant_sit', 'felt_ant_scripts', 'felt_ant_bow', 'felt_ant_crowd_1', 'felt_ant_crowd_2', 'felt_ant_crowd_3', 'felt_ant_crowd_4',
    'felt_cat_back', 'felt_cat_slap', 'felt_cat_pen', 'felt_cat_stamp', 'felt_cat_note', 'felt_cat_lookup', 'felt_cat_shock'];
  await Promise.all(names.map(async (n) => { A[n] = await loadImg(ART + n + '.png'); }));
  A.desk = await loadImg('/edu/art/src/desk_night.png'); A.pen = await loadImg('/scene/cut/prop_pen.png').catch(() => null); A.inside = await loadImg('/edu/art/src/stage_inside.png');
  if (ZH) await Promise.all([`900 80px ${SERIF}`, `700 30px ${SANS}`, `400 40px ${HAND}`].map((f) => document.fonts.load(f, '一只蚂蚁不会算数多排练')));
  else await Promise.all(['700 40px Caveat', 'italic 400 80px "Instrument Serif"', '400 80px "Instrument Serif"'].map((f) => document.fonts.load(f)));
  openingFromArt();
  bakePrints();
  P.mirage = inkStamp(T.mirage, 520, 120, '214,58,150', 'mirage');
  P.stamp = inkStamp([T.stamp], ZH ? 330 : 470, 92, '186,30,34', 'stamp');
  ST = makeStage({ W: ctx.W, H: ctx.H, S: ctx.S, OX: ctx.cfg.OX, OY: ctx.cfg.OY, DW: ctx.DW, DH: ctx.DH, bg: '#07050a' });
  bakeCrowd();
}

// the proscenium opening (where the painted front is transparent), traced from the art
function openingFromArt() {
  const im = A.theatre_front, c = mk(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, Wd = c.width, L = [], R = [];
  for (let v = 373; v <= 1198; v += 5) {
    const row = (u) => d[(v * Wd + u) * 4 + 3];
    let a = 512, b = 512; if (row(512) > 60) continue;
    while (a > 0 && row(a - 1) < 60) a--; while (b < Wd - 1 && row(b + 1) < 60) b++;
    L.push(tf(a + 2, v)); R.push(tf(b - 2, v));
  }
  OPEN = [...L, ...R.reverse()];
}

// ------------------------------------------------------------------------------------------------ ants
// crowd sprites at working size, with white or black cards (the card stunt), and the formation of digits
const DIG = { 1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'], 2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'], 8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'] };
const CARD = { felt_ant_crowd_1: [47, 17, 310, 242], felt_ant_crowd_2: [82, 19, 318, 247], felt_ant_card: [79, 17, 510, 433] };
function blackCard(im, box, key) {
  const c = mk(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#16141f';
  const [x0, y0, x1, y1] = box; g.beginPath(); g.rect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12); g.fill();
  g.globalAlpha = .25; g.fillStyle = '#3a3550'; g.fillRect(x0 + 6, y0 + 6, x1 - x0 - 12, (y1 - y0) * .25); g.globalAlpha = 1;
  c.src = key; return c;
}
const PITCH = 28, PY = 24, GX0 = 540 - 17 * 28 / 2, GY0 = 846;
let FORM = null;
function bakeCrowd() {
  A.antBlack = blackCard(A.felt_ant_card, CARD.felt_ant_card, 'antBlack');
  A.c1b = blackCard(A.felt_ant_crowd_1, CARD.felt_ant_crowd_1, 'c1b'); A.c2b = blackCard(A.felt_ant_crowd_2, CARD.felt_ant_crowd_2, 'c2b');
  FORM = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 17; c++) FORM.push({ r, c, v: hs(r * 31 + c * 7) < .7 ? 1 : 2, id: r * 17 + c });
}
function digitOn(num, r, c) { const s = String(num), d = Math.floor(c / 6), k = c % 6; if (k === 5 || d > 2) return false; return DIG[s[d]][r][k] === '1'; }
// one ant of the stunt: the card's top-left at (X, Y), card width PITCH - 3
function stuntAnt(x, t, f, num, flipK) {
  const im = f.v === 1 ? A.felt_ant_crowd_1 : A.felt_ant_crowd_2, box = CARD[f.v === 1 ? 'felt_ant_crowd_1' : 'felt_ant_crowd_2'];
  const sc = (PITCH - 2) / (box[2] - box[0]), on = digitOn(num, f.r, f.c), j = jit(f.id, t, .5);
  const X = GX0 + f.c * PITCH + j.dx, Y = GY0 + f.r * PY + j.dy + (flipK ? (1 - flipK) * 40 : 0);
  const w = im.width * sc, h = im.height * sc, s = smallOf(im, Math.round(h), 'w' + f.v + '@' + Math.round(h));
  x.save(); x.translate(X - box[0] * sc, Y - box[1] * sc); x.rotate(j.r); x.drawImage(s, 0, 0, w, h); x.restore();
  // the card itself, drawn clean over the hands so the pixels read: cream or black, a hair of edge and sheen
  const cw = PITCH - 2.5, ch = PY - 1.5;
  x.save(); x.translate(X + cw / 2, Y + ch / 2); x.rotate(j.r * 1.5);
  x.fillStyle = on ? '#16141d' : '#efe8dc'; x.fillRect(-cw / 2, -ch / 2, cw, ch);
  x.fillStyle = on ? 'rgba(90,86,120,.35)' : 'rgba(255,255,255,.5)'; x.fillRect(-cw / 2, -ch / 2, cw, ch * .28);
  x.strokeStyle = on ? 'rgba(0,0,0,.6)' : 'rgba(120,100,80,.45)'; x.lineWidth = .8; x.strokeRect(-cw / 2 + .4, -ch / 2 + .4, cw - .8, ch - .8);
  x.restore();
}
// extra ants around the stunt, by round: positions hashed, sizes by depth
function extras(x, t, n, zone, seed, sz) {
  const pose = [A.felt_ant_crowd_1, A.felt_ant_crowd_2, A.felt_ant_crowd_4, A.felt_ant_crowd_3];
  for (let i = 0; i < n; i++) {
    const u = hs(i * 1.731 + seed), v = hs(i * 2.417 + seed * 3.1), p = pose[Math.floor(hs(i * .91 + seed) * 4)];
    const X = zone[0] + u * (zone[2] - zone[0]), Y = zone[1] + v * (zone[3] - zone[1]), h = sz * (.85 + .3 * hs(i * 5.1));
    const j = jit(i + seed * 100, t, .7), s = smallOf(p, Math.round(h), p.src + '@' + Math.round(h));
    x.drawImage(s, X - h * p.width / p.height / 2 + j.dx, Y - h + j.dy, h * p.width / p.height, h);
  }
}

// ------------------------------------------------------------------------------------------------ camera
// framing: the design point (fx, fy) at the frame centre, zoom Zm on the z = 1000 plane
function camKey(t) {
  const rest = [540, 960, 1];
  const keys = [
    [0, [540, 960, 1]], [C.c1Down, [540, 960, 1.015]], [C.c1Closed, [540, 960, 1]],
    [C.antSlide, [540, 960, 1]], [C.b3, [455, 935, 1.2]], [C.b4Drop, [455, 935, 1.2]], [C.b4, rest],
    [C.bill, rest], [C.pullDone, [540, 900, .84]], [C.catNote - .1, [540, 900, .84]], [C.catNote + .5, [250, 1010, 1.55]],
    [C.c6Down, [250, 1010, 1.55]], [C.c6Closed, [540, 960, 1]],
    [C.lower, [540, 960, 1]], [C.circleEff - .1, [470, 1000, 1.08]], [C.hoist, [470, 1000, 1.08]], [DUR, rest],
  ];
  let a = keys[0], b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const k = a === b ? 1 : eio(seg(t, a[0], b[0]));
  return [mix(a[1][0], b[1][0], k), mix(a[1][1], b[1][1], k), mix(a[1][2], b[1][2], k)];
}
function camera(K, t) {
  const [fx, fy, zm] = camKey(t);
  K.cam.z = 1000 * (1 - 1 / zm); K.cam.x = fx - 540; K.cam.y = fy - 960;
  // focus: the stage by default; the hanging poster in B2; the pit and notes in B3
  let fz = 1060;
  if (t >= C.b2 && t < C.b3) fz = mix(1060, Z.fly, eo(seg(t, C.b2, C.b2Set + .3)));
  if (t >= C.b3 && t < C.b4) fz = 1000;
  if (t >= C.bill && t < C.c6Closed) fz = 1000;
  if (t >= C.c6Up) fz = 1000;
  K.focus(fz - K.cam.z * 0, 34, 20);
}

// ------------------------------------------------------------------------------------------------ the frame
function lights(K, t) {
  const lamp = lampLevel(t);
  K.ambient(78, 70, 84);
  // the desk and the room: the painted photo keeps its own light; the lamp's pool follows the lamp level
  lightD(K, 540, 960, Z.desk, 2600, [150, 146, 150], 1, { zmin: 2000, soft: 1 });
  lightD(K, 120, 300, Z.desk, 900, [70, 58, 40], lamp, { zmin: 2000, soft: 1 });
  // the theatre front: a warm wash from the lamp side, a little fill
  lightD(K, 300, 760, 1000, 900, [150, 120, 92], .55 + .45 * lamp, { zmin: 940, zmax: 1009, soft: 1 });
  lightD(K, 640, 1100, 1000, 700, [70, 60, 60], 1, { zmin: 940, zmax: 1009, soft: 1 });
  // inside: a cool wash on the backdrop, an amber spot on the action
  lightD(K, 540, 760, Z.back, 520, [40, 56, 110], 1, { zmin: 1100, soft: 1 });
  const sp = spotAt(t);
  lightD(K, sp[0], sp[1], 1080, sp[2], [175, 130, 86], sp[3], { zmin: 1010, zmax: 1300, soft: .7, ry: sp[2] * 1.25 });
  lightD(K, 540, 1100, 1080, 520, [80, 70, 64], .8, { zmin: 1010, zmax: 1300, soft: 1 });
  // things in front (cat, flown cards, notes): a soft key from upper left
  lightD(K, 360, 760, 980, 900, [150, 128, 100], .62 + .38 * lamp, { zmin: 900, zmax: 999, soft: 1 });
  lightD(K, 700, 1000, 980, 600, [60, 54, 60], 1, { zmin: 900, zmax: 999, soft: 1 });
  K.vignette(.42); K.grain(.07); K.haze(.05);
  // the beam of the spot, with dust
  if (sp[3] > .2) K.beam({ src: { x: (-60 - 540) * 1.1, y: (180 - 960) * 1.1, z: 1100 }, x: (sp[0] - 540) * 1.08, y: (sp[1] + 90 - 960) * 1.08, z: 1080, rx: sp[2] * .55,
    c: [255, 205, 160], a: .22 * sp[3], dust: 70, dustA: .9, dustSize: 1.2, u0: .35, w0: 26, soft: 12, fade: .9,
    clip: { z: 1000, path: (x) => { x.save(); x.scale(1, 1); OPEN.forEach(([a, b], i) => (i ? x.lineTo(a - 540, b - 960) : x.moveTo(a - 540, b - 960))); x.closePath(); x.restore(); } }, occ: 1000 });
}
function spotAt(t) {    // [x, y, radius, strength] of the amber spot inside
  if (t < C.c1Closed) return [600, 1000, 170, 1];
  if (t < C.b2) return [540, 950, 300, .9];
  if (t < C.b4) return [540, 950, 300, .6];
  if (t < C.c4Closed) return [540, 1000, 300, .9];
  if (t < C.c5Closed) return [520, 1110, 200, 1];
  if (t < C.c6Closed) return [540, 960, 320, .7];
  if (t < C.hoist) return [540, 960, 300, .85];
  return [mix(540, 600, seg(t, C.hoist, DUR)), mix(960, 1000, seg(t, C.hoist, DUR)), mix(300, 170, seg(t, C.hoist, DUR)), 1];
}
function lampLevel(t) {
  if (t < C.lampFlick) return 1;
  if (t < C.lampDim) { const s = step(t, 15); return hs(s * 4.7) < .5 ? .35 : 1; }
  if (t < C.c6Closed) return .4;
  return mix(.4, 1, seg(t, C.c6Closed, C.c6Open + .6));
}

function desk(K, t) {
  addD(K, Z.desk, (x) => {
    const w = 1485, h = w * A.desk.height / A.desk.width; x.drawImage(A.desk, -230, -150, w, h);
    const lamp = lampLevel(t);
    if (lamp < 1) { // the lamp dims: its shade and its pool go dark
      x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(40, 300, 30, 40, 300, 700);
      const v = Math.round(255 * (.35 + .65 * lamp)); g.addColorStop(0, `rgb(${v},${v},${v})`); g.addColorStop(1, 'rgb(255,255,255)'); x.fillStyle = g; x.fillRect(-500, -400, 1600, 1800); x.restore();
    }
  });
}

// the stage interior picture, the risers and everything that stands on the boards
function inside(K, t) {
  addD(K, Z.back, (x) => { x.save(); clipOpen(x, 30); x.drawImage(A.inside, 190, 385, 700, 700 * A.inside.height / A.inside.width); x.restore(); });
  // the sum on the backdrop (B0, revealed when the title card goes up)
  if (t < C.c1Closed || t >= C.hoist) addD(K, Z.back - 10, (x) => { x.save(); clipOpen(x); pic(x, P.sum, 540, 690, 380, { ay: .5, shadow: .4 }); x.restore(); });
}

function stage(K, t) {
  // B0 and the very end: the one ant in the spot
  const solo = t < C.c1Closed || t >= C.hoist;
  if (solo) addD(K, Z.floor, (x) => { x.save(); clipOpen(x); heroAnt(x, t); x.restore(); });
  // B1: the card stunt (918 / 932 / 933), more ants each round
  if (t >= C.c1Closed && t < C.b4Drop) {
    const round = t < C.r2 ? 1 : t < C.r3 ? 2 : 3, num = [918, 932, 933][round - 1];
    addD(K, 1180, (x) => { x.save(); clipOpen(x); if (round >= 2) extras(x, t, round === 2 ? 50 : 120, [290, 800, 790, 846], 11, 40); x.restore(); });
    addD(K, Z.rows, (x) => { x.save(); clipOpen(x);
      pic(x, A.risers, 540, 1150, 600, { ay: 1, alpha: 1 });
      for (const f of FORM) stuntAnt(x, t, f, num, 1);
      extras(x, t, round === 1 ? 10 : round === 2 ? 34 : 70, [320, 1095, 760, 1150], 3, 60);
      x.restore(); });
    if (round === 3) addD(K, Z.inner, (x) => { x.save(); clipOpen(x, 20); extras(x, t, 60, [260, 1150, 820, 1225], 7, 78); extras(x, t, 26, [380, 548, 700, 575], 9, 40); x.restore(); });
  }
  // B4: the casts grow on the risers behind the easels; the easels; the flood over the footlights
  if (t >= C.b4Drop && t < C.c4Closed) {
    const n = t < C.f1 ? 0 : t < C.f2 ? 40 : t < C.f3 ? 110 : 220;
    addD(K, Z.rows, (x) => { x.save(); clipOpen(x); pic(x, A.risers, 540, 1150, 600, { ay: 1 });
      if (n) pageAnts(x, t, n); x.restore(); });
    addD(K, Z.floor, (x) => { x.save(); clipOpen(x, 10); easels(x, t); x.restore(); });
    if (t >= C.flood) addD(K, 990, (x) => flood(x, t));
  }
  // B5: two levels - the big troupe on the risers (cold), the small troupe on the boards (warm)
  if (t >= C.c4Closed && t < C.c5Closed) addD(K, Z.rows, (x) => { x.save(); clipOpen(x);
    pic(x, A.risers, 540, 905, 540, { ay: 1 });
    const rows = [[722, 11, 56], [795, 12, 58], [868, 12, 60]];
    rows.forEach(([y, n, h], r) => { for (let i = 0; i < n; i++) { const X = 300 + (i + .5) * 480 / n + (r % 2) * 12, j = jit(r * 50 + i, t, .7), s = smallOf(A.felt_ant_crowd_3, h);
      x.drawImage(s, X - h * .31 + j.dx, y - h + j.dy, h * A.felt_ant_crowd_3.width / A.felt_ant_crowd_3.height, h); } });
    stringsUp(x, 540, 568, 380, 300); pic(x, P.upper, 540, 594, 380, { ay: .5, shadow: .35 });
    x.restore(); });
  if (t >= C.c4Closed && t < C.c5Closed) addD(K, Z.floor, (x) => { x.save(); clipOpen(x);
    const xs = [372, 455, 538, 612], bowK = seg(t, 51.9, 52.2);
    xs.forEach((X, i) => { const j = jit(200 + i, t, .8); pic(x, A.felt_ant_scripts, X + j.dx, 1210 + j.dy, 100, { ay: 1, shadow: .3, rot: -bowK * .3 }); });
    x.restore(); });
}
function heroAnt(x, t) {
  // the ant with its card: looks up at the sum, down at its card, flips it faster and faster ("rehearsing"), stops
  const j = jit(1, t, .6), X = 600, Y = 1112, h = 230;
  let black = false, sq = 1;
  if (t >= C.flip0 && t < C.flip0End) {
    // flips accelerate: phase = sum of shrinking intervals
    let tt = t - C.flip0, gap = .26, n = 0; while (tt > gap) { tt -= gap; gap = Math.max(.07, gap * .8); n++; }
    black = n % 2 === 1; sq = .35 + .65 * Math.min(1, tt / .06);   // the card squashes as it turns over
  } else if (t >= C.flip0End && t < C.c1Closed) black = true;
  else if (t >= C.hoist) black = true;
  const im = black ? A.antBlack : A.felt_ant_card, look = t >= C.antUp && t < C.antDown ? -.06 : 0;
  x.save(); x.translate(X + j.dx, Y + j.dy); x.rotate(j.r + look);
  // the card squashes as it turns over
  const hh = h, ww = hh * im.width / im.height, cb = CARD.felt_ant_card, cy = cb[3] / im.height * hh;
  x.drawImage(im, 0, cb[3], im.width, im.height - cb[3], -ww / 2, -hh + cy, ww, hh - cy);
  x.save(); x.translate(0, -hh + cy); x.scale(1, sq); x.drawImage(im, 0, 0, im.width, cb[3], -ww / 2, -cy, ww, cy); x.restore();
  x.restore();
}
function pageAnts(x, t, n) {
  const p = A.felt_ant_crowd_3;
  for (let i = 0; i < n; i++) {
    const r = i % 4, X = 290 + hs(i * 1.37) * 500, Y = 900 + r * 62 + hs(i * 2.1) * 30, h = 52 + r * 6, j = jit(300 + i, t, .7), s = smallOf(p, Math.round(h));
    x.drawImage(s, X - h * .3 + j.dx, Y - h + j.dy, h * p.width / p.height, h);
  }
}
function easels(x, t) {
  const slide = eo(seg(t, C.easels, C.easels + .7));
  const L = mix(-300, 405, slide), R = mix(1380, 675, slide);
  const ci = t < C.f1 ? -1 : t < C.f2 ? 0 : t < C.f3 ? 1 : 2;
  let ri = ci;
  // the rehearsal board turns one page too many, hesitates, turns back
  if (t >= C.f3 && t < C.f3End) ri = t < C.f3 + .28 ? 2 : 1; if (t >= C.f3End) ri = 2;
  board(x, t, L, P.cast, ci, [C.f1, C.f2, C.f3], 0);
  board(x, t, R, P.reh, ri, [C.f1, C.f2, C.f3], 1);
  if (t >= C.circle) penCircle(x, R, 1012, 92, 54, seg(t, C.circle, C.circle + .45), 'circ270');
  if (t >= C.circle + .4) penArrow(x, R + 104, 960, R + 104, 1050, seg(t, C.circle + .4, C.circle + .7));
  if (t >= C.nR) note(x, t, R - 150, 812, 176, T.noteR, -.05, C.nR, ZH ? 50 : 46);
}
function board(x, t, X, pages, i, times, id) {
  const j = jit(400 + id, t, .5), w = 236;
  pic(x, A.flip_easel, X + j.dx, 1236 + j.dy, w, { ay: 1, shadow: .35 });
  // the card face (art: 121-727 x 122-833 of 810 x 1181)
  const s = w / A.flip_easel.width, fx = X - w / 2 + 121 * s + j.dx, fy = 1236 - A.flip_easel.height * s + 122 * s + j.dy, fw = 606 * s, fh = 711 * s;
  if (i < 0) return;
  // flip: the old page swings up over the rings in .25 s
  const tf_ = times[Math.min(i, 2)], k = seg(t, tf_, tf_ + .25);
  x.drawImage(pages[i], fx + 4, fy + 6, fw - 8, fh - 12);
  if (k < 1 && i > 0) { x.save(); x.translate(fx, fy); x.scale(1, 1 - k); x.globalAlpha = 1 - k * .3; x.drawImage(pages[i - 1], 4, 6, fw - 8, fh - 12); x.restore(); }
}
function flood(x, t) {
  const p = A.felt_ant_bow, k = seg(t, C.flood, C.flood + 2.4);
  for (let i = 0; i < 46; i++) {
    const st_ = hs(i * 3.3) * 1.2, u = cl((t - C.flood - st_) / 1.4); if (u <= 0) continue;
    const X = 220 + hs(i * 1.9) * 640, Y = 1180 + u * (120 + hs(i * 2.7) * 140), h = 34 + hs(i) * 14, j = jit(500 + i, t);
    const s = smallOf(p, Math.round(h)); x.drawImage(s, X + j.dx, Y + j.dy - h, h * p.width / p.height, h);
  }
}
function confettiLayer(K, t) {
  if (t < C.pad3 || t > C.pad3 + 2.2) return;
  addD(K, 1040, (x) => { x.save(); clipOpen(x, 10);
    for (let i = 0; i < 90; i++) { const u = t - C.pad3 - hs(i * 1.3) * .5; if (u < 0) continue;
      const X = 290 + hs(i * 2.9) * 500 + Math.sin(u * 3 + i) * 14, Y = 520 + u * (230 + hs(i * 4.1) * 120);
      x.save(); x.translate(X, Y); x.rotate(u * (2 + hs(i) * 5) + i); x.fillStyle = ['#f24cb7', '#ffd23f', '#3a92c5'][i % 3]; x.globalAlpha = .9; x.fillRect(-5, -3, 10, 6); x.restore(); }
    x.restore(); });
}

// the red main curtain: closed = 1, open (flown) = 0
function curtainK(t) {
  const drops = [[C.c1Down, C.c1Closed, C.c1Up, C.c1Open], [C.c2Down, C.c2Closed, C.c2Closed, C.c2Open], [C.c3Down, C.c3Closed, C.c3Closed, C.c3Open],
    [C.c4Down, C.c4Closed, C.c4Up, C.c4Open], [C.c5Down, C.c5Closed, C.c6Up, C.c6Open]];
  for (const [a, b, c, d] of drops) {
    if (t >= a && t < b) return ei(seg(t, a, b));
    if (t >= b && t < c) return 1;
    if (t >= c && t < d) return 1 - eio(seg(t, c, d));
  }
  return 0;
}
function curtain(K, t) {
  const k = curtainK(t); if (k <= 0) return;
  addD(K, Z.curtain, (x) => {
    x.save(); clipOpen(x, 8);
    const w = 640, h = w * A.curtain_closed.height / A.curtain_closed.width, y = mix(500 - h - 60, 470, k);
    // a closed curtain sways a little after it lands
    const sw = k >= 1 ? 0 : 0; x.drawImage(A.curtain_closed, 540 - w / 2 + sw, y, w, h);
    x.restore();
  });
}

function front(K, t) {
  addD(K, 1010, (x) => { x.save(); x.fillStyle = 'rgba(6,3,4,.75)'; x.filter = 'blur(18px)'; x.beginPath(); x.ellipse(540, 1405, 470, 34, 0, 0, TAU); x.fill(); x.restore(); });
  if (A.pen) addD(K, 760, (x) => pic(x, A.pen, 760, 1640, 420, { ay: .5, rot: -.42, shadow: .5 }));
  addD(K, Z.front, (x) => {
    x.drawImage(A.theatre_front, TF.x, TF.y, TF.w, TF.h);
    // the marquee in the cartouche (art 370-653 x 145-281): unlit at frame 0, lit from B1
    const [cx0, cy0] = tf(370, 145), [cx1, cy1] = tf(653, 281), lit = t >= C.marquee && t < C.hoist + 10 ? 1 : 0;
    const f = Math.min(ZH ? 42 : 40, fitPx(x, T.marquee, 900, 44, ZH ? SERIF : 'Fraunces', cx1 - cx0 - 30));
    x.save(); x.globalAlpha = lit ? .95 : .28; text(x, T.marquee, (cx0 + cx1) / 2, (cy0 + cy1) / 2 + f * .36, 900, f, ZH ? SERIF : 'Fraunces', { fill: lit ? '#a8231b' : '#5a4a3a' }); x.restore();
  });
  // the course strip, hung on two lines over the crown
  addD(K, Z.fly + 4, (x) => { const j = jit(9, t, .4); stringsUp(x, 540, 268, 820, 40); pic(x, P.strip, 540 + j.dx, 268 + j.dy, 820, { ay: 0, shadow: .45, rot: -.004 }); });
}
function stringsUp(x, X, Y, w, top) { x.save(); x.strokeStyle = 'rgba(230,220,200,.55)'; x.lineWidth = 1.4; for (const s of [-.4, .4]) { x.beginPath(); x.moveTo(X + s * w, Y + 4); x.lineTo(X + s * w * .97, top); x.stroke(); } x.restore(); }

// flown cards: title, Anderson, curve poster, house rule, years, year card, banner, bill board, motto, wrong reading
function flown(K, t) {
  // the title card: frame 0, hoisted at titleUp; back at the very end
  const titleY = t < C.titleUp ? 0 : t < C.hoist ? -eio(seg(t, C.titleUp, C.titleUp + .5)) : -(1 - settle(t - C.hoist - .1));
  if (titleY > -1) hang(K, Z.fly, P.title, 595, 570 + titleY * 760, 540, t, 1, { underline: true });
  // Anderson poster (B1 end) - in the opening, above the numbers
  if (t >= C.anderson && t < C.b2Set) { const k = t < C.b2 ? settle(t - C.anderson) : 1 - eio(seg(t, C.b2, C.b2Set)); hang(K, 1012, P.anderson, 540, mix(-400, 548, k), 470, t, 2, { clip: true }); }
  // the curve poster (B2), in front of the theatre; B3 raises it to show only its bottom edge
  if (t >= C.b2 && t < C.b4Drop + .5) {
    let y = mix(-900, 330, settle(t - C.b2));
    if (t >= C.b3 - .3) y = mix(330, -262, eio(seg(t, C.b3 - .3, C.b3 + .3)));
    if (t >= C.b4Drop) y = mix(-262, -980, eio(seg(t, C.b4Drop, C.b4Drop + .5)));
    hang(K, Z.fly - 2, P.curve, 490, y, 780, t, 3, { onTop: (x, X0, Y0, s) => curveMarks(x, t, X0, Y0, s) });
  }
  // house rule (B4)
  if (t >= C.b4Drop && t < C.c4Down + .2) hang(K, Z.fly, P.rule, 540, mix(-400, 548, settle(t - C.b4Drop)), 560, t, 4);
  if (t >= C.easels && t < C.c4Down + .2) hang(K, Z.fly + 1, P.years1, 300, mix(-200, 470, settle(t - C.easels)), 230, t, 5);
  // the year card in front of the closed curtain, rises with it
  if (t >= C.year && t < C.c4Open + .3) { const y = t < C.c4Up ? mix(-200, 640, settle(t - C.year)) : mix(640, -260, eio(seg(t, C.c4Up, C.c4Open))); hang(K, Z.curtain - 2, P.year, 540, y, 300, t, 6, { clip: true }); }
  // the banner between the two levels (B5)
  if (t >= C.c4Up && t < C.c5Closed) hang(K, 1040, P.banner, 540, 905, 470, t, 7, { clip: true, noShadow: false });
  // the bill board (B6): crashes in, flips three times; hoisted for B7
  if (t >= C.bill && t < C.c6Closed) {
    const y = t < C.c6Down ? mix(-700, 286, Math.min(1, settle((t - C.bill) * 1.4))) : mix(286, -800, eio(seg(t, C.c6Down, C.c6Closed)));
    const pg = t < C.b1 ? 0 : t < C.b2f ? 1 : t < C.b3f ? 2 : 3, ft = [0, C.b1, C.b2f, C.b3f][pg];
    hang(K, 975, P.bills[pg], 540, y, 900, t, 8, { prev: pg > 0 ? P.bills[pg - 1] : null, flipK: pg > 0 ? seg(t, ft, ft + .3) : 1 });
    hang(K, 974, P.years2, 220, y + 400, 220, t, 9);
  }
  // the light bar (B6)
  if (t >= C.bar && t < C.c6Closed) addD(K, 978, (x) => { const y = mix(-100, 715, settle(t - C.bar)); stringsUp(x, 540, y - 60, 760, -200);
    pic(x, A.light_bar, 540, y, 760, { ay: .5, shadow: .4 });
    const on = [0, 1, 2, 3, 4, 5, 6].map((i) => t > C.bar + .1 + i * .085);
    const gx = [121, 330, 540, 729, 950, 1126, 1363]; x.save(); x.globalCompositeOperation = 'lighter';
    gx.forEach((u, i) => { if (!on[i]) return; const X = 540 - 380 + u * 760 / 1466, Y = y - 25 + 235 * 760 / 1466 * .4; const c = ['255,170,80', '255,90,170', '90,150,255'][i % 3];
      const g = x.createRadialGradient(X, Y, 2, X, Y, 46); g.addColorStop(0, `rgba(${c},.9)`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(X - 50, Y - 50, 100, 100); });
    x.restore(); });
  // B7: the motto card (hung at B7 start, lowered later, hoisted at the end), the wrong-reading card, the pen
  if (t >= C.c6Closed) {
    let my = 556; if (t >= C.lower) my = mix(556, 740, eio(seg(t, C.lower, C.lower + .6))); if (t >= C.hoist) my = mix(740, -600, eio(seg(t, C.hoist, DUR - .1)));
    hang(K, Z.fly - 3, P.motto, 540, my, 840, t, 10, { onTop: (x, X0, Y0, s) => mottoMarks(x, t, X0, Y0, s) });
    if (t >= C.wrong && t < C.lower + .6) { const sw = Math.sin((t - C.wrong) * 5) * Math.exp(-(t - C.wrong) * 2.2) * .18;
      hang(K, Z.fly - 1, P.wrong, 600, t < C.lower - .1 ? mix(-300, 975, settle(t - C.wrong)) : mix(975, -420, eio(seg(t, C.lower - .1, C.lower + .4))), 560, t, 11, { rot: sw, onTop: (x, X0, Y0, s) => wrongMarks(x, t, X0, Y0, s) }); }
  }
}
// hang a print on two lines at (X, Y top), width w; o.clip: only inside the opening; o.onTop(x, X0, Y0, s) draws on it
function hang(K, z, card, X, Y, w, t, id, o = {}) {
  addD(K, z, (x) => {
    x.save(); if (o.clip) clipOpen(x, 6);
    const j = jit(600 + id, t, .5), h = w * card.h / card.w, rot = (o.rot ?? 0) + Math.sin(tw(t) * 1.7 + id) * .004;
    stringsUp(x, X, Y, w * .92, -300);
    x.translate(X + j.dx, Y + j.dy); x.rotate(rot);
    if (!o.noShadow) { x.save(); x.globalAlpha = .45; x.fillStyle = '#0b0607'; x.filter = 'blur(10px)'; x.fillRect(-w / 2 + 10, 14, w, h); x.restore(); }
    x.fillStyle = '#cfc6b6'; x.fillRect(-w / 2 + 2, 3, w, h);
    if (o.prev && o.flipK < 1) { x.drawImage(card, -w / 2, 0, w, h); x.save(); x.scale(1, 1 - o.flipK); x.drawImage(o.prev, -w / 2, 0, w, h); x.restore(); }
    else x.drawImage(card, -w / 2, 0, w, h);
    if (o.underline && LANG) underline(x, t, w, h);
    if (o.onTop) o.onTop(x, -w / 2, 0, w / card.w);
    // two pegs
    for (const s of [-.32, .32]) { x.fillStyle = '#b48a55'; x.fillRect(s * w - 6, -10, 12, 26); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(s * w - 6, 12, 12, 4); }
    x.restore();
  });
}
// a red pen underline under "can't" / "不会" on the title card
function underline(x, t, w, h) {
  const k = 1; const y = h * .43 + (ZH ? 108 : 118) * .98 * (w / 560) + 14;
  const x0 = ZH ? -w * .3 : -w * .33, x1 = ZH ? -w * .02 : w * .02;
  pen(x, [[x0, y], [mix(x0, x1, .5), y + 4], [x1, y - 2]], 7, k, 'ul');
}
function curveMarks(x, t, X0, Y0, s) {
  const G = P.curveXY; if (!G) return;
  const at = (u, v) => [X0 + G.X(u) * s, Y0 + G.V(v) * s];
  // ×100 between the ticks of the log axis, the line under the axis, the footnote
  [C.x100a, C.x100b, C.x100c].forEach((tt, i) => { if (t < tt) return; const k = seg(t, tt, tt + .45); const [px, py] = at((i + .5) / 4 + .0, 0);
    handText(x, '×100', px, py - 52 * s, 42, k, 'x' + i); });
  if (t >= C.opsLine) { const k = seg(t, C.opsLine, C.opsLine + .9); const [a, b] = at(.45, 0), [c] = at(1, 0); pen(x, [[a, b + 64 * s], [c + 20, b + 66 * s]], 4, Math.min(1, k * 2), 'ops'); handText(x, T.ops, (a + c) / 2, b + 112 * s, 40, cl(k * 2 - 1), 'ops'); }
  if (t >= C.footnote) { const [a, b] = at(.72, .09); handText(x, T.antFoot, X0 + 330 * s, Y0 + 430 * s, 36, seg(t, C.footnote, C.footnote + .7), 'fn'); }
  // the ant: climbs the poster's edge, sits on the 13B knee, shrugs, slides down
  if (t >= C.antClimb && t < C.b3) {
    const [kx, ky] = at(.72, .09);
    let X, Y, im = A.felt_ant_climb, h = 96, rot = 0;
    if (t < C.antSit) { const k = sst(seg(t, C.antClimb, C.antSit)); X = mix(X0 + 690 * s, kx + 4, k); Y = mix(Y0 + 800 * s + 60, ky + 6, k); im = A.felt_ant_climb; }
    else if (t < C.antSlide) { X = kx + 4; Y = ky + 8; im = A.felt_ant_sit; h = 90; if (t > C.antShrug && t < C.antShrug + .6) Y -= Math.abs(Math.sin((t - C.antShrug) * 10)) * 6; }
    else { const k = ei(seg(t, C.antSlide, C.b3)); X = mix(kx + 4, X0 + 760 * s, k); Y = mix(ky + 8, Y0 + 820 * s + 200, k); im = A.felt_ant_sit; h = 90; rot = -.5 * k; }
    const j = jit(700, t, .6); pic(x, im, X + j.dx, Y + j.dy, h * im.width / im.height, { ay: 1, rot, shadow: .35 });
  }
}
function mottoMarks(x, t, X0, Y0, s) {
  if (t >= C.circleEff && P.mottoEff) { const e = P.mottoEff; penEllipse(x, X0 + e.x * s, Y0 + e.y * s, e.rw * s, e.rh * s, seg(t, C.circleEff, C.circleEff + .55), 'eff'); }
  if (t >= C.stamp) { const k = seg(t, C.stamp, C.stamp + .08); x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = k;
    const sw = P.stamp.w * s; x.translate(X0 + (420 - 60) * s, Y0 + 362 * s); x.rotate(-.05); x.drawImage(P.stamp, -sw / 2, -46 * s, sw, 92 * s); x.restore(); }
}
function wrongMarks(x, t, X0, Y0, s) {
  if (t >= C.strike) { const k = seg(t, C.strike, C.strike + .3), w2 = P.wrongW * s; pen(x, [[-w2 / 2 - 14, 118 * s - 30], [w2 / 2 + 14, 118 * s - 4]], 8, k, 'strike'); }
  if (t >= C.write) handText(x, T.fix, 0, 150 * s + 70, 56, seg(t, C.write, C.writeEnd), 'fix', '#c62a1f');
}

// ------------------------------------------------------------------------------------------------ red pen (live)
const RED = '#c42a1f';
function pen(x, pts, w, k, seed) {
  if (k <= 0) return; const n = 40, out = [];
  for (let i = 0; i <= n * k; i++) { const u = i / n, f = u * (pts.length - 1), a = Math.min(pts.length - 2, Math.floor(f)), r = f - a;
    out.push([mix(pts[a][0], pts[a + 1][0], r) + (hs(i * 1.7 + seed.length) - .5) * 1.2, mix(pts[a][1], pts[a + 1][1], r) + (hs(i * 2.3) - .5) * 1.2]); }
  if (out.length < 2) return; x.save(); x.globalCompositeOperation = 'multiply'; brushLine(x, out, w, seed, { color: RED, taper: .1 }); x.restore();
}
function penCircle(x, X, Y, rx, ry, k, seed) { penEllipse(x, X, Y, rx, ry, k, seed); }
function penEllipse(x, X, Y, rx, ry, k, seed) {
  if (k <= 0) return; const pts = []; const n = 60;
  for (let i = 0; i <= n * Math.min(1, k) * 1.1; i++) { const a = -2.2 + i / n * TAU * 1.08, wob = 1 + (hs(i * .7) - .5) * .05; pts.push([X + Math.cos(a) * rx * wob, Y + Math.sin(a) * ry * wob]); }
  if (pts.length > 1) { x.save(); x.globalCompositeOperation = 'multiply'; brushLine(x, pts, 6, seed, { color: RED, taper: .08 }); x.restore(); }
}
function penArrow(x, x0, y0, x1, y1, k) { pen(x, [[x0, y0], [x1, y1]], 6, k, 'arr'); if (k >= 1) { pen(x, [[x1 - 16, y1 - 22], [x1, y1]], 6, 1, 'ah1'); pen(x, [[x1 + 16, y1 - 22], [x1, y1]], 6, 1, 'ah2'); } }
// handwriting that writes itself left to right
function handText(x, s, X, Y, px, k, seed, color = RED) {
  if (k <= 0) return; x.save(); font(x, HANDW, px, HAND); const w = x.measureText(s).width;
  x.beginPath(); x.rect(X - w / 2 - 6, Y - px * 1.2, (w + 12) * Math.min(1, k * 1.05), px * 1.7); x.clip();
  x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.rotate(0); x.fillText(s, X, Y); x.restore();
}

// ------------------------------------------------------------------------------------------------ the cat's notes and the cat
function note(x, t, X, Y, w, lines, rot, t0, px = 50) {
  const k = seg(t, t0, t0 + .12), sc = mix(1.25, 1, back(k)); if (k <= 0) return;
  x.save(); x.translate(X + w / 2, Y + w / 2); x.rotate(rot); x.scale(sc, sc);
  pic(x, A.sticky_note, 0, 0, w, { ax: .5, ay: .5, shadow: .45, so: 4 });
  x.fillStyle = '#26242e'; font(x, HANDW, px, HAND); x.textAlign = 'center'; x.textBaseline = 'middle';
  const lh = px * (ZH ? 1.1 : .95), y0 = -(lines.length - 1) * lh / 2 - w * .03;
  lines.forEach((l, i) => { const f = Math.min(px, fitPx(x, l, HANDW, px, HAND, w * .84)); font(x, HANDW, f, HAND); x.fillText(l, 0, y0 + i * lh); });
  x.restore();
}
function notesLayer(K, t) {
  addD(K, Z.notes, (x) => {
    // the running gag, first note: on the left curtain from frame 0; peeled off when the show starts
    if (t < C.c1Closed + .4) { const fall = seg(t, C.c1Closed, C.c1Closed + .4); x.save(); x.translate(0, fall * fall * 500); x.globalAlpha = 1 - fall; note(x, t, 122, 660, 178, T.note0, -.06, -1, ZH ? 46 : 50); x.restore(); }
    // B1: partial credit, stuck higher each round (a ramp)
    if (t < C.b4Drop + .5) {
      const fall = seg(t, C.b4Drop, C.b4Drop + .5); x.save(); x.translate(0, fall * fall * 600); x.globalAlpha = 1 - fall;
      note(x, t, 128, 820, 104, ['1/3'], -.05, C.n1, 46); note(x, t, 178, 720, 104, ['2/3'], .03, C.n2, 46); note(x, t, 228, 620, 104, ['3/3'], -.02, C.n3, 46); x.restore();
    }
    // B3: the ramp drawn through the notes, the two tags
    if (t >= C.b3 && t < C.b4Drop + .3) {
      if (t >= C.ramp) pen(x, [[180, 872], [230, 772], [280, 672]], 6, seg(t, C.ramp, C.ramp + .5), 'ramp');
      if (t >= C.mirage) { const k = seg(t, C.mirage, C.mirage + .3); x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = .92 * k;
        x.translate(598, 958); x.rotate(-.07); const sc = mix(1.18, 1, k);
        // the roller leaves its print on a paper slip pinned over the judges' step
        x.globalCompositeOperation = 'source-over'; x.globalAlpha = k; x.fillStyle = 'rgba(8,4,6,.45)'; x.fillRect(-236, -50, 480, 112);
        x.fillStyle = '#efe7da'; x.fillRect(-244, -58, 488, 116); x.globalCompositeOperation = 'multiply'; x.globalAlpha = .95 * k;
        x.drawImage(P.mirage, -230 * sc, -53 * sc, 460 * sc, 106 * sc); x.restore(); }
      const tk = seg(t, C.catPeek, C.catPeek + .3); if (tk > 0) { x.save(); x.globalAlpha = tk; pic(x, P.tagCat, 282, 585, 250, { ay: .5, rot: -.02, shadow: .4 }); pic(x, P.tagJudge, 598, 1066, 300, { ay: .5, rot: .015, shadow: .4 }); x.restore(); }
    }
    // B5: the reversal, on the lower level
    if (t >= C.c4Closed && t < C.c5Closed) { pic(x, P.lower, 612, 1265, 330, { ay: .5, shadow: .4 }); if (t >= C.nRm) note(x, t, 312, 1176, 132, T.noteRm, -.07, C.nRm, ZH ? 40 : 42); }
  });
}
// the judges' paddles rise from the pit behind the footlights
function paddles(K, t) {
  const show = (t >= C.pad1 && t < C.b4Drop) ? 1 : 0;
  if (show) addD(K, Z.pit, (x) => { x.save(); clipOpen(x, 4);
    const v = t < C.pad3 ? '0' : '100', xs = [500, 598, 696];
    xs.forEach((X, i) => { const up = eo(seg(t, C.pad1 + i * .06, C.pad1 + .25 + i * .06)), bob = [C.pad2, C.pad3].reduce((b, tp) => b + (t >= tp && t < tp + .3 ? Math.sin((t - tp) * 30) * 5 * (1 - (t - tp) / .3) : 0), 0);
      paddle(x, X, mix(1420, 1168, up) + bob, 88, v, t, i); });
    if (t >= C.ramp) { const k = seg(t, C.ramp, C.ramp + .5); x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(58,146,197,.95)'; x.lineWidth = 7; x.setLineDash([]);
      const pts = [[452, 1100], [652, 1100], [652, 1010], [744, 1010]]; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); const n = 3 * k; for (let i = 1; i <= Math.ceil(n); i++) { const a = pts[i - 1], b = pts[i], r = Math.min(1, n - i + 1); x.lineTo(mix(a[0], b[0], r), mix(a[1], b[1], r)); } x.stroke(); x.restore(); }
    x.restore(); });
  if (t >= C.pad5 && t < C.c5Closed) addD(K, Z.pit, (x) => { x.save(); clipOpen(x, 4);
    const up1 = eo(seg(t, C.pad5, C.pad5 + .35)), up2 = eo(seg(t, C.pad5 + .2, C.pad5 + .55));
    paddle(x, 664, mix(1500, 650, up1), 92, '60.0', t, 0, 660);
    paddle(x, 690, mix(1420, 1150, up2), 88, '67.6', t, 1);
    x.restore(); });
  if (t >= C.pad5 + .5 && t < C.c5Closed) addD(K, Z.notes, (x) => pic(x, P.exam, 600, 1046, 330, { ay: .5, shadow: .4 }));
}
function paddle(x, X, Y, d, v, t, i, stick) {
  const im = A.judge_paddle, s = d / 566, w = im.width * s, h = im.height * s, j = jit(800 + i, t, .6);
  x.save(); x.translate(X + j.dx, Y + j.dy); x.rotate(j.r * 2);
  if (stick) { x.fillStyle = '#c7a86b'; x.fillRect(-4, d / 2, 8, stick); x.fillStyle = 'rgba(80,60,30,.5)'; x.fillRect(1, d / 2, 3, stick); }
  x.drawImage(im, -318 * s, -318 * s, w, h);
  const f = fitPx(x, v, 900, d * .5, 'Fraunces', d * .78); text(x, v, 0, f * .36, 900, f, 'Fraunces', { fill: '#1d1b28' });
  x.restore();
}
// the cat: on the left end of the apron; pose and place by time
function catState(t) {
  let pose = 'felt_cat_back', X = 214, Y = 1258, h = 300, flip = false;
  const slaps = [C.slap0, C.n1, C.n2, C.n3, C.nR, C.nRm];
  if (t >= C.c1Closed && t < C.b3) pose = 'felt_cat_lookup';
  if (t >= C.pad3 - .05 && t < C.pad3 + .6) pose = 'felt_cat_shock';
  if ((t >= C.x100a - .2 && t < C.opsLine + 1) || (t >= C.footnote - .1 && t < C.footnote + .8)) pose = 'felt_cat_pen';
  if (t >= C.b3 && t < C.b4) pose = t >= C.ramp - .2 && t < C.ramp + .6 ? 'felt_cat_pen' : 'felt_cat_back';
  if (t >= C.b4 && t < C.c6Down) pose = 'felt_cat_lookup';
  if (t >= C.circle - .1 && t < C.circle + .8) pose = 'felt_cat_pen';
  if (t >= C.catNote - .05 && t < C.c6Down + .2) pose = 'felt_cat_note';
  if (t >= C.c6Closed) pose = 'felt_cat_back';
  if ((t >= C.strike - .15 && t < C.strike + .4) || (t >= C.write - .1 && t < C.writeEnd + .1) || (t >= C.circleEff - .1 && t < C.circleEff + .6)) pose = 'felt_cat_pen';
  for (const s of slaps) if (t >= s - .12 && t < s + .3) pose = 'felt_cat_slap';
  // B7: hops to the right end of the lowered motto card and stamps the footnote
  if (t >= C.catMove) { const k = seg(t, C.catMove, C.catMove + .9), hop = Math.floor(k * 4) / 4; X = mix(214, 500, sst(hop)); Y = 1258 - (k < 1 ? Math.abs(Math.sin(k * Math.PI * 4)) * 14 : 0); pose = 'felt_cat_back'; }
  if (t >= C.stampUp) { pose = 'felt_cat_stamp'; Y = 1258 - (t < C.stamp ? 22 * eo(seg(t, C.stampUp, C.stampUp + .3)) : 0); }
  if (t >= C.stamp + .35) { pose = 'felt_cat_back'; const k = seg(t, C.stamp + .35, C.stamp + .7), hop = Math.floor(k * 2) / 2; X = mix(500, 860, sst(hop)); Y = 1258; }
  if (t >= C.hoist) { pose = 'felt_cat_back'; const k = seg(t, C.hoist, DUR - .2), hop = Math.floor(k * 4) / 4; X = mix(860, 214, sst(hop)); }
  if (pose === 'felt_cat_note') h = 320;
  if (pose === 'felt_cat_stamp' || pose === 'felt_cat_pen' || pose === 'felt_cat_slap') h = 320;
  if (pose === 'felt_cat_pen' || pose === 'felt_cat_slap') flip = false;
  return { pose, X, Y, h, flip };
}
function cat(K, t) {
  const c = catState(t), im = A[c.pose], j = jit(2, t, .8);
  addD(K, Z.cat, (x) => {
    // contact shadow on the apron
    x.save(); x.globalAlpha = .45; x.fillStyle = '#0a0506'; x.filter = 'blur(8px)'; x.beginPath(); x.ellipse(c.X, c.Y - 4, c.h * .32, 12, 0, 0, TAU); x.fill(); x.restore();
    const w = c.h * im.width / im.height;
    pic(x, im, c.X + j.dx, c.Y + j.dy, w, { ay: 1, rot: j.r, flip: c.flip });
    // the held note's words (B6), on the note in the art (304-741 x 520-965 of 954 x 1428)
    if (c.pose === 'felt_cat_note') { const s = c.h / im.height, nx = c.X - w / 2 + 304 * s + j.dx, ny = c.Y - c.h + 520 * s + j.dy, nw = 437 * s, nh = 445 * s;
      x.save(); x.translate(nx + nw / 2, ny + nh / 2); x.fillStyle = '#26242e'; x.textAlign = 'center'; x.textBaseline = 'middle';
      T.noteCat.forEach((l, i) => { const f = fitPx(x, l, HANDW, 34, HAND, nw * .9); font(x, HANDW, f, HAND); x.fillText(l, 0, (i - .5) * f * 1.05); }); x.restore(); }
  });
}

// ------------------------------------------------------------------------------------------------ captions (post, screen space)
function captionAt(t) {
  if (!VO) return null;
  for (const [id, r] of Object.entries(VO)) {
    if (t < r.t - .05 || t > r.t + r.dur + .25) continue;
    const parts = (T.cap[id] || '').split('|'); if (!parts[0]) return null;
    // split the line's time across its captions by length (words' marks when present)
    const lens = parts.map((p) => p.replace(/\//g, '').length), tot = lens.reduce((a, b) => a + b, 0);
    let acc = r.t; for (let i = 0; i < parts.length; i++) { const d = r.dur * lens[i] / tot; if (t < acc + d + (i === parts.length - 1 ? .25 : 0)) return { s: parts[i], ding: id === 'd01', id }; acc += d; }
  }
  return null;
}
function captions(g, t) {
  const c = captionAt(t); if (!c) return;
  const rows = c.s.split('/'), px = ZH ? 54 : 52, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.24;
  g.save(); font(g, wt, px, fam); g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.max(...rows.map((r) => g.measureText(r).width)), cy = 1372 - (rows.length - 1) * lh / 2;
  const bx = 540 - Math.min(760, wmax) / 2 - 24, bw = Math.min(760, wmax) + 48, by = cy - lh / 2 - 12, bh = rows.length * lh + 24;
  g.fillStyle = 'rgba(12,8,10,.58)'; g.beginPath(); g.roundRect(bx, by, bw, bh, 18); g.fill();
  rows.forEach((r, i) => { const f = Math.min(px, fitPx(g, r, wt, px, fam, 760)); font(g, wt, f, fam); g.fillStyle = c.ding ? '#ffe7a8' : '#fbf7ef'; g.fillText(r, 540, cy + i * lh + 2); });
  if (c.ding) { font(g, 600, 26, fam); g.fillStyle = 'rgba(255,231,168,.85)'; g.fillText(T.dingBy, 540, by - 22); }
  g.restore();
}

function guides(g) {
  g.save(); g.lineWidth = 3; g.font = '600 22px Inter';
  const box = (x, y, w, h, c, label) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); g.setLineDash([]); g.fillStyle = c; g.fillText(label, x + 8, y + 26); };
  box(0, 0, W, 260, '#ff4d6d', 'UI: keep clear'); box(0, 1480, W, 440, '#ff4d6d', 'UI: keep clear'); box(880, 700, 200, 780, '#ff4d6d', 'buttons');
  box(0, 260, W, 300, '#4dd2ff', 'title'); box(120, 1200, 760, 240, '#ffd24d', 'captions');
  g.restore();
}

// ------------------------------------------------------------------------------------------------ scene
defineScene({
  meta: { title: 'L01-1 One Ant Cant Add', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 7,
    background: '#07050a', fonts: ['Fraunces', 'Inter', 'JetBrains Mono', 'Caveat', 'Instrument Serif'], poster: 0 },
  setup,
  layers: [{ name: 'film', type: '2d', draw(ctx, g) {
    const t = ctx.sec, K = ST.frame(t);
    camera(K, t); lights(K, t);
    desk(K, t); inside(K, t); stage(K, t); confettiLayer(K, t); paddles(K, t); curtain(K, t); front(K, t);
    flown(K, t); notesLayer(K, t); cat(K, t);
    ST.render(K, g);
  } }],
  post(ctx, g) { if (CAPS) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
