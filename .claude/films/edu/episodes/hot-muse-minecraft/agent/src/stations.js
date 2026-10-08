// src/stations.js - crafting tables and furnaces a bot placed stay where they stand (roadmap M2, S4): the bot that
// placed one owns it and reuses it while it works within REUSE_RADIUS of it; no other bot uses it, mines it or takes
// what is in it; a bot owns at most MAX_PER_BOT (placing one more retires its oldest); and when its game ends its
// stations are removed. One registry per world: per Minecraft server for real bots (every bot of this process on that
// server shares it), per world object for a stand-in bot (tests). The blocks are removed through the server console
// (MC_CONSOLE) with "execute if block ... run setblock ... air", which drops nothing and leaves any other block alone;
// with no console a retired station is only forgotten (and logged).

import fs from 'node:fs';

export const STATION_BLOCKS = Object.freeze(['crafting_table', 'furnace']);
/** A bot walks back to its own station (or to one nobody owns) when it is at most this far away. */
export const REUSE_RADIUS = 24;
/** Stations one bot may own at once; one more retires the oldest. */
export const MAX_PER_BOT = 4;

const keyOf = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const xyz = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });

/**
 * A registry of placed stations. Entries: {owner, name, pos: {x, y, z}, at, temp}. temp marks a station nobody owns
 * that a bot holds while its items are in it (a furnace still smelting): it is never removed from the world, and
 * does not count against the cap.
 */
export function createStationRegistry() {
  const byKey = new Map();
  let seq = 0;
  const list = (owner, name) => [...byKey.values()].filter((s) => s.owner === owner && (!name || s.name === name));
  return {
    /** The owner of the station at pos, or null. */
    ownerOf(pos) { return byKey.get(keyOf(pos))?.owner ?? null; },
    get(pos) { return byKey.get(keyOf(pos)) ?? null; },
    /** True when `owner` may use or mine the block at pos (it owns it, or nobody does). */
    usableBy(owner, pos) {
      const s = byKey.get(keyOf(pos));
      return !s || s.owner === owner;
    },
    /** Stations of one owner (optionally of one kind), oldest first. */
    owned(owner, name = null) { return list(owner, name).filter((s) => !s.temp).sort((a, b) => a.at - b.at); },
    /** Every entry of one owner, temporary holds included. */
    held(owner) { return list(owner, null); },
    /**
     * Record a station `owner` placed (or holds for a while: temp). Returns the stations retired to stay within
     * MAX_PER_BOT (already dropped from the registry; the caller removes the blocks).
     */
    add(owner, name, pos, { temp = false } = {}) {
      const k = keyOf(pos);
      const cur = byKey.get(k);
      if (cur && cur.owner !== owner) return [];
      byKey.set(k, { owner, name, pos: xyz(pos), at: ++seq, temp: Boolean(temp && !(cur && !cur.temp)) });
      if (temp) return [];
      const mine = this.owned(owner);
      const retired = [];
      while (mine.length > MAX_PER_BOT) {
        const s = mine.shift();
        byKey.delete(keyOf(s.pos));
        retired.push(s);
      }
      return retired;
    },
    /** Drop the entry at pos (mined, gone, or a temporary hold that ended). */
    remove(pos) { return byKey.delete(keyOf(pos)); },
    /** Drop every entry of one owner; returns the stations it placed (not the temporary holds). */
    release(owner) {
      const out = [];
      for (const [k, s] of byKey) {
        if (s.owner !== owner) continue;
        byKey.delete(k);
        if (!s.temp) out.push(s);
      }
      return out;
    },
    get size() { return byKey.size; },
  };
}

const registries = new Map(); // "host:port" -> registry
const worlds = new WeakMap(); // stand-in bot -> registry

/** The registry of a bot's world: shared by every real bot on the same server, one per stand-in bot. */
export function registryForWorld(key) {
  if (key && typeof key === 'object') {
    if (!worlds.has(key)) worlds.set(key, createStationRegistry());
    return worlds.get(key);
  }
  const k = String(key ?? 'default');
  if (!registries.has(k)) registries.set(k, createStationRegistry());
  return registries.get(k);
}

/**
 * One line to the server console FIFO, opened non-blocking (with no server reading it, it fails instead of hanging).
 * Only the fixed command shapes this module builds are written.
 */
export function consoleLine(file, line) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('no server console (MC_CONSOLE)')); return; }
    if (!/^execute if block -?\d+ -?\d+ -?\d+ minecraft:[a-z_]+ run setblock -?\d+ -?\d+ -?\d+ air$/.test(line)) {
      reject(new Error('refused console line'));
      return;
    }
    fs.open(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NONBLOCK, (err, fd) => {
      if (err) { reject(err); return; }
      fs.write(fd, `${line}\n`, (e) => { fs.close(fd, () => {}); if (e) reject(e); else resolve(); });
    });
  });
}

/** The console line that removes one station, only if that block is still there. */
export const removeLine = (s) => `execute if block ${s.pos.x} ${s.pos.y} ${s.pos.z} minecraft:${s.name} run setblock ${s.pos.x} ${s.pos.y} ${s.pos.z} air`;

/**
 * Remove stations from the world through the console. Resolves the number removed (lines the server accepted to run);
 * never throws.
 * @param {string|null} file   MC_CONSOLE
 * @param {Array<{name: string, pos: {x:number,y:number,z:number}}>} stations
 */
export async function removeStations(file, stations) {
  if (!file || !stations.length) return 0;
  let n = 0;
  for (const s of stations) {
    if (!STATION_BLOCKS.includes(s.name)) continue;
    try { await consoleLine(file, removeLine(s)); n += 1; } catch { /* the server is gone: nothing to clean */ }
  }
  return n;
}
