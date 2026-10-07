// Style bake-off, look "riso" (SCRIPT_v2 beats 0-2, 17.5 s): the opening as a moving risograph print.
// Every piece is printed offline by print.py (the Codex drawings separated into four inks - yellow, pink, blue, navy -
// slightly out of register, paper grain and pinholes, halftone only on the large areas) and moves here as cut paper
// with a soft shadow. All text is live vector ink: crisp, solid, multiplied onto the paper. One continuous camera per
// section, springs and eases only, a short shutter (sub-frames) on the fast moves. Every frame is a pure function of t.
import { defineScene } from '/pv/runtime/pv.js';
import { loadImg, mk, cl, mix, eio, eo, ei, hs, TAU } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1';
const W = 1080, H = 1920, FPS = 30;
const SERIF = ZH ? '"Noto Serif SC", Fraunces' : 'Fraunces', SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter';
const HAND = ZH ? '"ZCOOL KuaiLe"' : '"Permanent Marker"';
const INK = { yellow: [255, 250, 40], pink: [240, 76, 183], blue: [58, 146, 197], navy: [32, 56, 146] };
const PAPER = 'rgb(241,235,226)', SHADOW = 'rgba(30,24,64,.42)';
let TL, C, VO, M, DUR, CFG, FG, FC, ACC, AC, SY = {};
const P = {}, PAT = {};
let CAMZ = 1;                                   // the current camera zoom (for picking a mip level)

// ------------------------------------------------------------------ time
const seg = (t, a, b) => cl((t - a) / (b - a));
const sst = (k) => { k = cl(k); return k * k * (3 - 2 * k); };
const settle = (x, k = 6, w = 7) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(w * x));
const swing = (x, a, k = 2.4, w = 7) => (x <= 0 ? 0 : a * Math.exp(-k * x) * Math.sin(w * x));
const bo = (x, c = 1.4) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
/** 0 -> 1 from t0 over d seconds: starts and lands at rest, overshoots a little on the way (no impulse start). */
const rise = (t, t0, d, c = 1.3) => (t <= t0 ? 0 : t >= t0 + d ? 1 : bo(sst((t - t0) / d), c));
const ramp = (t, a, b) => { const d = b - a, u = cl((t - a) / d); return t <= a ? 0 : (t >= b ? d * .5 + (t - b) : d * (u * u * u - u * u * u * u / 2)); };
function word(id, s, fb) {
  const r = VO && VO[id]; if (!r) return fb;
  const w = r.words.find((x) => x[2] === s) || r.words.find((x) => x[2].includes(s));
  return w ? w[0] : fb;
}
const ink = (n, a = 1) => `rgba(${INK[n][0]},${INK[n][1]},${INK[n][2]},${a})`;

// ------------------------------------------------------------------ pieces (prints) and patterns
function prep(img, blur = 12) {
  const w = img.width, h = img.height, pad = blur * 2 + 4, mips = [img];
  let c = img;
  while (c.width > 48 && c.height > 48) { const n = mk(c.width / 2, c.height / 2), g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); mips.push(n); c = n; }
  const sil = mk(w, h), lg = sil.getContext('2d'); lg.drawImage(img, 0, 0); lg.globalCompositeOperation = 'source-in'; lg.fillStyle = '#000'; lg.fillRect(0, 0, w, h);
  const sh = mk(w + 2 * pad, h + 2 * pad), sg = sh.getContext('2d'); sg.filter = `blur(${blur}px)`; sg.drawImage(sil, pad, pad);
  return { img, mips, sh, pad, w, h };
}
/** A cut-paper piece at (x, y): anchor (ax, ay) in print px, s scale, rot, sx/sy squash, dir/st (stretch along an
 *  angle), lift (shadow distance), a alpha, ghost (a second print crossfaded over it), draw (callback, piece px). */
function put(g, Pc, x, y, o = {}) {
  const s = o.s ?? 1, a = o.a ?? 1; if (a <= 0.002 || s <= 0.002) return;
  const ax = o.ax ?? Pc.w / 2, ay = o.ay ?? Pc.h / 2, sx = (o.sx ?? 1) * (o.flip ? -1 : 1), sy = o.sy ?? 1, lift = o.lift ?? 1;
  const xf = (gg) => { gg.translate(x, y); if (o.dir != null) { gg.rotate(o.dir); gg.scale(o.st, 1 / o.st); gg.rotate(-o.dir); } gg.rotate(o.rot ?? 0); gg.scale(s * sx, s * sy); };
  if (o.shadow !== false) {
    const d = (o.sd ?? 9) * lift;
    g.save(); g.translate(d * .55, d); xf(g); g.globalAlpha = a * (o.sa ?? .34); g.globalCompositeOperation = 'multiply';
    g.drawImage(Pc.sh, -ax - Pc.pad, -ay - Pc.pad); g.restore();
  }
  const eff = Math.abs(s * CAMZ * Math.max(Math.abs(sx), sy, o.st ?? 1));
  const lv = Math.max(0, Math.min(Pc.mips.length - 1, Math.floor(Math.log2(1 / Math.max(eff, 1e-3)))));
  g.save(); xf(g); g.globalAlpha = a; g.drawImage(Pc.mips[lv], -ax, -ay, Pc.w, Pc.h);
  if (o.ghost && o.gk > 0) { const G = o.ghost; g.globalAlpha = a * o.gk; g.drawImage(G.mips[Math.min(lv, G.mips.length - 1)], -ax, -ay, G.w, G.h); }
  if (o.draw) { g.globalAlpha = a; o.draw(g, ax, ay); }
  g.restore();
}
function font(g, w, px, fam) { g.font = `${w} ${px}px ${fam}`; }
function fitPx(g, s, w, px, fam, maxW) { font(g, w, px, fam); const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
/** Solid ink type (multiply on paper), optional second ink hit out of register; knock: paper-white type. */
function inkText(g, s, x, y, o) {
  g.save(); font(g, o.w ?? 900, o.px, o.fam ?? SERIF); g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'alphabetic';
  if (o.ls) g.letterSpacing = o.ls + 'px';
  if (o.hit) { g.globalCompositeOperation = 'multiply'; g.fillStyle = ink(o.hit); g.fillText(s, x + (o.hx ?? 5), y + (o.hy ?? 4)); }
  if (o.ko && !o.knock) { g.globalCompositeOperation = 'source-over'; g.fillStyle = PAPER; g.fillText(s, x, y); }   // knock the ground out: navy prints as navy
  g.globalCompositeOperation = o.knock ? 'source-over' : 'multiply'; g.fillStyle = o.knock ? PAPER : ink(o.ink ?? 'navy'); g.fillText(s, x, y);
  g.restore();
}
function rr(x, y, w, h, r) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
/** A cut-paper shape: paper texture, a soft shadow, then inks (multiplied solid ink tiles) inside it. */
function paperShape(g, path, o = {}) {
  g.save(); g.shadowColor = SHADOW; g.shadowBlur = (o.blur ?? 16) * CAMZ * (CFG ? CFG.S : 1); g.shadowOffsetX = (o.sd ?? 8) * .55 * CAMZ; g.shadowOffsetY = (o.sd ?? 8) * CAMZ;
  g.fillStyle = PAT.paper; g.fill(path); g.restore();
}
function inkShape(g, path, n, a = 1) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a; g.fillStyle = PAT[n]; g.fill(path); g.restore(); }
function inkStroke(g, path, n, w) { g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = PAT[n]; g.lineWidth = w; g.lineJoin = 'round'; g.stroke(path); g.restore(); }

// ------------------------------------------------------------------ setup
async function setup(ctx) {
  CFG = ctx.cfg;
  TL = await (await fetch('../timeline.json')).json(); C = TL.cue; DUR = TL.dur;
  try { VO = await (await fetch(`../vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  M = await (await fetch('print/meta.json')).json();
  const L = (n, ext = 'png') => loadImg(`print/${n}.${ext}`);
  const names = ['riso_servers', 'riso_gpu', 'riso_brain', 'riso_ticket', 'riso_forum', 'riso_coders_a', 'riso_coders_b', 'riso_coders_spark'];
  for (let i = 1; i <= 6; i++) names.push(`riso_chef_idle_${i}`, `riso_chef_idle_${i}_ghost`, `riso_chef_cook_${i}`);
  await Promise.all(names.map(async (n) => { P[n] = prep(await L(n), n.includes('chef') ? 9 : 14); }));
  for (const n of ['riso_bgA', 'riso_burst', 'riso_kitchen', 'riso_glow_pink']) P[n] = await L(n, 'jpg');
  FC = mk(ctx.W, ctx.H); FG = FC.getContext('2d'); ACC = mk(ctx.W, ctx.H); AC = ACC.getContext('2d');
  for (const n of ['paper', 'ink_yellow', 'ink_pink', 'ink_blue', 'ink_navy']) PAT[n.replace('ink_', '')] = FG.createPattern(await L('riso_' + n, 'jpg'), 'repeat');
  if (ZH) await Promise.all([`900 80px "Noto Serif SC"`, `700 40px "Noto Sans SC"`, `400 90px "ZCOOL KuaiLe"`].map((f) => document.fonts.load(f, '数据中心的大模型塞进一张游戏显卡不可能真的假的位厨师一个字程序员们都炸了怎么做到想象间后站着八上手每写只需要其中级跑起来')));
  for (const [k, [id, w]] of Object.entries(T.sync)) SY[k] = word(id, w, null);
  // fallbacks when a word is missing: the shared cues
  SY.move = SY.move ?? 4.9; SY.land = SY.land ?? 6.4; SY.many = SY.many ?? 11.4; SY.eight = SY.eight ?? 16.1;
  buildCrowd();
}

// ------------------------------------------------------------------ A: data center vs one gaming card (0 - 7.7 s)
const A = { srv: [600, 1192, 1.16], brain: [664, 772, .74], gpu: [396, 1172, .66, -.06] };
/** A point of the card print (print px) -> world, with the card's bounce scale. */
function cardPt(lx, ly, bounce = 1) {
  const k = A.gpu[2] * bounce, r = A.gpu[3], dx = (lx - P.riso_gpu.w / 2) * k, dy = (ly - P.riso_gpu.h / 2) * k;
  return [A.gpu[0] + dx * Math.cos(r) - dy * Math.sin(r), A.gpu[1] + dx * Math.sin(r) + dy * Math.cos(r)];
}
const SLOT = [775, 66], HOVER = [775, -250], BRAIN_IN = .54;   // where the model ends up: crammed in, its top sticking out
/** The model's flight: it rises, swings over the card, is pushed down into it (narrowing as it is forced in), and
 *  bulges once it is in - too big for the card, its top still sticking out. Drawn behind the card, so the card hides
 *  the part that is inside. */
function brainState(t, bounce) {
  const t0 = SY.move - .15, t1 = SY.land, tm = t1 - .42;
  if (t < t0) { const ant = Math.sin(Math.PI * seg(t, t0 - .35, t0)), br = .012 * Math.sin(t * TAU / 1.7);
    return { x: A.brain[0], y: A.brain[1] + 10 * ant, s: A.brain[2] * (1 + br), sx: 1 + .09 * ant, sy: 1 - .11 * ant, a: 1 }; }
  if (t < tm) {      // the flight: an arc up and over, shrinking a little, stretched along the move
    const u = eio(seg(t, t0, tm)), p0 = [A.brain[0], A.brain[1]], p2 = cardPt(...HOVER), p1 = [mix(p0[0], p2[0], .4), Math.min(p0[1], p2[1]) - 150];
    const bz = (k, i) => (1 - k) * (1 - k) * p0[i] + 2 * (1 - k) * k * p1[i] + k * k * p2[i];
    const du = .01, dx = bz(Math.min(1, u + du), 0) - bz(Math.max(0, u - du), 0), dy = bz(Math.min(1, u + du), 1) - bz(Math.max(0, u - du), 1);
    const sp = Math.sin(Math.PI * seg(t, t0, tm));
    return { x: bz(u, 0), y: bz(u, 1), s: mix(A.brain[2], .6, u), dir: Math.atan2(dy, dx), st: 1 + .22 * sp, rot: A.gpu[3] * u, a: 1 };
  }
  if (t < t1) {      // the push: accelerating down into the card, narrowing as it goes in
    const u = seg(t, tm, t1), k = u * u, p = cardPt(HOVER[0], mix(HOVER[1], SLOT[1], k), bounce);
    return { x: p[0], y: p[1], s: mix(.6, BRAIN_IN, k), sx: 1 - .2 * sst(u), sy: 1 + .18 * sst(u), rot: A.gpu[3], a: 1 };
  }
  // in: it bulges out sideways (crammed), jiggles, then breathes with the card
  const x1 = t - t1, sp = Math.exp(-5.5 * x1) * Math.cos(15 * x1), p = cardPt(SLOT[0], SLOT[1], bounce), br = .012 * Math.sin(x1 * TAU / 1.4) * cl(x1 * 2);
  return { x: p[0], y: p[1], s: BRAIN_IN * bounce, sx: 1.1 - .3 * sp + br, sy: .9 + .28 * sp - br, rot: A.gpu[3] + swing(x1, .05, 4, 9), a: 1, lift: .6 };
}
function fanAngle(t, i) { const sp = i ? -1 : 1; return sp * (1.1 * t + 4.2 * ramp(t, SY.land - .1, SY.land + .7) + i * .7); }
function secA(g, t) {
  const cam = camA(t);
  CAMZ = cam.z;
  g.save(); g.translate(540, 960); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
  g.drawImage(P.riso_bgA, 540 - P.riso_bgA.width / 2, 960 - P.riso_bgA.height / 2);
  // the hook is printed on its own strip: it lifts off and leaves upward as the push starts, before it reaches the
  // top of the frame (the camera alone would drag it slowly through the UI zone)
  const hk = ei(seg(t, SY.move - .4, SY.move + .2)), hoff = 820 * hk / cam.z;
  const f1 = fitPx(g, T.hook[0], 900, ZH ? 84 : 92, SERIF, 940), f2 = fitPx(g, T.hook[1], 900, ZH ? 104 : 100, SERIF, 960);
  if (hk < 1) {
    inkText(g, T.hook[0], 540, 292 + f1 * .82 - hoff, { px: f1, hit: 'pink', ko: true });
    inkText(g, T.hook[1], 540, 306 + f1 * .9 + f2 * .95 - hoff * 1.06, { px: f2, hit: 'pink', hx: 6, hy: 5, ko: true });
  }
  // the data center: a wall of racks
  const [sxp, syp, ss] = A.srv;
  put(g, P.riso_servers, sxp, syp, { s: ss, sd: 14 });
  // the card's bounce when the model is crammed in
  const land = t - SY.land, bounce = 1 + swing(land, .085, 4.5, 12);
  // the model's glow, the model (behind the card: the card hides the part that is inside)
  const b = brainState(t, bounce);
  if (b.s > .01) {
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .8; const gs = b.s / A.brain[2] * (1 + .03 * Math.sin(t * TAU / 1.7)) * 1.05;
    g.drawImage(P.riso_glow_pink, b.x - 420 * gs, b.y - 420 * gs, 840 * gs, 840 * gs); g.restore();
    put(g, P.riso_brain, b.x, b.y, { s: b.s, sx: b.sx, sy: b.sy, rot: b.rot ?? 0, dir: b.dir, st: b.st ?? 1, lift: b.lift ?? 1.6, sd: 10 });
  }
  // the server tag peels off and leaves upward before the push carries it into the top of the frame
  const tk = ei(seg(t, SY.move - .05, SY.move + .45));
  if (tk < 1) tag(g, T.tagDC, sxp + 150, syp - P.riso_servers.h * ss / 2 + 6 - 820 * tk / cam.z, .03 + .2 * tk, 'blue');
  // the card: bounces when the model lands in it, fans spin up
  const gx = A.gpu[0], gy = A.gpu[1], grot = A.gpu[3];
  put(g, P.riso_gpu, gx, gy, { s: A.gpu[2] * bounce, rot: grot, sd: 12 + 60 * Math.max(0, bounce - 1), draw: (x, ax, ay) => fans(x, t, ax, ay) });
  if (land > 0) {   // a pink halftone flash printed over the card and around it as the model lands
    const k = seg(land, 0, 1.1), gs = mix(.3, 1.6, eo(k)), [fx, fy] = cardPt(SLOT[0], SLOT[1] + 60);
    g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .75 * (1 - k) * (1 - k); g.drawImage(P.riso_glow_pink, fx - 420 * gs, fy - 420 * gs, 840 * gs, 840 * gs); g.restore();
  }
  tag(g, T.tagCard, A.gpu[0] - 150, A.gpu[1] - 238, -.06, 'pink');
  g.restore();
  return cam;
}
function fans(g, t, ax, ay) {
  M.riso_gpu.fans.forEach(([cx, cy, rx, ry], i) => {
    g.save(); g.translate(cx - ax, cy - ay); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.clip();
    g.scale(1, ry / rx); g.rotate(fanAngle(t, i)); g.scale(1, rx / ry); g.drawImage(P.riso_gpu.img, -cx, -cy); g.restore();
  });
}
/** A paper tag with ink type: a strip of the colour ink on the left. */
function tag(g, s, x, y, rot, col) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const px = ZH ? 40 : 36; font(g, 800, px, SANS); g.letterSpacing = ZH ? '4px' : '3px'; const w = g.measureText(s).width + 70, h = px + 34;
  const p = rr(-w / 2, -h / 2, w, h, 6); paperShape(g, p, { sd: 7, blur: 12 });
  inkShape(g, rr(-w / 2 + 8, -h / 2 + 8, 22, h - 16, 3), col);
  inkStroke(g, rr(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 4), 'navy', 3);
  inkText(g, s, 18, px * .36, { px, w: 800, fam: SANS, ls: ZH ? 4 : 3 });
  g.restore();
}

// ------------------------------------------------------------------ B: programmers lose their minds (7.1 - 9.8 s)
function starPath(R) {
  const p = new Path2D();
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU - Math.PI + Math.PI / 36, r = R * (i % 2 === 0 ? .985 : .80) * (1 + .03 * Math.sin(i * 2.7)); i ? p.lineTo(r * Math.cos(a), r * Math.sin(a)) : p.moveTo(r * Math.cos(a), r * Math.sin(a)); }
  p.closePath(); return p;
}
const STAR = { R: 1000 };   // the burst print is 2000 px square (print.py sheet_burst)
function secB(g, t, push) {
  const e = C.explode, k = rise(t, e, .42, 1.1), cy = mix(840, 905, eio(seg(t, e, e + 1.2))), cx = mix(530, 540, eio(seg(t, e, e + 1.2)));
  const sc = 1.5 * k, rot = .12 + .07 * (t - e);
  g.save(); g.translate(0, push);
  // the burst: a cut star sheet, growing from where the card was
  if (sc > .002) {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(sc, sc);
    const sp = starPath(STAR.R); g.save(); g.shadowColor = SHADOW; g.shadowBlur = 30; g.shadowOffsetY = 14; g.fillStyle = PAPER; g.fill(sp); g.restore();
    g.clip(sp); g.drawImage(P.riso_burst, -1000, -1000); g.restore();
  }
  CAMZ = 1;
  // the forum post drops in from the top, the votes roll
  const fk = rise(t, e + .3, .55, 1.2), fy = mix(-420, 448, fk), frot = -.025 + swing(t - (e + .75), .03, 2.5, 6);
  const FW = P.riso_forum.w, FH = P.riso_forum.h, fs = 980 / FW;
  put(g, P.riso_forum, 540, fy, { s: fs, rot: frot, sd: 12, draw: (x, ax, ay) => forumText(x, t, ax, ay, FW, FH) });
  // the programmers spring up, the sparks burst
  const gx = 540, gy = 1015, cs = 1080 / P.riso_coders_a.w * 1.0;
  const ka = rise(t, e + .02, .52, 1.5), kb = rise(t, e + .1, .52, 1.5);
  put(g, P.riso_coders_b, gx, gy + 1320 * (1 - kb), { s: cs, rot: swing(t - (e + .7), -.03, 3, 7), sd: 11 });
  put(g, P.riso_coders_a, gx, gy + 1320 * (1 - ka), { s: cs, rot: swing(t - (e + .6), .025, 3, 7), sd: 11 });
  const ks = settle(t - (e + .38), 5, 6);
  if (ks > 0) put(g, P.riso_coders_spark, gx, gy - 60, { s: cs * (.55 + .45 * ks + .02 * Math.sin((t - e) * 5)), rot: .1 * (1 - ks), a: cl((t - e - .38) * 7), ay: P.riso_coders_spark.h / 2 - 70 / cs, sd: 6 });
  // reactions
  bubble(g, T.bubbles[0], 230, 742, -.08, t - (e + .55), 'pink');
  bubble(g, T.bubbles[1], 852, 770, .07, t - (e + .78), 'blue');
  g.restore();
}
function forumText(g, t, ax, ay, FW, FH) {
  const k = FW / 1000, X = (v) => v * k - ax, Y = (v) => v * k - ay;
  // the headline, knocked out of the navy bar
  // (the panel runs the full height of the card: two big lines, centred in it)
  const L = T.forum, maxW = (1000 - 40 - 252 - 64) * k;
  const px = Math.min(fitPx(g, L[0], 800, (ZH ? 62 : 66) * k, SANS, maxW), fitPx(g, L[1], 800, (ZH ? 62 : 66) * k, SANS, maxW));
  const y0 = Y(200) - px * .32;
  inkText(g, L[0], X(286), y0, { px, w: 800, fam: SANS, align: 'left', knock: true });
  inkText(g, L[1], X(286), y0 + px * 1.24, { px, w: 800, fam: SANS, align: 'left', knock: true });
  // the vote count, rolling up
  const v = Math.round(mix(312, 18734, eio(seg(t, C.explode + .45, C.cue_end ?? C.kitchen - .1))));
  const s = v.toLocaleString('en-US');
  inkText(g, s, X(130), Y(332), { px: fitPx(g, s, 900, 52 * k, 'Fraunces', 160 * k), w: 900, fam: 'Fraunces' });
}
function bubble(g, s, x, y, rot, x0, col) {
  if (x0 <= 0) return;
  const k = settle(x0, 7, 11);
  g.save(); g.translate(x, y); g.rotate(rot + swing(x0, .12, 3, 9)); g.scale(k, k);
  const px = ZH ? 50 : 52; font(g, 900, px, SANS); const w = g.measureText(s).width + 64, h = px + 46;
  const p = new Path2D(); p.roundRect(-w / 2, -h / 2, w, h, h / 2); const tx = col === 'pink' ? 30 : -30;
  p.moveTo(tx - 22, h / 2 - 6); p.lineTo(tx + (col === 'pink' ? 10 : -10) * 3, h / 2 + 38); p.lineTo(tx + 22, h / 2 - 6);
  paperShape(g, p, { sd: 8, blur: 14 });
  inkShape(g, p, col, .9);
  inkStroke(g, p, 'navy', 5);
  inkText(g, s, 0, px * .36, { px, w: 900, fam: SANS });
  g.restore();
}

// ------------------------------------------------------------------ C: the kitchen, 128 chefs, one ticket, 8 cook (9.1 s -)
const ROWS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 21];
const PICK = [[0, 1], [1, 5], [2, 1], [3, 6], [5, 1], [6, 9], [8, 3], [9, 13]];   // [row, index] of the eight who cook
const PICK_D = [1, 5, 6, 4, 3, 2, 5, 3];                                               // and who they are (no twins side by side)
let CROWD = [];
function buildCrowd() {
  CROWD = []; let f = 1610;
  ROWS.forEach((n, r) => {
    const h = 3000 / n, sp = 1080 / n;
    for (let i = 0; i < n; i++) {
      const id = r * 100 + i, d = 1 + Math.floor(hs(id * 3.1 + .2) * 6), j = (hs(id * 7.7 + 1) - .5);
      const x = (i + .5) * sp + j * sp * .22 + (r % 2 ? sp * .18 : -sp * .1), y = f + (hs(id * 1.9) - .5) * h * .03;
      const pk = PICK.findIndex(([pr, pi]) => pr === r && pi === i);
      CROWD.push({ r, i, n, h, x, y, d: pk >= 0 ? PICK_D[pk] : d, flip: hs(id * 5.3 + 2) > .5, s: h / 560 * (1 + (hs(id * 2.3) - .5) * .06), rot: (hs(id * 4.1) - .5) * .03, pick: pk,
        t0: C.chefs - .42 + r * .11 + Math.abs(x - 540) / 540 * .13 + hs(id * 9.1) * .05 });   // the front rows rise as soon as the kitchen has landed
    }
    f -= .34 * h;
  });
}
function chefT(c) {   // the moment chef c steps forward (picked ones only): all eight out within ~0.8 s of the cue
  return C.eight + c.pick * .11;
}
function drawChef(g, c, t) {
  if (t < c.t0) return;
  const rising = t < c.t0 + .5;
  if (rising) { g.save(); g.beginPath(); g.rect(-400, -400, 1900, c.y + 3 + 400); g.clip(); }
  drawChef0(g, c, t);
  if (rising) g.restore();
}
function drawChef0(g, c, t) {
  const idle = P[`riso_chef_idle_${c.d}`], ghost = P[`riso_chef_idle_${c.d}_ghost`], cook = P[`riso_chef_cook_${c.d}`];
  const mi = M[`riso_chef_idle_${c.d}`], mc = M[`riso_chef_cook_${c.d}`];
  // each cut-out pops up out of a slot along its own feet line (a pop-up book): clipped below the line while it rises
  const up = rise(t, c.t0, .5, 1.6), a = 1;
  let x = c.x, y = c.y + (1 - up) * c.h * 1.02, s = c.s, rot = c.rot, lift = 1;
  if (c.pick < 0) {
    const gk = sst(seg(t, C.eight, C.eight + .7) * 1.0 - (c.r * .02));
    // waiting, not frozen: a slow breath and a little weight shift, each chef on his own phase (smooth, sub-pixel slow)
    const lv = cl((t - c.t0 - .5) * 1.5), ph = hs(c.r * 31 + c.i * 7.3) * TAU, br = lv * .011 * Math.sin(t * TAU / (2.4 + hs(c.i * 3.7 + c.r) * 1.2) + ph);
    rot += lv * .007 * Math.sin(t * TAU / (3.6 + hs(c.r * 5.1 + c.i) * 1.6) + ph * 1.7);
    put(g, idle, x, y, { s, sy: 1 + br, sx: 1 - br * .4, rot, flip: c.flip, ax: c.flip ? idle.w - mi.fx : mi.fx, ay: mi.fy, a, ghost, gk, sd: 6 * c.h / 300, sa: .3 });
    return;
  }
  // step forward, and flip the cut-out over to its cooking side (edge-on at the midpoint)
  const tk = chefT(c), st = settle(t - tk, 6.5, 7.5), fk = sst(seg(t, tk, tk + .3)), cooking = fk >= .5;
  const k0 = 1 + .38 * st; s *= k0; y += c.h * .1 * st - Math.sin(Math.PI * fk) * c.h * .07; lift = 1 + 2 * st;
  const cookT = t - (tk + .3), wob = cookT > 0 ? Math.min(1, cookT * 2) : 0;
  rot += wob * .04 * Math.sin(cookT * TAU * 1.4 + c.pick); const bob = wob * Math.abs(Math.sin(cookT * TAU * 1.4 + c.pick)) * c.h * .02;
  const Sp = cooking ? cook : idle, Mm = cooking ? mc : mi, fl = c.flip ? -1 : 1;
  put(g, Sp, x, y - bob, { s, sx: Math.max(.02, Math.abs(Math.cos(Math.PI * fk))), rot, flip: c.flip, ax: c.flip ? Sp.w - Mm.fx : Mm.fx, ay: Mm.fy, a, sd: 6 * c.h / 300, sa: .36, lift });
  // the number tag, pinned onto the toque itself (above it, it read as the tag of whoever stood behind)
  const tk2 = t - (tk + .26);
  if (tk2 > 0) {
    const k = settle(tk2, 7, 11), hgt = (Mm.fy - Mm.hy) * s, r = cl(.1 * hgt, 22, 38);
    const tx = x + fl * (Mm.hx - Mm.fx) * s, ty = y - bob - hgt + Math.max(r * 1.05, hgt * .085);
    g.save(); g.translate(tx, ty); g.scale(k, k); g.rotate(swing(tk2, .3, 3, 9));
    const p = new Path2D(); p.arc(0, 0, r, 0, TAU); paperShape(g, p, { sd: 5, blur: 9 });
    const q = new Path2D(); q.arc(0, 0, r * .8, 0, TAU); inkShape(g, q, 'pink');
    inkText(g, String(c.pick + 1), 0, r * .47, { px: r * 1.3, w: 900, fam: 'Fraunces', ko: false });
    g.restore();
  }
}
const TK = () => { const k = M.riso_ticket.k, pad = 11; return { peg: [(393) * k + pad, (19) * k + pad], mid: [(358.5) * k + pad, (816) * k + pad], tilt: .06 }; };
function secC(g, t, slide) {
  const kz = eio(seg(t, C.kitchen + .55, 12.1));
  const cam = { x: 540, y: mix(1135, 960, kz) - 10 * sst(seg(t, 12.1, DUR)), z: mix(1.2, 1.0, kz) + .035 * sst(seg(t, 12.1, DUR)) };
  CAMZ = cam.z;
  g.save(); g.translate(0, slide);
  // the sheet's leading edge throws a shadow onto the print below
  if (slide > 1) { const gr = g.createLinearGradient(0, -70, 0, 0); gr.addColorStop(0, 'rgba(30,24,64,0)'); gr.addColorStop(1, 'rgba(30,24,64,.45)'); g.fillStyle = gr; g.fillRect(-50, -70, W + 100, 70); }
  g.save(); g.translate(540, 960); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
  g.drawImage(P.riso_kitchen, 540 - P.riso_kitchen.width / 2, 960 - P.riso_kitchen.height / 2 + 40);
  // the brigade: back rows first; the eight who cook come forward over everyone
  const order = CROWD.slice().sort((a, b) => b.r - a.r);
  for (const c of order) if (c.pick < 0 || t < chefT(c)) drawChef(g, c, t);
  for (const c of order) if (c.pick >= 0 && t >= chefT(c)) drawChef(g, c, t);
  // 128 - a banner slid in on the number
  const tb = SY.many - .2;
  if (t > tb && t < C.ticket + .2) {
    const k = rise(t, tb, .6, 1.2), out = ei(seg(t, C.ticket - .55, C.ticket - .05));   // in from the left, out to the right
    banner(g, 540 - 1300 * (1 - k) + 1400 * out, 352 + 30 * out, -.035 + swing(t - tb - .5, .025, 2.6, 6) + .05 * out);
  }
  // the order ticket drops onto the rail and swings
  if (t > C.ticket - .1) {
    const k = rise(t, C.ticket - .1, .6, 1.1), tk = TK(), s = .86, py = mix(-700, 252, k), rot = swing(t - (C.ticket + .35), .1, 2.2, 6.5);
    railLine(g, cl((t - C.ticket + .1) * 5));
    put(g, P.riso_ticket, 540, py, { s, rot, ax: tk.peg[0], ay: tk.peg[1], sd: 14, lift: 1.3, draw: (x, ax, ay) => ticketText(x, ax, ay, tk) });
  }
  g.restore(); g.restore();
  return cam;
}
function railLine(g, a) { g.save(); g.globalAlpha = a; g.globalCompositeOperation = 'multiply'; g.fillStyle = PAT.navy; g.fillRect(-200, 236, 1480, 12); g.restore(); }
function ticketText(g, ax, ay, tk) {
  g.save(); g.translate(tk.mid[0] - ax, tk.mid[1] - ay); g.rotate(tk.tilt);
  if (ZH) inkText(g, T.ticket[0], 0, 4, { px: 118, w: 400, fam: HAND, ink: 'navy' });
  else { inkText(g, T.ticket[0], 0, -18, { px: 104, w: 400, fam: HAND }); inkText(g, T.ticket[1], 0, 92, { px: 104, w: 400, fam: HAND }); }
  g.restore();
}
function banner(g, x, y, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const w = 900, h = 196, p = rr(-w / 2, -h / 2, w, h, 8);
  paperShape(g, p, { sd: 12, blur: 22 }); inkShape(g, rr(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 4), 'pink');
  const n = T.banner[0], lab = T.banner[1];
  font(g, 900, 168, 'Fraunces'); const wn = g.measureText(n).width; font(g, 900, ZH ? 104 : 96, ZH ? SERIF : SANS); const wl = g.measureText(lab).width;
  const gap = 26, tot = wn + gap + wl, x0 = -tot / 2;
  inkText(g, n, x0, 60, { px: 168, w: 900, fam: 'Fraunces', align: 'left', hit: 'yellow', hx: -6, hy: -5, ko: true });
  inkText(g, lab, x0 + wn + gap, ZH ? 40 : 36, { px: ZH ? 104 : 96, w: 900, fam: ZH ? SERIF : SANS, align: 'left', ls: ZH ? 6 : 2, ko: true });
  g.restore();
}

// ------------------------------------------------------------------ one frame
function scene(g, t) {
  g.save(); g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const slideK = sst(seg(t, C.kitchen, C.kitchen + .8)), slide = 1990 * (1 - slideK);
  if (t < C.explode + .5) secA(g, t);
  if (t >= C.explode && slideK < 1) secB(g, t, 0);
  if (t >= C.kitchen) secC(g, t, slide);
  g.restore();
}
function camA(t) {   // one continuous move: a slow push on the cover, then down onto the card as the model lands
  const t0 = SY.move - .4, t1 = SY.land + .45, k1 = sst(seg(t, 0, 4.4)), k2 = eio(seg(t, t0, t1));
  return { x: mix(mix(540, 548, k1), A.gpu[0] + 8, k2), y: mix(mix(960, 975, k1), A.gpu[1] + 92, k2), z: mix(mix(1, 1.045, k1), 1.34, k2) + .035 * sst(seg(t, t1, C.explode + .6)) };
}
// sub-frames (a 180-degree shutter) only where things move fast
function nsub(t) {
  const e = C.explode, k = C.kitchen, tb = SY.many - .2, inW = (a, b) => t > a - .02 && t < b;
  if (inW(k, k + .85)) return 16;
  if (inW(e, e + .5)) return 12;
  if (inW(C.chefs - .45, 12.1) || inW(tb, tb + .65) || inW(C.ticket - .58, C.ticket + .6) || inW(e + .5, e + 1.0)) return 10;
  if (inW(SY.move - .45, SY.land + .9) || inW(C.eight - .05, C.eight + 1.5)) return 5;
  return 1;
}

// ------------------------------------------------------------------ captions (navy ink box, paper type)
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) { const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    const parts = (T.cap[v.id] || '').split('|'), lens = parts.map((p) => p.replace(/\//g, '').length), tot = lens.reduce((a, b) => a + b, 0);
    let acc = r.t; for (let i = 0; i < parts.length; i++) { const d = r.dur * lens[i] / tot; if (t < acc + d + (i === parts.length - 1 ? .25 : 0)) return parts[i]; acc += d; } }
  return null;
}
function captions(g, t) {
  const s = captionAt(t); if (!s) return;
  const rows = s.split('/'), px = ZH ? 54 : 50, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 700, lh = px * 1.28;
  g.save(); font(g, wt, px, fam); g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.min(780, Math.max(...rows.map((r) => g.measureText(r).width))), cy = 1372 - (rows.length - 1) * lh / 2;
  const bx = 540 - wmax / 2 - 28, by = cy - lh / 2 - 10, bw = wmax + 56, bh = rows.length * lh + 20;
  g.fillStyle = PAT.paper; g.fillRect(bx, by, bw, bh); g.globalCompositeOperation = 'multiply'; g.fillStyle = PAT.navy; g.fillRect(bx, by, bw, bh);
  g.globalCompositeOperation = 'source-over';
  rows.forEach((r, i) => { const f = Math.min(px, fitPx(g, r, wt, px, fam, 780)); font(g, wt, f, fam); g.fillStyle = PAPER; g.fillText(r, 540, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1200, 760, 240, '#ffd24d'); g.restore(); }

defineScene({
  meta: { title: 'Strata bake-off: riso', durationFrames: Math.round(17.5 * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 5, background: '#f1ebe2', fonts: ['Fraunces', 'Inter', 'Permanent Marker'], poster: 0 },
  setup,
  layers: [{ name: 'print', type: '2d', draw(ctx, g) {
    const t = ctx.sec, n = nsub(t), sh = .5 / FPS;
    const S = CFG.S, OX = CFG.OX, OY = CFG.OY;
    // n sub-frames over a half-frame shutter, summed exactly (8-bit running averages drop the late samples)
    let sum = null;
    for (let i = 0; i < n; i++) {
      const ti = n === 1 ? t : t + (i / (n - 1) - .5) * sh;
      FG.setTransform(1, 0, 0, 1, 0, 0); FG.clearRect(0, 0, FC.width, FC.height); FG.setTransform(S, 0, 0, S, OX, OY);
      scene(FG, Math.max(0, ti));
      if (n > 1) { const d = FG.getImageData(0, 0, FC.width, FC.height).data; if (!sum) sum = new Uint16Array(d.length); for (let j = 0; j < d.length; j++) sum[j] += d[j]; }
    }
    let src = FC;
    if (n > 1) { const im = AC.createImageData(FC.width, FC.height), o = im.data; for (let j = 0; j < o.length; j++) o[j] = (sum[j] + (n >> 1)) / n; AC.putImageData(im, 0, 0); src = ACC; }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(src, 0, 0); g.restore();
  } }],
  post(ctx, g) { if (CAPS) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
