// Evaluator: exact category counts over all 2,598,960 five-card hands, hand-picked comparisons,
// display cards and names, and a cross-check against a slow, independent best-of-21 evaluator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, rankMasks, rankInts, rank7, catOf, CATS } from '../src/engine/evaluator.js';
import { cardIndex, newDeck, seededRng, shuffle } from '../src/engine/cards.js';

const ev = (s) => evaluate(s.trim().split(/\s+/));
const cmp = (a, b) => Math.sign(ev(a).rank - ev(b).rank);

test('all 2,598,960 five-card hands: exact category counts', () => {
  const counts = Object.fromEntries(CATS.map((c) => [c, 0]));
  let royal = 0;
  const sm = new Int32Array(4 * 6);
  let total = 0;
  for (let a = 0; a < 52; a++) {
    sm.fill(0, 4, 8); sm[4 + (a & 3)] = 1 << (a >> 2);
    for (let b = a + 1; b < 52; b++) {
      for (let s = 0; s < 4; s++) sm[8 + s] = sm[4 + s]; sm[8 + (b & 3)] |= 1 << (b >> 2);
      for (let c = b + 1; c < 52; c++) {
        for (let s = 0; s < 4; s++) sm[12 + s] = sm[8 + s]; sm[12 + (c & 3)] |= 1 << (c >> 2);
        for (let d = c + 1; d < 52; d++) {
          for (let s = 0; s < 4; s++) sm[16 + s] = sm[12 + s]; sm[16 + (d & 3)] |= 1 << (d >> 2);
          for (let e = d + 1; e < 52; e++) {
            const bit = 1 << (e >> 2);
            const su = e & 3;
            const r = rankMasks(
              sm[16] | (su === 0 ? bit : 0), sm[17] | (su === 1 ? bit : 0),
              sm[18] | (su === 2 ? bit : 0), sm[19] | (su === 3 ? bit : 0));
            counts[catOf(r)]++;
            if (r === 8 * 2 ** 20 + 12) royal++;
            total++;
          }
        }
      }
    }
  }
  assert.equal(total, 2598960);
  assert.deepEqual(counts, {
    straight_flush: 40, quads: 624, full_house: 3744, flush: 5108, straight: 10200,
    trips: 54912, two_pair: 123552, pair: 1098240, high: 1302540,
  });
  assert.equal(royal, 4);
});

test('distinct 5-card rank values: 7,462 equivalence classes', () => {
  // A well-known fact: 2,598,960 hands fall into exactly 7,462 distinct strength classes.
  const seen = new Set();
  const ints = new Array(5);
  const rec = (start, k) => {
    if (k === 5) { seen.add(rankInts(ints, 5)); return; }
    for (let i = start; i < 52; i++) { ints[k] = i; rec(i + 1, k + 1); }
  };
  rec(0, 0); // all 2,598,960 hands again, through the array entry point this time
  assert.equal(seen.size, 7462);
});

test('hand-picked comparisons', () => {
  // kickers at every depth (high card)
  assert.equal(cmp('As Kd 9h 7c 5s', 'Ad Kh 9s 7d 4c'), 1, '5th kicker');
  assert.equal(cmp('As Kd 9h 8c 2s', 'Ad Kh 9s 7d 6c'), 1, '4th kicker');
  assert.equal(cmp('As Kd Th 3c 2s', 'Ad Kh 9s 8d 7c'), 1, '3rd kicker');
  assert.equal(cmp('As Qd Th 3c 2s', 'Ad Jh 9s 8d 7c'), 1, '2nd kicker');
  assert.equal(cmp('As Kd 9h 7c 5s', 'Ad Kh 9s 7d 5c'), 0, 'suits never break ties');
  // pair kickers at every depth
  assert.equal(cmp('8s 8d Ah 7c 5s', '8h 8c Kh Qd Jc'), 1);
  assert.equal(cmp('8s 8d Ah 7c 5s', '8h 8c Ad 6d 5c'), 1);
  assert.equal(cmp('8s 8d Ah 7c 5s', '8h 8c Ad 7d 4c'), 1);
  assert.equal(cmp('8s 8d Ah 7c 5s', '8h 8c Ad 7d 5c'), 0);
  assert.equal(cmp('9s 9d 2h 3c 4s', '8h 8c Ad Kd Qc'), 1, 'pair rank beats kickers');
  // two pair: high pair, low pair, then kicker
  assert.equal(cmp('Ks Kd 2h 2c 3s', 'Qs Qd Jh Jc As'), 1);
  assert.equal(cmp('Ks Kd 7h 7c 3s', 'Kh Kc 6h 6d As'), 1);
  assert.equal(cmp('Ks Kd 7h 7c 4s', 'Kh Kc 7s 7d 3s'), 1, 'two pair kicker');
  // two pair third kicker from a third pair (7 cards)
  assert.equal(cmp('Ks Kd 7h 7c 5s 5d 2c', 'Kh Kc 7s 7d 4s 4h 3c'), 1);
  assert.equal(ev('Ks Kd 7h 7c 5s 5d 2c').cards.join(' '), 'Ks Kd 7h 7c 5s');
  // trips kickers
  assert.equal(cmp('7s 7d 7h Ac 2s', '7c 7d 7h Kc Qs'), 1);
  assert.equal(cmp('7s 7d 7h Ac 3s', '7c 7d 7h Ac 2s'), 1);
  // straights: wheel is the lowest, broadway the highest
  assert.equal(cmp('As 2d 3h 4c 5s', '2s 3d 4h 5c 6s'), -1, 'wheel < 6-high straight');
  assert.equal(cmp('Ts Jd Qh Kc As', 'As 2d 3h 4c 5s'), 1, 'broadway > wheel');
  assert.equal(cmp('As 2d 3h 4c 5s', 'Ks Kd Kh 2c 3s'), 1, 'wheel beats trips');
  assert.equal(ev('As 2d 3h 4c 5s').cat, 'straight');
  assert.equal(ev('Qs Kd Ah 2c 3s').cat, 'high', 'no wrap-around straight');
  // flush: all five cards compared
  assert.equal(cmp('As Js 9s 6s 4s', 'Ad Jd 9d 6d 3d'), 1);
  assert.equal(cmp('As Js 9s 6s 4s', 'Ad Jd 9d 6d 4d'), 0);
  assert.equal(cmp('Ks Qs Js 9s 8s', 'Ad 2d 3d 4d 6d'), -1);
  assert.equal(cmp('2s 3s 4s 5s 7s', 'As Kd Qh Jc Ts'), 1, 'flush > straight');
  // full house: trips first
  assert.equal(cmp('3s 3d 3h 2c 2s', '2h 2d 2c As Ad'), 1);
  assert.equal(cmp('Ks Kd Kh 2c 2s', 'Qc Qd Qh As Ad'), 1);
  assert.equal(cmp('Ks Kd Kh 3c 3s 2d 2h', 'Ks Kd Kh 3c 3s 2d 2c'), 0);
  // FH from two trips: the higher trips play as trips
  assert.equal(ev('Ks Kd Kh 9c 9s 9d 2c').name, 'Full House, Kings over Nines');
  // quads with board kicker
  assert.equal(cmp('9s 9d 9h 9c As 2d 3c', '9s 9d 9h 9c Ks Qd Jc'), 1);
  assert.equal(cmp('9s 9d 9h 9c As 2d 3c', '9s 9d 9h 9c As Kd Qc'), 0, 'quads on board, ace kicker on board plays');
  // steel wheel is the lowest straight flush but beats quads
  assert.equal(ev('As 2s 3s 4s 5s').cat, 'straight_flush');
  assert.equal(cmp('As 2s 3s 4s 5s', '2h 3h 4h 5h 6h'), -1);
  assert.equal(cmp('As 2s 3s 4s 5s', 'Ah Ad Ac As Kd'), 1, 'steel wheel > quad aces');
  assert.equal(cmp('Ts Js Qs Ks As', '9h Th Jh Qh Kh'), 1, 'royal > king-high straight flush');
  assert.equal(ev('Ts Js Qs Ks As').isRoyal, true);
  assert.equal(ev('Ts Js Qs Ks As').name, 'Royal Flush');
  // category order
  const order = ['As Kd 9h 7c 5s', '2s 2d 3h 4c 5d', '2s 2d 3h 3c 5d', '2s 2d 2h 3c 4d', '2s 3d 4h 5c 6d',
    '2s 3s 4s 5s 7s', '2s 2d 2h 3c 3d', '2s 2d 2h 2c 3d', '2s 3s 4s 5s 6s'];
  for (let i = 1; i < order.length; i++) assert.equal(cmp(order[i], order[i - 1]), 1, order[i]);
  order.forEach((h, i) => assert.equal(ev(h).cat, CATS[i]));
});

test('board plays, counterfeits, 6- and 7-card selection', () => {
  const board = 'Ts Js Qd Kc Ah';
  // board straight plays for both: split
  assert.equal(cmp(board + ' 2c 3d', board + ' 4c 5d'), 0);
  // board two pair, both hold lower pairs: counterfeited -> kicker decides
  assert.equal(cmp('Ks Kd 9h 9c 2s 4c 4d', 'Ks Kd 9h 9c 2s Ac 3d'), -1, 'pocket fours counterfeited by the board two pair: ace kicker wins');
  assert.equal(cmp('Ks Kd 9h 9c 2s 4c 4d', 'Ks Kd 9h 9c 2s 3c 3d'), 1, 'both counterfeited: the fours still play as kicker');
  assert.equal(cmp('Ks Kd 9h 9c 2s 8c 4d', 'Ks Kd 9h 9c 2s 7c 3d'), 1, 'counterfeited two pair: kicker 8 beats 7');
  assert.equal(ev('Ks Kd 9h 9c 2s 4c 4d').cards.join(' '), 'Ks Kd 9h 9c 4d');
  // board pair + pocket pair below: one pair beats? no, two pair vs two pair
  assert.equal(cmp('Js Jd 5h 5c 2s 9c 9d', 'Js Jd 5h 5c 2s Ac Kd'), 1, '9s counterfeit the 5s');
  // quads on board: kicker decides, board ace plays for both
  assert.equal(cmp('7s 7d 7h 7c As Kc Qd', '7s 7d 7h 7c As 2c 3d'), 0);
  assert.equal(cmp('7s 7d 7h 7c 2s Kc Qd', '7s 7d 7h 7c 2s Jc Td'), 1);
  // flush on board, higher card in hand of the suit plays
  assert.equal(cmp('2h 5h 7h 9h Jh Ah 3c', '2h 5h 7h 9h Jh 3c 4c'), 1);
  assert.equal(cmp('2h 5h 7h 9h Jh 3d Kc', '2h 5h 7h 9h Jh 3c 4c'), 0, 'board flush plays: split');
  // straight + pair on board: still the straight
  assert.equal(ev('5s 6d 7h 8c 9s 9d 2c').cat, 'straight');
  // 6-card hand
  assert.equal(ev('As Ad Ks Kd Qs Qd').name, 'Two Pair, Aces and Kings');
  assert.equal(ev('As Ad Ks Kd Qs Qd').cards.join(' '), 'As Ad Ks Kd Qs');
  // seven-card straight flush picks the highest one
  assert.equal(ev('5h 6h 7h 8h 9h Th 2c').cards.join(' '), 'Th 9h 8h 7h 6h');
  // 6-high straight beats wheel when both available
  assert.equal(ev('As 2d 3h 4c 5s 6d Kc').cards.join(' '), '6d 5s 4c 3h 2d');
  assert.equal(ev('As 2d 3h 4c 5s 9d Kc').cards.join(' '), '5s 4c 3h 2d As');
});

test('names', () => {
  assert.equal(ev('Kh Kc 7h 7d 5h 9d 2c').name, 'Two Pair, Kings and Sevens');
  assert.equal(ev('Kh Kc 7h 3d 5h 9d 2c').name, 'Pair of Kings');
  assert.equal(ev('Ah Kc 7h 3d 5h 9d 2c').name, 'High Card, Ace');
  assert.equal(ev('6h 6c 6d 3d 5h 9d 2c').name, 'Three of a Kind, Sixes');
  assert.equal(ev('As 2d 3h 4c 5s').name, 'Straight, Five High');
  assert.equal(ev('9s Td Jh Qc Ks').name, 'Straight, King High');
  assert.equal(ev('2h 5h 7h 9h Jh').name, 'Flush, Jack High');
  assert.equal(ev('Ts Td Th 2c 2s').name, 'Full House, Tens over Twos');
  assert.equal(ev('Qs Qd Qh Qc 2s').name, 'Four of a Kind, Queens');
  assert.equal(ev('As 2s 3s 4s 5s').name, 'Straight Flush, Five High');
  assert.equal(ev('Kh Kc 7h 3d 5h 9d 2c').cards.join(' '), 'Kh Kc 9d 7h 5h');
  assert.throws(() => evaluate(['As', 'As', 'Kd', 'Qd', 'Jd']));
  assert.throws(() => evaluate(['As', 'Kd', 'Qd', 'Jd']));
});

// ---- independent slow evaluator: best of all 5-card subsets, by sorting rank groups ----
function slow5(cs) {
  const rs = cs.map((c) => c >> 2).sort((a, b) => b - a);
  const flush = cs.every((c) => (c & 3) === (cs[0] & 3));
  const uniq = [...new Set(rs)];
  let straightTop = -1;
  if (uniq.length === 5) {
    if (rs[0] - rs[4] === 4) straightTop = rs[0];
    else if (rs[0] === 12 && rs[1] === 3) straightTop = 3;
  }
  const groups = uniq.map((r) => [rs.filter((x) => x === r).length, r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const shape = groups.map((g) => g[0]).join('');
  let cat;
  if (straightTop >= 0 && flush) cat = 8;
  else if (shape === '41') cat = 7;
  else if (shape === '32') cat = 6;
  else if (flush) cat = 5;
  else if (straightTop >= 0) cat = 4;
  else if (shape === '311') cat = 3;
  else if (shape === '221') cat = 2;
  else if (shape === '2111') cat = 1;
  else cat = 0;
  const key = straightTop >= 0 ? [straightTop] : groups.map((g) => g[1]);
  return [cat, ...key];
}
function slowBest(cs) {
  let best = null;
  const n = cs.length;
  const pick = (start, chosen) => {
    if (chosen.length === 5) {
      const v = slow5(chosen);
      if (!best || lexCmp(v, best) > 0) best = v;
      return;
    }
    for (let i = start; i < n; i++) pick(i + 1, [...chosen, cs[i]]);
  };
  pick(0, []);
  return best;
}
function lexCmp(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? -1, y = b[i] ?? -1;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

test('cross-check against an independent best-of-subsets evaluator (20,000 random pairs, 5/6/7 cards)', () => {
  const rng = seededRng(12345);
  for (let i = 0; i < 20000; i++) {
    const n = 5 + (i % 3);
    const d = shuffle(newDeck().map(cardIndex), rng);
    const h1 = d.slice(0, n), h2 = d.slice(n, 2 * n);
    const fast = Math.sign(rankInts(h1) - rankInts(h2));
    const slow = lexCmp(slowBest(h1), slowBest(h2));
    if (fast !== slow) assert.fail(`mismatch ${h1} vs ${h2}: fast ${fast} slow ${slow}`);
    assert.equal(catOf(rankInts(h1)), CATS[slowBest(h1)[0]]);
    if (n === 7) assert.equal(rank7(...h1), rankInts(h1));
    // evaluate() agrees with the fast path, and its five cards alone have the same rank
    const e = evaluate(h1);
    assert.equal(e.rank, rankInts(h1));
    assert.equal(evaluate(e.cards).rank, e.rank);
  }
});
