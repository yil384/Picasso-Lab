// test/progression.test.js - the progression skills (src/skills/progression) on the fake bot: tool definitions,
// lava-aware digging (never next to lava, never straight down), stairs, a diamond tunnel, armor, the portal frame
// and the trip through it. Pouring water and the server's portal rules are proven on a real server (test/lab).

import test from 'node:test';
import assert from 'node:assert/strict';
import { createFakeBot } from './fake-bot.js';
import { Vec3 } from '../src/mc.js';
import { TOOL_NAMES, validateArgs } from '../src/contracts.js';
import { PROGRESSION_DEFS, PROGRESSION_SKILLS, PROGRESSION_TOOL_NAMES, PROGRESSION_TIMEOUTS_MS, PROGRESSION_WHITELIST } from '../src/skills/progression/index.js';
import { digDanger, stepDanger, safeStep, DIRS } from '../src/skills/progression/safety.js';
import { stairsTo } from '../src/skills/progression/mining.js';
import { chooseSite, frameCells } from '../src/skills/progression/portal.js';
import { _test as bucketTest } from '../src/skills/progression/bucket.js';

const v = (x, y, z) => new Vec3(x, y, z);

/** A skill context like the body's, without a body (the skills only use these). */
function ctxFor(bot) {
  return {
    bot,
    check() {},
    wait: (p) => Promise.resolve(p),
    sleep: (ms) => new Promise((r) => { setTimeout(r, Math.min(ms, 5)); }),
    goto: (goal) => bot.pathfinder.goto(goal),
    timeoutMs: 60_000,
    onCleanup() { return () => {}; },
  };
}

/** A fake bot standing in a carved 1x2 pocket inside the stone at y. */
async function inStone(y, opts = {}) {
  const bot = createFakeBot({ position: { x: 0.5, y, z: 0.5 }, ...opts });
  await new Promise((r) => { setImmediate(r); });
  bot.fake.setBlock(v(0, y, 0), 'air');
  bot.fake.setBlock(v(0, y + 1, 0), 'air');
  return bot;
}

test('progression tools: unique names apart from the core tools, closed schemas, a skill and a time limit each', () => {
  assert.equal(new Set(PROGRESSION_TOOL_NAMES).size, PROGRESSION_TOOL_NAMES.length);
  for (const [name, description, params] of PROGRESSION_DEFS) {
    assert.ok(!TOOL_NAMES.includes(name), `${name} clashes with a core tool`);
    assert.ok(description.length > 20 && description.length < 700, name);
    assert.equal(params.type, 'object');
    assert.equal(params.additionalProperties, false);
    assert.deepEqual(params.required, Object.keys(params.properties));
    assert.equal(typeof PROGRESSION_SKILLS[name], 'function');
    assert.ok(PROGRESSION_TIMEOUTS_MS[name] > 0);
  }
  // every whitelist name exists in 1.21.4
  const bot = createFakeBot();
  for (const list of Object.values(PROGRESSION_WHITELIST)) {
    for (const n of list) assert.ok(bot.registry.itemsByName[n] || bot.registry.blocksByName[n], n);
  }
  // the core validator rejects them until they are registered
  assert.equal(validateArgs('mine_diamonds', { n: 1 }).ok, false);
});

test('digDanger: lava or water touching a block, the block under the feet and bedrock are never dug', async () => {
  const bot = await inStone(-58);
  assert.equal(digDanger(bot, v(1, -58, 0)), null);
  bot.fake.setBlock(v(2, -58, 0), 'lava');
  assert.match(digDanger(bot, v(1, -58, 0)), /lava next to/);
  bot.fake.setBlock(v(1, -56, 0), 'water');
  assert.match(digDanger(bot, v(1, -57, 0)), /water next to/);
  assert.match(digDanger(bot, v(0, -59, 0)), /under your feet/);
  bot.fake.setBlock(v(-1, -58, 0), 'bedrock');
  assert.match(digDanger(bot, v(-1, -58, 0)), /not to be dug/);
});

test('safeStep: tunnels forward two high and walks there; refuses a step with lava beside it', async () => {
  const bot = await inStone(-58, { inventory: { iron_pickaxe: 1, cobblestone: 8 } });
  const ctx = ctxFor(bot);
  const east = DIRS[0];
  const r = await safeStep(ctx, east, 0);
  assert.equal(r.ok, true, r.result);
  assert.deepEqual(bot.entity.position.floored().toArray(), [1, -58, 0]);
  assert.equal(bot.blockAt(v(1, -57, 0)).name, 'air');
  bot.fake.setBlock(v(2, -57, 1), 'lava'); // beside the head cell of the next step
  assert.match(stepDanger(bot, bot.entity.position, east, 0), /lava/);
  const blocked = await safeStep(ctx, east, 0);
  assert.equal(blocked.ok, false);
  assert.equal(bot.blockAt(v(2, -57, 0)).name, 'stone', 'nothing dug next to lava');
});

test('safeStep: a gap in the floor is filled before stepping; a gap over lava is refused', async () => {
  const bot = await inStone(-58, { inventory: { iron_pickaxe: 1, cobblestone: 8 } });
  const ctx = ctxFor(bot);
  bot.fake.setBlock(v(1, -59, 0), 'air');
  const r = await safeStep(ctx, DIRS[0], 0);
  assert.equal(r.ok, true, r.result);
  assert.equal(bot.blockAt(v(1, -59, 0)).name, 'cobblestone');
  bot.fake.setBlock(v(2, -59, 0), 'air');
  bot.fake.setBlock(v(2, -60, 0), 'lava');
  assert.match(stepDanger(bot, bot.entity.position, DIRS[0], 0), /lava/);
});

test('stairsTo: a staircase down, never the block under the feet; turns away from lava', async () => {
  const bot = await inStone(40, { inventory: { iron_pickaxe: 1, cobblestone: 16 } });
  bot.entity.yaw = -Math.PI / 2; // facing east (+x)
  const ctx = ctxFor(bot);
  bot.fake.setBlock(v(3, 37, 0), 'lava'); // in the way of the third step east
  const r = await stairsTo(ctx, { y: 34 });
  assert.equal(r.ok, true, r.result);
  assert.equal(Math.floor(bot.entity.position.y), 34);
  assert.equal(bot.blockAt(v(0, 39, 0)).name, 'stone', 'the block under the start was not dug');
  assert.equal(bot.blockAt(v(3, 37, 0)).name, 'lava');
  for (const c of bot.fake.calls.filter((x) => x.fn === 'dig')) {
    const [x, y, z] = c.pos.replace(/[()\s]/g, '').split(',').map(Number);
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      assert.notEqual(`${x + d[0]},${y + d[1]},${z + d[2]}`, '3,37,0', `dug ${c.pos} next to the lava`);
    }
  }
});

test('mine_diamonds: tunnels to a diamond ore within range and mines it', async () => {
  const bot = await inStone(-58, { inventory: { iron_pickaxe: 1, cobblestone: 16, bread: 4, iron_helmet: 1, shield: 1 } });
  bot.fake.setBlock(v(9, -57, 2), 'deepslate_diamond_ore');
  const r = await PROGRESSION_SKILLS.mine_diamonds(ctxFor(bot), { n: 1 });
  assert.equal(r.ok, true, r.result);
  assert.equal(bot.fake.counts().diamond, 1);
  assert.equal(bot.inventory.slots[5]?.name, 'iron_helmet');
  assert.equal(bot.inventory.slots[45]?.name, 'shield');
});

test('mine_diamonds: an ore with lava touching it is covered first, or skipped', async () => {
  const bot = await inStone(-58, { inventory: { iron_pickaxe: 1, cobblestone: 16 } });
  bot.fake.setBlock(v(3, -58, 0), 'deepslate_diamond_ore');
  bot.fake.setBlock(v(3, -58, 1), 'lava');
  const r = await PROGRESSION_SKILLS.mine_diamonds({ ...ctxFor(bot), timeoutMs: 21_000 }, { n: 1 });
  // either the lava was covered with cobblestone before the ore was mined, or the ore was left
  if (bot.fake.counts().diamond) assert.notEqual(bot.blockAt(v(3, -58, 1)).name, 'lava', r.result);
  else assert.equal(bot.blockAt(v(3, -58, 0)).name, 'deepslate_diamond_ore');
});

test('mine_diamonds needs an iron pickaxe', async () => {
  const bot = await inStone(-58, { inventory: { stone_pickaxe: 1 } });
  const r = await PROGRESSION_SKILLS.mine_diamonds(ctxFor(bot), { n: 1 });
  assert.equal(r.ok, false);
  assert.match(r.result, /iron pickaxe/);
});

test('obsidian rules: never with lava beside it or nothing under it; pour spots are dry shore one above the lava', async () => {
  const bot = createFakeBot({ position: { x: 0.5, y: 64, z: 0.5 } });
  await new Promise((r) => { setImmediate(r); });
  for (let x = 2; x <= 4; x++) for (let z = -1; z <= 1; z++) bot.fake.setBlock(v(x, 63, z), 'lava');
  const lavas = bucketTest.surfaceSources(bot, 'lava');
  assert.equal(lavas.length, 9);
  const spots = bucketTest.pourSpots(bot, lavas, new Set());
  assert.ok(spots.length > 0);
  for (const { feet } of spots) assert.equal(feet.y, 64);
  bot.fake.setBlock(v(6, 63, 0), 'obsidian');
  assert.equal(bucketTest.obsidianDanger(bot, v(6, 63, 0)), null);
  bot.fake.setBlock(v(5, 63, 0), 'obsidian');
  assert.match(bucketTest.obsidianDanger(bot, v(5, 63, 0)), /lava beside/);
  bot.fake.setBlock(v(6, 62, 0), 'air');
  assert.match(bucketTest.obsidianDanger(bot, v(6, 63, 0)), /nothing solid/);
});

test('build_portal: a 4x5 frame on flat ground, obsidian sides, block corners, lit; use_portal goes through', async () => {
  const bot = createFakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, inventory: { obsidian: 10, cobblestone: 8, iron_ingot: 1, flint: 1 } });
  await new Promise((r) => { setImmediate(r); });
  const site = chooseSite(bot);
  assert.ok(site);
  assert.equal(frameCells(site.origin, site.axis).filter((c) => c.role === 'obsidian').length, 10);
  // the fake lights a frame like the game: fire on the bottom obsidian fills the inside with portal blocks
  bot.activateBlock = async (block) => {
    if (bot.heldItem?.name !== 'flint_and_steel') return;
    const cells = frameCells(site.origin, site.axis);
    const frameOk = cells.every((c) => (c.role === 'obsidian' ? bot.blockAt(c.p).name === 'obsidian' : true));
    if (!frameOk || !block) return;
    for (const c of cells) if (c.role === 'inside') bot.fake.setBlock(c.p, 'nether_portal');
  };
  const r = await PROGRESSION_SKILLS.build_portal(ctxFor(bot), {});
  assert.equal(r.ok, true, r.result);
  assert.equal(bot.fake.counts().obsidian ?? 0, 0);
  assert.equal(bot.fake.counts().flint_and_steel, 1);
  // a server moves a player standing in the portal to the other dimension
  bot.on('move', () => {
    if (bot.blockAt(bot.entity.position.floored())?.name === 'nether_portal') setTimeout(() => { bot.game.dimension = 'the_nether'; }, 20);
  });
  const t = await PROGRESSION_SKILLS.use_portal(ctxFor(bot), {});
  assert.equal(t.ok, true, t.result);
  assert.match(t.result, /overworld to the_nether/);
  assert.notEqual(bot.blockAt(bot.entity.position.floored()).name, 'nether_portal', 'stepped out of the portal');
});

test('equip_gear puts on the best armor and the shield; hole_up walls the bot in', async () => {
  const bot = await inStone(-30, { inventory: { iron_chestplate: 1, golden_chestplate: 1, diamond_boots: 1, shield: 1, cobblestone: 16, bread: 2 } });
  const ctx = ctxFor(bot);
  const r = await PROGRESSION_SKILLS.equip_gear(ctx, {});
  assert.equal(r.ok, true, r.result);
  assert.equal(bot.inventory.slots[6].name, 'iron_chestplate');
  assert.equal(bot.inventory.slots[8].name, 'diamond_boots');
  assert.equal(bot.inventory.slots[45].name, 'shield');
  const open = await createFakeBot({ position: { x: 0.5, y: 64, z: 0.5 }, inventory: { cobblestone: 16 } });
  await new Promise((res) => { setImmediate(res); });
  open.fake.setHealth(20);
  const h = await PROGRESSION_SKILLS.hole_up(ctxFor(open), { seconds: 10 });
  assert.equal(h.ok, true, h.result);
  assert.match(h.result, /walled in on every side/);
  assert.equal(open.blockAt(v(0, 66, 0)).name, 'cobblestone');
});
