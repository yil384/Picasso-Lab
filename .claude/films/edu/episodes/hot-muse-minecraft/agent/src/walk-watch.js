// src/walk-watch.js - is a walk still getting anywhere? A watch samples the bot's distance to where it is going (one
// walk, or a go_to of several legs that share one watch) and calls the walk stuck once the best distance improved by
// less than `gain` blocks in the last `windowMs`, digging and building included. Being busy is not progress:
// pathfinder that digs stone by hand (7.5 s a block), pillars up and drops back, or turns back and forth stays busy
// for minutes without getting closer, and every new block it breaks resets its path, so "stuck" path resets never
// pile up. The report says what held the bot up, where it is and what to try instead.

import { Vec3 } from './mc.js';

/** A dig this slow (ms per block) is worth naming in the report. */
const SLOW_DIG_MS = 2_000;
/** Blocks above the bot that do not make it "underground" (trees, a canopy). */
const TREE = /(_leaves|_log|_wood|_stem|mushroom_block|vine)$/;
const TIERS = ['wooden', 'stone', 'golden', 'iron', 'diamond', 'netherite'];

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };
const keyOf = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const seconds = (ms) => `${Math.round(ms / 100) / 10}`;
const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** The items pathfinder builds with (dirt, cobblestone), as {count, names}. */
export function scaffolding(bot) {
  const ids = bot.pathfinder?.movements?.scafoldingBlocks;
  const wanted = new Set(Array.isArray(ids) || ids instanceof Set ? ids : []);
  const names = new Set();
  let count = 0;
  for (const it of safe(() => bot.inventory.items(), [])) {
    if (wanted.has(it.type)) { count += it.count; names.add(it.name); }
  }
  for (const id of wanted) { const n = bot.registry?.items?.[id]?.name; if (n) names.add(n); }
  return { count, names: [...names] };
}

/**
 * How far below the surface the bot stands, or null when it is not underground (less than 3 blocks): the ground
 * around it (the lowest of the four neighbouring columns, so a cliff on one side does not count) against its feet. A
 * shaft open to the sky counts: its walls are the ground around.
 */
export function depthBelowSurface(bot, reach = 48) {
  const p = bot.entity?.position;
  if (!p) return null;
  const [fx, feet, fz] = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)];
  let surface = Infinity;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let top = feet;
    for (let y = feet + reach; y >= feet; y--) {
      const b = safe(() => bot.blockAt(new Vec3(fx + dx, y, fz + dz)), null);
      if (!b) return null; // not loaded
      if (b.boundingBox === 'block' && !TREE.test(b.name)) { top = y + 1; break; }
    }
    surface = Math.min(surface, top);
  }
  const depth = surface - feet;
  return depth >= 3 ? depth : null;
}

/** The cheapest tool that can harvest a block, by name, or null. */
function cheapestTool(bot, block) {
  const names = Object.keys(block.harvestTools ?? {}).map((id) => bot.registry?.items?.[id]?.name).filter(Boolean);
  const tier = (n) => { const i = TIERS.findIndex((t) => n.startsWith(`${t}_`)); return i < 0 ? 99 : i; };
  return names.sort((a, b) => tier(a) - tier(b))[0] ?? null;
}

/**
 * @param {object} bot   a mineflayer bot (or the fake)
 * @param {{distance: () => number, windowMs: number, gain: number, now?: () => number}} opts
 *   distance: how far the bot still is from where it is going (blocks), sampled by sample()
 * @returns {{sample: () => (Error|null), reset: (why: string) => void, explain: (lead: string, gained?: number) => Error,
 *   readonly error: Error|null}}
 */
export function createWalkWatch(bot, { distance, windowMs, gain, now = Date.now }) {
  const t0 = now();
  const samples = []; // {t, best}: the best distance so far at each sample, oldest first
  let best = Infinity;
  let error = null;
  let digKey = null;
  const digs = new Map(); // block name -> {n, ms, hand, tool}
  const resets = {};
  const startPos = safe(() => bot.entity.position.clone(), null);
  const scaffold0 = scaffolding(bot).count;
  let travelled = 0;
  let lastPos = startPos;

  function noteDig() {
    const b = bot.targetDigBlock;
    if (!b?.position) { digKey = null; return; }
    const k = keyOf(b.position);
    if (k === digKey) return;
    digKey = k;
    const held = bot.heldItem;
    const hand = Boolean(b.harvestTools) && !(held && Object.hasOwn(b.harvestTools, held.type));
    const ms = safe(() => bot.digTime(b), 0);
    const d = digs.get(b.name) ?? { n: 0, ms: 0, hand: false, tool: null };
    d.n += 1;
    d.ms = Math.max(d.ms, Number.isFinite(ms) ? ms : 0);
    d.hand ||= hand;
    d.tool ??= hand ? cheapestTool(bot, b) : null;
    digs.set(b.name, d);
  }

  /** The Stuck error: lead, then what held the bot up, where it is and what to try. gained: blocks closer lately. */
  function explain(lead, gained = 0) {
    const what = [];
    const slow = [...digs].filter(([, d]) => d.ms >= SLOW_DIG_MS);
    const digText = ([name, d]) => (d.hand
      ? `${name} by hand (${seconds(d.ms)} s a block, and by hand it drops nothing)`
      : `${name} (${seconds(d.ms)} s a block)`);
    if (slow.length) what.push(`it was digging ${list(slow.map(digText))}`);
    const sc = scaffolding(bot);
    const kinds = sc.names.length ? list(sc.names).replace(/ and /, ' or ') : 'blocks';
    const built = (resets.place_error ?? 0) + (resets.no_scaffolding_blocks ?? 0) > 0 || sc.count < scaffold0;
    if (built) what.push(`it tried to climb or bridge on blocks it placed (${sc.count || 'no'} ${kinds} left)`);
    if ((resets.stuck ?? 0) >= 2 && !/path/.test(lead)) what.push('it kept losing its path (blocked, or slipping off an edge)');
    if (!what.length) {
      if (gained >= 1) what.push('it got closer too slowly');
      else what.push(travelled > 3 ? 'it went back and forth without finding a way through' : 'it found no way through');
    }
    const depth = depthBelowSurface(bot);
    const tools = [...new Set(slow.filter(([, d]) => d.hand && d.tool).map(([, d]) => d.tool))];
    const tips = [];
    if (tools.length) tips.push(`craft a ${tools[0]} first`);
    if (depth && sc.count < depth) {
      tips.push(`carry ${depth}+ ${kinds} to pillar up out of here (you have ${sc.count})${tools.length ? ' or dig a staircase up with the pickaxe' : ''}`);
    }
    tips.push('go_to a nearer spot on the way');
    const where = depth ? `; you are underground, about ${depth} blocks below the surface` : '';
    return Object.assign(new Error(`${lead}: ${what.join('; ')}${where}. Try: ${tips.join(', or ')}`), { name: 'Stuck' });
  }

  return {
    get error() { return error; },
    /** A pathfinder path reset ('stuck', 'place_error', 'block_updated', ...), for the report. */
    reset(why) { resets[why] = (resets[why] ?? 0) + 1; },
    /** A Stuck error for a walk that failed another way ("stood still for 20 s"), with the same report. */
    explain,
    /** Take one sample; returns the Stuck error once the walk has stalled (and from then on). */
    sample() {
      if (error) return error;
      const t = now();
      noteDig();
      const pos = safe(() => bot.entity.position, null);
      if (pos && lastPos) travelled += pos.distanceTo(lastPos);
      lastPos = pos?.clone?.() ?? lastPos;
      const d = Number(safe(distance, NaN));
      if (!Number.isFinite(d)) return null;
      if (d < best) best = d;
      samples.push({ t, best });
      // keep the latest sample at or before t - windowMs first, and everything after it
      while (samples.length > 1 && samples[1].t <= t - windowMs) samples.shift();
      const old = samples[0];
      const gained = old.best - best;
      if (t - t0 >= windowMs && old.t <= t - windowMs && gained < gain) {
        const closer = gained >= 1 ? `only ${Math.floor(gained)} block${gained >= 2 ? 's' : ''} closer` : 'no closer';
        error = explain(`stuck, ${closer} in the last ${Math.round(windowMs / 1000)} s`, gained);
      }
      return error;
    },
  };
}
