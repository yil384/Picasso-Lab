// test/mcp.test.js - the MCP endpoint end to end: against the fake world (tools listed with the skills and their
// arguments, 18+, start_game, play and play_sequence answer with result + state, refusals, one bot per MCP session),
// and against stub bodies with a short call budget: one deadline per call, results that outlive their call (or a
// client that gave up) reported once later, join failures, lease ends, resuming a game from a new connection, and the
// limits on MCP sessions (count, eviction, body size, rate) and on MCP games per address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { createWeb } from '../src/web.js';
import { skillList } from '../src/mcp.js';

async function connect(url) {
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  return c;
}
const text = (r) => r.content.map((x) => x.text).join('\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const START = { adult: true };

test('mcp: start_game, play, play_sequence, refusals, one bot per MCP session', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const a = await connect(agent.url);
  const b = await connect(agent.url);
  try {
    const { tools } = await a.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), ['end_game', 'get_state', 'play', 'play_sequence', 'start_game', 'stop']);
    const play = tools.find((t) => t.name === 'play');
    assert.match(play.description, /- craft_batch \{items: list of 1 to 12 \{item, n\}\}: /);
    for (const name of ['play', 'play_sequence', 'get_state', 'stop']) assert.ok(tools.find((t) => t.name === name).outputSchema, `${name} declares its structuredContent`);
    assert.match(play.description, /- place \{block: one of [^}]*, pos: \{x: integer, y: integer -64 to 320, z: integer\}\}/);
    assert.match(play.description, /stone_bricks/, 'every craftable item is listed');
    assert.equal(tools.find((t) => t.name === 'get_state').annotations?.readOnlyHint, true);
    assert.deepEqual(tools.find((t) => t.name === 'start_game').inputSchema.required, ['adult']);
    assert.match(a.getInstructions(), /Adults \(18\+\) only/);

    const none = await a.callTool({ name: 'play', arguments: { skill: 'eat' } });
    assert.equal(none.isError, true);
    assert.match(text(none), /call start_game first/);

    const minor = await a.callTool({ name: 'start_game', arguments: { adult: false } });
    assert.equal(minor.isError, true);
    assert.match(text(minor), /adults \(18\+\) only/);

    const s = text(await a.callTool({ name: 'start_game', arguments: START }));
    assert.match(s, /^New game g\w+: a new bot at a fresh spot with an empty inventory/);
    assert.match(s, /\/eyes\/g\w+\//);
    assert.match(s, /game: "[A-Za-z0-9_-]{32}"/, 'a handle to resume it');
    assert.match(s, /State \(game g\w+, about 10 min left; it also ends after 5 min without calls\):\n[\s\S]*inventory/);
    assert.match(s, /- collect \{block: one of /);
    assert.match(text(await a.callTool({ name: 'start_game', arguments: START })), /^Resumed game g\w+\./);

    const one = text(await a.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 2 } } }));
    assert.match(one, /^collect \{"block":"oak_log","n":2\}: ok/);
    assert.match(one, /\n\nState \(game [\s\S]*oak_log/);

    // arguments put next to skill instead of inside args are taken as its args
    const flat = await a.callTool({ name: 'play', arguments: { skill: 'collect', block: 'oak_log', n: 1 } });
    assert.match(text(flat), /^collect \{"block":"oak_log","n":1\}: ok/);

    const bad = await a.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'diamond_block; drop', n: 1 } } });
    assert.match(text(bad), /not run, bad arguments/);
    assert.equal(bad.isError, true, 'a skill that did not run is an error');

    // the check before running: an iron pickaxe without iron is refused whole, nothing runs
    const refused = await a.callTool({ name: 'play_sequence', arguments: { steps: [
      { skill: 'craft', args: { item: 'oak_planks', n: 4 } },
      { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } },
    ] } });
    assert.equal(refused.isError, true);
    assert.equal(refused.structuredContent.code, 'NEED_ITEMS');
    assert.match(text(refused), /^- step 2 \(craft \{"item":"iron_pickaxe","n":1\}\): missing 3 iron_ingot/m);
    assert.deepEqual(refused.structuredContent.missing, [{ step: 2, item: 'iron_ingot', need: 3, for: 'iron_pickaxe' }]);
    assert.deepEqual(refused.structuredContent.state.inventory, { oak_log: 3 }, 'nothing ran');

    // a step that fails when it runs cancels the steps after it
    const seq = await a.callTool({ name: 'play_sequence', arguments: { steps: [
      { skill: 'craft', args: { item: 'oak_planks', n: 4 } },
      { skill: 'attack', args: { target: 'zombie' } },
      { skill: 'craft', args: { item: 'stick', n: 4 } },
    ] } });
    assert.match(text(seq), /^1\. craft .*: ok/m);
    assert.match(text(seq), /^2\. attack .*FAILED/m);
    assert.match(text(seq), /^Not run: 3\. craft \{"item":"stick","n":4\}\. Deal with the failure above first/m);
    assert.deepEqual(seq.structuredContent.steps.map((x) => x.status), ['confirmed', 'failed', 'cancelled']);
    assert.equal(seq.structuredContent.code, 'FAILED');
    assert.deepEqual(seq.structuredContent.changed, { oak_log: -1, oak_planks: 4 });

    // one bad step refuses the whole call
    const notRun = await a.callTool({ name: 'play_sequence', arguments: { steps: [
      { skill: 'craft', args: { item: 'stick', n: 4 } },
      { skill: 'craft', args: { item: 'stick' } },
      { skill: 'craft', args: { item: 'crafting_table', n: 1 } },
    ] } });
    assert.equal(notRun.isError, true);
    assert.equal(notRun.structuredContent.code, 'BAD_ARGS');
    assert.match(text(notRun), /^2\. craft: not run, bad arguments: craft\.n is required\nNothing was run/m);
    assert.deepEqual(notRun.structuredContent.state.inventory, { oak_log: 2, oak_planks: 4 });

    // a second MCP session from the same address gets its own bot (connector users share the agent's addresses)
    const sb = text(await b.callTool({ name: 'start_game', arguments: START }));
    assert.match(sb, /^New game g\w+/);
    assert.notEqual(/game (g\w+)/.exec(sb)[1], /game (g\w+)/.exec(s)[1]);

    assert.match(text(await a.callTool({ name: 'get_state', arguments: {} })), /^State \(game/);
    assert.match(text(await a.callTool({ name: 'end_game', arguments: {} })), /Game ended/);
    const after = await a.callTool({ name: 'get_state', arguments: {} });
    assert.equal(after.isError, true);
    assert.match(text(after), /your game ended: you ended it with end_game; start_game gives you a NEW bot/);
    assert.match(text(await a.callTool({ name: 'start_game', arguments: START })), /^New game/, 'no cooldown for an MCP session');
  } finally {
    await a.close();
    await b.close();
    await agent.stop('test over');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('skill list: nested objects with their fields, full enums', () => {
  const list = skillList();
  assert.match(list, /^- get_state \{\}: /m);
  assert.match(list, /^- go_to \{x: integer, y: integer -64 to 320, z: integer\}: /m);
  assert.match(list, /cobblestone_slab\|cobblestone_stairs/);
  assert.match(list, /^- say \{text: text \(1 to 200 characters\)\}/m);
});

// ---------------------------------------------------------------------------------------------------------------
// Against stub bodies: skills that take a set time, a join that can fail, a test clock for leases.

/** A body whose go_to takes args.x * unit ms and collect args.n * unit ms; ready rejects when joinFails(). */
function stubBody({ unit = 100, joinFails = () => false } = {}) {
  let busy = false;
  let cur = null;
  let logs = 0;
  return {
    ready: joinFails() ? Promise.reject(new Error('kicked: server full')) : Promise.resolve(),
    get busy() { return busy; },
    state: () => `inventory: ${logs} oak_log`,
    snapshot: () => null,
    run(tool, args) {
      busy = true;
      const ms = tool === 'go_to' ? args.x * unit : tool === 'collect' ? args.n * unit : 0;
      return new Promise((resolve) => {
        cur = {
          resolve,
          timer: setTimeout(() => {
            busy = false;
            cur = null;
            if (tool === 'collect') logs += args.n;
            resolve({ ok: true, result: `${tool} done`, delta: tool === 'collect' ? { oak_log: args.n } : {}, ms });
          }, ms),
        };
      });
    },
    async stop(reason) {
      if (!cur) return;
      clearTimeout(cur.timer);
      busy = false;
      cur.resolve({ ok: false, result: `stopped: ${reason}`, delta: {} });
      cur = null;
    },
    async close() { await this.stop('closed'); },
    on() { return () => {}; },
  };
}

async function serve(t, { env = {}, body = {}, ...opts } = {}) {
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: '', MODEL_API_KEY: '', ...env });
  const events = [];
  const log = { event: (type, d) => events.push({ type, ...d }), tail: () => [] };
  const web = createWeb({ config, log, makeBody: () => stubBody(body), mcpCallMs: 400, ...opts });
  const { url } = await web.start();
  const clients = [];
  t.after(async () => {
    for (const c of clients) await c.close().catch(() => {});
    await web.stop();
  });
  return {
    url, web, events,
    async client() { const c = await connect(url); clients.push(c); return c; },
  };
}

const initialize = (url, clientName = 'raw') => fetch(`${url}/mcp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: clientName, version: '1' } } }),
});

test('mcp: one deadline per call; a result that outlives its call goes out once with a later reply', async (t) => {
  const { client } = await serve(t);
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: START });

  let t0 = Date.now();
  let r = text(await c.callTool({ name: 'play', arguments: { skill: 'go_to', args: { x: 6, y: 64, z: 0 } } }));
  assert.match(r, /^go_to \{"x":6,"y":64,"z":0\}: still running after \d s/);
  // the next play waits for go_to, then starts collect with what is left of ITS deadline (not a second full one)
  t0 = Date.now();
  r = text(await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 3 } } }));
  assert.ok(Date.now() - t0 < 600, `the reply came within the call's budget (${Date.now() - t0} ms)`);
  assert.match(r, /^Finished since your last call:\ngo_to \{"x":6,"y":64,"z":0\}: ok: go_to done\n\ncollect .*: still running/, 'go_to is reported, not lost');
  r = text(await c.callTool({ name: 'get_state', arguments: {} }));
  assert.match(r, /^Finished since your last call:\ncollect \{"block":"oak_log","n":3\}: ok: collect done \[\+3 oak_log\]\n\nState/);
  r = text(await c.callTool({ name: 'get_state', arguments: {} }));
  assert.match(r, /^State/, 'each result goes out once');
});

test('mcp: a client that gives up before the result loses nothing; the next call reports it', async (t) => {
  const { client } = await serve(t);
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: START });
  await assert.rejects(
    c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 3 } } }, undefined, { timeout: 120 }),
    /timed out/i,
  );
  await sleep(400);
  const r = text(await c.callTool({ name: 'get_state', arguments: {} }));
  assert.match(r, /^Finished since your last call:\ncollect \{"block":"oak_log","n":3\}: ok: collect done \[\+3 oak_log\]/);
});

test('mcp: a bot that cannot join says why and the next start_game is not held up', async (t) => {
  let fail = true;
  const { client, events } = await serve(t, { body: { joinFails: () => fail } });
  const c = await client();
  const r = await c.callTool({ name: 'start_game', arguments: START });
  assert.equal(r.isError, true);
  assert.match(text(r), /^could not start: the bot could not join: kicked: server full; call start_game again in a moment/);
  fail = false;
  assert.match(text(await c.callTool({ name: 'start_game', arguments: START })), /^New game g\w+/);
  assert.ok(events.some((e) => e.type === 'mcp_game'));
  assert.ok(!events.some((e) => e.type === 'mcp_session'), 'no log row per MCP session: only games are logged');
});

test('mcp: the end of the lease is explained; a game resumes from a new connection with its handle', async (t) => {
  let clock = Date.now();
  const { client } = await serve(t, { env: { WEB_LEASE_MS: '600000' }, now: () => clock });
  const a = await client();
  const s = text(await a.callTool({ name: 'start_game', arguments: START }));
  const id = /game (g\w+)/.exec(s)[1];
  const handle = /game: "([A-Za-z0-9_-]{32})"/.exec(s)[1];

  // a new connection (the connector re-initialized) takes the game over with its handle
  const b = await client();
  const resumed = text(await b.callTool({ name: 'start_game', arguments: { ...START, game: handle } }));
  assert.match(resumed, new RegExp(`^Resumed game ${id}\\.`));
  const old = await a.callTool({ name: 'get_state', arguments: {} });
  assert.match(text(old), /your game ended: it moved to another connection/);
  const wrong = await a.callTool({ name: 'start_game', arguments: { ...START, game: 'x'.repeat(32) } });
  assert.equal(wrong.isError, true);
  assert.match(text(wrong), /^could not resume that game: /);

  clock += 600_001;
  const after = await b.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hi' } } });
  assert.equal(after.isError, true);
  assert.match(text(after), /^your game ended: the lease ended; start_game gives you a NEW bot at a new spot with an empty inventory/);
  assert.match(text(await b.callTool({ name: 'start_game', arguments: START })), /^New game/, 'no cooldown after the lease');
});

test('mcp limits: games per address, sessions per address (oldest idle one evicted), body size, new sessions per hour', async (t) => {
  const { url, client } = await serve(t, { env: { WEB_MAX_SESSIONS: '6' }, mcpGamesPerAddress: 2, mcpLimits: { perAddress: 3, sessions: 50 }, mcpInitsPerHour: 8 });
  const [a, b, c] = [await client(), await client(), await client()];
  assert.match(text(await a.callTool({ name: 'start_game', arguments: START })), /^New game/);
  assert.match(text(await b.callTool({ name: 'start_game', arguments: START })), /^New game/);
  const third = await c.callTool({ name: 'start_game', arguments: START });
  assert.equal(third.isError, true);
  assert.match(text(third), /your connector's address already plays 2 games, the most one address may hold/);
  // the web page still has bots for people
  const web = await fetch(`${url}/api/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ adult: true }) });
  assert.equal(web.status, 201);

  // a 4th MCP session from this address evicts the oldest one that plays nothing (c), never a game's
  const d = await client();
  await assert.rejects(c.callTool({ name: 'get_state', arguments: {} }), /unknown session; initialize again/);
  assert.match(text(await a.callTool({ name: 'get_state', arguments: {} })), /^State/);
  assert.match(text(await b.callTool({ name: 'get_state', arguments: {} })), /^State/);
  void d;

  const big = await fetch(`${url}/mcp`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'x'.repeat(100_000), version: '1' } } }),
  });
  assert.equal(big.status, 413);

  // 4 clients + 1 big body so far: 8 new sessions an hour per address
  const statuses = [];
  for (let i = 0; i < 4; i++) statuses.push((await initialize(url)).status);
  assert.deepEqual(statuses, [200, 200, 200, 429]);
});
