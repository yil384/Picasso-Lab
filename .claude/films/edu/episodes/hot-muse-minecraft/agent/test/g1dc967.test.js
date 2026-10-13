// test/g1dc967.test.js - the shelter skill in production game g1dc967 (2026-10-13 06:48): "dug two blocks down;
// collected 15 dirt for walls; could not close a shelter at -159 70 247 (3 cells: nothing to place against)". The dirt
// collect walked off, and the shelter was laid out where it ended, among the holes dug for the dirt. Now it goes back
// down into its hole first, digs in where it stands when cells still have nothing to place against, and a failure says
// what to do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCare } from '../src/mineai/care.js';

const NOW = Date.parse('2026-10-13T06:48:00Z');

/**
 * A care whose world is a hole: builds at the bottom of the hole it dug close (the ground is the walls); anywhere
 * else 3 cells have nothing to place against (holes from the dirt). The dirt collect ends 5 blocks off, on the surface.
 */
function world({ inventory = { dirt: 8 }, digWorks = true } = {}) {
  const calls = [];
  const state = {
    inv: { ...inventory },
    situation: { dimension: 'overworld', vitals: { health: 20, food: 20 }, clock: { timeOfDay: 14571 }, position: { x: -158.5, y: 72, z: 247.5, headingDegrees: 0 }, nearby: { hostiles: [], mobs: [], players: [] }, lastDeath: null, activity: { owner: 'idle' } },
    holes: [],
  };
  const feet = () => ({ x: Math.floor(state.situation.position.x), y: Math.floor(state.situation.position.y), z: Math.floor(state.situation.position.z) });
  const inHole = () => state.holes.some((h) => h.x === feet().x && h.y === feet().y && h.z === feet().z);
  const ok = (result = {}) => ({ output: { action: 'x', result: { status: 'succeeded', ...result } } });
  const act = async (call) => {
    calls.push({ tool: call.tool, args: call.args, at: feet() });
    if (call.tool === 'navigate') {
      if (!digWorks && call.args.y < feet().y) return { output: { action: 'navigate', result: { status: 'failed', error: 'could not dig: bedrock' } } };
      state.situation.position = { ...state.situation.position, x: call.args.x + 0.5, y: call.args.y, z: call.args.z + 0.5 };
      if (call.args.y < 72) state.holes.push(feet());
      return ok({ navigation: { end: { ...state.situation.position } } });
    }
    if (call.tool === 'collect_block') {
      state.inv.dirt = (state.inv.dirt ?? 0) + call.args.count;
      state.situation.position = { ...state.situation.position, x: state.situation.position.x + 5, y: 72 };
      return ok();
    }
    if (call.tool === 'build_structure') {
      const need = call.args.blocks.filter((c) => c.block_name !== 'air').length;
      if ((state.inv.dirt ?? 0) < 10) return { output: { action: 'build_structure', result: { status: 'partial', error: 'short', structure: { cells: need, wrong: need, placed: 0, left: [{ reason: 'block_not_carried', count: 5, named: [] }], missing: [{ block: 'dirt', count: 5 }], kept: [], supports: [], water: 0, passes: 1, complete: false } } } };
      if (inHole()) { state.inv.dirt -= 3; return ok({ structure: { cells: need, wrong: 0, placed: 3, left: [], missing: [], kept: [], supports: [], water: 0, passes: 1, complete: true } }); }
      return { output: { action: 'build_structure', result: { status: 'partial', error: 'left', structure: { cells: need, wrong: 3, placed: 7, left: [{ reason: 'nothing_to_place_against', count: 3, named: [] }], missing: [], kept: [], supports: [], water: 0, passes: 1, complete: false } } } };
    }
    return ok();
  };
  const care = createCare({
    situation: () => state.situation, latest: () => ({ inventory: state.inv, equipment: {} }), stacks: () => [], refresh: async () => {},
    act, rpc: async () => ({}), plan: () => ({ calls: [] }), idle: () => true, idleSince: () => NOW - 10_000, furnaceNear: () => false, tableNear: () => false,
    event: () => {}, now: () => NOW, tickMs: 1e9, mode: 'advise',
  });
  care.playerCalled();
  return { care, calls, state };
}

test('g1dc967: after collecting dirt the shelter goes back down into its hole and closes there', async () => {
  const { care, calls } = world();
  const r = await care.perform('shelter', { stopped: null });
  assert.equal(r.ok, true, r.text);
  assert.match(r.text, /^dug two blocks down; collected 7 dirt for walls; went back down into its hole; closed itself in at -159 70 247/);
  // the last build was at the bottom of the hole, after the walk back
  const builds = calls.filter((c) => c.tool === 'build_structure');
  assert.deepEqual(builds.at(-1).at, { x: -159, y: 70, z: 247 });
  const walks = calls.filter((c) => c.tool === 'navigate');
  assert.deepEqual(walks.at(-1).args, { x: -159, y: 70, z: 247 }, 'back to the hole');
});

test('g1dc967: cells with nothing to place against: it digs in where it stands and builds again; a failure says what to do', async () => {
  // a world where the walk back is not possible (the hole filled): it digs in where the collect ended
  const w = world();
  const orig = w.care;
  const r = await orig.perform('shelter', { stopped: null });
  assert.equal(r.ok, true);

  const { care, state } = world({ digWorks: false, inventory: { dirt: 20 } });
  // with blocks enough it builds where it stands first: 3 cells over a drop, and the dig fails (bedrock): the failure
  // says why and what to do
  const f = await care.perform('shelter', { stopped: null });
  assert.equal(f.ok, false);
  assert.match(f.text, /could not close a shelter at -159 72 247 \(3 cells: nothing to place against\): the cells are over a drop; dig in \(go_to -159 70 247\) or go to flat ground and call shelter again$/);
  assert.equal(state.holes.length, 0);
});
