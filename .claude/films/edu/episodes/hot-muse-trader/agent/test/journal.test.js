// The journal: records on disk and back, the order log (refusals included, fills and outcomes merged), CSV, outcomes
// and the daily summary.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, orderRows, toCsv, dueOutcomes, outcomeOf, daySummary, decisions, nyDate } from '../src/journal.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'trader-journal-'));

test('records survive a restart; a cut last line is skipped', () => {
  const dir = tmp();
  const s = createStore(dir);
  s.record('order', { id: 'a', symbol: 'AAPL', side: 'buy', qty: 1, why: 'w', plan: 'p' });
  s.save({ startEquity: 100_000 });
  fs.appendFileSync(path.join(dir, 'journal.jsonl'), '{"t":"2026-');
  const again = createStore(dir);
  assert.equal(again.journal.length, 1);
  assert.equal(again.state.startEquity, 100_000);
});

test('the order log: newest first, refusals in it, fills and outcomes merged', () => {
  let t = Date.parse('2026-10-14T15:00:00Z');
  const s = createStore(tmp(), { now: () => t });
  s.record('order', { id: 'o1', symbol: 'AAPL', side: 'buy', qty: 10, type: 'market', why: 'first', plan: 'p1', price: 100, status: 'accepted' });
  s.record('fill', { id: 'o1', symbol: 'AAPL', side: 'buy', filled_qty: 10, price: 100, filled_at: new Date(t).toISOString() });
  t += 60_000;
  s.record('refused', { symbol: 'AAPL', side: 'buy', notional: 50_000, why: 'too big', plan: 'p2', code: 'RISK_LIMIT', rule: 'position_cap', message: 'm' });
  t += 86_400_000;
  const due = dueOutcomes(s.journal, t);
  assert.deepEqual(due.map((d) => d.horizon), ['1d']);
  s.record('outcome', { id: 'o1', horizon: '1d', ...outcomeOf(due[0].fill, 110) });
  assert.equal(dueOutcomes(s.journal, t).length, 0);
  const rows = orderRows(s.journal);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, 'refused');
  assert.equal(rows[0].code, 'RISK_LIMIT:position_cap');
  assert.equal(rows[1].status, 'filled');
  assert.equal(rows[1].fill_price, 100);
  assert.equal(rows[1].outcome_1d_pct, 0.1);
  assert.equal(rows[1].outcome_1d_pnl, 100);
  assert.equal(decisions(s.journal).length, 2);
});

test('outcome of a sell: positive when the price fell after it', () => {
  assert.deepEqual(outcomeOf({ side: 'sell', filled_qty: 2, price: 100 }, 90), { price: 90, pct: 0.1, pnl: 20 });
  assert.deepEqual(outcomeOf({ side: 'buy', filled_qty: 2, price: 100 }, 90), { price: 90, pct: -0.1, pnl: -20 });
});

test('CSV: quoted cells, formulas defused', () => {
  const csv = toCsv([{ t: 'x', why: 'a, "b"\nc', plan: '=HYPERLINK("x")', symbol: 'AAPL', qty: -1 }]);
  const line = csv.split('\n').slice(1).join('\n');
  assert.match(line, /"a, ""b""\nc"/);
  assert.match(line, /'=HYPERLINK/);
  assert.match(line, /,-1,/);
});

test('the daily summary', () => {
  let t = Date.parse('2026-10-14T14:00:00Z');
  const s = createStore(tmp(), { now: () => t });
  s.save({ startEquity: 100_000, bench: { SPY: 600, 'BTC/USD': 100_000 } });
  s.equityPoint({ equity: 100_000, spy: 600, btc: 100_000 });
  s.record('order', { id: 'o1', symbol: 'AAPL', side: 'buy', qty: 1, why: 'w', plan: 'p' });
  s.record('hold', { why: 'w', plan: 'p' });
  t += 5 * 3_600_000;
  s.equityPoint({ equity: 101_000, spy: 606, btc: 98_000 });
  const d = daySummary(nyDate(t), s.journal, s.equity, s.state);
  assert.equal(d.date, '2026-10-14');
  assert.equal(d.orders, 1);
  assert.equal(d.holds, 1);
  assert.ok(Math.abs(d.day_return - 0.01) < 1e-9);
  assert.ok(Math.abs(d.spy_since_start - 0.01) < 1e-9);
  assert.ok(Math.abs(d.btc_since_start + 0.02) < 1e-9);
});
