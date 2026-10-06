// src/config.js - every setting comes from an env var with a default, is checked once and frozen. The API key and the
// admin token are non-enumerable, so JSON.stringify(config) and console.log(config) never print them.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';
export const TIERS = Object.freeze(['standard', 'contributor']);
/** Muse Spark reasoning levels. 'none' returns HTTP 400; 'minimal' is the floor; 'max' is Standard tier only. */
export const EFFORTS = Object.freeze(['minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

export class ConfigError extends Error {
  constructor(problems) {
    super(`bad configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

/** True for localhost / 127.x / ::1: the only hosts tests may talk to and where no key is needed. */
export function isLoopbackHost(host) {
  const h = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  return h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h);
}

/** True for loopback or a private LAN address: where the Minecraft server is allowed to live. */
export function isLanHost(host) {
  const h = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  if (isLoopbackHost(h) || h.endsWith('.local')) return true;
  const m = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  return /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h);
}

/** True when a URL points at this machine (the mock LLM), false for any remote API. */
export function isLocalUrl(url) {
  try { return isLoopbackHost(new URL(url).hostname); } catch { return false; }
}

function reader(env, problems) {
  const raw = (k) => {
    const v = env[k];
    return v === undefined || String(v).trim() === '' ? undefined : String(v).trim();
  };
  const bad = (k, want, v) => problems.push(`${k} must be ${want} (got "${v}")`);
  return {
    str: (k, def) => raw(k) ?? def,
    int(k, def, min, max) {
      const v = raw(k);
      if (v === undefined) return def;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) { bad(k, `an integer from ${min} to ${max}`, v); return def; }
      return n;
    },
    num(k, def, min, max) {
      const v = raw(k);
      if (v === undefined) return def;
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) { bad(k, `a number from ${min} to ${max}`, v); return def; }
      return n;
    },
    bool(k, def) {
      const v = raw(k);
      if (v === undefined) return def;
      if (/^(1|true|yes|on)$/i.test(v)) return true;
      if (/^(0|false|no|off)$/i.test(v)) return false;
      bad(k, 'true or false', v);
      return def;
    },
    oneOf(k, def, list) {
      const v = raw(k);
      if (v === undefined) return def;
      if (!list.includes(v)) { bad(k, `one of ${list.join(', ')}`, v); return def; }
      return v;
    },
  };
}

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  return Object.freeze(o);
}

function hidden(obj, key, value) {
  Object.defineProperty(obj, key, { value, enumerable: false });
  return obj;
}

/** Build a frozen config from an env object (defaults to process.env). Throws ConfigError listing every problem. */
export function loadConfig(env = process.env) {
  const problems = [];
  const r = reader(env, problems);
  const fromRoot = (p) => path.resolve(ROOT, p);

  // Model. The tier decides the price table; on Meta's API the tier is chosen by the model id (-contributor).
  const baseURL = r.str('MODEL_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, '');
  try {
    const u = new URL(baseURL);
    if (!/^https?:$/.test(u.protocol)) problems.push('MODEL_BASE_URL must be http(s)');
    else if (u.protocol === 'http:' && !isLanHost(u.hostname)) problems.push('MODEL_BASE_URL must use https for a remote API');
  } catch { problems.push(`MODEL_BASE_URL is not a URL (got "${baseURL}")`); }
  const idEnv = r.str('MODEL_ID');
  const tier = r.oneOf('MODEL_TIER', idEnv?.endsWith('-contributor') ? 'contributor' : 'standard', TIERS);
  const id = idEnv ?? (tier === 'contributor' ? 'muse-spark-1.3-contributor' : 'muse-spark-1.3');
  if (tier === 'contributor' && !id.endsWith('-contributor')) {
    problems.push(`MODEL_TIER=contributor but MODEL_ID=${id} is billed at Standard prices, so the $ caps would under-count; use a -contributor model id or MODEL_TIER=standard`);
  }
  const effortRaw = r.str('MODEL_EFFORT', 'low');
  let effort = effortRaw;
  if (effortRaw === 'none') { problems.push('MODEL_EFFORT=none is rejected by Muse Spark (HTTP 400); minimal is the lowest'); effort = 'low'; }
  else effort = r.oneOf('MODEL_EFFORT', 'low', EFFORTS);
  if (effort === 'max' && tier === 'contributor') problems.push('MODEL_EFFORT=max is Standard tier only');
  const cacheRaw = r.str('MODEL_CACHE_KEY', 'muse-mc-v1');
  const model = {
    baseURL,
    id,
    tier,
    effort,
    cacheKey: /^(off|none|0|false)$/i.test(cacheRaw) ? '' : cacheRaw,
    stream: r.bool('MODEL_STREAM', true),
    toolSchema: r.oneOf('MODEL_TOOL_SCHEMA', 'full', ['full', 'basic']),
    maxTokens: r.int('MODEL_MAX_TOKENS', 8192, 0, 1_000_000),
    timeoutMs: r.int('MODEL_TIMEOUT_MS', 120_000, 1_000, 3_600_000),
    maxRetries: r.int('MODEL_MAX_RETRIES', 2, 0, 10),
  };
  const apiKey = r.str('MODEL_API_KEY', '');
  model.hasKey = apiKey.length > 0;
  hidden(model, 'apiKey', apiKey);

  // Minecraft: offline-mode server, so it must never be reachable from the internet.
  const mc = {
    host: r.str('MC_HOST', '127.0.0.1'),
    port: r.int('MC_PORT', 25565, 1, 65535),
    version: r.str('MC_VERSION', '1.21.4'),
    username: r.str('MC_USERNAME', 'Muse'),
    auth: 'offline',
    viewerPort: r.int('MC_VIEWER_PORT', 3007, 0, 65535),
  };
  if (!isLanHost(mc.host)) problems.push(`MC_HOST must be localhost or a LAN address, never a public host (got "${mc.host}")`);
  if (!/^[A-Za-z0-9_]{3,16}$/.test(mc.username)) problems.push(`MC_USERNAME must be 3-16 letters, digits or _ (got "${mc.username}")`);

  // Viewer channel: the only part meant to be exposed (through a tunnel).
  const trustRaw = r.str('WEB_TRUST_PROXY', 'off').toLowerCase();
  let trustProxy = 'off';
  if (trustRaw === 'cloudflare' || trustRaw === 'off') trustProxy = trustRaw;
  else if (/^[1-5]$/.test(trustRaw)) trustProxy = Number(trustRaw);
  else problems.push(`WEB_TRUST_PROXY must be off, cloudflare or a number of proxy hops from 1 to 5 (got "${trustRaw}")`);
  const web = {
    host: r.str('WEB_HOST', '127.0.0.1'),
    port: r.int('WEB_PORT', 8787, 0, 65535),
    publicUrl: r.str('WEB_PUBLIC_URL', '').replace(/\/+$/, ''),
    trustProxy,
    leaseMs: r.int('WEB_LEASE_MS', 600_000, 10_000, 86_400_000),
    maxSessions: r.int('WEB_MAX_SESSIONS', 4, 1, 64),
    askPerHour: r.int('WEB_ASK_PER_HOUR', 3, 1, 10_000),
    askMaxChars: r.int('WEB_ASK_MAX_CHARS', 300, 20, 4_000),
    askAllowContributor: r.bool('WEB_ASK_ALLOW_CONTRIBUTOR', false),
    maxBodyBytes: r.int('WEB_MAX_BODY', 8_192, 1_024, 1_048_576),
  };
  if (web.publicUrl) {
    try {
      if (!/^https?:$/.test(new URL(web.publicUrl).protocol)) problems.push('WEB_PUBLIC_URL must be http(s)');
    } catch { problems.push(`WEB_PUBLIC_URL is not a URL (got "${web.publicUrl}")`); }
  }
  const adminToken = r.str('WEB_ADMIN_TOKEN', '');
  if (adminToken && adminToken.length < 24) {
    problems.push('WEB_ADMIN_TOKEN must be at least 24 characters (make one with: openssl rand -base64 24)');
  }
  hidden(web, 'adminToken', adminToken);

  const body = {
    maxTravel: r.int('BODY_MAX_TRAVEL', 256, 8, 10_000),
  };

  const caps = {
    steps: r.int('STEP_CAP', 300, 1, 100_000),
    usdPerRun: r.num('COST_CAP_RUN', 1.0, 0, 10_000),
    usdPerHour: r.num('COST_CAP_HOUR', 3.0, 0, 10_000),
    // 8, not 5: in real terrain the model explores (collect finds nothing, a walk settles short) before it finds ore
    consecutiveErrors: r.int('ERROR_CAP', 8, 1, 1_000),
    loopRepeat: r.int('LOOP_REPEAT', 3, 2, 100),
  };

  // The /ask house brain keeps notes of its own: viewer-driven runs never write the notes the filmed runs read.
  const memory = {
    notesPath: fromRoot(r.str('NOTES_PATH', 'notes.json')),
    askNotesPath: fromRoot(r.str('ASK_NOTES_PATH', 'notes-ask.json')),
    shortSteps: r.int('SHORT_MEMORY', 8, 0, 200),
  };
  if (memory.askNotesPath === memory.notesPath) problems.push('ASK_NOTES_PATH must differ from NOTES_PATH');

  const log = { dir: fromRoot(r.str('LOG_DIR', 'logs')) };

  if (problems.length) throw new ConfigError(problems);
  return deepFreeze({ root: ROOT, model, mc, web, body, caps, memory, log });
}

/** The process-wide config, read from process.env at first import. */
export const config = loadConfig();
