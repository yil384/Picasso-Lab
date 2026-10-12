// src/ui-panel.js - the panel under the game in the live video (STREAM_LAYOUT=ui, the camera's side), minimal: one slim
// header line (health, food, the time of day or the Nether, and how much of the game Muse played itself) and the last
// four actions as a list, newest on top: each in plain words ("Mine 3 diamond ore") with its state on the right (a
// quiet animated "running", "done 14 s", or "failed" and a few words). A reflex is a small muted row, a milestone a
// gold one. A new row slides in, the oldest fades out. No mascot, no cards, no boxes: the owner's call (2026-10-12).
//
// Drawn with node-canvas at the stream's frame rate (30 a second): every row and the header are drawn into their own
// small canvases only when they change, so a frame is a few image copies plus the running dots. Each frame is written
// as an uncompressed BMP and renamed over the panel file, which ffmpeg reads again for every frame of the video
// (src/stream.js). Every text was cleaned by the agent and again by the service (src/terminal.js).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const UI_ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'muse-ui');
const ICONS = ['heart', 'food', 'sun', 'moon', 'flame', 'star'];
export const UI_COLORS = Object.freeze({
  bg: '#10141b', rule: 'rgba(255,255,255,0.07)', text: '#f3f1ec', soft: '#a9b1c3', muted: '#6f788c', muse: '#a596ff',
  ok: '#62cf9c', fail: '#ff8474', gold: '#ffcf5c',
});
const FAMILY = 'MuseUI';
/** Calls that are not an action (Muse looking around, the live view itself). */
const QUIET = /^> (?:get_state|live_view)\b/;
const ROWS = 4; // rows shown
const ease = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/** A pill-shaped path (a slim meter). */
function pill(g, x, y, w, h) {
  const r = h / 2;
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(x + r, y + h);
  g.arc(x + r, y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
  g.closePath();
}

/** Text cut to maxW with "..." at a word when it can. */
function fit(g, text, maxW) {
  let t = String(text ?? '');
  if (g.measureText(t).width <= maxW) return t;
  while (t.length > 1 && g.measureText(`${t}...`).width > maxW) t = t.slice(0, -1);
  const word = t.lastIndexOf(' ');
  if (word > t.length * 0.6) t = t.slice(0, word);
  return `${t.trimEnd()}...`;
}

/** "defending itself (zombie), then back to collecting" -> "defending itself (zombie)". */
const reflexGist = (text) => String(text ?? '').replace(/^(?:reflex|body|Reflex|Body):\s*/, '').split(/,|;| then /)[0].trim();
/** A milestone line in words: "milestone: a wooden pickaxe at 0:41" -> "Got a wooden pickaxe"; places as they are. */
export function milestoneWords(t) {
  const s = String(t ?? '').replace(/\s+at \d+:\d\d$/, '');
  if (/^milestone:\s*/i.test(s)) return `Got ${s.replace(/^milestone:\s*/i, '')}`;
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * @param {object} o
 * @param {number} o.width            the panel's size (the frame's width, its height under the game)
 * @param {number} o.height
 * @param {string} [o.file]           where each frame goes (an uncompressed BMP, replaced by renaming)
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
  const s = W / 1080; // drawn for 1080 wide
  const fps = o.fps ?? 30;
  if (!createUiPanel.fonts) {
    createUiPanel.fonts = true;
    for (const [file, weight] of [['Inter-Medium.ttf', '500'], ['Inter-SemiBold.ttf', '600'], ['Inter-Bold.ttf', '700']]) {
      try { registerFont(path.join(assets, 'fonts', file), { family: FAMILY, weight }); } catch { /* the default sans-serif then */ }
    }
  }
  // two sizes only: the rows, and the header and the states
  const BIG = 30;
  const SMALL = 25;
  const font = (weight, px) => `${weight} ${Math.round(px * s)}px ${FAMILY}`;
  const load = (p) => { const im = new Image(); im.src = fs.readFileSync(p); return im; };
  const sized = (im, w, h) => { const c = createCanvas(Math.round(w), Math.round(h)); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, c.width, c.height); return c; };
  const IS = Math.round(28 * s);
  const icons = {};
  for (const n of ICONS) icons[n] = sized(load(path.join(assets, 'icons', `${n}.png`)), IS, IS);

  // ----- the frame and its background
  const PAD = 34 * s; // the left and right margins
  const HEAD = Math.round(58 * s); // the header line
  const ROW = (H - HEAD - 12 * s) / ROWS; // each row
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');
  const bg = createCanvas(W, H);
  {
    const b = bg.getContext('2d');
    b.fillStyle = UI_COLORS.bg;
    b.fillRect(0, 0, W, H);
    b.fillStyle = UI_COLORS.rule;
    b.fillRect(PAD, HEAD, W - 2 * PAD, Math.max(1, Math.round(1.5 * s)));
  }

  // ----- what is shown
  const st = { hp: null, food: null, clock: '', muse: null, reflex: null, pct: null };
  let header = null;
  let rows = []; // newest first: {kind: 'action'|'reflex'|'milestone'|'note', text, state: {kind, text}|null, at, msSum, card}
  let shiftAt = -1e9; // when the list last moved down
  let lastEventAt = -1e9; // the last row or result
  let live = null; // what the agent says is happening: {mode, reason, step, sinceS, dawnS, at}
  let anchor = null; // the game clock: {ticks, at, rate (ticks a ms)}, to keep it ticking between updates
  let shownClock = '';
  let statusShow = 0; // 0..1: the status line in the top slot, the rows a slot lower
  let statusCard = null;
  let statusKey = '';
  let frames = 0;
  let timer = null;

  /** The clock as it is now: the last game time moved on at the rate it was seen moving (frozen when it was not). */
  const clockNow = () => {
    if (!st.clock || st.clock === 'NETHER' || st.clock === 'END' || !anchor) return st.clock;
    const tk = (((anchor.ticks + anchor.rate * (now() - anchor.at)) % 24_000) + 24_000) % 24_000;
    const h = Math.floor(tk / 1000 + 6) % 24;
    const m = Math.floor(((tk % 1000) * 60) / 1000);
    return `${tk >= 13_000 && tk < 23_000 ? 'NIGHT' : 'DAY'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  function drawHeader() {
    shownClock = clockNow();
    const c = createCanvas(W, HEAD);
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    const y = HEAD / 2;
    let x = PAD;
    const item = (icon, text, color = UI_COLORS.text) => {
      b.drawImage(icons[icon], x, y - IS / 2);
      x += IS + 9 * s;
      b.font = font(600, SMALL);
      b.fillStyle = color;
      b.fillText(text, x, y + 1 * s);
      x += b.measureText(text).width + 34 * s;
    };
    item('heart', Number.isFinite(st.hp) ? `${st.hp}/20` : '--', Number.isFinite(st.hp) && st.hp <= 6 ? UI_COLORS.fail : UI_COLORS.text);
    item('food', Number.isFinite(st.food) ? `${st.food}/20` : '--');
    if (st.clock === 'NETHER') item('flame', 'Nether');
    else if (st.clock === 'END') item('star', 'The End');
    else if (shownClock) item(shownClock.startsWith('NIGHT') ? 'moon' : 'sun', shownClock.replace(/^(?:DAY|NIGHT) /, ''));
    const pct = Number.isFinite(st.pct) ? st.pct : Number.isFinite(st.muse) && Number.isFinite(st.reflex) && st.muse + st.reflex > 0 ? Math.round((100 * st.muse) / (st.muse + st.reflex)) : null;
    if (pct !== null) {
      const right = W - PAD;
      b.font = font(600, SMALL);
      const label = `Muse ${pct}%`;
      const lw = b.measureText(label).width;
      b.fillStyle = UI_COLORS.soft;
      b.fillText('Muse ', right - lw, y + 1 * s);
      b.fillStyle = UI_COLORS.muse;
      b.fillText(`${pct}%`, right - lw + b.measureText('Muse ').width, y + 1 * s);
      const mw = 120 * s;
      const mx = right - lw - 16 * s - mw;
      const mh = 6 * s;
      b.fillStyle = 'rgba(165,150,255,0.18)';
      pill(b, mx, y - mh / 2, mw, mh); b.fill();
      b.fillStyle = UI_COLORS.muse;
      pill(b, mx, y - mh / 2, Math.max(mh, (mw * pct) / 100), mh); b.fill();
    }
    header = c;
  }

  const STATE_W = 430 * s; // the room on the right for the state
  /** The status line between calls, drawn when its words change (the elapsed time: once a second). */
  function drawStatus(text) {
    const c = createCanvas(W, Math.round(ROW));
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    b.font = font(500, BIG);
    b.fillStyle = UI_COLORS.soft;
    b.fillText(fit(b, text, W - 2 * PAD - 30 * s), PAD + 26 * s, ROW / 2 + 1 * s);
    return c;
  }
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  /** What the top row says when nothing runs: why, and for how long (or how long until dawn). */
  function statusWords(t) {
    if (live?.mode === 'run') return live.step ? `${live.step}` : 'Working';
    const reason = live?.mode === 'idle' ? live.reason : 'waiting';
    const since = live && Number.isFinite(live.sinceS) ? live.sinceS + (t - live.at) / 1000 : Math.max(0, (t - lastEventAt) / 1000);
    if (['shelter', 'shelter_body', 'sleep'].includes(reason) && Number.isFinite(live?.dawnS)) {
      const left = live.dawnS - (anchor?.rate === 0 ? 0 : (t - live.at) / 1000);
      const dawn = left > 60 ? `night ends in ~${Math.ceil(left / 60)} min` : left > 0 ? 'night ends in under a minute' : 'morning is here';
      if (reason === 'sleep') return `Sleeping until morning \u00b7 ${dawn}`;
      return `Sheltering until morning (${reason === 'shelter' ? 'Muse\u2019s choice' : 'the body\u2019s reflex'}) \u00b7 ${dawn}`;
    }
    if (reason === 'checking') return `Muse is checking the situation \u00b7 ${mmss(since)}`;
    if (reason === 'nether') return `In the Nether, waiting for Muse\u2019s next move \u00b7 ${mmss(since)}`;
    return `Waiting for Muse\u2019s next move \u00b7 ${mmss(since)}`;
  }
  /** A row's text, drawn once (its state is drawn on its own: the running dots move). */
  function drawRow(r) {
    const c = createCanvas(W, Math.round(ROW));
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    const y = ROW / 2;
    if (r.kind === 'reflex' || r.kind === 'note') {
      b.font = font(500, SMALL);
      b.fillStyle = UI_COLORS.muted;
      b.fillText(fit(b, r.text, W - 2 * PAD - STATE_W), PAD, y);
    } else {
      b.font = font(r.kind === 'milestone' ? 700 : 600, BIG);
      b.fillStyle = r.kind === 'milestone' ? UI_COLORS.gold : UI_COLORS.text;
      b.fillText(fit(b, r.text, W - 2 * PAD - STATE_W), PAD, y + 1 * s);
    }
    r.card = c;
    drawState(r);
  }
  function drawState(r) {
    r.stateCard = null;
    const k = r.state?.kind;
    if (!k || k === 'run') return; // the running dots are drawn each frame
    const c = createCanvas(Math.round(STATE_W), Math.round(ROW));
    const b = c.getContext('2d');
    b.textBaseline = 'middle';
    b.font = font(600, SMALL);
    b.fillStyle = k === 'ok' ? UI_COLORS.ok : k === 'fail' ? UI_COLORS.fail : UI_COLORS.muted;
    const t = fit(b, r.state.text, STATE_W - 8 * s);
    b.textAlign = 'right';
    b.fillText(t, STATE_W, ROW / 2 + 1 * s);
    r.stateCard = c;
  }

  function addRow(r) {
    rows.unshift({ at: now(), msSum: 0, state: null, ...r });
    drawRow(rows[0]);
    rows = rows.slice(0, ROWS + 1); // one more, fading out
    shiftAt = now();
    lastEventAt = now();
  }

  /** A result for the action it belongs to: the newest one, unless its words match an older one. */
  function result(l) {
    const say = String(l.say ?? '').toLowerCase();
    const actions = rows.filter((r) => r.kind === 'action');
    let r = actions.find((x) => x.state?.kind === 'run' && say && x.text.toLowerCase().includes(say)) ?? actions.find((x) => x.state?.kind === 'run') ?? actions[0];
    if (!r) return;
    const multi = Number.isInteger(l.of) && l.of > 1;
    if (Number.isFinite(l.ms)) r.msSum += l.ms;
    const secs = (ms) => (ms >= 10_000 ? `${Math.round(ms / 1000)} s` : `${Math.max(0.1, Math.round(ms / 100) / 10)} s`);
    if (l.k === 'ok') {
      const last = !multi || l.n >= l.of;
      r.state = last ? { kind: 'ok', text: r.msSum > 0 ? `done ${secs(r.msSum)}` : 'done' } : { kind: 'run', text: `${l.n} of ${l.of}` };
    } else {
      const why = (l.why || String(l.t ?? '').replace(/^FAIL\s*/, '')).split(/[;(]/)[0].trim();
      r.state = { kind: 'fail', text: `failed${why ? ` · ${why}` : ''}` };
    }
    drawState(r);
  }

  const api = {
    width: W, height: H, fps, file: o.file ?? null,
    /** New lines from the agent ({k, t, say, ms, n, of, why}). */
    push(lines) {
      for (const l of lines ?? []) {
        if (!l || typeof l.t !== 'string') continue;
        if (l.k === 'call') {
          if (QUIET.test(l.t)) continue;
          // start_game's line comes with its reply: the game is there
          addRow({ kind: 'action', text: l.say || l.t.replace(/^>\s*/, ''), state: /^> start_game\b/.test(l.t) ? { kind: 'ok', text: 'ready' } : { kind: 'run', text: '' } });
        } else if (l.k === 'ok' || l.k === 'fail') {
          if (l.k === 'fail' && /^death\b/i.test(l.t)) { addRow({ kind: 'reflex', text: `Died: ${l.t.replace(/^death:\s*(?:died:\s*)?/i, '')}` }); continue; }
          result(l);
        } else if (l.k === 'reflex' || l.k === 'body') {
          const t = `${l.k === 'reflex' ? 'Reflex' : 'Body'}: ${reflexGist(l.t)}`;
          if (!rows.some((r) => r.text === t && now() - r.at < 10_000)) addRow({ kind: 'reflex', text: t });
        } else if (l.k === 'milestone') {
          addRow({ kind: 'milestone', text: milestoneWords(l.t) });
        } else if (l.k === 'info' && /^game over/i.test(l.t)) {
          addRow({ kind: 'note', text: l.t[0].toUpperCase() + l.t.slice(1) });
        }
      }
    },
    /** The status numbers (st) for the header. */
    status(text, data) {
      if (!data) return;
      if (Number.isFinite(data.ticks)) {
        // the clock's pace as seen between two updates: about 20 ticks a second, 0 when the day is locked
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
    /** The Body advice is not shown in this panel (the owner's call). */
    advice() {},
    /** The body's caption is not shown either: the action's words say it. */
    caption() {},
    /** An update from the agent: lines and status numbers. */
    term(u) {
      if (!u) return;
      if (Array.isArray(u.lines) && u.lines.length) api.push(u.lines);
      if (u.st) api.status(u.status, u.st);
      if (u.live) live = { ...u.live, at: now() };
    },
    /** Another game on camera: an empty list, with a note. */
    reset(note = '') {
      rows = [];
      live = null;
      anchor = null;
      for (const k of Object.keys(st)) st[k] = k === 'clock' ? '' : null;
      drawHeader();
      if (note) addRow({ kind: 'note', text: note[0].toUpperCase() + note.slice(1) });
    },

    /** One frame at time t (ms). */
    render(t = now()) {
      g.globalAlpha = 1;
      g.drawImage(bg, 0, 0);
      if (!header || clockNow() !== shownClock) drawHeader(); // the clock ticks with the game
      g.drawImage(header, 0, 0);
      const moved = ease((t - shiftAt) / 380);
      const top = HEAD + 6 * s;
      // nothing running for 2.5 s: the top row says what is happening, and the actions move a slot down
      const runningRow = rows.some((r) => r.kind === 'action' && r.state?.kind === 'run');
      const idle = rows.length > 0 && !runningRow && (live?.mode === 'run' || t - lastEventAt > 2_500);
      statusShow += ((idle ? 1 : 0) - statusShow) * 0.16;
      if (statusShow < 0.002) statusShow = 0;
      if (statusShow > 0.998) statusShow = 1;
      if (statusShow > 0) {
        const words = statusWords(t);
        if (words !== statusKey) { statusKey = words; statusCard = drawStatus(words); }
        g.globalAlpha = statusShow;
        g.drawImage(statusCard, 0, top - (1 - statusShow) * 10 * s);
        // a gentle pulse: the dot breathes; dots in turn when the agent says a skill runs
        const cy = top - (1 - statusShow) * 10 * s + ROW / 2;
        const k = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t / 1000) * Math.PI * 2 / 2.4));
        g.globalAlpha = statusShow * k;
        g.fillStyle = live?.mode === 'run' ? UI_COLORS.muse : UI_COLORS.soft;
        g.beginPath();
        g.arc(PAD + 7 * s, cy, 6 * s, 0, Math.PI * 2);
        g.fill();
      }
      const dims = [1, 0.62, 0.42, 0.26, 0, 0];
      const dimAt = (x) => { const i = Math.floor(x); const f = x - i; return (dims[i] ?? 0) * (1 - f) + (dims[i + 1] ?? 0) * f; };
      rows.forEach((r, i) => {
        // where it is going and where it came from: one row lower than before, the new one from just above its place;
        // a slot lower while the status line is shown
        const yTo = top + (i + statusShow) * ROW;
        const yFrom = i === 0 ? yTo - 14 * s : yTo - ROW;
        const y = i === 0 ? yFrom + (yTo - yFrom) * ease((t - r.at) / 320) : yFrom + (yTo - yFrom) * moved;
        const dim = dimAt(i + statusShow);
        const dimFrom = i === 0 ? 0 : dimAt(i - 1 + statusShow);
        const a = i === 0 ? ease((t - r.at) / 320) * dim : dimFrom + (dim - dimFrom) * moved;
        if (a <= 0.01) return;
        g.globalAlpha = a;
        g.drawImage(r.card, 0, y);
        if (r.stateCard) g.drawImage(r.stateCard, W - PAD - STATE_W, y);
        else if (r.state?.kind === 'run') {
          // running: three dots breathing in turn, and "2 of 4" before them in a sequence
          const cx = W - PAD - 10 * s;
          const cy = y + ROW / 2;
          for (let d = 0; d < 3; d++) {
            const phase = (t / 1000) * 2.2 - d * 0.28;
            const k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(phase * Math.PI * 2));
            g.globalAlpha = a * k;
            g.fillStyle = UI_COLORS.muse;
            g.beginPath();
            g.arc(cx - (2 - d) * 16 * s, cy, 4.5 * s, 0, Math.PI * 2);
            g.fill();
          }
          if (r.state.text) {
            g.globalAlpha = a;
            g.font = font(600, SMALL);
            g.fillStyle = UI_COLORS.soft;
            g.textAlign = 'right';
            g.textBaseline = 'middle';
            g.fillText(r.state.text, cx - 58 * s, cy + 1 * s);
            g.textAlign = 'left';
          }
        }
      });
      g.globalAlpha = 1;
      frames += 1;
      return canvas;
    },

    /** The frame as an uncompressed 32-bit BMP (top-down), or written over the panel file. */
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
    state: () => ({ rows: rows.slice(0, ROWS).map((r) => ({ kind: r.kind, text: r.text, state: r.state })), st: { ...st }, status: statusShow > 0.5 ? statusKey : null, clock: shownClock }),
  };

  const bmpHeader = Buffer.alloc(54);
  bmpHeader.write('BM', 0, 'ascii');
  bmpHeader.writeUInt32LE(54 + W * H * 4, 2);
  bmpHeader.writeUInt32LE(54, 10);
  bmpHeader.writeUInt32LE(40, 14);
  bmpHeader.writeInt32LE(W, 18);
  bmpHeader.writeInt32LE(-H, 22); // top-down rows, as the canvas has them
  bmpHeader.writeUInt16LE(1, 26);
  bmpHeader.writeUInt16LE(32, 28);
  bmpHeader.writeUInt32LE(0, 30);
  bmpHeader.writeUInt32LE(W * H * 4, 34);
  bmpHeader.writeInt32LE(2835, 38);
  bmpHeader.writeInt32LE(2835, 42);
  drawHeader();
  return api;
}
