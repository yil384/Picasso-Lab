// src/mcp.js - the MCP server (streamable HTTP, JSON replies) the agent trades through. Reading tools (rules, market,
// news, portfolio, orders, journal, live_view) are open to every caller; the tools that act (place_order,
// cancel_order, hold) need the owner's key (MCP_OWNER_KEY: ?key= on the URL, Authorization: Bearer, or X-Muse-Owner),
// or, on a server without a key, a caller on this machine. Every reply has a typed code in structuredContent (OK,
// BAD_ARGS, UNKNOWN_SYMBOL, MARKET_CLOSED, RISK_LIMIT with its rule, NOT_TRADABLE, NO_PRICE, NOT_FOUND, NOT_OPEN,
// OWNER_ONLY, BROKER_ERROR) and clear words in its text. Arguments are read leniently (a symbol list as a string,
// numbers as strings); every word an agent sends is cleaned of offensive words before anything keeps or shows it
// (src/moderation.js), and every call is kept in calls.jsonl.
import crypto from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { moderator } from './moderation.js';
import { RULES_TEXT, LIMITS, WHY_MAX, PLAN_MAX } from './risk.js';
import { indicatorLine, money, signedPct } from './indicators.js';
import { orderRows, decisions } from './journal.js';
import { liveViewHtml } from './page.js';
import { MARKET_MAX } from './trader.js';

export const LIVE_NUDGE = 'Your user can watch the trading floor: call live_view and show its HTML, exactly as returned, as a web artifact in your preview panel.';
export const WORDS_NUDGE = `Every round ends with place_order or hold, each with why (<= ${WHY_MAX} chars) and plan (<= ${PLAN_MAX} chars): viewers read them on the trading floor.`;
const MAX_BODY = 64 * 1024;
const IDLE_SESSION_MS = 30 * 60_000;

export const INSTRUCTIONS = `This server trades a PAPER account (Alpaca paper trading, real market data) for a public research demo by Picasso Lab, UC San Diego. Nothing here is real money or investment advice.
A round: portfolio (where you stand against SPY and BTC buy-and-hold), market for the symbols you consider (and news if useful), then place_order or hold. Every order and hold needs why and plan: they are public on the trading floor and in the order log.
A risk layer you cannot switch off checks every order: long only, no options, no leverage, at most ${LIMITS.positionMaxPct * 100}% of equity per symbol, at most ${LIMITS.ordersPerHour} orders an hour, buys stop for the day at -${LIMITS.dailyLossPct * 100}% from the day's start; S&P 500 stocks and ten crypto pairs only; stocks in market hours. A refusal says which rule and why; nothing is sent then.
rules lists the limits and where you stand on them. journal shows your past decisions with their outcomes after 1 day and 1 week. live_view returns the trading floor as a page for your preview panel.`;

const text = (s, structured, isError = false) => ({ content: [{ type: 'text', text: s }], structuredContent: structured, ...(isError ? { isError: true } : {}) });
const refusal = (r) => text(`${r.code === 'BROKER_ERROR' ? 'FAILED' : 'REFUSED'} (${r.code}${r.rule ? `, ${r.rule}` : ''}): ${r.message}${r.code === 'BROKER_ERROR' ? '' : ' Nothing was sent to the broker.'}`, { code: r.code, ...(r.rule ? { rule: r.rule } : {}), message: r.message }, true);
const listOf = (v) => (Array.isArray(v) ? v : String(v ?? '').split(/[\s,;]+/)).map((s) => String(s).trim()).filter(Boolean);
const etTime = (iso) => (iso ? `${new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} ET` : '');
const short = (v, n = 160) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > n ? `${s.slice(0, n)}...` : s; };
const num = z.union([z.number(), z.string()]);

function orderLine(r) {
  const size = r.notional ? money(Number(r.notional)) : r.qty;
  const st = r.status === 'refused' ? `refused ${r.code}` : r.status === 'filled' ? `filled @ ${money(Number(r.fill_price))}` : r.status;
  const out = [r.outcome_1d_pct !== null ? `1d ${signedPct(r.outcome_1d_pct)} (${money(r.outcome_1d_pnl)})` : '', r.outcome_1w_pct !== null ? `1w ${signedPct(r.outcome_1w_pct)} (${money(r.outcome_1w_pnl)})` : ''].filter(Boolean).join(', ');
  return `${r.test ? '[TEST] ' : ''}${etTime(r.t)} ${String(r.side ?? '').toUpperCase()} ${size} ${r.symbol}${r.type === 'limit' ? ` limit ${money(Number(r.limit_price))}` : ''}: ${st}${r.id ? ` [id ${r.id}]` : ''}${out ? ` | outcome ${out}` : ''} | why: ${r.why}`;
}

/**
 * @param {{trader: object, base: (req) => string, clientKey: (req) => string, isOwner: (req) => boolean,
 *   isLocal: (req) => boolean, ownerKeySet: boolean, limits?: object, log?: (rec) => void}} hooks
 * @returns {(req, res) => Promise<void>} the /mcp handler
 */
export function createMcp(hooks) {
  const { trader } = hooks;
  const words = moderator();
  const limits = { sessions: 200, perAddress: 20, perMinute: 120, newPerMinute: 20, ...(hooks.limits ?? {}) };
  const sessions = new Map();
  const opened = new Map(); // address -> times of new sessions in the last minute

  function build(entry) {
    const server = new McpServer({ name: 'muse-trader', version: '0.1.0' }, { instructions: INSTRUCTIONS });
    const register = server.registerTool.bind(server);
    server.registerTool = (name, def, handler) => register(name, def, async (raw, extra) => {
      const t0 = Date.now();
      const cleaned = words.cleanValue(raw ?? {});
      const args = cleaned.value;
      let out = null;
      try {
        out = await handler(args, extra);
        // the live view's line, once per MCP session, on the first reading reply of an owner's session without it
        if (entry.owner && !entry.liveViewed && !entry.liveTold && ['portfolio', 'market'].includes(name) && !out.isError) {
          entry.liveTold = true;
          out.content[0].text += `\n\n${LIVE_NUDGE}`;
        }
        if (entry.owner && !entry.wordsTold && ['portfolio', 'market'].includes(name) && !out.isError) {
          entry.wordsTold = true;
          out.content[0].text += `\n${WORDS_NUDGE}`;
        }
        return out;
      } catch (e) {
        out = text(`FAILED (SERVER_ERROR): ${String(e?.message ?? e).slice(0, 200)}`, { code: 'SERVER_ERROR' }, true);
        return out;
      } finally {
        try {
          trader.store.call({ session: String(entry.transport?.sessionId ?? '').slice(0, 8), owner: entry.owner, client: entry.client, tool: name, args: short(args, 300), code: out?.structuredContent?.code ?? null, ms: Date.now() - t0, ...(cleaned.removed ? { moderated: cleaned.fields.slice(0, 8) } : {}) });
        } catch { /* the log never breaks a call */ }
      }
    });
    // a call the SDK's own input check refuses gets the same reply as any refusal: BAD_ARGS, nothing run
    const toolError = typeof server.createToolError === 'function' ? server.createToolError.bind(server) : null;
    if (toolError) {
      server.createToolError = (message) => {
        const m = /^(?:MCP error -32602: )?Input validation error: (.*)$/s.exec(String(message));
        return m ? refusal({ code: 'BAD_ARGS', message: `${String(m[1]).slice(0, 500)}. Fix the call and send it again.` }) : toolError(message);
      };
    }
    const low = server.server;
    const init = typeof low._oninitialize === 'function' ? low._oninitialize.bind(low) : null;
    if (init) {
      low._oninitialize = async (request) => {
        const result = await init(request);
        const name = String(request?.params?.clientInfo?.name ?? '').slice(0, 60);
        entry.client = words.clean(name).removed ? 'agent' : name;
        return result;
      };
    }
    const mayAct = () => entry.owner || (!hooks.ownerKeySet && entry.local);
    const ownerOnly = (tool) => refusal({ code: 'OWNER_ONLY', message: `${tool} acts on the account, so it needs the owner's key (this server's MCP URL with ?key=...). Reading tools work for everyone.` });

    server.registerTool('rules', {
      description: 'The rules every order is checked against (they cannot be switched off), and where the account stands on them now: orders in the last hour, the day\'s loss, the halt.',
      inputSchema: {}, annotations: { readOnlyHint: true },
    }, async () => {
      const p = await trader.portfolio();
      const now = p.ok ? [`Now: ${p.ordersLastHour} of ${LIMITS.ordersPerHour} orders used in the last 60 minutes; day ${signedPct(p.day.change)} from the day's start (${money(p.day.start)}); new buys ${p.day.halted ? 'HALTED until tomorrow (New York time)' : 'allowed'}.`] : [];
      return text([...RULES_TEXT.map((r) => `- ${r}`), ...now].join('\n'), { code: 'OK', rules: RULES_TEXT, limits: LIMITS, ...(p.ok ? { orders_last_hour: p.ordersLastHour, day_change: p.day.change, halted: p.day.halted } : {}) });
    });

    server.registerTool('market', {
      description: `Quotes and a few plain indicators for up to ${MARKET_MAX} symbols (S&P 500 stocks, SPY, the listed crypto pairs such as BTC/USD): last price, returns over 1, 5 and 20 days, the price against its 20- and 50-day averages, 20-day volatility (annualized), today's volume so far against the 20-day average; and whether the stock market is open. They describe the past; none predicts.`,
      inputSchema: { symbols: z.union([z.array(z.string()), z.string()]).describe('e.g. ["AAPL", "MSFT", "BTC/USD"] or "AAPL, MSFT, BTC/USD"') },
      annotations: { readOnlyHint: true },
    }, async ({ symbols }) => {
      const r = await trader.market(listOf(symbols));
      if (!r.ok) return refusal(r);
      const head = r.clock.stocks_open ? `Stock market: OPEN (closes ${etTime(r.clock.next_close)}). Crypto: always open.` : `Stock market: CLOSED (opens ${etTime(r.clock.next_open)}). Crypto: always open.`;
      const lines = [head, ...r.rows.map((x) => indicatorLine(x.symbol, x, x.ind)), 'Daily bars; indicators describe the past and predict nothing.'];
      if (r.unknown.length) lines.push(`Not on the list (left out): ${r.unknown.join(', ')}`);
      return text(lines.join('\n'), { code: 'OK', clock: r.clock, quotes: r.rows, unknown: r.unknown });
    });

    server.registerTool('news', {
      description: 'Recent headlines for some symbols (or the market at large without symbols), newest first, from Alpaca\'s news feed: time, source, headline, link.',
      inputSchema: { symbols: z.union([z.array(z.string()), z.string()]).optional(), limit: num.optional().describe('1-50, default 10') },
      annotations: { readOnlyHint: true },
    }, async ({ symbols, limit }) => {
      const r = await trader.news(listOf(symbols), Number(limit) || 10);
      if (!r.ok) return refusal(r);
      const lines = r.items.length ? r.items.map((n) => `${etTime(n.at)} [${n.source}] ${n.headline}${n.symbols.length ? ` (${n.symbols.slice(0, 5).join(', ')})` : ''}${n.url ? ` ${n.url}` : ''}`) : ['No headlines.'];
      return text(lines.join('\n'), { code: 'OK', items: r.items });
    });

    server.registerTool('portfolio', {
      description: 'The account: equity, cash, each position (quantity, average price, price, value, P&L, weight), the day\'s change and halt, and the return since the start against SPY and BTC buy-and-hold.',
      inputSchema: {}, annotations: { readOnlyHint: true },
    }, async () => {
      const p = await trader.portfolio();
      if (!p.ok) return refusal(p);
      const s = p.since;
      const lines = [
        `${p.mock ? 'MOCK broker (made-up prices). ' : ''}Equity ${money(p.equity)}, cash ${money(p.cash)} (${((p.cash / p.equity) * 100).toFixed(1)}%). Today ${signedPct(p.day.change)} from ${money(p.day.start)}${p.day.halted ? '; NEW BUYS HALTED until tomorrow' : ''}.`,
        s ? `Since the start (${etTime(s.startedAt)}): Muse ${signedPct(s.muse)}, SPY buy-and-hold ${signedPct(s.spy)}, BTC buy-and-hold ${signedPct(s.btc)}.` : 'The start is recorded at the first look at the account.',
        ...(p.positions.length ? p.positions.map((x) => `${x.symbol}: ${+x.qty.toFixed(6)} @ avg ${money(x.avg)}, now ${money(x.price)}, value ${money(x.value)} (${(x.weight * 100).toFixed(1)}% of equity), P&L ${money(x.pnl)} (${signedPct(x.pnlPct)})`) : ['No positions: all cash.']),
        `Orders in the last 60 minutes: ${p.ordersLastHour} of ${LIMITS.ordersPerHour}.`,
      ];
      return text(lines.join('\n'), { code: 'OK', equity: p.equity, cash: p.cash, positions: p.positions, day: p.day, since: s, orders_last_hour: p.ordersLastHour, mock: p.mock });
    });

    server.registerTool('place_order', {
      description: `Buy or sell one symbol. Give qty (shares or coins; "all" sells the whole position) or notional (dollars, market orders only). type "market" (default) or "limit" with limit_price. why (<= ${WHY_MAX} chars) and plan (<= ${PLAN_MAX} chars) are REQUIRED and public. The risk layer checks the order first; a refusal names the rule and nothing is sent. Needs the owner's key.`,
      inputSchema: {
        symbol: z.string().describe('"AAPL", "BRK.B", "BTC/USD"'),
        side: z.string().describe('"buy" or "sell"'),
        qty: num.optional().describe('shares or coins, e.g. 3 or 0.015; "all" for a whole position (sell)'),
        notional: num.optional().describe('dollars, e.g. 2500 (market orders)'),
        type: z.string().optional().describe('"market" (default) or "limit"'),
        limit_price: num.optional().describe('for a limit order'),
        why: z.string().describe(`the reason for this order, <= ${WHY_MAX} chars, public`),
        plan: z.string().describe(`what you will do next: when you would add, take profit or cut it, <= ${PLAN_MAX} chars, public`),
        test: z.boolean().optional().describe('operators only: true marks a deployment test, labelled TEST in the public log. Leave it out.'),
      },
    }, async (args) => {
      if (!mayAct()) return ownerOnly('place_order');
      const r = await trader.placeOrder(args, { session: String(entry.transport?.sessionId ?? '').slice(0, 8), test: args.test === true });
      hooks.onChange?.();
      if (!r.ok) return refusal(r);
      const o = r.order;
      const size = o.qty ? `${o.qty}` : money(Number(o.notional));
      const fill = o.status === 'filled' ? `filled ${+Number(o.filled_qty).toFixed(9)} at ${money(Number(o.filled_avg_price))}` : `status ${o.status} (the trading floor shows the fill when it comes)`;
      const lines = [`Order sent: ${o.side.toUpperCase()} ${size} ${o.symbol} ${o.type}${o.limit_price ? ` limit ${money(Number(o.limit_price))}` : ''}: ${fill}. id ${o.id}.`, 'Your why and plan are on the trading floor and in the public order log.'];
      if (r.notes.length) lines.push(`Read as: ${r.notes.join('; ')}.`);
      return text(lines.join('\n'), { code: 'OK', order: { id: o.id, symbol: o.symbol, side: o.side, type: o.type, qty: o.qty, notional: o.notional, limit_price: o.limit_price, status: o.status, filled_qty: o.filled_qty, filled_avg_price: o.filled_avg_price }, notes: r.notes });
    });

    server.registerTool('cancel_order', {
      description: 'Cancel an open order of this account by its id (from place_order or orders). Needs the owner\'s key.',
      inputSchema: { id: z.string(), why: z.string().optional().describe(`why, <= ${WHY_MAX} chars, public`) },
    }, async ({ id, why }) => {
      if (!mayAct()) return ownerOnly('cancel_order');
      const r = await trader.cancelOrder(String(id).trim(), { why: String(why ?? '').slice(0, WHY_MAX) });
      hooks.onChange?.();
      if (!r.ok) return refusal(r);
      return text(r.status === 'filled' ? `Order ${id} had already filled; nothing to cancel.` : `Order ${id} canceled.`, { code: 'OK', id, status: r.status });
    });

    server.registerTool('orders', {
      description: 'This account\'s orders, newest first, with status, fill price, why and outcome: status "open", "closed" or "all" (default), refused attempts included in "all".',
      inputSchema: { status: z.string().optional(), limit: num.optional().describe('1-100, default 20') },
      annotations: { readOnlyHint: true },
    }, async ({ status = 'all', limit }) => {
      const st = String(status).toLowerCase();
      const openish = (r) => !['filled', 'canceled', 'expired', 'rejected', 'refused'].includes(r.status);
      const rows = orderRows(trader.store.journal).filter((r) => (st === 'open' ? openish(r) : st === 'closed' ? !openish(r) && r.status !== 'refused' : true));
      const n = Math.min(100, Math.max(1, Number(limit) || 20));
      return text(rows.length ? rows.slice(0, n).map(orderLine).join('\n') : 'No orders.', { code: 'OK', orders: rows.slice(0, n), total: rows.length });
    });

    server.registerTool('journal', {
      description: 'Your past decisions (orders, refusals, holds) with their why and plan and the outcome of each fill after 1 day and 1 week, plus the daily summaries. Use it to learn from what worked.',
      inputSchema: { days: num.optional().describe('1-90, default 7'), limit: num.optional().describe('1-100, default 30') },
      annotations: { readOnlyHint: true },
    }, async ({ days, limit }) => {
      const d = Math.min(90, Math.max(1, Number(days) || 7));
      const list = decisions(trader.store.journal, { since: trader.now() - d * 86_400_000, limit: Math.min(100, Math.max(1, Number(limit) || 30)) });
      const today = trader.today();
      const sums = trader.store.summaries.slice(-d);
      const lines = [
        `Decisions in the last ${d} day(s): ${list.length}.`,
        ...list.map((x) => (x.kind === 'hold' ? `${etTime(x.t)} HOLD | why: ${x.why} | plan: ${x.plan}` : `${orderLine(x)} | plan: ${x.plan}`)),
        `Today so far: ${today.orders} orders, ${today.refused} refused, ${today.holds} holds${today.day_return !== null ? `, equity ${signedPct(today.day_return)}` : ''}.`,
        ...sums.map((s) => `Day ${s.date}: equity ${money(s.equity_close)} (${signedPct(s.day_return)}), since start ${signedPct(s.since_start)} vs SPY ${signedPct(s.spy_since_start)} and BTC ${signedPct(s.btc_since_start)}; ${s.orders} orders, ${s.refused} refused${s.halted ? '; buys halted' : ''}.`),
      ];
      return text(lines.join('\n'), { code: 'OK', decisions: list, today, summaries: sums });
    });

    server.registerTool('hold', {
      description: `Record a round where you decided not to trade, with why (<= ${WHY_MAX} chars) and plan (<= ${PLAN_MAX} chars): it shows on the trading floor as your latest thinking and goes into the journal. Needs the owner's key.`,
      inputSchema: { why: z.string(), plan: z.string(), symbols: z.union([z.array(z.string()), z.string()]).optional().describe('the symbols you looked at') },
    }, async ({ why, plan, symbols }) => {
      if (!mayAct()) return ownerOnly('hold');
      const w = String(why ?? '').replace(/\s+/g, ' ').trim(), p = String(plan ?? '').replace(/\s+/g, ' ').trim();
      if (!w || !p) return refusal({ code: 'BAD_ARGS', message: 'hold needs why and plan, both non-empty' });
      const notes = [];
      const cut = (s, n, k) => { if (s.length <= n) return s; notes.push(`${k} cut to ${n} chars`); return `${s.slice(0, n - 3).trimEnd()}...`; };
      trader.hold({ why: cut(w, WHY_MAX, 'why'), plan: cut(p, PLAN_MAX, 'plan'), symbols: listOf(symbols) }, { session: String(entry.transport?.sessionId ?? '').slice(0, 8) });
      hooks.onChange?.();
      return text(`Hold recorded; it is your latest thinking on the trading floor.${notes.length ? ` (${notes.join('; ')})` : ''}`, { code: 'OK', notes });
    });

    server.registerTool('live_view', {
      description: 'The trading floor as a small web page for your preview panel: equity against SPY and BTC buy-and-hold, positions, the order tape with each why, your latest thinking. It updates itself every 10 s (images from this server). Show the HTML exactly as returned as a web artifact.',
      inputSchema: {}, annotations: { readOnlyHint: true },
    }, async () => {
      entry.liveViewed = true;
      const base = hooks.base(entry.req);
      const html = liveViewHtml(base, { mock: trader.mock });
      return text(`Trading floor (updates itself every 10 s). Public page with the full order log: ${base}\n\nHTML page (show it exactly as returned, as a web artifact):\n${html}`, { code: 'OK', url: base, html });
    });

    return server;
  }

  function admit(address, owner) {
    const t = Date.now();
    const recent = (opened.get(address) ?? []).filter((x) => x > t - 60_000);
    if (!owner && recent.length >= limits.newPerMinute) return { status: 429, message: 'too many new MCP sessions from your address; try again in a minute' };
    recent.push(t);
    opened.set(address, recent);
    const mine = [...sessions].filter(([, e]) => e.address === address).sort((a, b) => a[1].lastCall - b[1].lastCall);
    if (mine.length >= limits.perAddress) drop(...mine[0]);
    if (sessions.size >= limits.sessions) {
      const oldest = [...sessions].sort((a, b) => a[1].lastCall - b[1].lastCall)[0];
      if (oldest && t - oldest[1].lastCall > 60_000) drop(...oldest); else return { status: 503, message: 'the server holds as many MCP sessions as it can; try again in a few minutes' };
    }
    return null;
  }
  function drop(sid, e) {
    sessions.delete(sid);
    Promise.resolve().then(() => e.transport.close?.()).catch(() => {});
  }
  const reaper = setInterval(() => {
    const t = Date.now();
    for (const [sid, e] of sessions) if (t - e.lastCall > IDLE_SESSION_MS) drop(sid, e);
    for (const [a, list] of opened) if (!list.some((x) => x > t - 60_000)) opened.delete(a);
  }, 60_000);
  reaper.unref();

  async function handle(req, res) {
    const id = req.headers['mcp-session-id'];
    let entry = id ? sessions.get(String(id)) : null;
    const reply = (status, message, headers = {}) => {
      req.resume();
      res.writeHead(status, { 'content-type': 'application/json', ...headers }).end(JSON.stringify({ jsonrpc: '2.0', error: { code: status === 404 ? -32001 : -32000, message }, id: null }));
    };
    if (!entry) {
      if (id) return reply(404, 'unknown session; initialize again');
      const address = hooks.clientKey(req);
      const owner = Boolean(hooks.isOwner(req));
      const refused = admit(address, owner);
      if (refused) return reply(refused.status, refused.message, refused.status === 429 ? { 'retry-after': '60' } : {});
      entry = { address, owner, local: Boolean(hooks.isLocal?.(req)), lastCall: Date.now(), hits: [], client: null };
      entry.transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        enableJsonResponse: true, // plain JSON replies: simple clients read them whole
        onsessioninitialized: (sid) => { sessions.set(sid, entry); },
      });
      entry.transport.onclose = () => { for (const [k, v] of sessions) if (v === entry) sessions.delete(k); };
      await build(entry).connect(entry.transport);
    }
    const t = Date.now();
    entry.hits = entry.hits.filter((x) => x > t - 60_000);
    if (!entry.owner && entry.hits.length >= limits.perMinute) return reply(429, `too many requests on this MCP session (at most ${limits.perMinute} a minute); slow down`, { 'retry-after': '30' });
    entry.hits.push(t);
    entry.lastCall = t;
    entry.req = { headers: { ...req.headers }, socket: { remoteAddress: req.socket?.remoteAddress } };
    if (!entry.owner && hooks.isOwner(req)) entry.owner = true;
    if (req.method === 'POST') {
      const accept = String(req.headers.accept ?? '');
      if (!/application\/json/.test(accept) || !/text\/event-stream/.test(accept)) req.headers.accept = 'application/json, text/event-stream';
      const len = Number(req.headers['content-length'] ?? 0);
      if (len > MAX_BODY) return reply(413, 'request too large');
    }
    await entry.transport.handleRequest(req, res);
  }
  handle.count = () => sessions.size;
  return handle;
}
