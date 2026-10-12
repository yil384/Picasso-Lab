// test/tolerant.test.js - skill arguments read the way they were meant where that can be read one way only
// (src/tolerant.js): the real failing call of production game ga13a88 (2026-10-12 22:27:59, go_to {pos: {x, y, z}}
// refused as BAD_ARGS), every position shape, numbers as strings, names in any case and common names, the wood kind the
// bot carries; and what stays refused because it could mean more than one thing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tolerate, positionOf, nameOf } from '../src/tolerant.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';

const S = MINEAI_SKILLS.schemas;
/** tolerate, then the check the MCP layer runs: {ok, args} or {ok: false, error}. */
const read = (skill, args, ctx = {}) => {
  const t = tolerate(S[skill], args, { skill, ...ctx });
  const v = MINEAI_SKILLS.validate(skill, t.args);
  return { ...v, changes: t.changes, unclear: t.unclear };
};

test('ga13a88: go_to {pos: {x, y, z}} (refused in production) is go_to {x, y, z}', () => {
  // the call as Muse sent it at 22:27:59 (mcp_call: "go_to: not run, bad arguments: go_to.pos is not allowed; ...")
  const r = read('go_to', { pos: { x: -20, y: 78, z: 236 } });
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.args, { x: -20, y: 78, z: 236 });
  assert.deepEqual(r.changes, ['args: pos as x, y, z']);
  // the shape it sent next, and the preferred one, are untouched
  assert.deepEqual(read('go_to', { x: -20, y: 78, z: 236 }), { ok: true, args: { x: -20, y: 78, z: 236 }, changes: [], unclear: [] });
});

test('every position shape, for go_to and for a pos argument', () => {
  const want = { x: 12, y: -59, z: -3 };
  for (const shape of [
    { position: { x: 12, y: -59, z: -3 } }, { target: [12, -59, -3] }, { pos: '12 -59 -3' }, { pos: '12, -59, -3' },
    { pos: '(12, -59, -3)' }, { pos: 'x=12 y=-59 z=-3' }, { pos: { X: 12, Y: -59, Z: -3 } }, { x: '12', y: '-59', z: '-3' },
    { x: 12.7, y: -58.2, z: -2.5 }, { pos: { pos: { x: 12, y: -59, z: -3 } } },
  ]) {
    const r = read('go_to', shape);
    assert.equal(r.ok, true, `${JSON.stringify(shape)}: ${r.error}`);
    assert.deepEqual(r.args, want, JSON.stringify(shape));
  }
  // a fraction is the block the point lies in (floor, also below zero)
  assert.deepEqual(read('go_to', { x: -20.5, y: 78, z: 236.9 }).args, { x: -21, y: 78, z: 236 });
  // a skill's one pos argument: flat, under another key, as a list or a string
  assert.deepEqual(read('place', { block: 'cobblestone', x: 1, y: 64, z: 2 }).args, { block: 'cobblestone', pos: { x: 1, y: 64, z: 2 } });
  assert.deepEqual(read('place', { block: 'cobblestone', pos: [1, 64, 2] }).args, { block: 'cobblestone', pos: { x: 1, y: 64, z: 2 } });
  assert.deepEqual(read('bucket', { action: 'fill', liquid: 'water', position: '378 72 -23' }).args, { action: 'fill', liquid: 'water', pos: { x: 378, y: 72, z: -23 } });
  assert.deepEqual(read('portal', { action: 'enter', at: { x: 49, y: 97, z: -7 } }).args, { action: 'enter', pos: { x: 49, y: 97, z: -7 } });
  // two different positions, or a position with a part missing, stay refused
  assert.equal(read('go_to', { pos: [1, 2, 3], target: [4, 5, 6] }).ok, false);
  assert.equal(read('go_to', { pos: [1, 2] }).ok, false);
  assert.equal(read('go_to', { pos: 'near the trees' }).ok, false);
  assert.equal(positionOf('1 2 3 4'), null);
  assert.equal(positionOf({ x: 1, y: 'up', z: 3 }), null);
});

test('numbers, booleans and counts under other names', () => {
  assert.deepEqual(read('collect', { block: 'oak_log', n: '8' }).args, { block: 'oak_log', n: 8 });
  assert.deepEqual(read('collect', { block: 'oak_log', count: 8 }).args, { block: 'oak_log', n: 8 });
  assert.deepEqual(read('craft', { item: 'stick', amount: '4' }).args, { item: 'stick', n: 4 });
  assert.deepEqual(read('pick_up', { death_items: 'true' }).args, { death_items: true });
  // a count with a fraction is not a whole count: refused (it says so)
  assert.match(read('collect', { block: 'oak_log', n: '2.5' }).error, /n must be an integer/);
  // two names for the count: which one was meant is not clear
  assert.equal(read('collect', { block: 'oak_log', count: 2, amount: 3 }).ok, false);
});

test('names: case, minecraft:, spaces, plurals, common names; the wood kind the bot carries', () => {
  assert.equal(read('craft', { item: 'Crafting Table', n: 1 }).args.item, 'crafting_table');
  assert.equal(read('craft', { item: 'minecraft:stick', n: 4 }).args.item, 'stick');
  assert.equal(read('craft', { item: 'sticks', n: 4 }).args.item, 'stick');
  assert.equal(read('craft', { item: 'torches', n: 4 }).args.item, 'torch');
  assert.equal(read('craft', { item: 'table', n: 1 }).args.item, 'crafting_table');
  assert.equal(read('craft', { item: 'wood_pickaxe', n: 1 }).args.item, 'wooden_pickaxe');
  assert.equal(read('craft', { item: 'flint and steel', n: 1 }).args.item, 'flint_and_steel');
  assert.equal(read('smelt', { item: 'iron_ore', n: 3 }).args.item, 'raw_iron', 'smelting an ore smelts what it drops');
  assert.equal(read('smelt', { item: 'raw_beef', n: 3 }).args.item, 'beef');
  assert.equal(read('collect', { block: 'iron_ore', n: 3 }).args.block, 'iron_ore', 'collect keeps the ore');
  assert.equal(read('build', { blueprint: 'portal', material: 'obsidian' }).args.blueprint, 'nether_portal');
  assert.equal(read('attack', { target: 'nearest' }).args.target, 'nearest_hostile');
  assert.equal(read('equip', { item: 'shield', to: 'offhand' }).args.to, 'off-hand');
  assert.equal(read('equip', { item: 'shield', to: 'off-hand' }).args.to, 'off-hand');
  // hunt's drop is a free name: raw_chicken is the item chicken (g64e8c5 step 1 hunted for nothing)
  assert.equal(read('hunt', { mob: 'chicken', drop: 'raw_chicken', n: 1 }).args.drop, 'chicken');
  assert.equal(read('hunt', { target: 'cow', drop: 'Beef', n: 2 }).args.mob, 'cow', 'target for hunt is its mob');
  assert.equal(read('collect', { item: 'oak_log', n: 2 }).args.block, 'oak_log', 'item for collect is its block');

  // "planks": the bot's only wood decides; with none or with two kinds it is not clear and stays refused, with the
  // candidates named
  assert.equal(read('craft', { item: 'planks', n: 4 }, { inventory: { birch_log: 3 } }).args.item, 'birch_planks');
  assert.equal(read('craft', { item: 'wooden planks', n: 4 }, { inventory: { oak_log: 3 } }).args.item, 'oak_planks');
  assert.equal(read('craft', { item: 'plank', n: 4 }, { inventory: { dark_oak_log: 3 } }).args.item, 'dark_oak_planks');
  const none = read('craft', { item: 'planks', n: 4 }, { inventory: {} });
  assert.equal(none.ok, false);
  assert.match(none.unclear.join(), /"planks" could be oak_planks, spruce_planks, birch_planks/);
  assert.equal(read('craft', { item: 'planks', n: 4 }, { inventory: { oak_log: 1, birch_log: 2 } }).ok, false);
  assert.equal(read('build', { blueprint: 'shelter', material: 'planks' }, { inventory: { spruce_planks: 30 } }).args.material, 'spruce_planks');
  // collect: which trees stand near is not what the bot carries
  assert.equal(read('collect', { block: 'logs', n: 4 }, { inventory: { birch_log: 3 } }).ok, false);
  assert.equal(read('craft', { item: 'pickaxe', n: 1 }, { inventory: { iron_ingot: 3 } }).ok, false, 'which pickaxe is not clear');
  assert.deepEqual(nameOf('bricks', S.craft.properties.item.enum), { value: 'stone_bricks' });

  // free text is never touched
  assert.deepEqual(read('say', { text: 'Hello Table, 1 2 3' }).args, { text: 'Hello Table, 1 2 3' });
  // craft_batch: one entry, or {item: count}
  assert.deepEqual(read('craft_batch', { items: { item: 'stick', n: 4 } }).args, { items: [{ item: 'stick', n: 4 }] });
  assert.deepEqual(read('craft_batch', { items: { sticks: 4, 'Crafting Table': 1 } }).args, { items: [{ item: 'stick', n: 4 }, { item: 'crafting_table', n: 1 }] });
});

test('nothing it cannot read is changed, and it never throws', () => {
  for (const [skill, args] of [['go_to', null], ['go_to', 'north'], ['collect', []], ['craft', { item: 42, n: {} }], ['place', { block: 'dirt', pos: null }]]) {
    assert.doesNotThrow(() => tolerate(S[skill], args, { skill }));
    assert.equal(read(skill, args ?? {}).ok, false, `${skill} ${JSON.stringify(args)}`);
  }
  assert.deepEqual(tolerate(undefined, { a: 1 }).args, { a: 1 });
});
