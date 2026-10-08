// Strict scripted iron-pickaxe route through mine-ai-mcp's MCP tools (no model, no retries).
// Usage: MCP_URL=http://127.0.0.1:25693/mcp node iron-route.mjs <label>  -> runs/<label>.json (cwd) with every call,
// its duration and outcome. Copied from the M0 spike (~/picasso-work/spike/scripts) with only the client changed.
import { connect } from './mcp.mjs';
import fs from 'node:fs';
const label = process.argv[2] || `run-${Date.now()}`;
const c = await connect(process.env.MCP_URL || 'http://127.0.0.1:25693/mcp');
const calls = []; const t0 = Date.now(); let n = 0;
const sid = () => `${label}-${++n}`;
async function raw(name, args) {
  const s = Date.now();
  const r = await c.callTool({ name, arguments: { response_format: 'json', ...args } }, undefined, { timeout: 600000 });
  const data = r.structuredContent?.response?.data ?? r.structuredContent;
  calls.push({ name, args: { ...args, rationale: undefined }, ms: Date.now() - s, at: (s - t0) / 1000 });
  return { r, data };
}
function summarize(out) {
  const o = out?.output?.result ?? out?.output ?? out;
  const msg = o?.message ?? o?.error ?? o?.reason ?? (o?.status === 'succeeded' ? '' : JSON.stringify(o));
  return { status: o?.status ?? out?.state, message: String(msg ?? '').slice(0, 600) };
}
const CRAFT_TRIES = Number(process.env.CRAFT_TRIES || 1); const retried = [];
async function act(name, args) {
  for (let t = 1; ; t++) {
    const r = await act1(name, args);
    if (r.ok || name !== 'craft_item' || t >= CRAFT_TRIES || !/expected crafting result/.test(r.message)) return r;
    retried.push({ step: name, try: t, message: r.message.slice(0, 160) });
  }
}
async function act1(name, args) {
  const s = Date.now();
  let { data } = await raw(name, { ...args, submission_id: sid(), wait_timeout_ms: 120000, rationale: `Spike route step: ${name}` });
  let waits = 0;
  while (data?.state === 'pending' || data?.state === 'accepted') {
    const id = data.actionId ?? data.action_id ?? data.progress?.actionId;
    ({ data } = await raw('wait_for_action', { action_id: id, timeout_ms: 120000, rationale: 'Spike: wait for the running step.' }));
    waits++;
  }
  const sum = summarize(data);
  const row = { step: name, args, seconds: (Date.now() - s) / 1000, waits, ...sum };
  console.log(JSON.stringify(row));
  fs.mkdirSync('runs/raw', { recursive: true });
  fs.writeFileSync(`runs/raw/${label}-${n}-${name}.json`, JSON.stringify(data, null, 1));
  return { data, ok: /succeeded|success/.test(String(sum.status)), message: sum.message };
}
async function inv() {
  const { data } = await raw('view_status', { rationale: 'Spike: inventory.' });
  return data?.result?.situation?.inventory?.stacks ?? [];
}
const steps = [];
const run = async () => {
  const ok = (x) => { steps.push(x); if (!x.ok) throw new Error('step failed'); };
  ok(await act('collect_block', { block_name: 'logs', count: 5 }));
  ok(await act('craft_item', { items: [{ item_name: 'crafting_table', count: 1 }] }));
  ok(await act('craft_item', { items: [{ item_name: 'wooden_pickaxe', count: 1 }, { item_name: 'stick', count: 4 }], temporary_workstation: true }));
  ok(await act('collect_block', { block_name: 'stone', count: 11 }));
  ok(await act('craft_item', { items: [{ item_name: 'stone_pickaxe', count: 1 }, { item_name: 'furnace', count: 1 }], temporary_workstation: true }));
  ok(await act('collect_block', { block_name: 'iron_ore', count: 3 }));
  const stacks = (await inv()).map(s => ({ name: s.item ?? s.name ?? s.itemName, count: s.count }));
  const have = (re, n) => stacks.find(s => re.test(s.name || '') && s.count >= n)?.name;
  const fuel = have(/^(coal|charcoal)$/, 1) || have(/_planks$/, 2) || have(/_log$/, 2) || 'oak_planks';
  ok(await act('smelt_item', { item_name: 'raw_iron', count: 3, fuel_item_name: fuel, temporary_workstation: true }));
  ok(await act('craft_item', { items: [{ item_name: 'iron_pickaxe', count: 1 }], temporary_workstation: true }));
};
let error = null;
try { await run(); } catch (e) { error = String(e.message || e); }
const total = (Date.now() - t0) / 1000;
const out = { label, total, error, craftTries: CRAFT_TRIES, retried, foregroundSteps: steps.length, toolCalls: calls.length, calls, finalInventory: await inv() };
fs.mkdirSync('runs', { recursive: true });
fs.writeFileSync(`runs/${label}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ label, total, error, retried: retried.length, foregroundSteps: steps.length, toolCalls: calls.length }));
await c.close();
