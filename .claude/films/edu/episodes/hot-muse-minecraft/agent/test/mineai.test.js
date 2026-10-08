// test/mineai.test.js - BODY=mineai with no Minecraft and no runtime of theirs: the skill mapping (our skills and the
// extra ones onto their actions, their results and codes back), the body against an in-process fake host (state,
// skills, stop and timeout through cancel_foreground_action, their result gate, a death, the policy revision, close),
// the host manager against a fake host process (loopback port of the range, token, no secrets in its environment,
// cap, a crash restarted once, missed heartbeats, killed on close), the MCP endpoint and startAgent with the switch
// (the queue, request_id, typed codes and 45 s replies on top; extra skills listed in compact form; no rationale and
// nothing of their 1.36 MB tools/list), the dry-run check with temporary stations, the config switch and the fetch
// script's pin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig, ConfigError } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';
import { startAgent } from '../src/index.js';
import { createPlanner } from '../src/plan.js';
import { blueprintBlockCount } from '../src/game.js';
import { MINEAI_SKILLS, EXTRA_DEFS, toTheirs, fromTheirs, codeFor, needsTable, bestFood, chooseFuel, blueprintCells } from '../src/mineai/skills.js';
import { createMineAiBody, inventoryOfStacks } from '../src/mineai/body.js';
import { createHostManager, hostCommand, hostEnv } from '../src/mineai/host.js';
import { readUpstream, check as checkFetched, main as fetchMain } from '../scripts/mineai-fetch.mjs';
import { startFakeMineAi, fakeHosts } from './fake-mineai.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (r) => r.content.map((x) => x.text).join('\n');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
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
  assert.deepEqual(toTheirs('craft_batch', { items: [{ item: 'stick', n: 4 }, { item: 'stone_pickaxe', n: 1 }] }, ctx).calls[0].args.items, [{ item_name: 'stick', count: 4 }, { item_name: 'stone_pickaxe', count: 1 }]);
  const smelt = toTheirs('smelt', { item: 'raw_iron', n: 30 }, ctx);
  assert.deepEqual(smelt.calls[0].args, { item_name: 'raw_iron', count: 24, fuel_item_name: 'coal', temporary_workstation: true });
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
  const ok = fromTheirs('collect_block', { result: { status: 'succeeded', collected: { requested: 3, gained: 3, gainedByItem: { birch_log: 3 }, blocksBroken: 3 } } });
  assert.deepEqual(ok, { ok: true, result: 'mined 3 blocks and picked up 3 birch_log (3 of 3 wanted)', code: null, theirs: null });
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
  const hosts = fakeHosts();
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
