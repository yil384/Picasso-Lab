// src/mineai/body.js - a Body (src/contracts.js) whose bot lives in a Mine AI MCP host (BODY=mineai): one host per
// guest game (src/mineai/host.js), driven as an MCP client. run(skill, args) maps our skill onto their actions
// (src/mineai/skills.js), submits each with a fresh submission_id, waits for it (wait_for_action) up to the skill's
// time limit, cancels it on stop or timeout and always reads its final result before the next one (their result
// gate), and returns our SkillResult: ok, our result text, the inventory change (their status before and after), the
// time, and a typed code. The state is theirs (view_status, plus their /health on every heartbeat) rendered in our
// state text; state(), snapshot() and inventory() read the latest copy at once. Everything above the body (the MCP
// queue, idempotent calls, 45 s replies, typed codes, the dry-run check, /play and the API) is unchanged.
// The runtime's own reflexes (combat, fire, breath, footing, hunger) act on their own, as their survival policy says.

import crypto from 'node:crypto';
import net from 'node:net';
import { EventEmitter } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { inventoryDelta } from '../contracts.js';
import { renderState, describeCall, describeDelta } from '../state.js';
import { NOTABLE_BLOCKS } from '../state.js';
import { MINEAI_SKILLS, MINEAI_TIMEOUTS, DIRECT_TOOLS, toTheirs, fromTheirs } from './skills.js';

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
export function createMineAiBody({ config, log, hosts, gameId, username, viewId = null, onEyes = null, connect = connectSdk, timeouts = MINEAI_TIMEOUTS }) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  let host = null;
  let client = null;
  let connecting = null;
  let status = null; // view_status situation
  let statusAt = 0;
  let latest = { position: null, health: 20, food: 20, inventory: {}, held: null }; // the newest of status and /health
  let lastDeath = null;
  let policyRevision = null;
  let scan = { blocks: [], at: 0, from: null };
  let scanning = null;
  let goal = null;
  let doing = null;
  let lastResult = null;
  let current = null; // the action running now: {actionId, stop}
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
    const c = await ensureClient();
    let r;
    try {
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
      ...(Array.isArray(mc.inventory) && !body.busy ? { inventory: inventoryOfStacks(mc.inventory) } : {}),
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
    const stacks = s.inventory?.stacks ?? [];
    latest = {
      position: s.position ? { x: s.position.x, y: s.position.y, z: s.position.z } : latest.position,
      health: s.vitals?.health ?? latest.health,
      food: s.vitals?.food ?? latest.food,
      inventory: inventoryOfStacks(stacks),
      held: stacks.find((x) => x.held)?.name ?? null,
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
      nearbyBlocks,
      mobs,
      goal,
      busy: body.busy,
      doing,
      lastResult,
    };
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
  });

  /**
   * Submit one action and wait for its final result (their result gate: always read it before the next), cancelling
   * it on stop or when the skill's time runs out. Returns {output, stopped} or {error}.
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
    let data = await rpc(call.tool, { ...call.args, submission_id: submission, wait_timeout_ms: first() }, first() + RPC_SLACK_MS);
    // a result of an earlier action not read yet (a call cut short), or an action still running: read it, then once more
    if (data.state === 'refused' && (data.unretrievedActionId || data.activeActionId)) {
      const other = data.unretrievedActionId ?? data.activeActionId;
      if (data.activeActionId) await rpc('cancel_foreground_action', { action_id: other, reason: 'an earlier step was left running' });
      await rpc('wait_for_action', { action_id: other, timeout_ms: 15_000 }, 35_000);
      data = await rpc(call.tool, { ...call.args, submission_id: `${submission}-b`, wait_timeout_ms: first() }, first() + RPC_SLACK_MS);
    }
    let cancelled = false;
    const cancel = async (why) => {
      if (cancelled || !ctl.actionId) return;
      cancelled = true;
      ctl.stopped ??= why;
      await rpc('cancel_foreground_action', { action_id: ctl.actionId, reason: String(why).slice(0, 200) });
    };
    ctl.cancel = cancel;
    while (data.state === 'accepted' || data.state === 'pending') {
      ctl.actionId ??= data.actionId;
      if (ctl.stopped) await cancel(ctl.stopped);
      else if (left() <= 0) await cancel(`timed out after ${Math.round((timeouts[ctl.skill] ?? 60_000) / 1000)} s`);
      const ms = cancelled ? 15_000 : Math.max(1_000, waitFor());
      data = await rpc('wait_for_action', { action_id: ctl.actionId, timeout_ms: ms }, ms + RPC_SLACK_MS);
    }
    if (data.state === 'settled' || data.state === 'storage_failed') return { output: data.output, stopped: ctl.stopped };
    if (data.state === 'refused') return { error: `${data.code}: ${data.error}`, code: data.code };
    return { error: data.error ?? `unexpected reply (${String(data.state)})` };
  }

  async function run(tool, args) {
    const t0 = Date.now();
    if (ended) return { ok: false, result: 'not connected to the game', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (!body.connected) return { ok: false, result: 'not in the game yet', delta: {}, ms: 0, code: 'NOT_STARTED' };
    if (body.busy) return { ok: false, result: `busy: ${doing ?? 'a skill'} is still running`, delta: {}, ms: 0 };
    const v = MINEAI_SKILLS.validate(tool, args ?? {});
    if (!v.ok) return { ok: false, result: `bad arguments: ${v.error}`, delta: {}, ms: 0, code: 'BAD_ARGS' };
    body.busy = true;
    doing = describeCall(tool, v.args);
    const ctl = { skill: tool, actionId: null, stopped: null, cancel: null };
    current = ctl;
    emit('skill', { phase: 'start', tool, args: v.args });
    let r;
    let before = {};
    let deathBefore = lastDeath;
    try {
      await refresh();
      before = { ...latest.inventory };
      deathBefore = lastDeath;
      const plan = toTheirs(tool, v.args, context());
      if (plan.local === 'state') r = { ok: true, result: renderState(snapshot()), code: null };
      else if (plan.refused) r = plan.refused;
      else {
        const deadline = t0 + (timeouts[tool] ?? 60_000);
        const parts = [];
        for (const call of plan.calls) {
          if (ctl.stopped) break;
          ctl.actionId = null;
          const out = await act(call, deadline, ctl);
          if (out.error) {
            const down = /\[(RUNTIME_EXITED|RUNTIME_UNRESPONSIVE)\]/.exec(out.error)?.[1];
            const said = down ? `the body stopped in the middle of it (${down}) and is being started again; send the step again in a few seconds` : `failed: ${String(out.error).replace(/^MCP error -?\d+: /, '').slice(0, 300)}`;
            parts.push({ ok: false, result: said, code: out.code === 'INVALID_ARGUMENTS' ? 'BAD_ARGS' : 'FAILED' });
            break;
          }
          let res = fromTheirs(call.tool, out.output, { stopped: out.stopped });
          // an attack is a hunt for one drop: a fight won without that drop still counts
          if (!res.ok && plan.attack && out.output?.result?.hunt?.targetDeathsObserved > 0) res = { ok: true, result: `fought the ${plan.attack} and killed it (${res.result})`, code: null };
          parts.push(res);
          if (!res.ok) break;
        }
        const failed = parts.find((x) => !x.ok);
        const text = parts.map((x) => x.result).join('; ') || (ctl.stopped ? `stopped: ${ctl.stopped}` : 'nothing ran');
        r = { ok: !failed && !ctl.stopped, result: `${text}${plan.note ? ` (${plan.note})` : ''}`, code: failed?.code ?? (ctl.stopped ? 'STOPPED' : null) };
      }
    } catch (err) {
      r = { ok: false, result: `error: ${String(err?.message ?? err).slice(0, 300)}`, code: 'FAILED' };
    }
    try { await refresh(); } catch { /* the state stays as it was */ }
    const delta = inventoryDelta(before, latest.inventory);
    if (lastDeath && lastDeath !== deathBefore) {
      const at = status?.lastDeath?.position;
      r = { ok: false, result: `you died${at ? ` at ${floorPos(at).x} ${floorPos(at).y} ${floorPos(at).z}` : ''}; your items dropped there (pick_up with death_items: true within 5 minutes). ${r.result}`, code: 'DIED' };
    }
    const ms = Date.now() - t0;
    body.busy = false;
    doing = null;
    current = null;
    lastResult = `${describeCall(tool, v.args)} -> ${r.ok ? 'ok' : 'failed'}: ${r.result}${Object.keys(delta).length ? ` (inventory: ${describeDelta(delta)})` : ''}`.slice(0, 600);
    const out = { ok: Boolean(r.ok), result: r.result, delta, ms, ...(r.ok ? {} : { code: r.code ?? 'FAILED' }) };
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
      await stop('the game ended').catch(() => {});
      await dropClient();
      await host?.close('the game ended');
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
      dropClient();
      emit('error', { message: `the body stopped (${why}); starting it again` });
      event('mineai_body_crash', { why });
    });
    host.on('restart', () => { event('mineai_body_restart', {}); refresh().catch(() => {}); });
    host.on('down', ({ why }) => end(`the body could not go on: ${why}`));
    await host.ready;
    if (closed) throw new Error('the game ended while the bot was joining');
    await refresh();
    body.connected = true;
    event('bot_ready', { username, body: 'mineai', pos: latest.position ? floorPos(latest.position) : null });
    emit('ready', {});
    scanBlocks();
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
