// Store: atomic batches (temp + fsync + rename, .bak), mode 600, debounce, refusal on a corrupt file, roll-forward
// of a batch interrupted between its renames, discard of a batch interrupted while writing its temp files.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Store, StoreError } from '../src/store.js';
import os from 'node:os';

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'holdem-store-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeStore(dir, state, debounceMs = 50) {
  const s = new Store({ dir, debounceMs });
  s.load();
  s.register('accounts', () => state.accounts);
  s.register('tables', () => state.tables);
  return s;
}

const read = (dir, n) => JSON.parse(fs.readFileSync(path.join(dir, `${n}.json`), 'utf8'));

test('a flush writes the dirty files as one batch, mode 600, with the previous file kept as .bak', () => {
  const dir = tmpDir();
  const state = { accounts: { n: 1 }, tables: { t: [] } };
  const s = makeStore(dir, state);
  s.markDirty('accounts');
  s.markDirty('tables');
  assert.equal(s.flush(), true);
  const a1 = read(dir, 'accounts');
  assert.equal(a1.v, 1);
  assert.deepEqual(a1.batch, ['accounts', 'tables']);
  assert.deepEqual(a1.data, { n: 1 });
  assert.equal(read(dir, 'tables').gen, a1.gen);
  for (const n of ['accounts', 'tables']) assert.equal(fs.statSync(path.join(dir, `${n}.json`)).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(path.join(dir, 'accounts.json.bak')), false, 'no .bak before a second write');
  state.accounts = { n: 2 };
  s.markDirty('accounts');
  s.flush();
  assert.deepEqual(read(dir, 'accounts').data, { n: 2 });
  const bak = JSON.parse(fs.readFileSync(path.join(dir, 'accounts.json.bak'), 'utf8'));
  assert.deepEqual(bak.data, { n: 1 });
  assert.equal(fs.statSync(path.join(dir, 'accounts.json.bak')).mode & 0o777, 0o600);
  assert.deepEqual(read(dir, 'accounts').batch, ['accounts']);
  assert.equal(s.flush(), false, 'nothing dirty, nothing written');
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
  // a fresh store loads what was written
  const s2 = new Store({ dir });
  assert.deepEqual(s2.load(), { accounts: { n: 2 }, tables: { t: [] } });
});

test('debounce: changes within the window are written once, about 200 ms after the first', async () => {
  const dir = tmpDir();
  const state = { accounts: { n: 0 }, tables: {} };
  const s = new Store({ dir });
  s.load();
  s.register('accounts', () => state.accounts);
  s.register('tables', () => state.tables);
  let writes = 0;
  const orig = s.flush.bind(s);
  s.flush = () => { const w = orig(); if (w) writes++; return w; };
  const t0 = Date.now();
  for (let i = 1; i <= 20; i++) { state.accounts = { n: i }; s.markDirty('accounts'); await sleep(5); }
  assert.equal(fs.existsSync(path.join(dir, 'accounts.json')), false);
  while (!fs.existsSync(path.join(dir, 'accounts.json'))) await sleep(5);
  const dt = Date.now() - t0;
  assert.ok(dt >= 190 && dt < 600, `written after ${dt} ms`);
  await sleep(250);
  assert.equal(writes, 1);
  assert.equal(read(dir, 'accounts').data.n, 20);
  s.close();
});

test('a corrupt file refuses the start and is never modified; a missing file with a .bak refuses too', () => {
  const dir = tmpDir();
  const state = { accounts: { n: 1 }, tables: {} };
  const s = makeStore(dir, state);
  s.markDirty('accounts');
  s.flush();
  state.accounts = { n: 2 };
  s.markDirty('accounts');
  s.flush();
  const f = path.join(dir, 'accounts.json');
  const garbage = '{"v":1,"gen":2,"batch":["acc';
  fs.writeFileSync(f, garbage);
  assert.throws(() => new Store({ dir }).load(), (e) => e instanceof StoreError && e.code === 'corrupt' && /\.bak/.test(e.message));
  assert.equal(fs.readFileSync(f, 'utf8'), garbage, 'left untouched');
  fs.writeFileSync(f, JSON.stringify({ hello: 'world' }));
  assert.throws(() => new Store({ dir }).load(), (e) => e.code === 'corrupt');
  fs.unlinkSync(f);
  assert.throws(() => new Store({ dir }).load(), (e) => e.code === 'missing');
  // restoring the .bak is the documented way back
  fs.copyFileSync(`${f}.bak`, f);
  assert.deepEqual(new Store({ dir }).load().accounts, { n: 1 });
});

test('crash between the renames of a batch: the next start rolls the batch forward (both files, same moment)', () => {
  const dir = tmpDir();
  const state = { accounts: { chips: 100 }, tables: { stack: 0 } };
  const s = makeStore(dir, state);
  s.markDirty('accounts'); s.markDirty('tables'); s.flush();
  // next batch: chips move from the bankroll to a table; the process dies after renaming accounts only
  state.accounts = { chips: 60 };
  state.tables = { stack: 40 };
  s.markDirty('accounts'); s.markDirty('tables');
  const realRename = fs.renameSync;
  let renames = 0;
  fs.renameSync = (a, b) => {
    if (a.endsWith('tables.json.tmp')) { renames++; throw Object.assign(new Error('killed'), { code: 'EKILLED' }); }
    return realRename(a, b);
  };
  try { s.flush(); } finally { fs.renameSync = realRename; }
  // the process is dead: no retry
  clearTimeout(s.timer); s.timer = null; s.closed = true;
  assert.equal(renames, 1);
  assert.equal(read(dir, 'accounts').data.chips, 60);
  assert.equal(read(dir, 'tables').data.stack, 0, 'tables.json still old on disk');
  assert.ok(fs.existsSync(path.join(dir, 'tables.json.tmp')));
  const loaded = new Store({ dir }).load();
  assert.deepEqual(loaded, { accounts: { chips: 60 }, tables: { stack: 40 } });
  assert.equal(read(dir, 'tables').data.stack, 40);
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
});

test('crash while the temp files were written: the old files stay, the partial batch is discarded', () => {
  const dir = tmpDir();
  const state = { accounts: { chips: 100 }, tables: { stack: 0 } };
  const s = makeStore(dir, state);
  s.markDirty('accounts'); s.markDirty('tables'); s.flush();
  const gen = read(dir, 'accounts').gen;
  // accounts temp complete, tables temp torn
  fs.writeFileSync(path.join(dir, 'accounts.json.tmp'), JSON.stringify({ v: 1, gen: gen + 1, batch: ['accounts', 'tables'], data: { chips: 60 } }));
  fs.writeFileSync(path.join(dir, 'tables.json.tmp'), '{"v":1,"gen":');
  assert.deepEqual(new Store({ dir }).load(), { accounts: { chips: 100 }, tables: { stack: 0 } });
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
  // the next write continues past the discarded generation's number without trouble
  const s2 = makeStore(dir, { accounts: { chips: 1 }, tables: { stack: 2 } });
  s2.markDirty('accounts'); s2.markDirty('tables'); s2.flush();
  assert.deepEqual(new Store({ dir }).load(), { accounts: { chips: 1 }, tables: { stack: 2 } });
});
