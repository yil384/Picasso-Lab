// src/skills/progression/portal.js - flint, a Nether portal and the trip through it. build_portal picks the cheapest
// spot within a few blocks for a 4x5 frame (10 obsidian; the four corners may be any block, so they take cobblestone),
// clears it with the lava checks of safety.js, builds it bottom up and lights it with flint and steel. use_portal
// walks into the nearest portal, waits for the server to move the bot to the other dimension (the respawn packet that
// changes game.dimension), then steps out of the arrival portal onto dry ground so the next trip can start.

import { Vec3 } from '../../mc.js';
import {
  goals, done, fail, vec, keyOf, fmt, countOf, equip, isSolid, isPassable, placeAt, placeNearby, mineBlock, standSpots,
  SkillStop, describeError,
} from '../util.js';
import { craft } from '../craft.js';
import { collect } from '../collect.js';
import { digDanger, clearCell, isLiquid, fillerOf, fillerCount, liquidAround, isLava } from './safety.js';
import { guard, wallIn } from './survive.js';

const UP = new Vec3(0, 1, 0);
const AXES = [new Vec3(1, 0, 0), new Vec3(0, 0, 1)];
const SITE_RADIUS = 5;
/**
 * After a trip the server puts the player on a portal cooldown (300 ticks), and standing in a portal during it starts
 * the cooldown again: wait it out off the portal before the next trip.
 */
const COOLDOWN_MS = 16_000;
const arrivals = new WeakMap();

/** Keep pathfinder off obsidian and portals while these skills run (it may otherwise dig through a frame). */
function protectFrames(bot) {
  const m = bot.pathfinder?.movements;
  if (!m?.blocksCantBreak) return;
  for (const n of ['obsidian', 'nether_portal', 'crying_obsidian']) {
    const id = bot.registry.blocksByName[n]?.id;
    if (id !== undefined) m.blocksCantBreak.add(id);
  }
}

/** get_flint {n}: mine gravel until n flint drop (a placed gravel block mined again rolls the 10% once more). */
export async function getFlint(ctx, { n }) {
  const { bot } = ctx;
  const start = countOf(bot, 'flint');
  const got = () => countOf(bot, 'flint') - start;
  let tries = 0;
  const max = 30 + 12 * n;
  while (got() < n && tries < max) {
    ctx.check();
    if (countOf(bot, 'gravel') < 1) {
      const r = await collect(ctx, { block: 'gravel', n: Math.min(8, n * 4) });
      if (countOf(bot, 'gravel') < 1) return fail(`${got()} flint so far; no gravel to mine: ${r.result}`);
      tries += 1;
      continue;
    }
    // put a gravel block down on solid ground beside the bot and mine it again
    const placed = await placeNearby(ctx, 'gravel');
    if (!placed.ok || !placed.block) return fail(`${got()} flint so far; could not put gravel down: ${placed.result}`);
    await ctx.wait(bot.waitForTicks(4)); // gravel settles
    const b = bot.blockAt(placed.block.position);
    const target = b?.name === 'gravel' ? b : bot.findBlock({ matching: bot.registry.blocksByName.gravel.id, maxDistance: 5 });
    if (!target) { tries += 1; continue; }
    await mineBlock(ctx, target, { walkMs: 5_000 });
    tries += 1;
  }
  return got() >= n ? done(`got ${got()} flint from ${tries} gravel digs`) : fail(`only ${got()} flint after ${tries} gravel digs`);
}

/** The 4x5 frame cells of a site: role 'corner' | 'obsidian' | 'inside'. */
export function frameCells(origin, axis) {
  const cells = [];
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 5; r++) {
      const p = origin.plus(axis.scaled(c)).offset(0, r, 0);
      const edgeC = c === 0 || c === 3;
      const edgeR = r === 0 || r === 4;
      const role = edgeC && edgeR ? 'corner' : edgeC || edgeR ? 'obsidian' : 'inside';
      cells.push({ p, c, r, role });
    }
  }
  return cells;
}

/** The cost of a site, or null when it cannot be used. */
function siteCost(bot, origin, axis, side) {
  const cells = frameCells(origin, axis);
  const normal = new Vec3(axis.z, 0, axis.x).scaled(side);
  const stand = origin.plus(axis).plus(normal);
  const work = [...cells.map((x) => x.p), stand, stand.offset(0, 1, 0)];
  const keys = new Set(work.map(keyOf));
  let cost = 0;
  for (const { p, role } of cells) {
    const b = bot.blockAt(p);
    if (!b || isLiquid(b) || b.name === 'nether_portal' || b.name === 'bedrock') return null;
    if (b.name === 'obsidian' && role === 'obsidian') continue;
    if (!isPassable(b)) {
      if (digDanger(bot, p, keys)) return null;
      cost += 1;
    }
    // no lava next to the frame or inside it: the fire and the bot stay away from it
    if (liquidAround(bot, p, keys).some(isLava)) return null;
  }
  for (const p of [stand, stand.offset(0, 1, 0)]) {
    const b = bot.blockAt(p);
    if (!b || isLiquid(b)) return null;
    if (!isPassable(b)) { if (digDanger(bot, p, keys)) return null; cost += 1; }
  }
  for (let c = 0; c < 4; c++) {
    const g = bot.blockAt(origin.plus(axis.scaled(c)).offset(0, -1, 0));
    if (!g || isLiquid(g)) return null;
    if (!isSolid(g)) cost += 3;
  }
  const g = bot.blockAt(stand.offset(0, -1, 0));
  if (!g || isLiquid(g) || !isSolid(g)) return null;
  return { cost, origin, axis, stand, cells };
}

/** The cheapest site near the bot. */
export function chooseSite(bot) {
  const f = vec(bot.entity.position);
  let best = null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -SITE_RADIUS; dx <= SITE_RADIUS; dx++) {
      for (let dz = -SITE_RADIUS; dz <= SITE_RADIUS; dz++) {
        for (const axis of AXES) {
          for (const side of [1, -1]) {
            const s = siteCost(bot, f.offset(dx, dy, dz), axis, side);
            if (!s) continue;
            s.cost += (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 2) * 0.1;
            if (!best || s.cost < best.cost) best = s;
          }
        }
      }
    }
  }
  return best;
}

/** The portal blocks inside a frame, or anywhere near when no frame is given. */
function portalBlocksNear(bot, radius = 24) {
  const id = bot.registry.blocksByName.nether_portal?.id;
  return id === undefined ? [] : bot.findBlocks({ matching: id, maxDistance: radius, count: 64 });
}

/** Light the frame: flint and steel on the top face of a bottom obsidian block. */
async function light(ctx, site) {
  const { bot } = ctx;
  const bottom = site.cells.find((x) => x.role === 'obsidian' && x.r === 0).p;
  for (let i = 0; i < 3; i++) {
    await equip(ctx, 'flint_and_steel');
    await ctx.wait(bot.activateBlock(bot.blockAt(bottom), UP));
    await ctx.wait(bot.waitForTicks(10));
    if (bot.blockAt(bottom.offset(0, 1, 0))?.name === 'nether_portal') return true;
  }
  return false;
}

/**
 * build_portal {}: a 4x5 Nether portal on the best spot nearby, lit. Needs 10 obsidian, 4 cobblestone (or another
 * plain block) for the corners, and flint and steel (or an iron ingot and a flint to craft one).
 */
export async function buildPortal(ctx) {
  const { bot } = ctx;
  protectFrames(bot);
  if (countOf(bot, 'flint_and_steel') < 1) {
    if (countOf(bot, 'iron_ingot') < 1 || countOf(bot, 'flint') < 1) return fail('you need flint and steel (or an iron ingot and a flint to craft it)');
    const r = await craft(ctx, { item: 'flint_and_steel', n: 1 });
    if (!r.ok) return fail(`could not craft flint and steel: ${r.result}`);
  }
  const site = chooseSite(bot);
  if (!site) return fail(`no spot within ${SITE_RADIUS} blocks for a 4x5 portal frame clear of lava and water; move to more open ground`);
  const needObs = site.cells.filter((x) => x.role === 'obsidian' && bot.blockAt(x.p)?.name !== 'obsidian').length;
  const fills = [0, 1, 2, 3].filter((c) => !isSolid(bot.blockAt(site.origin.plus(site.axis.scaled(c)).offset(0, -1, 0)))).length;
  if (countOf(bot, 'obsidian') < needObs) return fail(`a portal frame needs ${needObs} obsidian; you have ${countOf(bot, 'obsidian')}`);
  if (fillerCount(bot) < 4 + fills) return fail(`the frame corners need ${4 + fills} cobblestone (or dirt, deepslate...); you have ${fillerCount(bot)}`);
  const keys = new Set([...site.cells.map((x) => keyOf(x.p))]);
  const t0 = Date.now();
  // 1. stand in front of the site, clearing that spot first if needed
  for (const p of [site.stand.offset(0, 1, 0), site.stand]) {
    const r = await clearCell(ctx, p, keys);
    if (!r.ok) return fail(`could not clear a place to stand at ${fmt(site.stand)}: ${r.result}`);
  }
  await ctx.goto(new goals.GoalBlock(site.stand.x, site.stand.y, site.stand.z), { timeoutMs: 30_000 });
  // 2. clear the frame and the inside, top down
  const toDig = site.cells.filter(({ p, role }) => !isPassable(bot.blockAt(p)) && !(role === 'obsidian' && bot.blockAt(p)?.name === 'obsidian'))
    .sort((a, b) => b.r - a.r);
  for (const { p } of toDig) {
    const r = await clearCell(ctx, p, keys);
    if (!r.ok) return fail(`could not clear the frame at ${fmt(p)}: ${r.result}`);
  }
  // 3. ground under the bottom row, then the frame bottom up
  const avoid = new Set(keys);
  for (let c = 0; c < 4; c++) {
    const g = site.origin.plus(site.axis.scaled(c)).offset(0, -1, 0);
    if (isSolid(bot.blockAt(g))) continue;
    const r = await placeAt(ctx, fillerOf(bot), g, { avoid });
    if (!r.ok) return fail(`could not fill the ground under the frame: ${r.result}`);
  }
  const order = [...site.cells].filter((x) => x.role !== 'inside').sort((a, b) => a.r - b.r || (a.role === 'corner' ? -1 : 1));
  for (const { p, role } of order) {
    const now = bot.blockAt(p);
    if (role === 'obsidian' && now?.name === 'obsidian') continue;
    if (role === 'corner' && isSolid(now)) continue;
    const name = role === 'obsidian' ? 'obsidian' : fillerOf(bot);
    if (!name) return fail('ran out of blocks for the frame corners');
    const r = await placeAt(ctx, name, p, { avoid });
    if (!r.ok) return fail(`could not place the frame at ${fmt(p)}: ${r.result}`);
  }
  // 4. light it from the front
  if (!vec(bot.entity.position).equals(site.stand)) {
    await ctx.goto(new goals.GoalBlock(site.stand.x, site.stand.y, site.stand.z), { timeoutMs: 20_000 });
  }
  const lit = await light(ctx, site);
  const secs = Math.round((Date.now() - t0) / 1000);
  const where = fmt(site.origin.plus(site.axis).offset(0, 1, 0));
  if (!lit) return fail(`built the frame at ${where} in ${secs} s but it did not light (check the frame is complete)`);
  return done(`built and lit a Nether portal at ${where} in ${secs} s (${toDig.length} blocks cleared)`);
}

/** Wait (bounded) until game.dimension differs from `from`; resolves to the new dimension or null. */
function dimensionChange(ctx, from, ms) {
  const { bot } = ctx;
  return new Promise((resolve) => {
    let timer = null;
    const poll = setInterval(() => { if (bot.game?.dimension && bot.game.dimension !== from) finish(bot.game.dimension); }, 100);
    function finish(v) { clearInterval(poll); clearTimeout(timer); resolve(v); }
    timer = setTimeout(() => finish(null), ms);
  });
}

/** Feet cell of a portal to walk into: a portal block with a non-portal block under it, nearest first. */
function portalEntry(bot) {
  const from = bot.entity.position;
  return portalBlocksNear(bot)
    .filter((p) => bot.blockAt(p.offset(0, -1, 0))?.name !== 'nether_portal' && bot.blockAt(p.offset(0, 1, 0))?.name === 'nether_portal')
    .sort((a, b) => a.distanceTo(from) - b.distanceTo(from))[0] ?? null;
}

/** Lava blocks within r blocks (horizontally, from one below to one above pos). */
function lavaNear(bot, pos, r = 2) {
  let n = 0;
  for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) for (let dy = -2; dy <= 1; dy++) {
    if (isLava(bot.blockAt(pos.offset(dx, dy, dz)))) n += 1;
  }
  return n;
}

/**
 * Step off the portal onto a dry spot beside it (so the next trip starts fresh), away from lava, and wall that spot in
 * on every side but the portal's (a ghast's fireball or a piglin's hit must not knock the bot into lava while it waits
 * out the portal cooldown).
 */
async function stepOut(ctx) {
  const { bot } = ctx;
  const f = vec(bot.entity.position);
  const spots = standSpots(bot, f.offset(0, 1, 0))
    .filter((s) => bot.blockAt(s)?.name !== 'nether_portal' && bot.blockAt(s.offset(0, 1, 0))?.name !== 'nether_portal'
      && !liquidAround(bot, s).some(isLava) && !isLava(bot.blockAt(s.offset(0, -1, 0))))
    .map((s) => ({ s, lava: lavaNear(bot, s), d: s.distanceTo(f) }))
    .sort((a, b) => a.lava - b.lava || a.d - b.d)
    .map((x) => x.s);
  for (const s of spots.slice(0, 4)) {
    try {
      await ctx.goto(new goals.GoalBlock(s.x, s.y, s.z), { timeoutMs: 10_000 });
      if (bot.blockAt(vec(bot.entity.position))?.name !== 'nether_portal') {
        await wallIn(ctx);
        return true;
      }
    } catch (err) {
      if (err instanceof SkillStop) throw err;
    }
  }
  return bot.blockAt(vec(bot.entity.position))?.name !== 'nether_portal';
}

/** Wait until the chunk under the bot is loaded after a dimension change. */
async function chunksIn(ctx, ms = 15_000) {
  const { bot } = ctx;
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const p = bot.entity?.position;
    if (p && bot.blockAt(vec(p).offset(0, -1, 0))) return true;
    await ctx.sleep(200);
  }
  return false;
}

/** use_portal {}: go through the nearest Nether portal and step out on the other side. */
export async function usePortal(ctx) {
  const { bot } = ctx;
  protectFrames(bot);
  const from = bot.game?.dimension ?? 'unknown';
  const entry = portalEntry(bot);
  if (!entry) return fail('no lit Nether portal within 24 blocks (build_portal makes one)');
  const t0 = Date.now();
  let died = false;
  const onDeath = () => { died = true; };
  bot.on('death', onDeath);
  ctx.onCleanup?.(() => bot.removeListener('death', onDeath));
  try {
    return await travel(ctx, { from, entry, t0, died: () => died });
  } finally {
    bot.removeListener('death', onDeath);
  }
}

async function travel(ctx, { from, entry, t0, died }) {
  const { bot } = ctx;
  let to = null;
  for (let attempt = 0; attempt < 3 && !to; attempt++) {
    ctx.check();
    if (attempt > 0) { await stepOut(ctx); arrivals.set(bot, Date.now()); }
    const cool = COOLDOWN_MS - (Date.now() - (arrivals.get(bot) ?? 0));
    if (cool > 0) await ctx.sleep(cool);
    if (bot.blockAt(vec(bot.entity.position))?.name !== 'nether_portal') {
      try {
        await ctx.goto(new goals.GoalBlock(entry.x, entry.y, entry.z), { timeoutMs: 30_000 });
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        if (bot.game?.dimension !== from) { to = bot.game.dimension; break; }
        if (attempt === 2) return fail(`could not walk into the portal at ${fmt(entry)}: ${describeError(err)}`);
        continue;
      }
    }
    bot.clearControlStates?.();
    to = await ctx.wait(dimensionChange(ctx, from, 12_000));
  }
  if (died()) return fail(`you died on the way (in ${from}); you respawn in the overworld`);
  if (!to) return fail(`stood in the portal at ${fmt(entry)} but nothing happened (is it lit? portal blocks: ${portalBlocksNear(bot, 4).length})`);
  arrivals.set(bot, Date.now());
  const loaded = await chunksIn(ctx);
  await ctx.sleep(1_000);
  const out = loaded ? await stepOut(ctx) : false;
  const secs = Math.round((Date.now() - t0) / 1000);
  const note = out ? '' : '; still standing in the portal (step out before using it again)';
  const g = await guard(ctx);
  if (died()) return fail(`you died in ${to} just after arriving; you respawn in the overworld`);
  return done(`went through the portal from ${from} to ${to} in ${secs} s; now at ${fmt(bot.entity.position)}${note}${g ? `; ${g}` : ''}`);
}

export const _test = { siteCost, portalEntry, protectFrames };
