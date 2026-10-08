// src/game.js - the game vocabulary every module shares: which blocks the bot may mine, which items it may craft,
// smelt or place, build blueprints, attack targets, furnace inputs and fuels. These lists are the skill whitelist (the
// tool schemas in contracts.js are built from them); every name is checked against minecraft-data 1.21.4 in the tests.

const freeze = (x) => Object.freeze(x);

export const WOODS = freeze(['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry']);
export const LOGS = freeze(WOODS.map((w) => `${w}_log`));
export const PLANKS = freeze(WOODS.map((w) => `${w}_planks`));

/** Blocks collect() may mine. Drops follow the game: stone gives cobblestone, iron_ore gives raw_iron. */
export const COLLECTABLE_BLOCKS = freeze([
  ...LOGS,
  'stone', 'cobblestone', 'deepslate', 'cobbled_deepslate', 'andesite', 'diorite', 'granite',
  'dirt', 'grass_block', 'sand', 'gravel', 'clay', 'short_grass', 'oak_leaves',
  'coal_ore', 'deepslate_coal_ore', 'iron_ore', 'deepslate_iron_ore', 'copper_ore', 'deepslate_copper_ore',
  'crafting_table', 'furnace',
]);

/** Items craft() may make (the iron-pickaxe tech tree, a hut, simple tools and food). */
export const CRAFTABLE_ITEMS = freeze([
  ...PLANKS,
  'stick', 'crafting_table', 'chest', 'furnace', 'torch', 'ladder', 'bowl', 'bread', 'bucket', 'shield',
  'wooden_pickaxe', 'wooden_axe', 'wooden_shovel', 'wooden_sword',
  'stone_pickaxe', 'stone_axe', 'stone_shovel', 'stone_sword',
  'iron_pickaxe', 'iron_axe', 'iron_shovel', 'iron_sword',
  'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots',
  'oak_door', 'spruce_door', 'birch_door', 'oak_slab', 'oak_stairs', 'oak_fence',
  'cobblestone_slab', 'cobblestone_stairs', 'stone_bricks',
]);

/** Furnace input -> output. smelt(item, n) takes the INPUT name. */
export const SMELT = freeze({
  raw_iron: 'iron_ingot', raw_copper: 'copper_ingot', raw_gold: 'gold_ingot',
  cobblestone: 'stone', sand: 'glass', clay_ball: 'brick',
  ...Object.fromEntries(LOGS.map((l) => [l, 'charcoal'])),
  beef: 'cooked_beef', porkchop: 'cooked_porkchop', chicken: 'cooked_chicken', mutton: 'cooked_mutton',
  rabbit: 'cooked_rabbit', cod: 'cooked_cod', salmon: 'cooked_salmon', potato: 'baked_potato',
});
export const SMELTABLE_ITEMS = freeze(Object.keys(SMELT));

/** Fuel -> items smelted per unit (game values). The body picks the fuel itself. */
export const FUEL = freeze({
  coal: 8, charcoal: 8, coal_block: 80,
  ...Object.fromEntries(LOGS.map((l) => [l, 1.5])),
  ...Object.fromEntries(PLANKS.map((p) => [p, 1.5])),
  stick: 0.5,
});

/**
 * The order fuels are chosen in (src/skills/smelt.js, the check in src/plan.js and BODY=mineai's smelt): cheapest
 * first, coal before wood, planks before sticks before logs.
 */
export const FUEL_ORDER = freeze(['coal', 'charcoal', 'coal_block', ...PLANKS, 'stick', ...LOGS]);

/**
 * The fuel for `want` items: the first in `order` that covers all of them, else the one covering most; units is how
 * many of it a furnace takes for what it covers (ceil(covers / items per unit)). Null when nothing burns.
 * @param {(name: string) => number} have  how many of an item there are
 */
export function chooseFuel(have, input, want, order = FUEL_ORDER) {
  let best = null;
  for (const name of order) {
    if (name === input) continue;
    const covers = Math.floor((have(name) || 0) * FUEL[name]);
    if (covers < 1) continue;
    if (covers >= want) return { name, units: Math.ceil(want / FUEL[name]), covers: want };
    if (!best || covers > best.covers) best = { name, units: Math.ceil(covers / FUEL[name]), covers };
  }
  return best;
}

/**
 * One fuel after another for `want` items when no single one covers them (chooseFuel each time on what is left): what
 * BODY=mineai's smelt sends, one smelt call per fuel, and what the check simulates for it. Covers less than want when
 * the fuel runs out.
 * @param {(name: string) => number} have
 * @returns {Array<{name: string, units: number, covers: number}>}
 */
export function fuelPlan(have, input, want, order = FUEL_ORDER) {
  const used = {};
  const out = [];
  for (let left = want; left > 0;) {
    const f = chooseFuel((n) => (have(n) || 0) - (used[n] ?? 0), input, left, order);
    if (!f) break;
    used[f.name] = (used[f.name] ?? 0) + f.units;
    out.push(f);
    left -= f.covers;
  }
  return out;
}

/** Blocks place() may put down. */
export const PLACEABLE_BLOCKS = freeze([
  'crafting_table', 'furnace', 'chest', 'torch', 'ladder', 'oak_door',
  'cobblestone', 'stone', 'cobbled_deepslate', 'stone_bricks', 'dirt', 'sand', 'gravel', 'glass',
  ...PLANKS, 'oak_log', 'oak_slab', 'cobblestone_slab',
]);

/** Materials build() accepts. */
export const BUILD_MATERIALS = freeze([...PLANKS, 'cobblestone', 'stone', 'stone_bricks', 'cobbled_deepslate', 'dirt', 'oak_log']);

/**
 * Build blueprints as layers from the ground up. Each layer is rows of z (row 0 faces the bot), columns of x.
 * '#' = material, '.' = must be air (door, interior), ' ' = leave as is. The body anchors 'shelter' on the bot's own
 * block (the bot ends up inside) and every other blueprint on flat ground just in front of the bot.
 */
export const BLUEPRINTS = freeze({
  hut_3x3: freeze({
    description: '3x3 hut: walls two high with a door gap at the front, flat roof (23 blocks)',
    layers: freeze([['#.#', '#.#', '###'], ['#.#', '#.#', '###'], ['###', '###', '###']]),
  }),
  // The roof block has no solid face of its own, so the top layer also caps the back wall: the roof is placed
  // against that block (in the real game a block can only be placed against a solid neighbour).
  shelter: freeze({
    description: 'emergency 1x1 shelter around the bot: four walls two high and a roof (10 blocks)',
    layers: freeze([[' # ', '#.#', ' # '], [' # ', '#.#', ' # '], [' # ', ' # ', '   ']]),
  }),
  wall_5x2: freeze({
    description: 'straight wall 5 long, 2 high (10 blocks)',
    layers: freeze([['#####'], ['#####']]),
  }),
  platform_3x3: freeze({
    description: 'flat 3x3 floor (9 blocks)',
    layers: freeze([['###', '###', '###']]),
  }),
});
export const BLUEPRINT_NAMES = freeze(Object.keys(BLUEPRINTS));

/** How many material blocks a blueprint needs. */
export function blueprintBlockCount(name) {
  const bp = BLUEPRINTS[name];
  if (!bp) return 0;
  return bp.layers.flat().join('').split('').filter((c) => c === '#').length;
}

/** attack() targets. Never players, villagers or pets. 'nearest_hostile' picks the closest hostile mob. */
export const ATTACK_TARGETS = freeze([
  'nearest_hostile', 'zombie', 'husk', 'drowned', 'skeleton', 'stray', 'spider', 'cave_spider', 'creeper', 'slime',
  'witch', 'cow', 'pig', 'sheep', 'chicken', 'rabbit',
]);
