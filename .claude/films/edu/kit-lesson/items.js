// kit-lesson/items.js - the interpreter for episode.json: item types (ITEMS), panel kinds (PANEL_KINDS, macros that
// expand into items), time expressions, points, and the load-time checks. README.md documents every field.
import { mix, hs } from '/edu/kit2d/index.js';
import {
  F, INK, RED, COLORS, css, seg, eo, spring, draw, put, hand, L, sans, fitPx, textW, pen, ring, curve, arrow, tickPts,
  noteCard, layer, wash, WASHES, tape, printout,
} from './ink.js';

// ------------------------------------------------------------------ small helpers
export function color(c, d) {
  if (c == null) return d;
  if (Array.isArray(c)) return c;
  const v = COLORS[c]; if (!v) throw new Error('unknown colour ' + c); return v;
}
export function font(f) {
  if (f == null || f === 'hand') return [F.HAND, F.HW];
  if (f === 'latin') return [F.LAT, F.HW];
  if (f === 'sans') return [F.SANS, F.SW];
  throw new Error('unknown font ' + f);
}
// a crop given as fractions of the image [u0, v0, uw, vh] -> source pixels (null: the whole image)
const cropPx = (img, c) => (c ? [c[0] * img.width, c[1] * img.height, c[2] * img.width, c[3] * img.height] : null);
// a mapper (u, v in the crop) plus px (x, y in the source image's pixels), registered under an item's id
function mapRef(m, img, crop) {
  const [cx, cy, cw, ch] = crop || [0, 0, img.width, img.height];
  return { at: m, px: (x, y) => m((x - cx) / cw, (y - cy) / ch) };
}

// A point: [x, y] (panel design px) | [ref, u, v, dx?, dy?] (u, v on a registered item; "ref:px" = source pixels of a
// printout) | {on: <point>, x?, y?, dx?, dy?} (x or y replaces that coordinate). Returns null when the ref is not
// (yet) on the sheet, and the item is then skipped for this frame.
export function pt(p, R) {
  if (p == null) return null;
  if (!Array.isArray(p)) {
    const b = p.on ? pt(p.on, R) : [0, 0]; if (!b) return null;
    return [(p.x ?? b[0]) + (p.dx ?? 0), (p.y ?? b[1]) + (p.dy ?? 0)];
  }
  if (typeof p[0] === 'number') return p;
  let [name, u, v, dx = 0, dy = 0] = p, px = false;
  if (name.endsWith(':px')) { px = true; name = name.slice(0, -3); }
  const r = R.refs[name]; if (!r) return null;
  const q = px ? (r.px ? r.px(u, v) : null) : r.at(u, v); if (!q) return null;
  return [q[0] + dx, q[1] + dy];
}
const pts = (list, R) => { const o = list.map((q) => pt(q, R)); return o.some((q) => !q) ? null : o; };
function labelRef(g, s, x, y, px, wt, fam, align) {
  const tw = textW(g, s, px, wt, fam), x0 = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
  return { at: (u, v) => [x0 + u * tw, y - px / 2 + v * px], s, x, y, x0, tw, px, wt, fam };
}

// ------------------------------------------------------------------ item types
// Each is fn(g, t, it, R) -> optional ref (registered under it.id). R = { T strings, S sprites, IMG slides, ST stamps,
// text(key), refs (this panel, this frame), depth (layer nesting) }. Times are numbers here (compiled at load).
// fn.needs lists the required fields (checked at load).
export const ITEMS = {};
const def = (name, needs, fn) => { fn.needs = needs; ITEMS[name] = fn; };

// a packed ink drawing that draws itself from `at` over `dur` (no `at`: complete); its box is the ref (u, v over it)
def('draw', ['d', 'xy', 'w'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p) return null;
  return draw(g, t, R.S[it.d], p[0], p[1], it.w, it.at ?? null, it.dur ?? 2.6, { rot: it.rot, alpha: it.alpha });
});
// hand lettering; text may be an array (rows: each `rows.dy` lower and `rows.dt` later); ref = the first row's box
def('label', ['text', 'xy', 'px'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p) return null;
  const s = R.text(it.text), rows = Array.isArray(s) ? s : [s], [fam, wt] = font(it.font), col = color(it.color, INK);
  const dy = it.rows?.dy ?? it.px * 1.1, dt = it.rows?.dt ?? .4;
  let ref = null;
  rows.forEach((row, i) => {
    const px = it.fit ? fitPx(g, row, it.px, it.fit, wt, fam) : it.px, x = p[0], y = i ? p[1] + i * dy : p[1];
    if (i === 0) ref = labelRef(g, row, x, y, px, wt, fam, it.align);
    const o = { align: it.align, rot: it.rot, patch: it.patch, fam, w: wt, alpha: it.alpha, dur: it.dur };
    if (it.at == null) hand(g, row, x, y, px, col, o);
    else L(g, t, row, x, y, px, col, i ? it.at + i * dt : it.at, it.out ?? null, o);
  });
  return ref;
});
// small print in the sans face, faded in from `at` over `dur` to alpha `a`
def('sans', ['text', 'xy', 'px'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p) return null;
  const s = R.text(it.text), [fam, wt] = font('sans'), px = it.fit ? fitPx(g, s, it.px, it.fit, wt, fam) : it.px;
  sans(g, s, p[0], p[1], px, color(it.color, INK), (it.a ?? 1) * (it.at == null ? 1 : seg(t, it.at, it.at + (it.dur ?? .5))), { align: it.align });
  return null;
});
// a pen line under a label (`of` = the label's id), as long as the label's text
def('underline', ['of'], (g, t, it, R) => {
  const r = R.refs[it.of]; if (!r) return null;
  const k = it.at == null ? 1 : seg(t, it.at, it.at + (it.dur ?? .6)); if (k <= 0) return null;
  const x0 = r.x0 + (it.dx ?? 0), y0 = r.y + (it.dy ?? 0);
  pen(g, curve(x0, y0, x0 + r.tw + (it.extend ?? 0), y0 + (it.rise ?? 0), it.bend ?? .03), k, color(it.color, RED), it.lw ?? 7);
  return null;
});
// a pen ring around one character of a label (`of`, `char`)
def('ringChar', ['of', 'char', 'at'], (g, t, it, R) => {
  const r = R.refs[it.of]; if (!r || !(t > it.at)) return null;
  const i = r.s.indexOf(it.char); if (i < 0) return null;
  const xx = r.x0 + textW(g, r.s.slice(0, i), r.px, r.wt, r.fam) + textW(g, it.char, r.px, r.wt, r.fam) / 2;
  pen(g, ring(xx, r.y + (it.dy ?? 0), r.px * (it.rx ?? .42), r.px * (it.ry ?? .5), it.seed ?? 0, it.turns), seg(t, it.at, it.at + (it.dur ?? .4)), color(it.color, RED), it.lw ?? 6);
  return null;
});
// a pen stroke through points (or `curve`: [from, to, bend]) drawn from `at` over `dur`
def('pen', [], (g, t, it, R) => {
  const P = it.curve ? (() => { const a = pt(it.curve[0], R), b = pt(it.curve[1], R); return a && b ? curve(a[0], a[1], b[0], b[1], it.curve[2] ?? .2) : null; })() : pts(it.pts, R);
  if (!P) return null;
  const k = it.at == null ? 1 : t > it.at ? seg(t, it.at, it.at + (it.dur ?? .5)) : 0;
  if (k > 0) pen(g, P, k, color(it.color, RED), it.lw ?? 7, { alpha: it.alpha, dash: it.dash });
  return null;
});
// a pen rectangle; `on` maps the corners through a ref (e.g. "sl:px" = slide pixels)
def('box', ['rect'], (g, t, it, R) => {
  const [x0, y0, x1, y1] = it.rect, c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const P = pts(it.on ? c.map(([x, y]) => [it.on, x, y]) : c, R); if (!P) return null;
  const k = it.at == null ? 1 : t > it.at ? seg(t, it.at, it.at + (it.dur ?? .9)) : 0;
  if (k > 0) pen(g, P, k, color(it.color, RED), it.lw ?? 7);
  return null;
});
// a curved red arrow from -> to
def('arrow', ['from', 'to', 'at'], (g, t, it, R) => {
  const a = pt(it.from, R), b = pt(it.to, R); if (!a || !b || !(t > it.at)) return null;
  arrow(g, curve(a[0], a[1], b[0], b[1], it.bend ?? .2), seg(t, it.at, it.at + (it.dur ?? .4)), color(it.color, RED), it.lw ?? 6, { head: it.head });
  return null;
});
// a pen ring (ellipse, radii r = [rx, ry]) around a point
def('ring', ['xy', 'r', 'at'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p || !(t > it.at)) return null;
  pen(g, ring(p[0], p[1], it.r[0], it.r[1], it.seed ?? 0, it.turns), seg(t, it.at, it.at + (it.dur ?? .5)), color(it.color, RED), it.lw ?? 6);
  return null;
});
// a tick mark of size s
def('tick', ['xy', 's', 'at'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p || !(t > it.at)) return null;
  pen(g, tickPts(p[0], p[1], it.s), seg(t, it.at, it.at + (it.dur ?? .25)), color(it.color, RED), it.lw ?? 6);
  return null;
});
// a hand-drawn note card (rect = [x0, y0, x1, y1]); outline drawn from `at` over `dur`, paper filled as it goes
def('card', ['rect'], (g, t, it) => {
  const [x0, y0, x1, y1] = it.rect, k = it.at == null ? 1 : seg(t, it.at, it.at + (it.dur ?? 1));
  noteCard(g, x0, y0, x1, y1, k, { seed: it.seed, r: it.r, lw: it.lw, alpha: it.alpha, fill: it.fill && color(it.fill), ink: it.ink && color(it.ink) });
  return null;
});
// watercolour (c = coral | cobalt | yellow | sage | ultra | peach), multiplied under the ink; no `at`: already soaked
def('wash', ['c', 'xy', 'w'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p) return null;
  wash(g, t, WASHES[it.c], p[0], p[1], it.w, it.at ?? -1, { a: it.a, h: it.h, rot: it.rot, dur: it.dur, tout: it.out });
  return null;
});
// a strip of tape (i = 0..7 in tape_strips.png)
def('tape', ['i', 'xy', 'w', 'at'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p) return null;
  tape(g, t, it.i, p[0], p[1], it.w, it.rot ?? 0, it.at);
  return null;
});
// a slide printout dropped on the sheet; ref = the slide (u, v over the crop; "id:px" = source pixels)
def('printout', ['slide', 'xy', 'w'], (g, t, it, R) => {
  const p = pt(it.xy, R), img = R.IMG[it.slide]; if (!p) return null;
  const crop = cropPx(img, it.crop), m = printout(g, t, img, p[0], p[1], it.w, it.rot ?? 0, it.at ?? -1, crop);
  return m ? mapRef(m, img, crop) : null;
});
// a cut-out of a slide flying from a point on the sheet (`from`) to `to`, growing from w0 to w; taped on with `tapes`
// ({i, dx, dy (in units of the width, from the centre), w, rot, at}); `items` are drawn once it has landed
def('clipping', ['slide', 'from', 'to', 'w', 'at'], (g, t, it, R) => {
  if (!(t > it.at)) return null;
  const img = R.IMG[it.slide], f = pt(it.from, R), to = pt(it.to, R); if (!f || !to) return null;
  const k = eo(seg(t, it.at, it.at + (it.fly ?? .6)));
  const cx = mix(f[0], to[0], k), cy = mix(f[1], to[1], k), w = mix(it.w0 ?? 140, it.w, k), rot = mix(it.rot0 ?? 0, it.rot ?? 0, k);
  const crop = cropPx(img, it.crop), m = printout(g, t, img, cx, cy, w, rot, it.at, crop);
  for (const tp of it.tapes || []) tape(g, t, tp.i, cx + w * (tp.dx ?? 0), cy + w * (tp.dy ?? 0), tp.w, tp.rot ?? 0, tp.at);
  if (k < 1 || !m) return null;
  const ref = mapRef(m, img, crop); if (it.id) R.refs[it.id] = ref;
  if (it.items) runItems(g, t, it.items, R);
  return ref;
});
// a blank sheet taped over part of a slide (third-party art is never reused); ref = the sheet (u, v; centre .5, .5)
def('cover', ['xy'], (g, t, it, R) => {
  const p = pt(it.xy, R); if (!p) return null;
  const [nx, ny] = p, [sw, sh] = it.size ?? [500, 500], nk = it.at == null ? 1 : eo(seg(t, it.at, it.at + (it.dur ?? .4)));
  if (nk > 0) {
    g.save(); g.translate(nx, ny); g.rotate(it.rot ?? .025); g.scale(mix(1.06, 1, nk), mix(1.06, 1, nk)); g.globalAlpha = nk;
    g.shadowColor = 'rgba(60,45,30,.22)'; g.shadowBlur = 14; g.shadowOffsetY = 5; g.fillStyle = css(color(it.fill, COLORS.sheet));
    g.fillRect(-sw / 2, -sh / 2, sw, sh); g.restore();
    const tp = it.tape; if (tp) tape(g, t, tp.i, nx + (tp.dx ?? 0), ny + (tp.dy ?? 0), tp.w, tp.rot ?? 0, tp.at);
  }
  return { at: (u, v) => [nx + (u - .5) * sw, ny + (v - .5) * sh] };
});
// a small finished stamp (assets.stamps) repeated in a grid, each springing in a little after the one before
def('stampGrid', ['stamp', 'n', 'cols', 'xy', 'pitch', 'w', 'at'], (g, t, it, R) => {
  if (!(t > it.at)) return null;
  const im = R.ST[it.stamp], [x0, y0] = it.xy, [dx, dy] = it.pitch, [sk, sw] = it.spring ?? [9, 15];
  for (let i = 0; i < it.n; i++) {
    const r = Math.floor(i / it.cols), c = i % it.cols, t0 = it.at + i * (it.step ?? .025) + hs(i * 1.7) * (it.jitter ?? .25);
    if (t < t0) continue;
    put(g, im, x0 + c * dx + (r % 2) * (it.stagger ?? 0), y0 + r * dy, it.w, { s: mix(it.pop ?? 1.5, 1, spring(t - t0, sk, sw)) });
  }
  return null;
});
// items shown from `at`, optionally moved (xy, rot) and faded in/out as ONE layer (fadeIn / fadeOut = [t0, t1])
def('group', ['items'], (g, t, it, R) => {
  if (it.at != null && !(t > it.at)) return null;
  const a = (it.fadeOut ? 1 - seg(t, it.fadeOut[0], it.fadeOut[1]) : 1) * (it.fadeIn ? seg(t, it.fadeIn[0], it.fadeIn[1]) : 1);
  const d = R.depth++;
  layer(g, a, (lg) => {
    const tr = it.xy || it.rot; if (tr) { lg.save(); if (it.xy) lg.translate(it.xy[0], it.xy[1]); if (it.rot) lg.rotate(it.rot); }
    runItems(lg, t, it.items, R);
    if (tr) lg.restore();
  }, d);
  R.depth = d;
  return null;
});

export function runItems(g, t, items, R) {
  for (const it of items) {
    const ref = ITEMS[it.t](g, t, it, R);
    if (it.id && ref) R.refs[it.id] = ref;
  }
}

// ------------------------------------------------------------------ panel kinds: macros that expand into items
// fn(panel, k) -> items placed BEFORE the panel's own items. Fields may be time expressions (compiled afterwards).
export const PANEL_KINDS = {};
// "slide": her slide taped on as a printout, "her slide N" lettered above it (registers the printout as "sl")
PANEL_KINDS.slide = (P, k) => {
  const s = P.slide || {}, arrive = P.arrive ?? 'p' + k, tp = s.tape ?? arrive + '+1';
  const tapes = s.tapes ?? [[0, 90, 486, 240, -.55, 0], [5, 990, 482, 200, .5, .15]];
  return [
    { t: 'label', text: s.label, xy: s.labelXY ?? [150, 392], px: s.labelPx ?? (F.zh ? 50 : 52), color: 'red', at: tp + '+0.4', rot: -.06 },
    { id: s.id ?? 'sl', t: 'printout', slide: s.src, xy: s.xy ?? [540, 860], w: s.w ?? 1000, rot: s.rot ?? -.015, at: arrive + '+0.7' },
    ...tapes.map(([i, x, y, w, rot, dt]) => ({ t: 'tape', i, xy: [x, y], w, rot, at: dt ? `${tp}+${dt}` : tp })),
  ];
};

// ------------------------------------------------------------------ time expressions
// number | null | "name" | "name+0.4-0.1" | "id.end" | "id@word" | "id@word#2" | "id@50%"  (each with optional offsets)
// name = a cue of timeline.json, else a voice id (its start). @word = the start of that word's mark in vo_<lang>.json
// (letters and digits only, any case: GPT-3 -> gpt3); #n = its n-th occurrence in the line.
const TRX = /^([A-Za-z_]\w*)(?:(\.end)|@(\d+(?:\.\d+)?)%|@([0-9A-Za-z㐀-鿿]+)(?:#(\d+))?)?((?:[+-]\d*\.?\d+)*)$/;
const norm = (s) => String(s).toLowerCase().replace(/[^0-9a-z㐀-鿿]/g, '');
export function makeTime(C, VO, vo) {
  const memo = new Map(), starts = Object.fromEntries((vo || []).map((v) => [v.id, v.t]));
  return (e) => {
    if (e == null) return null;
    if (typeof e === 'number') return e;
    if (typeof e !== 'string') throw new Error('bad time ' + JSON.stringify(e));
    if (memo.has(e)) return memo.get(e);
    const m = e.replace(/\s+/g, '').match(TRX); if (!m) throw new Error(`bad time "${e}"`);
    const [, name, end, pct, word, nth, offs] = m; let v;
    if (!end && !pct && !word && name in C) v = C[name];
    else {
      const r = VO && VO[name];
      if (!r && !end && !pct && !word && name in starts) v = starts[name];
      else if (!r) throw new Error(`time "${e}": no cue or voice line "${name}"`);
      else if (end) v = r.t + r.dur;
      else if (pct) v = r.t + r.dur * parseFloat(pct) / 100;
      else if (word) {
        const want = norm(word), hits = (r.words || []).filter((w) => norm(w[2]) === want), n = nth ? +nth : 1;
        if (hits.length < n) throw new Error(`time "${e}": "${word}" #${n} not in ${name} (${(r.words || []).map((w) => norm(w[2])).join(' ')})`);
        v = hits[n - 1][0];
      } else v = r.t;
    }
    for (const o of offs.match(/[+-]\d*\.?\d+/g) || []) v += parseFloat(o);
    memo.set(e, v); return v;
  };
}

// ------------------------------------------------------------------ load: per-language values, kinds, times, checks
// {"en": a, "zh": b} anywhere in the episode becomes the value for the film's language (en when missing)
export function byLang(v, lang) {
  if (Array.isArray(v)) return v.map((x) => byLang(x, lang));
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (ks.length && ks.every((k) => k === 'en' || k === 'zh')) return byLang(v[lang] ?? v.en, lang);
    return Object.fromEntries(ks.map((k) => [k, byLang(v[k], lang)]));
  }
  return v;
}
const TIME_KEYS = ['at', 'out', 'until'], SPAN_KEYS = ['fadeIn', 'fadeOut'];
// expands kinds, compiles every time, checks every reference; returns (panels, errors)
export function compilePanels(panels, R, time) {
  const errs = [], out = [];
  const tm = (e, where) => { try { return time(e); } catch (x) { errs.push(where + ': ' + x.message); return 0; } };
  const walk = (items, where) => (items || []).map((src, j) => {
    const it = { ...src }, w = `${where}[${j}]${it.id ? '#' + it.id : ''} ${it.t}`;
    const fn = ITEMS[it.t];
    if (!fn) { errs.push(`${w}: unknown item type`); return { t: 'group', items: [] }; }
    for (const f of fn.needs) if (it[f] == null) errs.push(`${w}: needs "${f}"`);
    for (const k of TIME_KEYS) if (k in it) it[k] = tm(it[k], w + '.' + k);
    for (const k of SPAN_KEYS) if (it[k]) it[k] = it[k].map((e) => tm(e, w + '.' + k));
    if (it.until != null) { it.dur = it.until - it.at; delete it.until; }
    if (it.tape) it.tape = { ...it.tape, at: tm(it.tape.at, w + '.tape.at') };
    if (it.tapes) it.tapes = it.tapes.map((tp) => ({ ...tp, at: tm(tp.at, w + '.tapes.at') }));
    if (it.text != null) { try { R.text(it.text); } catch (x) { errs.push(`${w}: ${x.message}`); } }
    if (it.t === 'draw' && !R.S[it.d]) errs.push(`${w}: drawing "${it.d}" is not in assets.drawings`);
    if ((it.t === 'printout' || it.t === 'clipping') && !R.IMG[it.slide]) errs.push(`${w}: slide "${it.slide}" is not in assets.slides`);
    if (it.t === 'stampGrid' && !R.ST[it.stamp]) errs.push(`${w}: stamp "${it.stamp}" is not in assets.stamps`);
    if (it.t === 'wash' && !(it.c in WASHES)) errs.push(`${w}: wash colour "${it.c}" (${Object.keys(WASHES).join(' ')})`);
    for (const k of ['color', 'fill', 'ink']) if (it[k] != null) { try { color(it[k]); } catch (x) { errs.push(`${w}: ${x.message}`); } }
    if (it.font != null) { try { font(it.font); } catch (x) { errs.push(`${w}: ${x.message}`); } }
    if (it.items) it.items = walk(it.items, w);
    return it;
  });
  panels.forEach((P0, k) => {
    const P = { ...P0 }, where = P.id || 'p' + k;
    let items = P.items || [];
    if (P.kind) {
      if (!PANEL_KINDS[P.kind]) errs.push(`${where}: unknown panel kind "${P.kind}"`);
      else items = PANEL_KINDS[P.kind](P, k).concat(items);
    }
    P.items = walk(items, where);
    P.arrive = k ? tm(P.arrive ?? 'p' + k, where + '.arrive') : 0;
    P.camera = (P.camera || []).map((c, j) => ({ ...c, at: tm(c.at, `${where}.camera[${j}]`) }));
    out.push(P);
  });
  return [out, errs];
}
