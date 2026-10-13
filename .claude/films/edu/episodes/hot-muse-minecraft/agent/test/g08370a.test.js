// test/g08370a.test.js - what the owner's production game g08370a (2026-10-13) showed, one test each: a walk's failure
// said "Pathfinder stopped: ..., while replanning after a movement failure: The planned bucket drop did not confirm
// landing and water recovery.."; a fight and the death during Muse's shelter step were logged as Muse's and counted
// nowhere. The opening (no live_view, no why or plan) is in test/liveview.test.js, the whole game in test/replay.test.js.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { fromTheirs } from '../src/mineai/skills.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g08370a-')) });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };

test('g08370a: a walk that failed after a water-bucket drop says so in plain words', () => {
  const r = fromTheirs('navigate', { result: { status: 'failed', error: 'Pathfinder stopped: no path found after 3 ms compute; visited 2 nodes, generated 2; closest node was -115,6,-23., while replanning after a movement failure: The planned bucket drop did not confirm landing and water recovery..' } });
  assert.equal(r.ok, false);
  assert.equal(r.result, 'failed: no way there from where you stand; the nearest it got to a way there was -115 6 -23, after a water-bucket drop on the way down did not land as planned.');
  const other = fromTheirs('navigate', { result: { status: 'failed', error: 'Pathfinder stopped: search timed out after 2000 ms compute (limit 2000 ms); no path or usable partial route found; visited 9 nodes, generated 9., while replanning after a movement failure: The step up was blocked.' } });
  assert.equal(other.result, 'failed: no way there was found (the path search gave up), after a move on the way failed (the step up was blocked).');
  assert.doesNotMatch(`${r.result} ${other.result}`, /Pathfinder|replanning|\.\./);
});

test('g08370a: a fight during Muse\'s shelter step is the reflex\'s, logged and counted as such; the shelter stays Muse\'s', async () => {
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 64 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gfight', username: 'Tst_rv_gfight', careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.timeOfDay = 15_000;
    fake.world.durations = { ...(fake.world.durations ?? {}), build_structure: 6_000 };
    const run = body.run('shelter', {});
    await sleep(500);
    fake.world.events.push({ type: 'survival_outcome', observedAt: new Date().toISOString(), payload: { source: 'hostile_reflex', evidence: { response: 'evade', outcome: { response: 'evade', threats: [{ id: 5, name: 'zombie' }], killedTargetIds: [], attacks: 0, healthBefore: 9, healthAfter: 8 } } } });
    const r = await run;
    assert.equal(r.ok, true, r.result);
    const rows = log.tail(500).filter((x) => x.kind === 'care');
    assert.ok(rows.some((x) => x.source === 'reflex' && /fled from zombie/.test(x.text)), JSON.stringify(rows));
    assert.ok(rows.some((x) => x.source === 'muse' && /closed itself in/.test(x.text)), 'the shelter is Muse\'s');
    assert.ok(body.attribution().reflex >= 1, 'counted as a reflex');
  } finally {
    await body.end?.('test over');
    await hosts.closeAll();
  }
});
