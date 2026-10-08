// test/fake-mineai.js - a stand-in for one Mine AI MCP host (BODY=mineai tests): /health and /mcp (streamable HTTP,
// JSON replies) on 127.0.0.1, the bearer token of our patch 0004, and a tiny world behind the tools our body uses:
// foreground actions with submission_id / wait_timeout_ms / wait_for_action / cancel_foreground_action and their result
// gate, view_status, view_blocks, set_survival_policy, recursive crafting with a temporary workstation, collect,
// smelt, equip (worn and off-hand stacks in the status), and the rest answering simply. Every call is recorded (calls).
// Failures and durations are set per tool; world.held = {owner, until} makes one of their reflexes hold the body (a
// submission is refused ACTION_BUSY with no action id until then); world.huntKillAfterMs makes a hunt's progress show a
// kill after that long while the hunt goes on (no drop came) until cancelled. world.side[tool] = {item: n} changes the
// inventory during that tool's next runs beyond what its evidence reports (a walk digging through stone, scaffolding
// placed, an item lying near a table picked up with it), as on a real server; world.collectBroken sets how many target
// blocks a collect reports broken (the rest of its gain came on the way), world.buildDug how many cells a build dug.
// Run as a process (test/fake-mineai-host.mjs) it stands in for their host.ts.

import http from 'node:http';
import crypto from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const FOREGROUND = ['navigate', 'collect_block', 'craft_item', 'smelt_item', 'place_block', 'eat_food', 'send_message', 'equip',
  'collect_mob_drop', 'sleep', 'use_bucket', 'use_container', 'explore_frontier', 'pick_up_items', 'drop_item', 'build_structure'];
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry'];
const RECIPES = {
  stick: { out: 4, need: { $planks: 2 } },
  crafting_table: { out: 1, need: { $planks: 4 } },
  wooden_pickaxe: { out: 1, need: { $planks: 3, stick: 2 }, table: true },
  stone_pickaxe: { out: 1, need: { cobblestone: 3, stick: 2 }, table: true },
  furnace: { out: 1, need: { cobblestone: 8 }, table: true },
  iron_pickaxe: { out: 1, need: { iron_ingot: 3, stick: 2 }, table: true },
};
for (const w of WOODS) RECIPES[`${w}_planks`] = { out: 4, need: { [`${w}_log`]: 1 } };
const DROPS = { stone: 'cobblestone', coal_ore: 'coal', iron_ore: 'raw_iron', logs: 'oak_log' };
const SMELTS = { raw_iron: 'iron_ingot', cobblestone: 'stone', oak_log: 'charcoal', beef: 'cooked_beef' };
const FUELS = { coal: 8, charcoal: 8, oak_planks: 1.5, birch_planks: 1.5, oak_log: 1.5, birch_log: 1.5 };

/**
 * @param {{port?: number, token?: string|null, username?: string, inventory?: Record<string, number>,
 *   durations?: Record<string, number>, fail?: Record<string, string>, blocks?: Array<object>, envKeys?: string[]}} [opts]
 */
export async function startFakeMineAi(opts = {}) {
  const world = {
    username: opts.username ?? 'Tst_fake',
    inventory: new Map(Object.entries(opts.inventory ?? {})),
    position: { x: 10.5, y: 64, z: -3.5 },
    health: 20, food: 18, lastDeath: null, connected: true, revision: 'rev-1',
    durations: { ...(opts.durations ?? {}) },
    fail: { ...(opts.fail ?? {}) }, // tool -> "[CODE] message"
    blocks: opts.blocks ?? [{ name: 'birch_log', found: 40, listed: [{ x: 14, y: 64, z: -2, distance: 4 }] }],
    hostiles: [],
    players: [],
    equipment: new Map(), // slot -> {name, count}
    held: null, // {owner, until}: a reflex owns the body
    huntKillAfterMs: null,
    side: {}, // tool -> {item: n}: what else changes while it runs (not in its evidence)
    collectBroken: null,
    buildDug: 0,
    die: null, // a tool whose next run kills the bot
  };
  const calls = [];
  const actions = new Map();
  let active = null;
  let unretrieved = null;
  const have = (k) => world.inventory.get(k) ?? 0;
  const add = (k, n) => { const v = have(k) + n; if (v > 0) world.inventory.set(k, v); else world.inventory.delete(k); };
  const SLOT = { head: 5, torso: 6, legs: 7, feet: 8, 'off-hand': 45 };
  const stacks = () => [
    ...[...world.inventory].map(([name, count], i) => ({ slot: 36 + i, location: i < 9 ? 'hotbar' : 'main', name, count, held: i === 0, durability: null })),
    ...[...world.equipment].map(([location, x]) => ({ slot: SLOT[location], location, name: x.name, count: x.count, held: false, durability: null })),
  ];
  const slotFor = (name) => (name === 'shield' ? 'off-hand' : /_helmet$/.test(name) ? 'head' : /_chestplate$/.test(name) ? 'torso' : /_leggings$/.test(name) ? 'legs' : /_boots$/.test(name) ? 'feet' : 'hand');
  const planksOf = () => WOODS.map((w) => `${w}_planks`).find((p) => have(p) > 0) ?? `${WOODS.find((w) => have(`${w}_log`) > 0) ?? 'oak'}_planks`;

  /** Recursive craft of n item; returns an error string or null. ctx.steps gets their plan's steps (as they report them). */
  function craft(item, n, ctx) {
    const r = RECIPES[item];
    if (!r) return `[ITEMS_NOT_CRAFTABLE] ${item} has no recipe`;
    if (r.table && !ctx.table) return '[CRAFTING_TABLE_REQUIRED] needs a crafting table in reach';
    const times = Math.ceil(n / r.out);
    const ingredients = [];
    for (let [ing, c] of Object.entries(r.need)) {
      if (ing === '$planks') ing = planksOf();
      const want = c * times;
      if (have(ing) < want) {
        if (!RECIPES[ing]) return `[CRAFT_MATERIALS_MISSING] missing ${want - have(ing)} ${ing}`;
        const e = craft(ing, want - have(ing), ctx);
        if (e) return e;
      }
      add(ing, -want);
      ingredients.push({ item: ing, count: want });
    }
    add(item, r.out * times);
    ctx.steps?.push({ item, count: r.out * times, applications: times, ingredients, requiresCraftingTable: Boolean(r.table) });
    return null;
  }

  /** Run one foreground action to its output. */
  function perform(tool, a, cancelled) {
    if (world.die === tool) {
      world.die = null;
      world.lastDeath = { position: { ...world.position }, at: Date.now() };
      world.inventory.clear();
      return { status: 'failed', error: '[HUNT_BOT_DIED] the bot died' };
    }
    if (world.fail[tool]) return { status: 'failed', error: world.fail[tool] };
    if (cancelled()) return { status: 'cancelled', error: 'cancelled on request' };
    switch (tool) {
      case 'navigate': world.position = { x: a.x + 0.5, y: a.y ?? 64, z: a.z + 0.5 }; return { status: 'succeeded', navigation: { end: world.position, target: { x: a.x, y: a.y ?? null, z: a.z }, remainingDistance: 0 } };
      case 'collect_block': {
        const drop = DROPS[a.block_name] ?? a.block_name;
        if (a.block_name === 'iron_ore' && !have('stone_pickaxe')) return { status: 'failed', error: '[TARGET_UNMINEABLE] iron_ore needs a stone pickaxe' };
        add(drop, a.count ?? 1);
        return { collected: { requested: a.count ?? 1, gained: a.count ?? 1, gainedByItem: { [drop]: a.count ?? 1 }, blocksBroken: world.collectBroken ?? a.count ?? 1 }, status: 'succeeded' };
      }
      case 'craft_item': {
        const needs = a.items.some((i) => RECIPES[i.item_name]?.table);
        let table = false;
        let placed = null;
        if (needs && a.temporary_workstation) {
          if (!have('crafting_table')) return { status: 'failed', error: '[WORKSTATION_NOT_CARRIED] no crafting table carried' };
          table = true;
        } else if (needs && have('crafting_table')) { add('crafting_table', -1); placed = { x: 11, y: 64, z: -3 }; table = true; }
        const items = [];
        const steps = [];
        for (const i of a.items) {
          const before = have(i.item_name);
          const e = craft(i.item_name, i.count ?? 1, { table, steps });
          if (e) return { craft: { items, completedSteps: steps.length }, status: 'failed', error: e };
          items.push({ item: i.item_name, requested: i.count ?? 1, gained: have(i.item_name) - before, confirmed: true });
        }
        const plan = { status: 'ready', steps, requiredMaterials: [], carriedMaterials: [], missingMaterials: [], requiresCraftingTable: table, tree: '' };
        return { craft: { items, completedSteps: steps.length, plan, ...(placed ? { craftingTablePlaced: placed } : {}) }, ...(a.temporary_workstation ? { workstation: { block: 'crafting_table', position: { x: 11, y: 64, z: -3 }, recovered: true } } : {}), status: 'succeeded' };
      }
      case 'smelt_item': {
        if (have(a.item_name) < a.count) return { status: 'failed', error: `[SMELT_INPUT_MISSING] carries ${have(a.item_name)} ${a.item_name}` };
        if (a.temporary_workstation && !have('furnace')) return { status: 'failed', error: '[WORKSTATION_NOT_CARRIED] no furnace carried' };
        const fuel = Math.ceil(a.count / (FUELS[a.fuel_item_name] ?? 1));
        if (have(a.fuel_item_name) < fuel) return { status: 'failed', error: '[SMELT_FUEL_STARVED] the fuel ran out' };
        add(a.item_name, -a.count);
        add(a.fuel_item_name, -fuel);
        add(SMELTS[a.item_name] ?? 'stone', a.count);
        return { smelt: { furnace: { x: 12, y: 64, z: -3 }, inputItem: a.item_name, fuelItem: a.fuel_item_name, requested: a.count, produced: a.count, outputItem: SMELTS[a.item_name], fuelInserted: fuel, rawRecovered: 0, fuelRecovered: 0 }, ...(a.temporary_workstation ? { workstation: { block: 'furnace', position: { x: 12, y: 64, z: -3 }, recovered: true } } : {}), status: 'succeeded' };
      }
      case 'place_block': if (!have(a.block_name)) return { status: 'failed', error: `[PLACE_ITEM_MISSING] no ${a.block_name}` }; add(a.block_name, -1); return { status: 'succeeded', placed: { block: a.block_name, position: { x: a.x, y: a.y, z: a.z } } };
      case 'eat_food': {
        if (!have(a.food_name)) return { status: 'failed', error: `[EAT_FOOD_MISSING] no ${a.food_name}` };
        const before = have(a.food_name);
        const hungerBefore = world.food;
        add(a.food_name, -1);
        world.food = Math.min(20, world.food + 6);
        return { status: 'succeeded', eating: { food: a.food_name, inventoryBefore: before, inventoryAfter: have(a.food_name), confirmed: true, hungerBefore, hungerAfter: world.food, consumed: true } };
      }
      case 'build_structure': {
        // every cell of the material is placed from the inventory; world.buildDug cells were dug clear
        const cells = a.blocks ?? [];
        const solid = cells.filter((b) => b.block_name !== 'air');
        const material = solid[0]?.block_name;
        if (material && have(material) < solid.length) return { status: 'failed', error: `[BUILD_INCOMPLETE] ${solid.length - have(material)} cells still wrong: short of ${solid.length - have(material)} ${material}.`, structure: null };
        if (material) add(material, -solid.length);
        return { status: 'succeeded', structure: { dimension: 'overworld', cells: cells.length, correct: cells.length, placed: solid.length, dug: world.buildDug, wrong: 0, left: [], missing: [], passes: 1, complete: true } };
      }
      case 'collect_mob_drop': add(a.drop_name, a.count ?? 1); return { status: 'succeeded', hunt: { mob: a.mob_name, drop: a.drop_name, requested: a.count ?? 1, gained: a.count ?? 1, targetDeathsObserved: a.count ?? 1 } };
      case 'drop_item': for (const i of a.items) add(i.item_name, -Math.min(have(i.item_name), i.count ?? have(i.item_name))); return { status: 'succeeded' };
      case 'equip':
        for (const i of a.items) {
          const to = i.destination ?? slotFor(i.item_name);
          if (!have(i.item_name)) return { status: 'failed', error: `[EQUIP_ITEM_NOT_CARRIED] no ${i.item_name}` };
          if (to === 'hand') continue;
          add(i.item_name, -1);
          world.equipment.set(to, { name: i.item_name, count: 1 });
        }
        return { status: 'succeeded', equip: { completed: a.items.length } };
      case 'use_bucket': if (a.action === 'fill') { add('bucket', -1); add(`${a.liquid}_bucket`, 1); } return { status: 'succeeded' };
      default: return { status: 'succeeded' };
    }
  }

  function submit(tool, a) {
    if (unretrieved) return { state: 'refused', code: 'RESULT_NOT_RETRIEVED', error: 'retrieve the earlier result first', unretrievedActionId: unretrieved };
    if (active) return { state: 'refused', code: 'ACTION_BUSY', error: 'another action is running', activeActionId: active };
    // their exact words when a reflex owns an idle body (src/session/async-actions.ts): no action id to wait for
    if (world.held && Date.now() < world.held.until) return { state: 'refused', code: 'ACTION_BUSY', error: `No new action started; body owner: ${world.held.owner}. Wait for physical ownership to become available.` };
    const id = crypto.randomUUID();
    const t0 = Date.now();
    const act = { id, tool, state: 'running', output: null, cancel: false, waiters: [] };
    actions.set(id, act);
    active = id;
    const hunting = tool === 'collect_mob_drop' && world.huntKillAfterMs !== null;
    act.timer = setTimeout(() => {
      const result = perform(tool, a, () => act.cancel);
      // what else happened meanwhile (a walk's digging and scaffolding, a pickup): in the inventory, not in the evidence
      if (result.status !== 'cancelled') for (const [k, n] of Object.entries(world.side[tool] ?? {})) add(k, n);
      settle(act, result);
    }, hunting ? 600_000 : world.durations[tool] ?? 20);
    act.t0 = t0;
    act.hunting = hunting;
    act.args = a;
    return { state: 'accepted', actionId: id, action: tool, admittedAt: new Date(t0).toISOString() };
  }
  function settle(act, result) {
    if (act.state !== 'running') return;
    clearTimeout(act.timer);
    act.state = 'settled';
    act.output = { action: act.tool, durationMs: Date.now() - act.t0, result };
    if (active === act.id) active = null;
    unretrieved = act.id;
    for (const w of act.waiters.splice(0)) w();
  }
  async function wait(id, ms) {
    const act = actions.get(id);
    if (!act) return { state: 'refused', code: 'ACTION_NOT_FOUND', error: 'no such action' };
    if (act.state === 'running' && ms > 0) await new Promise((r) => { const t = setTimeout(r, ms); act.waiters.push(() => { clearTimeout(t); r(); }); });
    if (act.state !== 'settled') {
      // their progress: request.evidence.checkpoint (a hunt counts the target deaths it saw)
      const killed = act.hunting && Date.now() - act.t0 >= world.huntKillAfterMs ? 1 : 0;
      return { state: 'pending', wakeReason: 'timeout', actionId: id, progress: act.hunting ? { request: { evidence: { checkpoint: { phase: killed ? 'collecting' : 'fighting', attacks: 3, targetDeathsObserved: killed, gained: 0 } } } } : {} };
    }
    if (unretrieved === id) unretrieved = null;
    return { state: 'settled', wakeReason: 'settled', actionId: id, output: act.output };
  }

  const json = (data) => ({ content: [], structuredContent: { response: { format: 'json', data } } });
  function build() {
    const server = new McpServer({ name: 'fake-mine-ai', version: '0' });
    const loose = z.object({}).loose();
    const reg = (name, fn) => server.registerTool(name, { description: name, inputSchema: loose }, async (args) => {
      const { rationale, response_format: format, ...rest } = args;
      calls.push({ tool: name, args: rest, rationale, format });
      return json(await fn(rest));
    });
    for (const tool of FOREGROUND) {
      reg(tool, async ({ submission_id: sid, wait_timeout_ms: ms, ...a }) => {
        const s = submit(tool, a);
        if (s.state !== 'accepted' || ms === undefined) return s;
        return wait(s.actionId, Number(ms));
      });
    }
    reg('wait_for_action', ({ action_id: id, timeout_ms: ms }) => wait(id, Number(ms)));
    reg('cancel_foreground_action', ({ action_id: id }) => {
      const act = actions.get(id);
      if (!act) return { state: 'refused', code: 'ACTION_NOT_FOUND', error: 'no such action' };
      if (act.state === 'settled') return { state: 'settled', actionId: id };
      act.cancel = true;
      const hunt = act.hunting ? { hunt: { mob: act.args.mob_name, drop: act.args.drop_name, requested: act.args.count ?? 1, gained: 0, targetDeathsObserved: Date.now() - act.t0 >= world.huntKillAfterMs ? 1 : 0 } } : {};
      setTimeout(() => settle(act, { status: 'cancelled', error: 'cancelled on request', ...hunt }), 10);
      return { state: 'cancellation_requested', actionId: id, cancellation: { kind: 'cancellation_requested', action: act.tool, startedAt: '', reason: 'x' } };
    });
    reg('view_status', () => ({
      action: 'view_status', durationMs: 1,
      result: { status: 'succeeded', situation: {
        dimension: 'overworld', lastDeath: world.lastDeath, vitals: { health: world.health, food: world.food, airSupplyTicks: null },
        clock: { timeOfDay: 1000, phase: 'day' }, position: { ...world.position, headingDegrees: 90 },
        inventory: { stacks: stacks() }, nearby: { players: world.players, hostiles: world.hostiles, mobs: [{ name: 'cow', kind: 'animal', count: 2, nearest: { entityId: 5, distance: 7, position: { x: 15, y: 64, z: -1 } } }] },
      } },
      survivalPolicy: { revision: world.revision },
    }));
    reg('view_blocks', () => ({ action: 'view_blocks', durationMs: 1, result: { status: 'succeeded', blocks: { find: world.blocks } } }));
    reg('set_survival_policy', (a) => {
      if (a.expected_revision !== world.revision) return { action: 'set_survival_policy', durationMs: 1, result: { status: 'failed', error: '[POLICY_REVISION_STALE] stale' } };
      world.revision = `rev-${Number(world.revision.split('-')[1]) + 1}`;
      return { action: 'set_survival_policy', durationMs: 1, result: { status: 'succeeded' } };
    });
    return server;
  }

  const sessions = new Map();
  const authorized = (req) => !opts.token || req.headers.authorization === `Bearer ${opts.token}`;
  const srv = http.createServer(async (req, res) => {
    if (!authorized(req)) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"token"}'); return; }
    if (req.url === '/health') {
      if (opts.hang) return; // never answers
      const body = { ok: world.connected, minecraft: { connected: world.connected, username: world.username, health: world.health, food: world.food, position: world.position, inventory: stacks() }, ...(opts.envKeys ? { envKeys: opts.envKeys } : {}) };
      res.writeHead(world.connected ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify(body));
      return;
    }
    if (!req.url.startsWith('/mcp')) { res.writeHead(404).end(); return; }
    const sid = req.headers['mcp-session-id'];
    let t = sid ? sessions.get(sid) : null;
    if (!t) {
      t = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID(), enableJsonResponse: true, onsessioninitialized: (id) => sessions.set(id, t) });
      await build().connect(t);
    }
    await t.handleRequest(req, res);
  });
  await new Promise((r) => srv.listen(opts.port ?? 0, '127.0.0.1', r));
  const port = srv.address().port;
  return {
    world, calls, port,
    url: `http://127.0.0.1:${port}/mcp`,
    headers: opts.token ? { authorization: `Bearer ${opts.token}` } : {},
    tools: (name) => calls.filter((c) => c.tool === name),
    close: () => new Promise((r) => { srv.closeAllConnections?.(); srv.close(() => r()); }),
  };
}

/**
 * A host manager (src/mineai/host.js shape) that hands out in-process fakes instead of processes. hostOpts(i) gives
 * each fake its options; started lists the fakes.
 */
export function fakeHosts(hostOpts = () => ({})) {
  const started = [];
  let n = 0;
  return {
    started,
    get count() { return started.filter((h) => !h.closed).length; },
    async start({ instanceId, username }) {
      const fake = await startFakeMineAi({ token: 'test-token', username, ...hostOpts(n++) });
      const listeners = new Map();
      const host = {
        instanceId, username, fake, url: fake.url, headers: fake.headers, viewPorts: null, restarts: 0, closed: false,
        ready: Promise.resolve(),
        on(ev, fn) { listeners.set(ev, [...(listeners.get(ev) ?? []), fn]); },
        emit(ev, data) { for (const fn of listeners.get(ev) ?? []) fn(data); },
        async close() { if (!host.closed) { host.closed = true; await fake.close(); } },
      };
      started.push(host);
      return host;
    },
    closeAll: () => Promise.all(started.map((h) => h.close())),
  };
}
