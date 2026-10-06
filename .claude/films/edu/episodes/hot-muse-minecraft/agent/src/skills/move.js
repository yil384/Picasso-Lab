// src/skills/move.js - go_to: walk to a block position with mineflayer-pathfinder (it may dig or bridge small
// obstacles), limited to config.body.maxTravel blocks from where the bot stands.

import { Vec3 } from '../mc.js';
import { goals, done, fail, fmt, describeError, SkillStop } from './util.js';

/** go_to {x, y, z}: arrive within one block of the position. */
export async function goTo(ctx, { x, y, z }) {
  const { bot } = ctx;
  const target = new Vec3(x, y, z);
  const from = bot.entity.position;
  const far = from.distanceTo(target.offset(0.5, 0, 0.5));
  const max = ctx.config.body.maxTravel;
  if (far > max) return fail(`${fmt(target)} is ${Math.round(far)} blocks away; go_to is limited to ${max}`);
  if (far <= 1.5) return done(`already at ${fmt(target)}`);
  try {
    await ctx.goto(new goals.GoalNear(x, y, z, 1));
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    return fail(`could not reach ${fmt(target)}: ${describeError(err)} (now at ${fmt(bot.entity.position)})`);
  }
  const now = bot.entity.position;
  const left = now.distanceTo(target.offset(0.5, 0, 0.5));
  return left <= 2.5
    ? done(`arrived at ${fmt(now)}`)
    : fail(`stopped at ${fmt(now)}, ${Math.round(left)} blocks short of ${fmt(target)}`);
}
