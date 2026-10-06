// src/skills/place.js - place: put one block from the inventory at an exact position (air or a replaceable plant or
// liquid, next to a solid block), walking within reach first. The work is placeAt in util.js.

import { Vec3 } from '../mc.js';
import { fail, countOf, fmt, placeAt } from './util.js';

/** place {block, pos: {x, y, z}} */
export async function place(ctx, { block, pos }) {
  const { bot } = ctx;
  if (!countOf(bot, block)) return fail(`you have no ${block}`);
  const target = new Vec3(pos.x, pos.y, pos.z);
  const far = bot.entity.position.distanceTo(target);
  const max = ctx.config.body.maxTravel;
  if (far > max) return fail(`${fmt(target)} is ${Math.round(far)} blocks away; place works within ${max}`);
  return placeAt(ctx, block, target);
}
