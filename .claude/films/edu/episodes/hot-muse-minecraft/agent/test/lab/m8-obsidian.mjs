// test/lab/m8-obsidian.mjs - M8 obsidian lab: beside a natural underground lava pool (found in setup: the bot looks
// around in spectator mode near y -50 for still lava with a dry shore spot, then is put there in survival), with a
// diamond pickaxe, a water bucket, iron armor, food and cobblestone, mine n obsidian. Setup by console; the run itself
// has no console help.
//   LAB=1 node test/lab/m8-obsidian.mjs [trials=3] [n=10] [x0=-300] [z0=200]
import { openLab, summary, sleep } from './harness.mjs';
import { _test as B } from '../../src/skills/progression/bucket.js';

if (!process.env.LAB) { console.log('skip: set LAB=1 to run against the lab server'); process.exit(0); }
const [trials = 3, n = 10, x0 = -300, z0 = 200] = process.argv.slice(2).map(Number);
const name = 'Tst_obs';
const KIT = {
  diamond_pickaxe: 1, water_bucket: 1, iron_sword: 1, iron_helmet: 1, iron_chestplate: 1, iron_leggings: 1, iron_boots: 1,
  shield: 1, bread: 16, cobblestone: 32, torch: 16,
};
const lab = await openLab(name, { log: 'lab-m8-obsidian.jsonl' });
lab.cmd('difficulty easy');

/** Setup only: look for a pool with a dry shore spot around (x, z), in spectator mode. */
async function findPool(x, z) {
  lab.cmd(`gamemode spectator ${name}`);
  for (const y of [-50, -40]) {
    await lab.tp(x, y, z);
    await sleep(2_500);
    const lavas = B.surfaceSources(lab.bot, 'lava', 300);
    if (lavas.length < 6) continue;
    const spots = B.pourSpots(lab.bot, lavas, new Set()).filter((s) => s.covered >= 6);
    if (spots.length) return spots[0].feet;
  }
  return null;
}

const results = [];
let probe = 0;
for (let i = 0; i < trials; i++) {
  let spot = null;
  while (!spot && probe < 40) {
    const x = x0 + 70 * (probe % 6);
    const z = z0 + 70 * Math.floor(probe / 6);
    probe += 1;
    spot = await findPool(x, z);
  }
  if (!spot) { console.log('no lava pool found'); break; }
  await lab.kit(KIT);
  lab.cmd(`tp ${name} ${spot.x + 0.5} ${spot.y} ${spot.z + 0.5}`);
  await sleep(3_000);
  lab.cmd(`gamemode survival ${name}`);
  await sleep(1_000);
  const start = lab.bot.entity.position.floored().toString();
  const r = await lab.run('make_obsidian', { n });
  const got = lab.count('obsidian');
  const t = { trial: i + 1, start, ok: r.ok && got >= n, ms: r.ms, deaths: r.deaths, obsidian: got, result: r.result.slice(0, 500) };
  results.push(t);
  lab.log({ lab: 'm8-obsidian', ...t });
  console.log(`trial ${i + 1}: ${t.ok ? 'PASS' : 'FAIL'} ${got} obsidian in ${Math.round(r.ms / 1000)} s, deaths ${r.deaths}, at ${start}`);
}
const s = summary(results);
lab.log({ lab: 'm8-obsidian', summary: s });
console.log('SUMMARY', JSON.stringify(s));
await lab.close();
process.exit(0);
