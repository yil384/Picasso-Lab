// src/skills/progression/survive.js - the M4 survival basics the progression skills need on the way: wear the best
// armor and a shield, eat before the food bar runs low, fight back at a mob that comes close, and wall yourself in
// to heal (or to wait out the night) when health is low. guard() is the reflex the long skills call between steps;
// it only reacts and reports, it never changes the goal. Equipping armor slot by slot follows Mindcraft's equip skill
// (github.com/mindcraft-bots/mindcraft, MIT License), rewritten for this body.

import { done, fail, vec, fmt, isPassable, isSolid, placeAt, SkillStop, describeError } from '../util.js';
import { eat } from '../basic.js';
import { attack } from '../attack.js';
import { nearbyMobs } from '../../state.js';
import { ATTACK_TARGETS } from '../../game.js';
import { fillerOf, isLiquid } from './safety.js';

const TIERS = ['netherite', 'diamond', 'iron', 'chainmail', 'golden', 'leather', 'turtle'];
const SLOTS = [
  { part: 'helmet', dest: 'head', slot: 5 },
  { part: 'chestplate', dest: 'torso', slot: 6 },
  { part: 'leggings', dest: 'legs', slot: 7 },
  { part: 'boots', dest: 'feet', slot: 8 },
];
const OFF_HAND = 45;
/** Eat when the food bar is at or below this (sprinting stops at 6, healing at 17). */
export const EAT_AT = 14;
/** Health at which guard() walls the bot in to heal. */
export const LOW_HEALTH = 8;
const FIGHT_RANGE = 4.5;

const rank = (name) => { const i = TIERS.findIndex((t) => name.startsWith(`${t}_`)); return i < 0 ? 99 : i; };

/** equip_gear: the best armor piece for each slot and a shield in the off hand, as the server confirms them. */
export async function equipGear(ctx, { keepGold = false } = {}) {
  const { bot } = ctx;
  const worn = [];
  const errors = [];
  for (const { part, dest, slot } of SLOTS) {
    const items = bot.inventory.items().filter((i) => i.name.endsWith(`_${part}`) || (part === 'helmet' && i.name === 'turtle_helmet'));
    if (!items.length) continue;
    const best = items.sort((a, b) => rank(a.name) - rank(b.name))[0];
    const on = bot.inventory.slots[slot];
    if (on && (rank(on.name) <= rank(best.name) || (keepGold && on.name.startsWith('golden_')))) continue;
    try {
      await ctx.wait(bot.equip(best, dest));
      worn.push(best.name);
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      errors.push(`${best.name}: ${describeError(err)}`);
    }
  }
  const shield = bot.inventory.items().find((i) => i.name === 'shield');
  if (shield && bot.inventory.slots[OFF_HAND]?.name !== 'shield') {
    try {
      await ctx.wait(bot.equip(shield, 'off-hand'));
      worn.push('shield (off hand)');
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      errors.push(`shield: ${describeError(err)}`);
    }
  }
  const wearing = [...SLOTS.map((s) => bot.inventory.slots[s.slot]?.name), bot.inventory.slots[OFF_HAND]?.name].filter(Boolean);
  if (errors.length && !worn.length) return fail(`could not equip: ${errors.join('; ')}`);
  const now = wearing.length ? `wearing ${wearing.join(', ')}` : 'no armor or shield to wear';
  return done(worn.length ? `put on ${worn.join(', ')}; ${now}` : `nothing better to put on; ${now}`);
}

/** The positions around the bot's body that are open (air or liquid): four sides at feet and head, and above. */
function openAround(bot) {
  const f = vec(bot.entity.position);
  const cells = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cells.push(f.offset(dx, 0, dz), f.offset(dx, 1, dz));
  cells.push(f.offset(0, 2, 0));
  return cells.filter((p) => { const b = bot.blockAt(p); return b && (isPassable(b) || isLiquid(b)); });
}

/**
 * Close the open cells around the bot's 1x2 space with filler blocks (portal blocks stay open). Returns how many were
 * placed and how many are still open.
 */
export async function wallIn(ctx) {
  const { bot } = ctx;
  let placed = 0;
  // the block above the head last: it is placed against a side wall
  const f = vec(bot.entity.position);
  for (const p of openAround(bot)) {
    if (bot.blockAt(p)?.name === 'nether_portal') continue;
    const name = fillerOf(bot);
    if (!name) break;
    let r = await placeAt(ctx, name, p, { move: false });
    if (!r.ok && p.y === f.y + 2) {
      // nothing to build the roof against: first a block on top of one of the head-level walls
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const side = f.offset(dx, 2, dz);
        if (!isSolid(bot.blockAt(f.offset(dx, 1, dz))) || !isPassable(bot.blockAt(side)) || !fillerOf(bot)) continue;
        if ((await placeAt(ctx, fillerOf(bot), side, { move: false })).ok) { placed += 1; break; }
      }
      if (fillerOf(bot)) r = await placeAt(ctx, fillerOf(bot), p, { move: false });
    }
    if (r.ok) placed += 1;
  }
  const open = openAround(bot).filter((p) => bot.blockAt(p)?.name !== 'nether_portal').length;
  return { placed, open };
}

/**
 * Wall the bot in where it stands (its 1x2 space closed on every side and above) and wait there to heal, eating when
 * hungry, until health is full or `seconds` have passed. Returns {ok, result}.
 */
export async function holeUp(ctx, { seconds = 60 } = {}) {
  const { bot } = ctx;
  const f = vec(bot.entity.position);
  if (!isSolid(bot.blockAt(f.offset(0, -1, 0)))) return fail('you are not standing on solid ground');
  const { placed } = await wallIn(ctx);
  const open = openAround(bot).length;
  const h0 = bot.health;
  const until = Date.now() + seconds * 1000;
  while (Date.now() < until && bot.health < 20) {
    if (bot.food < 18) {
      const r = await eat(ctx);
      if (!r.ok && bot.food < 18 && bot.health < 20) break; // nothing to eat: no healing either
    }
    await ctx.sleep(1_000);
  }
  const walls = open ? `${open} side${open > 1 ? 's' : ''} still open (no blocks to close them)` : 'walled in on every side';
  return done(`placed ${placed} block${placed === 1 ? '' : 's'} at ${fmt(f)}, ${walls}; health ${Math.round(h0)} -> ${Math.round(bot.health)}, food ${bot.food}`);
}

/**
 * The closest hostile mob within range that the bot may fight, or null. Only the attack whitelist: never a piglin,
 * a zombified piglin or an enderman (neutral until hit, and they bring friends).
 */
export function hostileNear(bot, range = FIGHT_RANGE) {
  try {
    return nearbyMobs(bot, { radius: range }).find((m) => m.hostile && ATTACK_TARGETS.includes(m.name)) ?? null;
  } catch {
    return null;
  }
}

/**
 * The reflex between steps of a long skill: eat when hungry, fight a hostile mob that came within reach, hole up when
 * health is low. Returns a short note of what it did ('' when nothing), never throws for a game failure.
 */
export async function guard(ctx) {
  const { bot } = ctx;
  const notes = [];
  try {
    if (bot.food <= EAT_AT) {
      const r = await eat(ctx);
      if (r.ok) notes.push(r.result);
    }
    const mob = hostileNear(bot);
    if (mob && bot.health > 4) {
      const r = await attack(ctx, { target: mob.name });
      notes.push(`fought a ${mob.name}: ${r.result}`);
    }
    if (bot.health <= LOW_HEALTH) {
      const r = await holeUp(ctx, { seconds: 45 });
      notes.push(`health was low: ${r.result}`);
    }
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    notes.push(`guard: ${describeError(err)}`);
  }
  return notes.join('; ');
}

/** hole_up {seconds}: the tool. */
export async function holeUpSkill(ctx, { seconds }) {
  return holeUp(ctx, { seconds });
}
