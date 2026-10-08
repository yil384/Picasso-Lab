// Helpers for the service tests (not a test file): temp data dirs, a test config, an in-process server, a
// WebSocket client that records every frame, and locally signed Firebase-style ID tokens.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { loadConfig } from '../src/config.js';
import { startServer } from '../src/server.js';

export const ORIGIN = 'http://127.0.0.1:5173';
export { PROJECT } from './jwt-helpers.js';

export function tmpDir(prefix = 'holdem-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function testConfig(over = {}) {
  return loadConfig({
    PORT: '0',
    DATA_DIR: over.DATA_DIR || tmpDir(),
    ALLOWED_ORIGINS: 'https://yil384.github.io,http://127.0.0.1:*',
    TRUST_PROXY: '1',
    BOT_THINK_SCALE: '0',
    PACE_SCALE: '0.02',
    EMAIL_LINK: 'off',
    ...over,
  });
}

export const quiet = () => {};

export async function startTest(over = {}, opts = {}) {
  const config = testConfig(over);
  const svc = await startServer(config, { log: quiet, ...opts });
  svc.config = config;
  return svc;
}

export async function api(svc, method, p, { body, token, origin = ORIGIN, headers = {} } = {}) {
  const h = { ...headers };
  if (origin) h.origin = origin;
  if (token) h.authorization = `Bearer ${token}`;
  if (body !== undefined) h['content-type'] = 'application/json';
  const res = await fetch(`${svc.url}${p}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  return { status: res.status, data, headers: res.headers };
}

export const randomIp = () => `10.${crypto.randomInt(256)}.${crypto.randomInt(256)}.${crypto.randomInt(1, 255)}`;

// a new guest from its own (random) address, so tests never share a network's limits by accident
export async function newGuest(svc, name = 'Guest', extra = {}) {
  const headers = { 'x-forwarded-for': randomIp() };
  const r = await api(svc, 'POST', '/v1/session', { headers, body: { clientId: `c-${name.replace(/\W/g, '')}-${crypto.randomInt(1e9)}`, name, fresh: false, ...extra } });
  if (r.status !== 200) throw new Error(`session failed ${r.status} ${JSON.stringify(r.data)}`);
  return { token: r.data.token, account: r.data.account, id: svc.accounts ? svc.accounts.byPublicId(r.data.account.pid).id : null };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A socket that keeps every parsed frame; waitFor(pred) resolves with the first frame (old or new) matching.
export class Client {
  constructor(url, { origin = ORIGIN } = {}) {
    this.frames = [];
    this.waiters = [];
    this.closed = null;
    this.ws = new WebSocket(url.replace(/^http/, 'ws') + '/v1/ws', { headers: { origin } });
    this.opened = new Promise((resolve, reject) => {
      this.ws.once('open', resolve);
      this.ws.once('error', reject);
      this.ws.once('unexpected-response', (req, res) => reject(Object.assign(new Error(`upgrade ${res.statusCode}`), { status: res.statusCode })));
    });
    this.ws.on('message', (data) => {
      const raw = data.toString();
      const msg = JSON.parse(raw);
      msg.__raw = raw;
      this.frames.push(msg);
      this.onFrame?.(msg);
      for (const w of [...this.waiters]) {
        if (w.pred(msg)) { this.waiters.splice(this.waiters.indexOf(w), 1); clearTimeout(w.timer); w.resolve(msg); }
      }
    });
    this.ws.on('close', (code, reason) => {
      this.closed = { code, reason: reason.toString() };
      for (const w of this.waiters.splice(0)) { clearTimeout(w.timer); w.reject(new Error(`socket closed ${code} while waiting`)); }
    });
    this.ws.on('error', () => {});
  }

  send(obj) {
    this.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
  }

  waitFor(pred, { timeout = 5000, since = 0 } = {}) {
    for (let i = since; i < this.frames.length; i++) if (pred(this.frames[i])) return Promise.resolve(this.frames[i]);
    return new Promise((resolve, reject) => {
      const w = { pred, resolve, reject };
      w.timer = setTimeout(() => {
        this.waiters.splice(this.waiters.indexOf(w), 1);
        reject(new Error(`timeout waiting; last frame: ${this.frames.length ? this.frames[this.frames.length - 1].__raw.slice(0, 300) : 'none'}`));
      }, timeout);
      this.waiters.push(w);
    });
  }

  // the next frame after now that matches
  next(pred, timeout) {
    return this.waitFor(pred, { timeout, since: this.frames.length });
  }

  async hello(token) {
    await this.opened;
    const since = this.frames.length;
    this.send({ t: 'hello', v: 1, token });
    return this.waitFor((m) => m.t === 'welcome' || (m.t === 'error' && m.re === 'hello'), { since });
  }

  lastState() {
    for (let i = this.frames.length - 1; i >= 0; i--) if (this.frames[i].t === 'state') return this.frames[i];
    return null;
  }

  waitClose(timeout = 5000) {
    if (this.closed) return Promise.resolve(this.closed);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no close')), timeout);
      this.ws.once('close', (code, reason) => { clearTimeout(timer); resolve({ code, reason: reason.toString() }); });
    });
  }

  close() {
    try { this.ws.close(); } catch (_) { /* closing */ }
  }
}

export async function connect(svc, token, opts) {
  const c = new Client(svc.url, opts);
  const w = await c.hello(token);
  if (w.t !== 'welcome') throw new Error(`hello failed: ${w.code}`);
  return c;
}

export { makeSigner, idClaims } from './jwt-helpers.js';

// ---------- table play helpers ----------
const CARD_RE = /^[2-9TJQKA][shdc]$/;

export function cardsIn(obj, out = new Set()) {
  if (typeof obj === 'string') { if (CARD_RE.test(obj)) out.add(obj); return out; }
  if (Array.isArray(obj)) { for (const x of obj) cardsIn(x, out); return out; }
  if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) if (k !== '__raw') cardsIn(obj[k], out);
  return out;
}

// Server-side ground truth (in-process only): every dealt hand's hole cards, finished hands, side pots seen.
export function truthRecorder() {
  const holes = new Map(); // handId -> Map(seat -> [c1, c2])
  const done = new Map(); // code -> Set(handId)
  const stats = { sidePots: 0, showdowns: 0, runouts: 0 };
  const showdowns = new Map(); // code -> hands that went to showdown
  const checks = new Set();
  return {
    holes, done, stats, checks, showdowns,
    hook(table) {
      const h = table.hand;
      if (h) {
        let m = holes.get(h.id);
        if (!m) holes.set(h.id, (m = new Map()));
        table.seats.forEach((s, i) => { if (s && s.inHand && s.hole && s.hole.length === 2 && !m.has(i)) m.set(i, s.hole.slice()); });
        if (h.done) {
          if (!done.has(table.code)) done.set(table.code, new Set());
          const set = done.get(table.code);
          if (!set.has(h.id)) {
            set.add(h.id);
            if (h.pots.length > 1) stats.sidePots++;
            if (h.street === 'showdown') {
              stats.showdowns++;
              showdowns.set(table.code, (showdowns.get(table.code) || 0) + 1);
            }
            if (h.runout) stats.runouts++;
          }
        }
      }
      for (const c of checks) c(table);
    },
    handsDone(code) { return done.get(code)?.size || 0; },
  };
}

// Chips at one table plus the bankrolls of the given accounts: constant while nobody refills or adds bots.
export function chipsTotal(svc, code, accountIds) {
  let sum = 0;
  for (const id of accountIds) sum += svc.accounts.get(id)?.chips ?? 0;
  const t = svc.rooms.get(code);
  if (t) {
    const live = t.hand && !t.hand.done;
    for (const s of t.seats) if (s) sum += s.stack + s.pendingTopUp + (live && s.inHand ? s.contrib : 0);
  }
  return sum;
}

export async function until(pred, { timeout = 20000, step = 10, what = 'condition' } = {}) {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > timeout) throw new Error(`timeout waiting for ${what}`);
    await sleep(step);
  }
}

export const floatRng = (seed) => {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
};

// Random legal play with plenty of all-ins (side pots).
export function randomStrategy(msg, rng) {
  const L = msg.me.legal;
  const r = rng();
  if (L.canRaise && r < 0.14) return { action: 'allin', to: null };
  if (L.canRaise && r < 0.34) {
    const span = L.maxRaiseTo - L.minRaiseTo;
    return { action: 'raise', to: Math.min(L.maxRaiseTo, L.minRaiseTo + Math.floor(rng() * span * 0.3)) };
  }
  if (!L.check && r < 0.44) return { action: 'fold', to: null };
  return L.check ? { action: 'check', to: null } : { action: 'call', to: null };
}

// A human test client that acts whenever a state says it is its turn, and tops up when busted.
export function autoPlay(client, { rng = floatRng(7), strategy = randomStrategy, topUp = true } = {}) {
  const acted = new Set();
  let topping = false;
  client.playing = true;
  client.errors = client.errors || [];
  const handler = (msg) => {
    if (msg.t === 'error') client.errors.push(msg);
    if (!client.playing || msg.t !== 'state') return;
    const me = msg.me;
    const t = msg.table;
    const h = t.hand;
    if (!me || me.seat === null) return;
    const seat = t.seats[me.seat];
    if (seat && seat.stack > 0) topping = false;
    if (topUp && seat && seat.stack === 0 && me.pendingTopUp === 0 && !topping && (!h || h.done || !seat.inHand)) {
      topping = true;
      client.send({ t: 'topUp', amount: t.settings.minBuyIn });
    }
    if (!h || h.done || h.toAct !== me.seat || !me.legal) return;
    const key = `${h.id}:${t.log.length}`;
    if (acted.has(key)) return;
    acted.add(key);
    const d = strategy(msg, rng);
    setImmediate(() => { if (client.playing) client.send({ t: 'act', hand: h.id, action: d.action, to: d.to }); });
  };
  client.onFrame = handler;
  const last = client.lastState();
  if (last) handler(last);
}

// Every state frame a client received: its Me is its own; its hole cards are its real ones; no other card than
// the board, its own hole cards and hands the rules exposed (legitimately) appears; the previous-hand summary too.
export function checkFrames(client, truth, pid) {
  let n = 0;
  for (const f of client.frames) {
    if (f.t !== 'state') continue;
    n++;
    const t = f.table;
    const h = t.hand;
    if (f.me) assert.equal(f.me.pid, pid, 'Me belongs to the recipient');
    const allowed = new Set(h ? h.board : []);
    t.seats.forEach((s) => { if (s && s.shown) s.shown.forEach((c) => allowed.add(c)); });
    if (f.me && f.me.hole) f.me.hole.forEach((c) => allowed.add(c));
    for (const c of cardsIn({ hand: h, seats: t.seats, me: f.me })) assert.ok(allowed.has(c), `card ${c} leaked to ${pid} (rev ${f.rev})`);
    if (h) {
      const tr = truth.holes.get(h.id);
      assert.ok(tr, `ground truth for ${h.id}`);
      if (f.me && f.me.hole) assert.deepEqual(f.me.hole, tr.get(f.me.seat), 'own hole cards are the real ones');
      if (f.me && f.me.seat === null) assert.equal(f.me.hole, null);
      t.seats.forEach((s, i) => {
        if (!s || !s.shown) return;
        assert.deepEqual(s.shown, tr.get(i));
        const live = t.seats.filter((x) => x && x.inHand);
        const active = live.filter((x) => x.state !== 'allin');
        const runout = live.length >= 2 && active.length <= 1;
        const shownByChoice = s.last && s.last.a === 'show';
        assert.ok(h.street === 'showdown' || h.done || runout || shownByChoice, `seat ${i} exposed without a reason (rev ${f.rev})`);
        assert.ok(s.state !== 'folded' || shownByChoice, 'a folded hand is never shown');
      });
    }
    if (t.last) {
      const tr = truth.holes.get(`${t.code}-${t.last.no}`);
      const ok = new Set(t.last.board);
      for (const [seat, cards] of Object.entries(t.last.shown)) {
        assert.deepEqual(cards, tr.get(Number(seat)));
        cards.forEach((c) => ok.add(c));
      }
      for (const c of cardsIn(t.last)) assert.ok(ok.has(c), `card ${c} in the last-hand summary`);
    }
  }
  return n;
}

// Resend's API as far as the service uses it (the mailer's fetch is injected; nothing leaves the machine). Each call is
// recorded; `plan` holds the next answers (default 200 { id }): { status, body?, headers?, throw?, hang?, delay? }
// (throw: a network error; hang: never answers until the mailer aborts; delay: ms before answering).
export function fakeResend() {
  const calls = [];
  const plan = [];
  let n = 0;
  async function fetch(url, init) {
    const headers = Object.fromEntries(Object.entries(init.headers).map(([k, v]) => [k.toLowerCase(), v]));
    calls.push({ url, method: init.method, headers, body: JSON.parse(init.body), at: Date.now() });
    const step = plan.shift() || { status: 200 };
    const aborted = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (step.hang) {
      return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(aborted())));
    }
    if (step.delay) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, step.delay);
        init.signal.addEventListener('abort', () => { clearTimeout(t); reject(aborted()); });
      });
    }
    if (step.throw) throw new TypeError('fetch failed');
    const body = step.body ?? (step.status === 200 ? { id: `em_${++n}` } : { statusCode: step.status, name: 'application_error', message: 'x' });
    return new Response(JSON.stringify(body), { status: step.status, headers: { 'content-type': 'application/json', ...(step.headers || {}) } });
  }
  return { fetch, calls, plan, reset() { calls.length = 0; plan.length = 0; } };
}
