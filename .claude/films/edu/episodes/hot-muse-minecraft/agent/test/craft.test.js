// test/craft.test.js - crafting through window clicks against the fake bot's server-side window model (clickServer):
// a laggy server, other woods, many batches at once, leftovers in the grid, a full inventory, a server that never
// answers, a table that never opens, and a stop in the middle. No Minecraft server, no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBot } from './fake-bot.js';
import { createBody } from '../src/body.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { gridOf } from '../src/skills/craft.js';
import { planPut } from '../src/skills/window.js';
import { Vec3, requireMc, registryFor } from '../src/mc.js';

const config = loadConfig({});
const registry = registryFor('1.21.4');
const Item = requireMc('prismarine-item')(registry);
const windows = requireMc('prismarine-windows')(registry);

async function setup(botOpts = {}, bodyOpts = {}) {
  const bot = createFakeBot({ scene: 'flat', clickServer: { lagMs: 5 }, ...botOpts });
  const body = createBody({ bot, config, log: createLogger({ dir: null, config }), ...bodyOpts });
  await body.ready;
  return { bot, body };
}
const called = (bot, fn) => bot.fake.calls.filter((c) => c.fn === fn);

test('gridOf and planPut: shaped recipes land in the right slots; a stack is picked up once and the rest goes back', () => {
  const id = (n) => registry.itemsByName[n].id;
  const pick = registry.recipes[id('wooden_pickaxe')].find((r) => r.inShape[0][0] === id('oak_planks'));
  const recipe = { inShape: pick.inShape.map((row) => row.map((v) => ({ id: v ?? -1 }))), result: pick.result };
  assert.deepEqual([...gridOf(recipe, 3)], [[id('oak_planks'), [1, 2, 3]], [id('stick'), [5, 8]]]);
  assert.equal(gridOf(recipe, 2), null, 'a 3x3 recipe does not fit the 2x2 grid');

  const win = windows.createWindow(1, 'minecraft:crafting', 'Crafting');
  win.updateSlot(12, new Item(id('oak_planks'), 2));
  win.updateSlot(20, new Item(id('oak_planks'), 10));
  assert.deepEqual(planPut(win, id('oak_planks'), [1, 2, 3], 4), [
    [20, 0, 0], [1, 1, 0], [1, 1, 0], [1, 1, 0], [1, 1, 0], [2, 1, 0], [2, 1, 0], [2, 1, 0], [2, 1, 0], [3, 0, 0],
    [12, 0, 0], [3, 0, 0], // the last 2 held all go to slot 3: one left click
  ]);
  assert.equal(planPut(win, id('oak_planks'), [1, 2, 3], 5), null, '15 needed, 12 held');
});

test('craft by clicks on a laggy server: birch logs to a wooden pickaxe at a table it places, exact deltas', async () => {
  const { bot, body } = await setup({ inventory: { birch_log: 4 } });
  const planks = await body.run('craft', { item: 'birch_planks', n: 16 });
  assert.equal(planks.ok, true, planks.result);
  assert.deepEqual(planks.delta, { birch_log: -4, birch_planks: 16 });
  assert.deepEqual((await body.run('craft', { item: 'stick', n: 8 })).delta, { birch_planks: -4, stick: 8 });
  assert.deepEqual((await body.run('craft', { item: 'crafting_table', n: 1 })).delta, { birch_planks: -4, crafting_table: 1 });

  const pick = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(pick.ok, true, pick.result);
  assert.match(pick.result, /^crafted 1 wooden_pickaxe \(placed a crafting table and took it back\)$/);
  assert.deepEqual(pick.delta, { birch_planks: -3, stick: -2, wooden_pickaxe: 1 });
  assert.deepEqual(body.inventory(), { birch_planks: 5, stick: 6, crafting_table: 1, wooden_pickaxe: 1 });
  assert.equal(bot.currentWindow, null, 'the table window is closed');
  assert.equal(called(bot, 'craft').length, 0, "mineflayer's craft() is never used");
  assert.ok(called(bot, 'packet.window_click').length > 10);
  assert.ok(bot.inventory.slots.slice(0, 5).every((s) => !s), 'nothing left in the 2x2 grid');
});

test('craft by clicks: many batches in one go, mixed woods, a nearby table reused', async () => {
  const { bot, body } = await setup({ inventory: { spruce_planks: 40, birch_planks: 3, stick: 2, cobblestone: 9 } });
  const sticks = await body.run('craft', { item: 'stick', n: 64 });
  assert.equal(sticks.ok, true, sticks.result);
  assert.deepEqual(sticks.delta, { spruce_planks: -32, stick: 64 }, '16 batches in one shift-click');
  const more = await body.run('craft', { item: 'stick', n: 40 });
  assert.equal(more.ok, false);
  assert.match(more.result, /^crafted 16 of 40 stick; for the rest you are missing \d+ (spruce|birch)_planks$/);

  bot.fake.setBlock(new Vec3(3, 64, 0), 'crafting_table');
  const stone = await body.run('craft', { item: 'stone_pickaxe', n: 3 });
  assert.equal(stone.ok, true, stone.result);
  assert.deepEqual(stone.delta, { stick: -6, cobblestone: -9, stone_pickaxe: 3 });
  assert.equal(called(bot, 'placeBlock').length, 0, 'used the table that was there');
});

test('craft by clicks: leftovers in the grid go back first; a full inventory is reported, nothing is lost', async () => {
  const { bot, body } = await setup({ inventory: { oak_planks: 2 } });
  bot.inventory.updateSlot(1, new Item(registry.itemsByName.stick.id, 3)); // left in the 2x2 grid by someone
  const r = await body.run('craft', { item: 'stick', n: 4 });
  assert.equal(r.ok, true, r.result);
  assert.deepEqual(body.inventory(), { stick: 7 });

  const { body: full } = await setup({ inventory: { oak_log: 2, dirt: 35 * 64 } });
  const f = await full.run('craft', { item: 'oak_planks', n: 4 });
  assert.equal(f.ok, false);
  assert.match(f.result, /^crafting oak_planks failed: your inventory is full$/);
  assert.deepEqual(f.delta, {});
});

test('craft by clicks: a server that never answers or a table that never opens ends the craft quickly', async () => {
  const { body } = await setup({ inventory: { oak_planks: 4 }, clickServer: { deaf: true } }, { timing: { windowMs: 150 } });
  const t0 = Date.now();
  const r = await body.run('craft', { item: 'stick', n: 4 });
  assert.equal(r.ok, false);
  assert.match(r.result, /^crafting stick failed: the server did not answer the clicks in time$/);
  assert.ok(Date.now() - t0 < 2_000);

  const { bot, body: shut } = await setup({ inventory: { oak_planks: 3, stick: 2 }, clickServer: { noOpen: true } }, { timing: { openMs: 100 } });
  bot.fake.setBlock(new Vec3(2, 64, 0), 'crafting_table');
  const s = await shut.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(s.ok, false);
  assert.match(s.result, /^crafting wooden_pickaxe failed: the crafting table did not open \(no answer from the server within 0.1 s\)$/);
  assert.equal(called(bot, 'activateBlock').length, 2, 'tried twice');
});

test('craft by clicks: a stop in the middle closes the table window', async () => {
  const { bot, body } = await setup({ inventory: { oak_planks: 3, stick: 2 }, clickServer: { lagMs: 100 } });
  bot.fake.setBlock(new Vec3(2, 64, 0), 'crafting_table');
  const crafting = body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  for (let i = 0; i < 100 && !bot.currentWindow; i++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(bot.currentWindow, 'the window is open');
  await body.stop('test');
  const r = await crafting;
  assert.equal(r.result, 'stopped: test');
  assert.equal(bot.currentWindow, null);
});

test('a crafting table or furnace nearby that cannot be reached: the one carried is put down instead', async () => {
  const { bot, body } = await setup({ inventory: { oak_planks: 3, stick: 2, crafting_table: 1, raw_iron: 1, coal: 1, furnace: 1 } });
  bot.fake.setBlock(new Vec3(20, 64, 0), 'crafting_table');
  bot.fake.setBlock(new Vec3(-20, 64, 0), 'furnace');
  bot.fake.unreachable = (dest) => Math.abs(dest.x) >= 15; // both behind a wall
  const pick = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(pick.ok, true, pick.result);
  assert.match(pick.result, /^crafted 1 wooden_pickaxe \(placed a crafting table and took it back\)$/);
  const iron = await body.run('smelt', { item: 'raw_iron', n: 1 });
  assert.equal(iron.ok, true, iron.result);
  assert.match(iron.result, /\(placed a furnace and took it back\)$/);
  assert.deepEqual(body.inventory(), { crafting_table: 1, wooden_pickaxe: 1, furnace: 1, iron_ingot: 1 });
});

test('in a tunnel with no air beside the bot, a spot is dug out of the wall for the table', async () => {
  const { bot, body } = await setup({ position: { x: 0.5, y: 55, z: 0.5 }, inventory: { oak_planks: 3, stick: 2, crafting_table: 1 } });
  bot.fake.setBlock(new Vec3(0, 55, 0), 'air');
  bot.fake.setBlock(new Vec3(0, 56, 0), 'air'); // a 1x2 pocket in solid stone
  const r = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /^crafted 1 wooden_pickaxe \(placed a crafting table and took it back\)$/);
  assert.ok(called(bot, 'dig').some((c) => c.block === 'stone'), 'dug a spot');
  assert.deepEqual(body.inventory(), { crafting_table: 1, wooden_pickaxe: 1 });
});
