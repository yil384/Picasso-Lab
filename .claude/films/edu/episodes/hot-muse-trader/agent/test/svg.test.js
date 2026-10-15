// The trading floor's images and pages: well-formed SVG, outside words escaped, wide and narrow, the disclaimer,
// and a live page that makes no fetch (muse.ai's panel blocks it) and stays small.
import test from 'node:test';
import assert from 'node:assert/strict';
import { equitySvg, thinkingSvg, positionsSvg, tapeSvg, wrap, NARROW, WIDE } from '../src/svg.js';
import { liveViewHtml, publicPageHtml, DISCLAIMER } from '../src/page.js';

/** Tags open and close in order (no XML parser among the dependencies: a small checker). */
function wellFormed(svg) {
  const stack = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, attrs, self] = m;
    assert.ok(!/<|&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(attrs), `bad attribute text in <${name}${attrs}>`);
    if (self) continue;
    if (close) assert.equal(stack.pop(), name, `</${name}> closes the wrong tag`);
    else stack.push(name);
  }
  assert.deepEqual(stack, [], 'every tag closed');
  for (const txt of svg.split(/<[^>]*>/)) assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(txt), `unescaped & in ${txt}`);
}

const series = Array.from({ length: 50 }, (_, i) => ({ t: new Date(Date.UTC(2026, 9, 1) + i * 3_600_000 * 6).toISOString(), muse: 0.001 * i, spy: 0.0005 * i, btc: -0.0008 * i }));
const nasty = 'Buy <script>alert(1)</script> & "quotes" \'too\' - a very long reason that goes on and on to test the wrapping of the text';
const rows = [
  { t: '2026-10-14T15:00:00Z', side: 'buy', qty: 10, symbol: 'AAPL', status: 'filled', fill_price: 245.1, why: nasty, plan: nasty },
  { t: '2026-10-14T16:00:00Z', side: 'buy', notional: 30000, symbol: 'NVDA', status: 'refused', code: 'RISK_LIMIT:position_cap', why: 'too big', plan: 'p' },
  { t: '2026-10-14T17:00:00Z', side: 'sell', qty: 'all', symbol: 'BTC/USD', status: 'accepted', why: 'take profit', plan: 'p' },
];
const positions = [{ symbol: 'AAPL', qty: 10, avg: 245.1, price: 250, value: 2500, pnl: 49, pnlPct: 0.02, weight: 0.025, crypto: false }, { symbol: 'BTC/USD', qty: 0.1, avg: 100000, price: 98000, value: 9800, pnl: -200, pnlPct: -0.02, weight: 0.098, crypto: true }];

test('every image is well-formed SVG with the words escaped, wide and narrow', () => {
  for (const w of [WIDE, NARROW]) {
    const all = [
      equitySvg({ series, equity: 104_900, since: { startedAt: series[0].t, muse: 0.049, spy: 0.0245, btc: -0.0392 }, updatedAt: series.at(-1).t }, w),
      equitySvg({ series: [], equity: null, since: null, updatedAt: series[0].t }, w),
      thinkingSvg({ kind: 'order', ...rows[0] }, w), thinkingSvg({ kind: 'hold', t: rows[0].t, why: nasty, plan: nasty }, w), thinkingSvg(null, w),
      thinkingSvg({ kind: 'order', ...rows[1] }, w),
      positionsSvg({ positions, cash: 87_700, equity: 100_000 }, w), positionsSvg({ positions: [], cash: 100_000, equity: 100_000 }, w),
      tapeSvg(rows, {}, w), tapeSvg([], {}, w),
    ];
    for (const svg of all) {
      wellFormed(svg);
      assert.match(svg, new RegExp(`viewBox="0 0 ${w} \\d+"`));
      assert.ok(!svg.includes('<script'), 'the agent\'s words never become markup');
      assert.ok(!/NaN|undefined/.test(svg), `no NaN or undefined in ${svg.slice(0, 200)}`);
    }
    assert.match(all[0], /Muse/);
    assert.match(all[0], /\+4\.90%/);
    assert.match(all[8], /REFUSED position_cap/);
    assert.match(all[8], /FILLED @ \$245\.10/);
  }
});

test('wrap keeps lines short and ends a cut text with ...', () => {
  const l = wrap(nasty, 30, 2);
  assert.equal(l.length, 2);
  assert.ok(l.every((s) => s.length <= 30));
  assert.match(l[1], /\.\.\.$/);
});

test('the live view page: small, no fetch, images from our server, the disclaimer', () => {
  const html = liveViewHtml('https://trade.picasso-lab.com/');
  assert.ok(html.length < 4000, `${html.length} bytes`);
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|EventSource/.test(html));
  for (const k of ['equity', 'thinking', 'positions', 'tape']) assert.ok(html.includes(`https://trade.picasso-lab.com/floor/${k}.svg`), k);
  assert.ok(html.includes('https://trade.picasso-lab.com/assets/logo.png'));
  assert.ok(html.includes(DISCLAIMER.replace(/·/g, '·')));
  assert.match(DISCLAIMER, /PAPER MONEY · NOT INVESTMENT ADVICE · not affiliated with Meta/);
  assert.ok(!liveViewHtml('javascript:alert(1)').includes('javascript:'));
  assert.match(liveViewHtml('https://x.example/', { mock: true }), /MOCK DATA/);
});

test('the public page: the floor, the rules, the order log with downloads, escaped', () => {
  const html = publicPageHtml({ base: 'https://trade.picasso-lab.com/', rows, summaries: [{ date: '2026-10-14', equity_close: 100_500, day_return: 0.005, since_start: 0.005, spy_since_start: 0.001, btc_since_start: -0.01, orders: 2, refused: 1 }], state: { startedAt: '2026-10-13T14:00:00Z', startEquity: 100_000 }, mock: false });
  for (const s of ['orders.csv', 'orders.json', 'Rules it cannot switch off', DISCLAIMER, 'refused (RISK_LIMIT:position_cap)', '2026-10-14']) assert.ok(html.includes(s), s);
  assert.ok(!html.includes('<script>alert'), 'escaped');
  assert.ok(!/fetch\(|XMLHttpRequest/.test(html));
});
