// Hot-topic film (32 s): "125B MoE on ONE RTX 4090?" (Strata) x our ISCA'26 best paper's released traces.
// Same world as the L01-1 style cut v2: the toy theatre's stage fills the frame, risograph prints hang in front of it,
// smooth motion only, CC0 sound, the logo end card. The board shows one real layer of Qwen3-235B (128 experts):
// gold tiles are on the GPU (32 fit), the 8 picked per token pulse; hits ring green, misses flash red.
// The animated slice is real (anim.json, export_anim.py); the big numbers are the dataset results (../NOTES.md).
import { defineScene } from '/pv/runtime/pv.js';
import { makeStage, makePress, tone, ramp, loadImg, mk, cl, mix, eio, hs, TAU } from '/edu/kit2d/index.js';
import { STR } from './strings.js';

const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en', ZH = LANG === 'zh', T = STR[LANG];
const CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1';
const W = 1080, H = 1920, FPS = 30, DUR = 32.0;
const SERIF = ZH ? '"Noto Serif SC", Fraunces' : 'Fraunces', SANS = ZH ? '"Noto Sans SC", Inter' : 'Inter', MONO = '"JetBrains Mono"';
let TL, C, VO, ST, OPEN, AN;
const A = {}, P = {};

const seg = (t, a, b) => cl((t - a) / (b - a));
const sst = (k) => { k = cl(k); return k * k * (3 - 2 * k); };
const eo = (k) => 1 - Math.pow(1 - cl(k), 3), ei = (k) => Math.pow(cl(k), 3);
const settle = (x) => (x <= 0 ? 0 : 1 - Math.exp(-5.2 * x) * Math.cos(8.5 * x));
const swing = (x, a = .05) => (x <= 0 ? 0 : a * Math.exp(-2.4 * x) * Math.sin(7.5 * x));

const TF = { s: 1.62 }; TF.x = 540 - 509 * TF.s; TF.y = 330 - 373 * TF.s; TF.w = 1024 * TF.s; TF.h = 1386 * TF.s;
const tf = (u, v) => [TF.x + u * TF.s, TF.y + v * TF.s];
function addD(K, z, fn) { K.add(z, (x) => { x.save(); x.scale(z / 1000, z / 1000); x.translate(-540, -960); fn(x); x.restore(); }); }
function lightD(K, X, Y, z, r, c, a = 1, o = {}) { const k = z / 1000; K.light(Object.assign({ x: (X - 540) * k, y: (Y - 960) * k, z, rx: r * k, c, a, soft: .85 }, o, { ry: (o.ry ?? r) * k })); }
const clipOpen = (x, g = 0) => { x.beginPath(); OPEN.forEach(([a, b], i) => { const gx = a + (a < 540 ? -g : g); i ? x.lineTo(gx, b) : x.moveTo(gx, b); }); x.closePath(); x.clip(); };
function font(g, w, px, fam) { g.font = `${w} ${px}px ${fam}`; }
function fitPx(g, s, w, px, fam, maxW) { font(g, w, px, fam); const m = g.measureText(s).width; return m > maxW ? px * maxW / m : px; }
function text(g, s, X, Y, w, px, fam, o = {}) { g.save(); font(g, w, px, fam); g.textAlign = o.align ?? 'center'; g.textBaseline = o.base ?? 'alphabetic'; g.fillStyle = o.fill ?? '#000'; g.fillText(s, X, Y); g.restore(); }
function copyOf(c) { const o = mk(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); return o; }
function riso(key, w, h, inks, draw, k = 2) { const p = makePress({ W: w * k, H: h * k, k, unit: k * .85, seed: key, inks }); p.begin(); draw(p, w, h); const o = copyOf(p.print({ key })); o.w = w; o.h = h; return o; }
function hit2(p, s, X, Y, w, px, fam, key = 'navy') { text(p.plate('pink'), s, X + 3, Y + 3, w, px, fam); text(p.plate(key), s, X, Y, w, px, fam); }

// ------------------------------------------------------------------ prints
const GRID = { cols: 16, rows: 8, cell: 50, gap: 4 }; GRID.w = GRID.cols * (GRID.cell + GRID.gap) - GRID.gap; GRID.h = GRID.rows * (GRID.cell + GRID.gap) - GRID.gap;
const BOARD = { w: 940, h: 880, gx: (940 - GRID.w) / 2, gy: 150 };
function bakePrints() {
  P.hook = riso('hook' + LANG, 600, 360, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const N = p.plate('navy'); p.plate('yellow').fillStyle = tone(1); p.plate('yellow').fillRect(0, 0, w, h);
    const ps = p.plate('pink', 'screen'); ps.fillStyle = ramp(ps, 0, 0, 0, h, .1, .3); ps.fillRect(0, 0, w, h);
    const f1 = fitPx(N, T.hook[0], 900, 120, SERIF, w - 60), f2 = fitPx(N, T.hook[1], 900, 80, SERIF, w - 60);
    hit2(p, T.hook[0], w / 2, 40 + f1 * .9, 900, f1, SERIF); hit2(p, T.hook[1], w / 2, 60 + f1 + f2 * .95, 900, f2, SERIF);
    text(N, T.hookTag, w / 2, h - 30, 600, fitPx(N, T.hookTag, 600, 24, SANS, w - 50), SANS);
  });
  P.board = riso('board' + LANG, BOARD.w, BOARD.h, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const N = p.plate('navy'), ps = p.plate('pink', 'screen'); ps.fillStyle = tone(.12); ps.fillRect(0, 0, w, h);
    text(N, T.board, w / 2, 70, 900, fitPx(N, T.board, 900, 48, SERIF, w - 80), SERIF);
    // the 128 tiles, printed as empty frames with their numbers
    for (let i = 0; i < 128; i++) { const c = i % GRID.cols, r = Math.floor(i / GRID.cols), x = BOARD.gx + c * (GRID.cell + GRID.gap), y = BOARD.gy + r * (GRID.cell + GRID.gap);
      N.fillStyle = tone(1); N.fillRect(x, y, GRID.cell, 2); N.fillRect(x, y + GRID.cell - 2, GRID.cell, 2); N.fillRect(x, y, 2, GRID.cell); N.fillRect(x + GRID.cell - 2, y, 2, GRID.cell);
      text(N, String(i), x + GRID.cell / 2, y + GRID.cell / 2 + 6, 600, 15, MONO); }
    // legend
    const ly = BOARD.gy + GRID.h + 46; p.plate('yellow').fillStyle = tone(1); p.plate('yellow').fillRect(BOARD.gx, ly - 20, 26, 26);
    text(N, T.legendGpu, BOARD.gx + 38, ly, 600, 24, SANS, { align: 'left' });
    N.fillStyle = tone(.45); N.fillRect(BOARD.gx + GRID.w / 2 + 40, ly - 20, 26, 26); text(N, T.legendRam, BOARD.gx + GRID.w / 2 + 78, ly, 600, 24, SANS, { align: 'left' });
    text(N, T.fine, w / 2, h - 26, 500, fitPx(N, T.fine, 500, 19, SANS, w - 60), SANS);
  });
  P.paper = riso('paper' + LANG, 620, 420, ['yellow', 'pink', 'navy'], (p, w, h) => {
    const N = p.plate('navy'); p.plate('yellow').fillStyle = tone(1); p.plate('yellow').fillRect(18, 18, w - 36, h - 36);
    hit2(p, T.paper[0], w / 2, 110, 900, fitPx(N, T.paper[0], 900, 64, SERIF, w - 70), SERIF);
    text(N, T.paper[1], w / 2, 168, 600, fitPx(N, T.paper[1], 600, 26, SANS, w - 70), SANS); text(N, T.paper[2], w / 2, 202, 600, fitPx(N, T.paper[2], 600, 26, SANS, w - 70), SANS);
    p.plate('pink').fillStyle = tone(1); p.plate('pink').fillRect(110, 236, w - 220, 64);
    text(N, T.paper[3], w / 2, 280, 900, fitPx(N, T.paper[3], 900, 36, SERIF, w - 260), SERIF);
    text(N, T.data, w / 2, h - 46, 500, fitPx(N, T.data, 500, 18, MONO, w - 70), MONO);
  });
  P.end = riso('end' + LANG, 600, 520, ['yellow', 'navy'], (p, w, h) => {
    const N = p.plate('navy'); N.fillStyle = tone(1); N.fillRect(40, 404, w - 80, 2);
    text(N, T.end[0], w / 2, 448, 700, fitPx(N, T.end[0], 700, 24, MONO, w - 70), MONO); text(N, T.end[1], w / 2, 492, 700, fitPx(N, T.end[1], 700, 30, ZH ? SERIF : MONO, w - 70), ZH ? SERIF : MONO);
  });
}

// ------------------------------------------------------------------ setup
async function setup(ctx) {
  TL = await (await fetch('timeline.json')).json(); C = TL.cue; AN = await (await fetch('anim.json')).json();
  try { VO = await (await fetch(`vo_${LANG}.json`)).json(); } catch (e) { VO = null; }
  for (const n of ['theatre_front', 'curtain_closed']) A[n] = await loadImg('/edu/art/cut/' + n + '.png');
  A.desk = await loadImg('/edu/art/src/desk_night.png'); A.inside = await loadImg('/edu/art/src/stage_inside.png'); A.logo = await loadImg('/edu/art/brand/picasso_logo.png');
  if (ZH) await Promise.all([`900 80px ${SERIF}`, `700 30px ${SANS}`].map((f) => document.fonts.load(f, '一张游戏显卡跑参数')));
  const im = A.theatre_front, c = mk(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data, Wd = c.width, L = [], R = [];
  for (let v = 373; v <= 1198; v += 4) { const al = (u) => d[(v * Wd + u) * 4 + 3]; if (al(512) > 60) continue; let a = 512, b = 512; while (a > 0 && al(a - 1) < 60) a--; while (b < Wd - 1 && al(b + 1) < 60) b++; L.push(tf(a + 2, v)); R.push(tf(b - 2, v)); }
  OPEN = [...L, ...R.reverse()];
  bakePrints();
  ST = makeStage({ W: ctx.W, H: ctx.H, S: ctx.S, OX: ctx.cfg.OX, OY: ctx.cfg.OY, DW: ctx.DW, DH: ctx.DH, bg: '#07050a' });
}

// ------------------------------------------------------------------ the board's live state
// which token is showing, in which mode; random picks and a random GPU set are hashed per token
const TOKDUR = .34;
function state(t) {
  if (t < C.tokens) return null;
  const mode = t < C.random ? 'intro' : t < C.real ? 'random' : 'real', t0 = mode === 'intro' ? C.tokens : mode === 'random' ? C.random : C.real;
  const n = Math.floor((t - t0) / TOKDUR), k = ((t - t0) % TOKDUR) / TOKDUR;
  if (mode === 'random') {
    const res = new Set(); for (let i = 0; res.size < 32; i++) res.add(Math.floor(hs(i * 3.7 + 11) * 128));
    const ex = []; for (let i = 0; ex.length < 8; i++) { const e = Math.floor(hs(n * 41.3 + i * 7.1 + .5) * 128); if (!ex.includes(e)) ex.push(e); }
    return { mode, n, k, resident: res, experts: ex, hit: ex.map((e) => res.has(e)) };
  }
  const f = AN.frames[n % AN.frames.length];
  return { mode, n, k, resident: new Set(f.resident), experts: f.experts, hit: f.hit };
}
function boardLive(x, t, w, h) {
  const s = w / BOARD.w, st = state(t), showGpu = t >= C.gpu ? sst(seg(t, C.gpu, C.gpu + .6)) : 0;
  const cell = (i) => [-w / 2 + (BOARD.gx + (i % GRID.cols) * (GRID.cell + GRID.gap)) * s, (BOARD.gy + Math.floor(i / GRID.cols) * (GRID.cell + GRID.gap)) * s, GRID.cell * s];
  const resident = st ? st.resident : new Set(AN.frames[0].resident);
  x.save(); x.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 128; i++) { const [cx, cy, cs] = cell(i), on = resident.has(i);
    x.fillStyle = on ? `rgba(255,214,60,${.95 * showGpu})` : 'rgba(120,118,130,.42)'; x.fillRect(cx + 3, cy + 3, cs - 6, cs - 6); }
  x.restore();
  if (!st) return;
  // the 8 picked experts of this token: a pulse, then a green ring (already on the GPU) or a red flash (must be copied)
  st.experts.forEach((e, j) => { const [cx, cy, cs] = cell(e), k = st.k, pulse = Math.sin(Math.PI * cl(k * 1.4)), hit = st.hit[j];
    x.save(); x.lineWidth = 6 * s; x.strokeStyle = hit ? `rgba(22,140,72,${.95})` : 'rgba(205,36,30,.95)';
    if (!hit) { x.fillStyle = `rgba(205,36,30,${.55 * pulse})`; x.fillRect(cx, cy, cs, cs); }
    x.strokeRect(cx - 3 * pulse, cy - 3 * pulse, cs + 6 * pulse, cs + 6 * pulse); x.restore(); });
  // the hit-rate counter: the dataset results (random 25%, real 77%), rolling up as tokens pass
  if (st.mode !== 'intro') {
    const target = st.mode === 'random' ? 25 : 77, t0 = st.mode === 'random' ? C.random : C.real, v = Math.round(mix(st.mode === 'random' ? 0 : 25, target, eo(seg(t, t0 + .3, t0 + 2.6))));
    const lab = st.mode === 'random' ? T.random : T.real, ly = (BOARD.gy + GRID.h + 120) * s;
    text(x, lab, 0, ly, 800, 30 * s, SANS, { fill: st.mode === 'random' ? '#8a2a20' : '#1d5a3a' });
    text(x, T.hit, -150 * s, ly + 110 * s, 700, 34 * s, SANS, { fill: '#203892' });
    text(x, v + '%', 150 * s, ly + 126 * s, 900, 130 * s, SERIF, { fill: st.mode === 'random' ? '#b8261e' : '#16884a' });
    if (t >= C.times) { const k = settle((t - C.times) * 1.6); x.save(); x.translate(392 * s, ly - 18 * s); x.rotate(-.18); x.scale(k, k); x.globalCompositeOperation = 'multiply';
      x.strokeStyle = 'rgba(205,36,30,.9)'; x.lineWidth = 7 * s; x.beginPath(); x.arc(0, 0, 70 * s, 0, TAU); x.stroke(); text(x, T.times, 0, 26 * s, 900, 76 * s, SERIF, { fill: 'rgba(205,36,30,.95)' }); x.restore(); }
  }
}

// ------------------------------------------------------------------ hanging prints
function hangCard(K, z, im, X, Ytop, w, t, o = {}) {
  addD(K, z, (x) => {
    const h = w * im.h / im.w, rot = (o.rot ?? 0) + Math.sin(t * .8 + (o.ph ?? 0)) * .003;
    x.save(); x.strokeStyle = 'rgba(232,222,204,.6)'; x.lineWidth = 2; for (const s of [-.38, .38]) { x.beginPath(); x.moveTo(X + s * w, Ytop + 4); x.lineTo(X + s * w * .98, Ytop - 2400); x.stroke(); } x.restore();
    x.save(); x.translate(X, Ytop); x.rotate(rot);
    x.save(); x.globalAlpha = .5; x.fillStyle = '#0b0607'; x.filter = 'blur(14px)'; x.fillRect(-w / 2 + 14, 22, w, h); x.restore();
    x.fillStyle = '#cfc6b6'; x.fillRect(-w / 2 + 3, 4, w, h); x.drawImage(im, -w / 2, 0, w, h); if (o.draw) o.draw(x, w, h);
    for (const s of [-.3, .3]) { x.fillStyle = '#b48a55'; x.fillRect(s * w - 8, -14, 16, 36); }
    x.restore();
  });
}
function endDraw(x, t, w, h) {
  const s = w / 600, L = A.logo, lw = 520 * s, lh = lw * L.height / L.width, lx = -lw / 2, ly = 24 * s, k0 = t - C.logo - .25;
  const parts = [[0, 230, 410, 640], [370, 0, 790, 420], [760, 230, 1168, 640], [330, 600, 860, 720]];
  x.save(); x.globalCompositeOperation = 'multiply';
  parts.forEach(([u0, v0, u1, v1], i) => { const k = settle((k0 - i * .12) * 2.2); if (k <= 0) return; const cx = lx + (u0 + u1) / 2 / L.width * lw, cy = ly + (v0 + v1) / 2 / L.height * lh, pw = (u1 - u0) / L.width * lw, ph = (v1 - v0) / L.height * lh;
    x.save(); x.translate(cx, cy); x.scale(k, k); x.drawImage(L, u0, v0, u1 - u0, v1 - v0, -pw / 2, -ph / 2, pw, ph); x.restore(); });
  x.restore();
}
function flown(K, t) {
  if (t < C.hookUp + 1) hangCard(K, 975, P.hook, 540, mix(420, -900, ei(seg(t, C.hookUp, C.hookUp + .8))), 880, t, { rot: swing(t - C.hookUp, .03) });
  if (t >= C.board && t < C.paper + .6) { const y = t < C.paper ? mix(-1100, 300, settle((t - C.board) * 1.2)) : mix(300, -1300, ei(seg(t, C.paper, C.paper + .55)));
    hangCard(K, 972, P.board, 540, y, 960, t, { rot: swing(t - C.board, .03), ph: 1, draw: (x, w, h) => boardLive(x, t, w, h) }); }
  if (t >= C.paper) { const y = t < C.curtain ? mix(-900, 520, settle((t - C.paper) * 1.2)) : mix(520, -1100, ei(seg(t, C.curtain, C.curtain + .5)));
    hangCard(K, 974, P.paper, 540, y, 900, t, { rot: swing(t - C.paper, .04), ph: 2 }); }
  if (t >= C.logo) hangCard(K, 975, P.end, 540, mix(-900, 520, settle((t - C.logo) * 1.3)), 860, t, { rot: swing(t - C.logo, .035), ph: 3, draw: (x, w, h) => endDraw(x, t, w, h) });
}

// ------------------------------------------------------------------ set, camera, light
function set(K, t) {
  addD(K, 3000, (x) => { const w = 2300, h = w * A.desk.height / A.desk.width; x.drawImage(A.desk, 540 - w / 2 - 120, 960 - h / 2 - 260, w, h); });
  addD(K, 1150, (x) => { x.save(); clipOpen(x, 40); x.drawImage(A.inside, -40, 0, 1160, 1160 * A.inside.height / A.inside.width); x.restore(); });
  if (t >= C.curtain) { const k = sst(seg(t, C.curtain, C.curtainClosed)); addD(K, 1003, (x) => { x.save(); clipOpen(x, 10); const w = 1180, h = w * A.curtain_closed.height / A.curtain_closed.width;
    x.drawImage(A.curtain_closed, 540 - w / 2, mix(320 - h, 300, k), w, h); x.restore(); }); }
  addD(K, 1000, (x) => x.drawImage(A.theatre_front, TF.x, TF.y, TF.w, TF.h));
}
function camera(K, t) {
  const keys = [[0, [540, 900, 1.0]], [4.2, [540, 880, 1.03]], [C.board + 1, [540, 860, 1.0]], [C.real - .2, [540, 860, 1.02]], [C.real + 1, [540, 900, 1.07]],
    [C.paper - .1, [540, 900, 1.08]], [C.paper + .8, [540, 900, 1.0]], [DUR, [540, 900, 1.03]]];
  let a = keys[0], b = keys[keys.length - 1]; for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t < keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
  const k = eio(seg(t, a[0], b[0])), zm = mix(a[1][2], b[1][2], k);
  K.cam.z = 1000 * (1 - 1 / zm); K.cam.x = mix(a[1][0], b[1][0], k) - 540; K.cam.y = mix(a[1][1], b[1][1], k) - 960; K.focus(975, 30, 18);
}
function lights(K, t) {
  K.ambient(96, 90, 102); K.flicker(0); K.vignette(.38); K.grain(.04); K.haze(.04);
  lightD(K, 540, 960, 3000, 3600, [150, 146, 150], 1, { zmin: 2000, soft: 1 });
  lightD(K, 380, 700, 1000, 1500, [150, 124, 96], 1, { zmin: 980, zmax: 1009, soft: 1 });
  lightD(K, 540, 700, 1150, 900, [46, 60, 116], 1, { zmin: 1120, soft: 1 });
  lightD(K, 540, 820, 1080, 760, [180, 136, 92], 1, { zmin: 1010, zmax: 1300, soft: .7 });
  lightD(K, 400, 700, 970, 1300, [165, 145, 116], 1, { zmin: 900, zmax: 999, soft: 1 });
  lightD(K, 700, 1100, 970, 900, [56, 50, 56], 1, { zmin: 900, zmax: 999, soft: 1 });
}

// ------------------------------------------------------------------ captions
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) { const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    const parts = (T.cap[v.id] || '').split('|'), lens = parts.map((p) => p.replace(/\//g, '').length), tot = lens.reduce((a, b) => a + b, 0);
    let acc = r.t; for (let i = 0; i < parts.length; i++) { const d = r.dur * lens[i] / tot; if (t < acc + d + (i === parts.length - 1 ? .25 : 0)) return parts[i]; acc += d; } }
  return null;
}
function captions(g, t) {
  const s = captionAt(t); if (!s) return;
  const rows = s.split('/'), px = ZH ? 56 : 54, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.24;
  g.save(); font(g, wt, px, fam); g.textAlign = 'center'; g.textBaseline = 'middle';
  const wmax = Math.min(780, Math.max(...rows.map((r) => g.measureText(r).width))), cy = 1376 - (rows.length - 1) * lh / 2;
  g.fillStyle = 'rgba(12,8,10,.58)'; g.beginPath(); g.roundRect(540 - wmax / 2 - 26, cy - lh / 2 - 12, wmax + 52, rows.length * lh + 24, 20); g.fill();
  rows.forEach((r, i) => { const f = Math.min(px, fitPx(g, r, wt, px, fam, 780)); font(g, wt, f, fam); g.fillStyle = '#fbf7ef'; g.fillText(r, 540, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1200, 760, 240, '#ffd24d'); g.restore(); }

defineScene({
  meta: { title: 'Strata x Patterns behind Chaos', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 9, background: '#07050a', fonts: ['Fraunces', 'Inter', 'JetBrains Mono'], poster: 0 },
  setup,
  layers: [{ name: 'film', type: '2d', draw(ctx, g) { const t = ctx.sec, K = ST.frame(t); camera(K, t); lights(K, t); set(K, t); flown(K, t); ST.render(K, g); } }],
  post(ctx, g) { if (CAPS && ctx.sec < C.curtain) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
