// test/mcp-log.test.js - every MCP call reaches the log (F9 of the log hunt): the tool, a scrubbed summary of its
// arguments, the reply's code, each step's outcome and the Body advice the reply showed; a call the schema refuses is
// logged as mcp_refused; a resume handle never appears in the log.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'mcplog-')) });

test('mcp log: every call, its code, its steps and the advice shown; schema refusals too; no resume handle', async () => {
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: { oak_log: 2 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS,
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    let r = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    const handle = /game: "([^"]+)"/.exec(r.content[0].text)?.[1];
    assert.ok(handle);
    hosts.started[0].fake.world.timeOfDay = 15000; // night: the reply carries Body advice
    r = await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'oak_planks', n: 4 } } });
    r = await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'diamond_pickaxe', n: 1 } } }); // refused by the check
    await c.callTool({ name: 'play', arguments: { skill: 'fly', args: {} } }).catch(() => null); // refused by the schema
    r = await c.callTool({ name: 'get_state', arguments: {} });
    const rows = log.tail(500);
    const calls = rows.filter((x) => x.kind === 'mcp_call');
    assert.deepEqual(calls.map((x) => x.tool).filter((t) => t !== 'get_state'), ['start_game', 'play', 'play']);
    const [start, ok, need] = calls.filter((x) => x.tool !== 'get_state');
    assert.equal('adult' in start, false, 'no age logged');
    assert.ok(start.game && /^g/.test(start.game));
    assert.equal(ok.skill, 'craft');
    assert.match(ok.args, /oak_planks/);
    assert.equal(ok.stepsOut[0].status, 'confirmed');
    assert.equal(need.code, 'NEED_ITEMS');
    assert.ok(need.isError && need.lead.length > 0);
    assert.ok(calls.some((x) => (x.advice ?? []).some((a) => a.kind === 'night')), 'the advice shown is logged');
    const refused = rows.filter((x) => x.kind === 'mcp_refused');
    assert.equal(refused.length, 1);
    assert.equal(refused[0].code, 'BAD_ARGS');
    assert.ok(!JSON.stringify(rows).includes(handle), 'the resume handle never reaches the log');
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});
