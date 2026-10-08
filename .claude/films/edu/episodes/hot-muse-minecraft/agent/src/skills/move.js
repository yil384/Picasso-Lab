// src/skills/move.js - go_to: walk to a block position with mineflayer-pathfinder (it may dig or bridge small
// obstacles), limited to config.body.maxTravel blocks from where the bot stands. A long trip goes in hops of about
// HOP blocks across the surface: one path search over the whole way often runs out of thinking time ("the path search
// took too long"), short ones do not. A target well below the ground at its spot (measured from the ground there, not
// from where the bot stands: a target inside a hill is underground although the bot stands lower, and one on the floor
// of a valley is not) is reached down a spiral staircase dug in the 2x2 column at the target, one block per step: a
// straight shaft (what pathfinder digs on its own, slowly, as one search through solid stone) is a trap afterwards,
// the bot can only climb out by pillaring, which often fails.
// All legs share one progress watch (src/walk-watch.js): the trip ends, with what held it up, as soon as the bot
// stops getting closer, instead of digging by hand or pillaring in circles until the time limit. A step of the
// staircase is one block away: its path search is kept short and near (roadmap M2, S8), so a step that cannot be dug
// fails at once and the descent goes on a few blocks at a time instead.

import { Vec3 } from '../mc.js';
import { goals, done, fail, fmt, describeError, SkillStop } from './util.js';

const HOP = 40;
const DESCEND = 4;
/** The 2x2 spiral: cell offsets in walking order. */
const SPIRAL = [[0, 0], [1, 0], [1, 1], [0, 1]];
/** Not ground: what grows on it. */
const GROWTH = /(_leaves|_log|_wood|_stem|mushroom_block|vine)$/;

const flat = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** Path search for one step of the staircase (S8). */
const STEP_SEARCH = { thinkMs: 4_000, searchRadius: 16 };

/**
 * Feet height on the ground at column (x, z): one above the highest solid block that is not part of a tree, scanning
 * down from `from`. null when the column is not loaded (too far away).
 */
export function groundAt(bot, x, z, from) {
  for (let y = Math.min(from, 319); y > from - 96 && y > -64; y--) {
    const b = bot.blockAt(new Vec3(x, y, z));
    if (!b) return null;
    if (b.boundingBox === 'block' && !GROWTH.test(b.name)) return y + 1;
  }
  return null;
}

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

  const watch = ctx.walkWatch?.(() => bot.entity.position.distanceTo(centre)) ?? null;
  let lastError = null;
  const leg = async (goal, search = {}) => {
    if (watch?.error) return false;
    const before = bot.entity.position.distanceTo(centre);
    try {
      await ctx.goto(goal, { watch, ...search });
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
  // well below the ground there: get over the spot, then down a spiral staircase; where a step cannot be dug (water
  // or lava next to it, a cave below), down a few blocks at a time as pathfinder sees fit. A spot on the ground in a
  // valley below the bot is walked to (the column is not loaded: below the bot counts)
  const botY = Math.floor(bot.entity.position.y);
  const ground = groundAt(bot, x, z, Math.max(botY, y) + 48);
  if ((ground ?? botY) - y > 2 && !watch?.error) {
    if (flat(bot.entity.position, centre) > 3) await leg(new goals.GoalNearXZ(x, z, 2));
    const p0 = bot.entity.position;
    let i = SPIRAL.map(([dx, dz]) => Math.hypot(x + dx + 0.5 - p0.x, z + dz + 0.5 - p0.z)).reduce((b, d, k, a) => (d < a[b] ? k : b), 0);
    const feetY = () => Math.floor(bot.entity.position.y + 0.01);
    for (let n = 0; n < 200 && feetY() > y && !watch?.error; n++) {
      const feet = feetY();
      i = (i + 1) % SPIRAL.length;
      const [dx, dz] = SPIRAL[i];
      await leg(new goals.GoalBlock(x + dx, feet - 1, z + dz), STEP_SEARCH);
      if (feetY() >= feet) break; // that step did not go down
    }
    for (let k = 0; k < 40 && bot.entity.position.y - y > DESCEND + 1; k++) {
      const p = bot.entity.position;
      if (!(await leg(new goals.GoalNear(x, Math.floor(p.y) - DESCEND, z, 1)))) break;
    }
  }
  if (!watch?.error) {
    lastError = null;
    await leg(new goals.GoalNear(x, y, z, 1));
  }

  const now = bot.entity.position;
  const left = now.distanceTo(centre);
  if (left <= 2.5) return done(`arrived at ${fmt(now)}`);
  const err = watch?.error ?? lastError;
  const why = err ? `: ${describeError(err)}` : '';
  return fail(`could not reach ${fmt(target)}${why} (now at ${fmt(now)}, ${Math.round(left)} blocks short)`);
}
