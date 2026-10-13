// test/liveview.test.js - the user sees the game only once live_view's HTML is shown (a production game, 2026-10-13,
// g08370a: Muse, run as a background task in a long chat, went from start_game straight to play_sequence and never
// called live_view; g71c9f5 the same): start_game's reply starts with the next step, and until live_view is called
// every play, play_sequence or get_state reply starts with one line saying so; the call itself runs. A play or
// play_sequence call without why or plan gets a line on the first such call and every 5th after (g08370a and g71c9f5
// sent neither, and the stream's thinking band stayed empty), which says an integration with no why or plan fields is
// out of date. What the client reads (tools/list, prompts/list) and refusals before a session are logged; the client is
// told the tool list changed once it is initialized.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { createWeb } from '../src/web.js';
import { createLogger } from '../src/log.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { LIVE_NEXT, LIVE_NUDGE, WHY_NUDGE, NEED_LIVE_TEXT } from '../src/mcp.js';
import { fakeHosts } from './fake-mineai.js';

const raw = (r) => r.content.map((x) => x.text).join('\n');

test('live view: start_game says to call it next, first; every reply nudges until it is called', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'liveview-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'player', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    assert.equal(LIVE_NEXT, 'Next: call live_view now and show the HTML it returns, exactly as returned, as a web artifact in your preview panel, before you play (play waits for it).');
    assert.equal(LIVE_NUDGE, 'Your user cannot see the game yet: call live_view and show its HTML in your preview panel.');
    const s = raw(await c.callTool({ name: 'start_game', arguments: {} }));
    assert.ok(s.startsWith(`${LIVE_NEXT}\n\nNew game g`), 'the first line of start_game');
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
    assert.deepEqual(nudged, [true, true, true, true, true, true, true], 'every call until live_view');
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
    assert.ok(raw(s).startsWith(`${LIVE_NEXT}\n\n`));
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
    assert.equal(WHY_NUDGE, 'Viewers see your why and plan under the video: pass both on every play call. If your tool list has no why or plan fields, your integration is out of date: re-read this server\'s tools (tools/list) or rebuild the integration.');
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

test('what the client reads is logged (tools/list, prompts/list), refusals before a session too; the tool list is announced as changed', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcplist-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'test', version: '1' });
  let changed = false;
  c.setNotificationHandler(ToolListChangedNotificationSchema, () => { changed = true; });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    await c.listTools();
    await c.listPrompts();
    const rows = () => fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).flatMap((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && !(rows().filter((r) => r.kind === 'mcp_list').length >= 2 && changed)) await new Promise((r) => { setTimeout(r, 50); });
    const lists = rows().filter((r) => r.kind === 'mcp_list');
    assert.deepEqual(lists.map((r) => r.method).sort(), ['prompts/list', 'tools/list']);
    assert.ok(lists.find((r) => r.method === 'tools/list').count >= 9);
    assert.equal(changed, true, 'notifications/tools/list_changed reached the client');
    // a request for a session the server does not know: refused and logged
    const r = await fetch(`${agent.url}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-session-id': 'deadbeef-0000' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_state', arguments: {} } }) });
    assert.equal(r.status, 404);
    await new Promise((res) => { setTimeout(res, 200); });
    assert.ok(rows().some((x) => x.kind === 'mcp_http' && x.status === 404 && x.session === 'deadbeef'));
  } finally {
    await c.close();
    await agent.stop();
  }
});

test('the live view is required (the owner, 2026-10-13): play waits for live_view on a server with a live video; live: false opts out; a capped or test answer counts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'needlive-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  // a server with a stream (the live channel answers capped: Facebook's daily limit, which must never block play)
  const streams = { enabled: true, start() { return null; }, has: () => false, stopAll: async () => {}, term: () => {}, focus: async () => ({ fb: true, state: 'capped', retryInS: 3600, game: null }), live: async () => ({ fb: true, state: 'capped', retryInS: 3600 }) };
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null, streams, loopStatsMs: 0 });
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  const d = new Client({ name: 'test', version: '1' });
  await d.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    assert.equal(NEED_LIVE_TEXT, "Your user wants to watch: call live_view first and show the HTML it returns, exactly as returned, as a web artifact in your preview panel; then send this call again. If your user said they don't want to watch, call start_game with live: false.");
    assert.match(c.getInstructions(), /play and play_sequence are refused \(code NEED_LIVE_VIEW\) until you have\. Only when your user said they do not want to watch, start_game with live: false/);
    const { tools } = await c.listTools();
    assert.match(tools.find((t) => t.name === 'start_game').inputSchema.properties.live.description, /false only when your user said they do not want to watch/);
    await c.callTool({ name: 'start_game', arguments: {} });
    const step = { skill: 'collect', args: { block: 'oak_log', n: 1 } };
    for (const [name, args] of [['play', step], ['play_sequence', { steps: [step] }]]) {
      const r = await c.callTool({ name, arguments: args });
      assert.equal(r.isError, true);
      assert.equal(r.structuredContent.code, 'NEED_LIVE_VIEW');
      assert.ok(raw(r).startsWith(NEED_LIVE_TEXT), raw(r).slice(0, 120));
      assert.equal(r.structuredContent.state.inventory?.oak_log ?? 0, 0, 'nothing ran');
    }
    // the rest stays allowed
    for (const [name, args] of [['get_state', {}], ['set_goal', { goal: 'kill 3 pigs' }], ['game_report', {}]]) assert.notEqual((await c.callTool({ name, arguments: args })).isError, true, name);
    // live_view answers capped: it counts, and play runs
    const lv = await c.callTool({ name: 'live_view', arguments: {} });
    assert.ok(['capped', 'test'].includes(lv.structuredContent.state), lv.structuredContent.state); // test callers get test
    const ok = await c.callTool({ name: 'play', arguments: { ...step, why: 'logs', plan: 'logs, then planks' } });
    assert.notEqual(ok.isError, true, raw(ok));
    assert.match(raw(ok), /^collect \{"block":"oak_log","n":1\}: ok/, 'no nudge once called');
    // a user who does not watch: live: false, and play runs at once, with no next-step line
    const s2 = raw(await d.callTool({ name: 'start_game', arguments: { live: false } }));
    assert.ok(!s2.includes(LIVE_NEXT));
    assert.notEqual((await d.callTool({ name: 'play', arguments: step })).isError, true);
  } finally {
    await c.close();
    await d.close();
    await agent.stop();
  }
});
