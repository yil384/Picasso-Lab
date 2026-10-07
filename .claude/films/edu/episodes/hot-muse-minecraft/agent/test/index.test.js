// test/index.test.js - the whole agent wired by src/index.js, in the fake world with the local mock model: a guest
// session drives its own bot over /api, an /ask request runs on the house bot through the brain, the decision log is
// written, and stop() (and SIGINT on the real CLI) shuts everything down. No Minecraft server, no real API.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { loadConfig } from '../src/config.js';
import { createLogger, readJsonl } from '../src/log.js';
import { FORBIDDEN_PARAMS } from '../src/llm.js';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { startAgent, usernameFor, listeningOn, startViewer, loadViewer, startGuestViews, viewPorts } from '../src/index.js';
import { start } from './mock-llm.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 5_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(10);
  }
}
const json = (url, method = 'GET', body) => fetch(url, {
  method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
const freePort = () => new Promise((resolve) => {
  const s = http.createServer().listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

test('usernames: the house bot keeps MC_USERNAME, guests get a valid name of their own', () => {
  assert.equal(usernameFor('Muse', 'house'), 'Muse');
  assert.equal(usernameFor('Muse', 'g1a2b3c'), 'Muse_g1a2b3c');
  const long = usernameFor('ABCDEFGHIJKLMNOP', 'g1a2b3c');
  assert.equal(long, 'ABCDEFGH_g1a2b3c');
  for (const name of [long, usernameFor('Muse', 'g-!'), usernameFor('Mus', '')]) assert.match(name, /^[A-Za-z0-9_]{3,16}$/);
});

test('viewer: held to WEB_HOST, off when not installed or when MC_VIEWER_PORT=0, a port in use never crashes', async () => {
  const inside = await new Promise((resolve) => {
    listeningOn('127.0.0.1', () => { const s = http.createServer().listen(0, () => resolve(s)); });
  });
  assert.equal(inside.address().address, '127.0.0.1');
  inside.close();
  assert.equal(Object.hasOwn(http.Server.prototype, 'listen'), false, 'the patch is removed again');

  const port = await freePort();
  const config = loadConfig({ MC_VIEWER_PORT: String(port), WEB_HOST: '127.0.0.1' });
  const log = createLogger({ dir: null, config });
  const bot = {};
  const servers = [];
  const fakeViewer = {
    mineflayer(b, o) {
      const server = http.createServer().listen(o.port, () => {});
      servers.push(server);
      b.viewer = { close: () => server.close() };
    },
  };
  const close = startViewer(bot, { config, log, load: () => fakeViewer });
  assert.equal(typeof close, 'function');
  await until(() => servers[0].listening);
  assert.equal(servers[0].address().address, '127.0.0.1', 'not every interface');
  assert.equal(servers[0].address().port, port);

  // a second viewer on the same port: the error is logged, the process lives on
  const second = startViewer({}, { config, log, load: () => fakeViewer });
  assert.equal(typeof second, 'function');
  await until(() => log.tail().some((r) => r.kind === 'viewer_error'));
  assert.match(log.tail().find((r) => r.kind === 'viewer_error').message, /EADDRINUSE/);
  close();
  await until(() => !servers[0].listening);

  const missing = startViewer(bot, { config, log, load: () => { throw Object.assign(new Error('Cannot find module'), { code: 'MODULE_NOT_FOUND' }); } });
  assert.equal(missing, null);
  assert.equal(log.tail().at(-1).reason, 'prismarine-viewer is not installed');
  assert.equal(startViewer(bot, { config: loadConfig({ MC_VIEWER_PORT: '0' }), log, load: () => fakeViewer }), null);
});

test('live views are read-only: a watcher\'s mouseClick (no payload, or a NaN ray) reaches nothing', async () => {
  const require = createRequire(import.meta.url);
  const { Vec3 } = require('vec3');
  const { io } = require('socket.io-client');
  const { mineflayer } = loadViewer();
  const bot = new EventEmitter();
  Object.assign(bot, { version: '1.21.4', entity: { position: new Vec3(0, 64, 0), yaw: 0, pitch: 0 }, entities: {}, username: 'Tst_view' });
  let rays = 0;
  bot.world = { getColumnAt: async () => null, raycast: () => { rays += 1; return null; } };
  const rejections = [];
  const onRejection = (e) => rejections.push(e);
  process.on('unhandledRejection', onRejection);
  const port = await new Promise((resolve) => {
    listeningOn('127.0.0.1', () => mineflayer(bot, { port: 0, prefix: '/eyes/gtest' }), () => {}, (srv) => resolve(srv.address().port));
  });
  const socket = io(`http://127.0.0.1:${port}`, { path: '/eyes/gtest/socket.io', transports: ['websocket'] });
  try {
    await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
    socket.emit('mouseClick');
    socket.emit('mouseClick', { origin: { x: 0, y: 64, z: 0 }, direction: {} });
    await sleep(300);
    assert.equal(rays, 0, 'no raycast for a click');
    assert.deepEqual(rejections, []);
  } finally {
    socket.close();
    bot.viewer.close();
    process.off('unhandledRejection', onRejection);
  }
});

test('guest views: both close and free their ports when the bot leaves; a port in use is never handed to the proxy', async () => {
  const config = loadConfig({});
  const log = createLogger({ dir: null, config });
  const servers = [];
  const fakeViewer = {
    // like prismarine-viewer: every call replaces bot.viewer with its own close
    mineflayer(bot, o) {
      const server = http.createServer().listen(o.port, () => {});
      servers.push(server);
      bot.viewer = new EventEmitter();
      bot.viewer.close = () => server.close();
    },
  };
  const makeBody = () => Object.assign(new EventEmitter(), { bot: {}, connected: true });
  const [w, e] = [await freePort(), await freePort()];
  const ports = { pairs: [{ watch: w, eyes: e }], take() { return this.pairs.shift() ?? null; }, free(pair) { this.pairs.push(pair); } };
  const body = makeBody();
  startGuestViews(body, 'g1', { log, ports, load: () => fakeViewer });
  await until(() => body.viewerPort === w && body.eyesPort === e);
  body.emit('end');
  await until(() => servers.every((s) => !s.listening));
  assert.equal(body.viewerPort, null);
  assert.deepEqual(ports.pairs, [{ watch: w, eyes: e }], 'the ports are free again');

  // the watch port is taken by another program: the proxy never gets it
  const other = http.createServer().listen(w, '127.0.0.1');
  await until(() => other.listening);
  const next = makeBody();
  startGuestViews(next, 'g2', { log, ports, load: () => fakeViewer });
  await until(() => next.eyesPort === e);
  await until(() => log.tail().some((r) => r.kind === 'viewer_error' && /EADDRINUSE/.test(r.message)));
  assert.equal(next.viewerPort, undefined, 'no proxy to a port this bot does not own');
  next.emit('end');
  other.close();

  const pairs = viewPorts(4000, 2);
  assert.deepEqual([pairs.take(), pairs.take(), pairs.take()], [{ watch: 4000, eyes: 4100 }, { watch: 4001, eyes: 4101 }, null]);
  pairs.free({ watch: 4000, eyes: 4100 });
  assert.deepEqual(pairs.take(), { watch: 4000, eyes: 4100 });
});

test('startAgent --fake-bot: a guest plays over /api, /ask runs on the house bot through the brain, stop() ends it all', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-index-'));
  const mock = await start([
    { status: 503, error: { message: 'overloaded, try again' } }, // a failed call must not end the request
    { tool: 'collect', args: { block: 'oak_log', n: 2 } },
    { tool: 'say', args: { text: 'Done: two oak logs.' } },
  ]);
  let agent = null;
  try {
    const config = loadConfig({
      WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_BASE_URL: mock.url, MODEL_MAX_RETRIES: '0',
      LOG_DIR: path.join(dir, 'logs'), NOTES_PATH: path.join(dir, 'notes.json'), MC_VIEWER_PORT: '0',
    });
    const lines = [];
    agent = await startAgent({ config, fakeBot: true, print: (l) => lines.push(l), loadViewer: () => assert.fail('no viewer for a fake bot') });
    const { url } = agent;
    assert.match(lines.join('\n'), /Ask queue: open, muse-spark-1\.3/);
    assert.match(lines.join('\n'), /fake world/);

    const home = await fetch(`${url}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Muse plays Minecraft/);

    // a guest gets a bot of its own and drives it
    const started = await json(`${url}/api/session`, 'POST', { adult: true });
    assert.equal(started.status, 201);
    const { token } = await started.json();
    await until(async () => (await (await json(`${url}/api/${token}/state`)).json()).session.status === 'ready');
    const act = await json(`${url}/api/${token}/collect`, 'POST', { block: 'oak_log', n: 3 });
    assert.equal(act.status, 200);
    const done = await act.json();
    assert.equal(done.ok, true, done.result);
    assert.deepEqual(done.delta, { oak_log: 3 });
    assert.match(done.state, /oak_log 3/);

    // a viewer's request runs on the house bot through our brain and the mock model, and ends on "Done:"
    const asked = await json(`${url}/ask`, 'POST', { adult: true, text: 'get two oak logs' });
    assert.equal(asked.status, 202);
    await until(() => agent.log.tail(200).some((r) => r.kind === 'ask_end'));
    const end = agent.log.tail(200).find((r) => r.kind === 'ask_end');
    assert.equal(end.status, 'done');
    assert.equal(end.reason, 'goal');
    assert.equal(end.steps, 2);
    assert.equal(mock.requests.length, 3, 'the 503 was retried after a backoff, not taken for an answer');
    assert.equal(agent.log.tail(200).filter((r) => r.kind === 'model_error').length, 1);
    for (const { body } of mock.requests) for (const k of FORBIDDEN_PARAMS) assert.ok(!(k in body), `no ${k}`);
    assert.match(mock.requests[0].body.messages[1].content, /A viewer asks: get two oak logs/);
    assert.match(mock.requests[2].body.messages.at(-1).content, /oak_log 2/, 'the house bot has its own world and inventory');

    await agent.stop('test');
    await agent.stop('twice is fine');
    await assert.rejects(fetch(`${url}/`), 'the server is closed');
    const rows = readJsonl(agent.log.path);
    const kinds = rows.map((r) => r.kind ?? r.type);
    for (const k of ['serve_start', 'web_start', 'session_start', 'viewer_action', 'ask_end', 'run_end', 'decision', 'serve_stop', 'session_end', 'web_stop']) {
      assert.ok(kinds.includes(k), `log has ${k}`);
    }
    assert.ok(!fs.readFileSync(agent.log.path, 'utf8').includes(token), 'the session token never reaches the log');
    assert.equal(fs.existsSync(path.join(dir, 'notes.json')), false, 'the fake world never writes the real notes');
    agent = null;
  } finally {
    await agent?.stop('cleanup');
    await mock.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('startAgent: the Ask queue stays closed on the Contributor tier unless opted in, and then says so', async () => {
  const mock = await start([]);
  const base = { WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_BASE_URL: mock.url, MODEL_ID: 'muse-spark-1.3-contributor', MC_VIEWER_PORT: '0' };
  try {
    for (const allow of [false, true]) {
      const lines = [];
      const agent = await startAgent({
        config: loadConfig({ ...base, WEB_ASK_ALLOW_CONTRIBUTOR: String(allow) }), fakeBot: true,
        log: createLogger({ dir: null, config: loadConfig(base) }), print: (l) => lines.push(l),
      });
      try {
        const page = await (await fetch(`${agent.url}/`)).text();
        if (allow) {
          assert.match(lines.join('\n'), /Ask queue: open/);
          assert.match(page, /Contributor tier of Meta&#39;s API, where Meta may use prompts and replies to train/);
        } else {
          assert.match(lines.join('\n'), /Ask queue: closed \(the model is on the Contributor tier/);
          assert.equal((await json(`${agent.url}/ask`, 'POST', { adult: true, text: 'hi' })).status, 503);
        }
      } finally {
        await agent.stop('test');
      }
    }
  } finally {
    await mock.close();
  }
});

test('npm start --fake-bot: serves the page, then SIGINT shuts down cleanly with exit code 0', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-serve-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(MODEL_|MC_|WEB_|LOG_DIR|NOTES_PATH|STEP_CAP|COST_CAP)/.test(k)));
  Object.assign(env, {
    WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_BASE_URL: 'http://127.0.0.1:9/v1', MC_VIEWER_PORT: '0',
    LOG_DIR: path.join(dir, 'logs'), NOTES_PATH: path.join(dir, 'notes.json'),
  });
  const child = spawn(process.execPath, [path.join(ROOT, 'src', 'index.js'), '--fake-bot'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let err = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { err += d; });
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })));
  const killer = setTimeout(() => child.kill('SIGKILL'), 20_000);
  try {
    await until(() => /Ctrl-C stops everything/.test(out), 15_000);
    const url = out.match(/Muse plays Minecraft: (http:\/\/127\.0\.0\.1:\d+)\//)?.[1];
    assert.ok(url, out);
    assert.equal((await fetch(`${url}/`)).status, 200);
    child.kill('SIGINT');
    const { code } = await exited;
    assert.equal(code, 0, `exit code\n${out}\n${err}`);
    assert.match(out, /SIGINT: stopping/);
    assert.match(out, /stopped\./);
    const log = fs.readdirSync(path.join(dir, 'logs')).find((f) => /^run-serve-.*\.jsonl$/.test(f));
    assert.ok(log, 'a serve log was written');
    assert.ok(readJsonl(path.join(dir, 'logs', log)).some((r) => r.kind === 'serve_stop' && r.reason === 'SIGINT'));
  } finally {
    clearTimeout(killer);
    if (child.exitCode === null) child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
