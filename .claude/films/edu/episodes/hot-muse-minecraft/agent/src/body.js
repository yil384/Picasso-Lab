// src/body.js - the bot body: a mineflayer bot (or an injected stand-in such as test/fake-bot.js) driven only through
// the 10 whitelisted skills in src/skills. run() validates arguments against the tool schemas, runs one skill at a time
// under its timeout and reports the inventory change; stop() is the kill switch. Minecraft is reached on localhost or
// the LAN only, with offline auth.

import { createRequire } from 'node:module';
import pf from 'mineflayer-pathfinder';
import { config as defaultConfig, isLanHost } from './config.js';
import { validateArgs, inventoryDelta, TOOL_TIMEOUTS_MS, BODY_EVENTS } from './contracts.js';
import { snapshotOf, renderState, inventoryOf, describeCall, describeDelta, nearbyMobs } from './state.js';
import { SKILLS } from './skills/index.js';
import { SkillStop, describeError } from './skills/util.js';
import { syncInventory } from './skills/window.js';
import { createWalkWatch } from './walk-watch.js';
import { ATTACK_TARGETS } from './game.js';

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
 * failed, digging and building included (src/walk-watch.js).
 */
export const DEFAULT_TIMING = Object.freeze({
  pollMs: 500, stallMs: 15_000, graceMs: 1_500, openMs: 5_000, windowMs: 4_000, stillMs: 20_000, progressMs: 22_000, progressGain: 3,
});
/** A walk gives up after this many "stuck" path resets in a row that bring the bot no closer. */
const STUCK_RESETS = 3;
const STILL_CHECK_MS = 500;
/** How long a skill waits for the respawn after a death before it runs. */
const RESPAWN_MS = 10_000;
/**
 * A hit from a hostile mob stops the running skill. Servers from 1.19.4 name who dealt each hit (damage_event, which
 * mineflayer reports as entityHurt just before the health update it causes): the mob named, up to HIT_RANGE blocks
 * away (a skeleton shoots from 15), and nothing for damage without a source (a fall, drowning, fire, hunger). Older
 * servers: a hostile mob within ATTACKER_RANGE when the bot loses health is taken as the attacker.
 */
const HIT_RANGE = 24;
const HIT_MS = 1_500;
const ATTACKER_RANGE = 6;
/** After a hit stopped a skill, that mob's hits stop nothing for GRACE_MS (time to flee or to fight), unless health drops to FLEE_HEALTH. */
const GRACE_MS = 10_000;
const FLEE_HEALTH = 6;
/** Skills a hit does not interrupt (they deal with the mob or the hunger themselves). */
const KEEP_ON_HIT = new Set(['attack', 'eat', 'get_state', 'say']);
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
  return mineflayer.createBot({ host, port, username, version, auth: 'offline', logErrors: false, hideErrors: true });
}

/** pathfinder and tool, each only if the bot does not have it yet. */
function loadPlugins(bot) {
  if (!bot.pathfinder) bot.loadPlugin(pathfinder);
  if (!bot.tool) bot.loadPlugin(requireFromCollect('mineflayer-tool').plugin);
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

/**
 * @param {object} [opts]
 * @param {object} [opts.bot]        an existing bot (tests: test/fake-bot.js); otherwise one is created from config.mc
 * @param {object} [opts.config]     default: the process config
 * @param {object} [opts.log]        a Logger; the body logs stop, death, disconnect and bot errors as events
 * @param {Partial<typeof TOOL_TIMEOUTS_MS>} [opts.timeouts]   per-tool overrides (tests)
 * @param {Partial<typeof DEFAULT_TIMING>} [opts.timing]       overrides (tests)
 * @returns {import('./contracts.js').Body & {bot: object, connected: boolean}}
 */
export function createBody(opts = {}) {
  const cfg = opts.config ?? defaultConfig;
  const log = opts.log ?? null;
  const timeouts = { ...TOOL_TIMEOUTS_MS, ...(opts.timeouts ?? {}) };
  const timing = { ...DEFAULT_TIMING, ...(opts.timing ?? {}) };
  const injected = Boolean(opts.bot);
  const bot = opts.bot ?? connect(cfg);
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
  let movements = null;
  let kickReason = null;
  let lastError = null;
  let dead = false;
  let lastHealth = null;
  let lastHit = null; // {source, at}: the latest hit on the bot the server reported, with who dealt it (or null)
  let grace = null; // {id, until}: the mob whose hits stop nothing until then
  const namesSources = safeCall(() => Boolean(bot.registry.version['>=']('1.19.4')));

  /** The hostile mob that dealt the hit that just cost health, or null (a fall, a passive mob, too far, unknown). */
  function attackerOf(hit) {
    if (!namesSources) {
      try { return nearbyMobs(bot, { radius: ATTACKER_RANGE }).find((m) => m.hostile) ?? null; } catch { return null; }
    }
    const e = hit && Date.now() - hit.at <= HIT_MS ? hit.source : null;
    if (!e?.position || bot.registry.entitiesByName[e.name]?.category !== 'Hostile mobs') return null;
    const distance = Math.round(e.position.distanceTo(bot.entity.position) * 10) / 10;
    return distance <= HIT_RANGE ? { name: e.name, id: e.id, distance } : null;
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

  // ---- bot events ---------------------------------------------------------------------------------------------
  const handlers = {
    spawn() {
      dead = false;
      lastHealth = bot.health ?? null;
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
      if (current) stop(what).catch(() => {});
      else lastResult = `${what}; you respawn at the world spawn`;
    },
    entityHurt(entity, source) {
      if (entity === bot.entity) lastHit = { source: source ?? null, at: Date.now() };
    },
    health() {
      // a hit from a hostile mob stops a long skill (collect, go_to, craft...) so the player can fight or flee
      const h = bot.health;
      const hurt = lastHealth != null && h < lastHealth && h > 0;
      lastHealth = h;
      const hit = lastHit;
      if (hurt) lastHit = null;
      const job = current;
      if (!hurt || !job || KEEP_ON_HIT.has(job.tool) || job.controller.signal.aborted) return;
      const attacker = attackerOf(hit);
      if (!attacker) return;
      if (grace && grace.id === attacker.id && Date.now() < grace.until && h > FLEE_HEALTH) return; // fleeing or fighting it
      grace = { id: attacker.id, until: Date.now() + GRACE_MS };
      const target = ATTACK_TARGETS.includes(attacker.name) ? attacker.name : 'nearest_hostile';
      const why = `a ${attacker.name} is attacking you (health ${Math.round(h)}/20, ${attacker.distance} blocks away); fight back with attack ${target}, or go_to somewhere safe (for ${GRACE_MS / 1000} s its hits will not stop you again unless your health drops to ${FLEE_HEALTH})`;
      logEvent('attacked', { mob: attacker.name, health: h, distance: attacker.distance, tool: job.tool });
      stop(why).catch(() => {});
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
      const why = kickReason ? `kicked: ${kickReason}` : clip(oneLine(textOf(reason ?? 'disconnected')), 200);
      if (current && !current.controller.signal.aborted) current.controller.abort({ kind: 'stopped', reason: 'disconnected' });
      logEvent('disconnect', { reason: why });
      emit('end', { reason: why });
      if (wasConnecting) rejectReady(new Error(`could not join the Minecraft server: ${lastError ?? why}`));
    },
  };
  for (const [event, fn] of Object.entries(handlers)) bot.on(event, fn);

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
    if (tool === 'eat') safe(() => bot.deactivateItem?.());
    safe(() => bot.clearControlStates?.());
  }

  /**
   * Close a crafting or furnace window a skill left open. mineflayer's craft() cannot be aborted: closing its window
   * makes it fail at once instead of clicking on in the background while the next skill runs.
   */
  function closeOpenWindow() {
    safe(() => { if (bot.currentWindow) bot.closeWindow(bot.currentWindow); });
  }

  function makeContext(job, stopped) {
    const { signal } = job.controller;
    const check = () => { if (signal.aborted) throw new SkillStop(signal.reason?.reason ?? signal.reason?.kind ?? 'stopped'); };
    const wait = async (promise) => {
      check();
      const value = await Promise.race([Promise.resolve(promise), stopped]);
      check();
      return value;
    };
    return {
      bot,
      config: cfg,
      timing,
      signal,
      check,
      wait,
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
       * watches its own progress toward the goal. Afterwards the goal is always cleared: pathfinder's goto settles on
       * "no path", a partial path, a search timeout or an empty path while its goal is still set, and the bot would
       * walk on into the next skill.
       */
      async goto(goal, { timeoutMs = 0, watch = null } = {}) {
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
        bot.on('path_reset', onReset);
        const walk = bot.pathfinder.goto(goal);
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
          if (bot.pathfinder.goal) safe(() => bot.pathfinder.setGoal(null));
        }
      },
      /** A note added to the result if the skill is stopped or times out, e.g. where items were left. null clears it. */
      stopNote(text) {
        job.stopNote = text ? clip(oneLine(text), 200) : null;
      },
      /** The skill's time limit in ms (it is cancelled after that). */
      timeoutMs: timeouts[job.tool],
      onCleanup(fn) {
        job.cleanups.add(fn);
        return () => job.cleanups.delete(fn);
      },
      state: () => state(),
    };
  }

  /** Wait (bounded) until a dead bot has respawned. */
  async function respawned() {
    const until = Date.now() + RESPAWN_MS;
    while (dead && phase === 'ready' && Date.now() < until) await new Promise((r) => { setTimeout(r, 100); });
  }

  async function execute(job, args) {
    const { tool, controller } = job;
    const { signal } = controller;
    const started = Date.now();
    const quick = tool === 'get_state' || tool === 'say';
    if (!quick) {
      if (dead) await respawned();
      // the inventory as the server has it (changes still on their way belong to the previous action)
      await syncInventory(bot, Math.min(1_500, timing.windowMs));
    }
    const before = inventoryOf(bot);
    emit('skill', { phase: 'start', tool, args });
    const timer = setTimeout(() => controller.abort({ kind: 'timeout' }), timeouts[tool]);
    const stopped = new Promise((_, reject) => {
      const fire = () => reject(new SkillStop(reasonText(signal.reason, tool)));
      if (signal.aborted) fire(); else signal.addEventListener('abort', fire, { once: true });
    });
    stopped.catch(() => {});
    const work = Promise.resolve().then(() => SKILLS[tool](makeContext(job, stopped), args));
    work.catch(() => {});

    let out;
    let interrupted = false;
    try {
      out = await Promise.race([work, stopped]);
    } catch (err) {
      if (signal.aborted) interrupted = true;
      else out = { ok: false, result: describeError(err) };
    }
    clearTimeout(timer);
    if (interrupted) {
      cancelActions(tool);
      let grace;
      await Promise.race([work.catch(() => {}), new Promise((r) => { grace = setTimeout(r, timing.graceMs); })]);
      clearTimeout(grace);
      out = { ok: false, result: `${reasonText(signal.reason, tool)}${job.stopNote ? `; ${job.stopNote}` : ''}` };
    }
    for (const fn of job.cleanups) {
      try { fn(); } catch { /* best effort */ }
    }
    closeOpenWindow();
    // items picked up, crafted or put back arrive from the server a moment later: count them in this action
    if (!quick) await syncInventory(bot, Math.min(1_500, timing.windowMs));

    const delta = inventoryDelta(before, inventoryOf(bot));
    const result = {
      ok: Boolean(out?.ok),
      result: clip(String(out?.result ?? 'the skill returned nothing'), 4_000),
      delta,
      ms: Date.now() - started,
    };
    if (tool !== 'get_state') {
      const change = Object.keys(delta).length ? ` (inventory: ${describeDelta(delta)})` : '';
      lastResult = `${job.call} -> ${result.ok ? 'ok' : 'failed'}: ${clip(result.result, 300)}${change}`;
    }
    current = null;
    emit('skill', { phase: 'end', tool, args, ...result });
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
    const job = { tool, call: describeCall(tool, checked.args), controller: new AbortController(), cleanups: new Set(), done: null, stopNote: null };
    current = job;
    job.done = execute(job, checked.args);
    return job.done;
  }

  /** Kill switch: cancel the running skill and any walking or digging; the bot stays connected. */
  async function stop(reason = 'stop requested') {
    const why = clip(oneLine(reason), 240) || 'stop requested';
    const job = current;
    cancelActions(job?.tool);
    logEvent('stop', { reason: why, tool: job?.tool ?? null });
    if (job && !job.controller.signal.aborted) job.controller.abort({ kind: 'stopped', reason: why });
    if (job) await job.done;
  }

  async function close() {
    await stop('closing');
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
