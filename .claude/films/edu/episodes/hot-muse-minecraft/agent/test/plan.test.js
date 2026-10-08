// test/plan.test.js - the MCP dry-run check (src/plan.js) on the game's recipes: crafts it adds (planks, sticks, a
// table, a furnace), refusals with what is missing, steps already queued counted as done; the typed result codes;
// the craft_batch skill's arguments; and craft_batch itself on the fake bot, by window clicks: one table for the list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlanner, describeMissing } from '../src/plan.js';
import { validateArgs, codeOf, SKILL_NAMES, TOOL_NAMES, TOOLS, MCP_SKILLS, RESULT_CODES } from '../src/contracts.js';
import { createFakeBot } from './fake-bot.js';
import { createBody } from '../src/body.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { Vec3 } from '../src/mc.js';

const planner = createPlanner();
const craft = (item, n = 1) => ({ skill: 'craft', args: { item, n } });
const run = (plan) => plan.steps.map((s) => `${s.step ?? '+'} ${s.skill} ${s.args.item ?? s.args.block ?? s.args.blueprint ?? ''} ${s.args.n ?? ''}`.trim());

test('check: a wooden pickaxe from logs gets its planks (cut once), a table and sticks added', () => {
  const p = planner.check([craft('wooden_pickaxe')], { inventory: { oak_log: 3 }, table: false });
  assert.equal(p.ok, true);
  assert.deepEqual(run(p), ['+ craft oak_planks 12', '+ craft crafting_table 1', '+ craft stick 4', '1 craft wooden_pickaxe 1']);
  assert.equal(p.added, 3);
  assert.match(p.steps[0].added, /^for step 1 \(craft wooden_pickaxe 1\)$/);

  // a table within reach: no table craft; the wood the bot holds is used
  const near = planner.check([craft('wooden_pickaxe')], { inventory: { birch_log: 2 }, table: true });
  assert.deepEqual(run(near), ['+ craft birch_planks 8', '+ craft stick 4', '1 craft wooden_pickaxe 1']);
  // nothing known about stations (a stub body): no table is added, nothing is refused for it
  assert.deepEqual(run(planner.check([craft('wooden_pickaxe')], { inventory: { oak_planks: 3, stick: 2 } })), ['1 craft wooden_pickaxe 1']);
});

test('check: refusals name what is missing, in what to collect (logs of any wood, iron, a pickaxe, fuel)', () => {
  const two = planner.check([craft('wooden_pickaxe')], { inventory: { birch_log: 2 }, table: false });
  assert.equal(two.ok, false, '8 planks: the table takes 4, the pickaxe 3 and its sticks 2');
  assert.deepEqual(two.missing, [{ step: 1, item: 'birch_log', need: 1, for: 'wooden_pickaxe', anyWood: true }]);
  assert.equal(describeMissing(two.missing[0]), '1 birch_log (or logs of any wood) for wooden_pickaxe');

  const none = planner.check([craft('wooden_pickaxe')], { inventory: {}, table: false });
  assert.deepEqual(none.missing, [{ step: 1, item: 'oak_log', need: 3, for: 'wooden_pickaxe', anyWood: true }], 'one entry per item, summed');

  const iron = planner.check([craft('iron_pickaxe')], { inventory: { oak_planks: 4 }, table: true });
  assert.deepEqual(iron.missing, [{ step: 1, item: 'iron_ingot', need: 3, for: 'iron_pickaxe' }]);

  const stone = planner.check([{ skill: 'collect', args: { block: 'stone', n: 3 } }], { inventory: { oak_log: 1 } });
  assert.equal(stone.missing[0].item, 'wooden_pickaxe');
  assert.match(describeMissing(stone.missing[0]), /stone drops nothing without wooden_pickaxe or a better one/);
  assert.equal(planner.check([{ skill: 'collect', args: { block: 'iron_ore', n: 3 } }], { inventory: { wooden_pickaxe: 1 } }).missing[0].item, 'stone_pickaxe');

  const fuel = planner.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 3 } }], { inventory: { raw_iron: 3 }, furnace: true });
  assert.deepEqual(fuel.missing.map((m) => [m.item, m.need]), [['coal', 1]]);
  assert.equal(planner.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 3 } }], { inventory: { raw_iron: 3, oak_planks: 2 }, furnace: true }).ok, true, 'two planks smelt 3');
  assert.deepEqual(planner.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 3 } }], { inventory: { raw_iron: 1, coal: 1 }, furnace: true }).missing, [{ step: 1, item: 'raw_iron', need: 2 }]);

  const wood = planner.check([craft('oak_planks', 4)], { inventory: { birch_log: 2 } });
  assert.equal(describeMissing(wood.missing[0]), '1 oak_log for oak_planks (this recipe takes oak_log only; you carry birch_log)');
});

test('check: the iron route from an empty inventory passes, with a table, sticks and a furnace added where needed', () => {
  const route = [
    { skill: 'collect', args: { block: 'oak_log', n: 5 } }, craft('wooden_pickaxe'),
    { skill: 'collect', args: { block: 'stone', n: 11 } }, craft('stone_pickaxe'),
    { skill: 'collect', args: { block: 'iron_ore', n: 3 } }, { skill: 'collect', args: { block: 'coal_ore', n: 1 } },
    { skill: 'smelt', args: { item: 'raw_iron', n: 3 } }, craft('iron_pickaxe'),
  ];
  const p = planner.check(route, { inventory: {}, table: false, furnace: false });
  assert.equal(p.ok, true, JSON.stringify(p.missing));
  assert.deepEqual(run(p), [
    '1 collect oak_log 5', '+ craft oak_planks 12', '+ craft crafting_table 1', '+ craft stick 4', '2 craft wooden_pickaxe 1',
    '3 collect stone 11', '4 craft stone_pickaxe 1', '5 collect iron_ore 3', '6 collect coal_ore 1', '+ craft furnace 1',
    '7 smelt raw_iron 3', '+ craft stick 4', '8 craft iron_pickaxe 1',
  ]);
  assert.match(p.steps[9].added, /^for a furnace in step 7 \(smelt raw_iron 3\)$/);
  // one stone short for the furnace: refused before anything runs
  const short = planner.check(route.map((s) => (s.args.block === 'stone' ? { ...s, args: { ...s.args, n: 10 } } : s)), { inventory: {}, table: false, furnace: false });
  assert.deepEqual(short.missing, [{ step: 7, item: 'cobblestone', need: 1, for: 'a furnace' }]);
});

test('check: as the body does it, a table or furnace put down stays (it leaves the inventory) and spare cobblestone becomes extra furnaces', () => {
  const place = (block) => ({ skill: 'place', args: { block, x: 1, y: 64, z: 1 } });
  // the carried table is put down for the pickaxe and stays there: it is no longer in the inventory to place again
  const table = planner.check([craft('wooden_pickaxe'), place('crafting_table')], { inventory: { crafting_table: 1, oak_planks: 3, stick: 2 }, table: false });
  assert.deepEqual(table.missing.map((m) => [m.step, m.item]), [[2, 'crafting_table']]);
  // with a table nearby the carried one stays in the inventory
  assert.equal(planner.check([craft('wooden_pickaxe'), place('crafting_table')], { inventory: { crafting_table: 1, oak_planks: 3, stick: 2 }, table: true }).ok, true);
  // smelting 3 with 16 spare cobblestone and a table nearby: two more furnaces take it all, so a stone pickaxe after it lacks cobblestone
  const route = [{ skill: 'smelt', args: { item: 'raw_iron', n: 3 } }, craft('stone_pickaxe')];
  const inv = { raw_iron: 3, furnace: 1, cobblestone: 16, oak_planks: 6, stick: 2 };
  const p = planner.check(route, { inventory: inv, table: true, furnace: false });
  assert.deepEqual(p.missing, [{ step: 2, item: 'cobblestone', need: 3, for: 'stone_pickaxe' }]);
  // 19 cobblestone: 16 go into furnaces, 3 are left for the pickaxe; each furnace burns planks of its own
  const q = planner.check(route, { inventory: { ...inv, cobblestone: 19 }, table: true, furnace: false });
  assert.equal(q.ok, true, JSON.stringify(q.missing));
  // one item: one furnace, no extra ones
  assert.equal(planner.check([{ skill: 'smelt', args: { item: 'raw_iron', n: 1 } }, craft('stone_pickaxe')], { inventory: { ...inv, raw_iron: 1, cobblestone: 3 }, table: true, furnace: false }).ok, true);
});

test('check: steps already queued count as done; craft_batch gets its planks, table and sticks inside the batch', () => {
  assert.equal(planner.check([craft('oak_planks', 4)], { inventory: {} }).ok, false);
  assert.equal(planner.check([craft('oak_planks', 4)], { inventory: {}, before: [{ skill: 'collect', args: { block: 'oak_log', n: 2 } }] }).ok, true);
  // a step queued earlier that will itself lack something is never a reason to refuse the new ones
  assert.equal(planner.check([craft('stick', 4)], { inventory: {}, before: [craft('oak_planks', 8)] }).ok, true);

  const b = planner.check([{ skill: 'craft_batch', args: { items: [{ item: 'wooden_pickaxe', n: 1 }, { item: 'wooden_axe', n: 1 }] } }], { inventory: { spruce_log: 3 }, table: false });
  assert.equal(b.ok, true);
  assert.equal(b.steps.length, 1, 'still one step');
  assert.deepEqual(b.steps[0].args.items, [
    { item: 'spruce_planks', n: 12 }, { item: 'crafting_table', n: 1 }, { item: 'stick', n: 4 },
    { item: 'wooden_pickaxe', n: 1 }, { item: 'wooden_axe', n: 1 },
  ]);
  assert.deepEqual(b.steps[0].addedItems.map((x) => x.item), ['spruce_planks', 'crafting_table', 'stick']);
  assert.equal(validateArgs('craft_batch', b.steps[0].args).ok, true);

  // a place or a build of planks gets them cut from logs; a build with none at all is refused
  assert.deepEqual(run(planner.check([{ skill: 'build', args: { blueprint: 'hut_3x3', material: 'oak_planks' } }], { inventory: { oak_log: 6 } })), ['+ craft oak_planks 24', '1 build hut_3x3']);
  assert.deepEqual(planner.check([{ skill: 'build', args: { blueprint: 'wall_5x2', material: 'cobblestone' } }], { inventory: {} }).missing, [{ step: 1, item: 'cobblestone', need: 10, for: 'wall_5x2' }]);
  assert.equal(planner.check([{ skill: 'build', args: { blueprint: 'wall_5x2', material: 'cobblestone' } }], { inventory: { cobblestone: 4 } }).ok, true, 'part of it may stand already');
  // more than 64 at once is split into crafts of 64
  assert.deepEqual(run(planner.check([craft('stick', 64), craft('oak_stairs', 64)], { inventory: { oak_log: 32 }, table: true })), [
    '+ craft oak_planks 32', '1 craft stick 64', '+ craft oak_planks 64', '+ craft oak_planks 32', '2 craft oak_stairs 64',
  ]);
});

test('codes: skill results map to the typed codes the MCP replies carry', () => {
  const cases = [
    [{ ok: true, result: 'mined 3 oak_log' }, null],
    [{ ok: false, result: 'stopped: you died at 1 64 2; your items were dropped there' }, 'DIED'],
    [{ ok: false, result: 'stopped: a zombie is attacking you (health 14/20, 2 blocks away); fight back with attack zombie' }, 'HOSTILE_CONTACT'],
    [{ ok: false, result: 'retreated from 2 zombies at health 7/20 to 4 64 9' }, 'RETREATED_LOW_HEALTH'],
    // the texts of the body's reflexes (src/body.js)
    [{ ok: false, result: 'retreated: a skeleton hit you (health 7/20, 3 blocks away), and with health 7/20 you ran instead of fighting; go_to was not finished. Rest or eat, then call it again' }, 'RETREATED_LOW_HEALTH'],
    [{ ok: false, result: 'stopped: mobs kept attacking (4 times); collect was not finished' }, 'HOSTILE_CONTACT'],
    [{ ok: false, result: 'stopped: a zombie hit you (health 12/20, 2 blocks away); say was not finished' }, 'HOSTILE_CONTACT'],
    [{ ok: false, result: 'stopped: the bot kept getting hungry (9 meals); collect was not finished' }, 'STOPPED'],
    [{ ok: false, result: 'mined 2 of 5 stone: no more stone within 32 blocks [on its own: ran 16 blocks from a creeper to 1 64 2 (now 17 blocks from it)]' }, 'FAILED'],
    [{ ok: false, result: 'mined 2 of 5 stone: the inventory is full' }, 'INVENTORY_FULL'],
    [{ ok: false, result: 'not enough ingredients for wooden_pickaxe: missing 2 stick' }, 'NEED_ITEMS'],
    [{ ok: false, result: 'crafted 4 of 8 stick; for the rest you are missing 2 oak_planks' }, 'NEED_ITEMS'],
    [{ ok: false, result: 'no fuel: you need coal, charcoal, planks, sticks or logs' }, 'NEED_ITEMS'],
    [{ ok: false, result: 'stone drops nothing without the right tool: you need one of wooden_pickaxe' }, 'NEED_ITEMS'],
    [{ ok: false, result: 'hut_3x3 needs 23 oak_planks here (23 for the whole blueprint); you have 4' }, 'NEED_ITEMS'],
    [{ ok: false, result: 'timed out after 60 s; craft was cancelled' }, 'TIMED_OUT'],
    [{ ok: false, result: 'stopped: stopped through MCP' }, 'STOPPED'],
    [{ ok: false, result: 'no zombie within 16 blocks' }, 'FAILED'],
  ];
  for (const [r, code] of cases) assert.equal(codeOf(r), code, r.result);
  for (const [, code] of cases) if (code) assert.ok(RESULT_CODES.includes(code));
});

test('craft_batch: an MCP-only skill (not in the brain\'s tools), a list of 1 to 12 items, checked like craft', () => {
  assert.deepEqual(TOOL_NAMES.length, 10);
  assert.equal(TOOLS.length, 10, 'the model still sees the 10 tools');
  assert.deepEqual(SKILL_NAMES.slice(10), ['craft_batch']);
  assert.equal(MCP_SKILLS.at(-1).function.name, 'craft_batch');
  const ok = validateArgs('craft_batch', { items: [{ item: 'stick', n: 4 }, { item: 'wooden_pickaxe', n: 1 }] });
  assert.deepEqual(ok, { ok: true, args: { items: [{ item: 'stick', n: 4 }, { item: 'wooden_pickaxe', n: 1 }] } });
  const cases = [
    [{ items: [] }, /needs at least 1 entries/],
    [{ items: Array(13).fill({ item: 'stick', n: 1 }) }, /more than 12 entries/],
    [{ items: [{ item: 'stick' }] }, /items\[0\]\.n is required/],
    [{ items: [{ item: 'diamond_sword', n: 1 }] }, /items\[0\]\.item "diamond_sword" is not allowed/],
    [{ items: [{ item: 'stick', n: 1, fast: true }] }, /items\[0\]\.fast is not allowed/],
    [{ items: 'stick' }, /items must be a list/],
  ];
  for (const [args, re] of cases) {
    const r = validateArgs('craft_batch', args);
    assert.equal(r.ok, false);
    assert.match(r.error, re);
  }
});

// ---------------------------------------------------------------------------------------------------------------
// craft_batch on the fake bot (window clicks against the fake server's window model)

const config = loadConfig({});
async function setup(botOpts = {}) {
  const bot = createFakeBot({ scene: 'flat', clickServer: { lagMs: 5 }, ...botOpts });
  const body = createBody({ bot, config, log: createLogger({ dir: null, config }) });
  await body.ready;
  return { bot, body };
}
const called = (bot, fn) => bot.fake.calls.filter((c) => c.fn === fn);

test('craft_batch: a pickaxe and an axe from logs with one table, put down once and left standing for later crafts', async () => {
  const items = [
    { item: 'birch_planks', n: 12 }, { item: 'crafting_table', n: 1 }, { item: 'stick', n: 4 },
    { item: 'wooden_pickaxe', n: 1 }, { item: 'wooden_axe', n: 1 },
  ];
  const { bot, body } = await setup({ inventory: { birch_log: 3 } });
  const r = await body.run('craft_batch', { items });
  assert.equal(r.ok, true, r.result);
  assert.match(r.result, /^crafted 12 birch_planks; crafted 1 crafting_table; crafted 4 stick; crafted 1 wooden_pickaxe \(placed a crafting table at (-?\d+ \d+ -?\d+); it stays there[^)]*\); crafted 1 wooden_axe \(at your crafting table at \1\)$/);
  assert.deepEqual(r.delta, { birch_log: -3, wooden_pickaxe: 1, wooden_axe: 1 }, 'the table stays where it was put down (a station of the bot)');
  assert.equal(called(bot, 'placeBlock').length, 1, 'one table for both tools');
  assert.match(body.state(), /your stations: crafting_table at/);
  assert.equal(bot.currentWindow, null);
  assert.equal(called(bot, 'craft').length, 0, 'by clicks');

  const sep = await setup({ inventory: { birch_log: 3 } });
  for (const it of items) assert.equal((await sep.body.run('craft', it)).ok, true);
  assert.equal(called(sep.bot, 'placeBlock').length, 1, 'separate crafts reuse the table that stays too (ROADMAP M2, S4)');
});

test('craft_batch: a table within reach is used and none placed; it stops at the first item it cannot make and keeps what it made', async () => {
  const { bot, body } = await setup({ inventory: { oak_planks: 5, cobblestone: 3 } });
  bot.fake.setBlock(new Vec3(2, 64, 0), 'crafting_table');
  const r = await body.run('craft_batch', { items: [{ item: 'stick', n: 4 }, { item: 'stone_pickaxe', n: 1 }, { item: 'iron_pickaxe', n: 1 }, { item: 'wooden_sword', n: 1 }] });
  assert.equal(r.ok, false);
  assert.match(r.result, /^crafted 4 stick; crafted 1 stone_pickaxe; then not enough ingredients for iron_pickaxe: missing 3 iron_ingot; not crafted: 1 wooden_sword$/);
  assert.equal(codeOf(r), 'NEED_ITEMS');
  assert.deepEqual(r.delta, { oak_planks: -2, stick: 2, cobblestone: -3, stone_pickaxe: 1 });
  assert.equal(called(bot, 'placeBlock').length, 0);

  // the plain fake bot (no protocol client): the same skill through mineflayer's craft()
  const plain = createFakeBot({ scene: 'flat', inventory: { oak_log: 2 } });
  const pb = createBody({ bot: plain, config, log: createLogger({ dir: null, config }) });
  await pb.ready;
  const r2 = await pb.run('craft_batch', { items: [{ item: 'oak_planks', n: 8 }, { item: 'crafting_table', n: 1 }, { item: 'oak_slab', n: 6 }] });
  assert.equal(r2.ok, true, r2.result);
  assert.deepEqual(r2.delta, { oak_log: -2, oak_planks: 1, oak_slab: 6 });
  assert.equal(called(plain, 'placeBlock').length, 1);
});
