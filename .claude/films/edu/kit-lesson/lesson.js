// kit-lesson/lesson.js - one lesson film from data: lesson.html?ep=<episode>&lang=en reads the episode folder
// (episode.json, strings.json, timeline.json, vo_<lang>.json; drawings and slides where episode.json points) and plays
// it in the line look of L01 "Background" (episodes/l01-5min): one long sheet of warm paper, panels stacked 2000 px
// apart, one smooth camera, ink drawings that draw themselves, the red pen, washes, her slides taped on, her clips with
// a mic tag, captions, and the logo end card that lifts back onto the cover (frame 0) so the video loops.
// ep = a folder name under episodes/ ("l01-01"), a path under /edu ("episodes/l01-01") or an absolute URL path.
// ?lang=en|zh  ?guides=1 (safe zones)  ?cap=0 (no captions)  ?strict=1 (a missing drawing is an error, not cyan)
// Every frame is a pure function of t. README.md has the episode.json schema.
import { defineScene } from '/pv/runtime/pv.js';
import { loadImg, mk, mix } from '/edu/kit2d/index.js';
import * as K from './ink.js';
import { runItems, compilePanels, makeTime, byLang } from './items.js';

const { W, H, PAPER, INK, RED, css, A, F, seg, eio, eo, spring, fadeIO } = K;
const Q = new URLSearchParams(location.search);
const LANG = Q.get('lang') === 'zh' ? 'zh' : 'en';
K.setLang(LANG);
const ZH = F.zh, CAPS = Q.get('cap') !== '0', GUIDES = Q.get('guides') === '1', STRICT = Q.get('strict') === '1';
const EPQ = (Q.get('ep') || '').replace(/\/+$/, '');
const EP = EPQ.startsWith('/') ? EPQ : EPQ.includes('/') ? '/edu/' + EPQ : '/edu/episodes/' + EPQ;
// a path from episode.json: absolute ("/edu/...") as is, else relative to `base` (default: the episode folder)
const rel = (p, base = EP) => (p.startsWith('/') ? p : new URL(p, location.origin + base + '/').pathname);
async function getJSON(p) { const r = await fetch(p); if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`); return r.json(); }

// ------------------------------------------------------------------ the episode (fetched before the scene is defined)
let E = {}, TL = { fps: 30, dur: 1, cue: {}, vo: [] }, T = {}, VO = null, BOOT = null;
try {
  if (!EPQ) throw new Error('lesson.html needs ?ep=<episode folder>');
  E = await getJSON(rel('episode.json'));
  TL = await getJSON(rel(E.timeline || 'timeline.json'));
  const sp = E.strings || 'strings.json';
  const STR = sp.endsWith('.js') ? (await import(rel(sp))).STR : await getJSON(rel(sp));
  T = STR[LANG] || STR.en;
  try { VO = await getJSON(rel((E.vo && E.vo[LANG]) || `vo_${LANG}.json`)); } catch (e) { VO = null; console.warn('no voice timing: ' + e.message); }
} catch (e) { BOOT = e; }
const C = TL.cue || {}, FPS = TL.fps || 30, DUR = TL.dur;
const CAM = Object.assign({ gap: 2000, pan: 1.0, dip: .86, push: 1.035, drift: 6 }, E.camera || {});
const PY = (k) => k * CAM.gap;
let PANELS = [], END = 0, CT, CX, CY, CZ;
const S = {}, IMG = {}, ST = {}, MISSING = [];
const R = { T, S, IMG, ST, refs: {}, depth: 0, text };
function text(key) {
  let v = T;
  for (const p of String(key).split('.')) { if (v == null || !(p in v)) throw new Error(`no string "${key}"`); v = v[p]; }
  if (typeof v !== 'string' && !(Array.isArray(v) && v.every((s) => typeof s === 'string'))) throw new Error(`string "${key}" is not text`);
  return v;
}

// ------------------------------------------------------------------ the camera: one sheet, panel after panel
function camKeys() {
  const n = PANELS.length - 1, Ks = [[0, 540, 960, 1]];
  for (let k = 1; k <= n; k++) {
    const t0 = PANELS[k].arrive, y0 = PY(k - 1) + 960, y1 = PY(k) + 960, prev = Ks[Ks.length - 1];
    Ks.push([t0, prev[1], prev[2], prev[3]]); Ks.push([t0 + CAM.pan * .5, 540, (y0 + y1) / 2, CAM.dip]); Ks.push([t0 + CAM.pan, 540, y1, 1]);
    const nxt = k < n ? PANELS[k + 1].arrive : DUR;
    Ks.push([nxt - .02, 540, y1 + CAM.drift, CAM.push]);   // a slow push-in while the panel holds
  }
  // a panel's own moves ("camera": [{at, xy, z}], in panel px), merged in time order
  PANELS.forEach((P, k) => { for (const c of P.camera) Ks.push([c.at, c.xy[0], PY(k) + c.xy[1], c.z ?? 1]); });
  return Ks.sort((a, b) => a[0] - b[0]);
}
const camAt = (t) => ({ x: K.hermite(CT, CX, t), y: K.hermite(CT, CY, t), z: Math.exp(K.hermite(CT, CZ, t)) });
function drawPanel(g, k, t) { R.refs = {}; R.depth = 0; runItems(g, t, PANELS[k].items, R); }

// ------------------------------------------------------------------ her voice: the mic tag while a clip plays
function micTag(g, t) {
  if (!VO) return;
  for (const v of TL.vo) {
    if (v.id[0] !== 'c' || !VO[v.id]) continue;
    const r = VO[v.id], a = fadeIO(t, r.t - .15, r.t + r.dur, .3, .4); if (a <= 0) continue;
    g.save(); g.globalAlpha = a;
    K.wash(g, t, 0, 960, 410, 220, r.t - .3, { a: .55, rot: .3 });
    if (S._mic) K.put(g, K.paint(S._mic, seg(t, r.t - .15, r.t + .5)), 960, 405, 120);
    g.restore();
    K.L(g, t, T.mic, 890, 545, ZH ? 34 : 36, RED, r.t, r.t + r.dur, { align: 'right', patch: .3 });
  }
}

// ------------------------------------------------------------------ the end card: the real logo printed on the paper
function endCard(g, t) {
  if (t < END) return;
  const loop = DUR - .6, up = eio(seg(t, END, END + .55)), away = eio(seg(t, loop, DUR - .02)), y = mix(H, 0, up) - away * H;
  g.save(); g.translate(0, y);
  g.fillStyle = css([252, 249, 242]); g.fillRect(0, 0, W, H);
  g.save(); g.globalCompositeOperation = 'multiply'; for (let ty = 0; ty < H; ty += A.paper.height) for (let tx = 0; tx < W; tx += A.paper.width) g.drawImage(A.paper, tx, ty); g.restore();
  const L0 = A.logo, lw = 700, lh = lw * L0.height / L0.width, lx = 540 - lw / 2, ly = 400, k0 = t - END - .4;
  const parts = [[0, 230, 410, 640], [370, 0, 790, 420], [760, 230, 1168, 640], [330, 600, 860, 720]];   // picasso_logo.png
  g.save(); g.globalCompositeOperation = 'multiply';
  parts.forEach(([u0, v0, u1, v1], i) => {
    const kk = spring((k0 - i * .12) * 1.0, 5.2, 8.5); if (k0 - i * .12 <= 0) return;
    const cx = lx + (u0 + u1) / 2 / L0.width * lw, cy = ly + (v0 + v1) / 2 / L0.height * lh, pw = (u1 - u0) / L0.width * lw, ph = (v1 - v0) / L0.height * lh;
    g.save(); g.translate(cx, cy); g.scale(kk, kk); g.drawImage(L0, u0, v0, u1 - u0, v1 - v0, -pw / 2, -ph / 2, pw, ph); g.restore();
  });
  g.restore();
  const e = T.end, e0 = END + .9;
  K.L(g, t, e[0], 540, 1030, K.fitPx(g, e[0], ZH ? 48 : 52, 900), INK, e0, null, { dur: .5 });
  K.L(g, t, e[1], 540, 1118, K.fitPx(g, e[1], ZH ? 60 : 66, 860), RED, e0 + .35, null, { dur: .45, fam: ZH ? F.HAND : F.LAT });
  K.L(g, t, e[2], 540, 1200, K.fitPx(g, e[2], ZH ? 42 : 46, 860), INK, e0 + .7, null, { dur: .45 });
  if (t > e0 + .65) K.pen(g, K.curve(360, 1153, 720, 1148, .02), seg(t, e0 + .65, e0 + 1.0), RED, 4);
  const fa = .78 * eo(seg(t, e0 + 1.1, e0 + 1.6));
  if (fa > 0) (T.fine || []).forEach((s2, i) => { const px = K.fitPx(g, s2, ZH ? 20 : 20, 960, F.SW, F.SANS); K.sans(g, s2, 540, 1300 + i * 32, px, INK, fa); });
  g.restore();
}

// ------------------------------------------------------------------ captions: parts timed on word marks (clips: on length)
// strings.cap[id] = 'part|part' ('|' splits a line into parts shown one after another, '/' forces a row break)
const normS = (s) => s.toLowerCase().replace(/[^0-9a-z㐀-鿿]/g, '');
const CAPT = {};
function capParts(id) {
  if (CAPT[id]) return CAPT[id];
  const r = VO[id], parts = ((T.cap || {})[id] || '').split('|'), words = r.words || [], out = [];
  if (!words.length) {   // her clips: parts share the clip's length by their number of letters
    const lens = parts.map((p) => Math.max(1, normS(p).length)), tot = lens.reduce((a, b) => a + b, 0); let acc = 0;
    parts.forEach((p, k) => { out.push({ s: p, t0: r.t + r.dur * acc / tot }); acc += lens[k]; });
  } else {
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
  }
  out.forEach((o, k) => { o.t1 = k + 1 < out.length ? out[k + 1].t0 - .04 : r.t + r.dur + .25; });
  return (CAPT[id] = out);
}
function captionAt(t) {
  if (!VO) return null;
  for (const v of TL.vo) {
    const r = VO[v.id]; if (!r || t < r.t - .05 || t > r.t + r.dur + .25) continue;
    for (const p of capParts(v.id)) if (t >= p.t0 - .05 && t <= p.t1) return { s: p.s, her: v.id[0] === 'c' };
  }
  return null;
}
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
// the narrator's captions in black; hers in dark red with a red border, so they read as hers
function captions(g, t) {
  const c = captionAt(t); if (!c) return;
  const px = ZH ? 50 : 46, fam = ZH ? '"Noto Sans SC", Inter' : 'Inter', wt = ZH ? 700 : 600, lh = px * 1.28;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  const rows = capRows(g, c.s, px, wt, fam), fs = rows.map((r) => Math.min(px, K.fitPx(g, r, px, CAPW, wt, fam)));
  const wmax = Math.max(...rows.map((r, i) => { g.font = `${wt} ${fs[i]}px ${fam}`; return g.measureText(r).width; })), cy = 1370 - (rows.length - 1) * lh / 2;
  g.fillStyle = css(PAPER, .95); g.strokeStyle = css(c.her ? RED : INK, .9); g.lineWidth = 3;
  g.beginPath(); g.roundRect(CAPX - wmax / 2 - 28, cy - lh / 2 - 11, wmax + 56, rows.length * lh + 22, 16); g.fill(); g.stroke();
  rows.forEach((r, i) => { g.font = `${wt} ${fs[i]}px ${fam}`; g.fillStyle = css(c.her ? [150, 36, 26] : INK); g.fillText(r, CAPX, cy + i * lh + 2); });
  g.restore();
}
function guides(g) { g.save(); g.lineWidth = 3; const b = (x, y, w, h, c) => { g.strokeStyle = c; g.setLineDash([12, 8]); g.strokeRect(x, y, w, h); }; b(0, 0, W, 260, '#ff4d6d'); b(0, 1480, W, 440, '#ff4d6d'); b(880, 700, 200, 780, '#ff4d6d'); b(120, 1300, 760, 140, '#ffd24d'); g.restore(); }

// ------------------------------------------------------------------ setup
function placeholder(name) {
  const c = mk(600, 400), g = c.getContext('2d'); g.fillStyle = 'rgb(0,255,255)'; g.fillRect(0, 0, 600, 400); c.ph = true; MISSING.push(name); return c;
}
const ART = () => rel(E.assets?.artDir || 'art/cut');
async function art(name) {
  try { return await loadImg(`${ART()}/${name}.png`); } catch (e) { if (STRICT) throw new Error('missing drawing ' + name); return placeholder(name); }
}
function allText(v, out = []) { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => allText(x, out)); return out; }

async function setup() {
  if (BOOT) throw BOOT;
  if (!(DUR > 0)) throw new Error('timeline.json has no dur');
  await document.fonts.load('700 60px Caveat');
  const as = byLang(E.assets || {}, LANG), D = as.drawings || {}, SL = as.slides || {}, SM = as.stamps || {};
  // drawings: packed ink sprites (art/cut, written by hot-strata/bakeoff/line/ink.py), built at width w
  const names = [...new Set([...Object.values(D).map((d) => d.src), ...Object.values(SM).map((s) => s.from)])];
  const imgs = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await art(n)])));
  for (const [k, d] of Object.entries(D)) { const im = imgs[d.src]; S[k] = K.sprite(im, (d.w ?? im.width) / im.width, d.boost ?? .2); }
  const micKey = (E.mic && E.mic.drawing) || 'mic'; S._mic = S[micKey] || null;
  // stamps: a finished crop of a drawing (crop in source px), scaled to size
  for (const [k, s] of Object.entries(SM)) {
    const done = K.paint(K.sprite(imgs[s.from], 1, s.boost ?? .3), 1), [cx, cy, cw, ch] = s.crop, [w, h] = s.size ?? [cw, ch];
    const c = mk(w, h); c.getContext('2d').drawImage(done, cx, cy, cw, ch, 0, 0, w, h); ST[k] = c;
  }
  // slides: PNGs (git-ignored course material) in slideDir
  const sdir = rel(as.slideDir || 'slides');
  await Promise.all(Object.entries(SL).map(async ([k, s]) => { IMG[k] = await loadImg(rel(s.src, sdir)); }));
  const [paper, logo, w, tp] = await Promise.all([loadImg('/scene/tex/Paper001/Paper001_2K-JPG_Color.jpg'), loadImg('/edu/art/brand/picasso_logo.png'),
    loadImg('/edu/art/src/wash_swatches.png'), loadImg('/edu/art/src/tape_strips.png')]);
  Object.assign(A, { logo, wash: w, tape: tp, paper: K.grainTexture(paper) });
  // the panels: per-language values, kinds expanded, times compiled, references checked
  const time = makeTime(C, VO, TL.vo);
  const [P, errs] = compilePanels(byLang(E.panels || [], LANG), R, time);
  try { END = time((E.end && E.end.at) || 'endCard'); } catch (e) { errs.push('end.at: ' + e.message); }
  for (const k of ['mic', 'end', 'fine']) if (T[k] == null) errs.push(`strings.${LANG}.${k} is missing (the kit's mic tag / end card)`);
  if (VO) for (const v of TL.vo) {
    if (!VO[v.id]) errs.push(`vo_${LANG}.json has no "${v.id}"`);
    else if (!(T.cap || {})[v.id]) errs.push(`strings.${LANG}.cap has no "${v.id}"`);
    else if (Math.abs(VO[v.id].t - v.t) > .01) errs.push(`vo_${LANG}.json is stale: "${v.id}" at ${VO[v.id].t} s, timeline.json says ${v.t} s (rerun mix.py vo)`);
  }
  if ((TL.vo || []).length && !VO) errs.push(`no vo_${LANG}.json (run mix.py vo): no captions, no mic tag, no voice times`);
  if ((TL.vo || []).some((v) => v.id[0] === 'c') && !S._mic) errs.push(`her clips need the mic drawing "${micKey}" in assets.drawings`);
  for (let k = 1; k < P.length; k++) if (!(P[k].arrive > P[k - 1].arrive + CAM.pan)) errs.push(`panel ${k} arrives at ${P[k].arrive} s, not after panel ${k - 1} (${P[k - 1].arrive} s) + the ${CAM.pan} s pan`);
  if (!P.length) errs.push('episode.json has no panels');
  if (errs.length) throw new Error(`episode ${EP}: ${errs.length} problem(s)\n  ` + errs.slice(0, 40).join('\n  '));
  PANELS = P;
  const Ks = camKeys(); CT = Ks.map((k) => k[0]); CX = Ks.map((k) => k[1]); CY = Ks.map((k) => k[2]); CZ = Ks.map((k) => Math.log(k[3]));
  if (ZH) {   // every Chinese glyph the strings use, so no subset font loads in the middle of a render
    const chars = [...new Set(allText(T).join(''))].join('');
    await Promise.all(['400 100px "ZCOOL KuaiLe"', '700 52px "Noto Sans SC"'].map((f) => document.fonts.load(f, chars)));
  }
  const brief = (it) => ({ t: it.t, id: it.id, at: it.at ?? null, dur: it.dur ?? null, out: it.out ?? null, fadeOut: it.fadeOut ?? null });
  window.__lesson = { ep: EP, lang: LANG, panels: PANELS.length, dur: DUR, missing: MISSING, arrive: PANELS.map((p) => p.arrive), time,
    items: PANELS.map((p) => p.items.map(brief)) };   // compiled item times, for kit-lesson/lint.py
  if (MISSING.length) console.warn('placeholders: ' + MISSING.join(' '));
}

defineScene({
  meta: { title: E.title || 'lesson', durationFrames: Math.round(DUR * FPS), fps: FPS, width: W, height: H, design: [W, H], seed: 7, background: css(PAPER), fonts: ['Caveat', 'Inter'], poster: 0 },
  setup,
  layers: [{ name: 'sheet', type: '2d', draw(ctx, g) {
    const t = ctx.sec;
    g.fillStyle = css(PAPER); g.fillRect(0, 0, W, H);
    if (t >= DUR - .65) {   // under the end card as it lifts: the cover again (the loop lands on frame 0)
      drawPanel(g, 0, 0); K.grain(g, { x: 540, y: 960, z: 1 });
    } else {
      const cam = camAt(t);
      g.save(); g.translate(540, 960); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
      PANELS.forEach((P, k) => { if (Math.abs(cam.y - (PY(k) + 960)) < 960 / cam.z + 1000) { g.save(); g.translate(0, PY(k)); drawPanel(g, k, t); g.restore(); } });
      K.grain(g, cam);
      g.restore();
      micTag(g, t);
    }
    endCard(g, t);
  } }],
  post(ctx, g) { if (CAPS && ctx.sec < END) captions(g, ctx.sec); if (GUIDES) guides(g); },
});
