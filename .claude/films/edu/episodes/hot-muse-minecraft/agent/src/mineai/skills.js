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
    'Hunt mobs of one kind until n of a drop came into your inventory (e.g. cow -> beef, sheep -> white_wool, spider -> string, chicken -> feather). Hostile mobs need a shield carried, unless without_shield is true.',
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
    'What the body does on its own for the rest of the game. You make the plans; the body acts by itself only through its reflexes, and each can be switched here: defend (on: fights back or flees when a hostile mob comes for it; off: never strikes, still flees), eat (starving: eats only at food 4 or less, the default; hungry: at food 14 or less; off: never on its own), escape (on: surfaces for air, leaves fire and lava, gets its footing back; off: leaves that to you). In fights: retreat_health, raw_food and fight (respond_to_threats or defend_only). Everything else (shelter at night, a shield, armor, food, spare tools, going back for its items after a death) is yours: each reply\'s "Body advice" says what needs doing and which skill would do it. No arguments: the defaults.',
    obj({
      defend: pick('reflex: fight back or flee when attacked', CARE_KNOBS.defend), eat: pick('reflex: when it eats on its own', CARE_KNOBS.eat), escape: pick('reflex: air, fire, lava, footing', CARE_KNOBS.escape),
      retreat_health: int('health 1 to 19 (default 10)', 1, 19), raw_food: pick('raw meat on its own', RAW_FOOD), fight: pick('fight or only defend', ['respond_to_threats', 'defend_only']),
      night: pick('full mode only: night', CARE_KNOBS.night), armor: pick('full mode only: armor', CARE_KNOBS.armor), food: pick('full mode only: food', CARE_KNOBS.food), tools: pick('full mode only: tools', CARE_KNOBS.tools),
    }, [])],
  ['shelter',
    'Close yourself in for the night where you stand: walls and a roof of the blocks you carry (13 make one), else dug two blocks into the ground, else with dirt collected around. Stays closed until your next step.',
    obj({}, [])],
  ['shield',
    'Make a shield and put it in your off-hand: from 1 iron ingot you carry, else raw iron smelted, else 1 iron ore mined (stone pickaxe) and smelted; planks from your wood. Your fight reflex raises it against arrows.',
    obj({}, [])],
  ['armor',
    'Craft the best armor you can pay for (iron ingots, leather, gold or diamonds) and put it on, with any better piece or shield you carry.',
    obj({}, [])],
  ['pick_up',
    'Pick up items lying within 8 blocks (only item if given); death_items: true walks back to where you died and picks up what you dropped (within 5 minutes).',
    obj({ item: NAME('only this item'), death_items: { type: 'boolean', description: 'true: recover what you dropped when you died' } }, [])],
  ['drop',
    'Throw n of an item on the ground where you stand (to make room in the inventory). Never worn armor.',
    obj({ item: NAME('a carried item'), n: int('how many, 1 to 2304', 1, 2304) })],
]);

/**
 * What some of the 10 skills and craft_batch do on this body, where it differs from ours (src/contracts.js): their
 * searches cover every loaded chunk, a table or furnace you carry is put down for the step and picked up again, a smelt
 * waits for the whole load in one furnace, and fuel goes one kind after another.
 */
export const MINEAI_DESCRIPTIONS = Object.freeze({
  go_to: 'Walk to a block position; the body finds its own way (it may dig, bridge, pillar or swim). The target must be within 256 blocks. Seconds to two minutes; a walk that finds no way ends and says why.',
  collect: 'Mine n blocks of one type and pick up the drops: the body searches every loaded chunk around you (not only the nearest 32 blocks), walks there and uses the best tool you carry. stone drops cobblestone (collect cobblestone mines stone for it); iron_ore drops raw_iron and needs a stone pickaxe or better. The reply says what the step mined and picked up, and apart from that what changed on the way (blocks dug through, scaffolding placed).',
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
  pick_up: 90_000, drop: 30_000, armor: 150_000, shelter: 240_000, shield: 300_000,
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
    cells.push({ x: feet.x + f.dx * a + right.dx * b, y: feet.y + k, z: feet.z + f.dz * a + right.dz * b, block_name: ch === '#' ? material : 'air' });
  })));
  return { cells, facing: f.name };
}

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
      return { calls: [{ tool: 'navigate', args: { x: args.x, y: args.y, z: args.z } }] };
    }
    case 'collect': {
      // cobblestone is what stone drops: their collect would look for cobblestone BLOCKS (dungeon walls, other
      // players' builds, the bot's own scaffolding) and count the stone it digs on the way there (the Muse run on
      // staging: "mined 0 blocks and picked up 12 cobblestone")
      const block = COLLECT_FROM[args.block] ?? args.block;
      const calls = [];
      for (let left = args.n; left > 0; left -= 32) calls.push({ tool: 'collect_block', args: { block_name: block, count: Math.min(32, left) } });
      return { calls };
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
    case 'place': return { calls: [{ tool: 'place_block', args: { block_name: args.block, x: args.pos.x, y: args.pos.y, z: args.pos.z } }] };
    case 'build': {
      if (!ctx.position) return refuse('the body does not know where it stands yet; try again in a moment');
      const feet = { x: Math.floor(ctx.position.x), y: Math.floor(ctx.position.y), z: Math.floor(ctx.position.z) };
      // the structure the last build left incomplete, when this call is the same build near it: the same cells again
      // (the runtime audits them and works only the ones still wrong), never a new one facing the bot's new heading
      const last = ctx.lastBuild ?? null;
      if (continuesLast(last, args, feet)) {
        return { calls: [{ tool: 'build_structure', args: { blocks: last.cells, remove_wrong_blocks: true } }], note: `continued the ${args.blueprint} begun facing ${last.facing} at ${at(last.feet)}`, build: last };
      }
      const { cells, facing } = blueprintCells(args.blueprint, args.material, feet, ctx.heading);
      return { calls: [{ tool: 'build_structure', args: { blocks: cells, remove_wrong_blocks: true } }], note: `built facing ${facing}`, build: { blueprint: args.blueprint, material: args.material, cells, facing, feet } };
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
      if (!food) return refuse('no safe food in your inventory; kill a cow, pig or sheep and cook the meat', 'NEED_ITEMS');
      return { calls: [{ tool: 'eat_food', args: { food_name: food } }] };
    }
    case 'say': return { calls: [{ tool: 'send_message', args: { message: args.text } }] };
    case 'equip': return { calls: [{ tool: 'equip', args: { items: [{ item_name: args.item, ...(args.to ? { destination: args.to } : {}) }] } }] };
    case 'hunt': return { calls: [{ tool: 'collect_mob_drop', args: { mob_name: args.mob, drop_name: args.drop, count: args.n, ...(args.without_shield ? { allow_without_shield: true } : {}) } }] };
    case 'sleep': return { calls: [{ tool: 'sleep', args: {} }] };
    case 'bucket': {
      if (args.action === 'pour') {
        // the world is shared: no lava for anyone, nothing where new players land, nothing onto another player
        if (!args.pos) return refuse('pour needs pos: the cell to pour into', 'BAD_ARGS');
        if (args.liquid === 'lava') return refuse('lava is never poured on this shared server (filling a bucket with lava is fine); pour water', 'BAD_ARGS');
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
    case 'shield': return { local: 'care', kind: 'shield', calls: [] };
    case 'policy': {
      // the care's knobs stay in the gateway (src/mineai/care.js); the rest goes to the runtime's survival policy
      const knobs = Object.fromEntries(Object.keys(CARE_KNOBS).filter((k) => args[k] !== undefined).map((k) => [k, args[k]]));
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
    case 'pick_up': return { calls: [{ tool: 'pick_up_items', args: { ...(args.item ? { item: args.item } : {}), ...(args.death_items ? { recover_death_items: true } : {}) } }] };
    // the item in hand may go too (the body holds whatever it last used); worn armor and the off-hand never do
    case 'drop': return { calls: [{ tool: 'drop_item', args: { items: [{ item_name: args.item, count: args.n }], allow_equipped: true } }] };
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
export function fromTheirs(tool, output, { stopped = null, call = null } = {}) {
  const r = output?.result ?? {};
  const status = String(r.status ?? 'failed');
  const { code: theirs, text } = splitError(r.error);
  const said = describe(tool, r, call);
  const extra = (output?.interruptions ?? []).length ? ` [on its own: ${output.interruptions.map((x) => clean(String(x).replace(/^\s*\[[A-Z_]+\]\s*/, ''), 80)).join(', ')}]` : '';
  if (status === 'succeeded') return { ok: true, result: `${said ?? 'done'}${extra}`, code: null, theirs: null };
  if (status === 'cancelled' && stopped) return { ok: false, result: `stopped: ${stopped}${said ? `; ${said}` : ''}${extra}`, code: /timed out after/.test(stopped) ? 'TIMED_OUT' : 'STOPPED', theirs };
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
