// test/e2e/two-starts.mjs - several MCP clients start a game at the same moment against a running agent; every bot
// must join (Paper's same-address join throttle once refused the second of two guests starting within 4 s). Each
// client starts, reads the state once, ends its game. Strict: every start is sent once; a full server's queue counts as
// a failure here (start this with free bots).
//
//   node test/e2e/two-starts.mjs http://127.0.0.1:8787 [--n 2]
//
// Exit codes: 0 every bot joined, 2 one did not, 1 the harness broke, 64 usage.

import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { connect, positionOf } from './mcp-iron.mjs';

export const USAGE = 'usage: node test/e2e/two-starts.mjs <agent base URL> [--n 2]';

/**
 * Start n games at once. Returns {ok, results: [{n, ok, game, position, line}]}.
 * @param {{url: string, n?: number, print?: (line: string) => void}} o
 */
export async function startTogether({ url, n = 2, print = console.log }) {
  const one = async (i) => {
    const c = await connect(url, `e2e-two-starts-${i}`);
    try {
      const text = (r) => r.content.map((x) => x.text ?? '').join('\n');
      const s = await c.callTool({ name: 'start_game', arguments: { adult: true } }, undefined, { timeout: 120_000 });
      const st = text(s);
      if (s.isError) return { n: i, ok: false, game: null, position: null, line: st.split('\n')[0].slice(0, 200) };
      const g = text(await c.callTool({ name: 'get_state', arguments: {} }, undefined, { timeout: 120_000 }));
      await c.callTool({ name: 'end_game', arguments: {} });
      const position = positionOf(g);
      return { n: i, ok: /^New game g\w+/.test(st) && Boolean(position), game: /game (g\w+)/.exec(st)?.[1] ?? null, position, line: st.split('\n')[0].slice(0, 120) };
    } finally {
      await c.close().catch(() => {});
    }
  };
  const results = await Promise.all(Array.from({ length: n }, (_, i) => one(i + 1)));
  for (const r of results) print(`${r.n}: ${r.ok ? 'joined' : 'FAILED'}: ${r.line}${r.position ? ` | position ${r.position.x} ${r.position.y} ${r.position.z}` : ''}`);
  return { ok: results.every((r) => r.ok) && new Set(results.map((r) => r.game)).size === n, results };
}

/** The CLI. Returns an exit code. */
export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({ args: argv, allowPositionals: true, strict: true, options: { n: { type: 'string' }, help: { type: 'boolean', short: 'h' } } }));
  } catch (err) { printErr(`${err.message}\n${USAGE}`); return 64; }
  if (values.help || positionals.length !== 1) { (values.help ? print : printErr)(USAGE); return values.help ? 0 : 64; }
  const n = values.n ? Number(values.n) : 2;
  if (!Number.isInteger(n) || n < 2 || n > 8) { printErr('--n must be 2 to 8'); return 64; }
  try {
    const r = await startTogether({ url: positionals[0], n, print });
    print(`RESULT ${r.ok ? 'PASS' : 'FAIL'}: ${r.results.filter((x) => x.ok).length} of ${n} bots joined`);
    return r.ok ? 0 : 2;
  } catch (err) {
    printErr(`harness error: ${err?.message ?? err}`);
    return 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  if (!process.argv[2] && process.env.NODE_TEST_CONTEXT) process.exit(0);
  process.exit(await main());
}
