// scripts/probe.mjs - latency and cost probe for the model API (plan C4). First two brain-shaped calls per API (the
// multi-turn request the brain really sends: two user messages, then an assistant tool call, its tool result and the
// next state; on the Responses API, previous_response_id), then the grid: N calls at each reasoning_effort x prompt
// cache on/off x API style, every call a ~3k-token stable prefix (tools + system brief) plus a changing game-state
// suffix. Measures TTFT, total latency, tokens and $, writes logs/probe-<date>.csv and prints a summary table.
// The default target is the local mock; the real API needs --live AND MODEL_API_KEY, and the worst-case $ is printed
// (and checked against --max-usd) before the first call.
//
//   node scripts/probe.mjs                         # mock: brain shape, then 20 x [minimal, low, medium] x [on, off] x [chat]
//   node scripts/probe.mjs --live                  # the real API from MODEL_BASE_URL / MODEL_ID, asks before spending
//   node scripts/probe.mjs --live --n 5 --efforts minimal,low --api chat,responses --yes
//   node scripts/probe.mjs --live --shape brain --yes   # only the multi-turn check (2 calls per API)

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import OpenAI from 'openai';
import { loadConfig, isLocalUrl, EFFORTS } from '../src/config.js';
import { createLLM, LLMError, rejectsStreamOptions } from '../src/llm.js';
import { replayable } from '../src/brain.js';
import { cost, tokens, PRICES } from '../src/pricing.js';
import { toolsForApi } from '../src/contracts.js';
import { BLUEPRINTS, BLUEPRINT_NAMES } from '../src/game.js';

export const APIS = Object.freeze(['chat', 'responses']);
export const SHAPES = Object.freeze(['brain', 'grid']);
export const CSV_COLUMNS = Object.freeze([
  'run', 'target', 'api', 'model', 'tier', 'effort', 'cache', 'shape', 'stream', 'round', 'warmup', 'time', 'ok', 'status', 'error',
  'ttft_ms', 'first_byte_ms', 'latency_ms', 'prompt_tokens', 'cached_tokens', 'completion_tokens', 'reasoning_tokens',
  'usage_estimated', 'usd', 'tool', 'finish_reason', 'served_model', 'prompt_chars', 'adapted',
]);
const ADAPT_HINTS = Object.freeze({
  stream: 'TTFT now equals the whole call; say so next to any latency number',
  tool_schema: 'the brain does the same on its own; MODEL_TOOL_SCHEMA=basic skips the refused first call',
  merge_user_turns: 'the brain does the same on its own (goal and state go as one message)',
});

/**
 * Watches a chat client's adaptations (src/llm.js): prints each new one once, returns them all as one CSV cell
 * ("tool_schema;merge_user_turns"), so every row says which request shape was really sent.
 */
function adaptationWatch(llm, print) {
  let seen = 0;
  return () => {
    const list = llm?.adaptations ?? [];
    for (const a of list.slice(seen)) print(`  the server refused part of the request; from now on ${a.change} = ${a.detail}. ${ADAPT_HINTS[a.change] ?? ''}`.trimEnd());
    seen = list.length;
    return list.map((a) => a.change).join(';');
  };
}
/** Output tokens per call the plan assumes (reasoning included), for the "typical" estimate only. */
const PLAN_OUTPUT_TOKENS = 300;
/** Calls answered with these statuses would fail the same way again: the cell is skipped. */
const SKIP_CELL_STATUSES = new Set([400, 404, 405, 422]);

export class Refusal extends Error {
  constructor(message) { super(message); this.name = 'Refusal'; }
}

export const USAGE = `usage: node scripts/probe.mjs [options]

Target (default: the local mock, started in this process; nothing is billed)
  --live               call MODEL_BASE_URL (default https://api.meta.ai/v1) as MODEL_ID; needs MODEL_API_KEY
  --base-url URL       another LOCAL OpenAI-compatible server (llama.cpp, npm run mock); never sent the key
  --yes                skip the "spend up to $X?" question (required with --live when stdin is not a terminal)
  --max-usd X          refuse a live probe whose worst case exceeds X (default COST_CAP_HOUR)
  --dry-run            print the plan and the estimate, make no call

Grid
  --n N                calls per cell (default 20)
  --efforts LIST       reasoning_effort values (default minimal,low,medium)
  --cache LIST         on,off (default both; off also busts Meta's automatic prefix cache with a unique first line)
  --api LIST           chat,responses (default chat; responses is the optional A/B)
  --shape LIST         brain,grid (default both): brain = 2 multi-turn calls per API shaped like the brain's
                       requests (goal + state, then tool call, tool result, next state); grid = the latency grid
  --max-tokens N       max completion tokens per call, bounds the worst case (default 4096)
  --prefix-tokens N    size of the stable prefix, tools included (default 3000)
  --gap-ms MS          pause between calls (default 650 live, 0 mock; 650 keeps under 100 requests per minute)

Output
  --out FILE           CSV path (default LOG_DIR/probe-<date>.csv, never overwriting)
  --mock-ttft MS       delay the mock's first token (default 0)
  --quiet              no per-call lines`;

// ---------------------------------------------------------------------------------------------------------------
// Options

const list = (s) => String(s).split(',').map((x) => x.trim()).filter(Boolean);

function intOpt(v, name, min, max, def) {
  if (v === undefined) return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Refusal(`--${name} must be an integer from ${min} to ${max} (got "${v}")`);
  return n;
}

/** Parse argv into probe options. Throws Refusal with a readable message on bad input. */
export function parseCli(argv = []) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        live: { type: 'boolean' }, yes: { type: 'boolean' }, 'dry-run': { type: 'boolean' }, quiet: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        'base-url': { type: 'string' }, 'max-usd': { type: 'string' }, n: { type: 'string' }, efforts: { type: 'string' },
        cache: { type: 'string' }, api: { type: 'string' }, shape: { type: 'string' }, 'max-tokens': { type: 'string' }, 'prefix-tokens': { type: 'string' },
        'gap-ms': { type: 'string' }, out: { type: 'string' }, 'mock-ttft': { type: 'string' },
      },
    }));
  } catch (err) {
    throw new Refusal(`${err.message}\n\n${USAGE}`);
  }
  const efforts = list(values.efforts ?? 'minimal,low,medium');
  for (const e of efforts) {
    if (e === 'none') throw new Refusal('--efforts: "none" is rejected by Muse Spark (HTTP 400); minimal is the lowest');
    if (!EFFORTS.includes(e)) throw new Refusal(`--efforts: "${e}" is not one of ${EFFORTS.join(', ')}`);
  }
  const cache = list(values.cache ?? 'on,off');
  for (const c of cache) if (c !== 'on' && c !== 'off') throw new Refusal(`--cache takes on and/or off (got "${c}")`);
  const apis = list(values.api ?? 'chat');
  for (const a of apis) if (!APIS.includes(a)) throw new Refusal(`--api takes ${APIS.join(' and/or ')} (got "${a}")`);
  const shapes = list(values.shape ?? 'brain,grid');
  for (const x of shapes) if (!SHAPES.includes(x)) throw new Refusal(`--shape takes ${SHAPES.join(' and/or ')} (got "${x}")`);
  if (!shapes.length) throw new Refusal('--shape needs at least one value');
  let maxUsd = null;
  if (values['max-usd'] !== undefined) {
    maxUsd = Number(values['max-usd']);
    if (!Number.isFinite(maxUsd) || maxUsd <= 0) throw new Refusal(`--max-usd must be a positive number (got "${values['max-usd']}")`);
  }
  if (!efforts.length || !cache.length || !apis.length) throw new Refusal('--efforts, --cache and --api need at least one value');
  return {
    live: Boolean(values.live),
    yes: Boolean(values.yes),
    dryRun: Boolean(values['dry-run']),
    quiet: Boolean(values.quiet),
    help: Boolean(values.help),
    baseUrl: values['base-url']?.replace(/\/+$/, '') ?? null,
    maxUsd,
    n: intOpt(values.n, 'n', 1, 500, 20),
    efforts: [...new Set(efforts)],
    cache: [...new Set(cache)],
    apis: [...new Set(apis)],
    shapes: [...new Set(shapes)],
    maxTokens: intOpt(values['max-tokens'], 'max-tokens', 16, 65_536, 4096),
    prefixTokens: intOpt(values['prefix-tokens'], 'prefix-tokens', 500, 200_000, 3000),
    gapMs: values['gap-ms'] === undefined ? null : intOpt(values['gap-ms'], 'gap-ms', 0, 600_000),
    out: values.out ?? null,
    mockTtft: intOpt(values['mock-ttft'], 'mock-ttft', 0, 600_000, 0),
  };
}

/**
 * Where the probe sends calls. Without --live only local URLs are allowed; --live needs MODEL_API_KEY.
 * @returns {{kind: 'mock'|'local'|'live', baseURL: string|null}}
 */
export function chooseTarget(opts, config) {
  if (opts.live) {
    if (opts.baseUrl) throw new Refusal('--live calls MODEL_BASE_URL; do not combine it with --base-url');
    if (!config.model.hasKey) {
      throw new Refusal('refusing --live: MODEL_API_KEY is not set. Export it in your shell profile (never in a file here) and run again.');
    }
    return { kind: 'live', baseURL: config.model.baseURL };
  }
  if (opts.baseUrl) {
    if (!isLocalUrl(opts.baseUrl)) {
      throw new Refusal(`refusing ${opts.baseUrl}: without --live the probe only calls a local server. The real API needs --live and MODEL_API_KEY (and is read from MODEL_BASE_URL).`);
    }
    return { kind: 'local', baseURL: opts.baseUrl };
  }
  return { kind: 'mock', baseURL: null };
}

// ---------------------------------------------------------------------------------------------------------------
// Prompt: a stable brief (cacheable) and a changing state (never cached)

/** Same rough count the client and the mock use when a server sends no usage: 4 characters per token. */
export const estimateTokens = (text) => Math.ceil(String(text).length / 4);

function rng(seed) { // mulberry32: a small deterministic generator, so every run sends the same prompts
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BRIEF = `You are Muse, playing Minecraft Java Edition 1.21.4 in survival mode through a robot body. You see the game only as the text state in the user message and you act only through the tools. Each tool runs seconds to minutes of game work; after it finishes you get its result and a fresh state, and you choose the next tool.

Rules
- Call exactly one tool per turn. Answer in plain text only when the goal is done or impossible.
- Use exact Minecraft ids (oak_log, cobblestone, raw_iron, iron_ingot). Counts are 1 to 64.
- Read the last result before acting again. If the same call failed twice, change the plan instead of repeating it.
- Keep health above 6 and food above 6. Eat when food drops below 14. At night with hostile mobs near, build a shelter.
- Never attack players, villagers or pets. Never type commands in chat; say is for short status lines only.
- Do not walk more than 256 blocks in one go_to. Prefer collect, which finds and walks to blocks by itself.

Tech tree to an iron pickaxe
1. collect 5-6 logs of the nearest wood type, then craft planks (1 log = 4 planks).
2. craft a crafting_table (4 planks) and sticks (2 planks = 4 sticks). craft places the table for you when needed.
3. craft a wooden_pickaxe (3 planks + 2 sticks). It mines stone and coal_ore, not iron_ore.
4. collect stone (it drops cobblestone), then craft a stone_pickaxe (3 cobblestone + 2 sticks).
5. collect iron_ore with the stone pickaxe (it drops raw_iron; you need 3) and some coal_ore for fuel.
6. collect 8 more cobblestone, craft a furnace, then smelt raw_iron 3. Fuel: coal, charcoal, planks or logs.
7. craft the iron_pickaxe (3 iron_ingot + 2 sticks) next to a crafting table.

Recipes worth remembering
- oak_planks x4 <- oak_log x1 (any wood works the same way); stick x4 <- planks x2; crafting_table <- planks x4
- wooden_pickaxe <- planks x3 + stick x2; stone_pickaxe <- cobblestone x3 + stick x2; iron_pickaxe <- iron_ingot x3 + stick x2
- furnace <- cobblestone x8; torch x4 <- coal or charcoal x1 + stick x1; chest <- planks x8
- wooden_sword <- planks x2 + stick x1; stone_sword <- cobblestone x2 + stick x1; bread <- wheat x3
- smelt: raw_iron -> iron_ingot, logs -> charcoal, cobblestone -> stone, sand -> glass, beef -> cooked_beef

Fuel per unit: coal and charcoal smelt 8 items, a log or a plank 1.5, a stick 0.5. Never burn your last planks if you still need sticks.

Blueprints for build
${BLUEPRINT_NAMES.map((b) => `- ${b}: ${BLUEPRINTS[b].description}`).join('\n')}

Where things are
- Logs: trees on the surface; forests and river banks have the most.
- Stone: one to three blocks under grass and dirt, bare on hills, cliffs and cave walls.
- coal_ore: common near the surface and in cave walls. iron_ore: most common from y=0 to y=64, often visible in caves and cliffs; deepslate_iron_ore below y=0.
- If nothing you need is within 32 blocks, go_to a spot 40-60 blocks away in a new direction and look again.

Safety
- Never dig straight down: dig a staircase. Avoid lava (orange light below y=10). Leave water alone.
- Creepers explode: fight them only with full health or walk away. Zombies and skeletons burn in daylight.
- Darkness spawns hostile mobs: place torches in tunnels and stay near light at night.

Notes from earlier runs (long-term memory)`;

const NOTE_TEMPLATES = [
  (r, p) => `- chest at ${p()}: ${1 + Math.floor(r() * 30)} cobblestone, ${Math.floor(r() * 6)} coal, ${Math.floor(r() * 12)} oak_planks`,
  (r, p) => `- furnace at ${p()}, left with ${Math.floor(r() * 4)} coal inside`,
  (r, p) => `- cave entrance at ${p()}: iron_ore visible on the left wall about ${4 + Math.floor(r() * 12)} blocks in`,
  (r, p) => `- birch and oak forest around ${p()}, about ${10 + Math.floor(r() * 40)} trees`,
  (r) => `- lesson: collect asked for ${4 + Math.floor(r() * 12)} stone but the patch held fewer; collect again from a new spot instead of waiting`,
  (r) => `- lesson: crafting away from the table failed ${1 + Math.floor(r() * 3)} times; carry a spare crafting_table`,
  (r, p) => `- night ${1 + Math.floor(r() * 5)}: hid in a shelter at ${p()} and lost no health`,
  (r) => `- lesson: iron_ore at y=${10 + Math.floor(r() * 50)} was reachable without digging down; look at cliff faces first`,
  (r, p) => `- village bell near ${p()}; do not take items from the villagers' chests`,
  (r) => `- lesson: a wooden_pickaxe broke after ${40 + Math.floor(r() * 20)} blocks; craft the stone one early`,
];

/**
 * The stable system brief, padded with long-term notes until tools + brief reach about targetTokens.
 * @param {{tools: object[], targetTokens?: number, seed?: number}} o
 */
export function buildBrief({ tools, targetTokens = 3000, seed = 7 }) {
  const r = rng(seed);
  const pos = () => `(${Math.floor(r() * 400) - 200}, ${50 + Math.floor(r() * 30)}, ${Math.floor(r() * 400) - 200})`;
  const toolChars = JSON.stringify(tools ?? []).length;
  const lines = [BRIEF];
  let chars = toolChars + BRIEF.length;
  for (let i = 0; i < 5_000 && Math.ceil(chars / 4) < targetTokens; i++) {
    const line = NOTE_TEMPLATES[i % NOTE_TEMPLATES.length](r, pos);
    lines.push(line);
    chars += line.length + 1;
  }
  return lines.join('\n');
}

const STAGES = [
  { inv: {}, last: 'get_state: ok' },
  { inv: { oak_log: 4 }, last: 'collect oak_log 4: ok, mined 4 oak_log in 18.2 s' },
  { inv: { oak_planks: 16 }, last: 'craft oak_planks 16: ok, made 16 oak_planks' },
  { inv: { oak_planks: 12, crafting_table: 1 }, last: 'craft crafting_table 1: ok' },
  { inv: { oak_planks: 7, stick: 2, wooden_pickaxe: 1 }, last: 'craft wooden_pickaxe 1: ok, placed crafting_table at (3, 64, 1)' },
  { inv: { oak_planks: 7, stick: 2, wooden_pickaxe: 1, cobblestone: 3 }, last: 'collect stone 3: ok, mined 3 stone (+3 cobblestone) in 9.4 s' },
  { inv: { oak_planks: 7, stone_pickaxe: 1, wooden_pickaxe: 1 }, last: 'craft stone_pickaxe 1: ok' },
  { inv: { oak_planks: 7, stone_pickaxe: 1, wooden_pickaxe: 1, coal: 2 }, last: 'collect coal_ore 2: ok, mined 2 coal_ore (+2 coal)' },
  { inv: { oak_planks: 7, stone_pickaxe: 1, raw_iron: 3, coal: 2 }, last: 'collect iron_ore 3: ok, mined 3 iron_ore (+3 raw_iron) in 41.0 s' },
  { inv: { oak_planks: 7, stone_pickaxe: 1, raw_iron: 3, coal: 2, cobblestone: 8 }, last: 'collect stone 8: ok, mined 8 stone (+8 cobblestone)' },
  { inv: { oak_planks: 7, stone_pickaxe: 1, raw_iron: 3, coal: 2, furnace: 1 }, last: 'craft furnace 1: ok' },
  { inv: { oak_planks: 7, stone_pickaxe: 1, iron_ingot: 3, coal: 1 }, last: 'smelt raw_iron 3: ok, 3 iron_ingot in 31.5 s' },
];
const NEARBY = ['oak_log', 'oak_leaves', 'stone', 'dirt', 'grass_block', 'coal_ore', 'iron_ore', 'gravel', 'sand', 'water', 'short_grass', 'andesite'];
const MOBS = [['cow', false], ['sheep', false], ['chicken', false], ['zombie', true], ['skeleton', true], ['spider', true]];
const RECENT = ['get_state', 'collect oak_log 4', 'craft oak_planks 16', 'craft crafting_table 1', 'craft stick 4', 'craft wooden_pickaxe 1', 'collect stone 3', 'craft stone_pickaxe 1', 'collect coal_ore 2', 'go_to 40 63 -12', 'collect iron_ore 3', 'collect stone 8', 'craft furnace 1', 'smelt raw_iron 3', 'eat'];

/** The changing suffix: a plausible game state for call i (different every call, about 300-400 tokens). */
export function stateText(i, seed = 11) {
  const r = rng(seed * 100_003 + i);
  const stage = STAGES[i % STAGES.length];
  const f = (n) => n.toFixed(1);
  const pos = { x: Math.floor(r() * 120) - 60, y: 60 + Math.floor(r() * 8), z: Math.floor(r() * 120) - 60 };
  const time = Math.floor(r() * 24000);
  const inv = { ...stage.inv };
  if (r() < 0.5) inv.dirt = 1 + Math.floor(r() * 9);
  if (r() < 0.3) inv.oak_sapling = 1 + Math.floor(r() * 3);
  const near = NEARBY.filter(() => r() < 0.75).map((name) => {
    const c = { x: pos.x + Math.floor(r() * 40) - 20, y: pos.y + Math.floor(r() * 10) - 6, z: pos.z + Math.floor(r() * 40) - 20 };
    return `${name} x${1 + Math.floor(r() * 120)} nearest (${c.x}, ${c.y}, ${c.z}) ${f(1 + r() * 30)} m`;
  });
  const mobs = MOBS.filter(() => r() < 0.35).map(([name, hostile]) => `${name} ${f(3 + r() * 25)} m${hostile ? ' (hostile)' : ''}`);
  const recent = Array.from({ length: 8 }, (_, k) => {
    const step = Math.max(1, i * 3 + k - 7);
    return `  ${step}. ${RECENT[(i + k) % RECENT.length]} -> ${r() < 0.85 ? 'ok' : 'failed: no path to the block'}`;
  });
  return [
    `Step ${i * 3 + 1}, ${Math.floor((i * 37) / 60)} min ${(i * 37) % 60} s into the run.`,
    `Health ${14 + Math.floor(r() * 7)}/20, food ${12 + Math.floor(r() * 9)}/20, ${time < 13000 || time >= 23000 ? 'day' : 'night'} (time ${time}).`,
    `Position x=${pos.x} y=${pos.y} z=${pos.z} in the overworld, holding ${Object.keys(inv).find((k) => k.endsWith('pickaxe')) ?? 'nothing'}.`,
    `Inventory: ${Object.entries(inv).map(([k, v]) => `${k} ${v}`).join(', ') || 'empty'}.`,
    `Nearby blocks within 32: ${near.join('; ') || 'none'}.`,
    `Mobs within 24: ${mobs.join('; ') || 'none'}.`,
    'Goal: get an iron pickaxe (have one in your inventory).',
    `Last result: ${stage.last}.`,
    'Recent steps:',
    ...recent,
    '',
    'Choose the next action: call exactly one tool.',
  ].join('\n');
}

/** Chat Completions messages for one probe call. `head` is the cache-busting first line (empty for cache on). */
export function buildMessages({ brief, head = '', state }) {
  return [{ role: 'system', content: `${head}${brief}` }, { role: 'user', content: state }];
}

/**
 * The tools with a nonce at the start of the first description, for cache-off calls. Many chat templates render the
 * tools before (or around) the system prompt, so a nonce in the system text alone would leave ~1.8k tokens of tools
 * as a shared prefix that an automatic prefix cache could still hit.
 */
export function bustTools(tools, nonce) {
  if (!tools.length) return tools;
  const [first, ...rest] = tools;
  return [{ ...first, function: { ...first.function, description: `${nonce} ${first.function.description}` } }, ...rest];
}

// ---------------------------------------------------------------------------------------------------------------
// Responses API (optional A/B): same prompt, flat tool definitions, reasoning.effort

/** Chat-style function tools -> the flat Responses form. */
export function flatTools(tools) {
  return tools.map((t) => ({ type: 'function', name: t.function.name, description: t.function.description, parameters: t.function.parameters, strict: t.function.strict }));
}

/** Responses usage -> the Chat Completions usage shape pricing.js reads. */
export function chatUsage(u) {
  if (!u) return null;
  return {
    prompt_tokens: u.input_tokens ?? 0,
    completion_tokens: u.output_tokens ?? 0,
    total_tokens: u.total_tokens ?? (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
    prompt_tokens_details: { cached_tokens: u.input_tokens_details?.cached_tokens ?? 0 },
    completion_tokens_details: { reasoning_tokens: u.output_tokens_details?.reasoning_tokens ?? 0 },
  };
}

/**
 * A minimal streamed client for POST /responses with the same guards as src/llm.js: tests may only call a local
 * server, a remote URL needs live, and the key goes only to config.model.baseURL.
 */
export function createResponsesClient({ config, baseURL, live = false, tier }) {
  const m = config.model;
  const url = baseURL.replace(/\/+$/, '');
  const local = isLocalUrl(url);
  if (!local && process.env.NODE_TEST_CONTEXT) throw new LLMError(`tests may only call a local mock, not ${url}`);
  if (!local && !live) throw new LLMError(`remote model calls are disabled (${url})`);
  let apiKey = url === m.baseURL ? m.apiKey : '';
  if (!apiKey) {
    if (!local) throw new LLMError(`MODEL_API_KEY is not set (needed for ${url})`);
    apiKey = 'local-mock';
  }
  const billTier = tier ?? m.tier;
  const client = new OpenAI({
    apiKey, baseURL: url, organization: null, project: null, adminAPIKey: null, webhookSecret: null,
    timeout: m.timeoutMs, maxRetries: 0, logLevel: 'error',
  });

  /** input: the user text, or a list of input items; previousResponseId continues a stored response (tool turns). */
  async function call({ instructions, input, tools, effort, cacheKey, maxTokens, signal, previousResponseId }) {
    const body = {
      model: m.id,
      instructions,
      input: Array.isArray(input) ? input : [{ role: 'user', content: input }],
      tools: flatTools(tools),
      tool_choice: 'auto',
      parallel_tool_calls: false,
      reasoning: { effort },
      stream: true,
    };
    if (previousResponseId) body.previous_response_id = previousResponseId;
    if (cacheKey) body.prompt_cache_key = cacheKey;
    if (maxTokens > 0) body.max_output_tokens = maxTokens;
    const t0 = performance.now();
    const since = () => performance.now() - t0;
    let firstByteMs = null;
    let ttftMs = null;
    let usage = null;
    let served = null;
    let finishReason = null;
    let tool = '';
    let text = '';
    let responseId = null;
    let callId = null;
    try {
      const events = await client.responses.create(body, { signal });
      for await (const ev of events) {
        if (firstByteMs === null) firstByteMs = since();
        if (ev.response?.id) responseId = ev.response.id;
        switch (ev.type) {
          case 'response.output_text.delta':
            if (ttftMs === null) ttftMs = since();
            text += ev.delta ?? '';
            break;
          case 'response.output_item.added':
            if (ev.item?.type === 'function_call') { if (ttftMs === null) ttftMs = since(); tool ||= ev.item.name ?? ''; callId ||= ev.item.call_id ?? null; }
            break;
          case 'response.function_call_arguments.delta':
            if (ttftMs === null) ttftMs = since();
            break;
          case 'response.completed':
          case 'response.incomplete':
            usage = ev.response?.usage ?? null;
            served = ev.response?.model ?? null;
            finishReason = ev.type === 'response.completed' ? (tool ? 'tool_calls' : 'stop') : (ev.response?.incomplete_details?.reason ?? 'incomplete');
            break;
          case 'response.failed':
            throw new LLMError(`model call failed: ${ev.response?.error?.message ?? 'response.failed'}`, { code: ev.response?.error?.code ?? null });
          case 'error':
            throw new LLMError(`model call failed: ${ev.message ?? 'stream error'}`, { code: ev.code ?? null });
          default:
        }
      }
    } catch (err) {
      if (err instanceof LLMError) throw err;
      const aborted = err?.name === 'AbortError' || err instanceof OpenAI.APIUserAbortError;
      const status = Number.isInteger(err?.status) ? err.status : null;
      throw new LLMError(aborted ? 'model call aborted' : `model call failed${status ? ` (HTTP ${status})` : ''}: ${err?.error?.message ?? err?.message ?? err}`, { status, aborted });
    }
    const latencyMs = since();
    let u = chatUsage(usage);
    const usageEstimated = !u;
    if (!u) {
      const prompt = estimateTokens(JSON.stringify({ i: instructions, input, t: body.tools }));
      const completion = estimateTokens(text + tool);
      u = { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion };
    }
    return { toolName: tool, callId, responseId, finishReason, usage: u, usageEstimated, tokens: tokens(u), usd: cost(u, billTier), ttftMs: ttftMs ?? latencyMs, firstByteMs, latencyMs, model: served, body };
  }
  return { call };
}

// ---------------------------------------------------------------------------------------------------------------
// Estimate, run, summarize

/**
 * Worst case: every call fully uncached (prompt estimate +25% for tokenizer error) and at max tokens.
 * Typical: the plan's assumption of ~300 output tokens, with the stable prefix cached on cache-on calls.
 */
export function estimateCost({ calls, cacheOnCalls = 0, promptTokens, prefixTokens, maxTokens, tier }) {
  const p = PRICES[tier];
  const worstPerCall = (Math.ceil(promptTokens * 1.25) * p.input + maxTokens * p.output) / 1e6;
  const uncachedCall = (promptTokens * p.input + PLAN_OUTPUT_TOKENS * p.output) / 1e6;
  const cachedCall = ((promptTokens - prefixTokens) * p.input + prefixTokens * p.cached + PLAN_OUTPUT_TOKENS * p.output) / 1e6;
  return {
    worstPerCall,
    worst: worstPerCall * calls,
    typical: uncachedCall * (calls - cacheOnCalls) + cachedCall * cacheOnCalls,
  };
}

function quantile(values, q) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * q;
  const lo = Math.floor(pos);
  return v[lo] + (v[Math.min(lo + 1, v.length - 1)] - v[lo]) * (pos - lo);
}
const mean = (values) => { const v = values.filter(Number.isFinite); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

/**
 * Per cell (api, effort, cache): latency quantiles and averages over successful, non-warm-up calls; $ over every call.
 * The first successful call of a cache-on cell only fills the cache, so it is counted as warm-up.
 */
export function summarize(rows) {
  const cells = new Map();
  for (const r of rows) {
    const k = `${r.api}|${r.effort}|${r.cache}`;
    if (!cells.has(k)) cells.set(k, { api: r.api, effort: r.effort, cache: r.cache, rows: [] });
    cells.get(k).rows.push(r);
  }
  return [...cells.values()].map(({ api, effort, cache, rows: rs }) => {
    const ok = rs.filter((r) => r.ok);
    const m = ok.filter((r) => !r.warmup);
    const prompt = mean(m.map((r) => r.prompt_tokens));
    const cached = mean(m.map((r) => r.cached_tokens));
    const usdPerCall = mean(m.map((r) => r.usd));
    return {
      api, effort, cache,
      calls: rs.length,
      ok: ok.length,
      measured: m.length,
      errors: rs.length - ok.length,
      lastError: rs.filter((r) => !r.ok).at(-1)?.error ?? null,
      ttft: { p50: quantile(m.map((r) => r.ttft_ms), 0.5), p90: quantile(m.map((r) => r.ttft_ms), 0.9) },
      latency: { p50: quantile(m.map((r) => r.latency_ms), 0.5), p90: quantile(m.map((r) => r.latency_ms), 0.9) },
      prompt,
      cached,
      cachedShare: prompt ? cached / prompt : null,
      completion: mean(m.map((r) => r.completion_tokens)),
      reasoning: mean(m.map((r) => r.reasoning_tokens)),
      toolRate: m.length ? m.filter((r) => r.tool).length / m.length : null,
      usdPerCall,
      usdPerHourAt5s: usdPerCall === null ? null : usdPerCall * 720,
      usdTotal: rs.reduce((s, r) => s + (r.usd || 0), 0),
    };
  });
}

const sec = (ms) => (ms === null || ms === undefined ? '-' : `${(ms / 1000).toFixed(2)}`);
const num = (v, d = 0) => (v === null || v === undefined ? '-' : v.toFixed(d));
const usd = (v, d = 4) => (v === null || v === undefined ? '-' : `$${v.toFixed(d)}`);
const pad = (cols, widths) => cols.map((c, i) => (i < 3 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i]))).join('  ');

/** The summary as a fixed-width text table plus cache on/off comparisons. */
export function formatSummary(stats, { target = 'mock', model = '', tier = '' } = {}) {
  const head = ['api', 'effort', 'cache', 'ok/n', 'ttft p50', 'p90', 'total p50', 'p90', 'prompt', 'cached', 'out', 'reason', '$/call', '$/h@5s', '$ sum'];
  const body = stats.map((s) => [
    s.api, s.effort, s.cache, `${s.ok}/${s.calls}`, sec(s.ttft.p50), sec(s.ttft.p90), sec(s.latency.p50), sec(s.latency.p90),
    num(s.prompt), s.cachedShare === null ? '-' : `${Math.round(s.cachedShare * 100)}%`, num(s.completion), num(s.reasoning),
    usd(s.usdPerCall, 5), usd(s.usdPerHourAt5s, 2), usd(s.usdTotal, 4),
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => String(r[i]).length)));
  const out = [
    `summary (${target === 'live' ? 'LIVE' : 'MOCK: simulated tokens and prices, not a measurement'}; ${model} ${tier}; seconds; warm-up calls excluded)`,
    pad(head, widths),
    pad(widths.map((w) => '-'.repeat(w)), widths),
    ...body.map((r) => pad(r, widths)),
  ];
  const errors = stats.filter((s) => s.errors);
  for (const s of errors) out.push(`  ${s.api} ${s.effort} cache=${s.cache}: ${s.errors} failed, last: ${s.lastError}`);
  const pairs = [];
  for (const on of stats.filter((s) => s.cache === 'on')) {
    const off = stats.find((s) => s.cache === 'off' && s.api === on.api && s.effort === on.effort);
    if (off && on.measured && off.measured) pairs.push([on, off]);
  }
  const pct = (v) => (v === null ? '-' : `${Math.round(v * 100)}%`);
  if (pairs.length) {
    out.push('', 'prompt cache, off -> on (cached share as the server reported it):');
    for (const [on, off] of pairs) {
      out.push(`  ${on.api} ${on.effort}: total p50 ${sec(off.latency.p50)} s -> ${sec(on.latency.p50)} s, ttft p50 ${sec(off.ttft.p50)} s -> ${sec(on.ttft.p50)} s, $/call ${usd(off.usdPerCall, 5)} -> ${usd(on.usdPerCall, 5)}, cached ${pct(off.cachedShare)} -> ${pct(on.cachedShare)}`);
    }
  }
  for (const s of stats.filter((x) => x.cache === 'off' && x.cachedShare > 0)) {
    out.push(`  note: ${s.api} ${s.effort} cache=off calls still reported ${pct(s.cachedShare)} cached; compare by the cached column, not the label`);
  }
  return out.join('\n');
}

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csvLine = (row) => CSV_COLUMNS.map((c) => csvCell(row[c])).join(',');

function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** LOG_DIR/probe-<date>.csv, or probe-<date>-2.csv and so on when that exists. */
export function csvPathFor(dir, date = new Date()) {
  const base = `probe-${localDate(date)}`;
  for (let i = 1; ; i++) {
    const file = path.join(dir, `${base}${i === 1 ? '' : `-${i}`}.csv`);
    if (!fs.existsSync(file)) return file;
  }
}

const PROBE_REPLIES = [
  { tool: 'collect', args: { block: 'oak_log', n: 4 } },
  { tool: 'craft', args: { item: 'oak_planks', n: 16 } },
  { tool: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
  { tool: 'collect', args: { block: 'stone', n: 3 } },
  { tool: 'smelt', args: { item: 'raw_iron', n: 3 } },
  { tool: 'get_state', args: {} },
];

const sleep = (ms, signal) => new Promise((resolve) => {
  if (!(ms > 0) || signal?.aborted) return resolve();
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
});

/**
 * Run the grid. Calls are interleaved (round 1 of every cell, then round 2, ...) so drift in the API's load spreads
 * over every cell. Cache "on" sends prompt_cache_key with an identical prefix; cache "off" sends no key and puts a
 * unique nonce first in the system prompt AND first in the tool descriptions, so whichever order a chat template
 * renders them in, no prefix is shared with an earlier call. Each row records the cached tokens the server reported,
 * so an "off" call that still hits shows up. A cell whose server refuses stream_options (HTTP 400) goes on without
 * streaming (TTFT is then the whole call).
 * @param {object} o  parseCli() options plus {config, target:{kind, baseURL}, signal?, print?, csvFile?}
 * @returns {Promise<{rows: object[], stats: object[], csvFile: string|null, stopped: string|null, spent: number}>}
 */
export async function runProbe(o) {
  const { config, target, signal } = o;
  const print = o.print ?? console.log;
  const live = target.kind === 'live';
  const runId = o.runId ?? `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(2).toString('hex')}`;
  const tools = toolsForApi(config.model.toolSchema);
  const brief = o.brief ?? buildBrief({ tools, targetTokens: o.prefixTokens });
  const cacheKey = `probe-${runId}`;
  const runHead = `[probe run ${runId}]\n`; // keeps an earlier run's cached prefix from counting as this run's hit
  const tier = config.model.tier;
  const llm = o.apis.includes('chat') ? createLLM({ config, baseURL: target.baseURL, allowRemote: live }) : null;
  const adaptedCell = adaptationWatch(llm, print);
  let chatStream = true;
  const responses = o.apis.includes('responses') ? createResponsesClient({ config, baseURL: target.baseURL, live }) : null;
  const gapMs = o.gapMs ?? (live ? 650 : 0);
  const worstPerCall = o.worstPerCall ?? 0;
  const maxUsd = live ? o.maxUsd : Infinity;

  const cells = [];
  for (const api of o.apis) for (const effort of o.efforts) for (const cache of o.cache) cells.push({ api, effort, cache, key: `${api}|${effort}|${cache}` });
  const total = cells.length * o.n;
  const skipped = new Map();
  const primed = new Set();
  const rows = [];
  let spent = 0;
  let stopped = null;
  let consecutive = 0;
  const csvFile = o.csvFile ?? null;
  if (csvFile && !o.csvReady) startCsv(csvFile);

  outer:
  for (let round = 0; round < o.n; round++) {
    for (const cell of cells) {
      if (signal?.aborted) { stopped = 'interrupted'; break outer; }
      if (skipped.has(cell.key)) continue;
      if (spent + worstPerCall > maxUsd) { stopped = `budget: $${spent.toFixed(4)} spent, the next call could pass --max-usd $${maxUsd}`; break outer; }
      const nonce = `[probe call ${crypto.randomBytes(6).toString('hex')}]`;
      const head = cell.cache === 'off' ? `${nonce}\n` : runHead;
      const cellTools = cell.cache === 'off' ? bustTools(tools, nonce) : tools;
      const state = stateText(round * cells.length + cells.indexOf(cell));
      const row = {
        run: runId, target: target.kind, api: cell.api, model: config.model.id, tier, effort: cell.effort, cache: cell.cache,
        shape: 'grid', stream: cell.api === 'chat' ? chatStream : true,
        round: round + 1, warmup: false, time: new Date().toISOString(), ok: false, status: null, error: null,
        prompt_chars: head.length + brief.length + state.length,
      };
      try {
        let r;
        if (cell.api === 'chat') {
          const ask = (stream) => llm.chat({
            messages: buildMessages({ brief, head, state }), tools: cellTools, effort: cell.effort,
            cacheKey: cell.cache === 'on' ? cacheKey : null, maxTokens: o.maxTokens, stream, signal,
          });
          try {
            r = await ask(chatStream);
          } catch (err) {
            if (!chatStream || !rejectsStreamOptions(err)) throw err;
            chatStream = false; // the server streams without include_usage, or not at all: measure plain JSON calls
            row.stream = false;
            print('  the server refused stream_options: the rest of the chat calls go without streaming');
            r = await ask(false);
          }
          r.toolName = r.toolCalls[0]?.name ?? '';
        } else {
          r = await responses.call({
            instructions: `${head}${brief}`, input: state, tools: cellTools, effort: cell.effort,
            cacheKey: cell.cache === 'on' ? cacheKey : null, maxTokens: o.maxTokens, signal,
          });
        }
        Object.assign(row, {
          ok: true, status: 200, ttft_ms: r.ttftMs, first_byte_ms: r.firstByteMs, latency_ms: r.latencyMs,
          prompt_tokens: r.tokens.prompt, cached_tokens: r.tokens.cached, completion_tokens: r.tokens.completion,
          reasoning_tokens: r.tokens.reasoning, usage_estimated: r.usageEstimated, usd: r.usd, tool: r.toolName,
          finish_reason: r.finishReason, served_model: r.model,
        });
        if (cell.cache === 'on' && !primed.has(cell.key)) { row.warmup = true; primed.add(cell.key); }
        spent += r.usd;
        consecutive = 0;
      } catch (err) {
        if (err?.aborted || signal?.aborted) { stopped = 'interrupted'; break outer; }
        Object.assign(row, { status: err?.status ?? null, error: String(err?.message ?? err).slice(0, 300) });
        consecutive += 1;
        if (SKIP_CELL_STATUSES.has(err?.status)) skipped.set(cell.key, row.error);
      }
      if (cell.api === 'chat') row.adapted = adaptedCell();
      rows.push(row);
      if (csvFile) fs.appendFileSync(csvFile, `${csvLine(row)}\n`);
      if (!o.quiet) {
        const tag = `[${String(rows.length).padStart(String(total).length)}/${total}] ${cell.api} ${cell.effort.padEnd(7)} cache=${cell.cache.padEnd(3)}`;
        print(row.ok
          ? `${tag} ttft ${sec(row.ttft_ms)} s  total ${sec(row.latency_ms)} s  prompt ${row.prompt_tokens} (cached ${row.cached_tokens})  out ${row.completion_tokens} (reasoning ${row.reasoning_tokens})  ${usd(row.usd, 5)}  -> ${row.tool || row.finish_reason || 'text'}${row.warmup ? '  [warm-up]' : ''}`
          : `${tag} FAILED ${row.status ?? ''} ${row.error}${skipped.has(cell.key) ? '  (cell skipped)' : ''}`);
      }
      if (consecutive >= 5) { stopped = `5 failed calls in a row, last: ${row.error}`; break outer; }
      const backoff = row.status === 429 ? (live ? 20_000 : 0) : gapMs;
      await sleep(backoff, signal);
    }
  }
  return { rows, stats: summarize(rows), csvFile, stopped, spent, skipped: Object.fromEntries(skipped) };
}

/** Create the CSV with its header row. */
export function startCsv(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${CSV_COLUMNS.join(',')}\n`);
}

/**
 * The requests the brain really sends, which the grid does not: two calls per API. Chat step 1 is [system, goal
 * (user), state (user)]; step 2 appends the assistant message as the brain replays it (tool call, content null), a
 * tool result with the matching tool_call_id, and the next state. Responses step 2 continues with previous_response_id
 * and a function_call_output item. Each row records the status and the cached tokens, so the first live run settles
 * whether Meta accepts these shapes before any paid brain run depends on them.
 * @param {object} o  parseCli() options plus {config, target, brief?, signal?, print?, csvFile?, runId?}
 * @returns {Promise<{rows: object[], spent: number}>}
 */
export async function runBrainShape(o) {
  const { config, target, signal } = o;
  const print = o.print ?? console.log;
  const live = target.kind === 'live';
  const tools = toolsForApi(config.model.toolSchema);
  const brief = o.brief ?? buildBrief({ tools, targetTokens: o.prefixTokens });
  const runId = o.runId ?? `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(2).toString('hex')}`;
  const cacheKey = `probe-brain-${runId}`;
  const effort = o.efforts[0];
  const goal = 'Goal: get an iron pickaxe (have one in your inventory).';
  const toolResult = 'OK: collect done (probe)\nInventory change: +4 oak_log';
  const rows = [];
  let spent = 0;

  const record = (api, step, r, err, promptChars, adapted = '') => {
    const row = {
      run: runId, target: target.kind, api, model: config.model.id, tier: config.model.tier, effort, cache: 'on',
      shape: `brain-${step}`, stream: !/\bstream\b/.test(adapted), round: step, warmup: step === 1, time: new Date().toISOString(),
      ok: Boolean(r), status: r ? 200 : err?.status ?? null, error: r ? null : String(err?.message ?? err).slice(0, 300), prompt_chars: promptChars,
      adapted,
    };
    if (r) {
      Object.assign(row, {
        ttft_ms: r.ttftMs, first_byte_ms: r.firstByteMs, latency_ms: r.latencyMs, prompt_tokens: r.tokens.prompt,
        cached_tokens: r.tokens.cached, completion_tokens: r.tokens.completion, reasoning_tokens: r.tokens.reasoning,
        usage_estimated: r.usageEstimated, usd: r.usd, tool: r.toolName, finish_reason: r.finishReason, served_model: r.model,
      });
      spent += r.usd;
    }
    rows.push(row);
    if (o.csvFile) fs.appendFileSync(o.csvFile, `${csvLine(row)}\n`);
    print(r
      ? `[brain ${api} ${step}/2] ok  prompt ${row.prompt_tokens} (cached ${row.cached_tokens})  ${usd(row.usd, 5)}  -> ${row.tool || row.finish_reason || 'text'}`
      : `[brain ${api} ${step}/2] FAILED ${row.status ?? ''} ${row.error}`);
    return row;
  };
  const attempt = async (fn) => {
    try { return [await fn(), null]; } catch (err) {
      if (err?.aborted || signal?.aborted) throw err;
      return [null, err];
    }
  };

  for (const api of o.apis) {
    if (signal?.aborted) break;
    if (api === 'chat') {
      const llm = createLLM({ config, baseURL: target.baseURL, allowRemote: live });
      const adaptedCell = adaptationWatch(llm, print);
      const ask = (messages) => llm.chat({ messages, tools, effort, cacheKey, maxTokens: o.maxTokens, signal })
        .then((r) => Object.assign(r, { toolName: r.toolCalls[0]?.name ?? '' }));
      const m1 = [{ role: 'system', content: brief }, { role: 'user', content: goal }, { role: 'user', content: stateText(0) }];
      const [r1, e1] = await attempt(() => ask(m1));
      record('chat', 1, r1, e1, JSON.stringify(m1).length, adaptedCell());
      if (!r1) continue;
      const call = r1.toolCalls[0];
      const m2 = [...m1];
      if (call) m2.push(replayable(r1.message), { role: 'tool', tool_call_id: call.id, content: toolResult });
      else m2.push({ role: 'assistant', content: r1.content || '(no reply)' });
      m2.push({ role: 'user', content: stateText(1) });
      const [r2, e2] = await attempt(() => ask(m2));
      record('chat', 2, r2, e2, JSON.stringify(m2).length, adaptedCell());
    } else {
      const client = createResponsesClient({ config, baseURL: target.baseURL, live });
      const input1 = [{ role: 'user', content: goal }, { role: 'user', content: stateText(0) }];
      const ask = (input, previousResponseId) => client.call({ instructions: brief, input, tools, effort, cacheKey, maxTokens: o.maxTokens, signal, previousResponseId });
      const [r1, e1] = await attempt(() => ask(input1));
      record('responses', 1, r1, e1, JSON.stringify(input1).length + brief.length);
      if (!r1) continue;
      const input2 = [];
      if (r1.callId) input2.push({ type: 'function_call_output', call_id: r1.callId, output: toolResult });
      input2.push({ role: 'user', content: stateText(1) });
      const [r2, e2] = await attempt(() => ask(input2, r1.responseId));
      record('responses', 2, r2, e2, JSON.stringify(input2).length);
    }
  }
  return { rows, spent };
}

// ---------------------------------------------------------------------------------------------------------------
// CLI

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { return /^y(es)?$/i.test((await rl.question(question)).trim()); } finally { rl.close(); }
}

/**
 * The CLI. Returns an exit code: 0 done, 1 failed, 2 refused (bad options, no key, over budget, not confirmed).
 * @param {string[]} argv
 * @param {{env?: object, print?: Function, printErr?: Function, signal?: AbortSignal, interactive?: boolean}} [io]
 */
export async function main(argv = process.argv.slice(2), io = {}) {
  const env = io.env ?? process.env;
  const print = io.print ?? console.log;
  const printErr = io.printErr ?? console.error;
  const interactive = io.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY);
  let o;
  let config;
  let target;
  try {
    o = parseCli(argv);
    if (o.help) { print(USAGE); return 0; }
    config = loadConfig({ ...env, MODEL_MAX_RETRIES: '0' }); // one HTTP call per measurement: no silent retries
    target = chooseTarget(o, config);
  } catch (err) {
    printErr(err.message);
    return 2;
  }
  const live = target.kind === 'live';
  const maxUsd = o.maxUsd ?? config.caps.usdPerHour;
  let mock = null;
  try {
    if (target.kind === 'mock') {
      const { start } = await import('../test/mock-llm.js');
      mock = await start([], { fallback: (_body, i) => PROBE_REPLIES[i % PROBE_REPLIES.length], ttftMs: o.mockTtft });
      target = { kind: 'mock', baseURL: mock.url };
    }
    const tools = toolsForApi(config.model.toolSchema);
    const brief = buildBrief({ tools, targetTokens: o.prefixTokens });
    const prefixTokens = estimateTokens(JSON.stringify({ tools, system: `[probe run x]\n${brief}` }));
    const promptTokens = estimateTokens(JSON.stringify({ tools, messages: buildMessages({ brief, head: '[probe call 000000000000]\n', state: stateText(0) }) }));
    const grid = o.shapes.includes('grid');
    const brainCalls = o.shapes.includes('brain') ? 2 * o.apis.length : 0;
    const calls = (grid ? o.n * o.efforts.length * o.cache.length * o.apis.length : 0) + brainCalls;
    const cacheOnCalls = (grid && o.cache.includes('on') ? o.n * o.efforts.length * o.apis.length : 0) + brainCalls / 2;
    const est = estimateCost({ calls, cacheOnCalls, promptTokens, prefixTokens, maxTokens: o.maxTokens, tier: config.model.tier });

    print(`probe: ${calls} calls = ${brainCalls ? `${brainCalls} brain-shaped (2 per api)` : ''}${brainCalls && grid ? ' + ' : ''}${grid ? `${o.n} x effort [${o.efforts.join(', ')}] x cache [${o.cache.join(', ')}] x api [${o.apis.join(', ')}]` : ''}`);
    print(live
      ? `target: LIVE ${target.baseURL} as ${config.model.id} (${config.model.tier} tier)`
      : `target: ${target.kind === 'mock' ? 'mock LLM (in process)' : 'local server'} at ${target.baseURL}; nothing is billed, $ below are simulated at ${config.model.tier} prices`);
    print(`prompt: ~${promptTokens} tokens per call (stable prefix with tools ~${prefixTokens}, state ~${promptTokens - prefixTokens}); max ${o.maxTokens} completion tokens per call`);
    print(`estimated max $: ${est.worst.toFixed(4)} (every call uncached at max tokens, ${config.model.tier} prices); typical ~$${est.typical.toFixed(4)} (${PLAN_OUTPUT_TOKENS} output tokens per call)`);

    if (live && est.worst > maxUsd) {
      printErr(`refusing: the worst case $${est.worst.toFixed(4)} is over --max-usd $${maxUsd} (default COST_CAP_HOUR). Lower --n or --max-tokens, or raise --max-usd.`);
      return 2;
    }
    if (o.dryRun) { print('dry run: no calls made.'); return 0; }
    if (live && !o.yes) {
      if (!interactive) { printErr('refusing: a live probe needs --yes when it cannot ask (stdin is not a terminal).'); return 2; }
      if (!(await confirm(`Spend up to $${est.worst.toFixed(2)} on ${target.baseURL}? [y/N] `))) { printErr('not confirmed; nothing was called.'); return 2; }
    }

    const csvFile = o.out ? path.resolve(o.out) : csvPathFor(config.log.dir);
    startCsv(csvFile);
    let pre = { rows: [], spent: 0 };
    if (brainCalls) {
      pre = await runBrainShape({ ...o, config, target, brief, signal: io.signal, print, csvFile });
      const bad = pre.rows.filter((r) => !r.ok);
      const changes = [...new Set(pre.rows.flatMap((r) => (r.adapted ? r.adapted.split(';') : [])))];
      const merged = changes.includes('merge_user_turns');
      print(bad.length
        ? `brain-shaped requests: ${bad.length} of ${pre.rows.length} FAILED (${bad.map((r) => `${r.api} ${r.shape}: ${r.status ?? ''} ${r.error}`).join('; ')}); fix the request shape before a brain run`
        : `brain-shaped requests: all ${pre.rows.length} accepted (${merged ? 'goal and state merged into one user message' : 'two user messages in a row'}, a replayed tool call and its tool result${o.apis.includes('responses') ? ', previous_response_id' : ''})${changes.length ? `; the chat client adapted: ${changes.join(', ')}` : ''}`);
    }
    let res = { rows: [], stats: [], stopped: null, spent: 0 };
    if (grid && !io.signal?.aborted) {
      res = await runProbe({
        ...o, config, target, brief, signal: io.signal, print, csvFile, csvReady: true, maxUsd: maxUsd - pre.spent, worstPerCall: est.worstPerCall,
      });
      print('');
      print(formatSummary(res.stats, { target: target.kind === 'live' ? 'live' : 'mock', model: config.model.id, tier: config.model.tier }));
    }
    const rows = [...pre.rows, ...res.rows];
    const spent = pre.spent + res.spent;
    print('');
    print(`${rows.length} calls, ${rows.filter((r) => r.ok).length} ok, $${spent.toFixed(4)}${live ? '' : ' (simulated)'}${res.stopped ? `; stopped early: ${res.stopped}` : ''}`);
    print(`csv: ${csvFile}`);
    return rows.some((r) => r.ok) ? 0 : 1;
  } catch (err) {
    printErr(`probe failed: ${err.message}`);
    return 1;
  } finally {
    await mock?.close();
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const ac = new AbortController();
  let hits = 0;
  process.on('SIGINT', () => { hits += 1; if (hits > 1) process.exit(130); ac.abort(); });
  process.exitCode = await main(process.argv.slice(2), { signal: ac.signal });
}
