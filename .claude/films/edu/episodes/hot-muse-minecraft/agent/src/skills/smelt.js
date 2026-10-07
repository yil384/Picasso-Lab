// src/skills/smelt.js - smelt: put n of an input (raw_iron, a log, cobblestone, raw meat) in a furnace with fuel from
// the inventory, wait for the output and take it. Uses a furnace within 32 blocks or places one from the inventory and
// takes it back afterwards. One call smelts at most SMELT_PER_CALL items, so it ends inside its time limit; when it is
// stopped anyway it takes back what it can and says where the rest is. The flow (pick fuel, clear the furnace, wait
// while output grows, collect, recover a placed furnace) follows Mindcraft's smeltItem skill
// (github.com/mindcraft-bots/mindcraft, MIT License), rewritten here.

import { SMELT, FUEL, PLANKS, LOGS } from '../game.js';
import { SMELT_PER_CALL } from '../contracts.js';
import { done, fail, countOf, fmt, walkNear, placeNearby, pickUp, pickUpNote, describeError, SkillStop, timed } from './util.js';

const FURNACE_RADIUS = 32;
// Cheapest fuel first: coal before wood, planks before logs (a log is worth 4 planks).
const FUEL_ORDER = ['coal', 'charcoal', 'coal_block', ...PLANKS, 'stick', ...LOGS];

/** The fuel to burn for `want` items: the first in FUEL_ORDER that covers them all, else the one covering the most. */
function chooseFuel(bot, input, want) {
  let best = null;
  for (const name of FUEL_ORDER) {
    if (name === input) continue;
    const have = countOf(bot, name);
    if (!have) continue;
    const covers = Math.floor(have * FUEL[name]);
    if (covers < 1) continue;
    if (covers >= want) return { name, units: Math.ceil(want / FUEL[name]), covers: want };
    if (!best || covers > best.covers) best = { name, units: have, covers };
  }
  return best;
}

/** After a stop: take back output, input and fuel, each within a moment (the body waits only briefly for a skill). */
async function takeBack(furnace) {
  const quick = (fn) => Promise.race([Promise.resolve().then(fn), new Promise((r) => { setTimeout(r, 400).unref?.(); })]).catch(() => {});
  if (furnace.outputItem()) await quick(() => furnace.takeOutput());
  if (furnace.inputItem()) await quick(() => furnace.takeInput());
  if (furnace.fuelItem()) await quick(() => furnace.takeFuel());
}

/** smelt {item, n}: item is the furnace input. */
export async function smelt(ctx, { item, n }) {
  const { bot } = ctx;
  const output = SMELT[item];
  const reg = bot.registry.itemsByName;
  const have = countOf(bot, item);
  if (!have) return fail(`you have no ${item} to smelt`);
  const capped = n > SMELT_PER_CALL && have > SMELT_PER_CALL;
  let want = Math.min(n, have, SMELT_PER_CALL);
  const fuel = chooseFuel(bot, item, want);
  if (!fuel) return fail('no fuel: you need coal, charcoal, planks, sticks or logs');
  want = Math.min(want, fuel.covers);

  let block = bot.findBlock({ matching: bot.registry.blocksByName.furnace.id, maxDistance: FURNACE_RADIUS });
  let placed = null;
  let unreachable = null;
  if (block) {
    try {
      await walkNear(ctx, block.position);
      block = bot.blockAt(block.position);
    } catch (err) {
      if (err instanceof SkillStop) throw err;
      unreachable = `could not reach the furnace at ${block.position.x} ${block.position.y} ${block.position.z}: ${describeError(err)}`;
      block = null;
      if (!countOf(bot, 'furnace')) return fail(unreachable);
    }
  }
  if (!block && countOf(bot, 'furnace')) {
    // none nearby, or the one nearby is out of reach: put down the one carried
    const r = await placeNearby(ctx, 'furnace');
    if (!r.ok) return fail(`placing a furnace failed: ${r.result}${unreachable ? `; ${unreachable}` : ''}`);
    block = r.block;
    placed = r.block;
  } else if (!block) {
    return fail(`no furnace within ${FURNACE_RADIUS} blocks and none in your inventory (craft furnace from 8 cobblestone)`);
  }
  const at = fmt(block.position);
  if (placed) ctx.stopNote(`the furnace you placed is at ${at}`);

  let furnace;
  try {
    furnace = await timed(ctx, 'open', () => ctx.wait(bot.openFurnace(block)));
  } catch (err) {
    if (err instanceof SkillStop) throw err;
    const note = placed ? pickUpNote(await pickUp(ctx, placed), 'furnace', placed.position) : '';
    return fail(`could not open the furnace at ${at}: ${describeError(err)}${note}`);
  }

  let got = 0;
  let error = null;
  const closeOnce = (() => { let open = true; return () => { if (open) { open = false; try { furnace.close(); } catch { /* already closed */ } } }; })();
  const off = ctx.onCleanup(closeOnce);
  try {
    // Leftovers from an earlier run: take any output; clear input or fuel slots holding something else.
    const click = (fn) => timed(ctx, 'clicks', () => ctx.wait(fn()));
    const outPrev = furnace.outputItem();
    if (outPrev) await click(() => furnace.takeOutput());
    if (furnace.inputItem() && furnace.inputItem().type !== reg[item].id) await click(() => furnace.takeInput());
    if (furnace.fuelItem() && furnace.fuelItem().type !== reg[fuel.name].id) await click(() => furnace.takeFuel());

    ctx.stopNote(`some ${item} or ${fuel.name} may still be in the furnace at ${at}`);
    await click(() => furnace.putFuel(reg[fuel.name].id, null, fuel.units));
    await click(() => furnace.putInput(reg[item].id, null, want));

    let lastChange = Date.now();
    while (got < want) {
      ctx.check();
      const out = furnace.outputItem();
      if (out && out.count > 0) {
        await click(() => furnace.takeOutput());
        got += out.count;
        lastChange = Date.now();
        continue;
      }
      if (!furnace.inputItem()) break;
      if (Date.now() - lastChange > ctx.timing.stallMs) { error = 'the furnace stopped working (out of fuel?)'; break; }
      await timed(ctx, 'cook', () => ctx.sleep(ctx.timing.pollMs));
    }
    // Take back what did not get smelted and unburnt fuel.
    if (furnace.inputItem()) await click(() => furnace.takeInput());
    if (furnace.fuelItem()) await click(() => furnace.takeFuel());
  } catch (err) {
    if (err instanceof SkillStop) {
      await takeBack(furnace);
      const left = [furnace.inputItem(), furnace.fuelItem(), furnace.outputItem()].filter(Boolean);
      ctx.stopNote(left.length
        ? `${left.map((i) => `${i.count} ${i.name}`).join(', ')} still in the furnace at ${at}`
        : placed ? `took the items back; the furnace you placed is still at ${at}` : null);
      throw err;
    }
    error = describeError(err);
  } finally {
    off();
    closeOnce();
  }
  ctx.check();
  ctx.stopNote(placed ? `the furnace you placed is at ${at}` : null);

  let furnaceNote = '';
  if (placed) furnaceNote = pickUpNote(await pickUp(ctx, placed), 'furnace', placed.position);

  const summary = `smelted ${got} ${item} into ${got} ${output}, burning ${fuel.name}`;
  if (error) return fail(`${summary}; then ${error}${furnaceNote}`);
  if (got >= n) return done(`${summary}${furnaceNote}`);
  if (capped && got >= want && want === SMELT_PER_CALL) {
    return done(`${summary}${furnaceNote}; one call smelts at most ${SMELT_PER_CALL}, call smelt again for the other ${Math.min(n, have) - got}`);
  }
  const short = have < n ? `you only had ${have} ${item}` : fuel.covers < Math.min(n, have, SMELT_PER_CALL) ? `fuel ran short (${fuel.name})` : 'the furnace made fewer than asked';
  return fail(`${summary}, not ${n}: ${short}${furnaceNote}`);
}
