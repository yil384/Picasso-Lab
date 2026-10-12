// test/nether.test.js - the way to the Nether through the body (BODY=mineai, ROADMAP M8) against the fake runtime: a
// frame built, lit, entered and the way back without a pos (stepping out of the portal it came through, one side else
// another), a failed frame never continued and taken back by dismantle, the guards of collect obsidian (another game's
// frame, no lava near, the Nether), the portal site's check, get_state's lava, a scan that could not be read, and the
// advice for a portal back that went out (the reviews of M8a).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'nether-log-')) });
const log = createLogger({ dir: null, config });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const lava = (x, y, z) => ({ name: 'lava', found: 1, listed: [{ x, y, z }] });

/** A body on the fake runtime (advise mode), walked away from the world spawn (no obsidian within 32 blocks of it). */
async function netherBody(inventory = {}, { gameId = 'gnether1', hosts = fakeHosts(() => ({ inventory })), at = { x: 150, z: 150 } } = {}) {
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_rv_${gameId}`, careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started.find((h) => h.username === `Tst_rv_${gameId}`));
  const fake = hosts.started.find((h) => h.username === `Tst_rv_${gameId}`).fake;
  await body.ready;
  const walk = await body.run('go_to', { x: at.x, y: 64, z: at.z });
  assert.equal(walk.ok, true, walk.result);
  return { body, fake, hosts };
}

test('nether: a frame built, lit and entered; back without a pos, out of the portal first (one side, else another)', async () => {
  const { body, fake } = await netherBody({ obsidian: 14, flint_and_steel: 1, cooked_beef: 4 });
  try {
    let r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    r = await body.run('portal', { action: 'light' });
    assert.equal(r.ok, true, r.result);
    assert.equal(r.result, 'lit the Nether portal (6 portal blocks)');
    r = await body.run('portal', { action: 'enter' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^went through the portal; you came out in the Nether at 3 70 4/);
    assert.doesNotMatch(r.result, /stepped out/, 'in front of a fresh frame it goes straight in');
    assert.match(body.state(), /^position 3 70 4 in the Nether/m);
    // the way back: no pos (the portal it came out of here, never the Overworld frame), the first side blocked
    fake.world.navigateFail = (a) => a.x === 6;
    // walks longer than a submission's first wait, so each is waited on by its action id (the review's case)
    fake.world.durations = { ...(fake.world.durations ?? {}), navigate: 1_800 };
    r = await body.run('portal', { action: 'enter' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /went through the portal; you came out in the overworld at .* \(stepped out of the portal first\)$/);
    const walks = fake.tools('navigate').slice(-2).map((c) => c.args.x);
    assert.deepEqual(walks, [6, 0], 'one side, then the other');
    const ids = fake.calls.filter((c) => c.tool === 'wait_for_action').map((c) => c.args.action_id);
    assert.equal(new Set(ids).size, ids.length, 'each walk waited on its own action, never the one before');
    assert.equal(fake.tools('enter_nether_portal').at(-1).args.x, 3);
    assert.match(body.state(), /in the overworld/);
  } finally { await body.close(); }
});

test('nether: a frame that kept rock fails, is never continued at that site, and dismantle takes its obsidian back', async () => {
  const { body, fake } = await netherBody({ obsidian: 14 });
  try {
    fake.world.buildKept = 2;
    let r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, false);
    assert.match(r.result, /not a portal frame: 2 frame cells kept deepslate instead of obsidian\. Take the obsidian back \(portal dismantle\)/);
    // just back through a portal: the cells unloaded for a moment; dismantle waits for them
    fake.world.unloadedUntil = Date.now() + 1_500;
    r = await body.run('portal', { action: 'dismantle' });
    assert.equal(r.ok, true, r.result);
    assert.ok(fake.tools('view_blocks').filter((c) => c.args.cells).length >= 2, 'read again until loaded');
    assert.equal(r.result, 'took back 12 obsidian from your last frame');
    const collects = fake.tools('collect_block');
    assert.equal(collects.length, 12, 'one exact collect a frame cell');
    assert.ok(collects.every((c) => Number.isInteger(c.args.x) && c.args.block_name === 'obsidian' && !c.args.count));
    fake.world.buildKept = 0;
    r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.doesNotMatch(r.result, /continued/, 'a new frame, never the failed one again');
  } finally { await body.close(); }
});

test('nether: the portal site is read around the frame: water next to it, or nothing readable, refuses the build', async () => {
  const { body, fake } = await netherBody({ obsidian: 14 });
  try {
    fake.world.boxAt = (x, y) => (y === 62 ? 'water' : 'air');
    let r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, false);
    assert.match(r.result, /^water at -?\d+ 62 -?\d+ is next to where the portal frame would stand/);
    fake.world.boxAt = (x, y) => (y === 66 ? 'lava' : 'air');
    r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.code, 'LAVA');
    // F7 of the log hunt: a frame cut into rock is refused before any obsidian is spent
    fake.world.boxAt = (x, y) => (y >= 64 ? 'deepslate' : 'stone');
    r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.match(r.result, /^the frame would be cut into rock \(10 of its cells hold deepslate\)/);
    fake.world.boxAt = null;
    fake.world.viewFail = true;
    r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.match(r.result, /could not be read/);
    assert.equal(fake.tools('build_structure').length, 0, 'nothing placed');
  } finally { await body.close(); }
});

test('nether: collect obsidian runs only near lava, in the Overworld, with no other game\'s frame near by', async () => {
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 14, water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1 } }));
  // away from the frames the tests above built (the registry is the process's, as the world is the server's)
  const at = { x: -150, z: 150 };
  const a = await netherBody({}, { gameId: 'gneth_a', hosts, at });
  const b = await netherBody({}, { gameId: 'gneth_b', hosts, at });
  try {
    a.fake.world.blocks = [];
    let r = await a.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.code, 'LAVA', r.result);
    assert.match(r.result, /^no lava pool within 16 blocks to make obsidian from/);
    // F2 of the log hunt: flowing lava near by is not a pool to make obsidian from
    a.fake.world.blocks = [{ name: 'lava', found: 3, listed: [{ x: -148, y: 60, z: 150, level: 3 }, { x: -147, y: 60, z: 150, level: 5 }] }];
    r = await a.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.code, 'LAVA');
    assert.match(r.result, /is flowing, not a pool/);
    // a pool: it runs, and while it runs get_state says how far it got
    a.fake.world.blocks = [{ name: 'lava', found: 2, listed: [{ x: -148, y: 60, z: 150, level: 3 }, { x: -149, y: 59, z: 151, level: 0 }] }];
    a.fake.world.durations = { ...(a.fake.world.durations ?? {}), collect_block: 2_500 };
    a.fake.world.progressFor = { collect_block: { broken: 3, gained: 3, requested: 4 } };
    const running = a.body.run('collect', { block: 'obsidian', n: 4 });
    await sleep(2_000);
    assert.match(a.body.state(), /^doing now: collect obsidian 4 \(3 of 4 so far\)/m);
    r = await running;
    a.fake.world.durations.collect_block = 20;
    a.fake.world.progressFor = null;
    assert.equal(r.ok, true, r.result);
    // another game builds a frame near by: a's collect obsidian could take it
    const built = await b.body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(built.ok, true, built.result);
    r = await a.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.ok, false);
    assert.match(r.result, /^another player's obsidian \(a portal frame\) is at .* within 160 blocks/);
    // b's own: its collect obsidian is refused near its lit portal, but dismantle takes its frame back
    b.fake.world.blocks = [lava(-148, 60, 150), { name: 'nether_portal', found: 6, listed: [{ x: -150, y: 64, z: 151 }] }];
    await b.body.rescan();
    r = await b.body.run('collect', { block: 'obsidian', n: 4 });
    assert.match(r.result, /^a lit portal is loaded near by/);
    // in the Nether: never
    a.fake.world.dimension = 'the_nether';
    await a.body.refresh();
    r = await a.body.run('collect', { block: 'obsidian', n: 4 });
    assert.match(r.result, /^obsidian is made and collected in the Overworld only/);
  } finally { await a.body.close(); await b.body.close(); }
});

test('nether: get_state lists lava and portals; a scan that could not be read keeps the blocks known', async () => {
  const { body, fake } = await netherBody({});
  try {
    fake.world.blocks = [lava(155, 60, 150)];
    await body.rescan();
    assert.match(body.state(), /nearby blocks \(within 32\):.*\blava 1 \(nearest/);
    fake.world.viewFail = true;
    await body.rescan();
    assert.match(body.state(), /\blava 1 \(nearest/, 'kept');
  } finally { await body.close(); }
});

test('nether: the portal back went out: said only away from it and after a settled scan, with portal light when flint and steel is carried', async () => {
  const hosts = fakeHosts(() => ({ inventory: { flint_and_steel: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gnether_adv', username: 'Tst_rv_gnether_adv', careTickMs: 30, careIdleMs: 50, portalSettleMs: 300 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.dimension = 'the_nether';
    fake.world.position = { x: 3.5, y: 70, z: 4.5 };
    await body.refresh();
    fake.world.blocks = []; // the chunks around not in yet: no portal block found
    await body.rescan();
    assert.equal(body.advice().find((x) => x.kind === 'portal'), undefined, 'standing in the portal it came out of: lit');
    // a few blocks off, before the scan settled: nothing said yet
    fake.world.position = { x: 9.5, y: 70, z: 4.5 };
    await body.refresh();
    assert.equal(body.advice().find((x) => x.kind === 'portal'), undefined, 'an early scan says nothing');
    await sleep(350);
    await body.rescan();
    const a = body.advice().find((x) => x.kind === 'portal');
    assert.equal(a.text, 'the portal back at 3 70 4 is not lit any more');
    assert.deepEqual(a.hint, { skill: 'portal', args: { action: 'light', pos: { x: 3, y: 70, z: 4 } } });
    fake.world.blocks = [{ name: 'nether_portal', found: 6, listed: [{ x: 3, y: 70, z: 4 }] }];
    await body.rescan();
    assert.equal(body.advice().find((x) => x.kind === 'portal'), undefined, 'lit: nothing to say');
    // a scan with a batch unreadable: not trusted
    fake.world.blocks = [];
    fake.world.viewFailEvery = 2;
    await body.rescan();
    assert.equal(body.advice().find((x) => x.kind === 'portal'), undefined, 'a partly unreadable scan says nothing');
  } finally { await body.close(); }
});

test('a reflex takes a craft over: made means ok (with a note), cut short means once more after it lets go, then INTERRUPTED', async () => {
  const hosts = fakeHosts(() => ({ inventory: { iron_ingot: 3, oak_planks: 20, crafting_table: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gtakeover', username: 'Tst_rv_gtakeover', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    // the production case (g64e8c5): the shield made, then their guard reflex took the body to equip it
    // the reflex put the fresh shield in the off-hand (the main inventory has none: F1 of the log hunt) and the
    // temporary table stayed standing: ok, said so, the table taken back
    fake.world.takeovers.push({ tool: 'craft_item', made: true, offHand: 'shield', tableLeft: true, error: 'Equip an available shield before nearby hostiles require a guard.' });
    let r = await body.run('craft', { item: 'shield', n: 1 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^crafted 1 shield; it is in your off-hand; a reflex took the body over meanwhile \(it put a shield in the off-hand with hostile mobs near\); the crafting table put down for the craft was picked up again/);
    assert.equal(r.delta.shield, 1);
    assert.equal(fake.tools('collect_block').at(-1).args.block_name, 'crafting_table', 'mined back at its place');
    // cut short before the craft: sent once more once the reflex let go, and done
    fake.world.takeovers.push({ tool: 'craft_item', made: false, error: '[ACTION_PREEMPTED] fight response for zombie#12 at 1,64,2 (2.5 blocks).' });
    r = await body.run('craft', { item: 'stick', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /a reflex took the body over \(it fought a zombie\); tried again once it let go; crafted 4 stick/);
    assert.equal(fake.tools('craft_item').filter((c) => c.args.items[0].item_name === 'stick').length, 2);
    // cut short twice: a plain INTERRUPTED, never a bare failure
    fake.world.takeovers.push({ tool: 'craft_item', made: false, error: 'fight response for skeleton#3' }, { tool: 'craft_item', made: false, error: 'fight response for skeleton#3' });
    r = await body.run('craft', { item: 'stick', n: 4 });
    assert.equal(r.ok, false);
    assert.equal(r.code, 'INTERRUPTED');
    assert.match(r.result, /a reflex took the body over \(it fought a skeleton\) before craft item was done; nothing is wrong with the step: send it again/);
    // F4 of the log hunt: a collect with all its blocks in when an evade took over: done; one cut short leads with what it got
    fake.world.takeovers.push({ tool: 'collect_block', made: true, error: 'evade response for zombie#29420 at -11775,104,2346 (7.6 blocks) (hurt: health is below the engagement minimum).' });
    r = await body.run('collect', { block: 'oak_log', n: 6 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^mined 6 oak_log and picked up 6 oak_log .*; a reflex took the body over meanwhile \(it got out of the way of a zombie\)$/);
    fake.world.takeovers.push({ tool: 'collect_block', made: false, error: 'evade response for zombie#1 (hurt).' });
    r = await body.run('collect', { block: 'oak_log', n: 6 });
    assert.equal(r.code, 'INTERRUPTED');
    assert.match(r.result, /a reflex took the body over \(it got out of the way of a zombie\) before collect block was done/);
    // F10 of the log hunt: reflexes during a step count as the body's, a step refused before it ran is not Muse's action
    const before = body.attribution();
    fake.world.interruptionsFor = { collect_block: ['fight response for zombie#1 at 1,2,3 (2.0 blocks).', 'fight response for zombie#1 at 1,2,3 (2.0 blocks).', 'hide response for skeleton#4'] };
    r = await body.run('collect', { block: 'oak_log', n: 2 });
    fake.world.interruptionsFor = null;
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /\[meanwhile on its own: it fought a zombie, it hid from a skeleton\]$/);
    await body.run('portal', { action: 'dismantle' }); // refused before it ran: no frame
    const after = body.attribution();
    assert.equal(after.reflex - before.reflex, 2, 'two distinct reflex responses in the step');
    assert.equal(after.muse - before.muse, 1, 'the collect, not the refused dismantle');
    // F6 of the log hunt: their station hitch, then the same craft works: tried once more, ok
    fake.world.takeovers.push({ tool: 'craft_item', made: false, error: 'The block appeared, but consumption of crafting_table was not observed (inventory 1 → 1).' });
    r = await body.run('craft', { item: 'stick', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^the crafting table put down for it was not seen in place \(a timing hitch\); tried again; crafted 4 stick/);
    // a real failure stays a failure
    fake.world.fail.craft_item = '[CRAFT_MATERIALS_MISSING] not enough oak_planks';
    r = await body.run('craft', { item: 'stick', n: 4 });
    assert.notEqual(r.code, 'INTERRUPTED');
  } finally { await body.close(); }
});
