// src/mineai/care.js - what a guest's bot does by itself while the player (Muse) is busy or slow (ROADMAP M4, "the bot
// survives on its own"), with BODY=mineai. The runtime's own reflexes already fight, flee, hide, eat carried food,
// surface for air, leave fire and keep their footing, during a step and between steps; this adds what needs a plan
// over minutes, all from the runtime's own actions (sleep, build_structure, collect_mob_drop, smelt_item, eat_food,
// craft_item, equip, pick_up_items, navigate):
//   - after a death: back to the death spot for the items it dropped (within their 5 minutes);
//   - armor: wears the best pieces it carries (and a shield in the off-hand), and crafts missing pieces from leather
//     or from iron beyond 3 ingots kept for a pickaxe or a bucket;
//   - food: eats when hungry (raw meat too), and with no food left hunts an animal near by, cooks the meat when it
//     carries a furnace and fuel, and eats;
//   - tools: a pickaxe, axe, shovel or sword about to break gets a spare crafted from what it carries;
//   - night: sleeps when it carries a bed and the night can pass, else shelters in a closed box of carried blocks (or
//     dug into the ground), with a pocket for a crafting table or furnace, until the player's next call.
// It acts only while no step of the player's runs, and yields at once to the next one (a death recovery finishes
// first: the items despawn). Everything it does, and every reflex of the runtime's that acted while no step ran, goes
// into a journal that the next MCP reply and the state carry ("On its own since your last call"), so the player always
// knows what the body did by itself. Pure decisions (decide, describeEvents, armorPlan, ...) are exported for tests;
// createCare runs them against a body (src/mineai/body.js).

import { createPlanner } from '../plan.js';
import { registryFor } from '../mc.js';
import { fuelPlan } from '../game.js';
import { bestFood, CARE_DEFAULTS, CARE_KNOBS } from './skills.js';
import { facingOf } from '../state.js';

const reg = registryFor('1.21.4');

export { CARE_DEFAULTS, CARE_KNOBS };

/** The care's policy in words (replies to the policy skill, the server's notes). */
export function describeCare(p = CARE_DEFAULTS) {
  const q = { ...CARE_DEFAULTS, ...(p ?? {}) };
  const night = q.night === 'off' ? 'does nothing about the night' : 'shelters at night (sleeps instead when it carries a bed and the night can pass)';
  const armor = { craft: 'wears the armor it carries and crafts missing pieces from leather or from iron beyond 3 ingots', wear: 'wears the armor it carries', off: 'leaves armor to you' }[q.armor];
  const food = { hunt: 'eats when hungry and hunts an animal when it has no food', eat: 'eats when hungry', off: 'leaves eating to you (the runtime still eats carried food at food 14 or less)' }[q.food];
  const tools = q.tools === 'off' ? 'makes no spare tools' : 'crafts a spare tool before one breaks';
  return `${night}; ${armor}; ${food}; ${tools}; after a death it goes back for its items`;
}

/** Night for the body: from a little before beds are accepted (12542) until a little before they stop (23458). */
export const NIGHT_FROM = 12_300;
export const NIGHT_TO = 23_300;
export const isNight = (t) => Number.isFinite(t) && t >= NIGHT_FROM && t < NIGHT_TO;
/** How long the body must have been idle (no step of the player's) before it starts anything of its own. */
export const IDLE_BEFORE_MS = 3_000;
/** A death's items despawn after 5 minutes; a recovery starts only well within that. */
export const RECOVER_WITHIN_MS = 4 * 60_000 + 30_000;
/** ...and only from where it can walk there in that time (it respawns at its bed or the world spawn). */
export const RECOVER_RANGE = 300;
/** Blocks a shelter is built of, best first (cobblestone first: endermen cannot take it), and how many one needs. */
export const SHELTER_BLOCKS = Object.freeze([
  'cobblestone', 'cobbled_deepslate', 'stone', 'deepslate', 'andesite', 'diorite', 'granite', 'tuff', 'blackstone',
  'netherrack', 'sandstone', 'dirt', 'coarse_dirt', 'rooted_dirt', 'mud',
]);
export const SHELTER_SIZE = 12;
/** Food eaten when food is at or below this (or when hurt and below 18, which healing needs), like their hunger reflex. */
export const EAT_AT = 14;
/** With no food carried, the body hunts when food is at or below this in daylight (any time at or below 6). */
export const HUNT_AT = 14;
/** Animals the body hunts for food (their meat), nearest first; raw chicken only when it can be cooked. */
export const PREY = Object.freeze({ cow: 'beef', mooshroom: 'beef', pig: 'porkchop', sheep: 'mutton', rabbit: 'rabbit', chicken: 'chicken' });
/** Iron ingots the body keeps when it crafts armor by itself (a pickaxe or a bucket). */
export const IRON_RESERVE = 3;
/** A tool this close to breaking gets a spare (uses left, or a fraction of its whole life). */
export const TOOL_LOW = (max) => Math.max(6, Math.ceil(max * 0.06));
export const TOOL_CLASSES = Object.freeze(['pickaxe', 'axe', 'shovel', 'sword']);
const TIERS = ['wooden', 'stone', 'golden', 'iron', 'diamond', 'netherite'];
const TIER_MATERIAL = { wooden: null, stone: 'cobblestone', golden: 'gold_ingot', iron: 'iron_ingot', diamond: 'diamond', netherite: null };

// ---------------------------------------------------------------------------------------------------------------
// Armor

export const ARMOR_SLOTS = Object.freeze({ helmet: 'head', chestplate: 'torso', leggings: 'legs', boots: 'feet' });
/** Crafting order: the most protection per unit of material first. */
export const ARMOR_ORDER = Object.freeze(['chestplate', 'leggings', 'boots', 'helmet']);
const ARMOR_COST = { helmet: 5, chestplate: 8, leggings: 7, boots: 4 };
/** Armor points by material, for helmet, chestplate, leggings, boots (the game's values). */
const ARMOR_POINTS = {
  leather: [1, 3, 2, 1], golden: [2, 5, 3, 1], chainmail: [2, 5, 4, 1], iron: [2, 6, 5, 2], diamond: [3, 8, 6, 3],
  netherite: [3, 8, 6, 3], turtle: [2, 0, 0, 0],
};
const PIECES = ['helmet', 'chestplate', 'leggings', 'boots'];
/** {material, piece, slot, points} of an armor item name, or null. */
export function armorOf(name) {
  const m = /^(leather|golden|chainmail|iron|diamond|netherite)_(helmet|chestplate|leggings|boots)$/.exec(String(name)) ?? (name === 'turtle_helmet' ? [name, 'turtle', 'helmet'] : null);
  if (!m) return null;
  const [, material, piece] = m;
  return { material, piece, slot: ARMOR_SLOTS[piece], points: ARMOR_POINTS[material][PIECES.indexOf(piece)] + (material === 'netherite' ? 0.5 : material === 'diamond' ? 0.25 : 0) };
}
/** Materials the body crafts armor from by itself (policy armor: craft), with what each takes; Muse's armor skill may use more. */
const CRAFT_FROM = { leather: 'leather', iron: 'iron_ingot', diamond: 'diamond', golden: 'gold_ingot' };

/**
 * What to wear: for each armor slot the best piece carried, when it beats what is worn there; a shield to the off-hand
 * when the off-hand is empty. stacks: their status stacks ({name, count, location, durability}).
 * @returns {Array<{item: string, to: string}>}
 */
export function wearPlan(stacks = []) {
  const worn = {};
  const carried = [];
  for (const s of stacks) {
    if (!s?.name) continue;
    if (['head', 'torso', 'legs', 'feet', 'off-hand'].includes(s.location)) worn[s.location] = s;
    else carried.push(s);
  }
  const out = [];
  for (const slot of ['torso', 'legs', 'feet', 'head']) {
    const have = worn[slot] ? armorOf(worn[slot].name)?.points ?? 0 : 0;
    const best = carried.map((s) => ({ s, a: armorOf(s.name) })).filter((x) => x.a?.slot === slot)
      .sort((x, y) => y.a.points - x.a.points || (y.s.durability?.remaining ?? 0) - (x.s.durability?.remaining ?? 0))[0];
    if (best && best.a.points > have) out.push({ item: best.s.name, to: slot });
  }
  if (!worn['off-hand'] && carried.some((s) => s.name === 'shield')) out.push({ item: 'shield', to: 'off-hand' });
  return out;
}

/**
 * Armor pieces to craft from what is carried: for each slot with nothing as good worn or carried, the best material
 * that pays for it, in ARMOR_ORDER (chestplate first). reserve: ingots of iron kept back (the body's own crafting keeps
 * IRON_RESERVE; Muse's armor skill keeps none); materials: which ones may be used.
 * @returns {Array<{item: string, uses: string, n: number}>}
 */
export function armorPlan(inventory = {}, stacks = [], { reserve = IRON_RESERVE, materials = ['leather', 'iron'] } = {}) {
  const have = { ...inventory };
  const best = {}; // slot -> points of the best piece worn or carried
  for (const s of stacks) { const a = armorOf(s?.name); if (a) best[a.slot] = Math.max(best[a.slot] ?? 0, a.points); }
  const out = [];
  const keep = (m) => (m === 'iron_ingot' ? reserve : 0);
  const order = ['diamond', 'iron', 'golden', 'leather'].filter((m) => materials.includes(m));
  for (const piece of ARMOR_ORDER) {
    const slot = ARMOR_SLOTS[piece];
    for (const material of order) {
      const unit = CRAFT_FROM[material];
      const points = armorOf(`${material}_${piece}`).points;
      if (points <= (best[slot] ?? 0)) break; // what is worn or carried is as good: nothing better below either
      if ((have[unit] ?? 0) - keep(unit) >= ARMOR_COST[piece]) {
        have[unit] -= ARMOR_COST[piece];
        best[slot] = points;
        out.push({ item: `${material}_${piece}`, uses: unit, n: ARMOR_COST[piece] });
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Tools

/** {class, tier} of a tool name (wooden_pickaxe -> pickaxe, wooden), or null. */
export function toolOf(name) {
  const m = /^(wooden|stone|golden|iron|diamond|netherite)_(pickaxe|axe|shovel|sword)$/.exec(String(name));
  return m ? { tier: m[1], cls: m[2] } : null;
}
/** The tool class a block is mined with fastest (pickaxe for stone and ores), or null for hand-mined blocks. */
export function toolClassFor(block) {
  const b = reg.blocksByName[block];
  if (!b) return null;
  const mats = String(b.material ?? '');
  if (/pickaxe/.test(mats) || b.harvestTools) return 'pickaxe';
  if (/axe/.test(mats) && !/pickaxe/.test(mats)) return 'axe';
  if (/shovel/.test(mats)) return 'shovel';
  return null;
}
/** The lowest pickaxe tier that harvests a block (null: any or none). */
export function pickaxeTierFor(block) {
  const tools = reg.blocksByName[block]?.harvestTools;
  if (!tools) return null;
  const names = Object.keys(tools).map((id) => reg.items[id]?.name).filter(Boolean);
  const tiers = names.map((n) => toolOf(n)?.tier).filter(Boolean).map((t) => TIERS.indexOf(t));
  return tiers.length ? TIERS[Math.min(...tiers)] : null;
}

/**
 * The tools of each class carried (main inventory and hotbar), best tier first: [{name, tier, cls, left, max}].
 */
export function toolsCarried(stacks = []) {
  const out = [];
  for (const s of stacks) {
    if (!s?.name || ['head', 'torso', 'legs', 'feet'].includes(s.location)) continue;
    const t = toolOf(s.name);
    if (!t) continue;
    const max = s.durability?.maximum ?? reg.itemsByName[s.name]?.maxDurability ?? null;
    out.push({ name: s.name, tier: t.tier, cls: t.cls, left: s.durability?.remaining ?? max, max });
  }
  return out.sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier) || (b.left ?? 0) - (a.left ?? 0));
}

/**
 * A spare to craft for a tool class: when the best tool of that class has `need` uses or fewer left (default: TOOL_LOW
 * of its life) and no other of that class carried has more, the best tier, up to the worn tool's, that what is carried
 * pays for (canCraft(item) says). minTier: the spare must be at least this tier (a pickaxe for iron ore: stone).
 * @returns {{item: string, low: {name: string, left: number}}|null}
 */
export function sparePlan(stacks, cls, canCraft, { need = null, minTier = null } = {}) {
  const list = toolsCarried(stacks).filter((t) => t.cls === cls);
  if (!list.length) return null;
  const best = list[0];
  const low = need ?? TOOL_LOW(best.max ?? 60);
  if ((best.left ?? Infinity) > low) return null;
  // another one of the class with enough left (and good enough): nothing to do
  if (list.slice(1).some((t) => (t.left ?? 0) > low && (!minTier || TIERS.indexOf(t.tier) >= TIERS.indexOf(minTier)))) return null;
  const from = TIERS.indexOf(best.tier);
  const floor = minTier ? TIERS.indexOf(minTier) : 0;
  for (let k = from; k >= floor; k--) {
    const tier = TIERS[k];
    if (tier === 'netherite' || (tier === 'golden' && best.tier !== 'golden')) continue;
    const item = `${tier}_${cls}`;
    if (canCraft(item)) return { item, low: { name: best.name, left: best.left } };
  }
  return null;
}

/**
 * A new tool of a class when none good enough is carried (it broke in the middle of a step): the best tier from upTo
 * down to minTier that what is carried pays for (canCraft), or null.
 */
export function replacementFor(cls, canCraft, { upTo = 'diamond', minTier = null } = {}) {
  for (let k = TIERS.indexOf(upTo); k >= (minTier ? TIERS.indexOf(minTier) : 0); k--) {
    const tier = TIERS[k];
    if (tier === 'netherite' || tier === 'golden') continue;
    if (canCraft(`${tier}_${cls}`)) return `${tier}_${cls}`;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// Food, night

/** The nearest animal to hunt for food that the status sees (within 32 blocks), or null. */
export function preyNear(situation, { cook = false } = {}) {
  const mobs = situation?.nearby?.mobs ?? [];
  return mobs
    .filter((m) => PREY[m.name] && (m.name !== 'chicken' || cook) && m.age !== 'baby' && (m.nearest?.distance ?? 999) <= 32)
    .sort((a, b) => a.nearest.distance - b.nearest.distance)[0] ?? null;
}

/** Carried blocks for a shelter, best first: [{name, count}], and their total. */
export function shelterBlocks(inventory = {}) {
  const list = SHELTER_BLOCKS.filter((b) => (inventory[b] ?? 0) > 0).map((b) => ({ name: b, count: inventory[b] }));
  return { list, total: list.reduce((n, b) => n + b.count, 0) };
}

/**
 * The care's shelter around the bot (build_structure's blocks): the bot's two cells and, in front of its feet, a pocket
 * one block high where a crafting table or furnace can be put down for a craft (the player's steps craft and smelt at
 * night too), closed all round: walls two high around the bot and one high around the pocket, a ceiling over the
 * pocket, the roof over the bot's head and the block behind it that the roof is placed against. 12 blocks on open
 * ground, fewer where the ground is the wall; each taken from the carried blocks in turn (best first).
 */
export function shelterCells(feet, heading, inventory) {
  const f = facingOf((-Number(heading || 0) * Math.PI) / 180); // compass degrees -> mineflayer yaw
  const r = { dx: -f.dz, dz: f.dx };
  const at = (a, b, y) => ({ x: feet.x + f.dx * a + r.dx * b, y: feet.y + y, z: feet.z + f.dz * a + r.dz * b });
  const solid = [
    at(-1, 0, 0), at(0, 1, 0), at(0, -1, 0), at(2, 0, 0), at(1, 1, 0), at(1, -1, 0), // feet level: around the bot and the pocket
    at(-1, 0, 1), at(0, 1, 1), at(0, -1, 1), at(1, 0, 1), // head level: around the bot, the pocket's ceiling
    at(-1, 0, 2), at(0, 0, 2), // the block the roof goes against, the roof
  ];
  const air = [at(0, 0, 0), at(0, 0, 1), at(1, 0, 0)];
  const { list } = shelterBlocks(inventory);
  const left = list.map((b) => ({ ...b }));
  const pick = () => { const b = left.find((x) => x.count > 0); if (!b) return list[0]?.name ?? 'cobblestone'; b.count -= 1; return b.name; };
  return [...solid.map((c) => ({ ...c, block_name: pick() })), ...air.map((c) => ({ ...c, block_name: 'air' }))];
}

/**
 * Is the shelter closed, from a build_structure audit made without digging: every cell as asked, or holding another
 * solid block (wall enough). {closed, placed, solid, why}.
 */
export function shelterVerdict(st) {
  if (!st) return { closed: false, placed: 0, solid: 0, why: null };
  const placed = Number(st.placed) || 0;
  const left = st.left ?? [];
  const solid = left.filter((g) => g.reason === 'holds_another_block').reduce((n, g) => n + (Number(g.count) || 0), 0)
    + (st.kept ?? []).reduce((n, k) => n + (Number(k.count) || 0), 0);
  const open = left.filter((g) => g.reason !== 'holds_another_block');
  const missing = (st.missing ?? []).map((m) => `short of ${m.count} ${m.block}`);
  const why = open.length ? [...open.map((g) => `${g.count} cell${g.count === 1 ? '' : 's'}: ${String(g.reason).replace(/_/g, ' ')}`), ...missing].join('; ') : null;
  return { closed: open.length === 0, placed, solid, why };
}

const BEDS = /_bed$/;
const hostilesWithin = (situation, r) => [...(situation?.nearby?.hostiles ?? []), ...(situation?.nearby?.mobs ?? [])]
  .filter((m) => m.kind === 'hostile' && (m.nearest?.distance ?? 999) <= r);

/**
 * What the body should do now by itself, or null. A pure function of their status (situation), what was carried and
 * worn (inventory, stacks), the policy and the care's memory: the first that applies of recover (a death's items),
 * wear, eat, food (hunt), tools (a spare), armor (craft), night (sleep, else shelter).
 * @param {object} situation their view_status situation
 * @param {{inventory: Record<string, number>, stacks: object[], policy: object, memory: object, now: number,
 *   canCraft: (item: string) => boolean, furnace: boolean}} o
 * @returns {{kind: string, why: string, ...}|null}
 */
export function decide(situation, { inventory = {}, stacks = [], policy = CARE_DEFAULTS, memory = {}, now = Date.now(), canCraft = () => false, furnace = false } = {}) {
  const s = situation ?? {};
  if (!s.vitals || s.vitals.health <= 0) return null;
  const overworld = String(s.dimension ?? 'overworld').replace(/^minecraft:/, '') === 'overworld';
  const cooling = (kind, ms) => memory.cool?.[kind] && now - memory.cool[kind] < ms;
  const time = s.clock?.timeOfDay;
  const night = overworld && isNight(time);
  const food = s.vitals.food ?? 20;
  const health = s.vitals.health ?? 20;

  // a death: its items lie at the death spot for 5 minutes
  const death = s.lastDeath;
  if (death?.observedAt && death.observedAt !== memory.recovered) {
    const age = now - Date.parse(death.observedAt);
    if (age >= 0 && age < RECOVER_WITHIN_MS && String(death.dimension ?? 'overworld').replace(/^minecraft:/, '') === String(s.dimension ?? 'overworld').replace(/^minecraft:/, '')) {
      const far = s.position && death.position ? Math.round(Math.hypot(s.position.x - death.position.x, s.position.z - death.position.z)) : 0;
      return { kind: 'recover', why: `it died${death.cause ? ` (${death.cause.replace(/^\S+ /, '')})` : ''} at ${xyz(death.position)} ${Math.round(age / 1000)} s ago`, key: death.observedAt, at: death.position, far: far > RECOVER_RANGE ? far : 0 };
    }
  }
  // armor and a shield it carries but does not wear
  if (policy.armor !== 'off' && !cooling('wear', 30_000)) {
    const wear = wearPlan(stacks);
    if (wear.length) return { kind: 'wear', why: `it carries ${wear.map((w) => w.item).join(', ')} and does not wear ${wear.length > 1 ? 'them' : 'it'}`, items: wear };
  }
  // food: eat what it carries (raw meat too), else hunt
  const hostileNear = hostilesWithin(s, 12).length > 0;
  const hungry = food <= EAT_AT || (health < 20 && food < 18);
  const meal = bestFood(inventory);
  if (policy.food !== 'off' && hungry && meal && !hostileNear && !cooling('eat', 20_000)) {
    return { kind: 'eat', why: `food ${food}/20${health < 20 && food > EAT_AT ? ` and health ${round(health)}/20 (healing needs food 18)` : ''}`, food: meal };
  }
  if (policy.food === 'hunt' && !meal && !cooling('hunt', 90_000) && (food <= 6 || (food <= HUNT_AT && !night))) {
    const cook = furnace;
    const prey = preyNear(s, { cook });
    if (prey) return { kind: 'hunt', why: `food ${food}/20 and no food carried`, mob: prey.name, drop: PREY[prey.name], n: 3, cook, distance: Math.round(prey.nearest.distance) };
  }
  // a tool about to break: a spare from what it carries
  if (policy.tools !== 'off' && !cooling('tools', 60_000)) {
    for (const cls of TOOL_CLASSES) {
      const spare = sparePlan(stacks, cls, canCraft);
      if (spare) return { kind: 'tools', why: `its ${spare.low.name} has ${spare.low.left} use${spare.low.left === 1 ? '' : 's'} left`, item: spare.item, low: spare.low };
    }
  }
  // armor it can craft by itself: leather, and iron beyond the reserve
  if (policy.armor === 'craft' && !cooling('armor', 60_000)) {
    const plan = armorPlan(inventory, stacks).filter((p) => canCraft(p.item));
    const used = {};
    for (const p of plan) used[p.uses] = (used[p.uses] ?? 0) + p.n;
    if (plan.length) return { kind: 'armor', why: `it carries ${Object.entries(used).map(([u, n]) => `${n} ${u}`).join(' and ')} for armor it does not wear`, pieces: plan };
  }
  // night: sleep in a bed it carries (the night passes when every player sleeps), else shelter
  if (night && policy.night !== 'off') {
    const pos = s.position;
    const feet = pos ? { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) } : null;
    const sh = memory.shelter;
    const sheltered = Boolean(sh && feet && sh.feet.x === feet.x && sh.feet.z === feet.z && Math.abs(sh.feet.y - feet.y) <= 1 && sh.night === memory.night);
    if (sheltered && now - sh.checked < 90_000) return null;
    const bed = Object.keys(inventory).find((n) => BEDS.test(n) && inventory[n] > 0);
    if (bed && !sheltered && memory.slept !== memory.night && !cooling('sleep', 120_000) && !hostilesWithin(s, 10).length) {
      return { kind: 'sleep', why: `night (time ${time}) and it carries a ${bed}`, bed };
    }
    // three shelters that would not close this night: it stops trying until the next (its reflexes still fight)
    if ((!cooling('shelter', 45_000) && (memory.shelterFails?.[memory.night] ?? 0) < 3) || sheltered) {
      const { total } = shelterBlocks(inventory);
      return { kind: 'shelter', why: `night (time ${time})`, blocks: total, check: sheltered };
    }
  }
  return null;
}
// ---------------------------------------------------------------------------------------------------------------
// Their reflexes, from their event log (read_recent_events), in our words

const REFLEX_NAMES = {
  hostile_reflex: 'hostile', hunger_reflex: 'hunger', breath_reflex: 'breath', fire_reflex: 'fire',
  recover_footing: 'footing', dragon_reflex: 'dragon',
};
const round = (x) => Math.round(Number(x) * 10) / 10;
const xyz = (p) => (p && Number.isFinite(p.x) ? `${Math.floor(p.x)} ${Math.floor(p.y)} ${Math.floor(p.z)}` : '?');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Their events (read_recent_events) as journal entries of what their reflexes did, merged so a fight of many short
 * contacts is one line: hostile responses by kind (fought, fled, hid, deflected) with the mobs, kills, explosions and
 * health before and after; meals; air; fire; footing; deaths (with the server's cause); a tool low or broken. Events
 * that interrupted a step of ours are left out (the step's result says so already), as is chat (never shown).
 * @param {object[]} events their events, oldest first
 * @returns {Array<{kind: string, text: string, ok: boolean, at: string}>}
 */
export function describeEvents(events = []) {
  const out = [];
  let fight = null; // the merged hostile responses
  const flush = () => {
    if (!fight) return;
    const parts = [];
    const mobs = (m) => [...m].map((x) => x.replace(/_/g, ' ')).join(', ');
    if (fight.fight) parts.push(`fought ${mobs(fight.fightMobs)}${fight.kills ? ` and killed ${plural(fight.kills, 'of them', 'of them')}`.replace(/1 of them/, 'one') : ''}`);
    if (fight.evade) parts.push(`fled from ${mobs(fight.evadeMobs)}`);
    if (fight.hide) parts.push(`hid from ${mobs(fight.hideMobs)}${fight.walled ? ` (walled itself in with ${plural(fight.walled, 'block')})` : ''}${fight.ate ? `, ate ${fight.ate}` : ''}`);
    if (fight.deflect) parts.push('blocked arrows with its shield');
    if (fight.explosions) parts.push(`${plural(fight.explosions, 'explosion')} near it`);
    const hp = fight.before !== null && fight.after !== null ? `; health ${round(fight.before)} -> ${round(fight.after)}` : '';
    out.push({ kind: fight.evade && !fight.fight ? 'flee' : fight.hide && !fight.fight ? 'hide' : 'fight', text: `${parts.join('; ') || 'kept hostile mobs off'}${hp}`, ok: true, at: fight.at, reflex: true });
    fight = null;
  };
  for (const e of events) {
    if (!e || e.type === 'player_message') continue;
    if (e.type === 'player_death') {
      flush();
      out.push({ kind: 'death', text: `died${e.payload?.cause ? `: ${String(e.payload.cause).replace(/^\S+ /, '')}` : ''} at ${xyz(e.payload?.position)}`, ok: false, at: e.observedAt });
      continue;
    }
    if (e.type === 'equipment_broken') { out.push({ kind: 'tool', text: `its ${e.payload?.item ?? 'tool'} broke`, ok: false, at: e.observedAt, reflex: true }); continue; }
    if (e.type === 'equipment_low_durability') { out.push({ kind: 'tool', text: `its ${e.payload?.item ?? 'tool'} is about to break (${e.payload?.remaining ?? '?'} of ${e.payload?.maximum ?? '?'} uses left)`, ok: true, at: e.observedAt, reflex: true, low: e.payload?.item ?? null }); continue; }
    if (e.type !== 'survival_outcome') continue;
    const p = e.payload ?? {};
    const source = p.source;
    const ev = p.evidence ?? {};
    if (ev.interrupted) continue; // a step of the player's (or of the care) was interrupted: its own result says so
    const o = ev.outcome ?? {};
    if (source === 'hostile_reflex') {
      const resp = ev.response ?? o.response;
      if (ev.cancelled && !(o.healthBefore > o.healthAfter) && !(o.killedTargetIds ?? []).length) continue;
      const names = (o.threats ?? []).map((t) => t.name).filter(Boolean);
      const changed = (o.attacks ?? 0) > 0 || (o.killedTargetIds ?? []).length || (o.healthBefore ?? 0) !== (o.healthAfter ?? 0) || resp === 'hide' || o.explosions;
      if (!changed) continue;
      fight ??= { at: e.observedAt, fight: 0, evade: 0, hide: 0, deflect: 0, kills: 0, explosions: 0, walled: 0, ate: null, before: null, after: null, fightMobs: new Set(), evadeMobs: new Set(), hideMobs: new Set() };
      if (resp === 'fight') { fight.fight += 1; names.forEach((n) => fight.fightMobs.add(n)); }
      else if (resp === 'evade') { fight.evade += 1; names.forEach((n) => fight.evadeMobs.add(n)); }
      else if (resp === 'hide') { fight.hide += 1; names.forEach((n) => fight.hideMobs.add(n)); fight.walled += Number(o.hide?.walled) || 0; fight.ate ??= o.hide?.ate ?? null; }
      else if (resp === 'deflect') fight.deflect += 1;
      fight.kills += (o.killedTargetIds ?? []).length;
      fight.explosions += Number(o.explosions) || 0;
      if (Number.isFinite(o.healthBefore)) fight.before ??= o.healthBefore;
      if (Number.isFinite(o.healthAfter)) fight.after = o.healthAfter;
      continue;
    }
    flush();
    const name = REFLEX_NAMES[source];
    if (name === 'hunger') {
      const x = o;
      if (x.kind === 'ate') out.push({ kind: 'eat', text: `ate ${x.food}: food ${x.hungerBefore} -> ${x.hungerAfter}`, ok: true, at: e.observedAt, reflex: true });
      continue;
    }
    if (name === 'breath') { out.push({ kind: 'breath', text: 'swam up for air', ok: true, at: e.observedAt, reflex: true }); continue; }
    if (name === 'fire') { out.push({ kind: 'fire', text: `got out of fire or lava${o.outcome && o.outcome !== 'escaped' ? ` (${o.outcome})` : ''}`, ok: o.outcome !== 'died', at: e.observedAt, reflex: true }); continue; }
    if (name === 'footing') { if (ev.cancelled === false && o.kind !== 'failed') out.push({ kind: 'footing', text: 'caught itself after being knocked off its feet', ok: true, at: e.observedAt, reflex: true }); continue; }
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The care loop

const TICK_MS = 2_000;
const JOURNAL_KEPT = 60;
/** Each kind of care action's time limit. */
const LIMITS = { recover: 150_000, wear: 20_000, eat: 15_000, hunt: 120_000, cook: 90_000, tools: 60_000, armor: 90_000, sleep: 50_000, shelter: 45_000, dig: 30_000, gather: 40_000, pickbed: 20_000 };
/** What the body says it is doing while a care action runs. */
const DOING = {
  recover: 'going back for the items it dropped when it died', wear: 'putting on armor', eat: 'eating', hunt: 'hunting for food',
  tools: 'crafting a spare tool', armor: 'crafting armor', sleep: 'sleeping', shelter: 'sheltering for the night',
};

/**
 * Run the care for one body.
 * @param {{
 *   situation: () => object|null, latest: () => {inventory: object, equipment: object, position: object|null},
 *   stacks: () => object[], refresh: () => Promise<void>, act: (call, deadline, ctl) => Promise<object>,
 *   rpc: (tool, args, ms) => Promise<object>, plan: (skill, args) => object, idle: () => boolean,
 *   idleSince: () => number, furnaceNear: () => boolean, tableNear: () => boolean, event: (kind, data) => void,
 *   now?: () => number, tickMs?: number, idleBeforeMs?: number, version?: string
 * }} deps
 */
export function createCare(deps) {
  const now = deps.now ?? Date.now;
  const planner = createPlanner({ version: deps.version ?? '1.21.4' });
  let policy = { ...CARE_DEFAULTS };
  const memory = { cool: {}, recovered: null, shelter: null, slept: null, night: 0, wasNight: null };
  const journal = []; // {seq, at, kind, text, ok, source}
  let seq = 0;
  let running = null; // {kind, ctl, done: Promise, preemptible}
  let timer = null;
  let stopped = false;
  let ticking = false;
  let eventsAt = 0;

  const add = (entry) => {
    const e = { seq: ++seq, at: new Date(now()).toISOString(), source: entry.reflex ? 'reflex' : 'care', ...entry };
    delete e.reflex;
    journal.push(e);
    while (journal.length > JOURNAL_KEPT) journal.shift();
    deps.event('care', { kind: e.kind, source: e.source, ok: e.ok, text: String(e.text).slice(0, 300), ...(entry.ms != null ? { ms: entry.ms } : {}) });
    return e;
  };

  /** Can the body craft this item from what it carries (planks, sticks and a table made on the way)? */
  function canCraft(item) {
    if (!reg.itemsByName[item]) return false;
    const inventory = deps.latest().inventory ?? {};
    try {
      const plan = planner.check([{ skill: 'craft', args: { item, n: 1 } }], { inventory, table: () => deps.tableNear(), temporaryStations: true });
      return plan.ok;
    } catch { return false; }
  }
  /** The crafts for one item (the check's added planks, sticks, table, then the item), as their calls. */
  function craftCalls(items) {
    const inventory = { ...(deps.latest().inventory ?? {}) };
    const list = [];
    for (const it of items) {
      const plan = planner.check([{ skill: 'craft', args: { item: it.item, n: it.n ?? 1 } }], { inventory, table: () => deps.tableNear(), temporaryStations: true });
      if (!plan.ok) break;
      for (const st of plan.steps) list.push({ item: st.args.item, n: st.args.n });
    }
    if (!list.length) return null;
    return deps.plan('craft_batch', { items: list }).calls ?? null;
  }

  /** One of their actions for the care, under its own control (a stop cancels it). */
  async function run(calls, limitMs, ctl) {
    const deadline = now() + limitMs;
    const results = [];
    for (const call of calls) {
      if (ctl.stopped) break;
      ctl.actionId = null;
      const out = await deps.act(call, deadline, ctl);
      results.push({ call, out });
      if (out.error || out.output?.result?.status !== 'succeeded') break;
    }
    return results;
  }
  const okOf = (results) => results.length > 0 && results.every((r) => !r.out.error && r.out.output?.result?.status === 'succeeded');
  const errOf = (results) => {
    const bad = results.find((r) => r.out.error || r.out.output?.result?.status !== 'succeeded');
    if (!bad) return null;
    if (bad.out.said) return bad.out.said;
    const e = bad.out.error ?? bad.out.output?.result?.error ?? 'it did not work';
    return String(e).replace(/^\s*\[[A-Z_]+\]\s*/, '').replace(/^MCP error -?\d+: /, '').slice(0, 200);
  };

  /** Carry out one decision. Returns its journal entry (or null when there was nothing to say). */
  async function carry(d, ctl) {
    const t0 = now();
    const inv = () => deps.latest().inventory ?? {};
    const ms = () => now() - t0;
    switch (d.kind) {
      case 'recover': {
        memory.recovered = d.key;
        if (d.far) return add({ kind: 'recover', ok: false, ms: 0, text: `${d.why}: it respawned ${d.far} blocks away, too far to get back to its items before they despawn` });
        const before = { ...inv() };
        const r = await run([{ tool: 'pick_up_items', args: { recover_death_items: true } }], LIMITS.recover, ctl);
        await deps.refresh();
        const got = Object.entries(inv()).map(([k, v]) => [k, v - (before[k] ?? 0)]).filter(([, v]) => v > 0);
        const n = got.reduce((a, [, v]) => a + v, 0);
        const ok = okOf(r) || n > 0;
        return add({ kind: 'recover', ok, ms: ms(), text: ok ? `${d.why}: went back and picked up ${n ? `${plural(n, 'item')} (${got.map(([k, v]) => `${v} ${k}`).join(', ')})` : 'nothing (nothing was left there)'} in ${Math.round(ms() / 1000)} s` : `${d.why}: could not get its items back (${errOf(r) ?? 'stopped'})` });
      }
      case 'wear': {
        const r = await run([{ tool: 'equip', args: { items: d.items.map((w) => ({ item_name: w.item, destination: w.to })) } }], LIMITS.wear, ctl);
        if (!okOf(r)) memory.cool.wear = now();
        return add({ kind: 'wear', ok: okOf(r), ms: ms(), text: okOf(r) ? `put on ${d.items.map((w) => `${w.item} (${w.to})`).join(', ')}` : `tried to put on ${d.items.map((w) => w.item).join(', ')}: ${errOf(r)}` });
      }
      case 'eat': {
        const food0 = deps.situation()?.vitals?.food;
        const r = await run([{ tool: 'eat_food', args: { food_name: d.food } }], LIMITS.eat, ctl);
        if (!okOf(r)) memory.cool.eat = now();
        await deps.refresh();
        return add({ kind: 'eat', ok: okOf(r), ms: ms(), text: okOf(r) ? `ate ${d.food} (${d.why}): food ${food0} -> ${deps.situation()?.vitals?.food ?? '?'}` : `tried to eat ${d.food}: ${errOf(r)}` });
      }
      case 'hunt': {
        memory.cool.hunt = now();
        const before = inv()[d.drop] ?? 0;
        const r = await run([{ tool: 'collect_mob_drop', args: { mob_name: d.mob, drop_name: d.drop, count: d.n } }], LIMITS.hunt, ctl);
        await deps.refresh();
        let got = (inv()[d.drop] ?? 0) - before;
        const parts = [`${d.why}: hunted ${d.mob} ${d.distance} blocks away and got ${got} ${d.drop}`];
        let ok = got > 0;
        if (ok && d.cook && !ctl.stopped) {
          const smelt = deps.plan('smelt', { item: d.drop, n: inv()[d.drop] ?? got });
          if (smelt.calls) {
            const c = await run(smelt.calls, LIMITS.cook, ctl);
            await deps.refresh();
            if (okOf(c)) parts.push(`cooked it`); else parts.push(`could not cook it (${errOf(c)})`);
          }
        }
        if (ok && !ctl.stopped) {
          const meal = bestFood(inv());
          const food0 = deps.situation()?.vitals?.food;
          if (meal && food0 < 20) {
            const e = await run([{ tool: 'eat_food', args: { food_name: meal } }], LIMITS.eat, ctl);
            await deps.refresh();
            parts.push(okOf(e) ? `ate ${meal}: food ${food0} -> ${deps.situation()?.vitals?.food ?? '?'}` : `could not eat (${errOf(e)})`);
          }
        }
        if (!ok) parts.push(`(${errOf(r) ?? 'stopped'})`);
        got = Math.max(0, got);
        return add({ kind: 'hunt', ok, ms: ms(), text: parts.join('; ') });
      }
      case 'tools':
      case 'armor': {
        const items = d.kind === 'tools' ? [{ item: d.item, n: 1 }] : d.pieces.map((p) => ({ item: p.item, n: 1 }));
        const calls = craftCalls(items);
        memory.cool[d.kind] = now();
        if (!calls) return add({ kind: d.kind, ok: false, ms: ms(), text: `${d.why}, but the crafts did not add up after all` });
        const before = { ...inv() };
        const r = await run(calls, LIMITS[d.kind], ctl);
        await deps.refresh();
        const made = items.filter((it) => (inv()[it.item] ?? 0) > (before[it.item] ?? 0)).map((it) => it.item);
        let text = made.length ? `${d.why}: crafted ${made.join(', ')}` : `${d.why}: could not craft ${items.map((i) => i.item).join(', ')} (${errOf(r) ?? 'stopped'})`;
        if (d.kind === 'armor' && made.length && !ctl.stopped) {
          const wear = wearPlan(deps.stacks());
          if (wear.length) {
            const w = await run([{ tool: 'equip', args: { items: wear.map((x) => ({ item_name: x.item, destination: x.to })) } }], LIMITS.wear, ctl);
            text += okOf(w) ? ` and put ${made.length > 1 ? 'them' : 'it'} on` : `; could not put it on (${errOf(w)})`;
          }
        }
        return add({ kind: d.kind, ok: made.length > 0, ms: ms(), text });
      }
      case 'sleep': {
        memory.slept = memory.night;
        memory.cool.sleep = now();
        const r = await run([{ tool: 'sleep', args: {} }], LIMITS.sleep, ctl);
        const out = r[0]?.out?.output?.result?.sleep ?? null;
        const parts = [];
        if (okOf(r) && out?.morning) parts.push(`${d.why}: slept in its bed at ${xyz(out.bedPosition)}; the night passed`);
        else if (okOf(r)) parts.push(`${d.why}: lay down in its bed at ${xyz(out?.bedPosition)}, but the night did not pass (another player is awake)`);
        else parts.push(`${d.why}: could not sleep (${errOf(r) ?? 'stopped'})`);
        // a bed it put down is picked up again (it travels with the bot; the respawn point stays only while the bed does)
        if (out?.placedBed && out.bedPosition && !ctl.stopped) {
          const bedName = Object.keys(inv()).find((n) => BEDS.test(n)) ?? d.bed;
          const back = await run([{ tool: 'collect_block', args: { block_name: d.bed, count: 1 } }], LIMITS.pickbed, ctl);
          await deps.refresh();
          parts.push(okOf(back) || (inv()[bedName] ?? 0) > 0 ? 'picked the bed up again' : `left the bed there (${errOf(back) ?? 'stopped'})`);
        }
        return add({ kind: 'sleep', ok: Boolean(okOf(r) && out?.morning), ms: ms(), text: parts.join('; ') });
      }
      case 'shelter': {
        // no cooling down after a shelter that worked: a step of the player's that took the bot out of it is followed
        // by a new one as soon as the body is idle again
        let p = deps.situation()?.position;
        if (!p) return null;
        const parts = [];
        // too few blocks for walls: dig into the ground (two blocks down; the ground itself is the walls)
        if (shelterBlocks(inv()).total < SHELTER_SIZE && !d.check) {
          const target = { x: Math.floor(p.x), y: Math.floor(p.y) - 2, z: Math.floor(p.z) };
          const r = await run([{ tool: 'navigate', args: target }], LIMITS.dig, ctl);
          await deps.refresh();
          p = deps.situation()?.position ?? p;
          parts.push(okOf(r) ? `dug two blocks down (it carried too few blocks for walls)` : `could not dig in (${errOf(r) ?? 'stopped'})`);
        }
        if (ctl.stopped) return add({ kind: 'shelter', ok: false, ms: ms(), text: `${d.why}: stopped before its shelter was closed (your call came)` });
        const feet = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
        const cells = shelterCells(feet, deps.situation()?.position?.headingDegrees ?? 0, inv());
        // never digs: a wall or roof cell that already holds a solid block is wall enough
        const r = await run([{ tool: 'build_structure', args: { blocks: cells, remove_wrong_blocks: false } }], LIMITS.shelter, ctl);
        await deps.refresh();
        const v = shelterVerdict(r[0]?.out?.output?.result?.structure ?? null);
        memory.shelter = v.closed ? { feet, at: now(), checked: now(), night: memory.night } : null;
        if (d.check && v.closed && !v.placed) return null; // still standing: nothing to tell
        parts.push(v.closed
          ? `${d.check ? 'mended its shelter' : 'closed itself in'} at ${xyz(feet)} (${v.placed ? `placed ${plural(v.placed, 'block')}` : 'placed nothing'}${v.solid ? `, ${plural(v.solid, 'wall cell')} already solid` : ''}); it stays inside until your next call`
          : `could not close a shelter at ${xyz(feet)} (${v.why ?? errOf(r) ?? 'stopped'})`);
        if (!v.closed && !d.check) {
          memory.cool.shelter = now();
          memory.shelterFails = { [memory.night]: (memory.shelterFails?.[memory.night] ?? 0) + 1 };
        }
        return add({ kind: 'shelter', ok: v.closed, ms: ms(), text: `${d.why}: ${parts.join('; ')}` });
      }
      default:
        return null;
    }
  }

  /** Read their reflex events (always, also during a step: deaths and broken tools come from there). */
  async function readEvents() {
    const data = await deps.rpc('read_recent_events', { limit: 100 }, 10_000);
    const events = data?.result?.events;
    if (!Array.isArray(events) || !events.length) return;
    for (const e of describeEvents(events)) add({ ...e, reflex: e.reflex ?? e.kind !== 'death' });
  }

  async function tick() {
    if (ticking || stopped) return;
    ticking = true;
    try {
      if (now() - eventsAt >= 4_000) { eventsAt = now(); await readEvents().catch(() => {}); }
      if (deps.idle()) await deps.fresh?.().catch(() => {}); // a status a few seconds old at most (the clock, mobs)
      const situation = deps.situation();
      if (!situation) return;
      // nights are counted as the body sees them fall (a sleep or a shelter belongs to one night)
      const nightNow = isNight(situation.clock?.timeOfDay);
      if (nightNow && memory.wasNight === false) memory.night += 1;
      memory.wasNight = nightNow;
      if (running || !deps.idle() || now() - deps.idleSince() < (deps.idleBeforeMs ?? IDLE_BEFORE_MS)) return;
      if (situation.activity?.owner && situation.activity.owner !== 'idle') return; // one of their reflexes has the body
      const latest = deps.latest();
      const d = decide(situation, { inventory: latest.inventory ?? {}, stacks: deps.stacks(), policy, memory, now: now(), canCraft, furnace: (latest.inventory?.furnace ?? 0) > 0 || deps.furnaceNear() });
      if (!d) return;
      const ctl = { skill: `care:${d.kind}`, actionId: null, stopped: null, cancel: null, attack: null, killed: 0 };
      const preemptible = d.kind !== 'recover';
      deps.event('care_start', { kind: d.kind, why: String(d.why).slice(0, 200) });
      const job = { kind: d.kind, ctl, preemptible, startedAt: now() };
      running = job;
      // the status is read again once it is done, so the next decision never acts on what it just changed
      job.done = carry(d, ctl).catch((err) => add({ kind: d.kind, ok: false, text: `${d.why}: ${String(err?.message ?? err).slice(0, 200)}` }))
        .then(() => deps.refresh().catch(() => {})).finally(() => { if (running === job) running = null; });
      await job.done;
    } finally {
      ticking = false;
    }
  }

  return {
    get policy() { return { ...policy }; },
    /** Set some knobs (CARE_KNOBS) for the rest of the game; none: back to the defaults. Returns the policy. */
    setPolicy(knobs = null) {
      policy = knobs ? { ...policy, ...Object.fromEntries(Object.entries(knobs).filter(([k, v]) => CARE_KNOBS[k]?.includes(v))) } : { ...CARE_DEFAULTS };
      return { ...policy };
    },
    start() { if (!timer && !stopped) timer = setInterval(() => { tick().catch(() => {}); }, deps.tickMs ?? TICK_MS); timer?.unref?.(); },
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      await this.yield({ force: true });
    },
    tick,
    readEvents,
    /** What the body is doing by itself right now, in words, or null. */
    now() { return running ? DOING[running.kind] ?? running.kind : null; },
    /** Let the player's step have the body: cancel what the care runs (a recovery is waited for) and wait until it settled. */
    async yield({ force = false, maxMs = LIMITS.recover } = {}) {
      const job = running;
      if (!job) return null;
      if (job.preemptible || force) {
        job.ctl.stopped ??= 'your call came';
        await job.ctl.cancel?.(job.ctl.stopped);
      }
      await Promise.race([job.done, new Promise((r) => { setTimeout(r, maxMs).unref?.(); })]);
      return job.kind;
    },
    /** Journal entries after seq (oldest first). */
    since(after = 0) { return journal.filter((e) => e.seq > after); },
    last() { return journal.at(-1) ?? null; },
    get seq() { return seq; },
    /** Tests: the memory and the decision inputs. */
    memory,
    canCraft,
    craftCalls,
    add,
  };
}
