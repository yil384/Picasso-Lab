// test/hud-b.test.js - the stream's HUD in concept B "Speedrun broadcast" (src/hud-b.js through src/ui-panel.js, the
// default design): the states a game goes through (before the first command, a command's toast, a second command
// while one holds, a burst of the same command, long calls, STUCK and TIME, rules none and some, a rule firing, a new
// goal, a split, a death, the Nether), each with no text leaving the frame or overlapping another; the toasts' timing
// (one up and one going home at most), the pieces told to the recording, and a frame written only when the picture
// changed
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createUiPanel } from '../src/ui-panel.js';
import { buildModel } from '../src/hud-b.js';
import { cleanTerm } from '../src/terminal.js';
import { createRecording } from '../src/recorder.js';
import { cameraOptions, FILM_SIZE } from '../src/camera.js';
import { loadConfig } from '../src/config.js';
import { createRequire } from 'node:module';

const KEYS = ['wooden_pickaxe', 'stone_pickaxe', 'iron_ingot', 'iron_pickaxe', 'diamond', 'diamond_pickaxe', 'water_bucket', 'obsidian', 'flint_and_steel', 'portal', 'nether', 'back'];
const goal = (done = 0) => ({ key: 'nether_and_back', title: 'Nether and back', text: null, list: KEYS.map((k, i) => ({ k, t: k.replace(/_/g, ' '), atS: i < done ? 40 + i * 70 : null })) });
const OFF = [{ n: 'defend', on: false }, { n: 'flee', on: false }, { n: 'escape', on: false }, { n: 'eat_below', on: false }];
const RULES3 = [{ n: 'defend', on: true, setS: 10, call: 1 }, { n: 'flee', on: false }, { n: 'escape', on: true, setS: 10, call: 1 }, { n: 'eat_below', on: true, v: 6, setS: 10, call: 1 }];

/** A B panel on a fake clock, fed through the feed's cleaning; run(ms) plays its 30 fps timer. */
function game(caller = 'MUSE') {
  let t = 1_000_000;
  let gs = 4;
  const events = [];
  const p = createUiPanel({ width: 1080, height: 472, over: 608, now: () => t, qa: true, onEvent: (e) => events.push(e) });
  let rid = 10;
  let writes = 0;
  const up = (u) => p.term(cleanTerm({ game: { id: 'g71c9f5', s: Math.floor(gs) }, ...u }));
  const run = (ms, each) => {
    const end = t + ms;
    while (t < end) {
      t += 1000 / 30; gs += 1 / 30;
      p.render(t);
      if (each) each(t);
    }
  };
  // the write count: frames whose picture changed (render marks them; bmp() would write them)
  const changed = () => { const x = p.perf(); writes += x.composes; return x; };
  const play = (tool, steps, why = '', plan = '') => {
    rid += 1;
    const raw = JSON.stringify(tool === 'play' ? { ...steps[0], ...(why ? { why } : {}), ...(plan ? { plan } : {}) } : { steps, ...(why ? { why } : {}), ...(plan ? { plan } : {}) });
    up({ lines: [{ k: 'call', t: `> ${tool}`, tool, ...(why ? { words: why } : {}), ...(plan ? { plan } : {}), of: steps.length, rid, raw, src: 'muse',
      steps: steps.map((s) => ({ say: s.say ?? s.skill, raw: `${s.skill}`, skill: s.skill, args: JSON.stringify(s.args ?? {}) })) }], live: { mode: 'run', c: rid - 10, s: 1 } });
    return rid;
  };
  up({ caller, goal: goal(0), rules: OFF, st: { hp: 20, food: 20, clock: 'DAY 08:10', ticks: 2200, muse: 0, reflex: 0, rule: 0, body: 0 }, inv: {},
    lines: [{ k: 'call', t: '> start_game', tool: 'start_game', raw: '{"goal":"nether_and_back"}', rid: 1, src: 'muse' }, { k: 'reply', t: '< New game g71c9f5: a new bot at a fresh spot with an empty inventory. Goal: Nether and back.', rid: 1 }] });
  run(1000);
  return {
    p, up, run, play, events, changed, get t() { return t; }, get gs() { return gs; },
    hud: () => p.hud(t),
    plan: () => p.hud(t).plan,
    model: () => p.hud(t).model,
  };
}
// every text box inside the frame and none overlapping another
function qaOf(qa) {
  const bad = [];
  for (const b of qa) if (b.x0 < 8 || b.x1 > 1072 || b.y0 < 0 || b.y1 > 1080) bad.push(`out: ${b.s}`);
  for (let i = 0; i < qa.length; i++) for (let j = i + 1; j < qa.length; j++) {
    const a = qa[i], b = qa[j];
    if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) bad.push(`overlap: "${a.s}" / "${b.s}"`);
  }
  return bad;
}
const texts = (g) => g.hud().qa.map((b) => b.s).join(' | ');

test('HUD B: before the first command, what to watch for; rules none; the top bar; QA clean', () => {
  const g = game();
  const m = g.model();
  assert.equal(m.status.words, 'Waiting for Muse’s first command');
  assert.equal(m.phase.icon, 'sun');
  assert.match(m.phase.words, /^dusk in \d+ min$/);
  const tx = texts(g);
  assert.match(tx, /Each command Muse sends pops up over the video, then lands here\./);
  assert.match(tx, /Start a new game/);
  assert.deepEqual(qaOf(g.hud().qa), []);
  assert.equal(g.p.perf().errors ?? 0, 0);
  assert.equal(g.p.design, 'b');
  assert.equal(g.p.height, 1080, 'the whole frame');
});

test('HUD B: a command is a toast: in 0.4 s, held 5 to 9 s by its why, then home (the command bar while it runs); told to the recording', () => {
  const g = game();
  const why = "The body's self-defense reflexes start off this game, so I am switching defend and escape on before anything else.";
  g.play('play', [{ skill: 'policy', args: { defend: 'on', escape: 'on', eat_below: 6 } }], why);
  g.run(200);
  const [k] = g.plan().toasts;
  assert.equal(k.action, 'Set 3 rules');
  const hold = (k.dockStart - k.start) / 1000;
  assert.ok(hold >= 5 && hold <= 9, `hold ${hold}`);
  assert.ok(Math.abs(k.dockEnd - k.dockStart - 467) < 2, 'home in 14 frames');
  assert.ok(k.start - g.t < 0 && g.t - k.start < 260, 'shown at once');
  // the reply: the rules on (a floater over the bot), the command done; the rules stand in the action bar's place
  g.up({ lines: [{ k: 'ok', t: 'ok  rules: defend on, escape on, eat at food 6 (0.1 s)', s: 1, ms: 100, src: 'muse' }, { k: 'reply', t: '< policy: ok: your rules now: defend on, escape on, eat at food 6', rid: 11 }], rules: RULES3, live: { mode: 'idle' } });
  g.run(1000);
  assert.ok(g.events.some((e) => e.ev === 'floater' && e.text === '3 rules on'));
  assert.deepEqual(qaOf(g.hud().qa), []);
  g.run(hold * 1000 + 600);
  const ev = g.events.filter((e) => e.ev.startsWith('toast'));
  assert.deepEqual(ev.map((e) => e.ev), ['toast', 'toast_dock']);
  assert.equal(ev[0].action, 'Set 3 rules');
  assert.equal(ev[0].why, why);
  assert.ok(Number.isFinite(ev[0].start) && Number.isFinite(ev[0].dockStart) && Number.isFinite(ev[0].gs), 'with its times');
  assert.equal(ev[1].to, 'feed', 'done by then: home is its feed row');
  assert.equal(g.model().feed[0].action, 'Set 3 rules');
  assert.equal(g.model().feed[0].result, 'defend, escape, eat at food 6');
});

test('HUD B: a second command while one holds: the first is cut short, the next comes in; never more than one up and one going home', () => {
  const g = game();
  g.play('play', [{ skill: 'policy', args: { defend: 'on' } }], 'Defend first, it is getting late.');
  g.run(2000);
  g.play('play_sequence', [{ skill: 'collect', args: { block: 'oak_log', n: 5 } }, { skill: 'craft', args: { item: 'crafting_table', n: 1 } }], 'Wood for a table and a pickaxe.');
  let worst = 0;
  g.run(12_000, (t) => {
    const ks = g.plan().toasts.filter((k) => t >= k.start && t < k.dockEnd);
    const up = ks.filter((k) => t < k.dockStart).length;
    const home = ks.filter((k) => t >= k.dockStart).length;
    assert.ok(up <= 1 && home <= 1, `${up} up, ${home} going home at ${t}`);
    worst = Math.max(worst, ks.length);
  });
  const [a, b] = g.events.filter((e) => e.ev === 'toast');
  const cut = g.events.find((e) => e.ev === 'toast_cut');
  assert.ok(cut && cut.id === a.id, 'the first one cut short');
  assert.ok(cut.dockStart - a.start >= 1900, 'still up 1.9 s at least');
  assert.ok(b.start >= cut.dockStart + 160, 'the next after the first card is gone');
  assert.equal(b.action, 'Mine 5 oak logs');
  assert.ok(worst <= 2);
});

test('HUD B: a burst of the same command is one toast, xN; three different ones: the waiting one gives way', () => {
  const g = game();
  for (let i = 0; i < 3; i++) { g.play('play', [{ skill: 'collect', args: { block: 'stone', n: 3 } }], 'Cobblestone for the stone pickaxe.'); g.run(700); }
  const ts = g.events.filter((e) => e.ev === 'toast');
  assert.equal(ts.length, 1);
  assert.equal(g.events.filter((e) => e.ev === 'toast_fold').at(-1).n, 3);
  assert.equal(g.plan().toasts[0].n, 3);
  g.run(12_000);
  // three different commands within a second: the second never waits behind the third
  g.play('play', [{ skill: 'eat', args: {} }], 'Food first.');
  g.run(300);
  g.play('play', [{ skill: 'go_to', args: { x: 10, y: 64, z: 10 } }], 'To the river.');
  g.run(300);
  g.play('play', [{ skill: 'collect', args: { block: 'oak_log', n: 2 } }], 'Two more logs.');
  g.run(400);
  assert.equal(g.events.filter((e) => e.ev === 'toast_skip').length, 1);
  assert.ok(g.plan().toasts.filter((k) => k.start > g.t).length <= 1, 'one waiting at most');
});

test('HUD B: long calls (14 steps, a long why and plan, a long reply) fold, fit and keep drawing', () => {
  const g = game();
  const steps = Array.from({ length: 14 }, (_, i) => ({ skill: i % 2 ? 'craft' : 'collect', args: i % 2 ? { item: 'oak_planks', n: 4 } : { block: 'oak_log', n: 2 } }));
  const why = 'A long one: logs and planks over and over so the table, the sticks, the wooden pickaxe and later the stone one all come out of one call, with spare planks for a chest and a door before the night, then the walk back to the river.';
  g.play('play_sequence', steps, why, 'Then cobblestone; then iron from the cave under the hill if the night is not too close; if it is, a shelter first and the iron at dawn.');
  g.up({ sub: { kind: 'collect', text: 'chopping oak logs', done: 1, of: 2 } });
  for (const at of [300, 3000, 9000]) {
    g.run(at);
    assert.deepEqual(qaOf(g.hud().qa), [], `at ${at}`);
  }
  assert.equal(g.p.perf().errors ?? 0, 0);
  const m = g.model();
  assert.equal(m.status.kind, 'run');
  assert.match(m.status.ctx, /step 1 of 14/);
});

test('HUD B: STUCK and TIME pinned first (red, amber); a rule firing in the action bar and the feed', () => {
  const g = game();
  g.up({ rules: RULES3 });
  g.run(500);
  g.up({ adv: [{ k: 'stuck', t: 'stuck: 3 calls of collect stone failed the same way (NOT_FOUND); try explore first, or dig down', sev: 3 }, { k: 'time', t: 'Night in about 90 s (time 12100); a shelter or a bed before then', sev: 2 }] });
  g.run(500);
  g.up({ lines: [{ k: 'reflex', t: 'rule defend: fought a zombie (killed it)', src: 'rule', rule: 'defend', rs: 10, rc: 1, ago: 0 }] });
  g.run(600);
  const m = g.model();
  assert.deepEqual(m.feed.slice(0, 2).map((r) => [r.code, r.pin]), [['STUCK', 'stuck'], ['TIME', 'time']]);
  assert.match(m.feed[0].action, /^3 calls of collect stone failed the same way/);
  assert.doesNotMatch(m.feed[1].action + m.feed[1].result, /time 12100/);
  assert.equal(m.feed[2].code, 'RULE');
  assert.ok(g.events.some((e) => e.ev === 'actionbar' && e.code === 'RULE' && /^defend: fought a zombie/.test(e.text)));
  assert.deepEqual(qaOf(g.hud().qa), []);
});

test('HUD B: a new goal, a split and a death are banners, one at a time and after a toast; the Nether in the top bar', () => {
  const g = game();
  g.play('play', [{ skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }], 'The pickaxe.');
  g.run(500);
  g.up({ lines: [{ k: 'ok', t: 'ok  crafted 1 wooden_pickaxe (0.5 s)', s: 1, ms: 500, src: 'muse' }, { k: 'reply', t: '< craft: ok', rid: 11 }], goal: goal(1), live: { mode: 'idle' }, inv: { pick: 'wooden' } });
  g.run(500);
  const split = g.events.find((e) => e.ev === 'banner' && e.kind === 'split');
  const toast = g.events.find((e) => e.ev === 'toast');
  assert.ok(split && split.title === 'Wooden pickaxe' && split.type === 'Split 1 of 12');
  assert.ok(split.start >= toast.dockEnd, 'after the toast is home');
  g.run(12_000);
  g.up({ lines: [{ k: 'call', t: '> set_goal: kill 10 pigs', tool: 'set_goal', raw: '{"goal":"kill 10 pigs"}', rid: 30, src: 'muse' }, { k: 'reply', t: '< Goal set: kill 10 pigs (it was: Nether and back)', rid: 30 }],
    goal: { key: 'custom', title: 'Kill 10 pigs', text: 'kill 10 pigs', list: [{ k: 'kill_pig', t: 'pigs killed', done: 0, of: 10, atS: null }] } });
  g.run(1000);
  const nb = g.events.find((e) => e.ev === 'banner' && e.kind === 'goal');
  assert.equal(nb.title, 'Kill 10 pigs');
  assert.match(nb.sub, /0 of 10 so far · set at \d+:\d\d · Nether and back paused/);
  assert.equal(g.events.filter((e) => e.ev === 'toast').length, 1, 'set_goal has its banner, not a toast');
  assert.deepEqual(qaOf(g.hud().qa), []);
  g.up({ lines: [{ k: 'fail', t: 'death: died: slain by a zombie', ago: 0 }] });
  g.run(800);
  const db = g.events.find((e) => e.ev === 'banner' && e.kind === 'death');
  assert.ok(db && db.start >= nb.start + 4000, 'one banner at a time');
  assert.equal(db.title, 'Slain by a zombie');
  g.up({ st: { clock: 'NETHER', hp: 18, food: 15 }, lines: [{ k: 'milestone', t: 'entered the Nether at 14:10' }] });
  g.run(1200);
  assert.deepEqual(g.model().phase, { icon: 'flame', words: 'in the Nether', warn: false });
  assert.deepEqual(qaOf(g.hud().qa), []);
});

test('HUD B: rules none and some in the action bar\'s place; the hotbar: what is not carried an empty slot, the best pickaxe', () => {
  const g = game();
  const m0 = g.model();
  assert.deepEqual(m0.rules.on, []);
  g.up({ rules: RULES3, inv: { pick: 'iron', diamond: 2, obsidian: 0 } });
  g.run(500);
  const m = g.model();
  assert.deepEqual(m.rules.on.map((r) => r.n), ['defend', 'escape', 'eat_below']);
  const inv = Object.fromEntries(m.inv.map((x) => [x.key, x]));
  assert.equal(inv.pickaxe.icon, 'iron_pickaxe');
  assert.equal(inv.pickaxe.count, 1);
  assert.equal(inv.obsidian.count, 0);
  // the empty slots draw no number: the only digits over the hotbar are the counts carried
  const hb = g.hud().qa.filter((b) => b.y0 > 544 && b.y1 < 608 && b.x1 < 380).map((b) => b.s);
  assert.deepEqual(hb.sort(), ['1', '2']);
});

test('HUD B: TEST SCRIPT plays: its own code and words, never Muse\'s', () => {
  const g = game('TEST SCRIPT');
  g.play('play', [{ skill: 'collect', args: { block: 'oak_log', n: 5 } }], 'Recording test: wood.');
  g.run(500);
  const m = g.model();
  assert.equal(m.code, 'TEST');
  assert.match(m.status.ctx, /^the test script’s command/);
  assert.doesNotMatch(texts(g), /\bMuse\b/);
});

test('HUD B: a refused command gets no toast (its row says why); a frame is written only when the picture changed', () => {
  const g = game();
  g.changed();
  g.run(10_000);
  const idle = g.changed().composes;
  assert.ok(idle <= 12, `${idle} frames in 10 s with nothing moving (the clocks once a second)`);
  g.play('play', [{ skill: 'collect', args: { block: 'oak_log', n: 5 } }], 'Wood.');
  g.run(700);
  const moving = g.changed().composes;
  assert.ok(moving >= 15, `${moving} frames in the first 0.7 s of a toast (it slides in, its why fades in)`);
  g.up({ lines: [{ k: 'call', t: '> play', tool: 'play', raw: '{"skill":"eat"}', rid: 40, src: 'muse', of: 1, steps: [{ say: 'Eat', raw: 'eat', skill: 'eat', args: '{}' }] }, { k: 'reply', t: '< NEED_LIVE_VIEW: call live_view first.', rid: 40, code: 'NEED_LIVE_VIEW' }] });
  g.run(600);
  assert.equal(g.events.filter((e) => e.ev === 'toast').length, 1);
  assert.ok(g.model().feed.some((r) => r.code === 'NO' && r.result === 'NEED_LIVE_VIEW'));
});

test('HUD B: the lab\'s logo (STREAM_LOGO): off by default; on a white card, or a transparent light one drawn as it is with a hard shadow; top right, clear of the toasts\' band and the LIVE badge', () => {
  const frame = (logo) => {
    const p = createUiPanel({ width: 1080, height: 472, over: 608, now: () => 1_000_000, ...(logo ? { logo } : {}) });
    const c = p.render(1_000_000).getContext('2d');
    return (x, y) => [...c.getImageData(x, y, 1, 1).data];
  };
  assert.equal(frame(null)(1000, 40)[3], 0, 'off by default');
  const card = frame({ style: 'card' });
  assert.ok(card(1000, 20)[3] > 200 && card(1000, 20)[0] > 200, 'the white card');
  assert.equal(card(1000, 126)[3], 0, 'nothing between it and the toasts');
  assert.equal(card(60, 40)[3], 0, 'nothing at the top left (Facebook\'s LIVE badge)');
  // a transparent white logo of 600 x 300: drawn at 200 x 100 (100 px high at most) with its shadow, no card
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-'));
  const { createCanvas } = createRequire(import.meta.url)('canvas');
  const src = createCanvas(600, 300), sx = src.getContext('2d');
  sx.fillStyle = '#fff'; sx.fillRect(100, 100, 400, 100);
  fs.writeFileSync(path.join(dir, 'white.png'), src.toBuffer('image/png'));
  const plain = frame({ style: 'plain', file: path.join(dir, 'white.png') });
  assert.ok(plain(962, 64)[0] > 200, 'the white logo');
  assert.equal(plain(870, 20)[3], 0, 'no card around it');
  const sh = plain(960, 82); assert.ok(sh[3] > 0 && sh[0] < 60, 'its hard shadow 2 px down');
  fs.rmSync(dir, { recursive: true, force: true });
  // plain with no file: the owner's pixel logo (assets/brand), 230 px wide at the top right
  const pix = frame({ style: 'plain' });
  assert.ok(pix(1064 - 115, 14 + 38)[3] > 0 && pix(1064 - 232, 14 + 38)[3] === 0, 'the pixel logo, 230 px wide');
  assert.equal(pix(1000, 126)[3], 0);
  assert.equal(loadConfig({}).stream.logo, 'off');
  assert.equal(loadConfig({ STREAM_LOGO: 'plain', STREAM_LOGO_FILE: 'lab-logo-white.png' }).stream.logoFile, 'lab-logo-white.png');
});

test('HUD B: the model reads the state as the panel builds it (fixture: the long sample)', () => {
  const M = buildModel({ caller: 'MUSE', now: { gameS: 100 }, stats: { hp: 5, food: 20, dimension: 'overworld', ticks: 23_500, museShare: { muse: 3, rule: 1, body: 2 } }, raw: { total: 0, entries: [] }, inventory: [], goal: null, advice: { items: [] }, events: [] }, 100);
  assert.equal(M.phase.icon, 'sun', 'after 23000 the day has begun');
  assert.deepEqual(M.tally, { muse: 3, rule: 1, bot: 2 });
});

test('recording: the HUD\'s pieces in hud.jsonl with their times; the film option draws the client at 1920x1080', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-hudb-'));
  const rec = createRecording({ root, game: 'g71c9f5', now: () => 5000 });
  rec.event({ ev: 'toast', id: 1, start: 4000, dockStart: 9000, dockEnd: 9467, action: 'Set 3 rules' }, 12.5);
  rec.close();
  return new Promise((r) => setTimeout(r, 50)).then(() => {
    const line = JSON.parse(fs.readFileSync(path.join(root, 'g71c9f5', 'hud.jsonl'), 'utf8').trim());
    assert.deepEqual(line, { t: 5000, gs: 12.5, ev: { ev: 'toast', id: 1, start: 4000, dockStart: 9000, dockEnd: 9467, action: 'Set 3 rules' } });
    fs.rmSync(root, { recursive: true, force: true });
    assert.deepEqual(FILM_SIZE, [1920, 1080]);
    const off = cameraOptions(loadConfig({}));
    const on = cameraOptions(loadConfig({ CAMERA_FILM: 'on' }));
    assert.deepEqual([off.width, off.height], [960, 540]);
    assert.deepEqual([on.width, on.height], [1920, 1080]);
    assert.deepEqual([off.glThreads, on.glThreads], [8, 16], 'the film draws with 16 llvmpipe threads');
    assert.equal(loadConfig({}).stream.hud, 'b');
    assert.equal(loadConfig({ STREAM_HUD: 'final' }).stream.hud, 'final');
  });
});
