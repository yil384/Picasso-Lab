// src/tolerant.js - a skill's arguments read the way they were meant, where that can be read one way only (production
// game ga13a88, 2026-10-12: go_to {pos: {x, y, z}} was refused as BAD_ARGS and Muse spent a call "fixing the go_to
// argument shape"). Positions as {x, y, z}, {pos: {x, y, z}}, [x, y, z] or "x y z" (coordinates with a fraction are
// the block they lie in); numbers as numeric strings; booleans as "true" or "false"; a count as count, amount or
// quantity; item and block names in any case, with "minecraft:", spaces or hyphens, plurals and a few common names
// (a crafting table as "table", raw_beef as beef, a wooden tool as wood_), and a wood kind that the bot's own logs and
// planks settle ("planks" with only birch logs is birch_planks). What can be read more than one way is left as it was:
// the check then refuses it and the reply names the candidates. Runs before the check (contracts.js validateArgs),
// never throws, and says what it changed so the call can be logged.

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPosSchema = (s) => s?.type === 'object' && ['x', 'y', 'z'].every((k) => s.properties?.[k]?.type === 'integer');

/** Keys a position is sent under when the skill names it otherwise (only used when the skill has no such key). */
const POS_KEYS = ['pos', 'position', 'target', 'at', 'coords', 'coordinates', 'location', 'destination', 'xyz', 'where', 'goal', 'block_pos', 'point'];
/** Other names for a count. */
const N_KEYS = ['count', 'amount', 'quantity', 'qty', 'number', 'num'];
/** The skills whose count has an obvious default when none is given: one item crafted (craft, craft_batch's entries). */
const ONE_BY_DEFAULT = new Set(['craft', 'craft_batch']);
/** The keys whose values are game names (items, blocks, mobs, biomes): the only free strings that are normalized. */
const NAME_KEYS = new Set(['item', 'block', 'drop', 'mob', 'target', 'material', 'biome', 'blueprint']);
/** Interchangeable names of the one name argument a skill has. */
const NAME_SWAPS = [['item', 'block'], ['block', 'item'], ['mob', 'target'], ['target', 'mob'], ['item', 'name'], ['block', 'name'], ['mob', 'name'],
  ['liquid', 'block'], ['liquid', 'fluid'], ['liquid', 'type']]; // bucket {block: water} (ga13a88)

const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak', 'bamboo', 'crimson', 'warped'];

/** Common names that mean one item or block only. */
const ALIASES = Object.freeze({
  table: 'crafting_table', workbench: 'crafting_table', crafting_bench: 'crafting_table', craftingtable: 'crafting_table',
  cobble: 'cobblestone', flint_steel: 'flint_and_steel', flintandsteel: 'flint_and_steel', flint_n_steel: 'flint_and_steel', lighter: 'flint_and_steel',
  raw_beef: 'beef', raw_porkchop: 'porkchop', raw_pork: 'porkchop', raw_chicken: 'chicken', raw_mutton: 'mutton', raw_rabbit: 'rabbit',
  raw_cod: 'cod', raw_salmon: 'salmon', steak: 'cooked_beef',
  iron_ore: 'raw_iron', gold_ore: 'raw_gold', copper_ore: 'raw_copper', // smelting an ore smelts what it drops
  nearest: 'nearest_hostile', hostile: 'nearest_hostile', any_hostile: 'nearest_hostile', nearest_mob: 'nearest_hostile',
  portal: 'nether_portal', nether_portal_frame: 'nether_portal', portal_frame: 'nether_portal',
});
/** Names that mean one thing only under one argument (equip's slot). */
const KEY_ALIASES = Object.freeze({
  to: { off_hand: 'off-hand', offhand: 'off-hand', left_hand: 'off-hand', shield: 'off-hand', main_hand: 'hand', mainhand: 'hand', right_hand: 'hand', helmet: 'head', chest: 'torso', chestplate: 'torso', body: 'torso', leggings: 'legs', boots: 'feet' },
});

/** A number from a number or a numeric string; a coordinate with a fraction is the block it lies in. */
function numberOf(v, coord) {
  let n;
  if (typeof v === 'number' && Number.isFinite(v)) n = v;
  else if (typeof v === 'string' && /^\s*[+-]?\d+(?:\.\d+)?\s*$/.test(v)) n = Number(v);
  else return undefined;
  return coord ? Math.floor(n) : n;
}

/** A position from {x, y, z} (any case), [x, y, z], "x y z", "x, y, z", "(x, y, z)", "x=1 y=2 z=3" or {pos: ...}; else null. */
export function positionOf(v, depth = 0) {
  if (Array.isArray(v)) {
    if (v.length !== 3) return null;
    const [x, y, z] = v.map((c) => numberOf(c, true));
    return [x, y, z].every((c) => c !== undefined) ? { x, y, z } : null;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    const named = /^\(?\s*x\s*[:=]\s*([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*y\s*[:=]\s*([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*z\s*[:=]\s*([+-]?\d+(?:\.\d+)?)\s*\)?$/i.exec(s);
    if (named) return positionOf(named.slice(1, 4));
    const parts = s.replace(/^[([{]\s*|\s*[)\]}]$/g, '').split(/\s*[,;]\s*|\s+/).filter(Boolean);
    return parts.length === 3 ? positionOf(parts) : null;
  }
  if (isPlainObject(v)) {
    const low = Object.fromEntries(Object.entries(v).map(([k, val]) => [k.toLowerCase(), val]));
    if (['x', 'y', 'z'].every((k) => k in low)) return positionOf([low.x, low.y, low.z]);
    if (depth < 2) {
      const keys = Object.keys(low).filter((k) => POS_KEYS.includes(k));
      if (keys.length === 1 && Object.keys(low).length === 1) return positionOf(low[keys[0]], depth + 1);
    }
  }
  return null;
}

const norm = (v) => v.trim().toLowerCase().replace(/^minecraft:/, '').replace(/[\s-]+/g, '_');
const singulars = (n) => [...new Set([n, n.replace(/ies$/, 'y'), n.replace(/(ch|sh|x|ss)es$/, '$1'), n.replace(/s$/, '')])];

/** The wood kinds the bot carries as logs, wood or planks. */
function woodsHeld(inventory) {
  const keys = Object.keys(inventory ?? {}).filter((k) => (inventory[k] ?? 0) > 0);
  return WOODS.filter((w) => keys.some((k) => [`${w}_log`, `${w}_wood`, `${w}_planks`, `stripped_${w}_log`, `${w}_stem`].includes(k)));
}
const woodOf = (name) => WOODS.filter((w) => name.startsWith(`${w}_`)).sort((a, b) => b.length - a.length)[0] ?? null;

/**
 * A name read against a list of allowed names: {value} when it is one of them one way only, {candidates} when it could
 * be several, else {} (left as it was).
 */
export function nameOf(raw, allowed, { key = null, inventory = null, byInventory = true } = {}) {
  if (typeof raw !== 'string') return {};
  if (allowed.includes(raw)) return { value: raw };
  const n = norm(raw);
  const tries = [];
  for (const s of singulars(n)) tries.push(s, KEY_ALIASES[key]?.[s], ALIASES[s], s.replace(/^wood_/, 'wooden_'));
  for (const t of tries) if (t && allowed.includes(t)) return { value: t };
  // one allowed name ends with it ("bricks": stone_bricks); several wood kinds ("planks", "wooden planks"): the one
  // the bot carries, where what it carries decides (not for collect: which trees stand near is another matter)
  const bases = [...new Set(singulars(n).flatMap((s) => [s, `${s}s`, s.replace(/^wood(?:en)?_(?=planks?$|doors?$|slabs?$|stairs$|fences?$|logs?$)/, '')]))];
  for (const s of bases) {
    const c = allowed.filter((a) => a.endsWith(`_${s}`));
    if (c.length === 1) return { value: c[0] };
    if (c.length > 1) {
      if (byInventory && c.every((a) => woodOf(a))) {
        const held = woodsHeld(inventory);
        const mine = c.filter((a) => held.includes(woodOf(a)));
        if (held.length === 1 && mine.length === 1) return { value: mine[0] };
      }
      return { candidates: c };
    }
  }
  return {};
}

/**
 * Arguments read against a skill's JSON schema, where they can be read one way only.
 * @param {object} schema  the skill's parameters (an object schema)
 * @param {unknown} args
 * @param {{inventory?: Record<string, number>, skill?: string}} [ctx]  what the bot carries (a wood kind), the skill
 * @returns {{args: unknown, changes: string[], unclear: string[]}}  changes: what was read otherwise ("go_to: pos {x, y, z} as x, y, z"); unclear: names with several candidates
 */
export function tolerate(schema, args, ctx = {}) {
  const byInventory = ctx.skill !== 'collect';
  const changes = [];
  const unclear = [];
  let out;
  try { out = fix(schema, args, 'args', null); } catch { return { args, changes: [], unclear: [] }; }
  return { args: out, changes, unclear };

  function fix(s, v, at, key) {
    if (!s || v === undefined) return v;
    if (s.type === 'object') return fixObject(s, v, at);
    if (s.type === 'array') {
      let list = v;
      if (isPlainObject(v) && s.items?.type === 'object') {
        const props = s.items.properties ?? {};
        if (Object.keys(v).some((k) => k in props)) { list = [v]; changes.push(`${at}: one entry as a list`); }
        else if ('item' in props && 'n' in props && Object.values(v).every((n) => numberOf(n) !== undefined)) {
          // {"stick": 4, "oak_planks": 8}: item -> count
          list = Object.entries(v).map(([item, n]) => ({ item, n }));
          changes.push(`${at}: {item: count} as a list of {item, n}`);
        }
      }
      return Array.isArray(list) ? list.map((x, i) => fix(s.items, x, `${at}[${i}]`, null)) : list;
    }
    if (s.type === 'integer') {
      const coord = ['x', 'y', 'z'].includes(key);
      const n = numberOf(v, coord);
      if (n !== undefined && n !== v) { changes.push(`${at}: ${JSON.stringify(v)} as ${n}`); return n; }
      return v;
    }
    if (s.type === 'boolean') {
      if (typeof v === 'string' && /^(true|false)$/i.test(v.trim())) { changes.push(`${at}: "${v}" as ${v.trim().toLowerCase()}`); return v.trim().toLowerCase() === 'true'; }
      return v;
    }
    // a rule switched with true or false where the skill takes on or off (policy: defend, flee, escape)
    if (s.type === 'string' && typeof v === 'boolean' && s.enum?.includes('on') && s.enum?.includes('off')) { changes.push(`${at}: ${v} as ${v ? 'on' : 'off'}`); return v ? 'on' : 'off'; }
    if (s.type === 'string' && typeof v === 'string') {
      if (s.enum) {
        const r = nameOf(v, s.enum, { key, inventory: ctx.inventory, byInventory });
        if (r.value && r.value !== v) { changes.push(`${at}: "${v.slice(0, 40)}" as ${r.value}`); return r.value; }
        if (r.candidates) unclear.push(`${at} "${v.slice(0, 40)}" could be ${r.candidates.slice(0, 8).join(', ')}${r.candidates.length > 8 ? ', ...' : ''}: name one`);
        return v;
      }
      if (NAME_KEYS.has(key)) {
        const n = norm(v);
        const m = ALIASES[n] && !/_ore$/.test(n) ? ALIASES[n] : n; // an ore stays an ore outside smelt's list
        if (/^[a-z0-9_]{1,64}$/.test(m) && m !== v) { changes.push(`${at}: "${v.slice(0, 40)}" as ${m}`); return m; }
      }
    }
    return v;
  }

  function fixObject(s, v, at) {
    const props = s.properties ?? {};
    if (!isPlainObject(v)) {
      const p = isPosSchema(s) ? positionOf(v) : null;
      if (p) { changes.push(`${at}: ${JSON.stringify(v).slice(0, 40)} as {x, y, z}`); return p; }
      return v;
    }
    const o = { ...v };
    // the position itself under another key (go_to {pos: {x, y, z}}), or a skill's one position argument sent flat or
    // under another key (place {block, x, y, z}, bucket {position: [x, y, z]})
    const spare = (k) => !Object.hasOwn(props, k) && Object.hasOwn(o, k);
    if (isPosSchema(s) && !['x', 'y', 'z'].every((k) => Object.hasOwn(o, k))) {
      const found = POS_KEYS.filter(spare).map((k) => [k, positionOf(o[k])]).filter(([, p]) => p);
      if (found.length === 1 && !['x', 'y', 'z'].some((k) => Object.hasOwn(o, k))) {
        delete o[found[0][0]];
        Object.assign(o, found[0][1]);
        changes.push(`${at}: ${found[0][0]} as x, y, z`);
      }
    }
    const posProps = Object.keys(props).filter((k) => isPosSchema(props[k]));
    if (posProps.length === 1 && !Object.hasOwn(o, posProps[0])) {
      const p = posProps[0];
      const found = POS_KEYS.filter((k) => k !== p && spare(k)).map((k) => [k, positionOf(o[k])]).filter(([, q]) => q);
      if (found.length === 1) {
        o[p] = found[0][1];
        delete o[found[0][0]];
        changes.push(`${at}: ${found[0][0]} as ${p}`);
      } else if (!found.length && ['x', 'y', 'z'].every(spare)) {
        o[p] = { x: o.x, y: o.y, z: o.z };
        delete o.x; delete o.y; delete o.z;
        changes.push(`${at}: x, y, z as ${p}`);
      }
    }
    // a count under another name, the one name argument under another name
    if (Object.hasOwn(props, 'n') && !Object.hasOwn(o, 'n')) {
      const k = N_KEYS.filter(spare);
      if (k.length === 1) { o.n = o[k[0]]; delete o[k[0]]; changes.push(`${at}: ${k[0]} as n`); }
      // a craft with no count makes one (production game g71c9f5: craft {item: wooden_pickaxe} refused as BAD_ARGS)
      else if (!k.length && ONE_BY_DEFAULT.has(ctx.skill) && Object.hasOwn(props, 'item') && Object.hasOwn(o, 'item')) { o.n = 1; changes.push(`${at}: no n, so 1`); }
    }
    for (const [want, sent] of NAME_SWAPS) {
      if (Object.hasOwn(props, want) && !Object.hasOwn(o, want) && spare(sent) && !NAME_SWAPS.some(([w, x]) => x === sent && w !== want && Object.hasOwn(props, w))) {
        o[want] = o[sent];
        delete o[sent];
        changes.push(`${at}: ${sent} as ${want}`);
      }
    }
    for (const k of Object.keys(o)) if (Object.hasOwn(props, k)) o[k] = fix(props[k], o[k], `${at}.${k}`, k);
    return o;
  }
}
