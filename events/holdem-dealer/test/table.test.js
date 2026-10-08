// HoldemTable: rules of DESIGN.md section 7 on rigged decks, driven exactly like the rooms layer will drive it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HoldemTable, TIMING, normalizeSettings } from '../src/engine/table.js';
import { publicTable, me } from '../src/views.js';
import { seededRng } from '../src/engine/cards.js';
import { decide } from '../src/engine/ai.js';
import { riggedRng, handDeck, acct, makeTable, act, wake, until, chipsOnTable, runBots } from './helpers.js';

const nextHand = (t) => {
  const no = t.hand ? t.hand.no : 0;
  assert.ok(until(t, (x) => x.hand && x.hand.no > no && !x.hand.done), 'next hand dealt');
  return t.hand;
};
const foldAround = (t) => { for (let i = 0; i < 20 && t.actor(); i++) assert.equal(act(t, 'fold').ok, true); };
const stacks = (t) => t.seats.map((s) => (s ? s.stack : null));

test('settings: presets, ranges, buy-in limits', () => {
  assert.equal(normalizeSettings({ blinds: '25/50' }).settings.minBuyIn, 2000);
  assert.equal(normalizeSettings({ blinds: '25/50' }).settings.maxBuyIn, 5000);
  for (const bad of [{ blinds: '1/2' }, { seats: 1 }, { seats: 10 }, { actionSec: 25 }, { timeBankSec: 61 }]) {
    assert.equal(normalizeSettings(bad).ok, false, JSON.stringify(bad));
  }
  const t = new HoldemTable({ code: 'X', settings: {}, host: { id: 'u_0', pid: 'p_0' }, now: 0, rng: seededRng(1) });
  assert.deepEqual(t.sit(acct(0), 0, 799, 0), { ok: false, error: 'bad_amount' });
  assert.deepEqual(t.sit(acct(0), 0, 2001, 0), { ok: false, error: 'bad_amount' });
  assert.deepEqual(t.sit(acct(0, 500), 0, 800, 0), { ok: false, error: 'insufficient_chips' });
  assert.deepEqual(t.sit(acct(0), 6, 800, 0), { ok: false, error: 'bad_seat' });
  assert.equal(t.sit(acct(0), 0, 800, 0).ok, true);
  assert.deepEqual(t.sit(acct(1), 0, 800, 0), { ok: false, error: 'seat_taken' });
  assert.deepEqual(t.sit(acct(0), 1, 800, 0), { ok: false, error: 'already_seated' });
  assert.deepEqual(t.settlements().chips, [{ accountId: 'u_0', amount: -800, reason: 'buyin' }]);
  assert.deepEqual(t.hostOp('u_0', 'start', {}, 0), { ok: false, error: 'not_enough_players' });
  assert.deepEqual(t.hostOp('u_1', 'settings', { blinds: '5/10' }, 0), { ok: false, error: 'not_host' });
  assert.equal(t.hostOp('u_0', 'settings', { settings: { blinds: '5/10', seats: 9, actionSec: 30 } }, 0).ok, true);
  assert.equal(publicTable(t).settings.seats, 9);
  assert.equal(publicTable(t).seats.length, 9);
  assert.equal(t.sit(acct(8), 8, 400, 0).ok, true);
  assert.deepEqual(t.hostOp('u_0', 'settings', { seats: 6 }, 0), { ok: false, error: 'seat_taken' });
  assert.equal(t.hostOp('u_0', 'start', {}, 0).ok, true);
  assert.deepEqual(t.hostOp('u_0', 'settings', { blinds: '10/20' }, 0), { ok: false, error: 'bad_phase' });
});

test('blinds and the button over many hands, players leaving and joining (waiting for the big blind)', () => {
  const rng = riggedRng(3).queue(0); // first button: seat 0
  const t = makeTable({ seats: [0, 1, 2, 3], rng });
  const expect = (button, sb, bb, toAct, dealt) => {
    const h = t.hand;
    assert.deepEqual([h.button, h.sbSeat, h.bbSeat, h.toAct], [button, sb, bb, toAct], `hand ${h.no}`);
    if (dealt) assert.deepEqual(h.dealt, dealt, `dealt hand ${h.no}`);
    assert.equal(t.seats[sb].bet, 10);
    assert.equal(t.seats[bb].bet, 20);
  };
  expect(0, 1, 2, 3, [0, 1, 2, 3]);
  foldAround(t);
  assert.deepEqual(stacks(t).slice(0, 4), [2000, 1990, 2010, 2000], 'BB wins the blinds uncontested');
  assert.equal(t.hand.winners[0].hand, null, 'uncontested win is not shown');
  nextHand(t); expect(1, 2, 3, 0);
  // seat 5 sits during the hand: waits, then is dealt in as the big blind when it reaches seat 5
  assert.equal(t.sit(acct(5), 5, 2000, t.s.now).ok, true);
  assert.equal(publicTable(t).seats[5].state, 'waiting');
  foldAround(t);
  nextHand(t); expect(2, 3, 5, 0, [0, 1, 2, 3, 5]);
  // seat 4 sits between the next button (3) and small blind (5): it is skipped until the big blind gets there
  assert.equal(t.sit(acct(4), 4, 2000, t.s.now).ok, true);
  foldAround(t);
  nextHand(t); expect(3, 5, 0, 1, [0, 1, 2, 3, 5]);
  assert.equal(t.seats[4].waiting, true);
  foldAround(t); nextHand(t); expect(5, 0, 1, 2);
  foldAround(t); nextHand(t); expect(0, 1, 2, 3);
  foldAround(t); nextHand(t); expect(1, 2, 3, 5, [0, 1, 2, 3, 5]);
  foldAround(t); nextHand(t); expect(2, 3, 4, 5, [0, 1, 2, 3, 4, 5]);
  assert.equal(t.seats[4].waiting, false);
  // seat 2 leaves between hands (stand while folded at hand end); the button skips the empty seat
  foldAround(t);
  assert.equal(t.stand('u_2', t.s.now).ok, true);
  assert.equal(t.seats[2], null);
  nextHand(t); expect(3, 4, 5, 0, [0, 1, 3, 4, 5]);
  foldAround(t); nextHand(t); expect(4, 5, 0, 1);
  // a player sits out: skipped when dealing; the button still moves one dealt-in seat
  assert.equal(t.setSitOut('u_0', true, t.s.now).ok, true);
  foldAround(t); nextHand(t); expect(5, 1, 3, 4, [1, 3, 4, 5]);
  assert.equal(publicTable(t).seats[0].state, 'out');
  // back from sit-out after missing a hand: waits for the big blind
  assert.equal(t.setSitOut('u_0', false, t.s.now).ok, true);
  assert.equal(t.seats[0].waiting, true);
  foldAround(t); nextHand(t); expect(1, 3, 4, 5, [1, 3, 4, 5]);
  foldAround(t); nextHand(t); expect(3, 4, 5, 1, [1, 3, 4, 5]);
  foldAround(t); nextHand(t); expect(4, 5, 0, 1, [0, 1, 3, 4, 5]);
  assert.equal(t.seats[0].waiting, false);
  // chips conserved: 6 buy-ins of 2000, one cashed out
  const out = t.settlements().chips.filter((c) => c.reason === 'cashout').reduce((a, c) => a + c.amount, 0);
  assert.equal(chipsOnTable(t) + out, 6 * 2000);
});

test('heads-up: button posts the small blind, acts first pre-flop and last after the flop', () => {
  const rng = riggedRng(5).queue(0);
  const t = makeTable({ seats: [1, 4], rng });
  let h = t.hand;
  assert.deepEqual([h.button, h.sbSeat, h.bbSeat, h.toAct], [1, 1, 4, 1]);
  assert.equal(act(t, 'call').ok, true);
  assert.equal(t.hand.toAct, 4, 'big blind has the option');
  assert.deepEqual(t.legalFor(4), { fold: true, check: true, call: 0, minRaiseTo: 40, maxRaiseTo: 2000, canRaise: true });
  assert.equal(act(t, 'check').ok, true);
  assert.equal(t.hand.toAct, null);
  assert.equal(t.nextWakeAt(), t.s.now + TIMING.street);
  wake(t);
  assert.equal(t.hand.street, 'flop');
  assert.equal(t.hand.board.length, 3);
  assert.equal(t.hand.toAct, 4, 'big blind acts first after the flop');
  act(t, 'check'); act(t, 'check'); wake(t);
  assert.equal(t.hand.toAct, 4);
  foldAround(t);
  h = nextHand(t);
  assert.deepEqual([h.button, h.sbSeat, h.bbSeat, h.toAct], [4, 4, 1, 4]);
  // from three players to two: the next hand is played heads-up, and the big blind moves on (seat 2 had it)
  const t3 = makeTable({ seats: [0, 2, 4], rng: riggedRng(6).queue(2) });
  assert.deepEqual([t3.hand.button, t3.hand.sbSeat, t3.hand.bbSeat], [4, 0, 2]);
  foldAround(t3);
  assert.equal(t3.stand('u_4', t3.s.now).ok, true);
  h = nextHand(t3);
  assert.deepEqual([h.button, h.sbSeat, h.bbSeat, h.toAct], [2, 2, 0, 2]);
});

test('min bet and min raise sequences; illegal amounts change nothing', () => {
  const t = makeTable({ seats: [0, 1, 2, 3], rng: riggedRng(7).queue(0) });
  assert.equal(t.hand.toAct, 3);
  assert.deepEqual(t.legalFor(3), { fold: true, check: false, call: 20, minRaiseTo: 40, maxRaiseTo: 2000, canRaise: true });
  const rev = t.rev;
  assert.deepEqual(act(t, 'raise', 39), { ok: false, error: 'bad_amount' });
  assert.deepEqual(act(t, 'raise', 2001), { ok: false, error: 'bad_amount' });
  assert.deepEqual(act(t, 'check'), { ok: false, error: 'illegal_action' });
  assert.deepEqual(act(t, 'jump'), { ok: false, error: 'bad_action' });
  assert.deepEqual(t.act('u_0', t.hand.id, 'fold', null, t.s.now), { ok: false, error: 'not_your_turn' });
  assert.deepEqual(t.act('u_3', 'T-0', 'fold', null, t.s.now), { ok: false, error: 'stale_hand' });
  assert.equal(t.rev, rev, 'rejected actions do not bump rev');
  assert.equal(act(t, 'raise', 60).ok, true); // +40
  assert.equal(t.legalFor(0).minRaiseTo, 100);
  assert.equal(act(t, 'raise', 100).ok, true); // +40
  assert.equal(t.legalFor(1).minRaiseTo, 140);
  assert.equal(act(t, 'raise', 300).ok, true); // +200
  assert.equal(t.legalFor(2).minRaiseTo, 500);
  assert.equal(publicTable(t).hand.minRaiseTo, 500);
  assert.equal(publicTable(t).hand.currentBet, 300);
  assert.equal(act(t, 'fold').ok, true);
  assert.equal(act(t, 'call').ok, true);
  assert.equal(act(t, 'call').ok, true);
  assert.equal(t.hand.toAct, null);
  assert.deepEqual(publicTable(t).hand.pots, [{ amt: 920, seats: [0, 1, 3] }]);
  wake(t);
  assert.equal(t.hand.toAct, 1);
  assert.equal(t.legalFor(1).minRaiseTo, 20, 'minimum bet = BB');
  assert.equal(act(t, 'raise', 50).ok, true);
  assert.equal(t.seats[1].last.a, 'bet');
  assert.equal(t.legalFor(3).minRaiseTo, 100);
  assert.equal(act(t, 'raise', 100).ok, true);
  assert.equal(t.seats[3].last.a, 'raise');
  assert.equal(t.legalFor(0).minRaiseTo, 150);
});

test('incomplete all-in does not reopen the betting; players yet to act may raise; short all-ins can add up', () => {
  // button 0, sb 1, bb 2 (short), utg 3
  const t = makeTable({ seats: [0, 1, 2, 3], stacks: [2000, 2000, 1000, 2000], rng: riggedRng(8).queue(0) });
  // everyone limps; flop
  act(t, 'call'); act(t, 'call'); act(t, 'call'); act(t, 'check');
  wake(t);
  assert.equal(t.hand.toAct, 1);
  t.seats[2].stack = 130; // (test shortcut: make the big blind short for this street; chips are irrelevant here)
  act(t, 'raise', 100); // seat 1 bets 100
  assert.equal(t.hand.toAct, 2);
  act(t, 'allin'); // seat 2: 130, an incomplete raise of 30
  assert.equal(t.seats[2].last.a, 'allin');
  assert.equal(t.hand.currentBet, 130);
  assert.equal(t.hand.toAct, 3);
  let L = t.legalFor(3);
  assert.equal(L.canRaise, true, 'has not acted yet: may raise');
  assert.equal(L.minRaiseTo, 230, 'full raise increment (100) over the current bet');
  act(t, 'call');
  L = t.legalFor(0);
  assert.equal(L.canRaise, true);
  act(t, 'call');
  L = t.legalFor(1);
  assert.deepEqual(L, { fold: true, check: false, call: 30, minRaiseTo: null, maxRaiseTo: null, canRaise: false });
  assert.deepEqual(act(t, 'raise', 300), { ok: false, error: 'illegal_action' });
  assert.deepEqual(act(t, 'allin'), { ok: false, error: 'illegal_action' });
  act(t, 'call');
  assert.equal(t.hand.toAct, null, 'street closed');

  // two short all-ins adding up to a full raise reopen the betting for the original bettor
  const u = makeTable({ seats: [0, 1, 2, 3], stacks: [2000, 2000, 2000, 2000], rng: riggedRng(9).queue(0) });
  act(u, 'call'); act(u, 'call'); act(u, 'call'); act(u, 'check');
  wake(u);
  u.seats[2].stack = 150;
  u.seats[3].stack = 220;
  act(u, 'raise', 100); // seat 1
  act(u, 'allin'); // seat 2 to 150 (+50, short)
  assert.equal(u.legalFor(3).canRaise, true);
  act(u, 'allin'); // seat 3 to 220 (+70, short; 120 over seat 1's bet in total)
  assert.equal(u.hand.toAct, 0);
  assert.equal(u.legalFor(0).minRaiseTo, 320);
  act(u, 'call');
  assert.equal(u.hand.toAct, 1);
  assert.equal(u.legalFor(1).canRaise, true, 'faces 120 more >= the 100 increment: reopened');
});

test('checking around deals the next street after 700 ms, first to act left of the button', () => {
  const t = makeTable({ seats: [0, 2, 4], rng: riggedRng(10).queue(1) }); // button 2, sb 4, bb 0
  assert.deepEqual([t.hand.button, t.hand.sbSeat, t.hand.bbSeat, t.hand.toAct], [2, 4, 0, 2]);
  act(t, 'call'); act(t, 'call'); act(t, 'check');
  const closedAt = t.s.now;
  assert.equal(t.nextWakeAt(), closedAt + 700);
  assert.equal(t.tick(closedAt + 699), false);
  assert.equal(t.tick(closedAt + 700), true);
  assert.equal(t.hand.street, 'flop');
  assert.equal(t.hand.toAct, 4);
  act(t, 'check'); act(t, 'check'); act(t, 'check');
  wake(t);
  assert.equal(t.hand.street, 'turn');
  assert.equal(t.hand.board.length, 4);
  assert.equal(t.hand.toAct, 4);
  assert.equal(t.hand.deadline, t.s.now + 20000);
  assert.deepEqual(publicTable(t).hand.pots, [{ amt: 60, seats: [0, 2, 4] }]);
});

test('all-in pre-flop: hands exposed at once, board run out street by street, 1.2 s apart', () => {
  const rng = riggedRng(11).queue(0);
  rng.deck(handDeck(0, 6, { 0: ['As', 'Ad'], 3: ['Kc', 'Kd'] }, ['2c', '7d', '9h', 'Js', '3s']));
  const t = makeTable({ seats: [0, 3], stacks: [2000, 1500], rng });
  act(t, 'allin'); // button / sb
  act(t, 'call'); // bb all-in for less
  const t0 = t.s.now;
  let pub = publicTable(t);
  assert.deepEqual(pub.seats[0].shown, ['As', 'Ad']);
  assert.deepEqual(pub.seats[3].shown, ['Kc', 'Kd']);
  assert.equal(t.seats[0].stack, 500, 'uncalled 500 returned');
  assert.deepEqual(pub.hand.pots, [{ amt: 3000, seats: [0, 3] }]);
  assert.equal(pub.hand.board.length, 0);
  assert.equal(t.nextWakeAt(), t0 + 1200);
  t.tick(t0 + 1200); assert.equal(t.hand.board.length, 3);
  t.tick(t0 + 2400); assert.equal(t.hand.board.length, 4);
  t.tick(t0 + 3600); assert.equal(t.hand.board.length, 5);
  pub = publicTable(t);
  assert.equal(pub.hand.street, 'showdown');
  assert.equal(pub.hand.done, true);
  assert.deepEqual(pub.hand.winners, [{ seat: 0, amt: 3000, pot: 0, hand: { cat: 'pair', name: 'Pair of Aces', cards: ['As', 'Ad', 'Js', '9h', '7d'] } }]);
  assert.equal(t.seats[3].stack, 0);
  assert.equal(pub.seats[3].state, 'allin');
  assert.equal(t.nextWakeAt(), t0 + 3600 + TIMING.holdShowdown);
});

function riverShowdown({ riverBettor }) {
  // button 0, sb 1, bb 2: seat 1 AA, seat 2 KK, seat 0 QQ; dry board
  const rng = riggedRng(12).queue(0);
  rng.deck(handDeck(0, 6, { 0: ['Qh', 'Qc'], 1: ['Ah', 'Ac'], 2: ['Kh', 'Kc'] }, ['2c', '7d', '9h', 'Js', '3s']));
  const t = makeTable({ seats: [0, 1, 2], rng });
  act(t, 'call'); act(t, 'call'); act(t, 'check'); // pre-flop
  for (const st of ['flop', 'turn']) { wake(t); assert.equal(t.hand.street, st); act(t, 'check'); act(t, 'check'); act(t, 'check'); }
  wake(t);
  assert.equal(t.hand.street, 'river');
  if (riverBettor) {
    act(t, 'check'); // seat 1
    act(t, 'raise', 40); // seat 2 bets
    act(t, 'call'); // seat 0
    act(t, 'call'); // seat 1
  } else {
    act(t, 'check'); act(t, 'check'); act(t, 'check');
  }
  return t;
}

test('showdown order: last river aggressor first; hands that cannot win are mucked automatically', () => {
  const t = riverShowdown({ riverBettor: true });
  const h = t.hand;
  assert.equal(h.done, true);
  const sd = h.log.filter((e) => e.street === 'showdown').map((e) => `${e.seat}:${e.a}`);
  assert.deepEqual(sd, ['2:show', '0:muck', '1:show']);
  const pub = publicTable(t);
  assert.deepEqual(pub.seats[2].shown, ['Kh', 'Kc']);
  assert.deepEqual(pub.seats[1].shown, ['Ah', 'Ac']);
  assert.equal(pub.seats[0].shown, null);
  assert.equal(pub.seats[0].inHand, false);
  assert.equal(pub.seats[0].last.a, 'muck');
  for (const viewer of [null, 'u_1', 'u_2']) {
    const json = JSON.stringify({ t: publicTable(t), m: me(t, viewer) });
    assert.ok(!json.includes('"Qh"') && !json.includes('"Qc"'), 'mucked hand never sent');
  }
  assert.equal(me(t, 'u_0').hole, null, 'not even to its owner');
  assert.equal(me(t, 'u_0').canShow, true);
  assert.equal(pub.hand.winners[0].seat, 1);
  assert.equal(pub.hand.winners[0].amt, 180);
  assert.equal(t.show('u_0').ok, true);
  assert.deepEqual(publicTable(t).seats[0].shown, ['Qh', 'Qc']);
  assert.deepEqual(t.show('u_0'), { ok: false, error: 'cannot_show' });
  // records: showdowns counted for every player who reached it
  const rec = Object.fromEntries(t.settlements().records.map((r) => [r.accountId, r]));
  assert.deepEqual(rec.u_1, { accountId: 'u_1', hands: 1, won: 1, biggestPot: 180, net: 120, showdowns: 1 });
  assert.deepEqual(rec.u_0, { accountId: 'u_0', hands: 1, won: 0, biggestPot: 0, net: -60, showdowns: 1 });
  // next hand: "last" keeps the previous hand's shown cards only
  nextHand(t);
  const last = publicTable(t).last;
  assert.deepEqual(Object.keys(last.shown).sort(), ['0', '1', '2']);
  assert.equal(last.board.length, 5);
});

test('showdown order without a river bet: first player left of the button shows first', () => {
  const t = riverShowdown({ riverBettor: false });
  const sd = t.hand.log.filter((e) => e.street === 'showdown').map((e) => `${e.seat}:${e.a}`);
  assert.deepEqual(sd, ['1:show', '2:muck', '0:muck']);
  assert.equal(me(t, 'u_2').canShow, true);
  assert.equal(me(t, 'u_1').canShow, false);
});

test('showdown: a tie shows; a short all-in eligible only for the main pot shows when it can win it', () => {
  const rng = riggedRng(13).queue(0);
  // board plays: everybody has the broadway straight -> all show, three-way split with odd chips
  rng.deck(handDeck(0, 6, { 0: ['2h', '3h'], 1: ['2d', '4c'], 2: ['3d', '4d'] }, ['Ts', 'Jd', 'Qc', 'Kh', 'As']));
  const t = makeTable({ seats: [0, 1, 2], rng, stacks: [2000, 2000, 2000] });
  act(t, 'call'); act(t, 'call'); act(t, 'check');
  for (let s = 0; s < 3; s++) { wake(t); act(t, 'check'); act(t, 'check'); act(t, 'check'); }
  const sd = t.hand.log.filter((e) => e.street === 'showdown').map((e) => `${e.seat}:${e.a}`);
  assert.deepEqual(sd, ['1:show', '2:show', '0:show']);
  assert.deepEqual(t.hand.winners.map((w) => [w.seat, w.amt]), [[1, 20], [2, 20], [0, 20]]);

  // side pots: seat 1 all-in short with AA; seats 2 (KK) and 0 (QQ) play on; seat 2 bets the river
  const r2 = riggedRng(14).queue(0);
  r2.deck(handDeck(0, 6, { 0: ['Qh', 'Qc'], 1: ['Ah', 'Ac'], 2: ['Kh', 'Kc'] }, ['2c', '7d', '9h', 'Js', '3s']));
  const u = makeTable({ seats: [0, 1, 2], rng: r2, stacks: [2000, 900, 2000] });
  act(u, 'call'); // seat 0
  act(u, 'allin'); // seat 1 (sb) 900
  act(u, 'call'); // seat 2 calls 900
  act(u, 'call'); // seat 0 calls 900
  wake(u); act(u, 'check'); act(u, 'check');
  wake(u); act(u, 'check'); act(u, 'check');
  wake(u); act(u, 'raise', 200); act(u, 'call'); // river: seat 2 bets, seat 0 calls
  const order = u.hand.log.filter((e) => e.street === 'showdown').map((e) => `${e.seat}:${e.a}`);
  assert.deepEqual(order, ['2:show', '0:muck', '1:show']);
  assert.deepEqual(u.hand.winners.map((w) => [w.seat, w.amt, w.pot]), [[1, 2700, 0], [2, 400, 1]]);
});

test('uncontested win is not shown; the winner may show', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(15).queue(0) });
  act(t, 'raise', 60); act(t, 'fold'); act(t, 'fold');
  assert.equal(t.hand.done, true);
  assert.equal(t.seats[0].stack, 2030, 'uncalled raise returned, blinds won');
  let pub = publicTable(t);
  assert.equal(pub.seats[0].shown, null);
  assert.deepEqual(pub.hand.winners, [{ seat: 0, amt: 50, pot: 0, hand: null }], 'the whole pot, own blind included');
  assert.equal(me(t, 'u_0').canShow, true);
  assert.equal(me(t, 'u_1').canShow, false);
  assert.deepEqual(t.show('u_1'), { ok: false, error: 'cannot_show' });
  const hole = t.seats[0].hole.slice();
  assert.equal(t.show('u_0').ok, true);
  pub = publicTable(t);
  assert.deepEqual(pub.seats[0].shown, hole);
  assert.equal(pub.seats[0].last.a, 'show');
});

test('timers: action time, then the time bank, then auto check/fold; two timeouts sit the player out', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(16).queue(0), settings: { actionSec: 15, timeBankSec: 30 } });
  const t0 = t.s.now;
  assert.equal(t.hand.toAct, 0);
  assert.equal(t.hand.deadline, t0 + 15000);
  t.tick(t0 + 15000);
  assert.equal(t.hand.usingBank, true);
  assert.equal(t.hand.deadline, t0 + 45000);
  assert.equal(publicTable(t, t0 + 25000).seats[0].timeBank, 20);
  // acting while on the bank spends only what was used
  assert.equal(t.act('u_0', t.hand.id, 'call', null, t0 + 20000).ok, true);
  assert.equal(t.seats[0].bankMs, 25000);
  // seat 1 (sb) lets everything run out: folds (cannot check)
  const t1 = t.s.now;
  assert.equal(t.nextWakeAt(), t1 + 15000);
  t.tick(t1 + 15000);
  t.tick(t1 + 45000);
  assert.equal(t.seats[1].folded, true);
  assert.equal(t.seats[1].last.a, 'timeout');
  assert.equal(t.seats[1].bankMs, 0);
  assert.equal(t.seats[1].timeouts, 1);
  // bb could check: a timeout checks
  t.tick(t.s.now + 15000 + 30000);
  assert.equal(t.seats[2].folded, false);
  assert.equal(t.seats[2].last.a, 'timeout');
  assert.equal(t.hand.toAct, null);
  wake(t); // flop: seat 2 first (seat 1 folded)
  assert.equal(t.hand.toAct, 2);
  // seat 2's bank is still full: 15 s + 30 s, then a check
  const t2 = t.s.now;
  t.tick(t2 + 15000); t.tick(t2 + 45000);
  assert.equal(t.seats[2].timeouts, 2);
  assert.equal(t.seats[2].sitOut, true, 'two consecutive timeouts -> sitting out');
  assert.equal(publicTable(t).seats[2].state, 'playing', 'still finishes the current hand');
  act(t, 'raise', 20); // seat 0 bets
  t.tick(t.s.now + 15000); // seat 2 has no bank left -> fold
  assert.equal(t.hand.done, true);
  nextHand(t);
  assert.deepEqual(t.hand.dealt, [0, 1]);
  assert.equal(publicTable(t).seats[2].state, 'out');
  // a voluntary action resets the count
  assert.equal(t.seats[1].timeouts, 1);
  assert.equal(t.hand.toAct, 1);
  act(t, 'call');
  assert.equal(t.seats[1].timeouts, 0);
});

test('time bank grows 5 s every 10 hands dealt, capped at 60 s; bots never time out', () => {
  const t = makeTable({ seats: [0, 1], rng: riggedRng(17), settings: { timeBankSec: 50 } });
  for (let k = 0; k < 25; k++) { foldAround(t); if (k < 24) nextHand(t); }
  assert.equal(t.seats[0].handsDealt, 25);
  assert.equal(t.seats[0].bankMs, 60000);
  const b = new HoldemTable({ code: 'B', settings: {}, host: { id: 'u_9', pid: 'p_9' }, now: 0, rng: seededRng(2) });
  b.sit(acct(9), 0, 2000, 0);
  b.hostOp('u_9', 'fillBots', { count: 2 }, 0);
  b.hostOp('u_9', 'start', {}, 0);
  const a = b.actor();
  if (b.seats[a.seat].bot) assert.equal(b.hand.deadline, null);
  assert.equal(publicTable(b).seats.filter((s) => s && s.bot).length, 2);
});

test('waiting for the big blind, and postBB to be dealt in at once', () => {
  const t = makeTable({ seats: [0, 1, 2, 3], rng: riggedRng(18).queue(0) });
  t.sit(acct(4), 4, 2000, t.s.now);
  assert.deepEqual(t.postBB('u_0'), { ok: false, error: 'not_waiting' });
  assert.equal(t.postBB('u_4', t.s.now).ok, true);
  foldAround(t);
  const h = nextHand(t); // button 1, sb 2, bb 3; seat 4 posts a live big blind
  assert.deepEqual([h.button, h.sbSeat, h.bbSeat], [1, 2, 3]);
  assert.deepEqual(h.dealt, [0, 1, 2, 3, 4]);
  assert.equal(t.seats[4].bet, 20);
  assert.deepEqual(h.log.map((e) => `${e.seat}:${e.a}:${e.amt}`), ['2:sb:10', '3:bb:20', '4:bb:20']);
  assert.equal(h.toAct, 4, 'action starts left of the big blind; the poster still has an option');
  act(t, 'check');
  assert.equal(t.hand.toAct, 0);
});

test('stand mid-hand folds at once; the stack goes back to the bankroll at hand end', () => {
  const t = makeTable({ seats: [0, 1, 2, 3], rng: riggedRng(19).queue(0) });
  t.settlements();
  act(t, 'call'); // seat 3
  act(t, 'raise', 100); // seat 0
  assert.equal(t.stand('u_3', t.s.now).ok, true); // not his turn: folds now
  assert.equal(t.seats[3].folded, true);
  assert.equal(publicTable(t).seats[3].state, 'folded');
  assert.equal(t.settlements().chips.length, 0, 'nothing paid out mid-hand');
  assert.deepEqual(t.sit(acct(3), 5, 1000, t.s.now), { ok: false, error: 'already_seated' });
  assert.equal(t.hand.toAct, 1);
  act(t, 'fold'); act(t, 'fold');
  assert.equal(t.hand.done, true);
  assert.equal(t.seats[3], null);
  assert.deepEqual(t.settlements().chips, [{ accountId: 'u_3', amount: 1980, reason: 'cashout' }]);
  // standing while it is your turn folds and passes the action
  const u = makeTable({ seats: [0, 1, 2], rng: riggedRng(20).queue(0) });
  assert.equal(u.hand.toAct, 0);
  u.stand('u_0', u.s.now);
  assert.equal(u.hand.toAct, 1);
  // last opponent stands: the other player wins uncontested
  u.stand('u_2', u.s.now);
  assert.equal(u.hand.done, true);
  assert.equal(u.hand.winners[0].seat, 1);
});

test('top-up: queued during a hand, applied at hand end; immediate otherwise; capped at max buy-in', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(21).queue(0), stacks: [1000, 2000, 2000] });
  t.settlements();
  assert.deepEqual(t.requestTopUp('u_0', 1001, 5000), { ok: false, error: 'bad_amount' });
  assert.deepEqual(t.requestTopUp('u_0', 500, 400), { ok: false, error: 'insufficient_chips' });
  assert.equal(t.requestTopUp('u_0', 500, 5000).ok, true);
  assert.equal(me(t, 'u_0').pendingTopUp, 500);
  assert.equal(t.seats[0].stack, 1000);
  assert.deepEqual(t.settlements().chips, [{ accountId: 'u_0', amount: -500, reason: 'topup' }]);
  assert.deepEqual(t.requestTopUp('u_0', 600), { ok: false, error: 'bad_amount' }, 'pending counts toward the cap');
  foldAround(t);
  assert.equal(t.seats[0].stack, 1500);
  assert.equal(t.seats[0].pendingTopUp, 0);
  // net in the records ignores the top-up
  const rec = t.settlements().records.find((r) => r.accountId === 'u_0');
  assert.equal(rec.net, 0);
  // between hands: immediate
  assert.equal(t.requestTopUp('u_0', 100).ok, true);
  assert.equal(t.seats[0].stack, 1600);
});

test('busted: shown as busted, stood up after 60 s unless topped up', () => {
  const rng = riggedRng(22).queue(0);
  rng.deck(handDeck(0, 6, { 0: ['As', 'Ad'], 1: ['Kc', 'Kd'], 2: ['7c', '2d'] }, ['2c', '7d', '9h', 'Js', '3s']));
  const t = makeTable({ seats: [0, 1, 2], rng, stacks: [2000, 1000, 2000] });
  act(t, 'raise', 1000); act(t, 'allin'); act(t, 'fold');
  for (let i = 0; i < 3; i++) wake(t);
  assert.equal(t.hand.done, true);
  assert.equal(t.seats[1].stack, 0);
  const endAt = t.s.now;
  nextHand(t);
  assert.equal(publicTable(t).seats[1].state, 'busted');
  assert.deepEqual(t.hand.dealt, [0, 2]);
  foldAround(t);
  t.tick(endAt + 60000);
  assert.equal(t.seats[1], null);
  assert.ok(t.settlements().chips.every((c) => c.accountId !== 'u_1' || c.reason !== 'cashout'), 'nothing to cash out');
  // a top-up within the minute keeps the seat
  const r2 = riggedRng(23).queue(0);
  r2.deck(handDeck(0, 6, { 0: ['As', 'Ad'], 1: ['Kc', 'Kd'], 2: ['7c', '2d'] }, ['2c', '7d', '9h', 'Js', '3s']));
  const u = makeTable({ seats: [0, 1, 2], rng: r2, stacks: [2000, 1000, 2000] });
  act(u, 'raise', 1000); act(u, 'allin'); act(u, 'fold');
  for (let i = 0; i < 3; i++) wake(u);
  assert.equal(u.requestTopUp('u_1', 1000, 5000).ok, true);
  assert.equal(publicTable(u).seats[1].state, 'allin', 'still showing the finished hand');
  nextHand(u);
  assert.deepEqual(u.hand.dealt, [0, 1, 2]);
  u.tick(u.s.now + 61000);
  assert.ok(u.seats[1]);
});

test('sit-out for 5 minutes stands the player up and returns the stack', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(24).queue(0) });
  t.settlements();
  t.setSitOut('u_2', true, t.s.now);
  const since = t.s.now;
  foldAround(t);
  nextHand(t);
  assert.ok(!t.hand.dealt.includes(2));
  t.tick(since + 5 * 60000 - 1);
  assert.ok(t.seats[2]);
  assert.equal(publicTable(t).seats[2].state, 'out');
  const stack = t.seats[2].stack;
  assert.equal(stack, 2010);
  t.tick(since + 5 * 60000);
  assert.equal(t.seats[2], null);
  assert.deepEqual(t.settlements().chips.filter((c) => c.accountId === 'u_2'), [{ accountId: 'u_2', amount: stack, reason: 'cashout' }]);
});

test('host hand-off to the longest-seated human (on release, not on standing); host ops; dissolve waits for a live hand to end', () => {
  const t = new HoldemTable({ code: 'H', settings: {}, host: { id: 'u_0', pid: 'p_0' }, now: 0, rng: riggedRng(25).queue(0) });
  t.sit(acct(0), 0, 2000, 0);
  t.sit(acct(2), 2, 2000, 5);
  t.sit(acct(1), 1, 2000, 10);
  assert.equal(t.hostOp('u_0', 'fillBots', { count: 2 }, 20).ok, true);
  assert.equal(publicTable(t).seats.filter((s) => s && s.bot).length, 2);
  assert.deepEqual(t.hostOp('u_0', 'removeBot', { seat: 1 }, 20), { ok: false, error: 'not_bot' });
  const botSeat = t.seats.findIndex((s) => s && s.bot);
  assert.equal(t.hostOp('u_0', 'removeBot', { seat: botSeat }, 20).ok, true);
  assert.equal(t.seats[botSeat], null);
  assert.equal(t.hostOp('u_0', 'start', {}, 30).ok, true);
  assert.equal(t.stand('u_0', 40).ok, true);
  assert.equal(publicTable(t).host, 'p_0', 'standing up keeps the host (the rooms layer passes it on when the host is gone)');
  assert.equal(t.releaseHost('u_0', 41).ok, true);
  assert.equal(publicTable(t).host, 'p_2', 'seat 2 sat before seat 1');
  assert.deepEqual(t.hostOp('u_0', 'dissolve', {}, 50), { ok: false, error: 'not_host' });
  // the rooms layer can also pass the host on when the host is gone without standing
  assert.deepEqual(t.releaseHost('u_1', 45), { ok: false, error: 'not_host' });
  assert.equal(t.releaseHost('u_2', 45).ok, true);
  assert.equal(publicTable(t).host, 'p_1');
  assert.equal(t.releaseHost('u_1', 46).ok, true);
  assert.equal(publicTable(t).host, 'p_2');
  // connected flag: on at sit, toggled by the rooms layer, bumps rev only on change
  assert.equal(publicTable(t).seats[1].connected, true);
  const rev = t.rev;
  t.setConnected('u_1', false);
  assert.equal(publicTable(t).seats[1].connected, false);
  t.setConnected('u_1', false);
  assert.equal(t.rev, rev + 1);
  t.settlements();
  assert.equal(t.hand.done, false);
  // dissolving never cancels a live hand (the host could otherwise undo a lost all-in once the board shows)
  assert.equal(t.hostOp('u_2', 'dissolve', {}, 50).ok, true);
  assert.equal(t.phase, 'running', 'the live hand plays on');
  foldAround(t);
  assert.equal(t.hand.done, true);
  wake(t);
  assert.equal(t.phase, 'closed');
  assert.equal(t.closedReason, 'dissolved');
  const q = t.settlements();
  assert.deepEqual(q.chips.filter((c) => c.reason === 'cashout').map((c) => c.accountId).sort(), ['u_0', 'u_1', 'u_2']);
  assert.equal(q.records.length, 3, 'the hand counts');
  assert.deepEqual(t.sit(acct(5), 5, 2000, 60), { ok: false, error: 'closed' });
  assert.equal(t.nextWakeAt(), null);
});

test('no humans: the table pauses (no new hands) and closes after 10 minutes idle', () => {
  const t = new HoldemTable({ code: 'P', settings: {}, host: { id: 'u_0', pid: 'p_0' }, now: 0, rng: seededRng(26) });
  t.sit(acct(0), 0, 2000, 0);
  t.hostOp('u_0', 'fillBots', { count: 2 }, 0);
  t.hostOp('u_0', 'start', {}, 0);
  assert.ok(t.hand);
  t.stand('u_0', 1);
  const aiRng = seededRng(3);
  runBots(t, { hands: 1, aiRng });
  wake(t); // hold ends: no new hand without a human
  assert.equal(t.hand, null);
  const idle = t.s.idleSince;
  assert.equal(t.nextWakeAt(), idle + 10 * 60000);
  wake(t);
  assert.equal(t.phase, 'closed');
  assert.equal(t.closedReason, 'idle');
});

test('JSON round-trip after every step reproduces the same game as never round-tripping', () => {
  const play = (roundTrip) => {
    const rng = seededRng(77);
    const aiRng = seededRng(78);
    let t = new HoldemTable({ code: 'J', settings: { seats: 5 }, host: { id: 'u_0', pid: 'p_0' }, now: 0, rng });
    t.sit(acct(0), 0, 2000, 0);
    t.sit(acct(3), 3, 1200, 0);
    t.hostOp('u_0', 'fillBots', { count: 3 }, 0);
    t.hostOp('u_0', 'start', {}, 0);
    const streets = new Set();
    for (let step = 0; step < 4000 && t.hand && t.hand.no <= 40; step++) {
      if (roundTrip) t = HoldemTable.fromJSON(JSON.parse(JSON.stringify(t)), { rng });
      if (t.hand) streets.add(t.hand.street);
      const a = t.actor();
      if (a && t.seats[a.seat].bot) {
        const d = decide(t.viewFor(a.seat), { rng: aiRng, style: t.seats[a.seat].bot, budget: 0.2 });
        assert.equal(t.act(a.id, a.handId, d.action, d.to, t.s.now + 500).ok, true);
      } else if (a) {
        // humans: a fixed policy (call/check); some decisions run into the time bank, a few time out
        const L = t.legalFor(a.seat);
        if (step % 13 === 0 && !t.hand.usingBank) t.tick(t.hand.deadline);
        else if (step % 47 === 0) t.tick(t.hand.deadline + 60000);
        else t.act(a.id, a.handId, L.check ? 'check' : L.call <= 60 ? 'call' : 'fold', null, t.s.now + 900);
      } else if (wake(t) === null) break;
    }
    return { json: t.toJSON(), streets };
  };
  const a = play(false);
  const b = play(true);
  assert.ok(a.json.handNo >= 20, `played ${a.json.handNo} hands`);
  assert.deepEqual([...b.streets].sort(), ['flop', 'preflop', 'river', 'showdown', 'turn']);
  assert.deepEqual(b.json, a.json);
  // a restart gives the player to act a fresh action timer
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(27).queue(0) });
  const restored = HoldemTable.fromJSON(t.toJSON(), { rng: seededRng(1), now: t.s.now + 99999 });
  assert.equal(restored.hand.deadline, t.s.now + 99999 + 20000);
  assert.equal(restored.hand.toAct, t.hand.toAct);
  assert.deepEqual(restored.hand.deck, t.hand.deck);
});

test('a short big blind is all-in from the post; the others still owe the full big blind; side pot', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(28).queue(0), start: false });
  t.seats[2].stack = 15;
  assert.equal(t.hostOp('u_0', 'start', {}, t.s.now).ok, true);
  assert.equal(t.seats[2].allin, true);
  assert.equal(t.seats[2].bet, 15);
  assert.equal(t.hand.currentBet, 20);
  assert.equal(t.legalFor(0).call, 20);
  act(t, 'call'); act(t, 'call');
  assert.equal(t.hand.toAct, null, 'closed: both live players matched 20');
  assert.deepEqual(t.hand.pots, [{ amt: 45, seats: [0, 1, 2] }, { amt: 10, seats: [0, 1] }]);
  wake(t);
  assert.equal(t.hand.street, 'flop');
  assert.equal(t.hand.toAct, 1);
  assert.equal(t.hand.runout, false);
});

test('standing out of turn can close the street: the leaver\'s raise is forfeit and stays in the pot', () => {
  const t = makeTable({ seats: [0, 1, 2, 3], rng: riggedRng(29).queue(0) });
  act(t, 'call'); act(t, 'call'); act(t, 'call'); act(t, 'check');
  wake(t);
  t.seats[2].stack = 50;
  act(t, 'raise', 50); // seat 1 bets 50
  act(t, 'call'); // seat 2 calls all-in
  assert.equal(t.seats[2].allin, true);
  act(t, 'raise', 200); // seat 3
  act(t, 'fold'); // seat 0
  assert.equal(t.hand.toAct, 1);
  const before = t.seats[3].stack;
  assert.equal(t.stand('u_3', t.s.now).ok, true);
  assert.equal(t.hand.toAct, null, 'seat 1 already matched everything still live');
  assert.equal(t.seats[3].stack, before, 'a folded raise is never returned');
  assert.equal(t.hand.pots.reduce((a, p) => a + p.amt, 0), 20 * 4 + 50 + 50 + 200, 'the dead 150 is in the pot');
  assert.equal(t.hand.runout, true);
  assert.ok(publicTable(t).seats[1].shown && publicTable(t).seats[2].shown);
  for (let i = 0; i < 2; i++) wake(t);
  assert.equal(t.hand.done, true);
  assert.equal(t.hand.winners.reduce((a, w) => a + w.amt, 0), 380);
  assert.equal(t.seats[3], null);
  const out = t.settlements().chips.find((c) => c.accountId === 'u_3' && c.reason === 'cashout');
  assert.equal(out.amount, before);
});

// ---------- review round 1: leaving, host ops, top-ups, blinds, restarts ----------

// heads-up host (seat 0, 72o) against a deeper bot (seat 1, AA), both all-in pre-flop: a run-out with both hands face up
function exposedRunout() {
  const rng = riggedRng(3).queue(1, 0);
  rng.deck(handDeck(0, 2, { 0: ['2c', '7d'], 1: ['As', 'Ad'] }, ['Kh', 'Qh', '3s', '4d', '9c']));
  const t = new HoldemTable({ code: 'B', settings: { blinds: '10/20', seats: 2 }, host: { id: 'h', pid: 'ph' }, now: 1000, rng });
  t.sit({ id: 'h', pid: 'ph', name: 'H', chips: 5000 }, 0, 1500, 1000);
  t.hostOp('h', 'fillBots', { count: 1 }, 1000);
  t.hostOp('h', 'start', {}, 1000);
  act(t, 'allin'); act(t, 'call');
  assert.equal(t.hand.runout, true);
  wake(t);
  assert.equal(t.hand.board.length, 3);
  return t;
}

test('a host op never decides a hand: removeBot lets the bot play it out, dissolve waits for the pot', () => {
  // removing the bot with both hands face up: the bot stays in and wins
  let t = exposedRunout();
  assert.equal(t.hostOp('h', 'removeBot', { seat: 1 }, t.s.now).ok, true);
  assert.equal(t.seats[1].folded, false);
  until(t, (x) => x.hand && x.hand.done);
  assert.deepEqual(t.hand.winners.map((w) => w.seat), [1]);
  assert.equal(t.seats[0].stack, 0);
  assert.equal(t.seats[1], null, 'the bot leaves at hand end');
  // removing a bot that bet on the flop: no uncontested pot for the host
  t = makeTable({ seats: [0], start: false });
  t.hostOp('u_0', 'fillBots', { count: 1 }, t.s.now);
  t.hostOp('u_0', 'start', {}, t.s.now);
  const bot = t.seats.findIndex((s) => s && s.bot);
  assert.equal(t.hostOp('u_0', 'removeBot', { seat: bot }, t.s.now).ok, true);
  assert.equal(t.hand.done, false);
  assert.equal(t.seats[bot].folded, false);
  // dissolving in a run-out: the hand is played out and recorded, nothing is refunded
  t = exposedRunout();
  t.settlements();
  assert.equal(t.hostOp('h', 'dissolve', {}, t.s.now).ok, true);
  assert.equal(t.phase, 'running');
  until(t, (x) => x.phase === 'closed');
  const q = t.settlements();
  assert.equal(q.records.length, 1);
  assert.equal(q.records[0].net, -1500);
  assert.deepEqual(q.chips, [], 'the host lost everything: nothing to cash out');
});

test('standing in a run-out does not fold: the hand goes to showdown and the leaver is paid', () => {
  const rng = riggedRng(4).queue(0);
  rng.deck(handDeck(0, 2, { 0: ['As', 'Ad'], 1: ['2c', '7d'] }, ['Kh', 'Qh', '3s', '4d', '9c']));
  const t = makeTable({ seats: [0, 1], stacks: [2000, 1000], rng });
  act(t, 'raise', 2000); act(t, 'call'); // seat 1 all-in for 1000; seat 0 covers it and is not all-in
  assert.equal(t.hand.runout, true);
  assert.equal(t.seats[0].allin, false);
  assert.equal(t.stand('u_0', t.s.now).ok, true);
  assert.equal(t.seats[0].folded, false, 'no decision was left');
  until(t, (x) => x.hand && x.hand.done);
  assert.deepEqual(t.hand.winners.map((w) => w.seat), [0]);
  const out = t.settlements().chips.find((c) => c.accountId === 'u_0' && c.reason === 'cashout');
  assert.equal(out.amount, 3000);
});

test('a top-up during a hand counts the stack the hand began with, and is cut at the max buy-in at hand end', () => {
  const rng = riggedRng(1).queue(0);
  rng.deck(handDeck(0, 6, { 0: ['As', 'Ad'], 1: ['2c', '7d'] }, ['Kh', 'Qh', '3s', '4d', '9c']));
  const t = makeTable({ seats: [0, 1], stacks: [1500, 2000], rng });
  act(t, 'raise', 1400); act(t, 'call');
  assert.deepEqual(t.requestTopUp('u_0', 1000, 1e6, t.s.now), { ok: false, error: 'bad_amount' }, '1500 + 1000 > 2000');
  t.settlements();
  assert.equal(t.requestTopUp('u_0', 500, 1e6, t.s.now).ok, true);
  until(t, (x) => x.hand && x.hand.done);
  assert.equal(t.seats[0].stack, 2900, 'won 2800 + 100 left: already above the max, the top-up adds nothing');
  const q = t.settlements();
  assert.deepEqual(q.chips.filter((c) => c.accountId === 'u_0').map((c) => [c.reason, c.amount]), [['topup', -500], ['topup_back', 500]]);
  assert.equal(t.seats[0].pendingTopUp, 0);
});

test('blinds: no dodging the big blind by sitting out three-handed; nobody posts it twice going heads-up', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(5) });
  const finish = () => { const no = t.hand.no; foldAround(t); assert.ok(until(t, (x) => x.hand && !x.hand.done && x.hand.no > no)); };
  const pos = () => [t.hand.button, t.hand.sbSeat, t.hand.bbSeat];
  const h1 = pos();
  const dodger = h1[0]; // the button is the next big blind three-handed
  t.setSitOut(`u_${dodger}`, true, t.s.now);
  finish();
  assert.notEqual(t.hand.bbSeat, h1[2], 'heads-up: last hand\'s big blind does not post it again');
  assert.equal(t.hand.dealt.length, 2);
  t.setSitOut(`u_${dodger}`, false, t.s.now);
  assert.equal(t.seats[dodger].waiting, true);
  // back before the big blind reaches it: it waits (never dealt in on the small blind)
  for (let k = 0; k < 3 && !t.hand.dealt.includes(dodger); k++) finish();
  assert.ok(t.hand.dealt.includes(dodger));
  assert.equal(t.hand.bbSeat, dodger, 'dealt back in on the big blind');
  assert.equal(t.hand.dealt.length, 3);
});

test('postBB in the small blind posts a full big blind: the small blind live, the rest dead (in the pot)', () => {
  const t = makeTable({ seats: [0, 1, 2, 3], rng: riggedRng(7) });
  const k = (t.hand.button + 2) % 4; // lands in the small blind next hand
  foldAround(t);
  t.seats[k].waiting = true;
  assert.equal(t.postBB(`u_${k}`, t.s.now).ok, true);
  until(t, (x) => x.hand && x.hand.no === 2);
  assert.equal(t.hand.sbSeat, k);
  assert.deepEqual(t.hand.log.filter((e) => e.seat === k).map((e) => `${e.a}:${e.amt}`), ['sb:10', 'dead:10']);
  assert.equal(t.seats[k].contrib, 20);
  assert.equal(t.seats[k].bet, 10, 'only the live part counts as its bet');
  assert.equal(publicTable(t).hand.dead, 10);
  foldAround(t);
  const won = t.hand.winners.reduce((a, w) => a + w.amt, 0);
  assert.equal(won, 10 + 10 + 10, 'small blind + the matched half of the big blind (the rest is uncalled) + the dead part');
});

test('a dead big blind goes to the main pot: the poster calls down and loses, and wins nothing back', () => {
  const rng = riggedRng(7);
  const t = makeTable({ seats: [0, 1, 2, 3], rng });
  const k = (t.hand.button + 2) % 4; // lands in the small blind next hand
  foldAround(t);
  t.seats[k].waiting = true;
  assert.equal(t.postBB(`u_${k}`, t.s.now).ok, true);
  const w = (k + 1) % 4;
  const holes = { 0: ['Kc', 'Qd'], 1: ['Kh', 'Qs'], 2: ['Jc', '9d'], 3: ['Js', '9s'] };
  holes[k] = ['2c', '7d'];
  holes[w] = ['As', 'Ad'];
  rng.deck(handDeck((t.hand.button + 1) % 4, 4, holes, ['3h', '8s', 'Th', '4d', '5c']));
  until(t, (x) => x.hand && x.hand.no === 2);
  assert.equal(t.hand.sbSeat, k);
  const before = t.seats[k].stack + t.seats[k].contrib;
  t.settlements(); // drain hand 1's records
  for (let i = 0; i < 60 && !t.hand.done; i++) {
    const a = t.actor();
    if (!a) { wake(t); continue; }
    const owe = t.hand.currentBet > t.seats[a.seat].bet;
    assert.equal(act(t, owe ? 'call' : 'check').ok, true);
  }
  assert.equal(t.hand.done, true);
  assert.equal(t.hand.pots.length, 1, 'no side pot only the poster can win');
  assert.equal(t.hand.pots[0].amt, 4 * 20 + 10);
  assert.deepEqual(t.hand.pots[0].seats.slice().sort(), [0, 1, 2, 3]);
  assert.deepEqual(t.hand.winners.map((x) => [x.seat, x.amt]), [[w, 90]]);
  assert.equal(t.seats[k].stack, before - 30, 'the poster loses the live big blind and the dead part');
  const rec = t.settlements().records.find((r) => r.accountId === `u_${k}`);
  assert.equal(rec.won, 0);
  assert.equal(rec.biggestPot, 0);
  assert.equal(rec.net, -30);
});

test('a restart keeps the time bank already used', () => {
  const t = makeTable({ seats: [0, 1, 2], rng: riggedRng(27).queue(0) });
  const seat = t.hand.toAct;
  const bank = t.seats[seat].bankMs;
  t.tick(t.hand.deadline); // the action timer runs out: the bank starts
  assert.equal(t.hand.usingBank, true);
  t._clock(t.hand.bankStart + 12_000); // 12 s of bank used, then the service stops (rooms.stop saves this clock)
  const restored = HoldemTable.fromJSON(t.toJSON(), { rng: seededRng(1), now: t.s.now + 60_000 });
  assert.equal(restored.seats[seat].bankMs, bank - 12_000);
  assert.equal(restored.hand.usingBank, false);
  assert.equal(restored.hand.deadline, t.s.now + 60_000 + 20_000);
});
