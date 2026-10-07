// test/camera-launcher.test.js - the camera account's launcher sign-in (authorization code) against a fake Microsoft,
// Xbox and Minecraft: the pasted address is parsed, redeemed once, stored 600, reused while fresh and refreshed after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  codeFromPaste, launcherSignInUrl, redeemLauncherCode, launcherProfile, cameraProfile, LAUNCHER, LAUNCHER_TOKEN_FILE,
} from '../src/camera.js';

function fakeServices({ owns = true } = {}) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    const body = init.body ? String(init.body) : '';
    calls.push({ url, body });
    const json = (status, data) => ({ ok: status < 400, status, text: async () => JSON.stringify(data) });
    if (url === 'https://login.live.com/oauth20_token.srf') {
      const f = new URLSearchParams(body);
      assert.equal(f.get('client_id'), LAUNCHER.clientId);
      if (f.get('grant_type') === 'authorization_code' && f.get('code') === 'M.C5_good.code.1234567890') return json(200, { access_token: 'msa-1', refresh_token: 'refresh-1', expires_in: 3600 });
      if (f.get('grant_type') === 'refresh_token' && f.get('refresh_token') === 'refresh-1') return json(200, { access_token: 'msa-2', refresh_token: 'refresh-2', expires_in: 3600 });
      return json(400, { error: 'invalid_grant', error_description: 'The provided value for the code parameter is not valid.' });
    }
    if (url.includes('user.auth.xboxlive.com')) return json(200, { Token: 'xbl-user', DisplayClaims: { xui: [{ uhs: 'u1' }] } });
    if (url.includes('xsts.auth.xboxlive.com')) return json(200, { Token: 'xsts', DisplayClaims: { xui: [{ uhs: 'u1' }] } });
    if (url.endsWith('/authentication/login_with_xbox')) {
      assert.equal(JSON.parse(body).identityToken, 'XBL3.0 x=u1;xsts');
      return json(200, { access_token: `mc-${calls.length}`, expires_in: 86400 });
    }
    if (url.endsWith('/entitlements/mcstore')) return json(200, { items: owns ? [{ name: 'product_minecraft' }, { name: 'game_minecraft' }] : [] });
    if (url.endsWith('/minecraft/profile')) return owns ? json(200, { id: 'abc123', name: 'CamPlayer' }) : json(404, { errorMessage: 'NOT_FOUND' });
    return json(500, { error: 'unexpected ' + url });
  };
  return { fetchFn, calls };
}

test('launcher sign-in: address parsing, redeem once, stored 600, reused, refreshed', async () => {
  assert.match(launcherSignInUrl(), /^https:\/\/login\.live\.com\/oauth20_authorize\.srf\?client_id=00000000402b5328&response_type=code&/);
  assert.equal(codeFromPaste('https://login.live.com/oauth20_desktop.srf?code=M.C5_good.code.1234567890&lc=1033'), 'M.C5_good.code.1234567890');
  assert.equal(codeFromPaste('  M.C5_good.code.1234567890 '), 'M.C5_good.code.1234567890');
  assert.equal(codeFromPaste('hello'), null);
  assert.throws(() => codeFromPaste('https://login.live.com/oauth20_desktop.srf?error=access_denied&error_description=The+user+denied'), /Microsoft said: access_denied/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-auth-'));
  try {
    const svc = fakeServices();
    await assert.rejects(redeemLauncherCode(dir, 'https://login.live.com/oauth20_desktop.srf?code=M.C5_old.code.1234567890', svc), /redeeming the sign-in code/);
    const r = await redeemLauncherCode(dir, 'https://login.live.com/oauth20_desktop.srf?code=M.C5_good.code.1234567890&lc=1033', svc);
    assert.deepEqual(r, { name: 'CamPlayer', uuid: 'abc123', ownsJava: true });
    const file = path.join(dir, LAUNCHER_TOKEN_FILE);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /msa-1/); // only the refresh token and the Minecraft token are kept

    const n = svc.calls.length;
    const p1 = await cameraProfile({ auth: 'msa', authDir: dir }, { fetchFn: svc.fetchFn });
    assert.equal(p1.name, 'CamPlayer');
    assert.equal(svc.calls.length, n, 'a fresh Minecraft token is reused without any call');

    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    saved.mc.expiresAt = Date.now() + 60_000; // near expiry
    fs.writeFileSync(file, JSON.stringify(saved));
    const p2 = await launcherProfile(dir, { fetchFn: svc.fetchFn });
    assert.notEqual(p2.token, p1.token);
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).refresh_token, 'refresh-2');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('launcher sign-in: an account without Java Edition is refused clearly', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cam-auth-'));
  try {
    await assert.rejects(redeemLauncherCode(dir, 'M.C5_good.code.1234567890', fakeServices({ owns: false })), /Java/);
    assert.equal(fs.existsSync(path.join(dir, LAUNCHER_TOKEN_FILE)), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
