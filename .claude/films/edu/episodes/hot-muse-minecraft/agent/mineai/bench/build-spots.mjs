// build-spots.mjs - `build` on rough ground (the Muse re-test on staging, game g42b738, 2026-10-08: three hut_3x3 and a
// shelter left 1-3 cells each, "search timed out after 2000 ms compute"), on this Mac's Paper (seed 71811045, as staging)
// with one host of the runtime, through their MCP tools (no model, test bots Tst_bs_*). Every try starts from the same
// terrain (the spot is saved once with /clone to a stash 20,000 blocks east and cloned back before each try), the
// same inventory and the same heading; the cells are the ones our gateway sends (src/mineai/skills.js blueprintCells);
// a structure counts complete only when the server's own record says every cell holds its block (`execute if block`).
//
//   BUN=<bun> node mineai/bench/build-spots.mjs <runtime dir> [--server <paper dir>] [--port 25565] [--tries 2]
//     [--only muse-f1,hill-up,...] [--blueprints hut_3x3,shelter] [--retry] [--out file.json]
//
// Spots (the terrain kinds of the report):
//   muse-f1, muse-f3  the report's own spot (-178, 62, 56): an iron cluster in a gravel blob in stone, with the tunnels
//                     and shafts the Muse game dug there (staging's world after the game, its huts left out), the bot
//                     where F1 (facing south) and F3 (facing west) started
//   cave-in, cave-side  a cave mouth: a 3x3 tunnel 7 deep into a stone hillside from a gully; the bot at the mouth
//                     facing in, and facing along the hillside (half the hut in rock)
//   hill-up, hill-down  uneven ground: a stone slope of 5-7 blocks over 8; facing uphill (the hut cut into it) and
//                     downhill (walls over a drop of 2-4)
//   pond-bank, pond-wade  a pond edge: a pond in flat grass, water flush with the ground, 1 deep (2 in its middle);
//                     the bot on the bank facing the water, and standing in the water
// --retry: after an incomplete try, `build` again from where the bot stands, turned 90 degrees, as Muse retried; the
//   gateway now sends the first call's cells again (the same site), so the retry completes the structure or not.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { connect } from './mcp.mjs';
import { fromTheirs, blueprintCells } from '../../src/mineai/skills.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    server: { type: 'string', default: path.resolve(import.meta.dirname, '../../server') },
    port: { type: 'string', default: '25565' },
    'listen-port': { type: 'string', default: '25795' },
    tries: { type: 'string', default: '2' },
    only: { type: 'string', default: 'muse-f1,muse-f3,cave-in,cave-side,hill-up,hill-down,pond-bank,pond-wade' },
    blueprints: { type: 'string', default: 'hut_3x3,shelter' },
    retry: { type: 'boolean', default: false },
    out: { type: 'string' },
  },
});
const tree = positionals[0];
if (!tree) { console.error('usage: BUN=<bun> node mineai/bench/build-spots.mjs <runtime dir> [--server <paper dir>] [--tries n] [--only a,b] [--retry]'); process.exit(2); }
const BUN = process.env.BUN ?? 'bun';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// eslint-disable-next-line no-control-regex
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const BOT = `Tst_bs_${Math.random().toString(36).slice(2, 7)}`;

const LOG = path.join(values.server, 'logs', 'latest.log');
async function con(line, want = null, ms = 4000) {
  const from = fs.statSync(LOG).size;
  fs.writeFileSync(path.join(values.server, 'console.in'), `${line}\n`);
  if (!want) { await sleep(120); return null; }
  for (const until = Date.now() + ms; Date.now() < until;) {
    await sleep(50);
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
/** The server's own answer: does the cell hold the block (air: any air, cave air included)? */
async function holds(x, y, z, name) {
  const what = name === 'air' ? '#minecraft:air' : name.startsWith('#') ? name : `minecraft:${name}`;
  return /Test passed/.test(await con(`execute if block ${x} ${y} ${z} ${what}`, /Test (passed|failed)/) ?? '');
}

// ---------------------------------------------------------------------------------------------------------------
// The spots. box: [x0, y0, z0, x1, y1, z1], saved and restored around every try; setup: what makes the spot from the
// natural terrain once, before it is saved; start: the bot's feet and Minecraft yaw (0 south, 90 west, 180 north,
// -90 east).

// staging's air in the box around the report's spot after game g42b738, as runs along x [x0, y, z, x1] (read from
// staging's region file r.-1.0.mca; its dirt, the bot's scaffolding, counted as air; its cobblestone, the huts, left
// out, so the natural block stays there)
const MUSE_AIR = [[-179, 56, 44, -177], [-180, 56, 45, -178], [-179, 56, 46, -178], [-180, 56, 47, -179], [-188, 57, 44, -186], [-179, 57, 44, -177], [-180, 57, 45, -178], [-179, 57, 46, -178], [-180, 57, 47, -179], [-188, 58, 44, -186], [-179, 58, 44, -177], [-180, 58, 45, -178], [-179, 58, 46, -178], [-180, 58, 47, -179], [-179, 59, 44, -177], [-180, 59, 45, -178], [-179, 59, 46, -178], [-180, 59, 47, -179], [-179, 60, 44, -177], [-180, 60, 45, -178], [-179, 60, 46, -178], [-180, 60, 47, -179], [-177, 60, 52, -177], [-177, 60, 53, -177], [-177, 60, 55, -175], [-178, 60, 57, -177], [-179, 60, 58, -178], [-179, 61, 44, -177], [-179, 61, 45, -178], [-179, 61, 46, -178], [-180, 61, 47, -179], [-177, 61, 52, -176], [-177, 61, 53, -177], [-177, 61, 55, -175], [-178, 61, 56, -178], [-178, 61, 57, -177], [-179, 61, 58, -178], [-179, 62, 44, -177], [-179, 62, 45, -178], [-179, 62, 46, -178], [-180, 62, 47, -179], [-177, 62, 52, -176], [-175, 62, 55, -175], [-175, 62, 56, -175], [-177, 62, 57, -175], [-179, 62, 58, -179], [-179, 63, 44, -177], [-179, 63, 45, -178], [-178, 63, 52, -176], [-177, 63, 53, -176], [-178, 63, 54, -176], [-178, 63, 55, -175], [-175, 63, 56, -175], [-177, 63, 57, -175], [-179, 63, 58, -179], [-179, 64, 52, -177], [-177, 64, 53, -176], [-178, 64, 54, -176], [-178, 64, 55, -175], [-175, 64, 56, -175], [-179, 64, 57, -179], [-179, 64, 58, -179], [-179, 64, 59, -179], [-180, 65, 52, -178], [-176, 65, 54, -176], [-177, 65, 55, -175], [-178, 65, 56, -176], [-179, 65, 58, -179], [-179, 65, 59, -179], [-179, 65, 60, -179], [-181, 66, 52, -179], [-179, 66, 59, -179], [-179, 66, 60, -179], [-179, 66, 61, -179], [-181, 67, 52, -180], [-179, 67, 60, -179], [-179, 67, 61, -179], [-179, 67, 62, -179], [-181, 68, 52, -181], [-179, 68, 61, -179], [-179, 68, 62, -179], [-179, 68, 63, -179], [-181, 69, 52, -181], [-179, 69, 62, -179], [-179, 69, 63, -179], [-179, 69, 64, -179], [-181, 70, 52, -181], [-179, 70, 63, -179], [-180, 70, 64, -179], [-179, 70, 65, -179], [-181, 71, 52, -181], [-181, 71, 64, -179], [-179, 71, 65, -179], [-179, 71, 66, -179], [-181, 72, 52, -181], [-182, 72, 64, -180], [-179, 72, 65, -179], [-179, 72, 66, -179]];

const SITES = {
  muse: { box: [-190, 54, 42, -166, 74, 68], setup: MUSE_AIR.map(([x0, y, z, x1]) => `fill ${x0} ${y} ${z} ${x1} ${y} ${z} minecraft:air`) },
  // a stone hillside: a gully at x 2144-2145 between slopes of 5-7 blocks over 8; the cave: a 3x3 tunnel 7 deep west
  // into the slope from the gully's floor (y 63)
  hill: { box: [2128, 58, 2014, 2156, 78, 2042], setup: ['fill 2137 64 2024 2143 66 2026 minecraft:air'] },
  // flat grass at y 65; the pond: water in the grass layer, 1 deep, 2 deep in one corner (away from both huts)
  pond: {
    box: [1228, 60, -868, 1252, 72, -848],
    setup: ['fill 1240 66 -862 1247 68 -854 minecraft:air', 'fill 1240 65 -861 1246 65 -855 minecraft:water', 'fill 1245 64 -861 1246 64 -860 minecraft:water'],
  },
};
const SPOTS = {
  'muse-f1': { site: 'muse', feet: [-177, 61, 52], yaw: 0 },
  'muse-f3': { site: 'muse', feet: [-175, 62, 57], yaw: 90 },
  'cave-in': { site: 'hill', feet: [2144, 64, 2025], yaw: 90 },
  'cave-side': { site: 'hill', feet: [2144, 64, 2025], yaw: 0 },
  'hill-up': { site: 'hill', feet: [2137, 65, 2032], yaw: -90 },
  'hill-down': { site: 'hill', feet: [2142, 69, 2031], yaw: -90 },
  'pond-bank': { site: 'pond', feet: [1239, 66, -858], yaw: -90 },
  'pond-wade': { site: 'pond', feet: [1241, 65, -858], yaw: -90 },
};
const STASH_DX = 20000;
const shifted = (b) => [b[0] + STASH_DX, b[1], b[2], b[3] + STASH_DX, b[4], b[5]];
const area = (b) => `${b[0]} ${b[2]} ${b[3]} ${b[5]}`;

// ---------------------------------------------------------------------------------------------------------------
// One host of the runtime, as the agent starts it

const LP = Number(values['listen-port']);
let host = null;
let client = null;
let hostLog = '';
let restarts = 0;
async function startHost() {
  await con(`whitelist add ${BOT}`);
  host = spawn(BUN, ['src/server/host.ts', '--minecraft-port', values.port, '--listen-host', '127.0.0.1', '--listen-port', String(LP),
    '--bot-data-persistence', 'temporary'], { cwd: tree, env: { ...process.env, MINEAI_USERNAME: BOT }, stdio: ['ignore', 'pipe', 'pipe'] });
  host.stdout.on('data', (b) => { hostLog = (hostLog + b).slice(-20000); });
  host.stderr.on('data', (b) => { hostLog = (hostLog + b).slice(-20000); });
  for (let t = 0; ; t++) {
    try {
      const h = await (await fetch(`http://127.0.0.1:${LP}/health`, { signal: AbortSignal.timeout(2000) })).json();
      if (JSON.stringify(h).includes(BOT) && /connected/.test(JSON.stringify(h))) break;
    } catch { /* not yet */ }
    if (t > 120 || host.exitCode !== null) throw new Error(`the host did not get ready:\n${hostLog.slice(-2000)}`);
    await sleep(500);
  }
  client = await connect(`http://127.0.0.1:${LP}/mcp`);
}
async function stopHost() {
  await client?.close().catch(() => {});
  if (host && host.exitCode === null) {
    host.kill('SIGTERM');
    for (let i = 0; i < 40 && host.exitCode === null; i++) await sleep(250);
    if (host.exitCode === null) host.kill('SIGKILL');
  }
  await sleep(500);
  await con(`whitelist remove ${BOT}`);
}
await startHost();
let sid = 0;
const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: { response_format: 'json', rationale: 'Bench of builds on rough ground.', ...args } }, undefined, { timeout: 900000 });
  return r.structuredContent?.response?.data ?? r.structuredContent;
};
async function where() {
  const d = await call('view_status', {});
  const p = d?.result?.situation?.position ?? null;
  return { pos: p, heading: p?.headingDegrees ?? 0 };
}
/** One action to its end; their output and our reply's words (src/mineai/skills.js fromTheirs). */
async function act(tool, args, note = '') {
  const t0 = Date.now();
  let d = await call(tool, { ...args, submission_id: `${BOT}-${Date.now()}-${++sid}`, wait_timeout_ms: 120000 });
  while (['pending', 'accepted', 'running'].includes(d?.state)) d = await call('wait_for_action', { action_id: d.actionId, timeout_ms: 120000 });
  const output = d?.output ?? { result: d?.result ?? d };
  const ours = fromTheirs(tool, output, { call: { tool, args } });
  return { s: (Date.now() - t0) / 1000, status: output?.result?.status ?? d?.state, error: String(output?.result?.error ?? d?.error ?? ''), structure: output?.result?.structure ?? null, reply: `${ours.ok ? 'ok' : 'failed'}: ${ours.result}${note}` };
}

// ---------------------------------------------------------------------------------------------------------------

// a site is saved once, ever: a marker block above its stash says so, so a later run restores the same terrain
const marker = (site) => { const b = shifted(site.box); return [b[0], b[4] + 1, b[2]]; };
const saved = new Set();
const used = new Set();
async function restore(siteName) {
  const site = SITES[siteName];
  const r = await con(`clone ${shifted(site.box).join(' ')} ${site.box.slice(0, 3).join(' ')} replace force`, /cloned|Could not|too many|not loaded/i);
  if (!/cloned/i.test(r ?? '')) throw new Error(`could not restore ${siteName}: ${r}`);
}
async function prepare(siteName) {
  const site = SITES[siteName];
  used.add(siteName);
  await con(`forceload add ${area(site.box)}`);
  await con(`forceload add ${area(shifted(site.box))}`);
  await sleep(4000);
  if (!saved.has(siteName) && await holds(...marker(site), 'emerald_block')) saved.add(siteName);
  if (saved.has(siteName)) await restore(siteName);
  else {
    for (const line of site.setup) await con(line);
    await sleep(2500); // gravel above a carved cell falls, water spreads: let it settle before the save
    const r = await con(`clone ${site.box.join(' ')} ${shifted(site.box).slice(0, 3).join(' ')} replace force`, /cloned|Could not|too many|not loaded/i);
    if (!/cloned/i.test(r ?? '')) throw new Error(`could not save ${siteName}: ${r}`);
    await con(`setblock ${marker(site).join(' ')} minecraft:emerald_block`);
    saved.add(siteName);
  }
  const b = site.box;
  const sel = `x=${b[0]},y=${b[1]},z=${b[2]},dx=${b[3] - b[0]},dy=${b[4] - b[1]},dz=${b[5] - b[2]}`;
  await con(`kill @e[type=item,${sel}]`);
  await con(`kill @e[type=!player,type=!item,${sel}]`);
  await sleep(1500);
}

const AUDIT = (st) => st && { cells: st.cells, correct: st.correct, placed: st.placed, dug: st.dug, wrong: st.wrong, passes: st.passes, left: (st.left ?? []).map((g) => ({ reason: g.reason, count: g.count, named: g.named })), ...(st.kept ? { kept: st.kept, water: st.water, supports: st.supports } : {}) };
const rows = { bot: BOT, runtime: tree, at: new Date().toISOString(), tries: [] };
const ONLY = values.only.split(',');
const BPS = values.blueprints.split(',');

/**
 * The server's record of every cell: exact (the block asked for), water (a cell asked to be clear that holds water),
 * solid (a cell asked for the material that holds another solid block: the stone or gravel the build kept), wrong.
 * Complete: no cell wrong.
 */
async function serverCheck(cells) {
  let ok = 0;
  const water = [];
  const solid = [];
  const wrong = [];
  for (const c of cells) {
    const at = `${c.x},${c.y},${c.z}`;
    if (await holds(c.x, c.y, c.z, c.block_name)) ok += 1;
    else if (c.block_name === 'air' && await holds(c.x, c.y, c.z, 'water')) water.push(at);
    else if (c.block_name !== 'air' && !(await holds(c.x, c.y, c.z, 'air')) && !(await holds(c.x, c.y, c.z, 'water')) && !(await holds(c.x, c.y, c.z, '#minecraft:replaceable'))) solid.push(at);
    else wrong.push(at);
  }
  return { ok, of: cells.length, water, solid, wrong };
}
/**
 * Complete: every cell as asked on the server, or left as the build's own audit says it left it on purpose (solid
 * ground kept, water in a cell to clear; patch 0011). A runtime without those (before 0011) is complete only exact.
 */
function done(check, st) {
  const kept = (st?.kept ?? []).reduce((n, k) => n + k.count, 0);
  return check.wrong.length === 0 && check.solid.length <= kept && check.water.length <= (st?.water ?? 0);
}

for (const bp of BPS) {
  for (const name of ONLY) {
    const spot = SPOTS[name];
    if (!spot) { console.error(`no spot ${name}`); continue; }
    for (let i = 0; i < Number(values.tries); i++) {
      try {
        await prepare(spot.site);
        await con(`clear ${BOT}`);
        await con(`effect clear ${BOT}`);
        const [fx, fy, fz] = spot.feet;
        await con(`tp ${BOT} ${fx + 0.5} ${fy} ${fz + 0.5} ${spot.yaw} 0`);
        await sleep(2500);
        for (const [item, n] of [['cobblestone', 64], ['iron_pickaxe', 1], ['iron_shovel', 1], ['dirt', 16]]) await con(`give ${BOT} ${item} ${n}`);
        await sleep(1500);
        const { pos, heading } = await where();
        const feet = { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) };
        const { cells, facing } = blueprintCells(bp, 'cobblestone', feet, heading);
        const r = await act('build_structure', { blocks: cells, remove_wrong_blocks: true }, ` (built facing ${facing})`);
        let check = await serverCheck(cells);
        const row = { spot: name, blueprint: bp, i, feet, facing, s: r.s, status: r.status, complete: done(check, r.structure), exact: check.ok === check.of, server: check, audit: AUDIT(r.structure), error: r.error, reply: r.reply };
        if (values.retry && !row.complete) {
          // Muse's retry: the bot where the first build left it, turned a quarter; the gateway sends the same cells again
          const again = await where();
          await con(`tp ${BOT} ${again.pos.x} ${again.pos.y} ${again.pos.z} ${spot.yaw + 90} 0`);
          await sleep(1500);
          const r2 = await act('build_structure', { blocks: cells, remove_wrong_blocks: true }, ` (continued the ${bp} facing ${facing})`);
          check = await serverCheck(cells);
          Object.assign(row, { retry: { s: r2.s, status: r2.status, complete: done(check, r2.structure), exact: check.ok === check.of, server: check, audit: AUDIT(r2.structure), error: r2.error, reply: r2.reply } });
        }
        rows.tries.push(row);
        const after = row.retry ? `; retry: ${row.retry.complete ? 'COMPLETE' : 'incomplete'} ${row.retry.server.ok}/${row.retry.server.of} in ${row.retry.s.toFixed(1)} s` : '';
        const other = [check.solid.length ? `${check.solid.length} holding solid ground` : '', check.water.length ? `${check.water.length} water` : ''].filter(Boolean).join(', ');
        console.log(`${name.padEnd(10)} ${bp.padEnd(8)} #${i + 1}: ${row.complete ? 'COMPLETE  ' : 'incomplete'} ${check.ok}/${check.of} exact${other ? ` (${other})` : ''} on the server, ${r.s.toFixed(1)} s, placed ${r.structure?.placed ?? '-'}, dug ${r.structure?.dug ?? '-'}${r.structure?.supports?.length ? `, supports ${r.structure.supports.map((x) => `${x.count} ${x.block}`).join(', ')}` : ''}${after}`);
        if (!row.complete || row.retry || other) console.log(`    ${r.reply.slice(0, 900)}`);
        if (row.retry && !row.retry.complete) console.log(`    retry: ${row.retry.reply.slice(0, 600)}`);
      } catch (err) {
        const msg = String(err?.message ?? err).slice(0, 400);
        rows.tries.push({ spot: name, blueprint: bp, i, error: msg });
        console.log(`${name.padEnd(10)} ${bp.padEnd(8)} #${i + 1}: ERROR ${msg}`);
        if (/RUNTIME_UNRESPONSIVE|RUNTIME_EXITED|fetch failed|ECONNREFUSED|requires a restart/.test(msg)) {
          // the runtime stopped (their watchdog): counted, and a new host for the next try
          restarts += 1;
          rows.tries.at(-1).runtimeStopped = true;
          await stopHost();
          await startHost();
        }
      }
    }
  }
}

const sum = {};
for (const t of rows.tries) {
  const k = `${t.blueprint} ${t.spot}`;
  sum[k] ??= { complete: 0, exact: 0, retried: 0, of: 0, s: [] };
  sum[k].of += 1;
  if (t.complete) sum[k].complete += 1;
  if (t.exact) sum[k].exact += 1;
  if (t.complete || t.retry?.complete) sum[k].retried += 1;
  if (Number.isFinite(t.s)) sum[k].s.push(t.s);
}
console.log('\nsummary (complete on the server, every cell its block or solid ground kept or water / tries; every cell exactly its block; median s):');
for (const [k, v] of Object.entries(sum)) {
  const s = v.s.sort((a, b) => a - b);
  console.log(`  ${k.padEnd(22)} ${v.complete} of ${v.of} (exact ${v.exact})${values.retry ? `, ${v.retried} of ${v.of} with a retry` : ''}; ${s.length ? s[Math.floor(s.length / 2)].toFixed(1) : '-'} s`);
}
const tot = rows.tries.filter((t) => 'complete' in t);
console.log(`  all: ${tot.filter((t) => t.complete).length} of ${rows.tries.length} (exact ${tot.filter((t) => t.exact).length})${values.retry ? `, ${tot.filter((t) => t.complete || t.retry?.complete).length} with a retry` : ''}`);
rows.summary = sum;
rows.runtimeStops = restarts;
console.log(`  runtime stops (their watchdog): ${restarts}`);
await stopHost();
// the world is left as saved: each site used gets its terrain back
for (const name of used) {
  const s = SITES[name];
  await restore(name).catch((err) => console.error(String(err?.message ?? err)));
  await sleep(500);
  await con(`forceload remove ${area(s.box)}`);
  await con(`forceload remove ${area(shifted(s.box))}`);
}
if (values.out) fs.writeFileSync(values.out, `${JSON.stringify(rows, null, 1)}\n`);
