// HoldemTable: the authoritative No-Limit Hold'em cash table as a pure state machine (DESIGN.md sections 6-8).
// No timers, no I/O: time only from the `now` arguments (ms), randomness only from the injected rng(n).
// The whole state is a plain JSON object (toJSON / fromJSON round-trip a live hand exactly, deck included).
//
// Public API (every mutation returns { ok: true } or { ok: false, error: "<code>" } and bumps `rev` when it
// changes anything; `now` is optional only where noted - the table then uses the latest time it has seen):
//   new HoldemTable({ code, settings, host, now, rng = cryptoRng, options })
//        settings: { blinds: "5/10"|"10/20"|"25/50"|"50/100", seats: 2..9, actionSec: 15|20|30, timeBankSec: 0..60 }
//        host: { id, pid } of the creating account (or null: the first human to sit becomes host)
//        options: { pauseWithoutHumans = true }  false lets bots-only tables deal (tests, simulations)
//   static fromJSON(obj, { rng, now })  now given = a restart: the player to act gets a fresh action timer
//   toJSON()
//   sit(account, seat, buyIn, now)      account = { id, pid, name, chips }; buy-in leaves the bankroll at once
//   stand(accountId, now)               folds a live hand at once; the stack goes back at hand end (or now)
//   setSitOut(accountId, on, now)       on: skipped from the next hand; off: back, waits for the big blind
//   postBB(accountId, now?)             a waiting player posts a big blind to be dealt in next hand
//   act(accountId, handId, action, to, now)   action fold|check|call|raise|allin, to = total street bet (raise)
//   show(accountId, now?)               show own cards after an uncontested win or an automatic muck
//   requestTopUp(accountId, amount, bankroll?, now?)  chips leave the bankroll at once; join the stack between hands
//   hostOp(accountId, op, args, now)    op settings (args = settings or { settings }), start, fillBots ({ count? }),
//                                       removeBot ({ seat }), dissolve
//   setConnected(accountId, on)         socket presence for the public `connected` flag (true on sit; no effect
//                                       on play: a disconnected player simply times out)
//   releaseHost(accountId, now)         the host is gone (rooms decide when): host passes to the longest-seated
//                                       other human; error no_candidate when there is none (host unchanged).
//                                       Standing up never passes the host on by itself: a host who stands (to
//                                       change seats, to watch) still runs the table while at it
//   tick(now) -> bool                   applies due timeouts, street transitions, next deal, stand-ups, idle close
//   nextWakeAt() -> ms | null           when tick() next has something to do (may be in the past = now)
//   viewFor(seat) -> { table, me }      what a player in that seat may see (bots decide from this only)
//   settlements() -> { chips: [{ accountId, amount, reason }], records: [{ accountId, hands, won, biggestPot,
//                    net, showdowns }] }  drained; amount > 0 = to the bankroll, < 0 = taken from it
//   seatOf(accountId) -> seat | -1, actor() -> { seat, id, bot, handId } | null, canShow(seat), legalFor(seat)
//   getters: code, phase, rev, settings, seats, hand, host, last, closedReason, options
// Error codes: closed, bad_seat, seat_taken, already_seated, bad_amount, insufficient_chips, not_seated,
//   stale_hand, not_your_turn, illegal_action, bad_action, cannot_show, not_waiting, not_host, bad_phase,
//   bad_settings, not_enough_players, table_full, not_bot, is_bot, bad_op, no_candidate.

import { shuffledDeck, cryptoRng } from './cards.js';
import { evaluate } from './evaluator.js';
import { uncalledBet, buildPots, awardPots, oddChipOrder } from './pots.js';
import { viewFor as buildView } from '../views.js';

export const BLINDS = { '5/10': [5, 10], '10/20': [10, 20], '25/50': [25, 50], '50/100': [50, 100] };
export const ACTION_SECS = [15, 20, 30];
export const BOT_STYLES = ['steady', 'fierce', 'sly', 'veteran'];
const BOT_NAMES = { steady: 'Stone', fierce: 'Blaze', sly: 'Fox', veteran: 'Sage' };
export const TIMING = {
  street: 700, // closed street -> next card(s)
  runout: 1200, // all-in run-out, per street
  hold: 3000, // hand end -> next deal
  holdShowdown: 5000,
  startDelay: 2000, // a running table with no hand gets enough players -> first deal
  sitOutMax: 5 * 60_000,
  bustedMax: 60_000,
  idleClose: 10 * 60_000,
  bankEvery: 10, // hands dealt
  bankStep: 5_000,
  bankCap: 60_000,
};
export const DEFAULT_SETTINGS = { blinds: '10/20', seats: 6, actionSec: 20, timeBankSec: 30 };

export function normalizeSettings(input = {}, base = DEFAULT_SETTINGS) {
  const src = { ...base, ...(input || {}) };
  const bl = BLINDS[src.blinds];
  const seats = Number(src.seats);
  const actionSec = Number(src.actionSec);
  const timeBankSec = Number(src.timeBankSec);
  if (!bl) return { ok: false, error: 'bad_settings' };
  if (!Number.isInteger(seats) || seats < 2 || seats > 9) return { ok: false, error: 'bad_settings' };
  if (!ACTION_SECS.includes(actionSec)) return { ok: false, error: 'bad_settings' };
  if (!Number.isInteger(timeBankSec) || timeBankSec < 0 || timeBankSec > 60) return { ok: false, error: 'bad_settings' };
  const [sb, bb] = bl;
  return {
    ok: true,
    settings: { blinds: src.blinds, sb, bb, minBuyIn: 40 * bb, maxBuyIn: 100 * bb, seats, actionSec, timeBankSec },
  };
}

export function defaultBuyIn(settings, bankroll) {
  return Math.min(settings.maxBuyIn, bankroll);
}

const OK = Object.freeze({ ok: true });
const err = (error) => ({ ok: false, error });
const STREETS = ['preflop', 'flop', 'turn', 'river'];

function newSeat({ id, pid, name, bot = null, stack, now, bankMs, waiting }) {
  return {
    id, pid, name: String(name || '').slice(0, 24), bot, stack, seatedAt: now,
    connected: true, sitOut: false, sitOutSince: null, sitOutMissed: false, waiting: !!waiting, postBB: false,
    bustedSince: null, leaving: false, pendingTopUp: 0, bankMs, handsDealt: 0, timeouts: 0,
    ...handFields(),
  };
}

function handFields() {
  return {
    inHand: false, hole: null, shown: null, folded: false, allin: false, mucked: false, bet: 0, contrib: 0,
    acted: false, actedBet: null, last: null, startStack: 0, won: 0, wentToShowdown: false,
  };
}

export class HoldemTable {
  constructor({ code, settings = {}, host = null, now = 0, rng = cryptoRng, options = {} } = {}) {
    const ns = normalizeSettings(settings);
    if (!ns.ok) throw new Error('bad settings');
    this.rng = rng;
    this.s = {
      v: 1,
      code: String(code),
      phase: 'waiting',
      rev: 1,
      now,
      host: host ? { id: host.id, pid: host.pid ?? null } : null,
      settings: ns.settings,
      options: { pauseWithoutHumans: options.pauseWithoutHumans !== false },
      seats: Array(ns.settings.seats).fill(null),
      button: null,
      handNo: 0,
      hand: null,
      last: null,
      pending: null,
      botSeq: 0,
      idleSince: now,
      closedReason: null,
      queue: { chips: [], records: [] },
    };
  }

  static fromJSON(obj, { rng = cryptoRng, now = null } = {}) {
    if (!obj || obj.v !== 1) throw new Error('bad table json');
    const t = Object.create(HoldemTable.prototype);
    t.rng = rng;
    t.s = JSON.parse(JSON.stringify(obj));
    if (now !== null && now !== undefined) {
      const savedNow = t.s.now;
      t._clock(now);
      const h = t.s.hand;
      if (h && !h.done && h.toAct !== null) {
        const s = t.s.seats[h.toAct];
        // the time bank already used before the restart stays used
        if (h.usingBank && h.bankStart !== null) s.bankMs = Math.max(0, s.bankMs - Math.max(0, savedNow - h.bankStart));
        h.usingBank = false;
        h.bankStart = null;
        h.deadline = s.bot ? null : now + t.s.settings.actionSec * 1000;
      }
      t.s.rev++;
    }
    return t;
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.s));
  }

  // ---------- read-only accessors ----------
  get code() { return this.s.code; }
  get phase() { return this.s.phase; }
  get rev() { return this.s.rev; }
  get settings() { return this.s.settings; }
  get seats() { return this.s.seats; }
  get hand() { return this.s.hand; }
  get host() { return this.s.host; }
  get last() { return this.s.last; }
  get closedReason() { return this.s.closedReason; }
  get options() { return this.s.options; }

  seatOf(accountId) {
    if (accountId === null || accountId === undefined) return -1;
    return this.s.seats.findIndex((s) => s && s.id === accountId);
  }

  actor() {
    const h = this.s.hand;
    if (!h || h.done || h.toAct === null) return null;
    const s = this.s.seats[h.toAct];
    return { seat: h.toAct, id: s.id, bot: s.bot, handId: h.id };
  }

  legalFor(seat) {
    const h = this.s.hand;
    if (!h || h.done || h.toAct !== seat) return null;
    return this._legal(seat);
  }

  canShow(seat) {
    const h = this.s.hand;
    const s = this.s.seats[seat];
    if (!h || !h.done || !s || !s.inHand || s.folded || s.shown || !s.hole) return false;
    if (s.mucked) return true;
    return !!h.uncontested && h.winners?.some((w) => w.seat === seat);
  }

  viewFor(seat) {
    return buildView(this, seat);
  }

  settlements() {
    const q = this.s.queue;
    this.s.queue = { chips: [], records: [] };
    return q;
  }

  nextWakeAt() {
    const e = this._nextEvent();
    return e ? e.at : null;
  }

  // ---------- mutations ----------
  sit(account, seat, buyIn, now) {
    return this._mut(now, () => {
      const st = this.s;
      if (st.phase === 'closed') return err('closed');
      if (!account || !account.id) return err('not_seated');
      if (!Number.isInteger(seat) || seat < 0 || seat >= st.settings.seats) return err('bad_seat');
      if (st.seats[seat]) return err('seat_taken');
      if (this.seatOf(account.id) >= 0) return err('already_seated');
      if (!Number.isInteger(buyIn) || buyIn < st.settings.minBuyIn || buyIn > st.settings.maxBuyIn) return err('bad_amount');
      if (!(Number(account.chips) >= buyIn)) return err('insufficient_chips');
      st.seats[seat] = newSeat({
        id: account.id, pid: account.pid ?? null, name: account.name, stack: buyIn, now: st.now,
        bankMs: this._bankStart(), waiting: st.phase === 'running' && st.handNo > 0,
      });
      st.queue.chips.push({ accountId: account.id, amount: -buyIn, reason: 'buyin' });
      if (!st.host) st.host = { id: account.id, pid: account.pid ?? null };
      else if (st.host.id === account.id && !st.host.pid) st.host.pid = account.pid ?? null;
      return OK;
    });
  }

  stand(accountId, now) {
    return this._mut(now, () => {
      if (this.s.phase === 'closed') return err('closed');
      const seat = this.seatOf(accountId);
      if (seat < 0) return err('not_seated');
      this._leave(seat, this.s.now);
      return OK;
    });
  }

  setSitOut(accountId, on, now) {
    return this._mut(now, () => {
      if (this.s.phase === 'closed') return err('closed');
      const seat = this.seatOf(accountId);
      if (seat < 0 || this.s.seats[seat].leaving) return err('not_seated');
      const s = this.s.seats[seat];
      if (s.bot) return err('is_bot');
      if (on) {
        if (!s.sitOut) { s.sitOut = true; s.sitOutSince = this.s.now; s.postBB = false; }
      } else if (s.sitOut) {
        s.sitOut = false;
        s.sitOutSince = null;
        s.timeouts = 0;
        if (s.sitOutMissed) s.waiting = true;
        s.sitOutMissed = false;
      }
      return OK;
    });
  }

  postBB(accountId, now) {
    return this._mut(now, () => {
      if (this.s.phase === 'closed') return err('closed');
      const seat = this.seatOf(accountId);
      if (seat < 0 || this.s.seats[seat].leaving) return err('not_seated');
      const s = this.s.seats[seat];
      if (!s.waiting || s.sitOut || s.stack <= 0) return err('not_waiting');
      s.postBB = true;
      return OK;
    });
  }

  act(accountId, handId, action, to, now) {
    return this._mut(now, () => {
      if (this.s.phase === 'closed') return err('closed');
      const h = this.s.hand;
      if (!h || h.done || h.id !== handId) return err('stale_hand');
      const seat = this.seatOf(accountId);
      if (seat < 0) return err('not_seated');
      if (h.toAct !== seat) return err('not_your_turn');
      const s = this.s.seats[seat];
      const L = this._legal(seat);
      let kind = action;
      let amt = null;
      switch (action) {
        case 'fold': break;
        case 'check': if (!L.check) return err('illegal_action'); break;
        case 'call': if (L.check || L.call <= 0) return err('illegal_action'); break;
        case 'raise':
          if (!L.canRaise) return err('illegal_action');
          if (!Number.isInteger(to) || to < L.minRaiseTo || to > L.maxRaiseTo) return err('bad_amount');
          amt = to;
          break;
        case 'allin': {
          const maxTo = s.bet + s.stack;
          if (s.stack <= 0) return err('illegal_action');
          if (maxTo <= h.currentBet) { kind = 'call'; break; }
          if (!L.canRaise) return err('illegal_action');
          kind = 'raise';
          amt = maxTo;
          break;
        }
        default: return err('bad_action');
      }
      if (h.usingBank) s.bankMs = Math.max(0, s.bankMs - Math.max(0, this.s.now - h.bankStart));
      s.timeouts = 0;
      this._applyAction(seat, kind, amt, this.s.now, false);
      return OK;
    });
  }

  show(accountId, now) {
    return this._mut(now, () => {
      const seat = this.seatOf(accountId);
      if (seat < 0) return err('not_seated');
      if (!this.canShow(seat)) return err('cannot_show');
      const h = this.s.hand;
      const s = this.s.seats[seat];
      this._expose(seat);
      s.last = { a: 'show', amt: null };
      h.log.push({ seat, a: 'show', amt: null, street: h.street });
      return OK;
    });
  }

  requestTopUp(accountId, amount, bankroll = null, now) {
    return this._mut(now, () => {
      if (this.s.phase === 'closed') return err('closed');
      const seat = this.seatOf(accountId);
      if (seat < 0 || this.s.seats[seat].leaving) return err('not_seated');
      const s = this.s.seats[seat];
      if (s.bot) return err('is_bot');
      if (!Number.isInteger(amount) || amount <= 0) return err('bad_amount');
      // in a hand the stack has lost its bets: check against what the seat had when the hand began
      const base = this._inLiveHand(s) ? s.stack + s.contrib : s.stack;
      if (base + s.pendingTopUp + amount > this.s.settings.maxBuyIn) return err('bad_amount');
      if (bankroll !== null && bankroll !== undefined && amount > bankroll) return err('insufficient_chips');
      this.s.queue.chips.push({ accountId, amount: -amount, reason: 'topup' });
      if (this._inLiveHand(s)) s.pendingTopUp += amount;
      else { s.stack += amount; s.bustedSince = null; }
      return OK;
    });
  }

  releaseHost(accountId, now) {
    return this._mut(now, () => {
      if (this.s.phase === 'closed') return err('closed');
      if (!this.s.host || this.s.host.id !== accountId) return err('not_host');
      this._handOffHost(accountId);
      return this.s.host.id === accountId ? err('no_candidate') : OK;
    });
  }

  setConnected(accountId, on) {
    const seat = this.seatOf(accountId);
    if (seat < 0) return err('not_seated');
    const s = this.s.seats[seat];
    if (s.connected === !!on) return OK;
    s.connected = !!on;
    this.s.rev++;
    return OK;
  }

  hostOp(accountId, op, args = {}, now) {
    return this._mut(now, () => {
      const st = this.s;
      if (st.phase === 'closed') return err('closed');
      if (!st.host || st.host.id !== accountId) return err('not_host');
      args = args || {};
      switch (op) {
        case 'settings': {
          if (st.phase !== 'waiting') return err('bad_phase');
          const ns = normalizeSettings(args.settings || args, st.settings);
          if (!ns.ok) return err(ns.error);
          const n = ns.settings.seats;
          if (st.seats.some((s, i) => s && i >= n)) return err('seat_taken');
          st.settings = ns.settings;
          st.seats = Array.from({ length: n }, (_, i) => st.seats[i] || null);
          for (const s of st.seats) if (s) s.bankMs = this._bankStart();
          return OK;
        }
        case 'start': {
          if (st.phase !== 'waiting') return err('bad_phase');
          if (!this._canDeal()) return err('not_enough_players');
          st.phase = 'running';
          st.pending = null;
          if (!this._dealHand(st.now)) { st.phase = 'waiting'; return err('not_enough_players'); }
          return OK;
        }
        case 'fillBots': {
          const empty = st.seats.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
          if (!empty.length) return err('table_full');
          const count = Math.min(empty.length, Number.isInteger(args.count) && args.count > 0 ? args.count : empty.length);
          const offset = this.rng(BOT_STYLES.length);
          for (let k = 0; k < count; k++) {
            const style = BOT_STYLES.includes(args.style) ? args.style : BOT_STYLES[(offset + st.botSeq) % BOT_STYLES.length];
            const n = ++st.botSeq;
            const id = `b_${n}`;
            const same = st.seats.filter((s) => s && s.bot && s.name.startsWith(BOT_NAMES[style])).length;
            st.seats[empty[k]] = newSeat({
              id, pid: id, name: same ? `${BOT_NAMES[style]} ${same + 1}` : BOT_NAMES[style], bot: style,
              stack: st.settings.maxBuyIn, now: st.now, bankMs: this._bankStart(),
              waiting: st.phase === 'running' && st.handNo > 0,
            });
          }
          return OK;
        }
        case 'removeBot': {
          const seat = args.seat;
          const s = Number.isInteger(seat) ? st.seats[seat] : null;
          if (!s || !s.bot) return err('not_bot');
          // a bot in a live hand plays it out and leaves at hand end: a host op never folds a seat
          if (this._inLiveHand(s)) { s.leaving = true; return OK; }
          this._removeSeat(seat);
          return OK;
        }
        case 'dissolve':
          // a live hand is played out first (the pot is awarded), then the table closes
          if (st.hand && !st.hand.done) { st.dissolving = true; return OK; }
          this._close(st.now, 'dissolved');
          return OK;
        default:
          return err('bad_op');
      }
    });
  }

  tick(now) {
    if (this.s.phase === 'closed') return false;
    this._clock(now);
    let changed = false;
    for (let guard = 0; guard < 1000; guard++) {
      const ev = this._nextEvent();
      if (!ev || ev.at > this.s.now) break;
      this._fire(ev, this.s.now);
      changed = true;
      if (this.s.phase === 'closed') break;
    }
    if (changed) {
      this._housekeep();
      this.s.rev++;
    }
    return changed;
  }

  // ---------- internals ----------
  _clock(now) {
    if (typeof now === 'number' && Number.isFinite(now) && now > this.s.now) this.s.now = now;
  }

  _mut(now, fn) {
    this._clock(now);
    const r = fn();
    if (r.ok) {
      this._housekeep();
      this.s.rev++;
    }
    return r;
  }

  _bankStart() {
    return Math.min(this.s.settings.timeBankSec * 1000, TIMING.bankCap);
  }

  _inLiveHand(s) {
    const h = this.s.hand;
    return !!(h && !h.done && s.inHand);
  }

  _humanCount() {
    return this.s.seats.filter((s) => s && !s.bot && !s.leaving).length;
  }

  _paused() {
    return this.s.options.pauseWithoutHumans && this._humanCount() === 0;
  }

  _eligible() {
    const out = [];
    this.s.seats.forEach((s, i) => { if (s && !s.leaving && !s.sitOut && s.stack > 0) out.push(i); });
    return out;
  }

  _canDeal() {
    return !this._paused() && this._eligible().length >= 2;
  }

  _housekeep() {
    const st = this.s;
    if (st.phase === 'closed') return;
    if (this._humanCount() === 0) { if (st.idleSince === null) st.idleSince = st.now; } else st.idleSince = null;
    if (st.phase === 'running' && !st.hand && !st.pending && this._canDeal()) {
      st.pending = { kind: 'deal', at: st.now + TIMING.startDelay };
    }
  }

  _nextEvent() {
    const st = this.s;
    if (st.phase === 'closed') return null;
    let best = null;
    const consider = (at, kind, seat = null) => { if (best === null || at < best.at) best = { at, kind, seat }; };
    const h = st.hand;
    if (h && !h.done && h.toAct !== null && h.deadline !== null) consider(h.deadline, 'clock');
    if (st.pending) consider(st.pending.at, 'pending');
    st.seats.forEach((s, i) => {
      if (!s || this._inLiveHand(s)) return;
      if (s.sitOut && s.sitOutSince !== null) consider(s.sitOutSince + TIMING.sitOutMax, 'sitout', i);
      if (s.stack === 0 && s.pendingTopUp === 0 && s.bustedSince !== null) consider(s.bustedSince + TIMING.bustedMax, 'busted', i);
    });
    if (st.options.pauseWithoutHumans && st.idleSince !== null && !(h && !h.done)) consider(st.idleSince + TIMING.idleClose, 'idle');
    return best;
  }

  _fire(ev, now) {
    const st = this.s;
    switch (ev.kind) {
      case 'clock': return this._onClock(now);
      case 'pending': {
        const p = st.pending;
        st.pending = null;
        if (p.kind === 'street') return this._dealStreet(now, false);
        if (p.kind === 'runout') return this._dealStreet(now, true);
        if (p.kind === 'next') return this._onNext(now);
        if (p.kind === 'deal') { if (st.phase === 'running' && !st.hand) this._dealHand(now); return; }
        return;
      }
      case 'sitout':
      case 'busted':
        return this._leave(ev.seat, now);
      case 'idle':
        return this._close(now, 'idle');
    }
  }

  _onClock(now) {
    const h = this.s.hand;
    const s = this.s.seats[h.toAct];
    if (!h.usingBank && s.bankMs > 0) {
      h.usingBank = true;
      h.bankStart = h.deadline;
      h.deadline = h.deadline + s.bankMs;
      return;
    }
    if (h.usingBank) s.bankMs = 0;
    const seat = h.toAct;
    s.timeouts++;
    const L = this._legal(seat);
    this._applyAction(seat, L.check ? 'check' : 'fold', null, now, true);
    if (s.timeouts >= 2 && !s.sitOut) {
      s.sitOut = true;
      s.sitOutSince = now;
      s.postBB = false;
    }
  }

  // Legal moves of the seat to act. minRaiseTo/maxRaiseTo are totals for this street (null when no raise is
  // allowed). Raising needs chips beyond a call, another player who can still respond, and either no action yet
  // on this street or a full raise (or several short all-ins adding up to one) since this seat last acted.
  _legal(seat) {
    const h = this.s.hand;
    const s = this.s.seats[seat];
    const toCall = Math.max(0, h.currentBet - s.bet);
    const maxTo = s.bet + s.stack;
    let othersActive = 0;
    this.s.seats.forEach((o, i) => { if (o && i !== seat && o.inHand && !o.folded && !o.allin) othersActive++; });
    const reopened = s.actedBet === null || h.currentBet - s.actedBet >= h.lastRaise;
    const canRaise = maxTo > h.currentBet && reopened && othersActive > 0;
    return {
      fold: true,
      check: toCall === 0,
      call: Math.min(toCall, s.stack),
      minRaiseTo: canRaise ? Math.min(h.currentBet + h.lastRaise, maxTo) : null,
      maxRaiseTo: canRaise ? maxTo : null,
      canRaise,
    };
  }

  _live() {
    const out = [];
    this.s.seats.forEach((s, i) => { if (s && s.inHand && !s.folded) out.push(i); });
    return out;
  }

  _needsAction(i) {
    const s = this.s.seats[i];
    return !!(s && s.inHand && !s.folded && !s.allin && (!s.acted || s.bet < this.s.hand.currentBet));
  }

  _streetClosed() {
    const h = this.s.hand;
    const live = this._live();
    const active = live.filter((i) => !this.s.seats[i].allin);
    if (active.length === 0) return true;
    if (active.length === 1) {
      const p = this.s.seats[active[0]];
      let maxOther = 0;
      for (const i of live) if (i !== active[0]) maxOther = Math.max(maxOther, this.s.seats[i].bet);
      return p.bet >= maxOther;
    }
    return active.every((i) => {
      const s = this.s.seats[i];
      return s.acted && s.bet === h.currentBet;
    });
  }

  _nextToAct(from) {
    const n = this.s.seats.length;
    for (let k = 1; k <= n; k++) {
      const j = (from + k) % n;
      if (this._needsAction(j)) return j;
    }
    return null;
  }

  _setToAct(seat, now) {
    const h = this.s.hand;
    h.toAct = seat;
    h.usingBank = false;
    h.bankStart = null;
    h.deadline = this.s.seats[seat].bot ? null : now + this.s.settings.actionSec * 1000;
  }

  _put(s, amt) {
    s.stack -= amt;
    s.bet += amt;
    s.contrib += amt;
    if (s.stack === 0) s.allin = true;
  }

  _applyAction(seat, kind, to, now, timeout) {
    const h = this.s.hand;
    const s = this.s.seats[seat];
    let a;
    let amt = null;
    h.usingBank = false;
    h.deadline = null;
    h.bankStart = null;
    if (kind === 'fold') {
      s.folded = true;
      a = 'fold';
    } else if (kind === 'check') {
      s.acted = true;
      s.actedBet = h.currentBet;
      a = 'check';
    } else if (kind === 'call') {
      this._put(s, Math.min(h.currentBet - s.bet, s.stack));
      s.acted = true;
      s.actedBet = h.currentBet;
      a = s.allin ? 'allin' : 'call';
      amt = s.bet;
    } else {
      const prev = h.currentBet;
      this._put(s, to - s.bet);
      const inc = to - prev;
      if (inc >= h.lastRaise) h.lastRaise = inc;
      h.currentBet = to;
      this.s.seats.forEach((o, i) => { if (o && i !== seat && o.inHand && !o.folded && !o.allin) o.acted = false; });
      s.acted = true;
      s.actedBet = to;
      a = s.allin ? 'allin' : prev === 0 ? 'bet' : 'raise';
      amt = to;
      if (h.street === 'river') h.riverAggressor = seat;
    }
    if (timeout) a = 'timeout';
    s.last = { a, amt };
    h.log.push({ seat, a, amt, street: h.street });
    const live = this._live();
    if (live.length === 1) return this._endUncontested(now, live[0]);
    if (this._streetClosed()) return this._closeStreet(now);
    this._setToAct(this._nextToAct(seat), now);
  }

  // A seat leaves: a live hand is folded at once, the seat is freed at hand end. An all-in hand plays on, and so
  // does any hand once betting is over (a run-out, or no one left who could still bet): no decision is left to fold.
  _leave(seat, now) {
    const st = this.s;
    const s = st.seats[seat];
    if (!s) return;
    const h = st.hand;
    if (this._inLiveHand(s)) {
      s.leaving = true;
      const active = this._live().filter((i) => !st.seats[i].allin);
      const bettingOver = h.runout || (h.toAct === null && active.length <= 1);
      if (!s.folded && !s.allin && !bettingOver) {
        if (h.toAct === seat) {
          if (h.usingBank) s.bankMs = Math.max(0, s.bankMs - Math.max(0, now - h.bankStart));
          this._applyAction(seat, 'fold', null, now, false);
        } else {
          s.folded = true;
          s.last = { a: 'fold', amt: null };
          h.log.push({ seat, a: 'fold', amt: null, street: h.street });
          const live = this._live();
          if (live.length === 1) this._endUncontested(now, live[0]);
          // the folder's bet may have been the only thing the player to act still faced
          else if (h.toAct !== null && this._streetClosed()) this._closeStreet(now);
        }
      }
    } else {
      this._removeSeat(seat);
    }
  }

  _removeSeat(seat) {
    const s = this.s.seats[seat];
    if (!s) return;
    if (!s.bot) {
      const amount = s.stack + s.pendingTopUp;
      if (amount > 0) this.s.queue.chips.push({ accountId: s.id, amount, reason: 'cashout' });
    }
    this.s.seats[seat] = null;
  }

  _handOffHost(oldId) {
    let best = null;
    this.s.seats.forEach((s, i) => {
      if (!s || s.bot || s.leaving || s.id === oldId) return;
      if (!best || s.seatedAt < best.s.seatedAt || (s.seatedAt === best.s.seatedAt && i < best.i)) best = { s, i };
    });
    if (best) this.s.host = { id: best.s.id, pid: best.s.pid };
  }

  _dealHand(now) {
    const st = this.s;
    if (this._paused()) return false;
    const eligible = this._eligible();
    if (eligible.length < 2) return false;
    let R = eligible.filter((i) => !st.seats[i].waiting || st.seats[i].postBB);
    let W = eligible.filter((i) => st.seats[i].waiting && !st.seats[i].postBB);
    if (st.handNo === 0 || R.length < 2) { R = eligible; W = []; }
    else if (R.length === 2 && W.length) {
      // a brand-new seat at a heads-up table is dealt in at once; a player back from sitting out still waits for
      // the big blind (or posts one)
      const fresh = W.filter((i) => st.seats[i].handsDealt === 0);
      R = [...R, ...fresh].sort((a, b) => a - b);
      W = W.filter((i) => !fresh.includes(i));
    }
    const n = st.seats.length;
    const nextIn = (list, from) => {
      for (let k = 1; k <= n; k++) { const j = (from + k) % n; if (list.includes(j)) return j; }
      return list[0];
    };
    const prevIn = (list, from) => {
      for (let k = 1; k <= n; k++) { const j = (from - k + n) % n; if (list.includes(j)) return j; }
      return list[0];
    };
    let button, sb, bb, dealt;
    if (R.length === 2) {
      // heads-up: the big blind moves on from last hand's big blind, so nobody posts it twice running (also when a
      // table drops to two); a waiting player it reaches is dealt in as the big blind, three-handed
      if (st.button === null) { button = R[this.rng(R.length)]; bb = nextIn(R, button); }
      else bb = nextIn([...R, ...W], Number.isInteger(st.lastBB) ? st.lastBB : st.button);
      if (W.includes(bb)) {
        sb = prevIn(R, bb);
        button = R.find((i) => i !== sb);
        dealt = [...R, bb].sort((a, b) => a - b);
      } else {
        button = R.find((i) => i !== bb);
        sb = button;
        dealt = R.slice();
      }
    } else {
      button = st.button === null ? R[this.rng(R.length)] : nextIn(R, st.button);
      sb = nextIn(R, button);
      bb = nextIn([...R, ...W], sb);
      dealt = W.includes(bb) ? [...R, bb].sort((a, b) => a - b) : R.slice();
    }
    st.button = button;
    st.lastBB = bb;
    const no = ++st.handNo;
    const h = {
      id: `${st.code}-${no}`, no, street: 'preflop', board: [], deck: shuffledDeck(this.rng), burns: [],
      button, sbSeat: sb, bbSeat: bb, dealt, toAct: null, deadline: null, usingBank: false, bankStart: null,
      currentBet: 0, lastRaise: st.settings.bb, riverAggressor: null, pots: [], winners: null, done: false,
      uncontested: false, runout: false, shown: {}, log: [],
    };
    st.hand = h;
    st.seats.forEach((s) => { if (s) Object.assign(s, handFields()); });
    st.seats.forEach((s) => { if (s && s.sitOut) s.sitOutMissed = true; });
    for (const i of dealt) {
      const s = st.seats[i];
      s.inHand = true;
      s.hole = [];
      s.startStack = s.stack;
      s.waiting = false;
      s.sitOutMissed = false;
      s.handsDealt++;
      if (s.handsDealt % TIMING.bankEvery === 0) s.bankMs = Math.min(s.bankMs + TIMING.bankStep, TIMING.bankCap);
    }
    const order = [];
    for (let k = 1; k <= n; k++) { const j = (button + k) % n; if (dealt.includes(j)) order.push(j); }
    for (let r = 0; r < 2; r++) for (const i of order) st.seats[i].hole.push(h.deck.shift());
    this._post(sb, st.settings.sb, 'sb');
    this._post(bb, st.settings.bb, 'bb');
    for (const i of order) {
      const s = st.seats[i];
      // a returning player posts a full big blind wherever it sits: in the small blind, the rest goes in dead
      if (s.postBB && i === sb) this._postDead(i, st.settings.bb - st.settings.sb);
      else if (s.postBB && i !== bb) this._post(i, st.settings.bb, 'bb');
      s.postBB = false;
    }
    h.currentBet = st.settings.bb;
    h.lastRaise = st.settings.bb;
    if (this._streetClosed()) this._closeStreet(now);
    else this._setToAct(this._nextToAct(bb), now);
    return true;
  }

  _post(i, amount, kind) {
    const s = this.s.seats[i];
    this._put(s, Math.min(amount, s.stack));
    s.last = { a: kind, amt: s.bet };
    this.s.hand.log.push({ seat: i, a: kind, amt: s.bet, street: 'preflop' });
  }

  // Only a live top bettor takes back the part nobody matched (folded bets count as matching). A folded seat
  // forfeits every chip it put in: an uncalled bet of a folder stays in the pot (buildPots adds it to the last pot).
  // dead money: in the pot (contrib) but not part of the seat's bet, so it calls nothing and is never returned
  _postDead(i, amount) {
    const s = this.s.seats[i];
    const h = this.s.hand;
    const d = Math.min(amount, s.stack);
    if (d <= 0) return;
    s.stack -= d;
    s.contrib += d;
    if (s.stack === 0) s.allin = true;
    h.dead = (h.dead || 0) + d;
    h.log.push({ seat: i, a: 'dead', amt: d, street: 'preflop' });
  }

  _returnUncalled() {
    const bets = this.s.seats.map((s) => (s && s.inHand ? s.bet : 0));
    const u = uncalledBet(bets);
    if (!u) return;
    const s = this.s.seats[u.seat];
    if (s.folded) return;
    s.bet -= u.amount;
    s.contrib -= u.amount;
    s.stack += u.amount;
    if (s.stack > 0) s.allin = false;
  }

  _collect() {
    const h = this.s.hand;
    const contrib = this.s.seats.map((s) => (s && s.inHand ? s.contrib : 0));
    const folded = this.s.seats.map((s) => !s || !s.inHand || s.folded);
    h.pots = buildPots(contrib, folded);
    h.dead = 0;
    this.s.seats.forEach((s) => { if (s && s.inHand) { s.bet = 0; s.acted = false; s.actedBet = null; } });
    h.currentBet = 0;
    h.lastRaise = this.s.settings.bb;
  }

  _expose(i) {
    const s = this.s.seats[i];
    s.shown = s.hole.slice();
    this.s.hand.shown[i] = s.shown.slice();
  }

  _closeStreet(now) {
    const h = this.s.hand;
    h.toAct = null;
    h.deadline = null;
    h.usingBank = false;
    this._returnUncalled();
    this._collect();
    if (h.street === 'river') return this._showdown(now);
    const live = this._live();
    const active = live.filter((i) => !this.s.seats[i].allin);
    if (active.length <= 1) {
      if (!h.runout) {
        h.runout = true;
        for (const i of live) this._expose(i);
      }
      this.s.pending = { kind: 'runout', at: now + TIMING.runout };
    } else {
      this.s.pending = { kind: 'street', at: now + TIMING.street };
    }
  }

  _dealStreet(now, runout) {
    const h = this.s.hand;
    if (!h || h.done) return;
    h.burns.push(h.deck.shift());
    const k = h.street === 'preflop' ? 3 : 1;
    for (let j = 0; j < k; j++) h.board.push(h.deck.shift());
    h.street = STREETS[STREETS.indexOf(h.street) + 1];
    if (runout) {
      if (h.street === 'river') return this._showdown(now);
      this.s.pending = { kind: 'runout', at: now + TIMING.runout };
      return;
    }
    if (this._streetClosed()) return this._closeStreet(now);
    this._setToAct(this._nextToAct(h.button), now);
  }

  _showdown(now) {
    const st = this.s;
    const h = st.hand;
    h.street = 'showdown';
    h.toAct = null;
    const n = st.seats.length;
    const live = this._live();
    const info = {};
    for (const i of live) info[i] = evaluate([...st.seats[i].hole, ...h.board]);
    const ranks = {};
    if (h.runout) {
      for (const i of live) ranks[i] = info[i].rank;
    } else {
      let start = h.riverAggressor;
      if (start === null || !live.includes(start)) {
        start = null;
        for (let k = 1; k <= n && start === null; k++) { const j = (h.button + k) % n; if (live.includes(j)) start = j; }
      }
      const order = [];
      for (let k = 0; k < n; k++) { const j = (start + k) % n; if (live.includes(j)) order.push(j); }
      for (const i of order) {
        let show = Object.keys(ranks).length === 0;
        for (const pot of h.pots) {
          if (show) break;
          if (!pot.seats.includes(i)) continue;
          let best = null;
          for (const j of pot.seats) if (ranks[j] !== undefined && (best === null || ranks[j] > best)) best = ranks[j];
          if (best === null || info[i].rank >= best) show = true;
        }
        const s = st.seats[i];
        if (show) {
          ranks[i] = info[i].rank;
          this._expose(i);
          s.last = { a: 'show', amt: null };
          h.log.push({ seat: i, a: 'show', amt: null, street: 'showdown' });
        } else {
          s.mucked = true;
          s.last = { a: 'muck', amt: null };
          h.log.push({ seat: i, a: 'muck', amt: null, street: 'showdown' });
        }
      }
    }
    for (const i of live) st.seats[i].wentToShowdown = true;
    const awards = awardPots(h.pots, ranks, oddChipOrder(h.button, n));
    h.winners = awards.map((w) => ({
      seat: w.seat, amt: w.amt, pot: w.pot,
      hand: { cat: info[w.seat].cat, name: info[w.seat].name, cards: info[w.seat].cards },
    }));
    for (const w of awards) { st.seats[w.seat].stack += w.amt; st.seats[w.seat].won += w.amt; }
    this._endHand(now, true);
  }

  _endUncontested(now, winner) {
    const st = this.s;
    const h = st.hand;
    h.toAct = null;
    h.deadline = null;
    h.usingBank = false;
    st.pending = null;
    this._returnUncalled();
    this._collect();
    const awards = awardPots(h.pots, { [winner]: 0 }, oddChipOrder(h.button, st.seats.length));
    h.winners = awards.map((w) => ({ seat: w.seat, amt: w.amt, pot: w.pot, hand: null }));
    for (const w of awards) { st.seats[w.seat].stack += w.amt; st.seats[w.seat].won += w.amt; }
    h.uncontested = true;
    this._endHand(now, false);
  }

  _endHand(now, showdown) {
    const st = this.s;
    const h = st.hand;
    h.done = true;
    h.toAct = null;
    h.deadline = null;
    h.usingBank = false;
    for (const i of h.dealt) {
      const s = st.seats[i];
      if (!s || s.bot) continue;
      st.queue.records.push({
        accountId: s.id, hands: 1, won: s.won > 0 ? 1 : 0, biggestPot: s.won,
        net: s.stack - s.startStack, showdowns: s.wentToShowdown ? 1 : 0,
      });
    }
    st.seats.forEach((s) => {
      if (!s) return;
      if (s.pendingTopUp > 0) {
        // a top-up never lifts the stack above the max buy-in (the seat may have won the hand): the rest goes back
        const add = Math.max(0, Math.min(s.pendingTopUp, st.settings.maxBuyIn - s.stack));
        const back = s.pendingTopUp - add;
        if (back > 0 && !s.bot) st.queue.chips.push({ accountId: s.id, amount: back, reason: 'topup_back' });
        s.stack += add;
        s.pendingTopUp = 0;
      }
      if (s.inHand) s.bustedSince = s.stack === 0 ? now : null;
    });
    st.seats.forEach((s, i) => { if (s && s.leaving) this._removeSeat(i); });
    st.pending = { kind: 'next', at: now + (showdown ? TIMING.holdShowdown : TIMING.hold) };
  }

  _onNext(now) {
    const st = this.s;
    const h = st.hand;
    if (h) st.last = { no: h.no, board: h.board.slice(), winners: h.winners || [], shown: { ...h.shown } };
    st.hand = null;
    st.seats.forEach((s) => { if (s) Object.assign(s, handFields()); });
    if (st.dissolving) return this._close(now, 'dissolved');
    if (st.phase === 'running') this._dealHand(now);
  }

  _close(now, reason) {
    const st = this.s;
    const h = st.hand;
    if (h && !h.done) {
      // a cancelled hand: everyone gets back what they put in; no records
      st.seats.forEach((s) => { if (s && s.inHand) { s.stack += s.contrib; s.contrib = 0; s.bet = 0; } });
    }
    st.seats.forEach((s) => { if (s) { s.leaving = true; } });
    st.seats.forEach((s, i) => { if (s) this._removeSeat(i); });
    st.hand = null;
    st.pending = null;
    st.phase = 'closed';
    st.closedReason = reason;
    st.idleSince = null;
  }
}
