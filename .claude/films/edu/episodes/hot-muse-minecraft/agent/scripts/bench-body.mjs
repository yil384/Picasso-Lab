// scripts/bench-body.mjs - the body's speed on a real server, with no model and no MCP in between: one bot per run
// joins, is spread to a fixed spot through the server console, and plays the iron-pickaxe route from an empty
// inventory with skills only (the same calls as the scripted MCP player). Every call's time, result and inventory
// change goes to a JSONL file, and the summary prints the numbers the roadmap's M2 table asks for: seconds per log,
// per stone and per ore, each craft, the smelt, and the whole route.
//
//   node scripts/bench-body.mjs --port 25571 --console server/console.in --spot 400,-120 --name Tst_body_a1
//   node scripts/bench-body.mjs --probe --spot 400,-120 ...      # where the spot is, what grows there; no actions
//   node scripts/bench-body.mjs --src ../old-agent ...           # the same route on another copy of the body (before/after)
//   node scripts/bench-body.mjs --give stone_axe:1 --plan collect:birch_log:6 ...   # given items (console), other calls
//   node scripts/bench-body.mjs --plan collect:birch_log:6 --summon zombie:4 ...      # a lab test: a zombie next to the
//       bot 4 s into the plan (console); --hunger 6 drains the food bar from the start (the Hunger effect, 6 s)
//
// Strict like the roadmap's harness: a failed call counts and is not retried, except after a mob stopped it (then
// the route fights back, as the scripted MCP player does, and calls it again). Test bots only: the name must start
// with Tst_. Run it against a server you own (offline mode, localhost).

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { values: opt } = parseArgs({
  options: {
    src: { type: 'string', default: path.join(here, '..') },
    host: { type: 'string', default: '127.0.0.1' },
    port: { type: 'string', default: '25565' },
    console: { type: 'string' },
    spot: { type: 'string' },
    name: { type: 'string', default: 'Tst_body_1' },
    out: { type: 'string' },
    probe: { type: 'boolean', default: false },
    give: { type: 'string' },
    summon: { type: 'string' },
    hunger: { type: 'string' },
    plan: { type: 'string' },
    minutes: { type: 'string', default: '12' },
    'no-reflexes': { type: 'boolean', default: false },
  },
});
if (!/^Tst_[A-Za-z0-9_]{1,12}$/.test(opt.name)) throw new Error('--name must be a test bot name: Tst_ and up to 12 letters, digits or _');

const srcDir = path.resolve(opt.src);
const { createBody } = await import(pathToFileURL(path.join(srcDir, 'src/body.js')).href);
const { loadConfig } = await import(pathToFileURL(path.join(srcDir, 'src/config.js')).href);

const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });
const t0 = Date.now();
const sec = (ms = Date.now() - t0) => Math.round(ms / 100) / 10;

/** One line to the server console FIFO, opened non-blocking (fails instead of hanging when no server reads it). */
function consoleLine(line) {
  return new Promise((resolve, reject) => {
    if (!opt.console) { reject(new Error('no --console')); return; }
    fs.open(opt.console, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NONBLOCK, (err, fd) => {
      if (err) { reject(err); return; }
      fs.write(fd, `${line}\n`, (e) => { fs.close(fd, () => {}); if (e) reject(e); else resolve(); });
    });
  });
}

const rows = [];
const out = opt.out ? fs.createWriteStream(opt.out, { flags: 'a' }) : null;
const record = (row) => { rows.push(row); out?.write(`${JSON.stringify({ name: opt.name, src: srcDir, ...row })}\n`); };

const config = loadConfig({ ...process.env, MC_HOST: opt.host, MC_PORT: opt.port, MC_USERNAME: opt.name, MODEL_API_KEY: '' });
// the body's own log rows (attacked, reflex, death, stations_removed...) go into the same file
const bodyOpts = { config, log: { event: (event, data = {}) => record({ kind: 'event', event, ...data }) } };
if (opt['no-reflexes']) bodyOpts.reflexes = false;
if (opt.console) bodyOpts.console = opt.console;
const body = createBody(bodyOpts);
const hard = setTimeout(async () => { console.log('HARD TIMEOUT'); record({ kind: 'end', pass: false, why: 'hard timeout', s: sec() }); await body.close().catch(() => {}); process.exit(3); }, Number(opt.minutes) * 60_000);
await body.ready;
const bot = body.bot;

// fresh start: an empty inventory at a fixed spot (the console spreads the bot onto the ground there)
if (opt.console) {
  await consoleLine(`clear ${opt.name}`).catch(() => {});
  for (const g of (opt.give ?? '').split(',').filter(Boolean)) {
    const [item, n = '1'] = g.split(':');
    if (/^[a-z_]+$/.test(item) && /^\d+$/.test(n)) await consoleLine(`give ${opt.name} ${item} ${n}`).catch(() => {});
  }
  if (opt.spot) {
    const [x, z] = opt.spot.split(',').map(Number);
    const landed = new Promise((r) => { bot.once('forcedMove', r); });
    await consoleLine(`spreadplayers ${x} ${z} 0 2 false ${opt.name}`);
    await Promise.race([landed, pause(8_000)]);
    await Promise.race([Promise.resolve(bot.waitForChunksToLoad?.()).catch(() => {}), pause(10_000)]);
    await pause(1_500);
  }
}
// every block broken (by a skill or by pathfinder on the way): what, the game's dig time at the start, how long it took
let digging = null;
body.on('dig', (d) => {
  const now = Date.now();
  if (digging) record({ kind: 'dig', block: digging.name, predicted: digging.ms, took: now - digging.at, ground: digging.ground, held: digging.held });
  digging = d ? { ...d, at: now, ground: bot.entity?.onGround ?? null, held: bot.heldItem?.name ?? null } : null;
});
const start = bot.entity.position.floored();
record({ kind: 'start', at: start.toString(), s: sec() });
console.log(`[${sec()} s] ${opt.name} at ${start} (${path.relative(process.cwd(), srcDir) || '.'})`);

if (opt.probe) {
  const s = body.snapshot();
  const logs = s.nearbyBlocks.filter((b) => b.name.endsWith('_log'));
  const under = bot.blockAt(start.offset(0, -1, 0))?.name;
  const water = s.nearbyBlocks.find((b) => b.name === 'water');
  console.log(`PROBE ${opt.spot} -> ${start} on ${under}; logs: ${logs.map((b) => `${b.name} ${b.count} @${b.distance}`).join(', ') || 'none'}; stone: ${s.nearbyBlocks.find((b) => b.name === 'stone')?.distance ?? '-'}; water ${water ? water.distance : '-'}`);
  record({ kind: 'probe', at: start.toString(), under, logs, water: water?.distance ?? null });
  clearTimeout(hard);
  await body.close();
  process.exit(0);
}

let calls = 0;
const inv = () => body.inventory();
async function step(tool, args, { tries = 4 } = {}) {
  for (let i = 0; i < tries; i++) {
    calls += 1;
    const r = await body.run(tool, args);
    const line = `${tool} ${JSON.stringify(args)} -> ${r.ok ? 'ok' : 'FAIL'} ${sec(r.ms)} s: ${r.result}`;
    console.log(`[${sec()} s] ${line.slice(0, 260)}`);
    record({ kind: 'step', tool, args, ok: r.ok, ms: r.ms, result: r.result.slice(0, 600), delta: r.delta, s: sec(), phases: r.phases ?? null });
    const mob = /a (\w+) is attacking you/.exec(r.result);
    if (!r.ok && mob) {
      for (let k = 0; k < 3; k++) {
        calls += 1;
        const a = await body.run('attack', { target: mob[1] });
        console.log(`[${sec()} s]   attack ${mob[1]} -> ${a.ok ? 'ok' : 'FAIL'}: ${a.result.slice(0, 160)}`);
        record({ kind: 'step', tool: 'attack', args: { target: mob[1] }, ok: a.ok, ms: a.ms, result: a.result.slice(0, 600), delta: a.delta, s: sec(), fight: true });
        if (!/is attacking you/.test(a.result)) break;
      }
      continue;
    }
    return r;
  }
  return { ok: false, result: 'gave up' };
}

// lab tests (prepared): a mob next to the bot a few seconds into the calls, hunger from the start
if (opt.summon && opt.console) {
  const [mob, after = '4'] = opt.summon.split(':');
  if (/^[a-z_]+$/.test(mob) && /^\d+$/.test(after)) {
    setTimeout(() => {
      consoleLine(`execute at ${opt.name} run summon ${mob} ~2 ~ ~`).catch(() => {});
      record({ kind: 'lab', summon: mob, s: sec() });
    }, Number(after) * 1000).unref();
  }
}
if (opt.hunger && opt.console && /^\d+$/.test(opt.hunger)) {
  await consoleLine(`effect give ${opt.name} hunger ${opt.hunger} 100`).catch(() => {});
  record({ kind: 'lab', hunger: Number(opt.hunger), s: sec() });
}

if (opt.plan) {
  // a list of calls instead of the route: tool:arg:arg,... (collect:stone:12, craft:stick:4, smelt:raw_iron:3, go_to:x:y:z)
  const keys = { collect: ['block', 'n'], craft: ['item', 'n'], smelt: ['item', 'n'], go_to: ['x', 'y', 'z'], attack: ['target'], eat: [] };
  for (const c of opt.plan.split(',')) {
    const [tool, ...vals] = c.split(':');
    const args = Object.fromEntries((keys[tool] ?? []).map((k, i) => [k, /^-?\d+$/.test(vals[i]) ? Number(vals[i]) : vals[i]]));
    await step(tool, args, { tries: 1 });
  }
  console.log(`PLAN DONE: ${sec()} s, ${calls} calls; ${JSON.stringify(inv())}`);
  record({ kind: 'end', pass: true, s: sec(), calls, failed: rows.filter((r) => r.kind === 'step' && !r.ok).length, inventory: inv(), plan: opt.plan });
  clearTimeout(hard);
  await body.close();
  await pause(500);
  out?.end();
  process.exit(0);
}

const wood = (body.snapshot().nearbyBlocks.find((b) => b.name.endsWith('_log'))?.name ?? 'oak_log').replace(/_log$/, '');
await step('collect', { block: `${wood}_log`, n: 6 });
const woods = Object.keys(inv()).filter((k) => k.endsWith('_log'));
const plank = `${(woods[0] ?? `${wood}_log`).replace(/_log$/, '')}_planks`;
await step('craft', { item: plank, n: 20 });
await step('craft', { item: 'stick', n: 8 });
await step('craft', { item: 'crafting_table', n: 1 });
await step('craft', { item: 'wooden_pickaxe', n: 1 });
await step('collect', { block: 'stone', n: 12 });
await step('craft', { item: 'stone_pickaxe', n: 1 });
await step('craft', { item: 'furnace', n: 1 });
for (let i = 0; i < 6 && (inv().raw_iron ?? 0) < 3; i++) {
  const r = await step('collect', { block: 'iron_ore', n: 3 - (inv().raw_iron ?? 0) });
  if (!r.ok && (inv().raw_iron ?? 0) < 3) {
    const p = bot.entity.position.floored();
    await step('go_to', { x: p.x + 3, y: p.y - 14, z: p.z + 3 });
  }
}
if (!inv().coal) await step('collect', { block: 'coal_ore', n: 2 });
await step('smelt', { item: 'raw_iron', n: 3 });
await step('craft', { item: 'iron_pickaxe', n: 1 });
const pass = (inv().iron_pickaxe ?? 0) >= 1;
const total = sec();
const failed = rows.filter((r) => r.kind === 'step' && !r.ok).length;
console.log(`RESULT ${pass ? 'PASS' : 'FAIL'}: ${total} s, ${calls} calls, ${failed} failed; ${JSON.stringify(inv())}`);
record({ kind: 'end', pass, s: total, calls, failed, inventory: inv() });
clearTimeout(hard);
await body.close();
await pause(500);
out?.end();
process.exit(pass ? 0 : 2);
