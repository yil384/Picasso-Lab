// test/lab/m8-full.mjs - M8 end to end from a fair start: on the surface with an iron pickaxe, iron armor, a shield,
// food, cobblestone, torches, 4 iron ingots, 2 sticks and a crafting table, the skills a player would call in order:
// equip_gear, craft bucket, bucket fill_water, mine_diamonds 3, craft diamond_pickaxe, make_obsidian 10, get_flint 1,
// build_portal, use_portal (to the Nether), use_portal (back). Setup by console; no console help during the run.
//   LAB=1 node test/lab/m8-full.mjs [trials=1] [x0=40] [z0=42]
import { openLab, summary, sleep } from './harness.mjs';

if (!process.env.LAB) { console.log('skip: set LAB=1 to run against the lab server'); process.exit(0); }
const [trials = 1, x0 = 40, z0 = 42] = process.argv.slice(2).map(Number);
const name = 'Tst_full';
const KIT = {
  iron_pickaxe: 1, iron_sword: 1, iron_helmet: 1, iron_chestplate: 1, iron_leggings: 1, iron_boots: 1, shield: 1,
  bread: 16, cobblestone: 64, torch: 32, iron_ingot: 4, stick: 2, crafting_table: 1,
};
const PLAN = [
  ['equip_gear', {}],
  ['craft', { item: 'bucket', n: 1 }],
  ['bucket', { action: 'fill_water' }],
  ['mine_diamonds', { n: 3 }],
  ['craft', { item: 'diamond_pickaxe', n: 1 }],
  ['make_obsidian', { n: 10 }],
  ['get_flint', { n: 1 }],
  ['build_portal', {}],
  ['use_portal', {}],
  ['use_portal', {}],
];
const lab = await openLab(name, { log: 'lab-m8-full.jsonl' });
lab.cmd('difficulty easy');
lab.cmd('gamerule doDaylightCycle true');
const results = [];
for (let i = 0; i < trials; i++) {
  if (lab.bot.game.dimension !== 'overworld') { lab.cmd(`execute in minecraft:overworld run tp ${name} ${x0} 100 ${z0}`); await sleep(4_000); }
  await lab.kit(KIT);
  lab.cmd(`spreadplayers ${x0 + 300 * i} ${z0} 0 4 false ${name}`);
  await sleep(4_000);
  lab.cmd('time set 1000');
  const start = lab.bot.entity.position.floored().toString();
  const t0 = Date.now();
  const d0 = lab.deaths.length;
  const steps = [];
  let ok = true;
  for (const [skill, args] of PLAN) {
    let r = await lab.run(skill, args);
    if (!r.ok && !r.deaths && /mine_diamonds|make_obsidian|get_flint|use_portal/.test(skill)) r = await lab.run(skill, args); // one retry, as a player would
    steps.push({ skill, ok: r.ok, s: Math.round(r.ms / 1000) });
    if (!r.ok) { ok = false; break; }
  }
  ok = ok && lab.bot.game.dimension === 'overworld';
  const t = { trial: i + 1, start, ok, ms: Date.now() - t0, deaths: lab.deaths.length - d0, steps };
  results.push(t);
  lab.log({ lab: 'm8-full', ...t });
  console.log(`trial ${i + 1}: ${ok ? 'PASS' : 'FAIL'} in ${Math.round(t.ms / 1000)} s, deaths ${t.deaths}: ${steps.map((x) => `${x.skill}${x.ok ? '' : '(FAIL)'} ${x.s}s`).join(', ')}`);
}
const s = summary(results);
lab.log({ lab: 'm8-full', summary: s });
console.log('SUMMARY', JSON.stringify(s));
await lab.close();
process.exit(0);
