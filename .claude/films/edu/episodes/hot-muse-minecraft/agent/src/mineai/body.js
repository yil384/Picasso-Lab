// src/mineai/body.js - a Body (src/contracts.js) whose bot lives in a Mine AI MCP host (BODY=mineai): one host per
// guest game (src/mineai/host.js), driven as an MCP client. run(skill, args) maps our skill onto their actions
// (src/mineai/skills.js), submits each with a fresh submission_id, waits for it (wait_for_action) up to the skill's
// time limit, cancels it on stop or timeout and always reads its final result before the next one (their result
// gate), and returns our SkillResult: ok, our result text, the inventory change (their status before and after), the
// time, and a typed code. The state is theirs (view_status, plus their /health on every heartbeat) rendered in our
// state text; state(), snapshot() and inventory() read the latest copy at once. Everything above the body (the MCP
// queue, idempotent calls, 45 s replies, typed codes, the dry-run check, /play and the API) is unchanged.
// The runtime's own reflexes (combat, fire, breath, footing, hunger) act on their own, as their survival policy says;
// between the player's steps the body also looks after itself (src/mineai/care.js: a death's items, armor, food, spare
// tools, the night), and a step that would wear its tool out gets a spare first, or a new one when the tool breaks in
// the middle of it. What the body did by itself is kept in a journal the MCP replies and the state carry.

import crypto from 'node:crypto';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { inventoryDelta } from '../contracts.js';
import { renderState, describeCall, describeDelta } from '../state.js';
import { NOTABLE_BLOCKS } from '../state.js';
import { MINEAI_SKILLS, MINEAI_TIMEOUTS, DIRECT_TOOLS, CONTAINER_BLOCKS, SPAWN_GUARD, toTheirs, fromTheirs, ownChange, splitError } from './skills.js';
import { createCare, armorPlan, wearPlan, toolClassFor, toolOf, pickaxeTierFor, sparePlan, replacementFor, describeCare, describeReflexes, ARMOR_SLOTS, armorOf } from './care.js';

/** Every call of ours says why in one sentence (their rationale is required and goes into their own log only). */
const RATIONALE = 'Requested by the player through the game gateway.';
const WAIT_MAX_MS = 120_000; // their wait_timeout_ms / timeout_ms cap
const RPC_SLACK_MS = 20_000; // on top of a wait, before the HTTP call itself is given up
const FIRST_WAIT_MS = 1_500; // how long a submission waits before it returns the action's id (quick actions settle in it)
const SCAN_EVERY_MS = 20_000;
const STATUS_MS = 4_000;
// their find takes 8 names a call: the woods, then ores and stations (NOTABLE_BLOCKS of our state, the common ones)
const SCAN_NAMES = [
  ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log', 'cherry_log'],
  ['coal_ore', 'iron_ore', 'copper_ore', 'crafting_table', 'furnace', 'chest', 'gravel', 'sand'],
  // the way to the Nether (ROADMAP M8): get_state lists them, and collect's description sends Muse near the lava listed
  ['lava', 'water', 'obsidian', 'nether_portal', 'diamond_ore', 'deepslate_diamond_ore', 'deepslate_iron_ore', 'deepslate_coal_ore'],
];
const BUSY_RETRY_MS = 500; // a body one of their reflexes holds (no action of ours runs): submit again this often
const ATTACK_POLL_MS = 2_000; // an attack reads its fight this often, to end it once the mob died
const KILLED = 'the mob died';
/** Their reflexes (the body's owner while one acts), in our words. */
const OWNERS = {
  hostile_reflex: 'fighting a hostile mob', hunger_reflex: 'eating', fire_reflex: 'getting out of fire',
  breath_reflex: 'swimming up for air', recover_footing: 'getting its footing back', dragon_reflex: 'dodging the dragon',
};
const RADIUS = 32;
const REACH = 4.5; // a crafting table their craft uses without walking
const STATION_RADIUS = 24;
const HEADINGS = ['north', 'east', 'south', 'west'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const floorPos = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });

/** {name: count} of the stacks carried in the main inventory and hotbar (not worn, not the off-hand). */
export function inventoryOfStacks(stacks = []) {
  const out = {};
  for (const s of stacks) {
    if (!s?.name || (s.location && s.location !== 'main' && s.location !== 'hotbar')) continue;
    out[s.name] = (out[s.name] ?? 0) + (Number(s.count) || 0);
  }
  return out;
}

const WORN = ['head', 'torso', 'legs', 'feet', 'off-hand'];
/** {slot: {name, count}} of what is worn and in the off-hand (their status lists those stacks by slot). */
export function equipmentOfStacks(stacks = []) {
  const out = {};
  for (const s of stacks) if (s?.name && WORN.includes(s.location)) out[s.location] = { name: s.name, count: Number(s.count) || 1 };
  return out;
}

/** Carried plus worn: what an equip moves stays in it, so a delta over it shows no loss. */
export function allItems(inventory = {}, equipment = {}) {
  const out = { ...inventory };
  for (const { name, count } of Object.values(equipment)) out[name] = (out[name] ?? 0) + count;
  return out;
}

/** Chests, trapped chests and barrels a game's bot put down, per Minecraft server: no other game opens them. */
const CONTAINERS = new Map(); // "host:port" -> Map("x,y,z" -> game id)
const keyOf = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
/**
 * Obsidian a game's bot put down (a nether_portal build, or place), per Minecraft server and for the whole process:
 * no other game's collect obsidian may take it (their collect mines any loaded obsidian), and portal dismantle takes
 * back only the bot's own. "host:port" -> Map("dimension:x,y,z" -> game id). The blocks outlive the game, so do the
 * entries (a frame stands in the shared world after its game ended).
 */
const FRAMES = new Map();
/** How far (blocks, flat) another game's obsidian keeps a collect obsidian from running: about what is loaded. */
export const FRAME_GUARD = 160;
/** After coming out of a portal, the blocks around are trusted to say whether it is still lit only once a whole scan
 * has been read this long after the arrival (the chunks come in over seconds; an early scan missed the portal it
 * stood in: production, 2026-10-11, every camera trip). */
export const PORTAL_SETTLE_MS = 10_000;
/** Calls sent once more after one of their reflexes cut them short (sending them again repeats nothing). */
export const RETRY_AFTER_REFLEX = new Set(['craft_item', 'smelt_item', 'equip', 'eat_food', 'place_block', 'use_bucket', 'navigate', 'build_structure', 'activate_portal']);
/** A failure that is one of their reflexes taking the body over, in plain words, else null. */
export function reflexTakeover(text) {
  const t = String(text ?? '');
  if (/Equip an available shield/i.test(t)) return 'it put a shield in the off-hand with hostile mobs near';
  const m = /\b(fight|evade|hide|deflect|flee|retreat|avoid) response for ([a-z_]+)/i.exec(t);
  if (m) return `${{ fight: 'it fought', evade: 'it got out of the way of', hide: 'it hid from', deflect: 'it blocked', flee: 'it fled from', retreat: 'it fled from', avoid: 'it kept away from' }[m[1].toLowerCase()]} a ${m[2]}`;
  if (/\[BREATH\]|surface at air|air supply/i.test(t)) return 'it swam up for air';
  if (/fire_reflex|\bin (fire|lava)\b.*\b(escape|leave)/i.test(t)) return 'it got out of fire or lava';
  if (/recover_footing|External impulse threatens footing/i.test(t)) return 'it got its footing back';
  return null;
}
/** collect obsidian makes it from lava within this many blocks of the bot, else it is refused. */
export const LAVA_NEAR = 16;

/** The default way to reach a host: the MCP SDK's client over streamable HTTP, with the host's token. */
async function connectSdk(host) {
  const client = new Client({ name: 'muse-plays-minecraft', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(host.url), { requestInit: { headers: host.headers } }));
  return client;
}

/** Resolves when something listens on the loopback port (or false after ms). */
function listening(port, ms) {
  const until = Date.now() + ms;
  return new Promise((resolve) => {
    const tryOnce = () => {
      const s = net.connect(port, '127.0.0.1');
      s.once('connect', () => { s.destroy(); resolve(true); });
      s.once('error', () => { s.destroy(); if (Date.now() > until) resolve(false); else setTimeout(tryOnce, 500); });
    };
    tryOnce();
  });
}

/**
 * @param {{config: object, log: object, hosts: ReturnType<typeof import('./host.js').createHostManager>, gameId: string,
 *   username: string, viewId?: string|null, onEyes?: (port: number, path: string) => void, connect?: (host) => Promise<object>,
 *   timeouts?: Record<string, number>}} opts
 * @returns {import('../contracts.js').Body & {refresh: () => Promise<void>, temporaryStations: true, kind: 'mineai'}}
 */
/** Who acted in a game: {muse, reflex, care, musePct, text}. */
export function attributionOf(muse, { reflex = 0, care = 0 } = {}) {
  const all = muse + reflex + care;
  const musePct = all ? Math.round((100 * muse) / all) : null;
  const text = `This game: ${muse} action${muse === 1 ? '' : 's'} by Muse, ${reflex} reflex${reflex === 1 ? '' : 'es'}${care ? `, ${care} by the body's own plans` : ''}${musePct != null ? ` (${musePct}% Muse)` : ''}`;
  return { muse, reflex, care, musePct, text };
}

export function createMineAiBody({ config, log, hosts, gameId, username, viewId = null, onEyes = null, connect = connectSdk, timeouts = MINEAI_TIMEOUTS, care: careOpt = 'advise', careTickMs, careIdleMs, portalSettleMs = PORTAL_SETTLE_MS }) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  let host = null;
  let client = null;
  let connecting = null;
  let status = null; // view_status situation
  let statusAt = 0;
  let latest = { position: null, health: 20, food: 20, inventory: {}, equipment: {}, held: null }; // the newest of status and /health
  let spawnAt = null; // where the bot joined, before the spread: the world spawn, give or take
  let crashes = 0;
  const server = `${config.mc.host}:${config.mc.port}`;
  if (!CONTAINERS.has(server)) CONTAINERS.set(server, new Map());
  const containers = CONTAINERS.get(server);
  if (!FRAMES.has(server)) FRAMES.set(server, new Map());
  const frames = FRAMES.get(server);
  const frameKey = (dim, p) => `${dim}:${keyOf(p)}`;
  /** Obsidian cells of other games in this dimension within r blocks (flat) of p. */
  const othersObsidian = (p, r) => {
    const out = [];
    for (const [k, owner] of frames) {
      if (owner === gameId) continue;
      const [dim, xyzs] = k.split(':');
      if (dim !== (dimension ?? 'overworld')) continue;
      const [x, y, z] = xyzs.split(',').map(Number);
      if (Math.hypot(x - p.x, z - p.z) <= r) out.push({ x, y, z });
    }
    return out;
  };
  let lastDeath = null;
  let policyRevision = null;
  let dimension = null; // the last status's dimension (a change is logged)
  let reflexNow = null; // the reflex of theirs that holds the body, as the last status said
  let theirPolicy = null; // their survival policy in effect (view_status)
  let scan = { blocks: [], at: 0, from: null };
  let scanning = null;
  let goal = null;
  let doing = null;
  let lastResult = null;
  // the structure this game's last build left incomplete (its blueprint, material, cells, facing and where the bot
  // stood): a build of the same blueprint and material near it continues it (src/mineai/skills.js continuesLast)
  let lastBuild = null;
  let lastPortal = null; // the frame the last build nether_portal made: {dimension, frame, inside, cells}
  const arrivals = {}; // dimension -> {pos, at}: where the bot last came out of a portal there
  let current = null; // the action running now: {actionId, stop}
  let stacks = []; // their status stacks (carried, worn, the off-hand; with durability)
  let idleSince = Date.now(); // when the last step of the player's ended (the care waits a moment after it)
  let care = null;
  // the care's mode: advise (the default: the plans are the player's, advice in every reply; the body acts by itself
  // only through its reflexes), full (it also carries its plans out between the player's calls), or none (off)
  const careMode = careOpt === false || careOpt === 'off' || careOpt == null ? null : careOpt === true || careOpt === 'full' ? 'full' : 'advise';
  let museActions = 0; // the player's skills this game (get_state and policy not counted)
  let careGate = null; // what the care waits for before it starts (body.deferCare)
  let ended = null;
  let seq = 0;
  const event = (kind, data = {}) => { try { log.event(kind, { game: gameId, ...data }); } catch { /* best effort */ } };
  const emit = (name, data) => { try { emitter.emit(name, data); } catch (err) { event('bot_error', { message: String(err?.message ?? err).slice(0, 200) }); } };

  const body = {
    kind: 'mineai',
    /** Crafts and smelts put a carried table or furnace down for the call and pick it up again (the MCP check knows). */
    temporaryStations: true,
    busy: false,
    connected: false,
    viewerPort: null,
    eyesPort: null,
    on(name, fn) { emitter.on(name, fn); return () => emitter.off(name, fn); },
    setGoal(g) { goal = g ?? null; },
    inventory: () => ({ ...latest.inventory }),
    /** What is worn and in the off-hand, {slot: name} (not in inventory(): crafts do not take it). */
    equipment: () => Object.fromEntries(Object.entries(latest.equipment ?? {}).map(([slot, x]) => [slot, x.name])),
    smelting: () => ({}), // their smelt waits for the whole load: nothing cooks between calls
    stationNear(name) {
      if ((latest.inventory[name] ?? 0) > 0) return true;
      const p = latest.position;
      const found = scan.blocks.find((b) => b.name === name);
      if (!p || !found) return false;
      return dist(found.nearest, p) <= (name === 'crafting_table' ? REACH : STATION_RADIUS);
    },
    state: () => renderState(body.snapshot()),
    snapshot,
    run,
    stop,
    close,
    refresh,
    /** Scan the notable blocks around again now (after a teleport); resolves when done. */
    rescan: async () => { await scanning; await scanBlocks(true); },
    digging: () => null,
    /** What the body did by itself (src/mineai/care.js), after journal entry seq: [{seq, at, source, kind, ok, text}]. */
    onItsOwn: (after = 0) => (care ? care.since(after) : []),
    /** The care's knobs (policy skill). */
    carePolicy: () => (care ? care.policy : null),
    /** Advise mode: what needs doing that the body will not do by itself: [{kind, text, hint?: {skill, args}}]. */
    advice: () => (care ? [...portalAdvice(), ...care.advice()] : []),
    /** Who acted this game: the player's skills, the body's reflexes and its own plans (full mode). */
    attribution: () => attributionOf(museActions, care ? care.counts() : { reflex: 0, care: 0 }),
    careMode: () => careMode,
    /** The care starts only once this settles (the agent's spread of a new bot: nothing of its own at the spawn). */
    deferCare: (promise) => { careGate = promise; },
  };

  // what src/mcp.js reads from a bot for its short state and its check (health, food, position, day, version)
  body.bot = {
    username,
    version: config.mc.version,
    get entity() { return latest.position ? { position: { ...latest.position }, yaw: 0 } : null; },
    get health() { return latest.health; },
    get food() { return latest.food; },
    get time() { return { isDay: status?.clock ? status.clock.phase === 'day' : null, timeOfDay: status?.clock?.timeOfDay ?? 0 }; },
  };

  async function ensureClient() {
    if (client) return client;
    connecting ??= connect(host).then((c) => { client = c; return c; }).finally(() => { connecting = null; });
    return connecting;
  }
  async function dropClient() {
    const c = client;
    client = null;
    try { await c?.close(); } catch { /* gone */ }
  }

  /** One tool call on the host: its JSON data, or {state: 'error', error} when the call itself failed. */
  async function rpc(tool, args, timeoutMs = 30_000) {
    let r;
    try {
      const c = await ensureClient(); // fails while a crashed host is being started again
      r = await c.callTool({ name: tool, arguments: { ...args, rationale: RATIONALE, response_format: 'json' } }, undefined, { timeout: timeoutMs });
    } catch (err) {
      return { state: 'error', error: String(err?.message ?? err) };
    }
    const data = r?.structuredContent?.response?.data;
    if (isObj(data)) return data;
    const text = Array.isArray(r?.content) ? r.content.map((x) => x?.text ?? '').join(' ') : '';
    return { state: 'error', error: text || 'the body gave no result' };
  }

  function absorbHealth(h) {
    const mc = h?.minecraft;
    if (!isObj(mc)) return;
    latest = {
      ...latest,
      ...(mc.position ? { position: mc.position } : {}),
      ...(Number.isFinite(mc.health) ? { health: mc.health } : {}),
      ...(Number.isFinite(mc.food) ? { food: mc.food } : {}),
      ...(Array.isArray(mc.inventory) && !body.busy ? { inventory: inventoryOfStacks(mc.inventory), equipment: equipmentOfStacks(mc.inventory) } : {}),
    };
  }

  /** Read view_status now (about 20 ms): the state, the inventory, the policy revision, a death since the last read. */
  async function refresh() {
    const data = await rpc('view_status', {}, 10_000);
    const s = data?.result?.situation;
    if (!isObj(s)) return;
    status = s;
    statusAt = Date.now();
    if (data.survivalPolicy?.revision) policyRevision = data.survivalPolicy.revision;
    if (data.survivalPolicy?.effective) theirPolicy = data.survivalPolicy.effective;
    const list = s.inventory?.stacks ?? [];
    stacks = list;
    latest = {
      position: s.position ? { x: s.position.x, y: s.position.y, z: s.position.z } : latest.position,
      health: s.vitals?.health ?? latest.health,
      food: s.vitals?.food ?? latest.food,
      inventory: inventoryOfStacks(list),
      equipment: equipmentOfStacks(list),
      held: list.find((x) => x.held)?.name ?? null,
    };
    // one of their reflexes holding the body (a takeover): said to the live caption ("Reflex: defending itself")
    const holder = ['takeover', 'yielding'].includes(s.activity?.owner) ? s.activity?.activeAction?.action ?? null : null;
    if (holder !== reflexNow) { reflexNow = holder; emit('reflex', { name: holder }); }
    // a change of dimension and a death, in the game's log (docs/MUSE-LONG-RUN.md reads its milestones from there)
    const dim = String(s.dimension ?? 'overworld').replace(/^minecraft:/, '');
    if (dimension && dim !== dimension) {
      event('dimension', { from: dimension, to: dim, pos: s.position ? floorPos(s.position) : null });
      care?.arrived(dim, s.position ? floorPos(s.position) : null);
      if (s.position) arrivals[dim] = { pos: floorPos(s.position), at: Date.now() };
      // the blocks seen around belong to the dimension left: scanned again here (the portal back among them)
      scan = { blocks: [], at: 0, from: null };
      setTimeout(() => { scanBlocks(true); }, 2_000).unref?.();
    }
    dimension = dim;
    const death = s.lastDeath ? JSON.stringify(s.lastDeath) : null;
    if (death && death !== lastDeath) {
      if (lastDeath !== null || body.connected) { emit('death', { at: s.lastDeath }); event('death', { cause: s.lastDeath.cause ?? null, pos: s.lastDeath.position ? floorPos(s.lastDeath.position) : null }); }
      lastDeath = death;
    } else if (lastDeath === null) lastDeath = death ?? '';
  }

  /** The notable blocks around (their view_blocks over every loaded chunk; about a second): kept for the state text. */
  function scanBlocks(force = false) {
    if (scanning || ended || (body.busy && !force)) return scanning;
    scanning = (async () => {
      const found = [];
      let read = 0;
      for (const names of SCAN_NAMES) {
        const data = await rpc('view_blocks', { find: { block_names: names, limit: 1 } }, 20_000).catch(() => null);
        if (Array.isArray(data?.result?.blocks?.find)) { read += 1; found.push(...data.result.blocks.find); }
      }
      if (!read) return; // nothing could be read: the blocks known stay as they were
      scan = {
        complete: read === SCAN_NAMES.length,
        at: Date.now(),
        from: latest.position,
        blocks: found.filter((f) => f.listed?.[0]).map((f) => ({ name: f.name, count: Math.min(64, f.found ?? 1), capped: (f.found ?? 0) > 64 || undefined, nearest: floorPos(f.listed[0]) })),
      };
    })().catch(() => {}).finally(() => { scanning = null; });
    return scanning;
  }
  const scanSoon = () => { if (Date.now() - scan.at > SCAN_EVERY_MS) scanBlocks(); };

  function snapshot() {
    const s = status ?? {};
    const p = latest.position ?? { x: 0, y: 0, z: 0 };
    const heading = Number(s.position?.headingDegrees ?? 0);
    const t = s.clock?.timeOfDay ?? 0;
    const mobs = [...(s.nearby?.hostiles ?? []), ...(s.nearby?.mobs ?? [])]
      .map((m) => ({ name: m.name, hostile: m.kind === 'hostile', distance: Math.round(m.nearest?.distance ?? 999), position: m.nearest?.position ? floorPos(m.nearest.position) : null }))
      .filter((m, i, all) => m.position && m.distance <= RADIUS && all.findIndex((x) => x.name === m.name) === i)
      .sort((a, b) => a.distance - b.distance).slice(0, 10);
    const nearbyBlocks = scan.blocks
      .map((b) => ({ ...b, distance: Math.round(dist(b.nearest, p)) }))
      .filter((b) => b.distance <= RADIUS && NOTABLE_BLOCKS.includes(b.name))
      .map(({ capped, ...b }) => (capped ? { ...b, capped } : b));
    return {
      health: Math.round((latest.health ?? 0) * 10) / 10,
      food: latest.food ?? 0,
      oxygen: Number.isFinite(s.vitals?.airSupplyTicks) ? Math.max(0, Math.min(20, Math.round(s.vitals.airSupplyTicks / 15))) : 20,
      position: floorPos(p),
      facing: HEADINGS[Math.round((((heading % 360) + 360) % 360) / 90) % 4],
      dimension: String(s.dimension ?? 'overworld').replace(/^minecraft:/, ''),
      timeOfDay: t,
      isDay: s.clock ? s.clock.phase === 'day' : true,
      inventory: { ...latest.inventory },
      held: latest.held,
      equipment: Object.fromEntries(Object.entries(latest.equipment ?? {}).map(([slot, x]) => [slot, x.count > 1 ? `${x.name} ${x.count}` : x.name])),
      nearbyBlocks,
      mobs,
      goal,
      busy: body.busy,
      doing,
      lastResult,
      ...(care ? { care: careNote() } : {}),
    };
  }
  /** What the body does by itself now, and the last thing it did, for the state. */
  function careNote() {
    const last = care.last();
    return { mode: care.mode, now: care.now(), last: last ? { text: last.text, ok: last.ok, agoS: Math.max(0, Math.round((Date.now() - Date.parse(last.at)) / 1000)) } : null };
  }

  /** What toTheirs needs to know now. */
  const context = () => ({
    inventory: latest.inventory,
    position: latest.position,
    heading: status?.position?.headingDegrees ?? 0,
    food: latest.food,
    hostiles: [...(status?.nearby?.hostiles ?? []), ...(status?.nearby?.mobs ?? [])].filter((m) => m.kind === 'hostile').map((m) => ({ name: m.name, distance: m.nearest?.distance ?? 999 })),
    furnace: (() => { const f = scan.blocks.find((b) => b.name === 'furnace'); return f && latest.position && dist(f.nearest, latest.position) <= STATION_RADIUS ? f.nearest : null; })(),
    policyRevision,
    maxTravel: config.body?.maxTravel ?? 256,
    spawn: spawnAt,
    players: (status?.nearby?.players ?? []).map((p) => ({ position: p?.position ?? null })), // never their names
    gameId,
    containerOwner: (pos) => containers.get(keyOf(pos)) ?? null,
    lastBuild,
    portal: lastPortal,
    dimension: dimension ?? 'overworld',
    arrival: arrivals[dimension ?? 'overworld'] ? { dimension: dimension ?? 'overworld', ...arrivals[dimension ?? 'overworld'] } : null,
  });

  /**
   * Submit one action and wait for its final result (their result gate: always read it before the next), cancelling
   * it on stop or when the skill's time runs out. A body one of their reflexes holds (a fight, a meal: no action of ours
   * runs, so their refusal carries no action id) is waited for and the action submitted again. An attack reads its
   * fight as it goes and ends it once the mob died (their hunt would chase the next one for a drop the first did not
   * give). Returns {output, stopped} or {error, code (theirs), ours (our code), said (our text)}.
   */
  async function act(call, deadline, ctl) {
    if (DIRECT_TOOLS.has(call.tool)) { // answers at once with the action's output
      const data = await rpc(call.tool, call.args, 30_000);
      return data.state === 'error' ? { error: data.error } : { output: data };
    }
    const submission = `${gameId}-${++seq}-${crypto.randomBytes(3).toString('hex')}`;
    const left = () => deadline - Date.now();
    const waitFor = () => Math.max(0, Math.min(WAIT_MAX_MS, left()));
    // a short first wait: a stop needs the action's id, which only the reply to the submission carries
    const first = () => Math.min(FIRST_WAIT_MS, waitFor());
    let tries = 0;
    const submit = () => rpc(call.tool, { ...call.args, submission_id: tries++ ? `${submission}-${tries}` : submission, wait_timeout_ms: first() }, first() + RPC_SLACK_MS);
    let data = await submit();
    // a result of an earlier action not read yet (a call cut short), or an action still running: read it, then once more
    if (data.state === 'refused' && (data.unretrievedActionId || data.activeActionId)) {
      const other = data.unretrievedActionId ?? data.activeActionId;
      if (data.activeActionId) await rpc('cancel_foreground_action', { action_id: other, reason: 'an earlier step was left running' });
      await rpc('wait_for_action', { action_id: other, timeout_ms: 15_000 }, 35_000);
      data = await submit();
    }
    // the body is busy looking after itself (one of their reflexes owns it): wait for it, up to the skill's limit
    const heldBy = (d) => (d.state === 'refused' && d.code === 'ACTION_BUSY' && !d.activeActionId ? /body owner: ([a-z_]+)/.exec(String(d.error ?? ''))?.[1] ?? 'its own business' : null);
    if (heldBy(data)) {
      const since = Date.now();
      let owner = heldBy(data);
      while (owner && !ctl.stopped && left() > 0) {
        await new Promise((r) => { setTimeout(r, Math.min(BUSY_RETRY_MS, Math.max(50, left()))); });
        if (ctl.stopped || left() <= 0) break;
        data = await submit();
        owner = heldBy(data) ?? null;
      }
      if (owner) {
        const doing = OWNERS[owner] ?? owner.replace(/_/g, ' ');
        const s = Math.round((Date.now() - since) / 1000);
        if (ctl.stopped) return { error: data.error, code: data.code, ours: 'STOPPED', said: `stopped: ${ctl.stopped} (before it started: the body was ${doing})` };
        return { error: data.error, code: data.code, ours: owner === 'hostile_reflex' || owner === 'dragon_reflex' ? 'HOSTILE_CONTACT' : 'FAILED', said: `did not start: the body was ${doing} on its own for ${s} s, until the step's time ran out; send it again` };
      }
    }
    let cancelled = false;
    // self: a cancel of our own making that is not a stop (an attack whose mob died)
    const cancel = async (why, { self = false } = {}) => {
      if (cancelled || !ctl.actionId) return;
      cancelled = true;
      if (!self) ctl.stopped ??= why;
      await rpc('cancel_foreground_action', { action_id: ctl.actionId, reason: String(why).slice(0, 200) });
    };
    ctl.cancel = cancel;
    const deaths = (d) => Number(d?.progress?.request?.evidence?.checkpoint?.targetDeathsObserved) || 0;
    while (data.state === 'accepted' || data.state === 'pending') {
      ctl.actionId ??= data.actionId;
      if (ctl.attack && !cancelled && deaths(data) > 0) { ctl.killed = deaths(data); await cancel(KILLED, { self: true }); }
      else if (ctl.stopped) await cancel(ctl.stopped);
      else if (left() <= 0) await cancel(`timed out after ${Math.round((ctl.limitMs ?? timeouts[ctl.skill] ?? 60_000) / 1000)} s`);
      const ms = cancelled ? 15_000 : ctl.attack ? Math.max(500, Math.min(ATTACK_POLL_MS, waitFor())) : Math.max(1_000, waitFor());
      data = await rpc('wait_for_action', { action_id: ctl.actionId, timeout_ms: ms }, ms + RPC_SLACK_MS);
    }
    if (data.state === 'settled' || data.state === 'storage_failed') return { output: data.output, stopped: ctl.stopped };
    if (data.state === 'refused') return { error: `${data.code}: ${data.error}`, code: data.code };
    return { error: data.error ?? `unexpected reply (${String(data.state)})` };
  }

  /**
   * The armor skill: the best pieces what is carried pays for (every material, nothing kept back), crafted, then
   * worn with whatever better piece is carried; {calls, note} or {refused}.
   */
  function armorCalls() {
    const pieces = care ? armorPlan(latest.inventory, stacks, { reserve: 0, materials: ['diamond', 'iron', 'golden', 'leather'] }).filter((p) => care.canCraft(p.item)) : [];
    const crafts = pieces.length ? care.craftCalls(pieces.map((p) => ({ item: p.item, n: 1 }))) ?? [] : [];
    const wear = new Map(wearPlan(stacks).map((w) => [w.to, w]));
    for (const p of pieces) wear.set(ARMOR_SLOTS[armorOf(p.item).piece], { item: p.item, to: ARMOR_SLOTS[armorOf(p.item).piece] });
    if (!crafts.length && !wear.size) {
      return { refused: { ok: false, result: 'nothing to craft or put on: armor takes 24 iron ingots (or leather) for a full set: helmet 5, chestplate 8, leggings 7, boots 4; carrying an armor piece or a shield, armor puts it on', code: 'NEED_ITEMS', delta: {} } };
    }
    const calls = [...crafts, { tool: 'equip', args: { items: [...wear.values()].map((w) => ({ item_name: w.item, destination: w.to })) } }];
    return { calls, note: pieces.length ? `crafts ${pieces.map((p) => p.item).join(', ')}` : null };
  }

  /** A spare pickaxe before a collect its pickaxe would not last through: {calls, text} or null. */
  function spareFirst(a) {
    if (!care || !a?.block_name || toolClassFor(a.block_name) !== 'pickaxe') return null;
    const n = Number(a.count) || 1;
    const spare = sparePlan(stacks, 'pickaxe', care.canCraft, { need: n + 4, minTier: pickaxeTierFor(a.block_name) });
    if (!spare) return null;
    const calls = care.craftCalls([{ item: spare.item, n: 1 }]);
    if (!calls) return null;
    const text = `crafted a spare ${spare.item} (your ${spare.low.name} had ${spare.low.left} use${spare.low.left === 1 ? '' : 's'} left, too few for ${n} ${a.block_name})`;
    event('care', { kind: 'tools', source: 'step', ok: true, text });
    return { calls, text };
  }

  /** The pickaxe broke in the middle of a collect: {calls (a new one, then the rest), before, text} or null. */
  async function replaceTool(call, output) {
    if (!care) return null;
    await refresh();
    const block = call.args.block_name;
    const lost = /^(\w+) was lost/.exec(splitError(output?.result?.error).text)?.[1] ?? null;
    const item = replacementFor('pickaxe', care.canCraft, { upTo: toolOf(lost)?.tier ?? 'diamond', minTier: pickaxeTierFor(block) });
    if (!item) return null;
    const craft = care.craftCalls([{ item, n: 1 }]);
    if (!craft) return null;
    const got = Number(output?.result?.collected?.gained) || 0;
    const left = Math.max(0, (Number(call.args.count) || 0) - got);
    const text = `crafted a new ${item}${left ? ` and went on with the other ${left}` : ''}`;
    event('care', { kind: 'tools', source: 'step', ok: true, text });
    return { calls: [...craft, ...(left ? [{ tool: 'collect_block', args: { block_name: block, count: left } }] : [])], before: `your ${lost ?? 'pickaxe'} broke after ${got} of ${call.args.count} ${block}`, text };
  }

  /**
   * A Nether portal frame next to lava or water does not get built (their build keeps a frame cell whose dig would open
   * into liquid, and water inside puts a portal out): the nearest lava and water within 3 blocks of the frame's cells
   * refuse the build before anything is placed (staging, 2026-10-11: a frame beside a lava pool at y 9 kept 2 cells
   * of deepslate and held 10 obsidian). Null when the site is dry, or when it cannot be read.
   */
  async function portalSite(cells) {
    // two boxes around the frame's middle (their box: 4 either side, 3 above and below), its lower and its upper half
    const xs = cells.map((c) => c.x); const zs = cells.map((c) => c.z); const ys = cells.map((c) => c.y);
    const mid = { x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), z: Math.round((Math.min(...zs) + Math.max(...zs)) / 2) };
    const liquid = [];
    for (const y of [Math.min(...ys), Math.max(...ys)]) {
      const data = await rpc('view_blocks', { box: { x: mid.x, y, z: mid.z, half_width: 4, half_height: 3 } }, 10_000).catch(() => null);
      const box = data?.result?.blocks?.box;
      if (!box?.layers) return { ok: false, result: 'the blocks where the portal frame would stand could not be read; try again in a moment, or a little way off', code: 'FAILED', delta: {} };
      for (const layer of box.layers) for (const row of layer.rows) row.blocks.forEach((name, i) => {
        if (name === 'unloaded') liquid.push({ name, x: box.center.x - box.halfWidth + i, y: layer.y, z: row.z });
        else if (name === 'lava' || name === 'water') liquid.push({ name, x: box.center.x - box.halfWidth + i, y: layer.y, z: row.z });
      });
    }
    const unloaded = liquid.find((b) => b.name === 'unloaded');
    if (unloaded) return { ok: false, result: `the ground around where the portal frame would stand is not loaded yet (${unloaded.x} ${unloaded.y} ${unloaded.z}); try again in a moment`, code: 'FAILED', delta: {} };
    const near = liquid.sort((a, b) => (a.name === 'lava' ? -1 : 1) - (b.name === 'lava' ? -1 : 1))[0];
    if (!near) return null;
    return { ok: false, result: `${near.name} at ${near.x} ${near.y} ${near.z} is next to where the portal frame would stand: build it on dry ground away from lava and water (go_to a spot with flat ground and open sky first)`, code: near.name === 'lava' ? 'LAVA' : 'FAILED', delta: {} };
  }

  /**
   * collect obsidian, before it runs (the safety review of M8a): only in the Overworld; never while another game's
   * obsidian (a frame), or a lit portal, is loaded near by (their collect mines any loaded obsidian); and only with lava
   * within LAVA_NEAR blocks to make it from, away from the world spawn and from other players (their collect pours
   * water there, unguarded). Null when it may run.
   */
  async function obsidianGuard() {
    const refuse = (result, code = 'FAILED') => ({ ok: false, result, code, delta: {} });
    const p = latest.position;
    if ((dimension ?? 'overworld') !== 'overworld') return refuse('obsidian is made and collected in the Overworld only (in the Nether it would take portal frames, yours included)');
    if (!p) return refuse('the body does not know where it stands yet; try again in a moment');
    const other = othersObsidian(p, FRAME_GUARD)[0];
    if (other) return refuse(`another player's obsidian (a portal frame) is at ${other.x} ${other.y} ${other.z}, within ${FRAME_GUARD} blocks: collect obsidian could take it. Go farther away first`);
    const lit = scan.blocks.find((b) => b.name === 'nether_portal');
    if (lit) return refuse(`a lit portal is loaded near by (at ${lit.nearest.x} ${lit.nearest.y} ${lit.nearest.z}): collect obsidian could take its frame. Go farther away first (portal dismantle takes back your own frame)`);
    const data = await rpc('view_blocks', { find: { block_names: ['lava'], limit: 8 } }, 10_000).catch(() => null);
    const lava = (data?.result?.blocks?.find?.[0]?.listed ?? []).map(floorPos).filter((l) => Math.hypot(l.x - p.x, l.y - p.y, l.z - p.z) <= LAVA_NEAR);
    if (!data?.result?.blocks) return refuse('the blocks around could not be read; try again in a moment');
    if (!lava.length) return refuse(`no lava within ${LAVA_NEAR} blocks to make obsidian from: go near lava first (get_state lists it among the nearby blocks; deep caves below y -54 have plenty)`, 'LAVA');
    if (spawnAt && lava.some((l) => Math.hypot(l.x - spawnAt.x, l.z - spawnAt.z) <= SPAWN_GUARD)) return refuse(`the lava near by is within ${SPAWN_GUARD} blocks of the world spawn, where new players arrive: make obsidian somewhere else`, 'LAVA');
    const players = (status?.nearby?.players ?? []).map((x) => x?.position).filter(Boolean);
    if (players.some((q) => lava.some((l) => Math.hypot(q.x - l.x, q.y - l.y, q.z - l.z) <= 8))) return refuse('another player is next to the lava near by: make obsidian somewhere else', 'LAVA');
    return null;
  }

  /**
   * The portal back from the Nether, put out (a ghast's fireball does that): when the blocks seen since the bot came
   * out of it hold no lit portal block there, the advice says so, with portal light when it carries flint and steel.
   */
  function portalAdvice() {
    const dim = dimension ?? 'overworld';
    const a = arrivals[dim];
    if (dim === 'overworld' || !a || scan.at <= a.at) return []; // the blocks read since it came out there
    // standing in or right next to the portal it came out of: lit (their entry puts the bot inside the portal blocks)
    const p = latest.position;
    if (p && Math.hypot(p.x - (a.pos.x + 0.5), p.z - (a.pos.z + 0.5)) <= 3 && Math.abs(p.y - a.pos.y) <= 3) return [];
    // only a whole scan read well after the arrival says anything (an early or partly unreadable one may miss it)
    if (!scan.complete || scan.at < a.at + portalSettleMs) return [];
    const lit = scan.blocks.some((b) => b.name === 'nether_portal' && Math.hypot(b.nearest.x - a.pos.x, b.nearest.y - a.pos.y, b.nearest.z - a.pos.z) <= 4);
    if (lit) return [];
    const flint = (latest.inventory?.flint_and_steel ?? 0) > 0;
    return [{ kind: 'portal', text: `the portal back at ${a.pos.x} ${a.pos.y} ${a.pos.z} is not lit any more${flint ? '' : ': flint_and_steel lights it again (1 iron_ingot and 1 flint)'}`, ...(flint ? { hint: { skill: 'portal', args: { action: 'light', pos: a.pos } } } : {}) }];
  }

  /** Wait (up to ms) until none of their reflexes holds the body. */
  async function reflexSettled(ms) {
    const end = Date.now() + Math.max(0, ms);
    while (Date.now() < end) {
      await refresh().catch(() => {});
      if (!['takeover', 'yielding'].includes(status?.activity?.owner)) return true;
      await new Promise((r) => { setTimeout(r, 500); });
    }
    return false;
  }

  /** Wait (up to ms) until their view of these cells (at most 32) holds no unloaded one. */
  async function loadedCells(cells, ms) {
    const end = Date.now() + ms;
    const list = cells.slice(0, 32).map((c) => ({ x: c.x, y: c.y, z: c.z }));
    while (Date.now() < end) {
      const data = await rpc('view_blocks', { cells: list }, 10_000).catch(() => null);
      const seen = data?.result?.blocks?.cells;
      if (Array.isArray(seen) && seen.length && !seen.some((c) => c.name === 'unloaded')) return true;
      await new Promise((r) => { setTimeout(r, 1_000); });
    }
    return false;
  }

  async function run(tool, args) {
    let t0 = Date.now();
    if (ended) return { ok: false, result: 'not connected to the game', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (!body.connected) return { ok: false, result: 'not in the game yet', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (host?.restarting) return { ok: false, result: 'the body is being started again after it stopped; send the step again in a few seconds', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (body.busy) return { ok: false, result: `busy: ${doing ?? 'a skill'} is still running`, delta: {}, ms: 0 };
    const v = MINEAI_SKILLS.validate(tool, args ?? {});
    if (!v.ok) return { ok: false, result: `bad arguments: ${v.error}`, delta: {}, ms: 0, code: 'BAD_ARGS' };
    body.busy = true;
    doing = describeCall(tool, v.args);
    const ctl = { skill: tool, actionId: null, stopped: null, cancel: null, attack: null, killed: 0 };
    current = ctl;
    emit('skill', { phase: 'start', tool, args: v.args });
    // the body may be looking after itself (src/mineai/care.js): that stops for the step at once, except a recovery of
    // the items a death dropped (they despawn), which finishes first; the step's time starts after it
    const yielded = await care?.yield().catch(() => null);
    if (yielded === 'recover') t0 = Date.now();
    let r;
    // the inventory change is counted from here: carried and worn (an equip moves an item, it does not lose it); a
    // status read that fails keeps the copy from before, never an empty one
    let before = allItems(latest.inventory, latest.equipment);
    // what the step's actions themselves used and made, from their evidence (ownChange); null: it cannot be told apart
    // from what else changed meanwhile (then the reply shows only the whole change)
    let own = null;
    let deathBefore = lastDeath;
    let built = null; // a build's structure (toTheirs), remembered below while it is incomplete
    let dismantling = false; // portal dismantle: its own frame's obsidian back
    let skipped = null; // the last optional call that did not work, in words
    const crashesBefore = crashes;
    // the runtime stopped during this step: the host starts it again once per game, and a second stop ends the game
    // (src/mineai/host.js). The step may be what stopped it (2026-10-08, before patch 0010: a build around the bot in a pocket in stone
    // stopped the runtime's event loop every time), so the reply never asks for the same step at the same spot
    const restartText = (why) => `the body stopped in the middle of this step (${why}) and is being started again (code BODY_RESTARTED). This step may be what stopped it: do not send it again from here${tool === 'build' ? '; build in the open instead (go_to a spot a few blocks away with open sky and flat ground, then build)' : ''}. The body is started again once per game: a second stop ends the game. Call get_state in a few seconds, then go on`;
    try {
      await refresh();
      before = allItems(latest.inventory, latest.equipment);
      deathBefore = lastDeath;
      const plan = toTheirs(tool, v.args, context());
      built = plan.build ?? null;
      dismantling = Boolean(plan.dismantle);
      // the body's own care knobs (policy skill): kept here, never sent to the runtime
      const careText = plan.care ? (() => {
        const knobs = care?.setPolicy(plan.care === 'reset' ? null : plan.care);
        return `; its reflexes: ${describeReflexes(knobs, careMode)}${careMode === 'full' ? `; on its own between your calls: ${describeCare(knobs)}` : ''}`;
      })() : '';
      if (!plan.refused && tool === 'build' && v.args.blueprint === 'nether_portal' && plan.build) plan.refused = await portalSite(plan.build.cells);
      if (!plan.refused && tool === 'collect' && v.args.block === 'obsidian') plan.refused = await obsidianGuard();
      // its frame's cells loaded first: just back through the portal, the chunks around are still coming in (the
      // staging checks, 2026-10-11: every cell "unloaded", no obsidian back)
      if (!plan.refused && plan.dismantle) await loadedCells(plan.calls.map((c) => c.args), 15_000);
      if (plan.refused) built = null; // a build refused before it began leaves nothing to continue
      if (plan.local === 'armor') { const a = armorCalls(); if (a.refused) plan.refused = a.refused; else { plan.calls = a.calls; plan.note = a.note; } }
      if (plan.local === 'state') r = { ok: true, result: renderState(snapshot()), code: null };
      else if (plan.local === 'care') {
        if (!care) r = { ok: false, result: `${tool}: the body's care is off on this server`, code: 'FAILED' };
        else { const p = await care.perform(plan.kind, ctl); r = { ok: p.ok, result: p.text, code: p.ok ? null : p.code ?? 'FAILED' }; }
      }
      else if (plan.refused) r = plan.refused;
      else if (!plan.calls?.length && plan.care) r = { ok: true, result: careText.replace(/^; /, ''), code: null };
      else {
        const deadline = t0 + (plan.timeoutMs ?? timeouts[tool] ?? 60_000);
        ctl.attack = plan.attack ?? null;
        if (plan.timeoutMs) ctl.limitMs = plan.timeoutMs; // what a time-out says
        const parts = [];
        let rescued = false;
        own = {};
        const calls = [...plan.calls];
        // a collect that would wear its pickaxe out gets a spare first (crafted from what is carried)
        // (full mode only: in advise mode a tool running low is advice, and a broken one the step's failure)
        const spare = tool === 'collect' && careMode === 'full' ? spareFirst(calls[0]?.args) : null;
        if (spare) { calls.unshift(...spare.calls.map((c) => ({ ...c, quiet: true }))); parts.push({ ok: true, result: `on its own first: ${spare.text}`, code: null }); }
        let replaced = 0;
        const retried = new Set(); // calls tried again once after a reflex took the body over
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i];
          if (ctl.stopped) break;
          ctl.actionId = null;
          // a craft's item counted before it: a craft a reflex cuts short may have made the item all the same
          let craftHad = null;
          if (call.tool === 'craft_item' && call.args?.items?.[0]) {
            await refresh().catch(() => {});
            const { item_name: item, count } = call.args.items[0];
            craftHad = { item, count: Number(count) || 1, have: latest.inventory?.[item] ?? 0, tables: latest.inventory?.crafting_table ?? 0 };
          }
          let out = await act(call, deadline, ctl);
          // a call with alternatives (a way out of a portal: one side, else the other): the next when this one failed
          for (const alt of call.alts ?? []) {
            if (ctl.stopped || (!out.error && out.output?.result?.status === 'succeeded')) break;
            ctl.actionId = null; // a new action: its own id (the review of M8a: the first one's id was waited on again)
            out = await act({ ...call, args: alt }, deadline, ctl);
          }
          if (out.error) {
            own = null;
            const down = /\[(RUNTIME_EXITED|RUNTIME_UNRESPONSIVE)\]/.exec(out.error)?.[1] ?? (crashes !== crashesBefore ? 'its host crashed' : null);
            const said = down ? restartText(down) : out.said ?? `failed: ${String(out.error).replace(/^MCP error -?\d+: /, '').slice(0, 300)}`;
            parts.push({ ok: false, result: said, code: down ? 'BODY_RESTARTED' : out.ours ?? (out.code === 'INVALID_ARGUMENTS' ? 'BAD_ARGS' : 'FAILED') });
            break;
          }
          let res = fromTheirs(call.tool, out.output, { stopped: out.stopped, call });
          // one of their reflexes took the body over in the middle of the call (a production game, 2026-10-11: a
          // shield craft at night "failed: Equip an available shield before nearby hostiles require a guard" with the
          // shield made, and the steps after it were cancelled for nothing)
          const takeover = !res.ok && !out.error && !ctl.stopped ? reflexTakeover(res.result) : null;
          if (takeover && craftHad) {
            await refresh().catch(() => {});
            const gained = (latest.inventory?.[craftHad.item] ?? 0) - craftHad.have;
            if (gained >= craftHad.count) {
              own = null; // their evidence of the craft is cut short: the step's whole change is shown
              const table = (latest.inventory?.crafting_table ?? 0) < craftHad.tables;
              res = { ok: true, code: null, result: `crafted ${gained} ${craftHad.item}; then a reflex took the body over (${takeover})${table ? ', and the crafting table put down for the craft stayed where it stands (collect crafting_table takes it back)' : ''}` };
            }
          }
          // truly cut short: tried once more after the reflex let go (calls that can simply be sent again), else a
          // plain INTERRUPTED instead of a failure
          if (!res.ok && takeover) {
            if (RETRY_AFTER_REFLEX.has(call.tool) && !retried.has(i) && deadline - Date.now() > 10_000) {
              retried.add(i);
              await reflexSettled(Math.min(20_000, deadline - Date.now() - 5_000));
              if (!ctl.stopped) { parts.push({ ok: true, result: `a reflex took the body over (${takeover}); tried again once it let go`, code: null }); i -= 1; continue; }
            }
            own = null;
            res = { ok: false, code: 'INTERRUPTED', result: `a reflex took the body over (${takeover}) before ${call.tool.replace(/_/g, ' ')} was done; nothing is wrong with the step: send it again once the mobs are dealt with` };
          }
          const o = ownChange(call.tool, out.output, call);
          if (o === null) own = null;
          else if (own) for (const [k, n] of Object.entries(o)) own[k] = (own[k] ?? 0) + n;
          // the pickaxe broke in the middle of a collect: a new one from what is carried, then the rest of the collect
          if (!res.ok && careMode === 'full' && res.theirs === 'TOOL_TIER_LOST' && call.tool === 'collect_block' && replaced < 2 && !ctl.stopped && deadline - Date.now() > 10_000) {
            const again = await replaceTool(call, out.output);
            if (again) {
              replaced += 1;
              parts.push({ ok: true, result: `${again.before}; on its own: ${again.text}`, code: null });
              calls.splice(i + 1, 0, ...again.calls.map((c) => (c.tool === 'craft_item' ? { ...c, quiet: true } : c)));
              continue;
            }
          }
          // an attack is a hunt for one drop, ended once the mob died: a fight won without that drop still counts
          const kills = Math.max(ctl.killed, Number(out.output?.result?.hunt?.targetDeathsObserved) || 0);
          if (!res.ok && plan.attack && kills > 0) {
            const got = Number(out.output?.result?.hunt?.gained) || 0;
            res = { ok: true, result: `fought the ${plan.attack} and killed it${got > 0 ? `; picked up ${got} ${out.output.result.hunt.drop ?? ''}`.trimEnd() : ''}`, code: null };
            rescued = true;
          }
          // a Nether portal frame is a frame only when every frame cell is obsidian and the inside is air: a build that kept
          // solid ground in a frame cell or left water inside "succeeded" as a build, never as a portal (a local run in
          // deepslate, 2026-10-11: 2 frame cells kept the deepslate, and the portal would not light)
          if (res.ok && call.tool === 'build_structure' && plan.build?.blueprint === 'nether_portal') {
            const st = out.output?.result?.structure ?? {};
            const kept = (st.kept ?? []).reduce((k, x) => k + (Number(x.count) || 0), 0);
            const wet = Number(st.water) || 0;
            if (kept || wet) res = { ok: false, code: 'FAILED', result: `${res.result}; not a portal frame: ${[kept ? `${plural(kept, 'frame cell')} kept ${(st.kept ?? []).map((x) => x.block).join(' and ')} instead of obsidian` : null, wet ? `${plural(wet, 'inside cell')} ${wet === 1 ? 'is' : 'are'} water` : null].filter(Boolean).join(', ')}. Take the obsidian back (portal dismantle) and build it on open, dry ground away from lava and water (go_to a spot with flat ground and open sky)` };
          }
          if (res.ok && call.tool === 'place_block' && CONTAINER_BLOCKS.has(call.args.block_name)) containers.set(keyOf(call.args), gameId);
          // a craft the body added on its own (a spare tool, a new one) is told by its own line, not again
          if (!res.ok && call.optional) { skipped = res.result; continue; } // a try that may fail (a way out of a portal): the next call goes on
          if (!(res.ok && call.quiet)) parts.push(res);
          if (!res.ok) break;
        }
        const failed = parts.find((x) => !x.ok);
        const text = parts.map((x) => x.result).join('; ') || (ctl.stopped ? `stopped: ${ctl.stopped}` : 'nothing ran');
        const stopped = ctl.stopped && !rescued;
        r = { ok: !failed && !stopped, result: `${text}${plan.note ? ` (${plan.note})` : ''}${careText}`, code: failed?.code ?? (stopped ? 'STOPPED' : null) };
      }
    } catch (err) {
      own = null;
      r = crashes !== crashesBefore ? { ok: false, result: restartText('its host crashed'), code: 'BODY_RESTARTED' } : { ok: false, result: `error: ${String(err?.message ?? err).slice(0, 300)}`, code: 'FAILED' };
    }
    try { await refresh(); } catch { /* the state stays as it was */ }
    const delta = inventoryDelta(before, allItems(latest.inventory, latest.equipment));
    if (lastDeath && lastDeath !== deathBefore) {
      own = null; // the items dropped at the death are not the step's doing
      const at = status?.lastDeath?.position;
      r = { ok: false, result: `you died${at ? ` at ${floorPos(at).x} ${floorPos(at).y} ${floorPos(at).z}` : ''}; your items dropped there (pick_up with death_items: true within 5 minutes). ${r.result}`, code: 'DIED' };
    }
    // a complete structure is done with; an incomplete one is continued by the next build of it nearby; one whose step
    // stopped the runtime is not (the reply says to build somewhere else)
    if (built) lastBuild = r.ok || r.code === 'BODY_RESTARTED' ? null : built;
    // a Nether portal frame that failed at its site (cells kept, water inside, lava): never continued there; one short of
    // obsidian is (the review of M8a: a bad site was resumed within 12 blocks and refused again and again)
    if (built?.blueprint === 'nether_portal' && !r.ok && r.code !== 'NEED_ITEMS') lastBuild = null;
    if (built?.blueprint === 'nether_portal' || (tool === 'place' && v.args.block === 'obsidian' && r.ok)) {
      // the obsidian this game put down (or may have): no other game's collect takes it, and dismantle takes it back
      const cells = tool === 'place' ? [v.args.pos] : built.cells.filter((c) => c.block_name === 'obsidian');
      for (const c of cells) frames.set(frameKey(dimension ?? 'overworld', c), gameId);
    }
    // a Nether portal frame built (or tried): the portal skill lights and enters it without a pos (in this dimension),
    // and dismantle takes its obsidian back
    if (built?.blueprint === 'nether_portal') {
      const frame = built.cells.find((c) => c.block_name !== 'air');
      const inside = built.cells.find((c) => c.block_name === 'air');
      if (frame && inside) lastPortal = { dimension: dimension ?? 'overworld', frame: { x: frame.x, y: frame.y, z: frame.z }, inside: { x: inside.x, y: inside.y, z: inside.z }, cells: built.cells.filter((c) => c.block_name === 'obsidian'), complete: r.ok };
      if (r.ok) care?.portalBuilt();
    }
    // its own frame taken back: no more a frame of its own, and the cells free for anyone
    if (dismantling) {
      const got = Number(delta.obsidian) || 0;
      if (got <= 0 && r.ok) r = { ok: false, result: `took back no obsidian from your last frame${skipped ? ` (${skipped})` : ': none of its cells still holds it'}`, code: 'FAILED' };
      if (got > 0 && r.ok) r = { ...r, result: `took back ${got} obsidian from your last frame${skipped ? ` (not every cell: ${skipped.slice(0, 160)})` : ''}` };
      if (got > 0 && lastPortal) {
        for (const c of lastPortal.cells) frames.delete(frameKey(lastPortal.dimension, c));
        lastPortal = null;
      }
    }
    if (yielded === 'recover') r = { ...r, result: `${r.result} (before it the body finished going back for the items it dropped when it died)` };
    const ms = Date.now() - t0;
    if (!['get_state', 'policy'].includes(tool)) museActions += 1;
    if (tool === 'pick_up' && v.args.death_items && r.ok) care?.recovered(status?.lastDeath?.observedAt ?? null);
    if (tool === 'pick_up' && v.args.death_items && r.code === 'DIED') care?.diedRecovering(status?.lastDeath?.observedAt ?? null);
    body.busy = false;
    idleSince = Date.now();
    doing = null;
    current = null;
    lastResult = `${describeCall(tool, v.args)} -> ${r.ok ? 'ok' : 'failed'}: ${r.result}${Object.keys(delta).length ? ` (inventory: ${describeDelta(delta)})` : ''}`.slice(0, 600);
    const ownNonZero = own ? Object.fromEntries(Object.entries(own).filter(([, n]) => n)) : null;
    const out = { ok: Boolean(r.ok), result: r.result, delta, ms, ...(ownNonZero ? { own: ownNonZero } : {}), ...(r.ok ? {} : { code: r.code ?? 'FAILED' }) };
    emit('skill', { phase: 'end', tool, args: v.args, ...out });
    scanSoon();
    return out;
  }

  async function stop(reason = 'stopped') {
    const ctl = current;
    if (!ctl) return;
    ctl.stopped ??= String(reason);
    if (ctl.cancel) await ctl.cancel(ctl.stopped);
    // the run ends once their action has settled (a cancel takes a moment)
    const until = Date.now() + 5_000;
    while (current === ctl && Date.now() < until) await new Promise((r) => { setTimeout(r, 100); });
  }

  function end(reason) {
    if (ended) return;
    ended = reason;
    body.connected = false;
    body.viewerPort = null;
    body.eyesPort = null;
    emit('end', { reason });
  }

  async function close() {
    if (closed) return closed;
    closed = (async () => {
      await care?.stop().catch(() => {});
      await stop('the game ended').catch(() => {});
      await dropClient();
      await host?.close('the game ended');
      for (const [k, owner] of containers) if (owner === gameId) containers.delete(k);
      end('the game ended');
    })();
    return closed;
  }
  let closed = null;

  body.ready = (async () => {
    const views = viewId ? { watch: `/watch/${viewId}`, eyes: `/eyes/${viewId}` } : null;
    host = await hosts.start({ instanceId: gameId, username, views });
    if (closed) { await host.close('the game ended while it was starting'); throw new Error('the game ended while the bot was joining'); }
    // every heartbeat brings health, food, position and inventory; the rest of the state (time, mobs) is read again
    // when it is older than STATUS_MS, also while a skill runs (their status reads run beside an action)
    host.on('health', (h) => {
      absorbHealth(h);
      if (!ended && Date.now() - statusAt > STATUS_MS) refresh().catch(() => {});
    });
    host.on('crash', ({ why }) => {
      crashes += 1;
      dropClient();
      emit('error', { message: `the body stopped (${why}); starting it again` });
      event('mineai_body_crash', { why });
    });
    host.on('restart', () => { event('mineai_body_restart', {}); refresh().catch(() => {}); });
    host.on('down', ({ why }) => end(`the body could not go on: ${why}`));
    await host.ready;
    if (closed) throw new Error('the game ended while the bot was joining');
    await refresh();
    spawnAt ??= latest.position ? { ...latest.position } : null; // before the spread moves it (src/index.js)
    body.connected = true;
    event('bot_ready', { username, body: 'mineai', pos: latest.position ? floorPos(latest.position) : null });
    emit('ready', {});
    scanBlocks();
    // the body looks after itself between the player's steps (src/mineai/care.js), once it has landed where it plays
    // (not awaited here: the agent's spread waits for this ready)
    if (careMode) Promise.resolve(careGate).catch(() => {}).then(() => { if (ended || closed) return; idleSince = Date.now();
      care = createCare({
        situation: () => status, latest: () => latest, stacks: () => stacks, refresh, act, rpc,
        policy: () => ({ revision: policyRevision, effective: theirPolicy }),
        fresh: async () => { if (Date.now() - statusAt > 2_000) await refresh(); },
        plan: (skill, a) => toTheirs(skill, a, context()),
        idle: () => body.connected && !ended && !closed && !body.busy && !host?.restarting,
        idleSince: () => idleSince,
        furnaceNear: () => body.stationNear('furnace'), tableNear: () => body.stationNear('crafting_table'),
        event, tickMs: careTickMs, idleBeforeMs: careIdleMs, mode: careMode,
      });
      care.start();
    });
    if (host.viewPorts) {
      // the live views listen inside their bot's process once it has spawned (src/mineai/preload.mjs)
      const { watch, eyes } = host.viewPorts;
      listening(watch, 20_000).then((ok) => { if (ok && !ended) body.viewerPort = watch; });
      listening(eyes, 20_000).then((ok) => {
        if (!ok || ended) { if (!ok) event('viewer_error', { message: 'the live views of this body did not start' }); return; }
        body.eyesPort = eyes;
        try { onEyes?.(eyes, `/eyes/${viewId}/`); } catch (err) { event('viewer_error', { message: String(err?.message ?? err).slice(0, 200) }); }
      });
    }
  })();
  body.ready.catch((err) => { event('bot_error', { message: String(err?.message ?? err).slice(0, 300) }); end(`could not join the Minecraft server: ${err?.message ?? err}`); });
  return body;
}
