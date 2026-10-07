// src/mcp.js - the MCP endpoint (/mcp, streamable HTTP) so an agent such as Muse can play through a connector instead
// of a web page. Built to save the agent's time: every call answers within CALL_MS with the result AND the new state
// in one reply (no separate state read), and play_sequence runs several skills in one call. The steps of play and
// play_sequence go into the game's queue (src/mcp-queue.js) and keep running past the reply; a later reply reports
// them (get_state waits for them), and a result counts as reported only once a reply carrying it was delivered (not
// cancelled by the client). A call is checked before it is queued (src/plan.js): bad arguments or missing items refuse
// it whole, and planks, sticks, a table or a furnace it needs are added as crafts. A repeat of a call (same
// request_id, or the same call within 60 s) returns the first call's steps and runs nothing twice. Replies carry
// structuredContent too: each step's status and typed code, what changed, and a short state (ROADMAP M2).
// One MCP session = at most one guest bot, with the same leases and logging as the web page (src/web.js gives the
// hooks); games are also capped per address, and MCP sessions themselves are capped in number and body size.
// The game is for adults: start_game needs adult: true, which the agent sets only after its user has confirmed 18+.

import crypto from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MCP_SKILLS, SKILL_NAMES, validateArgs, RESULT_CODES } from './contracts.js';
import { createQueue, isFinal, statusOf, QUEUE_MAX, REPEAT_MS } from './mcp-queue.js';
import { createPlanner, describeMissing } from './plan.js';

const CALL_MS = 45_000; // every reply within 45 s: MCP clients commonly give up after 60 s (a long skill keeps going)
const IDLE_MS = 5 * 60_000; // a game nobody has called for 5 minutes (and that runs nothing) is ended, freeing its bot
const IDLE_SESSION_MS = 10 * 60_000; // an MCP session without a game is dropped after 10 minutes without calls
const JOIN_WAIT_MS = 30_000;
const MAX_STEPS = 32;
const MAX_BODY = 64 * 1024; // the SDK's own default is 4 MiB, kept for the session's life in clientInfo
const STATION_RADIUS = 32; // craft and smelt use a table or furnace this close (src/skills/craft.js, smelt.js)

/** One argument of a skill as text: names, enums in full, nested objects with their fields, integer ranges. */
function argText(k, v) {
  if (v.enum) return `${k}: one of ${v.enum.join('|')}`;
  if (v.type === 'array') return `${k}: list of ${v.minItems ?? 0} to ${v.maxItems} {${Object.keys(v.items?.properties ?? {}).join(', ')}}`;
  if (v.type === 'object') return `${k}: {${Object.entries(v.properties ?? {}).map(([pk, pv]) => argText(pk, pv)).join(', ')}}`;
  if (v.type === 'integer') return `${k}: integer${v.maximum - v.minimum <= 1000 ? ` ${v.minimum} to ${v.maximum}` : ''}`;
  if (v.type === 'string') return `${k}: text${v.maxLength ? ` (1 to ${v.maxLength} characters)` : ''}`;
  return `${k}: ${v.type}`;
}

/** One line per skill: name {args} - what it does. Goes into play's description so the agent needs no lookup. */
export function skillList() {
  return MCP_SKILLS.map(({ function: f }) => {
    const args = Object.entries(f.parameters.properties ?? {}).map(([k, v]) => argText(k, v)).join(', ');
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
const fmtDelta = (delta) => Object.entries(delta ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');

// structuredContent of play, play_sequence, get_state and stop (declared, so a client can rely on its shape)
const STEP_OUT = z.object({
  n: z.number().describe('position in this call\'s steps (added crafts included)'),
  step: z.number().nullable().describe('your step number, null for a craft the check added'),
  skill: z.string(),
  args: z.record(z.string(), z.any()),
  status: z.enum(['pending', 'confirmed', 'failed', 'cancelled']),
  running: z.boolean().optional(),
  result: z.string().optional(),
  delta: z.record(z.string(), z.number()).optional(),
  code: z.string().optional(),
  added: z.string().optional(),
  why: z.string().optional(),
}).loose();
const REPLY_OUT = z.object({
  code: z.enum(RESULT_CODES).nullable().describe('the typed outcome of this call; null when nothing went wrong'),
  game: z.string().nullable(),
  steps: z.array(STEP_OUT).describe("this call's steps"),
  earlier: z.array(STEP_OUT).describe('steps of earlier calls that finished since your last reply'),
  queue: z.object({ running: z.string().nullable(), waiting: z.number() }),
  changed: z.record(z.string(), z.number()).describe('inventory change of every finished step in this reply'),
  state: z.record(z.string(), z.any()).nullable().describe('health, food, pos, inventory, timeLeftS'),
}).loose();

/**
 * @param {object} hooks from createWeb: newSession(req, adult, {key, address}), lookup(token), startAction(s, tool,
 *   args), stateText(s), stopSession(s, reason), endSession(s, reason), links(s, base) -> {eyes, watch},
 *   within(promise, ms), TIMEOUT, log, now(), clientKey(req), base(req), leaseMs, initLimiter (take(key)),
 *   limits {sessions, perAddress}, callMs (tests)
 * @returns {(req, res) => Promise<void>} the /mcp handler
 */
export function createMcp(hooks) {
  const sessions = new Map(); // MCP session id -> entry {address, base, transport, token, endedWhy, lastCall}
  const SKILLS = skillList();
  const now = hooks.now ?? Date.now; // the web's clock (leases, idle, repeats); call deadlines run on the real one
  const callMs = hooks.callMs ?? CALL_MS;
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
  const outcome = (r) => {
    const delta = fmtDelta(r.delta);
    return `: ${r.ok ? 'ok' : 'FAILED'}: ${r.result}${delta ? ` [${delta}]` : ''}`;
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

  /** One step as a reply line. numbered: "3. " in front (sequences, or a play the check added crafts to). */
  function stepLine(st, numbered) {
    const head = `${numbered ? `${st.n}. ` : ''}${st.skill} ${JSON.stringify(st.args)}${st.added ? ` (added by the check, ${st.added})` : ''}`;
    if (st.status === 'confirmed' || st.status === 'failed') return `${head}${outcome(st.result)}`;
    if (st.status === 'cancelled') return `${head}: cancelled (${st.why ?? 'stopped'})${st.result ? `: ${st.result.result}${fmtDelta(st.result.delta) ? ` [${fmtDelta(st.result.delta)}]` : ''}` : ''}`;
    if (st.status === 'running') return `${head}: still running after ${Math.round((now() - st.startedAt) / 1000)} s (long walks and mining take a while); a later reply reports the result`;
    return `${head}: queued`;
  }

  function report(st) {
    const r = st.result;
    return {
      n: st.n,
      step: st.step,
      skill: st.skill,
      args: st.args,
      status: statusOf(st),
      ...(st.status === 'running' ? { running: true } : {}),
      ...(r ? { result: r.result, delta: r.delta } : {}),
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
      });
    }
    const inventory = safely(() => s.body.inventory?.());
    if (inventory) out.inventory = inventory;
    return out;
  }

  const describe = (st) => `${st.skill}${Object.keys(st.args ?? {}).length ? ` ${JSON.stringify(st.args)}` : ''}`;

  /**
   * The reply to a call (or to get_state / stop): what finished since the last delivered reply, this call's steps,
   * the state. Marks the final steps it carries as delivered unless the client cancelled the call.
   */
  function reply(s, extra, { steps = [], numbered = false, lead = '', tail = '', code = null, isError = false, more = {} } = {}) {
    const q = s ? queueOf(s) : null;
    const earlier = q ? q.finished(steps) : [];
    const shown = [...earlier, ...steps.filter(isFinal)];
    if (q && !extra?.signal?.aborted) q.delivered(shown);
    const changed = {};
    for (const st of shown) for (const [k, v] of Object.entries(st.result?.delta ?? {})) changed[k] = (changed[k] ?? 0) + v;
    for (const k of Object.keys(changed)) if (!changed[k]) delete changed[k];
    const firstCode = (list) => list.find((st) => st.code && st.status !== 'cancelled')?.code ?? null;
    // steps cancelled before they started are listed once, in the tail ("Not run: ...")
    const lines = steps.filter((st) => st.status !== 'cancelled' || st.result).map((st) => stepLine(st, numbered)).join('\n');
    const main = `${lead.trimEnd()}${lead.trim() && lines ? '\n' : ''}${lines}${tail}`.trim();
    const blocks = [
      earlier.length ? `Finished since your last call:\n${earlier.map((st) => stepLine(st, false)).join('\n')}` : '',
      main,
      s ? stateBlock(s) : '',
    ];
    const body = blocks.filter(Boolean).join('\n\n');
    const structured = {
      code: code ?? firstCode(steps) ?? firstCode(earlier),
      game: s?.id ?? null,
      steps: steps.map(report),
      earlier: earlier.map(report),
      queue: { running: q?.running ? describe(q.running) : null, waiting: q?.waiting.length ?? 0 },
      changed,
      state: shortState(s),
      ...more,
    };
    return { content: [{ type: 'text', text: body }], structuredContent: structured, ...(isError ? { isError: true } : {}) };
  }

  /** A call that was not accepted: nothing ran. */
  const refuse = (s, extra, code, message, more = {}) => reply(s, extra, { lead: message, code, isError: true, more });

  /** The dry-run check for steps on this game: the plan, or null when the check cannot run (then nothing is refused). */
  function checkSteps(s, steps) {
    try {
      const bot = safely(() => s.body.bot);
      const version = bot?.version ?? '1.21.4';
      if (!planners.has(version)) planners.set(version, createPlanner({ version }));
      // asked only when a step needs a station the bot does not carry (a scan of the blocks around: ~30 ms)
      const near = (name) => () => {
        const id = bot?.registry?.blocksByName?.[name]?.id;
        if (id === undefined || typeof bot.findBlock !== 'function') return null;
        return safely(() => Boolean(bot.findBlock({ matching: id, maxDistance: STATION_RADIUS })), null);
      };
      return planners.get(version).check(steps, {
        inventory: safely(() => s.body.inventory?.(), {}) ?? {},
        table: near('crafting_table'),
        furnace: near('furnace'),
        before: queueOf(s).open.map((st) => ({ skill: st.skill, args: st.args })),
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
    const end = Date.now() + callMs;
    let s;
    try { s = need(entry); } catch (e) { return refuse(null, extra, 'NOT_STARTED', e.message); }

    const bad = [];
    const steps = raw.steps.map((call, i) => {
      const p = splitCall(call);
      if (p.error) { bad.push(`${i + 1}. ${p.skill}: not run: ${p.error}`); return null; }
      const v = validateArgs(p.skill, p.args ?? {});
      if (!v.ok) { bad.push(`${i + 1}. ${p.skill}: not run, bad arguments: ${v.error}`); return null; }
      return { skill: p.skill, args: v.args };
    });
    if (bad.length) {
      const one = tool === 'play';
      return refuse(s, extra, 'BAD_ARGS', `${one ? bad[0].replace(/^1\. /, '') : bad.join('\n')}\nNothing was run: fix ${bad.length > 1 ? 'these steps' : one ? 'it' : 'that step'} and send the call again.`);
    }

    if (s.status !== 'ready') {
      await wait(Promise.resolve(s.ready), end - Date.now(), extra?.signal);
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
        return refuse(s, extra, 'DUPLICATE', `request_id "${requestId}" was already used ${Math.round((now() - first.at) / 1000)} s ago for a different call; nothing was run. Use a new request_id for a new call.`);
      }
      await wait(first.settled, end - Date.now(), extra?.signal);
      const ago = Math.round((now() - first.at) / 1000);
      return reply(s, extra, {
        steps: first.steps,
        numbered: tool === 'play_sequence' || first.steps.length > 1,
        lead: `Already received ${ago} s ago (${requestId ? `same request_id "${requestId}"` : `the same call within ${REPEAT_MS / 1000} s`}): not run again. ${requestId ? 'To run it again, send it with a new request_id.' : 'To run it again on purpose, give it a request_id.'} Its steps:\n`,
        tail: pendingTail(first.steps),
        code: 'DUPLICATE',
        more: { duplicate: { ageS: ago, by: requestId ? 'request_id' : 'same call' } },
      });
    }

    const plan = checkSteps(s, steps);
    const planned = plan?.steps ?? steps.map((st, i) => ({ ...st, step: i + 1 }));
    if (raw.dry_run) {
      const lines = planned.map((st, i) => `${i + 1}. ${st.skill} ${JSON.stringify(st.args)}${st.added ? ` (added by the check, ${st.added})` : ''}`);
      const verdict = !plan ? 'The check could not run; nothing was checked.'
        : plan.ok ? `The check passed${plan.added ? `, adding ${plan.added} craft${plan.added > 1 ? 's' : ''}` : ''}. Nothing was run (dry_run); send it again without dry_run to run it.`
          : `The check would refuse this: missing ${plan.missing.map((m) => `${describeMissing(m)} (step ${m.step})`).join('; ')}. Nothing was run (dry_run).`;
      return reply(s, extra, { lead: `${verdict}\nThe steps as they would run:\n${lines.join('\n')}`, code: plan && !plan.ok ? 'NEED_ITEMS' : null, more: { plan: planned, ...(plan && !plan.ok ? { missing: plan.missing } : {}) } });
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

    const call = q.submit(key, { sig, requestId, label: `your ${tool}`, planned });
    await wait(call.settled, end - Date.now(), extra?.signal);
    const added = planned.filter((st) => st.added || st.addedItems?.length).length;
    return reply(s, extra, {
      steps: call.steps,
      numbered: tool === 'play_sequence' || call.steps.length > 1,
      lead: added ? `The check added ${plan.added} craft${plan.added > 1 ? 's' : ''} your steps need (marked below).\n` : '',
      tail: pendingTail(call.steps),
    });
  }

  /** What the reply says after the step lines: steps cancelled after a failure, steps still running or queued. */
  function pendingTail(steps) {
    const cancelled = steps.filter((st) => st.status === 'cancelled' && !st.result);
    const open = steps.filter((st) => !isFinal(st));
    const failed = steps.some((st) => st.status === 'failed');
    let out = '';
    if (cancelled.length) {
      out += `\nNot run: ${cancelled.map((st) => `${st.n}. ${describe(st)}`).join(', ')}. ${failed ? 'Deal with the failure above first, then send the steps you still want.' : `They were cancelled (${cancelled[0].why}).`}`;
    }
    if (open.length) {
      out += `\n${open.length === 1 ? `Step ${open[0].n} is` : `Steps ${open.map((st) => st.n).join(', ')} are`} still running or queued: they go on after this reply. Call get_state to wait for them (it reports their results once), or stop to clear the queue.`;
    }
    return out;
  }

  const need = (entry) => {
    const { s, why } = lookupGame(entry);
    if (s) return s;
    if (why) throw new Error(`your game ended: ${why}; start_game gives you a NEW bot at a new spot with an empty inventory`);
    throw new Error('no game running: call start_game first');
  };

  const callShape = { skill: z.enum(SKILL_NAMES), args: z.record(z.string(), z.any()).optional().describe("the skill's arguments, e.g. {\"block\": \"oak_log\", \"n\": 3} for collect") };
  const requestIdShape = z.string().min(1).max(64).optional().describe(`any id of yours for this call (1 to 64 characters): if the call is sent again with the same request_id (a retry after a broken connection), nothing runs twice and the reply carries the first call's results. Without one, the same call within ${REPEAT_MS / 1000} s counts as a repeat; give a new request_id to repeat a call on purpose`);
  const queueText = `Steps run in order in a queue: what does not finish within ${Math.round(callMs / 1000)} s keeps running after the reply (a later reply, or get_state, reports it); a step that fails cancels the steps queued after it; stop clears the queue. Before anything runs, a check simulates your inventory through the steps: if an ingredient, fuel, tool or station is missing, the call is refused with the list (code NEED_ITEMS) and nothing runs; planks, sticks, a crafting table or a furnace that can be made from what you carry are added as crafts. Replies carry structuredContent: each step's status (pending, confirmed, failed, cancelled) and code (${RESULT_CODES.join(', ')}), what changed, and a short state.`;

  function build(entry) {
    const server = new McpServer({ name: 'muse-plays-minecraft', version: '1.0.0' }, {
      instructions: `Muse plays Minecraft: you control your own bot in a survival Minecraft world. Adults (18+) only: call start_game with adult: true only after your user has confirmed they are 18 or older. Then use play (one skill) or play_sequence (several in a row); each reply carries the results and the new state within ${Math.round(callMs / 1000)} s, and get_state waits for a skill still running. A game lasts ${leaseMin} min, ends after ${IDLE_MS / 60_000} min without calls, and end_game frees the bot. People can watch live at the links start_game returns.`,
    });
    const sid8 = () => String(entry.transport.sessionId ?? '').slice(0, 8);
    const forget = (why) => { entry.token = null; entry.endedWhy = why; };

    server.registerTool('start_game', {
      description: `Adults (18+) only: set adult to true only after your user has confirmed they are 18 or older. Starts your own Minecraft bot in a survival world (a NEW bot at a fresh spot with an empty inventory), or resumes the game of this connection, or (game set to the handle an earlier start_game reply gave) that game from an earlier connection. A game lasts ${leaseMin} min and ends after ${IDLE_MS / 60_000} min without calls. Returns the skills, the state and links where a person can watch live. Call this first.`,
      inputSchema: {
        adult: z.boolean().describe('true only after your user has confirmed they are 18 or older'),
        game: z.string().max(64).optional().describe('the handle of a game to resume (from an earlier start_game reply)'),
      },
    }, async ({ adult, game: handle }, extra) => {
      if (adult !== true) return fail('This game is for adults (18+) only. Ask your user to confirm they are 18 or older, then call start_game with adult: true.');
      let s = game(entry);
      let resumed = Boolean(s);
      if (handle && handle !== entry.token) {
        if (s) return fail(`this connection already plays game ${s.id}; call end_game first to switch games`);
        try { s = hooks.lookup(handle); } catch (e) { return fail(`could not resume that game: ${e.reason ?? e.message}; call start_game without game for a new one`); }
        if (!String(s.client ?? '').startsWith('mcp:')) return fail('could not resume that game: it was not started through this connector');
        // the game's queue, its results not yet reported and its remembered calls come along (they belong to the game)
        for (const other of sessions.values()) {
          if (other === entry || other.token !== handle) continue;
          Object.assign(other, { token: null, endedWhy: 'it moved to another connection' });
        }
        entry.token = handle;
        resumed = true;
      }
      if (!s) {
        try {
          s = hooks.newSession(null, adult, { key: `mcp:${entry.transport.sessionId ?? crypto.randomUUID()}`, address: entry.address });
        } catch (e) { return fail(`could not start: ${e.message}`); }
        forget(null);
        entry.token = s.token;
        hooks.log.event('mcp_game', { session: sid8(), game: s.id });
      }
      if (s.status !== 'ready') await wait(Promise.resolve(s.ready), JOIN_WAIT_MS, extra?.signal);
      if (s.ended) { forget(null); return fail(`could not start: ${s.ended}; call start_game again in a moment`); }
      const l = hooks.links(s, entry.base);
      return text(`${resumed ? `Resumed game ${s.id}` : `New game ${s.id}: a new bot at a fresh spot with an empty inventory`}. Watch live: ${l.eyes} (bot's eyes), ${l.watch} (from behind).\nTo resume this game from a new connection, call start_game with adult: true and game: "${s.token}".\n${s.status === 'ready' ? '' : 'The bot is still joining the world: call get_state in a few seconds (it waits for the bot).\n'}\nSkills (use play or play_sequence; a skill's arguments go in args):\n${SKILLS}\n\n${stateBlock(s)}`);
    });

    server.registerTool('play', {
      description: `Run ONE skill: {skill, args}, with that skill's arguments in args. Replies within ${Math.round(callMs / 1000)} s with the result and the new state; a skill still running then keeps going, and get_state waits for it and reports its result. ${queueText} Skills and their arguments:\n${SKILLS}`,
      inputSchema: z.object({ ...callShape, request_id: requestIdShape }).loose(),
      outputSchema: REPLY_OUT,
    }, async ({ request_id: requestId, ...raw }, extra) => runCall(entry, 'play', { steps: [raw], request_id: requestId }, extra));

    server.registerTool('play_sequence', {
      description: `Run up to ${MAX_STEPS} skills in order, sent in ONE call, e.g. steps [{"skill": "collect", "args": {"block": "oak_log", "n": 3}}, {"skill": "craft_batch", "args": {"items": [{"item": "oak_planks", "n": 12}, {"item": "crafting_table", "n": 1}, {"item": "wooden_pickaxe", "n": 1}]}}]. Same skills and arguments as play (craft_batch crafts a list with one table). Replies within ${Math.round(callMs / 1000)} s with every step's result or status and the final state. ${queueText} dry_run: true only checks the steps and shows them as they would run. Saves many round trips.`,
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
      const end = Date.now() + callMs;
      if (s.status !== 'ready') {
        await wait(Promise.resolve(s.ready), end - Date.now(), extra?.signal);
        if (s.ended) { forget(s.ended); return refuse(null, extra, 'NOT_STARTED', `your game ended: ${s.ended}; call start_game again`); }
      }
      const q = queueOf(s);
      let lead = '';
      if (q.busy) {
        await wait(q.idle(), end - Date.now(), extra?.signal);
        if (q.busy) lead = `${describe(q.running ?? q.waiting[0])} is still running${q.waiting.length ? ` (${q.waiting.length} more queued)` : ''}; call get_state again to keep waiting, or stop.\n`;
      }
      const more = full ? { full: safely(() => s.body.snapshot(), null) } : {};
      return reply(s, extra, { lead, more });
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
      if (running) await wait(running.done, 3_000, extra?.signal);
      const what = `${was || running ? 'Stopped.' : 'Nothing was running.'}${cancelled.length ? ` ${cancelled.length} queued step${cancelled.length > 1 ? 's were' : ' was'} cancelled.` : ''}\n`;
      return reply(s, extra, { lead: what, code: was || running || cancelled.length ? 'STOPPED' : null });
    });

    server.registerTool('end_game', { description: 'End the game and free the bot.', inputSchema: {} }, async () => {
      const s = game(entry);
      if (s) {
        queues.get(s)?.stop('the game ended');
        hooks.endSession(s, 'ended through MCP');
      }
      forget('you ended it with end_game');
      return text('Game ended. start_game gives you a new bot.');
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

  // the reaper: games nobody has called for IDLE_MS (and that run nothing), MCP sessions without a game for IDLE_SESSION_MS
  const reaper = setInterval(() => {
    const t = now();
    for (const [sid, e] of sessions) {
      const s = game(e);
      // a game someone is watching live (a /eyes or /watch socket) is not idle: the lease still ends it
      if (s && !busy(s) && t - e.lastCall > IDLE_MS && !(hooks.watching?.(s.id) > 0)) {
        hooks.endSession(s, `no calls for ${IDLE_MS / 60_000} minutes`);
        Object.assign(e, { token: null, endedWhy: `no calls for ${IDLE_MS / 60_000} minutes` });
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
      entry = { address, base: hooks.base(req), token: null, endedWhy: null, lastCall: now() };
      entry.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        maxRequestBodySize: MAX_BODY,
        // plain JSON replies, not an SSE stream: simple clients (the HTTP code Muse writes for itself) read them whole
        enableJsonResponse: true,
        onsessioninitialized: (sid) => { sessions.set(sid, entry); },
      });
      entry.transport.onclose = () => {
        for (const [k, v] of sessions) if (v === entry) sessions.delete(k);
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
    await entry.transport.handleRequest(req, res);
  }
  /** Live MCP sessions (tests and the operator). */
  handle.count = () => sessions.size;
  return handle;
}
