// deploy/camera-test/sealed.cjs - the replay of a sealed shelter on a local Paper with the muse_cam datapack (as
// leaves.cjs: a flat world, online-mode off, port 25599, its console read from a FIFO). Production game gaf8c9e: the body
// dug two blocks down beside a trench it had dug for dirt and closed itself in; the camera took a spot 3 out and 2 up
// and the picture was a dirt wall across the frame. For each scene: the rule that chose the spot (1 the orbit's ring,
// 2 the nearest good one, 3 from high above, 5 the place from outside, 4 none outside: the bot's eyes, 24 inside behind it), the eye's distance
// to the bot, its angle down, and how far the camera sees along its line to the bot before the first block (under 2
// blocks: a block fills the picture).
//   node deploy/camera-test/sealed.cjs <console fifo> <server log>
const mineflayer = require('../../node_modules/mineflayer');
const fs = require('fs');
const con = (l) => fs.appendFileSync(process.argv[2], l + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = process.argv[3];
const lastMatch = (re, from) => { const s = fs.readFileSync(log, 'utf8').slice(from).replace(/\x1b\[[0-9;]*m/g, ''); const m = [...s.matchAll(re)]; return m.length ? m[m.length - 1] : null; };
// boxes in order, the last that holds a block decides it: [block, x0, y0, z0, x1, y1, z1]; the ground is dirt to y -62
const CELL = [['air', 0, -63, 0, 0, -62, 0], ['dirt', 0, -61, 0, 0, -61, 0]]; // two down, a roof at ground level
const SCEN = [
  { name: 'gaf8c9e: dug in two down, a roof, a trench two deep beside it', boxes: [['air', 2, -63, -1, 4, -62, 1], ...CELL], bot: [0.5, -63, 0.5] },
  { name: 'dug in under a canopy 4 up, two trunks near', boxes: [['oak_leaves[persistent=true]', -8, -57, -8, 8, -55, 8], ['oak_log', 3, -61, 2, 3, -58, 2], ['oak_log', -3, -61, -3, -3, -58, -3], ...CELL], bot: [0.5, -63, 0.5] },
  { name: 'a cell built on the ground: walls and a roof of dirt', boxes: [['dirt', -1, -61, -1, 1, -59, 1], ['air', 0, -61, 0, 0, -60, 0]], bot: [0.5, -61, 0.5] },
  // oak woods: leaves from 1 to 5 above the ground all round, trunks, so the orbit's ring is in the leaves
  { name: 'dug in among trees, leaves from 1 up all round', boxes: [['oak_leaves[persistent=true]', -10, -60, -10, 10, -56, 10], ['oak_log', 4, -61, 4, 4, -57, 4], ['oak_log', -4, -61, 3, -4, -57, 3], ['oak_log', 2, -61, -5, 2, -57, -5], ...CELL], bot: [0.5, -63, 0.5] },
  { name: 'a cell cut into a hillside, open to the south', boxes: [['stone', -10, -61, -10, 10, -50, 1], ['air', 0, -61, 0, 0, -60, 0], ['stone', 0, -61, 1, 0, -60, 1]], bot: [0.5, -61, 0.5] },
  { name: 'sealed in rock all round', boxes: [['stone', -10, -61, -10, 10, -48, 10], ['air', 0, -61, 0, 0, -60, 0]], bot: [0.5, -61, 0.5] },
];
const solidAt = (sc, x, y, z) => {
  let b = y <= -62 ? 'dirt' : 'air';
  for (const [blk, x0, y0, z0, x1, y1, z1] of sc.boxes) if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && z >= z0 && z <= z1) b = blk;
  return b !== 'air';
};
(async () => {
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: 25599, username: 'Tbot', version: '1.21.4' });
  await new Promise((r) => bot.once('spawn', r));
  const cam = mineflayer.createBot({ host: '127.0.0.1', port: 25599, username: 'Tcam', version: '1.21.4' });
  await new Promise((r) => cam.once('spawn', r));
  await sleep(1000);
  for (const l of ['kill @e[type=item_display]', 'kill @e[type=marker]', 'gamemode spectator Tcam', 'tag Tcam add muse_cam', 'tag Tcam add muse_cam_third', 'time set 6000', 'gamerule doDaylightCycle false']) con(l);
  for (const sc of SCEN) {
    con('tag Tbot remove muse_cam_target');
    for (const l of ['fill -10 -61 -10 10 -40 10 minecraft:air', 'fill -10 -64 -10 10 -62 10 minecraft:dirt']) con(l);
    con('tp Tbot 0.5 -61 0.5 0 0');
    await sleep(300);
    for (const [blk, ...b] of sc.boxes) con(`fill ${b.join(' ')} minecraft:${blk}`);
    con(`tp Tbot ${sc.bot.join(' ')} 0 0`);
    con('tp Tcam Tbot');
    con('tag Tbot add muse_cam_target');
    con('function muse_cam:fresh');
    con('scoreboard players set #on muse_cam_y 0');
    await sleep(3500);
    const from = fs.statSync(log).size;
    con('scoreboard players get #rl muse_cam_y');
    con('scoreboard players get #on muse_cam_y');
    con('data get entity @e[type=minecraft:item_display,tag=muse_cam_eye,limit=1] Pos');
    await sleep(800);
    const rl = Number(lastMatch(/#rl has (-?\d+)/g, from)?.[1]);
    const on = Number(lastMatch(/#on has (-?\d+)/g, from)?.[1]);
    const pm = lastMatch(/has the following entity data: \[(-?[\d.]+)d, (-?[\d.]+)d, (-?[\d.]+)d\]/g, from);
    const eye = pm ? pm.slice(1, 4).map(Number) : null;
    const to = [sc.bot[0], sc.bot[1] + 1.62, sc.bot[2]];
    let clear = null, dist = null, pitch = null;
    if (eye) {
      const d = to.map((v, k) => v - eye[k]);
      dist = Math.hypot(...d);
      pitch = Math.round((Math.atan2(-d[1], Math.hypot(d[0], d[2])) * 180) / Math.PI);
      clear = dist;
      for (let s = 0.05; s < dist; s += 0.05) {
        const [x, y, z] = eye.map((v, k) => Math.floor(v + (d[k] * s) / dist));
        if (solidAt(sc, x, y, z)) { clear = s; break; }
      }
    }
    const r1 = (v) => (v === null ? null : Math.round(v * 10) / 10);
    console.log(JSON.stringify({ scene: sc.name, rule: rl, on, eye: eye && eye.map(r1), dist: r1(dist), pitch, clearBeforeFirstBlock: r1(clear) }));
  }
  bot.quit(); cam.quit(); setTimeout(() => process.exit(0), 500);
})();
