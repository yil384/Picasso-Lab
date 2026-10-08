// Test hooks (HOLDEM_TEST_HOOKS=1, browser harness only): refused in production, absent unless switched on, loopback
// only; the hands record matches what was dealt; a rigged next hand deals exactly the asked cards; held writes; the
// Firebase key fetcher follows FIREBASE_JWKS_URL (and only with the hooks on).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import { loadConfig, ConfigError } from '../src/config.js';
import { applyRig } from '../src/test-hooks.js';
import { HoldemTable } from '../src/engine/table.js';
import { seededRng } from '../src/engine/cards.js';
import { startTest, newGuest, connect, sleep, makeSigner, idClaims, PROJECT } from './service-helpers.js';
import { createVerifier } from '../src/firebase-token.js';

const PROD = { NODE_ENV: 'production', GAMES_SECRET: 'a'.repeat(40), IP_SALT: 'b'.repeat(40) };

test('config: hooks never in production; the key URL needs the hooks and a loopback address', () => {
  assert.equal(loadConfig({}).testHooks, false);
  assert.equal(loadConfig({ HOLDEM_TEST_HOOKS: '1' }).testHooks, true);
  assert.throws(() => loadConfig({ ...PROD, HOLDEM_TEST_HOOKS: '1' }), (e) => e instanceof ConfigError && /production/.test(e.message));
  assert.throws(() => loadConfig({ HOLDEM_TEST_HOOKS: 'yes' }), ConfigError);
  assert.throws(() => loadConfig({ FIREBASE_JWKS_URL: 'http://127.0.0.1:9/jwks' }), ConfigError);
  assert.throws(() => loadConfig({ HOLDEM_TEST_HOOKS: '1', FIREBASE_JWKS_URL: 'https://example.com/jwks' }), ConfigError);
  assert.equal(loadConfig({ HOLDEM_TEST_HOOKS: '1', FIREBASE_JWKS_URL: 'http://127.0.0.1:9/jwks' }).firebaseJwksUrl, 'http://127.0.0.1:9/jwks');
  assert.equal(loadConfig(PROD).testHooks, false);
});

test('without the flag /__test/* is an ordinary 404', async () => {
  const svc = await startTest();
  try {
    const r = await fetch(`${svc.url}/__test/hands`);
    assert.equal(r.status, 404);
    assert.equal((await r.json()).error, 'not_found');
  } finally { await svc.stop(); }
});

test('applyRig swaps the asked holes and board into place and keeps 52 distinct cards', () => {
  const t = new HoldemTable({ code: 'RIGGD', settings: { seats: 3 }, host: { id: 'u0', pid: 'p0' }, now: 0, rng: seededRng(5), options: { pauseWithoutHumans: false } });
  for (let i = 0; i < 3; i++) t.sit({ id: `u${i}`, pid: `p${i}`, name: `P${i}`, chips: 10_000 }, i, 1000, 0);
  t.hostOp('u0', 'start', {}, 0);
  for (let now = 0; now < 10_000 && !t.hand; now += 500) t.tick(now);
  const s = t.toJSON();
  applyRig(s, { holes: { 0: ['As', 'Ah'], 2: ['Kd', 'Kc'] }, board: ['Ad', 'Ac', 'Kh', '2s', '3s'] });
  assert.deepEqual(s.seats[0].hole, ['As', 'Ah']);
  assert.deepEqual(s.seats[2].hole, ['Kd', 'Kc']);
  assert.deepEqual([1, 2, 3, 5, 7].map((k) => s.hand.deck[k]), ['Ad', 'Ac', 'Kh', '2s', '3s']);
  const all = [...s.seats.flatMap((x) => x.hole), ...s.hand.deck, ...s.hand.burns];
  assert.equal(all.length, 52);
  assert.equal(new Set(all).size, 52);
});

test('hooks: loopback only, the hands record, a rigged next hand, keys from FIREBASE_JWKS_URL', async () => {
  const signer = makeSigner('hook-key');
  let keyFetches = 0;
  const keys = http.createServer((req, res) => {
    keyFetches++;
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' });
    res.end(JSON.stringify({ keys: [signer.jwk] }));
  });
  await new Promise((r) => keys.listen(0, '127.0.0.1', r));
  const jwksUrl = `http://127.0.0.1:${keys.address().port}/jwks`;
  const svc = await startTest({ HOLDEM_TEST_HOOKS: '1', FIREBASE_JWKS_URL: jwksUrl, EMAIL_LINK: 'on' });
  try {
    // a non-loopback caller (as the transport sees it) is refused
    const fake = await new Promise((resolve) => {
      const req = http.request(`${svc.url}/__test/hands`, { localAddress: '127.0.0.2' }, (res) => { res.resume(); resolve(res.statusCode); });
      req.on('error', () => resolve('refused'));
      req.end();
    });
    assert.ok(fake === 403 || fake === 'refused', String(fake));

    const a = await newGuest(svc, 'Ann');
    const b = await newGuest(svc, 'Bob');
    const ca = await connect(svc, a.token);
    const cb = await connect(svc, b.token);
    ca.send({ t: 'create', settings: { seats: 2 } });
    const { code } = await ca.waitFor((m) => m.t === 'created');
    await ca.waitFor((m) => m.t === 'state');
    const rig = await fetch(`${svc.url}/__test/deck`, { method: 'POST', body: JSON.stringify({ code, holes: { 0: ['7h', '7d'], 1: ['Ks', 'Qs'] }, board: ['7c', '7s', '2d', '9c', 'Jh'] }) });
    assert.equal(rig.status, 200);
    const bad = await fetch(`${svc.url}/__test/deck`, { method: 'POST', body: JSON.stringify({ code, board: ['7c', '7c'] }) });
    assert.equal(bad.status, 400);
    cb.send({ t: 'watch', code });
    await cb.waitFor((m) => m.t === 'state');
    ca.send({ t: 'sit', seat: 0, buyIn: 2000 });
    cb.send({ t: 'sit', seat: 1, buyIn: 2000 });
    await cb.waitFor((m) => m.t === 'state' && m.me?.seat === 1);
    ca.send({ t: 'host', op: 'start' });
    const sa = await ca.waitFor((m) => m.t === 'state' && m.me?.hole, { timeout: 8000 });
    const sb = await cb.waitFor((m) => m.t === 'state' && m.me?.hole, { timeout: 8000 });
    assert.deepEqual(sa.me.hole, ['7h', '7d']);
    assert.deepEqual(sb.me.hole, ['Ks', 'Qs']);
    const handId = sa.table.hand.id;
    const rec = (await (await fetch(`${svc.url}/__test/hands?code=${code}`)).json()).hands[handId];
    assert.deepEqual(rec.holes, { 0: ['7h', '7d'], 1: ['Ks', 'Qs'] });
    assert.deepEqual(rec.pids, { 0: a.account.pid, 1: b.account.pid });
    // both all in: the board runs out as rigged and quads win
    for (let k = 0; k < 6; k++) {
      const st = ca.lastState();
      const h = st.table.hand;
      if (h.done || h.toAct === null) break;
      const who = h.toAct === 0 ? ca : cb;
      const mine = await who.waitFor((m) => m.t === 'state' && m.rev >= st.rev);
      const since = ca.frames.length;
      who.send({ t: 'act', hand: handId, action: mine.me.legal.canRaise ? 'allin' : 'call' });
      await ca.waitFor((m) => m.t === 'state' && m.rev > st.rev, { since });
    }
    const end = await ca.waitFor((m) => m.t === 'state' && m.table.hand?.done && m.table.hand.winners, { timeout: 8000 });
    assert.deepEqual(end.table.hand.board, ['7c', '7s', '2d', '9c', 'Jh']);
    assert.equal(end.table.hand.winners[0].seat, 0);
    assert.equal(end.table.hand.winners[0].hand.cat, 'quads');
    // hold-writes: nothing reaches the data files during the hold, everything right after it
    await sleep(400);
    const held = await fetch(`${svc.url}/__test/hold-writes`, { method: 'POST', body: JSON.stringify({ ms: 400 }) });
    assert.equal(held.status, 200);
    await sleep(250);
    const tablesFile = `${svc.config.dataDir}/tables.json`;
    const before = JSON.parse(fs.readFileSync(tablesFile, 'utf8')).gen;
    ca.send({ t: 'sitOut', on: true });
    await ca.waitFor((m) => m.t === 'state' && m.table.seats[0]?.state === 'out', { timeout: 4000 });
    await sleep(100);
    assert.equal(JSON.parse(fs.readFileSync(tablesFile, 'utf8')).gen, before);
    await sleep(600);
    assert.ok(JSON.parse(fs.readFileSync(tablesFile, 'utf8')).gen > before);
    ca.close();
    cb.close();

    // FIREBASE_JWKS_URL: the production fetcher, pointed at the local key set
    const v = createVerifier({ projectId: PROJECT, jwksUrl });
    const out = await v.verify(signer.sign(idClaims('hook@ucsd.edu')));
    assert.equal(out.email, 'hook@ucsd.edu');
    assert.ok(keyFetches >= 1);
  } finally {
    await svc.stop();
    keys.close();
  }
});
