// test/care.test.js - what the body does by itself between the player's calls (src/mineai/care.js, ROADMAP M4): the
// decisions (a death's items, armor, food, spare tools, the night), their reflex events in our words, and the care loop
// against stand-ins for the body's calls: it acts only while the body is idle, yields to the player's step, and keeps a
// journal of everything it did (full mode). Advise mode (the default): the same needs as advice for the player, the
// reflexes as the policy skill's knobs say, and who acted (attribution).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decide, wearPlan, armorPlan, sparePlan, replacementFor, describeEvents, shelterCells, shelterVerdict, shelterBlocks,
  createCare, isNight, toolClassFor, pickaxeTierFor, describeCare, CARE_DEFAULTS, RECOVER_WITHIN_MS, advise, describeReflexes,
} from '../src/mineai/care.js';

const NOW = Date.parse('2026-10-09T03:00:00Z');
const stack = (name, count = 1, location = 'main', durability = null) => ({ name, count, location, durability });
const situation = (o = {}) => ({
  dimension: 'overworld', observedAt: new Date(NOW).toISOString(), vitals: { health: 20, food: 20, ...(o.vitals ?? {}) },
  clock: { timeOfDay: 1000, phase: 'day', ...(o.clock ?? {}) }, position: { x: 10.5, y: 64, z: -3.5, headingDegrees: 90 },
  nearby: { hostiles: [], mobs: [], players: [], ...(o.nearby ?? {}) }, lastDeath: o.lastDeath ?? null, activity: { owner: 'idle' },
});

test('care: night is from a little before beds until a little before morning', () => {
  assert.equal(isNight(12_000), false);
  assert.equal(isNight(12_300), true);
  assert.equal(isNight(18_000), true);
  assert.equal(isNight(23_300), false);
  assert.equal(isNight(undefined), false);
});

test('care: armor worn and crafted, best first, iron kept back for a pickaxe', () => {
  assert.deepEqual(wearPlan([stack('iron_chestplate'), stack('leather_chestplate', 1, 'torso'), stack('shield')]), [
    { item: 'iron_chestplate', to: 'torso' }, { item: 'shield', to: 'off-hand' },
  ]);
  assert.deepEqual(wearPlan([stack('leather_boots'), stack('iron_boots', 1, 'feet')]), [], 'a worse piece is not put on');
  assert.deepEqual(wearPlan([stack('shield'), stack('totem_of_undying', 1, 'off-hand')]), [], 'the off-hand is not emptied');
  // 27 ingots, 6 kept: chestplate 8, leggings 7, boots 4 (2 left over plus the 6): no helmet
  assert.deepEqual(armorPlan({ iron_ingot: 27 }, []).map((p) => p.item), ['iron_chestplate', 'iron_leggings', 'iron_boots']);
  assert.deepEqual(armorPlan({ iron_ingot: 24 }, [], { reserve: 0 }).map((p) => p.item), ['iron_chestplate', 'iron_leggings', 'iron_boots', 'iron_helmet']);
  assert.deepEqual(armorPlan({ iron_ingot: 10 }, []).map((p) => p.item), ['iron_boots'], 'only what the ingots beyond 6 pay for');
  assert.deepEqual(armorPlan({ leather: 8 }, [stack('iron_chestplate', 1, 'torso')]).map((p) => p.item), ['leather_leggings'], 'nothing worse than what is worn');
  assert.deepEqual(armorPlan({ diamond: 8 }, []), [], 'diamonds are never used by the body itself');
  assert.deepEqual(armorPlan({ diamond: 8 }, [], { reserve: 0, materials: ['diamond', 'iron', 'leather'] }).map((p) => p.item), ['diamond_chestplate']);
});

test('care: a tool about to break gets a spare of the best tier it can pay for', () => {
  const low = (name, left, max) => stack(name, 1, 'hotbar', { remaining: left, maximum: max });
  const can = (list) => (item) => list.includes(item);
  assert.deepEqual(sparePlan([low('stone_pickaxe', 5, 131)], 'pickaxe', can(['stone_pickaxe', 'wooden_pickaxe'])), { item: 'stone_pickaxe', low: { name: 'stone_pickaxe', left: 5 } });
  assert.equal(sparePlan([low('stone_pickaxe', 100, 131)], 'pickaxe', can(['stone_pickaxe'])), null, 'plenty left');
  assert.equal(sparePlan([low('stone_pickaxe', 5, 131), low('wooden_pickaxe', 50, 59)], 'pickaxe', can(['stone_pickaxe'])), null, 'another one has enough');
  assert.equal(sparePlan([low('stone_pickaxe', 5, 131)], 'pickaxe', can(['wooden_pickaxe']), { minTier: 'stone' }), null, 'a wooden one cannot mine iron');
  assert.deepEqual(sparePlan([low('stone_pickaxe', 14, 131)], 'pickaxe', can(['stone_pickaxe']), { need: 16 }).item, 'stone_pickaxe', 'a step that needs more than is left');
  assert.equal(sparePlan([low('iron_pickaxe', 3, 250)], 'pickaxe', can(['stone_pickaxe'])).item, 'stone_pickaxe', 'a lower tier when that is what it can pay for');
  assert.equal(replacementFor('pickaxe', can(['wooden_pickaxe', 'stone_pickaxe']), { upTo: 'iron', minTier: 'stone' }), 'stone_pickaxe');
  assert.equal(replacementFor('pickaxe', can(['wooden_pickaxe']), { upTo: 'stone', minTier: 'stone' }), null);
  assert.equal(toolClassFor('stone'), 'pickaxe');
  assert.equal(toolClassFor('iron_ore'), 'pickaxe');
  assert.equal(pickaxeTierFor('iron_ore'), 'stone');
  assert.equal(pickaxeTierFor('stone'), 'wooden');
});

test('care: what to do first, and nothing while nothing is needed', () => {
  const base = { now: NOW, policy: CARE_DEFAULTS, memory: { cool: {}, night: 0 } };
  assert.equal(decide(situation(), { ...base, inventory: {}, stacks: [] }), null, 'a fed bot in daylight does nothing');
  // a death within 5 minutes: back for its items, before anything else
  const died = { position: { x: 5, y: 60, z: 7 }, dimension: 'overworld', observedAt: new Date(NOW - 30_000).toISOString(), cause: 'Tst_x was slain by Zombie' };
  const d1 = decide(situation({ lastDeath: died, vitals: { food: 5 }, clock: { timeOfDay: 15000 } }), { ...base, inventory: { bread: 2 }, stacks: [] });
  assert.equal(d1.kind, 'recover');
  assert.equal(d1.why, "it died (was slain by Zombie) at 5 60 7 30 s ago");
  assert.equal(decide(situation({ lastDeath: died }), { ...base, memory: { ...base.memory, recovered: died.observedAt } }), null, 'once per death');
  assert.equal(decide(situation({ lastDeath: { ...died, position: { x: 12000, y: 70, z: 5 } } }), base).far, 11990, 'respawned too far away: said, not tried');
  assert.equal(decide(situation({ lastDeath: { ...died, observedAt: new Date(NOW - RECOVER_WITHIN_MS - 1).toISOString() } }), base), null, 'too late: the items are gone');
  // armor carried and not worn
  assert.equal(decide(situation(), { ...base, stacks: [stack('iron_helmet')] }).kind, 'wear');
  // hungry with food: eat (raw meat too); with none: hunt an animal near by, in daylight
  assert.deepEqual(decide(situation({ vitals: { food: 12 } }), { ...base, inventory: { beef: 2 } }).food, 'beef');
  const cow = { name: 'cow', kind: 'animal', age: 'adult', nearest: { distance: 9 } };
  const hunt = decide(situation({ vitals: { food: 12 }, nearby: { mobs: [cow] } }), { ...base, inventory: {} });
  assert.deepEqual([hunt.kind, hunt.mob, hunt.drop], ['hunt', 'cow', 'beef']);
  assert.equal(decide(situation({ vitals: { food: 12 }, clock: { timeOfDay: 15000 }, nearby: { mobs: [cow] } }), { ...base, inventory: { cobblestone: 20 } }).kind, 'shelter', 'no hunting at night unless starving');
  assert.equal(decide(situation({ vitals: { food: 5 }, clock: { timeOfDay: 15000 }, nearby: { mobs: [cow] } }), { ...base, inventory: {} }).kind, 'hunt', 'starving: hunt even at night');
  assert.equal(decide(situation({ vitals: { food: 12 }, nearby: { mobs: [{ ...cow, name: 'chicken' }] } }), { ...base, inventory: {} }), null, 'raw chicken only when it can be cooked');
  // eating waits while a hostile mob is close (their reflex has the fight)
  assert.equal(decide(situation({ vitals: { food: 12 }, nearby: { hostiles: [{ name: 'zombie', kind: 'hostile', nearest: { distance: 5 } }] } }), { ...base, inventory: { bread: 1 } }), null);
  // night: a bed carried and nobody hostile near: sleep; else a shelter; already sheltered here this night: nothing
  const night = situation({ clock: { timeOfDay: 14000, phase: 'night' } });
  assert.equal(decide(night, { ...base, inventory: { white_bed: 1, cobblestone: 20 } }).kind, 'sleep');
  assert.equal(decide(night, { ...base, inventory: { white_bed: 1 }, memory: { ...base.memory, slept: 0 } }).kind, 'shelter', 'slept this night already');
  const sh = decide(night, { ...base, inventory: { dirt: 3 } });
  assert.deepEqual([sh.kind, sh.blocks], ['shelter', 3]);
  const memory = { cool: {}, night: 0, shelter: { feet: { x: 10, y: 64, z: -4 }, at: NOW - 10_000, checked: NOW - 10_000, night: 0 } };
  assert.equal(decide(night, { ...base, inventory: {}, memory }), null, 'sheltered here this night, checked lately');
  assert.equal(decide(night, { ...base, inventory: {}, memory: { ...memory, shelter: { ...memory.shelter, checked: NOW - 120_000 } } }).check, true, 'checked again after 90 s');
  assert.equal(decide(night, { ...base, policy: { ...CARE_DEFAULTS, night: 'off' }, inventory: {} }), null, 'night: off');
  // a shelter that would not close: not again for 45 s, unless the bot moved or got more blocks
  const failed = { cool: { shelter: NOW - 5_000 }, night: 0, shelterFailed: { feet: { x: 10, y: 64, z: -4 }, blocks: 2 }, shelterFails: { 0: 1 } };
  assert.equal(decide(night, { ...base, inventory: { dirt: 2 }, memory: failed }), null);
  assert.equal(decide(night, { ...base, inventory: { cobblestone: 16 }, memory: failed }).kind, 'shelter', 'more blocks now');
  assert.equal(decide(night, { ...base, inventory: { cobblestone: 16 }, memory: { ...failed, shelterFails: { 0: 3 } } }), null, 'three this night');
  // dusk: blocks for the shelter while it is light, cobblestone with a pickaxe, else dirt; not with a bed
  const dusk = situation({ clock: { timeOfDay: 11_500 } });
  assert.deepEqual((({ kind, block, n }) => ({ kind, block, n }))(decide(dusk, { ...base, inventory: { dirt: 3 } })), { kind: 'gather', block: 'dirt', n: 12 });
  assert.equal(decide(dusk, { ...base, inventory: {}, stacks: [stack('wooden_pickaxe', 1, 'hotbar', { remaining: 50, maximum: 59 })] }).block, 'stone');
  assert.equal(decide(dusk, { ...base, inventory: { cobblestone: 20 } }), null, 'enough already');
  assert.equal(decide(dusk, { ...base, inventory: { white_bed: 1 } }), null, 'a bed instead');
  // the nether has no night
  assert.equal(decide({ ...night, dimension: 'the_nether' }, { ...base, inventory: { cobblestone: 20 } }), null);
  // a spare before a tool breaks
  const t = decide(situation(), { ...base, stacks: [stack('stone_pickaxe', 1, 'hotbar', { remaining: 4, maximum: 131 })], canCraft: (i) => i === 'stone_pickaxe' });
  assert.deepEqual([t.kind, t.item], ['tools', 'stone_pickaxe']);
  // armor crafted from leather or spare iron
  const a = decide(situation(), { ...base, inventory: { iron_ingot: 14 }, canCraft: () => true });
  assert.deepEqual([a.kind, a.pieces.map((p) => p.item)], ['armor', ['iron_chestplate']]);
  assert.equal(decide(situation(), { ...base, inventory: { iron_ingot: 14 }, canCraft: () => true, idleMs: 10_000 }), null, 'not while the player may still be using that iron');
  assert.equal(decide(situation(), { ...base, policy: { ...CARE_DEFAULTS, armor: 'wear' }, inventory: { iron_ingot: 14 }, canCraft: () => true }), null);
});

test('care: a shelter of carried blocks, best first, and a wall of solid ground is wall enough', () => {
  assert.deepEqual(shelterBlocks({ dirt: 4, cobblestone: 3, oak_planks: 9 }), { list: [{ name: 'cobblestone', count: 3 }, { name: 'dirt', count: 4 }], total: 7 });
  const cells = shelterCells({ x: 0, y: 64, z: 0 }, 0, { cobblestone: 3, dirt: 20 }); // facing north (-z)
  assert.equal(cells.filter((c) => c.block_name !== 'air').length, 13);
  assert.equal(cells.filter((c) => c.block_name === 'cobblestone').length, 3);
  const at = (x, y, z) => cells.find((c) => c.x === x && c.y === y && c.z === z)?.block_name;
  assert.equal(at(0, 64, 0), 'air', 'the bot stands inside');
  assert.equal(at(0, 65, 0), 'air');
  assert.equal(at(0, 64, -1), 'air', 'a pocket in front of its feet for a table or furnace');
  assert.notEqual(at(0, 65, -1), 'air', 'the pocket has a ceiling');
  assert.notEqual(at(0, 65, -2), 'air', 'and a block the ceiling goes against');
  assert.ok(at(0, 64, -2) && at(1, 64, -1) && at(-1, 64, -1) && at(0, 64, 1) && at(1, 64, 0) && at(-1, 64, 0), 'closed all round');
  assert.notEqual(at(0, 66, 0), 'air', 'a roof over its head');
  assert.equal(new Set(cells.map((c) => `${c.x},${c.y},${c.z}`)).size, cells.length, 'no cell twice');
  assert.deepEqual(shelterVerdict({ placed: 1, cells: 12, wrong: 8, kept: [], left: [{ reason: 'holds_another_block', count: 8 }] }), { closed: true, placed: 1, solid: 8, why: null, short: 0 });
  const open = shelterVerdict({ placed: 0, cells: 12, wrong: 2, kept: [], left: [{ reason: 'unreachable', count: 1 }, { reason: 'block_not_carried', count: 1 }], missing: [{ block: 'dirt', count: 1 }] });
  assert.equal(open.closed, false);
  assert.match(open.why, /1 cell: unreachable; 1 cell: block not carried; short of 1 dirt/);
  assert.equal(open.short, 1);
});

test('care: their reflex events in our words, a fight of many contacts as one line', () => {
  const out = (source, evidence) => ({ type: 'survival_outcome', observedAt: '2026-10-09T02:25:35Z', payload: { kind: 'outcome', source, evidence } });
  const fight = (o, extra = {}) => out('hostile_reflex', { response: 'fight', cancelled: false, interrupted: null, outcome: { threats: [{ id: 1, name: 'zombie' }], attacks: 3, killedTargetIds: [], explosions: 0, healthBefore: 20, healthAfter: 20, ...o }, ...extra });
  const lines = describeEvents([
    { type: 'player_message', payload: { message: 'hello from a stranger' } },
    fight({ healthAfter: 14 }),
    fight({ healthBefore: 14, healthAfter: 14, killedTargetIds: [1] }),
    fight({ attacks: 0 }), // a contact that changed nothing
    out('hostile_reflex', { response: 'evade', cancelled: true, interrupted: null, outcome: { threats: [{ id: 2, name: 'creeper' }], attacks: 0, killedTargetIds: [], explosions: 1, healthBefore: 14, healthAfter: 4.6 } }),
    fight({ healthAfter: 10 }, { interrupted: { action: 'collect_block', startedAt: '' } }), // a step's own result says it
    out('hunger_reflex', { interrupted: null, outcome: { kind: 'ate', food: 'bread', hungerBefore: 12, hungerAfter: 17 } }),
    { type: 'player_death', observedAt: '2026-10-09T02:27:00Z', payload: { position: { x: 5.5, y: 60, z: 7.5 }, cause: 'Tst_x was blown up by Creeper' } },
    { type: 'equipment_broken', observedAt: '2026-10-09T02:27:10Z', payload: { item: 'stone_pickaxe' } },
  ]);
  assert.deepEqual(lines.map((l) => l.kind), ['fight', 'eat', 'death', 'tool']);
  assert.equal(lines[0].text, 'fought zombie and killed one; fled from creeper; 1 explosion near it; health 20 -> 4.6');
  assert.equal(lines[1].text, 'ate bread: food 12 -> 17');
  assert.equal(lines[2].text, 'died: was blown up by Creeper at 5 60 7');
  assert.equal(lines[3].text, 'its stone_pickaxe broke');
  assert.doesNotMatch(JSON.stringify(lines), /stranger/, 'never chat');
});

test('care: the policy in words', () => {
  assert.match(describeCare(), /^shelters at night .*crafts a spare tool before one breaks; after a death it goes back for its items$/);
  assert.match(describeCare({ night: 'off', armor: 'off', food: 'off', tools: 'off' }), /^does nothing about the night; leaves armor to you; leaves eating to you .*makes no spare tools/);
});

/** Stand-ins for what the body gives the care: a status, the latest inventory, their actions (recorded). */
function careRig({ situation: sit, inventory = {}, stacks = [], results = {}, idle = true, mode = 'full' } = {}) {
  const calls = [];
  const events = [];
  const state = { situation: sit, inventory, stacks, idle, idleSince: NOW - 10_000, clock: NOW, events: [] };
  const deps = {
    situation: () => state.situation,
    latest: () => ({ inventory: state.inventory }),
    stacks: () => state.stacks,
    refresh: async () => {},
    act: async (call, deadline, ctl) => {
      calls.push(call);
      if (state.hold) { await new Promise((r) => { state.release = r; }); return { output: { result: { status: ctl.stopped ? 'cancelled' : 'succeeded' } }, stopped: ctl.stopped }; }
      const r = results[call.tool];
      const out = typeof r === 'function' ? r(call) : r ?? { status: 'succeeded' };
      return { output: { action: call.tool, result: out } };
    },
    rpc: async (tool) => (tool === 'read_recent_events' ? { result: { events: state.events.splice(0) } } : {}),
    plan: (skill, args) => (skill === 'craft_batch' ? { calls: args.items.map((i) => ({ tool: 'craft_item', args: { items: [{ item_name: i.item, count: i.n }] } })) } : { calls: [] }),
    idle: () => state.idle,
    idleSince: () => state.idleSince,
    furnaceNear: () => false, tableNear: () => true,
    event: (kind, data) => events.push({ kind, ...data }),
    now: () => state.clock,
    tickMs: 1_000_000,
    mode,
  };
  return { care: createCare(deps), calls, events, state };
}

test('care loop: a shelter at night, journaled once; a step of the player\'s stops it at once', async () => {
  const rig = careRig({
    situation: situation({ clock: { timeOfDay: 14000, phase: 'night' } }), inventory: { cobblestone: 20 },
    results: { build_structure: { status: 'succeeded', structure: { cells: 15, correct: 15, placed: 10, dug: 0, wrong: 0, kept: [], left: [], supports: [] } } },
  });
  await rig.care.tick();
  assert.deepEqual(rig.calls.map((c) => c.tool), ['build_structure']);
  assert.equal(rig.calls[0].args.remove_wrong_blocks, false, 'never digs a wall out');
  assert.equal(rig.calls[0].args.blocks.filter((b) => b.block_name === 'cobblestone').length, 13);
  const [entry] = rig.care.since(0);
  assert.equal(entry.kind, 'shelter');
  assert.equal(entry.source, 'care');
  assert.match(entry.text, /^night \(time 14000\): closed itself in at 10 64 -4 \(placed 10 blocks\); it stays inside until your next call$/);
  await rig.care.tick();
  assert.equal(rig.calls.length, 1, 'sheltered: nothing more until it is checked again');
  assert.equal(rig.care.since(entry.seq).length, 0);
  // too few blocks: dig in first (and where it cannot, collect dirt)
  const dig = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { dirt: 2 }, results: { build_structure: { status: 'succeeded', structure: { cells: 12, correct: 4, placed: 1, wrong: 8, kept: [], left: [{ reason: 'holds_another_block', count: 8 }] } } } });
  await dig.care.tick();
  assert.deepEqual(dig.calls.map((c) => [c.tool, c.args.y]), [['navigate', 62], ['pick_up_items', undefined], ['build_structure', undefined]]);
  assert.match(dig.care.last().text, /dug two blocks down; closed itself in .*placed 1 block, 8 wall cells already solid/);
  // short of blocks after all: dirt from around, then the shelter again
  let builds = 0;
  const short = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { dirt: 2 }, results: {
    navigate: { status: 'failed', error: '[NAVIGATION_TARGET_UNSUPPORTED] No usable footing' },
    build_structure: () => (++builds === 1
      ? { status: 'failed', error: '[BUILD_INCOMPLETE]', structure: { cells: 16, placed: 2, wrong: 11, kept: [], left: [{ reason: 'block_not_carried', count: 11 }], missing: [{ block: 'dirt', count: 11 }] } }
      : { status: 'succeeded', structure: { cells: 16, placed: 11, wrong: 0, kept: [], left: [] } }),
  } });
  await short.care.tick();
  assert.deepEqual(short.calls.map((c) => c.tool), ['navigate', 'build_structure', 'collect_block', 'build_structure']);
  // on a tree: down to the ground first (their navigate names the ground), then into it
  const tree = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: {}, results: {
    navigate: (c) => (c.args.y === 62 ? { status: 'failed', error: '[NAVIGATION_TARGET_UNSUPPORTED] No usable footing was observed within 1 blocks of 10, 62, -4. The ground in that column is at y=57. Choose ...' } : { status: 'succeeded' }),
    build_structure: { status: 'succeeded', structure: { cells: 16, placed: 1, wrong: 11, kept: [], left: [{ reason: 'holds_another_block', count: 11 }] } },
  } });
  await tree.care.tick();
  assert.deepEqual(tree.calls.map((c) => [c.tool, c.args.y]), [['navigate', 62], ['navigate', 58], ['navigate', 56], ['pick_up_items', undefined], ['build_structure', undefined]]);
  assert.match(tree.care.last().text, /climbed down to the ground at y=58; dug two blocks down; closed itself in/);
  assert.equal(short.calls[2].args.count, 13);
  assert.match(short.care.last().text, /could not dig in .*collected 13 dirt for walls; closed itself in/);
  // the player's step: the care's action is cancelled and the step goes on once it settled
  const busy = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { cobblestone: 20 } });
  busy.state.hold = true;
  const ticking = busy.care.tick();
  await new Promise((r) => { setImmediate(r); });
  assert.equal(busy.care.now(), 'sheltering for the night');
  let cancelled = null;
  const job = busy.care.yield().then((k) => { cancelled = k; });
  busy.state.release();
  await job;
  await ticking;
  assert.equal(cancelled, 'shelter');
  assert.equal(busy.care.now(), null);
  assert.match(busy.care.last().text, /could not close a shelter|stopped before/);
});

test('care loop: a fight that takes the shelter over: built again at once (4 tries), then 5 s on; told once', async () => {
  const rig = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { cobblestone: 20 }, results: {
    build_structure: { status: 'failed', error: '[HOSTILE_CONTACT] fight response for zombie#4 at 1,2,3 (3 blocks).', structure: { cells: 16, placed: 0, wrong: 13, left: [{ reason: 'not_reached', count: 13 }] } },
  } });
  await rig.care.tick();
  assert.equal(rig.calls.length, 4, 'four builds in a row');
  await rig.care.tick();
  assert.equal(rig.calls.length, 4, 'then not at once');
  rig.state.clock += 6_000;
  await rig.care.tick();
  assert.equal(rig.calls.length, 8, 'again after 5 s');
  assert.equal(rig.care.since(0).filter((e) => e.kind === 'shelter').length, 1, 'the same failure told once');
  assert.match(rig.care.last().text, /went on building through 4 fights/);
});

test('care loop: a zombie close by: the wall cells between it and the bot go up first', async () => {
  const zombie = { name: 'zombie', kind: 'hostile', nearest: { distance: 2, position: { x: 12.5, y: 64, z: -3.5 } } };
  const rig = careRig({ situation: situation({ clock: { timeOfDay: 14000 }, nearby: { mobs: [zombie] } }), inventory: { cobblestone: 20 },
    results: { build_structure: { status: 'succeeded', structure: { cells: 16, placed: 13, wrong: 0, kept: [], left: [] } } } });
  await rig.care.tick();
  const [first, all] = rig.calls;
  assert.deepEqual(first.args.blocks.map((c) => [c.x, c.y, c.z]).sort(), [[11, 65, -4], [12, 64, -4], [12, 65, -4]], 'the pocket faces it: its ceiling and front wall');
  assert.equal(all.args.blocks.filter((c) => c.block_name !== 'air').length, 13);
});

test('care loop: a shield before the first night, from one iron ore it mines and smelts', async () => {
  const pick = stack('stone_pickaxe', 1, 'hotbar', { remaining: 100, maximum: 131 });
  const base = { now: NOW, policy: CARE_DEFAULTS, memory: { cool: {}, night: 0 }, stacks: [pick] };
  assert.equal(decide(situation(), { ...base, inventory: { oak_log: 2, cobblestone: 8 } }).path, 'mine');
  assert.equal(decide(situation(), { ...base, inventory: { oak_log: 2, iron_ingot: 4 } }).path, 'ingot');
  assert.equal(decide(situation(), { ...base, inventory: { oak_log: 2, iron_ingot: 3 } }), null, 'three ingots kept, no furnace or way to make one');
  assert.equal(decide(situation(), { ...base, inventory: { oak_log: 1, cobblestone: 8 } }), null, 'too little wood');
  assert.equal(decide(situation(), { ...base, inventory: { oak_log: 2, cobblestone: 8 }, idleMs: 5_000 }), null, 'the player is still at work');
  assert.equal(decide(situation({ clock: { timeOfDay: 11_000 } }), { ...base, inventory: { oak_log: 2, cobblestone: 8 } }).kind, 'gather', 'dusk is for the shelter');
  const rig = careRig({ situation: situation(), inventory: { oak_log: 2, furnace: 1 }, results: {
    collect_block: () => { rig.state.inventory = { ...rig.state.inventory, raw_iron: 1 }; return { status: 'succeeded' }; },
    smelt_item: () => { rig.state.inventory = { oak_log: 1, oak_planks: 3, furnace: 1, iron_ingot: 1 }; return { status: 'succeeded' }; },
    craft_item: () => { rig.state.inventory = { furnace: 1, shield: 1 }; return { status: 'succeeded' }; },
  } });
  rig.state.stacks = [pick];
  rig.state.idleSince = NOW - 60_000;
  const plan = rig.care;
  rig.state.situation = situation();
  // the rig's plan() knows only craft_batch: a smelt plan of its own for this test
  await plan.tick().catch(() => {});
  assert.equal(rig.calls[0].tool, 'collect_block');
  assert.deepEqual(rig.calls[0].args, { block_name: 'iron_ore', count: 1 });
});

test('care loop: nothing while a step runs or just ended, or while one of their reflexes has the body', async () => {
  const rig = careRig({ situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { cobblestone: 20 } });
  rig.state.idle = false;
  await rig.care.tick();
  rig.state.idle = true;
  rig.state.idleSince = NOW - 1_000;
  await rig.care.tick();
  rig.state.idleSince = NOW - 10_000;
  rig.state.situation = { ...rig.state.situation, activity: { owner: 'hostile_reflex' } };
  await rig.care.tick();
  assert.equal(rig.calls.length, 0);
});

test('care loop: a death\'s items, armor crafted and worn, a hunt that cooks and eats, reflexes from their log', async () => {
  const died = { position: { x: 5, y: 60, z: 7 }, dimension: 'overworld', observedAt: new Date(NOW - 20_000).toISOString(), cause: 'Tst_x was slain by Zombie' };
  const rig = careRig({ situation: situation({ lastDeath: died }), inventory: {} });
  rig.calls.length = 0;
  const act = rig.care.tick();
  // the recovery brings the items back (the inventory read after it)
  rig.state.inventory = { cobblestone: 12, bread: 3 };
  await act;
  assert.deepEqual(rig.calls.map((c) => c.tool), ['pick_up_items']);
  assert.deepEqual(rig.calls[0].args, { recover_death_items: true });
  assert.match(rig.care.last().text, /^it died \(was slain by Zombie\) at 5 60 7 20 s ago: went back and picked up/);
  // armor from spare iron, then worn
  const results = {};
  const arm = careRig({ situation: situation(), inventory: { iron_ingot: 14 }, results });
  arm.state.idleSince = NOW - 60_000;
  results.craft_item = () => { arm.state.inventory = { iron_ingot: 6, iron_chestplate: 1 }; arm.state.stacks = [stack('iron_chestplate')]; return { status: 'succeeded' }; };
  await arm.care.tick();
  assert.deepEqual(arm.calls.map((c) => c.tool), ['craft_item', 'equip']);
  assert.deepEqual(arm.calls[1].args.items, [{ item_name: 'iron_chestplate', destination: 'torso' }]);
  assert.match(arm.care.last().text, /crafted iron_chestplate and put it on$/);
  // their reflexes while idle, in the journal as source reflex
  rig.state.events.push({ type: 'survival_outcome', observedAt: new Date(NOW).toISOString(), payload: { source: 'hunger_reflex', evidence: { interrupted: null, outcome: { kind: 'ate', food: 'bread', hungerBefore: 12, hungerAfter: 17 } } } });
  await rig.care.readEvents();
  assert.deepEqual([rig.care.last().source, rig.care.last().text], ['reflex', 'ate bread: food 12 -> 17']);
});

// ---------------------------------------------------------------------------------------------------------------
// the care inside the body (src/mineai/body.js) against the fake host, and what an MCP reply says about it

import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'care-log-')) });
const log = createLogger({ dir: null, config });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 4000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };

async function careBody(fakeOpts = {}, world = {}) {
  const hosts = fakeHosts(() => fakeOpts);
  const body = createMineAiBody({ config, log, hosts, gameId: 'gcare01', username: 'Tst_rv_c', care: 'full', careTickMs: 30, careIdleMs: 50 });
  const fake = await (async () => { await until(() => hosts.started[0]); return hosts.started[0].fake; })();
  Object.assign(fake.world, world);
  await body.ready;
  return { body, fake };
}

test('care in the body: night falls while idle: a shelter of carried blocks, journaled, then yields to a step', async () => {
  const { body, fake } = await careBody({ inventory: { cobblestone: 15, oak_log: 3 } }, { timeOfDay: 14000 });
  try {
    assert.ok(await until(() => fake.tools('build_structure').length > 0), 'the shelter was built');
    const cells = fake.tools('build_structure')[0].args.blocks;
    assert.equal(cells.filter((c) => c.block_name === 'cobblestone').length, 13);
    assert.ok(await until(() => body.onItsOwn(0).some((e) => e.kind === 'shelter')));
    assert.match(body.onItsOwn(0).find((e) => e.kind === 'shelter').text, /^night \(time 14000\): closed itself in at 10 64 -4 \(placed 13 blocks\)/);
    assert.match(body.state(), /last done on its own \(\d+ s ago\): night \(time 14000\): closed itself in/);
    // a step of the player's runs as before
    const r = await body.run('craft', { item: 'oak_planks', n: 4 });
    assert.equal(r.ok, true, r.result);
  } finally { await body.close(); }
});

test('care in the body: their fight reflex may wall itself in when badly hurt (from 10 health), set again after a reset', async () => {
  const { body, fake } = await careBody({ inventory: {} });
  try {
    assert.ok(await until(() => fake.world.hide === 'when_exposed'), 'set once the care runs');
    assert.equal(fake.world.critical, 10, 'and it protects itself from 10 health on');
    const pol = await body.run('policy', {}); // the player puts every default back
    assert.equal(pol.ok, true, pol.result);
    assert.equal(fake.world.hide, 'when_recovery_possible');
    await body.refresh();
    body.onItsOwn(0); // nothing said about it: it is part of what the care is
    assert.ok(fake.tools('set_survival_policy').length >= 2);
  } finally { await body.close(); }
});

test('care in the body: a pickaxe about to wear out gets a spare before a collect; one that breaks midway is replaced and the collect goes on', async () => {
  const { body, fake } = await careBody({ inventory: { stone_pickaxe: 1, cobblestone: 6, stick: 4, crafting_table: 1 } }, { durability: { stone_pickaxe: { remaining: 5, maximum: 131 } } });
  try {
    await body.refresh();
    const r = await body.run('collect', { block: 'stone', n: 12 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /^on its own first: crafted a spare stone_pickaxe \(your stone_pickaxe had 5 uses left, too few for 12 stone\); mined 12 stone/);
    assert.deepEqual(fake.calls.filter((c) => ['craft_item', 'collect_block'].includes(c.tool)).map((c) => c.tool), ['craft_item', 'collect_block']);
    // the pickaxe breaks after 4 of 10: a new one, and the other 6
    fake.world.durability = {};
    fake.world.breakAfter = 4;
    const before = fake.calls.length;
    const b = await body.run('collect', { block: 'stone', n: 10 });
    assert.equal(b.ok, true, b.result);
    assert.match(b.result, /your stone_pickaxe broke after 4 of 10 stone; on its own: crafted a new stone_pickaxe and went on with the other 6; mined 6 stone/);
    const later = fake.calls.slice(before).filter((c) => ['craft_item', 'collect_block'].includes(c.tool));
    assert.deepEqual(later.map((c) => [c.tool, c.args.count ?? c.args.items?.[0]?.item_name]), [['collect_block', 10], ['craft_item', 'stone_pickaxe'], ['collect_block', 6]]);
  } finally { await body.close(); }
});

test('care in the body: the armor skill crafts and wears; policy knobs stay in the gateway', async () => {
  const { body, fake } = await careBody({ inventory: { iron_ingot: 24, stick: 2, crafting_table: 1 } });
  try {
    await body.refresh();
    const off = await body.run('policy', { armor: 'off', night: 'off' });
    assert.equal(off.ok, true, off.result);
    assert.match(off.result, /on its own between your calls: does nothing about the night; leaves armor to you; eats when hungry/);
    const ours = () => fake.tools('set_survival_policy').filter((c) => !c.args.changes?.combat?.hide);
    assert.equal(ours().length, 0, 'nothing of the policy skill sent to the runtime');
    assert.doesNotMatch(JSON.stringify(fake.tools('set_survival_policy')), /night|"armor"|tools/);
    const r = await body.run('armor', {});
    assert.equal(r.ok, true, r.result);
    assert.deepEqual(Object.keys(body.equipment()).sort(), ['feet', 'head', 'legs', 'torso']);
    assert.equal(fake.world.inventory.get('iron_ingot') ?? 0, 0, 'every ingot: the skill keeps none back');
    const none = await body.run('armor', {});
    assert.equal(none.code, 'NEED_ITEMS');
    // both kinds of knobs in one call: theirs go to the runtime, ours stay here
    const both = await body.run('policy', { retreat_health: 10, food: 'eat' });
    assert.equal(both.ok, true, both.result);
    assert.equal(ours().length, 1);
    assert.equal(ours()[0].args.changes.combat.critical_health, 10);
    assert.deepEqual(body.carePolicy(), { night: 'off', armor: 'off', food: 'eat', tools: 'spare', defend: 'on', eat: 'auto', escape: 'on' });
  } finally { await body.close(); }
});

test('care through MCP: what the body did on its own is in the next reply, once', async () => {
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 15 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS, careMode: 'full',
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId, care: 'full', careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    const init = c.getInstructions?.() ?? '';
    assert.match(init, /Between your calls the body looks after itself/);
    let r = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    assert.ok(!r.isError, r.content[0].text);
    const fake = hosts.started[0].fake;
    fake.world.timeOfDay = 15000;
    fake.world.events.push({ type: 'survival_outcome', observedAt: new Date().toISOString(), payload: { source: 'hostile_reflex', evidence: { response: 'fight', cancelled: false, interrupted: null, outcome: { threats: [{ id: 3, name: 'zombie' }], attacks: 4, killedTargetIds: [3], explosions: 0, healthBefore: 20, healthAfter: 16 } } } });
    assert.ok(await until(() => fake.tools('build_structure').length > 0));
    await sleep(100);
    r = await c.callTool({ name: 'get_state', arguments: {} });
    const t = r.content.map((x) => x.text).join('\n');
    assert.match(t, /On its own since your last reply \(the body, not a step of yours\):\n- \d+ s ago, reflex, fight: fought zombie and killed one; health 20 -> 16\n- \d+ s ago, on its own, shelter: night \(time 15000\): closed itself in/);
    assert.deepEqual(r.structuredContent.onItsOwn.map((e) => [e.source, e.kind, e.ok]), [['reflex', 'fight', true], ['care', 'shelter', true]]);
    assert.equal(r.structuredContent.state.time, 15000);
    r = await c.callTool({ name: 'get_state', arguments: {} });
    assert.equal(r.structuredContent.onItsOwn, undefined, 'told once');
    assert.doesNotMatch(r.content.map((x) => x.text).join('\n'), /On its own since/);
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});

// ---------------------------------------------------------------------------------------------------------------
// advise mode (MINEAI_CARE=advise, the default): the plans are the player's; the body acts only through its reflexes

test('advise: the facts and the skill that would do it, most urgent first; nothing when nothing is needed', () => {
  const base = { now: NOW, memory: { cool: {}, night: 0 }, canCraft: () => false };
  assert.deepEqual(advise(situation(), { ...base, stacks: [stack('shield', 1, 'off-hand')] }), [], 'a fed bot in daylight with a shield: nothing');
  const died = { position: { x: 5, y: 60, z: 7 }, dimension: 'overworld', observedAt: new Date(NOW - 30_000).toISOString() };
  const a = advise(situation({ lastDeath: died, vitals: { food: 6 }, clock: { timeOfDay: 11400 } }), { ...base, inventory: { porkchop: 2, dirt: 3 }, stacks: [stack('wooden_pickaxe', 1, 'hand', { remaining: 4, maximum: 59 })] });
  assert.deepEqual(a.map((x) => x.kind), ['recover', 'eat', 'dusk', 'tools']);
  assert.match(a[0].text, /^you died at 5 60 7 30 s ago \(12 blocks away\); your items there despawn in about 270 s$/);
  assert.deepEqual(a[0].hint, { skill: 'pick_up', args: { death_items: true } });
  assert.equal(a[1].text, 'food 6/20; you carry 2 porkchop');
  assert.equal(a[2].text, 'night in about 45 s: no bed, no shield, 3 blocks for a shelter (13 make one)');
  assert.deepEqual(a[2].hint, { skill: 'collect', args: { block: 'cobblestone', n: 12 } });
  assert.match(a[3].text, /^your wooden_pickaxe has 4 uses left \(7%\); you cannot craft another/);
  assert.equal(advise(situation({ lastDeath: died }), { ...base, memory: { recovered: died.observedAt }, stacks: [stack('shield', 1, 'off-hand')] }).length, 0, 'recovered: no more');
  const far = advise(situation({ lastDeath: { ...died, position: { x: 12000, y: 70, z: 5 } } }), { ...base, stacks: [stack('shield', 1, 'off-hand')] })[0];
  assert.match(far.text, /too far to walk back in time$/);
  assert.equal(far.hint, undefined);
  const again = advise(situation({ lastDeath: { ...died, cause: 'Tst_x was impaled by Drowned' } }), { ...base, memory: { diedRecovering: died.observedAt }, stacks: [stack('shield', 1, 'off-hand')] })[0];
  assert.match(again.text, /^you died \(was impaled by Drowned\) at 5 60 7 .*you died going back for the items of the death before/);
  assert.equal(again.hint, undefined);
  // night in the open: the shelter skill; with a bed: sleep; inside its shelter: nothing
  const night = situation({ clock: { timeOfDay: 14000 }, nearby: { mobs: [{ name: 'zombie', kind: 'hostile', nearest: { distance: 9 } }] } });
  const n = advise(night, { ...base, inventory: { cobblestone: 20 }, stacks: [stack('stone_pickaxe', 1, 'hand')] });
  assert.equal(n[0].text, 'night (time 14000): you stand in the open, 1 hostile mob within 16 blocks, no shield; 20 blocks for a shelter');
  assert.deepEqual(n[0].hint, { skill: 'shelter', args: {} });
  assert.deepEqual(advise(night, { ...base, inventory: { red_bed: 1 } })[0].hint, { skill: 'sleep', args: {} });
  const inside = { cool: {}, night: 1, shelter: { feet: { x: 10, y: 64, z: -4 }, night: 1 } };
  assert.deepEqual(advise(night, { ...base, memory: inside, stacks: [stack('shield', 1, 'off-hand')] }), []);
  // no food, an animal near: hunt; a shield it can make: the shield skill
  const h = advise(situation({ vitals: { food: 9 }, nearby: { mobs: [{ name: 'cow', kind: 'passive', nearest: { distance: 12.4 } }] } }), { ...base, inventory: { iron_ingot: 5, oak_planks: 8 } });
  assert.deepEqual(h.map((x) => [x.kind, x.hint?.skill]), [['hunt', 'hunt'], ['shield', 'shield']]);
  assert.deepEqual(h[0].hint.args, { mob: 'cow', drop: 'beef', n: 3 });
});

test('advise: the reflex knobs in words', () => {
  assert.equal(describeReflexes(CARE_DEFAULTS, 'advise'), 'fights back or flees when a hostile mob comes for it; eats by itself only at food 4 or less; surfaces for air, leaves fire and lava and gets its footing back');
  assert.match(describeReflexes({ defend: 'off', eat: 'off', escape: 'off' }), /^never strikes a mob \(still flees\); never eats by itself; leaves air, fire, lava and footing to you$/);
  assert.match(describeReflexes(CARE_DEFAULTS, 'full'), /at food 14 or less/);
});

test('advise loop: no plan carried out by itself, advice instead; its reflexes stay', async () => {
  const rig = careRig({ mode: 'advise', situation: situation({ clock: { timeOfDay: 14000, phase: 'night' } }), inventory: { cobblestone: 20 } });
  rig.state.events.push({ type: 'survival_outcome', observedAt: new Date(NOW).toISOString(), payload: { source: 'hostile_reflex', evidence: { response: 'fight', cancelled: false, interrupted: null, outcome: { threats: [{ id: 3, name: 'zombie' }], attacks: 2, killedTargetIds: [3], explosions: 0, healthBefore: 20, healthAfter: 18 } } } });
  await rig.care.tick();
  assert.deepEqual(rig.calls, [], 'no shelter of its own');
  assert.equal(rig.care.advice()[0].kind, 'night');
  assert.deepEqual(rig.care.since(0).map((e) => [e.source, e.kind]), [['reflex', 'fight']]);
  assert.deepEqual(rig.care.counts(), { reflex: 1, care: 0 });
  // the shelter skill: the same routine, as the player's action (no journal entry, counted as the player's)
  rig.state.situation.clock.timeOfDay = 14000;
  const results = { build_structure: { status: 'succeeded', structure: { cells: 15, correct: 15, placed: 13, dug: 0, wrong: 0, kept: [], left: [], supports: [] } } };
  const r2 = careRig({ mode: 'advise', situation: situation({ clock: { timeOfDay: 14000 } }), inventory: { cobblestone: 20 }, results });
  const p = await r2.care.perform('shelter', { stopped: null });
  assert.equal(p.ok, true, p.text);
  assert.match(p.text, /closed itself in at 10 64 -4/);
  assert.deepEqual(r2.care.since(0), []);
  assert.equal(r2.events.find((e) => e.kind === 'shelter').source, 'muse');
  assert.deepEqual(r2.care.advice(), [], 'inside its shelter: no night advice');
  const s = await r2.care.perform('shield', { stopped: null });
  assert.equal(s.code, 'NEED_ITEMS');
});

test('advise in the body: the reflexes set as the knobs say (eat starving), attribution counted, Body advice in MCP replies', async () => {
  const hosts = fakeHosts(() => ({ inventory: { cobblestone: 15 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log, skills: MINEAI_SKILLS,
    makeBody: (id, o) => createMineAiBody({ config, log, hosts, gameId: id, username: `Tst_rv_${id}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    assert.match(c.getInstructions?.() ?? '', /You plan everything: the body acts by itself only through its reflexes/);
    let r = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    assert.ok(!r.isError, r.content[0].text);
    const fake = hosts.started[0].fake;
    assert.ok(await until(() => fake.world.foodReflex === 'starving'), 'advise mode: the hunger reflex only when starving');
    assert.equal(fake.world.hide, 'when_exposed');
    fake.world.timeOfDay = 15000;
    await sleep(200);
    assert.equal(fake.tools('build_structure').length, 0, 'no shelter by itself');
    r = await c.callTool({ name: 'play', arguments: { skill: 'say', args: { text: 'hi' } } });
    r = await c.callTool({ name: 'get_state', arguments: {} });
    const t = r.content.map((x) => x.text).join('\n');
    assert.match(t, /Body advice \(the body will not do these by itself; your call\):\n- night \(time 15000\): you stand in the open.* \(to do it: shelter \{\}\)/);
    assert.equal(r.structuredContent.advice[0].hint.skill, 'shelter');
    assert.match(t, /This game: 1 action by Muse, 0 reflexes \(100% Muse\)\.$/);
    assert.deepEqual(r.structuredContent.attribution, { muse: 1, reflex: 0, care: 0, musePct: 100 });
    // a reflex switched off through the policy skill
    r = await c.callTool({ name: 'play', arguments: { skill: 'policy', args: { eat: 'off', escape: 'off' } } });
    assert.match(r.content.map((x) => x.text).join('\n'), /its reflexes: fights back or flees when a hostile mob comes for it; never eats by itself; leaves air, fire, lava and footing to you/);
    assert.ok(await until(() => fake.world.foodReflex === 'never' && fake.world.escape === false, 6000));
    r = await c.callTool({ name: 'play', arguments: { skill: 'shelter', args: {} } });
    assert.ok(fake.tools('build_structure').length > 0, 'the shelter skill builds');
    r = await c.callTool({ name: 'end_game', arguments: {} });
    assert.match(r.content[0].text, /^Game ended\. This game: 2 actions by Muse, 0 reflexes \(100% Muse\)\./);
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});

test('advise: MINEAI_CARE is advise by default; full and off, and the old true and false, still work', () => {
  const care = (v) => loadConfig({ MODEL_API_KEY: '', ...(v === undefined ? {} : { MINEAI_CARE: v }) }).mineai.care;
  assert.deepEqual([care(undefined), care('advise'), care('full'), care('off'), care('true'), care('false')], ['advise', 'advise', 'full', 'off', 'full', 'off']);
});
