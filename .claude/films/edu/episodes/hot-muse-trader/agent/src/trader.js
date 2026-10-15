// src/trader.js - the trading desk between the MCP tools and the broker: market data with indicators, the portfolio
// against the benchmarks, orders through the risk layer (src/risk.js) into the journal (src/journal.js), and the tick
// that keeps the record (fills, equity, outcomes, the daily summary). Every broker failure comes back as BROKER_ERROR
// with Alpaca's own words.
import crypto from 'node:crypto';
import { BrokerError, isCrypto } from './alpaca.js';
import { indicators } from './indicators.js';
import { readOrder, checkOrder, LIMITS } from './risk.js';
import { BENCHMARKS, normalizeSymbol } from './universe.js';
import { nyDate, dueOutcomes, outcomeOf, daySummary } from './journal.js';

const OPEN = ['new', 'accepted', 'pending_new', 'partially_filled', 'accepted_for_bidding', 'held'];
const DONE = ['canceled', 'expired', 'rejected', 'replaced', 'done_for_day', 'stopped', 'suspended'];
export const MARKET_MAX = 20;
const EQUITY_EVERY_MS = 5 * 60_000;

/** A typed refusal or failure: {code, message, rule?}. */
export const fail = (code, message, rule) => ({ ok: false, code, message, ...(rule ? { rule } : {}) });
const brokerFail = (e) => fail('BROKER_ERROR', `the broker said: ${e instanceof BrokerError ? `${e.message} (HTTP ${e.status})` : String(e?.message ?? e).slice(0, 200)}`);

export function createTrader({ alpaca, store, uni, now = () => Date.now(), mock = false, settleMs = 1200 }) {
  const assets = new Map(); // symbol -> {at, asset}
  async function asset(sym) {
    const c = assets.get(sym);
    if (c && now() - c.at < 86_400_000) return c.asset;
    const a = await alpaca.asset(sym).catch(() => null); // not found or failed: no information, the broker decides
    if (a) assets.set(sym, { at: now(), asset: a });
    return a;
  }

  /** Account, positions (by symbol) and the day's start and halt, kept current. */
  async function book() {
    const [acct, positions] = await Promise.all([alpaca.account(), alpaca.positions()]);
    const equity = Number(acct.equity), cash = Number(acct.cash);
    const today = nyDate(now());
    const st = store.state;
    if (st.dayStart?.date !== today) store.save({ dayStart: { date: today, equity } });
    const dayStart = store.state.dayStart.equity;
    if (store.state.haltedOn !== today && equity <= dayStart * (1 - LIMITS.dailyLossPct)) {
      store.save({ haltedOn: today });
      store.record('halt', { equity, day_start: dayStart, why: `equity ${((equity / dayStart - 1) * 100).toFixed(2)}% since the day's start` });
    }
    const pos = {};
    for (const p of positions) {
      pos[p.symbol] = { symbol: p.symbol, qty: Number(p.qty), avg: Number(p.avg_entry_price), price: Number(p.current_price), value: Number(p.market_value), pnl: Number(p.unrealized_pl), pnlPct: Number(p.unrealized_plpc), dayPct: Number(p.change_today), crypto: p.asset_class === 'crypto' };
    }
    return { equity, cash, positions: pos, dayStart, halted: store.state.haltedOn === today, today };
  }

  async function prices(symbols) {
    const snaps = await alpaca.snapshots(symbols);
    return Object.fromEntries(symbols.map((s) => [s, snaps[s]?.price]));
  }

  /** The start of the challenge, once: equity and the benchmarks' prices. */
  async function ensureStart(b) {
    if (store.state.startedAt) return;
    const p = await prices([BENCHMARKS.stocks, BENCHMARKS.crypto]);
    if (!(p.SPY > 0) || !(p['BTC/USD'] > 0)) return;
    store.save({ startedAt: new Date(now()).toISOString(), startEquity: b.equity, bench: { SPY: p.SPY, 'BTC/USD': p['BTC/USD'] }, mock });
    store.record('start', { equity: b.equity, bench: store.state.bench, mock });
  }

  const sinceStart = (b, p) => {
    const st = store.state;
    if (!st.startedAt) return null;
    const r = (a, x) => (a > 0 && x > 0 ? x / a - 1 : null);
    return { startedAt: st.startedAt, startEquity: st.startEquity, muse: r(st.startEquity, b.equity), spy: r(st.bench.SPY, p.SPY), btc: r(st.bench['BTC/USD'], p['BTC/USD']) };
  };

  const recent = (kind, ms) => store.journal.filter((e) => e.kind === kind && now() - Date.parse(e.t) < ms);

  return {
    store, uni,
    async market(list) {
      const symbols = [...new Set(list.map((s) => normalizeSymbol(s, uni)).filter(Boolean))].slice(0, MARKET_MAX);
      const unknown = symbols.filter((s) => !uni.stocks.has(s) && !uni.crypto.has(s) && !Object.values(BENCHMARKS).includes(s));
      const known = symbols.filter((s) => !unknown.includes(s));
      if (!known.length) return fail('UNKNOWN_SYMBOL', `none of these is on the list (S&P 500 stocks, SPY, ${[...uni.crypto].join(', ')}): ${unknown.join(', ') || 'no symbols given'}`);
      try {
        const [clock, snaps, bars] = await Promise.all([alpaca.clock(), alpaca.snapshots(known), alpaca.dailyBars(known, 90)]);
        const rows = known.map((s) => {
          const q = snaps[s] ?? { price: NaN };
          return { symbol: s, crypto: isCrypto(s), price: q.price, bid: q.bid, ask: q.ask, at: q.at, ind: indicators(bars[s] ?? [], q.price, { crypto: isCrypto(s) }) };
        });
        return { ok: true, code: 'OK', clock: { stocks_open: Boolean(clock.is_open), next_open: clock.next_open, next_close: clock.next_close }, rows, unknown };
      } catch (e) { return brokerFail(e); }
    },

    async news(list, limit = 10) {
      const symbols = list.map((s) => normalizeSymbol(s, uni)).filter(Boolean).slice(0, MARKET_MAX);
      try { return { ok: true, code: 'OK', items: await alpaca.news(symbols, Math.min(50, Math.max(1, limit))) }; } catch (e) { return brokerFail(e); }
    },

    async portfolio() {
      try {
        const b = await book();
        await ensureStart(b);
        const p = await prices([BENCHMARKS.stocks, BENCHMARKS.crypto]);
        const positions = Object.values(b.positions).sort((x, y) => y.value - x.value).map((x) => ({ ...x, weight: b.equity ? x.value / b.equity : 0 }));
        return { ok: true, code: 'OK', equity: b.equity, cash: b.cash, positions, day: { start: b.dayStart, change: b.equity / b.dayStart - 1, halted: b.halted }, since: sinceStart(b, p), ordersLastHour: recent('order', 3_600_000).length, mock };
      } catch (e) { return brokerFail(e); }
    },

    /** An order from the agent: read, checked, sent; every attempt in the journal. */
    async placeOrder(raw, { session = null, test = false } = {}) {
      const [o, bad] = readOrder(raw, uni);
      const base = { symbol: o?.symbol ?? String(raw?.symbol ?? '').slice(0, 20), side: o?.side ?? String(raw?.side ?? '').slice(0, 10), qty: o?.qty ?? (o?.all ? 'all' : null), notional: o?.notional ?? null, type: o?.type ?? null, limit_price: o?.limit_price ?? null, why: o?.why ?? String(raw?.why ?? '').slice(0, 140), plan: o?.plan ?? String(raw?.plan ?? '').slice(0, 400), session, ...(test ? { test: true } : {}) };
      const refused = (r, extra = {}) => { store.record('refused', { ...base, ...extra, code: r.code, rule: r.rule ?? null, message: r.message }); return fail(r.code, r.message, r.rule); };
      if (bad) return refused(bad);
      let b, clock, price, a;
      try {
        [b, clock, a] = await Promise.all([book(), o.crypto ? null : alpaca.clock(), asset(o.symbol)]);
        await ensureStart(b);
        price = (await alpaca.snapshots([o.symbol]))[o.symbol]?.price;
      } catch (e) { return brokerFail(e); }
      let open = [];
      try { open = await alpaca.orders('open', 100); } catch { open = []; }
      const [sized, refusal] = checkOrder(o, {
        uni, equity: b.equity, cash: b.cash, price, position: b.positions[o.symbol], asset: a,
        openOrders: open.map((x) => ({ ...x, symbol: x.symbol })), marketOpen: o.crypto || Boolean(clock?.is_open), nextOpen: clock?.next_open ?? null,
        ordersLastHour: recent('order', 3_600_000).length, halted: b.halted,
      });
      if (refusal) return refused(refusal, { price: price ?? null });
      const body = {
        symbol: o.symbol, side: o.side, type: o.type, time_in_force: o.crypto ? 'gtc' : 'day',
        client_order_id: `muse-${crypto.randomUUID().slice(0, 18)}`,
        ...(sized.qty !== null ? { qty: String(+sized.qty.toFixed(9)) } : { notional: sized.notional.toFixed(2) }),
        ...(o.type === 'limit' ? { limit_price: String(o.limit_price) } : {}),
      };
      let placed;
      try { placed = await alpaca.placeOrder(body); } catch (e) {
        const r = brokerFail(e);
        store.record('refused', { ...base, price, code: r.code, rule: null, message: r.message });
        return r;
      }
      store.record('order', { ...base, id: placed.id, client_order_id: body.client_order_id, qty: sized.qty ?? null, price, status: placed.status });
      if (placed.status !== 'filled' && o.type === 'market' && settleMs > 0) {
        await new Promise((ok) => setTimeout(ok, settleMs));
        placed = await alpaca.order(placed.id).catch(() => placed);
      }
      this.settle(placed);
      return { ok: true, code: 'OK', order: placed, notes: o.notes, price, cost: sized.cost };
    },

    /** An order's end in the journal (once): its fill, or its cancel/expiry/rejection. */
    settle(x) {
      if (!x?.id || store.journal.some((e) => e.id === x.id && (e.kind === 'fill' || e.kind === 'cancel'))) return;
      const mine = store.journal.find((e) => e.kind === 'order' && e.id === x.id);
      if (!mine) return;
      if (x.status === 'filled') store.record('fill', { id: x.id, symbol: mine.symbol, side: mine.side, filled_qty: Number(x.filled_qty), price: Number(x.filled_avg_price), filled_at: x.filled_at ?? new Date(now()).toISOString() });
      else if (DONE.includes(x.status)) store.record('cancel', { id: x.id, symbol: mine.symbol, status: x.status, filled_qty: Number(x.filled_qty ?? 0) });
    },

    async cancelOrder(id, { why = '' } = {}) {
      const mine = store.journal.find((e) => e.kind === 'order' && e.id === id);
      if (!mine) return fail('NOT_FOUND', `no order ${String(id).slice(0, 40)} in this account's journal (see orders)`);
      try {
        await alpaca.cancelOrder(id);
        const x = await alpaca.order(id).catch(() => ({ id, status: 'canceled' }));
        if (x.status === 'filled') this.settle(x);
        else { store.record('cancel', { id, symbol: mine.symbol, status: 'canceled', why: why || null, filled_qty: Number(x.filled_qty ?? 0) }); }
        return { ok: true, code: 'OK', id, status: x.status === 'filled' ? 'filled' : 'canceled' };
      } catch (e) { return e instanceof BrokerError && e.status === 422 ? fail('NOT_OPEN', `order ${id} cannot be canceled: ${e.message}`) : brokerFail(e); }
    },

    hold({ why, plan, symbols = [] }, { session = null } = {}) {
      return store.record('hold', { why, plan, symbols: symbols.slice(0, MARKET_MAX), session });
    },

    /** The record keeping, every TICK_MS: fills and cancels, equity and the benchmarks, outcomes, daily summaries. */
    async tick() {
      const b = await book();
      await ensureStart(b);
      // open orders of ours: settled from the broker
      const ended = new Set(store.journal.filter((e) => e.kind === 'fill' || e.kind === 'cancel').map((e) => e.id));
      for (const e of store.journal.filter((x) => x.kind === 'order' && !ended.has(x.id)).slice(-50)) {
        const x = await alpaca.order(e.id).catch(() => null);
        if (x && !OPEN.includes(x.status)) this.settle(x);
      }
      const last = store.equity.at(-1);
      if (!last || now() - Date.parse(last.t) >= EQUITY_EVERY_MS) {
        const p = await prices([BENCHMARKS.stocks, BENCHMARKS.crypto]);
        store.equityPoint({ equity: Number(b.equity.toFixed(2)), cash: Number(b.cash.toFixed(2)), spy: p.SPY ?? null, btc: p['BTC/USD'] ?? null });
      }
      const due = dueOutcomes(store.journal, now());
      if (due.length) {
        const p = await prices([...new Set(due.map((d) => d.fill.symbol))]);
        for (const d of due) if (p[d.fill.symbol] > 0) store.record('outcome', { id: d.fill.id, symbol: d.fill.symbol, side: d.fill.side, horizon: d.horizon, fill_price: d.fill.price, ...outcomeOf(d.fill, p[d.fill.symbol]) });
      }
      const done = new Set(store.summaries.map((s) => s.date));
      const days = [...new Set(store.equity.map((e) => nyDate(Date.parse(e.t))))].filter((d) => d < b.today && !done.has(d));
      for (const d of days.slice(-7)) store.summary(daySummary(d, store.journal, store.equity, store.state));
      return { equity: b.equity, settled: true };
    },

    today: () => daySummary(nyDate(now()), store.journal, store.equity, store.state),
    now,
    mock,
  };
}
