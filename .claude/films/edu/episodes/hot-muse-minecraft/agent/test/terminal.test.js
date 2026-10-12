// test/terminal.test.js - the terminal under the vertical live video: the agent's lines (src/terminal.js: what is
// shown and what never is, the feed of calls and replies, advice once per change, reflexes and deaths once, milestones,
// a portal), the camera's panel (src/terminal-panel.js: a PNG of the panel's size, wrapping, newest at the bottom), the
// vertical layout in ffmpeg, the term field of the caption endpoint (cleaned again there), the channel's filter (the
// filmed game only), MCP calls turned into lines, live_view's page at the video's shape, and the configuration; end to
// end, a camera stream in the vertical layout to an MP4 of 1080x1920.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { clean, callLine, resultLine, clockText, statusText, createTermFeed, cleanTerm, KINDS } from '../src/terminal.js';
import { createTerminalPanel, findMonoFont } from '../src/terminal-panel.js';
import { ffmpegArgs, createStreamService, createRemoteStreamManager, createStreamManager, findFfmpeg } from '../src/stream.js';
import { createCameraStream } from '../src/camera.js';
import { liveViewHtml } from '../src/live-page.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(20);
  }
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'muse-term-'));

test('lines: ASCII only, never another player\'s name, an address, a link or a token; item names stay', () => {
  assert.equal(clean('mined 8 oak_log near Muse_aB3dE9fGh2k at 10.77.77.11:25565, see https://x.example/a?b, key EAAPageTok3n0123456789abcdef, caf\u00e9 \u2764'),
    'mined 8 oak_log near a player at [addr], see [link] key ***, caf');
  assert.equal(clean('chiseled_polished_blackstone_bricks and oak_planks and deepslate_iron_ore'), 'chiseled_polished_blackstone_bricks and oak_planks and deepslate_iron_ore');
  assert.equal(clean('a\nb\tc   d'), 'a b c  d');
  assert.equal(clean('x'.repeat(500)).length, 240);
});

test('lines: calls abbreviated, results by what they did, failures with their code, the clock, the status bar', () => {
  assert.deepEqual(callLine('play_sequence', { steps: [{ skill: 'collect', args: { block: 'oak_log', n: 8 } }, { skill: 'craft', args: { item: 'wooden_pickaxe' } }] }), { k: 'call', t: '> play_sequence: collect oak_log 8, craft wooden_pickaxe', say: 'Mine 8 oak logs, then craft a wooden pickaxe', tool: 'play_sequence', of: 2, steps: [{ say: 'Mine 8 oak logs', raw: 'collect oak_log 8' }, { say: 'Craft a wooden pickaxe', raw: 'craft wooden_pickaxe' }] });
  assert.equal(callLine('play_sequence', { steps: Array.from({ length: 7 }, () => ({ skill: 'eat', args: {} })) }).t, '> play_sequence: eat, eat, eat, eat, +3 more');
  assert.equal(callLine('play', { skill: 'collect', block: 'stone', n: 3 }).t, '> play: collect stone 3', 'flat args');
  assert.equal(callLine('get_state', {}).t, '> get_state');
  assert.deepEqual(resultLine({ skill: 'collect', args: { block: 'oak_log', n: 8 }, status: 'confirmed', result: 'mined 8 oak_log and picked up 8 oak_log (8 of 8 wanted)', ms: 12_340 }), { k: 'ok', t: 'ok  mined 8 oak log (12 s)', say: 'Mine 8 oak logs', ms: 12_340 });
  assert.equal(resultLine({ skill: 'craft', args: { item: 'wooden_pickaxe' }, status: 'confirmed', result: 'crafted 1 wooden_pickaxe at a crafting table put down at 14 70 -38', ms: 2_400 }).t, 'ok  crafted 1 wooden pickaxe (2.4 s)');
  assert.deepEqual(resultLine({ skill: 'collect', args: { block: 'iron_ore', n: 3 }, status: 'failed', code: 'NOT_FOUND', result: 'no iron_ore within 64 blocks; stone is 3 blocks down', ms: 1_200 }), { k: 'fail', t: 'FAIL collect iron ore 3 NOT_FOUND: no iron ore within 64 blocks (1.2 s)', say: 'Mine 3 iron ore', ms: 1_200, why: 'no iron ore within 64 blocks' });
  assert.equal(resultLine({ skill: 'eat', args: {}, status: 'cancelled', why: 'an earlier step failed' }).t, 'skip eat: an earlier step failed');
  assert.equal(resultLine({ skill: 'eat', args: {}, status: 'pending' }), null);
  assert.deepEqual([clockText(0), clockText(6_000), clockText(13_000), clockText(18_000), clockText(23_500), clockText(24_250)], ['DAY 06:00', 'DAY 12:00', 'NIGHT 19:00', 'NIGHT 00:00', 'DAY 05:30', 'DAY 06:15']);
  assert.equal(statusText({ health: 17.6, food: 17, time: 2_250 }, { muse: 47, reflex: 4, musePct: 92 }), 'HP 18/20  FOOD 17/20  DAY 08:15  |  Muse 47 | Reflex 4 | 92% Muse');
  assert.equal(statusText({ health: 20, food: 20, time: 1, dimension: 'minecraft:the_nether' }, null), 'HP 20/20  FOOD 20/20  NETHER');
  assert.equal(statusText(null, null), '');
});

test('feed: a call, then its results once; advice when it changes; reflexes and deaths once; milestones the first time; a portal; the last state kept', () => {
  const sent = [];
  let clock = 1_000_000;
  let dimension = 'overworld';
  const feed = createTermFeed({ send: (id, u) => sent.push({ id, ...u }), now: () => clock });
  const game = { id: 'g1', body: { attribution: () => ({ muse: 3, reflex: 1, musePct: 75 }), snapshot: () => ({ dimension }) } };
  const reply = (st) => ({ content: [{ type: 'text', text: 'x' }], structuredContent: st });
  feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: { health: 20, food: 20, time: 0 } }));
  assert.deepEqual(sent.at(-1), { id: 'g1', lines: [{ k: 'call', t: '> start_game', say: 'Start a new game', tool: 'start_game' }], status: 'HP 20/20  FOOD 20/20  DAY 06:00  |  Muse 3 | Reflex 1 | 75% Muse', st: { hp: 20, food: 20, clock: 'DAY 06:00', ticks: 0, muse: 3, reflex: 1, pct: 75 }, live: { mode: 'idle', reason: 'waiting' }, sub: null, game: { id: 'g1', s: 0 } });
  feed.call(game, 'play_sequence', { steps: [{ skill: 'collect', args: { block: 'oak_log', n: 3 } }, { skill: 'craft', args: { item: 'wooden_pickaxe' } }] });
  assert.equal(sent.at(-1).lines[0].t, '> play_sequence: collect oak_log 3, craft wooden_pickaxe');
  assert.match(sent.at(-1).status, /^HP 20\/20/, 'the last state, though the call carries none');
  const s1 = { call: 1, n: 1, skill: 'collect', args: { block: 'oak_log', n: 3 }, status: 'confirmed', result: 'mined 3 oak_log', ms: 9_000 };
  const s2 = { call: 1, n: 2, skill: 'craft', args: { item: 'wooden_pickaxe' }, status: 'running' };
  const advice = [{ kind: 'night', text: 'night in 45 s, no shelter, no shield' }];
  clock += 41_000;
  feed.reply(game, 'play_sequence', {}, reply({ steps: [s1, s2], advice, state: { health: 18, food: 19, time: 12_250 } }));
  assert.deepEqual(sent.at(-1).lines, [{ k: 'ok', t: 'ok  mined 3 oak log (9 s)', say: 'Mine 3 oak logs', ms: 9_000, n: 1, of: 2, c: 1 }, { k: 'advice', t: 'advice: night in 45 s, no shelter, no shield', ak: 'night' }]);
  assert.equal(sent.at(-1).bind, 1, 'the call this reply answered');
  assert.equal(sent.at(-1).game.s, 41, 'the game\'s age');
  assert.deepEqual(sent.at(-1).adv, [{ k: 'night', t: 'night in 45 s, no shelter, no shield', sev: 1 }], 'the advice as it stands, one per kind');
  feed.call(game, 'get_state', {});
  feed.reply(game, 'get_state', {}, reply({
    steps: [], earlier: [s1, { ...s2, status: 'confirmed', result: 'crafted 1 wooden_pickaxe', ms: 2_000, gained: { wooden_pickaxe: 1 } }], advice,
    onItsOwn: [{ seq: 4, source: 'reflex', kind: 'defend', text: 'defending itself (zombie)' }, { seq: 5, source: 'reflex', kind: 'death', text: 'died: slain by a zombie at 10 64 -3' }],
    state: { health: 20, food: 20, time: 13_100 },
  }));
  assert.deepEqual(sent.at(-1).lines.map(({ k, t }) => ({ k, t })), [
    { k: 'ok', t: 'ok  crafted 1 wooden pickaxe (2 s)' }, { k: 'milestone', t: 'milestone: a wooden pickaxe at 0:41' },
    { k: 'reflex', t: 'reflex: defending itself (zombie)' }, { k: 'fail', t: 'death: died: slain by a zombie at 10 64 -3' },
    { k: 'checked', t: 'Muse checked: HP 20, food 20, dawn in 8 min' },
  ], 'the first step not twice, the same advice not again; what Muse saw when it looked');
  assert.match(sent.at(-1).status, /NIGHT 19:06/);
  // a portal: the line, and NETHER in the status bar
  dimension = 'minecraft:the_nether';
  feed.reply(game, 'get_state', {}, reply({ steps: [], advice: [], onItsOwn: [{ seq: 5, source: 'reflex', kind: 'death', text: 'old' }], state: { health: 20, food: 20, time: 13_200 } }));
  assert.deepEqual(sent.at(-1).lines, [{ k: 'checked', t: 'Muse checked: HP 20, food 20, in the Nether' }, { k: 'milestone', t: 'entered the Nether at 0:41' }], 'a reply adds no call line (only start_game\'s)');
  assert.match(sent.at(-1).status, /  NETHER  \|/);
  // a refused call, and the end
  feed.call(game, 'play', { skill: 'craft', args: { item: 'iron_pickaxe' } });
  feed.reply(game, 'play', {}, { isError: true, content: [{ type: 'text', text: 'Missing items: 3 iron_ingot\nmore' }], structuredContent: { code: 'NEED_ITEMS', steps: [] } });
  assert.deepEqual(sent.at(-1).lines, [{ k: 'fail', t: 'FAIL NEED_ITEMS Missing items: 3 iron_ingot', why: 'missing items: 3 iron ingot' }]);
  feed.call(game, 'end_game', {});
  feed.reply(game, 'end_game', {}, reply({}));
  assert.deepEqual(sent.at(-1).lines.at(-1), { k: 'info', t: 'game over after 0:41' });
  // what comes in from outside is checked again
  assert.deepEqual(cleanTerm({ lines: [{ k: 'ok', t: 'ok  fine' }, { k: 'evil', t: 'x' }, { k: 'call', t: 42 }, { k: 'info', t: 'near Muse_aB3dE9fGh2k' }], status: 'HP 1/20\n' }),
    { lines: [{ k: 'ok', t: 'ok  fine' }, { k: 'info', t: 'near a player' }], status: 'HP 1/20' });
  assert.ok(KINDS.includes('milestone'));
});

/** The width and height of a PNG from its header. */
const pngSize = (file) => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

test('panel: a PNG of its size, long lines wrapped and indented, the newest at the bottom, reset for another game', async () => {
  const dir = tmp();
  const file = path.join(dir, 'panel.png');
  const p = createTerminalPanel({ width: 1080, height: 1312, file, font: findMonoFont(), minIntervalMs: 20 });
  p.render();
  assert.deepEqual(pngSize(file), [1080, 1312]);
  assert.ok(p.cols >= 45 && p.cols <= 60, `${p.cols} columns`);
  assert.ok(p.rows >= 22, `${p.rows} rows`);
  p.push([{ k: 'call', t: `> play_sequence: ${'collect oak_log 8, '.repeat(6)}` }, { k: 'ok', t: 'ok  mined 8 oak log (12 s)' }]);
  const lines = p.lines();
  assert.ok(lines.length >= 3 && lines[1].t.startsWith('    '), 'wrapped, indented');
  assert.ok(lines.every((l) => l.t.length <= p.cols));
  assert.deepEqual(lines.at(-1), { k: 'ok', t: 'ok  mined 8 oak log (12 s)' });
  const before = p.renders;
  p.status('HP 20/20  FOOD 20/20  DAY 06:00  |  Muse 1 | Reflex 0 | 100% Muse');
  await until(() => p.renders > before);
  for (let i = 0; i < 200; i++) p.push([{ k: 'info', t: `line ${i}` }]);
  assert.ok(p.lines().length <= p.rows * 4);
  assert.equal(p.lines().at(-1).t, 'line 199');
  p.reset('the camera moved to another game');
  assert.deepEqual(p.lines(), [{ k: 'info', t: 'the camera moved to another game' }]);
  p.stop();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('ffmpeg: the vertical layout puts the game on top and overlays the panel image under it; the landscape one is as before', () => {
  const a = ffmpegArgs({ output: 'rtmps://h/rtmp/KEY', width: 1080, height: 1920, panel: { file: '/w/panel.png', top: 608 }, x11: { display: ':99.0+0,0', width: 960, height: 540 }, font: '/f.ttf', captionFile: '/w/c.txt' });
  assert.equal(a.includes('image2'), false, 'the panel is no input of its own');
  assert.equal(a.includes('-filter_complex'), false);
  assert.deepEqual(a.slice(a.indexOf('-map'), a.indexOf('-map') + 4), ['-map', '0:v', '-map', '1:a']);
  const vf = a[a.indexOf('-vf') + 1];
  assert.match(vf, /^\[in\]setpts=PTS-STARTPTS,scale=1080:608:flags=bicubic,drawtext=.*:y=h-th-34,pad=1080:1920:0:0:color=0x0B0D0F,format=yuv420p\[top\];movie='\/w\/panel\.png':f=image2:loop=0,setpts=N\/\(4\*TB\),scale=1080:1312,format=yuv420p\[pan\];\[top\]\[pan\]overlay=0:608:format=yuv420\[out\]$/);
  const l = ffmpegArgs({ output: '/tmp/x.mp4', x11: { display: ':99.0+0,0', width: 960, height: 540 } });
  assert.equal(l.includes('-filter_complex'), false);
  assert.deepEqual(l.slice(l.indexOf('-map'), l.indexOf('-map') + 4), ['-map', '0:v', '-map', '1:a']);
});

test('feed: start_game\'s reply carries no state: the status line has health, food and the clock from the body at once', () => {
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push({ id, ...u }) });
  const text = { content: [{ type: 'text', text: 'New game' }] };
  const bot = { id: 'g7', status: 'ready', body: { bot: { entity: {}, health: 19.6, food: 18, time: { timeOfDay: 1000 } }, attribution: () => ({ muse: 0, reflex: 0 }) } };
  feed.reply(bot, 'start_game', { adult: true }, text);
  assert.deepEqual(sent.at(-1), { id: 'g7', lines: [{ k: 'call', t: '> start_game', say: 'Start a new game', tool: 'start_game' }], status: 'HP 20/20  FOOD 18/20  DAY 07:00  |  Muse 0 | Reflex 0', st: { hp: 20, food: 18, clock: 'DAY 07:00', ticks: 1000, muse: 0, reflex: 0 }, live: { mode: 'idle', reason: 'waiting' }, sub: null, game: { id: 'g7', s: 0 } });
  const mineai = { id: 'g8', status: 'ready', body: { snapshot: () => ({ health: 20, food: 20, timeOfDay: 0, dimension: 'overworld' }) } };
  feed.reply(mineai, 'start_game', { adult: true }, text);
  assert.equal(sent.at(-1).status, 'HP 20/20  FOOD 20/20  DAY 06:00');
  const joining = { id: 'g9', status: 'joining', body: { snapshot: () => ({ health: 0, food: 0 }) } };
  feed.reply(joining, 'start_game', { adult: true }, text);
  assert.equal(sent.at(-1).status, '', 'a bot still joining: no made-up numbers');
});

test('service, client, manager and channel: the term field of the caption endpoint, cleaned again, for the filmed game only', async (t) => {
  const got = [];
  const stream = { finished: new Promise(() => {}), async start() {}, async stop() {}, caption() {}, pose() {}, term: (u) => got.push(u), stats: async () => ({}) };
  const manager = createStreamManager({ config: { enabled: true, outDir: '/tmp/x', max: 1 }, create: () => stream });
  const server = createStreamService({ manager });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const remote = createRemoteStreamManager({ url, refreshMs: 0 });
  t.after(async () => { await remote.stopAll(); server.close(); });
  // start_game's lines can come before the service has taken the game's stream: held, then sent first
  remote.term('g1', { lines: [{ k: 'call', t: '> start_game' }], status: 'HP 20/20  FOOD 20/20' });
  remote.start('g1', { source: 'http://127.0.0.1:3201/eyes/AAAAAAAAAAAAAAAAAAAAAA/', player: 'Muse_aaaa' });
  await until(() => manager.has('g1'));
  remote.term('g1', { lines: [{ k: 'call', t: '> get_state' }, { k: 'ok', t: 'token EAAPageTok3n0123456789abcdef' }, { k: 'nope', t: 'x' }], status: 'HP 20/20' });
  await until(() => got.length === 2);
  assert.deepEqual(got[0], { lines: [{ k: 'call', t: '> start_game' }], status: 'HP 20/20  FOOD 20/20' });
  assert.deepEqual(got[1], { lines: [{ k: 'call', t: '> get_state' }, { k: 'ok', t: 'token ***' }], status: 'HP 20/20' });
  remote.term('g2', { lines: [{ k: 'call', t: 'not ours' }] });
  await sleep(100);
  assert.equal(got.length, 2, 'a game without a stream sends nothing');
  // the channel passes lines on for the game on camera only
  const { createLiveChannel } = await import('../src/fb-live.js');
  const seen = [];
  const ch = createLiveChannel({ graph: { listLive: async () => ({ data: [] }), stats: () => ({}), scrub: (x) => x, hide() {} }, createStream: () => ({}), stateFile: null });
  ch.start('g1', { player: 'Muse_aaaa' });
  ch.term('g1', { lines: [] }); // no broadcast: nothing to draw on
  assert.equal(ch.live().aspect, '16/9');
  await ch.stopAll();
  assert.deepEqual(seen, []);
});

test('MCP: each call and its results reach the game\'s stream as terminal lines', async (t) => {
  const dir = tmp();
  const updates = [];
  const streams = { enabled: true, start() { return null; }, has: () => false, stopAll: async () => {}, term: (id, u) => updates.push({ id, ...u }) };
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, streams, loopStatsMs: 0 });
  const c = new Client({ name: 'term-test', version: '1' });
  t.after(async () => { await c.close().catch(() => {}); await agent.stop('test over'); fs.rmSync(dir, { recursive: true, force: true }); });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  const game = /game (g\w+)/.exec((await c.callTool({ name: 'start_game', arguments: { adult: true } })).content[0].text)[1];
  await c.callTool({ name: 'play_sequence', arguments: { steps: [{ skill: 'collect', args: { block: 'oak_log', n: 2 } }] } });
  await c.callTool({ name: 'end_game', arguments: {} });
  const lines = updates.filter((u) => u.id === game).flatMap((u) => u.lines.map((l) => `${l.k} ${l.t}`));
  assert.equal(lines[0], 'call > start_game');
  assert.ok(lines.includes('call > play_sequence: collect oak_log 2'), lines.join(' / '));
  assert.ok(lines.some((l) => l.startsWith('ok ok  mined 2 oak log')), lines.join(' / '));
  assert.ok(lines.includes('call > end_game'));
  assert.match(updates.find((u) => u.status).status, /^HP \d+\/20  FOOD \d+\/20  DAY \d\d:\d\d/);
  assert.equal(JSON.stringify(updates).includes('Muse_'), false, 'no bot name in the terminal');
});

test('live_view\'s page: the player at the video\'s shape, as wide as the panel and no taller, still small', () => {
  const embed = 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F1%2Fvideos%2F2%2F&show_text=false&width=1280';
  const tall = liveViewHtml({ state: 'live', game: 'g1', embedUrl: embed, aspect: '1080/1920' });
  assert.match(tall, /#v\{position:relative;aspect-ratio:1080\/1920;width:min\(100%,calc\(\(100vh - 28px\)\*0\.5625\)\);margin:0 auto;background:#000;overflow:hidden\}/);
  assert.ok(Buffer.byteLength(tall) < 3072);
  assert.match(liveViewHtml({ state: 'live', game: 'g1', embedUrl: embed, aspect: '1080/1350' }), /aspect-ratio:1080\/1350;width:min\(100%,calc\(\(100vh - 28px\)\*0\.8\)\)/);
  // square (the UI layout): a 1000x1050 desktop panel gets the whole width, no bars at the sides
  assert.match(liveViewHtml({ state: 'live', game: 'g1', embedUrl: embed, aspect: '1080/1080' }), /aspect-ratio:1080\/1080;width:min\(100%,calc\(\(100vh - 28px\)\*1\)\)/);
  assert.match(liveViewHtml({ state: 'live', game: 'g1', embedUrl: embed }), /aspect-ratio:16\/9/, 'the old shape without one');
  assert.match(liveViewHtml({ state: 'live', game: 'g1', embedUrl: embed, aspect: 'x;}body{' }), /aspect-ratio:16\/9/, 'nothing else gets into the style');
});

test('config: the UI layout by default, square; the terminal (1080x1920 or 1080x1350) and landscape as before; the sound', () => {
  const c = loadConfig({});
  assert.deepEqual([c.stream.layout, c.stream.uiSize, c.stream.terminalSize], ['ui', '1080x1080', '1080x1920']);
  assert.deepEqual([c.stream.gameAudio, c.stream.music, c.stream.musicDb, c.stream.gameDb], [true, true, -15, 12]);
  assert.deepEqual([loadConfig({ STREAM_MUSIC: 'off' }).stream.music, loadConfig({ STREAM_UI_SIZE: '1080x1350' }).stream.uiSize], [false, '1080x1350']);
  assert.throws(() => loadConfig({ STREAM_UI_SIZE: '1920x1080' }), /STREAM_UI_SIZE must be one of/);
  assert.deepEqual([loadConfig({ STREAM_LAYOUT: 'landscape' }).stream.layout, loadConfig({ STREAM_TERMINAL_SIZE: '1080x1350' }).stream.terminalSize], ['landscape', '1080x1350']);
  assert.throws(() => loadConfig({ STREAM_TERMINAL_SIZE: '720x1280' }), /STREAM_TERMINAL_SIZE must be one of/);
});

test('end to end: a camera stream in the vertical layout, fed terminal lines, to an MP4 of 1080x1920', { timeout: 60_000 }, async (t) => {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) { t.skip('no ffmpeg'); return; }
  const dir = tmp();
  const em = new EventEmitter();
  const rig = { state: 'ready', name: 'MuseCam', options: { display: 4243, width: 960, height: 540, followMs: 60_000 }, start() {}, waitReady: async () => true, follow: async () => true, keepFollowing: async () => true, park: async () => {}, stats: async () => ({}), on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); } };
  const out = path.join(dir, 'v.mp4');
  const rows = [];
  const keepAlive = setInterval(() => {}, 1_000); // the stream's own timers do not hold the test open
  t.after(() => clearInterval(keepAlive));
  const s = createCameraStream({ rig, player: 'Muse_e2e1', output: out, ffmpeg, font: null, settleMs: 10, testSource: '320x180', fps: 15, bitrateK: 800, layout: 'terminal', event: (k, d) => rows.push({ k, ...d }) });
  assert.equal(s.aspect, '1080/1920');
  await s.start();
  for (let i = 0; i < 6; i++) { s.term({ lines: [{ k: i % 2 ? 'ok' : 'call', t: `line ${i}` }], status: `HP ${20 - i}/20` }); await sleep(400); }
  await s.stop('done');
  assert.deepEqual(rows.filter((r) => /ffmpeg_exit|failed|error/.test(r.k)), [], 'ffmpeg never restarted while the panel changed');
  const probe = JSON.parse(execFileSync(ffmpeg.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=codec_name,width,height:format=duration', '-of', 'json', out], { encoding: 'utf8' }));
  const v = probe.streams.find((x) => x.codec_name === 'h264');
  assert.deepEqual([v.width, v.height], [1080, 1920]);
  assert.ok(Number(probe.format.duration) > 1.5);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('term goal: the goal checklist from the tracker reaches the feed, and the caption endpoint keeps only its clean shape', () => {
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(u) });
  const tracker = { progress: () => ({ key: 'nether_and_back', title: 'Nether and back', text: null, reached: false, list: [{ k: 'wooden_pickaxe', t: 'wooden pickaxe', atS: 61 }, { k: 'back', t: 'back', atS: null }] }) };
  feed.call({ id: 'g1', tracker, body: {} }, 'play', { skill: 'eat', args: {} });
  assert.deepEqual(sent.at(-1).goal.list, [{ k: 'wooden_pickaxe', t: 'wooden pickaxe', atS: 61 }, { k: 'back', t: 'back', atS: null }]);
  // a game without a tracker (the web page's): no goal field
  feed.call({ id: 'g2', body: {} }, 'play', { skill: 'eat', args: {} });
  assert.equal('goal' in sent.at(-1), false);
  // cleaned again at the caption endpoint: kinds checked, words ASCII and short, times whole seconds
  const c = cleanTerm({ lines: [], goal: { key: 'Bad Key!', title: 'Nether  and back', text: 'x'.repeat(200), reached: 'yes', list: [{ k: 'iron', t: 'iron é', atS: 12.6 }, { k: 'BAD', t: 'x' }, { k: 'nether', t: 'Nether', atS: -5 }, { k: 'back', t: 'back', atS: 'soon' }, 'junk'] } });
  assert.deepEqual(c.goal, { key: 'free', title: 'Nether and back', reached: false, text: 'x'.repeat(80), list: [{ k: 'iron', t: 'iron', atS: 13 }, { k: 'nether', t: 'Nether', atS: 0 }, { k: 'back', t: 'back', atS: null }] });
  assert.equal('goal' in cleanTerm({ lines: [] }), false);
});
