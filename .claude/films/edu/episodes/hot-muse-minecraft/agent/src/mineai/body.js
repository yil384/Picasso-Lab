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
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { inventoryDelta } from '../contracts.js';
import { renderState, describeCall, describeDelta } from '../state.js';
import { NOTABLE_BLOCKS } from '../state.js';
import { MINEAI_SKILLS, MINEAI_TIMEOUTS, DIRECT_TOOLS, CONTAINER_BLOCKS, SPAWN_GUARD, CONTINUE_RADIUS, toTheirs, fromTheirs, doneSoFar, reflexTakeover, reflexWords, ownChange, splitError } from './skills.js';
export { reflexTakeover };
import { createCare, describeRules, armorPlan, wearPlan, toolClassFor, toolOf, pickaxeTierFor, sparePlan, replacementFor, describeCare, describeReflexes, ARMOR_SLOTS, armorOf } from './care.js';

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
/**
 * Where bots of this process came out of a portal, per Minecraft server: "host:port" -> Map("dimension:x,y,z" -> game
 * id). The portals stay in the shared world after their games, and every later trip through the same Nether portal
 * comes back there (production games g4ac86b and ga13a88, 2026-10-13: both came back at 49 93 161); a refusal near one
 * says it is that portal, not a stranger's.
 */
const RETURNS = new Map();
/** The games whose bodies live in this process: a frame or a return portal of no live game is released (below). */
const LIVE_GAMES = new Set();
/**
 * Portals of ended games are released, not dismantled (the owner's question after g4ac86b and g809e1b, 2026-10-13: both
 * were refused collect obsidian near "a lit portal" that was a leftover of our own earlier games, g0793f1's frame and
 * the portal every Nether trip comes back to). Nobody plays them after their game; dismantling needs a bot; and the game
 * makes a new return portal when one is gone. So a frame or a return portal of no live game protects nothing: collect
 * obsidian runs near it. The registries are kept in MINEAI_DATA_DIR (portals.json), so they outlive a restart.
 */
const portalsFile = (config) => (config.mineai?.dataDir ? path.join(config.mineai.dataDir, 'portals.json') : null);
function loadPortals(config, server) {
  const file = portalsFile(config);
  if (!file) return;
  try {
    const all = JSON.parse(fs.readFileSync(file, 'utf8'))?.[server] ?? {};
    for (const [k, g] of all.frames ?? []) if (typeof k === 'string' && typeof g === 'string') FRAMES.get(server).set(k, g);
    for (const [k, gs] of all.returns ?? []) if (typeof k === 'string' && Array.isArray(gs)) RETURNS.get(server).set(k, new Set(gs.filter((g) => typeof g === 'string')));
  } catch { /* none yet, or unreadable: start empty */ }
}
function savePortals(config, server) {
  const file = portalsFile(config);
  if (!file) return;
  try {
    let all = {};
    try { all = JSON.parse(fs.readFileSync(file, 'utf8')) ?? {}; } catch { all = {}; }
    all[server] = { frames: [...FRAMES.get(server)].slice(-2000), returns: [...RETURNS.get(server)].map(([k, gs]) => [k, [...gs].slice(-20)]).slice(-500) };
    fs.writeFileSync(file, JSON.stringify(all));
  } catch { /* the registry stays in memory */ }
}
/** How far (blocks, flat) another game's obsidian keeps a collect obsidian from running: about what is loaded. */
export const FRAME_GUARD = 160;
/** After coming out of a portal, the blocks around are trusted to say whether it is still lit only once a whole scan
 * has been read this long after the arrival (the chunks come in over seconds; an early scan missed the portal it
 * stood in: production, 2026-10-11, every camera trip). */
export const PORTAL_SETTLE_MS = 10_000;
/** How long a search for obsidian may bring none in before it is stopped and said why (making one takes about 30 s). */
export const OBSIDIAN_STALL_MS = 75_000;
/**
 * How long a step waits for their action to end once it was cancelled (F8 of the 2026-10-12 log hunt: a cancelled
 * obsidian collect ran 360 s past its limit, the step with it). After that the step ends; their action, if still
 * running, is cancelled again before the next one starts (act: "an earlier step was left running").
 */
export const CANCEL_GRACE_MS = 30_000;
/** What a block placed into a cell simply replaces (nothing to dig first). */
const REPLACEABLE = /^(air|cave_air|void_air|short_grass|tall_grass|grass|fern|large_fern|snow|dead_bush|vine|glow_lichen|seagrass|[a-z_]*_sapling|dandelion|poppy|blue_orchid|allium|azure_bluet|[a-z_]*_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony)$/;
/**
 * Whether an obsidian cell belongs to a lit portal's frame: a portal block on one of the 26 cells around it, its
 * corners included (production game gd7540a, 2026-10-14: the search took the 4 corner blocks of another player's lit
 * frame, which touch no portal block on a face, and Muse walked back twice for "the obsidian deposit" there).
 */
/**
 * Still lava (level 0) grouped into pools as their cast groups it (sources within 8 blocks of a pool's first one), the
 * nearest first: [{x, y, z, sources, d}] from a find's listed lava and where the bot stands.
 */
export function lavaPools(listed, p) {
  const sources = (listed ?? []).filter((l) => !Number.isFinite(l.level) || l.level === 0).map(floorPos)
    .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y, a.z - p.z) - Math.hypot(b.x - p.x, b.y - p.y, b.z - p.z));
  const pools = [];
  for (const s of sources) {
    const pool = pools.find((q) => Math.hypot(q.x - s.x, q.y - s.y, q.z - s.z) <= 8);
    if (pool) pool.sources += 1; else pools.push({ x: s.x, y: s.y, z: s.z, sources: 1 });
  }
  return pools.map((q) => ({ ...q, d: Math.round(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)) }));
}
/** A pool in words: "the still lava pool at x y z (n sources), d blocks away". */
const poolSize = (q) => (q.sources === 1 ? '1 source: 1 obsidian at most' : `${q.sources} sources`);
const poolWords = (q) => `the still lava pool at ${q.x} ${q.y} ${q.z}, ${q.d} blocks away (${poolSize(q)})`;

export function litFrameCell(q, portalAt) {
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
    if ((dx || dy || dz) && portalAt.has(`${q.x + dx},${q.y + dy},${q.z + dz}`)) return true;
  }
  return false;
}

/** Their temporary station's verification hitches (a placed furnace or table not yet seen), worth one more try. */
export const STATION_HITCH = /consumption of [a-z_]+ was not observed|NO_LOADED_MATCHING_TARGETS\] Observed 0 loaded (crafting_table|furnace) blocks/;

/** A running action's checkpoint in words: "3 of 14 so far" (collect, build, craft, smelt, hunt). */
export function progressWords(cp) {
  const n = (x) => (Number.isFinite(Number(x)) ? Number(x) : null);
  const got = n(cp.gained) ?? n(cp.produced) ?? n(cp.placed) ?? n(cp.collected);
  const of = n(cp.requested);
  const phase = typeof cp.phase === 'string' && cp.phase !== 'running' ? cp.phase.replace(/_/g, ' ') : null;
  if (got === null && !phase) return null;
  return [got !== null ? `${got}${of ? ` of ${of}` : ''} so far` : null, phase].filter(Boolean).join(', ');
}

/**
 * What the body is doing within a running step, in plain words with its numbers, from the runtime's checkpoint (their
 * action's progress, read about once a second while it runs): walking with the distance left, "mining obsidian" with
 * its count apart (done 3, of 14), placing blocks, filling or pouring a bucket, smelting, fighting, eating, sleeping,
 * exploring. null when the
 * checkpoint says nothing worth showing. For the live video: the body carrying out Muse's command, never a new action.
 */
export function subStepOf(tool, args = {}, cp = {}) {
  const n = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Math.round(Number(x))) : null);
  const name = (v) => String(v ?? '').replace(/^minecraft:/, '').replace(/_/g, ' ').trim();
  const a = args ?? {};
  const c = cp ?? {};
  switch (tool) {
    case 'navigate': {
      const d = n(c.remainingDistance);
      return d === null ? { kind: 'walk', text: 'finding the way' } : { kind: 'walk', text: d <= 1 ? 'almost there' : `${d} blocks to go`, left: d };
    }
    case 'collect_block': {
      const got = n(c.gained) ?? 0;
      const of = n(c.requested) ?? n(a.count);
      return { kind: 'mine', text: `mining ${name(a.block_name) || 'blocks'}`, done: got, ...(of ? { of } : {}) };
    }
    case 'build_structure': {
      const ok = n(c.correct) ?? 0;
      const of = n(c.requested);
      return { kind: 'build', text: 'placing blocks', done: ok, ...(of ? { of } : {}) };
    }
    case 'use_bucket': {
      const liquid = name(a.liquid) || 'water';
      if (c.obsidianFormed) return { kind: 'bucket', text: 'obsidian formed' };
      if (c.phase === 'finding_and_filling') return { kind: 'bucket', text: `filling a bucket with ${liquid}` };
      if (c.phase === 'approaching_and_pouring') return { kind: 'bucket', text: c.targetBlock === 'lava' ? `pouring ${liquid} on lava` : `pouring ${liquid}` };
      return null;
    }
    case 'smelt_item': {
      if (c.phase === 'loading_furnace') return { kind: 'smelt', text: 'loading the furnace' };
      const got = n(c.produced) ?? 0;
      const of = n(c.requested) ?? n(a.count);
      return { kind: 'smelt', text: `smelting ${name(a.item_name) || 'items'}`, done: got, ...(of ? { of } : {}) };
    }
    case 'hunt_mob': {
      const hits = n(c.attacks);
      return { kind: 'fight', text: `fighting a ${name(a.entity_name ?? a.mob ?? a.target) || 'mob'}${hits ? `, ${hits} hits` : ''}` };
    }
    case 'eat_food': return { kind: 'eat', text: `eating ${name(c.item ?? a.food_name ?? a.item_name)}`.trim() };
    case 'sleep': return { kind: 'sleep', text: c.asleep ? 'sleeping' : 'finding a bed' };
    case 'explore_frontier': {
      const got = n(c.expandedChunks) ?? 0;
      const of = n(c.requested);
      return { kind: 'explore', text: 'exploring new chunks', done: got, ...(of ? { of } : {}) };
    }
    default: return null;
  }
}

/** Calls sent once more after one of their reflexes cut them short (sending them again repeats nothing). */
// a hunt and a collect a fight cut short go on after it, for what is still missing (production game g2409ce,
// 2026-10-14: a sheep hunt the defend rule's fight interrupted was never sent again, and health stayed at 8.8)
export const RETRY_AFTER_REFLEX = new Set(['craft_item', 'smelt_item', 'equip', 'eat_food', 'place_block', 'use_bucket', 'navigate', 'build_structure', 'activate_portal', 'collect_mob_drop', 'collect_block']);
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
/**
 * Who acted in a game: Muse directly, the rules Muse set (each with when it was set: game time and call), and the body
 * on its own (a reflex whose rule is off, the body's own plans in full mode). {muse, rule, body, care, reflex (rule +
 * body), byRule, musePct (Muse directly), decidedPct (Muse directly or by its rules), text}. Without rule counts (an
 * older care): the older words.
 */
export function attributionOf(muse, { reflex = 0, care = 0, rule = null, body = null, byRule = {} } = {}, { set = {} } = {}) {
  if (rule === null) {
    const all = muse + reflex + care;
    const musePct = all ? Math.round((100 * muse) / all) : null;
    const text = `This game: ${muse} action${muse === 1 ? '' : 's'} by Muse, ${reflex} reflex${reflex === 1 ? '' : 'es'}${care ? `, ${care} by the body's own plans` : ''}${musePct != null ? ` (${musePct}% Muse)` : ''}`;
    return { muse, reflex, care, musePct, text };
  }
  const own = (body ?? 0) + care;
  const all = muse + rule + own;
  const musePct = all ? Math.round((100 * muse) / all) : null;
  const decidedPct = all ? Math.round((100 * (muse + rule)) / all) : null;
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const which = Object.entries(byRule).filter(([, n]) => n > 0).map(([k]) => `${k}${set[k] ? `, set at ${mmss(set[k].atS)} with ${Number.isInteger(set[k].call) ? `call ${set[k].call}` : set[k].via ?? 'start_game'}` : ''}`);
  const text = `This game: ${muse} action${muse === 1 ? '' : 's'} by Muse directly, ${rule} by rules Muse set${which.length ? ` (${which.join('; ')})` : ''}, ${own} by the body on its own${decidedPct != null ? ` (${decidedPct}% decided by Muse)` : ''}`;
  return { muse, rule, body: own, care, reflex, byRule: { ...byRule }, musePct, decidedPct, text };
}

export function createMineAiBody({ config, log, hosts, gameId, username, viewId = null, onEyes = null, connect = connectSdk, timeouts = MINEAI_TIMEOUTS, care: careOpt = 'advise', careTickMs, careIdleMs, careYieldMs, obsidianStallMs = OBSIDIAN_STALL_MS, portalSettleMs = PORTAL_SETTLE_MS, cancelGraceMs = CANCEL_GRACE_MS }) {
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
  if (!FRAMES.has(server)) { FRAMES.set(server, new Map()); RETURNS.set(server, new Map()); loadPortals(config, server); }
  const frames = FRAMES.get(server);
  LIVE_GAMES.add(gameId);
  const frameKey = (dim, p) => `${dim}:${keyOf(p)}`;
  const returns = RETURNS.get(server);
  const near4 = (k, dim, p) => { const [d, xyz] = k.split(':'); if (d !== dim) return false; const [x, y, z] = xyz.split(',').map(Number); return Math.abs(x - p.x) <= 4 && Math.abs(y - p.y) <= 4 && Math.abs(z - p.z) <= 4; };
  /** A portal bots of this server came out of, within 4 blocks of p in this dimension: its games, else null. */
  const knownReturn = (dim, p) => [...returns].find(([k]) => near4(k, dim, p))?.[1] ?? null;
  /**
   * A lit portal at p left by ended games (a frame one of them built, or a portal they came out of) and by none that
   * lives: released (collect obsidian may run near it). Its own frame is not (portal dismantle takes that back).
   */
  const leftover = (dim, p) => {
    const owners = new Set([...frames].filter(([k]) => near4(k, dim, p)).map(([, g]) => g));
    for (const g of knownReturn(dim, p) ?? []) owners.add(g);
    return owners.size > 0 && ![...owners].some((g) => g === gameId || (LIVE_GAMES.has(g)));
  };
  /** Obsidian cells of other games in this dimension within r blocks (flat) of p. */
  const othersObsidian = (p, r) => {
    const out = [];
    for (const [k, owner] of frames) {
      if (owner === gameId || !LIVE_GAMES.has(owner)) continue; // its own, or an ended game's (released)
      const [dim, xyzs] = k.split(':');
      if (dim !== (dimension ?? 'overworld')) continue;
      const [x, y, z] = xyzs.split(',').map(Number);
      if (Math.hypot(x - p.x, z - p.z) <= r) out.push({ x, y, z });
    }
    return out;
  };
  let lastDeath = null;
  let pendingRules = null; // Muse's rules given before the body's care runs (start_game rules on a joining bot)
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
  let progress = null; // the running step's progress in words (their checkpoint)
  let lastSub = 'null'; // the last sub-step sent to the video (JSON), so only a change goes out
  let lastPortal = null; // the frame the last build nether_portal made: {dimension, frame, inside, cells}
  const arrivals = {}; // dimension -> {pos, at}: where the bot last came out of a portal there
  let current = null; // the action running now: {actionId, stop}
  let stacks = []; // their status stacks (carried, worn, the off-hand; with durability)
  let idleSince = Date.now(); // when the last step of the player's ended (the care waits a moment after it)
  let care = null;
  // the care's mode: advise (the default: the plans are the player's, advice in every reply; the body acts by itself
  // only through its reflexes), full (it also carries its plans out between the player's calls), or none (off)
  const careMode = careOpt === false || careOpt === 'off' || careOpt == null ? null : careOpt === true || careOpt === 'full' ? 'full' : 'advise';
  let museActions = 0; // the player's skills this game (the policy too; get_state not counted)
  let careGate = null; // what the care waits for before it starts (body.deferCare)
  let ended = null;
  let seq = 0;
  const event = (kind, data = {}) => {
    try { log.event(kind, { game: gameId, ...data }); } catch { /* best effort */ }
    // the care policy the server set for the body: the stream's BODY · WORLD feed shows it as the server's
    if (kind === 'care_policy' && data.ok !== false) {
      const words = Object.entries(data).filter(([k]) => k !== 'ok').map(([k, v]) => `${k.replace(/_/g, ' ')} ${String(v).replace(/_/g, ' ')}`).join(', ');
      try { emit('server', { text: `care policy set: ${words || 'the defaults'}` }); } catch { /* best effort */ }
    }
  };
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
    attribution: () => attributionOf(museActions, care ? care.counts() : { reflex: 0, care: 0 }, care?.rules?.() ?? {}),
    /** Muse's rules (start_game rules, the policy skill): set some; read them with when each was set. */
    setRules: (r, meta) => { if (care?.setRules) return care.setRules(r, meta); pendingRules = { r, meta }; return null; },
    rules: () => care?.rules?.() ?? null,
    /**
     * Why a kind of step makes no progress, and what else to do (the stuck advice of the MCP layer):
     * {text, options: [{text, hint?}]}. kind: collect:<block>, go_to:<area>, build:<blueprint>, portal:<action>; last:
     * the last such step ({args, result}).
     */
    stuckWhy: async (kind, last = null) => {
      if (kind === 'collect:obsidian') return obsidianStuck(0);
      const words = String(last?.result ?? '').replace(/^failed:\s*/, '').split(/[;(]/)[0].trim().slice(0, 140);
      if (kind.startsWith('go_to:') && last?.args) {
        const t = last.args;
        return { text: `the walk to ${t.x} ${t.y} ${t.z} does not get there${words ? ` (${words})` : ''}`, options: [
          { text: `come at it from another side: go_to ${t.x + 3} ${t.y} ${t.z}`, hint: { skill: 'go_to', args: { x: t.x + 3, y: t.y, z: t.z } } },
          { text: `dig down beside it: go_to ${t.x} ${t.y - 1} ${t.z + 1}`, hint: { skill: 'go_to', args: { x: t.x, y: t.y - 1, z: t.z + 1 } } },
          { text: 'change the plan: a different spot or a different way to what you need' },
        ] };
      }
      // a frame that does not go up (production game gd7540a: three builds and only "change the plan" to go on)
      if (kind === 'build:nether_portal') {
        const p = latest.position ? floorPos(latest.position) : null;
        const liquid = /\b(lava|water) at (-?\d+) (-?\d+) (-?\d+)/.exec(String(last?.result ?? ''));
        const options = [];
        if (liquid && p) {
          const to = { x: p.x + 8 * (Math.sign(p.x - Number(liquid[2])) || 1), y: p.y, z: p.z + 8 * (Math.sign(p.z - Number(liquid[4])) || 1) };
          options.push({ text: `build 8 blocks farther from the ${liquid[1]}: go_to ${to.x} ${to.y} ${to.z}, then build`, hint: { skill: 'go_to', args: to } });
        }
        options.push({ text: 'build on open, flat ground with sky above: the frame goes 1 block in front of you, 4 wide and 5 tall, its bottom row in the ground (in rock the body digs the site out first)' });
        if (lastPortal && !lastPortal.complete) options.push({ text: 'take back the obsidian of the frame that failed: portal dismantle', hint: { skill: 'portal', args: { action: 'dismantle' } } });
        options.push({ text: 'place the frame yourself, block by block (place obsidian: 4 wide, 5 tall, corners optional)' });
        return { text: `the frame does not go up${words ? ` (the last one said: ${words})` : ''}`, options };
      }
      return { text: words ? `the last one said: ${words}` : 'nothing changed', options: [{ text: 'change the plan: a different spot, a different skill or a different order' }] };
    },
    /** The number of Muse's call now (the MCP layer counts them): when a rule is set. */
    noteCall: (n) => care?.noteCall?.(n),
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
      if (s.position) {
        arrivals[dim] = { pos: floorPos(s.position), at: Date.now() };
        const key = frameKey(dim, floorPos(s.position));
        returns.set(key, new Set([...(returns.get(key) ?? []), gameId]));
        savePortals(config, server);
      }
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
      // obsidian next to a lit portal is its frame: the state says so, and counts and points at the other obsidian
      // only (gd7540a: "obsidian (nearest at 395 91 -65)" read as a deposit, two walks back to another player's portal)
      const obs = scan.blocks.find((b) => b.name === 'obsidian');
      if (obs && scan.blocks.some((b) => b.name === 'nether_portal')) {
        const data = await rpc('view_blocks', { find: { block_names: ['obsidian', 'nether_portal'], limit: 64 } }, 10_000).catch(() => null);
        const finds = data?.result?.blocks?.find;
        if (Array.isArray(finds)) {
          const listOf = (name) => finds.find((f) => f?.name === name)?.listed ?? [];
          const portalAt = new Set(listOf('nether_portal').map(floorPos).map((q) => `${q.x},${q.y},${q.z}`));
          const all = listOf('obsidian').map(floorPos);
          const free = all.filter((q) => !litFrameCell(q, portalAt));
          const inFrames = all.length - free.length;
          if (inFrames && !free.length) Object.assign(obs, { note: 'a lit portal\'s frame: never taken' });
          else if (inFrames) Object.assign(obs, { count: Math.max(1, obs.count - inFrames), nearest: free[0], note: `and ${inFrames} in a lit portal's frame, never taken` });
        }
      }
      // the portal it came out of, as a real portal block: where it stood when the change of dimension was seen may be a
      // step off it (a staging bench, 2026-10-12: the way back aimed at air)
      const here = dimension ?? 'overworld';
      const a = arrivals[here];
      const lit = scan.blocks.find((b) => b.name === 'nether_portal');
      if (a && lit && !a.portal && Math.hypot(lit.nearest.x - a.pos.x, lit.nearest.y - a.pos.y, lit.nearest.z - a.pos.z) <= 6) {
        a.pos = { ...lit.nearest };
        a.portal = true;
        care?.arrived(here, a.pos);
      }
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
      doing: doing && progress ? `${doing} (${progress})` : doing,
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
    health: latest.health,
    hostiles: [...(status?.nearby?.hostiles ?? []), ...(status?.nearby?.mobs ?? [])].filter((m) => m.kind === 'hostile').map((m) => ({ name: m.name, distance: m.nearest?.distance ?? 999 })),
    furnace: (() => { const f = scan.blocks.find((b) => b.name === 'furnace'); return f && latest.position && dist(f.nearest, latest.position) <= STATION_RADIUS ? f.nearest : null; })(),
    policyRevision,
    maxTravel: config.body?.maxTravel ?? 256,
    spawn: spawnAt,
    players: (status?.nearby?.players ?? []).map((p) => ({ position: p?.position ?? null })), // never their names
    gameId,
    containerOwner: (pos) => containers.get(keyOf(pos)) ?? null,
    lastBuild,
    lastDeath: status?.lastDeath ?? null,
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
    const actAt = Date.now(); // the submission (a stall counts from here)
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
    let cancelledAt = 0;
    // self: a cancel of our own making that is not a stop (an attack whose mob died)
    const cancel = async (why, { self = false } = {}) => {
      if (cancelled || !ctl.actionId) return;
      cancelled = true;
      cancelledAt = Date.now();
      if (!self) ctl.stopped ??= why;
      await rpc('cancel_foreground_action', { action_id: ctl.actionId, reason: String(why).slice(0, 200) });
    };
    ctl.cancel = cancel;
    const deaths = (d) => Number(d?.progress?.request?.evidence?.checkpoint?.targetDeathsObserved) || 0;
    // a search for obsidian that brings none in for OBSIDIAN_STALL_MS is stopped and said why (production game g0a414c:
    // "pending, 0 of 1" for 100 s a call, three calls in a row, while formed obsidian lay beside the bot)
    const watch = call.tool === 'collect_block' && call.args?.block_name === 'obsidian' && call.args?.x === undefined;
    let gainedN = 0;
    let gainedAt = actAt;
    while (data.state === 'accepted' || data.state === 'pending') {
      ctl.actionId ??= data.actionId;
      // how far it got, as their checkpoint says (get_state shows it while a long step runs: F2 of the log hunt)
      const cp = data.progress?.request?.evidence?.checkpoint;
      if (cp && typeof cp === 'object') {
        progress = progressWords(cp);
        // the live sub-step for the video, when its words change
        const sub = subStepOf(call.tool, call.args, cp);
        const key = JSON.stringify(sub);
        if (key !== lastSub) { lastSub = key; emit('progress', { sub, skill: ctl.skill ?? null }); }
      }
      if (watch && !cancelled) {
        const g = Number(cp?.gained ?? cp?.collected ?? 0) || 0;
        if (g > gainedN) { gainedN = g; gainedAt = Date.now(); } else if (Date.now() - gainedAt > obsidianStallMs) { ctl.stalled = { mined: gainedN }; await cancel(`no obsidian came in for ${Math.round(obsidianStallMs / 1000)} s`); }
      }
      if (ctl.attack && !cancelled && deaths(data) > 0) { ctl.killed = deaths(data); await cancel(KILLED, { self: true }); }
      else if (ctl.stopped) await cancel(ctl.stopped);
      else if (left() <= 0) await cancel(`timed out after ${Math.round((ctl.limitMs ?? timeouts[ctl.skill] ?? 60_000) / 1000)} s`);
      // cancelled and still not ended after the grace: the step ends here (F8)
      if (cancelled && Date.now() - cancelledAt >= cancelGraceMs) {
        if (lastSub !== 'null') { lastSub = 'null'; emit('progress', { sub: null }); }
        return { output: { action: call.tool, result: { status: 'cancelled' } }, stopped: ctl.stopped, lingered: true };
      }
      const ms = cancelled ? Math.max(1_000, Math.min(15_000, cancelGraceMs - (Date.now() - cancelledAt))) : ctl.attack ? Math.max(500, Math.min(ATTACK_POLL_MS, waitFor())) : watch ? Math.max(1_000, Math.min(5_000, waitFor())) : Math.max(1_000, waitFor());
      data = await rpc('wait_for_action', { action_id: ctl.actionId, timeout_ms: ms }, ms + RPC_SLACK_MS);
    }
    if (lastSub !== 'null') { lastSub = 'null'; emit('progress', { sub: null }); }
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

  /**
   * The nearest place to stand around a point a walk could not end at: a cell with room for the bot (two cells free)
   * over a solid block, from two boxes around it (the point's height and 7 below), or null.
   */
  async function standNear(t) {
    const at = new Map();
    for (const y of [t.y, t.y - 7]) {
      const data = await rpc('view_blocks', { box: { x: t.x, y, z: t.z, half_width: 4, half_height: 3 } }, 10_000).catch(() => null);
      const box = data?.result?.blocks?.box;
      if (!box?.layers) continue;
      for (const layer of box.layers) for (const row of layer.rows) row.blocks.forEach((name, i) => { at.set(`${box.center.x - box.halfWidth + i},${layer.y},${row.z}`, name); });
    }
    const free = (n) => n !== undefined && REPLACEABLE.test(n);
    const solid = (n) => n !== undefined && n !== 'unloaded' && !REPLACEABLE.test(n) && !/^(water|lava|bubble_column)$|_leaves$/.test(n);
    let best = null;
    for (const [key, name] of at) {
      const [x, y, z] = key.split(',').map(Number);
      if (!free(name) || !free(at.get(`${x},${y + 1},${z}`)) || !solid(at.get(`${x},${y - 1},${z}`))) continue;
      const d = Math.hypot(x - t.x, y - t.y, z - t.z);
      if (!best || d < best.d) best = { x, y, z, d };
    }
    return best ? { x: best.x, y: best.y, z: best.z } : null;
  }

  /** The smelt calls from i on, at the furnace a cut-short smelt left standing within 6 blocks (none carried any more). */
  async function smeltAtLeftFurnace(calls, i) {
    await refresh().catch(() => {});
    if ((latest.inventory?.furnace ?? 0) > 0 || !latest.position) return;
    const data = await rpc('view_blocks', { find: { block_names: ['furnace'], limit: 1 } }, 10_000).catch(() => null);
    const at = data?.result?.blocks?.find?.[0]?.listed?.[0];
    if (!at || dist(at, latest.position) > 6) return;
    const pos = floorPos(at);
    for (let k = i; k < calls.length; k++) {
      if (calls[k].tool !== 'smelt_item' || !calls[k].args?.temporary_workstation) continue;
      const { temporary_workstation: _t, ...rest } = calls[k].args;
      calls[k] = { ...calls[k], args: { ...rest, x: pos.x, y: pos.y, z: pos.z } };
    }
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
    const seen = new Map(); // "x,y,z" -> block name, from the boxes
    for (const y of [Math.min(...ys), Math.max(...ys)]) {
      const data = await rpc('view_blocks', { box: { x: mid.x, y, z: mid.z, half_width: 4, half_height: 3 } }, 10_000).catch(() => null);
      const box = data?.result?.blocks?.box;
      if (!box?.layers) return { ok: false, result: 'the blocks where the portal frame would stand could not be read; try again in a moment, or a little way off', code: 'FAILED', delta: {} };
      for (const layer of box.layers) for (const row of layer.rows) row.blocks.forEach((name, i) => {
        seen.set(`${box.center.x - box.halfWidth + i},${layer.y},${row.z}`, name);
        if (name === 'unloaded') liquid.push({ name, x: box.center.x - box.halfWidth + i, y: layer.y, z: row.z });
        else if (name === 'lava' || name === 'water') liquid.push({ name, x: box.center.x - box.halfWidth + i, y: layer.y, z: row.z });
      });
    }
    const unloaded = liquid.find((b) => b.name === 'unloaded');
    if (unloaded) return { ok: false, result: `the ground around where the portal frame would stand is not loaded yet (${unloaded.x} ${unloaded.y} ${unloaded.z}); try again in a moment`, code: 'FAILED', delta: {} };
    const near = liquid.sort((a, b) => (a.name === 'lava' ? -1 : 1) - (b.name === 'lava' ? -1 : 1))[0];
    // a frame cut into rock: their build keeps a frame cell its dig is refused, and the obsidian placed is spent (F7 of
    // the log hunt: three frames in deepslate and tuff each used 10 or 11 obsidian for nothing); the bottom row is meant
    // to be in the ground
    if (!near) {
      // what stands where the frame and its inside go: the body clears it first, cell by cell, before any obsidian is
      // placed (production game g809e1b, 2026-10-13: 8 builds failed on a hillside and in trees, "cut into rock",
      // "2 cells kept the stone and dirt", "cells hold oak_leaves", and the game ran out; their build keeps a cell its
      // own dig is refused, so the obsidian placed was spent). A frame cell that already holds obsidian stays.
      const clear = cells.map((c) => ({ x: c.x, y: c.y, z: c.z, frame: c.block_name !== 'air', name: seen.get(`${c.x},${c.y},${c.z}`) }))
        .filter((c) => c.name && !REPLACEABLE.test(c.name) && !(c.frame && c.name === 'obsidian'));
      return clear.length ? { clear } : null;
    }
    return { ok: false, result: `${near.name} at ${near.x} ${near.y} ${near.z} is next to where the portal frame would stand: build it on dry ground away from lava and water (go_to a spot with flat ground and open sky first)`, code: near.name === 'lava' ? 'LAVA' : 'FAILED', delta: {} };
  }

  /**
   * collect obsidian, before it runs (the safety review of M8a): only in the Overworld; never while another game's
   * obsidian (a frame), or a lit portal, is loaded near by (their collect mines any loaded obsidian); and only with lava
   * within LAVA_NEAR blocks to make it from, away from the world spawn and from other players (their collect pours
   * water there, unguarded). Null when it may run.
   */
  /**
   * Obsidian loaded within r blocks of the bot that is not a frame (a lit portal's, or another game's or its own last
   * frame): nearest first, [{x, y, z, d}].
   */
  async function formedObsidian(r) {
    const p = latest.position;
    if (!p) return [];
    const data = await rpc('view_blocks', { find: { block_names: ['obsidian', 'nether_portal'], limit: 64 } }, 10_000).catch(() => null);
    const finds = data?.result?.blocks?.find ?? [];
    const listOf = (name) => (finds.find((f) => f?.name === name || f?.block === name)?.listed ?? (name === 'obsidian' ? finds[0]?.listed : finds[1]?.listed) ?? []);
    const portalAt = new Set(listOf('nether_portal').map((q) => `${q.x},${q.y},${q.z}`));
    const touchesPortal = (q) => litFrameCell(q, portalAt);
    const mine = new Set((lastPortal?.cells ?? []).map((c) => `${c.x},${c.y},${c.z}`));
    const dim = dimension ?? 'overworld';
    return listOf('obsidian').map(floorPos)
      .filter((q) => !touchesPortal(q) && !mine.has(`${q.x},${q.y},${q.z}`) && !frames.has(frameKey(dim, q)))
      .map((q) => ({ ...q, d: Math.hypot(q.x + 0.5 - p.x, q.y - p.y, q.z + 0.5 - p.z) }))
      .filter((q) => q.d <= r).sort((a, b) => a.d - b.d);
  }

  /**
   * Why a collect of obsidian makes no progress, in words with what else to do (the stall watchdog's reply, and the
   * stuck advice): the nearest formed obsidian and what is around it (water over it, lava beside it), the nearest
   * still lava pool, and a frame from 10.
   */
  async function obsidianStuck(mined = 0) {
    const p = latest.position ? floorPos(latest.position) : null;
    const near = await formedObsidian(12).catch(() => []);
    const have = allItems(latest.inventory, latest.equipment).obsidian ?? 0;
    const parts = [];
    const options = [];
    const q = near[0];
    if (q) {
      const box = await rpc('view_blocks', { box: { x: q.x, y: q.y, z: q.z, half_width: 1, half_height: 1 } }, 10_000).catch(() => null);
      const seen = new Map();
      const b = box?.result?.blocks?.box;
      for (const layer of b?.layers ?? []) for (const row of layer.rows) row.blocks.forEach((name, i) => seen.set(`${b.center.x - b.halfWidth + i},${layer.y},${row.z}`, name));
      const at = (dx, dy, dz) => seen.get(`${q.x + dx},${q.y + dy},${q.z + dz}`);
      const beside = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      const water = at(0, 1, 0) === 'water' || beside.some(([dx, dy, dz]) => at(dx, dy, dz) === 'water');
      const lava = beside.concat([[0, 1, 0], [0, -1, 0]]).some(([dx, dy, dz]) => at(dx, dy, dz) === 'lava');
      parts.push(`the nearest formed obsidian is at ${q.x} ${q.y} ${q.z}, ${Math.round(q.d)} blocks away${water ? ', under or beside water (the water poured did not all go back into the bucket)' : ''}${lava ? ', with lava beside it' : ''}`);
      if (water) options.push({ text: `scoop the water: bucket fill water at ${q.x} ${q.y + 1} ${q.z}, then collect obsidian again`, hint: { skill: 'bucket', args: { action: 'fill', liquid: 'water', pos: { x: q.x, y: q.y + 1, z: q.z } } } });
      const side = beside.map(([dx, , dz]) => ({ x: q.x + dx, y: q.y, z: q.z + dz })).find((c) => !['lava', 'water'].includes(at(c.x - q.x, 0, c.z - q.z)));
      if (side) options.push({ text: `stand right beside it: go_to ${side.x} ${side.y} ${side.z}, then collect obsidian 1`, hint: { skill: 'go_to', args: side } });
    } else parts.push('no formed obsidian is loaded within 12 blocks');
    const data = await rpc('view_blocks', { find: { block_names: ['lava'], limit: 64 } }, 10_000).catch(() => null);
    const pools = p ? lavaPools(data?.result?.blocks?.find?.[0]?.listed ?? [], p) : [];
    // the pool here first: their cast gives up on a pool it cannot reach from where it stands; then the next one
    const here = pools.find((q) => q.d <= 16);
    if (here) parts.push(`${poolWords(here)} is here, but no obsidian came from it (their pour could not reach it from where it stood)`);
    if (!((latest.inventory?.water_bucket ?? 0) > 0)) parts.push((latest.inventory?.bucket ?? 0) > 0 ? 'your bucket is empty (the last pour was not scooped back): collect obsidian fills it from the nearest water first' : 'no water bucket is carried');
    const pool = pools.find((q) => q.d > 16 && q.sources >= 2) ?? pools.find((q) => q.d > 16);
    if (pool) options.push({ text: `make more at ${poolWords(pool)}: go_to a spot a few blocks from it, then collect obsidian`, hint: { skill: 'go_to', args: { x: pool.x + 3, y: pool.y + 1, z: pool.z } } });
    if (have >= 10) options.push({ text: `build nether_portal now: ${have} obsidian is enough when you carry 2 other blocks (cobblestone, dirt) for its top corners`, hint: { skill: 'build', args: { blueprint: 'nether_portal', material: 'obsidian' } } });
    return { text: `no obsidian came in${mined ? ` after the first ${mined}` : ''}: ${parts.join('; ')}`, options };
  }

  async function obsidianGuard(want = 1) {
    const refuse = (result, code = 'FAILED') => ({ ok: false, result, code, delta: {} });
    const p = latest.position;
    if ((dimension ?? 'overworld') !== 'overworld') return refuse('obsidian is made and collected in the Overworld only (in the Nether it would take portal frames, yours included)');
    if (!p) return refuse('the body does not know where it stands yet; try again in a moment');
    const other = othersObsidian(p, FRAME_GUARD)[0];
    if (other) return refuse(`another player's obsidian (a portal frame) is at ${other.x} ${other.y} ${other.z}, within ${FRAME_GUARD} blocks: collect obsidian could take it. Go farther away first`);
    // a lit portal loaded now (read fresh: the scan of the blocks around is up to a few seconds old)
    const seenLit = await rpc('view_blocks', { find: { block_names: ['nether_portal'], limit: 1 } }, 10_000).catch(() => null);
    const litNow = seenLit?.result?.blocks?.find?.[0]?.listed?.[0] ?? null;
    const lit = litNow ? { nearest: floorPos(litNow) } : scan.blocks.find((b) => b.name === 'nether_portal');
    // a lit portal's frame is never taken (runtime patch 0014: their search skips obsidian touching a portal block; the
    // owner, 2026-10-13, after g71c9f5 mined the shared return portal): said in the reply, and the obsidian comes from
    // lava or other obsidian
    let litNote = null;
    if (lit) {
      const q = lit.nearest;
      const far = Math.round(Math.hypot(q.x - p.x, q.z - p.z));
      const whose = knownReturn('overworld', q) ? 'the portal Nether trips on this server come back to' : 'a lit portal';
      litNote = `${whose} at ${q.x} ${q.y} ${q.z} (${far} blocks away) is loaded: its frame was left alone, the obsidian comes from lava or other obsidian`;
      event('portal_spared', { at: floorPos(q), far });
    }
    // still lava (a source, level 0) is what obsidian forms from: flowing lava near by does not count, and their collect
    // would walk to the nearest source anywhere (F2 of the log hunt: accepted at the surface next to flowing lava, it
    // walked 95 blocks out and 120 down for 315 s; refused deep down with no source near)
    const data = await rpc('view_blocks', { find: { block_names: ['lava'], limit: 64 } }, 10_000).catch(() => null);
    if (!data?.result?.blocks) return refuse('the blocks around could not be read; try again in a moment');
    const listed = data.result.blocks.find?.[0]?.listed ?? [];
    const away = (l) => Math.hypot(l.x - p.x, l.y - p.y, l.z - p.z);
    const near = listed.filter((l) => away(l) <= LAVA_NEAR);
    const lava = near.filter((l) => !Number.isFinite(l.level) || l.level === 0).map(floorPos);
    // where the nearest pool is, when one is loaded farther away: the player can walk there (a staging bench, 2026-10-12:
    // lava listed in sight, but no pool within 16 blocks, and nothing said where one was)
    // pools as their cast groups them, with how many sources each has: one big enough for what is asked first, so the
    // walk goes to a pool that can give it (production game g2409ce, 2026-10-14: three pools in turn, 12 minutes)
    const pools = lavaPools(listed, floorPos(p));
    const enough = pools.find((q) => q.sources >= Math.min(want, 8));
    const pool = enough ?? pools[0];
    const there = pool ? ` The nearest lava pool loaded is at ${pool.x} ${pool.y} ${pool.z}, ${pool.d} blocks away (${poolSize(pool)}${pool !== pools[0] ? `; a nearer one at ${pools[0].x} ${pools[0].y} ${pools[0].z} has only ${pools[0].sources}` : ''}): go_to a spot a few blocks from it first.` : '';
    // the obsidian in sight is a lit frame's (gd7540a: Muse came back to it as "the obsidian deposit"): said first
    const litFirst = lit ? `the obsidian at the lit portal at ${lit.nearest.x} ${lit.nearest.y} ${lit.nearest.z} is its frame and is never taken; ` : '';
    if (!lava.length && near.length) return refuse(`${litFirst}the lava within ${LAVA_NEAR} blocks is flowing, not a pool: obsidian forms on still lava.${there || ' Go next to a lava pool first (get_state lists lava among the nearby blocks).'}`, 'LAVA');
    if (!lava.length) return refuse(`${litFirst}no lava pool within ${LAVA_NEAR} blocks to make obsidian from.${there || ' Go next to one first (get_state lists lava among the nearby blocks; deep caves below y -54 have the most).'}`, 'LAVA');
    if (spawnAt && lava.some((l) => Math.hypot(l.x - spawnAt.x, l.z - spawnAt.z) <= SPAWN_GUARD)) return refuse(`the lava near by is within ${SPAWN_GUARD} blocks of the world spawn, where new players arrive: make obsidian somewhere else`, 'LAVA');
    const players = (status?.nearby?.players ?? []).map((x) => x?.position).filter(Boolean);
    if (players.some((q) => lava.some((l) => Math.hypot(q.x - l.x, q.y - l.y, q.z - l.z) <= 8))) return refuse('another player is next to the lava near by: make obsidian somewhere else', 'LAVA');
    return litNote ? { note: litNote } : null;
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

  /** The crafting table a cut-short craft left standing next to the bot (within 5 blocks): mined back. */
  async function tableBack() {
    const data = await rpc('view_blocks', { find: { block_names: ['crafting_table'], limit: 1 } }, 10_000).catch(() => null);
    const at = data?.result?.blocks?.find?.[0]?.listed?.[0];
    const p = latest.position;
    if (!at || !p || Math.hypot(at.x - p.x, at.y - p.y, at.z - p.z) > 5) return null;
    const pos = floorPos(at);
    const out = await act({ tool: 'collect_block', args: { block_name: 'crafting_table', ...pos } }, Date.now() + 30_000, { stopped: null, actionId: null }).catch(() => null);
    await refresh().catch(() => {});
    return { at: pos, back: out?.output?.result?.status === 'succeeded' };
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

  async function run(tool, args, meta = null) {
    let t0 = Date.now();
    if (ended) return { ok: false, result: 'not connected to the game', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (!body.connected) return { ok: false, result: 'not in the game yet', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (host?.restarting) return { ok: false, result: 'the body is being started again after it stopped; send the step again in a few seconds', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (body.busy) return { ok: false, result: `busy: ${doing ?? 'a skill'} is still running`, delta: {}, ms: 0 };
    care?.playerCalled();
    const v = MINEAI_SKILLS.validate(tool, args ?? {});
    if (!v.ok) return { ok: false, result: `bad arguments: ${v.error}`, delta: {}, ms: 0, code: 'BAD_ARGS' };
    body.busy = true;
    doing = describeCall(tool, v.args);
    progress = null;
    const ctl = { skill: tool, actionId: null, stopped: null, cancel: null, attack: null, killed: 0 };
    current = ctl;
    emit('skill', { phase: 'start', tool, args: v.args });
    // the body may be looking after itself (src/mineai/care.js): that stops for the step at once, except a recovery of
    // the items a death dropped (they despawn), which finishes first; the step's time starts after it
    const yielded = await care?.yield(careYieldMs ? { maxMs: careYieldMs } : {}).catch(() => null);
    if (yielded === 'recover') t0 = Date.now();
    // what it did on its own has not let go of the body yet: refused, never run beside it (two actions at once: their
    // runtime answers the second with ACTION_BUSY; a local check, 2026-10-12)
    if (care?.busy()) {
      body.busy = false; doing = null; current = null;
      const out = { ok: false, result: `busy: the body is still finishing what it did on its own (${care.now() ?? 'its own step'}); send the step again in a few seconds`, delta: {}, ms: Date.now() - t0, code: 'FAILED' };
      emit('skill', { phase: 'end', tool, args: v.args, ...out });
      return out;
    }
    let r;
    // the inventory change is counted from here: carried and worn (an equip moves an item, it does not lose it); a
    // status read that fails keeps the copy from before, never an empty one
    let before = allItems(latest.inventory, latest.equipment);
    // what the step's actions themselves used and made, from their evidence (ownChange); null: it cannot be told apart
    // from what else changed meanwhile (then the reply shows only the whole change)
    let own = null;
    const killed = {}; // mob -> kills of this step (hunt, attack), for the step's result and the goal's count
    let deathBefore = lastDeath;
    let built = null; // a build's structure (toTheirs), remembered below while it is incomplete
    let dismantling = false; // portal dismantle: its own frame's obsidian back
    let reclaimed = null; // an unfinished frame's cells taken back for a new frame (below)
    let skipped = null; // the last optional call that did not work, in words
    const notThere = []; // dismantle: frame cells that held another block, not obsidian (nothing to take back there)
    let refusedFirst = false; // refused before anything ran: not an action of the player's (F10 of the log hunt)
    const crashesBefore = crashes;
    // the runtime stopped during this step: the host starts it again once per game, and a second stop ends the game
    // (src/mineai/host.js). The step may be what stopped it (2026-10-08, before patch 0010: a build around the bot in a pocket in stone
    // stopped the runtime's event loop every time), so the reply never asks for the same step at the same spot
    const restartText = (why) => `the body stopped in the middle of this step (${why}) and is being started again (code BODY_RESTARTED). This step may be what stopped it: do not send it again from here${tool === 'build' ? '; build in the open instead (go_to a spot a few blocks away with open sky and flat ground, then build)' : ''}. The body is started again once per game: a second stop ends the game. Call get_state in a few seconds, then go on`;
    try {
      await refresh();
      before = allItems(latest.inventory, latest.equipment);
      deathBefore = lastDeath;
      // the way back without a pos: the nearest portal block itself (never a cell next to it)
      if (tool === 'portal' && v.args.action === 'enter' && !v.args.pos && (dimension ?? 'overworld') !== 'overworld' && arrivals[dimension] && !arrivals[dimension].portal) {
        const data = await rpc('view_blocks', { find: { block_names: ['nether_portal'], limit: 1 } }, 10_000).catch(() => null);
        const b = data?.result?.blocks?.find?.[0]?.listed?.[0];
        const a = arrivals[dimension];
        if (b && Math.hypot(b.x - a.pos.x, b.y - a.pos.y, b.z - a.pos.z) <= 6) { a.pos = floorPos(b); a.portal = true; care?.arrived(dimension, a.pos); }
      }
      const plan = toTheirs(tool, v.args, context());
      built = plan.build ?? null;
      dismantling = Boolean(plan.dismantle);
      // the body's own care knobs (policy skill): kept here, never sent to the runtime
      const careText = plan.care ? (() => {
        const knobs = care?.setPolicy(plan.care === 'reset' ? null : plan.care);
        if (careMode === 'advise' && care?.setRules) {
          // Muse's rules (the owner, 2026-10-13): no arguments turn them all off
          const k = plan.care === 'reset' ? null : plan.care;
          const onOff = (v) => (v === undefined ? undefined : v === 'on');
          // set with this play call (its number, as the HUD and the replies number play calls) at the time it was sent
          const r = care.setRules(k ? { defend: onOff(k.defend), flee: onOff(k.flee), escape: onOff(k.escape), eat_below: k.eat_below ?? (k.eat ? { hungry: 14, starving: 4, off: 0 }[k.eat] : undefined) } : { defend: false, flee: false, escape: false, eat_below: 0 },
            Number.isInteger(meta?.call) ? { call: meta.call, at: meta.at ?? null } : undefined);
          return `; your rules now: ${describeRules(r)}`;
        }
        return `; its reflexes: ${describeReflexes(knobs, careMode)}${careMode === 'full' ? `; on its own between your calls: ${describeCare(knobs)}` : ''}`;
      })() : '';
      if (!plan.refused && tool === 'build' && v.args.blueprint === 'nether_portal' && plan.build) {
        const site = await portalSite(plan.build.cells);
        if (site?.clear) {
          // the frame's cells cleared first (dug out with the best tool carried); a cell that will not clear stops the
          // build before any obsidian is placed
          plan.calls = [...site.clear.map((c) => ({ tool: 'collect_block', args: { block_name: c.name, x: c.x, y: c.y, z: c.z }, quiet: true, clearing: true })), ...plan.calls];
          const kinds = [...new Set(site.clear.map((c) => c.name))];
          plan.note = `${plan.note ? `${plan.note}; ` : ''}cleared ${plural(site.clear.length, 'cell')} of ${kinds.join(' and ')} for it first`;
        } else plan.refused = site;
        // an unfinished frame of this game's within reach that this build does not continue (its site was bad): its
        // obsidian is taken back first and goes into this one, never a second frame beside it (production game
        // g2409ce, 2026-10-14: a new frame facing south beside the 17-of-18 one, the last 3 obsidian spent on it)
        const old = lastPortal;
        const feetNow = latest.position ? floorPos(latest.position) : null;
        const fresh = plan.build !== lastBuild;
        if (!plan.refused && fresh && old && !old.complete && old.dimension === (dimension ?? 'overworld') && feetNow && old.cells?.length
          && old.cells.some((c) => Math.hypot(c.x - feetNow.x, c.z - feetNow.z) <= CONTINUE_RADIUS && Math.abs(c.y - feetNow.y) <= 6)) {
          const newCells = new Set(plan.build.cells.filter((c) => c.block_name === 'obsidian').map((c) => `${c.x},${c.y},${c.z}`));
          const takeBack = old.cells.filter((c) => !newCells.has(`${c.x},${c.y},${c.z}`));
          if (takeBack.length) {
            plan.calls = [...takeBack.map((c) => ({ tool: 'collect_block', args: { block_name: 'obsidian', x: c.x, y: c.y, z: c.z }, optional: true, quiet: true, reclaim: true })), ...plan.calls];
            plan.note = `${plan.note ? `${plan.note}; ` : ''}took back the obsidian of your unfinished frame at ${old.frame.x} ${old.frame.y} ${old.frame.z} first (its site would not do)`;
            reclaimed = takeBack;
            plan.timeoutMs = Math.max(plan.timeoutMs ?? timeouts.build ?? 60_000, 60_000 + 10_000 * takeBack.length);
          }
        }
      }
      if (!plan.refused && tool === 'collect' && v.args.block === 'obsidian') {
        const g = await obsidianGuard(v.args.n);
        if (g?.note) plan.note = `${plan.note ? `${plan.note}; ` : ''}${g.note}`;
        else if (g?.code === 'LAVA' && /(^|; )(no lava pool within|the lava within \d+ blocks is flowing)/.test(g.result)) {
          // no pool near, but obsidian already formed beside the bot (not a frame): that much is mined at its cells,
          // with no search (the pre-launch sweep: a LAVA refusal stood between the bot and obsidian lying beside it)
          const near = await formedObsidian(6);
          if (near.length) {
            const n = Math.min(v.args.n, near.length);
            plan.calls = near.slice(0, n).map((c) => ({ tool: 'collect_block', args: { block_name: 'obsidian', x: c.x, y: c.y, z: c.z } }));
            plan.note = `${plan.note ? `${plan.note}; ` : ''}mined the obsidian already formed beside you${n < v.args.n ? ` (${n} of the ${v.args.n}: the rest needs a lava pool: ${g.result})` : ''}`;
            plan.formedOnly = true;
          } else plan.refused = g;
        } else if (g) plan.refused = g;
        // obsidian already formed next to the bot: mined at its own cells first (production game g0a414c, 2026-10-13:
        // standing by formed obsidian, the search walked off to targets it could not reach, 0 of 1 for 9 minutes);
        // the search makes the rest (a step of its own, counted from what the cells gave)
        if (!plan.refused && !plan.formedOnly) {
          const near = await formedObsidian(6);
          if (near.length) {
            const n = v.args.n;
            const exact = near.slice(0, n).map((c) => ({ tool: 'collect_block', args: { block_name: 'obsidian', x: c.x, y: c.y, z: c.z }, optional: true }));
            plan.calls = [...exact, ...plan.calls.map((c, k) => (k === 0 ? { ...c, topUp: n } : { ...c, topUp: n, rest: true }))];
          }
        }
      }
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
      else if (plan.refused) { r = plan.refused; refusedFirst = true; }
      else if (!plan.calls?.length && plan.care) r = { ok: true, result: careText.replace(/^; /, ''), code: null };
      else {
        let deadline = t0 + (plan.timeoutMs ?? timeouts[tool] ?? 60_000);
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
          let call = calls[i];
          if (ctl.stopped) break;
          ctl.actionId = null;
          // a search after the exact cells: only for what they did not give
          if (call.topUp) {
            await refresh().catch(() => {});
            const got = (allItems(latest.inventory, latest.equipment)[call.args.block_name] ?? 0) - (before[call.args.block_name] ?? 0);
            const left = call.topUp - got;
            if (left <= 0) continue;
            if (call.rest) continue; // the first search call takes the rest (up to 32)
            call = { ...call, args: { ...call.args, count: Math.min(32, left) } };
          }
          // a craft's item counted before it: a craft a reflex cuts short may have made the item all the same
          let craftHad = null;
          if (call.tool === 'craft_item' && call.args?.items?.[0]) {
            await refresh().catch(() => {});
            const { item_name: item, count } = call.args.items[0];
            // carried and worn: a fresh shield goes to the off-hand when their guard reflex takes it (F1 of the log hunt)
            craftHad = { item, count: Number(count) || 1, have: allItems(latest.inventory, latest.equipment)[item] ?? 0, tables: latest.inventory?.crafting_table ?? 0 };
          }
          // a pause of ours between their calls (a portal's cooldown)
          if (call.tool === 'wait') { await new Promise((r) => { setTimeout(r, Math.min(call.ms ?? 1_000, Math.max(0, deadline - Date.now()))); }); continue; }
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
          if (out.lingered) res = { ...res, result: `${res.result} (it had not let go ${Math.round(cancelGraceMs / 1000)} s after being stopped: it is stopped again before your next step)` };
          // a walk into open air (production game g0842ff, 2026-10-14: go_to straight down to y -8 twice over a big
          // cavern, "no ground within 64 blocks below it"): the nearest place to stand there, read around the target
          if (!res.ok && call.tool === 'navigate' && Number.isFinite(call.args?.x) && /no ground within \d+ blocks below it/.test(res.result)) {
            const spot = await standNear(call.args).catch(() => null);
            res = { ...res, result: spot
              ? `${res.result}; the nearest place to stand near there: go_to ${spot.x} ${spot.y} ${spot.z}`
              : `${res.result}; around there is open air or liquid as far as can be seen: aim at a cave floor you can see, or let collect walk to its target (it finds a way down by itself)` };
          }
          // a collect whose time ran out as its last block came in: done (g2409ce: "timed out after 340 s" with all 11
          // obsidian in)
          if (!res.ok && res.code === 'TIMED_OUT' && call.tool === 'collect_block' && !Number.isInteger(call.args?.x)) {
            const got = Number(out.output?.result?.collected?.gained) || 0;
            if (got >= (Number(call.args?.count) || 1)) res = { ok: true, code: null, result: `${doneSoFar(call.tool, out.output, call) ?? `collected ${got}`} (its time ran out as it finished)`, theirs: res.theirs };
          }
          // the obsidian search that brought nothing in: why, and what else to do, at once
          if (ctl.stalled && !res.ok) {
            const why = await obsidianStuck(ctl.stalled.mined).catch(() => null);
            res = { ok: false, code: 'FAILED', result: `${why?.text ?? `no obsidian came in for ${Math.round(obsidianStallMs / 1000)} s`}.${why?.options?.length ? ` Instead: ${why.options.map((o) => o.text).join('; or ')}` : ''}`, theirs: res.theirs };
            ctl.stalled = null;
            ctl.stopped = null;
          }
          // their entry refuses a bot standing in the portal it just lit or came out of ("already occupies this nether_portal
          // after a recent arrival"); the game takes a bot through by itself once it has stood there long enough
          // (production game g71c9f5, 2026-10-13: enter failed, then the bot went through on its own while walking out).
          // Up to 8 s for that; else out of the opening, the game's cooldown, and in once more
          if (!res.ok && call.tool === 'enter_nether_portal' && /already occupies this nether_portal/i.test(`${res.result} ${res.theirs ?? ''}`) && !retried.has(`occupied:${i}`)) {
            retried.add(`occupied:${i}`);
            const was = dimension ?? 'overworld';
            for (let w = 0; w < 16 && (dimension ?? 'overworld') === was && !ctl.stopped; w++) { await new Promise((r) => { setTimeout(r, 500); }); await refresh().catch(() => {}); }
            if ((dimension ?? 'overworld') !== was) {
              const at = latest.position ? floorPos(latest.position) : null;
              res = { ok: true, result: `went through the portal at ${at ? `${at.x} ${at.y} ${at.z}` : 'its other side'} (the game took the bot through as it stood in the portal)`, code: null };
            } else if (!ctl.stopped) {
              const a = call.args;
              const [first, ...alts] = [[3, 0], [-3, 0], [0, 3], [0, -3]].map(([dx, dz]) => ({ x: a.x + dx, y: a.y, z: a.z + dz }));
              calls.splice(i + 1, 0, { tool: 'navigate', args: first, alts, optional: true, quiet: true }, { tool: 'wait', ms: 4_000, quiet: true }, call);
              parts.push({ ok: true, result: 'it was standing in the portal: stepped out of it to enter again after the game\'s cooldown', code: null });
              continue;
            }
          }
          // a placement the server did not confirm in time (their "Event blockUpdate ... did not fire within timeout"):
          // the same build once more at once; their audit works only the cells still wrong (g2409ce)
          if (!res.ok && call.tool === 'build_structure' && /did not fire within timeout|physical verification/i.test(`${res.result} ${res.theirs ?? ''}`) && !retried.has(`verify:${i}`) && !ctl.stopped) {
            retried.add(`verify:${i}`);
            parts.push({ ok: true, result: 'the server did not confirm one placement in time; the build went on at the same cells', code: null });
            i -= 1;
            continue;
          }
          // a cell of the portal's site that is no longer what the read before the build saw (production game gd7540a,
          // 2026-10-14: three frames in a row stopped at "The requested cell at 477,75,-7 is air, not stone", a cell
          // that was already clear, 3 s into the build, and the game ran out): a clear cell is what the dig was for, so
          // it counts as cleared; another solid block there (gravel or sand fallen in) is dug as that block, once
          if (!res.ok && call.clearing) {
            // the cell broke and nothing came of it (production game g0842ff, 2026-10-14: leaves drop nothing most of the
            // time, "Broke 1 matching block; inventory gained 0/1", and the first frame stopped there): it is clear
            const broke = Number(out.output?.result?.collected?.blocksBroken) || Number(/Broke (\d+) matching block/.exec(`${res.result} ${res.theirs ?? ''}`)?.[1]) || 0;
            if (broke >= 1) { own = null; continue; }
            const seenNow = /The requested cell at (-?\d+),\s*(-?\d+),\s*(-?\d+) is ([a-z_]+), not/i.exec(`${res.result} ${res.theirs ?? ''}`);
            if (seenNow && REPLACEABLE.test(seenNow[4])) { own = null; continue; }
            if (seenNow && !/^(water|lava|obsidian|bedrock)$/.test(seenNow[4]) && !retried.has(`clear:${i}`)) {
              retried.add(`clear:${i}`);
              calls[i] = { ...call, args: { ...call.args, block_name: seenNow[4] } };
              i -= 1;
              continue;
            }
          }
          // a cell of the portal's site that would not clear: nothing placed yet, said so
          if (!res.ok && call.clearing) res = { ...res, result: `could not clear the cell at ${call.args.x} ${call.args.y} ${call.args.z} (${call.args.block_name}) where the portal frame goes: ${res.result.replace(/^failed: /, '')}; no obsidian was placed. Build it a few blocks away, on open ground` };
          // their reflexes that acted during the call count as the body's own (F10 of the log hunt: in-step fights were in
          // no count, and the share of Muse's actions read too high)
          const inStep = [...new Set((out.output?.interruptions ?? []).map(String))];
          if (inStep.length) care?.reflexesInStep(inStep, tool);
          // one of their reflexes took the body over in the middle of the call (a production game, 2026-10-11: a
          // shield craft at night "failed: Equip an available shield before nearby hostiles require a guard" with the
          // shield made, and the steps after it were cancelled for nothing)
          const takeover = !res.ok && !out.error && !ctl.stopped ? reflexTakeover(res.result) : null;
          if (takeover && craftHad) {
            await refresh().catch(() => {});
            const gained = (allItems(latest.inventory, latest.equipment)[craftHad.item] ?? 0) - craftHad.have;
            if (gained >= craftHad.count) {
              own = null; // their evidence of the craft is cut short: the step's whole change is shown
              const offHand = latest.equipment?.['off-hand']?.name === craftHad.item;
              // the crafting table put down for the craft and left standing: taken back (it is the bot's own, a block
              // or two away), else said where it stands
              const table = (latest.inventory?.crafting_table ?? 0) < craftHad.tables ? await tableBack() : null;
              res = { ok: true, code: null, result: `crafted ${gained} ${craftHad.item}${offHand ? '; it is in your off-hand' : ''}; a reflex took the body over meanwhile (${takeover})${table?.back ? '; the crafting table put down for the craft was picked up again' : table?.at ? `; the crafting table put down for the craft stands at ${table.at.x} ${table.at.y} ${table.at.z}` : ''}` };
            }
          }
          // a collect whose blocks were all in when the reflex came (F4 of the log hunt: "failed: evade response" with
          // all 6 logs in the bag): done
          const collected = Number(out.output?.result?.collected?.gained) || 0;
          if (!res.ok && takeover && call.tool === 'collect_block' && collected >= (Number(call.args?.count) || 1)) {
            res = { ok: true, code: null, result: `${doneSoFar(call.tool, out.output, call) ?? `collected ${collected}`}; a reflex took the body over meanwhile (${takeover})` };
          }
          // a hitch of their temporary station (F6 of the log hunt: "the block appeared, but consumption of furnace was
          // not observed", "[WORKSTATION_NOT_RECOVERED] ... Observed 0 loaded crafting_table blocks" with nothing made; the
          // same step sent again a little later worked): once more, after a moment
          if (!res.ok && !takeover && !out.error && !ctl.stopped && ['craft_item', 'smelt_item'].includes(call.tool) && STATION_HITCH.test(String(out.output?.result?.error ?? '')) && !retried.has(i) && deadline - Date.now() > 15_000) {
            retried.add(i);
            await new Promise((r2) => { setTimeout(r2, 1_500); });
            await refresh().catch(() => {});
            parts.push({ ok: true, result: `the ${/furnace/.test(String(out.output?.result?.error)) ? 'furnace' : 'crafting table'} put down for it was not seen in place (a timing hitch); tried again`, code: null });
            i -= 1;
            continue;
          }
          // the step's time ran out while one of their reflexes had the body (a production game, 2026-10-12, g0793f1:
          // a bucket fill "timed out after 120 s" with a creeper fight in it): not a slow step but a cut-short one
          if (!res.ok && res.code === 'TIMED_OUT' && inStep.length && !ctl.stopped?.startsWith?.('stopped')) {
            if (RETRY_AFTER_REFLEX.has(call.tool) && !retried.has(i)) {
              retried.add(i);
              ctl.stopped = null;
              deadline = Date.now() + (plan.timeoutMs ?? timeouts[tool] ?? 60_000);
              parts.push({ ok: true, result: `time ran out while a reflex had the body (${reflexWords(inStep)}); tried again`, code: null });
              i -= 1;
              continue;
            }
            own = null;
            res = { ok: false, code: 'INTERRUPTED', result: `${doneSoFar(call.tool, out.output, call) ? `${doneSoFar(call.tool, out.output, call)}; ` : ''}the step's time ran out while a reflex had the body (${reflexWords(inStep)}); nothing is wrong with the step: send it again once the mobs are dealt with` };
          }
          // truly cut short: tried once more after the reflex let go (calls that can simply be sent again), else a
          // plain INTERRUPTED, leading with what was done, instead of a failure
          if (!res.ok && takeover) {
            if (RETRY_AFTER_REFLEX.has(call.tool) && !retried.has(i) && deadline - Date.now() > 10_000) {
              retried.add(i);
              await reflexSettled(Math.min(20_000, deadline - Date.now() - 5_000));
              // a smelt whose temporary furnace the reflex left standing (production game gd7540a, 2026-10-14: the try
              // again failed with "No furnace is carried for temporary use", the furnace on the ground beside it): the
              // try again, and the smelt calls after it, use that furnace
              if (!ctl.stopped && call.tool === 'smelt_item' && call.args?.temporary_workstation) await smeltAtLeftFurnace(calls, i);
              // a hunt or a collect goes on for what is still missing (what it got before the fight stays counted)
              let left = null;
              if (call.tool === 'collect_mob_drop' || (call.tool === 'collect_block' && !Number.isInteger(call.args?.x))) {
                const r0 = out.output?.result ?? {};
                const got = Number(call.tool === 'collect_mob_drop' ? r0.hunt?.gained : r0.collected?.gained) || 0;
                left = Math.max(0, (Number(call.args?.count) || 1) - got);
                if (left > 0 && got > 0) calls[i] = { ...call, args: { ...call.args, count: left } };
              }
              if (!ctl.stopped && left === 0) { own = null; res = { ...res, ok: true, code: null, result: `${doneSoFar(call.tool, out.output, call) ?? 'done'} (a reflex took the body over at the end: ${takeover})` }; }
              else if (!ctl.stopped) { parts.push({ ok: true, result: `a reflex took the body over (${takeover}); ${call.tool === 'collect_mob_drop' ? 'the hunt went on' : call.tool === 'collect_block' ? 'the collect went on' : 'tried again'} once it let go${left ? ` (${left} still to get)` : ''}`, code: null }); i -= 1; continue; }
            }
            if (!res.ok) {
              own = null;
              const sofar = doneSoFar(call.tool, out.output, call);
              res = { ok: false, code: 'INTERRUPTED', result: `${sofar ? `${sofar}; ` : ''}a reflex took the body over (${takeover}) before ${call.tool.replace(/_/g, ' ')} was done; nothing is wrong with the step: send it again once the mobs are dealt with` };
            }
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
          const victim = out.output?.result?.hunt?.mob ?? plan.attack ?? null;
          // the mobs ran out near the bot (advice to explore), or a hunt found some again
          if (call.tool === 'collect_mob_drop') {
            if (!res.ok && /^HUNT_(TARGET_NOT_LOADED|OBSERVATION_EXHAUSTED)$/.test(res.theirs ?? '')) care?.huntFoundNone?.(call.args.mob_name, latest.position);
            else if (kills > 0) care?.huntFound?.(call.args.mob_name);
          }
          if (kills > 0 && victim && /^[a-z_]{1,40}$/.test(victim)) killed[victim] = (killed[victim] ?? 0) + kills;
          ctl.killed = 0;
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
          if (!res.ok && call.optional) {
            // a try that may fail (a way out of a portal, a frame cell): the next call goes on
            const other = /is ([a-z_]+), not obsidian/.exec(res.result)?.[1];
            if (plan.dismantle && other) notThere.push(other);
            else skipped = res.result;
            continue;
          }
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
    // a frame that stopped on a placement the server did not confirm in time, or a cell it could not reach, is not a
    // bad site: the next build continues it (production game g2409ce, 2026-10-14: 17 of 18 cells stood after a
    // "blockUpdate did not fire" timeout, and the next build began a second frame facing south with the last 3 obsidian)
    const hiccup = /did not fire within timeout|physical verification|could not be reached|no way there was found|path search gave up/i.test(String(r.result ?? '')) && !/kept|water|lava|not a portal frame|could not clear/i.test(String(r.result ?? ''));
    if (built?.blueprint === 'nether_portal' && !r.ok && r.code !== 'NEED_ITEMS' && !hiccup) lastBuild = null;
    // the cells of an unfinished frame taken back for this one: free for anyone again
    if (reclaimed?.length) for (const c of reclaimed) frames.delete(frameKey(dimension ?? 'overworld', c));
    if (built?.blueprint === 'nether_portal' || (tool === 'place' && v.args.block === 'obsidian' && r.ok)) {
      // the obsidian this game put down (or may have): no other game's collect takes it, and dismantle takes it back
      const cells = tool === 'place' ? [v.args.pos] : built.cells.filter((c) => c.block_name === 'obsidian');
      for (const c of cells) frames.set(frameKey(dimension ?? 'overworld', c), gameId);
      savePortals(config, server);
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
      // the cells the build kept with another block in them hold no obsidian: said once, plainly (ga13a88: "not every
      // cell: failed: The requested cell at -10,91,154 is birch_leaves, not obsidian. Broke 0 matching blocks ...")
      const others = notThere.length ? `${notThere.length === 1 ? '1 cell held' : `${notThere.length} cells held`} ${[...new Set(notThere)].join(' and ')}, not obsidian` : '';
      const why = [others, skipped ? `not every cell came back: ${skipped.slice(0, 160)}` : ''].filter(Boolean).join('; ');
      if (got <= 0 && r.ok) r = { ok: false, result: `took back no obsidian from your last frame${why ? ` (${why})` : ': none of its cells still holds it'}`, code: 'FAILED' };
      if (got > 0 && r.ok) r = { ...r, result: `took back ${got} obsidian from your last frame${why ? ` (${why})` : ''}` };
      if (got > 0 && lastPortal) {
        for (const c of lastPortal.cells) frames.delete(frameKey(lastPortal.dimension, c));
        savePortals(config, server);
        lastPortal = null;
      }
    }
    // where a walk ended up (F13 of the log hunt: a stopped explore said only "stopped through MCP"), and which world a
    // portal led to (its coordinates are where the bot came out, not the portal it left)
    if (['go_to', 'explore'].includes(tool) && !r.ok && latest.position) r = { ...r, result: `${r.result}; you are now at ${floorPos(latest.position).x} ${floorPos(latest.position).y} ${floorPos(latest.position).z}` };
    if (tool === 'explore' && r.ok && latest.position) r = { ...r, result: `${r.result === 'done' ? 'explored' : r.result}; you are now at ${floorPos(latest.position).x} ${floorPos(latest.position).y} ${floorPos(latest.position).z}` };
    if (tool === 'portal' && r.ok && v.args.action === 'enter') r = { ...r, result: r.result.replace(/went through the portal( into the \S+)? at/, `went through the portal; you came out in the ${{ the_nether: 'Nether', the_end: 'End' }[dimension] ?? dimension} at`) };
    // back in the Overworld somewhere else than its own portal: the Nether side linked to an older portal (g4ac86b came
    // back 165 blocks from the frame it built)
    if (tool === 'portal' && r.ok && v.args.action === 'enter' && (dimension ?? 'overworld') === 'overworld' && lastPortal?.dimension === 'overworld' && latest.position) {
      const f = lastPortal.frame;
      const off = Math.round(Math.hypot(f.x - latest.position.x, f.z - latest.position.z));
      if (off > 16) r = { ...r, result: `${r.result}; your own portal is at ${f.x} ${f.y} ${f.z}, ${off} blocks away (the Nether side led to an older portal, as the game links each Nether portal to the nearest one)` };
    }
    // a pickup said only "done" (g0793f1): what came back
    if (tool === 'pick_up' && r.ok && /^done\b/.test(r.result)) {
      const got = Object.fromEntries(Object.entries(delta).filter(([, n]) => n > 0));
      r = { ...r, result: Object.keys(got).length ? `picked up ${describeDelta(got)}` : 'nothing to pick up there' };
    }
    if (yielded === 'recover') r = { ...r, result: `${r.result} (before it the body finished going back for the items it dropped when it died)` };
    const ms = Date.now() - t0;
    // Muse's own: every skill it ran, the policy too (setting its rules is its decision; g0a414c read "no actions yet"
    // after its policy call); a look is not an action
    if (tool !== 'get_state' && !refusedFirst) museActions += 1;
    if (tool === 'pick_up' && v.args.death_items && r.ok) care?.recovered(status?.lastDeath?.observedAt ?? null);
    if (tool === 'pick_up' && v.args.death_items && r.code === 'DIED') care?.diedRecovering(status?.lastDeath?.observedAt ?? null);
    body.busy = false;
    idleSince = Date.now();
    doing = null;
    current = null;
    lastResult = `${describeCall(tool, v.args)} -> ${r.ok ? 'ok' : 'failed'}: ${r.result}${Object.keys(delta).length ? ` (inventory: ${describeDelta(delta)})` : ''}`.slice(0, 600);
    const ownNonZero = own ? Object.fromEntries(Object.entries(own).filter(([, n]) => n)) : null;
    const out = { ok: Boolean(r.ok), result: r.result, delta, ms, ...(ownNonZero ? { own: ownNonZero } : {}), ...(Object.keys(killed).length ? { kills: killed } : {}), ...(r.ok ? {} : { code: r.code ?? 'FAILED' }) };
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
    LIVE_GAMES.delete(gameId); // its frames and return portals are released
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
        // the mobs its reflexes killed (a "kill 10 zombies" goal counts them)
        kills: (mobs) => emit('kill', { mobs, by: 'reflex' }),
        event, tickMs: careTickMs, idleBeforeMs: careIdleMs, mode: careMode,
      });
      if (pendingRules) { care.setRules(pendingRules.r, pendingRules.meta); pendingRules = null; }
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
