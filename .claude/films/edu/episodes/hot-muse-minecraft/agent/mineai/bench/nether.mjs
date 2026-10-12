// mineai/bench/nether.mjs - the whole path a model takes from a fresh spawn to standing in the Nether and back (ROADMAP
// M8), through a running agent's /mcp with no model and no console help: wood and stone tools, iron (smelted), an iron
// pickaxe and a bucket, a bucket of water, diamonds (deepslate_diamond_ore or diamond_ore, deeper while none is found),
// a diamond pickaxe, obsidian (their collect pours the water onto lava and mines what forms), flint from gravel, flint
// and steel, the nether_portal frame, the portal lit and entered, the state and advice in the Nether, and the way back.
// It plays as a careful player would: each phase tries again a few times with a change (deeper, another spot, a refill)
// and it follows the body's advice for food, the night on the surface, a death's items and a tool about to break.
// Natural: nothing is prepared; the spot is wherever the agent spreads the bot.
//
//   node mineai/bench/nether.mjs <agent URL> [--label nether] [--minutes 110] [--out dir]
//
// Prints a line per step, MILESTONE lines (seconds from start_game) and a RESULT line; writes <out>/<label>.json.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { connect, stateOf, woodOf, positionOf, inventoryOf } from '../../test/e2e/mcp-iron.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { label: { type: 'string', default: 'nether' }, minutes: { type: 'string', default: '110' }, out: { type: 'string', default: '.' } },
});
const url = String(positionals[0] ?? '').replace(/\/+$/, '');
if (!url) { console.error('usage: node mineai/bench/nether.mjs <agent URL> [--label nether] [--minutes 110] [--out dir]'); process.exit(64); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const FINAL = ['confirmed', 'failed', 'cancelled'];

const t0 = Date.now();
const deadline = t0 + Number(values.minutes) * 60_000;
const sec = () => Math.round((Date.now() - t0) / 100) / 10;
const run = { label: values.label, url, started: new Date().toISOString(), game: null, steps: [], milestones: {}, advice: [], deaths: [], dimension: null, ended: null, error: null };
const say = (line) => console.log(`[${values.label} ${sec()} s] ${line}`);
const milestone = (name) => { if (run.milestones[name] == null) { run.milestones[name] = sec(); say(`MILESTONE ${name} at ${sec()} s`); } };

let c;
let s = '';
let data = null;
const inv = () => inventoryOf(s);
const n = (item) => inv()[item] ?? 0;
const dimension = () => ({ Nether: 'the_nether', End: 'the_end' })[/^position -?\d+ -?\d+ -?\d+ in the (\S+?),/m.exec(stateOf(s))?.[1]] ?? /^position -?\d+ -?\d+ -?\d+ in the (\S+?),/m.exec(stateOf(s))?.[1] ?? null;
const food = () => Number(/food (\d+)\/20/.exec(stateOf(s))?.[1] ?? 20);
const time = () => Number(/^time (\d+):/m.exec(stateOf(s))?.[1] ?? 0);

async function call(tool, args = {}) {
  const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 150_000 });
  const text = r.content.map((x) => x.text ?? '').join('\n');
  if (!r.isError || /State \(/.test(text)) { s = text; data = r.structuredContent ?? null; }
  if (/you died at/.test(text) && !run.deaths.some((d) => Math.abs(d.at - sec()) < 5)) { run.deaths.push({ at: sec(), line: /you died[^.;\n]*/.exec(text)?.[0] }); say(`DIED: ${/you died[^.;\n]*/.exec(text)?.[0]}`); }
  if (/your game ended|no game running/i.test(text) && r.isError) throw new Error(`the game ended: ${text.slice(0, 160)}`);
  return { text, isError: Boolean(r.isError), data: r.structuredContent ?? null };
}

let rid = 0;
/** One skill, waited for; returns {ok, line, code}. */
async function step(skill, args = {}, { quiet = false } = {}) {
  if (Date.now() > deadline) throw new Error('out of time');
  const t1 = Date.now();
  let r = await call('play', { skill, args, request_id: `${values.label}-${++rid}` });
  // the caller's step is the last of the call (the check may add crafts before it); its result can come in a later reply
  let st = r.data?.steps?.at(-1) ?? null;
  for (let w = 0; st && !FINAL.includes(st.status) && w < 40; w++) {
    r = await call('get_state');
    st = r.data?.earlier?.find((e) => e.n === st.n && e.skill === skill) ?? st;
  }
  const ok = st?.status === 'confirmed';
  const line = `${skill} ${JSON.stringify(args)}: ${ok ? 'ok' : st?.status ?? 'refused'}: ${String(st?.result ?? st?.why ?? r.text.split('\n')[0]).slice(0, 300)}`;
  run.steps.push({ at: sec(), s: Math.round((Date.now() - t1) / 100) / 10, skill, args, ok, code: st?.code ?? r.data?.code ?? null, line });
  if (!quiet || !ok) say(`${ok ? 'ok    ' : 'FAILED'} ${line.slice(0, 260)}`);
  return { ok, line, code: st?.code ?? r.data?.code ?? null };
}

/** What a careful player does with the body's advice between its own steps (food, a surface night, a death, a tool). */
async function heed() {
  for (const a of data?.advice ?? []) {
    if (!a.hint) continue;
    const p = positionOf(s);
    const surface = p && p.y > 55 && dimension() === 'overworld';
    const take = (a.kind === 'eat' && food() <= 12) || (a.kind === 'hunt' && food() <= 8) || a.kind === 'recover' || a.kind === 'tools'
      || ((a.kind === 'night' || a.kind === 'dusk') && surface) || a.kind === 'danger' || a.kind === 'inventory' || a.kind === 'shield';
    if (!take) continue;
    run.advice.push({ at: sec(), kind: a.kind, text: a.text, skill: a.hint.skill });
    say(`advice taken: ${a.text.slice(0, 140)} -> ${a.hint.skill}`);
    await step(a.hint.skill, a.hint.args ?? {});
    return;
  }
}

/** Try a phase up to `tries` times; `between` changes something before the next try. */
async function phase(name, tries, attempt, between) {
  for (let i = 0; i < tries; i++) {
    if (await attempt(i)) { milestone(name); return true; }
    await heed();
    if (between && i < tries - 1) await between(i);
  }
  say(`phase ${name} not done after ${tries} tries`);
  return false;
}
/**
 * Up to open ground: back where the game began when that is within reach, else straight up where it is; a walk
 * refused for want of ground says which y to send (y is the feet), and that is sent.
 */
async function climbOut() {
  // never up into the night: a shelter where it is until morning (a staging bench, 2026-10-12: a night climb ended in
  // three deaths)
  await call('get_state');
  if (time() >= 12300 && time() < 23300) {
    await step('shelter', {});
    for (let k = 0; k < 20 && time() >= 12300 && time() < 23300; k++) { await sleep(30_000); await call('get_state'); }
  }
  const p = positionOf(s);
  if (!p) return;
  const near = start && Math.hypot(start.x - p.x, start.y - p.y, start.z - p.z) < 250;
  for (const t of [near ? start : null, { x: p.x, y: Math.min(p.y + 180, 120), z: p.z }].filter(Boolean)) {
    let r = await step('go_to', { x: t.x, y: t.y, z: t.z });
    for (let k = 0; k < 3 && !r.ok; k++) {
      const m = /so go_to (-?\d+) (-?\d+) (-?\d+)/.exec(r.line);
      if (!m) break;
      r = await step('go_to', { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) });
    }
    if (r.ok) return;
  }
}
let start = null;
const down = async (dy) => { const p = positionOf(s); if (p) await step('go_to', { x: p.x + 4, y: Math.max(-58, p.y - dy), z: p.z + 4 }); };
const along = async (k) => { const p = positionOf(s); if (p) await step('go_to', { x: p.x + (k % 2 ? 24 : -24), y: p.y, z: p.z + (k % 2 ? 0 : 24) }); };

try {
  c = await connect(url, values.label);
  let r = await call('start_game', { adult: true });
  while (/in the queue/.test(r.text) && Date.now() < deadline) { await sleep(20_000); r = await call('start_game', { adult: true }); }
  if (r.isError) throw new Error(`start_game: ${r.text.slice(0, 200)}`);
  run.game = /game (g\w+)/.exec(r.text)?.[1] ?? null;
  if (/still joining/.test(r.text)) await call('get_state');
  start = positionOf(s);
  say(`game ${run.game} at ${JSON.stringify(start)}, time ${time()}`);
  const wood = woodOf(s);

  await phase('wooden pickaxe', 3, async () => {
    if (n(`${wood}_log`) < 6) await step('collect', { block: `${wood}_log`, n: 8 - n(`${wood}_log`) });
    if (n(`${wood}_log`) + n(`${wood}_planks`) / 4 < 4) return false;
    return (await step('craft_batch', { items: [{ item: `${wood}_planks`, n: 24 }, { item: 'stick', n: 8 }, { item: 'crafting_table', n: 1 }, { item: 'wooden_pickaxe', n: 1 }] })).ok || n('wooden_pickaxe') > 0;
  }, along);
  await phase('stone pickaxe', 3, async () => {
    if (n('cobblestone') < 24) await step('collect', { block: 'stone', n: 26 - n('cobblestone') });
    return (await step('craft_batch', { items: [{ item: 'stone_pickaxe', n: 1 }, { item: 'stone_sword', n: 1 }, { item: 'furnace', n: 1 }] })).ok || n('stone_pickaxe') > 0;
  }, along);
  // 8 iron: a pickaxe (3), a bucket (3), flint and steel (1) and one to spare
  await phase('iron ingots', 6, async () => {
    const need = 8 - n('iron_ingot') - n('raw_iron');
    if (need > 0) await step('collect', { block: n('iron_ore') ? 'iron_ore' : 'iron_ore', n: need });
    if (n('raw_iron') < 1 && n('iron_ingot') < 8) {
      const deep = await step('collect', { block: 'deepslate_iron_ore', n: 8 - n('iron_ingot') - n('raw_iron') }, { quiet: true });
      if (!deep.ok && n('raw_iron') < 1) return false;
    }
    if (!n('coal') && !n('charcoal')) await step('collect', { block: 'coal_ore', n: 3 });
    if (n('raw_iron')) await step('smelt', { item: 'raw_iron', n: n('raw_iron') });
    return n('iron_ingot') >= 7;
  }, (i) => down(14 + i * 4));
  await phase('iron pickaxe', 2, async () => (await step('craft_batch', { items: [{ item: 'iron_pickaxe', n: 1 }, { item: 'bucket', n: 1 }] })).ok || (n('iron_pickaxe') > 0 && n('bucket') + n('water_bucket') > 0));
  await phase('water bucket', 4, async () => n('water_bucket') > 0 || (await step('bucket', { action: 'fill', liquid: 'water' })).ok, async () => { await step('explore', { heading: 90 * (rid % 4), chunks: 1 }); });
  // diamonds: from where it is (their collect searches every loaded column), else lower and along
  await phase('diamonds', 6, async () => {
    for (const block of ['deepslate_diamond_ore', 'diamond_ore']) {
      if (n('diamond') >= 3) break;
      await step('collect', { block, n: 3 - n('diamond') });
    }
    return n('diamond') >= 3;
  }, async (i) => { const p = positionOf(s); if (p && p.y > -50) await down(p.y + 54); else await along(i); });
  await phase('diamond pickaxe', 2, async () => (await step('craft', { item: 'diamond_pickaxe', n: 1 })).ok || n('diamond_pickaxe') > 0);
  // obsidian: blocks to close off lava first, then their collect makes it from lava and the water
  // lava near first (the state's nearby blocks): their collect walks to the nearest lava it knows of, which can be on
  // the surface at night
  // lava listed among the nearby blocks: walk to a few blocks from it (obsidian is made from a pool within 16 blocks)
  const lavaAt = () => { const m = /\blava \d+\+? \(nearest ([\d.]+) away at (-?\d+) (-?\d+) (-?\d+)\)/.exec(stateOf(s)); return m ? { d: Number(m[1]), x: Number(m[2]), y: Number(m[3]), z: Number(m[4]) } : null; };
  await phase('lava in sight', 5, async () => {
    await call('get_state');
    const l = lavaAt();
    if (!l) return false;
    if (l.d > 10) for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if ((await step('go_to', { x: l.x + dx, y: l.y + 1, z: l.z + dz })).ok) break;
    return true;
  }, async (i) => { const p = positionOf(s); if (p && p.y > -50) await down(p.y + 54); else await along(i); });
  await phase('obsidian', 6, async () => {
    if (n('cobblestone') + n('cobbled_deepslate') < 16) await step('collect', { block: positionOf(s)?.y < 0 ? 'deepslate' : 'stone', n: 20 });
    if (!n('water_bucket')) await step('bucket', { action: 'fill', liquid: 'water' });
    if (n('obsidian') < 14) {
      const r = await step('collect', { block: 'obsidian', n: 14 - n('obsidian') });
      // refused for want of a pool near: the reply says where the nearest one is; a few blocks from it, then again
      const pool = /nearest lava pool loaded is at (-?\d+) (-?\d+) (-?\d+)/.exec(r.line);
      if (!r.ok && pool) {
        const [x, y, z] = pool.slice(1).map(Number);
        for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if ((await step('go_to', { x: x + dx, y: y + 1, z: z + dz })).ok) break;
        await step('collect', { block: 'obsidian', n: 14 - n('obsidian') });
      }
    }
    return n('obsidian') >= 14;
  }, async (i) => { if (i % 2) await along(i); });
  await phase('flint', 6, async () => {
    if (!n('flint')) await step('collect', { block: 'gravel', n: 10 });
    // gravel that gave no flint only fills the inventory
    if (n('gravel') && !n('flint')) await step('drop', { item: 'gravel', n: n('gravel') }, { quiet: true });
    return n('flint') > 0;
  }, async (i) => { if (i % 2) await along(i); });
  await phase('flint and steel', 3, async () => (await step('craft', { item: 'flint_and_steel', n: 1 })).ok || n('flint_and_steel') > 0);
  // the frame on open ground: back up where the game began first when deep underground (a frame in rock keeps cells
  // its dig cannot clear), else beside that
  if ((positionOf(s)?.y ?? 99) < 40) await climbOut();
  await phase('portal frame', 6, async () => (await step('build', { blueprint: 'nether_portal', material: 'obsidian' })).ok, async (i) => {
    // a frame that did not work out: its obsidian back first (portal dismantle: its own frame, block by block); a site
    // refused (water or lava near, rock): somewhere else, farther each time, on whatever ground is there
    if (n('obsidian') < 14) await step('portal', { action: 'dismantle' });
    if ((positionOf(s)?.y ?? 99) < 40) { await climbOut(); return; }
    const p = positionOf(s);
    if (!p) return;
    const d = 10 + 5 * i;
    const [dx, dz] = [[d, 0], [0, d], [-d, 0], [0, -d]][i % 4];
    for (const dy of [0, 2, -2, 4, -4]) if ((await step('go_to', { x: p.x + dx, y: p.y + dy, z: p.z + dz })).ok) break;
  });
  await phase('portal lit', 2, async () => (await step('portal', { action: 'light' })).ok);
  await phase('in the Nether', 2, async () => { await step('portal', { action: 'enter', low_supplies: true }); await call('get_state'); return dimension() === 'the_nether'; });
  if (dimension() === 'the_nether') {
    await call('get_state');
    run.nether = { state: stateOf(s).split('\n').slice(0, 4).join(' | '), advice: (data?.advice ?? []).map((a) => a.text) };
    say(`in the Nether: ${run.nether.state.slice(0, 200)}; advice: ${JSON.stringify(run.nether.advice).slice(0, 300)}`);
    // the way back without a pos: the portal it came out of (the body steps out of it first)
    await phase('back in the Overworld', 2, async () => { await step('portal', { action: 'enter' }); await call('get_state'); return dimension() === 'overworld'; });
  }
} catch (err) {
  run.error = String(err?.message ?? err).slice(0, 300);
  say(`stopped: ${run.error}`);
} finally {
  if (c) {
    const r = await call('get_state').catch(() => null);
    run.attribution = r?.data?.attribution ?? null;
    await c.callTool({ name: 'end_game', arguments: {} }).catch(() => {});
    await c.close().catch(() => {});
  }
}
run.seconds = sec();
run.dimension = dimension();
run.inventory = inv();
console.log(`RESULT ${JSON.stringify({ label: run.label, game: run.game, seconds: run.seconds, milestones: run.milestones, deaths: run.deaths.length, steps: run.steps.length, failed: run.steps.filter((x) => !x.ok).length, nether: Boolean(run.milestones['in the Nether']), back: Boolean(run.milestones['back in the Overworld']), error: run.error, attribution: run.attribution })}`);
fs.mkdirSync(values.out, { recursive: true });
fs.writeFileSync(path.join(values.out, `${values.label}.json`), `${JSON.stringify(run, null, 1)}\n`);
