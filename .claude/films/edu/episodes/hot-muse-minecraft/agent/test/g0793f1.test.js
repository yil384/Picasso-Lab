// test/g0793f1.test.js - what the owner's fourth production run (game g0793f1, 2026-10-12) showed, one test each:
// rotten flesh as the last food, a death's items underground, a step whose time ran out in a fight, the body's own
// shelter before the first call with no blocks, advice at very low health, reflexes counted once per kind, and a
// pickup that says what came back.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { toTheirs, MINEAI_TIMEOUTS } from '../src/mineai/skills.js';
import { advise, createCare } from '../src/mineai/care.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g0793f1-')) });
const log = createLogger({ dir: null, config });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const NOW = Date.parse('2026-10-12T21:13:00Z');
const situation = (o = {}) => ({
  dimension: 'overworld', vitals: { health: 20, food: 20, ...(o.vitals ?? {}) }, clock: { timeOfDay: 1000, ...(o.clock ?? {}) },
  position: { x: 288.5, y: 46, z: 47.5, headingDegrees: 0 }, nearby: { hostiles: [], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' },
});

test('g0793f1: rotten flesh is eaten when it is all there is and food is low, with a warning; above food 6 the refusal says why', () => {
  const ctx = { inventory: { rotten_flesh: 2 }, food: 6 };
  const r = toTheirs('eat', {}, ctx);
  assert.deepEqual(r.calls[0].args, { food_name: 'rotten_flesh' });
  assert.match(r.note, /^rotten_flesh was all you had: it may give Hunger/);
  const no = toTheirs('eat', {}, { ...ctx, food: 10 });
  assert.match(no.refused.result, /rotten_flesh may give Hunger, so eat takes it only at food 6 or less, or when hurt below food 18 \(now food 10\)/);
  // hurt (gd7540a, 2026-10-14): eaten below food 18, where health comes back
  assert.deepEqual(toTheirs('eat', {}, { ...ctx, food: 10, health: 6 }).calls[0].args, { food_name: 'rotten_flesh' });
  assert.equal(toTheirs('eat', {}, { inventory: { spider_eye: 2 }, food: 3 }).refused.code, 'NEED_ITEMS', 'never food that takes health');
});

test('g0793f1: pick_up of a death\'s items walks to the death spot first, with time for the walk', () => {
  const ctx = { inventory: {}, position: { x: 288, y: 85, z: 53 }, dimension: 'overworld', lastDeath: { position: { x: 288.4, y: 39, z: 46.7 }, dimension: 'minecraft:overworld' } };
  const r = toTheirs('pick_up', { death_items: true }, ctx);
  assert.deepEqual(r.calls.map((c) => c.tool), ['navigate', 'pick_up_items']);
  assert.deepEqual(r.calls[0].args, { x: 288, y: 39, z: 46 });
  assert.ok(r.calls[0].optional && r.timeoutMs > MINEAI_TIMEOUTS.pick_up);
  assert.equal(toTheirs('pick_up', { death_items: true }, { ...ctx, position: { x: 289, y: 39, z: 46 } }).calls.length, 1, 'already there');
  assert.equal(toTheirs('pick_up', {}, ctx).calls.length, 1, 'other pickups: as before');
});

test('g0793f1: advice at very low health: stay enclosed until healed, the food it needs and the best food carried', () => {
  const s = situation({ vitals: { health: 3.4, food: 6 } });
  const a = advise(s, { now: NOW, inventory: { rotten_flesh: 2 }, stacks: [{ name: 'shield', count: 1, location: 'off-hand' }], memory: { cool: {}, night: 0, shelter: { feet: { x: 288, y: 46, z: 47 }, night: 0 } }, canCraft: () => false });
  const heal = a.find((x) => x.kind === 'heal');
  assert.equal(heal.text, 'health 3.4/20: stay in your shelter until it heals, as one more hit or arrow can kill you; healing needs food 18 or more (now 6); the best food you carry: rotten_flesh');
  assert.deepEqual(heal.hint, { skill: 'eat', args: {} });
  assert.equal(advise(situation({ vitals: { health: 12, food: 20 } }), { now: NOW, stacks: [{ name: 'shield', count: 1, location: 'off-hand' }], memory: { cool: {}, night: 0 } }).find((x) => x.kind === 'heal'), undefined);
});

test('g0793f1: reflexes during a step count once per kind of response and mob, not once per mob', () => {
  const events = [];
  const care = createCare({ situation: () => null, latest: () => ({ inventory: {} }), stacks: () => [], refresh: async () => {}, act: async () => ({}), rpc: async () => ({}), plan: () => ({}), idle: () => false, idleSince: () => 0, furnaceNear: () => false, tableNear: () => false, event: (k, d) => events.push({ k, ...d }), tickMs: 1e9 });
  const fight = [
    'fight response for skeleton#1 at 1,2,3 (3.0 blocks).', 'fight response for zombie#2 (2.0 blocks).', 'fight response for zombie#3 (2.0 blocks).',
    'fight response for zombie#4 (2.1 blocks).', 'fight response for spider#5 (2.0 blocks).', 'fight response for spider#6 (2.0 blocks).',
    'evade response for skeleton#1 (9 blocks).', 'evade response for creeper#7 (3 blocks).', 'evade response for creeper#8 (4 blocks).', 'unknown thing',
  ];
  care.reflexesInStep(fight, 'collect_block');
  assert.equal(care.counts().reflex, 5, 'fought a skeleton, a zombie, a spider; got out of the way of a skeleton, a creeper');
  assert.equal(events.filter((e) => e.source === 'reflex').length, 5);
});

test('g0793f1 (since 2026-10-13): no shelter of its own before the first call either: the body acts only by Muse\'s rules', async () => {
  const calls = [];
  const state = { situation: { ...situation({ clock: { timeOfDay: 15000 } }) } };
  const care = createCare({
    situation: () => state.situation, latest: () => ({ inventory: {}, equipment: {} }), stacks: () => [], refresh: async () => {},
    act: async (call) => { calls.push(call); return { output: { action: call.tool, result: { status: 'succeeded' } } }; },
    rpc: async () => ({}), plan: () => ({ calls: [] }), idle: () => true, idleSince: () => NOW - 10_000, furnaceNear: () => false, tableNear: () => false,
    event: () => {}, now: () => NOW, tickMs: 1e9, mode: 'advise',
  });
  await care.tick();
  assert.deepEqual(calls, []);
  assert.deepEqual(care.since(0), []);
});

test('g0793f1: a step whose time ran out while a reflex fought is tried once more, then INTERRUPTED in plain words; a pickup says what came back', async () => {
  const hosts = fakeHosts(() => ({ inventory: { bucket: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gtimeout', username: 'Tst_rv_gtimeout', careTickMs: 30, careIdleMs: 50, timeouts: { ...MINEAI_TIMEOUTS, bucket: 1_200 } });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    let n = 0;
    fake.world.durations = Object.defineProperty({ ...(fake.world.durations ?? {}) }, 'use_bucket', { get: () => (n++ ? 20 : 3_000), enumerable: true });
    fake.world.interruptionsFor = { use_bucket: ['fight response for creeper#9 at 1,2,3 (2.0 blocks).'] };
    let r = await body.run('bucket', { action: 'fill', liquid: 'water' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^time ran out while a reflex had the body \(it fought a creeper\); tried again; filled a bucket with water/);
    n = 0;
    fake.world.durations = Object.defineProperty({ ...fake.world.durations }, 'use_bucket', { get: () => 3_000, enumerable: true });
    r = await body.run('bucket', { action: 'fill', liquid: 'water' });
    assert.equal(r.code, 'INTERRUPTED');
    assert.match(r.result, /the step's time ran out while a reflex had the body \(it fought a creeper\); nothing is wrong with the step/);
    fake.world.interruptionsFor = null;
    fake.world.side.pick_up_items = { iron_ingot: 2, diamond_pickaxe: 1 };
    r = await body.run('pick_up', {});
    assert.equal(r.result, 'picked up iron_ingot +2, diamond_pickaxe +1');
  } finally { await body.close(); }
});
