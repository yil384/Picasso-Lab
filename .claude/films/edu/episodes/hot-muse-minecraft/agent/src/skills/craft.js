// src/skills/craft.js - craft: make n of an item from the inventory on the recipes minecraft-data has for the game
// version, in as many whole batches as the ingredients allow. A recipe that needs a crafting table uses one within 32
// blocks (walking to it) or places one from the inventory and picks it up again afterwards, as Mindcraft's
// craftRecipe skill does (github.com/mindcraft-bots/mindcraft, MIT License); rewritten for this body.

import { done, fail, walkNear, placeNearby, pickUp, pickUpNote, describeError, SkillStop } from './util.js';

const TABLE_RADIUS = 32;

/** Whole batches of a recipe the inventory can pay for. */
function affordable(bot, recipe) {
  let batches = Infinity;
  for (const d of recipe.delta) {
    if (d.count >= 0) continue;
    batches = Math.min(batches, Math.floor(bot.inventory.count(d.id, null) / -d.count));
  }
  return batches === Infinity ? 0 : batches;
}

/** What is missing for `batches` batches of a recipe: [{name, need}] (empty when nothing is). */
function missingFor(bot, recipe, batches) {
  const out = [];
  for (const d of recipe.delta) {
    if (d.count >= 0) continue;
    const need = -d.count * batches - bot.inventory.count(d.id, null);
    if (need > 0) out.push({ name: bot.registry.items[d.id]?.name ?? String(d.id), need });
  }
  return out;
}

// Ingredients of the usual early-game route; a hint naming these reads better than "cobbled_deepslate".
const COMMON = /^(oak_|cobblestone$|stick$|iron_ingot$)/;

/** The recipe variant closest to affordable; ties prefer common ingredients (oak, cobblestone) for a readable hint. */
function closest(bot, recipes, batches) {
  const total = (r) => missingFor(bot, r, batches).reduce((s, m) => s + m.need, 0);
  const common = (r) => -missingFor(bot, r, batches).filter((m) => COMMON.test(m.name)).length;
  return [...recipes].sort((a, b) => total(a) - total(b) || common(a) - common(b))[0];
}

const listMissing = (missing) => missing.map((m) => `${m.need} ${m.name}`).join(', ');

// minecraft-data lists tag recipes (any planks, any log) with one item only, usually oak. Add the same recipe for
// each wood the bot holds, so birch planks make sticks and tables; the server accepts any member of the tag.
const WOOD = /^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|pale_oak|bamboo|crimson|warped)_(planks|log)$/;
function woodVariants(bot, recipes) {
  const held = new Set(bot.inventory.items().map((i) => i.name));
  const out = [...recipes];
  for (const r of recipes) {
    const names = new Set(r.delta.filter((d) => d.count < 0).map((d) => bot.registry.items[d.id]?.name));
    for (const name of names) {
      const m = WOOD.exec(name ?? '');
      if (!m) continue;
      for (const h of held) {
        const w = WOOD.exec(h);
        if (!w || w[2] !== m[2] || h === name) continue;
        const from = bot.registry.itemsByName[name].id, to = bot.registry.itemsByName[h].id;
        const swap = (it) => (it && it.id === from ? Object.assign(Object.create(Object.getPrototypeOf(it)), it, { id: to }) : it);
        const v = Object.assign(Object.create(Object.getPrototypeOf(r)), r);
        v.delta = r.delta.map(swap);
        if (r.ingredients) v.ingredients = r.ingredients.map(swap);
        if (r.inShape) v.inShape = r.inShape.map((row) => row.map(swap));
        out.push(v);
      }
    }
  }
  return out;
}

/** craft {item, n} */
export async function craft(ctx, { item, n }) {
  const { bot } = ctx;
  const id = bot.registry.itemsByName[item]?.id;
  const all = id === undefined ? [] : woodVariants(bot, bot.recipesAll(id, null, true));
  if (!all.length) return fail(`there is no crafting recipe for ${item}`);

  const perBatch = (r) => r.result.count;
  const wanted = (r) => Math.ceil(n / perBatch(r));
  const canAfford = all.filter((r) => affordable(bot, r) > 0);
  if (!canAfford.length) {
    const r = closest(bot, all, wanted(all[0]));
    return fail(`not enough ingredients for ${item}: missing ${listMissing(missingFor(bot, r, wanted(r)))}`);
  }

  // Prefer a recipe that works without a table; otherwise the one that makes the most.
  const best = (list) => [...list].sort((a, b) => Math.min(affordable(bot, b), wanted(b)) * perBatch(b) - Math.min(affordable(bot, a), wanted(a)) * perBatch(a))[0];
  const inHand = canAfford.filter((r) => !r.requiresTable);
  let recipe = inHand.length ? best(inHand) : best(canAfford);
  let table = null;
  let placed = null;

  if (recipe.requiresTable) {
    const tableId = bot.registry.blocksByName.crafting_table.id;
    const found = bot.findBlock({ matching: tableId, maxDistance: TABLE_RADIUS });
    if (found) {
      try {
        await walkNear(ctx, found.position);
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        return fail(`could not reach the crafting table at ${found.position.x} ${found.position.y} ${found.position.z}: ${describeError(err)}`);
      }
      table = bot.blockAt(found.position);
    } else if (bot.inventory.items().some((i) => i.name === 'crafting_table')) {
      const r = await placeNearby(ctx, 'crafting_table');
      if (!r.ok) return fail(`${item} needs a crafting table and placing one failed: ${r.result}`);
      table = r.block;
      placed = r.block;
      ctx.stopNote(`a crafting table you placed is at ${placed.position.x} ${placed.position.y} ${placed.position.z}`);
    } else {
      return fail(`${item} needs a crafting table: none within ${TABLE_RADIUS} blocks and none in your inventory (craft crafting_table from 4 planks)`);
    }
    // the table is there now; recheck which table recipes the inventory pays for
    recipe = best(woodVariants(bot, bot.recipesFor(id, null, 1, table)).filter((r) => affordable(bot, r) > 0)) ?? recipe;
  }

  const batches = Math.min(affordable(bot, recipe), wanted(recipe));
  let made = 0;
  let error = null;
  try {
    // one batch at a time: several at once race the server's window updates ("missing ingredient", stray buttons)
    for (let b = 0; b < batches; b++) {
      await ctx.wait(bot.craft(recipe, 1, recipe.requiresTable ? table : null));
      made += perBatch(recipe);
      ctx.check();
    }
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    error = describeError(err);
  }
  ctx.check();

  let tableNote = '';
  if (placed) tableNote = pickUpNote(await pickUp(ctx, placed), 'crafting table', placed.position);

  if (error) return fail(`crafting ${item} failed: ${error}${tableNote}`);
  if (made >= n) return done(`crafted ${made} ${item}${tableNote}`);
  const short = missingFor(bot, recipe, Math.ceil((n - made) / perBatch(recipe)));
  return fail(`crafted ${made} of ${n} ${item}; for the rest you are missing ${listMissing(short)}${tableNote}`);
}
