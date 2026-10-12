// test/ui.test.js - the stream's UI layout: the agent's plain words (src/terminal.js: "Mine 3 oak logs", a short reason,
// the advice once per kind and change of words, the status as numbers, all cleaned again by the service), the panel
// (src/ui-panel.js, minimal: the header line, the last four actions newest first with their state, reflexes as muted
// rows, milestones as gold ones, no advice; frames as uncompressed BMP at the panel's size), ffmpeg's UI chain and its sound (the game, the music bed ducked
// under it, a limiter), the camera rig's sound server script, and end to end a camera stream in the UI layout with music
// to an MP4 of 1080x1080 with sound.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { plainCall, plainStep, countOf, shortWhy, severityOf, statusData, createTermFeed, cleanTerm } from '../src/terminal.js';
import { createUiPanel, milestoneWords } from '../src/ui-panel.js';
import { ffmpegArgs, audioArgs, findFfmpeg, streamAspect } from '../src/stream.js';
import { createCameraStream, pulseScript, pulsePaths, PULSE_SOURCE } from '../src/camera.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'muse-ui-'));

test('plain words: a call as Muse would say it, counts and plurals, a sequence, a short reason; never the raw call', () => {
  assert.equal(plainCall('play', { skill: 'collect', args: { block: 'diamond_ore', n: 3 } }), 'Mine 3 diamond ore');
  assert.equal(plainCall('play', { skill: 'collect', args: { block: 'oak_log', n: 1 } }), 'Mine an oak log');
  assert.equal(plainCall('play', { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }), 'Craft a wooden pickaxe');
  assert.equal(plainCall('play', { skill: 'craft', args: { item: 'stick', n: 4 } }), 'Craft 4 sticks');
  assert.equal(plainCall('play', { skill: 'go_to', args: { x: 12, y: 64, z: -40 } }), 'Walk to 12 64 -40');
  assert.equal(plainCall('play', { skill: 'portal', args: { action: 'enter' } }), 'Go through the portal');
  assert.equal(plainCall('play', { skill: 'hunt', args: { mob: 'sheep', n: 2 } }), 'Hunt 2 sheep');
  assert.equal(plainCall('play', { skill: 'say', args: { text: 'hello Muse_aB3dE9fGh2k' } }), 'Say something in chat', 'chat text never shown');
  assert.equal(plainCall('play', { skill: 'collect', block: 'stone', n: 5 }), 'Mine 5 stone', 'flat args');
  assert.equal(plainCall('play_sequence', { steps: [{ skill: 'collect', args: { block: 'oak_log', n: 3 } }, { skill: 'craft', args: { item: 'oak_planks', n: 12 } }, { skill: 'craft', args: { item: 'crafting_table', n: 1 } }] }),
    'Mine 3 oak logs, then craft 12 oak planks, and 1 more');
  assert.equal(plainCall('start_game', { adult: true }), 'Start a new game');
  assert.equal(plainStep({ skill: 'build', args: { blueprint: 'nether_portal' } }), 'Build a Nether portal frame');
  assert.equal(plainStep({ skill: 'teleport_somewhere' }), 'Teleport somewhere', 'an unknown skill: its name in words');
  assert.deepEqual([countOf(2, 'torch'), countOf(3, 'iron_ingot'), countOf(1, 'egg'), countOf(4, 'raw_iron')], ['2 torches', '3 iron ingots', 'an egg', '4 raw iron']);
  const why = shortWhy('No usable footing was observed within 1 blocks of -28, 67, -16. The ground in that column is');
  assert.ok(/^no usable footing/.test(why) && why.length <= 48, why);
  assert.ok(shortWhy('no iron_ore within 64 blocks; stone is 3 blocks down') === 'no iron ore within 64 blocks');
  assert.deepEqual([severityOf({ kind: 'food', text: 'starving: food 2' }), severityOf({ kind: 'night', text: 'night (time 13250): no closed shelter' }), severityOf({ kind: 'shield', text: 'no shield' })], [3, 2, 1]);
  assert.deepEqual(statusData({ health: 17.6, food: 17, time: 2_250 }, { muse: 47, reflex: 4, musePct: 92 }), { hp: 18, food: 17, clock: 'DAY 08:15', muse: 47, reflex: 4, pct: 92 });
  assert.deepEqual(statusData({ health: 20, food: 20, dimension: 'the_nether' }, null), { hp: 20, food: 20, clock: 'NETHER' });
});

test('feed: the advice once per kind and change of words (the time in it is not news), the list as it stands with each update', () => {
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(u) });
  const game = { id: 'g1', body: { attribution: () => ({ muse: 1, reflex: 0 }) } };
  const reply = (advice) => ({ content: [{ type: 'text', text: '' }], structuredContent: { steps: [], advice, state: { health: 20, food: 20, time: 13_100 } } });
  feed.reply(game, 'get_state', {}, reply([{ kind: 'night', text: 'night (time 13100): no closed shelter around you, no shield' }, { kind: 'shield', text: 'no shield; you can make one' }]));
  assert.deepEqual(sent.at(-1).lines.map((l) => l.ak), ['night', 'shield']);
  feed.reply(game, 'get_state', {}, reply([{ kind: 'night', text: 'night (time 13350): no closed shelter around you, no shield' }, { kind: 'shield', text: 'no shield; you can make one' }]));
  assert.deepEqual(sent.at(-1).lines, [], 'only the number changed: no line');
  assert.equal(sent.at(-1).adv[0].t, 'night (time 13350): no closed shelter around you, no shield', 'the card gets the new words');
  feed.reply(game, 'get_state', {}, reply([{ kind: 'night', text: 'night (time 13400): no closed shelter around you' }]));
  assert.deepEqual(sent.at(-1).lines.map((l) => l.t), ['advice: night (time 13400): no closed shelter around you'], 'the words changed');
  assert.deepEqual(sent.at(-1).adv.map((a) => a.k), ['night'], 'the shield advice is gone');
  // cleaned again by the service: the new fields too
  const u = cleanTerm({
    lines: [{ k: 'ok', t: 'ok', say: 'Mine 3 oak logs near Muse_aB3dE9fGh2k', ms: 9_000.4, n: 2, of: 99, why: 'see https://x.example', ak: 'BAD KIND' }],
    status: 'x', st: { hp: 25, food: -3, clock: 'DAY 08:15<script>', muse: 3, pct: 140 }, adv: [{ k: 'night', t: 'token EAAPageTok3n0123456789abcdef', sev: 9 }, { k: '../x', t: 'y' }],
  });
  assert.deepEqual(u.lines, [{ k: 'ok', t: 'ok', say: 'Mine 3 oak logs near a player', why: 'see [link]', ms: 9_000, n: 2, of: 64 }]);
  assert.deepEqual(u.st, { hp: 20, food: 0, muse: 3, pct: 100 });
  assert.deepEqual(u.adv, [{ k: 'night', t: 'token ***', sev: 3 }]);
});

test('panel: the last four actions, newest first, each with its state; reflexes muted, milestones gold, no advice; the header', () => {
  let t = 1_000_000;
  const dir = tmp();
  const p = createUiPanel({ width: 1080, height: 270, file: path.join(dir, 'panel.bmp'), now: () => t });
  const rows = () => p.state().rows.map((r) => `${r.kind}:${r.text}:${r.state ? `${r.state.kind} ${r.state.text}`.trim() : ''}`);
  p.term({ lines: [{ k: 'call', t: '> start_game', say: 'Start a new game' }], st: { hp: 20, food: 20, clock: 'DAY 08:15', muse: 1, reflex: 0, pct: 100 } });
  assert.deepEqual(rows(), ['action:Start a new game:ok ready'], 'start_game comes with its reply');
  p.term({ lines: [{ k: 'call', t: '> play: collect oak_log 3', say: 'Mine 3 oak logs' }] });
  p.term({ lines: [{ k: 'call', t: '> get_state' }] });
  assert.equal(p.state().rows.length, 2, 'looking around is not an action');
  assert.deepEqual(p.state().rows[0].state, { kind: 'run', text: '' });
  p.term({ lines: [{ k: 'ok', t: 'ok  mined 3 oak log (9 s)', say: 'Mine 3 oak logs', ms: 9_000 }] });
  assert.deepEqual(p.state().rows[0].state, { kind: 'ok', text: 'done 9 s' });
  p.term({ lines: [{ k: 'call', t: '> play_sequence', say: 'Craft 4 sticks, then craft a crafting table' }] });
  p.term({ lines: [{ k: 'ok', t: 'ok', say: 'Craft 4 sticks', ms: 700, n: 1, of: 2 }] });
  assert.deepEqual(p.state().rows[0].state, { kind: 'run', text: '1 of 2' });
  p.term({ lines: [{ k: 'ok', t: 'ok', say: 'Craft a crafting table', ms: 600, n: 2, of: 2 }] });
  assert.deepEqual(p.state().rows[0].state, { kind: 'ok', text: 'done 1.3 s' }, 'a sequence: its steps\' time');
  p.term({ lines: [{ k: 'call', t: '> play', say: 'Mine 3 iron ore' }] });
  p.term({ lines: [{ k: 'fail', t: 'FAIL collect iron ore 3 NOT_FOUND', say: 'Mine 3 iron ore', why: 'no iron ore within 64 blocks; stone below' }] });
  assert.deepEqual(p.state().rows[0].state, { kind: 'fail', text: 'failed \u00b7 no iron ore within 64 blocks' });
  assert.deepEqual(rows().slice(1), ['action:Craft 4 sticks, then craft a crafting table:ok done 1.3 s', 'action:Mine 3 oak logs:ok done 9 s', 'action:Start a new game:ok ready']);
  // reflexes (once), milestones, no advice
  p.term({ lines: [{ k: 'reflex', t: 'reflex: fought a zombie, then back to collecting' }], adv: [{ k: 'night', t: 'night soon', sev: 2 }] });
  p.term({ lines: [{ k: 'reflex', t: 'reflex: fought a zombie, then back to collecting' }, { k: 'advice', t: 'advice: night soon', ak: 'night' }] });
  p.term({ lines: [{ k: 'milestone', t: 'entered the Nether at 0:41' }] });
  assert.deepEqual(rows().slice(0, 3), ['milestone:Entered the Nether:', 'reflex:Reflex: fought a zombie:', 'action:Mine 3 iron ore:fail failed \u00b7 no iron ore within 64 blocks']);
  assert.equal(p.state().rows.length, 4, 'four rows');
  assert.equal(milestoneWords('milestone: a wooden pickaxe at 0:41'), 'Got a wooden pickaxe');
  // a result for an action that is no longer the newest finds it by its words
  p.term({ lines: [{ k: 'call', t: '> play', say: 'Walk to 1 2 3' }, { k: 'call', t: '> play', say: 'Build a shelter for the night' }] });
  p.term({ lines: [{ k: 'ok', t: 'ok', say: 'Walk to 1 2 3', ms: 2_000 }] });
  assert.deepEqual(p.state().rows.slice(0, 2).map((r) => r.state), [{ kind: 'run', text: '' }, { kind: 'ok', text: 'done 2 s' }]);
  p.term({ st: { hp: 12, clock: 'NETHER', muse: 6, reflex: 1, pct: 86 } });
  assert.deepEqual(p.state().st, { hp: 12, food: 20, clock: 'NETHER', muse: 6, reflex: 1, pct: 86 });
  // another game on camera: an empty list with a note
  p.reset('the camera moved to another game');
  assert.deepEqual(rows(), ['note:The camera moved to another game:']);
  // frames: a top-down 32-bit BMP of the panel's size, written by renaming
  for (let i = 0; i < 20; i++) { t += 33; p.render(t); }
  p.write(t);
  const b = fs.readFileSync(path.join(dir, 'panel.bmp'));
  assert.equal(b.toString('ascii', 0, 2), 'BM');
  assert.deepEqual([b.readInt32LE(18), b.readInt32LE(22), b.readUInt16LE(28), b.length], [1080, -270, 32, 54 + 1080 * 270 * 4]);
  assert.equal(b[54 + 3], 255, 'opaque');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('panel: a frame costs little (cached cards, sprites drawn at their size)', () => {
  let t = 1_000_000;
  const p = createUiPanel({ width: 1080, height: 270, now: () => t });
  p.term({ lines: [{ k: 'call', t: '> play', say: 'Mine 3 oak logs' }], st: { hp: 20, food: 20, clock: 'DAY 08:15', muse: 1, reflex: 0 } });
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 90; i++) { t += 33; p.bmp(t); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / 90;
  assert.ok(ms < 12, `${ms.toFixed(2)} ms a frame`);
});

test('ffmpeg: the UI chain (the game cut to its shape over the panel read 30 times a second, no caption on the game) and the sound', () => {
  const args = ffmpegArgs({ output: '/tmp/x.mp4', width: 1080, height: 1080, fps: 30, x11: { display: ':99.0+0,0', width: 960, height: 540 }, font: '/f.ttf', captionFile: '/w/c.txt', panel: { file: '/dev/shm/p/panel.bmp', top: 720, kind: 'ui', fps: 30 } });
  const vf = args[args.indexOf('-vf') + 1];
  assert.match(vf, /^\[in\]setpts=PTS-STARTPTS,crop=w='min\(iw,ih\*1080\/720\)':h='min\(ih,iw\*720\/1080\)',scale=1080:720:flags=bicubic,pad=1080:1080:0:0:color=0x0B0D0F,format=yuv420p\[top\];movie='\/dev\/shm\/p\/panel\.bmp':f=image2:loop=0,setpts=N\/\(30\*TB\),scale=1080:360,format=yuv420p\[pan\];\[top\]\[pan\]overlay=0:720:format=yuv420\[out\]$/);
  assert.equal(vf.includes('drawtext'), false, 'Muse\'s panel says it');
  assert.deepEqual(args.slice(args.indexOf('-map'), args.indexOf('-map') + 4), ['-map', '0:v', '-map', '1:a'], 'silence without a sound server');
  assert.equal(streamAspect({ layout: 'ui', uiSize: '1080x1080' }), '1080/1080');
  // the game's sound and the music bed: ducked under the game, a limiter at -1 dBFS
  const a = audioArgs({ pulse: PULSE_SOURCE, music: '/app/assets/muse-ui/music/etirwer.m4a', musicDb: -2, gameDb: 1 });
  assert.deepEqual(a.inputs.slice(0, 2), ['-thread_queue_size', '1024']);
  assert.ok(a.inputs.join(' ').includes('-f pulse -sample_rate 48000 -channels 2 -fragment_size 3840 -i muse.monitor -re -stream_loop -1 -i /app/assets/muse-ui/music/etirwer.m4a'));
  const graph = a.maps[a.maps.indexOf('-filter_complex') + 1];
  assert.match(graph, /\[1:a\]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=1\.0dB,asplit=2\[g\]\[key\];/);
  assert.match(graph, /volume=-2\.0dB\[bed\];\[bed\]\[key\]sidechaincompress=/);
  assert.match(graph, /amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0\.891/);
  assert.deepEqual(a.maps.slice(-2), ['-map', '[aout]']);
  const quiet = audioArgs({});
  assert.deepEqual(quiet.inputs, ['-re', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000']);
  // the rig's sound server: one null sink, a unix socket in its own folder, nothing reachable from outside
  const pa = pulseScript('/camera/pulse/native');
  assert.match(pa, /^load-module module-null-sink sink_name=muse rate=48000 channels=2/);
  assert.match(pa, /load-module module-native-protocol-unix auth-anonymous=1 socket=\/camera\/pulse\/native/);
  assert.doesNotMatch(pa, /tcp|zeroconf|udev|detect|alsa|x11/i);
  assert.equal(pulsePaths('/camera').socket, '/camera/pulse/native');
});

test('end to end: a camera stream in the UI layout with the music bed, to an MP4 of 1080x1080 with sound', { timeout: 60_000 }, async (t) => {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) { t.skip('no ffmpeg'); return; }
  const dir = tmp();
  const out = path.join(dir, 'ui.mp4');
  const em = new EventEmitter();
  const rig = {
    state: 'ready', name: 'MuseCam', options: { display: 4242, width: 320, height: 180, followMs: 60_000 },
    start() {}, waitReady: async () => true, follow: async () => true, keepFollowing: async () => true, park: async () => {},
    stats: async () => ({ state: 'ready' }), on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); },
  };
  const rows = [];
  const s = createCameraStream({ rig, player: 'Muse_e2e1', output: out, ffmpeg, font: null, settleMs: 10, testSource: '320x180', fps: 15, bitrateK: 800, layout: 'ui', shmDir: dir, event: (k, d) => rows.push({ k, ...d }) });
  assert.equal(s.aspect, '1080/1080');
  const keep = setInterval(() => {}, 1_000);
  await s.start();
  s.term({ lines: [{ k: 'call', t: '> play', say: 'Mine 3 oak logs' }], st: { hp: 20, food: 20, clock: 'DAY 08:15', muse: 1, reflex: 0 } });
  await new Promise((r) => setTimeout(r, 3_000));
  await s.stop('test over');
  clearInterval(keep);
  const probe = execFileSync(ffmpeg.replace(/ffmpeg$/, 'ffprobe'), ['-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' });
  assert.match(probe, /video,1080,1080/);
  assert.match(probe, /audio/);
  assert.equal(rows.filter((r) => r.k === 'stream_ffmpeg_exit').length, 0, 'no restart');
  assert.ok(rows.some((r) => r.k === 'stream_audio' && r.music === true && r.game === false));
  fs.rmSync(dir, { recursive: true, force: true });
});
