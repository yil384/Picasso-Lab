// Service configuration from the environment (DESIGN.md section 12). Dev defaults are safe to run on a laptop;
// with NODE_ENV=production the service refuses to start unless GAMES_SECRET and IP_SALT are set (32+ characters
// each, different from each other) and TRUST_PROXY is set explicitly to 0 or a list, and every other value is valid.
//
//   PORT              8787                 HOST  127.0.0.1 (the Docker image sets 0.0.0.0)
//   DATA_DIR          ./data (production: /data)
//   GAMES_SECRET      keys the email HMACs (never shown to anyone); or GAMES_SECRET_FILE, a file holding it (the
//                     deploy uses files, so `docker inspect` does not show the secrets)
//   IP_SALT           keys the ipKey HMAC; or IP_SALT_FILE
//   EMAIL_LINK        off | on             reported to clients as features.emailLink
//   EMAIL_SENDER      firebase | resend    who sends the sign-in email (features.emailSender): the page through
//                                          Firebase Auth (the default, also the rollback), or the service itself
//                                          through Resend's HTTP API from EMAIL_FROM (mailer.js)
//   EMAIL_FROM        Picasso Lab <noreply@picasso-lab.com>   resend only: the sender ("Name <address>" or an address)
//   EMAIL_DAILY_CAP   90                   resend only: at most this many emails in any 24 hours (Resend's free tier
//                                          is 100 a day, shared with the lab's other senders)
//   RESEND_API_KEY_FILE  resend only, required: a file holding the Resend API key (sending access is enough). Never
//                     an env value; read once at startup; the key is never logged or shown (not even in errors)
//   RESEND_API_URL    (Resend's)           test hooks only: a loopback URL standing in for https://api.resend.com
//   FIREBASE_PROJECT_ID  yichen-5e23e
//   ALLOWED_ORIGINS   comma list, default https://yil384.github.io; "http://127.0.0.1:*" allows any port
//   TRUST_PROXY       0 | a comma list of the proxies that may set X-Forwarded-For: addresses, CIDR ranges or host
//                     names (production behind Caddy in Docker: fras-caddy-1). The client IP is then the right-most
//                     X-Forwarded-For entry of a request from one of them, else the socket address.
//                     1 (any peer) is for tests only and refused in production.
//   BOT_THINK_SCALE   1                    multiplies bots' think delays (tests: 0 = instant)
//   PACE_SCALE        1                    tests only: multiplies the table's pacing pauses (street, run-out,
//                                          hand-end hold, first deal); action timers are never scaled
//   HOLDEM_TEST_HOOKS 0                    1: the browser harness's /__test/* endpoints (test-hooks.js), loopback
//                                          callers only; refused with NODE_ENV=production
//   FIREBASE_JWKS_URL (Google's)           test hooks only: fetch the ID-token keys from a local JWK set instead
//
// Exports: loadConfig(env) -> frozen config (throws ConfigError listing every problem), originAllowed(config, origin),
//          ConfigError, senderAddress(from), DEFAULT_FROM. config.resendApiKey is not enumerable.

import fs from 'node:fs';
import path from 'node:path';
import { parseTrustEntry } from './util.js';

const DEV_GAMES_SECRET = 'dev-only-games-secret-do-not-use-in-production';
const DEV_IP_SALT = 'dev-only-ip-salt-do-not-use-in-production-000';
export const DEFAULT_FROM = 'Picasso Lab <noreply@picasso-lab.com>';

const ADDRESS_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,63}$/;
// the address part of an EMAIL_FROM value ("Name <a@b.c>" or "a@b.c"), or null; no line breaks, quotes or brackets
// in the name (it goes into a mail header)
export function senderAddress(from) {
  if (typeof from !== 'string' || from.length > 200 || /[\r\n]/.test(from)) return null;
  const m = /^([^<>"\\]{1,64}) <([^<>\s]+)>$/.exec(from);
  const addr = m ? m[2] : from;
  return ADDRESS_RE.test(addr) ? addr.toLowerCase() : null;
}

export class ConfigError extends Error {
  constructor(problems) {
    super(`invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

function parseOrigin(entry) {
  const m = /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:]+\])(?::(\d{1,5}|\*))?$/i.exec(entry);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const host = m[2].toLowerCase();
  const port = m[3] ?? null;
  if (port !== null && port !== '*' && (Number(port) < 1 || Number(port) > 65535)) return null;
  return { scheme, host, port, text: entry };
}

function matchOrigin(rule, origin) {
  const o = /^(https?):\/\/([a-z0-9.-]+|\[[0-9a-f:]+\])(?::(\d{1,5}))?$/i.exec(origin);
  if (!o) return false;
  if (o[1].toLowerCase() !== rule.scheme || o[2].toLowerCase() !== rule.host) return false;
  const port = o[3] ?? null;
  if (rule.port === '*') return true;
  const def = rule.scheme === 'https' ? '443' : '80';
  return (port ?? def) === (rule.port ?? def);
}

export function originAllowed(config, origin) {
  if (typeof origin !== 'string' || !origin || origin.length > 200) return false;
  return config.allowedOrigins.some((rule) => matchOrigin(rule, origin));
}

function num(value, def, { min = -Infinity, max = Infinity, int = false } = {}, name, problems) {
  if (value === undefined || value === '') return def;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) {
    problems.push(`${name} must be ${int ? 'an integer' : 'a number'} in [${min}, ${max}] (got "${value}")`);
    return def;
  }
  return n;
}

export function loadConfig(env = process.env) {
  const problems = [];
  const production = env.NODE_ENV === 'production';

  const port = num(env.PORT, 8787, { min: 0, max: 65535, int: true }, 'PORT', problems);
  const host = env.HOST || '127.0.0.1';
  const dataDir = path.resolve(env.DATA_DIR || (production ? '/data' : './data'));

  const secret = (name, dev) => {
    let v = env[name];
    const file = env[`${name}_FILE`];
    if (file) {
      if (v) problems.push(`set ${name} or ${name}_FILE, not both`);
      try {
        v = fs.readFileSync(file, 'utf8').trim();
      } catch (e) {
        problems.push(`${name}_FILE: cannot read ${file} (${e.code || e.message})`);
        return dev;
      }
    }
    if (v === undefined || v === '') {
      if (production) problems.push(`${name} is required in production (32+ random characters)`);
      return dev;
    }
    if (v.length < 32) problems.push(`${name} must be at least 32 characters`);
    if (production && (v === DEV_GAMES_SECRET || v === DEV_IP_SALT || /replace|change-?me|example/i.test(v))) {
      problems.push(`${name} still holds a placeholder value`);
    }
    return v;
  };
  const gamesSecret = secret('GAMES_SECRET', DEV_GAMES_SECRET);
  const ipSalt = secret('IP_SALT', DEV_IP_SALT);
  if (gamesSecret === ipSalt) problems.push('GAMES_SECRET and IP_SALT must differ');

  const emailRaw = (env.EMAIL_LINK || 'off').toLowerCase();
  if (emailRaw !== 'on' && emailRaw !== 'off') problems.push(`EMAIL_LINK must be "on" or "off" (got "${env.EMAIL_LINK}")`);
  const emailLink = emailRaw === 'on';

  const senderRaw = (env.EMAIL_SENDER || 'firebase').toLowerCase();
  if (senderRaw !== 'firebase' && senderRaw !== 'resend') problems.push(`EMAIL_SENDER must be "firebase" or "resend" (got "${env.EMAIL_SENDER}")`);
  const emailSender = senderRaw === 'resend' ? 'resend' : 'firebase';
  const emailFrom = (env.EMAIL_FROM || DEFAULT_FROM).trim();
  const fromAddress = senderAddress(emailFrom);
  if (!fromAddress) problems.push(`EMAIL_FROM must be "Name <address@domain>" or an address (got "${env.EMAIL_FROM}")`);
  const emailDailyCap = num(env.EMAIL_DAILY_CAP, 90, { min: 1, max: 100_000, int: true }, 'EMAIL_DAILY_CAP', problems);
  // the key is read only when it is used, and never appears in a message (the path and the error code do)
  let resendApiKey = null;
  if (emailSender === 'resend') {
    const file = env.RESEND_API_KEY_FILE;
    if (env.RESEND_API_KEY) problems.push('RESEND_API_KEY is not read: put the key in a file and set RESEND_API_KEY_FILE');
    if (!file) {
      problems.push('EMAIL_SENDER=resend needs RESEND_API_KEY_FILE (a file holding the Resend API key)');
    } else {
      try {
        const v = fs.readFileSync(file, 'utf8').trim();
        if (!v) problems.push(`RESEND_API_KEY_FILE: ${file} is empty (put the Resend API key in it)`);
        else if (!/^re_[A-Za-z0-9_-]{8,200}$/.test(v)) problems.push(`RESEND_API_KEY_FILE: the content of ${file} does not look like a Resend API key (re_...)`);
        else resendApiKey = v;
      } catch (e) {
        problems.push(`RESEND_API_KEY_FILE: cannot read ${file} (${e.code || 'error'})`);
      }
    }
  }

  const firebaseProjectId = env.FIREBASE_PROJECT_ID || 'yichen-5e23e';
  if (!/^[a-z0-9-]{4,40}$/.test(firebaseProjectId)) problems.push('FIREBASE_PROJECT_ID looks wrong');

  const originList = (env.ALLOWED_ORIGINS || 'https://yil384.github.io').split(',').map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = [];
  for (const entry of originList) {
    const rule = parseOrigin(entry);
    if (rule) allowedOrigins.push(Object.freeze(rule));
    else problems.push(`ALLOWED_ORIGINS entry "${entry}" is not scheme://host[:port|:*]`);
  }
  if (!allowedOrigins.length) problems.push('ALLOWED_ORIGINS is empty');

  // production must say whether a proxy is in front: behind Caddy without a trusted proxy every client would share
  // the proxy's ipKey (one suggestion list and one set of per-network limits for the whole site), and trusting any
  // peer would let anyone who reaches the port name any network
  if (production && (env.TRUST_PROXY === undefined || env.TRUST_PROXY === '')) problems.push('TRUST_PROXY must be set in production (the proxy, e.g. fras-caddy-1, or 0)');
  const tpRaw = (env.TRUST_PROXY || '0').trim();
  const tp = tpRaw.toLowerCase();
  let trustProxy = false;
  if (['1', 'true', 'yes'].includes(tp)) {
    if (production) problems.push('TRUST_PROXY=1 trusts every peer: list the proxy instead (its address, range or container name)');
    trustProxy = true;
  } else if (!['0', 'false', 'no'].includes(tp)) {
    const list = tpRaw.split(',').map((x) => x.trim()).filter(Boolean);
    const bad = list.filter((x) => !parseTrustEntry(x));
    if (bad.length || !list.length) problems.push(`TRUST_PROXY must be 0 or a list of addresses, CIDR ranges or host names (bad: ${bad.join(', ') || tpRaw})`);
    trustProxy = Object.freeze(list);
  }

  const botThinkScale = num(env.BOT_THINK_SCALE, 1, { min: 0, max: 10 }, 'BOT_THINK_SCALE', problems);
  const paceScale = num(env.PACE_SCALE, 1, { min: 0.001, max: 10 }, 'PACE_SCALE', problems);

  // test-only switches: never in production, and the key URL only together with the hooks
  const hooksRaw = env.HOLDEM_TEST_HOOKS || '0';
  if (hooksRaw !== '0' && hooksRaw !== '1') problems.push('HOLDEM_TEST_HOOKS must be 0 or 1');
  const testHooks = hooksRaw === '1';
  if (testHooks && production) problems.push('HOLDEM_TEST_HOOKS cannot be on in production');
  const firebaseJwksUrl = env.FIREBASE_JWKS_URL || null;
  if (firebaseJwksUrl) {
    if (!testHooks) problems.push('FIREBASE_JWKS_URL is a test setting: it needs HOLDEM_TEST_HOOKS=1');
    if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?\//.test(firebaseJwksUrl)) problems.push('FIREBASE_JWKS_URL must be a loopback http URL');
  }

  const resendApiUrl = env.RESEND_API_URL || null;
  if (resendApiUrl) {
    if (!testHooks) problems.push('RESEND_API_URL is a test setting: it needs HOLDEM_TEST_HOOKS=1');
    if (!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?(\/[^\s]*)?$/.test(resendApiUrl)) problems.push('RESEND_API_URL must be a loopback http URL');
  }

  if (problems.length) throw new ConfigError(problems);
  const config = {
    production, port, host, dataDir, gamesSecret, ipSalt, emailLink, emailSender, emailFrom, emailFromAddress: fromAddress,
    emailDailyCap, resendApiUrl, firebaseProjectId,
    allowedOrigins: Object.freeze(allowedOrigins), trustProxy, botThinkScale, paceScale, testHooks, firebaseJwksUrl,
  };
  // not enumerable: JSON.stringify, console.log and util.inspect of the config never show the key
  Object.defineProperty(config, 'resendApiKey', { value: resendApiKey, enumerable: false });
  return Object.freeze(config);
}
