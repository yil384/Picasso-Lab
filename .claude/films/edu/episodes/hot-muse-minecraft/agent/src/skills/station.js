// src/skills/station.js - the crafting tables and furnaces the skills work at (roadmap M2, S4). A station a bot placed
// stays where it stands and belongs to that bot (src/stations.js keeps the books): craft and smelt walk back to the
// nearest one they may use within REUSE_RADIUS (their own, or one nobody owns) before they put down another, never
// use one another bot owns, and say where the stations are.

import { REUSE_RADIUS, HARD_MAX } from '../stations.js';
import { fmt, fail, countOf, walkNear, placeNearby, describeError, SkillStop } from './util.js';

const pretty = (name) => name.replace(/_/g, ' ');
/** Why no more station may be put down (src/stations.js HARD_MAX, every station in use). */
export const noRoom = () => `you already keep ${HARD_MAX} crafting tables and furnaces and every one is in use (furnaces still smelting): wait until they finish, or take one back with collect`;
/**
 * A station is walked back to when it is at most WALK_BACK blocks away and at most CLIMB above or below the bot; one
 * farther, or up out of a mine, only when the bot carries none to put down and cannot make one: that walk costs more
 * than a table made from 4 planks.
 */
export const WALK_BACK = 16;
export const CLIMB = 4;

/** True when a station at pos is close enough to walk back to (see WALK_BACK). */
export function isClose(bot, pos) {
  const from = bot.entity.position;
  return pos.offset(0.5, 0.5, 0.5).distanceTo(from) <= WALK_BACK && Math.abs(pos.y - Math.floor(from.y)) <= CLIMB;
}

/** Planks carried, a log counted as 4. */
export function planksCarried(bot) {
  return bot.inventory.items().reduce((n, i) => n + (/_planks$/.test(i.name) ? i.count : /_log$/.test(i.name) ? 4 * i.count : 0), 0);
}

/**
 * Blocks of one station kind within radius this bot may use (its own, or nobody's), nearest first. Its own stations
 * the registry still lists but that are gone (mined, burnt) are forgotten on the way.
 */
export function findStations(ctx, name, radius = REUSE_RADIUS) {
  const { bot } = ctx;
  const id = bot.registry.blocksByName[name]?.id;
  if (id === undefined) return [];
  const st = ctx.stations ?? null;
  const from = bot.entity.position;
  st?.forgetGone(name, radius);
  let found = [];
  try { found = bot.findBlocks({ matching: id, maxDistance: radius, count: 16 }) ?? []; } catch { return []; }
  const d = (p) => p.offset(0.5, 0.5, 0.5).distanceTo(from);
  return found
    .filter((p) => !st || st.usable(p))
    .sort((a, b) => d(a) - d(b) || (st?.owns(b) ? 1 : 0) - (st?.owns(a) ? 1 : 0))
    .map((p) => bot.blockAt(p))
    .filter((b) => b && b.name === name);
}

/** Put a carried station down next to the bot and claim it. {ok, result, block, note} (note: a retired station). */
export async function placeStation(ctx, name) {
  if (ctx.stations?.room && !ctx.stations.room()) return fail(noRoom());
  const r = await placeNearby(ctx, name);
  if (!r.ok) return r;
  const note = ctx.stations?.claim(name, r.block.position) ?? '';
  return { ...r, note };
}

/**
 * Get to a station of this kind: a usable one within WALK_BACK (walking there), else the one carried (put down and
 * kept), else `make()` (crafts one into the inventory, e.g. a table from 4 planks) and put that down, else a usable
 * one farther away, within REUSE_RADIUS.
 * @param {object} ctx
 * @param {'crafting_table'|'furnace'} name
 * @param {{make?: () => Promise<{ok: boolean, result: string}>, avoid?: Set<string>}} [opts]  avoid: block keys not to use
 * @returns {Promise<{ok: true, block: object, placed: boolean, note: string} | {ok: false, result: string}>}
 */
export async function useStation(ctx, name, { make = null, avoid = null } = {}) {
  const { bot } = ctx;
  const what = pretty(name);
  const problems = [];
  const all = findStations(ctx, name).filter((b) => !avoid?.has(`${b.position.x},${b.position.y},${b.position.z}`));
  const tryWalk = async (list) => {
    for (const b of list.slice(0, 3)) {
      try {
        await walkNear(ctx, b.position);
        const now = bot.blockAt(b.position);
        if (now?.name === name) {
          ctx.stations?.use?.(now.position);
          const own = ctx.stations?.owns(now.position);
          return { ok: true, block: now, placed: false, note: own ? ` (at your ${what} at ${fmt(now.position)})` : '' };
        }
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        problems.push(`could not reach the ${what} at ${fmt(b.position)}: ${describeError(err)}`);
      }
    }
    return null;
  };
  // a station close by first; one farther away only when the bot has none to put down and cannot make one
  const close = await tryWalk(all.filter((b) => isClose(bot, b.position)));
  if (close) return close;
  const far = all.filter((b) => !isClose(bot, b.position));
  let made = '';
  if (!countOf(bot, name) && make) {
    const r = await make();
    if (!r.ok) {
      const there = await tryWalk(far);
      if (there) return there;
      return { ok: false, result: `none within ${REUSE_RADIUS} blocks and none in your inventory; making one failed: ${r.result}${problems.length ? `; ${problems[0]}` : ''}` };
    }
    made = r.result;
  }
  if (!countOf(bot, name)) {
    const there = await tryWalk(far);
    if (there) return there;
    return { ok: false, result: `none within ${REUSE_RADIUS} blocks and none in your inventory${problems.length ? `; ${problems[0]}` : ''}` };
  }
  const r = await placeStation(ctx, name);
  if (!r.ok) {
    const there = await tryWalk(far);
    if (there) return there;
    return { ok: false, result: `placing a ${what} failed: ${r.result}${problems.length ? `; ${problems[0]}` : ''}` };
  }
  ctx.stopNote?.(`a ${what} you placed is at ${fmt(r.block.position)}`);
  const how = made ? `${made}, then placed it` : 'placed a';
  return {
    ok: true,
    block: r.block,
    placed: true,
    note: ` (${made ? `${how} at` : `${how} ${what} at`} ${fmt(r.block.position)}; it stays there for your next ${name === 'furnace' ? 'smelts' : 'crafts'}${r.note})`,
  };
}
