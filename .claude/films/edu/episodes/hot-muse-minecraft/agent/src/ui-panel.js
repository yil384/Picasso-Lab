// src/ui-panel.js - the HUD in the live video (STREAM_LAYOUT=ui, the camera's side). Two designs draw it: concept B
// "Speedrun broadcast" (o.design 'b', the default since 2026-10-13: src/hud-b.js, over the whole frame: toasts,
// floaters, banners and the action bar over the video, the broadcast package under it), and the final design before it
// (o.design 'final', STREAM_HUD=final; ui-art/hud-final/FINAL-SPEC.md, its mock-up ui-art/hud-final/index.html): the stats strip, the goal band, Muse's why
// and plan (or one honest line when it sent none), NOW (the call running, its steps as Muse sent them, the body carrying
// them out) beside the body's advice and the BODY · WORLD events, and RAW across the bottom (every call as sent, newest
// first, with the server's answer); the inventory hotbar and the toasts over the video's bottom corners.
//
// This module keeps what the agent sends (src/terminal.js, cleaned again by the service) and turns it into the HUD
// state, the shape of the design's data (hudState()); src/hud.js draws that state with the mock-up's own drawing code.
// The HUD is drawn again when what it shows changed: an input that changes its content (a call, an answer, a step done,
// the advice, the goal) at once (at most every 150 ms), what moves with the clock (the clocks, the ages, a step's
// progress, the stats, the hotbar) once a second; a state that differs from the last only there keeps its layout
// (src/hud.js hudSig). Each drawing is written once, as an uncompressed 32-bit BMP with alpha (the band over the video
// is see-through but for the overlays), renamed over the panel file, which ffmpeg reads again for every frame
// (src/stream.js): between two drawings the video shows the last one, with no frame written (on picasso at a load of
// 69, redrawing and writing all 30 frames a second fell to 16 a second, the HUD standing still up to 1.3 s).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drawHud, hudSig, ICON_SIZES } from './hud.js';
import { createHudB } from './hud-b.js';

const require = createRequire(import.meta.url);

export const UI_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'muse-ui');
/** The design's colour tokens (src/hud.js has them all). */
export const UI_COLORS = Object.freeze({ base: '#07090d', band: '#0b0e14', muse: '#9d8cff', body: '#efa443', ok: '#5fd39b', fail: '#ff6f61', t1: '#f3f5f9', t3: '#7f889b' });
const PLAY = /^(?:play|play_sequence)$/;
/** The video's height in the 1080x1080 frame: the HUD's coordinates are the frame's. */
const VIDEO_H = 608;
/** The least time between two drawings for a change of content (a burst of inputs is drawn once). */
const MIN_DRAW_GAP_MS = 150;

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
/**
 * The body's own action in a few words, the action itself, not the reason it shares with others: "waiting for your
 * first call with hostile mobs near or at night: dug two blocks down to wait there" -> "dug two blocks down to wait
 * there"; two actions with the same reason never read the same.
 */
export function actionGist(text) {
  const t = String(text ?? '').replace(/^(?:reflex|body|Reflex|Body|rule [a-z_]+):\s*/, '').trim();
  const m = /^([^:]{12,}?):\s+(.+)$/.exec(t);
  if (!m || m[1].split(/\s+/).length <= 3) return reflexGist(t);
  return m[2].split(/;| then /)[0].trim();
}
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


/** A JSON string of a step's arguments as sent, read back (null when it is not JSON). */
function parseArgs(s) {
  if (typeof s !== 'string' || !s) return null;
  try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : null; } catch { return null; }
}
/** A result line in words: "ok  mined 4 oak log (18 s)" -> "mined 4 oak log". */
const resultWords = (t) => String(t ?? '').replace(/^ok\s+/, '').replace(/\s*\(\d+(?:\.\d+)? s\)$/, '').trim();
/** "40s ago", "16 min ago", "1 h 5 min ago". */

/**
 * @param {object} o
 * @param {number} o.width            the panel's size under the game (the frame's width, the rest of its height)
 * @param {number} o.height
 * @param {number} [o.over]           a see-through band this tall over the bottom of the video, for the overlays
 * @param {string} [o.file]           where each frame goes (an uncompressed BMP with alpha, replaced by renaming)
 * @param {number} [o.fps]            frames a second written by start() (30)
 * @param {string} [o.assets]         icons and fonts (assets/muse-ui)
 * @param {() => number} [o.now]
 * @param {boolean} [o.qa]            outline every text problem in red (the mock-up's ?qa=1)
 * @param {'b'|'final'} [o.design]    the HUD's design: B (the default; o.over must be the video's height, 608 at 1080)
 * @param {{style: 'card'|'plain', file?: string}} [o.logo]  B: the lab's logo at the top right (none without it)
 * @param {(ev: object) => void} [o.onEvent]  B's toasts, banners, floaters, action-bar lines as scheduled (the recording)
 */
export function createUiPanel(o) {
  const { createCanvas, Image, registerFont } = require('canvas');
  const assets = o.assets ?? UI_ASSETS;
  const now = o.now ?? Date.now;
  const W = o.width;
  const H = o.height;
  const T = o.over ?? 0; // the band over the video, for the overlays
  const s = W / 1080; // the design is drawn for 1080 wide
  const fps = o.fps ?? 30;
  if (!createUiPanel.fonts) {
    createUiPanel.fonts = true;
    for (const [file, family, weight] of [['Inter-Medium.ttf', 'MuseUI', '500'], ['Inter-SemiBold.ttf', 'MuseUI', '600'], ['Inter-Bold.ttf', 'MuseUI', '700'],
      ['JetBrainsMono-Regular.ttf', 'MuseMono', '400'], ['JetBrainsMono-Medium.ttf', 'MuseMono', '500']]) {
      try { registerFont(path.join(assets, 'fonts', file), { family, weight }); } catch { /* the default face then */ }
    }
  }
  // icons, each scaled once to every size the HUD draws it at
  const images = {};
  try { for (const f of fs.readdirSync(path.join(assets, 'icons'))) if (f.endsWith('.png')) { const im = new Image(); im.src = fs.readFileSync(path.join(assets, 'icons', f)); images[f.slice(0, -4)] = im; } } catch { /* drawn without */ }
  // the lab's logo for the top right of the video (concept B; the stream only, never the clean recording): o.logo
  // {style: card | plain, file: a name in assets or an absolute path}; none without it
  let logo = null;
  if (o.logo && ['card', 'plain'].includes(o.logo.style)) {
    // a name in assets/muse-ui, a path under assets/ (brand/...), or an absolute path; by default the official logo on its
    // card, the pixel logo (brand/picasso-lab-pixel-230.png) drawn as it is
    const name = o.logo.file || (o.logo.style === 'plain' ? 'brand/picasso-lab-pixel-230.png' : 'lab-logo-152.png');
    const f = path.isAbsolute(name) ? name : name.includes('/') ? path.join(assets, '..', path.normalize(name).replace(/^(\.\.[/\\])+/, '')) : path.join(assets, name);
    try { const im = new Image(); im.src = fs.readFileSync(f); logo = { img: im, style: o.logo.style }; } catch { logo = null; }
  }
  const scaled = new Map();
  const iconAt = (n, size) => {
    const k = `${n}@${size}`;
    if (!scaled.has(k)) {
      const im = images[n];
      if (!im) scaled.set(k, null);
      else { const c = createCanvas(size, size); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, size, size); scaled.set(k, c); }
    }
    return scaled.get(k);
  };
  for (const n of Object.keys(images)) for (const z of ICON_SIZES) iconAt(n, z);

  // the HUD, drawn once per change of what it shows, in the 1080 frame's coordinates moved up to the panel's
  const canvas = createCanvas(W, H + T);
  const lg = canvas.getContext('2d');
  const top = VIDEO_H - T; // the panel's first row in the frame

  // ----- what is shown
  const st = { hp: null, food: null, clock: '', muse: null, reflex: null, pct: null, rule: null, body: null, dpct: null };
  let calls = []; // newest first: {tool, say, words, plan, raw, rid, reply, replyGs, replyCode, at, gs, no, steps, added, state, msSum, checked}
  let events = []; // the body's own: {kind: reflex|body|death, text, at, gs}
  let world = []; // from the body's state: {kind: 'world', who, text, at, gs}
  let landmarks = []; // milestones and dimension changes: {kind: 'milestone', text, at, gs}
  let thoughts = []; // Muse's words, newest first: {text, gs, call, cmd}
  let sub = null; // the body's live sub-step
  let live = null; // what the agent says is happening
  let follow = null; // {text, ok, at, gs}
  const advice = new Map(); // kind -> {text, gist, sev, at, gs}
  let toast = null; // a milestone: {text, at}
  let rules = null; // Muse's rules as the server has them: [{n, on, v, setS, call}] (null: a server without them)
  let rulesToast = null; // the rules changed: {title, at}
  let anchor = null; // the game clock: {ticks, at, rate}
  let game = null; // {id, s, at}
  let goal = null; // the server's: {key, title, text, reached, list}
  let prevGoal = null; // the one before (set_goal)
  let newGoalAt = null;
  const reachedLocal = new Map();
  let inv = null;
  let pos = null;
  let over = null;
  let sheltered = null; // the body closed itself in: {gs} until the next play call
  let caller = 'MUSE';
  let lastEventAt = now();
  let frames = 0;
  let timer = null;
  let version = 0; // every input moves it: the HUD is looked at again
  let callTotal = 0; // every call of the game (the list keeps the newest 120)
  let drawnKey = ''; // the second and the timed flags of the last drawing
  let drawnSig = null; // the content of the last drawing (src/hud.js hudSig)
  let seenVersion = -1;
  let changedAt = null; // the first input since the last drawing (the HUD's lag)
  let lastDrawAt = -Infinity;
  let unwritten = false; // a drawing not in the panel file yet
  let lastLayout = null;
  let lastQa = null;
  let callSeq = 0; // every call's id in this panel
  let playSeq = 0; // the game's play calls, counted here until the server's number is known
  const perf = { draws: 0, writes: 0, searches: 0, searchBase: 0, ms: [], lag: [], ticks: 0, gapMax: 0, lastTick: null, errors: 0, lastError: null, composes: 0, cms: [] };
  // concept B: its own layers over the whole frame (the video's place see-through but for what moves over it)
  const design = o.design ?? 'b';
  const hb = design === 'b'
    ? createHudB({ createCanvas, icon: iconAt, has: (n) => Boolean(images[n]), logo, emit: (ev) => { try { o.onEvent?.({ ...ev, gs: gameS(ev.start ?? ev.at ?? now()) }); } catch { /* best effort */ } } })
    : null;
  let bSec = null;
  let bEpoch = '';
  function bump() { version += 1; if (changedAt === null) changedAt = now(); }

  const gameS = (t = now()) => (game && Number.isFinite(game.s) ? game.s + (t - game.at) / 1000 : null);
  const ticksNow = () => (anchor ? (((anchor.ticks + anchor.rate * (now() - anchor.at)) % 24_000) + 24_000) % 24_000 : null);
  const clockNow = () => {
    if (!st.clock || st.clock === 'NETHER' || st.clock === 'END' || !anchor) return st.clock;
    const tk = ticksNow();
    const h = Math.floor(tk / 1000 + 6) % 24;
    const m = Math.floor(((tk % 1000) * 60) / 1000);
    return `${tk >= 13_000 && tk < 23_000 ? 'NIGHT' : 'DAY'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const current = () => calls.find((c) => PLAY.test(c.tool)) ?? null;
  const running = () => { const c = current(); return c?.state?.kind === 'run' ? c : null; };
  const latestPlan = () => calls.find((c) => PLAY.test(c.tool) && c.plan) ?? null;
  // what is happening while no command runs, in words (the HUD shows facts instead; kept for the state)
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
  const goalNow = () => {
    if (goal) return goal;
    return { ...DEFAULT_GOAL, list: DEFAULT_GOAL.list.map((k) => ({ k, t: GOAL_WORDS[k], atS: reachedLocal.get(k) ?? null })) };
  };
  function stepStates(cmd) {
    let runAt = -1;
    if (cmd.state?.kind === 'run') runAt = cmd.steps.findIndex((x) => x.state === 'queued' || x.state === 'run');
    return cmd.steps.map((x, i) => (i === runAt ? 'run' : x.state === 'run' ? 'queued' : x.state));
  }

  // ----- the inputs
  function addCall(l) {
    bump();
    const tool = l.tool ?? (/^> ([a-z_]+)/.exec(l.t)?.[1] ?? 'call');
    const steps = Array.isArray(l.steps) && l.steps.length ? l.steps : PLAY.test(tool) ? [{ say: l.say || '', raw: String(l.t).replace(/^> [a-z_]+:?\s*/, '') }] : [];
    const ready = tool === 'start_game'; // start_game's line comes with its reply: the game is there
    const cmd = {
      tool, say: l.say || l.t.replace(/^>\s*/, ''), words: l.words || '', plan: l.plan || '', raw: l.raw || '', rid: Number.isInteger(l.rid) ? l.rid : null, reply: null, at: now(), gs: gameS(), no: null,
      steps: steps.map((x) => ({ say: x.say || x.raw, raw: x.raw || '', skill: x.skill || String(x.raw || '').split(' ')[0], args: parseArgs(x.args), state: 'queued', ms: 0 })),
      replyGs: null, replyCode: null, added: [],
      state: PLAY.test(tool) ? { kind: 'run' } : { kind: 'ok' }, msSum: 0, checked: null, goal: ready && goal ? goal.title : null,
      id: ++callSeq, seqNo: PLAY.test(tool) ? ++playSeq : null,
    };
    calls.unshift(cmd);
    calls = calls.slice(0, 120);
    callTotal += 1;
    if (PLAY.test(tool)) {
      sub = null;
      if (cmd.words) { thoughts.unshift({ text: cmd.words, gs: cmd.gs, call: null, cmd }); thoughts = thoughts.slice(0, 12); }
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
    else if (!partial) { step.state = 'ok'; step.result = resultWords(l.t); if (cmd.steps[i + 1]) cmd.steps[i + 1].startAt = now(); }
    else if (step.state === 'queued') { step.state = 'run'; step.startAt = now(); }
    // a step that failed cancels the ones after it; a call is over when all are done
    if (l.k === 'fail' || cmd.steps.every((x) => ['ok', 'fail', 'skip'].includes(x.state))) settle(cmd);
    lastEventAt = now();
  }


  // ----- the HUD state: the shape of the design's data (data/states.json), from what came in
  const ago = (sec) => (sec < 60 ? `${Math.max(0, Math.floor(sec))}s` : sec < 3600 ? `${Math.floor(sec / 60)}m` : `${Math.floor(sec / 3600)}h`);
  const clockOf = (gs) => (Number.isFinite(gs) ? mmss(gs) : '');
  const iconOf = (n, fallback = 'compass') => (images[n] ? n : fallback);
  function goalState(gl, fresh) {
    const list = gl?.list ?? [];
    const counted = list.some((m) => Number.isFinite(m.of));
    if (!list.length) return { kind: 'text', key: gl?.key ?? 'free', title: gl?.title && gl.title !== gl?.text ? gl.title : '', text: gl?.text || gl?.title || '', new: fresh };
    if (counted) {
      return {
        kind: 'counted', key: gl.key, title: gl.title || gl.text || 'goal', new: fresh, toast: `New goal: ${capital(gl.title || gl.text || 'set')}`,
        parts: list.map((m) => ({ key: m.k, label: capital(m.t), icon: iconOf(partIcon(m.k), 'star'), done: Math.min(m.done ?? 0, m.of ?? 1), of: m.of ?? 1 })),
        ...(prevGoal ? { previous: milestones(prevGoal) } : {}),
      };
    }
    return { ...milestones(gl), new: fresh, toast: `New goal: ${capital(gl.title || 'set')}`, ...(prevGoal && fresh ? { previous: milestones(prevGoal) } : {}) };
  }
  function milestones(gl) {
    const list = (gl?.list ?? []).slice(0, 12);
    const nextAt = list.findIndex((m) => m.atS == null);
    return {
      kind: 'milestones', key: gl?.key, title: gl?.title || 'Goal', done: list.filter((m) => m.atS != null).length, total: list.length,
      list: list.map((m, i) => {
        const state = m.atS != null ? 'done' : i === nextAt ? 'next' : 'todo';
        let progress;
        if (state === 'next' && m.k === 'obsidian' && inv) progress = `${Math.min(inv.obsidian ?? 0, 14)}/14`;
        if (state === 'next' && m.k === 'diamond' && inv && (inv.diamond ?? 0) > 0) progress = `${inv.diamond}/3`;
        const icon = GOAL_ICONS[m.k] ?? (images[m.k] ? m.k : partIcon(m.k));
        return { key: m.k, label: GOAL_WORDS[m.k] ?? capital(m.t), icon: iconOf(icon, 'star'), state, done: m.atS != null ? mmss(m.atS) : null, doneS: m.atS ?? null, ...(progress ? { progress } : {}) };
      }),
    };
  }
  // Muse's rules in words: "defend, eat at food 4 or less"; none on: ''
  const RULE_WORDS = { defend: 'defend', flee: 'flee', escape: 'escape' };
  const ruleWord = (r) => (r.n === 'eat_below' ? `eat at food ${r.v ?? '?'} or less` : RULE_WORDS[r.n] ?? r.n);
  const rulesWords = (rs) => { const on = (rs ?? []).filter((r) => r.on); return on.length ? on.map(ruleWord).join(', ') : 'none: every action a direct call'; };
  function rulesState() {
    const on = rules.filter((r) => r.on);
    // the newest change: when and with which call
    const last = rules.filter((r) => Number.isFinite(r.setS)).sort((a, z) => z.setS - a.setS)[0] ?? null;
    return { on: on.map((r) => ({ n: r.n, words: ruleWord(r), ...(Number.isFinite(r.v) ? { v: r.v } : {}) })), set: last ? clockOf(last.setS) : null, call: last?.call ?? null, ...(last?.via ? { via: last.via } : {}) };
  }
  function hudState(t) {
    const gs = gameS(t) ?? 0;
    // stats
    const clk = clockNow();
    const nether = st.clock === 'NETHER';
    const tk = ticksNow();
    const night = /^NIGHT/.test(clk);
    let phaseWords = nether ? 'nether' : st.clock === 'END' ? 'end' : night ? 'night' : 'day';
    if (tk !== null && night) phaseWords = `night, dawn in ${Math.max(1, Math.round((23_000 - tk) / 1200))} min`;
    else if (tk !== null && !nether && tk >= 11_000 && tk < 13_000) phaseWords = `day, dusk in ${Math.max(1, Math.round((13_000 - tk) / 1200))} min`;
    const pct = Number.isFinite(st.pct) ? st.pct : Number.isFinite(st.muse) && Number.isFinite(st.reflex) && st.muse + st.reflex > 0 ? Math.round((100 * st.muse) / (st.muse + st.reflex)) : null;
    const stats = {
      hp: Number.isFinite(st.hp) ? st.hp : '–', hpMax: 20, food: Number.isFinite(st.food) ? st.food : '–', foodMax: 20,
      dimension: nether ? 'nether' : st.clock === 'END' ? 'end' : 'overworld', phase: night ? 'night' : nether ? 'nether' : 'day', phaseWords,
      timeOfDay: clk && !nether && st.clock !== 'END' ? clk.replace(/^(?:DAY|NIGHT) /, '') : '',
      museShare: { pct, ...(Number.isFinite(st.muse) && Number.isFinite(st.reflex) && st.muse + st.reflex > 0 ? { muse: st.muse, reflex: st.reflex } : { muse: null, reflex: null }),
        // Muse's rules (servers that count them): actions by its rules, by the body on its own, decided by Muse %
        ...(Number.isFinite(st.rule) ? { rule: st.rule, body: st.body ?? 0, dpct: Number.isFinite(st.dpct) ? st.dpct : null } : {}) },
      gameId: game?.id ?? '', gameClock: mmss(gs), ticks: nether || st.clock === 'END' ? null : tk,
    };
    // the inventory hotbar: the items that matter, in this order
    const iv = inv ?? {};
    const inventory = [
      { key: 'pickaxe', icon: iv.pick ? `${iv.pick}_pickaxe` : 'wooden_pickaxe', count: iv.pick ? 1 : 0 },
      { key: 'diamond', icon: 'diamond', count: iv.diamond ?? 0 },
      (iv.iron ?? 0) === 0 && (iv.raw_iron ?? 0) > 0 ? { key: 'iron', icon: 'raw_iron', count: iv.raw_iron } : { key: 'iron', icon: 'iron_ingot', count: iv.iron ?? 0 },
      { key: 'obsidian', icon: 'obsidian', count: iv.obsidian ?? 0 },
      { key: 'flint_and_steel', icon: 'flint_and_steel', count: iv.flint_and_steel ?? 0 },
      { key: 'bucket', icon: (iv.water_bucket ?? 0) > 0 ? 'water_bucket' : (iv.lava_bucket ?? 0) > 0 ? 'lava_bucket' : 'bucket', count: (iv.water_bucket ?? 0) + (iv.lava_bucket ?? 0) + (iv.bucket ?? 0) },
      { key: 'food', icon: 'steak', count: iv.food ?? 0 },
      { key: 'shield', icon: 'shield', count: iv.shield ?? 0 },
    ];
    const fresh = newGoalAt !== null && t - newGoalAt < NEW_GOAL_MS;
    // thinking: the latest play call's why and plan
    const latest = current();
    const thinking = {
      hasWhy: Boolean(latest?.words), why: latest?.words || null, plan: latest?.words ? (latest.plan || null) : null,
      whyCall: latest?.no ?? '?', whyAt: clockOf(latest?.gs), lastCallAgoS: latest ? (t - latest.at) / 1000 : 0, // the age of the call that carried the why (and its plan): an old why never reads as current
      latestPlayCall: latest ? { no: latest.no ?? '?', tool: latest.tool, sent: clockOf(latest.gs) } : null,
    };
    const earlierThinking = thoughts.filter((x) => x.cmd !== latest).map((x) => ({ at: clockOf(x.gs), why: x.text }));
    // NOW: the latest play call
    let currentCall = null;
    if (latest) {
      const states = stepStates(latest);
      const runningNow = latest.state?.kind === 'run';
      currentCall = {
        id: latest.id, sentS: latest.gs, no: latest.no ?? '?', tool: latest.tool, sent: clockOf(latest.gs), state: runningNow ? 'running' : latest.state?.kind === 'ok' ? 'ok' : 'fail',
        running: mmss((t - latest.at) / 1000), doneIn: latest.msSum > 0 ? secs(latest.msSum) : '',
        steps: latest.steps.map((x, i) => {
          const k = states[i] === 'skip' ? 'queued' : states[i];
          const isRun = k === 'run';
          const sb = isRun && sub ? { text: sub.text, ...(Number.isFinite(sub.of) ? { done: sub.done ?? 0, of: sub.of } : {}) } : isRun ? { text: live?.step ? live.step.toLowerCase() : 'starting' } : null;
          return {
            n: i + 1, say: x.say, raw: x.raw, skill: x.skill || x.raw.split(' ')[0], args: x.args, icon: iconOf(iconFor(x.say, isRun ? sub?.kind : '')),
            state: k, elapsed: isRun ? mmss((t - (x.startAt ?? latest.at)) / 1000) : null, took: k === 'ok' && x.ms > 0 ? secs(x.ms) : null, result: x.result ?? null, sub: sb,
          };
        }),
        addedByServer: latest.added ?? [],
        ...(latest.reply ? { serverAnswer: { at: clockOf(latest.replyGs), text: latest.reply.replace(/^<\s*/, '') } } : {}),
      };
    }
    // RAW: every call, newest first; runs of the same call folded
    const entries = calls.map((c, idx) => {
      const isRun = PLAY.test(c.tool) && c.state?.kind === 'run';
      const waiting = !c.reply && !PLAY.test(c.tool) && c.tool !== 'start_game';
      return {
        n: calls.length - idx, tool: c.tool, args: c.raw || '{}', sentS: c.gs, sent: clockOf(c.gs), agoS: (t - c.at) / 1000, playCallNo: PLAY.test(c.tool) ? (c.no ?? '?') : null, hasWhy: Boolean(c.words),
        answer: { state: isRun ? 'running' : waiting ? 'waiting' : 'answered', waitingS: waiting ? (t - c.at) / 1000 : null, hudText: isRun ? `running ${mmss((t - c.at) / 1000)}` : null, code: c.replyCode ?? null,
          atS: c.replyGs ?? null, text: c.reply ? c.reply.replace(/^<\s*/, '') : '' },
        reply: c.reply ? c.reply.replace(/^<\s*/, '') : null, replyAt: clockOf(c.replyGs),
        // what concept B reads: the call's id here, its steps as objects, the why and plan, its state, its time
        id: c.id, callNo: PLAY.test(c.tool) ? (c.no ?? c.seqNo) : null, why: c.words || null, plan: c.plan || null, state: c.state?.kind ?? 'ok', ms: c.msSum || 0,
        steps: c.steps.map((x) => ({ skill: x.skill, args: x.args ?? {}, say: x.say, state: x.state, ...(x.result ? { result: x.result } : {}), ...(x.why ? { why: x.why } : {}) })),
        ...(c.tool === 'set_goal' ? { goal: (parseArgs(c.raw)?.goal ?? String(c.say || '').replace(/^A new goal:\s*/, '')) || null } : {}),
      };
    });
    const runs = [];
    for (const e of entries) {
      const last = runs[runs.length - 1];
      if (last && last.tool === e.tool && last.args === e.args && e.playCallNo === null && last.newestState !== 'running') {
        last.count += 1; last.firstSent = e.sent; last.ns.push(e.n);
        if (!last.latestAnswer && e.reply) { last.latestAnswer = e.reply; last.latestAnswerAt = e.replyAt; }
        continue;
      }
      runs.push({ tool: e.tool, args: e.args, count: 1, lastSent: e.sent, lastAgoS: e.agoS, firstSent: e.sent, ns: [e.n], newestState: e.answer.state, latestAnswer: e.reply, latestAnswerAt: e.replyAt });
    }
    // the advice: full text, when it was given, the verdict tied to it by time
    // stuck first (the line that helps most when Muse repeats itself), then by how pressing, the time left last
    const rank = (a) => (a.kind === 'stuck' ? 0 : a.kind === 'time' ? 2 : 1);
    const items = [...advice.values()].sort((a, z) => rank(a) - rank(z) || z.sev - a.sev || z.at - a.at).map((a) => {
      // a stuck advice under its STUCK tag: what is not moving leads ("stuck:" is the tag's)
      const text = capital(a.kind === 'stuck' ? String(a.text).replace(/^stuck:\s*/i, '') : a.text);
      const lead = text.split(/[:;]\s|\.\s/)[0]; // its first clause: "Night in about 68 s", "You carry 8 obsidian"
      return { text, gist: lead.length <= 48 && lead !== text ? lead : '', givenAt: clockOf(a.gs), givenAtS: a.gs ?? 0, ...(a.kind === 'stuck' || a.kind === 'time' ? { kind: a.kind } : {}) };
    });
    const adviceState = { items, follow: null, lastFollow: follow ? { atS: follow.gs ?? 0, at: clockOf(follow.gs), ok: follow.ok } : null };
    // BODY · WORLD: the body's own actions, what happened around it, the server's
    const evs = [
      ...events.map((e) => ({ at: e.at, gs: e.gs, who: e.src === 'rule' ? 'rule' : 'body', kind: e.kind, text: e.text, ...(e.src === 'rule' ? { rule: e.rule, ruleSet: Number.isFinite(e.rs) ? clockOf(e.rs) : null, ruleCall: e.rc ?? null, ruleVia: e.rv ?? null } : {}) })),
      ...world.map((e) => ({ at: e.at, gs: e.gs, who: e.who ?? 'body', kind: e.who === 'server' ? 'policy' : 'world', text: e.text })),
      ...landmarks.map((e) => ({ at: e.at, gs: e.gs, who: 'world', kind: 'milestone', text: e.text })),
    ].sort((a, z) => z.at - a.at).map((e) => ({ at: clockOf(e.gs), atS: Number.isFinite(e.gs) ? e.gs : null, who: e.who, kind: e.kind, text: e.text, ...(e.who === 'rule' ? { rule: e.rule, ruleSet: e.ruleSet, ruleCall: e.ruleCall, ...(e.ruleVia ? { ruleVia: e.ruleVia } : {}) } : {}) }));
    return {
      caller, now: { gameS: gs, gameClock: mmss(gs) }, stats, position: { y: Number.isFinite(pos?.y) ? pos.y : '–', place: pos?.place ?? '' },
      goal: goalState(goalNow(), fresh), inventory, thinking, earlierThinking, currentCall, raw: { total: Math.max(callTotal, calls.length), entries, runs },
      advice: adviceState, events: evs,
      // the newest of a milestone and a change of Muse's rules, 6 s each
      toast: [toast && t - toast.at < 6_000 ? { label: 'MILESTONE', title: capital(toast.text), at: toast.at } : null, rulesToast && t - rulesToast.at < 6_000 ? { label: 'RULES CHANGED', title: rulesToast.title, at: rulesToast.at } : null]
        .filter(Boolean).sort((a, z) => z.at - a.at).map(({ label, title }) => ({ label, title }))[0] ?? null,
      rules: rules ? rulesState() : null,
      sheltered: sheltered ? { since: clockOf(sheltered.gs) } : null,
      over: over || null,
    };
  }

  // concept B's frame: the HUD layer when what it shows may have changed (an input, at most every 150 ms; the second,
  // for its clocks; a toast leaving or reaching its home), then the pieces that move over it, composed when the
  // picture changed (every frame only while something moves)
  function renderB(t) {
    const sec = Math.floor(t / 1000);
    const ep = hb.epoch(t);
    const due = sec !== bSec || ep !== bEpoch || (version !== seenVersion && t - lastDrawAt >= MIN_DRAW_GAP_MS);
    lg.setTransform(s, 0, 0, s, 0, -top * s);
    if (due) {
      const content = version !== seenVersion;
      seenVersion = version; bSec = sec; bEpoch = ep; lastDrawAt = t;
      const t0 = process.hrtime.bigint();
      let drew = false;
      try { drew = hb.update(hudState(t), t, { qa: Boolean(o.qa) }); } catch (e) {
        perf.errors += 1;
        perf.lastError = String(e?.stack ?? e?.message ?? e).split('\n').slice(0, 3).join(' | ').slice(0, 300);
      }
      bEpoch = hb.epoch(t);
      if (drew) {
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        perf.draws += 1;
        if (perf.ms.length < 4000) perf.ms.push(ms);
        if (content && changedAt !== null && perf.lag.length < 4000) perf.lag.push(t - changedAt + ms);
      }
      if (content) changedAt = null;
    }
    const t1 = process.hrtime.bigint();
    let changed = false;
    try { changed = hb.compose(lg, t); } catch (e) {
      perf.errors += 1;
      perf.lastError = String(e?.stack ?? e?.message ?? e).split('\n').slice(0, 3).join(' | ').slice(0, 300);
    }
    lg.setTransform(1, 0, 0, 1, 0, 0);
    if (changed) {
      perf.composes += 1;
      if (perf.cms.length < 4000) perf.cms.push(Number(process.hrtime.bigint() - t1) / 1e6);
      unwritten = true;
    }
    frames += 1;
    return canvas;
  }

  const api = {
    width: W, height: H + T, over: T, fps, file: o.file ?? null, design,
    /** New lines from the agent ({k, t, say, words, of, ms, n, why, ak, tool, steps, c, s, pre, pt, pts}). */
    push(lines) {
      bump();
      for (const l of lines ?? []) {
        if (!l || typeof l.t !== 'string') continue;
        // sheltered from the step or the body's own action that closed it in, until the next play call or a death
        if (l.shut) { const gs0 = gameS(), ago = Number.isFinite(l.ago) ? l.ago : 0; sheltered = { gs: gs0 === null ? null : Math.max(0, gs0 - ago) }; }
        if ((l.k === 'call' && PLAY.test(l.tool ?? (/^> ([a-z_]+)/.exec(l.t)?.[1] ?? ''))) || (l.k === 'fail' && /^death\b/i.test(l.t))) sheltered = null;
        if (l.k === 'call') addCall(l);
        else if (l.k === 'ok' || l.k === 'fail' || (l.k === 'info' && /^skip\b/.test(l.t))) {
          if (l.k === 'fail' && /^death\b/i.test(l.t)) {
            const ago = Number.isFinite(l.ago) ? l.ago : 0, gs0 = gameS();
            events.unshift({ kind: 'death', text: `died (${reflexGist(l.t.replace(/^death:\s*(?:died:\s*)?/i, ''))})`, at: now() - ago * 1000, gs: gs0 === null ? null : Math.max(0, gs0 - ago) });
            events.sort((a, z) => z.at - a.at);
            continue;
          }
          result(l);
        } else if (l.k === 'reflex' || l.k === 'body') {
          // stamped when it happened (ago: the seconds before it was sent), kept newest first
          const r = actionGist(l.t);
          const ago = Number.isFinite(l.ago) ? l.ago : 0;
          const gs0 = gameS();
          const byRule = l.src === 'rule' ? { src: 'rule', rule: l.rule ?? null, rs: Number.isFinite(l.rs) ? l.rs : null, rc: Number.isFinite(l.rc) ? l.rc : null, rv: l.rv ?? null } : {};
          if (events[0]?.text !== r) events.unshift({ kind: l.k, text: r, at: now() - ago * 1000, gs: gs0 === null ? null : Math.max(0, gs0 - ago), ...byRule });
          events.sort((a, z) => z.at - a.at);
          events = events.slice(0, 12);
        } else if (l.k === 'reply') {
          // the server's answer to a call (its first line), by the call's number
          const c = Number.isInteger(l.rid) ? calls.find((x) => x.rid === l.rid) : null;
          if (c) Object.assign(c, { reply: l.t, replyGs: gameS(), replyCode: l.code ?? null });
        } else if (l.k === 'world') {
          world.unshift({ kind: 'world', who: l.who ?? 'body', text: l.t, at: now(), gs: gameS() });
          world = world.slice(0, 40);
        } else if (l.k === 'milestone') {
          toast = { text: milestoneWords(l.t).replace(/^Got /, ''), at: now() };
          landmarks.unshift({ kind: 'milestone', text: l.t.replace(/\s+at \d+:\d\d$/, ''), at: now(), gs: gameS() });
          landmarks = landmarks.slice(0, 20);
          const m = /at (\d+):(\d\d)$/.exec(l.t);
          const k = LINE_GOALS.find(([re]) => re.test(l.t))?.[1];
          if (k && !reachedLocal.has(k)) reachedLocal.set(k, m ? Number(m[1]) * 60 + Number(m[2]) : Math.round(gameS() ?? 0));
        } else if (l.k === 'checked') {
          const g2 = calls.find((x) => x.tool === 'get_state' && !x.checked);
          if (g2) g2.checked = l.t.replace(/^Muse checked:\s*/i, '');
        } else if (l.k === 'follow') follow = { text: l.t, ok: Boolean(l.ok) || /^Followed/.test(l.t), at: now(), gs: gameS() };
        else if (l.k === 'advice') {
          const k = l.ak ?? 'note';
          const text = l.t.replace(/^advice:\s*/i, '').replace(/\s*\(time -?\d+\)/g, '');
          const old = advice.get(k);
          const shape = text.replace(/\d+/g, '#');
          advice.set(k, { text, gist: adviceGist(text), shape, sev: old?.sev ?? 1, at: old?.shape === shape ? old.at : now(), gs: old?.shape === shape ? old.gs : gameS() });
        } else if (l.k === 'info' && /^game over/i.test(l.t)) over = capital(l.t);
      }
    },
    /** The status numbers (st) for the header. */
    status(text, data) {
      if (!data) return;
      bump();
      if (Number.isFinite(data.ticks)) {
        const t = now();
        let rate = anchor?.rate ?? 0.02;
        if (anchor && t - anchor.at > 1_500) rate = Math.min(0.03, Math.max(0, ((((data.ticks - anchor.ticks) % 24_000) + 24_000) % 24_000) / (t - anchor.at)));
        anchor = { ticks: data.ticks, at: t, rate };
      }
      for (const k of ['hp', 'food', 'clock', 'muse', 'reflex', 'pct', 'rule', 'body', 'dpct']) {
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
        const old = advice.get(k);
        const text = String(a.t).replace(/\s*\(time -?\d+\)/g, ''); // "Night (time 13608): ...": the ticks are for Muse, not the viewers
        const shape = text.replace(/\d+/g, '#'); // the same advice with its numbers moved on keeps the time it was given
        advice.set(k, { kind: k, text, gist: adviceGist(text), shape, sev: a.sev ?? 1, at: old?.shape === shape ? old.at : now(), gs: old?.shape === shape ? old.gs : gameS() });
      }
      for (const k of [...advice.keys()]) if (!seen.has(k)) advice.delete(k);
    },
    /** The body's caption is not needed: its sub-steps say more. */
    caption() {},
    /** An update from the agent: lines, status numbers, the advice, what is happening, the body's sub-step, the HUD's state. */
    term(u) {
      if (!u) return;
      if (u.game && typeof u.game === 'object') game = { id: u.game.id ?? game?.id ?? '', s: Number.isFinite(u.game.s) ? u.game.s : game?.s, at: now() };
      if (Array.isArray(u.rules)) {
        // Muse's rules: a change after the first (start_game's) is a toast
        const sig = (rs) => JSON.stringify((rs ?? []).filter((r) => r.on).map((r) => [r.n, r.v ?? null]).sort());
        if (rules && sig(rules) !== sig(u.rules)) rulesToast = { title: rulesWords(u.rules), at: now() };
        rules = u.rules;
      }
      if (u.goal && Array.isArray(u.goal.list)) {
        // another goal than the one shown (set_goal): lit for a while, and a toast
        const sig = (x) => (x ? `${x.key}|${x.title}|${x.text ?? ''}` : '');
        if (goal && sig(goal) !== sig(u.goal)) { newGoalAt = now(); prevGoal = goal; }
        goal = u.goal;
      }
      bump();
      if (Number.isInteger(u.bind) && !calls.some((x) => x.no === u.bind)) bind(calls.find((x) => PLAY.test(x.tool) && x.no === null), u.bind);
      if (Number.isInteger(u.bind) && Array.isArray(u.added)) { const c = calls.find((x) => x.no === u.bind); if (c) c.added = u.added; }
      if (typeof u.caller === 'string' && u.caller) caller = u.caller;
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
            if (cur && cur.state === 'queued') { cur.state = 'run'; cur.startAt = live.s === 1 ? c.at : now(); } // the first step began with the call
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
      bump();
      calls = []; events = []; thoughts = []; world = []; landmarks = []; callTotal = 0; sheltered = null; playSeq = 0;
      hb?.reset();
      sub = null; live = null; follow = null; toast = null; rules = null; rulesToast = null; anchor = null; game = null; goal = null; prevGoal = null; inv = null; pos = null; over = null; newGoalAt = null;
      caller = 'MUSE';
      advice.clear();
      reachedLocal.clear();
      for (const k of Object.keys(st)) st[k] = k === 'clock' ? '' : null;
      if (note) over = capital(note);
      lastEventAt = now();
    },


    /**
     * One frame at time t (ms): the HUD drawn again when its content changed (at once, at most every 150 ms) or a
     * second went by (its clocks, the progress, the stats), else the last drawing as it is.
     */
    render(t = now()) {
      if (hb) return renderB(t);
      const timed = `${Math.floor(t / 1000)}|${newGoalAt !== null && t - newGoalAt < NEW_GOAL_MS}|${toast && t - toast.at < 6_000}|${rulesToast && t - rulesToast.at < 6_000}`;
      let state = null, sig = null, content = false;
      let draw = timed !== drawnKey;
      if (!draw && version !== seenVersion && t - lastDrawAt >= MIN_DRAW_GAP_MS) {
        seenVersion = version;
        state = hudState(t);
        sig = hudSig(state);
        draw = content = sig !== drawnSig;
        if (!draw && changedAt !== null) changedAt = null; // only what moves with the clock: the next second shows it
      }
      if (draw) {
        state ??= hudState(t);
        sig ??= hudSig(state);
        const t0 = process.hrtime.bigint();
        lg.setTransform(1, 0, 0, 1, 0, 0);
        lg.clearRect(0, 0, W, H + T);
        lg.setTransform(s, 0, 0, s, 0, -top * s);
        // a drawing that throws must not freeze the HUD (g0a414c: it stood at 1:29 for the rest of the game); counted
        // and told in stream_stats
        let r;
        try { r = drawHud(lg, state, { icon: iconAt, qa: Boolean(o.qa) }); } catch (e) {
          perf.errors += 1;
          perf.lastError = String(e?.stack ?? e?.message ?? e).split('\n').slice(0, 3).join(' | ').slice(0, 300);
          r = { layout: lastLayout, qa: lastQa, searches: perf.searches };
        }
        lg.setTransform(1, 0, 0, 1, 0, 0);
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        lastLayout = r.layout;
        lastQa = r.qa;
        perf.draws += 1;
        perf.searches = r.searches; // so far (src/hud.js counts them)
        if (perf.ms.length < 4000) perf.ms.push(ms);
        if (content && changedAt !== null && perf.lag.length < 4000) perf.lag.push(t - changedAt + ms); // input to drawing done
        changedAt = null;
        drawnKey = timed;
        drawnSig = sig;
        seenVersion = version;
        lastDrawAt = t;
        unwritten = true;
      }
      frames += 1;
      return canvas;
    },
    /** The frame as an uncompressed 32-bit BMP (top-down, with alpha), or written over the panel file. */
    bmp(t = now()) {
      api.render(t);
      return Buffer.concat([bmpHeader, canvas.toBuffer('raw')]);
    },
    /** The frame into the panel file, when it was drawn again (ffmpeg shows the last one meanwhile). */
    write(t = now()) {
      if (!api.file) return;
      api.render(t);
      if (!unwritten) return;
      unwritten = false;
      perf.writes += 1;
      const tmp = `${api.file}.tmp`;
      const fd = fs.openSync(tmp, 'w');
      try { fs.writeSync(fd, bmpHeader); fs.writeSync(fd, canvas.toBuffer('raw')); } finally { fs.closeSync(fd); }
      fs.renameSync(tmp, api.file); // ffmpeg never reads half a frame
    },
    /** Frames at fps until stop(). */
    start() {
      if (timer || !api.file) return;
      api.write();
      perf.lastTick = Date.now();
      timer = setInterval(() => {
        const t = Date.now();
        perf.ticks += 1;
        perf.gapMax = Math.max(perf.gapMax, t - perf.lastTick);
        perf.lastTick = t;
        try { api.write(); } catch { /* the video goes on with the last frame */ }
      }, 1000 / fps);
      timer.unref?.();
    },
    stop() { clearInterval(timer); timer = null; },
    get frames() { return frames; },
    /** The game's age now in seconds (for the recording's timeline), or null. */
    get gameS() { return gameS(); },
    /**
     * Since the last call: drawings, files written, layout searches so far, the drawing's time and the lag from an input
     * to its drawing (ms: p50, p99, max), the frame clock's ticks and its longest gap (a busy CPU shows there).
     */
    perf() {
      const q = (a) => {
        if (!a.length) return null;
        const v = [...a].sort((x, y) => x - y), at = (p) => Math.round(v[Math.min(v.length - 1, Math.floor(p * v.length))] * 10) / 10;
        return { p50: at(0.5), p99: at(0.99), max: at(1) };
      };
      const out = { draws: perf.draws, writes: perf.writes, searches: perf.searches - perf.searchBase, drawMs: q(perf.ms), lagMs: q(perf.lag), ticks: perf.ticks, tickGapMaxMs: perf.gapMax, ...(perf.errors ? { errors: perf.errors, lastError: perf.lastError } : {}),
        ...(hb ? { design: 'b', composes: perf.composes, composeMs: q(perf.cms) } : {}) };
      Object.assign(perf, { draws: 0, writes: 0, ms: [], lag: [], ticks: 0, gapMax: 0, searchBase: perf.searches, errors: 0, lastError: null, composes: 0, cms: [] });
      return out;
    },
    /** The HUD state as drawn (the design's data shape), its layout and its QA. */
    hud: (t = now()) => (hb ? { state: hudState(t), layout: null, qa: hb.qa, model: hb.model, plan: hb.plan } : { state: hudState(t), layout: lastLayout, qa: lastQa }),
    state: () => {
      const cur = current();
      return {
        calls: calls.map((c) => ({ tool: c.tool, say: c.say, words: c.words, plan: c.plan, raw: c.raw, reply: c.reply, replyCode: c.replyCode, no: c.no, state: c.state, checked: c.checked, added: c.added, steps: c.steps.map((x) => ({ say: x.say, raw: x.raw, skill: x.skill, args: x.args, state: x.state, ms: x.ms, why: x.why, result: x.result })) })),
        current: cur ? { tool: cur.tool, no: cur.no, states: stepStates(cur) } : null,
        thoughts: thoughts.map((x) => ({ text: x.text, call: x.call })),
        events: events.map((e) => ({ kind: e.kind, text: e.text })),
        sub, follow: follow?.text ?? null, advice: [...advice.entries()].map(([k, a]) => ({ k, text: a.gist, full: a.text, sev: a.sev })),
        toast: toast && now() - toast.at < 6_000 ? toast.text : null, st: { ...st }, clock: clockNow(), status: running() ? null : statusWords(now()),
        plan: latestPlan()?.plan ?? null, caller, layout: lastLayout,
        goal: goalNow(), newGoal: newGoalAt !== null && now() - newGoalAt < NEW_GOAL_MS, prevGoal, inv, pos, game: game ? { id: game.id, s: gameS() === null ? null : Math.floor(gameS()) } : null,
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
