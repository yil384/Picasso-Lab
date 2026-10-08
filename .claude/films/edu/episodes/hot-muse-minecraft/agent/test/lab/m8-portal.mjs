// test/lab/m8-portal.mjs - M8 portal lab: on natural ground (flat and uneven spots picked by spreadplayers), build and
// light a Nether portal from 10 obsidian, go through it, come back. Setup by console (kit, place); the run itself has
// no console help.
//   LAB=1 node test/lab/m8-portal.mjs [trials=5] [x0=40] [z0=42]
import { openLab, summary, sleep } from './harness.mjs';

if (!process.env.LAB) { console.log('skip: set LAB=1 to run against the lab server'); process.exit(0); }
const [trials = 5, x0 = 40, z0 = 42] = process.argv.slice(2).map(Number);
const name = 'Tst_portal';
const lab = await openLab(name, { log: 'lab-m8-portal.jsonl' });
lab.cmd('time set day');
lab.cmd('gamerule doDaylightCycle false');
lab.cmd('difficulty easy');
const results = [];
for (let i = 0; i < trials; i++) {
  // stage: back in the overworld, kit, a surface spot 40 blocks further along each trial
  if (lab.bot.game.dimension !== 'overworld') { lab.cmd(`execute in minecraft:overworld run tp ${name} ${x0} 100 ${z0}`); await sleep(4_000); }
  await lab.kit({ obsidian: 10, cobblestone: 16, flint_and_steel: 1, bread: 8 });
  lab.cmd(`spreadplayers ${x0 + 40 * i} ${z0 + 25 * (i % 2)} 0 6 false ${name}`);
  await sleep(4_000);
  await lab.until(() => lab.bot.blockAt(lab.bot.entity.position.floored().offset(0, -1, 0)) !== null, 15_000);
  const t0 = Date.now();
  const d0 = lab.deaths.length;
  const start = lab.bot.entity.position.floored().toString();
  const b = await lab.run('build_portal');
  const there = b.ok ? await lab.run('use_portal') : null;
  const back = there?.ok ? await lab.run('use_portal') : null;
  const ok = Boolean(b.ok && there?.ok && back?.ok && lab.bot.game.dimension === 'overworld' && there.dim === 'the_nether');
  const r = { trial: i + 1, start, ok, ms: Date.now() - t0, deaths: lab.deaths.length - d0, build: b.ok, there: there?.ok ?? false, back: back?.ok ?? false };
  results.push(r);
  lab.log({ lab: 'm8-portal', ...r });
  console.log(`trial ${i + 1}: ${ok ? 'PASS' : 'FAIL'} in ${Math.round(r.ms / 1000)} s from ${start}`);
}
const s = summary(results);
lab.log({ lab: 'm8-portal', summary: s });
console.log('SUMMARY', JSON.stringify(s));
await lab.close();
process.exit(0);
