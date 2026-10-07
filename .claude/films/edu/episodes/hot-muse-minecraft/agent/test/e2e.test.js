// test/e2e.test.js - the e2e harness in test/e2e/ against the agent on the fake world (no Minecraft, no model): the strict
// iron-pickaxe route over MCP reaches the pickaxe with no failed step, its CLI writes the run as JSON, a failed step
// counts in strict mode, the reply parsers read the state, and two clients starting at once both get a bot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { runIronRoute, main as ironMain, inventoryOf, positionOf, woodOf, playLine, finishedLine } from './e2e/mcp-iron.mjs';
import { startTogether } from './e2e/two-starts.mjs';

async function agentOnFakeWorld(t, env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-e2e-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '', ...env });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, loopStatsMs: 0 });
  t.after(async () => { await agent.stop('test over'); fs.rmSync(dir, { recursive: true, force: true }); });
  return { agent, dir };
}

test('e2e parsers: the state block, inventory, position, wood, result lines', () => {
  const reply = 'Finished since your last call:\ncollect {"block":"oak_log","n":3}: ok: collected 3 [+3 oak_log]\n\n'
    + 'craft {"item":"stick","n":4}: ok: crafted 4 stick\n\nState (game g1a2b3c, about 9 min left; it also ends after 5 min without calls):\n'
    + 'health 20/20, food 20/20\nposition -12 63 40 in the overworld, facing north\ninventory: oak_log 3, stick 4\n'
    + 'nearby blocks (within 16): dirt 40 (nearest 1 away at 0 62 0); dark_oak_log 7 (nearest 3 away at 1 64 2)\nlast result: none yet';
  assert.deepEqual(inventoryOf(reply), { oak_log: 3, stick: 4 });
  assert.deepEqual(positionOf(reply), { x: -12, y: 63, z: 40 });
  assert.equal(woodOf(reply), 'dark_oak');
  assert.equal(woodOf('State (x):\nnearby blocks (within 16): stripped_birch_log 2'), 'oak', 'stripped logs are not a tree');
  assert.equal(playLine(reply), 'craft {"item":"stick","n":4}: ok: crafted 4 stick');
  assert.equal(finishedLine(reply, 'collect'), 'collect {"block":"oak_log","n":3}: ok: collected 3 [+3 oak_log]');
  assert.equal(finishedLine(reply, 'smelt'), null);
});

test('e2e: the strict iron-pickaxe route over MCP on the fake world, and its CLI', async (t) => {
  const { agent, dir } = await agentOnFakeWorld(t);
  const lines = [];
  const run = await runIronRoute({ url: agent.url, strict: true, print: (l) => lines.push(l), minutes: 2 });
  assert.equal(run.made, true, lines.join('\n'));
  assert.equal(run.failed, 0, lines.join('\n'));
  assert.equal(run.ok, true);
  assert.ok(run.steps.every((s) => s.attempt === 1), 'strict: every step sent once');
  assert.ok(run.steps.length >= 12 && run.calls >= run.steps.length + 2, `${run.steps.length} steps, ${run.calls} calls`);
  const logged = agent.log.tail(200);
  assert.ok(logged.some((r) => r.kind === 'mcp_client' && r.client?.name === 'e2e-iron'), 'the agent logged the harness as an MCP client');
  const actions = logged.filter((r) => r.kind === 'viewer_action');
  assert.ok(actions.length >= 12 && actions.every((r) => r.phases && typeof r.phases === 'object'), 'every action row has its phases');

  const out = path.join(dir, 'run.json');
  const printed = [];
  const code = await ironMain([agent.url, '--out', out, '--minutes', '2'], { print: (l) => printed.push(l), printErr: (l) => printed.push(l) });
  assert.equal(code, 0, printed.join('\n'));
  assert.match(printed.at(-1), /^RESULT PASS \(strict\): [\d.]+ s, \d+ MCP calls, 0 failed step\(s\), iron pickaxe made; game g\w+$/);
  const saved = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(saved.made, true);
  assert.equal(saved.steps.length, run.steps.length);
  assert.equal(await ironMain([], { print: () => {}, printErr: () => {} }), 64, 'usage');
});

test('e2e: two clients starting at once both get a bot; a queued start is a failure there', async (t) => {
  const { agent } = await agentOnFakeWorld(t, { WEB_MAX_SESSIONS: '4' });
  const both = await startTogether({ url: agent.url, n: 2, print: () => {} });
  assert.equal(both.ok, true, JSON.stringify(both.results));
  assert.notEqual(both.results[0].game, both.results[1].game);

  // one bot slot: a third client is queued, which the two-starts check counts as a failure
  const { agent: small } = await agentOnFakeWorld(t, { WEB_MAX_SESSIONS: '1' });
  const crowded = await startTogether({ url: small.url, n: 2, print: () => {} });
  assert.equal(crowded.ok, false);
  assert.ok(crowded.results.some((r) => /in the queue/.test(r.line)), JSON.stringify(crowded.results));
});
