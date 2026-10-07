// test/body.test.js - the body on the fake bot: argument checks, the 10 skills (wood to a wooden pickaxe, harvest
// rules, smelting, placing, building, fighting, eating, chat), one skill at a time, timeouts, the stop switch and the
// events. No Minecraft server, no network.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBot } from './fake-bot.js';
import { createBody } from '../src/body.js';
import { layout } from '../src/skills/build.js';
import { SKILLS } from '../src/skills/index.js';
import { TOOL_NAMES } from '../src/contracts.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { Vec3 } from '../src/mc.js';
import { blueprintBlockCount } from '../src/game.js';

const config = loadConfig({});

async function setup(botOpts = {}, bodyOpts = {}) {
  const bot = createFakeBot(botOpts);
  const log = createLogger({ dir: null, config });
  const body = createBody({ bot, config, log, ...bodyOpts });
  await body.ready;
  return { bot, body, log };
}

const nameAt = (bot, x, y, z) => bot.blockAt(new Vec3(x, y, z)).name;
const called = (bot, fn) => bot.fake.calls.filter((c) => c.fn === fn);

test('skills: exactly one skill per tool', () => {
  assert.deepEqual(Object.keys(SKILLS).sort(), [...TOOL_NAMES].sort());
});

test('run: bad arguments resolve ok:false and never reach the game', async () => {
  const { bot, body } = await setup({ scene: 'forest' });
  const cases = [
    ['dig_down', {}, /unknown tool/],
    ['collect', { block: 'oak_log', n: 0 }, /from 1 to 64/],
    ['collect', { block: 'bedrock', n: 1 }, /not allowed/],
    ['collect', { block: 'oak_log', n: 1, fast: true }, /fast is not allowed/],
    ['go_to', { x: 1, y: 64 }, /z is required/],
    ['say', { text: '/op Muse' }, /form that is not allowed/],
    ['say', { text: 'hi\nthere' }, /control characters/],
    ['attack', { target: 'player' }, /not allowed/],
    ['craft', 'oak_planks', /must be an object/],
  ];
  for (const [tool, args, error] of cases) {
    const r = await body.run(tool, args);
    assert.equal(r.ok, false, tool);
    assert.match(r.result, error);
    assert.deepEqual(r.delta, {});
  }
  // a leading space before a command, and the section sign the server kicks for, fail the schema...
  for (const text of [' /op Muse', 'hi \u00a7k there', '\u00a7aRed']) {
    const r = await body.run('say', { text });
    assert.equal(r.ok, false, text);
    assert.match(r.result, /form that is not allowed/);
  }
  // ...and the skill checks again, should a schema ever let them through
  assert.match((await SKILLS.say({ bot }, { text: ' /op Muse' })).result, /cannot be commands/);
  assert.match((await SKILLS.say({ bot }, { text: 'hi \u00a7k' })).result, /cannot contain/);
  assert.deepEqual(bot.fake.chat, []);
  assert.equal(called(bot, 'dig').length + called(bot, 'goto').length, 0);
  const st = await body.run('get_state', null);
  assert.equal(st.ok, true);
  assert.match(st.result, /^health 20\/20/);
});

test('wood to a wooden pickaxe: collect, craft, a crafting table placed and taken back', async () => {
  const { bot, body } = await setup({ scene: 'forest' });
  body.setGoal('make a wooden pickaxe');

  const logs = await body.run('collect', { block: 'oak_log', n: 3 });
  assert.equal(logs.ok, true, logs.result);
  assert.deepEqual(logs.delta, { oak_log: 3 });
  assert.ok(logs.ms >= 0);

  const planks = await body.run('craft', { item: 'oak_planks', n: 10 });
  assert.equal(planks.ok, true, planks.result);
  assert.deepEqual(planks.delta, { oak_log: -3, oak_planks: 12 }, 'rounded up to whole batches');
  assert.equal((await body.run('craft', { item: 'crafting_table', n: 1 })).ok, true);
  assert.deepEqual((await body.run('craft', { item: 'stick', n: 4 })).delta, { oak_planks: -2, stick: 4 });
  assert.equal((await body.run('go_to', { x: 0, y: 64, z: 0 })).ok, true);

  const pick = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(pick.ok, true, pick.result);
  assert.match(pick.result, /crafted 1 wooden_pickaxe \(placed a crafting table and took it back\)/);
  assert.deepEqual(pick.delta, { oak_planks: -3, stick: -2, wooden_pickaxe: 1 });
  assert.equal(called(bot, 'placeBlock')[0].block, 'crafting_table');
  assert.ok(called(bot, 'craft').some((c) => c.item === 'wooden_pickaxe' && c.table));
  assert.ok(called(bot, 'dig').some((c) => c.block === 'crafting_table'));
  assert.equal(bot.findBlock({ matching: bot.registry.blocksByName.crafting_table.id, maxDistance: 32 }), null);
  assert.deepEqual(body.inventory(), { oak_planks: 3, crafting_table: 1, stick: 2, wooden_pickaxe: 1 });
  const s = body.state();
  assert.match(s, /^goal: make a wooden pickaxe$/m);
  assert.match(s, /^last result: craft wooden_pickaxe 1 -> ok: crafted 1 wooden_pickaxe .*\(inventory: .*wooden_pickaxe \+1\)$/m);
});

test('craft: uses a table nearby, explains what is missing, partial batches', async () => {
  const { bot, body } = await setup({ scene: 'flat' });
  const none = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(none.ok, false);
  assert.match(none.result, /missing 3 oak_planks, 2 stick/);
  const stone = await body.run('craft', { item: 'stone_pickaxe', n: 1 });
  assert.match(stone.result, /missing 3 cobblestone, 2 stick/);

  bot.fake.give('oak_planks', 5);
  bot.fake.give('stick', 2);
  const noTable = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(noTable.ok, false);
  assert.match(noTable.result, /needs a crafting table: none within 32 blocks and none in your inventory/);

  bot.fake.setBlock(new Vec3(12, 64, 12), 'crafting_table');
  const near = await body.run('craft', { item: 'wooden_pickaxe', n: 1 });
  assert.equal(near.ok, true, near.result);
  assert.equal(called(bot, 'placeBlock').length, 0, 'used the table that was there');
  assert.ok(bot.entity.position.distanceTo(new Vec3(12.5, 64, 12.5)) < 3, 'walked to the table');

  const partial = await body.run('craft', { item: 'stick', n: 12 });
  assert.equal(partial.ok, false);
  assert.match(partial.result, /crafted 4 of 12 stick; for the rest you are missing 4 oak_planks/);
  assert.deepEqual(partial.delta, { oak_planks: -2, stick: 4 });
});

test('collect: harvest tools first, deepslate twins count, unreachable and exhausted blocks', async () => {
  const { bot, body } = await setup({ scene: 'forest', inventory: { wooden_pickaxe: 1 } });
  const noTool = await body.run('collect', { block: 'iron_ore', n: 1 });
  assert.equal(noTool.ok, false);
  assert.match(noTool.result, /iron_ore drops nothing without the right tool: you need one of stone_pickaxe, iron_pickaxe/);
  assert.equal(called(bot, 'dig').length, 0, 'did not waste time digging');

  bot.fake.give('stone_pickaxe', 1);
  bot.fake.setBlock(new Vec3(-9, 62, -9), 'deepslate_iron_ore');
  const iron = await body.run('collect', { block: 'iron_ore', n: 4 });
  assert.equal(iron.ok, true, iron.result);
  assert.deepEqual(iron.delta, { raw_iron: 4 });

  const stone = await body.run('collect', { block: 'stone', n: 2 });
  assert.deepEqual(stone.delta, { cobblestone: 2 }, 'stone drops cobblestone');
  const noIron = await body.run('collect', { block: 'iron_ore', n: 64 });
  assert.equal(noIron.ok, false);
  assert.match(noIron.result, /no more iron_ore within 32 blocks; ores lie underground: go_to a spot about 10 blocks lower \(it digs down\), then collect again$/);

  const tooMany = await body.run('collect', { block: 'oak_log', n: 20 });
  assert.equal(tooMany.ok, false);
  assert.match(tooMany.result, /^mined 12 of 20 oak_log: no more oak_log within 32 blocks$/);
  assert.equal(tooMany.delta.oak_log, 12);

  const { bot: bot2, body: body2 } = await setup({ scene: 'forest' });
  bot2.fake.moveTo({ x: 20.5, y: 64, z: 20.5 }); // every tree out of reach, all within the 32-block search
  bot2.fake.unreachable = () => true;
  const blocked = await body2.run('collect', { block: 'oak_log', n: 2 });
  assert.equal(blocked.ok, false);
  assert.match(blocked.result, /mined 0 of 2 oak_log: gave up after 5 blocks it could not mine, last: no path found/);
});

test('smelt: places a furnace, burns the cheapest fuel, takes everything back', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { raw_iron: 3, coal: 2, oak_planks: 4, furnace: 1, wooden_pickaxe: 1 } });
  const r = await body.run('smelt', { item: 'raw_iron', n: 3 });
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /smelted 3 raw_iron into 3 iron_ingot, burning coal \(placed a furnace and took it back\)/);
  assert.deepEqual(r.delta, { raw_iron: -3, coal: -1, iron_ingot: 3 });
  assert.deepEqual(called(bot, 'furnace.fuel').map((c) => [c.item, c.count]), [['coal', 1]]);
  assert.equal(called(bot, 'furnace.close').length, 1);

  const none = await body.run('smelt', { item: 'raw_copper', n: 1 });
  assert.match(none.result, /you have no raw_copper/);

  const { body: noFuel } = await setup({ scene: 'flat', inventory: { oak_log: 3, furnace: 1 } });
  const nf = await noFuel.run('smelt', { item: 'oak_log', n: 2 });
  assert.equal(nf.ok, false);
  assert.match(nf.result, /no fuel/, 'never burns the input itself');

  const { body: noFurnace } = await setup({ scene: 'flat', inventory: { raw_iron: 1, coal: 1 } });
  assert.match((await noFurnace.run('smelt', { item: 'raw_iron', n: 1 })).result, /no furnace within 32 blocks and none in your inventory/);
});

test('smelt: waits on a slow furnace that is already there, fuel limits the batch', async () => {
  const { bot, body } = await setup(
    { scene: 'flat', inventory: { cobblestone: 5, oak_planks: 2 }, smeltMsPerItem: 15 },
    { timing: { pollMs: 5, stallMs: 2_000 } },
  );
  bot.fake.setBlock(new Vec3(5, 64, 5), 'furnace');
  const r = await body.run('smelt', { item: 'cobblestone', n: 5 });
  assert.equal(r.ok, false, 'two planks cover three items');
  assert.match(r.result, /smelted 3 cobblestone into 3 stone, burning oak_planks, not 5: fuel ran short/);
  assert.deepEqual(r.delta, { cobblestone: -3, oak_planks: -2, stone: 3 });
  assert.equal(nameAt(bot, 5, 64, 5), 'furnace', 'a furnace it did not place stays');
});

test('place: exact position, occupied, unsupported, walks into reach, steps aside', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { cobblestone: 5 } });
  const ok = await body.run('place', { block: 'cobblestone', pos: { x: 2, y: 64, z: 0 } });
  assert.equal(ok.ok, true, ok.result);
  assert.equal(nameAt(bot, 2, 64, 0), 'cobblestone');
  assert.deepEqual(ok.delta, { cobblestone: -1 });

  assert.match((await body.run('place', { block: 'cobblestone', pos: { x: 2, y: 64, z: 0 } })).result, /already holds cobblestone/);
  assert.match((await body.run('place', { block: 'cobblestone', pos: { x: 0, y: 70, z: 0 } })).result, /nothing solid next to 0 70 0/);
  assert.match((await body.run('place', { block: 'dirt', pos: { x: 1, y: 64, z: 1 } })).result, /you have no dirt/);
  assert.match((await body.run('place', { block: 'cobblestone', pos: { x: 900, y: 64, z: 0 } })).result, /place works within 256/);

  const far = await body.run('place', { block: 'cobblestone', pos: { x: 15, y: 64, z: 10 } });
  assert.equal(far.ok, true, far.result);
  assert.equal(nameAt(bot, 15, 64, 10), 'cobblestone');
  assert.ok(called(bot, 'goto').length >= 1, 'walked there');

  const feet = bot.entity.position.floored();
  const under = await body.run('place', { block: 'cobblestone', pos: { x: feet.x, y: feet.y, z: feet.z } });
  assert.equal(under.ok, true, under.result);
  assert.ok(!bot.entity.position.floored().equals(feet), 'stepped aside first');
});

test('build: a 3x3 hut in front of the bot', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { oak_planks: 30 } });
  const { cells, facing } = layout('hut_3x3', new Vec3(0, 64, 0), 0);
  assert.equal(facing, 'north');
  assert.equal(cells.filter((c) => c.kind === '#').length, 23);
  bot.fake.setBlock(new Vec3(0, 64, -1), 'dirt'); // a bump where the door must be
  const r = await body.run('build', { blueprint: 'hut_3x3', material: 'oak_planks' });
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /built hut_3x3 in front of you \(facing north\): placed 23 oak_planks/);
  assert.equal(r.delta.oak_planks, -23);
  for (const c of cells) {
    const name = nameAt(bot, c.pos.x, c.pos.y, c.pos.z);
    if (c.kind === '#') assert.equal(name, 'oak_planks', `wall at ${c.pos}`);
    else assert.equal(name, 'air', `open at ${c.pos}`);
  }
  assert.equal(nameAt(bot, 0, 66, -3), 'oak_planks', 'back of the roof');
  assert.equal(nameAt(bot, 0, 64, -1), 'air', 'the bump in the door was dug out');
  assert.deepEqual(bot.entity.position.floored().toArray(), [0, 64, 0], 'built from where it stood');

  const { body: poor } = await setup({ scene: 'flat', inventory: { oak_planks: 10 } });
  const short = await poor.run('build', { blueprint: 'hut_3x3', material: 'oak_planks' });
  assert.equal(short.ok, false);
  assert.match(short.result, /hut_3x3 needs 23 oak_planks here \(23 for the whole blueprint\); you have 10/);
});

test('build: the shelter closes around the bot, its roof placed against the capped back wall', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { cobblestone: 12 } });
  assert.equal(blueprintBlockCount('shelter'), 10);
  const r = await body.run('build', { blueprint: 'shelter', material: 'cobblestone' });
  assert.equal(r.ok, true, r.result);
  assert.equal(r.result, 'built shelter around you: placed 10 cobblestone', 'no extra support block needed');
  assert.deepEqual(r.delta, { cobblestone: -10 });
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    assert.equal(nameAt(bot, x, 64, z), 'cobblestone');
    assert.equal(nameAt(bot, x, 65, z), 'cobblestone');
  }
  assert.equal(nameAt(bot, 0, 66, 0), 'cobblestone', 'roof');
  assert.equal(nameAt(bot, 0, 64, 0), 'air');
  assert.equal(nameAt(bot, 0, 65, 0), 'air');
  assert.equal(called(bot, 'goto').length, 0, 'never left the spot');
});

test('attack: best weapon, kill and loot; never players; nothing in range', async () => {
  const { bot, body } = await setup({ scene: 'forest', inventory: { wooden_sword: 1, stone_sword: 1 } });
  const cow = await body.run('attack', { target: 'cow' });
  assert.equal(cow.ok, true, cow.result);
  assert.equal(cow.result, 'killed the cow in 2 swings');
  assert.deepEqual(cow.delta, { beef: 1, leather: 1 });
  assert.ok(called(bot, 'equip').some((c) => c.item === 'stone_sword'));

  assert.match((await body.run('attack', { target: 'nearest_hostile' })).result, /no hostile mob within 16 blocks/);

  bot.entities[900] = { id: 900, name: 'player', type: 'player', username: 'Steve', position: bot.entity.position.offset(1, 0, 0), isValid: true, health: 20 };
  assert.equal((await body.run('attack', { target: 'nearest_hostile' })).ok, false);
  assert.ok(!called(bot, 'attack').some((c) => c.target === 'player'), 'a player is never hit');

  bot.fake.spawnMob('zombie', bot.entity.position.offset(2, 0, 0));
  const z = await body.run('attack', { target: 'nearest_hostile' });
  assert.equal(z.ok, true, z.result);
  assert.match(z.result, /killed the zombie/);
  assert.equal(bot.entities[900].isValid, true);
});

test('eat: only when hungry, best safe food first', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { bread: 1, rotten_flesh: 2, cooked_beef: 1 } });
  assert.match((await body.run('eat', {})).result, /not hungry: food is 20\/20/);
  bot.fake.setFood(10);
  const r = await body.run('eat', {});
  assert.equal(r.ok, true, r.result);
  assert.equal(r.result, 'ate cooked_beef: food 10 -> 18');
  assert.deepEqual(r.delta, { cooked_beef: -1 });

  const { bot: b2, body: hungry } = await setup({ scene: 'flat', inventory: { rotten_flesh: 2 }, food: 6 });
  const bad = await hungry.run('eat', {});
  assert.equal(bad.ok, false);
  assert.match(bad.result, /no safe food \(you only carry rotten_flesh\)/);
  assert.equal(b2.food, 6);
});

test('say: one chat line', async () => {
  const { bot, body } = await setup();
  const r = await body.run('say', { text: 'Hello from the bot' });
  assert.equal(r.ok, true);
  assert.deepEqual(bot.fake.chat, [{ message: 'Hello from the bot', command: false }]);
});

test('go_to: arrives, refuses far targets, reports no path', async () => {
  const { bot, body } = await setup({ scene: 'flat' });
  const r = await body.run('go_to', { x: 20, y: 64, z: -5 });
  assert.equal(r.ok, true, r.result);
  assert.deepEqual(bot.entity.position.floored().toArray(), [20, 64, -5]);
  assert.match((await body.run('go_to', { x: 900, y: 64, z: 0 })).result, /blocks away; go_to is limited to 256/);
  bot.fake.unreachable = () => true;
  const blocked = await body.run('go_to', { x: 0, y: 64, z: 0 });
  assert.equal(blocked.ok, false);
  assert.match(blocked.result, /^could not reach 0 64 0: no path found \(now at 20 64 -5, 21 blocks short\)$/);
  bot.fake.unreachable = null;
  // a long trip goes in hops; a deep target in steps down
  bot.fake.moveTo({ x: 0.5, y: 64, z: 0.5 });
  const hops = await body.run('go_to', { x: 150, y: 64, z: 0 });
  assert.equal(hops.ok, true, hops.result);
  const legs = called(bot, 'goto').slice(-5).map((c) => c.to);
  assert.ok(legs.length >= 3 && legs[0] !== legs.at(-1), `several legs: ${legs.join(' | ')}`);
  const n0 = called(bot, 'goto').length;
  const down = await body.run('go_to', { x: 150, y: 50, z: 0 });
  assert.equal(down.ok, true, down.result);
  // a spiral staircase in the 2x2 column at the target: one block down per step, never a straight shaft
  const steps = called(bot, 'goto').slice(n0, -1).map((c) => c.to.replace(/[()]/g, '').split(', ').map(Number));
  assert.deepEqual(steps.map(([, y]) => y), [63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50]);
  assert.ok(steps.every(([sx, , sz]) => (sx === 150 || sx === 151) && (sz === 0 || sz === 1)), 'within the 2x2 column');
  assert.ok(steps.every(([sx, , sz], k) => k === 0 || sx !== steps[k - 1][0] || sz !== steps[k - 1][2]), 'each step moves sideways');
});

test('one skill at a time; stop() cancels it and the bot stays connected', async () => {
  const { bot, body, log } = await setup({ scene: 'flat', moveMsPerBlock: 100 });
  const walk = body.run('go_to', { x: 30, y: 64, z: 0 });
  assert.equal(body.busy, true);
  const second = await body.run('collect', { block: 'oak_log', n: 1 });
  assert.equal(second.ok, false);
  assert.match(second.result, /^busy: go_to 30 64 0 is still running/);
  assert.equal(body.snapshot().busy, true);
  assert.match(body.state(), /^doing now: go_to 30 64 0$/m);

  await new Promise((r) => setTimeout(r, 20));
  const t0 = Date.now();
  await body.stop('viewer pressed stop');
  const r = await walk;
  assert.ok(Date.now() - t0 < 500, 'stops at once');
  assert.equal(r.ok, false);
  assert.equal(r.result, 'stopped: viewer pressed stop');
  assert.ok(called(bot, 'pathfinder.stop').length >= 1);
  assert.equal(body.busy, false);
  assert.equal(body.connected, true);
  assert.ok(bot.entity.position.x < 29, 'did not finish the walk');
  assert.match(body.state(), /^last result: go_to 30 64 0 -> failed: stopped: viewer pressed stop$/m);
  assert.ok(log.tail().some((row) => row.kind === 'stop' && row.reason === 'viewer pressed stop'));

  await body.stop('nothing running'); // idle stop is harmless
  const again = await body.run('get_state', {});
  assert.equal(again.ok, true);
});

test('stop() cancels collecting and smelting mid-way', async () => {
  const { bot, body } = await setup({ scene: 'forest', digMs: 200, inventory: { raw_iron: 4, coal: 1, furnace: 1, wooden_pickaxe: 1 }, smeltMsPerItem: 200 }, { timing: { pollMs: 5 } });
  const mining = body.run('collect', { block: 'oak_log', n: 4 });
  await new Promise((r) => setTimeout(r, 50));
  await body.stop('test');
  const r = await mining;
  assert.equal(r.result, 'stopped: test');
  assert.ok(called(bot, 'stopDigging').length >= 1, 'digging aborted');

  const smelting = body.run('smelt', { item: 'raw_iron', n: 4 });
  await new Promise((r2) => setTimeout(r2, 100));
  await body.stop('test');
  const s = await smelting;
  assert.match(s.result, /^stopped: test; took the items back; the furnace you placed is still at -?\d+ 64 -?\d+$/);
  assert.deepEqual(s.delta, { furnace: -1 }, 'the raw iron and the coal came back out of the furnace');
  assert.equal(called(bot, 'furnace.close').length, 1, 'the furnace window was closed');
});

test('walks: the pathfinder goal is cleared when goto settles short or fails, so the bot never walks on', async () => {
  const { bot, body } = await setup({ scene: 'flat' });
  const pf = bot.pathfinder;
  // pathfinder settles on an empty path with its goal still set (no error)
  pf.goto = async (goal) => { pf.goal = goal; };
  const short = await body.run('go_to', { x: 20, y: 64, z: 0 });
  assert.equal(short.ok, false);
  assert.match(short.result, /^could not reach 20 64 0 \(now at 0 64 0, 20 blocks short\)$/);
  assert.equal(pf.goal, null, 'goal cleared after an empty path');
  // pathfinder rejects (NoPath on a partial path) and would keep walking that path
  pf.goto = async (goal) => { pf.goal = goal; throw Object.assign(new Error('No path to the goal!'), { name: 'NoPath' }); };
  const none = await body.run('go_to', { x: 20, y: 64, z: 0 });
  assert.match(none.result, /no path found \(now at 0 64 0, 20 blocks short\)/);
  assert.equal(pf.goal, null, 'goal cleared after NoPath');
  assert.ok(pf.thinkTimeout >= 15_000, 'long trips get a longer path search');
});

test('collect: mines with pathfinder and dig (not collectblock); a drop it cannot reach does not hold up the next skill', async () => {
  const { bot, body } = await setup({ scene: 'forest' });
  const r = await body.run('collect', { block: 'oak_log', n: 2 });
  assert.equal(r.ok, true, r.result);
  assert.equal(called(bot, 'collect').length, 0, 'collectblock is not used');

  // a drop appears and never goes away (on a ledge); walking to it ends at once without arriving
  const dig = bot.dig;
  let id = 5000;
  bot.dig = async (block) => {
    await dig(block);
    const e = { id: ++id, name: 'item', type: 'object', position: block.position.offset(0.5, 0.2, 1.6), isValid: true };
    bot.entities[e.id] = e;
    bot.emit('itemDrop', e);
  };
  const goto = bot.pathfinder.goto;
  const toDrop = [];
  bot.pathfinder.goto = async (goal) => {
    if (goal?.constructor?.name === 'GoalBlock') { toDrop.push(goal); return undefined; } // the walk onto the drop settles where it is
    return goto(goal);
  };
  const t0 = Date.now();
  const stuck = await body.run('collect', { block: 'oak_log', n: 1 });
  assert.equal(stuck.ok, true, stuck.result);
  const again = await body.run('collect', { block: 'oak_log', n: 1 });
  assert.equal(again.ok, true, again.result);
  const ms = Date.now() - t0;
  assert.equal(toDrop.length, 2, 'it tried to walk to each drop');
  assert.ok(ms >= 1_500 && ms < 5_000, `each pickup waits about a second, then moves on (${ms} ms)`);
});

test('smelt: at most 24 items per call, and a furnace that will not open is picked up again', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { raw_iron: 30, coal: 4, furnace: 1, wooden_pickaxe: 1 } });
  const r = await body.run('smelt', { item: 'raw_iron', n: 30 });
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /^smelted 24 raw_iron into 24 iron_ingot, burning coal \(placed a furnace and took it back\); one call smelts at most 24, call smelt again for the other 6$/);
  assert.equal(r.delta.iron_ingot, 24);

  bot.openFurnace = async () => { throw new Error('Event windowOpen did not fire within timeout of 20000ms'); };
  const shut = await body.run('smelt', { item: 'raw_iron', n: 2 });
  assert.equal(shut.ok, false);
  assert.match(shut.result, /^could not open the furnace at -?\d+ 64 -?\d+: Event windowOpen did not fire .* \(placed a furnace and took it back\)$/);
  assert.deepEqual(shut.delta, {}, 'the placed furnace is back in the inventory');
});

test('stop: an open crafting window is closed, so a craft cannot click on into the next skill', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { oak_log: 2 } });
  const closed = [];
  bot.craft = () => new Promise(() => {}); // mineflayer's craft() cannot be aborted
  bot.currentWindow = { id: 7 };
  bot.closeWindow = (w) => { closed.push(w.id); bot.currentWindow = null; };
  const crafting = body.run('craft', { item: 'oak_planks', n: 4 });
  await new Promise((r) => setTimeout(r, 20));
  await body.stop('test');
  const r = await crafting;
  assert.equal(r.result, 'stopped: test');
  assert.deepEqual(closed, [7]);
});

test('attack: a mob it cannot get closer to fails fast instead of chasing until the time limit', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { stone_sword: 1 } });
  bot.fake.spawnMob('zombie', bot.entity.position.offset(10, 0, 0));
  bot.pathfinder.goto = async (goal) => { bot.pathfinder.goal = goal; }; // an empty path: settles where it stands
  const t0 = Date.now();
  const r = await body.run('attack', { target: 'zombie' });
  assert.equal(r.ok, false);
  assert.match(r.result, /^could not reach the zombie \(still 10 blocks away\)$/);
  assert.ok(Date.now() - t0 < 1_000);
});

test('timeouts: a skill past its limit is cancelled', async () => {
  const { body } = await setup({ scene: 'flat', moveMsPerBlock: 100 }, { timeouts: { go_to: 60 } });
  const r = await body.run('go_to', { x: 30, y: 64, z: 0 });
  assert.equal(r.ok, false);
  assert.match(r.result, /^timed out after 0\.1 s; go_to was cancelled$/);
  assert.equal(body.busy, false);
});

test('events: skill start/end, chat from others, death stops the skill, end on close', async () => {
  const { bot, body } = await setup({ scene: 'flat', moveMsPerBlock: 100 });
  const seen = { skill: [], chat: [], death: [], end: [], ready: [] };
  const offs = Object.keys(seen).map((e) => body.on(e, (d) => seen[e].push(d)));
  assert.throws(() => body.on('explode', () => {}), /unknown body event/);
  await new Promise((r) => setImmediate(r));
  assert.equal(seen.ready.length, 1);

  await body.run('say', { text: 'hi' });
  assert.deepEqual(seen.skill.map((s) => s.phase), ['start', 'end']);
  assert.deepEqual(seen.skill[1], { phase: 'end', tool: 'say', args: { text: 'hi' }, ok: true, result: 'said: hi', delta: {}, ms: seen.skill[1].ms });

  bot.fake.say('Steve', 'come here');
  bot.fake.say(bot.username, 'my own echo');
  assert.deepEqual(seen.chat, [{ username: 'Steve', message: 'come here' }]);

  const walk = body.run('go_to', { x: 30, y: 64, z: 0 });
  await new Promise((r) => setTimeout(r, 20));
  bot.fake.kill();
  const r = await walk;
  assert.match(r.result, /^stopped: you died at -?\d+ -?\d+ -?\d+; your items were dropped there/);
  assert.equal(seen.death.length, 1);

  offs[0]();
  await body.run('get_state', {});
  assert.equal(seen.skill.length, 4, 'unsubscribed');

  await body.close();
  assert.equal(seen.end.length, 1);
  assert.equal(body.connected, false);
  assert.equal((await body.run('get_state', {})).result, 'not connected to the game');
  assert.match(body.state(), /^DISCONNECTED/);
});

test('a real mineflayer bot: refuses a public host, reports a server that is not there', async () => {
  assert.throws(() => createBody({ config: { ...config, mc: { ...config.mc, host: '8.8.8.8' } } }), /must be on localhost or the LAN/);

  // a closed port on this machine: nothing listens, so the connection is refused at once
  const net = await import('node:net');
  const port = await new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
  const body = createBody({ config: loadConfig({ MC_PORT: String(port) }), log: createLogger({ dir: null, config }) });
  const ended = new Promise((r) => body.on('end', r));
  assert.equal(body.connected, false);
  assert.equal(body.state(), 'not in the game yet (connecting to the Minecraft server)');
  assert.equal((await body.run('get_state', {})).result, 'not in the game yet');
  await assert.rejects(body.ready, /could not join the Minecraft server/);
  await ended;
  assert.equal((await body.run('get_state', {})).result, 'not connected to the game');
  await body.close();
});

test('a hit from a hostile mob stops a long skill with what to do; a passive one or a fall does not', async () => {
  const { bot, body } = await setup({ scene: 'flat', moveMsPerBlock: 20 });
  const walk = body.run('go_to', { x: 30, y: 64, z: 0 });
  await new Promise((r) => setTimeout(r, 50));
  const near = bot.fake.spawnMob('zombie', bot.entity.position.offset(0, 0, 5)); // behind a wall, say
  bot.fake.hurt(2); // a fall: no source, so the zombie nearby is not blamed
  const cow = bot.fake.spawnMob('cow', bot.entity.position.offset(1, 0, 0));
  bot.fake.hurt(1, cow);
  assert.equal(body.busy, true, 'still walking');
  const zombie = bot.fake.spawnMob('zombie', bot.entity.position.offset(2, 0, 0));
  bot.fake.hurt(3, zombie);
  const r = await walk;
  assert.equal(r.ok, false);
  assert.match(r.result, /^stopped: a zombie is attacking you \(health 14\/20, 2 blocks away\); fight back with attack zombie, or go_to somewhere safe \(for 10 s its hits will not stop you again unless your health drops to 6\)$/);
  assert.notEqual(zombie.id, near.id);
  bot.fake.hurt(2, zombie);
  const fight = await body.run('attack', { target: 'zombie' });
  assert.doesNotMatch(fight.result, /is attacking you/, 'attack is never interrupted by the mob it fights');
});

test('hits: a skeleton shooting from afar stops a skill; fleeing from the mob that stopped it is not stopped again', async () => {
  const { bot, body } = await setup({ scene: 'flat', moveMsPerBlock: 20 });
  const skeleton = bot.fake.spawnMob('skeleton', bot.entity.position.offset(12, 0, 0));
  const walk = body.run('go_to', { x: 0, y: 64, z: 30 });
  await new Promise((r) => setTimeout(r, 50));
  bot.fake.hurt(3, skeleton);
  assert.match((await walk).result, /^stopped: a skeleton is attacking you \(health 17\/20, 12(\.\d)? blocks away\)/);

  // the advised escape: its next arrows do not stop the walk away from it...
  const flee = body.run('go_to', { x: -20, y: 64, z: 0 });
  await new Promise((r) => setTimeout(r, 50));
  bot.fake.hurt(3, skeleton);
  assert.equal(body.busy, true, 'still fleeing after a second hit');
  // ...unless health gets low
  bot.fake.hurt(8, skeleton);
  const r = await flee;
  assert.match(r.result, /^stopped: a skeleton is attacking you \(health 6\/20/);

  // an older server (no damage_event): a hostile mob within 6 blocks when health drops is taken as the attacker
  const old = createFakeBot({ scene: 'flat', moveMsPerBlock: 20 });
  old.registry = Object.create(old.registry, { version: { value: { '>=': () => false } } });
  const legacy = createBody({ bot: old, config, log: createLogger({ dir: null, config }) });
  await legacy.ready;
  old.fake.spawnMob('zombie', old.entity.position.offset(3, 0, 0));
  const w = legacy.run('go_to', { x: 30, y: 64, z: 0 });
  await new Promise((r) => setTimeout(r, 50));
  old.fake.setHealth(15);
  assert.match((await w).result, /^stopped: a zombie is attacking you \(health 15\/20, 3 blocks away\)/);
});

test('after a death the next skill waits for the respawn', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { oak_planks: 2 } });
  await new Promise((r) => setImmediate(r)); // the fake's own first spawn
  bot.fake.kill();
  assert.match(body.state(), /last result: you died at 0 64 0; your items were dropped there .*; you respawn at the world spawn/);
  setTimeout(() => { bot.health = 20; bot.emit('spawn'); }, 200);
  const t0 = Date.now();
  const r = await body.run('craft', { item: 'stick', n: 4 });
  assert.equal(r.ok, true, r.result);
  assert.ok(Date.now() - t0 >= 150, 'waited for the respawn');
});

test('collect: blocks the walk places as scaffolding do not count against the drops picked up', async () => {
  const { bot, body } = await setup({ scene: 'flat', inventory: { wooden_pickaxe: 1, cobblestone: 10 } });
  for (const x of [3, 4, 5]) bot.fake.setBlock(new Vec3(x, 64, 0), 'stone');
  const goto = bot.pathfinder.goto;
  let walks = 0;
  bot.pathfinder.goto = (goal) => { if (++walks === 1) bot.fake.take('cobblestone', 4); return goto(goal); }; // a pillar or a bridge
  const t0 = Date.now();
  const r = await body.run('collect', { block: 'stone', n: 3 });
  assert.equal(r.ok, true, r.result);
  assert.equal(r.result, 'mined 3 stone', 'no "picked up -1", no sweep');
  assert.ok(Date.now() - t0 < 4_000, 'no 8 s sweep for drops that were picked up');
  assert.deepEqual(r.delta, { cobblestone: -1 });
});

test('collect: says how many drops were really picked up when some stay on the ground', async () => {
  const { bot, body } = await setup({ scene: 'forest' });
  bot.dig = async (block) => { bot.fake.setBlock(block.position, 'air'); }; // the log breaks, its drop never arrives
  const r = await body.run('collect', { block: 'oak_log', n: 2 });
  assert.equal(r.ok, true, r.result);
  assert.equal(r.result, 'mined 2 oak_log; picked up 0 oak_log, the rest lies on the ground nearby');
  assert.deepEqual(r.delta, {});
});
