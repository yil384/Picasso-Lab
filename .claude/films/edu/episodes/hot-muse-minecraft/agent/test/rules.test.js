// test/rules.test.js - Muse's rules (the owner's decision, 2026-10-13): every game starts with all the body's reflexes
// off and no action before the first call; Muse sets rules (start_game rules, the policy skill) and an action under a
// rule counts as decided by Muse, with the rule and when it was set (game time and call number); a reflex whose rule
// is off is the body's own. (The policy skill mid-game and a fight under defend: test/care.test.js; replays of older
// games with the old rules: test/replay.test.js.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { attributionOf, createMineAiBody } from '../src/mineai/body.js';
import { createCare, ruleOf, describeRules, RULES_OFF } from '../src/mineai/care.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { cleanTerm } from '../src/terminal.js';
import { createWeb } from '../src/web.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const text = (r) => r.content.map((x) => x.text).join('\n');

test('rules: the attribution line, the rules in words, which rule an action falls under', () => {
  const a = attributionOf(31, { reflex: 7, care: 0, rule: 7, body: 0, byRule: { defend: 7 } }, { set: { defend: { value: true, atS: 12, call: 2 } } });
  assert.equal(a.text, 'This game: 31 actions by Muse directly, 7 by rules Muse set (defend, set at 0:12 with call 2), 0 by the body on its own (100% decided by Muse)');
  assert.deepEqual({ musePct: a.musePct, decidedPct: a.decidedPct }, { musePct: 82, decidedPct: 100 });
  const b = attributionOf(10, { reflex: 3, care: 0, rule: 1, body: 2, byRule: { escape: 1 } }, { set: { escape: { value: true, atS: 95, call: 7 } } });
  assert.equal(b.text, 'This game: 10 actions by Muse directly, 1 by rules Muse set (escape, set at 1:35 with call 7), 2 by the body on its own (85% decided by Muse)');
  assert.equal(attributionOf(1, { reflex: 0, care: 0, rule: 0, body: 0, byRule: {} }).text, 'This game: 1 action by Muse directly, 0 by rules Muse set, 0 by the body on its own (100% decided by Muse)');
  assert.equal(describeRules(RULES_OFF), 'defend off (fight back, raise the shield, wall in when badly hurt); flee off (withdraw from a hostile mob); escape off (out of water for air, out of fire and lava, footing back after a hit); eat_below off (eat the best food carried at that food level)');
  assert.deepEqual(['fight', 'hide', 'flee', 'eat', 'breath', 'fire', 'footing', 'death', 'it fought a zombie', 'it got out of the way of a skeleton', 'it swam up for air', 'it put a shield in the off-hand with hostile mobs near'].map(ruleOf),
    ['defend', 'defend', 'flee', 'eat_below', 'escape', 'escape', 'escape', null, 'defend', 'flee', 'escape', 'defend']);
});

test('rules: eat_below has the body eat when idle at that food level, counted as by Muse\'s rule; off, it does not', async () => {
  const calls = [];
  const state = { food: 5 };
  const NOW = Date.now();
  const mk = () => createCare({
    situation: () => ({ dimension: 'overworld', vitals: { health: 20, food: state.food }, clock: { timeOfDay: 1000 }, position: { x: 0.5, y: 64, z: 0.5 }, nearby: { hostiles: [], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' } }),
    latest: () => ({ inventory: { bread: 3 }, equipment: {} }), stacks: () => [], refresh: async () => {},
    act: async (call) => { calls.push(call.tool); if (call.tool === 'eat_food') state.food = 10; return { output: { action: call.tool, result: { status: 'succeeded' } } }; },
    rpc: async () => ({}), plan: () => ({ calls: [] }), idle: () => true, idleSince: () => NOW - 60_000, furnaceNear: () => false, tableNear: () => false,
    event: () => {}, now: () => Date.now(), tickMs: 1e9, mode: 'advise',
  });
  const off = mk();
  await off.tick();
  assert.deepEqual(calls, [], 'no rule: no meal of its own');
  const on = mk();
  on.noteCall(3);
  on.setRules({ eat_below: 6 });
  await on.tick();
  await until(() => calls.includes('eat_food'));
  await sleep(50);
  assert.deepEqual(calls, ['eat_food']);
  const e = on.since(0).at(-1);
  assert.equal(e.source, 'rule');
  assert.equal(e.rule, 'eat_below');
  assert.equal(e.ruleSet.call, 3);
  assert.deepEqual(on.counts(), { reflex: 0, care: 0, rule: 1, body: 0, byRule: { eat_below: 1 } });
});

test('rules over /mcp: none at the start (their reflexes off, no action before the first call); start_game rules set them (via start_game), the policy skill with its play call\'s number and send time; the feed carries them', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'rules-')), MC_PORT: '25931' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 20, bread: 2 } }));
  const updates = [];
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_ru_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
    term: (id, u) => updates.push(cleanTerm(u)),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const d = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await d.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    // a game with no rules, at night with a zombie near, and no call yet: nothing of its own
    const s = text(await c.callTool({ name: 'start_game', arguments: {} }));
    assert.match(s, /\nYour rules \(the body does nothing by itself but these; none set yet\): defend off/);
    const fake = hosts.started[0].fake;
    fake.world.timeOfDay = 15000;
    fake.world.hostiles = [{ name: 'zombie', kind: 'hostile', nearest: { distance: 6, position: { x: fake.world.position.x + 6, y: fake.world.position.y, z: fake.world.position.z } } }];
    assert.ok(await until(() => fake.world.melee === false && fake.world.hide === 'never' && fake.world.foodReflex === 'never' && fake.world.escape === false && fake.world.retreat === false));
    await sleep(800);
    assert.deepEqual(fake.tools('navigate').concat(fake.tools('build_structure')), [], 'no pre-call action');
    // a second game with rules from the start: set with call 1, their reflexes on as the rules say
    const s2 = text(await d.callTool({ name: 'start_game', arguments: { rules: { defend: true, escape: true, eat_below: 6 } } }));
    assert.match(s2, /\nYour rules \(the body does nothing by itself but these; as set\): defend on \([^)]*\); flee off \([^)]*\); escape on \([^)]*\); eat_below 6 /);
    const fake2 = hosts.started[1].fake;
    assert.ok(await until(() => fake2.world.melee === true && fake2.world.hide === 'when_exposed' && fake2.world.escape === true && fake2.world.foodReflex === 'starving' && fake2.world.retreat === false));
    // the feed: the rules with when they were set
    await d.callTool({ name: 'get_state', arguments: {} });
    const rules = updates.filter((u) => u.rules).at(-1)?.rules;
    assert.ok(rules, 'the rules reach the feed');
    // set by start_game itself (the stream numbers play calls only), at the time it was sent
    assert.deepEqual(rules.find((r) => r.n === 'defend'), { n: 'defend', on: true, setS: 0, via: 'start_game' });
    assert.deepEqual(rules.find((r) => r.n === 'eat_below'), { n: 'eat_below', on: true, v: 6, setS: 0, via: 'start_game' });
    assert.deepEqual(rules.find((r) => r.n === 'flee'), { n: 'flee', on: false });
    // the policy skill in a play call: the rule says that play call's number (CALL 1 on the HUD, though it is the
    // game's 3rd MCP call) and its send time on the stream's clock
    const sentAt = Date.now();
    await d.callTool({ name: 'play', arguments: { skill: 'policy', args: { flee: 'on' }, why: 'Flee when hurt', plan: 'Then wood.' } });
    assert.ok(await until(() => updates.filter((u) => u.rules).at(-1)?.rules.find((r) => r.n === 'flee')?.on === true));
    const flee = updates.filter((u) => u.rules).at(-1).rules.find((r) => r.n === 'flee');
    const call = updates.flatMap((u) => u.lines ?? []).filter((l) => l.k === 'call' && l.tool === 'play').at(-1);
    assert.equal(flee.call, 1, 'the play call\'s number, as the HUD numbers calls');
    const game = updates.filter((u) => u.game).at(-1).game;
    assert.ok(Math.abs(flee.setS - (game.s - Math.round((Date.now() - sentAt) / 1000))) <= 2, `set at the call's send time: ${flee.setS} vs game ${game.s}`);
    assert.ok(call, 'the call went to the stream');
  } finally {
    await c.close();
    await d.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});
