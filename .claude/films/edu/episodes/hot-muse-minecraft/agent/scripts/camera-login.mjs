// scripts/camera-login.mjs - signs the camera's Microsoft account in once, with the device code flow (no password
// ever: the account owner opens the link on any device, types the code and approves), and keeps the tokens in the
// auth folder (700, files 600) for the camera (src/camera.js), which refreshes them silently from then on. The link
// and code go to LOGIN_CODE.txt in that folder and to stdout; how it went goes to LOGIN_STATUS.txt. Tokens are never
// printed or logged. The flow is prismarine-auth's (live.com device code, as mineflayer signs in Java accounts).
//
//   node scripts/camera-login.mjs --dir /auth            # waits up to ~15 min for the owner, then stores the tokens
//   node scripts/camera-login.mjs --dir /auth --check    # signed in? (refreshes if needed, never asks for a code)
//   node scripts/camera-login.mjs --dir /auth --force    # sign in again even when the stored login still works
//
// Exit codes: 0 signed in, 1 failed or not signed in, 2 bad arguments.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { AUTH_OPTIONS, AUTH_CACHE_NAME, cameraProfile, tightenAuthDir } from '../src/camera.js';

const require = createRequire(import.meta.url);

export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error, env = process.env } = {}) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, strict: true, options: { dir: { type: 'string' }, check: { type: 'boolean' }, force: { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } }));
  } catch (err) { printErr(err.message); return 2; }
  if (values.help) { print('usage: node scripts/camera-login.mjs --dir AUTH_DIR [--check | --force]'); return 0; }
  const dir = path.resolve(values.dir ?? env.CAMERA_AUTH_DIR ?? '');
  if (!values.dir && !env.CAMERA_AUTH_DIR) { printErr('--dir (or CAMERA_AUTH_DIR) is needed'); return 2; }
  process.umask(0o077);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  tightenAuthDir(dir);
  const status = (text) => fs.writeFileSync(path.join(dir, 'LOGIN_STATUS.txt'), `${new Date().toISOString()} ${text}\n`, { mode: 0o600 });

  if (values.check || !values.force) {
    try {
      const p = await cameraProfile({ auth: 'msa', authDir: dir });
      print(`signed in: ${p.name}${values.check ? '' : ' (nothing to do; --force signs in again)'}`);
      return 0;
    } catch (err) {
      if (values.check) { print(`not signed in: ${err.message}`); return 1; }
    }
  }

  const { Authflow } = require('prismarine-auth');
  const codeFile = path.join(dir, 'LOGIN_CODE.txt');
  const flow = new Authflow(AUTH_CACHE_NAME, dir, { ...AUTH_OPTIONS, forceRefresh: true }, (r) => {
    const until = new Date(Date.now() + (Number(r.expires_in) || 900) * 1000).toISOString();
    const text = [
      'Sign the Muse camera account in (Microsoft account that owns Minecraft Java Edition):',
      `  open:  ${r.verification_uri}`,
      `  code:  ${r.user_code}`,
      `  (or:   https://www.microsoft.com/link?otc=${r.user_code})`,
      `  valid until ${until}; never enter the account password anywhere but Microsoft's own page`,
      '',
    ].join('\n');
    fs.writeFileSync(codeFile, text, { mode: 0o600 });
    status(`waiting for the owner to enter the code (until ${until})`);
    print(text);
  });
  try {
    const r = await flow.getMinecraftJavaToken({ fetchProfile: true, fetchEntitlements: true });
    tightenAuthDir(dir);
    if (!r?.token) throw new Error('no Minecraft token');
    if (!r.profile?.name || r.profile.error) throw new Error('signed in, but the account has no Minecraft Java profile (does it own Java Edition?)');
    const owns = Array.isArray(r.entitlements?.items) ? r.entitlements.items.some((i) => /game_minecraft|product_minecraft/.test(i.name)) : null;
    status(`signed in: ${r.profile.name} (${r.profile.id})${owns === null ? '' : `, owns Java Edition: ${owns}`}`);
    try { fs.rmSync(codeFile, { force: true }); } catch { /* gone */ }
    print(`signed in as ${r.profile.name}; tokens stored in ${dir}`);
    return 0;
  } catch (err) {
    const msg = String(err?.message ?? err).replace(/[A-Za-z0-9_\-.]{40,}/g, '***').slice(0, 300);
    status(`failed: ${msg}`);
    printErr(`login failed: ${msg}`);
    return 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exitCode = await main();
