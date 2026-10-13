// deploy/camera-test/leaves.cjs - the replay of production game gc950fd's leafy view on a local Paper with the muse_cam
// datapack (a flat world, online-mode off, port 25599, its console read from a FIFO): the bot in a hole two deep in the
// top of a canopy (0:24: the camera behind it over the leaves, no bot in the picture), at the bottom of a shaft through
// one (0:37); a walk under a canopy, open ground and a hole in open ground as controls. For each: the shoulder rule
// (#sr: 13 straight above its head, 15 3.2 behind, 16-20 from above at an angle), the eye, its angle down to the bot, whether the straight line from the eye to the bot's eyes crosses a
// leaf or dirt block (the camera draws leaves opaque), and the evidence record.
//   node deploy/camera-test/leaves.cjs <console fifo> <server log>
const mineflayer = require('../../node_modules/mineflayer');
const fs = require('fs');
const con = (l) => fs.appendFileSync(process.argv[2], l + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = process.argv[3];
const lastMatch = (re, from) => { const s = fs.readFileSync(log, 'utf8').slice(from).replace(/\x1b\[[0-9;]*m/g, ''); const m = [...s.matchAll(re)]; return m.length ? m[m.length - 1] : null; };
const SCEN = [
  { name: 'hole two deep in a canopy top (gc950fd 0:24)', leaves: [[-6, -61, -6, 6, -58, 6]], air: [[0, -59, 0, 0, -58, 0]], bot: [0.5, -59, 0.5] },
  { name: 'bottom of a 1x1 shaft through a canopy (gc950fd 0:37)', leaves: [[-6, -61, -6, 6, -52, 6]], air: [[0, -61, 0, 0, -52, 0]], bot: [0.5, -61, 0.5] },
  { name: 'walking under a canopy 4 up', leaves: [[-8, -57, -8, 8, -55, 8]], air: [], bot: [0.5, -61, 0.5] },
  { name: 'open ground', leaves: [], air: [], bot: [0.5, -61, 0.5] },
  { name: 'a hole two deep in open ground (dirt walls)', leaves: [], dirt: [[-4, -64, -4, 4, -62, 4]], air: [[0, -63, 0, 0, -62, 0]], bot: [0.5, -63, 0.5] },
  // how every game opens: the body digs two blocks down before the first call (here with grass and a tree beside it)
  { name: 'the spawn dig-in, a tree two blocks to its right', leaves: [[-5, -57, -2, -1, -55, 2]], dirt: [[-6, -64, -6, 6, -62, 6], [-3, -61, 0, -3, -58, 0]], air: [[0, -63, 0, 0, -62, 0]], bot: [0.5, -63, 0.5] },
  { name: 'a hole two deep under a canopy 4 up', leaves: [[-8, -58, -8, 8, -56, 8]], dirt: [[-6, -64, -6, 6, -62, 6]], air: [[0, -63, 0, 0, -62, 0]], bot: [0.5, -63, 0.5] },
];
const inBox = (b, x, y, z) => x >= b[0] && x <= b[3] && y >= b[1] && y <= b[4] && z >= b[2] && z <= b[5];
(async () => {
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: 25599, username: 'Tbot', version: '1.21.4' });
  await new Promise((r) => bot.once('spawn', r));
  const cam = mineflayer.createBot({ host: '127.0.0.1', port: 25599, username: 'Tcam', version: '1.21.4' });
  await new Promise((r) => cam.once('spawn', r));
  await sleep(1000);
  for (const l of ['kill @e[type=item_display]', 'kill @e[type=marker]', 'gamemode spectator Tcam', 'tag Tcam add muse_cam', 'tag Tcam add muse_cam_third', 'time set 6000', 'gamerule doDaylightCycle false']) con(l);
  for (const sc of SCEN) {
    for (const l of ['fill -10 -61 -10 10 -40 10 minecraft:air', 'fill -10 -63 -10 10 -62 10 minecraft:dirt']) con(l);
    for (const b of sc.dirt ?? []) con(`fill ${b.join(' ')} minecraft:dirt`);
    for (const b of sc.leaves) con(`fill ${b.join(' ')} minecraft:oak_leaves[persistent=true]`);
    for (const b of sc.air) con(`fill ${b.join(' ')} minecraft:air`);
    con(`tp Tbot ${sc.bot.join(' ')} 0 0`);
    con('tp Tcam Tbot');
    con('tag Tbot add muse_cam_target');
    con('function muse_cam:fresh');
    await sleep(2500);
    const from = fs.statSync(log).size;
    con('scoreboard players get #sr muse_cam_y');
    con('data get entity @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] Pos');
    con('execute unless score cam_seq muse_cam_y = cam_logged muse_cam_y run data get storage muse_cam:spot');
    con('execute unless score cam_seq muse_cam_y = cam_logged muse_cam_y run scoreboard players operation cam_logged muse_cam_y = cam_seq muse_cam_y');
    await sleep(800);
    const sr = lastMatch(/#sr has (-?\d+)/g, from)?.[1];
    const pm = lastMatch(/has the following entity data: \[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/g, from);
    const evm = lastMatch(/muse_cam:spot has the following contents: (\{.*)/g, from)?.[1] ?? ''; const ev = evm ? ['rule', 'hidden', 'seen'].map((k) => `${k} ${(new RegExp(`\\b${k}: (-?\\d+)`).exec(evm) || [])[1]}`).join(', ') : 'none';
    const eye = pm ? pm.slice(1, 4).map(Number) : null;
    let blocked = null;
    if (eye) {
      const to = [sc.bot[0], sc.bot[1] + 1.62, sc.bot[2]];
      blocked = 0;
      for (let i = 0; i <= 100; i++) {
        const p = eye.map((v, k) => v + ((to[k] - v) * i) / 100);
        const [x, y, z] = p.map(Math.floor);
        const leaf = sc.leaves.some((b) => inBox(b, x, y, z)) && !sc.air.some((b) => inBox(b, x, y, z));
        const dirt = (sc.dirt ?? []).some((b) => inBox(b, x, y, z)) && !sc.air.some((b) => inBox(b, x, y, z));
        if (leaf || dirt) { blocked = `${leaf ? 'leaves' : 'dirt'} at ${x} ${y} ${z}`; break; }
      }
    }
    // the camera's angle down to the bot's eyes and its distance
    const to = [sc.bot[0], sc.bot[1] + 1.62, sc.bot[2]];
    const d = eye ? eye.map((v, k) => to[k] - v) : null;
    const pitch = d ? Math.round((Math.atan2(-d[1], Math.hypot(d[0], d[2])) * 180) / Math.PI) : null;
    const dist = d ? Math.round(Math.hypot(...d) * 10) / 10 : null;
    console.log(JSON.stringify({ scene: sc.name, sr: Number(sr), eye: eye && eye.map((v) => Math.round(v * 100) / 100), pitch, dist, lineToEyes: blocked || 'clear', evidence: ev }));
    con('tag Tbot remove muse_cam_target');
    con('kill @e[type=minecraft:item_display,tag=muse_cam_eye]');
    await sleep(300);
  }
  bot.quit(); cam.quit(); setTimeout(() => process.exit(0), 500);
})();
