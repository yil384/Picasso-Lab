// Invariants fuzz: bots-only tables with 2..9 seats (mixed personalities, deterministic seeds) plus a few
// AI-driven "human" accounts that sit, stand mid-hand, top up, sit out, post the big blind and sometimes time out.
// Some decisions are replaced by random legal actions (odd raise sizes, all-ins) to reach rare states.
// After every step: chips conserved (table + bankroll movements), no negative stacks or bets, pots + bets equal
// contributions, the seat to act really has to act, every action accepted, every hand ends.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HoldemTable } from '../src/engine/table.js';
import { seededRng } from '../src/engine/cards.js';
import { decide, STYLES } from '../src/engine/ai.js';
import { acct, wake } from './helpers.js';

function randomLegal(L, rng) {
  const opts = ['fold'];
  if (L.check) opts.push('check', 'check');
  if (L.call > 0) opts.push('call', 'call');
  if (L.canRaise) opts.push('raise', 'raise', 'allin');
  const a = opts[rng(opts.length)];
  if (a === 'raise') {
    const span = L.maxRaiseTo - L.minRaiseTo;
    const to = L.minRaiseTo + (rng(3) === 0 ? 0 : rng(span + 1));
    return { action: 'raise', to };
  }
  return { action: a, to: null };
}

function fuzzTable({ seats, seed, hands }) {
  const rng = seededRng(seed);
  const ai = seededRng(seed ^ 0xabcdef);
  const ev = seededRng(seed * 31 + 7);
  const t = new HoldemTable({
    code: `F${seats}`, settings: { seats, blinds: ['5/10', '10/20', '25/50', '50/100'][seed % 4] },
    host: { id: 'u_host', pid: 'p_host' }, now: 0, rng, options: { pauseWithoutHumans: false },
  });
  const S = t.settings;
  let constant = 0; // chips that entered the table from outside the ledger (bots)
  let ledger = 0; // sum of settlement amounts (buy-ins negative, cash-outs positive)
  const humans = [0, 1, 2].map((k) => acct(`${seed}_${k}`, 1e9));
  // a couple of humans sit first (when seats allow), bots fill the rest
  humans.slice(0, Math.min(2, seats - 1)).forEach((a, k) => t.sit(a, k, S.minBuyIn + ev(S.maxBuyIn - S.minBuyIn + 1), 0));
  const before = () => t.seats.reduce((x, s) => x + (s ? s.stack : 0), 0);
  let b0 = before();
  t.hostOp('u_host', 'fillBots', {}, 0);
  constant += before() - b0;
  assert.equal(t.hostOp('u_host', 'start', {}, 0).ok, true);
  const onTable = () => {
    const h = t.hand;
    let sum = 0;
    for (const s of t.seats) if (s) sum += s.stack + s.pendingTopUp + (h && !h.done && s.inHand ? s.contrib : 0);
    return sum;
  };
  const drain = () => { for (const c of t.settlements().chips) ledger += c.amount; };
  drain();
  let finished = 0;
  let lastId = null;
  let handSteps = 0;
  let actions = 0;
  for (let step = 0; finished < hands; step++) {
    assert.ok(step < hands * 400, 'progress');
    const a = t.actor();
    if (a && a.bot === null && ev(40) === 0) {
      // a human lets the clock run out (action time + whole bank)
      t.tick(t.hand.deadline + 61000);
    } else if (a) {
      const L = t.legalFor(a.seat);
      const view = t.viewFor(a.seat);
      assert.deepEqual(view.me.legal, L);
      const d = ev(5) === 0 ? randomLegal(L, ev) : decide(view, { rng: ai, style: t.seats[a.seat].bot || STYLES[a.seat % 4], budget: 0.05 });
      if (d.action === 'raise') assert.ok(L.canRaise && d.to >= L.minRaiseTo && d.to <= L.maxRaiseTo, JSON.stringify({ d, L }));
      if (d.action === 'check') assert.ok(L.check);
      if (d.action === 'call') assert.ok(L.call > 0);
      const r = t.act(a.id, a.handId, d.action, d.to, t.s.now + 1 + ev(3000));
      assert.deepEqual(r, { ok: true }, JSON.stringify({ d, L }));
      actions++;
    } else {
      assert.notEqual(wake(t), null, 'a table with players always has something scheduled');
    }
    // random seat events by the humans
    const roll = ev(100);
    const h0 = humans[ev(humans.length)];
    const seat = t.seatOf(h0.id);
    if (roll === 0 && seat >= 0) t.stand(h0.id, t.s.now);
    else if (roll === 1 && seat < 0) {
      const empty = t.seats.findIndex((s) => !s);
      if (empty >= 0) t.sit(h0, empty, S.minBuyIn + ev(S.maxBuyIn - S.minBuyIn + 1), t.s.now);
    } else if (roll === 2 && seat >= 0) {
      const s = t.seats[seat];
      const room = S.maxBuyIn - s.stack - s.pendingTopUp;
      if (room > 0) t.requestTopUp(h0.id, 1 + ev(room), 1e9, t.s.now);
    } else if (roll === 3 && seat >= 0) t.setSitOut(h0.id, !t.seats[seat].sitOut, t.s.now);
    else if (roll === 4 && seat >= 0) t.postBB(h0.id, t.s.now);
    // keep the table populated between hands (bots are added from outside the ledger)
    if ((!t.hand || t.hand.done) && t.seats.filter(Boolean).length < Math.min(seats, 3)) {
      b0 = onTable();
      t.hostOp('u_host', 'fillBots', {}, t.s.now);
      constant += onTable() - b0;
    }
    drain();
    // ---- invariants ----
    for (const s of t.seats) if (s) {
      assert.ok(s.stack >= 0 && s.bet >= 0 && s.contrib >= 0 && s.pendingTopUp >= 0, 'no negative chips');
      assert.ok(Number.isInteger(s.stack) && Number.isInteger(s.bet));
    }
    assert.equal(onTable() + ledger, constant, `chips conserved (step ${step})`);
    const h = t.hand;
    if (h && !h.done) {
      const contrib = t.seats.reduce((x, s) => x + (s && s.inHand ? s.contrib : 0), 0);
      const bets = t.seats.reduce((x, s) => x + (s && s.inHand ? s.bet : 0), 0);
      assert.equal(h.pots.reduce((x, p) => x + p.amt, 0) + bets, contrib, 'pots + bets = contributions');
      if (h.toAct !== null) {
        const s = t.seats[h.toAct];
        assert.ok(s && s.inHand && !s.folded && !s.allin && (!s.acted || s.bet < h.currentBet), 'actor must act');
      }
      assert.equal(h.board.length, { preflop: 0, flop: 3, turn: 4, river: 5, showdown: 5 }[h.street]);
      assert.equal(h.deck.length + h.burns.length + h.board.length + h.dealt.length * 2, 52);
      handSteps++;
      assert.ok(handSteps < 400, 'every hand ends');
    }
    if (h && h.done && h.id !== lastId) {
      lastId = h.id;
      finished++;
      handSteps = 0;
      const won = h.winners.reduce((x, w) => x + w.amt, 0);
      assert.equal(won, h.pots.reduce((x, p) => x + p.amt, 0), 'every pot awarded');
    }
  }
  return { finished, actions };
}

test('invariants: 20,000+ hands on 2..9-seat tables', () => {
  let total = 0;
  let actions = 0;
  for (let seats = 2; seats <= 9; seats++) {
    for (const seed of [seats * 1000 + 1, seats * 1000 + 2]) {
      const r = fuzzTable({ seats, seed, hands: 1300 });
      total += r.finished;
      actions += r.actions;
    }
  }
  console.log(`# invariants: ${total} hands, ${actions} actions`);
  assert.ok(total >= 20000);
});
