// test/walk.test.js - walks that get nowhere: the progress watch (src/walk-watch.js) on a fake clock, a go_to that
// keeps digging by hand without getting closer ends within the window and says why, the legs of one go_to share the
// watch, and go_to digs down only where the target lies below the ground at its own spot. No Minecraft server.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBot } from './fake-bot.js';
import { createBody } from '../src/body.js';
import { createWalkWatch, depthBelowSurface } from '../src/walk-watch.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { Vec3 } from '../src/mc.js';

const config = loadConfig({});

async function setup(botOpts = {}, bodyOpts = {}) {
  const bot = createFakeBot(botOpts);
  const body = createBody({ bot, config, log: createLogger({ dir: null, config }), ...bodyOpts });
  await body.ready;
  return { bot, body };
}

const called = (bot, fn) => bot.fake.calls.filter((c) => c.fn === fn);

test('watch: steady progress is never stuck; no gain for a whole window is, and stays stuck', () => {
  const bot = createFakeBot({ scene: 'flat' });
  let t = 0;
  let d = 60;
  const w = createWalkWatch(bot, { distance: () => d, windowMs: 10_000, gain: 3, now: () => t });
  for (; t <= 60_000; t += 500) { d -= 0.2; assert.equal(w.sample(), null, `at ${t} ms`); } // 4 blocks per 10 s
  const t1 = t;
  let err = null;
  for (; !err && t < t1 + 30_000; t += 500) { d += 0.1; err = w.sample(); } // drifting away
  assert.equal(err?.name, 'Stuck');
  assert.ok(t - t1 <= 10_500, `stuck within a window of the last gain (${t - t1} ms)`);
  assert.equal(err.message, 'stuck, only 2 blocks closer in the last 10 s: it got closer too slowly. Try: go_to a nearer spot on the way');
  assert.equal(w.sample(), err, 'stays stuck');
  assert.equal(w.error, err);

  // no gain at all from the start: stuck after one window
  t = 0;
  const still = createWalkWatch(bot, { distance: () => 20, windowMs: 10_000, gain: 3, now: () => t });
  let e2 = null;
  for (; !e2; t += 500) e2 = still.sample();
  assert.equal(t, 10_500);
  assert.equal(e2.message, 'stuck, no closer in the last 10 s: it found no way through. Try: go_to a nearer spot on the way');
});

test('watch: slow progress (under `gain` blocks a window) counts as stuck', () => {
  const bot = createFakeBot({ scene: 'flat' });
  let t = 0;
  let d = 30;
  const w = createWalkWatch(bot, { distance: () => d, windowMs: 10_000, gain: 3, now: () => t });
  let err = null;
  for (; !err && t < 60_000; t += 500) { d -= 0.1; err = w.sample(); } // 2 blocks per 10 s
  assert.ok(err && t <= 11_000, `stuck after one window (${t} ms)`);
  assert.match(err.message, /^stuck, only 2 blocks closer in the last 10 s: it got closer too slowly\./);
});

test('watch: digging stone by hand at the bottom of a shaft is named, with the depth and what to do', () => {
  const bot = createFakeBot({ scene: 'flat', inventory: { dirt: 4 } });
  const reg = bot.registry;
  bot.pathfinder.movements = { scafoldingBlocks: [reg.itemsByName.dirt.id, reg.itemsByName.cobblestone.id] };
  bot.fake.moveTo({ x: 0.5, y: 55, z: 0.5 }); // the fake ground is solid up to y=63: 9 blocks below its surface
  assert.equal(depthBelowSurface(bot), 9);
  bot.digTime = () => 7_500;
  bot.targetDigBlock = bot.blockAt(new Vec3(1, 55, 0)); // stone, with nothing in the hand
  let t = 0;
  const w = createWalkWatch(bot, { distance: () => 25, windowMs: 2_000, gain: 3, now: () => t });
  w.reset('place_error');
  let err = null;
  for (; !err; t += 500) err = w.sample();
  assert.equal(err.message, 'stuck, no closer in the last 2 s: it was digging stone by hand (7.5 s a block, and by hand it drops nothing); '
    + 'it tried to climb or bridge on blocks it placed (4 dirt or cobblestone left); you are underground, about 9 blocks below the surface. '
    + 'Try: craft a wooden_pickaxe first, or carry 9+ dirt or cobblestone to pillar up out of here (you have 4) or dig a staircase up with the pickaxe, '
    + 'or go_to a nearer spot on the way');
  bot.fake.moveTo({ x: 0.5, y: 64, z: 0.5 });
  assert.equal(depthBelowSurface(bot), null, 'on the ground: not underground');
});

test('go_to: pathfinder that keeps digging by hand without getting closer is ended within the window, with the report', async () => {
  const { bot, body } = await setup({ scene: 'flat' }, { timing: { progressMs: 600 } });
  const pf = bot.pathfinder;
  pf.isMining = () => true; // busy all the time: the old "stood still" rule never fired
  bot.digTime = () => 7_500;
  pf.goto = (goal) => {
    pf.goal = goal;
    bot.targetDigBlock = bot.blockAt(new Vec3(1, 59, 0));
    return new Promise(() => {}); // digs on and on
  };
  const t0 = Date.now();
  const r = await body.run('go_to', { x: 20, y: 64, z: 0 });
  const ms = Date.now() - t0;
  assert.equal(r.ok, false);
  assert.equal(r.result, 'could not reach 20 64 0: stuck, no closer in the last 1 s: it was digging stone by hand (7.5 s a block, and by hand it drops nothing). '
    + 'Try: craft a wooden_pickaxe first, or go_to a nearer spot on the way (now at 0 64 0, 20 blocks short)');
  assert.ok(ms < 3_000, `ended after the window, not the 120 s limit (${ms} ms)`);
  assert.equal(pf.goal, null, 'the goal is cleared');
  assert.equal(called(bot, 'goto').length, 0, 'only the stand-in goto ran');
});

test('go_to: the legs of one trip share the watch, so many slow legs cannot add up to the time limit', async () => {
  const { bot, body } = await setup({ scene: 'flat' }, { timing: { progressMs: 1_500 } });
  const pf = bot.pathfinder;
  const steps = [];
  pf.goto = async (goal) => {
    pf.goal = goal;
    steps.push(goal.constructor.name);
    await new Promise((r) => { setTimeout(r, 600); }); // each spiral step goes one block down, slowly (hand digging)
    const p = bot.entity.position;
    if (goal.constructor.name === 'GoalBlock') bot.fake.moveTo({ x: goal.x + 0.5, y: goal.y, z: goal.z + 0.5 });
    else if (goal.constructor.name === 'GoalNearXZ') bot.fake.moveTo({ x: goal.x + 0.5, y: p.y, z: goal.z + 0.5 });
    pf.goal = null;
  };
  const t0 = Date.now();
  const r = await body.run('go_to', { x: 0, y: 40, z: 0 });
  const ms = Date.now() - t0;
  assert.equal(r.ok, false);
  assert.match(r.result, /^could not reach 0 40 0: stuck, only [12] blocks? closer in the last 2 s: it got closer too slowly\. Try: go_to a nearer spot on the way \(now at [01] 6\d [01], 2\d blocks short\)$/);
  assert.ok(ms < 4_000, `ended early (${ms} ms, ${steps.length} legs)`);
  assert.ok(steps.every((s) => s === 'GoalBlock'), `spiral steps only, no final leg after the stall: ${steps.join(', ')}`);
});

test('go_to: digs down where the target is below the ground at its spot, walks where it lies on the ground below', async () => {
  // a target in a valley well below the bot: one walk, no staircase (the old rule dug a spiral from the bot's height)
  const { bot, body } = await setup({ scene: 'flat', position: { x: 0.5, y: 80, z: 0.5 } });
  const valley = await body.run('go_to', { x: 10, y: 64, z: 0 });
  assert.equal(valley.ok, true, valley.result);
  assert.deepEqual(called(bot, 'goto').map((c) => c.to), ['(10, 64, 0)']);

  // a target inside a hill, one block below the bot's feet but 8 below the hilltop: down the spiral staircase
  const { bot: bot2, body: body2 } = await setup({ scene: 'flat' });
  for (let x = 8; x <= 13; x++) for (let z = -2; z <= 3; z++) for (let y = 64; y <= 70; y++) bot2.fake.setBlock(new Vec3(x, y, z), 'stone');
  const hill = await body2.run('go_to', { x: 10, y: 63, z: 0 });
  assert.equal(hill.ok, true, hill.result);
  const legs = called(bot2, 'goto').map((c) => c.to);
  assert.equal(legs[0], '(10, 64, 0)', 'first over the spot');
  assert.ok(legs.slice(1, -1).some((to) => /^\((10|11), 63, (0|1)\)$/.test(to)), `a spiral step in the 2x2 column: ${legs.join(' | ')}`);
});
