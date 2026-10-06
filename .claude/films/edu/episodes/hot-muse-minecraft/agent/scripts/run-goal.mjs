// scripts/run-goal.mjs - runs the brain on one goal from the command line: "iron_pickaxe", "logs:10", "hut" or any
// "<item>[:n]". By default it joins the Minecraft server in config.mc (localhost/LAN only) and calls the model from
// config, under the step and $ caps; every decision goes to a JSONL log, milestones print as they happen and the HUD
// numbers print at the end. --mock runs the local mock model against the fake bot: no server, no key, nothing billed.
//
//   node scripts/run-goal.mjs iron_pickaxe                    # real server + real model (MODEL_API_KEY)
//   node scripts/run-goal.mjs logs:10 --mock                  # mock model + fake bot
//   MODEL_BASE_URL=http://127.0.0.1:8788/v1 node scripts/run-goal.mjs wooden_pickaxe --fake-bot   # `npm run mock` + fake bot
//   node scripts/run-goal.mjs hut --mock-llm                  # mock model + real server (integration test, C8)
//   node scripts/run-goal.mjs iron_pickaxe --steps 120 --usd 0.5 --effort minimal --minutes 30

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { loadConfig, EFFORTS, isLocalUrl } from '../src/config.js';
import { createLLM } from '../src/llm.js';
import { createLogger, readJsonl } from '../src/log.js';
import { createHourMeter } from '../src/pricing.js';
import { STOP_REASONS } from '../src/contracts.js';
import { LOGS, PLANKS, blueprintBlockCount } from '../src/game.js';
import { registryFor } from '../src/mc.js';
import { MILESTONES, milestonesIn, reduceRun, formatHud, clock } from './hud-data.mjs';

export class Refusal extends Error {
  constructor(message) { super(message); this.name = 'Refusal'; }
}

export const USAGE = `usage: node scripts/run-goal.mjs <goal> [options]

Goals: iron_pickaxe | logs:N | planks:N | hut | <item> | <item>:N  (item ids as in Minecraft 1.21.4)

Where it runs (default: the Minecraft server from MC_HOST/MC_PORT and the model from MODEL_BASE_URL/MODEL_ID)
  --mock               mock model + fake bot: no server, no key, nothing billed
  --mock-llm           mock model + the real server (scripted play, no key)
  --fake-bot           the real model + the fake bot (spends real $, under the caps; no server needed); with
                       MODEL_BASE_URL=http://127.0.0.1:8788/v1 it plays the script of a running \`npm run mock\`
  --script FILE        mock replies (JSON array of {tool, args}) instead of the built-in scripted player
  --mock-ttft MS       delay each mock reply (default 0)

Caps (defaults from STEP_CAP, COST_CAP_RUN, COST_CAP_HOUR)
  --steps N            most model decisions
  --usd X              most $ for this run
  --minutes M          stop after M minutes of wall clock
  --effort E           reasoning_effort (default MODEL_EFFORT)
  --seed=S             the server's level-seed, recorded in the log for the HUD (the server sets the world;
                       use the = form for a negative seed: --seed=-4172144997902289642)

Output
  --log-dir DIR        JSONL log folder (default LOG_DIR)
  --quiet              no per-decision lines`;

// ---------------------------------------------------------------------------------------------------------------
// Goals

const pretty = (name) => name.replace(/_/g, ' ');
const article = (word) => (/^[aeiou]/.test(word) ? 'an' : 'a');
const total = (inv, items) => items.reduce((s, k) => s + (inv?.[k] ?? 0), 0);

/**
 * Parse a goal spec. Returns {key, kind: 'items'|'build', items?, n?, blueprint?, text}. `text` is what the model is
 * told. Throws Refusal for anything else.
 * @param {string} spec
 * @param {{registry?: object}} [opts]  item names are checked against this (default 1.21.4)
 */
export function parseGoal(spec, { registry = registryFor('1.21.4') } = {}) {
  const s = String(spec ?? '').trim().toLowerCase();
  if (s === 'hut' || s === 'hut_3x3') {
    return {
      key: 'hut', kind: 'build', blueprint: 'hut_3x3',
      text: `Collect 10 logs and build a 3x3 hut (build blueprint hut_3x3, ${blueprintBlockCount('hut_3x3')} blocks of planks).`,
    };
  }
  const m = s.match(/^([a-z][a-z0-9_]{1,40})(?::(\d{1,4}))?$/);
  if (!m) throw new Refusal(`goal "${String(spec).slice(0, 60)}" is not one of: iron_pickaxe, logs:N, planks:N, hut, <item>, <item>:N`);
  const n = m[2] === undefined ? 1 : Number(m[2]);
  if (!Number.isInteger(n) || n < 1 || n > 2304) throw new Refusal(`goal count must be 1 to 2304 (got ${m[2]})`);
  const name = m[1];
  if (name === 'logs' || name === 'log') {
    return { key: `logs:${n}`, kind: 'items', items: LOGS, n, text: `Collect ${n} log${n > 1 ? 's' : ''} of any wood (have ${n} in your inventory at once).` };
  }
  if (name === 'planks') {
    return { key: `planks:${n}`, kind: 'items', items: PLANKS, n, text: `Have ${n} planks of any wood in your inventory.` };
  }
  if (!registry.itemsByName[name]) throw new Refusal(`"${name}" is not a Minecraft item id (e.g. iron_pickaxe, oak_log, cobblestone)`);
  return {
    key: n === 1 ? name : `${name}:${n}`,
    kind: 'items',
    items: [name],
    n,
    text: n === 1
      ? `Get ${article(name)} ${pretty(name)} (${name}) into your inventory.`
      : `Have ${n} ${name} in your inventory at once.`,
  };
}

/**
 * Whether the goal is met, from the last step (build goals) or the inventory (item goals).
 * @param {object} goal  parseGoal() result
 * @param {object|null} step  a StepResult
 * @param {Record<string, number>} inventory
 */
export function goalMet(goal, step, inventory) {
  if (goal.kind === 'build') return Boolean(step?.ok && step.tool === 'build' && step.args?.blueprint === goal.blueprint);
  return total(inventory, goal.items) >= goal.n;
}

// ---------------------------------------------------------------------------------------------------------------
// Scripted player for --mock / --mock-llm: picks the next tool call from the real inventory, so a skipped or failed
// step is simply tried again. It knows the wood/stone/iron tech tree and the hut, nothing else.

/** Item goals the scripted player can finish in the fake bot's forest scene, with the most it can make. */
export const MOCK_ITEMS = Object.freeze({
  crafting_table: 1, wooden_pickaxe: 1, cobblestone: 3, stone_pickaxe: 1, raw_iron: 3, furnace: 1, iron_ingot: 3, iron_pickaxe: 1,
});

/** True when the scripted player can play this goal. */
export function mockSupports(goal) {
  if (goal.kind === 'build') return goal.blueprint === 'hut_3x3';
  if (goal.items === LOGS || goal.items === PLANKS) return true;
  return goal.items.length === 1 && goal.n <= (MOCK_ITEMS[goal.items[0]] ?? 0);
}

const clamp = (n) => Math.max(1, Math.min(64, Math.ceil(n)));
const act = (tool, args = {}) => ({ tool, args });

/**
 * The next mock reply for a goal and an inventory: {tool, args}, or {content} once the goal is met.
 * @returns {{tool: string, args: object} | {content: string} | null}  null when the goal is not supported
 */
export function mockPolicy(goal, inv = {}) {
  if (!mockSupports(goal)) return null;
  const h = (k) => inv[k] ?? 0;
  const logs = total(inv, LOGS);
  const planks = total(inv, PLANKS);
  const wood = LOGS.find((l) => h(l) > 0)?.replace(/_log$/, '') ?? 'oak';
  const craftPlanks = () => act('craft', { item: `${wood}_planks`, n: clamp(logs * 4) });
  const needPlanks = (k) => (planks >= k ? null : logs > 0 ? craftPlanks() : act('collect', { block: 'oak_log', n: clamp((k - planks) / 4) }));
  const needTable = () => (h('crafting_table') ? null : needPlanks(4) ?? act('craft', { item: 'crafting_table', n: 1 }));
  const needSticks = () => (h('stick') >= 2 ? null : needPlanks(2) ?? act('craft', { item: 'stick', n: 4 }));
  if (goalMet(goal, null, inv)) return { content: 'Goal reached.' };

  if (goal.items === LOGS) return act('collect', { block: 'oak_log', n: clamp(goal.n - logs) });
  if (goal.items === PLANKS) return planks + logs * 4 >= goal.n ? craftPlanks() : act('collect', { block: 'oak_log', n: clamp((goal.n - planks) / 4 - logs) });
  if (goal.kind === 'build') {
    const need = blueprintBlockCount(goal.blueprint);
    const material = PLANKS.find((p) => h(p) >= need);
    if (material) return act('build', { blueprint: goal.blueprint, material });
    if (logs < 10 && planks + logs * 4 < need) return act('collect', { block: 'oak_log', n: clamp(10 - logs) });
    return craftPlanks();
  }

  // Tech tree to an iron pickaxe; the runner stops as soon as the goal item shows up.
  if (!h('wooden_pickaxe') && !h('stone_pickaxe') && !h('iron_pickaxe')) {
    // short of what this tier needs: gather 7 logs at once, enough wood for spare tables, sticks and fuel later
    const need = (h('crafting_table') ? 0 : 4) + (h('stick') >= 2 ? 0 : 2) + 3;
    if (logs * 4 + planks < need) return act('collect', { block: 'oak_log', n: clamp(7 - logs) });
    return needPlanks(9) ?? needTable() ?? needSticks() ?? act('craft', { item: 'wooden_pickaxe', n: 1 });
  }
  if (!h('stone_pickaxe') && !h('iron_pickaxe')) {
    if (h('cobblestone') < 3) return act('collect', { block: 'stone', n: 3 - h('cobblestone') });
    return needTable() ?? needSticks() ?? act('craft', { item: 'stone_pickaxe', n: 1 });
  }
  if (h('raw_iron') + h('iron_ingot') < 3) return act('collect', { block: 'iron_ore', n: 3 - h('raw_iron') - h('iron_ingot') });
  if (h('iron_ingot') < 3) {
    if (!h('furnace')) {
      if (h('cobblestone') < 8) return act('collect', { block: 'stone', n: 8 - h('cobblestone') });
      return needTable() ?? act('craft', { item: 'furnace', n: 1 });
    }
    if (!h('coal') && !h('charcoal') && planks < 2 && logs < 1) return act('collect', { block: 'coal_ore', n: 1 });
    return act('smelt', { item: 'raw_iron', n: clamp(h('raw_iron')) });
  }
  return needTable() ?? needSticks() ?? act('craft', { item: 'iron_pickaxe', n: 1 });
}

// ---------------------------------------------------------------------------------------------------------------
// CLI

/** Parse argv. Throws Refusal on bad input. */
export function parseCli(argv = []) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv, allowPositionals: true, strict: true,
      options: {
        mock: { type: 'boolean' }, 'mock-llm': { type: 'boolean' }, 'fake-bot': { type: 'boolean' }, quiet: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        script: { type: 'string' }, 'mock-ttft': { type: 'string' }, steps: { type: 'string' }, usd: { type: 'string' },
        minutes: { type: 'string' }, effort: { type: 'string' }, 'log-dir': { type: 'string' }, seed: { type: 'string' },
      },
    }));
  } catch (err) {
    throw new Refusal(`${err.message}\n\n${USAGE}`);
  }
  if (values.help) return { help: true };
  if (positionals.length !== 1) throw new Refusal(`give exactly one goal\n\n${USAGE}`);
  const int = (k, min, max) => {
    if (values[k] === undefined) return null;
    const n = Number(values[k]);
    if (!Number.isInteger(n) || n < min || n > max) throw new Refusal(`--${k} must be an integer from ${min} to ${max}`);
    return n;
  };
  const num = (k, min, max) => {
    if (values[k] === undefined) return null;
    const n = Number(values[k]);
    if (!Number.isFinite(n) || n < min || n > max) throw new Refusal(`--${k} must be a number from ${min} to ${max}`);
    return n;
  };
  if (values.effort !== undefined && !EFFORTS.includes(values.effort)) {
    throw new Refusal(`--effort must be one of ${EFFORTS.join(', ')}${values.effort === 'none' ? ' ("none" is rejected; minimal is the lowest)' : ''}`);
  }
  if (values.seed !== undefined && !/^-?[A-Za-z0-9_]{1,40}$/.test(values.seed)) throw new Refusal('--seed must be 1 to 40 letters, digits, _ or a leading -');
  if (values.mock && (values['mock-llm'] || values['fake-bot'])) throw new Refusal('--mock already means --mock-llm plus --fake-bot');
  if (values.script && !values.mock && !values['mock-llm']) throw new Refusal('--script needs --mock or --mock-llm');
  return {
    help: false,
    goal: positionals[0],
    llm: values.mock || values['mock-llm'] ? 'mock' : 'api',
    world: values.mock || values['fake-bot'] ? 'fake' : 'server',
    script: values.script ?? null,
    mockTtft: int('mock-ttft', 0, 600_000) ?? 0,
    steps: int('steps', 1, 100_000),
    usd: num('usd', 0, 10_000),
    minutes: num('minutes', 0.01, 10_000),
    effort: values.effort ?? null,
    seed: values.seed ?? null,
    logDir: values['log-dir'] ?? null,
    quiet: Boolean(values.quiet),
  };
}

function waitReady(body, ms, where) {
  return new Promise((resolve, reject) => {
    const offs = [];
    const done = (fn, v) => { clearTimeout(timer); for (const off of offs) off?.(); fn(v); };
    const timer = setTimeout(() => done(reject, new Error(`no spawn in ${Math.round(ms / 1000)} s at ${where}; is the server running, offline mode, reachable?`)), ms);
    offs.push(body.on?.('end', (d) => done(reject, new Error(`disconnected from ${where}: ${d?.reason ?? 'ended'}`))));
    offs.push(body.on?.('error', (d) => done(reject, new Error(`cannot join ${where}: ${d?.message ?? 'error'}`))));
    Promise.resolve(body.ready).then((v) => done(resolve, v), (err) => done(reject, err));
  });
}

const fmtArgs = (a) => (a && Object.keys(a).length ? JSON.stringify(a) : '');
const fmtDelta = (d) => Object.entries(d ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');

/**
 * The CLI. Returns an exit code: 0 goal reached, 1 the run ended another way or failed, 2 refused.
 * @param {string[]} argv
 * @param {{env?: object, print?: Function, printErr?: Function, signal?: AbortSignal,
 *   deps?: {createBody?: Function, createBrain?: Function}}} [io]  deps replaces src/body.js / src/brain.js (tests)
 */
export async function main(argv = process.argv.slice(2), io = {}) {
  const print = io.print ?? console.log;
  const printErr = io.printErr ?? console.error;
  let o;
  let config;
  let goal;
  try {
    o = parseCli(argv);
    if (o.help) { print(USAGE); return 0; }
    config = loadConfig(io.env ?? process.env);
    goal = parseGoal(o.goal, { registry: registryFor(config.mc.version) });
    if (o.llm === 'mock' && !o.script && !mockSupports(goal)) {
      throw new Refusal(`the scripted mock player cannot play "${goal.key}" (it knows logs:N, planks:N, hut and ${Object.keys(MOCK_ITEMS).join(', ')}); pass --script replies.json`);
    }
  } catch (err) {
    printErr(err.message);
    return 2;
  }

  const caps = { ...config.caps, ...(o.steps ? { steps: o.steps } : {}), ...(o.usd !== null ? { usdPerRun: o.usd } : {}) };
  const meter = createHourMeter({ usdPerHour: caps.usdPerHour });
  const mode = o.llm === 'mock' ? (o.world === 'fake' ? 'mock' : 'mock-llm') : o.world === 'fake' ? 'fake-bot' : 'live';
  const where = o.world === 'fake' ? 'the fake bot (forest scene)' : `${config.mc.host}:${config.mc.port} (Minecraft ${config.mc.version})`;
  const scratch = o.llm === 'mock' || o.world === 'fake' ? fs.mkdtempSync(path.join(os.tmpdir(), 'muse-run-goal-')) : null;
  const cleanup = [];
  let log = null;
  try {
    const createBody = io.deps?.createBody ?? (await import('../src/body.js')).createBody;
    const createBrain = io.deps?.createBrain ?? (await import('../src/brain.js')).createBrain;

    let script = null;
    if (o.script) {
      script = JSON.parse(fs.readFileSync(o.script, 'utf8'));
      if (!Array.isArray(script)) throw new Refusal('--script must hold a JSON array of replies');
    }

    let body = null;
    let mock = null;
    let llm;
    if (o.llm === 'mock') {
      const { start } = await import('../test/mock-llm.js');
      const policy = () => mockPolicy(goal, body?.inventory() ?? {}) ?? { content: 'I do not know how to do that.' };
      mock = await start(script ?? [], { fallback: script ? null : policy, ttftMs: o.mockTtft });
      cleanup.push(() => mock.close());
      llm = createLLM({ config, baseURL: mock.url, effort: o.effort ?? undefined, allowRemote: false });
    } else {
      llm = createLLM({ config, effort: o.effort ?? undefined }); // throws when the key is missing for a remote API
    }
    log = createLogger({
      config, dir: o.logDir ?? config.log.dir, model: llm.model, effort: llm.effort, tier: llm.tier,
      runId: `${mode === 'live' ? '' : `${mode}-`}${new Date().toISOString().replace(/[:.]/g, '-')}`,
    });

    if (o.world === 'fake') {
      const { createFakeBot } = await import('../test/fake-bot.js');
      body = createBody({ bot: createFakeBot({ scene: 'forest' }), config, log });
    } else {
      body = createBody({ config, log });
    }
    cleanup.unshift(() => body.close());
    await waitReady(body, o.world === 'fake' ? 10_000 : 45_000, where);

    const notes = scratch ? path.join(scratch, 'notes.json') : config.memory.notesPath; // mock play never teaches the real notes
    const brain = createBrain({ body, llm, log, caps, meter, notes, config });

    print(`goal: ${goal.key}: ${goal.text}`);
    const local = o.llm === 'mock' || isLocalUrl(llm.baseURL); // a local endpoint bills nothing
    print(`mode: ${mode}; world ${where}; model ${llm.model} · ${llm.effort} · ${llm.tier}${o.llm === 'mock' ? ` (mock at ${llm.baseURL}, $ simulated)` : ` at ${llm.baseURL}${local ? ' (local endpoint, $ simulated)' : ''}`}`);
    print(`caps: ${caps.steps} decisions, $${caps.usdPerRun} this run, $${caps.usdPerHour} per hour, ${caps.consecutiveErrors} failures in a row${o.minutes ? `, ${o.minutes} min` : ''}`);
    print(`log: ${log.path}`);

    const t0 = Date.now();
    const seen = new Set(milestonesIn(body.inventory()));
    if (!o.quiet) {
      log.subscribe((row) => {
        if (row.type !== 'decision') return;
        const d = fmtDelta(row.delta);
        print(`#${String(row.step).padStart(3)} ${clock(Date.now() - t0).padStart(5)}  ${row.tool ?? '(no tool)'} ${fmtArgs(row.args)}  ${row.ok ? 'ok' : 'FAILED'}${d ? `  ${d}` : ''}  ${Number.isFinite(row.latencyMs) ? `${(row.latencyMs / 1000).toFixed(1)} s  ` : ''}$${Number(row.totalUsd ?? 0).toFixed(4)}${row.ok ? '' : `  ${row.result.slice(0, 120)}`}`);
      });
    }
    log.event('run_start', {
      goal: goal.key, text: goal.text, mode, caps, model: llm.model, effort: llm.effort, tier: llm.tier, seed: o.seed,
      // what is not real in this run's numbers; hud-data turns it into the SIMULATED label a HUD render must show
      simulated: { model: o.llm === 'mock', cost: local, world: o.world === 'fake' },
      world: o.world === 'fake' ? { fake: 'forest' } : { host: config.mc.host, port: config.mc.port, version: config.mc.version },
    });
    body.setGoal?.(goal.text);

    const cond = (r, b) => {
      const inv = (b ?? body).inventory();
      for (const key of milestonesIn(inv)) {
        if (seen.has(key)) continue;
        seen.add(key);
        const m = MILESTONES.find((x) => x.key === key);
        log.event('milestone', { key, label: m.label, step: r?.step ?? null });
        print(`  * ${m.label} at ${clock(Date.now() - t0)} (decision ${r?.step ?? '?'}, $${brain.stats().usd.toFixed(4)})`);
      }
      return goalMet(goal, r, inv);
    };

    const ac = new AbortController();
    const signals = [ac.signal, ...(io.signal ? [io.signal] : [])];
    const stopBrain = (why) => { try { brain.stop(why); } catch { /* already stopped */ } };
    io.signal?.addEventListener('abort', () => stopBrain('interrupted'), { once: true });
    let timer = null;
    if (o.minutes) timer = setTimeout(() => { ac.abort(); stopBrain('time limit'); }, o.minutes * 60_000);

    let result;
    if (cond(null, body)) {
      print('the goal is already met; nothing to do.');
      result = { reason: 'goal', steps: 0, usd: 0, ms: 0, last: null };
    } else {
      result = await brain.runUntil(goal.text, cond, { signal: AbortSignal.any(signals) });
    }
    clearTimeout(timer);
    const met = goalMet(goal, result.last, body.inventory());
    log.event('run_end', { goal: goal.key, reason: result.reason, met, steps: result.steps, usd: result.usd, ms: result.ms });
    if (!STOP_REASONS.includes(result.reason)) printErr(`note: unexpected stop reason "${result.reason}"`);

    print('');
    print(`ended: ${result.reason}${met ? ' (goal met)' : ''}; ${result.steps} decisions, ${clock(result.ms)}, $${result.usd.toFixed(4)}${local ? ' (simulated)' : ''}`);
    if (log.path) print(formatHud(reduceRun(readJsonl(log.path), { file: log.path })));
    return met ? 0 : 1;
  } catch (err) {
    printErr(`run-goal failed: ${err.message}`);
    return err instanceof Refusal ? 2 : 1;
  } finally {
    for (const fn of cleanup) { try { await fn(); } catch { /* best effort */ } }
    log?.close();
    if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const ac = new AbortController();
  let hits = 0;
  process.on('SIGINT', () => { hits += 1; if (hits > 1) process.exit(130); ac.abort(); });
  process.exitCode = await main(process.argv.slice(2), { signal: ac.signal });
  // a real mineflayer connection or keep-alive sockets can hold the loop open after close()
  setTimeout(() => process.exit(process.exitCode), 2_000).unref();
}
