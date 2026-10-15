// scripts/demo.mjs - a made-up record on the mock broker, for looking at the trading floor before there are paper keys:
// three weeks of scripted decisions (DEMO words, not the agent's) go through the real desk, risk layer and journal on
// a simulated clock, then the server runs on the real clock with that record. Nothing here touches Alpaca.
//   node scripts/demo.mjs                     serve on PORT (default 8790) until Ctrl-C
//   node scripts/demo.mjs --still out.png     also take the desktop still (and out-phone.png) with headless Chrome, then stop
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { start } from '../src/index.js';
import { createMockAlpaca } from '../src/mock-alpaca.js';

const DAY = 86_400_000;
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const still = process.argv.includes('--still') ? path.resolve(process.argv[process.argv.indexOf('--still') + 1]) : null;

const real = Date.now();
const base0 = real - 21 * DAY;
let t = base0, live = false;
const now = () => (live ? Date.now() : t);
const mock = createMockAlpaca({ now });
const mockUrl = await mock.listen(0);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-trader-demo-'));
const [app, err] = await start({ ALPACA_BASE_URL: mockUrl, DATA_DIR: dir, PORT: process.env.PORT ?? (still ? '0' : '8790'), WEB_HOST: '127.0.0.1' }, { now, tick: false, settleMs: 0 });
if (err) { console.error(err); process.exit(2); }

/** The first weekday at or after day `n` of the record, at hh:mm New York (UTC-4 in October). */
function at(n, hhmm = '11:00') {
  const d = new Date(base0 + n * DAY);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  const [h, m] = hhmm.split(':').map(Number);
  d.setUTCHours(h + 4, m, 0, 0);
  return d.getTime();
}
/** Run the clock forward to `to`, a tick (fills, equity point, outcomes, summaries) every 2 hours. */
async function until(to) {
  while (t + 2 * 3_600_000 < to) { t += 2 * 3_600_000; await app.trader.tick(); }
  t = to;
  await app.trader.tick();
}
const W = (why, plan) => ({ why, plan });
const steps = [
  [0, 'order', { symbol: 'NVDA', side: 'buy', notional: 15000, ...W('Above its 20- and 50-day averages with volume 1.4x normal; a core position.', 'Hold while above the 50-day average; take a third off at +12%; exit on a close below the 50-day.') }],
  [0, 'order', { symbol: 'BTC/USD', side: 'buy', notional: 10000, ...W('Half a position in the crypto benchmark itself, so the crypto sleeve tracks BTC before taking views.', 'Add the second half on a pullback to the 20-day average; no other coin until BTC is held.') }],
  [0, 'order', { symbol: 'JPM', side: 'buy', notional: 12000, ...W('Banks lag the index this month; JPM has the lowest volatility of the large banks.', 'A two-week trade: sell if it has not beaten SPY by then.') }],
  [2, 'hold', W('Nothing new: the three positions are a day old and the market moved less than 0.5%.', 'Check again at the next round; no buys while NVDA is above 15% of equity.')],
  [3, 'order', { symbol: 'AAPL', side: 'buy', notional: 10000, ...W('Pulled back to its 50-day average on normal volume; buying the dip in a quality name.', 'Stop at -6% from entry; target the prior high, about +8%.') }],
  [3, 'order', { symbol: 'NVDA', side: 'buy', notional: 9000, ...W('Adding to the winner after a strong week.', 'Keep it as the largest position.') }],
  [5, 'order', { symbol: 'NVDA', side: 'sell', qty: 30, ...W('Up about 9% in a week and near the 20% cap: taking part of the gain.', 'Keep the rest; buy back on a pullback to the 20-day average.') }],
  [7, 'order', { symbol: 'ETH/USD', side: 'buy', notional: 6000, ...W('ETH 20-day return trails BTC by 6 points with lower volume; a small mean-reversion bet.', 'Sell if it trails BTC by 10 points; no more than 6% of equity in it.') }],
  [10, 'order', { symbol: 'JPM', side: 'sell', qty: 'all', ...W('Two weeks up, and it did not beat SPY as planned: closing it.', 'Money stays in cash until a better setup.') }],
  [12, 'order', { symbol: 'XOM', side: 'buy', notional: 8000, ...W('Energy is the only sector with a positive 20-day return while the index fell.', 'Small, a hedge for the tech weight; sell if it closes below the 20-day average twice.') }],
  [14, 'hold', W('Equity is ahead of SPY by about a point; nothing on the list beats holding what is held.', 'Next round: check whether AAPL holds its 50-day average.')],
];
for (const [day, kind, args] of steps) {
  await until(Math.max(t, at(day)));
  if (kind === 'hold') app.trader.hold(args);
  else {
    const r = await app.trader.placeOrder(args);
    console.log(`${new Date(t).toISOString().slice(0, 16)} ${args.side} ${args.symbol}: ${r.code}${r.rule ? ` ${r.rule}` : ''}`);
  }
}
// the latest decision: 40 minutes ago, a crypto buy (crypto trades any time)
await until(real - 40 * 60_000);
const last = await app.trader.placeOrder({ symbol: 'SOL/USD', side: 'buy', notional: 4000, ...W('SOL is up 7% over 5 days on volume twice its average while BTC is flat: a small momentum position.', 'Cut at -8% or on a close below the 20-day average; take half off at +15%. At most 5% of equity in SOL.') });
console.log(`latest: SOL/USD ${last.code}`);
live = true;
await app.trader.tick();
app.floor.forget();
console.log(`demo record in ${dir}; trading floor: ${app.url}/live, public page: ${app.url}/`);

if (still) {
  // a profile of its own: without one, headless Chrome hands the job to an open Chrome and never returns
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-trader-chrome-'));
  // (async: the server runs in this process and must answer Chrome meanwhile)
  const shot = (url, file, size) => promisify(execFile)(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${size}`, '--virtual-time-budget=4000', `--screenshot=${file}`, url], { timeout: 90_000 });
  await shot(`${app.url}/live`, still, '1600,1240');
  // the phone: the page in a 390 px frame (headless Chrome's window is never narrower than about 500 px)
  const phone = path.join(profile, 'phone.html');
  fs.writeFileSync(phone, `<!doctype html><body style="margin:0;background:#000"><iframe src="${app.url}/live" style="width:390px;height:2700px;border:0;display:block"></iframe></body>`);
  await shot(`file://${phone}`, still.replace(/\.png$/, '-phone.png'), '390,2700');
  console.log(`still: ${still}`);
  await app.close();
  await mock.close();
}
