// mineai/bench/survive.mjs - the natural survival check of ROADMAP M4 ("the bot survives on its own"): n games at once
// through a running agent's /mcp, each played by a slow scripted player with no model for its whole lease: wood, a
// table, wooden and stone tools and a furnace, then long silences (a player thinking, or busy elsewhere) with a small
// task now and then, until the lease ends the game. The world runs its real day and night (the server's difficulty
// and daylight are whatever it is set to; the summary reads them from the state and says so). Strict: every step is
// sent once, the harness never fights, eats, shelters or picks anything up itself, and a failed step is recorded and
// not repeated. What it measures: deaths (the server log's death lines for the game's bot, and DIED in replies), how
// long each game lived and why it ended, the nights it lived through, health and food at their lowest, and what the
// body did on its own (each reply's structuredContent.onItsOwn) and whether every such action reached a reply.
//
//   node mineai/bench/survive.mjs <agent URL> --label <name> [--games 8] [--stagger-ms 4000] [--quiet-s 150-240]
//        [--agent-log <run-serve-*.jsonl>] [--server-log <logs/latest.log>] [--out <dir>] [--minutes 40] [--seed 1]
//
// A game passes when the lease ended it (not a crash, the idle rule or the harness) and its bot never died. Every quiet
// stretch stays under the 5-minute idle rule (get_state ends one). Writes <out>/<label>.json and prints a line per game
// and a SUMMARY line.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { connect, stateOf, woodOf, positionOf } from '../../test/e2e/mcp-iron.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    label: { type: 'string' }, games: { type: 'string', default: '8' }, 'stagger-ms': { type: 'string', default: '4000' },
    'quiet-s': { type: 'string', default: '150-240' }, 'agent-log': { type: 'string' }, 'server-log': { type: 'string' },
    out: { type: 'string', default: '.' }, minutes: { type: 'string', default: '40' }, seed: { type: 'string', default: '1' },
  },
});
const url = String(positionals[0] ?? '').replace(/\/+$/, '');
if (!url || !values.label) {
  console.error('usage: node mineai/bench/survive.mjs <agent URL> --label <name> [--games 8] [--quiet-s 150-240] [--agent-log f] [--server-log f] [--out dir]');
  process.exit(64);
}
const [quietMin, quietMax] = String(values['quiet-s']).split('-').map(Number);
if (!(quietMin > 0 && quietMax >= quietMin && quietMax < 280)) { console.error('--quiet-s A-B, both under the 5-minute idle rule (at most 279)'); process.exit(64); }
const games = Number(values.games);
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
const median = (xs) => pct(xs, 50);
/** A small seeded random source per game, so a run can be repeated with the same silences and tasks. */
function rng(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

const t0 = Date.now();
const iso = () => new Date().toISOString();

/** What the state block says: health, food, the time of day and whether it is night. */
function vitals(txt) {
  const st = stateOf(txt);
  const hf = /^health ([\d.]+)\/20, food (\d+)\/20/m.exec(st);
  const time = /^time (\d+): ([^\n]*)/m.exec(st);
  return {
    health: hf ? Number(hf[1]) : null,
    food: hf ? Number(hf[2]) : null,
    time: time ? Number(time[1]) : null,
    night: time ? Number(time[1]) >= 12542 && Number(time[1]) <= 23458 : null,
  };
}

const FINAL = ['confirmed', 'failed', 'cancelled'];
const ENDED = /your game ended: ([^;\n]*)|no game running/i;

async function playGame(i) {
  const name = `${values.label}-${i + 1}`;
  const r0 = rng(Number(values.seed) * 1000 + i + 1);
  const g = { i: i + 1, name, game: null, started: iso(), startedMs: Date.now(), endedWhy: null, livedS: null, calls: 0, steps: [], died: [], onItsOwn: [], samples: [], error: null };
  const sec = () => Math.round((Date.now() - g.startedMs) / 100) / 10;
  const say = (line) => console.log(`[${name} ${sec()} s] ${line}`);
  const deadline = Date.now() + Number(values.minutes) * 60_000;
  let c;
  let s = '';
  const seenOwn = new Set();
  const absorb = (r) => {
    const v = vitals(r.text);
    if (v.health !== null) g.samples.push({ at: sec(), ...v });
    for (const e of r.data?.onItsOwn ?? []) {
      const key = `${e.seq ?? ''}|${e.at ?? ''}|${e.text ?? ''}`;
      if (seenOwn.has(key)) continue;
      seenOwn.add(key);
      g.onItsOwn.push({ at: sec(), ...e });
      say(`on its own: ${e.kind ?? '?'}: ${String(e.text ?? '').slice(0, 160)}`);
    }
    const diedAt = /you died at -?\d+ -?\d+ -?\d+/.exec(r.text);
    if (r.data?.code === 'DIED' || diedAt) {
      const line = diedAt?.[0] ?? 'DIED';
      if (!g.died.some((d) => d.line === line)) { g.died.push({ at: sec(), line }); say(`DIED: ${line}`); }
    }
  };
  const call = async (tool, args = {}) => {
    g.calls += 1;
    const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 120_000 });
    const out = { text: r.content.map((x) => x.text ?? '').join('\n'), isError: Boolean(r.isError), data: r.structuredContent ?? null };
    if (out.isError && ENDED.test(out.text) && !/in the queue/.test(out.text)) g.endedWhy ??= (ENDED.exec(out.text)?.[1] ?? out.text.slice(0, 160)).trim();
    absorb(out);
    if (!out.isError || !g.endedWhy) s = out.text;
    return out;
  };
  let rid = 0;
  /** One call of steps (play or play_sequence, with a request_id), waited for with get_state; every outcome recorded. */
  async function run(label, list) {
    if (g.endedWhy || Date.now() > deadline) return false;
    const t1 = Date.now();
    const v = vitals(s);
    const args = list.length === 1 ? { ...list[0], request_id: `${name}-${++rid}` } : { steps: list, request_id: `${name}-${++rid}` };
    let r = await call(list.length === 1 ? 'play' : 'play_sequence', args);
    if (g.endedWhy) return false;
    if (!r.data?.steps?.length) {
      g.steps.push({ label, ok: false, at: sec(), night: v.night, line: r.text.split('\n').slice(0, 2).join(' ').slice(0, 240) });
      say(`REFUSED ${label}: ${r.text.split('\n')[0].slice(0, 160)}`);
      return false;
    }
    const plan = r.data.steps;
    const seen = new Map();
    const take = (reports) => {
      for (const st of reports ?? []) {
        if (seen.has(st.n) || !FINAL.includes(st.status)) continue;
        seen.set(st.n, st);
        const ok = st.status === 'confirmed';
        g.steps.push({ label, skill: st.skill, args: st.args, ok, code: st.code ?? null, at: sec(), s: Math.round((Date.now() - t1) / 100) / 10, night: v.night, line: `${st.result ?? st.why ?? ''}`.slice(0, 300) });
        say(`${ok ? 'ok    ' : 'FAILED'} ${st.skill} ${JSON.stringify(st.args)}: ${String(st.result ?? st.why ?? '').slice(0, 140)}`);
      }
    };
    take(plan);
    for (let w = 0; seen.size < plan.length && w < 30 && !g.endedWhy; w++) {
      r = await call('get_state');
      take(r.data?.earlier);
      if (seen.size < plan.length && !r.data?.queue?.running && !r.data?.queue?.waiting) break;
    }
    return seen.size === plan.length && [...seen.values()].every((st) => st.status === 'confirmed');
  }
  /** A quiet stretch: no calls for a while (under the idle rule), then get_state as a returning player would. */
  async function quiet(seconds) {
    if (g.endedWhy) return;
    const left = deadline - Date.now();
    await sleep(Math.max(0, Math.min(seconds * 1000, left)));
    if (Date.now() < deadline) await call('get_state');
  }
  try {
    c = await connect(url, name);
    let r = await call('start_game', { adult: true });
    while (/in the queue/.test(r.text) && Date.now() < deadline) { await sleep(20_000); r = await call('start_game', { adult: true }); }
    if (r.isError) throw new Error(`start_game: ${r.text.slice(0, 200)}`);
    g.endedWhy = null;
    g.game = /game (g\w+)/.exec(r.text)?.[1] ?? null;
    if (/still joining/.test(r.text)) r = await call('get_state');
    const p0 = positionOf(s);
    say(`game ${g.game} at ${p0 ? `${p0.x} ${p0.y} ${p0.z}` : '?'}, ${vitals(s).night ? 'night' : 'day'} (time ${vitals(s).time})`);
    const wood = woodOf(s);
    // the start: tools and a furnace, as a player would ask for them, in three calls
    await run('wood', [{ skill: 'collect', args: { block: `${wood}_log`, n: 6 } }]);
    await run('wooden tools', [
      { skill: 'craft', args: { item: `${wood}_planks`, n: 20 } },
      { skill: 'craft', args: { item: 'stick', n: 8 } },
      { skill: 'craft', args: { item: 'crafting_table', n: 1 } },
      { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
    ]);
    await run('stone', [{ skill: 'collect', args: { block: 'stone', n: 16 } }]);
    await run('stone tools', [
      { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } },
      { skill: 'craft', args: { item: 'stone_sword', n: 1 } },
      { skill: 'craft', args: { item: 'furnace', n: 1 } },
    ]);
    // then a slow player: long silences, a small task now and then, until the lease ends the game
    const tasks = [
      () => ['logs', [{ skill: 'collect', args: { block: `${wood}_log`, n: 3 } }]],
      () => ['stone', [{ skill: 'collect', args: { block: 'stone', n: 6 } }]],
      () => ['dirt', [{ skill: 'collect', args: { block: 'dirt', n: 4 } }]],
      () => {
        const p = positionOf(s);
        if (!p) return ['look', []];
        const a = r0() * Math.PI * 2;
        const d = 15 + Math.round(r0() * 20);
        return ['walk', [{ skill: 'go_to', args: { x: p.x + Math.round(Math.cos(a) * d), y: p.y, z: p.z + Math.round(Math.sin(a) * d) } }]];
      },
      () => ['look', []],
    ];
    while (!g.endedWhy && Date.now() < deadline) {
      await quiet(Math.round(quietMin + r0() * (quietMax - quietMin)));
      if (g.endedWhy || Date.now() >= deadline) break;
      const [label, list] = tasks[Math.floor(r0() * tasks.length)]();
      if (list.length) await run(label, list);
    }
    if (!g.endedWhy) g.endedWhy = 'the harness stopped (minutes)';
  } catch (err) {
    g.error = String(err?.message ?? err).slice(0, 300);
    say(`harness error: ${g.error}`);
  } finally {
    if (c) {
      if (!g.endedWhy) await c.callTool({ name: 'end_game', arguments: {} }).catch(() => {});
      await c.close().catch(() => {});
    }
  }
  g.livedS = sec();
  g.ended = iso();
  return g;
}

const results = await Promise.all(Array.from({ length: games }, async (_, i) => { await sleep(i * Number(values['stagger-ms'])); return playGame(i); }));
const t1 = Date.now();

// --- the agent's log and the server log: the bot's private name, its deaths, and what the body did on its own ----------
const inWindow = (t) => { const x = Date.parse(t); return x >= t0 - 5_000 && x <= t1 + 5_000; };
const agentRows = values['agent-log'] && fs.existsSync(values['agent-log'])
  ? fs.readFileSync(values['agent-log'], 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && inWindow(r.time))
  : [];
const names = new Map(agentRows.filter((r) => r.kind === 'bot_name').map((r) => [r.session, r.username]));
const serverLines = values['server-log'] && fs.existsSync(values['server-log']) ? fs.readFileSync(values['server-log'], 'utf8').split('\n') : [];
const DEATH = /^(was |drowned|died|fell |hit the ground|burned|went up in flames|went off|tried to swim|walked into|suffocated|blew up|starved|froze|experienced|discovered|withered|didn't want to live)/;
for (const g of results) {
  g.bot = names.get(g.game) ?? null;
  g.serverDeaths = g.bot ? serverLines.map((l) => /\]: (\S+) (.*)$/.exec(l)).filter((m) => m && m[1] === g.bot && DEATH.test(m[2])).map((m) => m[2]) : [];
  // what the body did by itself (the agent's care rows, its own plans and their reflexes; a step's own spare tool is in
  // that step's result) against what the replies carried: the last ones of a game may come after its last reply
  // (a line said again within 2 minutes is logged with repeat and on purpose not told again; what came after the game's
  // last reply that carried a state could not be told)
  const lastReply = g.samples.length ? g.startedMs + g.samples.at(-1).at * 1000 : 0;
  const told = agentRows.filter((r) => r.kind === 'care' && r.game === g.game && r.source !== 'step' && !r.repeat);
  g.careLogged = told.length;
  g.careLoggedBeforeLastReply = told.filter((r) => Date.parse(r.time) < lastReply - 500).length;
  g.careReported = g.onItsOwn.length;
  g.deaths = Math.max(g.died.length, g.serverDeaths.length);
  g.leaseEnded = /lease/.test(String(g.endedWhy ?? ''));
  g.pass = g.leaseEnded && g.deaths === 0 && !g.error;
  // nights lived: night samples between day samples
  let nights = 0; let wasNight = null; let fullNights = 0; let sawDusk = false;
  for (const x of g.samples) {
    if (x.night === null) continue;
    if (x.night && wasNight === false) { nights += 1; sawDusk = true; }
    if (!x.night && wasNight === true && sawDusk) fullNights += 1;
    wasNight = x.night;
  }
  g.nightsEntered = nights;
  g.fullNights = fullNights;
  g.healthMin = g.samples.length ? Math.min(...g.samples.map((x) => x.health)) : null;
  g.foodMin = g.samples.length ? Math.min(...g.samples.map((x) => x.food)) : null;
  const byKind = {};
  for (const e of g.onItsOwn) byKind[e.kind ?? '?'] = (byKind[e.kind ?? '?'] ?? 0) + 1;
  g.onItsOwnByKind = byKind;
  // how long after nightfall (12300) the body was sheltered or asleep, from the time of day each night's first one names
  const firsts = new Map();
  for (const e of g.onItsOwn) {
    const t = Number(/^night \(time (\d+)\)/.exec(e.text ?? '')?.[1]);
    if (!(e.ok && ['shelter', 'sleep'].includes(e.kind) && t >= 12_300)) continue;
    const night = Math.floor((e.at - (t - 12_300) / 20) / 600); // the night it belongs to (10-minute buckets of its start)
    if (!firsts.has(night)) firsts.set(night, Math.round((t - 12_300) / 20));
  }
  g.shelterAfterDuskS = [...firsts.values()];
  g.careMs = agentRows.filter((r) => r.kind === 'care' && r.game === g.game && r.source === 'care' && r.ms != null).map((r) => ({ kind: r.kind, ms: r.ms, text: r.text }));
  console.log(`game ${g.i} (${g.game}): ${g.pass ? 'PASS' : 'FAIL'} lived ${g.livedS} s, ended: ${g.endedWhy}; deaths ${g.deaths}${g.serverDeaths.length ? ` (${g.serverDeaths.join('; ')})` : ''}; nights entered ${nights}, lived through ${fullNights}; health min ${g.healthMin}, food min ${g.foodMin}; on its own ${JSON.stringify(byKind)}; steps ${g.steps.filter((x) => x.ok).length}/${g.steps.length} ok`);
}
const lived = results.map((g) => g.livedS);
const stepTimes = results.flatMap((g) => g.steps.filter((x) => x.s != null).map((x) => x.s));
const summary = {
  label: values.label, url, games, wallS: Math.round((t1 - t0) / 1000),
  pass: results.filter((g) => g.pass).length,
  deaths: results.reduce((a, g) => a + g.deaths, 0),
  gamesWithDeath: results.filter((g) => g.deaths > 0).length,
  leaseEnded: results.filter((g) => g.leaseEnded).length,
  nightsEntered: results.reduce((a, g) => a + g.nightsEntered, 0),
  fullNights: results.reduce((a, g) => a + g.fullNights, 0),
  livedS: { median: median(lived), p90: pct(lived, 90), min: lived.length ? Math.min(...lived) : null },
  healthMin: { median: median(results.map((g) => g.healthMin).filter((x) => x !== null)), min: Math.min(...results.map((g) => g.healthMin ?? 20)) },
  foodMin: { median: median(results.map((g) => g.foodMin).filter((x) => x !== null)), min: Math.min(...results.map((g) => g.foodMin ?? 20)) },
  steps: { n: results.reduce((a, g) => a + g.steps.length, 0), ok: results.reduce((a, g) => a + g.steps.filter((x) => x.ok).length, 0), p50S: median(stepTimes), p90S: pct(stepTimes, 90) },
  onItsOwn: results.reduce((a, g) => { for (const [k, v] of Object.entries(g.onItsOwnByKind)) a[k] = (a[k] ?? 0) + v; return a; }, {}),
  shelterAfterDuskS: (() => { const xs = results.flatMap((g) => g.shelterAfterDuskS); return { n: xs.length, p50: median(xs), p90: pct(xs, 90), max: xs.length ? Math.max(...xs) : null }; })(),
  careActionMs: (() => { const xs = results.flatMap((g) => g.careMs.map((x) => x.ms)); return { n: xs.length, p50: median(xs), p90: pct(xs, 90) }; })(),
  careLogged: results.reduce((a, g) => a + g.careLogged, 0),
  careReported: results.reduce((a, g) => a + g.careReported, 0),
  careLoggedBeforeLastReply: results.reduce((a, g) => a + g.careLoggedBeforeLastReply, 0),
};
console.log(`SUMMARY ${JSON.stringify(summary)}`);
fs.mkdirSync(values.out, { recursive: true });
fs.writeFileSync(path.join(values.out, `${values.label}.json`), `${JSON.stringify({ summary, games: results }, null, 1)}\n`);
