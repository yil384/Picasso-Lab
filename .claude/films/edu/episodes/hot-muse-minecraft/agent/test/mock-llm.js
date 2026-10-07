// test/mock-llm.js - a local mock of an OpenAI-compatible endpoint (node:http only): POST /v1/chat/completions and,
// for the probe's A/B, POST /v1/responses. It answers from a scripted queue (tool calls, text, errors), streams SSE or
// returns JSON, reports usage with cached and reasoning tokens, rejects what Meta rejects (stop, n>1, logprobs,
// logit_bias, tool_choice other than auto, reasoning effort none) with HTTP 400, and records every request body so tests
// can assert on exactly what was sent.
//
//   import { start } from './mock-llm.js';
//   const mock = await start([{ tool: 'collect', args: { block: 'oak_log', n: 4 } }, { content: 'done' }]);
//   ... createLLM({ baseURL: mock.url }) ...; mock.requests[0].body; await mock.close();
//
// CLI: npm run mock [-- --port 8788 --script replies.json --loop --ttft 200]

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

/** Parameters Meta's Chat Completions answers with HTTP 400. */
export const REJECTED_PARAMS = Object.freeze([
  'stop', 'logprobs', 'top_logprobs', 'logit_bias', 'prediction', 'verbosity', 'web_search_options', 'modalities', 'audio',
]);
const EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
const REASONING_BY_EFFORT = { minimal: 8, low: 32, medium: 128, high: 512, xhigh: 1024, max: 2048 };

/**
 * A wooden-pickaxe episode from a fresh spawn next to oak trees (test/fake-bot.js scene 'forest').
 * Used by the CLI by default and by end-to-end tests.
 */
export const DEMO_SCRIPT = Object.freeze([
  { tool: 'get_state', args: {} },
  { tool: 'collect', args: { block: 'oak_log', n: 4 } },
  { tool: 'craft', args: { item: 'oak_planks', n: 12 } },
  { tool: 'craft', args: { item: 'crafting_table', n: 1 } },
  { tool: 'craft', args: { item: 'stick', n: 4 } },
  { tool: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
  { tool: 'say', args: { text: 'Done: wooden pickaxe crafted.' } },
]);

/**
 * One scripted reply. A function entry is called as fn(body, index) and returns a reply.
 * @typedef {object} MockReply
 * @property {string} [tool]            tool call name
 * @property {object|string} [args]     tool call arguments (a string is sent raw, e.g. broken JSON)
 * @property {Array<{tool:string, args:object|string}>} [calls]   several tool calls in one reply
 * @property {string} [content]         assistant text
 * @property {string} [id]              tool call id
 * @property {{prompt?:number, cached?:number, completion?:number, reasoning?:number}} [usage]  override counts
 * @property {object|null} [rawUsage]   send this usage block verbatim (null = none at all)
 * @property {number} [ttftMs]          delay before the first visible token
 * @property {number} [status]          answer with this HTTP error instead
 * @property {object} [error]           error body for status
 * @property {string} [finishReason]
 */

const estimate = (s) => Math.ceil(String(s).length / 4);
const sleep = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/** What Meta would reject in this body, or null. */
export function rejectReason(body) {
  if (!body || typeof body !== 'object') return { param: null, message: 'body must be a JSON object' };
  if (!body.model) return { param: 'model', message: 'model is required' };
  if (!Array.isArray(body.messages) || body.messages.length === 0) return { param: 'messages', message: 'messages must be a non-empty array' };
  for (const k of REJECTED_PARAMS) if (k in body) return { param: k, message: `Unsupported parameter: ${k}` };
  if ('n' in body && body.n !== 1) return { param: 'n', message: 'n > 1 is not supported' };
  if ('tool_choice' in body && body.tool_choice !== 'auto') return { param: 'tool_choice', message: 'Only tool_choice "auto" is supported' };
  if ('reasoning_effort' in body && !EFFORTS.includes(body.reasoning_effort)) {
    return { param: 'reasoning_effort', message: `Unsupported reasoning_effort: ${body.reasoning_effort}` };
  }
  return null;
}

const BOUNDS = ['minimum', 'maximum', 'minLength', 'maxLength', 'pattern'];

/** The first JSON Schema bound in a tool list, as {fn, key}, or null. */
export function findBound(tools) {
  const scan = (schema) => {
    if (!schema || typeof schema !== 'object') return null;
    const key = BOUNDS.find((k) => k in schema);
    if (key) return key;
    for (const v of Object.values(schema.properties ?? {})) { const k = scan(v); if (k) return k; }
    return null;
  };
  for (const t of Array.isArray(tools) ? tools : []) {
    const key = scan(t?.function?.parameters ?? t?.parameters);
    if (key) return { fn: t?.function?.name ?? t?.name ?? '?', key };
  }
  return null;
}

/** What Meta would reject in a Responses API body, or null. */
export function rejectResponsesReason(body) {
  if (!body || typeof body !== 'object') return { param: null, message: 'body must be a JSON object' };
  if (!body.model) return { param: 'model', message: 'model is required' };
  const okInput = typeof body.input === 'string' ? body.input.length > 0 : Array.isArray(body.input) && body.input.length > 0;
  if (!okInput) return { param: 'input', message: 'input must be a non-empty string or array' };
  for (const k of [...REJECTED_PARAMS, 'n', 'reasoning_effort']) if (k in body) return { param: k, message: `Unsupported parameter: ${k}` };
  if ('tool_choice' in body && body.tool_choice !== 'auto') return { param: 'tool_choice', message: 'Only tool_choice "auto" is supported' };
  if (body.reasoning?.effort !== undefined && !EFFORTS.includes(body.reasoning.effort)) {
    return { param: 'reasoning.effort', message: `Unsupported reasoning.effort: ${body.reasoning.effort}` };
  }
  return null;
}

/**
 * Start the mock on 127.0.0.1.
 * @param {Array<MockReply|Function>} [script]
 * @param {{port?:number, loop?:boolean, fallback?:MockReply, enforce?:boolean, ttftMs?:number, model?:string,
 *   onRequest?:(rec:object)=>void, autoCache?:boolean, rejectStreamOptions?:boolean, rejectToolBounds?:boolean,
 *   rejectUserRun?:boolean}} [opts]
 *   autoCache: also cache without prompt_cache_key, by the longest prefix shared with any earlier request, rendered
 *   tools first, then system (as many chat templates do; what Meta's automatic prefix cache may do).
 *   rejectStreamOptions: answer 400 (param stream_options) to a request that sends stream_options.
 *   rejectToolBounds: answer 400 to tools whose schemas carry minimum, maximum, minLength, maxLength or pattern (a
 *   strict mode without bounds; Meta's strict-mode limits are not documented).
 *   rejectUserRun: answer 400 to two user messages in a row (a chat template that wants turns to alternate).
 * @returns {Promise<{url:string, port:number, requests:object[], push:(...r:MockReply[])=>void,
 *   remaining:()=>number, close:()=>Promise<void>}>}
 */
export async function start(script = [], opts = {}) {
  const { port = 0, loop = false, fallback = null, enforce = true, ttftMs: defaultTtft = 0, model: modelName = 'muse-spark-1.3' } = opts;
  const queue = [...script];
  const requests = [];
  const seenPrefixes = new Set();
  const rendered = []; // autoCache: earlier rendered prefixes
  let served = 0;
  let cursor = 0;

  function nextReply(body) {
    let entry;
    if (loop && script.length) entry = script[cursor++ % script.length];
    else entry = queue.length ? queue.shift() : fallback;
    if (!entry) return { status: 500, error: { message: 'mock script exhausted', type: 'server_error', code: 'mock_exhausted' } };
    return typeof entry === 'function' ? entry(body, served) : entry;
  }

  /**
   * Token counts for one reply. Cache model: `prefix` (tools + system text) is what a provider can cache; a repeat of it
   * under the same prompt_cache_key hits, in 128-token blocks once it is at least 1024 tokens long.
   */
  function countTokens(body, reply, text, whole, prefix) {
    const u = reply.usage ?? {};
    const prompt = u.prompt ?? estimate(JSON.stringify(whole));
    let cached = u.cached;
    if (cached === undefined) {
      const p = JSON.stringify(prefix);
      const key = body.prompt_cache_key ? `${body.prompt_cache_key}:${crypto.createHash('sha256').update(p).digest('hex')}` : null;
      const prefixTokens = estimate(p);
      cached = key && seenPrefixes.has(key) && prefixTokens >= 1024 ? Math.floor(prefixTokens / 128) * 128 : 0;
      if (key) seenPrefixes.add(key);
      if (opts.autoCache) {
        const text = JSON.stringify(prefix.tools) + JSON.stringify(prefix.system ?? prefix.instructions ?? '');
        let best = 0;
        for (const r of rendered) {
          let i = 0;
          const max = Math.min(r.length, text.length);
          while (i < max && r.charCodeAt(i) === text.charCodeAt(i)) i += 1;
          best = Math.max(best, i);
        }
        rendered.push(text);
        const shared = estimate(text.slice(0, best));
        if (shared >= 1024) cached = Math.max(cached, Math.floor(shared / 128) * 128);
      }
    }
    const reasoning = u.reasoning ?? REASONING_BY_EFFORT[body.reasoning_effort ?? body.reasoning?.effort] ?? 64;
    const completion = u.completion ?? estimate(text) + reasoning;
    return { prompt, cached: Math.min(cached, prompt), completion, reasoning };
  }

  function usageFor(body, reply, text) {
    if ('rawUsage' in reply) return reply.rawUsage;
    const system = [];
    for (const msg of body.messages) { if (msg.role !== 'system') break; system.push(msg); }
    const tools = body.tools ?? [];
    const t = countTokens(body, reply, text, { tools, messages: body.messages }, { tools, system });
    return {
      prompt_tokens: t.prompt,
      completion_tokens: t.completion,
      total_tokens: t.prompt + t.completion,
      prompt_tokens_details: { cached_tokens: t.cached },
      completion_tokens_details: { reasoning_tokens: t.reasoning },
    };
  }

  function responsesUsageFor(body, reply, text) {
    if ('rawUsage' in reply) return reply.rawUsage;
    const tools = body.tools ?? [];
    const t = countTokens(body, reply, text, { tools, instructions: body.instructions ?? '', input: body.input }, { tools, instructions: body.instructions ?? '' });
    return {
      input_tokens: t.prompt,
      input_tokens_details: { cached_tokens: t.cached },
      output_tokens: t.completion,
      output_tokens_details: { reasoning_tokens: t.reasoning },
      total_tokens: t.prompt + t.completion,
    };
  }

  /** The scripted reply as tool calls ({id, name, arguments}) and text. */
  function shape(reply) {
    const calls = (reply.calls ?? (reply.tool ? [{ tool: reply.tool, args: reply.args, id: reply.id }] : [])).map((c, i) => ({
      id: c.id ?? `call_${served}_${i}_${crypto.randomBytes(3).toString('hex')}`,
      name: c.tool,
      arguments: typeof c.args === 'string' ? c.args : JSON.stringify(c.args ?? {}),
    }));
    return { calls, content: reply.content ?? '' };
  }

  const halves = (s) => { const h = Math.ceil(s.length / 2); return [s.slice(0, h), s.slice(h)].filter(Boolean); };

  function send(res, status, obj) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj));
  }

  async function chat(req, res, rec) {
    const body = rec.body;
    if (enforce) {
      const bad = rejectReason(body);
      if (bad) {
        rec.status = 400;
        return send(res, 400, { error: { message: bad.message, type: 'invalid_request_error', param: bad.param, code: 'invalid_parameter' } });
      }
    }
    if (opts.rejectStreamOptions && 'stream_options' in body) {
      rec.status = 400;
      return send(res, 400, { error: { message: 'Unsupported parameter: stream_options', type: 'invalid_request_error', param: 'stream_options', code: 'invalid_parameter' } });
    }
    const bound = opts.rejectToolBounds ? findBound(body.tools) : null;
    if (bound) {
      rec.status = 400;
      return send(res, 400, { error: { message: `Invalid schema for function '${bound.fn}': '${bound.key}' is not supported in strict mode`, type: 'invalid_request_error', param: 'tools', code: 'invalid_function_parameters' } });
    }
    if (opts.rejectUserRun && body.messages.some((m, i) => i > 0 && m?.role === 'user' && body.messages[i - 1]?.role === 'user')) {
      rec.status = 400;
      return send(res, 400, { error: { message: 'Conversation roles must alternate user/assistant/user/assistant', type: 'invalid_request_error', param: 'messages', code: 'invalid_value' } });
    }
    const reply = nextReply(body);
    served += 1;
    rec.reply = reply;
    if (reply.status) {
      rec.status = reply.status;
      return send(res, reply.status, { error: reply.error ?? { message: `mock error ${reply.status}`, type: 'mock_error' } });
    }
    const { calls, content } = shape(reply);
    const usage = usageFor(body, reply, content + calls.map((c) => c.name + c.arguments).join(''));
    const finish = reply.finishReason ?? (calls.length ? 'tool_calls' : 'stop');
    const id = `chatcmpl-mock-${served}`;
    const created = Math.floor(Date.now() / 1000);
    const ttft = reply.ttftMs ?? defaultTtft;
    rec.status = 200;

    if (!body.stream) {
      await sleep(ttft);
      const message = { role: 'assistant', content: content || null };
      if (calls.length) message.tool_calls = calls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } }));
      const out = { id, object: 'chat.completion', created, model: body.model, choices: [{ index: 0, message, finish_reason: finish }] };
      if (usage) out.usage = usage;
      return send(res, 200, out);
    }

    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    const chunk = (choices, extra = {}) => res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: body.model, choices, ...extra })}\n\n`);
    chunk([{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }]); // first byte; hidden reasoning follows
    await sleep(ttft);
    if (content) {
      const half = Math.ceil(content.length / 2);
      for (const part of [content.slice(0, half), content.slice(half)]) if (part) chunk([{ index: 0, delta: { content: part }, finish_reason: null }]);
    }
    calls.forEach((c, i) => {
      chunk([{ index: 0, delta: { tool_calls: [{ index: i, id: c.id, type: 'function', function: { name: c.name, arguments: '' } }] }, finish_reason: null }]);
      const half = Math.ceil(c.arguments.length / 2);
      for (const part of [c.arguments.slice(0, half), c.arguments.slice(half)]) {
        if (part) chunk([{ index: 0, delta: { tool_calls: [{ index: i, function: { arguments: part } }] }, finish_reason: null }]);
      }
    });
    chunk([{ index: 0, delta: {}, finish_reason: finish }]);
    if (body.stream_options?.include_usage && usage) chunk([], { usage });
    res.end('data: [DONE]\n\n');
  }

  /** POST /responses: the same scripted replies as Responses output items, streamed as typed SSE events or as JSON. */
  async function responsesApi(res, rec) {
    const body = rec.body;
    if (enforce) {
      const bad = rejectResponsesReason(body);
      if (bad) {
        rec.status = 400;
        return send(res, 400, { error: { message: bad.message, type: 'invalid_request_error', param: bad.param, code: 'invalid_parameter' } });
      }
    }
    const reply = nextReply(body);
    served += 1;
    rec.reply = reply;
    if (reply.status) {
      rec.status = reply.status;
      return send(res, reply.status, { error: reply.error ?? { message: `mock error ${reply.status}`, type: 'mock_error' } });
    }
    const { calls, content } = shape(reply);
    const usage = responsesUsageFor(body, reply, content + calls.map((c) => c.name + c.arguments).join(''));
    const id = `resp_mock_${served}`;
    const message = content ? { id: `msg_${served}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: content, annotations: [] }] } : null;
    const fcs = calls.map((c, i) => ({ id: `fc_${served}_${i}`, type: 'function_call', call_id: c.id, name: c.name, arguments: c.arguments, status: 'completed' }));
    const output = [...(message ? [message] : []), ...fcs];
    const response = { id, object: 'response', created_at: Math.floor(Date.now() / 1000), model: body.model, status: 'in_progress', output: [] };
    const ttft = reply.ttftMs ?? defaultTtft;
    rec.status = 200;

    if (!body.stream) {
      await sleep(ttft);
      const out = { ...response, status: 'completed', output, output_text: content };
      if (usage) out.usage = usage;
      return send(res, 200, out);
    }

    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    let seq = 0;
    const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, sequence_number: seq++, ...data })}\n\n`);
    event('response.created', { response }); // first byte; hidden reasoning follows
    await sleep(ttft);
    output.forEach((item, i) => {
      if (item.type === 'message') {
        event('response.output_item.added', { output_index: i, item: { ...item, status: 'in_progress', content: [] } });
        for (const part of halves(content)) event('response.output_text.delta', { item_id: item.id, output_index: i, content_index: 0, delta: part });
        event('response.output_text.done', { item_id: item.id, output_index: i, content_index: 0, text: content });
      } else {
        event('response.output_item.added', { output_index: i, item: { ...item, status: 'in_progress', arguments: '' } });
        for (const part of halves(item.arguments)) event('response.function_call_arguments.delta', { item_id: item.id, output_index: i, delta: part });
        event('response.function_call_arguments.done', { item_id: item.id, output_index: i, arguments: item.arguments });
      }
      event('response.output_item.done', { output_index: i, item });
    });
    event('response.completed', { response: { ...response, status: 'completed', output, ...(usage ? { usage } : {}) } });
    res.end();
  }

  async function handle(req, res) {
    const path = new URL(req.url, 'http://mock').pathname.replace(/^\/v1(?=\/)/, '');
    if (req.method === 'GET' && path === '/status') return send(res, 200, { service_status: 'operational' });
    if (req.method === 'GET' && path === '/models') return send(res, 200, { object: 'list', data: [{ id: modelName, object: 'model' }] });
    if (req.method !== 'POST' || (path !== '/chat/completions' && path !== '/responses')) return send(res, 404, { error: { message: `no route ${req.method} ${path}` } });

    const parts = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 5_000_000) return send(res, 413, { error: { message: 'body too large' } });
      parts.push(part);
    }
    const headers = { ...req.headers };
    const auth = typeof headers.authorization === 'string' && /^Bearer \S+/.test(headers.authorization);
    delete headers.authorization; // never keep a key, even a real one sent here by mistake
    let body = null;
    try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { /* recorded as null */ }
    const rec = { method: req.method, path: req.url, headers, auth, body, at: Date.now(), status: null };
    requests.push(rec);
    opts.onRequest?.(rec);
    if (!auth) { rec.status = 401; return send(res, 401, { error: { message: 'missing API key', code: 'invalid_api_key' } }); }
    if (body === null) { rec.status = 400; return send(res, 400, { error: { message: 'body is not JSON', type: 'invalid_request_error' } }); }
    return path === '/responses' ? responsesApi(res, rec) : chat(req, res, rec);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (!res.headersSent) send(res, 500, { error: { message: err.message } });
      else res.end();
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const actual = server.address().port;

  return {
    url: `http://127.0.0.1:${actual}/v1`,
    port: actual,
    requests,
    push: (...replies) => { queue.push(...replies); },
    remaining: () => (loop ? Infinity : queue.length),
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const { values } = parseArgs({
    options: { port: { type: 'string' }, script: { type: 'string' }, loop: { type: 'boolean' }, ttft: { type: 'string' } },
  });
  const script = values.script ? JSON.parse(fs.readFileSync(values.script, 'utf8')) : DEMO_SCRIPT;
  let count = 0;
  const mock = await start(script, {
    port: Number(values.port ?? process.env.MOCK_PORT ?? 8788),
    loop: Boolean(values.loop),
    ttftMs: Number(values.ttft ?? 0),
    onRequest: (rec) => {
      const n = ++count;
      const b = rec.body ?? {};
      // the reply is chosen after this hook, so report it on the next tick
      setImmediate(() => {
        const got = rec.status && rec.status !== 200 ? `HTTP ${rec.status}` : rec.reply?.tool ?? (rec.reply?.calls ? 'tool calls' : 'text');
        const api = /\/responses$/.test(new URL(rec.path, 'http://mock').pathname) ? 'responses' : 'chat';
        console.log(`#${n} ${api} effort=${b.reasoning_effort ?? b.reasoning?.effort ?? '-'} tools=${b.tools?.length ?? 0} cache_key=${b.prompt_cache_key ? 'yes' : 'no'} -> ${got}`);
      });
    },
  });
  console.log(`mock LLM at ${mock.url} (${script.length} scripted replies${values.loop ? ', looping' : ''}); Ctrl-C stops it`);
  console.log(`point the agent at it: MODEL_BASE_URL=${mock.url}`);
  const stop = () => mock.close().then(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
