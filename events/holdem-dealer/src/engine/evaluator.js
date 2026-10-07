// Poker hand evaluator: best five cards out of 5, 6 or 7.
//
// Method: four 13-bit suit masks -> rank masks for "at least 1/2/3/4 of a rank" with a few bit operations,
// plus three small tables built at load time (8,192 entries each: popcount, highest straight, top-N bits).
// No allocation on the fast path; about 15-30 M evaluations per second on one core.
//
// Rank integer (higher wins, equal = split; suits never matter):
//   rank = cat * 2^20 + sub, cat 0..8 = high, pair, two_pair, trips, straight, flush, full_house, quads,
//   straight_flush; sub encodes the tie-breakers (rank indexes 0..12 = 2..A, kicker sets as 13-bit masks):
//     high       top-5 rank mask          pair  p<<13 | top-3 kicker mask   two_pair  pairMask<<4 | kicker
//     trips      t<<13 | top-2 kickers    straight / straight_flush  top rank (wheel = 3, the five)
//     flush      top-5 mask of the suit   full_house  t<<4 | p             quads  q<<4 | kicker
//
// Exports
//   CATS                                   category keys, index = cat number
//   catOf(rank) -> "pair" ...              category key of a rank integer
//   rankMasks(a, b, c, d) -> int           core: suit masks (bit r = rank r present in that suit)
//   rankInts(ints, n = ints.length) -> int fast path on card ints (cards.js encoding), 5..7 cards
//   rank7(c0, ..., c6) -> int              seven card ints, no array
//   evaluate(cards) -> { cat, rank, cards, name, isRoyal }
//        cards: 5..7 card strings or ints; result.cards = the best five as strings in display order
//        (the made part first, high to low, then kickers; wheel shown 5-4-3-2-A);
//        name: "Two Pair, Kings and Sevens", "Straight, Five High" (wheel), "Royal Flush", ...
//   compareHands(a, b) -> -1|0|1           by rank

import { cardIndex, cardStr } from './cards.js';

export const CATS = ['high', 'pair', 'two_pair', 'trips', 'straight', 'flush', 'full_house', 'quads', 'straight_flush'];
const SHIFT = 1 << 20;

const POPC = new Uint8Array(8192);
const STRAIGHT = new Int8Array(8192);
const TOP5 = new Uint16Array(8192);
const TOP3 = new Uint16Array(8192);
const TOP2 = new Uint16Array(8192);

(function build() {
  for (let m = 0; m < 8192; m++) {
    let p = 0;
    for (let x = m; x; x &= x - 1) p++;
    POPC[m] = p;
    let st = -1;
    for (let top = 12; top >= 4; top--) {
      if (((m >> (top - 4)) & 31) === 31) { st = top; break; }
    }
    if (st < 0 && (m & 0x100f) === 0x100f) st = 3;
    STRAIGHT[m] = st;
    const keep = (k) => { let x = m; for (let c = p; c > k; c--) x &= x - 1; return x; };
    TOP5[m] = keep(5);
    TOP3[m] = keep(3);
    TOP2[m] = keep(2);
  }
})();

const hb = (m) => 31 - Math.clz32(m);

export function catOf(rank) {
  return CATS[Math.floor(rank / SHIFT)];
}

export function rankMasks(a, b, c, d) {
  let f = 0;
  if (POPC[a] >= 5) f = a;
  else if (POPC[b] >= 5) f = b;
  else if (POPC[c] >= 5) f = c;
  else if (POPC[d] >= 5) f = d;
  if (f) {
    const s = STRAIGHT[f];
    if (s >= 0) return 8 * SHIFT + s;
    return 5 * SHIFT + TOP5[f];
  }
  const m1 = a | b | c | d;
  const ab = a & b;
  const cd = c & d;
  const m4 = ab & cd;
  if (m4) {
    const q = hb(m4);
    return 7 * SHIFT + (q << 4) + hb(m1 & ~(1 << q));
  }
  const m3 = (ab & (c | d)) | (cd & (a | b));
  const m2 = ab | cd | ((a | b) & (c | d));
  if (m3) {
    const t = hb(m3);
    const rest = m2 & ~(1 << t);
    if (rest) return 6 * SHIFT + (t << 4) + hb(rest);
  }
  const s = STRAIGHT[m1];
  if (s >= 0) return 4 * SHIFT + s;
  if (m3) {
    const t = hb(m3);
    return 3 * SHIFT + (t << 13) + TOP2[m1 & ~(1 << t)];
  }
  if (m2) {
    if (POPC[m2] >= 2) {
      const pm = TOP2[m2];
      return 2 * SHIFT + (pm << 4) + hb(m1 & ~pm);
    }
    return SHIFT + (hb(m2) << 13) + TOP3[m1 & ~m2];
  }
  return TOP5[m1];
}

export function rankInts(ints, n = ints.length) {
  let a = 0, b = 0, c = 0, d = 0;
  for (let i = 0; i < n; i++) {
    const x = ints[i];
    const bit = 1 << (x >> 2);
    switch (x & 3) {
      case 0: a |= bit; break;
      case 1: b |= bit; break;
      case 2: c |= bit; break;
      default: d |= bit;
    }
  }
  return rankMasks(a, b, c, d);
}

const SM = new Int32Array(4);
export function rank7(c0, c1, c2, c3, c4, c5, c6) {
  SM[0] = SM[1] = SM[2] = SM[3] = 0;
  SM[c0 & 3] |= 1 << (c0 >> 2);
  SM[c1 & 3] |= 1 << (c1 >> 2);
  SM[c2 & 3] |= 1 << (c2 >> 2);
  SM[c3 & 3] |= 1 << (c3 >> 2);
  SM[c4 & 3] |= 1 << (c4 >> 2);
  SM[c5 & 3] |= 1 << (c5 >> 2);
  SM[c6 & 3] |= 1 << (c6 >> 2);
  return rankMasks(SM[0], SM[1], SM[2], SM[3]);
}

export function compareHands(a, b) {
  const x = typeof a === 'number' ? a : a.rank;
  const y = typeof b === 'number' ? b : b.rank;
  return x > y ? 1 : x < y ? -1 : 0;
}

// ---------- display: the best five cards and a short English name ----------

const NAME = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
const PLURAL = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];

function bitsDesc(mask) {
  const out = [];
  for (let r = 12; r >= 0; r--) if (mask & (1 << r)) out.push(r);
  return out;
}

function straightRanks(top) {
  return top === 3 ? [3, 2, 1, 0, 12] : [top, top - 1, top - 2, top - 3, top - 4];
}

export function evaluate(cards) {
  if (!Array.isArray(cards) || cards.length < 5 || cards.length > 7) throw new Error('evaluate needs 5..7 cards');
  const ints = cards.map((c) => (typeof c === 'number' ? c : cardIndex(c)));
  if (new Set(ints).size !== ints.length) throw new Error('duplicate card');
  const rank = rankInts(ints);
  const catN = Math.floor(rank / SHIFT);
  const sub = rank - catN * SHIFT;
  // cards of each rank, in suit order s,h,d,c (deterministic choice when a rank has spare cards)
  const byRank = Array.from({ length: 13 }, () => []);
  for (const x of ints.slice().sort((p, q) => p - q)) byRank[x >> 2].push(x);
  const take = (r, k, used) => {
    const out = [];
    for (const x of byRank[r]) {
      if (out.length === k) break;
      if (!used.has(x)) { out.push(x); used.add(x); }
    }
    return out;
  };
  const used = new Set();
  let five = [];
  let name = '';
  let isRoyal = false;
  switch (catN) {
    case 8: case 5: {
      // flush suit: the suit with >= 5 cards
      const cnt = [0, 0, 0, 0];
      for (const x of ints) cnt[x & 3]++;
      const s = cnt.findIndex((n) => n >= 5);
      const rs = catN === 8 ? straightRanks(sub) : bitsDesc(sub);
      five = rs.map((r) => r * 4 + s);
      if (catN === 8) {
        isRoyal = sub === 12;
        name = isRoyal ? 'Royal Flush' : `Straight Flush, ${NAME[sub]} High`;
      } else {
        name = `Flush, ${NAME[rs[0]]} High`;
      }
      break;
    }
    case 7: {
      const q = sub >> 4, k = sub & 15;
      five = [...take(q, 4, used), ...take(k, 1, used)];
      name = `Four of a Kind, ${PLURAL[q]}`;
      break;
    }
    case 6: {
      const t = sub >> 4, p = sub & 15;
      five = [...take(t, 3, used), ...take(p, 2, used)];
      name = `Full House, ${PLURAL[t]} over ${PLURAL[p]}`;
      break;
    }
    case 4: {
      five = straightRanks(sub).map((r) => take(r, 1, used)[0]);
      name = `Straight, ${NAME[sub]} High`;
      break;
    }
    case 3: {
      const t = sub >> 13;
      five = [...take(t, 3, used), ...bitsDesc(sub & 8191).flatMap((r) => take(r, 1, used))];
      name = `Three of a Kind, ${PLURAL[t]}`;
      break;
    }
    case 2: {
      const [p1, p2] = bitsDesc(sub >> 4);
      const k = sub & 15;
      five = [...take(p1, 2, used), ...take(p2, 2, used), ...take(k, 1, used)];
      name = `Two Pair, ${PLURAL[p1]} and ${PLURAL[p2]}`;
      break;
    }
    case 1: {
      const p = sub >> 13;
      five = [...take(p, 2, used), ...bitsDesc(sub & 8191).flatMap((r) => take(r, 1, used))];
      name = `Pair of ${PLURAL[p]}`;
      break;
    }
    default: {
      const rs = bitsDesc(sub);
      five = rs.flatMap((r) => take(r, 1, used));
      name = `High Card, ${NAME[rs[0]]}`;
    }
  }
  return { cat: CATS[catN], rank, cards: five.map(cardStr), name, isRoyal };
}

