// Restarts (DESIGN.md sections 9, 10).
// 1. Graceful: stop the dealer mid-hand (once while a bot must act, once while a human must act); every socket
//    closes with 1012; the data file holds no deck, burn or hole card; a new server on the same DATA_DIR restores
//    the table with the live hand called off (every chip put in back on its seat, nothing recorded); the clients
//    reconnect, see which hand was called off, a new hand is dealt and play goes on; chips are conserved.
// 2. kill -9 (a child process, no flush): the files always parse; after the restart chips are conserved across
//    accounts.json and tables.json and every change acknowledged more than the debounce window before the kill
//    is there.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  startTest, newGuest, connect, truthRecorder, chipsTotal, until, autoPlay, checkFrames, floatRng, tmpDir, api, sleep,
} from './service-helpers.js';

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CARD = /^[2-9TJQKA][shdc]$/;
function cardsIn(v, out = new Set()) {
  if (typeof v === 'string') { if (CARD.test(v)) out.add(v); } else if (Array.isArray(v)) v.forEach((x) => cardsIn(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => cardsIn(x, out));
  return out;
}

test('graceful restart mid-hand: 1012, no hidden card on disk, the hand called off with every chip back, play goes on', async () => {
  const dir = tmpDir();
  const truth = truthRecorder();
  const over = { DATA_DIR: dir, BOT_THINK_SCALE: '0.05' };
  let svc = await startTest(over, { onChange: (t) => truth.hook(t) });
  const A = await newGuest(svc, 'Avi');
  const B = await newGuest(svc, 'Bo');
  const ids = [A.id, B.id];
  let ca = await connect(svc, A.token);
  let cb = await connect(svc, B.token);
  const old = [ca, cb];
  ca.send({ t: 'create', settings: { blinds: '10/20', seats: 4 } });
  const { code } = await ca.waitFor((m) => m.t === 'created');
  ca.send({ t: 'sit', seat: 0, buyIn: 2000 });
  await ca.waitFor((m) => m.t === 'state' && m.me.seat === 0);
  cb.send({ t: 'watch', code });
  cb.send({ t: 'sit', seat: 2, buyIn: 1500 });
  await cb.waitFor((m) => m.t === 'state' && m.me.seat === 2);
  ca.send({ t: 'host', op: 'fillBots', count: 2 });
  await ca.waitFor((m) => m.t === 'state' && m.table.seats.filter(Boolean).length === 4);
  autoPlay(ca, { rng: floatRng(51) });
  autoPlay(cb, { rng: floatRng(52) });
  ca.send({ t: 'host', op: 'start' });
  await until(() => truth.handsDone(code) >= 2, { what: 'two hands' });

  for (const who of ['bot', 'human']) {
    // freeze at a moment where `who` must act in a live hand
    await new Promise((resolve) => {
      const check = (t) => {
        const a = t.actor();
        if (t.code !== code || !a || !!a.bot !== (who === 'bot')) return;
        truth.checks.delete(check);
        ca.playing = cb.playing = false;
        resolve();
      };
      truth.checks.add(check);
    });
    const live = svc.rooms.get(code);
    const total = chipsTotal(svc, code, ids);
    const snap = live.snapshot();
    assert.ok(snap.hand && !snap.hand.done);
    const records = ids.map((id) => svc.accounts.get(id).holdem.hands);
    const closing = [ca.waitClose(), cb.waitClose()];
    await svc.stop();
    const codes = (await Promise.all(closing)).map((c) => c.code);
    assert.deepEqual(codes, [1012, 1012]);
    // on disk: the table without its deck, burns or any hole card that was not shown; file mode 600
    const file = JSON.parse(fs.readFileSync(path.join(dir, 'tables.json'), 'utf8'));
    const onDisk = file.data.tables.find((t) => t.code === code);
    assert.equal(onDisk.hand.id, snap.hand.id);
    assert.equal(onDisk.hand.deck, undefined);
    assert.equal(onDisk.hand.burns, undefined);
    assert.ok(onDisk.seats.every((x) => !x || x.hole === null));
    const shown = cardsIn([snap.hand.board, snap.hand.shown, snap.seats.map((x) => x && x.shown), snap.last]);
    const hidden = [...snap.hand.deck, ...snap.hand.burns, ...snap.seats.flatMap((x) => (x && x.hole) || [])].filter((c) => !shown.has(c));
    const leaked = hidden.filter((c) => cardsIn(file).has(c));
    assert.deepEqual(leaked, [], 'no hidden card anywhere in tables.json');
    assert.equal(fs.statSync(path.join(dir, 'tables.json')).mode & 0o777, 0o600);

    svc = await startTest(over, { onChange: (t) => truth.hook(t) });
    assert.equal(chipsTotal(svc, code, ids), total, 'chips conserved across the restart');
    const back = svc.rooms.get(code);
    assert.equal(back.s.voided.no, snap.hand.no, 'the live hand was called off');
    assert.ok(!back.hand || back.hand.id !== snap.hand.id);
    assert.deepEqual(ids.map((id) => svc.accounts.get(id).holdem.hands), records, 'a called-off hand is not recorded');
    // every chip put in went back to its seat (the new hand, if dealt already, has only its blinds in)
    if (!back.hand) {
      assert.deepEqual(back.seats.map((x) => x && x.stack), snap.seats.map((x) => x && x.stack + x.contrib + (x.pendingTopUp || 0)));
    }
    ca = await connect(svc, A.token);
    cb = await connect(svc, B.token);
    old.push(ca, cb);
    ca.send({ t: 'watch', code });
    cb.send({ t: 'watch', code });
    const sa = await ca.waitFor((m) => m.t === 'state');
    const sb = await cb.waitFor((m) => m.t === 'state');
    for (const [st, seat] of [[sa, 0], [sb, 2]]) {
      assert.equal(st.table.voided, snap.hand.no, 'the page learns which hand was called off');
      assert.equal(st.me.seat, seat, 'the seat was kept');
      assert.ok(!st.table.hand || st.table.hand.id !== snap.hand.id);
    }
    autoPlay(ca, { rng: floatRng(53) });
    autoPlay(cb, { rng: floatRng(54) });
    const doneBefore = truth.handsDone(code);
    await until(() => truth.handsDone(code) >= doneBefore + 2, { what: 'two more hands' });
    assert.ok(!truth.done.get(code)?.has(snap.hand.id), 'the called-off hand never finished');
    // conservation holds while play continues (sampled between steps)
    assert.equal(chipsTotal(svc, code, ids), total, 'chips conserved after the restart');
  }
  ca.playing = cb.playing = false;
  for (const c of old) checkFrames(c, truth, c === old[0] || old.indexOf(c) % 2 === 0 ? A.account.pid : B.account.pid);
  for (const c of old) c.close();
  await svc.stop();
});

// ---------- kill -9 ----------
function spawnServer(dir) {
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: PKG,
    env: {
      PATH: process.env.PATH, PORT: '0', DATA_DIR: dir, ALLOWED_ORIGINS: 'http://127.0.0.1:*', TRUST_PROXY: '1',
      BOT_THINK_SCALE: '0', PACE_SCALE: '0.05',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let err = '';
  child.stderr.on('data', (d) => { err += d; });
  return new Promise((resolve, reject) => {
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
      const m = /"msg":"dealer listening","port":(\d+)/.exec(buf);
      if (m) resolve({ child, url: `http://127.0.0.1:${m[1]}` });
    });
    child.on('exit', (code) => reject(new Error(`server exited ${code}: ${err}`)));
  });
}

function readFiles(dir) {
  const out = {};
  for (const n of ['accounts', 'tables']) {
    const f = path.join(dir, `${n}.json`);
    out[n] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; // throws if torn
  }
  return out;
}

test('kill -9 mid-play: files never torn, chips conserved across both files, at most the debounce window lost', async (t) => {
  const dir = tmpDir();
  let srv = await spawnServer(dir);
  t.after(() => { try { srv.child.kill('SIGKILL'); } catch (_) { /* gone */ } });
  const A = await newGuest(srv, 'Kim');
  const B = await newGuest(srv, 'Lee');
  const C = await newGuest(srv, 'Namer');
  let ca = await connect(srv, A.token);
  let cb = await connect(srv, B.token);
  ca.send({ t: 'create', settings: { blinds: '10/20', seats: 2 } });
  const { code } = await ca.waitFor((m) => m.t === 'created');
  ca.send({ t: 'sit', seat: 0, buyIn: 1000 });
  await ca.waitFor((m) => m.t === 'state' && m.me.seat === 0);
  cb.send({ t: 'watch', code });
  cb.send({ t: 'sit', seat: 1, buyIn: 1000 });
  await cb.waitFor((m) => m.t === 'state' && m.me.seat === 1);
  ca.send({ t: 'host', op: 'start' });

  let seq = 0;
  const losses = [];
  for (const killAfter of [450, 700, 950]) {
    autoPlay(ca, { rng: floatRng(60 + seq) });
    autoPlay(cb, { rng: floatRng(70 + seq) });
    // name changes as a stream of acknowledged account writes
    const acks = [];
    let running = true;
    const namer = (async () => {
      while (running) {
        const i = ++seq;
        const r = await api(srv, 'POST', '/v1/name', { token: C.token, body: { name: `n${i}` } }).catch(() => null);
        if (r && r.status === 200) acks.push({ i, at: Date.now() });
        await sleep(15);
      }
    })();
    await sleep(killAfter);
    const exited = new Promise((r) => srv.child.once('exit', r));
    srv.child.kill('SIGKILL');
    const killAt = Date.now();
    running = false;
    ca.playing = cb.playing = false;
    await exited;
    await namer;
    ca.close(); cb.close();

    // the main files always parse (temp files may exist and are dealt with at start)
    const raw = readFiles(dir);
    assert.ok(raw.accounts && raw.tables);
    srv = await spawnServer(dir);
    const files = readFiles(dir);
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), [], 'no temp files after the start');
    for (const n of ['accounts.json', 'tables.json']) assert.equal(fs.statSync(path.join(dir, n)).mode & 0o777, 0o600);
    // chips: both bankrolls plus the table add up to the two starting bankrolls, whatever moment the kill hit
    const byPid = new Map(files.accounts.data.accounts.map((a) => [a.pid, a]));
    const tbl = files.tables.data.tables.find((x) => x.code === code);
    let sum = byPid.get(A.account.pid).chips + byPid.get(B.account.pid).chips;
    const liveHand = tbl.hand && !tbl.hand.done;
    for (const s of tbl.seats) if (s) sum += s.stack + s.pendingTopUp + (liveHand && s.inHand ? s.contrib : 0);
    assert.equal(sum, 20_000, 'chips conserved across accounts.json and tables.json');
    // every change acknowledged more than 200 ms (+ slack) before the kill was written
    const saved = Number(byPid.get(C.account.pid).name.slice(1));
    const safe = acks.filter((a) => killAt - a.at > 350).map((a) => a.i);
    if (safe.length) assert.ok(saved >= Math.max(...safe), `name n${saved} persisted, n${Math.max(...safe)} acknowledged in time`);
    const lost = acks.filter((a) => a.i > saved);
    losses.push(lost.length ? killAt - Math.min(...lost.map((a) => a.at)) : 0);

    ca = await connect(srv, A.token);
    cb = await connect(srv, B.token);
    ca.send({ t: 'watch', code });
    cb.send({ t: 'watch', code });
    await ca.waitFor((m) => m.t === 'state');
    await cb.waitFor((m) => m.t === 'state');
  }
  // play goes on after the last restart
  autoPlay(ca, { rng: floatRng(99) });
  autoPlay(cb, { rng: floatRng(98) });
  const s0 = ca.lastState();
  const no0 = s0.table.hand ? s0.table.hand.no : s0.table.voided || 0;
  await ca.waitFor((m) => m.t === 'state' && m.table.hand && m.table.hand.no > no0 + 1, { timeout: 15000 });
  ca.playing = cb.playing = false;
  ca.close(); cb.close();
  t.diagnostic(`lost windows (ms before the kill): ${losses.join(', ')}`);
  for (const ms of losses) assert.ok(ms <= 350, `lost only the last ${ms} ms`);
  srv.child.kill('SIGTERM');
  await new Promise((r) => srv.child.once('exit', r));
});
