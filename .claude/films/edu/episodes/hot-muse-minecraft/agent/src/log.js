// src/log.js - the decision log: one JSONL row per model decision (tokens, TTFT, latency, tool, args, result,
// inventory change, $) plus event rows (run start/end, milestones, stops). Secrets are scrubbed before anything is
// written, kept in memory or handed to a subscriber, so the operator's /log can serve rows as they are.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config as defaultConfig } from './config.js';
import { cost, tokens } from './pricing.js';

const KEY_PATTERNS = [
  /LLM\|\d+\|[A-Za-z0-9_\-.]+/g, // Meta Model API keys
  /\bsk-[A-Za-z0-9_-]{16,}/g, // OpenAI-style keys (OpenRouter too)
  /Bearer\s+[A-Za-z0-9._\-|~+/=]+/gi,
];

/** Replace the configured secrets and anything shaped like an API key with [redacted]. */
export function scrub(text, secrets = []) {
  let s = String(text);
  for (const secret of secrets) if (secret && secret.length >= 8) s = s.split(secret).join('[redacted]');
  for (const re of KEY_PATTERNS) s = s.replace(re, '[redacted]');
  return s;
}

const round = (v, d) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

/**
 * @param {object} [opts]
 * @param {string|null} [opts.dir]    folder for run-<id>.jsonl; null keeps rows in memory only
 * @param {string} [opts.runId]
 * @param {string} [opts.model]       default config.model.id
 * @param {string} [opts.effort]      default config.model.effort
 * @param {string} [opts.tier]        default config.model.tier
 * @param {number} [opts.keep]        rows kept in memory for tail()
 * @param {object} [opts.config]
 * @returns {import('./contracts.js').Logger}
 */
export function createLogger(opts = {}) {
  const cfg = opts.config ?? defaultConfig;
  const dir = opts.dir === undefined ? cfg.log.dir : opts.dir;
  const runId = opts.runId ?? `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(2).toString('hex')}`;
  const model = opts.model ?? cfg.model.id;
  const effort = opts.effort ?? cfg.model.effort;
  const tier = opts.tier ?? cfg.model.tier;
  const keep = opts.keep ?? 200;
  // stream URLs hold stream keys: the whole URL and the key alone are both secrets
  const streamKeys = (cfg.stream?.outputs ?? []).flatMap((u) => [u, u.split('/').pop()?.split('?')[0]]);
  const secrets = [cfg.model.apiKey, cfg.web.adminToken, ...streamKeys];
  const file = dir ? path.join(dir, `run-${runId.replace(/[^A-Za-z0-9_.-]/g, '_')}.jsonl`) : null;
  if (file) fs.mkdirSync(dir, { recursive: true });

  const started = Date.now();
  const rows = [];
  const subs = new Set();
  // completionTokens: what the server reported as completion; outputTokens: everything billed as output (completion plus
  // reasoning a provider reports outside it). Rows and totals carry both, summed the same way.
  const sum = { decisions: 0, usd: 0, promptTokens: 0, cachedTokens: 0, completionTokens: 0, outputTokens: 0 };
  let step = 0;
  let closed = false;

  function write(row) {
    const line = scrub(JSON.stringify(row), secrets);
    const clean = JSON.parse(line);
    if (file && !closed) fs.appendFileSync(file, `${line}\n`);
    rows.push(clean);
    if (rows.length > keep) rows.shift();
    for (const fn of subs) { try { fn(clean); } catch { /* a subscriber must not break logging */ } }
    return clean;
  }

  const base = (type) => ({ type, time: new Date().toISOString(), elapsedMs: Date.now() - started, run: runId });

  return {
    runId,
    path: file,
    decision(input = {}) {
      const t = tokens(input.usage);
      const usd = Number.isFinite(input.costUsd) ? input.costUsd : input.usage ? cost(input.usage, tier) : 0;
      step = Number.isInteger(input.step) ? input.step : step + 1;
      sum.decisions += 1;
      sum.usd += usd;
      sum.promptTokens += t.prompt;
      sum.cachedTokens += t.cached;
      sum.completionTokens += t.completion;
      sum.outputTokens += t.output;
      const row = {
        ...base('decision'),
        step,
        model,
        effort,
        tier,
        goal: input.goal ?? null,
        promptTokens: t.prompt,
        cachedTokens: t.cached,
        completionTokens: t.completion,
        reasoningTokens: t.reasoning,
        outputTokens: t.output,
        ttftMs: round(input.ttftMs, 1),
        latencyMs: round(input.latencyMs, 1),
        tool: input.tool ?? null,
        args: input.args ?? null,
        ok: Boolean(input.ok),
        result: clip(String(input.result ?? ''), 600),
        delta: input.delta ?? {},
        costUsd: round(usd, 6),
        totalUsd: round(sum.usd, 6),
      };
      if (input.usageEstimated) row.usageEstimated = true;
      // where the skill's time went (src/body.js createPhases), and its wall time
      if (input.phases && typeof input.phases === 'object') { row.skillMs = Number.isFinite(input.skillMs) ? Math.round(input.skillMs) : null; row.phases = input.phases; }
      if (input.note) row.note = clip(String(input.note), 300);
      return write(row);
    },
    event(kind, data = {}) {
      return write({ ...data, ...base('event'), kind: String(kind) });
    },
    tail: (n = 20) => rows.slice(-n),
    totals: () => ({ ...sum, usd: round(sum.usd, 6) }),
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    close() { closed = true; subs.clear(); },
  };
}

/** Read a JSONL log back into rows (skips blank or broken lines). */
export function readJsonl(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}
