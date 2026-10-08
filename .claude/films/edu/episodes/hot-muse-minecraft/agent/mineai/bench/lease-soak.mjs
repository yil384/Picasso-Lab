// mineai/bench/lease-soak.mjs - one game through a running agent's /mcp that plays out its whole lease with a mixed
// script and no model: gather logs, craft tools, mine stone, hunt, cook and eat, build a small hut, with idle stretches
// (no calls) between, then light work until the lease ends the game. Meanwhile it watches what a long game could wear
// down: every process under the agent (procs.mjs: memory and CPU of the agent, the bot's host and runtime), the agent's
// log (heartbeat misses, restarts, downs, the event loop, why and when the game ended), the bot's deaths in the server
// log, and the first-person live view: one socket.io connection to /eyes held for the whole game (events per minute,
// drops and reconnects) and the page fetched every minute.
//
//   node mineai/bench/lease-soak.mjs <agent URL> --agent-pid <pid> --agent-log <run-serve-*.jsonl>
//        --server-log <logs/latest.log> --label <name> [--public <URL the views are watched through>] [--idle-s 200]
//        [--out <dir>]
//
// Not strict: a step that fails is recorded and the script goes on (a hunt with no animal near, an eat on a full
// stomach). The point is the game's whole life: the lease must end it, not a crash, a missed heartbeat or the idle
// rule (an idle stretch stays under the 5 minutes that end a game nobody calls). Writes <out>/<label>.json and prints a
// line per step and a SUMMARY line.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { io } from 'socket.io-client';
import { connect, inventoryOf, woodOf, stateOf } from '../../test/e2e/mcp-iron.mjs';
import { startSampler } from './procs.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'agent-pid': { type: 'string' }, 'agent-log': { type: 'string' }, 'server-log': { type: 'string' },
    label: { type: 'string' }, public: { type: 'string' }, 'idle-s': { type: 'string', default: '200' },
    out: { type: 'string', default: '.' }, 'sample-ms': { type: 'string', default: '10000' }, 'max-minutes': { type: 'string', default: '40' },
  },
});
const url = String(positionals[0] ?? '').replace(/\/+$/, '');
if (!url || !values['agent-pid'] || !values.label) {
  console.error('usage: node mineai/bench/lease-soak.mjs <agent URL> --agent-pid <pid> --agent-log <file> --server-log <file> --label <name> [--public <URL>] [--idle-s 200]');
  process.exit(64);
}
const viewBase = String(values.public ?? url).replace(/\/+$/, '');
const idleS = Number(values['idle-s']);
if (!(idleS > 0 && idleS < 280)) { console.error('--idle-s must stay under the 5-minute idle rule (at most 279)'); process.exit(64); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

const t0 = Date.now();
const sec = () => Math.round((Date.now() - t0) / 100) / 10;
const sampler = startSampler({ agentPid: Number(values['agent-pid']), everyMs: Number(values['sample-ms']) });
const steps = [];
const notes = [];
const note = (line) => { notes.push({ at: sec(), line }); console.log(`[${sec()} s] ${line}`); };

// --- the game ---------------------------------------------------------------------------------------------------
const c = await connect(url, values.label);
let calls = 0;
let s = '';
let ended = null; // why the game ended, from a reply
const ENDED = /your game ended: ([^;\n]*)|no game|call start_game/i;
async function call(tool, args = {}) {
  calls += 1;
  const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 120_000 });
  const text = r.content.map((x) => x.text ?? '').join('\n');
  if (r.isError && ENDED.test(text)) ended ??= ENDED.exec(text)?.[1] ?? text.slice(0, 160);
  return { text, isError: Boolean(r.isError), data: r.structuredContent ?? null };
}
let rid = 0;
const FINAL = ['confirmed', 'failed', 'cancelled'];
/**
 * Steps in one play (one step) or play_sequence call with a request_id; the steps the reply could not wait for are
 * waited for with get_state, which reports each finished one once (structuredContent.earlier), as the staging check
 * does. Every step's outcome is recorded, ok or not.
 */
async function run(tool, label, list) {
  if (ended) return false;
  const t1 = Date.now();
  const args = tool === 'play' ? { ...list[0], request_id: `${values.label}-${++rid}` } : { steps: list, request_id: `${values.label}-${++rid}` };
  let r = await call(tool, args);
  s = r.text;
  if (ended) return false;
  if (!r.data?.steps?.length) {
    steps.push({ label, skill: list.map((x) => x.skill).join('+'), ok: false, at: sec(), s: Math.round((Date.now() - t1) / 100) / 10, line: r.text.split('\n').slice(0, 3).join(' ').slice(0, 300) });
    console.log(`[${sec()} s] FAILED ${label}: ${r.text.split('\n')[0].slice(0, 180)}`);
    return false;
  }
  const plan = r.data.steps; // as they run (crafts the check added included)
  const seen = new Map();
  const take = (reports) => {
    for (const st of reports ?? []) {
      if (seen.has(st.n) || !FINAL.includes(st.status)) continue;
      seen.set(st.n, st);
      const ok = st.status === 'confirmed';
      const line = `${st.skill} ${JSON.stringify(st.args)}: ${ok ? 'ok' : st.status}: ${st.result ?? st.why ?? ''}`;
      steps.push({ label, skill: st.skill, args: st.args, ok, at: sec(), s: Math.round((Date.now() - t1) / 100) / 10, line: line.slice(0, 300) });
      console.log(`[${sec()} s] ${ok ? 'ok    ' : 'FAILED'} ${label}: ${line.slice(0, 180)}`);
    }
  };
  take(plan);
  for (let w = 0; seen.size < plan.length && w < 20 && !ended; w++) {
    r = await call('get_state');
    s = r.text;
    take(r.data?.earlier);
    if (seen.size < plan.length && !r.data?.queue?.running && !r.data?.queue?.waiting) {
      note(`${label}: lost the results of ${plan.length - seen.size} step(s)`);
      break;
    }
  }
  return seen.size === plan.length && [...seen.values()].every((st) => st.status === 'confirmed');
}
const seq = (label, list) => run('play_sequence', label, list);
const one = (label, skill, args) => run('play', label, [{ skill, args }]);
async function idle(label, seconds) {
  if (ended) return;
  note(`idle: ${label}, ${seconds} s without calls`);
  steps.push({ label, skill: 'idle', args: { seconds }, ok: true, at: sec(), s: seconds, line: '' });
  await sleep(seconds * 1000);
}
const inv = () => inventoryOf(s);
const food = () => Number(/^health \d+\/20, food (\d+)/m.exec(stateOf(s))?.[1] ?? 20);

// --- the live view: one socket held for the whole game, the page every minute ---------------------------------
const view = { url: null, connects: 0, disconnects: [], errors: [], events: 0, byKind: {}, perMinute: [], pages: [] };
let socket = null;
let minuteEvents = 0;
function watch(eyesUrl) {
  const u = new URL(eyesUrl);
  view.url = `${u.origin}${u.pathname}`;
  socket = io(u.origin, { path: `${u.pathname}socket.io`, transports: ['websocket'], reconnection: true, reconnectionDelay: 2000 });
  socket.on('connect', () => { view.connects += 1; note(`eyes: connected (${view.connects})`); });
  socket.on('disconnect', (why) => { view.disconnects.push({ at: sec(), why }); note(`eyes: disconnected (${why})`); });
  socket.on('connect_error', (err) => {
    view.errors.push({ at: sec(), message: String(err?.message ?? err).slice(0, 120) });
    if (ended) socket.close(); // the view is gone with the game (410): stop asking
  });
  socket.onAny((kind) => { view.events += 1; minuteEvents += 1; view.byKind[kind] = (view.byKind[kind] ?? 0) + 1; });
}
let pageTimer = null;
function checkPagesEveryMinute() {
  pageTimer = setInterval(async () => {
    view.perMinute.push({ at: sec(), events: minuteEvents, connected: Boolean(socket?.connected) });
    minuteEvents = 0;
    if (!view.url) return;
    const row = { at: sec() };
    try {
      const r = await fetch(view.url, { signal: AbortSignal.timeout(15_000) });
      row.status = r.status;
      await r.arrayBuffer();
    } catch (err) { row.status = null; row.error = String(err?.message ?? err).slice(0, 120); }
    view.pages.push(row);
  }, 60_000);
}

let game = null;
let started = null;
try {
  const r = await call('start_game', { adult: true });
  if (r.isError) throw new Error(`start_game: ${r.text.slice(0, 300)}`);
  s = r.text;
  game = /game (g\w+)/.exec(s)?.[1] ?? null;
  started = Date.now();
  if (/still joining/.test(s)) s = (await call('get_state')).text;
  note(`game ${game}; ${/^position [^\n]*/m.exec(stateOf(s))?.[0] ?? ''}`);
  const lv = JSON.parse((await call('live_view')).text);
  const eyes = lv.first_person_url.replace(/^https?:\/\/[^/]+/, viewBase);
  watch(eyes);
  checkPagesEveryMinute();

  const wood = woodOf(s);
  // gather and craft
  await seq('gather', [{ skill: 'collect', args: { block: `${wood}_log`, n: 8 } }]);
  await seq('craft wood tools', [
    { skill: 'craft', args: { item: `${wood}_planks`, n: 28 } },
    { skill: 'craft', args: { item: 'stick', n: 8 } },
    { skill: 'craft', args: { item: 'crafting_table', n: 1 } },
    { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
  ]);
  await one('mine stone', 'collect', { block: 'stone', n: 40 });
  await seq('craft stone tools', [
    { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } },
    { skill: 'craft', args: { item: 'stone_sword', n: 1 } },
    { skill: 'craft', args: { item: 'furnace', n: 1 } },
  ]);
  await idle('idle 1', idleS);
  // hunt what is near (the state's mobs line), then cook and eat it
  const mobs = /^nearby mobs: (.*)$/m.exec(stateOf((await call('get_state')).text))?.[1] ?? '';
  const prey = [['cow', 'beef'], ['pig', 'porkchop'], ['sheep', 'mutton'], ['chicken', 'chicken']];
  const order = [...prey.filter(([m]) => new RegExp(`\\b${m}\\b`).test(mobs)), ...prey.filter(([m]) => !new RegExp(`\\b${m}\\b`).test(mobs))];
  let meat = null;
  for (const [mob, drop] of order.slice(0, 2)) {
    if (await one(`hunt ${mob}`, 'hunt', { mob, drop, n: 2 })) { meat = drop; break; }
  }
  if (meat) await one('cook', 'smelt', { item: meat, n: Math.min(2, inv()[meat] ?? 2) });
  // eating needs a food bar below 20: until then the rounds below eat as soon as it drops
  if (food() < 20) await one('eat', 'eat', {}); else note(`not hungry yet (food ${food()}/20): eating waits until the food bar drops`);
  await one('build a hut', 'build', { blueprint: 'hut_3x3', material: 'cobblestone' });
  await one('say', 'say', { text: 'a small hut, done' });
  await idle('idle 2', Math.min(279, idleS + 40));
  // light work until the lease ends the game
  for (let round = 1; !ended && Date.now() - t0 < Number(values['max-minutes']) * 60_000; round++) {
    await seq(`round ${round}`, [{ skill: 'collect', args: { block: `${wood}_log`, n: 3 } }, { skill: 'craft', args: { item: `${wood}_planks`, n: 4 } }]);
    if (ended) break;
    if (food() < 20) await one(`eat ${round}`, 'eat', {});
    await idle(`idle ${round + 2}`, 120);
    for (let k = 0; k < 4 && !ended; k++) { s = (await call('get_state')).text; await sleep(15_000); }
  }
} catch (err) {
  note(`harness error: ${err?.message ?? err}`);
} finally {
  if (!ended) await call('end_game').catch(() => {});
  await c.close().catch(() => {});
}
note(`game over: ${ended ?? 'ended by the harness'}`);
await sleep(15_000); // the agent's log rows of the end, the last page checks
clearInterval(pageTimer);
socket?.close();
await sampler.stop();
const t1 = Date.now();

// --- the agent's log and the server log ---------------------------------------------------------------------------
const inWindow = (iso) => { const t = Date.parse(iso); return t >= t0 && t <= t1; };
const rows = values['agent-log'] && fs.existsSync(values['agent-log'])
  ? fs.readFileSync(values['agent-log'], 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && inWindow(r.time))
  : [];
const kinds = (k) => rows.filter((r) => r.kind === k);
const mine = (r) => r.session === game || r.game === game;
const loop = kinds('loop_delay');
const start = kinds('session_start').find(mine);
const end = kinds('session_end').find(mine);
const name = kinds('bot_name').find(mine)?.username ?? null;
const serverLines = values['server-log'] && fs.existsSync(values['server-log']) ? fs.readFileSync(values['server-log'], 'utf8').split('\n') : [];
const DEATH = /^(was |drowned|died|fell |hit the ground|burned|went up in flames|went off|tried to swim|walked into|suffocated|blew up|starved|froze|experienced|discovered|withered|didn't want to live)/;
const deaths = name ? serverLines.map((l) => /\]: (\S+) (.*)$/.exec(l)).filter((m) => m && m[1] === name && DEATH.test(m[2])).map((m) => m[2]) : [];

// --- memory and CPU over the game: first, last and most of each process --------------------------------------------
const byPid = new Map();
for (const x of sampler.samples) {
  if (!byPid.has(x.pid)) byPid.set(x.pid, { pid: x.pid, role: x.role, cmd: x.cmd, rss: [], cpu: [], t: [] });
  const p = byPid.get(x.pid);
  p.rss.push(x.rssMb); p.t.push(x.t);
  if (x.cpuPct !== null) p.cpu.push(x.cpuPct);
}
const procs = [...byPid.values()].map((p) => ({
  pid: p.pid, role: p.role, cmd: p.cmd, samples: p.rss.length, minutes: Math.round((p.t.at(-1) - p.t[0]) / 6000) / 10,
  rssFirstMb: p.rss[0], rssLastMb: p.rss.at(-1), rssMaxMb: Math.max(...p.rss), rssMedMb: median(p.rss),
  // the last 5 minutes against the 5 minutes after the first 5 (a leak shows as a steady rise between them)
  rssEarlyMedMb: median(p.rss.filter((_, i) => p.t[i] - p.t[0] >= 300_000 && p.t[i] - p.t[0] < 600_000)),
  rssLateMedMb: median(p.rss.filter((_, i) => p.t.at(-1) - p.t[i] < 300_000)),
  cpuMedPct: median(p.cpu), cpuP90Pct: pct(p.cpu, 90), cpuMaxPct: p.cpu.length ? Math.max(...p.cpu) : null,
}));
// the live view's checks while the game ran (it ends with the game: 410 after)
const endAtS = end ? (Date.parse(end.time) - t0) / 1000 : Infinity;
const during = view.pages.filter((p) => p.at < endAtS);
const summary = {
  label: values.label, url, viewBase, game, bot: name,
  leaseMs: start?.leaseMs ?? null,
  gameMinutes: started && end ? Math.round((Date.parse(end.time) - Date.parse(start?.time ?? new Date(started).toISOString())) / 6000) / 10 : null,
  endedBy: end?.reason ?? ended ?? null,
  calls, ate: steps.some((x) => x.skill === 'eat' && x.ok), steps: steps.filter((x) => x.skill !== 'idle').length, okSteps: steps.filter((x) => x.skill !== 'idle' && x.ok).length,
  failed: steps.filter((x) => !x.ok).map((x) => `${x.label}: ${x.line.slice(0, 160)}`),
  idleS: steps.filter((x) => x.skill === 'idle').reduce((a, x) => a + x.s, 0),
  deaths,
  hosts: {
    started: kinds('mineai_host_start').filter(mine).length, ready: kinds('mineai_host_ready').filter(mine).length,
    heartbeatMisses: kinds('mineai_heartbeat_miss').filter(mine).length, restarts: kinds('mineai_host_restart').filter(mine).length,
    down: kinds('mineai_host_down').filter(mine).length, close: kinds('mineai_host_close').filter(mine).map((r) => ({ ms: r.ms ?? null, data: r.data ?? null })),
  },
  idleEnds: kinds('mcp_idle_end').filter(mine).length,
  loopDelay: { windows: loop.length, p99MsMedian: median(loop.map((r) => r.p99Ms)), p99MsMax: loop.length ? Math.max(...loop.map((r) => r.p99Ms)) : null, maxMs: loop.length ? Math.max(...loop.map((r) => r.maxMs)) : null },
  memory: Object.fromEntries(['agent', 'host', 'runtime'].map((role) => [role, procs.filter((p) => p.role === role && p.minutes > 1).map(({ pid, cmd, ...rest }) => rest)])),
  eyes: {
    url: view.url ? view.url.replace(/\/eyes\/[^/]+\//, '/eyes/<view>/') : null, connects: view.connects, disconnects: view.disconnects, connectErrors: view.errors.filter((e) => e.at < endAtS).length,
    events: view.events, byKind: view.byKind, minutesWithoutEvents: view.perMinute.filter((m) => m.events === 0 && m.at < endAtS).length,
    disconnectsWhileRunning: view.disconnects.filter((d) => d.at < endAtS).length,
    pageChecks: during.length, pageNot200: during.filter((p) => p.status !== 200).map((p) => ({ at: p.at, status: p.status, error: p.error ?? null })),
  },
};
fs.mkdirSync(values.out, { recursive: true });
const file = path.join(values.out, `${values.label}.json`);
fs.writeFileSync(file, `${JSON.stringify({ summary, steps, notes, view: { ...view, url: summary.eyes.url }, procs, samples: sampler.samples, loop, events: rows.filter((r) => mine(r) || /^mineai_/.test(r.kind)) }, null, 1)}\n`);
console.log(`SUMMARY ${JSON.stringify(summary)}`);
console.log(`written ${file}`);
process.exit(0);
