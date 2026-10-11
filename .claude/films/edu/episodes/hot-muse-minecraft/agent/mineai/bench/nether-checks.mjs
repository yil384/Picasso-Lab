// mineai/bench/nether-checks.mjs - PREPARED checks (items and places given on the server console, never natural
// evidence) of the guards and fixed paths of M8a on staging, through its /mcp like a model: two bots get obsidian,
// flint and steel and food on the console; then
//   1. at the world spawn: build nether_portal is refused (the spawn guard);
//   2. away from it, with the other bot beside it: refused (another player within 8 blocks);
//   3. alone, with water put next to the frame's site: refused (the site check), then a new site 30 blocks on: built;
//   4. collect obsidian with no lava near: refused (code LAVA);
//   5. light, enter, get_state in the Nether (the state and the advice), back without a pos (the step-out);
//   6. portal dismantle: its own frame's obsidian back.
//
//   node mineai/bench/nether-checks.mjs <agent URL> --console /console/console.in --agent-log <run-serve-*.jsonl>
//        [--at "x z"] [--away "x z"]   (dry spots: --at new for each run)
//
// Prints a CHECK line per check (ok or FAILED, with the reply) and a RESULT line.

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { connect, stateOf, positionOf } from '../../test/e2e/mcp-iron.mjs';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { console: { type: 'string' }, 'agent-log': { type: 'string' }, at: { type: 'string', default: '-9184 22173' }, away: { type: 'string', default: '-16971 16971' } } });
// a dry spot for the checks, new for each run (a run leaves its water and frames there), and one for the other bot to leave to
const [AX, AZ] = values.at.split(/\s+/).map(Number);
const [BX, BZ] = values.away.split(/\s+/).map(Number);
const url = String(positionals[0] ?? '').replace(/\/+$/, '');
if (!url || !values.console || !values['agent-log']) { console.error('usage: node mineai/bench/nether-checks.mjs <agent URL> --console <fifo> --agent-log <jsonl>'); process.exit(64); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const con = (line) => fs.writeFileSync(values.console, `${line}\n`);
const results = [];
const check = (name, ok, line) => { results.push({ name, ok }); console.log(`CHECK ${ok ? 'ok    ' : 'FAILED'} ${name}: ${String(line).replace(/\s+/g, ' ').slice(0, 260)}`); };

async function player(label) {
  const c = await connect(url, label);
  const t = async (tool, args = {}) => { const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 150_000 }); return { text: r.content.map((x) => x.text).join('\n'), data: r.structuredContent }; };
  let r = await t('start_game', { adult: true });
  const game = /game (g\w+)/.exec(r.text)?.[1];
  if (/still joining/.test(r.text)) r = await t('get_state');
  let name = null;
  for (let i = 0; i < 20 && !name; i++) {
    const rows = fs.readFileSync(values['agent-log'], 'utf8').split('\n').filter((l) => l.includes('"bot_name"') && l.includes(game));
    name = rows.length ? JSON.parse(rows.at(-1)).username : null;
    if (!name) await sleep(500);
  }
  const play = async (skill, args = {}) => {
    let x = await t('play', { skill, args });
    let st = x.data?.steps?.at(-1);
    for (let w = 0; st && !['confirmed', 'failed', 'cancelled'].includes(st.status) && w < 30; w++) { x = await t('get_state'); st = x.data?.earlier?.find((e) => e.n === st.n && e.skill === skill) ?? st; }
    return { ok: st?.status === 'confirmed', code: st?.code ?? x.data?.code ?? null, line: String(st?.result ?? st?.why ?? x.text.split('\n')[0]) };
  };
  return { c, t, play, game, name };
}

const a = await player('checks-a');
const b = await player('checks-b');
try {
  for (const p of [a, b]) for (const g of ['obsidian 28', 'flint_and_steel 1', 'cooked_beef 16', 'cobblestone 32', 'diamond_pickaxe 1', 'water_bucket 1']) con(`give ${p.name} ${g}`);
  con('time set day');
  await sleep(3000);
  // 1. at the world spawn
  // the console's own place is the world spawn: ~ ~ is there
  con(`spreadplayers ~ ~ 0 4 false ${a.name}`);
  await sleep(3000);
  let r = await a.play('build', { blueprint: 'nether_portal', material: 'obsidian' });
  check('spawn guard: build nether_portal at the world spawn is refused', !r.ok && /world spawn/.test(r.line), r.line);
  // 2. another bot beside it, far from the spawn
  // one at a time (two players cannot share a range-1 spread)
  con(`spreadplayers ${AX} ${AZ} 0 8 false ${a.name}`);
  await sleep(4000);
  con(`tp ${b.name} ${a.name}`);
  await sleep(3000);
  r = await a.play('build', { blueprint: 'nether_portal', material: 'obsidian' });
  check('player guard: build nether_portal with another bot beside it is refused', !r.ok && /another player/.test(r.line), r.line);
  // 3. b leaves; water at the site; then a new site
  con(`spreadplayers ${BX} ${BZ} 0 8 false ${b.name}`);
  await sleep(3000);
  // water in the ground two blocks off each corner: within 3 blocks of the frame whichever way the bot faces
  for (const [dx, dz] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) con(`execute at ${a.name} run setblock ~${dx} ~-1 ~${dz} water`);
  await sleep(1500);
  r = await a.play('build', { blueprint: 'nether_portal', material: 'obsidian' });
  check('site check: water next to the frame refuses the build', !r.ok && /water at .* is next to where the portal frame would stand/.test(r.line), r.line);
  const p = positionOf((await a.t('get_state')).text);
  // 30 blocks on, on whatever ground is there (a few headings and heights, as a player would try)
  let walk = { ok: false, line: 'no walk' };
  for (const [dx, dz] of [[30, 0], [0, 30], [-30, 0], [0, -30]]) {
    for (const dy of [0, 3, -3, 6, -6]) { walk = await a.play('go_to', { x: p.x + dx, y: p.y + dy, z: p.z + dz }); if (walk.ok) break; }
    if (walk.ok) break;
  }
  r = await a.play('build', { blueprint: 'nether_portal', material: 'obsidian' });
  check('a new site 30 blocks on: the frame is built there, not the refused one continued', walk.ok && r.ok && !/continued/.test(r.line) && Number(/placed (\d+) obsidian/.exec(r.line)?.[1]) > 0, `${walk.line}; ${r.line}`);
  // 4. no lava near
  const lava = /\blava \d+\+? \(nearest ([\d.]+) away/.exec(stateOf((await a.t('get_state')).text));
  r = await a.play('collect', { block: 'obsidian', n: 2 });
  check('collect obsidian: refused with a lit portal or a frame near, or with no lava near (LAVA)', !r.ok && (r.code === 'LAVA' || /portal|obsidian/.test(r.line)), `${r.code}: ${r.line} (lava listed: ${lava ? `${lava[1]} away` : 'none'})`);
  // 5. light, enter, the Nether, back without a pos
  r = await a.play('portal', { action: 'light' });
  check('portal light', r.ok, r.line);
  r = await a.play('portal', { action: 'enter' });
  check('portal enter: into the Nether', r.ok && /went through the portal/.test(r.line), r.line);
  const s = await a.t('get_state');
  check('get_state in the Nether: the state says so, the advice gives the way back', /in the Nether/.test(stateOf(s.text)) && (s.data?.advice ?? []).some((x) => x.kind === 'nether'), `${/^position[^\n]*/m.exec(stateOf(s.text))?.[0]}; advice: ${JSON.stringify((s.data?.advice ?? []).map((x) => x.text))}`);
  r = await a.play('portal', { action: 'enter' });
  check('back without a pos (out of the portal first)', r.ok && /went through the portal/.test(r.line) && /in the overworld/.test(stateOf((await a.t('get_state')).text)), r.line);
  // 6. its own frame taken back, block by block at exact places
  const before = Number(/obsidian (\d+)/.exec(/^inventory:[^\n]*/m.exec(stateOf((await a.t('get_state')).text))?.[0] ?? '')?.[1] ?? 0);
  r = await a.play('portal', { action: 'dismantle' });
  const after = Number(/obsidian (\d+)/.exec(/^inventory:[^\n]*/m.exec(stateOf((await a.t('get_state')).text))?.[0] ?? '')?.[1] ?? 0);
  check('portal dismantle: its own frame\'s obsidian back', r.ok && after - before >= 10, `${r.line.slice(0, 160)} (obsidian ${before} -> ${after})`);
} finally {
  for (const p of [a, b]) { await p.t('end_game').catch(() => {}); await p.c.close().catch(() => {}); }
}
console.log(`RESULT ${JSON.stringify({ checks: results.length, ok: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).map((x) => x.name) })}`);
