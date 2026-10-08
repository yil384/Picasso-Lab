// Config: dev defaults, production refusals, origin allow-list with port wildcards; ipKey normalization.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, originAllowed, ConfigError } from '../src/config.js';
import { normalizeIp, makeIpKey, clientIp } from '../src/util.js';

test('dev defaults start; production refuses without secrets and with placeholders', () => {
  const c = loadConfig({});
  assert.equal(c.port, 8787);
  assert.equal(c.emailLink, false);
  assert.equal(c.firebaseProjectId, 'yichen-5e23e');
  assert.equal(c.trustProxy, false);
  assert.equal(c.botThinkScale, 1);
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), (e) => e instanceof ConfigError && e.problems.length === 3);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'a'.repeat(40), IP_SALT: 'b'.repeat(40) }),
    (e) => e instanceof ConfigError && /TRUST_PROXY/.test(e.message), 'production needs TRUST_PROXY set explicitly');
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'short', IP_SALT: 'x'.repeat(40) }), ConfigError);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'replace-with-48-random-bytes-from-openssl-rand', IP_SALT: 'y'.repeat(40) }), ConfigError);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'z'.repeat(40), IP_SALT: 'z'.repeat(40) }), ConfigError);
  const p = loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'a'.repeat(40), IP_SALT: 'b'.repeat(40), EMAIL_LINK: 'on', TRUST_PROXY: '1' });
  assert.equal(p.production, true);
  assert.equal(p.dataDir, '/data');
  assert.equal(p.emailLink, true);
  assert.equal(p.trustProxy, true);
  assert.throws(() => loadConfig({ EMAIL_LINK: 'maybe' }), ConfigError);
  assert.throws(() => loadConfig({ PORT: 'x' }), ConfigError);
  assert.throws(() => loadConfig({ ALLOWED_ORIGINS: 'yil384.github.io' }), ConfigError);
});

test('origins: exact entries, default ports, and :* port wildcards', () => {
  const c = loadConfig({ ALLOWED_ORIGINS: 'https://yil384.github.io, http://127.0.0.1:*' });
  assert.equal(originAllowed(c, 'https://yil384.github.io'), true);
  assert.equal(originAllowed(c, 'https://yil384.github.io:443'), true);
  assert.equal(originAllowed(c, 'https://yil384.github.io:8443'), false);
  assert.equal(originAllowed(c, 'http://yil384.github.io'), false);
  assert.equal(originAllowed(c, 'https://evil.github.io'), false);
  assert.equal(originAllowed(c, 'https://yil384.github.io.evil.com'), false);
  assert.equal(originAllowed(c, 'http://127.0.0.1:5173'), true);
  assert.equal(originAllowed(c, 'http://127.0.0.1'), true);
  assert.equal(originAllowed(c, 'http://localhost:5173'), false);
  assert.equal(originAllowed(c, 'null'), false);
  assert.equal(originAllowed(c, undefined), false);
});

test('ipKey: IPv6 by /64, IPv4-mapped as IPv4, 128-bit hex, keyed by the salt; X-Forwarded-For only when trusted', () => {
  assert.equal(normalizeIp('203.0.113.9'), '203.0.113.9');
  assert.equal(normalizeIp('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(normalizeIp('::FFFF:cb00:7109'), '203.0.113.9');
  assert.equal(normalizeIp('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(normalizeIp('2001:db8:1:2::99'), '2001:db8:1:2::/64');
  assert.equal(normalizeIp('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(normalizeIp('fe80::1%eth0'), 'fe80:0:0:0::/64');
  const k = makeIpKey('s'.repeat(40));
  assert.match(k('203.0.113.9'), /^[0-9a-f]{32}$/);
  assert.equal(k('2001:db8:1:2::1'), k('2001:db8:1:2:ffff::7'));
  assert.notEqual(k('2001:db8:1:2::1'), k('2001:db8:1:3::1'));
  assert.equal(k('::ffff:203.0.113.9'), k('203.0.113.9'));
  assert.notEqual(makeIpKey('t'.repeat(40))('203.0.113.9'), k('203.0.113.9'));
  const req = { headers: { 'x-forwarded-for': '1.1.1.1, 198.51.100.7' }, socket: { remoteAddress: '127.0.0.1' } };
  assert.equal(clientIp(req, false), '127.0.0.1');
  assert.equal(clientIp(req, true), '198.51.100.7');
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '::1' } }, true), '::1');
});
