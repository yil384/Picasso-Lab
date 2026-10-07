// scripts/staging-check.mjs - the checks deploy/push.sh runs on staging before anything goes to production (ROADMAP
// M0 item 9): the landing page answers, openapi.json points at the host it was asked on (WEB_PUBLIC_URL is staging's,
// not production's), /mcp initializes and lists the game tools, and a scripted game with no model gets a wooden
// pickaxe from an empty inventory through play_sequence. Strict: no step is retried and nothing fights back, so a
// failed step (a mob hit included) fails the check. The game is always ended, so its bot leaves the server.
//
//   node scripts/staging-check.mjs                                    # https://play-staging.picasso-lab.com
//   node scripts/staging-check.mjs https://play-staging.picasso-lab.com --no-game   # page, openapi.json, /mcp only
//   node scripts/staging-check.mjs http://127.0.0.1:8787              # a local agent (npm start -- --fake-bot)
//
// Exit 0: every check passed; 1: one failed (the reason is printed); 2: refused (bad arguments, the production host).
// Production (play.picasso-lab.com) is refused: its bots belong to real users.

import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LOGS } from '../src/game.js';

export const STAGING_URL = 'https://play-staging.picasso-lab.com';
export const PRODUCTION_HOSTS = Object.freeze(['play.picasso-lab.com']);
export const GAME_TOOLS = Object.freeze(['start_game', 'play', 'play_sequence', 'get_state', 'stop', 'end_game']);

/** The route from an empty inventory to a wooden pickaxe with logs of one kind: 12 planks, 4 sticks, a table, the pickaxe. */
export function pickaxeSteps(wood) {
  return [
    { skill: 'collect', args: { block: `${wood}_log`, n: 3 } },
    { skill: 'craft', args: { item: `${wood}_planks`, n: 12 } },
    { skill: 'craft', args: { item: 'stick', n: 4 } },
    { skill: 'craft', args: { item: 'crafting_table', n: 1 } },
    { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
  ];
}

const lastMatch = (text, re) => [...String(text).matchAll(re)].at(-1);

/** The inventory in the last state block of a reply: {item: count}. */
export function inventoryOf(text) {
  const m = lastMatch(text, /^inventory: (.*)$/gm);
  const inv = {};
  if (!m || m[1] === 'empty') return inv;
  for (const part of m[1].split(', ')) {
    const p = /^(\w+) (\d+)$/.exec(part.trim());
    if (p) inv[p[1]] = Number(p[2]);
  }
  return inv;
}

/** The wood to cut: the nearest kind of log the bot may collect with at least 3 blocks within reach, or null. */
export function woodNear(text) {
  const m = lastMatch(text, /^nearby blocks \(within \d+\): (.*)$/gm);
  if (!m) return null;
  let best = null;
  for (const part of m[1].split('; ')) {
    const p = /^(\w+)_log (\d+)\+? \(nearest ([\d.]+) away/.exec(part.trim());
    if (!p || !LOGS.includes(`${p[1]}_log`) || Number(p[2]) < 3) continue;
    if (!best || Number(p[3]) < best.distance) best = { wood: p[1], distance: Number(p[3]) };
  }
  return best?.wood ?? null;
}

/**
 * The numbered step lines of a play_sequence reply: {n, skill, outcome: ok|FAILED|still running|not run, line}.
 * Lines look like `2. craft {"item":"stick","n":4}: ok: ...`, `1. collect {...}: still running after 44 s ...` and
 * `3. craft: not run: ...`.
 */
export function stepLines(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = /^(\d+)\. (\w+)(?: \{.*?\})?: (ok|FAILED|still running|not run)\b/.exec(line);
    if (m) out.push({ n: Number(m[1]), skill: m[2], outcome: m[3], line });
  }
  return out;
}

/** The results a reply carries for skills that outlived an earlier call ("Finished since your last call:"). */
export function finishedLines(text) {
  const block = /Finished since your last call:\n([\s\S]*?)\n\n/.exec(String(text));
  if (!block) return [];
  return block[1].split('\n').map((line) => {
    const m = /^(\w+)(?: \{.*?\})?: (ok|FAILED)\b/.exec(line);
    return m ? { skill: m[1], outcome: m[2], line } : null;
  }).filter(Boolean);
}

class CheckFailed extends Error {}
const fail = (msg) => { throw new CheckFailed(msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const short = (s, n = 170) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);

/**
 * Run the checks against `base`. Returns the exit code: 0 passed, 1 a check failed (said through `print`), 2 refused.
 * @param {{base?: string, game?: boolean, minutes?: number, print?: (line: string) => void}} [opts]
 */
export async function runCheck({ base = STAGING_URL, game: playGame = true, minutes = 8, print = console.log } = {}) {
  base = String(base).replace(/\/+$/, '');
  let url;
  try { url = new URL(base); } catch { print(`refused: not a URL: ${base}`); return 2; }
  if (PRODUCTION_HOSTS.includes(url.hostname)) {
    print(`refused: ${url.hostname} is production; these checks start a test bot and belong on staging`);
    return 2;
  }
  if (!(minutes > 0 && minutes <= 30)) { print('refused: minutes must be more than 0 and at most 30'); return 2; }
  try {
    return await checks(base, playGame, minutes, print);
  } catch (e) {
    print(`staging-check: FAIL: ${e instanceof CheckFailed ? e.message : e.stack ?? e}`);
    return 1;
  }
}

async function checks(base, playGame, minutes, print) {
  const deadline = Date.now() + minutes * 60_000;
  const t0 = Date.now();
  const at = () => `[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)} s]`;
  const say = (msg) => print(`${at()} ${msg}`);
  const left = () => deadline - Date.now();

  // 1. the page (Caddy answers 502 while the agent restarts, and the first request on a new host waits for its cert)
  let page = null;
  for (let tries = 0; ; tries++) {
    try {
      const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(15_000) });
      if (r.ok) { page = await r.text(); break; }
      if (tries === 0 || tries % 6 === 0) say(`GET / -> HTTP ${r.status}; waiting for the agent`);
    } catch (e) {
      if (tries === 0 || tries % 6 === 0) say(`GET / -> ${e.cause?.code ?? e.message}; waiting for the agent`);
    }
    if (tries >= 24 || left() < 60_000) fail('the page did not answer HTTP 200 within 2 minutes');
    await sleep(5_000);
  }
  if (!/<title>Muse plays Minecraft<\/title>/.test(page)) fail('GET / answered, but not with the Muse plays Minecraft page');
  say('GET / -> 200, the landing page');

  // 2. openapi.json names this host as its server: links, the agent prompt and session URLs point here
  const api = await fetch(`${base}/openapi.json`, { signal: AbortSignal.timeout(15_000) });
  if (!api.ok) fail(`GET /openapi.json -> HTTP ${api.status}`);
  const server = (await api.json())?.servers?.[0]?.url?.replace(/\/+$/, '');
  if (server !== base) fail(`openapi.json names ${server} as its server, not ${base} (WEB_PUBLIC_URL)`);
  say(`GET /openapi.json -> server ${server}`);

  // 3. MCP: initialize and list the tools
  const client = new Client({ name: 'staging-check', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  let calls = 0;
  let game = null;
  const call = async (name, args = {}) => {
    calls++;
    const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 70_000 });
    return { error: Boolean(r.isError), text: r.content?.map((c) => c.text ?? '').join('\n') ?? '' };
  };
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name);
    const missing = GAME_TOOLS.filter((t) => !tools.includes(t));
    if (missing.length) fail(`/mcp lists ${tools.join(', ')}; missing ${missing.join(', ')}`);
    const sv = client.getServerVersion();
    say(`/mcp -> initialized (${sv?.name ?? '?'} ${sv?.version ?? ''}), tools: ${tools.join(', ')}`);
    if (!playGame) { say('PASS (no game)'); return 0; }

    // 4. a game: start (waiting while Paper boots), find wood, then the wooden pickaxe route
    let r;
    let wood = null;
    for (let spot = 1; !wood; spot++) {
      for (;;) {
        r = await call('start_game', { adult: true });
        if (!r.error) break;
        if (!/could not start/.test(r.text) || left() < 120_000) fail(`start_game: ${short(r.text.split('\n')[0])}`);
        say(`start_game: ${short(r.text.split('\n')[0], 120)}; trying again in 5 s`);
        await sleep(5_000);
      }
      game = /(?:New|Resumed) game (\w+)/.exec(r.text)?.[1] ?? '?';
      if (/still joining/.test(r.text)) r = await call('get_state');
      if (r.error) fail(`get_state after start_game: ${short(r.text.split('\n')[0])}`);
      const pos = lastMatch(r.text, /^position (-?\d+ -?\d+ -?\d+)/gm)?.[1] ?? '?';
      wood = woodNear(r.text);
      const inv = inventoryOf(r.text);
      if (Object.keys(inv).length) fail(`game ${game} did not start with an empty inventory: ${JSON.stringify(inv)}`);
      say(`start_game -> game ${game} at ${pos}, empty inventory, ${wood ? `${wood} logs nearby` : 'no logs within reach'}`);
      if (wood) break;
      if (spot >= 3) fail('three spots in a row had no logs within reach');
      await call('end_game');
      game = null;
    }
    const tGame = Date.now();
    const steps = pickaxeSteps(wood);
    let next = 0; // the first step not confirmed yet
    let running = null; // the step that outlived its call
    while (next < steps.length) {
      if (left() <= 0) fail(`out of time (${minutes} min) with ${steps.length - next} steps to go`);
      if (running !== null) {
        r = await call('get_state');
        if (r.error) fail(`get_state: ${short(r.text.split('\n')[0])}`);
        const done = finishedLines(r.text).find((f) => f.skill === steps[running].skill);
        if (!done) {
          if (/is still running/.test(r.text)) continue;
          fail(`lost the result of step ${running + 1} (${steps[running].skill})`);
        }
        say(short(`${running + 1}. ${done.line}`));
        if (done.outcome !== 'ok') fail(`step ${running + 1} failed (strict: no retries)`);
        next = running + 1;
        running = null;
        continue;
      }
      r = await call('play_sequence', { steps: steps.slice(next) });
      const lines = stepLines(r.text);
      if (!lines.length) fail(`play_sequence: no step results in ${short(r.text.split('\n')[0])}`);
      const from = next;
      for (const l of lines) {
        const i = from + l.n - 1;
        if (l.outcome === 'ok') { say(short(`${i + 1}. ${l.line.replace(/^\d+\. /, '')}`)); next = i + 1; continue; }
        if (l.outcome === 'still running') { say(short(`${i + 1}. ${l.line.replace(/^\d+\. /, '')}`, 110)); running = i; break; }
        if (l.outcome === 'not run' && /no time was left/.test(l.line)) break; // sent again with the next call
        say(short(`${i + 1}. ${l.line.replace(/^\d+\. /, '')}`, 400));
        fail(`step ${i + 1} ${l.outcome === 'FAILED' ? 'failed' : 'could not start'} (strict: no retries)`);
      }
    }
    r = await call('get_state');
    const inv = inventoryOf(r.text);
    if (!(inv.wooden_pickaxe >= 1)) fail(`the route ran, but the inventory has no wooden pickaxe: ${JSON.stringify(inv)}`);
    say(`PASS: wooden pickaxe in ${((Date.now() - tGame) / 1000).toFixed(1)} s from the first action, ${calls} MCP calls in all (game ${game}); inventory ${JSON.stringify(inv)}`);
    return 0;
  } finally {
    if (game) {
      try { await call('end_game'); say(`end_game -> game ${game} ended, its bot left`); } catch (e) { say(`end_game failed: ${e.message}`); }
    }
    await client.close().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { 'no-game': { type: 'boolean', default: false }, minutes: { type: 'string', default: '8' } },
  });
  const minutes = Number(values.minutes);
  // a call that never comes back must not keep a deploy waiting: give up a minute and a half after the time limit
  setTimeout(() => { console.error('staging-check: FAIL: hung past its time limit'); process.exit(1); }, (minutes || 8) * 60_000 + 90_000).unref();
  process.exitCode = await runCheck({ base: positionals[0] ?? STAGING_URL, game: !values['no-game'], minutes });
}
