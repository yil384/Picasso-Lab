// scripts/long-run-report.mjs - what the agent's log says about one game (docs/MUSE-LONG-RUN.md): how it ended, its
// deaths, the time from start_game to each milestone (iron, diamonds, the Nether), and who acted (the player's skills,
// the body's reflexes, its own plans in full mode).
//
//   node scripts/long-run-report.mjs <logs/run-serve-*.jsonl> [--game g1234567] [--json]
//
// Without --game: every game in the log. Milestones are read from each step's inventory change (viewer_action delta)
// and the dimension rows; the counts from session_end's attribution, else from the rows themselves.

import fs from 'node:fs';
import { parseArgs } from 'node:util';

/** The milestones of the long run, in order: [name, test on what was carried so far and the dimensions seen]. */
export const MILESTONES = [
  ['wooden pickaxe', (inv) => inv.wooden_pickaxe > 0],
  ['stone pickaxe', (inv) => inv.stone_pickaxe > 0],
  ['iron ingot', (inv) => inv.iron_ingot > 0],
  ['iron pickaxe', (inv) => inv.iron_pickaxe > 0],
  ['diamond', (inv) => inv.diamond > 0],
  ['diamond pickaxe', (inv) => inv.diamond_pickaxe > 0],
  ['obsidian', (inv) => inv.obsidian > 0],
  ['flint and steel', (inv) => inv.flint_and_steel > 0],
  ['the Nether', (inv, dims) => dims.has('the_nether')],
];
const NOT_COUNTED = new Set(['get_state', 'policy']);

/** One game's report from its log rows. */
export function reportGame(rows, game) {
  const mine = rows.filter((r) => r.game === game || r.session === game);
  const at = (r) => Date.parse(r.time);
  const start = mine.find((r) => r.kind === 'session_start') ?? mine[0];
  const t0 = start ? at(start) : null;
  const end = mine.find((r) => r.kind === 'session_end');
  const inv = {};
  const dims = new Set(['overworld']);
  const reached = {};
  const mark = (r) => {
    for (const [name, test] of MILESTONES) if (reached[name] == null && test(inv, dims)) reached[name] = Math.round((at(r) - t0) / 1000);
  };
  let muse = 0; let reflex = 0; let care = 0; let failed = 0;
  const deaths = [];
  for (const r of mine) {
    if (r.kind === 'viewer_action') {
      if (!NOT_COUNTED.has(r.tool)) muse += 1;
      if (!r.ok) failed += 1;
      for (const [k, n] of Object.entries(r.delta ?? {})) inv[k] = (inv[k] ?? 0) + n;
      mark(r);
    } else if (r.kind === 'dimension') { dims.add(r.to); mark(r); }
    else if (r.kind === 'death') deaths.push({ s: Math.round((at(r) - t0) / 1000), cause: r.cause ?? null });
    else if (r.kind === 'care' && r.source === 'reflex') reflex += 1;
    else if (r.kind === 'care' && (r.source === 'care-full' || r.source === 'care')) care += 1;
  }
  const a = end?.attribution ?? { muse, reflex, care };
  const all = a.muse + a.reflex + a.care;
  return {
    game,
    startedAt: start?.time ?? null,
    lastedS: t0 != null && end ? Math.round((at(end) - t0) / 1000) : null,
    ended: end?.reason ?? null,
    deaths,
    steps: muse,
    failedSteps: failed,
    milestones: Object.fromEntries(MILESTONES.map(([n]) => [n, reached[n] ?? null])),
    attribution: { muse: a.muse, reflex: a.reflex, care: a.care, musePct: all ? Math.round((100 * a.muse) / all) : null },
  };
}

const mmss = (s) => (s == null ? '-' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

if (import.meta.url === `file://${process.argv[1]}`) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { game: { type: 'string' }, json: { type: 'boolean' } } });
  if (!positionals[0]) { console.error('usage: node scripts/long-run-report.mjs <run-serve-*.jsonl> [--game g...] [--json]'); process.exit(64); }
  const rows = fs.readFileSync(positionals[0], 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const games = values.game ? [values.game] : [...new Set(rows.filter((r) => r.kind === 'session_start').map((r) => r.session))];
  const out = games.map((g) => reportGame(rows, g));
  if (values.json) console.log(JSON.stringify(out, null, 1));
  else {
    for (const r of out) {
      console.log(`game ${r.game} (started ${r.startedAt}): lasted ${mmss(r.lastedS)}, ended: ${r.ended ?? 'still running'}; deaths ${r.deaths.length}${r.deaths.length ? ` (${r.deaths.map((d) => `${mmss(d.s)} ${d.cause ?? ''}`.trim()).join('; ')})` : ''}; steps ${r.steps} (${r.failedSteps} failed)`);
      console.log(`  milestones: ${Object.entries(r.milestones).map(([n, s]) => `${n} ${mmss(s)}`).join(', ')}`);
      console.log(`  who acted: ${r.attribution.muse} by the player, ${r.attribution.reflex} reflexes, ${r.attribution.care} by the body's own plans (${r.attribution.musePct ?? '-'}% player)`);
    }
  }
}
