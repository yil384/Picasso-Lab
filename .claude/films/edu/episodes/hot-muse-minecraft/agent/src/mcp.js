// src/mcp.js - the MCP endpoint (/mcp, streamable HTTP) so an agent such as Muse can play through a connector instead
// of a web page. Built to save the agent's time: every call runs to the end and answers with the result AND the new
// state in one reply (no polling, no separate state read), and play_sequence runs several skills in one call.
// One MCP session = one guest bot, with the same leases, limits and logging as the web page (src/web.js gives the
// hooks). Users of the connector are adults by the agent's own terms, so start_game attests 18+ for them.

import crypto from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { TOOLS, TOOL_NAMES, validateArgs } from './contracts.js';

const CALL_MS = 45_000; // every reply within 45 s: MCP clients commonly give up after 60 s (a long skill keeps going)
const IDLE_MS = 5 * 60_000; // a game nobody has called for 5 minutes (and that runs nothing) is ended, freeing its bot
const MAX_STEPS = 12;

/** One line per skill: name(args) - what it does. Goes into the tool descriptions so the agent needs no lookup. */
function skillList() {
  return TOOLS.map(({ function: f }) => {
    const props = Object.entries(f.parameters.properties ?? {});
    const args = props.map(([k, v]) => (v.enum ? `${k}: one of ${v.enum.slice(0, 40).join('|')}` : `${k}: ${v.type ?? 'object'}`)).join(', ');
    return `- ${f.name}(${args}): ${f.description}`;
  }).join('\n');
}

/**
 * @param {object} hooks from createWeb: newSession(req, adult), lookup(token), startAction(s, tool, args),
 *   stateText(s), stopSession(s, reason), endSession(s, reason), links(s, req) -> {eyes, watch}, within(promise, ms), log
 * @returns {(req, res) => Promise<void>} the /mcp handler
 */
export function createMcp(hooks) {
  const sessions = new Map(); // MCP session id -> {transport, game token}
  const SKILLS = skillList();

  function game(entry) {
    if (!entry.token) return null;
    try { return hooks.lookup(entry.token); } catch { return null; }
  }
  const text = (t) => ({ content: [{ type: 'text', text: t }] });
  const fail = (t) => ({ content: [{ type: 'text', text: t }], isError: true });

  const fmt = (tool, args, r) => {
    const delta = Object.entries(r.delta ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
    return `${tool} ${JSON.stringify(args)}: ${r.ok ? 'ok' : 'FAILED'}: ${r.result}${delta ? ` [${delta}]` : ''}`;
  };

  /** The result of a skill that outlived its call and has finished since, once: "" when there is none. */
  function earlier(entry) {
    const u = entry.unreported;
    if (!u || !u.result) return '';
    entry.unreported = null;
    return `Finished since your last call: ${fmt(u.tool, u.args, u.result)}\n`;
  }

  /** Run one skill, waiting at most `budget` ms; a skill still running then keeps going and entry.pending tracks it. */
  async function runOne(entry, s, tool, args, budget = CALL_MS) {
    const check = validateArgs(tool, args ?? {});
    if (!check.ok) return { ok: false, line: `${tool}: not run, bad arguments: ${check.error}` };
    if (tool === 'get_state') return { ok: true, line: 'get_state: ok' };
    if (entry.pending) {
      const prev = await hooks.within(entry.pending.promise, budget);
      if (prev === hooks.TIMEOUT) return { ok: false, running: true, line: `${tool}: not run: ${entry.pending.tool} is still running; call get_state to wait for it, or stop` };
    }
    const started = hooks.startAction(s, tool, check.args);
    if (!started.ok) return { ok: false, line: `${tool}: not run: ${started.error}` };
    const pending = { tool, args: check.args, promise: started.promise, result: null };
    entry.pending = pending;
    started.promise.then((r) => { pending.result = r; }, () => {}).finally(() => { if (entry.pending === pending) entry.pending = null; });
    const r = await hooks.within(started.promise, budget);
    if (r === hooks.TIMEOUT) {
      entry.unreported = pending; // its result goes out with the next call, whichever it is
      return { ok: false, running: true, line: `${tool} ${JSON.stringify(check.args)}: still running after ${Math.round(budget / 1000)} s (long walks and mining take a while); call get_state to wait for the result` };
    }
    return { ok: r.ok, line: fmt(tool, check.args, r) };
  }

  function build(entry, req) {
    const server = new McpServer({ name: 'muse-plays-minecraft', version: '1.0.0' });
    const need = () => {
      const s = game(entry);
      if (!s || s.ended) throw new Error('no game running: call start_game first');
      return s;
    };

    server.registerTool('start_game', {
      description: 'Start (or resume) your own Minecraft bot in a survival world. Returns the game state and links where a person can watch live. Call this first.',
      inputSchema: {},
    }, async () => {
      let s = game(entry);
      if (!s || s.ended) {
        try { s = hooks.newSession(req, true, `mcp:${entry.transport.sessionId ?? crypto.randomUUID()}`); } catch (e) { return fail(`could not start: ${e.message}`); }
        entry.token = s.token;
      }
      await hooks.within(Promise.resolve(s.ready).catch(() => {}), 30_000);
      const l = hooks.links(s, req);
      return text(`Game ${s.id} started. Watch live: ${l.eyes} (bot's eyes), ${l.watch} (from behind).\n\nSkills (use play or play_sequence):\n${SKILLS}\n\nState:\n${hooks.stateText(s)}`);
    });

    server.registerTool('play', {
      description: 'Run ONE skill and wait until it finishes. Returns the result and the new game state, so you never need to poll.',
      inputSchema: { skill: z.enum(TOOL_NAMES), args: z.record(z.string(), z.any()).optional() },
    }, async ({ skill, args }) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const before = earlier(entry);
      const r = await runOne(entry, s, skill, args);
      return text(`${before}${r.line}\n\nState:\n${hooks.stateText(s)}`);
    });

    server.registerTool('play_sequence', {
      description: `Run up to ${MAX_STEPS} skills in order in ONE call (e.g. collect logs, craft planks, craft crafting_table, craft stick). Stops at the first failure and says why. Returns every step's result and the final state. Saves many round trips.`,
      inputSchema: { steps: z.array(z.object({ skill: z.enum(TOOL_NAMES), args: z.record(z.string(), z.any()).optional() })).min(1).max(MAX_STEPS) },
    }, async ({ steps }) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const deadline = Date.now() + CALL_MS;
      const lines = [earlier(entry).trim()].filter(Boolean);
      let i = 0;
      for (; i < steps.length; i++) {
        const budget = deadline - Date.now();
        if (budget < 3_000) break;
        const r = await runOne(entry, s, steps[i].skill, steps[i].args, budget);
        lines.push(`${i + 1}. ${r.line}`);
        if (!r.ok) { i++; break; }
      }
      const left = steps.length - i;
      return text(`${lines.join('\n')}${left ? `\n(${left} step(s) not run yet: send them again)` : ''}\n\nState:\n${hooks.stateText(s)}`);
    });

    server.registerTool('get_state', { description: 'Read the game state as text. If a skill is still running, waits (up to 45 s) for it to finish and reports its result first.', inputSchema: {} }, async () => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      let head = '';
      if (entry.pending) {
        const p = entry.pending;
        const r = await hooks.within(p.promise, CALL_MS);
        if (r === hooks.TIMEOUT) head = `${p.tool} is still running; call get_state again to keep waiting, or stop.\n\n`;
        else { head = `${fmt(p.tool, p.args, r)}\n\n`; if (entry.unreported === p) entry.unreported = null; }
      } else {
        const e = earlier(entry);
        if (e) head = `${e}\n`;
      }
      return text(`${head}State:\n${hooks.stateText(s)}`);
    });

    server.registerTool('stop', { description: 'Stop the skill that is running now.', inputSchema: {} }, async () => {
      try { return text((await hooks.stopSession(need(), 'stopped through MCP')) ? 'Stopped.' : 'Nothing was running.'); } catch (e) { return fail(e.message); }
    });

    server.registerTool('end_game', { description: 'End the game and free the bot.', inputSchema: {} }, async () => {
      const s = game(entry);
      if (s && !s.ended) hooks.endSession(s, 'ended through MCP');
      entry.token = null;
      return text('Game ended.');
    });
    return server;
  }

  // the idle reaper: games nobody has called for IDLE_MS, and MCP sessions with no game for an hour
  const reaper = setInterval(() => {
    const t = Date.now();
    for (const [sid, e] of sessions) {
      const s = game(e);
      if (s && !s.ended && !e.pending && t - e.lastCall > IDLE_MS) {
        hooks.endSession(s, 'no calls for 5 minutes');
        e.token = null;
        hooks.log.event('mcp_idle_end', { session: sid.slice(0, 8), game: s.id });
      }
      if (!game(e) && t - e.lastCall > 60 * 60_000) { sessions.delete(sid); e.transport.close?.().catch?.(() => {}); }
    }
  }, 30_000);
  reaper.unref();

  return async function handle(req, res, body) {
    const id = req.headers['mcp-session-id'];
    let entry = id ? sessions.get(String(id)) : null;
    if (!entry) {
      if (id) { res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'unknown session; initialize again' }, id: null })); return; }
      entry = { token: null, pending: null, unreported: null, lastCall: Date.now() };
      entry.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sid) => { sessions.set(sid, entry); hooks.log.event('mcp_session', { session: sid.slice(0, 8) }); },
      });
      entry.transport.onclose = () => {
        for (const [k, v] of sessions) if (v === entry) sessions.delete(k);
        const s = game(entry);
        if (s && !s.ended) hooks.endSession(s, 'MCP session closed');
      };
      await build(entry, req).connect(entry.transport);
    }
    entry.lastCall = Date.now();
    await entry.transport.handleRequest(req, res, body);
  };
}
