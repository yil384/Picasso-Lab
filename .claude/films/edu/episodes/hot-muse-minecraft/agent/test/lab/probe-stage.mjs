// test/lab/probe-stage.mjs - print where the lab bot stands and what is around (water, lava, gravel, diamonds) to
// pick stage positions. LAB=1 node test/lab/probe-stage.mjs [x y z]
import { openLab } from './harness.mjs';

if (!process.env.LAB) { console.log('skip: set LAB=1 to run against the lab server'); process.exit(0); }
const lab = await openLab('Tst_probe');
const { bot } = lab;
const [x, y, z] = process.argv.slice(2).map(Number);
if (Number.isFinite(x)) { lab.cmd('gamemode spectator Tst_probe'); await lab.tp(x, y, z); }
await bot.waitForChunksToLoad(); await new Promise((r) => setTimeout(r, 3000));
console.log('at', bot.entity.position.floored().toString(), bot.game.dimension);
for (const name of ['water', 'lava', 'gravel', 'diamond_ore', 'deepslate_diamond_ore', 'obsidian']) {
  const id = bot.registry.blocksByName[name].id;
  const ps = bot.findBlocks({ matching: id, maxDistance: 64, count: 400 });
  console.log(name, ps.length, ps.slice(0, 3).map((p) => p.toString()).join(' '));
}
await lab.close();
process.exit(0);
