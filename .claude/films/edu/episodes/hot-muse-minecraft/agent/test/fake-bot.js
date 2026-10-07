// test/fake-bot.js - an in-memory stand-in for the parts of a mineflayer bot the body uses: world blocks, inventory
// (a real prismarine-windows window), position, health, food, time, findBlocks/blockAt, dig with real drops and harvest
// rules, recipesFor/recipesAll/craft on real recipes, furnaces, equip, placeBlock, consume, attack, chat,
// pathfinder.goto and collectBlock.collect. Movement, digging and smelting are instant unless timings are given.
//
//   const bot = createFakeBot({ scene: 'forest', inventory: { oak_planks: 8 } });
//   const body = createBody({ bot });           // the body uses the fake exactly like a real bot
//   bot.fake.counts(), bot.fake.calls, bot.fake.chat   // what happened
//
// Simplifications: terrain below y=64 (stone/dirt/grass) exists for blockAt but only blocks set explicitly (scenes,
// setBlock) are found by findBlocks; drops and mob loot go straight into the inventory; mobs never move or fight back.

import { EventEmitter } from 'node:events';
import { requireMc, Vec3, registryFor } from '../src/mc.js';
import { SMELT, FUEL } from '../src/game.js';

const QUICK_BAR_START = 36;
const TOOL_TIERS = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden'];
const SWORD_DAMAGE = { wooden_sword: 4, golden_sword: 4, stone_sword: 5, iron_sword: 6, diamond_sword: 7, netherite_sword: 8 };
const AXE_DAMAGE = { wooden_axe: 7, golden_axe: 7, stone_axe: 9, iron_axe: 9, diamond_axe: 9, netherite_axe: 10 };
const LOOT = {
  cow: { beef: 1, leather: 1 }, pig: { porkchop: 1 }, sheep: { mutton: 1, white_wool: 1 }, chicken: { chicken: 1, feather: 1 },
  rabbit: { rabbit: 1 }, zombie: { rotten_flesh: 1 }, husk: { rotten_flesh: 1 }, drowned: { rotten_flesh: 1 },
  skeleton: { bone: 1, arrow: 1 }, stray: { bone: 1, arrow: 1 }, spider: { string: 1 }, cave_spider: { string: 1 },
  creeper: { gunpowder: 1 }, slime: { slime_ball: 1 },
};
const ALWAYS_EDIBLE = ['golden_apple', 'enchanted_golden_apple', 'chorus_fruit', 'milk_bucket', 'potion'];

const at = (x, y, z) => new Vec3(x, y, z);
const keyOf = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const terrain = (y) => (y <= 59 ? 'stone' : y <= 62 ? 'dirt' : y === 63 ? 'grass_block' : 'air');
const wait = (ms) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : new Promise((r) => setImmediate(r)));
const named = (name, message) => Object.assign(new Error(message), { name });

/** Ready-made worlds: lists of [x, y, z, block] and mobs. */
export const SCENES = {
  flat: () => ({ blocks: [], mobs: [] }),
  // Three oak trees (12 logs), a 4x4 patch of exposed stone, coal and iron ore in a shallow pit, one cow.
  forest: () => {
    const blocks = [];
    for (const [x, z] of [[3, 2], [-4, 3], [5, -3]]) {
      for (let y = 64; y <= 67; y++) blocks.push([x, y, z, 'oak_log']);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blocks.push([x + dx, 67, z + dz, 'oak_leaves']);
      blocks.push([x, 68, z, 'oak_leaves']);
    }
    for (let x = 8; x <= 11; x++) for (let z = -1; z <= 2; z++) blocks.push([x, 63, z, 'stone']);
    blocks.push([9, 62, 3, 'coal_ore'], [10, 62, 3, 'coal_ore'], [8, 62, 4, 'coal_ore']);
    blocks.push([-8, 62, -8, 'iron_ore'], [-8, 62, -9, 'iron_ore'], [-9, 62, -8, 'iron_ore']);
    return { blocks, mobs: [['cow', 6, 64, 6]] };
  },
};

/**
 * @param {object} [opts]
 * @param {string} [opts.version]        game version (default 1.21.4)
 * @param {string} [opts.username]
 * @param {{x:number,y:number,z:number}} [opts.position]   feet position (default 0.5, 64, 0.5)
 * @param {'flat'|'forest'} [opts.scene]
 * @param {Record<string, number>} [opts.inventory]       starting items
 * @param {number} [opts.health]  @param {number} [opts.food]  @param {number} [opts.timeOfDay]
 * @param {number} [opts.reach]           max distance for dig / place / craft table / furnace / attack (default 6)
 * @param {number} [opts.digMs]           time per dig (default instant)
 * @param {number} [opts.moveMsPerBlock]  walking time (default instant)
 * @param {number} [opts.smeltMsPerItem]  furnace time per item (default instant)
 * @param {{lagMs?: number, deaf?: boolean, noOpen?: boolean}} [opts.clickServer]  a protocol client (bot._client) and a
 *   server-side model of windows: crafting goes through window clicks the way it does on a real server (see below)
 */
export function createFakeBot(opts = {}) {
  const version = opts.version ?? '1.21.4';
  const registry = registryFor(version);
  const Block = requireMc('prismarine-block')(registry);
  const Item = requireMc('prismarine-item')(registry);
  const { Recipe } = requireMc('prismarine-recipe')(registry);
  const windows = requireMc('prismarine-windows')(registry);
  const reach = opts.reach ?? 6;
  const digMs = opts.digMs ?? 0;
  const moveMsPerBlock = opts.moveMsPerBlock ?? 0;
  const smeltMsPerItem = opts.smeltMsPerItem ?? 0;

  const bot = new EventEmitter();
  const world = new Map();
  const furnaces = new Map();
  const calls = [];
  const chatLog = [];
  const plugins = [];
  const record = (fn, args = {}) => calls.push({ fn, ...args });
  let nextEntityId = 1;

  // ---- identity, status, world --------------------------------------------------------------------------------
  bot.username = opts.username ?? 'Muse';
  bot.version = version;
  bot.majorVersion = registry.version.majorVersion;
  bot.registry = registry;
  bot.supportFeature = (feature) => registry.supportFeature(feature);
  bot.health = opts.health ?? 20;
  bot.food = opts.food ?? 20;
  bot.foodSaturation = 5;
  bot.oxygenLevel = 20;
  bot.isRaining = false;
  bot.experience = { level: 0, points: 0, progress: 0 };
  bot.game = { gameMode: 'survival', dimension: 'overworld', difficulty: 'normal', minY: -64, height: 384 };
  bot.time = {};
  const setTime = (t) => {
    const timeOfDay = ((t % 24000) + 24000) % 24000;
    Object.assign(bot.time, { timeOfDay, time: timeOfDay, day: 1, age: timeOfDay, isDay: timeOfDay < 13000 || timeOfDay >= 23000 });
  };
  setTime(opts.timeOfDay ?? 1000);
  const p0 = opts.position ?? { x: 0.5, y: 64, z: 0.5 };
  bot.entity = { id: 0, type: 'player', name: 'player', username: bot.username, position: at(p0.x, p0.y, p0.z), velocity: at(0, 0, 0), yaw: 0, pitch: 0, height: 1.8, onGround: true, isValid: true };
  bot.entities = { 0: bot.entity };
  bot.players = { [bot.username]: { username: bot.username, entity: bot.entity, ping: 0 } };
  bot.controlState = {};

  function makeBlock(name, pos) {
    const def = registry.blocksByName[name];
    if (!def) throw new Error(`fake-bot: unknown block "${name}"`);
    const b = Block.fromStateId(def.defaultState, 0);
    b.position = at(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z));
    return b;
  }
  const nameAt = (p) => world.get(keyOf(p)) ?? terrain(Math.floor(p.y));
  function setBlock(pos, name) {
    const old = bot.blockAt(pos);
    world.set(keyOf(pos), name);
    const now = bot.blockAt(pos);
    bot.emit('blockUpdate', old, now);
    bot.emit(`blockUpdate:${now.position}`, old, now);
    return now;
  }
  const centre = (p) => at(Math.floor(p.x) + 0.5, Math.floor(p.y) + 0.5, Math.floor(p.z) + 0.5);
  const eyes = () => bot.entity.position.offset(0, 1.62, 0);
  const inReach = (p) => eyes().distanceTo(centre(p)) <= reach;

  bot.blockAt = (pos) => makeBlock(nameAt(pos), pos);

  bot.findBlocks = ({ matching, maxDistance = 16, count = 1, point } = {}) => {
    const from = point ?? bot.entity.position;
    const test = typeof matching === 'function' ? matching
      : Array.isArray(matching) ? (b) => matching.includes(b.type)
        : matching instanceof Set ? (b) => matching.has(b.type)
          : (b) => b.type === matching;
    const found = [];
    for (const [k, name] of world) {
      if (name === 'air') continue;
      const [x, y, z] = k.split(',').map(Number);
      const p = at(x, y, z);
      const d = p.distanceTo(from);
      if (d <= maxDistance && test(makeBlock(name, p))) found.push([d, p]);
    }
    return found.sort((a, b) => a[0] - b[0]).slice(0, count).map(([, p]) => p);
  };
  bot.findBlock = (o = {}) => {
    const [p] = bot.findBlocks({ ...o, count: 1 });
    return p ? bot.blockAt(p) : null;
  };
  bot.canSeeBlock = () => true;
  bot.canDigBlock = (block) => Boolean(block && block.diggable && block.name !== 'air' && inReach(block.position));

  // ---- inventory ----------------------------------------------------------------------------------------------
  bot.inventory = windows.createWindow(0, 'minecraft:inventory', 'Inventory');
  bot.QUICK_BAR_START = QUICK_BAR_START;
  bot.quickBarSlot = 0;
  Object.defineProperty(bot, 'heldItem', { get: () => bot.inventory.slots[QUICK_BAR_START + bot.quickBarSlot], enumerable: true });

  const itemId = (nameOrId) => (typeof nameOrId === 'number' ? nameOrId : registry.itemsByName[nameOrId]?.id);
  function give(nameOrId, count = 1) {
    const id = itemId(nameOrId);
    if (id === undefined) throw new Error(`fake-bot: unknown item "${nameOrId}"`);
    const stack = registry.items[id].stackSize || 1;
    const order = [...Array(9).keys()].map((i) => QUICK_BAR_START + i).concat([...Array(27).keys()].map((i) => 9 + i));
    let left = count;
    for (const slot of order) {
      const it = bot.inventory.slots[slot];
      if (left > 0 && it && it.type === id && it.count < stack) {
        const add = Math.min(stack - it.count, left);
        bot.inventory.updateSlot(slot, new Item(id, it.count + add));
        left -= add;
      }
    }
    for (const slot of order) {
      if (left > 0 && !bot.inventory.slots[slot]) {
        const add = Math.min(stack, left);
        bot.inventory.updateSlot(slot, new Item(id, add));
        left -= add;
      }
    }
    if (left > 0) throw new Error('fake-bot: inventory full');
    bot.emit('heldItemChanged', bot.heldItem);
  }
  function take(nameOrId, count = 1) {
    const id = itemId(nameOrId);
    if (bot.inventory.count(id) < count) throw new Error(`fake-bot: not enough ${registry.items[id]?.name ?? nameOrId}`);
    bot.inventory.clear(id, count);
    bot.emit('heldItemChanged', bot.heldItem);
  }
  const counts = () => {
    const out = {};
    for (const it of bot.inventory.items()) out[it.name] = (out[it.name] ?? 0) + it.count;
    return out;
  };

  const DEST = { head: 5, torso: 6, legs: 7, feet: 8, 'off-hand': 45 };
  bot.equip = async (item, destination = 'hand') => {
    const id = typeof item === 'number' ? item : item?.type;
    const from = bot.inventory.slots.findIndex((s, i) => s && s.type === id && i >= 5);
    if (from < 0) throw new Error(`Invalid item object in equip (item=${JSON.stringify(item?.name ?? item)})`);
    record('equip', { item: registry.items[id].name, destination });
    if (destination === 'hand') {
      if (from >= QUICK_BAR_START && from < QUICK_BAR_START + 9) bot.quickBarSlot = from - QUICK_BAR_START;
      else {
        const to = QUICK_BAR_START + bot.quickBarSlot;
        const a = bot.inventory.slots[from];
        const b = bot.inventory.slots[to];
        bot.inventory.updateSlot(to, a);
        bot.inventory.updateSlot(from, b);
      }
    } else if (DEST[destination] !== undefined) {
      const to = DEST[destination];
      const a = bot.inventory.slots[from];
      bot.inventory.updateSlot(from, bot.inventory.slots[to]);
      bot.inventory.updateSlot(to, a);
    } else throw new Error(`invalid destination: ${destination}`);
    bot.emit('heldItemChanged', bot.heldItem);
  };
  bot.unequip = async (destination = 'hand') => {
    record('unequip', { destination });
    const slot = destination === 'hand' ? QUICK_BAR_START + bot.quickBarSlot : DEST[destination];
    const it = bot.inventory.slots[slot];
    if (!it) return;
    bot.inventory.updateSlot(slot, null);
    give(it.type, it.count);
  };
  bot.toss = async (itemType, metadata, count) => { record('toss', { item: registry.items[itemType]?.name, count }); take(itemType, count ?? 1); };
  bot.tossStack = async (item) => { record('toss', { item: item.name, count: item.count }); bot.inventory.updateSlot(item.slot, null); };

  // ---- digging and placing ------------------------------------------------------------------------------------
  let digging = null;
  bot.targetDigBlock = null;
  bot.dig = async (block) => {
    const b = bot.blockAt(block.position);
    record('dig', { block: b.name, pos: b.position.toString() });
    if (b.name === 'air' || !b.diggable) throw new Error(`dig: cannot dig ${b.name}`);
    if (!inReach(b.position)) throw new Error(`dig: ${b.name} at ${b.position} is out of reach`);
    bot.targetDigBlock = b;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, digMs);
      digging = { abort: () => { clearTimeout(timer); reject(new Error('Digging aborted')); } };
    }).finally(() => { digging = null; bot.targetDigBlock = null; });
    setBlock(b.position, 'air');
    const held = bot.heldItem?.type ?? null;
    if (!b.harvestTools || b.canHarvest(held)) {
      for (const d of b.drops ?? []) {
        const id = typeof d === 'number' ? d : d.drop?.id ?? d.id;
        give(id, 1);
        // the pickup as the server reports it (mineflayer's playerCollect with the item entity)
        bot.emit('playerCollect', bot.entity, { name: 'item', getDroppedItem: () => new Item(id, 1) });
      }
    }
    bot.emit('diggingCompleted', b);
  };
  bot.stopDigging = () => { if (digging) { record('stopDigging'); digging.abort(); } };

  bot.placeBlock = async (referenceBlock, faceVector) => {
    const ref = bot.blockAt(referenceBlock.position);
    const target = ref.position.plus(faceVector);
    const held = bot.heldItem;
    record('placeBlock', { block: held?.name ?? null, pos: target.toString() });
    if (!held || !registry.blocksByName[held.name]) throw new Error('must be holding a block to place');
    if (ref.boundingBox !== 'block') throw new Error(`cannot place against ${ref.name}`);
    const cur = bot.blockAt(target);
    if (!['air', 'cave_air', 'short_grass', 'water'].includes(cur.name)) throw new Error(`No block has been placed : the block at ${target} is ${cur.name}`);
    if (!inReach(target)) throw new Error(`placeBlock: ${target} is out of reach`);
    const feet = bot.entity.position.floored();
    if (target.equals(feet) || target.equals(feet.offset(0, 1, 0))) throw new Error('placeBlock: the bot is standing there');
    take(held.type, 1);
    setBlock(target, held.name);
  };
  bot.activateBlock = async (block) => { record('activateBlock', { block: block?.name }); };

  // ---- crafting (mirrors mineflayer/lib/plugins/craft.js) -----------------------------------------------------
  const enough = (recipe, times) => recipe.delta.every((d) => bot.inventory.count(d.id, d.metadata) + d.count * times >= 0);
  bot.recipesFor = (itemType, metadata, minResultCount, craftingTable) => {
    const want = minResultCount ?? 1;
    return Recipe.find(itemType, metadata).filter((r) => !(r.requiresTable && !craftingTable) && enough(r, Math.ceil(want / r.result.count)));
  };
  bot.recipesAll = (itemType, metadata, craftingTable) => Recipe.find(itemType, metadata).filter((r) => !r.requiresTable || craftingTable);
  bot.craft = async (recipe, count = 1, craftingTable = null) => {
    const name = registry.items[recipe.result.id]?.name;
    record('craft', { item: name, count, table: Boolean(craftingTable) });
    if (recipe.requiresTable && !craftingTable) throw new Error(`Recipe requires craftingTable, but one was not supplied: ${name}`);
    if (craftingTable) {
      const t = bot.blockAt(craftingTable.position);
      if (t.name !== 'crafting_table') throw new Error(`crafting: non craftingTable used as craftingTable: ${t.name}`);
      if (!inReach(t.position)) throw new Error('crafting: the crafting table is out of reach');
    }
    for (let i = 0; i < count; i++) {
      if (!enough(recipe, 1)) throw new Error(`crafting: missing ingredients for ${name}`);
      for (const d of recipe.delta) if (d.count < 0) take(d.id, -d.count);
      for (const d of recipe.delta) if (d.count > 0) give(d.id, d.count);
    }
    await wait(0);
  };

  // ---- furnaces -----------------------------------------------------------------------------------------------
  const itemName = (id) => registry.items[id]?.name;
  bot.openFurnace = async (furnaceBlock) => {
    const b = bot.blockAt(furnaceBlock.position);
    record('openFurnace', { pos: b.position.toString() });
    if (b.name !== 'furnace') throw new Error(`openFurnace: ${b.name} is not a furnace`);
    if (!inReach(b.position)) throw new Error('openFurnace: the furnace is out of reach');
    const k = keyOf(b.position);
    if (!furnaces.has(k)) furnaces.set(k, { input: null, fuel: null, output: null, burnLeft: 0, cooking: false });
    const st = furnaces.get(k);
    const win = new EventEmitter();
    const asItem = (s) => (s ? new Item(s.type, s.count) : null);
    const cookOne = () => {
      if (!st.input) return false;
      const out = registry.itemsByName[SMELT[itemName(st.input.type)]];
      if (!out || (st.output && (st.output.type !== out.id || st.output.count >= 64))) return false;
      if (st.burnLeft <= 0) {
        const value = st.fuel ? FUEL[itemName(st.fuel.type)] : 0;
        if (!value) return false;
        st.fuel.count -= 1;
        if (!st.fuel.count) st.fuel = null;
        st.burnLeft += value;
      }
      st.input.count -= 1;
      if (!st.input.count) st.input = null;
      st.output = { type: out.id, count: (st.output?.count ?? 0) + 1 };
      st.burnLeft -= 1;
      return true;
    };
    const cook = async () => {
      if (st.cooking) return;
      st.cooking = true;
      try {
        for (;;) {
          if (smeltMsPerItem > 0) await wait(smeltMsPerItem);
          if (!cookOne()) break;
          win.emit('update');
        }
      } finally { st.cooking = false; }
    };
    const put = (slotName, itemType, count) => {
      if (st[slotName] && st[slotName].type !== itemType) throw new Error(`furnace ${slotName} slot holds something else`);
      take(itemType, count);
      st[slotName] = { type: itemType, count: (st[slotName]?.count ?? 0) + count };
      record(`furnace.${slotName}`, { item: itemName(itemType), count });
      const run = cook();
      return smeltMsPerItem > 0 ? undefined : run;
    };
    const takeSlot = async (slotName) => {
      const s = st[slotName];
      if (!s) return null;
      st[slotName] = null;
      give(s.type, s.count);
      return new Item(s.type, s.count);
    };
    Object.assign(win, {
      type: 'minecraft:furnace',
      inputItem: () => asItem(st.input),
      fuelItem: () => asItem(st.fuel),
      outputItem: () => asItem(st.output),
      get fuel() { return st.burnLeft > 0 ? Math.min(1, st.burnLeft / 8) : 0; },
      get progress() { return 0; },
      putInput: async (itemType, metadata, count) => { await put('input', itemType, count); },
      putFuel: async (itemType, metadata, count) => { await put('fuel', itemType, count); },
      takeInput: () => takeSlot('input'),
      takeFuel: () => takeSlot('fuel'),
      takeOutput: () => takeSlot('output'),
      close: () => { record('furnace.close'); win.emit('close'); },
    });
    return win;
  };

  // ---- eating, combat, chat -----------------------------------------------------------------------------------
  bot.consume = async () => {
    const held = bot.heldItem;
    record('consume', { item: held?.name ?? null });
    const food = held && registry.foodsByName[held.name];
    if (!food) throw new Error('Consuming cancelled: not holding food');
    if (bot.food >= 20 && !ALWAYS_EDIBLE.includes(held.name)) throw new Error('Food is full');
    take(held.type, 1);
    bot.food = Math.min(20, bot.food + food.foodPoints);
    bot.foodSaturation = Math.min(bot.food, bot.foodSaturation + food.saturation);
    bot.emit('health');
  };

  function spawnMob(name, x, y, z, { health = 10 } = {}) {
    const def = registry.entitiesByName[name];
    if (!def) throw new Error(`fake-bot: unknown mob "${name}"`);
    const id = nextEntityId++;
    const e = { id, name, displayName: def.displayName, type: def.type, kind: def.category, position: at(x, y, z), velocity: at(0, 0, 0), height: def.height, health, isValid: true };
    bot.entities[id] = e;
    bot.emit('entitySpawn', e);
    return e;
  }
  bot.nearestEntity = (filter = () => true) => {
    let best = null;
    let bestD = Infinity;
    for (const e of Object.values(bot.entities)) {
      if (e === bot.entity || !e.isValid || !filter(e)) continue;
      const d = e.position.distanceTo(bot.entity.position);
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  };
  bot.attack = (entity) => {
    const held = bot.heldItem?.name;
    const dmg = SWORD_DAMAGE[held] ?? AXE_DAMAGE[held] ?? 1;
    const hit = entity?.isValid && entity.position.distanceTo(bot.entity.position) <= reach;
    record('attack', { target: entity?.name ?? null, hit });
    if (!hit) return;
    entity.health -= dmg;
    bot.emit('entityHurt', entity);
    if (entity.health <= 0) {
      entity.isValid = false;
      delete bot.entities[entity.id];
      for (const [item, n] of Object.entries(LOOT[entity.name] ?? {})) give(item, n);
      bot.emit('entityDead', entity);
      bot.emit('entityGone', entity);
    }
  };
  bot.chat = (message) => {
    const text = String(message);
    if (text.length > 256) throw new Error('chat message too long');
    chatLog.push({ message: text, command: text.startsWith('/') });
    record('chat', { message: text });
  };
  bot.whisper = (username, message) => bot.chat(`/tell ${username} ${message}`);

  // ---- movement: pathfinder and collectblock stand-ins --------------------------------------------------------
  let moving = null;
  function destinationOf(goal) {
    if (!goal) return null;
    if (goal.pos) return goal.pos;
    if (goal.entity?.position) return goal.entity.position;
    if (Array.isArray(goal.goals) && goal.goals.length) return destinationOf(goal.goals[0]);
    const p = bot.entity.position;
    if (Number.isFinite(goal.x) && Number.isFinite(goal.z)) return at(goal.x, Number.isFinite(goal.y) ? goal.y : p.y, goal.z);
    if (Number.isFinite(goal.y)) return at(p.x, goal.y, p.z);
    return null;
  }
  const pathfinder = {
    thinkTimeout: 5000,
    tickTimeout: 40,
    searchRadius: -1,
    goal: null,
    movements: null,
    setMovements(m) { pathfinder.movements = m; },
    isMoving: () => moving !== null,
    isMining: () => false,
    isBuilding: () => false,
    bestHarvestTool: (block) => bestTool(block),
    stop() {
      record('pathfinder.stop');
      if (moving) moving.cancel(named('PathStopped', 'Path was stopped before it could be completed! Thus, the desired goal was not reached.'));
      pathfinder.goal = null;
      bot.emit('path_stop');
    },
    setGoal(goal) {
      if (moving && goal !== pathfinder.goal) moving.cancel(named('GoalChanged', 'The goal was changed before it could be completed!'));
      pathfinder.goal = goal;
      if (goal) pathfinder.goto(goal).catch(() => {});
    },
    async goto(goal) {
      const dest = destinationOf(goal);
      record('goto', { to: dest ? dest.toString() : null });
      if (moving) moving.cancel(named('GoalChanged', 'The goal was changed before it could be completed!'));
      pathfinder.goal = goal;
      if (!dest) return;
      if (fake.unreachable?.(dest)) { pathfinder.goal = null; throw named('NoPath', 'No path to the goal!'); }
      const ms = moveMsPerBlock * dest.distanceTo(bot.entity.position);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        const me = { cancel: (err) => { clearTimeout(timer); if (moving === me) moving = null; reject(err); } };
        moving = me;
      });
      moving = null;
      pathfinder.goal = null;
      bot.entity.position = at(Math.floor(dest.x) + 0.5, Math.floor(dest.y), Math.floor(dest.z) + 0.5);
      bot.emit('move');
      bot.emit('goal_reached', goal);
    },
  };
  bot.pathfinder = pathfinder;

  function bestTool(block) {
    const items = bot.inventory.items();
    let wanted = null;
    if (block.harvestTools) wanted = (it) => Object.hasOwn(block.harvestTools, it.type);
    else {
      const kind = ['pickaxe', 'axe', 'shovel', 'hoe'].find((k) => String(block.material).includes(`mineable/${k}`));
      if (kind) wanted = (it) => it.name.endsWith(`_${kind}`);
    }
    if (!wanted) return null;
    const rank = (it) => TOOL_TIERS.findIndex((t) => it.name.startsWith(`${t}_`));
    return items.filter(wanted).sort((a, b) => rank(a) - rank(b))[0] ?? null;
  }
  bot.tool = {
    async equipForBlock(block) {
      const t = bestTool(block);
      if (t) await bot.equip(t, 'hand');
    },
  };

  let collectCancelled = false;
  bot.collectBlock = {
    movements: null,
    chestLocations: [],
    async collect(target, options = {}) {
      collectCancelled = false;
      const targets = Array.isArray(target) ? target : [target];
      record('collect', { count: targets.length });
      for (const t of targets) {
        if (collectCancelled) throw named('Cancelled', 'Collect task was cancelled');
        const block = bot.blockAt(t.position);
        if (block.name === 'air') continue;
        try {
          await bot.pathfinder.goto({ x: block.position.x, y: block.position.y, z: block.position.z });
        } catch (err) {
          if (options.ignoreNoPath && err.name === 'NoPath') continue;
          throw err;
        }
        await bot.tool.equipForBlock(block);
        await bot.dig(block);
      }
    },
    async cancelTask() {
      collectCancelled = true;
      if (moving) pathfinder.stop();
      bot.stopDigging();
    },
  };

  // ---- misc mineflayer surface ---------------------------------------------------------------------------------
  bot.lookAt = async (point) => { record('lookAt', { at: point?.toString?.() }); };
  bot.look = async () => {};
  bot.setControlState = (control, state) => { bot.controlState[control] = state; };
  bot.clearControlStates = () => { bot.controlState = {}; };
  bot.waitForTicks = async (n = 1) => { for (let i = 0; i < n; i++) await wait(0); };
  bot.loadPlugin = (plugin) => { plugins.push(plugin); };
  bot.loadPlugins = (list) => list.forEach(bot.loadPlugin);
  bot.hasPlugin = (plugin) => plugins.includes(plugin);
  let ended = false;
  bot.quit = (reason = 'disconnect.quitting') => {
    if (ended) return;
    ended = true;
    record('quit', { reason });
    bot.emit('end', reason);
  };
  bot.end = bot.quit;

  if (opts.clickServer) installClickServer(bot, { registry, Item, windows, reach: inReach, record, ...opts.clickServer });

  // ---- test controls -------------------------------------------------------------------------------------------
  const fake = {
    world,
    furnaces,
    calls,
    chat: chatLog,
    /** (dest: Vec3) => boolean; true makes pathfinder.goto reject with NoPath. */
    unreachable: null,
    setBlock: (pos, name) => setBlock(pos, name),
    give,
    take,
    counts,
    spawnMob: (name, pos, o) => spawnMob(name, pos.x, pos.y, pos.z, o),
    say: (username, message) => bot.emit('chat', username, message, null, null, null),
    setTime,
    setHealth(h) { bot.health = h; bot.emit('health'); },
    /** A hit as a 1.19.4+ server reports it: who dealt it (an entity, or null for a fall), then the health update. */
    hurt(amount, source = null) {
      bot.emit('entityHurt', bot.entity, source ?? undefined);
      bot.health = Math.max(0, bot.health - amount);
      bot.emit('health');
      if (bot.health <= 0) bot.emit('death');
    },
    setFood(f) { bot.food = f; bot.emit('health'); },
    kill() { bot.health = 0; bot.emit('health'); bot.emit('death'); },
    moveTo(pos) { bot.entity.position = at(pos.x, pos.y, pos.z); bot.emit('move'); },
  };
  bot.fake = fake;

  // ---- scene, starting inventory, spawn ------------------------------------------------------------------------
  const scene = (SCENES[opts.scene ?? 'flat'] ?? SCENES.flat)();
  for (const [x, y, z, name] of scene.blocks) world.set(keyOf({ x, y, z }), name);
  for (const [name, x, y, z] of scene.mobs) spawnMob(name, x, y, z);
  for (const [name, n] of Object.entries(opts.inventory ?? {})) give(name, n);
  setImmediate(() => { bot.emit('login'); bot.emit('spawn'); });
  return bot;
}

// ---- a protocol client and the server's side of windows (opts.clickServer) ---------------------------------------
// Emulates what a 1.21 server does with window clicks: it applies each click to its own copy of the window (vanilla
// left / right / shift click rules, crafting results from the real recipes, any planks or logs for the wood tags) and
// answers a click whose stateId is stale with a full resync of the window, after `lagMs`. The client's window only
// changes through those answers, so a skill that decides on a window it has not settled sees a stale picture, as on a
// real server. `deaf: true` drops every click (the server never answers); `noOpen: true` never opens a window.

const WOOD_TAG = /^(oak|spruce|birch|jungle|acacia|dark_oak|mangrove|cherry|pale_oak|bamboo|crimson|warped)_(planks|log)$/;

function installClickServer(bot, { registry, Item, windows, reach, record, lagMs = 0, deaf = false, noOpen = false }) {
  const client = new EventEmitter();
  const send = (name, packet) => {
    const fire = () => client.emit(name, packet);
    if (lagMs > 0) setTimeout(fire, lagMs); else setImmediate(fire);
  };
  const stackOf = (type) => registry.items[type]?.stackSize || 64;
  const canon = (type) => {
    const name = registry.items[type]?.name ?? '';
    const m = WOOD_TAG.exec(name);
    return m ? `oak_${m[2]}` : name;
  };
  const copy = (it) => (it ? { type: it.type, count: it.count } : null);
  let nextId = 1;
  let stateId = 0;
  // the server's windows: id -> {id, width, slots: [{type, count}|null], carried, invStart, invEnd}
  const server = new Map();
  const invServer = () => {
    if (!server.has(0)) server.set(0, { id: 0, width: 2, slots: bot.inventory.slots.map(copy), carried: copy(bot.inventory.selectedItem), invStart: 9, invEnd: 45 });
    return server.get(0);
  };
  let pending = 0;

  /**
   * The result of the grid, from the recipes of the version (shaped, mirrored, shapeless): an exact match first, then
   * one where any planks or logs stand for the oak ones minecraft-data lists for the wood tags.
   */
  function resultOf(w) {
    return matchGrid(w, (type) => registry.items[type]?.name ?? '') ?? matchGrid(w, canon);
  }
  function matchGrid(w, key) {
    const n = w.width;
    const cells = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push({ x, y, it: w.slots[1 + x + n * y] });
    const used = cells.filter((c) => c.it);
    if (!used.length) return null;
    const x0 = Math.min(...used.map((c) => c.x)); const x1 = Math.max(...used.map((c) => c.x));
    const y0 = Math.min(...used.map((c) => c.y)); const y1 = Math.max(...used.map((c) => c.y));
    const shape = [];
    for (let y = y0; y <= y1; y++) {
      const row = [];
      for (let x = x0; x <= x1; x++) row.push(w.slots[1 + x + n * y] ? key(w.slots[1 + x + n * y].type) : null);
      shape.push(row);
    }
    const same = (a, b) => a.length === b.length && a.every((row, i) => row.length === b[i].length && row.every((v, j) => v === b[i][j]));
    const idOf = (v) => (v && typeof v === 'object' ? v.id : v);
    const bag = used.map((c) => key(c.it.type)).sort().join(',');
    for (const [resultId, list] of Object.entries(registry.recipes)) {
      for (const r of list) {
        if (r.inShape) {
          const want = r.inShape.map((row) => row.map((v) => (idOf(v) == null || idOf(v) === -1 ? null : key(idOf(v)))));
          if (same(want, shape) || same(want.map((row) => [...row].reverse()), shape)) return { type: Number(resultId), count: r.result.count };
        } else if (r.ingredients) {
          if (r.ingredients.map((v) => key(idOf(v))).sort().join(',') === bag) return { type: Number(resultId), count: r.result.count };
        }
      }
    }
    return null;
  }
  function consume(w) {
    for (let s = 1; s <= w.width * w.width; s++) {
      const it = w.slots[s];
      if (it && --it.count <= 0) w.slots[s] = null;
    }
  }
  /** Move an item into the inventory part (merge first, then empty slots); returns what did not fit. */
  function insert(w, it, reverse) {
    const order = [];
    for (let s = w.invStart; s < w.invEnd; s++) order.push(s);
    if (reverse) order.reverse();
    for (const s of order) {
      const o = w.slots[s];
      if (it.count && o && o.type === it.type && o.count < stackOf(o.type)) { const mv = Math.min(it.count, stackOf(o.type) - o.count); o.count += mv; it.count -= mv; }
    }
    for (const s of order) if (it.count && !w.slots[s]) { w.slots[s] = { type: it.type, count: Math.min(it.count, stackOf(it.type)) }; it.count -= w.slots[s].count; }
    return it.count;
  }
  function roomFor(w, it) {
    let room = 0;
    for (let s = w.invStart; s < w.invEnd; s++) {
      const o = w.slots[s];
      if (!o) room += stackOf(it.type); else if (o.type === it.type) room += stackOf(o.type) - o.count;
    }
    return room >= it.count;
  }
  function click(w, slot, button, mode) {
    if (mode === 5) return; // the end of a drag that never started: nothing happens
    if (mode === 1) {
      if (slot === 0) {
        for (let r = resultOf(w); r && roomFor(w, r); r = resultOf(w)) { consume(w); insert(w, r, true); }
      } else if (slot >= 1 && slot <= w.width * w.width && w.slots[slot]) {
        const it = w.slots[slot];
        const left = insert(w, { ...it }, false);
        w.slots[slot] = left ? { type: it.type, count: left } : null;
      }
      return;
    }
    if (mode !== 0) return;
    if (slot === -999) { if (w.carried) { if (button === 0 || --w.carried.count <= 0) w.carried = null; } return; }
    if (slot === 0) {
      const r = resultOf(w);
      if (!r) return;
      if (!w.carried) { w.carried = r; consume(w); } else if (w.carried.type === r.type && w.carried.count + r.count <= stackOf(r.type)) { w.carried.count += r.count; consume(w); }
      return;
    }
    const s = w.slots[slot];
    const c = w.carried;
    if (button === 0) {
      if (!c) { w.carried = s; w.slots[slot] = null; } else if (!s) { w.slots[slot] = c; w.carried = null; } else if (s.type === c.type) {
        const mv = Math.min(stackOf(s.type) - s.count, c.count); s.count += mv; c.count -= mv; if (!c.count) w.carried = null;
      } else { w.slots[slot] = c; w.carried = s; }
    } else if (!c) {
      if (s) { const half = Math.ceil(s.count / 2); w.carried = { type: s.type, count: half }; s.count -= half; if (!s.count) w.slots[slot] = null; }
    } else if (!s || (s.type === c.type && s.count < stackOf(s.type))) {
      w.slots[slot] = { type: c.type, count: (s?.count ?? 0) + 1 };
      if (--c.count <= 0) w.carried = null;
    } else { w.slots[slot] = c; w.carried = s; }
  }
  /** The client side of a resync: what mineflayer does with a window_items packet. */
  function applyToClient(windowId, slots, carried) {
    const win = windowId === 0 ? bot.inventory : bot.currentWindow;
    if (!win || win.id !== windowId) return;
    slots.forEach((it, i) => { if (i < win.slots.length) win.updateSlot(i, it ? new Item(it.type, it.count) : null); });
    win.selectedItem = carried ? new Item(carried.type, carried.count) : null;
    bot.emit(`setWindowItems:${windowId}`);
    bot.emit('heldItemChanged', bot.heldItem);
  }
  function resync(w) {
    const slots = w.slots.map(copy);
    slots[0] = resultOf(w); // the result slot shows what the grid makes
    const carried = copy(w.carried);
    pending += 1;
    const packet = { windowId: w.id, stateId: ++stateId, items: slots, carriedItem: carried };
    const fire = () => { pending -= 1; applyToClient(w.id, slots, carried); client.emit('window_items', packet); };
    if (lagMs > 0) setTimeout(fire, lagMs); else setImmediate(fire);
  }

  client.write = (name, packet) => {
    record(`packet.${name}`, { slot: packet.slot, button: packet.mouseButton, mode: packet.mode });
    if (name === 'close_window' && packet.windowId === 0 && !deaf) {
      // the player closed its own inventory screen: the 2x2 grid and the cursor go back into the inventory
      const w = invServer();
      for (let s = 1; s <= 4; s++) {
        if (!w.slots[s]) continue;
        const left = insert(w, { ...w.slots[s] }, false);
        w.slots[s] = left ? { type: w.slots[s].type, count: left } : null; // (vanilla drops what does not fit)
      }
      if (w.carried && !insert(w, w.carried, false)) w.carried = null;
      resync(w);
      return;
    }
    if (name !== 'window_click' || deaf) return;
    const w = packet.windowId === 0 ? invServer() : server.get(packet.windowId);
    if (!w || (bot.currentWindow?.id ?? 0) !== packet.windowId) return; // not the open window: ignored
    click(w, packet.slot, packet.mouseButton, packet.mode);
    resync(w);
  };
  bot._client = client;
  bot.currentWindow = null;
  // the player inventory's server copy is rebuilt from the client once nothing is in flight (the fake's give/take
  // change the client inventory directly)
  client.on('window_items', (p) => { if (p.windowId === 0 && pending === 0) server.delete(0); });

  bot.activateBlock = async (block) => {
    record('activateBlock', { block: block?.name });
    const b = bot.blockAt(block.position);
    if (noOpen || b.name !== 'crafting_table' || !reach(b.position)) return;
    const id = nextId++ % 100 + 1;
    const slots = new Array(46).fill(null);
    for (let s = 9; s < 45; s++) slots[s + 1] = copy(bot.inventory.slots[s]);
    server.set(id, { id, width: 3, slots, carried: null, invStart: 10, invEnd: 46 });
    send('open_window', { windowId: id });
    const open = () => {
      const win = windows.createWindow(id, 'minecraft:crafting', 'Crafting');
      slots.forEach((it, i) => win.updateSlot(i, it ? new Item(it.type, it.count) : null));
      bot.currentWindow = win;
      bot.emit('windowOpen', win);
    };
    if (lagMs > 0) setTimeout(open, lagMs); else setImmediate(open);
  };
  bot.closeWindow = (win) => {
    record('closeWindow', { id: win?.id });
    if (!win) return;
    const w = server.get(win.id);
    server.delete(win.id);
    if (bot.currentWindow === win) bot.currentWindow = null;
    if (win.id === 0) return;
    // client: like mineflayer, copy the window's inventory part into the player inventory at once
    for (let s = win.inventoryStart; s < win.inventoryEnd; s++) bot.inventory.updateSlot(s - 1, win.slots[s] ? new Item(win.slots[s].type, win.slots[s].count) : null);
    bot.emit('windowClose', win);
    if (!w) return;
    // server: the grid and the cursor go back into the inventory, then the player inventory is synced
    for (let s = 1; s <= 9; s++) if (w.slots[s]) { insert(w, { ...w.slots[s] }, false); w.slots[s] = null; }
    if (w.carried) { insert(w, w.carried, false); w.carried = null; }
    const inv = new Array(46).fill(null);
    for (let s = 10; s < 46; s++) inv[s - 1] = copy(w.slots[s]);
    pending += 1;
    const fire = () => { pending -= 1; applyToClient(0, inv, null); client.emit('window_items', { windowId: 0, stateId: ++stateId, items: inv }); };
    if (lagMs > 0) setTimeout(fire, lagMs); else setImmediate(fire);
  };
}
