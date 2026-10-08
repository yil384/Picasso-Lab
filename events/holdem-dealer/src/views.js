// views.js - the hidden-information boundary. Every message about a table is built here, from scratch, by explicit
// field picks (never by copying table state wholesale). Nothing here reads the deck or the burn cards, and a seat's
// hole cards are read in exactly one place: me(), for that seat's own account, while the hand is live for it.
// Other players' cards reach a view only through `shown` (set by the engine when the rules expose a hand: all-in
// run-out, showdown, voluntary show) and through winners' best five (winners at showdown are always shown).
//
// Exports (shapes: DESIGN.md section 6)
//   publicTable(table, now?) -> PublicTable   now (ms) only refines the time bank of a seat using its bank
//   me(table, accountId, account?) -> Me | null   account = { pid, chips } for the bankroll (rooms layer)
//   viewFor(table, seat) -> { table: PublicTable, me: Me }   what a player in that seat sees (bots use this)

import { evaluate } from './engine/evaluator.js';

const two = (c) => [c[0], c[1]];
const handInfo = (x) => (x ? { cat: x.cat, name: x.name, cards: x.cards.slice(0, 5) } : null);
const winners = (ws) => ws.map((w) => ({ seat: w.seat, amt: w.amt, pot: w.pot, hand: handInfo(w.hand) }));

function seatState(s, h) {
  if (h && s.inHand) {
    if (s.folded || s.mucked) return 'folded';
    return s.allin ? 'allin' : 'playing';
  }
  if (s.sitOut) return 'out';
  if (s.stack === 0 && s.pendingTopUp === 0) return 'busted';
  if (s.waiting) return 'waiting';
  return 'playing';
}

function publicSeat(s, i, h, now) {
  const dealt = !!(h && s.inHand);
  let timeBank = Math.floor(s.bankMs / 1000);
  if (h && !h.done && h.toAct === i && h.usingBank && typeof now === 'number' && h.deadline !== null) {
    timeBank = Math.max(0, Math.ceil((h.deadline - now) / 1000));
  }
  return {
    pid: s.pid,
    name: s.name,
    bot: s.bot || null,
    stack: s.stack,
    bet: s.bet,
    state: seatState(s, h),
    connected: !!s.connected,
    inHand: dealt && !s.folded && !s.mucked,
    shown: dealt && s.shown ? two(s.shown) : null,
    last: s.last ? { a: s.last.a, amt: s.last.amt } : null,
    timeBank,
  };
}

export function publicTable(table, now) {
  const h = table.hand;
  const st = table.settings;
  const last = table.last;
  return {
    code: table.code,
    phase: table.phase,
    host: table.host ? table.host.pid : null,
    rev: table.rev,
    settings: {
      sb: st.sb, bb: st.bb, minBuyIn: st.minBuyIn, maxBuyIn: st.maxBuyIn, seats: st.seats,
      actionSec: st.actionSec, timeBankSec: st.timeBankSec,
    },
    seats: table.seats.map((s, i) => (s ? publicSeat(s, i, h, now) : null)),
    hand: h ? {
      id: h.id,
      no: h.no,
      street: h.street,
      board: h.board.slice(),
      button: h.button,
      sbSeat: h.sbSeat,
      bbSeat: h.bbSeat,
      toAct: h.toAct,
      deadline: h.deadline,
      usingBank: !!h.usingBank,
      currentBet: h.currentBet,
      minRaiseTo: h.currentBet + h.lastRaise,
      pots: h.pots.map((p) => ({ amt: p.amt, seats: p.seats.slice() })),
      winners: h.winners ? winners(h.winners) : null,
      done: !!h.done,
    } : null,
    log: h ? h.log.map((e) => ({ seat: e.seat, a: e.a, amt: e.amt, street: e.street })) : [],
    last: last ? {
      no: last.no,
      board: last.board.slice(),
      winners: winners(last.winners),
      shown: Object.fromEntries(Object.entries(last.shown).map(([seat, c]) => [seat, two(c)])),
    } : null,
  };
}

export function me(table, accountId, account = null) {
  if (accountId === null || accountId === undefined) return null;
  const seat = table.seatOf(accountId);
  const s = seat >= 0 ? table.seats[seat] : null;
  const h = table.hand;
  // own cards only while this seat still holds them (a folded or mucked hand is sent to nobody)
  const holds = !!(s && h && s.inHand && s.hole && s.hole.length === 2 && !s.folded && !s.mucked);
  const hole = holds ? two(s.hole) : null;
  let best = null;
  if (holds && h.board.length >= 3) best = handInfo(evaluate([...hole, ...h.board]));
  return {
    pid: s ? s.pid : account?.pid ?? null,
    seat: s ? seat : null,
    chips: account && Number.isFinite(account.chips) ? account.chips : null,
    hole,
    best,
    legal: s ? table.legalFor(seat) : null,
    canShow: s ? table.canShow(seat) : false,
    pendingTopUp: s ? s.pendingTopUp : 0,
  };
}

export function viewFor(table, seat) {
  const s = table.seats[seat];
  return { table: publicTable(table), me: me(table, s ? s.id : null) };
}
