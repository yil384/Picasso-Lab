// scripts/hud-data.mjs - reduces a run's JSONL decision log to what the video HUD shows: when each milestone was reached
// (first log, wooden pickaxe, stone pickaxe, furnace, iron ingot, iron pickaxe) with the decision count and $ at that
// moment, run totals, the failures, and a per-decision timeline for the tool chips. Several logs give one row per run
// plus medians (the plan reports the median of three runs). Every run carries `label`: "SIMULATED" when the model, the
// $ or the world was simulated (--mock, --mock-llm, --fake-bot, a local endpoint), "UNVERIFIED" when the log does not
// say; a HUD render must show that label, and such numbers never go into a caption as measured.
//
//   node scripts/hud-data.mjs                                   # newest LOG_DIR/run-*.jsonl (not run-serve-*), as a table
//   node scripts/hud-data.mjs logs/run-a.jsonl logs/run-b.jsonl --out hud.json
//   node scripts/hud-data.mjs logs/run-a.jsonl --json            # JSON on stdout

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { LOGS } from '../src/game.js';
import { readJsonl } from '../src/log.js';

/** HUD milestones in tech-tree order. A milestone is reached the first time one of its items enters the inventory. */
export const MILESTONES = Object.freeze([
  Object.freeze({ key: 'first_log', label: 'First log', items: LOGS }),
  Object.freeze({ key: 'wooden_pickaxe', label: 'Wooden pickaxe', items: Object.freeze(['wooden_pickaxe']) }),
  Object.freeze({ key: 'stone_pickaxe', label: 'Stone pickaxe', items: Object.freeze(['stone_pickaxe']) }),
  Object.freeze({ key: 'furnace', label: 'Furnace', items: Object.freeze(['furnace']) }),
  Object.freeze({ key: 'iron_ingot', label: 'Iron ingot', items: Object.freeze(['iron_ingot']) }),
  Object.freeze({ key: 'iron_pickaxe', label: 'Iron pickaxe', items: Object.freeze(['iron_pickaxe']) }),
]);

/** Milestone keys an inventory ({name: count}) already satisfies. */
export function milestonesIn(inventory = {}) {
  return MILESTONES.filter((m) => m.items.some((i) => (inventory[i] ?? 0) > 0)).map((m) => m.key);
}

const MODES = Object.freeze(['live', 'fake-bot', 'mock-llm', 'mock']);
const PART_TEXT = Object.freeze({
  model: 'scripted mock model',
  cost: '$ and tokens simulated, nothing billed',
  world: 'fake world: instant moves, no real terrain',
});

/**
 * Which of a run's numbers are real, from run-goal's run_start event (its `mode` and `simulated` flags), else from
 * the run id prefix run-goal gives non-live runs. -> {mode, simulated: true|false|null, parts: string[], label}
 * @param {object|null} start   the run_start event
 * @param {string|null} runId
 */
export function provenance(start, runId = null) {
  let mode = MODES.includes(start?.mode) ? start.mode : null;
  if (!mode) mode = /^(mock-llm|fake-bot|mock)-/.exec(String(runId ?? ''))?.[1] ?? null;
  if (!mode) return { mode: null, simulated: null, parts: ['the log does not say how it was made'], label: 'UNVERIFIED' };
  const flags = {
    model: start?.simulated?.model ?? (mode === 'mock' || mode === 'mock-llm'),
    cost: start?.simulated?.cost ?? (mode === 'mock' || mode === 'mock-llm'),
    world: start?.simulated?.world ?? (mode === 'mock' || mode === 'fake-bot'),
  };
  const parts = Object.keys(PART_TEXT).filter((k) => flags[k]).map((k) => PART_TEXT[k]);
  return { mode, simulated: parts.length > 0, parts, label: parts.length ? 'SIMULATED' : null };
}

/** The worst label over several runs: any SIMULATED run makes the set SIMULATED, then any UNVERIFIED one. */
function worstLabel(runs) {
  if (runs.some((r) => r.simulated === true)) return { simulated: true, label: 'SIMULATED' };
  if (runs.some((r) => r.simulated === null)) return { simulated: null, label: 'UNVERIFIED' };
  return { simulated: false, label: null };
}

/** Whether one decision row reached a milestone: the item shows up in its delta (a furnace also counts when crafted). */
function hits(m, d) {
  const delta = d.delta ?? {};
  if (m.items.some((i) => (delta[i] ?? 0) > 0)) return true;
  return m.key === 'furnace' && d.ok && d.tool === 'craft' && d.args?.item === 'furnace';
}

/** 754000 -> "12:34"; an hour or more -> "1:02:03". */
export function clock(ms) {
  if (!Number.isFinite(ms)) return '-';
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const round = (v, d = 6) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * Reduce one run's log rows (src/log.js format) to HUD data. Times are milliseconds since the run_start event (or the
 * first row when there is none).
 * @param {object[]} rows
 * @param {{file?: string}} [opts]
 */
export function reduceRun(rows, { file = null } = {}) {
  const all = rows.filter((r) => r && typeof r === 'object');
  if (!all.length) throw new Error(`${file ?? 'log'} has no rows`);
  const first = all[0];
  const origin = Date.parse(first.time) - (Number.isFinite(first.elapsedMs) ? first.elapsedMs : 0);
  const msOf = (r) => (Number.isFinite(r.elapsedMs) ? r.elapsedMs : Date.parse(r.time) - origin);
  const events = all.filter((r) => r.type === 'event');
  const decisions = all.filter((r) => r.type === 'decision').sort((a, b) => msOf(a) - msOf(b));
  const start = events.find((e) => e.kind === 'run_start');
  const end = events.findLast((e) => e.kind === 'run_end');
  const t0 = start ? msOf(start) : msOf(first);
  const lastMs = Math.max(...all.map(msOf).filter(Number.isFinite));

  const reached = new Map();
  const timeline = [];
  const tools = {};
  let usd = 0;
  let n = 0;
  for (const d of decisions) {
    n += 1;
    usd += Number(d.costUsd) || 0;
    const atMs = msOf(d) - t0;
    if (d.tool) tools[d.tool] = (tools[d.tool] ?? 0) + 1;
    timeline.push({
      atMs, clock: clock(atMs), step: d.step ?? n, tool: d.tool ?? null, args: d.args ?? null, ok: Boolean(d.ok),
      result: d.result ?? '', delta: d.delta ?? {}, ttftMs: d.ttftMs ?? null, latencyMs: d.latencyMs ?? null,
      usd: round(Number(d.costUsd) || 0), totalUsd: round(usd),
    });
    for (const m of MILESTONES) {
      if (!reached.has(m.key) && hits(m, d)) {
        reached.set(m.key, { atMs, step: d.step ?? n, decisions: n, usd, tool: d.tool ?? null, args: d.args ?? null, time: d.time ?? null, source: 'decision' });
      }
    }
  }
  // Milestone events (written live by run-goal from the inventory) only fill gaps the deltas missed.
  for (const e of events.filter((x) => x.kind === 'milestone')) {
    const key = e.key ?? e.name;
    if (!MILESTONES.some((m) => m.key === key) || reached.has(key)) continue;
    const before = decisions.filter((d) => msOf(d) <= msOf(e));
    reached.set(key, {
      atMs: msOf(e) - t0, step: e.step ?? before.at(-1)?.step ?? null, decisions: before.length,
      usd: before.reduce((s, d) => s + (Number(d.costUsd) || 0), 0), tool: null, args: null, time: e.time ?? null, source: 'event',
    });
  }

  const sum = (k) => decisions.reduce((s, d) => s + (Number(d[k]) || 0), 0);
  const prompt = sum('promptTokens');
  const cached = sum('cachedTokens');
  const durationMs = (end ? msOf(end) : lastMs) - t0;
  const ok = decisions.filter((d) => d.ok).length;
  const meta = decisions[0] ?? {};
  const made = provenance(events.find((e) => e.kind === 'run_start' && e.mode) ?? start ?? null, first.run ?? null);
  return {
    file,
    run: first.run ?? null,
    mode: made.mode,
    simulated: made.simulated,
    simulatedParts: made.parts,
    label: made.label,
    model: meta.model ?? start?.model ?? null,
    effort: meta.effort ?? start?.effort ?? null,
    tier: meta.tier ?? start?.tier ?? null,
    goal: start?.goal ?? meta.goal ?? null,
    seed: start?.seed ?? null,
    start: Number.isFinite(origin + t0) ? new Date(origin + t0).toISOString() : null,
    end: Number.isFinite(origin + t0 + durationMs) ? new Date(origin + t0 + durationMs).toISOString() : null,
    reason: end?.reason ?? null,
    durationMs,
    clock: clock(durationMs),
    totals: {
      decisions: n,
      ok,
      failed: n - ok,
      usd: round(usd),
      promptTokens: prompt,
      cachedTokens: cached,
      completionTokens: sum('completionTokens'),
      reasoningTokens: sum('reasoningTokens'),
      // billed output, the same sum as the logger's totals (older rows without outputTokens count their completion)
      outputTokens: decisions.reduce((s, d) => s + (Number(d.outputTokens ?? d.completionTokens) || 0), 0),
      cacheHitRate: prompt ? round(cached / prompt, 4) : null,
      ttftMsP50: round(median(decisions.map((d) => d.ttftMs)), 1),
      latencyMsP50: round(median(decisions.map((d) => d.latencyMs)), 1),
      decisionsPerMinute: durationMs > 0 ? round((n / durationMs) * 60_000, 2) : null,
      tools,
    },
    milestones: MILESTONES.map((m) => {
      const r = reached.get(m.key);
      return r
        ? { key: m.key, label: m.label, reached: true, ...r, usd: round(r.usd), clock: clock(r.atMs) }
        : { key: m.key, label: m.label, reached: false, atMs: null, clock: null, step: null, decisions: null, usd: null };
    }),
    failures: decisions.filter((d) => !d.ok).slice(0, 50).map((d) => ({
      atMs: msOf(d) - t0, clock: clock(msOf(d) - t0), step: d.step ?? null, tool: d.tool ?? null, args: d.args ?? null, result: d.result ?? '',
    })),
    timeline,
  };
}

/** Several runs: each reduced, plus medians over the runs that reached each milestone. */
export function reduceRuns(list) {
  const runs = list.map(({ rows, file }) => reduceRun(rows, { file }));
  const med = (f) => median(runs.map(f));
  const durationMs = med((r) => r.durationMs);
  return {
    runs,
    ...worstLabel(runs),
    median: {
      runs: runs.length,
      durationMs,
      clock: clock(durationMs),
      decisions: med((r) => r.totals.decisions),
      usd: round(med((r) => r.totals.usd)),
      milestones: MILESTONES.map((m) => {
        const got = runs.map((r) => r.milestones.find((x) => x.key === m.key)).filter((x) => x?.reached);
        const atMs = median(got.map((x) => x.atMs));
        return {
          key: m.key, label: m.label, reachedIn: `${got.length}/${runs.length}`, atMs, clock: atMs === null ? null : clock(atMs),
          decisions: median(got.map((x) => x.decisions)), usd: round(median(got.map((x) => x.usd))),
        };
      }),
    },
  };
}

const money = (v) => (v === null || v === undefined ? '-' : `$${v.toFixed(v < 1 ? 4 : 2)}`);

/** A readable table for one reduced run or a reduceRuns() result. */
export function formatHud(data) {
  const table = (rows) => {
    const w = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
    return rows.map((r) => r.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('   ')).join('\n');
  };
  const tag = (r) => (r.label ? `${r.label}: ${r.simulatedParts.join('; ')}` : 'live: real model, real server');
  const one = (r) => [
    `${r.file ? path.basename(r.file) : r.run}  ${r.model ?? '?'} · ${r.effort ?? '?'} · ${r.tier ?? '?'}${r.seed ? ` · seed ${r.seed}` : ''}  goal ${r.goal ?? '?'}  ended: ${r.reason ?? '?'}`,
    `[${tag(r)}]${r.label ? ' - a plumbing check, not a measurement: label it in any HUD render, never caption it as measured' : ''}`,
    table([
      ['milestone', 'clock', 'decisions', '$'],
      ...r.milestones.map((m) => [m.label, m.clock ?? '-', m.decisions ?? '-', money(m.usd)]),
      ['total', r.clock, r.totals.decisions, money(r.totals.usd)],
    ]),
    `failed decisions ${r.totals.failed}; median ttft ${r.totals.ttftMsP50 === null ? '-' : `${(r.totals.ttftMsP50 / 1000).toFixed(2)} s`}, total ${r.totals.latencyMsP50 === null ? '-' : `${(r.totals.latencyMsP50 / 1000).toFixed(2)} s`}; prompt cached ${r.totals.cacheHitRate === null ? '-' : `${Math.round(r.totals.cacheHitRate * 100)}%`}`,
  ].join('\n');
  if (!data.runs) return one(data);
  const m = data.median;
  return [
    ...data.runs.map(one),
    `median of ${m.runs} runs${data.label ? ` [${data.label}: at least one run is ${data.label.toLowerCase()}]` : ''}`,
    table([
      ['milestone', 'reached', 'clock', 'decisions', '$'],
      ...m.milestones.map((x) => [x.label, x.reachedIn, x.clock ?? '-', x.decisions ?? '-', money(x.usd)]),
      ['total', '', m.clock, m.decisions ?? '-', money(m.usd)],
    ]),
  ].join('\n\n');
}

/** The newest run-*.jsonl in a folder, or null. Server logs (run-serve-*, from `npm start`) are not goal runs. */
export function newestLog(dir) {
  let files;
  try { files = fs.readdirSync(dir).filter((f) => /^run-(?!serve-).*\.jsonl$/.test(f)); } catch { return null; }
  return files.map((f) => path.join(dir, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? null;
}

/**
 * The CLI. Returns an exit code (0 ok, 2 bad input).
 * @param {string[]} argv
 * @param {{print?: Function, printErr?: Function, logDir?: string}} [io]
 */
export async function main(argv = process.argv.slice(2), io = {}) {
  const print = io.print ?? console.log;
  const printErr = io.printErr ?? console.error;
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv, allowPositionals: true, strict: true,
      options: { json: { type: 'boolean' }, out: { type: 'string' }, dir: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
    }));
  } catch (err) {
    printErr(err.message);
    return 2;
  }
  if (values.help) {
    print('usage: node scripts/hud-data.mjs [run.jsonl ...] [--json] [--out hud.json] [--dir LOG_DIR]');
    return 0;
  }
  let files = positionals;
  if (!files.length) {
    const dir = values.dir ?? io.logDir ?? (await import('../src/config.js')).config.log.dir;
    const newest = newestLog(dir);
    if (!newest) { printErr(`no run-*.jsonl in ${dir}`); return 2; }
    files = [newest];
  }
  let data;
  try {
    const list = files.map((file) => ({ file, rows: readJsonl(file) }));
    data = list.length === 1 ? reduceRun(list[0].rows, { file: list[0].file }) : reduceRuns(list);
  } catch (err) {
    printErr(err.message);
    return 2;
  }
  if (values.out) {
    fs.mkdirSync(path.dirname(path.resolve(values.out)), { recursive: true });
    fs.writeFileSync(values.out, `${JSON.stringify(data, null, 2)}\n`);
  }
  print(values.json ? JSON.stringify(data, null, 2) : formatHud(data));
  if (values.out && !values.json) print(`\nhud data: ${path.resolve(values.out)}`);
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exitCode = await main();
