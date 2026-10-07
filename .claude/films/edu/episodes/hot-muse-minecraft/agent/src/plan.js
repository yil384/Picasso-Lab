// src/plan.js - the dry-run check the MCP endpoint runs before it queues a play or play_sequence (ROADMAP M2): the
// inventory is simulated through the steps with the game's own recipes (minecraft-data 1.21.4 through
// prismarine-recipe, the variants the craft skill chooses from), the furnace rules of the smelt skill and the drops
// of collect. A step that cannot work is found before anything runs, with what is missing; planks (from logs), sticks
// (from planks), and a crafting table or a furnace a step needs, are added as craft steps instead when what the bot
// carries (or what earlier steps bring) can make them. It reads no game state itself: the inventory and the station
// lookups are passed in.

import { registryFor, requireMc } from './mc.js';
import { SMELT, FUEL, PLANKS, LOGS, WOODS, blueprintBlockCount } from './game.js';
import { SMELT_PER_CALL, CRAFT_BATCH_MAX } from './contracts.js';

// the smelt skill's fuel order (src/skills/smelt.js chooseFuel): cheapest first, coal before wood, planks before logs
const FUEL_ORDER = ['coal', 'charcoal', 'coal_block', ...PLANKS, 'stick', ...LOGS];
const WOOD_PLANKS = /^(.+)_planks$/;
const WOOD_SET = new Set(WOODS);
/** Blocks that drop more than one item (the most they give: the check is optimistic about what a step brings). */
const DROP_COUNT = { clay: 4, copper_ore: 5, deepslate_copper_ore: 5 };
/** Blocks whose drop is left to chance: counted as nothing (collect does the same). */
const CHANCE = /^(short_grass|.*_leaves)$/;
// ingredients a missing-items hint should name first, as the craft skill does
const COMMON = /^(oak_|cobblestone$|stick$|iron_ingot$)/;
const TIERS = ['wooden', 'stone', 'golden', 'iron', 'diamond', 'netherite'];

/**
 * @typedef {{skill: string, args: object}} Step
 * @typedef {{skill: string, args: object, step: number|null, added?: string, addedItems?: Array<{item: string, n: number}>}} PlannedStep
 *   step: the 1-based index in the caller's list (null for a step the check added); added: why it was added;
 *   addedItems: items the check put into a craft_batch's list
 * @typedef {{step: number, item: string, need: number, for?: string, anyWood?: true, note?: string}} Missing
 * @typedef {{ok: boolean, steps: PlannedStep[], missing: Missing[], added: number}} Plan
 */

/**
 * @param {{version?: string}} [opts]
 * @returns {{check: (steps: Step[], world?: {inventory?: Record<string, number>, table?: boolean|null|(() => boolean|null), furnace?: boolean|null|(() => boolean|null), before?: Step[]}) => Plan}}
 *   table / furnace: whether one stands within reach (null: unknown, taken as yes), or a function asked only when a
 *   step needs one and the bot carries none
 */
export function createPlanner({ version = '1.21.4' } = {}) {
  const reg = registryFor(version);
  const { Recipe } = requireMc('prismarine-recipe')(reg);
  const itemName = (id) => reg.items[id]?.name;
  const cache = new Map();

  /**
   * The recipe variants for an item: {table, out, need: [[name, count]], wood}. all: every variant (what the craft
   * skill may use); list: without the woods the bot never collects (bamboo, crimson...), for planning and hints.
   */
  function variants(item) {
    if (!cache.has(item)) {
      const id = reg.itemsByName[item]?.id;
      const all = id === undefined ? [] : Recipe.find(id, null).map((r) => {
        const need = r.delta.filter((d) => d.count < 0).map((d) => [itemName(d.id), -d.count]);
        const woodOf = (n) => WOOD_PLANKS.exec(n)?.[1] ?? /^(.+)_log$/.exec(n)?.[1] ?? null;
        const named = need.map(([n]) => woodOf(n)).filter(Boolean);
        return { table: Boolean(r.requiresTable), out: r.result.count, need, wood: named.find((w) => WOOD_SET.has(w)) ?? null, foreign: named.some((w) => !WOOD_SET.has(w)) };
      });
      const anyWood = new Set(all.map((v) => v.wood).filter(Boolean)).size > 1;
      cache.set(item, { anyWood, all, list: all.filter((v) => !v.foreign) });
    }
    return cache.get(item);
  }

  const have = (st, item) => st.inv.get(item) ?? 0;
  const add = (st, item, k) => { if (k) st.inv.set(item, have(st, item) + k); };
  const clone = (st) => ({ ...st, inv: new Map(st.inv) });
  // a station carried counts at once; one standing within reach is looked up only when a step needs it (a scan)
  const hasTable = (st) => have(st, 'crafting_table') > 0 || st.table() !== false;
  const hasFurnace = (st) => have(st, 'furnace') > 0 || st.furnace() !== false;
  /** The wood the bot holds most of (planks, or logs that make 4 each); oak when none. */
  function bestWood(st) {
    let best = 'oak';
    let score = 0;
    for (const w of WOODS) {
      const s = have(st, `${w}_planks`) + 4 * have(st, `${w}_log`);
      if (s > score) { best = w; score = s; }
    }
    return best;
  }

  /** One craft in the simulation: pay, receive, and (ops given) record it as a step to add. */
  function craftOp(st, ops, item, n, pay, why) {
    for (const [ing, c] of pay) add(st, ing, -c);
    add(st, item, n);
    ops?.push({ item, n, why });
  }

  /**
   * Make sure st holds the counts of `need` (one recipe's ingredients), crafting sticks from planks and planks from
   * logs as needed (the sticks' planks are counted with the recipe's own, so the logs are cut once). What cannot be
   * made goes to miss and is granted, so the simulation can go on and find what else is missing.
   */
  function ensureAll(st, need, ops, miss, { anyWood = false, forItem = null, wood = null } = {}) {
    const want = new Map(need);
    const why = forItem;
    let sticks = 0;
    let stickPlanks = null;
    const stickShort = (want.get('stick') ?? 0) - have(st, 'stick');
    if (stickShort > 0) {
      sticks = Math.ceil(stickShort / 4);
      stickPlanks = `${wood ?? bestWood(st)}_planks`;
      want.set(stickPlanks, (want.get(stickPlanks) ?? 0) + 2 * sticks);
    }
    for (const [item, c] of want) {
      const m = WOOD_PLANKS.exec(item);
      if (!m || !WOOD_SET.has(m[1])) continue;
      const short = c - have(st, item);
      if (short <= 0) continue;
      const logs = Math.ceil(short / 4);
      const log = `${m[1]}_log`;
      const lack = logs - have(st, log);
      if (lack > 0) {
        miss({ item: log, need: lack, ...(forItem ? { for: forItem } : {}), ...(anyWood || item === stickPlanks ? { anyWood: true } : {}), ...otherLogs(st, log, anyWood || item === stickPlanks) });
        add(st, log, lack);
      }
      craftOp(st, ops, item, 4 * logs, [[log, logs]], why);
    }
    if (sticks) craftOp(st, ops, 'stick', 4 * sticks, [[stickPlanks, 2 * sticks]], why);
    for (const [item, c] of need) {
      const short = c - have(st, item);
      if (short > 0) {
        miss({ item, need: short, ...(forItem ? { for: forItem } : {}), ...(/_log$/.test(item) ? otherLogs(st, item, anyWood) : {}) });
        add(st, item, short);
      }
    }
  }

  /** A hint for a missing log when the recipe wants that wood only and the bot carries another. */
  function otherLogs(st, log, anyWood) {
    if (anyWood) return {};
    const other = LOGS.find((l) => l !== log && have(st, l) > 0);
    return other ? { note: `this recipe takes ${log} only; you carry ${other}` } : {};
  }

  /** a before b, comparing key arrays left to right */
  const less = (a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
    return false;
  };

  /**
   * Craft n of item in the simulation, the way the craft skill would: a variant the inventory pays for as it is (one
   * that needs no table first), else the variant the fewest added crafts complete (the wood the bot holds most of,
   * then oak and cobblestone), else the one closest to affordable, whose shortfall goes to miss. A table recipe with
   * no table nearby or carried gets a crafting table craft first. ops collects the crafts to add before this one;
   * forItem is the item they serve; insert: this craft is one of them (a table, a furnace), so it goes to ops too.
   */
  function simCraft(st, item, n, ops, miss, forItem = item, insert = false) {
    const { all, list, anyWood } = variants(item);
    if (!all.length) { miss({ item, need: n, note: `there is no crafting recipe for ${item}` }); add(st, item, n); return; }
    const batches = (v) => Math.ceil(n / v.out);
    const lacks = (v) => v.need.reduce((sum, [ing, c]) => sum + Math.max(0, c * batches(v) - have(st, ing)), 0);
    let pick = all.filter((v) => lacks(v) === 0 && (!v.table || hasTable(st))).sort((a, b) => a.table - b.table)[0];
    if (!pick) {
      // each variant on a copy: a table first if it needs one, then the planks and sticks it lacks
      let best = null;
      const wood = bestWood(st);
      for (const v of list.length ? list : all) {
        const s = clone(st);
        const o = [];
        const m = [];
        if (v.table && !hasTable(s)) simCraft(s, 'crafting_table', 1, o, (x) => m.push(x), forItem, true);
        ensureAll(s, v.need.map(([ing, c]) => [ing, c * batches(v)]), o, (x) => m.push(x), { anyWood, forItem, wood: v.wood });
        const key = [m.reduce((sum, x) => sum + x.need, 0), o.length, v.wood && v.wood !== wood ? 1 : 0, -v.need.filter(([ing]) => COMMON.test(ing)).length];
        if (!best || less(key, best.key)) best = { v, s, o, m, key };
      }
      pick = best.v;
      st.inv = best.s.inv;
      ops?.push(...best.o);
      for (const x of best.m) miss(x);
    }
    craftOp(st, insert ? ops : null, item, pick.out * batches(pick), pick.need.map(([ing, c]) => [ing, c * batches(pick)]), forItem);
  }

  /** The smelt skill's fuel choice: the first fuel in FUEL_ORDER that covers every item, else the one covering most. */
  function chooseFuel(st, input, want) {
    let best = null;
    for (const name of FUEL_ORDER) {
      if (name === input) continue;
      const k = have(st, name);
      const covers = Math.floor(k * FUEL[name]);
      if (covers < 1) continue;
      if (covers >= want) return { name, units: Math.ceil(want / FUEL[name]), covers: want };
      if (!best || covers > best.covers) best = { name, units: k, covers };
    }
    return best;
  }

  /** Smelt as the smelt skill does: at most SMELT_PER_CALL items, a furnace nearby or carried, one fuel. */
  function simSmelt(st, { item, n }, ops, miss) {
    const want = Math.min(n, SMELT_PER_CALL);
    const lack = want - have(st, item);
    if (lack > 0) { miss({ item, need: lack }); add(st, item, lack); }
    if (!hasFurnace(st)) simCraft(st, 'furnace', 1, ops, (x) => miss({ ...x, for: 'a furnace' }), 'a furnace', true);
    const fuel = chooseFuel(st, item, want);
    if (fuel) add(st, fuel.name, -fuel.units);
    const left = want - (fuel?.covers ?? 0);
    if (left > 0) miss({ item: 'coal', need: Math.ceil(left / FUEL.coal), note: `fuel for ${left} more ${item}: coal or charcoal (1 per 8 items), or planks or logs (2 per 3 items)` });
    add(st, item, -want);
    add(st, SMELT[item], want);
  }

  /** Collect: the harvest tool must be carried; the drops come in (the most a block gives). */
  function simCollect(st, { block, n }, miss) {
    const def = reg.blocksByName[block];
    if (!def) return;
    if (def.harvestTools && !Object.keys(def.harvestTools).some((id) => have(st, itemName(Number(id))) > 0)) {
      const tools = Object.keys(def.harvestTools).map((id) => itemName(Number(id))).filter(Boolean)
        .sort((a, b) => TIERS.findIndex((t) => a.startsWith(`${t}_`)) - TIERS.findIndex((t) => b.startsWith(`${t}_`)));
      miss({ item: tools[0], need: 1, note: `${block} drops nothing without ${tools.length > 1 ? `${tools[0]} or a better one` : 'it'}` });
    }
    if (CHANCE.test(block)) return;
    const d = def.drops?.[0];
    const drop = itemName(typeof d === 'number' ? d : d?.drop?.id ?? d?.id);
    if (drop) add(st, drop, n * (DROP_COUNT[block] ?? 1));
  }

  /** One step in the simulation; returns the step as it will run (craft_batch with its added items). */
  function simStep(st, step, ops, miss) {
    const { skill, args } = step;
    if (skill === 'craft') simCraft(st, args.item, args.n, ops, miss);
    else if (skill === 'craft_batch') {
      const items = [];
      const addedItems = [];
      for (const { item, n } of args.items) {
        const inner = [];
        simCraft(st, item, n, inner, miss);
        for (const o of tidy(inner)) { items.push({ item: o.item, n: o.n }); addedItems.push({ item: o.item, n: o.n, for: o.why }); }
        items.push({ item, n });
      }
      return addedItems.length ? { skill, args: { items }, addedItems } : null;
    } else if (skill === 'smelt') simSmelt(st, args, ops, miss);
    else if (skill === 'collect') simCollect(st, args, miss);
    else if (skill === 'place') { ensureAll(st, [[args.block, 1]], ops, miss); add(st, args.block, -1); }
    else if (skill === 'build') {
      const need = blueprintBlockCount(args.blueprint);
      const s = clone(st);
      const o = [];
      const m = [];
      ensureAll(s, [[args.material, need]], o, (x) => m.push(x), { forItem: args.blueprint });
      if (!m.length) { st.inv = s.inv; ops.push(...o); add(st, args.material, -need); }
      else if (have(st, args.material) > 0) add(st, args.material, -Math.min(need, have(st, args.material))); // part of it may stand already
      else miss({ item: args.material, need, for: args.blueprint });
    }
    return null;
  }

  const describeStep = ({ skill, args = {} }) => [skill, args.item ?? args.block ?? args.blueprint, args.n].filter((x) => x !== undefined).join(' ');

  /**
   * The added crafts of one step, tidied: planks of one wood cut in one craft (planks only use logs, so a later cut
   * can move up to the first), and no craft over the 64 a craft call takes.
   */
  function tidy(ops) {
    const merged = [];
    for (const o of ops) {
      const first = WOOD_PLANKS.test(o.item) && merged.find((x) => x.item === o.item);
      if (first) first.n += o.n; else merged.push({ ...o });
    }
    return merged.flatMap((o) => {
      if (o.n <= 64) return [o];
      const parts = [];
      for (let left = o.n; left > 0; left -= 64) parts.push({ ...o, n: Math.min(64, left) });
      return parts;
    });
  }

  /** Missing entries of one step, the same item for the same purpose counted once. */
  function sumUp(list) {
    const out = [];
    for (const m of list) {
      const same = out.find((x) => x.item === m.item && x.for === m.for && x.note === m.note);
      if (same) same.need += m.need; else out.push({ ...m });
    }
    return out;
  }

  /** A value, or a function asked once for it (null: unknown). */
  const once = (v) => {
    let asked = false;
    let value = null;
    return () => {
      if (!asked) { asked = true; value = typeof v === 'function' ? v() : v; }
      return value;
    };
  };

  function check(steps, { inventory = {}, table = null, furnace = null, before = [] } = {}) {
    const st = { inv: new Map(Object.entries(inventory).filter(([, v]) => v > 0)), table: once(table), furnace: once(furnace) };
    // steps queued or running already: assumed to work in full (never a reason to refuse the new ones)
    for (const step of before) {
      try { simStep(st, step, [], () => {}); } catch { /* a step the check does not know changes nothing */ }
    }
    const out = [];
    const missing = [];
    let added = 0;
    steps.forEach((step, i) => {
      const ops = [];
      const lacking = [];
      const label = `step ${i + 1} (${describeStep(step)})`;
      const replaced = simStep(st, step, ops, (m) => lacking.push(m));
      missing.push(...sumUp(lacking).map((m) => ({ step: i + 1, ...m })));
      for (const o of tidy(ops)) {
        const serves = o.why && o.why !== step.args?.item ? `for ${o.why} in ${label}` : `for ${label}`;
        out.push({ skill: 'craft', args: { item: o.item, n: o.n }, step: null, added: serves });
        added += 1;
      }
      if (replaced) {
        added += replaced.addedItems.length;
        // a batch the added items make too long is split; each part uses one table session
        const items = replaced.args.items;
        for (let k = 0; k < items.length; k += CRAFT_BATCH_MAX) {
          out.push({ skill: 'craft_batch', args: { items: items.slice(k, k + CRAFT_BATCH_MAX) }, step: i + 1, ...(k ? {} : { addedItems: replaced.addedItems }) });
        }
      } else {
        out.push({ skill: step.skill, args: step.args, step: i + 1 });
      }
    });
    return { ok: missing.length === 0, steps: out, missing, added };
  }

  return { check, variants };
}

/** "2 oak_log (logs of any wood) for wooden_pickaxe" for one Missing entry. */
export function describeMissing(m) {
  const what = m.anyWood ? `${m.need} ${m.item} (or logs of any wood)` : `${m.need} ${m.item}`;
  return `${what}${m.for ? ` for ${m.for}` : ''}${m.note ? ` (${m.note})` : ''}`;
}
