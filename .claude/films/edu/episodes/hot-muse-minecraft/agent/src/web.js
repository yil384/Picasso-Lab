// src/web.js - the viewer channel, node:http only. GET / says what this is (18+, privacy, not an official Minecraft
// service); GET /play/<token> is a zero-JS control page an agent browser can drive from the accessibility tree (state
// as text, one form per skill, a stop button, the session's last actions); /api offers the same actions as JSON,
// described by /openapi.json (OpenAPI 3.1); POST /ask queues a natural-language instruction for our own brain (18+,
// per-address limits, length cap); GET /log is the JSONL tail for the operator (admin token). Each guest gets a random
// token, a bot of its own and a lease (one live session per address); when every bot is in use, callers wait in a
// queue with a place and an ETA. The live 3D views live under unguessable 128-bit view ids. Viewer input is data: every
// argument is checked against the tool whitelist before a body sees it, every string is HTML-escaped, tokens never
// reach the log, other players' chat never reaches a page or reply, and state-changing requests from other sites are
// refused. Behind a proxy, forwarded headers count only on requests that carry the proxy's shared secret
// (WEB_PROXY_SECRET, header X-Muse-Proxy) and/or come from the proxy's own address (WEB_TRUSTED_PROXIES); with either
// set, any other peer that is not loopback is refused.

import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { config as defaultConfig, isLoopbackHost, parseAddressRange } from './config.js';
import { TOOLS, TOOL_NAMES, SCHEMAS, validateArgs, coerceArgs } from './contracts.js';
import { createLogger, scrub } from './log.js';
import { reportedDone } from './brain.js';
import { createMcp } from './mcp.js';

const HOUR = 3_600_000;
const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;
const TOOL_INFO = Object.fromEntries(TOOLS.map((t) => [t.function.name, t.function.description]));
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029]', 'g'); // control characters and line separators
const TIMEOUT = Symbol('timeout');
const LINES_KEPT = 50;
const LINES_SHOWN = 20;
const ENDED_KEPT = 500;
const HOST_RE = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?(:\d{1,5})?$/;
// Live views (/watch, /eyes): every new socket.io connection makes the viewer send the world around the bot (MBs) and
// listen to the bot, in this process. Per address: open WebSockets, requests in flight, new connections per hour; per
// session: open WebSockets. A WebSocket idle this long, or one whose reader lets this much pile up, is dropped.
const VIEW_WS_PER_ADDRESS = 4;
const VIEW_WS_PER_SESSION = 12;
const VIEW_HTTP_PER_ADDRESS = 32;
const VIEW_IDLE_MS = 90_000;
const VIEW_BUFFER_MAX = 8 * 1024 * 1024;
/** A socket.io request that opens a new connection (a handshake: no sid yet). */
const opensView = (url) => /\/socket\.io\/?\?/.test(url) && !/[?&]sid=/.test(url);
/** The live-view crack overlay's event stream: a comment this often keeps proxies (and VIEW_IDLE_MS) from closing it. */
const FX_PING_MS = 20_000;
/** A live view's id: 128 random bits (base64url), separate from the game id that logs and bot names show. */
const VIEW_ID_BYTES = 16;
/**
 * Different live-view ids that do not exist, asked for by one address in an hour, before its requests for unknown ids
 * get 429 (a guesser needs many different ids; a tab left open on an old view repeats one, and counts once).
 */
const VIEW_MISSES_PER_HOUR = 60;
const MISSED_KEPT = 20_000; // (address, unknown view id) pairs remembered for the hour
/** The header the proxy in front adds with WEB_PROXY_SECRET (never passed on to the live views). */
export const PROXY_HEADER = 'x-muse-proxy';
/** A place in the queue for a bot is kept this long after its caller last asked. */
const QUEUE_HOLD_MS = 90_000;
/** The Mojang brand guidelines' line for anything that is not theirs. */
export const NOT_OFFICIAL = 'NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.';

/**
 * The live-view page with src/live-view-fx.js added (eased first-person turns, the crack on the block being broken):
 * prismarine-viewer's own index.html plus one script after its client, the script with its settings in front, and the
 * folder of the destroy_stage textures for the game version. null when prismarine-viewer is not installed or its page
 * changed (the page is then served as it is).
 */
let viewFxCache;
export function viewFx(version = '1.21.4') {
  if (viewFxCache !== undefined) return viewFxCache;
  viewFxCache = null;
  try {
    const req = createRequire(import.meta.url);
    const pageFile = req.resolve('prismarine-viewer/public/index.html');
    const page = fs.readFileSync(pageFile, 'utf8');
    const tag = '<script type="text/javascript" src="index.js"></script>';
    if (!page.includes(tag)) return null;
    const textures = path.join(path.dirname(pageFile), 'textures');
    const has = (v) => fs.existsSync(path.join(textures, v, 'blocks', 'destroy_stage_0.png'));
    const newest = fs.readdirSync(textures).filter((v) => /^\d+\.\d+(\.\d+)?$/.test(v) && has(v))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1);
    const folder = has(version) ? version : newest;
    const settings = { textures: folder ? `textures/${folder}/blocks/` : null, events: 'muse-fx/events' };
    const script = `window.__museFx = ${JSON.stringify(settings)};\n${fs.readFileSync(new URL('./live-view-fx.js', import.meta.url), 'utf8')}`;
    viewFxCache = { page: page.replace(tag, `${tag}\n    <script type="text/javascript" src="muse-fx.js"></script>`), script };
  } catch { /* not installed: the stock page */ }
  return viewFxCache;
}

// ---------------------------------------------------------------------------------------------------------------
// HTML: html`` escapes every interpolated value unless it is already Html (built by html`` or raw()).

class Html { constructor(s) { this.s = s; } toString() { return this.s; } }
const raw = (s) => new Html(String(s));

/** Escape text for HTML element content and double- or single-quoted attributes. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const part = (v) => (v instanceof Html ? v.s : Array.isArray(v) ? v.map(part).join('') : v === null || v === undefined || v === false ? '' : escapeHtml(v));

function html(strings, ...values) {
  let s = strings[0];
  for (let i = 0; i < values.length; i += 1) s += part(values[i]) + strings[i + 1];
  return new Html(s);
}

const CSS = `:root{color-scheme:light dark;--bg:#f6f4ef;--card:#fffdf9;--fg:#1e1c19;--muted:#655f56;--line:#d8d1c4;--accent:#2d6a4f;--on-accent:#fff;--warn:#9c2f16;--warn-bg:#fbebe5}
@media (prefers-color-scheme:dark){:root{--bg:#141311;--card:#1c1a17;--fg:#ece8e0;--muted:#a59f94;--line:#3a362f;--accent:#7cc49b;--on-accent:#0f1a14;--warn:#f29b7f;--warn-bg:#2c1a14}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:54rem;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.55rem;line-height:1.2;margin:0 0 .3rem}
h2{font-size:1.05rem;margin:2rem 0 .6rem;padding-bottom:.3rem;border-bottom:1px solid var(--line)}
h3{font-size:.95rem;line-height:1.3;margin:.8rem 0 .2rem}
.tool h3{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin:0}
p{margin:.4rem 0}
a{color:var(--accent)}
.muted{color:var(--muted);font-size:.9rem}
pre,ol.log,code{font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
pre{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px;margin:0;white-space:pre-wrap;overflow-wrap:anywhere}
.notice{border-left:4px solid var(--warn);background:var(--warn-bg);padding:8px 12px;margin:.6rem 0;overflow-wrap:anywhere}
.tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(15rem,1fr));gap:12px}
.tool,.panel{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:8px}
.tool p{font-size:.85rem;color:var(--muted);margin:0}
.field{display:flex;flex-direction:column;gap:2px}
label,legend{font-size:.85rem}
fieldset{border:1px solid var(--line);border-radius:4px;padding:6px 8px 8px;margin:0;display:flex;flex-direction:column;gap:6px}
input,select,textarea{font:inherit;font-size:.95rem;padding:6px 8px;border:1px solid var(--line);border-radius:4px;background:var(--bg);color:var(--fg);width:100%}
textarea{min-height:5rem;resize:vertical}
.check{display:flex;gap:8px;align-items:center}
.check input{width:auto;margin:0}
button{font:inherit;font-weight:600;padding:8px 14px;border-radius:4px;border:1px solid var(--accent);background:var(--accent);color:var(--on-accent);cursor:pointer;align-self:flex-start;margin-top:auto}
button.stop{background:var(--warn);border-color:var(--warn);color:var(--card)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.row form{margin:0}
ol.log{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:10px 12px 10px 2.4rem;margin:0;overflow-wrap:anywhere}
footer{margin-top:2.5rem;padding-top:.8rem;border-top:1px solid var(--line)}`;

const STYLE_SRC = `'sha256-${crypto.createHash('sha256').update(CSS).digest('base64')}'`;
const HTML_CSP = `default-src 'none'; style-src ${STYLE_SRC}; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`;
const BASE_HEADERS = Object.freeze({
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer', // the token is in the URL: never leak it in a Referer
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
});

function shell({ title, refresh = 0, main, index = true }) {
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${refresh > 0 ? html`<meta http-equiv="refresh" content="${refresh}">\n` : ''}${index ? '' : raw('<meta name="robots" content="noindex, nofollow">\n')}<title>${title}</title>
<style>${raw(CSS)}</style>
</head>
<body>
<div class="wrap">
${main}
<footer><p class="muted">A research demo by Picasso Lab, UC San Diego. ${NOT_OFFICIAL} Not affiliated with or endorsed by
Meta. For adults (18+). <a href="/">Home</a> · <a href="/openapi.json">OpenAPI</a></p></footer>
</div>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------------------------------------------
// Small helpers

class HttpError extends Error {
  /** extra: more fields for a JSON error body (e.g. the queue place), next to error. */
  constructor(status, message, headers = {}, extra = null) { super(message); this.status = status; this.headers = headers; this.extra = extra; }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clock = (ms) => `${new Date(ms).toISOString().slice(11, 19)} UTC`;

function duration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
}

/** 'the lease ended' -> 'The lease ended.' */
function sentence(text) {
  const s = String(text).trim();
  return s ? `${s[0].toUpperCase()}${s.slice(1)}${/[.!?]$/.test(s) ? '' : '.'}` : s;
}

function leaseWords(ms) {
  return ms % 60_000 === 0 ? `${ms / 60_000}-minute` : `${Math.round(ms / 1000)}-second`;
}

function fmtArgs(args) {
  return Object.entries(args ?? {}).map(([k, v]) => {
    if (isPlainObject(v)) return `${k}=${Object.values(v).join(',')}`;
    if (Array.isArray(v)) return `${k}=${v.map((x) => (isPlainObject(x) ? Object.values(x).join(' ') : String(x))).join(', ')}`; // craft_batch items
    return `${k}=${typeof v === 'string' && /\s/.test(v) ? JSON.stringify(v) : v}`;
  }).join(' ');
}

function fmtDelta(delta) {
  return Object.entries(delta ?? {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ');
}

function within(promise, ms) {
  let timer;
  const t = new Promise((resolve) => { timer = setTimeout(resolve, ms, TIMEOUT); });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

/** Read the request body, never more than max bytes (413 otherwise). */
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > max) { req.resume(); reject(new HttpError(413, `the request body is larger than ${max} bytes`)); return; }
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > max) { done = true; chunks.length = 0; reject(new HttpError(413, `the request body is larger than ${max} bytes`)); } else chunks.push(c);
    });
    req.on('end', () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on('error', (e) => { if (!done) { done = true; reject(e); } });
  });
}

/** Form or JSON body -> {kind: 'form'|'json', fields}. Form fields keep the first value of a repeated name. */
async function readFields(req, max) {
  const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  const text = (await readBody(req, max)).toString('utf8');
  if (type === 'application/json') {
    if (!text.trim()) return { kind: 'json', fields: {} };
    let value;
    try { value = JSON.parse(text); } catch { throw new HttpError(400, 'the body is not valid JSON'); }
    if (!isPlainObject(value)) throw new HttpError(400, 'the JSON body must be an object');
    return { kind: 'json', fields: value };
  }
  if (type === 'application/x-www-form-urlencoded' || (type === '' && !text.trim())) {
    const fields = Object.create(null);
    for (const [k, v] of new URLSearchParams(text)) if (!(k in fields)) fields[k] = v;
    return { kind: 'form', fields };
  }
  throw new HttpError(415, 'send application/x-www-form-urlencoded or application/json');
}

/** A rolling one-hour counter per key (an address key). take() counts a hit; blocked() only looks. */
function createLimiter(perHour, now) {
  const hits = new Map();
  const recent = (key, t) => (hits.get(key) ?? []).filter((x) => x > t - HOUR);
  return {
    take(key) {
      const t = now();
      const list = recent(key, t);
      if (list.length >= perHour) { hits.set(key, list); return { ok: false, retryMs: list[0] + HOUR - t }; }
      list.push(t);
      hits.set(key, list);
      return { ok: true };
    },
    blocked(key) {
      const t = now();
      const list = recent(key, t);
      return list.length >= perHour ? { ok: false, retryMs: list[0] + HOUR - t } : { ok: true };
    },
    prune() {
      const t = now();
      for (const [k, list] of hits) if (!list.some((x) => x > t - HOUR)) hits.delete(k);
    },
  };
}

/** Clean free text from the /ask box: whitespace collapsed, control characters dropped. */
function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').replace(CONTROL, '').trim();
}

/**
 * The key the per-address limits count under: an IPv4 address as is (also when IPv4-mapped), an IPv6 address by its
 * /64 prefix, since one home or phone usually holds a whole /64 and could rotate through it.
 */
export function addressKey(ip) {
  let a = String(ip ?? '').trim().toLowerCase().replace(/^\[|\]$/g, '');
  const zone = a.indexOf('%');
  if (zone >= 0) a = a.slice(0, zone);
  const mapped = a.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return mapped[1];
  if (net.isIPv4(a)) return a;
  if (!net.isIPv6(a)) return a.slice(0, 64) || 'unknown';
  const width = (list) => list.reduce((n, g) => n + (g.includes('.') ? 2 : 1), 0);
  let groups = a.split(':');
  if (a.includes('::')) {
    const [h, t] = a.split('::');
    const head = h ? h.split(':') : [];
    const tail = t ? t.split(':') : [];
    groups = [...head, ...Array(Math.max(0, 8 - width(head) - width(tail))).fill('0'), ...tail];
  }
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

/**
 * When an /ask request is finished: the model reported "Done:", or answered in words without a tool call. A failed
 * model call or an invalid call (StepResult.error) is not an answer: the brain backs off or corrects and goes on.
 * @param {import('./contracts.js').StepResult} step
 */
export function askAnswered(step) {
  if (!step || step.error) return false;
  return reportedDone(step) || step.tool === null || step.tool === undefined;
}

// ---------------------------------------------------------------------------------------------------------------
// OpenAPI

/**
 * The OpenAPI 3.1 description of /api: one operation per tool (operationId = tool name, request body = the tool's
 * JSON Schema), plus start_session, read_state, stop and end_session.
 */
export function openApiSpec(baseUrl, { leaseMs = 600_000 } = {}) {
  const json = (schema) => ({ 'application/json': { schema } });
  const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
  const err = (description) => ({ description, content: json(ref('Error')) });
  const token = {
    name: 'token', in: 'path', required: true, description: 'the session token returned by start_session',
    schema: { type: 'string', pattern: TOKEN_RE.source },
  };
  const paths = {
    '/api/session': {
      post: {
        operationId: 'start_session',
        tags: ['session'],
        summary: 'Get a bot of your own for one lease',
        description: `Starts a ${leaseWords(leaseMs)} session with its own bot. Adults only: send {"adult": true} to confirm you are 18 or older.`,
        requestBody: { required: true, content: json({ type: 'object', properties: { adult: { type: 'boolean', const: true, description: 'I am 18 or older' } }, required: ['adult'], additionalProperties: false }) },
        responses: { 201: { description: 'session started (the bot joins within seconds)', content: json(ref('Session')) }, 400: err('not confirmed 18+'), 429: err('too many sessions from this address'), 503: err('every bot is in use: queue gives your place and an estimate; ask again within holdSeconds to keep the place') },
      },
    },
    '/api/{token}': {
      delete: {
        operationId: 'end_session', tags: ['session'], summary: 'End the session early and free the bot', parameters: [token],
        responses: { 200: { description: 'ended', content: json({ type: 'object', properties: { ended: { type: 'boolean' } } }) }, 404: err('unknown session'), 410: err('already ended') },
      },
    },
    '/api/{token}/state': {
      get: {
        operationId: 'read_state', tags: ['session'], summary: 'Read the game state, the running action and the last result', parameters: [token],
        responses: { 200: { description: 'state', content: json(ref('State')) }, 404: err('unknown session'), 410: err('session ended') },
      },
    },
    '/api/{token}/stop': {
      post: {
        operationId: 'stop', tags: ['session'], summary: 'Stop the running action (the bot stays)', parameters: [token],
        responses: { 200: { description: 'stopped', content: json({ type: 'object', properties: { stopped: { type: 'boolean' } } }) }, 404: err('unknown session'), 410: err('session ended') },
      },
    },
  };
  for (const name of TOOL_NAMES) {
    const empty = Object.keys(SCHEMAS[name].properties).length === 0;
    paths[`/api/{token}/${name}`] = {
      post: {
        operationId: name,
        tags: ['tools'],
        summary: TOOL_INFO[name].split('. ')[0],
        description: `${TOOL_INFO[name]} One action at a time: the call waits up to about 25 s for the result, otherwise it answers 202 and the result appears in read_state.`,
        parameters: [token],
        requestBody: { required: !empty, content: json(SCHEMAS[name]) },
        responses: {
          200: { description: 'the action finished (ok may still be false, with the reason in result)', content: json(ref('ActionResult')) },
          202: { description: 'still running; poll read_state', content: json(ref('Running')) },
          400: err('arguments not allowed'), 404: err('unknown session'), 409: err('another action is running'),
          410: err('session ended'), 503: err('the bot is still joining'),
        },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Muse plays Minecraft: bot control',
      version: '0.1.0',
      description: 'Drive a Minecraft bot through 10 fixed skills. Start a session, then call one skill at a time and read the state. '
        + 'Arguments are checked against fixed lists; nothing you send is run as code. A research demo by Picasso Lab, UC San Diego. '
        + 'Not affiliated with or endorsed by Meta, Mojang or Microsoft. Adults (18+) only.',
    },
    servers: [{ url: baseUrl }],
    tags: [{ name: 'session', description: 'start, read, stop, end' }, { name: 'tools', description: 'the 10 skills' }],
    paths,
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            queue: {
              type: 'object', description: 'only when every bot is in use',
              properties: { position: { type: 'integer' }, waiting: { type: 'integer' }, etaSeconds: { type: 'integer', description: 'at the latest, when enough leases end' }, holdSeconds: { type: 'integer' } },
            },
          },
          required: ['error'],
        },
        Session: {
          type: 'object',
          properties: {
            token: { type: 'string' }, session: { type: 'string' }, status: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' },
            leaseSeconds: { type: 'integer' }, playUrl: { type: 'string' }, apiUrl: { type: 'string' },
          },
        },
        ActionResult: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' }, result: { type: 'string' }, tool: { type: 'string' }, args: { type: 'object' },
            delta: { type: 'object', additionalProperties: { type: 'integer' }, description: 'inventory change, item -> +gained / -spent' },
            ms: { type: 'number' }, state: { type: 'string', description: 'the game state as text after the action' },
          },
        },
        Running: { type: 'object', properties: { running: { type: 'boolean' }, tool: { type: 'string' }, message: { type: 'string' } } },
        State: {
          type: 'object',
          properties: {
            session: { type: 'object' }, state: { type: 'string', description: 'the game state as text' },
            snapshot: { type: ['object', 'null'] }, running: { type: ['object', 'null'] }, last: { type: ['object', 'null'] },
            notice: { type: ['string', 'null'] }, log: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The server

/**
 * @param {object} opts
 * @param {import('./contracts.js').Config} [opts.config]
 * @param {(sessionId: string, opts?: {viewId: string}) => import('./contracts.js').Body | Promise<import('./contracts.js').Body>} opts.makeBody
 *   one bot per guest session (viewId: the path its live views listen under, /watch/<viewId>/ and /eyes/<viewId>/);
 *   'house' is the bot the /ask queue drives
 * @param {(body: object) => import('./contracts.js').Brain | Promise<import('./contracts.js').Brain>} [opts.makeBrain]
 *   our own brain for /ask; without it the queue is closed
 * @param {import('./contracts.js').Logger} [opts.log]
 * @param {import('./contracts.js').HourMeter} [opts.meter]   shared $ meter; /ask closes while it is exceeded
 * @param {() => number} [opts.now]          clock for leases and rate limits (tests)
 * @param {'off'|'cloudflare'|number} [opts.trustProxy]   where the client address comes from (default
 *   config.web.trustProxy, WEB_TRUST_PROXY): 'off' the socket; 'cloudflare' the CF-Connecting-IP header; N the Nth
 *   X-Forwarded-For entry from the right (N trusted proxies that each append one). Never trusted unless set.
 * @param {string[]} [opts.trustedProxies]   the proxy's addresses or ranges (default config.web.trustedProxies,
 *   WEB_TRUSTED_PROXIES): when set, forwarded headers count only on connections from there, and any other peer that is
 *   not loopback is refused
 * @param {string} [opts.proxySecret]        the secret the proxy sends in X-Muse-Proxy (default config.web.proxySecret,
 *   WEB_PROXY_SECRET): when set, forwarded headers count only on requests that carry it, and any other request from a
 *   peer that is not loopback is refused
 * @param {number} [opts.apiWaitMs]          how long an /api action call waits for its result before answering 202
 * @param {number} [opts.formWaitMs]         how long a form post waits before redirecting back
 * @param {number} [opts.startTimeoutMs]     how long a bot may take to join
 * @param {number} [opts.sessionsPerHour]    session starts per client address per hour
 * @param {number} [opts.sessionsPerAddress] live sessions one address may hold at once (default 1)
 * @param {number} [opts.sessionCooldownMs]  after a session of an address ends, how long before it may start another
 * @param {string} [opts.askNotice]          a line shown above the Ask form (e.g. a data-use disclosure)
 * @param {number} [opts.askQueueMax]        waiting /ask instructions
 * @param {number} [opts.askSteps]           brain steps one /ask instruction may use
 * @param {number} [opts.mcpGamesPerAddress] live MCP games one address may hold (default config.web.mcpGamesPerAddress)
 * @param {number} [opts.mcpStartsPerHour]   MCP game starts per address per hour (default 60)
 * @param {number} [opts.mcpInitsPerHour]    new MCP sessions per address per hour (default 1200)
 * @param {{sessions?: number, perAddress?: number}} [opts.mcpLimits]  live MCP sessions in all and per address
 * @param {number} [opts.mcpCallMs]          how long one MCP call may wait before it answers (tests)
 * @param {ReturnType<typeof import('./contracts.js').skillSet>} [opts.skills]  the skills MCP's play and play_sequence
 *   take (default: the 10 tools and craft_batch; BODY=mineai adds its extra skills)
 * @param {number} [opts.viewsPerHour]       new live-view connections per address per hour (default 120)
 * @param {number} [opts.viewMissesPerHour]  requests for live views that do not exist, per address per hour (default 60)
 * @param {(gameId: string) => ({videoUrl: string, embedUrl: string}|null)} [opts.liveVideo]  the live video of a game
 *   while its stream runs (STREAM_VIDEO_URL)
 * @param {(gameId: string, o: {waitMs: number, signal: AbortSignal}) => Promise<object>} [opts.liveView]  what MCP's
 *   live_view shows: the Facebook live channel pointed at the game (src/index.js), else STREAM_VIDEO_URL
 * @returns {import('./contracts.js').Web & {sweep: () => void}}
 */
export function createWeb(opts = {}) {
  const cfg = opts.config ?? defaultConfig;
  const web = cfg.web;
  const { makeBody, makeBrain, meter } = opts;
  if (typeof makeBody !== 'function') throw new TypeError('createWeb needs makeBody(sessionId)');
  const log = opts.log ?? createLogger({ dir: null, config: cfg });
  const now = opts.now ?? Date.now;
  const trustRaw = opts.trustProxy ?? web.trustProxy ?? 'off';
  const trustProxy = trustRaw === true ? 1 : trustRaw === false ? 'off' : trustRaw;
  const apiWaitMs = opts.apiWaitMs ?? 25_000;
  const formWaitMs = opts.formWaitMs ?? 80_000; // a form post waits for the action to end (under a tunnel's ~100 s), so an agent never has to poll
  const startTimeoutMs = opts.startTimeoutMs ?? 60_000;
  const askQueueMax = opts.askQueueMax ?? 20;
  const askSteps = opts.askSteps ?? 40;
  const sessionsPerAddress = opts.sessionsPerAddress ?? 1;
  const sessionCooldownMs = opts.sessionCooldownMs ?? 60_000;
  const mcpGamesPerAddress = opts.mcpGamesPerAddress ?? web.mcpGamesPerAddress ?? Math.max(2, Math.floor(web.maxSessions / 2));
  const askNotice = opts.askNotice ?? null;
  const adminToken = web.adminToken ?? '';

  const sessions = new Map(); // token -> session
  const ended = new Map(); // token -> {reason, at}, so an old link explains itself
  const sessionLimiter = createLimiter(opts.sessionsPerHour ?? 30, now);
  const askLimiter = createLimiter(web.askPerHour, now);
  const adminFails = createLimiter(5, now);
  const mcpStartLimiter = createLimiter(opts.mcpStartsPerHour ?? 60, now);
  const mcpInitLimiter = createLimiter(opts.mcpInitsPerHour ?? 1_200, now);
  const viewLimiter = createLimiter(opts.viewsPerHour ?? 120, now);
  const viewMisses = createLimiter(opts.viewMissesPerHour ?? VIEW_MISSES_PER_HOUR, now);
  const endedViews = new Map(); // view id -> when its game ended: a watcher still asking gets 410, not a counted miss
  const missedViews = new Map(); // 'address id' -> when first asked: an unknown id counts as a miss once per hour
  const waiting = []; // the queue for a bot when all are in use: [{key, since, seen}], first come first served
  const proxyRefusals = createLimiter(1, now); // one log row per refused peer and hour
  const proxySeen = createLimiter(1, now); // without WEB_TRUSTED_PROXIES: one row per peer and hour that forwards
  const viewConns = new Map(); // 'ws@address' | 'ws#session' | 'http@address' -> open connections
  const viewSockets = new Set(); // upgraded live-view sockets (the server does not track them), closed on stop()
  const cooldowns = new Map(); // address key -> when it may start a session again
  const ask = { queue: [], running: null, done: [], nextId: 1, house: null, controller: null };

  let server = null;
  let url = null;
  let sweeper = null;
  let closing = false;

  const playPath = (s) => `/play/${s.token}`;
  const firstValue = (v) => String(v ?? '').split(',')[0].trim().toLowerCase();

  // The proxy in front (WEB_TRUSTED_PROXIES): its forwarded headers are believed only on its own connections.
  const proxyList = opts.trustedProxies ?? web.trustedProxies ?? [];
  const proxies = proxyList.length ? new net.BlockList() : null;
  for (const t of proxyList) {
    const r = parseAddressRange(t);
    if (!r) throw new TypeError(`not an address or range: ${t}`);
    const family = net.isIPv4(r[0]) ? 'ipv4' : 'ipv6';
    if (r[1] === null) proxies.addAddress(r[0], family); else proxies.addSubnet(r[0], r[1], family);
  }
  // The proxy's shared secret (WEB_PROXY_SECRET): proof that a request came through it, whatever the peer address.
  const proxySecret = Buffer.from(String(opts.proxySecret ?? web.proxySecret ?? ''));
  const hasSecret = (req) => {
    const v = req.headers[PROXY_HEADER];
    if (!proxySecret.length || typeof v !== 'string') return false;
    const got = Buffer.from(v);
    return got.length === proxySecret.length && crypto.timingSafeEqual(got, proxySecret);
  };
  const peerOf = (req) => {
    const a = String(req.socket?.remoteAddress ?? '');
    const mapped = a.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
    return mapped ? mapped[1] : a;
  };
  const isLoopbackPeer = (ip) => ip === '::1' || /^127\./.test(ip);
  /** May this request's forwarded headers be believed? Only with WEB_TRUST_PROXY on, and only from the proxy. */
  function forwarded(req) {
    if (trustProxy === 'off') return false;
    if (proxySecret.length && !hasSecret(req)) return false;
    if (!proxies) {
      if (proxySecret.length) return true;
      // which peer sends forwarded headers: the address WEB_TRUSTED_PROXIES should name (on picasso, Caddy's)
      const ip = peerOf(req);
      if (!isLoopbackPeer(ip) && (req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip']) && proxySeen.take(ip).ok) log.event('proxy_peer', { peer: ip.slice(0, 64) });
      return true;
    }
    const ip = peerOf(req);
    return net.isIP(ip) ? proxies.check(ip, net.isIPv4(ip) ? 'ipv4' : 'ipv6') : false;
  }
  /** With WEB_PROXY_SECRET or WEB_TRUSTED_PROXIES set, a request that is neither the proxy's nor this machine's is refused. */
  function refusedPeer(req) {
    if ((!proxies && !proxySecret.length) || forwarded(req)) return false;
    const ip = peerOf(req);
    if (isLoopbackPeer(ip)) return false;
    if (proxyRefusals.take(ip).ok) log.event('proxy_refused', { peer: ip.slice(0, 64) });
    return true;
  }

  /**
   * The public base URL for links, the agent prompt and openapi.json: WEB_PUBLIC_URL, else (behind a trusted proxy)
   * the host the viewer used, else the local listen address.
   */
  function base(req) {
    if (web.publicUrl) return web.publicUrl;
    if (req && forwarded(req)) {
      const host = firstValue(req.headers['x-forwarded-host'] ?? req.headers.host);
      if (HOST_RE.test(host)) {
        const proto = firstValue(req.headers['x-forwarded-proto']);
        const scheme = proto === 'http' || proto === 'https' ? proto : isLoopbackHost(host.replace(/:\d+$/, '')) ? 'http' : 'https';
        return `${scheme}://${host}`;
      }
    }
    return url || `http://${web.host}:${web.port}`;
  }

  /** The client address: from the socket, unless a proxy is explicitly trusted (WEB_TRUST_PROXY, WEB_TRUSTED_PROXIES). */
  function clientIp(req) {
    if (!forwarded(req)) return req.socket.remoteAddress ?? 'unknown';
    if (trustProxy === 'cloudflare') {
      const v = String(req.headers['cf-connecting-ip'] ?? '').trim();
      if (net.isIP(v)) return v;
    } else if (Number.isInteger(trustProxy) && trustProxy > 0) {
      const list = String(req.headers['x-forwarded-for'] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
      const v = list[list.length - trustProxy];
      if (v && net.isIP(v)) return v;
    }
    return req.socket.remoteAddress ?? 'unknown';
  }
  const clientKey = (req) => addressKey(clientIp(req));

  /** True for a state-changing request another site's page made a browser send (CSRF). */
  function fromOtherSite(req) {
    const site = String(req.headers['sec-fetch-site'] ?? '').toLowerCase();
    if (site === 'cross-site' || site === 'same-site') return true;
    const origin = req.headers.origin;
    // no Origin: a server-side agent or curl; "null": our own forms (the pages send Referrer-Policy: no-referrer)
    if (!origin || origin === 'null') return false;
    let host;
    try { host = new URL(origin).host.toLowerCase(); } catch { return true; }
    const allowed = new Set([String(req.headers.host ?? '').toLowerCase()]);
    for (const u of [base(req), url]) { try { if (u) allowed.add(new URL(u).host.toLowerCase()); } catch { /* not a URL */ } }
    if (forwarded(req)) allowed.add(firstValue(req.headers['x-forwarded-host']));
    return !allowed.has(host);
  }

  // ----- sessions

  function addLine(s, text) {
    s.lines.push({ at: now(), text: String(text).replace(CONTROL, ' ') });
    if (s.lines.length > LINES_KEPT) s.lines.shift();
  }

  function startSession(client, address = client) {
    const s = {
      token: crypto.randomBytes(24).toString('base64url'),
      client, // the key for the per-client limits (an address, or mcp:<MCP session>); never shown or logged
      address, // the address key; never shown or logged
      id: `g${crypto.randomBytes(3).toString('hex')}`, // the game id: logs, replies and the bot's name show it
      viewId: crypto.randomBytes(VIEW_ID_BYTES).toString('base64url'), // the live views' path: never logged
      created: now(),
      expiresAt: now() + web.leaseMs,
      status: 'starting',
      body: null,
      error: null,
      running: null,
      last: null,
      notice: null,
      lines: [],
      ended: null,
      refresh: true,
      offs: [],
    };
    sessions.set(s.token, s);
    log.event('session_start', { session: s.id, leaseMs: web.leaseMs });
    addLine(s, 'session started; the bot is joining the world');
    s.ready = (async () => {
      const body = await makeBody(s.id, { viewId: s.viewId });
      if (s.ended) { await Promise.resolve(body?.close?.()).catch(() => {}); return; }
      s.body = body;
      const joined = await within(Promise.resolve(body.ready), startTimeoutMs);
      if (joined === TIMEOUT) throw new Error('the bot did not join in time');
      if (s.ended) return;
      if (typeof body.on === 'function') {
        // other players' chat stays out of the session's lines (and so out of /play, the API and MCP replies): it is
        // abuse and prompt injection from strangers, and the guest never asked for it
        s.offs.push(
          body.on('death', () => addLine(s, 'the bot died and respawned')),
          body.on('error', (d = {}) => addLine(s, `error: ${d.message ?? 'unknown'}`)),
          body.on('end', (d = {}) => endSession(s, `the bot left the server${d.reason ? ` (${d.reason})` : ''}`)),
        );
      }
      s.status = 'ready';
      addLine(s, 'the bot is in the world');
    })().catch((e) => {
      s.status = 'failed';
      s.error = String(e?.message ?? e);
      endSession(s, `the bot could not join: ${s.error}`, { cooldown: false }); // not the guest's doing: no waiting
    });
    return s;
  }

  /**
   * End a session once: free the slot, remember why, close its bot (close() stops the running skill first). The
   * address waits sessionCooldownMs before its next session; not after a failed join, and not for an MCP session's
   * key (a new MCP session would skip it anyway: MCP starts are limited per address instead).
   */
  function endSession(s, reason, { cooldown = true } = {}) {
    if (s.ended) return s.closed;
    s.ended = reason;
    sessions.delete(s.token);
    ended.set(s.token, { reason, at: now() });
    endedViews.set(s.viewId, now());
    if (cooldown && s.client && !s.client.startsWith('mcp:') && sessionCooldownMs > 0) cooldowns.set(s.client, now() + sessionCooldownMs);
    while (ended.size > ENDED_KEPT) ended.delete(ended.keys().next().value);
    while (endedViews.size > ENDED_KEPT) endedViews.delete(endedViews.keys().next().value);
    for (const off of s.offs) { try { off?.(); } catch { /* ignore */ } }
    log.event('session_end', { session: s.id, reason });
    const body = s.body;
    s.closed = !body ? Promise.resolve() : Promise.resolve()
      .then(() => body.close?.())
      .catch((e) => log.event('web_error', { session: s.id, message: `closing the bot: ${e?.message ?? e}` }));
    return s.closed;
  }

  function sweep() {
    const t = now();
    for (const s of [...sessions.values()]) if (t >= s.expiresAt) endSession(s, 'the lease ended');
    for (const [k, until] of cooldowns) if (until <= t) cooldowns.delete(k);
    pruneQueue();
    sessionLimiter.prune();
    askLimiter.prune();
    adminFails.prune();
    mcpStartLimiter.prune();
    mcpInitLimiter.prune();
    viewLimiter.prune();
    viewMisses.prune();
    for (const [k, at] of missedViews) { if (t - at < HOUR) break; missedViews.delete(k); }
    proxyRefusals.prune();
    proxySeen.prune();
  }

  /** The live session for a token, or an HttpError (404 unknown, 410 ended). */
  function lookup(token) {
    if (!TOKEN_RE.test(token)) throw new HttpError(404, 'there is no session with this link');
    const s = sessions.get(token);
    if (s && now() >= s.expiresAt) endSession(s, 'the lease ended');
    if (s && !s.ended) return s;
    const gone = ended.get(token);
    if (gone) throw Object.assign(new HttpError(410, `this session has ended: ${gone.reason}`), { reason: gone.reason });
    throw new HttpError(404, 'there is no session with this link');
  }

  function safe(fn, fallback) {
    try { return fn(); } catch { return fallback; }
  }
  const stateText = (s) => (s.status === 'ready' && s.body ? safe(() => String(s.body.state()), 'The state is not available right now.') : 'The bot is joining the world.');
  const snapshot = (s) => (s.status === 'ready' && s.body ? safe(() => s.body.snapshot(), null) : null);

  /** Start one action; resolves {ok, promise} or {ok:false, status, error}. */
  function startAction(s, tool, args) {
    if (s.ended) return { ok: false, status: 410, error: `the session has ended: ${s.ended}` };
    if (s.status !== 'ready' || !s.body) return { ok: false, status: 503, error: 'the bot is still joining the world; try again in a few seconds' };
    if (s.running || s.body.busy) return { ok: false, status: 409, error: `busy: ${s.running?.tool ?? 'an action'} is still running (stop it or wait)` };
    s.running = { tool, args, started: now() };
    s.notice = null;
    const promise = Promise.resolve()
      .then(() => s.body.run(tool, args))
      .then((r) => ({
        ok: Boolean(r?.ok), result: String(r?.result ?? ''), delta: isPlainObject(r?.delta) ? r.delta : {}, ms: r?.ms,
        ...(isPlainObject(r?.phases) ? { phases: r.phases } : {}), ...(typeof r?.code === 'string' ? { code: r.code } : {}),
        ...(isPlainObject(r?.own) ? { own: r.own } : {}),
      }), (e) => ({ ok: false, result: `error: ${e?.message ?? e}`, delta: {} }))
      .then((r) => {
        s.running = null;
        s.last = { tool, args, ...r, at: now() };
        const delta = fmtDelta(r.delta);
        addLine(s, `${tool} ${fmtArgs(args)} -> ${r.ok ? 'ok' : 'not done'}: ${r.result}${delta ? ` [${delta}]` : ''}`);
        // phases: where the skill's time went, in ms (path, dig, drop, sync, place, open, clicks, pickup, cook, other)
        // own: what the step itself used and made, when the body can tell (BODY=mineai); delta minus own changed on the way
        log.event('viewer_action', { session: s.id, tool, args, ok: r.ok, result: r.result.slice(0, 600), delta: r.delta, ...(r.own ? { own: r.own } : {}), ms: r.ms ?? null, phases: r.phases ?? null });
        return r;
      });
    return { ok: true, promise };
  }

  async function stopSession(s, reason) {
    const wasRunning = Boolean(s.running);
    if (s.body) await within(Promise.resolve().then(() => s.body.stop?.(reason)).catch(() => {}), 5_000);
    addLine(s, wasRunning ? `stop pressed: ${reason}` : 'stop pressed (nothing was running)');
    // a guest (the /play page, the API or an MCP client) pressed stop; the live views are not affected
    log.event('viewer_stop', { session: s.id, reason, wasRunning });
    return wasRunning;
  }

  // ----- the /ask queue (our brain, our key)

  async function house() {
    if (!ask.house) {
      ask.house = (async () => {
        const body = await makeBody('house');
        const joined = await within(Promise.resolve(body.ready), startTimeoutMs);
        if (joined === TIMEOUT) throw new Error('the house bot did not join in time');
        const mine = ask.house;
        body.on?.('end', () => { if (ask.house === mine) ask.house = null; });
        return { body, brain: await makeBrain(body) };
      })();
      const promise = ask.house;
      promise.catch(() => { if (ask.house === promise) ask.house = null; });
    }
    return ask.house;
  }

  function askClosedReason() {
    if (!makeBrain) return 'the Ask queue is closed right now';
    if (meter?.exceeded?.()) return 'this hour\'s budget for our Muse is spent; try again later';
    if (ask.queue.length >= askQueueMax) return 'the queue is full; try again in a few minutes';
    return null;
  }

  async function pump() {
    if (ask.running || closing || !ask.queue.length) return;
    const item = ask.queue.shift();
    ask.running = item;
    item.status = 'running';
    item.started = now();
    log.event('ask_start', { ask: item.id });
    let steps = 0;
    let capped = false;
    try {
      if (meter?.exceeded?.()) throw new Error('this hour\'s budget is spent');
      const { brain } = await house();
      ask.controller = new AbortController();
      const r = await brain.runUntil(`A viewer asks: ${item.text}`, (step) => {
        steps += 1;
        // done when the model reports it (say "Done: ...", as the system prompt asks) or answers in words; a failed
        // model call or an invalid call goes on (the brain backs off, or the model sees the correction)
        if (askAnswered(step)) return true;
        if (steps >= askSteps) { capped = true; return true; }
        return false;
      }, { signal: ask.controller.signal });
      Object.assign(item, { status: 'done', reason: capped ? 'step limit for one request' : r?.reason ?? 'done', steps: r?.steps ?? steps, usd: r?.usd ?? 0 });
    } catch (e) {
      Object.assign(item, { status: 'failed', reason: String(e?.message ?? e), steps });
    } finally {
      ask.controller = null;
      ask.running = null;
      item.ms = now() - item.started;
      ask.done.unshift(item);
      ask.done.length = Math.min(ask.done.length, 10);
      log.event('ask_end', { ask: item.id, status: item.status, reason: item.reason, steps: item.steps, usd: item.usd ?? 0 });
      kick();
    }
  }

  function kick() {
    setImmediate(() => pump().catch((e) => { try { log.event('web_error', { message: `ask queue: ${e?.message ?? e}` }); } catch { /* ignore */ } }));
  }

  // ----- responses

  function send(res, status, body, headers) {
    res.writeHead(status, { ...BASE_HEADERS, 'content-length': Buffer.byteLength(body), ...headers });
    res.end(body);
  }
  const sendHtml = (res, status, doc, headers = {}) => send(res, status, String(doc), {
    'content-type': 'text/html; charset=utf-8', 'content-security-policy': HTML_CSP, 'cache-control': 'no-store', ...headers,
  });
  const jsonText = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
  const sendJson = (res, status, obj, headers = {}) => send(res, status, `${jsonText(obj)}\n`, {
    'content-type': 'application/json; charset=utf-8', 'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    'cache-control': 'no-store', ...headers,
  });
  const redirect = (res, location) => send(res, 303, '', { location, 'cache-control': 'no-store' });
  const PRIVATE = { 'x-robots-tag': 'noindex, nofollow' };

  function errorPage(status, message, reason) {
    const title = `${status} ${http.STATUS_CODES[status] ?? 'Error'}`;
    const text = status === 410 && reason ? `Reason: ${reason}` : message;
    return shell({
      title,
      index: false,
      main: html`<main><h1>${status === 410 ? 'This session has ended' : title}</h1>
<p role="alert">${sentence(text)}</p>
<p><a href="/">${status === 410 || status === 404 ? 'Start a new session' : 'Back to the start page'}</a></p></main>`,
    });
  }

  // ----- pages

  function landingPage(req) {
    const lease = leaseWords(web.leaseMs);
    const closed = askClosedReason();
    const prompt = `Open ${base(req)}/ . In "Get a bot", tick "I am 18 or older" and press "Start a ${lease} session". `
      + 'On the page that opens, read "Game state", then use the action buttons to collect 10 logs of whatever tree is nearby, craft them into planks and build a hut_3x3 from those planks. '
      + 'After each action, press "Check again" until Status says "Ready for the next action", then read "Last result" before you choose the next one. '
      + 'Stop when the hut is built.';
    return shell({
      title: 'Muse plays Minecraft',
      main: html`<header><h1>Muse plays Minecraft</h1>
<p>A research demo by Picasso Lab at UC San Diego. A bot in our own Minecraft world (one world, shared by every
guest's bot) acts only through 10 fixed skills (walk, mine, craft, smelt, place, build, fight, eat, chat, read its
state). Meta's Muse Spark model plays it on our side, and you can drive a bot yourself, by hand or through your own AI
agent.</p>
<p class="notice"><strong>${NOT_OFFICIAL}</strong> Not affiliated with or endorsed by Meta, Mojang or Microsoft.</p>
<p><strong>Adults only (18+).</strong> The world is shared with strangers and with bots that other people's AI agents
drive, nothing in it is moderated, and none of it is made for children; we cannot check ages, so everyone who plays
confirms they are 18 or older.</p></header>
<main>
<section aria-labelledby="h-start"><h2 id="h-start">Get a bot</h2>
<p>You get a bot of your own for a ${lease} lease, then the slot goes to the next guest. Bots in use: ${sessions.size} of ${web.maxSessions}.</p>
<form class="panel" method="post" action="/session" aria-labelledby="h-start" novalidate>
<div class="check"><input type="checkbox" id="start-adult" name="adult" value="yes" required><label for="start-adult">I am 18 or older</label></div>
<button type="submit">Start a ${lease} session</button>
</form></section>
<section aria-labelledby="h-agent"><h2 id="h-agent">Let your own agent play</h2>
<p>The control page needs no JavaScript: an agent that reads pages through the accessibility tree can use it. Paste this into your agent:</p>
<pre>${prompt}</pre>
<p class="muted">For a custom connector, use the <a href="/openapi.json">OpenAPI description</a> (operations are the skill names).</p></section>
<section aria-labelledby="h-ask"><h2 id="h-ask">Ask our Muse</h2>
<p>Type an instruction for our bot. Our own Muse Spark brain carries it out, one request at a time. One request in
the queue per address, at most ${web.askPerHour} per hour, ${web.askMaxChars} characters each. Waiting now: ${ask.queue.length}. <a href="/ask">Queue status</a></p>
${askNotice ? html`<p class="notice">${askNotice}</p>` : ''}${closed ? html`<p class="notice" role="status">${closed}</p>` : html`<form class="panel" method="post" action="/ask" aria-labelledby="h-ask" novalidate>
<div class="field"><label for="ask-text">Instruction (up to ${web.askMaxChars} characters)</label><textarea id="ask-text" name="text" maxlength="${web.askMaxChars}" required></textarea></div>
<div class="check"><input type="checkbox" id="ask-adult" name="adult" value="yes" required><label for="ask-adult">I am 18 or older</label></div>
<button type="submit">Queue instruction</button>
</form>`}</section>
<section aria-labelledby="h-privacy"><h2 id="h-privacy">Privacy</h2>
<p>No account, no cookies, nothing to sign in with. The server keeps a log of each game: the skills the bot was asked
to run with their arguments (the text it was told to say included), the results and the times, and the name and
version an agent's MCP client reports. Only the people who run this demo at Picasso Lab can read that log; no page
shows it. Network addresses are held in memory only, to apply the limits per address, and are not written to the log.
Whatever the bot says in the game, other players in the world see. Instructions sent to "Ask our Muse" go to Meta's
model API, which carries them out.</p></section>
</main>`,
    });
  }

  /** Default form values from the state: your position, a block nearby, something you carry. */
  function defaultsFor(snap) {
    const p = isPlainObject(snap?.position) ? snap.position : { x: 0, y: 64, z: 0 };
    const near = Array.isArray(snap?.nearbyBlocks) ? snap.nearbyBlocks.map((b) => b?.name) : [];
    const inv = Object.keys(isPlainObject(snap?.inventory) ? snap.inventory : {});
    const mobs = Array.isArray(snap?.mobs) ? snap.mobs.map((m) => m?.name) : [];
    return {
      'go_to.x': p.x, 'go_to.y': p.y, 'go_to.z': p.z,
      'collect.block': near, 'smelt.item': inv, 'place.block': inv, 'build.material': inv, 'attack.target': mobs,
      'place.pos.x': Number.isInteger(p.x) ? p.x + 1 : p.x, 'place.pos.y': p.y, 'place.pos.z': p.z,
    };
  }

  function field(tool, name, schema, defaults) {
    const id = `${tool}-${name.replace(/\./g, '-')}`;
    const label = `${name.replace(/\./g, ' ')}: ${schema.description ?? ''}`;
    const want = defaults[`${tool}.${name}`];
    if (schema.enum) {
      const chosen = Array.isArray(want) ? want.find((w) => schema.enum.includes(w)) : want;
      const options = schema.enum.map((o) => html`<option value="${o}"${o === chosen ? raw(' selected') : ''}>${o}</option>`);
      return html`<div class="field"><label for="${id}">${label}</label><select id="${id}" name="${name}" required>${options}</select></div>`;
    }
    if (schema.type === 'integer') {
      const value = Number.isInteger(want) ? want : schema.minimum >= 0 ? schema.minimum : '';
      return html`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${name}" type="number" step="1" min="${schema.minimum}" max="${schema.maximum}" value="${value}" required></div>`;
    }
    return html`<div class="field"><label for="${id}">${label}</label><input id="${id}" name="${name}" type="text" maxlength="${schema.maxLength ?? 200}" autocomplete="off" required></div>`;
  }

  function toolForm(s, tool, defaults) {
    const fields = Object.entries(SCHEMAS[tool].properties).map(([k, sch]) => (sch.type === 'object'
      ? html`<fieldset><legend>${k}: ${sch.description ?? ''}</legend>${Object.entries(sch.properties).map(([sub, ss]) => field(tool, `${k}.${sub}`, ss, defaults))}</fieldset>`
      : field(tool, k, sch, defaults)));
    return html`<form class="tool" method="post" action="${playPath(s)}/${tool}" aria-labelledby="h-${tool}" aria-describedby="d-${tool}" novalidate>
<h3 id="h-${tool}">${tool}</h3>
<p id="d-${tool}">${TOOL_INFO[tool]}</p>
${fields}<button type="submit">Run ${tool}</button>
</form>
`;
  }

  function playPage(s) {
    const t = now();
    const snap = snapshot(s);
    const defaults = defaultsFor(snap);
    // Never refresh while idle, when forms are being filled (a reload would wipe them and an agent's page refs go
    // stale); while the bot joins or a skill runs, slowly enough that an agent can still press Stop.
    const refresh = !s.refresh ? 0 : s.status !== 'ready' ? 5 : s.running ? 15 : 0;
    let status;
    if (s.status !== 'ready') status = 'The bot is joining the world. Press "Check again" in a few seconds.';
    else if (s.running) status = `Running: ${s.running.tool} ${fmtArgs(s.running.args)} (${duration(t - s.running.started)} so far). Press "Check again" to see when it ends, or press Stop.`;
    else status = 'Ready for the next action.';
    const last = s.last
      ? `${s.last.tool} ${fmtArgs(s.last.args)} -> ${s.last.ok ? 'ok' : 'not done'}: ${s.last.result}${fmtDelta(s.last.delta) ? ` Inventory change: ${fmtDelta(s.last.delta)}.` : ''}`
      : 'No action yet.';
    const lines = s.lines.slice(-LINES_SHOWN).reverse();
    return shell({
      title: `Your bot (${s.id}) - Muse plays Minecraft`,
      refresh,
      index: false,
      main: html`<header><h1>Your Minecraft bot</h1>
<p class="muted">Session ${s.id}. Lease: ${duration(s.expiresAt - t)} left (ends ${clock(s.expiresAt)}), then the bot leaves.
${!s.refresh ? html`Auto-refresh is off. <a href="${playPath(s)}?refresh=1">Turn it on</a>` : html`${refresh ? `This page refreshes every ${refresh} s while the bot is busy, never while it waits for you.` : 'This page refreshes by itself only while the bot is busy.'} <a href="${playPath(s)}?refresh=0">Turn auto-refresh off</a>`}</p></header>
<main>
<section aria-labelledby="h-status"><h2 id="h-status">Status</h2>
<p role="status">${status}</p>
<p><a href="${playPath(s)}">Check again</a></p>
${s.notice ? html`<p class="notice" role="alert">${s.notice}</p>` : ''}<h3 id="h-last">Last result</h3>
<p>${last}</p>
<div class="row"><form method="post" action="${playPath(s)}/stop" aria-label="Stop" novalidate><button class="stop" type="submit">Stop the current action</button></form></div></section>
<p>Live 3D views for people (an agent needs only this page): <a href="/eyes/${s.viewId}/">through the bot's eyes</a>, <a href="/watch/${s.viewId}/">from behind</a>.</p>
<section aria-labelledby="h-state"><h2 id="h-state">Game state</h2>
<pre>${stateText(s)}</pre></section>
<section aria-labelledby="h-actions"><h2 id="h-actions">Actions</h2>
<p class="muted">Each button runs one skill. One action at a time; long ones (mining, smelting, building) take seconds to minutes.</p>
<div class="tools">
${TOOL_NAMES.map((tool) => toolForm(s, tool, defaults))}</div></section>
<section aria-labelledby="h-log"><h2 id="h-log">Recent actions (newest first)</h2>
${lines.length ? html`<ol class="log">${lines.map((l) => html`<li>${clock(l.at).slice(0, 8)} ${l.text}</li>`)}</ol>` : html`<p>Nothing yet.</p>`}</section>
<section aria-labelledby="h-end"><h2 id="h-end">Done?</h2>
<form method="post" action="${playPath(s)}/end" aria-label="End session" novalidate><button type="submit">End my session</button></form>
<p class="muted">Frees the bot for the next guest.</p></section>
</main>`,
    });
  }

  /** The Ask queue; the text of a request only to the address that sent it (one visitor's words are not a public page). */
  function askPage(queuedId, viewer) {
    const mine = Number.isInteger(queuedId) ? ask.queue.findIndex((q) => q.id === queuedId) : -1;
    const row = (q) => html`<li>#${q.id} ${q.client === viewer ? q.text : "(another visitor's request)"}${q.status === 'waiting' ? '' : html` - ${q.status}${q.reason ? `: ${q.reason}` : ''}${Number.isFinite(q.steps) ? `, ${q.steps} steps` : ''}`}</li>`;
    return shell({
      title: 'Ask queue - Muse plays Minecraft',
      refresh: 10,
      main: html`<main><h1>Ask our Muse: the queue</h1>
${Number.isInteger(queuedId) ? html`<p role="status">${mine >= 0 ? `Queued as #${queuedId}, position ${mine + 1}.` : ask.running?.id === queuedId ? `#${queuedId} is running now.` : `#${queuedId} is no longer waiting.`}</p>` : ''}
<section aria-labelledby="h-now"><h2 id="h-now">Running now</h2>${ask.running ? html`<ol>${row(ask.running)}</ol>` : html`<p>Nothing.</p>`}</section>
<section aria-labelledby="h-wait"><h2 id="h-wait">Waiting (${ask.queue.length})</h2>${ask.queue.length ? html`<ol>${ask.queue.map(row)}</ol>` : html`<p>Nobody.</p>`}</section>
<section aria-labelledby="h-done"><h2 id="h-done">Finished</h2>${ask.done.length ? html`<ol>${ask.done.map(row)}</ol>` : html`<p>Nothing yet.</p>`}</section>
<p><a href="/#h-ask">Ask something</a></p></main>`,
    });
  }

  // ----- routes

  function sessionJson(s, req) {
    const b = base(req);
    return {
      token: s.token, session: s.id, status: s.status, expiresAt: new Date(s.expiresAt).toISOString(),
      leaseSeconds: Math.round(web.leaseMs / 1000), playUrl: `${b}${playPath(s)}`, apiUrl: `${b}/api/${s.token}`,
    };
  }

  function stateJson(s) {
    const t = now();
    return {
      session: { id: s.id, status: s.status, expiresAt: new Date(s.expiresAt).toISOString(), secondsLeft: Math.max(0, Math.round((s.expiresAt - t) / 1000)) },
      state: stateText(s),
      snapshot: snapshot(s),
      running: s.running ? { tool: s.running.tool, args: s.running.args, seconds: Math.round((t - s.running.started) / 1000) } : null,
      last: s.last ? { tool: s.last.tool, args: s.last.args, ok: s.last.ok, result: s.last.result, delta: s.last.delta } : null,
      notice: s.notice,
      log: s.lines.slice(-LINES_SHOWN).map((l) => `${clock(l.at).slice(0, 8)} ${l.text}`),
    };
  }

  /** Drop the queue places whose callers have not asked again for QUEUE_HOLD_MS. */
  function pruneQueue() {
    const t = now();
    for (let i = waiting.length - 1; i >= 0; i--) if (t - waiting[i].seen > QUEUE_HOLD_MS) waiting.splice(i, 1);
  }

  /**
   * Every bot is in use for this caller (the free ones, if any, are promised to callers ahead in the queue): keep or
   * give it a place and refuse with the place and an estimate. The estimate is when enough leases end; games often end
   * sooner (end_game, 5 idle minutes).
   */
  function queued(key, mcp, free) {
    const t = now();
    let at = waiting.findIndex((w) => w.key === key);
    if (at < 0) { waiting.push({ key, since: t, seen: t }); at = waiting.length - 1; } else waiting[at].seen = t;
    const place = at + 1;
    const ends = [...sessions.values()].map((x) => x.expiresAt).sort((a, b) => a - b);
    const k = Math.max(1, place - free); // the leases that must end before this caller's turn
    const etaMs = ends.length ? Math.max(0, ends[(k - 1) % ends.length] + web.leaseMs * Math.floor((k - 1) / ends.length) - t) : 0;
    const again = mcp ? 'call start_game again' : 'ask again (press Start, or POST /api/session)';
    const hold = Math.round(QUEUE_HOLD_MS / 1000);
    throw new HttpError(
      503,
      `all ${web.maxSessions} bots are in use; you are number ${place} in the queue (${waiting.length} waiting), and your turn comes in about ${duration(etaMs)} at the latest, when enough leases end (games often end sooner); ${again} within ${hold} s to keep your place`,
      { 'retry-after': String(Math.max(1, Math.min(Math.ceil(etaMs / 1000), Math.floor(hold / 3)))) },
      { queue: { position: place, waiting: waiting.length, etaSeconds: Math.round(etaMs / 1000), holdSeconds: hold } },
    );
  }

  /**
   * Ask for a session: 18+ confirmed, no live session and no cooldown for this address, a free slot (callers who
   * waited in the queue go first), the hourly per-address limit. Returns the session or throws.
   * MCP games (mcp = {key, address}) are one per MCP session (key): every connector user arrives from the agent's own
   * cloud, so one address can stand for many people. Per address they get a looser cap (mcpGamesPerAddress live
   * games, mcpStartsPerHour starts), so one caller cannot take every bot.
   */
  function newSession(req, adult, mcp = null) {
    if (closing) throw new HttpError(503, 'the server is shutting down');
    if (!adult) throw new HttpError(400, 'please confirm that you are 18 or older');
    sweep();
    const address = mcp ? mcp.address : clientKey(req);
    const key = mcp ? mcp.key : address;
    const retry = (ms) => ({ 'retry-after': String(Math.max(1, Math.ceil(ms / 1000))) });
    const soonestOf = (list) => Math.min(...list.map((x) => x.expiresAt)) - now();
    const mine = [...sessions.values()].filter((x) => x.client === key);
    if (mine.length >= sessionsPerAddress) {
      throw new HttpError(429, `${mcp ? 'this connection' : 'your address'} already has a bot (one at a time); end that session or wait about ${duration(soonestOf(mine))}`, retry(soonestOf(mine)));
    }
    if (mcp) {
      const fromAddress = [...sessions.values()].filter((x) => x.address === address && x.client.startsWith('mcp:'));
      if (fromAddress.length >= mcpGamesPerAddress) {
        throw new HttpError(429, `your connector's address already plays ${mcpGamesPerAddress} game${mcpGamesPerAddress === 1 ? '' : 's'}, the most one address may hold; the next one frees up in about ${duration(soonestOf(fromAddress))}`, retry(soonestOf(fromAddress)));
      }
    }
    const cool = (cooldowns.get(key) ?? 0) - now();
    if (cool > 0) throw new HttpError(429, `your last session just ended; the next guest goes first, try again in about ${duration(cool)}`, retry(cool));
    const free = Math.max(0, web.maxSessions - sessions.size);
    const at = waiting.findIndex((w) => w.key === key);
    if ((at < 0 ? waiting.length : at) >= free) queued(key, mcp, free);
    const limit = mcp ? mcpStartLimiter.take(address) : sessionLimiter.take(key);
    if (!limit.ok) throw new HttpError(429, `too many sessions from your ${mcp ? "connector's " : ''}address; try again in ${duration(limit.retryMs)}`, retry(limit.retryMs));
    if (at >= 0) waiting.splice(at, 1);
    return startSession(key, address);
  }

  async function handleAsk(req, res) {
    const { kind, fields } = await readFields(req, web.maxBodyBytes);
    const asJson = kind === 'json' || /application\/json/.test(String(req.headers.accept ?? ''));
    const fail = (status, error, headers) => (asJson ? sendJson(res, status, { error }, headers) : sendHtml(res, status, errorPage(status, error), headers));
    const adult = fields.adult === true || fields.adult === 'yes' || fields.adult === 'on';
    if (!adult) return fail(400, 'please confirm that you are 18 or older');
    if (typeof fields.text !== 'string') return fail(400, 'type an instruction');
    if (fields.text.length > web.askMaxChars * 4) return fail(413, `the instruction is longer than ${web.askMaxChars} characters`);
    const text = cleanText(fields.text);
    if (!text) return fail(400, 'type an instruction');
    if (text.length > web.askMaxChars) return fail(413, `the instruction is longer than ${web.askMaxChars} characters`);
    const closed = closing ? 'the server is shutting down' : askClosedReason();
    if (closed) return fail(503, closed);
    const key = clientKey(req);
    if (ask.running?.client === key || ask.queue.some((q) => q.client === key)) {
      return fail(429, 'your earlier request is still waiting or running; one at a time per address');
    }
    const limit = askLimiter.take(key);
    if (!limit.ok) return fail(429, `you have used your ${web.askPerHour} requests for this hour; try again in ${duration(limit.retryMs)}`, { 'retry-after': String(Math.ceil(limit.retryMs / 1000)) });
    const item = { id: ask.nextId++, text, status: 'waiting', queued: now() };
    Object.defineProperty(item, 'client', { value: key, enumerable: false }); // never shown or logged
    ask.queue.push(item);
    log.event('ask_queued', { ask: item.id, text });
    kick();
    if (asJson) return sendJson(res, 202, { id: item.id, position: ask.queue.indexOf(item) + 1, status: `${base(req)}/ask?queued=${item.id}` });
    return redirect(res, `/ask?queued=${item.id}`);
  }

  function isAdmin(req, fields) {
    if (!adminToken) return false;
    const header = String(req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i)?.[1];
    const given = header ?? (typeof fields?.token === 'string' ? fields.token : '');
    const a = crypto.createHash('sha256').update(String(given)).digest();
    const b = crypto.createHash('sha256').update(adminToken).digest();
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * The operator's routes: 404 without WEB_ADMIN_TOKEN, 401 for a wrong token (5 a hour lock the address out), else
   * nothing. fields: a parsed body that may carry the token (the kill switch's form); otherwise the Bearer header only.
   */
  function adminGate(req) {
    if (!adminToken) throw new HttpError(404, 'not found');
    const locked = adminFails.blocked(clientKey(req));
    if (!locked.ok) throw new HttpError(429, `too many wrong admin tokens from your address; try again in ${duration(locked.retryMs)}`, { 'retry-after': String(Math.ceil(locked.retryMs / 1000)) });
  }
  function requireAdmin(req, fields = null) {
    adminGate(req);
    if (!isAdmin(req, fields)) {
      adminFails.take(clientKey(req));
      throw new HttpError(401, 'wrong or missing admin token', { 'www-authenticate': 'Bearer' });
    }
  }

  async function adminStop(req, res) {
    adminGate(req); // 404 and the lock-out before the body is read
    const { fields } = await readFields(req, web.maxBodyBytes);
    requireAdmin(req, fields);
    const cleared = ask.queue.splice(0);
    for (const item of cleared) Object.assign(item, { status: 'cancelled', reason: 'operator stop' });
    ask.done.unshift(...cleared);
    ask.done.length = Math.min(ask.done.length, 10);
    ask.controller?.abort();
    if (ask.running && ask.house) {
      const h = await within(ask.house.catch(() => null), 1_000);
      if (h && h !== TIMEOUT) { try { h.brain.stop?.('operator stop'); } catch { /* ignore */ } }
    }
    let stopped = 0;
    const live = [...sessions.values()];
    for (const s of live) if (s.running) { stopped += 1; await stopSession(s, 'operator stop'); }
    const end = fields.end === true || fields.end === '1' || fields.end === 'yes';
    if (end) for (const s of live) endSession(s, 'ended by the operator');
    log.event('admin_stop', { stopped, cleared: cleared.length, ended: end ? live.length : 0 });
    return sendJson(res, 200, { stopped, cleared: cleared.length, ended: end ? live.length : 0 });
  }

  /** The live session whose 3D views listen under this view id (128 random bits; not the game id, not the token). */
  const sessionByView = (viewId) => { for (const s of sessions.values()) if (s.viewId === viewId && !s.ended) return s; return null; };
  const portOf = (s, kind) => (s ? (kind === 'eyes' ? s.body?.eyesPort : s.body?.viewerPort) ?? null : null);

  /**
   * A live-view request: the session and its view's local port, or why not ({status, message}). The view of a live
   * game is always served (its 128-bit id was handed out, not guessed). An address that asked for
   * VIEW_MISSES_PER_HOUR different ids that do not exist gets 429 for unknown ids until the hour rolls on (no guessing
   * ids); the same unknown id again (a tab still reconnecting to a view from before the agent restarted) counts once,
   * and a view of a game that ended answers 410 and is not counted.
   */
  function findView(req, viewId, kind) {
    const s = sessionByView(viewId);
    const port = portOf(s, kind);
    if (port) return { s, port };
    if (s) return { status: 404, message: 'no live view yet: the bot is still joining' };
    if (endedViews.has(viewId)) return { status: 410, message: 'this game has ended, and its live view with it' };
    const addr = clientKey(req);
    const k = `${addr} ${viewId}`;
    if (!missedViews.has(k)) {
      const blocked = viewMisses.blocked(addr);
      if (!blocked.ok) return { status: 429, message: `too many requests for live views that do not exist from your address; try again in ${duration(blocked.retryMs)}` };
      viewMisses.take(addr);
      missedViews.set(k, now());
      while (missedViews.size > MISSED_KEPT) missedViews.delete(missedViews.keys().next().value);
    }
    return { status: 404, message: 'no live view here' };
  }

  /**
   * The live-view overlay's events (server-sent): the block the bot is breaking, {x, y, z, ms, elapsed}, or null when
   * it stops; one now, then each change, until the watcher leaves or the session ends. Counts as a live-view request.
   */
  function fxEvents(req, res, s) {
    const why = viewRefusal(req, 'http');
    if (why) { send(res, 429, why, {}); return; }
    const release = holdView([`http@${clientKey(req)}`]);
    // any origin may read it (the streamer's page comes from the viewer's own port): where a public game digs
    res.writeHead(200, {
      ...BASE_HEADERS, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no',
      'access-control-allow-origin': '*',
    });
    const sendDig = (d) => {
      const msg = d && Number.isFinite(d.x) ? { x: d.x, y: d.y, z: d.z, ms: Number(d.ms) || 0, elapsed: Number(d.elapsed) || 0 } : null;
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    };
    let off = null;
    const ping = setInterval(() => res.write(': ping\n\n'), FX_PING_MS);
    const end = () => res.end(); // the session ended: so does the stream
    s.offs.push(end);
    res.on('close', () => {
      clearInterval(ping);
      try { off?.(); } catch { /* gone */ }
      off = null;
      const i = s.offs.indexOf(end);
      if (i >= 0) s.offs.splice(i, 1);
      release();
    });
    try { sendDig(s.body?.digging?.() ?? null); } catch { sendDig(null); }
    try { off = s.body?.on?.('dig', (d) => sendDig(d ? { ...d, elapsed: 0 } : null)) ?? null; } catch { off = null; }
  }

  /** Count one open live-view connection under each key; returns its release (safe to call twice). */
  function holdView(keys) {
    for (const k of keys) viewConns.set(k, (viewConns.get(k) ?? 0) + 1);
    let held = true;
    return () => {
      if (!held) return;
      held = false;
      for (const k of keys) { const n = (viewConns.get(k) ?? 1) - 1; if (n > 0) viewConns.set(k, n); else viewConns.delete(k); }
    };
  }

  /** Why a live-view request is refused (too many open or new connections), or null. */
  function viewRefusal(req, kind, id) {
    const addr = clientKey(req);
    if (kind === 'ws' && (viewConns.get(`ws@${addr}`) ?? 0) >= VIEW_WS_PER_ADDRESS) return 'too many live views open from your address';
    if (kind === 'ws' && (viewConns.get(`ws#${id}`) ?? 0) >= VIEW_WS_PER_SESSION) return 'too many people watching this bot right now';
    if (kind === 'http' && (viewConns.get(`http@${addr}`) ?? 0) >= VIEW_HTTP_PER_ADDRESS) return 'too many live-view requests from your address at once';
    if (opensView(String(req.url)) && !viewLimiter.take(addr).ok) return 'too many live views opened from your address this hour';
    return null;
  }

  function proxyHttp(req, res, port) {
    const why = viewRefusal(req, 'http');
    if (why) { req.resume(); send(res, 429, why, {}); return; }
    const release = holdView([`http@${clientKey(req)}`]);
    res.on('close', release);
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    delete headers[PROXY_HEADER]; // the proxy's secret stays here
    const up = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers }, (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    });
    up.setTimeout(VIEW_IDLE_MS, () => up.destroy(new Error('the live view did not answer')));
    up.on('error', () => { if (!res.headersSent) send(res, 502, 'live view unavailable', {}); else res.destroy(); });
    res.on('close', () => up.destroy());
    req.pipe(up);
  }

  /** WebSocket upgrades for the live view (socket.io under /watch/<id>/socket.io), within the live-view limits. */
  function proxyUpgrade(req, socket, head) {
    socket.on('error', () => {});
    const refuse = (status, why) => socket.end(`HTTP/1.1 ${status} ${http.STATUS_CODES[status]}\r\ncontent-type: text/plain\r\nconnection: close\r\ncontent-length: ${Buffer.byteLength(why)}\r\n\r\n${why}`);
    if (refusedPeer(req)) { refuse(403, 'connect through the site'); return; }
    const m = String(req.url).match(/^\/(watch|eyes)\/([A-Za-z0-9_-]+)\//);
    if (!m) { socket.destroy(); return; }
    const found = findView(req, m[2], m[1]);
    if (!found.port) { refuse(found.status, found.message); return; }
    const { s: game, port } = found;
    const why = viewRefusal(req, 'ws', game.id);
    if (why) { refuse(429, why); return; }
    const release = holdView([`ws@${clientKey(req)}`, `ws#${game.id}`]);
    socket.gameId = game.id; // the MCP reaper keeps a watched game alive (watching(id))
    viewSockets.add(socket);
    // why this live view closed, logged once (view_close): the watcher left, a limit dropped it, or the view went away
    const opened = now();
    let sent = 0;
    let closedBy = null;
    const because = (reason) => { closedBy ??= reason; };
    socket.setTimeout(VIEW_IDLE_MS, () => { because('idle'); socket.destroy(); });
    const up = net.connect(port, '127.0.0.1', () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (String(req.rawHeaders[i]).toLowerCase() !== PROXY_HEADER) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      }
      up.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (head?.length) up.write(head);
      socket.pipe(up);
      // to the watcher: never buffer more than VIEW_BUFFER_MAX for a reader that does not keep up
      up.on('data', (chunk) => {
        if (socket.writableLength > VIEW_BUFFER_MAX) { because('slow reader'); socket.destroy(); up.destroy(); return; }
        sent += chunk.length;
        socket.write(chunk);
      });
      up.on('end', () => { because('the view closed (the session ended)'); socket.end(); });
    });
    up.on('error', () => { because('the view is not there'); socket.destroy(); });
    up.on('close', () => { because('the view closed (the session ended)'); socket.destroy(); release(); });
    socket.on('error', () => { because('watcher connection error'); up.destroy(); });
    socket.on('end', () => { because('the watcher left'); socket.destroy(); }); // a watcher that hangs up is gone (the upgraded socket allows half-open)
    socket.on('close', () => {
      up.destroy();
      release();
      viewSockets.delete(socket);
      log.event('view_close', { session: game.id, view: m[1], why: closing ? 'the server stopped' : closedBy ?? 'the watcher left', s: Math.round((now() - opened) / 1000), mb: Math.round(sent / 1e5) / 10 });
    });
  }

  let mcp = null; // built on first use: the hooks below are defined later in this closure
  async function route(req, res) {
    const u = new URL(req.url, 'http://local');
    const p = u.pathname;
    if (p === '/mcp') {
      mcp ??= createMcp({
        newSession, lookup, startAction, stateText, stopSession, endSession, within, TIMEOUT, log, now, clientKey, base,
        leaseMs: web.leaseMs, initLimiter: mcpInitLimiter, limits: opts.mcpLimits, callMs: opts.mcpCallMs, skills: opts.skills,
        links: (s, b) => ({ eyes: `${b}/eyes/${s.viewId}/`, watch: `${b}/watch/${s.viewId}/` }),
        liveVideo: (s) => { try { return opts.liveVideo?.(s.id) ?? null; } catch { return null; } },
        liveView: opts.liveView ? (s, o) => Promise.resolve(opts.liveView(s.id, o)).catch(() => null) : null,
        leaveQueue: (key) => { const i = waiting.findIndex((w) => w.key === key); if (i >= 0) waiting.splice(i, 1); },
        watching: (id) => { let n = 0; for (const k of viewSockets) if (k.gameId === id && !k.destroyed) n += 1; return n; },
      });
      return mcp(req, res);
    }
    const method = req.method === 'HEAD' ? 'GET' : req.method;
    const only = (m) => { if (method !== m) throw new HttpError(405, `use ${m}`, { allow: m === 'GET' ? 'GET, HEAD' : m }); };
    if (method !== 'GET' && fromOtherSite(req)) {
      req.resume();
      throw new HttpError(403, 'requests from other websites are not accepted; use the forms on this site');
    }

    if (p === '/') { only('GET'); return sendHtml(res, 200, landingPage(req)); }
    if (p === '/favicon.ico') return send(res, 204, '', {});
    if (p === '/openapi.json') { only('GET'); return sendJson(res, 200, openApiSpec(base(req), { leaseMs: web.leaseMs }), { 'access-control-allow-origin': '*' }); }
    if (p === '/log') {
      // the decision log is the operator's (who played what, the say text): admin token only
      only('GET');
      requireAdmin(req);
      const n = Math.min(200, Math.max(1, Number.parseInt(u.searchParams.get('n') ?? '50', 10) || 50));
      const secrets = [adminToken, ...sessions.keys()];
      const body = log.tail(n).map((row) => scrub(jsonText(row), secrets)).join('\n');
      return send(res, 200, body ? `${body}\n` : '', { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store', ...PRIVATE });
    }
    if (p === '/session') {
      only('POST');
      const { fields } = await readFields(req, web.maxBodyBytes);
      const s = newSession(req, fields.adult === 'yes' || fields.adult === 'on' || fields.adult === true);
      return redirect(res, playPath(s));
    }
    if (p === '/ask') {
      if (method === 'POST') return handleAsk(req, res);
      only('GET');
      const q = Number.parseInt(u.searchParams.get('queued') ?? '', 10);
      return sendHtml(res, 200, askPage(Number.isInteger(q) ? q : null, clientKey(req)));
    }
    if (p === '/admin/stop') { only('POST'); return adminStop(req, res); }

    const w = p.match(/^\/(watch|eyes)\/([A-Za-z0-9_-]+)(\/.*)?$/);
    if (w) {
      const found = findView(req, w[2], w[1]);
      if (!found.port) { req.resume(); throw new HttpError(found.status, found.message); }
      const { s: game, port } = found;
      if (!w[3]) return redirect(res, `/${w[1]}/${w[2]}/`);
      // the viewer's page with the crack overlay and eased turns (src/live-view-fx.js); everything else is the viewer's
      const fx = method === 'GET' ? viewFx(cfg.mc?.version) : null;
      if (fx && (w[3] === '/' || w[3] === '/index.html')) return send(res, 200, fx.page, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      if (fx && w[3] === '/muse-fx.js') return send(res, 200, fx.script, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
      if (w[3] === '/muse-fx/events') { only('GET'); return fxEvents(req, res, game); }
      return proxyHttp(req, res, port);
    }

    let m = p.match(/^\/play\/([^/]+)\/?$/);
    if (m) {
      only('GET');
      const s = lookup(m[1]);
      const r = u.searchParams.get('refresh');
      if (r === '0' || r === '1') s.refresh = r === '1';
      return sendHtml(res, 200, playPage(s), PRIVATE);
    }
    m = p.match(/^\/play\/([^/]+)\/([a-z_]{1,24})$/);
    if (m) {
      only('POST');
      const s = lookup(m[1]);
      const action = m[2];
      if (action === 'stop') {
        await readFields(req, web.maxBodyBytes);
        const was = await stopSession(s, 'the guest pressed stop');
        s.notice = was ? 'Stopped.' : 'Nothing was running.';
        return redirect(res, playPath(s));
      }
      if (action === 'end') {
        await readFields(req, web.maxBodyBytes);
        endSession(s, 'ended by the guest');
        return redirect(res, playPath(s));
      }
      if (!TOOL_NAMES.includes(action)) throw new HttpError(404, `there is no action "${action}"`);
      const { fields } = await readFields(req, web.maxBodyBytes);
      const check = coerceArgs(action, fields);
      if (!check.ok) { s.notice = `Not run: ${check.error}`; return redirect(res, playPath(s)); }
      if (action === 'get_state') { s.notice = 'State read.'; return redirect(res, playPath(s)); }
      const started = startAction(s, action, check.args);
      if (!started.ok) { s.notice = `Not run: ${started.error}`; return redirect(res, playPath(s)); }
      await within(started.promise, formWaitMs);
      return redirect(res, playPath(s));
    }

    if (p === '/api/session') {
      only('POST');
      const { fields } = await readFields(req, web.maxBodyBytes);
      const s = newSession(req, fields.adult === true || fields.adult === 'yes');
      return sendJson(res, 201, sessionJson(s, req), PRIVATE);
    }
    m = p.match(/^\/api\/([^/]+)\/?$/);
    if (m) {
      only('DELETE');
      endSession(lookup(m[1]), 'ended by the guest');
      return sendJson(res, 200, { ended: true });
    }
    m = p.match(/^\/api\/([^/]+)\/([a-z_]{1,24})$/);
    if (m) {
      const s = lookup(m[1]);
      const action = m[2];
      if (action === 'state') { only('GET'); return sendJson(res, 200, stateJson(s), PRIVATE); }
      only('POST');
      if (action === 'stop') {
        await readFields(req, web.maxBodyBytes);
        return sendJson(res, 200, { stopped: await stopSession(s, 'stopped through the API') });
      }
      if (!TOOL_NAMES.includes(action)) throw new HttpError(404, `there is no action "${action}"`);
      const { kind, fields } = await readFields(req, web.maxBodyBytes);
      const check = kind === 'json' ? validateArgs(action, fields) : coerceArgs(action, fields);
      if (!check.ok) return sendJson(res, 400, { error: check.error });
      if (action === 'get_state') {
        const text = stateText(s);
        return sendJson(res, 200, { ok: s.status === 'ready', result: text, tool: action, args: {}, delta: {}, ms: 0, state: text }, PRIVATE);
      }
      const started = startAction(s, action, check.args);
      if (!started.ok) return sendJson(res, started.status, { error: started.error });
      const r = await within(started.promise, apiWaitMs);
      if (r === TIMEOUT) {
        return sendJson(res, 202, { running: true, tool: action, message: `still running; read GET /api/{token}/state for the result` }, PRIVATE);
      }
      return sendJson(res, 200, { ...r, tool: action, args: check.args, state: stateText(s) }, PRIVATE);
    }
    throw new HttpError(404, 'not found');
  }

  async function handle(req, res) {
    try {
      if (refusedPeer(req)) { req.resume(); throw new HttpError(403, 'this port takes requests only through the site\'s proxy'); }
      await route(req, res);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof HttpError ? e.message : 'something went wrong on our side';
      if (status === 500) log.event('web_error', { message: String(e?.message ?? e).slice(0, 300) });
      if (res.headersSent) { res.destroy(); return; }
      const headers = { ...(e.headers ?? {}), ...(status === 413 ? { connection: 'close' } : {}) };
      const p = String(req.url ?? '');
      const asJson = p.startsWith('/api/') || p.startsWith('/admin/') || p.startsWith('/log') || p.startsWith('/openapi') || /application\/json/.test(String(req.headers.accept ?? ''));
      if (asJson) sendJson(res, status, { error: message, ...(e.extra ?? {}) }, headers);
      else sendHtml(res, status, errorPage(status, message, e.reason), headers);
    }
  }

  return {
    async start() {
      if (server) return { url, publicUrl: web.publicUrl || url };
      closing = false;
      server = http.createServer({ maxHeaderSize: 16_384, requestTimeout: 30_000, headersTimeout: 10_000 }, handle);
      server.on('upgrade', proxyUpgrade);
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(web.port, web.host, () => { server.off('error', reject); resolve(); });
      });
      const { port } = server.address();
      url = `http://${web.host.includes(':') ? `[${web.host}]` : web.host}:${port}`;
      sweeper = setInterval(sweep, Math.max(1_000, Math.min(5_000, Math.floor(web.leaseMs / 4))));
      sweeper.unref();
      log.event('web_start', { url, publicUrl: web.publicUrl || null, maxSessions: web.maxSessions, leaseMs: web.leaseMs, trustedProxies: proxyList.length, proxySecret: proxySecret.length > 0 });
      return { url, publicUrl: web.publicUrl || url };
    },

    async stop() {
      closing = true;
      clearInterval(sweeper);
      sweeper = null;
      for (const item of ask.queue.splice(0)) Object.assign(item, { status: 'cancelled', reason: 'server stopped' });
      ask.controller?.abort();
      const h = ask.house ? await within(ask.house.catch(() => null), 2_000) : null;
      if (h && h !== TIMEOUT) {
        try { h.brain.stop?.('server stopped'); } catch { /* ignore */ }
        await within(Promise.resolve().then(() => h.body.close?.()).catch(() => {}), 5_000);
      }
      ask.house = null;
      const closes = [...sessions.values()].map((s) => endSession(s, 'the server stopped'));
      await within(Promise.allSettled(closes), 5_000);
      for (const socket of viewSockets) socket.destroy();
      if (server) {
        const srv = server;
        server = null;
        await new Promise((resolve) => { srv.close(() => resolve()); srv.closeIdleConnections?.(); setTimeout(() => srv.closeAllConnections?.(), 1_000).unref(); });
        log.event('web_stop', {});
      }
    },

    /** End every session whose lease is over (also runs on a timer and on each lookup). */
    sweep,
  };
}
