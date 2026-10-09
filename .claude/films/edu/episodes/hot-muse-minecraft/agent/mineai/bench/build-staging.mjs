// mineai/bench/build-staging.mjs - builds on rough ground through the public /mcp in plain HTTP JSON-RPC, as Muse sends
// them (no model): one game per spot, each a wooden pickaxe, `collect cobblestone 43`, a stone pickaxe, then `build
// hut_3x3 cobblestone` (and once more when it is left incomplete: the same hut must be continued, the reply says
// "continued"), then `build shelter cobblestone`; every build reply printed in full and checked: ok, or a failure that
// names its cells and why, never a reply cut mid-word or with a bracket left open. Where the games land is staging's
// business (SPREAD_SPOTS in its deploy/.env for the run: "x z; x z; ...", one spot per game in turn); --go x,y,z walks
// there after the collect, before the hut (one per game, in order).
//
//   node mineai/bench/build-staging.mjs [https://play-staging.picasso-lab.com] [--games 3] ["--go=x,y,z;x,y,z;..."]
//     [--out builds.json]
//
// Exit codes: 0 every check held, 2 one did not, 1 the script broke. Refuses play.picasso-lab.com unless --production
// is given (the one build check after a production deploy, docs/SWITCH.md).

import fs from 'node:fs';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { games: { type: 'string', default: '3' }, go: { type: 'string', default: '' }, out: { type: 'string' }, production: { type: 'boolean', default: false } },
});
const base = String(positionals[0] ?? 'https://play-staging.picasso-lab.com').replace(/\/+$/, '');
if (/^https?:\/\/play\.picasso-lab\.com$/.test(base) && !values.production) { console.error('build-staging: refuses production (play.picasso-lab.com) without --production'); process.exit(64); }
const goes = values.go ? values.go.split(';').map((s) => s.split(',').map(Number)) : [];
const t0 = Date.now();
const at = () => `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s]`;
const checks = [];
const expect = (ok, what) => { checks.push({ ok: Boolean(ok), what }); console.log(`${at()} ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

let sid = null;
let rpcId = 0;
async function post(body) {
  const r = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(sid ? { 'mcp-session-id': sid } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  sid ??= r.headers.get('mcp-session-id');
  const raw = await r.text();
  return { status: r.status, json: raw ? JSON.parse(raw) : null };
}
async function tool(name, args = {}) {
  const r = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } });
  const res = r.json?.result ?? {};
  const text = (res.content ?? []).map((x) => x.text ?? '').join('\n');
  console.log(`\n${at()} ===== ${name} ${JSON.stringify(args).slice(0, 200)} -> HTTP ${r.status}\n${text.split('\n\nState (')[0].slice(0, 1500)}`);
  return { text, data: res.structuredContent ?? null };
}
const FINAL = new Set(['confirmed', 'failed', 'cancelled']);
const steps = new Map();
const record = (d) => { for (const st of [...(d?.earlier ?? []), ...(d?.steps ?? [])]) if (FINAL.has(st.status)) steps.set(`${st.call}:${st.n}`, st); };
async function drain() {
  for (let i = 0; i < 40; i++) {
    const r = await tool('get_state');
    record(r.data);
    if (!r.data?.queue?.running && !r.data?.queue?.waiting) return r;
  }
  throw new Error('the queue did not empty within 40 get_state calls');
}
const balanced = (s) => { let d = 0; for (const ch of s) { d += ch === '(' ? 1 : ch === ')' ? -1 : 0; if (d < 0) return false; } return d === 0; };
/** A build step's reply: ok, or a failure that names its cells and why; whole words, brackets closed. */
function checkBuild(st, label) {
  const r = String(st?.result ?? '');
  expect(st && FINAL.has(st.status), `${label}: settled (${st?.status ?? 'not reported'})`);
  if (!st) return;
  expect(balanced(r) && !/\bsea\b/.test(r), `${label}: whole words, every bracket closed`);
  if (st.status !== 'confirmed') expect(/cells done; .*(could not reach|refused|hold|has|have|need|would seal|where you stand|not loaded|still to do|short of)/.test(r), `${label}: the failure names its cells and why`);
}

const init = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'build-staging', version: '1' } } });
await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
expect(init.status === 200, 'initialize');
const games = [];
for (let g = 0; g < Number(values.games); g++) {
  steps.clear();
  const start = await tool('start_game', { adult: true });
  const game = /New game (g\w+)/.exec(start.text)?.[1] ?? null;
  const where = /^position ([-\d]+ [-\d]+ [-\d]+)/m.exec(start.text)?.[1] ?? '?';
  console.log(`${at()} game ${game} at ${where}`);
  const go = goes[g];
  // a wooden pickaxe from the nearest wood (as scripts/staging-check.mjs picks it), the cobblestone (the collect walks
  // wherever the stone is), then to the spot, then the hut
  const near = /^nearby blocks[^\n]*/m.exec(start.text)?.[0] ?? '';
  const logs = [...near.matchAll(/(?:^|[:;] )((?:dark_)?[a-z]+)_log (\d+)\+? \(nearest ([\d.]+) away/g)]
    .filter((m) => !m[1].startsWith('stripped') && m[1] !== 'pale_oak' && Number(m[2]) >= 3).sort((a, b) => Number(a[3]) - Number(b[3]));
  const wood = logs[0]?.[1] ?? 'oak';
  const first = [
    { skill: 'collect', args: { block: `${wood}_log`, n: 3 } },
    { skill: 'craft', args: { item: `${wood}_planks`, n: 12 } },
    { skill: 'craft', args: { item: 'stick', n: 4 } },
    { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
    { skill: 'collect', args: { block: 'cobblestone', n: 43 } },
    // a wooden pickaxe wears out digging a hut's cells out of stone (staging's first run): a stone one, as Muse carries
    { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } },
    ...(go ? [{ skill: 'go_to', args: { x: go[0], y: go[1], z: go[2] } }] : []),
    { skill: 'build', args: { blueprint: 'hut_3x3', material: 'cobblestone' } },
  ];
  record((await tool('play_sequence', { steps: first })).data);
  await drain();
  const all = () => [...steps.values()];
  const hut = all().find((st) => st.skill === 'build');
  checkBuild(hut, `game ${game} hut_3x3`);
  let again = null;
  if (hut && hut.status !== 'confirmed') {
    const r = await tool('play', { skill: 'build', args: { blueprint: 'hut_3x3', material: 'cobblestone' } });
    record(r.data);
    await drain();
    again = all().filter((st) => st.skill === 'build').at(-1);
    checkBuild(again, `game ${game} hut_3x3 again`);
    // a first build that ran and left the hut incomplete is continued; one that never ran (cancelled with its queue
    // when a step before it failed) left nothing to continue
    if (hut.status === 'failed') expect(/continued the hut_3x3 begun facing/.test(again?.result ?? ''), `game ${game}: the second build continued the same hut`);
  }
  record((await tool('play', { skill: 'build', args: { blueprint: 'shelter', material: 'cobblestone' } })).data);
  await drain();
  const shelter = all().filter((st) => st.skill === 'build').at(-1);
  checkBuild(shelter, `game ${game} shelter`);
  await tool('end_game');
  games.push({ game, where, go: go ?? null, steps: all().map((st) => ({ skill: st.skill, args: st.args, status: st.status, code: st.code ?? null, result: st.result, ms: st.ms ?? null })) });
  const b = (st) => (st ? `${st.status}${st.ms ? ` ${(st.ms / 1000).toFixed(1)} s` : ''}` : '-');
  console.log(`${at()} game ${game}: hut ${b(hut)}${again ? `, again ${b(again)}` : ''}, shelter ${b(shelter)}`);
}
const ok = checks.every((c) => c.ok);
console.log(`\nRESULT ${ok ? 'PASS' : 'FAIL'}: ${checks.filter((c) => c.ok).length} of ${checks.length} checks, ${games.length} games, ${Math.round((Date.now() - t0) / 1000)} s`);
for (const gm of games) {
  for (const st of gm.steps.filter((x) => x.skill === 'build')) console.log(`  ${gm.game} ${st.args.blueprint}: ${st.status}: ${st.result}`);
}
if (values.out) fs.writeFileSync(values.out, `${JSON.stringify({ base, checks, games }, null, 1)}\n`);
process.exit(ok ? 0 : 2);
