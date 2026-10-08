// src/plan.js - the dry-run check the MCP endpoint runs before it queues a play or play_sequence (ROADMAP M2): the
// inventory is simulated through the steps with the game's own recipes (minecraft-data 1.21.4 through
// prismarine-recipe, the variants the craft skill chooses from), the furnace rules of the smelt skill and the drops
// of collect. A step that cannot work is found before anything runs, with what is missing; planks (from logs), sticks
// (from planks), and a crafting table or a furnace a step needs, are added as craft steps instead when what the bot
// carries (or what earlier steps bring) can make them. It reads no game state itself: the inventory and the station
// lookups are passed in. Given the bot's position, it follows go_to steps: a table or furnace left more than WALK_BACK
// blocks behind is not walked back to, so the body makes a new table there from spare planks (counted), and when it
// cannot (and the station is past REUSE_RADIUS) or a craft needs furnace output left that far behind, the check warns
// (warnings) instead of refusing: where the bot ends up is only roughly known.

import { registryFor, requireMc } from './mc.js';
import { SMELT, FUEL, PLANKS, LOGS, WOODS, blueprintBlockCount } from './game.js';
import { SMELT_PER_CALL, CRAFT_BATCH_MAX } from './contracts.js';

// the smelt skill's fuel order (src/skills/smelt.js chooseFuel): cheapest first, coal before wood, planks before logs;
// for a load split over several furnaces, fuel that burns out with a few items first, never sticks (SMALL_ORDER)
const FUEL_ORDER = ['coal', 'charcoal', 'coal_block', ...PLANKS, 'stick', ...LOGS];
const SMALL_ORDER = [...PLANKS, 'charcoal', 'coal', 'coal_block', ...LOGS];
// the smelt skill's parallel load (src/skills/smelt.js MAX_PARALLEL) and the cobblestone an extra furnace takes
const MAX_PARALLEL = 3;
const COBBLE_PER_FURNACE = 8;
const WOOD_PLANKS = /^(.+)_planks$/;
const WOOD_SET = new Set(WOODS);
/** Blocks that drop more than one item (the most they give: the check is optimistic about what a step brings). */
const DROP_COUNT = { clay: 4, copper_ore: 5, deepslate_copper_ore: 5 };
/** Blocks whose drop is left to chance: counted as nothing (collect does the same). */
const CHANCE = /^(short_grass|.*_leaves)$/;
// ingredients a missing-items hint should name first, as the craft skill does
const COMMON = /^(oak_|cobblestone$|stick$|iron_ingot$)/;
const TIERS = ['wooden', 'stone', 'golden', 'iron', 'diamond', 'netherite'];
// the body's station rules (src/skills/station.js WALK_BACK and CLIMB, src/stations.js REUSE_RADIUS, the reach of
// src/skills/util.js): a station is walked back to within 16 blocks and 4 up or down, found within 24, and a furnace's
// output is fetched within 24 blocks plus reach
const WALK_BACK = 16;
const CLIMB = 4;
const REUSE_RADIUS = 24;
const FETCH_RADIUS = 28;
/** Skills whose inventory effect the check knows (or knows to be none); after any other, missing items only warn. */
const KNOWN = new Set(['get_state', 'say', 'eat', 'attack', 'equip', 'sleep', 'explore', 'policy']);

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
  const dist = (a, b) => Math.round(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
  /**
   * Where a station of this kind stands, if the check knows: where the bot put one down, or where it was at the start
   * when one was found near (null: unknown, or none).
   */
  const stationAt = (st, key) => st.at[key] ?? (st[key]() === true ? st.start : null);
  /** How far the known station of this kind is after a go_to, or null when the body would use it where it is. */
  function leftBehind(st, key) {
    if (!st.moved || !st.pos) return null;
    const at = stationAt(st, key);
    if (!at) return null;
    const d = dist(at, st.pos);
    return d <= WALK_BACK && Math.abs(at.y - st.pos.y) <= CLIMB ? null : { d, at };
  }
  const warn = (st, text) => { if (!st.warnings.some((w) => w.step === st.step && w.text === text)) st.warnings.push({ step: st.step, text }); };
  /** Planks carried, a log counted as 4 (as the body's tableAffordable counts them). */
  const planksEquiv = (st) => [...st.inv].reduce((k, [name, c]) => k + (/_planks$/.test(name) ? c : /_log$/.test(name) ? 4 * c : 0), 0);
  /**
   * A table-needing craft after a go_to took the bot away from its table: the body makes a new one from 4 planks (or a
   * log) when it carries that many beyond what the craft takes, and puts it down here; else it walks back within
   * REUSE_RADIUS; else the craft fails, which the check can only warn about.
   */
  function tableAfterMove(st, plankNeed) {
    if (have(st, 'crafting_table') > 0) return;
    const far = leftBehind(st, 'table');
    if (!far) return;
    if (planksEquiv(st) - plankNeed >= 4) {
      const wood = [...st.inv].find(([name, c]) => /_planks$/.test(name) && c >= 4)?.[0];
      if (wood) add(st, wood, -4);
      else { const log = [...st.inv].find(([name, c]) => /_log$/.test(name) && c > 0)?.[0]; if (log) add(st, log, -1); }
      st.at.table = st.pos;
      return;
    }
    if (far.d > REUSE_RADIUS) {
      warn(st, `needs a crafting table, but after ${st.moved} yours is about ${far.d} blocks away and you will have no 4 planks or a log to spare for a new one: carry a crafting table or one more log`);
    }
  }
  /** Ingredients still in the bot's furnaces when a go_to took it far from them: warned about once. */
  function ovenAfterMove(st, names) {
    for (const name of names) {
      const o = st.oven.get(name);
      if (!o) continue;
      st.oven.delete(name); // the craft that needs it takes it all out (or fails)
      if (!st.moved || !st.pos || !o.at) continue;
      const d = dist(o.at, st.pos);
      if (d > FETCH_RADIUS) warn(st, `needs the ${name} still in your furnaces, but after ${st.moved} they are about ${d} blocks away (it fetches within ${REUSE_RADIUS}): go_to back there first`);
    }
  }
  const add = (st, item, k) => { if (k) st.inv.set(item, have(st, item) + k); };
  const clone = (st) => ({ ...st, inv: new Map(st.inv), at: { ...st.at }, oven: new Map(st.oven), warnings: [] });
  // a station carried counts at once; one standing within reach is looked up only when a step needs it (a scan)
  const hasTable = (st) => have(st, 'crafting_table') > 0 || st.table() !== false;
  const hasFurnace = (st) => have(st, 'furnace') > 0 || st.furnace() !== false;
  /**
   * A station a step works at, as the body does it (src/skills/station.js): one standing nearby is used; else the one
   * carried is put down and stays there (src/stations.js), so it leaves the inventory and stands nearby from then on.
   */
  function useStation(st, name, key) {
    if (st.keep && have(st, name) > 0) return; // put down for the step and picked up again (temporaryStations)
    if (have(st, name) <= 0 || (st[key]() !== false && !leftBehind(st, key))) return;
    add(st, name, -1);
    st[key] = () => true;
    st.at[key] = st.pos;
  }
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
    if (pick.table) {
      tableAfterMove(st, pick.need.filter(([ing]) => /_planks$/.test(ing)).reduce((k, [, c]) => k + c * batches(pick), 0));
      useStation(st, 'crafting_table', 'table');
    }
    ovenAfterMove(st, pick.need.map(([ing]) => ing));
    craftOp(st, insert ? ops : null, item, pick.out * batches(pick), pick.need.map(([ing, c]) => [ing, c * batches(pick)]), forItem);
  }

  /** The smelt skill's fuel choice: the first fuel in `order` that covers every item, else the one covering most. */
  function chooseFuel(st, input, want, order = FUEL_ORDER) {
    let best = null;
    for (const name of order) {
      if (name === input) continue;
      const k = have(st, name);
      const covers = Math.floor(k * FUEL[name]);
      if (covers < 1) continue;
      if (covers >= want) return { name, units: Math.ceil(want / FUEL[name]), covers: want };
      if (!best || covers > best.covers) best = { name, units: k, covers };
    }
    return best;
  }

  /**
   * Smelt as the smelt skill does (src/skills/smelt.js): at most SMELT_PER_CALL items over up to MAX_PARALLEL furnaces
   * (the one nearby, the ones carried, and extra ones it crafts from spare cobblestone when a table is at hand), each
   * with its own fuel. Furnaces put down stay where they are; the output is counted as in the inventory afterwards
   * (the next step that needs it waits for it).
   */
  function simSmelt(st, { item, n }, ops, miss) {
    const want = Math.min(n, SMELT_PER_CALL);
    const lack = want - have(st, item);
    if (lack > 0) { miss({ item, need: lack }); add(st, item, lack); }
    if (!hasFurnace(st)) simCraft(st, 'furnace', 1, ops, (x) => miss({ ...x, for: 'a furnace' }), 'a furnace', true);
    if (st.keep) { // one furnace, put down and picked up again within the step, one fuel; the output comes at once
      const fuel = chooseFuel(st, item, want);
      if (fuel) add(st, fuel.name, -fuel.units);
      const left = want - (fuel?.covers ?? 0);
      if (left > 0) miss({ item: 'coal', need: Math.ceil(left / FUEL.coal), note: `fuel for ${left} more ${item}: coal or charcoal (1 per 8 items), or planks or logs (2 per 3 items)` });
      add(st, item, -want);
      add(st, SMELT[item], want);
      return;
    }
    const pieces = SMALL_ORDER.filter((name) => name !== item).reduce((k, name) => k + have(st, name), 0);
    const target = Math.max(1, Math.min(want, MAX_PARALLEL, pieces));
    // a furnace a go_to left behind is used only when the bot can put down or make none (and finds it within 24)
    const behind = leftBehind(st, 'furnace');
    const near = st.furnace() !== false && !behind ? 1 : 0;
    const extra = target - near - have(st, 'furnace');
    const planks = PLANKS.reduce((k, p) => k + have(st, p), 0);
    if (extra > 0 && (hasTable(st) || (planks >= 4 && pieces - 4 >= target))) {
      const make = Math.min(extra, Math.floor(have(st, 'cobblestone') / COBBLE_PER_FURNACE));
      if (make > 0) {
        if (!hasTable(st)) simCraft(st, 'crafting_table', 1, null, () => {}, 'a furnace');
        useStation(st, 'crafting_table', 'table');
        craftOp(st, null, 'furnace', make, [['cobblestone', make * COBBLE_PER_FURNACE]], 'a furnace');
      }
    }
    if (behind && !have(st, 'furnace') && behind.d > REUSE_RADIUS) {
      warn(st, `smelts, but after ${st.moved} your furnace is about ${behind.d} blocks away and you will carry none: carry a furnace or 8 cobblestone more`);
    }
    const used = Math.max(1, Math.min(target, near + have(st, 'furnace')));
    add(st, 'furnace', -Math.min(have(st, 'furnace'), used - near)); // put down; they stay
    if (have(st, 'furnace') === 0 && used > near) { st.furnace = () => true; st.at.furnace = st.pos; }
    const shares = Array.from({ length: used }, (_, i) => Math.floor(want / used) + (i < want % used ? 1 : 0)).filter((x) => x > 0);
    let covered = 0;
    for (const share of shares) {
      const fuel = chooseFuel(st, item, share, shares.length > 1 ? SMALL_ORDER : FUEL_ORDER);
      if (!fuel) continue;
      add(st, fuel.name, -fuel.units);
      covered += Math.min(share, fuel.covers);
    }
    const left = want - covered;
    if (left > 0) miss({ item: 'coal', need: Math.ceil(left / FUEL.coal), note: `fuel for ${left} more ${item}: coal or charcoal (1 per 8 items), or planks or logs (2 per 3 items)` });
    add(st, item, -want);
    add(st, SMELT[item], want);
    // the output waits in the furnaces here until a craft that needs it takes it
    st.oven.set(SMELT[item], { at: st.pos });
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
    else if (skill === 'go_to') {
      // where it ends up (roughly): stations and furnace output left behind are judged from there
      const to = { x: Math.floor(args.x), y: Math.floor(args.y), z: Math.floor(args.z) };
      if (st.pos && dist(to, st.pos) > 1) st.moved = st.label;
      st.pos = to;
    }
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
    // the extra skills of BODY=mineai (src/mineai/skills.js): what they bring or take, where it is known
    else if (skill === 'hunt') add(st, args.drop, args.n);
    else if (skill === 'drop') add(st, args.item, -Math.min(args.n, have(st, args.item)));
    else if (skill === 'chest') {
      if (args.action !== 'inspect') for (const { item, n } of args.items ?? []) add(st, item, args.action === 'withdraw' ? n : -Math.min(n, have(st, item)));
    } else if (skill === 'bucket') {
      const full = `${args.liquid ?? 'water'}_bucket`;
      if (args.action === 'fill') { if (have(st, 'bucket') > 0) { add(st, 'bucket', -1); add(st, full, 1); } } else if (have(st, full) > 0) { add(st, full, -1); add(st, 'bucket', 1); }
    } else if (!KNOWN.has(skill)) st.unknown ??= st.label; // pick_up and the like: what it brings is not known
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

  /**
   * position: the bot's block position (optional; without it go_to steps are not followed); smelting: what the bot's
   * furnaces are still making ({item: n}, already counted in inventory), taken to be near that position.
   * temporaryStations: the body puts a carried table or furnace down for one step and picks it up again, and smelts in
   * one furnace with one fuel, the output coming at once (BODY=mineai); otherwise stations stay where they were put.
   */
  function check(steps, { inventory = {}, table = null, furnace = null, before = [], position = null, smelting = {}, temporaryStations = false } = {}) {
    const start = position && [position.x, position.y, position.z].every(Number.isFinite)
      ? { x: Math.floor(position.x), y: Math.floor(position.y), z: Math.floor(position.z) } : null;
    const st = {
      inv: new Map(Object.entries(inventory).filter(([, v]) => v > 0)), table: once(table), furnace: once(furnace),
      start, pos: start, at: {}, moved: null, oven: new Map(), warnings: [], step: null, label: null,
      keep: Boolean(temporaryStations), unknown: null,
    };
    for (const [k, v] of Object.entries(smelting ?? {})) if (v > 0) st.oven.set(k, { at: start });
    // steps queued or running already: assumed to work in full (never a reason to refuse the new ones)
    for (const step of before) {
      st.label = `a step still queued (${describeStep(step)})`;
      try { simStep(st, step, [], () => {}); } catch { /* a step the check does not know changes nothing */ }
    }
    st.warnings.length = 0; // only this call's steps are warned about
    const out = [];
    const missing = [];
    let added = 0;
    steps.forEach((step, i) => {
      const ops = [];
      const lacking = [];
      const label = `step ${i + 1} (${describeStep(step)})`;
      st.step = i + 1;
      st.label = label;
      const unknownBefore = st.unknown;
      const replaced = simStep(st, step, ops, (m) => lacking.push(m));
      // after a step whose gains are unknown (pick_up, ...), what seems missing may come from it: a warning, not a refusal
      if (unknownBefore) for (const m of sumUp(lacking)) warn(st, `may lack ${describeMissing(m)}, unless ${unknownBefore} brings it`);
      else missing.push(...sumUp(lacking).map((m) => ({ step: i + 1, ...m })));
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
    return { ok: missing.length === 0, steps: out, missing, added, warnings: st.warnings.map((w) => ({ step: w.step, text: `step ${w.step} ${w.text}` })) };
  }

  return { check, variants };
}

/** "2 oak_log (logs of any wood) for wooden_pickaxe" for one Missing entry. */
export function describeMissing(m) {
  const what = m.anyWood ? `${m.need} ${m.item} (or logs of any wood)` : `${m.need} ${m.item}`;
  return `${what}${m.for ? ` for ${m.for}` : ''}${m.note ? ` (${m.note})` : ''}`;
}
