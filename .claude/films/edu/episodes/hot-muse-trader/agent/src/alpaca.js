// src/alpaca.js - the few Alpaca REST calls the server makes: the paper account (account, clock, assets, positions,
// orders) and market data (snapshots, daily bars, news). Stocks and crypto differ in their data URLs and symbols:
// crypto is "BTC/USD" in orders and data, "BTCUSD" in positions; symbolOf() turns both into "BTC/USD".
// Numbers come back from Alpaca as strings; the callers turn them into numbers. A failed call throws a BrokerError with
// Alpaca's own message.

export class BrokerError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const isCrypto = (sym) => /^[A-Z0-9]{2,10}\/USD$/.test(String(sym));
/** A position's or an order's symbol in our form: "BTCUSD" -> "BTC/USD" (crypto), stocks as they are. */
export const symbolOf = (sym, assetClass) => {
  const s = String(sym ?? '').toUpperCase();
  if (assetClass === 'crypto' && !s.includes('/') && s.endsWith('USD')) return `${s.slice(0, -3)}/USD`;
  return s;
};

/**
 * @param {{keyId: string, secret: string, trading: string, data: string, feed?: string}} cfg
 * @param {typeof fetch} [fetchFn]
 */
export function createAlpaca(cfg, fetchFn = fetch) {
  const headers = { 'APCA-API-KEY-ID': cfg.keyId || 'mock', 'APCA-API-SECRET-KEY': cfg.secret || 'mock', accept: 'application/json' };
  async function call(base, method, pathname, { query, body } = {}) {
    const u = new URL(pathname, `${base}/`);
    for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
    const r = await fetchFn(u, {
      method,
      headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    if (r.status === 204) return null;
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!r.ok) throw new BrokerError(r.status, String(json?.message ?? text ?? `HTTP ${r.status}`).slice(0, 300));
    return json;
  }
  const trade = (m, p, o) => call(cfg.trading, m, p, o);
  const data = (p, query) => call(cfg.data, 'GET', p, { query });
  const split = (symbols) => [symbols.filter((s) => !isCrypto(s)), symbols.filter(isCrypto)];

  return {
    account: () => trade('GET', 'v2/account'),
    clock: () => trade('GET', 'v2/clock'),
    asset: (sym) => trade('GET', `v2/assets/${encodeURIComponent(String(sym).replace('/', ''))}`),
    positions: async () => (await trade('GET', 'v2/positions')).map((p) => ({ ...p, symbol: symbolOf(p.symbol, p.asset_class) })),
    orders: (status = 'all', limit = 100) => trade('GET', 'v2/orders', { query: { status, limit, direction: 'desc', nested: 'false' } }),
    order: (id) => trade('GET', `v2/orders/${encodeURIComponent(id)}`),
    placeOrder: (o) => trade('POST', 'v2/orders', { body: o }),
    cancelOrder: (id) => trade('DELETE', `v2/orders/${encodeURIComponent(id)}`),

    /** Latest trade, quote and daily bars per symbol: {SYM: {price, bid, ask, at, prevClose, dayVolume}}. */
    async snapshots(symbols) {
      const [stocks, crypto] = split(symbols);
      const out = {};
      const take = (sym, s) => {
        if (!s) return;
        out[sym] = {
          price: Number(s.latestTrade?.p ?? s.minuteBar?.c ?? s.dailyBar?.c ?? NaN),
          bid: Number(s.latestQuote?.bp ?? NaN),
          ask: Number(s.latestQuote?.ap ?? NaN),
          at: s.latestTrade?.t ?? s.minuteBar?.t ?? null,
          prevClose: Number(s.prevDailyBar?.c ?? NaN),
          dayVolume: Number(s.dailyBar?.v ?? NaN),
        };
      };
      if (stocks.length) {
        const r = await data('v2/stocks/snapshots', { symbols: stocks.join(','), feed: cfg.feed ?? 'iex' });
        for (const sym of stocks) take(sym, r?.[sym] ?? r?.snapshots?.[sym]);
      }
      if (crypto.length) {
        const r = await data('v1beta3/crypto/us/snapshots', { symbols: crypto.join(',') });
        for (const sym of crypto) take(sym, r?.snapshots?.[sym]);
      }
      return out;
    },

    /** Daily bars of the last `days` calendar days per symbol: {SYM: [{t, o, h, l, c, v}]}, oldest first. */
    async dailyBars(symbols, days = 90) {
      const [stocks, crypto] = split(symbols);
      const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const out = {};
      const pages = async (p, query) => {
        let token = null;
        for (let i = 0; i < 10; i++) {
          const r = await data(p, { ...query, page_token: token });
          for (const [sym, bars] of Object.entries(r?.bars ?? {})) (out[sym] ??= []).push(...bars);
          token = r?.next_page_token;
          if (!token) break;
        }
      };
      if (stocks.length) await pages('v2/stocks/bars', { symbols: stocks.join(','), timeframe: '1Day', start, limit: 10000, adjustment: 'all', feed: cfg.feed ?? 'iex' });
      if (crypto.length) await pages('v1beta3/crypto/us/bars', { symbols: crypto.join(','), timeframe: '1Day', start, limit: 10000 });
      for (const sym of Object.keys(out)) out[sym] = out[sym].map((b) => ({ t: b.t, o: +b.o, h: +b.h, l: +b.l, c: +b.c, v: +b.v })).sort((a, b) => (a.t < b.t ? -1 : 1));
      return out;
    },

    /** Recent headlines (Alpaca's news API, from Benzinga): [{at, headline, source, symbols, url}]. */
    async news(symbols, limit = 10) {
      const r = await data('v1beta1/news', { symbols: symbols.length ? symbols.join(',') : undefined, limit, sort: 'desc' });
      return (r?.news ?? []).map((n) => ({ at: n.created_at, headline: n.headline, source: n.source, symbols: n.symbols ?? [], url: n.url ?? null }));
    },
  };
}
