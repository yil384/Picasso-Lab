// test/e2e/mcp-iron.mjs - the scripted iron-pickaxe route through a running agent's MCP endpoint, with no model: start a
// game, collect logs, craft planks, sticks, a table and a wooden pickaxe, collect stone, craft a stone pickaxe and a
// furnace, collect iron ore (going deeper while none is found), coal if there is none, smelt, craft the iron pickaxe,
// end the game. Strict by default (ROADMAP, testing rules): every step is sent once, a mob's hit is not fought back by
// the harness, and every step that fails counts. --lenient is the old harness: each step up to 4 times, fighting back
// when attacked. One line per step with the time since the start, then a RESULT line; --out writes the steps, their
// times and the totals as JSON. Waiting is not retrying: a step still running is waited for with get_state, and a full
// server's queue is asked again as it says.
//
//   node test/e2e/mcp-iron.mjs http://127.0.0.1:8787 [--lenient] [--out run.json] [--minutes 15] [--name e2e-iron]
//
// Exit codes: 0 the iron pickaxe was made (strict: with no failed step), 2 it was not, 1 the harness broke, 64 usage.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const USAGE = `usage: node test/e2e/mcp-iron.mjs <agent base URL> [--lenient] [--out run.json] [--minutes 15] [--name e2e-iron]

  --lenient    retry each step up to 4 times and fight back when attacked (the old harness); default strict
  --out FILE   the steps, their times and the totals as JSON
  --minutes N  give up after N minutes (default 15)
  --name NAME  the MCP client name the agent logs (default e2e-iron)`;

/** get_state calls (each waits up to the server's 45 s) for one step that is still running. */
const WAIT_CALLS = 8;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** The state block of a reply: from its "State (game ...)" line on, or the whole text. */
export function stateOf(txt) {
  const i = String(txt).lastIndexOf('State (');
  return i >= 0 ? txt.slice(i) : String(txt);
}

/** The inventory in a reply's state, as {item: count}. */
export function inventoryOf(txt) {
  const line = /^inventory: (.*)$/m.exec(stateOf(txt))?.[1] ?? '';
  const out = {};
  for (const m of line.matchAll(/([a-z0-9_]+) (\d+)/g)) out[m[1]] = Number(m[2]);
  return out;
}
export const has = (txt, item) => (inventoryOf(txt)[item] ?? 0) > 0;

/** The bot's block position in a reply's state, or null. */
export function positionOf(txt) {
  const m = /^position (-?\d+) (-?\d+) (-?\d+)/m.exec(stateOf(txt));
  return m ? { x: Number(m[1]), y: Number(m[2]), z: Number(m[3]) } : null;
}

/** The wood nearby in a reply's state ("birch" for birch_log), default oak. */
export function woodOf(txt) {
  const near = /^nearby blocks[^\n]*/m.exec(stateOf(txt))?.[0] ?? '';
  return /\b((?:dark_|pale_)?[a-z]+)_log \d/.exec(near)?.[1] ?? 'oak';
}

/** A play reply's own result line (after any "Finished since your last call" block, before the state). */
export function playLine(txt) {
  return String(txt).split('\n\nState (')[0].replace(/^Finished since your last call:\n[\s\S]*?\n\n/, '').trim();
}

/** In a get_state reply, the result of the step that outlived its call, once it finished; null while it runs. */
export function finishedLine(txt, skill) {
  const block = /^Finished since your last call:\n([\s\S]*?)\n\n/.exec(String(txt))?.[1] ?? '';
  // a step of a call of several steps carries the caller's number ("4. "), a craft the check added "+ "
  return block.split('\n').map((l) => l.replace(/^(?:\d+(?: \(part \d+ of \d+\))?\. |\+ )/, '')).filter((l) => l.startsWith(`${skill} `)).at(-1) ?? null;
}

/** An MCP client on the agent's /mcp. */
export async function connect(url, name = 'e2e') {
  const c = new Client({ name, version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${String(url).replace(/\/+$/, '')}/mcp`)));
  return c;
}

/**
 * Run the route once. Returns {ok, made, strict, seconds, calls, failed, steps, inventory, game}.
 * @param {{url: string, strict?: boolean, print?: (line: string) => void, minutes?: number, name?: string}} o
 */
export async function runIronRoute({ url, strict = true, print = console.log, minutes = 15, name = 'e2e-iron' }) {
  const t0 = Date.now();
  const deadline = t0 + minutes * 60_000;
  const sec = () => Math.round((Date.now() - t0) / 100) / 10;
  const steps = [];
  let calls = 0;
  let s = '';
  let game = null;
  const c = await connect(url, name);
  const call = async (tool, args = {}) => {
    calls += 1;
    const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 120_000 });
    return { text: r.content.map((x) => x.text ?? '').join('\n'), isError: Boolean(r.isError) };
  };

  /** One skill: sent once (strict) or up to 4 times (lenient); a step still running is waited for. */
  async function step(skill, args) {
    for (let attempt = 1; attempt <= (strict ? 1 : 4); attempt++) {
      if (Date.now() > deadline) throw new Error(`the run took longer than ${minutes} min`);
      const t1 = Date.now();
      let r = await call('play', { skill, args });
      s = r.text;
      let line = playLine(r.text);
      for (let w = 0; w < WAIT_CALLS && /still running/.test(line); w++) {
        r = await call('get_state');
        s = r.text;
        line = finishedLine(r.text, skill) ?? `${skill} ${JSON.stringify(args)}: still running after ${Math.round((Date.now() - t1) / 1000)} s`;
      }
      const ok = /: ok: /.test(line);
      steps.push({ skill, args, ok, attempt, s: Math.round((Date.now() - t1) / 100) / 10, at: sec(), line: line.slice(0, 400) });
      print(`[${sec()} s] ${ok ? 'ok    ' : 'FAILED'} ${line.slice(0, 200)}`);
      if (ok) return true;
      const mob = /a (\w+) is attacking you/.exec(line);
      if (!strict && mob) {
        for (let k = 0; k < 3; k++) {
          const f = await call('play', { skill: 'attack', args: { target: mob[1] } });
          s = f.text;
          print(`[${sec()} s]   fought back: ${playLine(f.text).slice(0, 160)}`);
          if (!/is attacking you/.test(playLine(f.text))) break;
        }
      }
    }
    return false;
  }

  try {
    let r = await call('start_game', { adult: true });
    // a full server answers with a place in the queue: asking again keeps it (waiting, not a retry)
    while (/in the queue/.test(r.text) && Date.now() < deadline) {
      print(`[${sec()} s] waiting: ${r.text.slice(0, 160)}`);
      await sleep(20_000);
      r = await call('start_game', { adult: true });
    }
    if (!strict) for (let i = 0; i < 20 && r.isError && /could not start/.test(r.text); i++) { await sleep(5_000); r = await call('start_game', { adult: true }); }
    if (r.isError) throw new Error(`start_game: ${r.text.slice(0, 300)}`);
    s = r.text;
    game = /game (g\w+)/.exec(s)?.[1] ?? null;
    print(`[${sec()} s] ${s.split('\n')[0].slice(0, 100)}; ${/^position [^\n]*/m.exec(stateOf(s))?.[0] ?? ''}`);
    if (/still joining/.test(s)) { r = await call('get_state'); s = r.text; }

    const wood = woodOf(s);
    await step('collect', { block: `${wood}_log`, n: 6 });
    await step('craft', { item: `${wood}_planks`, n: 20 });
    await step('craft', { item: 'stick', n: 8 });
    await step('craft', { item: 'crafting_table', n: 1 });
    await step('craft', { item: 'wooden_pickaxe', n: 1 });
    await step('collect', { block: 'stone', n: 12 });
    await step('craft', { item: 'stone_pickaxe', n: 1 });
    await step('craft', { item: 'furnace', n: 1 });
    // iron is underground: when none is found, go about 14 blocks lower and look again (the route, not a retry)
    for (let i = 0; i < 4 && (inventoryOf(s).raw_iron ?? 0) < 3; i++) {
      if (await step('collect', { block: 'iron_ore', n: 3 - (inventoryOf(s).raw_iron ?? 0) })) continue;
      const p = positionOf(s);
      if (p) await step('go_to', { x: p.x + 3, y: p.y - 14, z: p.z + 3 });
    }
    if (!has(s, 'coal') && !has(s, 'charcoal')) await step('collect', { block: 'coal_ore', n: 2 });
    await step('smelt', { item: 'raw_iron', n: 3 });
    await step('craft', { item: 'iron_pickaxe', n: 1 });
  } finally {
    await call('end_game').catch(() => {});
    await c.close().catch(() => {});
  }
  const made = has(s, 'iron_pickaxe');
  const failed = steps.filter((x) => !x.ok).length;
  return { ok: made && (!strict || failed === 0), made, strict, seconds: sec(), calls, failed, steps, inventory: inventoryOf(s), game };
}

/** The CLI. Returns an exit code. */
export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      args: argv, allowPositionals: true, strict: true,
      options: { lenient: { type: 'boolean' }, out: { type: 'string' }, minutes: { type: 'string' }, name: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
    }));
  } catch (err) { printErr(`${err.message}\n\n${USAGE}`); return 64; }
  if (values.help || positionals.length !== 1) { (values.help ? print : printErr)(USAGE); return values.help ? 0 : 64; }
  const minutes = values.minutes ? Number(values.minutes) : 15;
  if (!(minutes > 0)) { printErr('--minutes must be a positive number'); return 64; }
  let run;
  try {
    run = await runIronRoute({ url: positionals[0], strict: !values.lenient, print, minutes, name: values.name ?? 'e2e-iron' });
  } catch (err) {
    printErr(`harness error: ${err?.message ?? err}`);
    return 1;
  }
  print(`RESULT ${run.ok ? 'PASS' : 'FAIL'} (${run.strict ? 'strict' : 'lenient'}): ${run.seconds} s, ${run.calls} MCP calls, ${run.failed} failed step(s), iron pickaxe ${run.made ? 'made' : 'not made'}; game ${run.game}`);
  if (values.out) fs.writeFileSync(values.out, `${JSON.stringify({ ...run, url: positionals[0], at: new Date().toISOString() }, null, 2)}\n`);
  return run.ok ? 0 : 2;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  // run by node --test without a URL (a test runner that collects every file under test/): nothing to do
  if (!process.argv[2] && process.env.NODE_TEST_CONTEXT) process.exit(0);
  process.exit(await main());
}
