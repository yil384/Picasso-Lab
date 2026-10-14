// test/soak.test.js - the nightly soak's scripted player (scripts/soak.mjs) against the agent on the fake runtime: a
// whole Nether-and-back game through the MCP tools, following the LAVA refusal's named pool, with the failures, stuck
// items and milestones recorded and the night's report written; production is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { createWeb } from '../src/web.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { playGame, reportText, failureKind, coordsAfter, main } from '../scripts/soak.mjs';

test('soak: failure kinds and named coordinates read from the replies', () => {
  assert.equal(failureKind('LAVA', 'no lava pool within 16 blocks to make obsidian from. The nearest lava pool loaded is at -135 -30 -185, 33 blocks away'), 'LAVA no lava pool within # blocks to make obsidian from');
  assert.equal(failureKind(null, 'failed: no way there was found (the path search gave up); the nearest it got'), 'FAILED no way there was found');
  assert.deepEqual(coordsAfter('The nearest lava pool loaded is at -135 -30 -185, 33 blocks away', 'The nearest lava pool loaded is at'), { x: -135, y: -30, z: -185 });
  assert.deepEqual(coordsAfter('the ground there is at y=103, so go_to -101 104 -184 (walked to', 'so go_to'), { x: -101, y: 104, z: -184 });
  assert.equal(coordsAfter('nothing here', 'so go_to'), null);
});

test('soak: a whole scripted game to the Nether and back through the MCP tools, following the pool a LAVA refusal names; the report', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'soak-')), MC_PORT: '25948' });
  const log = createLogger({ dir: null, config, keep: 2000 });
  // a pool by the world spawn (where the bot starts: refused there, so never named) and one farther off
  const pool = [...Array.from({ length: 3 }, (_, k) => ({ x: 320 + k, y: 40, z: 300, level: 0 })), ...Array.from({ length: 6 }, (_, k) => ({ x: 370 + k, y: 40, z: 300, level: 0 }))];
  const hosts = fakeHosts(() => ({
    position: { x: 300.5, y: 64, z: 300.5 },
    blocks: [{ name: 'birch_log', found: 40, listed: [{ x: 304, y: 64, z: 301, distance: 4 }] }, { name: 'lava', found: 6, listed: pool }],
  }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_MCP_REQUESTS_PER_MINUTE: '100000' }), log, skills: MINEAI_SKILLS, mcpCallMs: 2_000,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_rv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  try {
    // the gravel gives a flint the first time (the fake's gravel never does)
    const started = (async () => { for (let i = 0; i < 200 && !hosts.started[0]; i++) await new Promise((r) => { setTimeout(r, 20); }); if (hosts.started[0]) hosts.started[0].fake.world.side = { collect_block: { flint: 1 } }; })();
    const lines = [];
    const rec = await playGame({ url, name: 'e2e-soak-test', minutes: 3, waitCalls: 4, print: (l) => lines.push(l) });
    await started;
    assert.equal(rec.outcome, 'nether and back', lines.join('\n'));
    assert.match(rec.game, /^g[0-9a-f]{6}$/);
    assert.ok(rec.failures.some((f) => f.code === 'LAVA' && /^LAVA no lava pool within # blocks/.test(f.kind)), JSON.stringify(rec.failures));
    assert.ok(lines.some((l) => /go_to \{"x":373,"y":41,"z":300\}/.test(l)), `went to the pool the refusal named, not the one by the spawn: ${lines.join('\n')}`);
    assert.ok(['nether', 'back'].every((k) => rec.milestones.some((m) => m.key === k && m.atS !== null)), JSON.stringify(rec.milestones));
    const md = reportText({ url, date: '2026-10-14', games: [rec] });
    assert.match(md, /^# Soak 2026-10-14\n/);
    assert.match(md, /\| g[0-9a-f]{6} \| nether and back \| \d+:\d\d \|/);
    assert.match(md, /## Top failure kinds\n\n- \*\*LAVA no lava pool within # blocks/);
    assert.match(md, /## Milestones \(minutes into each game\)/);
  } finally {
    await web.stop?.();
    await hosts.closeAll();
  }
});

test('soak: production and a non-test client name are refused', async () => {
  const errs = [];
  assert.equal(await main(['https://play.picasso-lab.com'], { print: () => {}, printErr: (l) => errs.push(l) }), 2);
  assert.match(errs.at(-1), /production; the soak runs on staging only/);
  assert.equal(await main(['http://127.0.0.1:9', '--name', 'muse'], { print: () => {}, printErr: (l) => errs.push(l) }), 2);
  assert.match(errs.at(-1), /must start with "e2e-"/);
});
