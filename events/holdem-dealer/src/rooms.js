// Rooms: the registry of open Hold'em tables around the pure engine (DESIGN.md sections 6, 9, 10).
//
// For every table: one timer, armed at the earliest of table.nextWakeAt() and the bot's planned action; bots decide
// from viewFor(seat) only and act after ai.thinkDelay() x BOT_THINK_SCALE. After every successful mutation or tick
// the same synchronous step drains table.settlements() into the accounts, marks both files dirty (one flush writes
// them together), pushes { t:"account" } to the accounts whose bankroll or records changed and sends every watcher
// its own snapshot built by views.js (public table + that recipient's Me). Nothing else ever serializes a table for
// a client.
//
// Presence: a seated human is `connected` while any socket of the account watches the table. A host that has no
// socket on the table for 60 s hands the host role on (releaseHost). In the waiting phase (no hands, so no
// timeouts) a seated human gone for 10 minutes is stood up, which lets the engine's idle close run. Tables close
// as idle 10 minutes after the last human seat is gone (engine). At most 200 open tables; an account hosts at most 3.
//
//   new Rooms({ accounts, store, now, botThinkScale, paceScale, rng, botRng, log, onChange })
//   attach(conn), detach(conn)        conn = { accountId, send(obj|string), close(code, reason), watching }
//   handle(conn, msg)                 a validated client message (see protocol.js)
//   restore(data), toJSON()           tables.json; a restored live hand gives its actor a fresh full timer
//   tableInfo(accountId) -> { seated, chips }
//   notifyAccount(id), dropAccount(id, code, reason)
//   sweep(), stats() -> { tables, players }, stop()
//   get(code) -> HoldemTable | null

import { HoldemTable, normalizeSettings, defaultBuyIn, TIMING } from './engine/table.js';
import { cryptoRng } from './engine/cards.js';
import { decide, thinkDelay } from './engine/ai.js';
import { publicTable, me as meView } from './views.js';

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const MAX_TABLES = 200;
export const MAX_HOSTED = 3;
export const HOST_GONE_MS = 60_000;
export const WAITING_GONE_MS = 10 * 60_000;
const PRACTICE_BOTS = 5;
const MAX_DELAY = 2 ** 31 - 1;

// test-only pacing scale (PACE_SCALE); applied to the engine's pacing pauses, never to action timers
const BASE_TIMING = { ...TIMING };
const PACED = ['street', 'runout', 'hold', 'holdShowdown', 'startDelay'];
export function setPaceScale(scale = 1) {
  for (const k of PACED) TIMING[k] = Math.max(1, Math.round(BASE_TIMING[k] * scale));
}

const mathRng = (n) => Math.floor(Math.random() * n);

export class Rooms {
  constructor({
    accounts, store = null, now = Date.now, botThinkScale = 1, paceScale = 1, rng = cryptoRng, botRng = mathRng,
    log = () => {}, onChange = () => {},
  }) {
    this.accounts = accounts;
    this.store = store;
    this.now = now;
    this.botThinkScale = botThinkScale;
    this.rng = rng;
    this.botRng = botRng;
    this.log = log;
    this.onChange = onChange; // test hook: (table) after every change, before the broadcast
    this.tables = new Map(); // code -> entry
    this.conns = new Set();
    this.byAccount = new Map(); // accountId -> Set<conn>
    this.stopped = false;
    setPaceScale(paceScale);
  }

  // ---------- connections ----------
  attach(conn) {
    conn.watching = null;
    this.conns.add(conn);
    if (!this.byAccount.has(conn.accountId)) this.byAccount.set(conn.accountId, new Set());
    this.byAccount.get(conn.accountId).add(conn);
  }

  detach(conn) {
    if (!this.conns.has(conn)) return;
    this.unwatch(conn);
    this.conns.delete(conn);
    const set = this.byAccount.get(conn.accountId);
    if (set) {
      set.delete(conn);
      if (!set.size) this.byAccount.delete(conn.accountId);
    }
  }

  notifyAccount(id) {
    const set = this.byAccount.get(id);
    const a = this.accounts.get(id);
    if (!set || !a) return;
    const text = JSON.stringify({ t: 'account', account: this.accounts.view(a) });
    for (const c of set) c.send(text);
  }

  dropAccount(id, code = 4001, reason = 'account_changed') {
    const set = this.byAccount.get(id);
    if (!set) return;
    for (const c of [...set]) {
      this.detach(c);
      c.close(code, reason);
    }
  }

  get(code) {
    return this.tables.get(code)?.table || null;
  }

  // ---------- messages ----------
  handle(conn, msg) {
    const fail = (code) => conn.send({ t: 'error', code, re: msg.t });
    if (this.stopped) return fail('restarting');
    const account = this.accounts.get(conn.accountId);
    if (!account) {
      fail('no_account');
      return this.dropAccount(conn.accountId);
    }
    switch (msg.t) {
      case 'create': return this._create(conn, account, msg, fail);
      case 'watch': {
        const entry = this.tables.get(msg.code);
        if (!entry) return fail('no_table');
        return this.watch(conn, msg.code);
      }
      case 'unwatch': return this.unwatch(conn);
      default: break;
    }
    const entry = conn.watching ? this.tables.get(conn.watching) : null;
    if (!entry) return fail('no_table');
    const t = entry.table;
    const now = this.now();
    const id = account.id;
    let r;
    switch (msg.t) {
      case 'sit':
        if (!this.accounts.nameAllowed(account)) return fail('name_protected');
        r = t.sit({ id, pid: account.pid, name: account.name, chips: account.chips }, msg.seat, msg.buyIn, now);
        break;
      case 'stand': r = t.stand(id, now); break;
      case 'sitOut': r = t.setSitOut(id, msg.on, now); break;
      case 'postBB': r = t.postBB(id, now); break;
      case 'act': r = t.act(id, msg.hand, msg.action, msg.to ?? null, now); break;
      case 'show': r = t.show(id, now); break;
      case 'topUp': r = t.requestTopUp(id, msg.amount, account.chips, now); break;
      case 'host': {
        const args = msg.op === 'settings' ? { settings: msg.settings }
          : msg.op === 'removeBot' ? { seat: msg.seat }
            : msg.op === 'fillBots' ? { count: msg.count } : {};
        r = t.hostOp(id, msg.op, args, now);
        break;
      }
      default: return fail('bad_message');
    }
    if (!r.ok) return fail(r.error);
    this._after(entry, now);
  }

  _newCode() {
    for (let k = 0; k < 1000; k++) {
      let code = '';
      for (let i = 0; i < 5; i++) code += CODE_ALPHABET[cryptoRng(CODE_ALPHABET.length)];
      if (!this.tables.has(code)) return code;
    }
    throw new Error('no free table code');
  }

  _create(conn, account, msg, fail) {
    if (this.tables.size >= MAX_TABLES) return fail('too_many_tables');
    let hosted = 0;
    for (const e of this.tables.values()) if (e.table.host && e.table.host.id === account.id) hosted++;
    if (hosted >= MAX_HOSTED) return fail('too_many_tables');
    const practice = msg.practice === true;
    const input = { ...(msg.settings || {}) };
    if (practice) input.seats = 6;
    const ns = normalizeSettings(input);
    if (!ns.ok) return fail('bad_settings');
    let buyIn = 0;
    if (practice) {
      if (!this.accounts.nameAllowed(account)) return fail('name_protected');
      buyIn = defaultBuyIn(ns.settings, account.chips);
      if (buyIn < ns.settings.minBuyIn) return fail('insufficient_chips');
    }
    const now = this.now();
    const code = this._newCode();
    const table = new HoldemTable({
      code, settings: ns.settings, host: { id: account.id, pid: account.pid }, now, rng: this.rng,
    });
    const entry = this._entry(table);
    if (practice) {
      const steps = [
        table.sit({ id: account.id, pid: account.pid, name: account.name, chips: account.chips }, 0, buyIn, now),
        table.hostOp(account.id, 'fillBots', { count: PRACTICE_BOTS }, now),
        table.hostOp(account.id, 'start', {}, now),
      ];
      const bad = steps.find((s) => !s.ok);
      if (bad) this.log('practice table setup step failed', { error: bad.error });
    }
    this.tables.set(code, entry);
    conn.send({ t: 'created', code });
    this._addWatcher(entry, conn, now);
    this.log('table created', { code, practice, tables: this.tables.size });
    this._after(entry, now);
  }

  _entry(table) {
    return { table, watchers: new Set(), timer: null, bot: null, gone: new Map(), hostGoneSince: null, idleWakes: 0 };
  }

  watch(conn, code) {
    const entry = this.tables.get(code);
    if (!entry) return;
    if (conn.watching === code) {
      this._sendState(entry, conn, this.now());
      return;
    }
    this.unwatch(conn);
    const now = this.now();
    const changed = this._addWatcher(entry, conn, now);
    if (changed) this._after(entry, now);
    else this._sendState(entry, conn, now);
  }

  // returns true when the table changed (a seated player came back)
  _addWatcher(entry, conn, now) {
    entry.watchers.add(conn);
    conn.watching = entry.table.code;
    entry.gone.delete(conn.accountId);
    if (entry.table.host && entry.table.host.id === conn.accountId) entry.hostGoneSince = null;
    const seat = entry.table.seatOf(conn.accountId);
    if (seat >= 0 && !entry.table.seats[seat].connected) {
      entry.table.setConnected(conn.accountId, true);
      return true;
    }
    return false;
  }

  unwatch(conn) {
    const code = conn.watching;
    conn.watching = null;
    const entry = code ? this.tables.get(code) : null;
    if (!entry || !entry.watchers.delete(conn)) return;
    const id = conn.accountId;
    const still = [...entry.watchers].some((c) => c.accountId === id);
    if (still) return;
    const now = this.now();
    entry.gone.set(id, now);
    if (entry.table.host && entry.table.host.id === id) entry.hostGoneSince = now;
    if (entry.table.seatOf(id) >= 0) {
      entry.table.setConnected(id, false);
      this._after(entry, now);
    }
  }

  // ---------- the one place a table change becomes durable and visible ----------
  _after(entry, now = this.now()) {
    const t = entry.table;
    const s = t.settlements();
    const touched = this.accounts.applySettlements(s);
    this.store?.markDirty('tables');
    if (touched.size) this.store?.markDirty('accounts');
    try { this.onChange(t); } catch (e) { this.log('onChange hook failed', { error: e.message }); }
    for (const id of touched) this.notifyAccount(id);
    if (t.phase === 'closed') return this._closed(entry);
    this._planBot(entry, now);
    this._broadcast(entry, now);
    this._schedule(entry);
  }

  _closed(entry) {
    const t = entry.table;
    clearTimeout(entry.timer);
    entry.timer = null;
    this.tables.delete(t.code);
    const text = JSON.stringify({ t: 'closed', code: t.code, reason: t.closedReason });
    for (const c of entry.watchers) {
      c.watching = null;
      c.send(text);
    }
    entry.watchers.clear();
    this.store?.markDirty('tables');
    this.log('table closed', { code: t.code, reason: t.closedReason, tables: this.tables.size });
  }

  _stateText(entry, conn, now, pub) {
    const t = entry.table;
    const a = this.accounts.get(conn.accountId);
    const m = meView(t, conn.accountId, a ? { pid: a.pid, chips: a.chips } : null);
    return `{"t":"state","rev":${t.rev},"table":${pub},"me":${JSON.stringify(m)},"serverTime":${now}}`;
  }

  _sendState(entry, conn, now) {
    conn.send(this._stateText(entry, conn, now, JSON.stringify(publicTable(entry.table, now))));
  }

  _broadcast(entry, now) {
    if (!entry.watchers.size) return;
    const pub = JSON.stringify(publicTable(entry.table, now));
    for (const c of entry.watchers) c.send(this._stateText(entry, c, now, pub));
  }

  // ---------- time ----------
  _botKey(t, a) {
    return `${a.handId}:${a.seat}:${t.hand.log.length}`;
  }

  _planBot(entry, now) {
    const t = entry.table;
    const a = t.actor();
    if (!a || !a.bot) { entry.bot = null; return; }
    const key = this._botKey(t, a);
    if (entry.bot && entry.bot.key === key) return;
    let decision;
    let delay;
    try {
      const view = t.viewFor(a.seat);
      decision = decide(view, { rng: this.botRng });
      delay = Math.round(thinkDelay(view, decision, this.botRng) * this.botThinkScale);
    } catch (e) {
      // never stall a table on a bot: check or fold after a second
      this.log('bot decision failed', { error: e.message });
      const L = t.legalFor(a.seat);
      decision = { action: L && L.check ? 'check' : 'fold', to: null };
      delay = 1000;
    }
    entry.bot = { key, at: now + delay, decision };
  }

  _schedule(entry) {
    if (this.stopped) return;
    clearTimeout(entry.timer);
    entry.timer = null;
    let at = entry.table.nextWakeAt();
    if (entry.bot && (at === null || entry.bot.at < at)) at = entry.bot.at;
    if (at === null) return;
    let delay = Math.min(Math.max(0, at - this.now()), MAX_DELAY);
    if (delay === 0 && entry.idleWakes > 3) delay = 1000; // never spin on a wake that changes nothing
    entry.timer = setTimeout(() => this._wake(entry), delay);
  }

  _wake(entry) {
    entry.timer = null;
    if (this.stopped || this.tables.get(entry.table.code) !== entry) return;
    const t = entry.table;
    const now = this.now();
    let changed = t.tick(now);
    if (t.phase !== 'closed') {
      const a = t.actor();
      const plan = entry.bot;
      if (a && a.bot && plan && plan.key === this._botKey(t, a) && plan.at <= now) {
        entry.bot = null;
        let r = plan.decision ? t.act(a.id, a.handId, plan.decision.action, plan.decision.to, now) : { ok: false, error: 'no_decision' };
        if (!r.ok) {
          this.log('bot action refused, checking or folding', { error: r.error });
          const L = t.legalFor(a.seat);
          r = t.act(a.id, a.handId, L && L.check ? 'check' : 'fold', null, now);
        }
        changed = changed || r.ok;
      }
    }
    entry.idleWakes = changed ? 0 : entry.idleWakes + 1;
    if (changed) this._after(entry, now);
    else { this._planBot(entry, now); this._schedule(entry); }
  }

  // presence rules (every 15 s from the server)
  sweep() {
    const now = this.now();
    for (const entry of [...this.tables.values()]) {
      const t = entry.table;
      let changed = false;
      if (t.host && entry.hostGoneSince !== null && now - entry.hostGoneSince >= HOST_GONE_MS) {
        const r = t.releaseHost(t.host.id, now);
        if (r.ok) { changed = true; entry.hostGoneSince = null; }
      } else if (t.host && entry.hostGoneSince === null && ![...entry.watchers].some((c) => c.accountId === t.host.id)) {
        entry.hostGoneSince = now;
      }
      if (t.phase === 'waiting') {
        for (const s of t.seats) {
          if (!s || s.bot || s.connected) continue;
          const since = entry.gone.get(s.id) ?? now;
          if (!entry.gone.has(s.id)) entry.gone.set(s.id, now);
          if (now - since >= WAITING_GONE_MS && t.stand(s.id, now).ok) changed = true;
        }
      }
      if (changed) this._after(entry, now);
    }
  }

  // ---------- reading ----------
  tableInfo(accountId) {
    let seated = false;
    let chips = 0;
    for (const { table: t } of this.tables.values()) {
      const i = t.seatOf(accountId);
      if (i < 0) continue;
      seated = true;
      const s = t.seats[i];
      const live = t.hand && !t.hand.done && s.inHand;
      chips += s.stack + s.pendingTopUp + (live ? s.contrib : 0);
    }
    return { seated, chips };
  }

  stats() {
    let players = 0;
    for (const { table: t } of this.tables.values()) for (const s of t.seats) if (s && !s.bot) players++;
    return { tables: this.tables.size, players };
  }

  // ---------- persistence ----------
  toJSON() {
    return { v: 1, tables: [...this.tables.values()].filter((e) => e.table.phase !== 'closed').map((e) => e.table.toJSON()) };
  }

  restore(data) {
    if (!data || !Array.isArray(data.tables)) return;
    const now = this.now();
    for (const obj of data.tables) {
      const table = HoldemTable.fromJSON(obj, { rng: this.rng, now });
      if (table.phase === 'closed' || this.tables.has(table.code)) continue;
      const entry = this._entry(table);
      for (const s of table.seats) {
        if (!s || s.bot) continue;
        table.setConnected(s.id, false);
        entry.gone.set(s.id, now);
      }
      if (table.host) entry.hostGoneSince = now;
      this.tables.set(table.code, entry);
      // nothing is ever saved undrained, but apply anything found rather than lose it
      const s = table.settlements();
      if (s.chips.length || s.records.length) {
        this.log('restored table had queued settlements', { code: table.code });
        this.accounts.applySettlements(s);
      }
      this._planBot(entry, now);
      this._schedule(entry);
    }
    this.log('tables restored', { tables: this.tables.size });
  }

  stop() {
    this.stopped = true;
    for (const e of this.tables.values()) { clearTimeout(e.timer); e.timer = null; }
  }
}
