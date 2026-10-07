// test/mcp.test.js - the MCP endpoint end to end against the fake world: tools listed, start_game, play and
// play_sequence answer with result + state, bad skills are refused, two MCP sessions from one address both get a bot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';

async function connect(url) {
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  return c;
}
const text = (r) => r.content.map((x) => x.text).join('\n');

test('mcp: start_game, play, play_sequence, refusals, one bot per MCP session', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const a = await connect(agent.url);
  const b = await connect(agent.url);
  try {
    const names = (await a.listTools()).tools.map((t) => t.name).sort();
    assert.deepEqual(names, ['end_game', 'get_state', 'play', 'play_sequence', 'start_game', 'stop']);

    const none = await a.callTool({ name: 'play', arguments: { skill: 'eat' } });
    assert.equal(none.isError, true);
    assert.match(text(none), /call start_game first/);

    const s = text(await a.callTool({ name: 'start_game', arguments: {} }));
    assert.match(s, /Game g\w+ started/);
    assert.match(s, /\/eyes\/g\w+\//);
    assert.match(s, /State:\n[\s\S]*inventory/);
    assert.match(s, /- collect\(block: one of /);

    const one = text(await a.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 2 } } }));
    assert.match(one, /^collect \{"block":"oak_log","n":2\}: ok/);
    assert.match(one, /\n\nState:\n[\s\S]*oak_log/);

    const bad = text(await a.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'diamond_block; drop', n: 1 } } }));
    assert.match(bad, /not run, bad arguments/);

    const seq = text(await a.callTool({ name: 'play_sequence', arguments: { steps: [
      { skill: 'craft', args: { item: 'oak_planks', n: 4 } },
      { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } },
      { skill: 'craft', args: { item: 'stick', n: 4 } },
    ] } }));
    assert.match(seq, /^1\. craft .*: ok/m);
    assert.match(seq, /^2\. craft .*FAILED/m);
    assert.match(seq, /1 step\(s\) not run yet/);

    // a second MCP session from the same address gets its own bot (connector users share the agent's addresses)
    const sb = text(await b.callTool({ name: 'start_game', arguments: {} }));
    assert.match(sb, /Game g\w+ started/);
    assert.notEqual(/Game (g\w+)/.exec(sb)[1], /Game (g\w+)/.exec(s)[1]);

    assert.match(text(await a.callTool({ name: 'get_state', arguments: {} })), /^State:/);
    assert.match(text(await a.callTool({ name: 'end_game', arguments: {} })), /Game ended/);
    assert.equal((await a.callTool({ name: 'get_state', arguments: {} })).isError, true);
  } finally {
    await a.close();
    await b.close();
    await agent.stop('test over');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
