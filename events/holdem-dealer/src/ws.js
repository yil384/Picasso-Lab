// The Hold'em socket at /v1/ws (DESIGN.md section 6), on the `ws` package.
// Upgrade: the path must be /v1/ws and the Origin allow-listed; at most 100 sockets per ipKey. Then: `hello` within
// 10 s, frames <= 4 KB (larger closes with 1009), <= 40 messages per second (more closes with 1008), every message
// validated (protocol.js); errors are { t:"error", code, re }. A dead connection is detected by ws pings every
// 30 s. A failed hello is answered with an error and the socket closes (the client reconnects with a fresh token).
// closeAll(1012) on a graceful shutdown. Nothing here logs tokens, IPs or cards.
//
//   attachWs(httpServer, { config, accounts, rooms, limiter, ipKeyOf, log, helloMs }) -> { wss, closeAll(code, reason), count() }

import { WebSocketServer } from 'ws';
import { originAllowed } from './config.js';
import { parseMessage } from './protocol.js';

const MAX_FRAME = 4096;
const MSGS_PER_SEC = 40;
const SOCKETS_PER_IP = 100;
const PING_MS = 30_000;

function reject(socket, status, text) {
  try {
    socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  } catch (_) { /* gone */ }
  socket.destroy();
}

export function attachWs(server, { config, accounts, rooms, limiter, ipKeyOf, log = () => {}, helloMs, now = Date.now }) {
  helloMs = helloMs || 10_000;
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME, perMessageDeflate: false, clientTracking: true });
  const perIp = new Map();
  let seq = 0;

  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try { pathname = new URL(req.url, 'http://x').pathname; } catch (_) { /* bad url */ }
    if (pathname !== '/v1/ws') return reject(socket, 404, 'Not Found');
    if (!originAllowed(config, req.headers.origin)) return reject(socket, 403, 'Forbidden');
    const ipKey = ipKeyOf(req);
    if (!limiter.hit('other', ipKey, 600, 60_000).ok) return reject(socket, 429, 'Too Many Requests');
    if ((perIp.get(ipKey) || 0) >= SOCKETS_PER_IP) return reject(socket, 429, 'Too Many Requests');
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, ipKey));
  });

  function onConnection(ws, ipKey) {
    perIp.set(ipKey, (perIp.get(ipKey) || 0) + 1);
    let alive = true;
    let windowStart = now();
    let windowCount = 0;
    const conn = {
      id: ++seq,
      accountId: null,
      tokenHash: null,
      watching: null,
      send(obj) {
        if (ws.readyState !== 1) return;
        ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
      },
      close(code, reason) {
        try { ws.close(code, reason); } catch (_) { /* closing */ }
      },
    };
    const helloTimer = setTimeout(() => { if (!conn.accountId) conn.close(1008, 'hello_timeout'); }, helloMs);

    ws.on('pong', () => { alive = true; });
    ws.on('message', (data, isBinary) => {
      alive = true;
      const t = now();
      if (t - windowStart >= 1000) { windowStart = t; windowCount = 0; }
      if (++windowCount > MSGS_PER_SEC) return conn.close(1008, 'rate_limited');
      if (isBinary) return conn.send({ t: 'error', code: 'bad_message', re: null });
      const parsed = parseMessage(data.toString('utf8'));
      if (parsed.error) return conn.send({ t: 'error', code: parsed.error, re: parsed.re });
      const msg = parsed.msg;
      if (msg.t === 'ping') return conn.send({ t: 'pong', serverTime: now() });
      if (msg.t === 'hello') {
        if (conn.accountId) return conn.send({ t: 'error', code: 'already_hello', re: 'hello' });
        const a = accounts.authenticate(msg.token);
        if (!a) {
          conn.send({ t: 'error', code: 'bad_token', re: 'hello' });
          return conn.close(1008, 'bad_token');
        }
        clearTimeout(helloTimer);
        conn.accountId = a.id;
        conn.tokenHash = accounts.tokenHash(msg.token);
        rooms.attach(conn);
        return conn.send({ t: 'welcome', account: accounts.view(a), serverTime: now(), features: { emailLink: config.emailLink } });
      }
      if (!conn.accountId) return conn.send({ t: 'error', code: 'no_hello', re: msg.t });
      try {
        rooms.handle(conn, msg);
      } catch (e) {
        log('ws handler error', { t: msg.t, error: e.message });
        conn.send({ t: 'error', code: 'server_error', re: msg.t });
      }
    });
    ws.on('close', () => {
      clearTimeout(helloTimer);
      clearInterval(pinger);
      const n = (perIp.get(ipKey) || 1) - 1;
      if (n > 0) perIp.set(ipKey, n); else perIp.delete(ipKey);
      if (conn.accountId) rooms.detach(conn);
    });
    ws.on('error', () => { /* closed next */ });
    const pinger = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      try { ws.ping(); } catch (_) { /* closing */ }
    }, PING_MS);
  }

  return {
    wss,
    count: () => wss.clients.size,
    closeAll(code = 1012, reason = 'restart') {
      for (const ws of wss.clients) {
        try { ws.close(code, reason); } catch (_) { /* gone */ }
      }
    },
    // revoke: close the sockets that authenticated with this token (sign-out)
    closeToken(tokenHash, code = 4001, reason = 'signed_out') {
      for (const c of rooms.conns) if (c.tokenHash === tokenHash) { rooms.detach(c); c.close(code, reason); }
    },
    terminateAll() {
      for (const ws of wss.clients) ws.terminate();
    },
  };
}
