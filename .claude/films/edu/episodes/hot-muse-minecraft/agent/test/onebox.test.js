// test/onebox.test.js - the one-line prompt (2026-10-12, the owner: "nobody else can use it out of the box"): one line
// such as "I'm 18 or older. Play Minecraft on https://play.picasso-lab.com/mcp and get to the Nether and back." is
// enough, because the server carries the rest. Checked over /mcp: initialize carries the standing rules; tools/list
// has game_report and start_game's goal; prompts/list has the ready prompts; start_game with a goal replies with the
// milestone plan and its how-tos; end_game and game_report give the report; a client that still sends the old long
// prompt (no goal, get_state before end_game) plays as before; production game ga13a88's refused go_to {pos} call now
// runs; and the stream feed carries the goal checklist with times.
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
import { cleanTerm } from '../src/terminal.js';
import { createTracker, goalOf, planText, GOAL_NAMES } from '../src/report.js';
import { promptText } from '../src/mcp.js';
import { fakeHosts } from './fake-mineai.js';

const text = (r) => r.content.map((x) => x.text).join('\n');

async function connect(url) {
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  return c;
}

test('one line is enough: the instructions carry every standing rule; tools, goal, prompts; the plan and the report', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onebox-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = await connect(agent.url);
  try {
    // initialize: every rule the long prompt carried, said once by the server
    const ins = c.getInstructions();
    for (const [rule, re] of [
      ['age only from the user', /Adults \(18\+\) only: start_game needs adult: true\. Set it only when your user has said in this conversation that they are 18 or older; never assume it/],
      ['by itself', /once the game has started, play on without asking your user anything/],
      ['only this server', /Use only these tools, not the server's web pages/],
      ['the goal', /start_game, with goal when your user named one \(free, iron_pickaxe, diamonds, nether, nether_and_back, or their words: the server counts goals like "kill 100 pigs"/],
      ['a new goal mid-game', /whenever your user gives a new or changed goal during the game, call set_goal with it/],
      ['big counts split', /A big count \(100 pigs, 500 blocks\) takes many steps: a step takes at most 64, so split it across calls/],
      ['live view first, as an artifact', /Then call live_view and show the HTML it returns, exactly as returned, as a web artifact/],
      ['play_sequence and get_state', /play_sequence for several steps in a row \(play for one\)[^\n]*get_state waits for a skill still running/],
      ['why on every call', /pass why on every play and play_sequence call[^\n]*viewers of the live stream see it/],
      ['calls every 4 minutes', /call at least every 4 minutes; a game with no calls for 5 minutes ends/],
      ['deaths', /pick_up with death_items: true within 5 minutes[^\n]*or start over where you respawned/],
      ['3 failures', /if the same step fails 3 times, change your plan/],
      ['the report', /call end_game: its reply is the full report[^\n]*show it to your user[^\n]*game_report gives the same during the game/],
    ]) assert.match(ins, re, rule);
    assert.doesNotMatch(ins, /https?:/, 'no links');

    // tools/list: game_report, start_game's goal, why asked on every call, the preferred position shape
    const { tools } = await c.listTools();
    const by = Object.fromEntries(tools.map((t) => [t.name, t]));
    assert.ok(by.game_report, 'game_report');
    assert.equal(by.game_report.annotations?.readOnlyHint, true);
    assert.deepEqual(by.start_game.inputSchema.required, ['adult'], 'goal stays optional');
    assert.match(by.start_game.inputSchema.properties.goal.description, /free, iron_pickaxe, diamonds, nether, nether_and_back/);
    assert.match(by.start_game.inputSchema.properties.adult.description, /your user has said in this conversation that they are 18 or older/);
    for (const name of ['play', 'play_sequence']) assert.match(by[name].inputSchema.properties.why.description, /on every call/, name);
    assert.match(by.play.description, /Positions are block coordinates \{"x": 10, "y": 64, "z": -3\}: go_to takes x, y, z themselves, other skills a pos/);
    assert.match(by.end_game.description, /full report/);

    // prompts/list: the ready prompts, with the goal as an argument
    const { prompts } = await c.listPrompts();
    assert.deepEqual(prompts.map((p) => p.name).sort(), ['free_play', 'play_to_the_nether']);
    assert.deepEqual(prompts.find((p) => p.name === 'free_play').arguments.map((a) => [a.name, a.required ?? false]), [['goal', false]]);
    const nether = await c.getPrompt({ name: 'play_to_the_nether' });
    assert.equal(nether.messages[0].role, 'user');
    assert.match(nether.messages[0].content.text, /get to the Nether and back \(start_game with goal: "nether_and_back"\)/);
    assert.match(nether.messages[0].content.text, /ask me whether I am 18 or older unless I have already said so/, 'the age stays the user\'s to state');
    assert.match((await c.getPrompt({ name: 'free_play', arguments: { goal: 'diamonds' } })).messages[0].content.text, /play toward this goal: diamonds \(start_game with goal: "diamonds"\)/);
    assert.match((await c.getPrompt({ name: 'free_play', arguments: {} })).messages[0].content.text, /play for as long as the game lasts/);

    // no report before a game
    const early = await c.callTool({ name: 'game_report', arguments: {} });
    assert.equal(early.isError, true);
    assert.match(text(early), /start_game first/);

    // start_game with a goal: the plan, milestone by milestone, with the how-tos the long prompt carried
    const s = text(await c.callTool({ name: 'start_game', arguments: { adult: true, goal: 'nether_and_back' } }));
    assert.match(s, /^New game g\w+: [^\n]*\.\nGoal: Nether and back\. The plan, milestone by milestone/);
    for (const how of [/1\. wooden pickaxe: /, /most diamonds lie near y -59/, /craft a bucket \(3 iron ingots\), then bucket fill water/,
      /next to a still lava pool/, /collect gravel \(it drops flint now and then\)/, /build nether_portal from obsidian on open, dry ground/,
      /portal light, then portal enter/, /12\. back in the Overworld: in the Nether, portal enter again/]) assert.match(s, how);

    // the report mid-game, then at the end, with the why texts and the attribution
    await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 2 }, why: 'Logs first, for planks and a pickaxe' } });
    await c.callTool({ name: 'play_sequence', arguments: { steps: [{ skill: 'craft', args: { item: 'oak_planks', n: 4 } }, { skill: 'craft', args: { item: 'stick', n: 4 } }], why: 'Planks and sticks for the tools' } });
    const mid = await c.callTool({ name: 'game_report', arguments: {} });
    assert.match(text(mid), /^Report for game g\w+: goal Nether and back; \d+:\d\d played\.\nGoal: not reached\.\nMilestones: none yet; still to do: wooden pickaxe, stone pickaxe/);
    assert.match(text(mid), /\n- \d+:\d\d "Logs first, for planks and a pickaxe" -> collect oak_log 2: ok\n- \d+:\d\d "Planks and sticks for the tools" -> craft oak_planks 4, craft stick 4: ok$/);
    assert.equal(mid.structuredContent.report.goal, 'nether_and_back');
    const end = await c.callTool({ name: 'end_game', arguments: {} });
    assert.match(text(end), /^Game ended\.\n\nReport for game g\w+: goal Nether and back; \d+:\d\d played; ended with end_game\.\n/);
    assert.match(text(end), /\nDeaths: none\.\n/);
    assert.match(text(end), /\n\nstart_game gives you a new bot\.$/);
    assert.equal(end.structuredContent.report.decisions.filter((d) => d.kind === 'call').length, 2);

    // the start page: the one line, prominent, with the two steps for muse.ai
    const page = await (await fetch(`${agent.url}/`)).text();
    const at = (re) => page.search(re);
    assert.ok(at(/<h2 id="h-muse">Let Muse play: one line<\/h2>/) > 0 && at(/<h2 id="h-muse">/) < at(/<h2 id="h-start">/), 'first section of the page');
    assert.match(page, /<li>Add this server as a custom integration: in a chat, ask Muse to build a custom integration \(an MCP connector\) for <code>http:\/\/127\.0\.0\.1:\d+\/mcp<\/code>/);
    assert.match(page, /<li>In a new conversation, send this one line \(only if you are 18 or older\):<\/li>\n<\/ol>\n<pre class="oneline">I&#39;m 18 or older\. Play Minecraft on http:\/\/127\.0\.0\.1:\d+\/mcp and get to the Nether and back\.<\/pre>/);
  } finally {
    await c.close();
    await agent.stop();
  }
});

test('back-compat: a client sending the old long prompt (no goal, why on some calls, get_state, end_game) plays as before', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'onebox-old-'));
  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', LOG_DIR: dir, MODEL_API_KEY: '' });
  const agent = await startAgent({ config, fakeBot: true, print: () => {}, loadViewer: () => null });
  const c = await connect(agent.url);
  try {
    const s = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    assert.ok(!s.isError);
    assert.match(text(s), /^New game g\w+: [^\n]*\.\nGoal: free play\. The server watches these milestones anyway/);
    const handle = /game: "([A-Za-z0-9_-]{22})"/.exec(text(s))?.[1];
    assert.ok(handle, 'the resume handle is still there');
    // a call without why still runs; one with it too
    assert.match(text(await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 1 } } })), /^collect \{"block":"oak_log","n":1\}: ok/);
    assert.match(text(await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'oak_planks', n: 4 }, why: 'planks' } })), /^craft \{"item":"oak_planks","n":4\}: ok/);
    // the old prompt's "call get_state once more (it counts who acted)"
    assert.match(text(await c.callTool({ name: 'get_state', arguments: {} })), /^State \(game/);
    // start_game again resumes, its goal unchanged; a goal given then replaces it
    assert.match(text(await c.callTool({ name: 'start_game', arguments: { adult: true } })), /^Resumed game g\w+\.\nGoal: free play/);
    assert.match(text(await c.callTool({ name: 'start_game', arguments: { adult: true, goal: 'get some diamonds please' } })), /^Resumed game g\w+\.\nGoal: Diamonds \(get some diamonds please\)\./);
    const end = await c.callTool({ name: 'end_game', arguments: {} });
    assert.match(text(end), /^Game ended\.\n\nReport for game g\w+: goal Diamonds \(get some diamonds please\);/);
    assert.match(text(end), /\nGoals this game: 0:00 free play \(until 0:00\); 0:00 Diamonds \(now\)\.\n/);
    assert.match(text(end), /\n- \d+:\d\d \(no why given\) -> collect oak_log 1: ok\n- \d+:\d\d "planks" -> craft oak_planks 4: ok/);
    // the old adult rule: no adult, no game
    const minor = await c.callTool({ name: 'start_game', arguments: { adult: false, goal: 'nether' } });
    assert.equal(minor.isError, true);
  } finally {
    await c.close();
    await agent.stop();
  }
});

test('ga13a88: the go_to {pos} call refused in production runs now (logged as read); the feed carries the goal checklist', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'onebox-ga-')) });
  const log = createLogger({ dir: null, config, keep: 2000 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const updates = [];
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '7200000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_ob_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
    term: (id, u) => updates.push(cleanTerm(u)),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: 'onebox' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    assert.ok(!(await c.callTool({ name: 'start_game', arguments: { adult: true, goal: 'nether_and_back' } })).isError);
    // the call as Muse sent it at 2026-10-12 22:27:59 (production: BAD_ARGS, "go_to.pos is not allowed")
    const r = await c.callTool({ name: 'play_sequence', arguments: {
      steps: [
        { skill: 'go_to', args: { pos: { x: -20, y: 78, z: 236 } } },
        { skill: 'collect', args: { block: 'birch_log', n: 8 } },
        { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } },
        { skill: 'collect', args: { block: 'cobblestone', n: 12 } },
      ],
      why: 'No path from the dug-in hole to the trees: walking up to the birch cluster first, then tooling up with logs and stone while night lasts',
    } });
    let sc = r.structuredContent;
    assert.notEqual(sc.code, 'BAD_ARGS', text(r));
    assert.deepEqual(sc.steps[0].args, { x: -20, y: 78, z: 236 }, 'the step as it runs: the preferred shape');
    for (let i = 0; i < 10 && sc.steps.some((st) => st.status === 'pending') && !(sc.earlier ?? []).length; i++) sc = (await c.callTool({ name: 'get_state', arguments: {} })).structuredContent;
    const read = log.tail(2000).filter((x) => x.kind === 'mcp_args_read');
    assert.equal(read.length, 1);
    assert.deepEqual(read[0].read, ['1. go_to: args: pos as x, y, z']);
    // "planks" with only birch logs: birch_planks
    const p = await c.callTool({ name: 'play', arguments: { skill: 'craft', args: { item: 'planks', n: '4' }, why: 'planks for a table' } });
    assert.match(text(p), /^craft \{"item":"birch_planks","n":4\}: ok/);

    // the feed: the goal and its milestones, cleaned as the stream service cleans them, the wooden pickaxe with a time
    const last = updates.filter((u) => u.goal).at(-1);
    assert.ok(last, 'the goal reaches the stream feed');
    assert.equal(last.goal.key, 'nether_and_back');
    assert.equal(last.goal.title, 'Nether and back');
    assert.equal(last.goal.reached, false);
    assert.deepEqual(last.goal.list.map((m) => m.k), ['wooden_pickaxe', 'stone_pickaxe', 'iron_ingot', 'iron_pickaxe', 'diamond', 'diamond_pickaxe', 'water_bucket', 'obsidian', 'flint_and_steel', 'portal', 'nether', 'back']);
    assert.deepEqual(last.goal.list.at(-1), { k: 'back', t: 'back', atS: null });
    assert.equal(Number.isInteger(last.goal.list[0].atS), true, 'the wooden pickaxe, with its time');
    // the decision log has the steps as they ran: go_to in its preferred shape
    const rep = await c.callTool({ name: 'game_report', arguments: {} });
    assert.match(text(rep), /\n- \d+:\d\d "No path from the dug-in hole to the trees: [^"]*" -> go_to -20 78 236, collect birch_log 8, /);
    assert.match(text(rep), /\n- \d+:\d\d "planks for a table" -> craft birch_planks 4: ok/);
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});

test('report.js: goals from words, the plan for each goal, the tracker on its own', () => {
  const keyText = (g) => ({ key: g.key, text: g.text });
  assert.deepEqual(keyText(goalOf('Nether and back')), { key: 'nether_and_back', text: null });
  assert.deepEqual(keyText(goalOf('nether-and-back')), { key: 'nether_and_back', text: null });
  assert.deepEqual(keyText(goalOf('get to the Nether and come back')), { key: 'nether_and_back', text: 'get to the Nether and come back' });
  assert.deepEqual(keyText(goalOf('build a house by the lake')), { key: 'free', text: 'build a house by the lake' });
  assert.deepEqual(goalOf(''), { key: 'free', text: null, title: 'Free play', parts: null });
  for (const g of GOAL_NAMES) assert.match(planText(goalOf(g)), /^Goal: /);
  assert.match(planText(goalOf('iron_pickaxe')), /\n4\. iron pickaxe: craft an iron_pickaxe \(3 iron ingots\)\nNights:/);
  assert.match(promptText('nether_and_back'), /18 or older/);

  let t = 0;
  const tr = createTracker({ goal: goalOf('nether_and_back'), now: () => t });
  t = 61_000;
  tr.observe({ inventory: { wooden_pickaxe: 1 }, equipment: { 'off-hand': 'shield' }, dimension: 'overworld' });
  t = 125_000;
  tr.onCall('play', { skill: 'go_to', args: { x: 1, y: 2, z: 3 }, why: 'to the frame site' }, { structuredContent: { steps: [{ skill: 'go_to', status: 'confirmed' }], advice: [{ kind: 'night', text: 'night in 1 min', hint: { skill: 'shelter' } }] } });
  tr.onCall('play', { skill: 'collect', args: { block: 'dirt', n: 4 }, why: 'dirt for the walls' }, { structuredContent: { steps: [{ skill: 'collect', status: 'confirmed' }], advice: [{ kind: 'night', text: 'night in 1 min', hint: { skill: 'shelter' } }] } });
  tr.onCall('play', { skill: 'collect', args: { block: 'dirt', n: 4 } }, { structuredContent: { steps: [{ skill: 'collect', status: 'confirmed' }], advice: [{ kind: 'night', text: 'night now', hint: { skill: 'shelter' } }] } });
  tr.onCall('play', { skill: 'shelter', args: {}, why: 'dark now' }, { structuredContent: { steps: [{ skill: 'shelter', status: 'confirmed' }], advice: [] } });
  tr.onStepDone({ skill: 'build', args: { blueprint: 'nether_portal', material: 'obsidian' }, status: 'confirmed' });
  tr.death({ cause: 'Muse_abc was blown up by Creeper', position: { x: 1.5, y: 64, z: -2.5 } });
  t = 200_000;
  tr.observe({ inventory: {}, dimension: 'minecraft:the_nether' });
  tr.observe({ inventory: {}, dimension: 'overworld' });
  const r = tr.report({ gameId: 'g123', attribution: { text: 'This game: 4 actions by Muse, 1 reflex (80% Muse)', muse: 4, reflex: 1, care: 0, musePct: 80 } });
  // a frame built counts its obsidian too
  assert.match(r.text, /^Report for game g123: goal Nether and back; 3:20 played\.\nGoal: reached at 3:20\.\nMilestones: wooden pickaxe 1:01, 14 obsidian 2:05, the portal frame 2:05, the Nether 3:20, back in the Overworld 3:20; still to do: stone pickaxe, /);
  assert.match(r.text, /\nDeaths: 2:05 was blown up by Creeper at 1 64 -3\.\nThis game: 4 actions by Muse, 1 reflex \(80% Muse\)\.\n/);
  // the night advice declined once while it stayed shown (its words changed), then followed
  assert.deepEqual(r.data.decisions.filter((d) => d.kind === 'advice').map((d) => [d.followed, d.text]), [[false, 'night in 1 min'], [true, 'night now']]);
  assert.match(r.text, /\n- 2:05 \(no why given\) -> collect dirt 4: ok\n/);
  assert.deepEqual(r.data.milestones.find((m) => m.key === 'wooden_pickaxe'), { key: 'wooden_pickaxe', name: 'wooden pickaxe', atS: 61 });
  // a long game: the first 30 entries, a line for those left out, the latest
  for (let i = 0; i < 200; i++) tr.onCall('play', { skill: 'eat', args: {}, why: `meal ${i}` }, { structuredContent: { steps: [{ skill: 'eat', status: 'confirmed' }], advice: [] } });
  const long = tr.report({ gameId: 'g123' });
  assert.equal(long.data.decisions.length, 160);
  assert.equal(long.data.decisionsLeftOut, 46);
  assert.match(long.text, /\n- 2:05 "dark now" -> shelter: ok\n[\s\S]*\n- \.\.\. 46 more entries left out here \.\.\.\n- 3:20 "meal 70" -> eat: ok\n[\s\S]*"meal 199" -> eat: ok$/);
  const p = tr.progress();
  assert.equal(p.reached, true);
  assert.equal(p.list.find((m) => m.k === 'portal').atS, 125);
});
