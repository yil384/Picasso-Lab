// src/universe.js - what may be traded: the S&P 500 constituents (data/sp500.txt) and the crypto pairs in
// data/crypto.txt, read at start. normalizeSymbol() reads the forms an agent writes ("$aapl", "brk-b", "BTCUSD",
// "btc-usd", "BTC") as Alpaca's ("AAPL", "BRK.B", "BTC/USD").
import fs from 'node:fs';
import path from 'node:path';

/** The benchmarks: buy-and-hold of SPY for stocks, of BTC for crypto. Readable in market, not tradable. */
export const BENCHMARKS = { stocks: 'SPY', crypto: 'BTC/USD' };

const readList = (file) => fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));

/** {stocks: Set, crypto: Set} from the lists folder. */
export function loadUniverse(dir) {
  return { stocks: new Set(readList(path.join(dir, 'sp500.txt'))), crypto: new Set(readList(path.join(dir, 'crypto.txt'))) };
}

/** An option contract's symbol (OCC form: root, date, C/P, strike), e.g. AAPL261218C00250000. */
export const isOptionSymbol = (s) => /^[A-Z]{1,6}\d{6}[CP]\d{8}$/.test(String(s).replace(/\s+/g, '').toUpperCase());

/**
 * Alpaca's form of a symbol as an agent may write it, given the universe (a bare coin "BTC" is a crypto pair only when
 * the pair is listed and no stock has that ticker).
 */
export function normalizeSymbol(raw, uni) {
  let s = String(raw ?? '').trim().toUpperCase().replace(/^\$/, '').replace(/\s+/g, '');
  if (!s) return '';
  const m = /^([A-Z0-9]{2,10})[-_/]?(USD|USDT|USDC)$/.exec(s);
  if (m && uni?.crypto.has(`${m[1]}/USD`) && !uni?.stocks.has(s)) return `${m[1]}/USD`;
  if (uni?.crypto.has(`${s}/USD`) && !uni?.stocks.has(s)) return `${s}/USD`;
  if (/^[A-Z]{1,5}[-/][A-Z]$/.test(s)) s = s.replace(/[-/]/, '.');
  return s;
}

/** Is the symbol tradable here? [true, null] or [false, why not]. */
export function allowed(sym, uni) {
  if (uni.stocks.has(sym) || uni.crypto.has(sym)) return [true, null];
  if (isOptionSymbol(sym)) return [false, `${sym} looks like an option contract: options are not traded here (stocks and spot crypto only)`];
  if (Object.values(BENCHMARKS).includes(sym)) return [false, `${sym} is the benchmark (buy-and-hold) this account is measured against: it cannot be traded`];
  return [false, `${sym} is not on the list: S&P 500 stocks (${uni.stocks.size}) and ${[...uni.crypto].join(', ')}`];
}
