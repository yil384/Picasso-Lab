// src/mineai/skills.js - what a guest's skill calls become on the Mine AI MCP runtime (BODY=mineai), and back: our 10
// skills and craft_batch mapped onto their actions (collect -> collect_block, craft -> craft_item, smelt -> smelt_item,
// go_to -> navigate, ...), the curated extra skills MCP offers with this body (equip, hunt, sleep, bucket, chest,
// explore, policy, pick_up, drop: the M4 survival set of the reuse spike) with compact schemas of our own, their
// results turned into our result text and typed codes, and what each action itself used and made, from their evidence
// (ownChange), apart from what else changed meanwhile. Pure functions: no network here (src/mineai/body.js calls).
// Their 37 tools, their 1.36 MB tools/list and their required rationales never reach a guest: only these skills do.

import { skillSet, TOOL_TIMEOUTS_MS, SMELT_PER_CALL, CRAFT_BATCH_MAX, SCHEMAS, NOT_HUNGRY_TEXT } from '../contracts.js';
import { BLUEPRINTS, BLUEPRINT_NAMES, SMELT, MAX_DROPS, fuelPlan } from '../game.js';
import { facingOf } from '../state.js';
import { registryFor, requireMc } from '../mc.js';

const obj = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const int = (description, minimum, maximum) => ({ type: 'integer', description, minimum, maximum });
const pick = (description, list) => ({ type: 'string', description, enum: [...list] });
/** A registry name (an item, a block, a biome): lower case, digits and _; the runtime refuses names it does not know. */
const NAME = (description) => ({ type: 'string', description, minLength: 1, maxLength: 48, pattern: '^[a-z0-9_]+$' });
const POS = { ...obj({ x: int('block x', -30_000_000, 30_000_000), y: int('block y', -64, 320), z: int('block z', -30_000_000, 30_000_000) }), description: 'a block position' };

/** Mobs hunt may go after: never players, villagers, pets or golems. */
export const HUNT_MOBS = Object.freeze([
  'cow', 'pig', 'sheep', 'chicken', 'rabbit', 'goat', 'mooshroom', 'cod', 'salmon', 'squid',
  'zombie', 'husk', 'drowned', 'skeleton', 'stray', 'spider', 'cave_spider', 'creeper', 'slime', 'witch', 'enderman',
  'blaze', 'magma_cube', 'ghast', 'wither_skeleton', 'phantom', 'silverfish', 'zombified_piglin', 'hoglin',
]);
const EQUIP_TO = ['hand', 'off-hand', 'head', 'torso', 'legs', 'feet'];
/** What each huntable mob drops (item names as the game has them), for the hunt's description and its refusals. */
export const HUNT_DROPS = Object.freeze({
  cow: ['beef', 'leather'], mooshroom: ['beef', 'leather'], pig: ['porkchop'], sheep: ['mutton', 'white_wool'],
  chicken: ['chicken', 'feather'], rabbit: ['rabbit', 'rabbit_hide'], goat: [], cod: ['cod'], salmon: ['salmon'],
  squid: ['ink_sac'], zombie: ['rotten_flesh'], husk: ['rotten_flesh'], drowned: ['rotten_flesh'], skeleton: ['bone', 'arrow'],
  stray: ['bone', 'arrow'], spider: ['string', 'spider_eye'], cave_spider: ['string', 'spider_eye'], creeper: ['gunpowder'],
  slime: ['slime_ball'], witch: ['redstone', 'glowstone_dust', 'sugar'], enderman: ['ender_pearl'], blaze: ['blaze_rod'],
  magma_cube: ['magma_cream'], ghast: ['ghast_tear', 'gunpowder'], wither_skeleton: ['bone', 'coal'], phantom: ['phantom_membrane'],
  silverfish: [], zombified_piglin: ['rotten_flesh', 'gold_nugget'], hoglin: ['porkchop', 'leather'],
});
/**
 * How near (blocks, flat, to its nearest cell; and 6 up or down) a build of the same blueprint and material continues
 * the structure the last build left incomplete instead of starting a new one. The Muse re-test on staging (2026-10-08,
 * game g42b738) sent build hut_3x3 three times in a row on the same spot: each started a new hut facing the way the bot
 * then looked, and left three overlapping partial huts.
 */
export const CONTINUE_RADIUS = 12;
/** No bucket is poured this close (blocks, flat) to where the bot joined (the world spawn, give or take its 10). */
export const SPAWN_GUARD = 32;
/** ...or this close to another player. */
export const PLAYER_GUARD = 4;
/** The blocks a chest skill opens (and whose placement a body records as its own). */
export const CONTAINER_BLOCKS = new Set(['chest', 'trapped_chest', 'barrel']);
const RAW_FOOD = ['never', 'emergency_only', 'always'];
/** What the body looks after by itself between the player's calls (src/mineai/care.js), and the policy skill's knobs. */
export const CARE_DEFAULTS = Object.freeze({ night: 'shelter', armor: 'craft', food: 'hunt', tools: 'spare', defend: 'on', eat: 'auto', escape: 'on' });
/** night, armor, food and tools: what the body sees to by itself in full mode (MINEAI_CARE=full); defend, eat and escape:
 * its reflexes, in both modes (eat auto: starving in advise mode, hungry in full mode). */
export const CARE_KNOBS = Object.freeze({
  night: Object.freeze(['shelter', 'off']), armor: Object.freeze(['craft', 'wear', 'off']), food: Object.freeze(['hunt', 'eat', 'off']), tools: Object.freeze(['spare', 'off']),
  defend: Object.freeze(['on', 'off']), eat: Object.freeze(['hungry', 'starving', 'off']), escape: Object.freeze(['on', 'off']),
  flee: Object.freeze(['on', 'off']),
});

/**
 * The extra skills (MCP only, BODY=mineai), as [name, description, parameters]. Optional keys are listed by each
 * schema's `required`; everything else is checked like the 10 skills' arguments (src/contracts.js validateArgs).
 */
export const EXTRA_DEFS = Object.freeze([
  ['equip',
    'Wear armor, hold a tool or weapon, or put a shield in the off-hand (the slot follows from the item unless to is given).',
    obj({ item: NAME('a carried item, e.g. iron_chestplate, shield, stone_sword'), to: pick('where it goes', EQUIP_TO) }, ['item'])],
  ['hunt',
    'Hunt mobs of one kind until n of a drop came into your inventory. The drop is the item\'s name as the game has it: cow -> beef or leather, pig -> porkchop, sheep -> mutton or white_wool, chicken -> chicken (the raw meat) or feather, rabbit -> rabbit, spider -> string, skeleton -> bone, zombie -> rotten_flesh. Hostile mobs need a shield carried, unless without_shield is true.',
    obj({ mob: pick('which mob', HUNT_MOBS), drop: NAME('the item you want from it'), n: int('how many of the drop, 1 to 64', 1, 64), without_shield: { type: 'boolean', description: 'true: fight a hostile mob with no shield' } }, ['mob', 'drop', 'n'])],
  ['sleep',
    'Sleep in the nearest free bed (or put down the one you carry): through the night, and it sets your respawn point.',
    obj({})],
  ['bucket',
    `fill: scoop water or lava into an empty bucket from the nearest source (or the source at pos); pour: empty a water bucket into the cell at pos (never lava, never within ${SPAWN_GUARD} blocks of the world spawn or ${PLAYER_GUARD} of another player: the world is shared).`,
    obj({ action: pick('fill or pour', ['fill', 'pour']), liquid: pick('which liquid (default water)', ['water', 'lava']), pos: POS }, ['action'])],
  ['chest',
    'Use the chest (or barrel) at pos: inspect what is in it, deposit or withdraw items. Your own chests (ones you put down) and ones nobody put down; never one another player\'s bot put down.',
    obj({
      action: pick('what to do', ['inspect', 'deposit', 'withdraw']),
      pos: POS,
      items: { type: 'array', description: 'for deposit and withdraw: the items and how many', minItems: 1, maxItems: 12, items: obj({ item: NAME('item'), n: int('how many, 1 to 2304', 1, 2304) }) },
    }, ['action', 'pos'])],
  ['explore',
    'Walk into unexplored land in a compass heading (0 north, 90 east, 180 south, 270 west) for 1 to 8 chunks; with biome, stop as soon as you stand in it.',
    obj({ heading: int('compass heading in degrees, 0 to 359', 0, 359), chunks: int('how far, in chunks of 16 blocks (default 1)', 1, 8), biome: NAME('a biome to look for, e.g. plains, desert, badlands') }, ['heading'])],
  ['policy',
    'Your rules: what the body does by itself, without a call, for the rest of the game. Every game starts with none; set the ones you want (or start_game rules). defend on: fights back, raises its shield, walls itself in when badly hurt. flee on: withdraws from a hostile mob. escape on: out of water for air, out of fire and lava, back on its feet after a hit. eat_below N: eats the best food it carries at food N or less (0: never). A rule acts in a second, where your calls take seconds to minutes: without defend and escape the body dies more. Actions under a rule count as decided by you (each with when you set it). In fights: retreat_health, raw_food and fight (respond_to_threats or defend_only). Everything else (shelter, a shield, armor, food, tools, items after a death) is a call of yours; each reply\'s "Body advice" says what needs doing.',
    obj({
      defend: pick('rule: fight back, shield, wall in when badly hurt', CARE_KNOBS.defend), flee: pick('rule: withdraw from a hostile mob', CARE_KNOBS.flee), escape: pick('rule: air, fire, lava, footing', CARE_KNOBS.escape),
      eat_below: int('rule: eat at food N or less, 0 to 20 (0: never)', 0, 20), eat: pick('older form of eat_below: hungry (14), starving (4), off', CARE_KNOBS.eat),
      retreat_health: int('health 1 to 19 (default 10)', 1, 19), raw_food: pick('raw meat on its own', RAW_FOOD), fight: pick('fight or only defend', ['respond_to_threats', 'defend_only']),
      night: pick('full mode only: night', CARE_KNOBS.night), armor: pick('full mode only: armor', CARE_KNOBS.armor), food: pick('full mode only: food', CARE_KNOBS.food), tools: pick('full mode only: tools', CARE_KNOBS.tools),
    }, [])],
  ['shelter',
    'Close yourself in for the night where you stand: walls and a roof of the blocks you carry (13 make one), else dug two blocks into the ground, else with dirt collected around. Stays closed until your next step.',
    obj({}, [])],
  ['shield',
    'Make a shield and put it in your off-hand: from 1 iron ingot you carry, else raw iron smelted, else 1 iron ore mined (stone pickaxe) and smelted; planks from your wood. Your fight reflex raises it against arrows.',
    obj({}, [])],
  ['portal',
    'A Nether portal. Build the frame first: build nether_portal from 12 obsidian, or 10 with 2 other blocks you carry (cobblestone, dirt...) for its top corners, and 2 more on uneven ground (or place obsidian yourself, 4 wide and 5 tall, corners optional). light: light the frame with flint_and_steel you carry; enter: step into the lit portal and wait to arrive (in the Nether, enter again to come back). pos: a frame block or an inside cell; without pos, the frame your last build nether_portal made, or in the Nether the portal you came out of. dismantle: takes the obsidian of your last frame back, block by block (after a frame that failed). Never near the world spawn or another player. Take food along (the Nether has little); it enters with whatever it carries.',
    obj({ action: pick('light, enter, or dismantle (your own last frame\'s obsidian back)', ['light', 'enter', 'dismantle']), pos: POS, low_supplies: { type: 'boolean', description: 'kept for old clients; the body always enters' } }, ['action'])],
  ['armor',
    'Craft the best armor you can pay for (iron ingots, leather, gold or diamonds) and put it on, with any better piece or shield you carry.',
    obj({}, [])],
  ['pick_up',
    'Pick up items lying within 8 blocks (only item if given); death_items: true walks back to where you died and picks up what you dropped (within 5 minutes).',
    obj({ item: NAME('only this item'), death_items: { type: 'boolean', description: 'true: recover what you dropped when you died' } }, [])],
  ['drop',
    'Throw n of an item on the ground where you stand (to make room in the inventory), or with junk: true every stack of what digging fills the bag with and no skill here uses (gravel, tuff, granite, diorite, andesite, moss, clay balls, flowers and the like, and cobblestone, cobbled deepslate, dirt and netherrack beyond a reserve) in one go. Never worn armor.',
    obj({ item: NAME('a carried item'), n: int('how many, 1 to 2304', 1, 2304), junk: { type: 'boolean', description: 'true: drop every junk stack at once (item and n not needed)' } }, [])],
]);

/**
 * What some of the 10 skills and craft_batch do on this body, where it differs from ours (src/contracts.js): their
 * searches cover every loaded chunk, a table or furnace you carry is put down for the step and picked up again, a smelt
 * waits for the whole load in one furnace, and fuel goes one kind after another.
 */
export const MINEAI_DESCRIPTIONS = Object.freeze({
  go_to: 'Walk to a block position; the body finds its own way (it may dig, bridge, pillar or swim). y is the height of your feet: one above the ground block you want to stand on (get_state\'s position is your feet). The target must be within 256 blocks. Seconds for a short walk, a few minutes for a long one or a climb out of the deep (its time limit grows with the distance); a walk that finds no way ends and says why.',
  collect: 'Mine n blocks of one type and pick up the drops: the body searches every loaded chunk around you (not only the nearest 32 blocks), walks there and uses the best tool you carry. stone drops cobblestone (collect cobblestone mines stone for it); iron_ore drops raw_iron and needs a stone pickaxe or better; diamond_ore (deepslate_diamond_ore below y 0) drops diamond and needs an iron pickaxe: diamonds lie at y 16 and below, most near y -59. obsidian needs a diamond pickaxe, cobblestone to close off lava and a water bucket: the body pours the water onto a still lava pool within 16 blocks of you, scoops it back and mines what formed (with no pool that near it is refused, code LAVA: go next to one first; get_state lists lava among the nearby blocks, and deep caves below y -54 have the most). About 10 s a block; while it runs, get_state says how many are done. gravel drops flint now and then (about 1 in 10). Lava next to a target is closed off with a carried block before the dig; a target it cannot make safe is refused (code LAVA). The reply says what the step mined and picked up, and apart from that what changed on the way (blocks dug through, scaffolding placed).',
  craft: 'Craft n of an item from your inventory (rounded up to whole recipe batches; planks and sticks it lacks are made from what you carry). When the recipe needs a crafting table, the one you carry is put down for the craft and picked up again; carrying none, a table within reach is used, else one is made from 4 planks and left standing.',
  craft_batch: `Craft several items in order in ONE skill, one after another, each as craft: later items use what the earlier ones made, and a crafting table you carry (or one made earlier in the list) is put down for each item that needs it and picked up again. Up to ${CRAFT_BATCH_MAX} items; stops at the first item that cannot be made and says what is missing.`,
  build: `Build a blueprint from blocks in your inventory in front of you, facing your way (shelter: around you). Blueprints: ${BLUEPRINT_NAMES.map((b) => `${b} = ${BLUEPRINTS[b].description}`).join('; ')}. Build again with the same blueprint and material within ${CONTINUE_RADIUS} blocks of one your last build left incomplete to continue that one, at its place and facing; else a new one. It digs cells clear, puts dirt under walls over a drop or water, keeps stone it cannot dig out and leaves water.`,
  smelt: `Smelt n items in one furnace and wait until all are done (about 10 s an item). item is the INPUT (raw_iron -> iron_ingot, oak_log -> charcoal, cobblestone -> stone). A furnace you carry is put down for it and picked up again; else a furnace within 24 blocks is used. Fuel from your inventory (coal, charcoal, planks, sticks, logs), one kind after another when one is not enough. At most ${SMELT_PER_CALL} a call; call again for the rest.`,
});

/** What MCP's play and play_sequence take with BODY=mineai: the 10 skills, craft_batch and the extra ones. */
export const MINEAI_SKILLS = skillSet(EXTRA_DEFS, MINEAI_DESCRIPTIONS);

/** Each skill's time limit with this body (the 10 as ours; walking and fighting ones longer). */
export const MINEAI_TIMEOUTS = Object.freeze({
  ...TOOL_TIMEOUTS_MS,
  smelt: 300_000, // their smelt waits for the whole load: about 10 s an item, 24 at most
  equip: 20_000, hunt: 300_000, sleep: 60_000, bucket: 120_000, chest: 60_000, explore: 300_000, policy: 15_000,
  pick_up: 90_000, drop: 30_000, armor: 150_000, shelter: 240_000, shield: 300_000, portal: 120_000,
});

// ---------------------------------------------------------------------------------------------------------------
// Our calls -> their actions

const reg = registryFor('1.21.4');
const { Recipe } = requireMc('prismarine-recipe')(reg);
const tableCache = new Map();
/** True when every recipe of the item needs a 3x3 grid (planks, sticks and a table itself do not). */
export function needsTable(item) {
  if (!tableCache.has(item)) {
    const id = reg.itemsByName[item]?.id;
    const recipes = id === undefined ? [] : Recipe.find(id, null);
    tableCache.set(item, recipes.length > 0 && recipes.every((r) => r.requiresTable));
  }
  return tableCache.get(item);
}

/** Food that may give Hunger but never takes health, eaten when nothing safe is carried and food is low. */
export const EMERGENCY_FOOD = Object.freeze(['rotten_flesh', 'chicken']);
export const EMERGENCY_AT = 6;
/**
 * Whether food that may give Hunger is eaten now: at food EMERGENCY_AT or less, or hurt (health 14 or less) below food
 * 18, the level it heals at (production game gd7540a, 2026-10-14: health 6 for 14 minutes at food 15 to 5 with rotten
 * flesh carried; eat refused it above food 6, so it never healed). Rotten flesh adds 4 food; its Hunger costs about 1.
 */
export const emergencyEats = (food, health) => Number.isFinite(food) && food < 20 && (food <= EMERGENCY_AT || ((health ?? 20) <= 14 && food < 18));
const UNSAFE_FOOD = new Set(['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish', 'chicken', 'suspicious_stew', 'chorus_fruit']);
/** The safe food carried with the best food value + saturation (as our eat skill picks), or null. */
export function bestFood(inventory) {
  const foods = reg.foodsByName;
  const score = (n) => foods[n].effectiveQuality ?? foods[n].foodPoints + foods[n].saturation;
  return Object.keys(inventory).filter((n) => inventory[n] > 0 && foods[n] && !UNSAFE_FOOD.has(n)).sort((a, b) => score(b) - score(a))[0] ?? null;
}

/** The fuels for n items, one kind after another, as the check plans them (src/game.js fuelPlan): [{name, units, covers}]. */
export const fuelsFor = (inventory, input, n) => fuelPlan((name) => inventory[name] ?? 0, input, n);
/** The first fuel of that plan (null: nothing burns). */
export const chooseFuel = (inventory, input, n) => fuelsFor(inventory, input, n)[0]?.name ?? null;

/** The drop an attack waits for (the runtime's hunt ends on a drop); the fight itself is the point. */
const ATTACK_DROP = {
  zombie: 'rotten_flesh', husk: 'rotten_flesh', drowned: 'rotten_flesh', skeleton: 'bone', stray: 'bone', spider: 'string',
  cave_spider: 'string', creeper: 'gunpowder', slime: 'slime_ball', witch: 'glass_bottle', cow: 'beef', pig: 'porkchop',
  sheep: 'mutton', chicken: 'chicken', rabbit: 'rabbit',
};
const HOSTILE_KINDS = new Set(['zombie', 'husk', 'drowned', 'skeleton', 'stray', 'spider', 'cave_spider', 'creeper', 'slime', 'witch']);

/**
 * Does a build call continue the structure the last build left incomplete? Same blueprint and material, and near it:
 * a shelter (built around the bot) only from where it was built (its inner cell, give or take a block); anything
 * else within CONTINUE_RADIUS blocks of its nearest cell.
 * @param {{blueprint: string, material: string, cells: Array<{x,y,z}>, feet: {x,y,z}}|null} last
 */
export function continuesLast(last, args, feet) {
  if (!last || last.blueprint !== args.blueprint || last.material !== args.material || !feet) return false;
  if (args.blueprint === 'shelter') return Math.max(Math.abs(feet.x - last.feet.x), Math.abs(feet.z - last.feet.z)) <= 1 && Math.abs(feet.y - last.feet.y) <= 1;
  return last.cells.some((c) => Math.hypot(c.x - feet.x, c.z - feet.z) <= CONTINUE_RADIUS && Math.abs(c.y - feet.y) <= 6);
}

/** Blueprint cells for build_structure: '#' the material, '.' dug clear; anchored as our build skill anchors them. */
/** Blocks a portal frame's top corners may be instead of obsidian (any solid block will do). */
export const FRAME_FILLERS = Object.freeze(['cobblestone', 'cobbled_deepslate', 'stone', 'dirt', 'andesite', 'diorite', 'granite', 'tuff', 'deepslate', 'netherrack', 'oak_planks', 'spruce_planks', 'birch_planks']);
/** A portal frame's two top corners (the cells at the ends of its top row), from its cells. */
export function portalCorners(cells) {
  const frame = cells.filter((c) => c.block_name !== 'air');
  const top = Math.max(...frame.map((c) => c.y));
  const row = frame.filter((c) => c.y === top);
  // the top row is 4 wide: its two ends are the cells farthest along the row
  const along = row.every((c) => c.x === row[0].x) ? 'z' : 'x';
  const sorted = [...row].sort((a, b) => a[along] - b[along]);
  return sorted.length === 4 ? [sorted[0], sorted[3]] : [];
}
export function blueprintCells(blueprint, material, feet, headingDegrees) {
  const bp = BLUEPRINTS[blueprint];
  const f = facingOf((-Number(headingDegrees || 0) * Math.PI) / 180); // compass degrees -> mineflayer yaw
  const right = { dx: -f.dz, dz: f.dx };
  const rows = bp.layers[0].length;
  const cols = bp.layers[0][0].length;
  const rowShift = blueprint === 'shelter' ? -Math.floor(rows / 2) : 1;
  const colShift = -Math.floor(cols / 2);
  const cells = [];
  bp.layers.forEach((layer, k) => layer.forEach((line, i) => [...line].forEach((ch, j) => {
    if (ch !== '#' && ch !== '.') return;
    const a = i + rowShift;
    const b = j + colShift;
    cells.push({ x: feet.x + f.dx * a + right.dx * b, y: feet.y + k + (bp.base ?? 0), z: feet.z + f.dz * a + right.dz * b, block_name: ch === '#' ? material : 'air' });
  })));
  return { cells, facing: f.name };
}

/**
 * What digging walks fill the bag with and no skill here uses, with the reserve kept of each (F3 of the log hunt: one
 * 37-minute game picked up 314 cobbled deepslate, 73 tuff and more, and a hunt then found no free slot).
 */
export const JUNK = Object.freeze([
  ['gravel', 0], ['andesite', 0], ['diorite', 0], ['granite', 0], ['tuff', 0], ['calcite', 0], ['deepslate', 0],
  ['dripstone_block', 0], ['pointed_dripstone', 0], ['smooth_basalt', 0], ['moss_block', 0], ['moss_carpet', 0],
  ['azalea', 0], ['flowering_azalea', 0], ['clay_ball', 0], ['glow_lichen', 0], ['rotten_flesh', 0], ['wheat_seeds', 0],
  ['poppy', 0], ['dandelion', 0], ['azure_bluet', 0], ['oxeye_daisy', 0], ['cornflower', 0], ['short_grass', 0],
  ['raw_copper', 0], ['copper_ingot', 0], ['redstone', 0], ['lapis_lazuli', 0], ['netherrack', 16], ['dirt', 16],
  ['sand', 16], ['cobbled_deepslate', 32], ['cobblestone', 32],
].map(([item, keep]) => Object.freeze({ item, keep })));
/** The junk stacks over their reserve in an inventory: [{item, n}], the biggest first. */
export function junkOf(inventory = {}) {
  return JUNK.map(({ item, keep }) => ({ item, n: (inventory[item] ?? 0) - keep })).filter((j) => j.n > 0).sort((a, b) => b.n - a.n);
}

/** How close (blocks) another player may be to an obsidian frame being placed, built or lit. */
export const FRAME_PLAYER_GUARD = 8;

/**
 * Obsidian and portals are not made where new players arrive or next to another player (the safety review of M8a):
 * a refusal when a cell is within SPAWN_GUARD blocks (flat) of the world spawn, or another player is within
 * FRAME_PLAYER_GUARD blocks of a cell; else null. The players are read again at each step (a portal lit later checks
 * again).
 */
export function frameGuard(cells, ctx) {
  const list = (cells ?? []).filter(Boolean);
  if (ctx.spawn && list.some((c) => Math.hypot(c.x - ctx.spawn.x, c.z - ctx.spawn.z) <= SPAWN_GUARD)) {
    return refuse(`no obsidian or portal within ${SPAWN_GUARD} blocks of the world spawn (about ${Math.round(ctx.spawn.x)} ${Math.round(ctx.spawn.z)}), where new players arrive: go farther away first`, 'BAD_ARGS');
  }
  const other = (ctx.players ?? []).map((p) => p?.position).filter(Boolean).find((q) => list.some((c) => dist(q, c) <= FRAME_PLAYER_GUARD));
  if (other) return refuse(`another player is within ${FRAME_PLAYER_GUARD} blocks of where the obsidian or portal would be: move away from them first`, 'BAD_ARGS');
  return null;
}

/** Collects that take longer than the skill's limit: a base and a time per block (ms). */
export const SLOW_COLLECT = Object.freeze({
  // about 30 s a block with the pours and the scoops (production game g2409ce, 2026-10-14: 11 obsidian in 340 s, the
  // step's whole limit then, so it ended "timed out" with every one of them in)
  obsidian: { base: 120_000, each: 30_000 },
  diamond_ore: { base: 240_000, each: 30_000 },
  deepslate_diamond_ore: { base: 240_000, each: 30_000 },
});

/** The block collect mines for an item that is another block's drop: cobblestone comes from stone. */
export const COLLECT_FROM = Object.freeze({ cobblestone: 'stone', cobbled_deepslate: 'deepslate' });

/** Their tools that answer at once (no submission_id, no wait): the rest are foreground actions. */
export const DIRECT_TOOLS = new Set(['set_survival_policy']);

const refuse = (result, code = 'FAILED') => ({ refused: { ok: false, result, code, delta: {} } });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const at = (p) => `${p.x} ${p.y} ${p.z}`;

/**
 * One of our skill calls as the runtime's action calls.
 * @param {string} skill
 * @param {object} args   already validated (MINEAI_SKILLS.validate)
 * @param {{inventory: Record<string, number>, position?: {x,y,z}|null, heading?: number, food?: number,
 *   hostiles?: Array<{name: string, distance: number}>, furnace?: {x,y,z}|null, policyRevision?: string|null,
 *   maxTravel?: number, spawn?: {x,y,z}|null, players?: Array<{position: {x,y,z}|null}>, gameId?: string,
 *   containerOwner?: (pos: {x,y,z}) => string|null}} ctx  what the body knows now (spawn: where the bot joined, the
 *   world spawn give or take; players: the other players its status sees; containerOwner: the game whose bot put the
 *   chest at pos down, or null)
 * @returns {{calls: Array<{tool: string, args: object, label?: string}>, note?: string} | {local: 'state'} | {refused: object}}
 */
export function toTheirs(skill, args, ctx) {
  const inv = ctx.inventory ?? {};
  const carries = (name) => (inv[name] ?? 0) > 0;
  switch (skill) {
    case 'get_state': return { local: 'state' };
    case 'go_to': {
      if (ctx.position && ctx.maxTravel && dist(ctx.position, args) > ctx.maxTravel) return refuse(`${args.x} ${args.y} ${args.z} is more than ${ctx.maxTravel} blocks away; go there in shorter walks`);
      // a long walk, or a climb out of the deep (digging a way up through 140 blocks of rock), gets longer than the
      // skill's 2 minutes (staging, 2026-10-11: a climb from y -29 to the surface stopped at 120 s)
      const far = ctx.position ? dist(ctx.position, args) : 0;
      return { calls: [{ tool: 'navigate', args: { x: args.x, y: args.y, z: args.z } }], ...(far > 60 ? { timeoutMs: Math.min(600_000, 120_000 + 2_000 * Math.round(far - 60)) } : {}) };
    }
    case 'collect': {
      // cobblestone is what stone drops: their collect would look for cobblestone BLOCKS (dungeon walls, other
      // players' builds, the bot's own scaffolding) and count the stone it digs on the way there (the Muse run on
      // staging: "mined 0 blocks and picked up 12 cobblestone")
      const block = COLLECT_FROM[args.block] ?? args.block;
      const calls = [];
      for (let left = args.n; left > 0; left -= 32) calls.push({ tool: 'collect_block', args: { block_name: block, count: Math.min(32, left) } });
      // obsidian is made first (a walk to lava, a pour, the water scooped back) and takes about 9.4 s a block with a
      // diamond pickaxe; diamonds lie deep: both get longer than a collect's 3 minutes (a local run, 2026-10-11: 12
      // obsidian stopped twice at 180 s with 1 and 7 mined)
      const slow = SLOW_COLLECT[block];
      // obsidian is cast with water: an empty bucket is filled from the nearest water first (g2409ce: the last pour
      // was not scooped back, and the bucket stayed empty for the next collect)
      const refill = block === 'obsidian' && !((Number(inv.water_bucket) || 0) > 0) && (Number(inv.bucket) || 0) > 0;
      if (refill) calls.unshift({ tool: 'use_bucket', args: { action: 'fill', liquid: 'water' }, refill: true });
      return { calls, ...(slow ? { timeoutMs: Math.min(900_000, slow.base + slow.each * args.n + (refill ? 60_000 : 0)) } : {}), ...(refill ? { note: 'filled your empty bucket with water first' } : {}) };
    }
    case 'craft':
    case 'craft_batch': {
      const items = skill === 'craft' ? [{ item: args.item, n: args.n }] : args.items;
      // one craft_item per item, in order (their planner keeps every item listed in one call, so the planks the first
      // item makes would not feed the later ones). A table carried at that point (also one made earlier in the list)
      // is put down for the item and picked up again (their temporary workstation); none carried: a table within reach
      // is used, else their craft makes one and leaves it standing (the MCP check adds a table craft before it)
      let tables = inv.crafting_table ?? 0;
      return {
        calls: items.map(({ item, n }) => {
          const temporary = needsTable(item) && tables > 0;
          if (item === 'crafting_table') tables += n;
          return { tool: 'craft_item', args: { items: [{ item_name: item, count: n }], ...(temporary ? { temporary_workstation: true } : {}) } };
        }),
      };
    }
    case 'smelt': {
      const n = Math.min(args.n, SMELT_PER_CALL, inv[args.item] ?? 0);
      if (n < 1) return refuse(`you have no ${args.item} to smelt`, 'NEED_ITEMS');
      // their smelt takes one fuel: one call per fuel, in the order the check burns them (src/game.js fuelPlan)
      const fuels = fuelsFor(inv, args.item, n);
      if (!fuels.length) return refuse('no fuel: coal, charcoal, planks, sticks or logs', 'NEED_ITEMS');
      const covered = fuels.reduce((k, f) => k + f.covers, 0);
      if (covered < n) return refuse(`not enough fuel: what you carry burns ${covered} of the ${n} ${args.item}; coal or charcoal smelt 8 each, planks or logs 1.5`, 'NEED_ITEMS');
      const where = carries('furnace') ? { temporary_workstation: true } : ctx.furnace ? { x: ctx.furnace.x, y: ctx.furnace.y, z: ctx.furnace.z } : null;
      if (!where) return refuse('no furnace: carry one (craft furnace from 8 cobblestone) or stand near an empty one', 'NEED_ITEMS');
      const note = n < args.n ? `smelts ${n} of the ${args.n} (at most ${SMELT_PER_CALL} a call, and what you carry); call again for the rest` : null;
      return { calls: fuels.map((f) => ({ tool: 'smelt_item', args: { item_name: args.item, count: f.covers, fuel_item_name: f.name, ...where } })), ...(note ? { note } : {}), expect: SMELT[args.item] };
    }
    case 'place': {
      if (args.block === 'obsidian') { const guard = frameGuard([args.pos], ctx); if (guard) return guard; }
      return { calls: [{ tool: 'place_block', args: { block_name: args.block, x: args.pos.x, y: args.pos.y, z: args.pos.z } }] };
    }
    case 'build': {
      if (!ctx.position) return refuse('the body does not know where it stands yet; try again in a moment');
      const feet = { x: Math.floor(ctx.position.x), y: Math.floor(ctx.position.y), z: Math.floor(ctx.position.z) };
      // the structure the last build left incomplete, when this call is the same build near it: the same cells again
      // (the runtime audits them and works only the ones still wrong), never a new one facing the bot's new heading
      const last = ctx.lastBuild ?? null;
      if (continuesLast(last, args, feet) && (args.material === 'obsidian' || args.blueprint === 'nether_portal')) { const guard = frameGuard(last.cells, ctx); if (guard) return guard; }
      if (continuesLast(last, args, feet)) {
        return { calls: [{ tool: 'build_structure', args: { blocks: last.cells, remove_wrong_blocks: true } }], note: `continued the ${args.blueprint} begun facing ${last.facing} at ${at(last.feet)}`, build: last };
      }
      const { cells, facing } = blueprintCells(args.blueprint, args.material, feet, ctx.heading);
      if (args.material === 'obsidian' || args.blueprint === 'nether_portal') { const guard = frameGuard(cells, ctx); if (guard) return guard; }
      // a portal frame needs 10 obsidian: its top corners may be any block (production game g0a414c, 2026-10-13: 11
      // obsidian carried, and 9 minutes spent on a 12th). With 10 or 11, the corners are a carried building block
      const corners = args.blueprint === 'nether_portal' && args.material === 'obsidian' ? portalCorners(cells) : [];
      const have = Number(ctx.inventory?.obsidian) || 0;
      const filler = FRAME_FILLERS.filter((b) => (Number(ctx.inventory?.[b]) || 0) > 0);
      let note = `built facing ${facing}`;
      if (corners.length === 2 && have >= 10 && have < 12 && filler.length) {
        const pool = filler.flatMap((b) => Array(Math.min(2, Number(ctx.inventory[b]) || 0)).fill(b)).slice(0, 2);
        if (pool.length === 2 || have === 11) {
          corners.slice(0, 12 - have).forEach((c, k) => { c.block_name = pool[k] ?? pool[0]; });
          note += `; its top corners are ${[...new Set(corners.filter((c) => c.block_name !== 'obsidian').map((c) => c.block_name))].join(' and ')} (a frame needs 10 obsidian)`;
        }
      }
      return { calls: [{ tool: 'build_structure', args: { blocks: cells, remove_wrong_blocks: true } }], note, build: { blueprint: args.blueprint, material: args.material, cells, facing, feet } };
    }
    case 'attack': {
      let target = args.target;
      if (target === 'nearest_hostile') {
        const near = (ctx.hostiles ?? []).filter((h) => h.distance <= 16 && ATTACK_DROP[h.name]).sort((a, b) => a.distance - b.distance)[0];
        if (!near) return refuse('no hostile mob within 16 blocks');
        target = near.name;
      }
      return { calls: [{ tool: 'collect_mob_drop', args: { mob_name: target, drop_name: ATTACK_DROP[target], count: 1, ...(HOSTILE_KINDS.has(target) ? { allow_without_shield: true } : {}) } }], attack: target };
    }
    case 'eat': {
      if ((ctx.food ?? 0) >= 20) return refuse(NOT_HUNGRY_TEXT, 'NOT_HUNGRY');
      const food = bestFood(inv);
      if (!food) {
        // nothing safe: food that may only cost hunger (never health) is eaten when food is low, with a warning (a
        // production game, 2026-10-12, g0793f1: rotten flesh refused at food 6 and 3.4 health, nothing else carried)
        const last = EMERGENCY_FOOD.find((f) => (inv[f] ?? 0) > 0);
        if (last && emergencyEats(ctx.food ?? 20, ctx.health)) return { calls: [{ tool: 'eat_food', args: { food_name: last } }], note: `${last} was all you had: it may give Hunger for a while (food drains faster), but it adds food${(ctx.health ?? 20) <= 14 ? ' toward 18, where health comes back' : ''}; cooked meat is better` };
        if (last) return refuse(`no safe food in your inventory: ${last} may give Hunger, so eat takes it only at food ${EMERGENCY_AT} or less, or when hurt below food 18 (now food ${ctx.food}); kill a cow, pig or sheep and cook the meat`, 'NEED_ITEMS');
        return refuse('no safe food in your inventory; kill a cow, pig or sheep and cook the meat', 'NEED_ITEMS');
      }
      return { calls: [{ tool: 'eat_food', args: { food_name: food } }] };
    }
    case 'say': return { calls: [{ tool: 'send_message', args: { message: args.text } }] };
    case 'equip': return { calls: [{ tool: 'equip', args: { items: [{ item_name: args.item, ...(args.to ? { destination: args.to } : {}) }] } }] };
    case 'hunt': {
      // a drop the game has no item for, or one this mob does not drop: refused before a hunt (F12 of the log hunt:
      // "raw_chicken" hunted for nothing, and the reply never said "chicken")
      const known = HUNT_DROPS[args.mob] ?? [];
      if (!reg.itemsByName[args.drop]) return refuse(`there is no item named ${args.drop}${known.length ? `; a ${args.mob} drops ${known.join(' or ')}` : ''}`, 'BAD_ARGS');
      if (known.length && !known.includes(args.drop) && !/_wool$/.test(args.drop)) return refuse(`a ${args.mob} does not drop ${args.drop}; it drops ${known.join(' or ')}`, 'BAD_ARGS');
      return { calls: [{ tool: 'collect_mob_drop', args: { mob_name: args.mob, drop_name: args.drop, count: args.n, ...(args.without_shield ? { allow_without_shield: true } : {}) } }] };
    }
    case 'sleep': return { calls: [{ tool: 'sleep', args: {} }] };
    case 'bucket': {
      if (args.action === 'pour') {
        // the world is shared: no lava for anyone, nothing where new players land, nothing onto another player
        if (!args.pos) return refuse('pour needs pos: the cell to pour into', 'BAD_ARGS');
        if (args.liquid === 'lava') return refuse('lava is never poured on this shared server (filling a bucket with lava is fine); pour water', 'LAVA');
        if (ctx.spawn && Math.hypot(args.pos.x - ctx.spawn.x, args.pos.z - ctx.spawn.z) <= SPAWN_GUARD) return refuse(`nothing is poured within ${SPAWN_GUARD} blocks of the world spawn (about ${Math.round(ctx.spawn.x)} ${Math.round(ctx.spawn.z)}), where new players arrive`, 'BAD_ARGS');
        if ((ctx.players ?? []).some((p) => p?.position && dist(p.position, args.pos) <= PLAYER_GUARD)) return refuse(`another player is within ${PLAYER_GUARD} blocks of ${at(args.pos)}: pour somewhere else`);
      }
      return { calls: [{ tool: 'use_bucket', args: { action: args.action, liquid: args.liquid ?? 'water', ...(args.pos ? { x: args.pos.x, y: args.pos.y, z: args.pos.z } : {}) } }] };
    }
    case 'chest': {
      if (args.action !== 'inspect' && !args.items) return refuse(`${args.action} needs items: which items and how many`, 'BAD_ARGS');
      const owner = ctx.containerOwner?.(args.pos) ?? null;
      if (owner && owner !== ctx.gameId) return refuse(`the chest at ${at(args.pos)} was put down by another player's bot: use your own chests, or ones nobody put down`, 'BAD_ARGS');
      return { calls: [{ tool: 'use_container', args: { operation: args.action, x: args.pos.x, y: args.pos.y, z: args.pos.z, ...(args.action !== 'inspect' ? { items: args.items.map(({ item, n }) => ({ item_name: item, count: n })) } : {}) } }] };
    }
    case 'explore': return { calls: [{ tool: 'explore_frontier', args: { heading: args.heading, chunks: args.chunks ?? 1, ...(args.biome ? { biome: args.biome } : {}) } }] };
    case 'armor': return { local: 'armor', calls: [] };
    case 'shelter': return { local: 'care', kind: 'shelter', calls: [] };
    case 'portal': {
      const here = ctx.dimension ?? 'overworld';
      // the frame the last build nether_portal made, in this dimension only; the portal it came out of here (the way back)
      const own = ctx.portal && (ctx.portal.dimension ?? 'overworld') === here ? ctx.portal : null;
      const arrival = ctx.arrival && ctx.arrival.dimension === here ? ctx.arrival : null;
      if (args.action === 'dismantle') {
        // the obsidian of its own frame back, cell by cell at exact places (never anyone else's: the review of M8a)
        if (!own?.cells?.length) return refuse('no frame of yours here to take back (portal dismantle takes back the obsidian of your last build nether_portal, in this dimension)', 'BAD_ARGS');
        return {
          calls: own.cells.map((c) => ({ tool: 'collect_block', args: { block_name: 'obsidian', x: c.x, y: c.y, z: c.z }, optional: true })),
          timeoutMs: Math.min(900_000, 60_000 + 20_000 * own.cells.length), dismantle: true,
        };
      }
      const p = args.pos ?? (args.action === 'light' ? own?.frame ?? arrival?.pos : own?.inside ?? arrival?.pos) ?? null;
      if (!p) {
        return refuse(here === 'overworld'
          ? 'portal needs pos (a frame block or an inside cell), or build nether_portal from obsidian first'
          : `portal needs pos here: no portal of yours is known in the ${here.replace(/^the_/, '')} (get_state lists nether_portal blocks near by)`, 'BAD_ARGS');
      }
      if (args.action === 'light') {
        if (!carries('flint_and_steel')) return refuse('lighting a portal needs flint_and_steel (craft it from 1 iron_ingot and 1 flint; gravel drops flint now and then)', 'NEED_ITEMS');
        const guard = frameGuard(own && dist(own.frame, p) <= 6 ? own.cells : [p], ctx);
        if (guard) return guard;
        return { calls: [{ tool: 'activate_portal', args: { x: p.x, y: p.y, z: p.z } }] };
      }
      // their supply check asks for 16 food and 32 arrows, and no skill here gives arrows: the player decides what to
      // take along (the advice says what is carried), the body never stops at the portal for it
      const enter = { tool: 'enter_nether_portal', args: { x: p.x, y: p.y, z: p.z, allow_low_supplies: true } };
      // just out of the portal it is entering again: out of the opening first (their entry refuses a bot still inside,
      // and waiting inside keeps the cooldown going), a few blocks to one side, else the other; never in front of a
      // fresh frame (the review of M8a)
      const near = (a, b, r) => a && b && Math.hypot(a.x - (b.x + 0.5), a.z - (b.z + 0.5)) <= r && Math.abs(a.y - b.y) <= 3;
      const inside = arrival && near(ctx.position, arrival.pos, 2.5) && dist(p, arrival.pos) <= 4;
      if (!inside) return { calls: [enter] };
      const [first, ...alts] = [[3, 0], [-3, 0], [0, 3], [0, -3]].map(([dx, dz]) => ({ x: p.x + dx, y: p.y, z: p.z + dz }));
      return { calls: [{ tool: 'navigate', args: first, alts, optional: true, quiet: true }, enter], note: 'stepped out of the portal first' };
    }
    case 'shield': return { local: 'care', kind: 'shield', calls: [] };
    case 'policy': {
      // the care's knobs stay in the gateway (src/mineai/care.js); the rest goes to the runtime's survival policy
      const knobs = Object.fromEntries([...Object.keys(CARE_KNOBS), 'eat_below'].filter((k) => args[k] !== undefined).map((k) => [k, args[k]]));
      const theirs = ['retreat_health', 'fight', 'raw_food'].some((k) => args[k] !== undefined);
      const care = Object.keys(knobs).length ? knobs : theirs ? null : 'reset';
      if (!theirs && care !== 'reset') return { calls: [], care };
      if (!ctx.policyRevision) return refuse('the body has not read its policy yet; try again in a moment');
      const combat = {
        ...(args.retreat_health !== undefined ? { critical_health: args.retreat_health } : {}),
        ...(args.fight ? { engagement: args.fight } : {}),
      };
      const changes = { ...(Object.keys(combat).length ? { combat } : {}), ...(args.raw_food ? { food: { raw: { allow: args.raw_food } } } : {}) };
      const base = { expected_revision: ctx.policyRevision, reason: 'Set by the player through the policy skill.' };
      if (!Object.keys(changes).length) return { calls: [{ tool: 'set_survival_policy', args: { ...base, operation: 'reset' } }], care: 'reset' };
      return { calls: [{ tool: 'set_survival_policy', args: { ...base, operation: 'set', changes, lifetime: { kind: 'session' } } }], ...(care ? { care } : {}) };
    }
    case 'pick_up': {
      const pick = { tool: 'pick_up_items', args: { ...(args.item ? { item: args.item } : {}), ...(args.death_items ? { recover_death_items: true } : {}) } };
      // a death's items: walk to the death spot first (their pickup did not reach one underground within its 90 s: a
      // production game, 2026-10-12, g0793f1), with time for the walk
      const d = args.death_items ? ctx.lastDeath : null;
      const here = String(ctx.dimension ?? 'overworld');
      if (d?.position && ctx.position && String(d.dimension ?? 'overworld').replace(/^minecraft:/, '') === here) {
        const at = { x: Math.floor(d.position.x), y: Math.floor(d.position.y), z: Math.floor(d.position.z) };
        const far = dist(ctx.position, at);
        if (far > 4 && far <= (ctx.maxTravel ?? 256)) {
          return { calls: [{ tool: 'navigate', args: at, optional: true, quiet: true }, pick], timeoutMs: Math.min(300_000, 90_000 + 1_000 * Math.round(far)) };
        }
      }
      return { calls: [pick] };
    }
    // the item in hand may go too (the body holds whatever it last used); worn armor and the off-hand never do
    case 'drop': {
      if (args.junk) {
        const items = junkOf(inv);
        if (!items.length) return refuse('nothing to drop as junk: your inventory holds none beyond its reserve', 'BAD_ARGS');
        return { calls: [{ tool: 'drop_item', args: { items: items.map(({ item, n }) => ({ item_name: item, count: n })) } }] };
      }
      if (!args.item || !args.n) return refuse('drop needs item and n, or junk: true', 'BAD_ARGS');
      return { calls: [{ tool: 'drop_item', args: { items: [{ item_name: args.item, count: args.n }], allow_equipped: true } }] };
    }
    default: return refuse(`${skill} is not a skill of this body`, 'BAD_ARGS');
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Their results -> ours

// eslint-disable-next-line no-control-regex
const clean = (v, max = 400) => String(v ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const xyz = (p) => (p && Number.isFinite(p.x) ? `${Math.floor(p.x)} ${Math.floor(p.y)} ${Math.floor(p.z)}` : '');

/**
 * Text cut to max characters for a reply, never mid-word or with a bracket left open: cut at the last clause or word
 * boundary, "..." to show it was cut, and any bracket the kept part opened closed again. The Muse re-test's third
 * build reply was cut 400 characters in, in the middle of "search" ("-178,64,58: sea"), and its parenthesis never
 * closed, so "sea" read as water.
 */
export function cut(text, max = 400) {
  const t = clean(text, 100_000);
  if (t.length <= max) return t;
  let head = t.slice(0, max - 8);
  const boundary = Math.max(head.lastIndexOf('; '), head.lastIndexOf(', '), head.lastIndexOf(' '));
  if (boundary > max * 0.6) head = head.slice(0, boundary);
  head = head.replace(/[\s;,:(\[]+$/, '');
  const closers = [];
  for (const ch of head) {
    if (ch === '(' || ch === '[') closers.push(ch === '(' ? ')' : ']');
    else if ((ch === ')' || ch === ']') && closers.at(-1) === ch) closers.pop();
  }
  return `${head} ...${closers.reverse().join('')}`;
}

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const cellsAt = (named) => named.map((c) => `${c.x},${c.y},${c.z}`).join('; ');

/**
 * Why the cells of a build still wrong were left, in plain words from their audit's groups (reason, count, named
 * cells with the block in the way or what refused them): "could not reach 2 cells (-178,61,55; -178,62,53): 3 places
 * to stand tried: path search gave up after 5 s".
 */
function describeLeft(st) {
  const parts = [];
  for (const g of st.left ?? []) {
    const named = g.named ?? [];
    const more = g.count > named.length ? `, and ${g.count - named.length} more` : '';
    const where = named.length ? ` (${cellsAt(named)}${more})` : '';
    const details = [...new Set(named.map((c) => c.detail).filter(Boolean))];
    const why = details.length ? `: ${cut(details[0], 120)}${details.length > 1 ? ' (and other reasons)' : ''}` : '';
    switch (g.reason) {
      case 'unreachable': parts.push(`could not reach ${plural(g.count, 'cell')}${where}${why}`); break;
      case 'refused': parts.push(`${plural(g.count, 'cell')} refused${where}${why}`); break;
      case 'holds_another_block': parts.push(`${plural(g.count, 'cell')} ${g.count === 1 ? 'holds' : 'hold'} another block (${named.map((c) => `${c.holds ?? 'a block'} at ${c.x},${c.y},${c.z}`).join('; ')}${more})`); break;
      case 'nothing_to_place_against': parts.push(`${plural(g.count, 'cell')} ${g.count === 1 ? 'has' : 'have'} nothing solid to place against${where}`); break;
      case 'block_not_carried': parts.push(`${plural(g.count, 'cell')} need${g.count === 1 ? 's' : ''} a block you do not carry${where}`); break;
      case 'would_seal_bot_in': parts.push(`${plural(g.count, 'cell')} would seal you in where you stand${where}`); break;
      case 'bot_stands_in_it': parts.push(`${plural(g.count, 'cell')} ${g.count === 1 ? 'is' : 'are'} where you stand${where}`); break;
      case 'not_loaded': parts.push(`${plural(g.count, 'cell')} ${g.count === 1 ? 'is' : 'are'} not loaded${where}`); break;
      default: parts.push(`${plural(g.count, 'cell')} ${g.count === 1 ? 'was' : 'were'} still to do when the build stopped${where}`);
    }
  }
  const missing = (st.missing ?? []).map((m) => `${m.count} ${m.block}`).join(', ');
  if (missing) parts.push(`short of ${missing}`);
  return parts.join('; ');
}

/**
 * Why a build stopped before every cell was done, in a few words: a tool that wore out ("[TOOL_TIER_LOST]
 * wooden_pickaxe was lost at ...; no pickaxe remains."), or their stop reason. Staging's first build with a wooden
 * pickaxe stopped so, and the reply named 22 cells holding stone without saying why they were not dug.
 */
function buildStop(code, text) {
  const lost = /^(\w+) was lost at [^;]*; (.*?)\.?$/.exec(text);
  if (code === 'TOOL_TIER_LOST' && lost) return `your ${lost[1]} wore out (${lost[2]}); carry a better tool and build again to continue it`;
  return cut(text.replace(/^The build stopped: /, '').replace(/\.$/, ''), 160);
}

/** What a build did besides the blueprint's own blocks: solid ground kept, water left, blocks put under walls. */
function buildNotes(st) {
  const notes = [];
  const kept = st.kept ?? [];
  const keptN = kept.reduce((n, k) => n + k.count, 0);
  if (keptN) notes.push(`${plural(keptN, 'cell')} kept the ${kept.map((k) => k.block).join(' and ')} already there (solid, and it could not be dug out)`);
  if (st.water) notes.push(`${plural(st.water, 'cell')} to clear ${st.water === 1 ? 'is' : 'are'} water (water cannot be dug)`);
  const supports = (st.supports ?? []).map((sp) => `${sp.count} ${sp.block}`);
  if (supports.length) notes.push(`put ${supports.join(' and ')} under walls that had nothing to place against`);
  return notes;
}

/** Their error codes -> our typed codes (the first match wins; anything else is FAILED). */
const CODE_RULES = [
  ['DIED', /(^|_)DIED$/],
  ['HOSTILE_CONTACT', /^(HOSTILE_CONTACT|HOSTILE_SETTLED|HUNT_DEFENCE_REQUIRED|COMBAT_CONSTRAINED|COMBAT_COVER_UNAVAILABLE|CREEPY)$/],
  ['RETREATED_LOW_HEALTH', /^HUNT_TOO_HURT$/],
  ['INVENTORY_FULL', /^INVENTORY_FULL$/],
  ['NEED_ITEMS', /_MISSING$|^MISSING_|_NOT_CARRIED$|^CRAFTING_TABLE_REQUIRED$|^BED_NOT_FOUND$|^SMELT_FUEL_STARVED$|^HUNT_NO_SHIELD$|^TOOL_TIER_LOST$|^TARGET_UNMINEABLE$|^FURNACE_NOT_PRESENT$|_SHORTFALL$|^PORTAL_NO_FLINT_AND_STEEL$|^PORTAL_LOW_SUPPLIES$|^EAT_FOOD_MISSING$/],
  ['BAD_ARGS', /^(INVALID_ARGUMENTS|UNKNOWN_[A-Z_]+|PLACE_UNKNOWN_BLOCK|BUILD_UNKNOWN_BLOCK|VIEW_UNKNOWN_BLOCK|ITEMS_NOT_CRAFTABLE|EXPLORATION_UNKNOWN_BIOME)$/],
];
/** Our code for one of theirs (null for none). */
export function codeFor(theirs) {
  if (!theirs) return null;
  for (const [code, re] of CODE_RULES) if (re.test(theirs)) return code;
  return 'FAILED';
}

/** "[CRAFT_MATERIALS_MISSING] text" -> {code: 'CRAFT_MATERIALS_MISSING', text}. */
export function splitError(error) {
  const m = /^\s*\[([A-Z][A-Z0-9_]+)\]\s*(.*)$/s.exec(String(error ?? ''));
  return m ? { code: m[1], text: m[2] } : { code: null, text: String(error ?? '') };
}

/** What a block drops when that is another item (stone -> cobblestone, iron_ore -> raw_iron), else null. */
export function dropOf(block) {
  const def = reg.blocksByName[block];
  const ids = (def?.drops ?? []).map((d) => (typeof d === 'number' ? d : d?.drop?.id ?? d?.drop ?? d?.id));
  const names = ids.map((id) => reg.items[id]?.name).filter(Boolean);
  return names.length && !names.includes(block) ? names[0] : null;
}
/** Blocks whose drop is left to chance (gravel may give flint, leaves and grass often nothing). */
const BY_CHANCE = /^(gravel|short_grass|tall_grass|.*_leaves)$/;

/**
 * What collect_block did, in words that never contradict the counts: their blocksBroken counts only the target blocks
 * their collect broke itself; drops of the same item from blocks dug on the way (or lying there) count toward the gain.
 * Only what the targets cannot have dropped is put on the way: a block of MAX_DROPS gives up to that many (copper ore
 * 2-5 raw copper, clay 4 clay balls), any other one at most one, and a block whose drop is left to chance is not judged.
 */
function describeCollect(c, block) {
  const broken = Number(c.blocksBroken) || 0;
  const gained = Number(c.gained) || 0;
  const drop = dropOf(block);
  const picked = Object.entries(c.gainedByItem ?? {}).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing';
  const mined = broken ? `mined ${broken} ${block}${drop ? ` (${block} drops ${drop})` : ''}` : `mined no ${block} as a target`;
  const most = MAX_DROPS[block] ?? 1;
  const beyond = gained - broken * most; // the least that came from elsewhere
  let more = '';
  if (beyond > 0 && !BY_CHANCE.test(block)) {
    more = !broken ? '; all of them from blocks dug or items picked up on the way'
      : `; ${most > 1 ? 'at least ' : ''}${beyond} of them from blocks dug or items picked up on the way`;
  } else if (most === 1 && broken > gained && !BY_CHANCE.test(block)) {
    // their collect stops picking up once it has what was asked: the drops of blocks it broke past that stay behind
    more = `; the drops of ${broken - gained} were not picked up`;
  }
  return `${mined} and picked up ${picked} (${gained} of ${c.requested ?? '?'} wanted${more})`;
}

/** The block a build places (its cells name one material, the rest air). */
const materialOf = (args) => (args?.blocks ?? []).find((b) => b.block_name && b.block_name !== 'air')?.block_name ?? null;

/** What a settled action did, in our words: one or two plain sentences. call: our call of theirs ({tool, args}). */
function describe(tool, r, call) {
  // the portal: lit (how many portal blocks), entered (where it arrived)
  if ((tool === 'activate_portal' || tool === 'enter_nether_portal') && r?.status !== 'succeeded') return null;
  if (tool === 'activate_portal' && r?.portal?.kind === 'nether') {
    const p = r.portal;
    return p.activated ? `lit the Nether portal (${p.portalAfter} portal blocks)` : p.portalBefore ? `the portal was already lit (${p.portalAfter} portal blocks)` : 'the portal did not light';
  }
  // F13 of the log hunt: a bucket and a drop said only "done"
  if (tool === 'use_bucket' && r?.status === 'succeeded') {
    const a = call?.args ?? {};
    return a.action === 'pour' ? `poured the ${a.liquid ?? 'water'} at ${a.x} ${a.y} ${a.z}` : `filled a bucket with ${a.liquid ?? 'water'}`;
  }
  if (tool === 'drop_item' && r?.status === 'succeeded' && Array.isArray(call?.args?.items)) {
    return `dropped ${call.args.items.map((i) => `${i.count} ${i.item_name}`).join(', ')}`;
  }
  if (tool === 'enter_nether_portal') {
    const at = r?.navigation?.final ?? r?.navigation?.end ?? null;
    const dim = String(r?.dimension ?? r?.navigation?.dimension ?? '').replace(/^minecraft:/, '');
    return `went through the portal${dim ? ` into the ${dim.replace(/^the_/, '')}` : ''}${at && Number.isFinite(at.x) ? ` at ${xyz(at)}` : ''}`;
  }
  const c = r?.collected;
  if (c) return describeCollect(c, call?.args?.block_name ?? 'blocks');
  if (r?.structure) {
    const st = r.structure;
    const material = materialOf(call?.args) ?? 'blocks';
    const dug = Number(st.dug) || 0;
    const notes = buildNotes(st);
    return `placed ${Number(st.placed) || 0} ${material}${dug ? ` and dug ${dug} cell${dug === 1 ? '' : 's'} clear` : ''} (${Number(st.correct) || 0} of ${Number(st.cells) || 0} cells as the blueprint${notes.length ? `; ${notes.join('; ')}` : ''})`;
  }
  if (r?.craft) {
    const made = (r.craft.items ?? []).map((i) => `${i.gained} ${i.item}`).join(', ');
    const table = r.craft.craftingTablePlaced ? ` at a crafting table put down at ${xyz(r.craft.craftingTablePlaced)}` : '';
    const back = r.workstation?.recovered ? ' (the table was picked up again)' : '';
    return `crafted ${made || 'nothing'}${table}${back}`;
  }
  if (r?.smelt) {
    const s = r.smelt;
    // a smelt that failed before the furnace was loaded: their evidence says requested, but nothing went in
    if (!(Number(s.produced) > 0) && !(Number(s.fuelInserted) > 0)) return `nothing was put into a furnace; your ${s.inputItem} and ${s.fuelItem} are still carried`;
    return `smelted ${s.produced ?? 0} ${s.outputItem ?? 'items'} from ${s.requested} ${s.inputItem} with ${s.fuelItem}${s.furnace ? ` in the furnace at ${xyz(s.furnace)}` : ''}${r.workstation?.recovered ? ' (the furnace was picked up again)' : ''}`;
  }
  if (r?.navigation) {
    const n = r.navigation;
    return `walked to ${xyz(n.end)}${Number.isFinite(n.remainingDistance) && n.remainingDistance > 1.5 ? `, ${Math.round(n.remainingDistance)} blocks short of ${xyz(n.target)}` : ''}`;
  }
  if (r?.hunt) {
    const h = r.hunt;
    return `hunted ${h.mob}: ${h.targetDeathsObserved ?? 0} killed, ${h.gained} ${h.drop} picked up (${h.requested} wanted)`;
  }
  if (r?.eating) return `ate ${r.eating.food}: food ${r.eating.hungerBefore} -> ${r.eating.hungerAfter}`;
  if (r?.placement) return `placed ${r.placement.requestedBlock}${r.placement.position ? ` at ${xyz(r.placement.position)}` : ''}`;
  if (tool === 'send_message') return 'said it in chat';
  if (tool === 'equip' && r?.equip) return 'equipped it';
  return null;
}

/** Did a craft or smelt make everything it was asked for (whatever became of its temporary station)? */
function doneInFull(r) {
  if (r.smelt) return Number(r.smelt.produced) >= Number(r.smelt.requested) && Number(r.smelt.requested) > 0;
  const items = r.craft?.items;
  if (Array.isArray(items) && items.length) return items.every((i) => Number(i.gained) >= Number(i.requested ?? i.count ?? Infinity));
  return false;
}

/**
 * A settled action's output (their {action, durationMs, result, interruptions}) as our SkillResult parts.
 * @param {string} tool their action
 * @param {object} output
 * @param {{stopped?: string|null, call?: {tool: string, args: object}|null}} [opts]  stopped: why we cancelled it (stop, a
 *   timeout); call: the call of theirs it answers (for the block a collect mined, the material a build placed)
 * @returns {{ok: boolean, result: string, code: string|null, theirs: string|null}}
 */
/**
 * Their words where they would mislead a player of ours (F5 of the log hunt: 76 go_to refusals asked for "build:
 * true", an argument our go_to does not have, and never said that y is the feet's height).
 */
export function plainer(tool, text, call = null) {
  let t = String(text ?? '');
  // their path search in plain words, for every skill that walks (ga13a88: "search timed out after 2000 ms compute
  // (limit 2000 ms); no path or usable partial route found; visited 14327 nodes, generated 30134; closest node was
  // -19,62,140", "planning_stalled", "Full air was not observed at the breathing stop")
  const near = (x, y, z) => (x !== undefined ? `; the nearest it got to a way there was ${x} ${y} ${z}` : '');
  t = t.replace(/(?:Pathfinder (?:could not reach the target|stopped): )?search timed out after \d+ ms compute \(limit \d+ ms\); no path or usable partial route found; visited \d+ nodes, generated \d+(?:; closest node was (-?\d+),(-?\d+),(-?\d+))?\.?/g,
    (m, x, y, z) => `no way there was found (the path search gave up)${near(x, y, z)}.`);
  t = t.replace(/no path found after \d+ ms compute; visited \d+ nodes, generated \d+(?:; closest node was (-?\d+),(-?\d+),(-?\d+))?\.?/g,
    (m, x, y, z) => `no way there from where you stand${near(x, y, z)}.`);
  t = t.replace(/(?:Pathfinder could not reach the target: )?planning_stalled: Path planning stalled for \d+ ms without a route commitment or meaningful displacement[^.]*\.(?: Repeated search invalidation does not renew this limit\.*)?/g,
    'the walk there got stuck (no way forward for 20 s).');
  t = t.replace(/(?:Pathfinder stopped: )?Full air was not observed at the breathing stop\./g, 'it stopped to breathe on the way and found no open air there.');
  // g08370a: "Pathfinder stopped: no way there ...-115 6 -23., while replanning after a movement failure: The planned
  // bucket drop did not confirm landing and water recovery.."
  t = t.replace(/\.?,? while replanning after a movement failure: The planned bucket drop did not confirm landing and water recovery\.*/g, ', after a water-bucket drop on the way down did not land as planned.');
  t = t.replace(/\.?,? while replanning after a movement failure: ([^.]*)\.*/g, (m, why) => `, after a move on the way failed (${why.trim().replace(/^./, (c) => c.toLowerCase())}).`);
  t = t.replace(/(^|: )Pathfinder (?:stopped|could not reach the target): /g, '$1').replace(/\.\./g, '.');
  // their fight held back for want of a way to heal (production game g2409ce: "recovery: [COMBAT_CONSTRAINED] Recovery
  // is prohibited or no carried food, sufficient hunger or regeneration effect can restore health.")
  t = t.replace(/(?:recovery: )?(?:\[COMBAT_CONSTRAINED\] )?Recovery is prohibited or no carried food, sufficient hunger or regeneration effect can restore health\.?/i,
    'the body would not start the fight: its health is low and nothing can bring it back up (no food carried, and food under 18, where health comes back): eat or hunt first, or shelter');
  if (tool === 'collect_mob_drop') {
    // the mobs ran out near the bot (a big hunt goal): said plainly, with the way on (no skill breeds animals)
    const mob = String(call?.args?.mob_name ?? 'mob').replace(/_/g, ' ');
    t = t.replace(/No loaded ([a-z_]+) remained after observing ([a-z_]+) (\d+)\/(\d+)\./, (m, mb, drop, got, wanted) => `no ${mb.replace(/_/g, ' ')} left near you (${got} of ${wanted} ${drop} so far): the ones around here are gone; explore 1 to 3 chunks (explore {heading, chunks}) to reach land with more, then hunt again`);
    t = t.replace(/No loaded quarry or requested inventory gain was observed (before the requested observation window ended|within the requested wait at the spawner)\./, `no ${mob} came near you: explore 1 to 3 chunks (explore {heading, chunks}) to find some, then hunt again`);
  }
  if (tool === 'navigate') {
    // their walk's move checks timing out on a busy server (g0842ff): plain words, not their code
    t = t.replace(/repeated_movement_failure:\s*Server confirmation deadline elapsed\.?/i, 'the walk stopped: the server did not confirm its moves in time (a busy moment); send it again');
    const at = /of (-?\d+), (-?\d+), (-?\d+)\./.exec(t);
    const ground = /The ground in that column is at y=(-?\d+)/.exec(t);
    if (/No usable footing was observed/.test(t) && at && ground) {
      t = t.replace(/No usable footing was observed within \d+ blocks? of -?\d+, -?\d+, -?\d+\. The ground in that column is at y=-?\d+\. Choose an observed supported height, or pass build: true to scaffold to this point deliberately\./,
        `nothing to stand on at ${at[1]} ${at[2]} ${at[3]}: y is the height of your feet, one above the ground, and the ground there is at y=${ground[1]}, so go_to ${at[1]} ${Number(ground[1]) + 1} ${at[3]}`);
    }
    t = t.replace(/No usable footing was observed within \d+ blocks? of (-?\d+), (-?\d+), (-?\d+)\. No ground was found within (\d+) blocks below it\.( Choose an observed supported height, or pass build: true to scaffold to this point deliberately\.)?/, 'nothing to stand on at $1 $2 $3, and no ground within $4 blocks below it (open air or a deep drop): pick a point just above the ground');
    t = t.replace(/,? or pass build: true to scaffold to this point deliberately/g, '').replace(/within 1 blocks/g, 'within 1 block');
  }
  return t;
}

/** A failure that is one of their reflexes taking the body over, in plain words, else null. */
export function reflexTakeover(text) {
  const t = String(text ?? '');
  if (/Equip an available shield/i.test(t)) return 'it put a shield in the off-hand with hostile mobs near';
  const m = /\b(fight|evade|hide|deflect|flee|retreat|avoid) response for ([a-z_]+)/i.exec(t);
  if (m) return `${{ fight: 'it fought', evade: 'it got out of the way of', hide: 'it hid from', deflect: 'it blocked', flee: 'it fled from', retreat: 'it fled from', avoid: 'it kept away from' }[m[1].toLowerCase()]} a ${m[2]}`;
  if (/\[BREATH\]|surface at air|air supply/i.test(t)) return 'it swam up for air';
  if (/fire_reflex|\bin (fire|lava)\b.*\b(escape|leave)/i.test(t)) return 'it got out of fire or lava';
  if (/recover_footing|External impulse threatens footing/i.test(t)) return 'it got its footing back';
  return null;
}
/**
 * Their reflexes that acted during a step, in plain words, once each (F11 of the log hunt: raw runtime text with entity
 * ids, coordinates, floats and jargon, the same zombie five times, entries cut mid-word): "it fought a zombie, it hid
 * from a skeleton and 2 more".
 */
export function reflexWords(list = []) {
  const said = [];
  for (const x of list) {
    const t = String(x ?? '').replace(/^\s*\[[A-Z_]+\]\s*/, '');
    const words = reflexTakeover(t) ?? (/fall|footing|water placement/i.test(t) ? 'it saved itself from a fall' : /eat|food/i.test(t) ? 'it ate' : null);
    if (words && !said.includes(words)) said.push(words);
  }
  if (!said.length && list.length) said.push('one of its reflexes acted');
  return said.length > 3 ? `${said.slice(0, 3).join(', ')} and ${said.length - 3} more` : said.join(', ');
}

/** What a call did so far, in words (their evidence), or null: what a reply leads with when a reflex cut it short. */
export function doneSoFar(tool, output, call) {
  try { return describe(tool, output?.result ?? {}, call); } catch { return null; }
}

export function fromTheirs(tool, output, { stopped = null, call = null } = {}) {
  const r = output?.result ?? {};
  const status = String(r.status ?? 'failed');
  const { code: theirs, text: raw } = splitError(r.error);
  const text = plainer(tool, raw, call);
  const said = describe(tool, r, call);
  const extra = (output?.interruptions ?? []).length ? ` [meanwhile on its own: ${reflexWords(output.interruptions)}]` : '';
  if (status === 'succeeded') return { ok: true, result: `${said ?? 'done'}${extra}`, code: null, theirs: null };
  if (status === 'cancelled' && stopped) return { ok: false, result: `stopped: ${stopped}${said ? `; ${said}` : ''}${extra}`, code: /timed out after/.test(stopped) ? 'TIMED_OUT' : 'STOPPED', theirs };
  // a walk that ended within 2 blocks of its target (a target next to lava, in a wall) is as near as a path goes: done
  // (ga13a88: "walked to -6 -22 150, 2 blocks short of -5 -22 152" was a failure, and the obsidian was mined from there)
  const nav = tool === 'navigate' ? r.navigation : null;
  if (nav && Number.isFinite(nav.remainingDistance) && nav.remainingDistance <= 2.5 && status !== 'cancelled') return { ok: true, result: `${said} (as near as a path goes)${extra}`, code: null, theirs };
  // the craft or smelt was done in full and only the table or furnace put down for it was not picked up again (their
  // WORKSTATION_NOT_RECOVERED, e.g. no path back to it): the step did what was asked, so it is ok (sending it again
  // would craft or smelt twice); the station stays where it was, as our own body leaves its stations, and the result
  // says so
  if (status === 'partial' && theirs === 'WORKSTATION_NOT_RECOVERED' && r.workstation && !r.workstation.recovered && doneInFull(r)) {
    const w = r.workstation;
    return { ok: true, result: `${said ?? 'done'}; the ${w.block} put down at ${xyz(w.position)} could not be picked up again (it stays there, or lies there as an item)${extra}`, code: null, theirs };
  }
  // a build says which cells it could not do and why, from its audit, never its whole error text cut short
  const st = tool === 'build_structure' && r.structure && r.structure.wrong > 0 ? r.structure : null;
  const why = st
    ? cut(`${Number(st.cells) - Number(st.wrong)} of ${st.cells} cells done; ${describeLeft(st) || 'some cells are still wrong'}${theirs && theirs !== 'BUILD_INCOMPLETE' ? `; the build stopped: ${buildStop(theirs, text)}` : ''}`, 600)
    : cut(text || (status === 'partial' ? 'only part of it was done' : 'it did not work'));
  // a failure their code does not type, but whose words say something is not carried, is NEED_ITEMS
  let code = codeFor(theirs) ?? 'FAILED';
  if (code === 'FAILED' && /\b(does not carry|not carried|no \w+ carried|short of \d+)\b/i.test(why)) code = 'NEED_ITEMS';
  // lava in the way (a target next to lava it cannot close off, a route through it): a plain code of its own
  if (code === 'FAILED' && /\blava\b/i.test(why)) code = 'LAVA';
  // no room for what a craft, smelt or pickup makes (a local run: a full inventory of gravel stopped flint_and_steel)
  if (code === 'FAILED' && /\binventory room\b|\binventory is full\b|\bno (free|empty) (inventory )?slot/i.test(why)) code = 'INVENTORY_FULL';
  if (code === 'INVENTORY_FULL') return { ok: false, result: `failed: ${why}${said ? ` (${said})` : ''}${extra}; your inventory is full: drop {"junk": true} drops the stacks no skill uses in one go`, code, theirs };
  // partial counts as failed: the steps queued after it were planned on all of it
  return { ok: false, result: `${status === 'partial' ? 'only partly done' : 'failed'}: ${why}${said ? ` (${said})` : ''}${extra}`, code, theirs };
}

const addTo = (o, k, n) => { if (k && Number.isFinite(n) && n) o[k] = (o[k] ?? 0) + n; };
const nonZero = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));

/**
 * What one settled action of theirs itself used (-) and made or collected (+), from its own evidence: a craft's recipe
 * steps, a smelt's input, fuel and output, a collect's or hunt's gain, a build's placed blocks, a meal. The rest of the
 * step's inventory change (src/mineai/body.js measures it from their status before and after) happened on the way:
 * blocks dug through or scaffolding placed by a walk, items lying near a table or furnace picked up with it, the drops
 * of cells a build dug clear. {} when the action itself changes no item (a walk); null when its evidence cannot say
 * (then the reply shows the whole change, as before), or when the whole change is the action's own (drop, pick_up,
 * chest, bucket).
 * @param {string} tool their action
 * @param {object} output their settled output ({action, durationMs, result})
 * @param {{args?: object}} [call] our call of theirs
 * @returns {Record<string, number>|null}
 */
export function ownChange(tool, output, call = {}) {
  const r = output?.result ?? {};
  const own = {};
  // a temporary table or furnace that was not picked up again stays in the world: one fewer carried
  const leftStanding = () => { if (r.workstation && r.workstation.recovered === false) addTo(own, r.workstation.block, -1); };
  switch (tool) {
    case 'navigate': case 'explore_frontier': case 'send_message': case 'equip': case 'sleep': case 'set_survival_policy':
      return {};
    case 'collect_block':
      if (!r.collected) return null;
      for (const [k, v] of Object.entries(r.collected.gainedByItem ?? {})) addTo(own, k, Number(v));
      return nonZero(own);
    case 'collect_mob_drop':
      if (!r.hunt) return null;
      addTo(own, r.hunt.drop, Number(r.hunt.gained));
      return nonZero(own);
    case 'craft_item': {
      const steps = r.craft?.plan?.steps;
      if (!Array.isArray(steps)) return null;
      // every recipe step done, or nothing to split (a craft cut short part-way through a step)
      const done = Number(r.craft.completedSteps);
      if (r.status !== 'succeeded' && done !== steps.length) return null;
      // a table their craft made and put down itself (no table carried or in reach) is outside the plan's steps
      if (r.craft.craftingTablePlaced && !r.workstation) return null;
      for (const st of steps) {
        addTo(own, st.item, Number(st.count));
        for (const i of st.ingredients ?? []) addTo(own, i.item, -Number(i.count));
      }
      leftStanding();
      return nonZero(own);
    }
    case 'smelt_item': {
      const sm = r.smelt;
      if (!sm) return null;
      const inserted = Number(sm.fuelInserted) || 0;
      const produced = Number(sm.produced) || 0;
      // a smelt that failed before the furnace was loaded (no furnace put down, one that held items, the walk to it
      // stopped, input or fuel short) sends the same evidence with requested as asked and nothing inserted, produced
      // or recovered: it used nothing
      if (inserted === 0 && produced === 0) { leftStanding(); return nonZero(own); }
      addTo(own, sm.inputItem, -Math.max(0, (Number(sm.requested) || 0) - (Number(sm.rawRecovered) || 0)));
      addTo(own, sm.fuelItem, -Math.max(0, inserted - (Number(sm.fuelRecovered) || 0)));
      addTo(own, sm.outputItem, produced);
      leftStanding();
      return nonZero(own);
    }
    case 'eat_food':
      if (!r.eating) return null;
      addTo(own, r.eating.food, -(Number(r.eating.inventoryBefore) - Number(r.eating.inventoryAfter)));
      return nonZero(own);
    case 'place_block':
      if (r.status !== 'succeeded') return null;
      addTo(own, call?.args?.block_name, -1);
      return nonZero(own);
    case 'build_structure': {
      if (!r.structure) return null;
      const material = materialOf(call?.args);
      if (!material) return null;
      addTo(own, material, -Number(r.structure.placed));
      // blocks put under walls that had nothing to place against (patch 0011): used by the step too
      for (const sp of r.structure.supports ?? []) addTo(own, sp.block, -Number(sp.count));
      return nonZero(own);
    }
    default:
      return null;
  }
}

/** The arguments schema of a skill this body runs (the 10, craft_batch and the extras). */
export const schemaOf = (skill) => MINEAI_SKILLS.schemas[skill] ?? SCHEMAS[skill];
