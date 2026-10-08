// lib.mjs - shared pieces of the Tst_rv benches: the server console (write a line, read the answer from the log), the
// server's record of a player inventory or a container (SNBT), and MCP calls that wait out pending actions.
import fs from 'node:fs';
import { connect } from './mcp.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
// the spike servers (README "Reproduce"); PAPER_DIR / VANILLA_DIR point elsewhere
export const DIRS = {
  paper: process.env.PAPER_DIR ?? `${process.env.HOME}/picasso-work/spike/paper-25566`,
  van: process.env.VANILLA_DIR ?? `${process.env.HOME}/picasso-work/spike/vanilla-25567`,
};

export function consoleOf(server) {
  const DIR = DIRS[server];
  /** One console line; resolves with the first new log line matching `want` (or null after `ms`). */
  return async function con(line, want = null, ms = 4000) {
    const log = `${DIR}/server.log`;
    const from = fs.statSync(log).size;
    fs.writeFileSync(`${DIR}/console.in`, `${line}\n`);
    if (!want) { await sleep(120); return null; }
    const until = Date.now() + ms;
    while (Date.now() < until) {
      await sleep(60);
      const size = fs.statSync(log).size;
      if (size <= from) continue;
      const fd = fs.openSync(log, 'r');
      const buf = Buffer.alloc(size - from);
      fs.readSync(fd, buf, 0, buf.length, from);
      fs.closeSync(fd);
      const hit = strip(buf.toString('utf8')).split('\n').find((l) => want.test(l));
      if (hit) return hit;
    }
    return null;
  };
}

/** Top-level {...} entries of an SNBT list, with nested compounds removed. */
function entries(list) {
  const out = [];
  let depth = 0; let cur = ''; let str = false;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i];
    if (str) { if (depth === 1) cur += ch; if (ch === '\\') { if (depth === 1) cur += list[i + 1]; i++; } else if (ch === '"') str = false; continue; }
    if (ch === '"') { str = true; if (depth === 1) cur += ch; continue; }
    if (ch === '{') { depth++; if (depth === 1) cur = ''; continue; }
    if (ch === '}') { depth--; if (depth === 0) out.push(cur); continue; }
    if (depth === 1) cur += ch;
  }
  return out;
}

function parseItems(list, slotOk = () => true) {
  const inv = new Map();
  for (const e of entries(list)) {
    const id = /id: "minecraft:([a-z0-9_]+)"/.exec(e)?.[1];
    const n = Number(/count: (\d+)/.exec(e)?.[1] ?? 1);
    const slot = Number(/Slot: (-?\d+)b/.exec(e)?.[1] ?? 0);
    if (id && slotOk(slot)) inv.set(id, (inv.get(id) ?? 0) + n);
  }
  return inv;
}

/** The server's record of a player's main inventory and hotbar (slots 0-35): Map name -> count. */
export async function serverInventory(con, bot) {
  for (let t = 0; t < 3; t++) {
    const line = await con(`data get entity ${bot} Inventory`, new RegExp(`${bot} has the following entity data: `));
    if (!line) continue;
    return parseItems(line.slice(line.indexOf('entity data: ') + 13), (s) => s >= 0 && s <= 35);
  }
  throw new Error('no answer from the server console');
}

/** The server's record of a container block's items: Map name -> count (empty map for an empty container). */
export async function serverBlockItems(con, x, y, z) {
  for (let t = 0; t < 3; t++) {
    const line = await con(`data get block ${x} ${y} ${z} Items`, new RegExp(`${x}, ${y}, ${z} has the following block data: |Found no elements matching Items`));
    if (!line) continue;
    if (/Found no elements/.test(line)) return new Map();
    return parseItems(line.slice(line.indexOf('block data: ') + 12));
  }
  throw new Error('no answer from the server console');
}

/** The server's record of a container block's slots: Map slot -> {name, count}. */
export async function serverBlockSlots(con, x, y, z) {
  const line = await con(`data get block ${x} ${y} ${z} Items`, new RegExp(`${x}, ${y}, ${z} has the following block data: |Found no elements matching Items`));
  const out = new Map();
  if (!line || /Found no elements/.test(line)) return out;
  for (const e of entries(line.slice(line.indexOf('block data: ') + 12))) {
    const id = /id: "minecraft:([a-z0-9_]+)"/.exec(e)?.[1];
    const slot = Number(/Slot: (-?\d+)b/.exec(e)?.[1]);
    if (id) out.set(slot, { name: id, count: Number(/count: (\d+)/.exec(e)?.[1] ?? 1) });
  }
  return out;
}

export async function mcp(url, label) {
  const c = await connect(url);
  let sid = 0;
  const call = async (name, args) => {
    const r = await c.callTool({ name, arguments: { response_format: 'json', rationale: 'Bench: window flows.', ...args } }, undefined, { timeout: 600000 });
    return r.structuredContent?.response?.data ?? r.structuredContent;
  };
  return {
    close: () => c.close(),
    call,
    /** A foreground action, waited out to its result. */
    async act(name, args) {
      let data = await call(name, { ...args, submission_id: `${label}-${Date.now()}-${++sid}`, wait_timeout_ms: 120000 });
      while (data?.state === 'pending' || data?.state === 'accepted' || data?.state === 'running') {
        const id = data.actionId ?? data.action_id ?? data.progress?.actionId;
        data = await call('wait_for_action', { action_id: id, timeout_ms: 120000 });
      }
      return data;
    },
    async inventory() {
      const d = await call('view_status', {});
      const inv = new Map();
      for (const s of d?.result?.situation?.inventory?.stacks ?? []) if (s.slot >= 9 && s.slot <= 44) inv.set(s.name, (inv.get(s.name) ?? 0) + s.count);
      return inv;
    },
  };
}

export const same = (a, b) => [...new Set([...a.keys(), ...b.keys()])].every((k) => (a.get(k) ?? 0) === (b.get(k) ?? 0));
export const show = (m) => [...m].filter(([, v]) => v).sort().map(([k, v]) => `${k}:${v}`).join(' ');
export const resultOf = (data) => data?.output?.result ?? data?.result ?? data;

/** A stone platform in the sky with air above it; the bot stands at its centre. */
export async function platform(con, bot, X, Y, Z) {
  await con(`forceload add ${X} ${Z}`);
  await con(`fill ${X - 5} ${Y - 1} ${Z - 5} ${X + 5} ${Y - 1} ${Z + 5} minecraft:stone`);
  await con(`fill ${X - 5} ${Y} ${Z - 5} ${X + 5} ${Y + 4} ${Z + 5} minecraft:air`);
  await con(`kill @e[type=item,x=${X - 8},y=${Y - 3},z=${Z - 8},dx=16,dy=10,dz=16]`);
  await con(`clear ${bot}`);
  await con(`tp ${bot} ${X + 0.5} ${Y} ${Z + 0.5}`);
}
