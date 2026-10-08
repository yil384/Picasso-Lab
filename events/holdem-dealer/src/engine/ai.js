// Bot decisions. Input is ONLY the view a human in the bot's seat would get (views.viewFor(seat)): its own two
// cards and the public table. It never receives the table object, the deck or anyone else's cards, so it cannot
// peek; it reads only the documented PublicTable / Me fields.
//
// Play: pre-flop strength from each of the 169 starting hands' equity against N random hands (Monte Carlo, built
// lazily per N with a fixed seed, so every process gets the same table) turned into a percentile; position,
// number of players, raises faced, pot odds, implied odds for pairs/suited hands and draws, stack-to-pot ratio.
// Post-flop: Monte Carlo equity against the remaining opponents' random hands (bounded iterations, a few ms),
// discounted when facing big bets; draws (flush, open-ended, gutshot); sizing 1/3..1 pot, overbets rarely; some
// randomness everywhere. Four personalities:
//   steady  tight, value-heavy, rarely bluffs, believes big bets
//   fierce  loose-aggressive: opens and 3-bets wide, bets big, bluffs and barrels more
//   sly     traps: slow-plays strong hands, check-raises, semi-bluffs draws
//   veteran balanced: medium ranges, mixed sizes and frequencies
//
// Exports
//   STYLES
//   decide(view, { rng, style, budget = 1 }) -> { action: "fold"|"check"|"call"|"raise"|"allin", to: int|null }
//        always legal for view.me.legal (null when it is not this seat's turn); budget scales Monte Carlo work;
//        style defaults to the seat's public `bot` field; rng defaults to Math.random (bots need no crypto)
//   thinkDelay(view, decision, rng) -> ms   recommended pause before acting (700..2400, longer for big decisions)
//   preflopTable(nOpp) -> { equity: Map(class -> eq), top: Map(class -> percentile 0 best..1 worst) }
//   warmup()                               builds the pre-flop tables for 1..8 opponents (~1 s; call at startup)
//   handClass(cardA, cardB) -> "AKs" | "QJo" | "77"
//   equity(holeInts, boardInts, nOpp, iters, rng) -> 0..1 (ties shared)
//   draws(holeInts, boardInts) -> { flush, oesd, gut }   flop/turn draws that use a hole card

import { cardIndex, seededRng, RANKS } from './cards.js';
import { rank7 } from './evaluator.js';

export const STYLES = ['steady', 'fierce', 'sly', 'veteran'];

const PERSONAS = {
  //          open  3bet  call  steal  bluff3 limp  value valueRaise slow  checkRaise semi  bluff overbet respect sizes        callMargin
  steady:  { open: 0.15, threeBet: 0.045, call: 0.55, steal: 0.10, bluff3: 0.00, limp: 0.05, value: 1.40, raiseV: 1.60, slow: 0.06, checkRaise: 0.05, semi: 0.20, bluff: 0.03, overbet: 0.01, respect: 1.00, sizes: [0.5, 0.75], margin: 0.05 },
  fierce:  { open: 0.38, threeBet: 0.12, call: 0.75, steal: 0.55, bluff3: 0.10, limp: 0.02, value: 1.20, raiseV: 1.40, slow: 0.03, checkRaise: 0.10, semi: 0.60, bluff: 0.20, overbet: 0.08, respect: 0.45, sizes: [0.66, 1.0], margin: -0.04 },
  sly:     { open: 0.24, threeBet: 0.06, call: 0.80, steal: 0.25, bluff3: 0.03, limp: 0.20, value: 1.30, raiseV: 1.50, slow: 0.40, checkRaise: 0.45, semi: 0.55, bluff: 0.07, overbet: 0.03, respect: 0.75, sizes: [0.33, 0.66], margin: 0.0 },
  veteran: { open: 0.22, threeBet: 0.07, call: 0.65, steal: 0.35, bluff3: 0.04, limp: 0.06, value: 1.30, raiseV: 1.50, slow: 0.12, checkRaise: 0.15, semi: 0.40, bluff: 0.09, overbet: 0.03, respect: 0.75, sizes: [0.5, 0.85], margin: 0.0 },
};

const mathRng = (n) => Math.floor(Math.random() * n);

// ---------- equity ----------
const B = new Int32Array(5);
export function equity(hole, board, nOpp, iters, rng) {
  const dead = new Uint8Array(52);
  for (const c of hole) dead[c] = 1;
  for (const c of board) dead[c] = 1;
  const deck = [];
  for (let c = 0; c < 52; c++) if (!dead[c]) deck.push(c);
  const missing = 5 - board.length;
  const need = missing + 2 * nOpp;
  for (let i = 0; i < board.length; i++) B[i] = board[i];
  const h0 = hole[0], h1 = hole[1];
  let score = 0;
  const L = deck.length;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < need; i++) {
      const j = i + rng(L - i);
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    for (let i = 0; i < missing; i++) B[board.length + i] = deck[i];
    const me = rank7(h0, h1, B[0], B[1], B[2], B[3], B[4]);
    let best = -1, ties = 0;
    for (let o = 0; o < nOpp; o++) {
      const k = missing + 2 * o;
      const r = rank7(deck[k], deck[k + 1], B[0], B[1], B[2], B[3], B[4]);
      if (r > best) { best = r; ties = r === me ? 1 : 0; } else if (r === best && r === me) ties++;
    }
    if (me > best) score += 1;
    else if (me === best) score += 1 / (ties + 1);
  }
  return score / iters;
}

export function handClass(a, b) {
  const x = typeof a === 'number' ? a : cardIndex(a);
  const y = typeof b === 'number' ? b : cardIndex(b);
  const r1 = Math.max(x >> 2, y >> 2), r2 = Math.min(x >> 2, y >> 2);
  if (r1 === r2) return RANKS[r1] + RANKS[r2];
  return RANKS[r1] + RANKS[r2] + ((x & 3) === (y & 3) ? 's' : 'o');
}

const CLASSES = [];
for (let r1 = 12; r1 >= 0; r1--) {
  for (let r2 = r1; r2 >= 0; r2--) {
    if (r1 === r2) CLASSES.push({ key: RANKS[r1] + RANKS[r2], cards: [r1 * 4, r2 * 4 + 1], combos: 6 });
    else {
      CLASSES.push({ key: RANKS[r1] + RANKS[r2] + 's', cards: [r1 * 4, r2 * 4], combos: 4 });
      CLASSES.push({ key: RANKS[r1] + RANKS[r2] + 'o', cards: [r1 * 4, r2 * 4 + 1], combos: 12 });
    }
  }
}

const PF = new Map();
export function preflopTable(nOpp) {
  const n = Math.max(1, Math.min(8, nOpp | 0));
  if (PF.has(n)) return PF.get(n);
  const rng = seededRng(0x5eed + n * 7919);
  const iters = n <= 2 ? 3000 : 2000;
  const eq = new Map();
  for (const c of CLASSES) eq.set(c.key, equity(c.cards, [], n, iters, rng));
  const sorted = CLASSES.slice().sort((p, q) => eq.get(q.key) - eq.get(p.key));
  const top = new Map();
  let acc = 0;
  for (const c of sorted) { top.set(c.key, (acc + c.combos / 2) / 1326); acc += c.combos; }
  const t = { equity: eq, top };
  PF.set(n, t);
  return t;
}

export function warmup() {
  for (let n = 1; n <= 8; n++) preflopTable(n);
}

// ---------- reading the view ----------
function readSpot(view) {
  const me = view.me;
  const t = view.table;
  const h = t.hand;
  const seats = t.seats;
  const n = seats.length;
  const seat = me.seat;
  const mine = seats[seat];
  let pot = 0;
  for (const p of h.pots) pot += p.amt;
  for (const s of seats) if (s) pot += s.bet;
  const opps = [];
  for (let i = 0; i < n; i++) if (i !== seat && seats[i] && seats[i].inHand) opps.push(i);
  // acting order this street: post-flop from left of the button; position 1 = last to act
  const ord = (i) => (i - h.button - 1 + n) % n;
  const live = [seat, ...opps].sort((a, b) => ord(a) - ord(b));
  const pos = live.length > 1 ? live.indexOf(seat) / (live.length - 1) : 1;
  let maxOpp = 0;
  for (const i of opps) maxOpp = Math.max(maxOpp, seats[i].stack + seats[i].bet);
  const eff = Math.min(mine.stack + mine.bet, maxOpp);
  const streetLog = t.log.filter((e) => e.street === h.street);
  // raises this street (blinds are not raises); calls before any raise pre-flop are limpers
  let raises = 0, limpers = 0;
  let cur = h.street === 'preflop' ? t.settings.bb : 0;
  for (const e of streetLog) {
    if ((e.a === 'bet' || e.a === 'raise' || e.a === 'allin') && e.amt > cur) { raises++; cur = e.amt; }
    else if (e.a === 'call' && raises === 0 && h.street === 'preflop') limpers++;
  }
  const myActs = streetLog.filter((e) => e.seat === seat).map((e) => e.a);
  // pre-flop: live opponents still to act after me (the big blind acts last); players dealt this hand
  const ordPF = (i) => (i - h.bbSeat - 1 + n) % n;
  const behind = opps.filter((i) => ordPF(i) > ordPF(seat)).length;
  let dealt = 0;
  for (const s of seats) if (s && (s.inHand || s.state === 'folded')) dealt++;
  return {
    me, t, h, seats, n, seat, mine, pot, opps, nOpp: Math.max(1, opps.length), pos, eff,
    raises, myActs, limpers, behind, dealt, bb: t.settings.bb, L: me.legal,
    hole: me.hole.map(cardIndex), board: h.board.map(cardIndex),
  };
}

// Draws on the flop/turn: a four-flush using a hole card; straight draws from 14-bit rank windows (ace both low
// and high), counted by distinct completing ranks: two or more = open-ended (or double gutter), one = gutshot.
export function draws(hole, board) {
  const none = { flush: false, oesd: false, gut: false };
  if (board.length < 3 || board.length >= 5) return none;
  const all = [...hole, ...board];
  const suitCnt = [0, 0, 0, 0];
  for (const c of all) suitCnt[c & 3]++;
  let flush = false;
  for (let s = 0; s < 4; s++) if (suitCnt[s] === 4 && hole.some((c) => (c & 3) === s)) flush = true;
  const toMask = (cards) => {
    let m = 0;
    for (const c of cards) { const r = c >> 2; m |= 1 << (r + 1); if (r === 12) m |= 1; }
    return m;
  };
  const m = toMask(all);
  const hm = toMask(hole);
  const outs = new Set();
  for (let lo = 0; lo <= 9; lo++) {
    const w = (m >> lo) & 31;
    if (w === 31) return { flush, oesd: false, gut: false }; // already a straight
    if (!((hm >> lo) & 31)) continue;
    let cnt = 0, miss = -1;
    for (let k = 0; k < 5; k++) { if ((w >> k) & 1) cnt++; else miss = lo + k; }
    if (cnt === 4) outs.add(miss === 0 ? 13 : miss);
  }
  return { flush, oesd: outs.size >= 2, gut: outs.size === 1 };
}

// ---------- decisions ----------
function pick(rng, lo, hi) {
  return lo + (hi - lo) * (rng(1000) / 1000);
}

function raiseTo(sp, frac) {
  // to = current bet + frac * (pot after calling)
  const toCall = sp.L.call;
  const base = sp.h.currentBet + frac * (sp.pot + toCall);
  const unit = Math.max(1, sp.t.settings.sb);
  return Math.round(base / unit) * unit;
}

function preflop(sp, P, rng) {
  const { L, bb, nOpp } = sp;
  const tab = preflopTable(nOpp);
  const key = handClass(sp.hole[0], sp.hole[1]);
  const top = tab.top.get(key);
  const eq = tab.equity.get(key);
  const toCall = L.call;
  const potOdds = toCall > 0 ? toCall / (sp.pot + toCall) : 0;
  const late = sp.pos; // post-flop position: 0 first to act .. 1 last
  // open wider with fewer players left to act behind (button ~2, small blind 1, heads-up button 1)
  const posMul = [1.8, 1.7, 1.4, 1.1, 0.95, 0.8, 0.7, 0.62, 0.55][Math.min(8, sp.behind)];
  // short-handed tables play wider ranges against wider ranges
  const short = Math.sqrt(Math.max(1, 4 / Math.max(1, sp.dealt - 1)));
  const isPair = key.length === 2;
  const suited = key.endsWith('s');
  const facing = sp.h.currentBet > bb;
  const stackBB = sp.eff / bb;
  if (!facing) {
    const openTop = P.open * posMul * (sp.limpers ? 0.85 : 1);
    if (top <= openTop) {
      if (top < 0.03 && rng(100) < P.slow * 100 * 0.5 && toCall > 0) return { action: 'call' }; // trap limp
      const size = (pick(rng, 2.2, 3.0) + sp.limpers) * bb;
      return { action: 'raise', to: Math.max(size, L.minRaiseTo || 0) };
    }
    if (!sp.limpers && sp.behind <= 2 && top <= openTop * 2 && rng(100) < P.steal * 100) {
      return { action: 'raise', to: pick(rng, 2.2, 2.8) * bb };
    }
    if (toCall === 0) return { action: 'check' };
    // limp / complete the small blind with speculative hands when cheap
    const cheap = toCall <= bb;
    if (cheap && top <= openTop * (1.4 + P.limp * 3) && (isPair || suited || rng(100) < P.limp * 100)) return { action: 'call' };
    return { action: 'fold' };
  }
  // facing a raise
  const level = sp.raises; // raises this street (blinds not counted)
  const threeTop = P.threeBet * short * Math.pow(0.45, Math.max(0, level - 1)) * (0.8 + 0.4 * late);
  const big = toCall > 0.35 * (sp.mine.stack + toCall);
  if (top <= threeTop) {
    if (big || stackBB < 25) return { action: 'allin' };
    const mult = level >= 2 ? pick(rng, 2.1, 2.5) : pick(rng, 2.8, 3.5);
    return { action: 'raise', to: sp.h.currentBet * mult };
  }
  if (!big && level === 1 && top > threeTop && top < 0.45 && (suited || isPair) && rng(100) < P.bluff3 * 100) {
    return { action: 'raise', to: sp.h.currentBet * pick(rng, 2.8, 3.4) };
  }
  // calling: price, implied odds for pairs and suited hands with deep stacks
  const callTop = P.call * P.open * short * (0.8 + 0.5 * late) * Math.pow(0.6, Math.max(0, level - 1));
  const implied = !big && (isPair || (suited && top < 0.5)) && sp.eff > 15 * toCall ? 0.35 : 0;
  const needEq = potOdds * (1 - implied) + P.margin * 0.5;
  if (big) {
    // commit decision: equity against the field must beat the price
    if (eq >= potOdds + 0.03 + P.margin && top <= Math.max(threeTop * 2.2, 0.08)) return { action: 'call' };
    return { action: 'fold' };
  }
  if ((top <= callTop && eq >= needEq) || (implied && eq >= needEq && top < callTop * 2.2)) return { action: 'call' };
  if (toCall <= bb / 2 && top <= 0.6) return { action: 'call' }; // small-blind completion vs a min-raise
  return { action: 'fold' };
}

function postflop(sp, P, rng, budget) {
  const { L, nOpp } = sp;
  const iters = Math.max(40, Math.round((nOpp >= 4 ? 3000 : 5000) * budget)); // about 1 ms; +-0.7% equity
  const raw = equity(sp.hole, sp.board, nOpp, iters, rng);
  const toCall = L.call;
  const potOdds = toCall > 0 ? toCall / (sp.pot + toCall) : 0; // sp.pot includes the bets in front
  const betRatio = toCall > 0 ? toCall / Math.max(1, sp.pot - toCall) : 0; // bet size relative to the pot it was made into
  // opponents who bet big hold stronger than random hands: discount (a personality that respects bets more,
  // discounts more); raising for value looks at a milder discount than calling
  const discount = 0.22 * Math.min(1.5, betRatio) * P.respect + 0.06 * Math.max(0, sp.raises - 1) * P.respect;
  const eq = raw * (1 - discount);
  const rel = eq * (nOpp + 1);
  const relRaise = raw * (1 - discount / 2) * (nOpp + 1);
  const d = draws(sp.hole, sp.board);
  const drawOuts = d.flush ? 9 : d.oesd ? 8 : d.gut ? 4 : 0;
  const river = sp.h.street === 'river';
  const spr = sp.eff / Math.max(1, sp.pot);
  const [s0, s1] = P.sizes;
  const strong = (toCall === 0 ? rel : relRaise) >= P.raiseV;
  if (toCall === 0) {
    if (rel >= P.value) {
      if (strong && !river && rng(100) < P.slow * 100) return { action: 'check' };
      let frac = pick(rng, s0, s1) + (strong ? 0.15 : 0);
      if (strong && rel >= P.raiseV * 1.15 && rng(100) < P.overbet * 100) frac = pick(rng, 1.2, 1.6);
      if (spr < 1.2 && rel >= P.value) return { action: 'allin' };
      return { action: 'raise', to: raiseTo(sp, frac) };
    }
    if (drawOuts >= 8 && !river && rng(100) < P.semi * 100) return { action: 'raise', to: raiseTo(sp, pick(rng, 0.45, 0.75)) };
    const bluffP = P.bluff * (nOpp === 1 ? 1 : 0.35) * (sp.pos > 0.5 ? 1.3 : 0.8);
    if (rng(1000) < bluffP * 1000) return { action: 'raise', to: raiseTo(sp, pick(rng, 0.5, 0.8)) };
    return { action: 'check' };
  }
  // facing a bet
  const checkedFirst = sp.myActs.includes('check');
  const crBoost = checkedFirst ? P.checkRaise : 0;
  if (strong || (rel >= P.value && rng(100) < crBoost * 100)) {
    if (rng(100) < P.slow * 50 && !river && !checkedFirst) return { action: 'call' }; // flat to trap
    if (spr < 1.5) return { action: 'allin' };
    return { action: 'raise', to: raiseTo(sp, pick(rng, 0.6, 1.0)) };
  }
  if (drawOuts >= 8 && !river && rng(100) < P.semi * (checkedFirst ? 60 : 25)) {
    return { action: 'raise', to: raiseTo(sp, pick(rng, 0.6, 0.9)) };
  }
  // implied odds for draws when stacks are deep relative to the call
  const implied = drawOuts && !river && sp.eff > 6 * toCall ? Math.min(0.35, (sp.eff / Math.max(1, sp.pot)) * 0.04) : 0;
  const need = potOdds * (1 - implied) + P.margin;
  if (eq >= need) return { action: 'call' };
  if (raw >= potOdds && spr < 0.6) return { action: 'call' }; // pot-committed
  return { action: 'fold' };
}

function legalize(choice, L, sp) {
  const call = () => (L.check ? { action: 'check', to: null } : { action: 'call', to: null });
  switch (choice.action) {
    case 'allin':
    case 'raise': {
      if (!L.canRaise) return call();
      let to = choice.action === 'allin' ? L.maxRaiseTo : Math.round(choice.to || 0);
      if (!Number.isFinite(to)) to = L.minRaiseTo;
      to = Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, to));
      // leave no awkward crumbs: within 15% of all-in means all-in
      if (to >= L.maxRaiseTo || L.maxRaiseTo - to <= 0.15 * L.maxRaiseTo) return { action: 'allin', to: L.maxRaiseTo };
      return { action: 'raise', to };
    }
    case 'call': return call();
    case 'check': return L.check ? { action: 'check', to: null } : { action: 'fold', to: null };
    default: return L.check ? { action: 'check', to: null } : { action: 'fold', to: null };
  }
}

export function decide(view, { rng = mathRng, style, budget = 1 } = {}) {
  const L = view.me.legal;
  if (!L) return null;
  const P = PERSONAS[style || view.table.seats[view.me.seat].bot] || PERSONAS.veteran;
  const sp = readSpot(view);
  const choice = sp.h.street === 'preflop' ? preflop(sp, P, rng) : postflop(sp, P, rng, budget);
  return legalize(choice, L, sp);
}

export function thinkDelay(view, decision, rng = mathRng) {
  let ms = 700 + rng(600);
  const L = view.me.legal;
  const t = view.table;
  if (decision && (decision.action === 'raise' || decision.action === 'allin')) ms += 300 + rng(500);
  if (L && t.hand) {
    const seat = view.me.seat;
    const stack = t.seats[seat] ? t.seats[seat].stack : 0;
    if (L.call > 0.3 * Math.max(1, stack)) ms += 500 + rng(400);
    if (t.hand.street === 'river') ms += 200;
    if (L.check && decision && decision.action === 'check') ms -= 250;
  }
  return Math.max(700, Math.min(2400, ms));
}
