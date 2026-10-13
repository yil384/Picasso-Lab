// test/ui.test.js - the stream's UI layout: the agent's plain words (src/terminal.js: "Mine 3 oak logs", a short reason,
// the advice once per kind and change of words, the status as numbers, the HUD's items, place and game, all cleaned
// again by the service), the HUD (src/ui-panel.js, layout 2: the header, Muse's words, the trace of the call and its
// steps and the earlier calls, the goal, the items, the place and the advice; frames as uncompressed BMP at the panel's
// size), ffmpeg's UI chain and its sound (the game, the music bed ducked
// under it, a limiter), the camera rig's sound server script, and end to end a camera stream in the UI layout with music
// to an MP4 of 1080x1080 with sound.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { plainCall, plainStep, countOf, shortWhy, severityOf, statusData, createTermFeed, cleanTerm, cutWords, invOf, placeOf } from '../src/terminal.js';
import { createUiPanel, milestoneWords, adviceGist, shortReason, iconFor, actionGist, DEFAULT_GOAL } from '../src/ui-panel.js';
import { ffmpegArgs, audioArgs, findFfmpeg, streamAspect } from '../src/stream.js';
import { createCameraStream, pulseScript, pulsePaths, PULSE_SOURCE } from '../src/camera.js';
import { callRow } from '../src/mcp.js';
import { subStepOf } from '../src/mineai/body.js';
import { callLine } from '../src/terminal.js';

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
  assert.deepEqual(statusData({ health: 17.6, food: 17, time: 2_250 }, { muse: 47, reflex: 4, musePct: 92 }), { hp: 18, food: 17, clock: 'DAY 08:15', ticks: 2250, muse: 47, reflex: 4, pct: 92 });
  assert.deepEqual(statusData({ health: 20, food: 20, dimension: 'the_nether' }, null), { hp: 20, food: 20, clock: 'NETHER' });
});

test('why: Muse\'s own words with a call go to the stream (cleaned, cut at a whole word within 140) and the log; the body never sees them', () => {
  const why = 'Night in 2 min and no shield: digging in, then smelting the iron while I wait';
  assert.deepEqual(callLine('play', { skill: 'shelter', args: {}, why }), { k: 'call', t: '> play: shelter', say: 'Build a shelter for the night', tool: 'play', words: why, raw: JSON.stringify({ skill: 'shelter', args: {}, why }), of: 1, steps: [{ say: 'Build a shelter for the night', raw: 'shelter' }] });
  const long = callLine('play_sequence', { steps: [{ skill: 'eat', args: {} }], why: `${'x '.repeat(100)}token EAAPageTok3n0123456789abcdef` }).words;
  assert.ok(long.length <= 140 && long.endsWith('x...'), long);
  // production game ga13a88's first why was cut at 140 characters mid-word ("for the nig"): now at the word
  const ga = 'Night with sunrise 6 min out and no tools yet: grabbing birch logs, crafting a wooden pickaxe, and pulling cobblestone to dig in for the night';
  assert.equal(callLine('play_sequence', { steps: [{ skill: 'eat', args: {} }], why: ga }).words, 'Night with sunrise 6 min out and no tools yet: grabbing birch logs, crafting a wooden pickaxe, and pulling cobblestone to dig in for the...');
  assert.equal(cutWords('short', 140), 'short');
  assert.equal(cleanTerm({ lines: [{ k: 'call', t: '> play', words: ga }] }).lines[0].words.endsWith('for the...'), true, 'the service cuts at a word too');
  assert.equal(callLine('play', { skill: 'collect', block: 'stone', n: 3, why: 'x' }).steps[0].raw, 'collect stone 3', 'the why is never a raw argument');
  assert.equal(callLine('play', { skill: 'eat', args: {} }).words, undefined, 'optional');
  assert.equal(callRow('play_sequence', { steps: [{ skill: 'eat', args: {} }], why }, { structuredContent: {} }, 'g1', 5).why, why);
  assert.equal(cleanTerm({ lines: [{ k: 'call', t: '> play', words: 'see https://x.example now' }] }).lines[0].words, 'see [link] now');
});

test('sub-steps: the body carrying out a command, from the runtime\'s checkpoints, at most twice a second to the video', () => {
  assert.deepEqual(subStepOf('navigate', { x: 1, y: 2, z: 3 }, { remainingDistance: 23.4 }), { kind: 'walk', text: '23 blocks to go', left: 23 });
  assert.deepEqual(subStepOf('collect_block', { block_name: 'obsidian', count: 14 }, { gained: 3, requested: 14 }), { kind: 'mine', text: 'mining obsidian', done: 3, of: 14 });
  assert.deepEqual(subStepOf('build_structure', {}, { phase: 'building', correct: 7, requested: 12 }), { kind: 'build', text: 'placing blocks', done: 7, of: 12 });
  assert.equal(subStepOf('use_bucket', { liquid: 'water' }, { phase: 'approaching_and_pouring', targetBlock: 'lava' }).text, 'pouring water on lava');
  assert.deepEqual(subStepOf('smelt_item', { item_name: 'raw_iron', count: 5 }, { phase: 'smelting_or_collecting', produced: 2, requested: 5 }), { kind: 'smelt', text: 'smelting raw iron', done: 2, of: 5 });
  assert.equal(subStepOf('smelt_item', {}, { phase: 'loading_furnace' }).text, 'loading the furnace');
  assert.equal(subStepOf('hunt_mob', { entity_name: 'zombie' }, { attacks: 3 }).text, 'fighting a zombie, 3 hits');
  assert.equal(subStepOf('craft_item', {}, {}), null);
  // the feed: the body's progress events go out as sub, throttled, and with every update
  const sent = [];
  let clock = 1_000_000;
  const handlers = [];
  const body = { on: (name, fn) => { handlers.push(fn); return () => handlers.splice(handlers.indexOf(fn), 1); }, attribution: () => null };
  const feed = createTermFeed({ send: (id, u) => sent.push(u), now: () => clock });
  const game = { id: 'g1', body };
  feed.call(game, 'play', { skill: 'collect', args: { block: 'obsidian', n: 14 } });
  assert.equal(handlers.length, 1, 'subscribed once');
  handlers[0]({ sub: { kind: 'mine', text: 'obsidian 1 of 14', done: 1, of: 14 } });
  assert.deepEqual([sent.at(-1).lines, sent.at(-1).sub, sent.at(-1).live.mode], [[], { kind: 'mine', text: 'obsidian 1 of 14', done: 1, of: 14 }, 'idle'], 'with what is happening (the step running, when the queue says)');
  clock += 200;
  handlers[0]({ sub: { kind: 'mine', text: 'obsidian 2 of 14', done: 2, of: 14 } });
  assert.equal(sent.at(-1).sub.text, 'obsidian 1 of 14', 'within 500 ms: not sent');
  feed.call(game, 'get_state', {});
  assert.equal(sent.at(-1).sub.text, 'obsidian 2 of 14', 'every update carries the latest');
  clock += 600;
  handlers[0]({ sub: null });
  assert.equal(sent.at(-1).sub, null, 'the step ended');
  feed.forget('g1');
  assert.equal(handlers.length, 0, 'unsubscribed');
  assert.deepEqual(cleanTerm({ lines: [], sub: { kind: 'evil', text: 'near Muse_aB3dE9fGh2k', done: -4 } }).sub, { kind: 'other', text: 'near a player', done: 0 });
  assert.equal(cleanTerm({ lines: [], sub: null }).sub, null);
});

test('what Muse saw and whether it took the advice: a line after a get_state, and one when the next command takes (or leaves) it', () => {
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(u) });
  const game = { id: 'g1', body: { attribution: () => null } };
  const reply = (st) => ({ content: [{ type: 'text', text: '' }], structuredContent: st });
  feed.reply(game, 'get_state', {}, reply({ steps: [], state: { health: 19.6, food: 14, time: 21_000, inventory: { obsidian: 14, water_bucket: 1, dirt: 30 } },
    advice: [{ kind: 'night', text: 'night (time 21000): no closed shelter around you; 13 blocks for one', hint: { skill: 'shelter', args: {} } }] }));
  assert.equal(sent.at(-1).lines.find((l) => l.k === 'checked').t, 'Muse checked: HP 20, food 14, 14 obsidian, 1 water bucket, dawn in 2 min');
  feed.call(game, 'play_sequence', { steps: [{ skill: 'shelter', args: {} }, { skill: 'smelt', args: { item: 'raw_iron', n: 3 } }] });
  assert.deepEqual(sent.at(-1).lines.find((l) => l.k === 'follow'), { k: 'follow', t: 'Followed the body\'s advice: night: no closed shelter around you', ok: 1 });
  feed.reply(game, 'get_state', {}, reply({ steps: [], state: { health: 20, food: 14, time: 21_000 }, advice: [{ kind: 'night', text: 'night (time 21000): no closed shelter around you', hint: { skill: 'shelter', args: {} } }] }));
  feed.call(game, 'play', { skill: 'collect', args: { block: 'iron_ore', n: 3 } });
  assert.equal(sent.at(-1).lines.find((l) => l.k === 'follow').t, 'Went on without the body\'s advice: night: no closed shelter around you');
  feed.call(game, 'play', { skill: 'eat', args: {} });
  assert.equal(sent.at(-1).lines.some((l) => l.k === 'follow'), false, 'judged once, for the next command only');
});

test('feed: the advice once per kind and change of words (the time in it is not news), the list as it stands with each update', () => {
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(u) });
  const game = { id: 'g1', body: { attribution: () => ({ muse: 1, reflex: 0 }) } };
  const reply = (advice) => ({ content: [{ type: 'text', text: '' }], structuredContent: { steps: [], advice, state: { health: 20, food: 20, time: 13_100 } } });
  feed.reply(game, 'get_state', {}, reply([{ kind: 'night', text: 'night (time 13100): no closed shelter around you, no shield' }, { kind: 'shield', text: 'no shield; you can make one' }]));
  assert.deepEqual(sent.at(-1).lines.filter((l) => l.k === 'advice').map((l) => l.ak), ['night', 'shield']);
  feed.reply(game, 'get_state', {}, reply([{ kind: 'night', text: 'night (time 13350): no closed shelter around you, no shield' }, { kind: 'shield', text: 'no shield; you can make one' }]));
  assert.deepEqual(sent.at(-1).lines.filter((l) => l.k === 'advice'), [], 'only the number changed: no line');
  assert.equal(sent.at(-1).adv[0].t, 'night (time 13350): no closed shelter around you, no shield', 'the card gets the new words');
  feed.reply(game, 'get_state', {}, reply([{ kind: 'night', text: 'night (time 13400): no closed shelter around you' }]));
  assert.deepEqual(sent.at(-1).lines.filter((l) => l.k === 'advice').map((l) => l.t), ['advice: night (time 13400): no closed shelter around you'], 'the words changed');
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

test('HUD data: the call\'s steps and its number, a step\'s place in its call, the items, the place, the game; all cleaned again', () => {
  const sent = [];
  let clock = 1_000_000;
  let running = null;
  const snap = { dimension: 'overworld', health: 20, food: 17, timeOfDay: 19_000, position: { x: -8, y: 68.4, z: 236 }, inventory: { stone_pickaxe: 1, wooden_pickaxe: 1, raw_iron: 3, bread: 2, cooked_beef: 1 }, equipment: { offhand: 'shield' }, nearbyBlocks: [{ name: 'birch_log', nearest: { x: -18, y: 78, z: 240 }, distance: 11 }] };
  const feed = createTermFeed({ send: (id, u) => sent.push(cleanTerm(u)), now: () => clock, liveOf: () => ({ busy: Boolean(running), running }) });
  const game = { id: 'ga13a88', body: { snapshot: () => snap, attribution: () => ({ muse: 9, reflex: 1, musePct: 90 }) } };
  feed.reply(game, 'start_game', { adult: true }, { content: [], structuredContent: { steps: [] } });
  const steps = [{ skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } }, { skill: 'collect', args: { block: 'iron_ore', n: 5 } }];
  clock += 314_000;
  running = { call: { no: 3 }, step: 2, skill: 'collect', args: steps[1].args };
  feed.call(game, 'play_sequence', { why: 'Stone pickaxe crafted: iron next', steps });
  const u = sent.at(-1);
  assert.deepEqual(u.lines[0].steps, [{ say: 'Craft a stone pickaxe', raw: 'craft stone_pickaxe 1' }, { say: 'Mine 5 iron ore', raw: 'collect iron_ore 5' }]);
  assert.equal(u.lines[0].tool, 'play_sequence');
  assert.deepEqual([u.live.mode, u.live.c, u.live.s, u.live.step], ['run', 3, 2, 'Mine 5 iron ore'], 'the step running: its call\'s number and Muse\'s step');
  assert.deepEqual(u.inv, { diamond: 0, iron: 0, raw_iron: 3, obsidian: 0, flint_and_steel: 0, water_bucket: 0, lava_bucket: 0, bucket: 0, food: 3, shield: 1, pick: 'stone' });
  assert.deepEqual(u.pos, { y: 68, place: 'underground, under a birch forest' });
  assert.deepEqual(u.game, { id: 'ga13a88', s: 314 });
  // a reply: each result names its call and Muse's step (a craft the check added: pre, for the step after it)
  clock += 43_000;
  feed.reply(game, 'play_sequence', {}, { content: [], structuredContent: { steps: [
    { call: 3, n: 1, step: null, before: 1, skill: 'craft', args: { item: 'stick', n: 4 }, status: 'confirmed', result: 'crafted 4 stick', ms: 300 },
    { call: 3, n: 2, step: 1, skill: 'craft', args: steps[0].args, status: 'confirmed', result: 'crafted 1 stone_pickaxe', ms: 4_700 },
    { call: 3, n: 3, step: 2, skill: 'collect', args: steps[1].args, status: 'running' }] } });
  const r = sent.at(-1);
  assert.equal(r.bind, 3);
  assert.deepEqual(r.lines.filter((l) => l.k === 'ok').map((l) => [l.c, l.s, l.pre ?? 0]), [[3, 1, 1], [3, 1, 0]]);
  // a refused call: its reason in words
  feed.call(game, 'play_sequence', { steps: [{ skill: 'go_to', args: { pos: { x: 1, y: 2, z: 3 } } }] });
  feed.reply(game, 'play_sequence', {}, { isError: true, content: [{ type: 'text', text: '1. go_to: not run, bad arguments: go_to.pos is not allowed; go_to.x is required' }], structuredContent: { code: 'BAD_ARGS', steps: [] } });
  assert.equal(sent.at(-1).lines.find((l) => l.k === 'fail').why, 'bad arguments: go_to.pos is not allowed');
  assert.match(sent.at(-1).lines.at(-1).t, /^< BAD_ARGS: 1. go_to: not run/, 'and the answer for the RAW console');
  // the service keeps only what it knows
  assert.deepEqual(cleanTerm({ inv: { diamond: 3, pick: 'netherite', evil: 1, obsidian: -4 }, pos: { y: 9999, place: 'near Muse_aB3dE9fGh2k' }, game: { id: 'bad id!', s: 'x' }, bind: 'x', lines: [] }),
    { lines: [], status: '', inv: { diamond: 3, obsidian: 0 }, pos: { y: 320, place: 'near a player' }, game: {} });
  // the words: places, items
  assert.deepEqual([placeOf('the_nether', 40, []), placeOf('overworld', -42, []), placeOf('overworld', 20, []), placeOf('overworld', 70, [{ name: 'spruce_log', nearest: { y: 71 }, distance: 4 }]), placeOf('overworld', 64, []), placeOf('overworld', 130, [])],
    ['the Nether', 'deep caves', 'caves', 'surface, spruce forest', 'surface', 'mountains']);
  assert.equal(invOf({ diamond_pickaxe: 1, iron_pickaxe: 1 }, {}).pick, 'diamond', 'the best pickaxe');
});

test('HUD: the trace (every step in plain words and raw: done with its time, running with the body\'s sub-step, queued; failed and skipped), Muse\'s words, the earlier calls, a toast, frames', () => {
  let t = 1_000_000;
  const dir = tmp();
  const p = createUiPanel({ width: 1080, height: 472, over: 72, file: path.join(dir, 'panel.bmp'), now: () => t });
  const at = (ms) => { t += ms; p.render(t); return p.state(); };
  p.term({ lines: [{ k: 'call', t: '> start_game', say: 'Start a new game', tool: 'start_game' }], st: { hp: 20, food: 17, clock: 'NIGHT 00:57', ticks: 18_962, muse: 9, reflex: 1, pct: 90 }, game: { id: 'ga13a88', s: 0 } });
  let st = at(10);
  assert.equal(st.current, null, 'start_game is never the call on top');
  assert.equal(st.status, 'Waiting for Muse’s first move · 0:00');
  assert.deepEqual([st.goal.title, st.goal.list.length, st.goal.list[0].k], ['Nether and back', 12, 'wooden_pickaxe'], 'no goal from the server yet: the way to the Nether and back');
  // a call: every step, in plain words and as Muse wrote it
  const steps = [{ say: 'Craft a stone pickaxe', raw: 'craft stone_pickaxe 1' }, { say: 'Mine 5 iron ore', raw: 'collect iron_ore 5' }, { say: 'Craft a furnace', raw: 'craft furnace 1' }, { say: 'Mine 4 coal ore', raw: 'collect coal_ore 4' }];
  p.term({ lines: [{ k: 'call', t: '> play_sequence: craft stone_pickaxe 1, collect iron_ore 5, craft furnace 1, collect coal_ore 4', say: 'Craft a stone pickaxe, then mine 5 iron ore, and 2 more', tool: 'play_sequence', words: 'Stone pickaxe crafted: iron next', of: 4, steps }], game: { id: 'ga13a88', s: 314 } });
  st = at(100);
  assert.deepEqual(st.current.states, ['run', 'queued', 'queued', 'queued']);
  assert.deepEqual(st.thoughts, [{ text: 'Stone pickaxe crafted: iron next', call: null }]);
  // the step running now (from the queue, before any reply): the ones before it are done, the call has its number
  p.term({ lines: [], live: { mode: 'run', c: 3, s: 2, step: 'Mine 5 iron ore' }, sub: { kind: 'mine', text: 'mining iron ore', done: 3, of: 5 } });
  st = at(100);
  assert.deepEqual([st.current.no, st.current.states, st.thoughts[0].call, st.sub.done], [3, ['ok', 'run', 'queued', 'queued'], 3, 3]);
  // the reply's results: by call and step; a craft the check added does not finish its step
  p.term({ bind: 3, lines: [{ k: 'ok', t: 'ok  crafted 4 stick', c: 3, s: 1, pre: 1, ms: 300 }, { k: 'ok', t: 'ok  crafted 1 stone pickaxe', c: 3, s: 1, ms: 4_700 }] });
  st = at(100);
  assert.deepEqual([st.calls[0].steps[0].ms, st.current.states], [5_000, ['ok', 'run', 'queued', 'queued']]);
  p.term({ lines: [{ k: 'ok', t: 'ok  mined 5 iron ore', c: 3, s: 2, ms: 36_100 }, { k: 'fail', t: 'FAIL craft furnace 1 NEED_ITEMS', c: 3, s: 3, why: 'missing items: 8 cobblestone', ms: 100 }, { k: 'info', t: 'skip collect coal ore 4: an earlier step failed', c: 3, s: 4 }], live: { mode: 'idle', reason: 'waiting', sinceS: 0 } });
  st = at(2_000);
  assert.deepEqual([st.calls[0].state.kind, st.current.states], ['fail', ['ok', 'ok', 'fail', 'skip']]);
  assert.equal(st.status, 'Waiting for Muse’s next move · 0:02');
  // get_state: what Muse saw is its line among the earlier calls; a refused call fails with its reason
  p.term({ lines: [{ k: 'call', t: '> get_state', say: 'Look around', tool: 'get_state' }, { k: 'checked', t: 'Muse checked: HP 20, food 17, dawn in 3 min' }] });
  p.term({ lines: [{ k: 'call', t: '> play_sequence', say: 'Walk to 1 2 3', tool: 'play_sequence', of: 1, steps: [{ say: 'Walk to 1 2 3', raw: 'go_to {pos}' }] }, { k: 'fail', t: 'FAIL BAD_ARGS 1. go_to: not run', why: 'bad arguments: go_to.pos is not allowed' }] });
  st = at(100);
  assert.deepEqual([st.calls[1].tool, st.calls[1].checked], ['get_state', 'HP 20, food 17, dawn in 3 min']);
  assert.deepEqual([st.calls[0].state.kind, st.calls[0].steps[0].why], ['fail', 'bad arguments: go_to.pos is not allowed']);
  // the body's own actions, deaths; a milestone: a toast for 6 s, and the checklist ticks it
  p.term({ lines: [{ k: 'reflex', t: 'reflex: defending itself (zombie), then back to mining' }, { k: 'milestone', t: 'milestone: a wooden pickaxe at 4:32' }] });
  st = at(100);
  assert.deepEqual([st.events[0], st.toast, st.goal.list[0].atS], [{ kind: 'reflex', text: 'defending itself (zombie)' }, 'Got a wooden pickaxe', 272]);
  assert.equal(at(6_500).toast, null);
  // the body's own actions lead with the action, not the reason they share (g40e978: two rows read the same)
  p.term({ lines: [{ k: 'body', t: 'body: waiting for your first call with hostile mobs near or at night: dug two blocks down to wait there (no blocks carried to close it over)' },
    { k: 'body', t: 'body: waiting for your first call with hostile mobs near or at night: stopped before its shelter was closed (your call came)' }] });
  st = at(100);
  assert.deepEqual(st.events.slice(0, 2).map((e) => e.text), ['stopped before its shelter was closed (your call came)', 'dug two blocks down to wait there (no blocks carried to close it over)']);
  assert.equal(actionGist('reflex: night: closed itself in at 1 2 3; it stays inside'), 'night: closed itself in at 1 2 3', 'a short lead stays');
  // frames: a top-down 32-bit BMP with the toast's see-through band
  p.write(t);
  const b = fs.readFileSync(path.join(dir, 'panel.bmp'));
  assert.deepEqual([b.toString('ascii', 0, 2), b.readInt32LE(18), b.readInt32LE(22), b.readUInt16LE(28)], ['BM', 1080, -544, 32]);
  assert.equal(b[54 + 3], 0, 'the band over the game is see-through');
  assert.equal(b[54 + (100 * 1080) * 4 + 3], 255, 'the panel itself is opaque');
  // the words: advice, reasons, icons, milestones
  assert.equal(adviceGist('advice: night (time 13100): no closed shelter around you; 7 blocks'), 'night: no closed shelter around you');
  assert.equal(shortReason('no lava pool within 16 blocks to make obsidian from'), 'no lava pool within 16 blocks');
  assert.deepEqual([iconFor('Walk to 1 2 3'), iconFor('Mine 3 iron ore'), iconFor('x', 'smelt'), iconFor('Go through the portal')], ['boot', 'pickaxe', 'flame', 'portal']);
  assert.equal(milestoneWords('entered the Nether at 0:41'), 'Entered the Nether');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('HUD: the state (the server\'s goal with its times and the next one, the items, the place, the advice and whether Muse took it), the header, and what is happening while nothing runs', () => {
  let t = 1_000_000;
  const p = createUiPanel({ width: 1080, height: 472, over: 72, now: () => t });
  const at = (ms) => { t += ms; p.render(t); return p.state(); };
  const goal = { key: 'nether', title: 'The Nether', reached: false, list: [{ k: 'wooden_pickaxe', t: 'wooden pickaxe', atS: 272 }, { k: 'stone_pickaxe', t: 'stone pickaxe', atS: null }, { k: 'nether', t: 'Nether', atS: null }] };
  p.term({ lines: [{ k: 'call', t: '> start_game', say: 'Start a new game', tool: 'start_game' }], goal, inv: { obsidian: 3, pick: 'wooden' }, pos: { y: -42, place: 'deep caves' }, game: { id: 'g1', s: 300 },
    st: { hp: 20, food: 20, clock: 'DAY 08:00', ticks: 2_000 }, live: { mode: 'idle', reason: 'waiting', sinceS: 0 }, adv: [{ k: 'night', t: 'night (time 12000): no closed shelter around you; 7 blocks', sev: 2 }] });
  let st = at(4_000);
  assert.deepEqual([st.goal.title, st.goal.list.map((m) => m.atS)], ['The Nether', [272, null, null]], 'the server\'s goal');
  assert.deepEqual([st.inv.obsidian, st.pos.place, st.game], [3, 'deep caves', { id: 'g1', s: 304 }], 'the game\'s age counts on');
  assert.deepEqual(st.advice, [{ k: 'night', text: 'night: no closed shelter around you', sev: 2 }]);
  p.term({ lines: [{ k: 'follow', t: 'Went on without the body\'s advice: night' }] });
  assert.equal(at(10).follow, 'Went on without the body\'s advice: night');
  assert.equal(st.status, 'Waiting for Muse’s first move · 0:04');
  // a command runs, then sheltering until dawn, Muse looking; the clock moves on
  p.term({ lines: [{ k: 'call', t: '> play', say: 'Build a shelter for the night', tool: 'play', of: 1, steps: [{ say: 'Build a shelter for the night', raw: 'shelter' }] }], live: { mode: 'run', step: 'Build a shelter for the night', sinceS: 0 } });
  assert.equal(at(100).status, null, 'a command runs');
  p.term({ lines: [{ k: 'ok', t: 'ok', say: 'Build a shelter for the night', ms: 7_000 }], st: { ticks: 13_600, clock: 'NIGHT 19:36' }, live: { mode: 'idle', reason: 'shelter', sinceS: 0, dawnS: 470 } });
  assert.equal(at(3_000).status, 'Sheltering until morning (Muse’s choice), night ends in ~8 min');
  p.term({ lines: [{ k: 'call', t: '> get_state', tool: 'get_state' }], live: { mode: 'idle', reason: 'checking', sinceS: 0 } });
  assert.equal(at(12_000).status, 'Muse is checking the situation · 0:12');
  p.term({ st: { ticks: 2_000, clock: 'DAY 08:00' } });
  t += 5_000;
  p.term({ st: { ticks: 2_100, clock: 'DAY 08:06' } });
  t += 10_000; p.render(t);
  assert.equal(p.state().clock, 'DAY 08:18', '200 more ticks: 12 game minutes');
  p.term({ lines: [{ k: 'info', t: 'game over after 42:10' }] });
  assert.equal(at(10).status, 'Game over after 42:10');
  // set_goal: a counted goal (its parts with counts), lit as new for a while, with a toast; then a goal of plain words
  p.term({ lines: [{ k: 'call', t: '> set_goal: kill 100 pigs', say: 'A new goal: kill 100 pigs', tool: 'set_goal' }],
    goal: { key: 'custom', title: 'kill 100 pigs', text: 'kill 100 pigs', reached: false, list: [{ k: 'kill_pig', t: 'pigs killed', done: 37, of: 100, atS: null }] } });
  st = at(100);
  assert.deepEqual([st.goal.title, st.goal.list[0].done, st.goal.list[0].of, st.newGoal, st.toast, st.calls[0].say], ['kill 100 pigs', 37, 100, true, 'New goal: Kill 100 pigs', 'A new goal: kill 100 pigs']);
  p.term({ goal: { key: 'custom', title: 'kill 100 pigs', text: 'kill 100 pigs', reached: false, list: [{ k: 'kill_pig', t: 'pigs killed', done: 38, of: 100, atS: null }] } });
  assert.equal(at(100).goal.list[0].done, 38, 'a count moving on is not a new goal');
  assert.equal(at(10_000).newGoal, false, 'lit for 10 s');
  p.term({ goal: { key: 'free', title: 'Free play', text: 'build a cozy base by the lake', reached: false, list: [] } });
  st = at(100);
  assert.deepEqual([st.goal.text, st.goal.list.length, st.newGoal], ['build a cozy base by the lake', 0, true], 'a goal of plain words: its words, no checklist');
  p.reset('waiting for the next game');
  st = at(10);
  assert.deepEqual([st.calls.length, st.goal.title, st.inv, st.status], [0, DEFAULT_GOAL.title, null, 'Waiting for the next game']);
});

test('panel: a frame costs little (cached cards, sprites drawn at their size)', () => {
  let t = 1_000_000;
  const p = createUiPanel({ width: 1080, height: 472, over: 72, now: () => t });
  p.term({ lines: [{ k: 'call', t: '> play', say: 'Mine 3 oak logs', words: 'Wood first: planks, a table, then a pickaxe' }], st: { hp: 20, food: 20, clock: 'DAY 08:15', muse: 1, reflex: 0 }, sub: { kind: 'mine', text: 'mining oak logs', done: 1, of: 3 } });
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
  const over = ffmpegArgs({ output: '/tmp/x.mp4', width: 1080, height: 1080, fps: 30, x11: { display: ':99.0+0,0', width: 960, height: 540 }, panel: { file: '/dev/shm/p/panel.bmp', top: 608, kind: 'ui', fps: 30, over: 72 } });
  assert.match(over[over.indexOf('-vf') + 1], /scale=1080:544,format=yuva420p\[pan\];\[top\]\[pan\]overlay=0:536:format=yuv420\[out\]$/, 'the toast\'s band over the game, overlaid with its alpha');
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
