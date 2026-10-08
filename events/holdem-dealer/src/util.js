// Small shared helpers: API errors, the client IP and its keyed hash (ipKey), rate limiting, logging.
//
//   ApiError(status, code, message?)        thrown by accounts / http handlers; becomes { error: code, message }
//   normalizeIp(ip)                          IPv4 as is; IPv4-mapped IPv6 -> IPv4; IPv6 -> its /64 prefix
//   parseTrustEntry(text)                    a TRUST_PROXY entry: an address, a CIDR range or a host name (or null)
//   createProxyTrust(spec, { lookup, log })  -> { trusts(addr, wantsRefresh?), refresh(), stop() }: who may say who
//                                            the client is. spec = true (any peer: dev and tests only), false (no
//                                            peer) or a list of entries; host names are resolved at start and every
//                                            30 s (a proxy's container name on a Docker network)
//   clientIp(req, trust)                     the socket address, or the right-most X-Forwarded-For entry when the
//                                            socket's peer is a trusted proxy (trust: a proxy trust, or a boolean)
//   makeIpKey(salt) -> (ip) -> hex           HMAC-SHA256(salt, normalizeIp(ip)) truncated to 128 bits
//   RateLimiter                              fixed windows per (bucket, key), in memory; counts its refusals (and
//                                            the ones other limits note()) per bucket, for one log line a minute and
//                                            /v1/health - never the keys themselves
//   createLog(stream?) -> log(msg, fields?)  one JSON line per event. Callers never pass IPs, tokens or cards.

import crypto from 'node:crypto';
import dns from 'node:dns';
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

// ---------- trusted proxies (TRUST_PROXY) ----------
// Only a peer on this list may say who the client is (X-Forwarded-For); from any other peer the socket address is the
// client. Behind Caddy in Docker the dealer trusts the Caddy container alone: a user on the host who reaches the
// dealer comes from the network's gateway address and is keyed by that, whatever header it sends.
function plainIp(ip) {
  let s = String(ip || '').trim();
  if (s.startsWith('[') && s.includes(']')) s = s.slice(1, s.indexOf(']'));
  const zone = s.indexOf('%');
  if (zone >= 0) s = s.slice(0, zone);
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(s);
  return mapped ? mapped[1] : s;
}

function ipBits(ip) {
  const s = plainIp(ip);
  if (net.isIPv4(s)) return { v: 4, n: s.split('.').reduce((a, p) => (a << 8n) | BigInt(Number(p)), 0n) };
  if (net.isIPv6(s)) {
    const g = expandV6(s.toLowerCase());
    if (g.length !== 8) return null;
    return { v: 6, n: g.reduce((a, x) => (a << 16n) | BigInt(x), 0n) };
  }
  return null;
}

const HOST_RE = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?)*$/i;

export function parseTrustEntry(text) {
  const e = String(text || '').trim();
  if (!e) return null;
  const [addr, bitsText, extra] = e.split('/');
  if (extra === undefined) {
    const ip = ipBits(addr);
    if (ip) {
      const max = ip.v === 4 ? 32 : 128;
      const bits = bitsText === undefined ? max : Number(bitsText);
      if (!Number.isInteger(bits) || bits < 0 || bits > max || (bitsText !== undefined && !/^\d{1,3}$/.test(bitsText))) return null;
      const shift = BigInt(max - bits);
      return { kind: 'cidr', text: e, v: ip.v, shift, net: ip.n >> shift };
    }
    if (bitsText === undefined && HOST_RE.test(e) && !/^[\d.]+$/.test(e)) return { kind: 'host', text: e, name: e.toLowerCase() };
  }
  return null;
}

const inRange = (r, ip) => r.v === ip.v && (ip.n >> r.shift) === r.net;

export function createProxyTrust(spec, { lookup = dns.promises.lookup, log = () => {}, now = Date.now, refreshMs = 30_000 } = {}) {
  if (spec === true || spec === false || spec === null || spec === undefined) {
    const any = spec === true;
    return { any, trusts: () => any, refresh: async () => {}, stop() {}, entries: [] };
  }
  const entries = spec.map((e) => (typeof e === 'string' ? parseTrustEntry(e) : e)).filter(Boolean);
  const ranges = entries.filter((e) => e.kind === 'cidr');
  const hosts = entries.filter((e) => e.kind === 'host');
  let resolved = []; // { v, n } of the host names' current addresses
  let lastRefresh = 0;
  let running = null;
  async function refresh() {
    if (!hosts.length) return;
    if (running) return running;
    lastRefresh = now();
    running = (async () => {
      const next = [];
      for (const h of hosts) {
        try {
          for (const a of await lookup(h.name, { all: true })) { const ip = ipBits(a.address); if (ip) next.push(ip); }
        } catch (err) {
          log('trusted proxy name did not resolve', { name: h.name, error: err.code || err.message });
        }
      }
      resolved = next;
    })().finally(() => { running = null; });
    return running;
  }
  const timer = hosts.length ? setInterval(() => { refresh(); }, refreshMs) : null;
  timer?.unref?.();
  return {
    any: false,
    entries,
    trusts(addr, wantsRefresh = false) {
      const ip = ipBits(addr);
      if (!ip) return false;
      if (ranges.some((r) => inRange(r, ip)) || resolved.some((r) => r.v === ip.v && r.n === ip.n)) return true;
      // a proxy container that restarted may have a new address: look the names up again (at most every 5 s)
      if (wantsRefresh && hosts.length && now() - lastRefresh > 5000) refresh();
      return false;
    },
    refresh,
    stop() { if (timer) clearInterval(timer); },
  };
}

export function clientIp(req, trust) {
  const peer = req.socket?.remoteAddress || '';
  const xff = req.headers?.['x-forwarded-for'];
  if (xff === undefined) return peer;
  const ok = trust === true || (!!trust && typeof trust.trusts === 'function' && trust.trusts(peer, true));
  if (!ok) return peer;
  const raw = Array.isArray(xff) ? xff.join(',') : xff;
  if (typeof raw === 'string') {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return peer;
}

export function makeIpKey(salt) {
  return (ip) => crypto.createHmac('sha256', salt).update(normalizeIp(ip)).digest('hex').slice(0, 32);
}

export class RateLimiter {
  constructor(now = Date.now) {
    this.now = now;
    this.windows = new Map();
    this.total = {}; // bucket -> refusals since start
    this.recent = new Map(); // bucket -> { n, keys: Set } since the last drain (keys only counted, never shown)
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
    if (w.count >= limit) {
      this.note(bucket, key);
      return { ok: false, retryAfter: Math.max(1, Math.ceil((w.start + windowMs - t) / 1000)) };
    }
    w.count++;
    return { ok: true };
  }

  // a refusal by a limit kept elsewhere (socket caps, code misses, refills): counted with the others
  note(bucket, key) {
    this.total[bucket] = (this.total[bucket] || 0) + 1;
    let r = this.recent.get(bucket);
    if (!r) { r = { n: 0, keys: new Set() }; this.recent.set(bucket, r); }
    r.n++;
    if (r.keys.size < 10_000) r.keys.add(String(key));
  }

  // { bucket: { refused, networks } } since the last call (for one log line a minute)
  drain() {
    const out = {};
    for (const [b, r] of this.recent) out[b] = { refused: r.n, networks: r.keys.size };
    this.recent.clear();
    return out;
  }

  refusals() {
    return { ...this.total };
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
