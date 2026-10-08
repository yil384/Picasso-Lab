// Config: dev defaults, production refusals, origin allow-list with port wildcards; ipKey normalization.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, originAllowed, ConfigError } from '../src/config.js';
import { normalizeIp, makeIpKey, clientIp, createProxyTrust, RateLimiter } from '../src/util.js';

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
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'a'.repeat(40), IP_SALT: 'b'.repeat(40), TRUST_PROXY: '1' }),
    (e) => e instanceof ConfigError && /trusts every peer/.test(e.message), 'production never trusts every peer');
  const p = loadConfig({ NODE_ENV: 'production', GAMES_SECRET: 'a'.repeat(40), IP_SALT: 'b'.repeat(40), EMAIL_LINK: 'on', TRUST_PROXY: 'fras-caddy-1, 172.24.0.3' });
  assert.equal(p.production, true);
  assert.equal(p.dataDir, '/data');
  assert.equal(p.emailLink, true);
  assert.deepEqual([...p.trustProxy], ['fras-caddy-1', '172.24.0.3']);
  assert.equal(loadConfig({ TRUST_PROXY: '1' }).trustProxy, true, 'any peer: tests only');
  assert.throws(() => loadConfig({ TRUST_PROXY: '10.0.0.0/33' }), ConfigError);
  assert.throws(() => loadConfig({ TRUST_PROXY: 'two words' }), ConfigError);
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

test('secrets from files (the deploy: docker inspect never shows them); not both ways at once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'holdem-secret-'));
  const g = path.join(dir, 'games_secret');
  const i = path.join(dir, 'ip_salt');
  fs.writeFileSync(g, `${'g'.repeat(48)}\n`, { mode: 0o400 });
  fs.writeFileSync(i, 'i'.repeat(48), { mode: 0o400 });
  const c = loadConfig({ NODE_ENV: 'production', GAMES_SECRET_FILE: g, IP_SALT_FILE: i, TRUST_PROXY: '0' });
  assert.equal(c.gamesSecret, 'g'.repeat(48), 'trimmed');
  assert.equal(c.ipSalt, 'i'.repeat(48));
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET_FILE: g, GAMES_SECRET: 'x'.repeat(40), IP_SALT_FILE: i, TRUST_PROXY: '0' }), (e) => /not both/.test(e.message));
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET_FILE: path.join(dir, 'missing'), IP_SALT_FILE: i, TRUST_PROXY: '0' }), (e) => /cannot read/.test(e.message));
  fs.writeFileSync(path.join(dir, 'short'), 'abc');
  assert.throws(() => loadConfig({ NODE_ENV: 'production', GAMES_SECRET_FILE: path.join(dir, 'short'), IP_SALT_FILE: i, TRUST_PROXY: '0' }), (e) => /at least 32/.test(e.message));
});

test('X-Forwarded-For counts only from a listed proxy: a peer that is not one is keyed by its own address', async () => {
  const req = (peer, xff) => ({ headers: xff ? { 'x-forwarded-for': xff } : {}, socket: { remoteAddress: peer } });
  const lookups = [];
  let caddy = '172.24.0.3';
  const trust = createProxyTrust(['fras-caddy-1', '10.9.0.0/16'], { lookup: async (name) => { lookups.push(name); return [{ address: caddy, family: 4 }]; } });
  await trust.refresh();
  assert.equal(clientIp(req('172.24.0.3', '128.54.10.20'), trust), '128.54.10.20', 'Caddy says who the client is');
  assert.equal(clientIp(req('::ffff:172.24.0.3', '1.1.1.1, 128.54.10.20'), trust), '128.54.10.20', 'right-most entry, mapped peer');
  assert.equal(clientIp(req('10.9.4.4', '128.54.10.20'), trust), '128.54.10.20', 'a listed range');
  assert.equal(clientIp(req('172.24.0.1', '128.54.10.20'), trust), '172.24.0.1', 'a user on the host (the gateway) cannot name a network');
  assert.equal(clientIp(req('127.0.0.1', '128.54.10.20'), trust), '127.0.0.1');
  assert.equal(clientIp(req('172.24.0.3'), trust), '172.24.0.3');
  // the proxy container restarted with a new address: the name is looked up again (at most every 5 s)
  caddy = '172.24.0.7';
  assert.equal(clientIp(req('172.24.0.7', '128.54.10.20'), trust), '172.24.0.7');
  trust.stop();
  const none = createProxyTrust(false);
  assert.equal(clientIp(req('172.24.0.3', '128.54.10.20'), none), '172.24.0.3');
});

test('the rate limiter counts its refusals per limit (never the keys) for the log and /v1/health', () => {
  let t = 0;
  const rl = new RateLimiter(() => t);
  for (let i = 0; i < 5; i++) rl.hit('create', 'net-a', 3, 1000);
  rl.hit('create', 'net-b', 0, 1000);
  rl.note('sockets', 'net-a');
  assert.deepEqual(rl.drain(), { create: { refused: 3, networks: 2 }, sockets: { refused: 1, networks: 1 } });
  assert.deepEqual(rl.drain(), {});
  assert.deepEqual(rl.refusals(), { create: 3, sockets: 1 });
  assert.ok(!JSON.stringify(rl.refusals()).includes('net-a'));
});
