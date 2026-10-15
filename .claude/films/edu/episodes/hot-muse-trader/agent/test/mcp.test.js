// The MCP tools' contracts, end to end: the real server over HTTP with the SDK's client, against the mock broker.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { start } from '../src/index.js';
import { createMockAlpaca } from '../src/mock-alpaca.js';
import { nyDate } from '../src/journal.js';

const DAY = 86_400_000;
let t = Date.parse('2026-10-14T15:00:00Z'); // a Wednesday, 11:00 in New York
const now = () => t;
const mock = createMockAlpaca({ now, open: true });
let app, owner, guest;

async function client(url) {
  const c = new Client({ name: 'contract-test', version: '1.0.0' });
  await c.connect(new StreamableHTTPClientTransport(new URL(url)));
  return c;
}
const call = async (c, name, args = {}) => {
  const r = await c.callTool({ name, arguments: args });
  return { ...r, code: r.structuredContent?.code, text: r.content?.[0]?.text ?? '' };
};
const W = { why: 'Testing the contract', plan: 'Check the reply and move on' };

test.before(async () => {
  const mockUrl = await mock.listen(0);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'trader-mcp-'));
  const [a, err] = await start({ ALPACA_BASE_URL: mockUrl, DATA_DIR: dir, PORT: '0', MCP_OWNER_KEY: 'owner-key-123' }, { now, tick: false, settleMs: 0 });
  assert.equal(err, null);
  app = a;
  owner = await client(`${app.url}/mcp?key=owner-key-123`);
  guest = await client(`${app.url}/mcp`);
});
test.after(async () => {
  await owner?.close();
  await guest?.close();
  await app?.close();
  await mock.close();
});

test('the tool list', async () => {
  const { tools } = await guest.listTools();
  assert.deepEqual(tools.map((x) => x.name).sort(), ['cancel_order', 'hold', 'journal', 'live_view', 'market', 'news', 'orders', 'place_order', 'portfolio', 'rules'].sort());
  const po = tools.find((x) => x.name === 'place_order');
  assert.ok(po.inputSchema.required.includes('why') && po.inputSchema.required.includes('plan'));
});

test('portfolio and rules: the start is recorded against SPY and BTC', async () => {
  const p = await call(owner, 'portfolio');
  assert.equal(p.code, 'OK');
  assert.equal(p.structuredContent.equity, 100_000);
  assert.ok(p.structuredContent.since.startEquity === 100_000);
  assert.match(p.text, /SPY buy-and-hold/);
  assert.match(p.text, /call live_view/); // the owner's first reading reply carries the live view's line
  const r = await call(guest, 'rules');
  assert.equal(r.code, 'OK');
  assert.match(r.text, /20% of equity/);
  assert.equal(r.structuredContent.limits.ordersPerHour, 10);
});

test('market: quotes and indicators; symbols off the list are named', async () => {
  const m = await call(guest, 'market', { symbols: 'aapl, btc, GME' });
  assert.equal(m.code, 'OK');
  assert.deepEqual(m.structuredContent.quotes.map((q) => q.symbol), ['AAPL', 'BTC/USD']);
  assert.deepEqual(m.structuredContent.unknown, ['GME']);
  assert.ok(m.structuredContent.quotes[0].ind.sma20 > 0);
  assert.match(m.text, /Stock market: OPEN/);
  assert.equal((await call(guest, 'market', { symbols: ['GME'] })).code, 'UNKNOWN_SYMBOL');
  const n = await call(guest, 'news', { symbols: ['AAPL'], limit: 2 });
  assert.equal(n.code, 'OK');
  assert.equal(n.structuredContent.items.length, 2);
});

test('place_order: only with the owner\'s key', async () => {
  const r = await call(guest, 'place_order', { symbol: 'AAPL', side: 'buy', qty: 1, ...W });
  assert.equal(r.code, 'OWNER_ONLY');
  assert.ok(r.isError);
  assert.equal((await call(guest, 'hold', W)).code, 'OWNER_ONLY');
});

test('place_order: filled, refused with typed codes, every attempt logged', async () => {
  const ok = await call(owner, 'place_order', { symbol: 'btcusd', side: 'BUY', notional: '5000', ...W });
  assert.equal(ok.code, 'OK', ok.text);
  assert.equal(ok.structuredContent.order.status, 'filled');
  assert.match(ok.text, /Read as: symbol read as BTC\/USD/);

  const cap = await call(owner, 'place_order', { symbol: 'AAPL', side: 'buy', notional: 25_000, ...W });
  assert.deepEqual([cap.code, cap.structuredContent.rule], ['RISK_LIMIT', 'position_cap']);
  assert.match(cap.text, /Nothing was sent to the broker/);

  const short = await call(owner, 'place_order', { symbol: 'MSFT', side: 'sell', qty: 1, ...W });
  assert.deepEqual([short.code, short.structuredContent.rule], ['RISK_LIMIT', 'no_shorting']);

  mock.setOpen(false);
  assert.equal((await call(owner, 'place_order', { symbol: 'AAPL', side: 'buy', qty: 1, ...W })).code, 'MARKET_CLOSED');
  mock.setOpen(true);

  assert.equal((await call(owner, 'place_order', { symbol: 'GME', side: 'buy', qty: 1, ...W })).code, 'UNKNOWN_SYMBOL');
  const noWhy = await call(owner, 'place_order', { symbol: 'AAPL', side: 'buy', qty: 1, plan: 'p' });
  assert.equal(noWhy.code, 'BAD_ARGS');
  assert.ok(noWhy.isError);

  const o = await call(owner, 'orders', { status: 'all' });
  const statuses = o.structuredContent.orders.map((x) => x.status);
  assert.ok(statuses.includes('filled') && statuses.filter((s) => s === 'refused').length >= 4, statuses.join());
  assert.equal(app.trader.store.journal.filter((e) => e.kind === 'order').length, 1);
  // every call in calls.jsonl
  const calls = fs.readFileSync(path.join(app.trader.store.dir, 'calls.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(calls.some((c) => c.tool === 'place_order' && c.code === 'RISK_LIMIT'));
});

test('cancel_order: an open limit order, and an unknown id', async () => {
  const p = (await call(owner, 'market', { symbols: ['MSFT'] })).structuredContent.quotes[0].price;
  const lim = await call(owner, 'place_order', { symbol: 'MSFT', side: 'buy', qty: 2, type: 'limit', limit_price: Math.floor(p * 0.95), ...W });
  assert.equal(lim.code, 'OK', lim.text);
  assert.equal(lim.structuredContent.order.status, 'accepted');
  assert.equal((await call(owner, 'orders', { status: 'open' })).structuredContent.orders.length, 1);
  const c = await call(owner, 'cancel_order', { id: lim.structuredContent.order.id, why: 'changed my mind' });
  assert.equal(c.code, 'OK');
  assert.equal((await call(owner, 'orders', { status: 'open' })).structuredContent.orders.length, 0);
  assert.equal((await call(owner, 'cancel_order', { id: 'nope' })).code, 'NOT_FOUND');
});

test('hold, moderation and the latest thinking', async () => {
  const h = await call(owner, 'hold', { why: 'Nothing worth it, shit market', plan: 'Look again in 30 minutes', symbols: 'AAPL MSFT' });
  assert.equal(h.code, 'OK');
  const last = app.trader.store.journal.at(-1);
  assert.equal(last.kind, 'hold');
  assert.match(last.why, /\[removed\] market/);
  app.floor.forget();
  const svg = await (await fetch(`${app.url}/floor/thinking.svg`)).text();
  assert.match(svg, /HOLD/);
  assert.match(svg, /\[removed\]/);
});

test('live_view: the page for the panel, images from this server', async () => {
  const v = await call(guest, 'live_view');
  assert.equal(v.code, 'OK');
  assert.ok(v.structuredContent.html.includes(`${app.url}/floor/equity.svg`));
  assert.ok(!/fetch\(/.test(v.structuredContent.html));
  const res = await fetch(`${app.url}/floor/tape.svg?w=n`);
  assert.equal(res.headers.get('content-type'), 'image/svg+xml; charset=utf-8');
  assert.match(await res.text(), /viewBox="0 0 440 /);
  const csv = await (await fetch(`${app.url}/orders.csv`)).text();
  assert.match(csv, /^t,id,symbol,side/);
  assert.match(csv, /refused/);
});

test('journal: decisions with outcomes after a day; the daily summary; the order rate', async () => {
  await app.trader.tick();
  t += DAY + 60_000;
  await app.trader.tick();
  const outcomes = app.trader.store.journal.filter((e) => e.kind === 'outcome');
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].horizon, '1d');
  assert.ok(app.trader.store.summaries.some((s) => s.date === '2026-10-14'));
  const j = await call(owner, 'journal', { days: 3 });
  assert.equal(j.code, 'OK');
  assert.match(j.text, /outcome 1d/);
  assert.match(j.text, /Day 2026-10-14/);
  // 10 orders in an hour, then RISK_LIMIT order_rate
  for (let i = 0; i < 10; i++) assert.equal((await call(owner, 'place_order', { symbol: 'ETH/USD', side: 'buy', notional: 20, ...W })).code, 'OK');
  const r = await call(owner, 'place_order', { symbol: 'ETH/USD', side: 'buy', notional: 20, ...W });
  assert.deepEqual([r.code, r.structuredContent.rule], ['RISK_LIMIT', 'order_rate']);
});

test('the daily loss halt stops buys until the next day, sells go on', async () => {
  t += 2 * 3_600_000;
  app.trader.store.save({ dayStart: { date: nyDate(t), equity: 200_000 } });
  const b = await call(owner, 'place_order', { symbol: 'SOL/USD', side: 'buy', notional: 50, ...W });
  assert.deepEqual([b.code, b.structuredContent.rule], ['RISK_LIMIT', 'daily_loss_halt']);
  const s = await call(owner, 'place_order', { symbol: 'BTC/USD', side: 'sell', notional: 100, ...W });
  assert.equal(s.code, 'OK', s.text);
  assert.match((await call(owner, 'rules')).text, /HALTED/);
  t += DAY;
  const next = await call(owner, 'place_order', { symbol: 'SOL/USD', side: 'buy', notional: 50, ...W });
  assert.equal(next.code, 'OK', next.text);
});
