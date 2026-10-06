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
