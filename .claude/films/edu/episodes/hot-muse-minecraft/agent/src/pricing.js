// src/pricing.js - Muse Spark prices per million tokens (dev.meta.ai/docs/pricing-rate-limits, 2026-10), the cost of
// one call from its usage block, and a rolling one-hour spend meter shared by every brain in the process.

export const PRICES = Object.freeze({
  standard: Object.freeze({ input: 1.25, cached: 0.15, output: 4.25 }),
  contributor: Object.freeze({ input: 0.10, cached: 0.002, output: 0.20 }),
});

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/**
 * Token counts from an OpenAI-style usage block. Cached prompt tokens come from prompt_tokens_details.cached_tokens.
 * Hidden reasoning bills as output: by the OpenAI convention completion_tokens already includes
 * completion_tokens_details.reasoning_tokens; if total_tokens shows a provider counted reasoning separately, it is added.
 * @param {object|null|undefined} usage
 * @returns {{prompt:number, cached:number, uncached:number, completion:number, reasoning:number, output:number}}
 */
export function tokens(usage) {
  const u = usage || {};
  const prompt = n(u.prompt_tokens);
  const cached = Math.min(prompt, n(u.prompt_tokens_details?.cached_tokens ?? u.cached_tokens));
  const completion = n(u.completion_tokens);
  const reasoning = n(u.completion_tokens_details?.reasoning_tokens ?? u.reasoning_tokens);
  const separate = reasoning > 0 && n(u.total_tokens) >= prompt + completion + reasoning;
  return { prompt, cached, uncached: prompt - cached, completion, reasoning, output: completion + (separate ? reasoning : 0) };
}

/** US dollars for one call: uncached prompt at the input rate, cached prompt at the cached rate, output incl. reasoning. */
export function cost(usage, tier = 'standard') {
  const p = PRICES[tier];
  if (!p) throw new Error(`unknown pricing tier "${tier}" (use ${Object.keys(PRICES).join(' or ')})`);
  const t = tokens(usage);
  return (t.uncached * p.input + t.cached * p.cached + t.output * p.output) / 1e6;
}

/**
 * Rolling 60-minute spend meter. One per process, passed to every brain (and the /ask queue) so COST_CAP_HOUR holds
 * across runs and sessions.
 * @param {{usdPerHour?: number, now?: () => number}} [opts]
 */
export function createHourMeter({ usdPerHour = Infinity, now = Date.now } = {}) {
  const HOUR = 3_600_000;
  const entries = [];
  const prune = () => { const t = now() - HOUR; while (entries.length && entries[0].t <= t) entries.shift(); };
  const spent = () => { prune(); return entries.reduce((s, e) => s + e.usd, 0); };
  return {
    limit: usdPerHour,
    add(usd) { if (usd > 0) entries.push({ t: now(), usd }); },
    spent,
    left: () => Math.max(0, usdPerHour - spent()),
    exceeded: () => spent() >= usdPerHour,
  };
}
