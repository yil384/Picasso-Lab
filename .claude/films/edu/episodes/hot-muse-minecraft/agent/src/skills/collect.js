// src/skills/collect.js - collect: find the nearest blocks of one type within SCAN_RADIUS (default 32) blocks, walk there, mine n of them
// with the best tool carried and pick up the drops (util.js mineBlock: pathfinder by the body's walking rules, dig, a
// time-limited pickup). Matching ore's deepslate twin and grass for dirt, checking the harvest tool first and skipping
// blocks it cannot reach follow Mindcraft's collectBlock skill (github.com/mindcraft-bots/mindcraft, MIT License),
// rewritten for this body.

import { done, fail, keyOf, fmt, describeError, mineBlock, SkillStop } from './util.js';

const RADIUS = Number(process.env.SCAN_RADIUS) || 32;
const MAX_MISSES = 5;
// ores lie underground: tell the model how to get there (go_to digs) instead of letting it search the surface
const ORE_HINT = (block) => (block.endsWith('_ore') ? '; ores lie underground: go_to a spot about 10 blocks lower (it digs down), then collect again' : '');

/** Block names that count as the requested one (same drop). */
function variantsOf(name) {
  if (name.endsWith('_ore') && !name.startsWith('deepslate_')) return [name, `deepslate_${name}`];
  if (name === 'dirt') return ['dirt', 'grass_block'];
  return [name];
}

/** Names of the tools that can harvest a block, cheapest first, or null when the hand will do. */
function harvestToolNames(bot, def) {
  if (!def.harvestTools) return null;
  const order = ['wooden', 'stone', 'golden', 'iron', 'diamond', 'netherite'];
  const tier = (n) => order.findIndex((t) => n.startsWith(`${t}_`));
  return Object.keys(def.harvestTools).map((id) => bot.registry.items[id]?.name).filter(Boolean).sort((a, b) => tier(a) - tier(b));
}

/** collect {block, n} */
export async function collect(ctx, { block, n }) {
  const { bot } = ctx;
  const defs = variantsOf(block).map((b) => bot.registry.blocksByName[b]).filter(Boolean);
  const ids = defs.map((d) => d.id);
  const tools = harvestToolNames(bot, defs[0]);
  if (tools && !bot.inventory.items().some((i) => Object.hasOwn(defs[0].harvestTools, i.type))) {
    return fail(`${block} drops nothing without the right tool: you need one of ${tools.join(', ')}`);
  }

  let mined = 0;
  let misses = 0;
  let lastError = null;
  const skip = new Set();
  while (mined < n) {
    ctx.check();
    const found = bot.findBlocks({ matching: ids, maxDistance: RADIUS, count: 64 }).filter((p) => !skip.has(keyOf(p)));
    if (!found.length) break;
    if (bot.inventory.emptySlotCount?.() === 0) return fail(`mined ${mined} of ${n} ${block}: the inventory is full`);
    const pos = found[0];
    const target = bot.blockAt(pos);
    try {
      const r = await mineBlock(ctx, target);
      if (!r.ok) lastError = r.result;
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      ctx.check();
      lastError = `${describeError(err)} (at ${fmt(pos)})`;
    }
    ctx.check();
    if (bot.blockAt(pos)?.type === target.type) {
      skip.add(keyOf(pos));
      if (++misses >= MAX_MISSES) break;
    } else {
      mined += 1;
      ctx.stopNote(`mined ${mined} of ${n} ${block} before that`); // a long collect can run into its time limit
    }
  }

  if (mined >= n) return done(`mined ${mined} ${block}`);
  const why = misses >= MAX_MISSES ? `gave up after ${misses} blocks it could not mine${lastError ? `, last: ${lastError}` : ''}`
    : `no more ${block} within ${RADIUS} blocks${skip.size ? ` that you can reach` : ''}${ORE_HINT(block)}`;
  return fail(`mined ${mined} of ${n} ${block}: ${why}`);
}
