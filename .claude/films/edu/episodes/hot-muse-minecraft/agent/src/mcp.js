// src/mcp.js - the MCP endpoint (/mcp, streamable HTTP) so an agent such as Muse can play through a connector instead
// of a web page. Built to save the agent's time: every call answers within CALL_MS with the result AND the new state
// in one reply (no separate state read), and play_sequence runs several skills in one call. The steps of play and
// play_sequence go into the game's queue (src/mcp-queue.js) and keep running past the reply; a later reply reports
// them (get_state waits for them), and a result counts as reported only once a reply carrying it was delivered: the
// HTTP response was written out in full (not cut by a dropped connection, a proxy giving up or the client cancelling).
// A call is checked before it is queued (src/plan.js): bad arguments or missing items refuse it whole (also when the
// SDK's own input check catches them: BAD_ARGS with the state, like any refusal), and planks, sticks, a table or a
// furnace it needs are added as crafts. A repeat of a call (same request_id, or the same call while its results have
// not reached the client, at most 60 s after it ended) returns the first call's steps and runs nothing twice. Replies
// carry structuredContent too: each step's status and typed code, what changed, and a short state (ROADMAP M2).
// One MCP session = at most one guest bot, with the same leases and logging as the web page (src/web.js gives the
// hooks); games are also capped per address, and MCP sessions themselves are capped in number and body size. When
// every bot is in use, start_game answers with the caller's place in the queue and an estimate.
// The game is for adults: start_game needs adult: true, which the agent sets only after its user has confirmed 18+.
// Replies and the server instructions carry no links and never ask the agent to open or show anything; where to watch
// is data that only the read-only live_view tool returns. A game is resumed from a new connection with a separate
// random handle (never the control token), valid while that game lives. Each MCP client's protocol version and the
// name and version it reports are logged (mcp_client).

import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { RESULT_CODES, CRAFT_BATCH_MAX, skillSet } from './contracts.js';
import { createQueue, isFinal, statusOf, stepName, stepNumber, QUEUE_MAX, REPEAT_MS } from './mcp-queue.js';
import { createPlanner, describeMissing } from './plan.js';
import { registryFor } from './mc.js';
import { liveViewHtml } from './live-page.js';

const CALL_MS = 45_000; // every reply within 45 s: MCP clients commonly give up after 60 s (a long skill keeps going)
/** Of a call's time, what building the reply may take (the state text scans the blocks around: ~850 ms on Paper). */
const replyBudget = (callMs) => Math.min(2_000, Math.round(callMs / 20));
const IDLE_MS = 5 * 60_000; // a game nobody has called for 5 minutes (and that runs nothing) is ended, freeing its bot
const IDLE_SESSION_MS = 10 * 60_000; // an MCP session without a game is dropped after 10 minutes without calls
const JOIN_WAIT_MS = 30_000;
const MAX_STEPS = 32;
const MAX_BODY = 64 * 1024; // the SDK's own default is 4 MiB, kept for the session's life in clientInfo
const STATION_RADIUS = 24; // craft and smelt use a table or furnace this close (REUSE_RADIUS in src/stations.js)

/** One argument of a skill as text: names, enums in full, nested objects with their fields, integer ranges. */
function argText(k, v) {
  if (v.enum) return `${k}: one of ${v.enum.join('|')}`;
  if (v.type === 'array') return `${k}: list of ${v.minItems ?? 0} to ${v.maxItems} {${Object.keys(v.items?.properties ?? {}).join(', ')}}`;
  if (v.type === 'object') return `${k}: {${Object.entries(v.properties ?? {}).map(([pk, pv]) => argText(pk, pv)).join(', ')}}`;
  if (v.type === 'integer') return `${k}: integer${v.maximum - v.minimum <= 1000 ? ` ${v.minimum} to ${v.maximum}` : ''}`;
  if (v.type === 'boolean') return `${k}: true|false`;
  if (v.type === 'string') return `${k}: text${v.maxLength ? ` (${v.minLength ?? 0} to ${v.maxLength} characters)` : ''}`;
  return `${k}: ${v.type}`;
}

/** One line per skill: name {args} - what it does. Goes into play's description so the agent needs no lookup. */
export function skillList(skills = skillSet().mcpSkills) {
  return skills.map(({ function: f }) => {
    const required = f.parameters.required ?? Object.keys(f.parameters.properties ?? {});
    const args = Object.entries(f.parameters.properties ?? {}).map(([k, v]) => `${argText(k, v)}${required.includes(k) ? '' : ' (optional)'}`).join(', ');
    return `- ${f.name} {${args}}: ${f.description}`;
  }).join('\n');
}

/** {skill, args, ...stray}: arguments put next to skill instead of inside args are taken as its args. */
function splitCall({ skill, args, ...rest }) {
  const stray = Object.keys(rest);
  if (!stray.length) return { skill, args: args ?? {} };
  if (args === undefined) return { skill, args: rest };
  return { skill, args, error: `put every argument of ${skill} inside args (found ${stray.join(', ')} next to it)` };
}

const roughly = (ms) => (ms < 60_000 ? 'under 1 min' : `about ${Math.round(ms / 60_000)} min`);
// eslint-disable-next-line no-control-regex
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim().slice(0, max);
const fmtDelta = (delta) => Object.entries(delta ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');

/** The part of a step's inventory change that is not the step's own use or gain (delta minus own); {} without own. */
export function otherChange(r) {
  const out = {};
  if (!r?.own) return out;
  for (const k of new Set([...Object.keys(r.delta ?? {}), ...Object.keys(r.own)])) {
    const d = (r.delta?.[k] ?? 0) - (r.own[k] ?? 0);
    if (d) out[k] = d;
  }
  return out;
}

/**
 * The rest of a step's change (otherChange) by what can be told from the item alone: a tool or armour piece fewer
 * (worn out: it has durability), food fewer (eaten meanwhile: the body eats on its own when hungry), and everything else
 * (blocks dug through, scaffolding placed, items picked up, other drops of a kill, the drops of cells a build dug clear).
 */
export function splitOther(other, version = '1.21.4') {
  const reg = registryFor(version);
  const worn = {};
  const eaten = {};
  const rest = {};
  for (const [k, v] of Object.entries(other ?? {})) {
    if (v < 0 && reg.itemsByName[k]?.maxDurability) worn[k] = v;
    else if (v < 0 && reg.foodsByName[k]) eaten[k] = v;
    else rest[k] = v;
  }
  return { worn, eaten, rest };
}

/**
 * A step's inventory change as reply text: the whole change, or, when the body can tell what the step itself used and
 * made (r.own), that first and the rest apart, each part named by what it can be ("-3 cobblestone, -2 stick, +1
 * stone_pickaxe; also changed meanwhile (dug through, scaffolding, pickups, other drops): +1 cobblestone; worn out: -1
 * wooden_pickaxe; eaten meanwhile: -1 cooked_porkchop"), so a recipe never looks wrong for an item picked up meanwhile
 * and a tool that broke or a meal is never put down to scaffolding.
 */
export function changeText(r, skill) {
  if (!r?.own) return fmtDelta(r?.delta);
  // what it used, then what it made
  const mine = fmtDelta(Object.fromEntries(Object.entries(r.own).sort(([, a], [, b]) => Math.sign(a) - Math.sign(b))));
  const { worn, eaten, rest } = splitOther(otherChange(r));
  const label = skill === 'build' ? 'also from digging the site and on the way' : 'also changed meanwhile (dug through, scaffolding, pickups, other drops)';
  const parts = [
    mine,
    fmtDelta(rest) && `${label}: ${fmtDelta(rest)}`,
    fmtDelta(worn) && `worn out: ${fmtDelta(worn)}`,
    fmtDelta(eaten) && `eaten meanwhile (the body eats on its own when hungry): ${fmtDelta(eaten)}`,
  ];
  return parts.filter(Boolean).join('; ');
}

/** used / gained / other of a step's result for structuredContent (only what the body could tell apart). */
function splitOf(r) {
  if (!r?.own) return {};
  const pick = (sign) => Object.fromEntries(Object.entries(r.own).filter(([, v]) => v * sign > 0).map(([k, v]) => [k, Math.abs(v)]));
  const used = pick(-1);
  const gained = pick(1);
  const other = otherChange(r);
  return { ...(Object.keys(used).length ? { used } : {}), ...(Object.keys(gained).length ? { gained } : {}), ...(Object.keys(other).length ? { other } : {}) };
}

/** "4. " for the caller's step 4 ("4 (part 2 of 3). " for a part of a split craft_batch), "+ " for a craft the check added. */
const numberOf = (st) => (st.step != null ? `${stepNumber(st)}. ` : '+ ');
/** A step named in a sentence: "4. craft {...}", or "craft {...} (added before step 4)". */
const refOf = (st, describe) => (st.step != null ? `${stepNumber(st)}. ${describe(st)}` : `${describe(st)} (added before step ${st.before ?? '?'})`);

/** "12 oak_planks, 4 stick for wooden_pickaxe; 1 crafting_table for wooden_axe": items the check put into a batch. */
function addedItemsText(items) {
  const groups = [];
  for (const { item, n, for: why } of items ?? []) {
    const g = groups.find((x) => x.why === (why ?? null));
    if (g) g.list.push(`${n} ${item}`); else groups.push({ why: why ?? null, list: [`${n} ${item}`] });
  }
  return groups.map((g) => `${g.list.join(', ')}${g.why ? ` for ${g.why}` : ''}`).join('; ');
}

/** A step as the caller should read it: its number, the skill and args, and what the check added or changed in it. */
function headOf(st, numbered) {
  const notes = [];
  if (st.added) notes.push(`added by the check before step ${st.before ?? '?'}, ${st.added}`);
  if (st.addedItems?.length) notes.push(`the check added to your list: ${addedItemsText(st.addedItems)}`);
  if (st.parts > 1) notes.push(`part ${st.part} of ${st.parts}: with the added items your list is longer than ${CRAFT_BATCH_MAX}, so it runs in ${st.parts} parts`);
  return `${numbered ? numberOf(st) : ''}${st.skill} ${JSON.stringify(st.args)}${notes.length ? ` (${notes.join('; ')})` : ''}`;
}

/**
 * What the check added, as the lead of a reply: crafts of their own ("+" lines) and items put into a craft_batch's list
 * (named on that step's line), each counted apart; null when it added nothing.
 */
function addedLead(planned) {
  const crafts = planned.filter((st) => st.added).length;
  const batches = planned.filter((st) => st.addedItems?.length);
  const out = [];
  if (crafts) out.push(`The check added ${crafts} craft${crafts > 1 ? 's' : ''} your steps need (marked + below, each just before the step that needs it).`);
  for (const st of batches) {
    const k = st.addedItems.length;
    out.push(`The check put ${k} item${k > 1 ? 's' : ''} into the craft_batch list of your step ${st.step} (named on that line${st.parts > 1 ? `; the list now runs in ${st.parts} parts, numbered ${st.step} (part 1 of ${st.parts}) and so on` : ''}).`);
  }
  if (!out.length) return null;
  return `${out.join(' ')} Your steps keep their numbers.`;
}

// structuredContent of play, play_sequence, get_state and stop (declared, so a client can rely on its shape)
const COUNTS = z.record(z.string(), z.number());
const STEP_OUT = z.object({
  n: z.number().describe('the order the steps of one call run in, added crafts included: unique only within its call (your numbering is step)'),
  call: z.number().optional().describe('which call of this game the step came from: #1, #2, ... (each play and play_sequence that was accepted; its reply says call)'),
  step: z.number().nullable().describe('your step number, as you sent it; null for a craft the check added'),
  before: z.number().optional().describe('for a craft the check added: your step it was added before'),
  part: z.number().optional().describe('for a craft_batch the check made longer than its limit: which part of your step this is (of parts)'),
  parts: z.number().optional(),
  addedItems: z.array(z.object({ item: z.string(), n: z.number(), for: z.string().nullish() }).loose()).optional().describe('items the check put into this craft_batch\'s list, with what they are for'),
  skill: z.string(),
  args: z.record(z.string(), z.any()),
  status: z.enum(['pending', 'confirmed', 'failed', 'cancelled']),
  running: z.boolean().optional(),
  result: z.string().optional(),
  delta: COUNTS.optional().describe('the whole inventory change while the step ran (+ more, - fewer)'),
  used: COUNTS.optional().describe('what the step itself used, e.g. a recipe\'s ingredients'),
  gained: COUNTS.optional().describe('what the step itself made or collected'),
  other: COUNTS.optional().describe('the rest of delta (delta minus used and gained): blocks dug through or scaffolding placed on the way, items picked up, other drops of a kill, drops of cells a build dug clear, a tool that wore out, food the body ate on its own (the text names the last two apart)'),
  code: z.string().optional(),
  added: z.string().optional(),
  why: z.string().optional(),
}).loose();
const REPLY_OUT = z.object({
  code: z.enum(RESULT_CODES).nullable().describe('the typed outcome of this call; null when nothing went wrong'),
  game: z.string().nullable(),
  call: z.number().optional().describe('for play and play_sequence: this call\'s number in the game (#1, #2, ...), as later replies name it'),
  steps: z.array(STEP_OUT).describe("this call's steps"),
  earlier: z.array(STEP_OUT).describe('steps of earlier calls that finished since your last reply'),
  queue: z.object({ running: z.string().nullable(), waiting: z.number() }),
  changed: z.record(z.string(), z.number()).describe('inventory change of every finished step in this reply'),
  state: z.record(z.string(), z.any()).nullable().describe('health, food, pos, inventory, timeLeftS'),
  onItsOwn: z.array(z.object({ seq: z.number(), agoS: z.number(), source: z.enum(['care', 'reflex']), kind: z.string(), ok: z.boolean(), text: z.string() }).loose()).optional().describe('what the body did by itself since your last reply (care: its own plans between your calls, full mode only; reflex: fights, meals, deaths)'),
  advice: z.array(z.object({ kind: z.string(), text: z.string(), hint: z.object({ skill: z.string(), args: z.record(z.string(), z.any()) }).optional() }).loose()).optional().describe('what needs doing that the body will not do by itself, most urgent first; hint: a skill that would do it'),
  attribution: z.object({ muse: z.number(), reflex: z.number(), care: z.number(), musePct: z.number().nullable() }).optional().describe('get_state: who acted this game (your skills, the body\'s reflexes, its own plans in full mode)'),
}).loose();

/**
 * @param {object} hooks from createWeb: newSession(req, adult, {key, address}), lookup(token), startAction(s, tool,
 *   args), stateText(s), stopSession(s, reason), endSession(s, reason), links(s, base) -> {eyes, watch} (live_view
 *   only), liveVideo(s) -> {videoUrl, embedUrl} | null, leaveQueue(key), within(promise, ms), TIMEOUT, log, now(),
 *   clientKey(req), base(req), leaseMs, initLimiter (take(key)), limits {sessions, perAddress}, callMs (tests),
 *   skills (contracts.skillSet(): the skills play and play_sequence take; default the 10 tools and craft_batch)
 * @returns {(req, res) => Promise<void>} the /mcp handler
 */
export function createMcp(hooks) {
  const sessions = new Map(); // MCP session id -> entry {address, base, transport, token, handle, client, key, endedWhy, lastCall}
  const handles = new Map(); // resume handle -> the game's control token, while that game lives
  /** A new resume handle for a game: 128 random bits, a different shape from the 32-character control token. */
  const mintHandle = (token) => {
    const h = crypto.randomBytes(16).toString('base64url');
    handles.set(h, token);
    return h;
  };
  // the skills play and play_sequence take: the 10 tools and craft_batch, plus a body's extra ones (BODY=mineai)
  const skills = hooks.skills ?? skillSet();
  const SKILLS = skillList(skills.mcpSkills);
  // the skills this server offers, by name, in the server instructions and in both play tools (one source: skills),
  // so a client never relies on notes about another server (Muse's own notes listed only some, and it had to guess hunt)
  const SKILL_NAMES_TEXT = skills.names.join(', ');
  // a body that looks after itself between calls (BODY=mineai, src/mineai/care.js) says so in the instructions
  // advise (the default): the player plans; full: the body also carries out its own survival plans; off: neither
  const careMode = hooks.careMode ?? 'advise';
  const CARE_TEXT = !skills.names.includes('armor') || careMode === 'off' ? ''
    : careMode === 'full' ? ' Between your calls the body looks after itself: it shelters at night (or sleeps when it carries a bed), eats and hunts when hungry, wears and crafts armor, crafts a spare before a tool breaks, and goes back for its items after a death; its reflexes fight or flee from mobs. Every reply says what it did on its own (structuredContent.onItsOwn); the policy skill changes it.'
      : ' You plan everything: the body acts by itself only through its reflexes (it fights back or flees when attacked, eats only when starving at food 4 or less, surfaces for air, leaves fire and lava, gets its footing back), each of which the policy skill switches (defend, eat, escape). Every reply carries "Body advice": what needs doing that the body will not do by itself (night coming with no shelter or shield, low food, a tool about to break, items to recover after a death), with the facts and the skill that would do it (shelter and shield are skills too); following it or not is your decision. Replies also say what the reflexes did (structuredContent.onItsOwn), and get_state and end_game count who acted this game (structuredContent.attribution).';
  const now = hooks.now ?? Date.now; // the web's clock (leases, idle, repeats); call deadlines run on the real one
  const callMs = hooks.callMs ?? CALL_MS;
  /** How long a call waits for its steps: callMs less the time its reply takes to build, so the reply leaves within callMs. */
  const waitMs = callMs - replyBudget(callMs);
  // the HTTP request a tool call came in on ({res, cut}): cut aborts when the connection closed before the reply was
  // written out (a dropped connection, a proxy that gave up), which the SDK's per-call signal never sees in JSON mode
  const http = new AsyncLocalStorage();
  /** The call's abort signal: the client cancelled it, or its HTTP connection is gone. */
  const signalOf = (extra) => {
    const list = [extra?.signal, http.getStore()?.cut.signal].filter(Boolean);
    return list.length > 1 ? AbortSignal.any(list) : list[0];
  };
  const limits = { sessions: 200, perAddress: 20, ...(hooks.limits ?? {}) };
  const leaseMin = Math.round((hooks.leaseMs ?? 600_000) / 60_000);
  const queues = new WeakMap(); // game (the web's session object) -> its queue; it moves with the game on a resume
  // game version -> dry-run planner; the server's version is loaded here (about 170 ms), not inside a call's 45 s
  const planners = new Map([['1.21.4', createPlanner({ version: '1.21.4' })]]);

  /** The entry's live game, or why it has none ({s} or {s: null, why}). */
  function lookupGame(entry) {
    if (!entry.token) return { s: null, why: entry.endedWhy };
    try {
      const s = hooks.lookup(entry.token);
      return s.ended ? { s: null, why: s.ended } : { s };
    } catch (e) {
      return { s: null, why: e.reason ?? 'it ended' };
    }
  }
  const game = (entry) => lookupGame(entry).s;
  const text = (t) => ({ content: [{ type: 'text', text: t }] });
  const fail = (t) => ({ content: [{ type: 'text', text: t }], isError: true });
  const queueOf = (s) => {
    let q = queues.get(s);
    if (!q) {
      q = createQueue({ start: (skill, args) => hooks.startAction(s, skill, args), now });
      queues.set(s, q);
    }
    return q;
  };
  const busy = (s) => Boolean(queues.get(s)?.busy);
  const safely = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

  /** ": ok: crafted 4 stick [+4 stick, -2 oak_planks]" for a skill result. */
  const outcome = (r, skill) => {
    const change = changeText(r, skill);
    return `: ${r.ok ? 'ok' : 'FAILED'}: ${r.result}${change ? ` [${change}]` : ''}`;
  };
  const stateBlock = (s) => `State (game ${s.id}, ${roughly(Math.max(0, s.expiresAt - now()))} left; it also ends after ${IDLE_MS / 60_000} min without calls):\n${hooks.stateText(s)}`;

  /** Wait for a promise at most ms, and not past the client cancelling the call: the value, or hooks.TIMEOUT. */
  function wait(promise, ms, signal) {
    if (signal?.aborted || ms <= 0) return Promise.resolve(hooks.TIMEOUT);
    let off = () => {};
    const cut = signal && new Promise((resolve) => {
      const on = () => resolve(hooks.TIMEOUT);
      signal.addEventListener('abort', on, { once: true });
      off = () => signal.removeEventListener('abort', on);
    });
    return hooks.within(cut ? Promise.race([promise, cut]) : promise, ms).finally(off);
  }

  // ----- steps as text and as data

  /**
   * One step as a reply line. numbered (sequences, or a play the check added crafts to): the caller's own step number
   * in front ("4. "), or "+ " for a craft the check added, which takes no number: the caller's steps keep theirs.
   */
  function stepLine(st, numbered) {
    const head = headOf(st, numbered);
    if (st.status === 'confirmed' || st.status === 'failed') return `${head}${outcome(st.result, st.skill)}`;
    if (st.status === 'cancelled') return `${head}: cancelled (${st.why ?? 'stopped'})${st.result ? `: ${st.result.result}${changeText(st.result, st.skill) ? ` [${changeText(st.result, st.skill)}]` : ''}` : ''}`;
    if (st.status === 'running') return `${head}: still running after ${Math.round((now() - st.startedAt) / 1000)} s (long walks and mining take a while); a later reply reports the result`;
    return `${head}: queued`;
  }

  function report(st) {
    const r = st.result;
    return {
      n: st.n,
      ...(st.call?.no != null ? { call: st.call.no } : {}),
      step: st.step,
      ...(st.step == null && st.before != null ? { before: st.before } : {}),
      ...(st.parts > 1 ? { part: st.part, parts: st.parts } : {}),
      skill: st.skill,
      args: st.args,
      status: statusOf(st),
      ...(st.status === 'running' ? { running: true } : {}),
      ...(r ? { result: r.result, delta: r.delta, ...splitOf(r) } : {}),
      ...(st.code ? { code: st.code } : {}),
      ...(st.added ? { added: st.added } : {}),
      ...(st.addedItems?.length ? { addedItems: st.addedItems } : {}),
      ...(st.why ? { why: st.why } : {}),
      ...(r?.ms != null ? { ms: r.ms } : {}),
    };
  }

  /** Health, food, position, inventory and the time left: cheap reads only (no scan of the blocks around). */
  function shortState(s) {
    if (!s) return null;
    const out = { timeLeftS: Math.max(0, Math.round((s.expiresAt - now()) / 1000)) };
    if (s.status !== 'ready' || !s.body) return { ...out, joining: true };
    const bot = safely(() => s.body.bot);
    const p = safely(() => bot?.entity?.position);
    if (p) {
      Object.assign(out, {
        health: Math.round((bot.health ?? 0) * 10) / 10,
        food: bot.food ?? null,
        pos: { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) },
        day: bot.time?.isDay ?? null,
        ...(Number.isFinite(bot.time?.timeOfDay) ? { time: bot.time.timeOfDay } : {}),
      });
      const care = safely(() => s.body.snapshot?.()?.care, null);
      if (care?.now) out.onItsOwnNow = care.now;
    }
    const inventory = safely(() => s.body.inventory?.());
    if (inventory) out.inventory = inventory;
    const equipment = safely(() => s.body.equipment?.()); // worn and off-hand (BODY=mineai), apart from the inventory
    if (equipment && Object.keys(equipment).length) out.equipment = equipment;
    return out;
  }

  const describe = (st) => `${st.skill}${Object.keys(st.args ?? {}).length ? ` ${JSON.stringify(st.args)}` : ''}`;

  /**
   * The steps that outlived earlier calls, by call: a line naming each call ("From your play_sequence #2, sent 41 s
   * ago:"; calls are numbered per game, and the reply to each said its number), then its steps numbered as the caller
   * numbered them (a call of one step unnumbered).
   */
  function earlierText(earlier) {
    const groups = [];
    for (const st of earlier) {
      const g = groups.at(-1);
      if (g && g.call === st.call) g.steps.push(st);
      else groups.push({ call: st.call, steps: [st] });
    }
    return groups.map((g) => {
      const numbered = (g.call?.steps?.length ?? 1) > 1;
      const head = g.call ? `From ${g.call.label}, sent ${Math.round((now() - g.call.at) / 1000)} s ago:\n` : '';
      return `${head}${g.steps.map((st) => stepLine(st, numbered)).join('\n')}`;
    }).join('\n');
  }

  /** One thing the body did by itself, as a reply line: "- 41 s ago, night: closed itself in at ... (ok)". */
  const ownAgo = (e) => Math.max(0, Math.round((now() - Date.parse(e.at)) / 1000));
  const ownLine = (e) => `- ${ownAgo(e)} s ago, ${e.source === 'reflex' ? 'reflex' : 'on its own'}, ${e.kind}: ${e.text}${e.ok === false ? ' (did not work)' : ''}`;
  const adviceLine = (a) => `- ${a.text}${a.hint ? ` (to do it: ${a.hint.skill} ${JSON.stringify(a.hint.args ?? {})})` : ''}`;
  const ownOut = (e) => ({ seq: e.seq, agoS: ownAgo(e), source: e.source, kind: e.kind, ok: e.ok !== false, text: e.text });
  /** The body's own actions a reply carries count as told once its HTTP response was written out in full. */
  function deliverOwnWhenSent(s, seq, extra) {
    const mark = () => { s.ownDelivered = Math.max(s.ownDelivered ?? 0, seq); };
    const call = http.getStore();
    if (signalOf(extra)?.aborted) return;
    if (!call?.res) { mark(); return; }
    call.res.once('finish', () => { if (!call.cut.signal.aborted && !extra?.signal?.aborted) mark(); });
  }

  /** Mark the final steps a reply carries as delivered once its HTTP response was written out in full. */
  function deliverWhenSent(q, shown, extra) {
    const call = http.getStore();
    if (signalOf(extra)?.aborted) return;
    if (!call?.res) { q.delivered(shown); return; } // not over HTTP (no response to watch)
    call.res.once('finish', () => { if (!call.cut.signal.aborted && !extra?.signal?.aborted) q.delivered(shown); });
  }

  /** The code of the first step that failed (cancelled steps aside), or null. */
  const firstCode = (list) => list.find((st) => st.code && st.status !== 'cancelled')?.code ?? null;
  /** For cancelled steps: the code a stopped step ended with, else what cancelled it (a failure's code, STOPPED). */
  const cancelledCode = (list) => {
    const st = list.find((x) => x.status === 'cancelled');
    return st ? st.code ?? st.cause ?? 'STOPPED' : null;
  };

  /**
   * The reply to a call (or to get_state / stop): what finished since the last delivered reply, this call's steps,
   * the state. The final steps it carries count as delivered once the reply reached the client (deliverWhenSent).
   */
  function reply(s, extra, { steps = [], numbered = false, lead = '', tail = '', code = null, isError = false, more = {}, withAttribution = false } = {}) {
    const q = s ? queueOf(s) : null;
    const earlier = q ? q.finished(steps) : [];
    const shown = [...earlier, ...steps.filter(isFinal)];
    if (q) deliverWhenSent(q, shown, extra);
    // what the body did by itself since the last reply that reached the client (BODY=mineai: src/mineai/care.js)
    const own = s && typeof s.body?.onItsOwn === 'function' ? safely(() => s.body.onItsOwn(s.ownDelivered ?? 0), []) ?? [] : [];
    if (own.length) deliverOwnWhenSent(s, own.at(-1).seq, extra);
    const changed = {};
    for (const st of shown) for (const [k, v] of Object.entries(st.result?.delta ?? {})) changed[k] = (changed[k] ?? 0) + v;
    for (const k of Object.keys(changed)) if (!changed[k]) delete changed[k];
    // steps cancelled before they started are listed once, in the tail ("Not run: ...")
    const lines = steps.filter((st) => st.status !== 'cancelled' || st.result).map((st) => stepLine(st, numbered)).join('\n');
    const main = `${lead.trimEnd()}${lead.trim() && lines ? '\n' : ''}${lines}${tail}`.trim();
    // advise mode (BODY=mineai, src/mineai/care.js): what needs doing that the body will not do by itself
    const advice = s && typeof s.body?.advice === 'function' ? safely(() => s.body.advice(), []) ?? [] : [];
    const attribution = withAttribution && s && typeof s.body?.attribution === 'function' ? safely(() => s.body.attribution(), null) : null;
    const blocks = [
      earlier.length ? `Finished since your last call:\n${earlierText(earlier)}` : '',
      own.length ? `On its own since your last reply (the body, not a step of yours):\n${own.map(ownLine).join('\n')}` : '',
      main,
      advice.length ? `Body advice (the body will not do these by itself; your call):\n${advice.map(adviceLine).join('\n')}` : '',
      s ? stateBlock(s) : '',
      attribution ? `${attribution.text}.` : '',
    ];
    const body = blocks.filter(Boolean).join('\n\n');
    const structured = {
      code: code ?? firstCode(steps) ?? cancelledCode(steps) ?? firstCode(earlier) ?? cancelledCode(earlier),
      game: s?.id ?? null,
      steps: steps.map(report),
      earlier: earlier.map(report),
      queue: { running: q?.running ? describe(q.running) : null, waiting: q?.waiting.length ?? 0 },
      changed,
      state: shortState(s),
      ...(own.length ? { onItsOwn: own.map(ownOut) } : {}),
      ...(advice.length ? { advice } : {}),
      ...(attribution ? { attribution: { muse: attribution.muse, reflex: attribution.reflex, care: attribution.care, musePct: attribution.musePct } } : {}),
      ...more,
    };
    return { content: [{ type: 'text', text: body }], structuredContent: structured, ...(isError ? { isError: true } : {}) };
  }

  /** A call that was not accepted: nothing ran. */
  const refuse = (s, extra, code, message, more = {}) => reply(s, extra, { lead: message, code, isError: true, more });

  /** The dry-run check for steps on this game: the plan, or null when the check cannot run (then nothing is refused). */
  function checkSteps(s, steps) {
    if (typeof s.body?.inventory !== 'function') return null; // a body that cannot say what it carries: nothing to check against
    try {
      const bot = safely(() => s.body.bot);
      const version = bot?.version ?? '1.21.4';
      if (!planners.has(version)) planners.set(version, createPlanner({ version }));
      // asked only when a step needs a station the bot does not carry (a scan of the blocks around: ~30 ms); a table
      // or furnace another bot owns does not count (the body's stationNear)
      const near = (name) => () => {
        if (typeof s.body?.stationNear === 'function') return safely(() => s.body.stationNear(name), null);
        const id = bot?.registry?.blocksByName?.[name]?.id;
        if (id === undefined || typeof bot.findBlock !== 'function') return null;
        return safely(() => Boolean(bot.findBlock({ matching: id, maxDistance: STATION_RADIUS })), null);
      };
      // what the bot's furnaces are still making counts as carried: a craft that needs it waits for it (src/skills/craft.js)
      const inventory = { ...(safely(() => s.body.inventory?.(), {}) ?? {}) };
      const smelting = safely(() => s.body.smelting?.(), {}) ?? {};
      for (const [k, v] of Object.entries(smelting)) inventory[k] = (inventory[k] ?? 0) + v;
      // where the bot stands: go_to steps are followed, and stations or furnace output they leave far behind are warned about
      const p = safely(() => bot?.entity?.position, null);
      return planners.get(version).check(steps, {
        inventory,
        smelting,
        position: p ? { x: p.x, y: p.y, z: p.z } : null,
        table: near('crafting_table'),
        furnace: near('furnace'),
        before: queueOf(s).open.map((st) => ({ skill: st.skill, args: st.args })),
        // a body whose crafts and smelts put the station back into the inventory afterwards (BODY=mineai)
        temporaryStations: Boolean(s.body?.temporaryStations),
      });
    } catch (e) {
      hooks.log.event('mcp_check_error', { game: s.id, message: String(e?.message ?? e).slice(0, 300) });
      return null;
    }
  }

  /**
   * play and play_sequence: check every step, then (unless it repeats an earlier call) queue them, and wait for them
   * until this call's deadline. raw: {steps, request_id?, dry_run?}.
   */
  async function runCall(entry, tool, raw, extra) {
    const end = Date.now() + waitMs;
    const signal = signalOf(extra);
    let s;
    try { s = need(entry); } catch (e) { return refuse(null, extra, 'NOT_STARTED', e.message); }

    const bad = [];
    const steps = raw.steps.map((call, i) => {
      const p = splitCall(call);
      if (p.error) { bad.push(`${i + 1}. ${p.skill}: not run: ${p.error}`); return null; }
      const v = skills.validate(p.skill, p.args ?? {});
      if (!v.ok) { bad.push(`${i + 1}. ${p.skill}: not run, bad arguments: ${v.error}`); return null; }
      return { skill: p.skill, args: v.args };
    });
    if (bad.length) {
      const one = tool === 'play';
      return refuse(s, extra, 'BAD_ARGS', `${one ? bad[0].replace(/^1\. /, '') : bad.join('\n')}\nNothing was run: fix ${bad.length > 1 ? 'these steps' : one ? 'it' : 'that step'} and send the call again.`);
    }

    if (s.status !== 'ready') {
      await wait(Promise.resolve(s.ready), end - Date.now(), signal);
      if (s.ended || s.status !== 'ready') {
        return refuse(s.ended ? null : s, extra, 'NOT_STARTED', s.ended ? `your game ended: ${s.ended}; call start_game again` : 'the bot is still joining the world: send the call again in a few seconds');
      }
    }

    // from here on nothing awaits until the steps are queued: two copies of one call cannot both get in
    const q = queueOf(s);
    const sig = `${tool}:${JSON.stringify(steps)}`;
    const requestId = raw.request_id ?? null;
    const key = requestId ? `id:${requestId}` : sig;
    const first = raw.dry_run ? null : q.find(key);
    if (first) {
      if (first.sig !== sig) {
        // nothing of this call ran: not DUPLICATE (which says "the first call's result"), a call to fix
        return refuse(s, extra, 'BAD_ARGS', `request_id "${requestId}" was already used ${Math.round((now() - first.at) / 1000)} s ago for a different call; nothing was run. Use a new request_id for a new call.`);
      }
      await wait(first.settled, end - Date.now(), signal);
      const ago = Math.round((now() - first.at) / 1000);
      return reply(s, extra, {
        steps: first.steps,
        numbered: tool === 'play_sequence' || first.steps.length > 1,
        lead: `Already received ${ago} s ago (${requestId ? `same request_id "${requestId}"` : 'the same call, sent again before its results reached you'}): not run again. ${requestId ? 'To run it again, send it with a new request_id.' : 'To run it again on purpose, give it a request_id.'} Its steps:\n`,
        tail: pendingTail(first.steps),
        // how the first call went (a failure's code, e.g. HOSTILE_CONTACT or DIED); DUPLICATE when nothing went wrong.
        // structuredContent.duplicate marks the repeat either way.
        code: firstCode(first.steps) ?? cancelledCode(first.steps) ?? 'DUPLICATE',
        more: { call: first.no, duplicate: { ageS: ago, by: requestId ? 'request_id' : 'same call' } },
      });
    }

    const plan = checkSteps(s, steps);
    const planned = plan?.steps ?? steps.map((st, i) => ({ ...st, step: i + 1 }));
    // what may still go wrong where the check cannot be sure (a station or furnace output a go_to leaves far behind)
    const warnings = plan?.warnings ?? [];
    const warnText = warnings.length ? `The check warns (it does not know exactly where you will stand):\n${warnings.map((w) => `- ${w.text}`).join('\n')}\n` : '';
    const warnMore = warnings.length ? { warnings } : {};
    if (raw.dry_run) {
      const lines = planned.map((st) => headOf(st, true));
      const crafts = planned.filter((st) => st.added).length;
      const items = planned.reduce((k, st) => k + (st.addedItems?.length ?? 0), 0);
      const adding = [crafts ? `adding ${crafts} craft${crafts > 1 ? 's' : ''} (marked +)` : '', items ? `putting ${items} item${items > 1 ? 's' : ''} into your craft_batch list (named on its line)` : ''].filter(Boolean).join(' and ');
      const verdict = !plan ? 'The check could not run; nothing was checked.'
        : plan.ok ? `The check passed${adding ? `, ${adding}` : ''}. Nothing was run (dry_run); send it again without dry_run to run it.`
          : `The check would refuse this: missing ${plan.missing.map((m) => `${describeMissing(m)} (step ${m.step})`).join('; ')}. Nothing was run (dry_run).`;
      return reply(s, extra, { lead: `${verdict}\n${warnText}The steps as they would run:\n${lines.join('\n')}`, code: plan && !plan.ok ? 'NEED_ITEMS' : null, more: { plan: planned, ...(plan && !plan.ok ? { missing: plan.missing } : {}), ...warnMore } });
    }
    if (plan && !plan.ok) {
      const byStep = new Map();
      for (const m of plan.missing) byStep.set(m.step, [...(byStep.get(m.step) ?? []), describeMissing(m)]);
      const list = [...byStep].map(([n, ms]) => `- step ${n} (${describe(steps[n - 1])}): missing ${ms.join(', ')}`).join('\n');
      return refuse(s, extra, 'NEED_ITEMS', `Not run: the check before running found that ${tool === 'play' ? 'this step' : 'these steps'} cannot work with what you carry${q.busy ? ' (counting what the steps still queued will bring)' : ''}:\n${list}\nNothing was run. Get these first (or add steps that do, e.g. collect), then send the call again.`, { missing: plan.missing });
    }
    if (q.waiting.length + planned.length > QUEUE_MAX) {
      return refuse(s, extra, 'QUEUE_FULL', `Not run: ${q.waiting.length} steps are already queued and this call adds ${planned.length}; at most ${QUEUE_MAX} may wait. Call get_state to wait for them, or stop to clear the queue.`);
    }

    const call = q.submit(key, { sig, requestId, label: (no) => `your ${tool} #${no}`, planned });
    await wait(call.settled, end - Date.now(), signal);
    const added = addedLead(planned);
    return reply(s, extra, {
      steps: call.steps,
      numbered: tool === 'play_sequence' || call.steps.length > 1,
      lead: `${added ? `${added}\n` : ''}${warnText}`,
      tail: pendingTail(call.steps),
      more: { call: call.no, ...warnMore },
    });
  }

  /** What the reply says after the step lines: steps cancelled after a failure, steps still running or queued. */
  function pendingTail(steps) {
    const cancelled = steps.filter((st) => st.status === 'cancelled' && !st.result);
    const open = steps.filter((st) => !isFinal(st));
    const failed = steps.some((st) => st.status === 'failed');
    let out = '';
    if (cancelled.length) {
      out += `\nNot run: ${cancelled.map((st) => refOf(st, describe)).join(', ')}. ${failed ? 'Deal with the failure above first, then send the steps you still want.' : `They were cancelled (${cancelled[0].why}).`}`;
    }
    if (open.length) {
      // by the caller's numbers; the crafts the check added are counted, not numbered
      const nums = [...new Set(open.filter((st) => st.step != null).map((st) => st.step))];
      const extra = open.filter((st) => st.step == null).length;
      const addedText = `${extra} craft${extra > 1 ? 's' : ''} the check added`;
      const what = !nums.length ? (extra > 1 ? `${addedText[0].toUpperCase()}${addedText.slice(1)} are` : `${stepName(open[0])[0].toUpperCase()}${stepName(open[0]).slice(1)} is`)
        : nums.length === 1 && !extra ? `Step ${nums[0]} is` : `Steps ${nums.join(', ')}${extra ? ` (and ${addedText})` : ''} are`;
      const label = open[0].call?.label;
      out += `\n${what} still running or queued: they go on after this reply. Call get_state to wait for them (it reports their results once, under "From ${label ?? 'this call'}"), or stop to clear the queue.`;
    }
    return out;
  }

  const need = (entry) => {
    const { s, why } = lookupGame(entry);
    if (s) return s;
    if (why) throw new Error(`your game ended: ${why}; start_game gives you a NEW bot at a new spot with an empty inventory`);
    throw new Error('no game running: call start_game first');
  };

  const callShape = { skill: z.enum(skills.names), args: z.record(z.string(), z.any()).optional().describe("the skill's arguments, e.g. {\"block\": \"oak_log\", \"n\": 3} for collect") };
  const requestIdShape = z.string().min(1).max(64).optional().describe(`any id of yours for this call (1 to 64 characters): if the call is sent again with the same request_id (a retry after a broken connection), nothing runs twice and the reply carries the first call's results. Without one, the same call within ${REPEAT_MS / 1000} s counts as a repeat; give a new request_id to repeat a call on purpose`);
  const queueText = `Steps run in order in a queue: what does not finish within ${Math.round(callMs / 1000)} s keeps running after the reply (a later reply, or get_state, reports it); a step that fails cancels the steps queued after it (except eat's NOT_HUNGRY, which changes nothing: the steps after it still run); stop clears the queue. Before anything runs, a check simulates your inventory through the steps: if an ingredient, fuel, tool or station is missing, the call is refused with the list (code NEED_ITEMS) and nothing runs; planks, sticks, a crafting table or a furnace that can be made from what you carry are added as crafts. Replies carry structuredContent: each step's status (pending, confirmed, failed, cancelled) and code (${RESULT_CODES.join(', ')}), what changed, and a short state.`;

  function build(entry) {
    const server = new McpServer({ name: 'muse-plays-minecraft', version: '1.0.0' }, {
      instructions: `Muse plays Minecraft: you control your own bot in a survival Minecraft world. Adults (18+) only: call start_game with adult: true only after your user has confirmed they are 18 or older. Then use play (one skill) or play_sequence (several in a row); each reply carries the results and the new state within ${Math.round(callMs / 1000)} s, and get_state waits for a skill still running. A game lasts ${leaseMin} min, ends after ${IDLE_MS / 60_000} min without calls, and end_game frees the bot. The skills this server offers (${skills.names.length}): ${SKILL_NAMES_TEXT}. The play tool's description gives each one's arguments; this list is the server's own, so use it rather than notes about another server.${CARE_TEXT}`,
    });
    const sid8 = () => String(entry.transport.sessionId ?? '').slice(0, 8);
    // a call the SDK's own input check refuses (an unknown skill, too many steps, args that are not an object...) gets
    // the same reply as any refused call: BAD_ARGS in structuredContent with the state, nothing run
    const toolError = typeof server.createToolError === 'function' ? server.createToolError.bind(server) : null;
    if (toolError) {
      server.createToolError = (message) => {
        const m = /^(?:MCP error -32602: )?Input validation error: (.*)$/s.exec(String(message));
        if (!m) return toolError(message);
        try {
          return refuse(game(entry), undefined, 'BAD_ARGS', `${clean(m[1], 600)}\nNothing was run: fix the call and send it again.`);
        } catch { return toolError(message); }
      };
    }
    const forget = (why) => {
      if (entry.handle) handles.delete(entry.handle);
      Object.assign(entry, { token: null, handle: null, endedWhy: why });
    };

    // the client's protocol version and what it says it is, once per MCP session (Muse writes its own client)
    const low = server.server;
    const init = typeof low._oninitialize === 'function' ? low._oninitialize.bind(low) : null;
    if (init) {
      low._oninitialize = async (request) => {
        const result = await init(request);
        const p = request?.params ?? {};
        entry.client = { name: clean(p.clientInfo?.name, 80), version: clean(p.clientInfo?.version, 40) };
        hooks.log.event('mcp_client', { session: sid8(), protocolVersion: clean(p.protocolVersion, 20), negotiated: result?.protocolVersion ?? null, client: entry.client });
        return result;
      };
    }

    server.registerTool('start_game', {
      description: `Adults (18+) only: set adult to true only after your user has confirmed they are 18 or older. Starts your own Minecraft bot in a survival world (a NEW bot at a fresh spot with an empty inventory), or resumes the game of this connection, or (game set to the handle an earlier start_game reply gave) that game from an earlier connection. A game lasts ${leaseMin} min and ends after ${IDLE_MS / 60_000} min without calls. When every bot is in use, the reply gives your place in the queue and an estimate. Returns the skills, the state and a handle to resume the game. Call this first.`,
      inputSchema: {
        adult: z.boolean().describe('true only after your user has confirmed they are 18 or older'),
        game: z.string().max(64).optional().describe('the handle of a game to resume (from an earlier start_game reply)'),
      },
    }, async ({ adult, game: handle }, extra) => {
      if (adult !== true) return fail('This game is for adults (18+) only. Ask your user to confirm they are 18 or older, then call start_game with adult: true.');
      let s = game(entry);
      let resumed = Boolean(s);
      if (handle && handle !== entry.handle) {
        if (s) return fail(`this connection already plays game ${s.id}; call end_game first to switch games`);
        const token = handles.get(handle);
        if (!token) return fail('could not resume that game: that handle belongs to no running game; call start_game without game for a new one');
        try { s = hooks.lookup(token); } catch (e) { handles.delete(handle); return fail(`could not resume that game: ${e.reason ?? e.message}; call start_game without game for a new one`); }
        if (!String(s.client ?? '').startsWith('mcp:')) return fail('could not resume that game: it was not started through this connector');
        // the game's queue, its results not yet reported and its remembered calls come along (they belong to the game)
        for (const other of sessions.values()) {
          if (other === entry || other.token !== token) continue;
          Object.assign(other, { token: null, handle: null, endedWhy: 'it moved to another connection' });
        }
        Object.assign(entry, { token, handle, endedWhy: null });
        s.client = entry.key; // one game per MCP session: the game now counts for this one
        resumed = true;
      }
      if (!s) {
        try {
          s = hooks.newSession(null, adult, { key: entry.key, address: entry.address });
        } catch (e) { return fail(`could not start: ${e.message}`); }
        forget(null);
        entry.token = s.token;
        hooks.log.event('mcp_game', { session: sid8(), game: s.id, client: entry.client ?? null });
      }
      if (!entry.handle) entry.handle = mintHandle(s.token);
      if (s.status !== 'ready') await wait(Promise.resolve(s.ready), JOIN_WAIT_MS, signalOf(extra));
      if (s.ended) { forget(null); return fail(`could not start: ${s.ended}; call start_game again in a moment`); }
      return text(`${resumed ? `Resumed game ${s.id}` : `New game ${s.id}: a new bot at a fresh spot with an empty inventory`}.\nTo resume this game from a new connection, call start_game with adult: true and game: "${entry.handle}".\n${s.status === 'ready' ? '' : 'The bot is still joining the world: call get_state in a few seconds (it waits for the bot).\n'}\nSkills (use play or play_sequence; a skill's arguments go in args):\n${SKILLS}\n\n${stateBlock(s)}`);
    });

    server.registerTool('play', {
      description: `Run ONE skill: {skill, args}, with that skill's arguments in args. Replies within ${Math.round(callMs / 1000)} s with the result and the new state; a skill still running then keeps going, and get_state waits for it and reports its result. ${queueText} Skills and their arguments:\n${SKILLS}`,
      inputSchema: z.object({ ...callShape, request_id: requestIdShape }).loose(),
      outputSchema: REPLY_OUT,
    }, async ({ request_id: requestId, ...raw }, extra) => runCall(entry, 'play', { steps: [raw], request_id: requestId }, extra));

    server.registerTool('play_sequence', {
      description: `Run up to ${MAX_STEPS} skills in order, sent in ONE call, e.g. steps [{"skill": "collect", "args": {"block": "oak_log", "n": 3}}, {"skill": "craft_batch", "args": {"items": [{"item": "oak_planks", "n": 12}, {"item": "crafting_table", "n": 1}, {"item": "wooden_pickaxe", "n": 1}]}}]. Same skills and arguments as play (its description gives each skill's arguments; craft_batch crafts a list in one step); the ${skills.names.length} skills: ${SKILL_NAMES_TEXT}. Replies within ${Math.round(callMs / 1000)} s with every step's result or status and the final state. ${queueText} dry_run: true only checks the steps and shows them as they would run. Saves many round trips.`,
      inputSchema: {
        steps: z.array(z.object(callShape).loose()).min(1).max(MAX_STEPS),
        request_id: requestIdShape,
        dry_run: z.boolean().optional().describe('true: only check the steps (what is missing, what crafts would be added); nothing runs'),
      },
      outputSchema: REPLY_OUT,
    }, async (raw, extra) => runCall(entry, 'play_sequence', raw, extra));

    server.registerTool('get_state', {
      description: `Read the game state as text, with the time left in the game. If steps are still running or queued, waits (up to ${Math.round(callMs / 1000)} s) for them; reports the results of steps that outlived earlier calls, once. full: true also puts the whole state (blocks and mobs around, held item, goal) into structuredContent.full.`,
      inputSchema: { full: z.boolean().optional().describe('true: the whole state in structuredContent.full, not only the short one') },
      outputSchema: REPLY_OUT,
      annotations: { readOnlyHint: true },
    }, async ({ full } = {}, extra) => {
      let s;
      try { s = need(entry); } catch (e) { return refuse(null, extra, 'NOT_STARTED', e.message); }
      const end = Date.now() + waitMs;
      const signal = signalOf(extra);
      if (s.status !== 'ready') {
        await wait(Promise.resolve(s.ready), end - Date.now(), signal);
        if (s.ended) { forget(s.ended); return refuse(null, extra, 'NOT_STARTED', `your game ended: ${s.ended}; call start_game again`); }
      }
      const q = queueOf(s);
      let lead = '';
      if (q.busy) {
        await wait(q.idle(), end - Date.now(), signal);
        if (q.busy) lead = `${describe(q.running ?? q.waiting[0])} is still running${q.waiting.length ? ` (${q.waiting.length} more queued)` : ''}; call get_state again to keep waiting, or stop.\n`;
      }
      const more = full ? { full: safely(() => s.body.snapshot(), null) } : {};
      return reply(s, extra, { lead, more, withAttribution: true });
    });

    server.registerTool('stop', {
      description: 'Stop the skill that is running now and clear the queue (the steps still waiting are cancelled).',
      inputSchema: {},
      outputSchema: REPLY_OUT,
    }, async (_args, extra) => {
      let s;
      try { s = need(entry); } catch (e) { return refuse(null, extra, 'NOT_STARTED', e.message); }
      const q = queueOf(s);
      const { running, cancelled } = q.stop('stop cleared the queue');
      const was = await hooks.stopSession(s, 'stopped through MCP');
      if (running) await wait(running.done, 3_000, signalOf(extra));
      const what = `${was || running ? 'Stopped.' : 'Nothing was running.'}${cancelled.length ? ` ${cancelled.length} queued step${cancelled.length > 1 ? 's were' : ' was'} cancelled.` : ''}\n`;
      return reply(s, extra, { lead: what, code: was || running || cancelled.length ? 'STOPPED' : null });
    });

    server.registerTool('live_view', {
      description: 'Read-only for the game. format "html" (default): a web page under 1 KB that shows this game\'s live video (Facebook\'s video player and a status line, no script; it can be shown as a web artifact), and a plain link. The server has one camera: it films the game whose live_view call came last. While the video starts, the call waits up to about 40 s. "link": JSON with two 3D views of the bot (first_person_url, behind_url). "embed": JSON with the player URL.',
      inputSchema: { format: z.enum(['html', 'link', 'embed']).optional().describe('"html" (default), "link" or "embed"') },
      annotations: { readOnlyHint: true },
    }, async ({ format = 'html' }, extra) => {
      let s;
      try { s = need(entry); } catch (e) { return fail(e.message); }
      const l = hooks.links(s, entry.base);
      if (format === 'link') return text(JSON.stringify({ format: 'link', game: s.id, first_person_url: l.eyes, behind_url: l.watch }));
      // the Facebook live channel: the camera is pointed at this game and the call waits for Facebook to show it
      const budget = Math.max(0, waitMs - 3_000);
      const asked = Date.now();
      const v = (await hooks.liveView?.(s, { waitMs: budget, signal: signalOf(extra) })) ?? (() => {
        const old = hooks.liveVideo?.(s) ?? null; // STREAM_VIDEO_URL while the game's stream runs
        return old ? { fb: false, state: 'live', camera: s.id, videoUrl: old.videoUrl, embedUrl: old.embedUrl } : { fb: false, state: 'off' };
      })();
      const camera = v.camera ?? null;
      const live = v.state === 'live' && (camera === null || camera === s.id);
      const embedUrl = v.embedUrl ?? null;
      const videoUrl = v.videoUrl ?? null;
      if (format === 'embed') {
        return text(JSON.stringify({ format, game: s.id, live, state: v.state, camera_game: camera, player: embedUrl ? 'facebook' : null, embed_url: embedUrl, video_url: videoUrl }));
      }
      const html = liveViewHtml({ state: v.state, game: s.id, camera, embedUrl, fb: v.fb, ownerOnly: Boolean(v.warning) });
      const lines = [];
      const since = v.liveSince ? ` since ${String(v.liveSince).slice(11, 19)} UTC` : '';
      if (live) lines.push(`Live view of game ${s.id}: live on Facebook${since}.`);
      else if (v.state === 'live') lines.push(`Live view: the camera is on game ${camera} now, not on ${s.id}: that game asked for the live view after this one. A new live_view call points the camera back at ${s.id}.`);
      else if (v.state === 'retrying') {
        const why = v.error ? ` (${String(v.error).slice(0, 200)})` : '';
        const when = v.retryInS ? ` in ${v.retryInS} s` : '';
        lines.push(`Live view of game ${s.id}: not live: the live video could not start${why}. It is tried again by itself${when}; call live_view again after that.`);
      } else if (['starting', 'connecting', 'ending'].includes(v.state)) {
        lines.push(`Live view of game ${s.id}: the live video is starting but was not live after ${Math.round((Date.now() - asked) / 1000)} s. Call live_view again in about 20 s for a page that shows it live.`);
      } else if (v.fb) lines.push(`Live view of game ${s.id}: no live video yet; the camera picks the game up once its bot is in the world. Call live_view again in about 20 s.`);
      else lines.push(`Live view of game ${s.id}: live video is off on this server.`);
      lines.push(videoUrl ? `Video (plain link): ${videoUrl}` : `3D view in a web page (plain link): ${l.eyes}`);
      if (v.warning) lines.push(`Warning: ${v.warning}`);
      if (v.fb) lines.push('One camera serves every game on this server: it films the game whose live_view call came last, so if another game calls live_view, this video shows that game until live_view is called again here. When no game is left the live video ends; the next game gets a new one.');
      lines.push('', 'HTML page (Facebook\'s video player and a status line; no script):', html);
      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: { format: 'html', game: s.id, state: v.state, live, camera_game: camera, video_url: videoUrl, embed_url: embedUrl, ...(v.warning ? { warning: v.warning } : {}), html },
      };
    });

    server.registerTool('end_game', { description: 'End the game and free the bot.', inputSchema: {} }, async () => {
      const s = game(entry);
      const attribution = s && typeof s.body?.attribution === 'function' ? safely(() => s.body.attribution(), null) : null;
      if (s) {
        queues.get(s)?.stop('the game ended');
        hooks.endSession(s, 'ended through MCP');
      }
      forget('you ended it with end_game');
      const out = text(`Game ended.${attribution ? ` ${attribution.text}.` : ''} start_game gives you a new bot.`);
      return attribution ? { ...out, structuredContent: { attribution: { muse: attribution.muse, reflex: attribution.reflex, care: attribution.care, musePct: attribution.musePct } } } : out;
    });
    return server;
  }

  function drop(sid, e) {
    sessions.delete(sid);
    Promise.resolve().then(() => e.transport.close?.()).catch(() => {});
  }

  /** Free one place among `list`: the MCP session called longest ago that holds no live game. */
  function evictOne(list) {
    let victim = null;
    for (const [sid, e] of list) if (!game(e) && (!victim || e.lastCall < victim[1].lastCall)) victim = [sid, e];
    if (!victim) return false;
    drop(...victim);
    return true;
  }

  /** May this address open one more MCP session? null, or {status, message, headers}. */
  function admit(address) {
    const limit = hooks.initLimiter?.take(address) ?? { ok: true };
    if (!limit.ok) return { status: 429, message: `too many new MCP sessions from your address; try again in ${roughly(limit.retryMs)}`, headers: { 'retry-after': String(Math.ceil(limit.retryMs / 1000)) } };
    const mine = [...sessions].filter(([, e]) => e.address === address);
    if (mine.length >= limits.perAddress && !evictOne(mine)) return { status: 429, message: `your address already holds ${limits.perAddress} MCP sessions that play; end one (end_game) first` };
    if (sessions.size >= limits.sessions && !evictOne([...sessions])) return { status: 503, message: 'the server holds as many MCP sessions as it can right now; try again in a few minutes' };
    return null;
  }

  // the reaper: games nobody has called for IDLE_MS (and that run nothing), MCP sessions without a game for
  // IDLE_SESSION_MS, handles of games that ended (the lease, the web page, the operator)
  const reaper = setInterval(() => {
    const t = now();
    for (const [h, token] of handles) {
      try { if (hooks.lookup(token).ended) handles.delete(h); } catch { handles.delete(h); }
    }
    for (const [sid, e] of sessions) {
      const s = game(e);
      // a game someone is watching live (a /eyes or /watch socket) is not idle: the lease still ends it
      if (s && !busy(s) && t - e.lastCall > IDLE_MS && !(hooks.watching?.(s.id) > 0)) {
        hooks.endSession(s, `no calls for ${IDLE_MS / 60_000} minutes`);
        if (e.handle) handles.delete(e.handle);
        Object.assign(e, { token: null, handle: null, endedWhy: `no calls for ${IDLE_MS / 60_000} minutes` });
        hooks.log.event('mcp_idle_end', { session: sid.slice(0, 8), game: s.id });
      } else if (!s && t - e.lastCall > IDLE_SESSION_MS) {
        drop(sid, e);
      }
    }
  }, 30_000);
  reaper.unref();

  async function handle(req, res) {
    const id = req.headers['mcp-session-id'];
    let entry = id ? sessions.get(String(id)) : null;
    if (!entry) {
      const reply = (status, message, headers = {}) => {
        req.resume();
        res.writeHead(status, { 'content-type': 'application/json', ...headers }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: status === 404 ? -32001 : -32000, message }, id: null }));
      };
      if (id) { reply(404, 'unknown session; initialize again'); return; }
      const address = hooks.clientKey(req);
      const refused = admit(address);
      if (refused) { reply(refused.status, refused.message, refused.headers); return; }
      // only what the session needs later: never the request itself
      entry = { address, base: hooks.base(req), token: null, handle: null, client: null, endedWhy: null, lastCall: now() };
      entry.key = `mcp:${crypto.randomUUID()}`; // the key the game counts under: mcp:<MCP session id> once there is one
      entry.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        maxRequestBodySize: MAX_BODY,
        // plain JSON replies, not an SSE stream: simple clients (the HTTP code Muse writes for itself) read them whole
        enableJsonResponse: true,
        onsessioninitialized: (sid) => { sessions.set(sid, entry); entry.key = `mcp:${sid}`; },
      });
      entry.transport.onclose = () => {
        for (const [k, v] of sessions) if (v === entry) sessions.delete(k);
        hooks.leaveQueue?.(entry.key);
        if (entry.handle) handles.delete(entry.handle);
        const s = game(entry);
        if (s) hooks.endSession(s, 'MCP session closed');
      };
      await build(entry).connect(entry.transport);
    }
    entry.lastCall = now();
    // be lenient with hand-written clients: a POST that forgot the Accept types the spec asks for gets them added
    // (the SDK would answer 406, which Muse's first client hit on 2026-10-07)
    if (req.method === 'POST') {
      const accept = String(req.headers.accept ?? '');
      if (!/application\/json/.test(accept) || !/text\/event-stream/.test(accept)) req.headers.accept = 'application/json, text/event-stream';
    }
    // the tool calls of this request see its response (http store): their results count as delivered only once it is
    // written out, and a connection that closes first cuts their waits short
    const cut = new AbortController();
    res.once('close', () => { if (!res.writableFinished) cut.abort(); });
    await http.run({ res, cut }, () => entry.transport.handleRequest(req, res));
  }
  /** Live MCP sessions (tests and the operator). */
  handle.count = () => sessions.size;
  return handle;
}
