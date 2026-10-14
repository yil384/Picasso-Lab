// test/prelaunch.test.js - open items of the earlier log hunts closed before the launch (2026-10-14, the sweep in
// ~/picasso-work/muse-prelaunch-open-items.md): a cancelled action that does not let go no longer holds the step past
// a grace (F8 of 2026-10-12: 360 s over the limit), and obsidian already formed beside the bot is mined at its cells
// when no lava pool is near (the guard's LAVA refusal used to stand in front of it).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'prelaunch-')), MC_PORT: '25946' });
const log = createLogger({ dir: null, config, keep: 500 });

async function bodyOf(gameId, inventory, opts = {}) {
  const hosts = fakeHosts(() => ({ inventory }));
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_rv_${gameId}`, careTickMs: 30, careIdleMs: 50, ...opts });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  return { body, fake, hosts };
}

test('F8: a stopped action that does not let go ends the step after the grace; the next step stops it first and runs', async () => {
  const { body, fake, hosts } = await bodyOf('gpre1', { wooden_pickaxe: 1 }, { cancelGraceMs: 400 });
  try {
    fake.world.durations = { ...(fake.world.durations ?? {}), collect_block: 5_000 };
    fake.world.ignoreCancel = true;
    const t0 = Date.now();
    const running = body.run('collect', { block: 'oak_log', n: 3 });
    await until(() => fake.tools('collect_block').length > 0);
    await sleep(100);
    await body.stop('stopped through MCP');
    const r = await running;
    const ms = Date.now() - t0;
    assert.equal(r.ok, false);
    assert.equal(r.code, 'STOPPED');
    assert.match(r.result, /^stopped: stopped through MCP \(it had not let go 0 s after being stopped: it is stopped again before your next step\)/, r.result);
    assert.ok(ms < 3_000, `the step ended after the grace, not with their action (${ms} ms)`);
    // the next step: their leftover action is stopped first, then this one runs
    fake.world.ignoreCancel = false;
    fake.world.durations.collect_block = 20;
    const next = await body.run('collect', { block: 'oak_log', n: 1 });
    assert.equal(next.ok, true, next.result);
    assert.ok(fake.tools('cancel_foreground_action').length >= 2, 'the leftover was stopped again');
  } finally { await body.close(); await hosts.closeAll(); }
});

test('obsidian already formed beside the bot is mined at its cells when no lava pool is near; with none formed, LAVA as before', async () => {
  const { body, fake, hosts } = await bodyOf('gpre2', { diamond_pickaxe: 1, water_bucket: 1, cobblestone: 20 });
  try {
    fake.world.position = { x: 300.5, y: 40, z: 300.5 };
    await body.refresh();
    const p = { x: 300, y: 40, z: 300 };
    fake.world.blocks = [
      { name: 'obsidian', found: 2, listed: [{ x: p.x + 2, y: p.y - 1, z: p.z }, { x: p.x + 3, y: p.y - 1, z: p.z }] },
      { name: 'lava', found: 3, listed: [{ x: p.x + 60, y: p.y, z: p.z, level: 0 }] },
    ];
    const r = await body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /mined the obsidian already formed beside you \(2 of the 4: the rest needs a lava pool: no lava pool within 16 blocks to make obsidian from\. The nearest lava pool loaded is at 360 40 300/);
    const digs = fake.tools('collect_block').map((c) => c.args);
    assert.deepEqual(digs.map((d) => [d.x, d.y, d.z]), [[302, 39, 300], [303, 39, 300]], 'at its cells, no search');
    // nothing formed near: the refusal as before
    fake.world.blocks = [{ name: 'lava', found: 3, listed: [{ x: p.x + 60, y: p.y, z: p.z, level: 0 }] }];
    const no = await body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(no.code, 'LAVA');
  } finally { await body.close(); await hosts.closeAll(); }
});
