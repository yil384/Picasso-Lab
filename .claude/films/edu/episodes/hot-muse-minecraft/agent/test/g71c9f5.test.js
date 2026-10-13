// test/g71c9f5.test.js - what production game g71c9f5 (2026-10-13) showed, one test each: the body's dig-in before the
// first call left the hole open ("no blocks carried to close it over") and a zombie killed the bot; enter refused
// while the bot stood in the portal it had just lit ("already occupies this nether_portal after a recent arrival"), and
// the game then took it through by itself. (craft without n: test/tolerant.test.js; the nudges and what the client reads:
// test/liveview.test.js; the whole game: test/replay.test.js.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createCare } from '../src/mineai/care.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const NOW = Date.parse('2026-10-13T16:54:10Z');
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 8000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };

test('g71c9f5: before the first call the body digs three down and closes the hole over its head with what it dug', async () => {
  const calls = [];
  const inv = {};
  const state = { situation: { dimension: 'overworld', vitals: { health: 20, food: 20 }, clock: { timeOfDay: 15000 }, position: { x: 398.5, y: 77, z: -269.5, headingDegrees: 0 }, nearby: { hostiles: [{ name: 'zombie', kind: 'hostile', nearest: { distance: 12, position: { x: 405, y: 77, z: -269 } } }], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' } } };
  const care = createCare({
    situation: () => state.situation, latest: () => ({ inventory: inv, equipment: {} }), stacks: () => [], refresh: async () => {},
    act: async (call) => {
      calls.push(call);
      if (call.tool === 'navigate') { state.situation.position = { ...state.situation.position, y: call.args.y }; inv.dirt = 3; }
      if (call.tool === 'build_structure') return { output: { action: 'build_structure', result: { status: 'succeeded', structure: { cells: 1, wrong: 0, placed: 1, left: [], missing: [], kept: [], supports: [], water: 0, passes: 1, complete: true } } } };
      return { output: { action: call.tool, result: { status: 'succeeded' } } };
    },
    rpc: async () => ({}), plan: () => ({ calls: [] }), idle: () => true, idleSince: () => NOW - 10_000, furnaceNear: () => false, tableNear: () => false,
    event: () => {}, now: () => NOW, tickMs: 1e9, mode: 'advise',
  });
  await care.tick();
  assert.deepEqual(calls.map((c) => c.tool), ['navigate', 'pick_up_items', 'build_structure']);
  assert.deepEqual(calls[2].args.blocks, [{ x: 398, y: 76, z: -270, block_name: 'dirt' }], 'the lid where the ground was, over its head');
  assert.match(care.since(0).at(-1).text, /dug three blocks down and closed the hole over its head with dirt$/);
  // it counts as its shelter: the night advice says it is inside, not that there is none
  const advice = care.advice();
  assert.ok(advice.some((a) => a.kind === 'waiting'), JSON.stringify(advice));
  assert.equal(advice.some((a) => a.kind === 'night'), false);
});

test('g71c9f5: enter while standing in the portal it lit: the game takes it through by itself, or it steps out and enters after the cooldown', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g71c9f5-')), MC_PORT: '25921' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 14, flint_and_steel: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'genter', username: 'Tst_rv_genter', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.position = { x: -24.5, y: 66, z: 94.5 };
    await body.refresh();
    assert.equal((await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' })).ok, true);
    assert.equal((await body.run('portal', { action: 'light' })).ok, true);
    // standing in it: their entry refuses; the game takes it through within a few seconds
    fake.world.inPortal = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    setTimeout(() => { fake.world.dimension = 'the_nether'; fake.world.position = { x: 12.5, y: 58, z: 17.5 }; }, 1500);
    let r = await body.run('portal', { action: 'enter' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^went through the portal; you came out in the Nether at 12 58 17 \(the game took the bot through as it stood in the portal\)/);
    // another bot, standing in the portal it just lit, and the game does not take it: it steps out, waits out the
    // cooldown, enters again
    const b = createMineAiBody({ config, log, hosts, gameId: 'genter2', username: 'Tst_rv_genter2', careTickMs: 30, careIdleMs: 50 });
    await until(() => hosts.started.find((h) => h.username === 'Tst_rv_genter2'));
    const fb = hosts.started.find((h) => h.username === 'Tst_rv_genter2').fake;
    await b.ready;
    try {
      fb.world.inventory.set('obsidian', 14); fb.world.inventory.set('flint_and_steel', 1);
      fb.world.position = { x: 300.5, y: 66, z: 300.5 };
      await b.refresh();
      assert.equal((await b.run('build', { blueprint: 'nether_portal', material: 'obsidian' })).ok, true);
      assert.equal((await b.run('portal', { action: 'light' })).ok, true);
      fb.world.inPortal = { x: 300, y: 66, z: 300 };
      r = await b.run('portal', { action: 'enter' });
      assert.equal(r.ok, true, r.result);
      assert.match(r.result, /it was standing in the portal: stepped out of it to enter again after the game's cooldown/);
      assert.equal(fb.world.dimension, 'the_nether');
    } finally { await b.close?.(); }
  } finally {
    await body.close?.();
    await hosts.closeAll();
  }
});
