// test/fake-bot.test.js - the fake bot behaves like the mineflayer calls the body makes: find and dig with real drops
// and harvest rules, craft through recipesFor with and without a table, smelt with fuel, place, eat, fight, walk, stop.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBot } from './fake-bot.js';
import { Vec3 } from '../src/mc.js';

const id = (bot, name) => bot.registry.itemsByName[name].id;

test('fake bot: wood to a wooden pickaxe through the mineflayer API', async () => {
  const bot = createFakeBot({ scene: 'forest' });
  await new Promise((r) => bot.once('spawn', r));
  const logs = bot.findBlocks({ matching: bot.registry.blocksByName.oak_log.id, maxDistance: 32, count: 4 });
  assert.equal(logs.length, 4);
  await bot.collectBlock.collect(logs.map((p) => bot.blockAt(p)));
  assert.equal(bot.fake.counts().oak_log, 4);

  const [planks] = bot.recipesFor(id(bot, 'oak_planks'), null, 1, null);
  await bot.craft(planks, 3, null);
  assert.equal(bot.fake.counts().oak_planks, 12);
  await bot.craft(bot.recipesFor(id(bot, 'crafting_table'), null, 1, null)[0], 1, null);
  await bot.craft(bot.recipesFor(id(bot, 'stick'), null, 1, null)[0], 1, null);

  const pick = id(bot, 'wooden_pickaxe');
  assert.equal(bot.recipesFor(pick, null, 1, null).length, 0, 'needs a table');
  bot.fake.moveTo({ x: 0.5, y: 64, z: 0.5 });
  const tableItem = bot.inventory.items().find((i) => i.name === 'crafting_table');
  await bot.equip(tableItem, 'hand');
  const feet = bot.entity.position.floored();
  await bot.placeBlock(bot.blockAt(feet.offset(1, -1, 0)), new Vec3(0, 1, 0));
  const table = bot.findBlock({ matching: bot.registry.blocksByName.crafting_table.id });
  assert.ok(table);
  const [recipe] = bot.recipesFor(pick, null, 1, table);
  await assert.rejects(bot.craft(recipe, 1, null), /requires craftingTable/);
  await bot.craft(recipe, 1, table);
  assert.equal(bot.fake.counts().wooden_pickaxe, 1);
});

test('fake bot: harvest rules, smelting, eating, combat, chat', async () => {
  const bot = createFakeBot({ scene: 'forest', inventory: { wooden_pickaxe: 1, stone_pickaxe: 1, coal: 2, furnace: 1, bread: 1, stone_sword: 1 } });
  const iron = bot.findBlock({ matching: bot.registry.blocksByName.iron_ore.id, maxDistance: 32 });
  await bot.pathfinder.goto({ x: iron.position.x, y: iron.position.y + 1, z: iron.position.z });
  await bot.equip(bot.inventory.items().find((i) => i.name === 'wooden_pickaxe'), 'hand');
  await bot.dig(iron);
  assert.equal(bot.fake.counts().raw_iron, undefined, 'a wooden pickaxe gets nothing from iron ore');
  const iron2 = bot.findBlock({ matching: bot.registry.blocksByName.iron_ore.id, maxDistance: 32 });
  await bot.tool.equipForBlock(iron2);
  assert.equal(bot.heldItem.name, 'stone_pickaxe');
  await bot.dig(iron2);
  assert.equal(bot.fake.counts().raw_iron, 1);

  bot.fake.setBlock(bot.entity.position.floored().offset(1, 0, 0), 'furnace');
  const furnaceBlock = bot.findBlock({ matching: bot.registry.blocksByName.furnace.id });
  const furnace = await bot.openFurnace(furnaceBlock);
  await furnace.putFuel(id(bot, 'coal'), null, 1);
  await furnace.putInput(id(bot, 'raw_iron'), null, 1);
  assert.equal(furnace.outputItem().name, 'iron_ingot');
  await furnace.takeOutput();
  furnace.close();
  assert.equal(bot.fake.counts().iron_ingot, 1);

  await bot.equip(bot.inventory.items().find((i) => i.name === 'bread'), 'hand');
  await assert.rejects(bot.consume(), /Food is full/);
  bot.fake.setFood(10);
  await bot.consume();
  assert.equal(bot.food, 15);

  const cow = bot.nearestEntity((e) => e.name === 'cow');
  await bot.pathfinder.goto({ x: cow.position.x, y: cow.position.y, z: cow.position.z + 1 });
  await bot.equip(bot.inventory.items().find((i) => i.name === 'stone_sword'), 'hand');
  bot.attack(cow);
  bot.attack(cow);
  assert.equal(cow.isValid, false);
  assert.equal(bot.fake.counts().beef, 1);

  bot.chat('hello');
  assert.deepEqual(bot.fake.chat, [{ message: 'hello', command: false }]);
});

test('fake bot: pathfinder stop and unreachable goals reject like mineflayer-pathfinder', async () => {
  const bot = createFakeBot({ moveMsPerBlock: 50 });
  const walk = bot.pathfinder.goto({ x: 20, y: 64, z: 0 });
  setTimeout(() => bot.pathfinder.stop(), 20);
  await assert.rejects(walk, (e) => e.name === 'PathStopped');
  bot.fake.unreachable = () => true;
  await assert.rejects(bot.pathfinder.goto({ x: 5, y: 64, z: 5 }), (e) => e.name === 'NoPath');
  assert.ok(bot.fake.calls.some((c) => c.fn === 'pathfinder.stop'));
});
