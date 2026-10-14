// test/gd7540a.test.js - what production game gd7540a (2026-10-14) showed: three build nether_portal in a row, each
// in rock (the bot had walked into a mountain through a tunnel its walk dug), each stopped 3 to 5 s in with "could not
// clear the cell at 477 75 -7 (stone) where the portal frame goes: The requested cell at 477,75,-7 is air, not stone",
// no obsidian placed, and the game ran out with 14 obsidian carried. The world afterwards: the first cell of each
// site dug, the next one already clear (their drop recovery after the first dig went through it). Now a site cell that
// is already clear counts as cleared, another block fallen in is dug as that block, and the frame goes up. Also from
// that game: rotten flesh eaten when hurt below food 18, a smelt tried again at the furnace it left, a lit frame's
// corners spared and named, and the stuck item's options for a frame.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { blueprintCells, toTheirs } from '../src/mineai/skills.js';
import { advise, createCare } from '../src/mineai/care.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'gd7540a-')), MC_PORT: '25942' });
const log = createLogger({ dir: null, config, keep: 500 });

async function bodyAt(gameId, inventory) {
  const hosts = fakeHosts(() => ({ inventory }));
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_rv_${gameId}`, careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  fake.world.position = { x: 477.5, y: 76, z: -7.5 }; // at 477 76 -8, as the second frame was built
  await body.refresh();
  fake.world.heading = 180; // facing south, as the second frame was built
  return { body, fake, hosts };
}
/** The frame's cells where the body builds it (the bot's feet and heading). */
const frameOf = (fake) => blueprintCells('nether_portal', 'obsidian', { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) }, fake.world.heading).cells;
const at = (fake, c) => fake.world.grid.get(`${c.x},${c.y},${c.z}`);

test('gd7540a: a portal site in rock whose next cell the first dig already cleared: the site counts as cleared and the frame goes up', async () => {
  const { body, fake, hosts } = await bodyAt('gd754a', { obsidian: 14, diamond_pickaxe: 1, flint_and_steel: 1 });
  try {
    // the bot in a one-wide tunnel in stone (its own two cells and the way it came are air), as at 477 76 -8
    const feet = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    fake.world.grid = new Map();
    fake.world.boxAt = (x, y, z) => (x === feet.x && z <= feet.z && (y === feet.y || y === feet.y + 1) ? 'air' : 'stone');
    // the first dig clears the cells beside it too (their drop recovery stepped through), once
    let first = true;
    fake.world.digAlso = (c) => { if (!first) return []; first = false; return [{ x: c.x + 1, y: c.y, z: c.z }, { x: c.x - 1, y: c.y, z: c.z }, { x: c.x, y: c.y, z: c.z + 1 }, { x: c.x, y: c.y, z: c.z - 1 }]; };
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.doesNotMatch(r.result, /could not clear/);
    assert.match(r.result, /\(built facing south; cleared 18 cells of stone for it first\)$/, r.result);
    const digs = fake.tools('collect_block');
    assert.ok(digs.length >= 2 && digs.length <= 18, `each cell dug once at most (${digs.length})`);
    assert.equal(fake.tools('build_structure').length, 1, 'the frame was built');
    // the frame complete: obsidian on its 12 cells, air inside, 2 obsidian left
    const cells = frameOf(fake);
    assert.equal(cells.filter((c) => c.block_name === 'obsidian' && at(fake, c) === 'obsidian').length, 12);
    assert.ok(cells.filter((c) => c.block_name === 'air').every((c) => at(fake, c) === 'air'));
    assert.equal(fake.world.inventory.get('obsidian'), 2);
    // and it lights
    const lit = await body.run('portal', { action: 'light' });
    assert.equal(lit.ok, true, lit.result);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('gd7540a: a whole build on a mixed site (dirt ground, stone, oak leaves): cleared, a block fallen into a dug cell dug as what it is, 12 obsidian placed, the frame complete', async () => {
  const { body, fake, hosts } = await bodyAt('gd754b', { obsidian: 14, diamond_pickaxe: 1 });
  try {
    const feet = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    fake.world.grid = new Map();
    // dirt ground, a stone outcrop at the bot's height, leaves of a tree above; the bot stands in the open
    fake.world.boxAt = (x, y, z) => (y < feet.y ? 'dirt' : x === feet.x && z === feet.z ? 'air' : y <= feet.y + 1 ? 'stone' : y <= feet.y + 3 ? 'oak_leaves' : 'air');
    // the first dig lets gravel fall into the next cell of the frame's inside
    const cells = frameOf(fake);
    const inside = cells.filter((c) => c.block_name === 'air');
    let once = true;
    fake.world.digAlso = () => { if (!once) return []; once = false; fake.world.grid.set(`${inside[0].x},${inside[0].y},${inside[0].z}`, 'gravel'); return []; };
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /cleared \d+ cells of (dirt|stone|oak_leaves)( and (dirt|stone|oak_leaves))+ for it first\)$/, r.result);
    const digs = fake.tools('collect_block').map((c) => c.args);
    assert.ok(digs.some((d) => d.block_name === 'gravel' && d.x === inside[0].x && d.y === inside[0].y && d.z === inside[0].z), 'the gravel fallen in, dug as gravel');
    assert.equal(cells.filter((c) => c.block_name === 'obsidian' && at(fake, c) === 'obsidian').length, 12, 'the frame complete');
    assert.ok(inside.every((c) => at(fake, c) === 'air'), 'its inside clear');
    assert.equal(fake.world.inventory.get('obsidian'), 2);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('gd7540a: a site cell that will not clear (water, or a refused dig) still stops the build before any obsidian is placed', async () => {
  const { body, fake, hosts } = await bodyAt('gd754c', { obsidian: 14, diamond_pickaxe: 1 });
  try {
    const feet = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    fake.world.grid = new Map();
    fake.world.boxAt = (x, y, z) => (x === feet.x && z === feet.z && y >= feet.y ? 'air' : 'stone');
    fake.world.fail.collect_block = 'The requested cell could not be dug: it is protected.';
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, false);
    assert.match(r.result, /^could not clear the cell at -?\d+ -?\d+ -?\d+ \(stone\) where the portal frame goes: .*; no obsidian was placed/);
    assert.equal(fake.tools('build_structure').length, 0);
    assert.equal(fake.world.inventory.get('obsidian'), 14);
  } finally { await body.close(); await hosts.closeAll(); }
});

// health 6 for 14 minutes at food 15 down to 5, with rotten flesh carried: eat refused it above food 6, the advice said
// "no food carried" next to "the best food you carry: rotten_flesh", and the eat_below 6 rule ate only safe food
test('gd7540a: hurt below food 18, rotten flesh is eaten (healing needs food 18); the advice says so with a call that runs; the eat_below rule eats it at 6', async () => {
  const ctx = (food, health) => ({ position: { x: 0.5, y: 64, z: 0.5 }, heading: 0, inventory: { rotten_flesh: 3 }, food, health });
  assert.deepEqual(toTheirs('eat', {}, ctx(15, 6)).calls, [{ tool: 'eat_food', args: { food_name: 'rotten_flesh' } }]);
  assert.match(toTheirs('eat', {}, ctx(15, 6)).note, /toward 18, where health comes back/);
  assert.equal(toTheirs('eat', {}, ctx(15, 20)).refused.code, 'NEED_ITEMS', 'not hurt: kept for food 6 or less');
  assert.equal(toTheirs('eat', {}, ctx(5, 20)).calls[0].args.food_name, 'rotten_flesh');

  const NOW = Date.parse('2026-10-14T02:30:00Z');
  const sit = (food, health) => ({ dimension: 'overworld', observedAt: new Date(NOW).toISOString(), vitals: { health, food }, clock: { timeOfDay: 1000, phase: 'day' }, position: { x: 10.5, y: 64, z: -3.5, headingDegrees: 90 }, nearby: { hostiles: [], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' } });
  const shield = { name: 'shield', count: 1, location: 'off-hand', durability: null };
  const items = advise(sit(15, 6), { now: NOW, memory: { cool: {}, night: 0 }, canCraft: () => false, inventory: { rotten_flesh: 3 }, stacks: [shield] });
  const eat = items.find((a) => a.kind === 'eat');
  assert.equal(eat.text, 'food 15/20, health 6/20 (it heals only at food 18 or more); you carry 3 rotten_flesh: it adds 4 food (its Hunger costs about 1); one brings food to 18, where health comes back');
  assert.deepEqual(eat.hint, { skill: 'eat', args: {} });
  assert.ok(!items.some((a) => /no food carried/.test(a.text)), JSON.stringify(items));
  assert.deepEqual(items.find((a) => a.kind === 'heal').hint, { skill: 'eat', args: {} });
  // not hurt, food 12: hunting is the advice, and the rotten flesh is named
  const fed = advise(sit(12, 20), { now: NOW, memory: { cool: {}, night: 0 }, canCraft: () => false, inventory: { rotten_flesh: 3 }, stacks: [shield] });
  assert.match(fed.find((a) => a.kind === 'food').text, /no safe food carried \(3 rotten_flesh: eat takes it at food 6 or less\) and no animal in sight/);

  // the rule: eat_below 6 at food 5 with only rotten flesh
  const calls = [];
  const state = { food: 5 };
  const care = createCare({
    situation: () => ({ dimension: 'overworld', vitals: { health: 6, food: state.food }, clock: { timeOfDay: 1000 }, position: { x: 0.5, y: 64, z: 0.5 }, nearby: { hostiles: [], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' } }),
    latest: () => ({ inventory: { rotten_flesh: 3 }, equipment: {} }), stacks: () => [], refresh: async () => {},
    act: async (call) => { calls.push(call); if (call.tool === 'eat_food') state.food = 9; return { output: { action: call.tool, result: { status: 'succeeded' } } }; },
    rpc: async () => ({}), plan: (tool, args) => toTheirs(tool, args, { inventory: { rotten_flesh: 3 }, food: state.food, health: 6 }), idle: () => true, idleSince: () => Date.now() - 60_000, furnaceNear: () => false, tableNear: () => false,
    event: () => {}, now: () => Date.now(), tickMs: 1e9, mode: 'advise',
  });
  care.setRules({ eat_below: 6 });
  await care.tick();
  await until(() => calls.some((c) => c.tool === 'eat_food'));
  assert.equal(calls.find((c) => c.tool === 'eat_food')?.args?.food_name, 'rotten_flesh');
});

test('gd7540a: a smelt a reflex cut short, its furnace left standing: the try again smelts in that furnace', async () => {
  const hosts = fakeHosts(() => ({ inventory: { raw_iron: 6, coal: 4, furnace: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gd754d', username: 'Tst_rv_gd754d', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.takeovers.push({ tool: 'smelt_item', made: false, furnaceLeft: true, error: 'Action interrupted: fight response for zombie took control.' });
    const r = await body.run('smelt', { item: 'raw_iron', n: 6 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /tried again once it let go/);
    const smelts = fake.tools('smelt_item').map((c) => c.args);
    assert.equal(smelts[0].temporary_workstation, true);
    assert.ok(Number.isInteger(smelts[1].x) && !smelts[1].temporary_workstation, JSON.stringify(smelts[1]));
    assert.equal(fake.world.inventory.get('iron_ingot'), 6);
  } finally { await body.close(); await hosts.closeAll(); }
});

// the 4 obsidian Muse got near the lit portal at 396 92 -65 were its frame's corners (they touch no portal block on a
// face, so runtime patch 0014 let the search take them); then "the obsidian deposit" there twice. Now the corners are
// a lit frame's too (patch 0015 for their search, the same for ours), the state says that obsidian is a lit frame's,
// and the LAVA refusal says so before naming the nearest pool
test('gd7540a: a lit frame with corners: never mined here, the state marks it as a lit frame, LAVA names the frame and the nearest pool', async () => {
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 4, water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gd754e', username: 'Tst_rv_gd754e', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.position = { x: 396.5, y: 91, z: -61.5 }; // by the lit portal, far from the world spawn
    await body.refresh();
    const p = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    // a portal 2 wide, 3 tall, 3 blocks east; its frame of 14 with the 4 corners
    const portal = [];
    for (const dx of [3, 4]) for (const dy of [1, 2, 3]) portal.push({ x: p.x + dx, y: p.y + dy, z: p.z });
    const corners = [[2, 0], [5, 0], [2, 4], [5, 4]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy, z: p.z }));
    const sides = [[2, 1], [2, 2], [2, 3], [5, 1], [5, 2], [5, 3], [3, 0], [4, 0], [3, 4], [4, 4]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy, z: p.z }));
    fake.world.blocks = [
      { name: 'obsidian', found: 14, listed: [...corners.slice(0, 1), ...sides, ...corners.slice(1)] },
      { name: 'nether_portal', found: 6, listed: portal },
      { name: 'lava', found: 9, listed: [{ x: p.x + 40, y: p.y - 10, z: p.z + 5, level: 0 }] },
    ];
    await body.rescan();
    const state = body.state();
    assert.match(state, /obsidian \d+ \(nearest \d+ away at -?\d+ -?\d+ -?\d+; a lit portal's frame: never taken\)/, state);
    const r = await body.run('collect', { block: 'obsidian', n: 10 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'LAVA');
    assert.match(r.result, new RegExp(`^the obsidian at the lit portal at ${p.x + 3} ${p.y + 1} ${p.z} is its frame and is never taken; no lava pool within 16 blocks to make obsidian from\\. The nearest lava pool loaded is at ${p.x + 40} ${p.y - 10} ${p.z + 5}, \\d+ blocks away`), r.result);
    assert.equal(fake.tools('collect_block').length, 0, 'no corner taken at its cell');
    // with a pool beside: the search runs, and no frame cell (the corners included) is mined at its cell
    fake.world.blocks[2] = { name: 'lava', found: 9, listed: [{ x: p.x - 4, y: p.y - 1, z: p.z, level: 0 }] };
    const ok = await body.run('collect', { block: 'obsidian', n: 2 });
    assert.equal(ok.ok, true, ok.result);
    assert.match(ok.result, /its frame was left alone/);
    assert.ok(fake.tools('collect_block').every((c) => !Number.isInteger(c.args.x)), JSON.stringify(fake.tools('collect_block').map((c) => c.args)));
    // other obsidian beside the frame: counted apart from it
    fake.world.blocks[0] = { name: 'obsidian', found: 15, listed: [{ x: p.x - 3, y: p.y - 1, z: p.z }, ...corners, ...sides] };
    await body.rescan();
    assert.match(body.state(), new RegExp(`obsidian 1 \\(nearest \\d+ away at ${p.x - 3} ${p.y - 1} ${p.z}; and 14 in a lit portal's frame, never taken\\)`));
  } finally { await body.close(); await hosts.closeAll(); }
});

test('gd7540a: stuck on a frame that does not go up: what to do instead, with a call where there is one', async () => {
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 14 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gd754f', username: 'Tst_rv_gd754f', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.position = { x: 446.5, y: 72, z: -35.5 };
    await body.refresh();
    const why = await body.stuckWhy('build:nether_portal', { args: { blueprint: 'nether_portal', material: 'obsidian' }, result: 'lava at 448 71 -30 is next to where the portal frame would stand: build it on dry ground away from lava and water' });
    assert.match(why.text, /^the frame does not go up \(the last one said: lava at 448 71 -30 is next to where the portal frame would stand: build it on dry ground away from lava and water\)$/);
    assert.equal(why.options[0].text, 'build 8 blocks farther from the lava: go_to 438 72 -44, then build');
    assert.deepEqual(why.options[0].hint, { skill: 'go_to', args: { x: 438, y: 72, z: -44 } });
    assert.match(why.options.at(-1).text, /place the frame yourself/);
  } finally { await body.close(); await hosts.closeAll(); }
});
