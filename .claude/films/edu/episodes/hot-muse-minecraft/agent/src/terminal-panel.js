// src/terminal-panel.js - the terminal under the game in the vertical live video (the camera's side): a status bar
// (health, food, the game clock, who acted) and the lines the agent sends (src/terminal.js), newest at the bottom,
// scrolling up, coloured by kind, in a monospace font. Drawn with node-canvas into a PNG that ffmpeg reads again a few
// times a second (src/stream.js, ffmpegArgs with a panel): one image, so the colours line up whatever ffmpeg's text
// metrics, and it is drawn only when something changed, at most every minIntervalMs.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const PANEL_COLORS = Object.freeze({
  call: '#f2efe8', ok: '#7bd88f', fail: '#ff6b6b', advice: '#ffcc66', reflex: '#66d9ef', body: '#9ecbff', milestone: '#d6a8ff', info: '#8b949e',
});
const BG = '#0b0d0f';
const BAR = '#161a1f';
const RULE = '#2a3038';

/** A monospace TTF: TERM_FONT, else DejaVu Sans Mono (the camera image), else one the Mac has; null if none. */
export function findMonoFont(env = process.env) {
  const list = env.TERM_FONT ? [env.TERM_FONT] : [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
    '/System/Library/Fonts/Supplemental/Andale Mono.ttf', '/Library/Fonts/Andale Mono.ttf',
  ];
  return list.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } }) ?? null;
}

/**
 * @param {object} o
 * @param {number} o.width   @param {number} o.height   the panel's size in pixels
 * @param {string} o.file    the PNG ffmpeg reads (written to file.tmp, then renamed)
 * @param {string|null} [o.font]  a monospace TTF (findMonoFont)
 * @param {number} [o.fontSize]   (default width / 32, about 50 columns)
 * @param {number} [o.minIntervalMs]  at most one drawing this often (default 250)
 */
export function createTerminalPanel(o) {
  const { createCanvas, registerFont } = require('canvas');
  const family = 'MuseTermMono';
  if (o.font && !createTerminalPanel.registered?.has(o.font)) {
    registerFont(o.font, { family });
    (createTerminalPanel.registered ??= new Set()).add(o.font);
  }
  const fontName = o.font ? family : 'monospace';
  const width = o.width;
  const height = o.height;
  const size = o.fontSize ?? Math.round(width / 32);
  const lineH = Math.round(size * 1.3);
  const pad = Math.round(size * 0.7);
  const barH = Math.round(size * 1.9);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.font = `${size}px ${fontName}`;
  const charW = ctx.measureText('M').width || size * 0.6;
  const cols = Math.max(20, Math.floor((width - 2 * pad) / charW));
  const rows = Math.max(3, Math.floor((height - barH - 2 * pad) / lineH));
  let lines = []; // [{k, t}] wrapped to cols
  let status = '';
  let timer = null;
  let last = 0;
  let renders = 0;

  /** One line wrapped to the panel's columns; the rest indented. */
  const wrap = (l) => {
    const out = [];
    let t = String(l.t ?? '');
    let first = true;
    while (t.length) {
      const room = first ? cols : cols - 4;
      let cut = t.length <= room ? t.length : t.lastIndexOf(' ', room);
      if (cut <= room / 2) cut = Math.min(room, t.length);
      out.push({ k: l.k, t: `${first ? '' : '    '}${t.slice(0, cut).trimEnd()}` });
      t = t.slice(cut).trimStart();
      first = false;
    }
    return out;
  };

  function draw() {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = BAR;
    ctx.fillRect(0, 0, width, barH);
    ctx.fillStyle = RULE;
    ctx.fillRect(0, barH, width, Math.max(2, Math.round(size / 14)));
    ctx.textBaseline = 'middle';
    // the status bar: health, food and the clock on the left, who acted on the right, a little smaller than the lines
    const [left, ...rest] = status.split('  |  ');
    const right = rest.join('  |  ');
    ctx.font = `${Math.round(size * 0.86)}px ${fontName}`;
    ctx.fillStyle = PANEL_COLORS.call;
    ctx.fillText(left ?? '', pad, barH / 2);
    if (right) {
      ctx.fillStyle = PANEL_COLORS.reflex;
      ctx.fillText(right, width - pad - ctx.measureText(right).width, barH / 2);
    }
    ctx.font = `${size}px ${fontName}`;
    const shown = lines.slice(-rows);
    const bottom = height - pad - lineH / 2;
    shown.forEach((l, i) => {
      ctx.fillStyle = PANEL_COLORS[l.k] ?? PANEL_COLORS.info;
      ctx.fillText(l.t, pad, bottom - (shown.length - 1 - i) * lineH);
    });
  }

  function render() {
    clearTimeout(timer);
    timer = null;
    last = Date.now();
    draw();
    const png = canvas.toBuffer('image/png', { compressionLevel: 1 });
    fs.mkdirSync(path.dirname(o.file), { recursive: true });
    fs.writeFileSync(`${o.file}.tmp`, png);
    fs.renameSync(`${o.file}.tmp`, o.file); // ffmpeg never reads half a file
    renders += 1;
  }

  /** Draw soon: now if the last drawing is old enough, else once the interval has passed. */
  function schedule() {
    if (timer) return;
    const wait = Math.max(0, (o.minIntervalMs ?? 250) - (Date.now() - last));
    timer = setTimeout(() => { try { render(); } catch { /* the stream goes on with the last picture */ } }, wait);
    timer.unref?.();
  }

  return {
    cols, rows, file: o.file,
    /** New lines ({k, t}), appended at the bottom. */
    push(more) {
      for (const l of more ?? []) lines.push(...wrap(l));
      if (lines.length > rows * 4) lines = lines.slice(-rows * 2);
      schedule();
    },
    status(text) { status = String(text ?? ''); schedule(); },
    /** Another game on camera: an empty terminal. */
    reset(note = '') { lines = note ? wrap({ k: 'info', t: note }) : []; status = ''; schedule(); },
    render,
    get renders() { return renders; },
    lines: () => lines.slice(),
    stop() { clearTimeout(timer); timer = null; },
  };
}
