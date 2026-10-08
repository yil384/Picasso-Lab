// Firebase ID token verification against locally generated RSA keys served by an injected key fetcher:
// valid, expired, wrong aud / iss, bad signature, unverified email, kid rotation, key caching by max-age.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerifier, parseMaxAge, TokenError } from '../src/firebase-token.js';
import { makeSigner, idClaims, uidOf, PROJECT } from './jwt-helpers.js';

function setup({ maxAgeSec = 3600 } = {}) {
  const clock = { t: Date.now() };
  const k1 = makeSigner('kid-1');
  const k2 = makeSigner('kid-2');
  const served = { keys: [k1.jwk], fetches: 0 };
  const v = createVerifier({
    projectId: PROJECT,
    now: () => clock.t,
    fetchKeys: async () => { served.fetches++; return { keys: served.keys, maxAgeSec }; },
  });
  return { v, k1, k2, clock, served };
}

const rejects = (p, code) => assert.rejects(p, (e) => e instanceof TokenError && e.code === code);

test('a valid token gives uid, email and auth time', async () => {
  const { v, k1, clock } = setup();
  const out = await v.verify(k1.sign(idClaims('yufei@ucsd.edu', {}, clock.t)));
  assert.equal(out.email, 'yufei@ucsd.edu');
  assert.equal(out.uid, uidOf('yufei@ucsd.edu'));
  assert.equal(typeof out.authTime, 'number');
});

test('expired, wrong audience, wrong issuer, future iat, stale or future auth_time, missing sub are rejected', async () => {
  const { v, k1, clock } = setup();
  const t = Math.floor(clock.t / 1000);
  const tok = (over) => k1.sign(idClaims('a@b.edu', over, clock.t));
  await rejects(v.verify(tok({ exp: t - 1 })), 'exp');
  await rejects(v.verify(tok({ aud: 'other-project' })), 'aud');
  await rejects(v.verify(tok({ iss: 'https://securetoken.google.com/other-project' })), 'iss');
  await rejects(v.verify(tok({ iss: `https://evil.example/${PROJECT}` })), 'iss');
  await rejects(v.verify(tok({ iat: t + 600 })), 'iat');
  await rejects(v.verify(tok({ auth_time: t + 600 })), 'auth_time');
  await rejects(v.verify(tok({ auth_time: t - 2 * 3600 })), 'auth_time');
  await rejects(v.verify(tok({ sub: '' })), 'sub');
  // the token expires while held: the same token later fails
  const good = tok({});
  await v.verify(good);
  clock.t += 3601 * 1000;
  await rejects(v.verify(good), 'exp');
});

test('unverified or missing email is rejected', async () => {
  const { v, k1, clock } = setup();
  await rejects(v.verify(k1.sign(idClaims('a@b.edu', { email_verified: false }, clock.t))), 'email');
  await rejects(v.verify(k1.sign(idClaims('a@b.edu', { email: undefined }, clock.t))), 'email');
});

test('bad signatures, other algorithms and malformed tokens are rejected', async () => {
  const { v, k1, clock } = setup();
  const good = k1.sign(idClaims('a@b.edu', {}, clock.t));
  const [h, p, s] = good.split('.');
  // claims changed after signing
  const forged = Buffer.from(JSON.stringify({ ...idClaims('boss@ucsd.edu', {}, clock.t) })).toString('base64url');
  await rejects(v.verify(`${h}.${forged}.${s}`), 'signature');
  // signed by a key that is not Google's but claims Google's kid
  const stranger = makeSigner('kid-1');
  await rejects(v.verify(stranger.sign(idClaims('a@b.edu', {}, clock.t))), 'signature');
  // alg none / HS256
  const none = Buffer.from(JSON.stringify({ alg: 'none', kid: 'kid-1' })).toString('base64url');
  await rejects(v.verify(`${none}.${p}.`), 'malformed');
  await rejects(v.verify(`${none}.${p}.${s}`), 'alg');
  const hs = Buffer.from(JSON.stringify({ alg: 'HS256', kid: 'kid-1' })).toString('base64url');
  await rejects(v.verify(`${hs}.${p}.${s}`), 'alg');
  await rejects(v.verify('a.b'), 'malformed');
  await rejects(v.verify(42), 'malformed');
  await rejects(v.verify('x'.repeat(5000)), 'malformed');
  await rejects(v.verify(`${h}.!!!.${s}`), 'malformed');
});

test('kid rotation: an unknown kid refetches the keys once; keys are cached for max-age', async () => {
  const { v, k1, k2, clock, served } = setup({ maxAgeSec: 600 });
  await v.verify(k1.sign(idClaims('a@b.edu', {}, clock.t)));
  await v.verify(k1.sign(idClaims('a@b.edu', {}, clock.t)));
  assert.equal(served.fetches, 1, 'cached');
  // Google rotates: kid-2 appears, kid-1 stays for a while
  served.keys = [k1.jwk, k2.jwk];
  clock.t += 31_000;
  const out = await v.verify(k2.sign(idClaims('c@d.edu', {}, clock.t)));
  assert.equal(out.email, 'c@d.edu');
  assert.equal(served.fetches, 2, 'one refetch for the new kid');
  // an unknown kid right after a fetch does not hammer the endpoint
  await rejects(v.verify(makeSigner('kid-9').sign(idClaims('e@f.edu', {}, clock.t))), 'kid');
  assert.equal(served.fetches, 2);
  // kid-1 retired; after max-age the cache refreshes and kid-1 tokens fail
  served.keys = [k2.jwk];
  clock.t += 601_000;
  await rejects(v.verify(k1.sign(idClaims('a@b.edu', {}, clock.t))), 'kid');
  assert.equal(served.fetches, 3);
  // a failing key endpoint is a rejection, not a crash
  const broken = createVerifier({ projectId: PROJECT, fetchKeys: async () => { throw new Error('offline'); } });
  await rejects(broken.verify(k1.sign(idClaims('a@b.edu'))), 'keys');
});

test('Cache-Control max-age parsing', () => {
  assert.equal(parseMaxAge('public, max-age=19302, must-revalidate, no-transform'), 19302);
  assert.equal(parseMaxAge('no-cache'), 0);
  assert.equal(parseMaxAge(null), 0);
  assert.equal(parseMaxAge('s-maxage=5, max-age=7'), 7);
});
