// src/ui-panel.js - the command area under the game in the live video (STREAM_LAYOUT=ui, the camera's side), the
// owner's pick of three designs (option A, 2026-10-12): a big "Now" card and a side column.
//
// The card: Muse's command with its step and a ticking time, Muse's own words for it (the call's `why`) as a quote, the
// body carrying it out live (the runtime's sub-step: "pouring water on lava", "obsidian 3 of 14", with a progress
// bar), the step before and the reflexes along the way. When nothing runs, its top line says what is happening instead
// ("Waiting for Muse's next move 0:45", "Sheltering until morning ...") over the last command and its result, so the
// picture never looks frozen. The side column: what Muse saw when it last looked ("Muse checked"), the Body advice and
// whether Muse took it, and the earlier commands, a failure's reason on its own line. A milestone is a toast over the
// game. A header line: health, food, the time or the Nether, and Muse's share. Two type sizes; nothing cut mid-word.
//
// Drawn with node-canvas at the stream's frame rate (30 a second): the card's and the column's text are drawn into their
// own canvases only when they change; a frame copies them and draws the moving parts (the pulse, the progress bar, the
// running dots, the toast). Each frame is an uncompressed 32-bit BMP with alpha (the toast's band over the game is
// see-through), renamed over the panel file, which ffmpeg reads again for every frame (src/stream.js). Every text was
// cleaned by the agent and again by the service (src/terminal.js).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const UI_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'muse-ui');
const ICONS = ['heart', 'food', 'sun', 'moon', 'flame', 'star', 'pickaxe', 'boot', 'hammer', 'sword', 'house', 'portal', 'bucket', 'compass', 'bed', 'shield'];
export const UI_COLORS = Object.freeze({
  bg: '#0f131a', card: '#171d27', rule: 'rgba(255,255,255,0.08)', text: '#f3f1ec', soft: '#aab2c4', muted: '#6c7589',
  muse: '#a99bff', quote: '#d9d3ff', ok: '#5fd09c', fail: '#ff8a7a', gold: '#ffd164', body: '#7cc4ff',
});
const FAMILY = 'MuseUI';
/** Calls that are not a command (Muse looking around, the live view itself). */
const QUIET = /^> (?:get_state|live_view)\b/;
const ease = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** The icon for a command or a sub-step, from its words or its kind. */
export function iconFor(words, kind = '') {
  const k = String(kind);
  if (k === 'walk') return 'boot';
  if (k === 'mine') return 'pickaxe';
  if (k === 'build') return 'hammer';
  if (k === 'bucket') return 'bucket';
  if (k === 'smelt') return 'flame';
  if (k === 'fight') return 'sword';
  if (k === 'eat') return 'food';
  if (k === 'sleep') return 'bed';
  if (k === 'explore') return 'compass';
  const w = String(words ?? '').toLowerCase();
  if (/^walk|^go to/.test(w)) return 'boot';
  if (/^mine|^dig/.test(w)) return 'pickaxe';
  if (/^craft|^make/.test(w)) return /shield/.test(w) ? 'shield' : 'hammer';
  if (/^smelt/.test(w)) return 'flame';
  if (/shelter|^build/.test(w)) return 'house';
  if (/^fight|^hunt/.test(w)) return 'sword';
  if (/bucket|^pour/.test(w)) return 'bucket';
  if (/portal/.test(w)) return 'portal';
  if (/^explore/.test(w)) return 'compass';
  if (/^sleep/.test(w)) return 'bed';
  if (/^eat/.test(w)) return 'food';
  return 'compass';
}

/** Words wrapped to maxW in at most `lines` lines; null when they do not fit (never cut mid-word). */
function wrapFit(g, text, maxW, lines) {
  const out = [];
  let cur = '';
  for (const w of String(text ?? '').split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width <= maxW) cur = next;
    else if (!cur) return null; // one word wider than the line
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out.length <= lines ? out : null;
}
/** Wrapped to fit: the text, else shorter forms of it (a sequence's first step and "and N more"), else cut at a word. */
function fitText(g, text, maxW, lines) {
  const t = String(text ?? '');
  const tries = [t];
  const m = /^(.*?), then (.*?)(?:, and (\d+) more)?$/.exec(t);
  if (m) tries.push(`${m[1]}, and ${1 + Number(m[3] ?? 0)} more`, m[1]);
  for (const x of tries) { const w = wrapFit(g, x, maxW, lines); if (w) return w; }
  // last resort: whole words up to the room, then "..."
  const words = t.split(/\s+/);
  while (words.length > 1) { words.pop(); const w = wrapFit(g, `${words.join(' ')}...`, maxW, lines); if (w) return w; }
  return [t];
}
/** A comma list wrapped to fit, dropping whole items from its end (never "..."): "HP 20, food 14, 1 diamond pickaxe". */
function fitList(g, text, maxW, lines) {
  const items = String(text ?? '').split(/,\s*/);
  while (items.length) { const w = wrapFit(g, items.join(', '), maxW, lines); if (w) return w; items.pop(); }
  return [];
}
/** A failure's reason, its first clause when that still says something: "no lava pool within 16 blocks". */
export function shortReason(t) {
  const x = String(t ?? '').trim();
  const head = x.split(/,\s|\s+to make\b|\s+because\b|\s+so that\b/)[0].replace(/\.\.\.$/, '').trim();
  return head.split(/\s+/).length >= 3 ? head : x;
}
const capital = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const secs = (ms) => (ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${Math.max(0.1, Math.round(ms / 100) / 10)} s`);
/** "reflex: defending itself (zombie), then back to collecting" -> "defending itself (zombie)". */
const reflexGist = (text) => String(text ?? '').replace(/^(?:reflex|body|Reflex|Body):\s*/, '').split(/,|;| then /)[0].trim();
/** The advice in a few words: "night: no closed shelter around you". */
export function adviceGist(text) {
  let t = String(text ?? '').replace(/^advice:\s*/i, '').replace(/\s*\((?:time|at) [^)]*\)/g, '').split(/;\s*/)[0].trim();
  // "<fact>: <what to do with a skill's name>" keeps the fact; a short lead ("night: ...") stays with what follows
  const at = t.indexOf(': ');
  if (at > 0 && t.slice(0, at).split(/\s+/).length > 3) t = t.slice(0, at);
  return t.replace(/\b([a-z]+)_([a-z_]+)\b/g, (m) => m.replace(/_/g, ' ')).trim();
}
/** A milestone line in words: "milestone: a wooden pickaxe at 0:41" -> "Got a wooden pickaxe"; places as they are. */
export function milestoneWords(t) {
  const s = String(t ?? '').replace(/\s+at \d+:\d\d$/, '');
  if (/^milestone:\s*/i.test(s)) return `Got ${s.replace(/^milestone:\s*/i, '')}`;
  return capital(s);
}

/**
 * @param {object} o
 * @param {number} o.width            the panel's size under the game (the frame's width, the rest of its height)
 * @param {number} o.height
 * @param {number} [o.over]           a see-through band this tall over the bottom of the game, for the milestone toast
 * @param {string} [o.file]           where each frame goes (an uncompressed BMP with alpha, replaced by renaming)
 * @param {number} [o.fps]            frames a second written by start() (30)
 * @param {string} [o.assets]         icons and fonts (assets/muse-ui)
 * @param {() => number} [o.now]
 */
export function createUiPanel(o) {
  const { createCanvas, Image, registerFont } = require('canvas');
  const assets = o.assets ?? UI_ASSETS;
  const now = o.now ?? Date.now;
  const W = o.width;
  const H = o.height;
  const T = o.over ?? 0; // the toast's band over the game
  const s = W / 1080; // drawn for 1080 wide
  const fps = o.fps ?? 30;
  if (!createUiPanel.fonts) {
    createUiPanel.fonts = true;
    for (const [file, weight] of [['Inter-Medium.ttf', '500'], ['Inter-SemiBold.ttf', '600'], ['Inter-Bold.ttf', '700']]) {
      try { registerFont(path.join(assets, 'fonts', file), { family: FAMILY, weight }); } catch { /* the default sans-serif then */ }
    }
  }
  const BIG = 32; // two sizes only
  const SMALL = 22;
  const font = (weight, px) => `${weight} ${Math.round(px * s)}px ${FAMILY}`;
  const load = (p) => { const im = new Image(); im.src = fs.readFileSync(p); return im; };
  const sized = (im, w) => { const c = createCanvas(Math.round(w), Math.round(w)); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); return c; };
  const icons = {};
  const iconsBig = {};
  for (const n of ICONS) {
    try { const im = load(path.join(assets, 'icons', `${n}.png`)); icons[n] = sized(im, 30 * s); iconsBig[n] = sized(im, 36 * s); } catch { /* drawn without */ }
  }
  const icon = (g, n, x, y, big = false) => { const c = (big ? iconsBig : icons)[n] ?? (big ? iconsBig : icons).compass; if (c) g.drawImage(c, x, y); };

  // ----- geometry (y in the panel; the canvas has the toast's band T above it)
  const PAD = 34 * s;
  const CX = 28 * s; // the card
  const CW = 640 * s;
  const CY = 72 * s;
  const CH = H - CY - 20 * s;
  const SX = 700 * s; // the side column
  const SW = W - SX - PAD;
  const IN = CX + 24 * s; // inside the card
  const IW = CW - 48 * s;

  const canvas = createCanvas(W, H + T);
  const g = canvas.getContext('2d');
  const bg = createCanvas(W, H);
  {
    const b = bg.getContext('2d');
    b.fillStyle = UI_COLORS.bg;
    b.fillRect(0, 0, W, H);
    b.fillStyle = UI_COLORS.rule;
    b.fillRect(PAD, 58 * s, W - 2 * PAD, Math.max(1, Math.round(2 * s)));
    rr(b, CX, CY, CW, CH, 18 * s);
    b.fillStyle = UI_COLORS.card;
    b.fill();
  }

  // ----- what is shown
  const st = { hp: null, food: null, clock: '', muse: null, reflex: null, pct: null };
  let commands = []; // newest first: {say, words, of, at, state: {kind, text}, msSum, done: [{say, kind, ms, why, n}], reflexes: [], icon}
  let sub = null; // the body's live sub-step: {kind, text, done, of, left, first, at}
  let live = null; // what the agent says is happening: {mode, reason, step, sinceS, dawnS, at}
  let checked = null; // {text, at}
  let follow = null; // {text, ok, at}
  const advice = new Map(); // kind -> {text, sev, at}
  let toast = null; // {text, at}
  let anchor = null; // the game clock: {ticks, at, rate}
  let lastEventAt = -1e9;
  let header = null;
  let shownClock = '';
  let card = null;
  let cardKey = '';
  let side = null;
  let sideKey = '';
  let barShown = 0; // the progress bar, eased toward its value
  let frames = 0;
  let timer = null;

  const clockNow = () => {
    if (!st.clock || st.clock === 'NETHER' || st.clock === 'END' || !anchor) return st.clock;
    const tk = (((anchor.ticks + anchor.rate * (now() - anchor.at)) % 24_000) + 24_000) % 24_000;
    const h = Math.floor(tk / 1000 + 6) % 24;
    const m = Math.floor(((tk % 1000) * 60) / 1000);
    return `${tk >= 13_000 && tk < 23_000 ? 'NIGHT' : 'DAY'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  function drawHeader() {
    shownClock = clockNow();
    const c = createCanvas(W, Math.round(58 * s));
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    const y = 30 * s;
    let x = PAD;
    const item = (n, t, color = UI_COLORS.text) => {
      icon(b, n, x, y - 15 * s);
      x += 38 * s;
      b.font = font(600, SMALL);
      b.fillStyle = color;
      b.fillText(t, x, y + 1 * s);
      x += b.measureText(t).width + 30 * s;
    };
    item('heart', Number.isFinite(st.hp) ? `${st.hp}/20` : '--', Number.isFinite(st.hp) && st.hp <= 6 ? UI_COLORS.fail : UI_COLORS.text);
    item('food', Number.isFinite(st.food) ? `${st.food}/20` : '--');
    if (st.clock === 'NETHER') item('flame', 'Nether');
    else if (st.clock === 'END') item('star', 'The End');
    else if (shownClock) item(shownClock.startsWith('NIGHT') ? 'moon' : 'sun', shownClock.replace(/^(?:DAY|NIGHT) /, ''));
    const pct = Number.isFinite(st.pct) ? st.pct : Number.isFinite(st.muse) && Number.isFinite(st.reflex) && st.muse + st.reflex > 0 ? Math.round((100 * st.muse) / (st.muse + st.reflex)) : null;
    if (pct !== null) {
      b.font = font(600, SMALL);
      const t = `Muse ${pct}%`;
      const w = b.measureText(t).width;
      b.fillStyle = UI_COLORS.muse;
      b.fillText(t, W - PAD - w, y + 1 * s);
      bar(b, W - PAD - w - 16 * s - 130 * s, y - 3 * s, 130 * s, 6 * s, pct / 100, UI_COLORS.muse);
    }
    header = c;
  }

  // ----- the card: what runs now (or what is happening while nothing does), drawn when its words change
  const running = () => commands.find((c) => c.state?.kind === 'run') ?? null;
  function statusWords(t) {
    const reason = live?.mode === 'idle' ? live.reason : 'waiting';
    const since = live && Number.isFinite(live.sinceS) ? live.sinceS + (t - live.at) / 1000 : Math.max(0, (t - lastEventAt) / 1000);
    if (['shelter', 'shelter_body', 'sleep'].includes(reason) && Number.isFinite(live?.dawnS)) {
      const left = live.dawnS - (anchor?.rate === 0 ? 0 : (t - live.at) / 1000);
      const dawn = left > 60 ? `night ends in ~${Math.ceil(left / 60)} min` : left > 0 ? 'night ends in under a minute' : 'morning is here';
      if (reason === 'sleep') return `Sleeping until morning, ${dawn}`;
      return `Sheltering until morning (${reason === 'shelter' ? 'Muse’s choice' : 'the body’s reflex'}), ${dawn}`;
    }
    if (reason === 'checking') return `Muse is checking the situation · ${mmss(since)}`;
    if (reason === 'nether') return `In the Nether, waiting for Muse’s next move · ${mmss(since)}`;
    return `Waiting for Muse’s next move · ${mmss(since)}`;
  }

  function drawCard(t) {
    const run = running();
    const cmd = run ?? commands[0] ?? null;
    const c = createCanvas(Math.round(CW), Math.round(CH));
    const b = c.getContext('2d');
    b.textBaseline = 'alphabetic';
    const x = IN - CX;
    let y = 34 * s;
    const text = (str, xx, yy, { size = SMALL, weight = 500, color = UI_COLORS.text, align = 'left' } = {}) => {
      b.font = font(weight, size); b.fillStyle = color; b.textAlign = align; b.fillText(str, xx, yy); b.textAlign = 'left';
      return b.measureText(str).width;
    };
    if (!cmd) {
      text(statusWords(t), x + 24 * s, y, { weight: 700, color: UI_COLORS.soft });
      return { c, dyn: { pulseY: y - 7 * s } };
    }
    const dyn = {};
    if (!run) {
      // nothing runs: what is happening, big, with a breathing dot; then the last command, its words, its steps
      b.font = font(600, BIG);
      const st0 = fitText(b, statusWords(t), IW - 24 * s, 2);
      st0.forEach((l, i) => text(l, x + 24 * s, y + 6 * s + i * 40 * s, { size: BIG, weight: 600, color: UI_COLORS.soft }));
      dyn.pulseY = y - 6 * s;
      y += (st0.length - 1) * 40 * s + 54 * s;
      text('Muse\u2019s last command', x, y, { weight: 700, color: UI_COLORS.muse });
      y += 32 * s;
      b.font = font(600, SMALL);
      const ll = fitText(b, cmd.say, IW, 2);
      ll.forEach((l, i) => text(l, x, y + i * 28 * s, { weight: 600 }));
      y += (ll.length - 1) * 28 * s;
      if (cmd.words && y + 70 * s < CH) {
        b.font = font(500, SMALL);
        const q = fitText(b, `\u201c${cmd.words}\u201d`, IW - 18 * s, 2);
        b.fillStyle = UI_COLORS.muse;
        b.fillRect(x, y + 12 * s, 4 * s, q.length * 28 * s + 4 * s);
        q.forEach((l, i) => text(l, x + 16 * s, y + 34 * s + i * 28 * s, { color: UI_COLORS.quote }));
        y += q.length * 28 * s + 10 * s;
      }
      y += 32 * s;
      if (cmd.state?.kind === 'ok') text(cmd.state.text, x, y, { weight: 600, color: UI_COLORS.ok });
      else if (cmd.state?.kind === 'fail') {
        b.font = font(600, SMALL);
        text(fitText(b, cmd.state.step && cmd.of > 1 ? `Failed at: ${cmd.state.step}` : 'Failed', IW, 1)[0], x, y, { weight: 600, color: UI_COLORS.fail });
        if (cmd.state.why && y + 30 * s < CH) { y += 28 * s; b.font = font(500, SMALL); text(fitText(b, capital(cmd.state.why), IW, 1)[0], x, y, { color: UI_COLORS.fail }); }
      }
      // its steps before the last, and the reflexes along the way, while there is room
      for (const d of cmd.done.slice(0, -1).slice(-3)) {
        if (y + 36 * s > CH) break;
        y += 32 * s;
        icon(b, iconFor(d.say), x, y - 23 * s);
        b.font = font(500, SMALL);
        const right = d.kind === 'ok' ? `${secs(d.ms ?? 0)}` : 'failed';
        const rw = b.measureText(right).width;
        text(fitText(b, d.say, IW - 44 * s - rw - 12 * s, 1)[0], x + 40 * s, y, { color: UI_COLORS.soft });
        text(right, IW + x, y, { weight: 600, color: d.kind === 'ok' ? UI_COLORS.ok : UI_COLORS.fail, align: 'right' });
      }
      const rf = cmd.reflexes[cmd.reflexes.length - 1];
      if (rf && y + 36 * s < CH) { y += 32 * s; b.font = font(500, SMALL); text(fitText(b, `Reflex on the way: ${rf}`, IW, 1)[0], x, y, { color: UI_COLORS.muted }); }
      return { c, dyn };
    }
    // the top line: the command's step and time
    {
      const n = Math.min(run.of || 1, run.done.length + 1);
      const of = run.of || 1;
      text(`Muse\u2019s command${of > 1 ? ` \u00b7 step ${n} of ${of}` : ''} \u00b7 ${mmss((t - run.at) / 1000)}`, x, y, { weight: 700, color: UI_COLORS.muse });
    }
    y += 42 * s;
    // the command, as big as two lines allow
    b.font = font(700, BIG);
    const lines = fitText(b, cmd.say, IW, 2);
    lines.forEach((l, i) => text(l, x, y + i * 40 * s, { size: BIG, weight: 700 }));
    y += (lines.length - 1) * 40 * s + 12 * s;
    // Muse's own words, if it gave any (else no block at all)
    if (cmd.words) {
      b.font = font(500, SMALL);
      const q = fitText(b, `\u201c${cmd.words}\u201d`, IW - 18 * s, 2);
      b.fillStyle = UI_COLORS.muse;
      b.fillRect(x, y + 4 * s, 4 * s, q.length * 30 * s + 6 * s);
      q.forEach((l, i) => text(l, x + 16 * s, y + 26 * s + i * 30 * s, { color: UI_COLORS.quote }));
      y += q.length * 30 * s + 20 * s;
    }
    if (run) {
      // the body carrying it out: the runtime's sub-step, or the running step's words while none has come
      y += 22 * s;
      text('The body is carrying it out', x, y, { weight: 700, color: UI_COLORS.body });
      y += 40 * s;
      const words = sub?.text ? capital(sub.text) : capital(live?.mode === 'run' && live.step ? live.step : 'Starting');
      icon(b, iconFor(sub?.text ?? live?.step ?? cmd.say, sub?.kind), x, y - 30 * s, true);
      const count = sub && Number.isFinite(sub.of) ? `${sub.done ?? 0} of ${sub.of}` : '';
      b.font = font(600, BIG);
      const room = IW - 50 * s - (count ? b.measureText(count).width + 24 * s : 0);
      const one = wrapFit(b, words, room, 1);
      if (one) text(one[0], x + 48 * s, y, { size: BIG, weight: 600 });
      else { b.font = font(600, SMALL); text((wrapFit(b, words, room, 1) ?? fitText(b, words, room, 1))[0], x + 48 * s, y, { weight: 600 }); }
      if (count) text(count, IW + x, y, { weight: 600, color: UI_COLORS.body, align: 'right' });
      dyn.barY = y + 14 * s;
      y += 30 * s;
      // the step before within this command, and the reflexes along the way
      const prev = run.done[run.done.length - 1];
      if (prev && y + 40 * s < CH) {
        y += 30 * s;
        icon(b, iconFor(prev.say), x, y - 24 * s);
        b.font = font(600, SMALL);
        const right = prev.kind === 'ok' ? `done ${secs(prev.ms ?? 0)}` : 'failed';
        const rw = b.measureText(right).width;
        text(fitText(b, `Step ${prev.n || run.done.length}: ${prev.say}`, IW - 48 * s - rw - 16 * s, 1)[0], x + 40 * s, y, { weight: 600, color: UI_COLORS.soft });
        text(right, IW + x, y, { weight: 600, color: prev.kind === 'ok' ? UI_COLORS.ok : UI_COLORS.fail, align: 'right' });
        if (prev.kind === 'fail' && prev.why && y + 30 * s < CH) { y += 30 * s; text(fitText(b, capital(prev.why), IW - 40 * s, 1)[0], x + 40 * s, y, { color: UI_COLORS.fail }); }
      }
      const rf = run.reflexes[run.reflexes.length - 1];
      if (rf && y + 34 * s < CH) { y += 32 * s; b.font = font(500, SMALL); text(fitText(b, `Reflex on the way: ${rf}`, IW, 1)[0], x, y, { color: UI_COLORS.muted }); }
    }
    return { c, dyn };
  }

  // ----- the side column: what Muse saw, the advice and whether it took it, the earlier commands
  function drawSide(t) {
    const c = createCanvas(Math.round(SW), Math.round(H - CY));
    const b = c.getContext('2d');
    const text = (str, xx, yy, { size = SMALL, weight = 500, color = UI_COLORS.text, align = 'left' } = {}) => {
      b.font = font(weight, size); b.fillStyle = color; b.textAlign = align; b.fillText(str, xx, yy); b.textAlign = 'left';
    };
    let y = 30 * s;
    const lh = 28 * s;
    const room = () => H - CY - 14 * s - y;
    if (checked) {
      text('Muse checked', 0, y, { weight: 700, color: UI_COLORS.soft });
      y += 30 * s;
      b.font = font(500, SMALL);
      fitList(b, checked.text, SW, 2).forEach((l) => { text(l, 0, y); y += lh; });
      y += 14 * s;
    }
    const adv = [...advice.values()].sort((a, z) => z.sev - a.sev || z.at - a.at)[0];
    if (adv || follow) {
      text('Body advice', 0, y, { weight: 700, color: UI_COLORS.gold });
      y += 30 * s;
      b.font = font(500, SMALL);
      if (adv) fitText(b, capital(adv.text), SW, 2).forEach((l) => { text(l, 0, y); y += lh; });
      if (follow && t - follow.at < 300_000) {
        b.font = font(600, SMALL);
        text(fitText(b, `→ ${follow.ok ? 'Muse followed it' : 'Muse went on without it'}`, SW, 1)[0], 0, y, { weight: 600, color: follow.ok ? UI_COLORS.ok : UI_COLORS.fail });
        y += lh;
      }
      y += 14 * s;
    }
    // the earlier commands (the one in the card is not repeated), newest first, as many as fit
    const run = running();
    const shown = run ?? commands[0];
    const before = commands.filter((c2) => c2 !== shown);
    if (before.length && room() > 60 * s) {
      text('Before', 0, y, { weight: 700, color: UI_COLORS.soft });
      y += 34 * s;
      for (const cmd of before) {
        const need = cmd.state?.kind === 'fail' ? 92 * s : 34 * s;
        if (room() < need - 6 * s) break;
        const words = cmd.state?.kind === 'fail' && cmd.state.step ? cmd.state.step : cmd.say; // a sequence: the step that failed
        icon(b, iconFor(words), 0, y - 24 * s);
        b.font = font(600, SMALL);
        const right = cmd.state?.kind === 'ok' ? (cmd.msSum > 0 ? secs(cmd.msSum) : 'done') : cmd.state?.kind === 'run' ? 'running' : cmd.state?.kind === 'fail' ? 'failed' : '';
        const rw = right ? b.measureText(right).width + 12 * s : 0;
        text(fitText(b, words, SW - 40 * s - rw, 1)[0], 40 * s, y, { weight: 600 });
        if (right) text(right, SW, y, { weight: 600, color: cmd.state?.kind === 'ok' ? UI_COLORS.ok : cmd.state?.kind === 'fail' ? UI_COLORS.fail : UI_COLORS.soft, align: 'right' });
        if (cmd.state?.kind === 'fail') {
          b.font = font(500, SMALL);
          // the reason on its own line, in words ("failed" is on the right)
          for (const l of fitText(b, capital(cmd.state.why || 'see the reply'), SW - 40 * s, room() > 110 * s ? 2 : 1)) { y += 28 * s; text(l, 40 * s, y, { color: UI_COLORS.fail }); }
        }
        y += 36 * s;
      }
    }
    return c;
  }

  // ----- the inputs
  function newCommand(l) {
    const ready = /^> start_game\b/.test(l.t); // start_game's line comes with its reply: the game is there
    commands.unshift({ say: l.say || l.t.replace(/^>\s*/, ''), words: l.words || '', of: Number(l.of) || 1, at: now(), state: ready ? { kind: 'ok', text: 'ready' } : { kind: 'run' }, msSum: 0, done: [], reflexes: [] });
    commands = commands.slice(0, 8);
    sub = null;
    barShown = 0;
    lastEventAt = now();
  }
  function result(l) {
    const say = String(l.say ?? '').toLowerCase();
    const cmd = commands.find((c) => c.state?.kind === 'run' && say && c.say.toLowerCase().includes(say)) ?? commands.find((c) => c.state?.kind === 'run') ?? commands[0];
    if (!cmd) return;
    if (Number.isFinite(l.ms)) cmd.msSum += l.ms;
    const why = shortReason((l.why || String(l.t ?? '').replace(/^FAIL\s*/, '')).split(/[;(]/)[0].replace(/^stopped:\s*/i, ''));
    cmd.done.push({ say: l.say || '', kind: l.k, ms: l.ms, why, n: l.n });
    const multi = Number.isInteger(l.of) && l.of > 1;
    if (l.k === 'ok' && (!multi || l.n >= l.of)) cmd.state = { kind: 'ok', text: cmd.msSum > 0 ? `done in ${secs(cmd.msSum)}` : 'done' };
    else if (l.k === 'fail') cmd.state = { kind: 'fail', why, step: l.say || '' };
    if (cmd.state.kind !== 'run' && cmd === commands[0]) sub = null;
    lastEventAt = now();
  }

  const api = {
    width: W, height: H + T, over: T, fps, file: o.file ?? null,
    /** New lines from the agent ({k, t, say, words, of, ms, n, why, ak}). */
    push(lines) {
      for (const l of lines ?? []) {
        if (!l || typeof l.t !== 'string') continue;
        if (l.k === 'call') { if (!QUIET.test(l.t)) newCommand(l); }
        else if (l.k === 'ok' || l.k === 'fail') {
          if (l.k === 'fail' && /^death\b/i.test(l.t)) { (running() ?? commands[0])?.reflexes.push(`died (${reflexGist(l.t.replace(/^death:\s*(?:died:\s*)?/i, ''))})`); continue; }
          result(l);
        } else if (l.k === 'reflex' || l.k === 'body') {
          const r = reflexGist(l.t);
          const cmd = running() ?? commands[0];
          if (cmd && cmd.reflexes[cmd.reflexes.length - 1] !== r) cmd.reflexes.push(r);
        } else if (l.k === 'milestone') toast = { text: milestoneWords(l.t), at: now() };
        else if (l.k === 'checked') checked = { text: l.t.replace(/^Muse checked:\s*/i, ''), at: now() };
        else if (l.k === 'follow') follow = { text: l.t, ok: Boolean(l.ok) || /^Followed/.test(l.t), at: now() };
        else if (l.k === 'advice') {
          const k = l.ak ?? 'note';
          advice.set(k, { text: adviceGist(l.t), sev: advice.get(k)?.sev ?? 1, at: now() });
        } else if (l.k === 'info' && /^game over/i.test(l.t)) {
          commands.unshift({ say: capital(l.t), words: '', of: 1, at: now(), state: { kind: 'ok', text: 'thanks for watching' }, msSum: 0, done: [], reflexes: [] });
        }
      }
    },
    /** The status numbers (st) for the header. */
    status(text, data) {
      if (!data) return;
      if (Number.isFinite(data.ticks)) {
        const t = now();
        let rate = anchor?.rate ?? 0.02;
        if (anchor && t - anchor.at > 1_500) rate = Math.min(0.03, Math.max(0, ((((data.ticks - anchor.ticks) % 24_000) + 24_000) % 24_000) / (t - anchor.at)));
        anchor = { ticks: data.ticks, at: t, rate };
      }
      let changed = false;
      for (const k of ['hp', 'food', 'clock', 'muse', 'reflex', 'pct']) {
        const v = data[k] ?? null;
        if (v !== null && v !== st[k]) { st[k] = v; changed = true; }
      }
      if (changed || !header) drawHeader();
    },
    /** The Body advice as it stands: one entry per kind, updated in place; a kind gone is dropped. */
    advice(list) {
      if (!Array.isArray(list)) return;
      const seen = new Set();
      for (const a of list) {
        const k = a.k ?? 'note';
        seen.add(k);
        advice.set(k, { text: adviceGist(a.t), sev: a.sev ?? 1, at: advice.get(k)?.at ?? now() });
      }
      for (const k of [...advice.keys()]) if (!seen.has(k)) advice.delete(k);
    },
    /** The body's caption is not needed: its sub-steps say more. */
    caption() {},
    /** An update from the agent: lines, status numbers, the advice, what is happening, the body's sub-step. */
    term(u) {
      if (!u) return;
      if (Array.isArray(u.lines) && u.lines.length) api.push(u.lines);
      if (u.st) api.status(u.status, u.st);
      if (Array.isArray(u.adv)) api.advice(u.adv);
      if (u.live) live = { ...u.live, at: now() };
      if ('sub' in u) {
        const sb = u.sub;
        if (!sb) sub = null;
        else {
          // a walk's bar: how much of the distance it began with is done
          const first = sb.kind === 'walk' && Number.isFinite(sb.left) ? Math.max(sb.left, sub?.kind === 'walk' && Number.isFinite(sub.first) ? sub.first : 0) : null;
          sub = { ...sb, ...(first !== null ? { first } : {}), at: now() };
        }
      }
    },
    /** Another game on camera: an empty card, with a note. */
    reset(note = '') {
      commands = [];
      sub = null; live = null; checked = null; follow = null; toast = null; anchor = null;
      advice.clear();
      for (const k of Object.keys(st)) st[k] = k === 'clock' ? '' : null;
      drawHeader();
      if (note) commands.unshift({ say: capital(note), words: '', of: 1, at: now(), state: { kind: 'ok', text: 'one moment' }, msSum: 0, done: [], reflexes: [] });
    },

    /** One frame at time t (ms). */
    render(t = now()) {
      g.clearRect(0, 0, W, T);
      g.globalAlpha = 1;
      g.drawImage(bg, 0, T);
      if (!header || clockNow() !== shownClock) drawHeader();
      g.drawImage(header, 0, T);
      // the card and the column, again when their words change (the ticking times: once a second)
      const run = running();
      const key = JSON.stringify([commands.slice(0, 1), sub && [sub.text, sub.kind, sub.done, sub.of], run ? Math.floor((t - run.at) / 1000) : statusWords(t), live?.step]);
      if (key !== cardKey || !card) { cardKey = key; card = drawCard(t); }
      g.drawImage(card.c, CX, T + CY);
      const skey = JSON.stringify([checked, follow && [follow.text, t - follow.at < 300_000], [...advice.entries()], commands.map((c) => [c.say, c.state, c.msSum])]);
      if (skey !== sideKey || !side) { sideKey = skey; side = drawSide(t); }
      g.drawImage(side, SX, T + CY);
      // the moving parts: a breathing dot by the status line, the progress bar, running dots while no sub-step came
      if (card.dyn.pulseY !== undefined) {
        const k = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t / 1000) * Math.PI * 2 / 2.4));
        g.globalAlpha = k;
        g.fillStyle = UI_COLORS.soft;
        g.beginPath();
        g.arc(IN + 7 * s, T + CY + card.dyn.pulseY, 6 * s, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      if (card.dyn.barY !== undefined) {
        let target = null;
        if (sub && Number.isFinite(sub.of) && sub.of > 0) target = clamp01((sub.done ?? 0) / sub.of);
        else if (sub?.kind === 'walk' && Number.isFinite(sub.left) && sub.first > 0) target = clamp01(1 - sub.left / sub.first);
        const y = T + CY + card.dyn.barY;
        if (target !== null) {
          barShown += (target - barShown) * 0.15;
          bar(g, IN + 48 * s, y, IW - 48 * s, 10 * s, barShown, UI_COLORS.body);
        } else {
          // no numbers yet: a light that runs along the bar
          bar(g, IN + 48 * s, y, IW - 48 * s, 10 * s, 0, UI_COLORS.body);
          const p = ((t / 1600) % 1);
          g.globalAlpha = 0.8;
          rr(g, IN + 48 * s + p * (IW - 48 * s - 90 * s), y, 90 * s, 10 * s, 5 * s);
          g.fillStyle = UI_COLORS.body;
          g.fill();
          g.globalAlpha = 1;
        }
      }
      // a milestone: a toast over the bottom right of the game, 6 s
      if (toast && T > 0) {
        const age = t - toast.at;
        if (age > 6_000) toast = null;
        else {
          g.globalAlpha = Math.min(ease(age / 300), clamp01((6_000 - age) / 600));
          g.font = font(700, SMALL);
          const tw = g.measureText(toast.text).width;
          const w = tw + 70 * s;
          const x = W - PAD - w;
          const y = T - 58 * s;
          rr(g, x, y, w, 46 * s, 23 * s);
          g.fillStyle = 'rgba(15,19,26,0.86)';
          g.fill();
          icon(g, 'star', x + 12 * s, y + 8 * s);
          g.fillStyle = UI_COLORS.gold;
          g.textBaseline = 'middle';
          g.fillText(toast.text, x + 52 * s, y + 24 * s);
          g.textBaseline = 'alphabetic';
          g.globalAlpha = 1;
        }
      }
      frames += 1;
      return canvas;
    },

    /** The frame as an uncompressed 32-bit BMP (top-down, with alpha), or written over the panel file. */
    bmp(t = now()) {
      api.render(t);
      return Buffer.concat([bmpHeader, canvas.toBuffer('raw')]);
    },
    write(t = now()) {
      if (!api.file) return;
      api.render(t);
      const tmp = `${api.file}.tmp`;
      const fd = fs.openSync(tmp, 'w');
      try { fs.writeSync(fd, bmpHeader); fs.writeSync(fd, canvas.toBuffer('raw')); } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, api.file); // ffmpeg never reads half a frame
    },
    /** Frames at fps until stop(). */
    start() {
      if (timer || !api.file) return;
      api.write();
      timer = setInterval(() => { try { api.write(); } catch { /* the video goes on with the last frame */ } }, 1000 / fps);
      timer.unref?.();
    },
    stop() { clearInterval(timer); timer = null; },
    get frames() { return frames; },
    state: () => ({
      commands: commands.map((c) => ({ say: c.say, words: c.words, of: c.of, state: c.state, done: c.done.length, reflexes: [...c.reflexes] })),
      sub, checked: checked?.text ?? null, follow: follow?.text ?? null, advice: [...advice.entries()].map(([k, a]) => ({ k, text: a.text, sev: a.sev })),
      toast: toast?.text ?? null, st: { ...st }, clock: shownClock, status: running() ? null : statusWords(now()),
    }),
  };

  const bmpHeader = Buffer.alloc(54);
  bmpHeader.write('BM', 0, 'ascii');
  bmpHeader.writeUInt32LE(54 + W * (H + T) * 4, 2);
  bmpHeader.writeUInt32LE(54, 10);
  bmpHeader.writeUInt32LE(40, 14);
  bmpHeader.writeInt32LE(W, 18);
  bmpHeader.writeInt32LE(-(H + T), 22); // top-down rows, as the canvas has them
  bmpHeader.writeUInt16LE(1, 26);
  bmpHeader.writeUInt16LE(32, 28);
  bmpHeader.writeUInt32LE(0, 30);
  bmpHeader.writeUInt32LE(W * (H + T) * 4, 34);
  bmpHeader.writeInt32LE(2835, 38);
  bmpHeader.writeInt32LE(2835, 42);
  drawHeader();
  return api;
}

/** A rounded rectangle path. */
function rr(g, x, y, w, h, r) {
  const k = Math.min(r, h / 2, w / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}
/** A slim meter: its track and its fill. */
function bar(g, x, y, w, h, frac, color) {
  rr(g, x, y, w, h, h / 2);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fill();
  if (frac > 0) {
    rr(g, x, y, Math.max(h, w * frac), h, h / 2);
    g.fillStyle = color;
    g.fill();
  }
}
