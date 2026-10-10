// src/stream.js - a guest bot's first-person view as a live video. Headless Chromium renders the bot's /eyes page
// (prismarine-viewer, patched in that page only by src/stream-page.js: smoothed camera, frame cap, fast leaves, fog)
// on SwiftShader with software compositing; the DevTools screencast hands over JPEG frames; a jitter buffer here puts
// them on a constant frame-rate clock by the time they were drawn; ffmpeg scales them up, draws the caption and
// encodes H.264 + silent 48 kHz AAC into FLV for an RTMP(S) ingest such as Facebook Live (or an MP4 file for tests). A
// browser that dies or stalls is restarted while ffmpeg goes on with the last frame, so the broadcast never drops for
// it; an ffmpeg that dies is restarted with a backoff. createStreamManager ties streams to games: one per game at most,
// never more than STREAM_MAX or than output URLs, each stopped with its game. createStreamService and
// createRemoteStreamManager run the same manager in a separate container (deploy/compose.yaml, profile "stream")
// behind a loopback-only HTTP API. The same manager and service also drive the real-client camera (src/camera.js,
// STREAM_SOURCE=client), whose streams have this interface too.

import { spawn, execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pageScript, patchedBundle, patchedWorkerBase64, PAGE_DEFAULTS } from './stream-page.js';
import { createRtmpPublisher } from './rtmp.js';

export const STREAM_DEFAULTS = Object.freeze({
  width: 1280, // the video (Facebook Live: H.264 + AAC, up to 1280x720 at 30 fps, keyframe every 2 s, CBR)
  height: 720,
  fps: 30,
  scale: 0.5, // the page renders at width x height times this (SwiftShader is the cost); ffmpeg scales up
  bitrateK: 3000,
  audioK: 128,
  keyframeSec: 2,
  quality: 80, // JPEG quality of the captured frames
  capture: 'screencast', // 'screencast' (DevTools), 'blob' (the canvas as JPEG after each frame), 'none' (measuring)
  preset: 'veryfast',
  threads: 2, // x264 threads
  nice: 10, // the browser runs below the agent and the game: when CPU is short it draws fewer frames
  encoderNice: 0, // ffmpeg is cheap and must keep real time (a starved encoder stalls the broadcast)
  latencyMs: 200, // the jitter buffer: frames go on the clock this long after they were drawn
  stallMs: 15_000, // no frame from the page for this long: restart the browser
  maxRssMB: 1_600, // the browser's processes together; above it: restart the browser
  maxRestarts: 6, // per child within restartWindowMs, before the stream gives up
  restartWindowMs: 300_000,
  fastLeaves: true,
  worldWaitMs: 10_000, // at most this long for the first chunks before capturing
  ...PAGE_DEFAULTS,
});

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms).unref?.(); });
const clip = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const alive = (child) => child && child.exitCode === null && child.signalCode === null;

/** An output URL safe to log: the stream key (the last path part), any query and credentials are hidden. */
export function maskOutput(output) {
  const s = String(output ?? '');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return s;
  try {
    const u = new URL(s);
    const parts = u.pathname.split('/').filter(Boolean);
    const shown = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}/***` : parts.length ? '/***' : '';
    return `${u.protocol}//${u.host}${shown}`;
  } catch {
    return s.replace(/^([a-z]+:\/\/[^/]+).*$/i, '$1/***');
  }
}

/** Every output URL in a text (ffmpeg's messages name it) masked, and any other rtmp(s) URL too. */
export function scrubOutputs(text, outputs = []) {
  let t = String(text ?? '');
  for (const o of outputs) if (o) t = t.split(o).join(maskOutput(o));
  return t.replace(/rtmps?:\/\/[^\s'"]+/gi, (u) => {
    const tail = u.match(/[:.,;)]+$/)?.[0] ?? ''; // punctuation after the URL in a message
    return maskOutput(tail ? u.slice(0, -tail.length) : u) + tail;
  });
}

export const isNetworkOutput = (output) => /^(rtmps?|srt|udp|tcp):\/\//i.test(String(output));
/** An RTMP(S) ingest: ffmpeg writes FLV to its fd 3 and src/rtmp.js publishes it, so the key is on no command line. */
export const isRtmpOutput = (output) => /^rtmps?:\/\//i.test(String(output));
/** What a stream's ffmpeg writes to: the FLV pipe (fd 3) for an RTMP(S) ingest, else the output itself. */
export const encoderTarget = (output) => (isRtmpOutput(output) ? 'pipe:3' : String(output));

/** A text for drawtext's textfile: fixed characters only (the caption is never viewer text, and this keeps it so). */
export const cleanCaption = (text) => String(text ?? '').replace(/[^A-Za-z0-9 ,.:()'-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

/** A pose {x, y, z, yaw, pitch} of finite numbers, or null. */
export function cleanPose(p) {
  const v = p && [p.x, p.y, p.z, p.yaw ?? 0, p.pitch ?? 0].map(Number);
  return v && v.every(Number.isFinite) ? { x: v[0], y: v[1], z: v[2], yaw: v[3], pitch: v[4] } : null;
}

/** The pose of a body's bot (feet position, yaw, pitch), or null before it is in the world. */
export function poseOf(body) {
  try {
    const e = body?.bot?.entity;
    return e?.position ? cleanPose({ x: e.position.x, y: e.position.y, z: e.position.z, yaw: e.yaw, pitch: e.pitch }) : null;
  } catch { return null; }
}

/** Escape a path for a value in an ffmpeg filter graph. */
const filterPath = (p) => `'${String(p).replace(/\\/g, '/').replace(/'/g, "'\\''").replace(/:/g, '\\:')}'`;

/**
 * ffmpeg arguments: JPEG frames on stdin at a constant rate (or, with o.x11 = {display, width, height}, an X display
 * grabbed at that rate: src/camera.js), silent stereo AAC paced in real time, scaled to width x height (with the
 * caption from captionFile, when there is a font), H.264 CBR with a closed GOP of keyframeSec; FLV for a network
 * output, MP4 (faststart) for a file. An RTMP(S) URL is never among the arguments: ffmpeg writes the FLV to its fd 3
 * (spawnEncoder publishes it), because every user on picasso can read every process's command line. o.progress:
 * key=value progress on stdout every 5 s.
 */
export function ffmpegArgs(o) {
  const fps = o.fps ?? STREAM_DEFAULTS.fps;
  const kbps = o.bitrateK ?? STREAM_DEFAULTS.bitrateK;
  const gop = Math.max(1, Math.round(fps * (o.keyframeSec ?? STREAM_DEFAULTS.keyframeSec)));
  const width = o.width ?? STREAM_DEFAULTS.width;
  const height = o.height ?? STREAM_DEFAULTS.height;
  const net = isNetworkOutput(o.output);
  const size = Math.round(height / 26);
  const caption = o.font && o.captionFile
    ? `,drawtext=fontfile=${filterPath(o.font)}:textfile=${filterPath(o.captionFile)}:reload=1:fontsize=${size}:fontcolor=0xF4F1EA`
      + `:box=1:boxcolor=0x0C0E10@0.62:boxborderw=${Math.round(size / 2)}:x=${Math.round(height / 20)}:y=h-th-${Math.round(height / 18)}`
    : '';
  // test only (STREAM_CLOCK): the wall clock, large, top right; its time zone is ffmpeg's TZ (encoderEnv)
  const big = Math.round(height / 11);
  const clock = o.clock && o.font
    ? `,drawtext=fontfile=${filterPath(o.font)}:text='%{localtime\\:%T}':fontsize=${big}:fontcolor=white`
      + `:box=1:boxcolor=0x000000@0.7:boxborderw=${Math.round(big / 4)}:x=w-tw-${Math.round(height / 24)}:y=${Math.round(height / 24)}`
    : '';
  const video = o.testSource // tests only: a moving test pattern instead of a picture source
    ? ['-re', '-f', 'lavfi', '-i', `testsrc2=size=${o.testSource}:rate=${fps}`]
    : o.x11
      ? ['-thread_queue_size', '64', '-f', 'x11grab', '-draw_mouse', '0', '-framerate', String(fps), '-video_size', `${o.x11.width ?? width}x${o.x11.height ?? height}`, '-i', String(o.x11.display)]
      : ['-thread_queue_size', '64', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0'];
  return [
    '-hide_banner', '-nostdin', '-loglevel', 'warning', '-nostats', ...(o.progress ? ['-progress', 'pipe:1', '-stats_period', '5'] : []),
    ...video,
    '-re', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
    '-map', '0:v', '-map', '1:a',
    '-vf', `scale=${width}:${height}:flags=${o.scaleFlags ?? 'bicubic'}${caption}${clock},format=yuv420p`,
    '-c:v', 'libx264', '-preset', o.preset ?? STREAM_DEFAULTS.preset, '-tune', 'zerolatency', '-profile:v', 'high',
    '-threads', String(o.threads ?? STREAM_DEFAULTS.threads),
    '-r', String(fps), '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0', '-bf', '0',
    '-b:v', `${kbps}k`, '-minrate', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps}k`, '-x264-params', 'nal-hrd=cbr:force-cfr=1',
    '-c:a', 'aac', '-b:a', `${o.audioK ?? STREAM_DEFAULTS.audioK}k`, '-ar', '48000', '-ac', '2',
    '-shortest',
    ...(net ? ['-flvflags', 'no_duration_filesize', '-f', 'flv'] : ['-movflags', '+faststart', '-f', 'mp4', '-y']),
    encoderTarget(o.output),
  ];
}

/** Environment variables that hold secrets (stream keys, the page token's path): never handed to a child process. */
const SECRET_ENV = /^(STREAM_RTMP_URL|FB_TOKEN_FILE|FB_.*TOKEN.*|MODEL_API_KEY|WEB_ADMIN_TOKEN|WEB_PROXY_SECRET)$/;
/** This process's environment without its secrets, plus extra: what a child (ffmpeg, the game client) gets. */
export const childEnv = (extra = {}) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !SECRET_ENV.test(k))), ...extra });

/** ffmpeg's environment: with the test clock on, its time zone (drawtext's localtime reads TZ). */
export const encoderEnv = (o, extra = {}) => childEnv({ ...extra, ...(o.clock ? { TZ: o.clockTz || 'America/Los_Angeles' } : {}) });

/**
 * ffmpeg for one stream. To an RTMP(S) ingest it writes FLV to its fd 3 and src/rtmp.js sends that to the URL, so the
 * stream key is on no command line and in no child's environment. A publisher that fails (refused, stalled, cut)
 * kills ffmpeg, so the caller's exit handler restarts both with its backoff; `failure()` gives the publisher's reason.
 * @param {{ffmpeg: string, args: string[], output: string, nice?: number, stdio: Array, env?: object,
 *   event?: (kind: string, data: object) => void, createPublisher?: typeof createRtmpPublisher, timeoutMs?: number}} o
 */
export function spawnEncoder(o) {
  const rtmp = isRtmpOutput(o.output);
  const child = spawnNiced(o.ffmpeg, o.args, o.nice ?? 0, { stdio: rtmp ? [...o.stdio.slice(0, 3), 'pipe'] : o.stdio, env: o.env ?? childEnv() });
  if (!rtmp) return { child, publisher: null, failure: () => null };
  let why = null;
  const publisher = (o.createPublisher ?? createRtmpPublisher)({ url: o.output, event: o.event, timeoutMs: o.timeoutMs, ca: o.ca });
  publisher.on('error', (err) => {
    why = `the ingest: ${clip(err?.message ?? err, 200)}`;
    if (alive(child)) child.kill('SIGKILL');
  });
  publisher.on('publishing', () => { try { o.event?.('stream_publishing', { output: maskOutput(o.output) }); } catch { /* best effort */ } });
  publisher.input(child.stdio[3]);
  child.on('error', () => publisher.close());
  return { child, publisher, failure: () => why };
}

/** Chromium flags: headless, WebGL on SwiftShader (no GPU), software compositing, DevTools over a pipe, no extras. */
export function chromiumArgs(o = {}) {
  return [
    '--headless', '--remote-debugging-pipe', `--user-data-dir=${o.profile}`,
    '--use-gl=angle', `--use-angle=${o.angle ?? 'swiftshader'}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    // the page is composited in software: with the screencast that costs a quarter less per frame than on SwiftShader
    '--disable-gpu-compositing',
    `--window-size=${o.width},${o.height}`, '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--disable-extensions', '--disable-component-update', '--disable-sync', '--disable-default-apps',
    '--disable-background-networking', '--disable-breakpad', '--no-default-browser-check', '--password-store=basic',
    '--use-mock-keychain', '--renderer-process-limit=1', '--disable-dev-shm-usage', `--js-flags=--max-old-space-size=${o.heapMB ?? 768}`,
    ...(o.noSandbox ? ['--no-sandbox'] : []),
    ...(o.extraArgs ?? []),
    'about:blank',
  ];
}

function executable(p) {
  try { fs.accessSync(p, fs.constants.X_OK); return fs.statSync(p).isFile(); } catch { return false; }
}

/** Newest first: Playwright's headless shell, then its Chromium, under the Playwright caches. */
function playwrightBrowsers(env) {
  const roots = [env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), 'Library/Caches/ms-playwright'), path.join(os.homedir(), '.cache/ms-playwright')].filter(Boolean);
  const out = [];
  for (const root of roots) {
    let names = [];
    try { names = fs.readdirSync(root); } catch { continue; }
    const pick = (prefix) => names.filter((n) => n.startsWith(prefix)).sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()));
    for (const n of pick('chromium_headless_shell-')) {
      for (const sub of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64', 'chrome-headless-shell-linux64', 'chrome-headless-shell-linux-arm64']) {
        out.push(path.join(root, n, sub, 'chrome-headless-shell'));
      }
      out.push(path.join(root, n, 'chrome-linux', 'headless_shell'));
    }
    for (const n of pick('chromium-')) {
      for (const sub of ['chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome-linux/chrome', 'chrome-linux64/chrome']) {
        out.push(path.join(root, n, sub));
      }
    }
  }
  return out;
}

/** STREAM_CHROMIUM, else Playwright's headless shell or Chromium, else a system Chromium or Chrome; null if none. */
export function findChromium(env = process.env) {
  if (env.STREAM_CHROMIUM) return executable(env.STREAM_CHROMIUM) ? env.STREAM_CHROMIUM : null;
  const list = [
    ...playwrightBrowsers(env),
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chrome-headless-shell', '/usr/bin/google-chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return list.find(executable) ?? null;
}

/** STREAM_FFMPEG, else a usual install place, else the first ffmpeg on PATH; null if none. */
export function findFfmpeg(env = process.env) {
  if (env.STREAM_FFMPEG) return executable(env.STREAM_FFMPEG) ? env.STREAM_FFMPEG : null;
  const onPath = String(env.PATH ?? '').split(path.delimiter).filter(Boolean).map((d) => path.join(d, 'ffmpeg'));
  const list = [path.join(os.homedir(), 'miniforge3/bin/ffmpeg'), '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', ...onPath];
  return list.find(executable) ?? null;
}

/** STREAM_FONT, else a plain sans-serif font that is usually installed; null (no caption) if none. */
export function findFont(env = process.env) {
  const list = env.STREAM_FONT ? [env.STREAM_FONT] : [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf', '/System/Library/Fonts/Helvetica.ttc', '/Library/Fonts/Arial.ttf',
  ];
  return list.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } }) ?? null;
}

/** spawn, below normal priority when `nice` is there (the agent and the game come first). */
export function spawnNiced(file, args, niceness, options) {
  const niceBin = ['/usr/bin/nice', '/bin/nice'].find(executable);
  if (niceness > 0 && niceBin) return spawn(niceBin, ['-n', String(niceness), file, ...args], options);
  return spawn(file, args, options);
}

/**
 * The DevTools protocol over Chromium's --remote-debugging-pipe (its fd 3 reads, fd 4 writes; NUL-separated JSON).
 * send(method, params, sessionId) resolves with the result; on(fn) sees every event.
 */
export function cdpPipe(writer, reader) {
  let buf = Buffer.alloc(0);
  let id = 0;
  let closed = false;
  const pending = new Map();
  const listeners = new Set();
  reader.on('data', (chunk) => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    let at;
    while ((at = buf.indexOf(0)) >= 0) {
      const text = buf.subarray(0, at).toString('utf8');
      buf = buf.subarray(at + 1);
      let msg;
      try { msg = JSON.parse(text); } catch { continue; }
      if (msg.id !== undefined && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message ?? 'failed'}`)); else p.resolve(msg.result ?? {});
      } else if (msg.method) {
        for (const fn of listeners) { try { fn(msg); } catch { /* a listener must not break the pipe */ } }
      }
    }
  });
  const end = () => {
    if (closed) return;
    closed = true;
    for (const p of pending.values()) p.reject(new Error('the browser closed'));
    pending.clear();
  };
  reader.on('close', end);
  reader.on('error', end);
  writer.on('error', end);
  return {
    send(method, params = {}, sessionId) {
      if (closed) return Promise.reject(new Error('the browser closed'));
      return new Promise((resolve, reject) => {
        id += 1;
        pending.set(id, { resolve, reject, method });
        const msg = { id, method, params };
        if (sessionId) msg.sessionId = sessionId;
        writer.write(`${JSON.stringify(msg)}\0`);
      });
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get closed() { return closed; },
  };
}

/**
 * The constant-rate clock. Frames come in with the time they were drawn (ms, the caller's clock); due(now) returns the
 * frames for every slot that is `latencyMs` old: the newest frame drawn in that slot, or the previous one again (a slow
 * page, a browser restart). A frame that arrives after its slot was written is dropped. Pure (no timers).
 */
export function createFrameClock({ fps = 30, latencyMs = 200 } = {}) {
  const interval = 1000 / fps;
  let t0 = null;
  let next = 0; // the next slot to write
  const queue = []; // {at, data, slot}, by time
  let last = null;
  const counts = { in: 0, written: 0, repeated: 0, dropped: 0, late: 0 };
  return {
    interval,
    counts,
    /** A frame drawn at `at` (ms). */
    push(at, data) {
      counts.in += 1;
      if (t0 === null) t0 = at - interval * 0.25; // slot n holds frames drawn in (t0 + (n-1) I, t0 + n I]
      const slot = Math.ceil((at - t0) / interval);
      if (slot < next) { counts.late += 1; return; }
      queue.push({ at, data, slot });
      if (queue.length > 1 && queue[queue.length - 2].at > at) queue.sort((a, b) => a.at - b.at);
    },
    /** The frames to write by time `now` (same clock as push), oldest first. */
    due(now) {
      if (t0 === null) return [];
      const upTo = Math.floor((now - latencyMs - t0) / interval);
      const out = [];
      while (next <= upTo && out.length < 90) { // never a flood after a long pause: the rest come on the next call
        let pick = null;
        while (queue.length && queue[0].slot <= next) {
          if (pick) counts.dropped += 1;
          pick = queue.shift();
        }
        if (pick) last = pick.data; else if (last) counts.repeated += 1;
        if (last) { out.push(last); counts.written += 1; }
        next += 1;
      }
      return out;
    },
    get started() { return t0 !== null; },
  };
}

/** Sum of RSS (MB) and CPU seconds of a process and its descendants, from ps (macOS and Linux); null if gone. */
export function processTree(rootPid) {
  return new Promise((resolve) => {
    if (!rootPid) { resolve(null); return; }
    execFile('ps', ['-A', '-o', 'pid=,ppid=,rss=,time='], { timeout: 5_000 }, (err, stdout) => {
      if (err) { resolve(null); return; }
      const kids = new Map();
      const info = new Map();
      for (const line of String(stdout).trim().split('\n')) {
        const [pid, ppid, rss, time] = line.trim().split(/\s+/);
        info.set(Number(pid), { rss: Number(rss), time });
        if (!kids.has(Number(ppid))) kids.set(Number(ppid), []);
        kids.get(Number(ppid)).push(Number(pid));
      }
      if (!info.has(rootPid)) { resolve(null); return; }
      resolve(sumTree(rootPid, kids, info));
    });
  });
}

/** CPU time as ps prints it ([dd-]hh:mm:ss[.ss] or mm:ss.ss) in seconds. */
export function cpuSeconds(t) {
  const m = String(t).match(/^(?:(\d+)-)?([\d:]+)(?:\.(\d+))?$/);
  if (!m) return 0;
  let s = 0;
  for (const x of m[2].split(':')) s = s * 60 + Number(x);
  return s + Number(m[1] ?? 0) * 86_400 + (m[3] ? Number(`0.${m[3]}`) : 0);
}

function sumTree(rootPid, kids, info) {
  let rss = 0;
  let cpu = 0;
  let n = 0;
  const stack = [rootPid];
  while (stack.length) {
    const p = stack.pop();
    const i = info.get(p);
    if (i) { rss += i.rss; cpu += cpuSeconds(i.time); n += 1; }
    stack.push(...(kids.get(p) ?? []));
  }
  return { rssMB: rss / 1024, cpuSec: cpu, processes: n };
}

/**
 * One stream: one browser and one ffmpeg.
 * @param {object} o
 * @param {string} o.source    the bot's first-person page (http://127.0.0.1:<eyes port>/eyes/<session>/)
 * @param {string} o.output    rtmp(s)://... or a file path (.mp4)
 * @param {string} [o.chromium] @param {string} [o.ffmpeg] @param {string|null} [o.font]   (default: found)
 * @param {boolean} [o.smooth]  the smoothed camera (default true); false keeps the viewer's own camera
 * @param {boolean} [o.noSandbox]   Chromium without its sandbox (in a container)
 * @param {(kind: string, data: object) => void} [o.event]   events for the log (outputs masked)
 * Other options: STREAM_DEFAULTS, and compare/trace/capture/smoother for src/stream-page.js.
 */
export function createStream(o) {
  const opt = { ...STREAM_DEFAULTS, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) };
  const chromium = opt.chromium ?? findChromium();
  const ffmpeg = opt.ffmpeg ?? findFfmpeg();
  const font = opt.font === undefined ? findFont() : opt.font;
  const emitter = new EventEmitter();
  const event = (kind, data = {}) => {
    try { opt.event?.(kind, data); } catch { /* logging is best effort */ }
    emitter.emit(kind, data);
  };
  // an exact 2x (or 3x, 4x) keeps Minecraft's square pixels square; any other ratio is smoothed
  opt.scaleFlags ??= Number.isInteger(Math.round((1 / opt.scale) * 1000) / 1000) ? 'neighbor' : 'bicubic';
  const renderW = Math.max(160, Math.round((opt.width * opt.scale) / 2) * 2);
  const renderH = Math.max(90, Math.round((opt.height * opt.scale) / 2) * 2);
  const clock = createFrameClock({ fps: opt.fps, latencyMs: opt.latencyMs });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-stream-'));
  const captionFile = path.join(work, 'caption.txt');
  fs.writeFileSync(captionFile, '');
  let state = 'idle'; // idle -> starting -> live -> stopping -> stopped | failed
  let browser = null; // {child, cdp, session, profile, pid, startedAt}
  let enc = null; // {child, startedAt, err}
  let ticker = null;
  let watchdog = null;
  let offset = null; // local ms minus drawn ms (the smallest seen: the transport delay left out)
  let lastFrameAt = 0;
  let encoderDrops = 0;
  let maxBacklog = 0; // bytes waiting for ffmpeg, at most
  const dropTimes = []; // seconds after the start of the first frames dropped for a slow ffmpeg
  let restarting = false;
  let seed = opt.pose ?? null; // the bot's pose (or a function giving it) for a page that has no update yet
  const restarts = { browser: [], ffmpeg: [] };
  const startedAt = Date.now();
  let done;
  const finished = new Promise((r) => { done = r; });
  const running = () => state === 'starting' || state === 'live';

  function tooMany(kind) {
    const now = Date.now();
    restarts[kind] = restarts[kind].filter((t) => t > now - opt.restartWindowMs);
    restarts[kind].push(now);
    return restarts[kind].length > opt.maxRestarts;
  }

  // ----- ffmpeg

  function startEncoder() {
    const { child, failure } = spawnEncoder({
      ffmpeg, args: ffmpegArgs({ ...opt, font, captionFile }), output: opt.output, nice: opt.encoderNice, stdio: ['pipe', 'ignore', 'pipe'],
      env: encoderEnv(opt), event: (k, d) => event(k, d), createPublisher: opt.createPublisher,
    });
    const me = { child, startedAt: Date.now(), err: '' };
    enc = me;
    child.stdin.on('error', () => {});
    child.stderr.on('data', (d) => { me.err = (me.err + d).slice(-4_000); });
    child.on('error', (err) => { me.err += String(err?.message ?? err); });
    child.on('exit', (code, signal) => {
      if (enc === me) enc = null;
      if (!running()) return;
      const detail = clip(scrubOutputs(failure() ?? me.err, [opt.output]).split('\n').filter(Boolean).slice(-3).join(' | '));
      event('stream_ffmpeg_exit', { code, signal, detail });
      if (tooMany('ffmpeg')) { fail(`ffmpeg failed ${opt.maxRestarts + 1} times in ${Math.round(opt.restartWindowMs / 60_000)} min: ${detail}`); return; }
      const wait = Math.min(30_000, 1_000 * 2 ** (restarts.ffmpeg.length - 1));
      setTimeout(() => { if (running() && !enc) startEncoder(); }, wait).unref?.();
    });
  }

  function writeFrames(frames) {
    const e = enc;
    if (!e || !e.child.stdin.writable) return;
    for (const f of frames) {
      // ffmpeg slower than real time (starved of CPU): drop rather than queue without end
      if (e.child.stdin.writableLength > 8 * 1024 * 1024) {
        encoderDrops += 1;
        if (dropTimes.length < 5) dropTimes.push(Math.round((Date.now() - startedAt) / 100) / 10);
        continue;
      }
      e.child.stdin.write(f);
      maxBacklog = Math.max(maxBacklog, e.child.stdin.writableLength);
    }
  }

  // ----- the browser

  const jsHeaders = [{ name: 'content-type', value: 'application/javascript; charset=utf-8' }, { name: 'cache-control', value: 'no-store' }];

  async function startBrowser() {
    const profile = path.join(work, `profile-${Date.now()}`);
    fs.mkdirSync(profile);
    const args = chromiumArgs({ profile, width: renderW, height: renderH, noSandbox: opt.noSandbox, angle: opt.angle, extraArgs: opt.chromiumFlags });
    const child = spawnNiced(chromium, args, opt.nice, { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
    const me = { child, profile, cdp: null, session: null, startedAt: Date.now(), err: '', pid: child.pid };
    browser = me;
    child.stderr.on('data', (d) => { me.err = (me.err + d).slice(-4_000); });
    child.on('error', (err) => { me.err += String(err?.message ?? err); });
    child.on('exit', (code, signal) => {
      fs.rm(profile, { recursive: true, force: true, maxRetries: 3 }, () => {});
      if (browser !== me) return;
      browser = null;
      if (running()) restartBrowser(`the browser exited (${signal ?? code})`);
    });
    const cdp = cdpPipe(child.stdio[3], child.stdio[4]);
    me.cdp = cdp;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', width: renderW, height: renderH });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    me.session = sessionId;
    const send = (method, params) => cdp.send(method, params, sessionId);
    const bundle = patchedBundle();
    if (!bundle.ok) event('stream_patch_off', { reason: bundle.error });
    cdp.on((msg) => {
      if (browser !== me) return;
      const p = msg.params ?? {};
      if (msg.method === 'Page.screencastFrame' && msg.sessionId === sessionId) {
        send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
        onFrame(p.data, Number(p.metadata?.timestamp) * 1000);
      } else if (msg.method === 'Runtime.bindingCalled' && msg.sessionId === sessionId && p.name === '__museFrame') {
        const s = String(p.payload);
        const comma = s.indexOf(',');
        onFrame(s.slice(comma + 1), Number(s.slice(0, comma)));
      } else if (msg.method === 'Fetch.requestPaused' && msg.sessionId === sessionId) {
        let file = '';
        try { file = new URL(p.request.url).pathname; } catch { /* not a URL */ }
        let body = null;
        if (opt.fastLeaves && file.endsWith('/worker.js')) {
          const w = patchedWorkerBase64();
          if (w.ok) body = w.base64; else event('stream_patch_off', { reason: w.error });
        } else if (bundle.ok && file.endsWith('/index.js')) {
          body = Buffer.from(bundle.js).toString('base64');
        }
        (body
          ? send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: jsHeaders, body })
          : send('Fetch.continueRequest', { requestId: p.requestId })).catch(() => {});
      } else if ((msg.method === 'Inspector.targetCrashed' && msg.sessionId === sessionId) || (msg.method === 'Target.targetCrashed' && p.targetId === targetId)) {
        restartBrowser('the page crashed');
      } else if (msg.method === 'Target.detachedFromTarget' && p.sessionId === sessionId) {
        restartBrowser('the page closed');
      }
    });
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: renderW, height: renderH, deviceScaleFactor: 1, mobile: false });
    await send('Fetch.enable', { patterns: [{ urlPattern: '*/index.js*', requestStage: 'Request' }, { urlPattern: '*/worker.js*', requestStage: 'Request' }] });
    if (opt.capture === 'blob') await send('Runtime.addBinding', { name: '__museFrame' });
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: pageScript({
        fps: opt.fps, far: opt.far, below: opt.below, above: opt.above, workers: opt.workers, smooth: opt.smooth !== false,
        compare: opt.compare === true, trace: opt.trace === true, capture: opt.capture, quality: opt.quality, smoother: opt.smoother,
      }),
    });
    await send('Page.navigate', { url: opt.source });
    // the world arrives in chunks: capture once some of it is drawn (or after worldWaitMs anyway), with the camera
    // already where the bot is
    const until = Date.now() + opt.worldWaitMs;
    while (Date.now() < until && browser === me) {
      const v = await evaluate('window.__muse ? window.__muse.info() : null').catch(() => null);
      if (v && v.samples === 0) await seedOnce();
      if (v && v.sections >= 24) break;
      await sleep(250);
    }
    if (browser !== me) return;
    if (opt.capture === 'screencast') await send('Page.startScreencast', { format: 'jpeg', quality: opt.quality, maxWidth: renderW, maxHeight: renderH, everyNthFrame: 1 });
    event('stream_browser', { pid: child.pid, render: `${renderW}x${renderH}`, patched: bundle.ok });
    seedPose(me);
  }

  /**
   * The viewer sends the bot's pose only when it moves: a page that opens while the bot stands still would look at the
   * sky from the world's origin. Until the first real update, the page gets the pose the agent knows, once a second.
   */
  async function seedPose(me) {
    for (let i = 0; i < 600 && browser === me && running(); i += 1) {
      const samples = await evaluate('window.__muse ? window.__muse.info().samples : -1').catch(() => -1);
      if (samples !== 0) return;
      await seedOnce();
      await sleep(1_000);
    }
  }

  async function seedOnce() {
    const p = cleanPose(typeof seed === 'function' ? seed() : seed);
    if (p) await evaluate(`window.__muse.sample(${JSON.stringify({ x: p.x, y: p.y, z: p.z })}, ${p.yaw}, ${p.pitch})`).catch(() => {});
  }

  function evaluate(expression) {
    const b = browser;
    if (!b?.cdp || !b.session) return Promise.reject(new Error('no page'));
    return b.cdp.send('Runtime.evaluate', { expression, returnByValue: true }, b.session).then((r) => r?.result?.value);
  }

  /** A frame drawn at `drawn` (epoch ms, the browser's clock): placed on the local clock by the smallest delay seen. */
  function onFrame(base64, drawn) {
    const now = Date.now();
    let at = now;
    if (Number.isFinite(drawn) && drawn > 0) {
      const d = now - drawn;
      if (offset === null || d < offset) offset = d;
      at = drawn + offset;
      if (now - at > 2_000) { offset = d; at = now; } // the clock stepped: start over
    }
    lastFrameAt = now;
    clock.push(at, Buffer.from(base64, 'base64'));
    if (state === 'starting') {
      // ffmpeg starts with the first picture: no connection to the ingest before there is one, and the silent audio
      // (paced in real time from ffmpeg's start) begins with the video
      state = 'live';
      startEncoder();
      event('stream_live', { afterMs: now - startedAt });
    }
  }

  async function restartBrowser(why) {
    if (restarting || !running()) return;
    restarting = true;
    try {
      event('stream_browser_restart', { reason: clip(why, 200) });
      if (tooMany('browser')) { fail(`the browser failed ${opt.maxRestarts + 1} times in ${Math.round(opt.restartWindowMs / 60_000)} min (${why})`); return; }
      await killBrowser();
      offset = null; // a new browser, its own clock
      await sleep(Math.min(10_000, 500 * 2 ** (restarts.browser.length - 1)));
      if (running()) {
        await startBrowser().catch((err) => {
          event('stream_error', { message: clip(err?.message ?? err) });
          setTimeout(() => { restartBrowser('the browser could not start'); }, 1_000).unref?.();
        });
      }
    } finally {
      restarting = false;
    }
  }

  async function killBrowser() {
    const b = browser;
    browser = null;
    if (!b) return;
    if (alive(b.child)) {
      b.child.kill('SIGTERM');
      await Promise.race([new Promise((r) => b.child.once('exit', r)), sleep(3_000)]);
      if (alive(b.child)) b.child.kill('SIGKILL');
    }
    fs.rm(b.profile, { recursive: true, force: true, maxRetries: 3 }, () => {});
  }

  // ----- the clock and the watchdog

  function startTicker() {
    const t0 = Date.now();
    let n = 0;
    const tick = () => {
      if (!running()) return;
      writeFrames(clock.due(Date.now())); // with no new frame (a slow or restarting browser) the last one again
      n += 1;
      ticker = setTimeout(tick, Math.max(1, t0 + n * clock.interval - Date.now()));
    };
    ticker = setTimeout(tick, clock.interval);
  }

  function startWatchdog() {
    let ticks = 0;
    let last = null; // the numbers of the previous report
    watchdog = setInterval(async () => {
      if (state !== 'live' || restarting) return;
      if (browser && Date.now() - Math.max(lastFrameAt, browser.startedAt) > opt.stallMs) { restartBrowser(`no frame for ${Math.round(opt.stallMs / 1000)} s`); return; }
      const t = browser?.pid ? await processTree(browser.pid) : null;
      if (t && t.rssMB > opt.maxRssMB) { restartBrowser(`the browser used ${Math.round(t.rssMB)} MB (cap ${opt.maxRssMB})`); return; }
      // once a minute: what the stream costs and how even it runs, for the log
      ticks += 1;
      if (ticks % 12 !== 1 || !t) return; // the first live tick sets the baseline, then a report every 60 s
      const f = await processTree(enc?.child.pid);
      const page = await evaluate('window.__muse ? window.__muse.info() : null').catch(() => null);
      const now = { at: Date.now(), b: t.cpuSec, f: f?.cpuSec ?? 0, frames: page?.frames ?? 0, c: { ...clock.counts } };
      if (last) {
        const sec = (now.at - last.at) / 1000;
        event('stream_stats', {
          pageFps: Math.round(((now.frames - last.frames) / sec) * 10) / 10, captureFps: Math.round(((now.c.in - last.c.in) / sec) * 10) / 10,
          repeated: now.c.repeated - last.c.repeated, dropped: now.c.dropped - last.c.dropped, late: now.c.late - last.c.late, encoderDrops,
          browserCpu: Math.round(((now.b - last.b) / sec) * 100), browserMB: Math.round(t.rssMB),
          ffmpegCpu: Math.round(((now.f - last.f) / sec) * 100), ffmpegMB: f ? Math.round(f.rssMB) : null, triangles: page?.triangles ?? null,
        });
      }
      last = now;
    }, 5_000);
    watchdog.unref?.();
  }

  function fail(reason) {
    if (!running()) return;
    state = 'failed';
    event('stream_failed', { reason: clip(reason) });
    teardown().then(() => done({ ok: false, reason }));
  }

  async function teardown() {
    clearTimeout(ticker);
    clearInterval(watchdog);
    await killBrowser();
    const e = enc;
    enc = null;
    if (e && alive(e.child)) {
      try { e.child.stdin.end(); } catch { /* closed */ }
      await Promise.race([new Promise((r) => e.child.once('exit', r)), sleep(10_000)]);
      if (alive(e.child)) e.child.kill('SIGKILL');
    }
    fs.rm(work, { recursive: true, force: true, maxRetries: 3 }, () => {});
  }

  return {
    get state() { return state; },
    /** Resolves once the browser has the page and capture runs (a browser that cannot start is retried). */
    async start() {
      if (state !== 'idle') return;
      if (!chromium) throw new Error('no Chromium found (set STREAM_CHROMIUM)');
      if (!ffmpeg) throw new Error('no ffmpeg found (set STREAM_FFMPEG)');
      state = 'starting';
      event('stream_start', { output: maskOutput(opt.output), size: `${opt.width}x${opt.height}`, fps: opt.fps, bitrateK: opt.bitrateK, caption: Boolean(font) });
      startTicker();
      startWatchdog();
      try {
        await startBrowser();
      } catch (err) {
        if (running()) restartBrowser(`could not start: ${clip(err?.message ?? err)}`);
      }
    },
    /** Stop: the browser closes, the frames still buffered go out, ffmpeg finishes the file or the stream. */
    async stop(reason = 'stopped') {
      if (!running()) return finished;
      const was = state;
      state = 'stopping';
      writeFrames(clock.due(Date.now() + opt.latencyMs));
      await teardown();
      state = 'stopped';
      event('stream_stop', { reason: clip(reason, 200), wasLive: was === 'live', seconds: Math.round((Date.now() - startedAt) / 1000), frames: { ...clock.counts, encoderDrops, dropTimes, maxBacklogKB: Math.round(maxBacklog / 1024) } });
      done({ ok: true, reason });
      return finished;
    },
    /** The bot's latest pose as the agent knows it (the service gets it with each caption). */
    pose(p) { const c = cleanPose(p); if (c) seed = c; },
    /** The caption (fixed words only, never viewer text; '' hides it). ffmpeg reads the file at every frame. */
    caption(text) {
      const tmp = `${captionFile}.tmp`;
      try { fs.writeFileSync(tmp, cleanCaption(text)); fs.renameSync(tmp, captionFile); } catch { /* the stream has ended */ }
    },
    /** Counters, the page's own numbers and (resources: true) CPU seconds and RAM of both children. */
    async stats({ resources = false } = {}) {
      const page = await evaluate('window.__muse ? window.__muse.info() : null').catch(() => null);
      const out = {
        state, output: maskOutput(opt.output), render: `${renderW}x${renderH}`, video: `${opt.width}x${opt.height}@${opt.fps}`,
        frames: { ...clock.counts, encoderDrops, dropTimes, maxBacklogKB: Math.round(maxBacklog / 1024) }, restarts: { browser: restarts.browser.length, ffmpeg: restarts.ffmpeg.length },
        page, browserPid: browser?.pid ?? null, ffmpegPid: enc?.child.pid ?? null,
      };
      if (resources) {
        out.browserTree = await processTree(browser?.pid);
        out.ffmpegTree = await processTree(enc?.child.pid);
      }
      return out;
    },
    /** Resolves {ok, reason} once the stream has stopped or failed for good. */
    finished,
    on: (e, fn) => emitter.on(e, fn),
    /** For tuning and tests: an expression evaluated in the page; kill a child as a crash would. */
    _evaluate: (expression) => evaluate(expression),
    _killBrowser: () => browser?.child.kill('SIGKILL'),
    _killEncoder: () => enc?.child.kill('SIGKILL'),
  };
}

/** Plain words for the caption from a body 'skill' event: fixed names and numbers only, never viewer text. */
export function captionFor(evt) {
  if (!evt || evt.phase !== 'start') return '';
  const a = evt.args ?? {};
  const name = (v) => String(v ?? '').replace(/[^a-z0-9_]/gi, '').replace(/_/g, ' ').slice(0, 40);
  const n = (v) => (Number.isInteger(v) ? v : '');
  const count = (v) => (Number.isInteger(v) && v > 1 ? ` (${v})` : '');
  switch (evt.tool) {
    case 'go_to': return `Walking to ${n(a.x)} ${n(a.y)} ${n(a.z)}`.trim();
    case 'collect': return `Collecting ${name(a.block)}${count(a.n)}`;
    case 'craft': return `Crafting ${name(a.item)}${count(a.n)}`;
    case 'smelt': return `Smelting ${name(a.item)}${count(a.n)}`;
    case 'place': return `Placing ${name(a.block)}`;
    case 'build': return `Building a ${name(a.blueprint)} from ${name(a.material)}`;
    case 'attack': return `Fighting a ${name(a.target)}`;
    case 'eat': return 'Eating';
    case 'say': return 'Chatting';
    case 'hunt': return `Hunting a ${name(a.mob)}`;
    case 'shelter': return 'Building a shelter';
    case 'shield': return 'Making a shield';
    case 'sleep': return 'Sleeping';
    case 'armor': return 'Crafting armor';
    case 'equip': return `Equipping ${name(a.item)}`;
    case 'explore': return 'Exploring';
    case 'pick_up': return a.death_items ? 'Going back for its items' : 'Picking up items';
    case 'portal': return a.action === 'light' ? 'Lighting a portal' : 'Entering a portal';
    default: return '';
  }
}

/** Their reflexes in caption words (the runtime's reflex names, from the body's 'reflex' events). */
export const REFLEX_CAPTIONS = Object.freeze({
  hostile_reflex: 'defending itself', hunger_reflex: 'eating', breath_reflex: 'swimming up for air',
  fire_reflex: 'getting out of fire', recover_footing: 'getting its footing back', dragon_reflex: 'dodging the dragon',
});

/** A caption with who acts: "Muse: collecting iron ore", "Reflex: defending itself"; '' stays ''. */
export const sourced = (who, words) => (words ? `${who}: ${words.charAt(0).toLowerCase()}${words.slice(1)}` : '');

/**
 * The live caption of a game from its body's events, with who acts: the player's skills (Muse), and while one of the
 * runtime's reflexes has the body (BODY=mineai 'reflex' events), that reflex, then the skill again. put(text) shows
 * it. Returns the listeners' offs.
 */
export function captionsOf(body, put) {
  let skill = '';
  let reflex = '';
  const show = () => put(reflex || skill);
  return [
    body.on('skill', (evt) => { skill = sourced('Muse', captionFor(evt)); show(); }),
    body.on('reflex', (evt) => { reflex = sourced('Reflex', REFLEX_CAPTIONS[evt?.name] ?? (evt?.name ? 'acting on its own' : '')); show(); }),
  ];
}

/** The manager's configuration from config.stream (STREAM_*). */
export function managerConfig(c) {
  return {
    enabled: Boolean(c?.enabled), outputs: c?.outputs ?? [], outDir: c?.outDir || '', max: c?.max ?? 0,
    options: { fps: c?.fps, scale: c?.scale, bitrateK: c?.bitrateK, far: c?.far, maxRssMB: c?.maxRssMB, noSandbox: c?.noSandbox, clock: c?.clock || undefined, clockTz: c?.clockTz },
  };
}

/**
 * Streams tied to games: one per game, at most `max` at once and never more than outputs (an RTMP ingest takes one
 * stream at a time, so each stream holds one URL until it ends). With no output URL but `outDir`, every stream is a
 * file there. Off (every call a no-op) unless enabled.
 * @param {object} o
 * @param {{enabled: boolean, outputs?: string[], outDir?: string, max: number, options?: object}} o.config
 * @param {{event: (kind: string, data: object) => void}} [o.log]
 * @param {typeof createStream} [o.create]   (tests)
 */
export function createStreamManager({ config, log, create = createStream } = {}) {
  const cfg = config ?? { enabled: false, outputs: [], max: 0 };
  const outputs = cfg.outputs ?? [];
  const streams = new Map(); // id -> {stream, output, offs, stopping}; a stopping stream keeps its output and slot
  const event = (kind, data) => { try { log?.event(kind, data); } catch { /* best effort */ } };
  const enabled = Boolean(cfg.enabled && (outputs.length || cfg.outDir) && cfg.max > 0);

  function freeOutput(id) {
    if (outputs.length) {
      const used = new Set([...streams.values()].map((s) => s.output));
      return outputs.find((u) => !used.has(u)) ?? null;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(cfg.outDir, `stream-${String(id).replace(/[^A-Za-z0-9_-]/g, '')}-${stamp}.mp4`);
  }

  function detach(entry) {
    for (const off of entry.offs.splice(0)) { try { off?.(); } catch { /* ignore */ } }
  }

  const api = {
    get enabled() { return enabled; },
    /**
     * Start the stream of a game (body, optional: captions from its skill events, stop when it ends; player: the bot's
     * name, which the real-client camera spectates). Returns the stream, the one already running for this id, or null
     * (off, every slot or output in use).
     */
    start(id, { source, body, pose, player } = {}) {
      if (!enabled || !source) return null;
      const running = streams.get(id);
      if (running) return running.stopping ? null : running.stream;
      if (streams.size >= cfg.max) { event('stream_skipped', { session: id, reason: `${cfg.max} stream(s) already running` }); return null; }
      const output = freeOutput(id);
      if (!output) { event('stream_skipped', { session: id, reason: 'every output URL is in use' }); return null; }
      const stream = create({
        ...(cfg.options ?? {}), source, output, player, pose: body ? () => poseOf(body) : pose ?? null,
        event: (kind, data) => event(kind, { session: id, ...data }),
      });
      const entry = { stream, output, offs: [], stopping: null };
      streams.set(id, entry);
      if (typeof body?.on === 'function') {
        try {
          entry.offs.push(...captionsOf(body, (text) => stream.caption(text)));
          entry.offs.push(body.on('end', () => { api.stop(id, 'the game ended'); }));
        } catch { /* a body without these events: no caption */ }
      }
      stream.finished.then(() => { detach(entry); if (streams.get(id) === entry) streams.delete(id); });
      Promise.resolve().then(() => stream.start()).catch((err) => {
        event('stream_error', { session: id, message: clip(err?.message ?? err) });
        api.stop(id, 'could not start');
      });
      return stream;
    },
    /** Stop the stream of a game; resolves when it is down (its output URL is free only then). */
    stop(id, reason = 'stopped') {
      const entry = streams.get(id);
      if (!entry) return Promise.resolve();
      if (!entry.stopping) {
        detach(entry);
        entry.stopping = Promise.resolve(entry.stream.stop(reason)).catch(() => {}).then(() => { if (streams.get(id) === entry) streams.delete(id); });
      }
      return entry.stopping;
    },
    /** The caption of a game's stream (fixed words only), and the bot's pose when known. */
    caption(id, text, pose) {
      const e = streams.get(id);
      if (!e || e.stopping) return;
      if (pose) e.stream.pose(pose);
      e.stream.caption(text);
    },
    has: (id) => Boolean(streams.get(id) && !streams.get(id).stopping),
    /** Which output URL (its index in STREAM_RTMP_URL) a game's running stream holds; null for files or no stream. */
    slot(id) {
      const e = streams.get(id);
      if (!e || e.stopping || !outputs.length) return null;
      const i = outputs.indexOf(e.output);
      return i >= 0 ? i : null;
    },
    get size() { return streams.size; },
    list: () => [...streams.entries()].map(([id, e]) => ({ id, state: e.stream.state, output: maskOutput(e.output) })),
    stats: (id) => streams.get(id)?.stream.stats({ resources: true }) ?? null,
    async stopAll(reason = 'shutdown') {
      await Promise.allSettled([...streams.keys()].map((id) => api.stop(id, reason)));
    },
  };
  return api;
}

// ---------------------------------------------------------------------------------------------------------------
// The streamer as its own service (the container of deploy/compose.yaml's "stream" profile shares the agent's network
// namespace, so the eyes pages on 127.0.0.1 are its own). The API listens on loopback only and knows no output URL
// from the caller: outputs are the service's own configuration.

const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * A source the service accepts: a local eyes page of that game (under its view id, `view`, or its session id), and
 * nothing else.
 */
export function validSource(source, view) {
  if (!ID_RE.test(String(view ?? ''))) return false;
  try {
    const u = new URL(source);
    return u.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && u.pathname === `/eyes/${view}/` && !u.search && !u.username;
  } catch { return false; }
}

/** The view id in a local eyes page's path (http://127.0.0.1:<port>/eyes/<view id>/), or null. */
export const viewOf = (source) => {
  try { return new URL(source).pathname.match(/^\/eyes\/([A-Za-z0-9_-]{1,40})\/$/)?.[1] ?? null; } catch { return null; }
};

/**
 * The control API around a manager: PUT /streams/<id> {source, view?, pose?, player?} starts (and answers with the
 * output slot it holds, and channel: true for the Facebook live channel), DELETE /streams/<id> stops,
 * POST /streams/<id>/caption {text}, GET /streams lists, GET /streams/<id> gives the numbers. With the live channel
 * (FB_LIVE=on) also POST /streams/<id>/focus {source?, view?, player?} (the camera films this game from now on; a game
 * the channel does not have yet is put on it first) and GET /live (the channel's state, the video and embed URLs).
 * Nothing here ever answers with an ingest URL or a token.
 */
export function createStreamService({ manager, log } = {}) {
  const json = (res, status, body) => {
    const text = `${JSON.stringify(body)}\n`;
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(text) });
    res.end(text);
  };
  const readJson = (req) => new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size <= 4_096) chunks.push(c); });
    req.on('end', () => { try { resolve(size > 4_096 ? null : JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
  return http.createServer(async (req, res) => {
    try {
      if (/^\/live\/?(?:\?.*)?$/.test(String(req.url))) {
        if (req.method !== 'GET') return json(res, 405, { error: 'use GET' });
        return json(res, 200, typeof manager.live === 'function' ? manager.live() : { fb: false });
      }
      const m = String(req.url).match(/^\/streams(?:\/([^/?]+))?(\/caption|\/focus)?\/?(?:\?.*)?$/);
      if (!m) return json(res, 404, { error: 'not found' });
      const [, id, sub] = m;
      const caption = sub === '/caption';
      if (sub === '/focus') {
        if (!ID_RE.test(String(id))) return json(res, 400, { error: 'bad id' });
        if (req.method !== 'POST') return json(res, 405, { error: 'use POST' });
        if (typeof manager.focus !== 'function') return json(res, 404, { error: 'no live channel (FB_LIVE is off)' });
        const body = (await readJson(req)) ?? {};
        if (!manager.has(id) && body.player !== undefined) {
          if (!validSource(body.source, body.view ?? id) || !/^[A-Za-z0-9_]{3,16}$/.test(String(body.player))) return json(res, 400, { error: 'source must be http://127.0.0.1:<port>/eyes/<view>/ and player a Minecraft name' });
          manager.start(id, { source: body.source, player: body.player });
        }
        return json(res, 200, await manager.focus(id));
      }
      if (id !== undefined && !ID_RE.test(id)) return json(res, 400, { error: 'bad id' });
      if (!id) return req.method === 'GET' ? json(res, 200, { enabled: manager.enabled, streams: manager.list() }) : json(res, 405, { error: 'use GET' });
      if (caption) {
        if (req.method !== 'POST') return json(res, 405, { error: 'use POST' });
        const body = await readJson(req);
        manager.caption(id, cleanCaption(body?.text), cleanPose(body?.pose));
        return json(res, 200, { ok: true });
      }
      if (req.method === 'PUT') {
        const body = await readJson(req);
        if (!body || !validSource(body.source, body.view ?? id)) return json(res, 400, { error: 'source must be http://127.0.0.1:<port>/eyes/<view>/' });
        if (body.player !== undefined && !/^[A-Za-z0-9_]{3,16}$/.test(String(body.player))) return json(res, 400, { error: 'player must be a Minecraft name' });
        const s = manager.start(id, { source: body.source, pose: cleanPose(body.pose), player: body.player });
        return json(res, s ? 200 : 409, s ? { started: true, slot: manager.slot?.(id) ?? null, channel: Boolean(manager.channel) } : { started: false, error: 'not started (off, or every slot in use)' });
      }
      if (req.method === 'DELETE') {
        // ffmpeg may take seconds to close the file or the ingest: answer now, the slot frees up once it has
        manager.stop(id, 'the game ended');
        return json(res, 202, { stopping: true });
      }
      if (req.method === 'GET') { const s = await manager.stats(id); return s ? json(res, 200, s) : json(res, 404, { error: 'no such stream' }); }
      return json(res, 405, { error: 'use GET, PUT, DELETE or POST .../caption' });
    } catch (err) {
      try { log?.event('stream_service_error', { message: clip(err?.message ?? err) }); } catch { /* ignore */ }
      if (!res.headersSent) json(res, 500, { error: 'failed' });
    }
  });
}

/**
 * The agent's side of the service: the manager interface, each call one request to `url` (a loopback URL). Calls never
 * throw; a service that is down is logged and the game goes on without a stream. With the live channel (the service
 * answers channel: true) every live game is reported again each refreshMs: a restarted service gets its games back
 * (and goes live again), and one whose agent died lets them expire. focus(id) and live() return the channel's state,
 * or null when the service has no channel or does not answer.
 */
export function createRemoteStreamManager({ url, log, timeoutMs = 5_000, refreshMs = 60_000 } = {}) {
  const base = String(url).replace(/\/+$/, '');
  const live = new Map(); // id -> offs
  const slots = new Map(); // id -> the output slot the service gave its stream
  const asks = new Map(); // id -> the PUT body (source, view, player), for focus and the refresh
  const channel = new Set(); // ids the service keeps on its live channel
  const event = (kind, data) => { try { log?.event(kind, data); } catch { /* best effort */ } };
  const call = (method, p, body) => fetch(`${base}${p}`, {
    method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  const api = {
    enabled: true,
    start(id, { source, body, player } = {}) {
      if (!source || live.has(id)) return null;
      const offs = [];
      live.set(id, offs);
      const view = viewOf(source);
      const ask = { source, ...(view && view !== id ? { view } : {}), ...(player ? { player } : {}) };
      asks.set(id, ask);
      call('PUT', `/streams/${encodeURIComponent(id)}`, { ...ask, pose: poseOf(body) }).then((r) => {
        if (r.status !== 200) { event('stream_skipped', { session: id, reason: clip(r.body?.error ?? `HTTP ${r.status}`) }); api.forget(id); return; }
        if (live.has(id) && Number.isInteger(r.body?.slot)) slots.set(id, r.body.slot);
        if (live.has(id) && r.body?.channel) channel.add(id);
      }, (err) => { event('stream_error', { session: id, message: `stream service: ${clip(err?.message ?? err)}` }); api.forget(id); });
      if (typeof body?.on === 'function') {
        try {
          offs.push(...captionsOf(body, (text) => { api.caption(id, text, poseOf(body)); }));
          offs.push(body.on('end', () => { api.stop(id); }));
        } catch { /* no captions */ }
      }
      return { id };
    },
    forget(id) {
      for (const off of live.get(id) ?? []) { try { off?.(); } catch { /* ignore */ } }
      live.delete(id);
      slots.delete(id);
      asks.delete(id);
      channel.delete(id);
    },
    /** live_view asked for this game: the channel's camera films it from now on. The channel's state, or null. */
    async focus(id) {
      const r = await call('POST', `/streams/${encodeURIComponent(id)}/focus`, asks.get(id) ?? {}).catch(() => null);
      return r?.status === 200 && r.body?.fb ? r.body : null;
    },
    /** The channel's state (GET /live), or null. */
    async live() {
      const r = await call('GET', '/live').catch(() => null);
      return r?.status === 200 && r.body?.fb ? r.body : null;
    },
    async stop(id) {
      if (!live.has(id)) return;
      api.forget(id);
      await call('DELETE', `/streams/${encodeURIComponent(id)}`).catch((err) => event('stream_error', { session: id, message: `stream service: ${clip(err?.message ?? err)}` }));
    },
    caption(id, text, pose = null) {
      if (live.has(id)) call('POST', `/streams/${encodeURIComponent(id)}/caption`, { text: cleanCaption(text), pose }).catch(() => {});
    },
    has: (id) => live.has(id),
    slot: (id) => (live.has(id) ? slots.get(id) ?? null : null),
    get size() { return live.size; },
    list: () => [...live.keys()].map((id) => ({ id })),
    stats: (id) => call('GET', `/streams/${encodeURIComponent(id)}`).then((r) => r.body, () => null),
    async stopAll() { clearInterval(refresher); await Promise.allSettled([...live.keys()].map((id) => api.stop(id))); },
  };
  const refresher = refreshMs > 0 ? setInterval(() => {
    for (const id of channel) {
      const ask = asks.get(id);
      if (ask && live.has(id)) call('PUT', `/streams/${encodeURIComponent(id)}`, ask).catch(() => {});
    }
  }, refreshMs) : null;
  refresher?.unref?.();
  return api;
}
