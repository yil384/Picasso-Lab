// test/stations.test.js - the roadmap's M2 body work on the fake bot: stations that stay and belong to the bot that
// placed them (reuse, other bots kept out, the cap of 4, removal when the game ends), parallel furnaces with a
// background smelt, the path-cost order of collect targets, the cached block scan, the skipped inventory syncs and
// the bot's view distance. No Minecraft server, no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFakeBot } from './fake-bot.js';
import { createBody, VIEW_DISTANCE } from '../src/body.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { Vec3 } from '../src/mc.js';
import { createStationRegistry, removeLine, MAX_PER_BOT, HARD_MAX } from '../src/stations.js';
import { pathCost } from '../src/skills/collect.js';
import { safeToDig, minableHere, tunnelAhead } from '../src/skills/tunnel.js';
import { snapshotOf, scanCount } from '../src/state.js';

const config = loadConfig({});

async function setup(botOpts = {}, bodyOpts = {}) {
  const bot = createFakeBot({ scene: 'flat', ...botOpts });
  const log = createLogger({ dir: null, config });
  const body = createBody({ bot, config, log, ...bodyOpts });
  await body.ready;
  return { bot, body, log };
}
const called = (bot, fn) => bot.fake.calls.filter((c) => c.fn === fn);
const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stations-')), 'console.in');
const lines = (file) => (fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean) : []);

test('stations registry: owners, temporary holds, the cap retires the oldest, release', () => {
  const reg = createStationRegistry();
  assert.deepEqual(reg.add('a', 'crafting_table', { x: 1, y: 64, z: 1 }), []);
  assert.equal(reg.ownerOf({ x: 1.7, y: 64.2, z: 1.1 }), 'a');
  assert.equal(reg.usableBy('a', { x: 1, y: 64, z: 1 }), true);
  assert.equal(reg.usableBy('b', { x: 1, y: 64, z: 1 }), false);
  assert.equal(reg.usableBy('b', { x: 9, y: 64, z: 9 }), true, 'nobody owns it');
  assert.deepEqual(reg.add('b', 'furnace', { x: 1, y: 64, z: 1 }), [], 'another bot cannot take it over');
  assert.equal(reg.ownerOf({ x: 1, y: 64, z: 1 }), 'a');
  reg.add('a', 'furnace', { x: 5, y: 64, z: 5 }, { temp: true });
  for (let i = 0; i < MAX_PER_BOT - 1; i++) assert.deepEqual(reg.add('a', 'furnace', { x: 2 + i, y: 64, z: 0 }), []);
  const retired = reg.add('a', 'furnace', { x: 9, y: 64, z: 0 });
  assert.deepEqual(retired.map((s) => [s.name, s.pos.x]), [['crafting_table', 1]], 'the oldest goes; a temporary hold does not count');
  assert.equal(reg.owned('a').length, MAX_PER_BOT);
  assert.equal(removeLine(retired[0]), 'execute if block 1 64 1 minecraft:crafting_table run setblock 1 64 1 air');
  const released = reg.release('a');
  assert.equal(released.length, MAX_PER_BOT, 'the temporary hold is dropped, never removed from the world');
  assert.equal(reg.size, 0);
});

test('stations: another bot\'s table is never used or mined; its own is; the cap and the end of the game remove blocks through the console', async () => {
  const registry = createStationRegistry();
  const file = tmpFile();
  fs.writeFileSync(file, '');
  const { bot: a, body: A } = await setup({ username: 'Tst_a', inventory: { oak_planks: 6, stick: 4, crafting_table: 1, wooden_pickaxe: 1 } }, { stations: registry, console: file });
  const { bot: b, body: B } = await setup({ username: 'Tst_b', inventory: { oak_planks: 3, stick: 2 } }, { stations: registry, console: file });

  const pick = await A.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(pick.ok, true, pick.result);
  const [own] = registry.owned('Tst_a');
  assert.equal(own.name, 'crafting_table');
  // the same server: B sees A's table where A put it
  b.fake.setBlock(new Vec3(own.pos.x, own.pos.y, own.pos.z), 'crafting_table');
  const theirs = await B.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(theirs.ok, false);
  assert.match(theirs.result, /needs a crafting table: none within 24 blocks/);
  assert.equal(called(b, 'craft').length, 0, 'never crafted at A\'s table');
  const mine = await B.run('collect', { block: 'crafting_table', n: 1 });
  assert.equal(mine.ok, false);
  assert.match(mine.result, /^mined 0 of 1 crafting_table: no more crafting_table of yours within 32 blocks$/);
  assert.equal(b.blockAt(new Vec3(own.pos.x, own.pos.y, own.pos.z)).name, 'crafting_table');

  // A takes its own table back: it is no longer A's station
  const back = await A.run('collect', { block: 'crafting_table', n: 1 });
  assert.equal(back.ok, true, back.result);
  assert.deepEqual(back.delta, { crafting_table: 1 });
  assert.equal(registry.owned('Tst_a').length, 0);

  // five furnaces placed by hand: the fifth retires the oldest, through the console
  a.fake.give('furnace', 5);
  for (let i = 0; i < 5; i++) {
    const r = await A.run('place', { block: 'furnace', pos: { x: 3 + 2 * i, y: 64, z: 3 } });
    assert.equal(r.ok, true, r.result);
    if (i === 4) assert.match(r.result, /^placed furnace at 11 64 3; removed your oldest furnace at 3 64 3 \(a bot keeps at most 4\)$/);
  }
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(lines(file), ['execute if block 3 64 3 minecraft:furnace run setblock 3 64 3 air']);
  assert.match(A.state(), /^your stations: furnace at 5 64 3, furnace at 7 64 3, furnace at 9 64 3, furnace at 11 64 3$/m);

  // the game ends: the rest go too
  await A.close();
  assert.equal(lines(file).length, 5);
  assert.ok(lines(file).slice(1).every((l) => /^execute if block \d+ 64 3 minecraft:furnace run setblock \d+ 64 3 air$/.test(l)));
  assert.equal(registry.owned('Tst_a').length, 0);
  await B.close();
});

test('smelt: three furnaces at once (two crafted from spare cobblestone); the iron pickaxe waits for the ingots', async () => {
  const { bot, body } = await setup(
    { inventory: { raw_iron: 3, furnace: 1, cobblestone: 17, oak_planks: 12, stick: 2, crafting_table: 1 }, smeltMsPerItem: 40 },
    { timing: { smeltMs: 40, pollMs: 5 } },
  );
  const t0 = Date.now();
  const r = await body.run('smelt', { item: 'raw_iron', n: 3 });
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /^smelting 3 raw_iron in 3 furnaces at (-?\d+ 64 -?\d+(, )?){3}, burning 3 oak_planks: 3 iron_ingot ready in about 1 s\. .* \(crafted 2 more furnaces from 16 cobblestone to smelt in parallel \(placed a crafting table at -?\d+ 64 -?\d+; it stays there for your next crafts\)\)$/);
  assert.deepEqual(r.delta, { raw_iron: -3, oak_planks: -3, cobblestone: -16, furnace: -1, crafting_table: -1 });
  assert.equal(called(bot, 'furnace.input').length, 3);
  assert.ok(called(bot, 'furnace.input').every((c) => c.count === 1), 'one item each');
  const pick = await body.run('craft', { item: 'iron_pickaxe', n: 1 });
  assert.equal(pick.ok, true, pick.result);
  assert.match(pick.result, /^crafted 1 iron_pickaxe \(took 3 iron_ingot from your furnaces\) \(at your crafting table at /);
  assert.deepEqual(pick.delta, { stick: -2, iron_pickaxe: 1 });
  assert.ok(Date.now() - t0 < 2_000);
  assert.equal(called(bot, 'placeBlock').filter((c) => c.block === 'crafting_table').length, 1, 'one table for both crafts');
  assert.match(body.state(), /^your stations: crafting_table at .*, furnace at .*, furnace at .*, furnace at /m);
});

test('collect: targets in order of path cost: an open block beats a buried one, climbing costs more than walking', async () => {
  const bot = createFakeBot({ scene: 'flat' });
  const from = bot.entity.position;
  // buried stone right below the bot's feet vs. stone in the open a few blocks away
  bot.fake.setBlock(new Vec3(0, 62, 0), 'stone');
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) bot.fake.setBlock(new Vec3(x, 62, z), 'dirt');
  bot.fake.setBlock(new Vec3(5, 64, 0), 'stone'); // standing on the ground, air around
  const buried = pathCost(bot, new Vec3(0, 62, 0), from);
  const open = pathCost(bot, new Vec3(5, 64, 0), from);
  assert.ok(open < buried, `open ${open} < buried ${buried}`);
  // a log high up the trunk costs more than one at the bottom of a tree a little farther away
  bot.fake.setBlock(new Vec3(2, 70, 0), 'oak_log');
  bot.fake.setBlock(new Vec3(4, 64, 2), 'oak_log');
  assert.ok(pathCost(bot, new Vec3(4, 64, 2), from) < pathCost(bot, new Vec3(2, 70, 0), from));
  // water next to it: last
  bot.fake.setBlock(new Vec3(3, 64, -3), 'stone');
  bot.fake.setBlock(new Vec3(3, 65, -3), 'water');
  assert.ok(pathCost(bot, new Vec3(3, 64, -3), from) > open + 4);

  const { body } = await setup({ inventory: { wooden_pickaxe: 1 } });
  const b = body.bot;
  b.fake.setBlock(new Vec3(0, 62, 0), 'stone');
  b.fake.setBlock(new Vec3(5, 64, 0), 'stone');
  const r = await body.run('collect', { block: 'stone', n: 1 });
  assert.equal(r.ok, true, r.result);
  assert.deepEqual(called(b, 'dig').map((c) => c.pos), ['(5, 64, 0)'], 'the open one first, though it is farther');
});

test('state: the block scan is cached until the bot moves 4 blocks, a notable block changes nearby, or 5 s pass', () => {
  const bot = createFakeBot({ scene: 'forest' });
  snapshotOf(bot);
  snapshotOf(bot);
  assert.equal(scanCount(bot), 1);
  bot.fake.setBlock(new Vec3(1, 63, 1), 'dirt'); // not notable
  assert.equal(snapshotOf(bot).nearbyBlocks.find((x) => x.name === 'oak_log').count, 12);
  assert.equal(scanCount(bot), 1);
  bot.fake.setBlock(new Vec3(3, 64, 2), 'air'); // a log gone
  assert.equal(snapshotOf(bot).nearbyBlocks.find((x) => x.name === 'oak_log').count, 11);
  assert.equal(scanCount(bot), 2);
  bot.fake.moveTo({ x: 2.5, y: 64, z: 0.5 });
  const near = snapshotOf(bot).nearbyBlocks.find((x) => x.name === 'oak_log');
  assert.equal(scanCount(bot), 2, 'two blocks of movement: no new scan');
  const n = near.nearest;
  assert.equal(near.distance, Math.round(new Vec3(n.x + 0.5, n.y + 0.5, n.z + 0.5).distanceTo(bot.entity.position) * 10) / 10, 'distance from where it stands now');
  bot.fake.moveTo({ x: 6.5, y: 64, z: 0.5 });
  snapshotOf(bot);
  assert.equal(scanCount(bot), 3);
});

test('inventory syncs: a craft right after another sends no sync of its own (S10); the bot asks for 6 chunks (S11)', async () => {
  const { bot, body } = await setup({ inventory: { oak_planks: 16 }, clickServer: { lagMs: 2 } });
  assert.equal((await body.run('craft', { item: 'stick', n: 4 })).ok, true);
  const n0 = bot.fake.calls.length;
  const r = await body.run('craft', { item: 'stick', n: 4 });
  assert.equal(r.ok, true, r.result);
  assert.deepEqual(r.delta, { oak_planks: -2, stick: 4 });
  const clicks = bot.fake.calls.slice(n0).filter((c) => c.fn === 'packet.window_click');
  assert.equal(clicks.filter((c) => c.slot === -999).length, 0, 'no sync or settle click without a reason');
  assert.ok(clicks.length <= 6, `${clicks.length} clicks for one batch of sticks`);
  assert.equal(VIEW_DISTANCE, 6);
});

test('tunnel (S2): only blocks the chunk data shows are safe; stone in reach first, then a step into the stone', async () => {
  const bot = createFakeBot({ scene: 'flat', position: { x: 0.5, y: 55, z: 0.5 } });
  bot.fake.setBlock(new Vec3(0, 55, 0), 'air');
  bot.fake.setBlock(new Vec3(0, 56, 0), 'air'); // a 1x2 pocket in solid stone
  const stone = bot.registry.blocksByName.stone.id;
  assert.equal(safeToDig(bot, new Vec3(1, 55, 0)), true);
  bot.fake.setBlock(new Vec3(2, 55, 0), 'lava');
  assert.equal(safeToDig(bot, new Vec3(1, 55, 0)), false, 'lava behind it');
  bot.fake.setBlock(new Vec3(-1, 57, 0), 'gravel');
  assert.equal(safeToDig(bot, new Vec3(-1, 56, 0)), false, 'gravel would fall');
  bot.fake.setBlock(new Vec3(0, 55, 2), 'water');
  const here = minableHere(bot, [stone]).map((b) => b.position.toString());
  assert.ok(!here.includes('(1, 55, 0)') && !here.includes('(-1, 56, 0)') && !here.includes('(0, 55, 1)'), 'next to lava, under gravel, next to water: left alone');
  assert.ok(!here.includes('(0, 54, 0)'), 'never the floor under the bot');
  assert.ok(here.includes('(0, 55, -1)'));
  const ahead = tunnelAhead(bot, [stone]);
  assert.deepEqual(ahead.feet.toArray(), [0, 55, -1], 'the only safe way in');
  assert.equal(ahead.dig.length, 2);

  // collect in the stone: no walks to find blocks
  const { bot: b2, body } = await setup({ position: { x: 0.5, y: 55, z: 0.5 }, inventory: { wooden_pickaxe: 1 } });
  b2.fake.setBlock(new Vec3(0, 55, 0), 'air');
  b2.fake.setBlock(new Vec3(0, 56, 0), 'air');
  const r = await body.run('collect', { block: 'stone', n: 6 });
  assert.equal(r.ok, true, r.result);
  assert.equal(r.result, 'mined 6 stone');
  assert.deepEqual(r.delta, { cobblestone: 6 });
  assert.equal(called(b2, 'goto').length, 0, 'everything from where it stood');
  assert.ok(called(b2, 'dig').every((c) => c.block === 'stone'));
});

test('stations: the cap never retires a furnace still smelting or holding output, nor the table the skill works at; the craft gets every ingot', async () => {
  const file = tmpFile();
  fs.writeFileSync(file, '');
  const { bot, body } = await setup(
    { inventory: { raw_iron: 6, coal: 8, furnace: 3, crafting_table: 1, cobblestone: 24, stick: 2 }, smeltMsPerItem: 150 },
    { timing: { smeltMs: 150, pollMs: 5 }, console: file, stations: createStationRegistry() },
  );
  const first = await body.run('smelt', { item: 'raw_iron', n: 3 });
  assert.equal(first.ok, true, first.result);
  // all three furnaces busy: the second load crafts three more at the table, and none of the busy ones is removed
  const second = await body.run('smelt', { item: 'raw_iron', n: 3 });
  assert.equal(second.ok, true, second.result);
  assert.doesNotMatch(second.result, /removed your oldest/);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(lines(file), [], 'nothing went through the console');
  assert.equal(body.snapshot().stations.length, 7, 'over the cap while every station is in use');
  const pick = await body.run('craft', { item: 'iron_pickaxe', n: 1 });
  assert.equal(pick.ok, true, pick.result);
  assert.deepEqual(pick.delta, { iron_ingot: 3, iron_pickaxe: 1, stick: -2 }, 'all six ingots came out');
  assert.deepEqual(body.smelting(), {});
  // idle again: the next station retires the oldest down to the cap
  bot.fake.give('furnace', 1);
  const at = bot.entity.position.floored().offset(0, 0, 3);
  const p = await body.run('place', { block: 'furnace', pos: { x: at.x, y: at.y, z: at.z } });
  assert.equal(p.ok, true, p.result);
  assert.match(p.result, /removed your oldest furnace at .* and crafting table at /);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(lines(file).length, 4);
  assert.equal(body.snapshot().stations.length, MAX_PER_BOT);
  // a registry where every station is in use refuses one more past HARD_MAX
  const reg = createStationRegistry();
  for (let i = 0; i < HARD_MAX; i++) reg.add('a', 'furnace', { x: i, y: 64, z: 0 }, { keep: () => true });
  assert.equal(reg.owned('a').length, HARD_MAX);
  assert.equal(reg.room('a', () => true), false);
  assert.equal(reg.room('a', (s) => s.pos.x !== 0), true, 'one idle station can go');
});

test('collect: the drops a reflex interrupted are swept up after it, and counted against all mined', async () => {
  const { bot, body } = await setup({ groundDrops: true, digMs: 60, moveMsPerBlock: 5, inventory: { stone_pickaxe: 1, stone_sword: 1 } });
  for (const x of [8, 10, 12, -8, -10, -12]) bot.fake.setBlock(new Vec3(x, 64, 0), 'iron_ore');
  const c = body.run('collect', { block: 'iron_ore', n: 6 });
  for (let i = 0; i < 100 && bot.fake.lying().length < 2; i++) await new Promise((r) => setTimeout(r, 10));
  assert.ok(bot.fake.lying().length >= 2, 'drops lie where the first try mined');
  const zombie = bot.fake.spawnMob('zombie', bot.entity.position.offset(2, 0, 0));
  bot.fake.hurt(4, zombie);
  const r = await c;
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /^mined 6 iron_ore \[on its own: fought back a zombie and killed it/);
  assert.equal(r.delta.raw_iron, 6, 'the drops from before the fight too');
  assert.deepEqual(bot.fake.lying(), []);
});

test('collect: blocks that drop by chance (gravel) are swept up too; a block another bot takes first is not counted', async () => {
  const { bot, body } = await setup({ groundDrops: true, moveMsPerBlock: 5, dropAs: { gravel: 'flint' } });
  for (const x of [3, 5, 7, 9, 11, 13]) bot.fake.setBlock(new Vec3(x, 64, 2), 'gravel');
  const r = await body.run('collect', { block: 'gravel', n: 6 });
  assert.equal(r.ok, true, r.result);
  assert.equal(r.result, 'mined 6 gravel');
  assert.deepEqual(r.delta, { flint: 6 });
  assert.deepEqual(bot.fake.lying(), []);

  // the far ore goes (another bot mined it) while this bot walks to it: the walk ends at once, and it is not counted
  const { bot: b2, body: other } = await setup({ moveMsPerBlock: 20, inventory: { stone_pickaxe: 1 } });
  const near = new Vec3(2, 64, 0);
  const far = new Vec3(16, 64, 0);
  b2.fake.setBlock(near, 'iron_ore');
  b2.fake.setBlock(far, 'iron_ore');
  b2.on('blockUpdate', (old, now) => {
    if (now.position.equals(near) && now.name === 'air') setTimeout(() => b2.fake.setBlock(far, 'air'), 60);
  });
  const t0 = Date.now();
  const s = await other.run('collect', { block: 'iron_ore', n: 2 });
  assert.equal(s.ok, false, s.result);
  assert.match(s.result, /^mined 1 of 2 iron_ore: no more iron_ore within 32 blocks that you can reach/);
  assert.deepEqual(s.delta, { raw_iron: 1 });
  assert.ok(Date.now() - t0 < 1_500, 'no long walk toward a block that is gone');
});

test('speed: digs, placements and opened blocks turn the head at once (the server needs no turn)', async () => {
  const { bot, body } = await setup({ scene: 'forest', inventory: { oak_planks: 8, stick: 2, raw_iron: 1, coal: 1, furnace: 1 } });
  assert.equal((await body.run('collect', { block: 'oak_log', n: 2 })).ok, true);
  assert.equal((await body.run('craft', { item: 'wooden_pickaxe', n: 1 })).ok, true);
  assert.equal((await body.run('smelt', { item: 'raw_iron', n: 1 })).ok, true);
  assert.ok(called(bot, 'dig').length >= 2 && called(bot, 'dig').every((c) => c.forceLook), 'every dig with a forced look');
  // each placement (the table, the furnace) and each furnace opened comes right after a forced look
  const calls = bot.fake.calls;
  for (const fn of ['placeBlock', 'openFurnace']) {
    const idx = calls.map((c, i) => (c.fn === fn ? i : -1)).filter((i) => i >= 0);
    assert.ok(idx.length, fn);
    for (const i of idx) assert.ok(calls.slice(Math.max(0, i - 3), i).some((c) => c.fn === 'lookAt' && c.force), `${fn} at ${i} faced first`);
  }
});

test('smelt: a craft that needs output from furnaces too far away says where it is', async () => {
  const { body } = await setup({ inventory: { raw_iron: 3, coal: 3, furnace: 3, stick: 2, crafting_table: 1 }, smeltMsPerItem: 40 }, { timing: { smeltMs: 40, pollMs: 5 } });
  assert.equal((await body.run('smelt', { item: 'raw_iron', n: 3 })).ok, true);
  assert.equal((await body.run('go_to', { x: 50, y: 64, z: 0 })).ok, true);
  await new Promise((r) => setTimeout(r, 200));
  const r = await body.run('craft', { item: 'iron_pickaxe', n: 1 });
  assert.equal(r.ok, false);
  assert.match(r.result, /^not enough ingredients for iron_pickaxe: missing 3 iron_ingot \(1 iron_ingot is still in your furnace at -?\d+ 64 -?\d+, \d+ blocks away \(too far to fetch: go_to there first\); 1 iron_ingot is still/);
});
