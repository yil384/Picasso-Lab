// test/replay.test.js - Muse's real calls replayed (the log hunt's REPLAY): every step of production games gb1cfe3
// (2026-10-11, the iron pickaxe), g64e8c5, g0793f1 and ga13a88 (2026-10-12, the long runs to the Nether and back), as Muse sent them, through our
// /mcp against the fake runtime, with the incidents of the real game played by the fake where they happened (the
// guard reflex equipping the fresh shield, the furnace hitch, a bag full of rock, no lava pool near the first time).
// What is checked, on every reply: no false failure (a step production did is ok here, a step that failed there gets
// the right code here), only known codes, no runtime jargon (entity ids, raw floats, "build: true"), Body advice with
// at most 5 items, one of each kind, every hint a valid call, and advice that changes with the game rather than the
// same list on every reply. Every future change must pass it.
// Since the one-line prompt (2026-10-12) each game is started with its goal and every call carries a why, as the
// server's instructions ask, and the game ends with end_game: its report (milestones with times, deaths with causes,
// who acted, the decision log from the whys and the advice followed or declined) is checked against the game.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { RESULT_CODES } from '../src/contracts.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { games } = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'replay-prod.json'), 'utf8'));
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'replay-')) });
const JARGON = /#\d{2,}|\d\.\d{5,}|capability_limit|build: true|engagement minimum|NO_LOADED_MATCHING_TARGETS|consumption of/;

/** What the fake runtime does before a step, to play the real game's incidents (by the step's index in the game). */
const INCIDENTS = {
  g64e8c5: {
    // the shelter's dirt (production collected 11 dirt for its walls within the step; the fake build does not)
    // where the game played (its walks are within reach of there), and the shelter's dirt
    0: (w) => { w.position = { x: -55.5, y: 84, z: -275.5 }; w.inventory.set('dirt', 13); },
    // the furnace hitch: "The block appeared, but consumption of furnace was not observed"
    15: (w) => w.takeovers.push({ tool: 'smelt_item', made: false, error: 'The block appeared, but consumption of furnace was not observed (inventory 1 → 1).' }),
    19: (w) => { w.food = 9; },
    // the gravel gave 1 flint
    28: (w) => { w.inventory.set('flint', (w.inventory.get('flint') ?? 0) + 1); },
    // no lava pool within 16 blocks of the first try
    31: (w) => { w.blocks = []; },
    // the guard reflex put the fresh shield in the off-hand, the temporary table left standing
    36: (w) => w.takeovers.push({ tool: 'craft_item', made: true, offHand: 'shield', tableLeft: true, error: 'Equip an available shield before nearby hostiles require a guard.' }),
    // a lava pool next to the bot the second time
    37: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }]; },
    // a bag full of rock dug on the walks: "No free slot or matching stack space for mutton"
    39: (w) => {
      for (let k = 0; k < 24; k++) w.inventory.set(`junk_${k}`, 1);
      for (const [k, n] of [['cobbled_deepslate', 314], ['tuff', 73], ['gravel', 9], ['clay_ball', 16], ['azalea', 2], ['flowering_azalea', 1], ['moss_block', 5]]) w.inventory.set(k, n);
      w.fail.collect_mob_drop = 'No free slot or matching stack space for mutton.';
    },
    45: (w) => { delete w.fail.collect_mob_drop; for (let k = 0; k < 24; k++) w.inventory.delete(`junk_${k}`); },
    47: (w) => { w.food = 6; },
    // the Nether arrival where production's was
    51: (w) => { w.netherAt = { x: -2.5, y: 68, z: -30.5 }; },
  },
};
INCIDENTS.g0793f1 = {
  0: (w) => { w.position = { x: 381.5, y: 103, z: -21.5 }; },
  // flint picked up on the walks
  22: (w) => { w.inventory.set('flint', 1); },
  // the nearest lava pool 69 blocks away
  24: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: 360, y: 34, z: -78, level: 0 }] }]; },
  // a pool next to it, and a skeleton the hide reflex answered in the middle of the collect
  26: (w) => {
    w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }];
    w.takeovers.push({ tool: 'collect_block', made: false, error: 'hide response for skeleton#41 at 300,40,50 (8.0 blocks) (hurt: health is below the engagement minimum).' });
  },
  // food 6 at 3.4 health, rotten flesh the only food: eaten now, with a warning
  27: (w) => { w.food = 6; w.health = 3.4; for (const f of ['bread', 'cooked_beef', 'cooked_mutton', 'beef']) w.inventory.delete(f); w.inventory.set('rotten_flesh', 2); },
  28: (w) => { w.inventory.set('cobblestone', 20); },
  // shot by a skeleton during the hunt
  29: (w) => { w.die = 'collect_mob_drop'; w.dieCause = 'Tst_rv was shot by Skeleton'; },
  // the items back at the death spot (the fake runtime's pickup does not restore them)
  31: (w) => { for (const [k, n] of [['diamond_pickaxe', 1], ['iron_pickaxe', 1], ['water_bucket', 1], ['flint_and_steel', 1], ['shield', 1], ['cobblestone', 20], ['cooked_beef', 4]]) w.inventory.set(k, n); w.health = 12; w.food = 14; },
  34: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: 287, y: 84, z: 53, level: 0 }] }]; },
  36: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: 287, y: 84, z: 53, level: 0 }] }]; },
  37: (w) => { for (const [k, n] of [['cobblestone', 214], ['cobbled_deepslate', 155], ['granite', 32], ['andesite', 24], ['tuff', 7]]) w.inventory.set(k, n); },
  // lava at the first frame site
  39: (w) => { w.boxAt = (x, y, z) => (x === 287 && y === 84 && z === 53 ? 'lava' : 'air'); },
  40: (w) => { w.boxAt = null; },
  43: (w) => { w.netherAt = { x: 49.5, y: 97, z: -6.5 }; },
};

INCIDENTS.ga13a88 = {
  0: (w) => { w.position = { x: -23.5, y: 81, z: 234.5 }; },
  // the gravel gave 3 flint
  23: (w) => { w.inventory.set('flint', 3); },
  // the bucket fills that failed (a flowing cell named, a skeleton, a stalled path, a drowned) until the one that worked
  27: (w) => { w.fail.use_bucket = 'The named cell holds water, not a water source; a bucket only scoops sources.'; },
  // the blocks dug on the walks (production carried 425 at the first night's shelter)
  33: (w) => { w.inventory.set('cobblestone', 120); },
  // hungry where production ate
  37: (w) => { w.food = 10; },
  38: (w) => { w.food = 18; },
  43: (w) => { w.food = 17; w.inventory.set('porkchop', 1); }, // the hunt gave 4, 2 were cooked
  63: (w) => { w.food = 10; },
  44: (w) => { delete w.fail.use_bucket; },
  // the lava pool next to it
  48: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }]; },
  // the second site was a hillside of stone; the third had birch leaves where the frame would stand
  55: (w) => { w.boxAt = (x, y) => (y >= Math.floor(w.position.y) + 1 ? 'stone' : 'air'); },
  56: (w) => { w.boxAt = null; },
  57: (w) => { w.boxAt = (x, y) => (y >= Math.floor(w.position.y) + 1 ? 'birch_leaves' : 'air'); w.inventory.set('obsidian', 14); },
  58: (w) => { w.boxAt = null; },
  // the obsidian back from the frames that failed
  64: (w) => { w.inventory.set('obsidian', 14); },
  66: (w) => { w.netherAt = { x: 12.5, y: 58, z: 18.5 }; },
};

INCIDENTS.g08370a = {
  0: (w) => { w.position = { x: -258.5, y: 74, z: -11.5 }; },
  // a zombie the fight reflex answered in the middle of the cobblestone
  5: (w) => w.takeovers.push({ tool: 'collect_block', made: false, error: 'fight response for zombie#12 at 1,2,3 (2.0 blocks).' }),
  // the water went into a bucket drop on the way down (production's go_to); the second fill needs the empty bucket
  25: (w) => { w.inventory.delete('water_bucket'); w.inventory.set('bucket', 1); },
  29: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }]; },
  30: (w) => { w.inventory.set('flint', 1); }, // set a step early: the check reads the body's last status
  33: (w) => { w.inventory.set('raw_iron', 1); w.inventory.set('cobblestone', 120); }, // and the blocks dug on the walks (404)
};

const LAVA_NEAR = (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }]; };
const LIT = (x, y, z) => (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }, { name: 'nether_portal', found: 6, listed: [{ x, y, z }] }]; };
const POOL_AWAY = (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 30, y: Math.floor(w.position.y) - 20, z: Math.floor(w.position.z) - 8, level: 0 }] }]; };
const GROUND = (kind) => (w) => { const feet = Math.floor(w.position.y); w.boxAt = (x, y) => (y >= feet + 2 ? (kind === 'rock' ? 'stone' : 'oak_leaves') : y >= feet ? (kind === 'rock' ? 'stone' : 'air') : 'dirt'); };
INCIDENTS.g809e1b = {
  0: (w) => { w.position = { x: 372.5, y: 122, z: 171.5 }; },
  // a lit portal loaded 140 blocks off (g0793f1's frame, unknown to this process): refused, with where to go
  19: (w) => { w.inventory.set('cobblestone', 120); },
  22: LIT(272, 88, 67), // a step early: the bot's scan of the blocks around is read after a step
  25: POOL_AWAY,
  27: LAVA_NEAR,
  28: (w) => { w.inventory.set('flint', 2); },
  // the hillside: stone and dirt where the frame goes, cleared first now; then the frames on the mountain, rock and
  // oak leaves, each built on a cleared site
  31: GROUND('rock'),
  33: (w) => { w.boxAt = null; },
  34: (w) => { GROUND('rock')(w); w.inventory.set('obsidian', 14); },
  35: (w) => { w.boxAt = null; },
  42: (w) => { GROUND('leaves')(w); w.inventory.set('obsidian', 14); },
  43: (w) => { w.boxAt = null; },
};
INCIDENTS.g4ac86b = {
  0: (w) => { w.position = { x: 140.5, y: 96, z: 311.5 }; },
  5: (w) => { w.inventory.set('dirt', 13); },
  // the portal Nether trips come back to (ga13a88's, from an earlier process): refused, with where to go
  19: LIT(49, 93, 161), // a step early: the bot's scan of the blocks around is read after a step
  22: POOL_AWAY,
  24: LAVA_NEAR,
  25: (w) => { w.inventory.set('flint', 2); },
  28: GROUND('rock'),
  29: (w) => { w.boxAt = null; },
  30: (w) => { w.inventory.set('obsidian', 14); },
  32: (w) => { w.netherAt = { x: 12.5, y: 58, z: 18.5 }; },
  // the Nether side led back to the older portal at 49 93 161
  33: (w) => { w.overworldAt = { x: 49.5, y: 93, z: 161.5 }; },
};

INCIDENTS.g71c9f5 = {
  // a zombie at the hole before the first call; it killed the bot in Muse's first collect
  0: (w) => { w.position = { x: 398.5, y: 77, z: -269.5 }; w.die = 'collect_block'; w.dieCause = 'Tst_rv was slain by Zombie'; },
  1: (w) => { w.inventory.set('oak_log', 0); w.position = { x: 93.5, y: 83, z: 89.5 }; }, // respawned near the world spawn
  20: LAVA_NEAR,
  22: (w) => { w.inventory.set('flint', 1); },
  // the obsidian it took (from the leftover portal at 49 93 160, production says) before Muse stopped the collect
  24: (w) => { w.inventory.set('obsidian', 14); },
  28: (w) => { w.netherAt = { x: 12.5, y: 58, z: 17.5 }; },
};

INCIDENTS.g0a414c = {
  0: (w) => { w.position = { x: -355.5, y: 78, z: -19.5 }; },
  18: POOL_AWAY,
  21: LAVA_NEAR,
  // flowing lava only near the second try
  22: (w) => { w.blocks = [{ name: 'lava', found: 3, listed: [{ x: Math.floor(w.position.x) + 2, y: Math.floor(w.position.y), z: Math.floor(w.position.z), level: 3 }, { x: Math.floor(w.position.x) + 30, y: Math.floor(w.position.y), z: Math.floor(w.position.z), level: 0 }] }]; },
  24: LAVA_NEAR,
  // the pit where the 12th obsidian would not come: routes that stop without breaking anything
  26: (w) => { LAVA_NEAR(w); w.fail.collect_block = 'Collection stopped: 5 routes in a row stopped without breaking or gaining anything; the last: the walk there got stuck. Broke 0 matching blocks; inventory gained 0/3 requested items.'; },
};

/** The code a step that failed in production gets here (by index); every other step is ok. */
const EXPECTED = {
  // 1: raw_chicken (refused before a hunt until 2026-10-12) is read as chicken now and hunted (src/tolerant.js); 18: production smelted the mutton again after its hitch, but here the
  // hitch was tried again within step 15, so the mutton is already cooked and the repeat is refused by the check;
  // 31: no lava pool within 16 blocks; 39: the full bag
  g64e8c5: { 18: 'NEED_ITEMS', 31: 'LAVA', 39: 'INVENTORY_FULL' },
  // 22: a second fill without an empty bucket (production's first fill had timed out; here it worked): not checked;
  // 24, 34: no pool within 16 blocks (the reply names the nearest); 26: a reflex took the collect over; 29: the death;
  // 39: lava next to the frame's site
  g0793f1: { 22: null, 24: 'LAVA', 26: 'INTERRUPTED', 29: 'DIED', 34: 'LAVA', 39: 'LAVA' },
  // 0: production's first collect found no path out of the 24-block shaft the pre-play dig made (fixed, and the fake
  // never dug it): ok here; 1: go_to {pos}, refused in production, runs; the bucket fills, walks and the frame that
  // failed for the world's reasons (a flowing cell, reflexes, paths, one stone cell kept): not checked; 46: stopped by
  // Muse; 55, 57: the stone hillside and the birch leaves are cleared first and built on; 58: not checked
  // 5: the zombie; 6: the death in the middle of the shelter (the fake's shelter is done); 23, 32: walks the world stopped
  g08370a: { 5: 'INTERRUPTED', 6: null, 23: null, 32: null },
  // the walks the world stopped (16, 18), Muse's stop (17), the lit portal and the pools (23, 25: refused as in
  // production), the frames after the first two (36 to 45: built or not, the world's business here)
  // 23: refused when that frame is unknown, released when g0793f1's replay (earlier in this file) left it there, as it did
  g809e1b: { 16: null, 17: null, 18: null, 23: null, 25: 'LAVA', 32: null, 36: null, 38: null, 40: null, 42: null, 44: null, 45: null },
  // the lit portal and the pool far off (20, 22), the explore that found no plains (29)
  // 20: the lit portal at 49 93 161 no longer stops the collect: its frame is spared (runtime patch 0014)
  g4ac86b: { 22: 'LAVA', 29: null },
  // 0: the zombie; 5: craft with no n, refused in production, runs now; the walks the world stopped (15, 24, 29);
  // Muse's stop (21)
  g71c9f5: { 0: 'DIED', 15: null, 21: null, 24: null, 29: null },
  // 19: no pool near; 22: only flowing lava near; 26 to 29: the pit (routes that break nothing), 27 a walk stuck
  g0a414c: { 19: 'LAVA', 22: 'LAVA', 26: 'FAILED', 27: null, 28: 'FAILED', 29: 'FAILED' },
  ga13a88: { 27: null, 28: null, 31: null, 40: null, 41: null, 42: null, 46: null, 47: null, 52: null, 53: null, 58: null },
};
/** An advice kind a step's reply must carry (by index): g0a414c's third obsidian call that did not move is stuck. */
const EXPECTED_ADVICE = { g0a414c: { 29: 'stuck' } };
/** What a step's reply must say (by index). */
const EXPECTED_TEXT = {
  g71c9f5: { 5: /^craft \{"item":"wooden_pickaxe","n":1\}: ok/ },
  g809e1b: { 31: /cleared \d+ cells of (stone and dirt|dirt and stone) for it first/, 34: /cleared \d+ cells of (stone and dirt|dirt and stone) for it first/ },
  g4ac86b: { 20: /a lit portal at 49 93 161 \(\d+ blocks away\) is loaded: its frame was left alone, the obsidian comes from lava or other obsidian/, 28: /cleared \d+ cells of/, 33: /your own portal is at -?\d+ -?\d+ -?\d+, \d+ blocks away \(the Nether side led to an older portal/ },
  // 55, 57: the stone hillside and the birch leaves are cleared first now, and the frames go up (g809e1b's fix)
  ga13a88: { 1: /^go_to \{"x":-20,"y":78,"z":236\}: ok/, 55: /cleared \d+ cells of stone for it first/, 57: /cleared \d+ cells of birch_leaves for it first/ },
};

/** The goal each game played for. */
const GOALS = { g0a414c: 'nether_and_back', g71c9f5: 'nether_and_back', g809e1b: 'nether_and_back', g4ac86b: 'nether_and_back', gb1cfe3: 'iron_pickaxe', g64e8c5: 'nether_and_back', g0793f1: 'nether_and_back', ga13a88: 'nether_and_back' };
/** A why for a step, as Muse writes them (the fixtures predate why in the log). */
const whyOf = (i, st) => `Step ${i}: ${[st.tool, ...Object.values(st.args ?? {}).filter((v) => typeof v !== 'object')].join(' ')} for the goal`;

/** What each game's report must say. */
const EXPECTED_REPORT = {
  gb1cfe3: (r) => {
    assert.equal(r.goalReached, true, 'the iron pickaxe');
    assert.deepEqual(r.milestones.map((m) => m.key), ['wooden_pickaxe', 'stone_pickaxe', 'iron_ingot', 'iron_pickaxe']);
    return true;
  },
  ga13a88: (r, text) => {
    // the whole way, with no death
    assert.deepEqual(r.milestones.filter((m) => m.atS === null).map((m) => m.key), [], text);
    assert.equal(r.goalReached, true);
    assert.match(text, /\nDeaths: none\./);
    return true;
  },
  g0793f1: (r, text) => {
    // the whole way: every milestone, back in the Overworld last
    assert.deepEqual(r.milestones.filter((m) => m.atS === null).map((m) => m.key), [], text);
    assert.equal(r.goalReached, true);
    assert.match(text, /\nGoal: reached at \d+:\d\d\./);
    // the death of step 29, with its cause
    assert.equal(r.deaths.length, 1, text);
    assert.match(text, /\nDeaths: \d+:\d\d was shot by Skeleton at 360 35 -78\./, 'the cause, without the bot\'s name');
    assert.doesNotMatch(text, /\nDeaths: none/);
    // advice that was followed (the pick_up after the death) and advice that was declined
    assert.ok(r.decisions.some((d) => d.kind === 'advice' && d.followed), 'advice followed');
    assert.ok(r.decisions.some((d) => d.kind === 'advice' && !d.followed), 'advice declined');
    return true;
  },
};

async function replay(id, steps) {
  const log = createLogger({ dir: null, config, keep: 2000 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '7200000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_rv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: 'replay' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const out = [];
  try {
    // the games ran with the reflexes on, before Muse's rules (2026-10-13): replayed with those rules set
    const start = await c.callTool({ name: 'start_game', arguments: { adult: true, goal: GOALS[id], rules: { defend: true, flee: true, escape: true, eat_below: 4 } } });
    assert.ok(!start.isError, start.content[0].text);
    if (GOALS[id]) assert.match(start.content[0].text, /\nGoal: [^\n]+\. The plan, milestone by milestone/);
    const fake = hosts.started[0].fake;
    for (const [i, st] of steps.entries()) {
      INCIDENTS[id]?.[i]?.(fake.world);
      const r = await c.callTool({ name: 'play', arguments: { skill: st.tool, args: st.args, why: whyOf(i, st) } });
      // the reply without the nudges at the top (test/liveview.test.js checks them)
      const text = r.content.map((x) => x.text).join('\n').replace(/^(?:(?:Your user cannot see the game yet: |Viewers see your why and plan under the video: |Next: call live_view now)[^\n]*\n\n)+/, '');
      const step = r.structuredContent?.steps?.at(-1) ?? null;
      out.push({ i, st, text, code: r.structuredContent?.code ?? null, status: step?.status ?? (r.isError ? 'refused' : null), result: step?.result ?? text.split('\n')[0], advice: r.structuredContent?.advice ?? [] });
    }
    // the game's report, mid-game and at the end
    const mid = await c.callTool({ name: 'game_report', arguments: {} });
    const end = await c.callTool({ name: 'end_game', arguments: {} });
    // what the game's replies were, together: the advice must change with the game
    return { out, rows: log.tail(2000), mid, end };
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
}

for (const [id, steps] of Object.entries(games)) {
  test(`replay ${id}: Muse's ${steps.length} real steps, no false failures, right codes, clean words, sane advice`, async () => {
    const { out, rows, mid, end } = await replay(id, steps);
    const expected = EXPECTED[id] ?? {};
    for (const o of out) {
      const want = o.i in expected ? expected[o.i] : 'ok';
      const where = `${id} step ${o.i} ${o.st.tool} ${JSON.stringify(o.st.args)}: ${o.result}`;
      if (want === 'ok') assert.equal(o.status, 'confirmed', `no false failure: ${where} ${process.env.REPLAY_SHOW ? o.text : ''}`);
      else if (want) assert.equal(o.code, want, `the right code: ${where}`);
      if (EXPECTED_TEXT[id]?.[o.i]) assert.match(o.text, EXPECTED_TEXT[id][o.i], where);
      if (EXPECTED_ADVICE[id]?.[o.i]) assert.equal(o.advice[0]?.kind, EXPECTED_ADVICE[id][o.i], `${where}: ${JSON.stringify(o.advice)}`);
      if (o.code) assert.ok(RESULT_CODES.includes(o.code), `a known code: ${where}`);
      assert.doesNotMatch(o.text, JARGON, `no runtime jargon: ${where}`);
      assert.ok(o.advice.length <= 5, `at most 5 advice items: ${where}`);
      assert.equal(new Set(o.advice.map((a) => a.kind)).size, o.advice.length, `one advice item of each kind: ${where}`);
      for (const a of o.advice) if (a.hint) assert.ok(MINEAI_SKILLS.validate(a.hint.skill, a.hint.args ?? {}).ok, `a valid hint (${a.hint.skill} ${JSON.stringify(a.hint.args)}): ${where}`);
    }
    // not the same advice on every reply: no advice text in more than 60% of the replies
    const counts = {};
    for (const o of out) for (const a of o.advice) counts[a.text] = (counts[a.text] ?? 0) + 1;
    for (const [text, n] of Object.entries(counts)) assert.ok(n <= Math.max(3, out.length * 0.6), `advice repeated on ${n} of ${out.length} replies: ${text}`);
    // the log has every call (F9)
    assert.equal(rows.filter((r) => r.kind === 'mcp_call' && r.tool === 'play').length, steps.length);

    // the report: the goal, the milestones in time order, the deaths, who acted, the decision log with every why
    const report = end.structuredContent?.report;
    const text = end.content.map((x) => x.text).join('\n');
    assert.ok(report, 'end_game returns the report');
    assert.match(text, /^Game ended\.\n\nReport for game g\w+: goal /);
    assert.doesNotMatch(text, JARGON);
    assert.match(text, /\nThis game: \d+ actions? by Muse/, 'the attribution line');
    assert.equal(report.goal, GOALS[id] ?? 'free');
    // the text lists the milestones reached in the order they came
    const times = (/\nMilestones: ([^\n]*)\./.exec(text)?.[1] ?? '').split(', ').map((m) => /(\d+):(\d\d)(?:;|$)/.exec(m)).filter(Boolean).map((m) => Number(m[1]) * 60 + Number(m[2]));
    assert.deepEqual(times, [...times].sort((a, b) => a - b), 'milestones in the order they came');
    const calls = report.decisions.filter((d) => d.kind === 'call');
    assert.equal(report.decisionsLeftOut, 0);
    assert.equal(calls.length, steps.length, 'every call in the decision log');
    for (const d of calls) assert.match(d.why, /^Step \d+: /, 'every call keeps its why');
    assert.match(mid.content[0].text, /^Report for game g\w+: goal /, 'game_report mid-game');
    assert.equal(EXPECTED_REPORT[id]?.(report, text) ?? true, true);
    if (process.env.REPLAY_SHOW) console.log(text);
  });
}
