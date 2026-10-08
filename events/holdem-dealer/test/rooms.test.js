// Rooms presence and the host role: standing up (to change seats, to watch) keeps the host; a host who leaves the
// table without a seat passes it on at once; a seated host without a socket keeps it for 60 s (reconnecting), then
// passes it on; an unseated host found gone (after a restart) after 15 s. Injected clock, fake sockets and accounts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, HOST_GONE_MS, HOST_UNSEATED_GONE_MS } from '../src/rooms.js';

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
