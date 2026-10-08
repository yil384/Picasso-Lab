// Rooms presence and the host role: standing up (to change seats, to watch) keeps the host; a host who leaves the
// table without a seat passes it on at once; a seated host without a socket keeps it for 60 s (reconnecting), then
// passes it on; an unseated host found gone (after a restart) after 15 s. Injected clock, fake sockets and accounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, HOST_GONE_MS, HOST_UNSEATED_GONE_MS, WAITING_GONE_MS, WATCH_MISS_MAX, WATCH_MISS_NET_MAX, WATCH_MISS_NET_DAY } from '../src/rooms.js';

function setup() {
  let clock = 1_000_000;
  const accounts = new Map();
  for (const n of ['a', 'b', 'c']) accounts.set(`u_${n}`, { id: `u_${n}`, pid: `p_${n}`, name: n.toUpperCase(), chips: 10_000 });
  const acc = {
    get: (id) => accounts.get(id),
    view: (a) => ({ pid: a.pid, name: a.name, chips: a.chips }),
    nameAllowed: () => true,
    applySettlements: ({ chips }) => {
      const touched = new Set();
      for (const c of chips) { accounts.get(c.accountId).chips += c.amount; touched.add(c.accountId); }
      return touched;
    },
  };
  const rooms = new Rooms({ accounts: acc, now: () => clock });
  const conn = (id) => {
    const c = { accountId: id, frames: [], send(m) { c.frames.push(typeof m === 'string' ? JSON.parse(m) : m); }, close() {} };
    rooms.attach(c);
    return c;
  };
  return { rooms, conn, tick: (ms) => { clock += ms; }, accounts };
}

const hostOf = (rooms, code) => rooms.get(code).host.id;

test('host: standing keeps the role; leaving unseated passes it on at once', () => {
  const { rooms, conn } = setup();
  const a = conn('u_a');
  const b = conn('u_b');
  rooms.handle(a, { t: 'create', settings: { seats: 6 } });
  const code = a.frames.find((m) => m.t === 'created').code;
  rooms.handle(b, { t: 'watch', code });
  rooms.handle(a, { t: 'sit', seat: 0, buyIn: 2000 });
  rooms.handle(b, { t: 'sit', seat: 1, buyIn: 2000 });
  // the host changes seats: stand, sit elsewhere; still the host
  rooms.handle(a, { t: 'stand' });
  assert.equal(hostOf(rooms, code), 'u_a');
  rooms.handle(a, { t: 'sit', seat: 3, buyIn: 1500 });
  assert.equal(hostOf(rooms, code), 'u_a');
  rooms.handle(a, { t: 'host', op: 'start' });
  assert.equal(rooms.get(code).phase, 'running');
  // the host stands to watch: still the host; then leaves the table (its socket goes): b at once
  rooms.handle(a, { t: 'stand' });
  assert.equal(hostOf(rooms, code), 'u_a');
  rooms.detach(a);
  assert.equal(hostOf(rooms, code), 'u_b');
  const last = b.frames.filter((m) => m.t === 'state').pop();
  assert.equal(last.table.host, 'p_b');
  rooms.stop();
});

test('host: seated and disconnected keeps the role for 60 s, then passes it on; unseated after a restart 15 s', () => {
  const { rooms, conn, tick } = setup();
  const a = conn('u_a');
  const b = conn('u_b');
  rooms.handle(a, { t: 'create', settings: { seats: 6 } });
  const code = a.frames.find((m) => m.t === 'created').code;
  rooms.handle(b, { t: 'watch', code });
  rooms.handle(a, { t: 'sit', seat: 0, buyIn: 2000 });
  rooms.handle(b, { t: 'sit', seat: 1, buyIn: 2000 });
  rooms.detach(a); // a's phone drops
  tick(HOST_GONE_MS - 1000);
  rooms.sweep();
  assert.equal(hostOf(rooms, code), 'u_a');
  const a2 = conn('u_a'); // back in time
  rooms.handle(a2, { t: 'watch', code });
  tick(HOST_GONE_MS * 2);
  rooms.sweep();
  assert.equal(hostOf(rooms, code), 'u_a');
  rooms.detach(a2);
  tick(HOST_GONE_MS);
  rooms.sweep();
  assert.equal(hostOf(rooms, code), 'u_b');
  rooms.stop();

  // an unseated host restored from disk and never back: 15 s
  const { rooms: r2, conn: conn2 } = setup();
  const c = conn2('u_a');
  const d = conn2('u_b');
  r2.handle(c, { t: 'create', settings: { seats: 6 } });
  const code2 = c.frames.find((m) => m.t === 'created').code;
  r2.handle(d, { t: 'watch', code: code2 });
  r2.handle(d, { t: 'sit', seat: 1, buyIn: 2000 });
  const restored = new Rooms({ accounts: r2.accounts, now: () => 2_000_000 });
  restored.restore(r2.toJSON());
  restored.now = () => 2_000_000 + HOST_UNSEATED_GONE_MS - 1;
  restored.sweep();
  assert.equal(restored.get(code2).host.id, 'u_a');
  restored.now = () => 2_000_000 + HOST_UNSEATED_GONE_MS;
  restored.sweep();
  assert.equal(restored.get(code2).host.id, 'u_b');
  restored.stop();
  r2.stop();
});

test('a running table that cannot deal stands up a player gone for 10 minutes (its chips are not held forever)', () => {
  const { rooms, conn, tick, accounts } = setup();
  const a = conn('u_a');
  const b = conn('u_b');
  rooms.handle(a, { t: 'create', settings: { seats: 2 } });
  const code = a.frames.find((m) => m.t === 'created').code;
  rooms.handle(b, { t: 'watch', code });
  rooms.handle(a, { t: 'sit', seat: 0, buyIn: 2000 });
  rooms.handle(b, { t: 'sit', seat: 1, buyIn: 2000 });
  rooms.handle(a, { t: 'host', op: 'start' });
  rooms.handle(b, { t: 'stand' });
  const t = rooms.get(code);
  assert.equal(t.phase, 'running');
  assert.ok(!(t.hand && !t.hand.done), 'no live hand, and none can be dealt');
  rooms.detach(a);
  rooms.sweep();
  assert.equal(t.seatOf('u_a'), 0);
  tick(WAITING_GONE_MS);
  rooms.sweep();
  assert.equal(t.seatOf('u_a'), -1, 'stood up');
  assert.equal(accounts.get('u_a').chips + accounts.get('u_b').chips, 20_000, 'every chip back in the bankrolls');
  rooms.stop();
});

test('guessing table codes: an account that misses too often in a minute has its socket closed', () => {
  const { rooms, conn, tick } = setup();
  const a = conn('u_a');
  let closed = null;
  a.close = (code, reason) => { closed = { code, reason }; };
  for (let k = 0; k < WATCH_MISS_MAX; k++) rooms.handle(a, { t: 'watch', code: `ZZZ${k}` });
  assert.equal(closed, null);
  assert.equal(a.frames.filter((m) => m.t === 'error' && m.code === 'no_table').length, WATCH_MISS_MAX);
  rooms.handle(a, { t: 'watch', code: 'ZZZZZ' });
  assert.deepEqual(closed, { code: 1008, reason: 'too_many_misses' });
  // the count is per account and per minute
  closed = null;
  tick(60_000);
  rooms.handle(a, { t: 'watch', code: 'ZZZZZ' });
  assert.equal(closed, null);
  rooms.stop();
});

test('guessing table codes from many fresh accounts on one network: a minute and a daily ceiling per network', () => {
  const { rooms, conn, tick, accounts } = setup();
  const host = conn('u_a');
  rooms.handle(host, { t: 'create', settings: { blinds: '10/20', seats: 6 } });
  const code = host.frames.find((m) => m.t === 'created').code;
  let n = 0;
  const guesser = () => {
    const id = `u_g${n++}`; // a new guest for every few guesses
    accounts.set(id, { id, pid: `p_g${n}`, name: 'G', chips: 10_000 });
    const c = conn(id);
    c.ipKey = 'net-1';
    c.closed = null;
    c.close = (code2, reason) => { c.closed = reason; };
    return c;
  };
  let c = guesser();
  for (let k = 0; k < WATCH_MISS_NET_MAX; k++) {
    if (k % 20 === 0) c = guesser();
    rooms.handle(c, { t: 'watch', code: `QQQ${k}` });
  }
  assert.equal(c.closed, null, 'each account stays under its own limit');
  rooms.handle(c, { t: 'watch', code: 'QQQQQ' });
  assert.equal(c.closed, 'too_many_misses', 'the network went over its minute ceiling');
  // a day's worth of slow guessing: the network is shut out of code lookups, even of a real code
  let misses = WATCH_MISS_NET_MAX + 1;
  while (misses < WATCH_MISS_NET_DAY) {
    tick(60_000);
    c = guesser();
    for (let k = 0; k < 20 && misses < WATCH_MISS_NET_DAY; k++, misses++) rooms.handle(c, { t: 'watch', code: `RRR${k}` });
  }
  c = guesser();
  rooms.handle(c, { t: 'watch', code });
  assert.equal(c.closed, 'too_many_misses');
  assert.equal(c.watching ?? null, null);
  const other = conn('u_b');
  other.ipKey = 'net-2';
  rooms.handle(other, { t: 'watch', code });
  assert.ok(other.frames.some((m) => m.t === 'state'), 'another network still finds the table');
  tick(24 * 3600_000);
  c = guesser();
  rooms.handle(c, { t: 'watch', code });
  assert.equal(c.closed, null, 'the next day the network may look tables up again');
  rooms.stop();
});
