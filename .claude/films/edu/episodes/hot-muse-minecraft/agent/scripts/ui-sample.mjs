#!/usr/bin/env node
// scripts/ui-sample.mjs - a sample of the live video in the UI layout (STREAM_LAYOUT=ui), made on this machine: a
// recorded clip stands in for the camera's X display, and a scripted Muse session (start_game, a portal, the Nether,
// results, advice, a reflex, a milestone) goes through the real formatter (src/terminal.js) to the camera stream's UI
// panel (src/ui-panel.js), exactly as the agent's replies would; the sound is the music bed over silence (no client
// here, so no game sound). No Minecraft, no Facebook.
//
//   node scripts/ui-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 30] [--size 1080x1080] [--music off]
//        [--story portal|shelter|g0793f1|ga13a88] [--pulse] [--tone]   (in the camera image: its own PulseAudio sink as the game's sound, as the rig makes it;
//                             --tone plays short beeps into it, standing in for the game's sound effects)

import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { createCameraStream, pulseScript, pulsePaths, PULSE_SOURCE } from '../src/camera.js';
import { createTermFeed } from '../src/terminal.js';
import { milestonesOf, GOAL_TITLES } from '../src/report.js';

const { values: v } = parseArgs({ options: {
  clip: { type: 'string' }, out: { type: 'string' }, seconds: { type: 'string' }, size: { type: 'string' }, music: { type: 'string' },
  pulse: { type: 'boolean' }, tone: { type: 'boolean' }, story: { type: 'string' },
} });
if (!v.clip || !v.out) { console.error('usage: node scripts/ui-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 30] [--size 1080x1080] [--music off]'); process.exit(2); }
const seconds = Number(v.seconds ?? 20);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the game's clock, for the feed and the panel: a story can jump it forward to a moment of the game (ga13a88)
let skew = 0;
const clk = () => Date.now() + skew;

// a camera rig that is always in the world (no sound server here)
const em = new EventEmitter();
const rig = {
  state: 'ready', name: 'MuseCam', options: { display: 4242, width: 960, height: 540, followMs: 60_000 },
  start() {}, waitReady: async () => true, follow: async () => true, keepFollowing: async () => true, park: async () => {},
  stats: async () => ({ state: 'ready' }), on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); },
};
// the game's sound as the camera rig records it: a PulseAudio server of our own with one null sink
const kids = [];
if (v.pulse) {
  const p = pulsePaths(fs.mkdtempSync('/tmp/muse-sample-'));
  fs.mkdirSync(p.runtime, { recursive: true, mode: 0o700 });
  fs.writeFileSync(p.script, pulseScript(p.socket));
  kids.push(spawn('pulseaudio', ['-n', `--file=${p.script}`, '--daemonize=no', '--exit-idle-time=-1', '--use-pid-file=no', '--realtime=no', '--high-priority=no', '--disable-shm=yes', '--log-target=stderr', '--log-level=error'], { env: { ...process.env, XDG_RUNTIME_DIR: p.runtime, PULSE_RUNTIME_PATH: p.runtime }, stdio: ['ignore', 'ignore', 'inherit'] }));
  for (let i = 0; i < 50 && !fs.existsSync(p.socket); i++) await sleep(100);
  rig.sound = { server: `unix:${p.socket}`, source: PULSE_SOURCE };
  if (v.tone) { // a beep of 0.3 s every 2 s into the sink
    kids.push(spawn('ffmpeg', ['-v', 'error', '-re', '-f', 'lavfi', '-i', 'sine=f=660:sample_rate=48000:duration=0.3,volume=4,apad=whole_dur=2,aloop=loop=-1:size=96000', '-ac', '2', '-f', 'pulse', 'tone'], { env: { ...process.env, PULSE_SERVER: rig.sound.server }, stdio: ['ignore', 'ignore', 'inherit'] }));
  }
}
const stream = createCameraStream({
  rig, player: 'Muse_sample1', output: v.out, fileSource: v.clip, settleMs: 10, layout: 'ui', uiSize: v.size ?? '1080x1080',
  music: v.music !== 'off', shmDir: '/tmp', uiNow: clk,
  event: (k, d) => { if (/error|failed|exit/.test(k)) console.error(k, JSON.stringify(d)); },
});

// the game as the MCP layer sees it, and the feed that turns calls and replies into the panel's updates
let dim = 'overworld';
let att = { muse: 0, reflex: 0, musePct: null };
// the body as the agent reads it between calls: the last state, its clock running at 20 ticks a second
let cur = { health: 20, food: 20, time: 2_250, at: clk() };
// what the body carries, where it is and the trees around, for the HUD (ga13a88)
let carry = {};
let worn = {};
let where = { x: 12, y: 70, z: -40 };
let around = [];
let tracker = null;
const progress = []; // the body's sub-step listeners (the feed subscribes)
const game = {
  id: v.story === 'ga13a88' ? 'ga13a88' : 'g7a1c2e',
  body: {
    attribution: () => att, on: (name, fn) => { if (name === 'progress') progress.push(fn); return () => {}; },
    snapshot: () => ({ dimension: dim, health: cur.health, food: cur.food, timeOfDay: Math.floor(cur.time + (clk() - cur.at) / 50), inventory: { ...carry }, equipment: { ...worn }, position: { ...where }, nearbyBlocks: around }),
  },
  get tracker() { return tracker; },
};
const subStep = (sub) => { for (const fn of progress) fn({ sub }); };
// the MCP layer's side of the status line: what runs, when Muse last called and with what
let q = { busy: false, running: null, lastCallAt: clk(), lastTool: 'start_game' };
const feed = createTermFeed({ send: (id, u) => stream.term(u), liveOf: () => q, now: clk });
const call = (tool, args) => {
  // a play call starts its first step; any other call leaves what runs as it is
  q = tool === 'play' || tool === 'play_sequence' ? { busy: true, running: tool === 'play' ? args : args?.steps?.[0] ?? null, lastCallAt: clk(), lastTool: tool } : { ...q, lastCallAt: clk(), lastTool: tool };
  feed.call(game, tool, args);
};
const done = () => { q = { ...q, busy: false, running: null }; };
const state = (health, food, time) => { cur = { health, food, time, at: clk() }; return { health, food, time, pos: { ...where }, inventory: { ...carry } }; };
const step = (call, n, skill, args, status, result, ms, gained) => ({ call, n, step: n, skill, args, status, result, ms, ...(gained ? { gained } : {}) });
const reply = (structured) => ({ content: [{ type: 'text', text: '' }], structuredContent: structured });
const nether = (pos) => ({ kind: 'nether', text: `in the Nether: beds explode here and water boils away; the portal back is at ${pos} (portal enter with that pos)` });

const S = (call, n, skill, args, status, result, ms, extra = {}) => ({ ...step(call, n, skill, args, status, result, ms), ...extra });
const stories = {
  // production game g0793f1's last minutes (its real commands, results, advice and milestones; Muse's words, the
  // body's sub-steps and the state numbers are made up for the sample: the game had none of them)
  g0793f1: [
    [0.2, () => { cur = { health: 20, food: 14, time: 15_600, at: Date.now() }; feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 14, 15_600) })); }],
    [0.4, () => { call('play', { skill: 'craft', args: { item: 'bucket', n: 1 } }); }],
    [0.6, () => { done(); feed.reply(game, 'play', {}, reply({ steps: [S(1, 1, 'craft', { item: 'bucket', n: 1 }, 'confirmed', 'crafted 1 bucket at a crafting table', 6_100, { gained: { bucket: 1 } })], state: state(20, 14, 15_620) })); }],
    [0.8, () => { call('play', { skill: 'bucket', args: { action: 'fill', liquid: 'water' } }); }],
    [1.0, () => { done(); feed.reply(game, 'play', {}, reply({ steps: [S(2, 1, 'bucket', { action: 'fill', liquid: 'water' }, 'failed', 'stopped: timed out after 120 s', 131_800)], state: state(20, 14, 15_700) })); }],
    [1.2, () => { call('play_sequence', { steps: [{ skill: 'go_to', args: { x: 378, y: 71, z: -23 } }, { skill: 'bucket', args: { action: 'fill', liquid: 'water' } }, { skill: 'craft', args: { item: 'flint_and_steel', n: 1 } }, { skill: 'collect', args: { block: 'obsidian', n: 14 } }] }); }],
    [1.6, () => { done(); feed.reply(game, 'play_sequence', {}, reply({
      steps: [S(3, 1, 'go_to', { x: 378, y: 71, z: -23 }, 'confirmed', 'walked to 377 71 -23', 95_100), S(3, 2, 'bucket', { action: 'fill', liquid: 'water' }, 'confirmed', 'filled a bucket with water', 3_200),
        S(3, 3, 'craft', { item: 'flint_and_steel', n: 1 }, 'confirmed', 'crafted 1 flint_and_steel', 300, { gained: { flint_and_steel: 1 } }),
        S(3, 4, 'collect', { block: 'obsidian', n: 14 }, 'failed', 'no lava pool within 16 blocks to make obsidian from; the nearest lava pool loaded is at 360 34 -78', 100)],
      state: state(20, 14, 15_800),
      advice: [{ kind: 'lava', text: 'the nearest lava pool is at 360 34 -78, 69 blocks away: go_to a spot a few blocks from it', hint: { skill: 'go_to', args: { x: 360, y: 35, z: -78 } } }],
    })); }],
    [2.2, () => { call('get_state', {}); feed.reply(game, 'get_state', {}, reply({ steps: [], state: { ...state(20, 14, 15_900), inventory: { water_bucket: 1, flint_and_steel: 1, diamond_pickaxe: 1, iron_ingot: 2 } },
      advice: [{ kind: 'lava', text: 'the nearest lava pool is at 360 34 -78, 69 blocks away: go_to a spot a few blocks from it', hint: { skill: 'go_to', args: { x: 360, y: 35, z: -78 } } }] })); }],
    [3.0, () => { att = { muse: 26, reflex: 2, musePct: 93 }; call('play_sequence', { why: 'Lava pool at 360 34 -78. Water on lava makes obsidian; I need 14 for a portal.', steps: [{ skill: 'go_to', args: { x: 360, y: 35, z: -78 } }, { skill: 'collect', args: { block: 'obsidian', n: 14 } }] }); }],
    [3.4, () => subStep({ kind: 'walk', text: '68 blocks to go', left: 68 })],
    [4.4, () => subStep({ kind: 'walk', text: '41 blocks to go', left: 41 })],
    [5.4, () => subStep({ kind: 'walk', text: '12 blocks to go', left: 12 })],
    [6.2, () => { feed.reply(game, 'play_sequence', {}, reply({ steps: [S(4, 1, 'go_to', { x: 360, y: 35, z: -78 }, 'confirmed', 'walked to 360 35 -77', 68_500), S(4, 2, 'collect', { block: 'obsidian', n: 14 }, 'running')],
      state: state(20, 14, 16_100), onItsOwn: [{ seq: 1, agoS: 20, source: 'reflex', kind: 'defend', ok: true, text: 'it fought a creeper, then back to walking' }] })); }],
    [6.6, () => subStep({ kind: 'bucket', text: 'pouring water on lava' })],
    [8.0, () => subStep({ kind: 'mine', text: 'mining obsidian', done: 1, of: 14 })],
    [9.5, () => subStep({ kind: 'mine', text: 'mining obsidian', done: 2, of: 14 })],
    [11.0, () => subStep({ kind: 'mine', text: 'mining obsidian', done: 3, of: 14 })],
  ],

  // production game ga13a88's first 5:45 (its real calls with Muse's words, the steps, their results and times, the
  // refusal, the advice, the body digging in before the first call), on the game's own clock: the first 5 minutes in a
  // few seconds, then as it ran from 5:20 (the still: 5:39, the ninth call's second step). Health, food, y, the trees
  // around and the items are worked out from the results; the sub-steps' counts from the results' times.
  ga13a88: v.story !== 'ga13a88' ? [] : (() => {
    const G0 = Date.now() + 1_000; // the game's start on the sample's clock
    const at = (gt, fn) => () => { skew = G0 + gt * 1000 - Date.now(); fn(); };
    const reached = new Map();
    const goalList = milestonesOf('nether_and_back');
    tracker = { progress: () => ({ key: 'nether_and_back', title: GOAL_TITLES.nether_and_back, reached: false, list: goalList.map((m) => ({ k: m.key, t: m.short, atS: reached.get(m.key) ?? null })) }) };
    const T0 = 12_182; // the time of day at the start (15250 at 2:33)
    const st = (hp, food, gt) => state(hp, food, T0 + gt * 20);
    const run = (no, step, skill, args) => { q = { ...q, busy: true, running: { call: { no }, step, skill, args } }; };
    const R = (no, n, step, skill, args, status, result, ms, extra = {}) => ({ call: no, n, step, skill, args, status, ...(result ? { result } : {}), ...(ms ? { ms } : {}), ...extra });
    const night = (blocks, shield = true, pick = true) => ({ kind: 'night', text: `night (time 0): no closed shelter around you${shield ? ', no shield' : ''}; ${blocks} blocks for a shelter${pick ? '' : ', no pickaxe to dig in'}`, hint: { skill: 'shelter', args: {} } });
    const birch = [{ name: 'birch_log', nearest: { x: -18, y: 78, z: 240 }, distance: 6 }];
    const why1 = 'Night with sunrise 6 min out and no tools yet: grabbing birch logs, crafting a wooden pickaxe, and pulling cobblestone to dig in for the night';
    const why2 = 'No path from the dug-in hole to the trees: walking up to the birch cluster first, then tooling up with logs and stone while night lasts';
    const why3 = 'Fixing the go_to argument shape: walking up to the birch cluster, then tooling up with logs and stone while night lasts';
    const why4 = 'Stone pickaxe crafted: grabbing 5 iron ore and 4 coal so the furnace can run and the iron pickaxe is one smelt away';
    const seq3 = [{ skill: 'go_to', args: { x: -20, y: 78, z: 236 } }, { skill: 'collect', args: { block: 'birch_log', n: 8 } }, { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }, { skill: 'collect', args: { block: 'cobblestone', n: 12 } }];
    const seq4 = [{ skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } }, { skill: 'collect', args: { block: 'iron_ore', n: 5 } }, { skill: 'craft', args: { item: 'furnace', n: 1 } }, { skill: 'collect', args: { block: 'coal_ore', n: 4 } }];
    where = { x: 42, y: 77, z: 56 };
    return [
      [0.2, at(0, () => { feed.reply(game, 'start_game', { adult: true, goal: 'nether_and_back' }, reply({ steps: [], state: st(20, 20, 0) })); })],
      [0.4, at(13, () => { call('live_view', { format: 'page' }); })],
      [0.6, at(27, () => { done(); feed.reply(game, 'live_view', {}, reply({ steps: [], onItsOwn: [{ seq: 1, agoS: 14, source: 'body', kind: 'shelter', ok: true, text: 'waiting for your first call at night: dug two blocks down to wait there (no blocks carried to close it over)' }] })); })],
      [0.9, at(153, () => { call('get_state', {}); feed.reply(game, 'get_state', {}, reply({ steps: [], state: st(20, 20, 153), advice: [night(1, true, false)] })); })],
      [1.2, at(168, () => { att = { muse: 1, reflex: 1, musePct: 50 }; call('play_sequence', { why: why1, steps: [{ skill: 'collect', args: { block: 'birch_log', n: 8 } }, { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }, { skill: 'collect', args: { block: 'cobblestone', n: 10 } }] }); })],
      [1.4, at(171, () => { done(); feed.reply(game, 'play_sequence', {}, reply({ steps: [R(1, 1, 1, 'collect', { block: 'birch_log', n: 8 }, 'failed', 'failed: no path found from the dug-in hole; closest node was -24,57,235', 3_200, { code: 'FAILED' }),
        R(1, 2, 2, 'craft', { item: 'wooden_pickaxe', n: 1 }, 'cancelled', null, 0, { why: 'an earlier step failed' }), R(1, 3, 3, 'collect', { block: 'cobblestone', n: 10 }, 'cancelled', null, 0, { why: 'an earlier step failed' })], state: st(20, 20, 171), advice: [night(1, true, false)] })); })],
      [1.7, at(178, () => { call('play_sequence', { why: why2, steps: [{ skill: 'go_to', args: { pos: { x: -20, y: 78, z: 236 } } }, ...seq3.slice(1)] }); feed.reply(game, 'play_sequence', {}, { isError: true, content: [{ type: 'text', text: '1. go_to: not run, bad arguments: go_to.pos is not allowed; go_to.x is required; go_to.y is required; go_to.z is required' }], structuredContent: { code: 'BAD_ARGS', steps: [] } }); })],
      [2.0, at(181, () => { att = { muse: 2, reflex: 1, musePct: 67 }; call('play_sequence', { why: why3, steps: seq3 }); run(2, 1, 'go_to', seq3[0].args); subStep({ kind: 'walk', text: '61 blocks to go', left: 61 }); })],
      [2.3, at(224, () => { feed.reply(game, 'play_sequence', {}, reply({ steps: seq3.map((x, i) => R(2, i + 1, i + 1, x.skill, x.args, i ? 'pending' : 'running')), state: st(20, 20, 224), advice: [night(0, true, false)] })); })],
      [2.5, at(230, () => { where = { x: -20, y: 78, z: 237 }; around = birch; run(2, 2, 'collect', seq3[1].args); subStep({ kind: 'mine', text: 'mining birch log', done: 2, of: 8 }); })],
      [2.8, at(268, () => { carry = { birch_log: 5, birch_planks: 3, stick: 0 }; run(2, 3, 'craft', seq3[2].args); subStep(null); })],
      [3.0, at(269, () => { call('get_state', {}); feed.reply(game, 'get_state', {}, reply({ steps: [], earlier: [R(2, 1, 1, 'go_to', seq3[0].args, 'confirmed', 'walked to -20 78 237', 48_700), R(2, 2, 2, 'collect', seq3[1].args, 'confirmed', 'mined 8 birch_log', 36_100, { gained: { birch_log: 8 } }),
        R(2, 3, null, 'craft', { item: 'birch_planks', n: 12 }, 'confirmed', 'crafted 12 birch_planks', 1_500, { before: 3 }), R(2, 4, null, 'craft', { item: 'crafting_table', n: 1 }, 'confirmed', 'crafted 1 crafting_table', 300, { before: 3 }), R(2, 5, null, 'craft', { item: 'stick', n: 4 }, 'confirmed', 'crafted 4 stick', 300, { before: 3 })],
        state: st(20, 19, 269), advice: [night(5)] })); })],
      [3.3, at(272, () => { carry = { ...carry, wooden_pickaxe: 1 }; reached.set('wooden_pickaxe', 272); run(2, 4, 'collect', seq3[3].args); subStep({ kind: 'mine', text: 'mining stone', done: 5, of: 12 }); where = { x: -12, y: 71, z: 238 }; })],
      [3.6, at(300, () => { carry = { ...carry, cobblestone: 12 }; done(); call('get_state', {}); feed.reply(game, 'get_state', {}, reply({ steps: [], earlier: [R(2, 6, 3, 'craft', seq3[2].args, 'confirmed', 'crafted 1 wooden_pickaxe at a crafting table', 4_900, { gained: { wooden_pickaxe: 1 } }), R(2, 7, 4, 'collect', seq3[3].args, 'confirmed', 'mined 12 stone and picked up 12 cobblestone', 27_400, { gained: { cobblestone: 12 } })],
        state: st(20, 18, 300), advice: [night(20)] })); })],
      [4.2, at(314, () => { att = { muse: 9, reflex: 1, musePct: 90 }; call('play_sequence', { why: why4, steps: seq4 }); run(3, 1, 'craft', seq4[0].args); subStep(null); })],
      [4.6, at(319, () => { carry = { ...carry, stone_pickaxe: 1, cobblestone: 9 }; reached.set('stone_pickaxe', 319); where = { x: -8, y: 68, z: 236 }; run(3, 2, 'collect', seq4[1].args); subStep({ kind: 'mine', text: 'mining iron ore', done: 0, of: 5 }); })],
      [5.0, at(326, () => { carry = { ...carry, raw_iron: 1 }; subStep({ kind: 'mine', text: 'mining iron ore', done: 1, of: 5 }); })],
      ...[[10, 332, 2], [16, 338, 3], [23, 345, 4]].map(([t, gt, n]) => [t, at(gt, () => { carry = { ...carry, raw_iron: n }; subStep({ kind: 'mine', text: 'mining iron ore', done: n, of: 5 }); })]),
      [8.0, at(330, () => { cur = { ...cur, food: 17 }; feed.tick(game); })],
    ].sort((a, b) => a[0] - b[0]);
  })(),

  // daylight, a portal: an action, waiting for Muse, the portal, the Nether, Muse looking
  portal: [
    [0.3, () => feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 20, 2_250) }))],
    [0.9, () => { call('play', { skill: 'collect', args: { block: 'oak_log', n: 2 } }); att = { muse: 1, reflex: 0, musePct: 100 }; }],
    [3.6, () => { done(); feed.reply(game, 'play', {}, reply({ steps: [step(1, 1, 'collect', { block: 'oak_log', n: 2 }, 'confirmed', 'mined 2 oak_log', 2_600)], state: state(20, 20, 2_300) })); }],
    [8.5, () => { call('play', { skill: 'portal', args: { action: 'enter', pos: { x: -3, y: 75, z: -197 } } }); att = { muse: 2, reflex: 0, musePct: 100 }; }],
    [15.0, () => {
      dim = 'the_nether';
      done();
      feed.reply(game, 'play', {}, reply({ steps: [step(2, 1, 'portal', { action: 'enter' }, 'confirmed', 'went through the portal at 1 68 -25', 5_100)], state: state(20, 20, 2_400), advice: [nether('1 68 -25')] }));
    }],
    [18.4, () => { att = { muse: 2, reflex: 1, musePct: 67 }; call('get_state', {}); feed.reply(game, 'get_state', {}, reply({ steps: [], state: state(17, 19, 2_480), onItsOwn: [{ seq: 1, agoS: 1, source: 'reflex', kind: 'defend', ok: true, text: 'fought a piglin, then back to waiting' }] })); }],
  ],
  // night: a shelter, then sheltering until morning
  shelter: [
    [0.3, () => feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 18, 13_420) }))],
    [0.8, () => { call('play', { skill: 'shelter', args: {} }); att = { muse: 1, reflex: 0, musePct: 100 }; }],
    [2.6, () => { done(); feed.reply(game, 'play', {}, reply({ steps: [step(1, 1, 'shelter', {}, 'confirmed', 'built a shelter of 13 dirt around you', 1_800)], state: state(20, 18, 13_460) })); }],
  ],
};
const script = stories[v.story ?? 'portal'];

const keepAlive = setInterval(() => {}, 1_000); // the stream's own timers do not hold the process open
const ticker = setInterval(() => feed.tick(game), 5_000); // the agent sends the status every 5 s between calls
await stream.start();
const t0 = Date.now();
for (const [at, fn] of script) {
  if (at > seconds) break;
  const wait = t0 + at * 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  fn();
}
const left = t0 + seconds * 1000 - Date.now();
if (left > 0) await sleep(left);
await stream.stop('sample done');
clearInterval(keepAlive);
clearInterval(ticker);
for (const k of kids) k.kill('SIGTERM');
console.log(`wrote ${v.out}`);
