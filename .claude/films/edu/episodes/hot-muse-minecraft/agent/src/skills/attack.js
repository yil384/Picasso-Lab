// src/skills/attack.js - attack: fight the closest mob of one kind within 16 blocks (nearest_hostile: the closest
// hostile mob) with the best weapon carried, until it dies, gets away or the swing limit is reached. Players are never
// targets: the filter rejects them before the name is even compared.

import { done, fail, goals, describeError, SkillStop, vec } from './util.js';

const FIND_RADIUS = 16;
const ESCAPE_RADIUS = 24;
const MAX_SWINGS = 40;
/** Walks toward the mob in a row that end no closer before the bot gives up (it is on a ledge, across water...). */
const MAX_STUCK_CHASES = 3;
const WEAPONS = ['netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword', 'golden_sword', 'wooden_sword',
  'netherite_axe', 'diamond_axe', 'iron_axe', 'stone_axe', 'golden_axe', 'wooden_axe'];

/** Ticks to wait between swings for a full-strength hit with what is held. */
const cooldownTicks = (held) => (held?.endsWith('_sword') ? 12 : held?.endsWith('_axe') ? 20 : 5);

/** The entity filter for a target name. Only mobs from the registry's mob categories; never players. */
function matcher(bot, target) {
  return (e) => {
    if (!e || e === bot.entity || e.type === 'player' || e.isValid === false || !e.position) return false;
    const category = bot.registry.entitiesByName[e.name]?.category;
    if (category !== 'Hostile mobs' && category !== 'Passive mobs') return false;
    if (target === 'nearest_hostile' ? category !== 'Hostile mobs' : e.name !== target) return false;
    return e.position.distanceTo(bot.entity.position) <= FIND_RADIUS;
  };
}

/** attack {target} */
export async function attack(ctx, { target }) {
  const { bot } = ctx;
  const mob = bot.nearestEntity(matcher(bot, target));
  if (!mob) return fail(target === 'nearest_hostile' ? `no hostile mob within ${FIND_RADIUS} blocks` : `no ${target} within ${FIND_RADIUS} blocks`);
  const name = mob.name;

  const weapon = WEAPONS.map((w) => bot.inventory.items().find((i) => i.name === w)).find(Boolean);
  if (weapon && bot.heldItem?.name !== weapon.name) await ctx.wait(bot.equip(weapon, 'hand'));

  let dead = false;
  const onDead = (e) => { if (e === mob || e?.id === mob.id) dead = true; };
  bot.on('entityDead', onDead);
  const gone = () => dead || mob.isValid === false || !bot.entities[mob.id] || (Number.isFinite(mob.health) && mob.health <= 0);
  let swings = 0;
  let stuck = 0;
  let lastPos = mob.position.clone();
  try {
    while (!gone()) {
      ctx.check();
      if (swings >= MAX_SWINGS) return fail(`the ${name} is still alive after ${swings} swings`);
      lastPos = mob.position.clone();
      const d = mob.position.distanceTo(bot.entity.position);
      if (d > ESCAPE_RADIUS) return fail(`the ${name} got away`);
      if (d > 3) {
        const p = vec(mob.position);
        try {
          await ctx.goto(new goals.GoalNear(p.x, p.y, p.z, 2));
        } catch (err) {
          if (err instanceof SkillStop) throw err;
          return fail(`could not reach the ${name}: ${describeError(err)}`);
        }
        // pathfinder can settle without getting closer (an empty path): count walks that gain less than half a block
        const after = mob.position.distanceTo(bot.entity.position);
        stuck = after > 3 && after > d - 0.5 ? stuck + 1 : 0;
        if (stuck >= MAX_STUCK_CHASES) return fail(`could not reach the ${name} (still ${Math.round(after)} blocks away)`);
        continue;
      }
      await ctx.wait(bot.lookAt(mob.position.offset(0, (mob.height ?? 1) * 0.8, 0), true));
      bot.attack(mob);
      swings += 1;
      await ctx.wait(bot.waitForTicks(cooldownTicks(bot.heldItem?.name)));
    }
  } finally {
    bot.removeListener('entityDead', onDead);
  }
  ctx.check();

  // Walk over the spot to pick up the drops (best effort).
  try {
    const p = vec(lastPos);
    if (lastPos.distanceTo(bot.entity.position) > 1.5) await ctx.goto(new goals.GoalNear(p.x, p.y, p.z, 1));
    await ctx.wait(bot.waitForTicks(10));
  } catch (err) {
    if (err instanceof SkillStop) throw err;
  }
  return done(`killed the ${name} in ${swings} swing${swings === 1 ? '' : 's'}`);
}
