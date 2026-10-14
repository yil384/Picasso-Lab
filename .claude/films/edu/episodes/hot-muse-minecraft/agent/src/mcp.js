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
// Replies and the server instructions carry no links and never ask the agent to open or show anything; where to watch
// is data that only the read-only live_view tool returns. A game is resumed from a new connection with a separate
// random handle (never the control token), valid while that game lives. Each MCP client's protocol version and the
// name and version it reports are logged (mcp_client).

import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { z } from 'zod';
import { createTracker, goalOf, planText, lexiconFrom, GOAL_NAMES } from './report.js';
import { HUNT_DROPS, dropOf } from './mineai/skills.js';
import { describeRules } from './mineai/care.js';
import { tolerate } from './tolerant.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { RESULT_CODES, CRAFT_BATCH_MAX, skillSet } from './contracts.js';
import { createQueue, isFinal, statusOf, stepName, stepNumber, QUEUE_MAX, REPEAT_MS } from './mcp-queue.js';
import { createPlanner, describeMissing } from './plan.js';
import { registryFor } from './mc.js';
import { liveViewHtml } from './live-page.js';
import { createTermFeed, cutWords, callerOf } from './terminal.js';

const CALL_MS = 45_000; // every reply within 45 s: MCP clients commonly give up after 60 s (a long skill keeps going)
/** Of a call's time, what building the reply may take (the state text scans the blocks around: ~850 ms on Paper). */
const replyBudget = (callMs) => Math.min(2_000, Math.round(callMs / 20));
/** Muse's own words with a call (play, play_sequence: why), shown live on the stream. */
export const WHY_MAX = 140;
/** Muse's plan with a call (play, play_sequence: plan): its next few steps and fallbacks; longer is cut at a word. */
export const PLAN_MAX = 400;
const IDLE_MS = 5 * 60_000; // a game nobody has called for 5 minutes (and that runs nothing) is ended, freeing its bot
const IDLE_SESSION_MS = 10 * 60_000; // an MCP session without a game is dropped after 10 minutes without calls
const JOIN_WAIT_MS = 30_000;
/** start_game waits this long for a Minecraft server that is still starting, then says SERVER_STARTING (retry in N s). */
const SERVER_WAIT_MS = 25_000;
const SERVER_RETRY_S = 15;
const MAX_STEPS = 32;
/** start_game's first line, until live_view is called in the game. */
export const LIVE_NEXT = 'Next: call live_view now and show the HTML it returns, exactly as returned, as a web artifact in your preview panel, before you play (play waits for it).';
/** The top line of every play, play_sequence or get_state reply while live_view has not been called in the game. */
export const LIVE_NUDGE = 'Your user cannot see the game yet: call live_view and show its HTML in your preview panel.';
/** The top line of a play or play_sequence reply sent without why or plan (the first such call, then every 5th). */
export const NEED_LIVE_TEXT = 'Your user wants to watch: call live_view first and show the HTML it returns, exactly as returned, as a web artifact in your preview panel; then send this call again. If your user said they don\'t want to watch, call start_game with live: false.';
export const WHY_NUDGE = 'Viewers see your why and plan under the video: pass both on every play call. If your tool list has no why or plan fields, your integration is out of date: re-read this server\'s tools (tools/list) or rebuild the integration.';
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
  // some next to args, some inside: one set of arguments when no name is in both
  if (args && typeof args === 'object' && !stray.some((k) => Object.hasOwn(args, k))) return { skill, args: { ...args, ...rest } };
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
  onItsOwn: z.array(z.object({ seq: z.number(), agoS: z.number(), source: z.enum(['care', 'reflex', 'rule', 'body']), kind: z.string(), ok: z.boolean(), text: z.string() }).loose()).optional().describe('what the body did by itself since your last reply (care: its own plans between your calls, full mode only; reflex: fights, meals, deaths)'),
  advice: z.array(z.object({ kind: z.string(), text: z.string(), hint: z.object({ skill: z.string(), args: z.record(z.string(), z.any()) }).optional() }).loose()).optional().describe('what needs doing that the body will not do by itself, most urgent first; hint: a skill that would do it'),
  attribution: z.object({ muse: z.number(), reflex: z.number(), care: z.number(), musePct: z.number().nullable(), rule: z.number().optional(), body: z.number().optional(), decidedPct: z.number().nullable().optional() }).loose().optional().describe('get_state: who acted this game (your skills, the body\'s reflexes, its own plans in full mode)'),
}).loose();

/**
 * @param {object} hooks from createWeb: newSession(req, {key, address}), lookup(token), startAction(s, tool,
 *   args), stateText(s), stopSession(s, reason), endSession(s, reason), links(s, base) -> {eyes, watch} (live_view
 *   only), liveVideo(s) -> {videoUrl, embedUrl} | null, leaveQueue(key), within(promise, ms), TIMEOUT, log, now(),
 *   clientKey(req), base(req), leaseMs, initLimiter (take(key)), limits {sessions, perAddress}, callMs (tests),
 *   skills (contracts.skillSet(): the skills play and play_sequence take; default the 10 tools and craft_batch)
 * @returns {(req, res) => Promise<void>} the /mcp handler
 */
/**
 * The server's instructions (the initialize result): the standing rules a long prompt used to carry, so one line from
 * the user is enough ("Play Minecraft on <url> and get to the Nether and back.").
 */
export function instructionsText({ callMs = 90_000, leaseMin = 30, idleMin = 5, skillNames = '', skillCount = 0, care = '', live = true } = {}) {
  return [
    'Muse plays Minecraft: you play your own bot in a survival Minecraft world, by yourself: once the game has started, play on without asking your user anything. Use only these tools, not the server\'s web pages.',
    'Rules:',
    `1. Start: start_game, with goal when your user named one (${GOAL_NAMES.join(', ')}, or their words: the server counts goals like "kill 100 pigs", "collect 64 cobblestone", "craft 20 torches", "reach y -59", "build a hut", "survive 2 nights"); its reply has the plan, with how to do each part${live ? '. Then call live_view and show the HTML it returns, exactly as returned, as a web artifact in your preview panel, so your user sees the game: play and play_sequence are refused (code NEED_LIVE_VIEW) until you have. Only when your user said they do not want to watch, start_game with live: false' : ''}.`,
    '2. A new goal: whenever your user gives a new or changed goal during the game, call set_goal with it (their words, or a preset) before you play on; the stream, every reply\'s state and the report follow the goal set last, and the report keeps every goal with its time.',
    `3. Play: play_sequence for several steps in a row (play for one); each reply carries the results and the state within ${Math.round(callMs / 1000)} s, and get_state waits for a skill still running. A big count (100 pigs, 500 blocks) takes many steps: a step takes at most 64, so split it across calls and watch the goal's count in each reply.`,
    '4. why and plan: pass both on every play and play_sequence call. why: one short sentence in plain words, what you are doing and why. plan: your next few steps and what you will do if one fails, in your own words (up to about 400 characters). Viewers of the live stream see both as your own words, and the report keeps them.',
    `5. ${care ? care.trim() : 'You make every plan: the body runs the skills you send.'}`,
    `6. Time: call at least every 4 minutes; a game with no calls for ${idleMin} minutes ends. A game lasts ${leaseMin} min.`,
    '7. Deaths: after a death, either pick_up with death_items: true within 5 minutes (the items despawn) or start over where you respawned.',
    '8. Failures: if the same step fails 3 times, change your plan instead of sending it again: the Body advice then starts with what is stuck, the likely cause and what else to try.',
    '9. The end: when the goal is reached, the game ends or you stop, call end_game: its reply is the full report (the goal, milestones with times, deaths with causes, who acted, and a decision log from your why texts and the advice you followed or declined); show it to your user as it is. game_report gives the same during the game.',
    `The skills this server offers (${skillCount}): ${skillNames}. The play tool's description gives each one's arguments; this list is the server's own, so use it rather than notes about another server.`,
  ].join('\n');
}

/** The text of a ready prompt: what the user asks for. */
export function promptText(goal = 'free') {
  const g = String(goal).trim() || 'free';
  const what = g === 'nether_and_back' ? 'get to the Nether and back' : g === 'free' ? 'play for as long as the game lasts' : `play toward this goal: ${g}`;
  return `Play Minecraft yourself with this server's tools and ${what} (start_game with goal: "${g}"). Then follow the server's rules: live view first, a why on every call, call end_game at the end and show me its report.`;
}

/**
 * One logged MCP call (F9 of the log hunt), scrubbed: never a resume handle, a token or free text longer than 80
 * characters; a skill's arguments as sent (they are names and numbers), the reply's code, each step's outcome and the
 * Body advice the reply showed.
 */
export function callRow(tool, args, out, game, ms, session = null) {
  const a = args && typeof args === 'object' ? args : {};
  const brief = (x) => JSON.stringify(x ?? {}, (k, v) => (typeof v === 'string' && v.length > 80 ? `${v.slice(0, 77)}...` : v)).slice(0, 300);
  const words = typeof a.why === 'string' && a.why.trim() ? { why: a.why.trim().slice(0, 140) } : {};
  if (typeof a.plan === 'string' && a.plan.trim()) words.plan = cutWords(a.plan.replace(/\s+/g, ' '), PLAN_MAX);
  const summary = tool === 'play' ? { skill: a.skill ?? null, args: brief(a.args) }
    : tool === 'play_sequence' ? { steps: (a.steps ?? []).slice(0, 16).map((st) => `${st?.skill ?? '?'} ${brief(st?.args)}`) }
      : tool === 'start_game' ? { resume: Boolean(a.game) }
        : tool === 'get_state' ? { full: a.full === true } : {};
  const sc = out?.structuredContent ?? {};
  const text = (out?.content ?? []).map((c) => c?.text ?? '').join('\n');
  return {
    session, game, tool, ...summary, ...words,
    code: sc.code ?? null, isError: Boolean(out?.isError), ms,
    ...(Array.isArray(sc.steps) && sc.steps.length ? { stepsOut: sc.steps.slice(0, 16).map((st) => ({ skill: st.skill, status: st.status, code: st.code ?? null })) } : {}),
    ...(Array.isArray(sc.advice) && sc.advice.length ? { advice: sc.advice.map((x) => ({ kind: x.kind, text: String(x.text ?? '').slice(0, 160), hint: x.hint?.skill ?? null })) } : {}),
    ...(out?.isError ? { lead: text.split('\n')[0].slice(0, 200) } : {}),
  };
}

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
      : ' You decide everything: the body does nothing by itself, not even between your calls, except by rules you set (start_game rules, or the policy skill at any time): defend (fight back, raise the shield, wall in when badly hurt), flee (withdraw from a hostile mob), escape (out of water, fire and lava, back on its feet) and eat_below N (eat at food N or less). Every game starts with none. A rule acts within a second; your calls take seconds to minutes, and a zombie hits in one second: without defend and escape the bot dies more. Decide at the start. Every reply carries "Body advice": what needs doing (night coming with no shelter or shield, low food, a tool about to break, items to recover after a death), with the facts and the skill that would do it; it is information, the body does not act on it. Actions under your rules count as decided by you; get_state and end_game count who acted (structuredContent.attribution).';
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
      q = createQueue({ start: (skill, args, meta) => hooks.startAction(s, skill, args, meta), now });
      queues.set(s, q);
    }
    return q;
  };
  const busy = (s) => Boolean(queues.get(s)?.busy);
  const safely = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
  /** What the game's tracker (src/report.js) reads from the body: inventory, what it wears, the dimension. */
  const observed = (s) => {
    const snap = safely(() => s.body?.snapshot?.() ?? null);
    return { inventory: safely(() => s.body?.inventory?.() ?? null), equipment: safely(() => s.body?.equipment?.() ?? null), dimension: snap?.dimension ?? null, position: snap?.position ?? null, timeOfDay: Number.isFinite(snap?.timeOfDay) ? snap.timeOfDay : null };
  };
  // the names a goal may use (src/goals.js): this server's skills, the game's items, what mobs drop and blocks give
  const lex = lexiconFrom(skills, { huntDrops: HUNT_DROPS, dropOf });
  /** A goal from start_game's or set_goal's words, read with what the bot carries (the wood of its planks). */
  const readGoal = (raw, s) => goalOf(raw, lex, { inventory: safely(() => s?.body?.inventory?.() ?? null) });

  /** ": ok: crafted 4 stick [+4 stick, -2 oak_planks]" for a skill result. */
  const outcome = (r, skill) => {
    const change = changeText(r, skill);
    return `: ${r.ok ? 'ok' : 'FAILED'}: ${r.result}${change ? ` [${change}]` : ''}`;
  };
  const stateBlock = (s) => `State (game ${s.id}, ${roughly(Math.max(0, s.expiresAt - now()))} left; it also ends after ${IDLE_MS / 60_000} min without calls):\n${hooks.stateText(s)}${s.tracker ? `\n${safely(() => s.tracker.line(), '')}` : ''}`;

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
  const ownLine = (e) => `- ${ownAgo(e)} s ago, ${e.source === 'rule' ? `by your rule ${e.rule}` : e.source === 'body' ? 'reflex, no rule of yours' : e.source === 'reflex' ? 'reflex' : 'on its own'}, ${e.kind}: ${e.text}${e.ok === false ? ' (did not work)' : ''}`;
  const adviceLine = (a) => `- ${a.text}${a.hint ? ` (to do it: ${a.hint.skill} ${JSON.stringify(a.hint.args ?? {})})` : ''}`;
  const ownOut = (e) => ({ seq: e.seq, agoS: ownAgo(e), source: e.source, kind: e.kind, ok: e.ok !== false, text: e.text, ...(e.rule ? { rule: e.rule, ruleSet: e.ruleSet ?? null } : {}) });
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
    const own0 = s && typeof s.body?.advice === 'function' ? safely(() => s.body.advice(), []) ?? [] : [];
    // the stuck advice first (a kind of step that makes no progress), and once the time left for the goal
    const time = s?.timeNote ?? null;
    if (s && time) s.timeNote = null;
    const advice = [...(s?.stuck?.advice ? [s.stuck.advice] : []), ...(time ? [time] : []), ...own0].slice(0, 5);
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
      // code false: none, whatever an earlier step's result says (stop with nothing running: g0a414c's "FAILED")
      code: code === false ? null : code ?? firstCode(steps) ?? cancelledCode(steps) ?? firstCode(earlier) ?? cancelledCode(earlier),
      game: s?.id ?? null,
      steps: steps.map(report),
      earlier: earlier.map(report),
      queue: { running: q?.running ? describe(q.running) : null, waiting: q?.waiting.length ?? 0 },
      changed,
      state: shortState(s),
      ...(own.length ? { onItsOwn: own.map(ownOut) } : {}),
      ...(advice.length ? { advice } : {}),
      ...(attribution ? { attribution: { muse: attribution.muse, reflex: attribution.reflex, care: attribution.care, musePct: attribution.musePct, ...(attribution.rule != null ? { rule: attribution.rule, body: attribution.body, decidedPct: attribution.decidedPct } : {}) } } : {}),
      ...more,
    };
    return { content: [{ type: 'text', text: body }], structuredContent: structured, ...(isError ? { isError: true } : {}) };
  }

  /** A call that was not accepted: nothing ran. */
  const refuse = (s, extra, code, message, more = {}) => reply(s, extra, { lead: message, code, isError: true, more });
  /**
   * The stuck detector (the owner, 2026-10-13, after g0a414c: nine minutes of collect obsidian that never moved): the
   * same kind of step (collect a block, hunt a mob, walk to one area, build or a portal action) with no progress over 3
   * calls, or 2 calls and 4 minutes, puts a "stuck" item first in the Body advice of every reply until it moves: what
   * does not move, the likely cause the body can see, and 2 or 3 things to do instead with the exact call. Information
   * only: the calls run as sent. Also, once, when the lease has under 8 minutes and the goal is not reached, what it
   * still needs.
   */
  async function stuckCheck(s, steps = []) {
    if (!s?.body) return;
    const t = now();
    const book = (s.stuckBook ??= new Map());
    const inv = safely(() => s.body.inventory?.() ?? {}, {}) ?? {};
    // an item count up since the kind stalled: it moved
    for (const [k, e] of book) if (e.item && (inv[e.item] ?? 0) > e.count) book.delete(k);
    // this call's steps and the ones that finished since: a confirmed step (a walk that got there, a build that stood)
    // moved its kind; one that ran without that is one more try. Each step counts once; one that never ran (still
    // queued, or cancelled before it ran) is no try.
    const counted = (s.stuckSeen ??= new WeakSet());
    const seen = new Set();
    // where the bot is: a walk that ends closer to its target moved, though it did not get there
    const pos = safely(() => s.body.bot?.entity?.position ?? null, null);
    for (const st of [...(steps ?? []), ...(safely(() => queueOf(s).finished(steps) ?? [], []) ?? [])]) {
      const k = stuckKey(st);
      if (!k) continue;
      if (st.status === 'confirmed') { book.delete(k.key); counted.add(st); continue; }
      if (!st.startedAt || counted.has(st)) continue;
      // a walk still on its way is no failed try (production game g0842ff, 2026-10-14: "stuck" while a 3-minute climb
      // out of a cave was going on, and it got there): it counts once it has ended
      const walk = st.skill === 'go_to';
      if (walk && !['failed', 'cancelled'].includes(st.status)) continue;
      counted.add(st);
      if (seen.has(k.key)) continue;
      seen.add(k.key);
      const e = book.get(k.key) ?? { ...k, calls: 0, firstAt: t, count: k.item ? (inv[k.item] ?? 0) : 0 };
      // the distance left after a walk: 8 blocks or more less than after the walk before is progress, a fresh start
      if (walk && pos && Number.isFinite(st.args?.x)) {
        const left = Math.hypot(pos.x - st.args.x, pos.y - (st.args.y ?? pos.y), pos.z - st.args.z);
        if (Number.isFinite(e.left) && left <= e.left - 8) { e.calls = 0; e.firstAt = t; }
        e.left = Math.min(e.left ?? Infinity, left);
      }
      e.calls += 1;
      e.lastAt = t;
      e.last = { args: st.args ?? {}, result: st.result?.result ?? st.result ?? null };
      book.set(k.key, e);
    }
    // a kind not tried for 5 minutes: Muse moved on (g0842ff: two walks into a cavern at 7 min said "stuck" from 11
    // to 19 min, the game long past them)
    for (const [k, e] of book) if (t - (e.lastAt ?? e.firstAt) > 5 * 60_000) book.delete(k);
    // 3 tries without progress, or 2 over 4 minutes with the last of them recent
    const worst = [...book.values()].filter((e) => e.calls >= 3 || (e.calls >= 2 && t - e.firstAt >= 4 * 60_000 && t - (e.lastAt ?? e.firstAt) <= 2 * 60_000)).sort((a, b) => b.calls - a.calls)[0];
    if (!worst) { s.stuck = null; }
    else if (!s.stuck || s.stuck.key !== worst.key || s.stuck.calls !== worst.calls || t - s.stuck.at > 120_000) {
      const why = await Promise.race([Promise.resolve(safely(() => s.body.stuckWhy?.(worst.key, worst.last) ?? null)).catch(() => null), new Promise((r) => { setTimeout(() => r(null), 5_000).unref?.(); })]);
      const mins = Math.max(1, Math.round((t - worst.firstAt) / 60_000));
      const what = worst.item ? `${worst.item.replace(/_/g, ' ')} ${inv[worst.item] ?? 0}, none more for ${worst.calls} calls / ${mins} min` : `no progress for ${worst.calls} calls / ${mins} min`;
      const options = (why?.options ?? []).slice(0, 3);
      const hint = options.find((o) => o.hint && safely(() => skills.validate(o.hint.skill, o.hint.args ?? {}).ok, false))?.hint ?? null;
      s.stuck = {
        key: worst.key, calls: worst.calls, at: t,
        advice: { kind: 'stuck', text: `stuck: ${worst.label} (${what})${why?.text ? `; ${why.text}` : ''}${options.length ? `. Try: ${options.map((o) => o.text).join('; or ')}` : ''}`, ...(hint ? { hint } : {}) },
      };
      hooks.log.event('mcp_stuck', { game: s.id, key: worst.key, calls: worst.calls, mins });
    }
    // the time left against what the goal still needs, once
    const left = s.expiresAt - t;
    if (!s.timeTold && left > 0 && left < 8 * 60_000 && s.tracker) {
      const p = safely(() => s.tracker.progress(), null);
      const todo = (p?.list ?? []).filter((m) => m.atS === null || (m.of && m.done < m.of)).map((m) => m.t);
      if (p && p.key !== 'free' && !p.reached && todo.length) { // a goal set (free play has none to fall short of)
        s.timeTold = true;
        s.timeNote = { kind: 'time', text: `${Math.max(1, Math.round(left / 60_000))} min left in this game; the goal still needs: ${todo.join(', ')}` };
      }
    }
  }
  /** The kind of a step for the stuck detector: {key, label, item?} or null (crafts, eating and the like do not stall). */
  function stuckKey(st) {
    const a = st?.args ?? {};
    if (st?.skill === 'collect' && a.block) return { key: `collect:${a.block}`, label: `collecting ${a.block.replace(/_/g, ' ')}`, item: lex.dropOf(a.block) ?? a.block };
    if (st?.skill === 'hunt' && a.mob) return { key: `hunt:${a.mob}`, label: `hunting ${a.mob}`, item: a.drop ?? null };
    if (st?.skill === 'go_to' && Number.isFinite(a.x)) return { key: `go_to:${a.x >> 3},${a.y >> 3},${a.z >> 3}`, label: `walking to ${a.x} ${a.y} ${a.z}`, item: null };
    if (st?.skill === 'build' && a.blueprint) return { key: `build:${a.blueprint}`, label: `building ${a.blueprint.replace(/_/g, ' ')}`, item: null };
    if (st?.skill === 'portal' && a.action) return { key: `portal:${a.action}`, label: `portal ${a.action}`, item: null };
    return null;
  }
  /** A game whose play waits for live_view: the server has the live channel, the user watches, and it was not called. */
  const liveRequired = (s) => hooks.liveEnabled === true && s && !s.liveViewed && s.liveOff !== true;
  /** A game in line for the camera, in words. */
  const queuedText = (id, q) => `Live view of game ${id}: the camera is filming another game right now; yours runs normally. You are number ${q?.position ?? '?'} in line (about ${q?.waitMin ?? '?'} min). Call live_view again later, or keep playing: when the camera reaches you, your stream starts.`;

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
    // the user watches (the owner's decision after g71c9f5, 2026-10-13): no step runs before live_view in a game with a
    // live view, unless the user said they do not want to watch (start_game live: false). A server without the live
    // channel asks for nothing; live_view counts whatever it answered (capped, test, off)
    if (liveRequired(s)) return refuse(s, extra, 'NEED_LIVE_VIEW', NEED_LIVE_TEXT);

    const bad = [];
    // arguments read the way they were meant where that is unambiguous (src/tolerant.js): positions in any common
    // shape, numbers as strings, names in any case or with a common name; logged, never a reason to refuse
    const inventory = safely(() => s.body?.inventory?.() ?? null, null);
    const read = [];
    const steps = raw.steps.map((call, i) => {
      const p = splitCall(call);
      if (p.error) { bad.push(`${i + 1}. ${p.skill}: not run: ${p.error}`); return null; }
      const t = skills.schemas?.[p.skill] ? tolerate(skills.schemas[p.skill], p.args ?? {}, { inventory, skill: p.skill }) : { args: p.args ?? {}, changes: [], unclear: [] };
      if (t.changes.length) read.push(`${i + 1}. ${p.skill}: ${t.changes.join('; ')}`);
      const v = skills.validate(p.skill, t.args);
      if (!v.ok) { bad.push(`${i + 1}. ${p.skill}: not run, bad arguments: ${v.error}${t.unclear.length ? ` (${t.unclear.join('; ')})` : ''}`); return null; }
      return { skill: p.skill, args: v.args };
    });
    if (read.length) hooks.log.event('mcp_args_read', { game: s.id, tool, read: read.slice(0, 16).map((x) => x.slice(0, 200)), ok: !bad.length });
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
    await stuckCheck(s, call.steps);
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
  // what Muse is doing and why, in its own words: shown live on the stream, ignored by the body, logged
  // (longer words are cut, never a reason to refuse the call)
  const whyShape = z.string().optional().describe('give it on every call: one short sentence, what you do and why; shown live as your own words');
  const planShape = z.string().optional().describe('give it on every call: your next few steps and fallbacks, in your own words (up to about 400 characters; longer is cut); shown live');
  const requestIdShape = z.string().min(1).max(64).optional().describe(`any id of yours for this call (1 to 64 characters): if the call is sent again with the same request_id (a retry after a broken connection), nothing runs twice and the reply carries the first call's results. Without one, the same call within ${REPEAT_MS / 1000} s counts as a repeat; give a new request_id to repeat a call on purpose`);
  const queueText = `Steps run in order in a queue: what does not finish within ${Math.round(callMs / 1000)} s keeps running after the reply (a later reply, or get_state, reports it); a step that fails cancels the steps queued after it (except eat's NOT_HUNGRY, which changes nothing: the steps after it still run); stop clears the queue. Before anything runs, a check simulates your inventory through the steps: if an ingredient, fuel, tool or station is missing, the call is refused with the list (code NEED_ITEMS) and nothing runs; planks, sticks, a crafting table or a furnace that can be made from what you carry are added as crafts. Replies carry structuredContent: each step's status (pending, confirmed, failed, cancelled) and code (${RESULT_CODES.join(', ')}), what changed, and a short state.`;

  // the terminal under the live video (src/terminal.js): each call and what its reply says, for the camera service
  const entryOf = (s) => { for (const e of sessions.values()) if (safely(() => game(e), null) === s) return e; return null; };
  const feed = typeof hooks.term === 'function' ? createTermFeed({
    send: (id, u) => hooks.term(id, u), now,
    // what runs and when Muse last called, for the stream's status line between calls
    liveOf: (s) => {
      const q = queues.get(s);
      const e = entryOf(s);
      return { busy: Boolean(q?.busy), running: q?.running ?? null, lastCallAt: e?.lastToolAt, lastTool: e?.lastTool };
    },
  }) : null;
  // every 5 s the status of every game with a stream, without lines: the panel's clock and status line stay current
  // while Muse thinks or the bot shelters (the remote stream manager sends only for games the service films)
  const ticker = feed ? setInterval(() => {
    for (const e of sessions.values()) {
      const s = safely(() => game(e), null);
      if (s && s.status === 'ready' && !s.ended) safely(() => feed.tick(s));
    }
  }, 5_000) : null;
  ticker?.unref?.();

  function build(entry) {
    const server = new McpServer({ name: 'muse-plays-minecraft', version: '1.0.0' }, {
      instructions: instructionsText({ callMs, leaseMin, idleMin: IDLE_MS / 60_000, skillNames: SKILL_NAMES_TEXT, skillCount: skills.names.length, care: CARE_TEXT, live: true }),
    });
    {
      // every call in the log (F9 of the log hunt: refusals, calls and the advice shown were in no log): the game, the
      // tool, a short and scrubbed summary of its arguments, the reply's code, its steps' outcomes and the advice
      const register = server.registerTool.bind(server);
      server.registerTool = (name, def, handler) => register(name, def, async (args, extra) => {
        const t0 = Date.now();
        const before = safely(() => game(entry), null);
        // Muse's calls in its game, counted (a rule says with which call it was set)
        if (before) { before.callNo = (before.callNo ?? 0) + 1; safely(() => before.body?.noteCall?.(before.callNo)); }
        let out = null;
        try {
          out = await handler(args, extra);
          // the user cannot see the game until live_view's HTML is shown (production games g08370a and g71c9f5,
          // 2026-10-13: Muse went from start_game straight to play_sequence and never called it): a line at the top of
          // every play, play_sequence and get_state reply until it is called; the call itself is never held up
          // a play call without why or plan leaves the stream's thinking band empty (g08370a: none on any call): a line
          // at the top too, on the first such call and every 5th after (below the live view's line when both apply)
          if (['play', 'play_sequence'].includes(name)) safely(() => {
            const g = game(entry);
            const has = (v) => typeof v === 'string' && v.trim().length > 0;
            if (!g || (has(args?.why) && has(args?.plan)) || out?.structuredContent?.code === 'NEED_LIVE_VIEW' || !out?.content?.[0] || typeof out.content[0].text !== 'string') return;
            g.wordlessCalls = (g.wordlessCalls ?? 0) + 1;
            if (g.wordlessCalls % 5 === 1) out.content[0].text = `${WHY_NUDGE}\n\n${out.content[0].text}`;
          });
          if (['play', 'play_sequence', 'get_state'].includes(name)) safely(() => {
            const g = game(entry);
            if (!g || g.liveViewed || g.liveOff || out?.structuredContent?.code === 'NEED_LIVE_VIEW' || !out?.content?.[0] || typeof out.content[0].text !== 'string') return;
            out.content[0].text = `${LIVE_NUDGE}\n\n${out.content[0].text}`;
          });
          // the game's report: the call, its why, the advice before it, the milestones (src/report.js)
          safely(() => {
            const g = game(entry) ?? before;
            if (!g?.tracker) return;
            g.tracker.onCall(name, args, out);
            for (const st of out?.structuredContent?.earlier ?? []) g.tracker.onStepDone(st);
            g.tracker.observe(observed(g));
          });
          return out;
        } finally {
          safely(() => hooks.log.event('mcp_call', callRow(name, args, out, (safely(() => game(entry), null) ?? before)?.id ?? null, Date.now() - t0, String(entry.transport.sessionId ?? '').slice(0, 8))));
        }
      });
    }
    if (feed) {
      // every tool: the call goes to the terminal as it comes in, its results as the reply goes out (the replies are
      // not changed); end_game's game is gone after it, so the one from before the call is used
      const register = server.registerTool.bind(server);
      server.registerTool = (name, def, handler) => register(name, def, async (args, extra) => {
        Object.assign(entry, { lastTool: name, lastToolAt: now() });
        const before = safely(() => game(entry), null);
        if (before) feed.call(before, name, args);
        const out = await handler(args, extra);
        const s = safely(() => game(entry), null) ?? before;
        if (s) feed.reply(s, name, args, out);
        return out;
      });
    }
    const sid8 = () => String(entry.transport.sessionId ?? '').slice(0, 8);
    // a call the SDK's own input check refuses (an unknown skill, too many steps, args that are not an object...) gets
    // the same reply as any refused call: BAD_ARGS in structuredContent with the state, nothing run
    const toolError = typeof server.createToolError === 'function' ? server.createToolError.bind(server) : null;
    if (toolError) {
      server.createToolError = (message) => {
        const m = /^(?:MCP error -32602: )?Input validation error: (.*)$/s.exec(String(message));
        if (!m) return toolError(message);
        safely(() => hooks.log.event('mcp_refused', { session: sid8(), game: safely(() => game(entry)?.id, null) ?? null, code: 'BAD_ARGS', message: clean(m[1], 200) }));
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
      description: `Starts your own Minecraft bot in a survival world (a NEW bot at a fresh spot with an empty inventory), or resumes the game of this connection, or (game set to the handle an earlier start_game reply gave) that game from an earlier connection. A game lasts ${leaseMin} min and ends after ${IDLE_MS / 60_000} min without calls. When every bot is in use, the reply gives your place in the queue and an estimate. Returns the skills, the state and a handle to resume the game. Call this first.`,
      inputSchema: {
        adult: z.boolean().optional().describe('not needed (accepted from older prompts and ignored)'),
        live: z.boolean().optional().describe('default true: your user watches, and play waits for live_view. false only when your user said they do not want to watch'),
        rules: z.object({ defend: z.boolean().optional(), flee: z.boolean().optional(), escape: z.boolean().optional(), eat_below: z.number().int().min(0).max(20).optional() }).optional()
          .describe('your rules: what the body does by itself, without a call (none at the start); also the policy skill at any time'),
        game: z.string().max(64).optional().describe('the handle of a game to resume (from an earlier start_game reply)'),
        goal: z.string().max(120).optional().describe(`what to play for: ${GOAL_NAMES.join(', ')} (default free), or your user's words ("kill 100 pigs"); the reply gives the plan`),
      },
    }, async ({ game: handle, goal: goalRaw, live, rules: rulesArg }, extra) => {
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
      if (!s && typeof hooks.serverReady === 'function') {
        // the Minecraft server just restarted and is still starting: wait for it (bounded, within the call's time),
        // else say so with a code and when to try again, nothing started
        const r = await hooks.serverReady({ waitMs: SERVER_WAIT_MS, signal: signalOf(extra) });
        if (r.waitedMs > 0) hooks.log.event('mcp_server_wait', { session: sid8(), ok: r.ok, ms: r.waitedMs, ...(r.error ? { error: r.error } : {}) });
        if (!r.ok) {
          return { ...fail(`SERVER_STARTING: the Minecraft server is still starting (it restarted a moment ago); nothing was started. Call start_game again in ${SERVER_RETRY_S} s.`), structuredContent: { code: 'SERVER_STARTING', retryAfterS: SERVER_RETRY_S } };
        }
      }
      if (!s) {
        try {
          s = hooks.newSession(null, { key: entry.key, address: entry.address });
        } catch (e) { return fail(`could not start: ${e.message}`); }
        forget(null);
        entry.token = s.token;
        hooks.log.event('mcp_game', { session: sid8(), game: s.id, client: entry.client ?? null });
        s.caller = callerOf(entry.client?.name); // who plays, for the stream's HUD
      }
      if (!entry.handle) entry.handle = mintHandle(s.token);
      if (s.status !== 'ready') await wait(Promise.resolve(s.ready), JOIN_WAIT_MS, signalOf(extra));
      if (s.ended) { forget(null); return fail(`could not start: ${s.ended}; call start_game again in a moment`); }
      // the goal and its plan (src/report.js): a new game gets its tracker; a resumed one keeps it (a goal given on
      // resume replaces the old goal)
      if (!s.tracker) {
        s.tracker = createTracker({ goal: readGoal(goalRaw, s) });
        const tracker = s.tracker;
        safely(() => tracker.observe(observed(s)));
        safely(() => s.body?.on?.('death', (d) => safely(() => tracker.death({ cause: d?.at?.cause ?? d?.cause ?? null, position: d?.at?.position ?? d?.position ?? null }))));
        // milestones and counts as the step that made them ends, also between calls: what it made, built, killed
        safely(() => s.body?.on?.('skill', (e) => {
          if (e?.phase !== 'end') return;
          safely(() => tracker.onSkillEnd(e));
          safely(() => tracker.observe(observed(s)));
        }));
        // the kills of the body's reflexes (a zombie the defend reflex killed counts for "kill 10 zombies")
        safely(() => s.body?.on?.('kill', (k) => safely(() => tracker.onKills(k?.mobs, k?.by ?? 'reflex'))));
      } else if (goalRaw) s.tracker.setGoal(readGoal(goalRaw, s), 'start_game');
      // Muse's rules, given with start_game (the body acts by itself by these only; none at the start)
      s.callNo = s.callNo ?? 1;
      // set by start_game itself (not a play call: the HUD numbers play calls), at the time it was sent
      if (rulesArg && typeof s.body?.setRules === 'function') safely(() => s.body.setRules(rulesArg, { call: null, via: 'start_game', at: Date.now() }));
      // live: false only when the user does not want to watch (the default: they do, and play waits for live_view)
      if (live === false) s.liveOff = true;
      else if (live === true) s.liveOff = false;
      const plan = planText(s.tracker.goal, { lex, leaseMin });
      // the rules: what is set, what each does, the trade-off, and to decide now (the owner, 2026-10-13)
      const ri = safely(() => s.body?.rules?.() ?? null);
      const anyRule = ri && Object.values(ri.rules ?? {}).some((v) => v === true || v > 0);
      const rulesText = ri ? `\nYour rules (the body does nothing by itself but these; ${anyRule ? 'as set' : 'none set yet'}): ${describeRules(ri.rules)}. A rule acts within a second; your calls take seconds to minutes, and a zombie hits in one second: without defend and escape the bot dies more. Decide now: start_game with rules {defend, flee, escape, eat_below}, or the policy skill at any time (e.g. policy {"defend": "on", "escape": "on", "eat_below": 6}). What a rule does counts as decided by you.` : '';
      return text(`${s.liveViewed || s.liveOff ? '' : `${LIVE_NEXT}\n\n`}${resumed ? `Resumed game ${s.id}` : `New game ${s.id}: a new bot at a fresh spot with an empty inventory`}.\n${plan}${rulesText}\nTo resume this game from a new connection, call start_game with game: "${entry.handle}".\n${s.status === 'ready' ? '' : 'The bot is still joining the world: call get_state in a few seconds (it waits for the bot).\n'}\nSkills (use play or play_sequence; a skill's arguments go in args):\n${SKILLS}\n\n${stateBlock(s)}`);
    });

    server.registerTool('play', {
      description: `Run ONE skill: {skill, args}, with that skill's arguments in args. Replies within ${Math.round(callMs / 1000)} s with the result and the new state; a skill still running then keeps going, and get_state waits for it and reports its result. ${queueText} Positions are block coordinates {"x": 10, "y": 64, "z": -3}: go_to takes x, y, z themselves, other skills a pos. Skills and their arguments:\n${SKILLS}`,
      inputSchema: z.object({ ...callShape, request_id: requestIdShape, why: whyShape, plan: planShape }).loose(),
      outputSchema: REPLY_OUT,
    }, async ({ request_id: requestId, why, plan, ...raw }, extra) => runCall(entry, 'play', { steps: [raw], request_id: requestId, why, plan }, extra));

    server.registerTool('play_sequence', {
      description: `Run up to ${MAX_STEPS} skills in order, sent in ONE call, e.g. steps [{"skill": "collect", "args": {"block": "oak_log", "n": 3}}, {"skill": "craft_batch", "args": {"items": [{"item": "oak_planks", "n": 12}, {"item": "crafting_table", "n": 1}, {"item": "wooden_pickaxe", "n": 1}]}}]. Same skills and arguments as play (its description gives each skill's arguments; craft_batch crafts a list in one step); the ${skills.names.length} skills: ${SKILL_NAMES_TEXT}. Positions as in play. Replies within ${Math.round(callMs / 1000)} s with every step's result or status and the final state. ${queueText} dry_run: true only checks the steps and shows them as they would run. Saves many round trips.`,
      inputSchema: {
        steps: z.array(z.object(callShape).loose()).min(1).max(MAX_STEPS),
        request_id: requestIdShape,
        dry_run: z.boolean().optional().describe('true: only check the steps (what is missing, what crafts would be added); nothing runs'),
        why: whyShape,
        plan: planShape,
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
      await stuckCheck(s, []);
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
      const ended = q.finished?.([])?.length ? ' (the last step had already ended: its result is below)' : '';
      const what = `${was || running ? 'Stopped.' : `Nothing was running${ended}.`}${cancelled.length ? ` ${cancelled.length} queued step${cancelled.length > 1 ? 's were' : ' was'} cancelled.` : ''}\n`;
      return reply(s, extra, { lead: what, code: was || running || cancelled.length ? 'STOPPED' : false });
    });

    server.registerTool('live_view', {
      description: 'Read-only for the game. format "html" (default): a web page of about 2 KB that shows this game\'s live video (Facebook\'s video player, starting muted, a status line and a few lines of script that reload the player; no request of its own; it can be shown as a web artifact), and a plain link. The server has one camera, first come, first served: it stays on a game until that game ends, and a game that calls live_view while another has it is put in line (the reply says its place; the game itself runs normally). While the video starts, the call waits up to about 40 s. "link": JSON with two 3D views of the bot (first_person_url, behind_url). "embed": JSON with the player URL.',
      inputSchema: { format: z.enum(['html', 'link', 'embed']).optional().describe('"html" (default), "link" or "embed"') },
      annotations: { readOnlyHint: true },
    }, async ({ format = 'html' }, extra) => {
      let s;
      try { s = need(entry); } catch (e) { return fail(e.message); }
      s.liveViewed = true; // the nudge in the replies stops (LIVE_NUDGE)
      const l = hooks.links(s, entry.base);
      if (format === 'link') return text(JSON.stringify({ format: 'link', game: s.id, first_person_url: l.eyes, behind_url: l.watch }));
      // a test caller (the smoke and check scripts) never spends a Facebook live (MCP_TEST_LIVE on lets it): the same
      // shape of answer, the 3D view instead of the video, and the camera stays where it is
      if (s.caller === 'TEST SCRIPT' && !hooks.testLives) {
        safely(() => hooks.log.event('live_view_test', { session: sid8(), game: s.id, caller: s.caller, format, record: Boolean(hooks.testRecord) }));
        // MCP_TEST_RECORD: the camera films it for the recording only (how the recording is tested; no live video), in
        // line behind the game that has the camera
        const tv = hooks.testRecord ? await Promise.resolve(hooks.liveView?.(s, { waitMs: 0, local: true })).catch(() => null) : null;
        const tq = tv?.state === 'queued' ? tv.queue : null;
        if (format === 'embed') return text(JSON.stringify({ format, game: s.id, live: false, state: 'test', camera_game: null, player: null, embed_url: null, video_url: null, ...(tq ? { queue: tq } : {}) }));
        const html = liveViewHtml({ state: 'test', game: s.id, fb: false });
        const lines = [`Live view of game ${s.id}: test caller: no Facebook live (the live videos a day are few and kept for players). The game itself works.`,
          ...(tq ? [queuedText(s.id, tq)] : []),
          `3D view in a web page (plain link): ${l.eyes}`, '', 'HTML page (a status line):', html];
        return { content: [{ type: 'text', text: lines.join('\n') }], structuredContent: { format: 'html', game: s.id, state: 'test', live: false, camera_game: null, video_url: null, embed_url: null, html } };
      }
      // the Facebook live channel: the camera is pointed at this game and the call waits for Facebook to show it
      const budget = Math.max(0, waitMs - 3_000);
      const asked = Date.now();
      const v = (await hooks.liveView?.(s, { waitMs: budget, signal: signalOf(extra), owner: Boolean(entry.owner) })) ?? (() => {
        const old = hooks.liveVideo?.(s) ?? null; // STREAM_VIDEO_URL while the game's stream runs
        return old ? { fb: false, state: 'live', camera: s.id, videoUrl: old.videoUrl, embedUrl: old.embedUrl } : { fb: false, state: 'off' };
      })();
      const camera = v.camera ?? null;
      const live = v.state === 'live' && (camera === null || camera === s.id);
      const embedUrl = v.embedUrl ?? null;
      const videoUrl = v.videoUrl ?? null;
      if (format === 'embed') {
        return text(JSON.stringify({ format, game: s.id, live, state: v.state, camera_game: camera, player: embedUrl ? 'facebook' : null, embed_url: embedUrl, video_url: videoUrl, ...(v.queue ? { queue: v.queue } : {}) }));
      }
      // at the cap: until when, in UTC (the game is not affected)
      const capUntil = v.state === 'capped' && Number.isFinite(v.retryInS) ? new Date(Date.now() + v.retryInS * 1000).toISOString().slice(11, 16) : null;
      const daily = /24 hours|day/.test(String(v.error ?? ''));
      const html = liveViewHtml({ state: v.state, game: s.id, camera, embedUrl, fb: v.fb, ownerOnly: Boolean(v.warning), aspect: v.aspect, until: capUntil, daily, statusBase: entry.base, logo: Boolean(hooks.posterLogo), queue: v.queue, fbOwner: v.owner });
      const lines = [];
      const since = v.liveSince ? ` since ${String(v.liveSince).slice(11, 19)} UTC` : '';
      if (live) lines.push(`Live view of game ${s.id}: live on Facebook${since}.`);
      else if (v.state === 'queued') lines.push(queuedText(s.id, v.queue));
      else if (v.state === 'live') lines.push(`Live view: the camera is on game ${camera} now, not on ${s.id}; ${s.id} is in line for it. Call live_view again later.`);
      else if (v.state === 'capped') {
        const mins = Math.max(1, Math.ceil((v.retryInS ?? 60) / 60));
        const inWords = mins < 90 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`;
        const why = String(v.error ?? '').replace(/^the limit of /, '').replace(/ is reached$/, '');
        lines.push(`Live view of game ${s.id}: the live view is at its ${daily ? 'daily' : 'hourly'} limit until ${capUntil ?? `about ${inWords} from now`} UTC${capUntil ? ` (in about ${inWords})` : ''}${why ? `: ${why}, so Facebook does not block the account` : ''}. The game itself works: keep playing, and call live_view again after that time.`);
      } else if (v.state === 'retrying') {
        const why = v.error ? ` (${String(v.error).slice(0, 200)})` : '';
        const when = v.retryInS ? ` in ${v.retryInS} s` : '';
        lines.push(`Live view of game ${s.id}: not live: the live video could not start${why}. It is tried again by itself${when}; call live_view again after that.`);
      } else if (['starting', 'connecting', 'ending'].includes(v.state)) {
        lines.push(`Live view of game ${s.id}: the live video is starting but was not live after ${Math.round((Date.now() - asked) / 1000)} s. Call live_view again in about 20 s for a page that shows it live.`);
      } else if (v.fb) lines.push(`Live view of game ${s.id}: no live video yet; the camera picks the game up once its bot is in the world. Call live_view again in about 20 s.`);
      else lines.push(`Live view of game ${s.id}: live video is off on this server.`);
      lines.push(videoUrl ? `Video (plain link): ${videoUrl}` : `3D view in a web page (plain link): ${l.eyes}`);
      if (v.warning) lines.push(`Warning: ${v.warning}`);
      if (v.fb) lines.push('One camera serves every game on this server, first come, first served: it stays on a game until that game ends (or makes no call for 5 minutes while others wait), then moves to the next game in line, which gets a live video of its own.');
      lines.push('', 'HTML page (Facebook\'s video player and a status line; a small script reloads the player, no request of its own):', html);
      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: { format: 'html', game: s.id, state: v.state, live, camera_game: camera, video_url: videoUrl, embed_url: embedUrl, ...(v.queue ? { queue: v.queue } : {}), ...(v.warning ? { warning: v.warning } : {}), html },
      };
    });

    server.registerTool('end_game', { description: 'End the game and free the bot. The reply is the full report of the game: show it to your user as it is.', inputSchema: {} }, async () => {
      const s = game(entry);
      const attribution = s && typeof s.body?.attribution === 'function' ? safely(() => s.body.attribution(), null) : null;
      if (s) safely(() => s.tracker?.observe(observed(s)));
      const report = s?.tracker ? safely(() => s.tracker.report({ gameId: s.id, attribution, ended: 'ended with end_game' }), null) : null;
      if (s) {
        queues.get(s)?.stop('the game ended');
        hooks.endSession(s, 'ended through MCP');
      }
      forget('you ended it with end_game');
      const out = text(`Game ended.${report ? `\n\n${report.text}\n\n` : attribution ? ` ${attribution.text}. ` : ' '}start_game gives you a new bot.`);
      const sc = {
        ...(attribution ? { attribution: { muse: attribution.muse, reflex: attribution.reflex, care: attribution.care, musePct: attribution.musePct, ...(attribution.rule != null ? { rule: attribution.rule, body: attribution.body, decidedPct: attribution.decidedPct } : {}) } } : {}),
        ...(report ? { report: report.data } : {}),
      };
      return Object.keys(sc).length ? { ...out, structuredContent: sc } : out;
    });

    server.registerTool('set_goal', {
      description: 'Change your game\'s goal when your user gives a new one: a preset or their words, as start_game\'s goal. Counted goals: kill or hunt N <mob>, collect, mine or get N <item>, craft, make or smelt N <item>, reach y <Y> or <x> <z> or the Nether, build a <blueprint>, survive N nights or days, several joined with "and". Other words stay your goal as text, not counted. The reply has the plan and how the server counts it; the report keeps every goal with its time.',
      inputSchema: { goal: z.string().min(1).max(120).describe(`a preset (${GOAL_NAMES.join(', ')}) or your user's words, e.g. "kill 100 pigs"`) },
    }, async ({ goal: raw }) => {
      const s = game(entry);
      if (!s?.tracker) return fail('no game yet: call start_game with this goal');
      const before = s.tracker.goal;
      const g = readGoal(raw, s);
      safely(() => s.tracker.observe(observed(s)));
      const changed = s.tracker.setGoal(g, 'set_goal');
      const head = changed
        ? `Goal set: ${g.title ?? g.key} (it was: ${before.key === 'free' && !before.text ? 'free play' : before.title ?? before.key}; the report keeps both).`
        : `That is the goal already: ${g.title ?? g.key}; nothing changed.`;
      return { ...text(`${head}\n${planText(s.tracker.goal, { lex, leaseMin })}\n${s.tracker.line()} This game has ${roughly(Math.max(0, s.expiresAt - now()))} left.`), structuredContent: { goal: s.tracker.progress() } };
    });

    server.registerTool('game_report', {
      description: 'The report of your game so far: the goal, milestones with times, deaths, who acted, and the decision log from your why texts and the advice you followed or declined.',
      inputSchema: {},
      annotations: { readOnlyHint: true },
    }, async () => {
      const s = game(entry);
      if (!s?.tracker) return fail('no game to report on: start_game first');
      safely(() => s.tracker.observe(observed(s)));
      const attribution = typeof s.body?.attribution === 'function' ? safely(() => s.body.attribution(), null) : null;
      const report = s.tracker.report({ gameId: s.id, attribution });
      return { ...text(report.text), structuredContent: { report: report.data } };
    });

    // ready prompts a client can offer in one click (the one-line prompt): the user still states their age itself
    if (typeof server.registerPrompt === 'function') {
      server.registerPrompt('play_to_the_nether', {
        title: 'Play Minecraft to the Nether and back',
        description: 'Muse plays its own bot from a fresh start to the Nether and back, by itself, with a live view and a report at the end.',
      }, () => ({ messages: [{ role: 'user', content: { type: 'text', text: promptText('nether_and_back') } }] }));
      server.registerPrompt('free_play', {
        title: 'Play Minecraft',
        description: 'Muse plays its own bot by itself toward a goal you name (or just plays), with a live view and a report at the end.',
        argsSchema: { goal: z.string().max(120).optional().describe(`what to play for: ${GOAL_NAMES.join(', ')}, or a short text`) },
      }, ({ goal } = {}) => ({ messages: [{ role: 'user', content: { type: 'text', text: promptText(goal || 'free') } }] }));
    }
    // what the client reads of this server (production game g71c9f5, 2026-10-13: Muse sent no why or plan and asked for
    // the age as if its tool list were days old; whether it reads tools/list each session was in no log): each list
    // request, once per MCP session per kind
    for (const method of ['tools/list', 'prompts/list']) {
      const h = low._requestHandlers?.get?.(method);
      if (typeof h !== 'function') continue;
      low._requestHandlers.set(method, async (...a) => {
        const out = await h(...a);
        safely(() => hooks.log.event('mcp_list', { session: sid8(), method, count: (out?.tools ?? out?.prompts ?? []).length, game: safely(() => game(entry)?.id, null) ?? null }));
        return out;
      });
    }
    // a client that kept an old tool list: told the list changed once it is initialized (it may read it again; a
    // client without a stream open for it just does not hear it)
    low.oninitialized = () => {
      // a moment later: a client opens its stream for server messages after initializing
      const t = setTimeout(() => safely(() => {
        server.sendToolListChanged?.();
        hooks.log.event('mcp_list_changed', { session: sid8() });
      }), 1_000);
      t.unref?.();
    };
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
      // refusals before a session, in the log too (g71c9f5: two get_state calls Muse saw fail are in no log of ours)
      if (id) { hooks.log.event('mcp_http', { status: 404, session: String(id).slice(0, 8), method: req.method, why: 'unknown session' }); reply(404, 'unknown session; initialize again'); return; }
      const address = hooks.clientKey(req);
      const refused = admit(address);
      if (refused) { hooks.log.event('mcp_http', { status: refused.status, method: req.method, why: clean(refused.message, 120) }); reply(refused.status, refused.message, refused.headers); return; }
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
    // the owner's connection (MCP_OWNER_KEY, ?owner= or X-Muse-Owner): its games are first in line for the camera
    if (!entry.owner && safely(() => hooks.isOwner?.(req), false)) entry.owner = true;
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
