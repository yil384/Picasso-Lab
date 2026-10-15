// src/indicators.js - a few plain, honest numbers from daily bars: past returns, moving averages, volatility and
// volume. They describe the past; none of them predicts anything, and the replies say so.

const pct = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0 ? a / b - 1 : null);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * @param {{c: number, v: number}[]} bars daily bars, oldest first (the last may be today's, still forming)
 * @param {number} price the latest price
 * @param {{crypto?: boolean}} [o]
 */
export function indicators(bars, price, { crypto = false } = {}) {
  const closes = bars.map((b) => b.c).filter(Number.isFinite);
  const n = closes.length;
  const back = (k) => (n > k ? closes[n - 1 - k] : null);
  const sma = (k) => (n >= k ? mean(closes.slice(n - k)) : null);
  const logRets = [];
  for (let i = Math.max(1, n - 20); i < n; i++) logRets.push(Math.log(closes[i] / closes[i - 1]));
  let vol = null;
  if (logRets.length >= 10) {
    const m = mean(logRets);
    vol = Math.sqrt(logRets.reduce((a, r) => a + (r - m) ** 2, 0) / (logRets.length - 1)) * Math.sqrt(crypto ? 365 : 252);
  }
  const vols = bars.map((b) => b.v).filter(Number.isFinite);
  const avgVol = vols.length > 1 ? mean(vols.slice(-21, -1)) : null;
  const sma20 = sma(20), sma50 = sma(50);
  return {
    ret_1d: pct(price, back(1)),
    ret_5d: pct(price, back(5)),
    ret_20d: pct(price, back(20)),
    sma20, sma50,
    vs_sma20: pct(price, sma20),
    vs_sma50: pct(price, sma50),
    volatility_20d_annual: vol,
    volume_avg_20d: avgVol,
    volume_vs_avg: avgVol ? vols.at(-1) / avgVol : null,
    bars: n,
  };
}

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : x.toFixed(d));
const p = (x) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/a' : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`);
export const money = (x) => (!Number.isFinite(x) ? 'n/a' : Math.abs(x) >= 1 ? `$${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${x.toPrecision(4)}`);
export const signedPct = p;

/** One line of market for a symbol. */
export function indicatorLine(sym, q, ind) {
  return `${sym} ${money(q.price)} | ret 1d ${p(ind.ret_1d)} 5d ${p(ind.ret_5d)} 20d ${p(ind.ret_20d)} | vs SMA20 ${p(ind.vs_sma20)} vs SMA50 ${p(ind.vs_sma50)} | vol20 ${ind.volatility_20d_annual === null ? 'n/a' : `${(ind.volatility_20d_annual * 100).toFixed(0)}%/yr`} | volume ${f(ind.volume_vs_avg, 1)}x 20d avg`;
}
