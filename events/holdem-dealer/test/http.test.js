// HTTP integration with fetch against a real server on an ephemeral port: CORS allow / deny and preflight, auth,
// sessions and suggestions by network, claims across networks, names, refills, records, leaderboard, body limit,
// rate limits, sign-out, health; nothing that looks like an IP or a token in the data files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startTest, api, newGuest, ORIGIN } from './service-helpers.js';

let svc;
test.before(async () => { svc = await startTest({ TRUST_PROXY: '1' }); });
test.after(async () => { await svc.stop(); });

// every test uses its own client address (TRUST_PROXY=1 takes the right-most X-Forwarded-For entry)
let ipSeq = 10;
const nextIp = () => ({ 'x-forwarded-for': `198.51.100.${ipSeq++}` });

test('CORS: allow-listed origins are echoed; preflight allows the private network; others get 403 and no CORS', async () => {
  const pre = await fetch(`${svc.url}/v1/session`, {
    method: 'OPTIONS',
    headers: { origin: ORIGIN, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type', 'access-control-request-private-network': 'true' },
  });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(pre.headers.get('access-control-allow-private-network'), 'true');
  assert.match(pre.headers.get('access-control-allow-headers'), /authorization/);
  assert.match(pre.headers.get('access-control-allow-headers'), /content-type/);
  assert.match(pre.headers.get('access-control-allow-methods'), /POST/);
  const gh = await api(svc, 'GET', '/v1/health', { origin: 'https://yil384.github.io' });
  assert.equal(gh.status, 200);
  assert.equal(gh.headers.get('access-control-allow-origin'), 'https://yil384.github.io');
  assert.equal(gh.headers.get('vary'), 'Origin');

  const bad = await fetch(`${svc.url}/v1/session`, { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST' } });
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
  const badPost = await api(svc, 'POST', '/v1/session', { origin: 'https://evil.example', body: {} });
  assert.equal(badPost.status, 403);
  assert.equal(badPost.data.error, 'origin');
  assert.equal(badPost.headers.get('access-control-allow-origin'), null);
  // no Origin at all (curl, health checks): allowed, no CORS headers
  const plain = await api(svc, 'GET', '/v1/health', { origin: null });
  assert.equal(plain.status, 200);
  assert.equal(plain.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(Object.keys(plain.data).sort(), ['ok', 'players', 'tables', 'uptime']);
  assert.equal(plain.headers.get('cache-control'), 'no-store');
});

test('auth: bearer required where noted; unknown tokens are 401; a session with an unknown token makes a new guest', async () => {
  const headers = nextIp();
  for (const [m, p] of [['GET', '/v1/me'], ['POST', '/v1/name'], ['POST', '/v1/refill'], ['POST', '/v1/claim'], ['POST', '/v1/guandan/round'], ['POST', '/v1/signout']]) {
    const r = await api(svc, m, p, { body: m === 'POST' ? {} : undefined, headers });
    assert.equal(r.status, 401, `${m} ${p}`);
    assert.equal(r.data.error, 'auth');
  }
  assert.equal((await api(svc, 'GET', '/v1/me', { token: 'A'.repeat(43), headers })).status, 401);
  const s = await api(svc, 'POST', '/v1/session', { token: 'A'.repeat(43), body: { clientId: 'k1', name: 'Nova' }, headers });
  assert.equal(s.status, 200);
  assert.ok(s.data.token);
  const me = await api(svc, 'GET', '/v1/me', { token: s.data.token, headers });
  assert.equal(me.status, 200);
  assert.equal(me.data.account.name, 'Nova');
  // a known token: same account, no new token
  const again = await api(svc, 'POST', '/v1/session', { token: s.data.token, body: { clientId: 'k1' }, headers });
  assert.equal(again.data.token, undefined);
  assert.equal(again.data.account.pid, s.data.account.pid);
});

test('suggestions by network: fresh browsers on the same network only; claims re-check the network', async () => {
  const home = nextIp();
  const away = nextIp();
  const g = await api(svc, 'POST', '/v1/session', { body: { clientId: 'gd-1', name: 'Quinn', fresh: false }, headers: home });
  await api(svc, 'POST', '/v1/session', { token: g.data.token, body: {}, headers: home });
  const freshAway = await api(svc, 'POST', '/v1/session', { body: { fresh: true }, headers: away });
  assert.deepEqual(freshAway.data.suggestions, []);
  const notFresh = await api(svc, 'POST', '/v1/session', { body: { fresh: false }, headers: home });
  assert.equal(notFresh.data.suggestions, undefined);
  const fresh = await api(svc, 'POST', '/v1/session', { body: { fresh: true }, headers: home });
  assert.deepEqual(fresh.data.suggestions.map((s) => s.name), ['Quinn']);
  const sid = fresh.data.suggestions[0].sid;
  // claimed from another network: refused
  const wrong = await api(svc, 'POST', '/v1/claim', { token: fresh.data.token, body: { sid }, headers: away });
  assert.equal(wrong.status, 403);
  assert.equal(wrong.data.error, 'ip_mismatch');
  const ok = await api(svc, 'POST', '/v1/claim', { token: fresh.data.token, body: { sid }, headers: home });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.account.pid, g.data.account.pid);
  assert.equal((await api(svc, 'GET', '/v1/me', { token: ok.data.token, headers: home })).data.account.name, 'Quinn');
  assert.equal((await api(svc, 'GET', '/v1/me', { token: fresh.data.token, headers: home })).status, 401, 'pristine fresh guest deleted');
  assert.equal((await api(svc, 'POST', '/v1/claim', { token: ok.data.token, body: { sid }, headers: home })).data.error, 'expired');
});

test('names, refills, Guandan rounds and the leaderboard over HTTP', async () => {
  const headers = nextIp();
  const a = await newGuest(svc, 'Rook');
  const b = await newGuest(svc, 'Pawn');
  assert.equal((await api(svc, 'POST', '/v1/name', { token: a.token, body: { name: '  Rook  Two ' }, headers })).data.account.name, 'Rook Two');
  assert.equal((await api(svc, 'POST', '/v1/name', { token: a.token, body: { name: '' }, headers })).data.error, 'bad_name');
  // b saves with an email (set directly here; the email flow has its own test): its name becomes protected
  const bAcc = svc.accounts.get(b.id);
  bAcc.email = { uid: 'x', masked: 'p***@ucsd.edu', hash: 'hb', linkedAt: Date.now() };
  svc.accounts._reindexNames();
  const taken = await api(svc, 'POST', '/v1/name', { token: a.token, body: { name: 'PAWN' }, headers });
  assert.equal(taken.status, 409);
  assert.equal(taken.data.error, 'name_protected');

  const notNeeded = await api(svc, 'POST', '/v1/refill', { token: a.token, body: {}, headers });
  assert.equal(notNeeded.status, 409);
  assert.equal(notNeeded.data.error, 'not_needed');
  svc.accounts.get(a.id).chips = 150;
  const refill = await api(svc, 'POST', '/v1/refill', { token: a.token, headers });
  assert.equal(refill.status, 200);
  assert.equal(refill.data.account.chips, 10_000);
  assert.equal(refill.data.account.refills, 1);

  const r1 = await api(svc, 'POST', '/v1/guandan/round', { token: a.token, body: { room: 'QWER', round: 3, won: true, place: 1 }, headers });
  assert.deepEqual(r1.data, { ok: true });
  const dup = await api(svc, 'POST', '/v1/guandan/round', { token: a.token, body: { room: 'QWER', round: 3, won: true, place: 1 }, headers });
  assert.equal(dup.data.duplicate, true);
  assert.equal((await api(svc, 'POST', '/v1/guandan/round', { token: a.token, body: { room: 'QWER' }, headers })).status, 400);
  const lb = await api(svc, 'GET', '/v1/leaderboard?game=guandan&limit=10', { token: a.token, headers });
  assert.equal(lb.status, 200);
  assert.ok(lb.data.rows.some((r) => r.name === 'Rook Two' && r.wins === 1 && r.rounds === 1));
  assert.equal(lb.data.me.name, 'Rook Two');
  const lbAnon = await api(svc, 'GET', '/v1/leaderboard?game=holdem', { headers });
  assert.equal(lbAnon.status, 200);
  assert.equal(lbAnon.data.me, undefined);
  assert.equal((await api(svc, 'GET', '/v1/leaderboard?game=poker', { headers })).status, 400);
});

test('bodies over 8 KB, bad JSON, unknown routes and wrong methods', async () => {
  const headers = nextIp();
  const big = await api(svc, 'POST', '/v1/session', { body: { name: 'x', pad: 'y'.repeat(9000) }, headers });
  assert.equal(big.status, 413);
  assert.equal(big.data.error, 'too_large');
  const res = await fetch(`${svc.url}/v1/session`, { method: 'POST', headers: { ...headers, origin: ORIGIN, 'content-type': 'application/json' }, body: '{"name":' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'bad_json');
  assert.equal((await api(svc, 'POST', '/v1/session', { body: [1, 2], headers })).data.error, 'bad_json');
  assert.equal((await api(svc, 'GET', '/v1/nothing', { headers })).status, 404);
  assert.equal((await api(svc, 'GET', '/v1/session', { headers })).status, 405);
});

test('rate limits per network: 30 new accounts an hour, 600 requests a minute', async () => {
  const headers = nextIp();
  for (let i = 0; i < 30; i++) {
    const r = await api(svc, 'POST', '/v1/session', { body: { fresh: false }, headers });
    assert.equal(r.status, 200, `session ${i}`);
  }
  const over = await api(svc, 'POST', '/v1/session', { body: {}, headers });
  assert.equal(over.status, 429);
  assert.equal(over.data.error, 'rate_limited');
  assert.ok(Number(over.headers.get('retry-after')) > 0);
  // another network is unaffected; a known device still gets its session
  const other = nextIp();
  const fine = await api(svc, 'POST', '/v1/session', { body: {}, headers: other });
  assert.equal(fine.status, 200);
  const known = await api(svc, 'POST', '/v1/session', { token: fine.data.token, body: {}, headers });
  assert.equal(known.status, 200);
  // the general limit
  const flood = nextIp();
  let first429 = null;
  for (let i = 0; i < 620 && first429 === null; i++) {
    const r = await fetch(`${svc.url}/v1/health`, { headers: flood });
    await r.arrayBuffer();
    if (r.status === 429) first429 = i;
  }
  assert.equal(first429, 600);
});

test('sign-out revokes this device only', async () => {
  const headers = nextIp();
  const g = await newGuest(svc, 'Sol');
  const second = svc.accounts._issueToken(svc.accounts.get(g.id));
  assert.deepEqual((await api(svc, 'POST', '/v1/signout', { token: g.token, headers })).data, { ok: true });
  assert.equal((await api(svc, 'GET', '/v1/me', { token: g.token, headers })).status, 401);
  assert.equal((await api(svc, 'GET', '/v1/me', { token: second, headers })).status, 200);
});

test('data files: mode 600; no IP address or raw token anywhere', async () => {
  const g = await newGuest(svc, 'Tess');
  await api(svc, 'POST', '/v1/session', { token: g.token, body: {}, headers: { 'x-forwarded-for': '203.0.113.77' } });
  svc.store.flush();
  const dir = svc.config.dataDir;
  const text = fs.readFileSync(path.join(dir, 'accounts.json'), 'utf8');
  assert.equal(fs.statSync(path.join(dir, 'accounts.json')).mode & 0o777, 0o600);
  assert.ok(!text.includes('203.0.113.77'));
  assert.ok(!text.includes('198.51.100.'));
  assert.ok(!text.includes('127.0.0.1'));
  assert.ok(!text.includes(g.token));
  assert.ok(text.includes('"ip":{'));
});
