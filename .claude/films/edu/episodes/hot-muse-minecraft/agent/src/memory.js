// src/memory.js - the brain's memory. Short-term: the last steps of a run kept verbatim as assistant/tool messages,
// older steps folded into one-line summaries. Long-term: notes.json with known crafting tables, furnaces and chests and
// a list of lessons. The brain reads and writes notes through this plain API; the model has no tool that writes them.

import fs from 'node:fs';
import path from 'node:path';

/** Blocks whose positions are worth remembering between steps and runs. */
export const STATIONS = Object.freeze(['crafting_table', 'furnace', 'chest']);

const NOTES_VERSION = 1;
// control characters (newline and tab kept by cleanText's caller when wanted) plus the Unicode line separators
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f\u2028\u2029]/g;
const LIMIT = 30_000_000;

/** One line of plain text: control characters become spaces, runs of spaces collapse, clipped to max characters. */
export function cleanText(value, max = 200) {
  const s = String(value ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Inventory delta as text: "+4 oak_log, -3 oak_planks". */
export function deltaText(delta = {}) {
  return Object.entries(delta).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
}

/** The call as the model wrote it, for summaries and the loop guard: `collect {"block":"oak_log","n":4}`. */
export function callText(tool, args) {
  const a = args && Object.keys(args).length ? ` ${JSON.stringify(args)}` : '';
  return `${tool}${a}`;
}

/**
 * One summary line for a finished step.
 * @param {{step:number, tool:string|null, args:object|null, ok:boolean, result:string, delta?:object}} r
 */
export function summarizeStep(r) {
  if (!r.tool) return `#${r.step} ${cleanText(r.result, 80)}`;
  const d = deltaText(r.delta);
  const outcome = r.ok ? `OK${d ? ` (${d})` : ''}` : `FAILED: ${cleanText(r.result, 100)}`;
  return `#${r.step} ${callText(r.tool, r.args)}: ${outcome}`;
}

/**
 * Short-term memory for one run. Each turn is the messages of one step (an assistant message with its tool calls and
 * one tool message per call, kept together so a tool_call_id never loses its call). Between `keep` and 2*keep turns
 * stay verbatim; past that, the oldest are folded into summary lines down to `keep`. Folding in blocks keeps every
 * request a byte prefix of the next one for `keep` steps at a time, so a provider's prefix cache keeps hitting.
 * @param {{keep?: number, maxEarlier?: number}} [opts]
 */
export function createShortMemory({ keep = 8, maxEarlier = 30 } = {}) {
  const k = Math.max(1, Math.floor(keep));
  let turns = [];
  let earlier = [];
  let hidden = 0;
  return {
    keep: k,
    /** Add one step: its messages (may be empty) and its summary line. */
    add(messages, line) {
      turns.push({ messages: [...messages], line: String(line) });
      if (turns.length > 2 * k) {
        for (const t of turns.splice(0, turns.length - k)) earlier.push(t.line);
        if (earlier.length > maxEarlier) {
          hidden += earlier.length - maxEarlier;
          earlier = earlier.slice(-maxEarlier);
        }
      }
    },
    /** The verbatim turns as chat messages, oldest first. */
    messages: () => turns.flatMap((t) => t.messages),
    /** Summary lines of the folded steps ('' when none). */
    earlier: () => (hidden ? [`(${hidden} older steps not shown)`, ...earlier] : earlier).join('\n'),
    get size() { return turns.length; },
    clear() { turns = []; earlier = []; hidden = 0; },
  };
}

const emptyNotes = () => ({ version: NOTES_VERSION, updated: null, places: Object.fromEntries(STATIONS.map((s) => [s, []])), lessons: [] });

function cleanPos(p) {
  if (!p || typeof p !== 'object') return null;
  const [x, y, z] = [p.x, p.y, p.z].map(Number);
  if (![x, y, z].every(Number.isFinite)) return null;
  const pos = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
  if (Math.abs(pos.x) > LIMIT || Math.abs(pos.z) > LIMIT || pos.y < -64 || pos.y > 320) return null;
  return pos;
}

// Accept only the known shape from disk, so a hand-edited or broken file cannot put odd values into the prompt.
function cleanNotes(raw, { maxPlaces, maxLessons }) {
  const out = emptyNotes();
  if (!raw || typeof raw !== 'object') return out;
  out.updated = typeof raw.updated === 'string' ? cleanText(raw.updated, 40) : null;
  for (const kind of STATIONS) {
    const list = Array.isArray(raw.places?.[kind]) ? raw.places[kind] : [];
    for (const p of list) {
      const pos = cleanPos(p);
      if (pos && !out.places[kind].some((q) => same(q, pos))) out.places[kind].push({ ...pos, seen: cleanText(p.seen ?? '', 40) || null });
      if (out.places[kind].length >= maxPlaces) break;
    }
  }
  const lessons = Array.isArray(raw.lessons) ? raw.lessons : [];
  for (const l of lessons.slice(-maxLessons)) {
    const text = cleanText(typeof l === 'string' ? l : l?.text, 240);
    if (text) out.lessons.push({ key: cleanText(l?.key ?? '', 200) || null, text, at: cleanText(l?.at ?? '', 40) || null });
  }
  return out;
}

const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;

/**
 * Long-term notes, kept in memory and written to a JSON file (atomically, only when something changed) on flush().
 * Without a path the notes live in memory only.
 * @param {{path?: string|null, maxPlaces?: number, maxLessons?: number, now?: () => Date}} [opts]
 */
export function createNotes({ path: file = null, maxPlaces = 6, maxLessons = 30, now = () => new Date() } = {}) {
  const limits = { maxPlaces, maxLessons };
  let data = emptyNotes();
  let loadError = null;
  let dirty = false;

  if (file) {
    try {
      data = cleanNotes(JSON.parse(fs.readFileSync(file, 'utf8')), limits);
    } catch (err) {
      if (err.code !== 'ENOENT') loadError = `notes file ${path.basename(file)} unreadable, starting empty: ${cleanText(err.message, 120)}`;
    }
  }

  const touch = () => { dirty = true; data.updated = now().toISOString(); };

  return {
    path: file,
    get loadError() { return loadError; },
    get dirty() { return dirty; },

    /** Known positions of one station kind (newest first), or all kinds as {kind: [...]}. */
    places(kind) {
      if (kind === undefined) return Object.fromEntries(STATIONS.map((s) => [s, data.places[s].map((p) => ({ ...p }))]));
      return (data.places[kind] ?? []).map((p) => ({ ...p }));
    },

    /** Remember a station at a position. Returns true when it was new. */
    remember(kind, pos) {
      const p = cleanPos(pos);
      if (!STATIONS.includes(kind) || !p) return false;
      const list = data.places[kind];
      if (list.some((q) => same(q, p))) return false;
      list.unshift({ ...p, seen: now().toISOString() });
      if (list.length > maxPlaces) list.length = maxPlaces;
      touch();
      return true;
    },

    /** Forget one known position. Returns true when it was known. */
    forget(kind, pos) {
      const p = cleanPos(pos);
      const list = data.places[kind];
      if (!list || !p) return false;
      const i = list.findIndex((q) => same(q, p));
      if (i < 0) return false;
      list.splice(i, 1);
      touch();
      return true;
    },

    /** Forget every position (call it after a world reset). */
    clearPlaces() {
      if (STATIONS.every((s) => data.places[s].length === 0)) return;
      for (const s of STATIONS) data.places[s] = [];
      touch();
    },

    lessons: () => data.lessons.map((l) => ({ ...l })),

    /**
     * Add a lesson (one line, at most 240 characters). A lesson with the same key replaces the old one, so a repeated
     * failure keeps one up-to-date line. Returns true when the notes changed.
     */
    addLesson(text, { key = null } = {}) {
      const t = cleanText(text, 240);
      if (!t) return false;
      const k = key === null ? null : cleanText(key, 200);
      const i = data.lessons.findIndex((l) => (k ? l.key === k : l.text === t));
      if (i >= 0) {
        if (data.lessons[i].text === t) return false;
        data.lessons.splice(i, 1);
      }
      data.lessons.push({ key: k, text: t, at: now().toISOString() });
      if (data.lessons.length > maxLessons) data.lessons.splice(0, data.lessons.length - maxLessons);
      touch();
      return true;
    },

    /** "crafting_table at (3, 64, -2); furnace at (10, 63, 1), (0, 64, 0)" or '' when nothing is known. */
    placesText() {
      return STATIONS.filter((s) => data.places[s].length)
        .map((s) => `${s} at ${data.places[s].map((p) => `(${p.x}, ${p.y}, ${p.z})`).join(', ')}`)
        .join('; ');
    },

    /** The newest n lessons as "- ..." lines ('' when none). */
    lessonsText(n = 10) {
      return data.lessons.slice(-n).map((l) => `- ${l.text}`).join('\n');
    },

    /** A copy of everything, as written to the file. */
    toJSON: () => JSON.parse(JSON.stringify(data)),

    /** Write the file if something changed. Never throws. */
    flush() {
      if (!dirty || !file) { dirty = false; return { ok: true, written: false }; }
      const tmp = `${file}.${process.pid}.tmp`;
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
        fs.renameSync(tmp, file);
        dirty = false;
        return { ok: true, written: true };
      } catch (err) {
        try { fs.rmSync(tmp, { force: true }); } catch { /* nothing to clean */ }
        return { ok: false, written: false, error: cleanText(err.message, 200) };
      }
    },
  };
}
