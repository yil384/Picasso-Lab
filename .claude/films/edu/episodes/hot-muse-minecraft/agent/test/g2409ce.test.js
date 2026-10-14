// test/g2409ce.test.js - what production game g2409ce (2026-10-14, 27:57, no Nether) showed:
// - the first frame stopped at 17 of 18 cells on "Event blockUpdate ... did not fire within timeout of 5000ms";
// - the next build began a second frame facing south beside it, with the last 3 obsidian;
// - 12 minutes for 14 obsidian across three pools, the water bucket left empty;
// - a sheep hunt a fight cut short and never sent again, health 8.8 all game;
// - a held-back fight said in their jargon.
// Now:
// - the build tries such a placement once more;
// - a frame that stopped on a hiccup is continued, and an unusable one's obsidian is taken back first;
// - pools are named with how many sources they have, and an empty bucket is filled before obsidian;
// - a hunt or collect goes on after the fight for what is missing;
// - the held-back fight is said plainly.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody, lavaPools } from '../src/mineai/body.js';
import { fromTheirs, toTheirs } from '../src/mineai/skills.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g2409ce-')), MC_PORT: '25947' });
const log = createLogger({ dir: null, config, keep: 500 });
const HICCUP = 'Event blockUpdate:(-100, 103, -183) did not fire within timeout of 5000ms; physical verification after 5 ticks';

async function bodyOf(gameId, inventory) {
  const hosts = fakeHosts(() => ({ inventory }));
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_rv_${gameId}`, careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  fake.world.position = { x: -100.5, y: 103, z: -183.5 };
  await body.refresh();
  return { body, fake, hosts };
}

test('g2409ce: a placement the server did not confirm in time is tried once more, and the frame goes up', async () => {
  const { body, fake, hosts } = await bodyOf('g2409a', { obsidian: 14 });
  try {
    fake.world.takeovers.push({ tool: 'build_structure', made: false, error: HICCUP });
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /the server did not confirm one placement in time; the build went on at the same cells/);
    assert.equal(fake.tools('build_structure').length, 2);
    assert.deepEqual(fake.tools('build_structure')[1].args.blocks, fake.tools('build_structure')[0].args.blocks, 'the same cells');
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g2409ce: a frame that stopped on a hiccup twice is continued by the next build, whatever way the bot faces now', async () => {
  const { body, fake, hosts } = await bodyOf('g2409b', { obsidian: 14 });
  try {
    fake.world.heading = 90;
    fake.world.takeovers.push({ tool: 'build_structure', made: false, error: HICCUP }, { tool: 'build_structure', made: false, error: HICCUP });
    const first = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(first.ok, false);
    assert.match(first.result, /did not fire within timeout/);
    // the bot turned (dropping junk), as in production: still the same frame
    fake.world.heading = 180;
    const again = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(again.ok, true, again.result);
    assert.match(again.result, /continued the nether_portal begun facing east/);
    const builds = fake.tools('build_structure');
    assert.deepEqual(builds.at(-1).args.blocks, builds[0].args.blocks, 'the first frame\'s cells, never a second frame');
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g2409ce: an unfinished frame on a bad site within reach: its obsidian is taken back before a new frame, never a second frame beside it', async () => {
  const { body, fake, hosts } = await bodyOf('g2409c', { obsidian: 14 });
  try {
    fake.world.heading = 90;
    fake.world.buildKept = 2; // two frame cells kept deepslate: a site that will not do
    const bad = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(bad.ok, false);
    assert.match(bad.result, /not a portal frame/);
    fake.world.buildKept = 0;
    fake.world.heading = 180;
    const before = fake.tools('collect_block').length;
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /took back the obsidian of your unfinished frame at -?\d+ -?\d+ -?\d+ first \(its site would not do\)/);
    const takes = fake.tools('collect_block').slice(before).map((c) => c.args);
    assert.ok(takes.length >= 1 && takes.every((a) => a.block_name === 'obsidian' && Number.isInteger(a.x)), JSON.stringify(takes));
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g2409ce: a hunt and a collect a fight cut short go on after it; made in full before the fight is done', async () => {
  const { body, fake, hosts } = await bodyOf('g2409d', { stone_sword: 1 });
  try {
    fake.world.takeovers.push({ tool: 'collect_mob_drop', made: false, error: 'fight response for skeleton#7 at 1,2,3 (3.0 blocks).' });
    let r = await body.run('hunt', { mob: 'sheep', drop: 'mutton', n: 2 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^a reflex took the body over \(it fought a skeleton\); the hunt went on once it let go \(2 still to get\)/);
    assert.equal(fake.tools('collect_mob_drop').length, 2);
    fake.world.takeovers.push({ tool: 'collect_mob_drop', made: true, error: 'fight response for zombie#8 at 1,2,3 (3.0 blocks).' });
    r = await body.run('hunt', { mob: 'sheep', drop: 'mutton', n: 1 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /\(a reflex took the body over at the end: it fought a zombie\)$/);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g2409ce: an empty bucket is filled with water before collect obsidian; pools are named with their sources, one big enough first', async () => {
  const ctx = { position: { x: 0.5, y: 0, z: 0.5 }, heading: 0, inventory: { bucket: 1, diamond_pickaxe: 1, cobblestone: 20 } };
  const plan = toTheirs('collect', { block: 'obsidian', n: 4 }, ctx);
  assert.deepEqual(plan.calls[0], { tool: 'use_bucket', args: { action: 'fill', liquid: 'water' }, refill: true });
  assert.equal(plan.note, 'filled your empty bucket with water first');
  assert.equal(toTheirs('collect', { block: 'obsidian', n: 4 }, { ...ctx, inventory: { water_bucket: 1 } }).calls[0].tool, 'collect_block');
  // pools as their cast groups them
  const listed = [
    { x: 20, y: 0, z: 0, level: 0 }, // one source, 20 blocks off
    { x: 40, y: 0, z: 0, level: 0 }, { x: 41, y: 0, z: 0, level: 0 }, { x: 42, y: 0, z: 1, level: 0 }, { x: 43, y: 0, z: 1, level: 0 }, { x: 44, y: 0, z: 2, level: 0 },
    { x: 41, y: 0, z: 2, level: 3 }, // flowing: not a source
  ];
  const pools = lavaPools(listed, { x: 0, y: 0, z: 0 });
  assert.deepEqual(pools.map((q) => [q.x, q.sources]), [[20, 1], [40, 5]]);
  // the guard names one big enough for the collect, and the nearer small one
  const { body, fake, hosts } = await bodyOf('g2409e', { water_bucket: 1, diamond_pickaxe: 1, cobblestone: 20 });
  try {
    fake.world.position = { x: 300.5, y: -40, z: 300.5 };
    await body.refresh();
    fake.world.blocks = [{ name: 'lava', found: 7, listed: listed.map((l) => ({ ...l, x: l.x + 300, y: l.y - 40, z: l.z + 300 })) }];
    const r = await body.run('collect', { block: 'obsidian', n: 5 });
    assert.equal(r.code, 'LAVA');
    assert.match(r.result, /The nearest lava pool loaded is at 340 -40 300, 40 blocks away \(5 sources; a nearer one at 320 -40 300 has only 1\): go_to a spot a few blocks from it first\.$/, r.result);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g2409ce: a fight held back for want of a way to heal is said plainly', () => {
  const r = fromTheirs('collect_mob_drop', { result: { status: 'partial', error: 'recovery: [COMBAT_CONSTRAINED] Recovery is prohibited or no carried food, sufficient hunger or regeneration effect can restore health.', hunt: { mob: 'skeleton', drop: 'bone', requested: 1, gained: 0, targetDeathsObserved: 0 } } }, { call: { tool: 'collect_mob_drop', args: { mob_name: 'skeleton', drop_name: 'bone', count: 1 } } });
  assert.match(r.result, /the body would not start the fight: its health is low and nothing can bring it back up \(no food carried, and food under 18, where health comes back\): eat or hunt first, or shelter/);
  assert.doesNotMatch(r.result, /COMBAT_CONSTRAINED|Recovery is prohibited/);
});

test('drops it could not pick up (a dark oak canopy, staging 2026-10-14): the collect goes on once for what is missing', async () => {
  const { body, fake, hosts } = await bodyOf('g2409f', {});
  try {
    fake.world.dropsLost = 2;
    const r = await body.run('collect', { block: 'dark_oak_log', n: 3 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /the drops it could not reach were left, and it went on for the other 2/);
    const calls = fake.tools('collect_block').map((c) => c.args.count);
    assert.deepEqual(calls, [3, 2]);
    assert.equal(fake.world.inventory.get('dark_oak_log'), 3);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('a lake: collect obsidian stands on its shore first, above an open source (the soak, 2026-10-14)', async () => {
  const { body, fake, hosts } = await bodyOf('g2409g', { water_bucket: 1, diamond_pickaxe: 1, cobblestone: 20 });
  try {
    fake.world.position = { x: 303.5, y: 46, z: 290.5 };
    await body.refresh();
    // a lake at y 40: x 300..306, z 300..304, a second layer under it; stone shore and ground, air above
    const inLake = (x, z) => x >= 300 && x <= 306 && z >= 300 && z <= 304;
    fake.world.boxAt = (x, y, z) => (y === 40 && inLake(x, z) ? 'lava' : y === 39 && inLake(x, z) ? 'lava' : y <= 40 ? 'stone' : 'air');
    const listed = [];
    for (let x = 300; x <= 306; x++) for (let z = 300; z <= 304; z++) listed.push({ x, y: 40, z, level: 0 }, { x, y: 39, z, level: 0 });
    listed.sort((a, b) => Math.hypot(a.x - 303, a.z - 290) - Math.hypot(b.x - 303, b.z - 290));
    fake.world.blocks = [{ name: 'lava', found: listed.length, listed }];
    const r = await body.run('collect', { block: 'obsidian', n: 2 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /stood on the pool's shore at \d+ 41 \d+ first/);
    const walk = fake.tools('navigate')[0].args;
    assert.equal(walk.y, 41, 'one above the lake, on the shore');
    assert.ok(!inLake(walk.x, walk.z), 'not in the lava');
    assert.ok(listed.some((l) => l.y === 40 && Math.max(Math.abs(l.x - walk.x), Math.abs(l.z - walk.z)) <= 2), 'within 2 of an open source');
  } finally { await body.close(); await hosts.closeAll(); }
});

test('an empty bucket refilled before obsidian formed beside the bot: the refill never takes the search\'s count (the soak: "use_bucket: Unrecognized key count")', async () => {
  const { body, fake, hosts } = await bodyOf('g2409h', { bucket: 1, diamond_pickaxe: 1, cobblestone: 20 });
  try {
    fake.world.position = { x: 400.5, y: 30, z: 400.5 };
    await body.refresh();
    fake.world.blocks = [
      { name: 'obsidian', found: 1, listed: [{ x: 402, y: 29, z: 400 }] },
      { name: 'lava', found: 3, listed: [{ x: 404, y: 29, z: 400, level: 0 }, { x: 405, y: 29, z: 400, level: 0 }, { x: 406, y: 29, z: 400, level: 0 }] },
    ];
    const r = await body.run('collect', { block: 'obsidian', n: 3 });
    assert.equal(r.ok, true, r.result);
    const fill = fake.tools('use_bucket')[0]?.args;
    assert.equal(fill?.action, 'fill', JSON.stringify(fill));
    assert.equal(fill.count, undefined, 'no count on the refill');
  } finally { await body.close(); await hosts.closeAll(); }
});
