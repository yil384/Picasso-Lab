// src/llm.js - thin client for an OpenAI-compatible chat endpoint (Meta's Muse Spark API by default): builds a clean
// request (no stop / n / logprobs / logit_bias, tool_choice auto, one tool call per turn), streams it under one deadline
// for the whole call, measures time to first token and total latency, and prices the call (conservatively when the
// server sends no usage). A request shape the server refuses once (stream_options, the tool schemas' bounds, two user
// messages in a row) is adapted for good and listed in `adaptations`. The key comes from config only and goes only to
// config's URL.

import OpenAI from 'openai';
import { config as defaultConfig, isLocalUrl, EFFORTS } from './config.js';
import { cost, tokens } from './pricing.js';
import { basicTools } from './contracts.js';

/** Chat Completions parameters Meta answers with HTTP 400 (dev.meta.ai/docs/protocols/chat-completions). */
export const FORBIDDEN_PARAMS = Object.freeze([
  'stop', 'n', 'logprobs', 'top_logprobs', 'logit_bias', 'prediction', 'verbosity', 'web_search_options', 'modalities',
  'audio', 'functions', 'function_call',
]);

/** Optional parameters a caller may pass through `params`; everything else is dropped. */
export const PASSTHROUGH_PARAMS = Object.freeze(['temperature', 'top_p', 'seed', 'response_format', 'safety_identifier']);

/**
 * Hidden reasoning tokens billed per call when a server sends no usage block: a deliberately high allowance per
 * effort (capped by max_completion_tokens), so the $ caps over-count rather than under-count.
 */
export const REASONING_ALLOWANCE = Object.freeze({ minimal: 512, low: 2048, medium: 8192, high: 16384, xhigh: 32768, max: 65536 });

export class LLMError extends Error {
  /**
   * usd: the estimated cost of a call that may have been billed although it failed (aborted, timed out, cut off).
   * param: the request parameter the server named in a 400, when it did.
   */
  constructor(message, { status = null, code = null, aborted = false, usd = 0, param = null } = {}) {
    super(message);
    this.name = 'LLMError';
    this.status = status;
    this.code = code;
    this.aborted = aborted;
    this.usd = usd;
    this.param = param;
  }
}

/** Throws if a request body would be rejected by Meta or breaks the one-tool-per-turn rule. */
export function assertCleanRequest(body) {
  for (const k of FORBIDDEN_PARAMS) if (k in body) throw new LLMError(`refusing to send forbidden parameter "${k}"`);
  if ('tool_choice' in body && body.tool_choice !== 'auto') throw new LLMError('tool_choice must be "auto"');
  if ('parallel_tool_calls' in body && body.parallel_tool_calls !== false) throw new LLMError('parallel_tool_calls must be false');
  if ('reasoning_effort' in body && !EFFORTS.includes(body.reasoning_effort)) {
    throw new LLMError(`reasoning_effort must be one of ${EFFORTS.join(', ')} ("none" is rejected; minimal is the lowest)`);
  }
  return body;
}

/**
 * The exact JSON body sent to /chat/completions. Built from a whitelist, so a stray option can never reach the API.
 * @param {{model:string, messages:object[], tools?:object[], effort?:string, cacheKey?:string|null,
 *   stream?:boolean, maxTokens?:number, params?:object}} o
 */
export function buildRequest({ model, messages, tools, effort, cacheKey, stream = true, maxTokens, params = {} }) {
  if (!Array.isArray(messages) || messages.length === 0) throw new LLMError('messages must be a non-empty array');
  const body = { model, messages };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
    body.parallel_tool_calls = false;
  }
  if (effort) body.reasoning_effort = effort;
  if (cacheKey) body.prompt_cache_key = cacheKey;
  if (maxTokens > 0) body.max_completion_tokens = maxTokens;
  for (const k of PASSTHROUGH_PARAMS) if (params[k] !== undefined) body[k] = params[k];
  if (stream) {
    body.stream = true;
    body.stream_options = { include_usage: true };
  }
  return assertCleanRequest(body);
}

/**
 * Token counts for when a server sends no usage block (4 characters per token), so the $ caps still move. Hidden
 * reasoning is invisible in the text, so `reasoning` (default: the allowance for the request's effort) is added.
 */
export function estimateUsage(body, text, { reasoning } = {}) {
  const prompt = Math.ceil(JSON.stringify({ m: body.messages, t: body.tools ?? [] }).length / 4);
  const visible = Math.ceil(String(text ?? '').length / 4);
  let hidden = reasoning ?? REASONING_ALLOWANCE[body.reasoning_effort] ?? REASONING_ALLOWANCE.low;
  if (body.max_completion_tokens > 0) hidden = Math.max(0, Math.min(hidden, body.max_completion_tokens - visible));
  const completion = visible + hidden;
  return {
    prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion,
    completion_tokens_details: { reasoning_tokens: hidden },
  };
}

function toLLMError(err) {
  if (err instanceof LLMError) return err;
  const aborted = err?.name === 'AbortError' || err instanceof OpenAI.APIUserAbortError;
  const status = Number.isInteger(err?.status) ? err.status : null;
  const code = err?.code ?? err?.error?.code ?? null;
  const param = err?.param ?? err?.error?.param ?? null;
  const detail = err?.error?.message ?? err?.message ?? String(err);
  return new LLMError(aborted ? 'model call aborted' : `model call failed${status ? ` (HTTP ${status})` : ''}: ${detail}`, { status, code, aborted, param });
}

/** True for a 400 that names stream_options (a server that streams but does not take include_usage). */
export const rejectsStreamOptions = (err) => err?.status === 400 && (err.param === 'stream_options' || /stream_options/.test(err.message ?? ''));

const SCHEMA_BOUND = /\b(minimum|maximum|exclusiveMinimum|exclusiveMaximum|minLength|maxLength|min_length|max_length|pattern)\b/i;
const SCHEMA_PLACE = /\b(tools?|schema|function|parameters|strict)\b/i;
/**
 * True for a 400 that refuses a JSON Schema bound in the tools (a strict mode without minimum, maximum, pattern or
 * length support): the error must name the bound and place it in the tools or a schema.
 */
export const rejectsToolSchema = (err) => {
  const text = `${err?.message ?? ''} ${err?.param ?? ''}`;
  return err?.status === 400 && SCHEMA_BOUND.test(text) && SCHEMA_PLACE.test(text);
};

/** True for a 400 that wants the user and assistant turns to alternate. */
export const rejectsRoleOrder = (err) => err?.status === 400 && /alternat|consecutive|same role|in a row/i.test(`${err?.message ?? ''} ${err?.param ?? ''}`);

const userRun = (messages) => Array.isArray(messages) && messages.some((msg, i) => i > 0 && msg?.role === 'user' && messages[i - 1]?.role === 'user');

/**
 * Two or more user messages in a row joined into one (blank line between), for a server that wants turns to
 * alternate. The brain's goal and state messages become one; every other message stays as it is.
 */
export function mergeUserTurns(messages) {
  const out = [];
  for (const msg of messages) {
    const prev = out.at(-1);
    if (prev?.role === 'user' && msg?.role === 'user' && typeof prev.content === 'string' && typeof msg.content === 'string') {
      out[out.length - 1] = { ...prev, content: `${prev.content}\n\n${msg.content}` };
    } else out.push(msg);
  }
  return out;
}

/**
 * Where a streamed tool-call delta goes. With an integer index, that slot. Without one (some providers send the index
 * only on the first delta, or never): a new slot for a new call id, otherwise the call being streamed.
 */
export function slotIndex(calls, tc) {
  if (Number.isInteger(tc.index)) return tc.index;
  const last = calls.length - 1;
  if (last < 0) return 0;
  if (tc.id && calls[last]?.id && tc.id !== calls[last].id) return calls.length;
  return last;
}

/**
 * @param {object} [opts]
 * @param {object} [opts.config]       a loadConfig() result; default the process config
 * @param {string} [opts.baseURL]      override (the mock); the API key is only sent when this equals config's URL
 * @param {string} [opts.model]
 * @param {string} [opts.effort]
 * @param {string} [opts.tier]
 * @param {number} [opts.timeoutMs]     deadline for one whole call, stream included (default MODEL_TIMEOUT_MS)
 * @param {boolean} [opts.allowRemote] false refuses any non-local URL (also forced while running under node --test)
 * @param {Function} [opts.fetch]
 * @returns {import('./contracts.js').LLM}
 */
export function createLLM(opts = {}) {
  const cfg = opts.config ?? defaultConfig;
  const m = cfg.model;
  const baseURL = (opts.baseURL ?? m.baseURL).replace(/\/+$/, '');
  const local = isLocalUrl(baseURL);
  if (!local && process.env.NODE_TEST_CONTEXT) throw new LLMError(`tests may only call a local mock, not ${baseURL}`);
  if (!local && opts.allowRemote === false) throw new LLMError(`remote model calls are disabled (${baseURL})`);
  let apiKey = baseURL === m.baseURL ? m.apiKey : '';
  if (!apiKey) {
    if (!local) throw new LLMError(`MODEL_API_KEY is not set (needed for ${baseURL}); set it in your shell, never in code`);
    apiKey = 'local-mock';
  }
  const model = opts.model ?? m.id;
  const effort = opts.effort ?? m.effort;
  const tier = opts.tier ?? m.tier;
  const timeoutMs = opts.timeoutMs ?? m.timeoutMs;
  cost({}, tier); // fail now on an unknown tier, not after the first paid call
  // After a streamed reply without usage the server evidently ignores stream_options; plain JSON replies carry usage.
  let streamDefault = m.stream;
  // Request shapes the server refused once stay adapted for this client's life; callers log `adaptations`.
  let schemaBasic = false;
  let mergeTurns = false;
  const adaptations = [];
  const adapted = (change, detail) => { adaptations.push(Object.freeze({ change, detail, at: new Date().toISOString() })); };
  const basicOf = new WeakMap();
  const toBasic = (tools) => {
    if (!Array.isArray(tools) || !tools.length) return tools;
    if (!basicOf.has(tools)) basicOf.set(tools, basicTools(tools));
    return basicOf.get(tools);
  };

  const client = new OpenAI({
    apiKey,
    baseURL,
    organization: null,
    project: null,
    adminAPIKey: null,
    webhookSecret: null,
    timeout: timeoutMs,
    maxRetries: m.maxRetries,
    logLevel: 'error',
    ...(opts.fetch ? { fetch: opts.fetch } : {}),
  });

  /** After a 400, change the one refused part of the request for good. False when nothing applies. */
  function adapt(req, err) {
    // stream_options is not in every server's list: without an explicit stream, plain JSON from now on
    if (req.stream === undefined && streamDefault && rejectsStreamOptions(err)) {
      streamDefault = false;
      adapted('stream', 'plain JSON: the server refused stream_options (TTFT is now the whole call)');
      return true;
    }
    if (!schemaBasic && req.tools?.length && rejectsToolSchema(err)) {
      schemaBasic = true;
      adapted('tool_schema', `basic: the server refused a bound in the tool schemas (${String(err.message).slice(0, 160)}); validateArgs still enforces it`);
      return true;
    }
    if (!mergeTurns && userRun(req.messages) && rejectsRoleOrder(err)) {
      mergeTurns = true;
      adapted('merge_user_turns', `one user message per turn: the server refused two in a row (${String(err.message).slice(0, 160)})`);
      return true;
    }
    return false;
  }

  async function chat(req = {}) {
    for (;;) {
      try {
        return await chatOnce(req);
      } catch (err) {
        if (!adapt(req, err)) throw err; // each adaptation applies once, so this retries at most three times
      }
    }
  }

  async function chatOnce({ messages, tools, cacheKey, effort: e, maxTokens, stream, signal, params } = {}) {
    const body = buildRequest({
      model,
      messages: mergeTurns && Array.isArray(messages) ? mergeUserTurns(messages) : messages,
      tools: schemaBasic ? toBasic(tools) : tools,
      effort: e ?? effort,
      cacheKey: cacheKey === undefined ? m.cacheKey : cacheKey,
      stream: stream ?? streamDefault,
      maxTokens: maxTokens ?? m.maxTokens,
      params,
    });
    const t0 = performance.now();
    const since = () => performance.now() - t0;
    let firstByteMs = null;
    let ttftMs = null;
    let content = '';
    let finishReason = null;
    let usage = null;
    let served = null;
    const calls = [];
    const soFar = () => content + calls.filter(Boolean).map((c) => (c.function?.name ?? '') + (c.function?.arguments ?? '')).join('');

    // The SDK's timeout ends when the response headers arrive; this deadline bounds the whole call, stream included.
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), timeoutMs);
    const callSignal = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
    const timedOut = () => deadline.signal.aborted && !signal?.aborted;
    // A call cut short may still be billed: the prompt, plus the hidden reasoning once the reply had started.
    const usdSoFar = () => cost(estimateUsage(body, soFar(), firstByteMs === null ? { reasoning: 0 } : {}), tier);
    const timeoutError = () => new LLMError(`model call timed out after ${Math.round(timeoutMs / 100) / 10} s`, { code: 'timeout', usd: usdSoFar() });

    try {
      if (!body.stream) {
        const res = await client.chat.completions.create(body, { signal: callSignal });
        const choice = res.choices?.[0] ?? {};
        content = choice.message?.content ?? '';
        for (const tc of choice.message?.tool_calls ?? []) calls.push(tc);
        finishReason = choice.finish_reason ?? null;
        usage = res.usage ?? null;
        served = res.model ?? null;
        firstByteMs = since();
        ttftMs = firstByteMs;
      } else {
        const events = await client.chat.completions.create(body, { signal: callSignal });
        for await (const chunk of events) {
          if (firstByteMs === null) firstByteMs = since();
          if (chunk.usage) usage = chunk.usage;
          if (chunk.model) served = chunk.model;
          for (const choice of chunk.choices ?? []) {
            const d = choice.delta ?? {};
            if (ttftMs === null && (d.content || d.tool_calls?.length)) ttftMs = since();
            if (d.content) content += d.content;
            for (const tc of d.tool_calls ?? []) {
              const i = slotIndex(calls, tc);
              const slot = (calls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
              if (tc.id) slot.id = tc.id;
              const name = tc.function?.name;
              if (name && name !== slot.function.name) slot.function.name += name;
              if (tc.function?.arguments) slot.function.arguments += tc.function.arguments;
            }
            if (choice.finish_reason) finishReason = choice.finish_reason;
          }
        }
      }
    } catch (err) {
      if (timedOut()) throw timeoutError();
      const e2 = toLLMError(err);
      // an HTTP error status is not billed; an abort or a break after the reply started may be
      if (e2.aborted || e2.status === null) e2.usd = usdSoFar();
      throw e2;
    } finally {
      clearTimeout(timer);
    }
    // The openai SDK ends an aborted stream quietly instead of throwing; report it as the abort or timeout it is.
    if (timedOut()) throw timeoutError();
    if (signal?.aborted) throw new LLMError('model call aborted', { aborted: true, usd: usdSoFar() });

    const latencyMs = since();
    const toolCalls = calls.filter(Boolean).map((c, i) => ({
      id: c.id || `call_${Date.now().toString(36)}_${i}`,
      name: c.function?.name ?? '',
      arguments: c.function?.arguments ?? '',
    }));
    const message = { role: 'assistant', content: content || null };
    if (toolCalls.length) {
      message.tool_calls = toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.arguments } }));
    }
    const usageEstimated = !usage;
    if (!usage) {
      usage = estimateUsage(body, content + toolCalls.map((c) => c.name + c.arguments).join(''));
      if (body.stream && stream === undefined && streamDefault) {
        streamDefault = false;
        adapted('stream', 'plain JSON: a streamed reply came without usage (TTFT is now the whole call)');
      }
    }
    return {
      message,
      content,
      toolCalls,
      finishReason,
      usage,
      usageEstimated,
      tokens: tokens(usage),
      usd: cost(usage, tier),
      ttftMs: ttftMs ?? latencyMs,
      firstByteMs,
      latencyMs,
      model: served,
    };
  }

  return {
    model, tier, effort, baseURL, chat,
    /** false once a streamed reply came without usage, or stream_options was refused: later calls go as plain JSON */
    get streaming() { return streamDefault; },
    /** 'basic' once the server refused a bound in the tool schemas (MODEL_TOOL_SCHEMA=basic skips that first 400) */
    get toolSchema() { return schemaBasic ? 'basic' : m.toolSchema; },
    /** Every request change made after a refusal, oldest first: {change: 'stream'|'tool_schema'|'merge_user_turns', detail, at} */
    get adaptations() { return [...adaptations]; },
  };
}
