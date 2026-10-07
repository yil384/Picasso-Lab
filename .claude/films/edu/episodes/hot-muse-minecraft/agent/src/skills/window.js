// src/skills/window.js - clicking in container windows (crafting table, the 2x2 grid, furnace) so that the client's
// picture always matches the server's. mineflayer 4.39 on 1.17.1+ servers sends each click and goes on at once:
// the server answers every click whose stateId is stale with a full window resync, and those resyncs describe the
// window as it was a few clicks earlier. mineflayer applies them over its own optimistic picture, so the next click is
// decided on a stale window: a stick goes where a plank should be, the grid matches nothing (no item, or a ghost item
// that only the client believes in) or the wrong recipe (a birch button). Its click loops also run on promises only,
// with no timer in between, and a loop that never converges starves the event loop (no timeout can fire).
//
// Here every sequence of clicks is planned from a window state the server has confirmed, sent as packets (the server
// applies a click to its own state; what the client claims only decides what it resends), and followed by a settle
// that waits until the server's answer to the last click is in. Each click carries stateId -1, which the server
// always answers with exactly one full resync, so "settled" is a count, not a guess.

import { requireMc } from '../mc.js';

/** How long the server gets to open a window, and to answer the clicks sent so far. */
export const OPEN_MS = 5_000;
export const SETTLE_MS = 4_000;
/** Packets in a row before a short pause (Paper kicks a client that sends more than 500 packets a second). */
const BURST = 24;
const BURST_GAP_MS = 60;
/** After the expected answers are in: a short quiet spell in which nothing more for this window arrives. */
const QUIET_MS = 100;

const trackers = new WeakMap();
const items = new WeakMap();

/** True for a bot that talks to a server through minecraft-protocol (the real mineflayer bot, or a fake that emulates it). */
export const canClick = (bot) => typeof bot?._client?.write === 'function' && typeof bot._client.on === 'function';

function itemLib(bot) {
  if (!items.has(bot)) items.set(bot, requireMc('prismarine-item')(bot.registry));
  return items.get(bot);
}

/** Per bot: how many full resyncs each window id has received, and when the server last touched it. */
function tracker(bot) {
  if (trackers.has(bot)) return trackers.get(bot);
  const t = { full: new Map(), last: new Map() };
  const touch = (id) => t.last.set(id, Date.now());
  bot._client.on('window_items', (p) => { t.full.set(p.windowId, (t.full.get(p.windowId) ?? 0) + 1); touch(p.windowId); });
  bot._client.on('set_slot', (p) => touch(p.windowId));
  bot._client.on('set_player_inventory', () => touch(0));
  trackers.set(bot, t);
  return t;
}

/** Wait for one event (filtered) with a time limit; resolves with the event's arguments or rejects with `why`. */
function eventWithin(emitter, event, ms, why, test = () => true) {
  return new Promise((resolve, reject) => {
    const on = (...args) => {
      if (!test(...args)) return;
      clearTimeout(timer);
      emitter.removeListener(event, on);
      resolve(args);
    };
    const timer = setTimeout(() => { emitter.removeListener(event, on); reject(new Error(why)); }, ms);
    emitter.on(event, on);
  });
}

/**
 * A planned, confirmed click session on one window. click() only sends; settle() waits until the server has answered
 * every click sent so far (and the client's window shows the server's state).
 */
export function clicker(ctx, window) {
  const { bot } = ctx;
  const t = tracker(bot);
  const Item = itemLib(bot);
  const id = window.id;
  let expect = t.full.get(id) ?? 0;
  let sinceGap = 0;
  let sent = false; // a click since the last settle (its answer is the resync settle waits for)

  async function send(slot, mouseButton, mode) {
    ctx.check();
    if (window !== (bot.currentWindow ?? bot.inventory)) throw new Error('the window was closed');
    bot._client.write('window_click', {
      windowId: id, stateId: -1, slot, mouseButton, mode, changedSlots: [], cursorItem: Item.toNotch(null),
    });
    expect += 1;
    sent = true;
    if (++sinceGap >= BURST) {
      sinceGap = 0;
      await ctx.sleep(BURST_GAP_MS);
    }
  }

  return {
    window,
    /** Left (0) or right (1) click on a slot; mode 1 is a shift-click (move to the other part of the window). */
    click: (slot, button = 0, mode = 0) => send(slot, button, mode),
    /** Send a list of [slot, button, mode]. */
    async clicks(list) {
      for (const [slot, button = 0, mode = 0] of list) await send(slot, button, mode);
    },
    /**
     * Wait until the server has answered every click sent so far. With no click pending, ask for a resync (the end
     * of a drag that never started changes nothing). Throws when the server stays silent for SETTLE_MS.
     */
    async settle() {
      if (!sent) await send(-999, 2, 5);
      sent = false;
      sinceGap = 0;
      const until = Date.now() + (ctx.timing?.windowMs ?? SETTLE_MS);
      while ((t.full.get(id) ?? 0) < expect) {
        if (Date.now() > until) throw new Error('the server did not answer the clicks in time');
        if (window !== (bot.currentWindow ?? bot.inventory)) throw new Error('the window was closed');
        await ctx.sleep(20);
      }
      while (Date.now() - (t.last.get(id) ?? 0) < QUIET_MS && Date.now() < until) await ctx.sleep(QUIET_MS / 2);
      expect = Math.max(expect, t.full.get(id) ?? 0);
    },
  };
}

/** Close whatever window is open (crafting table, furnace) so clicks go to the player's own inventory. */
export function closeCurrent(bot) {
  if (!bot.currentWindow) return;
  try { bot.closeWindow(bot.currentWindow); } catch { /* already closed */ }
}

/**
 * Open the window of a block (crafting table, furnace): look at it, use it, wait for the window with a time limit.
 * The window is closed again if the skill is stopped. Returns {window, close}.
 */
export async function openBlockWindow(ctx, block, typePrefix, what) {
  const { bot } = ctx;
  tracker(bot);
  closeCurrent(bot);
  const ms = ctx.timing?.openMs ?? OPEN_MS;
  const opened = eventWithin(bot, 'windowOpen', ms, `the ${what} did not open (no answer from the server within ${ms / 1000} s)`);
  opened.catch(() => {});
  Promise.resolve().then(() => bot.activateBlock(block)).catch(() => {});
  const [window] = await ctx.wait(opened);
  let open = true;
  const close = () => {
    if (!open) return;
    open = false;
    try { if (bot.currentWindow === window) bot.closeWindow(window); } catch { /* already closed */ }
  };
  const off = ctx.onCleanup(close);
  if (!String(window.type).startsWith(typePrefix)) {
    close();
    off();
    throw new Error(`that block opened a ${window.type} window, not a ${what}`);
  }
  return { window, close: () => { off(); close(); } };
}

/**
 * After a window closed: wait until the player inventory matches the server (the server puts back whatever was left
 * in the grid and sends the changes; those used to arrive after the skill had already reported its inventory change).
 */
export async function settleInventory(ctx) {
  const { bot } = ctx;
  if (!canClick(bot) || bot.currentWindow) return;
  try {
    await clicker(ctx, bot.inventory).settle();
  } catch (err) {
    if (err?.name === 'SkillStop') throw err;
    /* best effort: the inventory is reported as the client sees it */
  }
}

/**
 * For the body, outside any skill: wait until the player inventory shows what the server has (a resync of window 0
 * and a quiet spell after it). Never throws; false when there is nothing to sync or the server did not answer.
 */
export async function syncInventory(bot, ms = 1_500) {
  if (!canClick(bot) || bot.currentWindow || !bot.inventory) return false;
  try {
    const t = tracker(bot);
    const before = t.full.get(0) ?? 0;
    bot._client.write('window_click', {
      windowId: 0, stateId: -1, slot: -999, mouseButton: 2, mode: 5, changedSlots: [], cursorItem: itemLib(bot).toNotch(null),
    });
    const until = Date.now() + ms;
    const nap = (d) => new Promise((r) => { setTimeout(r, d); });
    while ((t.full.get(0) ?? 0) <= before) {
      if (Date.now() > until) return false;
      await nap(20);
    }
    while (Date.now() - (t.last.get(0) ?? 0) < QUIET_MS && Date.now() < until) await nap(QUIET_MS / 2);
    return true;
  } catch {
    return false;
  }
}

/** Inventory slots of a window (main + hotbar) holding an item id, as [{slot, count}], fullest first. */
export function stacksOf(window, id) {
  const out = [];
  for (let s = window.inventoryStart; s < window.inventoryEnd; s++) {
    const it = window.slots[s];
    if (it && it.type === id) out.push({ slot: s, count: it.count });
  }
  return out.sort((a, b) => b.count - a.count);
}

/** How many of an item id the window's inventory part holds (plus the cursor). */
export function countIn(window, id) {
  let n = window.selectedItem?.type === id ? window.selectedItem.count : 0;
  for (let s = window.inventoryStart; s < window.inventoryEnd; s++) {
    const it = window.slots[s];
    if (it && it.type === id) n += it.count;
  }
  return n;
}

/** The first empty slot of the window's inventory part, or null. */
export function emptySlotIn(window) {
  for (let s = window.inventoryStart; s < window.inventoryEnd; s++) if (!window.slots[s]) return s;
  return null;
}

/**
 * Clicks that put `perSlot` of item `id` into each of `dests` (container slots), taken from the inventory stacks:
 * pick a stack up, right-click one at a time into each destination, put what is left back where it came from. Planned
 * on a settled window. Returns null when the inventory does not hold enough.
 */
export function planPut(window, id, dests, perSlot) {
  const stacks = stacksOf(window, id);
  const need = dests.length * perSlot;
  if (stacks.reduce((s, x) => s + x.count, 0) < need) return null;
  const out = [];
  let held = 0;
  let from = null;
  let next = 0;
  for (const dest of dests) {
    let want = perSlot;
    while (want > 0) {
      if (held === 0) {
        from = stacks[next++];
        out.push([from.slot, 0, 0]);
        held = from.count;
      }
      const put = Math.min(want, held);
      if (put === held && put > 1) out.push([dest, 0, 0]); // everything held goes there: one left click
      else for (let i = 0; i < put; i++) out.push([dest, 1, 0]);
      held -= put;
      want -= put;
    }
  }
  if (held > 0) out.push([from.slot, 0, 0]); // the rest back into the slot it came from (empty now)
  return out;
}
