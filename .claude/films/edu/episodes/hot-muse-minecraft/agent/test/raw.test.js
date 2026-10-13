// test/raw.test.js - Muse's raw text on the stream (the owner, 2026-10-12: "the HUD still doesn't show Muse's raw
// text"): the call's arguments exactly as Muse sent them and the first line of the server's answer, paired by a number
// though calls overlap (src/terminal.js), cleaned for a public live video; the RAW console of the HUD (src/ui-panel.js:
// newest first, JSON in colour, the newest play call with the room, the body's own actions as "# body:", never ">");
// and the optional plan on play and play_sequence (src/mcp.js): asked for in the instructions, never refused, cut at a
// word at 400 characters, logged in mcp_call, kept in the report's decision log, never seen by the body.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { startAgent } from '../src/index.js';
import { callLine, cleanTerm, createTermFeed, replyHead, PLAN_MAX, RAW_MAX } from '../src/terminal.js';
import { callRow } from '../src/mcp.js';
import { createUiPanel } from '../src/ui-panel.js';

// the reply as these tests read it: without the live view nudge at the top (test/liveview.test.js checks it)
const text = (r) => r.content.map((x) => x.text).join('\n').replace(/^Your user cannot see the game yet: [^\n]*\n\n/, '');
const PLAN = 'Next: smelt the 5 raw iron, make a shield for the night, then the iron pickaxe and dig down to y -59 for diamonds. If no iron shows within 32 blocks, explore east along the ravine; if a skeleton finds me first, shield up and wall in. Then water bucket, obsidian from a lava pool with the bucket, flint from gravel, the portal frame on dry ground, light it and go through, then come back the same way before the lease ends.';

test('raw: the arguments as Muse sent them, its plan cut at a word, cleaned for a public video; the answer paired with its call', () => {
  const l = callLine('play_sequence', { why: 'Iron next', plan: `${PLAN}\u0007\n\n  extra   words`, steps: [{ skill: 'go_to', args: { pos: { x: -20, y: 78, z: 236 } } }] });
  assert.ok(l.plan.length <= PLAN_MAX && l.plan.endsWith('...') && !/\s{3,}|[\u0000-\u001f]/.test(l.plan), l.plan);
  assert.ok(l.raw.startsWith('{"why":"Iron next","plan":"Next: smelt'), 'the arguments as sent, {pos} and all (before the server reads them its way)');
  assert.match(l.raw, /"steps":\[\{"skill":"go_to","args":\{"pos":\{"x":-20,"y":78,"z":236\}\}\}\]\}$/);
  assert.ok(!/[\u0000-\u001f\u007f-￿]/.test(l.raw), 'printable ASCII only');
  const huge = callLine('play', { skill: 'say', args: { text: 'x '.repeat(2000) } });
  assert.ok(huge.raw.length <= RAW_MAX);
  assert.equal(cleanTerm({ lines: [{ k: 'call', t: '> play', raw: '{"a":"near Muse_aB3dE9fGh2k key EAAPageTok3n0123456789abcdef"}', rid: 3 }] }).lines[0].raw, '{"a":"near a player key ***"}');
  assert.deepEqual(cleanTerm({ lines: [{ k: 'reply', t: '< ok', rid: 3 }] }).lines, [{ k: 'reply', t: '< ok', rid: 3 }]);
  // the answer's first line that says something
  assert.equal(replyHead({ content: [{ text: 'On its own since your last reply (the body, not a step of yours):\n- 9 s ago, on its own\n\n1. collect {"block":"oak_log","n":4}: ok: mined 4 oak_log\n\nState (game g1, 5 min left):' }] }), '1. collect {"block":"oak_log","n":4}: ok: mined 4 oak_log');
  assert.equal(replyHead({ isError: true, content: [{ text: '1. go_to: not run, bad arguments: go_to.pos is not allowed\nNothing was run' }], structuredContent: { code: 'BAD_ARGS' } }), 'BAD_ARGS: 1. go_to: not run, bad arguments: go_to.pos is not allowed');
  assert.equal(replyHead({ content: [{ text: 'Finished since your last call:\nFrom your play_sequence #2, sent 41 s ago:\n3. craft {"item":"stick"}: ok\n\nState (game g1):' }] }), 'finished: 3. craft {"item":"stick"}: ok');
  assert.equal(replyHead({ content: [{ text: 'State (game g1, 25 min left):\nHP 20' }] }, 'Muse checked: HP 20, food 18'), 'state: HP 20, food 18');
  // the feed: each call and its answer carry the same number, start_game's both with its reply
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(cleanTerm(u)) });
  const game = { id: 'g1', body: { attribution: () => null } };
  feed.reply(game, 'start_game', { adult: true }, { content: [{ text: 'New game g1: a new bot at a fresh spot.' }] });
  assert.deepEqual(sent.at(-1).lines.filter((x) => x.rid).map((x) => [x.k, x.rid, x.t.slice(0, 12)]), [['call', 1, '> start_game'], ['reply', 1, '< New game g']]);
  const a1 = { why: 'logs', steps: [{ skill: 'collect', args: { block: 'oak_log', n: 2 } }] };
  const a2 = {};
  feed.call(game, 'play_sequence', a1);
  feed.call(game, 'get_state', a2);
  feed.reply(game, 'get_state', a2, { content: [{ text: 'State (game g1):' }] });
  feed.reply(game, 'play_sequence', a1, { content: [{ text: '1. collect {"block":"oak_log","n":2}: ok: mined 2 oak_log' }] });
  const rids = sent.flatMap((u) => u.lines).filter((x) => x.rid).map((x) => [x.k, x.rid]);
  assert.deepEqual(rids, [['call', 1], ['reply', 1], ['call', 2], ['call', 3], ['reply', 3], ['reply', 2]], 'overlapping calls: each answer to its own call');
});

test('raw: the HUD\'s RAW console: newest first, the answers paired, the call running now with its time, the body\'s actions apart', () => {
  let t = 1_000_000;
  const p = createUiPanel({ width: 1080, height: 472, over: 72, now: () => t });
  const at = (ms) => { t += ms; p.render(t); return p.state(); };
  const feed = createTermFeed({ send: (id, u) => p.term(cleanTerm(u)), now: () => t });
  const game = { id: 'g1', body: { attribution: () => null } };
  feed.reply(game, 'start_game', { adult: true }, { content: [{ text: 'New game g1: a new bot at a fresh spot.' }] });
  const a1 = { why: 'Iron next', plan: PLAN, steps: [{ skill: 'collect', args: { block: 'iron_ore', n: 5 } }] };
  feed.call(game, 'play_sequence', a1);
  let st = at(12_000);
  assert.deepEqual([st.calls[0].tool, st.calls[0].reply, st.calls[0].plan.endsWith('...'), JSON.parse(st.calls[0].raw).why], ['play_sequence', null, true, 'Iron next']);
  assert.equal(st.calls[1].reply, '< New game g1: a new bot at a fresh spot.');
  feed.reply(game, 'play_sequence', a1, { content: [{ text: '1. collect {"block":"iron_ore","n":5}: ok: mined 5 iron_ore' }], structuredContent: { steps: [{ call: 1, n: 1, step: 1, skill: 'collect', args: { block: 'iron_ore', n: 5 }, status: 'confirmed', result: 'mined 5 iron_ore', ms: 30_000 }] } });
  p.term({ lines: [{ k: 'body', t: 'body: waiting for your first call: dug two blocks down to wait there' }] });
  st = at(100);
  assert.equal(st.calls[0].reply, '< 1. collect {"block":"iron_ore","n":5}: ok: mined 5 iron_ore');
  assert.equal(st.events[0].text, 'dug two blocks down to wait there');
  // a frame draws (the console's wrapping and cutting)
  for (let i = 0; i < 3; i++) at(1_000);
  assert.ok(p.frames >= 4);
  // the plan in full in the thinking band, which grows to hold it; a call without a plan keeps the last one shown
  assert.equal(st.plan, a1.plan.length > 400 ? st.calls[0].plan : a1.plan);
  const withPlan = at(10).low;
  feed.call(game, 'play', { skill: 'eat', args: {}, why: 'A snack' });
  st = at(100);
  assert.deepEqual([st.thoughts.map((x) => x.text), st.plan === st.calls[1].plan], [['A snack', 'Iron next'], true], 'the earlier words go to EARLIER THINKING');
  p.term({ lines: [{ k: 'call', t: '> play', tool: 'play', words: 'Short', of: 1, steps: [{ say: 'Eat something', raw: 'eat' }] }] });
  assert.ok(at(10).low <= withPlan);
});

test('plan: optional on play and play_sequence, asked for in the instructions, never refused (cut at a word), logged, kept in the report, never seen by the body', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${agent.url}/mcp`)));
  try {
    assert.match(c.getInstructions(), /plan: your next few steps and what you will do if one fails, in your own words \(up to about 400 characters\)/);
    const { tools } = await c.listTools();
    for (const name of ['play', 'play_sequence']) {
      const t = tools.find((x) => x.name === name);
      assert.match(t.inputSchema.properties.plan.description, /next few steps and fallbacks/, name);
      assert.ok(!(t.inputSchema.required ?? []).includes('plan'), `${name}: plan stays optional`);
    }
    await c.callTool({ name: 'start_game', arguments: { adult: true } });
    // a plan longer than 400 characters runs (the body never sees it: the step is the same as without it)
    const long = `${PLAN} ${PLAN}`;
    const r1 = await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 2 }, why: 'Logs first', plan: long } });
    assert.match(text(r1), /^collect \{"block":"oak_log","n":2\}: ok/);
    const r2 = await c.callTool({ name: 'play_sequence', arguments: { steps: [{ skill: 'craft', args: { item: 'oak_planks', n: 4 } }], why: 'Planks', plan: 'Then sticks and a table; if short of logs, two more first.' } });
    assert.ok(!r2.isError, text(r2));
    // the report's decision log: the why and the plan
    const rep = text(await c.callTool({ name: 'game_report', arguments: {} }));
    assert.match(rep, /Decision log \(your own why and plan, and the advice you followed or declined\):/);
    assert.match(rep, /"Planks" \(plan: "Then sticks and a table; if short of logs, two more first\."\) -> craft oak_planks 4: ok/);
    const logged = rep.match(/"Logs first" \(plan: "([^"]+)"\)/)?.[1] ?? '';
    assert.ok(logged.length <= 400 && logged.endsWith('...') && logged.startsWith('Next: smelt'), logged);
  } finally {
    await c.close();
    await agent.stop();
  }
  // mcp_call: the plan cut at a word
  const row = callRow('play', { skill: 'eat', args: {}, why: 'w', plan: `${PLAN} ${PLAN}` }, { structuredContent: {} }, 'g1', 5);
  assert.ok(row.plan.length <= 400 && row.plan.endsWith('...'), row.plan);
  assert.equal(callRow('play', { skill: 'eat', args: {} }, { structuredContent: {} }, 'g1', 5).plan, undefined, 'optional');
});
