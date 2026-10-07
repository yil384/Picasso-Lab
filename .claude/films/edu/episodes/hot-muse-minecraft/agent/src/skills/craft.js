// src/skills/craft.js - craft: make n of an item from the inventory on the recipes minecraft-data has for the game
// version, in as many whole batches as the ingredients allow. A recipe that needs a crafting table uses one within 32
// blocks (walking to it) or places one from the inventory and picks it up again afterwards, as Mindcraft's
// craftRecipe skill does (github.com/mindcraft-bots/mindcraft, MIT License); rewritten for this body. On a real server
// the clicks are planned on a window state the server confirmed and checked against it afterwards (window.js), never
// left to mineflayer's craft(), whose clicks race the server's resyncs (wrong items in the grid, ghost results).

import { done, fail, walkNear, placeNearby, pickUp, pickUpNote, describeError, SkillStop, timed } from './util.js';
import { canClick, clicker, openBlockWindow, closeCurrent, closeInventory, settleInventory, planPut, countIn, emptySlotIn } from './window.js';

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
    const carried = () => bot.inventory.items().some((i) => i.name === 'crafting_table');
    let unreachable = null;
    if (found) {
      try {
        await walkNear(ctx, found.position);
        table = bot.blockAt(found.position);
      } catch (err) {
        if (err instanceof SkillStop) throw err;
        unreachable = `could not reach the crafting table at ${found.position.x} ${found.position.y} ${found.position.z}: ${describeError(err)}`;
        if (!carried()) return fail(unreachable);
      }
    }
    if (!table && carried()) {
      // none nearby, or the one nearby is out of reach (behind a wall, in a cave): put down the one carried
      const r = await placeNearby(ctx, 'crafting_table');
      if (!r.ok) return fail(`${item} needs a crafting table and placing one failed: ${r.result}${unreachable ? `; ${unreachable}` : ''}`);
      table = r.block;
      placed = r.block;
      ctx.stopNote(`a crafting table you placed is at ${placed.position.x} ${placed.position.y} ${placed.position.z}`);
    } else if (!table) {
      return fail(`${item} needs a crafting table: none within ${TABLE_RADIUS} blocks and none in your inventory (craft crafting_table from 4 planks)`);
    }
    // the table is there now; recheck which table recipes the inventory pays for
    recipe = best(woodVariants(bot, bot.recipesFor(id, null, 1, table)).filter((r) => affordable(bot, r) > 0)) ?? recipe;
  }

  const batches = Math.min(affordable(bot, recipe), wanted(recipe));
  let made = 0;
  let error = null;
  try {
    if (canClick(bot)) {
      ({ made, error } = await craftByClicks(ctx, recipe, id, batches, recipe.requiresTable ? table : null, item));
    } else {
      // a bot without a protocol client (test/fake-bot.js): its craft() is exact, one batch at a time
      for (let b = 0; b < batches; b++) {
        await timed(ctx, 'clicks', () => ctx.wait(bot.craft(recipe, 1, recipe.requiresTable ? table : null)));
        made += perBatch(recipe);
      }
    }
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    error = describeError(err);
  }
  ctx.check();

  let tableNote = '';
  if (placed) tableNote = pickUpNote(await pickUp(ctx, placed), 'crafting table', placed.position);

  if (error) return fail(made ? `crafted ${made} of ${n} ${item}, then it failed: ${error}${tableNote}` : `crafting ${item} failed: ${error}${tableNote}`);
  if (made >= n) return done(`crafted ${made} ${item}${tableNote}`);
  const short = missingFor(bot, recipe, Math.ceil((n - made) / perBatch(recipe)));
  return fail(`crafted ${made} of ${n} ${item}; for the rest you are missing ${listMissing(short)}${tableNote}`);
}

/** Grid slots per ingredient id for a recipe in a w x w grid (slot 1 is the top left), or null if it does not fit. */
export function gridOf(recipe, w) {
  const out = new Map();
  const add = (id, slot) => out.set(id, [...(out.get(id) ?? []), slot]);
  if (recipe.inShape) {
    if (recipe.inShape.length > w || recipe.inShape.some((row) => row.length > w)) return null;
    recipe.inShape.forEach((row, y) => row.forEach((ing, x) => {
      if (ing && ing.id != null && ing.id !== -1) add(ing.id, 1 + x + w * y);
    }));
  } else {
    const list = (recipe.ingredients ?? []).filter((ing) => ing && ing.id != null && ing.id !== -1);
    if (list.length > w * w) return null;
    list.forEach((ing, i) => add(ing.id, 1 + i));
  }
  return out.size ? out : null;
}

const nameOf = (bot, it) => (it ? bot.registry.items[it.type]?.name ?? String(it.type) : 'nothing');

/**
 * Put the cursor and the crafting grid back into the inventory (leftovers of an earlier craft, or of this one). Returns
 * false when something stays in the grid (no room).
 */
async function clearGrid(ctx, c, w) {
  const win = c.window;
  if (win.selectedItem) {
    const slot = emptySlotIn(win);
    if (slot !== null) { await c.click(slot, 0, 0); await c.settle(); }
  }
  const busy = [];
  for (let s = 1; s <= w * w; s++) if (win.slots[s]) busy.push([s, 0, 1]);
  if (!busy.length) return true;
  await c.clicks(busy);
  await c.settle();
  for (let s = 1; s <= w * w; s++) if (win.slots[s]) return false;
  return true;
}

/**
 * Craft `batches` batches of a recipe by clicking: put k of each ingredient in its grid slots, check that the server
 * shows the result, shift-click it (the server crafts while the grid holds a full set), then count what arrived. Every
 * step is planned on a settled window, so the server and the client never disagree about the grid.
 * @returns {Promise<{made: number, error: string|null}>}
 */
async function craftByClicks(ctx, recipe, id, batches, table, item) {
  const { bot } = ctx;
  const w = table ? 3 : 2;
  const grid = gridOf(recipe, w);
  if (!grid) return { made: 0, error: `the recipe does not fit a ${w}x${w} grid` };
  const per = recipe.result.count;
  const maxPerSlot = Math.min(64, ...[...grid.keys()].map((ing) => bot.registry.items[ing]?.stackSize || 64));

  let opened = null;
  let window;
  if (table) {
    try {
      opened = await openBlockWindow(ctx, table, 'minecraft:crafting', 'crafting table');
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      await ctx.sleep(300); // a table placed a moment ago: try once more
      opened = await openBlockWindow(ctx, table, 'minecraft:crafting', 'crafting table');
    }
    window = opened.window;
  } else {
    closeCurrent(bot);
    window = bot.inventory;
  }

  let made = 0;
  let error = null;
  try {
    const c = clicker(ctx, window);
    await c.settle();
    if (!(await clearGrid(ctx, c, w))) error = 'the crafting grid holds items that do not fit back into your inventory';
    const start = countIn(window, id);
    let left = batches;
    while (left > 0 && !error) {
      const k = Math.min(left, maxPerSlot);
      const plan = [];
      for (const [ing, slots] of grid) {
        const p = planPut(window, ing, slots, k);
        if (!p) { error = `ran out of ${bot.registry.items[ing]?.name ?? ing} after ${made} ${item}`; break; }
        plan.push(...p);
      }
      if (error) break;
      await c.clicks(plan);
      await c.settle();
      const shown = window.slots[0];
      if (!shown || shown.type !== id) {
        error = `the server shows ${nameOf(bot, shown)} for this arrangement, not ${item}`;
        await clearGrid(ctx, c, w);
        break;
      }
      await c.click(0, 0, 1); // shift-click the result
      await c.settle();
      const got = countIn(window, id) - start - made;
      const roomy = await clearGrid(ctx, c, w);
      if (got <= 0) { error = emptySlotIn(window) === null ? 'your inventory is full' : 'the server did not hand over the result'; break; }
      made += got;
      left -= Math.ceil(got / per);
      if (got < k * per) error = emptySlotIn(window) === null || !roomy ? 'your inventory is full' : `the server made only ${got} of ${k * per}`;
    }
  } finally {
    // also on a stop or an error half way: the table's window, or the 2x2 grid of the player's own inventory, gives
    // back what is in its grid and on the cursor
    if (opened) opened.close();
    else closeInventory(bot);
  }
  await settleInventory(ctx);
  return { made, error };
}
