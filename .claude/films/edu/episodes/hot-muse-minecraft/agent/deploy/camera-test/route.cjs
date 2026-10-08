// deploy/camera-test/route.cjs - a fixed walk for measuring the camera, on the TEST server only (inside the
// muse-camera-test agent container). The bot (BOT_NAME, whitelisted through the console) is dropped at ROUTE_AT in
// creative mode (no fall damage) and put on the ground there (never a tree top: the nearest column whose top is grass,
// dirt or stone), switched to survival, then walks a square of SIDE blocks without digging, turning
// a full circle at every corner, for RUN_S seconds. With CHOP=1 it also chops the nearest log, mines the nearest stone
// and digs the nearest dirt at each corner (for a sample video; it changes the world). Prints "ready <ms>" when it starts walking and "done".
//
//   docker exec -e RUN_S=150 muse-camera-test-agent-1 node /tmp/route.cjs

const fs = require('node:fs');
const mineflayer = require('/app/node_modules/mineflayer');
const Vec3 = require('/app/node_modules/vec3');
const { pathfinder, Movements, goals } = require('/app/node_modules/mineflayer-pathfinder');

const NAME = process.env.BOT_NAME || 'Tst_cam_route';
// the default: a flat, dry birch-forest square of the test world (seed 71811045), height spread 3, no water
const [X0, Z0] = (process.env.ROUTE_AT || '54,-54').split(',').map(Number);
const SIDE = Number(process.env.SIDE || 12);
const RUN_S = Number(process.env.RUN_S || 150);
const CHOP = process.env.CHOP === '1';
const CONSOLE = '/console/console.in';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (line) => fs.appendFileSync(CONSOLE, `${line}\n`);
const within = (p, ms) => Promise.race([p, sleep(ms).then(() => { throw new Error('timeout'); })]);

say(`whitelist add ${NAME}`);
setTimeout(() => {
  const bot = mineflayer.createBot({ host: process.env.MC_HOST || '10.77.78.10', port: 25565, username: NAME, version: '1.21.4', auth: 'offline' });
  bot.loadPlugin(pathfinder);
  bot.on('error', (e) => { console.log('error', e.message); process.exit(1); });
  bot.once('spawn', async () => {
    say(`gamemode creative ${NAME}`);
    say(`tp ${NAME} ${X0} 110 ${Z0} 0 0`);
    await sleep(7_000);
    // the nearest column (within 4 blocks) whose top is ground, not a tree; stand on it
    const top = (x, z) => {
      for (let y = 120; y > 40; y -= 1) {
        const b = bot.blockAt(new Vec3(x, y, z));
        if (!b) return null;
        if (b.boundingBox !== 'block' || /leaves|_log$|flower|grass$|fern/.test(b.name) && !/grass_block/.test(b.name)) {
          if (/leaves|_log$/.test(b.name)) return null; // a tree: not here
          continue;
        }
        return /grass_block|dirt|stone|podzol|coarse/.test(b.name) ? y : null;
      }
      return null;
    };
    let spot = null;
    for (let r = 0; r <= 4 && !spot; r += 1) {
      for (let dx = -r; dx <= r && !spot; dx += 1) for (let dz = -r; dz <= r && !spot; dz += 1) {
        const y = top(X0 + dx, Z0 + dz);
        if (y !== null) spot = [X0 + dx, y + 1, Z0 + dz];
      }
    }
    if (spot) say(`tp ${NAME} ${spot[0] + 0.5} ${spot[1]} ${spot[2] + 0.5} 0 0`);
    await sleep(1_500);
    say(`gamemode survival ${NAME}`);
    if (CHOP) say(`give ${NAME} stone_pickaxe 1`);
    await sleep(1_500);
    const mv = new Movements(bot);
    mv.canDig = false;
    mv.allow1by1towers = false;
    bot.pathfinder.setMovements(mv);
    const p = bot.entity.position;
    console.log(`ready ${Date.now()} at ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}`);
    const t0 = Date.now();
    const corners = [[SIDE, 0], [SIDE, SIDE], [0, SIDE], [0, 0]];
    for (let i = 0; Date.now() - t0 < RUN_S * 1000; i += 1) {
      const [dx, dz] = corners[i % corners.length];
      console.log(`walk ${Date.now()} to ${X0 + dx} ${Z0 + dz}`);
      try { await within(bot.pathfinder.goto(new goals.GoalXZ(X0 + dx, Z0 + dz)), 25_000); } catch { bot.pathfinder.stop(); }
      console.log(`turn ${Date.now()}`);
      // a full turn in 3 s, pitch level: what a guest bot does when it looks around
      const yaw0 = bot.entity.yaw;
      for (let k = 1; k <= 60 && Date.now() - t0 < RUN_S * 1000; k += 1) { await bot.look(yaw0 + (k / 60) * 2 * Math.PI, 0, true); await sleep(50); }
      if (CHOP) {
        for (const kind of [/_log$/, /^(stone|andesite|diorite|granite)$/, /^(dirt|grass_block)$/]) {
          const b = bot.findBlock({ matching: (bl) => kind.test(bl.name), maxDistance: 5 });
          if (!b) continue;
          try {
            const tool = /_log$/.test(kind.source) ? null : bot.inventory.items().find((it) => it.name === 'stone_pickaxe');
            if (tool) await bot.equip(tool, 'hand').catch(() => {});
            await bot.lookAt(b.position.offset(0.5, 0.5, 0.5), true);
            await within(bot.dig(b, true), 10_000);
          } catch { /* out of reach or gone */ }
        }
      }
    }
    console.log(`done ${Date.now()}`);
    bot.quit();
    say(`whitelist remove ${NAME}`);
    setTimeout(() => process.exit(0), 500);
  });
}, 600);
