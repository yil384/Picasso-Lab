// src/skills/craft.js - craft: make n of an item from the inventory on the recipes minecraft-data has for the game
// version, in as many whole batches as the ingredients allow. A recipe that needs a crafting table uses the nearest one
// the bot may use within 24 blocks (its own, or one nobody owns; walking to it), or puts the carried one down, or makes
// one from 4 planks and puts that down; a table the bot placed stays where it is for its next crafts (src/stations.js:
// it belongs to the bot, no other bot uses it, and it goes when the game ends). Items still in the bot's furnaces
// (a background smelt) are fetched first when the recipe needs them. Finding or placing a table follows Mindcraft's
// craftRecipe skill (github.com/mindcraft-bots/mindcraft, MIT License); rewritten for this body. On a real server the
// clicks are planned on a window state the server confirmed and checked against it afterwards (window.js), never left
// to mineflayer's craft(), whose clicks race the server's resyncs (wrong items in the grid, ghost results).

import { done, fail, countOf, describeError, SkillStop, timed } from './util.js';
import { useStation, planksCarried } from './station.js';
import { fetchSmelted, pendingFor } from './smelt.js';
import { canClick, clicker, openBlockWindow, closeCurrent, closeInventory, settleInventory, planPut, countIn, emptySlotIn } from './window.js';

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

/**
 * True when the planks (and logs, at 4 planks each) carried pay for a crafting table and still for `batches` of the
 * recipe: a table is never made from planks the craft itself needs.
 */
function tableAffordable(bot, recipe, batches) {
  const planks = planksCarried(bot);
  const need = recipe.delta.filter((d) => d.count < 0 && /_planks$/.test(bot.registry.items[d.id]?.name ?? '')).reduce((n, d) => n - d.count * batches, 0);
  return planks >= 4 + need;
}

/** A crafting table into the inventory from 4 planks of one wood (from a log first if need be): useStation's make. */
async function makeTable(ctx) {
  const { bot } = ctx;
  const planks = bot.inventory.items().filter((i) => /_planks$/.test(i.name)).map((i) => i.name);
  const enough = [...new Set(planks)].find((name) => countOf(bot, name) >= 4);
  if (!enough) {
    const log = bot.inventory.items().find((i) => /_log$/.test(i.name));
    if (!log) return fail('you need 4 planks of one wood (or a log) for a crafting table');
    const r = await craftItem(ctx, `${log.name.replace(/_log$/, '')}_planks`, 4, { progress: false });
    if (!r.ok) return r;
  }
  const r = await craftItem(ctx, 'crafting_table', 1, { progress: false });
  if (!r.ok) return fail(r.result);
  return done('made a crafting table from 4 planks');
}

/** craft {item, n}; after an interruption (ctx.resumed: what the first try made) only what is still missing. */
export async function craft(ctx, { item, n }) {
  const before = ctx.resumed?.made ?? 0;
  return craftItem(ctx, item, Math.max(1, n - before), { offset: before, asked: n });
}

/**
 * Make n of an item: the work of craft, also used by smelt (furnaces) and for a table. offset / asked: items made
 * before an interruption and the number first asked for (result text); progress: report what was made to the body.
 */
export async function craftItem(ctx, item, n, { offset = 0, asked = n + offset, progress = true } = {}) {
  const { bot } = ctx;
  const report = (made) => { if (progress) ctx.progress?.({ made }); };
  const id = bot.registry.itemsByName[item]?.id;
  const recipesOf = () => (id === undefined ? [] : woodVariants(bot, bot.recipesAll(id, null, true)));
  let all = recipesOf();
  if (!all.length) return fail(`there is no crafting recipe for ${item}`);

  const perBatch = (r) => r.result.count;
  const wanted = (r) => Math.ceil(n / perBatch(r));
  const missingNow = () => { const r = closest(bot, all, wanted(all[0])); return missingFor(bot, r, wanted(r)); };
  let fetched = '';
  // what is missing may still be in the bot's furnaces (a background smelt): fetch it first
  const need = new Set(missingNow().map((m) => m.name));
  if (need.size && pendingFor(ctx, need)) {
    fetched = await fetchSmelted(ctx, { only: need, wait: true });
    all = recipesOf();
  }
  const canAfford = all.filter((r) => affordable(bot, r) > 0);
  if (!canAfford.length) {
    const r = closest(bot, all, wanted(all[0]));
    return fail(`not enough ingredients for ${item}: missing ${listMissing(missingFor(bot, r, wanted(r)))}${fetched}`);
  }

  // Prefer a recipe that works without a table; otherwise the one that makes the most.
  const best = (list) => [...list].sort((a, b) => Math.min(affordable(bot, b), wanted(b)) * perBatch(b) - Math.min(affordable(bot, a), wanted(a)) * perBatch(a))[0];
  const inHand = canAfford.filter((r) => !r.requiresTable);
  let recipe = inHand.length ? best(inHand) : best(canAfford);
  let table = null;
  let tableNote = '';

  if (recipe.requiresTable) {
    const make = tableAffordable(bot, recipe, Math.min(affordable(bot, recipe), wanted(recipe))) ? () => makeTable(ctx) : null;
    const st = await useStation(ctx, 'crafting_table', { make });
    if (!st.ok) return fail(`${item} needs a crafting table: ${st.result}${/making one failed/.test(st.result) ? '' : ' (craft crafting_table from 4 planks)'}${fetched}`);
    table = st.block;
    tableNote = st.note;
    // the table is there now; recheck which table recipes the inventory pays for (making a table used planks)
    recipe = best(woodVariants(bot, bot.recipesFor(id, null, 1, table)).filter((r) => affordable(bot, r) > 0)) ?? recipe;
    if (!affordable(bot, recipe)) return fail(`not enough ingredients for ${item}: missing ${listMissing(missingFor(bot, recipe, wanted(recipe)))}${fetched}${tableNote}`);
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
        report(offset + made);
      }
    }
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    error = describeError(err);
  }
  report(offset + made);
  ctx.check();

  const total = offset + made;
  const notes = `${fetched}${tableNote}`;
  if (error) return fail(total ? `crafted ${total} of ${asked} ${item}, then it failed: ${error}${notes}` : `crafting ${item} failed: ${error}${notes}`);
  if (made >= n) return done(`crafted ${total} ${item}${notes}`);
  const left = missingFor(bot, recipe, Math.ceil((n - made) / perBatch(recipe)));
  return fail(`crafted ${total} of ${asked} ${item}; for the rest you are missing ${listMissing(left)}${notes}`);
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
 * step is planned on a settled window, so the server and the client never disagree about the grid. Settles that add
 * nothing are skipped (roadmap M2, S10): none before the first clicks on a window the server has just sent whole (a
 * table that just opened, the player inventory synced a moment ago and untouched since), and after the last
 * shift-click the window is closed at once and one settle of the player inventory counts the result (closing hands
 * back anything left in the grid, which a separate clearing pass did before).
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

  const inInventory = () => countIn(bot.inventory, id);
  const before = inInventory();
  let made = 0;
  let error = null;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (opened) opened.close();
    else closeInventory(bot);
  };
  try {
    const c = clicker(ctx, window);
    if (!opened && !c.fresh()) await c.settle();
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
      if (left - k <= 0) {
        // the last batch: close the window now (the server crafts on the click, then hands back what is left in the
        // grid and on the cursor) and count the result in the player inventory once the server has synced it
        close();
        // the 2x2 grid is part of the player inventory: its resync after the shift-click is the one to wait for
        if (opened) await settleInventory(ctx); else await c.settle();
        const got = inInventory() - before - made;
        if (got <= 0) { error = emptySlotIn(bot.inventory) === null ? 'your inventory is full' : 'the server did not hand over the result'; break; }
        made += got;
        left -= Math.ceil(got / per);
        if (got < k * per) error = emptySlotIn(bot.inventory) === null ? 'your inventory is full' : `the server made only ${got} of ${k * per}`;
        break;
      }
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
    if (!closed) {
      close();
      closed = 'late';
    }
  }
  if (closed === 'late') await settleInventory(ctx);
  return { made, error };
}
