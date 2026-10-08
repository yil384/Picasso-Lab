// src/skills/tunnel.js - collecting stone without walking about (roadmap M2, S2): mine what is in reach and in view
// from where the bot stands, and when nothing is, dig a 1x2 passage one block into the stone in front of it and step
// in; every stone dug on the way counts. Only into blocks the chunk data shows are safe: no water or lava touching a
// block to dig, nothing that falls (sand, gravel) resting on it, solid floor to step onto, and never down into the
// floor. Anything else is left to collect's ordinary walk to the next block.

import { REACH, eyeDistance, landed, isSolid, isPassable } from './util.js';

/** Blocks tunnelled through: the stone family (each drops itself or cobblestone). */
export const MASS = new Set(['stone', 'deepslate', 'andesite', 'diorite', 'granite', 'tuff', 'cobblestone', 'cobbled_deepslate']);
/** Steps into the stone one collect may take. */
export const MAX_STEPS = 10;
const LIQUID = /water|lava/;
const FALLS = /^(sand|red_sand|gravel|suspicious_sand|suspicious_gravel|.*_concrete_powder)$/;
const FACES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const AHEAD = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** True when breaking the block at p lets nothing in: no liquid touches it and nothing that falls rests on it. */
export function safeToDig(bot, p) {
  for (const [x, y, z] of FACES) {
    const b = bot.blockAt(p.offset(x, y, z));
    if (!b || LIQUID.test(b.name)) return false;
  }
  return !FALLS.test(bot.blockAt(p.offset(0, 1, 0))?.name ?? '');
}

/** Blocks of `ids` the bot can mine from where it stands: in reach, in view, safe, not the floor under it. Nearest first. */
export function minableHere(bot, ids) {
  const feet = bot.entity.position.floored();
  const out = [];
  for (let dx = -4; dx <= 4; dx++) {
    for (let dy = -2; dy <= 5; dy++) {
      for (let dz = -4; dz <= 4; dz++) {
        const p = feet.offset(dx, dy, dz);
        if (dx === 0 && dz === 0 && dy < 0) continue; // never dig the column it stands on
        const b = bot.blockAt(p);
        if (!b || !ids.includes(b.type) || eyeDistance(bot, p) > REACH) continue;
        if (!safeToDig(bot, p)) continue;
        try { if (bot.canSeeBlock && !bot.canSeeBlock(b)) continue; } catch { continue; }
        out.push(b);
      }
    }
  }
  return out.sort((a, b) => eyeDistance(bot, a.position) - eyeDistance(bot, b.position));
}

/**
 * The best direction to tunnel: the 1x2 passage in front holds stone (at least one block of `ids`), both blocks are
 * safe to dig, the floor there is solid, and more of `ids` lies further on. {feet, head, floor, score} or null.
 */
export function tunnelAhead(bot, ids) {
  const feet = bot.entity.position.floored();
  let best = null;
  for (const [dx, dz] of AHEAD) {
    const f = feet.offset(dx, 0, dz);
    const h = f.offset(0, 1, 0);
    const fb = bot.blockAt(f);
    const hb = bot.blockAt(h);
    const floor = bot.blockAt(f.offset(0, -1, 0));
    if (!fb || !hb || !isSolid(floor) || LIQUID.test(floor?.name ?? '')) continue;
    const dig = [fb, hb].filter((b) => !isPassable(b));
    if (!dig.length || dig.some((b) => !MASS.has(b.name) || !safeToDig(bot, b.position))) continue;
    let score = dig.filter((b) => ids.includes(b.type)).length * 2;
    if (!score) continue;
    for (let k = 2; k <= 3; k++) {
      for (const y of [0, 1]) if (ids.includes(bot.blockAt(feet.offset(dx * k, y, dz * k))?.type)) score += 1;
    }
    if (!best || score > best.score) best = { feet: f, head: h, dig, score };
  }
  return best;
}

/** Break one block where it is (it must be in reach): the right tool, on the ground, dig. */
export async function digHere(ctx, block) {
  const { bot } = ctx;
  if (bot.tool?.equipForBlock) await ctx.wait(bot.tool.equipForBlock(block, { requireHarvest: true }));
  if (block.harvestTools && !(bot.heldItem && block.canHarvest(bot.heldItem.type))) return false;
  await landed(ctx);
  const t0 = Date.now();
  await ctx.wait(bot.dig(block));
  ctx.phase?.('dig', Date.now() - t0);
  return bot.blockAt(block.position)?.type !== block.type;
}
