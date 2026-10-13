// test/ga13a88.test.js - what the owner's long production run (game ga13a88, 2026-10-12, to the Nether and back)
// showed, one test each: the body's own dig-in before the first call ran again every 8 s (24 blocks down, and the first
// collect found no path out); a shelter closed at dusk was "no closed shelter" all night; the path search's words; a
// walk that ended 2 blocks short counted as a failure; birch leaves in a portal frame cost 10 obsidian (now cleared); a dismantle's
// cells that held another block; bucket {block: water}. The whole game is in test/replay.test.js.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { fromTheirs, MINEAI_SKILLS } from '../src/mineai/skills.js';
import { createCare } from '../src/mineai/care.js';
import { tolerate } from '../src/tolerant.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'ga13a88-')) });
const log = createLogger({ dir: null, config });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const NOW = Date.parse('2026-10-12T22:25:10Z');

test('ga13a88: before the first call the body digs in once and waits there, not two blocks deeper every 8 s', async () => {
  const calls = [];
  let t = NOW;
  const state = { situation: { dimension: 'overworld', vitals: { health: 20, food: 20 }, clock: { timeOfDay: 15000 }, position: { x: -23.5, y: 81, z: 234.5, headingDegrees: 0 }, nearby: { hostiles: [], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' } } };
  const care = createCare({
    situation: () => state.situation, latest: () => ({ inventory: {}, equipment: {} }), stacks: () => [], refresh: async () => {},
    act: async (call) => {
      calls.push(call);
      if (call.tool === 'navigate') state.situation.position = { ...state.situation.position, y: call.args.y };
      return { output: { action: call.tool, result: { status: 'succeeded' } } };
    },
    rpc: async () => ({}), plan: () => ({ calls: [] }), idle: () => true, idleSince: () => t - 10_000, furnaceNear: () => false, tableNear: () => false,
    event: () => {}, now: () => t, tickMs: 1e9, mode: 'advise',
  });
  await care.tick();
  assert.deepEqual(calls.map((c) => c.tool), ['navigate', 'pick_up_items']);
  for (let i = 0; i < 5; i++) { t += 60_000; await care.tick(); } // production: every 8 s for 2.5 minutes
  assert.equal(calls.filter((c) => c.tool === 'navigate').length, 1, 'dug in once');
  assert.equal(state.situation.position.y, 79);
  // moved away (a stranger's push, a fall): it may dig in again where it is, after the cool-down
  state.situation.position = { x: -10.5, y: 70, z: 230.5, headingDegrees: 0 };
  t += 60_000;
  await care.tick();
  assert.equal(calls.filter((c) => c.tool === 'navigate').length, 2);
});

test('ga13a88: a shelter closed at dusk is the coming night\'s: the advice says to wait in it, not that there is none', async () => {
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 64, wooden_pickaxe: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gdusk', username: 'Tst_rv_gdusk', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.timeOfDay = 11_500; // dusk: night in about 52 s
    await sleep(300);
    const r = await body.run('shelter', {});
    assert.equal(r.ok, true, r.result);
    fake.world.timeOfDay = 15_130; // the night (production: "night (time 15130): no closed shelter around you")
    assert.ok(await until(() => body.advice().some((a) => a.kind === 'waiting')), JSON.stringify(body.advice()));
    assert.equal(body.advice().some((a) => a.kind === 'night'), false);
  } finally {
    await body.end?.('test over');
    await hosts.closeAll();
  }
});

test('ga13a88: the path search in plain words; a walk that ends within 2 blocks is done', () => {
  const failed = (tool, error, extra = {}) => fromTheirs(tool, { result: { status: 'failed', error, ...extra } });
  const cases = [
    ['collect_block', 'no path found after 0 ms compute; visited 2 nodes, generated 2; closest node was -24,57,235 Broke 0 matching blocks', /^failed: no way there from where you stand; the nearest it got to a way there was -24 57 235\. Broke 0/],
    ['use_bucket', 'Pathfinder could not reach the target: search timed out after 2000 ms compute (limit 2000 ms); no path or usable partial route found; visited 3843 nodes, generated 8849; closest node was -2,11,266.', /^failed: no way there was found \(the path search gave up\); the nearest it got to a way there was -2 11 266\.$/],
    ['use_bucket', 'Pathfinder could not reach the target: planning_stalled: Path planning stalled for 20004 ms without a route commitment or meaningful displacement (1 block horizontally or 2 vertically); limit 20000 ms. Repeated search invalidation does not renew this limit..', /^failed: the walk there got stuck \(no way forward for 20 s\)\.$/],
    ['navigate', 'Pathfinder stopped: Full air was not observed at the breathing stop.', /^failed: it stopped to breathe on the way and found no open air there\./],
  ];
  for (const [tool, error, want] of cases) {
    const r = failed(tool, error);
    assert.equal(r.ok, false);
    assert.match(r.result, want, error);
    assert.doesNotMatch(r.result, /nodes|ms compute|planning_stalled|Pathfinder/);
  }
  // 2 blocks short of a cell next to lava: as near as a path goes (production: a failure, and the obsidian was mined from there)
  const near = fromTheirs('navigate', { result: { status: 'failed', error: 'Pathfinder stopped: search timed out after 2000 ms compute (limit 2000 ms); no path or usable partial route found; visited 25291 nodes, generated 47617; closest node was -6,-22,151.', navigation: { end: { x: -6, y: -22, z: 150 }, target: { x: -5, y: -22, z: 152 }, remainingDistance: 2.2 } } });
  assert.equal(near.ok, true, near.result);
  assert.match(near.result, /^walked to -6 -22 150, 2 blocks short of -5 -22 152 \(as near as a path goes\)$/);
  const far = fromTheirs('navigate', { result: { status: 'failed', error: 'Pathfinder stopped: Full air was not observed at the breathing stop.', navigation: { end: { x: -25, y: 62, z: 124 }, target: { x: -30, y: 60, z: 122 }, remainingDistance: 6 } } });
  assert.equal(far.ok, false, '6 blocks short is not there');
});

test('ga13a88: bucket {block: water} is bucket {liquid: water}', () => {
  const t = tolerate(MINEAI_SKILLS.schemas.bucket, { action: 'fill', block: 'water' }, { skill: 'bucket' });
  assert.deepEqual(MINEAI_SKILLS.validate('bucket', t.args), { ok: true, args: { action: 'fill', liquid: 'water' } });
});

test('ga13a88: leaves where a portal frame would stand are cleared before any obsidian is placed (g809e1b); a dismantle says which cells held something else', async () => {
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 14, flint_and_steel: 1, diamond_pickaxe: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gleaves', username: 'Tst_rv_gleaves', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.position = { x: -10.5, y: 88, z: 153.5 }; // the hilltop of the third frame, far from the world spawn
    const feet = Math.floor(fake.world.position.y);
    fake.world.boxAt = (x, y) => (y >= feet + 1 ? 'birch_leaves' : 'air');
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /cleared \d+ cells of birch_leaves for it first\)$/);
    assert.equal(fake.world.inventory.get('obsidian') ?? 0, 2, 'the frame took 12');
    // a frame built, then taken back where its cells hold another block: said plainly, once
    fake.world.boxAt = null;
    fake.world.fail.collect_block = 'The requested cell at -10,91,154 is birch_leaves, not obsidian. Broke 0 matching blocks; inventory gained 0/1 requested items.';
    const d = await body.run('portal', { action: 'dismantle' });
    assert.match(d.result, /^took back no obsidian from your last frame \(\d+ cells held birch_leaves, not obsidian\)$/);
    assert.doesNotMatch(d.result, /Broke 0|requested cell/);
  } finally {
    await body.end?.('test over');
    await hosts.closeAll();
  }
});
