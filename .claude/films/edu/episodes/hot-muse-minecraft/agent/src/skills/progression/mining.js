// src/skills/progression/mining.js - getting down to the diamond level and finding diamonds there, without ever
// digging straight down or into lava. dig_stairs cuts a staircase (three blocks a step, the floor of each step solid)
// to a target height; mine_diamonds goes to y -58 that way, then tunnels 2 high toward the nearest diamond ore it
// knows of (the chunk data within 24 blocks, as collect does) or straight on as a branch mine, with every block
// checked by safety.js first. Torches go down every 8 steps when the bot carries them, so the tunnel stays lit.

import { done, fail, vec, keyOf, fmt, countOf, eyeDistance, REACH, mineBlock, placeAt, collectDrops, dropsNear, SkillStop, describeError } from '../util.js';
import { DIRS, safeStep, headingsFrom, facing, horiz, liquidAround, fillerOf, digDanger, isLava } from './safety.js';
import { guard, equipGear } from './survive.js';

export const DIAMOND_Y = -58;
const ORES = ['diamond_ore', 'deepslate_diamond_ore'];
const PICKS = ['iron_pickaxe', 'diamond_pickaxe', 'netherite_pickaxe'];
const SCAN = 24;
const TORCH_EVERY = 8;
const BRANCH = 24; // blocks a branch runs before it turns

const pickOf = (bot) => PICKS.find((p) => countOf(bot, p) > 0) ?? null;
const anyPick = (bot) => bot.inventory.items().find((i) => i.name.endsWith('_pickaxe')) ?? null;

/** Put a torch on the floor of the cell behind the bot (lights the tunnel), best effort. */
async function torchBehind(ctx, d) {
  const { bot } = ctx;
  if (countOf(bot, 'torch') < 1) return;
  const p = vec(bot.entity.position).minus(d);
  const r = await placeAt(ctx, 'torch', p, { move: false });
  if (!r.ok) await placeAt(ctx, 'torch', p.minus(d), { move: false });
}

/**
 * Step toward a heading, turning to the side (then back) when that way is unsafe. Returns the heading taken or a
 * failure with every reason.
 */
async function stepAnyWay(ctx, d, dy, avoidBack = true) {
  const reasons = [];
  const tries = headingsFrom(d);
  for (const h of avoidBack ? tries.slice(0, 3) : tries) {
    const r = await safeStep(ctx, h, dy);
    if (r.ok) return { ok: true, heading: h, result: r.result };
    reasons.push(`${horiz(h)}: ${r.result}`);
    // a step that failed half way (dug, then could not walk) must not leave the bot somewhere it did not check
  }
  return { ok: false, result: reasons.join('; ') };
}

/**
 * Cut a staircase from the bot's height to y. Returns {ok, result, heading}.
 * @param {object} ctx
 * @param {{y: number, heading?: object, guardEvery?: number}} opts
 */
export async function stairsTo(ctx, { y, heading = null }) {
  const { bot } = ctx;
  let d = heading ?? facing(bot);
  let steps = 0;
  let turns = 0;
  const notes = [];
  const y0 = Math.floor(bot.entity.position.y);
  while (Math.floor(bot.entity.position.y) !== y) {
    ctx.check();
    const dy = Math.floor(bot.entity.position.y) > y ? -1 : 1;
    const r = await stepAnyWay(ctx, d, dy, steps > 0);
    if (!r.ok) {
      // a flat step sideways often gets round lava or water in the way
      const flat = await stepAnyWay(ctx, headingsFrom(d)[1], 0, false);
      if (!flat.ok || ++turns > 12) {
        return { ok: false, heading: d, result: `stairs stopped at ${fmt(bot.entity.position)} after ${steps} steps: ${r.result}` };
      }
      d = flat.heading;
      continue;
    }
    if (!r.heading.equals(d)) turns += 1;
    d = r.heading;
    steps += 1;
    if (steps % TORCH_EVERY === 0) await torchBehind(ctx, d);
    const g = await guard(ctx);
    if (g) notes.push(g);
  }
  const tail = notes.length ? `; on the way: ${notes.slice(-3).join('; ')}` : '';
  return { ok: true, heading: d, result: `cut ${steps} stair steps from y ${y0} to y ${y} (now at ${fmt(bot.entity.position)})${tail}` };
}

/** dig_stairs {y}: the tool. */
export async function digStairs(ctx, { y }) {
  const { bot } = ctx;
  if (!anyPick(bot)) return fail('you need a pickaxe to dig stairs');
  const minY = (bot.game?.minY ?? -64) + 2;
  const target = Math.max(minY, y);
  if (Math.floor(bot.entity.position.y) === target) return done(`already at y ${target}`);
  const r = await stairsTo(ctx, { y: target });
  return r.ok ? done(r.result) : fail(r.result);
}

/** Diamond ore within SCAN blocks that is not known to be unsafe, nearest first. */
function diamondsNear(bot, skip) {
  const ids = ORES.map((n) => bot.registry.blocksByName[n]?.id).filter((x) => x !== undefined);
  return bot.findBlocks({ matching: ids, maxDistance: SCAN, count: 40 })
    .filter((p) => !skip.has(keyOf(p)))
    .sort((a, b) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position));
}

/** Cover a lava (or water) block touching pos with a filler block, if the bot can place one there. */
async function coverLiquid(ctx, pos) {
  const { bot } = ctx;
  for (const b of liquidAround(bot, vec(pos))) {
    const name = fillerOf(bot);
    if (!name) return false;
    if (eyeDistance(bot, b.position) > REACH) return false;
    const r = await placeAt(ctx, name, b.position, { move: false });
    if (!r.ok) return false;
  }
  return liquidAround(bot, vec(pos)).length === 0;
}

/** Mine one diamond ore within reach, lava checked (and covered when it can be). Returns {ok, result}. */
async function mineOre(ctx, pos) {
  const { bot } = ctx;
  const b = bot.blockAt(pos);
  if (!b || !ORES.includes(b.name)) return { ok: false, result: `no ore at ${fmt(pos)} any more` };
  let why = digDanger(bot, pos);
  if (why && liquidAround(bot, pos).length) {
    if (await coverLiquid(ctx, pos)) why = digDanger(bot, pos);
  }
  if (why) return { ok: false, result: why };
  const r = await mineBlock(ctx, b, { walkMs: 6_000 });
  // drops that rolled away: one more short pickup
  await collectDrops(ctx, dropsNear(bot, 3), 2_000);
  return r;
}

/** A tunnel step (dy -1, 0 or 1) toward pos; returns {ok, result}. */
function headingTo(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (Math.abs(dx) >= Math.abs(dz) && dx !== 0) return DIRS[dx > 0 ? 0 : 2];
  if (dz !== 0) return DIRS[dz > 0 ? 1 : 3];
  return null;
}

/**
 * mine_diamonds {n}: down to y -58 by stairs, then tunnel to diamond ore (or branch-mine until some is in sight) and
 * mine it until n more diamonds are in the inventory.
 */
export async function mineDiamonds(ctx, { n }) {
  const { bot } = ctx;
  if (!pickOf(bot)) return fail('diamond ore needs an iron pickaxe or better (you have none)');
  const start = countOf(bot, 'diamond');
  const t0 = Date.now();
  const notes = [];
  const skip = new Set();
  const gear = await equipGear(ctx);
  if (/put on/.test(gear.result)) notes.push(gear.result.split(';')[0]);
  let d = facing(bot);
  const feetY = () => Math.floor(bot.entity.position.y);
  if (feetY() > DIAMOND_Y + 6) {
    const r = await stairsTo(ctx, { y: DIAMOND_Y });
    if (!r.ok) return fail(`${r.result}${notes.length ? `; ${notes.join('; ')}` : ''}`);
    notes.push(r.result);
    d = r.heading;
  }
  let branch = 0;
  let steps = 0;
  let failsInRow = 0;
  const got = () => countOf(bot, 'diamond') - start;
  while (got() < n) {
    ctx.check();
    if (!pickOf(bot)) return fail(`your iron pickaxe broke after ${got()} diamonds; craft another and call again`);
    const g = await guard(ctx);
    if (g) notes.push(g);
    const ores = diamondsNear(bot, skip);
    const target = ores[0];
    if (target && eyeDistance(bot, target) <= REACH) {
      const r = await mineOre(ctx, target);
      if (!r.ok) { skip.add(keyOf(target)); notes.push(`skipped the ore at ${fmt(target)}: ${r.result}`); }
      continue;
    }
    let step;
    if (target) {
      // toward the ore: level first when it is more than a block above or below the feet
      const f = vec(bot.entity.position);
      const h = headingTo(f, target);
      const dy = target.y < f.y - 1 ? -1 : target.y > f.y + 2 ? 1 : 0;
      if (!h) {
        step = await stepAnyWay(ctx, d, dy || -1, false); // straight above or below: a stair round it
      } else {
        step = await stepAnyWay(ctx, h, dy, false);
      }
      if (!step.ok) {
        skip.add(keyOf(target));
        notes.push(`could not reach the ore at ${fmt(target)}: ${step.result.slice(0, 160)}`);
        continue;
      }
    } else {
      // branch mining: straight on, turning every BRANCH blocks (and back to the level after a detour)
      const dy = feetY() > DIAMOND_Y ? -1 : feetY() < DIAMOND_Y ? 1 : 0;
      if (branch >= BRANCH) { d = headingsFrom(d)[1]; branch = 0; }
      step = await stepAnyWay(ctx, d, dy, true);
      if (!step.ok) {
        if (++failsInRow >= 3) return fail(`stuck at ${fmt(bot.entity.position)} after ${got()} diamonds: ${step.result.slice(0, 300)}`);
        d = headingsFrom(d)[2];
        branch = 0;
        continue;
      }
      if (!step.heading.equals(d)) branch = 0;
      d = step.heading;
      branch += 1;
    }
    failsInRow = 0;
    steps += 1;
    if (steps % TORCH_EVERY === 0) await torchBehind(ctx, d);
    if (Date.now() - t0 > (ctx.timeoutMs ?? 900_000) - 20_000) break;
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  const lavaSeen = skip.size ? `; skipped ${skip.size} ore${skip.size > 1 ? 's' : ''} next to lava or out of reach` : '';
  const summary = `${got()} diamond${got() === 1 ? '' : 's'} in ${secs} s (${steps} tunnel steps; now at ${fmt(bot.entity.position)})${lavaSeen}`;
  const tail = notes.length ? `; ${notes.slice(-4).join('; ')}` : '';
  return got() >= n ? done(`mined ${summary}${tail}`) : fail(`ran out of time with ${summary}${tail}`);
}

export const _test = { headingTo, diamondsNear, isLava, stepAnyWay, describeError, SkillStop };
