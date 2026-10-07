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

const CALL_MS = 85_000; // under the ~100 s a tunnel or proxy keeps a quiet request open
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

  async function runOne(s, tool, args) {
    const check = validateArgs(tool, args ?? {});
    if (!check.ok) return { ok: false, line: `${tool}: not run, bad arguments: ${check.error}` };
    if (tool === 'get_state') return { ok: true, line: 'get_state: ok' };
    const started = hooks.startAction(s, tool, check.args);
    if (!started.ok) return { ok: false, line: `${tool}: not run: ${started.error}` };
    const r = await hooks.within(started.promise, CALL_MS);
    if (r === hooks.TIMEOUT) return { ok: false, line: `${tool}: still running after ${CALL_MS / 1000} s; call get_state later or stop`, running: true };
    const delta = Object.entries(r.delta ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
    return { ok: r.ok, line: `${tool} ${JSON.stringify(check.args)}: ${r.ok ? 'ok' : 'FAILED'}: ${r.result}${delta ? ` [${delta}]` : ''}` };
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
        try { s = hooks.newSession(req, true); } catch (e) { return fail(`could not start: ${e.message}`); }
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
      const r = await runOne(s, skill, args);
      return text(`${r.line}\n\nState:\n${hooks.stateText(s)}`);
    });

    server.registerTool('play_sequence', {
      description: `Run up to ${MAX_STEPS} skills in order in ONE call (e.g. collect logs, craft planks, craft crafting_table, craft stick). Stops at the first failure and says why. Returns every step's result and the final state. Saves many round trips.`,
      inputSchema: { steps: z.array(z.object({ skill: z.enum(TOOL_NAMES), args: z.record(z.string(), z.any()).optional() })).min(1).max(MAX_STEPS) },
    }, async ({ steps }) => {
      let s;
      try { s = need(); } catch (e) { return fail(e.message); }
      const t0 = Date.now();
      const lines = [];
      let i = 0;
      for (; i < steps.length; i++) {
        if (Date.now() - t0 > CALL_MS - 15_000) break;
        const r = await runOne(s, steps[i].skill, steps[i].args);
        lines.push(`${i + 1}. ${r.line}`);
        if (!r.ok) { i++; break; }
      }
      const left = steps.length - i;
      return text(`${lines.join('\n')}${left ? `\n(${left} step(s) not run)` : ''}\n\nState:\n${hooks.stateText(s)}`);
    });

    server.registerTool('get_state', { description: 'Read the game state as text (no game time).', inputSchema: {} }, async () => {
      try { return text(hooks.stateText(need())); } catch (e) { return fail(e.message); }
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

  return async function handle(req, res, body) {
    const id = req.headers['mcp-session-id'];
    let entry = id ? sessions.get(String(id)) : null;
    if (!entry) {
      if (id) { res.writeHead(404, { 'content-type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'unknown session; initialize again' }, id: null })); return; }
      entry = { token: null };
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
    await entry.transport.handleRequest(req, res, body);
  };
}
