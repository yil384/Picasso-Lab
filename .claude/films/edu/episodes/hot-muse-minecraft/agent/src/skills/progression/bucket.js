// src/skills/progression/bucket.js - buckets and obsidian. A bucket is used the way the game does it: look at the
// spot, then use the item (the server traces the look itself: an empty bucket stops at the first still liquid, a full
// one at the first solid block). Obsidian is made by pouring water over still lava from the shore: the water placed at
// the bot's feet runs out over the pool and every lava source it covers turns to obsidian; the water is scooped up
// again at once, and only obsidian with solid ground under it and no lava beside it is mined (a diamond pickaxe,
// about 9.4 s a block), so no drop falls into lava and no lava runs into the hole.

import { Vec3 } from '../../mc.js';
import {
  goals, done, fail, vec, keyOf, fmt, countOf, equip, eyeDistance, REACH, isSolid, isPassable, standSpots, mineBlock,
  SkillStop, describeError,
} from '../util.js';
import { isLava, isWater, isSource, isLiquid, liquidAround } from './safety.js';
import { guard } from './survive.js';

const SEARCH = 32;
const PICKS = ['diamond_pickaxe', 'netherite_pickaxe'];
const SIDES = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Still liquid of one kind within SEARCH blocks with air above it, nearest first. */
function surfaceSources(bot, liquid, max = 64) {
  const id = bot.registry.blocksByName[liquid]?.id;
  return bot.findBlocks({ matching: (b) => b.type === id && isSource(b), maxDistance: SEARCH, count: max })
    .filter((p) => isPassable(bot.blockAt(p.offset(0, 1, 0))) && !isLiquid(bot.blockAt(p.offset(0, 1, 0))))
    .sort((a, b) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position));
}

/** Look at a point and use the held item once (a bucket), then let the server answer. */
async function useAt(ctx, point) {
  const { bot } = ctx;
  await ctx.wait(bot.lookAt(point, true));
  bot.activateItem();
  await ctx.wait(bot.waitForTicks(4));
  try { bot.deactivateItem(); } catch { /* nothing held in use */ }
  await ctx.wait(bot.waitForTicks(4));
}

/** A dry spot to stand on (feet and head clear, solid ground, no liquid touching the body). */
function dry(bot, feet) {
  const head = feet.offset(0, 1, 0);
  const b0 = bot.blockAt(feet);
  const b1 = bot.blockAt(head);
  const g = bot.blockAt(feet.offset(0, -1, 0));
  return Boolean(b0 && b1 && g && isPassable(b0) && isPassable(b1) && !isLiquid(b0) && !isLiquid(b1) && isSolid(g)
    && !liquidAround(bot, feet).filter((b) => isLava(b)).length && !liquidAround(bot, head).filter((b) => isLava(b)).length);
}

/**
 * Fill an empty bucket from the nearest still water or lava (with air above it). Returns {ok, result}.
 * @param {object} ctx
 * @param {'water'|'lava'} liquid
 */
export async function fillBucket(ctx, liquid) {
  const { bot } = ctx;
  const full = `${liquid}_bucket`;
  if (countOf(bot, 'bucket') < 1) return fail(`you have no empty bucket (craft one from 3 iron ingots)`);
  const before = countOf(bot, full);
  const sources = surfaceSources(bot, liquid, 24);
  if (!sources.length) return fail(`no still ${liquid} with open air above it within ${SEARCH} blocks`);
  let last = '';
  for (const s of sources.slice(0, 6)) {
    try {
      if (eyeDistance(bot, s) > REACH - 0.5) {
        const spots = standSpots(bot, s).filter((p) => dry(bot, p));
        if (!spots.length) { last = `no dry spot to stand near the ${liquid} at ${fmt(s)}`; continue; }
        await ctx.goto(new goals.GoalBlock(spots[0].x, spots[0].y, spots[0].z), { timeoutMs: 30_000 });
        if (eyeDistance(bot, s) > REACH) { last = `could not get within reach of ${fmt(s)}`; continue; }
      }
      await equip(ctx, 'bucket');
      await useAt(ctx, s.offset(0.5, 0.85, 0.5));
      if (countOf(bot, full) > before) return done(`filled a bucket with ${liquid} at ${fmt(s)}`);
      last = `the bucket did not fill at ${fmt(s)} (something in the way)`;
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      last = describeError(err);
    }
  }
  return fail(`could not fill a bucket with ${liquid}: ${last}`);
}

/** Pour the held water bucket on the bot's own spot (it flows out from there), then scoop it up again. */
async function pourAndScoop(ctx, waitTicks = 50) {
  const { bot } = ctx;
  const feet = vec(bot.entity.position);
  await equip(ctx, 'water_bucket');
  await useAt(ctx, feet.offset(0.5, 0.02, 0.5)); // the top face of the block under the feet: water goes in at the feet
  const placed = isWater(bot.blockAt(feet));
  if (!placed) return { poured: false, scooped: false };
  await ctx.wait(bot.waitForTicks(waitTicks));
  let scooped = false;
  for (let i = 0; i < 3 && !scooped; i++) {
    await equip(ctx, 'bucket');
    await useAt(ctx, feet.offset(0.5, 0.5, 0.5));
    scooped = countOf(bot, 'water_bucket') > 0;
  }
  return { poured: true, scooped };
}

/** bucket {action}: fill_water, fill_lava, or pour_water (at the feet, and leave it there). */
export async function bucket(ctx, { action }) {
  const { bot } = ctx;
  if (action === 'fill_water') return fillBucket(ctx, 'water');
  if (action === 'fill_lava') return fillBucket(ctx, 'lava');
  if (countOf(bot, 'water_bucket') < 1) return fail('you have no water bucket');
  const feet = vec(bot.entity.position);
  await equip(ctx, 'water_bucket');
  await useAt(ctx, feet.offset(0.5, 0.02, 0.5));
  return isWater(bot.blockAt(feet)) ? done(`poured water at ${fmt(feet)}`) : fail(`the water did not pour at ${fmt(feet)}`);
}

/** Shore spots from which water at the feet runs over still lava: feet one above the lava, beside it, dry. */
function pourSpots(bot, lavas, tried) {
  const out = [];
  const seen = new Set();
  for (const l of lavas) {
    for (const [dx, dz] of SIDES) {
      const feet = l.offset(dx, 1, dz);
      const k = keyOf(feet);
      if (seen.has(k) || tried.has(k)) continue;
      seen.add(k);
      if (!dry(bot, feet)) continue;
      // lava touching the spot at feet level would flow onto the bot
      if (SIDES.some(([x, z]) => isLava(bot.blockAt(feet.offset(x, 0, z))))) continue;
      const covered = lavas.filter((o) => Math.abs(o.x - feet.x) + Math.abs(o.z - feet.z) <= 5 && o.y === feet.y - 1).length;
      out.push({ feet, covered });
    }
  }
  const from = bot.entity.position;
  return out.sort((a, b) => b.covered - a.covered || a.feet.distanceTo(from) - b.feet.distanceTo(from));
}

/**
 * Why an obsidian block must not be mined (null when it is fine): lava beside it or above (it would run into the
 * hole), no solid block under it (the drop would fall, into lava maybe), or it is part of a portal.
 */
function obsidianDanger(bot, p) {
  const below = bot.blockAt(p.offset(0, -1, 0));
  if (!isSolid(below)) return `nothing solid under ${fmt(p)}`;
  for (const q of [p, p.offset(0, 1, 0)]) {
    for (const [dx, dz] of SIDES) {
      const b = bot.blockAt(q.offset(dx, 0, dz));
      if (isLiquid(b)) return `${b.name} beside ${fmt(p)}`;
      if (b?.name === 'nether_portal') return `${fmt(p)} is part of a portal`;
    }
  }
  if (isLiquid(bot.blockAt(p.offset(0, 1, 0)))) return `liquid above ${fmt(p)}`;
  if (bot.blockAt(p.offset(0, 1, 0))?.name === 'nether_portal') return `${fmt(p)} is part of a portal`;
  return null;
}

/** Mine one obsidian block from a dry spot beside it (never standing on it). Returns {ok, result}. */
async function mineObsidian(ctx, p) {
  const { bot } = ctx;
  const avoid = new Set([keyOf(p.offset(0, 1, 0))]);
  if (eyeDistance(bot, p) > REACH || vec(bot.entity.position).equals(p.offset(0, 1, 0))) {
    const spots = standSpots(bot, p, avoid).filter((s) => dry(bot, s) && !s.offset(0, -1, 0).equals(p));
    if (!spots.length) return { ok: false, result: `no dry spot beside ${fmt(p)}` };
    await ctx.goto(new goals.GoalBlock(spots[0].x, spots[0].y, spots[0].z), { timeoutMs: 30_000 });
  }
  const b = bot.blockAt(p);
  if (b?.name !== 'obsidian') return { ok: false, result: `no obsidian at ${fmt(p)} any more` };
  return mineBlock(ctx, b, { walkMs: 8_000 });
}

/**
 * make_obsidian {n}: mine n obsidian from what is around, pouring water over still lava first when there is not
 * enough. Needs a diamond pickaxe and a water bucket (or an empty bucket and water nearby).
 */
export async function makeObsidian(ctx, { n }) {
  const { bot } = ctx;
  if (!PICKS.some((p) => countOf(bot, p) > 0)) return fail('obsidian needs a diamond pickaxe (you have none)');
  const start = countOf(bot, 'obsidian');
  const got = () => countOf(bot, 'obsidian') - start;
  const t0 = Date.now();
  const notes = [];
  const bad = new Set();
  const tried = new Set();
  let pours = 0;
  const obsidianId = bot.registry.blocksByName.obsidian.id;
  for (let round = 0; round < 12 && got() < n; round++) {
    ctx.check();
    const g = await guard(ctx);
    if (g) notes.push(g);
    // 1. mine every safe obsidian block in sight
    const blocks = bot.findBlocks({ matching: obsidianId, maxDistance: 16, count: 80 })
      .filter((p) => !bad.has(keyOf(p)))
      .sort((a, b) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position));
    let mined = 0;
    for (const p of blocks) {
      if (got() >= n) break;
      const why = obsidianDanger(bot, p);
      if (why) { bad.add(keyOf(p)); continue; }
      try {
        const r = await mineObsidian(ctx, p);
        if (r.ok) mined += 1; else { bad.add(keyOf(p)); notes.push(r.result); }
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        bad.add(keyOf(p));
        notes.push(describeError(err));
      }
    }
    if (got() >= n) break;
    if (mined) continue; // look again: mining opens new ground to stand on
    // 2. make more: water over still lava from the best shore spot
    if (countOf(bot, 'water_bucket') < 1) {
      const r = await fillBucket(ctx, 'water');
      if (!r.ok) { notes.push(r.result); break; }
    }
    const lavas = surfaceSources(bot, 'lava', 200);
    if (!lavas.length) { notes.push(`no still lava with air above it within ${SEARCH} blocks`); break; }
    const spots = pourSpots(bot, lavas, tried);
    if (!spots.length) { notes.push('no dry shore spot beside the lava to pour water from'); break; }
    let poured = false;
    for (const { feet } of spots.slice(0, 4)) {
      tried.add(keyOf(feet));
      try {
        await ctx.goto(new goals.GoalBlock(feet.x, feet.y, feet.z), { timeoutMs: 30_000 });
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        continue;
      }
      if (!vec(bot.entity.position).equals(feet)) continue;
      const r = await pourAndScoop(ctx);
      if (!r.poured) continue;
      pours += 1;
      poured = true;
      if (!r.scooped) notes.push(`the water at ${fmt(feet)} could not be scooped up again`);
      // step off the wet spot onto dry ground before mining
      await ctx.wait(bot.waitForTicks(30));
      break;
    }
    if (!poured) { notes.push('could not pour water from any shore spot'); break; }
    if (countOf(bot, 'water_bucket') < 1 && countOf(bot, 'bucket') < 1) break;
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  const summary = `${got()} obsidian in ${secs} s (${pours} water pour${pours === 1 ? '' : 's'}; now at ${fmt(bot.entity.position)})`;
  const tail = notes.length ? `; ${[...new Set(notes)].slice(-4).join('; ')}` : '';
  return got() >= n ? done(`mined ${summary}${tail}`) : fail(`got only ${summary}${tail}`);
}

export const _test = { surfaceSources, pourSpots, obsidianDanger, dry, Vec3 };
