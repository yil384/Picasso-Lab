// test/goals.test.js - any goal in the player's words, changed mid-game (the owner, 2026-10-12): counted goals read
// from the text where unambiguous (src/goals.js), and plain text never counted; the tracker's counts (kills by hunt,
// attack and reflexes, items gained, crafts, builds, places reached, nights and days survived) per goal, the history of
// goals and the report; and over /mcp with the fake runtime: start_game with "kill 3 pigs", every reply's goal line,
// set_goal mid-game, the stream feed's checklist with counts, a hunt that runs out of pigs (said plainly, advice to
// explore), the reflex's kills, and the caps a big goal meets.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { createWeb } from '../src/web.js';
import { createLogger } from '../src/log.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS, HUNT_DROPS, dropOf } from '../src/mineai/skills.js';
import { describeEvents } from '../src/mineai/care.js';
import { cleanTerm, callLine } from '../src/terminal.js';
import { goalOf, lexiconFrom, planText, createTracker } from '../src/report.js';
import { fakeHosts } from './fake-mineai.js';

const lex = lexiconFrom(MINEAI_SKILLS, { huntDrops: HUNT_DROPS, dropOf });
const text = (r) => r.content.map((x) => x.text).join('\n');
const parts = (t, o) => goalOf(t, lex, o).parts;

test('goals from words: counted where unambiguous, presets, and plain text never counted', () => {
  assert.deepEqual(parts('kill 100 pigs'), [{ kind: 'kill', target: 'pig', n: 100 }]);
  assert.deepEqual(parts('Kill a hundred cows!'), [{ kind: 'kill', target: 'cow', n: 100 }]);
  assert.deepEqual(parts('I want you to hunt twenty five sheep'), [{ kind: 'kill', target: 'sheep', n: 25 }]);
  assert.deepEqual(parts('hunt 5 endermen'), [{ kind: 'kill', target: 'enderman', n: 5 }]);
  assert.deepEqual(parts('collect 64 cobblestone and kill 10 zombies'), [{ kind: 'collect', item: 'cobblestone', n: 64 }, { kind: 'kill', target: 'zombie', n: 10 }]);
  assert.deepEqual(parts('mine 64 stone'), [{ kind: 'collect', item: 'cobblestone', n: 64, block: 'stone' }], 'a block mined counts its drop');
  assert.deepEqual(parts('mine 10 iron ore'), [{ kind: 'collect', item: 'raw_iron', n: 10, block: 'iron_ore' }]);
  assert.deepEqual(parts('get 10 diamonds'), [{ kind: 'collect', item: 'diamond', n: 10 }]);
  assert.deepEqual(parts('craft 20 torches'), [{ kind: 'craft', item: 'torch', n: 20 }]);
  assert.deepEqual(parts('craft 2 flint and steel'), [{ kind: 'craft', item: 'flint_and_steel', n: 2 }]);
  assert.deepEqual(parts('cook 5 beef'), [{ kind: 'craft', item: 'cooked_beef', n: 5 }]);
  assert.deepEqual(parts('make a hut'), [{ kind: 'build', blueprint: 'hut_3x3', n: 1 }]);
  assert.deepEqual(parts('build 2 shelters'), [{ kind: 'build', blueprint: 'shelter', n: 2 }]);
  assert.deepEqual(parts('build a nether portal'), [{ kind: 'build', blueprint: 'nether_portal', n: 1 }]);
  assert.deepEqual(parts('reach y -59'), [{ kind: 'reach', y: -59 }]);
  assert.deepEqual(parts('go down to y=-59'), [{ kind: 'reach', y: -59 }]);
  assert.deepEqual(parts('go to 100, -200'), [{ kind: 'reach', x: 100, z: -200 }]);
  assert.deepEqual(parts('reach x=100, z=-200'), [{ kind: 'reach', x: 100, z: -200 }]);
  assert.deepEqual(parts('reach 100 64 -200'), [{ kind: 'reach', x: 100, y: 64, z: -200 }]);
  assert.deepEqual(parts('reach the end'), [{ kind: 'reach', dim: 'the_end' }]);
  assert.deepEqual(parts('survive 3 nights'), [{ kind: 'survive', unit: 'night', n: 3 }]);
  assert.deepEqual(parts('survive the night'), [{ kind: 'survive', unit: 'night', n: 1 }]);
  assert.deepEqual(parts('stay alive for two days'), [{ kind: 'survive', unit: 'day', n: 2 }]);
  assert.deepEqual(parts('kill 100 pigs then go to the nether and back'), [{ kind: 'kill', target: 'pig', n: 100 }, { kind: 'back' }]);
  // the titles say it back plainly
  assert.equal(goalOf('collect 64 cobblestone and kill 10 zombies', lex).title, 'collect 64 cobblestone, kill 10 zombies');
  assert.equal(goalOf('get 10 diamonds', lex).title, 'collect 10 diamonds');
  assert.equal(goalOf('make a hut', lex).title, 'build a hut 3x3');

  // the presets, in words or by key
  for (const [t, key] of [['go to the nether and back', 'nether_and_back'], ['get to the Nether', 'nether'], ['get diamonds', 'diamonds'], ['an iron pickaxe please', 'iron_pickaxe'], ['nether_and_back', 'nether_and_back'], ['free', 'free']]) assert.equal(goalOf(t, lex).key, key, t);

  // plain text: no count it could read, so none is made up
  for (const t of ['build a house', 'kill 100 dragons', 'kill pigs', 'have fun', 'smelt 10 iron', 'befriend a fox']) {
    const g = goalOf(t, lex);
    assert.equal(g.key, 'free', t);
    assert.equal(g.parts, null, t);
    assert.equal(g.text, t);
  }
  // a name that could be several things is not guessed; the plan says so
  const wood = goalOf('collect 20 wood', lex);
  assert.equal(wood.key, 'free');
  assert.match(wood.unclear.join(), /which item: stripped_oak_wood/);
  assert.match(planText(wood, { lex }), /^Goal: "collect 20 wood" \(shown as your goal; the server could not read a count from these words, so it does not count it: which item:/);
  // counts beyond reason are not counts
  assert.equal(goalOf('kill 99999 pigs', lex).key, 'free');
});

test('the plan names the caps a big goal meets: 64 a step, n of a hunt counts drops, mobs running out, the lease', () => {
  const pigs = planText(goalOf('kill 100 pigs', lex), { lex, leaseMin: 30 });
  assert.match(pigs, /^Goal: kill 100 pigs\. The server counts it \(every reply's state says how far; game_report has it all\):\n1\. kill 100 pigs: hunt \{mob: pig, drop: porkchop, n\}/);
  assert.match(pigs, /n counts drops, not kills \(one pig drops about 1 to 3\), at most 64 a step\. 100 pigs take several hunt steps: split them across calls/);
  assert.match(pigs, /When none are left near you the hunt says so: explore 1 to 3 chunks \(explore \{heading, chunks\}\) and hunt again; no skill here breeds animals\./);
  assert.match(pigs, /\nCaps: one step collects, crafts, smelts or hunts at most 64; play_sequence runs up to 32 steps; go_to walks at most 256 blocks; the game lasts 30 min\. A big count takes many calls/);
  assert.match(planText(goalOf('kill 10 zombies', lex), { lex }), /A hostile mob needs a shield carried \(or without_shield: true\)\./);
  assert.match(planText(goalOf('mine 500 stone', lex), { lex }), /collect \{block: stone, n\} mines it \(it drops cobblestone\), at most 64 a step\. 500 is more than one step takes \(at most 64\): split it across several calls/);
  assert.match(planText(goalOf('survive 3 nights', lex), { lex, leaseMin: 30 }), /This game lasts 30 min: about 1 night fits\./);
  assert.match(planText(goalOf('survive 3 nights', lex), { lex, leaseMin: 120 }), /This game lasts 120 min: about 6 nights fit\./);
  assert.match(planText(goalOf('reach 1000 -2000', lex), { lex }), /go_to \{x, y, z\} walks at most 256 blocks a step: a longer way takes several go_to legs\. It counts within 5 blocks of 1000 -2000/);
  assert.match(planText(goalOf('reach the end', lex), { lex }), /no skill here reaches the End; the server watches for it all the same/);
});

test('the tracker: counts per goal, the history of goals, the line in every reply, the checklist and the report', () => {
  let t = 0;
  const tr = createTracker({ goal: goalOf('kill 3 pigs and collect 10 cobblestone', lex), now: () => t });
  tr.observe({ inventory: { cobblestone: 4 }, position: { x: 0, y: 70, z: 0 }, timeOfDay: 1000 });
  assert.equal(tr.line(), 'Goal: kill 3 pigs, collect 10 cobblestone: pigs killed 0 of 3; cobblestone collected 4 of 10.');
  t = 30_000;
  tr.onSkillEnd({ tool: 'hunt', args: { mob: 'pig', drop: 'porkchop', n: 4 }, ok: true, delta: { porkchop: 4 }, kills: { pig: 2 } });
  tr.onKills({ zombie: 1 }, 'reflex');
  tr.onKills({ pig: 1 }, 'reflex');
  tr.observe({ inventory: { cobblestone: 2 } }); // 2 used for a furnace: what was gained still counts
  t = 60_000;
  tr.observe({ inventory: { cobblestone: 10 } });
  assert.equal(tr.line(), 'Goal: kill 3 pigs, collect 10 cobblestone: pigs killed 3 of 3; cobblestone collected 12 of 10 (reached at 1:00).'.replace('12 of 10', '10 of 10'));
  const p = tr.progress();
  assert.equal(p.key, 'custom');
  assert.equal(p.reached, true);
  assert.deepEqual(p.list, [{ k: 'kill_pig', t: 'pigs killed', done: 3, of: 3, atS: 30 }, { k: 'get_cobblestone', t: 'cobblestone collected', done: 10, of: 10, atS: 60 }]);

  // a new goal: the old one keeps its counts in the history; the new one counts from now
  t = 90_000;
  assert.equal(tr.setGoal(goalOf('craft 8 torches', lex)), true);
  assert.equal(tr.setGoal(goalOf('craft 8 torches', lex)), false, 'the same goal again changes nothing');
  tr.onSkillEnd({ tool: 'craft', args: { item: 'torch', n: 4 }, ok: true, delta: { torch: 4, coal: -1, stick: -1 } });
  tr.onSkillEnd({ tool: 'collect', args: { block: 'coal_ore', n: 1 }, ok: true, delta: { coal: 1, torch: 0 } });
  assert.equal(tr.line(), 'Goal: craft 8 torches: torches made 4 of 8.');
  t = 120_000;
  tr.setGoal(goalOf('build a hut, reach y -59 and survive 1 night', lex));
  tr.onSkillEnd({ tool: 'build', args: { blueprint: 'hut_3x3', material: 'oak_planks' }, ok: true, delta: {} });
  tr.observe({ position: { x: 5, y: -58, z: 5 }, timeOfDay: 12_000 });
  tr.observe({ timeOfDay: 14_000 }); // dusk
  t = 300_000;
  tr.observe({ timeOfDay: 0 }); // dawn, no death in between
  assert.equal(tr.progress().reached, true);

  // a night with a death in it does not count; nor does a day
  const nights = createTracker({ goal: goalOf('survive 2 nights and stay alive for 2 days', lex), now: () => t });
  nights.observe({ timeOfDay: 6000 });
  nights.observe({ timeOfDay: 13_500 });
  nights.death({ cause: 'Bot_x was slain by Zombie' });
  t += 1000;
  nights.observe({ timeOfDay: 100 }); // dawn after a death: neither counts
  nights.observe({ timeOfDay: 13_100 });
  nights.observe({ timeOfDay: 50 }); // the next one survived: the night counts, and the day since the last dawn
  assert.deepEqual(nights.progress().list.map((x) => [x.k, x.done]), [['survive_night', 1], ['survive_day', 1]]);

  const r = tr.report({ gameId: 'g1', attribution: { text: 'This game: 9 actions by Muse, 2 reflexes (82% Muse)' } });
  assert.match(r.text, /^Report for game g1: goal build a hut 3x3, reach y -59, survive 1~?/);
  assert.match(r.text, /\nGoal: reached at 5:00: hut 3x3 built 1 of 1; reach y -59 1 of 1; nights survived 1 of 1\.\n/);
  assert.match(r.text, /\nGoals this game: 0:00 kill 3 pigs, collect 10 cobblestone \(until 1:30: pigs killed 3 of 3; cobblestone collected 10 of 10, reached\); 1:30 craft 8 torches \(until 2:00: torches made 4 of 8\); 2:00 build a hut 3x3, reach y -59, survive 1~? \(now\)\.\n/);
  assert.match(r.text, /\nKills: 3 pigs, 1 zombie \(by reflexes: 1 zombie, 1 pig\)\.\n/);
  assert.match(r.text, /\n- 1:30 goal set \(set_goal\): craft 8 torches\n- 2:00 goal set \(set_goal\): build a hut 3x3, reach y -59, survive 1~ \("build a hut, reach y -59 and survive 1 night"\)/);
  assert.deepEqual(r.data.goals.map((g) => [g.title, g.fromS, g.toS, g.reached]), [['kill 3 pigs, collect 10 cobblestone', 0, 90, true], ['craft 8 torches', 90, 120, false], [r.data.goals[2].title, 120, null, true]]);
  assert.deepEqual(r.data.kills, { muse: { pig: 2 }, reflex: { zombie: 1, pig: 1 } });

  // a plain text goal: shown, never counted, nothing on the checklist
  const plain = createTracker({ goal: goalOf('build a castle by the sea', lex), now: () => 0 });
  assert.deepEqual(plain.progress(), { key: 'free', title: 'build a castle by the sea', text: 'build a castle by the sea', reached: false, list: [] });
  assert.equal(plain.line(), 'Goal: build a castle by the sea: "build a castle by the sea" (not counted).');
  assert.match(plain.report({}).text, /\nGoal: "build a castle by the sea", not counted \(no count could be read from it\)\.\n/);
});

test('reflex kills: the mobs a fight killed, by their ids among the threats', () => {
  const out = describeEvents([{ type: 'survival_outcome', observedAt: '2026-10-12T22:00:00Z', payload: { source: 'hostile_reflex', evidence: { response: 'fight', outcome: { response: 'fight', threats: [{ id: 7, name: 'zombie' }, { id: 9, name: 'skeleton' }], killedTargetIds: [7], attacks: 3, healthBefore: 20, healthAfter: 15 } } } }]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].killed, { zombie: 1 });
  assert.match(out[0].text, /fought zombie, skeleton and killed one/);
  // a fight that interrupted a step is told by the step's result, but its kills still count
  const inStep = describeEvents([{ type: 'survival_outcome', observedAt: '2026-10-12T22:01:00Z', payload: { source: 'hostile_reflex', evidence: { interrupted: true, response: 'fight', outcome: { threats: [{ id: 3, name: 'skeleton' }], killedTargetIds: [3] } } } }]);
  assert.deepEqual(inStep, [{ kind: 'kills', killed: { skeleton: 1 }, countOnly: true, at: '2026-10-12T22:01:00Z' }]);
});

test('the terminal: a set_goal call shows the new goal', () => {
  assert.deepEqual(callLine('set_goal', { goal: 'kill 100 pigs' }), { k: 'call', t: '> set_goal: kill 100 pigs', say: 'A new goal: kill 100 pigs', tool: 'set_goal', raw: '{"goal":"kill 100 pigs"}' });
  assert.equal(callLine('game_report', {}).say, 'Check the progress');
});

async function mcpGame() {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'goals-')) });
  const log = createLogger({ dir: null, config, keep: 2000 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const updates = [];
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '1800000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_gl_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
    term: (id, u) => updates.push(cleanTerm(u)),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: 'goals' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  return { c, hosts, updates, log, close: async () => { await c.close(); await web.stop?.(); await hosts.closeAll(); } };
}

test('over /mcp: "kill 3 pigs" counted from the hunts, the goal in every reply, set_goal mid-game, the checklist, the report', async () => {
  const g = await mcpGame();
  const { c } = g;
  try {
    // no game, no goal to set
    const early = await c.callTool({ name: 'set_goal', arguments: { goal: 'kill 3 pigs' } });
    assert.equal(early.isError, true);
    assert.match(text(early), /no game yet: call start_game with this goal/);

    const s = text(await c.callTool({ name: 'start_game', arguments: { adult: true, goal: 'kill 3 pigs' } }));
    assert.match(s, /\nGoal: kill 3 pigs\. The server counts it \(every reply's state says how far; game_report has it all\):\n1\. kill 3 pigs: hunt \{mob: pig, drop: porkchop, n\}/);
    assert.match(s, /\nGoal: kill 3 pigs: pigs killed 0 of 3\.$/, 'the state ends with the goal line');
    const fake = g.hosts.started[0].fake;
    // the fake's hunt kills one pig per drop
    const h = await c.callTool({ name: 'play', arguments: { skill: 'hunt', args: { mob: 'pig', drop: 'porkchop', n: 2 }, why: 'Two pigs first' } });
    assert.match(text(h), /^hunt \{"mob":"pig","drop":"porkchop","n":2\}: ok: hunted pig: 2 killed/);
    assert.match(text(h), /\nGoal: kill 3 pigs: pigs killed 2 of 3\.$/);

    // the pigs run out: said plainly, with the kills it made, and the next reply advises exploring
    fake.world.fail.collect_mob_drop = { error: '[HUNT_TARGET_NOT_LOADED] No loaded pig remained after observing porkchop 1/5.', hunt: { mob: 'pig', drop: 'porkchop', requested: 5, gained: 1, targetDeathsObserved: 1 } };
    const out = await c.callTool({ name: 'play', arguments: { skill: 'hunt', args: { mob: 'pig', drop: 'porkchop', n: 5 }, why: 'The rest of the pigs' } });
    assert.match(text(out), /^hunt \{"mob":"pig","drop":"porkchop","n":5\}: FAILED: failed: no pig left near you \(1 of 5 porkchop so far\): the ones around here are gone; explore 1 to 3 chunks \(explore \{heading, chunks\}\) to reach land with more, then hunt again/);
    assert.doesNotMatch(text(out), /HUNT_TARGET_NOT_LOADED|No loaded/);
    assert.match(text(out), /\nGoal: kill 3 pigs: pigs killed 3 of 3 \(reached at \d+:\d\d\)\.$/, 'the pig of the failed hunt counts');
    let st = await c.callTool({ name: 'get_state', arguments: {} });
    const scarce = (st.structuredContent.advice ?? []).find((a) => a.kind === 'scarce');
    assert.ok(scarce, 'advice to explore');
    assert.match(scarce.text, /^no pig left near you \(your last hunt found none\); explore 2 chunks \((north|east|south|west), the way you face\) to reach land with more, then hunt again; no skill here breeds animals$/);
    assert.equal(scarce.hint.skill, 'explore');
    assert.ok(MINEAI_SKILLS.validate('explore', scarce.hint.args).ok);
    // a hunt that finds pigs again ends that advice
    delete fake.world.fail.collect_mob_drop;
    await c.callTool({ name: 'play', arguments: { skill: 'hunt', args: { mob: 'pig', drop: 'porkchop', n: 1 } } });
    st = await c.callTool({ name: 'get_state', arguments: {} });
    assert.equal((st.structuredContent.advice ?? []).some((a) => a.kind === 'scarce'), false);

    // a reflex's kill counts for a goal that counts that mob
    const sg = await c.callTool({ name: 'set_goal', arguments: { goal: 'kill 2 zombies and craft 4 sticks' } });
    assert.match(text(sg), /^Goal set: kill 2 zombies, craft 4 sticks \(it was: kill 3 pigs; the report keeps both\)\.\nGoal: kill 2 zombies, craft 4 sticks\. The server counts it, part by part/);
    assert.match(text(sg), /A hostile mob needs a shield carried/);
    assert.equal(sg.structuredContent.goal.key, 'custom');
    assert.match(text(await c.callTool({ name: 'set_goal', arguments: { goal: 'kill 2 zombies and craft 4 sticks' } })), /^That is the goal already: kill 2 zombies, craft 4 sticks; nothing changed\./);
    fake.world.events.push({ type: 'survival_outcome', observedAt: new Date().toISOString(), payload: { source: 'hostile_reflex', evidence: { response: 'fight', outcome: { response: 'fight', threats: [{ id: 41, name: 'zombie' }], killedTargetIds: [41], attacks: 2, healthBefore: 20, healthAfter: 17 } } } });
    const deadline = Date.now() + 8000;
    let line = '';
    while (Date.now() < deadline) {
      line = /^Goal: .*$/m.exec(text(await c.callTool({ name: 'get_state', arguments: {} })))?.[0] ?? '';
      if (/zombies killed 1 of 2/.test(line)) break;
      await new Promise((r) => { setTimeout(r, 200); });
    }
    assert.match(line, /^Goal: kill 2 zombies, craft 4 sticks: zombies killed 1 of 2; sticks made 0 of 4\.$/);
    await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'oak_log', n: 1 } } });
    const sticks = await c.callTool({ name: 'play_sequence', arguments: { steps: [{ skill: 'craft', args: { item: 'oak_planks', n: 4 } }, { skill: 'craft', args: { item: 'stick', n: 4 } }], why: 'Sticks' } });
    assert.match(text(sticks), /\nGoal: kill 2 zombies, craft 4 sticks: zombies killed 1 of 2; sticks made 4 of 4\.$/);

    // the stream's checklist follows the goal set last, with its counts
    const last = g.updates.filter((u) => u.goal).at(-1).goal;
    assert.equal(last.key, 'custom');
    assert.equal(last.title, 'kill 2 zombies, craft 4 sticks');
    assert.deepEqual(last.list.map(({ atS, ...x }) => x), [{ k: 'kill_zombie', t: 'zombies killed', done: 1, of: 2 }, { k: 'make_stick', t: 'sticks made', done: 4, of: 4 }]);

    // plain words: shown, not counted, nothing on the checklist
    const plain = await c.callTool({ name: 'set_goal', arguments: { goal: 'build a castle by the sea' } });
    assert.match(text(plain), /^Goal set: build a castle by the sea \(it was: kill 2 zombies, craft 4 sticks; the report keeps both\)\.\nGoal: "build a castle by the sea" \(shown as your goal; the server could not read a count from these words, so it does not count it\)/);
    await c.callTool({ name: 'get_state', arguments: {} });
    assert.deepEqual(g.updates.filter((u) => u.goal).at(-1).goal.list, []);

    const end = await c.callTool({ name: 'end_game', arguments: {} });
    assert.match(text(end), /\nGoals this game: 0:00 kill 3 pigs \(until \d+:\d\d: pigs killed 3 of 3, reached\); \d+:\d\d kill 2 zombies, craft 4 sticks \(until \d+:\d\d: zombies killed 1 of 2; sticks made 4 of 4\); \d+:\d\d build a castle by the sea \(now\)\.\n/);
    assert.match(text(end), /\nKills: 4 pigs, 1 zombie \(by reflexes: 1 zombie\)\.\n/);
    assert.deepEqual(end.structuredContent.report.goals.map((x) => x.by), ['start_game', 'set_goal', 'set_goal']);
    // the log keeps set_goal calls like the others
    assert.equal(g.log.tail(2000).filter((r) => r.kind === 'mcp_call' && r.tool === 'set_goal').length, 4);
  } finally {
    await g.close();
  }
});

test('over /mcp: a goal given on resume replaces the goal; an unknown one keeps the text; the instructions and tool say how', async () => {
  const g = await mcpGame();
  const { c } = g;
  try {
    assert.match(c.getInstructions(), /3\. A new goal: whenever your user gives a new or changed goal during the game, call set_goal with it/);
    const { tools } = await c.listTools();
    const sg = tools.find((t) => t.name === 'set_goal');
    assert.ok(sg);
    assert.deepEqual(sg.inputSchema.required, ['goal']);
    assert.match(sg.description, /kill or hunt N <mob>, collect, mine or get N <item>, craft, make or smelt N <item>, reach y <Y> or <x> <z> or the Nether, build a <blueprint>, survive N nights or days/);
    await c.callTool({ name: 'start_game', arguments: { adult: true } });
    const r = text(await c.callTool({ name: 'start_game', arguments: { adult: true, goal: 'survive 2 nights' } }));
    assert.match(r, /^Resumed game g\w+\.\nGoal: survive 2 nights\. The server counts it/);
    assert.match(r, /This game lasts 30 min: about 1 night fits\./);
    assert.match(r, /\nGoal: survive 2 nights: nights survived 0 of 2\.$/);
  } finally {
    await g.close();
  }
});
