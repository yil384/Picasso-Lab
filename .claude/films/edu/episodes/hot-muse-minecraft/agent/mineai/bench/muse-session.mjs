// mineai/bench/muse-session.mjs - a session shaped like Muse's through the public /mcp, with no model: plain HTTP
// JSON-RPC as the code Muse writes for itself (no MCP SDK), each call timed. initialize and tools/list; start_game;
// live_view (both pages fetched); a play_sequence to a wooden pickaxe with a request_id and the same call sent again 5 s
// later while it runs (as a client does after a lost reply: "Already received", nothing run twice); the same request_id
// with other steps (refused, nothing run); get_state until the queue is empty; a second play_sequence to a stone
// pickaxe; a new connection that resumes the game by its handle; end_game; a call after the end. One line per call,
// then a RESULT line.
//
//   node mineai/bench/muse-session.mjs [https://play-staging.picasso-lab.com] [--out session.json]
//
// Exit codes: 0 every expectation held, 2 one did not, 1 the script broke. Refuses play.picasso-lab.com (production).

import fs from 'node:fs';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: 'string' } } });
const base = String(positionals[0] ?? 'https://play-staging.picasso-lab.com').replace(/\/+$/, '');
if (/^https?:\/\/play\.picasso-lab\.com$/.test(base)) { console.error('muse-session: refuses production (play.picasso-lab.com)'); process.exit(64); }
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const t0 = Date.now();
const at = () => `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s]`;
const calls = [];
const checks = [];
const expect = (ok, what) => { checks.push({ ok: Boolean(ok), what }); console.log(`${at()} ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

/** One MCP connection over plain HTTP: JSON-RPC posts, the session id from the first reply's header. */
function connection(name) {
  let sid = null;
  let id = 0;
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
    const ms = Date.now() - started;
    return { status: r.status, ms, bytes: Buffer.byteLength(raw), json: raw ? JSON.parse(raw) : null };
  }
  return {
    async init() {
      const r = await post({ jsonrpc: '2.0', id: ++id, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name, version: '1' } } });
      await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
      calls.push({ conn: name, method: 'initialize', status: r.status, ms: r.ms });
      return r;
    },
    async list() {
      const r = await post({ jsonrpc: '2.0', id: ++id, method: 'tools/list' });
      calls.push({ conn: name, method: 'tools/list', status: r.status, ms: r.ms, bytes: r.bytes });
      return r;
    },
    /** tools/call: {text, error, data, ms}. */
    async tool(tool, args = {}) {
      const r = await post({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: tool, arguments: args } });
      const res = r.json?.result ?? {};
      const text = (res.content ?? []).map((x) => x.text ?? '').join('\n');
      const row = { conn: name, method: tool, status: r.status, ms: r.ms, bytes: r.bytes, error: Boolean(res.isError || r.json?.error), code: res.structuredContent?.code ?? null };
      calls.push(row);
      console.log(`${at()} ${tool} -> HTTP ${r.status}, ${(r.ms / 1000).toFixed(1)} s, ${row.code ?? (row.error ? 'error' : 'ok')}: ${text.split('\n')[0].slice(0, 150)}`);
      return { text, error: row.error, data: res.structuredContent ?? null, ms: r.ms, rpcError: r.json?.error ?? null };
    },
  };
}

const inventoryOf = (txt) => {
  const i = String(txt).lastIndexOf('State (');
  const line = /^inventory: (.*)$/m.exec(i >= 0 ? txt.slice(i) : txt)?.[1] ?? '';
  return Object.fromEntries([...line.matchAll(/([a-z0-9_]+) (\d+)/g)].map((m) => [m[1], Number(m[2])]));
};
/** "collect confirmed, craft failed (why)" for a list of step reports. */
const outcomes = (list) => list.map((st) => `${st.skill} ${st.status}${st.status === 'confirmed' ? '' : ` (${String(st.result ?? st.why ?? '').slice(0, 160)})`}`).join(', ');
const woodNear = (txt) => /\b((?:dark_|pale_)?[a-z]+)_log \d/.exec(/^nearby blocks[^\n]*/m.exec(txt)?.[0] ?? '')?.[1] ?? 'oak';
/** get_state until nothing of the game's queue runs or waits; every step reported as finished, by its n. */
async function drain(conn, first) {
  const done = new Map();
  for (const st of first ?? []) if (['confirmed', 'failed', 'cancelled'].includes(st.status)) done.set(st.n, st);
  let r = null;
  for (let i = 0; i < 12; i++) {
    r = await conn.tool('get_state');
    for (const st of r.data?.earlier ?? []) done.set(st.n, st);
    if (!r.data?.queue?.running && !r.data?.queue?.waiting) break;
  }
  return { done, last: r };
}

let code = 0;
let game = null;
let a = null;
try {
  a = connection('muse-like-a');
  const init = await a.init();
  expect(init.status === 200 && init.json?.result?.serverInfo?.name, `initialize -> ${init.status} (${init.json?.result?.serverInfo?.name ?? '?'})`);
  const tl = await a.list();
  const names = (tl.json?.result?.tools ?? []).map((t) => t.name);
  expect(names.length === 7, `tools/list: ${names.join(', ')} (${(tl.bytes / 1024).toFixed(1)} KB)`);

  const start = await a.tool('start_game', { adult: true });
  game = /(?:New|Resumed) game (\w+)/.exec(start.text)?.[1] ?? null;
  const handle = /game: "([^"]+)"/.exec(start.text)?.[1] ?? null;
  let s = /still joining/.test(start.text) ? (await a.tool('get_state')).text : start.text;
  expect(game && handle && !Object.keys(inventoryOf(s)).length, `start_game: game ${game}, a handle, empty inventory`);

  const lv = JSON.parse((await a.tool('live_view')).text);
  const page = await fetch(lv.first_person_url, { signal: AbortSignal.timeout(20_000) });
  await page.arrayBuffer();
  const behind = await fetch(lv.behind_url, { signal: AbortSignal.timeout(20_000) });
  await behind.arrayBuffer();
  expect(page.status === 200 && behind.status === 200 && lv.first_person_url.startsWith(base), `live_view: both views ${page.status}/${behind.status} through ${new URL(base).host}`);

  const wood = woodNear(s);
  const route = [
    { skill: 'collect', args: { block: `${wood}_log`, n: 4 } },
    { skill: 'craft_batch', args: { items: [{ item: `${wood}_planks`, n: 12 }, { item: 'stick', n: 4 }, { item: 'crafting_table', n: 1 }, { item: 'wooden_pickaxe', n: 1 }] } },
  ];
  const rid = `muse-${game}-1`;
  // the re-send goes out 5 s later while the first call still runs, as a client sends again after a lost reply
  const pending = a.tool('play_sequence', { steps: route, request_id: rid });
  await sleep(5_000);
  const again = await a.tool('play_sequence', { steps: route, request_id: rid });
  const first = await pending;
  expect(!first.error && first.data?.steps?.length >= 2 && first.ms < 50_000, `play_sequence with request_id: ${first.data?.steps?.length ?? 0} steps, reply in ${(first.ms / 1000).toFixed(1)} s`);
  expect(/Already received/.test(again.text) && again.data?.duplicate, `the same call again 5 s later, while it ran: "Already received", duplicate ${JSON.stringify(again.data?.duplicate ?? null)}`);
  const other = await a.tool('play_sequence', { steps: [{ skill: 'collect', args: { block: `${wood}_log`, n: 1 } }], request_id: rid });
  expect(other.data?.code === 'BAD_ARGS' || /already used/.test(other.text), `the same request_id with other steps: refused (${other.data?.code ?? '?'})`);
  const d1 = await drain(a, first.data?.steps);
  const all1 = [...d1.done.values()];
  s = d1.last.text;
  const inv1 = inventoryOf(s);
  expect(all1.length >= 2 && all1.every((st) => st.status === 'confirmed') && inv1.wooden_pickaxe === 1, `get_state until done: ${outcomes(all1)}; wooden_pickaxe ${inv1.wooden_pickaxe ?? 0} (made once)`);

  const second = await a.tool('play_sequence', { steps: [{ skill: 'collect', args: { block: 'stone', n: 3 } }, { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } }], request_id: `muse-${game}-2` });
  const d2 = await drain(a, second.data?.steps);
  const all2 = [...d2.done.values()];
  expect(!second.error && all2.length >= 2 && all2.every((st) => st.status === 'confirmed') && inventoryOf(d2.last.text).stone_pickaxe === 1, `second play_sequence: ${outcomes(all2)}; stone_pickaxe ${inventoryOf(d2.last.text).stone_pickaxe ?? 0}`);

  // a new connection (Muse's client after a lost one) resumes the game by its handle
  const b = connection('muse-like-b');
  await b.init();
  const resumed = await b.tool('start_game', { adult: true, game: handle });
  expect(/Resumed game/.test(resumed.text) && inventoryOf(resumed.text).stone_pickaxe === 1, `a new connection resumes ${game} by its handle, inventory kept`);
  const old = await a.tool('get_state');
  expect(old.error && /moved to another connection/.test(old.text), `the old connection: ${old.text.split('\n')[0].slice(0, 100)}`);
  a = b;
  const end = await a.tool('end_game');
  expect(/Game ended/.test(end.text), 'end_game');
  game = null;
  const after = await a.tool('get_state');
  expect(after.error && /ended|no game/.test(after.text), `a call after the end: ${after.text.split('\n')[0].slice(0, 100)}`);
} catch (err) {
  console.error(`muse-session: ${err?.stack ?? err}`);
  code = 1;
} finally {
  if (game && a) await a.tool('end_game').catch(() => {});
}
const slowest = calls.reduce((m, c) => Math.max(m, c.ms), 0);
const failed = checks.filter((c) => !c.ok);
if (!code && failed.length) code = 2;
const result = { base, ok: code === 0, checks: checks.length, failed: failed.map((c) => c.what), calls: calls.length, slowestMs: slowest, seconds: Math.round((Date.now() - t0) / 100) / 10, at: new Date(t0).toISOString() };
console.log(`RESULT ${code === 0 ? 'PASS' : 'FAIL'}: ${checks.length - failed.length} of ${checks.length} checks, ${calls.length} HTTP calls, slowest ${(slowest / 1000).toFixed(1)} s, ${result.seconds} s in all`);
if (values.out) fs.writeFileSync(values.out, `${JSON.stringify({ ...result, calls, checks }, null, 1)}\n`);
await sleep(10);
process.exit(code);
