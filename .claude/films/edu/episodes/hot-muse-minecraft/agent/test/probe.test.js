// test/probe.test.js - the probe module's scripts: the latency/$ probe against the local mock (request shape, cache
// on/off, CSV, the --live and budget gates, the Responses A/B against a local stub), the HUD reducer, and run-goal's
// goal parser, scripted mock player and CLI. Nothing here reaches a real API or a Minecraft server.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

import { loadConfig } from '../src/config.js';
import { FORBIDDEN_PARAMS, createLLM, rejectsToolSchema, rejectsRoleOrder, mergeUserTurns } from '../src/llm.js';
import { TOOLS, toolsForApi, validateArgs, parseArgs as parseToolArgs, inventoryDelta } from '../src/contracts.js';
import { LOGS } from '../src/game.js';
import { readJsonl } from '../src/log.js';
import { start } from './mock-llm.js';
import * as probe from '../scripts/probe.mjs';
import * as hud from '../scripts/hud-data.mjs';
import * as runGoal from '../scripts/run-goal.mjs';

const KEY = 'LLM|1234567890|probeTestKeyThatMustNotLeak';
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `muse-${name}-`));
const capture = () => {
  const out = [];
  const err = [];
  return { out, err, io: { print: (s) => out.push(String(s)), printErr: (s) => err.push(String(s)) } };
};
const REPLIES = [
  { tool: 'collect', args: { block: 'oak_log', n: 4 } },
  { tool: 'craft', args: { item: 'oak_planks', n: 16 } },
  { tool: 'get_state', args: {} },
];
const probeOpts = (extra) => ({ ...probe.parseCli([]), quiet: true, ...extra });

// ---------------------------------------------------------------------------------------------------------------
// probe

test('probe: the brief is a ~3k-token stable prefix, the state changes every call', () => {
  const tools = toolsForApi('full');
  const brief = probe.buildBrief({ tools, targetTokens: 3000 });
  const prefix = probe.estimateTokens(JSON.stringify(tools) + brief);
  assert.ok(prefix >= 3000 && prefix < 3100, `prefix ~3000 tokens, got ${prefix}`);
  assert.equal(brief, probe.buildBrief({ tools, targetTokens: 3000 }), 'deterministic');
  assert.ok(probe.estimateTokens(probe.buildBrief({ tools, targetTokens: 6000 }) + JSON.stringify(tools)) >= 6000);
  const a = probe.stateText(0);
  const b = probe.stateText(1);
  assert.notEqual(a, b);
  assert.equal(a, probe.stateText(0));
  assert.ok(probe.estimateTokens(a) > 150 && probe.estimateTokens(a) < 600, `state ${probe.estimateTokens(a)} tokens`);
  assert.match(a, /Inventory:/);
});

test('probe: grid against the mock sends clean requests, cache on hits and cache off misses, CSV per call', async () => {
  const mock = await start([], { fallback: (_b, i) => REPLIES[i % REPLIES.length] });
  const dir = tmp('probe');
  try {
    const config = loadConfig({ MODEL_MAX_RETRIES: '0' });
    const csvFile = path.join(dir, 'probe.csv');
    const res = await probe.runProbe(probeOpts({
      config, target: { kind: 'mock', baseURL: mock.url }, n: 3, efforts: ['minimal', 'low'], csvFile,
    }));
    assert.equal(res.rows.length, 3 * 2 * 2);
    assert.ok(res.rows.every((r) => r.ok), JSON.stringify(res.rows.find((r) => !r.ok)));
    assert.equal(mock.requests.length, 12);

    const onKeys = new Set();
    const onSystems = new Set();
    const offSystems = new Set();
    for (const { body } of mock.requests) {
      for (const k of FORBIDDEN_PARAMS) assert.ok(!(k in body), `no ${k}`);
      assert.equal(body.tool_choice, 'auto');
      assert.equal(body.parallel_tool_calls, false);
      assert.equal(body.stream, true);
      assert.equal(body.tools.length, 10);
      assert.equal(body.max_completion_tokens, 4096);
      assert.ok(['minimal', 'low'].includes(body.reasoning_effort));
      assert.equal(body.messages[0].role, 'system');
      if (body.prompt_cache_key) { onKeys.add(body.prompt_cache_key); onSystems.add(body.messages[0].content); } else offSystems.add(body.messages[0].content);
    }
    assert.equal(onKeys.size, 1, 'one cache key for the run');
    assert.equal(onSystems.size, 1, 'cache on: identical prefix every call');
    assert.equal(offSystems.size, 6, 'cache off: a unique first line every call');
    assert.ok(new Set(mock.requests.map((r) => r.body.messages[1].content)).size >= 10, 'the state suffix changes');

    const on = res.rows.filter((r) => r.cache === 'on');
    const off = res.rows.filter((r) => r.cache === 'off');
    assert.equal(on.filter((r) => r.warmup).length, 2, 'first cache-on call per effort is warm-up');
    assert.ok(on.filter((r) => !r.warmup).every((r) => r.cached_tokens > 0), 'cache on hits after warm-up');
    assert.ok(off.every((r) => r.cached_tokens === 0 && !r.warmup), 'cache off never hits');
    assert.ok(res.rows.every((r) => r.ttft_ms >= 0 && r.latency_ms >= r.ttft_ms && r.usd > 0 && r.tool));

    const stats = res.stats;
    assert.equal(stats.length, 4);
    const lowOn = stats.find((s) => s.effort === 'low' && s.cache === 'on');
    const lowOff = stats.find((s) => s.effort === 'low' && s.cache === 'off');
    assert.equal(lowOn.measured, 2);
    assert.ok(lowOn.usdPerCall < lowOff.usdPerCall, 'cached calls are cheaper');
    assert.ok(lowOn.cachedShare > 0.5 && lowOff.cachedShare === 0);
    const text = probe.formatSummary(stats, { target: 'mock', model: 'muse-spark-1.3', tier: 'standard' });
    assert.match(text, /MOCK/);
    assert.match(text, /prompt cache, off -> on/);
    assert.match(text, /chat low: total p50/);

    const lines = fs.readFileSync(csvFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 13);
    assert.equal(lines[0], probe.CSV_COLUMNS.join(','));
    assert.equal(lines[1].split(',').length, probe.CSV_COLUMNS.length);
  } finally {
    await mock.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('probe: a rejected cell (HTTP 400) is skipped, the rest of the grid continues', async () => {
  const mock = await start([], {
    fallback: (body, i) => (body.reasoning_effort === 'medium' ? { status: 400, error: { message: 'Unsupported reasoning_effort', param: 'reasoning_effort' } } : REPLIES[i % 3]),
  });
  try {
    const res = await probe.runProbe(probeOpts({
      config: loadConfig({ MODEL_MAX_RETRIES: '0' }), target: { kind: 'mock', baseURL: mock.url }, n: 3, efforts: ['low', 'medium'],
    }));
    assert.equal(res.rows.filter((r) => r.effort === 'medium').length, 2, 'one call per medium cell, then skipped');
    assert.equal(res.rows.filter((r) => r.effort === 'low' && r.ok).length, 6);
    assert.match(Object.values(res.skipped)[0], /HTTP 400/);
    assert.equal(res.stopped, null);
    assert.match(probe.formatSummary(res.stats), /medium cache=on: 1 failed/);
  } finally {
    await mock.close();
  }
});

test('probe: options and the target gate (no real API without --live and a key)', () => {
  const o = probe.parseCli([]);
  assert.deepEqual([o.n, o.efforts, o.cache, o.apis, o.live], [20, ['minimal', 'low', 'medium'], ['on', 'off'], ['chat'], false]);
  assert.throws(() => probe.parseCli(['--efforts', 'none']), /minimal is the lowest/);
  assert.throws(() => probe.parseCli(['--api', 'messages']), /--api/);
  assert.throws(() => probe.parseCli(['--n', '0']), /--n/);
  assert.throws(() => probe.parseCli(['--stop', 'x']), /Unknown option/);

  const noKey = loadConfig({});
  const withKey = loadConfig({ MODEL_API_KEY: KEY });
  assert.deepEqual(probe.chooseTarget(o, noKey), { kind: 'mock', baseURL: null });
  assert.throws(() => probe.chooseTarget({ ...o, live: true }, noKey), /MODEL_API_KEY is not set/);
  assert.deepEqual(probe.chooseTarget({ ...o, live: true }, withKey), { kind: 'live', baseURL: 'https://api.meta.ai/v1' });
  assert.throws(() => probe.chooseTarget({ ...o, baseUrl: 'https://api.meta.ai/v1' }, withKey), /only calls a local server/);
  assert.throws(() => probe.chooseTarget({ ...o, baseUrl: 'https://openrouter.ai/api/v1' }, withKey), /only calls a local server/);
  assert.equal(probe.chooseTarget({ ...o, baseUrl: 'http://127.0.0.1:8788/v1' }, withKey).kind, 'local');

  const est = probe.estimateCost({ calls: 120, cacheOnCalls: 60, promptTokens: 3300, prefixTokens: 3000, maxTokens: 4096, tier: 'standard' });
  assert.ok(Math.abs(est.worstPerCall - (Math.ceil(3300 * 1.25) * 1.25 + 4096 * 4.25) / 1e6) < 1e-12);
  assert.ok(est.worst > est.typical && est.typical > 0);
});

test('probe CLI: --live without a key is refused before any call; default run uses the in-process mock', async () => {
  const dir = tmp('probe-cli');
  try {
    let c = capture();
    assert.equal(await probe.main(['--live', '--yes'], { ...c.io, env: {} }), 2);
    assert.match(c.err.join('\n'), /refusing --live: MODEL_API_KEY is not set/);
    assert.equal(c.out.length, 0, 'nothing planned, nothing called');

    c = capture();
    assert.equal(await probe.main(['--base-url', 'https://api.meta.ai/v1'], { ...c.io, env: { MODEL_API_KEY: KEY } }), 2);
    assert.match(c.err.join('\n'), /only calls a local server/);

    c = capture();
    const csv = path.join(dir, 'default.csv');
    assert.equal(await probe.main(['--n', '1', '--efforts', 'low', '--out', csv], { ...c.io, env: { LOG_DIR: dir } }), 0, c.err.join('\n'));
    const out = c.out.join('\n');
    assert.match(out, /target: mock LLM \(in process\)/);
    const est = c.out.findIndex((l) => l.startsWith('estimated max $:'));
    const firstCall = c.out.findIndex((l) => /^\[1\/2\]/.test(l));
    assert.ok(est >= 0 && firstCall > est, 'the estimate prints before the first call');
    assert.match(out, /summary \(MOCK/);
    assert.match(out, /brain-shaped requests: all 2 accepted/);
    assert.equal(fs.readFileSync(csv, 'utf8').trim().split('\n').length, 5, 'header, 2 brain-shaped rows, 2 grid rows');

    c = capture();
    assert.equal(await probe.main(['--dry-run'], { ...c.io, env: {} }), 0);
    assert.match(c.out.join('\n'), /estimated max \$: [\d.]+ .*\n?.*dry run/s);
    assert.equal(probe.csvPathFor(dir, new Date(2026, 9, 6)), path.join(dir, 'probe-2026-10-06.csv'));
    fs.writeFileSync(path.join(dir, 'probe-2026-10-06.csv'), '');
    assert.equal(probe.csvPathFor(dir, new Date(2026, 9, 6)), path.join(dir, 'probe-2026-10-06-2.csv'), 'never overwrites');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('probe CLI --live: needs --yes when it cannot ask, holds the budget, sends the key only to MODEL_BASE_URL', async () => {
  // MODEL_BASE_URL points at the local mock, so the live code path runs without leaving this machine.
  const mock = await start([], { fallback: (_b, i) => REPLIES[i % 3] });
  const dir = tmp('probe-live');
  try {
    const env = { MODEL_API_KEY: KEY, MODEL_BASE_URL: mock.url, LOG_DIR: dir };
    let c = capture();
    assert.equal(await probe.main(['--live', '--n', '1'], { ...c.io, env, interactive: false }), 2);
    assert.match(c.err.join('\n'), /needs --yes/);
    assert.match(c.out.join('\n'), /estimated max \$/);

    c = capture();
    assert.equal(await probe.main(['--live', '--yes', '--max-usd', '0.0001'], { ...c.io, env, interactive: false }), 2);
    assert.match(c.err.join('\n'), /over --max-usd/);
    assert.equal(mock.requests.length, 0, 'refused before any call');

    c = capture();
    const csv = path.join(dir, 'live.csv');
    assert.equal(await probe.main(['--live', '--yes', '--n', '1', '--efforts', 'minimal', '--gap-ms', '0', '--out', csv], { ...c.io, env, interactive: false }), 0, c.err.join('\n'));
    assert.equal(mock.requests.length, 4, '2 brain-shaped calls, then the grid');
    assert.ok(mock.requests.every((r) => r.auth), 'the configured key is sent to the configured URL');
    assert.match(c.out.join('\n'), /target: LIVE/);
    assert.match(c.out.join('\n'), /summary \(LIVE/);
    const text = fs.readFileSync(csv, 'utf8');
    assert.ok(!text.includes('probeTestKey') && !c.out.join('\n').includes('probeTestKey'), 'the key never reaches the CSV or the console');
  } finally {
    await mock.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('probe: cache-off calls share no prefix even with a cache that ignores the key and renders tools first', async () => {
  const mock = await start([], { fallback: (_b, i) => REPLIES[i % REPLIES.length], autoCache: true });
  try {
    const res = await probe.runProbe(probeOpts({ config: loadConfig({ MODEL_MAX_RETRIES: '0' }), target: { kind: 'mock', baseURL: mock.url }, n: 3, efforts: ['low'] }));
    const off = res.rows.filter((r) => r.cache === 'off');
    assert.ok(off.every((r) => r.cached_tokens === 0), `off rows: ${off.map((r) => r.cached_tokens)}`);
    assert.ok(res.rows.filter((r) => r.cache === 'on' && !r.warmup).every((r) => r.cached_tokens > 0));
    const offTools = mock.requests.filter((r) => !r.body.prompt_cache_key).map((r) => r.body.tools[0].function.description);
    assert.equal(new Set(offTools).size, 3, 'a fresh nonce in the tools of every cache-off call');
    assert.ok(offTools.every((d) => /^\[probe call [0-9a-f]{12}\] /.test(d)));
    const onTools = mock.requests.filter((r) => r.body.prompt_cache_key).map((r) => JSON.stringify(r.body.tools));
    assert.equal(new Set(onTools).size, 1, 'cache-on calls keep the tools byte-identical');

    // the check the nonce in the tools prevents: same tools, a nonce in the system text only
    const llm = createLLM({ config: loadConfig({ MODEL_MAX_RETRIES: '0' }), baseURL: mock.url });
    const tools = toolsForApi('full');
    await llm.chat({ messages: [{ role: 'system', content: '[a] brief' }, { role: 'user', content: 'x' }], tools, cacheKey: null });
    const hit = await llm.chat({ messages: [{ role: 'system', content: '[b] brief' }, { role: 'user', content: 'x' }], tools, cacheKey: null });
    assert.ok(hit.tokens.cached >= 1024, 'the shared tools alone are a cacheable prefix');
  } finally {
    await mock.close();
  }
});

test('probe: brain-shaped requests (goal + state, tool call + tool result + state; previous_response_id)', async () => {
  const mock = await start([], { fallback: { tool: 'collect', args: { block: 'oak_log', n: 4 } } });
  try {
    const config = loadConfig({ MODEL_MAX_RETRIES: '0' });
    const lines = [];
    const res = await probe.runBrainShape(probeOpts({ config, target: { kind: 'mock', baseURL: mock.url }, apis: ['chat', 'responses'], print: (l) => lines.push(l) }));
    assert.equal(res.rows.length, 4);
    assert.ok(res.rows.every((r) => r.ok), JSON.stringify(res.rows.find((r) => !r.ok)));
    assert.deepEqual(res.rows.map((r) => `${r.api} ${r.shape}`), ['chat brain-1', 'chat brain-2', 'responses brain-1', 'responses brain-2']);
    assert.ok(res.spent > 0);

    const [c1, c2, r1, r2] = mock.requests.map((r) => r.body);
    assert.deepEqual(c1.messages.map((m) => m.role), ['system', 'user', 'user']);
    assert.deepEqual(c2.messages.map((m) => m.role), ['system', 'user', 'user', 'assistant', 'tool', 'user']);
    const assistant = c2.messages[3];
    assert.equal(assistant.content, null);
    assert.equal(c2.messages[4].tool_call_id, assistant.tool_calls[0].id);
    assert.equal(c1.prompt_cache_key, c2.prompt_cache_key);
    for (const b of [c1, c2]) for (const k of FORBIDDEN_PARAMS) assert.ok(!(k in b), `no ${k}`);
    assert.equal(r1.previous_response_id, undefined);
    assert.equal(r2.previous_response_id, 'resp_mock_3', 'continues the third response (the first on /responses)');
    assert.equal(r2.input[0].type, 'function_call_output');
    assert.match(r2.input[0].call_id, /^call_3_0_/, 'answers the call id the first response streamed');
    assert.equal(r2.input.at(-1).role, 'user');
    assert.ok(lines.some((l) => /^\[brain responses 2\/2\] ok/.test(l)));
  } finally {
    await mock.close();
  }
});

test('probe and llm: a server that refuses stream_options gets plain JSON calls instead', async () => {
  const mock = await start([], { fallback: (_b, i) => REPLIES[i % REPLIES.length], rejectStreamOptions: true });
  try {
    const config = loadConfig({ MODEL_MAX_RETRIES: '0' });
    const lines = [];
    const res = await probe.runProbe(probeOpts({ config, target: { kind: 'mock', baseURL: mock.url }, n: 2, efforts: ['low'], cache: ['on'], print: (l) => lines.push(l) }));
    assert.equal(res.rows.length, 2);
    assert.ok(res.rows.every((r) => r.ok && r.stream === false && !r.usage_estimated), JSON.stringify(res.rows));
    assert.ok(lines.some((l) => /refused stream_options/.test(l)));

    const llm = createLLM({ config, baseURL: mock.url });
    const r = await llm.chat({ messages: [{ role: 'user', content: 'hi' }], tools: TOOLS });
    assert.equal(r.toolCalls.length, 1);
    assert.equal(llm.streaming, false, 'the client remembers it');
  } finally {
    await mock.close();
  }
});

test('probe and llm: refused tool bounds and two user messages in a row are adapted once, printed and recorded', async () => {
  const mock = await start([], { fallback: (_b, i) => REPLIES[i % REPLIES.length], rejectToolBounds: true, rejectUserRun: true });
  try {
    const config = loadConfig({ MODEL_MAX_RETRIES: '0' });
    const lines = [];
    const res = await probe.runBrainShape(probeOpts({ config, target: { kind: 'mock', baseURL: mock.url }, apis: ['chat'], print: (l) => lines.push(l) }));
    assert.deepEqual(res.rows.map((r) => [r.ok, r.adapted]), [[true, 'tool_schema;merge_user_turns'], [true, 'tool_schema;merge_user_turns']]);
    assert.deepEqual(mock.requests.map((r) => r.status), [400, 400, 200, 200], 'each refusal costs one unbilled 400, once');
    assert.ok(lines.some((l) => /tool_schema = basic/.test(l) && /MODEL_TOOL_SCHEMA=basic/.test(l)), lines.join('\n'));
    assert.ok(lines.some((l) => /merge_user_turns = one user message per turn/.test(l)), lines.join('\n'));
    assert.equal(probe.csvLine(res.rows[0]).split(',').length, probe.CSV_COLUMNS.length);
    const sent = mock.requests[2].body;
    assert.equal(sent.messages.length, 2, 'goal and state went as one user message');
    assert.match(sent.tools.find((t) => t.function.name === 'collect').function.parameters.properties.n.description, /minimum 1/);
  } finally {
    await mock.close();
  }

  // what counts as which refusal
  assert.equal(rejectsToolSchema({ status: 400, message: "Invalid schema for function 'go_to': 'minimum' is not supported in strict mode", param: 'tools' }), true);
  assert.equal(rejectsToolSchema({ status: 400, message: 'invalid value', param: 'tools[1].function.parameters.properties.n.maximum' }), true);
  assert.equal(rejectsToolSchema({ status: 400, message: 'max_completion_tokens is above the maximum of 32768', param: 'max_completion_tokens' }), false);
  assert.equal(rejectsToolSchema({ status: 500, message: "'pattern' is not supported in tool schemas" }), false);
  assert.equal(rejectsRoleOrder({ status: 400, message: 'Conversation roles must alternate user/assistant/user/assistant' }), true);
  assert.equal(rejectsRoleOrder({ status: 400, message: 'Unsupported parameter: stop', param: 'stop' }), false);
  const tool = { role: 'tool', tool_call_id: 'c1', content: 'OK' };
  assert.deepEqual(
    mergeUserTurns([{ role: 'system', content: 's' }, { role: 'user', content: 'g' }, { role: 'user', content: 'x' }, tool, { role: 'user', content: 'y' }]),
    [{ role: 'system', content: 's' }, { role: 'user', content: 'g\n\nx' }, tool, { role: 'user', content: 'y' }],
  );
});

/** A local stand-in for POST /v1/responses that streams the Responses event sequence. */
async function startResponsesStub({ ttftMs = 30 } = {}) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const parts = [];
    for await (const p of req) parts.push(p);
    const body = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
    requests.push({ path: req.url, auth: /^Bearer \S+/.test(req.headers.authorization ?? ''), body });
    if (req.url !== '/v1/responses') { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":{"message":"no route"}}'); return; }
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    let seq = 0;
    const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, sequence_number: seq++, ...data })}\n\n`);
    const response = { id: 'resp_1', object: 'response', model: body.model, status: 'in_progress', output: [] };
    send('response.created', { response });
    await new Promise((r) => setTimeout(r, ttftMs));
    const item = { id: 'fc_1', type: 'function_call', call_id: 'call_1', name: 'collect', arguments: '' };
    send('response.output_item.added', { output_index: 0, item });
    send('response.function_call_arguments.delta', { item_id: 'fc_1', output_index: 0, delta: '{"block":"oak_log","n":4}' });
    send('response.output_item.done', { output_index: 0, item: { ...item, arguments: '{"block":"oak_log","n":4}', status: 'completed' } });
    const cached = body.prompt_cache_key ? 2048 : 0;
    send('response.completed', {
      response: {
        ...response, status: 'completed',
        usage: { input_tokens: 3300, input_tokens_details: { cached_tokens: cached }, output_tokens: 90, output_tokens_details: { reasoning_tokens: 70 }, total_tokens: 3390 },
      },
    });
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/v1`, requests, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
}

test('probe: Responses API A/B (flat tools, reasoning.effort, cached tokens mapped) against a local stub', async () => {
  const stub = await startResponsesStub({ ttftMs: 30 });
  const mock = await start([], { fallback: { tool: 'collect', args: { block: 'oak_log', n: 4 } } });
  try {
    const config = loadConfig({ MODEL_MAX_RETRIES: '0' });
    const res = await probe.runProbe(probeOpts({ config, target: { kind: 'local', baseURL: stub.url }, n: 2, efforts: ['minimal'], apis: ['responses'] }));
    assert.equal(res.rows.length, 4);
    assert.ok(res.rows.every((r) => r.ok && r.api === 'responses' && r.tool === 'collect'), JSON.stringify(res.rows[0]));
    for (const { body } of stub.requests) {
      for (const k of FORBIDDEN_PARAMS) assert.ok(!(k in body), `no ${k}`);
      assert.deepEqual(body.reasoning, { effort: 'minimal' });
      assert.equal(body.tool_choice, 'auto');
      assert.equal(body.parallel_tool_calls, false);
      assert.equal(body.tools.length, 10);
      assert.equal(typeof body.tools[0].name, 'string', 'flat tool definitions');
      assert.ok(!('function' in body.tools[0]));
      assert.equal(body.max_output_tokens, 4096);
      assert.equal(body.input[0].role, 'user');
    }
    const on = res.rows.find((r) => r.cache === 'on' && !r.warmup);
    const off = res.rows.find((r) => r.cache === 'off');
    assert.equal(on.cached_tokens, 2048);
    assert.equal(off.cached_tokens, 0);
    assert.equal(on.reasoning_tokens, 70);
    assert.ok(on.ttft_ms >= 25 && on.first_byte_ms < on.ttft_ms, `ttft ${on.ttft_ms}, first byte ${on.first_byte_ms}`);
    assert.ok(on.usd < off.usd);

    // test/mock-llm.js speaks /responses too, so the whole chat vs responses A/B runs against the default mock.
    const ab = await probe.runProbe(probeOpts({ config, target: { kind: 'mock', baseURL: mock.url }, n: 3, efforts: ['low'], apis: ['chat', 'responses'] }));
    const viaResponses = ab.rows.filter((r) => r.api === 'responses');
    assert.equal(ab.rows.length, 12);
    assert.ok(ab.rows.every((r) => r.ok && r.tool === 'collect'), JSON.stringify(ab.rows.find((r) => !r.ok)));
    assert.ok(viaResponses.filter((r) => r.cache === 'on' && !r.warmup).every((r) => r.cached_tokens > 0), 'cache on hits after the warm-up');
    assert.ok(viaResponses.filter((r) => r.cache === 'off').every((r) => r.cached_tokens === 0), 'cache off never hits');
    assert.ok(viaResponses.every((r) => r.reasoning_tokens === 32 && r.ttft_ms >= r.first_byte_ms));
    const sent = mock.requests.filter((r) => r.path.endsWith('/responses'));
    assert.equal(sent.length, 6);
    for (const { body } of sent) {
      for (const k of FORBIDDEN_PARAMS) assert.ok(!(k in body), `no ${k}`);
      assert.deepEqual(body.reasoning, { effort: 'low' });
    }
    assert.throws(() => probe.createResponsesClient({ config, baseURL: 'https://api.meta.ai/v1', live: true }), /local mock/);
  } finally {
    await stub.close();
    await mock.close();
  }
});

// ---------------------------------------------------------------------------------------------------------------
// hud-data

function writeLog(file, rows) {
  const t0 = Date.parse('2026-10-06T18:00:00.000Z');
  const lines = rows.map(([ms, row]) => JSON.stringify({ time: new Date(t0 + ms).toISOString(), elapsedMs: ms, run: path.basename(file), ...row }));
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
}
const dec = (step, tool, args, delta, ok = true, costUsd = 0.002) => ({
  type: 'decision', step, model: 'muse-spark-1.3', effort: 'low', tier: 'standard', goal: 'iron_pickaxe', tool, args, ok,
  result: ok ? 'ok' : 'no path to the block', delta, costUsd, promptTokens: 4000, cachedTokens: 3000, completionTokens: 300,
  reasoningTokens: 200, ttftMs: 1500, latencyMs: 2500,
});

test('hud-data: milestones with clock, decisions and $; failures; medians over runs; CLI', async () => {
  const dir = tmp('hud');
  try {
    const a = path.join(dir, 'run-a.jsonl');
    writeLog(a, [
      [5, { type: 'event', kind: 'run_start', goal: 'iron_pickaxe', seed: '-4172144997902289642' }],
      [20_005, dec(1, 'collect', { block: 'oak_log', n: 4 }, { oak_log: 4 })],
      [30_005, dec(2, 'craft', { item: 'oak_planks', n: 16 }, { oak_log: -4, oak_planks: 16 })],
      [45_005, dec(3, 'collect', { block: 'iron_ore', n: 3 }, {}, false)],
      [60_005, dec(4, 'craft', { item: 'wooden_pickaxe', n: 1 }, { oak_planks: -3, stick: -2, wooden_pickaxe: 1 })],
      [120_005, dec(5, 'craft', { item: 'furnace', n: 1 }, {})],
      [150_000, { type: 'event', kind: 'milestone', key: 'stone_pickaxe' }],
      [600_005, dec(6, 'smelt', { item: 'raw_iron', n: 3 }, { raw_iron: -3, iron_ingot: 3, furnace: -1 })],
      [842_005, dec(7, 'craft', { item: 'iron_pickaxe', n: 1 }, { iron_ingot: -3, stick: -2, iron_pickaxe: 1 }, true, 0.004)],
      [842_100, { type: 'event', kind: 'run_end', reason: 'goal' }],
    ]);
    const r = hud.reduceRun(readJsonl(a), { file: a });
    const m = Object.fromEntries(r.milestones.map((x) => [x.key, x]));
    assert.deepEqual([m.first_log.clock, m.first_log.decisions, m.first_log.usd], ['0:20', 1, 0.002]);
    assert.deepEqual([m.wooden_pickaxe.clock, m.wooden_pickaxe.decisions], ['1:00', 4]);
    assert.deepEqual([m.furnace.clock, m.furnace.decisions], ['2:00', 5], 'a crafted furnace counts even without a delta');
    assert.equal(m.stone_pickaxe.source, 'event', 'milestone events fill gaps in the deltas');
    assert.equal(m.stone_pickaxe.decisions, 5);
    assert.deepEqual([m.iron_ingot.clock, m.iron_pickaxe.clock, m.iron_pickaxe.decisions, m.iron_pickaxe.usd], ['10:00', '14:02', 7, 0.016]);
    assert.equal(r.clock, '14:02');
    assert.equal(r.reason, 'goal');
    assert.equal(r.seed, '-4172144997902289642');
    assert.match(hud.formatHud(r), /muse-spark-1\.3 · low · standard · seed -4172144997902289642/);
    assert.deepEqual([r.mode, r.simulated, r.label], [null, null, 'UNVERIFIED'], 'a log that does not say how it was made is not shown as real');
    assert.match(hud.formatHud(r), /^\[UNVERIFIED: /m);
    const live = hud.provenance({ mode: 'live', simulated: { model: false, cost: false, world: false } });
    assert.deepEqual([live.simulated, live.label, live.parts], [false, null, []]);
    assert.deepEqual(hud.provenance({ mode: 'live', simulated: { model: false, cost: true, world: false } }).parts, ['$ and tokens simulated, nothing billed'], 'a local endpoint bills nothing');
    const mockLlm = hud.provenance(null, 'mock-llm-2026-10-06T18-00-00-000Z');
    assert.deepEqual([mockLlm.mode, mockLlm.label, mockLlm.parts.length], ['mock-llm', 'SIMULATED', 2], 'older logs: the run id says it');
    assert.deepEqual(hud.provenance({ mode: 'fake-bot' }).parts, ['fake world: instant moves, no real terrain']);
    assert.deepEqual([r.totals.decisions, r.totals.failed, r.totals.usd, r.totals.cacheHitRate], [7, 1, 0.016, 0.75]);
    assert.equal(r.failures[0].tool, 'collect');
    assert.equal(r.timeline.length, 7);
    assert.equal(r.timeline[6].totalUsd, 0.016);
    assert.equal(r.start, '2026-10-06T18:00:00.005Z');
    assert.equal(hud.clock(3_723_000), '1:02:03');
    assert.deepEqual(hud.milestonesIn({ birch_log: 2, furnace: 1 }), ['first_log', 'furnace']);

    const b = path.join(dir, 'run-b.jsonl');
    writeLog(b, [
      [0, { type: 'event', kind: 'run_start', goal: 'iron_pickaxe' }],
      [10_000, dec(1, 'collect', { block: 'oak_log', n: 4 }, { oak_log: 4 })],
      [500_000, dec(2, 'craft', { item: 'wooden_pickaxe', n: 1 }, { wooden_pickaxe: 1 })],
      [500_100, { type: 'event', kind: 'run_end', reason: 'step_cap' }],
    ]);
    const both = hud.reduceRuns([{ file: a, rows: readJsonl(a) }, { file: b, rows: readJsonl(b) }]);
    const first = both.median.milestones.find((x) => x.key === 'first_log');
    assert.deepEqual([first.reachedIn, first.clock], ['2/2', '0:15']);
    assert.equal(both.median.milestones.find((x) => x.key === 'iron_pickaxe').reachedIn, '1/2');
    assert.equal(both.median.decisions, 4.5);
    assert.equal(both.label, 'UNVERIFIED');

    const c = capture();
    const out = path.join(dir, 'hud.json');
    fs.utimesSync(b, new Date(), new Date(Date.now() + 5_000));
    const serve = path.join(dir, 'run-serve-2026-10-06T18-00-00-000Z-ab12.jsonl');
    fs.writeFileSync(serve, '{"type":"event","kind":"serve_start"}\n');
    fs.utimesSync(serve, new Date(), new Date(Date.now() + 10_000));
    assert.equal(hud.newestLog(dir), b, 'an npm start server log is not a goal run');
    fs.rmSync(serve);
    assert.equal(await hud.main([a, b, '--out', out], c.io), 0, c.err.join('\n'));
    assert.match(c.out.join('\n'), /median of 2 runs/);
    assert.match(c.out.join('\n'), /Iron pickaxe\s+1\/2\s+14:02/);
    assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).runs.length, 2);
    const one = capture();
    assert.equal(await hud.main(['--dir', dir, '--json'], one.io), 0);
    assert.equal(JSON.parse(one.out.join('\n')).file, b, 'no file given: the newest run log');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// run-goal

/** A tiny inventory simulator with the rules the scripted player depends on: harvest tiers, recipes, a crafting table
 * or furnace placed from the inventory and left behind when the bot walks off to collect. */
function createSimBody() {
  const inv = {};
  const listeners = new Map();
  let goal = null;
  let tableNear = false;
  let furnaceNear = false;
  const add = (k, n) => { inv[k] = (inv[k] ?? 0) + n; if (!inv[k]) delete inv[k]; };
  const has = (need) => Object.entries(need).every(([k, n]) => (inv[k] ?? 0) >= n);
  const DROPS = { stone: 'cobblestone', iron_ore: 'raw_iron', coal_ore: 'coal' };
  const TOOL_FOR = { stone: ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe'], coal_ore: ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe'], iron_ore: ['stone_pickaxe', 'iron_pickaxe'] };
  const RECIPES = {
    oak_planks: [4, { oak_log: 1 }, false], stick: [4, { oak_planks: 2 }, false], crafting_table: [1, { oak_planks: 4 }, false],
    wooden_pickaxe: [1, { oak_planks: 3, stick: 2 }, true], stone_pickaxe: [1, { cobblestone: 3, stick: 2 }, true],
    furnace: [1, { cobblestone: 8 }, true], iron_pickaxe: [1, { iron_ingot: 3, stick: 2 }, true],
  };
  function act(tool, args) {
    if (tool === 'collect') {
      if (TOOL_FOR[args.block] && !TOOL_FOR[args.block].some((t) => inv[t])) return [false, `${args.block} needs a better pickaxe`];
      tableNear = false;
      furnaceNear = false;
      add(DROPS[args.block] ?? args.block, args.n);
      return [true, `mined ${args.n} ${args.block}`];
    }
    if (tool === 'craft') {
      const [out, need, table] = RECIPES[args.item] ?? [];
      if (!out) return [false, 'no recipe'];
      const batches = Math.ceil(args.n / out);
      const total = Object.fromEntries(Object.entries(need).map(([k, n]) => [k, n * batches]));
      if (!has(total)) return [false, `missing ingredients for ${args.item}`];
      if (table && !tableNear) {
        if (!inv.crafting_table) return [false, 'no crafting table nearby or in the inventory'];
        add('crafting_table', -1);
        tableNear = true;
      }
      for (const [k, n] of Object.entries(total)) add(k, -n);
      add(args.item, out * batches);
      return [true, `made ${out * batches} ${args.item}`];
    }
    if (tool === 'smelt') {
      if ((inv[args.item] ?? 0) < args.n) return [false, `not enough ${args.item}`];
      if (!furnaceNear) { if (!inv.furnace) return [false, 'no furnace']; add('furnace', -1); furnaceNear = true; }
      if (!inv.coal && (inv.oak_planks ?? 0) < 2) return [false, 'no fuel'];
      if (inv.coal) add('coal', -1); else add('oak_planks', -2);
      add(args.item, -args.n);
      add('iron_ingot', args.n);
      return [true, `smelted ${args.n}`];
    }
    if (tool === 'build') {
      if ((inv[args.material] ?? 0) < 23) return [false, 'not enough material'];
      add(args.material, -23);
      return [true, 'built hut_3x3'];
    }
    return [true, 'ok'];
  }
  return {
    ready: Promise.resolve(),
    inventory: () => ({ ...inv }),
    state: () => `Inventory: ${JSON.stringify(inv)}; goal: ${goal}`,
    setGoal: (g) => { goal = g; },
    on: (event, fn) => { listeners.set(event, fn); return () => listeners.delete(event); },
    busy: false,
    async run(tool, args) {
      const v = validateArgs(tool, args);
      if (!v.ok) return { ok: false, result: v.error, delta: {} };
      const before = { ...inv };
      const [ok, result] = act(tool, v.args);
      return { ok, result, delta: inventoryDelta(before, inv) };
    },
    async stop() {},
    async close() {},
  };
}

/** A minimal brain with the createBrain contract, for testing run-goal's plumbing without src/brain.js. */
function createStubBrain({ body, llm, log, caps }) {
  let steps = 0;
  let usd = 0;
  let errors = 0;
  let stopped = false;
  const brain = {
    async step(goal) {
      const r = await llm.chat({ messages: [{ role: 'system', content: 'Play.' }, { role: 'user', content: `${goal}\n${body.state()}` }], tools: TOOLS });
      steps += 1;
      usd += r.usd;
      const call = r.toolCalls[0];
      const parsed = call ? parseToolArgs(call.name, call.arguments) : null;
      const res = !call ? { ok: false, result: r.content, delta: {} } : parsed.ok ? await body.run(call.name, parsed.args) : { ok: false, result: parsed.error, delta: {} };
      const out = { step: steps, goal, tool: call?.name ?? null, args: parsed?.args ?? null, ok: res.ok, result: res.result, delta: res.delta, usd: r.usd, ttftMs: r.ttftMs, latencyMs: r.latencyMs, text: r.content };
      log.decision({ step: steps, goal, usage: r.usage, ttftMs: r.ttftMs, latencyMs: r.latencyMs, tool: out.tool, args: out.args, ok: out.ok, result: out.result, delta: out.delta });
      return out;
    },
    async runUntil(goal, cond, { signal } = {}) {
      const t = Date.now();
      let last = null;
      const end = (reason) => ({ reason, steps, usd, ms: Date.now() - t, last });
      for (;;) {
        if (stopped || signal?.aborted) return end('stopped');
        if (steps >= caps.steps) return end('step_cap');
        if (usd >= caps.usdPerRun) return end('cost_cap');
        last = await brain.step(goal);
        errors = last.ok ? 0 : errors + 1;
        if (await cond(last, body)) return end('goal');
        if (errors >= caps.consecutiveErrors) return end('errors');
      }
    },
    stop() { stopped = true; },
    stats: () => ({ steps, usd, errors }),
  };
  return brain;
}

test('run-goal: goal specs, the goal check, refusals', () => {
  const iron = runGoal.parseGoal('iron_pickaxe');
  assert.deepEqual([iron.key, iron.kind, iron.items, iron.n], ['iron_pickaxe', 'items', ['iron_pickaxe'], 1]);
  assert.match(iron.text, /an iron pickaxe \(iron_pickaxe\)/);
  const logs = runGoal.parseGoal('logs:10');
  assert.equal(logs.items, LOGS);
  assert.equal(logs.n, 10);
  assert.equal(runGoal.parseGoal(' Hut ').blueprint, 'hut_3x3');
  assert.equal(runGoal.parseGoal('cobblestone:20').key, 'cobblestone:20');
  for (const bad of ['', 'logs:0', 'logs:99999', 'unobtainium', 'rm -rf /', 'iron_pickaxe; say hi']) assert.throws(() => runGoal.parseGoal(bad), runGoal.Refusal, bad);

  assert.equal(runGoal.goalMet(logs, null, { oak_log: 6, birch_log: 4 }), true);
  assert.equal(runGoal.goalMet(logs, null, { oak_log: 9 }), false);
  const hut = runGoal.parseGoal('hut');
  assert.equal(runGoal.goalMet(hut, { ok: true, tool: 'build', args: { blueprint: 'hut_3x3', material: 'oak_planks' } }, {}), true);
  assert.equal(runGoal.goalMet(hut, { ok: false, tool: 'build', args: { blueprint: 'hut_3x3', material: 'oak_planks' } }, {}), false);

  assert.equal(runGoal.parseCli(['iron_pickaxe']).llm, 'api');
  assert.deepEqual(['llm', 'world'].map((k) => runGoal.parseCli(['logs:3', '--mock'])[k]), ['mock', 'fake']);
  assert.deepEqual(['llm', 'world'].map((k) => runGoal.parseCli(['hut', '--mock-llm'])[k]), ['mock', 'server']);
  assert.throws(() => runGoal.parseCli(['a', 'b']), /exactly one goal/);
  assert.throws(() => runGoal.parseCli(['hut', '--effort', 'none']), /minimal is the lowest/);
  assert.throws(() => runGoal.parseCli(['hut', '--script', 'x.json']), /needs --mock/);
  assert.equal(runGoal.parseCli(['hut', '--seed=-42']).seed, '-42');
  assert.throws(() => runGoal.parseCli(['hut', '--seed', '1; op me']), /--seed/);
  assert.equal(runGoal.mockSupports(runGoal.parseGoal('cobblestone:20')), false);
});

test('run-goal: the scripted mock player reaches each supported goal with valid tool calls', async () => {
  for (const spec of ['iron_pickaxe', 'logs:5', 'planks:10', 'hut', 'furnace', 'stone_pickaxe', 'iron_ingot:3']) {
    const goal = runGoal.parseGoal(spec);
    const body = createSimBody();
    let last = null;
    let steps = 0;
    for (; steps < 60 && !runGoal.goalMet(goal, last, body.inventory()); steps++) {
      const reply = runGoal.mockPolicy(goal, body.inventory());
      assert.ok(reply?.tool, `${spec}: a tool call at step ${steps} (${JSON.stringify(reply)})`);
      assert.equal(validateArgs(reply.tool, reply.args).ok, true, `${spec}: ${JSON.stringify(reply)}`);
      const r = await body.run(reply.tool, reply.args);
      last = { ...r, tool: reply.tool, args: reply.args };
    }
    assert.ok(runGoal.goalMet(goal, last, body.inventory()), `${spec} reached in ${steps} steps; inventory ${JSON.stringify(body.inventory())}`);
    assert.ok(steps <= 30, `${spec} took ${steps} steps`);
  }
  assert.deepEqual(runGoal.mockPolicy(runGoal.parseGoal('logs:2'), { oak_log: 3 }), { content: 'Goal reached.' });
  assert.equal(runGoal.mockPolicy(runGoal.parseGoal('diamond'), {}), null);
});

test('run-goal CLI --mock: brain + body + mock model + JSONL log + milestones + HUD (stub brain/body)', async () => {
  const dir = tmp('run-goal');
  try {
    const deps = { createBody: () => createSimBody(), createBrain: createStubBrain };
    let c = capture();
    assert.equal(await runGoal.main(['iron_pickaxe', '--mock', '--log-dir', dir], { ...c.io, env: {}, deps }), 0, c.err.join('\n'));
    const out = c.out.join('\n');
    assert.match(out, /mode: mock/);
    assert.match(out, /\* Wooden pickaxe at/);
    assert.match(out, /ended: goal \(goal met\)/);
    assert.match(out, /Iron pickaxe\s+\d+:\d\d\s+\d+/);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    assert.equal(files.length, 1);
    assert.match(files[0], /^run-mock-/);
    const rows = readJsonl(path.join(dir, files[0]));
    assert.equal(rows[0].kind, 'run_start');
    assert.equal(rows.at(-1).kind, 'run_end');
    assert.equal(rows.at(-1).reason, 'goal');
    assert.equal(rows.filter((r) => r.kind === 'milestone').length, 6);
    const r = hud.reduceRun(rows);
    assert.ok(r.milestones.every((m) => m.reached), JSON.stringify(r.milestones));
    assert.ok(r.totals.decisions >= 15 && r.totals.usd > 0);
    assert.deepEqual([r.mode, r.simulated, r.label, r.simulatedParts.length], ['mock', true, 'SIMULATED', 3]);
    assert.deepEqual(rows[0].simulated, { model: true, cost: true, world: true });
    assert.match(out, /^\[SIMULATED: scripted mock model; \$ and tokens simulated, nothing billed; fake world/m, 'the HUD table says so');

    c = capture();
    assert.equal(await runGoal.main(['iron_pickaxe', '--mock', '--steps', '3', '--quiet', '--log-dir', dir], { ...c.io, env: {}, deps }), 1);
    assert.match(c.out.join('\n'), /ended: step_cap; 3 decisions/);
    assert.ok(!c.out.some((l) => l.startsWith('#')), '--quiet hides decision lines');

    c = capture();
    assert.equal(await runGoal.main(['diamond', '--mock'], { ...c.io, env: {}, deps }), 2);
    assert.match(c.err.join('\n'), /cannot play "diamond"/);
    c = capture();
    assert.equal(await runGoal.main(['iron_pickaxe', '--fake-bot', '--log-dir', dir], { ...c.io, env: {}, deps }), 1);
    assert.match(c.err.join('\n'), /MODEL_API_KEY is not set|local mock/, 'the real model needs a key (and tests never call it)');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const SRC = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src');
const haveBodyAndBrain = fs.existsSync(path.join(SRC, 'body.js')) && fs.existsSync(path.join(SRC, 'brain.js'));

test('run-goal CLI --mock end to end with src/body.js, src/brain.js and the fake bot: wooden pickaxe', { skip: !haveBodyAndBrain && 'src/body.js or src/brain.js not written yet' }, async () => {
  const dir = tmp('run-goal-e2e');
  try {
    const c = capture();
    const code = await runGoal.main(['wooden_pickaxe', '--mock', '--quiet', '--steps', '40', '--log-dir', dir], { ...c.io, env: {} });
    assert.equal(code, 0, `${c.out.join('\n')}\n${c.err.join('\n')}`);
    const file = fs.readdirSync(dir).find((f) => f.endsWith('.jsonl'));
    const r = hud.reduceRun(readJsonl(path.join(dir, file)));
    assert.ok(r.milestones.find((m) => m.key === 'wooden_pickaxe').reached);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
