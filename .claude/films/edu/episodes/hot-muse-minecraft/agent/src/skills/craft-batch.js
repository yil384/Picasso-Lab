// src/skills/craft-batch.js - craft_batch (an MCP-only skill, ROADMAP M2 "recursive and batched craft"): several items
// in order with one crafting table for all of them. Each item is made by the craft skill itself (same recipes, same
// window clicks); what changes is the table: when an item needs one and none stands within reach, the table from the
// inventory is put down once, every later item uses it, and it is picked up again at the end. Separate craft calls
// place and pick up the table every time (about 4-5 s each on a real server, ROADMAP S4). The planks, sticks and the
// table a list needs are added by the MCP dry-run check (src/plan.js) before the call, so this skill only crafts.

import { craft } from './craft.js';
import { done, fail, countOf, fmt, placeNearby, pickUp, pickUpNote, SkillStop } from './util.js';

const TABLE_RADIUS = 32; // as craft.js: a table this close is walked to and used

/** True when every recipe for the item needs a crafting table (none fits the 2x2 grid). */
function needsTable(bot, item) {
  const id = bot.registry.itemsByName[item]?.id;
  if (id === undefined) return false;
  const all = bot.recipesAll(id, null, true);
  return all.length > 0 && all.every((r) => r.requiresTable);
}

/** craft_batch {items: [{item, n}, ...]} */
export async function craftBatch(ctx, { items }) {
  const { bot } = ctx;
  const tableId = bot.registry.blocksByName.crafting_table.id;
  const lines = [];
  let placed = null;
  let failure = null;
  try {
    for (const [i, { item, n }] of items.entries()) {
      ctx.check();
      if (!placed && needsTable(bot, item) && countOf(bot, 'crafting_table') > 0
        && !bot.findBlock({ matching: tableId, maxDistance: TABLE_RADIUS })) {
        const r = await placeNearby(ctx, 'crafting_table');
        if (!r.ok) { failure = `${item} needs a crafting table and placing one failed: ${r.result}`; break; }
        placed = r.block;
        ctx.stopNote(`a crafting table you placed is at ${fmt(placed.position)}`);
      }
      const r = await craft(ctx, { item, n });
      if (!r.ok) {
        const rest = items.slice(i + 1).map((x) => `${x.n} ${x.item}`).join(', ');
        failure = `${r.result}${rest ? `; not crafted: ${rest}` : ''}`;
        break;
      }
      lines.push(r.result);
    }
  } catch (err) {
    if (err instanceof SkillStop && lines.length) ctx.stopNote(`${lines.join('; ')} before that${placed ? `; a crafting table you placed is at ${fmt(placed.position)}` : ''}`);
    throw err;
  }
  ctx.check();
  const tableNote = placed ? pickUpNote(await pickUp(ctx, placed), 'crafting table', placed.position) : '';
  const made = lines.join('; ');
  if (failure) return fail(`${made ? `${made}; then ` : ''}${failure}${tableNote}`);
  return done(`${made}${tableNote}`);
}
