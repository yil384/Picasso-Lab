// Backups (src/backup.js, ops/backup.sh): a copy of both files from one moment (a flush during the read means another
// try), without the IP memory, mode 600; a restore puts both back as one batch the service starts from.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Store } from '../src/store.js';
import { save, restore } from '../src/backup.js';
import { tmpDir } from './service-helpers.js';

function seed(dir) {
  const store = new Store({ dir });
  store.load();
  const state = { accounts: { v: 1, accounts: [{ id: 'u_1', chips: 8000 }], ip: { k1: [{ a: 'u_1', n: 'Ann', at: 1 }] }, links: [], mail: { sent: [5, 6], addr: { h1: [5, 6] }, days: { 20000: 2 } } }, tables: { v: 1, tables: [{ code: 'T', seats: [{ id: 'u_1', stack: 2000 }] }] } };
  store.register('accounts', () => state.accounts);
  store.register('tables', () => state.tables);
  store.markDirty('accounts');
  store.markDirty('tables');
  store.flush();
  return { store, state };
}

test('save: one moment of both files, no IP memory, mode 600; a flush during the read is retried', async () => {
  const dir = tmpDir();
  const out = path.join(tmpDir(), 'b.json.gz');
  const { store, state } = seed(dir);
  // a buy-in moves 2,000 from the bankroll to the table in one batch, landing between the two reads of the first try
  const r = await save(dir, out, {
    afterRead: (k) => {
      if (k) return;
      state.accounts.accounts[0].chips = 6000;
      state.tables.tables[0].seats[0].stack = 4000;
      store.markDirty('accounts');
      store.markDirty('tables');
      store.flush();
    },
  });
  assert.equal(r.tries, 2, 'the torn first read was thrown away');
  assert.equal(fs.statSync(out).mode & 0o777, 0o600);
  const b = JSON.parse(zlib.gunzipSync(fs.readFileSync(out)).toString('utf8'));
  assert.equal(b.files.accounts.data.accounts[0].chips + b.files.tables.data.tables[0].seats[0].stack, 10_000);
  assert.deepEqual(b.files.accounts.data.ip, {}, 'no IP memory in a backup');
  assert.deepEqual(b.files.accounts.data.mail, { sent: [5, 6], addr: {}, days: { 20000: 2 } }, 'no inbox hash of an email request; the day\'s and the month\'s counts stay');
  assert.ok(!JSON.stringify(b).includes('Ann'));
  store.close();
});

test('restore: both files from one backup, one generation, the .bak copies gone; the service starts from them', async () => {
  const dir = tmpDir();
  const out = path.join(tmpDir(), 'b.json.gz');
  const { store, state } = seed(dir);
  await save(dir, out);
  state.accounts.accounts[0].chips = 1;
  store.markDirty('accounts');
  store.flush();
  store.close();
  assert.ok(fs.existsSync(path.join(dir, 'accounts.json.bak')));
  restore(out, dir);
  assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith('.bak')));
  for (const n of ['accounts', 'tables']) assert.equal(fs.statSync(path.join(dir, `${n}.json`)).mode & 0o777, 0o600);
  const again = new Store({ dir });
  const data = again.load();
  assert.equal(data.accounts.accounts[0].chips, 8000);
  assert.equal(data.tables.tables[0].seats[0].stack, 2000);
  const gens = ['accounts', 'tables'].map((n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8')).gen);
  assert.equal(gens[0], gens[1]);
});

test('a service that never opened a table has no tables.json: the backup and the restore keep it absent', async () => {
  const dir = tmpDir();
  const store = new Store({ dir });
  store.load();
  store.register('accounts', () => ({ v: 1, accounts: [{ id: 'u_9', chips: 10000 }], ip: { k: [] }, links: [] }));
  store.register('tables', () => ({ v: 1, tables: [] }));
  store.markDirty('accounts');
  store.flush();
  store.close();
  const out = path.join(tmpDir(), 'b.json.gz');
  const r = await save(dir, out);
  assert.deepEqual(r.gens, [1, null]);
  fs.writeFileSync(path.join(dir, 'tables.json'), '{"v":1,"gen":7,"batch":["tables"],"data":{"v":1,"tables":[]}}');
  restore(out, dir);
  assert.ok(!fs.existsSync(path.join(dir, 'tables.json')));
  assert.equal(new Store({ dir }).load().accounts.accounts[0].id, 'u_9');
});
