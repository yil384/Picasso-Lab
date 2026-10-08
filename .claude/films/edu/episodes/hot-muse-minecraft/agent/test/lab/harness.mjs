// test/lab/harness.mjs - shared code for the real-server labs: join a local Paper server as an offline bot with the
// body's walking rules, run a skill the way the body does (a context with goto / wait / check / sleep, a time limit and
// a walk watch), send console commands through the server's FIFO to set a stage up, and log each trial as JSONL in
// logs/. Console commands only ever SET UP a stage; nothing is sent to the console while a skill runs.
//
//   const lab = await openLab('Tst_m8');            // joins 127.0.0.1:25565 (LAB_HOST / LAB_PORT / LAB_CONSOLE)
//   lab.cmd('give Tst_m8 diamond_pickaxe 1');
//   const r = await lab.run('mine_diamonds', { n: 3 });

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import pf from 'mineflayer-pathfinder';
import { SKILLS } from '../../src/skills/index.js';
import { PROGRESSION_SKILLS, PROGRESSION_TIMEOUTS_MS } from '../../src/skills/progression/index.js';
import { TOOL_TIMEOUTS_MS } from '../../src/contracts.js';
import { SkillStop, describeError } from '../../src/skills/util.js';
import { createWalkWatch } from '../../src/walk-watch.js';
import { DEFAULT_TIMING } from '../../src/body.js';

const require = createRequire(import.meta.url);
const requireFromCollect = createRequire(require.resolve('mineflayer-collectblock'));
const { pathfinder, Movements } = pf;

export const HOST = process.env.LAB_HOST ?? '127.0.0.1';
export const PORT = Number(process.env.LAB_PORT ?? 25565);
export const CONSOLE = process.env.LAB_CONSOLE ?? path.join(os.homedir(), 'mc-lab', 'console.in');
const LOG_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../logs');

export const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const timing = DEFAULT_TIMING;

/** Send one console command to the lab server (stage setup only). */
export function cmd(line) {
  fs.appendFileSync(CONSOLE, `${line}\n`);
}

function makeMovements(bot) {
  const m = new Movements(bot);
  m.allowParkour = false;
  m.allowSprinting = true;
  for (const name of ['crafting_table', 'furnace', 'chest']) m.blocksCantBreak.add(bot.registry.blocksByName[name].id);
  return m;
}

/** A skill context like the body's makeContext (src/body.js), for one run. */
function makeCtx(bot, movements, controller, timeoutMs) {
  const { signal } = controller;
  const stopped = new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new SkillStop(String(signal.reason ?? 'stopped'))), { once: true });
  });
  stopped.catch(() => {});
  const check = () => { if (signal.aborted) throw new SkillStop(String(signal.reason ?? 'stopped')); };
  const wait = async (p) => { check(); const v = await Promise.race([Promise.resolve(p), stopped]); check(); return v; };
  const ctx = {
    bot, signal, check, wait, timeoutMs, timing,
    sleep(ms) { let t; return wait(new Promise((r) => { t = setTimeout(r, ms); })).finally(() => clearTimeout(t)); },
    walkWatch(distance) { return createWalkWatch(bot, { distance, windowMs: timing.progressMs, gain: timing.progressGain }); },
    async goto(goal, { timeoutMs: limitMs = 0, watch = null } = {}) {
      check();
      bot.pathfinder.setMovements(movements);
      const away = () => { try { return goal.heuristic?.(bot.entity.position.floored()) ?? 0; } catch { return 0; } };
      const progress = watch ?? createWalkWatch(bot, { distance: away, windowMs: timing.progressMs, gain: timing.progressGain });
      let failStuck;
      const stuck = new Promise((_, reject) => { failStuck = reject; });
      stuck.catch(() => {});
      const iv = setInterval(() => { const e = progress.sample(); if (e) failStuck(e); }, 500);
      let timer;
      const limit = limitMs > 0 ? new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('the walk took too long'), { name: 'WalkTimeout' })), limitMs); }) : null;
      try {
        await wait(Promise.race([bot.pathfinder.goto(goal), stuck, ...(limit ? [limit] : [])]));
      } finally {
        clearInterval(iv);
        clearTimeout(timer);
        if (bot.pathfinder.goal) try { bot.pathfinder.setGoal(null); } catch { /* */ }
      }
    },
    stopNote() {},
    onCleanup() { return () => {}; },
    state: () => '',
  };
  return ctx;
}

/**
 * Join the lab server and return the lab handle.
 * @param {string} username
 * @param {{log?: string}} [opts]  log: the JSONL file name in logs/ (default lab-<username>.jsonl)
 */
export async function openLab(username, opts = {}) {
  const mineflayer = require('mineflayer');
  const bot = mineflayer.createBot({ host: HOST, port: PORT, username, version: '1.21.4', auth: 'offline', hideErrors: true });
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(requireFromCollect('mineflayer-tool').plugin);
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('no spawn within 60 s')), 60_000);
    bot.once('spawn', () => { clearTimeout(t); resolve(); });
    bot.once('kicked', (r) => reject(new Error(`kicked: ${JSON.stringify(r)}`)));
    bot.once('error', reject);
  });
  const movements = makeMovements(bot);
  bot.pathfinder.setMovements(movements);
  bot.pathfinder.thinkTimeout = 15_000;
  const deaths = [];
  bot.on('death', () => deaths.push({ at: Date.now(), pos: bot.entity?.position?.floored?.().toString() }));
  bot.on('death', () => { try { bot.respawn?.(); } catch { /* */ } });
  // a short trace of every health loss (who was near) for the lab log; LAB_TRACE=1 prints it too
  let hp = bot.health;
  bot.on('health', () => {
    if (bot.health < hp) {
      const mob = Object.values(bot.entities).filter((e) => e !== bot.entity && e.position && e.type !== 'object' && e.name !== 'item')
        .map((e) => ({ n: e.name, d: Math.round(e.position.distanceTo(bot.entity.position) * 10) / 10 })).sort((a, b) => a.d - b.d)[0];
      const line = { hurt: Math.round((hp - bot.health) * 10) / 10, hp: Math.round(bot.health), food: bot.food, pos: bot.entity.position.floored().toString(), near: mob ? `${mob.n} ${mob.d}` : null };
      trace.push(line);
      if (process.env.LAB_TRACE) console.log('  hurt', JSON.stringify(line));
    }
    hp = bot.health;
  });
  const trace = [];
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const logFile = path.join(LOG_DIR, opts.log ?? `lab-${username}.jsonl`);
  let current = null;

  const lab = {
    bot,
    deaths,
    cmd,
    log(entry) { fs.appendFileSync(logFile, `${JSON.stringify({ t: new Date().toISOString(), ...entry })}\n`); },
    /** Run one skill (progression first, then the core ones) with its time limit; resolves to {ok, result, ms, deaths}. */
    async run(name, args = {}, { timeoutMs } = {}) {
      const fn = PROGRESSION_SKILLS[name] ?? SKILLS[name];
      if (!fn) throw new Error(`no skill ${name}`);
      const limit = timeoutMs ?? PROGRESSION_TIMEOUTS_MS[name] ?? TOOL_TIMEOUTS_MS[name] ?? 120_000;
      const controller = new AbortController();
      current = controller;
      const timer = setTimeout(() => controller.abort(`timed out after ${limit / 1000} s`), limit);
      const d0 = deaths.length;
      const h0 = trace.length;
      const t0 = Date.now();
      let out;
      try {
        out = await fn(makeCtx(bot, movements, controller, limit), args);
      } catch (err) {
        out = { ok: false, result: err instanceof SkillStop ? err.message : `threw: ${describeError(err)}` };
      } finally {
        clearTimeout(timer);
        current = null;
        try { bot.pathfinder.setGoal(null); bot.stopDigging(); bot.clearControlStates(); } catch { /* */ }
      }
      const r = { skill: name, args, ok: Boolean(out?.ok), result: String(out?.result ?? ''), ms: Date.now() - t0, deaths: deaths.length - d0, pos: bot.entity?.position?.floored?.().toString(), dim: bot.game?.dimension, hurts: trace.slice(h0).slice(-12) };
      lab.log(r);
      console.log(`[${name}] ${r.ok ? 'OK' : 'FAIL'} ${Math.round(r.ms / 1000)}s deaths=${r.deaths}: ${r.result.slice(0, 400)}`);
      return r;
    },
    stop() { current?.abort('stopped'); },
    count(name) { return bot.inventory.items().filter((i) => i.name === name).reduce((n, i) => n + i.count, 0); },
    /** Wait until the server has applied a teleport or a give: poll a test for up to ms. */
    async until(test, ms = 10_000) {
      const end = Date.now() + ms;
      while (Date.now() < end) { if (test()) return true; await sleep(200); }
      return false;
    },
    /** Clear the stage: survival, full health and food, empty inventory, then the given items. */
    async kit(items) {
      cmd(`gamemode survival ${username}`);
      cmd(`clear ${username}`);
      cmd(`effect clear ${username}`);
      cmd(`effect give ${username} minecraft:instant_health 1 10 true`);
      cmd(`effect give ${username} minecraft:saturation 1 20 true`);
      await sleep(600);
      for (const [name, n] of Object.entries(items)) cmd(`give ${username} ${name} ${n}`);
      await lab.until(() => Object.entries(items).every(([name, n]) => lab.count(name) >= Math.min(n, 1)), 8_000);
      await sleep(500);
    },
    async tp(x, y, z) {
      cmd(`tp ${username} ${x} ${y} ${z}`);
      await lab.until(() => bot.entity.position.distanceTo({ x, y, z }) < 2 || Math.abs(bot.entity.position.x - x) < 1.5, 10_000);
      await lab.until(() => bot.blockAt(bot.entity.position.floored().offset(0, -1, 0)) !== null, 15_000);
      await sleep(1_500);
    },
    async close() { try { bot.quit('lab done'); } catch { /* */ } await sleep(500); },
  };
  return lab;
}

/** Summarise trial results: passes, median and p90 seconds, deaths. */
export function summary(trials) {
  const secs = trials.map((t) => t.ms / 1000).sort((a, b) => a - b);
  const q = (p) => (secs.length ? Math.round(secs[Math.min(secs.length - 1, Math.floor(p * secs.length))]) : null);
  return { trials: trials.length, pass: trials.filter((t) => t.ok).length, p50: q(0.5), p90: q(0.9), deaths: trials.reduce((n, t) => n + (t.deaths ?? 0), 0) };
}
