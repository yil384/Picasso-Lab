// src/journal.js - what happened, kept on disk in DATA_DIR as append-only JSON lines:
//   journal.jsonl    the decisions: order (with why, plan, the price when sent), refused (the code and words), fill,
//                    cancel, hold (a round without an order, with why and plan), outcome (an order's fill price against
//                    the price 1 day and 1 week later)
//   calls.jsonl      every MCP call: time, tool, session, a short form of its arguments, the reply's code
//   equity.jsonl     the account's equity and the benchmarks' prices, every few minutes
//   summaries.jsonl  one line a day (New York date): equity, change, orders, refusals, best and worst outcome
//   state.json       the start (date, equity, benchmark prices), the day's start equity and the halt
// The public order log (CSV/JSON) and the journal tool are views of journal.jsonl.
import fs from 'node:fs';
import path from 'node:path';

export const HORIZONS = [['1d', 86_400_000], ['1w', 7 * 86_400_000]];

/** The New York calendar date of a time: "2026-10-15". */
export const nyDate = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));

const readJsonl = (file) => {
  if (!fs.existsSync(file)) return [];
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* a line cut by a crash: skipped */ }
  }
  return out;
};

export function createStore(dir, { now = () => Date.now() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const file = (n) => path.join(dir, n);
  const statePath = file('state.json');
  let state = {};
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { state = {}; }
  const journal = readJsonl(file('journal.jsonl'));
  const equity = readJsonl(file('equity.jsonl'));
  const summaries = readJsonl(file('summaries.jsonl'));
  const add = (name, list, rec) => {
    fs.appendFileSync(file(name), `${JSON.stringify(rec)}\n`);
    list?.push(rec);
    return rec;
  };
  return {
    dir,
    get state() { return state; },
    save(patch) {
      state = { ...state, ...patch };
      fs.writeFileSync(`${statePath}.tmp`, JSON.stringify(state, null, 1));
      fs.renameSync(`${statePath}.tmp`, statePath);
      return state;
    },
    journal, equity, summaries,
    record: (kind, rec) => add('journal.jsonl', journal, { t: new Date(now()).toISOString(), kind, ...rec }),
    call: (rec) => add('calls.jsonl', null, { t: new Date(now()).toISOString(), ...rec }),
    equityPoint: (rec) => add('equity.jsonl', equity, { t: new Date(now()).toISOString(), ...rec }),
    summary: (rec) => add('summaries.jsonl', summaries, rec),
  };
}

/**
 * The order log: one row per order the agent sent or tried to send, newest first, its fill, cancel and outcomes
 * merged in. Refused orders are rows too (status "refused", the code), so the log shows every attempt.
 */
export function orderRows(journal) {
  const byId = new Map();
  const rows = [];
  for (const e of journal) {
    if (e.kind === 'order') {
      const r = { t: e.t, id: e.id, symbol: e.symbol, side: e.side, qty: e.qty ?? null, notional: e.notional ?? null, type: e.type, limit_price: e.limit_price ?? null, status: e.status ?? 'accepted', price_at_order: e.price ?? null, filled_qty: null, fill_price: null, filled_at: null, why: e.why, plan: e.plan, outcome_1d_pct: null, outcome_1d_pnl: null, outcome_1w_pct: null, outcome_1w_pnl: null, code: null, test: Boolean(e.test) };
      byId.set(e.id, r);
      rows.push(r);
    } else if (e.kind === 'refused') {
      rows.push({ t: e.t, id: null, symbol: e.symbol ?? null, side: e.side ?? null, qty: e.qty ?? null, notional: e.notional ?? null, type: e.type ?? null, limit_price: e.limit_price ?? null, status: 'refused', price_at_order: e.price ?? null, filled_qty: null, fill_price: null, filled_at: null, why: e.why ?? '', plan: e.plan ?? '', outcome_1d_pct: null, outcome_1d_pnl: null, outcome_1w_pct: null, outcome_1w_pnl: null, code: e.rule ? `${e.code}:${e.rule}` : e.code, test: Boolean(e.test) });
    } else if (byId.has(e.id)) {
      const r = byId.get(e.id);
      if (e.kind === 'fill') Object.assign(r, { status: 'filled', filled_qty: e.filled_qty, fill_price: e.price, filled_at: e.filled_at });
      else if (e.kind === 'cancel') r.status = e.status ?? 'canceled';
      else if (e.kind === 'outcome') Object.assign(r, { [`outcome_${e.horizon}_pct`]: e.pct, [`outcome_${e.horizon}_pnl`]: e.pnl });
    }
  }
  return rows.reverse();
}

export const CSV_COLUMNS = ['t', 'id', 'symbol', 'side', 'qty', 'notional', 'type', 'limit_price', 'status', 'code', 'price_at_order', 'filled_qty', 'fill_price', 'filled_at', 'why', 'plan', 'outcome_1d_pct', 'outcome_1d_pnl', 'outcome_1w_pct', 'outcome_1w_pnl', 'test'];
const cell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // a cell a spreadsheet would run as a formula starts with a quote
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export const toCsv = (rows) => [CSV_COLUMNS.join(','), ...rows.map((r) => CSV_COLUMNS.map((k) => cell(r[k])).join(','))].join('\n') + '\n';

/** Fills whose 1-day or 1-week outcome is due and not yet kept: [{fill, horizon}]. */
export function dueOutcomes(journal, t) {
  const done = new Set(journal.filter((e) => e.kind === 'outcome').map((e) => `${e.id}:${e.horizon}`));
  const out = [];
  for (const e of journal) {
    if (e.kind !== 'fill') continue;
    for (const [h, ms] of HORIZONS) if (!done.has(`${e.id}:${h}`) && t - Date.parse(e.filled_at ?? e.t) >= ms) out.push({ fill: e, horizon: h });
  }
  return out;
}

/**
 * An order's outcome at a later price. A buy: what the shares bought gained or lost since. A sell: what selling saved or
 * missed against holding on (positive when the price fell after the sale).
 */
export function outcomeOf(fill, later) {
  const qty = Number(fill.filled_qty), p = Number(fill.price);
  const sign = fill.side === 'sell' ? -1 : 1;
  return { price: later, pct: Number((sign * (later / p - 1)).toFixed(6)), pnl: Number((sign * (later - p) * qty).toFixed(2)) };
}

/** The decisions of the last `days` days, newest first, for the journal tool. */
export function decisions(journal, { since = 0, limit = 30 } = {}) {
  const rows = orderRows(journal).filter((r) => Date.parse(r.t) >= since);
  const holds = journal.filter((e) => e.kind === 'hold' && Date.parse(e.t) >= since).map((e) => ({ t: e.t, kind: 'hold', why: e.why, plan: e.plan, symbols: e.symbols ?? [] }));
  return [...rows.map((r) => ({ kind: 'order', ...r })), ...holds].sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, limit);
}

/** The day's summary (New York date `date`), from the journal and the equity points. */
export function daySummary(date, journal, equity, state) {
  const of = (e) => nyDate(Date.parse(e.t)) === date;
  const pts = equity.filter(of);
  const rows = orderRows(journal.filter(of)).filter((r) => !r.test);
  const outcomes = journal.filter((e) => e.kind === 'outcome' && of(e));
  const first = pts[0], last = pts.at(-1);
  const ret = (a, b) => (a && b ? b / a - 1 : null);
  return {
    date,
    equity_open: first?.equity ?? null,
    equity_close: last?.equity ?? null,
    day_return: ret(first?.equity, last?.equity),
    since_start: ret(state.startEquity, last?.equity),
    spy_since_start: ret(state.bench?.SPY, last?.spy),
    btc_since_start: ret(state.bench?.['BTC/USD'], last?.btc),
    orders: rows.filter((r) => r.status !== 'refused').length,
    refused: rows.filter((r) => r.status === 'refused').length,
    holds: journal.filter((e) => e.kind === 'hold' && of(e)).length,
    halted: state.haltedOn === date,
    best_outcome: outcomes.length ? outcomes.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null,
    worst_outcome: outcomes.length ? outcomes.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null,
  };
}
