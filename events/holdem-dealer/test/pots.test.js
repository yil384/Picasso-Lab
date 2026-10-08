// Pots: uncalled bets, side pots with several all-ins, folded contributions, splits and odd chips.
import test from 'node:test';
import assert from 'node:assert/strict';
import { uncalledBet, buildPots, awardPots, oddChipOrder } from '../src/engine/pots.js';

const total = (pots) => pots.reduce((a, p) => a + p.amt, 0);
const bySeat = (awards) => awards.reduce((m, a) => { m[a.seat] = (m[a.seat] || 0) + a.amt; return m; }, {});

test('uncalled bet', () => {
  assert.deepEqual(uncalledBet([0, 300, 100, 0]), { seat: 1, amount: 200 });
  assert.equal(uncalledBet([100, 100, 50]), null, 'tie for the top is fully called');
  assert.equal(uncalledBet([0, 0, 0]), null);
  assert.deepEqual(uncalledBet([20, 0, 0]), { seat: 0, amount: 20 }, 'everyone folded to a lone bet');
  assert.deepEqual(uncalledBet([10, 20, 0, 60]), { seat: 3, amount: 40 }, 'raise over the BB uncalled');
  assert.deepEqual(uncalledBet([500, 0, 150]), { seat: 0, amount: 350 }, 'bet called all-in for less');
});

test('side pots: three all-ins of different sizes plus a covering caller', () => {
  // A all-in 50, B all-in 120, C all-in 300, D calls 300
  const contrib = [50, 120, 300, 300];
  const pots = buildPots(contrib, [false, false, false, false]);
  assert.deepEqual(pots, [
    { amt: 200, seats: [0, 1, 2, 3] },
    { amt: 210, seats: [1, 2, 3] },
    { amt: 360, seats: [2, 3] },
  ]);
  assert.equal(total(pots), 770);
  // A has the best hand, B second, D third: A takes main, B the first side pot, D the last
  const awards = awardPots(pots, [900, 800, 100, 700], oddChipOrder(3, 4));
  assert.deepEqual(bySeat(awards), { 0: 200, 1: 210, 3: 360 });
});

test('side pots: four all-ins, one folder whose chips stay in the pots they reached', () => {
  // seats: 0 all-in 40, 1 all-in 100, 2 folded after putting 70, 3 all-in 250, 4 calls 400 (5 = empty)
  const contrib = [40, 100, 70, 250, 400, 0];
  const folded = [false, false, true, false, false, false];
  const unc = uncalledBet(contrib);
  assert.deepEqual(unc, { seat: 4, amount: 150 });
  contrib[4] -= unc.amount;
  const pots = buildPots(contrib, folded);
  assert.deepEqual(pots, [
    { amt: 200, seats: [0, 1, 3, 4] },          // 40 x 5 (the folder's 40 included)
    { amt: 60 + 30 + 60 + 60, seats: [1, 3, 4] }, // level 100: seat1 60, folder 30, seat3 60, seat4 60
    { amt: 300, seats: [3, 4] },                // level 250: 150 x 2
  ]);
  assert.equal(total(pots), 40 + 100 + 70 + 250 + 250);
  assert.ok(pots.every((p) => !p.seats.includes(2)), 'folded seat never eligible');
});

test('folded chips above every live level join the last pot', () => {
  const pots = buildPots([100, 300, 0], [false, true, false]);
  assert.deepEqual(pots, [{ amt: 400, seats: [0] }]);
});

test('split pots and odd chips', () => {
  // 3-way split of 100: 34/33/33, the extra chip to the first winner left of the button
  let awards = awardPots([{ amt: 100, seats: [0, 1, 2] }], [5, 5, 5], oddChipOrder(0, 3));
  assert.deepEqual(awards, [{ pot: 0, seat: 1, amt: 34 }, { pot: 0, seat: 2, amt: 33 }, { pot: 0, seat: 0, amt: 33 }]);
  // button on seat 1: order 2, 0, 1
  awards = awardPots([{ amt: 100, seats: [0, 1, 2] }], [5, 5, 5], oddChipOrder(1, 3));
  assert.deepEqual(bySeat(awards), { 2: 34, 0: 33, 1: 33 });
  // 2 odd chips among 3 winners, button 2: order 3, 0, 1, 2 -> winners 0 and 1 get the extras
  awards = awardPots([{ amt: 101, seats: [0, 1, 2, 3] }], [7, 7, 7, 1], oddChipOrder(2, 4));
  assert.deepEqual(bySeat(awards), { 0: 34, 1: 34, 2: 33 });
  // odd chip in a side pot split: main pot to seat 0 alone, side pot of 75 split by seats 1 and 3
  const pots = [{ amt: 120, seats: [0, 1, 3] }, { amt: 75, seats: [1, 3] }];
  awards = awardPots(pots, [9, 4, null, 4], oddChipOrder(1, 4)); // order 2,3,0,1 -> seat 3 first among winners
  assert.deepEqual(awards, [{ pot: 0, seat: 0, amt: 120 }, { pot: 1, seat: 3, amt: 38 }, { pot: 1, seat: 1, amt: 37 }]);
  // a mucked (null) hand never wins; total chips always conserved
  awards = awardPots([{ amt: 51, seats: [0, 1, 2] }], [null, 3, 3], oddChipOrder(5, 6));
  assert.deepEqual(bySeat(awards), { 1: 26, 2: 25 });
});

test('odd-chip order wraps from left of the button', () => {
  assert.deepEqual(oddChipOrder(0, 6), [1, 2, 3, 4, 5, 0]);
  assert.deepEqual(oddChipOrder(5, 6), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(oddChipOrder(3, 9), [4, 5, 6, 7, 8, 0, 1, 2, 3]);
});

test('random contributions: pots always conserve chips and eligibility is monotone', () => {
  let seed = 7;
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  for (let i = 0; i < 3000; i++) {
    const n = 2 + rnd(8);
    const contrib = Array.from({ length: n }, () => (rnd(4) === 0 ? 0 : 1 + rnd(500)));
    const folded = contrib.map((c) => c > 0 && rnd(3) === 0);
    if (!folded.some((f, s) => !f && contrib[s] > 0)) continue;
    const unc = uncalledBet(contrib);
    if (unc) contrib[unc.seat] -= unc.amount;
    const pots = buildPots(contrib, folded);
    assert.equal(total(pots), contrib.reduce((a, b) => a + b, 0));
    for (let k = 1; k < pots.length; k++) assert.ok(pots[k].seats.every((s) => pots[k - 1].seats.includes(s)));
    const ranks = contrib.map((c, s) => (folded[s] || c === 0 ? null : rnd(5)));
    const awards = awardPots(pots, ranks, oddChipOrder(rnd(n), n));
    assert.equal(awards.reduce((a, w) => a + w.amt, 0), total(pots));
    assert.ok(awards.every((w) => !folded[w.seat]));
  }
});
