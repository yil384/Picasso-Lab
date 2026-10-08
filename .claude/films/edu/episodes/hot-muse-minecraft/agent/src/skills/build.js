// src/skills/build.js - build: a blueprint from game.js in one material, on the ground just in front of the bot (the
// shelter goes around it). Clears what must be air, then places layer by layer (far rows first), retrying cells that
// had nothing to build on once their neighbours exist, and adds a support block when a cell has no solid face at all
// (the shelter's roof). Each block goes through placeAt in util.js.

import { BLUEPRINTS, blueprintBlockCount } from '../game.js';
import { facingOf } from '../state.js';
import { Vec3 } from '../mc.js';
import {
  done, fail, countOf, keyOf, vec, isSolid, isPassable, isReplaceable, occupies, eyeDistance, referenceFor, placeAt, digAt,
  REACH,
} from './util.js';
import { pendingFor, fetchSmelted } from './smelt.js';

const MAX_SUPPORTS = 4;
const SIDES = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]].map(([x, y, z]) => new Vec3(x, y, z));

/**
 * Blueprint cells in world coordinates. Row 0 faces the bot; columns run left to right as the bot sees them. The
 * shelter is centred on the bot's own block, everything else starts one block in front of it.
 * @returns {{cells: Array<{pos: Vec3, kind: '#'|'.', layer: number, row: number, col: number}>, facing: string}}
 */
export function layout(blueprint, feet, yaw) {
  const bp = BLUEPRINTS[blueprint];
  const f = facingOf(yaw);
  const right = { dx: -f.dz, dz: f.dx };
  const rows = bp.layers[0].length;
  const cols = bp.layers[0][0].length;
  const rowShift = blueprint === 'shelter' ? -Math.floor(rows / 2) : 1;
  const colShift = -Math.floor(cols / 2);
  const cells = [];
  bp.layers.forEach((layer, k) => layer.forEach((line, i) => [...line].forEach((ch, j) => {
    if (ch !== '#' && ch !== '.') return;
    const a = i + rowShift;
    const b = j + colShift;
    cells.push({ pos: new Vec3(feet.x + f.dx * a + right.dx * b, feet.y + k, feet.z + f.dz * a + right.dz * b), kind: ch, layer: k, row: i, col: j });
  })));
  return { cells, facing: f.name };
}

/** Step onto the middle of the current block so the hitbox does not overlap the cells next to it. Best effort. */
async function centerOnBlock(ctx) {
  const { bot } = ctx;
  const mid = vec(bot.entity.position).offset(0.5, 0, 0.5);
  const off = () => Math.hypot(bot.entity.position.x - mid.x, bot.entity.position.z - mid.z);
  if (off() < 0.2 || !bot.setControlState) return;
  try {
    for (let i = 0; i < 20 && off() >= 0.15; i++) {
      await ctx.wait(bot.lookAt(mid.offset(0, 1.62, 0), true));
      bot.setControlState('sneak', true);
      bot.setControlState('forward', true);
      await ctx.wait(bot.waitForTicks(1));
    }
  } finally {
    bot.clearControlStates?.();
  }
}

/** A free spot beside an unsupported cell where a support block can go (outside the blueprint, buildable, in reach). */
function supportSpot(ctx, unsupported, footprint, move) {
  const { bot } = ctx;
  for (const c of unsupported) {
    for (const d of SIDES) {
      const s = c.pos.plus(d);
      if (footprint.has(keyOf(s)) || !isReplaceable(bot.blockAt(s)) || occupies(bot, s)) continue;
      if (!referenceFor(bot, s)) continue;
      if (!move && eyeDistance(bot, s) > REACH) continue;
      return s;
    }
  }
  return null;
}

/** build {blueprint, material}; after a reflex interrupted it, on from the spot and direction it started at */
export async function build(ctx, { blueprint, material }) {
  const { bot } = ctx;
  const around = blueprint === 'shelter';
  const anchor = ctx.resumed?.anchor ?? { feet: vec(bot.entity.position), yaw: bot.entity.yaw };
  if (!around) ctx.progress?.({ anchor }); // the shelter is built around wherever the bot stands: never resumed
  const { cells, facing } = layout(blueprint, anchor.feet, anchor.yaw);
  const footprint = new Set(cells.map((c) => keyOf(c.pos)));
  const solids = cells.filter((c) => c.kind === '#');

  // What is in the way: solid blocks where air must be, and plants or torches where a block goes.
  const clear = cells.filter((c) => (c.kind === '.' ? !isPassable(bot.blockAt(c.pos)) : !isSolid(bot.blockAt(c.pos)) && !isReplaceable(bot.blockAt(c.pos))));
  for (const c of clear) {
    const b = bot.blockAt(c.pos);
    if (!b || !b.diggable) return fail(`${blueprint} does not fit here: ${b?.name ?? 'an unloaded block'} at ${c.pos.x} ${c.pos.y} ${c.pos.z} cannot be removed`);
  }
  const toPlace = solids.filter((c) => !isSolid(bot.blockAt(c.pos)));
  if (countOf(bot, material) < toPlace.length && pendingFor(ctx, new Set([material]))) await fetchSmelted(ctx, { only: new Set([material]), wait: true });
  const have = countOf(bot, material);
  if (have < toPlace.length) {
    return fail(`${blueprint} needs ${toPlace.length} ${material} here (${blueprintBlockCount(blueprint)} for the whole blueprint); you have ${have}`);
  }

  if (!ctx.resumed) await centerOnBlock(ctx);
  for (const c of clear) {
    const r = await digAt(ctx, c.pos);
    if (!r.ok) return fail(`could not clear the space for ${blueprint}: ${r.result}`);
  }

  const opts = { move: !around, avoid: footprint };
  const order = (a, b) => a.layer - b.layer || b.row - a.row || a.col - b.col;
  let pending = [...toPlace].sort(order);
  const attempts = new Map();
  let placed = 0;
  let supports = 0;
  let failed = 0;
  let lastError = null;
  for (let guard = 0; pending.length && guard < 400; guard++) {
    ctx.check();
    let progress = false;
    const next = [];
    for (const c of pending) {
      if (isSolid(bot.blockAt(c.pos))) { progress = true; continue; }
      if (!referenceFor(bot, c.pos)) { next.push(c); continue; }
      const r = await placeAt(ctx, material, c.pos, opts);
      if (r.ok) { placed += 1; progress = true; continue; }
      lastError = r.result;
      const tries = (attempts.get(c) ?? 0) + 1;
      attempts.set(c, tries);
      if (tries >= 2) failed += 1; else next.push(c);
    }
    pending = next;
    if (!pending.length || progress) continue;
    const unsupported = pending.filter((c) => !referenceFor(bot, c.pos));
    if (!unsupported.length) continue; // only cells that failed once: retry them
    if (supports >= MAX_SUPPORTS || countOf(bot, material) <= unsupported.length) break;
    const spot = supportSpot(ctx, unsupported, footprint, opts.move);
    if (!spot) break;
    const r = await placeAt(ctx, material, spot, opts);
    if (!r.ok) { lastError = r.result; break; }
    supports += 1;
  }
  ctx.check();

  const where = around ? 'around you' : `in front of you (facing ${facing})`;
  const already = solids.length - toPlace.length;
  const extra = `${supports ? `, plus ${supports} support block${supports > 1 ? 's' : ''}` : ''}${already ? `, ${already} cell${already > 1 ? 's were' : ' was'} already solid` : ''}`;
  const left = pending.length + failed;
  if (!left) return done(`built ${blueprint} ${where}: placed ${placed} ${material}${extra}`);
  return fail(`built ${placed} of ${toPlace.length} blocks of ${blueprint} ${where}; ${left} could not be placed (${lastError ?? 'nothing solid to build them on'})`);
}
