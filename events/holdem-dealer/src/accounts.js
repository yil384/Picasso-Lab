// Accounts shared by Guandan and Hold'em (DESIGN.md section 4): guests, device tokens, IP memory (suggestions
// only), claims, names and their protection, bankroll refills, records, leaderboards, email links, sign-out.
// Play money only: chips are virtual and never move between accounts.
//
// Credentials: a device token is 32 random bytes (base64url); only sha256(token) is stored. A Guandan clientId is
// public and never a credential. IP addresses are never stored: only ipKey = HMAC(IP_SALT, normalized IP), computed
// by the transport and passed in. Email accounts never enter the IP memory. An IP suggestion hands over a name, never
// an account: claiming one renames the caller's own account (no token for the other account, whose chips, records,
// seat and cards stay its own).
//
//   new Accounts({ gamesSecret, emailLink, emailSender, mailer, emailFrom, emailDailyCap, verifier, now, tableInfo,
//                  onChange, onAccount, onDelete, log })
//     emailSender           'firebase' (the page sends the link through Firebase Auth) | 'resend' (this service sends
//                           it through mailer.send, from emailFrom, at most emailDailyCap in any 24 hours)
//     tableInfo(accountId) -> { seated: bool, chips: int }   chips the account has at tables (rooms layer)
//     onChange()            persistence: something changed (mark accounts.json dirty)
//     onAccount(id)         an account's view changed outside a table step (push { t:"account" } to its sockets)
//     onDelete(id)          an account was deleted (merged or a pristine guest replaced by a claim)
//   load(data), toJSON()
//   authenticate(token) -> account | null
//   session({ account, clientId, name, fresh, ipKey }) -> { token?, account, suggestions?, features }
//        account = the bearer's account or null (the transport rate-limits creation before calling)
//   claim(account, sid, ipKey) -> { account }   the caller's own account, now under the suggested name
//   get(id), view(account), nameAllowed(account), setName(account, name), refill(account)
//   guandanRound(account, { room, round, won, place }) -> { ok, duplicate? }
//   leaderboard(game, limit, account?) -> { rows, me?, rule? }   Hold'em ranks established accounts only
//   emailStart(account, email, tokenHash, { lang }) -> { lid, poll, code, sent: false }     (firebase)
//                                                -> Promise<{ lid, poll, code, sent: true, from }>   (resend: sent)
//   emailComplete(lid, idToken, code) -> Promise<{ ok, name, nameReserved }>   Firebase ID token proves the address
//   emailRedeem(lid, t, code) -> { ok, name, nameReserved }   the single-use token from the emailed link proves it
//   emailPoll(lid, poll) -> { status: "pending" } | { status: "done", token, account }
//   signout(token) -> { ok }
//   applySettlements({ chips, records }) -> Set of account ids changed (table steps; no onAccount call)
//   sweep()               hourly: IP entries older than 30 days, expired claims and links, old pristine guests
//   tokenHash(token)

import crypto from 'node:crypto';
import { ApiError, sha256 } from './util.js';
import { signInEmail, linkUrl } from './mailer.js';

export const START_CHIPS = 10_000;
export const REFILL_BELOW = 2_000;
export const REFILL_EVERY = 24 * 60 * 60_000; // one refill per account per day
export const REFILLS_PER_NET = 5; // and at most this many per network (ipKey) per day
// The Hold'em ranking counts chips won from established accounts only (rnet): a fresh guest's free starting chips,
// lost on purpose to a main account, never lift it. Bots count as established (their chips are part of the game).
export const ESTABLISHED_AGE = 3 * 24 * 60 * 60_000;
export const ESTABLISHED_HANDS = 50;
const DAY = 24 * 3600_000;
const TOKENS_MAX = 10;
const CLIENT_IDS_MAX = 20;
export const IP_TTL = 30 * DAY;
const IP_PER_KEY = 5;
const SUGGEST_MAX = 3;
export const SID_TTL = 10 * 60_000;
export const LINK_TTL = 30 * 60_000;
export const CODE_TRIES = 5; // wrong device codes before an email link is dropped
// emails this service sends itself (EMAIL_SENDER=resend), on top of the 5 links an hour per network (http.js)
export const MAIL_PER_ADDRESS_HOUR = 3;
export const MAIL_PER_ADDRESS_DAY = 10;
const HOUR = 3600_000;
const LINK_DONE_KEEP = 10 * 60_000;
const LINKS_PER_ACCOUNT = 5;
const SEEN_MAX = 200;
export const PRISTINE_TTL = 90 * DAY;
const TOUCH_MS = 60_000;

const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
const b32 = (n) => Array.from(crypto.randomBytes(n), (b) => B32[b & 31]).join('');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const LINK_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url
const sameHash = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === 64 && b.length === 64
  && crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const secretId = (bytes = 18) => crypto.randomBytes(bytes).toString('base64url');

// ---------- names ----------
// 1-24 characters after trimming and collapsing spaces; no control, private-use, unassigned or invisible
// direction-changing characters. Protection compares case- and space-insensitively (NFKC, lower case, no spaces).
const BAD_CHARS = /[\p{Cc}\p{Co}\p{Cs}\p{Cn}​‎‏‪-‮⁠-⁤⁦-⁩﻿]/u;

export function cleanName(input) {
  if (typeof input !== 'string') return null;
  const s = input.normalize('NFC').replace(/\s+/gu, ' ').trim();
  const len = Array.from(s).length;
  if (len < 1 || len > 24 || BAD_CHARS.test(s)) return null;
  return s;
}

export function nameKey(name) {
  return String(name).normalize('NFKC').toLowerCase().replace(/[\s​-‍⁠﻿]+/gu, '');
}

export function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  return `${(user || '').slice(0, 1)}***@${domain || ''}`;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{1,63}$/;
const SEND_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,63}$/;

function emptyHoldem() {
  return { hands: 0, won: 0, biggestPot: 0, net: 0, showdowns: 0 };
}
// ranked net (accounts saved before it existed rank by their net)
const rnetOf = (a) => a.holdem.rnet ?? a.holdem.net;

export class Accounts {
  constructor({
    gamesSecret, emailLink = false, emailSender = 'firebase', mailer = null, emailFrom = '', emailDailyCap = 90,
    verifier = null, now = Date.now,
    tableInfo = () => ({ seated: false, chips: 0 }),
    onChange = () => {}, onAccount = () => {}, onDelete = () => {}, log = () => {},
  }) {
    if (!gamesSecret) throw new Error('gamesSecret required');
    this.secret = gamesSecret;
    this.emailLink = !!emailLink;
    this.emailSender = emailSender === 'resend' ? 'resend' : 'firebase';
    if (this.emailSender === 'resend' && !mailer) throw new Error('mailer required for EMAIL_SENDER=resend');
    this.mailer = mailer;
    this.emailFrom = emailFrom;
    this.emailDailyCap = emailDailyCap;
    this.verifier = verifier;
    this.now = now;
    this.tableInfo = tableInfo;
    this.onChange = onChange;
    this.onAccount = onAccount;
    this.onDelete = onDelete;
    this.log = log;
    this.accounts = new Map(); // id -> Account
    this.byToken = new Map(); // sha256(token) -> id
    this.byEmail = new Map(); // email hash -> id
    this.byPid = new Map(); // pid -> id
    this.protectedNames = new Map(); // nameKey -> id (email accounts, first linked wins)
    this.ip = new Map(); // ipKey -> [{ a, n, at }] newest first
    this.links = new Map(); // lid -> pending email link
    this.sids = new Map(); // sid -> { accountId, ipKey, exp } (memory only)
    // emails sent by this service in the last 24 hours: all of them (the daily cap) and per address hash (no address)
    this.mail = { sent: [], addr: new Map() };
  }

  // ---------- persistence ----------
  load(data) {
    if (!data) return;
    for (const a of data.accounts || []) this.accounts.set(a.id, a);
    for (const [k, list] of Object.entries(data.ip || {})) this.ip.set(k, list);
    for (const l of data.links || []) this.links.set(l.lid, l);
    if (data.mail) {
      this.mail.sent = Array.isArray(data.mail.sent) ? data.mail.sent.filter(Number.isFinite) : [];
      for (const [k, list] of Object.entries(data.mail.addr || {})) if (Array.isArray(list)) this.mail.addr.set(k, list.filter(Number.isFinite));
    }
    this._reindex();
  }

  toJSON() {
    return {
      v: 1,
      accounts: [...this.accounts.values()],
      ip: Object.fromEntries(this.ip),
      links: [...this.links.values()],
      mail: { sent: this.mail.sent, addr: Object.fromEntries(this.mail.addr) },
    };
  }

  _reindex() {
    this.byToken.clear();
    this.byEmail.clear();
    this.byPid.clear();
    for (const a of this.accounts.values()) {
      this.byPid.set(a.pid, a.id);
      for (const t of a.tokens) this.byToken.set(t.hash, a.id);
      if (a.email) this.byEmail.set(a.email.hash, a.id);
    }
    this._reindexNames();
  }

  _reindexNames() {
    this.protectedNames.clear();
    const emailed = [...this.accounts.values()].filter((a) => a.email).sort((x, y) => x.email.linkedAt - y.email.linkedAt);
    for (const a of emailed) {
      const k = nameKey(a.name);
      if (!this.protectedNames.has(k)) this.protectedNames.set(k, a.id);
    }
  }

  _changed() {
    this.onChange();
  }

  // ---------- basics ----------
  tokenHash(token) {
    return sha256(token);
  }

  get(id) {
    return this.accounts.get(id) || null;
  }

  byPublicId(pid) {
    const id = this.byPid.get(pid);
    return id ? this.accounts.get(id) : null;
  }

  authenticate(token) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null;
    const hash = sha256(token);
    const id = this.byToken.get(hash);
    const a = id ? this.accounts.get(id) : null;
    if (!a) return null;
    const t = this.now();
    if (t - a.lastSeen > TOUCH_MS) {
      a.lastSeen = t;
      const rec = a.tokens.find((x) => x.hash === hash);
      if (rec) rec.lastUsed = t;
      this._changed();
    }
    return a;
  }

  nameHolder(name) {
    return this.protectedNames.get(nameKey(name)) || null;
  }

  // may this account use its current name at a Hold'em table?
  nameAllowed(a) {
    const holder = this.nameHolder(a.name);
    return !holder || holder === a.id;
  }

  view(a) {
    const holder = a.email ? this.nameHolder(a.name) : null;
    return {
      pid: a.pid,
      name: a.name,
      guest: !a.email,
      email: a.email ? a.email.masked : null,
      chips: a.chips,
      refills: a.refills,
      holdem: { ...a.holdem },
      guandan: { rounds: a.guandan.rounds, wins: a.guandan.wins },
      protected: !!a.email && holder === a.id,
    };
  }

  _issueToken(a) {
    const token = newToken();
    const t = this.now();
    a.tokens.push({ hash: sha256(token), createdAt: t, lastUsed: t });
    a.tokens.sort((x, y) => x.createdAt - y.createdAt);
    while (a.tokens.length > TOKENS_MAX) this.byToken.delete(a.tokens.shift().hash);
    this.byToken.set(sha256(token), a.id);
    return token;
  }

  _create(name) {
    const t = this.now();
    let id;
    do id = `u_${b32(16)}`; while (this.accounts.has(id));
    let pid;
    do pid = `p_${b32(10)}`; while (this.byPid.has(pid));
    const a = {
      id, pid,
      name: name || `Player ${1000 + crypto.randomInt(9000)}`,
      createdAt: t, lastSeen: t,
      tokens: [], clientIds: [], email: null,
      chips: START_CHIPS, refills: 0,
      holdem: emptyHoldem(),
      guandan: { rounds: 0, wins: 0, seen: {} },
    };
    this.accounts.set(id, a);
    this.byPid.set(pid, id);
    return a;
  }

  _attachClientId(a, clientId) {
    if (typeof clientId !== 'string' || !/^[A-Za-z0-9_.:-]{1,64}$/.test(clientId)) return false;
    if (a.clientIds.includes(clientId)) return false;
    a.clientIds.push(clientId);
    while (a.clientIds.length > CLIENT_IDS_MAX) a.clientIds.shift();
    return true;
  }

  _delete(a) {
    for (const t of a.tokens) this.byToken.delete(t.hash);
    if (a.email) this.byEmail.delete(a.email.hash);
    this.byPid.delete(a.pid);
    this.accounts.delete(a.id);
    this._forgetIp(a.id);
    for (const [lid, l] of this.links) if (l.accountId === a.id && l.status === 'pending') this.links.delete(lid);
    for (const [sid, s] of this.sids) if (s.accountId === a.id) this.sids.delete(sid);
    if (a.email) this._reindexNames();
    this.onDelete(a.id);
  }

  // never played, never saved, nothing at a table: safe to replace by a claimed account
  _pristine(a) {
    if (a.email || a.refills || a.chips !== START_CHIPS) return false;
    if (a.holdem.hands || a.guandan.rounds) return false;
    const info = this.tableInfo(a.id);
    return !info.seated && !info.chips;
  }

  // ---------- IP memory (suggestions only) ----------
  _recordIp(ipKey, a) {
    if (!ipKey || a.email) return;
    const t = this.now();
    const list = (this.ip.get(ipKey) || []).filter((e) => e.a !== a.id && t - e.at < IP_TTL);
    list.unshift({ a: a.id, n: a.name, at: t });
    this.ip.set(ipKey, list.slice(0, IP_PER_KEY));
  }

  _forgetIp(accountId) {
    for (const [k, list] of this.ip) {
      const kept = list.filter((e) => e.a !== accountId);
      if (kept.length === list.length) continue;
      if (kept.length) this.ip.set(k, kept); else this.ip.delete(k);
    }
  }

  _suggestions(ipKey, a) {
    const t = this.now();
    const out = [];
    const seen = new Set();
    for (const e of this.ip.get(ipKey) || []) {
      if (out.length >= SUGGEST_MAX) break;
      if (t - e.at >= IP_TTL || e.a === a.id) continue;
      const other = this.accounts.get(e.a);
      if (!other || other.email) continue;
      // one entry per name (a claimed name lives on in two accounts)
      const k = nameKey(other.name);
      if (seen.has(k)) continue;
      seen.add(k);
      const sid = secretId(18);
      this.sids.set(sid, { accountId: other.id, ipKey, exp: t + SID_TTL });
      out.push({ sid, name: other.name });
    }
    return out;
  }

  // ---------- endpoints ----------
  session({ account = null, clientId, name, fresh, ipKey }) {
    let a = account;
    let token;
    let changed = false;
    if (!a) {
      const clean = cleanName(name);
      const usable = clean && !this.nameHolder(clean) ? clean : null;
      a = this._create(usable);
      token = this._issueToken(a);
      this._attachClientId(a, clientId);
      // a returning Guandan player brings a real name: remember it for this network
      if (usable && fresh !== true) this._recordIp(ipKey, a);
      changed = true;
    } else {
      changed = this._attachClientId(a, clientId) || changed;
      if (!a.email) {
        this._recordIp(ipKey, a);
        changed = true;
      }
    }
    if (changed) this._changed();
    const out = { account: this.view(a), features: this.features() };
    if (token) out.token = token;
    // a fresh browser has no token; suggestions (and their sids) only come with a new account, so they are
    // bounded by the account-creation rate limit
    if (fresh === true) out.suggestions = token ? this._suggestions(ipKey, a) : [];
    return out;
  }

  // One click on a suggestion: the caller's own account takes the suggested name. The other account is never
  // handed over (no token for it): an IP address only says "someone here used this name", it never signs anyone in,
  // so whoever shares the network cannot take a guest's chips, records, seat or hole cards. A device carries a whole
  // account over only by saving it with an email.
  claim(caller, sid, ipKey) {
    const t = this.now();
    const s = typeof sid === 'string' ? this.sids.get(sid) : null;
    if (!s || s.exp <= t) {
      if (s) this.sids.delete(sid);
      throw new ApiError(404, 'expired', 'This suggestion has expired');
    }
    if (s.ipKey !== ipKey) throw new ApiError(403, 'ip_mismatch', 'This suggestion was made for another network');
    const target = this.accounts.get(s.accountId);
    if (!target) {
      this.sids.delete(sid);
      throw new ApiError(404, 'expired', 'This suggestion has expired');
    }
    if (target.email) throw new ApiError(409, 'protected', 'This account is saved with an email');
    const holder = this.nameHolder(target.name);
    if (holder && holder !== caller.id) throw new ApiError(409, 'protected', 'This name belongs to a saved account');
    this.sids.delete(sid);
    if (caller.name !== target.name) {
      caller.name = target.name;
      if (caller.email) this._reindexNames();
      this.onAccount(caller.id);
    }
    caller.lastSeen = t;
    this._recordIp(ipKey, caller);
    this._changed();
    return { account: this.view(caller) };
  }

  setName(a, name) {
    const clean = cleanName(name);
    if (!clean) throw new ApiError(400, 'bad_name', 'Names are 1-24 characters');
    const holder = this.nameHolder(clean);
    if (holder && holder !== a.id) throw new ApiError(409, 'name_protected', 'This name belongs to a saved account');
    if (a.name !== clean) {
      a.name = clean;
      if (a.email) this._reindexNames();
      this._changed();
      this.onAccount(a.id);
    }
    return { account: this.view(a) };
  }

  // Rate limited: chips lost on purpose to another account (chip dumping) would otherwise be free to repeat.
  refill(a, ipKey = null) {
    const info = this.tableInfo(a.id);
    if (a.chips >= REFILL_BELOW || info.chips > 0) {
      throw new ApiError(409, 'not_needed', 'Refills are for bankrolls under 2,000 with no chips at a table');
    }
    const t = this.now();
    if (a.refilledAt && t - a.refilledAt < REFILL_EVERY) throw new ApiError(429, 'refill_later', 'One refill per day');
    if (!this.refillNets) this.refillNets = new Map(); // ipKey -> [times] (memory only)
    const net = ipKey ? (this.refillNets.get(ipKey) || []).filter((x) => t - x < REFILL_EVERY) : [];
    if (net.length >= REFILLS_PER_NET) throw new ApiError(429, 'refill_later', 'Too many refills from this network today');
    if (ipKey) { net.push(t); this.refillNets.set(ipKey, net); }
    a.refilledAt = t;
    a.chips = START_CHIPS;
    a.refills += 1;
    this._changed();
    this.onAccount(a.id);
    return { account: this.view(a) };
  }

  guandanRound(a, { room, round, won, place }) {
    const r = typeof round === 'number' ? round : NaN;
    if (typeof room !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(room)) throw new ApiError(400, 'bad_request', 'room');
    if (!Number.isInteger(r) || r < 0 || r > 1e6) throw new ApiError(400, 'bad_request', 'round');
    if (typeof won !== 'boolean') throw new ApiError(400, 'bad_request', 'won');
    if (place !== undefined && place !== null && !(Number.isInteger(place) && place >= 0 && place <= 9)) {
      throw new ApiError(400, 'bad_request', 'place');
    }
    const key = `${room}:${r}`;
    const g = a.guandan;
    if (g.seen[key]) return { ok: true, duplicate: true };
    g.seen[key] = 1;
    const keys = Object.keys(g.seen);
    for (let i = 0; i < keys.length - SEEN_MAX; i++) delete g.seen[keys[i]];
    g.rounds += 1;
    if (won) g.wins += 1;
    this._changed();
    this.onAccount(a.id);
    return { ok: true };
  }

  leaderboard(game, limit = 50, me = null) {
    const n = Math.max(1, Math.min(100, Number.isInteger(limit) ? limit : 50));
    let rows;
    let rowOf;
    if (game === 'holdem') {
      rowOf = (a) => ({ pid: a.pid, name: a.name, chips: a.chips, net: rnetOf(a), hands: a.holdem.hands, won: a.holdem.won, biggestPot: a.holdem.biggestPot });
      // only established accounts rank (3 days old and 50 hands): a throwaway guest's lucky hands never do
      rows = [...this.accounts.values()].filter((a) => this.established(a))
        .sort((x, y) => rnetOf(y) - rnetOf(x) || y.holdem.hands - x.holdem.hands || (x.pid < y.pid ? -1 : 1));
    } else if (game === 'guandan') {
      rowOf = (a) => ({ pid: a.pid, name: a.name, rounds: a.guandan.rounds, wins: a.guandan.wins });
      rows = [...this.accounts.values()].filter((a) => a.guandan.rounds > 0)
        .sort((x, y) => y.guandan.wins - x.guandan.wins || x.guandan.rounds - y.guandan.rounds || (x.pid < y.pid ? -1 : 1));
    } else {
      throw new ApiError(400, 'bad_request', 'game must be holdem or guandan');
    }
    const out = { rows: rows.slice(0, n).map((a, i) => ({ rank: i + 1, ...rowOf(a) })) };
    if (me) {
      const i = rows.indexOf(me);
      out.me = { rank: i >= 0 ? i + 1 : null, ...rowOf(me) };
    }
    if (game === 'holdem') out.rule = { days: ESTABLISHED_AGE / DAY, hands: ESTABLISHED_HANDS };
    return out;
  }

  // 3 days old and 50 Hold'em hands: an account whose losses count toward others' ranking and that ranks itself
  established(a) {
    return !!a && this.now() - a.createdAt >= ESTABLISHED_AGE && a.holdem.hands >= ESTABLISHED_HANDS;
  }

  // ---------- email link (DESIGN 4.4) ----------
  features() {
    return { emailLink: this.emailLink, emailSender: this.emailSender };
  }

  emailHash(email) {
    return crypto.createHmac('sha256', this.secret).update(String(email).trim().toLowerCase()).digest('hex');
  }

  _requireEmailLink() {
    if (!this.emailLink) throw new ApiError(403, 'disabled', 'Saving with email is not enabled');
  }

  emailStart(a, email, tokenHash = null, { lang = 'zh' } = {}) {
    this._requireEmailLink();
    if (typeof email !== 'string' || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      throw new ApiError(400, 'bad_email', 'Check the email address');
    }
    const address = email.trim();
    const resend = this.emailSender === 'resend';
    // the service writes this address into a mail request itself: a plain address only (no list, name or brackets)
    if (resend && !SEND_RE.test(address)) throw new ApiError(400, 'bad_email', 'Check the email address');
    if (a.email) throw new ApiError(409, 'already_linked', 'This account is already saved with an email');
    const emailHash = this.emailHash(address);
    if (resend) this._mailQuota(emailHash);
    const t = this.now();
    const mine = [...this.links.values()].filter((l) => l.accountId === a.id && l.status === 'pending')
      .sort((x, y) => x.createdAt - y.createdAt);
    while (mine.length >= LINKS_PER_ACCOUNT) this.links.delete(mine.shift().lid);
    const lid = secretId(16);
    const poll = secretId(24);
    // shown on the device that asked; the link page needs it before the address is bound to this account or this
    // device is signed in to an existing saved one (otherwise anyone could send a link to someone else's address and
    // claim the address, or get their account, when they open it)
    const code = String(crypto.randomInt(0, 10_000)).padStart(4, '0');
    const link = {
      lid, accountId: a.id, emailHash, masked: maskEmail(address.toLowerCase()),
      pollHash: sha256(poll), codeHash: sha256(`${lid}:${code}`), codeTries: 0,
      starterToken: tokenHash, createdAt: t, status: 'pending', targetId: null, doneAt: null,
    };
    this.links.set(lid, link);
    if (!resend) {
      this._changed();
      return { lid, poll, code, sent: false };
    }
    // the emailed link carries a single-use token; only its hash is kept, for as long as the link lives
    const token = newToken();
    link.tokenHash = sha256(token);
    this._mailCount(emailHash, t);
    this._changed();
    return this._mailSend(link, address, token, lang === 'en' ? 'en' : 'zh', t).then(() => ({ lid, poll, code, sent: true, from: this.emailFrom }));
  }

  // 3 an hour and 10 a day per address, and the daily cap for everything this service sends
  _mailQuota(hash) {
    const t = this.now();
    this._mailPrune(t);
    const mine = this.mail.addr.get(hash) || [];
    const hour = mine.filter((x) => t - x < HOUR);
    const refuse = (bucket, oldest, windowMs) => Object.assign(new ApiError(429, 'rate_limited', 'Too many emails, try again later'),
      { bucket, retryAfter: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)) });
    if (hour.length >= MAIL_PER_ADDRESS_HOUR) throw refuse('email_address', Math.min(...hour), HOUR);
    if (mine.length >= MAIL_PER_ADDRESS_DAY) throw refuse('email_address', Math.min(...mine), DAY);
    if (this.mail.sent.length >= this.emailDailyCap) throw refuse('email_daily_cap', Math.min(...this.mail.sent), DAY);
  }

  _mailPrune(t = this.now()) {
    let changed = false;
    const sent = this.mail.sent.filter((x) => t - x < DAY);
    if (sent.length !== this.mail.sent.length) { this.mail.sent = sent; changed = true; }
    for (const [k, list] of this.mail.addr) {
      const kept = list.filter((x) => t - x < DAY);
      if (kept.length === list.length) continue;
      changed = true;
      if (kept.length) this.mail.addr.set(k, kept); else this.mail.addr.delete(k);
    }
    return changed;
  }

  _mailCount(hash, t) {
    this.mail.sent.push(t);
    this.mail.addr.set(hash, [...(this.mail.addr.get(hash) || []), t]);
  }

  // an email Resend refused for sure was never sent: it does not count
  _mailRefund(hash, t) {
    const i = this.mail.sent.indexOf(t);
    if (i >= 0) this.mail.sent.splice(i, 1);
    const list = this.mail.addr.get(hash) || [];
    const j = list.indexOf(t);
    if (j >= 0) list.splice(j, 1);
    if (!list.length) this.mail.addr.delete(hash);
  }

  async _mailSend(link, address, token, lang, t) {
    const { subject, text, html } = signInEmail({ url: linkUrl(link.lid, token, lang), lang, minutes: LINK_TTL / 60_000 });
    try {
      // the address goes to Resend and nowhere else; X-Entity-Ref-ID keeps Gmail from threading the emails together
      const { id } = await this.mailer.send({
        to: address, subject, text, html, idempotencyKey: `picasso-signin-${link.lid}`,
        headers: { 'X-Entity-Ref-ID': secretId(12) },
      });
      this.log('sign-in email sent', { id, last24h: this.mail.sent.length, cap: this.emailDailyCap });
    } catch (e) {
      // the link was never delivered (or may not have been): drop it, so it cannot be redeemed later
      if (this.links.get(link.lid) === link) this.links.delete(link.lid);
      if (e.definite !== false) this._mailRefund(link.emailHash, t);
      this._changed();
      this.log('sign-in email not sent', { code: e.code || 'error', status: e.status || 0, error: e.provider || '', counted: e.definite === false });
      if (e.code === 'rate_limited') {
        throw Object.assign(new ApiError(429, 'rate_limited', 'The email service is busy, try again later'), { bucket: 'email_provider', retryAfter: e.retryAfter || 60 });
      }
      throw new ApiError(502, 'send_failed', 'The email could not be sent, try again later');
    }
  }

  _link(lid) {
    const l = typeof lid === 'string' ? this.links.get(lid) : null;
    if (!l) return null;
    const t = this.now();
    const alive = l.status === 'done' ? t - l.doneAt < LINK_DONE_KEEP && t - l.createdAt < LINK_TTL + LINK_DONE_KEEP : t - l.createdAt < LINK_TTL;
    if (!alive) {
      this.links.delete(lid);
      this._changed();
      return null;
    }
    return l;
  }

  async emailComplete(lid, idToken, code = null) {
    this._requireEmailLink();
    if (!this._link(lid)) throw new ApiError(404, 'expired', 'This link has expired');
    if (typeof idToken !== 'string' || idToken.length > 4096) throw new ApiError(401, 'bad_token', 'Invalid sign-in');
    let claims;
    try {
      claims = await this.verifier.verify(idToken);
    } catch (e) {
      throw new ApiError(401, 'bad_token', 'Invalid sign-in');
    }
    // state may have changed while the keys were fetched
    const l = this._link(lid);
    if (!l) throw new ApiError(404, 'expired', 'This link has expired');
    const hash = this.emailHash(claims.email);
    if (hash !== l.emailHash) throw new ApiError(409, 'email_mismatch', 'The email does not match');
    if (l.status === 'done') {
      const target = this.accounts.get(l.targetId);
      return { ok: true, name: target ? target.name : '', nameReserved: target ? this.view(target).protected : false };
    }
    return this._finishLink(l, hash, String(claims.uid).slice(0, 128), code);
  }

  // The emailed link (EMAIL_SENDER=resend): its token proves the address, once. A wrong or malformed token answers
  // exactly like an unknown link; a used one (the link is done) 409 used. need_code / bad_code / at_table leave the
  // token valid (the person types the code, or leaves the table, and the page posts again), like a Firebase link.
  emailRedeem(lid, token, code = null) {
    this._requireEmailLink();
    const l = this._link(lid);
    const ok = !!l && !!l.tokenHash && typeof token === 'string' && LINK_TOKEN_RE.test(token) && sameHash(sha256(token), l.tokenHash);
    if (!ok) throw new ApiError(404, 'expired', 'This link has expired');
    if (l.status === 'done') throw new ApiError(409, 'used', 'This link was already used');
    return this._finishLink(l, l.emailHash, null, code);
  }

  // What a proven address does (both senders): bind it to the asking account, or sign that device in to the account
  // already saved under it (merging the asking guest into it). The link becomes done; the next poll hands out the token.
  _finishLink(l, hash, uid, code) {
    const lid = l.lid;
    const b = this.accounts.get(l.accountId);
    if (!b) {
      this.links.delete(lid);
      throw new ApiError(404, 'expired', 'This link has expired');
    }
    const t = this.now();
    const ownerId = this.byEmail.get(hash);
    if (b.email && b.email.hash !== hash) throw new ApiError(409, 'already_linked', 'This account is already saved with another email');
    let target;
    // Every completion that changes an account needs the code shown on the device that asked (B): a first save
    // binds the address to B (else anyone could claim someone else's address by sending them a link), a merge
    // signs B's device in to the address's account. The link page fills it in itself when opened on that device.
    if (ownerId !== b.id) {
      if (typeof code !== 'string' || !/^\d{4}$/.test(code) || !l.codeHash || sha256(`${lid}:${code}`) !== l.codeHash) {
        if (code !== null && code !== undefined && code !== '') {
          l.codeTries = (l.codeTries || 0) + 1;
          this._changed();
          if (l.codeTries >= CODE_TRIES) {
            this.links.delete(lid);
            throw new ApiError(404, 'expired', 'This link has expired');
          }
          throw Object.assign(new ApiError(409, 'bad_code', 'The code does not match'), { detail: { merge: !!ownerId } });
        }
        throw Object.assign(new ApiError(409, 'need_code', 'Enter the code shown on the device that asked'), { detail: { merge: !!ownerId } });
      }
    }
    if (ownerId && ownerId !== b.id) {
      // second device (or a guest who already saved): merge B into A, A keeps its name, B's bankroll is dropped
      const a = this.accounts.get(ownerId);
      if (this.tableInfo(b.id).seated) throw new ApiError(409, 'at_table', 'Leave the Hold\'em table first, then open the link again');
      this._merge(b, a);
      target = a;
    } else if (ownerId === b.id) {
      target = b;
    } else {
      b.email = { uid, masked: l.masked, hash, linkedAt: t };
      this.byEmail.set(hash, b.id);
      this._forgetIp(b.id);
      this._reindexNames();
      target = b;
    }
    l.status = 'done';
    l.targetId = target.id;
    l.doneAt = t;
    this._changed();
    this.onAccount(target.id);
    const v = this.view(target);
    return { ok: true, name: target.name, nameReserved: v.protected };
  }

  _merge(b, a) {
    a.holdem.hands += b.holdem.hands;
    a.holdem.won += b.holdem.won;
    // a fresh guest's lucky hands never lift a saved account's ranking (its losses still count)
    a.holdem.rnet = rnetOf(a) + (this.established(b) ? rnetOf(b) : Math.min(0, rnetOf(b)));
    a.holdem.net += b.holdem.net;
    a.holdem.showdowns += b.holdem.showdowns;
    a.holdem.biggestPot = Math.max(a.holdem.biggestPot, b.holdem.biggestPot);
    a.guandan.rounds += b.guandan.rounds;
    a.guandan.wins += b.guandan.wins;
    for (const k of Object.keys(b.guandan.seen)) a.guandan.seen[k] = 1;
    const keys = Object.keys(a.guandan.seen);
    for (let i = 0; i < keys.length - SEEN_MAX; i++) delete a.guandan.seen[keys[i]];
    for (const c of b.clientIds) this._attachClientId(a, c);
    // pending links of B now resolve to A
    for (const l of this.links.values()) if (l.accountId === b.id) l.accountId = a.id;
    this._delete(b);
  }

  emailPoll(lid, poll) {
    this._requireEmailLink();
    const l = this._link(lid);
    if (!l || typeof poll !== 'string' || sha256(poll) !== l.pollHash) throw new ApiError(404, 'expired', 'This link has expired');
    if (l.status !== 'done') return { status: 'pending' };
    const target = this.accounts.get(l.targetId);
    this.links.delete(lid);
    if (!target) throw new ApiError(404, 'expired', 'This link has expired');
    // the device that asked gets a fresh token for the saved account; its old token for that account is retired
    if (l.starterToken && this.byToken.get(l.starterToken) === target.id) {
      target.tokens = target.tokens.filter((x) => x.hash !== l.starterToken);
      this.byToken.delete(l.starterToken);
    }
    const token = this._issueToken(target);
    this._changed();
    return { status: 'done', token, account: this.view(target) };
  }

  signout(token) {
    const hash = sha256(token);
    const id = this.byToken.get(hash);
    const a = id ? this.accounts.get(id) : null;
    if (a) {
      a.tokens = a.tokens.filter((x) => x.hash !== hash);
      this.byToken.delete(hash);
      this._changed();
    }
    return { ok: true };
  }

  // ---------- table settlements (same synchronous step as the table change) ----------
  applySettlements({ chips = [], records = [] } = {}) {
    const touched = new Set();
    for (const c of chips) {
      const a = this.accounts.get(c.accountId);
      if (!a) { this.log('settlement for a missing account dropped', { reason: c.reason }); continue; }
      a.chips += c.amount;
      if (a.chips < 0) { this.log('bankroll below zero clamped', { reason: c.reason }); a.chips = 0; }
      touched.add(a.id);
    }
    // per hand: the chips fresh accounts lost, taken out of every winner's ranked gain in proportion
    const t = this.now();
    const fresh = (a) => !a || t - a.createdAt < ESTABLISHED_AGE || a.holdem.hands < ESTABLISHED_HANDS; // = !established(a)
    const freshLoss = new Map();
    for (const r of records) {
      if (!r.hand || r.net >= 0 || !fresh(this.accounts.get(r.accountId))) continue;
      freshLoss.set(r.hand, (freshLoss.get(r.hand) || 0) - r.net);
    }
    for (const r of records) {
      const a = this.accounts.get(r.accountId);
      if (!a) continue;
      const h = a.holdem;
      let rn = r.net;
      if (rn > 0 && r.gain > 0) rn = Math.floor(rn * Math.max(0, 1 - (freshLoss.get(r.hand) || 0) / r.gain));
      h.rnet = rnetOf(a) + rn;
      h.hands += r.hands;
      h.won += r.won;
      h.net += r.net;
      h.showdowns += r.showdowns;
      h.biggestPot = Math.max(h.biggestPot, r.biggestPot);
      touched.add(a.id);
    }
    if (touched.size) this._changed();
    return touched;
  }

  // ---------- housekeeping ----------
  sweep() {
    const t = this.now();
    let changed = false;
    for (const [k, list] of this.ip) {
      const kept = list.filter((e) => t - e.at < IP_TTL);
      if (kept.length !== list.length) {
        changed = true;
        if (kept.length) this.ip.set(k, kept); else this.ip.delete(k);
      }
    }
    for (const [sid, s] of this.sids) if (s.exp <= t) this.sids.delete(sid);
    for (const lid of [...this.links.keys()]) if (!this._link(lid)) changed = true;
    if (this._mailPrune(t)) changed = true;
    for (const a of [...this.accounts.values()]) {
      if (t - a.lastSeen > PRISTINE_TTL && this._pristine(a) && !a.guandan.rounds) {
        this._delete(a);
        changed = true;
      }
    }
    if (changed) this._changed();
  }
}
