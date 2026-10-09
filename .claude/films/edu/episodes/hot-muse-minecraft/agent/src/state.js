// src/state.js - the game state as data (StateSnapshot) and as the plain text the model reads: health, food,
// position, facing, time of day, inventory, notable blocks within SCAN_RADIUS (default 32) blocks (count and nearest), nearby mobs, the
// current goal and the last result. Reads the bot only; never changes the game. The block scan (about 30 searches of
// the chunks around the bot) is kept per bot and done again only after SCAN_MOVE blocks of movement, a change to a
// notable block in range, or SCAN_MS (roadmap M2: every reply reads the state).

import { LOGS } from './game.js';

/** Blocks worth reporting: wood, ores, stations, loose materials, liquids. Common ground (dirt, grass) is left out. */
export const NOTABLE_BLOCKS = Object.freeze([
  ...LOGS,
  'coal_ore', 'deepslate_coal_ore', 'iron_ore', 'deepslate_iron_ore', 'copper_ore', 'deepslate_copper_ore',
  'gold_ore', 'deepslate_gold_ore', 'diamond_ore', 'deepslate_diamond_ore',
  'stone', 'deepslate', 'sand', 'gravel', 'clay',
  'crafting_table', 'furnace', 'chest', 'water', 'lava',
]);

const RADIUS = Number(process.env.SCAN_RADIUS) || 32;
/** The cached block scan is redone after the bot moved this far, or after this long. */
export const SCAN_MOVE = 4;
export const SCAN_MS = 5_000;
const CAP = 64; // per block type; more shows as "64+"
const MAX_MOBS = 10;
const HOSTILE = 'Hostile mobs';
const PASSIVE = 'Passive mobs';
const FACINGS = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };

const round1 = (v) => Math.round(v * 10) / 10;
const floorPos = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });
const xyz = (p) => `${p.x} ${p.y} ${p.z}`;
// eslint-disable-next-line no-control-regex
const oneLine = (s, max) => String(s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim().slice(0, max);

/**
 * The cardinal direction a yaw faces (mineflayer: yaw 0 looks toward -z, i.e. north), as a name and a unit step.
 * @param {number} yaw
 * @returns {{name: 'north'|'south'|'east'|'west', dx: number, dz: number}}
 */
export function facingOf(yaw = 0) {
  const x = -Math.sin(yaw);
  const z = -Math.cos(yaw);
  const name = Math.abs(x) > Math.abs(z) ? (x > 0 ? 'east' : 'west') : (z > 0 ? 'south' : 'north');
  const [dx, dz] = FACINGS[name];
  return { name, dx, dz };
}

/** Day phase and how long until it changes, from timeOfDay (0-23999, 20 ticks per second). */
export function describeTime(timeOfDay) {
  const t = ((Math.floor(timeOfDay) % 24000) + 24000) % 24000;
  const wait = (ticks) => {
    const s = Math.round(ticks / 20);
    return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`;
  };
  if (t < 12000) return `day, night falls in about ${wait(13000 - t)}`;
  if (t < 13000) return `sunset, night falls in about ${wait(13000 - t)}`;
  if (t < 23000) return `night (hostile mobs spawn), sunrise in about ${wait(23000 - t)}`;
  return 'sunrise';
}

/** {item name: count} over the main inventory and hotbar. */
export function inventoryOf(bot) {
  const out = {};
  for (const it of bot.inventory?.items?.() ?? []) out[it.name] = (out[it.name] ?? 0) + it.count;
  return out;
}

/** Notable blocks within radius: per type the count (capped) and the nearest one, closest types first. */
export function nearbyBlocks(bot, { radius = RADIUS, cap = CAP, names = NOTABLE_BLOCKS } = {}) {
  const from = bot.entity.position;
  const out = [];
  for (const name of names) {
    const def = bot.registry.blocksByName[name];
    if (!def) continue;
    let found;
    try { found = bot.findBlocks({ matching: def.id, maxDistance: radius, count: cap }); } catch { continue; }
    if (!found?.length) continue;
    const nearest = found.reduce((a, b) => (a.distanceTo(from) <= b.distanceTo(from) ? a : b));
    const row = {
      name,
      count: found.length,
      nearest: floorPos(nearest),
      distance: round1(nearest.offset(0.5, 0.5, 0.5).distanceTo(from)),
    };
    if (found.length >= cap) row.capped = true;
    out.push(row);
  }
  return out.sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}

const scans = new WeakMap(); // bot -> {rows, pos, at, radius, dirty, ids}

/**
 * nearbyBlocks, from the per-bot cache when it still holds: the bot moved less than SCAN_MOVE blocks, no notable
 * block within the radius changed (the bot's blockUpdate events) and the scan is under SCAN_MS old. Distances are
 * measured again from where the bot stands now.
 */
export function cachedNearbyBlocks(bot, { radius = RADIUS } = {}) {
  let c = scans.get(bot);
  if (!c) {
    const ids = new Set(NOTABLE_BLOCKS.map((n) => bot.registry.blocksByName[n]?.id).filter((id) => id !== undefined));
    c = { rows: null, pos: null, at: 0, radius, dirty: true, ids, scans: 0 };
    scans.set(bot, c);
    bot.on?.('blockUpdate', (oldBlock, newBlock) => {
      if (c.dirty || !c.pos) return;
      const b = newBlock ?? oldBlock;
      if (!b?.position || (!c.ids.has(oldBlock?.type) && !c.ids.has(newBlock?.type))) return;
      if (b.position.distanceTo(c.pos) <= c.radius + 1) c.dirty = true;
    });
  }
  const from = bot.entity.position;
  if (c.dirty || !c.rows || c.radius !== radius || Date.now() - c.at >= SCAN_MS || from.distanceTo(c.pos) >= SCAN_MOVE) {
    c.rows = nearbyBlocks(bot, { radius });
    c.pos = from.clone();
    c.at = Date.now();
    c.radius = radius;
    c.dirty = false;
    c.scans += 1;
    return c.rows.map((r) => ({ ...r, nearest: { ...r.nearest } }));
  }
  return c.rows
    .map((r) => ({ ...r, nearest: { ...r.nearest }, distance: round1(Math.hypot(r.nearest.x + 0.5 - from.x, r.nearest.y + 0.5 - from.y, r.nearest.z + 0.5 - from.z)) }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name));
}

/** How many full block scans the cache has done for this bot (tests, measurements). */
export const scanCount = (bot) => scans.get(bot)?.scans ?? 0;

/** Mobs (never players, items or projectiles) within radius, closest first. */
export function nearbyMobs(bot, { radius = RADIUS, max = MAX_MOBS } = {}) {
  const from = bot.entity.position;
  const out = [];
  for (const e of Object.values(bot.entities ?? {})) {
    if (!e || e === bot.entity || e.type === 'player' || e.isValid === false || !e.position) continue;
    const category = bot.registry.entitiesByName[e.name]?.category;
    if (category !== HOSTILE && category !== PASSIVE) continue;
    const distance = e.position.distanceTo(from);
    if (distance > radius) continue;
    out.push({ name: e.name, hostile: category === HOSTILE, distance: round1(distance), position: floorPos(e.position), id: e.id });
  }
  out.sort((a, b) => a.distance - b.distance);
  return out.slice(0, max);
}

/**
 * The structured state (StateSnapshot in contracts.js, plus facing, oxygen and doing).
 * @param {object} bot
 * @param {{goal?: string|null, busy?: boolean, doing?: string|null, lastResult?: string|null, radius?: number}} [extra]
 * @returns {import('./contracts.js').StateSnapshot}
 */
export function snapshotOf(bot, extra = {}) {
  const t = bot.time?.timeOfDay ?? 0;
  return {
    health: Math.round((bot.health ?? 0) * 10) / 10,
    food: bot.food ?? 0,
    oxygen: bot.oxygenLevel ?? 20,
    position: floorPos(bot.entity.position),
    facing: facingOf(bot.entity.yaw).name,
    dimension: String(bot.game?.dimension ?? 'overworld').replace(/^minecraft:/, ''),
    timeOfDay: t,
    isDay: bot.time?.isDay ?? (t < 13000 || t >= 23000),
    inventory: inventoryOf(bot),
    held: bot.heldItem?.name ?? null,
    nearbyBlocks: cachedNearbyBlocks(bot, { radius: extra.radius }),
    mobs: nearbyMobs(bot, { radius: extra.radius }).map(({ id, ...m }) => m),
    goal: extra.goal ?? null,
    busy: Boolean(extra.busy),
    doing: extra.doing ?? null,
    lastResult: extra.lastResult ?? null,
  };
}

/** A short form of a tool call for logs and the state: "collect oak_log 4", "place cobblestone at 1 64 2". */
export function describeCall(tool, args = {}) {
  if (!args || typeof args !== 'object') return String(tool);
  if (tool === 'say') return `say "${oneLine(args.text ?? '', 40)}"`;
  if (tool === 'go_to') return `go_to ${xyz(args)}`;
  if (tool === 'place' && args.pos) return `place ${args.block} at ${xyz(args.pos)}`;
  if (Array.isArray(args.items)) return `${tool} ${args.items.map((i) => `${i?.item} ${i?.n}`).join(', ')}`; // craft_batch
  const parts = Object.values(args).map((v) => (v && typeof v === 'object' ? xyz(v) : String(v)));
  return [tool, ...parts].join(' ');
}

/** "oak_log +4, oak_planks -3" from an InventoryDelta. */
export function describeDelta(delta = {}) {
  return Object.entries(delta).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
}

/**
 * The state as plain text for the model. One fact per line, stable order.
 * @param {import('./contracts.js').StateSnapshot} s
 */
export function renderState(s) {
  const lines = [];
  lines.push(`health ${s.health}/20, food ${s.food}/20${s.oxygen < 20 ? `, oxygen ${s.oxygen}/20 (underwater)` : ''}`);
  lines.push(`position ${xyz(s.position)} in the ${s.dimension}, facing ${s.facing}`);
  lines.push(`time ${s.timeOfDay}: ${describeTime(s.timeOfDay)}`);
  lines.push(`holding: ${s.held ?? 'nothing'}`);
  const inv = Object.entries(s.inventory).sort(([a], [b]) => a.localeCompare(b));
  lines.push(`inventory: ${inv.length ? inv.map(([k, v]) => `${k} ${v}`).join(', ') : 'empty'}`);
  // a body that reports what is worn (BODY=mineai): armor by slot, and the off-hand
  const worn = Object.entries(s.equipment ?? {});
  if (worn.length) {
    const armor = worn.filter(([slot]) => slot !== 'off-hand').map(([slot, item]) => `${item} (${slot})`);
    const off = s.equipment['off-hand'];
    lines.push(`wearing: ${armor.length ? armor.join(', ') : 'no armor'}${off ? `; off-hand: ${off}` : ''}`);
  }
  lines.push(`nearby blocks (within ${RADIUS}): ${s.nearbyBlocks.length
    ? s.nearbyBlocks.map((b) => `${b.name} ${b.count}${b.capped ? '+' : ''} (nearest ${b.distance} away at ${xyz(b.nearest)})`).join('; ')
    : 'nothing notable'}`);
  lines.push(`nearby mobs: ${s.mobs.length
    ? s.mobs.map((m) => `${m.name}${m.hostile ? ' (hostile)' : ''} ${m.distance} away at ${xyz(m.position)}`).join('; ')
    : 'none'}`);
  if (s.smelting) lines.push(`furnaces: ${s.smelting}`);
  if (s.stations?.length) lines.push(`your stations: ${s.stations.map((st) => `${st.name} at ${xyz(st)}`).join(', ')}`);
  lines.push(`goal: ${s.goal ?? 'none'}`);
  if (s.busy) lines.push(`doing now: ${s.doing ?? 'a skill'}`);
  lines.push(`last result: ${s.lastResult ?? 'none yet'}`);
  // a body that looks after itself between calls (BODY=mineai, src/mineai/care.js)
  if (s.care?.now) lines.push(`on its own now: ${s.care.now}`);
  if (s.care?.last) lines.push(`last done on its own (${s.care.last.agoS} s ago): ${s.care.last.text}`);
  return lines.join('\n');
}
