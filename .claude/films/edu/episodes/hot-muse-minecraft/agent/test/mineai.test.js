// test/mineai.test.js - BODY=mineai with no Minecraft and no runtime of theirs: the skill mapping (our skills and the
// extra ones onto their actions, their results and codes back), the body against an in-process fake host (state,
// skills, stop and timeout through cancel_foreground_action, their result gate, a death, the policy revision, close),
// the host manager against a fake host process (loopback port of the range, token, no secrets in its environment,
// cap, a crash restarted once, missed heartbeats, killed on close), the MCP endpoint and startAgent with the switch
// (the queue, request_id, typed codes and 45 s replies on top; extra skills listed in compact form; no rationale and
// nothing of their 1.36 MB tools/list), the dry-run check with temporary stations, the config switch and the fetch
// script's pin.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig, ConfigError } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';
import { startAgent } from '../src/index.js';
import { createPlanner } from '../src/plan.js';
import { blueprintBlockCount, fuelPlan, FUEL_ORDER } from '../src/game.js';
import { MCP_SKILLS } from '../src/contracts.js';
import { MINEAI_SKILLS, EXTRA_DEFS, SPAWN_GUARD, toTheirs, fromTheirs, codeFor, needsTable, bestFood, chooseFuel, blueprintCells, ownChange, dropOf, COLLECT_FROM } from '../src/mineai/skills.js';
import { createMineAiBody, inventoryOfStacks, equipmentOfStacks } from '../src/mineai/body.js';
import { createHostManager, hostCommand, hostEnv, offlineUuid, killGrace, PRELOAD } from '../src/mineai/host.js';
import { readUpstream, check as checkFetched, main as fetchMain, stampFor, STAMP } from '../scripts/mineai-fetch.mjs';
import { startFakeMineAi, fakeHosts } from './fake-mineai.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (r) => r.content.map((x) => x.text).join('\n');
// temporary folders of this file, removed when it is done
const made = [];
const tmp = (p) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), p)); made.push(dir); return dir; };
after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: tmp('mineai-log-') });
const log = createLogger({ dir: null, config });

async function mcpClient(url) {
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  return c;
}

// ---------------------------------------------------------------------------------------------------------------
// the mapping

test('mineai skills: our 10 skills and craft_batch become their actions', () => {
  const inv = { birch_log: 3, crafting_table: 1, coal: 2, raw_iron: 30, furnace: 1, bread: 2, cooked_beef: 1 };
  const ctx = { inventory: inv, position: { x: 10, y: 64, z: -3 }, heading: 90, food: 15, hostiles: [{ name: 'zombie', distance: 6 }], policyRevision: 'r', maxTravel: 256 };
  assert.deepEqual(toTheirs('get_state', {}, ctx), { local: 'state' });
  assert.deepEqual(toTheirs('go_to', { x: 20, y: 64, z: 0 }, ctx).calls, [{ tool: 'navigate', args: { x: 20, y: 64, z: 0 } }]);
  assert.match(toTheirs('go_to', { x: 900, y: 64, z: 0 }, ctx).refused.result, /more than 256 blocks/);
  assert.deepEqual(toTheirs('collect', { block: 'stone', n: 40 }, ctx).calls.map((c) => c.args.count), [32, 8], 'their collect takes 32 at most');
  assert.deepEqual(toTheirs('craft', { item: 'wooden_pickaxe', n: 1 }, ctx).calls[0], { tool: 'craft_item', args: { items: [{ item_name: 'wooden_pickaxe', count: 1 }], temporary_workstation: true } });
  assert.deepEqual(toTheirs('craft', { item: 'birch_planks', n: 12 }, ctx).calls[0].args, { items: [{ item_name: 'birch_planks', count: 12 }] }, 'no table put down for a 2x2 recipe');
  assert.equal(toTheirs('craft', { item: 'wooden_pickaxe', n: 1 }, { ...ctx, inventory: { birch_log: 3 } }).calls[0].args.temporary_workstation, undefined, 'none carried: a table in reach, or their error');
  // one craft_item per item, in order (their planner would keep every listed item for itself)
  assert.deepEqual(toTheirs('craft_batch', { items: [{ item: 'stick', n: 4 }, { item: 'stone_pickaxe', n: 1 }] }, ctx).calls.map((c) => c.args), [{ items: [{ item_name: 'stick', count: 4 }] }, { items: [{ item_name: 'stone_pickaxe', count: 1 }], temporary_workstation: true }]);
  assert.match(toTheirs('smelt', { item: 'raw_iron', n: 30 }, ctx).refused.result, /not enough fuel: what you carry burns 20 of the 24 raw_iron/, '2 coal and 3 logs burn 16 + 4');
  const smelt = toTheirs('smelt', { item: 'raw_iron', n: 30 }, { ...ctx, inventory: { ...inv, coal: 3 } });
  assert.deepEqual(smelt.calls.map((c) => c.args), [{ item_name: 'raw_iron', count: 24, fuel_item_name: 'coal', temporary_workstation: true }]);
  assert.match(smelt.note, /smelts 24 of the 30/);
  assert.equal(toTheirs('smelt', { item: 'raw_iron', n: 3 }, { ...ctx, inventory: { raw_iron: 3, coal: 1 }, furnace: { x: 1, y: 2, z: 3 } }).calls[0].args.x, 1, 'a furnace nearby by its position');
  assert.equal(toTheirs('smelt', { item: 'raw_iron', n: 3 }, { ...ctx, inventory: { raw_iron: 3, coal: 1 } }).refused.code, 'NEED_ITEMS');
  assert.equal(toTheirs('smelt', { item: 'raw_iron', n: 3 }, { ...ctx, inventory: { raw_iron: 3, furnace: 1 } }).refused.code, 'NEED_ITEMS', 'no fuel');
  assert.deepEqual(toTheirs('place', { block: 'furnace', pos: { x: 1, y: 2, z: 3 } }, ctx).calls[0], { tool: 'place_block', args: { block_name: 'furnace', x: 1, y: 2, z: 3 } });
  const build = toTheirs('build', { blueprint: 'hut_3x3', material: 'cobblestone' }, ctx).calls[0];
  assert.equal(build.tool, 'build_structure');
  assert.equal(build.args.blocks.filter((b) => b.block_name === 'cobblestone').length, blueprintBlockCount('hut_3x3'));
  assert.ok(build.args.blocks.every((b) => b.x > 10), 'facing east (heading 90): the hut stands east of the bot');
  assert.deepEqual(toTheirs('attack', { target: 'nearest_hostile' }, ctx).calls[0].args, { mob_name: 'zombie', drop_name: 'rotten_flesh', count: 1, allow_without_shield: true });
  assert.deepEqual(toTheirs('attack', { target: 'cow' }, ctx).calls[0].args, { mob_name: 'cow', drop_name: 'beef', count: 1 });
  assert.match(toTheirs('attack', { target: 'nearest_hostile' }, { ...ctx, hostiles: [] }).refused.result, /no hostile mob/);
  assert.deepEqual(toTheirs('eat', {}, ctx).calls[0].args, { food_name: 'cooked_beef' });
  assert.match(toTheirs('eat', {}, { ...ctx, food: 20 }).refused.result, /not hungry/);
  assert.deepEqual(toTheirs('say', { text: 'hi' }, ctx).calls[0], { tool: 'send_message', args: { message: 'hi' } });
});

test('mineai skills: the extra skills (M4 survival set) become their tools; compact and validated', () => {
  assert.deepEqual(EXTRA_DEFS.map(([n]) => n), ['equip', 'hunt', 'sleep', 'bucket', 'chest', 'explore', 'policy', 'pick_up', 'drop']);
  assert.deepEqual(MINEAI_SKILLS.names.slice(0, 11), ['get_state', 'go_to', 'collect', 'craft', 'smelt', 'place', 'build', 'attack', 'eat', 'say', 'craft_batch']);
  const v = (s, a) => MINEAI_SKILLS.validate(s, a);
  assert.ok(v('equip', { item: 'iron_chestplate' }).ok);
  assert.ok(v('equip', { item: 'shield', to: 'off-hand' }).ok);
  assert.ok(!v('equip', { item: 'Iron Chestplate' }).ok, 'registry names only');
  assert.ok(!v('hunt', { mob: 'player', drop: 'bone', n: 1 }).ok, 'never players');
  assert.ok(!v('hunt', { mob: 'villager', drop: 'emerald', n: 1 }).ok);
  assert.ok(v('hunt', { mob: 'sheep', drop: 'white_wool', n: 3, without_shield: false }).ok);
  assert.ok(!v('hunt', { mob: 'sheep', drop: 'white_wool', n: 3, without_shield: 'yes' }).ok);
  assert.ok(v('bucket', { action: 'fill' }).ok);
  assert.ok(!v('chest', { action: 'withdraw' }).ok, 'pos is required');
  assert.ok(v('policy', {}).ok);
  assert.ok(!v('policy', { retreat_health: 25 }).ok);
  assert.ok(!v('collect', { block: 'oak_log' }).ok, 'the 10 skills keep their rules');
  const ctx = { inventory: { bucket: 1 }, policyRevision: 'rev-7' };
  const one = (s, a) => toTheirs(s, a, ctx).calls[0];
  assert.deepEqual(one('equip', { item: 'shield', to: 'off-hand' }), { tool: 'equip', args: { items: [{ item_name: 'shield', destination: 'off-hand' }] } });
  assert.deepEqual(one('hunt', { mob: 'spider', drop: 'string', n: 3, without_shield: true }).args, { mob_name: 'spider', drop_name: 'string', count: 3, allow_without_shield: true });
  assert.deepEqual(one('sleep', {}), { tool: 'sleep', args: {} });
  assert.deepEqual(one('bucket', { action: 'fill' }).args, { action: 'fill', liquid: 'water' });
  assert.equal(toTheirs('bucket', { action: 'pour' }, ctx).refused.code, 'BAD_ARGS');
  assert.deepEqual(one('chest', { action: 'deposit', pos: { x: 1, y: 2, z: 3 }, items: [{ item: 'dirt', n: 30 }] }).args, { operation: 'deposit', x: 1, y: 2, z: 3, items: [{ item_name: 'dirt', count: 30 }] });
  assert.deepEqual(one('explore', { heading: 270, biome: 'desert' }).args, { heading: 270, chunks: 1, biome: 'desert' });
  assert.deepEqual(one('policy', { retreat_health: 10, raw_food: 'never' }).args, { expected_revision: 'rev-7', reason: 'Set by the player through the policy skill.', operation: 'set', changes: { combat: { critical_health: 10 }, food: { raw: { allow: 'never' } } }, lifetime: { kind: 'session' } });
  assert.equal(one('policy', {}).args.operation, 'reset');
  assert.deepEqual(one('pick_up', { death_items: true }).args, { recover_death_items: true });
  assert.deepEqual(one('drop', { item: 'dirt', n: 5 }).args, { items: [{ item_name: 'dirt', count: 5 }], allow_equipped: true });
  // nothing of theirs leaks into what a guest sees: no rationale, no submission ids, no response formats
  const shown = JSON.stringify(MINEAI_SKILLS.mcpSkills);
  assert.doesNotMatch(shown, /rationale|submission_id|wait_timeout|response_format/);
});

test('mineai skills: their results become our text and typed codes', () => {
  const ok = fromTheirs('collect_block', { result: { status: 'succeeded', collected: { requested: 3, gained: 3, gainedByItem: { birch_log: 3 }, blocksBroken: 3 } } }, { call: { tool: 'collect_block', args: { block_name: 'birch_log', count: 3 } } });
  assert.deepEqual(ok, { ok: true, result: 'mined 3 birch_log and picked up 3 birch_log (3 of 3 wanted)', code: null, theirs: null });
  const missing = fromTheirs('craft_item', { result: { status: 'failed', error: '[CRAFT_MATERIALS_MISSING] missing 2 stick', craft: { items: [] } } });
  assert.equal(missing.code, 'NEED_ITEMS');
  assert.match(missing.result, /^failed: missing 2 stick/);
  assert.equal(fromTheirs('x', { result: { status: 'failed', error: '[HUNT_BOT_DIED] died' } }).code, 'DIED');
  assert.equal(fromTheirs('x', { result: { status: 'failed', error: '[HOSTILE_CONTACT] a zombie' } }).code, 'HOSTILE_CONTACT');
  assert.equal(fromTheirs('x', { result: { status: 'failed', error: '[INVENTORY_FULL] full' } }).code, 'INVENTORY_FULL');
  assert.equal(fromTheirs('x', { result: { status: 'failed', error: '[NAVIGATION_FAILED] no path' } }).code, 'FAILED');
  assert.equal(fromTheirs('x', { result: { status: 'failed', error: 'no code at all' } }).code, 'FAILED');
  const partial = fromTheirs('collect_block', { result: { status: 'partial', error: '[COLLECTION_INCOMPLETE] 2 of 3', collected: { requested: 3, gained: 2, gainedByItem: { stone: 2 }, blocksBroken: 2 } } });
  assert.equal(partial.ok, false, 'partial is not done: the steps after it were planned on all of it');
  assert.match(partial.result, /only partly done: 2 of 3/);
  // done in full, only the temporary furnace (or table) was not picked up again: ok, and the result says where it is
  const lostFurnace = { status: 'partial', error: '[WORKSTATION_NOT_RECOVERED] furnace at (4459, 58, -23): [NO_REACHABLE_MATCHING_TARGETS] none could be reached', smelt: { requested: 3, produced: 3, inputItem: 'raw_iron', outputItem: 'iron_ingot', fuelItem: 'coal', furnace: { x: 4459, y: 58, z: -23 } }, workstation: { block: 'furnace', position: { x: 4459, y: 58, z: -23 }, recovered: false } };
  const smelted = fromTheirs('smelt_item', { result: lostFurnace });
  assert.equal(smelted.ok, true, 'the smelt was done; sending it again would smelt twice');
  assert.match(smelted.result, /^smelted 3 iron_ingot .*; the furnace put down at 4459 58 -23 could not be picked up again/);
  assert.equal(fromTheirs('smelt_item', { result: { ...lostFurnace, smelt: { ...lostFurnace.smelt, produced: 2 } } }).ok, false, 'a short smelt stays a failure');
  const lostTable = { status: 'partial', error: '[WORKSTATION_NOT_RECOVERED] crafting_table at (1, 2, 3): no path', craft: { items: [{ item: 'stone_pickaxe', requested: 1, gained: 1 }], craftingTablePlaced: { x: 1, y: 2, z: 3 } }, workstation: { block: 'crafting_table', position: { x: 1, y: 2, z: 3 }, recovered: false } };
  assert.equal(fromTheirs('craft_item', { result: lostTable }).ok, true);
  assert.equal(fromTheirs('craft_item', { result: { ...lostTable, craft: { items: [{ item: 'stone_pickaxe', requested: 1, gained: 0 }] } } }).ok, false);
  assert.deepEqual(fromTheirs('navigate', { result: { status: 'cancelled' } }, { stopped: 'stop pressed' }), { ok: false, result: 'stopped: stop pressed', code: 'STOPPED', theirs: null });
  assert.equal(fromTheirs('navigate', { result: { status: 'succeeded', navigation: { end: { x: 3.5, y: 64, z: -2.2 }, target: { x: 3, y: 64, z: -3 }, remainingDistance: 0.4 } } }).result, 'walked to 3 64 -3');
  assert.equal(fromTheirs('collect_mob_drop', { result: { status: 'succeeded', hunt: { mob: 'sheep', drop: 'white_wool', requested: 2, gained: 2, targetDeathsObserved: 2 } } }).result, 'hunted sheep: 2 killed, 2 white_wool picked up (2 wanted)');
  assert.equal(fromTheirs('navigate', { result: { status: 'cancelled' } }, { stopped: 'timed out after 120 s' }).code, 'TIMED_OUT');
  assert.match(fromTheirs('navigate', { result: { status: 'succeeded' }, interruptions: ['hostile_contact'] }).result, /\[on its own: hostile_contact\]/);
  assert.equal(codeFor('SMELT_FUEL_STARVED'), 'NEED_ITEMS');
  assert.equal(fromTheirs('build_structure', { result: { status: 'failed', error: '[BUILD_INCOMPLETE] 7 cells still wrong: 7 need a block the bot does not carry; short of 7 dirt.' } }).code, 'NEED_ITEMS', 'their words say what is not carried');
  assert.equal(codeFor('UNKNOWN_HUNT_MOB'), 'BAD_ARGS');
  assert.equal(codeFor(null), null);
  assert.equal(needsTable('iron_pickaxe'), true);
  assert.equal(needsTable('crafting_table'), false);
  assert.equal(bestFood({ rotten_flesh: 5, bread: 1, cooked_beef: 1 }), 'cooked_beef');
  assert.equal(bestFood({ rotten_flesh: 5 }), null);
  assert.equal(chooseFuel({ oak_planks: 1, coal: 1 }, 'raw_iron', 3), 'coal');
  assert.equal(chooseFuel({ oak_planks: 2 }, 'raw_iron', 3), 'oak_planks');
  assert.equal(chooseFuel({ oak_log: 4 }, 'oak_log', 3), null, 'never the input itself');
  const shelter = blueprintCells('shelter', 'dirt', { x: 0, y: 64, z: 0 }, 0);
  assert.equal(shelter.facing, 'north');
  assert.equal(shelter.cells.filter((c) => c.block_name === 'dirt').length, blueprintBlockCount('shelter'));
  assert.deepEqual(inventoryOfStacks([{ name: 'dirt', count: 3, location: 'main' }, { name: 'dirt', count: 2, location: 'hotbar' }, { name: 'iron_helmet', count: 1, location: 'head' }]), { dirt: 5 });
});

// ---------------------------------------------------------------------------------------------------------------
// the body against a fake host

async function bodyOn(fakeOpts = {}, bodyOpts = {}) {
  const hosts = fakeHosts(() => fakeOpts);
  const body = createMineAiBody({ config, log, hosts, gameId: 'gtest01', username: 'Tst_rv_a', ...bodyOpts });
  await body.ready;
  return { body, hosts, fake: hosts.started[0].fake };
}

test('mineai body: state, skills, the iron route pieces, and every call says why in JSON', async () => {
  const { body, fake } = await bodyOn({ inventory: { birch_log: 3 } });
  try {
    assert.equal(body.connected, true);
    assert.equal(body.temporaryStations, true);
    assert.match(body.state(), /^health 20\/20, food 18\/20\nposition 10 64 -4 in the overworld, facing east/);
    assert.match(body.state(), /inventory: birch_log 3/);
    assert.deepEqual(body.inventory(), { birch_log: 3 });
    assert.equal(body.bot.entity.position.x, 10.5, 'what src/mcp.js reads for its short state');
    assert.equal(body.bot.version, '1.21.4');
    await sleep(50); // the block scan after joining
    assert.match(body.state(), /nearby blocks \(within 32\): birch_log 40 \(nearest 4 away at 14 64 -2\)/);
    assert.match(body.state(), /nearby mobs: cow 7 away/);

    const planks = await body.run('craft', { item: 'birch_planks', n: 12 });
    assert.equal(planks.ok, true, planks.result);
    assert.deepEqual(planks.delta, { birch_log: -3, birch_planks: 12 });
    assert.match(planks.result, /^crafted 12 birch_planks/);
    assert.ok(planks.ms >= 0);
    await body.run('craft', { item: 'crafting_table', n: 1 });
    const pick = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
    assert.equal(pick.ok, true, pick.result);
    assert.equal(pick.delta.wooden_pickaxe, 1);
    assert.equal(body.inventory().crafting_table, 1, 'the table came back (temporary workstation)');
    assert.match(pick.result, /the table was picked up again/);
    assert.equal(body.stationNear('crafting_table'), true, 'a carried table counts for the check');

    const bad = await body.run('craft', { item: 'iron_pickaxe', n: 1 });
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'NEED_ITEMS');
    const fail = await body.run('collect', { block: 'iron_ore', n: 3 });
    assert.equal(fail.code, 'NEED_ITEMS', 'their TARGET_UNMINEABLE');

    const st = await body.run('get_state', {});
    assert.equal(st.ok, true);
    assert.match(st.result, /^health/);
    assert.match((await body.run('collect', { block: 'oak_log' })).result, /bad arguments/);

    const calls = fake.calls.filter((c) => c.tool !== 'view_status' && c.tool !== 'view_blocks');
    assert.ok(calls.length >= 4);
    for (const c of fake.calls) {
      assert.equal(c.format, 'json');
      assert.equal(c.rationale, 'Requested by the player through the game gateway.');
    }
    const subs = fake.tools('craft_item').map((c) => c.args.submission_id);
    assert.equal(new Set(subs).size, subs.length, 'a fresh submission_id each time');
    assert.ok(subs.every((s) => s.startsWith('gtest01-')));
  } finally { await body.close(); }
});

test('mineai body: stop and the time limit cancel their action and read its final result; the next call runs', async () => {
  const { body, fake } = await bodyOn({ inventory: { oak_log: 1 }, durations: { navigate: 60_000, collect_block: 60_000 } }, { timeouts: { go_to: 120_000, collect: 2_500, craft: 10_000, get_state: 5_000 } });
  try {
    const run = body.run('go_to', { x: 30, y: 64, z: 5 });
    await sleep(300);
    assert.equal(body.busy, true);
    assert.match(body.state(), /doing now: go_to 30 64 5/);
    const t0 = Date.now();
    await body.stop('stop pressed');
    const r = await run;
    assert.ok(Date.now() - t0 < 4_000, 'a stop takes effect within seconds');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'STOPPED');
    assert.match(r.result, /^stopped: stop pressed/);
    assert.equal(fake.tools('cancel_foreground_action').length, 1);

    const slow = await body.run('collect', { block: 'stone', n: 2 });
    assert.equal(slow.code, 'TIMED_OUT');
    assert.match(slow.result, /timed out after 3 s/);
    assert.equal(fake.tools('cancel_foreground_action').length, 2);

    const next = await body.run('craft', { item: 'oak_planks', n: 4 });
    assert.equal(next.ok, true, next.result);
  } finally { await body.close(); }
});

test('mineai body: an unread result of theirs is read first; a death is DIED; the policy goes with its revision', async () => {
  const { body, fake } = await bodyOn({ inventory: { oak_log: 2, bread: 1 } });
  try {
    // an action submitted before (say a call cut short) whose result was never read: their gate refuses the next one
    const c = new Client({ name: 'x', version: '1' });
    await c.connect(new StreamableHTTPClientTransport(new URL(fake.url), { requestInit: { headers: fake.headers } }));
    await c.callTool({ name: 'send_message', arguments: { message: 'x', submission_id: 'old', rationale: 'x', response_format: 'json' } });
    await sleep(60);
    await c.close();
    const r = await body.run('craft', { item: 'oak_planks', n: 4 });
    assert.equal(r.ok, true, r.result);

    fake.world.die = 'collect_block';
    const died = await body.run('collect', { block: 'oak_log', n: 1 });
    assert.equal(died.code, 'DIED');
    assert.match(died.result, /^you died at 10 64 -4/);

    const pol = await body.run('policy', { retreat_health: 12 });
    assert.equal(pol.ok, true, pol.result);
    assert.equal(fake.tools('set_survival_policy')[0].args.expected_revision, 'rev-1');
    assert.equal(fake.tools('set_survival_policy')[0].args.submission_id, undefined, 'it answers at once: no submission');
    assert.equal(fake.world.revision, 'rev-2');
  } finally { await body.close(); }
});

test('mineai body: close ends the game, closes the host and says end once', async () => {
  const { body, hosts } = await bodyOn();
  const ends = [];
  body.on('end', (d) => ends.push(d.reason));
  await body.close();
  await body.close();
  assert.deepEqual(ends, ['the game ended']);
  assert.equal(hosts.started[0].closed, true);
  assert.equal(body.connected, false);
  assert.equal((await body.run('eat', {})).code, 'NOT_STARTED');
});

// ---------------------------------------------------------------------------------------------------------------
// the host manager against a fake host process

function hostConfig(env = {}) {
  const dir = tmp('mineai-dir-');
  fs.mkdirSync(path.join(dir, 'src', 'server'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'server', 'host.ts'), '// stand-in');
  const base = 27_500 + Math.floor(Math.random() * 2_000);
  return loadConfig({ MODEL_API_KEY: '', BODY: 'mineai', MINEAI_DIR: dir, MINEAI_PORT_BASE: String(base), MINEAI_PORTS: '4', MINEAI_START_MS: '15000', MINEAI_HEARTBEAT_MS: '200', MINEAI_HEARTBEAT_MISSES: '2', ...env });
}
const FAKE_HOST = path.join(HERE, 'fake-mineai-host.mjs');
/** spawn the fake host instead of theirs, with the same flags and environment */
const fakeSpawn = (extraEnv = {}) => (exec, args, opts) => {
  const i = args.findIndex((a) => a.endsWith('host.ts'));
  return spawn(process.execPath, [FAKE_HOST, ...args.slice(i + 1)], { ...opts, env: { ...opts.env, ...extraEnv } });
};
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

test('mineai host: the command line and environment (loopback, the range, no secrets, token only in the environment)', () => {
  const cfg = hostConfig({ MINEAI_UNRESPONSIVE_MS: '20000' });
  const cmd = hostCommand(cfg, { port: 27_123, username: 'Tst_rv_b', instanceId: 'g1' });
  assert.equal(cmd.exec, process.execPath);
  assert.deepEqual(cmd.args.slice(0, 2), ['--import', 'tsx']);
  assert.ok(cmd.args.includes('--listen-host') && cmd.args[cmd.args.indexOf('--listen-host') + 1] === '127.0.0.1');
  assert.ok(!cmd.args.includes('0.0.0.0'));
  assert.ok(cmd.args.includes('temporary'));
  assert.doesNotMatch(cmd.args.join(' '), /token|Bearer/i);
  const bun = hostCommand(loadConfig({ BODY: 'mineai', MINEAI_DIR: '/x', MINEAI_RUNTIME: 'bun' }), { port: 1, username: 'u', instanceId: 'g', preload: '/p.mjs' });
  assert.deepEqual(bun.args.slice(0, 3), ['--preload', '/p.mjs', '/x/src/server/host.ts']);
  const env = hostEnv({ PATH: '/bin', MODEL_API_KEY: 'k', WEB_ADMIN_TOKEN: 't', WEB_PROXY_SECRET: 's', STREAM_RTMP_URL: 'r', HOME: '/h' }, { MINEAI_HOST_TOKEN: 'mine' });
  assert.deepEqual(env, { PATH: '/bin', HOME: '/h', MINEAI_HOST_TOKEN: 'mine' });
});

test('mineai host: starts on the range with a token, refuses past the cap, closes the process', async () => {
  const cfg = hostConfig({ MINEAI_MAX_HOSTS: '1' });
  const hosts = createHostManager({ config: cfg, log, spawnFn: fakeSpawn(), preload: null });
  const h = await hosts.start({ instanceId: 'g1', username: 'Tst_rv_c' });
  try {
    await h.ready;
    assert.equal(h.port, cfg.mineai.portBase);
    assert.equal((await fetch(`http://127.0.0.1:${h.port}/health`)).status, 401, 'no token, no answer');
    const health = await h.health();
    assert.equal(health.minecraft.username, 'Tst_rv_c');
    assert.ok(!health.envKeys.includes('MODEL_API_KEY'));
    assert.ok(health.envKeys.includes('MINEAI_HOST_TOKEN'));
    assert.ok(health.envKeys.includes('MINEAI_UNRESPONSIVE_MS'));
    await assert.rejects(hosts.start({ instanceId: 'g2', username: 'Tst_rv_d' }), /all 1 Mine AI hosts are in use/);
  } finally { await h.close('test'); }
  assert.equal(hosts.count, 0);
  const again = await hosts.start({ instanceId: 'g3', username: 'Tst_rv_e' });
  await again.ready;
  assert.equal(again.port, cfg.mineai.portBase, 'its port is free again');
  await hosts.closeAll();
});

test('mineai host: a crash is restarted once; the second time it is down', async () => {
  const cfg = hostConfig();
  const state = path.join(tmp('mineai-st-'), 'starts');
  const hosts = createHostManager({ config: cfg, log, spawnFn: fakeSpawn({ FAKE_MODE: 'crash', FAKE_STATE: state, FAKE_BAD_STARTS: '1' }), preload: null });
  const h = await hosts.start({ instanceId: 'g1', username: 'Tst_rv_f' });
  const seen = [];
  for (const ev of ['crash', 'restart', 'down']) h.on(ev, () => seen.push(ev));
  await h.ready;
  for (let i = 0; i < 100 && !seen.includes('restart'); i++) await sleep(100);
  assert.deepEqual(seen, ['crash', 'restart']);
  assert.equal(h.restarts, 1);
  assert.ok((await h.health())?.minecraft, 'it answers again');
  await h.close('test');

  const state2 = path.join(tmp('mineai-st-'), 'starts');
  const hosts2 = createHostManager({ config: cfg, log, spawnFn: fakeSpawn({ FAKE_MODE: 'crash', FAKE_STATE: state2 }), preload: null });
  const h2 = await hosts2.start({ instanceId: 'g2', username: 'Tst_rv_g' });
  const why = new Promise((r) => h2.on('down', (d) => r(d.why)));
  await h2.ready;
  assert.match(await why, /crashed again|could not be started again/);
  for (let i = 0; i < 30 && hosts2.count; i++) await sleep(100);
  assert.equal(hosts2.count, 0, 'a host that is down is closed');
});

test('mineai host: missed heartbeats and a lost connection count as a crash; close kills the process', async () => {
  const cfg = hostConfig();
  const hosts = createHostManager({ config: cfg, log, spawnFn: fakeSpawn({ FAKE_MODE: 'hang' }), preload: null });
  const h = await hosts.start({ instanceId: 'g1', username: 'Tst_rv_h' });
  const crash = new Promise((r) => h.on('crash', (d) => r(d.why)));
  await h.ready;
  assert.match(await crash, /no answer to 2 heartbeats in a row/);
  await h.close('test');

  const hosts2 = createHostManager({ config: cfg, log, spawnFn: fakeSpawn({ FAKE_MODE: 'disconnect' }), preload: null });
  let child = null;
  const spawnFn = hosts2 && ((...a) => { child = fakeSpawn({ FAKE_MODE: 'disconnect' })(...a); return child; });
  const hosts3 = createHostManager({ config: cfg, log, spawnFn, preload: null });
  const h3 = await hosts3.start({ instanceId: 'g3', username: 'Tst_rv_i' });
  const lost = new Promise((r) => h3.on('crash', (d) => r(d.why)));
  await h3.ready;
  assert.match(await lost, /lost the connection/);
  const pid = child.pid;
  await h3.close('test');
  assert.equal(alive(pid), false, 'the host process is gone');

  const never = createHostManager({ config: hostConfig({ MINEAI_START_MS: '5000' }), log, spawnFn: fakeSpawn({ FAKE_MODE: 'never' }), preload: null });
  const hn = await never.start({ instanceId: 'g4', username: 'Tst_rv_j' });
  await assert.rejects(hn.ready, /not ready within 5 s/);
  assert.equal(never.count, 0);
});

// ---------------------------------------------------------------------------------------------------------------
// MCP on top, and the switch

test('mineai through MCP: the queue, request_id, typed codes and the extra skills on top of the body', async () => {
  const hosts = fakeHosts(() => ({ durations: { collect_block: 50 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS,
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId }),
  });
  const { url } = await web.start();
  const c = await mcpClient(url);
  try {
    const listed = await c.listTools();
    const size = JSON.stringify(listed).length;
    assert.ok(size < 40_000, `our tools/list stays small (${size} bytes; theirs is 1.36 MB)`);
    assert.doesNotMatch(JSON.stringify(listed), /rationale|submission_id|wait_for_action|response_format/);
    const play = listed.tools.find((t) => t.name === 'play');
    assert.match(play.description, /- hunt \{mob: one of cow\|pig[^}]*, drop: text \(1 to 48 characters\), n: integer 1 to 64, without_shield: true\|false \(optional\)\}/);
    assert.match(play.description, /- policy \{retreat_health: integer 1 to 19 \(optional\)/);
    assert.ok(play.inputSchema.properties.skill.enum.includes('explore'));

    const start = text(await c.callTool({ name: 'start_game', arguments: { adult: true } }));
    assert.match(start, /^New game g\w+/);
    assert.match(start, /- equip \{item: text/);
    const steps = [
      { skill: 'collect', args: { block: 'birch_log', n: 3 } },
      { skill: 'craft', args: { item: 'birch_planks', n: 12 } },
      { skill: 'craft', args: { item: 'stick', n: 4 } },
      { skill: 'craft', args: { item: 'crafting_table', n: 1 } },
      { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
    ];
    const r = await c.callTool({ name: 'play_sequence', arguments: { steps, request_id: 'route-1' } });
    assert.equal(r.structuredContent.code, null, text(r));
    assert.deepEqual(r.structuredContent.steps.map((s) => s.status), ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed']);
    assert.equal(r.structuredContent.state.inventory.wooden_pickaxe, 1);
    assert.equal(r.structuredContent.state.inventory.crafting_table, 1, 'the table is carried again');
    assert.deepEqual(r.structuredContent.state.pos, { x: 10, y: 64, z: -4 });
    const again = await c.callTool({ name: 'play_sequence', arguments: { steps, request_id: 'route-1' } });
    assert.equal(again.structuredContent.code, 'DUPLICATE');
    assert.equal(hosts.started[0].fake.tools('collect_block').length, 1, 'nothing ran twice');

    // a second table craft in one call: the check knows the table comes back, so it adds no table craft
    hosts.started[0].fake.world.inventory.set('birch_planks', 10);
    hosts.started[0].fake.world.inventory.set('stick', 8);
    await c.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hi' } } }); // a skill reads their status again (the heartbeat does it every 5 s)
    const two = await c.callTool({ name: 'play_sequence', arguments: { dry_run: true, steps: [{ skill: 'craft', args: { item: 'wooden_axe', n: 1 } }, { skill: 'craft', args: { item: 'wooden_shovel', n: 1 } }] } });
    assert.equal(two.structuredContent.code, null, text(two));
    assert.equal(two.structuredContent.plan.length, 2, 'no table craft added');

    const extra = await c.callTool({ name: 'play', arguments: { skill: 'hunt', args: { mob: 'sheep', drop: 'white_wool', n: 2 } } });
    assert.equal(extra.structuredContent.code, null, text(extra));
    assert.deepEqual(extra.structuredContent.changed, { white_wool: 2 });
    const player = await c.callTool({ name: 'play', arguments: { skill: 'hunt', args: { mob: 'player', drop: 'bone', n: 1 } } });
    assert.equal(player.structuredContent.code, 'BAD_ARGS');

    hosts.started[0].fake.world.fail.navigate = '[NAVIGATION_FAILED] no route';
    const failed = await c.callTool({ name: 'play_sequence', arguments: { steps: [{ skill: 'go_to', args: { x: 20, y: 64, z: 0 } }, { skill: 'say', args: { text: 'hi' } }] } });
    assert.equal(failed.structuredContent.code, 'FAILED');
    assert.deepEqual(failed.structuredContent.steps.map((s) => s.status), ['failed', 'cancelled']);
    hosts.started[0].fake.world.fail.smelt_item = '[SMELT_FUEL_STARVED] the fuel ran out';
    hosts.started[0].fake.world.inventory.set('raw_iron', 2);
    hosts.started[0].fake.world.inventory.set('coal', 1);
    hosts.started[0].fake.world.inventory.set('furnace', 1);
    const starved = await c.callTool({ name: 'play', arguments: { skill: 'smelt', args: { item: 'raw_iron', n: 2 } } });
    assert.equal(starved.structuredContent.code, 'NEED_ITEMS', 'their code, typed as ours');
    await c.callTool({ name: 'end_game', arguments: {} });
    for (let i = 0; i < 20 && !hosts.started[0].closed; i++) await sleep(50);
    assert.equal(hosts.started[0].closed, true, 'end_game closes the host');
  } finally {
    await c.close();
    await web.stop();
  }
});

test('mineai kill switch: stop cancels their running action; end closes every host', async () => {
  const ADMIN = 'admin-token-for-the-mineai-test-0123456789';
  const hosts = fakeHosts(() => ({ durations: { navigate: 60_000 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_ADMIN_TOKEN: ADMIN }), log, skills: MINEAI_SKILLS,
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId }),
  });
  const { url } = await web.start();
  const c = await mcpClient(url);
  const admin = (body) => fetch(`${url}/admin/stop`, { method: 'POST', headers: { authorization: `Bearer ${ADMIN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  try {
    await c.callTool({ name: 'start_game', arguments: { adult: true } });
    const walk = c.callTool({ name: 'play', arguments: { skill: 'go_to', args: { x: 50, y: 64, z: 0 } } });
    await sleep(500);
    assert.equal((await admin({})).stopped, 1);
    const r = await walk;
    assert.equal(r.structuredContent.steps[0].code, 'STOPPED', text(r)); // as with our body: the operator's stop is not the queue's
    assert.equal(hosts.started[0].fake.tools('cancel_foreground_action').length, 1);
    assert.equal((await admin({ end: true })).ended, 1);
    for (let i = 0; i < 40 && !hosts.started[0].closed; i++) await sleep(50);
    assert.equal(hosts.started[0].closed, true);
  } finally {
    await c.close();
    await web.stop();
  }
});

test('mineai switch: BODY=mineai in startAgent gives guests Mine AI bodies and the extra skills; ours is the default', async () => {
  const dir = tmp('mineai-agent-');
  const hosts = fakeHosts(() => ({ inventory: { shield: 1 } }));
  const agent = await startAgent({ config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '', BODY: 'mineai', MINEAI_DIR: dir }), hosts, print: () => {}, loopStatsMs: 0 });
  const c = await mcpClient(agent.url);
  try {
    const play = (await c.listTools()).tools.find((t) => t.name === 'play');
    assert.match(play.description, /- sleep \{\}/);
    assert.match(text(await c.callTool({ name: 'start_game', arguments: { adult: true } })), /^New game/);
    assert.equal(hosts.started.length, 1);
    assert.match(hosts.started[0].username, /^Muse_g/);
    const r = await c.callTool({ name: 'play', arguments: { skill: 'equip', args: { item: 'shield' } } });
    assert.equal(r.structuredContent.steps[0].status, 'confirmed', text(r));
  } finally {
    await c.close();
    await agent.stop('test');
  }
  assert.equal(hosts.started[0].closed, true, 'the agent stop closes every host');

  const ours = loadConfig({ MODEL_API_KEY: '' });
  assert.equal(ours.body.kind, 'ours');
  const plain = await startAgent({ config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' }), fakeBot: true, print: () => {}, loopStatsMs: 0, loadViewer: () => null });
  const p = await mcpClient(plain.url);
  try {
    const desc = (await p.listTools()).tools.find((t) => t.name === 'play').description;
    assert.doesNotMatch(desc, /- hunt |- sleep /, 'production behaviour unchanged until the switch is flipped');
  } finally {
    await p.close();
    await plain.stop('test');
  }
});

test('mineai config: the switch and its checks', () => {
  assert.throws(() => loadConfig({ BODY: 'mineai' }), (e) => e instanceof ConfigError && /BODY=mineai needs MINEAI_DIR/.test(e.message));
  assert.throws(() => loadConfig({ BODY: 'theirs' }), /BODY must be one of ours, mineai/);
  assert.throws(() => loadConfig({ BODY: 'mineai', MINEAI_DIR: '/x', MINEAI_PORT_BASE: '65000', MINEAI_PORTS: '200' }), /under 65536/);
  assert.throws(() => loadConfig({ MINEAI_UNRESPONSIVE_MS: '1000' }), /MINEAI_UNRESPONSIVE_MS/);
  const c = loadConfig({ BODY: 'mineai', MINEAI_DIR: '/tmp/m', WEB_MAX_SESSIONS: '6' });
  assert.equal(c.mineai.maxHosts, 6, 'one host per guest bot by default');
  assert.equal(c.mineai.dataDir, '', 'temporary bot data by default');
});

test('mineai check: temporary stations stay in the inventory; extra skills count what they bring', () => {
  const p = createPlanner();
  const steps = [{ skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }, { skill: 'craft', args: { item: 'wooden_axe', n: 1 } }];
  const inv = { oak_planks: 6, stick: 4, crafting_table: 1 };
  const kept = p.check(steps, { inventory: inv, table: false, temporaryStations: true });
  assert.equal(kept.ok, true, JSON.stringify(kept.missing));
  assert.equal(kept.added, 0, 'no second table');
  const placed = p.check(steps, { inventory: inv, table: false });
  assert.equal(placed.ok, true);
  const smelt = p.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 3 } }, { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } }], { inventory: { raw_iron: 3, coal: 1, furnace: 1, stick: 2, crafting_table: 1 }, table: false, furnace: false, temporaryStations: true });
  assert.equal(smelt.ok, true, JSON.stringify(smelt.missing));
  const wool = p.check([{ skill: 'hunt', args: { mob: 'sheep', drop: 'white_wool', n: 3 } }], { inventory: {}, temporaryStations: true });
  assert.equal(wool.ok, true);
  const unknown = p.check([{ skill: 'pick_up', args: {} }, { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } }], { inventory: { stick: 2, crafting_table: 1 }, temporaryStations: true });
  assert.equal(unknown.ok, true, 'after a pick_up, what seems missing only warns');
  assert.match(unknown.warnings[0].text, /may lack 3 iron_ingot/);
});

test('mineai fetch: the pin, the patches and the stamp; their code stays out of this repo', async () => {
  const up = readUpstream();
  assert.match(up.commit, /^[0-9a-f]{40}$/);
  assert.equal(up.repo, 'https://github.com/aibengineering/mine-ai-mcp');
  for (const p of up.patches) {
    assert.ok(fs.existsSync(p), p);
    const stat = spawnSync('git', ['apply', '--stat', p], { encoding: 'utf8' });
    assert.equal(stat.status, 0, stat.stderr);
    assert.match(fs.readFileSync(p, 'utf8'), /Patched for Muse plays Minecraft/);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'mineai', 'LICENSE-mine-ai-mcp'), 'utf8'), /MIT License\s+Copyright \(c\) 2026 AI Bengineering/);
  assert.equal(checkFetched(tmp('mineai-none-'), up).ok, false);
  const lines = [];
  assert.equal(await fetchMain([path.join(ROOT, 'vendor-x')], { print: () => {}, printErr: (l) => lines.push(l) }), 2);
  assert.match(lines[0], /outside this agent/);
  const dry = [];
  assert.equal(await fetchMain([tmp('mineai-dry-'), '--dry-run'], { print: (l) => dry.push(l), printErr: () => {} }), 0);
  assert.ok(dry.some((l) => l.includes(`checkout --quiet --force --detach ${up.commit}`)));
  assert.equal(dry.filter((l) => l.includes('git apply --check')).length, up.patches.length);
  // nothing of theirs is checked in here
  const ours = spawnSync('git', ['ls-files', '.'], { cwd: ROOT, encoding: 'utf8' }).stdout;
  assert.doesNotMatch(ours, /\.ts\n/);
});

// ---------------------------------------------------------------------------------------------------------------
// after the review (2026-10-08): the player name, stopping hosts, their data, and the skills' edges

test('mineai host: the player name and the token stay off every command line; a runtime without 0004 or 0005 is refused', async () => {
  const cmd = hostCommand(hostConfig(), { port: 27_123, username: 'Tst_rv_secret', instanceId: 'g1' });
  assert.ok(!cmd.args.includes('--username'));
  assert.doesNotMatch(cmd.args.join(' '), /Tst_rv_secret/);
  const cfg = hostConfig();
  const hosts = createHostManager({ config: cfg, log, spawnFn: fakeSpawn(), preload: null });
  const h = await hosts.start({ instanceId: 'g1', username: 'Tst_rv_secret' });
  try {
    await h.ready;
    const health = await h.health();
    assert.equal(health.minecraft.username, 'Tst_rv_secret', 'the name went through MINEAI_USERNAME');
    assert.ok(health.envKeys.includes('MINEAI_USERNAME'));
  } finally { await h.close('test'); }
  // their host without patch 0004 answers without the token: never used
  const open = createHostManager({ config: hostConfig(), log, spawnFn: fakeSpawn({ FAKE_MODE: 'open' }), preload: null });
  const ho = await open.start({ instanceId: 'g2', username: 'Tst_rv_k' });
  await assert.rejects(ho.ready, /does not enforce its token \(patch 0004 missing/);
  assert.equal(open.count, 0);
  // without patch 0005 it would join under its default name
  const other = createHostManager({ config: hostConfig(), log, spawnFn: fakeSpawn({ MINEAI_USERNAME: 'MineAI' }), preload: null });
  const hn = await other.start({ instanceId: 'g3', username: 'Tst_rv_l' });
  await assert.rejects(hn.ready, /joined under another player name \(patch 0005 missing/);
  // their stop's allowance follows the watchdog window it waits for
  assert.equal(killGrace(hostConfig({ MINEAI_UNRESPONSIVE_MS: '60000' }).mineai), 65_000);
  assert.equal(createHostManager({ config: hostConfig(), log, spawnFn: fakeSpawn(), preload: null }).killGraceMs, 10_000);
});

/** spawn the fake host with the real preload in front of it (as their host.ts runs), keeping the flags */
const preloadSpawn = (extraEnv = {}) => (exec, args, opts) => {
  const i = args.findIndex((a) => a.endsWith('host.ts'));
  return spawn(process.execPath, ['--import', pathToFileURL(PRELOAD).href, FAKE_HOST, ...args.slice(i + 1)], { ...opts, env: { ...opts.env, ...extraEnv } });
};

test('mineai host: with the real preload, a host that ends as theirs does (no process.exit) is gone at once; a child left behind dies with its group', async () => {
  const cfg = hostConfig();
  let child = null;
  const hosts = createHostManager({ config: cfg, log, spawnFn: (...a) => { child = preloadSpawn({ FAKE_MODE: 'natural' })(...a); return child; } });
  const h = await hosts.start({ instanceId: 'g1', username: 'Tst_rv_m' });
  await h.ready;
  const t0 = Date.now();
  await h.close('test');
  assert.ok(Date.now() - t0 < 3_000, `closed in ${Date.now() - t0} ms, not after the kill grace`);
  assert.equal(alive(child.pid), false);

  const pidFile = path.join(tmp('mineai-orphan-'), 'pid');
  const orphans = createHostManager({ config: hostConfig(), log, spawnFn: preloadSpawn({ FAKE_MODE: 'orphan', FAKE_CHILD: pidFile }) });
  const ho = await orphans.start({ instanceId: 'g2', username: 'Tst_rv_n' });
  await ho.ready;
  for (let i = 0; i < 20 && !fs.existsSync(pidFile); i++) await sleep(50);
  const orphan = Number(fs.readFileSync(pidFile, 'utf8'));
  assert.equal(alive(orphan), true);
  await ho.close('test');
  for (let i = 0; i < 20 && alive(orphan); i++) await sleep(50);
  assert.equal(alive(orphan), false, 'what the host left behind is killed with its process group');
});

test('mineai host: a slot whose live-view ports are taken is skipped and tried again later', async () => {
  const cfg = hostConfig();
  const m = cfg.mineai;
  const blocker = net.createServer();
  await new Promise((r) => blocker.listen(m.portBase + m.ports, '127.0.0.1', r)); // slot 0's watch port
  const hosts = createHostManager({ config: cfg, log, spawnFn: fakeSpawn(), preload: null });
  const views = { watch: '/watch/x', eyes: '/eyes/x' };
  const h = await hosts.start({ instanceId: 'g1', username: 'Tst_rv_o', views });
  await h.ready;
  assert.equal(h.port, m.portBase + 1);
  assert.deepEqual(h.viewPorts, { watch: m.portBase + m.ports + 1, eyes: m.portBase + 2 * m.ports + 1 });
  await new Promise((r) => blocker.close(r));
  const h2 = await hosts.start({ instanceId: 'g2', username: 'Tst_rv_p', views });
  await h2.ready;
  assert.equal(h2.port, m.portBase, 'slot 0 was not kept busy');
  await hosts.closeAll();
});

test('mineai host: a game\'s bot data goes when it ends, a failed game\'s is kept (the last N), old folders go at start', async () => {
  // their folder for a bot: the offline UUID of its name (checked against a folder their runtime wrote)
  assert.equal(offlineUuid('Tst_rv_gb9bf48'), '2518b873-58e5-3353-96a7-c99263913f54');
  const root = path.join(tmp('mineai-data-'), 'data');
  const seg = (name) => { const u = offlineUuid(name); return `${u}-${crypto.createHash('sha256').update(u).digest('hex').slice(0, 12)}`; };
  const plant = (name, game) => {
    const bot = path.join(root, 'server-host-x-port-1-seedHash-1-abc', 'bots', seg(name));
    const inc = path.join(root, 'host-incidents', game);
    for (const d of [bot, inc]) { fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'x'), 'x'); }
    return [bot, inc];
  };
  const old = plant('Tst_rv_old', 'gold');
  const ten = (Date.now() - 10 * 86_400_000) / 1000;
  for (const d of old) { fs.utimesSync(path.join(d, 'x'), ten, ten); fs.utimesSync(d, ten, ten); }
  const fresh = plant('Tst_rv_fresh', 'gfresh');
  const cfg = hostConfig({ MINEAI_DATA_DIR: root, MINEAI_KEEP_FAILED: '1' });
  const ok = createHostManager({ config: cfg, log, spawnFn: fakeSpawn(), preload: null });
  assert.ok(old.every((d) => !fs.existsSync(d)), 'older than MINEAI_DATA_DAYS: gone at start');
  assert.ok(fresh.every((d) => fs.existsSync(d)));
  assert.equal(fs.statSync(root).mode & 0o777, 0o700, 'a folder only this user can open');

  const done = plant('Tst_rv_q', 'g1');
  const h = await ok.start({ instanceId: 'g1', username: 'Tst_rv_q' });
  await h.ready;
  await h.close('the game ended');
  assert.ok(done.every((d) => !fs.existsSync(d)), 'a game that ended well leaves nothing');

  // each game's host crashes once (its first start), then runs
  const states = tmp('mineai-st-');
  const crashOnce = (exec, args, opts) => fakeSpawn({ FAKE_MODE: 'crash', FAKE_STATE: path.join(states, args[args.indexOf('--instance-id') + 1]), FAKE_BAD_STARTS: '1' })(exec, args, opts);
  const mgr = createHostManager({ config: cfg, log, spawnFn: crashOnce, preload: null });
  const failedGame = async (n) => {
    const dirs = plant(`Tst_rv_f${n}`, `gf${n}`);
    const hf = await mgr.start({ instanceId: `gf${n}`, username: `Tst_rv_f${n}` });
    const restarted = new Promise((r) => hf.on('restart', r));
    await hf.ready;
    await restarted;
    await hf.close('the game ended');
    return dirs;
  };
  const first = await failedGame(1);
  assert.ok(first.every((d) => fs.existsSync(d)), 'a game whose host crashed is kept for diagnosis');
  const second = await failedGame(2);
  assert.ok(second.every((d) => fs.existsSync(d)));
  assert.ok(first.every((d) => !fs.existsSync(d)), 'only the last MINEAI_KEEP_FAILED failed games are kept');
  assert.deepEqual(mgr.kept().map((k) => k.game), ['gf2']);
});

test('mineai body: craft_batch crafts item by item; a table made in the list is put down for the next item and carried at the end', async () => {
  const { body, fake } = await bodyOn({ inventory: { oak_log: 6 } });
  try {
    const r = await body.run('craft_batch', { items: [{ item: 'oak_planks', n: 12 }, { item: 'stick', n: 4 }, { item: 'crafting_table', n: 1 }, { item: 'wooden_pickaxe', n: 1 }] });
    assert.equal(r.ok, true, r.result);
    assert.equal(body.inventory().crafting_table, 1, 'the table came back');
    assert.equal(body.inventory().wooden_pickaxe, 1);
    const crafts = fake.tools('craft_item').map((c) => c.args);
    assert.deepEqual(crafts.map((c) => c.items.map((i) => i.item_name)), [['oak_planks'], ['stick'], ['crafting_table'], ['wooden_pickaxe']]);
    assert.deepEqual(crafts.map((c) => Boolean(c.temporary_workstation)), [false, false, false, true]);
  } finally { await body.close(); }
});

test('mineai body: a body one of their reflexes holds is waited for; past the step\'s time it says what held it', async () => {
  const { body, fake } = await bodyOn({ inventory: { oak_log: 3 } }, { timeouts: { craft: 2_500, collect: 60_000 } });
  try {
    fake.world.held = { owner: 'hunger_reflex', until: Date.now() + 1_200 };
    const r = await body.run('craft', { item: 'oak_planks', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.ok(r.ms >= 1_000, `waited for the meal (${r.ms} ms)`);
    fake.world.held = { owner: 'hostile_reflex', until: Date.now() + 60_000 };
    const busy = await body.run('craft', { item: 'oak_planks', n: 4 });
    assert.equal(busy.ok, false);
    assert.equal(busy.code, 'HOSTILE_CONTACT');
    assert.match(busy.result, /^did not start: the body was fighting a hostile mob on its own for \d s/);
    const run = body.run('collect', { block: 'stone', n: 1 });
    await sleep(300);
    await body.stop('stop pressed');
    const stopped = await run;
    assert.equal(stopped.code, 'STOPPED');
    assert.match(stopped.result, /^stopped: stop pressed \(before it started: the body was fighting a hostile mob\)/);
    fake.world.held = null;
  } finally { await body.close(); }
});

test('mineai body: an attack ends once the mob died, even with no drop, and is ok', async () => {
  const { body, fake } = await bodyOn();
  try {
    fake.world.huntKillAfterMs = 300;
    const t0 = Date.now();
    const r = await body.run('attack', { target: 'zombie' });
    assert.equal(r.ok, true, r.result);
    assert.equal(r.result, 'fought the zombie and killed it');
    assert.ok(Date.now() - t0 < 6_000, 'no chase after the next zombie');
    assert.equal(fake.tools('cancel_foreground_action').length, 1);
  } finally { await body.close(); }
});

test('mineai body: a crash before or during a step never reports the whole inventory as gained', async () => {
  const { body, hosts, fake } = await bodyOn({ inventory: { cobblestone: 40, oak_planks: 12, raw_iron: 3 }, durations: { collect_block: 3_000 } });
  const host = hosts.started[0];
  try {
    host.restarting = true;
    const wait = await body.run('collect', { block: 'stone', n: 3 });
    assert.equal(wait.code, 'NOT_STARTED');
    assert.match(wait.result, /being started again/);
    host.restarting = false;
    const run = body.run('collect', { block: 'stone', n: 3 });
    await sleep(400);
    host.emit('crash', { why: 'test' });
    await fake.close();
    const mid = await run;
    assert.equal(mid.ok, false);
    // its own code, and never "send the step again": the step may be what stopped the body, and a second stop ends the game
    assert.equal(mid.code, 'BODY_RESTARTED');
    assert.match(mid.result, /^the body stopped in the middle of this step \(its host crashed\) and is being started again \(code BODY_RESTARTED\)\. This step may be what stopped it: do not send it again from here\. The body is started again once per game: a second stop ends the game\./);
    assert.doesNotMatch(mid.result, /send the step again/);
    assert.deepEqual(mid.delta, {});
    const after = await body.run('collect', { block: 'stone', n: 3 }); // the host still down: the call itself fails
    assert.equal(after.ok, false);
    assert.deepEqual(after.delta, {}, 'not +40 cobblestone, +12 oak_planks, +3 raw_iron');
  } finally { await body.close(); }
});

test('mineai body: a runtime that stops during a build says to build in the open, not to send it again (review of the Muse fixes)', async () => {
  const { body, hosts, fake } = await bodyOn({ inventory: { cobblestone: 20 }, durations: { build_structure: 3_000 } });
  try {
    const run = body.run('build', { blueprint: 'shelter', material: 'cobblestone' });
    await sleep(400);
    hosts.started[0].emit('crash', { why: 'test' });
    await fake.close();
    const r = await run;
    assert.equal(r.code, 'BODY_RESTARTED');
    assert.match(r.result, /This step may be what stopped it: do not send it again from here; build in the open instead \(go_to a spot a few blocks away with open sky and flat ground, then build\)\. The body is started again once per game: a second stop ends the game\./);
  } finally { await body.close(); }
});

test('mineai body: what is worn or in the off-hand stays in the state, and an equip is not a loss', async () => {
  assert.deepEqual(equipmentOfStacks([{ name: 'shield', count: 1, location: 'off-hand' }, { name: 'dirt', count: 3, location: 'main' }]), { 'off-hand': { name: 'shield', count: 1 } });
  const { body } = await bodyOn({ inventory: { shield: 1, iron_chestplate: 1, dirt: 2 } });
  try {
    const r = await body.run('equip', { item: 'shield', to: 'off-hand' });
    assert.equal(r.ok, true, r.result);
    assert.deepEqual(r.delta, {}, 'not shield -1');
    await body.run('equip', { item: 'iron_chestplate' });
    assert.match(body.state(), /\nwearing: iron_chestplate \(torso\); off-hand: shield\n/);
    assert.deepEqual(body.equipment(), { 'off-hand': 'shield', torso: 'iron_chestplate' });
    assert.deepEqual(body.inventory(), { dirt: 2 }, 'a craft never takes what is worn');
  } finally { await body.close(); }
});

test('mineai skills: no lava poured, nothing poured at spawn or onto a player, no chest of another game opened', () => {
  const ctx = { inventory: {}, spawn: { x: 0, y: 64, z: 0 }, players: [{ position: { x: 200, y: 64, z: 200 } }], gameId: 'gA', containerOwner: (p) => (p.x === 7 ? 'gB' : p.x === 8 ? 'gA' : null) };
  const pour = (liquid, pos) => toTheirs('bucket', { action: 'pour', liquid, pos }, ctx);
  assert.equal(pour('lava', { x: 500, y: 64, z: 500 }).refused.code, 'BAD_ARGS');
  assert.match(pour('water', { x: 10, y: 64, z: 10 }).refused.result, new RegExp(`within ${SPAWN_GUARD} blocks of the world spawn`));
  assert.match(pour('water', { x: 201, y: 64, z: 201 }).refused.result, /another player is within 4 blocks/);
  assert.doesNotMatch(pour('water', { x: 201, y: 64, z: 201 }).refused.result, /Tst_|gB/, 'no player names');
  assert.deepEqual(pour('water', { x: 300, y: 64, z: 300 }).calls[0].args, { action: 'pour', liquid: 'water', x: 300, y: 64, z: 300 });
  assert.equal(toTheirs('bucket', { action: 'fill', liquid: 'lava' }, ctx).calls[0].args.liquid, 'lava', 'filling stays allowed');
  const chest = (x, action = 'withdraw') => toTheirs('chest', { action, pos: { x, y: 64, z: 0 }, items: [{ item: 'dirt', n: 1 }] }, ctx);
  assert.match(chest(7).refused.result, /put down by another player's bot/);
  assert.equal(chest(7, 'inspect').refused.code, 'BAD_ARGS');
  assert.equal(chest(8).calls[0].tool, 'use_container', 'its own');
  assert.equal(chest(9).calls[0].tool, 'use_container', 'one nobody put down (a village chest)');
});

test('mineai body: a chest one game put down is closed to another game until the first ends; a pour near where it joined is refused', async () => {
  const hosts = fakeHosts(() => ({ inventory: { chest: 1, water_bucket: 1, dirt: 4 } }));
  const a = createMineAiBody({ config, log, hosts, gameId: 'gchestA', username: 'Tst_rv_ca' });
  const b = createMineAiBody({ config, log, hosts, gameId: 'gchestB', username: 'Tst_rv_cb' });
  await Promise.all([a.ready, b.ready]);
  try {
    assert.equal((await a.run('place', { block: 'chest', pos: { x: 30, y: 64, z: 30 } })).ok, true);
    const taken = await b.run('chest', { action: 'withdraw', pos: { x: 30, y: 64, z: 30 }, items: [{ item: 'dirt', n: 1 }] });
    assert.equal(taken.code, 'BAD_ARGS');
    assert.equal((await a.run('chest', { action: 'deposit', pos: { x: 30, y: 64, z: 30 }, items: [{ item: 'dirt', n: 1 }] })).ok, true, 'its own');
    const spawnPour = await b.run('bucket', { action: 'pour', pos: { x: 12, y: 64, z: 0 } });
    assert.equal(spawnPour.code, 'BAD_ARGS', 'the bot joined at 10 64 -4: the world spawn');
    await a.close();
    assert.equal((await b.run('chest', { action: 'inspect', pos: { x: 30, y: 64, z: 30 } })).ok, true, 'its game ended');
  } finally { await a.close(); await b.close(); }
});

test('mineai smelt: fuel one kind after another, in the order the check burns it', () => {
  assert.equal(FUEL_ORDER.indexOf('stick') > FUEL_ORDER.indexOf('oak_planks') && FUEL_ORDER.indexOf('stick') < FUEL_ORDER.indexOf('oak_log'), true);
  const have = (inv) => (n) => inv[n] ?? 0;
  assert.deepEqual(fuelPlan(have({ coal: 1, oak_planks: 4 }), 'raw_iron', 12), [{ name: 'coal', units: 1, covers: 8 }, { name: 'oak_planks', units: 3, covers: 4 }]);
  assert.deepEqual(fuelPlan(have({ stick: 4, oak_log: 2 }), 'raw_iron', 2), [{ name: 'stick', units: 4, covers: 2 }]);
  assert.deepEqual(fuelPlan(have({ stick: 3 }), 'raw_iron', 5), [{ name: 'stick', units: 2, covers: 1 }], 'what there is');
  const p = createPlanner();
  const mixed = { raw_iron: 12, coal: 1, oak_planks: 4, furnace: 1 };
  assert.equal(p.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 12 } }], { inventory: mixed, temporaryStations: true, table: false, furnace: false }).ok, true);
  assert.deepEqual(toTheirs('smelt', { item: 'raw_iron', n: 12 }, { inventory: mixed }).calls.map((c) => [c.args.fuel_item_name, c.args.count]), [['coal', 8], ['oak_planks', 4]]);
  // sticks first, the logs kept for the table: the check and the body agree
  const sticks = { raw_iron: 2, stick: 4, oak_log: 2, furnace: 1 };
  const plan = p.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 2 } }, { skill: 'craft', args: { item: 'crafting_table', n: 1 } }], { inventory: sticks, temporaryStations: true, table: false, furnace: false });
  assert.equal(plan.ok, true, JSON.stringify(plan.missing));
  assert.deepEqual(toTheirs('smelt', { item: 'raw_iron', n: 2 }, { inventory: sticks }).calls.map((c) => c.args.fuel_item_name), ['stick']);
});

test('mineai skills: Muse reads what this body\'s craft, smelt, collect and go_to do; ours keep their own words', () => {
  const desc = (list, name) => list.find((t) => t.function.name === name).function.description;
  assert.match(desc(MINEAI_SKILLS.mcpSkills, 'smelt'), /one furnace and wait until all are done/);
  assert.match(desc(MINEAI_SKILLS.mcpSkills, 'collect'), /every loaded chunk/);
  assert.match(desc(MINEAI_SKILLS.mcpSkills, 'craft_batch'), /one after another/);
  assert.match(desc(MCP_SKILLS, 'smelt'), /Loads up to 3 furnaces/, 'our body unchanged');
  assert.deepEqual(MINEAI_SKILLS.schemas.smelt, MCP_SKILLS.find((t) => t.function.name === 'smelt').function.parameters, 'the same arguments');
});

test('mineai switch: the agent refuses a runtime folder that is not the pin plus every patch', async () => {
  const dir = tmp('mineai-unbuilt-');
  await assert.rejects(startAgent({ config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '', BODY: 'mineai', MINEAI_DIR: dir }), print: () => {}, loopStatsMs: 0 }), /BODY=mineai: .*has no \.muse-mineai\.json.*fetch-and-patch\.sh/);
});

// ---------------------------------------------------------------------------------------------------------------
// the Muse run on staging (2026-10-08, game g38e5ef): what its report found unclear or wrong

test('mineai collect: cobblestone mines stone, and the reply never says "mined 0 blocks" for what it picked up', () => {
  assert.deepEqual(toTheirs('collect', { block: 'cobblestone', n: 12 }, { inventory: {} }).calls[0].args, { block_name: 'stone', count: 12 }, 'cobblestone is what stone drops');
  assert.equal(toTheirs('collect', { block: 'cobbled_deepslate', n: 3 }, { inventory: {} }).calls[0].args.block_name, 'deepslate');
  assert.equal(toTheirs('collect', { block: 'coal_ore', n: 4 }, { inventory: {} }).calls[0].args.block_name, 'coal_ore');
  assert.deepEqual(COLLECT_FROM, { cobblestone: 'stone', cobbled_deepslate: 'deepslate' });
  assert.equal(dropOf('stone'), 'cobblestone');
  assert.equal(dropOf('iron_ore'), 'raw_iron');
  assert.equal(dropOf('oak_log'), null, 'drops itself');
  const said = (args, collected) => fromTheirs('collect_block', { result: { status: 'succeeded', collected } }, { call: { tool: 'collect_block', args } }).result;
  assert.equal(said({ block_name: 'stone', count: 12 }, { requested: 12, gained: 12, gainedByItem: { cobblestone: 12 }, blocksBroken: 12 }),
    'mined 12 stone (stone drops cobblestone) and picked up 12 cobblestone (12 of 12 wanted)');
  // their blocksBroken counts only the target blocks their collect broke; the rest of the gain came on the way
  assert.equal(said({ block_name: 'stone', count: 8 }, { requested: 8, gained: 8, gainedByItem: { cobblestone: 8 }, blocksBroken: 4 }),
    'mined 4 stone (stone drops cobblestone) and picked up 8 cobblestone (8 of 8 wanted; 4 of them from blocks dug or items picked up on the way)');
  const muse = said({ block_name: 'cobblestone', count: 12 }, { requested: 12, gained: 12, gainedByItem: { cobblestone: 12 }, blocksBroken: 0 });
  assert.equal(muse, 'mined no cobblestone as a target and picked up 12 cobblestone (12 of 12 wanted; all of them from blocks dug or items picked up on the way)');
  assert.doesNotMatch(muse, /mined 0/);
  assert.equal(said({ block_name: 'coal_ore', count: 4 }, { requested: 4, gained: 4, gainedByItem: { coal: 4 }, blocksBroken: 4 }), 'mined 4 coal_ore (coal_ore drops coal) and picked up 4 coal (4 of 4 wanted)');
  // blocks that drop several items each (copper ore 2-5 raw copper, clay 4 clay balls): their own drops are not "on the way"
  assert.equal(said({ block_name: 'copper_ore', count: 8 }, { requested: 8, gained: 9, gainedByItem: { raw_copper: 9 }, blocksBroken: 3 }), 'mined 3 copper_ore (copper_ore drops raw_copper) and picked up 9 raw_copper (9 of 8 wanted)');
  assert.equal(said({ block_name: 'clay', count: 8 }, { requested: 8, gained: 8, gainedByItem: { clay_ball: 8 }, blocksBroken: 2 }), 'mined 2 clay (clay drops clay_ball) and picked up 8 clay_ball (8 of 8 wanted)');
  assert.equal(said({ block_name: 'copper_ore', count: 8 }, { requested: 8, gained: 12, gainedByItem: { raw_copper: 12 }, blocksBroken: 2 }), 'mined 2 copper_ore (copper_ore drops raw_copper) and picked up 12 raw_copper (12 of 8 wanted; at least 2 of them from blocks dug or items picked up on the way)', 'more than the targets can give');
});

test('mineai: what a step itself used and made, from their evidence (ownChange)', () => {
  // the stone pickaxe of the Muse run: the recipe takes 3 cobblestone and 2 sticks, whatever else came in meanwhile
  const plan = { steps: [{ item: 'stone_pickaxe', count: 1, applications: 1, ingredients: [{ item: 'cobblestone', count: 3 }, { item: 'stick', count: 2 }], requiresCraftingTable: true }] };
  const pick = { status: 'succeeded', craft: { items: [{ item: 'stone_pickaxe', requested: 1, gained: 1 }], completedSteps: 1, plan }, workstation: { block: 'crafting_table', position: { x: -5, y: 47, z: -201 }, recovered: true } };
  assert.deepEqual(ownChange('craft_item', { result: pick }), { stone_pickaxe: 1, cobblestone: -3, stick: -2 });
  // recursive: planks and sticks made on the way to a pickaxe are used up again (net)
  const wooden = { status: 'succeeded', craft: { items: [], completedSteps: 2, plan: { steps: [
    { item: 'stick', count: 4, applications: 1, ingredients: [{ item: 'oak_planks', count: 2 }] },
    { item: 'wooden_pickaxe', count: 1, applications: 1, ingredients: [{ item: 'oak_planks', count: 3 }, { item: 'stick', count: 2 }] },
  ] } } };
  assert.deepEqual(ownChange('craft_item', { result: wooden }), { stick: 2, oak_planks: -5, wooden_pickaxe: 1 });
  assert.deepEqual(ownChange('craft_item', { result: { ...pick, status: 'partial', workstation: { ...pick.workstation, recovered: false } } }), { stone_pickaxe: 1, cobblestone: -3, stick: -2, crafting_table: -1 }, 'a table left standing is one fewer carried');
  assert.equal(ownChange('craft_item', { result: { ...pick, status: 'partial', craft: { ...pick.craft, completedSteps: 0 } } }), null, 'cut part-way: cannot tell');
  assert.equal(ownChange('craft_item', { result: { status: 'succeeded', craft: { items: [] } } }), null, 'no plan in their evidence');
  assert.deepEqual(ownChange('smelt_item', { result: { status: 'succeeded', smelt: { inputItem: 'raw_iron', fuelItem: 'coal', outputItem: 'iron_ingot', requested: 3, produced: 3, fuelInserted: 1, rawRecovered: 0, fuelRecovered: 0 } } }), { raw_iron: -3, coal: -1, iron_ingot: 3 });
  // a smelt that failed before the furnace was loaded: their evidence still says requested 3 (smelt-item.ts evidence())
  const unloaded = { inputItem: 'raw_iron', fuelItem: 'coal', outputItem: null, requested: 3, produced: 0, fuelInserted: 0, rawRecovered: 0, fuelRecovered: 0 };
  assert.deepEqual(ownChange('smelt_item', { result: { status: 'failed', error: '[WORKSTATION_PLACEMENT_FAILED] furnace: no_cell', smelt: unloaded } }), {}, 'nothing used');
  assert.deepEqual(ownChange('smelt_item', { result: { status: 'failed', error: '[FURNACE_NOT_EMPTY] ...', smelt: unloaded, workstation: { block: 'furnace', recovered: false } } }), { furnace: -1 }, 'only a furnace left standing');
  // stalled after loading: what came back is not used; a fuel recovered beyond what went in is never a gain
  assert.deepEqual(ownChange('smelt_item', { result: { status: 'partial', smelt: { ...unloaded, outputItem: 'iron_ingot', produced: 1, fuelInserted: 1, rawRecovered: 2 } } }), { raw_iron: -1, coal: -1, iron_ingot: 1 });
  assert.deepEqual(ownChange('smelt_item', { result: { status: 'failed', smelt: { ...unloaded, fuelInserted: 1, fuelRecovered: 2, rawRecovered: 3 } } }), {}, 'clamped');
  assert.deepEqual(ownChange('collect_block', { result: { status: 'succeeded', collected: { gainedByItem: { coal: 4 } } } }), { coal: 4 });
  assert.deepEqual(ownChange('collect_mob_drop', { result: { status: 'succeeded', hunt: { drop: 'porkchop', gained: 2 } } }), { porkchop: 2 });
  assert.deepEqual(ownChange('eat_food', { result: { status: 'succeeded', eating: { food: 'cooked_porkchop', inventoryBefore: 2, inventoryAfter: 1 } } }), { cooked_porkchop: -1 });
  assert.deepEqual(ownChange('build_structure', { result: { status: 'succeeded', structure: { placed: 10, dug: 2 } } }, { args: { blocks: [{ block_name: 'cobblestone' }, { block_name: 'air' }] } }), { cobblestone: -10 });
  assert.deepEqual(ownChange('navigate', { result: { status: 'succeeded' } }), {}, 'a walk itself uses and makes nothing');
  assert.equal(ownChange('pick_up_items', { result: { status: 'succeeded' } }), null, 'all of it is the step\'s own: shown whole');
});

test('mineai body and MCP: a step\'s own use and gain apart from what changed on the way (the Muse run\'s deltas)', async () => {
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 3, stick: 2, crafting_table: 1, stone_pickaxe: 1, raw_iron: 3, coal: 2, furnace: 1 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS,
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId }),
  });
  const { url } = await web.start();
  const c = await mcpClient(url);
  try {
    await c.callTool({ name: 'start_game', arguments: { adult: true } });
    const fake = hosts.started[0].fake;
    // the table is dug back up and a cobblestone lying by it comes along (their craft's evidence says nothing of it)
    fake.world.side.craft_item = { cobblestone: 1 };
    const pick = await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } } });
    const st = pick.structuredContent.steps[0];
    assert.equal(st.status, 'confirmed', text(pick));
    assert.deepEqual(st.delta, { cobblestone: -2, stick: -2, stone_pickaxe: 1 }, 'the whole change, as before');
    assert.deepEqual(st.used, { cobblestone: 3, stick: 2 }, 'the recipe');
    assert.deepEqual(st.gained, { stone_pickaxe: 1 });
    assert.deepEqual(st.other, { cobblestone: 1 });
    assert.match(text(pick), /^craft \{"item":"stone_pickaxe","n":1\}: ok: crafted 1 stone_pickaxe .*\[-3 cobblestone, -2 stick, \+1 stone_pickaxe; also changed meanwhile \(dug through, scaffolding, pickups, other drops\): \+1 cobblestone\]$/m);
    assert.deepEqual(pick.structuredContent.changed, { cobblestone: -2, stick: -2, stone_pickaxe: 1 });
    fake.world.side = {};

    // coal ore underground: stone dug through on the way, dirt placed to stand on
    fake.world.side.collect_block = { cobblestone: 7, dirt: -4 };
    fake.world.inventory.set('dirt', 10);
    const coal = (await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'coal_ore', n: 4 } } })).structuredContent.steps[0];
    assert.deepEqual([coal.gained, coal.used, coal.other], [{ coal: 4 }, undefined, { cobblestone: 7, dirt: -4 }]);
    fake.world.side = {};

    // cobblestone: stone is mined for it
    const cob = await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'cobblestone', n: 12 } } });
    assert.equal(fake.tools('collect_block').at(-1).args.block_name, 'stone');
    assert.match(cob.structuredContent.steps[0].result, /^mined 12 stone \(stone drops cobblestone\) and picked up 12 cobblestone \(12 of 12 wanted\)$/);

    // a shelter dug into the stone: the build places 10 and digs; what it dug out is apart from what it used
    fake.world.buildDug = 2;
    fake.world.side.build_structure = { cobblestone: 19, dirt: 1 };
    const shelter = (await c.callTool({ name: 'play', arguments: { skill: 'build', args: { blueprint: 'shelter', material: 'cobblestone' } } })).structuredContent.steps[0];
    assert.equal(shelter.status, 'confirmed', shelter.result);
    assert.match(shelter.result, /^placed 10 cobblestone and dug 2 cells clear \(12 of 12 cells as the blueprint\) \(built facing \w+\)$/);
    assert.deepEqual([shelter.delta, shelter.used, shelter.other], [{ cobblestone: 9, dirt: 1 }, { cobblestone: 10 }, { cobblestone: 19, dirt: 1 }]);
    fake.world.side = {};

    // a smelt that fails before the furnace is loaded (a furnace that holds items): nothing used, nothing "on the way"
    fake.world.fail.smelt_item = '[FURNACE_NOT_EMPTY] The furnace already holds input; nothing was inserted.';
    const early = await c.callTool({ name: 'play', arguments: { skill: 'smelt', args: { item: 'raw_iron', n: 3 } } });
    const e0 = early.structuredContent.steps[0];
    assert.equal(e0.status, 'failed');
    assert.deepEqual([e0.delta, e0.used, e0.gained, e0.other], [{}, undefined, undefined, undefined], text(early));
    assert.match(e0.result, /^failed: The furnace already holds input; nothing was inserted\. \(nothing was put into a furnace; your raw_iron and coal are still carried\)$/);
    assert.doesNotMatch(text(early), /\[-3 raw_iron|on the way|meanwhile/);
    delete fake.world.fail.smelt_item;

    // a smelt with nothing else going on: no "other"
    const smelt = (await c.callTool({ name: 'play', arguments: { skill: 'smelt', args: { item: 'raw_iron', n: 3 } } })).structuredContent.steps[0];
    assert.deepEqual([smelt.used, smelt.gained, smelt.other], [{ raw_iron: 3, coal: 1 }, { iron_ingot: 3 }, undefined]);

    // a collect during which the pickaxe wore out and the body ate on its own: named as such, not as scaffolding
    fake.world.side.collect_block = { stone_pickaxe: -1, cooked_porkchop: -1, dirt: -2 };
    fake.world.inventory.set('cooked_porkchop', 2);
    const worn = await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'cobblestone', n: 4 } } });
    assert.match(text(worn), /^collect \{"block":"cobblestone","n":4\}: ok: .*\[\+4 cobblestone; also changed meanwhile \(dug through, scaffolding, pickups, other drops\): -2 dirt; worn out: -1 stone_pickaxe; eaten meanwhile \(the body eats on its own when hungry\): -1 cooked_porkchop\]$/m);
    assert.deepEqual(worn.structuredContent.steps[0].other, { stone_pickaxe: -1, cooked_porkchop: -1, dirt: -2 }, 'other stays the whole rest');
    fake.world.side = {};

    // eat at a full bar: a typed, harmless failure
    fake.world.food = 20;
    await c.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'read the status' } } });
    const eat = await c.callTool({ name: 'play', arguments: { skill: 'eat', args: {} } });
    assert.equal(eat.structuredContent.code, 'NOT_HUNGRY');
    assert.equal(eat.structuredContent.steps[0].code, 'NOT_HUNGRY');
    assert.match(text(eat), /FAILED: not hungry: food is 20\/20, and eat works only below 20\. Harmless: nothing was eaten or used, and the steps queued after it still run/);
    assert.equal(fake.tools('eat_food').length, 0, 'nothing was sent to the body');
  } finally {
    await c.close();
    await web.stop();
  }
});

test('mineai start check: a runtime built before patch 0009 or 0010 is refused', () => {
  const up = readUpstream();
  assert.ok(up.patches.at(-2).endsWith('0009-placement-around-a-mob.patch'));
  assert.match(fs.readFileSync(up.patches.at(-2), 'utf8'), /overlaps bat #44444/);
  assert.ok(up.patches.at(-1).endsWith('0010-build-never-stalls-the-event-loop.patch'));
  assert.match(fs.readFileSync(up.patches.at(-1), 'utf8'), /^\+const STEP_OUT_PASSES = 3;$/m);
  const dir = tmp('mineai-eight-');
  for (const cut of [-1, -2]) {
    fs.writeFileSync(path.join(dir, STAMP), JSON.stringify(stampFor({ ...up, patches: up.patches.slice(0, cut) })));
    const old = checkFetched(dir, up);
    assert.equal(old.ok, false);
    assert.match(old.why, /other patch files/);
  }
  fs.writeFileSync(path.join(dir, STAMP), JSON.stringify(stampFor(up)));
  assert.match(checkFetched(dir, up).why, /has HEAD/, 'with every patch the stamp passes; the folder is still checked further');
});
