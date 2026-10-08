// src/skills/progression/index.js - the progression skills (M8: diamonds, buckets, obsidian, a Nether portal and the
// trip through it, with the M4 survival basics they need), as tool definitions in the same shape as the DEFS of
// contracts.js ([name, description, parameters]), their time limits, and the implementations. Registering them is a
// separate change to contracts.js and skills/index.js (see PROGRESSION_REPORT.md): until then nothing here is
// reachable from the model.

import { equipGear, holeUpSkill } from './survive.js';
import { digStairs, mineDiamonds, DIAMOND_Y } from './mining.js';
import { bucket, makeObsidian } from './bucket.js';
import { getFlint, buildPortal, usePortal } from './portal.js';

const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const int = (description, minimum, maximum) => ({ type: 'integer', description, minimum, maximum });
const pick = (description, list) => ({ type: 'string', description, enum: [...list] });

export const BUCKET_ACTIONS = Object.freeze(['fill_water', 'fill_lava', 'pour_water']);

/** [name, description, parameters] for each progression tool, like DEFS in contracts.js. */
export const PROGRESSION_DEFS = Object.freeze([
  ['equip_gear',
    'Put on the best armor you carry (helmet, chestplate, leggings, boots) and a shield in your off hand.',
    obj({})],
  ['hole_up',
    'Wall yourself in where you stand (blocks on every side and above, from cobblestone, dirt or deepslate you carry) and wait there to heal, eating when hungry: when health is low, a mob is chasing you or the night is dangerous. Dig out with go_to afterwards.',
    obj({ seconds: int('how long to wait at most, 10 to 120', 10, 120) })],
  ['dig_stairs',
    `Dig a staircase down (or up) to height y, three blocks a step, never straight down: every block is checked for lava and water first and the stairs turn away from them; gaps in the floor are filled with blocks you carry. Torches are placed every 8 steps if you have them. Diamonds are best at y ${DIAMOND_Y}.`,
    obj({ y: int('target height (feet), -62 to 120', -62, 120) })],
  ['mine_diamonds',
    `Go down to y ${DIAMOND_Y} by stairs (if higher), then tunnel to the nearest diamond ore within 24 blocks (or branch-mine until one is in range) and mine until you have n more diamonds. Never digs into or next to lava (it covers lava touching an ore with a block, or skips the ore); fights mobs that come close, eats when hungry and walls itself in when health is low. Needs an iron pickaxe; carry cobblestone, food and torches. Minutes.`,
    obj({ n: int('diamonds wanted, 1 to 16', 1, 16) })],
  ['bucket',
    'Use a bucket: fill_water or fill_lava fills an empty bucket from the nearest still water or lava with air above it (within 32 blocks); pour_water pours your water bucket where you stand (breaks a fall, puts out fire).',
    obj({ action: pick('what to do', BUCKET_ACTIONS) })],
  ['make_obsidian',
    'Mine n obsidian nearby with a diamond pickaxe (about 9 s a block). When there is not enough, pours your water bucket over still lava from a dry shore spot (turning the lava under it to obsidian) and scoops the water up again. Never mines obsidian with lava beside it or nothing under it.',
    obj({ n: int('obsidian wanted, 1 to 14', 1, 14) })],
  ['get_flint',
    'Mine gravel (from your inventory, or the nearest gravel within 32 blocks) until n flint have dropped; each gravel block is put down and mined again until it drops flint.',
    obj({ n: int('flint wanted, 1 to 4', 1, 4) })],
  ['build_portal',
    'Build a Nether portal (4 wide, 5 tall: 10 obsidian, the 4 corners from cobblestone or another plain block) on the best spot within 5 blocks, clearing it first (lava checked), and light it with flint and steel (crafted from an iron ingot and a flint if needed).',
    obj({})],
  ['use_portal',
    'Walk into the nearest lit Nether portal (within 24 blocks), wait until you arrive in the other dimension, then step out of the portal on that side. Use it again to come back.',
    obj({})],
]);

export const PROGRESSION_TOOL_NAMES = Object.freeze(PROGRESSION_DEFS.map(([name]) => name));

/** Upper bound on each skill's run time (the body cancels it after that). */
export const PROGRESSION_TIMEOUTS_MS = Object.freeze({
  equip_gear: 15_000, hole_up: 150_000, dig_stairs: 600_000, mine_diamonds: 900_000, bucket: 60_000,
  make_obsidian: 600_000, get_flint: 180_000, build_portal: 300_000, use_portal: 120_000,
});

/** name -> (ctx, args) => Promise<{ok, result}>. */
export const PROGRESSION_SKILLS = Object.freeze({
  equip_gear: (ctx) => equipGear(ctx),
  hole_up: holeUpSkill,
  dig_stairs: digStairs,
  mine_diamonds: mineDiamonds,
  bucket,
  make_obsidian: makeObsidian,
  get_flint: getFlint,
  build_portal: (ctx) => buildPortal(ctx),
  use_portal: (ctx) => usePortal(ctx),
});

/** Items and blocks the whitelists in game.js need for these skills (crafting, placing, collecting). */
export const PROGRESSION_WHITELIST = Object.freeze({
  craft: ['diamond_pickaxe', 'diamond_sword', 'flint_and_steel', 'bucket', 'shield', 'iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'],
  collect: ['diamond_ore', 'deepslate_diamond_ore', 'obsidian', 'gravel'],
  place: ['obsidian', 'cobbled_deepslate', 'netherrack'],
});

for (const name of PROGRESSION_TOOL_NAMES) {
  if (typeof PROGRESSION_SKILLS[name] !== 'function') throw new Error(`progression: no skill for tool "${name}"`);
  if (!(PROGRESSION_TIMEOUTS_MS[name] > 0)) throw new Error(`progression: no time limit for tool "${name}"`);
}
