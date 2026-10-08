// REST API (DESIGN.md section 5). JSON in and out, bodies <= 8 KB, CORS for allow-listed origins only (a request
// with a foreign Origin is refused with 403 and gets no CORS headers), preflight with
// Access-Control-Allow-Private-Network: true. Rate limits per ipKey (in memory): new accounts 30/h, email start 5/h,
// claims 10/h, link redeems 60/h, everything 600/min (and, when the service sends the email itself, per address and
// per day: accounts.js). Errors are { error, message } with a 4xx/5xx status. Never logs IPs or tokens.
//
// GET /v1/health answers 503 { error: "persist_failing" } while changes cannot be written to disk (store.health()),
// so `docker compose ps` and the watchdog see it, and counts every refusal per limit since the start (`limited`).
//
//   createHttpHandler({ config, accounts, rooms, limiter, ipKeyOf, startedAt, log, closeToken, store }) -> (req, res)

import { originAllowed } from './config.js';
import { ApiError } from './util.js';

const BODY_MAX = 8 * 1024;
const HOUR = 3600_000;

function send(res, status, body, extra = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extra,
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > BODY_MAX) return reject(new ApiError(413, 'too_large', 'Body over 8 KB'));
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (c) => {
      if (done) return;
      size += c.length;
      if (size > BODY_MAX) {
        done = true;
        reject(new ApiError(413, 'too_large', 'Body over 8 KB'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text.trim()) return resolve({});
      try {
        const v = JSON.parse(text);
        if (!v || typeof v !== 'object' || Array.isArray(v)) return reject(new ApiError(400, 'bad_json', 'Expected a JSON object'));
        resolve(v);
      } catch (_) {
        reject(new ApiError(400, 'bad_json', 'Invalid JSON'));
      }
    });
    req.on('error', () => { if (!done) { done = true; reject(new ApiError(400, 'bad_request', 'Request aborted')); } });
  });
}

function bearer(req) {
  const h = req.headers.authorization;
  if (typeof h !== 'string') return null;
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,100})\s*$/.exec(h);
  return m ? m[1] : null;
}

export function createHttpHandler({ config, accounts, rooms, limiter, ipKeyOf, startedAt = Date.now(), log = () => {}, closeToken = () => {}, store = null }) {
  const limit = (bucket, ipKey, n, windowMs) => {
    const r = limiter.hit(bucket, ipKey, n, windowMs);
    if (!r.ok) throw Object.assign(new ApiError(429, 'rate_limited', 'Too many requests, try again later'), { retryAfter: r.retryAfter });
  };
  const auth = (req, required = true) => {
    const token = bearer(req);
    const a = token ? accounts.authenticate(token) : null;
    if (!a && required) throw new ApiError(401, 'auth', 'Sign-in token missing or unknown');
    return { account: a, token };
  };

  const routes = {
    'POST /v1/session': async (req, ipKey) => {
      const body = await readBody(req);
      const { account } = auth(req, false);
      if (!account) limit('create', ipKey, 30, HOUR);
      return accounts.session({ account, clientId: body.clientId, name: body.name, fresh: body.fresh, ipKey });
    },
    'POST /v1/claim': async (req, ipKey) => {
      const body = await readBody(req);
      const { account } = auth(req);
      limit('claim', ipKey, 10, HOUR);
      return accounts.claim(account, body.sid, ipKey);
    },
    'GET /v1/me': async (req) => ({ account: accounts.view(auth(req).account) }),
    'POST /v1/name': async (req) => {
      const body = await readBody(req);
      return accounts.setName(auth(req).account, body.name);
    },
    'POST /v1/refill': async (req, ipKey) => {
      await readBody(req);
      return accounts.refill(auth(req).account, ipKey);
    },
    'GET /v1/leaderboard': async (req, ipKey, url) => {
      const { account } = auth(req, false);
      const lim = url.searchParams.has('limit') ? Number.parseInt(url.searchParams.get('limit'), 10) : 50;
      return accounts.leaderboard(url.searchParams.get('game') || 'holdem', Number.isInteger(lim) ? lim : 50, account);
    },
    'POST /v1/guandan/round': async (req) => {
      const body = await readBody(req);
      return accounts.guandanRound(auth(req).account, body);
    },
    'POST /v1/email/start': async (req, ipKey) => {
      const body = await readBody(req);
      const { account, token } = auth(req);
      if (!config.emailLink) throw new ApiError(403, 'disabled', 'Saving with email is not enabled');
      limit('email', ipKey, 5, HOUR);
      return accounts.emailStart(account, body.email, accounts.tokenHash(token), { lang: body.lang });
    },
    'POST /v1/email/complete': async (req) => {
      const body = await readBody(req);
      return accounts.emailComplete(body.lid, body.idToken, body.code ?? null);
    },
    // the emailed link's single-use token (EMAIL_SENDER=resend); the page that redeems it never gets an account token
    'POST /v1/email/redeem': async (req, ipKey) => {
      const body = await readBody(req);
      limit('redeem', ipKey, 60, HOUR);
      return accounts.emailRedeem(body.lid, body.t, body.code ?? null);
    },
    'POST /v1/email/poll': async (req) => {
      const body = await readBody(req);
      return accounts.emailPoll(body.lid, body.poll);
    },
    'POST /v1/signout': async (req) => {
      await readBody(req);
      const { token } = auth(req);
      const out = accounts.signout(token);
      closeToken(accounts.tokenHash(token));
      return out;
    },
    'GET /v1/health': async () => {
      const s = rooms.stats();
      const out = { ok: true, tables: s.tables, players: s.players, uptime: Math.round((Date.now() - startedAt) / 1000), limited: limiter.refusals() };
      const p = store ? store.health() : { ok: true };
      if (!p.ok) {
        // the service still plays, but nothing reaches the disk: a restart now would lose every change since
        log('health: changes not saved', { seconds: Math.round(p.unsavedMs / 1000) });
        throw Object.assign(new ApiError(503, 'persist_failing', 'Changes are not being saved'), { detail: { ...out, ok: false, persist: 'failing', unsavedFor: Math.round(p.unsavedMs / 1000) } });
      }
      return out;
    },
  };
  const paths = new Set(Object.keys(routes).map((k) => k.split(' ')[1]));

  return async function handler(req, res) {
    const started = Date.now();
    const origin = req.headers.origin;
    const cors = {};
    if (origin !== undefined) {
      if (!originAllowed(config, origin)) {
        req.resume();
        return send(res, 403, { error: 'origin', message: 'Origin not allowed' });
      }
      cors['access-control-allow-origin'] = origin;
      cors.vary = 'Origin';
    }
    let url;
    try {
      url = new URL(req.url, 'http://localhost');
    } catch (_) {
      req.resume();
      return send(res, 400, { error: 'bad_request', message: 'Bad URL' }, cors);
    }
    if (req.method === 'OPTIONS') {
      req.resume();
      res.writeHead(204, {
        ...cors,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type',
        'access-control-allow-private-network': 'true',
        'access-control-max-age': '600',
        'content-length': '0',
      });
      return res.end();
    }
    const route = routes[`${req.method} ${url.pathname}`];
    const ipKey = ipKeyOf(req);
    try {
      if (!route) {
        req.resume();
        if (paths.has(url.pathname)) throw new ApiError(405, 'method_not_allowed', 'Method not allowed');
        throw new ApiError(404, 'not_found', 'Not found');
      }
      limit('other', ipKey, 600, 60_000);
      const out = await route(req, ipKey, url);
      send(res, 200, out, cors);
    } catch (e) {
      if (e instanceof ApiError) {
        // limits kept elsewhere are counted too: refill_later, the per-address and daily email limits (e.bucket)
        if (e.status === 429 && (e.code !== 'rate_limited' || e.bucket)) limiter.note(e.bucket || e.code, ipKey);
        const extra = { ...cors };
        if (e.retryAfter) extra['retry-after'] = String(e.retryAfter);
        if (e.status === 413) extra.connection = 'close';
        send(res, e.status, { error: e.code, message: e.message, ...(e.detail || {}) }, extra);
        if (e.status === 413) req.resume();
      } else {
        log('http handler error', { path: url.pathname, error: e.message, ms: Date.now() - started });
        send(res, 500, { error: 'server_error', message: 'Something went wrong' }, cors);
      }
    }
  };
}
