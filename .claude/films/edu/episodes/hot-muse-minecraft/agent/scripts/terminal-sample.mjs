#!/usr/bin/env node
// scripts/terminal-sample.mjs - a sample of the vertical live video with the terminal, made on this machine: a recorded
// clip stands in for the camera's X display, and a scripted Muse session (start_game, play_sequence, results, advice,
// a reflex, a milestone) goes through the real formatter (src/terminal.js) to the camera stream's panel
// (src/terminal-panel.js), exactly as the agent's replies would. No Minecraft, no Facebook.
//
//   node scripts/terminal-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 45] [--from 30] [--size 1080x1920]

import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { parseArgs } from 'node:util';
import { createCameraStream } from '../src/camera.js';
import { createTermFeed } from '../src/terminal.js';
import { findFfmpeg } from '../src/stream.js';

const { values: v } = parseArgs({ options: {
  clip: { type: 'string' }, out: { type: 'string' }, seconds: { type: 'string' }, from: { type: 'string' }, size: { type: 'string' },
} });
if (!v.clip || !v.out) { console.error('usage: node scripts/terminal-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 45] [--from 0] [--size 1080x1920]'); process.exit(2); }
const seconds = Number(v.seconds ?? 45);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a camera rig that is always in the world
const em = new EventEmitter();
const rig = {
  state: 'ready', name: 'MuseCam', options: { display: 4242, width: 960, height: 540, followMs: 60_000 },
  start() {}, waitReady: async () => true, follow: async () => true, keepFollowing: async () => true, park: async () => {},
  stats: async () => ({ state: 'ready' }), on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); },
};
let clip = v.clip;
if (v.from) { // start the clip later: a trimmed copy
  clip = `${v.out}.clip.mp4`;
  const { execFileSync } = await import('node:child_process');
  execFileSync(findFfmpeg(), ['-v', 'error', '-ss', String(v.from), '-i', v.clip, '-t', String(seconds + 10), '-c', 'copy', '-y', clip]);
}
const stream = createCameraStream({
  rig, player: 'Muse_sample1', output: v.out, fileSource: clip, settleMs: 10, layout: 'terminal', terminalSize: v.size ?? '1080x1920',
  event: (k, d) => { if (/error|failed|exit/.test(k)) console.error(k, JSON.stringify(d)); },
});

// the game as the MCP layer sees it, and the feed that turns calls and replies into terminal lines
const game = { id: 'g7a1c2e', body: { attribution: () => att } };
let att = { muse: 0, reflex: 0, musePct: null };
const feed = createTermFeed({ send: (id, u) => stream.term(u) });
const state = (health, food, time) => ({ health, food, time, pos: { x: 12, y: 70, z: -40 } });
const step = (call, n, skill, args, status, result, ms, gained) => ({ call, n, step: n, skill, args, status, result, ms, ...(gained ? { gained } : {}) });
const reply = (structured, isError = false) => ({ content: [{ type: 'text', text: '' }], structuredContent: structured, ...(isError ? { isError: true } : {}) });

const script = [
  [0.5, () => feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 20, 23_400) }))],
  [2, () => { feed.call(game, 'play_sequence', { steps: [{ skill: 'collect', args: { block: 'oak_log', n: 5 } }] }); att = { muse: 1, reflex: 0, musePct: 100 }; }],
  [6, () => feed.reply(game, 'get_state', {}, reply({ steps: [], state: state(20, 20, 23_700), advice: [{ kind: 'food', text: 'food 20, nothing to eat carried; cows 18 blocks east', hint: { skill: 'hunt', args: { target: 'cow' } } }] }))],
  [16, () => feed.reply(game, 'play_sequence', {}, reply({ steps: [step(1, 1, 'collect', { block: 'oak_log', n: 5 }, 'confirmed', 'mined 5 oak_log and picked up 5 oak_log (5 of 5 wanted)', 13_800, { oak_log: 5 })], state: state(20, 19, 23_950) }))],
  [17.5, () => { feed.call(game, 'play_sequence', { steps: [{ skill: 'craft', args: { item: 'oak_planks', n: 12 } }, { skill: 'craft', args: { item: 'stick', n: 4 } }, { skill: 'craft', args: { item: 'crafting_table', n: 1 } }, { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }] }); att = { muse: 5, reflex: 0, musePct: 100 }; }],
  [23, () => feed.reply(game, 'play_sequence', {}, reply({
    steps: [
      step(2, 1, 'craft', { item: 'oak_planks', n: 12 }, 'confirmed', 'crafted 12 oak_planks', 900, { oak_planks: 12 }),
      step(2, 2, 'craft', { item: 'stick', n: 4 }, 'confirmed', 'crafted 4 stick', 700, { stick: 4 }),
      step(2, 3, 'craft', { item: 'crafting_table', n: 1 }, 'confirmed', 'crafted 1 crafting_table', 600, { crafting_table: 1 }),
      step(2, 4, 'craft', { item: 'wooden_pickaxe', n: 1 }, 'confirmed', 'crafted 1 wooden_pickaxe at a crafting table put down at 14 70 -38', 2_400, { wooden_pickaxe: 1 }),
    ],
    state: state(20, 19, 200),
  }))],
  [24.5, () => { feed.call(game, 'play', { skill: 'collect', args: { block: 'iron_ore', n: 3 } }); att = { muse: 6, reflex: 0, musePct: 100 }; }],
  [26, () => feed.reply(game, 'play', {}, reply({ code: 'NOT_FOUND', steps: [step(3, 1, 'collect', { block: 'iron_ore', n: 3 }, 'failed', 'no iron_ore within 64 blocks; stone is 3 blocks down', 1_200)], state: state(20, 19, 400) }))],
  [27.5, () => { feed.call(game, 'play_sequence', { steps: [{ skill: 'collect', args: { block: 'stone', n: 10 } }] }); att = { muse: 7, reflex: 0, musePct: 100 }; }],
  [33, () => feed.reply(game, 'get_state', {}, reply({
    steps: [], state: state(16, 18, 900),
    onItsOwn: [{ seq: 1, agoS: 2, source: 'reflex', kind: 'defend', ok: true, text: 'defending itself (zombie), then back to collecting' }],
  }))],
  [35, () => { att = { muse: 7, reflex: 1, musePct: 88 }; }],
  [41, () => feed.reply(game, 'play_sequence', {}, reply({
    steps: [step(4, 1, 'collect', { block: 'stone', n: 10 }, 'confirmed', 'mined 10 stone (stone drops cobblestone) and picked up 10 cobblestone', 13_300, { cobblestone: 10 })],
    state: state(17, 18, 1_200),
    advice: [{ kind: 'night', text: 'night in 45 s, no shelter, no shield; 10 cobblestone carried (13 make a shelter)', hint: { skill: 'shelter', args: {} } }],
  }))],
  [42.5, () => { feed.call(game, 'play', { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } }); att = { muse: 8, reflex: 1, musePct: 89 }; }],
  [44, () => feed.reply(game, 'play', {}, reply({ steps: [step(5, 1, 'craft', { item: 'stone_pickaxe', n: 1 }, 'confirmed', 'crafted 1 stone_pickaxe at a crafting table', 1_900, { stone_pickaxe: 1 })], state: state(17, 18, 1_500) }))],
];

const keepAlive = setInterval(() => {}, 1_000); // the stream's own timers do not hold the process open
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
if (v.from) fs.rmSync(clip, { force: true });
console.log(`wrote ${v.out}`);
