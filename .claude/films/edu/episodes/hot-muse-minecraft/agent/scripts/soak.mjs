// scripts/soak.mjs - the nightly soak on STAGING (never production): a scripted, LLM-free player drives whole
// Nether-and-back games through the same MCP tools Muse uses, as a careful human would. It plans stage by stage and
// waits for steps that outlive their call. On a failure it retries and follows the server's own hints: the pool a LAVA
// refusal names, the height a walk names, the stuck item's call. It eats and hunts when food runs low, and drops junk
// when the bag fills. Several games run in parallel (2 or 3: well below production's 8). Every failed step, stuck item,
// death and milestone time is recorded, and a summary report is written for the night.
//
//   node scripts/soak.mjs [url] [--games 3] [--minutes 29] [--out DIR] [--name e2e-soak]
//
// url defaults to https://play-staging.picasso-lab.com; production hosts are refused. The report goes to
// DIR/<date>.md and DIR/<date>.json (default DIR: ~/picasso-work/soak). Exit code 0: the soak ran (whatever the games
// did); 1: the harness broke; 2: refused; 64: usage. The client name starts with "e2e-", so the agent treats the games
// as a test caller's: no Facebook live, never the camera from a player's game.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const STAGING_URL = 'https://play-staging.picasso-lab.com';
export const PRODUCTION_HOSTS = Object.freeze(['play.picasso-lab.com']);
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const BETTER = { wooden_pickaxe: ['stone_pickaxe', 'iron_pickaxe', 'diamond_pickaxe'], stone_pickaxe: ['iron_pickaxe', 'diamond_pickaxe'], iron_pickaxe: ['diamond_pickaxe'] };

/**
 * The kind of a failure, for counting across games: its code and the first words of its result with the numbers,
 * coordinates and item counts taken out ("FAILED no way there was found").
 */
export function failureKind(code, result) {
  const words = String(result ?? '').replace(/^(failed|only partly done|stopped): /, '').replace(/-?\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ').split(/[;:(.]/)[0].trim().slice(0, 80);
  return `${code ?? 'FAILED'} ${words}`;
}

/** The coordinates a reply's words name after a phrase ("is at -135 -30 -185"), or null. */
export function coordsAfter(text, phrase) {
  const m = new RegExp(`${phrase}\\s+(-?\\d+) (-?\\d+) (-?\\d+)`).exec(String(text ?? ''));
  return m ? { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) } : null;
}

/**
 * One game, start to end_game: {game, outcome, seconds, calls, steps, failures, stuck, deaths, milestones, report}.
 * @param {{url: string, name?: string, minutes?: number, print?: (line: string) => void, waitCalls?: number}} o
 */
export async function playGame({ url, name = 'e2e-soak', minutes = 29, print = () => {}, waitCalls = 12 }) {
  const t0 = Date.now();
  const deadline = t0 + minutes * 60_000;
  const at = () => Math.round((Date.now() - t0) / 1000);
  const rec = { game: null, calls: 0, steps: 0, failures: [], stuck: [], deaths: 0, milestones: [], outcome: 'running', notes: [] };
  const c = new Client({ name, version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${String(url).replace(/\/+$/, '')}/mcp`)));
  let state = {};
  let lastText = '';
  const seenStuck = new Set();
  const call = async (tool, args = {}) => {
    rec.calls += 1;
    const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 120_000 });
    const sc = r.structuredContent ?? {};
    if (sc.state) state = sc.state;
    lastText = (r.content ?? []).map((x) => x.text ?? '').join('\n');
    for (const a of sc.advice ?? []) {
      if (a.kind === 'stuck' && !seenStuck.has(a.text)) { seenStuck.add(a.text); rec.stuck.push({ at: at(), text: a.text.slice(0, 300), hint: a.hint ?? null }); print(`[${at()} s] STUCK ${a.text.slice(0, 160)}`); }
    }
    return { sc, text: lastText, isError: Boolean(r.isError) };
  };
  const inv = () => state.inventory ?? {};
  const has = (item, n = 1) => (Number(inv()[item]) || 0) >= n;
  const count = (item) => Number(inv()[item]) || 0;
  const tooLate = () => Date.now() > deadline || (Number.isFinite(state.timeLeftS) && state.timeLeftS < 45);

  /** One skill, with its why; a step still running is waited for. {ok, code, result, status}. */
  async function play(skill, args, why) {
    if (tooLate()) return { ok: false, code: 'TIME', result: 'out of time' };
    rec.steps += 1;
    let { sc } = await call('play', { skill, args, why, plan: 'The soak route, stage by stage; on a failure, the server\'s hints first.' });
    let st = sc.steps?.[0] ?? null;
    const sig = JSON.stringify(args);
    for (let w = 0; w < waitCalls && st?.status === 'pending' && !tooLate(); w++) {
      ({ sc } = await call('get_state', {}));
      st = (sc.earlier ?? []).find((e) => e.skill === skill && JSON.stringify(e.args) === sig) ?? st;
    }
    const code = st?.code ?? sc.code ?? null;
    const result = String(st?.result ?? lastText.split('\n')[0] ?? '');
    const ok = st?.status === 'confirmed';
    if (code === 'DIED' || /\byou died\b/.test(result)) rec.deaths += 1;
    if (!ok) {
      rec.failures.push({ at: at(), skill, args, code, kind: failureKind(code, result), result: result.slice(0, 300) });
      print(`[${at()} s] FAILED ${skill} ${sig} ${code ?? ''}: ${result.slice(0, 160)}`);
    } else print(`[${at()} s] ok     ${skill} ${sig}: ${result.slice(0, 100)}`);
    return { ok, code, result, status: st?.status ?? null };
  }

  /** Food and the bag between stages: eat, hunt or drop junk when the advice says so, once each. */
  async function upkeep() {
    const advice = (await call('get_state', {})).sc.advice ?? [];
    for (const kind of ['eat', 'heal', 'hunt', 'inventory']) {
      const a = advice.find((x) => x.kind === kind && x.hint);
      if (!a) continue;
      if (kind === 'hunt' && (state.food ?? 20) > 10) continue;
      await play(a.hint.skill, a.hint.args ?? {}, `Upkeep: ${a.text.slice(0, 100)}`);
    }
    // a stuck item's call, once per item
    const stuck = advice.find((x) => x.kind === 'stuck' && x.hint);
    if (stuck && !rec.stuck.find((s) => s.text === stuck.text.slice(0, 300))?.followed) {
      const s = rec.stuck.find((x) => x.text === stuck.text.slice(0, 300));
      if (s) s.followed = true;
      await play(stuck.hint.skill, stuck.hint.args ?? {}, 'Following the stuck advice once.');
    }
  }

  /** Up to tries attempts of an action until done() holds; between tries a recovery from the failure. */
  async function stage(label, done, attempt, tries = 3) {
    for (let k = 0; k < tries && !done() && !tooLate(); k++) {
      const r = await attempt(k);
      if (done()) break;
      if (r?.code === 'DIED') return false;
      if (r && !r.ok && r.code === 'HOSTILE_CONTACT') await sleep(3_000);
      await upkeep();
    }
    const ok = done();
    if (!ok) rec.notes.push(`${label}: not done`);
    return ok;
  }
  const pick = (p) => p && { x: p.x, y: p.y, z: p.z };
  const goTo = async (p, why) => {
    let r = await play('go_to', p, why);
    const better = !r.ok ? coordsAfter(r.result, 'so go_to') ?? coordsAfter(r.result, 'the nearest place to stand near there: go_to') : null;
    if (better) r = await play('go_to', better, 'The height the server named.');
    return r;
  };

  try {
    let r = await call('start_game', { goal: 'nether_and_back', live: false, rules: { defend: true, escape: true, eat_below: 6 } });
    while (r.sc?.code === 'SERVER_FULL' && Date.now() < deadline) { await sleep(Math.min(60_000, (r.sc.retryAfterS ?? 20) * 1000)); r = await call('start_game', { goal: 'nether_and_back', live: false }); }
    if (r.isError) throw new Error(`start_game: ${r.text.slice(0, 200)}`);
    rec.game = /game (g\w+)/.exec(r.text)?.[1] ?? null;
    if (!state.pos) await call('get_state', {});
    const home = pick(state.pos);
    const wood = /\b((?:dark_|pale_)?[a-z]+)_log \d/.exec(/^nearby blocks[^\n]*/m.exec(lastText)?.[0] ?? '')?.[1] ?? 'oak';
    print(`[${at()} s] game ${rec.game} at ${JSON.stringify(home)}, wood ${wood}`);
    const pickaxe = (tier) => has(tier) || (BETTER[tier] ?? []).some((b) => has(b));

    await stage('wood', () => count(`${wood}_log`) >= 6 || pickaxe('wooden_pickaxe'), async (k) => {
      const got = await play('collect', { block: `${wood}_log`, n: 8 }, 'Logs for the first tools.');
      if (!got.ok && k > 0) await play('explore', { heading: [0, 90, 180, 270][k % 4], chunks: 1 }, 'No logs here: new land.');
      return got;
    });
    await stage('wooden pickaxe', () => pickaxe('wooden_pickaxe'), () => play('craft_batch', { items: [{ item: `${wood}_planks`, n: 12 }, { item: 'stick', n: 4 }, { item: 'crafting_table', n: 1 }, { item: 'wooden_pickaxe', n: 1 }] }, 'The wooden pickaxe.'));
    await stage('stone', () => count('cobblestone') >= 11 || pickaxe('stone_pickaxe'), () => play('collect', { block: 'cobblestone', n: 11 }, 'Stone for tools and a furnace.'));
    await stage('stone pickaxe', () => pickaxe('stone_pickaxe') && (has('furnace') || has('iron_ingot', 3)), () => play('craft_batch', { items: [{ item: 'stone_pickaxe', n: 1 }, { item: 'furnace', n: 1 }] }, 'Stone pickaxe and a furnace.'));
    await stage('iron', () => count('raw_iron') + count('iron_ingot') >= 11 || pickaxe('iron_pickaxe'), async (k) => {
      const got = await play('collect', { block: 'iron_ore', n: 11 - count('raw_iron') - count('iron_ingot') }, 'Iron: pickaxe 3, bucket 3, shield 1, flint and steel 1, and spares.');
      if (!got.ok && state.pos && k < 2) await goTo({ x: state.pos.x + 2, y: state.pos.y - 16, z: state.pos.z + 2 }, 'Deeper, where iron lies.');
      return got;
    }, 4);
    await stage('coal', () => count('coal') + count('charcoal') >= 4, () => play('collect', { block: 'coal_ore', n: 6 }, 'Fuel for the smelting.'));
    await stage('iron ingots', () => count('iron_ingot') >= 8 || (pickaxe('iron_pickaxe') && count('iron_ingot') >= 5), () => play('smelt', { item: 'raw_iron', n: Math.max(1, count('raw_iron')) }, 'Iron ingots.'));
    await stage('iron pickaxe', () => pickaxe('iron_pickaxe'), () => play('craft', { item: 'iron_pickaxe', n: 1 }, 'The iron pickaxe.'));
    await stage('shield', () => has('shield') || Boolean(state.equipment && JSON.stringify(state.equipment).includes('shield')), () => play('shield', {}, 'A shield before going deep.'), 2);
    await stage('diamonds', () => count('diamond') >= 3 || pickaxe('diamond_pickaxe'), () => play('collect', { block: 'deepslate_diamond_ore', n: 3 }, 'Diamonds for the diamond pickaxe.'), 3);
    await stage('diamond pickaxe and bucket', () => pickaxe('diamond_pickaxe') && (has('bucket') || has('water_bucket')), () => play('craft_batch', { items: [...(pickaxe('diamond_pickaxe') ? [] : [{ item: 'diamond_pickaxe', n: 1 }]), ...(has('bucket') || has('water_bucket') ? [] : [{ item: 'bucket', n: 1 }])] }, 'Diamond pickaxe and a bucket.'));
    await stage('water', () => has('water_bucket'), () => play('bucket', { action: 'fill', liquid: 'water' }, 'Water for the obsidian.'));
    await stage('flint', () => has('flint') || has('flint_and_steel'), () => play('collect', { block: 'gravel', n: 22 }, 'Gravel for flint (1 in 10).'), 3);
    await stage('flint and steel', () => has('flint_and_steel'), () => play('craft', { item: 'flint_and_steel', n: 1 }, 'Flint and steel to light the portal.'));
    await stage('obsidian', () => count('obsidian') >= 12, async () => {
      const got = await play('collect', { block: 'obsidian', n: 14 - count('obsidian') }, 'Obsidian for the frame.');
      if (got.ok) return got;
      const pool = coordsAfter(got.result, 'The nearest lava pool loaded is at') ?? coordsAfter(got.result, 'make more at the still lava pool at');
      if (pool) await goTo({ x: pool.x + 3, y: pool.y + 1, z: pool.z }, 'To the pool the server named.');
      else if (got.code === 'LAVA' && state.pos) await goTo({ x: state.pos.x + 3, y: Math.max(-54, state.pos.y - 20), z: state.pos.z + 3 }, 'Deeper, where lava pools are.');
      return got;
    }, 6);
    // the frame on open ground: back where the game began (the surface)
    if (home && !tooLate()) await goTo(home, 'Back up to the surface for the frame.');
    await stage('portal', () => rec.built === true, async (k) => {
      const got = await play('build', { blueprint: 'nether_portal', material: 'obsidian' }, 'The Nether portal frame.');
      rec.built = got.ok;
      // too near the world spawn or another player: well away; else a few blocks on
      const far = /world spawn|another player|farther away/.test(got.result);
      if (!got.ok && state.pos) await goTo({ x: state.pos.x + (far ? 40 : (k + 1) * 6), y: state.pos.y, z: state.pos.z }, far ? 'Away from the world spawn for the frame.' : 'Another spot for the frame.');
      return got;
    }, 3);
    if (rec.built) {
      await stage('lit', () => rec.lit === true, async () => { const g = await play('portal', { action: 'light' }, 'Light the portal.'); rec.lit = g.ok; return g; }, 2);
      await stage('nether', () => rec.inNether === true, async () => { const g = await play('portal', { action: 'enter' }, 'Into the Nether.'); rec.inNether = g.ok; return g; }, 3);
      if (rec.inNether) await stage('back', () => rec.back === true, async () => { const g = await play('portal', { action: 'enter' }, 'Back to the Overworld.'); rec.back = g.ok; return g; }, 3);
    }
    rec.outcome = rec.back ? 'nether and back' : rec.inNether ? 'nether only' : rec.built ? 'portal built' : 'no portal';
  } catch (err) {
    rec.outcome = `harness error: ${String(err?.message ?? err).slice(0, 200)}`;
  } finally {
    try {
      const end = await c.callTool({ name: 'end_game', arguments: {} }, undefined, { timeout: 60_000 });
      const report = end.structuredContent?.report ?? null;
      rec.milestones = (report?.milestones ?? []).map((m) => ({ key: m.key, atS: m.atS ?? null }));
      rec.goalReached = Boolean(report?.goalReached);
      rec.reportDeaths = report?.deaths?.length ?? null;
    } catch { /* the game may have ended already */ }
    await c.close().catch(() => {});
  }
  rec.seconds = at();
  return rec;
}

/** The night's report in Markdown, from the games' records. */
export function reportText({ url, date, games }) {
  const lines = [`# Soak ${date}`, '', `Staging: ${url}. ${games.length} games in parallel, scripted (no model), goal nether_and_back.`, ''];
  lines.push('| Game | Outcome | Time | Steps | Failed | Stuck | Deaths |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const g of games) lines.push(`| ${g.game ?? '-'} | ${g.outcome} | ${Math.floor(g.seconds / 60)}:${String(g.seconds % 60).padStart(2, '0')} | ${g.steps} | ${g.failures.length} | ${g.stuck.length} | ${g.deaths} |`);
  const keys = [...new Set(games.flatMap((g) => g.milestones.map((m) => m.key)))];
  if (keys.length) {
    lines.push('', '## Milestones (minutes into each game)', '', `| Milestone | ${games.map((g) => g.game ?? '-').join(' | ')} |`, `| --- | ${games.map(() => '---').join(' | ')} |`);
    for (const k of keys) lines.push(`| ${k} | ${games.map((g) => { const m = g.milestones.find((x) => x.key === k); return m?.atS != null ? `${Math.floor(m.atS / 60)}:${String(Math.round(m.atS) % 60).padStart(2, '0')}` : '-'; }).join(' | ')} |`);
  }
  const kinds = new Map();
  for (const g of games) for (const f of g.failures) { const e = kinds.get(f.kind) ?? { n: 0, games: new Set(), example: f }; e.n += 1; e.games.add(g.game); kinds.set(f.kind, e); }
  lines.push('', '## Top failure kinds', '');
  if (!kinds.size) lines.push('None.');
  for (const [kind, e] of [...kinds].sort((a, b) => b[1].n - a[1].n).slice(0, 12)) {
    lines.push(`- **${kind}**: ${e.n} time${e.n === 1 ? '' : 's'} in ${e.games.size} game${e.games.size === 1 ? '' : 's'}.`, `  - Example (${e.example.skill} ${JSON.stringify(e.example.args)} at ${e.example.at} s): ${e.example.result}`);
  }
  const stuck = games.flatMap((g) => g.stuck.map((s) => ({ ...s, game: g.game })));
  lines.push('', '## Stuck items', '');
  if (!stuck.length) lines.push('None.');
  for (const s of stuck.slice(0, 12)) lines.push(`- ${s.game} at ${s.at} s: ${s.text}`);
  const notes = games.flatMap((g) => g.notes.map((n) => `${g.game}: ${n}`));
  if (notes.length) lines.push('', '## Stages not done', '', ...notes.map((n) => `- ${n}`));
  return `${lines.join('\n')}\n`;
}

/** The CLI. Returns an exit code. */
export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({ args: argv, allowPositionals: true, strict: true, options: { games: { type: 'string' }, minutes: { type: 'string' }, out: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean', short: 'h' } } }));
  } catch (err) { printErr(err.message); return 64; }
  if (values.help) { print('usage: node scripts/soak.mjs [url] [--games 3] [--minutes 29] [--out DIR] [--name e2e-soak]'); return 0; }
  const url = String(positionals[0] ?? STAGING_URL).replace(/\/+$/, '');
  let host;
  try { host = new URL(url).hostname; } catch { printErr(`refused: not a URL: ${url}`); return 2; }
  if (PRODUCTION_HOSTS.includes(host)) { printErr(`refused: ${host} is production; the soak runs on staging only`); return 2; }
  const games = Math.max(1, Math.min(4, Number(values.games ?? 3) || 3));
  const minutes = Math.max(1, Math.min(29, Number(values.minutes ?? 29) || 29));
  const out = values.out ?? path.join(os.homedir(), 'picasso-work', 'soak');
  const name = values.name ?? 'e2e-soak';
  if (!name.startsWith('e2e-')) { printErr('refused: the client name must start with "e2e-" (a test caller: no Facebook live)'); return 2; }
  const date = new Date().toISOString().slice(0, 10);
  print(`soak: ${games} games on ${url}, ${minutes} min each`);
  let recs;
  try {
    // started 20 s apart: their starts do not all land in one moment
    recs = await Promise.all(Array.from({ length: games }, async (_, k) => {
      await sleep(k * 20_000);
      return playGame({ url, name: `${name}-${k + 1}`, minutes, print: (l) => print(`[game ${k + 1}] ${l}`) });
    }));
  } catch (err) { printErr(`harness error: ${err?.message ?? err}`); return 1; }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, `${date}.json`), `${JSON.stringify({ url, date, games: recs }, null, 2)}\n`);
  fs.writeFileSync(path.join(out, `${date}.md`), reportText({ url, date, games: recs }));
  print(`soak: report ${path.join(out, `${date}.md`)}`);
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exit(await main());
