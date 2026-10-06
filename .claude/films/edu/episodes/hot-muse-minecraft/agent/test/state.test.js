// test/state.test.js - the state serializer: facing, time of day, notable blocks with counts and nearest distance,
// mobs (never players or items), and the plain text the model reads.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBot } from './fake-bot.js';
import { Vec3 } from '../src/mc.js';
import { facingOf, describeTime, snapshotOf, renderState, describeCall, describeDelta, nearbyMobs } from '../src/state.js';

test('state: facing from yaw and the day phases', () => {
  assert.equal(facingOf(0).name, 'north');
  assert.equal(facingOf(Math.PI / 2).name, 'west');
  assert.equal(facingOf(-Math.PI / 2).name, 'east');
  assert.equal(facingOf(Math.PI).name, 'south');
  assert.deepEqual([facingOf(0).dx, facingOf(0).dz], [0, -1]);
  assert.match(describeTime(1000), /^day, night falls in about 10 min/);
  assert.match(describeTime(12500), /^sunset, night falls in about 25 s/);
  assert.match(describeTime(18000), /^night \(hostile mobs spawn\), sunrise in about 4 min/);
  assert.equal(describeTime(23500), 'sunrise');
  assert.match(describeTime(24000 + 1000), /^day/);
});

test('state: snapshot of the forest scene', () => {
  const bot = createFakeBot({ scene: 'forest', inventory: { oak_planks: 3, stick: 2 } });
  const s = snapshotOf(bot, { goal: 'get wood', lastResult: 'collect oak_log 1 -> ok: mined 1 oak_log' });
  assert.equal(s.health, 20);
  assert.equal(s.food, 20);
  assert.deepEqual(s.position, { x: 0, y: 64, z: 0 });
  assert.equal(s.facing, 'north');
  assert.equal(s.dimension, 'overworld');
  assert.equal(s.timeOfDay, 1000);
  assert.equal(s.isDay, true);
  assert.deepEqual(s.inventory, { oak_planks: 3, stick: 2 });
  assert.equal(s.held, 'oak_planks');
  const logs = s.nearbyBlocks.find((b) => b.name === 'oak_log');
  assert.equal(logs.count, 12);
  assert.deepEqual(logs.nearest, { x: 3, y: 64, z: 2 });
  assert.equal(logs.distance, 3.6);
  assert.equal(s.nearbyBlocks.find((b) => b.name === 'stone').count, 16);
  assert.equal(s.nearbyBlocks.find((b) => b.name === 'iron_ore').count, 3);
  assert.ok(!s.nearbyBlocks.some((b) => b.name === 'oak_leaves' || b.name === 'grass_block'), 'leaves and ground are not notable');
  assert.deepEqual(s.nearbyBlocks.map((b) => b.distance), [...s.nearbyBlocks.map((b) => b.distance)].sort((a, b) => a - b));
  assert.deepEqual(s.mobs, [{ name: 'cow', hostile: false, distance: 7.8, position: { x: 6, y: 64, z: 6 } }]);
  assert.equal(s.goal, 'get wood');
  assert.equal(s.busy, false);

  const text = renderState(s);
  assert.match(text, /^health 20\/20, food 20\/20$/m);
  assert.match(text, /^position 0 64 0 in the overworld, facing north$/m);
  assert.match(text, /^time 1000: day/m);
  assert.match(text, /^holding: oak_planks$/m);
  assert.match(text, /^inventory: oak_planks 3, stick 2$/m);
  assert.match(text, /oak_log 12 \(nearest 3\.6 away at 3 64 2\)/);
  assert.match(text, /^nearby mobs: cow 7\.8 away at 6 64 6$/m);
  assert.match(text, /^goal: get wood$/m);
  assert.match(text, /^last result: collect oak_log 1 -> ok: mined 1 oak_log$/m);
  assert.ok(!/doing now/.test(text));
});

test('state: caps, hostile mobs, no players or items, empty fields, oxygen', () => {
  const bot = createFakeBot({ scene: 'flat', timeOfDay: 18000 });
  for (let x = 0; x < 10; x++) for (let z = 0; z < 8; z++) bot.fake.setBlock(new Vec3(x + 2, 63, z + 2), 'stone');
  bot.fake.spawnMob('zombie', { x: 4, y: 64, z: 0 });
  bot.fake.spawnMob('cow', { x: 30, y: 64, z: 30 }); // beyond 32
  bot.entities[900] = { id: 900, name: 'player', type: 'player', username: 'Steve', position: new Vec3(1, 64, 1), isValid: true };
  bot.entities[901] = { id: 901, name: 'item', type: 'other', position: new Vec3(1, 64, 0), isValid: true };
  bot.oxygenLevel = 12;
  const s = snapshotOf(bot, { busy: true, doing: 'collect stone 3' });
  const stone = s.nearbyBlocks.find((b) => b.name === 'stone');
  assert.equal(stone.count, 64);
  assert.equal(stone.capped, true);
  assert.deepEqual(s.mobs.map((m) => [m.name, m.hostile]), [['zombie', true]]);
  assert.equal(nearbyMobs(bot).length, 1);
  assert.equal(s.isDay, false);

  const text = renderState(s);
  assert.match(text, /stone 64\+ \(nearest/);
  assert.match(text, /^nearby mobs: zombie \(hostile\) 3\.5 away at 4 64 0$/m);
  assert.match(text, /^inventory: empty$/m);
  assert.match(text, /^holding: nothing$/m);
  assert.match(text, /^time 18000: night/m);
  assert.match(text, /oxygen 12\/20 \(underwater\)/);
  assert.match(text, /^goal: none$/m);
  assert.match(text, /^doing now: collect stone 3$/m);
  assert.match(text, /^last result: none yet$/m);

  const empty = renderState(snapshotOf(createFakeBot({ scene: 'flat' })));
  assert.match(empty, /^nearby blocks \(within 32\): nothing notable$/m);
  assert.match(empty, /^nearby mobs: none$/m);
});

test('state: short call and delta descriptions', () => {
  assert.equal(describeCall('collect', { block: 'oak_log', n: 4 }), 'collect oak_log 4');
  assert.equal(describeCall('go_to', { x: 1, y: 64, z: -3 }), 'go_to 1 64 -3');
  assert.equal(describeCall('place', { block: 'cobblestone', pos: { x: 1, y: 64, z: 2 } }), 'place cobblestone at 1 64 2');
  assert.equal(describeCall('get_state', {}), 'get_state');
  assert.equal(describeCall('say', { text: 'hello\nworld' }), 'say "hello world"');
  assert.equal(describeDelta({ oak_log: -3, oak_planks: 12 }), 'oak_log -3, oak_planks +12');
  assert.equal(describeDelta({}), '');
});
