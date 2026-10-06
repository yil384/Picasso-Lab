// test/smoke.test.js - the skeleton holds together: config defaults and guards, prices, tool schemas and the argument
// validator, the logger, and the LLM client talking to the local mock (never a real API).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspect } from 'node:util';

import { loadConfig, ConfigError, isLanHost, isLocalUrl } from '../src/config.js';
import { cost, tokens, createHourMeter, PRICES } from '../src/pricing.js';
import { TOOLS, TOOL_NAMES, SCHEMAS, validateArgs, parseArgs, coerceArgs, toolsForApi, inventoryDelta } from '../src/contracts.js';
import * as game from '../src/game.js';
import { registryFor } from '../src/mc.js';
import { createLogger, readJsonl, scrub } from '../src/log.js';
import { createLLM, buildRequest, estimateUsage, slotIndex, FORBIDDEN_PARAMS, LLMError, REASONING_ALLOWANCE } from '../src/llm.js';
import { start, rejectReason } from './mock-llm.js';

const KEY = 'LLM|1234567890|s3cretValueThatMustNeverLeak';

test('config: defaults, tier inference, guards, key never printable', () => {
  const c = loadConfig({});
  assert.equal(c.model.baseURL, 'https://api.meta.ai/v1');
  assert.equal(c.model.id, 'muse-spark-1.3');
  assert.equal(c.model.tier, 'standard');
  assert.equal(c.model.effort, 'low');
  assert.equal(c.mc.host, '127.0.0.1');
  assert.equal(c.mc.version, '1.21.4');
  assert.equal(c.web.host, '127.0.0.1');
  assert.equal(c.caps.consecutiveErrors, 8, 'room to explore for ore before errors end a run');
  assert.ok(Object.isFrozen(c) && Object.isFrozen(c.model) && Object.isFrozen(c.caps));

  assert.equal(loadConfig({ MODEL_TIER: 'contributor' }).model.id, 'muse-spark-1.3-contributor');
  assert.equal(loadConfig({ MODEL_ID: 'muse-spark-1.3-contributor' }).model.tier, 'contributor');
  assert.equal(loadConfig({ MODEL_CACHE_KEY: 'off' }).model.cacheKey, '');
  assert.throws(() => loadConfig({ MODEL_TIER: 'contributor', MODEL_ID: 'muse-spark-1.3' }), ConfigError);
  assert.throws(() => loadConfig({ MODEL_EFFORT: 'none' }), /minimal is the lowest/);
  assert.throws(() => loadConfig({ MC_HOST: 'play.example.com' }), /localhost or a LAN/);
  assert.throws(() => loadConfig({ STEP_CAP: 'lots' }), /STEP_CAP/);
  assert.ok(isLanHost('192.168.1.20') && isLanHost('localhost') && !isLanHost('8.8.8.8'));
  assert.ok(isLocalUrl('http://127.0.0.1:9/v1') && !isLocalUrl('https://api.meta.ai/v1'));

  assert.equal(c.web.trustProxy, 'off', 'no proxy header is trusted unless configured');
  assert.equal(c.web.askPerHour, 3);
  assert.equal(c.web.askAllowContributor, false);
  assert.notEqual(c.memory.askNotesPath, c.memory.notesPath, 'the Ask brain has notes of its own');
  assert.equal(loadConfig({ WEB_TRUST_PROXY: 'cloudflare' }).web.trustProxy, 'cloudflare');
  assert.equal(loadConfig({ WEB_TRUST_PROXY: '2' }).web.trustProxy, 2);
  assert.throws(() => loadConfig({ WEB_TRUST_PROXY: 'yes' }), /WEB_TRUST_PROXY/);
  assert.throws(() => loadConfig({ WEB_ADMIN_TOKEN: 'a' }), /at least 24 characters/);
  assert.throws(() => loadConfig({ ASK_NOTES_PATH: 'notes.json' }), /must differ/);
  const k = loadConfig({ MODEL_API_KEY: KEY, WEB_ADMIN_TOKEN: 'admin-token-123456789012345' });
  assert.equal(k.model.apiKey, KEY);
  assert.equal(k.model.hasKey, true);
  for (const text of [JSON.stringify(k), inspect(k, { depth: 9 }), String(Object.keys(k.model))]) {
    assert.ok(!text.includes('s3cret') && !text.includes('admin-token'), 'secrets must not be printable');
  }
});

test('pricing: cached prompt tokens at the cached rate, reasoning as output', () => {
  const usage = {
    prompt_tokens: 4000, completion_tokens: 300, total_tokens: 4300,
    prompt_tokens_details: { cached_tokens: 3000 }, completion_tokens_details: { reasoning_tokens: 200 },
  };
  assert.deepEqual(tokens(usage), { prompt: 4000, cached: 3000, uncached: 1000, completion: 300, reasoning: 200, output: 300 });
  assert.ok(Math.abs(cost(usage, 'standard') - (1000 * 1.25 + 3000 * 0.15 + 300 * 4.25) / 1e6) < 1e-12);
  assert.ok(Math.abs(cost(usage, 'contributor') - (1000 * 0.10 + 3000 * 0.002 + 300 * 0.20) / 1e6) < 1e-12);
  // a provider that reports reasoning outside completion_tokens (total shows it): still billed as output
  const separate = { prompt_tokens: 100, completion_tokens: 10, total_tokens: 310, completion_tokens_details: { reasoning_tokens: 200 } };
  assert.equal(tokens(separate).output, 210);
  assert.equal(cost(null), 0);
  assert.throws(() => cost(usage, 'free'), /unknown pricing tier/);
  assert.equal(PRICES.standard.cached, 0.15);

  let now = 0;
  const meter = createHourMeter({ usdPerHour: 1, now: () => now });
  meter.add(0.6); now += 1_000; meter.add(0.5);
  assert.ok(meter.exceeded());
  now += 3_600_000;
  assert.equal(meter.spent(), 0);
});

test('contracts: 10 strict tools, every name is real in 1.21.4, validator', () => {
  assert.deepEqual(TOOL_NAMES, ['get_state', 'go_to', 'collect', 'craft', 'smelt', 'place', 'build', 'attack', 'eat', 'say']);
  const strict = (s, where) => {
    if (s.type !== 'object') return;
    assert.equal(s.additionalProperties, false, `${where} closes`);
    assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), `${where} requires every key`);
    for (const [k, v] of Object.entries(s.properties)) {
      strict(v, `${where}.${k}`);
      if (v.type === 'integer') assert.ok(Number.isFinite(v.minimum) && Number.isFinite(v.maximum), `${where}.${k} bounded`);
    }
  };
  for (const t of TOOLS) {
    assert.equal(t.type, 'function');
    assert.equal(t.function.strict, true);
    strict(t.function.parameters, t.function.name);
  }
  assert.ok(Object.isFrozen(TOOLS[0].function.parameters));

  const reg = registryFor('1.21.4');
  const blocks = [...game.COLLECTABLE_BLOCKS, ...game.PLACEABLE_BLOCKS, ...game.BUILD_MATERIALS];
  const items = [...game.CRAFTABLE_ITEMS, ...game.SMELTABLE_ITEMS, ...Object.values(game.SMELT), ...Object.keys(game.FUEL)];
  for (const b of blocks) assert.ok(reg.blocksByName[b], `block ${b} exists`);
  for (const i of items) assert.ok(reg.itemsByName[i], `item ${i} exists`);
  for (const i of game.CRAFTABLE_ITEMS) assert.ok(reg.recipes[reg.itemsByName[i].id], `${i} has a recipe`);
  for (const m of game.ATTACK_TARGETS.filter((t) => t !== 'nearest_hostile')) assert.ok(reg.entitiesByName[m], `mob ${m} exists`);
  assert.equal(game.blueprintBlockCount('hut_3x3'), 23);

  assert.deepEqual(validateArgs('collect', { block: 'oak_log', n: 4 }), { ok: true, args: { block: 'oak_log', n: 4 } });
  assert.deepEqual(validateArgs('get_state', {}), { ok: true, args: {} });
  for (const [tool, args, why] of [
    ['collect', { block: 'bedrock', n: 1 }, /not allowed/],
    ['collect', { block: 'oak_log', n: 65 }, /from 1 to 64/],
    ['collect', { block: 'oak_log', n: 2.5 }, /integer/],
    ['collect', { block: 'oak_log' }, /required/],
    ['collect', { block: 'oak_log', n: 1, extra: 1 }, /not allowed/],
    ['say', { text: '/op Muse' }, /not allowed/],
    ['say', { text: 'hi\nthere' }, /control/],
    ['place', { block: 'dirt', pos: { x: 1, y: 400, z: 0 } }, /-64 to 320/],
    ['exec', {}, /unknown tool/],
    ['eat', null, /./],
  ]) {
    const r = validateArgs(tool, args ?? 'not-an-object');
    assert.equal(r.ok, false, `${tool} ${JSON.stringify(args)}`);
    assert.match(r.error, why);
  }
  assert.equal(parseArgs('eat', '').ok, true);
  assert.match(parseArgs('collect', '{"block":').error, /not valid JSON/);
  assert.equal(parseArgs('collect', '{"__proto__":{"x":1},"block":"oak_log","n":1}').ok, false);
  assert.deepEqual(coerceArgs('place', { block: 'dirt', 'pos.x': '3', 'pos.y': '64', 'pos.z': '-2', submit: 'Place' }),
    { ok: true, args: { block: 'dirt', pos: { x: 3, y: 64, z: -2 } } });
  assert.deepEqual(coerceArgs('collect', { block: ' oak_log ', n: '10' }), { ok: true, args: { block: 'oak_log', n: 10 } });

  const basic = toolsForApi('basic');
  assert.equal(JSON.stringify(basic).includes('"minimum"'), false);
  assert.match(basic.find((t) => t.function.name === 'collect').function.parameters.properties.n.description, /minimum 1/);
  assert.deepEqual(inventoryDelta({ oak_log: 4, stick: 1 }, { oak_log: 1, stick: 1, oak_planks: 12 }), { oak_log: -3, oak_planks: 12 });
  assert.ok(SCHEMAS.build.properties.blueprint.enum.includes('hut_3x3'));
});

test('logger: JSONL rows with the plan fields, secrets scrubbed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-log-'));
  const cfg = loadConfig({ MODEL_API_KEY: KEY });
  const log = createLogger({ dir, config: cfg, runId: 'smoke' });
  const seen = [];
  log.subscribe((r) => seen.push(r));
  log.event('run_start', { goal: 'iron_pickaxe' });
  const row = log.decision({
    goal: 'iron_pickaxe', tool: 'collect', args: { block: 'oak_log', n: 4 }, ok: true, result: `got 4 logs ${KEY} Bearer abc.def`,
    delta: { oak_log: 4 }, ttftMs: 812.34, latencyMs: 1500,
    usage: { prompt_tokens: 4000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 3000 } },
  });
  for (const f of ['time', 'model', 'effort', 'promptTokens', 'cachedTokens', 'completionTokens', 'ttftMs', 'latencyMs', 'tool', 'args', 'result', 'delta', 'costUsd']) {
    assert.ok(f in row, `row has ${f}`);
  }
  assert.equal(row.cachedTokens, 3000);
  // a provider that reports reasoning outside completion_tokens: the row and the totals sum the same fields
  const sep = log.decision({ usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 35, completion_tokens_details: { reasoning_tokens: 20 } } });
  assert.deepEqual([sep.completionTokens, sep.outputTokens], [5, 25]);
  assert.equal(log.totals().completionTokens, row.completionTokens + sep.completionTokens);
  assert.equal(log.totals().outputTokens, row.outputTokens + sep.outputTokens);
  assert.equal(row.costUsd, Math.round(cost({ prompt_tokens: 4000, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 3000 } }) * 1e6) / 1e6);
  const text = fs.readFileSync(log.path, 'utf8');
  assert.ok(!text.includes('s3cret') && !text.includes('abc.def'));
  assert.equal(readJsonl(log.path).length, 3);
  assert.equal(seen.length, 3);
  assert.equal(log.tail(2)[0].step, 1);
  assert.equal(scrub('key sk-abcdefghijklmnopqrstuv'), 'key [redacted]');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('llm: request shape, streamed tool call, usage, TTFT, against the mock only', async () => {
  const mock = await start([
    { tool: 'collect', args: { block: 'oak_log', n: 4 }, ttftMs: 60, usage: { prompt: 4000, cached: 3000, completion: 120, reasoning: 90 } },
    { content: 'Thinking out loud, no tool.' },
    { tool: 'eat', args: {} },
    { status: 429, error: { message: 'rate limited', code: 'rate_limit' } },
  ]);
  try {
    const cfg = loadConfig({ MODEL_API_KEY: KEY, MODEL_MAX_RETRIES: '0' });
    const llm = createLLM({ config: cfg, baseURL: mock.url });
    const messages = [{ role: 'system', content: 'You play Minecraft.' }, { role: 'user', content: 'Get wood.' }];

    const r = await llm.chat({ messages, tools: TOOLS, params: { stop: ['\n'], n: 3, logprobs: true, temperature: 0.2 } });
    assert.deepEqual(r.toolCalls.map((c) => [c.name, JSON.parse(c.arguments)]), [['collect', { block: 'oak_log', n: 4 }]]);
    assert.equal(r.message.tool_calls[0].id, r.toolCalls[0].id);
    assert.equal(r.tokens.cached, 3000);
    assert.ok(r.usd > 0 && !r.usageEstimated);
    assert.ok(r.ttftMs >= 50 && r.latencyMs >= r.ttftMs, `ttft ${r.ttftMs} latency ${r.latencyMs}`);

    const sent = mock.requests[0];
    for (const k of FORBIDDEN_PARAMS) assert.ok(!(k in sent.body), `no ${k}`);
    assert.equal(sent.body.model, 'muse-spark-1.3');
    assert.equal(sent.body.tool_choice, 'auto');
    assert.equal(sent.body.parallel_tool_calls, false);
    assert.equal(sent.body.reasoning_effort, 'low');
    assert.equal(sent.body.prompt_cache_key, 'muse-mc-v1');
    assert.equal(sent.body.temperature, 0.2);
    assert.deepEqual(sent.body.stream_options, { include_usage: true });
    assert.equal(sent.body.tools.length, 10);
    assert.equal(sent.auth, true);
    assert.ok(!JSON.stringify(sent).includes('s3cret'), 'the real key never goes to a non-configured URL');

    const text = await llm.chat({ messages, tools: TOOLS, stream: false, cacheKey: null, effort: 'minimal' });
    assert.equal(text.content, 'Thinking out loud, no tool.');
    assert.equal(text.toolCalls.length, 0);
    assert.ok(!('prompt_cache_key' in mock.requests[1].body) && !('stream' in mock.requests[1].body));
    assert.equal(mock.requests[1].body.reasoning_effort, 'minimal');

    const next = [...messages, r.message, { role: 'tool', tool_call_id: r.toolCalls[0].id, content: 'ok' }];
    assert.equal((await llm.chat({ messages: next, tools: TOOLS })).toolCalls[0].name, 'eat');

    await assert.rejects(llm.chat({ messages, tools: TOOLS }), (e) => e instanceof LLMError && e.status === 429);
    await assert.rejects(llm.chat({ messages, effort: 'none' }), /minimal is the lowest/);

    // an abort in the middle of a stream (the SDK ends it quietly) is reported as an abort, not an empty reply
    mock.push({ tool: 'eat', args: {}, ttftMs: 2_000 });
    const ac = new AbortController();
    const t0 = Date.now();
    setTimeout(() => ac.abort(), 150);
    await assert.rejects(llm.chat({ messages, tools: TOOLS, signal: ac.signal }), (e) => e instanceof LLMError && e.aborted === true && e.usd > 0);
    assert.ok(Date.now() - t0 < 1_500, 'the stream was cut, not awaited');
  } finally {
    await mock.close();
  }
});

test('llm: MODEL_TIMEOUT_MS bounds a stalled stream, not only the wait for headers', async () => {
  // the mock sends the headers and a first chunk at once, then stalls before the reply
  const mock = await start([{ tool: 'eat', args: {}, ttftMs: 3_000 }, { tool: 'eat', args: {}, ttftMs: 3_000 }]);
  try {
    const cfg = loadConfig({ MODEL_MAX_RETRIES: '0', MODEL_TIMEOUT_MS: '1000' });
    const llm = createLLM({ config: cfg, baseURL: mock.url });
    const messages = [{ role: 'user', content: 'eat' }];
    for (const stream of [true, false]) {
      const t0 = Date.now();
      const err = await llm.chat({ messages, tools: TOOLS, stream }).catch((e) => e);
      const ms = Date.now() - t0;
      assert.ok(err instanceof LLMError, `stream=${stream}: ${err}`);
      assert.equal(err.code, 'timeout');
      assert.equal(err.aborted, false, 'a timeout is a model error, not an operator stop');
      assert.ok(err.usd > 0, 'a timed-out call may be billed');
      assert.ok(ms >= 900 && ms < 2_500, `stream=${stream} gave up after ${ms} ms`);
    }
  } finally {
    await mock.close();
  }
});

test('llm: streamed tool calls without an index, and usage estimates with hidden reasoning', () => {
  const calls = [];
  const feed = (tc) => {
    const i = slotIndex(calls, tc);
    const slot = (calls[i] ??= { id: '', function: { name: '', arguments: '' } });
    if (tc.id) slot.id = tc.id;
    if (tc.function?.name) slot.function.name += tc.function.name;
    if (tc.function?.arguments) slot.function.arguments += tc.function.arguments;
  };
  feed({ id: 'a', function: { name: 'collect', arguments: '' } });
  feed({ function: { arguments: '{"block":"oak_log",' } });
  feed({ function: { arguments: '"n":4}' } });
  assert.deepEqual(calls.map((c) => [c.id, c.function.name, c.function.arguments]), [['a', 'collect', '{"block":"oak_log","n":4}']]);
  feed({ id: 'b', function: { name: 'eat', arguments: '{}' } });
  assert.equal(calls.length, 2, 'a new id opens a new call');
  assert.equal(slotIndex(calls, { index: 0, function: { arguments: 'x' } }), 0, 'an index wins');

  const body = { messages: [{ role: 'user', content: 'x'.repeat(400) }], reasoning_effort: 'medium', max_completion_tokens: 4096 };
  const u = estimateUsage(body, 'abcd');
  assert.equal(u.completion_tokens_details.reasoning_tokens, REASONING_ALLOWANCE.medium < 4095 ? REASONING_ALLOWANCE.medium : 4095);
  assert.equal(u.completion_tokens, 1 + u.completion_tokens_details.reasoning_tokens);
  assert.ok(estimateUsage({ ...body, max_completion_tokens: 100 }, 'abcd').completion_tokens <= 100, 'never above max_completion_tokens');
});

test('mock: rejects what Meta rejects; llm refuses remote URLs under test', async () => {
  assert.equal(rejectReason({ model: 'm', messages: [{ role: 'user', content: 'x' }], stop: ['\n'] }).param, 'stop');
  assert.equal(rejectReason({ model: 'm', messages: [{ role: 'user', content: 'x' }], tool_choice: 'required' }).param, 'tool_choice');
  assert.equal(rejectReason({ model: 'm', messages: [{ role: 'user', content: 'x' }], n: 2 }).param, 'n');
  assert.equal(rejectReason({ model: 'm', messages: [{ role: 'user', content: 'x' }], reasoning_effort: 'low' }), null);

  const mock = await start([]);
  try {
    const res = await fetch(`${mock.url}/chat/completions`, {
      method: 'POST',
      headers: { authorization: 'Bearer test', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'muse-spark-1.3', messages: [{ role: 'user', content: 'hi' }], stop: ['x'] }),
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.param, 'stop');
    const empty = await createLLM({ config: loadConfig({ MODEL_MAX_RETRIES: '0' }), baseURL: mock.url }).chat({ messages: [{ role: 'user', content: 'hi' }] }).catch((e) => e);
    assert.equal(empty.status, 500, 'an exhausted script answers 500');
  } finally {
    await mock.close();
  }

  assert.throws(() => createLLM({ config: loadConfig({ MODEL_API_KEY: KEY }) }), /local mock/);
  assert.throws(() => buildRequest({ model: 'm', messages: [] }), /non-empty/);
  const body = buildRequest({ model: 'm', messages: [{ role: 'user', content: 'x' }] });
  assert.ok(!('tool_choice' in body) && !('parallel_tool_calls' in body), 'no tool settings without tools');
});
