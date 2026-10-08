// src/skills/smelt.js - smelt: load n of an input (raw_iron, a log, cobblestone, raw meat) with fuel from the
// inventory into furnaces and return at once (roadmap M2, S5): the furnaces work in the background and the output
// comes into the inventory later, by the next skill that starts within reach of a finished furnace, by a craft (or eat,
// place, build) that needs it, or by calling smelt again. Up to MAX_PARALLEL furnaces share one load (3 iron: one
// furnace 30 s, three 10 s): the bot's furnaces nearby, the ones it carries, and extra ones crafted from spare
// cobblestone when that saves time. A furnace the bot placed stays (src/stations.js: it belongs to the bot, no other
// bot opens it or takes its output); one nobody owns is held for the bot while its items are in it. One call loads
// at most SMELT_PER_CALL items. The flow (pick fuel, clear the furnace, take the output) follows Mindcraft's smeltItem
// skill (github.com/mindcraft-bots/mindcraft, MIT License), rewritten here.

import { Vec3 } from '../mc.js';
import { SMELT, FUEL, PLANKS, LOGS } from '../game.js';
import { SMELT_PER_CALL } from '../contracts.js';
import { REUSE_RADIUS } from '../stations.js';
import { done, fail, countOf, fmt, walkNear, eyeDistance, describeError, SkillStop, REACH, timed } from './util.js';
import { findStations, placeStation, isClose, planksCarried } from './station.js';
import { craftItem } from './craft.js';

/** Furnaces one load may use at once. */
export const MAX_PARALLEL = 3;
/** Game time to smelt one item in a furnace (200 ticks). */
export const ITEM_MS = 10_000;
// Cheapest fuel first: coal before wood, planks before logs (a log is worth 4 planks).
const FUEL_ORDER = ['coal', 'charcoal', 'coal_block', ...PLANKS, 'stick', ...LOGS];
// For a few items per furnace (a load split over several): fuel that burns out with them first, so no coal burns for
// one item; never sticks (the tools still to be crafted need them).
const SMALL_ORDER = [...PLANKS, 'charcoal', 'coal', 'coal_block', ...LOGS];
const COBBLE_PER_FURNACE = 8;

const jobsByBot = new WeakMap();
/** The background loads of a bot: [{input, output, n, pos, fuel, readyAt, temp}], one per furnace. */
export function smeltJobs(bot) {
  if (!jobsByBot.has(bot)) jobsByBot.set(bot, []);
  return jobsByBot.get(bot);
}
const keyOf = (p) => `${p.x},${p.y},${p.z}`;

/** True when one of the bot's furnaces is working on (or holds) one of these items. */
export function pendingFor(ctx, names) {
  return smeltJobs(ctx.bot).some((j) => names.has(j.output));
}

/** "3 iron_ingot ready in about 7 s at 1 64 2, 1 64 3" for the state text, or null. */
export function describeSmelting(bot) {
  const jobs = smeltJobs(bot);
  if (!jobs.length) return null;
  const by = new Map();
  for (const j of jobs) {
    const row = by.get(j.output) ?? { n: 0, ready: 0, at: [] };
    row.n += j.n;
    row.ready = Math.max(row.ready, j.readyAt);
    row.at.push(fmt(j.pos));
    by.set(j.output, row);
  }
  return [...by].map(([out, r]) => {
    const s = Math.ceil((r.ready - Date.now()) / 1000);
    return `${r.n} ${out} ${s > 0 ? `ready in about ${s} s` : 'ready'} in your furnace${r.at.length > 1 ? 's' : ''} at ${r.at.join(', ')}`;
  }).join('; ');
}

/** The fuel to burn for `want` items: the first in `order` that covers them all, else the one covering the most. */
function chooseFuel(bot, input, want, order = FUEL_ORDER) {
  let best = null;
  for (const name of order) {
    if (name === input) continue;
    const have = countOf(bot, name);
    if (have <= 0) continue;
    const covers = Math.floor(have * FUEL[name]);
    if (covers < 1) continue;
    if (covers >= want) return { name, units: Math.ceil(want / FUEL[name]), covers: want };
    if (!best || covers > best.covers) best = { name, units: have, covers };
  }
  return best;
}

/** n items over k furnaces, as even as possible: [2, 2, 1]. */
const split = (n, k) => Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0)).filter((x) => x > 0);

/** One furnace window action (take or put), timed as clicks. */
const click = (ctx, fn) => timed(ctx, 'clicks', () => ctx.wait(fn()));

/** Open a furnace within reach (walking there first) and close it again whatever happens. */
async function withFurnace(ctx, block, fn) {
  const { bot } = ctx;
  if (eyeDistance(bot, block.position) > REACH) await walkNear(ctx, block.position);
  const furnace = await timed(ctx, 'open', () => ctx.wait(bot.openFurnace(block)));
  let open = true;
  const close = () => { if (open) { open = false; try { furnace.close(); } catch { /* already closed */ } } };
  const off = ctx.onCleanup(close);
  try {
    return await fn(furnace);
  } finally {
    off();
    close();
  }
}

/**
 * Take the output of the bot's background loads: finished ones (or, with wait, also the ones still working, waiting
 * for them), from furnaces within `walk` blocks (0: only within reach), limited to the outputs in `only`. Returns a
 * note for the result: " (took 3 iron_ingot from your furnaces)" or ''. Never throws for a game failure.
 */
export async function fetchSmelted(ctx, { only = null, wait = false, walk = REUSE_RADIUS } = {}) {
  const { bot } = ctx;
  const jobs = smeltJobs(bot);
  const took = new Map();
  const problems = [];
  const todo = jobs.filter((j) => (!only || only.has(j.output)) && (wait || Date.now() >= j.readyAt));
  todo.sort((a, b) => a.readyAt - b.readyAt);
  for (const job of todo) {
    ctx.check();
    const block = bot.blockAt(job.pos);
    if (!block) continue; // not loaded: too far
    const drop = () => {
      jobs.splice(jobs.indexOf(job), 1);
      if (job.temp) ctx.stations?.release(job.pos);
    };
    if (block.name !== 'furnace') { drop(); problems.push(`the furnace at ${fmt(job.pos)} is gone`); continue; }
    const far = eyeDistance(bot, block.position);
    if (far > REACH && (walk <= 0 || far > walk + REACH)) continue;
    try {
      if (wait && Date.now() < job.readyAt) {
        if (far > REACH) await walkNear(ctx, block.position);
        await timed(ctx, 'cook', () => ctx.sleep(Math.max(0, job.readyAt - Date.now())));
      }
      const got = await withFurnace(ctx, bot.blockAt(job.pos), async (furnace) => {
        let n = 0;
        let lastChange = Date.now();
        const inputId = bot.registry.itemsByName[job.input]?.id;
        for (;;) {
          const out = furnace.outputItem();
          if (out && out.count > 0) {
            await click(ctx, () => furnace.takeOutput());
            n += out.count;
            lastChange = Date.now();
            continue;
          }
          const input = furnace.inputItem();
          if (!input || input.type !== inputId || !wait) break;
          if (Date.now() - lastChange > ctx.timing.stallMs) { problems.push(`the furnace at ${fmt(job.pos)} stopped working (out of fuel?)`); break; }
          await timed(ctx, 'cook', () => ctx.sleep(ctx.timing.pollMs));
        }
        const working = furnace.inputItem()?.type === inputId;
        if (!working && furnace.fuelItem()) await click(ctx, () => furnace.takeFuel());
        return { n, working };
      });
      if (got.n) took.set(job.output, (took.get(job.output) ?? 0) + got.n);
      if (got.working) {
        job.n = Math.max(0, job.n - got.n);
        job.readyAt = Date.now() + job.n * (ctx.timing.smeltMs ?? ITEM_MS);
      } else drop();
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      problems.push(`could not empty the furnace at ${fmt(job.pos)}: ${describeError(err)}`);
    }
  }
  const parts = [];
  if (took.size) parts.push(`took ${[...took].map(([k, v]) => `${v} ${k}`).join(', ')} from your furnace${todo.length > 1 ? 's' : ''}`);
  if (problems.length) parts.push(problems[0]);
  return parts.length ? ` (${parts.join('; ')})` : '';
}

/**
 * The furnaces for one load of `want` items, at most MAX_PARALLEL: usable ones within REUSE_RADIUS that hold no load
 * of the bot's, then the ones carried (put down), then extra ones crafted from spare cobblestone (8 each) when the
 * load has more items than furnaces. Returns {list: [{block, placed}], notes, error}.
 */
async function furnacesFor(ctx, want, item) {
  const { bot } = ctx;
  // each furnace of a split load burns at least one piece of fuel of its own (never sticks)
  const pieces = SMALL_ORDER.filter((name) => name !== item).reduce((n, name) => n + countOf(bot, name), 0);
  const target = Math.max(1, Math.min(want, MAX_PARALLEL, pieces));
  const busy = new Set(smeltJobs(bot).map((j) => keyOf(j.pos)));
  const list = [];
  const notes = [];
  let error = null;
  let unreachable = null;
  const found = findStations(ctx, 'furnace').filter((b) => !busy.has(keyOf(b.position)));
  /** Furnaces from `pool`: the first may be a walk away (one behind a wall is passed over), more only beside it. */
  const take = async (pool) => {
    for (const b of pool) {
      if (list.length >= target) break;
      if (list.length && b.position.distanceTo(list[0].block.position) > 6) continue;
      if (!list.length && eyeDistance(bot, b.position) > REACH) {
        try {
          await walkNear(ctx, b.position);
        } catch (err) {
          if (err instanceof SkillStop) throw err;
          unreachable ??= `could not reach the furnace at ${fmt(b.position)}: ${describeError(err)}`;
          continue;
        }
      }
      list.push({ block: b, placed: false });
    }
  };
  // furnaces close by first; ones farther away only when the bot has none to put down and can make none
  await take(found.filter((b) => isClose(bot, b.position)));
  const extra = target - list.length - countOf(bot, 'furnace');
  // extra furnaces need a table: one close by, one carried, or planks for one that still leave a piece of fuel for
  // every furnace (the table stays for the crafts that follow, the iron pickaxe)
  const table = findStations(ctx, 'crafting_table').some((b) => isClose(bot, b.position)) || countOf(bot, 'crafting_table') > 0
    || (planksCarried(bot) >= 4 && pieces - 4 >= target);
  if (extra > 0 && table) {
    const spare = Math.floor(countOf(bot, 'cobblestone') / COBBLE_PER_FURNACE);
    const make = Math.min(extra, spare);
    if (make > 0) {
      const r = await craftItem(ctx, 'furnace', make, { progress: false });
      if (r.ok) notes.push(`crafted ${make} more furnace${make > 1 ? 's' : ''} from ${make * COBBLE_PER_FURNACE} cobblestone to smelt in parallel${r.result.replace(/^crafted \d+ furnace/, '')}`);
      else if (!list.length && !countOf(bot, 'furnace')) error = r.result;
    }
  }
  while (list.length < target && countOf(bot, 'furnace')) {
    const r = await placeStation(ctx, 'furnace');
    if (!r.ok) { error = `placing a furnace failed: ${r.result}`; break; }
    list.push({ block: r.block, placed: true });
    if (r.note) notes.push(r.note.replace(/^; /, ''));
  }
  if (!list.length) await take(found.filter((b) => !isClose(bot, b.position)));
  if (unreachable && list.length && list.every((l) => l.placed)) notes.push(unreachable);
  if (!list.length && !error) {
    const working = smeltJobs(bot).filter((j) => bot.blockAt(j.pos)?.name === 'furnace');
    error = unreachable ?? (working.length
      ? `your furnace${working.length > 1 ? 's are' : ' is'} still smelting (${describeSmelting(bot)}); craft another furnace from 8 cobblestone to smelt more at once`
      : `no furnace within ${REUSE_RADIUS} blocks and none in your inventory (craft furnace from 8 cobblestone)`);
  }
  return { list, notes, error };
}

/** Put fuel and items into one furnace; clears what an earlier load left in it. */
async function loadFurnace(ctx, block, item, m, fuel) {
  const { bot } = ctx;
  const reg = bot.registry.itemsByName;
  return withFurnace(ctx, block, async (furnace) => {
    let took = 0;
    const prev = furnace.outputItem();
    if (prev) { await click(ctx, () => furnace.takeOutput()); took = prev.count; }
    if (furnace.inputItem() && furnace.inputItem().type !== reg[item].id) await click(ctx, () => furnace.takeInput());
    if (furnace.fuelItem() && furnace.fuelItem().type !== reg[fuel.name].id) await click(ctx, () => furnace.takeFuel());
    await click(ctx, () => furnace.putFuel(reg[fuel.name].id, null, fuel.units));
    await click(ctx, () => furnace.putInput(reg[item].id, null, m));
    return took;
  });
}

/** smelt {item, n}: item is the furnace input. */
export async function smelt(ctx, { item, n }) {
  const { bot } = ctx;
  if (ctx.resumed?.loaded) return done(ctx.resumed.result); // stopped by a reflex after the furnaces were loaded
  const output = SMELT[item];
  // finished loads within reach: take them first (they may be what this call is about)
  const early = await fetchSmelted(ctx, { wait: false, walk: 0 });
  const have = countOf(bot, item);
  if (!have) {
    if (pendingFor(ctx, new Set([output]))) {
      const note = await fetchSmelted(ctx, { only: new Set([output]), wait: true });
      return countOf(bot, output) ? done(`waited for your furnaces${early}${note}`) : fail(`your ${output} is still in furnaces you could not reach${early}${note}`);
    }
    return fail(`you have no ${item} to smelt${early}`);
  }
  const capped = n > SMELT_PER_CALL && have > SMELT_PER_CALL;
  const want = Math.min(n, have, SMELT_PER_CALL);
  if (!chooseFuel(bot, item, 1)) return fail('no fuel: you need coal, charcoal, planks, sticks or logs');

  const { list, notes, error } = await furnacesFor(ctx, want, item);
  if (!list.length) return fail(`${error}${early}`);
  // split the load; each furnace gets its own fuel (a load split over several furnaces burns what fits its items)
  const shares = split(want, list.length);
  const order = shares.length > 1 ? SMALL_ORDER : FUEL_ORDER;
  const jobs = smeltJobs(bot);
  const loaded = [];
  const fuels = new Map();
  let prevOut = 0;
  let loadError = null;
  for (let i = 0; i < shares.length; i++) {
    const fuel = chooseFuel(bot, item, shares[i], order);
    if (!fuel) break;
    const m = Math.min(shares[i], fuel.covers);
    const { block } = list[i];
    ctx.stopNote(`some ${item} or ${fuel.name} may be in the furnace at ${fmt(block.position)}`);
    try {
      prevOut += await loadFurnace(ctx, block, item, m, fuel);
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      loadError = `could not load the furnace at ${fmt(block.position)}: ${describeError(err)}`;
      continue;
    }
    fuels.set(fuel.name, (fuels.get(fuel.name) ?? 0) + fuel.units);
    const pos = new Vec3(block.position.x, block.position.y, block.position.z);
    const temp = !ctx.stations?.owns(pos);
    if (temp) ctx.stations?.claim('furnace', pos, { temp: true });
    const per = ctx.timing.smeltMs ?? ITEM_MS;
    jobs.push({ input: item, output, n: m, pos, fuel: fuel.name, readyAt: Date.now() + m * per + Math.min(500, per / 4), temp });
    loaded.push({ pos, m });
    ctx.stopNote(`${loaded.reduce((t, l) => t + l.m, 0)} ${item} are smelting in your furnaces at ${loaded.map((l) => fmt(l.pos)).join(', ')}`);
  }
  if (!loaded.length) return fail(`${loadError ?? 'no fuel for these items'}${early}`);
  const total = loaded.reduce((s, l) => s + l.m, 0);
  const secs = Math.ceil((Math.max(...loaded.map((l) => l.m)) * (ctx.timing.smeltMs ?? ITEM_MS)) / 1000);
  const where = loaded.map((l) => fmt(l.pos)).join(', ');
  const burning = [...fuels].map(([k, v]) => `${v} ${k}`).join(', ');
  const extras = [
    notes.length ? notes.join('; ') : '',
    prevOut ? `took ${prevOut} items an earlier load left in the furnace` : '',
    total < want && !capped ? `fuel covers only ${total} of ${want}` : '',
    loadError ?? '',
    capped ? `one call loads at most ${SMELT_PER_CALL}, call smelt again for the other ${Math.min(n, have) - total}` : '',
  ].filter(Boolean);
  const result = `smelting ${total} ${item} in ${loaded.length} furnace${loaded.length > 1 ? 's' : ''} at ${where}, burning ${burning}: ${total} ${output} ready in about ${secs} s. They come into your inventory with your next action near the furnace${loaded.length > 1 ? 's' : ''}, or when a craft needs them${extras.length ? ` (${extras.join('; ')})` : ''}${early}`;
  ctx.progress?.({ loaded: true, result });
  if (total < Math.min(n, have, SMELT_PER_CALL) && !capped && total < have) return fail(result.replace(/^smelting/, 'smelting only'));
  return done(result);
}
