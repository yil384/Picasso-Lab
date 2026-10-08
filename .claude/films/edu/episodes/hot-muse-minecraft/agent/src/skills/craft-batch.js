// src/skills/craft-batch.js - craft_batch (an MCP-only skill, ROADMAP M2 "recursive and batched craft"): several items
// in order in one skill. Each item is made by the craft skill itself (same recipes, same window clicks, same table
// rules): the first item that needs a crafting table uses the bot's own table nearby, or puts the carried one down
// (or makes one from 4 planks), and that table stays where it is (src/stations.js), so every later item of the list
// works at it. The planks, sticks and the table a list needs are added by the MCP dry-run check (src/plan.js) before
// the call, so this skill only crafts. After a reflex interrupted it (ctx.resumed) it goes on with the item it was at.

import { craft } from './craft.js';
import { done, fail, SkillStop } from './util.js';

/** craft_batch {items: [{item, n}, ...]} */
export async function craftBatch(ctx, { items }) {
  const start = ctx.resumed?.batch ?? 0;
  const lines = [...(ctx.resumed?.lines ?? [])];
  for (let i = start; i < items.length; i++) {
    const { item, n } = items[i];
    ctx.check();
    // the item in hand when a reflex came goes on from what it made; the others start from nothing
    const resumed = i === start && ctx.resumed ? { made: ctx.resumed.made ?? 0 } : null;
    ctx.progress?.({ batch: i, lines: [...lines], made: resumed?.made ?? 0 });
    let r;
    try {
      r = await craft({ ...ctx, resumed }, { item, n });
    } catch (err) {
      if (err instanceof SkillStop && lines.length) ctx.stopNote(`${lines.join('; ')} before that`);
      throw err;
    }
    if (!r.ok) {
      const rest = items.slice(i + 1).map((x) => `${x.n} ${x.item}`).join(', ');
      const made = lines.join('; ');
      return fail(`${made ? `${made}; then ` : ''}${r.result}${rest ? `; not crafted: ${rest}` : ''}`);
    }
    lines.push(r.result);
  }
  return done(lines.join('; '));
}
