// scripts/stream.mjs - the live-view streamer (src/stream.js) from the command line: one stream on demand (a bot's
// first-person page to an RTMP(S) URL or an MP4 file, with its numbers printed every few seconds), or --serve, the
// stream service of deploy/compose.yaml's "stream" profile (a loopback HTTP API the agent drives through
// STREAM_SERVICE_URL; outputs come from this process's own STREAM_RTMP_URL / STREAM_OUT_DIR). With
// STREAM_SOURCE=client the service runs real-client cameras (src/camera.js, the camera container), and --camera
// records one camera stream of a player by hand.
//
//   node scripts/stream.mjs --source http://127.0.0.1:8787/eyes/<session>/ --out sample.mp4 --seconds 45
//   node scripts/stream.mjs --source URL --out rtmps://live-api-s.facebook.com:443/rtmp/<key>
//   node scripts/stream.mjs --source URL --out before.mp4 --seconds 20 --raw     # the viewer's own camera
//   node scripts/stream.mjs --source URL --out compare.mp4 --compare --width 1280 --height 360 --scale 0.75
//   STREAM_ENABLED=1 STREAM_RTMP_URL=rtmps://... node scripts/stream.mjs --serve --port 7861
//   node scripts/stream.mjs --camera --player Muse_ab12cd --out sample.mp4 --seconds 45    # in the camera container
//
// Exit codes: 0 done, 1 the stream failed, 2 bad arguments, 3 no Chromium or ffmpeg.

import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createStream, createStreamManager, createStreamService, findChromium, findFfmpeg, managerConfig, maskOutput, STREAM_DEFAULTS } from '../src/stream.js';
import { createCameraManager, createCameraRig, createCameraStream, cameraOptions, validName } from '../src/camera.js';

export const USAGE = `usage: node scripts/stream.mjs --source URL --out FILE.mp4|rtmps://... [options]
       node scripts/stream.mjs --serve [--port 7861]
       node scripts/stream.mjs --camera --player NAME --out FILE.mp4|rtmps://... [--seconds N]

  --source URL       a first-person prismarine-viewer page (the agent's /eyes/<session>/, or its local port)
  --out TARGET       an .mp4 file or an rtmp(s):// URL (default: the first of STREAM_RTMP_URL)
  --seconds N        stop after N seconds (default: at Ctrl-C)
  --width W --height H --fps N --bitrate KBPS --scale S   video size, rate and bitrate; the page renders at size x S
  --far BLOCKS       how far the bot sees (fog), default ${STREAM_DEFAULTS.far}
  --raw              the viewer's own camera (no smoothing)
  --compare          the viewer's camera on the left half, the smoothed one on the right
  --caption TEXT     a fixed caption
  --every N          print the numbers every N seconds (default 5); --json prints them as JSON lines
  --serve            the stream service (STREAM_* from the environment), listening on 127.0.0.1:--port; with
                     STREAM_SOURCE=client its streams are real-client cameras (CAMERA_*, MC_CONSOLE, MC_HOST)
  --camera           the real client spectating --player (a bot's name), from CAMERA_* / MC_* in the environment`;

export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error, env = process.env } = {}) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv, strict: true, options: {
        source: { type: 'string' }, out: { type: 'string' }, seconds: { type: 'string' }, width: { type: 'string' },
        height: { type: 'string' }, fps: { type: 'string' }, bitrate: { type: 'string' }, scale: { type: 'string' },
        far: { type: 'string' }, raw: { type: 'boolean' }, compare: { type: 'boolean' }, caption: { type: 'string' },
        every: { type: 'string' }, json: { type: 'boolean' }, serve: { type: 'boolean' }, port: { type: 'string' },
        camera: { type: 'boolean' }, player: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    }));
  } catch (err) { printErr(`${err.message}\n\n${USAGE}`); return 2; }
  if (values.help) { print(USAGE); return 0; }
  if (values.serve) return serve(values, { print, printErr, env });
  if (values.camera) return camera(values, { print, printErr, env });

  const out = values.out ?? env.STREAM_RTMP_URL?.split(',')[0]?.trim();
  if (!values.source || !out) { printErr(`--source and --out are needed\n\n${USAGE}`); return 2; }
  const num = (v, def) => (v === undefined ? def : Number(v));
  const opts = {
    width: num(values.width, STREAM_DEFAULTS.width), height: num(values.height, STREAM_DEFAULTS.height),
    fps: num(values.fps, STREAM_DEFAULTS.fps), bitrateK: num(values.bitrate, STREAM_DEFAULTS.bitrateK),
    scale: num(values.scale, STREAM_DEFAULTS.scale), far: num(values.far, STREAM_DEFAULTS.far),
  };
  for (const [k, v] of Object.entries(opts)) if (!Number.isFinite(v) || v <= 0) { printErr(`--${k} must be a positive number`); return 2; }
  const chromium = findChromium(env);
  const ffmpeg = findFfmpeg(env);
  if (!chromium || !ffmpeg) { printErr(`not found: ${[!chromium && 'Chromium (STREAM_CHROMIUM)', !ffmpeg && 'ffmpeg (STREAM_FFMPEG)'].filter(Boolean).join(', ')}`); return 3; }
  const target = /^[a-z]+:\/\//i.test(out) ? out : path.resolve(out);
  const stream = createStream({
    ...opts, source: values.source, output: target, chromium, ffmpeg, smooth: !values.raw, compare: Boolean(values.compare),
    noSandbox: env.STREAM_NO_SANDBOX === '1',
    event: (kind, data) => print(values.json ? JSON.stringify({ event: kind, ...data }) : `${kind} ${JSON.stringify(data)}`),
  });
  print(`streaming ${values.source} -> ${maskOutput(target)} (${opts.width}x${opts.height} at ${opts.fps} fps, rendered at x${opts.scale}${values.raw ? ', the viewer\'s camera' : ''}${values.compare ? ', side by side' : ''})`);
  const started = Date.now();
  let prev = null;
  const report = async () => {
    const s = await stream.stats({ resources: true });
    const t = Date.now();
    const per = (a, b) => (prev ? Math.round(((a - b) / ((t - prev.t) / 1000)) * 10) / 10 : null);
    const row = {
      t: Math.round((t - started) / 1000), state: s.state,
      pageFps: s.page && prev?.page ? per(s.page.frames, prev.page.frames) : null,
      captureFps: per(s.frames.in, prev?.frames.in ?? 0),
      written: s.frames.written, repeated: s.frames.repeated, dropped: s.frames.dropped, late: s.frames.late,
      browserCpu: s.browserTree && prev?.browserTree ? Math.round(per(s.browserTree.cpuSec, prev.browserTree.cpuSec) * 100) : null,
      browserMB: s.browserTree ? Math.round(s.browserTree.rssMB) : null,
      ffmpegCpu: s.ffmpegTree && prev?.ffmpegTree ? Math.round(per(s.ffmpegTree.cpuSec, prev.ffmpegTree.cpuSec) * 100) : null,
      ffmpegMB: s.ffmpegTree ? Math.round(s.ffmpegTree.rssMB) : null,
      triangles: s.page?.triangles ?? null, restarts: s.restarts,
    };
    prev = { t, page: s.page, frames: s.frames, browserTree: s.browserTree, ffmpegTree: s.ffmpegTree };
    print(values.json ? JSON.stringify(row) : Object.entries(row).map(([k, v]) => `${k}=${v && typeof v === 'object' ? JSON.stringify(v) : v}`).join(' '));
  };
  await stream.start();
  if (values.caption) stream.caption(values.caption);
  const timer = setInterval(() => { report().catch(() => {}); }, Math.max(1, num(values.every, 5)) * 1000);
  const seconds = num(values.seconds, 0);
  const why = await new Promise((resolve) => {
    if (seconds > 0) setTimeout(() => resolve('time'), seconds * 1000);
    process.once('SIGINT', () => resolve('SIGINT'));
    process.once('SIGTERM', () => resolve('SIGTERM'));
    stream.finished.then(() => resolve('finished'));
  });
  clearInterval(timer);
  await report().catch(() => {});
  const r = await stream.stop(why);
  print(`stopped (${why}); ${r.ok ? 'ok' : `failed: ${r.reason}`}`);
  return r.ok ? 0 : 1;
}

/** --serve: the manager from STREAM_* and the control API on loopback, until SIGINT/SIGTERM. */
async function serve(values, { print, printErr, env }) {
  const { loadConfig } = await import('../src/config.js');
  const { createLogger } = await import('../src/log.js');
  let config;
  try { config = loadConfig(env); } catch (err) { printErr(err.message); return 2; }
  const port = Number(values.port ?? env.STREAM_SERVICE_PORT ?? 7861);
  if (!Number.isInteger(port) || port < 1 || port > 65535) { printErr('--port must be a port number'); return 2; }
  const client = config.stream.source === 'client';
  if (!findFfmpeg(env) || (!client && !findChromium(env))) { printErr('no Chromium or ffmpeg found (STREAM_CHROMIUM, STREAM_FFMPEG)'); return 3; }
  const log = createLogger({ config, runId: `stream-${new Date().toISOString().replace(/[:.]/g, '-')}` });
  const manager = client ? createCameraManager({ config, log }) : createStreamManager({ config: managerConfig(config.stream), log });
  if (!manager.enabled) printErr('note: STREAM_ENABLED is off or there is no output (STREAM_RTMP_URL / STREAM_OUT_DIR): every start is refused');
  const server = createStreamService({ manager, log });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  print(`stream service on http://127.0.0.1:${port}/streams (${manager.enabled ? `up to ${config.stream.max} stream(s)${client ? ' from the real-client camera' : ''}` : 'off'})`);
  const signal = await new Promise((resolve) => { process.once('SIGINT', () => resolve('SIGINT')); process.once('SIGTERM', () => resolve('SIGTERM')); });
  print(`${signal}: stopping every stream`);
  server.close();
  await manager.stopAll(signal);
  log.close();
  return 0;
}

/** --camera: one rig and one stream of --player, numbers every --every seconds, until --seconds or Ctrl-C. */
async function camera(values, { print, printErr, env }) {
  const { loadConfig } = await import('../src/config.js');
  let config;
  try { config = loadConfig({ ...env, STREAM_SOURCE: 'client' }); } catch (err) { printErr(err.message); return 2; }
  const out = values.out ?? env.STREAM_RTMP_URL?.split(',')[0]?.trim();
  if (!validName(values.player) || !out) { printErr(`--player NAME and --out are needed\n\n${USAGE}`); return 2; }
  if (!findFfmpeg(env)) { printErr('no ffmpeg found (STREAM_FFMPEG)'); return 3; }
  const target = /^[a-z]+:\/\//i.test(out) ? out : path.resolve(out);
  const line = (kind, data) => print(values.json ? JSON.stringify({ event: kind, ...data }) : `${kind} ${JSON.stringify(data)}`);
  const rig = createCameraRig({ ...cameraOptions(config), event: line });
  const num = (v, def) => (v === undefined ? def : Number(v));
  const stream = createCameraStream({
    rig, player: values.player, output: target, fps: num(values.fps, config.stream.fps), bitrateK: num(values.bitrate, config.stream.bitrateK), event: line,
  });
  print(`camera ${config.stream.camera.auth} on ${cameraOptions(config).server}, spectating ${values.player} -> ${maskOutput(target)}`);
  if (values.caption) stream.caption(values.caption);
  const started = Date.now();
  let prev = null;
  const report = async () => {
    const s = await stream.stats({ resources: true });
    const t = Date.now();
    const per = (a, b) => (prev && a != null && b != null ? Math.round(((a - b) / ((t - prev.t) / 1000)) * 100) : null);
    const row = {
      t: Math.round((t - started) / 1000), state: s.state, camera: s.camera.state, clientFps: s.camera.clientFps, frame: s.encoder.frame,
      dup: s.encoder.dup, drop: s.encoder.drop, speed: s.encoder.speed,
      clientCpu: per(s.camera.clientTree?.cpuSec, prev?.clientTree?.cpuSec), clientMB: s.camera.clientTree ? Math.round(s.camera.clientTree.rssMB) : null,
      xvfbCpu: per(s.camera.xvfbTree?.cpuSec, prev?.xvfbTree?.cpuSec), ffmpegCpu: per(s.ffmpegTree?.cpuSec, prev?.ffmpegTree?.cpuSec),
      ffmpegMB: s.ffmpegTree ? Math.round(s.ffmpegTree.rssMB) : null,
    };
    prev = { t, clientTree: s.camera.clientTree, xvfbTree: s.camera.xvfbTree, ffmpegTree: s.ffmpegTree };
    print(values.json ? JSON.stringify(row) : Object.entries(row).map(([k, v]) => `${k}=${v}`).join(' '));
  };
  const timer = setInterval(() => { report().catch(() => {}); }, Math.max(1, num(values.every, 5)) * 1000);
  const startP = stream.start();
  const seconds = num(values.seconds, 0);
  const why = await new Promise((resolve) => {
    startP.then(() => { if (seconds > 0) setTimeout(() => resolve('time'), seconds * 1000); }, (err) => resolve(`could not start: ${err.message}`));
    process.once('SIGINT', () => resolve('SIGINT'));
    process.once('SIGTERM', () => resolve('SIGTERM'));
    stream.finished.then(() => resolve('finished'));
  });
  clearInterval(timer);
  await report().catch(() => {});
  const r = await stream.stop(why);
  await rig.stop();
  print(`stopped (${why}); ${r.ok ? 'ok' : `failed: ${r.reason}`}`);
  return r.ok ? 0 : 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exitCode = await main();
