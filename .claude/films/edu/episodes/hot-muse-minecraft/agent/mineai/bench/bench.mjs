// bench.mjs - crafting reliability bench for mine-ai-mcp (no model): every craft_item call is checked against the
// server's own record of the inventory (console `data get entity`), not only against what the bot reports.
//
//   node bench.mjs --server paper|van --series 2x2|table --n 50 --label L [--url U] [--bot B] [--at X,Y,Z]
//
// Checks per call: status succeeded; the server's inventory gained exactly the requested count of each item; wood,
// stone and iron units are conserved (nothing vanished into a grid, onto a cursor or onto the ground); and the bot's
// own inventory view equals the server's afterwards. Writes runs/<label>.json.
import fs from 'node:fs';
import { connect } from './mcp.mjs';
import { DIRS } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const server = arg('server', 'paper');
const series = arg('series', '2x2');
const N = Number(arg('n', series === '2x2' ? 50 : 30));
const label = arg('label', `${server}-${series}-${Date.now()}`);
const url = arg('url', `http://127.0.0.1:${server === 'paper' ? 25691 : 25692}/mcp`);
const bot = arg('bot', server === 'paper' ? 'Tst_rv_cp' : 'Tst_rv_cv');
const [X, Y, Z] = arg('at', '3000,200,3000').split(',').map(Number);
const DIR = DIRS[server];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** One console line; resolves with the first new log line matching `want` (or null after `ms`). */
async function con(line, want = null, ms = 4000) {
  const log = `${DIR}/server.log`;
  const from = fs.statSync(log).size;
  fs.writeFileSync(`${DIR}/console.in`, `${line}\n`);
  if (!want) { await sleep(120); return null; }
  const until = Date.now() + ms;
  while (Date.now() < until) {
    await sleep(60);
    const size = fs.statSync(log).size;
    if (size <= from) continue;
    const fd = fs.openSync(log, 'r');
    const buf = Buffer.alloc(size - from);
    fs.readSync(fd, buf, 0, buf.length, from);
    fs.closeSync(fd);
    const hit = strip(buf.toString('utf8')).split('\n').find((l) => want.test(l));
    if (hit) return hit;
  }
  return null;
}

/** Top-level {...} entries of an SNBT list, with nested compounds removed. */
function entries(list) {
  const out = [];
  let depth = 0; let cur = ''; let str = false;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (str) { if (depth === 1) cur += ch; if (ch === '\\') { if (depth === 1) cur += list[i + 1]; i++; } else if (ch === '"') str = false; continue; }
    if (ch === '"') { str = true; if (depth === 1) cur += ch; continue; }
    if (ch === '{') { depth++; if (depth === 1) cur = ''; continue; }
    if (ch === '}') { depth--; if (depth === 0) out.push(cur); continue; }
    if (depth === 1) cur += ch;
  }
  return out;
}

/** The server's record of the bot's inventory: Map name -> count. */
async function serverInventory() {
  for (let t = 0; t < 3; t++) {
    const line = await con(`data get entity ${bot} Inventory`, new RegExp(`${bot} has the following entity data: `));
    if (!line) continue;
    const list = line.slice(line.indexOf('entity data: ') + 13);
    const inv = new Map();
    for (const e of entries(list)) {
      const id = /id: "minecraft:([a-z0-9_]+)"/.exec(e)?.[1];
      const n = Number(/count: (\d+)/.exec(e)?.[1] ?? 1);
      const slot = Number(/Slot: (-?\d+)b/.exec(e)?.[1] ?? 0);
      if (id && slot >= 0 && slot <= 35) inv.set(id, (inv.get(id) ?? 0) + n); // armour (100+) and offhand (-106) are not part of this bench
    }
    return inv;
  }
  throw new Error('no answer from the server console');
}

const c = await connect(url);
let sid = 0;
const RUN = Date.now(); // submission ids are kept by the runtime across restarts: a reused id replays the old result
async function call(name, args) {
  const r = await c.callTool({ name, arguments: { response_format: 'json', rationale: 'Bench: crafting reliability.', ...args } }, undefined, { timeout: 600000 });
  return r.structuredContent?.response?.data ?? r.structuredContent;
}
async function botInventory() {
  const d = await call('view_status', {});
  const inv = new Map();
  for (const s of d?.result?.situation?.inventory?.stacks ?? []) if (s.slot >= 9 && s.slot <= 44) inv.set(s.name, (inv.get(s.name) ?? 0) + s.count);
  return inv;
}
async function act(name, args) {
  let data = await call(name, { ...args, submission_id: `${label}-${RUN}-${++sid}`, wait_timeout_ms: 120000 });
  while (data?.state === 'pending' || data?.state === 'accepted' || data?.state === 'running') {
    const id = data.actionId ?? data.action_id ?? data.progress?.actionId;
    data = await call('wait_for_action', { action_id: id, timeout_ms: 120000 });
  }
  return data;
}

// wood (in planks), stone (cobblestone) and iron (ingots) per item; anything else must not change
const UNITS = {
  stick: [0.5, 0, 0], crafting_table: [4, 0, 0], wooden_pickaxe: [4, 0, 0], stone_pickaxe: [1, 3, 0],
  iron_pickaxe: [1, 0, 3], furnace: [0, 8, 0], cobblestone: [0, 1, 0], iron_ingot: [0, 0, 1],
};
const unitsOf = (name) => (name.endsWith('_log') ? [4, 0, 0] : name.endsWith('_planks') ? [1, 0, 0] : UNITS[name]);
function totals(inv) {
  const t = [0, 0, 0]; const other = [];
  for (const [n, k] of inv) { const u = unitsOf(n); if (!u) other.push(`${n}x${k}`); else for (let i = 0; i < 3; i++) t[i] += u[i] * k; }
  return { t, other: other.sort().join(',') };
}
const same = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const show = (m) => [...m].sort().map(([k, v]) => `${k}:${v}`).join(' ');

const STEPS = series === '2x2'
  ? [
      [['oak_planks', 4]], [['stick', 4]], [['birch_planks', 8]], [['crafting_table', 1]], [['stick', 8]],
      [['spruce_planks', 4]], [['oak_planks', 12]], [['stick', 4]], [['crafting_table', 1]], [['jungle_planks', 4]],
    ].map((items) => ({ items, temp: false }))
  : [
      { items: [['wooden_pickaxe', 1]], temp: false },
      { items: [['stone_pickaxe', 1]], temp: true },
      { items: [['iron_pickaxe', 1]], temp: false },
      { items: [['furnace', 1]], temp: true },
      // as in the iron route: no sticks carried, so the sticks for both are crafted from planks first (their planner
      // counts carried sticks toward the pickaxe even when sticks are asked for too: a net gain of 2 of 4)
      { items: [['wooden_pickaxe', 1], ['stick', 4]], temp: true, setup: ['clear BOT stick'] },
      { items: [['stone_pickaxe', 1], ['furnace', 1]], temp: false },
    ];

// a stone platform in the sky, away from everyone else; the bot stands at its centre
await con(`forceload add ${X} ${Z}`);
await con(`fill ${X - 5} ${Y - 1} ${Z - 5} ${X + 5} ${Y - 1} ${Z + 5} minecraft:stone`);
await con(`fill ${X - 5} ${Y} ${Z - 5} ${X + 5} ${Y + 4} ${Z + 5} minecraft:air`);
await con(`kill @e[type=item,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);
if (series === 'table') await con(`setblock ${X + 2} ${Y} ${Z} minecraft:crafting_table`);
await con(`clear ${bot}`);
await con(`tp ${bot} ${X + 0.5} ${Y} ${Z + 0.5}`);
const stock = series === '2x2'
  ? [['oak_log', 64], ['birch_log', 16], ['spruce_log', 16], ['jungle_log', 16]]
  : [['oak_planks', 64], ['stick', 32], ['cobblestone', 128], ['iron_ingot', 32], ['crafting_table', 1]];
for (const [n, k] of stock) await con(`give ${bot} ${n} ${k}`);
await sleep(1500);

const rows = [];
let fails = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const step = STEPS[i % STEPS.length];
  if (series === 'table' && i % STEPS.length === 0 && i > 0) {
    for (const n of ['wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe']) await con(`clear ${bot} ${n}`);
    await con(`give ${bot} cobblestone 22`);
    await con(`give ${bot} iron_ingot 3`);
    await con(`give ${bot} oak_planks 16`);
    await con(`give ${bot} stick 8`);
  }
  for (const line of step.setup ?? []) await con(line.replace('BOT', bot));
  await con(`tp ${bot} ${X + 0.5} ${Y} ${Z + 0.5}`);
  await sleep(400);
  const before = await serverInventory();
  const s = Date.now();
  const data = await act('craft_item', {
    items: step.items.map(([item_name, count]) => ({ item_name, count })),
    ...(step.temp ? { temporary_workstation: true } : {}),
  });
  const ms = Date.now() - s;
  const res = data?.output?.result ?? data?.result ?? data;
  const after = await serverInventory();
  let view = await botInventory();
  let lag = false;
  if (!same(view, after)) { await sleep(800); view = await botInventory(); lag = true; }
  const problems = [];
  if (res?.status !== 'succeeded') problems.push(`status ${res?.status}: ${String(res?.error ?? JSON.stringify(data)).slice(0, 300)}`);
  for (const [n, k] of step.items) {
    const got = (after.get(n) ?? 0) - (before.get(n) ?? 0);
    // exact, except that recursive crafting may leave less than one application's surplus (8 sticks made, 6 needed)
    const per = /_planks$|^stick$/.test(n) ? 4 : 1;
    if (got < k || got >= k + per) problems.push(`server gained ${got} ${n}, asked ${k}`);
  }
  const tb = totals(before); const ta = totals(after);
  if (tb.t.some((v, j) => Math.abs(v - ta.t[j]) > 1e-9)) problems.push(`units ${tb.t} -> ${ta.t}`);
  if (tb.other !== ta.other) problems.push(`other items ${tb.other} -> ${ta.other}`);
  if (!same(view, after)) problems.push(`bot view differs: bot {${show(view)}} server {${show(after)}}`);
  const ok = problems.length === 0;
  if (!ok) fails++;
  const row = { i, items: step.items, temp: step.temp, ms, ok, lag, problems, status: res?.status, gained: res?.craft?.items?.map((x) => `${x.item}:${x.gained}${x.confirmed ? '' : '?'}`) };
  rows.push(row);
  console.log(JSON.stringify(row));
}
const total = (Date.now() - t0) / 1000;
const msList = rows.map((r) => r.ms).sort((a, b) => a - b);
const summary = { label, server, series, bot, n: N, ok: N - fails, fails, total, medianMs: msList[Math.floor(msList.length / 2)], p90Ms: msList[Math.floor(msList.length * 0.9)], maxMs: msList.at(-1) };
fs.mkdirSync('runs', { recursive: true });
fs.writeFileSync(`runs/${label}.json`, JSON.stringify({ summary, rows }, null, 1));
console.log(JSON.stringify(summary));
await con(`forceload remove ${X} ${Z}`);
await c.close();
