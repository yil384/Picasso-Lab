// src/skills/util.js - what the skills share: results, item counts, block tests, readable errors, walking, equipping,
// finding a place to stand, placing or digging one block, and mining one block with a bounded pickup of its drops.
// The placement rules (replaceable targets, a solid face to build off, step aside when the bot is in the way, walk
// closer when out of reach) follow the placeBlock skill of Mindcraft (github.com/mindcraft-bots/mindcraft, MIT
// License), rewritten for this body.

import pf from 'mineflayer-pathfinder';
import { Vec3 } from '../mc.js';

export const { goals } = pf;

/** How far from the eyes the bot works on a block (survival interaction range is 4.5). */
export const REACH = 4.25;
/** Ticks to wait after a dig for its drops to appear, and the most time spent walking over them. */
const DROP_TICKS = 10;
const PICKUP_MS = 5_000;

/** Blocks a placed block may replace. */
export const REPLACEABLE = new Set([
  'air', 'cave_air', 'void_air', 'short_grass', 'tall_grass', 'fern', 'large_fern', 'dead_bush', 'water', 'lava',
]);

// Clicking these opens or toggles them instead of building on them.
const INTERACTIVE = /(crafting_table|furnace|smoker|chest|barrel|shulker|door|gate|button|lever|_bed$|anvil|table|hopper|dispenser|dropper|stand|loom|bell|beacon|grindstone|stonecutter|composter|cauldron)/;

// Below first: a block standing on the ground is the most natural placement.
const FACES = [[0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].map(([x, y, z]) => new Vec3(x, y, z));

/** Thrown inside a skill once the run was stopped or timed out; the body turns it into the result. */
export class SkillStop extends Error {
  constructor(reason) { super(`stopped: ${reason}`); this.name = 'SkillStop'; }
}

/** Run fn as one phase of the skill's time (the body's ctx.phase); a plain call where there is none (tests). */
export const timed = (ctx, name, fn) => (typeof ctx?.phase === 'function' ? ctx.phase(name, fn) : fn());

export const done = (result) => ({ ok: true, result });
export const fail = (result) => ({ ok: false, result });

export const vec = (p) => new Vec3(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
export const keyOf = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
export const fmt = (p) => `${Math.floor(p.x)} ${Math.floor(p.y)} ${Math.floor(p.z)}`;
export const centre = (p) => vec(p).offset(0.5, 0.5, 0.5);

export const isSolid = (b) => Boolean(b && b.boundingBox === 'block');
export const isPassable = (b) => Boolean(b && b.boundingBox === 'empty');
export const isReplaceable = (b) => Boolean(b && REPLACEABLE.has(b.name));

/** How many of an item the bot carries. */
export function countOf(bot, name) {
  let n = 0;
  for (const it of bot.inventory.items()) if (it.name === name) n += it.count;
  return n;
}

/** Distance from the bot's eyes to the centre of a block. */
export function eyeDistance(bot, pos) {
  return bot.entity.position.offset(0, 1.62, 0).distanceTo(centre(pos));
}

/** True when the bot's hitbox (0.6 wide, 1.8 tall) overlaps the block at pos. */
export function occupies(bot, pos) {
  const p = bot.entity.position;
  const b = vec(pos);
  const half = 0.3 - 1e-3;
  return p.x + half > b.x && p.x - half < b.x + 1
    && p.z + half > b.z && p.z - half < b.z + 1
    && p.y + 1.8 > b.y && p.y < b.y + 1;
}

// eslint-disable-next-line no-control-regex
const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();

/** A short readable sentence for an error from mineflayer or a plugin. */
export function describeError(err) {
  const name = err?.name;
  if (name === 'NoPath') return 'no path found';
  if (name === 'Timeout') return 'the path search took too long';
  if (name === 'GoalChanged' || name === 'PathStopped') return 'the walk was interrupted';
  if (name === 'WalkTimeout') return 'the walk took too long';
  if (name === 'Stuck') return clean(err.message);
  if (name === 'NoChests') return 'the inventory is full';
  if (name === 'NoItem') return 'no tool that can harvest it';
  const msg = clean(err?.message ?? err);
  return (msg || 'unknown error').slice(0, 200);
}

/** Equip an inventory item in the hand (no-op when it is already held). */
export async function equip(ctx, name) {
  const { bot } = ctx;
  if (bot.heldItem?.name === name) return;
  const item = bot.inventory.items().find((i) => i.name === name);
  if (!item) throw new Error(`you have no ${name}`);
  await ctx.wait(bot.equip(item, 'hand'));
}

/**
 * Walk until the block at pos is within reach (does nothing when it already is). Throws when the walk ends out of
 * reach: pathfinder can settle short of the goal (an empty or partial path) without an error.
 */
export async function walkNear(ctx, pos, range = 2) {
  if (eyeDistance(ctx.bot, pos) <= REACH) return;
  const p = vec(pos);
  await ctx.goto(new goals.GoalNear(p.x, p.y, p.z, range));
  const d = eyeDistance(ctx.bot, pos);
  if (d > REACH + 0.75) throw new Error(`could not get within reach (stopped ${Math.round(d)} blocks away)`);
}

/** A solid, non-interactive neighbour of pos to build off, with the face vector mineflayer's placeBlock wants. */
export function referenceFor(bot, pos, skip = null) {
  const p = vec(pos);
  for (const d of FACES) {
    const at = p.plus(d);
    if (skip && skip.has(keyOf(at))) continue;
    const b = bot.blockAt(at);
    if (isSolid(b) && !INTERACTIVE.test(b.name)) return { block: b, face: new Vec3(-d.x, -d.y, -d.z) };
  }
  return null;
}

/** Block positions where the bot could stand (feet) to work on pos, nearest to the bot first. */
export function standSpots(bot, pos, avoid = null) {
  const p = vec(pos);
  const target = centre(p);
  const out = [];
  for (const dy of [0, -1, 1, -2]) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const feet = p.offset(dx, dy, dz);
        const head = feet.offset(0, 1, 0);
        if (feet.equals(p) || head.equals(p)) continue;
        if (avoid && (avoid.has(keyOf(feet)) || avoid.has(keyOf(head)))) continue;
        if (feet.offset(0.5, 1.62, 0.5).distanceTo(target) > REACH - 0.25) continue;
        if (!isPassable(bot.blockAt(feet)) || !isPassable(bot.blockAt(head)) || !isSolid(bot.blockAt(feet.offset(0, -1, 0)))) continue;
        out.push(feet);
      }
    }
  }
  const from = bot.entity.position;
  return out.sort((a, b) => a.offset(0.5, 0, 0.5).distanceTo(from) - b.offset(0.5, 0, 0.5).distanceTo(from));
}

/**
 * Place one block from the inventory at pos. Walks to a standing spot first when the bot is in the way or out of
 * reach (unless move is false). Never throws for game failures: returns {ok, result}.
 * @param {object} ctx
 * @param {string} name   block item name
 * @param {{x:number,y:number,z:number}} pos
 * @param {{move?: boolean, avoid?: Set<string>}} [opts]  avoid: block keys the bot must not stand in
 */
export async function placeAt(ctx, name, pos, { move = true, avoid = null } = {}) {
  const { bot } = ctx;
  const p = vec(pos);
  try {
    const target = bot.blockAt(p);
    if (!target) return fail(`${fmt(p)} is not loaded`);
    if (!isReplaceable(target)) return fail(`${fmt(p)} already holds ${target.name}`);
    const ref = referenceFor(bot, p);
    if (!ref) return fail(`nothing solid next to ${fmt(p)} to place against`);
    if (countOf(bot, name) < 1) return fail(`you have no ${name}`);
    if (occupies(bot, p) || eyeDistance(bot, p) > REACH) {
      if (!move) return fail(occupies(bot, p) ? `you are standing at ${fmt(p)}` : `${fmt(p)} is out of reach`);
      const [spot] = standSpots(bot, p, avoid);
      if (!spot) return fail(`no place to stand near ${fmt(p)}`);
      await ctx.goto(new goals.GoalBlock(spot.x, spot.y, spot.z));
      if (occupies(bot, p)) return fail(`you are standing at ${fmt(p)}`);
      if (eyeDistance(bot, p) > REACH + 0.75) return fail(`could not get close enough to ${fmt(p)}`);
    }
    await equip(ctx, name);
    await timed(ctx, 'place', () => ctx.wait(bot.placeBlock(ref.block, ref.face)));
    ctx.check();
    const now = bot.blockAt(p);
    if (!now || now.name === target.name) return fail(`${name} did not appear at ${fmt(p)}`);
    return done(`placed ${name} at ${fmt(p)}`);
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    return fail(`could not place ${name} at ${fmt(p)}: ${describeError(err)}`);
  }
}

/**
 * Put a block (a crafting table, a furnace) down right next to the bot, where it can reach it without walking.
 * @returns {Promise<{ok: boolean, result: string, block?: object}>}
 */
export async function placeNearby(ctx, name) {
  const { bot } = ctx;
  const feet = vec(bot.entity.position);
  const spots = [];
  for (const dy of [0, 1, -1]) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (!dx && !dz) continue;
        const p = feet.offset(dx, dy, dz);
        if (!isReplaceable(bot.blockAt(p)) || occupies(bot, p) || eyeDistance(bot, p) > REACH) continue;
        const ref = referenceFor(bot, p);
        if (!ref) continue;
        spots.push({ p, score: Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 2 + (ref.face.y === 1 ? 0 : 3) });
      }
    }
  }
  spots.sort((a, b) => a.score - b.score);
  let last = `no free spot next to you for a ${name}`;
  for (const { p } of spots.slice(0, 3)) {
    const r = await placeAt(ctx, name, p, { move: false });
    if (r.ok) return { ...r, block: bot.blockAt(p) };
    last = r.result;
  }
  // in a tunnel or a cave there may be no air beside the bot: dig one block out of the wall at foot level (never next
  // to water or lava, never one that holds up nothing but air) and put the block there
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const p = feet.offset(dx, 0, dz);
    const b = bot.blockAt(p);
    if (!b || isReplaceable(b) || isPassable(b) || !b.diggable || INTERACTIVE.test(b.name) || nextToLiquid(bot, p)) continue;
    if (!isSolid(bot.blockAt(p.offset(0, -1, 0)))) continue;
    const d = await digAt(ctx, p);
    if (!d.ok) { last = d.result; continue; }
    const r = await placeAt(ctx, name, p, { move: false });
    if (r.ok) return { ...r, result: `${r.result} (dug a spot for it)`, block: bot.blockAt(p) };
    last = r.result;
  }
  return fail(last);
}

/** True when water or lava touches the block at pos (digging it would let the liquid in). */
function nextToLiquid(bot, pos) {
  return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]].some(([x, y, z]) => /water|lava/.test(bot.blockAt(pos.offset(x, y, z))?.name ?? ''));
}

/** Resolves true once the entity is gone (picked up, or despawned), false after ms. */
function entityGone(bot, entity, ms) {
  return new Promise((resolve) => {
    if (!bot.entities[entity.id]) { resolve(true); return; }
    let timer = null;
    const onGone = (e) => { if (e === entity || e?.id === entity.id) finish(true); };
    function finish(value) {
      clearTimeout(timer);
      bot.removeListener('entityGone', onGone);
      resolve(value);
    }
    timer = setTimeout(() => finish(false), ms);
    bot.on('entityGone', onGone);
  });
}

/** Walk over item drops to pick them up: at most `ms` in all, so a drop out of reach never holds up a skill. */
export async function collectDrops(ctx, drops, ms = PICKUP_MS) {
  const { bot } = ctx;
  const until = Date.now() + ms;
  for (const e of drops) {
    const left = until - Date.now();
    if (left <= 0) return;
    if (!bot.entities[e.id] || e.isValid === false || !e.position) continue;
    if (e.position.distanceTo(bot.entity.position) > 1) {
      // stand where the drop lies: next to it is not enough when it fell into the hole the dig left
      const at = vec(e.position);
      try {
        await ctx.goto(new goals.GoalBlock(at.x, at.y, at.z), { timeoutMs: left });
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        try {
          await ctx.goto(new goals.GoalNear(at.x, at.y, at.z, 1), { timeoutMs: Math.max(0, until - Date.now()) });
        } catch (err2) {
          if (err2 instanceof SkillStop) throw err2;
          continue;
        }
      }
    }
    await ctx.wait(entityGone(bot, e, Math.max(0, Math.min(1_000, until - Date.now()))));
  }
}

/** Item entities on the ground within `radius` blocks of the bot, nearest first. */
export function dropsNear(bot, radius = 8) {
  const from = bot.entity.position;
  return Object.values(bot.entities ?? {})
    .filter((e) => e && e !== bot.entity && e.name === 'item' && e.isValid !== false && e.position && e.position.distanceTo(from) <= radius)
    .sort((a, b) => a.position.distanceTo(from) - b.position.distanceTo(from));
}

/**
 * Mine one block where it is and pick up what it drops: walk into reach (by the body's walking rules), equip the best
 * tool, dig, then walk over the drops with a time limit. collectblock's collect() is not used: its pickup waits
 * without a limit for a drop it may never reach. Equipping for harvest and waiting a few ticks for the drops follow
 * Mindcraft's collectBlock skill (github.com/mindcraft-bots/mindcraft, MIT License). Returns {ok, result}.
 */
export async function mineBlock(ctx, block, { walkMs = 0 } = {}) {
  const { bot } = ctx;
  const p = vec(block.position);
  // a block can be within reach but out of sight: let pathfinder settle on a spot that sees it (at once when it does)
  await ctx.goto(new goals.GoalLookAtBlock(p, bot.world, { reach: REACH }), { timeoutMs: walkMs });
  const b = bot.blockAt(p);
  if (!b || b.type !== block.type) return fail(`the ${block.name} at ${fmt(p)} is gone`);
  if (eyeDistance(bot, p) > REACH + 0.75) return fail(`could not get within reach of ${fmt(p)}`);
  if (bot.tool?.equipForBlock) await ctx.wait(bot.tool.equipForBlock(b, { requireHarvest: true }));
  if (b.harvestTools && !(bot.heldItem && b.canHarvest(bot.heldItem.type))) return fail(`no tool that can harvest ${b.name}`);
  const drops = [];
  const middle = p.offset(0.5, 0.5, 0.5);
  const onDrop = (e) => { if (e?.position && e.position.distanceTo(middle) <= 1.5) drops.push(e); };
  bot.on('itemDrop', onDrop);
  try {
    await timed(ctx, 'dig', () => ctx.wait(bot.dig(b)));
    await timed(ctx, 'drop', () => ctx.wait(bot.waitForTicks(DROP_TICKS)));
  } finally {
    bot.removeListener('itemDrop', onDrop);
  }
  await timed(ctx, 'pickup', () => collectDrops(ctx, drops));
  return done(`mined ${b.name} at ${fmt(p)}`);
}

/**
 * Mine a block the bot placed itself (a crafting table, a furnace) to get it back. Best effort, never throws for a
 * game failure: 'back' (in the inventory), 'there' (still standing), 'ground' (mined, but the item was not picked up)
 * or 'gone' (someone else took it).
 * @returns {Promise<'back'|'there'|'ground'|'gone'>}
 */
export async function pickUp(ctx, block) {
  const { bot } = ctx;
  const name = block.name;
  const had = countOf(bot, name);
  try {
    const now = bot.blockAt(block.position);
    if (!now || now.type !== block.type) return 'gone';
    if (now.harvestTools && !bot.inventory.items().some((i) => Object.hasOwn(now.harvestTools, i.type))) return 'there';
    await mineBlock(ctx, now);
    ctx.check();
  } catch (err) {
    if (err instanceof SkillStop) throw err;
  }
  if (bot.blockAt(block.position)?.type === block.type) return 'there';
  return countOf(bot, name) > had ? 'back' : 'ground';
}

/** Dig one block in place (equips the best tool first). Returns {ok, result}. */
export async function digAt(ctx, pos) {
  const { bot } = ctx;
  const p = vec(pos);
  try {
    const b = bot.blockAt(p);
    if (!b || b.name === 'air' || isPassable(b)) return done(`${fmt(p)} is already clear`);
    if (!b.diggable) return fail(`${b.name} at ${fmt(p)} cannot be dug`);
    await walkNear(ctx, p);
    if (bot.tool?.equipForBlock) await ctx.wait(bot.tool.equipForBlock(b, {}));
    await timed(ctx, 'dig', () => ctx.wait(bot.dig(bot.blockAt(p))));
    ctx.check();
    return done(`dug ${b.name} at ${fmt(p)}`);
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    return fail(`could not dig at ${fmt(p)}: ${describeError(err)}`);
  }
}

/** The note for a result after pickUp: " (placed a furnace and took it back)" and so on. */
export function pickUpNote(state, what, pos) {
  if (state === 'back') return ` (placed a ${what} and took it back)`;
  if (state === 'ground') return ` (placed a ${what} and mined it again, but it is still on the ground near ${fmt(pos)})`;
  if (state === 'gone') return ` (placed a ${what}; it is no longer there)`;
  return ` (placed a ${what}; it is still there at ${fmt(pos)})`;
}
