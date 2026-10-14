// scripts/soak-compare.mjs - is tonight's soak worth a fix run? Compares two soak results (scripts/soak.mjs's
// <date>.json): a failure kind that is new tonight, or worse (more times, or in more games), and games that did not
// get to the Nether and back when the night before's did. Prints one line per finding and exits 0 when there is one,
// 3 when there is nothing new (the nightly fix job then starts no model), 64 on bad arguments.
//
//   node scripts/soak-compare.mjs <previous.json> <tonight.json>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** {kind: {n, games}} from a soak result. */
export function kindsOf(result) {
  const out = {};
  for (const g of result?.games ?? []) for (const f of g.failures ?? []) {
    const e = (out[f.kind] ??= { n: 0, games: new Set() });
    e.n += 1;
    e.games.add(g.game);
  }
  return out;
}

/** What is new or worse tonight: [line]. A missing previous night makes every kind new. */
export function compare(previous, tonight) {
  const before = kindsOf(previous);
  const now = kindsOf(tonight);
  const lines = [];
  for (const [kind, e] of Object.entries(now).sort((a, b) => b[1].n - a[1].n)) {
    const was = before[kind];
    if (!was) lines.push(`new: ${kind} (${e.n} in ${e.games.size} game${e.games.size === 1 ? '' : 's'})`);
    else if (e.n >= was.n + 2 || e.games.size > was.games.size) lines.push(`worse: ${kind} (${was.n} -> ${e.n}, games ${was.games.size} -> ${e.games.size})`);
  }
  const done = (r) => (r?.games ?? []).filter((g) => g.outcome === 'nether and back').length;
  if (done(tonight) < done(previous)) lines.push(`worse: ${done(tonight)} of ${tonight.games.length} games got to the Nether and back (${done(previous)} the night before)`);
  return lines;
}

export function main(argv = process.argv.slice(2), print = console.log) {
  if (argv.length !== 2) { print('usage: node scripts/soak-compare.mjs <previous.json> <tonight.json>'); return 64; }
  const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const tonight = read(argv[1]);
  if (!tonight) { print(`no soak result at ${argv[1]}`); return 64; }
  const lines = compare(read(argv[0]), tonight);
  for (const l of lines) print(l);
  return lines.length ? 0 : 3;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exit(main());
