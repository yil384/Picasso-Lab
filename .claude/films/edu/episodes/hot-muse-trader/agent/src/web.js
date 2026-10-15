// src/web.js - the HTTP server: the public page (/), the trading floor's images (/floor/<name>.svg, ?w=n for the
// narrow ones), the live view page (/live), the order log (/orders.csv, /orders.json), the daily summaries and the
// equity record as JSON, the logo, /healthz, and the MCP endpoint (/mcp). Behind the edge proxy (WEB_TRUST_PROXY=1)
// the client's address is the last X-Forwarded-For entry, believed only on requests that carry the proxy's secret
// (WEB_PROXY_SECRET in the X-Muse-Proxy header) when one is set.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createMcp } from './mcp.js';
import { orderRows, toCsv } from './journal.js';
import { liveViewHtml, publicPageHtml } from './page.js';
import { seriesOf } from './floor.js';
import { ROOT } from './config.js';

const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";
const PAGE_CSP = (base) => `default-src 'none'; img-src 'self' ${base} data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`;

export function createWeb({ cfg, trader, floor }) {
  const { web } = cfg;
  const secret = Buffer.from(web.proxySecret);
  const ownerDigest = cfg.ownerKey ? crypto.createHash('sha256').update(cfg.ownerKey).digest() : null;
  const logo = (() => { try { return fs.readFileSync(path.join(ROOT, 'assets', 'brand', 'picasso-lab-logo.png')); } catch { return null; } })();

  const fromProxy = (req) => {
    if (!web.trustProxy) return false;
    if (!secret.length) return true;
    const v = req.headers['x-muse-proxy'];
    if (typeof v !== 'string') return false;
    const got = Buffer.from(v);
    return got.length === secret.length && crypto.timingSafeEqual(got, secret);
  };
  const clientKey = (req) => {
    if (fromProxy(req)) {
      const list = String(req.headers['x-forwarded-for'] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
      if (list.length) return list.at(-1).slice(0, 64);
    }
    return String(req.socket?.remoteAddress ?? 'unknown').replace(/^::ffff:/, '');
  };
  const isLocal = (req) => /^(127\.|::1$|::ffff:127\.)/.test(String(req.socket?.remoteAddress ?? '')) && !req.headers['x-forwarded-for'] && !req.headers['x-muse-proxy'];
  const isOwner = (req) => {
    if (!ownerDigest) return false;
    let k = String(req.headers['x-muse-owner'] ?? '');
    if (!k) k = String(req.headers.authorization ?? '').match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
    if (!k) { try { const q = new URL(req.url, 'http://local').searchParams; k = q.get('key') ?? q.get('owner') ?? ''; } catch { k = ''; } }
    return Boolean(k) && crypto.timingSafeEqual(crypto.createHash('sha256').update(k).digest(), ownerDigest);
  };
  let listenBase = '';
  const base = () => (web.publicUrl ? `${web.publicUrl}/` : listenBase);

  const mcp = createMcp({ trader, base, clientKey, isOwner, isLocal, ownerKeySet: Boolean(ownerDigest), onChange: () => floor.forget() });

  const send = (res, status, type, body, extra = {}) => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extra });
    res.end(body);
  };
  const json = (res, obj, extra = {}) => send(res, 200, 'application/json; charset=utf-8', JSON.stringify(obj, null, 1), { 'access-control-allow-origin': '*', ...extra });

  const server = http.createServer(async (req, res) => {
    let u;
    try { u = new URL(req.url, 'http://local'); } catch { return send(res, 400, 'text/plain', 'bad request'); }
    const p = u.pathname;
    try {
      if (p === '/mcp') return await mcp(req, res);
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'method not allowed', { allow: 'GET, HEAD' });
      const m = /^\/floor\/([a-z]+)\.svg$/.exec(p);
      if (m) {
        const svg = await floor.svg(m[1], u.searchParams.get('w') === 'n');
        if (!svg) return send(res, 404, 'text/plain', 'no such image');
        return send(res, 200, 'image/svg+xml; charset=utf-8', svg, { 'content-security-policy': SVG_CSP, 'cross-origin-resource-policy': 'cross-origin' });
      }
      const b = base();
      switch (p) {
        case '/': {
          const st = trader.store;
          return send(res, 200, 'text/html; charset=utf-8', publicPageHtml({ base: b, rows: orderRows(st.journal), summaries: st.summaries, state: st.state, mock: trader.mock, sourceUrl: cfg.sourceUrl }), { 'content-security-policy': PAGE_CSP(b.replace(/\/$/, '')) });
        }
        case '/live':
          return send(res, 200, 'text/html; charset=utf-8', liveViewHtml(b, { mock: trader.mock }), { 'content-security-policy': PAGE_CSP(b.replace(/\/$/, '')) });
        case '/orders.json':
          return json(res, { paper_money: true, mock: trader.mock, orders: orderRows(trader.store.journal) });
        case '/orders.csv':
          return send(res, 200, 'text/csv; charset=utf-8', toCsv(orderRows(trader.store.journal)), { 'content-disposition': 'attachment; filename="muse-trader-orders.csv"', 'access-control-allow-origin': '*' });
        case '/summaries.json':
          return json(res, { paper_money: true, mock: trader.mock, start: trader.store.state.startedAt ? { at: trader.store.state.startedAt, equity: trader.store.state.startEquity, bench: trader.store.state.bench } : null, days: trader.store.summaries });
        case '/equity.json':
          return json(res, { paper_money: true, mock: trader.mock, points: trader.store.equity, returns: seriesOf(trader.store.equity, trader.store.state) });
        case '/assets/logo.png':
          return logo ? send(res, 200, 'image/png', logo, { 'cache-control': 'public, max-age=86400', 'cross-origin-resource-policy': 'cross-origin' }) : send(res, 404, 'text/plain', 'no logo');
        case '/healthz':
          return json(res, { ok: true, mock: trader.mock, sessions: mcp.count(), started: trader.store.state.startedAt ?? null });
        default:
          return send(res, 404, 'text/plain', 'not found');
      }
    } catch (e) {
      if (!res.headersSent) send(res, 500, 'text/plain', `error: ${String(e?.message ?? e).slice(0, 200)}`);
      else res.end();
    }
  });
  server.on('listening', () => {
    const a = server.address();
    listenBase = `http://${['0.0.0.0', '::'].includes(a.address) ? '127.0.0.1' : a.address}:${a.port}/`;
  });
  return server;
}
