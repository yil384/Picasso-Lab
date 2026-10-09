// test/fb-token.test.js - scripts/fb-token.mjs against the fake Graph API: the secrets come in on standard input or
// from files (never the command line), the long-lived exchange, /me/accounts, the Page token written 600 in a 700
// folder, only the Page's name and id (and the file, the expiry, missing permissions) printed, several Pages need
// --page, and a refused exchange is reported without the secret.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakeGraph, PAGE_ID, PAGE_TOKEN } from './fake-graph.js';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'fb-token.mjs');
const APP_ID = '987654321012345';
const APP_SECRET = '0123456789abcdef0123456789abcdef';
const SHORT = 'EAAShortLivedUserTokenForTests0123456789';
const LONG = 'EAALongLivedUserTokenForTests9876543210';

function run(args, stdin = '') {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('exit', (code) => resolve({ code, out, err, argv: [SCRIPT, ...args].join(' ') }));
    child.stdin.end(stdin);
  });
}

test('fb-token: secrets on standard input, the never-expiring Page token written 600, only the Page\'s name and id printed', async () => {
  const fake = await fakeGraph({ appId: APP_ID, appSecret: APP_SECRET, shortToken: SHORT, longToken: LONG });
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'muse-fbtok-')), 'fb-page');
  try {
    const r = await run(['--app-id', APP_ID, '--dir', dir, '--graph-url', fake.url], `${APP_SECRET}\n${SHORT}\n`);
    assert.equal(r.code, 0, r.err);
    const file = path.join(dir, 'page-token');
    assert.equal(r.out, `Page: Picasso Lab Live (${PAGE_ID})\ntoken file: ${file} (600)\nexpires: never\n`);
    assert.equal(fs.readFileSync(file, 'utf8'), `${PAGE_TOKEN}\n`);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
    for (const s of [APP_SECRET, SHORT, LONG, PAGE_TOKEN]) {
      assert.equal(`${r.out}${r.err}${r.argv}`.includes(s), false, 'no secret printed or on the command line');
    }
    const ex = fake.calls.find((c) => c.path.endsWith('/oauth/access_token'));
    assert.deepEqual([ex.query.grant_type, ex.query.client_id], ['fb_exchange_token', APP_ID]);
    assert.equal(fake.calls.find((c) => c.path.endsWith('/me/accounts')).auth, `Bearer ${LONG}`, 'the long-lived token in the header');
    assert.equal(fake.calls.find((c) => c.path.endsWith('/debug_token')).auth, `Bearer ${APP_ID}|${APP_SECRET}`);

    // from files, a Page lacking permissions, two Pages: --page chooses
    const sf = path.join(dir, 'secret');
    const uf = path.join(dir, 'user');
    fs.writeFileSync(sf, `FB_APP_SECRET=${APP_SECRET}\n`, { mode: 0o600 });
    fs.writeFileSync(uf, `${SHORT}\n`, { mode: 0o600 });
    const two = await fakeGraph({ appId: APP_ID, appSecret: APP_SECRET, shortToken: SHORT, longToken: LONG, scopes: ['pages_show_list'], pages: [{ id: PAGE_ID, name: 'Picasso Lab Live' }, { id: '555555555555', name: 'Other Page' }] });
    try {
      const many = await run(['--app-id', APP_ID, '--dir', dir, '--graph-url', two.url, '--app-secret-file', sf, '--user-token-file', uf]);
      assert.equal(many.code, 2);
      assert.equal(many.err, `several Pages; choose one with --page:\n  Picasso Lab Live (${PAGE_ID})\n  Other Page (555555555555)\n`);
      const one = await run(['--app-id', APP_ID, '--dir', dir, '--graph-url', two.url, '--app-secret-file', sf, '--user-token-file', uf, '--page', 'Picasso Lab Live', '--name', 'page-token-2']);
      assert.equal(one.code, 0, one.err);
      assert.match(one.out, /missing permissions: pages_read_engagement, pages_manage_posts, publish_video/);
      assert.equal(fs.statSync(path.join(dir, 'page-token-2')).mode & 0o777, 0o600);
    } finally { await two.close(); }

    // a wrong secret: Facebook's refusal, nothing written, the secret not printed
    const bad = await run(['--app-id', APP_ID, '--dir', path.join(dir, 'none'), '--graph-url', fake.url], `ffffffffffffffffffffffffffffffff\n${SHORT}\n`);
    assert.equal(bad.code, 1);
    assert.match(bad.err, /^exchanging the user token: HTTP 400 code 1: Error validating client secret or token/);
    assert.equal(bad.err.includes(SHORT) || bad.err.includes('ffffffffffffffffffffffffffffffff'), false);
    assert.equal(fs.existsSync(path.join(dir, 'none')), false);
    assert.match((await run(['--app-id', APP_ID, '--dir', dir], 'not-hex\nx\n')).err, /App Secret should be 32 hexadecimal/);
    assert.match((await run(['--app-id', APP_ID, '--dir', dir, '--graph-url', 'http://graph.example.com'])).err, /must be https/);
  } finally {
    await fake.close();
    fs.rmSync(path.dirname(dir), { recursive: true, force: true });
  }
});
