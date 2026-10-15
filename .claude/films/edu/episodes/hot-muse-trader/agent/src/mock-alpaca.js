// src/mock-alpaca.js - a mock of the parts of Alpaca's paper API and market data API this server uses, on this
// machine: for tests, and for running the server before there are paper keys. Prices are a made-up random walk, the
// same for every run (seeded by symbol and day); the account starts with $100,000 cash and, like a real paper account,
// shows twice that as buying power (margin), so the server's own no-leverage rule is what keeps it to cash. Market
// orders fill at once at the current price; limit orders when the price reaches them. Nothing here is real data.
import http from 'node:http';
import crypto from 'node:crypto';

const DAY = 86_400_000;
const EPOCH = Date.UTC(2026, 0, 1);
// rough price levels the walk passes through on ANCHOR (2026-10-01), so the made-up prices look about right
const ANCHOR = 273;
const BASE = { SPY: 660, 'BTC/USD': 115000, 'ETH/USD': 4200, 'SOL/USD': 210, 'XRP/USD': 2.8, 'DOGE/USD': 0.25, AAPL: 250, MSFT: 510, NVDA: 185, AMZN: 225, GOOGL: 245, META: 720, TSLA: 430, JPM: 300, XOM: 115, 'BRK.B': 490 };
const NOT_FRACTIONABLE = new Set(['NVR', 'AZO']);

/** A number in [0, 1) from a string: the same for the same string. */
function unit(s) { return crypto.createHash('sha256').update(s).digest().readUInt32BE(0) / 2 ** 32; }
/** A standard normal from two units (Box-Muller). */
const normal = (s) => Math.sqrt(-2 * Math.log(unit(`${s}:a`) + 1e-12)) * Math.cos(2 * Math.PI * unit(`${s}:b`));
const isCrypto = (s) => s.includes('/');
const nyParts = (t) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t)).map((p) => [p.type, p.value]));

export function createMockAlpaca({ now = () => Date.now(), open = 'auto', cash = 100_000 } = {}) {
  const closes = new Map(); // symbol -> [close of day 0, 1, ...] from EPOCH
  function closeOf(sym, d) {
    const list = closes.get(sym) ?? [1];
    closes.set(sym, list);
    const vol = isCrypto(sym) ? 0.022 : sym === 'SPY' ? 0.008 : 0.015;
    const drift = (unit(`${sym}:drift`) - 0.5) * 0.0008;
    while (list.length <= d) list.push(list.at(-1) * Math.exp(drift + vol * normal(`${sym}:${list.length}`)));
    while (list.length <= ANCHOR) list.push(list.at(-1) * Math.exp(drift + vol * normal(`${sym}:${list.length}`)));
    return ((BASE[sym] ?? 20 + unit(sym) * 280) * list[Math.max(0, d)]) / list[ANCHOR];
  }
  /** The price of `sym` at time t: from yesterday's close to today's through the day, with a small wiggle. */
  function priceAt(sym, t = now()) {
    const d = Math.floor((t - EPOCH) / DAY);
    const f = ((t - EPOCH) % DAY) / DAY;
    const a = closeOf(sym, d - 1), b = closeOf(sym, d);
    const p = a + (b - a) * f;
    const wiggle = 1 + 0.0015 * Math.sin(t / 97_000 + unit(sym) * 6.28);
    const raw = p * wiggle;
    return raw < 1 ? Number(raw.toFixed(6)) : Number(raw.toFixed(2));
  }
  function isOpen(t = now()) {
    if (typeof open === 'boolean') return open;
    const p = nyParts(t);
    const m = Number(p.hour) * 60 + Number(p.minute);
    return !['Sat', 'Sun'].includes(p.weekday) && m >= 570 && m < 960;
  }
  const state = { cash, startCash: cash, positions: new Map(), orders: [] };

  function fill(o, price) {
    const qty = o.qty ? Number(o.qty) : Number((Number(o.notional) / price).toFixed(9));
    const pos = state.positions.get(o.symbol) ?? { qty: 0, cost: 0 };
    if (o.side === 'buy') { pos.qty += qty; pos.cost += qty * price; state.cash -= qty * price; } else {
      const avg = pos.qty ? pos.cost / pos.qty : 0;
      pos.qty -= qty; pos.cost -= avg * qty; state.cash += qty * price;
    }
    if (pos.qty <= 1e-9) state.positions.delete(o.symbol); else state.positions.set(o.symbol, pos);
    Object.assign(o, { status: 'filled', filled_qty: String(qty), filled_avg_price: String(price), filled_at: new Date(now()).toISOString(), updated_at: new Date(now()).toISOString() });
  }
  /** Open limit orders that the price has reached, filled. */
  function work() {
    for (const o of state.orders) {
      if (!['new', 'accepted'].includes(o.status)) continue;
      const p = priceAt(o.symbol);
      if (o.type === 'market' || (o.side === 'buy' ? p <= Number(o.limit_price) : p >= Number(o.limit_price))) fill(o, o.type === 'limit' ? Number(o.limit_price) : p);
    }
  }
  function positionsOut() {
    return [...state.positions].map(([sym, p]) => {
      const price = priceAt(sym);
      const prev = closeOf(sym, Math.floor((now() - EPOCH) / DAY) - 1);
      return {
        symbol: isCrypto(sym) ? sym.replace('/', '') : sym, asset_class: isCrypto(sym) ? 'crypto' : 'us_equity', side: 'long',
        qty: String(p.qty), avg_entry_price: String(p.cost / p.qty), current_price: String(price), lastday_price: String(prev),
        market_value: String(p.qty * price), cost_basis: String(p.cost), unrealized_pl: String(p.qty * price - p.cost),
        unrealized_plpc: String((p.qty * price) / p.cost - 1), change_today: String(price / prev - 1),
      };
    });
  }
  function account() {
    work();
    const value = positionsOut().reduce((a, p) => a + Number(p.market_value), 0);
    const equity = state.cash + value;
    return { id: 'mock-account', status: 'ACTIVE', currency: 'USD', cash: String(state.cash), equity: String(equity), portfolio_value: String(equity), last_equity: String(equity), buying_power: String(2 * equity), multiplier: '2', trading_blocked: false, account_blocked: false };
  }
  function bars(sym, start) {
    const out = [];
    const d1 = Math.floor((now() - EPOCH) / DAY);
    for (let d = Math.max(0, Math.floor((Date.parse(start) - EPOCH) / DAY)); d <= d1; d++) {
      const t = EPOCH + d * DAY;
      const wd = new Date(t).getUTCDay();
      if (!isCrypto(sym) && (wd === 0 || wd === 6)) continue;
      const o = closeOf(sym, d - 1), c = d === d1 ? priceAt(sym) : closeOf(sym, d);
      const v = Math.round((isCrypto(sym) ? 900 : 4_000_000) * (0.6 + unit(`${sym}:v${d}`)));
      out.push({ t: new Date(t).toISOString(), o, h: Math.max(o, c) * 1.004, l: Math.min(o, c) * 0.996, c, v });
    }
    return out;
  }
  const snapshot = (sym) => {
    const t = now(), d = Math.floor((t - EPOCH) / DAY), p = priceAt(sym, t);
    const bs = bars(sym, new Date(t - 6 * DAY).toISOString());
    return { latestTrade: { p, t: new Date(t).toISOString() }, latestQuote: { bp: p * 0.9998, ap: p * 1.0002 }, dailyBar: bs.at(-1), prevDailyBar: bs.at(-2) ?? { c: closeOf(sym, d - 1) } };
  };

  function route(method, u, body) {
    const p = u.pathname.replace(/\/+$/, '');
    const q = u.searchParams;
    const syms = () => String(q.get('symbols') ?? '').split(',').filter(Boolean);
    if (method === 'GET' && p === '/v2/account') return [200, account()];
    if (method === 'GET' && p === '/v2/clock') {
      const t = now();
      return [200, { timestamp: new Date(t).toISOString(), is_open: isOpen(t), next_open: new Date(t + 3_600_000).toISOString(), next_close: new Date(t + 7_200_000).toISOString() }];
    }
    let m = /^\/v2\/assets\/(.+)$/.exec(p);
    if (method === 'GET' && m) {
      const sym = decodeURIComponent(m[1]).toUpperCase();
      if (!/^[A-Z.]{1,6}$|^[A-Z]{2,10}\/USD$/.test(sym)) return [404, { message: 'asset not found' }];
      return [200, { symbol: sym, class: isCrypto(sym) ? 'crypto' : 'us_equity', status: 'active', tradable: true, fractionable: !NOT_FRACTIONABLE.has(sym), shortable: false }];
    }
    if (method === 'GET' && p === '/v2/positions') { work(); return [200, positionsOut()]; }
    if (method === 'GET' && p === '/v2/orders') {
      work();
      const st = q.get('status') ?? 'open';
      const openish = (o) => ['new', 'accepted', 'partially_filled'].includes(o.status);
      const list = state.orders.filter((o) => st === 'all' || (st === 'open' ? openish(o) : !openish(o))).slice().reverse();
      return [200, list.slice(0, Number(q.get('limit') ?? 50))];
    }
    m = /^\/v2\/orders\/([^/]+)$/.exec(p);
    if (m) {
      work();
      const o = state.orders.find((x) => x.id === m[1]);
      if (!o) return [404, { message: 'order not found' }];
      if (method === 'GET') return [200, o];
      if (method === 'DELETE') {
        if (!['new', 'accepted'].includes(o.status)) return [422, { message: `order is already in "${o.status}" state` }];
        Object.assign(o, { status: 'canceled', canceled_at: new Date(now()).toISOString() });
        return [204, null];
      }
    }
    if (method === 'POST' && p === '/v2/orders') {
      const b = body ?? {};
      const sym = String(b.symbol ?? '').toUpperCase();
      const price = priceAt(sym);
      const qty = b.qty ? Number(b.qty) : null;
      const cost = qty ? qty * (b.type === 'limit' ? Number(b.limit_price) : price) : Number(b.notional);
      if (!(cost > 0)) return [422, { message: 'qty or notional is required' }];
      if (b.side === 'buy' && isCrypto(sym) && cost > state.cash) return [403, { message: 'insufficient balance for USD' }];
      if (b.side === 'buy' && cost > 2 * Number(account().equity)) return [403, { message: 'insufficient buying power' }];
      const held = state.positions.get(sym)?.qty ?? 0;
      if (b.side === 'sell' && (qty ?? cost / price) > held + 1e-9) return [403, { message: 'insufficient qty available for order' }];
      const t = new Date(now()).toISOString();
      const o = { id: crypto.randomUUID(), client_order_id: b.client_order_id ?? crypto.randomUUID(), symbol: sym, asset_class: isCrypto(sym) ? 'crypto' : 'us_equity', side: b.side, type: b.type, time_in_force: b.time_in_force, qty: b.qty ?? null, notional: b.notional ?? null, limit_price: b.limit_price ?? null, status: 'accepted', filled_qty: '0', filled_avg_price: null, submitted_at: t, created_at: t, updated_at: t, filled_at: null };
      state.orders.push(o);
      work();
      return [200, o];
    }
    if (method === 'GET' && p === '/v2/stocks/snapshots') return [200, Object.fromEntries(syms().map((s) => [s, snapshot(s)]))];
    if (method === 'GET' && p === '/v1beta3/crypto/us/snapshots') return [200, { snapshots: Object.fromEntries(syms().map((s) => [s, snapshot(s)])) }];
    if (method === 'GET' && (p === '/v2/stocks/bars' || p === '/v1beta3/crypto/us/bars')) {
      return [200, { bars: Object.fromEntries(syms().map((s) => [s, bars(s, q.get('start') ?? new Date(now() - 30 * DAY).toISOString())])), next_page_token: null }];
    }
    if (method === 'GET' && p === '/v1beta1/news') {
      const list = (syms().length ? syms() : ['SPY', 'BTC/USD']).slice(0, 5);
      const n = Math.min(Number(q.get('limit') ?? 10), list.length * 2);
      return [200, { news: Array.from({ length: n }, (_, i) => ({ id: i + 1, created_at: new Date(now() - (i + 1) * 3_600_000).toISOString(), headline: `Mock headline ${i + 1} about ${list[i % list.length]} (not real news)`, source: 'mock', symbols: [list[i % list.length]], url: null })) }];
    }
    return [404, { message: `mock has no ${method} ${p}` }];
  }

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let body = null;
      try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }
      if (!req.headers['apca-api-key-id'] || !req.headers['apca-api-secret-key']) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"message":"unauthorized."}'); return; }
      const [status, out] = route(req.method, new URL(req.url, 'http://mock'), body);
      res.writeHead(status, { 'content-type': 'application/json' }).end(out === null ? undefined : JSON.stringify(out));
    });
  });
  return {
    priceAt, closeOf, state,
    setOpen(v) { open = v; },
    setNow(fn) { now = fn; },
    listen(port = 0) { return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(`http://127.0.0.1:${server.address().port}`))); },
    close() { return new Promise((ok) => server.close(() => ok())); },
  };
}
