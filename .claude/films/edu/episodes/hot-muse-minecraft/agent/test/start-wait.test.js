// test/start-wait.test.js - start_game right after a restart (staging, 2026-10-13: the agent answered in about 5 s,
// Paper in about 17 s, and a start_game in between failed with "the Mine AI runtime failed while starting"): it first
// asks whether the Minecraft server answers a status ping, waits for it (bounded), and else says SERVER_STARTING with
// when to try again, nothing started (src/mc-ready.js, src/mcp.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { createServerReady } from '../src/mc-ready.js';
import { RESULT_CODES } from '../src/contracts.js';

test('mc-ready: pings until the server answers (bounded), then believes it for a while; a closed port is not ready', async () => {
  let n = 0;
  const ready = createServerReady({ host: '127.0.0.1', port: 25565, everyMs: 10, ping: async () => { n += 1; if (n < 3) throw Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }); return { version: {} }; } });
  const r = await ready({ waitMs: 5_000 });
  assert.equal(r.ok, true);
  assert.equal(n, 3, 'two refusals, then the answer');
  assert.deepEqual(await ready({ waitMs: 5_000 }), { ok: true, waitedMs: 0 }, 'believed without asking again');
  const atOnce = createServerReady({ host: '127.0.0.1', port: 25565, ping: async () => { await new Promise((r) => setTimeout(r, 30)); return {}; } });
  assert.deepEqual(await atOnce({ waitMs: 5_000 }), { ok: true, waitedMs: 0 }, 'up at the first ask: no wait (not logged)');
  assert.equal(n, 3);
  const never = createServerReady({ host: '127.0.0.1', port: 25565, everyMs: 10, ping: async () => { throw Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }); } });
  const r2 = await never({ waitMs: 50 });
  assert.equal(r2.ok, false);
  assert.equal(r2.error, 'ETIMEDOUT');
  // the real ping, at a port nothing listens on: refused at once
  const closed = createServerReady({ host: '127.0.0.1', port: 1, version: '1.21.4', everyMs: 50 });
  const r3 = await closed({ waitMs: 200 });
  assert.equal(r3.ok, false, JSON.stringify(r3));
});

test('start_game while the server is still starting: SERVER_STARTING, typed, with when to try again; then it starts', async () => {
  let up = false;
  const asked = [];
  const serverReady = async (w) => { asked.push(w.waitMs); return up ? { ok: true, waitedMs: 1_200 } : { ok: false, waitedMs: w.waitMs, error: 'ECONNREFUSED' }; };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'start-wait-'));
  const agent = await startAgent({ config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' }), fakeBot: true, serverReady, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    const r = await c.callTool({ name: 'start_game', arguments: {} });
    assert.equal(r.isError, true);
    assert.match(r.content[0].text, /^SERVER_STARTING: the Minecraft server is still starting \(it restarted a moment ago\); nothing was started\. Call start_game again in 15 s\.$/);
    assert.deepEqual(r.structuredContent, { code: 'SERVER_STARTING', retryAfterS: 15 });
    assert.ok(asked[0] >= 20_000 && asked[0] <= 30_000, 'waited a bounded time first, within the call');
    assert.ok(RESULT_CODES.includes('SERVER_STARTING'));
    up = true;
    const ok = await c.callTool({ name: 'start_game', arguments: {} });
    assert.ok(!ok.isError, ok.content[0].text);
    assert.match(ok.content[0].text, /^New game g\w+/);
    const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n')).map((l) => JSON.parse(l));
    assert.ok(rows.some((x) => x.kind === 'mcp_server_wait' && x.ok === false), 'the wait is logged');
    await c.callTool({ name: 'end_game', arguments: {} });
  } finally {
    await c.close();
    await agent.stop();
  }
});
