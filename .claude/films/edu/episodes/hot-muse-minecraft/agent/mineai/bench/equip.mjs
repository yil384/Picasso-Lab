// equip.mjs - the other window flows of mine-ai-mcp (no model): equip (armour, shield to the off-hand, a sword from the
// main inventory to the hand) and drop_item, checked against the server's own record of every inventory slot.
//
//   node equip.mjs --server paper|van --n 10 --label L [--url U] [--bot B] [--at X,Y,Z]
import fs from 'node:fs';
import { consoleOf, mcp, same, show, resultOf, platform, sleep } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const server = arg('server', 'paper');
const N = Number(arg('n', 10));
const label = arg('label', `${server}-equip-${Date.now()}`);
const url = arg('url', `http://127.0.0.1:${server === 'paper' ? 25691 : 25692}/mcp`);
const bot = arg('bot', server === 'paper' ? 'Tst_rv_cp' : 'Tst_rv_cv');
const [X, Y, Z] = arg('at', '3000,200,3000').split(',').map(Number);
const con = consoleOf(server);
const m = await mcp(url, label);

/** The server's record of every slot: Map slot -> {name, count} (100-103 armour, -106 off-hand). */
async function slots() {
  const line = await con(`data get entity ${bot} Inventory`, new RegExp(`${bot} has the following entity data: `));
  const list = line.slice(line.indexOf('entity data: ') + 13);
  const out = new Map();
  for (const m of list.matchAll(/\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
    const e = m[1];
    const id = /id: "minecraft:([a-z0-9_]+)"/.exec(e)?.[1];
    const slot = Number(/Slot: (-?\d+)b/.exec(e)?.[1]);
    const count = Number(/count: (\d+)/.exec(e)?.[1] ?? 1);
    if (id) out.set(slot, { name: id, count });
  }
  return out;
}
async function selected() {
  const line = await con(`data get entity ${bot} SelectedItemSlot`, new RegExp(`${bot} has the following entity data: `));
  return Number(/entity data: (\d+)/.exec(line)?.[1]);
}
const totals = (s, filter = () => true) => {
  const t = new Map();
  for (const [slot, { name, count }] of s) if (filter(slot)) t.set(name, (t.get(name) ?? 0) + count);
  return t;
};
const mainAndHotbar = (slot) => slot >= 0 && slot <= 35;
const killItems = () => con(`kill @e[type=item,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);

await platform(con, bot, X, Y, Z);
await sleep(1000);
const rows = [];
let fails = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const problems = [];
  await con(`clear ${bot}`);
  await killItems();
  await con(`tp ${bot} ${X + 0.5} ${Y} ${Z + 0.5}`);
  for (let k = 0; k < 9; k++) await con(`give ${bot} cobblestone 64`); // the hotbar is full: the gear lands in the main inventory
  for (const [n, k] of [['iron_helmet', 1], ['iron_chestplate', 1], ['iron_leggings', 1], ['iron_boots', 1], ['shield', 1], ['diamond_sword', 1], ['oak_log', 30], ['dirt', 40]]) await con(`give ${bot} ${n} ${k}`);
  await sleep(500);
  const s0 = await slots();
  let t = Date.now();
  const eq = resultOf(await m.act('equip', { items: [
    { item_name: 'iron_helmet' }, { item_name: 'iron_chestplate' }, { item_name: 'iron_leggings' }, { item_name: 'iron_boots' },
    { item_name: 'shield' }, { item_name: 'diamond_sword', destination: 'hand' },
  ] }));
  const equipMs = Date.now() - t;
  const s1 = await slots();
  const sel = await selected();
  if (eq?.status !== 'succeeded') problems.push(`equip ${eq?.status}: ${String(eq?.error).slice(0, 200)}`);
  for (const [slot, name] of [[103, 'iron_helmet'], [102, 'iron_chestplate'], [101, 'iron_leggings'], [100, 'iron_boots'], [-106, 'shield'], [sel, 'diamond_sword']]) {
    if (s1.get(slot)?.name !== name) problems.push(`server slot ${slot} holds ${s1.get(slot)?.name ?? 'nothing'}, not ${name}`);
  }
  if (!same(totals(s0), totals(s1))) problems.push(`equip changed the items: {${show(totals(s0))}} -> {${show(totals(s1))}}`);
  let view = await m.inventory();
  if (!same(view, totals(s1, mainAndHotbar))) { await sleep(800); view = await m.inventory(); }
  if (!same(view, totals(s1, mainAndHotbar))) problems.push(`bot view differs after equip: bot {${show(view)}} server {${show(totals(s1, mainAndHotbar))}}`);

  t = Date.now();
  const dr = resultOf(await m.act('drop_item', { items: [{ item_name: 'dirt', count: 15 }, { item_name: 'oak_log', count: 10 }] }));
  await killItems(); // before the 2 s pickup delay ends: the bot must not pick its drops up again
  const dropMs = Date.now() - t;
  const s2 = await slots();
  if (dr?.status !== 'succeeded') problems.push(`drop ${dr?.status}: ${String(dr?.error).slice(0, 200)}`);
  const d = (n) => (totals(s2).get(n) ?? 0) - (totals(s1).get(n) ?? 0);
  if (d('dirt') !== -15 || d('oak_log') !== -10) problems.push(`drop moved dirt ${d('dirt')}, oak_log ${d('oak_log')}`);
  for (const n of ['cobblestone', 'iron_helmet', 'shield', 'diamond_sword']) if (d(n) !== 0) problems.push(`drop changed ${n} by ${d(n)}`);
  view = await m.inventory();
  if (!same(view, totals(s2, mainAndHotbar))) { await sleep(800); view = await m.inventory(); }
  if (!same(view, totals(s2, mainAndHotbar))) problems.push(`bot view differs after drop: bot {${show(view)}} server {${show(totals(s2, mainAndHotbar))}}`);

  const ok = problems.length === 0;
  if (!ok) fails++;
  const row = { i, equipMs, dropMs, ok, problems };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const summary = { label, server, series: 'equip+drop', bot, n: N, ok: N - fails, fails, total: (Date.now() - t0) / 1000 };
fs.writeFileSync(`runs/${label}.json`, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary));
await con(`clear ${bot}`);
await con(`forceload remove ${X} ${Z}`);
await m.close();
