// test/record.test.js - the recordings of the games the camera films (RECORD=on, src/recorder.js): the folder per game
// with its parts and the HUD's timeline, old ones out by age and size; the camera stream writing the clean game (a
// second ffmpeg) and the stream (the live's bytes, or the stream's own output with no live video); the live channel
// filming for the recording when Facebook is capped or for a test's game, never spending a live video on it
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanupRecordings, createRecording, cleanArgs } from '../src/recorder.js';
import { createCameraStream, CAMERA_DEFAULTS } from '../src/camera.js';
import { createGraph, createLiveChannel } from '../src/fb-live.js';
import { fakeGraph, PAGE_ID, PAGE_TOKEN } from './fake-graph.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'muse-record-'));
const until = async (fn, ms = 10_000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => { setTimeout(r, 20); }); } return false; };

test('recorder: a folder per game with its parts, the HUD\'s timeline and meta.json; the clean recording\'s ffmpeg arguments; old recordings out by age, then by size', () => {
  const root = tmp();
  let t = 1_000_000;
  const r = createRecording({ root, game: 'g0a414c', now: () => t });
  const p = r.part('live');
  assert.deepEqual([path.basename(p.clean), path.basename(p.stream), path.basename(p.flv), p.n], ['clean-1.mp4', 'stream-1.mp4', 'stream-1.flv', 1]);
  r.hud({ lines: [{ k: 'call', t: '> play' }] }, 12);
  r.snap({ now: { gameS: 13 } }, 13);
  fs.writeFileSync(p.clean, 'x'.repeat(100));
  t += 60_000;
  r.endPart(1);
  r.close();
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'g0a414c', 'meta.json'), 'utf8'));
  assert.deepEqual([meta.game, meta.parts[0].kind, meta.parts[0].cleanBytes, meta.parts[0].streamBytes], ['g0a414c', 'live', 100, 0]);
  assert.equal(new Date(meta.parts[0].endedAt) - new Date(meta.parts[0].startedAt), 60_000);
  assert.throws(() => createRecording({ root, game: '../etc' }), /not a game id/);
  const args = cleanArgs({ display: ':99.0+0,0', width: 960, height: 540, fps: 30, pulse: 'muse.monitor', out: '/r/clean-1.mp4' });
  assert.deepEqual([args[args.indexOf('-video_size') + 1], args[args.indexOf('-crf') + 1], args.includes('pulse'), args.at(-1)], ['960x540', '18', true, '/r/clean-1.mp4']);
  assert.match(args.join(' '), /-movflags \+frag_keyframe\+empty_moov/);
  // cleanup: older than keepDays first, then the oldest until under the size; the folder being written stays
  const root2 = tmp();
  for (const [g, ageDays, bytes] of [['g000001', 40, 10], ['g000002', 5, 600], ['g000003', 3, 600], ['g000004', 1, 600]]) {
    fs.mkdirSync(path.join(root2, g));
    fs.writeFileSync(path.join(root2, g, 'clean-1.mp4'), 'x'.repeat(bytes));
    const at = (Date.now() - ageDays * 86_400_000) / 1000;
    fs.utimesSync(path.join(root2, g), at, at);
  }
  fs.mkdirSync(path.join(root2, 'not-a-game'));
  const removed = cleanupRecordings(root2, { maxBytes: 1_300, keepDays: 30, keep: 'g000004' });
  assert.deepEqual(removed, ['g000001', 'g000002'], 'the old one, then the oldest over the size');
  assert.ok(fs.existsSync(path.join(root2, 'g000004')) && fs.existsSync(path.join(root2, 'not-a-game')));
});

function fakeRig() {
  const e = new EventEmitter();
  const r = {
    calls: [], state: 'joining', options: { ...CAMERA_DEFAULTS, display: 4243, followMs: 30, width: 960, height: 540 }, name: 'MuseCam',
    start() { r.calls.push('start'); setTimeout(() => { r.state = 'ready'; e.emit('joined'); }, 20); },
    waitReady() { return r.state === 'ready' ? Promise.resolve(true) : new Promise((res) => e.once('joined', () => res(true))); },
    async follow(p) { r.calls.push(`follow ${p}`); return true; },
    async keepFollowing(p) { r.calls.push(`keep ${p}`); return true; },
    async park() { r.calls.push('park'); },
    on(ev, fn) { e.on(ev, fn); return () => e.off(ev, fn); },
    async stats() { return { state: r.state, clientFps: 24 }; },
  };
  return r;
}

test('camera stream with RECORD: the clean game by a second ffmpeg, the stream\'s own output with no live video, the HUD\'s timeline; a move to another game goes on in its folder', async () => {
  const dir = tmp();
  const root = path.join(dir, 'rec');
  const log = path.join(dir, 'ffcalls');
  // a stand-in ffmpeg: its arguments to a log, the last one (the output) written as a file, finished on SIGINT
  const ffmpeg = path.join(dir, 'ffmpeg');
  fs.writeFileSync(ffmpeg, `#!/bin/sh\necho "$*" >> ${log}\nfor a; do out="$a"; done\ncase "$out" in *.mp4|*.flv) echo data > "$out";; esac\ntrap 'exit 0' INT TERM\nwhile :; do echo frame=1; echo progress=continue; sleep 0.1; done\n`, { mode: 0o755 });
  const rows = [];
  const s = createCameraStream({ rig: fakeRig(), player: 'Muse_g1', output: 'record', record: { root, game: 'g0a414c' }, ffmpeg, font: null, settleMs: 10, layout: 'ui', event: (k, d) => rows.push({ k, ...d }) });
  await s.start();
  await until(() => fs.existsSync(log) && fs.readFileSync(log, 'utf8').trim().split('\n').length >= 2);
  const calls = fs.readFileSync(log, 'utf8').trim().split('\n');
  assert.ok(calls.some((c) => / -f x11grab .* -video_size 960x540 .*clean-1\.mp4$/.test(c)), 'the clean recording at the client\'s size');
  assert.ok(calls.some((c) => /stream-1\.mp4$/.test(c)), 'the stream\'s own output in the recording');
  s.term({ lines: [{ k: 'call', t: '> play', tool: 'play' }], game: { id: 'g0a414c', s: 10 } });
  await s.follow('Muse_g2', 'g0b0b0b');
  await until(() => fs.existsSync(path.join(root, 'g0b0b0b', 'meta.json')));
  s.term({ lines: [{ k: 'call', t: '> get_state', tool: 'get_state' }] });
  await s.stop('the game ended');
  await until(() => JSON.parse(fs.readFileSync(path.join(root, 'g0a414c', 'meta.json'), 'utf8')).parts[0].endedAt);
  const m1 = JSON.parse(fs.readFileSync(path.join(root, 'g0a414c', 'meta.json'), 'utf8'));
  assert.deepEqual([m1.parts.length, m1.parts[0].kind], [1, 'record']);
  const hud1 = fs.readFileSync(path.join(root, 'g0a414c', 'hud.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(hud1[0].u.lines[0].t, '> play');
  assert.ok(Number.isFinite(hud1[0].t));
  assert.deepEqual(hud1.at(-1), { t: hud1.at(-1).t, gs: null, u: { moved: 'g0b0b0b' } });
  await until(() => JSON.parse(fs.readFileSync(path.join(root, 'g0b0b0b', 'meta.json'), 'utf8')).parts[0]?.endedAt);
  const m2 = JSON.parse(fs.readFileSync(path.join(root, 'g0b0b0b', 'meta.json'), 'utf8'));
  assert.equal(m2.parts[0].kind, 'moved');
  assert.ok(fs.readFileSync(path.join(root, 'g0b0b0b', 'hud.jsonl'), 'utf8').includes('> get_state'));
  assert.ok(rows.some((r) => r.k === 'record_start') && rows.some((r) => r.k === 'record_stop'));
  assert.throws(() => createCameraStream({ rig: fakeRig(), player: 'Muse_g1', output: 'record', ffmpeg }), /needs a recording folder/);
});

function stubStreams(fake) {
  const made = [];
  const create = (o) => {
    let done;
    const st = {
      o, player: o.player, state: 'idle', calls: [], terms: [],
      finished: new Promise((r) => { done = r; }),
      on: (e, fn) => () => {},
      async start() { st.state = 'live'; if (o.output !== 'record') setTimeout(() => fake.golive(fake.idOf(o.output)), 10); },
      async stop(why) { if (st.state === 'stopped') return; st.calls.push('stop'); st.state = 'stopped'; done({ ok: true, reason: why }); },
      async follow(p, g) { st.calls.push(`follow ${p} ${g}`); st.player = p; },
      caption() {}, term(u) { st.terms.push(u); }, pose() {}, async stats() { return { state: st.state }; },
    };
    made.push(st);
    return st;
  };
  return { create, made };
}

test('channel with RECORD: capped, the game is filmed for the recording (no live video); the cap over, it goes live; a test\'s game is filmed for the recording only; FB streams record too', async (t) => {
  const fake = await fakeGraph();
  const dir = tmp();
  let jump = 0;
  const graph = createGraph({ pageId: PAGE_ID, token: () => PAGE_TOKEN, base: fake.url, minGapMs: 0 });
  const streams = stubStreams(fake);
  const rows = [];
  const ch = createLiveChannel({ graph, createStream: streams.create, log: { event: (k, d) => rows.push({ k, ...d }) }, stateFile: path.join(dir, 's.json'), pollMs: 25, settleMs: 20, sweepMs: 40, maxPerHour: 1, maxPerDay: 5, now: () => Date.now() + jump, record: { root: path.join(dir, 'rec') } });
  t.after(async () => { await ch.stopAll(); await fake.close(); fs.rmSync(dir, { recursive: true, force: true }); });
  // one live video uses the hour
  ch.start('g000001', { player: 'Muse_a1' });
  ch.focus('g000001');
  await until(() => ch.live().state === 'live');
  assert.deepEqual(streams.made[0].o.record, { root: path.join(dir, 'rec'), game: 'g000001' }, 'the live\'s stream records too');
  await ch.stop('g000001');
  await until(() => ch.live().state === 'off');
  // capped: filmed for the recording
  ch.start('g000002', { player: 'Muse_a2' });
  ch.focus('g000002');
  await until(() => streams.made.length === 2);
  assert.equal(streams.made[1].o.output, 'record');
  assert.equal(streams.made[1].o.record.game, 'g000002');
  assert.equal(ch.live().state, 'capped', 'Muse is told the cap');
  assert.equal(ch.live().recording, true);
  assert.equal(fake.videos.size, 1, 'no live video for it');
  // the hour over: the recording-only stream gives way to a live video
  jump += 3_601_000;
  ch.focus('g000002');
  await until(() => ch.live().state === 'live', 15_000);
  assert.equal(streams.made[1].state, 'stopped');
  assert.equal(fake.videos.size, 2);
  await ch.stop('g000002');
  await until(() => ch.live().state === 'off');
  // a test's game: the recording only, whatever the cap
  ch.start('g000003', { player: 'Muse_a3' });
  ch.focus('g000003', { local: true });
  await until(() => streams.made.length === 4);
  assert.deepEqual([streams.made[3].o.output, ch.live().state], ['record', 'recording']);
  assert.equal(fake.videos.size, 2, 'never a live video for a test');
  await ch.stop('g000003');
});

test('MCP_TEST_RECORD: a test caller\'s live_view has the camera film its game for the recording only (focus local), still no live video', async (t) => {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const { loadConfig } = await import('../src/config.js');
  const { startAgent } = await import('../src/index.js');
  const focused = [];
  const streams = { enabled: true, channel: true, has: () => false, start: () => ({}), stop: async () => {}, stopAll: async () => {}, term: () => {}, caption: () => {}, pose: () => {}, list: () => [],
    focus: (id, o = {}) => { focused.push([id, o]); return { fb: true, state: o.local ? 'recording' : 'starting', game: id }; }, live: () => ({ fb: true, state: 'off' }) };
  const dir = tmp();
  for (const [record, want] of [['off', []], ['on', [{ local: true }]]]) {
    focused.length = 0;
    const agent = await startAgent({ config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '', MCP_TEST_RECORD: record }), fakeBot: true, print: () => {}, loadViewer: () => null, streams, loopStatsMs: 0 });
    const c = new Client({ name: 'muse-record-smoke', version: '1' });
    await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
    await c.callTool({ name: 'start_game', arguments: {} });
    const r = await c.callTool({ name: 'live_view', arguments: {} });
    assert.equal(r.structuredContent.state, 'test', 'the same answer: no live video');
    await until(() => focused.length === want.length);
    assert.deepEqual(focused.map(([, o]) => o), want, `MCP_TEST_RECORD=${record}`);
    await c.close();
    await agent.stop('test over');
  }
  fs.rmSync(dir, { recursive: true, force: true });
});

test('spawnEncoder tee: the live\'s bytes go to the publisher and, as they are, into the recording\'s file', async () => {
  const { spawnEncoder } = await import('../src/stream.js');
  const dir = tmp();
  const ffmpeg = path.join(dir, 'ffmpeg');
  fs.writeFileSync(ffmpeg, '#!/bin/sh\nprintf "%s" "FLV-HEADER" >&3\nsleep 0.1\nprintf "%s" "-PACKETS" >&3\nexit 0\n', { mode: 0o755 });
  const got = [];
  const createPublisher = () => {
    const em = new EventEmitter();
    return { on: (e, fn) => em.on(e, fn), input(s) { s.on('data', (d) => got.push(String(d))); }, close() {} };
  };
  const tee = path.join(dir, 'stream-1.flv');
  const { child } = spawnEncoder({ ffmpeg, args: [], output: 'rtmps://live.example/rtmp/key', stdio: ['ignore', 'ignore', 'ignore'], createPublisher, tee });
  await new Promise((r) => child.once('exit', r));
  await until(() => fs.existsSync(tee) && fs.readFileSync(tee, 'utf8') === 'FLV-HEADER-PACKETS');
  assert.equal(got.join(''), 'FLV-HEADER-PACKETS', 'the publisher got every byte');
  assert.equal(fs.readFileSync(tee, 'utf8'), 'FLV-HEADER-PACKETS', 'and the file the same');
});
