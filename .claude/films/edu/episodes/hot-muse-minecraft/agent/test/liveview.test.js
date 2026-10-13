// test/liveview.test.js - the user sees the game only once live_view's HTML is shown (a production game, 2026-10-13,
// g08370a: Muse, run as a background task in a long chat, went from start_game straight to play_sequence and never
// called live_view): start_game's reply ends with the next step, and until live_view is called a play, play_sequence
// or get_state reply starts with one line saying so, on the first call and every 5th after; the call itself runs. The
// same for a play or play_sequence call without why or plan (g08370a sent neither, and the stream's thinking band
// stayed empty).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { createWeb } from '../src/web.js';
import { createLogger } from '../src/log.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { LIVE_NEXT, LIVE_NUDGE, WHY_NUDGE } from '../src/mcp.js';
import { fakeHosts } from './fake-mineai.js';

const raw = (r) => r.content.map((x) => x.text).join('\n');

test('live view: start_game says to call it next; the replies nudge on the first call and every 5th until it is called', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liveview-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'player', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    assert.equal(LIVE_NEXT, 'Next: call live_view now and show the HTML it returns, exactly as returned, as a web artifact in your preview panel, before you play.');
    assert.equal(LIVE_NUDGE, 'Your user cannot see the game yet: call live_view and show its HTML in your preview panel.');
    const s = raw(await c.callTool({ name: 'start_game', arguments: {} }));
    assert.ok(s.endsWith(`\n\n${LIVE_NEXT}`), 'the last line of start_game');
    const calls = [
      ['play', { skill: 'collect', args: { block: 'oak_log', n: 1 } }],
      ['get_state', {}],
      ['play_sequence', { steps: [{ skill: 'craft', args: { item: 'oak_planks', n: 4 } }] }],
      ['get_state', {}],
      ['get_state', {}],
      ['play', { skill: 'collect', args: { block: 'oak_log', n: 1 } }],
      ['get_state', {}],
    ];
    const nudged = [];
    for (const [name, args] of calls) {
      const r = await c.callTool({ name, arguments: args });
      nudged.push(raw(r).startsWith(`${LIVE_NUDGE}\n\n`));
      assert.notEqual(r.isError, true, raw(r));
    }
    assert.deepEqual(nudged, [true, false, false, false, false, true, false], 'the first call, then every 5th');
    // the calls ran all the same
    assert.equal((await c.callTool({ name: 'get_state', arguments: {} })).structuredContent.state.inventory.oak_planks, 4);

    // once live_view is called: no more nudges, and a resumed start_game has no next step
    await c.callTool({ name: 'live_view', arguments: {} });
    for (let i = 0; i < 6; i++) assert.ok(!raw(await c.callTool({ name: 'get_state', arguments: {} })).includes(LIVE_NUDGE));
    assert.ok(!raw(await c.callTool({ name: 'start_game', arguments: {} })).includes(LIVE_NEXT));
  } finally {
    await c.close();
    await agent.stop();
  }
});

test('g08370a\'s opening: start_game, then play_sequence without live_view: the reply leads with the nudge, and the steps run', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g08370a-')) });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '1800000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_lv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1.0' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    // the calls as production logged them (2026-10-13 00:09 UTC): adult: true from an older prompt, no why
    const s = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    assert.ok(raw(s).endsWith(`\n\n${LIVE_NEXT}`));
    const r = await c.callTool({ name: 'play_sequence', arguments: { steps: [
      { skill: 'collect', args: { block: 'oak_log', n: 8 } },
      { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
      { skill: 'collect', args: { block: 'cobblestone', n: 11 } },
      { skill: 'craft', args: { item: 'stone_pickaxe', n: 1 } },
    ] } });
    assert.ok(raw(r).startsWith(`${LIVE_NUDGE}\n\n${WHY_NUDGE}\n\n`), raw(r).slice(0, 200));
    assert.notEqual(r.structuredContent.code, 'BAD_ARGS');
    assert.equal(r.structuredContent.steps[0].skill, 'collect');
    // the log has the call as it was (the nudge is in the reply only)
    assert.equal(log.tail(500).filter((x) => x.kind === 'mcp_call' && x.tool === 'play_sequence').length, 1);
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});

test('why and plan: a play call without them gets a line at the top on the first such call and every 5th; with both, none', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'whyplan-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'player', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    assert.equal(WHY_NUDGE, 'Viewers see your why and plan under the video: pass both on every play call.');
    await c.callTool({ name: 'start_game', arguments: {} });
    await c.callTool({ name: 'live_view', arguments: {} });
    const both = { why: 'Logs for planks', plan: 'Logs, planks, a table, a pickaxe; if no trees, explore east' };
    const step = { skill: 'collect', args: { block: 'oak_log', n: 1 } };
    const calls = [
      ['play', { ...step }], // neither: 1st
      ['play', { ...step, ...both }], // both: not counted, no line
      ['play', { ...step, why: both.why }], // no plan: 2nd
      ['play_sequence', { steps: [step], plan: both.plan }], // no why: 3rd
      ['get_state', {}], // not a play call
      ['play', { ...step }], // 4th
      ['play', { ...step }], // 5th
      ['play_sequence', { steps: [step] }], // 6th: the line again
    ];
    const lined = [];
    for (const [name, args] of calls) {
      const r = await c.callTool({ name, arguments: args });
      assert.notEqual(r.isError, true, raw(r));
      lined.push(raw(r).startsWith(`${WHY_NUDGE}\n\n`));
    }
    assert.deepEqual(lined, [true, false, false, false, false, false, false, true]);
  } finally {
    await c.close();
    await agent.stop();
  }
});
