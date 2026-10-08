// src/skills/collect.js - collect: find blocks of one type within SCAN_RADIUS (default 32) blocks, mine n of them
// with the best tool carried and pick up the drops. Targets are taken in order of an approximate path cost, not of
// straight-line distance (roadmap M2, S6): a block in the open beats one buried in the ground or behind a wall, and
// climbing costs more than walking. Each walk into reach gets a short path search (S8: a block that takes longer to
// plan is skipped for the next one) and a search radius just past the straight distance. The drops are not picked up
// block by block: the bot goes straight on to the next block and sweeps the drops up once at the end (S1), nearest
// first. Crafting tables and furnaces count only when the bot owns them (src/stations.js). Matching ore's deepslate
// twin and grass for dirt, checking the harvest tool first and skipping blocks it cannot reach follow Mindcraft's
// collectBlock skill (github.com/mindcraft-bots/mindcraft, MIT License), rewritten for this body.

import { Vec3 } from '../mc.js';
import { done, fail, keyOf, fmt, describeError, mineBlock, collectDrops, dropsNear, countOf, isPassable, goals, SkillStop } from './util.js';
import { MASS, MAX_STEPS, minableHere, tunnelAhead, digHere } from './tunnel.js';
import { settleInventory } from './window.js';
import { STATION_BLOCKS } from '../stations.js';

const RADIUS = Number(process.env.SCAN_RADIUS) || 32;
const MAX_MISSES = 5;
/** The longest walk to one block before it is skipped (a block in a cave wall can take a long way round). */
const WALK_MS = 30_000;
/**
 * Path search budget for the walk to one block (S8; go_to keeps the body's 15 s): first for a spot that sees it
 * (quick when there is one; a buried block has none, and that search only ends at its limit), then for a way dug to
 * stand next to it.
 */
export const COLLECT_THINK_MS = 2_000;
const DIG_TO_THINK_MS = 4_000;
/** A buried block is dug to only this close (straight line, blocks), and that walk gets this long. */
const DIG_TO_WITHIN = 7;
const DIG_TO_MS = 12_000;
/** How much longer than the straight distance a path to a block may be before pathfinder stops looking (S8). */
const DETOUR = 64;
/** The final sweep for drops that were not picked up on the way. */
const SWEEP_MS = 8_000;
const FACES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// ores lie underground: tell the model how to get there (go_to digs) instead of letting it search the surface
const ORE_HINT = (block) => (block.endsWith('_ore') ? '; ores lie underground: go_to a spot about 10 blocks lower (it digs down), then collect again' : '');

/** Block names that count as the requested one (same drop). */
function variantsOf(name) {
  if (name.endsWith('_ore') && !name.startsWith('deepslate_')) return [name, `deepslate_${name}`];
  if (name === 'dirt') return ['dirt', 'grass_block'];
  return [name];
}

/** Names of the tools that can harvest a block, cheapest first, or null when the hand will do. */
function harvestToolNames(bot, def) {
  if (!def.harvestTools) return null;
  const order = ['wooden', 'stone', 'golden', 'iron', 'diamond', 'netherite'];
  const tier = (n) => order.findIndex((t) => n.startsWith(`${t}_`));
  return Object.keys(def.harvestTools).map((id) => bot.registry.items[id]?.name).filter(Boolean).sort((a, b) => tier(a) - tier(b));
}

/**
 * Roughly what it costs to get to a block and mine it, in blocks of walking (S6): the flat distance, climbing at 1.5
 * a block (and 3 for each block above what the bot reaches from the ground), going down at 1, 4 more when no face of
 * it is open (something must be dug first), 8 more when water or lava touches it.
 */
export function pathCost(bot, pos, from) {
  const feet = Math.floor(from.y);
  const flat = Math.hypot(pos.x + 0.5 - from.x, pos.z + 0.5 - from.z);
  const dy = pos.y - feet;
  let cost = flat + (dy > 0 ? dy * 1.5 + Math.max(0, dy - 4) * 3 : -dy);
  let open = false;
  let wet = false;
  for (const [x, y, z] of FACES) {
    const b = bot.blockAt(new Vec3(pos.x + x, pos.y + y, pos.z + z));
    if (!b) continue;
    if (/water|lava/.test(b.name)) wet = true;
    else if (isPassable(b)) open = true;
  }
  if (!open) cost += 4;
  if (wet) cost += 8;
  return cost;
}

/** collect {block, n}; after an interruption (ctx.resumed: what the first try mined) only the rest. */
export async function collect(ctx, { block, n }) {
  const { bot } = ctx;
  const defs = variantsOf(block).map((b) => bot.registry.blocksByName[b]).filter(Boolean);
  const ids = defs.map((d) => d.id);
  const tools = harvestToolNames(bot, defs[0]);
  if (tools && !bot.inventory.items().some((i) => Object.hasOwn(defs[0].harvestTools, i.type))) {
    return fail(`${block} drops nothing without the right tool: you need one of ${tools.join(', ')}`);
  }

  // what the blocks drop (stone: cobblestone, iron_ore: raw_iron), to count what was really picked up; not for
  // blocks whose drop is left to chance (gravel may give flint, leaves and grass often nothing). The server reports
  // each pickup (playerCollect); the inventory change alone can mislead, since the walks may place dirt or cobblestone
  // as scaffolding on the way.
  const chance = /^(gravel|short_grass|.*_leaves)$/.test(block);
  const dropNames = chance ? [] : [...new Set(defs.flatMap((d) => (d.drops ?? []).map((x) => bot.registry.items[typeof x === 'number' ? x : x?.drop?.id ?? x?.id]?.name)).filter(Boolean))];
  const held = () => dropNames.reduce((s, name) => s + countOf(bot, name), 0);
  const heldBefore = held();
  let picked = 0;
  const onCollect = (collector, collected) => {
    if (collector !== bot.entity) return;
    let it = null;
    try { it = collected?.getDroppedItem?.(); } catch { /* not an item */ }
    if (it && dropNames.includes(it.name)) picked += it.count;
  };
  // a bot that does not report pickups (the fake) is counted by its inventory alone
  const got = () => Math.max(held() - heldBefore, picked);
  const offset = ctx.resumed?.mined ?? 0;
  bot.on('playerCollect', onCollect);
  try {
    return await mineAndCount(ctx, { block, n: Math.max(1, n - offset), asked: n, offset, ids, dropNames, got });
  } finally {
    bot.removeListener('playerCollect', onCollect);
  }
}

/** The mining loop of collect, then one sweep for the drops; got() counts what was picked up. */
async function mineAndCount(ctx, { block, n, asked, offset, ids, dropNames, got }) {
  const { bot } = ctx;
  const station = STATION_BLOCKS.includes(block);
  let mined = 0;
  let misses = 0;
  let lastError = null;
  const skip = new Set();
  // drops of the blocks mined here, seen as they appear (within 1.5 blocks of a mined block's centre)
  const centres = [];
  const drops = [];
  const onDrop = (e) => { if (e?.position && centres.some((c) => e.position.distanceTo(c) <= 1.5)) drops.push(e); };
  bot.on('itemDrop', onDrop);
  const count = () => {
    mined += 1;
    ctx.progress?.({ mined: offset + mined });
    ctx.stopNote(`mined ${offset + mined} of ${asked} ${block} before that`); // a long collect can run into its time limit
  };
  // stone with a pickaxe that can break it: from where the bot stands, and into the stone (src/skills/tunnel.js)
  const tunnel = MASS.has(block) && bot.inventory.items().some((i) => Object.hasOwn(bot.registry.blocksByName[block].harvestTools ?? {}, i.type));
  let steps = 0;
  try {
    while (mined < n) {
      ctx.check();
      if (bot.inventory.emptySlotCount?.() === 0) return fail(`mined ${offset + mined} of ${asked} ${block}: the inventory is full`);
      if (tunnel) {
        // stone: first what can be mined from right here, then one step into the stone in front (S2)
        const here = minableHere(bot, ids).filter((b) => !skip.has(keyOf(b.position)));
        if (here.length) {
          const b = here[0];
          centres.push(b.position.offset(0.5, 0.5, 0.5));
          if (centres.length > 16) centres.shift();
          let ok = false;
          try { ok = await digHere(ctx, b); } catch (err) { if (err instanceof SkillStop) throw err; lastError = `${describeError(err)} (at ${fmt(b.position)})`; }
          ctx.check();
          if (ok) count();
          else skip.add(keyOf(b.position));
          continue;
        }
        const ahead = steps < MAX_STEPS ? tunnelAhead(bot, ids) : null;
        if (ahead && ahead.dig.filter((b) => ids.includes(b.type)).length <= n - mined) {
          let ok = true;
          for (const b of [...ahead.dig].sort((x, y) => y.position.y - x.position.y)) {
            centres.push(b.position.offset(0.5, 0.5, 0.5));
            const wanted = ids.includes(b.type);
            try { ok = await digHere(ctx, b); } catch (err) { if (err instanceof SkillStop) throw err; ok = false; }
            ctx.check();
            if (!ok) break;
            if (wanted) count();
          }
          steps += 1;
          if (ok) {
            try {
              await ctx.goto(new goals.GoalBlock(ahead.feet.x, ahead.feet.y, ahead.feet.z), { timeoutMs: 4_000, thinkMs: 1_000 });
            } catch (err) { if (err instanceof SkillStop) throw err; }
          }
          continue;
        }
      }
      const from = bot.entity.position;
      const found = bot.findBlocks({ matching: ids, maxDistance: RADIUS, count: 64 })
        .filter((p) => !skip.has(keyOf(p)) && (!station || ctx.stations?.owns(p) || !ctx.stations));
      if (!found.length) break;
      const ranked = found.map((p) => ({ p, c: pathCost(bot, p, from) })).sort((a, b) => a.c - b.c);
      const pos = ranked[0].p;
      const target = bot.blockAt(pos);
      centres.push(pos.offset(0.5, 0.5, 0.5));
      if (centres.length > 16) centres.shift();
      const straight = pos.offset(0.5, 0.5, 0.5).distanceTo(from);
      try {
        const r = await mineBlock(ctx, target, {
          walkMs: WALK_MS,
          walk: {
            thinkMs: COLLECT_THINK_MS,
            searchRadius: Math.ceil(straight) + DETOUR,
            digTo: { within: DIG_TO_WITHIN, timeoutMs: DIG_TO_MS, thinkMs: DIG_TO_THINK_MS, searchRadius: Math.ceil(straight) + DETOUR },
          },
          pickup: false,
        });
        if (!r.ok) lastError = r.result;
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        ctx.check();
        lastError = `${describeError(err)} (at ${fmt(pos)})`;
      }
      ctx.check();
      if (bot.blockAt(pos)?.type === target.type) {
        skip.add(keyOf(pos));
        if (++misses >= MAX_MISSES) break;
      } else {
        if (station) ctx.stations?.release(pos);
        count();
      }
    }
    // the drops still lying where they fell (most were picked up on the way): one sweep, nearest first, for the
    // wanted items only (blocks pathfinder broke on the way drop cobblestone and dirt next to them too)
    if (mined && dropNames.length && got() < mined) {
      await ctx.sleep(150); // the last block's drop reaches the client a tick or two after the block breaks
      const wanted = drops.filter((e) => { try { const it = e.getDroppedItem?.(); return !it || dropNames.includes(it.name); } catch { return true; } });
      try { await collectDrops(ctx, wanted, SWEEP_MS); } catch (err) { if (err instanceof SkillStop) throw err; }
    }
  } finally {
    bot.removeListener('itemDrop', onDrop);
  }

  // drops that rolled away or fell into a hole: one more pass over what lies around
  await settleInventory(ctx);
  if (mined && dropNames.length && got() < mined) {
    const near = dropsNear(bot, 8).filter((e) => { try { return dropNames.includes(e.getDroppedItem?.()?.name); } catch { return false; } });
    if (near.length) {
      try { await collectDrops(ctx, near, SWEEP_MS / 2); } catch (err) { if (err instanceof SkillStop) throw err; }
      await settleInventory(ctx);
    }
  }
  // the server adds a picked-up item to the inventory a few ticks after the bot touches it: give those a moment
  for (let i = 0; i < 10 && mined && dropNames.length && got() < mined; i++) await ctx.sleep(150);
  const pickedNote = mined && dropNames.length && got() < mined
    ? `; picked up ${got()} ${dropNames.join('/')}, the rest lies on the ground nearby` : '';
  const total = offset + mined;
  if (mined >= n) return done(`mined ${total} ${block}${pickedNote}`);
  const why = misses >= MAX_MISSES ? `gave up after ${misses} blocks it could not mine${lastError ? `, last: ${lastError}` : ''}`
    : `no more ${station ? `${block} of yours` : block} within ${RADIUS} blocks${skip.size ? ' that you can reach' : ''}${ORE_HINT(block)}`;
  return fail(`mined ${total} of ${asked} ${block}${pickedNote}: ${why}`);
}
