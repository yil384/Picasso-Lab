// The risk layer and order validation: readOrder (tolerant reading, BAD_ARGS) and checkOrder (every limit).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readOrder, checkOrder, LIMITS, WHY_MAX } from '../src/risk.js';
import { loadUniverse, normalizeSymbol } from '../src/universe.js';
import { ROOT } from '../src/config.js';

const uni = loadUniverse(path.join(ROOT, 'data'));
const W = { why: 'Momentum above the 50-day average', plan: 'Sell below the 20-day average or at +10%' };
const read = (o) => readOrder({ ...W, ...o }, uni);
const ctx = (o = {}) => ({ uni, equity: 100_000, cash: 100_000, price: 100, position: null, openOrders: [], asset: { tradable: true, fractionable: true }, marketOpen: true, ordersLastHour: 0, halted: false, ...o });
const check = (order, c) => { const [o, bad] = read(order); assert.equal(bad, null); return checkOrder(o, ctx(c)); };

test('the lists: 500-odd S&P 500 stocks and ten crypto pairs', () => {
  assert.ok(uni.stocks.size > 490 && uni.stocks.size < 510, `${uni.stocks.size}`);
  assert.equal(uni.crypto.size, 10);
  for (const s of ['AAPL', 'MSFT', 'BRK.B']) assert.ok(uni.stocks.has(s), s);
  assert.ok(uni.crypto.has('BTC/USD'));
  assert.ok(!uni.stocks.has('SPY'));
});

test('symbols are read in the forms agents write', () => {
  assert.equal(normalizeSymbol('$aapl', uni), 'AAPL');
  assert.equal(normalizeSymbol('brk-b', uni), 'BRK.B');
  assert.equal(normalizeSymbol('BTCUSD', uni), 'BTC/USD');
  assert.equal(normalizeSymbol('btc-usd', uni), 'BTC/USD');
  assert.equal(normalizeSymbol('eth', uni), 'ETH/USD');
  assert.equal(normalizeSymbol('BTC/USD', uni), 'BTC/USD');
});

test('readOrder: tolerant reading', () => {
  const [o] = read({ symbol: 'aapl', side: 'BUY', qty: '3', type: 'mkt' });
  assert.deepEqual([o.symbol, o.side, o.qty, o.type, o.crypto], ['AAPL', 'buy', 3, 'market', false]);
  const [n] = read({ symbol: 'btcusd', side: 'buy', notional: '$1,250.50' });
  assert.deepEqual([n.symbol, n.notional, n.crypto], ['BTC/USD', 1250.5, true]);
  const [l] = read({ symbol: 'MSFT', side: 'buy', qty: 2, limit_price: '410.5' });
  assert.equal(l.type, 'limit');
  assert.equal(l.limit_price, 410.5);
  const [all] = read({ symbol: 'MSFT', side: 'sell', qty: 'all' });
  assert.equal(all.all, true);
});

test('readOrder: why and plan are required and cut to their limits', () => {
  for (const o of [{ why: '' }, { plan: '' }, { why: '   ' }]) {
    const [, bad] = read({ symbol: 'AAPL', side: 'buy', qty: 1, ...o });
    assert.equal(bad.code, 'BAD_ARGS');
    assert.match(bad.message, /why and plan are required/);
  }
  const [o] = read({ symbol: 'AAPL', side: 'buy', qty: 1, why: 'x'.repeat(300) });
  assert.equal(o.why.length, WHY_MAX);
  assert.ok(o.notes.some((s) => s.includes('why cut')));
});

test('readOrder: refusals for bad orders', () => {
  const code = (o) => read(o)[1];
  assert.equal(code({ symbol: 'AAPL', side: 'buy' }).code, 'BAD_ARGS'); // no size
  assert.equal(code({ symbol: 'AAPL', side: 'buy', qty: 1, notional: 100 }).code, 'BAD_ARGS'); // both
  assert.equal(code({ symbol: 'AAPL', side: 'buy', qty: -1 }).code, 'BAD_ARGS');
  assert.equal(code({ symbol: 'AAPL', side: 'buy', qty: 1, type: 'stop' }).code, 'BAD_ARGS');
  assert.equal(code({ symbol: 'AAPL', side: 'buy', notional: 100, type: 'limit', limit_price: 99 }).code, 'BAD_ARGS');
  assert.equal(code({ symbol: 'AAPL', side: 'buy', qty: 1.5, type: 'limit', limit_price: 99 }).code, 'BAD_ARGS');
  assert.equal(code({ symbol: 'AAPL', side: 'buy', qty: 'all' }).code, 'BAD_ARGS');
  const short = code({ symbol: 'AAPL', side: 'short', qty: 1 });
  assert.deepEqual([short.code, short.rule], ['RISK_LIMIT', 'no_shorting']);
  assert.equal(code({ symbol: 'AAPL261218C00250000', side: 'buy', qty: 1 }).code, 'UNKNOWN_SYMBOL');
});

test('checkOrder: symbols off the list, the benchmark, market hours', () => {
  assert.equal(check({ symbol: 'GME', side: 'buy', qty: 1 })[1].code, 'UNKNOWN_SYMBOL');
  const spy = check({ symbol: 'SPY', side: 'buy', qty: 1 })[1];
  assert.equal(spy.code, 'UNKNOWN_SYMBOL');
  assert.match(spy.message, /benchmark/);
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 1 }, { marketOpen: false, nextOpen: 'Mon 9:30' })[1].code, 'MARKET_CLOSED');
  assert.equal(check({ symbol: 'BTC/USD', side: 'buy', qty: 0.01 }, { marketOpen: false })[1], null); // crypto any time
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 1 }, { asset: { tradable: false } })[1].code, 'NOT_TRADABLE');
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 1 }, { price: NaN })[1].code, 'NO_PRICE');
});

test('checkOrder: at most 20% of equity per symbol, open buys counted', () => {
  assert.equal(check({ symbol: 'AAPL', side: 'buy', notional: 19_000 })[1], null);
  const r = check({ symbol: 'AAPL', side: 'buy', notional: 21_000 })[1];
  assert.deepEqual([r.code, r.rule], ['RISK_LIMIT', 'position_cap']);
  // already 15k held: 6k more is too much
  assert.equal(check({ symbol: 'AAPL', side: 'buy', notional: 6_000 }, { position: { qty: 150, value: 15_000 } })[1].rule, 'position_cap');
  // an open buy of 10k plus 11k now
  assert.equal(check({ symbol: 'AAPL', side: 'buy', notional: 11_000 }, { openOrders: [{ symbol: 'AAPL', side: 'buy', notional: '10000' }] })[1].rule, 'position_cap');
  // the market buy's cost includes a small buffer: 199 shares at $100 is within 20k, 200 is not
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 198 })[1], null);
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 200 })[1].rule, 'position_cap');
});

test('checkOrder: no leverage, buys paid from cash', () => {
  const r = check({ symbol: 'AAPL', side: 'buy', notional: 5_000 }, { cash: 4_000 })[1];
  assert.deepEqual([r.code, r.rule], ['RISK_LIMIT', 'no_leverage']);
  // cash held by open buy orders does not count
  assert.equal(check({ symbol: 'MSFT', side: 'buy', notional: 5_000 }, { cash: 8_000, openOrders: [{ symbol: 'AAPL', side: 'buy', qty: '40', limit_price: '100' }] })[1].rule, 'no_leverage');
});

test('checkOrder: no shorting, sells only what is held', () => {
  assert.equal(check({ symbol: 'AAPL', side: 'sell', qty: 1 })[1].rule, 'no_shorting');
  assert.equal(check({ symbol: 'AAPL', side: 'sell', qty: 11 }, { position: { qty: 10, value: 1000 } })[1].rule, 'no_shorting');
  assert.equal(check({ symbol: 'AAPL', side: 'sell', notional: 2_000 }, { position: { qty: 10, value: 1000 } })[1].rule, 'no_shorting');
  assert.equal(check({ symbol: 'AAPL', side: 'sell', qty: 6 }, { position: { qty: 10 }, openOrders: [{ symbol: 'AAPL', side: 'sell', qty: '5' }] })[1].rule, 'no_shorting');
  const [ok] = check({ symbol: 'AAPL', side: 'sell', qty: 'all' }, { position: { qty: 10, value: 1000 } });
  assert.equal(ok.qty, 10);
});

test('checkOrder: 10 orders an hour', () => {
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 1 }, { ordersLastHour: LIMITS.ordersPerHour - 1 })[1], null);
  const r = check({ symbol: 'AAPL', side: 'buy', qty: 1 }, { ordersLastHour: LIMITS.ordersPerHour })[1];
  assert.deepEqual([r.code, r.rule], ['RISK_LIMIT', 'order_rate']);
});

test('checkOrder: the daily loss halt stops buys, not sells', () => {
  const r = check({ symbol: 'AAPL', side: 'buy', qty: 1 }, { halted: true })[1];
  assert.deepEqual([r.code, r.rule], ['RISK_LIMIT', 'daily_loss_halt']);
  assert.equal(check({ symbol: 'AAPL', side: 'sell', qty: 1 }, { halted: true, position: { qty: 5, value: 500 } })[1], null);
});

test('checkOrder: limit price band and whole shares', () => {
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 1, type: 'limit', limit_price: 120 })[1].rule, 'limit_band');
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 1, type: 'limit', limit_price: 95 })[1], null);
  assert.equal(check({ symbol: 'AAPL', side: 'buy', qty: 0.5 }, { asset: { tradable: true, fractionable: false } })[1].code, 'BAD_ARGS');
});
