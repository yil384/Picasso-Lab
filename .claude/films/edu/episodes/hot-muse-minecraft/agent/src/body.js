// src/body.js - the bot body: a mineflayer bot (or an injected stand-in such as test/fake-bot.js) driven only through
// the 10 whitelisted skills in src/skills. run() validates arguments against the tool schemas, runs one skill at a time
// under its timeout and reports the inventory change and where the time went (phases); stop() is the kill switch.
// Minecraft is reached on localhost or the LAN only, with offline auth. The body also acts on its own
// (src/reflexes.js): a hostile mob that hits the bot is fought back (or run from, when health is low), the bot eats
// when it gets hungry, and the skill that was interrupted goes on afterwards; the next result says what the reflexes
// did. Stations the bot placed (src/stations.js) stay in the world until its game ends, and a background smelt
// (src/skills/smelt.js) is collected between skills.

import { createRequire } from 'node:module';
import pf from 'mineflayer-pathfinder';
import { config as defaultConfig, isLanHost } from './config.js';
import { validateArgs, inventoryDelta, TOOL_TIMEOUTS_MS, BODY_EVENTS } from './contracts.js';
import { snapshotOf, renderState, inventoryOf, describeCall, describeDelta, nearbyMobs } from './state.js';
import { SKILLS } from './skills/index.js';
import { SkillStop, describeError, fmt } from './skills/util.js';
import { syncInventory, inventoryFresh } from './skills/window.js';
import { fetchSmelted, describeSmelting, smeltJobs } from './skills/smelt.js';
import { bestSafeFood } from './skills/basic.js';
import { createWalkWatch } from './walk-watch.js';
import { Vec3 } from './mc.js';
import { ATTACK_TARGETS } from './game.js';
import { registryForWorld, removeStations, MAX_PER_BOT } from './stations.js';
import { runReflexes, nearestHostile, FLEE_HEALTH, FOOD_LOW, MOB_NEAR, CREEPER_NEAR } from './reflexes.js';

const require = createRequire(import.meta.url);
// mineflayer-tool comes with mineflayer-collectblock (not a direct dependency): load the copy collectblock itself uses.
// collectblock's own collect() is not used: its pickup waits without a limit for a drop it may never reach, and its
// walks ignore our walking rules, so the skills mine with pathfinder + dig (src/skills/util.js mineBlock).
const requireFromCollect = createRequire(require.resolve('mineflayer-collectblock'));
const { pathfinder, Movements } = pf;

/**
 * pollMs: furnace polling; stallMs: a furnace with no new output this long has stopped; graceMs: how long a stopped
 * skill may take to unwind; openMs / windowMs: how long the server gets to open a window / to answer window clicks;
 * stillMs: a walk in which the bot stands still this long (not digging or building) has failed; progressMs /
 * progressGain: a walk (or a whole go_to) that got less than progressGain blocks closer in the last progressMs has
 * failed, digging and building included (src/walk-watch.js); smeltMs: game time to smelt one item.
 */
export const DEFAULT_TIMING = Object.freeze({
  pollMs: 500, stallMs: 15_000, graceMs: 1_500, openMs: 5_000, windowMs: 4_000, stillMs: 20_000, progressMs: 22_000, progressGain: 3,
  smeltMs: 10_000,
});
/**
 * Where one skill's time goes. run(name, fn) runs fn and adds its wall time to `name`; a phase started inside another
 * counts toward the outer one (the walk to a drop is pickup, not path; a reflex's fight and walk are reflex), so the
 * phases never overlap. add(name, ms) adds a time measured by hand (ignored inside a running phase, which counts it
 * already). totals(ms) gives whole ms per phase plus `other` for the rest of ms (thinking, equipping, waits between
 * steps). The names: path (walking, path search included), dig, drop (the ticks after a dig for its drops to appear),
 * sync (inventory syncs with the server), place, open (a window opening), clicks (window clicks and their answers),
 * pickup (walking over drops), cook (waiting for a furnace), reflex (fighting, fleeing or eating on its own).
 */
export function createPhases(clock = Date.now) {
  const sums = {};
  let open = null;
  return {
    async run(name, fn) {
      if (open) return fn();
      const token = { name };
      open = token;
      const t0 = clock();
      try {
        return await fn();
      } finally {
        sums[name] = (sums[name] ?? 0) + (clock() - t0);
        if (open === token) open = null; // (a skill cut short may end its phase after a reflex took over)
      }
    },
    add(name, ms) {
      if (open || !(ms >= 0)) return;
      sums[name] = (sums[name] ?? 0) + ms;
    },
    totals(ms) {
      const out = {};
      let used = 0;
      for (const [k, v] of Object.entries(sums)) { out[k] = Math.round(v); used += v; }
      const other = Math.round((ms ?? used) - used);
      if (other > 0) out.other = other;
      return out;
    },
  };
}

/** A walk gives up after this many "stuck" path resets in a row that bring the bot no closer. */
const STUCK_RESETS = 3;
const STILL_CHECK_MS = 500;
/** How long a skill waits for the respawn after a death before it runs. */
const RESPAWN_MS = 10_000;
/**
 * Chunks around the bot the server sends (roadmap M2, S11): mineflayer asks for 12 ('far'); the skills look at most 32
 * blocks around and a go_to hop is 40, so 6 chunks (96 blocks) are plenty, with about 40% less chunk traffic.
 */
export const VIEW_DISTANCE = 6;
/**
 * A hit from a hostile mob: servers from 1.19.4 name who dealt each hit (damage_event, which mineflayer reports as
 * entityHurt just before the health update it causes): the mob named, up to HIT_RANGE blocks away (a skeleton shoots
 * from 15), and nothing for damage without a source (a fall, drowning, fire, hunger). Older servers: a hostile mob
 * within ATTACKER_RANGE when the bot loses health is taken as the attacker.
 */
const HIT_RANGE = 24;
const HIT_MS = 1_500;
const ATTACKER_RANGE = 6;
/** With reflexes off: after a hit stopped a skill, that mob's hits stop nothing for GRACE_MS, unless health drops to OFF_FLEE_HEALTH. */
const GRACE_MS = 10_000;
const OFF_FLEE_HEALTH = 6;
/** Skills a hit does not interrupt (they deal with the mob or the hunger themselves, or take no time). */
const KEEP_ON_HIT = new Set(['attack', 'eat', 'get_state', 'say']);
/** Fights and runs one skill may sit through; after that the hit stops it and the player decides. Meals: MAX_MEALS. */
const MAX_REFLEX_ROUNDS = 4;
const MAX_MEALS = 8;
/** How long run() waits for a reflex that started while no skill ran. */
const IDLE_REFLEX_WAIT_MS = 30_000;
/** How often the body looks around for a creeper about to blow, or hunger, while idle or in a long skill. */
const WATCH_MS = 500;
const safeCall = (fn) => { try { return fn(); } catch { return false; } };
/** Path search budget per walk (pathfinder's default of 5 s makes long go_to trips fail with "took too long"). */
const THINK_TIMEOUT_MS = 15_000;

// eslint-disable-next-line no-control-regex
const oneLine = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();
const clip = (s, max) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
const textOf = (v) => {
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return String(v); }
};

/** A mineflayer bot for config.mc, offline auth, refusing any host that is not loopback or LAN. */
function connect(cfg) {
  const { host, port, username, version } = cfg.mc;
  if (!isLanHost(host)) throw new Error(`refusing to connect to "${host}": the Minecraft server must be on localhost or the LAN`);
  const mineflayer = require('mineflayer');
  return mineflayer.createBot({ host, port, username, version, auth: 'offline', logErrors: false, hideErrors: true, viewDistance: VIEW_DISTANCE });
}

/** pathfinder and tool, each only if the bot does not have it yet. */
function loadPlugins(bot) {
  if (!bot.pathfinder) bot.loadPlugin(pathfinder);
  if (!bot.tool) bot.loadPlugin(requireFromCollect('mineflayer-tool').plugin);
  fixDigTime(bot);
}

/**
 * minecraft-data 1.21.4 files the blocks that need a stone pickaxe or better (iron, copper, lapis, gold, diamond ore,
 * obsidian...) under "incorrect_for_wooden_tool", whose speed table lists wooden tools only, so mineflayer times
 * every pickaxe on them at hand speed: iron ore with a stone pickaxe took 4.55 s where the game needs 1.15 s (mineflayer
 * waits its own estimate before it tells the server the block is broken). For a pickaxe that can harvest such a block,
 * time it as the pickaxe block it is.
 */
export function fixDigTime(bot) {
  const orig = bot.digTime;
  const pickaxe = bot.registry?.materials?.['mineable/pickaxe'];
  if (typeof orig !== 'function' || orig.fixed || !pickaxe) return;
  const fixed = (block) => {
    const held = bot.heldItem?.type;
    if (held != null && /^incorrect_for_/.test(block?.material ?? '') && pickaxe[held] && block.harvestTools?.[held]) {
      const material = block.material;
      try {
        block.material = 'mineable/pickaxe';
        return orig(block);
      } finally {
        block.material = material;
      }
    }
    return orig(block);
  };
  fixed.fixed = true;
  bot.digTime = fixed;
}

/** Walking rules: no parkour jumps, and never break the stations the bot works at. */
function makeMovements(bot) {
  const m = new Movements(bot);
  m.allowParkour = false;
  m.allowSprinting = true;
  for (const name of ['crafting_table', 'furnace', 'chest']) {
    const b = bot.registry.blocksByName[name];
    if (b) m.blocksCantBreak.add(b.id);
  }
  return m;
}

/** An AbortController that also aborts (with the same reason) when `parent` does. */
function childController(parent) {
  const c = new AbortController();
  if (parent.aborted) c.abort(parent.reason);
  else parent.addEventListener('abort', () => c.abort(parent.reason), { once: true });
  return c;
}

/**
 * What is left of a skill after a reflex interrupted it: the arguments to run it on with, or null when nothing is
 * left. collect and craft read what the first try made from ctx.resumed and do only the rest; build goes on from the
 * spot it started at; the others run again (go_to and place end at once when they are already there).
 */
function resumable(tool, progress) {
  if (tool === 'build' && !progress?.anchor) return false;
  return ['go_to', 'collect', 'craft', 'smelt', 'place', 'build'].includes(tool);
}

/**
 * @param {object} [opts]
 * @param {object} [opts.bot]        an existing bot (tests: test/fake-bot.js); otherwise one is created from config.mc
 * @param {object} [opts.config]     default: the process config
 * @param {object} [opts.log]        a Logger; the body logs stop, death, disconnect, reflexes and bot errors as events
 * @param {Partial<typeof TOOL_TIMEOUTS_MS>} [opts.timeouts]   per-tool overrides (tests)
 * @param {Partial<typeof DEFAULT_TIMING>} [opts.timing]       overrides (tests)
 * @param {boolean} [opts.reflexes]  false: a hit stops the skill and says so, nothing else happens on its own
 * @param {object} [opts.stations]   a station registry (src/stations.js); default: the one of this bot's world
 * @param {string} [opts.console]    the server console FIFO, for removing the bot's stations (default MC_CONSOLE)
 * @returns {import('./contracts.js').Body & {bot: object, connected: boolean}}
 */
export function createBody(opts = {}) {
  const cfg = opts.config ?? defaultConfig;
  const log = opts.log ?? null;
  const timeouts = { ...TOOL_TIMEOUTS_MS, ...(opts.timeouts ?? {}) };
  const timing = { ...DEFAULT_TIMING, ...(opts.timing ?? {}) };
  const injected = Boolean(opts.bot);
  const bot = opts.bot ?? connect(cfg);
  const reflexesOn = opts.reflexes !== false;
  const consolePath = opts.console !== undefined ? opts.console : (cfg.stream?.camera?.console || process.env.MC_CONSOLE || null);
  const registry = opts.stations ?? registryForWorld(injected ? bot : `${cfg.mc.host}:${cfg.mc.port}`);
  loadPlugins(bot);

  const listeners = new Map(BODY_EVENTS.map((e) => [e, new Set()]));
  const emit = (event, data) => {
    for (const fn of listeners.get(event)) {
      try { fn(data); } catch { /* a listener must not break the body */ }
    }
  };
  const logEvent = (kind, data) => { try { log?.event(kind, data); } catch { /* logging must not break the body */ } };

  let phase = injected ? 'ready' : 'connecting'; // connecting -> ready -> ended
  let goal = null;
  let lastResult = null;
  let current = null; // the running job
  let idle = null; // {controller, done}: a reflex that started while no skill ran
  let notes = []; // what reflexes did while no skill ran, for the next result
  let movements = null;
  let kickReason = null;
  let lastError = null;
  let dead = false;
  let lastHealth = null;
  let lastHit = null; // {source, at}: the latest hit on the bot the server reported, with who dealt it (or null)
  let grace = null; // reflexes off: {id, until}, the mob whose hits stop nothing until then
  let noFoodAt = null; // the inventory (as text) in which no safe food was found: no eating reflex until it changes
  const namesSources = safeCall(() => Boolean(bot.registry.version['>=']('1.19.4')));
  const me = () => bot.username ?? cfg.mc.username;

  // ---- stations the bot placed (src/stations.js) --------------------------------------------------------------
  const stations = {
    owns: (pos) => registry.ownerOf(pos) === me(),
    usable: (pos) => registry.usableBy(me(), pos),
    /** Claim a station; returns a note naming any station retired to stay within the cap. */
    claim(name, pos, { temp = false } = {}) {
      const retired = registry.add(me(), name, pos, { temp });
      if (!retired.length) return '';
      removeStations(consolePath, retired).then((n) => logEvent('stations_retired', { owner: me(), n, removed: Boolean(consolePath && n) }), () => {});
      return `; removed your oldest ${retired.map((s) => `${s.name.replace(/_/g, ' ')} at ${fmt(s.pos)}`).join(' and ')} (a bot keeps at most ${MAX_PER_BOT})`;
    },
    release(pos) {
      if (registry.ownerOf(pos) === me()) registry.remove(pos);
    },
    /** Forget own stations of this kind within radius whose block is gone (mined by hand, burnt). */
    forgetGone(name, radius) {
      const from = bot.entity?.position;
      if (!from) return;
      for (const s of registry.held(me())) {
        if (s.name !== name) continue;
        const b = safeCall(() => bot.blockAt(new Vec3(s.pos.x, s.pos.y, s.pos.z)));
        if (b && b.name !== name && Math.hypot(s.pos.x - from.x, s.pos.y - from.y, s.pos.z - from.z) <= radius) registry.remove(s.pos);
      }
    },
    list: () => registry.owned(me()),
  };
  /** Remove this bot's stations from the world (its game ended). */
  let released = false;
  async function releaseStations() {
    if (released) return;
    released = true;
    const mine = registry.release(me());
    if (!mine.length) return;
    const n = await removeStations(consolePath, mine);
    logEvent('stations_removed', { owner: me(), placed: mine.length, removed: n });
  }

  /** The hostile mob that dealt the hit that just cost health, or null (a fall, a passive mob, too far, unknown). */
  function attackerOf(hit) {
    if (!namesSources) {
      try {
        const m = nearbyMobs(bot, { radius: ATTACKER_RANGE }).find((x) => x.hostile);
        return m ? { ...m, entity: bot.entities[m.id] ?? null } : null;
      } catch { return null; }
    }
    const e = hit && Date.now() - hit.at <= HIT_MS ? hit.source : null;
    if (!e?.position || bot.registry.entitiesByName[e.name]?.category !== 'Hostile mobs') return null;
    const distance = Math.round(e.position.distanceTo(bot.entity.position) * 10) / 10;
    return distance <= HIT_RANGE ? { name: e.name, id: e.id, distance, entity: e } : null;
  }

  function setupMovements() {
    if (movements || !bot.pathfinder) return;
    try {
      movements = makeMovements(bot);
      bot.pathfinder.setMovements(movements);
      if (!(bot.pathfinder.thinkTimeout >= THINK_TIMEOUT_MS)) bot.pathfinder.thinkTimeout = THINK_TIMEOUT_MS;
    } catch (err) {
      movements = null;
      emit('error', { message: `pathfinder setup: ${describeError(err)}` });
    }
  }

  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {}); // a caller that never awaits ready must not crash the process

  // ---- reflexes -----------------------------------------------------------------------------------------------
  const hostileNear = (radius) => Boolean(safeCall(() => nearestHostile(bot, radius)));
  const lowHealth = () => (bot.health ?? 20) < FLEE_HEALTH;
  const inventoryKey = () => safeCall(() => JSON.stringify(inventoryOf(bot))) || '';
  /** Hungry, food at hand, no hostile mob near, and not just found without food. */
  function wantsToEat() {
    if (!reflexesOn || dead || (bot.food ?? 20) > FOOD_LOW || hostileNear(MOB_NEAR)) return false;
    if (noFoodAt !== null && noFoodAt === inventoryKey()) return false;
    if (!safeCall(() => bestSafeFood(bot))) { noFoodAt = inventoryKey(); return false; }
    return true;
  }

  /**
   * Something the body should do on its own now: interrupt the running skill for it (when that skill can go on
   * afterwards), or run it at once while no skill runs.
   * @param {{kind: 'fight'|'flee'|'eat', mob?: object, why: string}} r
   */
  function requestReflex(r) {
    if (!reflexesOn || phase !== 'ready' || dead) return;
    const job = current;
    if (job) {
      if (job.reflex || job.inReflex || job.controller.signal.aborted || KEEP_ON_HIT.has(job.tool)) return;
      if (r.kind === 'eat' && !['go_to', 'collect', 'build'].includes(job.tool)) return; // short skills: eat afterwards
      job.reflex = r;
      job.attempt?.abort({ kind: 'reflex', reason: r.why });
      return;
    }
    if (idle) return;
    const controller = new AbortController();
    const job0 = { tool: 'reflex', call: 'reflex', controller, cleanups: new Set(), stopNote: null, progress: {}, resumed: null, phases: createPhases() };
    const done = (async () => {
      const started = Date.now();
      try {
        const rx = await reflexRound(job0, controller, r);
        notes.push(...rx.notes);
        if (rx.retreated) notes.push(`health is ${Math.round(bot.health)}/20: rest or eat before you go on`);
      } catch { /* stopped or died: nothing to report */ }
      cancelActions('reflex');
      closeOpenWindow();
      for (const fn of job0.cleanups) { try { fn(); } catch { /* best effort */ } }
      logEvent('reflex_idle', { kind: r.kind, ms: Date.now() - started });
    })().finally(() => { idle = null; });
    idle = { controller, done };
  }

  /** One round of reflexes under `controller` (a job's, or the idle one's). */
  async function reflexRound(job, controller, r) {
    const stopped = stoppedPromise(controller.signal, 'reflex');
    const ctx = makeContext(job, controller, stopped);
    const t0 = Date.now();
    const healthBefore = bot.health;
    const kinds = [];
    const notes = [];
    try {
      const rx = await Promise.race([
        runReflexes(ctx, r, {
          lowHealth,
          notes,
          onAction: (kind, mob) => {
            kinds.push(mob ? `${kind} ${mob.name}` : kind);
            // for the live caption ("Fighting a zombie", "Eating"); a run gets no caption
            const evt = kind === 'fight' ? { tool: 'attack', args: { target: mob.name } } : kind === 'eat' ? { tool: 'eat', args: {} } : { tool: 'flee', args: {} };
            emit('skill', { phase: 'start', ...evt, reflex: true });
          },
        }),
        stopped,
      ]);
      logEvent('reflex', { trigger: r.kind, why: r.why, did: kinds, health: [healthBefore, bot.health], food: bot.food, retreated: rx.retreated, ms: Date.now() - t0, during: job.tool });
      return rx;
    } catch (err) {
      // a death or a stop cut it short: what it did so far still goes into the result
      logEvent('reflex', { trigger: r.kind, why: r.why, did: kinds, health: [healthBefore, bot.health], food: bot.food, cut: describeError(err), ms: Date.now() - t0, during: job.tool });
      return { notes, retreated: false, cut: true };
    } finally {
      cancelActions('reflex');
    }
  }

  // looks around every WATCH_MS: a creeper about to blow, or hunger
  const watcher = reflexesOn ? setInterval(() => {
    if (phase !== 'ready' || dead || !bot.entity?.position) return;
    const creeper = safeCall(() => nearestHostile(bot, CREEPER_NEAR, (e) => e.name === 'creeper'));
    if (creeper) { requestReflex({ kind: 'flee', mob: creeper, why: `a creeper is ${Math.round(creeper.position.distanceTo(bot.entity.position))} blocks away` }); return; }
    if (!current && !idle && wantsToEat()) requestReflex({ kind: 'eat', why: `food is ${bot.food}/20` });
    else if (current && wantsToEat()) requestReflex({ kind: 'eat', why: `food is ${bot.food}/20` });
  }, WATCH_MS) : null;
  watcher?.unref?.();

  // ---- bot events ---------------------------------------------------------------------------------------------
  const handlers = {
    spawn() {
      dead = false;
      lastHealth = bot.health ?? null;
      fixDigTime(bot); // mineflayer's own plugins (digging) load a tick after the bot is created
      if (phase !== 'connecting') return; // a respawn after a death
      phase = 'ready';
      setupMovements();
      resolveReady();
      logEvent('bot_ready', { username: bot.username, version: bot.version });
      emit('ready', { username: bot.username, version: bot.version });
    },
    chat(username, message) {
      if (!username || username === bot.username) return;
      emit('chat', { username: clip(oneLine(username), 40), message: clip(oneLine(message), 256) });
    },
    death() {
      dead = true;
      const at = bot.entity?.position;
      const where = at ? `${Math.floor(at.x)} ${Math.floor(at.y)} ${Math.floor(at.z)}` : 'unknown';
      logEvent('death', { position: where });
      emit('death', { position: where });
      const what = `you died at ${where}; your items were dropped there (they vanish after 5 minutes)`;
      idle?.controller.abort({ kind: 'stopped', reason: what });
      if (current) stop(what).catch(() => {});
      else lastResult = `${what}; you respawn at the world spawn`;
    },
    entityHurt(entity, source) {
      if (entity === bot.entity) lastHit = { source: source ?? null, at: Date.now() };
    },
    health() {
      const h = bot.health;
      const hurt = lastHealth != null && h < lastHealth && h > 0;
      lastHealth = h;
      const hit = lastHit;
      if (hurt) lastHit = null;
      if (!hurt) return;
      const attacker = attackerOf(hit);
      if (!attacker) return;
      if (reflexesOn) {
        const job = current;
        if (job?.inReflex || idle) return; // already dealing with it (a fight checks its health between swings)
        const flee = h < FLEE_HEALTH || attacker.name === 'creeper';
        const why = `a ${attacker.name} hit you (health ${Math.round(h)}/20, ${attacker.distance} blocks away)`;
        const mob = attacker.entity ?? bot.entities[attacker.id];
        if (!mob) return;
        if (job && KEEP_ON_HIT.has(job.tool)) return;
        logEvent('attacked', { mob: attacker.name, health: h, distance: attacker.distance, tool: job?.tool ?? null, reflex: flee ? 'flee' : 'fight' });
        requestReflex({ kind: flee ? 'flee' : 'fight', mob, why });
        return;
      }
      // reflexes off: a hit from a hostile mob stops a long skill (collect, go_to, craft...) so the player can fight or flee
      const job = current;
      if (!job || KEEP_ON_HIT.has(job.tool) || job.controller.signal.aborted) return;
      if (grace && grace.id === attacker.id && Date.now() < grace.until && h > OFF_FLEE_HEALTH) return; // fleeing or fighting it
      grace = { id: attacker.id, until: Date.now() + GRACE_MS };
      logEvent('attacked', { mob: attacker.name, health: h, distance: attacker.distance, tool: job.tool });
      stop(attackedText(attacker, h)).catch(() => {});
    },
    kicked(reason) { kickReason = clip(oneLine(textOf(reason)), 200); },
    error(err) {
      lastError = describeError(err);
      logEvent('bot_error', { message: lastError });
      emit('error', { message: lastError });
    },
    end(reason) {
      if (phase === 'ended') return;
      const wasConnecting = phase === 'connecting';
      phase = 'ended';
      if (watcher) clearInterval(watcher);
      const why = kickReason ? `kicked: ${kickReason}` : clip(oneLine(textOf(reason ?? 'disconnected')), 200);
      if (current && !current.controller.signal.aborted) current.controller.abort({ kind: 'stopped', reason: 'disconnected' });
      idle?.controller.abort({ kind: 'stopped', reason: 'disconnected' });
      releaseStations().catch(() => {});
      logEvent('disconnect', { reason: why });
      emit('end', { reason: why });
      if (wasConnecting) rejectReady(new Error(`could not join the Minecraft server: ${lastError ?? why}`));
    },
  };
  for (const [event, fn] of Object.entries(handlers)) bot.on(event, fn);

  /** The old answer to a hit (reflexes off, or too many in one skill): stop and let the player fight or flee. */
  function attackedText(attacker, h) {
    const target = ATTACK_TARGETS.includes(attacker.name) ? attacker.name : 'nearest_hostile';
    return `a ${attacker.name} is attacking you (health ${Math.round(h)}/20, ${attacker.distance} blocks away); fight back with attack ${target}, or go_to somewhere safe (for ${GRACE_MS / 1000} s its hits will not stop you again unless your health drops to ${OFF_FLEE_HEALTH})`;
  }

  // the block being broken (by a skill or by pathfinder on the way), for the live views' crack overlay: mineflayer
  // sets targetDigBlock once the dig has started (after the turn to look at it) and clears it when the dig ends
  let dig = null; // {x, y, z, name, ms, at}
  function watchDig() {
    const b = bot.targetDigBlock;
    const p = b?.position;
    if (!p) {
      if (dig) { dig = null; emit('dig', null); }
      return;
    }
    if (dig && dig.x === p.x && dig.y === p.y && dig.z === p.z) return;
    const ms = Number(safeCall(() => bot.digTime(b))) || 0;
    dig = { x: p.x, y: p.y, z: p.z, name: String(b.name ?? ''), ms: Number.isFinite(ms) ? Math.round(ms) : 0, at: Date.now() };
    emit('dig', { x: dig.x, y: dig.y, z: dig.z, name: dig.name, ms: dig.ms });
  }
  bot.on('physicsTick', watchDig); // every 50 ms on a real bot

  if (injected) {
    setupMovements();
    resolveReady();
    setImmediate(() => emit('ready', { username: bot.username, version: bot.version }));
  }

  // ---- running skills -----------------------------------------------------------------------------------------
  const reasonText = (reason, tool) => (reason?.kind === 'timeout'
    ? `timed out after ${Math.round(timeouts[tool] / 100) / 10} s; ${tool} was cancelled`
    : `stopped: ${reason?.reason ?? 'stop requested'}`);

  const safe = (fn) => {
    try {
      const r = fn();
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch { /* nothing to cancel */ }
  };

  function cancelActions(tool) {
    safe(() => bot.pathfinder?.stop());
    safe(() => bot.pathfinder?.setGoal(null));
    safe(() => bot.stopDigging?.());
    if (tool === 'eat' || tool === 'reflex') safe(() => bot.deactivateItem?.());
    safe(() => bot.clearControlStates?.());
  }

  /**
   * Close a crafting or furnace window a skill left open. mineflayer's craft() cannot be aborted: closing its window
   * makes it fail at once instead of clicking on in the background while the next skill runs.
   */
  function closeOpenWindow() {
    safe(() => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); });
  }

  /** A promise that rejects with SkillStop once the signal aborts. */
  function stoppedPromise(signal, tool) {
    const p = new Promise((_, reject) => {
      const fire = () => reject(new SkillStop(reasonText(signal.reason, tool)));
      if (signal.aborted) fire(); else signal.addEventListener('abort', fire, { once: true });
    });
    p.catch(() => {});
    return p;
  }

  function makeContext(job, controller, stopped) {
    const { signal } = controller;
    const check = () => { if (signal.aborted) throw new SkillStop(signal.reason?.reason ?? signal.reason?.kind ?? 'stopped'); };
    const wait = async (promise) => {
      check();
      const value = await Promise.race([Promise.resolve(promise), stopped]);
      check();
      return value;
    };
    const ctx = {
      bot,
      config: cfg,
      timing,
      signal,
      check,
      wait,
      stations,
      /**
       * Run fn as one phase of this skill's time (createPhases), or add ms measured by hand; the result reports the
       * sums (src/skills/util.js timed).
       */
      phase: (name, fn) => (typeof fn === 'function' ? job.phases.run(name, fn) : job.phases.add(name, fn)),
      sleep(ms) {
        let timer;
        return wait(new Promise((r) => { timer = setTimeout(r, ms); })).finally(() => clearTimeout(timer));
      },
      /**
       * A progress watch for a walk of several legs (go_to): pass it to each goto as `watch`, and the legs together
       * must keep getting closer by distance() (blocks), not each one on its own.
       */
      walkWatch(distance) {
        return createWalkWatch(bot, { distance, windowMs: timing.progressMs, gain: timing.progressGain });
      },
      /**
       * Walk to a pathfinder goal by the body's walking rules. timeoutMs (optional) gives up on a walk that takes too
       * long; watch (optional, from walkWatch) is shared with the other legs of the same trip, otherwise the walk
       * watches its own progress toward the goal; thinkMs and searchRadius (optional) bound pathfinder's search for
       * this walk (roadmap M2, S8: a collect walk gets a short one, a go_to hop the full THINK_TIMEOUT_MS).
       * Afterwards the goal is always cleared: pathfinder's goto settles on "no path", a partial path, a search
       * timeout or an empty path while its goal is still set, and the bot would walk on into the next skill.
       */
      goto(goal, opts) {
        return job.phases.run('path', () => ctx.walk(goal, opts));
      },
      async walk(goal, { timeoutMs = 0, watch = null, thinkMs = 0, searchRadius = 0 } = {}) {
        check();
        if (watch?.error) throw watch.error;
        if (movements) bot.pathfinder.setMovements(movements);
        let timer;
        let stuckTimer;
        let failStuck;
        const stuck = new Promise((_, reject) => { failStuck = reject; });
        stuck.catch(() => {});
        // pathfinder gives up on a path it cannot follow ("stuck") and plans the same one again, forever: count those
        // resets and give up when the bot gets no closer, and give up when it stands still for long without digging.
        // Digging and building are not progress either: the watch gives up when the bot does not get closer.
        const away = () => {
          try { return goal.heuristic?.(bot.entity.position.floored()) ?? 0; } catch { return 0; }
        };
        const progress = watch ?? createWalkWatch(bot, { distance: away, windowMs: timing.progressMs, gain: timing.progressGain });
        const early = progress.sample(); // a shared watch may have run out between two legs
        if (early) throw early;
        let best = away();
        let resets = 0;
        const onReset = (why) => {
          progress.reset(why);
          if (why !== 'stuck') return;
          const d = away();
          if (d < best - 1) { best = d; resets = 0; return; }
          if (++resets >= STUCK_RESETS) failStuck(progress.explain('got stuck on the way (pathfinder could not follow its path)'));
        };
        let last = bot.entity.position.clone?.() ?? null;
        let still = 0;
        if (last) {
          stuckTimer = setInterval(() => {
            const stalled = progress.sample();
            if (stalled) { failStuck(stalled); return; }
            const now = bot.entity.position;
            const busy = safeCall(() => bot.pathfinder.isMining?.()) || safeCall(() => bot.pathfinder.isBuilding?.()) || bot.targetDigBlock;
            if (busy || now.distanceTo(last) > 0.5) { last = now.clone(); still = 0; return; }
            still += STILL_CHECK_MS;
            if (still >= timing.stillMs) failStuck(progress.explain(`stood still for ${Math.round(timing.stillMs / 1000)} s without getting closer`));
          }, STILL_CHECK_MS);
        }
        const pfx = bot.pathfinder;
        const saved = { thinkTimeout: pfx.thinkTimeout, searchRadius: pfx.searchRadius };
        if (thinkMs > 0) pfx.thinkTimeout = thinkMs;
        if (searchRadius > 0) pfx.searchRadius = searchRadius;
        bot.on('path_reset', onReset);
        const walk = pfx.goto(goal);
        const limit = timeoutMs > 0
          ? new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('the walk took too long'), { name: 'WalkTimeout' })), timeoutMs); })
          : null;
        try {
          await wait(Promise.race(limit ? [walk, limit, stuck] : [walk, stuck]));
        } finally {
          progress.sample();
          clearTimeout(timer);
          clearInterval(stuckTimer);
          bot.removeListener('path_reset', onReset);
          if (pfx.goal) safe(() => pfx.setGoal(null));
          pfx.thinkTimeout = saved.thinkTimeout;
          pfx.searchRadius = saved.searchRadius;
        }
      },
      /** A note added to the result if the skill is stopped or times out, e.g. where items were left. null clears it. */
      stopNote(text) {
        job.stopNote = text ? clip(oneLine(text), 200) : null;
      },
      /** What the skill has done so far ({mined: 3}), for running it on after a reflex interrupted it. */
      progress(p) {
        job.progress = { ...job.progress, ...p };
      },
      /** What an earlier try of this skill did before a reflex interrupted it (null on a first try). */
      resumed: job.resumed,
      /** The skill's time limit in ms (it is cancelled after that). */
      timeoutMs: timeouts[job.tool],
      onCleanup(fn) {
        job.cleanups.add(fn);
        return () => job.cleanups.delete(fn);
      },
      state: () => state(),
    };
    return ctx;
  }

  /** Wait (bounded) until a dead bot has respawned. */
  async function respawned() {
    const until = Date.now() + RESPAWN_MS;
    while (dead && phase === 'ready' && Date.now() < until) await new Promise((r) => { setTimeout(r, 100); });
  }

  /** Inventory sync around a skill, skipped when the last one is under a second old and nothing changed since (S10). */
  async function sync(job) {
    if (inventoryFresh(bot)) return;
    await job.phases.run('sync', () => syncInventory(bot, Math.min(1_500, timing.windowMs)));
  }

  /**
   * Before a skill: take finished background smelts within reach, and eat when hungry and safe (a reflex). Never
   * throws for a game failure; returns notes for the result.
   */
  async function chores(job, tool) {
    const out = [];
    const ctx = makeContext(job, job.controller, stoppedPromise(job.controller.signal, tool));
    if (smeltJobs(bot).some((j) => Date.now() >= j.readyAt)) {
      try {
        const note = await fetchSmelted(ctx, { wait: false, walk: 0 });
        if (note) out.push(`your furnaces finished: ${note.replace(/^ \(|\)$/g, '')}`);
      } catch (err) { if (!(err instanceof SkillStop)) out.push(`could not empty a furnace: ${describeError(err)}`); }
    }
    if (tool !== 'eat' && tool !== 'attack' && wantsToEat()) {
      try {
        const rx = await job.phases.run('reflex', () => reflexRound(job, job.controller, { kind: 'eat', why: `food is ${bot.food}/20` }));
        out.push(...rx.notes);
      } catch { /* stopped */ }
    }
    return out;
  }

  async function execute(job, args) {
    const { tool, controller } = job;
    const { signal } = controller;
    const started = Date.now();
    const quick = tool === 'get_state' || tool === 'say';
    if (idle && !quick) {
      let t;
      await Promise.race([idle.done, new Promise((r) => { t = setTimeout(r, IDLE_REFLEX_WAIT_MS); })]);
      clearTimeout(t);
    }
    const done = [...notes];
    notes = [];
    if (!quick) {
      if (dead) await respawned();
      // the inventory as the server has it (changes still on their way belong to the previous action)
      await sync(job);
    }
    const before = inventoryOf(bot);
    if (!quick && reflexesOn) done.push(...await chores(job, tool));
    emit('skill', { phase: 'start', tool, args });
    let deadline = Date.now() + timeouts[tool];
    let timer = setTimeout(() => controller.abort({ kind: 'timeout' }), timeouts[tool]);

    let out;
    let rounds = 0;
    let meals = 0;
    /**
     * Deal with the reflex the job was interrupted for (the skill's clock stops meanwhile). Returns a final result when
     * the skill must not go on (stopped, retreated, too many rounds, nothing to resume), else null.
     */
    const handleReflex = async () => {
      const reflex = job.reflex;
      const t0 = Date.now();
      clearTimeout(timer);
      job.inReflex = reflex;
      let rx = { notes: [], retreated: false };
      try {
        // the reflex's own walking and fighting count as reflex (a phase inside another counts toward the outer one)
        rx = await job.phases.run('reflex', () => reflexRound(job, controller, reflex));
      } catch { /* stopped or died during the reflex: handled below */ }
      job.inReflex = null;
      job.reflex = null;
      deadline += Date.now() - t0;
      timer = setTimeout(() => controller.abort({ kind: 'timeout' }), Math.max(0, deadline - Date.now()));
      done.push(...rx.notes);
      const sofar = job.stopNote ? `; ${job.stopNote}` : '';
      if (signal.aborted) return { ok: false, result: `${reasonText(signal.reason, tool)}${sofar}` };
      if (rx.retreated) {
        return { ok: false, result: `retreated: ${reflex.why}, and with health ${Math.round(bot.health)}/20 you ran instead of fighting; ${tool} was not finished${sofar}. Rest or eat, then call it again` };
      }
      if (reflex.kind === 'eat' ? ++meals > MAX_MEALS : ++rounds >= MAX_REFLEX_ROUNDS) {
        const why = reflex.kind === 'eat' ? `the bot kept getting hungry (${meals} meals)` : `mobs kept attacking (${rounds} times)`;
        return { ok: false, result: `stopped: ${why}; ${tool} was not finished${sofar}` };
      }
      if (job.started && !resumable(tool, job.progress)) return { ok: false, result: `stopped: ${reflex.why}; ${tool} was not finished${sofar}` };
      if (job.started) job.resumed = { ...job.progress };
      job.stopNote = null;
      emit('skill', { phase: 'start', tool, args, resumed: true });
      return null;
    };
    for (;;) {
      if (job.reflex) { // a hit or hunger before the skill (re)started: deal with it first
        out = await handleReflex();
        if (out) break;
      }
      const attempt = childController(signal);
      job.attempt = attempt;
      job.started = true;
      const stopped = stoppedPromise(attempt.signal, tool);
      let interrupted = false;
      const work = Promise.resolve().then(() => SKILLS[tool](makeContext(job, attempt, stopped), args));
      work.catch(() => {});
      try {
        out = await Promise.race([work, stopped]);
      } catch (err) {
        if (attempt.signal.aborted) interrupted = true;
        else out = { ok: false, result: describeError(err) };
      }
      job.attempt = null;
      if (!interrupted) break;
      cancelActions(tool);
      let graceTimer;
      await Promise.race([work.catch(() => {}), new Promise((r) => { graceTimer = setTimeout(r, timing.graceMs); })]);
      clearTimeout(graceTimer);
      for (const fn of job.cleanups) { try { fn(); } catch { /* best effort */ } }
      job.cleanups.clear();
      closeOpenWindow();
      if (signal.aborted || attempt.signal.reason?.kind !== 'reflex' || !job.reflex) {
        out = { ok: false, result: `${reasonText(signal.reason ?? attempt.signal.reason, tool)}${job.stopNote ? `; ${job.stopNote}` : ''}` };
        break;
      }
    }
    clearTimeout(timer);
    job.attempt = null;
    for (const fn of job.cleanups) {
      try { fn(); } catch { /* best effort */ }
    }
    closeOpenWindow();
    // items picked up, crafted or put back arrive from the server a moment later: count them in this action
    if (!quick) await sync(job);

    const delta = inventoryDelta(before, inventoryOf(bot));
    const ms = Date.now() - started;
    const text = String(out?.result ?? 'the skill returned nothing');
    const reflexText = done.length ? ` [on its own: ${done.join('; ')}]` : '';
    const result = {
      ok: Boolean(out?.ok),
      result: clip(`${text}${reflexText}`, 4_000),
      delta,
      ms,
      phases: job.phases.totals(ms),
    };
    if (done.length) result.reflexes = done;
    if (tool !== 'get_state') {
      const change = Object.keys(delta).length ? ` (inventory: ${describeDelta(delta)})` : '';
      lastResult = `${job.call} -> ${result.ok ? 'ok' : 'failed'}: ${clip(result.result, 300)}${change}`;
    }
    current = null;
    emit('skill', { phase: 'end', tool, args, ...result });
    // a hit that came while the skill was finishing: deal with it now that no skill runs
    if (job.reflex && !signal.aborted) requestReflex(job.reflex);
    return result;
  }

  /** @type {import('./contracts.js').Body['run']} */
  function run(tool, args) {
    const checked = validateArgs(tool, args);
    if (!checked.ok) return Promise.resolve({ ok: false, result: checked.error, delta: {}, ms: 0 });
    if (phase !== 'ready') {
      return Promise.resolve({ ok: false, result: phase === 'ended' ? 'not connected to the game' : 'not in the game yet', delta: {}, ms: 0 });
    }
    if (current) return Promise.resolve({ ok: false, result: `busy: ${current.call} is still running`, delta: {}, ms: 0 });
    const job = {
      tool, call: describeCall(tool, checked.args), controller: new AbortController(), cleanups: new Set(), done: null, stopNote: null,
      progress: {}, resumed: null, reflex: null, inReflex: null, attempt: null, phases: createPhases(),
    };
    current = job;
    job.done = execute(job, checked.args);
    return job.done;
  }

  /** Kill switch: cancel the running skill (and any reflex) and any walking or digging; the bot stays connected. */
  async function stop(reason = 'stop requested') {
    const why = clip(oneLine(reason), 240) || 'stop requested';
    const job = current;
    cancelActions(job?.tool);
    logEvent('stop', { reason: why, tool: job?.tool ?? null });
    idle?.controller.abort({ kind: 'stopped', reason: why });
    if (job && !job.controller.signal.aborted) job.controller.abort({ kind: 'stopped', reason: why });
    if (job) await job.done;
    if (idle) await idle.done.catch(() => {});
  }

  async function close() {
    await stop('closing');
    if (watcher) clearInterval(watcher);
    // the game is over: the stations this bot placed go (while the bot is still in the world, its chunks are loaded)
    await releaseStations().catch(() => {});
    if (phase === 'ended') return;
    try { bot.quit('closing'); } catch { /* already gone */ }
    handlers.end('closing'); // a real bot reports 'end' later; mark it ended now (the second call is ignored)
  }

  // ---- state --------------------------------------------------------------------------------------------------
  function snapshot() {
    if (!bot.entity?.position) {
      return {
        health: 0, food: 0, oxygen: 20, position: { x: 0, y: 0, z: 0 }, facing: 'north', dimension: 'overworld',
        timeOfDay: 0, isDay: true, inventory: {}, held: null, nearbyBlocks: [], mobs: [], goal, busy: false,
        doing: null, lastResult, connected: false,
      };
    }
    const s = snapshotOf(bot, { goal, busy: Boolean(current), doing: current?.call ?? null, lastResult });
    s.connected = phase === 'ready';
    const smelting = safeCall(() => describeSmelting(bot));
    if (smelting) s.smelting = smelting;
    const mine = stations.list();
    if (mine.length) s.stations = mine.map((x) => ({ name: x.name, ...x.pos }));
    return s;
  }

  function state() {
    if (phase === 'connecting' || !bot.entity?.position) return 'not in the game yet (connecting to the Minecraft server)';
    const text = renderState(snapshot());
    return phase === 'ended' ? `DISCONNECTED from the game\n${text}` : text;
  }

  return {
    ready,
    state,
    snapshot,
    inventory: () => inventoryOf(bot),
    digging: () => (dig ? { x: dig.x, y: dig.y, z: dig.z, name: dig.name, ms: dig.ms, elapsed: Date.now() - dig.at } : null),
    setGoal(next) {
      goal = next == null ? null : clip(oneLine(next), 300) || null;
    },
    get busy() { return current !== null; },
    get connected() { return phase === 'ready'; },
    get bot() { return bot; },
    run,
    stop,
    close,
    on(event, fn) {
      if (!listeners.has(event)) throw new Error(`unknown body event "${event}" (one of ${BODY_EVENTS.join(', ')})`);
      listeners.get(event).add(fn);
      return () => listeners.get(event).delete(fn);
    },
  };
}
