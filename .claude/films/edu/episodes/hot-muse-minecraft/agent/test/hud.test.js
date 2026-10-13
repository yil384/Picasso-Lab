// test/hud.test.js - the stream's HUD drawn by src/hud.js (the design's own drawing code, ported to node-canvas) for
// the design's three states (ui-art/hud-final/states.json: g08370a polling with no why, the long sample, the smoke
// game): the layout the design measured (FINAL-SPEC.md section 2), no text overlapping another or leaving its column
// (the mock-up's QA), a draw well inside a frame once measured
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drawHud, hudSig } from '../src/hud.js';
import { GOAL_TITLES } from '../src/goals.js';
import { createUiPanel } from '../src/ui-panel.js';
import { callerOf, replyHead, cleanTerm, createTermFeed } from '../src/terminal.js';
import { planText } from '../src/report.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');
const STATES = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'ui-art', 'hud-final', 'states.json'), 'utf8'));

test('HUD: the design\'s three states drawn as the design measured them, with no text problem', () => {
  createUiPanel({ design: 'final', width: 1080, height: 472, over: 72 }); // the fonts, registered once
  const want = {
    nowhy: { goal: [644, 60], thinking: [704, 30], columns: [744, 152], rawLines: 8, rawEntries: 5 },
    long: { goal: [644, 40], thinking: [684, 86], columns: [780, 112], rawLines: 8, rawEntries: 5 },
    fresh: { goal: [644, 40], thinking: [684, 86], columns: [780, 132], rawLines: 7, rawEntries: 5 },
  };
  const g = createCanvas(1080, 1080).getContext('2d');
  for (const [key, w] of Object.entries(want)) {
    const st = { ...STATES[key], caller: STATES[key].raw.entries[0]?.by === 'smoke-script' ? 'TEST SCRIPT' : 'MUSE' };
    const r = drawHud(g, st, {});
    assert.deepEqual({ goal: r.layout.goal, thinking: r.layout.thinking, columns: r.layout.columns, rawLines: r.layout.rawLines, rawEntries: r.layout.rawEntries }, w, key);
    assert.deepEqual(r.qa.problems, [], `${key}: no text overlaps, leaves the canvas or crosses its column`);
    // measured once: drawing it again is quick (the layout and the wraps are measured from cache)
    const t0 = process.hrtime.bigint();
    drawHud(g, st, {});
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.ok(ms < 120, `${key}: ${ms.toFixed(1)} ms`);
  }
});

test('HUD: the why\'s age is the age of the call that carried it, not of a newer call', () => {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p.term({ lines: [{ k: 'call', t: '> play_sequence', tool: 'play_sequence', words: 'Wood first', plan: 'Then a pickaxe', of: 1, steps: [{ say: 'Mine 4 oak logs', raw: 'collect oak_log 4' }], raw: '{}', rid: 1 }], game: { id: 'g1', s: 13 } });
  t += 22_000;
  p.term({ lines: [{ k: 'call', t: '> get_state', tool: 'get_state', raw: '{}', rid: 2 }] });
  t += 3_000;
  const th = p.hud(t).state.thinking;
  assert.equal(Math.round(th.lastCallAgoS), 25, 'the why was sent 25 s ago; the newest call (a look) 3 s ago');
  assert.deepEqual([th.why, th.plan, th.whyAt], ['Wood first', 'Then a pickaxe', '0:13']);
});

test('HUD: the caller is named from the MCP client; an empty game draws', () => {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p.term({ caller: 'TEST SCRIPT', lines: [{ k: 'call', t: '> start_game', say: 'Start a new game', tool: 'start_game', raw: '{}', rid: 1 }, { k: 'reply', t: '< New game g1: a new bot.', rid: 1 }], game: { id: 'g1', s: 0 } });
  t += 1000;
  p.render(t);
  const h = p.hud(t);
  assert.equal(h.state.caller, 'TEST SCRIPT');
  assert.equal(h.state.currentCall, null, 'no play call yet');
  assert.equal(h.state.thinking.hasWhy, false);
  assert.deepEqual(h.qa.problems, []);
  assert.deepEqual(['muse-minecraft-mcp', 'staging-check', 'muse-dec85ec-smoke', 'e2e-iron-switch', 'Claude Desktop', '', '#!'].map(callerOf), ['MUSE', 'TEST SCRIPT', 'TEST SCRIPT', 'TEST SCRIPT', 'CLAUDE DESKTOP', 'AGENT', 'AGENT']);
});

const clone = (x) => JSON.parse(JSON.stringify(x));
const noProblems = (g, st, what) => { const r = drawHud(g, st, { reuse: false }); assert.deepEqual(r.qa.problems, [], what); return r; };

test('HUD goal band: every preset title, a long plain-words goal and a long counted goal fit their columns (the QA sees icons too)', () => {
  createUiPanel({ design: 'final', width: 1080, height: 472, over: 72 });
  const g = createCanvas(1080, 1080).getContext('2d');
  // gc950fd: "Nether and back" ran into the grid's water bucket at a fixed 120 px title column
  for (const title of Object.values(GOAL_TITLES)) {
    for (const variant of ['next first', 'all done, long times']) {
      const st = clone(STATES.nowhy);
      st.goal.title = title;
      if (variant === 'next first') st.goal.list.forEach((m, i) => Object.assign(m, i === 0 ? { state: 'next', done: null, progress: '2/3' } : { state: 'todo', done: null }));
      else st.goal.list.forEach((m) => Object.assign(m, { state: 'done', done: '62:13' }));
      noProblems(g, st, `${title}, ${variant}`);
    }
  }
  // a long plain-words goal, with and without a title of its own
  const words = 'build a big wooden house next to the river with a garden, a fence all around it and torches on every wall, then wait there for the night';
  for (const title of ['', 'a house by the river, with a garden and a fence~']) {
    const st = clone(STATES.long);
    st.goal = { kind: 'text', key: 'custom', title, text: words, new: false };
    noProblems(g, st, `plain words, title "${title}"`);
  }
  // a counted goal at the longest title the server makes (40 characters), three parts, the goal before it
  const st = clone(STATES.long);
  st.goal.title = 'collect 64 cobblestone, craft 20 torche~';
  st.goal.parts = [
    { key: 'get_cobblestone', label: 'Cobblestone collected', icon: 'stone_pickaxe', done: 12, of: 64 },
    { key: 'make_torch', label: 'Torches made', icon: 'star', done: 3, of: 20 },
    { key: 'kill_pig', label: 'Pigs killed', icon: 'sword', done: 1, of: 3 },
  ];
  noProblems(g, st, 'a long counted goal');
});

test('HUD stats: no actions by either side yet shows no share, on a neutral rule; one by the body alone is 0 % / 100 %', () => {
  createUiPanel({ design: 'final', width: 1080, height: 472, over: 72 });
  const c = createCanvas(1080, 1080), g = c.getContext('2d');
  const drawn = [];
  const fill = g.fillText.bind(g);
  g.fillText = (s, x, y) => { drawn.push(s); fill(s, x, y); };
  const st = clone(STATES.fresh);
  st.stats.museShare = { pct: null, muse: null, reflex: null };
  noProblems(g, st, 'no actions');
  assert.ok(drawn.includes('no actions yet'));
  assert.ok(!drawn.some((s) => /%/.test(s)), 'no percentage');
  const px = (x) => [...g.getImageData(x, 608, 1, 1).data.slice(0, 3)];
  assert.deepEqual(px(40), px(1040), 'one colour across');
  assert.deepEqual(px(40), [0x4e, 0x56, 0x67], 'the neutral grey');
  drawn.length = 0;
  st.stats.museShare = { pct: 0, muse: 0, reflex: 1 };
  noProblems(g, st, 'the body alone');
  assert.ok(drawn.includes('0%') && drawn.some((s) => /^reflexes 100%/.test(s)), drawn.filter((s) => /%/.test(s)).join(' | '));
});

test('HUD layout: kept while only what moves with the clock changes, searched again for new content, the same as a fresh search', () => {
  createUiPanel({ design: 'final', width: 1080, height: 472, over: 72 });
  const g = createCanvas(1080, 1080).getContext('2d');
  const st = clone(STATES.long);
  const r0 = drawHud(g, st, {});
  const moved = clone(st);
  moved.now.gameS += 7; moved.now.gameClock = '44:01'; moved.stats.gameClock = '44:01'; moved.stats.hp = 13; moved.thinking.lastCallAgoS += 0.4;
  if (moved.currentCall) { moved.currentCall.running = '0:19'; for (const sp of moved.currentCall.steps) if (sp.elapsed) sp.elapsed = '0:12'; }
  for (const e of moved.raw.entries) e.agoS += 7;
  assert.equal(hudSig(moved), hudSig(st), 'the content is the same');
  const r1 = drawHud(g, moved, {});
  assert.equal(r1.searches, r0.searches, 'no search for a state that only moved with the clock');
  assert.deepEqual(r1.layout, drawHud(g, moved, { reuse: false }).layout, 'and the layout a fresh search finds');
  const more = clone(moved);
  more.raw.entries.unshift({ ...more.raw.entries[0], n: 999, tool: 'get_state', args: '{}', playCallNo: null, hasWhy: false, answer: { state: 'answered', waitingS: null, hudText: null, code: null }, reply: 'state: HP 13, food 20' });
  more.raw.runs.unshift({ ...more.raw.runs[0], tool: 'get_state', args: '{}', count: 1, ns: [999], newestState: 'answered', latestAnswer: 'state: HP 13, food 20' });
  more.raw.total += 1;
  assert.notEqual(hudSig(more), hudSig(moved));
  const r2 = drawHud(g, more, {});
  assert.equal(r2.searches, r1.searches + 2, 'a new call: searched again (the fresh search above counted one)');
  assert.deepEqual(r2.qa.problems, []);
});

test('panel: drawn again for new content at once, for the clocks and progress once a second; only new drawings are written', () => {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'hud-write-'));
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t, file: path.join(dir, 'panel.bmp') });
  p.term({ caller: 'MUSE', game: { id: 'g1', s: 10 }, lines: [{ k: 'call', t: '> play_sequence', tool: 'play_sequence', words: 'Wood first', of: 2, rid: 1, raw: '{}',
    steps: [{ say: 'Mine 4 oak logs', raw: 'collect oak_log 4', skill: 'collect', args: '{"block":"oak_log","n":4}' }, { say: 'Craft 8 oak planks', raw: 'craft oak_planks 8', skill: 'craft', args: '{"item":"oak_planks","n":8}' }] }],
    live: { mode: 'run', c: 1, s: 1 } });
  p.write(t);
  p.perf();
  const mtime = () => fs.statSync(path.join(dir, 'panel.bmp')).mtimeMs;
  // 20 frames in the same second with the body's progress moving: nothing drawn, nothing written
  for (let i = 0; i < 20; i++) { t += 33; if (i % 5 === 0) p.term({ sub: { kind: 'mine', text: 'mining oak log', done: i / 5, of: 4 } }); p.write(t); }
  let f = p.perf();
  assert.equal(f.draws, 0, 'progress waits for the second');
  assert.equal(f.writes, 0);
  // the next second: drawn and written once
  t = 1_001_000 + 5; p.write(t);
  f = p.perf();
  assert.deepEqual([f.draws, f.writes], [1, 1]);
  assert.match(String(p.hud(t).state.currentCall.steps[0].sub.done), /^3$/);
  // a step done (content): drawn at the next frame, not a second later
  t += 200; p.term({ live: { mode: 'run', c: 1, s: 2 } }); t += 33; p.write(t);
  f = p.perf();
  assert.deepEqual([f.draws, f.writes], [1, 1]);
  assert.ok(f.lagMs.max <= 33 + 200, JSON.stringify(f.lagMs));
  assert.equal(p.hud(t).state.currentCall.steps[0].state, 'ok');
  fs.rmSync(dir, { recursive: true, force: true });
});

// before the first play call, as production feeds it: start_game (its answer with the goal's plan), live_view, the body's
// dig-in, the care policy (muse-hud-live-hole.png: the lower half of both columns was empty)
function preCall(caller, goalKey, goalList) {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  const plan = planText({ key: goalKey, title: goalKey, text: goalKey === 'custom' ? 'kill 3 pigs' : null, parts: goalKey === 'custom' ? [{ kind: 'kill', target: 'pig', n: 3 }] : null }, { leaseMin: 30 });
  const start = `New game g88e230: a new bot at a fresh spot with an empty inventory.\n${plan}\nTo resume this game from a new connection, call start_game with game: "h_secret".\n\nSkills (use play or play_sequence):\n- collect`;
  p.term(cleanTerm({ caller, game: { id: 'g88e230', s: 4 }, goal: { key: goalKey, title: goalKey === 'custom' ? 'kill 3 pigs' : 'Nether and back', text: null, list: goalList }, st: { hp: 20, food: 20, clock: 'DAY 12:57', ticks: 6900, muse: 0, reflex: 2, pct: 0 },
    lines: [{ k: 'call', t: '> start_game', tool: 'start_game', raw: '{"adult":true}', rid: 1 }, { k: 'reply', t: `< ${replyHead({ content: [{ text: start }] })}`, rid: 1 }], pos: { y: 82, place: 'surface, birch forest' } }));
  t += 2000; p.term(cleanTerm({ lines: [{ k: 'world', t: 'Care policy set: hide when exposed, critical health 10, eat starving', who: 'server' }] }));
  t += 3000; p.term(cleanTerm({ lines: [{ k: 'world', t: 'Got 1 dirt', who: 'body' }] }));
  t += 5000; p.term(cleanTerm({ lines: [{ k: 'call', t: '> live_view', tool: 'live_view', raw: '{}', rid: 2 }, { k: 'reply', t: '< Live view of game g88e230: live on Facebook since 05:41:26 UTC.', rid: 2 }] }));
  t += 4000;
  p.render(t);
  return { p, at: () => t, step: (ms) => { t += ms; } };
}
const MILESTONES = ['wooden_pickaxe', 'stone_pickaxe', 'iron_ingot', 'iron_pickaxe', 'diamond', 'diamond_pickaxe', 'water_bucket', 'obsidian', 'flint_and_steel', 'portal_frame', 'nether', 'back'].map((k) => ({ k, t: k.replace(/_/g, ' '), atS: null }));

test('HUD before the first play call: how to read it in the NOW area, RAW grown into what is left, no hole over 30 px; gone with the first play call', () => {
  for (const caller of ['MUSE', 'TEST SCRIPT', 'CLAUDE DESKTOP']) {
    for (const [goalKey, list] of [['nether_and_back', MILESTONES], ['free', MILESTONES], ['custom', [{ k: 'kill_pig', t: 'pigs killed', done: 0, of: 3, atS: null }]]]) {
      const { p, at, step } = preCall(caller, goalKey, list);
      const h = p.hud(at());
      const what = `${caller}, ${goalKey}`;
      assert.ok(h.layout.fillers.card >= 1, `${what}: the card`);
      assert.ok(h.layout.leftGap <= 30 && h.layout.rightGap <= 30, `${what}: gaps ${h.layout.leftGap} / ${h.layout.rightGap}`);
      assert.ok(h.layout.rawLines >= 6, `${what}: RAW ${h.layout.rawLines} lines`);
      assert.deepEqual(h.qa.problems, [], what);
      // the first play call: the card is gone
      step(1000);
      p.term(cleanTerm({ lines: [{ k: 'call', t: '> play_sequence', tool: 'play_sequence', words: 'Wood first', of: 1, rid: 3, raw: '{}', steps: [{ say: 'Mine 4 oak logs', raw: 'collect oak_log 4', skill: 'collect', args: '{"block":"oak_log","n":4}' }] }], live: { mode: 'run', c: 1, s: 1 } }));
      step(1000);
      p.render(at());
      const h2 = p.hud(at());
      assert.equal(h2.layout.fillers.card, undefined, `${what}: no card once a play call came`);
      assert.deepEqual(h2.qa.problems, [], `${what}, after`);
    }
  }
});

test('feed: a new game\'s answer carries the goal\'s plan to RAW, never the resume line with its handle', () => {
  const text = 'New game g1: a new bot at a fresh spot with an empty inventory.\nGoal: Nether and back. The plan:\n1. wooden pickaxe: collect logs\nTo resume this game from a new connection, call start_game with game: "h_SECRET123".\nThe bot is still joining the world: call get_state in a few seconds.\n\nSkills:\n- collect';
  const h = replyHead({ content: [{ text }] });
  assert.equal(h, 'New game g1: a new bot at a fresh spot with an empty inventory. Goal: Nether and back. The plan: 1. wooden pickaxe: collect logs');
  assert.ok(!/SECRET|resume/i.test(h));
  // the server's notes at the top of a reply are not the answer (live_view first, a why and a plan)
  const top = 'Next: call live_view now and show the HTML it returns, exactly as returned, as a web artifact in your preview panel, before you play (play waits for it).\n\n' + text;
  assert.equal(replyHead({ content: [{ text: top }] }), h);
  assert.equal(replyHead({ content: [{ text: 'Viewers see your why and plan under the video: pass both on every play call.\n\n1. collect {"block":"oak_log","n":2}: ok: mined 2 oak_log\n\nState (game g1):' }] }), '1. collect {"block":"oak_log","n":2}: ok: mined 2 oak_log');
});

test('feed: the body\'s own actions reach the video between calls, stamped when they happened (g43884a: a dig-in at 0:02 read 0:59)', () => {
  let clock = 1_000_000;
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(u), now: () => clock });
  const journal = [{ seq: 1, at: new Date(clock - 57_000).toISOString(), source: 'care', kind: 'shelter', ok: true, text: 'waiting for your first call at night: dug two blocks down to wait there' }];
  const game = { id: 'g1', body: { attribution: () => null, onItsOwn: (after) => journal.filter((e) => e.seq > after) } };
  feed.reply(game, 'start_game', {}, { content: [{ type: 'text', text: 'New game g1: a new bot.' }], structuredContent: {} });
  feed.tick(game);
  const own = sent.flatMap((u) => u.lines ?? []).filter((l) => l.k === 'body');
  assert.equal(own.length, 1, 'between calls, from the body\'s journal');
  assert.equal(own[0].ago, 57);
  feed.tick(game);
  assert.equal(sent.flatMap((u) => u.lines ?? []).filter((l) => l.k === 'body').length, 1, 'once');
  // the reply that carries it later adds nothing
  feed.reply(game, 'get_state', {}, { content: [{ type: 'text', text: '' }], structuredContent: { steps: [], onItsOwn: [{ seq: 1, agoS: 70, source: 'care', kind: 'shelter', ok: true, text: journal[0].text }] } });
  assert.equal(sent.flatMap((u) => u.lines ?? []).filter((l) => l.k === 'body').length, 1);
  // the panel stamps it 57 s before it came: game time 0:59 - 57 s = 0:02
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p.term(cleanTerm({ game: { id: 'g1', s: 59 }, lines: [{ k: 'world', who: 'server', t: 'Care policy set' }] }));
  p.term(cleanTerm({ lines: [own[0]] }));
  const ev = p.hud(t).state.events;
  assert.deepEqual(ev.map((e) => [e.at, e.who]), [['0:59', 'server'], ['0:02', 'body']], 'newest first by when it happened');
});

test('HUD thinking band: as tall as the why and plan at the first play call (nothing earlier to run on); 76 px with earlier whys', () => {
  createUiPanel({ design: 'final', width: 1080, height: 472, over: 72 });
  const g = createCanvas(1080, 1080).getContext('2d');
  const st = clone(STATES.fresh);
  st.thinking = { ...st.thinking, hasWhy: true, why: 'Night: dig in until dawn', plan: 'Wait it out in the hole, then logs and a wooden pickaxe at first light.' };
  st.earlierThinking = [];
  const r = noProblems(g, st, 'call 1, short why and plan');
  assert.ok(r.layout.thinking[1] < 76, `band ${r.layout.thinking[1]} px`);
  const withEarlier = clone(st);
  withEarlier.earlierThinking = [{ at: '0:10', why: 'Logs first' }];
  const r2 = noProblems(g, withEarlier, 'with an earlier why');
  assert.equal(r2.layout.thinking[1], 76);
  assert.ok(r.layout.rawLines >= r2.layout.rawLines, 'the height went to RAW');
});

test('HUD: SHELTERED over the video while the body is closed in, until the next play call', () => {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p.term(cleanTerm({ caller: 'MUSE', game: { id: 'g1', s: 40 }, lines: [{ k: 'call', t: '> play', tool: 'play', words: 'Night: dig in', of: 1, rid: 1, raw: '{}', steps: [{ say: 'Build a shelter for the night', raw: 'shelter', skill: 'shelter', args: '{}' }] }], live: { mode: 'run', c: 1, s: 1 } }));
  t += 20_000;
  p.term(cleanTerm({ lines: [{ k: 'ok', t: 'ok  climbed down to the ground (19 s)', s: 1, shut: 1 }, { k: 'reply', t: '< 1. shelter {}: ok: closed itself in', rid: 1 }], live: { mode: 'idle' } }));
  t += 1000;
  p.render(t);
  let h = p.hud(t);
  assert.deepEqual(h.state.sheltered, { since: '1:00' });
  assert.deepEqual(h.qa.problems, []);
  // with a new-goal toast at once: no overlap
  p.term(cleanTerm({ goal: { key: 'custom', title: 'kill 3 pigs', text: 'kill 3 pigs', list: [{ k: 'kill_pig', t: 'pigs killed', done: 0, of: 3, atS: null }] } }));
  p.term(cleanTerm({ goal: { key: 'custom', title: 'kill 10 pigs and collect 64 cobblestone', text: 'x', list: [{ k: 'kill_pig', t: 'pigs killed', done: 0, of: 10, atS: null }] } }));
  t += 1000;
  p.render(t);
  assert.deepEqual(p.hud(t).qa.problems, []);
  t += 5000;
  p.term(cleanTerm({ lines: [{ k: 'call', t: '> play', tool: 'play', words: 'Dawn', of: 1, rid: 2, raw: '{}', steps: [{ say: 'Mine 4 oak logs', raw: 'collect oak_log 4' }] }] }));
  assert.equal(p.hud(t).state.sheltered, null, 'out with the next play call');
});

// Muse's rules (the owner, 2026-10-13): reflexes are Muse's own rules, all off at start; actions by them are Muse's
function rulesGame(caller = 'MUSE') {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p.term(cleanTerm({ caller, game: { id: 'g71c9f5', s: 10 }, rules: [{ n: 'defend', on: false }, { n: 'flee', on: false }, { n: 'escape', on: false }, { n: 'eat_below', on: false }],
    st: { hp: 20, food: 20, clock: 'DAY 08:00', ticks: 2000 },
    lines: [{ k: 'call', t: '> start_game', tool: 'start_game', raw: '{"rules":{}}', rid: 1, src: 'muse' }, { k: 'reply', t: '< New game g71c9f5: a new bot.', rid: 1 }, { k: 'call', t: '> live_view', tool: 'live_view', raw: '{}', rid: 2, src: 'muse' }, { k: 'reply', t: '< Live view of game g71c9f5: test caller: no Facebook live.', rid: 2 }] }));
  t += 2000;
  p.term(cleanTerm({ lines: [{ k: 'call', t: '> play_sequence', tool: 'play_sequence', words: 'Wood first', plan: 'Then a table and a pickaxe.', of: 2, rid: 3, raw: '{}', src: 'muse', steps: [{ say: 'Mine 4 oak logs', raw: 'collect oak_log 4', skill: 'collect', args: '{"block":"oak_log","n":4}' }, { say: 'Craft 8 oak planks', raw: 'craft oak_planks 8', skill: 'craft', args: '{"item":"oak_planks","n":8}' }] }], live: { mode: 'run', c: 1, s: 1 }, st: { muse: 0, reflex: 0, rule: 0, body: 0 } }));
  return { p, step: (ms) => { t += ms; }, now: () => t };
}
const drawnTexts = (p, t) => {
  const g = createCanvas(1080, 1080).getContext('2d');
  const out = []; const fill = g.fillText.bind(g); g.fillText = (s, x, y) => { out.push(s); fill(s, x, y); };
  const r = drawHud(g, p.hud(t).state, { reuse: false });
  return { texts: out, qa: r.qa.problems, g, layout: r.layout };
};

test('HUD rules: none on (every action a direct call), "MUSE decided 100%", the possession rule all violet', () => {
  const { p, step, now } = rulesGame();
  step(5000);
  p.term(cleanTerm({ st: { muse: 5, reflex: 0, rule: 0, body: 0, pct: 100, dpct: 100 } }));
  const h = p.hud(now()).state;
  assert.deepEqual(h.rules, { on: [], set: null, call: null });
  const d = drawnTexts(p, now());
  assert.deepEqual(d.qa, []);
  assert.ok(d.texts.includes('100%') && d.texts.includes('decided') && d.texts.some((x) => /^direct 100%/.test(x)) && d.texts.some((x) => /^rules 0%/.test(x)), d.texts.filter((x) => /%/.test(x)).join(' | '));
  assert.ok(!d.texts.some((x) => /body on its own/.test(x)), 'the body\'s own share only when it acted');
  assert.ok(d.texts.some((x) => /^none: every action is a direct call of Muse/.test(x)));
  const px = (x) => [...d.g.getImageData(x, 608, 1, 1).data.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
  assert.equal(px(1000), '9d8cff', 'violet to the end');
});

test('HUD rules: some on, a change mid-game is a toast; rule actions are Muse\'s (MUSE RULE, violet) with when they were set; the body\'s own stays amber', () => {
  const { p, step, now } = rulesGame();
  step(10_000);
  // call 2 sets defend and eat_below 4 at 0:22
  p.term(cleanTerm({ rules: [{ n: 'defend', on: true, setS: 22, call: 2 }, { n: 'flee', on: false }, { n: 'escape', on: false }, { n: 'eat_below', on: true, v: 4, setS: 22, call: 2 }] }));
  let h = p.hud(now()).state;
  assert.deepEqual(h.rules, { on: [{ n: 'defend', words: 'defend' }, { n: 'eat_below', words: 'eat at food 4 or less', v: 4 }], set: '0:22', call: 2 });
  assert.deepEqual(h.toast, { label: 'RULES CHANGED', title: 'defend, eat at food 4 or less' });
  // the body acts by the rule; and once on its own
  step(4000);
  p.term(cleanTerm({ lines: [{ k: 'reflex', t: 'rule defend: fought a zombie (killed it)', src: 'rule', rule: 'defend', rs: 22, rc: 2, ago: 1 }], st: { muse: 31, reflex: 7, rule: 7, body: 0, pct: 82, dpct: 100 } }));
  h = p.hud(now()).state;
  assert.deepEqual([h.events[0].who, h.events[0].rule, h.events[0].ruleSet, h.events[0].ruleCall], ['rule', 'defend', '0:22', 2]);
  let d = drawnTexts(p, now());
  assert.deepEqual(d.qa, []);
  assert.ok(d.texts.some((x) => /^defend \(set 0:22, call 2\): fought a zombie/.test(x)), d.texts.filter((x) => /defend/.test(x)).join(' | '));
  assert.ok(d.texts.includes('defend') && d.texts.includes('eat at food 4 or less'), 'the chips');
  assert.ok(d.texts.some((x) => /^set 0:22 · call 2$/.test(x)));
  assert.ok(d.texts.some((x) => /^direct 82%/.test(x)) && d.texts.some((x) => /^rules 18%/.test(x)));
  // the body on its own (a reflex whose rule is off): amber, counted apart
  step(3000);
  p.term(cleanTerm({ lines: [{ k: 'body', t: 'body: surfaced for air', src: 'body', ago: 0 }], st: { muse: 31, reflex: 9, rule: 7, body: 2, pct: 78, dpct: 95 } }));
  h = p.hud(now()).state;
  assert.equal(h.events[0].who, 'body');
  d = drawnTexts(p, now());
  assert.deepEqual(d.qa, []);
  assert.ok(d.texts.some((x) => /^body on its own 5%/.test(x)), 'amber, only when > 0');
  const px = (x) => [...d.g.getImageData(x, 608, 1, 1).data.slice(0, 3)].map((v) => v.toString(16).padStart(2, '0')).join('');
  assert.equal(px(20), '9d8cff', 'direct: violet');
  assert.equal(px(1075), 'efa443', 'the body on its own: amber');
  // rules all turned off again: none, with when
  step(5000);
  p.term(cleanTerm({ rules: [{ n: 'defend', on: false, setS: 49, call: 4 }, { n: 'flee', on: false }, { n: 'escape', on: false }, { n: 'eat_below', on: false, setS: 49, call: 4 }] }));
  h = p.hud(now()).state;
  assert.deepEqual([h.rules.on, h.rules.set, h.toast.title], [[], '0:49', 'none: every action a direct call']);
  d = drawnTexts(p, now());
  assert.ok(d.texts.some((x) => /^changed 0:49 · call 4$/.test(x)));
  assert.deepEqual(d.qa, []);
});

test('HUD rules: the how-to-read card\'s colour key (Muse, its rules, the body on its own, the server); a NEED_LIVE_VIEW refusal in RAW with its code once', () => {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  const sent = [];
  const feed = createTermFeed({ send: (id, u) => sent.push(u), now: () => t });
  const game = { id: 'g1', body: { attribution: () => null } };
  p.term(cleanTerm({ caller: 'MUSE', game: { id: 'g1', s: 3 }, rules: [{ n: 'defend', on: false }] }));
  feed.reply(game, 'start_game', {}, { content: [{ type: 'text', text: 'New game g1: a new bot.' }], structuredContent: {} });
  const args = { steps: [{ skill: 'collect', args: { block: 'oak_log', n: 4 } }], why: 'Wood first', plan: 'Then planks.' };
  feed.call(game, 'play_sequence', args);
  feed.reply(game, 'play_sequence', args, { isError: true, content: [{ type: 'text', text: 'Your user wants to watch: call live_view first and show the HTML it returns.' }], structuredContent: { code: 'NEED_LIVE_VIEW' } });
  for (const u of sent) p.term(cleanTerm(u));
  t += 1000;
  const d = drawnTexts(p, t);
  assert.deepEqual(d.qa, []);
  const rawText = d.texts.join('');
  assert.equal((rawText.match(/NEED_LIVE_VIEW/g) ?? []).length, 1, 'the code once');
  // before the first play call that ran: the card with the four colours
  let t2 = 1_000_000;
  const q = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t2 });
  q.term(cleanTerm({ caller: 'MUSE', game: { id: 'g2', s: 3 }, rules: [{ n: 'defend', on: false }], lines: [{ k: 'call', t: '> start_game', tool: 'start_game', raw: '{}', rid: 1 }, { k: 'reply', t: '< New game g2: a new bot at a fresh spot with an empty inventory. Goal: free play.', rid: 1 }] }));
  t2 += 1000;
  const d2 = drawnTexts(q, t2);
  assert.deepEqual(d2.qa, []);
  for (const label of ['Muse: its calls, why and plan', 'its rules', 'the body on its own', 'the server']) assert.ok(d2.texts.includes(label), label);
});

test('HUD rules before the first play call: the right column says what the body does by itself (nothing, with no rule), no hole over 30 px', () => {
  for (const caller of ['MUSE', 'TEST SCRIPT']) {
    for (const goalKey of ['nether_and_back', 'free']) {
      let t = 1_000_000;
      const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
      const plan = planText({ key: goalKey, title: goalKey, text: null, parts: null }, { leaseMin: 30 });
      p.term(cleanTerm({ caller, game: { id: 'g1', s: 4 }, goal: { key: goalKey, title: 'Nether and back', text: null, list: MILESTONES }, rules: [{ n: 'defend', on: false }, { n: 'flee', on: false }, { n: 'escape', on: false }, { n: 'eat_below', on: false }],
        st: { hp: 20, food: 20, clock: 'DAY 08:10', ticks: 2200 },
        lines: [{ k: 'call', t: '> start_game', tool: 'start_game', raw: '{}', rid: 1, src: 'muse' }, { k: 'reply', t: `< ${replyHead({ content: [{ text: `New game g1: a new bot at a fresh spot with an empty inventory.\n${plan}` }] })}`, rid: 1 }, { k: 'call', t: '> live_view', tool: 'live_view', raw: '{}', rid: 2, src: 'muse' }, { k: 'reply', t: '< Live view of game g1: test caller: no Facebook live.', rid: 2 }] }));
      t += 5000;
      p.render(t);
      const h = p.hud(t);
      const what = `${caller}, ${goalKey}`;
      assert.ok(h.layout.leftGap <= 30 && h.layout.rightGap <= 30, `${what}: gaps ${h.layout.leftGap} / ${h.layout.rightGap}`);
      assert.deepEqual(h.qa.problems, [], what);
      assert.ok(h.layout.fillers.card >= 1, `${what}: the card`);
    }
  }
});

// g0a414c, the first Muse game on this HUD: a call of 10 steps (and 4 the server added) did not fit and the HUD stopped
// drawing at 1:29; the share said "no actions yet" after Muse's policy call; the hotbar read as owned at 0
test('HUD g0a414c: a call with many steps folds them and the HUD keeps drawing; RAW says when each call was sent and the newest\'s age; empty hotbar slots', () => {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  const names = ['collect oak_log 8', 'craft wooden_pickaxe 1', 'collect cobblestone 11', 'craft stone_pickaxe 1', 'craft furnace 1', 'collect coal_ore 4', 'collect iron_ore 8', 'smelt raw_iron 8', 'craft iron_pickaxe 1', 'shield'];
  p.term(cleanTerm({ caller: 'MUSE', game: { id: 'g0a414c', s: 60 }, rules: [{ n: 'defend', on: true, setS: 83, call: 1 }, { n: 'escape', on: true, setS: 83, call: 1 }, { n: 'eat_below', on: true, v: 6, setS: 83, call: 1 }, { n: 'flee', on: false }],
    st: { hp: 20, food: 20, clock: 'DAY 10:55', ticks: 4900, muse: 1, reflex: 0, rule: 0, body: 0, pct: 100, dpct: 100 }, inv: {},
    lines: [{ k: 'call', t: '> play_sequence', tool: 'play_sequence', words: 'Collecting logs and crafting up the tool chain to an iron pickaxe plus a shield before nightfall.', plan: 'Then head deep for deepslate_diamond_ore with the iron pickaxe.', of: 10, rid: 5, raw: '{}', src: 'muse',
      steps: names.map((r) => ({ say: r, raw: r, skill: r.split(' ')[0], args: '{}' })) }], live: { mode: 'run', c: 2, s: 1 } }));
  p.term(cleanTerm({ bind: 2, added: [{ before: 2, raw: 'craft oak_planks 8' }, { before: 2, raw: 'craft stick 4' }, { before: 2, raw: 'craft crafting_table 1' }, { before: 4, raw: 'craft stick 2' }] }));
  t += 5000;
  p.render(t);
  let h = p.hud(t);
  assert.ok(h.layout, 'drawn');
  assert.deepEqual(h.qa.problems, []);
  // a step further along: done steps fold into one row
  p.term(cleanTerm({ live: { mode: 'run', c: 2, s: 5 } }));
  t += 1000;
  p.render(t);
  h = p.hud(t);
  assert.deepEqual(h.qa.problems, []);
  const d = drawnTexts(p, t);
  assert.ok(d.texts.some((x) => /^4 steps done: /.test(x)), d.texts.filter((x) => /steps? done|more queued/.test(x)).join(' | '));
  assert.ok(d.texts.some((x) => /more queued: /.test(x)));
  // the share after Muse's policy call: decided 100%, never "no actions yet"
  assert.ok(d.texts.includes('decided') && !d.texts.includes('no actions yet'));
  // the hotbar: nothing owned, no digits
  assert.ok(!d.texts.some((x) => x === '0'), 'no 0 under an empty slot');
  // RAW: the send time on the game clock, the newest's age in the header, ticking
  assert.ok(d.texts.some((x) => /^\d+ calls? · newest \d+s ago/.test(x)), d.texts.filter((x) => /calls/.test(x)).join(' | '));
  t += 3000;
  const d2 = drawnTexts(p, t);
  const age = (ts) => Number(/newest (\d+)s ago/.exec(ts.find((x) => /newest \d+s ago/.test(x)))[1]);
  assert.equal(age(d2.texts) - age(d.texts), 3, 'the age moves on');
  // a drawing that throws keeps the panel going and is counted
  const p2 = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p2.term(cleanTerm({ caller: 'MUSE', game: { id: 'g1', s: 1 } }));
  p2.perf();
  p2.term({ lines: [], rules: [{ n: 'defend', on: true }] });
  const orig = Array.prototype.find;
  // a corrupt state: a goal list that is not a list
  p2.term({ goal: { key: 'x', title: 'x', list: [{ k: 'a', t: 'a', atS: null }] } });
  t += 2000;
  assert.doesNotThrow(() => p2.render(t));
  assert.equal(orig, Array.prototype.find);
});

test('HUD hotbar: owned items full colour with their count, the best pickaxe held; not owned a faint silhouette', () => {
  let t = 1_000_000;
  const p = createUiPanel({ design: 'final', width: 1080, height: 472, over: 72, now: () => t });
  p.term(cleanTerm({ caller: 'MUSE', game: { id: 'g1', s: 10 }, inv: { pick: 'stone', diamond: 0, iron: 3, shield: 0 } }));
  t += 1000;
  const inv = p.hud(t).state.inventory;
  assert.deepEqual(inv.slice(0, 3).map((x) => [x.icon, x.count]), [['stone_pickaxe', 1], ['diamond', 0], ['iron_ingot', 3]]);
  const d = drawnTexts(p, t);
  assert.ok(d.texts.includes('3') && d.texts.includes('1'));
  assert.ok(!d.texts.includes('0'));
});

test('HUD advice: STUCK first and prominent (what is not moving, the alternatives), TIME as a one-line warning; QA clean', () => {
  const { p, step, now } = rulesGame();
  step(5000);
  p.term(cleanTerm({ adv: [
    { k: 'night', t: 'night in about 60 s: no closed shelter around you', sev: 2 },
    { k: 'time', t: '4 min left in this game; the goal still needs: the portal frame, the Nether, back in the Overworld', sev: 2 },
    { k: 'stuck', t: 'stuck: collect obsidian (0 of 10 after 75 s); no formed obsidian within reach. Try: bucket fill water next to the lava pool at 12 40 -8; or explore 64 blocks east for another pool', sev: 2 },
  ] }));
  step(1000);
  const h = p.hud(now()).state;
  assert.deepEqual(h.advice.items.map((it) => it.kind ?? 'other'), ['stuck', 'other', 'time']);
  assert.match(h.advice.items[0].text, /^Collect obsidian \(0 of 10 after 75 s\)/, 'the tag says "stuck"');
  const d = drawnTexts(p, now());
  assert.deepEqual(d.qa, []);
  assert.ok(d.texts.some((x) => /^Collect obsidian \(0 of 10 after 75 s\)/.test(x)), 'what is not moving leads');
  assert.ok(d.texts.some((x) => /Try: bucket fill water/.test(x)) || d.texts.some((x) => /^Try:|bucket fill water/.test(x)), 'the alternatives');
  // one line: its lead and the rest of that line, cut with an ellipsis; nothing of it on a second line
  const at = d.texts.findIndex((x) => /^4 min left in this game/.test(x));
  assert.ok(at >= 0, 'the time left');
  assert.match(d.texts[at + 1], /…$|Overworld$/, 'cut on its one line');
  assert.ok(!d.texts.some((x) => /^(?:Overworld|the Nether, back|back in the Overworld)/.test(x)), 'no second line');
  for (const ch of 'STUCK') assert.ok(d.texts.includes(ch), 'the STUCK tag');
});
