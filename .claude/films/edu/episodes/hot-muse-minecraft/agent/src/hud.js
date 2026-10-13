// src/hud.js - the stream's HUD, drawn with node-canvas (the final design: ui-art/hud-final/FINAL-SPEC.md, its mock-up
// ui-art/hud-final/index.html). The drawing is the mock-up's own, lifted unchanged where it could be: the sections take
// the HUD state (src/ui-panel.js hudState(), the shape of the design's data/states.json) and draw the 1080x1080 frame's
// HUD: the overlays in the video's bottom corners (the inventory hotbar, the new-goal and milestone toasts), the stats
// strip, the goal band, Muse's why and plan (or one honest line), NOW and the body's column, and RAW across the bottom.
// The video itself is the camera's: nothing is drawn over it but the overlays. drawHud() lays out and draws once per
// change of what it shows (the clocks: once a second); the panel copies the result into every frame.
//
// debug: drawHud(g, state, { qa: true }) outlines every text that overlaps another, leaves the canvas or crosses its
// column in red, as the mock-up's ?qa=1 does; the problems are in the returned qa either way.

let g = null; // the 2D context drawn into (per draw)
let st = null; // the HUD state (per draw)
let ICON = () => null; // icons pre-scaled to their sizes (per draw)
let QA_DRAW = false;
let QA_RESULT = null;
let LAYOUT = null;

/* ---------- tokens ---------- */
const K = {
  base: '#07090d', band: '#0b0e14', panel2: '#141924', chip: '#252c3a', track: '#222837',
  zebra: 'rgba(255,255,255,0.028)', line: 'rgba(255,255,255,0.08)', line2: 'rgba(255,255,255,0.16)',
  t1: '#f3f5f9', t2: '#bcc3d0', t3: '#7f889b', t4: '#4e5667',
  muse: '#9d8cff', museHi: '#c6bcff', museInk: '#e4dfff', museDim: '#a69fd6', museDeep: '#15122b', museTrack: '#2a2450', museTint: 'rgba(157,140,255,0.07)',
  body: '#efa443', bodyHi: '#ffc77a', world: '#8fb1d6',
  ok: '#5fd39b', fail: '#ff6f61',
  jKey: '#939cb1', jStr: '#dcd5ff', jNum: '#ffffff', jPun: '#5f687c', ans: '#a0a9bc',
};
const UI = (w, s) => `${w} ${s}px MuseUI`;
const MONO = (w, s) => `${w} ${s}px MuseMono`;

/* ---------- QA: every drawn text is recorded with its region; ?qa=1 draws the problems ---------- */
let QA = [];
let REG = [0, 1080, 'canvas'];
function rec(x, y, w, size, s) { QA.push({ x, y: y - size * 0.76, w, h: size, s, reg: REG }); }

/* ---------- primitives (all portable to node-canvas) ---------- */
function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function hline(x, y, w, c) { g.fillStyle = c; g.fillRect(x, y, w, 1); }
function vline(x, y, h, c) { g.fillStyle = c; g.fillRect(x, y, 1, h); }
function rrect(x, y, w, h, r, c) { r = Math.min(r, h / 2, w / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fillStyle = c; g.fill(); }
// every width is measured once per font and text (node-canvas measures slowly; the layout asks often)
const MEMO = new Map();
function MW(s, f) {
  let m = MEMO.get(f);
  if (!m) { m = new Map(); MEMO.set(f, m); }
  let w = m.get(s);
  if (w === undefined) {
    if (m.size > 20_000) m.clear();
    g.font = f; w = g.measureText(s).width; m.set(s, w);
  }
  return w;
}
function W(s, f) { return MW(s, f); }
function T(s, x, y, f, c, align = 'left') {
  g.font = f; g.fillStyle = c; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y);
  const w = MW(s, f);
  if (s && s.trim()) rec(align === 'right' ? x - w : align === 'center' ? x - w / 2 : x, y, w, parseFloat(f.split(' ')[1]), s);
  return w;
}
// spaced capitals: drawn one character at a time (node-canvas has no letterSpacing)
function capsW(s, size, w = 700, tr = 0.09) { const f = UI(w, size); let a = 0; for (const ch of s) a += MW(ch, f) + size * tr; return a - size * tr; }
function caps(s, x, y, size, c, w = 700, tr = 0.09, align = 'left') {
  const tw = capsW(s, size, w, tr); let cx = align === 'right' ? x - tw : x;
  rec(cx, y, tw, size, s);
  g.font = UI(w, size); g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const cf = UI(w, size);
  for (const ch of s) { g.fillText(ch, cx, y); cx += MW(ch, cf) + size * tr; }
  return tw;
}
function icon(n, x, y, s, a = 1) {
  QA.push({ x, y, w: s, h: s, s: `[${n}]`, reg: REG, icon: true }); // the QA sees icons too (a title running into one)
  const im = ICON(n, s); if (!im) return; g.globalAlpha = a; g.drawImage(im, x, y); g.globalAlpha = 1;
}
// cut to fit with an ellipsis, at a word when that keeps 60 % of the room
function ellip(s, f, maxW, force = false) {
  if (!force && MW(s, f) <= maxW) return s;
  // the longest start that fits with "…", found by halving (not one character at a time)
  let lo = 0, hi = s.length;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (MW(s.slice(0, mid) + '…', f) <= maxW) lo = mid; else hi = mid - 1; }
  let t = s.slice(0, lo);
  const sp = t.lastIndexOf(' ');
  if (sp > 0 && MW(t.slice(0, sp), f) >= maxW * 0.6) t = t.slice(0, sp);
  return t.replace(/[\s,;:·(\[{–-]+$/, '') + '…';
}
const WRAPS = new Map();
function wrap(text, f, maxW, indent = 0) {
  const key = `${f}|${maxW}|${indent}|${text}`;
  const hit = WRAPS.get(key);
  if (hit) return hit;
  const words = String(text).split(/\s+/).filter(Boolean); const out = []; let cur = ''; let lim = maxW - indent;
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (MW(t, f) <= lim) { cur = t; continue; }
    if (cur) { out.push(cur); lim = maxW; }
    cur = w;
    while (MW(cur, f) > lim) { let k = cur.length; while (k > 1 && MW(cur.slice(0, k), f) > lim) k--; out.push(cur.slice(0, k)); cur = cur.slice(k); lim = maxW; }
  }
  if (cur) out.push(cur);
  if (WRAPS.size > 5_000) WRAPS.clear();
  WRAPS.set(key, out);
  return out;
}
// the same number of lines, as even as they go (no one-word last line)
function wrapBalanced(text, f, maxW) {
  const n = wrap(text, f, maxW).length; if (n < 2) return wrap(text, f, maxW);
  let lo = maxW * 0.4, hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(text, f, mid).length <= n) hi = mid; else lo = mid; }
  return wrap(text, f, Math.ceil(hi));
}
function clamp(lines, n, f, maxW) { if (lines.length <= n) return lines; const o = lines.slice(0, n); o[n - 1] = ellip(o[n - 1] + ' ' + lines[n], f, maxW, true); return o; }
function ring(cx, cy, r, c, lw = 1.5) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.strokeStyle = c; g.lineWidth = lw; g.stroke(); }
function dot(cx, cy, r, c) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); }
function check(cx, cy, c, k = 1) { g.beginPath(); g.moveTo(cx - 4.5 * k, cy + 0.5 * k); g.lineTo(cx - 1.5 * k, cy + 3.5 * k); g.lineTo(cx + 4.5 * k, cy - 3.5 * k); g.strokeStyle = c; g.lineWidth = 2; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function cross(cx, cy, c, r = 3.5) { g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy + r); g.moveTo(cx + r, cy - r); g.lineTo(cx - r, cy + r); g.strokeStyle = c; g.lineWidth = 2; g.lineCap = 'round'; g.stroke(); }
function dots(x0, x1, y, c) { g.fillStyle = c; for (let x = Math.ceil(x0); x <= x1 - 1; x += 4) g.fillRect(x, y, 1, 1); }
const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const cap1 = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ---------- data helpers ---------- */
// the caller is whoever the MCP client is: Muse, or our smoke-test script (never Muse's name on words it did not send)
// set per draw from the state: the caller's name (from the MCP client), its word in sentences, the game's time
let CALLER = 'MUSE';
let callerWord = 'Muse';
let NOW_S = 0;
const agoWords = (s) => { s = Math.max(0, Math.round(s)); return s < 90 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min ago`; };
const RECENT_S = 100; // RAW times: "40s" under 100 s, else the game clock
const rawWhen = (agoS, sent) => agoS < RECENT_S ? `${Math.round(agoS)}s` : sent;

function jsonRuns(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { let j = i + 1; while (j < s.length && s[j] !== '"') { if (s[j] === '\\') j++; j++; } j++; let k = j; while (s[k] === ' ') k++; out.push({ t: s.slice(i, j), c: s[k] === ':' ? K.jKey : K.jStr }); i = j; }
    else if (/[-0-9]/.test(c)) { let j = i; while (j < s.length && /[-0-9.eE+]/.test(s[j])) j++; out.push({ t: s.slice(i, j), c: K.jNum }); i = j; }
    else if (/[a-z]/.test(c)) { let j = i; while (j < s.length && /[a-z_]/.test(s[j])) j++; out.push({ t: s.slice(i, j), c: K.jNum }); i = j; }
    else { out.push({ t: c, c: K.jPun }); i++; }
  }
  return out;
}

/* ---------- fixed geometry ---------- */
const VH = 608;               // video height (16:9 at 1080)
const M = 20;                 // outer margin
const X1 = 1080 - M;          // right edge of content
const BAND_H = 36;            // stats strip
// 12-column grid on the 1040 px content width: 72 px columns, 16 px gutters (a column step is 88 px)
const COL = 72, GUT = 16;
const LX = M, LW = 7 * COL + 6 * GUT;  // left column, 7 columns: the caller (NOW): x 20-620
const DIV = LX + LW + GUT / 2;         // column divider (hairline): x 628
const RX = LX + 7 * (COL + GUT), RW = X1 - RX; // right column, 5 columns: the body and the world: x 636-1060 (424)
const PAD = 10;               // between the bands, the columns and RAW
const GAP = 8;                // between modules in a column
const HEAD = 20;              // module header: caps label, meta at the right, hairline at +15
const ROW = 19;               // small-prose rows
const RAW_FS = 13, RAW_LH = 18, RAW_HEAD = 24, RAW_BOT = 10, RAW_MIN = 6; // RAW_BOT: bottom padding, 2-10 px as the layout needs
const RAW_TIME_R = 62;        // the time column's right edge
const RAW_TX = 72;            // where calls start
const RAW_INDENT = 2;         // continuation lines, in characters
const NOWHY_H = 30;

/* ---------- video overlays ---------- */
function drawHotbar() {
  REG = [0, 1080, 'hotbar']; // its counts sit on the icons' corners by design
  const n = st.inventory.length, s = 40, gap = 4, pad = 4;
  const w = n * s + (n - 1) * gap + pad * 2, h = s + pad * 2;
  const x = 16, y = VH - 16 - h;
  rrect(x, y, w, h, 6, 'rgba(7,9,13,0.82)');
  st.inventory.forEach((it, i) => {
    const sx = x + pad + i * (s + gap), sy = y + pad;
    rrect(sx, sy, s, s, 4, it.count ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)');
    icon(it.icon, sx + 5, sy + 4, 28, it.count ? 1 : 0.28);
    const c = String(it.count);
    g.font = MONO(500, 13); g.textAlign = 'right'; g.lineJoin = 'round';
    g.strokeStyle = 'rgba(7,9,13,0.95)'; g.lineWidth = 3; g.strokeText(c, sx + s - 3, sy + s - 4);
    T(c, sx + s - 3, sy + s - 4, MONO(500, 13), it.count ? K.t1 : K.t4, 'right');
  });
}
// the body closed itself in for the night (a shelter): the camera films the shelter from outside, the bot is inside
function drawSheltered() {
  if (!st.sheltered) return;
  REG = [0, 1080, 'video'];
  const n = st.inventory.length, hotW = n * 40 + (n - 1) * 4 + 8;
  const x = 16 + hotW + 10, y = VH - 16 - 48, h = 48;
  // short of room beside a toast: fewer words, else nothing while the toast shows
  const tb = toastBox(), room = (tb ? 1080 - 16 - tb.w - 10 : 1080 - 16) - x;
  const line = [st.sheltered.since ? `closed itself in at ${st.sheltered.since}, until the next call` : 'closed itself in, until the next call', 'until the next call']
    .find((l) => Math.max(W(l, UI(500, 14)), capsW('SHELTERED', 10)) + 64 <= room);
  if (!line) return;
  const w = Math.max(W(line, UI(500, 14)), capsW('SHELTERED', 10)) + 46 + 18;
  rrect(x, y, w, h, 6, 'rgba(7,9,13,0.86)');
  rect(x, y + 8, 3, h - 16, K.body);
  icon('house', x + 14, y + 12, 24);
  caps('SHELTERED', x + 46, y + 19, 10, K.body);
  T(line, x + 46, y + 38, UI(500, 14), K.t1);
}
// the toast in the video's bottom right: its label, title and width, or null
function toastBox() {
  const goalToast = st.goal && st.goal.new && st.goal.toast;
  if (!goalToast && !st.toast) return null;
  const label = goalToast ? 'NEW GOAL' : (st.toast.label || 'MILESTONE');
  const title = goalToast ? st.goal.toast.replace(/^New goal:\s*/i, '') : st.toast.title;
  return { label, title, w: Math.max(W(title, UI(600, 18)), capsW(label, 10)) + 46 + 18 };
}
function drawToast() {
  // a new goal (set_goal), else a milestone (6 s): a flat lower-third in the video's bottom right
  const tb = toastBox();
  if (!tb) return;
  REG = [0, 1080, 'video'];
  const { label, title, w } = tb, h = 48;
  const x = 1080 - 16 - w, y = VH - 16 - h;
  rrect(x, y, w, h, 6, 'rgba(7,9,13,0.86)');
  rect(x, y + 8, 3, h - 16, K.t1);
  icon(label === 'RULES CHANGED' ? 'shield' : 'star', x + 14, y + 12, 24);
  caps(label, x + 46, y + 19, 10, label === 'RULES CHANGED' ? K.muse : K.t3);
  T(title, x + 46, y + 38, UI(600, 18), K.t1);
}

/* ---------- 1. stats strip ---------- */
function statsBand(y) {
  REG = [0, 1080, 'stats'];
  const h = BAND_H, base = y + 25;
  const s = st.stats, pct = s.museShare.pct, known = pct != null;
  // with Muse's rules (servers that count them): direct, by its rules, by the body on its own, in % of all actions
  const R = shareParts(s.museShare);
  rect(0, y, 1080, h, K.band);
  // possession rule: the full width split by the caller's share of actions (violet), its rules' (violet, hatched) and
  // the body's own (amber); nothing yet: neutral
  if (R) {
    const xd = Math.round(1080 * R.direct / 100), xr = Math.round(1080 * (R.direct + R.rules) / 100);
    rect(0, y, 1080, 3, K.body);
    rect(0, y, xr, 3, K.museDim);
    for (let hx = xd; hx < xr; hx += 6) rect(hx, y, Math.min(3, xr - hx), 3, K.muse);
    rect(0, y, xd, 3, K.muse);
  } else if (known) { rect(0, y, 1080, 3, K.body); rect(0, y, Math.round(1080 * pct / 100), 3, K.muse); }
  else rect(0, y, 1080, 3, K.t4);
  hline(0, y + h - 1, 1080, K.line);
  const night = s.phase === 'night';
  const pw = String(s.phaseWords || '').split(/,\s*/);
  const left = (draw, placeW) => {
    let x = M;
    const sep = () => { if (draw) vline(x + 11, y + 11, h - 20, K.line2); x += 22; };
    const t = (str, f, c) => (draw ? T(str, x, base, f, c) : W(str, f));
    if (draw) icon('heart', x, y + 9, 20); x += 26;
    x += t(String(s.hp), MONO(500, 18), K.t1); x += 1;
    x += t('/' + s.hpMax, MONO(400, 13), K.t3); sep();
    if (draw) icon('food', x, y + 9, 20); x += 26;
    x += t(String(s.food), MONO(500, 18), K.t1); x += 1;
    x += t('/' + s.foodMax, MONO(400, 13), K.t3); sep();
    // time of day: the phase leads (DAY / NIGHT), the world clock is secondary so it never reads as the game clock
    if (draw) icon(s.dimension === 'nether' ? 'flame' : night ? 'moon' : 'sun', x, y + 9, 20); x += 26;
    x += (draw ? caps(pw[0].toUpperCase(), x, base - 1, 11, night ? K.world : K.t1) : capsW(pw[0].toUpperCase(), 11)) + 7;
    x += t(s.timeOfDay, MONO(400, 14), K.t2) + 8;
    if (pw[1]) x += t(pw.slice(1).join(', '), UI(500, 14), K.t2);
    sep();
    if (draw) icon('depth', x, y + 9, 20); x += 26;
    x += t('y ' + st.position.y, MONO(500, 18), K.t1) + 8;
    const place = placeW == null ? st.position.place : ellip(st.position.place, UI(500, 14), placeW - x);
    x += t(place, UI(500, 14), K.t2);
    return x;
  };
  const right = (draw, counts) => {
    let rx = X1;
    const t = (str, f, c) => (draw ? T(str, rx, base, f, c, 'right') : W(str, f));
    rx -= t(s.gameClock, MONO(500, 18), K.t1) + 8;
    rx -= t(s.gameId, MONO(400, 13), K.t2) + 7;
    rx -= (draw ? caps('GAME', rx, base - 1, 10, K.t3, 700, 0.1, 'right') : capsW('GAME', 10, 700, 0.1)) + 13;
    if (draw) vline(rx, y + 11, h - 20, K.line2); rx -= 13;
    const has = counts && s.museShare.muse != null;
    if (R) {
      // "MUSE decided 100%   direct 79% · rules 21%" (and the body's own, amber, only when it acted)
      const f = UI(500, 12);
      if (R.body > 0) { rx -= t(`body on its own ${R.body}%${counts ? ` (${R.n.body})` : ''}`, f, K.body) + 4; rx -= t('·', f, K.t3) + 4; }
      rx -= t(`rules ${R.rules}%${counts ? ` (${R.n.rule})` : ''}`, f, K.museDim) + 4;
      rx -= t('·', f, K.t3) + 4;
      rx -= t(`direct ${R.direct}%${counts ? ` (${R.n.muse})` : ''}`, f, K.museHi) + 12;
      rx -= t(R.decided + '%', MONO(500, 18), K.t1) + 6;
      rx -= t('decided', f, K.t2) + 7;
    } else if (known) {
      rx -= t(`reflexes ${100 - pct}%${has ? ` (${s.museShare.reflex})` : ''}`, UI(500, 12), K.body) + 10;
      if (has) rx -= t(`(${s.museShare.muse})`, MONO(400, 12), K.museHi) + 4;
      rx -= t(pct + '%', MONO(500, 18), K.t1) + 7;
    } else rx -= t('no actions yet', UI(500, 12), K.t3) + 10; // nothing done by either side: no share, a neutral rule
    rx -= (draw ? caps(CALLER, rx, base - 1, 10, K.muse, 700, 0.1, 'right') : capsW(CALLER, 10, 700, 0.1)) + 13;
    if (draw) vline(rx, y + 11, h - 20, K.line2);
    return rx;
  };
  const natural = left(false, null);
  const counts = natural + 12 <= right(false, true);
  const rx = right(true, counts);
  left(true, natural + 12 <= rx ? null : rx - 12);
  return h;
}

// the share with Muse's rules: {direct, rules, body, decided} in % and the counts, or null (no rule counts, or no action)
function shareParts(m) {
  if (!m || m.rule == null) return null;
  const n = { muse: m.muse ?? 0, rule: m.rule ?? 0, body: m.body ?? 0 };
  const all = n.muse + n.rule + n.body;
  if (!all) return null;
  const decided = m.dpct ?? Math.round((100 * (n.muse + n.rule)) / all);
  const direct = Math.min(decided, m.pct ?? Math.round((100 * n.muse) / all));
  return { direct, rules: decided - direct, body: 100 - decided, decided, n };
}

/* ---------- 2. goal band ---------- */
const GOAL_TAB = 120, GOAL_TAB_MAX = 210; // the title column: at least 120, as wide as the title needs up to 210
function goalBand(y, draw) {
  const gl = st.goal;
  REG = [0, 1080, 'goal'];
  if (gl.kind === 'milestones') {
    const RH = 22, h = 10 + RH * 2 + 6;
    if (!draw) return h;
    rect(0, y, 1080, h, K.base);
    hline(0, y + h - 1, 1080, K.line);
    // the title column as wide as the title ("Nether and back" ran into the grid at a fixed 120), the count at its right
    const tf = UI(600, 16), tab = Math.min(GOAL_TAB_MAX, Math.max(GOAL_TAB, Math.ceil(W(gl.title, tf)) + 16));
    REG = [M, M + tab - 4, 'goal title'];
    caps('GOAL', M, y + 22, 10, K.t3);
    T(`${gl.done}/${gl.total}`, M + tab - 16, y + 22, MONO(500, 13), K.t2, 'right');
    T(ellip(gl.title, tf, tab - 12), M, y + 44, tf, K.t1);
    REG = [M + tab - 4, 1080, 'goal grid'];
    vline(M + tab - 4, y + 10, h - 20, K.line2);
    // 6 columns x 2 rows in reading order; each column as wide as its widest cell, spare room shared out evenly (short
    // of room, each gives up the same share of what it needs: its label is cut)
    const gx = M + tab + 10, cols = 6, gap = 14;
    const cell = (m) => {
      const done = m.state === 'done', next = m.state === 'next';
      const right = done ? m.done : next ? (m.progress || 'next') : '';
      const rf = next ? MONO(500, 12) : MONO(400, 11);
      const lf = UI(next ? 600 : 500, 13);
      return { done, next, right, rf, lf, need: 21 + W(m.label, lf) + (right ? 8 + W(right, rf) : 0) };
    };
    const info = gl.list.map(cell);
    const need = []; for (let c = 0; c < cols; c++) need.push(Math.max(...[0, 1].map((r) => (info[r * cols + c] || { need: 0 }).need)));
    const room = X1 - gx - gap * (cols - 1), needAll = need.reduce((a, b) => a + b, 0), spare = room - needAll;
    const cw = need.map((n) => (spare >= 0 ? n + spare / cols : (n * room) / needAll));
    let cx0 = gx; const colX = cw.map((w) => { const v = cx0; cx0 += w + gap; return v; });
    gl.list.forEach((m, i) => {
      const r = Math.floor(i / cols), c = i % cols, I = info[i];
      const cx = colX[c], cy = y + 8 + r * RH, w = cw[c];
      if (I.next) {
        rect(cx - 6, cy, w + 12, RH - 2, K.panel2); rect(cx - 6, cy, 2, RH - 2, K.t1);
        const pm = /^(\d+)\/(\d+)$/.exec(m.progress || '');
        if (pm) { rect(cx - 4, cy + RH - 4, w + 10, 2, K.line2); rect(cx - 4, cy + RH - 4, (w + 10) * Number(pm[1]) / Number(pm[2]), 2, K.t1); }
      }
      icon(m.icon, cx, cy + 2, 16, I.done || I.next ? 1 : 0.3);
      const rw = I.right ? W(I.right, I.rf) + 8 : 0;
      const lab = ellip(m.label, I.lf, w - 21 - rw);
      const lw = T(lab, cx + 21, cy + 15, I.lf, I.done ? K.t2 : I.next ? K.t1 : K.t4);
      if (I.right) T(I.right, cx + w, cy + 15, I.rf, I.next ? K.t1 : K.t3, 'right');
    });
    return h;
  }
  if (gl.kind === 'counted') {
    const h = 40;
    if (!draw) return h;
    rect(0, y, 1080, h, K.base);
    hline(0, y + h - 1, 1080, K.line);
    const base = y + 26;
    let x = M;
    x += caps('GOAL', x, base - 1, 10, K.t3) + 10;
    if (gl.new) { const nw = capsW('NEW', 9) + 12; g.strokeStyle = K.t2; g.lineWidth = 1; g.beginPath(); g.rect(x + 0.5, base - 12.5, nw - 1, 15); g.stroke(); caps('NEW', x + 6, base - 1.5, 9, K.t1); x += nw + 10; }
    x += T(ellip(cap1(gl.title), UI(600, 16), 300), x, base, UI(600, 16), K.t1) + 18;
    vline(x, y + 10, h - 20, K.line2); x += 18;
    let rx = X1;
    const pg = gl.previous;
    if (pg) {
      // the goal before this one, in words: its title, how far it got and what was next (the next step's words are cut
      // first, then the title, so the counted parts keep their room)
      const nx = (pg.list || []).find((m) => m.state === 'next') || (pg.list || []).find((m) => m.state !== 'done');
      const parts0 = 140 * (gl.parts || []).length;
      const fixed = W(`${pg.done}/${pg.total}`, MONO(500, 13)) + 7 + capsW('BEFORE', 9) + 36;
      const roomB = Math.max(80, rx - x - parts0 - fixed);
      const pt = ellip(pg.title, UI(500, 13), Math.min(W(pg.title, UI(500, 13)), Math.max(60, roomB * 0.55)));
      const tail = nx ? ellip(`next was ${nx.label}`, UI(500, 12), Math.max(0, roomB - W(pt, UI(500, 13)) - 16)) : '';
      if (tail && tail !== '…') rx -= T(tail, rx, base, UI(500, 12), K.t3, 'right') + 8;
      rx -= T(`${pg.done}/${pg.total}`, rx, base, MONO(500, 13), K.t2, 'right') + 7;
      rx -= T(pt, rx, base, UI(500, 13), K.t2, 'right') + 8;
      rx -= caps('BEFORE', rx, base - 1, 9, K.t3, 700, 0.09, 'right') + 18;
      vline(rx, y + 10, h - 20, K.line2); rx -= 18;
    }
    const parts = gl.parts, pw = (rx - x - 16 * (parts.length - 1)) / parts.length;
    parts.forEach((p, i) => {
      const px = x + i * (pw + 16);
      icon(p.icon, px, y + 10, 20);
      const cnt = `${p.done}/${p.of}`, cw = W(cnt, MONO(500, 18));
      // the label gives way to the count and a bar of at least 24 px (cut at a word)
      const roomL = pw - 28 - cw - 12 - 24 - 14, lab = roomL >= 30 ? ellip(p.label, UI(500, 14), roomL) : '';
      const lw = lab ? T(lab, px + 28, base, UI(500, 14), K.t2) : 0;
      const nw = T(cnt, px + pw, base + 1, MONO(500, 18), K.t1, 'right');
      const bx = px + 28 + lw + 14, bw = px + pw - nw - 12 - bx;
      if (bw < 8) return;
      if (p.of <= 20) {
        // one segment per thing to count
        const sg = 3, segW = (bw - (p.of - 1) * sg) / p.of;
        for (let k = 0; k < p.of; k++) rect(bx + k * (segW + sg), base - 9, segW, 6, k < p.done ? K.t1 : K.track);
      } else {
        rrect(bx, base - 9, bw, 6, 3, K.track);
        if (p.done) rrect(bx, base - 9, Math.max(6, bw * p.done / p.of), 6, 3, K.t1);
      }
    });
    return h;
  }
  // plain words: the server cannot count them, so no bar; the words are the goal
  const h = 40;
  if (draw) {
    rect(0, y, 1080, h, K.base); hline(0, y + h - 1, 1080, K.line);
    const base = y + 26;
    let x = M + caps('GOAL', M, base - 1, 10, K.t3) + 10;
    if (gl.title) { x += T(ellip(gl.title, UI(500, 14), 240), x, base, UI(500, 14), K.t2) + 10; vline(x, y + 10, h - 20, K.line2); x += 12; }
    const note = 'plain words: the server does not count them';
    const nw = W(note, UI(500, 12));
    T(note, X1, base, UI(500, 12), K.t3, 'right');
    T(ellip(cap1(gl.text || gl.words || ''), UI(600, 16), X1 - nw - 24 - x), x, base, UI(600, 16), K.t1);
  }
  return h;
}

/* ---------- module header (one style everywhere): caps label in the speaker's colour, meta at the right ---------- */
function head(x, y, w, label, color, meta, metaC = K.t3) {
  caps(label, x, y + 10, 10, color);
  if (meta) {
    if (Array.isArray(meta)) { let rx = x + w; for (let i = meta.length - 1; i >= 0; i--) rx -= T(meta[i][0], rx, y + 10, MONO(400, 11), meta[i][1], 'right'); }
    else T(meta, x + w, y + 10, MONO(400, 11), metaC, 'right');
  }
  hline(x, y + 15, w, K.line);
  return HEAD;
}

/* ---------- 3. thinking band: the caller's why (quoted) and plan, or one honest line ---------- */
const PLACEHOLDER_PLAN = /next part of the plan, as the goal says/;
const WHY_GUT = 32;                    // between the why and the plan
// The why is set as a quote on a measure that fits it: for 1-3 balanced lines (22 px, or 20 px when 3 lines at 22 do not
// fit) the narrowest measure is found, and the plan takes the rest of the width. The candidate with the lowest band wins
// (nothing cut first, then the two sides closest in height). So there is never a hole to the right of a short why.
function thinkingLayout(maxPlan) {
  const th = st.thinking;
  // at least 76 px when earlier whys can run on under a short plan; with none (the first play call), as tall as the why
  // and the plan, and RAW gets the rest (a short why and plan at call 1 left 40 px empty)
  const bandMin = (st.earlierThinking || []).length ? 76 : 0;
  const planOk = !!(th.plan && !PLACEHOLDER_PLAN.test(th.plan));
  const metaW = capsW(`${CALLER} · WHY`, 10) + 24 + W(`call ${th.whyCall} · sent ${th.whyAt} · ${agoWords(th.lastCallAgoS ?? 0)}`, MONO(400, 11));
  const planFor = (pw) => {
    if (!planOk) return { ps: 14, pl: 19, plan: [], cut: false, ph: HEAD + 16 + ROW + 10 };
    let ps = 14, plan = wrap(th.plan, UI(500, 14), pw);
    if (plan.length > 6) { ps = 13; plan = wrap(th.plan, UI(500, 13), pw); }
    const capN = Math.min(maxPlan, ps === 14 ? 6 : 7);
    const cut = plan.length > capN;
    plan = clamp(plan, capN, UI(500, ps), pw);
    const pl = ps === 14 ? 19 : 18;
    return { ps, pl, plan, cut, ph: HEAD + 16 + (plan.length - 1) * pl + 10 };
  };
  let best = null;
  for (const ws of [22, 20]) for (const n of [1, 2, 3]) {
    const f = UI(600, ws), qw = W('”', f) + 3;
    let w;
    if (n === 1) w = W(th.why, f);
    else {
      if (wrap(th.why, f, 640 - qw).length > n) continue;
      let lo = 120, hi = 640 - qw;
      for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(th.why, f, mid).length <= n) hi = mid; else lo = mid; }
      w = hi;
    }
    const whyW = Math.max(Math.ceil((w + qw) / 4) * 4, Math.ceil(metaW / 4) * 4, 260);
    if (whyW > 640) continue;
    const why = wrap(th.why, f, whyW - qw);
    if (why.length !== n && !(n === 1 && why.length === 1)) continue;
    const planX = M + whyW + WHY_GUT, planW = X1 - planX;
    if (planW < 360) continue;
    const P = planFor(planW);
    const wl = ws === 22 ? 28 : 26;
    const whyH = HEAD + 4 + ws + (why.length - 1) * wl + 12;
    const h = Math.max(whyH, P.ph, bandMin);
    const score = h + (P.cut ? 1000 : 0) + (ws === 20 ? 8 : 0) + Math.abs(whyH - P.ph) * 0.3;
    if (!best || score < best.score) best = { score, ws, wl, why, whyW, whyH, planX, planW, h, planOk, ...P };
  }
  if (!best) {
    // a why too long for 3 lines at 20 px on the widest measure: cut at a word (whys are at most 140 characters, so rare)
    const f = UI(600, 20), whyW = 640, why = clamp(wrap(th.why, f, whyW - 12), 3, f, whyW - 12);
    const planX = M + whyW + WHY_GUT, P = planFor(X1 - planX);
    const whyH = HEAD + 4 + 20 + 2 * 26 + 12;
    best = { ws: 20, wl: 26, why, whyW, whyH, planX, planW: X1 - planX, h: Math.max(whyH, P.ph, bandMin), planOk, ...P };
  }
  return best;
}
function thinkingBand(y, draw, maxPlan = 7) {
  const th = st.thinking;
  if (!th.why) return noWhyBand(y, draw);
  const X = thinkingLayout(maxPlan);
  const h = X.h;
  if (!draw) { EARLIER_FROM = bandEarlier(X, 0, h, X.plan.length ? HEAD + 16 + (X.plan.length - 1) * X.pl + 21 : HEAD + 13, false); return h; }
  REG = [0, X.planX - WHY_GUT / 2, 'why'];
  rect(0, y, 1080, h, K.base);
  hline(0, y + h - 1, 1080, K.line);
  head(LX, y, X.whyW, `${CALLER} · WHY`, K.muse, [[`call ${th.whyCall} · sent ${th.whyAt} · `, K.t3], [agoWords(th.lastCallAgoS ?? 0), K.t2]]);
  // the why as quoted speech: the opening mark hangs in the margin, so the words align with the grid
  let yy = y + HEAD + 4 + X.ws;
  const qf = UI(600, X.ws);
  T('“', LX - W('“', qf) - 1, yy, qf, K.muse);
  X.why.forEach((l, i) => {
    const lw = T(l, LX, yy, qf, K.t1);
    if (i === X.why.length - 1) T('”', LX + lw + 1, yy, qf, K.muse);
    yy += X.wl;
  });
  REG = [X.planX - WHY_GUT / 2, 1080, 'plan'];
  if (X.plan.length) {
    head(X.planX, y, X.planW, 'PLAN', K.muse, `sent with call ${th.whyCall}`);
    let py = y + HEAD + 16;
    X.plan.forEach((l) => { T(l, X.planX, py, UI(500, X.ps), K.museInk); py += X.pl; });
    bandEarlier(X, y, h, py - X.pl + 21, true);
  } else {
    // no plan: say so, and give the space to the caller's earlier whys
    head(X.planX, y, X.planW, 'PLAN', K.t3, 'none sent with this call');
    bandEarlier(X, y, h, y + HEAD + 13, true);
  }
  return h;
}
// The caller's earlier whys in the thinking band: under a short plan they run on across the line(s) left; with no plan
// they are listed one per line. Returns how many it shows; the columns' EARLIER WHYS module goes on from there.
let EARLIER_FROM = 0;
function bandEarlier(X, y, h, ey, draw) {
  const et = st.earlierThinking || [];
  let shown = 0;
  if (!et.length || ey > y + h - 7) return 0;
  const tf = MONO(400, 11), wf = UI(500, 12);
  if (!X.plan.length) {
    if (draw) caps(`EARLIER WHYS · ${et.length}`, X.planX, ey, 9, K.muse);
    ey += ROW;
    for (const e of et) {
      if (ey > y + h - 7) break;
      if (draw) { T(e.at, X.planX + 34, ey, tf, K.t3, 'right'); T(ellip(e.why, wf, X.planW - 44), X.planX + 44, ey, wf, K.museInk); }
      ey += ROW; shown++;
    }
    return shown;
  }
  const lw = (draw ? caps('EARLIER', X.planX, ey - 1, 8, K.muse, 700, 0.1) : capsW('EARLIER', 8, 700, 0.1)) + 10;
  const x0 = X.planX + lw, x1 = X.planX + X.planW;
  let cx = x0;
  for (const e of et) {
    const need = W(e.at, tf) + 6 + W(e.why, wf);
    const last = ey + ROW > y + h - 7;
    if (cx > x0 && cx + need > x1 && !(last && x1 - cx >= 150)) {
      if (last) break;
      ey += ROW; cx = x0;
    }
    cx += (draw ? T(e.at, cx, ey, tf, K.t3) : W(e.at, tf)) + 6;
    const t = ellip(e.why, wf, x1 - cx);
    cx += (draw ? T(t, cx, ey, wf, K.museDim) : W(t, wf)) + 18;
    shown++;
    if (cx >= x1 - 40) { if (last) break; ey += ROW; cx = x0; }
  }
  return shown;
}
function noWhyMessage() {
  if (!st.thinking.latestPlayCall && !st.currentCall) return `No play call from ${callerWord} yet: its why and plan come with its first.`;
  const lp = st.thinking.latestPlayCall || { no: st.currentCall.no, tool: st.currentCall.tool, sent: st.currentCall.sent };
  const nWhy = st.raw.entries.filter((e) => e.hasWhy).length;
  return nWhy === 0
    ? `${cap1(callerWord)} sent no why or plan with ${lp.tool} call ${lp.no} (${lp.sent}), nor with any of its ${st.raw.total} calls this game.`
    : `${cap1(callerWord)} sent no why or plan with ${lp.tool} call ${lp.no} (${lp.sent}).`;
}
function noWhyBand(y, draw) {
  const h = NOWHY_H;
  if (!draw) return h;
  REG = [0, 1080, 'nowhy'];
  rect(0, y, 1080, h, K.base);
  hline(0, y + h - 1, 1080, K.line);
  const b = y + 19;
  let x = LX;
  x += caps(`${CALLER} · WHY`, x, b - 0.5, 10, K.muse) + 10;
  ring(x + 5, b - 4.5, 4, K.t4, 1.5); x += 16;
  T(ellip(noWhyMessage(), UI(500, 13), X1 - x), x, b, UI(500, 13), K.t3);
  return h;
}

/* ---------- 4a. NOW (the current call): Muse's orders in violet, the body's execution in amber ---------- */
function drawJsonLine(prefix, json, x, y, size, maxW, dim = false) {
  const f = MONO(400, size), cw = W('0000000000', f) / 10;
  const maxC = Math.floor(maxW / cw);
  const runs = [{ t: prefix + ' ', c: dim ? K.t3 : K.museHi }].concat(json ? jsonRuns(json) : []);
  let used = 0, cx = x;
  for (const r of runs) {
    if (used >= maxC) break;
    let t = r.t;
    if (used + t.length > maxC) t = t.slice(0, Math.max(0, maxC - used - 1)) + '…';
    T(t, cx, y, f, dim ? K.t4 : r.c); cx += t.length * cw; used += t.length;
  }
  return cx - x;
}
// a server answer under a call: "←" and the answer's time in the number gutter, the words where step labels start
function answerRow(x, b, w, at, text) {
  T('←', x + 18, b, MONO(400, 12), K.t3, 'center');
  T(at, x + 66, b, MONO(400, 11), K.t3, 'right');
  T(ellip(text, MONO(400, 12), w - 12 - 76), x + 76, b, MONO(400, 12), K.ans);
}
function latestRun() {
  // the newest call when it is not the current call (polls while a call runs, set_goal, ...)
  const cc = st.currentCall, r0 = st.raw.runs[0];
  if (!cc) return r0 || null;
  const ccN = (st.raw.entries.find((e) => e.playCallNo === cc.no) || {}).n;
  return r0 && !(r0.ns || []).includes(ccN) ? r0 : null;
}
// opts: { latestAns, interim } are fillers the layout turns on when the column has room
function nowModule(x, y, w, draw, opts = {}) {
  const cc = st.currentCall;
  let yy = y;
  const HH = 32;
  if (!cc) {
    // no play call yet: the strap says so, neutral (nothing runs); the newest call (start_game, live_view) under it
    if (draw) {
      REG = [0, DIV, 'now'];
      rect(x, yy, w, HH, K.museDeep);
      const nw = capsW('NOW', 11) + 24;
      rect(x, yy, nw, HH, K.t4);
      caps('NOW', x + 12, yy + 21, 11, K.base);
      T(`no play call from ${callerWord} yet`, x + nw + 12, yy + 21, UI(500, 13), K.t3);
    }
    yy += HH;
    if (opts.card) yy += howCard(x, yy, w, draw, opts.card);
    if (draw) REG = [0, DIV, 'now'];
    return yy - y + latestRows(x, yy, w, draw, opts);
  }
  if (draw) {
    REG = [0, DIV, 'now'];
    rect(x, yy, w, HH, K.museDeep);
    const running = cc.state === 'running';
    const tag = running ? 'NOW' : 'LAST';
    const nw = capsW(tag, 11) + 24;
    rect(x, yy, nw, HH, running ? K.muse : K.t2);
    const b = yy + 21;
    caps(tag, x + 12, b, 11, K.base);
    let cx = x + nw + 12;
    cx += caps('CALL ' + cc.no, cx, b, 11, K.t2) + 10;
    cx += T(cc.tool, cx, b + 1, MONO(500, 16), K.t1) + 10;
    cx += T(`sent ${cc.sent}`, cx, b, MONO(400, 12), K.t3);
    let rl;
    if (running) {
      const rw = T(cc.running, x + w - 12, b + 2, MONO(500, 20), K.t1, 'right');
      rl = x + w - 12 - rw - 8 - caps('RUNNING', x + w - 12 - rw - 8, b, 10, K.t2, 700, 0.09, 'right');
    } else {
      const rw = T(cc.doneIn, x + w - 12, b + 1, MONO(500, 16), cc.state === 'ok' ? K.ok : K.fail, 'right');
      rl = x + w - 12 - rw - 8 - caps(cc.state === 'ok' ? 'DONE IN' : 'ENDED', x + w - 12 - rw - 8, b, 10, cc.state === 'ok' ? K.ok : K.fail, 700, 0.09, 'right');
    }
    // step tracker, only for 2+ steps: one segment per step the caller sent
    const n = cc.steps.length;
    if (n > 1) {
      const sl = cx + 18, sr = rl - 16;
      const tw = Math.min(sr - sl, n * 30);
      if (tw >= 40) {
        const done = cc.steps.filter((q) => q.state === 'ok').length;
        const lab = `${done}/${n}`;
        const lw = W(lab, MONO(400, 11));
        const gx = sr - tw, segW = (tw - (n - 1) * 3) / n;
        if (gx - sl > lw + 8) T(lab, gx - 8, b, MONO(400, 11), K.t3, 'right');
        cc.steps.forEach((q, i) => {
          const sx = gx + i * (segW + 3), sy = yy + 14;
          rect(sx, sy, segW, 4, K.museTrack);
          if (q.state === 'ok') rect(sx, sy, segW, 4, K.ok);
          else if (q.state === 'run' && q.sub && q.sub.of) rect(sx, sy, Math.max(3, segW * q.sub.done / q.sub.of), 4, K.muse);
          else if (q.state === 'run') { g.strokeStyle = K.muse; g.lineWidth = 1; g.strokeRect(sx + 0.5, sy + 0.5, segW - 1, 3); } // running, amount unknown: hollow
          else if (q.state === 'fail') rect(sx, sy, segW, 4, K.fail);
        });
      }
    }
  }
  yy += HH;
  const added = cc.addedByServer || [];
  const rows = [];
  for (const sp of cc.steps) { for (const a of added) if (a.before === sp.n) rows.push({ server: true, raw: a.raw }); rows.push(sp); }
  for (const sp of rows) {
    if (sp.server) {
      // a step the server's check added: not the caller's, no number, drawn apart
      if (draw) {
        const cy = yy + 11;
        hline(x, yy + 21, w, K.line);
        T('+', x + 34, cy + 5, MONO(500, 13), K.t3, 'center');
        T(sp.raw, x + 76, cy + 4, MONO(400, 12), K.t3);
        caps('ADDED BY THE SERVER', x + w - 12, cy + 4, 9, K.t4, 700, 0.09, 'right');
      }
      yy += 22;
      continue;
    }
    const run = sp.state === 'run';
    const rowH = run ? 54 : 24;
    if (draw) {
      if (run) rect(x, yy, w, rowH, K.museTint);
      hline(x, yy + rowH - 1, w, K.line);
      if (run) {
        const cy = yy + 17;
        T(String(sp.n), x + 14, cy + 4, MONO(400, 12), K.t3);
        ring(x + 34, cy, 6, K.muse, 2); dot(x + 34, cy, 2.5, K.muse);
        icon(sp.icon, x + 48, cy - 10, 20);
        const lw = T(sp.say || sp.raw, x + 76, cy + 6, UI(600, 18), K.t1);
        const rawX = x + 76 + lw + 12;
        let rEdge = x + w - 12;
        if (sp.sub && sp.sub.of) rEdge -= T(`${sp.sub.done} of ${sp.sub.of}`, rEdge, cy + 6, MONO(500, 15), K.t1, 'right');
        else rEdge -= T(sp.elapsed, rEdge, cy + 6, MONO(500, 15), K.t1, 'right');
        drawJsonLine(sp.skill, sp.args ? JSON.stringify(sp.args) : '', rawX, cy + 5, 12, rEdge - 14 - rawX);
        // the body doing it: its own words, its progress
        const by = yy + 41;
        const tg = caps('BODY', x + 76, by, 8, K.body, 700, 0.1) + 7;
        const sw = T(sp.sub ? sp.sub.text : 'working on it', x + 76 + tg, by, UI(500, 13), K.bodyHi);
        const counted = sp.sub && sp.sub.of;
        const ew = counted ? T(sp.elapsed, x + w - 12, by, MONO(400, 13), K.t2, 'right') + 14 : 0;
        const bx = x + 76 + tg + sw + 14, bw = x + w - 12 - ew - bx;
        if (counted) {
          rrect(bx, by - 6, bw, 5, 2.5, K.track);
          rrect(bx, by - 6, Math.max(5, bw * sp.sub.done / sp.sub.of), 5, 2.5, K.body);
        } else {
          g.setLineDash([2, 4]); g.strokeStyle = 'rgba(239,164,67,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx, by - 3.5); g.lineTo(bx + bw, by - 3.5); g.stroke(); g.setLineDash([]);
        }
      } else {
        const cy = yy + 12;
        const queued = sp.state === 'queued';
        T(String(sp.n), x + 14, cy + 4, MONO(400, 12), K.t3);
        if (sp.state === 'ok') check(x + 34, cy, K.ok, 0.9);
        else if (sp.state === 'fail') cross(x + 34, cy, K.fail);
        else ring(x + 34, cy, 5, K.t4, 1.5);
        icon(sp.icon, x + 49, cy - 9, 18, queued ? 0.4 : 1);
        const lw = T(sp.say || sp.raw, x + 76, cy + 5, UI(600, 15), queued ? K.t3 : K.t2);
        const rawX = x + 76 + lw + 12;
        let rEdge = x + w - 12;
        if (queued) rEdge -= caps('QUEUED', rEdge, cy + 4, 9, K.t4, 700, 0.09, 'right');
        else if (sp.took) rEdge -= T(sp.took, rEdge, cy + 5, MONO(400, 13), K.t2, 'right');
        const room = rEdge - 14 - rawX;
        const rr = drawJsonLine(sp.skill, sp.args ? JSON.stringify(sp.args) : '', rawX, cy + 4, 12, room, queued);
        if (sp.state === 'ok' && sp.result && (room - rr - 12 >= W('→ ' + sp.result, UI(500, 12)) || room - rr - 12 >= 160)) T(ellip('→ ' + sp.result, UI(500, 12), room - rr - 12), rawX + rr + 12, cy + 4, UI(500, 12), K.t3);
      }
    }
    yy += rowH;
  }
  // filler: the server's interim answer to this running call
  if (opts.interim && cc && cc.state === 'running' && cc.serverAnswer) {
    if (draw) answerRow(x, yy + 14, w, cc.serverAnswer.at, cc.serverAnswer.text);
    yy += 20;
  }
  return yy - y + latestRows(x, yy, w, draw, opts);
}
// Before the first play call: how to read the HUD, for a viewer who just came in (gone with the first play call). level
// 1: who plays and where its calls are, and the colours; 2: where its why and plan come; 3: what the body does alone.
const CARD_F = UI(500, 13);
function cardText(level) {
  const who = cap1(callerWord);
  const paras = [`${who} plays this game itself, through MCP: every call it sends shows in RAW below exactly as sent, the server's answer after the arrow.`];
  if (level >= 2) paras.push(`Its why and plan come with each play call, in its own words, in the band above.`);
  if (level >= 3) paras.push(`The body fights, flees or eats by itself only by rules ${callerWord} set (counted as ${callerWord}'s, by its rules); anything it does on its own is amber.`);
  return paras;
}
function cardRows(w, level) { return cardText(level).reduce((a, t) => a + wrap(t, CARD_F, w - 24).length, 0) + 1; }
function howCard(x, y, w, draw, level) {
  const rows = cardRows(w, level);
  const h = 8 + HEAD + rows * ROW + 6;
  if (!draw) return h;
  REG = [x, x + w, 'card'];
  rrect(x, y + 6, w, h - 6, 4, K.band);
  const ix = x + 12, iw = w - 24;
  head(ix, y + 10, iw, 'HOW TO READ THIS', K.t2, 'until the first play call', K.t4);
  let by = y + 10 + HEAD + 13;
  for (const t of cardText(level)) for (const l of wrap(t, CARD_F, iw)) { T(l, ix, by, CARD_F, K.t2); by += ROW; }
  // the colours: the caller's, the body's, the server's
  const lf = UI(500, 12), who = cap1(callerWord);
  const sets = [[`${who}: its calls, why and plan`, 'its rules', 'the body on its own', 'the server'], [ellip(who, lf, 160), 'its rules', 'the body, alone', 'the server']];
  const labels = sets.find((ls) => ls.reduce((a, l) => a + 15 + W(l, lf) + 18, -18) <= iw) ?? sets[1];
  let lx = ix;
  labels.forEach((label, i) => {
    if (i === 1) { rect(lx, by - 9, 9, 9, K.museDim); for (let k = 0; k < 9; k += 3) rect(lx + k, by - 9, 1, 9, K.muse); } // hatched: by its rules
    else rect(lx, by - 9, 9, 9, [K.muse, null, K.body, K.t3][i]);
    lx += 15 + T(label, lx + 15, by, lf, K.t2) + 18;
  });
  return h;
}
// LATEST: the newest call when it is not the current one, with its answer as a filler
function latestRows(x, y, w, draw, opts) {
  let yy = y;
  const r0 = latestRun();
  if (r0) {
    const e0 = st.raw.entries[0];
    if (draw) {
      hline(x, yy, w, K.line);
      const cy = yy + 19;
      caps('LATEST', x + 14, cy, 9, K.t3);
      let cx = x + 76;
      cx += T(r0.tool, cx, cy, MONO(500, 13), K.museHi) + 8;
      const waiting = r0.newestState === 'waiting';
      const right = waiting ? `waiting ${mmss(e0.answer.waitingS)}` : `${agoWords(r0.lastAgoS)} · answered`;
      const rw = T(right, x + w - 12, cy, MONO(500, 13), waiting ? K.t1 : K.t2, 'right');
      const extra = r0.count > 1 ? `×${r0.count}` : '';
      const since = r0.count > 1 ? ` since ${r0.firstSent}` : '';
      const room = x + w - 12 - rw - 16 - cx - (extra ? W(extra, MONO(500, 12)) + 10 + W(since, MONO(400, 12)) : 0);
      const a = ellip(r0.args, MONO(400, 13), room);
      cx += T(a, cx, cy, MONO(400, 13), K.jStr) + 10;
      if (extra) {
        const ew = W(extra, MONO(500, 12));
        rrect(cx - 3, cy - 11, ew + 6, 15, 3, K.chip);
        cx += T(extra, cx, cy, MONO(500, 12), K.t1);
        T(since, cx, cy, MONO(400, 12), K.t2);
      }
    }
    yy += 28;
    // filler: the answer the newest call got last
    if (opts.latestAns && r0.latestAnswer) {
      if (draw) answerRow(x, yy + 9, w, r0.latestAnswerAt || '', r0.latestAnswer);
      yy += 18;
    }
  }
  return yy - y;
}

/* ---------- 4b. right column: the body's advice, the body and the world, earlier whys ---------- */
function adviceLines(w, budget) {
  // first item at least 3 lines (or all it has), others at least 1; spare lines go to the items in order
  const items = (st.advice.items || []), f2 = UI(500, 14);
  const full = items.map((it) => wrap(cap1(it.text), f2, w - 12));
  const n = full.map((l, i) => Math.min(l.length, i === 0 ? 3 : 1));
  let spare = budget - n.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n.length && spare > 0; i++) { const add = Math.min(spare, full[i].length - n[i]); n[i] += add; spare -= add; }
  return full.map((l, i) => clamp(l, n[i], f2, w - 12));
}
const adviceMinLines = () => { const items = st.advice.items || []; return items.map((it, i) => Math.min(wrap(cap1(it.text), UI(500, 14), RW - 12).length, i === 0 ? 3 : 1)).reduce((a, b) => a + b, 0); };
// what will show there, in as many lines as the budget allows (with the rules said above, the one row also does)
const noAdviceLines = (w, budget = 99) => {
  const long = wrap(`None given to ${callerWord} yet: the body's warnings (night, hunger, lava, mobs) show here, with whether ${callerWord} took them.`, UI(500, 13), w);
  const short = wrap(`None given to ${callerWord} yet: the body's warnings (night, hunger, lava, mobs) show here.`, UI(500, 13), w);
  return budget >= long.length ? long : budget >= short.length ? short : explainH() ? null : long;
};
// with no advice before the first play call: one row, or the lines that say what will show there (when there is room)
const adviceFullLines = () => ((st.advice.items || []).length ? (st.advice.items || []).map((it) => wrap(cap1(it.text), UI(500, 14), RW - 12).length).reduce((a, b) => a + b, 0) : !st.currentCall ? noAdviceLines(RW).length : 0);
function adviceVerdict() {
  // [glyph, words, colour]; a verdict about older advice is never shown against the current one
  const ad = st.advice, items = ad.items || [], at = items[0].givenAt;
  const who = cap1(callerWord);
  if (ad.follow) return ad.follow.ok ? ['ok', `${who} followed it`, K.ok] : ['fail', `${who} went on without it`, K.fail];
  if (ad.lastFollow && ad.lastFollow.atS >= items[0].givenAtS) return ad.lastFollow.ok ? ['ok', `${who} followed it · call at ${ad.lastFollow.at}`, K.ok] : ['fail', `${who} went on without it · call at ${ad.lastFollow.at}`, K.fail];
  const lastPlay = st.raw.entries.find((e) => e.playCallNo != null);
  if (!lastPlay || lastPlay.sentS <= items[0].givenAtS) return ['none', `No play call from ${callerWord} since ${at}`, K.t3];
  return ['none', 'No verdict logged', K.t3];
}
// Muse's rules in the left column under its calls: "RULES defend · eat at food 4 or less   set 0:12 · call 2", or none
const rulesH = () => (st.rules ? 22 : 0);
const rulesGap = () => (st.rules && st.currentCall ? 28 : 0); // the row and the room above it in the left column (in play)
// before the first play call the right column says what the body will do by itself: only what Muse's rules say
function rulesExplain(w) {
  const R = st.rules, who = cap1(callerWord), f = UI(500, 13);
  const on = R.on.map((r) => r.words);
  const t = on.length
    ? `${who}'s rules for the body: ${on.join(', ')}. The body does that by itself and nothing else; it counts as ${callerWord}'s, by its rules.`
    : `${who}'s rules for the body: none set. With none, the body does nothing by itself: it does not fight back, flee, get out of danger or eat. ${who} sets them with start_game or the policy skill; what the body then does counts as ${callerWord}'s, by its rules.`;
  return wrap(t, f, w);
}
const explainH = () => (st.rules && !st.currentCall && !RELAX ? HEAD + 9 + rulesExplain(RW).length * ROW : 0);
let RELAX = false; // per draw: no layout fitted, so the extras (the card, the rules said) go
function explainModule(x, y, w, draw) {
  if (!explainH()) return 0;
  if (draw) {
    REG = [DIV, 1080, 'rules'];
    head(x, y, w, `${CALLER} · RULES`, K.muse, 'reflexes are its own rules');
    rulesExplain(w).forEach((l, i) => T(l, x, y + HEAD + 13 + i * ROW, UI(500, 13), K.t2));
  }
  return explainH() + GAP;
}
function rulesRow(x, y, w, draw) {
  const R = st.rules;
  if (!R) return 0;
  if (!draw) return rulesH();
  REG = [0, DIV, 'rules'];
  const b = y + 13;
  let cx = x + caps('RULES', x, b, 10, K.muse) + 10;
  const f = UI(500, 12);
  const meta = R.set ? `${R.on.length ? 'set' : 'changed'} ${R.set}${R.call ? ` · call ${R.call}` : ''}` : '';
  const metaW = meta ? W(meta, MONO(400, 11)) + 12 : 0;
  if (!R.on.length) T(ellip(`none: every action is a direct call of ${callerWord}`, f, x + w - metaW - cx), cx, b, f, K.t3);
  else {
    // the chips, shortened when they do not fit ("eat at food 4 or less" -> "eat<=4")
    const words = R.on.map((r) => r.words);
    const fits = (ws) => ws.reduce((a, t) => a + W(t, f) + 14, 0) <= x + w - metaW - cx;
    const shown = fits(words) ? words : R.on.map((r) => (r.n === 'eat_below' ? `eat<=${r.v ?? '?'}` : r.words));
    for (const t of shown) {
      const tw = W(t, f);
      if (cx + tw + 10 > x + w - metaW) break;
      rrect(cx, b - 12, tw + 10, 15, 3, K.museDeep);
      T(t, cx + 5, b, f, K.museInk);
      cx += tw + 14;
    }
  }
  if (meta) T(meta, x + w, b, MONO(400, 11), K.t3, 'right');
  hline(x, y + 18, w, K.line);
  return rulesH();
}
function adviceModule(x, y, w, draw, budget) {
  const items = st.advice.items || [];
  if (draw) REG = [DIV, 1080, 'advice'];
  if (!items.length) {
    if (st.currentCall || (explainH() && !noAdviceLines(w, budget))) {
      // in play with no advice (or with the rules said above it before the first call): one row, the label and "none given" beside it (the room goes to the events)
      if (draw) { const lw = caps('BODY · ADVICE', x, y + 10, 10, K.body); T(`none given to ${callerWord} yet`, x + lw + 10, y + 10, UI(500, 12), K.t3); hline(x, y + 15, w, K.line); }
      return 22;
    }
    // before the first play call, also what will show here
    const lines = noAdviceLines(w, budget);
    if (draw) { head(x, y, w, 'BODY · ADVICE', K.body); lines.forEach((l, i) => T(l, x, y + HEAD + 13 + i * ROW, UI(500, 13), K.t3)); }
    return HEAD + 22 + (lines.length - 1) * ROW;
  }
  let yy = y;
  const at = items[0].givenAt, age = NOW_S - items[0].givenAtS;
  if (draw) head(x, yy, w, 'BODY · ADVICE', K.body, [[`${at} · `, K.t3], [agoWords(age), age > 300 ? K.bodyHi : K.t3]]);
  yy += HEAD;
  const f1 = UI(600, 14), f2 = UI(500, 14);
  const L = adviceLines(w, budget);
  const [kind, words, vc] = adviceVerdict();
  const vW = 12 + W(words, UI(500, 12));
  const lastL = L[L.length - 1], lastW = W(lastL[lastL.length - 1], f2) + 12;
  const inline = lastW + 28 + vW <= w; // the verdict sits at the end of the advice's last line
  items.forEach((it, idx) => {
    const gist = it.gist && cap1(it.text).startsWith(it.gist) ? it.gist : '';
    const lines = L[idx];
    if (draw) {
      rect(x, yy + 4, 3, 13 + (lines.length - 1) * ROW, K.body);
      lines.forEach((l, li) => {
        const by = yy + 15 + li * ROW;
        if (li === 0 && gist && l.startsWith(gist)) { const gw = T(gist, x + 12, by, f1, K.t1); T(l.slice(gist.length), x + 12 + gw, by, f2, K.t2); }
        else T(l, x + 12, by, f2, K.t2);
      });
    }
    yy += lines.length * ROW + 3;
  });
  if (draw) {
    const b = inline ? yy - 3 - ROW + 15 : yy + 14;
    const vx = inline ? x + w - vW : x;
    if (kind === 'ok') check(vx + 5, b - 4, K.ok, 0.75);
    else if (kind === 'fail') cross(vx + 5, b - 4, K.fail, 3);
    else ring(vx + 5, b - 4, 3.5, K.t4, 1.5);
    T(ellip(words, UI(500, 12), w - 12), vx + 12, b, UI(500, 12), vc);
  }
  if (!inline) yy += 20;
  return yy - y;
}
const EV_TX0 = 84; // event text starts here (time right-aligned at +34, tag at +42); wider when a rule's event shows
const evTx = () => ((st.events || []).some((e) => e.who === 'rule') ? 98 : EV_TX0);
// a rule's event leads with the rule and when Muse set it: "defend (set 0:12, call 2): fought a zombie"
const evText = (e) => (e.who === 'rule' ? `${e.rule ?? 'rule'}${e.ruleSet ? ` (set ${e.ruleSet}${e.ruleCall ? `, call ${e.ruleCall}` : ''})` : ''}: ${e.text}` : cap1(e.logged && (st.events || []).length <= 4 ? e.logged : e.text));
const EV_NOTE = 'Newest first: the body by Muse\'s rules or on its own, the world, the server.';
const WHO = { body: ['BODY', K.body], world: ['WORLD', K.world], server: ['SERVER', K.t3], rule: ['MUSE RULE', K.muse] };
// events, newest first, one line each; spare rows let the newest wrap (up to 3 lines)
function eventsPlan(w, h) {
  const ev = st.events || [];
  if (!ev.length || h < HEAD + ROW) return null;
  const f = UI(500, 12), tw = w - evTx();
  const rows = Math.floor((h - HEAD) / ROW);
  const n = Math.min(ev.length, rows);
  let spare = rows - n;
  const full = ev.slice(0, n).map((e) => wrap(evText(e), f, tw));
  const k = full.map(() => 1);
  for (let pass = 2; pass <= 3; pass++) for (let i = 0; i < n && spare > 0; i++) if (full[i].length >= pass && k[i] < pass) { k[i] = pass; spare--; }
  const L = full.map((l, i) => clamp(l, k[i], f, tw));
  // before the first play call, a row to spare says what this list is (a viewer who just came in)
  const note = !st.currentCall && spare >= 1 && n === ev.length ? EV_NOTE : '';
  return { n, L, note, h: HEAD + (L.reduce((a, l) => a + l.length, 0) + (note ? 1 : 0)) * ROW };
}
function eventsModule(x, y, w, h, draw) {
  const P = eventsPlan(w, h); if (!P) return 0;
  if (draw) {
    REG = [DIV, 1080, 'events'];
    const ev = st.events;
    const who = new Set(ev.slice(0, P.n).map((e) => e.who));
    const lab = [...(who.has('rule') ? ['MUSE RULES'] : []), ...['body', 'world', 'server'].filter((k) => k !== 'server' || who.has('server')).map((k) => k.toUpperCase())].join(' · ');
    head(x, y, w, lab, K.body, `${ev.length} logged · not ${callerWord}`);
    let yy = y + HEAD + 13;
    P.L.forEach((lines, i) => {
      const e = ev[i];
      T(e.at, x + 34, yy, MONO(400, 11), K.t3, 'right');
      const [tag, tc] = WHO[e.who] || ['', K.t3];
      caps(tag, x + 42, yy - 1, 8, tc, 700, 0.08);
      lines.forEach((l) => { T(l, x + evTx(), yy, UI(500, 12), e.who === 'rule' ? K.museInk : e.kind === 'milestone' ? K.t1 : K.t2); yy += ROW; });
    });
    if (P.note) T(ellip(P.note, UI(500, 12), w - evTx()), x + evTx(), yy, UI(500, 12), K.t4);
  }
  return P.h;
}
const earlierRest = () => (st.earlierThinking || []).slice(EARLIER_FROM);
function earlierModule(x, y, w, h, draw) {
  const et = earlierRest();
  if (!et.length || h < HEAD + ROW) return 0;
  const n = Math.min(et.length, Math.floor((h - HEAD) / ROW));
  if (draw) {
    REG = x < DIV ? [0, DIV, 'earlier'] : [DIV, 1080, 'earlier'];
    head(x, y, w, CALLER + ' · EARLIER WHYS', K.muse, EARLIER_FROM ? `${et.length} more before` : `${et.length} before`);
    for (let i = 0; i < n; i++) {
      const e = et[i], yy = y + HEAD + i * ROW + 13;
      T(e.at, x + 34, yy, MONO(400, 11), K.t3, 'right');
      T(ellip(e.why, UI(500, 12), w - 44), x + 44, yy, UI(500, 12), K.museInk);
    }
  }
  return HEAD + n * ROW;
}

/* ---------- 5. RAW: every call as sent, newest first, the server's answer after "←" ---------- */
const RAW_F = MONO(400, RAW_FS);
let RAW_CW = 0, RAW_FIRST = 0, RAW_REST = 0;
function rawEntryRuns(r) {
  // call: the tool and its arguments exactly as sent; count: the fold of identical calls; tail: the server's answer
  const call = [{ t: r.tool, c: K.museHi, w: 500 }, { t: ' ', c: K.t3 }];
  for (const j of jsonRuns(r.args)) call.push(j);
  const count = [];
  if (r.count > 1) { count.push({ t: '  ', c: K.t3 }); count.push({ t: `×${r.count}`, c: K.t1, w: 500, chip: true }); count.push({ t: ` ${r.firstSent}–${r.lastSent}`, c: K.t2 }); }
  const e0 = st.raw.entries.find((e) => e.n === r.ns[0]);
  const tail = [{ t: '  ← ', c: K.t3 }];
  if (r.newestState === 'waiting') {
    tail.push({ t: `waiting ${mmss(e0.answer.waitingS)}`, c: K.t1, w: 500 });
    if (r.latestAnswer) { tail.push({ t: ` · last answer ${r.latestAnswerAt}: `, c: K.t3 }); tail.push({ t: r.latestAnswer, c: K.ans }); }
  } else if (r.newestState === 'running') {
    tail.push({ t: e0.answer.hudText || `running ${st.currentCall.running}`, c: K.t1, w: 500 });
    if (r.latestAnswer) { tail.push({ t: ` · ${r.latestAnswerAt}: `, c: K.t3 }); tail.push({ t: r.latestAnswer, c: K.ans }); }
  } else {
    if (e0 && e0.answer.code) tail.push({ t: e0.answer.code + ' ', c: K.fail, w: 500 });
    // the code once (the answer's text starts with it too: "NEED_LIVE_VIEW: call live_view first ...")
    const code = e0 && e0.answer.code;
    const txt = code ? String(r.latestAnswer || '').replace(new RegExp(`^${code}:\\s*`), '') : (r.latestAnswer || '');
    const m = txt.match(/^(.*?): ok(:|\b)(.*)$/);
    if (m) { tail.push({ t: m[1] + ': ', c: K.ans }); tail.push({ t: 'ok', c: K.ok, w: 500 }); tail.push({ t: m[2] + m[3], c: K.ans }); }
    else tail.push({ t: txt, c: K.ans });
  }
  return { call, count, tail };
}
const flat = (runs) => { const o = []; for (const r of runs) for (const ch of r.t) o.push({ ch, c: r.c, w: r.w || 400, chip: !!r.chip }); return o; };
const ELL = () => ({ ch: '…', c: K.t3, w: 400, chip: false });
// wrap at JSON separators and spaces, never inside a token unless a token is longer than the line
function wrapChars(chars, first, rest) {
  const lines = []; let i = 0, lim = first;
  while (i < chars.length) {
    let end = Math.min(chars.length, i + lim);
    if (end < chars.length) {
      let strong = -1, weak = -1;
      for (let k = end; k > i + Math.floor(lim * 0.55); k--) {
        const ch = chars[k - 1].ch, nx = chars[k].ch;
        if (chars[k - 1].chip || chars[k].chip) continue;
        if (strong < 0 && (ch === ' ' || ch === ',')) strong = k;
        if (weak < 0 && (ch === ':' || ch === '{' || ch === '[' || ch === ';' || nx === '"' || nx === '{')) weak = k;
        if (strong >= 0) break;
      }
      const b = strong >= 0 ? strong : weak;
      if (b > i) end = b;
    }
    lines.push(chars.slice(i, end)); i = end;
    while (i < chars.length && chars[i].ch === ' ') i++;
    lim = rest;
  }
  return lines;
}
function wrapEntry(e) { return wrapChars(flat(e.call.concat(e.count, e.tail)), RAW_FIRST, RAW_REST); }
// cut an entry to n lines. A short call is kept whole and its answer is cut at a word; a long call is cut at a separator
// in its arguments, so the fold count and the start of the answer stay visible
function cutMono(e, n) {
  const cap = RAW_FIRST + (n - 1) * RAW_REST - 2;
  const call = flat(e.call), count = flat(e.count), tail0 = flat(e.tail);
  const cutTail = (max) => {
    if (tail0.length <= max) return tail0;
    let k = Math.max(6, max - 1); const sp = tail0.slice(0, k).map((o) => o.ch).lastIndexOf(' ');
    if (sp > k * 0.6) k = sp;
    return tail0.slice(0, k).concat([ELL()]);
  };
  const fit = (chars) => wrapChars(chars, RAW_FIRST, RAW_REST);
  if (call.length + count.length <= cap * 0.55) {
    for (let max = cap - call.length - count.length; ; max -= 4) {
      const lines = fit(call.concat(count, cutTail(max)));
      if (lines.length <= n || max < 10) return lines.slice(0, n);
    }
  }
  const tail = cutTail(Math.floor(cap * 0.45));
  for (let keep = cap - tail.length - count.length - 1; ; keep -= 4) {
    let k = Math.max(0, Math.min(keep, call.length));
    if (k < call.length) for (let j = k; j > Math.max(0, k - 14); j--) { const ch = call[j - 1].ch; if (ch === ',' || ch === ':' || ch === '{' || ch === '[' || ch === ' ') { k = j; break; } }
    let kk = k; while (kk > 0 && k < call.length && call[kk - 1].ch === ' ') kk--;
    const lines = fit(call.slice(0, kk).concat(k < call.length ? [ELL()] : [], count, tail));
    if (lines.length <= n || keep <= 0) return lines.slice(0, n);
  }
}
function drawMonoLine(chars, x, y) {
  let k = 0;
  while (k < chars.length) {
    let j = k; while (j < chars.length && chars[j].c === chars[k].c && chars[j].w === chars[k].w && chars[j].chip === chars[k].chip) j++;
    const s = chars.slice(k, j).map((o) => o.ch).join('');
    if (chars[k].chip) rrect(x + k * RAW_CW - 3, y - 11, (j - k) * RAW_CW + 6, 15, 3, K.chip);
    T(s, x + k * RAW_CW, y, MONO(chars[k].w, RAW_FS), chars[k].c);
    k = j;
  }
}
let RAW_ITEMS = null; // per draw
function rawItems() {
  if (RAW_ITEMS) return RAW_ITEMS;
  RAW_CW = W('0000000000', RAW_F) / 10;
  RAW_FIRST = Math.floor((X1 - RAW_TX) / RAW_CW);
  RAW_REST = RAW_FIRST - RAW_INDENT;
  RAW_ITEMS = st.raw.runs.map((r) => { const e = rawEntryRuns(r); return { r, e, full: wrapEntry(e) }; });
  return RAW_ITEMS;
}
const rawNeedFull = () => rawItems().reduce((a, it) => a + it.full.length, 0);
// Lines go out in this order: the newest call in full (up to 4 lines), one line each for the next three, the 2nd up to
// 2, one more entry, the 3rd up to 2, one more, the 2nd up to 3, one more, the 3rd up to 3, the 4th up to 2, then one
// line for every older entry. Lines left once every entry shows go to the cut entries, newest first.
const RAW_ORDER = [[0, 4], [1, 1], [2, 1], [3, 1], [1, 2], [4, 1], [2, 2], [5, 1], [1, 3], [6, 1], [2, 3], [3, 2]];
function rawPlan(nLines) {
  const items = rawItems(), N = items.length;
  const alloc = new Array(N).fill(0);
  let used = 0;
  const give = (i, upTo) => { if (i >= N || used >= nLines) return; const add = Math.max(0, Math.min(Math.min(items[i].full.length, upTo) - alloc[i], nLines - used)); alloc[i] += add; used += add; };
  for (const [i, c] of RAW_ORDER) give(i, c);
  for (let i = 7; i < N; i++) give(i, 1);
  for (let i = 0; i < N && used < nLines; i++) if (alloc[i]) give(i, items[i].full.length);
  const shown = [];
  for (let i = 0; i < N && alloc[i]; i++) shown.push({ it: items[i], n: alloc[i], lines: alloc[i] < items[i].full.length ? cutMono(items[i].e, alloc[i]) : items[i].full });
  return { shown, used };
}
function rawModule(y, nLines) {
  REG = [0, 1080, 'raw'];
  const P = rawPlan(nLines);
  rect(0, y, 1080, 1080 - y, K.band);
  hline(0, y, 1080, K.line);
  const hb = y + 16;
  const lw = caps(`${CALLER} · RAW CALLS`, M, hb, 10, K.muse);
  T('exactly as sent, newest first   ← the server’s answer', M + lw + 12, hb, MONO(400, 11), K.t3);
  const folded = st.raw.total - st.raw.runs.length;
  const hiddenRuns = st.raw.runs.slice(P.shown.length);
  const hidden = hiddenRuns.reduce((a, r) => a + r.count, 0);
  const a0 = hidden ? hiddenRuns[hiddenRuns.length - 1].firstSent : '', a1 = hidden ? hiddenRuns[0].lastSent : '';
  const range = hidden ? (a0 === a1 ? ` (${a0})` : ` (${a0}–${a1})`) : '';
  T(`${st.raw.total} calls${folded ? ` · ${folded} repeats folded` : ''}${hidden ? ` · ${hidden} older below${range}` : ''}`, X1, hb, MONO(400, 11), K.t3, 'right');
  let ly = y + RAW_HEAD;
  P.shown.forEach(({ it, n, lines }, i) => {
    const r = it.r;
    const top = ly, hgt = n * RAW_LH;
    if (i === 0) { rect(0, top, 1080, hgt, K.museTint); rect(0, top, 3, hgt, K.muse); }
    else if (i % 2 === 1) rect(0, top, 1080, hgt, K.zebra);
    const recent = r.lastAgoS < RECENT_S;
    let b = top + 13;
    T(rawWhen(r.lastAgoS, r.lastSent), RAW_TIME_R, b, MONO(recent ? 500 : 400, RAW_FS - 1), recent ? K.t1 : K.t3, 'right');
    for (let li = 0; li < n; li++) { drawMonoLine(lines[li], RAW_TX + (li ? RAW_INDENT * RAW_CW : 0), b); b += RAW_LH; }
    ly += hgt;
  });
  return P;
}
const rawH = (n) => RAW_HEAD + n * RAW_LH + RAW_BOT;

/* ---------- layout: measured, no state switches ---------- */
// left column: NOW, then fillers (the newest call's last answer, the running call's interim answer, earlier whys)
function packLeft(H, allowEarlier) {
  const opts = {};
  // before the first play call: the card, as full as fits
  if (!st.currentCall && !RELAX) {
    for (let lv = 3; lv >= 1; lv--) { opts.card = lv; if (nowModule(LX, 0, LW, false, opts) + rulesGap() <= H) break; }
    if (nowModule(LX, 0, LW, false, opts) + rulesGap() > H) delete opts.card; // no room even for the shortest card
  }
  // Muse's rules under its calls (its standing orders to the body)
  let used = nowModule(LX, 0, LW, false, opts) + rulesGap();
  if (used > H) return null;
  const r0 = latestRun();
  if (r0 && r0.latestAnswer && used + 18 <= H) { opts.latestAns = true; used += 18; }
  const cc = st.currentCall;
  if (cc && cc.state === 'running' && cc.serverAnswer && used + 20 <= H) { opts.interim = true; used += 20; }
  let earlier = 0;
  if (allowEarlier && earlierRest().length && H - used >= GAP + HEAD + ROW) { earlier = Math.min(earlierRest().length, Math.floor((H - used - GAP - HEAD) / ROW)); used += GAP + HEAD + earlier * ROW; }
  return { opts, used, earlier, gap: H - used, cardRows: opts.card ? cardRows(LW, opts.card) : 0 };
}
// right column: advice (its minimum always), then events, then earlier whys; the smallest gap wins, advice lines first
function packRight(H0, allowEarlier) {
  const H = H0 - (explainH() ? explainH() + GAP : 0); // before the first play call: what the body does by itself first
  const nItems = (st.advice.items || []).length;
  const bMin = adviceMinLines(), bFull = adviceFullLines();
  let best = null;
  for (let b = bMin; b <= Math.max(bMin, bFull); b++) {
    const aH = adviceModule(RX, 0, RW, false, b);
    if (aH > H) break;
    let used = aH, evH = 0, earlier = 0;
    const ep = eventsPlan(RW, H - used - GAP);
    if (ep) { evH = ep.h; used += GAP + evH; }
    if (allowEarlier && earlierRest().length && H - used >= GAP + HEAD + ROW) { earlier = Math.min(earlierRest().length, Math.floor((H - used - GAP - HEAD) / ROW)); used += GAP + HEAD + earlier * ROW; }
    // each advice line is worth 4 px of gap (the body's advice comes before the event log)
    // in play, room left: what Muse's rules make the body do by itself (none: nothing), at the bottom
    const xh = st.rules && st.currentCall ? HEAD + 9 + rulesExplain(RW).length * ROW : 0;
    const explain = xh && H - used >= GAP + xh;
    if (explain) used += GAP + xh;
    const cand = { b, aH, evH, earlier, explain, used, gap: H - used, score: H - used - 4 * b };
    if (!best || cand.score < best.score) best = cand;
  }
  if (!best && nItems === 0) return null;
  return best;
}
// a visible BODY · WORLD module (the body's and the rules' actions) is worth this much RAW (in px: 18 a line)
const EV_WORTH = 80;
function chooseLayout(colTop) {
  const avail = 1080 - colTop - PAD;
  const needFull = rawNeedFull();
  const nMax = Math.min(needFull, Math.floor((avail - RAW_HEAD - RAW_BOT) / RAW_LH));
  let best = null;
  for (let n = Math.min(RAW_MIN, needFull); n <= nMax; n++) for (let bot = RAW_BOT; bot >= 2; bot -= 2) {
    const H = avail - rawH(n) + (RAW_BOT - bot);
    const L = packLeft(H, true);
    if (!L) continue;
    const R = packRight(H, L.earlier === 0);
    if (!R) continue;
    const over = Math.max(0, L.gap - 24) + Math.max(0, R.gap - 24);
    // RAW lines count most; a visible BODY · WORLD module and earlier whys are worth a little RAW; holes cost
    // a line of the card is worth a little more than a line of RAW (it is gone with the first play call)
    const score = n * RAW_LH + L.cardRows * 20 + (R.evH ? EV_WORTH : 0) + (L.earlier || R.earlier ? 20 : 0) - over * 4 - (L.gap + R.gap) * 0.25;
    if (!best || score > best.score) best = { n, H, L, R, score };
  }
  return best;
}
// The layout (the plan's lines, RAW's lines, what fills each column) is searched again only when something it depends
// on changed: the clocks, the ages, the elapsed times, the stats and the hotbar are drawn where they stand (one line
// each), so a state that differs only there keeps the layout it had; those that sit in wrapped text (a call's running
// time in RAW, the why's age in its header) count by their length.
const MOVING = new Set(['now', 'stats', 'position', 'inventory', 'gameS', 'agoS', 'lastAgoS', 'elapsed', 'sub', 'lastCallAgoS', 'running', 'waitingS', 'hudText']);
const DIG = (v) => String(v).replace(/\d/g, '0');
/**
 * The state's signature without what moves with the clock (forLayout: with the moving texts that can change the
 * layout, by their length).
 */
export function hudSig(state, forLayout = false) {
  return JSON.stringify(state, (k, v) => {
    if (!MOVING.has(k)) return v;
    if (!forLayout) return undefined;
    if (k === 'lastCallAgoS') return DIG(agoWords(v ?? 0));
    if (k === 'running' || k === 'hudText') return typeof v === 'string' ? DIG(v) : undefined;
    if (k === 'waitingS') return Number.isFinite(v) ? DIG(mmss(v)) : undefined;
    return undefined;
  });
}
let LAST = null; // the last layout: {sig, maxPlan, tH, colTop, best, earlierFrom}
let REUSE = true; // per draw: o.reuse false searches the layout again whatever the state
let SEARCHES = 0; // layout searches so far (tests, measuring)
function drawAll() {
  rect(0, VH, 1080, 1080 - VH, K.base);
  REG = [0, 1080, 'video'];
  drawHotbar();
  drawSheltered();
  drawToast();
  let y = VH;
  y += statsBand(y);
  const gH = goalBand(y, false);
  // the plan gives up lines (down to 3) before RAW drops below its minimum
  let maxPlan = 7, tH, colTop, best;
  const sig = REUSE ? hudSig(st, true) : null;
  if (sig !== null && LAST && LAST.sig === sig) ({ maxPlan, tH, colTop, best } = LAST);
  else {
    for (;;) {
      tH = thinkingBand(0, false, maxPlan);
      colTop = VH + BAND_H + gH + tH + PAD;
      best = chooseLayout(colTop);
      if ((best && best.n >= Math.min(RAW_MIN, rawNeedFull())) || maxPlan <= 3) break;
      maxPlan--;
    }
    if (!best) { RELAX = true; best = chooseLayout(colTop); } // nothing fitted: without the extras
    LAST = sig === null ? null : { sig, maxPlan, tH, colTop, best, earlierFrom: EARLIER_FROM, relax: RELAX };
    SEARCHES += 1;
  }
  if (LAST && LAST.sig === sig) { EARLIER_FROM = LAST.earlierFrom; RELAX = LAST.relax; }
  goalBand(y, true); y += gH;
  thinkingBand(y, true, maxPlan); y += tH;
  const { n, H, L, R } = best;
  // left column
  nowModule(LX, colTop, LW, true, L.opts);
  let ly = colTop + nowModule(LX, 0, LW, false, L.opts);
  if (rulesGap()) { rulesRow(LX + 14, ly + 6, LW - 26, true); ly += rulesGap(); }
  if (L.earlier) earlierModule(LX, ly + GAP, LW, HEAD + L.earlier * ROW, true);
  REG = [0, 1080, 'columns'];
  vline(DIV, colTop, H, K.line);
  // right column
  let ry = colTop + explainModule(RX, colTop, RW, true);
  ry += adviceModule(RX, ry, RW, true, R.b);
  if (R.evH) { eventsModule(RX, ry + GAP, RW, R.explain ? R.evH : H - (ry - colTop) - GAP, true); ry += GAP + R.evH; }
  if (R.earlier) { earlierModule(RX, ry + GAP, RW, HEAD + R.earlier * ROW, true); ry += GAP + HEAD + R.earlier * ROW; }
  if (R.explain) { REG = [DIV, 1080, 'rules']; head(RX, ry + GAP, RW, `${CALLER} · RULES`, K.muse, 'reflexes are its own rules'); rulesExplain(RW).forEach((l, i) => T(l, RX, ry + GAP + HEAD + 13 + i * ROW, UI(500, 13), K.t2)); }
  const rawTop = colTop + H + PAD;
  const P = rawModule(rawTop, n);
  LAYOUT = {
    stats: [VH, BAND_H], goal: [VH + BAND_H, gH], thinking: [VH + BAND_H + gH, tH], columns: [colTop, H], raw: [rawTop, 1080 - rawTop],
    rawLines: n, rawEntries: P.shown.length, maxPlan, leftGap: L.gap, rightGap: R.gap, adviceLines: R.b, events: R.evH ? eventsPlan(RW, H - R.aH - GAP).n : 0,
    earlier: L.earlier || R.earlier, fillers: L.opts,
  };
  qaCheck();
}

/* ---------- QA: overlaps, canvas exits, column crossings ---------- */
function qaCheck() {
  const bad = [];
  for (const b of QA) {
    if (b.x < -0.5 || b.x + b.w > 1080.5 || b.y < -0.5 || b.y + b.h > 1080.5) bad.push(['canvas', b]);
    else if (b.x < b.reg[0] - 0.5 || b.x + b.w > b.reg[1] + 0.5) bad.push([`leaves ${b.reg[2]}`, b]);
  }
  for (let i = 0; i < QA.length; i++) for (let j = i + 1; j < QA.length; j++) {
    const a = QA[i], b = QA[j];
    if ((a.icon || b.icon) && a.reg[2] === 'hotbar' && b.reg[2] === 'hotbar') continue;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 1 && oy > 1) bad.push(['overlap', a, b]);
  }
  QA_RESULT = { texts: QA.length, problems: bad.map((p) => [p[0], p[1].s, p[2] ? p[2].s : null]) };
  if (QA_DRAW) for (const p of bad) for (const b of p.slice(1)) { g.strokeStyle = '#ff2d55'; g.lineWidth = 2; g.strokeRect(b.x, b.y, b.w, b.h); }
}


/**
 * Draw the HUD for a state into g (a 1080x1080 frame's coordinates; translate first to draw into a part of one).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state           src/ui-panel.js hudState()
 * @param {{icon?: (name: string, size: number) => any, qa?: boolean, reuse?: boolean}} [o]  reuse: keep the last layout for a
 *   state that differs from the last one only in what moves with the clock (hudSig; the default)
 * @returns {{layout: object, qa: {texts: number, problems: Array}, searches: number}}
 */
export function drawHud(ctx, state, o = {}) {
  g = ctx;
  st = state;
  ICON = o.icon ?? (() => null);
  QA_DRAW = Boolean(o.qa);
  QA = [];
  REG = [0, 1080, 'canvas'];
  RAW_ITEMS = null;
  EARLIER_FROM = 0;
  CALLER = st.caller || 'MUSE';
  callerWord = CALLER === 'MUSE' ? 'Muse' : CALLER === 'TEST SCRIPT' ? 'the test script' : CALLER.toLowerCase() === 'agent' ? 'the agent' : CALLER;
  NOW_S = st.now?.gameS ?? 0;
  REUSE = o.reuse !== false;
  RELAX = false;
  drawAll();
  return { layout: LAYOUT, qa: QA_RESULT, searches: SEARCHES };
}
/** The sizes icons are drawn at (pre-scale each once). */
export const ICON_SIZES = Object.freeze([16, 18, 20, 24, 28]);
export const HUD_TOKENS = K;
