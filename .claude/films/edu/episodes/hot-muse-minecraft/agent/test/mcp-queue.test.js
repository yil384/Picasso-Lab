// test/mcp-queue.test.js - ROADMAP M2 on the MCP endpoint, against stub bodies with a short call budget: steps that
// outlive their call keep running in a queue and a later reply reports them; a failed step or stop clears the queue;
// a play_sequence re-sent after a cut stream (or from a new connection, by request_id) runs once; typed codes and
// structuredContent in every reply; and, against the fake world, the dry-run check (refusals, added crafts, dry_run).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { createWeb } from '../src/web.js';
import { startAgent } from '../src/index.js';

const START = { adult: true };
const text = (r) => r.content.map((x) => x.text).join('\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const status = (r) => r.structuredContent.steps.map((x) => x.status);

/** A body whose go_to takes x * unit ms and collect n * unit ms; say "fail <text>" fails with that text. */
function stubBody({ unit = 100 } = {}) {
  let busy = false;
  let cur = null;
  const inv = {};
  const runs = [];
  return {
    runs,
    ready: Promise.resolve(),
    get busy() { return busy; },
    state: () => `inventory: ${Object.entries(inv).map(([k, v]) => `${k} ${v}`).join(', ') || 'empty'}`,
    snapshot: () => ({ inventory: { ...inv }, nearbyBlocks: [], mobs: [] }),
    inventory: () => ({ ...inv }),
    run(tool, args) {
      runs.push(`${tool} ${JSON.stringify(args)}`);
      busy = true;
      const ms = tool === 'go_to' ? args.x * unit : tool === 'collect' ? args.n * unit : 0;
      return new Promise((resolve) => {
        cur = {
          resolve,
          timer: setTimeout(() => {
            busy = false;
            cur = null;
            if (tool === 'say' && args.text.startsWith('fail ')) { resolve({ ok: false, result: args.text.slice(5), delta: {}, ms }); return; }
            if (tool === 'collect') inv[args.block] = (inv[args.block] ?? 0) + args.n;
            resolve({ ok: true, result: `${tool} done`, delta: tool === 'collect' ? { [args.block]: args.n } : {}, ms });
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
  const bodies = [];
  const log = { event: (type, d) => events.push({ type, ...d }), tail: () => [] };
  const web = createWeb({ config, log, makeBody: () => { const b = stubBody(body); bodies.push(b); return b; }, mcpCallMs: 400, ...opts });
  const { url } = await web.start();
  const clients = [];
  t.after(async () => {
    for (const c of clients) await c.close().catch(() => {});
    await web.stop();
  });
  return {
    url, web, events, bodies,
    async client() {
      const c = new Client({ name: 'test', version: '1' });
      await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
      clients.push(c);
      return c;
    },
  };
}

/** A hand-written MCP client over plain fetch, as an agent writes one: each call is one POST, which can be cut. */
async function rawSession(url) {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const init = await fetch(`${url}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'raw', version: '1' } } }) });
  const sid = init.headers.get('mcp-session-id');
  await init.text();
  const h = { ...headers, 'mcp-session-id': sid, 'mcp-protocol-version': '2025-06-18' };
  await (await fetch(`${url}/mcp`, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) })).text();
  let id = 1;
  return {
    call: (name, args, signal) => fetch(`${url}/mcp`, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } }), signal })
      .then((r) => r.json()).then((j) => j.result),
  };
}

const seq = (steps, extra = {}) => ({ name: 'play_sequence', arguments: { steps, ...extra } });
const goTo = (x) => ({ skill: 'go_to', args: { x, y: 64, z: 0 } });
const logs = (n) => ({ skill: 'collect', args: { block: 'oak_log', n } });
const say = (t) => ({ skill: 'say', args: { text: t } });

/** get_state until nothing runs or waits (a loaded machine may need more than one call): every reply and what it reported. */
async function drain(c) {
  const replies = [];
  for (let i = 0; i < 25; i++) {
    const r = await c.callTool({ name: 'get_state', arguments: {} });
    replies.push(r);
    if (!r.structuredContent.queue.running && !r.structuredContent.queue.waiting) break;
  }
  return { replies, earlier: replies.flatMap((r) => r.structuredContent.earlier) };
}

test('queue: steps past the reply keep running in order; the reply says what is pending; get_state reports the rest once', async (t) => {
  const { client, bodies } = await serve(t, { mcpCallMs: 1_000 });
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: START });
  const t0 = Date.now();
  const r = await c.callTool(seq([goTo(2), logs(12), goTo(2), say('done')]));
  assert.ok(Date.now() - t0 < 1_600, 'the reply came at the call deadline');
  assert.deepEqual(status(r), ['confirmed', 'pending', 'pending', 'pending']);
  assert.equal(r.structuredContent.steps[1].running, true);
  assert.deepEqual(r.structuredContent.queue, { running: 'collect {"block":"oak_log","n":12}', waiting: 2 });
  assert.match(text(r), /^1\. go_to \{"x":2,"y":64,"z":0\}: ok: go_to done\n2\. collect \{"block":"oak_log","n":12\}: still running after \d s/);
  assert.match(text(r), /^3\. go_to .*: queued\n4\. say .*: queued\nSteps 2, 3, 4 are still running or queued: they go on after this reply/m);
  assert.equal(r.structuredContent.code, null);

  const g = await drain(c);
  assert.match(text(g.replies[0]), /^Finished since your last call:\ncollect \{"block":"oak_log","n":12\}: ok: collect done \[\+12 oak_log\]\n/);
  assert.deepEqual(g.earlier.map((x) => [x.skill, x.status]), [['collect', 'confirmed'], ['go_to', 'confirmed'], ['say', 'confirmed']], 'each result once, in order');
  assert.deepEqual(g.replies[0].structuredContent.changed, { oak_log: 12 });
  const last = g.replies.at(-1).structuredContent;
  assert.deepEqual(last.state.inventory, { oak_log: 12 });
  assert.ok(last.state.timeLeftS > 590);
  assert.deepEqual(bodies[0].runs, ['go_to {"x":2,"y":64,"z":0}', 'collect {"block":"oak_log","n":12}', 'go_to {"x":2,"y":64,"z":0}', 'say {"text":"done"}']);
  assert.match(text(await c.callTool({ name: 'get_state', arguments: {} })), /^State/, 'each result goes out once');

  // a call while steps still run queues behind them
  await c.callTool(seq([goTo(40)]));
  const p = await c.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'after' } } });
  assert.deepEqual(status(p), ['pending']);
  assert.match(text(p), /^say \{"text":"after"\}: queued\nStep 1 is still running or queued/);
  assert.deepEqual((await drain(c)).earlier.map((x) => x.skill), ['go_to', 'say']);
  assert.deepEqual(bodies[0].runs.slice(-2), ['go_to {"x":40,"y":64,"z":0}', 'say {"text":"after"}']);

  // up to 32 steps in one call
  assert.deepEqual(status(await c.callTool(seq(Array.from({ length: 32 }, (_, i) => say(`s${i}`))))), Array(32).fill('confirmed'));
  const tooMany = await c.callTool(seq(Array.from({ length: 33 }, (_, i) => say(`s${i}`))));
  assert.equal(tooMany.isError, true);
});

test('queue: a failed step cancels what was queued after it, in every call; typed codes say why', async (t) => {
  const { client, bodies } = await serve(t);
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: START });
  const a = await c.callTool(seq([goTo(20), say('fail stopped: a zombie is attacking you (health 14/20, 2 blocks away); fight back with attack zombie'), logs(1)]));
  assert.deepEqual(status(a), ['pending', 'pending', 'pending']);
  const b = await c.callTool(seq([say('second call')]));
  assert.deepEqual(status(b), ['pending'], 'queued behind the first call');
  const { replies, earlier } = await drain(c);
  assert.deepEqual(earlier.map((x) => [x.skill, x.status, x.code ?? null]), [
    ['go_to', 'confirmed', null], ['say', 'failed', 'HOSTILE_CONTACT'], ['collect', 'cancelled', null], ['say', 'cancelled', null],
  ]);
  assert.equal(earlier[3].why, 'step 2 of your play_sequence (say) failed');
  const all = replies.map(text).join('\n');
  assert.match(all, /^say \{"text":"fail stopped: .*"\}: FAILED: stopped: a zombie is attacking you/m);
  assert.match(all, /^say \{"text":"second call"\}: cancelled \(step 2 of your play_sequence \(say\) failed\)$/m);
  assert.ok(replies.some((r) => r.structuredContent.code === 'HOSTILE_CONTACT'), 'the reply that carries the failure has its code');
  assert.deepEqual(bodies[0].runs.map((r) => r.split(' ')[0]), ['go_to', 'say'], 'nothing after the failure ran');

  // a call whose own step fails: "Not run" for the rest of it, the failure's code on top
  const own = await c.callTool(seq([say('fail no zombie within 16 blocks'), say('never')]));
  assert.equal(own.structuredContent.code, 'FAILED');
  assert.match(text(own), /^1\. say .*: FAILED: no zombie within 16 blocks\nNot run: 2\. say \{"text":"never"\}\. Deal with the failure above first/m);

  for (const [msg, code] of [
    ['stopped: you died at 1 64 2; your items were dropped there', 'DIED'],
    ['mined 2 of 5 stone: the inventory is full', 'INVENTORY_FULL'],
    ['fled from a creeper at health 6/20 and retreated to 4 64 9', 'RETREATED_LOW_HEALTH'],
    ['not enough ingredients for wooden_pickaxe: missing 2 stick', 'NEED_ITEMS'],
  ]) {
    const r = await c.callTool({ name: 'play', arguments: { skill: 'say', args: { text: `fail ${msg}` } } });
    assert.equal(r.isError, undefined, 'a step that ran and failed is not a protocol error');
    assert.equal(r.structuredContent.code, code, msg);
    assert.equal(r.structuredContent.steps[0].status, 'failed');
  }
});

test('stop clears the queue: the running step and the waiting ones end as cancelled, reported once', async (t) => {
  const { client, bodies } = await serve(t);
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: START });
  await c.callTool(seq([goTo(20), logs(2), say('never')]));
  const s = await c.callTool({ name: 'stop', arguments: {} });
  assert.match(text(s), /^Finished since your last call:\ngo_to .*: cancelled \(stop cleared the queue\): stopped: stopped through MCP\ncollect .*: cancelled \(stop cleared the queue\)\nsay .*: cancelled \(stop cleared the queue\)\n\nStopped\. 2 queued steps were cancelled\./);
  assert.equal(s.structuredContent.code, 'STOPPED');
  assert.deepEqual(s.structuredContent.earlier.map((x) => x.status), ['cancelled', 'cancelled', 'cancelled']);
  assert.deepEqual(s.structuredContent.queue, { running: null, waiting: 0 });
  assert.deepEqual(bodies[0].runs.map((r) => r.split(' ')[0]), ['go_to']);
  assert.match(text(await c.callTool({ name: 'get_state', arguments: {} })), /^State/);
  assert.match(text(await c.callTool({ name: 'stop', arguments: {} })), /^Nothing was running\./);
});

test('idempotency: a play_sequence re-sent after a cut stream runs once and the re-send gets its results', async (t) => {
  const { url, client, bodies } = await serve(t);
  const c = await client();
  const started = text(await c.callTool({ name: 'start_game', arguments: START }));
  const handle = /game: "([A-Za-z0-9_-]{32})"/.exec(started)[1];
  await c.close();
  const raw = await rawSession(url);
  assert.match(text(await raw.call('start_game', { ...START, game: handle })), /^Resumed game/);

  const steps = [logs(2), goTo(1), say('once')];
  const cut = new AbortController();
  const first = raw.call('play_sequence', { steps }, cut.signal);
  setTimeout(() => cut.abort(), 150);
  await assert.rejects(first, /abort/i, 'the stream broke before the reply');
  const again = await raw.call('play_sequence', { steps });
  assert.equal(again.structuredContent.code, 'DUPLICATE');
  assert.equal(again.isError, undefined);
  assert.match(text(again), /^Already received \d+ s ago \(the same call within 60 s\): not run again\. To run it again on purpose, give it a request_id\. Its steps:\n1\. collect/);
  assert.deepEqual(again.structuredContent.steps.map((x) => x.status), ['confirmed', 'confirmed', 'confirmed'], 'it waited for the first call\'s steps');
  assert.deepEqual(bodies[0].runs, ['collect {"block":"oak_log","n":2}', 'go_to {"x":1,"y":64,"z":0}', 'say {"text":"once"}'], 'each step ran once');

  // the same steps with a request_id are a new call, and its re-send from a NEW connection is a repeat too
  const r1 = await raw.call('play_sequence', { steps, request_id: 'r-1' });
  assert.equal(r1.structuredContent.code, null);
  assert.equal(bodies[0].runs.length, 6);
  const other = await rawSession(url);
  await other.call('start_game', { ...START, game: handle });
  const r1again = await other.call('play_sequence', { steps, request_id: 'r-1' });
  assert.equal(r1again.structuredContent.code, 'DUPLICATE');
  assert.equal(r1again.structuredContent.duplicate.by, 'request_id');
  assert.equal(bodies[0].runs.length, 6, 'not run again');
  const clash = await other.call('play_sequence', { steps: [say('else')], request_id: 'r-1' });
  assert.equal(clash.isError, true);
  assert.equal(clash.structuredContent.code, 'DUPLICATE');
  assert.match(text(clash), /^request_id "r-1" was already used \d+ s ago for a different call; nothing was run/);
  assert.equal((await other.call('play', { skill: 'say', args: { text: 'once' }, request_id: 'r-2' })).structuredContent.code, null, 'a new request_id runs');
  assert.equal(bodies[0].runs.length, 7);
});

test('idempotency: the same call counts as a repeat for 60 s after it finished; after a stop it runs again', async (t) => {
  let clock = Date.now();
  const { client, bodies } = await serve(t, { now: () => clock });
  const c = await client();
  await c.callTool({ name: 'start_game', arguments: START });
  const call = { name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 1 } } };
  assert.equal((await c.callTool(call)).structuredContent.code, null);
  clock += 30_000;
  const flat = await c.callTool({ name: 'play', arguments: { skill: 'collect', block: 'oak_log', n: 1 } });
  assert.equal(flat.structuredContent.code, 'DUPLICATE', 'arguments next to skill are the same call');
  clock += 31_000;
  assert.equal((await c.callTool(call)).structuredContent.code, null, '61 s after: a new call');
  assert.equal(bodies[0].runs.length, 2);
  // a deliberate repeat after stop
  await c.callTool({ name: 'stop', arguments: {} });
  assert.equal((await c.callTool(call)).structuredContent.code, null);
  assert.equal(bodies[0].runs.length, 3);
});

test('queue limits, structured replies without a game, get_state {full: true}', async (t) => {
  const { client } = await serve(t, { body: { unit: 1_000 } });
  const c = await client();
  const none = await c.callTool({ name: 'get_state', arguments: {} });
  assert.equal(none.isError, true);
  assert.equal(none.structuredContent.code, 'NOT_STARTED');
  assert.equal(none.structuredContent.state, null);
  await c.callTool({ name: 'start_game', arguments: START });
  await c.callTool(seq([goTo(30), ...Array.from({ length: 31 }, (_, i) => say(`a${i}`))]));
  await c.callTool(seq(Array.from({ length: 32 }, (_, i) => say(`b${i}`))));
  const full = await c.callTool(seq([say('one too many'), say('and another')]));
  assert.equal(full.isError, true);
  assert.equal(full.structuredContent.code, 'QUEUE_FULL');
  assert.match(text(full), /^Not run: 63 steps are already queued and this call adds 2; at most 64 may wait/);
  const st = await c.callTool({ name: 'get_state', arguments: { full: true } });
  assert.match(text(st), /^go_to .* is still running \(63 more queued\); call get_state again to keep waiting, or stop\./);
  assert.deepEqual(st.structuredContent.full, { inventory: {}, nearbyBlocks: [], mobs: [] });
  await c.callTool({ name: 'stop', arguments: {} });
});

// ---------------------------------------------------------------------------------------------------------------
// The dry-run check against the fake world (real recipes, the fake bot's inventory and blocks)

test('check: refusals before anything runs, crafts added where logs can make them, dry_run, craft_batch', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcpq-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    await c.callTool({ name: 'start_game', arguments: START });
    const stone = await c.callTool(seq([logs(2), { skill: 'collect', args: { block: 'stone', n: 3 } }]));
    assert.equal(stone.isError, true);
    assert.equal(stone.structuredContent.code, 'NEED_ITEMS');
    assert.match(text(stone), /^- step 2 \(collect \{"block":"stone","n":3\}\): missing 1 wooden_pickaxe \(stone drops nothing without wooden_pickaxe or a better one\)$/m);
    assert.deepEqual(stone.structuredContent.state.inventory, {}, 'the logs were not collected either');

    // dry_run: the plan, nothing run
    const dry = await c.callTool(seq([logs(3), { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }], { dry_run: true }));
    assert.equal(dry.structuredContent.code, null);
    assert.match(text(dry), /^The check passed, adding 3 crafts\. Nothing was run \(dry_run\)/);
    assert.deepEqual(dry.structuredContent.plan.map((s) => s.args.item ?? s.args.block), ['oak_log', 'oak_planks', 'crafting_table', 'stick', 'wooden_pickaxe']);
    assert.deepEqual(dry.structuredContent.state.inventory, {});

    // the same for real: the logs, then the added planks, table and sticks, then the pickaxe
    const run = await c.callTool(seq([logs(3), { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }]));
    assert.equal(run.structuredContent.code, null, text(run));
    assert.match(text(run), /^The check added 3 crafts your steps need \(marked below\)\.\n1\. collect/);
    assert.deepEqual(run.structuredContent.steps.map((s) => [s.step, s.skill, s.status]), [
      [1, 'collect', 'confirmed'], [null, 'craft', 'confirmed'], [null, 'craft', 'confirmed'], [null, 'craft', 'confirmed'], [2, 'craft', 'confirmed'],
    ]);
    assert.match(run.structuredContent.steps[1].added, /^for step 2 \(craft wooden_pickaxe 1\)$/);
    assert.equal(run.structuredContent.state.inventory.wooden_pickaxe, 1);

    // an iron pickaxe without iron, a smelt without raw iron: refused with what is missing
    const iron = await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } } });
    assert.equal(iron.structuredContent.code, 'NEED_ITEMS');
    assert.match(text(iron), /^Not run: the check before running found that this step cannot work with what you carry:\n- step 1 \(craft \{"item":"iron_pickaxe","n":1\}\): missing 3 iron_ingot for iron_pickaxe\nNothing was run/);

    // craft_batch through MCP: its planks and sticks go into the batch, one step
    await c.callTool(seq([logs(2)]));
    const batch = await c.callTool({ name: 'play', arguments: { skill: 'craft_batch', args: { items: [{ item: 'wooden_axe', n: 1 }, { item: 'wooden_shovel', n: 1 }] } } });
    assert.equal(batch.structuredContent.code, null, text(batch));
    assert.equal(batch.structuredContent.steps.length, 1);
    // the axe takes the 3 planks and 2 sticks left from the pickaxe; the shovel gets a log cut and sticks made first
    assert.deepEqual(batch.structuredContent.steps[0].addedItems, [{ item: 'oak_planks', n: 4, for: 'wooden_shovel' }, { item: 'stick', n: 4, for: 'wooden_shovel' }]);
    assert.match(text(batch), /^craft_batch \{"items":\[\{"item":"wooden_axe","n":1\},\{"item":"oak_planks","n":4\},\{"item":"stick","n":4\},\{"item":"wooden_shovel","n":1\}\]\}: ok: crafted 1 wooden_axe; crafted 4 oak_planks; crafted 4 stick; crafted 1 wooden_shovel \(placed a crafting table and took it back\)/m);
  } finally {
    await c.close();
    await agent.stop('test over');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
