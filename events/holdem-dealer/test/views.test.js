// Views: exact DESIGN.md section 6 shapes, and a fuzz over thousands of random hands proving that no recipient's
// message (publicTable + me) ever contains a card it may not see: other players' unexposed hole cards, folded or
// mucked hands (its own included), the deck, burn cards. Checked by card tokens in the JSON text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HoldemTable } from '../src/engine/table.js';
import { publicTable, me, viewFor } from '../src/views.js';
import { seededRng } from '../src/engine/cards.js';
import { decide, STYLES } from '../src/engine/ai.js';
import { acct, wake, makeTable, riggedRng } from './helpers.js';

const keys = (o) => Object.keys(o).sort();

test('PublicTable and Me have exactly the documented fields', () => {
  const t = makeTable({ seats: [0, 2, 3], rng: riggedRng(4).queue(0) });
  const pt = publicTable(t, t.s.now);
  assert.deepEqual(keys(pt), ['code', 'hand', 'host', 'last', 'log', 'phase', 'rev', 'seats', 'settings']);
  assert.deepEqual(keys(pt.settings), ['actionSec', 'bb', 'maxBuyIn', 'minBuyIn', 'sb', 'seats', 'timeBankSec']);
  assert.deepEqual(keys(pt.seats[0]), ['bet', 'bot', 'connected', 'inHand', 'last', 'name', 'pid', 'shown', 'stack', 'state', 'timeBank']);
  assert.equal(pt.seats[1], null);
  assert.deepEqual(keys(pt.hand), ['bbSeat', 'board', 'button', 'currentBet', 'deadline', 'done', 'id', 'minRaiseTo', 'no', 'pots', 'sbSeat', 'street', 'toAct', 'usingBank', 'winners']);
  assert.deepEqual(keys(pt.log[0]), ['a', 'amt', 'seat', 'street']);
  const m = me(t, 'u_0', { pid: 'p_0', chips: 98000 });
  assert.deepEqual(keys(m), ['best', 'canShow', 'chips', 'hole', 'legal', 'pendingTopUp', 'pid', 'seat']);
  assert.equal(m.chips, 98000);
  assert.deepEqual(keys(m.legal), ['call', 'canRaise', 'check', 'fold', 'maxRaiseTo', 'minRaiseTo']);
  assert.equal(me(t, 'u_2').legal, null, 'legal only for the seat to act');
  assert.equal(me(t, null), null);
  const spectator = me(t, 'u_77', { pid: 'p_77', chips: 5 });
  assert.deepEqual(spectator, { pid: 'p_77', seat: null, chips: 5, hole: null, best: null, legal: null, canShow: false, pendingTopUp: 0 });
  const v = viewFor(t, 2);
  assert.deepEqual(keys(v), ['me', 'table']);
  assert.equal(v.me.seat, 2);
  assert.equal(v.me.hole.length, 2);
  assert.equal(pt.host, 'p_0');
  // snapshots are fresh objects: mutating one never touches the table
  pt.hand.board.push('As');
  m.hole.push('Kd');
  assert.equal(t.hand.board.length, 0);
  assert.equal(t.seats[0].hole.length, 2);
});

test('Me.best appears from the flop on and names the hand', () => {
  const rng = riggedRng(5).queue(0);
  const t = makeTable({ seats: [0, 1], rng });
  assert.equal(me(t, 'u_0').best, null);
  const a = t.actor();
  t.act(a.id, a.handId, 'call', null, t.s.now);
  const b = t.actor();
  t.act(b.id, b.handId, 'check', null, t.s.now);
  wake(t);
  const best = me(t, 'u_0').best;
  assert.equal(best.cards.length, 5);
  assert.equal(typeof best.name, 'string');
  assert.ok(['high', 'pair', 'two_pair', 'trips', 'straight', 'flush', 'full_house', 'quads', 'straight_flush'].includes(best.cat));
});

function snapshotHidden(t) {
  const h = t.hand;
  if (!h) return null;
  const holes = {};
  t.seats.forEach((s, i) => { if (s && s.inHand && s.hole) holes[i] = { id: s.id, hole: s.hole.slice(), folded: s.folded, mucked: s.mucked }; });
  return { id: h.id, deck: h.deck.slice(), burns: h.burns.slice(), holes, shown: JSON.parse(JSON.stringify(h.shown)) };
}

function forbiddenFor(snap, recipientId, exposed) {
  const out = new Set([...snap.deck, ...snap.burns]);
  for (const [seat, x] of Object.entries(snap.holes)) {
    if (exposed[seat]) continue;
    const own = x.id === recipientId && !x.folded && !x.mucked;
    if (!own) for (const c of x.hole) out.add(c);
  }
  return out;
}

const CARD_TOKEN = /"[2-9TJQKA][shdc]"/g;
function assertNoLeak(json, forbidden, what) {
  for (const tok of json.match(CARD_TOKEN) || []) {
    const c = tok.slice(1, 3);
    if (forbidden.has(c)) assert.fail(`${what}: leaked ${c} in ${json}`);
  }
}

test('views fuzz: no recipient ever sees a card it may not see (thousands of random hands)', () => {
  let hands = 0;
  let checks = 0;
  for (const seats of [2, 3, 6, 9]) {
    const rng = seededRng(500 + seats);
    const ai = seededRng(600 + seats);
    const ev = seededRng(700 + seats);
    const t = new HoldemTable({ code: `V${seats}`, settings: { seats }, host: { id: 'u_host', pid: 'p_host' }, now: 0, rng, options: { pauseWithoutHumans: false } });
    const humans = [0, 1, 2].map((k) => acct(`v${k}`, 1e9));
    humans.slice(0, Math.min(2, seats - 1)).forEach((a, k) => t.sit(a, k, 2000, 0));
    t.hostOp('u_host', 'fillBots', {}, 0);
    t.hostOp('u_host', 'start', {}, 0);
    let prev = null; // snapshot of the previous hand, for checking `last`
    let cur = null;
    let lastId = null;
    let n = 0;
    for (let step = 0; n < 900 && step < 200000; step++) {
      const a = t.actor();
      if (a && a.bot === null && ev(30) === 0) t.tick(t.hand.deadline + 61000);
      else if (a) {
        const d = decide(t.viewFor(a.seat), { rng: ai, style: t.seats[a.seat].bot || STYLES[step % 4], budget: 0.05 });
        assert.equal(t.act(a.id, a.handId, d.action, d.to, t.s.now + 1).ok, true);
      } else if (wake(t) === null) break;
      // humans sometimes show, stand, come back
      const hm = humans[ev(3)];
      const seat = t.seatOf(hm.id);
      const r = ev(60);
      if (seat >= 0 && t.canShow(seat) && ev(2) === 0) assert.equal(t.show(hm.id).ok, true);
      if (r === 0 && seat >= 0) t.stand(hm.id, t.s.now);
      if (r === 1 && seat < 0) { const e = t.seats.findIndex((s) => !s); if (e >= 0) t.sit(hm, e, 2000, t.s.now); }
      for (let i = 0; i < t.seats.length; i++) if (t.seats[i] && t.seats[i].bot && t.seats[i].stack === 0 && (!t.hand || t.hand.done)) t.hostOp('u_host', 'removeBot', { seat: i }, t.s.now);
      if ((!t.hand || t.hand.done) && t.seats.filter(Boolean).length < 2) t.hostOp('u_host', 'fillBots', {}, t.s.now);
      // track hands
      const h = t.hand;
      if (h && cur && h.id !== cur.id) { prev = cur; cur = null; }
      if (!h && cur) { prev = cur; cur = null; }
      if (h) cur = snapshotHidden(t);
      // positive control: the raw table state does contain hidden cards, and the checker sees them
      if (h && !h.done && step % 500 === 0) {
        assert.throws(() => assertNoLeak(JSON.stringify(t.toJSON()), forbiddenFor(cur, null, cur.shown), 'control'));
      }
      if (h && h.done && h.id !== lastId) { lastId = h.id; n++; }
      // check every recipient: every seated account, a spectator, an outsider
      const recipients = [...t.seats.filter(Boolean).map((s) => s.id), null, 'u_outsider'];
      for (const rid of recipients) {
        const pt = publicTable(t, t.s.now);
        const m = me(t, rid, rid ? { pid: 'x', chips: 1 } : null);
        const { last, ...rest } = pt;
        const json = JSON.stringify({ rest, m });
        if (cur) assertNoLeak(json, forbiddenFor(cur, rid, cur.shown), `hand ${cur.id} to ${rid}`);
        if (last) {
          assert.ok(prev && prev.id.endsWith(`-${last.no}`), 'last is the previous hand');
          assertNoLeak(JSON.stringify(last), forbiddenFor(prev, '(nobody)', prev.shown), `last ${prev.id}`);
        }
        // the AI's view is built by the same functions
        if (rid && t.seatOf(rid) >= 0 && cur) {
          const v = viewFor(t, t.seatOf(rid));
          const { last: _prevHand, ...vt } = v.table;
          assertNoLeak(JSON.stringify({ vt, me: v.me }), forbiddenFor(cur, rid, cur.shown), 'viewFor');
        }
        checks++;
      }
    }
    hands += n;
  }
  console.log(`# views fuzz: ${hands} hands, ${checks} recipient checks`);
  assert.ok(hands >= 3000);
});
