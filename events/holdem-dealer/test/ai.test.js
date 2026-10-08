// Bot AI: legal decisions only, personalities with clearly different statistics, reads nothing but its view.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HoldemTable } from '../src/engine/table.js';
import { seededRng, cardIndex } from '../src/engine/cards.js';
import { evaluate, catOf, rankInts } from '../src/engine/evaluator.js';
import { decide, thinkDelay, STYLES, preflopTable, handClass, equity, draws } from '../src/engine/ai.js';
import { wake } from './helpers.js';

// Decision points from real bots-only play (2..9 seats); each spot is a plain JSON copy of viewFor(seat).
function collectSpots({ count, seed }) {
  const spots = [];
  let k = 0;
  while (spots.length < count) {
    const seats = 2 + (k % 8);
    const rng = seededRng(seed + k);
    const ai = seededRng(seed + 1000 + k);
    k++;
    const t = new HoldemTable({ code: 'A', settings: { seats }, host: { id: 'u_h', pid: 'p_h' }, now: 0, rng, options: { pauseWithoutHumans: false } });
    t.hostOp('u_h', 'fillBots', {}, 0);
    t.hostOp('u_h', 'start', {}, 0);
    for (let step = 0; step < 3000 && spots.length < count; step++) {
      const a = t.actor();
      if (a) {
        const v = t.viewFor(a.seat);
        spots.push(JSON.parse(JSON.stringify(v)));
        const d = decide(v, { rng: ai, style: t.seats[a.seat].bot, budget: 0.1 });
        t.act(a.id, a.handId, d.action, d.to, t.s.now + 1);
      } else if (wake(t) === null) break;
      if ((!t.hand || t.hand.done) && t.seats.filter(Boolean).length < 2) t.hostOp('u_h', 'fillBots', {}, t.s.now);
    }
  }
  return spots;
}

const SPOTS = collectSpots({ count: 6000, seed: 9000 });

function checkLegal(d, L) {
  assert.ok(d && typeof d.action === 'string');
  switch (d.action) {
    case 'fold': return;
    case 'check': assert.ok(L.check, 'check legal'); return;
    case 'call': assert.ok(!L.check && L.call > 0, 'call legal'); return;
    case 'raise': assert.ok(L.canRaise && Number.isInteger(d.to) && d.to >= L.minRaiseTo && d.to <= L.maxRaiseTo, `raise ${d.to} in ${JSON.stringify(L)}`); return;
    case 'allin': assert.ok(L.canRaise || L.call > 0, 'allin legal'); return;
    default: assert.fail('unknown action ' + d.action);
  }
}

test('raises are tidy: a multiple of the small blind (of the big blind from 20 BB), or the minimum / all-in', () => {
  let raises = 0;
  for (const style of STYLES) {
    const rng = seededRng(3);
    for (const v of SPOTS) {
      const d = decide(v, { rng, style, budget: 0.1 });
      if (d.action !== 'raise') continue;
      raises++;
      const { sb, bb } = v.table.settings;
      const L = v.me.legal;
      const unit = d.to >= 20 * bb ? bb : sb;
      assert.ok(d.to % unit === 0 || d.to === L.minRaiseTo || d.to === L.maxRaiseTo, `raise to ${d.to} with blinds ${sb}/${bb}`);
    }
  }
  assert.ok(raises > 200, `${raises} raises`);
});

test('every decision of every personality is legal', () => {
  for (const style of STYLES) {
    const rng = seededRng(1);
    for (const v of SPOTS) checkLegal(decide(v, { rng, style, budget: 0.1 }), v.me.legal);
  }
  // and never folds when checking is free
  for (const v of SPOTS.filter((x) => x.me.legal.check)) {
    for (const style of STYLES) assert.notEqual(decide(v, { rng: seededRng(2), style, budget: 0.1 }).action, 'fold');
  }
});

test('decisions only read the view: a strict proxy that throws on any unknown key or any write', () => {
  const strict = (obj, path = 'view') => {
    if (obj === null || typeof obj !== 'object') return obj;
    return new Proxy(obj, {
      get(target, key, recv) {
        if (typeof key === 'symbol') return Reflect.get(target, key, recv);
        if (!Reflect.has(target, key)) throw new Error(`AI read unknown ${path}.${String(key)}`);
        return strict(Reflect.get(target, key, recv), `${path}.${String(key)}`);
      },
      set(_t, key) { throw new Error(`AI wrote ${path}.${String(key)}`); },
      defineProperty(_t, key) { throw new Error(`AI defined ${path}.${String(key)}`); },
      deleteProperty(_t, key) { throw new Error(`AI deleted ${path}.${String(key)}`); },
    });
  };
  for (const style of STYLES) {
    const rng = seededRng(3);
    for (const v of SPOTS.slice(0, 1500)) {
      const d = decide(strict(v), { rng, style, budget: 0.1 });
      checkLegal(d, v.me.legal);
      thinkDelay(strict(v), d, rng);
    }
  }
  // the view itself carries no hidden information: only own hole cards and exposed cards
  const tokens = new Set();
  for (const v of SPOTS.slice(0, 200)) {
    const vis = new Set([...v.me.hole, ...v.table.hand.board, ...v.table.seats.flatMap((s) => (s && s.shown) || [])]);
    const { last, ...rest } = v.table;
    for (const tok of JSON.stringify({ rest, me: v.me }).match(/"[2-9TJQKA][shdc]"/g) || []) {
      tokens.add(tok);
      assert.ok(vis.has(tok.slice(1, 3)), `unexpected card ${tok}`);
    }
  }
  assert.ok(tokens.size > 20);
  // and the module cannot reach the table: it imports nothing but cards and the evaluator
  const src = readFileSync(new URL('../src/engine/ai.js', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, ['./cards.js', './evaluator.js']);
});

function stats(style, spots) {
  const rng = seededRng(11);
  let pfFacing = 0, pfFold = 0, pfRaise = 0, pfAll = 0;
  let strongFree = 0, strongCheck = 0, postBets = 0, postAll = 0, postFacing = 0, postRaise = 0;
  for (const v of spots) {
    const d = decide(v, { rng, style, budget: 0.15 });
    const L = v.me.legal;
    const aggressive = d.action === 'raise' || d.action === 'allin';
    if (v.table.hand.street === 'preflop') {
      pfAll++;
      if (aggressive) pfRaise++;
      if (!L.check) { pfFacing++; if (d.action === 'fold') pfFold++; }
    } else {
      postAll++;
      if (aggressive) postBets++;
      if (!L.check) { postFacing++; if (aggressive) postRaise++; }
      const cat = catOf(rankInts([...v.me.hole, ...v.table.hand.board].map(cardIndex)));
      if (L.check && ['two_pair', 'trips', 'straight', 'flush', 'full_house', 'quads', 'straight_flush'].includes(cat) && v.table.hand.street !== 'river') {
        strongFree++;
        if (d.action === 'check') strongCheck++;
      }
    }
  }
  return {
    foldVsBet: pfFold / pfFacing, pfRaise: pfRaise / pfAll, postAgg: postBets / postAll,
    raiseVsBet: postRaise / postFacing, slowplay: strongCheck / strongFree,
  };
}

test('personalities: steady folds more pre-flop than fierce; fierce raises most; sly slow-plays most', () => {
  const s = Object.fromEntries(STYLES.map((st) => [st, stats(st, SPOTS)]));
  for (const st of STYLES) console.log(`# ${st.padEnd(8)} ${Object.entries(s[st]).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join('  ')}`);
  assert.ok(s.steady.foldVsBet > s.fierce.foldVsBet + 0.10, 'steady folds pre-flop much more than fierce');
  assert.ok(s.steady.foldVsBet > s.veteran.foldVsBet && s.veteran.foldVsBet > s.fierce.foldVsBet);
  assert.ok(s.fierce.pfRaise > s.veteran.pfRaise && s.veteran.pfRaise > s.steady.pfRaise, 'pre-flop raising order');
  assert.ok(s.fierce.postAgg > s.steady.postAgg, 'fierce bets and raises more after the flop');
  assert.ok(s.sly.slowplay > s.steady.slowplay && s.sly.slowplay > s.fierce.slowplay, 'sly checks strong hands most');
  assert.ok(s.sly.slowplay > 0.2);
});

test('pre-flop table: equities and percentiles of the 169 starting hands', () => {
  const t1 = preflopTable(1);
  assert.equal(t1.equity.size, 169);
  assert.ok(Math.abs(t1.equity.get('AA') - 0.852) < 0.03, `AA ${t1.equity.get('AA')}`);
  assert.ok(Math.abs(t1.equity.get('72o') - 0.346) < 0.03, `72o ${t1.equity.get('72o')}`);
  assert.ok(Math.abs(t1.equity.get('AKs') - 0.67) < 0.03);
  assert.ok(t1.top.get('AA') < 0.01 && t1.top.get('72o') > 0.95);
  const t5 = preflopTable(5);
  assert.ok(t5.equity.get('AA') > 0.45 && t5.equity.get('AA') < 0.53, `AA vs 5: ${t5.equity.get('AA')}`);
  assert.ok(t5.equity.get('76s') > t5.equity.get('K7o'), 'suited connectors gain multiway');
  assert.equal(handClass('As', 'Kd'), 'AKo');
  assert.equal(handClass('7h', '9h'), '97s');
  assert.equal(handClass('Tc', 'Td'), 'TT');
  // post-flop equity: a made flush vs one random hand is a big favourite; a dominated hand is not
  const rng = seededRng(4);
  const ints = (s) => s.split(' ').map(cardIndex);
  assert.ok(equity(ints('Ah Kh'), ints('2h 7h 9h'), 1, 3000, rng) > 0.9);
  assert.ok(equity(ints('2c 3d'), ints('Ah Ks Qd'), 1, 3000, rng) < 0.3);
  assert.ok(equity(ints('Ac Kd'), ints('Ah Ks 7d 2c'), 3, 3000, rng) > 0.75, 'top two pair vs three random hands');
  assert.deepEqual(draws(ints('Ah Kh'), ints('2h 7h 9c')), { flush: true, oesd: false, gut: false });
  assert.deepEqual(draws(ints('8c 9d'), ints('Ts Jh 2c')), { flush: false, oesd: true, gut: false });
  assert.deepEqual(draws(ints('8c 9d'), ints('Qs Jh 2c')), { flush: false, oesd: false, gut: true });
  assert.deepEqual(draws(ints('Ac 2d'), ints('3s 4h Kc')), { flush: false, oesd: false, gut: true }, 'wheel gutshot');
  assert.deepEqual(draws(ints('8c 9d'), ints('Ts Jh 7c')), { flush: false, oesd: false, gut: false }, 'made straight is not a draw');
});

test('think delay: 700..2400 ms, longer for big decisions; a decision takes milliseconds', () => {
  const rng = seededRng(5);
  let small = 0, big = 0, ns = 0, nb = 0;
  for (const v of SPOTS.slice(0, 2000)) {
    const d = decide(v, { rng, style: 'veteran', budget: 0.1 });
    const ms = thinkDelay(v, d, rng);
    assert.ok(ms >= 700 && ms <= 2400);
    const stack = v.table.seats[v.me.seat].stack;
    if (v.me.legal.call > 0.3 * stack || d.action === 'allin') { big += ms; nb++; } else { small += ms; ns++; }
  }
  assert.ok(big / nb > small / ns + 200, `big ${big / nb} vs small ${small / ns}`);
  // full-budget decisions in multiway post-flop spots stay fast
  const multi = SPOTS.filter((v) => v.table.hand.street !== 'preflop' && v.table.seats.filter((s) => s && s.inHand).length >= 3).slice(0, 100);
  assert.ok(multi.length >= 10, `multiway spots: ${multi.length}`);
  const t0 = process.hrtime.bigint();
  for (const v of multi) decide(v, { rng, style: 'sly', budget: 1 });
  const per = Number(process.hrtime.bigint() - t0) / 1e6 / multi.length;
  console.log(`# multiway post-flop decision: ${per.toFixed(2)} ms`);
  assert.ok(per < 30);
  // evaluate is consistent with the AI's own fast path on these spots
  const v = multi[0];
  assert.equal(evaluate([...v.me.hole, ...v.table.hand.board]).rank, rankInts([...v.me.hole, ...v.table.hand.board].map(cardIndex)));
});

test('decide returns null when it is not the seat\'s turn', () => {
  const v = JSON.parse(JSON.stringify(SPOTS[0]));
  v.me.legal = null;
  assert.equal(decide(v, { rng: seededRng(1) }), null);
});
