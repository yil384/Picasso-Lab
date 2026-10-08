// Save with email, end to end over HTTP with ID tokens signed by a local RSA key (the server's key fetcher is
// injected): a new link, a second device merging into the saved account, a mismatched email, an expired link,
// a forged token, a name already held by another saved account, a merge refused while seated, and the flag off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { startTest, api, newGuest, makeSigner, idClaims, connect, randomIp } from './service-helpers.js';
import { LINK_TTL } from '../src/accounts.js';

const signer = makeSigner('email-kid');
const clock = { offset: 0 };
const now = () => Date.now() + clock.offset;
let svc;
test.before(async () => {
  svc = await startTest({ EMAIL_LINK: 'on' }, { now, fetchKeys: async () => ({ keys: [signer.jwk], maxAgeSec: 3600 }) });
});
test.after(async () => { await svc.stop(); });

const idToken = (email, over = {}) => signer.sign(idClaims(email, over, now()));

async function saveFlow(guest, email, tokenEmail = email, { withCode = false } = {}) {
  const start = await api(svc, 'POST', '/v1/email/start', { token: guest.token, body: { email }, headers: { 'x-forwarded-for': randomIp() } });
  assert.equal(start.status, 200, JSON.stringify(start.data));
  const { lid, poll, code } = start.data;
  assert.match(lid, /^[A-Za-z0-9_-]{20,}$/);
  assert.match(code, /^\d{4}$/);
  const pending = await api(svc, 'POST', '/v1/email/poll', { body: { lid, poll } });
  assert.deepEqual(pending.data, { status: 'pending' });
  const body = withCode ? { lid, idToken: idToken(tokenEmail), code } : { lid, idToken: idToken(tokenEmail) };
  const complete = await api(svc, 'POST', '/v1/email/complete', { body, origin: 'https://yil384.github.io' });
  return { lid, poll, code, complete };
}

test('a new link saves the guest: protected name, masked email, a fresh token once, the old token retired', async () => {
  const g = await newGuest(svc, 'Yufei');
  const { lid, poll, complete } = await saveFlow(g, 'Yufei.Ding@UCSD.edu', 'yufei.ding@ucsd.edu');
  assert.equal(complete.status, 200);
  assert.deepEqual(complete.data, { ok: true, name: 'Yufei', nameReserved: true });
  // completing twice is harmless
  const again = await api(svc, 'POST', '/v1/email/complete', { body: { lid, idToken: idToken('yufei.ding@ucsd.edu') } });
  assert.equal(again.status, 200);
  const done = await api(svc, 'POST', '/v1/email/poll', { body: { lid, poll } });
  assert.equal(done.data.status, 'done');
  assert.ok(done.data.token);
  assert.equal(done.data.account.pid, g.account.pid);
  assert.equal(done.data.account.guest, false);
  assert.equal(done.data.account.email, 'y***@ucsd.edu');
  assert.equal(done.data.account.protected, true);
  // the token is handed out once
  assert.equal((await api(svc, 'POST', '/v1/email/poll', { body: { lid, poll } })).data.error, 'expired');
  assert.equal((await api(svc, 'GET', '/v1/me', { token: done.data.token })).status, 200);
  assert.equal((await api(svc, 'GET', '/v1/me', { token: g.token })).status, 401, 'the starting token was replaced');
  // the name is now protected for everyone else
  const other = await newGuest(svc, 'Someone');
  assert.equal((await api(svc, 'POST', '/v1/name', { token: other.token, body: { name: 'yu fei' } })).data.error, 'name_protected');
  // a saved account cannot start another link
  assert.equal((await api(svc, 'POST', '/v1/email/start', { token: done.data.token, body: { email: 'x@y.edu' } })).data.error, 'already_linked');
  // the raw email is never stored
  svc.store.flush();
  const fs = await import('node:fs');
  const text = fs.readFileSync(`${svc.config.dataDir}/accounts.json`, 'utf8');
  assert.ok(!/yufei\.ding/i.test(text));
});

test('second device: its guest merges into the saved account (counters added, bankroll dropped, name kept)', async () => {
  const first = await newGuest(svc, 'Main');
  const s1 = await saveFlow(first, 'main@ucsd.edu');
  const d1 = await api(svc, 'POST', '/v1/email/poll', { body: { lid: s1.lid, poll: s1.poll } });
  const A = svc.accounts.byPublicId(first.account.pid);
  Object.assign(A.holdem, { hands: 10, won: 3, biggestPot: 500, net: 200, showdowns: 2 });
  A.chips = 7000;
  const phone = await newGuest(svc, 'Phone Guest');
  const B = svc.accounts.get(phone.id);
  Object.assign(B.holdem, { hands: 4, won: 2, biggestPot: 900, net: -50, showdowns: 1 });
  B.guandan.rounds = 2; B.guandan.wins = 1; B.guandan.seen['ROOM:1'] = 1;
  B.chips = 25_000;
  const s2 = await saveFlow(phone, 'MAIN@ucsd.edu', 'main@ucsd.edu', { withCode: true });
  assert.equal(s2.complete.status, 200);
  assert.equal(s2.complete.data.name, 'Main');
  const d2 = await api(svc, 'POST', '/v1/email/poll', { body: { lid: s2.lid, poll: s2.poll } });
  assert.equal(d2.data.status, 'done');
  assert.equal(d2.data.account.pid, first.account.pid);
  assert.equal(d2.data.account.name, 'Main');
  assert.equal(d2.data.account.chips, 7000, "B's bankroll is dropped");
  assert.deepEqual(d2.data.account.holdem, { hands: 14, won: 5, biggestPot: 900, net: 150, showdowns: 3, rnet: 150 });
  assert.deepEqual(d2.data.account.guandan, { rounds: 2, wins: 1 });
  assert.equal(svc.accounts.get(phone.id), null, 'B is deleted');
  assert.equal((await api(svc, 'GET', '/v1/me', { token: phone.token })).status, 401);
  assert.ok(A.clientIds.some((c) => c.startsWith('c-PhoneGuest')));
  // both devices now hold tokens for A
  assert.equal((await api(svc, 'GET', '/v1/me', { token: d1.data.token })).data.account.pid, first.account.pid);
  assert.equal((await api(svc, 'GET', '/v1/me', { token: d2.data.token })).data.account.pid, first.account.pid);
});

test('mismatched email, forged token, unknown link, expired link', async () => {
  const g = await newGuest(svc, 'Mallory');
  const s = await saveFlow(g, 'mine@ucsd.edu', 'someone.else@ucsd.edu');
  assert.equal(s.complete.status, 409);
  assert.equal(s.complete.data.error, 'email_mismatch');
  assert.deepEqual((await api(svc, 'POST', '/v1/email/poll', { body: { lid: s.lid, poll: s.poll } })).data, { status: 'pending' });
  // a token signed by another key, or unverified, or for another project
  const stranger = makeSigner('email-kid');
  const forged = stranger.sign(idClaims('mine@ucsd.edu', {}, now()));
  assert.equal((await api(svc, 'POST', '/v1/email/complete', { body: { lid: s.lid, idToken: forged } })).data.error, 'bad_token');
  assert.equal((await api(svc, 'POST', '/v1/email/complete', { body: { lid: s.lid, idToken: idToken('mine@ucsd.edu', { email_verified: false }) } })).data.error, 'bad_token');
  assert.equal((await api(svc, 'POST', '/v1/email/complete', { body: { lid: s.lid, idToken: idToken('mine@ucsd.edu', { aud: 'other' }) } })).status, 401);
  assert.equal((await api(svc, 'POST', '/v1/email/complete', { body: { lid: 'nope', idToken: idToken('mine@ucsd.edu') } })).data.error, 'expired');
  // wrong poll secret looks exactly like an unknown link
  assert.equal((await api(svc, 'POST', '/v1/email/poll', { body: { lid: s.lid, poll: 'guess' } })).data.error, 'expired');
  // 30 minutes later the link is gone
  clock.offset += LINK_TTL + 1000;
  try {
    const late = await api(svc, 'POST', '/v1/email/complete', { body: { lid: s.lid, idToken: idToken('mine@ucsd.edu') } });
    assert.equal(late.status, 404);
    assert.equal(late.data.error, 'expired');
    assert.equal((await api(svc, 'POST', '/v1/email/poll', { body: { lid: s.lid, poll: s.poll } })).status, 404);
  } finally {
    clock.offset = 0;
  }
  assert.equal((await api(svc, 'POST', '/v1/email/start', { token: g.token, body: { email: 'not-an-email' } })).data.error, 'bad_email');
});

test('a name already held by another saved account: saved, but not reserved', async () => {
  const holder = await newGuest(svc, 'Twin');
  const late = await newGuest(svc, 'Twin');
  const s1 = await saveFlow(holder, 'twin1@ucsd.edu');
  assert.equal(s1.complete.data.nameReserved, true);
  const s2 = await saveFlow(late, 'twin2@ucsd.edu');
  assert.equal(s2.complete.status, 200);
  assert.deepEqual(s2.complete.data, { ok: true, name: 'Twin', nameReserved: false });
  const d2 = await api(svc, 'POST', '/v1/email/poll', { body: { lid: s2.lid, poll: s2.poll } });
  assert.equal(d2.data.account.guest, false);
  assert.equal(d2.data.account.protected, false);
  assert.equal((await api(svc, 'POST', '/v1/name', { token: d2.data.token, body: { name: 'Twin Two' } })).data.account.protected, true);
});

test('merging a guest that is seated at a Hold\'em table is refused until it leaves', async () => {
  const owner = await newGuest(svc, 'Seated Owner');
  const s1 = await saveFlow(owner, 'seated@ucsd.edu');
  assert.equal(s1.complete.status, 200);
  const g = await newGuest(svc, 'Seated Guest');
  const c = await connect(svc, g.token);
  c.send({ t: 'create', settings: { blinds: '10/20', seats: 2 } });
  const created = await c.waitFor((m) => m.t === 'created');
  c.send({ t: 'sit', seat: 1, buyIn: 1000 });
  await c.waitFor((m) => m.t === 'state' && m.me.seat === 1);
  const s2 = await saveFlow(g, 'seated@ucsd.edu', 'seated@ucsd.edu', { withCode: true });
  assert.equal(s2.complete.status, 409);
  assert.equal(s2.complete.data.error, 'at_table');
  c.send({ t: 'stand' });
  await c.waitFor((m) => m.t === 'state' && m.me.seat === null);
  const retry = await api(svc, 'POST', '/v1/email/complete', { body: { lid: s2.lid, idToken: idToken('seated@ucsd.edu'), code: s2.code } });
  assert.equal(retry.status, 200);
  // the guest's socket is closed (its account no longer exists)
  const closed = await c.waitClose();
  assert.equal(closed.code, 4001);
  assert.ok(created.code);
});

test('flag off: start, complete and poll answer 403 disabled; features say so', async () => {
  const off = await startTest({ EMAIL_LINK: 'off' });
  try {
    const g = await newGuest(off, 'Off');
    const s = await api(off, 'POST', '/v1/session', { token: g.token, body: {} });
    assert.deepEqual(s.data.features, { emailLink: false });
    const start = await api(off, 'POST', '/v1/email/start', { token: g.token, body: { email: 'a@b.edu' } });
    assert.equal(start.status, 403);
    assert.equal(start.data.error, 'disabled');
    assert.equal((await api(off, 'POST', '/v1/email/complete', { body: { lid: 'x', idToken: 'y' } })).data.error, 'disabled');
    assert.equal((await api(off, 'POST', '/v1/email/poll', { body: { lid: 'x', poll: 'y' } })).data.error, 'disabled');
  } finally {
    await off.stop();
  }
  const on = await api(svc, 'POST', '/v1/session', { body: {} });
  assert.deepEqual(on.data.features, { emailLink: true });
});

test('a link someone else started for my saved email: no merge and no token without the code shown on their device', async () => {
  const owner = await newGuest(svc, 'Victim');
  const s1 = await saveFlow(owner, 'victim@ucsd.edu');
  assert.equal(s1.complete.status, 200);
  const attacker = await newGuest(svc, 'Mallory');
  // the victim opens the mail and confirms the address, but does not have the code
  const s2 = await saveFlow(attacker, 'victim@ucsd.edu');
  assert.equal(s2.complete.status, 409);
  assert.equal(s2.complete.data.error, 'need_code');
  assert.deepEqual((await api(svc, 'POST', '/v1/email/poll', { body: { lid: s2.lid, poll: s2.poll } })).data, { status: 'pending' });
  const wrong = String((Number(s2.code) + 1) % 10_000).padStart(4, '0');
  const tryCode = (code) => api(svc, 'POST', '/v1/email/complete', { body: { lid: s2.lid, idToken: idToken('victim@ucsd.edu'), code } });
  for (let k = 0; k < 4; k++) assert.equal((await tryCode(wrong)).data.error, 'bad_code');
  assert.equal((await tryCode(wrong)).data.error, 'expired', 'five wrong codes drop the link');
  assert.equal((await tryCode(s2.code)).data.error, 'expired');
  assert.equal((await api(svc, 'POST', '/v1/email/poll', { body: { lid: s2.lid, poll: s2.poll } })).status, 404);
  assert.ok(svc.accounts.get(attacker.id), 'the attacker\'s guest was not merged');
});
