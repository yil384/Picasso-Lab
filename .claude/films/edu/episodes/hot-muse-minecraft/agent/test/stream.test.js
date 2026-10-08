// test/stream.test.js - the live-video streamer (src/stream.js, src/stream-page.js): the client patches against the
// installed prismarine-viewer, the camera smoother (irregular updates, snapped turns, gaps, teleports, wrap-around), the
// page script in a stand-in window, the constant-rate frame clock, ffmpeg's arguments, stream keys kept out of logs,
// captions from fixed words only, the manager's limits and lifecycle, the stream service and its client, the STREAM_*
// configuration and the index hook. One end-to-end run (a real headless Chromium and ffmpeg on a stand-in page, with a
// browser crash in the middle) runs with STREAM_E2E=1 (npm run test:stream) when both are installed. No Minecraft, no
// network beyond 127.0.0.1.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

import {
  patchViewerBundle, patchWorkerBundle, patchedBundle, createCameraSmoother, pageScript, PAGE_DEFAULTS,
} from '../src/stream-page.js';
import {
  ffmpegArgs, chromiumArgs, maskOutput, scrubOutputs, captionFor, cleanCaption, createFrameClock, createStreamManager,
  createStreamService, createRemoteStreamManager, validSource, managerConfig, cpuSeconds, createStream, findChromium,
  findFfmpeg, isNetworkOutput,
} from '../src/stream.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { startGuestViews } from '../src/index.js';

const require = createRequire(import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 5_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(10);
  }
}
const KEY = 'FB-123456789012345-0-AbCdEfGhIjKlMnOp';
const FB = `rtmps://live-api-s.facebook.com:443/rtmp/${KEY}`;
const deg = (r) => (r * 180) / Math.PI;

// ---------------------------------------------------------------------------------------------------------------
// patches

test('client patch: each hook lands exactly once in the installed bundle; a changed bundle is refused with the reason', () => {
  const r = patchedBundle();
  assert.equal(r.ok, true, r.error);
  assert.equal(r.js.match(/window\.__muse\.sample\(/g).length, 1, 'the first-person camera goes through __muse');
  assert.equal(r.js.match(/k\.frame\(/g).length, 1, 'the render loop asks __muse before each frame');
  assert.match(r.js, /window\.__muse&&window\.__muse\.workers\)\|\|4/);
  assert.match(r.js, /\.setFirstPersonCamera\(\w,\w,\w\)\)/, 'the original camera stays for the comparison mode');
  const broken = patchViewerBundle('const u=new r(l);/* no camera here */');
  assert.equal(broken.ok, false);
  assert.match(broken.error, /first-person camera was found 0 times/);
  const twice = patchViewerBundle('void u.setFirstPersonCamera(t,r,o);void u.setFirstPersonCamera(t,r,o)');
  assert.match(twice.error, /found 2 times/);
});

test('mesher patch: leaves skip faces against the same leaves, like glass; the installed mesher has the rule once', () => {
  const r = patchWorkerBundle('function v(e){const d=c.name.indexOf("glass")>=0;if(d&&n.type===c.type)continue}');
  assert.equal(r.ok, true);
  assert.match(r.js, /const d=c\.name\.indexOf\("glass"\)>=0\|\|c\.name\.endsWith\("_leaves"\);/);
  assert.equal(patchWorkerBundle('nothing').ok, false);
  const file = require.resolve('prismarine-viewer/public/worker.js');
  const hits = execFileSync('grep', ['-o', 'name.indexOf("glass")>=0;', file]).toString().trim().split('\n');
  assert.equal(hits.length, 1);
});

// ---------------------------------------------------------------------------------------------------------------
// the camera smoother

/** A walk at 4.3 blocks/s, one update per 50 ms tick, up to 20 ms late, and a stall: the updates of `stallMs` after
 * 2 s all arrive at its end. Updates arrive in the order they were sent (one socket). */
function walkUpdates({ stallMs = 250, seconds = 6, seed = 7 } = {}) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const updates = [];
  let last = -Infinity;
  for (let t = 0; t < seconds * 1000; t += 50) {
    let at = t + rnd() * 20;
    if (t > 2000 && t < 2000 + stallMs) at = 2000 + stallMs; // all at once
    at = Math.max(at, last + 0.5);
    last = at;
    updates.push({ at, x: (4.3 * t) / 1000 });
  }
  return updates;
}

/** Per-frame camera steps at 30 fps: through the smoother, or the updates applied as they come (the viewer). */
function frameSteps(updates, smoother) {
  const xs = [];
  let i = 0;
  let x = 0;
  for (let t = 0; t < 6400; t += 1000 / 30) {
    while (i < updates.length && updates[i].at <= t) {
      if (smoother) smoother.sample({ x: updates[i].x, y: 64, z: 0 }, 0, 0, updates[i].at); else x = updates[i].x;
      i += 1;
    }
    const p = smoother ? smoother.pose(t) : { x };
    if (p) xs.push(p.x);
  }
  return xs.slice(1).map((v, k) => v - xs[k]).slice(20, -20); // walking frames only
}

test('smoother: a walk with jittered updates and a 250 ms stall moves the camera evenly; the viewer\'s way leaps', () => {
  const expected = 4.3 / 30;
  for (const d of frameSteps(walkUpdates(), createCameraSmoother())) {
    assert.ok(Math.abs(d - expected) < expected * 0.35, `step ${d.toFixed(3)} vs ${expected.toFixed(3)}`);
  }
  const raw = frameSteps(walkUpdates(), null);
  assert.ok(Math.max(...raw) > expected * 3 && Math.min(...raw) === 0, 'without smoothing: frames that stand still and frames that leap');
  // a stall longer than the 300 ms delay shows as a short pause and an eased catch-up: never a leap or a step back
  const long = frameSteps(walkUpdates({ stallMs: 600 }), createCameraSmoother());
  assert.ok(Math.max(...long) < expected * 3.5 && Math.min(...long) >= 0, `600 ms stall: ${Math.min(...long).toFixed(3)}..${Math.max(...long).toFixed(3)}`);
  const leap = frameSteps(walkUpdates({ stallMs: 600 }), null);
  assert.ok(Math.max(...leap) > expected * 8, 'the viewer jumps the whole stall in one frame');
});

test('smoother: a snapped 170 degree turn is spread over frames, never faster than the turn limit', () => {
  const sm = createCameraSmoother({ maxTurnDeg: 270 });
  sm.sample({ x: 0, y: 64, z: 0 }, 0, 0, 0);
  sm.sample({ x: 0, y: 64, z: 0 }, 0, 0, 50);
  sm.sample({ x: 0, y: 64, z: 0 }, (170 * Math.PI) / 180, 0, 100); // pathfinder looks the other way at once
  for (let t = 150; t < 1500; t += 50) sm.sample({ x: 0, y: 64, z: 0 }, (170 * Math.PI) / 180, 0, t);
  let prev = sm.pose(0).yaw;
  let maxStep = 0;
  for (let t = 1000 / 30; t < 2500; t += 1000 / 30) {
    const y = sm.pose(t).yaw;
    maxStep = Math.max(maxStep, Math.abs(deg(y - prev)));
    prev = y;
  }
  assert.ok(maxStep <= 270 / 30 + 0.01, `at most 9 degrees a frame, got ${maxStep.toFixed(2)}`);
  assert.ok(Math.abs(deg(prev) - 170) < 2, 'it arrives');
});

test('smoother: standing still then walking starts without a jump; a teleport is a cut; yaw wraps the short way', () => {
  const sm = createCameraSmoother();
  sm.sample({ x: 0, y: 64, z: 0 }, 0, 0, 0);
  // nothing for 3 s (the bot stood still), then it walks
  for (let t = 3000; t < 4000; t += 50) sm.sample({ x: ((t - 3000) / 1000) * 4.3, y: 64, z: 0 }, 0, 0, t);
  let prev = sm.pose(2900).x;
  let maxStep = 0;
  for (let t = 2900 + 1000 / 30; t < 4200; t += 1000 / 30) { const x = sm.pose(t).x; maxStep = Math.max(maxStep, x - prev); prev = x; }
  assert.ok(maxStep < 0.25, `no leap at the start (largest step ${maxStep.toFixed(3)} blocks)`);

  const cut = createCameraSmoother();
  cut.sample({ x: 0, y: 64, z: 0 }, 0, 0, 0);
  cut.pose(100);
  cut.sample({ x: 300, y: 70, z: -40 }, 0, 0, 200); // spread or respawn
  const p = cut.pose(500);
  assert.equal(cut.cuts, 1);
  assert.deepEqual([p.x, p.z], [300, -40], 'straight to the new place, no glide across the map');

  const wrap = createCameraSmoother();
  wrap.sample({ x: 0, y: 64, z: 0 }, 3.1, 0, 0);
  wrap.sample({ x: 0, y: 64, z: 0 }, -3.1, 0, 50); // 0.08 rad across the seam, not a full turn back
  for (let t = 100; t < 1000; t += 50) wrap.sample({ x: 0, y: 64, z: 0 }, -3.1, 0, t);
  let y0 = wrap.pose(0).yaw;
  for (let t = 33; t < 1500; t += 33) { const y = wrap.pose(t).yaw; assert.ok(Math.abs(y - y0) < 0.05, 'no spin'); y0 = y; }
  assert.equal(createCameraSmoother().pose(0), null, 'no pose before the first update');
});

// ---------------------------------------------------------------------------------------------------------------
// the page script in a stand-in window

function runPage(opts) {
  let now = 0;
  const window = {};
  vm.runInNewContext(pageScript(opts), { window, performance: { now: () => now, timeOrigin: 1e12 }, Object, Math, JSON, Number, String });
  const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } });
  const camera = { position: vec(), rotation: { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } }, far: 1000, updateProjectionMatrix() {} };
  const low = { position: { y: 0 }, visible: true };
  const high = { position: { y: 64 }, visible: true };
  const magenta = { material: { color: { getHex: () => 0xff00ff } }, visible: true };
  const viewer = { camera, scene: {}, world: { sectionMeshs: { '0,0,0': low, '0,64,0': high } }, entities: { entities: { 1: magenta } } };
  return { window, viewer, camera, low, high, magenta, tick: (ms) => { now += ms; }, at: () => now };
}

test('page script: frame cap, the smoothed camera, the viewer camera when raw, sections below the band and magenta boxes hidden', () => {
  const p = runPage({ fps: 30 });
  const m = p.window.__muse;
  assert.equal(m.workers, PAGE_DEFAULTS.workers);
  assert.equal(m.frame(p.viewer, {}), true);
  p.tick(16);
  assert.equal(m.frame(p.viewer, {}), false, 'a 60 Hz tick between two 30 fps frames is skipped');
  p.tick(17);
  assert.equal(m.frame(p.viewer, {}), true);
  p.tick(200);
  assert.equal(m.frame(p.viewer, {}), true, 'after a slow frame: draw at once');
  p.tick(16);
  assert.equal(m.frame(p.viewer, {}), false, 'and no burst to catch up');
  assert.equal(p.camera.far, PAGE_DEFAULTS.far, 'the shorter view is set');

  assert.equal(m.sample({ x: 10, y: 64, z: 5 }, 1, 0.2), true, 'the viewer does not move the camera itself');
  p.tick(500);
  m.camera(p.camera);
  assert.deepEqual([p.camera.position.x, p.camera.position.z, p.camera.rotation.y], [10, 5, 1]);
  assert.ok(Math.abs(p.camera.position.y - 65.62) < 1e-9, 'eye height');
  assert.equal(p.low.visible, false, 'a section 64 blocks below the eye is not drawn');
  assert.equal(p.high.visible, true);
  m.rendered();
  m.camera(p.camera);
  assert.equal(p.magenta.visible, false);

  const raw = runPage({ smooth: false });
  assert.equal(raw.window.__muse.sample({ x: 1, y: 2, z: 3 }, 0, 0), false, 'raw: the viewer moves its own camera');
  const both = runPage({ compare: true });
  assert.equal(both.window.__muse.sample({ x: 1, y: 2, z: 3 }, 0, 0), false, 'compare: the viewer moves the left camera');
});

// ---------------------------------------------------------------------------------------------------------------
// the frame clock

test('frame clock: one frame per slot at a constant rate, the last frame again when none came, extras and late ones dropped', () => {
  const c = createFrameClock({ fps: 10, latencyMs: 0 }); // 100 ms slots
  assert.deepEqual(c.due(1000), [], 'nothing before the first frame');
  c.push(1000, 'a');
  c.push(1130, 'b');
  c.push(1160, 'c'); // b and c share a slot: c wins
  // nothing between 1200 and 1500 (a slow page)
  c.push(1530, 'd');
  const out = c.due(1600);
  assert.deepEqual(out, ['a', 'c', 'c', 'c', 'c', 'd']);
  assert.equal(c.counts.dropped, 1);
  assert.equal(c.counts.repeated, 3);
  c.push(1420, 'late');
  assert.equal(c.counts.late, 1);
  assert.deepEqual(c.due(1650), [], 'a slot is written once');
  const big = createFrameClock({ fps: 30, latencyMs: 200 });
  big.push(0, 'x');
  assert.equal(big.due(60_000).length, 90, 'a long pause never floods ffmpeg in one go');
});

// ---------------------------------------------------------------------------------------------------------------
// ffmpeg, Chromium, keys, captions

test('ffmpeg: H.264 CBR with a 2 s keyframe interval, silent 48 kHz stereo AAC, FLV to RTMPS, MP4 to a file, caption only with a font', () => {
  const a = ffmpegArgs({ output: FB, fps: 30, bitrateK: 3000, width: 1280, height: 720 });
  const after = (flag) => a[a.indexOf(flag) + 1];
  assert.equal(after('-c:v'), 'mjpeg', 'the input');
  assert.equal(a[a.lastIndexOf('-c:v') + 1], 'libx264');
  assert.equal(after('-g'), '60');
  assert.equal(after('-keyint_min'), '60');
  assert.equal(after('-sc_threshold'), '0');
  assert.equal(after('-b:v'), '3000k');
  assert.equal(after('-maxrate'), '3000k');
  assert.equal(after('-minrate'), '3000k');
  assert.equal(after('-c:a'), 'aac');
  assert.equal(after('-ar'), '48000');
  assert.equal(after('-ac'), '2');
  assert.equal(after('-f'), 'image2pipe');
  assert.equal(a[a.length - 2], 'flv');
  assert.equal(a[a.length - 1], FB);
  assert.match(after('-vf'), /^scale=1280:720:flags=bicubic,format=yuv420p$/);
  const f = ffmpegArgs({ output: '/tmp/x.mp4', fps: 24, font: '/fonts/a b.ttf', captionFile: "/tmp/it's:here.txt", scaleFlags: 'neighbor' });
  assert.equal(f[f.indexOf('-g') + 1], '48');
  assert.ok(f.includes('mp4') && f.includes('+faststart'));
  assert.match(f[f.indexOf('-vf') + 1], /flags=neighbor,drawtext=fontfile='\/fonts\/a b\.ttf':textfile='\/tmp\/it'\\''s\\:here\.txt':reload=1/);
  assert.equal(isNetworkOutput('rtmp://x/app/key'), true);
  assert.equal(isNetworkOutput('/tmp/a.mp4'), false);
});

test('chromium: SwiftShader, software compositing, DevTools over a pipe; no sandbox only when asked', () => {
  const a = chromiumArgs({ profile: '/tmp/p', width: 640, height: 360 });
  for (const flag of ['--headless', '--remote-debugging-pipe', '--use-angle=swiftshader', '--disable-gpu-compositing', '--window-size=640,360']) assert.ok(a.includes(flag), flag);
  assert.equal(a.includes('--no-sandbox'), false);
  assert.ok(chromiumArgs({ profile: '/tmp/p', width: 1, height: 1, noSandbox: true }).includes('--no-sandbox'));
});

test('stream keys: masked in what is logged, scrubbed from ffmpeg messages and from the JSONL log', () => {
  assert.equal(maskOutput(FB), 'rtmps://live-api-s.facebook.com:443/rtmp/***');
  assert.equal(maskOutput(`${FB}?s_bl=1&s_sc=secret`), 'rtmps://live-api-s.facebook.com:443/rtmp/***');
  assert.equal(maskOutput('/tmp/a.mp4'), '/tmp/a.mp4');
  const msg = `[tls] error connecting to ${FB}: I/O error\nrtmp://other.example/live/abcdefabcdef123456 failed`;
  const clean = scrubOutputs(msg, [FB]);
  assert.equal(clean.includes(KEY), false);
  assert.equal(clean.includes('abcdefabcdef123456'), false);
  assert.match(clean, /rtmps:\/\/live-api-s\.facebook\.com:443\/rtmp\/\*\*\*/);

  const config = loadConfig({ STREAM_ENABLED: '1', STREAM_RTMP_URL: FB });
  assert.equal(JSON.stringify(config).includes(KEY), false, 'the URL is not enumerable');
  const log = createLogger({ dir: null, config });
  log.event('stream_error', { message: `could not open ${FB} (key ${KEY})` });
  assert.equal(JSON.stringify(log.tail()).includes(KEY), false);
});

test('captions: fixed words from the skill and its validated names and numbers; chat text never shows', () => {
  assert.equal(captionFor({ phase: 'start', tool: 'collect', args: { block: 'oak_log', n: 3 } }), 'Collecting oak log (3)');
  assert.equal(captionFor({ phase: 'start', tool: 'go_to', args: { x: -133, y: 70, z: 45 } }), 'Walking to -133 70 45');
  assert.equal(captionFor({ phase: 'start', tool: 'craft', args: { item: 'crafting_table', n: 1 } }), 'Crafting crafting table');
  assert.equal(captionFor({ phase: 'start', tool: 'say', args: { text: 'visit evil.example now' } }), 'Chatting');
  assert.equal(captionFor({ phase: 'start', tool: 'build', args: { blueprint: 'hut_3x3', material: 'oak_planks' } }), 'Building a hut 3x3 from oak planks');
  assert.equal(captionFor({ phase: 'end', tool: 'collect', args: {} }), '');
  assert.equal(captionFor({ phase: 'start', tool: 'get_state', args: {} }), '');
  assert.equal(cleanCaption('Walking %{pts} \\n to: <b>x</b>'), "Walking pts n to b x b");
});

test('ps CPU times: every format ps prints', () => {
  assert.equal(cpuSeconds('0:01.50'), 1.5);
  assert.equal(cpuSeconds('12:03.25'), 723.25);
  assert.equal(cpuSeconds('01:02:03'), 3723);
  assert.equal(cpuSeconds('2-01:00:00'), 2 * 86_400 + 3600);
  assert.equal(cpuSeconds('junk'), 0);
});

// ---------------------------------------------------------------------------------------------------------------
// the manager, the service and its client

function fakeStreams() {
  const made = [];
  const create = (o) => {
    let done;
    const s = {
      o, state: 'idle', captions: [], poses: [], stopped: null,
      finished: new Promise((r) => { done = r; }),
      async start() { s.state = 'live'; },
      async stop(reason) { if (s.state === 'stopped') return s.finished; s.state = 'stopped'; s.stopped = reason; done({ ok: true }); return s.finished; },
      caption(t) { s.captions.push(t); },
      pose(p) { s.poses.push(p); },
      async stats() { return { state: s.state }; },
      fail() { s.state = 'failed'; done({ ok: false }); },
    };
    made.push(s);
    return s;
  };
  return { made, create };
}

function fakeBody() {
  const e = new EventEmitter();
  return { on(event, fn) { e.on(event, fn); return () => e.off(event, fn); }, emit: (...a) => e.emit(...a), count: (ev) => e.listenerCount(ev) };
}

test('manager: off unless enabled; one stream per game, at most max and one per output URL; caption and end from the body', async () => {
  const off = createStreamManager({ config: { enabled: false, outputs: [FB], max: 1 } });
  assert.equal(off.start('g1', { source: 'http://127.0.0.1:1/eyes/g1/' }), null);

  const { made, create } = fakeStreams();
  const log = { rows: [], event(kind, data) { this.rows.push({ kind, ...data }); } };
  const m = createStreamManager({ config: { enabled: true, outputs: [FB, `${FB}2`], max: 4 }, log, create });
  const b1 = fakeBody();
  const s1 = m.start('g1', { source: 'http://127.0.0.1:1/eyes/g1/', body: b1 });
  assert.equal(m.start('g1', { source: 'x' }), s1, 'the same game: the same stream');
  m.start('g2', { source: 'http://127.0.0.1:2/eyes/g2/' });
  assert.equal(m.start('g3', { source: 'http://127.0.0.1:3/eyes/g3/' }), null, 'two URLs, two streams');
  assert.ok(log.rows.some((r) => r.kind === 'stream_skipped' && /output URL/.test(r.reason)));
  assert.deepEqual(made.map((s) => s.o.output), [FB, `${FB}2`]);
  assert.deepEqual([m.slot('g1'), m.slot('g2'), m.slot('g3')], [0, 1, null], 'which output URL each game\'s stream holds');
  assert.equal(JSON.stringify(m.list()).includes(KEY), false, 'list() masks the keys');

  b1.emit('skill', { phase: 'start', tool: 'collect', args: { block: 'oak_log', n: 2 } });
  b1.emit('skill', { phase: 'end', tool: 'collect', args: {} });
  assert.deepEqual(made[0].captions, ['Collecting oak log (2)', '']);
  b1.emit('end', {});
  await until(() => made[0].state === 'stopped' && !m.has('g1'));
  assert.equal(made[0].stopped, 'the game ended');
  assert.equal(b1.count('skill'), 0, 'listeners removed');
  assert.ok(m.start('g3', { source: 'http://127.0.0.1:3/eyes/g3/' }), 'its URL is free again');
  assert.equal(made[2].o.output, FB);

  made[1].fail(); // a stream that gives up frees its slot
  await until(() => !m.has('g2'));
  const capped = createStreamManager({ config: { enabled: true, outDir: '/tmp/streams', max: 1 }, log, create });
  assert.ok(capped.start('a', { source: 's' }));
  assert.match(made.at(-1).o.output, /^\/tmp\/streams\/stream-a-.*\.mp4$/);
  assert.equal(capped.start('b', { source: 's' }), null, 'never more than max');
  await m.stopAll();
  await capped.stopAll();
  assert.equal(m.size + capped.size, 0);
  const mc = managerConfig(loadConfig({ STREAM_ENABLED: '1', STREAM_RTMP_URL: FB, STREAM_FPS: '24' }).stream);
  assert.deepEqual([mc.enabled, mc.outputs, mc.max, mc.options.fps], [true, [FB], 1, 24]);
});

test('manager: a stream that is still closing keeps its output URL, so two never push to one stream key', async () => {
  let finish;
  const slow = (o) => {
    let done;
    const st = {
      o, state: 'live', finished: new Promise((r) => { done = r; }), async start() {}, caption() {}, pose() {},
      stop() { return new Promise((r) => { finish = () => { st.state = 'stopped'; done({ ok: true }); r(); }; }); },
    };
    return st;
  };
  const m = createStreamManager({ config: { enabled: true, outputs: [FB], max: 2 }, create: slow });
  assert.ok(m.start('g1', { source: 's' }));
  const stopping = m.stop('g1');
  assert.equal(m.has('g1'), false);
  assert.equal(m.start('g2', { source: 's' }), null, 'the only URL is still in use while g1 closes');
  finish();
  await stopping;
  assert.ok(m.start('g2', { source: 's' }), 'free once g1 is down');
});

test('service and client: the agent starts, captions and stops a stream over loopback; only local eyes pages are accepted', async () => {
  const { made, create } = fakeStreams();
  const manager = createStreamManager({ config: { enabled: true, outputs: [FB], max: 2 }, create });
  const server = createStreamService({ manager });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(validSource('http://127.0.0.1:3201/eyes/g1/', 'g1'), true);
    for (const bad of ['http://10.0.0.5:3201/eyes/g1/', 'http://127.0.0.1:3201/eyes/g2/', 'file:///etc/passwd', 'http://127.0.0.1:3201/eyes/g1/?x=1', 'nonsense']) {
      assert.equal(validSource(bad, 'g1'), false, bad);
    }
    const put = await fetch(`${url}/streams/g1`, { method: 'PUT', body: JSON.stringify({ source: 'http://evil.example/eyes/g1/' }) });
    assert.equal(put.status, 400);

    const view = 'Q7f3kA9xZ2mN0pL5wR8tYb';
    assert.equal(validSource(`http://127.0.0.1:3201/eyes/${view}/`, view), true, 'a game\'s page under its view id');
    assert.equal(validSource(`http://127.0.0.1:3201/eyes/${view}/`, 'g1'), false);
    assert.equal(validSource('http://127.0.0.1:3201/eyes/../', '..'), false);
    const client = createRemoteStreamManager({ url });
    const body = fakeBody();
    client.start('g1', { source: `http://127.0.0.1:3201/eyes/${view}/`, body });
    await until(() => made.length === 1 && made[0].state === 'live');
    assert.equal(made[0].o.output, FB, 'the output is the service\'s own');
    assert.equal(made[0].o.source, `http://127.0.0.1:3201/eyes/${view}/`);
    await until(() => client.slot('g1') === 0);
    assert.equal(client.slot('g2'), null);
    body.bot = { entity: { position: { x: 5, y: 70, z: -2 }, yaw: 1.5, pitch: 0 } };
    body.emit('skill', { phase: 'start', tool: 'go_to', args: { x: 1, y: 2, z: 3 } });
    await until(() => made[0].captions.length === 1);
    assert.equal(made[0].captions[0], 'Walking to 1 2 3');
    assert.deepEqual(made[0].poses, [{ x: 5, y: 70, z: -2, yaw: 1.5, pitch: 0 }], 'the bot\'s pose goes along, for a page that has none yet');
    const list = await (await fetch(`${url}/streams`)).json();
    assert.deepEqual(list.streams.map((s) => s.id), ['g1']);
    body.emit('end', {});
    await until(() => made[0].state === 'stopped');
    assert.equal(client.size, 0);

    // a service that is down: the game goes on, the failure is logged
    const log = { rows: [], event(kind, data) { this.rows.push({ kind, ...data }); } };
    const dead = createRemoteStreamManager({ url: 'http://127.0.0.1:9/', log, timeoutMs: 500 });
    dead.start('g9', { source: 'http://127.0.0.1:1/eyes/g9/' });
    await until(() => log.rows.some((r) => r.kind === 'stream_error'));
    assert.equal(dead.size, 0);
  } finally {
    server.close();
  }
});

test('config: STREAM_* off by default, checked, the URLs hidden; enabling needs an output', () => {
  const c = loadConfig({});
  assert.equal(c.stream.enabled, false);
  assert.deepEqual(c.stream.outputs, []);
  const on = loadConfig({ STREAM_ENABLED: 'true', STREAM_RTMP_URL: `${FB}, rtmp://a.example/live/k2`, STREAM_MAX: '2', STREAM_SCALE: '0.75' });
  assert.equal(on.stream.outputs.length, 2);
  assert.equal(on.stream.scale, 0.75);
  assert.equal(Object.keys(on.stream).includes('outputs'), false);
  assert.throws(() => loadConfig({ STREAM_ENABLED: '1' }), /STREAM_ENABLED needs STREAM_RTMP_URL/);
  assert.throws(() => loadConfig({ STREAM_RTMP_URL: 'https://example.com/x' }), /STREAM_RTMP_URL must be rtmp/);
  assert.throws(() => loadConfig({ STREAM_SERVICE_URL: 'http://10.0.0.2:7861' }), /STREAM_SERVICE_URL must be an http URL on this machine/);
  assert.throws(() => loadConfig({ STREAM_FPS: '60' }), /STREAM_FPS/);
  assert.equal(loadConfig({ STREAM_ENABLED: '1', STREAM_SERVICE_URL: 'http://127.0.0.1:7861' }).stream.serviceUrl, 'http://127.0.0.1:7861');
  // the live videos' public URLs (live_view embed), Facebook only
  assert.deepEqual(loadConfig({}).stream.videoUrls, []);
  assert.deepEqual(loadConfig({ STREAM_VIDEO_URL: 'https://www.facebook.com/picassolab/videos/1/, https://fb.watch/abc/' }).stream.videoUrls, ['https://www.facebook.com/picassolab/videos/1/', 'https://fb.watch/abc/']);
  for (const bad of ['http://www.facebook.com/x', 'https://evil.example/facebook.com', 'https://facebook.com.evil.example/x']) {
    assert.throws(() => loadConfig({ STREAM_VIDEO_URL: bad }), /STREAM_VIDEO_URL must be https URLs of Facebook live videos/, bad);
  }
});

test('index hook: the stream starts from the first-person view once it listens, with the session id in the page path', async () => {
  const config = loadConfig({});
  const log = createLogger({ dir: null, config });
  const fakeViewer = {
    mineflayer(bot, o) {
      const server = http.createServer().listen(o.port, '127.0.0.1');
      bot.viewer = new EventEmitter();
      bot.viewer.close = () => server.close();
    },
  };
  const free = () => new Promise((r) => { const s = http.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => r(port)); }); });
  const [w, e] = [await free(), await free()];
  const ports = { pairs: [{ watch: w, eyes: e }], take() { return this.pairs.shift() ?? null; }, free(p) { this.pairs.push(p); } };
  const body = Object.assign(new EventEmitter(), { bot: {}, connected: true });
  const seen = [];
  startGuestViews(body, 'g7', { log, ports, load: () => fakeViewer, onEyes: (port) => seen.push(`http://127.0.0.1:${port}/eyes/g7/`) });
  await until(() => seen.length === 1);
  assert.equal(seen[0], `http://127.0.0.1:${e}/eyes/g7/`);
  assert.equal(validSource(seen[0], 'g7'), true, 'what the hook sends is what the service accepts');
  body.emit('end');

  // with the game's view id, both views listen under it and the stream's page is the view id's
  const [w2, e2] = [await free(), await free()];
  ports.pairs = [{ watch: w2, eyes: e2 }];
  const prefixes = [];
  const viewer2 = { mineflayer(bot, o) { prefixes.push(o.prefix); fakeViewer.mineflayer(bot, o); } };
  const body2 = Object.assign(new EventEmitter(), { bot: {}, connected: true });
  const paths = [];
  startGuestViews(body2, 'g8', { log, ports, load: () => viewer2, viewId: 'Q7f3kA9xZ2mN0pL5wR8tYb', onEyes: (port, p) => paths.push(p) });
  await until(() => paths.length === 1);
  assert.deepEqual(prefixes, ['/watch/Q7f3kA9xZ2mN0pL5wR8tYb', '/eyes/Q7f3kA9xZ2mN0pL5wR8tYb']);
  assert.deepEqual(paths, ['/eyes/Q7f3kA9xZ2mN0pL5wR8tYb/']);
  body2.emit('end');
});

// ---------------------------------------------------------------------------------------------------------------
// end to end: a real browser and ffmpeg on a stand-in page

test('end to end: a stand-in page to an MP4 at 1280x720 30 fps with AAC; a browser crash is restarted and the video goes on', { timeout: 90_000 }, async (t) => {
  // a browser and a 720p encoder for ~15 s load the machine and slow the timing tests that run alongside: on demand only
  if (process.env.STREAM_E2E !== '1') { t.skip('set STREAM_E2E=1 (npm run test:stream)'); return; }
  const chromium = findChromium();
  const ffmpeg = findFfmpeg();
  const ffprobe = ffmpeg && path.join(path.dirname(ffmpeg), 'ffprobe');
  if (!chromium || !ffmpeg || !fs.existsSync(ffprobe)) { t.skip('no Chromium, ffmpeg or ffprobe here'); return; }
  const page = '<!doctype html><body style="margin:0"><canvas id="c" width="640" height="360"></canvas><script>'
    + 'const g=document.getElementById("c").getContext("2d");let n=0;(function f(){n++;g.fillStyle="#3a7a3a";g.fillRect(0,0,640,360);'
    + 'g.fillStyle="#f4f1ea";g.fillRect((n*4)%600,150,40,40);requestAnimationFrame(f)})()</script>';
  const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end(page); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-stream-test-'));
  const out = path.join(dir, 'out.mp4');
  const events = [];
  const stream = createStream({
    source: `http://127.0.0.1:${server.address().port}/eyes/gtest/`, output: out, chromium, ffmpeg, worldWaitMs: 300,
    pose: () => ({ x: 1, y: 64, z: 2, yaw: 0.5, pitch: 0 }),
    event: (kind, data) => events.push({ kind, ...data }),
  });
  try {
    await stream.start();
    await until(() => stream.state === 'live', 20_000);
    stream.caption('Collecting oak log (3)');
    await until(async () => (await stream._evaluate('window.__muse.info().samples')) === 1, 5_000); // the pose it was given
    await sleep(2_000);
    stream._killBrowser();
    await until(() => events.some((e) => e.kind === 'stream_browser_restart'), 10_000);
    await until(() => events.filter((e) => e.kind === 'stream_browser').length === 2, 30_000);
    await sleep(1_500);
    const s = await stream.stats();
    assert.equal(s.restarts.browser, 1);
    await stream.stop('test over');
    const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', out]).toString());
    const v = probe.streams.find((x) => x.codec_name === 'h264');
    const a = probe.streams.find((x) => x.codec_name === 'aac');
    assert.deepEqual([v.width, v.height, v.r_frame_rate], [1280, 720, '30/1']);
    assert.deepEqual([a.sample_rate, a.channels], ['48000', 2]);
    const stop = events.find((e) => e.kind === 'stream_stop');
    assert.ok(stop.frames.written >= 30 * 4, `frames went on during the restart (${stop.frames.written})`);
    assert.ok(stop.frames.repeated > 0, 'the last frame held while the browser was away');
    assert.equal(stop.frames.encoderDrops, 0);
  } finally {
    await stream.stop('cleanup');
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
