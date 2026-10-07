// src/mcp.js - the MCP endpoint (/mcp, streamable HTTP) so an agent such as Muse can play through a connector instead
// of a web page. Built to save the agent's time: every call answers within CALL_MS with the result AND the new state
// in one reply (no separate state read), play_sequence runs several skills in one call, and a skill that outlives its
// call keeps running; its result goes out with a later reply (get_state waits for it). A result counts as reported
// only once a reply carrying it was delivered (not cancelled by the client).
// One MCP session = at most one guest bot, with the same leases and logging as the web page (src/web.js gives the
// hooks); games are also capped per address, and MCP sessions themselves are capped in number and body size.
// The game is for adults: start_game needs adult: true, which the agent sets only after its user has confirmed 18+.

import crypto from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOLS, TOOL_NAMES, validateArgs } from './contracts.js';

const CALL_MS = 45_000; // every reply within 45 s: MCP clients commonly give up after 60 s (a long skill keeps going)
const MIN_START_MS = 3_000; // a skill is not started with less time than this left in the call
const IDLE_MS = 5 * 60_000; // a game nobody has called for 5 minutes (and that runs nothing) is ended, freeing its bot
const IDLE_SESSION_MS = 10 * 60_000; // an MCP session without a game is dropped after 10 minutes without calls
const JOIN_WAIT_MS = 30_000;
const MAX_STEPS = 12;
const MAX_BODY = 64 * 1024; // the SDK's own default is 4 MiB, kept for the session's life in clientInfo
const OUTBOX_KEPT = 12;

/** One argument of a skill as text: names, enums in full, nested objects with their fields, integer ranges. */
function argText(k, v) {
  if (v.enum) return `${k}: one of ${v.enum.join('|')}`;
  if (v.type === 'object') return `${k}: {${Object.entries(v.properties ?? {}).map(([pk, pv]) => argText(pk, pv)).join(', ')}}`;
  if (v.type === 'integer') return `${k}: integer${v.maximum - v.minimum <= 1000 ? ` ${v.minimum} to ${v.maximum}` : ''}`;
  if (v.type === 'string') return `${k}: text${v.maxLength ? ` (1 to ${v.maxLength} characters)` : ''}`;
  return `${k}: ${v.type}`;
}

/** One line per skill: name {args} - what it does. Goes into play's description so the agent needs no lookup. */
export function skillList() {
  return TOOLS.map(({ function: f }) => {
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

/**
 * @param {object} hooks from createWeb: newSession(req, adult, {key, address}), lookup(token), startAction(s, tool,
 *   args), stateText(s), stopSession(s, reason), endSession(s, reason), links(s, base) -> {eyes, watch},
 *   within(promise, ms), TIMEOUT, log, now(), clientKey(req), base(req), leaseMs, initLimiter (take(key)),
 *   limits {sessions, perAddress}, callMs (tests)
 * @returns {(req, res) => Promise<void>} the /mcp handler
 */
export function createMcp(hooks) {
  const sessions = new Map(); // MCP session id -> entry {address, base, transport, token, pending, outbox, ...}
  const SKILLS = skillList();
  const now = hooks.now ?? Date.now; // the web's clock (leases, idle); call deadlines run on the real one
  const callMs = hooks.callMs ?? CALL_MS;
  const minStart = Math.min(MIN_START_MS, callMs / 10);
  const limits = { sessions: 200, perAddress: 20, ...(hooks.limits ?? {}) };
  const leaseMin = Math.round((hooks.leaseMs ?? 600_000) / 60_000);

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

  const fmt = (tool, args, r) => {
    const delta = Object.entries(r.delta ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
    return `${tool} ${JSON.stringify(args)}: ${r.ok ? 'ok' : 'FAILED'}: ${r.result}${delta ? ` [${delta}]` : ''}`;
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

  /** Finished skills whose results no delivered reply has carried yet (other than `skip`): their lines and entries. */
  function finished(entry, skip = []) {
    const items = entry.outbox.filter((p) => p.result && !skip.includes(p));
    return { items, text: items.length ? `Finished since your last call:\n${items.map((p) => fmt(p.tool, p.args, p.result)).join('\n')}\n\n` : '' };
  }
  /** A reply is about to go out: unless the client cancelled the call, the results in it count as reported. */
  function delivered(entry, extra, items) {
    if (!extra?.signal?.aborted && items.length) entry.outbox = entry.outbox.filter((p) => !items.includes(p));
  }

  /**
   * Run one skill before the call's deadline `end`: wait for a skill still running from an earlier call, start this
   * one only with MIN_START_MS left, then wait for it until `end`. A skill still running then keeps going
   * (entry.pending tracks it, entry.outbox keeps its result for a later reply). ran: whether it was started.
   */
  async function runOne(entry, s, { skill: tool, args, error }, end, signal) {
    if (error) return { ran: false, line: `${tool}: not run: ${error}` };
    const check = validateArgs(tool, args ?? {});
    if (!check.ok) return { ran: false, line: `${tool}: not run, bad arguments: ${check.error}` };
    if (tool === 'get_state') return { ran: true, ok: true, line: 'get_state: ok' };
    const prev = entry.pending;
    if (prev) {
      await wait(prev.promise, end - Date.now(), signal);
      if (!prev.result) return { ran: false, line: `${tool}: not run: ${prev.tool} is still running; call get_state to wait for it, or stop` };
    }
    if (end - Date.now() < minStart) return { ran: false, line: `${tool}: not run: no time was left in this call to start it; send it again` };
    const started = hooks.startAction(s, tool, check.args);
    if (!started.ok) return { ran: false, line: `${tool}: not run: ${started.error}` };
    const t0 = Date.now();
    const pending = { tool, args: check.args, promise: started.promise, result: null };
    entry.pending = pending;
    entry.outbox.push(pending);
    if (entry.outbox.length > OUTBOX_KEPT) entry.outbox.shift();
    started.promise.then((r) => { pending.result = r; }, () => {}).finally(() => { if (entry.pending === pending) entry.pending = null; });
    const r = await wait(started.promise, end - Date.now(), signal);
    if (r === hooks.TIMEOUT) {
      return { ran: true, ok: false, running: true, line: `${tool} ${JSON.stringify(check.args)}: still running after ${Math.round((Date.now() - t0) / 1000)} s (long walks and mining take a while); call get_state to wait for the result` };
    }
    return { ran: true, ok: r.ok, line: fmt(tool, check.args, r), item: pending };
  }

  const callShape = { skill: z.enum(TOOL_NAMES), args: z.record(z.string(), z.any()).optional().describe("the skill's arguments, e.g. {\"block\": \"oak_log\", \"n\": 3} for collect") };

  function build(entry) {
    const server = new McpServer({ name: 'muse-plays-minecraft', version: '1.0.0' }, {
      instructions: `Muse plays Minecraft: you control your own bot in a survival Minecraft world. Adults (18+) only: call start_game with adult: true only after your user has confirmed they are 18 or older. Then use play (one skill) or play_sequence (several in a row); each reply carries the results and the new state within ${Math.round(callMs / 1000)} s, and get_state waits for a skill still running. A game lasts ${leaseMin} min, ends after ${IDLE_MS / 60_000} min without calls, and end_game frees the bot. People can watch live at the links start_game returns.`,
    });
    const sid8 = () => String(entry.transport.sessionId ?? '').slice(0, 8);
    const need = () => {
      const { s, why } = lookupGame(entry);
      if (s) return s;
      if (why) throw new Error(`your game ended: ${why}; start_game gives you a NEW bot at a new spot with an empty inventory`);
      throw new Error('no game running: call start_game first');
    };
    const forget = (why) => { entry.token = null; entry.endedWhy = why; entry.pending = null; entry.outbox = []; };

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
        for (const other of sessions.values()) {
          if (other === entry || other.token !== handle) continue;
          Object.assign(entry, { pending: other.pending, outbox: other.outbox }); // its results come along
          Object.assign(other, { token: null, endedWhy: 'it moved to another connection', pending: null, outbox: [] });
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
      description: `Run ONE skill: {skill, args}, with that skill's arguments in args. Replies within ${Math.round(callMs / 1000)} s with the result and the new state; a skill still running then keeps going, and get_state waits for it and reports its result. Skills and their arguments:\n${SKILLS}`,
      inputSchema: z.object(callShape).loose(),
    }, async (raw, extra) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const r = await runOne(entry, s, splitCall(raw), Date.now() + callMs, extra?.signal);
      const inline = r.item ? [r.item] : [];
      const before = finished(entry, inline);
      delivered(entry, extra, [...before.items, ...inline]);
      const reply = `${before.text}${r.line}\n\n${stateBlock(s)}`;
      return r.ran ? text(reply) : fail(reply);
    });

    server.registerTool('play_sequence', {
      description: `Run up to ${MAX_STEPS} skills in order in ONE call, e.g. steps [{"skill": "collect", "args": {"block": "oak_log", "n": 3}}, {"skill": "craft", "args": {"item": "oak_planks", "n": 12}}]. Same skills and arguments as play. Stops at the first step that fails or cannot start and says why. Replies within ${Math.round(callMs / 1000)} s with every step's result, the steps not run and the final state. Saves many round trips.`,
      inputSchema: { steps: z.array(z.object(callShape).loose()).min(1).max(MAX_STEPS) },
    }, async ({ steps }, extra) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const end = Date.now() + callMs;
      const lines = [];
      const inline = [];
      let ranAny = false;
      let why = 'time';
      let i = 0;
      for (; i < steps.length; i++) {
        if (end - Date.now() < minStart) break;
        const r = await runOne(entry, s, splitCall(steps[i]), end, extra?.signal);
        lines.push(`${i + 1}. ${r.line}`);
        if (r.item) inline.push(r.item);
        ranAny ||= r.ran;
        if (!r.ran) { why = 'not run'; break; }
        if (!r.ok) { why = r.running ? 'running' : 'failed'; i++; break; }
      }
      const left = steps.slice(i).map((st, k) => `${i + k + 1}. ${st.skill}${st.args ? ` ${JSON.stringify(st.args)}` : ''}`).join(', ');
      const tail = !left ? '' : `\nNot run: ${left}. ${{
        time: `This call ran out of its ${Math.round(callMs / 1000)} s; send them again.`,
        'not run': `Step ${i + 1} could not start (see above); fix that, then send the steps you still want.`,
        running: 'Call get_state to wait for the running skill, then send them again.',
        failed: 'Deal with the failure above first, then send the steps you still want.',
      }[why]}`;
      const before = finished(entry, inline);
      delivered(entry, extra, [...before.items, ...inline]);
      const reply = `${before.text}${lines.join('\n')}${tail}\n\n${stateBlock(s)}`;
      return ranAny ? text(reply) : fail(reply);
    });

    server.registerTool('get_state', {
      description: `Read the game state as text, with the time left in the game. If a skill is still running, waits (up to ${Math.round(callMs / 1000)} s) for it; reports the results of skills that outlived earlier calls, once.`,
      inputSchema: {},
      annotations: { readOnlyHint: true },
    }, async (_args, extra) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const end = Date.now() + callMs;
      if (s.status !== 'ready') {
        await wait(Promise.resolve(s.ready), end - Date.now(), extra?.signal);
        if (s.ended) { forget(s.ended); return fail(`your game ended: ${s.ended}; call start_game again`); }
      }
      let head = '';
      const p = entry.pending;
      if (p) {
        await wait(p.promise, end - Date.now(), extra?.signal);
        if (!p.result) head = `${p.tool} is still running; call get_state again to keep waiting, or stop.\n\n`;
      }
      const done = finished(entry);
      delivered(entry, extra, done.items);
      return text(`${done.text}${head}${stateBlock(s)}`);
    });

    server.registerTool('stop', { description: 'Stop the skill that is running now.', inputSchema: {} }, async (_args, extra) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const was = await hooks.stopSession(s, 'stopped through MCP');
      if (entry.pending) await wait(entry.pending.promise, 3_000, extra?.signal);
      const done = finished(entry);
      delivered(entry, extra, done.items);
      return text(`${was ? 'Stopped.' : 'Nothing was running.'}\n\n${done.text}${stateBlock(s)}`);
    });

    server.registerTool('end_game', { description: 'End the game and free the bot.', inputSchema: {} }, async () => {
      const s = game(entry);
      if (s) hooks.endSession(s, 'ended through MCP');
      forget('you ended it with end_game');
      return text('Game ended. start_game gives you a new bot.');
    });
    return server;
  }

  function drop(sid, e) {
    sessions.delete(sid);
    Promise.resolve().then(() => e.transport.close?.()).catch(() => {});
  }

  /** Free one place among `list`: the MCP session called longest ago that holds no live game and runs nothing. */
  function evictOne(list) {
    let victim = null;
    for (const [sid, e] of list) if (!e.pending && !game(e) && (!victim || e.lastCall < victim[1].lastCall)) victim = [sid, e];
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

  // the reaper: games nobody has called for IDLE_MS, MCP sessions without a game for IDLE_SESSION_MS
  const reaper = setInterval(() => {
    const t = now();
    for (const [sid, e] of sessions) {
      const s = game(e);
      if (s && !e.pending && t - e.lastCall > IDLE_MS) {
        hooks.endSession(s, `no calls for ${IDLE_MS / 60_000} minutes`);
        Object.assign(e, { token: null, endedWhy: `no calls for ${IDLE_MS / 60_000} minutes`, outbox: [] });
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
      entry = { address, base: hooks.base(req), token: null, pending: null, outbox: [], endedWhy: null, lastCall: now() };
      entry.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        maxRequestBodySize: MAX_BODY,
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
    await entry.transport.handleRequest(req, res);
  }
  /** Live MCP sessions (tests and the operator). */
  handle.count = () => sessions.size;
  return handle;
}
