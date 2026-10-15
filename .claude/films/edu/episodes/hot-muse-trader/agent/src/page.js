// src/page.js - the two pages. liveViewHtml: what the live_view tool returns for muse.ai's preview panel, small (the
// agent shows it exactly as returned): the header, the disclaimer, and four images from our server that a few lines of
// script reload every 10 s (the panel blocks fetch and XHR, not images). publicPageHtml: the public read-only page at /
// with the same floor, the rules, the full order log (CSV and JSON downloads) and the daily summaries.
import { RULES_TEXT, LIMITS } from './risk.js';
import { C } from './svg.js';
import { money } from './indicators.js';

export const DISCLAIMER = 'PAPER MONEY · NOT INVESTMENT ADVICE · not affiliated with Meta';
export const RELOAD_MS = 10_000;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** Our server's public address, https (http on this machine for tests), with nothing after the host. */
export const isBase = (u) => {
  try { const x = new URL(u); return (x.protocol === 'https:' || (x.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(x.hostname))) && !x.username && !x.search && !x.hash && x.pathname === '/'; } catch { return false; }
};

const ALTS = { equity: 'Equity versus SPY and BTC buy-and-hold since the start', thinking: 'Muse\'s latest decision with its why and plan', positions: 'Positions with profit and loss', tape: 'The order tape, newest first' };
const STYLE = `:root{color-scheme:dark}html,body{margin:0;background:${C.page};color:${C.ink};font:15px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:1960px;margin:0 auto;padding:12px 16px 20px}header{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.logo{height:34px;width:auto;image-rendering:pixelated}h1{margin:0;font-size:22px;letter-spacing:3px;font-weight:800}.sub{margin:0;color:${C.ink2};font-size:13px}
.warn{margin:12px 0;padding:8px 12px;border:1px solid ${C.axis};border-radius:10px;background:${C.surface};font-size:13px;font-weight:700;letter-spacing:1px;color:${C.warn}}
.mock{margin:0 0 12px;padding:8px 12px;border-radius:10px;background:#3a2a0a;color:#ffd27a;font-size:13px}
main{display:grid;gap:14px;grid-template-columns:minmax(0,1fr)}.col{display:grid;gap:14px;align-content:start;min-width:0}
@media (min-width:1500px){main{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
img.f{display:block;width:100%;max-width:960px;height:auto;margin:0 auto;border-radius:14px}
footer{margin-top:14px;color:${C.muted};font-size:12px}a{color:#8fb8f0}`;
// the images reloaded every RELOAD_MS: the narrow ones below 600 px; an image that fails keeps the last one shown
const SCRIPT = (base) => `(()=>{const B=${JSON.stringify(base)};const n=innerWidth<600?'w=n&':'';const f=()=>document.querySelectorAll('img.f').forEach((i)=>{const x=new Image();x.onload=()=>{i.src=x.src;};x.src=B+'floor/'+i.dataset.n+'.svg?'+n+'t='+Date.now();});f();setInterval(f,${RELOAD_MS});})();`;

function floorHtml(base, mock) {
  const img = (k) => `<img class="f" data-n="${k}" src="${esc(base)}floor/${k}.svg" alt="${esc(ALTS[k])}">`;
  return `<header><img class="logo" src="${esc(base)}assets/logo.png" alt="Picasso Lab, UC San Diego"><div><h1>MUSE TRADES</h1><p class="sub">Live trading floor · a paper account with real market data · every order public</p></div></header>`
    + `<p class="warn">${esc(DISCLAIMER)}</p>`
    + (mock ? '<p class="mock">MOCK DATA: this server has no broker keys yet, so prices and fills are made up by a local mock of the broker.</p>' : '')
    + `<main><div class="col">${img('equity')}${img('thinking')}</div><div class="col">${img('positions')}${img('tape')}</div></main>`;
}

/**
 * The live_view page (about 2.5 KB).
 * @param {string} base our public address ending in "/"
 */
export function liveViewHtml(base, { mock = false } = {}) {
  const b = isBase(base) ? String(base) : null;
  if (!b) return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Muse trades</title></head><body><p>The trading floor needs the server\'s public address (WEB_PUBLIC_URL).</p></body></html>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + `<title>Muse trades: trading floor</title><style>${STYLE}</style></head><body><div class="wrap">${floorHtml(b, mock)}`
    + `<footer>A research demo by Picasso Lab, UC San Diego. Muse decides; a fixed risk layer checks every order. Full order log: <a href="${esc(b)}" target="_blank" rel="noopener">${esc(b.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></footer>`
    + `</div><script>${SCRIPT(b)}</script></body></html>`;
}

const pctCell = (x) => (x === null || x === undefined || !Number.isFinite(Number(x)) ? '' : `${Number(x) >= 0 ? '+' : ''}${(Number(x) * 100).toFixed(2)}%`);
const tsCell = (iso) => (iso ? `${new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} ET` : '');

/**
 * The public page.
 * @param {{base: string, rows: object[], summaries: object[], state: object, mock: boolean, sourceUrl?: string}} p
 */
export function publicPageHtml({ base, rows, summaries, state, mock, sourceUrl = '' }) {
  const b = isBase(base) ? String(base) : '/';
  const shown = rows.slice(0, 300);
  const status = (r) => (r.status === 'refused' ? `refused (${esc(r.code)})` : r.status === 'filled' ? `filled @ ${esc(money(Number(r.fill_price)))}` : esc(r.status));
  const size = (r) => (r.notional ? money(Number(r.notional)) : esc(r.qty ?? ''));
  const table = shown.length
    ? `<div class="tw"><table><thead><tr><th>Time</th><th>Order</th><th>Status</th><th>Why</th><th>Plan</th><th>1 day</th><th>1 week</th></tr></thead><tbody>${shown.map((r) => `<tr><td class="n">${esc(tsCell(r.t))}</td><td>${r.test ? '<span class="tag">TEST</span> ' : ''}<b>${esc((r.side ?? '').toUpperCase())} ${size(r)} ${esc(r.symbol)}</b>${r.type === 'limit' ? ` <span class="m">limit ${esc(money(Number(r.limit_price)))}</span>` : ''}</td><td>${status(r)}</td><td>${esc(r.why)}</td><td class="m">${esc(r.plan)}</td><td class="n">${pctCell(r.outcome_1d_pct)}</td><td class="n">${pctCell(r.outcome_1w_pct)}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="m">No orders yet.</p>';
  const days = summaries.slice(-30).reverse();
  const sumTable = days.length
    ? `<div class="tw"><table><thead><tr><th>Day (New York)</th><th>Equity at close</th><th>Day</th><th>Since start</th><th>SPY</th><th>BTC</th><th>Orders</th><th>Refused</th></tr></thead><tbody>${days.map((s) => `<tr><td>${esc(s.date)}${s.halted ? ' <span class="m">(buys halted)</span>' : ''}</td><td class="n">${esc(money(s.equity_close))}</td><td class="n">${pctCell(s.day_return)}</td><td class="n">${pctCell(s.since_start)}</td><td class="n">${pctCell(s.spy_since_start)}</td><td class="n">${pctCell(s.btc_since_start)}</td><td class="n">${s.orders}</td><td class="n">${s.refused}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="m">The first daily summary comes after the first full day.</p>';
  const started = state?.startedAt ? `Started ${esc(tsCell(state.startedAt))} with ${esc(money(state.startEquity))} of paper money.` : 'Not started yet: the record starts at the first look at the account.';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Muse trades</title><meta name="description" content="An AI agent trades US stocks and crypto with paper money and real market data, every order and its reason public. A research demo by Picasso Lab, UC San Diego.">'
    + `<link rel="icon" href="${esc(b)}assets/logo.png"><style>${STYLE}
section{max-width:1960px;margin:22px auto 0}h2{font-size:15px;letter-spacing:2px;text-transform:uppercase;color:${C.ink2};margin:0 0 8px}
.tw{overflow-x:auto;border:1px solid ${C.axis};border-radius:12px}table{border-collapse:collapse;width:100%;min-width:760px;font-size:13px}
th,td{padding:7px 10px;border-bottom:1px solid ${C.grid};text-align:left;vertical-align:top}th{color:${C.muted};font-weight:600;background:${C.surface};position:sticky;top:0}
td.n{white-space:nowrap;font-variant-numeric:tabular-nums}.m{color:${C.muted}}ul{margin:0;padding-left:20px;color:${C.ink2}}li{margin:3px 0}
.tag{display:inline-block;padding:0 6px;border:1px solid ${C.muted};border-radius:6px;color:${C.muted};font-size:11px;font-weight:700}
.dl a{display:inline-block;margin-right:10px;padding:4px 12px;border:1px solid ${C.axis};border-radius:99px;text-decoration:none}</style></head><body><div class="wrap">`
    + floorHtml(b, mock)
    + `<section><h2>The challenge</h2><p>${started} Muse, Meta's AI, decides what to buy and sell through this server's tools; it is measured against buying and holding SPY (stocks) and BTC (crypto) from the same start. Muse runs on a schedule: stocks every 30 minutes in market hours, crypto every 2 hours, and a daily wrap-up.</p></section>`
    + `<section><h2>Rules it cannot switch off</h2><ul>${RULES_TEXT.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></section>`
    + `<section><h2>Every order</h2><p class="dl"><a href="${esc(b)}orders.csv">orders.csv</a><a href="${esc(b)}orders.json">orders.json</a><a href="${esc(b)}summaries.json">summaries.json</a><a href="${esc(b)}equity.json">equity.json</a> <span class="m">${rows.length} orders${rows.length > shown.length ? `, the newest ${shown.length} below` : ''}; refused ones too.</span></p>${table}</section>`
    + `<section><h2>Daily summaries</h2>${sumTable}</section>`
    + `<footer><p>${esc(DISCLAIMER)}. A research demo by Picasso Lab, UC San Diego: how an AI agent trades when every decision is public. Muse is Meta's AI; this site is not run, endorsed or reviewed by Meta. Paper trading at Alpaca with real market data (IEX feed for stocks); outcomes 1 day and 1 week after each fill compare the fill price with the price then. Position cap ${LIMITS.positionMaxPct * 100}% of equity, ${LIMITS.ordersPerHour} orders an hour, buys halted for the day at -${LIMITS.dailyLossPct * 100}%.${sourceUrl ? ` Source: <a href="${esc(sourceUrl)}">${esc(sourceUrl)}</a>.` : ''} MCP endpoint: <code>${esc(b)}mcp</code> (reading tools are open to all; trading needs the owner's key).</p></footer>`
    + `</div><script>${SCRIPT(b)}</script></body></html>`;
}
