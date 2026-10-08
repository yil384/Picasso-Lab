// src/reflexes.js - what the body does on its own, without a model turn (roadmap M2, "basic reflexes"): fight back a
// hostile mob that hits the bot, or run from it when health is below FLEE_HEALTH (and from a creeper close enough to
// blow up), and eat when food is FOOD_LOW or less and no hostile mob is near. src/body.js decides when: it interrupts
// the running skill, runs these, then runs the skill on from where it was; each reflex goes into the next result. The
// actions take a skill context (ctx) like any skill, so a stop cancels them too.

import { goals, describeError, SkillStop, equip, fmt, countOf, isDead } from './skills/util.js';
import { fightEntity } from './skills/attack.js';
import { bestSafeFood } from './skills/basic.js';

/** Below this health the bot runs instead of fighting, and does not go back to the interrupted skill. */
export const FLEE_HEALTH = 8;
/** At this food or less the bot eats, when no hostile mob is within MOB_NEAR. */
export const FOOD_LOW = 14;
export const MOB_NEAR = 12;
/** A creeper this close is run from before it blows up. */
export const CREEPER_NEAR = 4;
/** After a fight, a hostile mob this close is fought too. */
const NEXT_FIGHT = 5;
const FLEE_DISTANCE = 16;
const FLEE_MS = 10_000;
const FIGHT_SWINGS = 24;
const UNREACHABLE_FLEE = 12;

const isHostile = (bot, e) => bot.registry.entitiesByName[e?.name]?.category === 'Hostile mobs';
// a mob in its death animation is not alive: it is never fought again (src/skills/util.js trackDeaths)
const alive = (bot, e) => Boolean(e && e.isValid !== false && bot.entities[e.id] && e.position && !isDead(bot, e));

/** The nearest hostile mob within radius (not the bot, never a player), or null. */
export function nearestHostile(bot, radius, test = () => true) {
  let best = null;
  let bestD = Infinity;
  for (const e of Object.values(bot.entities ?? {})) {
    if (!e || e === bot.entity || e.type === 'player' || !alive(bot, e) || !isHostile(bot, e) || !test(e)) continue;
    const d = e.position.distanceTo(bot.entity.position);
    if (d <= radius && d < bestD) { best = e; bestD = d; }
  }
  return best;
}

/** Fight back one mob (cut short when stopIf() turns true). {note, ok, unreachable} */
export async function fightBack(ctx, mob, stopIf = null) {
  const name = mob.name;
  try {
    const r = await fightEntity(ctx, mob, { maxSwings: FIGHT_SWINGS, loot: false, stopIf });
    if (r.ok && /in 0 swings$/.test(r.result)) return { ok: true, note: `a ${name} hit you and was gone before a swing` };
    if (r.ok) return { ok: true, note: `fought back a ${name} and killed it (${r.result.replace(/^killed the \w+ in /, '')})` };
    return { ok: false, unreachable: /could not reach/.test(r.result), note: `fought back a ${name}: ${r.result.replace(/^the \w+ /, 'it ')}` };
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    return { ok: false, note: `fought back a ${name}: ${describeError(err)}` };
  }
}

/** Run from a mob (or the spot it was at) until FLEE_DISTANCE away or FLEE_MS. {note, distance} */
export async function runFrom(ctx, mob, { distance = FLEE_DISTANCE } = {}) {
  const { bot } = ctx;
  const start = bot.entity.position.clone();
  let from = mob.position.clone();
  const until = Date.now() + FLEE_MS;
  for (let leg = 0; leg < 3 && Date.now() < until; leg++) {
    if (alive(bot, mob)) from = mob.position.clone();
    if (bot.entity.position.distanceTo(from) >= distance) break;
    const goal = new goals.GoalInvert(new goals.GoalNear(Math.floor(from.x), Math.floor(from.y), Math.floor(from.z), distance));
    try {
      await ctx.goto(goal, { timeoutMs: Math.max(500, until - Date.now()), thinkMs: 2_000 });
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      break;
    }
  }
  const away = Math.round(bot.entity.position.distanceTo(alive(bot, mob) ? mob.position : from));
  const moved = Math.round(bot.entity.position.distanceTo(start));
  return { distance: away, note: `ran ${moved} blocks from a ${mob.name} to ${fmt(bot.entity.position)} (now ${away} blocks from it)` };
}

/** Eat the best safe food carried. {note} or null when there is none (or the bot is not hungry). */
export async function eatSomething(ctx) {
  const { bot } = ctx;
  if (bot.food >= 20) return null;
  const food = bestSafeFood(bot);
  if (!food) return null;
  const before = bot.food;
  const had = countOf(bot, food.name);
  await equip(ctx, food.name);
  await ctx.wait(bot.consume());
  ctx.check();
  // the server's slot update can come a tick after the meal; none at all means nothing was eaten
  for (let i = 0; i < 4 && countOf(bot, food.name) >= had; i++) await ctx.wait(bot.waitForTicks(1));
  if (countOf(bot, food.name) >= had) return null;
  return { note: `ate ${food.name} (food ${before} -> ${bot.food})` };
}

/**
 * The reflexes for one threat, in a row: fight (or run, or eat), then whatever is left close by: another hostile
 * mob within NEXT_FIGHT blocks is fought, a creeper within CREEPER_NEAR is run from. Health under FLEE_HEALTH turns a
 * fight into a run (`lowHealth()` is read between actions; the body also cuts a running fight short).
 * @param {object} ctx  a skill context
 * @param {{kind: 'fight'|'flee'|'eat', mob?: object}} first
 * @param {{lowHealth: () => boolean, onAction?: (kind: string, mob: object|null) => void, notes?: string[]}} hooks
 *   notes: filled as the reflexes act, so a caller still has them when a death or a stop cuts the round short
 * @returns {Promise<{notes: string[], retreated: boolean, from: object|null}>}
 */
export async function runReflexes(ctx, first, { lowHealth, onAction = () => {}, notes = [] }) {
  const { bot } = ctx;
  let retreated = false;
  let from = null;
  let next = first;
  for (let i = 0; next && i < 4; i++) {
    ctx.check();
    const { kind, mob } = next;
    next = null;
    if (kind === 'eat') {
      onAction('eat', null);
      const r = await eatSomething(ctx);
      if (r) notes.push(r.note);
      break;
    }
    if (kind === 'fight' && !lowHealth() && mob?.name !== 'creeper' && alive(bot, mob)) {
      onAction('fight', mob);
      const r = await fightBack(ctx, mob, lowHealth);
      notes.push(r.note);
      if (!r.ok && lowHealth()) next = { kind: 'flee', mob };
      else if (r.unreachable && alive(bot, mob)) {
        onAction('flee', mob);
        notes.push((await runFrom(ctx, mob, { distance: UNREACHABLE_FLEE })).note);
      }
    } else if (kind === 'fight' || kind === 'flee') {
      if (!mob?.position) continue;
      onAction('flee', mob);
      const r = await runFrom(ctx, mob);
      notes.push(r.note);
      from = mob;
      if (lowHealth()) {
        retreated = true;
        const ate = await eatSomething(ctx).catch((err) => { if (err instanceof SkillStop) throw err; return null; });
        if (ate) notes.push(ate.note);
        break;
      }
    }
    if (!next) {
      const creeper = nearestHostile(bot, CREEPER_NEAR, (e) => e.name === 'creeper');
      const other = nearestHostile(bot, NEXT_FIGHT, (e) => e.name !== 'creeper');
      if (creeper) next = { kind: 'flee', mob: creeper };
      else if (other) next = { kind: lowHealth() ? 'flee' : 'fight', mob: other };
    }
  }
  return { notes, retreated, from };
}
