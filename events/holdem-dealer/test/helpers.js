// Test helpers (not a test file): rigged decks, quick tables, a bot driver and chip accounting.
import { HoldemTable } from '../src/engine/table.js';
import { newDeck, seededRng } from '../src/engine/cards.js';
import { decide } from '../src/engine/ai.js';

// An rng whose next answers can be queued: queue(v) for one answer (e.g. the first button), deck(top) to make the
// next shuffle produce a deck that starts with `top` (the rest in a fixed order). Falls back to a seeded rng.
export function riggedRng(seed = 1) {
  const fallback = seededRng(seed);
  const q = [];
  const rng = (n) => {
    if (q.length) {
      const v = q.shift();
      if (!(v >= 0 && v < n)) throw new Error(`rigged value ${v} out of range ${n}`);
      return v;
    }
    return fallback(n);
  };
  rng.queue = (...v) => { q.push(...v); return rng; };
  rng.deck = (top) => {
    const target = [...top, ...newDeck().filter((c) => !top.includes(c))];
    if (new Set(target).size !== 52) throw new Error('bad rigged deck');
    const arr = newDeck();
    for (let i = 51; i > 0; i--) {
      const j = arr.indexOf(target[i]);
      q.push(j);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return rng;
  };
  return rng;
}

// Deck top for one hand: holes = { seat: ["As","Kd"] } dealt one card at a time from left of the button, then
// burn + flop, burn + turn, burn + river. Burns are filler cards not used elsewhere.
export function handDeck(button, nSeats, holes, board = []) {
  const order = [];
  for (let k = 1; k <= nSeats; k++) { const j = (button + k) % nSeats; if (holes[j]) order.push(j); }
  const used = new Set([...Object.values(holes).flat(), ...board]);
  const filler = newDeck().filter((c) => !used.has(c));
  const top = [];
  for (let r = 0; r < 2; r++) for (const s of order) top.push(holes[s][r]);
  const b = board.slice();
  while (b.length < 5) b.push(filler.pop());
  top.push(filler.pop(), b[0], b[1], b[2], filler.pop(), b[3], filler.pop(), b[4]);
  return top;
}

export const acct = (n, chips = 100000) => ({ id: `u_${n}`, pid: `p_${n}`, name: `Player ${n}`, chips });

// A table with humans u_<seat> sitting at the given seats with the given stacks (default 2000 at 10/20).
export function makeTable({ seats = [0, 1, 2], stacks = null, settings = {}, rng = riggedRng(1), now = 1000, start = true, options } = {}) {
  const t = new HoldemTable({ code: 'T', settings: { blinds: '10/20', seats: 6, ...settings }, host: { id: `u_${seats[0]}`, pid: `p_${seats[0]}` }, now, rng, options });
  seats.forEach((s, k) => {
    const r = t.sit(acct(s), s, stacks ? stacks[k] : 2000, now);
    if (!r.ok) throw new Error('sit failed ' + r.error);
  });
  if (start) {
    const r = t.hostOp(`u_${seats[0]}`, 'start', {}, now);
    if (!r.ok) throw new Error('start failed ' + r.error);
  }
  return t;
}

export function act(t, action, to = null, now) {
  const a = t.actor();
  if (!a) throw new Error('nobody to act');
  return t.act(a.id, a.handId, action, to, now ?? t.s.now);
}

// Advance time to the next wake-up (and tick); returns the new time or null.
export function wake(t) {
  const w = t.nextWakeAt();
  if (w === null) return null;
  const now = Math.max(w, t.s.now);
  t.tick(now);
  return now;
}

// Run ticks until someone has to act or the given predicate holds (bounded).
export function until(t, pred, max = 50) {
  for (let i = 0; i < max; i++) {
    if (pred(t)) return true;
    if (wake(t) === null) return pred(t);
  }
  return pred(t);
}

export function chipsOnTable(t) {
  const h = t.hand;
  let sum = 0;
  for (const s of t.seats) if (s) sum += s.stack + s.pendingTopUp + (h && !h.done && s.inHand ? s.contrib : 0);
  return sum;
}

// Drive bots with the AI until `hands` hands have finished. check(t) runs after every step.
export function runBots(t, { hands, aiRng, budget = 0.1, check = () => {}, refill = null }) {
  let finished = 0;
  let lastDone = null;
  for (let step = 0; step < hands * 200; step++) {
    const a = t.actor();
    if (a) {
      const s = t.seats[a.seat];
      const d = decide(t.viewFor(a.seat), { rng: aiRng, style: s.bot || 'veteran', budget });
      const r = t.act(a.id, a.handId, d.action, d.to, t.s.now + 1);
      check(t, { step, decision: d, result: r, actor: a });
    } else {
      if (wake(t) === null) break;
      check(t, { step });
      if (refill) refill(t);
    }
    const h = t.hand;
    if (h && h.done && h.id !== lastDone) { lastDone = h.id; finished++; if (finished >= hands) break; }
  }
  return finished;
}
