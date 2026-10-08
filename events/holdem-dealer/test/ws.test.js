// WebSocket integration with real `ws` clients against a real server: 2-, 6- and 9-seat tables of humans and bots
// playing many hands to showdown (all-in side pots included) with chips conserved after every step; every frame
// every client received is scanned (it only ever holds its own hole cards); reconnect mid-hand; illegal, stale and
// out-of-turn actions; protocol limits; host operations; name protection; two sockets of one account.
import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { HoldemTable } from '../src/engine/table.js';
import { MAX_TABLES } from '../src/rooms.js';
import {
  startTest, newGuest, connect, Client, truthRecorder, chipsTotal, until, autoPlay, checkFrames, floatRng, sleep, ORIGIN,
} from './service-helpers.js';

const truth = truthRecorder();
let svc;
test.before(async () => { svc = await startTest({}, { onChange: (t) => truth.hook(t) }); });
test.after(async () => { await svc.stop(); });

const CODE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;

async function createTable(client, settings, practice = false) {
  const since = client.frames.length;
  client.send({ t: 'create', settings, practice });
  const created = await client.waitFor((m) => m.t === 'created', { since });
  assert.match(created.code, CODE);
  await client.waitFor((m) => m.t === 'state' && m.table.code === created.code, { since });
  return created.code;
}

async function sit(client, seat, buyIn) {
  const since = client.frames.length;
  client.send({ t: 'sit', seat, buyIn });
  return client.waitFor((m) => (m.t === 'state' && m.me && m.me.seat === seat) || (m.t === 'error' && m.re === 'sit'), { since });
}

async function watch(client, code) {
  const since = client.frames.length;
  client.send({ t: 'watch', code });
  return client.waitFor((m) => (m.t === 'state' && m.table.code === code) || (m.t === 'error' && m.re === 'watch'), { since });
}

// conservation of chips after every table step for one table and its humans
function conserve(code, ids) {
  const base = chipsTotal(svc, code, ids);
  const bad = [];
  const check = (t) => {
    if (t.code !== code) return;
    const now = chipsTotal(svc, code, ids);
    if (now !== base) bad.push({ rev: t.rev, now, base });
  };
  truth.checks.add(check);
  return { bad, base, stop: () => truth.checks.delete(check) };
}

async function sendAndError(client, msg) {
  const since = client.frames.length;
  client.send(msg);
  return client.waitFor((m) => m.t === 'error', { since });
}

test('heads-up: two humans play 25 hands; chips conserved; everyone sees only their own cards', async () => {
  const A = await newGuest(svc, 'Ada');
  const B = await newGuest(svc, 'Bea');
  const ca = await connect(svc, A.token);
  const cb = await connect(svc, B.token);
  const code = await createTable(ca, { blinds: '10/20', seats: 2, actionSec: 20, timeBankSec: 30 });
  assert.equal((await sit(ca, 0, 1000)).t, 'state');
  await watch(cb, code);
  assert.equal((await sit(cb, 1, 800)).t, 'state');
  for (const id of [A.id, B.id]) svc.accounts.get(id).chips = 1_000_000;
  const cons = conserve(code, [A.id, B.id]);
  autoPlay(ca, { rng: floatRng(11) });
  autoPlay(cb, { rng: floatRng(12) });
  ca.send({ t: 'host', op: 'start' });
  await until(() => truth.handsDone(code) >= 25, { timeout: 30000, what: '25 hands' });
  ca.playing = cb.playing = false;
  cons.stop();
  assert.deepEqual(cons.bad, [], 'chips conserved after every step');
  assert.ok(truth.showdowns.get(code) >= 1, 'hands went to showdown');
  assert.ok(checkFrames(ca, truth, A.account.pid) > 50);
  assert.ok(checkFrames(cb, truth, B.account.pid) > 50);
  assert.deepEqual([...ca.errors, ...cb.errors].filter((e) => e.re === 'act'), [], 'no action of a correct client was refused');
  // records reached the accounts and were pushed
  const acc = ca.frames.filter((m) => m.t === 'account').pop();
  assert.ok(acc && acc.account.holdem.hands >= 20, 'account pushes with records');
  assert.equal(svc.accounts.get(A.id).holdem.hands, svc.accounts.get(B.id).holdem.hands);
  assert.equal(svc.accounts.get(A.id).holdem.net + svc.accounts.get(B.id).holdem.net, 0, 'heads-up: nets cancel');
  // the same snapshot reached both: compare a common rev
  const revA = new Map(ca.frames.filter((m) => m.t === 'state').map((m) => [m.rev, m]));
  const common = cb.frames.filter((m) => m.t === 'state' && revA.has(m.rev)).pop();
  assert.deepEqual(common.table, revA.get(common.rev).table, 'one public table per rev');
  ca.close(); cb.close();
});

test('practice table: 6-max, 5 bots, started at once; a spectator watches; 20 hands', async () => {
  const P = await newGuest(svc, 'Pia');
  const S = await newGuest(svc, 'Sam');
  const cp = await connect(svc, P.token);
  cp.send({ t: 'create', practice: true, settings: { blinds: '25/50', seats: 9 } });
  const { code } = await cp.waitFor((m) => m.t === 'created');
  const first = await cp.waitFor((m) => m.t === 'state' && m.table.code === code);
  assert.equal(first.table.settings.seats, 6, 'practice tables are 6-max');
  assert.equal(first.table.phase, 'running');
  assert.equal(first.me.seat, 0);
  assert.equal(first.table.seats.filter((s) => s && s.bot).length, 5);
  assert.equal(first.table.seats[0].stack + first.table.seats[0].bet, 5000, 'default buy-in: the max buy-in (a blind may be posted)');
  assert.equal(first.me.chips, 5000, 'bankroll after the buy-in');
  const cs = await connect(svc, S.token);
  await watch(cs, code);
  svc.accounts.get(P.id).chips = 1_000_000;
  const cons = conserve(code, [P.id]);
  autoPlay(cp, { rng: floatRng(21) });
  await until(() => truth.handsDone(code) >= 20, { timeout: 30000, what: '20 practice hands' });
  cp.playing = false;
  cons.stop();
  assert.deepEqual(cons.bad, []);
  assert.ok(truth.showdowns.get(code) >= 1, 'hands went to showdown');
  checkFrames(cp, truth, P.account.pid);
  assert.ok(checkFrames(cs, truth, S.account.pid) > 20);
  assert.ok(cs.frames.filter((m) => m.t === 'state').every((m) => m.me.seat === null && m.me.hole === null));
  // the spectator saw bots act and hands end
  assert.ok(cs.frames.some((m) => m.t === 'state' && m.table.hand && m.table.hand.done));
  cp.close(); cs.close();
});

test('9 seats: 4 humans and 5 bots, uneven stacks, all-in side pots and showdowns over 30 hands', async () => {
  const humans = await Promise.all(['Ann', 'Ben', 'Cal', 'Dee'].map((n) => newGuest(svc, n)));
  const clients = await Promise.all(humans.map((h) => connect(svc, h.token)));
  const code = await createTable(clients[0], { blinds: '10/20', seats: 9 });
  for (let k = 1; k < 4; k++) await watch(clients[k], code);
  const buyIns = [800, 1200, 1600, 2000];
  for (let k = 0; k < 4; k++) assert.equal((await sit(clients[k], k * 2, buyIns[k])).t, 'state');
  const since = clients[0].frames.length;
  clients[0].send({ t: 'host', op: 'fillBots' });
  const filled = await clients[0].waitFor((m) => m.t === 'state' && m.table.seats.filter(Boolean).length === 9, { since });
  assert.deepEqual(filled.table.seats.map((s) => (s.bot ? 'bot' : 'human')), ['human', 'bot', 'human', 'bot', 'human', 'bot', 'human', 'bot', 'bot']);
  for (const h of humans) svc.accounts.get(h.id).chips = 1_000_000;
  const before = truth.stats.sidePots;
  const cons = conserve(code, humans.map((h) => h.id));
  clients.forEach((c, k) => autoPlay(c, { rng: floatRng(31 + k) }));
  clients[0].send({ t: 'host', op: 'start' });
  await until(() => truth.handsDone(code) >= 30, { timeout: 45000, what: '30 nine-seat hands' });
  for (const c of clients) c.playing = false;
  cons.stop();
  assert.deepEqual(cons.bad, []);
  assert.ok(truth.stats.sidePots > before, 'side pots happened');
  assert.ok(clients.some((c) => c.frames.some((m) => m.t === 'state' && m.table.hand && m.table.hand.pots.length >= 2)), 'side pots reached the clients');
  assert.ok(truth.showdowns.get(code) >= 1, 'hands went to showdown');
  clients.forEach((c, k) => checkFrames(c, truth, humans[k].account.pid));
  assert.deepEqual(clients.flatMap((c) => c.errors).filter((e) => e.re === 'act'), []);
  for (const c of clients) c.close();
});

test('reconnect mid-hand: the seat is kept, others see it disconnected, the new socket resumes with its cards', async () => {
  const P = await newGuest(svc, 'Rex');
  const S = await newGuest(svc, 'Spy');
  const cp = await connect(svc, P.token);
  cp.send({ t: 'create', practice: true, settings: {} });
  const { code } = await cp.waitFor((m) => m.t === 'created');
  const cs = await connect(svc, S.token);
  await watch(cs, code);
  // wait until it is P's turn (bots are instant), then drop the socket instead of acting
  const turn = await cp.waitFor((m) => m.t === 'state' && m.table.hand && !m.table.hand.done && m.table.hand.toAct === m.me.seat, { timeout: 10000 });
  const hole = turn.me.hole;
  const handId = turn.table.hand.id;
  assert.equal(hole.length, 2);
  cp.close();
  await cs.next((m) => m.t === 'state' && m.table.seats[0].connected === false);
  const cp2 = await connect(svc, P.token);
  const back = await watch(cp2, code);
  assert.equal(back.t, 'state');
  assert.equal(back.table.hand.id, handId, 'same hand');
  assert.equal(back.me.seat, 0, 'seat never released');
  assert.deepEqual(back.me.hole, hole, 'same cards');
  assert.ok(back.me.legal, 'still to act');
  assert.equal(back.table.seats[0].connected, true);
  await cs.waitFor((m) => m.t === 'state' && m.rev >= back.rev && m.table.seats[0].connected === true);
  const L = back.me.legal;
  cp2.send({ t: 'act', hand: handId, action: L.check ? 'check' : 'call' });
  autoPlay(cp2, { rng: floatRng(41) });
  await cp2.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.id === handId && m.table.hand.done, { timeout: 10000 });
  cp2.playing = false;
  checkFrames(cp, truth, P.account.pid);
  checkFrames(cp2, truth, P.account.pid);
  checkFrames(cs, truth, S.account.pid);
  cp2.close(); cs.close();
});

test('illegal, stale and out-of-turn actions are refused and change nothing', async () => {
  const A = await newGuest(svc, 'Ida');
  const B = await newGuest(svc, 'Jon');
  const W = await newGuest(svc, 'Kit');
  const ca = await connect(svc, A.token);
  const cb = await connect(svc, B.token);
  const cw = await connect(svc, W.token);
  const code = await createTable(ca, { blinds: '10/20', seats: 2 });
  await sit(ca, 0, 1000);
  await watch(cb, code);
  await sit(cb, 1, 1000);
  await watch(cw, code);
  ca.send({ t: 'host', op: 'start' });
  const st = await ca.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.toAct !== null);
  const h = st.table.hand;
  const actorClient = h.toAct === 0 ? ca : cb;
  const otherClient = h.toAct === 0 ? cb : ca;
  const table = svc.rooms.get(code);
  const rev = table.rev;
  const legal = (await actorClient.waitFor((m) => m.t === 'state' && m.rev >= st.rev && m.me.legal)).me.legal;
  assert.equal(legal.check, false, 'the small blind faces the big blind');
  const expectErr = async (client, msg, code2) => {
    const e = await sendAndError(client, msg);
    assert.equal(e.code, code2, JSON.stringify(msg));
    assert.equal(e.re, msg.t || null);
  };
  await expectErr(otherClient, { t: 'act', hand: h.id, action: 'call' }, 'not_your_turn');
  await expectErr(cw, { t: 'act', hand: h.id, action: 'call' }, 'not_seated');
  await expectErr(actorClient, { t: 'act', hand: `${code}-99`, action: 'call' }, 'stale_hand');
  await expectErr(actorClient, { t: 'act', hand: h.id, action: 'check' }, 'illegal_action');
  await expectErr(actorClient, { t: 'act', hand: h.id, action: 'raise', to: legal.minRaiseTo - 1 }, 'bad_amount');
  await expectErr(actorClient, { t: 'act', hand: h.id, action: 'raise', to: legal.maxRaiseTo + 1 }, 'bad_amount');
  await expectErr(actorClient, { t: 'act', hand: h.id, action: 'raise' }, 'bad_message');
  await expectErr(actorClient, { t: 'act', hand: h.id, action: 'bet', to: 100 }, 'bad_message');
  await expectErr(actorClient, { t: 'act', action: 'call' }, 'bad_message');
  await expectErr(actorClient, { t: 'act', hand: h.id, action: 'raise', to: 100.5 }, 'bad_message');
  await expectErr(otherClient, { t: 'sit', seat: 0, buyIn: 1000 }, 'seat_taken');
  await expectErr(cw, { t: 'sit', seat: 0, buyIn: 1000 }, 'seat_taken');
  await expectErr(cw, { t: 'sit', seat: 5, buyIn: 1000 }, 'bad_seat');
  await expectErr(cw, { t: 'topUp', amount: 100 }, 'not_seated');
  await expectErr(cb, { t: 'host', op: 'dissolve' }, 'not_host');
  await expectErr(cw, { t: 'host', op: 'start' }, 'not_host');
  await expectErr(otherClient, { t: 'show' }, 'cannot_show');
  assert.equal(table.rev, rev, 'nothing changed');
  // a legal call, then a second identical call (a double click) is refused
  const since = actorClient.frames.length;
  actorClient.send({ t: 'act', hand: h.id, action: 'call' });
  actorClient.send({ t: 'act', hand: h.id, action: 'call' });
  const after = await actorClient.waitFor((m) => m.t === 'error', { since });
  assert.ok(['not_your_turn', 'illegal_action'].includes(after.code));
  // fold the hand; the old hand id is stale afterwards
  const cur = await ca.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.id === h.id && m.table.hand.toAct !== null && m.rev > rev);
  const who = cur.table.hand.toAct === 0 ? ca : cb;
  who.send({ t: 'act', hand: h.id, action: 'fold' });
  await ca.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.id !== h.id, { timeout: 5000 });
  await expectErr(ca, { t: 'act', hand: h.id, action: 'call' }, 'stale_hand');
  checkFrames(ca, truth, A.account.pid);
  checkFrames(cb, truth, B.account.pid);
  checkFrames(cw, truth, W.account.pid);
  ca.send({ t: 'host', op: 'dissolve' });
  await cw.waitFor((m) => m.t === 'closed');
  ca.close(); cb.close(); cw.close();
});

test('protocol: origin, path, hello (timeout, bad token, order), malformed messages, 4 KB frames, 40 msg/s, ping', async () => {
  await assert.rejects(new Client(svc.url, { origin: 'https://evil.example' }).opened, (e) => e.status === 403);
  await assert.rejects(new Promise((resolve, reject) => {
    const ws = new WebSocket(`${svc.url.replace('http', 'ws')}/v1/other`, { headers: { origin: ORIGIN } });
    ws.on('open', resolve);
    ws.on('unexpected-response', (req, res) => reject(Object.assign(new Error('x'), { status: res.statusCode })));
    ws.on('error', () => {});
  }), (e) => e.status === 404);
  // the Origin header is required
  await assert.rejects(new Promise((resolve, reject) => {
    const ws = new WebSocket(`${svc.url.replace('http', 'ws')}/v1/ws`);
    ws.on('open', resolve);
    ws.on('unexpected-response', (req, res) => reject(Object.assign(new Error('x'), { status: res.statusCode })));
    ws.on('error', () => {});
  }), (e) => e.status === 403);

  const c1 = new Client(svc.url);
  await c1.opened;
  c1.send({ t: 'watch', code: 'ABCDE' });
  assert.deepEqual((await c1.waitFor((m) => m.t === 'error')).code, 'no_hello');
  c1.send({ t: 'ping' });
  const pong = await c1.waitFor((m) => m.t === 'pong');
  assert.ok(Math.abs(pong.serverTime - Date.now()) < 5000);
  const bad = await c1.hello('x'.repeat(43));
  assert.equal(bad.code, 'bad_token');
  assert.equal(bad.re, 'hello');
  assert.equal((await c1.waitClose()).code, 1008);

  const G = await newGuest(svc, 'Lou');
  const c2 = await connect(svc, G.token);
  const welcome = c2.frames.find((m) => m.t === 'welcome');
  assert.equal(welcome.account.pid, G.account.pid);
  assert.deepEqual(welcome.features, { emailLink: false });
  assert.equal(welcome.account.id, undefined, 'internal id never sent');
  for (const [raw, code] of [
    ['{nope', 'bad_json'],
    ['[1,2]', 'bad_message'],
    [JSON.stringify({ t: 'dance' }), 'bad_message'],
    [JSON.stringify({ t: 'sit', seat: 'x', buyIn: 100 }), 'bad_message'],
    [JSON.stringify({ t: 'sit', seat: 9, buyIn: 100 }), 'bad_message'],
    [JSON.stringify({ t: 'watch', code: 'abc' }), 'bad_message'],
    [JSON.stringify({ t: 'watch', code: 'zzzzz' }), 'no_table'],
    [JSON.stringify({ t: 'host', op: 'nuke' }), 'bad_message'],
    [JSON.stringify({ t: 'create', settings: { blinds: '1/2' } }), 'bad_settings'],
    [JSON.stringify({ t: 'create', settings: { seats: 12 } }), 'bad_settings'],
    [JSON.stringify({ t: 'stand' }), 'no_table'],
    [JSON.stringify({ t: 'hello', v: 1, token: G.token }), 'already_hello'],
  ]) {
    const since = c2.frames.length;
    c2.send(raw);
    const e = await c2.waitFor((m) => m.t === 'error', { since });
    assert.equal(e.code, code, raw);
  }
  // a frame over 4 KB closes the socket
  c2.send(JSON.stringify({ t: 'ping', pad: 'x'.repeat(5000) }));
  assert.equal((await c2.waitClose()).code, 1009);
  // more than 40 messages in a second closes it
  const c3 = await connect(svc, G.token);
  for (let i = 0; i < 60; i++) c3.send({ t: 'ping' });
  assert.equal((await c3.waitClose()).code, 1008);
  assert.ok(c3.frames.filter((m) => m.t === 'pong').length <= 40);
});

test('hello must come within the time limit', async () => {
  const quick = await startTest({}, { helloMs: 150 });
  try {
    const c = new Client(quick.url);
    await c.opened;
    const t0 = Date.now();
    const closed = await c.waitClose(3000);
    assert.equal(closed.code, 1008);
    assert.ok(Date.now() - t0 < 2000);
  } finally {
    await quick.stop();
  }
});

test('host operations, dissolve returns every chip, closed message; codes; at most 3 hosted tables', async () => {
  const H = await newGuest(svc, 'Host');
  const G = await newGuest(svc, 'Gus');
  const ch = await connect(svc, H.token);
  const cg = await connect(svc, G.token);
  const code = await createTable(ch, { blinds: '5/10', seats: 6, actionSec: 15, timeBankSec: 0 });
  await sit(ch, 0, 1000);
  await watch(cg, code);
  await sit(cg, 3, 400);
  assert.equal((await sendAndError(cg, { t: 'host', op: 'start' })).code, 'not_host');
  let since = ch.frames.length;
  ch.send({ t: 'host', op: 'settings', settings: { blinds: '10/20', seats: 6, actionSec: 30, timeBankSec: 60 } });
  const s1 = await ch.waitFor((m) => m.t === 'state' && m.table.settings.bb === 20, { since });
  assert.equal(s1.table.settings.actionSec, 30);
  since = ch.frames.length;
  ch.send({ t: 'host', op: 'fillBots', count: 2 });
  const s2 = await ch.waitFor((m) => m.t === 'state' && m.table.seats.filter((s) => s && s.bot).length === 2, { since });
  const botSeat = s2.table.seats.findIndex((s) => s && s.bot);
  since = ch.frames.length;
  ch.send({ t: 'host', op: 'removeBot', seat: botSeat });
  await ch.waitFor((m) => m.t === 'state' && m.table.seats.filter((s) => s && s.bot).length === 1, { since });
  assert.equal((await sendAndError(ch, { t: 'host', op: 'removeBot', seat: 3 })).code, 'not_bot');
  ch.send({ t: 'host', op: 'start' });
  await ch.waitFor((m) => m.t === 'state' && m.table.phase === 'running' && m.table.hand);
  assert.equal((await sendAndError(ch, { t: 'host', op: 'settings', settings: { blinds: '5/10' } })).code, 'bad_phase');
  ch.send({ t: 'host', op: 'dissolve' });
  const [x1, x2] = await Promise.all([ch.waitFor((m) => m.t === 'closed'), cg.waitFor((m) => m.t === 'closed')]);
  assert.deepEqual([x1.code, x1.reason, x2.reason], [code, 'dissolved', 'dissolved']);
  assert.equal(svc.rooms.get(code), null);
  assert.equal(svc.accounts.get(H.id).chips, 10_000, 'a cancelled hand gives everything back');
  assert.equal(svc.accounts.get(G.id).chips, 10_000);
  const pushed = cg.frames.filter((m) => m.t === 'account').pop();
  assert.equal(pushed.account.chips, 10_000);
  assert.equal((await sendAndError(cg, { t: 'sit', seat: 1, buyIn: 400 })).code, 'no_table');
  // host limit; a socket watches one table at a time (creating moves it to the new table)
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push(await createTable(ch, {}));
  assert.equal(new Set(codes).size, 3);
  const watchersOf = (c) => [...svc.rooms.tables.get(c).watchers].filter((x) => x.accountId === H.id).length;
  assert.deepEqual(codes.map(watchersOf), [0, 0, 1]);
  for (const c of codes) assert.match(c, CODE);
  assert.equal((await sendAndError(ch, { t: 'create', settings: {} })).code, 'too_many_tables');
  for (const c of codes) { await watch(ch, c); ch.send({ t: 'host', op: 'dissolve' }); await ch.next((m) => m.t === 'closed'); }
  // at most 200 open tables on the service
  const fillers = [];
  for (let i = 0; svc.rooms.tables.size < MAX_TABLES; i++) {
    const t = new HoldemTable({ code: `FILL${i}`, settings: {}, host: null, now: Date.now() });
    svc.rooms.tables.set(t.code, svc.rooms._entry(t));
    fillers.push(t.code);
  }
  assert.equal((await sendAndError(cg, { t: 'create', settings: {} })).code, 'too_many_tables');
  for (const c of fillers) svc.rooms.tables.delete(c);
  ch.close(); cg.close();
});

test('a protected name cannot sit; two sockets of one account share the seat; the first valid action wins', async () => {
  const owner = await newGuest(svc, 'Vera');
  const o = svc.accounts.get(owner.id);
  o.email = { uid: 'x', masked: 'v***@ucsd.edu', hash: 'hv', linkedAt: Date.now() };
  svc.accounts._reindexNames();
  const imp = await newGuest(svc, 'Wren');
  svc.accounts.get(imp.id).name = 'VERA';
  const ci = await connect(svc, imp.token);
  const code = await createTable(ci, { seats: 2 });
  const r = await sit(ci, 0, 1000);
  assert.equal(r.t, 'error');
  assert.equal(r.code, 'name_protected');
  ci.send({ t: 'create', practice: true });
  assert.equal((await ci.next((m) => m.t === 'error')).code, 'name_protected');

  const Y = await newGuest(svc, 'Yan');
  const Z = await newGuest(svc, 'Zed');
  const phone = await connect(svc, Y.token);
  const laptop = await connect(svc, Y.token);
  const cz = await connect(svc, Z.token);
  await watch(phone, code);
  await watch(laptop, code);
  await watch(cz, code);
  await sit(laptop, 0, 1000);
  await sit(cz, 1, 1000);
  ci.send({ t: 'host', op: 'start' });
  const run = await cz.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.toAct !== null);
  // heads-up: the button (small blind) acts first; if that is Zed, Zed calls and Yan gets the option
  if (run.table.hand.toAct === 1) cz.send({ t: 'act', hand: run.table.hand.id, action: 'call' });
  // wait for Yan's turn on both sockets
  const p = await phone.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.toAct === 0 && m.me.legal);
  await laptop.waitFor((m) => m.t === 'state' && m.rev === p.rev);
  assert.deepEqual(p.me.hole, laptop.frames.find((m) => m.rev === p.rev).me.hole, 'both sockets see the same own cards');
  const sinceL = laptop.frames.length;
  phone.send({ t: 'act', hand: p.table.hand.id, action: 'fold' });
  await laptop.waitFor((m) => m.t === 'state' && m.rev > p.rev, { since: sinceL });
  const e = await sendAndError(laptop, { t: 'act', hand: p.table.hand.id, action: 'call' });
  assert.ok(['stale_hand', 'not_your_turn'].includes(e.code));
  checkFrames(phone, truth, Y.account.pid);
  checkFrames(laptop, truth, Y.account.pid);
  checkFrames(cz, truth, Z.account.pid);
  // closing one socket keeps the seat connected; closing both shows it disconnected
  phone.close();
  await sleep(100);
  assert.equal(svc.rooms.get(code).seats[0].connected, true);
  laptop.close();
  await cz.waitFor((m) => m.t === 'state' && m.table.seats[0] && m.table.seats[0].connected === false);
  ci.close(); cz.close();
});
