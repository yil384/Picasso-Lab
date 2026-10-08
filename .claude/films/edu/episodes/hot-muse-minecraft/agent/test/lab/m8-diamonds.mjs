// test/lab/m8-diamonds.mjs - M8 diamond lab: from the surface (a spot picked by spreadplayers, 60 blocks apart each
// trial) with an iron pickaxe, iron armor, a shield, food, cobblestone and torches, stair down to y -58 and mine 3
// diamonds. Setup by console; the run itself has no console help. Reports diamonds, time, deaths, lava skips.
//   LAB=1 node test/lab/m8-diamonds.mjs [trials=3] [n=3] [x0=200] [z0=-150]
import { openLab, summary, sleep } from './harness.mjs';

if (!process.env.LAB) { console.log('skip: set LAB=1 to run against the lab server'); process.exit(0); }
const [trials = 3, n = 3, x0 = 200, z0 = -150] = process.argv.slice(2).map(Number);
const name = 'Tst_dia';
export const MINER_KIT = {
  iron_pickaxe: 1, iron_sword: 1, iron_helmet: 1, iron_chestplate: 1, iron_leggings: 1, iron_boots: 1, shield: 1,
  bread: 16, cobblestone: 64, torch: 32,
};
const lab = await openLab(name, { log: 'lab-m8-diamonds.jsonl' });
lab.cmd('difficulty easy');
const results = [];
for (let i = 0; i < trials; i++) {
  if (lab.bot.game.dimension !== 'overworld') { lab.cmd(`execute in minecraft:overworld run tp ${name} ${x0} 100 ${z0}`); await sleep(4_000); }
  await lab.kit(MINER_KIT);
  lab.cmd(`spreadplayers ${x0 + 60 * i} ${z0} 0 8 false ${name}`);
  await sleep(4_000);
  await lab.until(() => lab.bot.blockAt(lab.bot.entity.position.floored().offset(0, -1, 0)) !== null, 15_000);
  const start = lab.bot.entity.position.floored().toString();
  const r = await lab.run('mine_diamonds', { n });
  const got = lab.count('diamond');
  const t = { trial: i + 1, start, ok: r.ok && got >= n, ms: r.ms, deaths: r.deaths, diamonds: got, end: r.pos, result: r.result.slice(0, 600) };
  results.push(t);
  lab.log({ lab: 'm8-diamonds', ...t });
  console.log(`trial ${i + 1}: ${t.ok ? 'PASS' : 'FAIL'} ${got} diamonds in ${Math.round(r.ms / 1000)} s, deaths ${r.deaths}, from ${start} to ${r.pos}`);
}
const s = summary(results);
lab.log({ lab: 'm8-diamonds', summary: s });
console.log('SUMMARY', JSON.stringify(s));
await lab.close();
process.exit(0);
