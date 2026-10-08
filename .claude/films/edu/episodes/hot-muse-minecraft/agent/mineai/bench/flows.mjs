// flows.mjs - smelting and chest use through mine-ai-mcp (no model), checked against the server's own records.
//
//   node flows.mjs --server paper|van --series smelt|chest --n 10 --label L [--url U] [--bot B] [--at X,Y,Z]
//
// smelt: smelt_item with a temporary furnace and with a placed one, 1-3 raw iron, coal or planks as fuel; the server
//        inventory must gain exactly the ingots, lose exactly the input and the fuel, keep its furnace, and the placed
//        furnace must be empty afterwards.
// chest: deposit, withdraw, organize and inspect on a placed chest; every item must be in the inventory or the chest
//        (nothing lost or duplicated), each transfer must move exactly what was asked, and the chest layout reported
//        by organize must be the server's.
// Both: the bot's own inventory view must equal the server's after every call.
import fs from 'node:fs';
import { consoleOf, serverInventory, serverBlockItems, serverBlockSlots, mcp, same, show, resultOf, platform, sleep } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const server = arg('server', 'paper');
const series = arg('series', 'smelt');
const N = Number(arg('n', 10));
const label = arg('label', `${server}-${series}-${Date.now()}`);
const url = arg('url', `http://127.0.0.1:${server === 'paper' ? 25691 : 25692}/mcp`);
const bot = arg('bot', server === 'paper' ? 'Tst_rv_cp' : 'Tst_rv_cv');
const [X, Y, Z] = arg('at', '3000,200,3000').split(',').map(Number);
const con = consoleOf(server);
const m = await mcp(url, label);

await platform(con, bot, X, Y, Z);
const F = [X - 2, Y, Z]; // a placed furnace
const C = [X - 2, Y, Z + 2]; // a placed chest
if (series === 'smelt') await con(`give ${bot} stone_pickaxe 1`); // to pick the temporary furnace up again
if (series === 'chest' || series === 'chest2') {
  await con(`setblock ${C.join(' ')} minecraft:chest`);
  for (const [n, k] of [['cobblestone', 64], ['oak_planks', 32], ['stick', 16], ['iron_ingot', 10]]) await con(`give ${bot} ${n} ${k}`);
}
await sleep(1500);

const merge = (a, b) => { const o = new Map(a); for (const [k, v] of b) o.set(k, (o.get(k) ?? 0) + v); return o; };
const delta = (a, b, k) => (b.get(k) ?? 0) - (a.get(k) ?? 0);

const CHEST_OPS = [
  { operation: 'deposit', items: [['cobblestone', 20], ['oak_planks', 10]] },
  { operation: 'deposit', items: [['stick', 5], ['iron_ingot', 3]] },
  { operation: 'withdraw', items: [['cobblestone', 15]] },
  { operation: 'organize' },
  { operation: 'withdraw', items: [['oak_planks', 10], ['stick', 5], ['iron_ingot', 3], ['cobblestone', 5]] },
  { operation: 'inspect' },
];

// chest2: a fragmented chest (partial stacks in scattered slots) is organized, deposited into and withdrawn from
const FRAGMENTED = '{Items:[{Slot:0b,id:"minecraft:cobblestone",count:10},{Slot:5b,id:"minecraft:oak_planks",count:7},' +
  '{Slot:9b,id:"minecraft:cobblestone",count:33},{Slot:13b,id:"minecraft:stick",count:3},{Slot:20b,id:"minecraft:oak_planks",count:50},' +
  '{Slot:26b,id:"minecraft:cobblestone",count:40}]}';
const CHEST2_OPS = [
  { operation: 'organize' },
  { operation: 'deposit', items: [['cobblestone', 30], ['stick', 10]] },
  { operation: 'withdraw', items: [['oak_planks', 20], ['cobblestone', 40]] },
];
/** Packed in item_order: contiguous from slot 0, each item's full stacks first. */
function packedProblems(slots, order) {
  const list = [...slots].sort((a, b) => a[0] - b[0]);
  const out = [];
  list.forEach(([slot], i) => { if (slot !== i) out.push(`slot ${slot} used, ${i} expected`); });
  let at = 0;
  for (const name of order) {
    const mine = list.filter(([, v]) => v.name === name);
    if (list.slice(at, at + mine.length).some(([, v]) => v.name !== name)) out.push(`${name} not grouped in order`);
    mine.slice(0, -1).forEach(([slot, v]) => { if (v.count !== 64) out.push(`${name} in slot ${slot} is ${v.count}, not a full stack`); });
    at += mine.length;
  }
  return out;
}

const rows = [];
let fails = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  await con(`tp ${bot} ${X + 0.5} ${Y} ${Z + 0.5}`);
  const problems = [];
  let args; let what;
  let chestBefore = null;
  if (series === 'smelt') {
    const k = 1 + (i % 3);
    const temp = i % 2 === 0;
    const fuel = i % 4 === 3 ? 'oak_planks' : 'coal';
    const fuelN = fuel === 'coal' ? 1 : Math.ceil(k / 1.5);
    await con(`give ${bot} raw_iron ${k}`);
    await con(`give ${bot} ${fuel} ${fuelN}`);
    if (temp) await con(`give ${bot} furnace 1`);
    else { await con(`setblock ${F.join(' ')} minecraft:air`); await con(`setblock ${F.join(' ')} minecraft:furnace`); }
    args = { item_name: 'raw_iron', count: k, fuel_item_name: fuel, ...(temp ? { temporary_workstation: true } : { x: F[0], y: F[1], z: F[2] }) };
    what = { k, temp, fuel, fuelN };
  } else {
    const ops = series === 'chest2' ? CHEST2_OPS : CHEST_OPS;
    const op = ops[i % ops.length];
    if (series === 'chest2' && i % ops.length === 0) {
      await con(`setblock ${C.join(' ')} minecraft:air`);
      await con(`setblock ${C.join(' ')} minecraft:chest${FRAGMENTED}`);
      await con(`clear ${bot}`);
      for (const [n, k] of [['cobblestone', 64], ['oak_planks', 32], ['stick', 16], ['iron_ingot', 10]]) await con(`give ${bot} ${n} ${k}`);
    }
    chestBefore = await serverBlockItems(con, ...C);
    args = { operation: op.operation, x: C[0], y: C[1], z: C[2] };
    if (op.items) args.items = op.items.map(([item_name, count]) => ({ item_name, count }));
    if (op.operation === 'organize') args.item_order = [...chestBefore.keys()].sort();
    what = op;
  }
  await sleep(400);
  const before = await serverInventory(con, bot);
  const s = Date.now();
  const data = await m.act(series === 'smelt' ? 'smelt_item' : 'use_container', args);
  const ms = Date.now() - s;
  const res = resultOf(data);
  if (res?.status !== 'succeeded') problems.push(`status ${res?.status}: ${String(res?.error ?? JSON.stringify(data)).slice(0, 300)}`);
  const checks = async (after, view) => {
    const out = [];
    if (series === 'smelt') {
      if (delta(before, after, 'iron_ingot') !== what.k) out.push(`server gained ${delta(before, after, 'iron_ingot')} iron_ingot, asked ${what.k}`);
      if (delta(before, after, 'raw_iron') !== -what.k) out.push(`raw_iron ${delta(before, after, 'raw_iron')}`);
      if (delta(before, after, what.fuel) !== -what.fuelN) out.push(`${what.fuel} ${delta(before, after, what.fuel)}, expected -${what.fuelN}`);
      if (delta(before, after, 'furnace') !== 0) out.push(`furnace ${delta(before, after, 'furnace')}`);
      if (!what.temp) {
        const left = await serverBlockItems(con, ...F);
        if (left.size) out.push(`the furnace still holds ${show(left)}`);
      }
    } else {
      const chestAfter = await serverBlockItems(con, ...C);
      if (!same(merge(before, chestBefore), merge(after, chestAfter))) out.push(`items not conserved: {${show(merge(before, chestBefore))}} -> {${show(merge(after, chestAfter))}}`);
      for (const [n, k] of what.items ?? []) {
        const moved = what.operation === 'deposit' ? delta(after, before, n) : delta(before, after, n);
        if (moved !== k) out.push(`${what.operation} moved ${moved} ${n}, asked ${k}`);
      }
      if (what.operation === 'organize') {
        out.push(...packedProblems(await serverBlockSlots(con, ...C), args.item_order));
      }
      if (what.operation === 'organize' || what.operation === 'inspect') {
        if (!same(chestBefore, chestAfter)) out.push(`${what.operation} changed the chest: {${show(chestBefore)}} -> {${show(chestAfter)}}`);
        if (!same(before, after)) out.push(`${what.operation} changed the inventory`);
      }
    }
    if (!same(view, after)) out.push(`bot view differs: bot {${show(view)}} server {${show(after)}}`);
    return out;
  };
  // their actions report from the client's prediction: a take or transfer can still be on its way to the server when
  // the action returns, so a mismatch is read once more after a second and counted as late if it then agrees
  let found = await checks(await serverInventory(con, bot), await m.inventory());
  let late = false;
  if (found.length) {
    await sleep(1000);
    const again = await checks(await serverInventory(con, bot), await m.inventory());
    late = again.length === 0;
    found = again.length ? [...found, '(a second later:)', ...again] : [];
  }
  problems.push(...found);
  // collect the ingots so the inventory stays small
  if (series === 'smelt') await con(`clear ${bot} iron_ingot`);
  const ok = problems.length === 0;
  if (!ok) fails++;
  const row = { i, what, ms, ok, late, problems, status: res?.status };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const total = (Date.now() - t0) / 1000;
const msList = rows.map((r) => r.ms).sort((a, b) => a - b);
const summary = { label, server, series, bot, n: N, ok: N - fails, fails, late: rows.filter((r) => r.late).length, total, medianMs: msList[Math.floor(msList.length / 2)], p90Ms: msList[Math.floor(msList.length * 0.9)], maxMs: msList.at(-1) };
fs.mkdirSync('runs', { recursive: true });
fs.writeFileSync(`runs/${label}.json`, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary));
await con(`forceload remove ${X} ${Z}`);
await m.close();
