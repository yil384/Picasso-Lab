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
import { MINEAI_SKILLS, MINEAI_TIMEOUTS, DIRECT_TOOLS, CONTAINER_BLOCKS, toTheirs, fromTheirs, ownChange, splitError } from './skills.js';
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

export function createMineAiBody({ config, log, hosts, gameId, username, viewId = null, onEyes = null, connect = connectSdk, timeouts = MINEAI_TIMEOUTS, care: careOpt = 'advise', careTickMs, careIdleMs }) {
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
  let lastDeath = null;
  let policyRevision = null;
  let theirPolicy = null; // their survival policy in effect (view_status)
  let scan = { blocks: [], at: 0, from: null };
  let scanning = null;
  let goal = null;
  let doing = null;
  let lastResult = null;
  // the structure this game's last build left incomplete (its blueprint, material, cells, facing and where the bot
  // stood): a build of the same blueprint and material near it continues it (src/mineai/skills.js continuesLast)
  let lastBuild = null;
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
    advice: () => (care ? care.advice() : []),
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
    const death = s.lastDeath ? JSON.stringify(s.lastDeath) : null;
    if (death && death !== lastDeath) {
      if (lastDeath !== null || body.connected) emit('death', { at: s.lastDeath });
      lastDeath = death;
    } else if (lastDeath === null) lastDeath = death ?? '';
  }

  /** The notable blocks around (their view_blocks over every loaded chunk; about a second): kept for the state text. */
  function scanBlocks(force = false) {
    if (scanning || ended || (body.busy && !force)) return scanning;
    scanning = (async () => {
      const found = [];
      for (const names of SCAN_NAMES) {
        const data = await rpc('view_blocks', { find: { block_names: names, limit: 1 } }, 20_000);
        if (Array.isArray(data?.result?.blocks?.find)) found.push(...data.result.blocks.find);
      }
      if (!found.length) return;
      scan = {
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
      // the body's own care knobs (policy skill): kept here, never sent to the runtime
      const careText = plan.care ? (() => {
        const knobs = care?.setPolicy(plan.care === 'reset' ? null : plan.care);
        return `; its reflexes: ${describeReflexes(knobs, careMode)}${careMode === 'full' ? `; on its own between your calls: ${describeCare(knobs)}` : ''}`;
      })() : '';
      if (plan.local === 'armor') { const a = armorCalls(); if (a.refused) plan.refused = a.refused; else { plan.calls = a.calls; plan.note = a.note; } }
      if (plan.local === 'state') r = { ok: true, result: renderState(snapshot()), code: null };
      else if (plan.local === 'care') {
        if (!care) r = { ok: false, result: `${tool}: the body's care is off on this server`, code: 'FAILED' };
        else { const p = await care.perform(plan.kind, ctl); r = { ok: p.ok, result: p.text, code: p.ok ? null : p.code ?? 'FAILED' }; }
      }
      else if (plan.refused) r = plan.refused;
      else if (!plan.calls?.length && plan.care) r = { ok: true, result: careText.replace(/^; /, ''), code: null };
      else {
        const deadline = t0 + (timeouts[tool] ?? 60_000);
        ctl.attack = plan.attack ?? null;
        const parts = [];
        let rescued = false;
        own = {};
        const calls = [...plan.calls];
        // a collect that would wear its pickaxe out gets a spare first (crafted from what is carried)
        const spare = tool === 'collect' ? spareFirst(calls[0]?.args) : null;
        if (spare) { calls.unshift(...spare.calls.map((c) => ({ ...c, quiet: true }))); parts.push({ ok: true, result: `on its own first: ${spare.text}`, code: null }); }
        let replaced = 0;
        for (let i = 0; i < calls.length; i++) {
          const call = calls[i];
          if (ctl.stopped) break;
          ctl.actionId = null;
          const out = await act(call, deadline, ctl);
          if (out.error) {
            own = null;
            const down = /\[(RUNTIME_EXITED|RUNTIME_UNRESPONSIVE)\]/.exec(out.error)?.[1] ?? (crashes !== crashesBefore ? 'its host crashed' : null);
            const said = down ? restartText(down) : out.said ?? `failed: ${String(out.error).replace(/^MCP error -?\d+: /, '').slice(0, 300)}`;
            parts.push({ ok: false, result: said, code: down ? 'BODY_RESTARTED' : out.ours ?? (out.code === 'INVALID_ARGUMENTS' ? 'BAD_ARGS' : 'FAILED') });
            break;
          }
          let res = fromTheirs(call.tool, out.output, { stopped: out.stopped, call });
          const o = ownChange(call.tool, out.output, call);
          if (o === null) own = null;
          else if (own) for (const [k, n] of Object.entries(o)) own[k] = (own[k] ?? 0) + n;
          // the pickaxe broke in the middle of a collect: a new one from what is carried, then the rest of the collect
          if (!res.ok && res.theirs === 'TOOL_TIER_LOST' && call.tool === 'collect_block' && replaced < 2 && !ctl.stopped && deadline - Date.now() > 10_000) {
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
          if (res.ok && call.tool === 'place_block' && CONTAINER_BLOCKS.has(call.args.block_name)) containers.set(keyOf(call.args), gameId);
          // a craft the body added on its own (a spare tool, a new one) is told by its own line, not again
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
    if (yielded === 'recover') r = { ...r, result: `${r.result} (before it the body finished going back for the items it dropped when it died)` };
    const ms = Date.now() - t0;
    if (!['get_state', 'policy'].includes(tool)) museActions += 1;
    if (tool === 'pick_up' && v.args.death_items && r.ok) care?.recovered(status?.lastDeath?.observedAt ?? null);
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
