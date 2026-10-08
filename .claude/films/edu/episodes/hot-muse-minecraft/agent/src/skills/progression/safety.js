// src/skills/progression/safety.js - lava-aware digging for the progression skills. Every block is checked in the
// chunk data before it is broken: never one that holds or touches lava or water, never the block under the bot's
// feet (no digging straight down), and the floor of every step must be solid (a gap is filled with a block first).
// A tunnel step digs at most three blocks: forward (2 high), down a stair (3) or up a stair (3).

import { Vec3 } from '../../mc.js';
import { goals, vec, keyOf, fmt, isSolid, isPassable, countOf, placeAt, digAt, SkillStop } from '../util.js';

export const DIRS = Object.freeze([new Vec3(1, 0, 0), new Vec3(0, 0, 1), new Vec3(-1, 0, 0), new Vec3(0, 0, -1)]);
const SIX = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([x, y, z]) => new Vec3(x, y, z));
const LIQUID = /^(lava|water|bubble_column)$/;
/** Blocks that fall when the block under them is dug. */
const FALLING = /^(gravel|sand|red_sand|suspicious_sand|suspicious_gravel|.*concrete_powder)$/;
/** Never dug by a progression skill: the stations the bot works at, portals and the bottom of the world. */
const NEVER_DIG = /^(bedrock|obsidian|crying_obsidian|nether_portal|end_portal|end_portal_frame|chest|crafting_table|furnace|spawner|.*_bed)$/;
/** Blocks the bot may put down to fill a gap or wall itself in, in order of preference. */
export const FILLERS = Object.freeze(['cobblestone', 'cobbled_deepslate', 'dirt', 'netherrack', 'stone', 'deepslate', 'andesite', 'diorite', 'granite', 'tuff']);
/** Standing on these hurts. */
const HOT = /^(magma_block|campfire|soul_campfire|fire|soul_fire|lava|powder_snow|sweet_berry_bush|cactus|pointed_dripstone)$/;

export const isLiquid = (b) => Boolean(b && LIQUID.test(b.name));
export const isLava = (b) => b?.name === 'lava';
export const isWater = (b) => b?.name === 'water' || b?.name === 'bubble_column';
/** A still (source) liquid block: level 0. */
export const isSource = (b) => Boolean(b && Number(b.getProperties?.().level ?? b.metadata) === 0);
export const horiz = (d) => `${d.x === 1 ? 'east' : d.x === -1 ? 'west' : d.z === 1 ? 'south' : 'north'}`;

/** The first filler block the bot carries, or null. */
export function fillerOf(bot) {
  return FILLERS.find((n) => countOf(bot, n) > 0) ?? null;
}

/** Filler blocks carried, all kinds together. */
export function fillerCount(bot) {
  return FILLERS.reduce((n, name) => n + countOf(bot, name), 0);
}

/** The liquid blocks touching pos (its six neighbours), skipping the keys in `ignore`. */
export function liquidAround(bot, pos, ignore = null) {
  const out = [];
  for (const d of SIX) {
    const p = pos.plus(d);
    if (ignore?.has(keyOf(p))) continue;
    const b = bot.blockAt(p);
    if (isLiquid(b)) out.push(b);
  }
  return out;
}

/**
 * Why the block at pos must not be dug (null when it is safe): not loaded, a liquid itself, one that must never be
 * broken, the block under the bot, or one touching lava or water (digging it lets the liquid in). `dug` holds the keys
 * of blocks dug in the same step (open air on purpose, not a danger).
 */
export function digDanger(bot, pos, dug = null) {
  const b = bot.blockAt(pos);
  if (!b) return `${fmt(pos)} is not loaded`;
  if (isLiquid(b)) return `${b.name} at ${fmt(pos)}`;
  if (isPassable(b)) return null; // nothing to dig
  if (NEVER_DIG.test(b.name)) return `${b.name} at ${fmt(pos)} is not to be dug`;
  if (!b.diggable) return `${b.name} at ${fmt(pos)} cannot be dug`;
  const under = vec(bot.entity.position).offset(0, -1, 0);
  if (vec(pos).equals(under)) return `${fmt(pos)} is the block under your feet`;
  const wet = liquidAround(bot, vec(pos), dug);
  if (wet.length) return `${wet[0].name} next to ${fmt(pos)}`;
  // a falling block above lets whatever is above it in too: check one more block up
  const above = bot.blockAt(vec(pos).offset(0, 1, 0));
  if (above && FALLING.test(above.name) && isLiquid(bot.blockAt(vec(pos).offset(0, 2, 0)))) return `liquid above the ${above.name} over ${fmt(pos)}`;
  return null;
}

/** The cells a stair or tunnel step digs, and where the bot stands afterwards. dy is -1 (down), 0 or 1 (up). */
export function stepPlan(feet, d, dy) {
  const f = vec(feet);
  const ahead = f.plus(d);
  if (dy < 0) return { dig: [ahead.offset(0, 1, 0), ahead, ahead.offset(0, -1, 0)], stand: ahead.offset(0, -1, 0) };
  if (dy > 0) return { dig: [f.offset(0, 2, 0), ahead.offset(0, 1, 0), ahead.offset(0, 2, 0)], stand: ahead.offset(0, 1, 0) };
  return { dig: [ahead, ahead.offset(0, 1, 0)], stand: ahead };
}

/** Why a step is unsafe (null when it is safe): every cell checked, then the floor of the new spot. */
export function stepDanger(bot, feet, d, dy) {
  const plan = stepPlan(feet, d, dy);
  const dug = new Set(plan.dig.map(keyOf));
  for (const p of plan.dig) {
    const why = digDanger(bot, p, dug);
    if (why) return why;
  }
  // the bot also stands in these after the step: no liquid may touch its body there
  for (const p of [plan.stand, plan.stand.offset(0, 1, 0)]) {
    const wet = liquidAround(bot, p, dug);
    if (wet.length) return `${wet[0].name} next to ${fmt(p)}`;
  }
  const floor = bot.blockAt(plan.stand.offset(0, -1, 0));
  if (!floor) return `${fmt(plan.stand)} is not loaded`;
  if (isLiquid(floor)) return `${floor.name} under ${fmt(plan.stand)}`;
  if (HOT.test(floor.name)) return `${floor.name} under ${fmt(plan.stand)}`;
  if (!isSolid(floor)) {
    // a gap: it gets filled, but only if nothing below it is a liquid within 3 blocks (a fall into a lava lake)
    for (let k = 2; k <= 4; k++) {
      const b = bot.blockAt(plan.stand.offset(0, -k, 0));
      if (isLiquid(b)) return `${b.name} ${k} blocks under ${fmt(plan.stand)}`;
      if (isSolid(b)) break;
    }
    if (!fillerOf(bot)) return `a gap under ${fmt(plan.stand)} and no block to fill it`;
  }
  return null;
}

/** Dig one block until it stays clear (gravel and sand fall back in). Returns {ok, result}. */
export async function clearCell(ctx, pos, dug) {
  const { bot } = ctx;
  for (let i = 0; i < 8; i++) {
    const b = bot.blockAt(pos);
    if (!b) return { ok: false, result: `${fmt(pos)} is not loaded` };
    if (isPassable(b) && !isLiquid(b)) return { ok: true, result: 'clear' };
    const why = digDanger(bot, pos, dug);
    if (why) return { ok: false, result: why };
    const r = await digAt(ctx, pos);
    if (!r.ok) return r;
    await ctx.wait(bot.waitForTicks(i ? 6 : 2)); // a falling block lands in a few ticks
  }
  return { ok: false, result: `${fmt(pos)} keeps filling up (falling gravel or sand)` };
}

/**
 * Walk one step onto a cleared spot (the cells were already dug): pathfinder for the short move, with a limit.
 * Throws when the bot ends elsewhere.
 */
export async function stepTo(ctx, stand) {
  const { bot } = ctx;
  try {
    await ctx.goto(new goals.GoalBlock(stand.x, stand.y, stand.z), { timeoutMs: 8_000 });
  } catch (err) {
    if (err instanceof SkillStop) throw err;
  }
  const at = vec(bot.entity.position);
  if (!at.equals(stand)) throw new Error(`could not step to ${fmt(stand)} (stopped at ${fmt(at)})`);
}

/**
 * One safe tunnel or stair step in direction d: re-check, fill the floor gap, dig the cells, walk there.
 * @returns {Promise<{ok: boolean, result: string}>}
 */
export async function safeStep(ctx, d, dy) {
  const { bot } = ctx;
  const feet = vec(bot.entity.position);
  const why = stepDanger(bot, feet, d, dy);
  if (why) return { ok: false, result: why };
  const plan = stepPlan(feet, d, dy);
  const dug = new Set(plan.dig.map(keyOf));
  for (const p of plan.dig) {
    const r = await clearCell(ctx, p, dug);
    if (!r.ok) return r;
  }
  const floorPos = plan.stand.offset(0, -1, 0);
  if (!isSolid(bot.blockAt(floorPos))) {
    const name = fillerOf(bot);
    if (!name) return { ok: false, result: `a gap under ${fmt(plan.stand)} and no block to fill it` };
    const r = await placeAt(ctx, name, floorPos, { move: false });
    if (!r.ok) return { ok: false, result: `could not fill the gap under ${fmt(plan.stand)}: ${r.result}` };
  }
  await stepTo(ctx, plan.stand);
  return { ok: true, result: `stepped ${horiz(d)}${dy < 0 ? ' down' : dy > 0 ? ' up' : ''} to ${fmt(plan.stand)}` };
}

/** Headings to try, the preferred one first, then the two sideways ones, then back. */
export function headingsFrom(d) {
  const i = Math.max(0, DIRS.findIndex((x) => x.equals(d)));
  return [DIRS[i], DIRS[(i + 1) % 4], DIRS[(i + 3) % 4], DIRS[(i + 2) % 4]];
}

/** The horizontal heading the bot faces (yaw 0 = north / -z in mineflayer). */
export function facing(bot) {
  const yaw = bot.entity?.yaw ?? 0;
  const x = -Math.sin(yaw);
  const z = -Math.cos(yaw);
  if (Math.abs(x) > Math.abs(z)) return DIRS[x > 0 ? 0 : 2];
  return DIRS[z > 0 ? 1 : 3];
}
