// Service configuration from the environment (DESIGN.md section 12). Dev defaults are safe to run on a laptop;
// with NODE_ENV=production the service refuses to start unless GAMES_SECRET and IP_SALT are set (32+ characters
// each, different from each other) and every other value is valid.
//
//   PORT              8787                 HOST  127.0.0.1 (the Docker image sets 0.0.0.0)
//   DATA_DIR          ./data (production: /data)
//   GAMES_SECRET      keys the email HMACs (never shown to anyone)
//   IP_SALT           keys the ipKey HMAC
//   EMAIL_LINK        off | on             reported to clients as features.emailLink
//   FIREBASE_PROJECT_ID  yichen-5e23e
//   ALLOWED_ORIGINS   comma list, default https://yil384.github.io; "http://127.0.0.1:*" allows any port
//   TRUST_PROXY       0 | 1                1: the client IP is the right-most X-Forwarded-For entry (Caddy)
//   BOT_THINK_SCALE   1                    multiplies bots' think delays (tests: 0 = instant)
//   PACE_SCALE        1                    tests only: multiplies the table's pacing pauses (street, run-out,
//                                          hand-end hold, first deal); action timers are never scaled
//   HOLDEM_TEST_HOOKS 0                    1: the browser harness's /__test/* endpoints (test-hooks.js), loopback
//                                          callers only; refused with NODE_ENV=production
//   FIREBASE_JWKS_URL (Google's)           test hooks only: fetch the ID-token keys from a local JWK set instead
//
// Exports: loadConfig(env) -> frozen config (throws ConfigError listing every problem), originAllowed(config, origin),
//          ConfigError.

import path from 'node:path';

const DEV_GAMES_SECRET = 'dev-only-games-secret-do-not-use-in-production';
const DEV_IP_SALT = 'dev-only-ip-salt-do-not-use-in-production-000';

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
    const v = env[name];
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

  const tp = (env.TRUST_PROXY || '0').toLowerCase();
  if (!['0', '1', 'true', 'false', 'yes', 'no'].includes(tp)) problems.push('TRUST_PROXY must be 0 or 1');
  const trustProxy = tp === '1' || tp === 'true' || tp === 'yes';

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

  if (problems.length) throw new ConfigError(problems);
  return Object.freeze({
    production, port, host, dataDir, gamesSecret, ipSalt, emailLink, firebaseProjectId,
    allowedOrigins: Object.freeze(allowedOrigins), trustProxy, botThinkScale, paceScale, testHooks, firebaseJwksUrl,
  });
}
