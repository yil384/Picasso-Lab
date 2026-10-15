// src/risk.js - the rules every order goes through before it reaches the broker. The agent cannot switch them off:
// no tool changes them, and they live here, not in the prompt. readOrder() reads an order as an agent writes it
// (tolerant: "BUY", "$aapl", "BTCUSD", qty "10", notional "$1,000", type "mkt"), or refuses it with BAD_ARGS;
// checkOrder() applies the limits to it. Both return a typed refusal: {code, rule?, message} with clear words.
import { normalizeSymbol, allowed, isOptionSymbol } from './universe.js';
import { money } from './indicators.js';

export const WHY_MAX = 140;
export const PLAN_MAX = 400;
export const LIMITS = Object.freeze({
  positionMaxPct: 0.20, // of equity, per symbol, counting open buy orders
  ordersPerHour: 10, // orders sent to the broker in any 60 minutes (refused ones do not count)
  dailyLossPct: 0.02, // equity down this much from the day's start: no new buys until the next day (New York time)
  limitBandPct: 0.10, // a limit price at most this far from the last price
  minNotional: 1, // dollars
  marketBuffer: 0.005, // a market buy's cost is estimated at the last price plus this
});

/** The rules in words (the rules tool, the pages). */
export const RULES_TEXT = [
  'Paper money only: Alpaca paper account, real market data. Nothing here is investment advice.',
  'Long only: buy, then sell what you hold. No shorting, no options, no leverage (buys are paid from cash, never margin).',
  `At most ${LIMITS.positionMaxPct * 100}% of equity in any one symbol (open buy orders count).`,
  `At most ${LIMITS.ordersPerHour} orders in any 60 minutes.`,
  `When equity is ${LIMITS.dailyLossPct * 100}% below the day's start, new buys stop until the next day (New York time); sells still work.`,
  'Only S&P 500 stocks and the listed crypto pairs; SPY is the stocks benchmark and is not traded.',
  'Stocks trade in market hours only (9:30-16:00 New York, trading days); crypto any time.',
  'Orders: market or limit; qty (shares or coins) or notional (dollars, market orders only); stock limit orders in whole shares.',
  `Every order needs why (<= ${WHY_MAX} chars) and plan (<= ${PLAN_MAX} chars). Both are public, on the trading floor and in the order log.`,
];

const refuse = (code, message, rule) => ({ code, message, ...(rule ? { rule } : {}) });
const num = (v) => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  const s = v.trim().replace(/^\$/, '').replace(/,/g, '');
  return /^\d*\.?\d+$/.test(s) ? Number(s) : NaN;
};
const text = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/**
 * An order as an agent wrote it, read: [order, null] or [null, refusal]. order: {symbol, crypto, side, qty, notional,
 * all, type, limit_price, why, plan, notes} (notes: what was read differently from what was written).
 */
export function readOrder(raw, uni) {
  const notes = [];
  const a = raw ?? {};
  const symbol = normalizeSymbol(a.symbol, uni);
  if (!symbol) return [null, refuse('BAD_ARGS', 'symbol is missing (e.g. "AAPL" or "BTC/USD")')];
  if (isOptionSymbol(symbol)) return [null, refuse('UNKNOWN_SYMBOL', `${symbol} looks like an option contract: options are not traded here (stocks and spot crypto only)`)];
  if (symbol !== String(a.symbol).trim()) notes.push(`symbol read as ${symbol}`);
  const sideRaw = String(a.side ?? '').trim().toLowerCase();
  const side = ['buy', 'long', 'b'].includes(sideRaw) ? 'buy' : ['sell', 'close', 'exit', 's'].includes(sideRaw) ? 'sell' : sideRaw;
  if (['short', 'sell_short', 'sellshort', 'sell short'].includes(side)) return [null, refuse('RISK_LIMIT', 'no shorting: this account is long only (sell only what it holds)', 'no_shorting')];
  if (!['buy', 'sell'].includes(side)) return [null, refuse('BAD_ARGS', `side must be "buy" or "sell", not ${JSON.stringify(a.side ?? null)}`)];
  let typeRaw = String(a.type ?? '').trim().toLowerCase();
  if (!typeRaw) typeRaw = a.limit_price !== undefined && a.limit_price !== null && a.limit_price !== '' ? 'limit' : 'market';
  const type = ['market', 'mkt'].includes(typeRaw) ? 'market' : ['limit', 'lmt'].includes(typeRaw) ? 'limit' : null;
  if (!type) return [null, refuse('BAD_ARGS', `type must be "market" or "limit" (stop orders, options and the like are not offered), not ${JSON.stringify(a.type)}`)];
  let limit = null;
  if (type === 'limit') {
    limit = num(a.limit_price);
    if (!(limit > 0)) return [null, refuse('BAD_ARGS', 'a limit order needs limit_price, a price above 0')];
  }
  const hasQty = a.qty !== undefined && a.qty !== null && a.qty !== '';
  const hasNotional = a.notional !== undefined && a.notional !== null && a.notional !== '';
  if (hasQty === hasNotional) return [null, refuse('BAD_ARGS', 'give exactly one of qty (shares or coins) and notional (dollars)')];
  let qty = null, notional = null, all = false;
  if (hasQty) {
    if (String(a.qty).trim().toLowerCase() === 'all') {
      if (side !== 'sell') return [null, refuse('BAD_ARGS', 'qty "all" is for sells (all of a position)')];
      all = true;
    } else {
      qty = num(a.qty);
      if (!(qty > 0)) return [null, refuse('BAD_ARGS', `qty must be a number above 0 (or "all" for a sell), not ${JSON.stringify(a.qty)}`)];
    }
  } else {
    notional = num(a.notional);
    if (!(notional > 0)) return [null, refuse('BAD_ARGS', `notional must be a dollar amount above 0, not ${JSON.stringify(a.notional)}`)];
    if (notional < LIMITS.minNotional) return [null, refuse('BAD_ARGS', `notional must be at least $${LIMITS.minNotional}`)];
    if (type !== 'market') return [null, refuse('BAD_ARGS', 'notional (dollars) works with market orders only: give qty for a limit order')];
    notional = Math.floor(notional * 100) / 100;
  }
  const crypto = uni.crypto.has(symbol);
  if (!crypto && type === 'limit' && qty !== null && !Number.isInteger(qty)) return [null, refuse('BAD_ARGS', 'stock limit orders are in whole shares: round qty, or use a market order for a fraction')];
  let why = text(a.why), plan = text(a.plan);
  if (!why || !plan) return [null, refuse('BAD_ARGS', `why and plan are required on every order: why (<= ${WHY_MAX} chars), the reason for this order; plan (<= ${PLAN_MAX} chars), what you will do next and when you would sell. Both are public.`)];
  if (why.length > WHY_MAX) { why = `${why.slice(0, WHY_MAX - 3).trimEnd()}...`; notes.push(`why cut to ${WHY_MAX} chars`); }
  if (plan.length > PLAN_MAX) { plan = `${plan.slice(0, PLAN_MAX - 3).trimEnd()}...`; notes.push(`plan cut to ${PLAN_MAX} chars`); }
  return [{ symbol, crypto, side, qty, notional, all, type, limit_price: limit, why, plan, notes }, null];
}

/**
 * The limits applied to a read order: [{qty, notional, cost}, null] when it may go to the broker (qty resolved for
 * "all"), or [null, refusal].
 * @param {object} o readOrder's order
 * @param {{uni, equity: number, cash: number, price: number, position?: {qty: number}, openOrders: object[],
 *   asset?: {tradable?: boolean, fractionable?: boolean}|null, marketOpen: boolean, nextOpen?: string|null,
 *   ordersLastHour: number, halted: boolean}} c
 */
export function checkOrder(o, c) {
  const [ok, why] = allowed(o.symbol, c.uni);
  if (!ok) return [null, refuse('UNKNOWN_SYMBOL', why)];
  if (c.asset && c.asset.tradable === false) return [null, refuse('NOT_TRADABLE', `${o.symbol} is not tradable at the broker right now`)];
  if (!o.crypto && !c.marketOpen) return [null, refuse('MARKET_CLOSED', `the stock market is closed${c.nextOpen ? `; it opens ${c.nextOpen}` : ''}. Crypto trades any time.`)];
  if (!(c.price > 0)) return [null, refuse('NO_PRICE', `no current price for ${o.symbol}; try again in a minute`)];
  if (c.ordersLastHour >= LIMITS.ordersPerHour) return [null, refuse('RISK_LIMIT', `at most ${LIMITS.ordersPerHour} orders in any 60 minutes, and ${c.ordersLastHour} were sent in the last 60`, 'order_rate')];
  if (o.type === 'limit' && Math.abs(o.limit_price / c.price - 1) > LIMITS.limitBandPct) {
    return [null, refuse('RISK_LIMIT', `limit_price ${money(o.limit_price)} is more than ${LIMITS.limitBandPct * 100}% from the last price ${money(c.price)}`, 'limit_band')];
  }
  const fractional = (q) => q !== null && !Number.isInteger(q);
  if (!o.crypto && c.asset?.fractionable === false && (o.notional !== null || fractional(o.qty))) {
    return [null, refuse('BAD_ARGS', `${o.symbol} trades in whole shares only: give a whole qty`)];
  }
  const open = c.openOrders ?? [];
  const pendingCost = (list) => list.reduce((s, x) => s + (Number(x.notional) || Number(x.qty) * (Number(x.limit_price) || c.price)), 0);
  if (o.side === 'sell') {
    const held = Number(c.position?.qty ?? 0);
    const selling = open.filter((x) => x.side === 'sell' && x.symbol === o.symbol).reduce((s, x) => s + (Number(x.qty) || Number(x.notional) / c.price || 0), 0);
    const free = Math.max(0, held - selling);
    if (!(free > 0)) return [null, refuse('RISK_LIMIT', `no shorting: ${o.symbol} is not held${selling ? ' (or all of it is in open sell orders)' : ''}, so there is nothing to sell`, 'no_shorting')];
    const qty = o.all ? free : o.qty;
    if (qty !== null && qty > free + 1e-9) return [null, refuse('RISK_LIMIT', `no shorting: sell at most ${+free.toFixed(9)} ${o.symbol} (held${selling ? ', minus open sell orders' : ''})`, 'no_shorting')];
    if (o.notional !== null && o.notional > free * c.price * 1.001) return [null, refuse('RISK_LIMIT', `no shorting: ${o.symbol} held is worth about ${money(free * c.price)}, less than ${money(o.notional)}`, 'no_shorting')];
    return [{ qty, notional: o.notional, cost: 0 }, null];
  }
  if (c.halted) return [null, refuse('RISK_LIMIT', `new buys are stopped for today: equity fell ${LIMITS.dailyLossPct * 100}% below the day's start. Sells still work; buys open again tomorrow (New York time).`, 'daily_loss_halt')];
  const cost = o.notional ?? o.qty * (o.limit_price ?? c.price * (1 + LIMITS.marketBuffer));
  const buys = open.filter((x) => x.side === 'buy');
  const free = c.cash - pendingCost(buys);
  if (cost > free + 0.005) return [null, refuse('RISK_LIMIT', `no leverage: this buy costs about ${money(cost)} and the cash not held by open buy orders is ${money(Math.max(0, free))}`, 'no_leverage')];
  const room = LIMITS.positionMaxPct * c.equity - Number(c.position?.value ?? 0) - pendingCost(buys.filter((x) => x.symbol === o.symbol));
  if (cost > room + 0.005) {
    return [null, refuse('RISK_LIMIT', `at most ${LIMITS.positionMaxPct * 100}% of equity (${money(LIMITS.positionMaxPct * c.equity)}) in one symbol: room left in ${o.symbol} is ${money(Math.max(0, room))}, this buy is about ${money(cost)}`, 'position_cap')];
  }
  return [{ qty: o.qty, notional: o.notional, cost }, null];
}
