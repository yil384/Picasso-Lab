// Small shared helpers: API errors, the client IP and its keyed hash (ipKey), rate limiting, logging.
//
//   ApiError(status, code, message?)        thrown by accounts / http handlers; becomes { error: code, message }
//   normalizeIp(ip)                          IPv4 as is; IPv4-mapped IPv6 -> IPv4; IPv6 -> its /64 prefix
//   clientIp(req, trustProxy)                socket address, or the right-most X-Forwarded-For entry when trusted
//   makeIpKey(salt) -> (ip) -> hex           HMAC-SHA256(salt, normalizeIp(ip)) truncated to 128 bits
//   RateLimiter                              fixed windows per (bucket, key), in memory
//   createLog(stream?) -> log(msg, fields?)  one JSON line per event. Callers never pass IPs, tokens or cards.

import crypto from 'node:crypto';
import net from 'node:net';

export class ApiError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function expandV6(s) {
  let tail = [];
  const dotted = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (dotted) {
    const p = dotted[1].split('.').map(Number);
    tail = [(p[0] << 8) | p[1], (p[2] << 8) | p[3]];
    s = s.slice(0, -dotted[1].length);
    if (s.endsWith(':') && !s.endsWith('::')) s = s.slice(0, -1);
  }
  const [head, rest] = s.split('::');
  const parse = (part) => (part ? part.split(':').filter((x) => x !== '').map((x) => parseInt(x, 16)) : []);
  const a = parse(head);
  const b = [...parse(rest), ...tail];
  if (rest === undefined) return [...a, ...tail];
  const fill = 8 - a.length - b.length;
  return [...a, ...Array(Math.max(0, fill)).fill(0), ...b];
}

export function normalizeIp(ip) {
  let s = String(ip || '').trim();
  if (s.startsWith('[') && s.includes(']')) s = s.slice(1, s.indexOf(']'));
  const zone = s.indexOf('%');
  if (zone >= 0) s = s.slice(0, zone);
  if (net.isIPv4(s)) return s;
  if (!net.isIPv6(s)) return s.toLowerCase();
  const g = expandV6(s.toLowerCase());
  if (g.length !== 8) return s.toLowerCase();
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) {
    return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
  }
  return `${g.slice(0, 4).map((x) => x.toString(16)).join(':')}::/64`;
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff.join(',') : xff;
    if (typeof raw === 'string') {
      const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
  }
  return req.socket?.remoteAddress || '';
}

export function makeIpKey(salt) {
  return (ip) => crypto.createHmac('sha256', salt).update(normalizeIp(ip)).digest('hex').slice(0, 32);
}

export class RateLimiter {
  constructor(now = Date.now) {
    this.now = now;
    this.windows = new Map();
  }

  // Counts one hit; { ok: false, retryAfter (s) } once `limit` hits happened within the window.
  hit(bucket, key, limit, windowMs) {
    const k = `${bucket}\u0000${key}`;
    const t = this.now();
    let w = this.windows.get(k);
    if (!w || t - w.start >= windowMs) {
      w = { start: t, count: 0, windowMs };
      this.windows.set(k, w);
    }
    if (w.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((w.start + windowMs - t) / 1000)) };
    w.count++;
    return { ok: true };
  }

  sweep() {
    const t = this.now();
    for (const [k, w] of this.windows) if (t - w.start >= w.windowMs) this.windows.delete(k);
  }
}

export function createLog(stream = process.stdout) {
  return (msg, fields = {}) => {
    try {
      stream.write(`${JSON.stringify({ at: new Date().toISOString(), msg, ...fields })}\n`);
    } catch (_) { /* logging never breaks the service */ }
  };
}

export const randomId = (bytes = 16) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
