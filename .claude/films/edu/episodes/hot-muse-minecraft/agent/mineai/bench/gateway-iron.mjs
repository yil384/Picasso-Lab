// mineai/bench/gateway-iron.mjs - the strict iron route (test/e2e/mcp-iron.mjs, unchanged) through a running agent's
// /mcp, n games one after another or all at once, with what the machine did meanwhile: every process under the agent
// (BODY=mineai: each host and its runtime child) sampled every few seconds (RSS, CPU from the cumulative CPU time), the
// agent's own loop_delay rows and Mine AI host events from its JSONL log, and each bot's deaths from the server log.
// No model. The agent must run with MC_CONSOLE and SPREAD_SPOTS (one fresh spot per game, in order), so the bodies can
// be compared at the same spots on untouched copies of one world.
//
//   node mineai/bench/gateway-iron.mjs <agent URL> --agent-pid <pid> --agent-log <run-serve-*.jsonl>
//        --server-log <logs/latest.log> --label <name> [--n 10] [--parallel] [--stagger-ms 3000] [--out <dir>]
//
// Writes <out>/<label>.json (every run with its steps, the samples and the summary) and prints one line per run and a
// SUMMARY line. Bot names: MC_USERNAME of the agent + "_" + the game id (src/index.js usernameFor).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { runIronRoute } from '../../test/e2e/mcp-iron.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'agent-pid': { type: 'string' }, 'agent-log': { type: 'string' }, 'server-log': { type: 'string' },
    label: { type: 'string' }, n: { type: 'string', default: '10' }, parallel: { type: 'boolean' },
    'stagger-ms': { type: 'string', default: '3000' }, out: { type: 'string', default: '.' }, base: { type: 'string', default: 'Tst_rv' },
    'sample-ms': { type: 'string', default: '5000' }, minutes: { type: 'string', default: '15' },
  },
});
const url = positionals[0];
if (!url || !values['agent-pid'] || !values.label) {
  console.error('usage: node mineai/bench/gateway-iron.mjs <agent URL> --agent-pid <pid> --agent-log <file> --server-log <file> --label <name> [--n 10] [--parallel]');
  process.exit(64);
}
const agentPid = Number(values['agent-pid']);
const n = Number(values.n);
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// --- processes under the agent --------------------------------------------------------------------------------------
const cpuSeconds = (t) => { // ps time: [[dd-]hh:]mm:ss.cc
  const [d, rest] = t.includes('-') ? t.split('-') : ['0', t];
  const parts = rest.split(':').map(Number);
  while (parts.length < 3) parts.unshift(0);
  return Number(d) * 86_400 + parts[0] * 3600 + parts[1] * 60 + parts[2];
};
function processTree() {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,time=,command='], { encoding: 'utf8' }).trim().split('\n').map((l) => {
    const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(l);
    return m ? { pid: Number(m[1]), ppid: Number(m[2]), rssMb: Number(m[3]) / 1024, cpuS: cpuSeconds(m[4]), cmd: m[5] } : null;
  }).filter(Boolean);
  const under = new Set([agentPid]);
  let grew = true;
  while (grew) { grew = false; for (const r of rows) if (!under.has(r.pid) && under.has(r.ppid)) { under.add(r.pid); grew = true; } }
  return rows.filter((r) => under.has(r.pid)).map((r) => ({
    ...r,
    role: r.pid === agentPid ? 'agent' : /host\.ts/.test(r.cmd) ? 'host' : r.ppid !== agentPid && /bun|node/.test(r.cmd) ? 'runtime' : 'other',
  }));
}
const samples = [];
const lastCpu = new Map();
let sampling = true;
async function sampler() {
  const every = Number(values['sample-ms']);
  while (sampling) {
    const t = Date.now();
    try {
      for (const p of processTree()) {
        const prev = lastCpu.get(p.pid);
        lastCpu.set(p.pid, { t, cpuS: p.cpuS });
        const cpuPct = prev ? Math.round(((p.cpuS - prev.cpuS) / ((t - prev.t) / 1000)) * 1000) / 10 : null;
        samples.push({ t, pid: p.pid, ppid: p.ppid, role: p.role, rssMb: Math.round(p.rssMb), cpuPct, cmd: p.cmd.slice(0, 120) });
      }
    } catch { /* ps hiccup */ }
    await sleep(every);
  }
}

// --- the runs -------------------------------------------------------------------------------------------------------
const t0 = Date.now();
const samplerDone = sampler();
const runs = [];
async function one(i) {
  const lines = [];
  const started = Date.now();
  let run;
  try {
    run = await runIronRoute({ url, strict: true, print: (l) => lines.push(l), minutes: Number(values.minutes), name: `${values.label}-${i + 1}` });
  } catch (err) {
    run = { ok: false, made: false, error: String(err?.message ?? err), seconds: Math.round((Date.now() - started) / 100) / 10, calls: null, failed: null, steps: [] };
  }
  const firstAction = run.steps?.[0] ? Math.round((run.steps[0].at - run.steps[0].s) * 10) / 10 : null;
  const row = { i: i + 1, started: new Date(started).toISOString(), ended: new Date().toISOString(), firstActionAt: firstAction, ...run, lines };
  runs.push(row);
  console.log(`run ${i + 1}: ${run.ok ? 'PASS' : 'FAIL'} ${run.seconds} s, ${run.calls} MCP calls, ${run.failed} failed, game ${run.game}${run.error ? `, error ${run.error}` : ''}`);
  return row;
}
if (values.parallel) {
  await Promise.all(Array.from({ length: n }, async (_, i) => { await sleep(i * Number(values['stagger-ms'])); return one(i); }));
} else {
  for (let i = 0; i < n; i++) await one(i);
}
sampling = false;
await samplerDone;
const t1 = Date.now();

// --- the agent's log and the server log over the window ---------------------------------------------------------------
const inWindow = (iso) => { const t = Date.parse(iso); return t >= t0 && t <= t1 + 5_000; };
const agentRows = values['agent-log'] && fs.existsSync(values['agent-log'])
  ? fs.readFileSync(values['agent-log'], 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && inWindow(r.time))
  : [];
const loop = agentRows.filter((r) => r.kind === 'loop_delay');
const kinds = (k) => agentRows.filter((r) => r.kind === k);
const botName = (game) => `${values.base.slice(0, 16 - String(game).replace(/[^A-Za-z0-9_]/g, '').slice(0, 7).length - 1)}_${String(game).replace(/[^A-Za-z0-9_]/g, '').slice(0, 7)}`;
const serverLines = values['server-log'] && fs.existsSync(values['server-log']) ? fs.readFileSync(values['server-log'], 'utf8').split('\n') : [];
const DEATH = /^(was |drowned|died|fell |hit the ground|burned|went up in flames|went off|tried to swim|walked into|suffocated|blew up|starved|froze|experienced|discovered|withered|didn't want to live)/;
for (const r of runs) {
  if (!r.game) continue;
  const name = botName(r.game);
  r.bot = name;
  r.deaths = serverLines.map((l) => /\]: (\S+) (.*)$/.exec(l)).filter((m) => m && m[1] === name && DEATH.test(m[2])).map((m) => m[2]);
  r.spread = kinds('spread').find((x) => x.session === r.game)?.at ?? null;
}

// --- the summary ----------------------------------------------------------------------------------------------------
const passed = runs.filter((r) => r.ok);
const times = passed.map((r) => r.seconds);
const byPid = new Map();
for (const s of samples) {
  if (!byPid.has(s.pid)) byPid.set(s.pid, { pid: s.pid, role: s.role, cmd: s.cmd, rss: [], cpu: [] });
  byPid.get(s.pid).rss.push(s.rssMb);
  if (s.cpuPct !== null) byPid.get(s.pid).cpu.push(s.cpuPct);
}
const procs = [...byPid.values()].map((p) => ({ pid: p.pid, role: p.role, cmd: p.cmd, rssMaxMb: Math.max(...p.rss), rssMedMb: median(p.rss), cpuMedPct: median(p.cpu), cpuP90Pct: pct(p.cpu, 90), cpuMaxPct: p.cpu.length ? Math.max(...p.cpu) : null, samples: p.rss.length }));
const role = (k) => procs.filter((p) => p.role === k);
const sumAt = (k) => { // the most memory and CPU the role used together at one sample
  const at = new Map();
  for (const s of samples.filter((x) => x.role === k)) { const a = at.get(s.t) ?? { rss: 0, cpu: 0 }; a.rss += s.rssMb; a.cpu += s.cpuPct ?? 0; at.set(s.t, a); }
  const v = [...at.values()];
  return { rssMaxMb: v.length ? Math.max(...v.map((x) => x.rss)) : null, cpuMaxPct: v.length ? Math.round(Math.max(...v.map((x) => x.cpu))) : null };
};
const summary = {
  label: values.label, url, parallel: Boolean(values.parallel), n, wallS: Math.round((t1 - t0) / 1000),
  pass: passed.length, made: runs.filter((r) => r.made).length,
  medianS: median(times), maxS: times.length ? Math.max(...times) : null, p90S: pct(times, 90),
  deaths: runs.reduce((a, r) => a + (r.deaths?.length ?? 0), 0),
  failedSteps: runs.reduce((a, r) => a + (r.failed ?? 0), 0),
  mcpCalls: { median: median(runs.map((r) => r.calls).filter((x) => x !== null)), total: runs.reduce((a, r) => a + (r.calls ?? 0), 0) },
  loopDelay: { windows: loop.length, p50MsMedian: median(loop.map((r) => r.p50Ms)), p50MsMax: loop.length ? Math.max(...loop.map((r) => r.p50Ms)) : null, p99MsMedian: median(loop.map((r) => r.p99Ms)), p99MsMax: loop.length ? Math.max(...loop.map((r) => r.p99Ms)) : null, maxMs: loop.length ? Math.max(...loop.map((r) => r.maxMs)) : null },
  hosts: { started: kinds('mineai_host_start').length, ready: kinds('mineai_host_ready').length, heartbeatMisses: kinds('mineai_heartbeat_miss').length, restarts: kinds('mineai_host_restart').length, down: kinds('mineai_host_down').length, readyMs: median(kinds('mineai_host_ready').map((r) => r.ms)) },
  agent: role('agent')[0] ?? null,
  host: { n: role('host').length, rssMaxMb: Math.max(0, ...role('host').map((p) => p.rssMaxMb)), cpuMedPct: median(role('host').map((p) => p.cpuMedPct).filter((x) => x !== null)), together: sumAt('host') },
  runtime: { n: role('runtime').length, rssMaxMb: Math.max(0, ...role('runtime').map((p) => p.rssMaxMb)), rssMedMb: median(role('runtime').map((p) => p.rssMedMb)), cpuMedPct: median(role('runtime').map((p) => p.cpuMedPct).filter((x) => x !== null)), cpuP90Pct: median(role('runtime').map((p) => p.cpuP90Pct).filter((x) => x !== null)), cpuMaxPct: Math.max(0, ...role('runtime').map((p) => p.cpuMaxPct ?? 0)), together: sumAt('runtime') },
};
fs.mkdirSync(values.out, { recursive: true });
const file = path.join(values.out, `${values.label}.json`);
fs.writeFileSync(file, `${JSON.stringify({ summary, runs, procs, samples, loop, hostEvents: agentRows.filter((r) => /^mineai_/.test(r.kind)) }, null, 1)}\n`);
console.log(`SUMMARY ${JSON.stringify(summary)}`);
console.log(`written ${file}`);
