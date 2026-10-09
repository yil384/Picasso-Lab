// test/care.test.js - what the body does by itself between the player's calls (src/mineai/care.js, ROADMAP M4): the
// decisions (a death's items, armor, food, spare tools, the night), their reflex events in our words, and the care loop
// against stand-ins for the body's calls: it acts only while the body is idle, yields to the player's step, and keeps a
// journal of everything it did.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decide, wearPlan, armorPlan, sparePlan, replacementFor, describeEvents, shelterCells, shelterVerdict, shelterBlocks,
  createCare, isNight, toolClassFor, pickaxeTierFor, describeCare, CARE_DEFAULTS, RECOVER_WITHIN_MS,
} from '../src/mineai/care.js';

const NOW = Date.parse('2026-10-09T03:00:00Z');
const stack = (name, count = 1, location = 'main', durability = null) => ({ name, count, location, durability });
const situation = (o = {}) => ({
  dimension: 'overworld', observedAt: new Date(NOW).toISOString(), vitals: { health: 20, food: 20, ...(o.vitals ?? {}) },
  clock: { timeOfDay: 1000, phase: 'day', ...(o.clock ?? {}) }, position: { x: 10.5, y: 64, z: -3.5, headingDegrees: 90 },
  nearby: { hostiles: [], mobs: [], players: [], ...(o.nearby ?? {}) }, lastDeath: o.lastDeath ?? null, activity: { owner: 'idle' },
});

test('care: night is from a little before beds until a little before morning', () => {
  assert.equal(isNight(12_000), false);
  assert.equal(isNight(12_300), true);
  assert.equal(isNight(18_000), true);
  assert.equal(isNight(23_300), false);
  assert.equal(isNight(undefined), false);
});

test('care: armor worn and crafted, best first, iron kept back for a pickaxe', () => {
  assert.deepEqual(wearPlan([stack('iron_chestplate'), stack('leather_chestplate', 1, 'torso'), stack('shield')]), [
    { item: 'iron_chestplate', to: 'torso' }, { item: 'shield', to: 'off-hand' },
  ]);
  assert.deepEqual(wearPlan([stack('leather_boots'), stack('iron_boots', 1, 'feet')]), [], 'a worse piece is not put on');
  assert.deepEqual(wearPlan([stack('shield'), stack('totem_of_undying', 1, 'off-hand')]), [], 'the off-hand is not emptied');
  // 24 ingots, 3 kept: chestplate 8, leggings 7, boots 4 (2 left over plus the 3): no helmet
  assert.deepEqual(armorPlan({ iron_ingot: 24 }, []).map((p) => p.item), ['iron_chestplate', 'iron_leggings', 'iron_boots']);
  assert.deepEqual(armorPlan({ iron_ingot: 24 }, [], { reserve: 0 }).map((p) => p.item), ['iron_chestplate', 'iron_leggings', 'iron_boots', 'iron_helmet']);
  assert.deepEqual(armorPlan({ iron_ingot: 7 }, []).map((p) => p.item), ['iron_boots'], 'only what the ingots beyond 3 pay for');
  assert.deepEqual(armorPlan({ leather: 8 }, [stack('iron_chestplate', 1, 'torso')]).map((p) => p.item), ['leather_leggings'], 'nothing worse than what is worn');
  assert.deepEqual(armorPlan({ diamond: 8 }, []), [], 'diamonds are never used by the body itself');
  assert.deepEqual(armorPlan({ diamond: 8 }, [], { reserve: 0, materials: ['diamond', 'iron', 'leather'] }).map((p) => p.item), ['diamond_chestplate']);
});

test('care: a tool about to break gets a spare of the best tier it can pay for', () => {
  const low = (name, left, max) => stack(name, 1, 'hotbar', { remaining: left, maximum: max });
  const can = (list) => (item) => list.includes(item);
  assert.deepEqual(sparePlan([low('stone_pickaxe', 5, 131)], 'pickaxe', can(['stone_pickaxe', 'wooden_pickaxe'])), { item: 'stone_pickaxe', low: { name: 'stone_pickaxe', left: 5 } });
  assert.equal(sparePlan([low('stone_pickaxe', 100, 131)], 'pickaxe', can(['stone_pickaxe'])), null, 'plenty left');
  assert.equal(sparePlan([low('stone_pickaxe', 5, 131), low('wooden_pickaxe', 50, 59)], 'pickaxe', can(['stone_pickaxe'])), null, 'another one has enough');
  assert.equal(sparePlan([low('stone_pickaxe', 5, 131)], 'pickaxe', can(['wooden_pickaxe']), { minTier: 'stone' }), null, 'a wooden one cannot mine iron');
  assert.deepEqual(sparePlan([low('stone_pickaxe', 14, 131)], 'pickaxe', can(['stone_pickaxe']), { need: 16 }).item, 'stone_pickaxe', 'a step that needs more than is left');
  assert.equal(sparePlan([low('iron_pickaxe', 3, 250)], 'pickaxe', can(['stone_pickaxe'])).item, 'stone_pickaxe', 'a lower tier when that is what it can pay for');
  assert.equal(replacementFor('pickaxe', can(['wooden_pickaxe', 'stone_pickaxe']), { upTo: 'iron', minTier: 'stone' }), 'stone_pickaxe');
  assert.equal(replacementFor('pickaxe', can(['wooden_pickaxe']), { upTo: 'stone', minTier: 'stone' }), null);
  assert.equal(toolClassFor('stone'), 'pickaxe');
  assert.equal(toolClassFor('iron_ore'), 'pickaxe');
  assert.equal(pickaxeTierFor('iron_ore'), 'stone');
  assert.equal(pickaxeTierFor('stone'), 'wooden');
});

test('care: what to do first, and nothing while nothing is needed', () => {
  const base = { now: NOW, policy: CARE_DEFAULTS, memory: { cool: {}, night: 0 } };
  assert.equal(decide(situation(), { ...base, inventory: {}, stacks: [] }), null, 'a fed bot in daylight does nothing');
  // a death within 5 minutes: back for its items, before anything else
  const died = { position: { x: 5, y: 60, z: 7 }, dimension: 'overworld', observedAt: new Date(NOW - 30_000).toISOString(), cause: 'Tst_x was slain by Zombie' };
  const d1 = decide(situation({ lastDeath: died, vitals: { food: 5 }, clock: { timeOfDay: 15000 } }), { ...base, inventory: { bread: 2 }, stacks: [] });
  assert.equal(d1.kind, 'recover');
  assert.equal(d1.why, "it died (was slain by Zombie) at 5 60 7 30 s ago");
  assert.equal(decide(situation({ lastDeath: died }), { ...base, memory: { ...base.memory, recovered: died.observedAt } }), null, 'once per death');
  assert.equal(decide(situation({ lastDeath: { ...died, position: { x: 12000, y: 70, z: 5 } } }), base).far, 11990, 'respawned too far away: said, not tried');
  assert.equal(decide(situation({ lastDeath: { ...died, observedAt: new Date(NOW - RECOVER_WITHIN_MS - 1).toISOString() } }), base), null, 'too late: the items are gone');
  // armor carried and not worn
  assert.equal(decide(situation(), { ...base, stacks: [stack('iron_helmet')] }).kind, 'wear');
  // hungry with food: eat (raw meat too); with none: hunt an animal near by, in daylight
  assert.deepEqual(decide(situation({ vitals: { food: 12 } }), { ...base, inventory: { beef: 2 } }).food, 'beef');
  const cow = { name: 'cow', kind: 'animal', age: 'adult', nearest: { distance: 9 } };
  const hunt = decide(situation({ vitals: { food: 12 }, nearby: { mobs: [cow] } }), { ...base, inventory: {} });
  assert.deepEqual([hunt.kind, hunt.mob, hunt.drop], ['hunt', 'cow', 'beef']);
  assert.equal(decide(situation({ vitals: { food: 12 }, clock: { timeOfDay: 15000 }, nearby: { mobs: [cow] } }), { ...base, inventory: { cobblestone: 20 } }).kind, 'shelter', 'no hunting at night unless starving');
  assert.equal(decide(situation({ vitals: { food: 5 }, clock: { timeOfDay: 15000 }, nearby: { mobs: [cow] } }), { ...base, inventory: {} }).kind, 'hunt', 'starving: hunt even at night');
  assert.equal(decide(situation({ vitals: { food: 12 }, nearby: { mobs: [{ ...cow, name: 'chicken' }] } }), { ...base, inventory: {} }), null, 'raw chicken only when it can be cooked');
  // eating waits while a hostile mob is close (their reflex has the fight)
  assert.equal(decide(situation({ vitals: { food: 12 }, nearby: { hostiles: [{ name: 'zombie', kind: 'hostile', nearest: { distance: 5 } }] } }), { ...base, inventory: { bread: 1 } }), null);
  // night: a bed carried and nobody hostile near: sleep; else a shelter; already sheltered here this night: nothing
  const night = situation({ clock: { timeOfDay: 14000, phase: 'night' } });
  assert.equal(decide(night, { ...base, inventory: { white_bed: 1, cobblestone: 20 } }).kind, 'sleep');
  assert.equal(decide(night, { ...base, inventory: { white_bed: 1 }, memory: { ...base.memory, slept: 0 } }).kind, 'shelter', 'slept this night already');
  const sh = decide(night, { ...base, inventory: { dirt: 3 } });
  assert.deepEqual([sh.kind, sh.blocks], ['shelter', 3]);
  const memory = { cool: {}, night: 0, shelter: { feet: { x: 10, y: 64, z: -4 }, at: NOW - 10_000, checked: NOW - 10_000, night: 0 } };
  assert.equal(decide(night, { ...base, inventory: {}, memory }), null, 'sheltered here this night, checked lately');
  assert.equal(decide(night, { ...base, inventory: {}, memory: { ...memory, shelter: { ...memory.shelter, checked: NOW - 120_000 } } }).check, true, 'checked again after 90 s');
  assert.equal(decide(night, { ...base, policy: { ...CARE_DEFAULTS, night: 'off' }, inventory: {} }), null, 'night: off');
  // the nether has no night
  assert.equal(decide({ ...night, dimension: 'the_nether' }, { ...base, inventory: { cobblestone: 20 } }), null);
  // a spare before a tool breaks
  const t = decide(situation(), { ...base, stacks: [stack('stone_pickaxe', 1, 'hotbar', { remaining: 4, maximum: 131 })], canCraft: (i) => i === 'stone_pickaxe' });
  assert.deepEqual([t.kind, t.item], ['tools', 'stone_pickaxe']);
  // armor crafted from leather or spare iron
  const a = decide(situation(), { ...base, inventory: { iron_ingot: 11 }, canCraft: () => true });
  assert.deepEqual([a.kind, a.pieces.map((p) => p.item)], ['armor', ['iron_chestplate']]);
  assert.equal(decide(situation(), { ...base, policy: { ...CARE_DEFAULTS, armor: 'wear' }, inventory: { iron_ingot: 11 }, canCraft: () => true }), null);
});

test('care: a shelter of carried blocks, best first, and a wall of solid ground is wall enough', () => {
  assert.deepEqual(shelterBlocks({ dirt: 4, cobblestone: 3, oak_planks: 9 }), { list: [{ name: 'cobblestone', count: 3 }, { name: 'dirt', count: 4 }], total: 7 });
  const cells = shelterCells({ x: 0, y: 64, z: 0 }, 0, { cobblestone: 3, dirt: 20 }); // facing north (-z)
  assert.equal(cells.filter((c) => c.block_name !== 'air').length, 13);
  assert.equal(cells.filter((c) => c.block_name === 'cobblestone').length, 3);
  const at = (x, y, z) => cells.find((c) => c.x === x && c.y === y && c.z === z)?.block_name;
  assert.equal(at(0, 64, 0), 'air', 'the bot stands inside');
  assert.equal(at(0, 65, 0), 'air');
  assert.equal(at(0, 64, -1), 'air', 'a pocket in front of its feet for a table or furnace');
  assert.notEqual(at(0, 65, -1), 'air', 'the pocket has a ceiling');
  assert.notEqual(at(0, 65, -2), 'air', 'and a block the ceiling goes against');
  assert.ok(at(0, 64, -2) && at(1, 64, -1) && at(-1, 64, -1) && at(0, 64, 1) && at(1, 64, 0) && at(-1, 64, 0), 'closed all round');
  assert.notEqual(at(0, 66, 0), 'air', 'a roof over its head');
  assert.equal(new Set(cells.map((c) => `${c.x},${c.y},${c.z}`)).size, cells.length, 'no cell twice');
  assert.deepEqual(shelterVerdict({ placed: 1, cells: 12, wrong: 8, kept: [], left: [{ reason: 'holds_another_block', count: 8 }] }), { closed: true, placed: 1, solid: 8, why: null, short: 0 });
  const open = shelterVerdict({ placed: 0, cells: 12, wrong: 2, kept: [], left: [{ reason: 'unreachable', count: 1 }, { reason: 'block_not_carried', count: 1 }], missing: [{ block: 'dirt', count: 1 }] });
  assert.equal(open.closed, false);
  assert.match(open.why, /1 cell: unreachable; 1 cell: block not carried; short of 1 dirt/);
  assert.equal(open.short, 1);
});

test('care: their reflex events in our words, a fight of many contacts as one line', () => {
  const out = (source, evidence) => ({ type: 'survival_outcome', observedAt: '2026-10-09T02:25:35Z', payload: { kind: 'outcome', source, evidence } });
  const fight = (o, extra = {}) => out('hostile_reflex', { response: 'fight', cancelled: false, interrupted: null, outcome: { threats: [{ id: 1, name: 'zombie' }], attacks: 3, killedTargetIds: [], explosions: 0, healthBefore: 20, healthAfter: 20, ...o }, ...extra });
  const lines = describeEvents([
    { type: 'player_message', payload: { message: 'hello from a stranger' } },
    fight({ healthAfter: 14 }),
    fight({ healthBefore: 14, healthAfter: 14, killedTargetIds: [1] }),
    fight({ attacks: 0 }), // a contact that changed nothing
    out('hostile_reflex', { response: 'evade', cancelled: true, interrupted: null, outcome: { threats: [{ id: 2, name: 'creeper' }], attacks: 0, killedTargetIds: [], explosions: 1, healthBefore: 14, healthAfter: 4.6 } }),
    fight({ healthAfter: 10 }, { interrupted: { action: 'collect_block', startedAt: '' } }), // a step's own result says it
    out('hunger_reflex', { interrupted: null, outcome: { kind: 'ate', food: 'bread', hungerBefore: 12, hungerAfter: 17 } }),
    { type: 'player_death', observedAt: '2026-10-09T02:27:00Z', payload: { position: { x: 5.5, y: 60, z: 7.5 }, cause: 'Tst_x was blown up by Creeper' } },
    { type: 'equipment_broken', observedAt: '2026-10-09T02:27:10Z', payload: { item: 'stone_pickaxe' } },
  ]);
  assert.deepEqual(lines.map((l) => l.kind), ['fight', 'eat', 'death', 'tool']);
  assert.equal(lines[0].text, 'fought zombie and killed one; fled from creeper; 1 explosion near it; health 20 -> 4.6');
  assert.equal(lines[1].text, 'ate bread: food 12 -> 17');
  assert.equal(lines[2].text, 'died: was blown up by Creeper at 5 60 7');
  assert.equal(lines[3].text, 'its stone_pickaxe broke');
  assert.doesNotMatch(JSON.stringify(lines), /stranger/, 'never chat');
});

test('care: the policy in words', () => {
  assert.match(describeCare(), /^shelters at night .*crafts a spare tool before one breaks; after a death it goes back for its items$/);
  assert.match(describeCare({ night: 'off', armor: 'off', food: 'off', tools: 'off' }), /^does nothing about the night; leaves armor to you; leaves eating to you .*makes no spare tools/);
});

/** Stand-ins for what the body gives the care: a status, the latest inventory, their actions (recorded). */
function careRig({ situation: sit, inventory = {}, stacks = [], results = {}, idle = true } = {}) {
  const calls = [];
  const events = [];
  const state = { situation: sit, inventory, stacks, idle, idleSince: NOW - 10_000, clock: NOW, events: [] };
  const deps = {
    situation: () => state.situation,
    latest: () => ({ inventory: state.inventory }),
    stacks: () => state.stacks,
    refresh: async () => {},
    act: async (call, deadline, ctl) => {
      calls.push(call);
      if (state.hold) { await new Promise((r) => { state.release = r; }); return { output: { result: { status: ctl.stopped ? 'cancelled' : 'succeeded' } }, stopped: ctl.stopped }; }
      const r = results[call.tool];
      const out = typeof r === 'function' ? r(call) : r ?? { status: 'succeeded' };
      return { output: { action: call.tool, result: out } };
    },
    rpc: async (tool) => (tool === 'read_recent_events' ? { result: { events: state.events.splice(0) } } : {}),
    plan: (skill, args) => (skill === 'craft_batch' ? { calls: args.items.map((i) => ({ tool: 'craft_item', args: { items: [{ item_name: i.item, count: i.n }] } })) } : { calls: [] }),
    idle: () => state.idle,
    idleSince: () => state.idleSince,
    furnaceNear: () => false, tableNear: () => true,
    event: (kind, data) => events.push({ kind, ...data }),
    now: () => state.clock,
    tickMs: 1_000_000,
  };
  return { care: createCare(deps), calls, events, state };
}

test('care loop: a shelter at night, journaled once; a step of the player\'s stops it at once', async () => {
  const rig = careRig({
    situation: situation({ clock: { timeOfDay: 14000, phase: 'night' } }), inventory: { cobblestone: 20 },
    results: { build_structure: { status: 'succeeded', structure: { cells: 15, correct: 15, placed: 10, dug: 0, wrong: 0, kept: [], left: [], supports: [] } } },
  });
  await rig.care.tick();
  assert.deepEqual(rig.calls.map((c) => c.tool), ['build_structure']);
  assert.equal(rig.calls[0].args.remove_wrong_blocks, false, 'never digs a wall out');
  assert.equal(rig.calls[0].args.blocks.filter((b) => b.block_name === 'cobblestone').length, 13);
  const [entry] = rig.care.since(0);
  assert.equal(entry.kind, 'shelter');
  assert.equal(entry.source, 'care');
  assert.match(entry.text, /^night \(time 14000\): closed itself in at 10 64 -4 \(placed 10 blocks\); it stays inside until your next call$/);
  await rig.care.tick();
  assert.equal(rig.calls.length, 1, 'sheltered: nothing more until it is checked again');
  assert.equal(rig.care.since(entry.seq).length, 0);
  // too few blocks: dig in first (and where it cannot, collect dirt)
  const dig = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { dirt: 2 }, results: { build_structure: { status: 'succeeded', structure: { cells: 12, correct: 4, placed: 1, wrong: 8, kept: [], left: [{ reason: 'holds_another_block', count: 8 }] } } } });
  await dig.care.tick();
  assert.deepEqual(dig.calls.map((c) => [c.tool, c.args.y]), [['navigate', 62], ['pick_up_items', undefined], ['build_structure', undefined]]);
  assert.match(dig.care.last().text, /dug two blocks down .*closed itself in .*placed 1 block, 8 wall cells already solid/);
  // short of blocks after all: dirt from around, then the shelter again
  let builds = 0;
  const short = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { dirt: 2 }, results: {
    navigate: { status: 'failed', error: '[NAVIGATION_TARGET_UNSUPPORTED] No usable footing' },
    build_structure: () => (++builds === 1
      ? { status: 'failed', error: '[BUILD_INCOMPLETE]', structure: { cells: 16, placed: 2, wrong: 11, kept: [], left: [{ reason: 'block_not_carried', count: 11 }], missing: [{ block: 'dirt', count: 11 }] } }
      : { status: 'succeeded', structure: { cells: 16, placed: 11, wrong: 0, kept: [], left: [] } }),
  } });
  await short.care.tick();
  assert.deepEqual(short.calls.map((c) => c.tool), ['navigate', 'build_structure', 'collect_block', 'build_structure']);
  assert.equal(short.calls[2].args.count, 13);
  assert.match(short.care.last().text, /could not dig in .*collected 13 dirt for walls; closed itself in/);
  // the player's step: the care's action is cancelled and the step goes on once it settled
  const busy = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { cobblestone: 20 } });
  busy.state.hold = true;
  const ticking = busy.care.tick();
  await new Promise((r) => { setImmediate(r); });
  assert.equal(busy.care.now(), 'sheltering for the night');
  let cancelled = null;
  const job = busy.care.yield().then((k) => { cancelled = k; });
  busy.state.release();
  await job;
  await ticking;
  assert.equal(cancelled, 'shelter');
  assert.equal(busy.care.now(), null);
  assert.match(busy.care.last().text, /could not close a shelter|stopped before/);
});

test('care loop: nothing while a step runs or just ended, or while one of their reflexes has the body', async () => {
  const rig = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { cobblestone: 20 } });
  rig.state.idle = false;
  await rig.care.tick();
  rig.state.idle = true;
  rig.state.idleSince = NOW - 1_000;
  await rig.care.tick();
  rig.state.idleSince = NOW - 10_000;
  rig.state.situation = { ...rig.state.situation, activity: { owner: 'hostile_reflex' } };
  await rig.care.tick();
  assert.equal(rig.calls.length, 0);
});

test('care loop: a death\'s items, armor crafted and worn, a hunt that cooks and eats, reflexes from their log', async () => {
  const died = { position: { x: 5, y: 60, z: 7 }, dimension: 'overworld', observedAt: new Date(NOW - 20_000).toISOString(), cause: 'Tst_x was slain by Zombie' };
  const rig = careRig({ situation: situation({ lastDeath: died }), inventory: {} });
  rig.calls.length = 0;
  const act = rig.care.tick();
  // the recovery brings the items back (the inventory read after it)
  rig.state.inventory = { cobblestone: 12, bread: 3 };
  await act;
  assert.deepEqual(rig.calls.map((c) => c.tool), ['pick_up_items']);
  assert.deepEqual(rig.calls[0].args, { recover_death_items: true });
  assert.match(rig.care.last().text, /^it died \(was slain by Zombie\) at 5 60 7 20 s ago: went back and picked up/);
  // armor from spare iron, then worn
  const arm = careRig({ situation: situation(), inventory: { iron_ingot: 11, stick: 4 } });
  arm.care.memory.cool = {};
  const results = { craft_item: () => { arm.state.inventory = { iron_ingot: 3, iron_chestplate: 1 }; arm.state.stacks = [stack('iron_chestplate')]; return { status: 'succeeded' }; } };
  Object.assign(arm, careRig({ situation: situation(), inventory: { iron_ingot: 11 }, results }));
  arm.state.stacks = [];
  results.craft_item = () => { arm.state.inventory = { iron_ingot: 3, iron_chestplate: 1 }; arm.state.stacks = [stack('iron_chestplate')]; return { status: 'succeeded' }; };
  await arm.care.tick();
  assert.deepEqual(arm.calls.map((c) => c.tool), ['craft_item', 'equip']);
  assert.deepEqual(arm.calls[1].args.items, [{ item_name: 'iron_chestplate', destination: 'torso' }]);
  assert.match(arm.care.last().text, /crafted iron_chestplate and put it on$/);
  // their reflexes while idle, in the journal as source reflex
  rig.state.events.push({ type: 'survival_outcome', observedAt: new Date(NOW).toISOString(), payload: { source: 'hunger_reflex', evidence: { interrupted: null, outcome: { kind: 'ate', food: 'bread', hungerBefore: 12, hungerAfter: 17 } } } });
  await rig.care.readEvents();
  assert.deepEqual([rig.care.last().source, rig.care.last().text], ['reflex', 'ate bread: food 12 -> 17']);
});

// ---------------------------------------------------------------------------------------------------------------
// the care inside the body (src/mineai/body.js) against the fake host, and what an MCP reply says about it

import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'care-log-')) });
const log = createLogger({ dir: null, config });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };

async function careBody(fakeOpts = {}, world = {}) {
  const hosts = fakeHosts(() => fakeOpts);
  const body = createMineAiBody({ config, log, hosts, gameId: 'gcare01', username: 'Tst_rv_c', careTickMs: 30, careIdleMs: 50 });
  const fake = await (async () => { await until(() => hosts.started[0]); return hosts.started[0].fake; })();
  Object.assign(fake.world, world);
  await body.ready;
  return { body, fake };
}

test('care in the body: night falls while idle: a shelter of carried blocks, journaled, then yields to a step', async () => {
  const { body, fake } = await careBody({ inventory: { cobblestone: 15, oak_log: 3 } }, { timeOfDay: 14000 });
  try {
    assert.ok(await until(() => fake.tools('build_structure').length > 0), 'the shelter was built');
    const cells = fake.tools('build_structure')[0].args.blocks;
    assert.equal(cells.filter((c) => c.block_name === 'cobblestone').length, 13);
    assert.ok(await until(() => body.onItsOwn(0).some((e) => e.kind === 'shelter')));
    assert.match(body.onItsOwn(0).find((e) => e.kind === 'shelter').text, /^night \(time 14000\): closed itself in at 10 64 -4 \(placed 13 blocks\)/);
    assert.match(body.state(), /last done on its own \(\d+ s ago\): night \(time 14000\): closed itself in/);
    // a step of the player's runs as before
    const r = await body.run('craft', { item: 'oak_planks', n: 4 });
    assert.equal(r.ok, true, r.result);
  } finally { await body.close(); }
});

test('care in the body: a pickaxe about to wear out gets a spare before a collect; one that breaks midway is replaced and the collect goes on', async () => {
  const { body, fake } = await careBody({ inventory: { stone_pickaxe: 1, cobblestone: 6, stick: 4, crafting_table: 1 } }, { durability: { stone_pickaxe: { remaining: 5, maximum: 131 } } });
  try {
    await body.refresh();
    const r = await body.run('collect', { block: 'stone', n: 12 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^on its own first: crafted a spare stone_pickaxe \(your stone_pickaxe had 5 uses left, too few for 12 stone\); mined 12 stone/);
    assert.deepEqual(fake.calls.filter((c) => ['craft_item', 'collect_block'].includes(c.tool)).map((c) => c.tool), ['craft_item', 'collect_block']);
    // the pickaxe breaks after 4 of 10: a new one, and the other 6
    fake.world.durability = {};
    fake.world.breakAfter = 4;
    const before = fake.calls.length;
    const b = await body.run('collect', { block: 'stone', n: 10 });
    assert.equal(b.ok, true, b.result);
    assert.match(b.result, /your stone_pickaxe broke after 4 of 10 stone; on its own: crafted a new stone_pickaxe and went on with the other 6; mined 6 stone/);
    const later = fake.calls.slice(before).filter((c) => ['craft_item', 'collect_block'].includes(c.tool));
    assert.deepEqual(later.map((c) => [c.tool, c.args.count ?? c.args.items?.[0]?.item_name]), [['collect_block', 10], ['craft_item', 'stone_pickaxe'], ['collect_block', 6]]);
  } finally { await body.close(); }
});

test('care in the body: the armor skill crafts and wears; policy knobs stay in the gateway', async () => {
  const { body, fake } = await careBody({ inventory: { iron_ingot: 24, stick: 2, crafting_table: 1 } });
  try {
    await body.refresh();
    const off = await body.run('policy', { armor: 'off', night: 'off' });
    assert.equal(off.ok, true, off.result);
    assert.match(off.result, /on its own between your calls: does nothing about the night; leaves armor to you; eats when hungry/);
    assert.equal(fake.tools('set_survival_policy').length, 0, 'nothing sent to the runtime');
    const r = await body.run('armor', {});
    assert.equal(r.ok, true, r.result);
    assert.deepEqual(Object.keys(body.equipment()).sort(), ['feet', 'head', 'legs', 'torso']);
    assert.equal(fake.world.inventory.get('iron_ingot') ?? 0, 0, 'every ingot: the skill keeps none back');
    const none = await body.run('armor', {});
    assert.equal(none.code, 'NEED_ITEMS');
    // both kinds of knobs in one call: theirs go to the runtime, ours stay here
    const both = await body.run('policy', { retreat_health: 10, food: 'eat' });
    assert.equal(both.ok, true, both.result);
    assert.equal(fake.tools('set_survival_policy').length, 1);
    assert.deepEqual(body.carePolicy(), { night: 'off', armor: 'off', food: 'eat', tools: 'spare' });
  } finally { await body.close(); }
});

test('care through MCP: what the body did on its own is in the next reply, once', async () => {
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 15 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS,
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    const init = c.getInstructions?.() ?? '';
    assert.match(init, /Between your calls the body looks after itself/);
    let r = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    assert.ok(!r.isError, r.content[0].text);
    const fake = hosts.started[0].fake;
    fake.world.timeOfDay = 15000;
    fake.world.events.push({ type: 'survival_outcome', observedAt: new Date().toISOString(), payload: { source: 'hostile_reflex', evidence: { response: 'fight', cancelled: false, interrupted: null, outcome: { threats: [{ id: 3, name: 'zombie' }], attacks: 4, killedTargetIds: [3], explosions: 0, healthBefore: 20, healthAfter: 16 } } } });
    assert.ok(await until(() => fake.tools('build_structure').length > 0));
    await sleep(100);
    r = await c.callTool({ name: 'get_state', arguments: {} });
    const t = r.content.map((x) => x.text).join('\n');
    assert.match(t, /On its own since your last reply \(the body, not a step of yours\):\n- \d+ s ago, reflex, fight: fought zombie and killed one; health 20 -> 16\n- \d+ s ago, on its own, shelter: night \(time 15000\): closed itself in/);
    assert.deepEqual(r.structuredContent.onItsOwn.map((e) => [e.source, e.kind, e.ok]), [['reflex', 'fight', true], ['care', 'shelter', true]]);
    assert.equal(r.structuredContent.state.time, 15000);
    r = await c.callTool({ name: 'get_state', arguments: {} });
    assert.equal(r.structuredContent.onItsOwn, undefined, 'told once');
    assert.doesNotMatch(r.content.map((x) => x.text).join('\n'), /On its own since/);
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});
