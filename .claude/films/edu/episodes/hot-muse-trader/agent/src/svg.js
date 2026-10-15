// src/svg.js - the trading floor's moving parts as SVG images drawn on the server: the equity curve against the two
// buy-and-hold benchmarks, the latest thinking, the positions and the order tape. muse.ai's preview panel blocks fetch
// but loads images from our server, so the page reloads these every few seconds; the public page uses the same ones.
// System fonts, no request of their own, every outside word escaped. Colors: one dark theme (the panel is dark); the
// three series are the validated categorical slots 1-3 (blue, orange, aqua), status colors only for status, and every
// colored mark has a word or a sign beside it.
import { money } from './indicators.js';

export const C = {
  page: '#121211', surface: '#1a1a19', ink: '#f0efec', ink2: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', axis: '#383835', ring: 'rgba(255,255,255,0.10)',
  muse: '#3987e5', spy: '#d95926', btc: '#199e70', good: '#0ca30c', goodText: '#3fbf3f', bad: '#e66767', warn: '#fab219',
};
const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
/** The two widths: the wide one, and the narrow one for phones (the page picks by its own width). */
export const WIDE = 960, NARROW = 440;

export const xml = (t) => String(t ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]));
const pct = (x, d = 2) => {
  if (x === null || x === undefined || !Number.isFinite(x)) return 'n/a';
  const v = Math.abs(x * 100).toFixed(d);
  return Number(v) === 0 ? `${v}%` : `${x > 0 ? '+' : '-'}${v}%`;
};
const tone = (x) => (!Number.isFinite(x) || Math.abs(x) < 5e-5 ? C.ink2 : x > 0 ? C.goodText : C.bad);
const et = (iso, withDate = true) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const o = { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  return `${withDate ? `${d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' })}, ` : ''}${d.toLocaleTimeString('en-US', o)} ET`;
};

/** Lines of at most `max` characters, cut at spaces; at most `rows` lines, the last one ended with "..." if cut. */
export function wrap(text, max, rows = 99) {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w0 of words) {
    let w = w0;
    while (w.length > max) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, max)); w = w.slice(max); }
    if (!cur) cur = w; else if (cur.length + 1 + w.length <= max) cur += ` ${w}`; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > rows) {
    const kept = lines.slice(0, rows);
    kept[rows - 1] = `${kept[rows - 1].slice(0, max - 3).replace(/\s+\S*$/, '')}...`;
    return kept;
  }
  return lines;
}
// characters that fit in `px` at font size `size` (system sans, a little generous)
const fit = (px, size) => Math.floor(px / (size * 0.55));

const frame = (W, h, label, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="${xml(label)}" font-family="${FONT}">`
  + `<rect x="0.5" y="0.5" width="${W - 1}" height="${h - 1}" rx="14" fill="${C.surface}" stroke="${C.ring}"/>${body}</svg>`;
const t = (x, y, s, { size = 16, fill = C.ink, weight = 400, anchor = 'start', ls = 0, num = false } = {}) => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${ls ? ` letter-spacing="${ls}"` : ''}${num ? ' style="font-variant-numeric:tabular-nums"' : ''}>${xml(s)}</text>`;
const label = (x, y, s) => t(x, y, s.toUpperCase(), { size: 13, fill: C.muted, weight: 600, ls: 1.5 });
const pill = (x, y, s, color, { filled = false } = {}) => {
  const w = Math.round(s.length * 8.4 + 20);
  return `<rect x="${x}" y="${y - 17}" width="${w}" height="24" rx="12" fill="${filled ? color : 'none'}" stroke="${color}" stroke-width="1.5"/>` + t(x + w / 2, y, s, { size: 13, weight: 700, fill: filled ? C.page : color, anchor: 'middle', ls: 0.5 });
};

const pillW = (s) => Math.round(s.length * 8.4 + 20);

/** Nice tick step for a range. */
function step(range, n = 4) {
  const raw = range / n, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}
const narrowOf = (W) => W < 700;

/**
 * The equity curve against SPY and BTC buy-and-hold, as returns since the start.
 * @param {{series: {t: string, muse: number, spy: number|null, btc: number|null}[], equity: number|null, since: object|null,
 *   updatedAt: string}} d
 */
export function equitySvg(d, W = WIDE) {
  const n = narrowOf(W);
  const top = n ? 250 : 150;
  const H = top + (n ? 230 : 290), x0 = 64, x1 = W - (n ? 104 : 140), y0 = top, y1 = H - 48;
  const s = d.series ?? [];
  const lines = [['muse', 'Muse', C.muse], ['spy', 'SPY buy & hold', C.spy], ['btc', 'BTC buy & hold', C.btc]];
  const since = d.since?.startedAt ? new Date(d.since.startedAt).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }) : '';
  let body = label(32, 44, 'Equity vs buy-and-hold')
    + t(32, 92, d.equity === null || d.equity === undefined ? '...' : money(d.equity), { size: 38, weight: 700, num: true })
    + (d.since ? t(32, 120, `${pct(d.since.muse)} since ${since}`, { size: 16, fill: tone(d.since.muse), weight: 600, num: true }) : t(32, 120, 'the record starts at the first look at the account', { size: 15, fill: C.muted }));
  // the legend: a swatch, the name and the return since the start (words carry the identity, not color alone)
  const lx = n ? 32 : 520, ly = n ? 162 : 48;
  lines.forEach(([k, name, col], i) => {
    const y = ly + i * 30;
    body += `<line x1="${lx}" x2="${lx + 28}" y1="${y - 5}" y2="${y - 5}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`
      + t(lx + 40, y, name, { size: 15, fill: C.ink2 }) + t(W - 32, y, pct(d.since?.[k] ?? null), { size: 15, weight: 600, anchor: 'end', num: true });
  });
  const stamp = t(W - 32, n ? 44 : H - 14, `updated ${et(d.updatedAt, false)}`, { size: 12, fill: C.muted, anchor: 'end' });
  if (s.length < 2) {
    const mid = (y0 + y1) / 2;
    return frame(W, H, 'Equity versus buy-and-hold', body + `<line x1="${x0}" x2="${x1}" y1="${mid}" y2="${mid}" stroke="${C.axis}"/>`
      + wrap('The curve fills in as the record grows: a point every 5 minutes.', fit(x1 - x0, 15)).map((l, i) => t((x0 + x1) / 2, mid - 34 + i * 20, l, { size: 15, fill: C.muted, anchor: 'middle' })).join('') + stamp);
  }
  const vals = s.flatMap((p) => [p.muse, p.spy, p.btc]).filter(Number.isFinite);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi - lo < 0.004) { hi += 0.002; lo -= 0.002; }
  const st = step(hi - lo);
  lo = Math.floor(lo / st) * st; hi = Math.ceil(hi / st) * st;
  const ta = Date.parse(s[0].t), tb = Date.parse(s.at(-1).t);
  const X = (ts) => x0 + ((Date.parse(ts) - ta) / Math.max(1, tb - ta)) * (x1 - x0);
  const Y = (v) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);
  for (let v = lo; v <= hi + st / 2; v += st) {
    const zero = Math.abs(v) < st / 1000;
    body += `<line x1="${x0}" x2="${x1}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="${zero ? C.axis : C.grid}" stroke-width="${zero ? 1.5 : 1}"/>`
      + t(x0 - 10, Y(v) + 4, zero ? '0%' : pct(v, st < 0.01 ? 1 : 0), { size: 12, fill: C.muted, anchor: 'end', num: true });
  }
  const span = tb - ta;
  const tick = (ts) => (span < 2 * 86_400_000 ? et(ts, false).replace(' ET', '') : new Date(ts).toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' }));
  body += t(x0, y1 + 24, tick(s[0].t), { size: 12, fill: C.muted }) + (n ? '' : t((x0 + x1) / 2, y1 + 24, tick(s[Math.floor(s.length / 2)].t), { size: 12, fill: C.muted, anchor: 'middle' })) + t(x1, y1 + 24, tick(s.at(-1).t), { size: 12, fill: C.muted, anchor: 'end' });
  // the benchmarks first, Muse on top; each line ends in a dot ringed with the surface, then its direct label
  const ends = [];
  for (const [k, name, col] of [lines[2], lines[1], lines[0]]) {
    const pts = s.filter((p) => Number.isFinite(p[k]));
    if (pts.length < 2) continue;
    body += `<polyline fill="none" stroke="${col}" stroke-width="${k === 'muse' ? 2.5 : 2}" stroke-linejoin="round" stroke-linecap="round" points="${pts.map((p) => `${X(p.t).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ')}"/>`;
    const e = pts.at(-1);
    body += `<circle cx="${X(e.t).toFixed(1)}" cy="${Y(e[k]).toFixed(1)}" r="5" fill="${col}" stroke="${C.surface}" stroke-width="2"/>`;
    ends.push({ y: Y(e[k]), name: name.split(' ')[0], v: e[k] });
  }
  // direct labels at the right end, nudged apart so they never overlap
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 18) ends[i].y = ends[i - 1].y + 18;
  for (const e of ends) body += t(x1 + 12, e.y + 5, n ? e.name : `${e.name} ${pct(e.v, 1)}`, { size: 13, fill: C.ink2, weight: 600, num: true });
  return frame(W, H, `Equity versus buy-and-hold: Muse ${pct(d.since?.muse)}, SPY ${pct(d.since?.spy)}, BTC ${pct(d.since?.btc)}`, body + stamp);
}

const sideWord = (r) => (r.side === 'sell' ? 'SELL' : 'BUY');
const sizeWord = (r) => (r.notional ? money(Number(r.notional)) : r.qty === 'all' ? 'all' : `${+Number(r.qty).toFixed(6)}`);
const DONE_WORD = { canceled: 'CANCELED', expired: 'EXPIRED', rejected: 'REJECTED' };
const statusOf = (r) => (r.status === 'refused' ? ['REFUSED', C.bad] : r.status === 'filled' ? ['FILLED', C.goodText] : DONE_WORD[r.status] ? [DONE_WORD[r.status], C.muted] : ['OPEN', C.warn]);

/** The latest decision: an order, a refusal or a hold, with its why and plan. */
export function thinkingSvg(e, W = WIDE) {
  const n = narrowOf(W), inner = W - 64;
  if (!e) {
    const l = wrap('No decision yet. Muse looks at the market on a schedule: stocks every 30 minutes in market hours, crypto every 2 hours.', fit(inner, 17));
    return frame(W, 84 + l.length * 26, 'Latest thinking: none yet', label(32, 44, 'Latest thinking') + l.map((s, i) => t(32, 80 + i * 26, s, { size: 17, fill: C.ink2 })).join(''));
  }
  const ws = n ? 21 : 24;
  const why = wrap(e.why, fit(inner, ws), n ? 5 : 3);
  const plan = wrap(e.plan, fit(inner, 16), n ? 8 : 5);
  let head = '';
  if (e.kind === 'hold') head = pill(32, 80, 'HOLD', C.ink2);
  else {
    const what = `${e.test ? 'TEST ' : ''}${sideWord(e)} ${sizeWord(e)} ${e.symbol}`;
    const [word, col] = statusOf(e);
    head = pill(32, 80, what, C.ink) + pill(32 + pillW(what) + 10, 80, word, col);
    const extra = e.status === 'refused' ? String(e.code ?? '').replace(/^RISK_LIMIT:/, '') : e.fill_price ? `@ ${money(Number(e.fill_price))}` : '';
    if (extra) head += n ? t(32, 114, extra, { size: 14, fill: e.status === 'refused' ? C.bad : C.ink2, weight: 600, num: true }) : t(W - 32, 80, extra, { size: 15, fill: e.status === 'refused' ? C.bad : C.ink2, anchor: 'end', weight: 600, num: true });
  }
  let y = (n && e.kind !== 'hold' ? 142 : 122) + ws;
  let body = label(32, 44, 'Latest thinking') + t(W - 32, 44, et(e.t), { size: 13, fill: C.muted, anchor: 'end' }) + head;
  for (const l of why) { body += t(32, y, l, { size: ws, weight: 600 }); y += ws + 8; }
  if (plan.length) {
    y += 10; body += label(32, y, 'Plan'); y += 24;
    for (const l of plan) { body += t(32, y, l, { size: 16, fill: C.ink2 }); y += 23; }
  }
  return frame(W, y + 8, `Latest thinking: ${e.why}`, body);
}

/** Positions with their P&L and weight (the cap marked on each bar), then cash. */
export function positionsSvg({ positions = [], cash = null, equity = null, cap = 0.2 }, W = WIDE) {
  const n = narrowOf(W);
  const rows = positions.slice(0, 12);
  const H = 104 + Math.max(1, rows.length) * 44 + 52;
  const bar = n ? 80 : 100;
  const bx = n ? 168 : 590;
  const cols = n ? [[32, 'Symbol', 'start'], [bx, 'Weight', 'start'], [W - 32, 'Value · P&L', 'end']]
    : [[32, 'Symbol', 'start'], [220, 'Qty', 'end'], [330, 'Avg', 'end'], [440, 'Price', 'end'], [560, 'Value', 'end'], [bx, 'Weight', 'start'], [W - 32, 'P&L', 'end']];
  let body = label(32, 44, 'Positions') + (equity ? t(W - 32, 44, `equity ${money(equity)}`, { size: 13, fill: C.muted, anchor: 'end', num: true }) : '');
  for (const [x, h, a] of cols) body += t(x, 84, h, { size: 12, fill: C.muted, anchor: a, weight: 600 });
  body += `<line x1="32" x2="${W - 32}" y1="96" y2="96" stroke="${C.grid}"/>`;
  let y = 128;
  if (!rows.length) { body += t(32, y, 'No positions: all cash.', { size: 16, fill: C.ink2 }); y += 44; }
  for (const p of rows) {
    const w = Math.min(1, p.weight / (cap * 1.25));
    const pnl = `${p.pnl >= 0 ? '+' : '-'}${money(Math.abs(p.pnl))} (${pct(p.pnlPct, 1)})`;
    body += t(32, y, p.symbol, { size: 17, weight: 700 })
      + `<rect x="${bx}" y="${y - 11}" width="${bar}" height="8" rx="4" fill="${C.grid}"/><rect x="${bx}" y="${y - 11}" width="${Math.max(4, w * bar).toFixed(1)}" height="8" rx="4" fill="${C.muse}"/>`
      + `<line x1="${bx + bar / 1.25}" x2="${bx + bar / 1.25}" y1="${y - 15}" y2="${y + 1}" stroke="${C.ink2}" stroke-width="1.5"/>`
      + t(bx + bar + 8, y - 2, `${(p.weight * 100).toFixed(1)}%`, { size: 12, fill: C.muted, num: true });
    if (n) {
      body += t(W - 32, y - 4, money(p.value), { size: 15, anchor: 'end', num: true }) + t(W - 32, y + 13, pnl, { size: 12, fill: tone(p.pnl), anchor: 'end', weight: 600, num: true });
    } else {
      body += t(220, y, `${+p.qty.toFixed(p.crypto ? 6 : 4)}`, { size: 15, fill: C.ink2, anchor: 'end', num: true })
        + t(330, y, money(p.avg), { size: 15, fill: C.ink2, anchor: 'end', num: true })
        + t(440, y, money(p.price), { size: 15, anchor: 'end', num: true })
        + t(560, y, money(p.value), { size: 15, anchor: 'end', num: true })
        + t(W - 32, y, pnl, { size: 15, fill: tone(p.pnl), anchor: 'end', weight: 600, num: true });
    }
    body += `<line x1="32" x2="${W - 32}" y1="${y + 20}" y2="${y + 20}" stroke="${C.grid}"/>`;
    y += 44;
  }
  body += t(32, y + 4, 'Cash', { size: 16, fill: C.ink2, weight: 600 }) + t(n ? W - 32 : 560, y + 4, cash === null ? 'n/a' : money(cash), { size: 15, fill: C.ink2, anchor: 'end', num: true })
    + t(n ? 32 : W - 32, y + (n ? 32 : 4), `the mark on each bar: the ${cap * 100}% cap per symbol`, { size: 12, fill: C.muted, anchor: n ? 'start' : 'end' });
  return frame(W, H + (n ? 20 : 0), `Positions: ${rows.length ? rows.map((p) => p.symbol).join(', ') : 'none'}`, body);
}

/** The order tape, newest first: time, the order, its status, and its why. */
export function tapeSvg(rows, { total = rows.length } = {}, W = WIDE) {
  const n = narrowOf(W);
  const list = rows.slice(0, n ? 6 : 10);
  const tx = n ? 32 : 190;
  const whys = list.map((r) => wrap(r.why, fit(W - tx - 32, 15), n ? 3 : 2));
  let body = label(32, 44, 'Order tape') + t(W - 32, 44, `${total} in the public log`, { size: 13, fill: C.muted, anchor: 'end' });
  let y = 84;
  if (!list.length) { body += t(32, y + 10, 'No orders yet.', { size: 16, fill: C.ink2 }); y += 40; }
  list.forEach((r, i) => {
    const what = `${r.test ? 'TEST ' : ''}${sideWord(r)} ${sizeWord(r)} ${r.symbol ?? ''}`;
    const [w0, col] = statusOf(r);
    const word = r.status === 'refused' ? `${w0} ${String(r.code ?? '').replace(/^RISK_LIMIT:/, '')}` : r.status === 'filled' ? `${w0} @ ${money(Number(r.fill_price))}` : w0;
    y += 20;
    if (n) {
      body += t(32, y, what, { size: 16, weight: 700 }) + t(W - 32, y, et(r.t), { size: 12, fill: C.muted, anchor: 'end', num: true });
      y += 22; body += t(32, y, word, { size: 13, fill: col, weight: 700 });
    } else {
      body += t(32, y, et(r.t), { size: 13, fill: C.muted, num: true }) + t(tx, y, what, { size: 16, weight: 700 }) + t(W - 32, y, word, { size: 13, fill: col, anchor: 'end', weight: 700 });
    }
    y += 6;
    for (const l of whys[i]) { y += 21; body += t(tx, y, l, { size: 15, fill: C.ink2 }); }
    y += 14;
    if (i < list.length - 1) body += `<line x1="32" x2="${W - 32}" y1="${y}" y2="${y}" stroke="${C.grid}"/>`;
  });
  return frame(W, y + 14, `Order tape: the ${list.length} newest orders`, body);
}
