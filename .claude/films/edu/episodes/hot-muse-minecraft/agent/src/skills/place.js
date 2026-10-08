// src/skills/place.js - place: put one block from the inventory at an exact position (air or a replaceable plant or
// liquid, next to a solid block), walking within reach first. The work is placeAt in util.js. A crafting table or
// furnace placed here belongs to the bot like the ones craft and smelt put down (src/stations.js); a block still in
// the bot's furnaces (stone, glass from a background smelt) is fetched first.

import { Vec3 } from '../mc.js';
import { STATION_BLOCKS } from '../stations.js';
import { done, fail, countOf, fmt, placeAt } from './util.js';
import { pendingFor, fetchSmelted } from './smelt.js';
import { noRoom } from './station.js';

/** place {block, pos: {x, y, z}} */
export async function place(ctx, { block, pos }) {
  const { bot } = ctx;
  const target = new Vec3(pos.x, pos.y, pos.z);
  // run on after a reflex: the first try may have placed it already
  if (ctx.resumed && bot.blockAt(target)?.name === block) return done(`placed ${block} at ${fmt(target)}`);
  let fetched = '';
  if (!countOf(bot, block) && pendingFor(ctx, new Set([block]))) fetched = await fetchSmelted(ctx, { only: new Set([block]), wait: true });
  if (!countOf(bot, block)) return fail(`you have no ${block}${fetched}`);
  const far = bot.entity.position.distanceTo(target);
  const max = ctx.config.body.maxTravel;
  if (far > max) return fail(`${fmt(target)} is ${Math.round(far)} blocks away; place works within ${max}`);
  if (STATION_BLOCKS.includes(block) && ctx.stations?.room && !ctx.stations.room()) return fail(noRoom());
  const r = await placeAt(ctx, block, target);
  if (r.ok && STATION_BLOCKS.includes(block)) r.result += ctx.stations?.claim(block, target) ?? '';
  if (fetched) r.result += fetched;
  return r;
}
