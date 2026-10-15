// src/floor.js - the trading floor's data (portfolio, equity curve, tape, latest thinking), gathered once for every
// image and page asked within a few seconds (every viewer's page reloads four images every 10 s; the broker is asked
// at most once per CACHE_MS), and the four images drawn from it.
import { orderRows } from './journal.js';
import { equitySvg, thinkingSvg, positionsSvg, tapeSvg, WIDE, NARROW } from './svg.js';
import { LIMITS } from './risk.js';

const CACHE_MS = 8_000;
const MAX_POINTS = 400;

/** The equity points as returns since the start (Muse, SPY, BTC), at most MAX_POINTS of them, evenly picked. */
export function seriesOf(points, state) {
  if (!state?.startEquity) return [];
  const every = Math.max(1, Math.ceil(points.length / MAX_POINTS));
  const picked = points.filter((_, i) => i % every === 0 || i === points.length - 1);
  const r = (a, x) => (a > 0 && x > 0 ? x / a - 1 : null);
  return picked.map((p) => ({ t: p.t, muse: r(state.startEquity, p.equity), spy: r(state.bench?.SPY, p.spy), btc: r(state.bench?.['BTC/USD'], p.btc) }));
}

/** The latest decision (an order with its status, a refusal, or a hold). */
export function latestDecision(journal) {
  const e = journal.findLast((x) => ['order', 'refused', 'hold'].includes(x.kind));
  if (!e) return null;
  if (e.kind === 'hold') return e;
  const rows = orderRows(journal);
  return { kind: 'order', ...(e.kind === 'order' ? rows.find((r) => r.id === e.id) : rows.find((r) => r.t === e.t && r.status === 'refused')) };
}

export function createFloor(trader, { now = () => Date.now() } = {}) {
  let cached = null, inflight = null;
  async function data() {
    if (cached && now() - cached.at < CACHE_MS) return cached.d;
    inflight ??= (async () => {
      const pf = await trader.portfolio();
      const { store } = trader;
      const rows = orderRows(store.journal);
      const d = {
        ok: pf.ok, error: pf.ok ? null : pf.message,
        equity: pf.ok ? pf.equity : null, cash: pf.ok ? pf.cash : null, positions: pf.ok ? pf.positions : [],
        since: pf.ok ? pf.since : null, day: pf.ok ? pf.day : null,
        series: seriesOf(store.equity, store.state), rows, latest: latestDecision(store.journal),
        updatedAt: new Date(now()).toISOString(), mock: trader.mock,
      };
      cached = { at: now(), d };
      return d;
    })().finally(() => { inflight = null; });
    return inflight;
  }
  const svgs = {
    equity: (d, w) => equitySvg(d, w),
    thinking: (d, w) => thinkingSvg(d.latest, w),
    positions: (d, w) => positionsSvg({ positions: d.positions, cash: d.cash, equity: d.equity, cap: LIMITS.positionMaxPct }, w),
    tape: (d, w) => tapeSvg(d.rows, { total: d.rows.length }, w),
  };
  return {
    data,
    names: Object.keys(svgs),
    /** One of the images, wide or narrow. */
    async svg(name, narrow = false) {
      if (!svgs[name]) return null;
      return svgs[name](await data(), narrow ? NARROW : WIDE);
    },
    forget() { cached = null; },
  };
}
