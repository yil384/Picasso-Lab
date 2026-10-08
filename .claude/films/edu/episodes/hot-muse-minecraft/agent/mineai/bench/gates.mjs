// gates.mjs - the Paper check of patches 0007 and 0008 (gate 3 of the switch to BODY=mineai; no model, test bots
// Tst_gate_*). One Mine AI MCP host of the given runtime on a local Paper server, driven through their MCP tools; every
// placement is checked against the server's own record (console `execute if block`), not the bot's.
//
//   node mineai/bench/gates.mjs <runtime dir> [--server <paper dir>] [--port 25565] [--flowers 5] [--landings 3]
//
// flowers (0007): a grass platform in the sky, the 8 cells around the bot filled with flowers (poppy, dandelion,
//   cornflower, oxeye daisy, red tulip in turn), and `craft_item wooden_pickaxe` with a temporary crafting table from
//   a table, 3 planks and 2 sticks. Passes when the craft succeeds, the table was put on none of the flowers (all 8
//   still stand) and was picked up again. Without 0007 their placement picks a flower's cell and the server refuses it.
// landings (0008): the bot teleported 100 blocks into a closed barrier box on a platform with oak logs outside it, and
//   `collect_block oak_log 1` at once: no path. Within 30 s of the landing the collect must be tried once more (the
//   result says so and takes the 2 s pause longer); the same collect 35 s after the landing must not be.
// The runtime folder is used as built (mineai/fetch-and-patch.sh); Bun from $BUN; their bot data is temporary.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { connect } from './mcp.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    server: { type: 'string', default: path.resolve(import.meta.dirname, '../../server') },
    port: { type: 'string', default: '25565' },
    'listen-port': { type: 'string', default: '25791' },
    flowers: { type: 'string', default: '5' },
    landings: { type: 'string', default: '3' },
    out: { type: 'string' },
  },
});
const tree = positionals[0];
if (!tree) { console.error('usage: node mineai/bench/gates.mjs <runtime dir> [--server <paper dir>] [--flowers n] [--landings n]'); process.exit(2); }
const BUN = process.env.BUN ?? 'bun';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const BOT = `Tst_gate_${Math.random().toString(36).slice(2, 7)}`;

// the server console: a FIFO in the server folder; answers are read from logs/latest.log
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

// one host for the whole check, as the agent starts it (the name in the environment, loopback only)
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
  const r = await client.callTool({ name, arguments: { response_format: 'json', rationale: 'Gate check of the runtime patches.', ...args } }, undefined, { timeout: 600000 });
  return r.structuredContent?.response?.data ?? r.structuredContent;
};
async function act(name, args) {
  const t0 = Date.now();
  let d = await call(name, { ...args, submission_id: `${BOT}-${Date.now()}-${++sid}`, wait_timeout_ms: 120000 });
  while (['pending', 'accepted', 'running'].includes(d?.state)) d = await call('wait_for_action', { action_id: d.actionId ?? d.action_id ?? d.progress?.actionId, timeout_ms: 120000 });
  const o = d?.output?.result ?? d?.result ?? d;
  return { status: o?.status ?? d?.state, error: String(o?.error ?? ''), workstation: o?.workstation ?? null, s: (Date.now() - t0) / 1000 };
}
const rows = { bot: BOT, runtime: tree, flowers: [], landings: [] };
console.log(`bot ${BOT}, runtime ${tree}`);

// 0007: flowers around the bot
const KINDS = ['poppy', 'dandelion', 'cornflower', 'oxeye_daisy', 'red_tulip'];
const RING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
for (let i = 0; i < Number(values.flowers); i++) {
  const [X, Y, Z] = [6000 + i * 40, 200, 6000];
  const kind = KINDS[i % KINDS.length];
  await con(`forceload add ${X} ${Z}`);
  await sleep(1500); // the chunk is generated before anything is set in it
  await con(`fill ${X - 6} ${Y - 1} ${Z - 6} ${X + 6} ${Y - 1} ${Z + 6} minecraft:grass_block`);
  await con(`fill ${X - 6} ${Y} ${Z - 6} ${X + 6} ${Y + 4} ${Z + 6} minecraft:air`);
  for (const [dx, dz] of RING) await con(`setblock ${X + dx} ${Y} ${Z + dz} minecraft:${kind}`);
  await con(`kill @e[type=item,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);
  await con(`clear ${BOT}`);
  await con(`tp ${BOT} ${X + 0.5} ${Y} ${Z + 0.5}`);
  await sleep(3000);
  let set = 0;
  for (const [dx, dz] of RING) if (await isBlock(X + dx, Y, Z + dz, kind) && await isBlock(X + dx, Y - 1, Z + dz, 'grass_block')) set++;
  if (set !== 8) console.log(`flowers ${i + 1}: only ${set} of 8 flowers were set`);
  await con(`give ${BOT} crafting_table 1`); await con(`give ${BOT} oak_planks 3`); await con(`give ${BOT} stick 2`); await con(`give ${BOT} wooden_axe 1`);
  await sleep(1000);
  const r = await act('craft_item', { items: [{ item_name: 'wooden_pickaxe', count: 1 }], temporary_workstation: true });
  let standing = 0;
  for (const [dx, dz] of RING) if (await isBlock(X + dx, Y, Z + dz, kind)) standing++;
  const tablePos = r.workstation?.position;
  const tableLeft = tablePos ? await isBlock(tablePos.x, tablePos.y, tablePos.z, 'crafting_table') : false;
  const pickaxe = /wooden_pickaxe/.test(await con(`data get entity ${BOT} Inventory`, new RegExp(`${BOT} has the following entity data`)) ?? '');
  const pass = r.status === 'succeeded' && standing === 8 && pickaxe && !tableLeft;
  const row = { i, kind, status: r.status, s: r.s, table: tablePos ?? null, recovered: r.workstation?.recovered ?? null, flowersStanding: standing, pickaxeOnServer: pickaxe, pass, error: r.error.slice(0, 200) };
  rows.flowers.push(row);
  console.log(`flowers ${i + 1}: ${pass ? 'PASS' : 'FAIL'} ${kind}, ${r.status} in ${r.s.toFixed(1)} s, table at ${tablePos ? `${tablePos.x} ${tablePos.y} ${tablePos.z}` : '-'} (dx ${tablePos ? tablePos.x - X : '-'}, dz ${tablePos ? tablePos.z - Z : '-'}), ${standing}/8 flowers standing, pickaxe on the server: ${pickaxe}${r.error ? `; ${r.error.slice(0, 160)}` : ''}`);
  await con(`forceload remove ${X} ${Z}`);
}

// 0008: no path right after a landing, and the same long after it
for (let i = 0; i < Number(values.landings); i++) {
  const [X, Y, Z] = [8000 + i * 60, 200, 8000];
  await con(`forceload add ${X - 16} ${Z - 16} ${X + 16} ${Z + 16}`);
  await con(`forceload add ${X + 100} ${Z}`);
  await sleep(2000);
  await con(`fill ${X - 8} ${Y - 1} ${Z - 8} ${X + 8} ${Y - 1} ${Z + 8} minecraft:stone`);
  await con(`fill ${X - 8} ${Y} ${Z - 8} ${X + 8} ${Y + 5} ${Z + 8} minecraft:air`);
  await con(`fill ${X - 1} ${Y - 1} ${Z - 1} ${X + 1} ${Y + 3} ${Z + 1} minecraft:barrier hollow`); // a closed box, inside 1x3x1
  for (const [dx, dz] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) await con(`setblock ${X + dx} ${Y} ${Z + dz} minecraft:oak_log`);
  await con(`fill ${X + 99} ${Y - 1} ${Z - 1} ${X + 101} ${Y - 1} ${Z + 1} minecraft:stone`);
  await con(`clear ${BOT}`);
  // somewhere else first, so the move into the box is a landing like a spread (more than 16 blocks), then into the box
  await con(`tp ${BOT} ${X + 100.5} ${Y} ${Z + 0.5}`);
  await sleep(2000);
  const landed = Date.now();
  await con(`tp ${BOT} ${X + 0.5} ${Y} ${Z + 0.5}`);
  await sleep(1000);
  const soon = await act('collect_block', { block_name: 'oak_log', count: 1 });
  const soonAt = (Date.now() - landed) / 1000;
  const waitTo = landed + 35_000;
  await sleep(Math.max(0, waitTo - Date.now()));
  const late = await act('collect_block', { block_name: 'oak_log', count: 1 });
  const retried = (r) => /tried once more after the chunks around the landing loaded/.test(r.error);
  const pass = soon.status !== 'succeeded' && retried(soon) && late.status !== 'succeeded' && !retried(late);
  rows.landings.push({ i, soon: { ...soon, retried: retried(soon), endedAfterLandingS: soonAt }, late: { ...late, retried: retried(late) }, pass });
  console.log(`landing ${i + 1}: ${pass ? 'PASS' : 'FAIL'} 1 s after landing: ${soon.status} in ${soon.s.toFixed(1)} s, tried again: ${retried(soon)}; 35 s after: ${late.status} in ${late.s.toFixed(1)} s, tried again: ${retried(late)}`);
  console.log(`   first: ${soon.error.slice(0, 220)}`);
  await con(`fill ${X - 1} ${Y - 1} ${Z - 1} ${X + 1} ${Y + 3} ${Z + 1} minecraft:air`);
  await con(`forceload remove ${X - 16} ${Z - 16} ${X + 16} ${Z + 16}`);
  await con(`forceload remove ${X + 100} ${Z}`);
}

await client.close();
await stopHost();
const fp = rows.flowers.filter((r) => r.pass).length;
const lp = rows.landings.filter((r) => r.pass).length;
console.log(`summary: flowers ${fp} of ${rows.flowers.length}, landings ${lp} of ${rows.landings.length}`);
if (values.out) fs.writeFileSync(values.out, `${JSON.stringify(rows, null, 1)}\n`);
process.exitCode = fp === rows.flowers.length && lp === rows.landings.length ? 0 : 1;
