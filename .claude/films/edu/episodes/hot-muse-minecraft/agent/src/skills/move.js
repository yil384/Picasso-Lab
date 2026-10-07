// src/skills/move.js - go_to: walk to a block position with mineflayer-pathfinder (it may dig or bridge small
// obstacles), limited to config.body.maxTravel blocks from where the bot stands. A long trip goes in hops of about
// HOP blocks across the surface: one path search over the whole way often runs out of thinking time ("the path search
// took too long"), short ones do not. A target well below is reached down a spiral staircase dug in the 2x2 column
// at the target, one block per step: a straight shaft (what pathfinder digs on its own, slowly, as one search through
// solid stone) is a trap afterwards, the bot can only climb out by pillaring, which often fails.

import { Vec3 } from '../mc.js';
import { goals, done, fail, fmt, describeError, SkillStop } from './util.js';

const HOP = 40;
const DESCEND = 4;
/** The 2x2 spiral: cell offsets in walking order. */
const SPIRAL = [[0, 0], [1, 0], [1, 1], [0, 1]];

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** go_to {x, y, z}: arrive within one block of the position. */
export async function goTo(ctx, { x, y, z }) {
  const { bot } = ctx;
  const target = new Vec3(x, y, z);
  const centre = target.offset(0.5, 0, 0.5);
  const from = bot.entity.position;
  const far = from.distanceTo(centre);
  const max = ctx.config.body.maxTravel;
  if (far > max) return fail(`${fmt(target)} is ${Math.round(far)} blocks away; go_to is limited to ${max}`);
  if (far <= 1.5) return done(`already at ${fmt(target)}`);

  let lastError = null;
  const leg = async (goal) => {
    const before = bot.entity.position.distanceTo(centre);
    try {
      await ctx.goto(goal);
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      lastError = err;
    }
    return bot.entity.position.distanceTo(centre) < before - 1; // got closer
  };

  // across the surface: hops toward the target until it is within one hop
  for (let i = 0; i < 12 && flat(bot.entity.position, centre) > HOP + 8; i++) {
    const p = bot.entity.position;
    const d = flat(p, centre);
    const hx = Math.floor(p.x + ((centre.x - p.x) * HOP) / d);
    const hz = Math.floor(p.z + ((centre.z - p.z) * HOP) / d);
    if (!(await leg(new goals.GoalNearXZ(hx, hz, 3)))) break;
  }
  // well below: get over the spot, then down a spiral staircase; where a step cannot be dug (water or lava next to
  // it, a cave below), down a few blocks at a time as pathfinder sees fit
  if (bot.entity.position.y - y > 2) {
    if (flat(bot.entity.position, centre) > 3) await leg(new goals.GoalNearXZ(x, z, 2));
    const p0 = bot.entity.position;
    let i = SPIRAL.map(([dx, dz]) => Math.hypot(x + dx + 0.5 - p0.x, z + dz + 0.5 - p0.z)).reduce((b, d, k, a) => (d < a[b] ? k : b), 0);
    const feetY = () => Math.floor(bot.entity.position.y + 0.01);
    for (let n = 0; n < 200 && feetY() > y; n++) {
      const feet = feetY();
      i = (i + 1) % SPIRAL.length;
      const [dx, dz] = SPIRAL[i];
      await leg(new goals.GoalBlock(x + dx, feet - 1, z + dz));
      if (feetY() >= feet) break; // that step did not go down
    }
    for (let k = 0; k < 40 && bot.entity.position.y - y > DESCEND + 1; k++) {
      const p = bot.entity.position;
      if (!(await leg(new goals.GoalNear(x, Math.floor(p.y) - DESCEND, z, 1)))) break;
    }
  }
  lastError = null;
  await leg(new goals.GoalNear(x, y, z, 1));

  const now = bot.entity.position;
  const left = now.distanceTo(centre);
  if (left <= 2.5) return done(`arrived at ${fmt(now)}`);
  const why = lastError ? `: ${describeError(lastError)}` : '';
  return fail(`could not reach ${fmt(target)}${why} (now at ${fmt(now)}, ${Math.round(left)} blocks short)`);
}
