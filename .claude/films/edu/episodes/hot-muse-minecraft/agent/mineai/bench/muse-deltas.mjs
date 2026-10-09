// muse-deltas.mjs - the Muse run on staging (2026-10-08, game g38e5ef) found inventory changes it could not read: "craft
// stone_pickaxe" -2 cobblestone (the recipe takes 3), "build shelter" +9 cobblestone +1 dirt, "collect cobblestone 12"
// "mined 0 blocks and picked up 12 cobblestone", and cobblestone and dirt changing in a collect of coal_ore and a hunt.
// Staging's log keeps only each step's whole change and the game's runtime data was deleted at its end, so this bench
// plays the same actions on a local Paper server with one host of the runtime, through their MCP tools (no model, test
// bots Tst_dl_*), and prints for each: their evidence, the inventory before and after (their view_status), and what our
// gateway now replies (src/mineai/skills.js ownChange and fromTheirs, src/mcp.js changeText). It also checks patch 0009:
// bats held in the cells nearest the bot, and a temporary crafting table for `craft_item wooden_pickaxe`.
//
//   BUN=<bun> node mineai/bench/muse-deltas.mjs <runtime dir> [--server <paper dir>] [--port 25565] [--only s1,s2,...]
//     [--bats 3] [--out file.json]
//
// s1: collect_block cobblestone 12 from a 1x2 pocket in stone, a cobblestone block 10 blocks off (the old mapping)
// s2: collect_block stone 12 from the same kind of pocket (what collect cobblestone sends now)
// s3: craft_item stone_pickaxe with a temporary table in the only free cell, where a cobblestone lies that can be picked
//   up 2 s into the craft
// s4: build_structure shelter (our blueprint cells) in a 1x2 pocket in stone (2026-10-08, before patch 0010: their
//   runtime's event loop stopped for over 60 s in it every time, their watchdog ended the runtime and the scenes after
//   it could not run, so it runs last; with 0010 the shelter is built, the bot inside)
// s4b: the same shelter on open ground
// s5: collect_block coal_ore 1 inside stone, the ore 6 blocks off, dirt carried
// bats: craft_item wooden_pickaxe with a temporary table, the 8 cells around the bot held by bats (NoAI): with 0009 the
//   table goes to a free cell further off; without it their placement picks a bat's cell and fails
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { connect } from './mcp.mjs';
import { ownChange, fromTheirs, blueprintCells } from '../../src/mineai/skills.js';
import { changeText } from '../../src/mcp.js';
import { inventoryDelta } from '../../src/contracts.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    server: { type: 'string', default: path.resolve(import.meta.dirname, '../../server') },
    port: { type: 'string', default: '25565' },
    'listen-port': { type: 'string', default: '25793' },
    only: { type: 'string', default: 's1,s2,s3,s4b,s5,bats' },
    bats: { type: 'string', default: '3' },
    out: { type: 'string' },
  },
});
const tree = positionals[0];
if (!tree) { console.error('usage: BUN=<bun> node mineai/bench/muse-deltas.mjs <runtime dir> [--server <paper dir>] [--only s1,...] [--bats n]'); process.exit(2); }
const ONLY = new Set(values.only.split(','));
const BUN = process.env.BUN ?? 'bun';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// eslint-disable-next-line no-control-regex
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const BOT = `Tst_dl_${Math.random().toString(36).slice(2, 7)}`;

const LOG = path.join(values.server, 'logs', 'latest.log');
async function con(line, want = null, ms = 4000) {
  const from = fs.statSync(LOG).size;
  fs.writeFileSync(path.join(values.server, 'console.in'), `${line}\n`);
  if (!want) { await sleep(150); return null; }
  for (const until = Date.now() + ms; Date.now() < until;) {
    await sleep(60);
    const size = fs.statSync(LOG).size;
    if (size <= from) continue;
    const fd = fs.openSync(LOG, 'r');
    const buf = Buffer.alloc(size - from);
    fs.readSync(fd, buf, 0, buf.length, from);
    fs.closeSync(fd);
    const hit = strip(buf.toString('utf8')).split('\n').find((l) => want.test(l));
    if (hit) return hit;
  }
  return null;
}
const isBlock = async (x, y, z, name) => /Test passed/.test(await con(`execute if block ${x} ${y} ${z} minecraft:${name}`, /Test (passed|failed)/) ?? '');

const LP = Number(values['listen-port']);
await con(`whitelist add ${BOT}`);
const host = spawn(BUN, ['src/server/host.ts', '--minecraft-port', values.port, '--listen-host', '127.0.0.1', '--listen-port', String(LP),
  '--bot-data-persistence', 'temporary'], { cwd: tree, env: { ...process.env, MINEAI_USERNAME: BOT }, stdio: ['ignore', 'pipe', 'pipe'] });
let hostLog = '';
host.stdout.on('data', (b) => { hostLog += b; });
host.stderr.on('data', (b) => { hostLog += b; });
const stopHost = async () => { host.kill('SIGTERM'); await sleep(500); await con(`whitelist remove ${BOT}`); };
for (let t = 0; ; t++) {
  try {
    const h = await (await fetch(`http://127.0.0.1:${LP}/health`, { signal: AbortSignal.timeout(2000) })).json();
    if (JSON.stringify(h).includes(BOT) && /connected/.test(JSON.stringify(h))) break;
  } catch { /* not yet */ }
  if (t > 120 || host.exitCode !== null) { console.error(`the host did not get ready:\n${hostLog.slice(-2000)}`); await stopHost(); process.exit(1); }
  await sleep(500);
}
const client = await connect(`http://127.0.0.1:${LP}/mcp`);
let sid = 0;
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: { response_format: 'json', rationale: 'Bench of the Muse run deltas.', ...args } }, undefined, { timeout: 600000 });
  return r.structuredContent?.response?.data ?? r.structuredContent;
};
/** Their status inventory (main and hotbar), as our body reads it. */
async function inventory() {
  const d = await call('view_status', {});
  const out = {};
  for (const s of d?.result?.situation?.inventory?.stacks ?? []) if (s.location === 'main' || s.location === 'hotbar') out[s.name] = (out[s.name] ?? 0) + s.count;
  return { inv: out, pos: d?.result?.situation?.position ?? null, heading: d?.result?.situation?.position?.headingDegrees ?? 0 };
}
/** One action as our body runs it: inventory before, the action to its end, inventory after; our reply's words. */
async function act(tool, args) {
  const before = (await inventory()).inv;
  const t0 = Date.now();
  let d = await call(tool, { ...args, submission_id: `${BOT}-${Date.now()}-${++sid}`, wait_timeout_ms: 120000 });
  while (['pending', 'accepted', 'running'].includes(d?.state)) d = await call('wait_for_action', { action_id: d.actionId, timeout_ms: 120000 });
  await sleep(500); // pickups and slot updates that trail the result
  const after = (await inventory()).inv;
  const output = d?.output ?? { result: d?.result ?? d };
  const ours = fromTheirs(tool, output, { call: { tool, args } });
  const own = ownChange(tool, output, { tool, args });
  const delta = inventoryDelta(before, after);
  const r = { ok: ours.ok, result: ours.result, delta, ...(own ? { own } : {}) };
  return { tool, s: (Date.now() - t0) / 1000, status: output?.result?.status, error: String(output?.result?.error ?? '').slice(0, 300), evidence: output?.result, delta, own, reply: `${ours.ok ? 'ok' : 'FAILED'}: ${ours.result} [${changeText(r, tool === 'build_structure' ? 'build' : tool)}]` };
}
const rows = { bot: BOT, runtime: tree, scenes: [] };
const show = (name, r, extra = {}) => {
  rows.scenes.push({ name, ...r, ...extra });
  console.log(`\n== ${name}: ${r.status} in ${r.s.toFixed(1)} s`);
  console.log(`   whole change (status before/after): ${JSON.stringify(r.delta)}`);
  console.log(`   the step's own (their evidence):     ${JSON.stringify(r.own)}`);
  console.log(`   our reply: ${r.reply}`);
  if (r.error) console.log(`   their error: ${r.error}`);
  for (const [k, v] of Object.entries(extra)) console.log(`   ${k}: ${JSON.stringify(v)}`);
};

/** A stone block around (X, Y, Z) with a 1x2 pocket for the bot at its centre; returns when the bot stands in it. */
async function pocket(X, Y, Z, { r = 12, more = [] } = {}) {
  await con(`forceload add ${X - 16} ${Z - 16} ${X + 16} ${Z + 16}`);
  await sleep(2500);
  await con(`fill ${X - r} ${Y - 4} ${Z - r} ${X + r} ${Y + 6} ${Z + r} minecraft:stone`);
  await con(`fill ${X} ${Y} ${Z} ${X} ${Y + 1} ${Z} minecraft:air`);
  for (const [x, y, z, b] of more) await con(`setblock ${x} ${y} ${z} minecraft:${b}`);
  await con(`kill @e[type=item,x=${X - r},y=${Y - 4},z=${Z - r},dx=${2 * r},dy=12,dz=${2 * r}]`);
  await con(`clear ${BOT}`);
  await con(`tp ${BOT} ${X + 0.5} ${Y} ${Z + 0.5}`);
  await sleep(3000);
}
const give = async (items) => { for (const [k, n] of Object.entries(items)) await con(`give ${BOT} ${k} ${n}`); await sleep(1000); };
const done = async (X, Z) => con(`forceload remove ${X - 16} ${Z - 16} ${X + 16} ${Z + 16}`);
const BASE = 14000;

/** Run one scene; a runtime their watchdog stopped ends the bench (recorded), anything else is recorded and skipped. */
let stopped = null;
async function scene(name, fn) {
  if (!ONLY.has(name) || stopped) return;
  try { await fn(); } catch (err) {
    const msg = String(err?.message ?? err).slice(0, 400);
    rows.scenes.push({ name, error: msg });
    console.log(`\n== ${name}: ERROR ${msg}`);
    if (/RUNTIME_UNRESPONSIVE|RUNTIME_EXITED/.test(msg)) stopped = name;
  }
}

await scene('s1', async () => {
  const [X, Y, Z] = [BASE, 50, BASE];
  await pocket(X, Y, Z, { more: [[X + 10, Y, Z, 'cobblestone']] });
  await give({ wooden_pickaxe: 1 });
  const r = await act('collect_block', { block_name: 'cobblestone', count: 12 });
  show('s1 collect_block cobblestone 12 (the old mapping), a cobblestone block 10 off', r, { blocksBroken: r.evidence?.collected?.blocksBroken, brokenAt: r.evidence?.collected?.brokenAt?.length, cobblestoneBlockStill: await isBlock(X + 10, Y, Z, 'cobblestone') });
  await done(X, Z);
});
await scene('s2', async () => {
  const [X, Y, Z] = [BASE + 64, 50, BASE];
  await pocket(X, Y, Z);
  await give({ wooden_pickaxe: 1 });
  const r = await act('collect_block', { block_name: 'stone', count: 12 });
  show('s2 collect_block stone 12 (collect cobblestone now)', r, { blocksBroken: r.evidence?.collected?.blocksBroken });
  await done(X, Z);
});
await scene('s3', async () => {
  const [X, Y, Z] = [BASE + 128, 50, BASE];
  // the only free cell for the table is X+1; a cobblestone lies there and can be picked up 2 s later, during the craft
  // (as a drop of stone dug on the way lies about until the bot passes it)
  await pocket(X, Y, Z, { more: [[X + 1, Y, Z, 'air'], [X + 1, Y + 1, Z, 'air']] });
  await give({ cobblestone: 3, stick: 2, crafting_table: 1, wooden_pickaxe: 1 });
  await con(`summon item ${X + 1.5} ${Y} ${Z + 0.5} {Item:{id:"minecraft:cobblestone",count:1},PickupDelay:40}`);
  const r = await act('craft_item', { items: [{ item_name: 'stone_pickaxe', count: 1 }], temporary_workstation: true });
  show('s3 craft_item stone_pickaxe, temporary table, a cobblestone lying in its cell', r, { plan: r.evidence?.craft?.plan?.steps, workstation: r.evidence?.workstation });
  await done(X, Z);
});
const AUDIT = (st) => st && (({ cells: c, correct, placed, dug, wrong, complete }) => ({ cells: c, correct, placed, dug, wrong, complete }))(st);
await scene('s4b', async () => {
  const [X2, Y2, Z2] = [BASE + 256, 200, BASE];
  await con(`forceload add ${X2 - 8} ${Z2 - 8} ${X2 + 8} ${Z2 + 8}`);
  await sleep(2500);
  await con(`fill ${X2 - 6} ${Y2 - 1} ${Z2 - 6} ${X2 + 6} ${Y2 - 1} ${Z2 + 6} minecraft:stone`);
  await con(`fill ${X2 - 6} ${Y2} ${Z2 - 6} ${X2 + 6} ${Y2 + 4} ${Z2 + 6} minecraft:air`);
  await con(`clear ${BOT}`);
  await con(`tp ${BOT} ${X2 + 0.5} ${Y2} ${Z2 + 0.5}`);
  await sleep(3000);
  await give({ cobblestone: 20 });
  const o = await inventory();
  const open = blueprintCells('shelter', 'cobblestone', { x: Math.floor(o.pos.x), y: Math.floor(o.pos.y), z: Math.floor(o.pos.z) }, o.heading).cells;
  const r2 = await act('build_structure', { blocks: open, remove_wrong_blocks: true });
  show('s4b build shelter cobblestone on open ground', r2, { structure: AUDIT(r2.evidence?.structure) });
  await con(`forceload remove ${X2 - 8} ${Z2 - 8} ${X2 + 8} ${Z2 + 8}`);
});
await scene('s5', async () => {
  const [X, Y, Z] = [BASE + 320, 50, BASE];
  await pocket(X, Y, Z, { more: [[X + 6, Y + 2, Z, 'coal_ore']] });
  await give({ stone_pickaxe: 1, dirt: 8 });
  const r = await act('collect_block', { block_name: 'coal_ore', count: 1 });
  show('s5 collect_block coal_ore 1, the ore 6 off inside stone', r, { blocksBroken: r.evidence?.collected?.blocksBroken });
  await done(X, Z);
});
await scene('bats', async () => {
  const RING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  rows.bats = [];
  for (let i = 0; i < Number(values.bats); i++) {
    const [X, Y, Z] = [BASE + 400 + i * 40, 200, BASE];
    await con(`forceload add ${X} ${Z}`);
    await sleep(2000);
    await con(`fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y - 1} ${Z + 6} minecraft:stone`);
    await con(`fill ${X - 6} ${Y} ${Z - 6} ${X + 6} ${Y + 4} ${Z + 6} minecraft:air`);
    await con(`kill @e[type=bat,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);
    await con(`kill @e[type=item,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);
    await con(`clear ${BOT}`);
    await con(`tp ${BOT} ${X + 0.5} ${Y} ${Z + 0.5}`);
    await sleep(2000);
    for (const [dx, dz] of RING) await con(`summon bat ${X + dx + 0.5} ${Y + 0.1} ${Z + dz + 0.5} {NoAI:1b,NoGravity:1b,Silent:1b,PersistenceRequired:1b}`);
    await give({ crafting_table: 1, oak_planks: 3, stick: 2 });
    await sleep(1500);
    const r = await act('craft_item', { items: [{ item_name: 'wooden_pickaxe', count: 1 }], temporary_workstation: true });
    const t = r.evidence?.workstation?.position ?? null;
    const pass = r.status === 'succeeded' && Boolean(t) && Math.max(Math.abs(t.x - X), Math.abs(t.z - Z)) >= 2;
    const row = { i, status: r.status, s: r.s, table: t, tableOffset: t ? { dx: t.x - X, dz: t.z - Z } : null, recovered: r.evidence?.workstation?.recovered ?? null, error: r.error, pass };
    rows.bats.push(row);
    console.log(`\n== bats ${i + 1}: ${pass ? 'PASS' : 'FAIL'} ${r.status} in ${r.s.toFixed(1)} s, table at ${t ? `${t.x} ${t.y} ${t.z} (dx ${t.x - X}, dz ${t.z - Z})` : '-'}${r.error ? `; ${r.error.slice(0, 200)}` : ''}`);
    await con(`kill @e[type=bat,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);
    await con(`forceload remove ${X} ${Z}`);
  }
});
await scene('s4', async () => {
  const [X, Y, Z] = [BASE + 192, 50, BASE];
  await pocket(X, Y, Z);
  await give({ cobblestone: 20, stone_pickaxe: 1 });
  const { pos, heading } = await inventory();
  const feet = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
  const cells = blueprintCells('shelter', 'cobblestone', feet, heading).cells;
  const r = await act('build_structure', { blocks: cells, remove_wrong_blocks: true });
  show('s4 build shelter cobblestone in a 1x2 pocket in stone', r, { structure: AUDIT(r.evidence?.structure) });
  await done(X, Z);
});

await client.close().catch(() => {});
await stopHost();
if (values.out) fs.writeFileSync(values.out, `${JSON.stringify(rows, null, 1)}\n`);
if (rows.bats) console.log(`\nbats: ${rows.bats.filter((r) => r.pass).length} of ${rows.bats.length}`);
