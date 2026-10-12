// The ga13a88 moment for the HUD stills (production log run-serve-2026-10-12T22-22-54-806Z-c165, read-only): game time
// 5:39, Muse's ninth call running (its second step). The calls, their raw arguments, Muse's words (why), the steps,
// their results and times, the advice and the goal times are the log's. Health, food, y and the inventory counts are
// worked out from the results (the log does not carry them); the game picture is a stand-in from another game.
export const MOMENT = {
  game: 'ga13a88',
  elapsed: '5:39',
  st: { hp: 20, food: 17, clock: 'NIGHT 01:00', dawn: 'dawn in 3 min', y: 68, place: 'underground, birch forest' },
  share: { muse: 9, reflex: 1, pct: 90 },
  // the call running now: raw, as Muse sent it, and each step in plain words
  call: {
    n: 9, at: '5:14', tool: 'play_sequence', ago: '0:25',
    raw: ['craft stone_pickaxe 1', 'collect iron_ore 5', 'craft furnace 1', 'collect coal_ore 4'],
    steps: [
      { say: 'Craft a stone pickaxe', state: 'ok', ms: 4700 },
      { say: 'Mine 5 iron ore', state: 'run', sub: { kind: 'mine', text: 'mining iron ore', done: 3, of: 5 }, ms: 20_000 },
      { say: 'Craft a furnace', state: 'queued' },
      { say: 'Mine 4 coal ore', state: 'queued' },
    ],
  },
  // every earlier call, newest first: game time, tool, plain words, result
  earlier: [
    { at: '4:31', tool: 'get_state', say: 'HP 20, food 18, night, dawn in 4 min', state: 'look' },
    { at: '3:46', tool: 'get_state', say: 'HP 20, food 19, night, dawn in 5 min', state: 'look' },
    { at: '3:01', tool: 'play_sequence', say: 'Walk to the birch trees, mine 8 birch logs, craft a wooden pickaxe, mine 12 cobblestone', short: 'Walk, 8 birch logs, +2 more', state: 'ok', ms: 117_000, of: 4 },
    { at: '2:58', tool: 'play_sequence', say: 'Walk to the birch trees', state: 'fail', why: 'bad arguments: go_to takes x, y, z', of: 4 },
    { at: '2:48', tool: 'play_sequence', say: 'Mine 8 birch logs', state: 'fail', why: 'no path from the dug-in hole', ms: 3200, of: 3 },
    { at: '2:34', tool: 'get_state', say: 'HP 20, food 20, night, dawn in 6 min', state: 'look' },
    { at: '0:13', tool: 'live_view', say: 'Live view on', state: 'ok' },
    { at: '0:00', tool: 'start_game', say: 'New game, the Nether and back', state: 'ok', ms: 7500 },
  ],
  // Muse's own words with each call, newest first
  thoughts: [
    { at: '5:14', n: 9, text: 'Stone pickaxe crafted: grabbing 5 iron ore and 4 coal so the furnace can run and the iron pickaxe is one smelt away' },
    { at: '3:01', n: 6, text: 'Fixing the go_to argument shape: walking up to the birch cluster, then tooling up with logs and stone while night lasts' },
    { at: '2:58', n: 5, text: 'No path from the dug-in hole to the trees: walking up to the birch cluster first, then tooling up with logs and stone while night lasts' },
    { at: '2:48', n: 4, text: 'Night with sunrise 6 min out and no tools yet: grabbing birch logs, crafting a wooden pickaxe, and pulling cobblestone to dig in for the...' },
  ],
  goal: {
    name: 'Nether and back',
    items: [
      { id: 'wooden_pickaxe', say: 'Wooden pickaxe', at: '4:33' },
      { id: 'iron_pickaxe', say: 'Iron pickaxe' },
      { id: 'diamond', say: 'Diamonds', have: 0, of: 3 },
      { id: 'diamond_pickaxe', say: 'Diamond pickaxe' },
      { id: 'obsidian', say: 'Obsidian', have: 0, of: 14 },
      { id: 'flint_and_steel', say: 'Flint and steel' },
      { id: 'nether', say: 'Into the Nether' },
      { id: 'back', say: 'Back to Overworld' },
    ],
  },
  // the items that matter, in this order; 0 = none yet (dimmed)
  inventory: [
    { id: 'stone_pickaxe', n: 1, say: 'stone pickaxe' },
    { id: 'diamond', n: 0 },
    { id: 'raw_iron', n: 3 },
    { id: 'obsidian', n: 0 },
    { id: 'flint_and_steel', n: 0 },
    { id: 'bucket', n: 0 },
    { id: 'food', n: 0 },
    { id: 'shield', n: 0 },
  ],
  advice: { text: 'Night: no closed shelter, no shield', follow: 'Muse went on without it', ok: false },
};
