// mineai/bench/muse-replay.mjs - the owner's Muse run on staging (2026-10-08, game g38e5ef) played again with no model:
// the same tool calls in the same order, through the public /mcp in plain HTTP JSON-RPC (as the code Muse writes for
// itself), and every reply read the way Muse read them. Calls: initialize, tools/list, start_game {adult: true}, the
// 12-step play_sequence to an iron pickaxe (the wood of the spot instead of dark oak), get_state until it is done,
// play_sequence [collect cobblestone 8, build shelter cobblestone], play_sequence [hunt pig porkchop 2, smelt porkchop 2],
// get_state until done, play eat twice, end_game. Checks on the replies:
//   - every skill the server offers is named in its instructions and in play_sequence's description (hunt included);
//   - smelt's n is 1 to 24 in its schema;
//   - the caller's step numbers stay: steps 1-12 as sent, an added craft only as a "+" line "added by the check before
//     step N", in the reply and in get_state; every block of earlier steps names its call;
//   - each step's numbers add up: delta = gained - used + other, and the text gives the step's own change first;
//   - no "mined 0" and no "mined no ... as a target" for a collect that picked up what it was asked for;
//   - all the deltas of the game together equal the inventory at its end (it starts empty);
//   - eat at a full food bar: code NOT_HUNGRY, "Harmless", and nothing after it cancelled.
// Prints every reply in full (--out keeps them as JSON) and a RESULT line.
//
//   node mineai/bench/muse-replay.mjs [https://play-staging.picasso-lab.com] [--out replay.json] [--label name]
//
// Exit codes: 0 every check held, 2 one did not, 1 the script broke. Refuses play.picasso-lab.com (production).

import fs from 'node:fs';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' }, label: { type: 'string', default: 'muse-replay' } } });
const base = String(positionals[0] ?? 'https://play-staging.picasso-lab.com').replace(/\/+$/, '');
if (/^https?:\/\/play\.picasso-lab\.com$/.test(base)) { console.error('muse-replay: refuses production (play.picasso-lab.com)'); process.exit(64); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const t0 = Date.now();
const at = () => `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s]`;
const checks = [];
const expect = (ok, what) => { checks.push({ ok: Boolean(ok), what }); console.log(`${at()} ${ok ? 'ok  ' : 'FAIL'} ${what}`); };
const replies = [];

let sid = null;
let rpcId = 0;
async function post(body) {
  const started = Date.now();
  const r = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(sid ? { 'mcp-session-id': sid } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  sid ??= r.headers.get('mcp-session-id');
  const raw = await r.text();
  return { status: r.status, ms: Date.now() - started, json: raw ? JSON.parse(raw) : null };
}
/** tools/call: the reply's text and structuredContent, printed in full and kept. */
async function tool(name, args = {}) {
  const r = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } });
  const res = r.json?.result ?? {};
  const text = (res.content ?? []).map((x) => x.text ?? '').join('\n');
  const data = res.structuredContent ?? null;
  replies.push({ at: Math.round((Date.now() - t0) / 100) / 10, tool: name, args, ms: r.ms, status: r.status, isError: Boolean(res.isError), text, data });
  console.log(`\n${at()} ===== ${name} ${JSON.stringify(args).slice(0, 400)} -> HTTP ${r.status}, ${(r.ms / 1000).toFixed(2)} s, code ${data?.code ?? (res.isError ? 'error' : 'null')}\n${text.split('\n\nState (')[0]}`);
  return { text, data, isError: Boolean(res.isError) };
}

const FINAL = new Set(['confirmed', 'failed', 'cancelled']);
const reported = new Map(); // `${call}:${n}` -> the step as reported final
const allSteps = (d) => [...(d?.earlier ?? []), ...(d?.steps ?? [])];
function record(d) {
  for (const st of allSteps(d)) if (FINAL.has(st.status)) reported.set(`${st.call ?? '?'}:${st.n}`, st);
}
/** get_state until the game's queue is empty. */
async function drain() {
  for (let i = 0; i < 30; i++) {
    const r = await tool('get_state');
    record(r.data);
    checkReply(r);
    if (!r.data?.queue?.running && !r.data?.queue?.waiting) return r;
  }
  throw new Error('the queue did not empty within 30 get_state calls');
}

const fmt = (o) => Object.entries(o ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
const sum = (...maps) => {
  const out = {};
  for (const [m, sign] of maps) for (const [k, v] of Object.entries(m ?? {})) out[k] = (out[k] ?? 0) + sign * v;
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
};
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** What every reply must hold, read as Muse reads it. */
function checkReply(r) {
  const text = r.text.split('\n\nState (')[0];
  for (const st of allSteps(r.data)) {
    if (!FINAL.has(st.status) || !st.delta) continue;
    if (st.used || st.gained || st.other) {
      const parts = sum([st.gained, 1], [st.used, -1], [st.other, 1]);
      if (!same(parts, sum([st.delta, 1]))) expect(false, `call ${st.call} step ${st.step ?? '+'} ${st.skill}: gained - used + other (${fmt(parts)}) is not delta (${fmt(st.delta)})`);
    }
    if (st.skill === 'collect' && st.status === 'confirmed') {
      if (/\bmined 0\b/.test(st.result)) expect(false, `call ${st.call} step ${st.step} collect says "mined 0": ${st.result}`);
      if (/mined no \w+ as a target/.test(st.result)) expect(false, `call ${st.call} step ${st.step} collect mined no target: ${st.result}`);
    }
  }
  // a block of earlier steps names each call it holds
  const earlierBlock = /^Finished since your last call:\n([\s\S]*?)(?:\n\n|$)/.exec(text)?.[1];
  if (earlierBlock && !/^From your (play|play_sequence) #\d+, sent \d+ s ago:$/m.test(earlierBlock.split('\n')[0])) expect(false, `an earlier block without its call: ${earlierBlock.split('\n')[0]}`);
}

// ----- the run

const init = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: values.label, version: '1' } } });
await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
const instructions = String(init.json?.result?.instructions ?? '');
const list = await post({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/list' });
const tools = list.json?.result?.tools ?? [];
const seqTool = tools.find((t) => t.name === 'play_sequence');
const playTool = tools.find((t) => t.name === 'play');
const skills = seqTool?.inputSchema?.properties?.steps?.items?.properties?.skill?.enum ?? [];
expect(skills.includes('hunt') && skills.every((s) => instructions.includes(s) && seqTool.description.includes(s)), `all ${skills.length} skills (hunt included) in the server instructions and in play_sequence's description`);
const smeltLine = /^- smelt \{([^}]*)\}/m.exec(playTool?.description ?? '')?.[1] ?? '';
expect(/n: integer 1 to 24/.test(smeltLine) && /At most 24 a call/.test(playTool?.description ?? ''), `smelt's n is 1 to 24 in its schema and description (${smeltLine})`);

const start = await tool('start_game', { adult: true });
const game = /New game (g\w+)/.exec(start.text)?.[1] ?? null;
// the nearest kind of log with at least 3 around (as scripts/staging-check.mjs picks it); oak when none is in sight
const near = /^nearby blocks[^\n]*/m.exec(start.text)?.[0] ?? '';
const logs = [...near.matchAll(/(?:^|[:;] )((?:dark_)?[a-z]+)_log (\d+)\+? \(nearest ([\d.]+) away/g)]
  .filter((m) => !m[1].startsWith('stripped') && m[1] !== 'pale_oak' && Number(m[2]) >= 3).sort((a, b) => Number(a[3]) - Number(b[3]));
const wood = logs[0]?.[1] ?? 'oak';
const startedAt = Date.now();
console.log(`${at()} game ${game}; wood here: ${wood}`);

const iron = [
  ['collect', { block: `${wood}_log`, n: 12 }], ['craft', { item: `${wood}_planks`, n: 12 }], ['craft', { item: 'stick', n: 4 }],
  ['craft', { item: 'wooden_pickaxe', n: 1 }], ['collect', { block: 'cobblestone', n: 12 }], ['craft', { item: 'stick', n: 4 }],
  ['craft', { item: 'stone_pickaxe', n: 1 }], ['collect', { block: 'coal_ore', n: 4 }], ['collect', { block: 'iron_ore', n: 4 }],
  ['craft', { item: 'furnace', n: 1 }], ['smelt', { item: 'raw_iron', n: 3 }], ['craft', { item: 'iron_pickaxe', n: 1 }],
].map(([skill, args]) => ({ skill, args }));
const first = await tool('play_sequence', { steps: iron });
record(first.data);
checkReply(first);
const call1 = first.data?.call;
const own = (first.data?.steps ?? []).filter((st) => st.step != null);
const added = (first.data?.steps ?? []).filter((st) => st.step == null);
expect(own.length === 12 && own.every((st, i) => st.step === i + 1 && st.skill === iron[i].skill && JSON.stringify(st.args) === JSON.stringify(iron[i].args)), 'the 12 steps keep the numbers and arguments they were sent with');
expect(added.every((st) => st.skill === 'craft' && st.before != null), `the check's additions are "+" crafts before a step (${added.map((st) => `${st.args.item} before ${st.before}`).join(', ') || 'none'})`);
expect(!/^1[3-9]\. /m.test(first.text), 'no step numbered past 12');
if (added.length) expect(/^\+ craft \{"item":"crafting_table","n":1\} \(added by the check before step 4/m.test(first.text) || added.every((st) => st.args.item !== 'crafting_table'), 'the table craft shown as "+ craft ... (added by the check before step 4 ...)"');
let state = await drain();
const ironDone = [...reported.values()].find((st) => st.call === call1 && st.skill === 'craft' && st.args.item === 'iron_pickaxe');
const ironS = Math.round((Date.now() - startedAt) / 100) / 10;
expect(ironDone?.status === 'confirmed', `iron pickaxe crafted (${ironDone?.status ?? 'not reported'}; ${ironS} s after start_game)`);
const all = replies.map((r) => r.text).join('\n');
expect(!/^(1[3-9])\. /m.test(all), 'no reply numbers a step of the first call past 12');

const shelter = await tool('play_sequence', { steps: [{ skill: 'collect', args: { block: 'cobblestone', n: 8 } }, { skill: 'build', args: { blueprint: 'shelter', material: 'cobblestone' } }] });
record(shelter.data);
checkReply(shelter);
state = await drain();
const food = await tool('play_sequence', { steps: [{ skill: 'hunt', args: { mob: 'pig', drop: 'porkchop', n: 2 } }, { skill: 'smelt', args: { item: 'porkchop', n: 2 } }] });
record(food.data);
checkReply(food);
state = await drain();
for (let i = 0; i < 2; i++) {
  const eat = await tool('play', { skill: 'eat', args: {} });
  record(eat.data);
  checkReply(eat);
  if (eat.data?.code === 'NOT_HUNGRY') expect(/Harmless: nothing was eaten or used, and the steps queued after it still run/.test(eat.text), 'eat at 20/20: NOT_HUNGRY, harmless, nothing cancelled');
  if (i === 0) await sleep(5_000);
}
state = await tool('get_state');
record(state.data);

// all the deltas of the game together are the inventory at its end (it started empty)
const steps = [...reported.values()];
const total = sum(...steps.map((st) => [st.delta, 1]));
const inv = state.data?.state?.inventory ?? {};
const worn = Object.fromEntries(Object.values(state.data?.state?.equipment ?? {}).map((e) => [e.name ?? e, 1]));
const end = sum([inv, 1], [worn, 1]);
expect(same(total, end), `the deltas of the game add up to its inventory (sum ${fmt(total)}; inventory ${fmt(end)})`);
await tool('end_game');

const table = steps.map((st) => ({ call: st.call, step: st.step, before: st.before ?? null, skill: st.skill, args: st.args, status: st.status, code: st.code ?? null, result: st.result, delta: st.delta, used: st.used ?? null, gained: st.gained ?? null, other: st.other ?? null, ms: st.ms ?? null }));
const failedSteps = steps.filter((st) => st.status !== 'confirmed');
const ok = checks.every((c) => c.ok);
console.log(`\n${at()} steps: ${steps.length} (${steps.filter((st) => st.status === 'confirmed').length} ok; ${failedSteps.map((st) => `${st.skill} ${st.status}${st.code ? ` ${st.code}` : ''}`).join(', ') || 'none failed'})`);
console.log(`RESULT ${ok ? 'PASS' : 'FAIL'}: ${checks.filter((c) => c.ok).length} of ${checks.length} checks, game ${game}, wood ${wood}, iron pickaxe ${ironS} s after start_game, ${replies.length} tool calls, ${Math.round((Date.now() - t0) / 1000)} s in all`);
if (values.out) fs.writeFileSync(values.out, `${JSON.stringify({ base, game, wood, ironS, checks, steps: table, replies }, null, 1)}\n`);
process.exit(ok ? 0 : 2);
