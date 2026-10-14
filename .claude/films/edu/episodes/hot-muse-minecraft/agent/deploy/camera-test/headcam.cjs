// deploy/camera-test/headcam.cjs - the replay of production game g0842ff's brown picture (6:31, smelting underground: the
// spot over the shoulder fell back to the bot's eyes, 11, or just ahead of them, 12, and the camera sat inside its
// head) on a local Paper with the muse_cam datapack (as leaves.cjs: a flat world, online-mode off, port 25599, its
// console read from a FIFO). For each scene: the shoulder rule (#sr), whether the camera rides the bot's head (first
// person: the bot's model not drawn; muse_cam_fp over the shoulder, or a pocket sealed all round seen through its eyes
// by the enclosed views) or the eye, and from a dead end a step out into the open: first person still under a second
// later, over the shoulder again after a second.
//   node deploy/camera-test/headcam.cjs <console fifo> <server log>
const mineflayer = require('../../node_modules/mineflayer');
const fs = require('fs');
const con = (l) => fs.appendFileSync(process.argv[2], l + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = process.argv[3];
const lastMatch = (re, from) => { const s = fs.readFileSync(log, 'utf8').slice(from).replace(/\x1b\[[0-9;]*m/g, ''); const m = [...s.matchAll(re)]; return m.length ? m[m.length - 1] : null; };
// boxes filled in order: [block, x0, y0, z0, x1, y1, z1]; ground dirt to y -62, the bot faces south (+z)
const ROCK = ['stone', -8, -61, -8, 8, -50, 8];
const SCEN = [
  { name: 'g0842ff: a 1x2 pocket in rock, a furnace in front, nothing open behind', boxes: [ROCK, ['air', 0, -61, 0, 0, -60, 0], ['furnace', 0, -61, 1, 0, -61, 1]], bot: [0.5, -61, 0.5], fp: true },
  { name: 'a 1x2 dead end, open 2 ahead, rock behind and above', boxes: [ROCK, ['air', 0, -61, 0, 0, -60, 2]], bot: [0.5, -61, 0.5], fp: true },
  { name: 'a 1x2 tunnel, the bot at its end facing the wall (22: behind it)', boxes: [ROCK, ['air', 0, -61, -6, 0, -60, 0]], bot: [0.5, -61, 0.5], fp: false },
  { name: 'the bottom of a 1x1 shaft (13: above its head)', boxes: [ROCK, ['air', 0, -61, 0, 0, -50, 0]], bot: [0.5, -61, 0.5], fp: false },
  { name: 'a 3x3 cave room (behind it)', boxes: [ROCK, ['air', -1, -61, -3, 1, -59, 1]], bot: [0.5, -61, 0.5], fp: false },
  { name: 'open ground', boxes: [], bot: [0.5, -61, 0.5], fp: false },
];
const tags = async (from) => {
  con('tag Tcam list');
  con('scoreboard players get #sr muse_cam_y');
  await sleep(500);
  const t = lastMatch(/Tcam has \d+ tags?: ([^\n]*)/g, from)?.[1] ?? '';
  return { sr: Number(lastMatch(/#sr has (-?\d+)/g, from)?.[1]), fp: /\bmuse_cam_fp\b/.test(t), head: /\bmuse_cam_inhead\b/.test(t), eye: /\bmuse_cam_ineye\b/.test(t) };
};
(async () => {
  const bot = mineflayer.createBot({ host: '127.0.0.1', port: 25599, username: 'Tbot', version: '1.21.4' });
  await new Promise((r) => bot.once('spawn', r));
  const cam = mineflayer.createBot({ host: '127.0.0.1', port: 25599, username: 'Tcam', version: '1.21.4' });
  await new Promise((r) => cam.once('spawn', r));
  await sleep(1000);
  for (const l of ['kill @e[type=item_display]', 'kill @e[type=marker]', 'gamemode spectator Tcam', 'tag Tcam add muse_cam', 'tag Tcam add muse_cam_third', 'time set 6000', 'gamerule doDaylightCycle false']) con(l);
  const out = [];
  const place = async (sc) => {
    for (const l of ['fill -10 -61 -10 10 -40 10 minecraft:air', 'fill -10 -64 -10 10 -62 10 minecraft:dirt']) con(l);
    for (const [blk, ...b] of sc.boxes) con(`fill ${b.join(' ')} minecraft:${blk}`);
    con(`tp Tbot ${sc.bot.join(' ')} 0 0`);
  };
  for (const sc of SCEN) {
    con('tag Tbot remove muse_cam_target');
    await place(sc);
    con('tp Tcam Tbot');
    con('tag Tbot add muse_cam_target');
    con('function muse_cam:fresh');
    await sleep(2500);
    const r = await tags(fs.statSync(log).size);
    out.push({ scene: sc.name, ...r, want: sc.fp ? 'first person' : 'over the shoulder', ok: sc.fp ? r.head && !r.eye : r.eye && !r.head && !r.fp });
  }
  // the hysteresis: from the dead end (first person over the shoulder, 12) out into the open
  await place(SCEN[1]);
  con('function muse_cam:fresh');
  await sleep(2000);
  const inPocket = await tags(fs.statSync(log).size);
  await place(SCEN[5]);
  await sleep(300);
  const soon = await tags(fs.statSync(log).size);
  await sleep(1500);
  const later = await tags(fs.statSync(log).size);
  out.push({ scene: 'dead end, then out in the open: first person at once, over the shoulder after a second', inPocket, after0_8s: soon, after2_3s: later, ok: inPocket.fp && inPocket.head && soon.fp && soon.head && !later.fp && later.eye });
  for (const o of out) console.log(JSON.stringify(o));
  bot.quit(); cam.quit(); setTimeout(() => process.exit(0), 500);
})();
