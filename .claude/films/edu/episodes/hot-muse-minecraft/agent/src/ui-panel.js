// src/ui-panel.js - the HUD under the game in the live video (STREAM_LAYOUT=ui, the camera's side): an agent trace, the
// owner's pick of two dense layouts (layout 2, 2026-10-12; ui-art/hud-mockups.mjs).
//
// A header strip: health, food and the time of day on the left; Muse's share, the game's id and its age on the right.
// Under it a band, THINKING: Muse's own words with its latest call (its why), big, and the two before them fading;
// before Muse's first move, what is happening and the goal. Then two columns. MUSE · TRACE: the current call (its tool,
// each step in plain words beside the step as Muse wrote it, done with its time, running with the body's sub-step, its
// count and a bar, queued, failed with the reason, skipped), and every earlier call one line each (get_state with what
// Muse saw, failures with their reason on a line of their own) with the body's reflexes among them. STATE: the goal's
// checklist with the time of each milestone and the next one marked, the items that matter (icons and counts), y and
// the place, the Body advice and whether Muse took it. A milestone is a toast over the game. Body text 16-20 px, labels
// 13 px in spaced capitals, JetBrains Mono for raw calls only; nothing cut mid-word.
//
// Drawn with node-canvas at the stream's frame rate (30 a second): the header, the band and the two columns are drawn
// into their own canvases only when what they show changes (the ticking times once a second); a frame copies them and
// draws the moving parts (the running step's bar, a breathing dot, the toast). Each frame is an uncompressed 32-bit BMP
// with alpha (the toast's band over the game is see-through), renamed over the panel file, which ffmpeg reads again for
// every frame (src/stream.js). Every text was cleaned by the agent and again by the service (src/terminal.js).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const UI_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'muse-ui');
const ICONS = ['heart', 'food', 'sun', 'moon', 'flame', 'star', 'pickaxe', 'boot', 'hammer', 'sword', 'house', 'portal', 'bucket', 'compass', 'bed', 'shield',
  'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'diamond', 'iron_ingot', 'raw_iron', 'coal', 'obsidian',
  'flint_and_steel', 'water_bucket', 'lava_bucket', 'steak', 'bread', 'cobblestone', 'log', 'depth', 'ender_pearl'];
export const UI_COLORS = Object.freeze({
  bg: '#0a0d12', rule: 'rgba(255,255,255,0.075)', text: '#eef0f4', soft: '#aeb6c6', muted: '#6b7488', raw: '#8d97ab', rawRun: '#b9c6dc',
  muse: '#a99bff', quote: '#ebe7ff', body: '#7cc4ff', ok: '#5fd09c', fail: '#ff8a7a', gold: '#ffd164', look: '#6fd3c8',
});
const FAMILY = 'MuseUI';
const MONO = 'MuseMono';
const PLAY = /^(?:play|play_sequence)$/;
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
/** Wrapped to fit: the text, else whole words up to the room with "..." (never cut mid-word). */
function fitText(g, text, maxW, lines) {
  const t = String(text ?? '');
  const w0 = wrapFit(g, t, maxW, lines);
  if (w0) return w0;
  const words = t.split(/\s+/);
  while (words.length > 1) { words.pop(); const w = wrapFit(g, `${words.join(' ').replace(/[,;:.-]+$/, '')}...`, maxW, lines); if (w) return w; }
  return [t];
}
/** A comma list on one line, dropping whole items from its end and saying how many ("+2 more"). */
function fitItems(g, items, maxW) {
  const list = items.filter(Boolean);
  for (let k = list.length; k >= 1; k--) {
    const t = list.slice(0, k).join(', ') + (k < list.length ? `, +${list.length - k} more` : '');
    if (g.measureText(t).width <= maxW) return t;
  }
  return fitText(g, list[0] ?? '', maxW, 1)[0];
}
/** A failure's reason, its first clause when that still says something: "no lava pool within 16 blocks". */
export function shortReason(t) {
  const x = String(t ?? '').trim();
  const head = x.split(/,\s|\s+to make\b|\s+because\b|\s+so that\b/)[0].replace(/\.\.\.$/, '').trim();
  return head.split(/\s+/).length >= 3 ? head : x;
}
const capital = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const mmss = (sec) => {
  const t = Math.max(0, Math.floor(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : `${m}:${String(t % 60).padStart(2, '0')}`;
};
const secs = (ms) => (ms >= 60_000 ? mmss(ms / 1000) : ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${Math.max(0.1, Math.round(ms / 100) / 10)} s`);
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

/** The way to the Nether and back, the checklist while no goal came from the server (src/report.js has the same keys). */
export const DEFAULT_GOAL = Object.freeze({
  key: 'nether_and_back', title: 'Nether and back',
  list: ['wooden_pickaxe', 'stone_pickaxe', 'iron_ingot', 'iron_pickaxe', 'diamond', 'diamond_pickaxe', 'water_bucket', 'obsidian', 'flint_and_steel', 'portal', 'nether', 'back'],
});
/** A milestone in the checklist's words, and its icon. */
const GOAL_WORDS = {
  wooden_pickaxe: 'Wooden pickaxe', stone_pickaxe: 'Stone pickaxe', iron_ingot: 'Iron', iron_pickaxe: 'Iron pickaxe', diamond: 'Diamonds',
  diamond_pickaxe: 'Diamond pickaxe', water_bucket: 'Water bucket', obsidian: 'Obsidian', flint_and_steel: 'Flint and steel', portal: 'Portal frame',
  nether: 'Into the Nether', back: 'Back to Overworld',
};
const GOAL_ICONS = { iron_ingot: 'iron_ingot', portal: 'portal', nether: 'flame', back: 'house' };
/** A counted goal's part by its key (src/goals.js): kill_pig, get_diamond, make_torch, build_hut_3x3, survive_night, reach_y. */
const ITEM_ICONS = new Set(['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe', 'diamond', 'iron_ingot', 'raw_iron', 'coal', 'obsidian', 'flint_and_steel', 'water_bucket', 'lava_bucket', 'cobblestone', 'bread', 'ender_pearl', 'shield', 'bucket']);
function partIcon(k) {
  const key = String(k ?? '');
  const item = key.replace(/^(?:get|make)_/, '');
  if (/^(?:get|make)_/.test(key) && ITEM_ICONS.has(item)) return item;
  if (/_log$/.test(item)) return 'log';
  if (/^kill_/.test(key)) return 'sword';
  if (/^get_/.test(key)) return 'pickaxe';
  if (/^make_/.test(key)) return 'hammer';
  if (/^build_/.test(key)) return 'house';
  if (/^survive_/.test(key)) return 'moon';
  if (/nether|^reach_the_end/.test(key)) return 'portal';
  if (key === 'reach_y') return 'depth';
  if (/^reach_/.test(key)) return 'compass';
  return 'star';
}
/** How long a new goal (set_goal) is lit in the HUD. */
const NEW_GOAL_MS = 10_000;

/** The milestone a stream milestone line names (src/terminal.js MILESTONES and its places). */
const LINE_GOALS = [
  [/wooden pickaxe/, 'wooden_pickaxe'], [/stone pickaxe/, 'stone_pickaxe'], [/the first iron\b/, 'iron_ingot'], [/iron pickaxe/, 'iron_pickaxe'],
  [/the first diamond\b/, 'diamond'], [/diamond pickaxe/, 'diamond_pickaxe'], [/flint and steel/, 'flint_and_steel'], [/entered the Nether/, 'nether'],
  [/back in the Overworld/, 'back'],
];

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
    for (const [file, family, weight] of [['Inter-Medium.ttf', FAMILY, '500'], ['Inter-SemiBold.ttf', FAMILY, '600'], ['Inter-Bold.ttf', FAMILY, '700'],
      ['JetBrainsMono-Regular.ttf', MONO, '400'], ['JetBrainsMono-Medium.ttf', MONO, '500']]) {
      try { registerFont(path.join(assets, 'fonts', file), { family, weight }); } catch { /* the default face then */ }
    }
  }
  const font = (weight, px) => `${weight} ${Math.round(px * s * 10) / 10}px ${FAMILY}`;
  const mono = (px, weight = 400) => `${weight} ${Math.round(px * s * 10) / 10}px ${MONO}`;
  const load = (p) => { const im = new Image(); im.src = fs.readFileSync(p); return im; };
  const sized = (im, w) => { const c = createCanvas(Math.round(w), Math.round(w)); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); return c; };
  const icons = { 20: {}, 26: {} };
  for (const n of ICONS) {
    try { const im = load(path.join(assets, 'icons', `${n}.png`)); icons[20][n] = sized(im, 20 * s); icons[26][n] = sized(im, 26 * s); } catch { /* drawn without */ }
  }
  const icon = (g, n, x, y, size = 20, alpha = 1) => {
    const c = icons[size][n] ?? icons[size].compass;
    if (!c) return;
    g.globalAlpha = alpha;
    g.drawImage(c, x, y);
    g.globalAlpha = 1;
  };

  // ----- geometry, in the panel (the canvas has the toast's band T above it); px at 1080 wide, times s
  const PX = 20 * s; // the side margins
  const HDR = 38 * s; // the header strip
  const BAND = 128 * s; // the thinking band under it
  const LOW = HDR + BAND; // the two columns start here
  const TX = PX; // the trace column
  const TW = 560 * s;
  const VR = TX + TW + 16 * s; // the rule between the columns
  const SX = VR + 17 * s; // the state column
  const SW = W - PX - SX;

  const canvas = createCanvas(W, H + T);
  const g = canvas.getContext('2d');
  const bg = createCanvas(W, H);
  {
    const b = bg.getContext('2d');
    b.fillStyle = UI_COLORS.bg;
    b.fillRect(0, 0, W, H);
    b.fillStyle = UI_COLORS.rule;
    const px1 = Math.max(1, Math.round(s));
    b.fillRect(PX, HDR, W - 2 * PX, px1);
    b.fillRect(PX, LOW, W - 2 * PX, px1);
    b.fillRect(VR, LOW + 10 * s, px1, H - LOW - 20 * s);
  }

  // ----- drawing helpers
  const put = (b, str, x, y, { size = 17, weight = 500, color = UI_COLORS.text, align = 'left', face = null } = {}) => {
    b.font = face ?? font(weight, size); b.fillStyle = color; b.textAlign = align; b.fillText(str, x, y); b.textAlign = 'left';
    return b.measureText(str).width;
  };
  /** A label: 13 px bold capitals spaced 0.1 em, after a small square of its colour. Returns its width. */
  const label = (b, str, x, y, { color = UI_COLORS.muted, sq = null, align = 'left' } = {}) => {
    const t = String(str).toUpperCase();
    b.font = font(700, 13);
    const ls = 1.3 * s;
    const width = [...t].reduce((a, ch) => a + b.measureText(ch).width + ls, 0) - ls + (sq ? 16 * s : 0);
    let cx = align === 'right' ? x - width : x;
    if (sq) { b.fillStyle = sq; rr(b, cx, y - 9 * s, 8 * s, 8 * s, 2 * s); b.fill(); cx += 16 * s; }
    b.fillStyle = color;
    for (const ch of t) { b.fillText(ch, cx, y); cx += b.measureText(ch).width + ls; }
    return width;
  };
  const labelWidth = (b, str) => { b.font = font(700, 13); return [...String(str).toUpperCase()].reduce((a, ch) => a + b.measureText(ch).width + 1.3 * s, 0) - 1.3 * s; };
  /** What is happening, as short as the room needs: the same words with fewer of them (the ticking time stays). */
  const SHORTER = [
    [/^Sheltering until morning \((Muse\u2019s choice|the body\u2019s reflex)\), night ends in (.*)$/, (m) => `Sheltering (${m[1].startsWith('Muse') ? 'Muse' : 'reflex'}), night ends in ${m[2]}`],
    [/^Sheltering \((?:Muse|reflex)\), night ends in (.*)$/, (m) => `Sheltering, dawn in ${m[1].replace(/^~/, '')}`],
    [/^Sleeping until morning, night ends in (.*)$/, (m) => `Sleeping, dawn in ${m[1].replace(/^~/, '')}`],
    [/^In the Nether, waiting for Muse\u2019s next move/, () => 'Nether, waiting for Muse'],
    [/^Waiting for Muse\u2019s next move/, () => 'Waiting for Muse'],
    [/^Muse is checking the situation/, () => 'Muse is checking'],
  ];
  const fitStatus = (b, words, room) => {
    let w = words;
    for (const [re, to] of SHORTER) {
      if (labelWidth(b, w) <= room) break;
      const m = re.exec(w);
      if (m) w = w.replace(re, to(m));
    }
    return w;
  };
  const mark = (b, kind, x, y, color) => {
    // a step's mark, 15 px, centred on (x, y): done, running, queued, failed, skipped
    const r = 7.2 * s;
    b.lineWidth = 1.4 * s;
    b.strokeStyle = color;
    b.fillStyle = color;
    b.lineCap = 'round';
    b.lineJoin = 'round';
    if (kind === 'run') {
      b.globalAlpha = 0.18; b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill(); b.globalAlpha = 1;
      b.beginPath(); b.moveTo(x - 2 * s, y - 3.4 * s); b.lineTo(x + 3 * s, y); b.lineTo(x - 2 * s, y + 3.4 * s); b.closePath(); b.fill();
      return;
    }
    if (kind === 'queued' || kind === 'skip') {
      b.setLineDash([2.2 * s, 2.2 * s]); b.beginPath(); b.arc(x, y, 6.6 * s, 0, Math.PI * 2); b.stroke(); b.setLineDash([]);
      if (kind === 'skip') { b.beginPath(); b.moveTo(x - 3.5 * s, y); b.lineTo(x + 3.5 * s, y); b.stroke(); }
      return;
    }
    b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.stroke();
    b.lineWidth = 1.8 * s;
    b.beginPath();
    if (kind === 'ok') { b.moveTo(x - 3.4 * s, y + 0.3 * s); b.lineTo(x - 1.2 * s, y + 2.5 * s); b.lineTo(x + 3.4 * s, y - 2.3 * s); }
    else { b.moveTo(x - 2.5 * s, y - 2.5 * s); b.lineTo(x + 2.5 * s, y + 2.5 * s); b.moveTo(x + 2.5 * s, y - 2.5 * s); b.lineTo(x - 2.5 * s, y + 2.5 * s); }
    b.stroke();
  };

  // ----- what is shown
  const st = { hp: null, food: null, clock: '', muse: null, reflex: null, pct: null };
  let calls = []; // newest first: {tool, say, words, raw, steps: [{say, raw, state, ms, why, sub}], at, gs, no, state: {kind, text, why}, msSum, checked, reflexes}
  let events = []; // the body's own: {kind: reflex|body|death, text, at}
  let thoughts = []; // Muse's words, newest first: {text, gs, call}
  let sub = null; // the body's live sub-step: {kind, text, done, of, left, first, at}
  let live = null; // what the agent says is happening: {mode, reason, step, sinceS, dawnS, at}
  let follow = null; // {text, ok, at}
  const advice = new Map(); // kind -> {text, sev, at}
  let toast = null; // {text, at}
  let anchor = null; // the game clock: {ticks, at, rate}
  let game = null; // {id, s, at}
  let goal = null; // the server's: {key, title, text, reached, list: [{k, t, atS, done?, of?}]}
  let newGoalAt = null; // when the goal last changed to another (set_goal)
  const reachedLocal = new Map(); // milestone key -> game seconds, from milestone lines (while no goal came)
  let inv = null;
  let pos = null;
  let over = null; // "Game over after 42:10"
  let lastEventAt = now();
  let frames = 0;
  let timer = null;
  const layers = { header: null, band: null, trace: null, state: null };
  const keys = { header: '', band: '', trace: '', state: '' };
  let barShown = 0;

  const gameS = (t = now()) => (game && Number.isFinite(game.s) ? game.s + (t - game.at) / 1000 : null);
  const clockNow = () => {
    if (!st.clock || st.clock === 'NETHER' || st.clock === 'END' || !anchor) return st.clock;
    const tk = (((anchor.ticks + anchor.rate * (now() - anchor.at)) % 24_000) + 24_000) % 24_000;
    const h = Math.floor(tk / 1000 + 6) % 24;
    const m = Math.floor(((tk % 1000) * 60) / 1000);
    return `${tk >= 13_000 && tk < 23_000 ? 'NIGHT' : 'DAY'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const ticksNow = () => (anchor ? (((anchor.ticks + anchor.rate * (now() - anchor.at)) % 24_000) + 24_000) % 24_000 : null);
  const current = () => calls.find((c) => PLAY.test(c.tool)) ?? null; // the call the trace shows on top
  const running = () => { const c = current(); return c?.state?.kind === 'run' ? c : null; };

  // ----- the header: health, food, time | Muse's share, the game and its age
  function drawHeader(t) {
    const c = createCanvas(W, Math.round(HDR));
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    const y = HDR / 2;
    let x = PX;
    const item = (n, v, rest, warn = false) => {
      icon(b, n, x, y - 10 * s);
      x += 27 * s;
      x += put(b, v, x, y + 1 * s, { weight: 600, color: warn ? UI_COLORS.fail : UI_COLORS.text });
      if (rest) x += 4 * s + put(b, rest, x + 4 * s, y + 1 * s, { color: UI_COLORS.muted });
      x += 22 * s;
    };
    item('heart', Number.isFinite(st.hp) ? String(st.hp) : '--', '/20', Number.isFinite(st.hp) && st.hp <= 6);
    item('food', Number.isFinite(st.food) ? String(st.food) : '--', '/20', Number.isFinite(st.food) && st.food <= 6);
    const clock = clockNow();
    if (st.clock === 'NETHER') item('flame', 'Nether', '');
    else if (st.clock === 'END') item('star', 'The End', '');
    else if (clock) {
      const tk = ticksNow();
      const night = clock.startsWith('NIGHT');
      let rest = night ? 'night' : 'day';
      if (tk !== null && night) rest = `night, dawn in ${Math.max(1, Math.round((23_000 - tk) / 1200))} min`;
      else if (tk !== null && tk >= 11_000 && tk < 13_000) rest = `day, dusk in ${Math.max(1, Math.round((13_000 - tk) / 1200))} min`;
      item(night ? 'moon' : 'sun', clock.replace(/^(?:DAY|NIGHT) /, ''), rest);
    }
    // the right: the game and its age, then Muse's share before it
    let rx = W - PX;
    const el = gameS(t);
    if (el !== null) rx -= put(b, mmss(el), rx, y + 1 * s, { face: mono(14, 500), align: 'right' }) + 8 * s;
    if (game?.id) rx -= put(b, game.id, rx, y + 1 * s, { face: mono(14), color: UI_COLORS.soft, align: 'right' }) + 8 * s;
    if (game) rx -= label(b, 'Game', rx, y + 1 * s, { align: 'right' }) + 24 * s;
    const pct = Number.isFinite(st.pct) ? st.pct : Number.isFinite(st.muse) && Number.isFinite(st.reflex) && st.muse + st.reflex > 0 ? Math.round((100 * st.muse) / (st.muse + st.reflex)) : null;
    if (pct !== null) {
      bar(b, rx - 70 * s, y - 2 * s, 70 * s, 6 * s, pct / 100, UI_COLORS.muse);
      rx -= 70 * s + 9 * s;
      rx -= put(b, `${pct}%`, rx, y + 1 * s, { weight: 600, align: 'right' }) + 9 * s;
      label(b, 'Muse', rx, y + 1 * s, { color: UI_COLORS.muse, align: 'right' });
    }
    return c;
  }

  // what is happening while no command runs, in words ("Waiting for Muse's next move 0:45")
  function statusWords(t) {
    if (over) return over;
    const reason = live?.mode === 'idle' ? live.reason : 'waiting';
    const since = live && Number.isFinite(live.sinceS) ? live.sinceS + (t - live.at) / 1000 : Math.max(0, (t - lastEventAt) / 1000);
    if (['shelter', 'shelter_body', 'sleep'].includes(reason) && Number.isFinite(live?.dawnS)) {
      const left = live.dawnS - (anchor?.rate === 0 ? 0 : (t - live.at) / 1000);
      const dawn = left > 60 ? `night ends in ~${Math.ceil(left / 60)} min` : left > 0 ? 'night ends in under a minute' : 'morning is here';
      if (reason === 'sleep') return `Sleeping until morning, ${dawn}`;
      return `Sheltering until morning (${reason === 'shelter' ? 'Muse’s choice' : 'the body’s reflex'}), ${dawn}`;
    }
    if (!calls.some((c) => PLAY.test(c.tool))) return `Waiting for Muse’s first move · ${mmss(since)}`;
    if (reason === 'checking') return `Muse is checking the situation · ${mmss(since)}`;
    if (reason === 'nether') return `In the Nether, waiting for Muse’s next move · ${mmss(since)}`;
    return `Waiting for Muse’s next move · ${mmss(since)}`;
  }
  /** The goal in a line: "Goal: Nether and back · 0 of 12 milestones · next: wooden pickaxe", "Goal: kill 100 pigs · pigs killed 37 of 100". */
  const goalWords = (gl) => {
    if (!gl.list.length) return `Goal: ${gl.text || gl.title}`;
    if (gl.list.some((m) => Number.isFinite(m.of))) return `Goal: ${gl.title} · ${gl.list.map((m) => `${m.t} ${m.done ?? 0} of ${m.of ?? 1}`).join(', ')}`;
    const reached = gl.list.filter((m) => m.atS != null).length;
    const next = gl.list.find((m) => m.atS == null);
    return `Goal: ${gl.title}${gl.text ? ` (${gl.text})` : ''} · ${reached} of ${gl.list.length} milestones${next ? ` · next: ${(GOAL_WORDS[next.k] ?? capital(next.t)).toLowerCase()}` : ''}`;
  };
  const goalNow = () => {
    if (goal) return goal; // the server's (a goal of plain words has no list)
    // no goal from the server (yet): the way to the Nether and back, with what the stream saw reached
    return { ...DEFAULT_GOAL, list: DEFAULT_GOAL.list.map((k) => ({ k, t: GOAL_WORDS[k], atS: reachedLocal.get(k) ?? null })) };
  };

  // ----- the band: Muse's words (the latest big, two before it fading); before any, what is happening and the goal
  function drawBand(t) {
    const c = createCanvas(W, Math.round(BAND));
    const b = c.getContext('2d');
    const top = 11 * s;
    label(b, 'Thinking', PX, top + 13 * s, { sq: UI_COLORS.muse });
    const QX = PX + 132 * s;
    const QW = W - PX - QX - 15 * s;
    const dyn = {};
    if (!thoughts.length) {
      // no words from Muse yet: what is happening, and the goal
      b.font = font(600, 20);
      const l = fitText(b, statusWords(t), QW - 20 * s, 1);
      put(b, l[0], QX + 20 * s, top + 22 * s, { size: 20, weight: 600, color: UI_COLORS.soft });
      dyn.pulse = { x: QX + 6 * s, y: top + 15 * s };
      b.font = font(500, 17);
      const words = goalWords(goalNow());
      put(b, fitText(b, words, QW, 1)[0], QX, top + 56 * s, { color: UI_COLORS.muted });
      b.font = font(500, 16);
      put(b, fitText(b, 'Muse’s own words with each command appear here', QW, 1)[0], QX, top + 84 * s, { size: 16, color: UI_COLORS.muted });
      return { c, dyn };
    }
    const [lead, ...rest] = thoughts;
    put(b, [Number.isFinite(lead.gs) ? mmss(lead.gs) : '', lead.call ? `call ${lead.call}` : ''].filter(Boolean).join(' · '), PX, top + 37 * s, { face: mono(13), color: UI_COLORS.muted });
    b.font = font(600, 20);
    const q = fitText(b, lead.text, QW, 2);
    b.fillStyle = UI_COLORS.muse;
    b.fillRect(QX, top - 1 * s, 3 * s, q.length * 27 * s + 2 * s);
    q.forEach((l, i) => put(b, l, QX + 15 * s, top + 19 * s + i * 27 * s, { size: 20, weight: 600, color: UI_COLORS.quote }));
    let y = top + q.length * 27 * s + 20 * s;
    rest.slice(0, 2).forEach((th, i) => {
      if (y > BAND - 6 * s) return;
      b.globalAlpha = [0.6, 0.38][i];
      const at = Number.isFinite(th.gs) ? mmss(th.gs) : '';
      const aw = at ? put(b, at, QX + 15 * s, y, { face: mono(12.5), color: UI_COLORS.muted }) + 7 * s : 0;
      b.font = font(500, 16);
      put(b, fitText(b, th.text, QW - 15 * s - aw, 1)[0], QX + 15 * s + aw, y, { size: 16, color: UI_COLORS.soft });
      b.globalAlpha = 1;
      y += 26 * s;
    });
    return { c, dyn };
  }

  // ----- the trace: the current call and its steps, then every earlier call
  function stepStates(cmd) {
    // each step's state as shown: the first not finished in a running call runs
    let runAt = -1;
    if (cmd.state?.kind === 'run') runAt = cmd.steps.findIndex((x) => x.state === 'queued' || x.state === 'run');
    return cmd.steps.map((x, i) => (i === runAt ? 'run' : x.state === 'run' ? 'queued' : x.state));
  }
  function drawTrace(t) {
    const c = createCanvas(Math.round(TW), Math.round(H - LOW));
    const b = c.getContext('2d');
    const dyn = {};
    const bottom = H - LOW - 8 * s;
    let y = 23 * s;
    const cmd = current();
    const run = cmd?.state?.kind === 'run';
    const lw = label(b, 'Muse · Trace', 0, y, { sq: UI_COLORS.muse });
    // the right of the label: the call, its time and how long it has run; while nothing runs, what is happening
    if (cmd && run) label(b, [cmd.no ? `call ${cmd.no}` : '', Number.isFinite(cmd.gs) ? mmss(cmd.gs) : '', `running ${mmss((t - cmd.at) / 1000)}`].filter(Boolean).join(' · '), TW, y, { align: 'right' });
    else {
      // nothing runs: what is happening, after a breathing dot, as short as the room needs
      const w = fitStatus(b, statusWords(t), TW - lw - 44 * s);
      const ww = label(b, w, TW, y, { align: 'right', color: UI_COLORS.soft });
      dyn.pulse = { x: TW - ww - 13 * s, y: y - 4.5 * s };
    }
    y += 25 * s;
    if (!cmd) {
      put(b, 'No command yet', 0, y + 4 * s, { size: 17, color: UI_COLORS.muted });
      y += 26 * s;
    } else {
      // the tool, and how many steps; while it is over, its result
      let x = put(b, cmd.tool, 0, y, { face: mono(14, 500), color: UI_COLORS.muse });
      const n = cmd.steps.length;
      const tail = cmd.state?.kind === 'ok' ? ` · ${n} step${n === 1 ? '' : 's'} · done in ${secs(cmd.msSum)}` : cmd.state?.kind === 'fail' ? ` · ${n} step${n === 1 ? '' : 's'} · failed` : ` · ${n} step${n === 1 ? '' : 's'}`;
      x += put(b, tail, x, y, { face: mono(14), color: cmd.state?.kind === 'fail' ? UI_COLORS.fail : cmd.state?.kind === 'ok' ? UI_COLORS.ok : UI_COLORS.muted });
      y += 10 * s;
      // the steps: as many as there is room for, the done ones before the first unfinished folded into one line if
      // they do not all fit (never dropped: "Steps 1-4 done, 1:02")
      const states = stepStates(cmd);
      const ROW = 27 * s;
      const roomRows = Math.max(3, Math.floor((bottom - y - 22 * s - 3 * 23 * s - 34 * s) / ROW));
      let from = 0;
      const firstOpen = states.findIndex((k) => k !== 'ok');
      if (cmd.steps.length > roomRows && firstOpen > 1) from = Math.min(firstOpen - 1, cmd.steps.length - roomRows + 1);
      const rows = [];
      if (from > 0) rows.push({ fold: from });
      for (let i = from; i < cmd.steps.length && rows.length < roomRows; i++) rows.push({ i });
      const RAWX = TW - 290 * s; // the raw step's column
      const TX2 = TW - 8 * s; // the status column's right edge
      for (const r of rows) {
        if (r.fold) {
          const ms = cmd.steps.slice(0, r.fold).reduce((a, x) => a + (x.ms ?? 0), 0);
          mark(b, 'ok', 35 * s, y + ROW / 2, UI_COLORS.ok);
          put(b, `Steps 1-${r.fold} done`, 52 * s, y + 19 * s, { size: 17, color: UI_COLORS.soft });
          put(b, secs(ms), TX2, y + 19 * s, { face: mono(13.5), color: UI_COLORS.ok, align: 'right' });
          y += ROW;
          continue;
        }
        const step = cmd.steps[r.i];
        const k = states[r.i];
        const isRun = k === 'run';
        const h = isRun ? ROW + 24 * s : ROW;
        if (isRun) {
          b.fillStyle = 'rgba(124,196,255,0.09)';
          rr(b, 0, y, TW, h, 5 * s); b.fill();
          b.fillStyle = UI_COLORS.body; b.fillRect(0, y + 2 * s, 2 * s, h - 4 * s);
        }
        put(b, String(r.i + 1), 7 * s, y + 18 * s, { face: mono(13), color: UI_COLORS.muted });
        const color = { ok: UI_COLORS.ok, run: UI_COLORS.body, fail: UI_COLORS.fail }[k] ?? UI_COLORS.muted;
        mark(b, k, 35 * s, y + 13.5 * s, color);
        const right = k === 'ok' ? (step.ms > 0 ? secs(step.ms) : 'done') : k === 'fail' ? 'failed' : k === 'skip' ? 'skipped' : k === 'run' ? (sub && Number.isFinite(sub.of) ? `${sub.done ?? 0} of ${sub.of}` : '') : 'queued';
        b.font = mono(13.5);
        const rw = right ? b.measureText(right).width + 12 * s : 0;
        b.font = font(isRun ? 600 : 500, 17);
        const words = fitText(b, step.say, RAWX - 52 * s - 10 * s, 1)[0];
        put(b, words, 52 * s, y + 19 * s, { size: 17, weight: isRun ? 600 : 500, color: k === 'ok' ? UI_COLORS.soft : k === 'queued' || k === 'skip' ? UI_COLORS.muted : UI_COLORS.text });
        b.font = mono(13);
        put(b, fitText(b, step.raw, TX2 - rw - RAWX - 6 * s, 1)[0], RAWX, y + 18 * s, { face: mono(13), color: isRun ? UI_COLORS.rawRun : UI_COLORS.raw });
        if (right) put(b, right, TX2, y + 18 * s, { face: mono(13.5), color: k === 'queued' || k === 'skip' ? UI_COLORS.muted : color, align: 'right' });
        if (isRun) {
          // the body carrying it out: its sub-step, a bar, how long the step has run
          const text = sub?.text ? sub.text : live?.mode === 'run' && live.step ? live.step : 'starting';
          b.font = font(500, 15);
          const tw = Math.min(b.measureText(text).width, 230 * s);
          put(b, fitText(b, text, 230 * s, 1)[0], 52 * s, y + 43 * s, { size: 15, color: UI_COLORS.body });
          const el = mmss((t - (step.startAt ?? cmd.at)) / 1000);
          b.font = mono(13);
          const ew = b.measureText(el).width;
          put(b, el, TX2, y + 43 * s, { face: mono(13), color: UI_COLORS.body, align: 'right' });
          dyn.bar = { x: 52 * s + tw + 12 * s, y: y + 37 * s, w: TX2 - ew - 12 * s - (52 * s + tw + 12 * s) };
        }
        if (k === 'fail' && step.why && y + h + 21 * s < bottom - 60 * s) {
          b.font = font(500, 15);
          put(b, fitText(b, capital(step.why), TW - 60 * s, 1)[0], 52 * s, y + h + 14 * s, { size: 15, color: UI_COLORS.fail });
          y += 21 * s;
        }
        y += h;
      }
    }
    // the earlier calls and the body's own actions, newest first, one line each (a failure's reason on the next)
    const shown = cmd;
    const earlier = [...calls.filter((x) => x !== shown).map((x) => ({ at: x.at, call: x })), ...events.map((e) => ({ at: e.at, ev: e }))]
      .filter((x) => !shown || x.at <= Infinity).sort((a, z) => z.at - a.at);
    if (earlier.length && y + 50 * s <= bottom) {
      y += 13 * s;
      label(b, 'Earlier', 0, y + 10 * s, { sq: UI_COLORS.muted });
      label(b, `${calls.filter((x) => x !== shown).length} call${calls.length - (shown ? 1 : 0) === 1 ? '' : 's'} before this`, TW, y + 10 * s, { align: 'right' });
      y += 19 * s;
      for (const e of earlier) {
        const fail = e.call?.state?.kind === 'fail' || e.ev?.kind === 'death';
        if (y + (fail ? 44 : 23) * s > bottom + 4 * s) break;
        y += 18 * s;
        const at = Number.isFinite(e.call?.gs ?? e.ev?.gs) ? mmss(e.call?.gs ?? e.ev?.gs) : '';
        put(b, at, 0, y, { face: mono(13), color: UI_COLORS.muted });
        const tool = e.call ? e.call.tool : e.ev.kind;
        const tc = e.call ? (PLAY.test(tool) ? UI_COLORS.muse : tool === 'get_state' ? UI_COLORS.look : UI_COLORS.muted) : e.ev.kind === 'death' ? UI_COLORS.fail : UI_COLORS.body;
        put(b, tool, 46 * s, y, { face: mono(13), color: tc });
        let words;
        let right = '';
        let rc = UI_COLORS.ok;
        b.font = font(500, 16);
        if (e.ev) words = capital(e.ev.text);
        else if (e.call.tool === 'get_state') words = e.call.checked ?? 'Looked around';
        else if (e.call.tool === 'start_game') { words = e.call.goal ? `New game: ${e.call.goal}` : 'New game'; right = 'ready'; }
        else if (e.call.tool === 'live_view') words = 'Live view on';
        else if (PLAY.test(e.call.tool)) {
          const k = e.call.state?.kind;
          if (k === 'fail') {
            const f = e.call.steps.find((x) => x.state === 'fail');
            words = f?.say ?? e.call.say;
            right = 'failed'; rc = UI_COLORS.fail;
          } else {
            words = null;
            right = k === 'ok' ? `done ${secs(e.call.msSum)}` : k === 'run' ? 'running' : '';
            rc = k === 'ok' ? UI_COLORS.ok : UI_COLORS.soft;
          }
        } else words = capital(e.call.say);
        b.font = font(600, 14);
        const rw = right ? b.measureText(right).width + 10 * s : 0;
        const wx = 158 * s;
        b.font = font(500, 16);
        const text = words === null ? fitItems(b, e.call.steps.map((x, i) => (i ? x.say[0].toLowerCase() + x.say.slice(1) : x.say)), TW - wx - rw) : fitText(b, words, TW - wx - rw, 1)[0];
        put(b, text, wx, y, { size: 16, color: UI_COLORS.soft });
        if (right) put(b, right, TW, y, { size: 14, weight: 600, color: rc, align: 'right' });
        if (fail) {
          const why = e.call ? (e.call.steps.find((x) => x.state === 'fail')?.why ?? e.call.state?.why) : '';
          if (why) { y += 21 * s; b.font = font(500, 15); put(b, fitText(b, capital(why), TW - wx, 1)[0], wx, y, { size: 15, color: UI_COLORS.fail }); }
        }
        y += 5 * s;
      }
    }
    return { c, dyn };
  }

  // ----- the state: the goal's checklist, the items, where the bot is, the advice
  function drawState() {
    const c = createCanvas(Math.round(SW), Math.round(H - LOW));
    const b = c.getContext('2d');
    let y = 23 * s;
    const gl = goalNow();
    const list = gl.list;
    const top = y;
    const GOAL_H = 4 * 23 * s; // the goal's room, the same for every kind of goal (the items under it never move)
    const fresh = newGoalAt !== null && now() - newGoalAt < NEW_GOAL_MS;
    if (fresh) {
      // a new goal (set_goal): the block lit for a few seconds
      b.fillStyle = 'rgba(255,209,100,0.10)';
      rr(b, -8 * s, top - 18 * s, SW + 16 * s, GOAL_H + 34 * s, 7 * s); b.fill();
    }
    const counted = list.some((m) => Number.isFinite(m.of));
    const doneN = list.filter((m) => m.atS != null || (counted && Number.isFinite(m.of) && (m.done ?? 0) >= m.of)).length;
    const right = gl.reached ? 'reached' : list.length ? `${doneN}/${list.length}` : '';
    const rw = right ? labelWidth(b, right) + 16 * s : 0;
    // the label: "Goal" (or "New goal") and its title, whole words to the room
    const head = fresh ? 'New goal' : 'Goal';
    let title = list.length || !gl.text ? capital(gl.title || '') : ''; // a goal of plain words: its words are under the label
    const words = title.split(' ');
    while (words.length > 1 && labelWidth(b, `${head} · ${title}`) + 16 * s > SW - rw) { words.pop(); title = `${words.join(' ')}...`; }
    label(b, title ? `${head} · ${title}` : head, 0, y, { sq: UI_COLORS.gold, color: fresh ? UI_COLORS.gold : UI_COLORS.muted });
    if (right) label(b, right, SW, y, { align: 'right', color: gl.reached ? UI_COLORS.ok : UI_COLORS.muted });
    y += 10 * s;
    if (!list.length) {
      // a goal of plain words: the words, nothing counted
      b.font = font(500, 17);
      fitText(b, capital(gl.text || gl.title), SW, 3).forEach((l, i) => put(b, l, 0, y + 20 * s + i * 24 * s, { size: 17, color: UI_COLORS.text }));
      b.font = font(500, 15);
      put(b, fitText(b, 'A goal in words: nothing to count', SW, 1)[0], 0, y + GOAL_H - 2 * s, { size: 15, color: UI_COLORS.muted });
    } else if (counted) {
      // a counted goal: each part with its count and a bar ("Pigs killed 37/100"), at most 3, the unfinished first
      const parts = list.length > 3 ? [...list.filter((m) => !((m.done ?? 0) >= (m.of ?? 1))), ...list.filter((m) => (m.done ?? 0) >= (m.of ?? 1))].slice(0, 3) : list;
      parts.forEach((m, i) => {
        const cy = y + i * 30 * s;
        const full = (m.done ?? 0) >= (m.of ?? 1);
        icon(b, partIcon(m.k), 6 * s, cy + 2 * s);
        const cnt = full && m.atS != null ? `${m.of}/${m.of} \u00b7 ${mmss(m.atS)}` : `${m.done ?? 0}/${m.of ?? 1}`;
        b.font = mono(14, 500);
        const cw = b.measureText(cnt).width;
        put(b, cnt, SW - 4 * s, cy + 17 * s, { face: mono(14, 500), color: full ? UI_COLORS.ok : UI_COLORS.gold, align: 'right' });
        b.font = font(600, 16);
        put(b, fitText(b, capital(m.t), SW - 40 * s - cw - 12 * s, 1)[0], 34 * s, cy + 17 * s, { size: 16, weight: 600, color: full ? UI_COLORS.soft : UI_COLORS.text });
        bar(b, 34 * s, cy + 23 * s, SW - 38 * s, 4 * s, clamp01((m.done ?? 0) / (m.of ?? 1)), full ? UI_COLORS.ok : UI_COLORS.gold);
      });
      if (list.length > 3) put(b, `+${list.length - 3} more`, 34 * s, y + 3 * 30 * s + 14 * s, { size: 15, color: UI_COLORS.muted });
    } else {
      // milestones: 8 cells, 2 by 4, row by row: those reached last (with their times), the next (marked), those after it
      const nextAt = list.findIndex((m) => m.atS == null);
      const SLOTS = 8;
      let from = 0;
      if (list.length > SLOTS) {
        const last = nextAt < 0 ? list.length : nextAt;
        from = Math.max(0, Math.min(last - 2, list.length - SLOTS));
      }
      const cells = list.slice(from, from + SLOTS);
      const CW = (SW - 10 * s) / 2;
      cells.forEach((m, i) => {
        const cx = (i % 2) * (CW + 10 * s);
        const cy = y + Math.floor(i / 2) * 23 * s;
        const idx = from + i;
        const isNext = idx === nextAt && !gl.reached;
        const isDone = m.atS != null;
        if (isNext) {
          b.fillStyle = 'rgba(255,209,100,0.12)'; rr(b, cx, cy, CW, 23 * s, 5 * s); b.fill();
          b.fillStyle = UI_COLORS.gold; b.fillRect(cx, cy + 2 * s, 2 * s, 19 * s);
        }
        icon(b, GOAL_ICONS[m.k] ?? (icons[20][m.k] ? m.k : partIcon(m.k)), cx + 6 * s, cy + 1.5 * s, 20, isDone || isNext ? 1 : 0.4);
        let r = '';
        let rc = UI_COLORS.muted;
        if (isDone) { r = mmss(m.atS); rc = UI_COLORS.ok; }
        else if (isNext) { r = 'next'; rc = UI_COLORS.gold; }
        if (!isDone && m.k === 'obsidian' && inv) r = `${Math.min(inv.obsidian ?? 0, 14)}/14`;
        if (!isDone && m.k === 'diamond' && inv && (inv.diamond ?? 0) > 0) r = `${inv.diamond}/3`;
        if (isNext && r) rc = UI_COLORS.gold;
        b.font = mono(13);
        const w2 = r ? b.measureText(r).width + 8 * s : 0;
        b.font = font(isNext ? 600 : 500, 16);
        put(b, fitText(b, GOAL_WORDS[m.k] ?? capital(m.t), CW - 36 * s - w2, 1)[0], cx + 34 * s, cy + 16.5 * s, { size: 16, weight: isNext ? 600 : 500, color: isNext ? UI_COLORS.text : isDone ? UI_COLORS.soft : UI_COLORS.muted });
        if (r) put(b, r, cx + CW - 6 * s, cy + 16 * s, { face: mono(13), color: rc, align: 'right' });
      });
    }
    y = top + 10 * s + GOAL_H + 18 * s;
    // the items that matter: icon and count, dimmed at none
    label(b, 'Inventory', 0, y, { sq: UI_COLORS.look });
    y += 9 * s;
    const iv = inv ?? {};
    const pickIcon = iv.pick ? `${iv.pick}_pickaxe` : 'wooden_pickaxe';
    const bucketIcon = (iv.water_bucket ?? 0) > 0 ? 'water_bucket' : (iv.lava_bucket ?? 0) > 0 ? 'lava_bucket' : 'bucket';
    const ironIcon = (iv.iron ?? 0) === 0 && (iv.raw_iron ?? 0) > 0 ? 'raw_iron' : 'iron_ingot';
    const items = [
      [pickIcon, iv.pick ? 1 : 0], ['diamond', iv.diamond ?? 0], [ironIcon, ironIcon === 'raw_iron' ? iv.raw_iron : (iv.iron ?? 0)], ['obsidian', iv.obsidian ?? 0],
      ['flint_and_steel', iv.flint_and_steel ?? 0], [bucketIcon, (iv.water_bucket ?? 0) + (iv.lava_bucket ?? 0) + (iv.bucket ?? 0)], ['steak', iv.food ?? 0], ['shield', iv.shield ?? 0],
    ];
    const cw = SW / items.length;
    items.forEach(([n, k], i) => {
      const x = i * cw;
      icon(b, n, x, y + 2 * s, 26, k > 0 ? 1 : 0.42);
      put(b, String(k), x + 31 * s, y + 21 * s, { size: 17, weight: k > 0 ? 600 : 500, color: k > 0 ? UI_COLORS.text : UI_COLORS.muted });
    });
    y += 30 * s + 22 * s;
    // where it is
    if (pos && (Number.isFinite(pos.y) || pos.place)) {
      icon(b, 'depth', 0, y - 15 * s);
      let x = 28 * s;
      if (Number.isFinite(pos.y)) x += put(b, `y ${pos.y}`, x, y, { size: 16, weight: 600 }) + 9 * s;
      if (pos.place) { b.font = font(500, 16); put(b, fitText(b, pos.place, SW - x, 1)[0], x, y, { size: 16, color: UI_COLORS.soft }); }
      y += 28 * s;
    }
    // the Body advice and whether Muse took it
    const adv = [...advice.values()].sort((a, z) => z.sev - a.sev || z.at - a.at)[0];
    if ((adv || follow) && y + 40 * s < H - LOW) {
      label(b, 'Body advice', 0, y, { sq: UI_COLORS.gold });
      y += 22 * s;
      b.font = font(500, 16);
      const room = H - LOW - 6 * s - y - (follow ? 20 * s : 0);
      if (adv) for (const l of fitText(b, capital(adv.text), SW, room > 40 * s ? 2 : 1)) { put(b, l, 0, y, { size: 16 }); y += 21 * s; }
      if (follow && now() - follow.at < 300_000) {
        b.font = font(600, 15);
        put(b, fitText(b, `→ ${follow.ok ? 'Muse followed it' : 'Muse went on without it'}`, SW, 1)[0], 0, y, { size: 15, weight: 600, color: follow.ok ? UI_COLORS.ok : UI_COLORS.fail });
      }
    } else if (!adv && !follow && y + 40 * s < H - LOW) {
      label(b, 'Body advice', 0, y, { sq: UI_COLORS.gold });
      put(b, 'Nothing pressing', 0, y + 22 * s, { size: 16, color: UI_COLORS.muted });
    }
    return c;
  }

  // ----- the inputs
  function addCall(l) {
    const tool = l.tool ?? (/^> ([a-z_]+)/.exec(l.t)?.[1] ?? 'call');
    const steps = Array.isArray(l.steps) && l.steps.length ? l.steps : PLAY.test(tool) ? [{ say: l.say || '', raw: String(l.t).replace(/^> [a-z_]+:?\s*/, '') }] : [];
    const ready = tool === 'start_game'; // start_game's line comes with its reply: the game is there
    const cmd = {
      tool, say: l.say || l.t.replace(/^>\s*/, ''), words: l.words || '', at: now(), gs: gameS(), no: null,
      steps: steps.map((x) => ({ say: x.say || x.raw, raw: x.raw || '', state: 'queued', ms: 0 })),
      state: PLAY.test(tool) ? { kind: 'run' } : { kind: 'ok' }, msSum: 0, checked: null, goal: ready && goal ? goal.title : null,
    };
    calls.unshift(cmd);
    calls = calls.slice(0, 24);
    if (PLAY.test(tool)) {
      sub = null;
      barShown = 0;
      if (cmd.words) { thoughts.unshift({ text: cmd.words, gs: cmd.gs, call: null, cmd }); thoughts = thoughts.slice(0, 6); }
    }
    lastEventAt = now();
  }
  /** A call's number in the game, once known (the reply, or the step running now, names it). */
  function bind(c, no) {
    if (!c || c.no !== null) return;
    c.no = no;
    const th = thoughts.find((x) => x.cmd === c);
    if (th) th.call = no;
  }
  function callOf(l) {
    if (Number.isInteger(l.c)) { const c = calls.find((x) => x.no === l.c); if (c) return c; }
    return calls.find((x) => PLAY.test(x.tool) && x.state?.kind === 'run') ?? calls.find((x) => PLAY.test(x.tool)) ?? null;
  }
  function settle(cmd) {
    if (cmd.state?.kind !== 'run') return;
    if (cmd.steps.some((x) => x.state === 'fail')) {
      const f = cmd.steps.find((x) => x.state === 'fail');
      cmd.state = { kind: 'fail', why: f.why, step: f.say };
      for (const x of cmd.steps) if (x.state === 'queued' || x.state === 'run') x.state = 'skip';
    } else if (cmd.steps.every((x) => x.state === 'ok' || x.state === 'skip')) cmd.state = { kind: 'ok' };
    if (cmd.state.kind !== 'run') { if (cmd === current()) sub = null; lastEventAt = now(); }
  }
  function result(l) {
    const cmd = callOf(l);
    if (!cmd) return;
    const why = shortReason((l.why || String(l.t ?? '').replace(/^FAIL\s*/, '')).split(/[;(]/)[0].replace(/^stopped:\s*/i, ''));
    if (Number.isFinite(l.ms)) cmd.msSum += l.ms;
    // which of Muse's steps: its number, else the first not finished
    let i = Number.isInteger(l.s) ? l.s - 1 : cmd.steps.findIndex((x) => x.state === 'queued' || x.state === 'run');
    if (!cmd.steps.length && l.k === 'fail') { cmd.state = { kind: 'fail', why, step: '' }; lastEventAt = now(); return; }
    if (i < 0 || i >= cmd.steps.length) i = Math.max(0, Math.min(cmd.steps.length - 1, i));
    const step = cmd.steps[i];
    if (!step) return;
    if (Number.isFinite(l.ms)) step.ms = (step.ms ?? 0) + l.ms;
    const partial = l.pre || (Number.isInteger(l.pt) && Number.isInteger(l.pts) && l.pt < l.pts);
    if (l.k === 'info') { if (/^skip\b/.test(l.t) && step.state !== 'ok' && step.state !== 'fail') step.state = 'skip'; }
    else if (l.k === 'fail') { step.state = 'fail'; step.why = why; }
    else if (!partial) { step.state = 'ok'; if (cmd.steps[i + 1]) cmd.steps[i + 1].startAt = now(); }
    else if (step.state === 'queued') { step.state = 'run'; step.startAt = now(); }
    // a step that failed cancels the ones after it; a call is over when all are done
    if (l.k === 'fail' || cmd.steps.every((x) => ['ok', 'fail', 'skip'].includes(x.state))) settle(cmd);
    lastEventAt = now();
  }

  const api = {
    width: W, height: H + T, over: T, fps, file: o.file ?? null,
    /** New lines from the agent ({k, t, say, words, of, ms, n, why, ak, tool, steps, c, s, pre, pt, pts}). */
    push(lines) {
      for (const l of lines ?? []) {
        if (!l || typeof l.t !== 'string') continue;
        if (l.k === 'call') addCall(l);
        else if (l.k === 'ok' || l.k === 'fail' || (l.k === 'info' && /^skip\b/.test(l.t))) {
          if (l.k === 'fail' && /^death\b/i.test(l.t)) { events.unshift({ kind: 'death', text: `died (${reflexGist(l.t.replace(/^death:\s*(?:died:\s*)?/i, ''))})`, at: now(), gs: gameS() }); continue; }
          result(l);
        } else if (l.k === 'reflex' || l.k === 'body') {
          const r = reflexGist(l.t);
          if (events[0]?.text !== r) events.unshift({ kind: l.k, text: r, at: now(), gs: gameS() });
          events = events.slice(0, 12);
        } else if (l.k === 'milestone') {
          toast = { text: milestoneWords(l.t), at: now() };
          const m = /at (\d+):(\d\d)$/.exec(l.t);
          const k = LINE_GOALS.find(([re]) => re.test(l.t))?.[1];
          if (k && !reachedLocal.has(k)) reachedLocal.set(k, m ? Number(m[1]) * 60 + Number(m[2]) : Math.round(gameS() ?? 0));
        } else if (l.k === 'checked') {
          const g2 = calls.find((x) => x.tool === 'get_state' && !x.checked);
          if (g2) g2.checked = l.t.replace(/^Muse checked:\s*/i, '');
        } else if (l.k === 'follow') follow = { text: l.t, ok: Boolean(l.ok) || /^Followed/.test(l.t), at: now() };
        else if (l.k === 'advice') {
          const k = l.ak ?? 'note';
          advice.set(k, { text: adviceGist(l.t), sev: advice.get(k)?.sev ?? 1, at: now() });
        } else if (l.k === 'info' && /^game over/i.test(l.t)) over = capital(l.t);
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
      for (const k of ['hp', 'food', 'clock', 'muse', 'reflex', 'pct']) {
        const v = data[k] ?? null;
        if (v !== null) st[k] = v;
      }
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
    /** An update from the agent: lines, status numbers, the advice, what is happening, the body's sub-step, the HUD's state. */
    term(u) {
      if (!u) return;
      if (u.game && typeof u.game === 'object') game = { id: u.game.id ?? game?.id ?? '', s: Number.isFinite(u.game.s) ? u.game.s : game?.s, at: now() };
      if (u.goal && Array.isArray(u.goal.list)) {
        // another goal than the one shown (set_goal): lit for a while, and a toast
        const sig = (x) => (x ? `${x.key}|${x.title}|${x.text ?? ''}` : '');
        if (goal && sig(goal) !== sig(u.goal)) { newGoalAt = now(); toast = { text: `New goal: ${capital(u.goal.title || u.goal.text || 'set')}`, at: now() }; }
        goal = u.goal;
      }
      if (Number.isInteger(u.bind) && !calls.some((x) => x.no === u.bind)) bind(calls.find((x) => PLAY.test(x.tool) && x.no === null), u.bind);
      if (Array.isArray(u.lines) && u.lines.length) api.push(u.lines);
      if (u.st) api.status(u.status, u.st);
      if (Array.isArray(u.adv)) api.advice(u.adv);
      if (u.live) {
        live = { ...u.live, at: now() };
        // the step running now (its call's number and Muse's step): the steps before it are done, before a reply says so
        if (live.mode === 'run' && Number.isInteger(live.c)) {
          let c = calls.find((x) => x.no === live.c);
          if (!c) { c = calls.find((x) => PLAY.test(x.tool) && x.no === null && x.state?.kind === 'run'); bind(c, live.c); }
          if (c?.state?.kind === 'run' && Number.isInteger(live.s)) {
            c.steps.forEach((x, i) => { if (i < live.s - 1 && (x.state === 'queued' || x.state === 'run')) x.state = 'ok'; });
            const cur = c.steps[live.s - 1];
            if (cur && cur.state === 'queued') { cur.state = 'run'; cur.startAt = now(); }
          }
        }
      }
      if (u.inv && typeof u.inv === 'object') inv = u.inv;
      if (u.pos && typeof u.pos === 'object') pos = u.pos;
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
    /** Another game on camera: an empty HUD, with a note. */
    reset(note = '') {
      calls = []; events = []; thoughts = [];
      sub = null; live = null; follow = null; toast = null; anchor = null; game = null; goal = null; inv = null; pos = null; over = null; newGoalAt = null;
      advice.clear();
      reachedLocal.clear();
      for (const k of Object.keys(st)) st[k] = k === 'clock' ? '' : null;
      if (note) over = capital(note);
      lastEventAt = now();
    },

    /** One frame at time t (ms). */
    render(t = now()) {
      g.clearRect(0, 0, W, T);
      g.globalAlpha = 1;
      g.drawImage(bg, 0, T);
      const sec = Math.floor(t / 1000);
      // each part again when what it shows changes (the ticking times: once a second)
      const hk = JSON.stringify([st, clockNow(), game?.id, gameS(t) === null ? null : Math.floor(gameS(t))]);
      if (hk !== keys.header || !layers.header) { keys.header = hk; layers.header = drawHeader(t); }
      g.drawImage(layers.header, 0, T);
      const bk = JSON.stringify([thoughts.slice(0, 3).map((x) => [x.text, x.call]), thoughts.length ? 0 : [statusWords(t), goal]]);
      if (bk !== keys.band || !layers.band) { keys.band = bk; layers.band = drawBand(t); }
      g.drawImage(layers.band.c, 0, T + HDR);
      const cur = current();
      const tk = JSON.stringify([calls.length, calls.slice(0, 8).map((c) => [c.no, c.state, c.checked, c.steps.map((x) => x.state)]), events.length, sub && [sub.text, sub.done, sub.of], live?.step,
        cur?.state?.kind === 'run' ? sec : statusWords(t)]);
      if (tk !== keys.trace || !layers.trace) { keys.trace = tk; layers.trace = drawTrace(t); }
      g.drawImage(layers.trace.c, TX, T + LOW);
      const sk = JSON.stringify([goal, [...reachedLocal], inv, pos, [...advice.entries()], follow && [follow.text, t - follow.at < 300_000], newGoalAt !== null && t - newGoalAt < NEW_GOAL_MS]);
      if (sk !== keys.state || !layers.state) { keys.state = sk; layers.state = drawState(); }
      g.drawImage(layers.state, SX, T + LOW);
      // the moving parts: the running step's bar, a breathing dot by the words of what is happening, the toast
      const bd = layers.trace.dyn.bar;
      if (bd && bd.w > 20 * s) {
        let target = null;
        if (sub && Number.isFinite(sub.of) && sub.of > 0) target = clamp01((sub.done ?? 0) / sub.of);
        else if (sub?.kind === 'walk' && Number.isFinite(sub.left) && sub.first > 0) target = clamp01(1 - sub.left / sub.first);
        const x = TX + bd.x;
        const y = T + LOW + bd.y;
        if (target !== null) {
          barShown += (target - barShown) * 0.15;
          bar(g, x, y, bd.w, 6 * s, barShown, UI_COLORS.body);
        } else {
          // no numbers yet: a light that runs along the bar
          bar(g, x, y, bd.w, 6 * s, 0, UI_COLORS.body);
          const p = (t / 1600) % 1;
          g.globalAlpha = 0.8;
          rr(g, x + p * (bd.w - 60 * s), y, 60 * s, 6 * s, 3 * s);
          g.fillStyle = UI_COLORS.body;
          g.fill();
          g.globalAlpha = 1;
        }
      }
      const pulse = layers.band.dyn.pulse ? { x: layers.band.dyn.pulse.x, y: T + HDR + layers.band.dyn.pulse.y } : layers.trace.dyn.pulse ? { x: TX + layers.trace.dyn.pulse.x, y: T + LOW + layers.trace.dyn.pulse.y } : null;
      if (pulse) {
        g.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(((t / 1000) * Math.PI * 2) / 2.4));
        g.fillStyle = UI_COLORS.soft;
        g.beginPath();
        g.arc(pulse.x, pulse.y, 5 * s, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
      // a milestone: a toast over the bottom right of the game, 6 s
      if (toast && T > 0) {
        const age = t - toast.at;
        if (age > 6_000) toast = null;
        else {
          g.globalAlpha = Math.min(ease(age / 300), clamp01((6_000 - age) / 600));
          g.font = font(700, 18);
          const tw = g.measureText(toast.text).width;
          const w = tw + 64 * s;
          const x = W - PX - w;
          const y = T - 54 * s;
          rr(g, x, y, w, 42 * s, 21 * s);
          g.fillStyle = 'rgba(10,13,18,0.86)';
          g.fill();
          icon(g, 'star', x + 11 * s, y + 11 * s);
          g.fillStyle = UI_COLORS.gold;
          g.textBaseline = 'middle';
          g.fillText(toast.text, x + 46 * s, y + 22 * s);
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
    state: () => {
      const cur = current();
      return {
        calls: calls.map((c) => ({ tool: c.tool, say: c.say, words: c.words, no: c.no, state: c.state, checked: c.checked, steps: c.steps.map((x) => ({ say: x.say, raw: x.raw, state: x.state, ms: x.ms, why: x.why })) })),
        current: cur ? { tool: cur.tool, no: cur.no, states: stepStates(cur) } : null,
        thoughts: thoughts.map((x) => ({ text: x.text, call: x.call })),
        events: events.map((e) => ({ kind: e.kind, text: e.text })),
        sub, follow: follow?.text ?? null, advice: [...advice.entries()].map(([k, a]) => ({ k, text: a.text, sev: a.sev })),
        toast: toast?.text ?? null, st: { ...st }, clock: clockNow(), status: running() ? null : statusWords(now()),
        goal: goalNow(), newGoal: newGoalAt !== null && now() - newGoalAt < NEW_GOAL_MS, inv, pos, game: game ? { id: game.id, s: gameS() === null ? null : Math.floor(gameS()) } : null,
      };
    },
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
