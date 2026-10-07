// src/skills/basic.js - the three small skills: get_state (read the state text), eat (the best safe food carried) and
// say (one chat line; never a command, never a character the server kicks for).

import { done, fail, equip } from './util.js';

// Foods that hurt (poison, hunger, nausea) or teleport the bot; never picked automatically.
const UNSAFE_FOOD = new Set(['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish', 'chicken', 'suspicious_stew', 'chorus_fruit']);

/** get_state {}: the plain-text state, at no game time. */
export async function getState(ctx) {
  return done(ctx.state());
}

/** eat {}: the safe food with the best food value + saturation, only when the food bar is below 20. */
export async function eat(ctx) {
  const { bot } = ctx;
  const before = bot.food;
  if (before >= 20) return fail('not hungry: food is 20/20');
  const foods = bot.registry.foodsByName;
  const carried = bot.inventory.items().filter((i) => foods[i.name]);
  const safe = carried.filter((i) => !UNSAFE_FOOD.has(i.name));
  if (!safe.length) {
    const unsafe = [...new Set(carried.map((i) => i.name))];
    return fail(unsafe.length
      ? `no safe food (you only carry ${unsafe.join(', ')}); cook meat in a furnace or craft bread`
      : 'no food in your inventory; kill a cow, pig, sheep or chicken and cook the meat');
  }
  const score = (name) => foods[name].effectiveQuality ?? foods[name].foodPoints + foods[name].saturation;
  const best = safe.reduce((a, b) => (score(b.name) > score(a.name) ? b : a));
  await equip(ctx, best.name);
  await ctx.wait(bot.consume());
  ctx.check();
  return done(`ate ${best.name}: food ${before} -> ${bot.food}`);
}

/**
 * say {text}: one chat message. The schema already forbids a leading "/" or space, "§" and control characters; this
 * checks again, so a schema change can never let a command or a kick-on-send character through.
 */
export async function say(ctx, { text }) {
  const line = String(text);
  if (/^\s*\//.test(line)) return fail('chat messages cannot be commands');
  // eslint-disable-next-line no-control-regex
  if (/[\u00a7\u0000-\u001f\u007f]/.test(line)) return fail('chat messages cannot contain § or control characters');
  ctx.bot.chat(line);
  return done(`said: ${line}`);
}
