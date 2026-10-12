// src/ui-panel.js - the panel under the game in the live video (STREAM_LAYOUT=ui, the camera's side): Muse, our own
// mascot, acts out what the player does (it points when a call comes in, digs while a skill runs, cheers at a result or
// a milestone, worries at advice or low health, flinches at a reflex, fans itself in the Nether), a speech bubble says
// the current command in plain words with a result chip, the last commands fade upward above it, the Body advice sits in
// note cards (one per kind, updated in place), reflexes as small tags, and a status row (health, food, the time of day or
// the Nether, how much of the game Muse played itself).
//
// Drawn with node-canvas at the stream's frame rate (30 a second): the mascot's poses are pre-rendered sprites
// (assets/muse-ui, see CREDITS.txt) cross-faded with a gentle bob and blinks; text cards are drawn into their own small
// canvases only when they change, so a frame is a few image copies. Each frame is written as an uncompressed BMP and
// renamed over the panel file, which ffmpeg reads again for every frame of the video (src/stream.js): no encoding here,
// none to decode there. Every text was cleaned by the agent and again by the service (src/terminal.js).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const UI_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'muse-ui');
export const POSES = Object.freeze(['idle', 'thinking', 'working', 'commanding', 'cheering', 'worried', 'hurt', 'nether']);
const BLINK = { idle: 'idle_blink', thinking: 'thinking_blink', working: 'working_blink', nether: 'nether_blink' };
const ICONS = ['heart', 'food', 'sun', 'moon', 'flame', 'shield', 'bulb', 'star'];
export const UI_COLORS = Object.freeze({
  bg0: '#171d2b', bg1: '#0e121a', rule: '#2e3a58', card: '#1e2638', edge: '#303c5a', bubble: '#f6f4ef', ink: '#1b2030',
  text: '#f3f1ec', soft: '#aeb6ca', muted: '#737d96', muse: '#a596ff', ok: '#4fcf96', fail: '#ff7a6b', advice: '#f6bf52',
  reflex: '#6cb8ff', gold: '#ffd25e',
});
const FAMILY = 'MuseUI';
/** Calls that are not a command for the bubble (Muse looking, the live view itself). */
const QUIET = /^> (?:get_state|live_view)\b/;

const ease = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** A rounded rectangle path. */
function rounded(g, x, y, w, h, r) {
  const k = Math.min(r, h / 2, w / 2);
  g.beginPath();
  g.moveTo(x + k, y);
  g.arcTo(x + w, y, x + w, y + h, k);
  g.arcTo(x + w, y + h, x, y + h, k);
  g.arcTo(x, y + h, x, y, k);
  g.arcTo(x, y, x + w, y, k);
  g.closePath();
}

/** Words wrapped to maxW, at most maxLines (the last one cut with "..."). */
function wrap(g, text, maxW, maxLines) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width <= maxW || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`;
    while (last.length > 1 && g.measureText(`${last}...`).width > maxW) last = last.slice(0, -1).trimEnd();
    kept[maxLines - 1] = `${last}...`;
    return kept;
  }
  return lines.map((l) => {
    let t = l;
    while (t.length > 1 && g.measureText(t).width > maxW) t = t.slice(0, -1);
    return t === l ? l : `${t.trimEnd()}...`;
  });
}

/** The advice in a few words: "night: no closed shelter around you, no shield". */
export function adviceGist(text) {
  return String(text ?? '').replace(/^advice:\s*/i, '').replace(/\s*\((?:time|at) [^)]*\)/g, '').split(/;\s*/)[0].trim();
}

/** "defending itself (zombie), then back to collecting" -> "defending itself". */
const tagGist = (text) => String(text ?? '').replace(/^(?:reflex|body|Reflex|Body):\s*/, '').split(/[,(;]/)[0].trim();

/**
 * @param {object} o
 * @param {number} o.width            the panel's size (the frame's width, its height under the game)
 * @param {number} o.height
 * @param {string} [o.file]           where each frame goes (an uncompressed BMP, replaced by renaming)
 * @param {number} [o.fps]            frames a second written by start() (30)
 * @param {string} [o.assets]         the sprites, icons and fonts (assets/muse-ui)
 * @param {() => number} [o.now]
 */
export function createUiPanel(o) {
  const { createCanvas, Image, registerFont } = require('canvas');
  const assets = o.assets ?? UI_ASSETS;
  const now = o.now ?? Date.now;
  const W = o.width;
  const H = o.height;
  const s = W / 1080; // the design is drawn for 1080 wide
  const fps = o.fps ?? 30;
  if (!createUiPanel.fonts) {
    createUiPanel.fonts = true;
    for (const [file, weight] of [['Inter-Medium.ttf', '500'], ['Inter-SemiBold.ttf', '600'], ['Inter-Bold.ttf', '700']]) {
      try { registerFont(path.join(assets, 'fonts', file), { family: FAMILY, weight }); } catch { /* the default sans-serif then */ }
    }
  }
  const font = (weight, px) => `${weight} ${Math.round(px * s)}px ${FAMILY}`;
  const load = (p) => { const im = new Image(); im.src = fs.readFileSync(p); return im; };
  /** An image drawn once at the size it is used at (no scaling per frame). */
  const sized = (im, w, h) => { const c = createCanvas(Math.round(w), Math.round(h)); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); return c; };

  // ----- assets
  const MS = Math.round(300 * s); // the mascot's sprite size
  const sprites = {};
  for (const n of [...POSES, ...Object.values(BLINK)]) sprites[n] = sized(load(path.join(assets, 'sprites', `${n}.png`)), MS, MS);
  const icons = {};
  const IS = Math.round(34 * s);
  for (const n of ICONS) icons[n] = sized(load(path.join(assets, 'icons', `${n}.png`)), IS, IS);
  const small = {};
  const SS = Math.round(26 * s);
  for (const n of ['bulb', 'shield', 'star']) small[n] = sized(load(path.join(assets, 'icons', `${n}.png`)), SS, SS);

  // ----- the frame and its static background
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  const bg = createCanvas(W, H);
  {
    const b = bg.getContext('2d');
    const grad = b.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, UI_COLORS.bg0);
    grad.addColorStop(1, UI_COLORS.bg1);
    b.fillStyle = grad;
    b.fillRect(0, 0, W, H);
    b.fillStyle = UI_COLORS.rule;
    b.fillRect(0, 0, W, Math.max(1, Math.round(2 * s)));
    // the mascot's floor: a soft light under it
    const fl = b.createRadialGradient(170 * s, H - 14 * s, 4 * s, 170 * s, H - 14 * s, 150 * s);
    fl.addColorStop(0, 'rgba(165,150,255,0.20)');
    fl.addColorStop(1, 'rgba(165,150,255,0)');
    b.fillStyle = fl;
    b.fillRect(0, H - 120 * s, 360 * s, 120 * s);
  }
  const shadow = createCanvas(Math.round(170 * s), Math.round(30 * s));
  {
    const b = shadow.getContext('2d');
    const r = b.createRadialGradient(shadow.width / 2, shadow.height / 2, 2, shadow.width / 2, shadow.height / 2, shadow.width / 2);
    r.addColorStop(0, 'rgba(0,0,0,0.45)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    b.fillStyle = r;
    b.save();
    b.scale(1, shadow.height / shadow.width);
    b.beginPath();
    b.arc(shadow.width / 2, shadow.width / 2, shadow.width / 2, 0, Math.PI * 2);
    b.fill();
    b.restore();
  }

  // ----- what is shown
  const st = { hp: null, food: null, clock: '', muse: null, reflex: null, pct: null };
  let statusCard = null;
  let current = null; // {say, chip: {kind, text}, progress, at, msSum, card}
  let history = []; // [{say, chip, card}] newest first, at most 3
  let shiftAt = -1e9; // when the history last moved up
  const cards = new Map(); // advice kind -> {t, sev, at, flashAt, card}
  let milestone = null; // {t, at, card}
  let tags = []; // [{t, at, card}]
  let working = false;
  let workingSince = 0;
  let lastActivity = -1e9;
  let started = false; // a command came: thinking, not idle, between commands
  let transient = { pose: null, until: 0 };
  let pose = 'idle';
  let prevPose = 'idle';
  let poseAt = -1e9;
  let nextBlink = now() + 2500;
  let lastHp = null;
  let hurtAt = -1e9;
  let frames = 0;
  let timer = null;

  const act = (p, ms) => { transient = { pose: p, until: now() + ms }; };
  const nether = () => st.clock === 'NETHER';

  // ----- cards (drawn on change)
  function drawStatus() {
    const c = createCanvas(W, Math.round(64 * s));
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    const y = c.height / 2;
    let x = 24 * s;
    const item = (icon, text, color = UI_COLORS.text) => {
      b.drawImage(icons[icon], x, y - IS / 2);
      x += IS + 10 * s;
      b.font = font(700, 30);
      b.fillStyle = color;
      b.fillText(text, x, y + 1 * s);
      x += b.measureText(text).width + 30 * s;
    };
    const hp = Number.isFinite(st.hp) ? `${st.hp}/20` : '--';
    item('heart', hp, Number.isFinite(st.hp) && st.hp <= 6 ? UI_COLORS.fail : UI_COLORS.text);
    item('food', Number.isFinite(st.food) ? `${st.food}/20` : '--', Number.isFinite(st.food) && st.food <= 6 ? UI_COLORS.advice : UI_COLORS.text);
    if (st.clock === 'NETHER') item('flame', 'Nether', '#ffb08a');
    else if (st.clock === 'END') item('star', 'The End');
    else if (st.clock) item(st.clock.startsWith('NIGHT') ? 'moon' : 'sun', st.clock.replace(/^(?:DAY|NIGHT) /, ''));
    // who played: "Muse" and a slim meter of its share
    const pct = Number.isFinite(st.pct) ? st.pct : Number.isFinite(st.muse) && Number.isFinite(st.reflex) && st.muse + st.reflex > 0 ? Math.round((100 * st.muse) / (st.muse + st.reflex)) : null;
    if (pct !== null) {
      const right = W - 24 * s;
      b.font = font(700, 28);
      const pctText = `${pct}%`;
      const pw = b.measureText(pctText).width;
      b.fillStyle = UI_COLORS.muse;
      b.fillText(pctText, right - pw, y + 1 * s);
      const mw = 150 * s;
      const mx = right - pw - 14 * s - mw;
      rounded(b, mx, y - 5 * s, mw, 10 * s, 5 * s);
      b.fillStyle = '#2a3350';
      b.fill();
      rounded(b, mx, y - 5 * s, Math.max(10 * s, (mw * pct) / 100), 10 * s, 5 * s);
      b.fillStyle = UI_COLORS.muse;
      b.fill();
      b.font = font(600, 26);
      const label = 'Muse';
      b.fillStyle = UI_COLORS.soft;
      b.fillText(label, mx - 12 * s - b.measureText(label).width, y + 1 * s);
    }
    statusCard = c;
  }

  const BX = 300 * s; // the bubbles' left edge
  const BW = 446 * s; // their width
  function drawBubble(cmd) {
    const pad = 22 * s;
    const meas = createCanvas(4, 4).getContext('2d');
    // as large as two lines allow: 40, else 34, else 30 px (cut with "..." only then)
    let size = 40;
    let lines = [];
    for (size of [40, 34, 30]) {
      meas.font = font(700, size);
      lines = wrap(meas, cmd.say, BW - 2 * pad, 2);
      if (!lines.at(-1)?.endsWith('...') && (lines.length === 1 || size < 40)) break;
    }
    const lh = size * 1.22 * s;
    const prog = cmd.progress && !cmd.chip?.final ? cmd.progress : '';
    const chipH = 40 * s;
    const h = pad + lines.length * lh + (prog ? 34 * s : 0) + 12 * s + chipH + pad * 0.8;
    const c = createCanvas(Math.round(BW + 18 * s), Math.round(h));
    const b = c.getContext('2d');
    const x0 = 18 * s; // room for the tail
    rounded(b, x0, 0, BW, h, 22 * s);
    b.fillStyle = UI_COLORS.bubble;
    b.fill();
    // the tail, toward Muse
    b.beginPath();
    b.moveTo(x0 + 2 * s, 30 * s);
    b.lineTo(0, 48 * s);
    b.lineTo(x0 + 2 * s, 60 * s);
    b.closePath();
    b.fill();
    b.textBaseline = 'alphabetic';
    b.fillStyle = UI_COLORS.ink;
    b.font = font(700, size);
    lines.forEach((l, i) => b.fillText(l, x0 + pad, pad + (i + 0.8) * lh));
    let y = pad + lines.length * lh;
    if (prog) {
      b.font = font(500, 25);
      b.fillStyle = '#5b6274';
      b.fillText(wrap(b, prog, BW - 2 * pad, 1)[0] ?? '', x0 + pad, y + 26 * s);
      y += 34 * s;
    }
    y += 12 * s;
    const chip = cmd.chip ?? { kind: 'run', text: 'on it' };
    const color = chip.kind === 'ok' ? UI_COLORS.ok : chip.kind === 'fail' ? UI_COLORS.fail : chip.kind === 'info' ? UI_COLORS.muted : UI_COLORS.muse;
    b.font = font(700, 24);
    const text = wrap(b, chip.text, BW - 2 * pad - 30 * s, 1)[0] ?? '';
    const cw = b.measureText(text).width + 40 * s;
    rounded(b, x0 + pad, y, cw, chipH, chipH / 2);
    b.fillStyle = color;
    b.fill();
    b.fillStyle = chip.kind === 'info' ? '#ffffff' : '#10141c';
    b.textBaseline = 'middle';
    b.fillText(text, x0 + pad + 20 * s, y + chipH / 2 + 1 * s);
    return c;
  }

  function drawPill(cmd) {
    const meas = createCanvas(4, 4).getContext('2d');
    meas.font = font(600, 25);
    const dot = 12 * s;
    const text = wrap(meas, cmd.say, BW - 70 * s, 1)[0] ?? '';
    const w = Math.min(BW, meas.measureText(text).width + 64 * s);
    const h = 46 * s;
    const c = createCanvas(Math.round(w), Math.round(h));
    const b = c.getContext('2d');
    rounded(b, 0, 0, w, h, h / 2);
    b.fillStyle = UI_COLORS.card;
    b.fill();
    b.strokeStyle = UI_COLORS.edge;
    b.lineWidth = 2 * s;
    b.stroke();
    b.beginPath();
    b.arc(22 * s, h / 2, dot / 2, 0, Math.PI * 2);
    b.fillStyle = cmd.chip?.kind === 'ok' ? UI_COLORS.ok : cmd.chip?.kind === 'fail' ? UI_COLORS.fail : UI_COLORS.muted;
    b.fill();
    b.font = font(600, 25);
    b.fillStyle = UI_COLORS.soft;
    b.textBaseline = 'middle';
    b.fillText(text, 40 * s, h / 2 + 1 * s);
    return c;
  }

  const CX = 772 * s; // the right column
  const CW = W - CX - 20 * s;
  function drawNote(text, color, icon, { bold = false, maxLines = 4 } = {}) {
    const meas = createCanvas(4, 4).getContext('2d');
    meas.font = font(bold ? 700 : 600, 22);
    const lines = wrap(meas, text, CW - 66 * s, maxLines);
    const lh = 27 * s;
    const h = Math.max(54 * s, 22 * s + lines.length * lh);
    const c = createCanvas(Math.round(CW), Math.round(h));
    const b = c.getContext('2d');
    rounded(b, 0, 0, CW, h, 16 * s);
    b.fillStyle = UI_COLORS.card;
    b.fill();
    b.strokeStyle = color;
    b.globalAlpha = 0.55;
    b.lineWidth = 2 * s;
    b.stroke();
    b.globalAlpha = 1;
    rounded(b, 0, 0, 7 * s, h, 3 * s);
    b.fillStyle = color;
    b.fill();
    b.drawImage(small[icon], 18 * s, 13 * s);
    b.font = font(bold ? 700 : 600, 22);
    b.fillStyle = UI_COLORS.text;
    b.textBaseline = 'alphabetic';
    lines.forEach((l, i) => b.fillText(l, 54 * s, 11 * s + (i + 0.82) * lh));
    return c;
  }

  function drawTag(text) {
    const meas = createCanvas(4, 4).getContext('2d');
    meas.font = font(600, 21);
    const t = wrap(meas, text, CW - 60 * s, 1)[0] ?? '';
    const h = 38 * s;
    const w = Math.min(CW, meas.measureText(t).width + 56 * s);
    const c = createCanvas(Math.round(w), Math.round(h));
    const b = c.getContext('2d');
    rounded(b, 0, 0, w, h, h / 2);
    b.fillStyle = 'rgba(108,184,255,0.16)';
    b.fill();
    b.strokeStyle = UI_COLORS.reflex;
    b.lineWidth = 1.5 * s;
    b.stroke();
    b.drawImage(small.shield, 8 * s, (h - SS) / 2);
    b.font = font(600, 21);
    b.fillStyle = '#cfe6ff';
    b.textBaseline = 'middle';
    b.fillText(t, 42 * s, h / 2 + 1 * s);
    return c;
  }

  // ----- the inputs
  function newCommand(say) {
    const t = now();
    if (current) {
      history.unshift({ ...current, card: drawPill(current) });
      history = history.slice(0, 3);
      shiftAt = t;
    }
    current = { say, chip: { kind: 'run', text: 'on it' }, progress: '', at: t, msSum: 0 };
    current.card = drawBubble(current);
    working = true;
    workingSince = t;
    lastActivity = t;
    started = true;
    act('commanding', 1500);
  }

  /** A result for the command it belongs to (the current one, unless its words match an earlier one). */
  function result(l) {
    const say = String(l.say ?? '').toLowerCase();
    let cmd = current;
    if (say && current && !current.say.toLowerCase().includes(say)) cmd = history.find((h) => h.say.toLowerCase().includes(say)) ?? current;
    if (!cmd) return;
    const multi = Number.isInteger(l.of) && l.of > 1;
    if (Number.isFinite(l.ms)) cmd.msSum = (cmd.msSum ?? 0) + l.ms;
    const secs = (ms) => (ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${Math.max(0.1, Math.round(ms / 100) / 10)} s`);
    if (l.k === 'ok') {
      const last = !multi || l.n >= l.of;
      cmd.chip = last
        ? { kind: 'ok', final: true, text: cmd.msSum > 0 ? `done in ${secs(cmd.msSum)}` : 'done' }
        : { kind: 'run', text: `step ${l.n} of ${l.of} done` };
      if (last && cmd === current) { working = false; act('cheering', 1700); }
    } else {
      const why = l.why || String(l.t ?? '').replace(/^FAIL\s*/, '');
      cmd.chip = { kind: 'fail', final: true, text: `failed: ${why}` };
      if (cmd === current) { working = false; act(/^death/i.test(l.t) ? 'hurt' : 'worried', 1800); }
    }
    if (cmd === current) current.card = drawBubble(current);
    else cmd.card = drawPill(cmd);
    lastActivity = now();
  }

  function upsertAdvice(list) {
    const t = now();
    const seen = new Set();
    let flash = false;
    for (const a of list) {
      const k = a.k ?? a.ak ?? 'note';
      seen.add(k);
      const text = adviceGist(a.t);
      const old = cards.get(k);
      const sev = a.sev ?? 1;
      const isNew = !old;
      const rises = old && sev > old.sev;
      if (old && old.text === text && old.sev === sev) continue;
      cards.set(k, { text, sev, at: old?.at ?? t, flashAt: isNew || rises ? t : old?.flashAt ?? -1e9, card: drawNote(text, sev >= 3 ? UI_COLORS.fail : UI_COLORS.advice, 'bulb') });
      if (isNew || rises) flash = true;
    }
    return { seen, flash };
  }

  const api = {
    width: W, height: H, fps, file: o.file ?? null,
    /** New lines from the agent ({k, t, say, ms, n, of, why, ak}). */
    push(lines) {
      for (const l of lines ?? []) {
        if (!l || typeof l.t !== 'string') continue;
        if (l.k === 'call') {
          if (QUIET.test(l.t)) { lastActivity = now(); if (!working && started) act('thinking', 1200); continue; }
          newCommand(l.say || l.t.replace(/^>\s*/, ''));
        } else if (l.k === 'ok' || l.k === 'fail') {
          if (l.k === 'fail' && /^death\b/i.test(l.t)) { hurtAt = now(); act('hurt', 2000); tags.unshift({ t: tagGist(l.t), at: now(), card: drawTag(tagGist(l.t)) }); }
          result(l);
        } else if (l.k === 'advice') {
          // an agent without the advice list: one card per kind from the lines
          const { flash } = upsertAdvice([{ k: l.ak ?? 'note', t: l.t, sev: 1 }]);
          if (flash) act('worried', 1600);
        } else if (l.k === 'reflex' || l.k === 'body') {
          const t = tagGist(l.t);
          if (!tags.some((x) => x.t === t && now() - x.at < 10_000)) tags.unshift({ t, at: now(), card: drawTag(t) });
          tags = tags.slice(0, 3);
          if (l.k === 'reflex') act('hurt', 1200);
        } else if (l.k === 'milestone') {
          const t = l.t.replace(/^milestone:\s*/i, '').replace(/\s+at \d+:\d\d$/, '');
          milestone = { t, at: now(), card: drawNote(t[0].toUpperCase() + t.slice(1), UI_COLORS.gold, 'star', { bold: true }) };
          act('cheering', 2000);
        } else if (l.k === 'info' && /^game over/i.test(l.t)) {
          newCommand(l.t[0].toUpperCase() + l.t.slice(1));
          current.chip = { kind: 'info', final: true, text: 'thanks for watching' };
          current.card = drawBubble(current);
          working = false;
          started = false;
        }
      }
    },
    /** The status: the numbers (st) when the agent sends them; the text alone says too little to draw. */
    status(text, data) {
      if (!data) return;
      let changed = false;
      for (const k of ['hp', 'food', 'clock', 'muse', 'reflex', 'pct']) {
        const v = data[k] ?? null;
        if (v !== null && v !== st[k]) { st[k] = v; changed = true; }
      }
      if (Number.isFinite(st.hp) && Number.isFinite(lastHp) && st.hp < lastHp) { hurtAt = now(); act('hurt', 1200); }
      if (Number.isFinite(st.hp)) lastHp = st.hp;
      if (changed || !statusCard) drawStatus();
    },
    /** The Body advice as it stands: one card per kind, updated in place; a kind gone is dropped. */
    advice(list) {
      if (!Array.isArray(list)) return;
      const { seen, flash } = upsertAdvice(list);
      for (const k of [...cards.keys()]) if (!seen.has(k)) cards.delete(k);
      if (flash) act('worried', 1600);
    },
    /** What the body is doing now (the caption from its skill events): the progress line of the current command. */
    caption(text) {
      const t = String(text ?? '').trim();
      if (/^Reflex:/i.test(t)) {
        const g2 = tagGist(t);
        if (g2 && !tags.some((x) => x.t === g2 && now() - x.at < 10_000)) { tags.unshift({ t: g2, at: now(), card: drawTag(g2) }); tags = tags.slice(0, 3); }
        return;
      }
      const p = t.replace(/^Muse:\s*/i, '');
      if (current && current.progress !== p && !current.chip?.final) { current.progress = p; current.card = drawBubble(current); }
    },
    /** An update from the agent: lines, status numbers, the advice. */
    term(u) {
      if (!u) return;
      if (Array.isArray(u.lines) && u.lines.length) api.push(u.lines);
      if (u.st) api.status(u.status, u.st);
      if (Array.isArray(u.adv)) api.advice(u.adv);
    },
    /** Another game on camera: an empty panel, with a note. */
    reset(note = '') {
      current = null;
      history = [];
      cards.clear();
      tags = [];
      milestone = null;
      working = false;
      started = false;
      for (const k of Object.keys(st)) st[k] = k === 'clock' ? '' : null;
      lastHp = null;
      drawStatus();
      if (note) { newCommand(note[0].toUpperCase() + note.slice(1)); current.chip = { kind: 'info', final: true, text: 'one moment' }; current.card = drawBubble(current); working = false; }
    },

    /** One frame at time t (ms). */
    render(t = now()) {
      g.globalAlpha = 1;
      g.drawImage(bg, 0, 0);
      if (!statusCard) drawStatus();
      g.drawImage(statusCard, 0, 4 * s);

      // the mascot: the pose, cross-faded over 220 ms, a bob, blinks, a hop when cheering, a shake when hurt
      if (working && t - workingSince > 180_000) working = false;
      let want = transient.until > t ? transient.pose : null;
      if (!want) {
        if (Number.isFinite(st.hp) && st.hp <= 6) want = 'worried';
        else if (working) want = 'working';
        else if (nether()) want = 'nether';
        else want = started ? 'thinking' : 'idle';
      }
      if (want !== pose) { prevPose = pose; pose = want; poseAt = t; }
      const fade = clamp01((t - poseAt) / 220);
      const sec = t / 1000;
      const period = pose === 'working' ? 0.9 : 2.6;
      let dy = Math.sin((2 * Math.PI * sec) / period) * (pose === 'working' ? 4 : 6) * s;
      let dx = 0;
      if (pose === 'cheering') dy = -Math.abs(Math.sin((Math.PI * (t - poseAt)) / 420)) * 18 * s;
      const hurtAge = t - hurtAt;
      if (pose === 'hurt' || hurtAge < 500) dx = Math.sin(hurtAge / 22) * 6 * s * (1 - clamp01(hurtAge / 600));
      if (t > nextBlink + 140) nextBlink = t + 2600 + ((frames * 7919) % 2900);
      const blinking = t >= nextBlink && t < nextBlink + 140;
      const mx = 22 * s + dx;
      const my = H - 286 * s + dy; // the feet about 16 px above the bottom
      const shadowK = 1 - Math.min(0.35, Math.max(0, -dy) / (60 * s));
      g.globalAlpha = 0.9 * shadowK;
      g.drawImage(shadow, mx - dx + 150 * s - (shadow.width * shadowK) / 2, H - 16 * s - shadow.height / 2, shadow.width * shadowK, shadow.height);
      const spriteOf = (p) => (blinking && BLINK[p] ? sprites[BLINK[p]] : sprites[p]);
      if (fade < 1) { g.globalAlpha = 1 - fade; g.drawImage(spriteOf(prevPose), mx, my); }
      g.globalAlpha = fade;
      g.drawImage(spriteOf(pose), mx, my);
      g.globalAlpha = 1;

      // the bubbles: the current command at the bottom, the earlier ones above it, moving up and fading
      const bottom = H - 18 * s;
      let top = bottom;
      if (current) {
        const pop = ease((t - current.at) / 260);
        const c = current.card;
        top = bottom - c.height;
        g.globalAlpha = pop;
        const k = 0.94 + 0.06 * pop;
        g.drawImage(c, BX - 18 * s, top + (c.height * (1 - k)) / 2 + (1 - pop) * 14 * s, c.width * k, c.height * k);
        g.globalAlpha = 1;
      }
      const moved = ease((t - shiftAt) / 420);
      let y = top - 12 * s;
      history.forEach((h, i) => {
        const c = h.card;
        const target = y - c.height;
        const from = target + (i === 0 ? c.height + 12 * s : c.height + 10 * s);
        const yy = from + (target - from) * moved;
        const alpha = [0.92, 0.6, 0.3][i] ?? 0;
        const a0 = i === 0 ? 0 : [0.92, 0.6, 0.3][i - 1];
        // under the status row only: a pill fades out as it reaches it
        const room = clamp01((yy - 66 * s) / (34 * s));
        g.globalAlpha = Math.max(0, a0 + (alpha - a0) * moved) * room;
        if (room > 0) g.drawImage(c, BX + 6 * s, yy);
        y = target - 10 * s;
      });
      g.globalAlpha = 1;

      // the right column: a milestone (6 s), the advice cards (most pressing first, at most 2), the reflex tags (8 s)
      let cy = 76 * s;
      if (milestone && t - milestone.at < 6000) {
        const age = t - milestone.at;
        g.globalAlpha = Math.min(ease(age / 250), clamp01((6000 - age) / 600));
        g.drawImage(milestone.card, CX, cy);
        g.globalAlpha = 1;
        cy += milestone.card.height + 10 * s;
      }
      const list = [...cards.values()].sort((a, b) => b.sev - a.sev || b.at - a.at).slice(0, 2);
      for (const c of list) {
        if (cy + c.card.height > H - 60 * s) break;
        const flash = t - c.flashAt;
        if (flash < 1500) {
          g.globalAlpha = 0.5 * (1 - flash / 1500);
          rounded(g, CX - 4 * s, cy - 4 * s, c.card.width + 8 * s, c.card.height + 8 * s, 20 * s);
          g.fillStyle = c.sev >= 3 ? UI_COLORS.fail : UI_COLORS.advice;
          g.fill();
          g.globalAlpha = 1;
        }
        g.drawImage(c.card, CX, cy);
        cy += c.card.height + 10 * s;
      }
      tags = tags.filter((x) => t - x.at < 8000);
      let ty = H - 18 * s;
      for (const x of tags.slice(0, 2)) {
        const age = t - x.at;
        ty -= x.card.height;
        if (ty < cy) break;
        g.globalAlpha = Math.min(ease(age / 200), clamp01((8000 - age) / 800));
        g.drawImage(x.card, CX, ty);
        ty -= 8 * s;
      }
      g.globalAlpha = 1;
      frames += 1;
      return canvas;
    },

    /** The frame as an uncompressed 32-bit BMP (top-down), or written over the panel file. */
    bmp(t = now()) {
      api.render(t);
      return Buffer.concat([header, canvas.toBuffer('raw')]);
    },
    write(t = now()) {
      if (!api.file) return;
      api.render(t);
      const tmp = `${api.file}.tmp`;
      const fd = fs.openSync(tmp, 'w');
      try { fs.writeSync(fd, header); fs.writeSync(fd, canvas.toBuffer('raw')); } finally { fs.closeSync(fd); }
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
    get pose() { return pose; },
    state: () => ({ current: current && { say: current.say, chip: current.chip, progress: current.progress }, history: history.map((h) => ({ say: h.say, chip: h.chip })), advice: [...cards.entries()].map(([k, c]) => ({ k, text: c.text, sev: c.sev })), tags: tags.map((x) => x.t), milestone: milestone?.t ?? null, st: { ...st }, working }),
  };

  const header = Buffer.alloc(54);
  header.write('BM', 0, 'ascii');
  header.writeUInt32LE(54 + W * H * 4, 2);
  header.writeUInt32LE(54, 10);
  header.writeUInt32LE(40, 14);
  header.writeInt32LE(W, 18);
  header.writeInt32LE(-H, 22); // top-down rows, as the canvas has them
  header.writeUInt16LE(1, 26);
  header.writeUInt16LE(32, 28);
  header.writeUInt32LE(0, 30);
  header.writeUInt32LE(W * H * 4, 34);
  header.writeInt32LE(2835, 38);
  header.writeInt32LE(2835, 42);
  drawStatus();
  return api;
}
