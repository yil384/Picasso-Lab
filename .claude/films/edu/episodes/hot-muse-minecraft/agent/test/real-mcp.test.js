// test/real-mcp.test.js - ROADMAP M2's MCP work on a real Paper 1.21.4 server, through the whole stack (startAgent,
// /mcp, the guest bot, window clicks): craft_batch with the planks, table and sticks the check adds, timed against
// the same items as separate crafts; a play_sequence re-sent after a cut stream runs once; a refusal before anything
// runs. Prepared evidence: the items come from the server console (give), not from the world.
// Skipped unless MC_REAL=1. Needs the server on MC_HOST:MC_PORT (default 127.0.0.1:25565) and its console FIFO in
// MC_CONSOLE (server/start.sh makes it). Bots join as Tst_mcp_<game>; their inventory is cleared and they leave at the end.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent, usernameFor } from '../src/index.js';

const REAL = process.env.MC_REAL === '1';
const CONSOLE = process.env.MC_CONSOLE;
const text = (r) => r.content.map((x) => x.text).join('\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => fs.appendFileSync(CONSOLE, `${line}\n`);

test('real server: craft_batch with one table, a re-sent play_sequence runs once, a refusal runs nothing', {
  skip: (!REAL || !CONSOLE) && 'set MC_REAL=1 and MC_CONSOLE (a Paper 1.21.4 on MC_HOST:MC_PORT and its console FIFO)',
  timeout: 240_000,
}, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'real-mcp-'));
  const config = loadConfig({ ...process.env, WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '', MC_USERNAME: 'Tst_mcp', MC_VIEWER_PORT: '0', STREAM_ENABLED: 'false' });
  const agent = await startAgent({ config, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'real-test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  let player = null;
  const timings = {};
  try {
    const start = text(await c.callTool({ name: 'start_game', arguments: { adult: true } }));
    const id = /game (g[0-9a-f]{6})/.exec(start)[1];
    const handle = /game: "([A-Za-z0-9_-]{22})"/.exec(start)[1];
    player = usernameFor('Tst_mcp', id);
    const inventory = async () => (await c.callTool({ name: 'get_state', arguments: {} })).structuredContent.state.inventory ?? {};
    /** Clear the bot, give it items, wait until the client sees them. */
    async function load(items) {
      say(`clear ${player}`);
      for (const [name, n] of Object.entries(items)) say(`give ${player} ${name} ${n}`);
      for (let i = 0; i < 40; i++) {
        const inv = await inventory();
        if (Object.entries(items).every(([k, n]) => inv[k] === n) && Object.keys(inv).length === Object.keys(items).length) return;
        await sleep(250);
      }
      throw new Error(`the items did not arrive: ${JSON.stringify(await inventory())}`);
    }
    const items = [{ item: 'wooden_pickaxe', n: 1 }, { item: 'wooden_axe', n: 1 }, { item: 'stone_pickaxe', n: 1 }];

    // 1. a refusal: nothing runs
    await load({ oak_log: 3 });
    const refused = await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } } });
    assert.equal(refused.structuredContent.code, 'NEED_ITEMS');
    assert.deepEqual(await inventory(), { oak_log: 3 });

    // 2. craft_batch: the check adds planks, a table and sticks into the batch; one table, put down once (it stays)
    await load({ oak_log: 4, cobblestone: 3 });
    let t0 = Date.now();
    const batch = await c.callTool({ name: 'play', arguments: { skill: 'craft_batch', args: { items } } });
    timings.batchMs = Date.now() - t0;
    assert.equal(batch.structuredContent.code, null, text(batch));
    assert.equal(batch.structuredContent.steps[0].status, 'confirmed', text(batch));
    timings.batchItems = batch.structuredContent.steps[0].args.items;
    timings.batchResult = batch.structuredContent.steps[0].result;
    timings.batchSkillMs = batch.structuredContent.steps[0].ms;
    const after = await inventory();
    for (const { item } of items) assert.equal(after[item], 1, `${item} in ${JSON.stringify(after)}`);
    assert.ok((timings.batchResult.match(/placed a crafting table/g) ?? []).length <= 1, 'at most one table placed');

    // 3. the same items as separate crafts in one play_sequence (they work at the table step 2 left standing)
    await load({ oak_log: 4, cobblestone: 3 });
    t0 = Date.now();
    const sep = await c.callTool({ name: 'play_sequence', arguments: { steps: timings.batchItems.map((args) => ({ skill: 'craft', args })) } });
    timings.separateMs = Date.now() - t0;
    assert.equal(sep.structuredContent.code, null, text(sep));
    timings.separateSkillMs = sep.structuredContent.steps.reduce((s, x) => s + (x.ms ?? 0), 0);
    timings.separateTables = sep.structuredContent.steps.filter((x) => /placed a crafting table/.test(x.result)).length;

    // 4. a play_sequence re-sent after a cut stream (a hand-written client on a new connection) runs once
    await load({ oak_planks: 9 });
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    const init = await fetch(`${agent.url}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'raw', version: '1' } } }) });
    const h = { ...headers, 'mcp-session-id': init.headers.get('mcp-session-id'), 'mcp-protocol-version': '2025-06-18' };
    await init.text();
    let rpc = 1;
    const call = (name, args, signal) => fetch(`${agent.url}/mcp`, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpc, method: 'tools/call', params: { name, arguments: args } }), signal }).then((r) => r.json()).then((j) => j.result);
    await call('start_game', { adult: true, game: handle });
    const steps = [{ skill: 'craft', args: { item: 'stick', n: 4 } }, { skill: 'craft', args: { item: 'oak_slab', n: 6 } }];
    const cut = new AbortController();
    const first = call('play_sequence', { steps }, cut.signal);
    setTimeout(() => cut.abort(), 150);
    await assert.rejects(first, /abort/i);
    const again = await call('play_sequence', { steps });
    assert.equal(again.structuredContent.code, 'DUPLICATE');
    // the slabs are made at the bot's own table from step 2 (it stays): 2 + 3 of the 9 planks given
    assert.ok(again.structuredContent.steps.every((x) => x.status === 'confirmed'), text(again));
    const inv = (await call('get_state', {})).structuredContent.state.inventory;
    assert.equal(inv.stick, 4, `sticks crafted once: ${JSON.stringify(inv)}`);
    assert.equal(inv.oak_slab, 6, `slabs crafted once: ${JSON.stringify(inv)}`);
    timings.resend = again.structuredContent.steps.map((x) => `${x.skill} ${x.args.item}`);
  } finally {
    if (player) say(`clear ${player}`);
    await c.callTool({ name: 'end_game', arguments: {} }).catch(() => {});
    await c.close().catch(() => {});
    await agent.stop('test over');
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`real-mcp timings: ${JSON.stringify(timings)}`);
  }
});
