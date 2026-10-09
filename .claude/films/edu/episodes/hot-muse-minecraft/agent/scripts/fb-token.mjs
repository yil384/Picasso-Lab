#!/usr/bin/env node
// scripts/fb-token.mjs - turns a short-lived user token into the Page token FB_LIVE needs, once: the App ID, the App
// Secret and a short-lived user token (Graph API Explorer, with pages_show_list, pages_read_engagement,
// pages_manage_posts and publish_video) give a long-lived user token (fb_exchange_token); /me/accounts with it gives
// the Page's token, which then never expires; that token is written to <dir>/page-token (file 600, folder 700). Prints
// only the Page's name and id, the file's path, whether the token expires and any permission it lacks: never a token or
// the secret. The secret and the user token are read from files or from standard input (a hidden prompt on a terminal),
// never from the command line or the environment: every user on a shared machine can read every command line.
//
//   node scripts/fb-token.mjs --app-id <id> --dir ~/.config/picasso/fb-page [--page <id or name>]
//        (then type or pipe two lines: the App Secret, the short-lived user token)
//   node scripts/fb-token.mjs --app-id <id> --dir <folder> --app-secret-file <file> --user-token-file <file>
//   node scripts/fb-token.mjs --app-id <id> --dir <folder> --user     (FB_TARGET=me: the long-lived user token itself,
//        written to <dir>/user-token; it lasts about 60 days, so run this again before it runs out)

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export const NEEDED = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'publish_video'];

/** A secret from a file: the value alone, or KEY=value lines (the first line whose key matches). */
export function readSecretFile(file, keys) {
  const text = fs.readFileSync(file, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && keys.includes(m[1])) return m[2].replace(/^["']|["']$/g, '');
  }
  const first = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  return /=/.test(first) ? '' : first;
}

/** Lines from standard input; on a terminal each is asked for with the echo off. */
async function readLines(prompts) {
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin });
    const out = [];
    for await (const line of rl) { out.push(line.trim()); if (out.length >= prompts.length) break; }
    rl.close();
    return out;
  }
  const out = [];
  for (const p of prompts) {
    process.stderr.write(p);
    spawnSync('stty', ['-echo'], { stdio: 'inherit' });
    try {
      const rl = readline.createInterface({ input: process.stdin, terminal: false });
      out.push(await new Promise((r) => rl.once('line', (l) => { rl.close(); r(l.trim()); })));
    } finally { spawnSync('stty', ['echo'], { stdio: 'inherit' }); process.stderr.write('\n'); }
  }
  return out;
}

/** The Graph API answer as JSON, or an Error with Facebook's message and every given secret scrubbed. */
async function graph(url, init, secrets, what) {
  let res;
  try { res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) }); } catch (err) { throw new Error(`${what}: no answer (${err?.cause?.code ?? err?.message ?? err})`); }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (res.ok && json && !json.error) return json;
  let msg = `${what}: HTTP ${res.status}${json?.error?.code ? ` code ${json.error.code}` : ''}: ${String(json?.error?.message ?? text).slice(0, 200)}`;
  for (const s of secrets) if (s) msg = msg.split(s).join('***');
  throw new Error(msg);
}

/** Write the token: the folder 700, the file 600, atomically. */
export function writeToken(dir, name, token) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  const file = path.join(dir, name);
  fs.writeFileSync(`${file}.tmp`, `${token}\n`, { mode: 0o600 });
  fs.chmodSync(`${file}.tmp`, 0o600);
  fs.renameSync(`${file}.tmp`, file);
  return file;
}

export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  let v;
  try {
    ({ values: v } = parseArgs({ args: argv, options: {
      'app-id': { type: 'string' }, dir: { type: 'string' }, page: { type: 'string' }, name: { type: 'string' },
      'app-secret-file': { type: 'string' }, 'user-token-file': { type: 'string' }, version: { type: 'string' }, 'graph-url': { type: 'string' },
      user: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    } }));
  } catch (err) { printErr(err.message); return 2; }
  const usage = 'usage: node scripts/fb-token.mjs --app-id <id> --dir <folder> [--page <id or name>] [--app-secret-file f --user-token-file f]\n(the App Secret and the user token come from those files or from standard input, never from the command line)';
  if (v.help) { print(usage); return 0; }
  if (!/^\d{5,25}$/.test(String(v['app-id'] ?? '')) || !v.dir) { printErr(usage); return 2; }
  const base = String(v['graph-url'] ?? 'https://graph.facebook.com').replace(/\/+$/, '');
  try {
    const u = new URL(base);
    if (!(u.protocol === 'https:' || (u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname)))) throw new Error('x');
  } catch { printErr('--graph-url must be https (http only on this machine, for tests)'); return 2; }
  const version = v.version ?? 'v23.0';
  const name = v.name ?? (v.user ? 'user-token' : 'page-token');
  if (!/^[A-Za-z0-9_.-]{1,60}$/.test(name)) { printErr('--name must be a plain file name'); return 2; }

  let secret = v['app-secret-file'] ? readSecretFile(v['app-secret-file'], ['FB_APP_SECRET', 'APP_SECRET']) : '';
  let userToken = v['user-token-file'] ? readSecretFile(v['user-token-file'], ['FB_USER_TOKEN', 'USER_TOKEN', 'FB_SHORT_USER_TOKEN']) : '';
  const ask = [...(secret ? [] : ['App Secret: ']), ...(userToken ? [] : ['Short-lived user token: '])];
  if (ask.length) {
    const lines = await readLines(ask);
    if (!secret) secret = lines.shift() ?? '';
    if (!userToken) userToken = lines.shift() ?? '';
  }
  if (!/^[0-9a-f]{16,64}$/i.test(secret)) { printErr('the App Secret should be 32 hexadecimal characters (App settings, Basic)'); return 2; }
  if (!/^[A-Za-z0-9_\-.|]{20,4096}$/.test(userToken)) { printErr('that is not a user access token'); return 2; }
  const secrets = [secret, userToken];
  const g = (p) => new URL(`${base}/${version}/${p}`);

  try {
    // 1. the long-lived user token (about 60 days)
    const ex = g('oauth/access_token');
    for (const [k, x] of Object.entries({ grant_type: 'fb_exchange_token', client_id: v['app-id'], client_secret: secret, fb_exchange_token: userToken })) ex.searchParams.set(k, x);
    const long = (await graph(ex, {}, secrets, 'exchanging the user token')).access_token;
    if (!long) throw new Error('exchanging the user token: no token came back');
    secrets.push(long);
    if (v.user) {
      // FB_TARGET=me: the long-lived user token is what the camera uses; it runs out in about 60 days
      const meUrl = g('me');
      meUrl.searchParams.set('fields', 'id,name');
      const who = await graph(meUrl, { headers: { authorization: `Bearer ${long}` } }, secrets, 'reading the profile');
      const dbgU = g('debug_token');
      dbgU.searchParams.set('input_token', long);
      const infoU = (await graph(dbgU, { headers: { authorization: `Bearer ${v['app-id']}|${secret}` } }, secrets, 'checking the user token').catch(() => null))?.data ?? null;
      const fileU = writeToken(path.resolve(v.dir), name, long);
      print(`Profile: ${who.name} (${who.id})`);
      print(`token file: ${fileU} (600)`);
      if (infoU) {
        print(`expires: ${infoU.expires_at ? new Date(infoU.expires_at * 1000).toISOString() : 'never'}`);
        if (!(infoU.scopes ?? []).includes('publish_video')) print('missing permissions: publish_video (going live needs it)');
      }
      return 0;
    }
    // 2. the Page's token, from the long-lived user token: it does not expire
    const acc = g('me/accounts');
    acc.searchParams.set('fields', 'id,name,access_token,tasks');
    acc.searchParams.set('limit', '100');
    const pages = (await graph(acc, { headers: { authorization: `Bearer ${long}` } }, secrets, 'reading the Pages')).data ?? [];
    for (const p of pages) secrets.push(p.access_token);
    const want = v.page ? pages.filter((p) => p.id === v.page || p.name === v.page) : pages;
    if (want.length !== 1) {
      printErr(pages.length
        ? `${v.page ? `no Page "${v.page}"` : 'several Pages'}; choose one with --page:\n${pages.map((p) => `  ${p.name} (${p.id})`).join('\n')}`
        : 'this user manages no Page the token can see (did it get pages_show_list?)');
      return 2;
    }
    const page = want[0];
    if (!page.access_token) throw new Error('the Page came back without a token (does the user have a task on it?)');
    // 3. what the Page token is: when it expires, which permissions it carries (the app token goes in the header)
    const dbg = g('debug_token');
    dbg.searchParams.set('input_token', page.access_token);
    const info = (await graph(dbg, { headers: { authorization: `Bearer ${v['app-id']}|${secret}` } }, secrets, 'checking the Page token').catch(() => null))?.data ?? null;
    const file = writeToken(path.resolve(v.dir), name, page.access_token);
    print(`Page: ${page.name} (${page.id})`);
    print(`token file: ${file} (600)`);
    if (info) {
      print(`expires: ${info.expires_at === 0 ? 'never' : new Date(info.expires_at * 1000).toISOString()}`);
      const missing = NEEDED.filter((s) => !(info.scopes ?? []).includes(s));
      if (missing.length) print(`missing permissions: ${missing.join(', ')} (FB_LIVE needs them; ask for them in the Graph API Explorer and run this again)`);
    }
    if (!(page.tasks ?? []).includes('CREATE_CONTENT')) print('note: the user has no CREATE_CONTENT task on this Page; going live needs it');
    return 0;
  } catch (err) {
    let msg = String(err?.message ?? err);
    for (const s of secrets) if (s) msg = msg.split(s).join('***');
    printErr(msg);
    return 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) process.exitCode = await main();
