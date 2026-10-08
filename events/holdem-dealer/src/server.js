// The games service process: one HTTP server for the REST API (http.js) and the Hold'em socket (ws.js), the
// accounts, the table registry and the data files. `node src/server.js` reads the environment (config.js).
//
//   startServer(config, { now, fetchKeys, verifier, mailFetch, mailer, log, rng, botRng, onChange, helloMs }) -> Promise<Service>
//     (everything but config is for tests: injected clock, key fetcher, the fetch the Resend mailer uses (or a whole
//     mailer), rngs, a hook after every table change)
//     config.testHooks (HOLDEM_TEST_HOOKS=1, never in production) adds test-hooks.js's /__test/* endpoints.
//     Service = { port, url, accounts, rooms, store, ws, stop() }
//     stop(): graceful - stop accepting, close every socket with 1012, stop the table timers, flush both files.
// Startup refuses to run on a corrupt data file (store.js) or a bad configuration (config.js).
// SIGTERM / SIGINT run stop() and exit 0. An uncaught error exits 1 without writing (Docker restarts it from the
// last flushed batch, at most 200 ms old).

import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { loadConfig, ConfigError } from './config.js';
import { Store, StoreError } from './store.js';
import { Accounts } from './accounts.js';
import { Rooms } from './rooms.js';
import { createVerifier } from './firebase-token.js';
import { createResendMailer } from './mailer.js';
import { createHttpHandler } from './http.js';
import { attachWs } from './ws.js';
import { RateLimiter, makeIpKey, clientIp, createLog, createProxyTrust } from './util.js';
import { warmup } from './engine/ai.js';

const SWEEP_ACCOUNTS_MS = 3600_000;
const SWEEP_ROOMS_MS = 15_000;
const LIMIT_LOG_MS = 60_000;

export async function startServer(config, opts = {}) {
  const now = opts.now || Date.now;
  const log = opts.log || createLog();
  const store = new Store({ dir: config.dataDir, log });
  const data = store.load();

  let rooms = null;
  let wsLayer = null;
  const verifier = opts.verifier || createVerifier({ projectId: config.firebaseProjectId, jwksUrl: config.firebaseJwksUrl, fetchKeys: opts.fetchKeys, now });
  // HOLDEM_TEST_HOOKS=1 only (refused in production): the browser harness's /__test/* endpoints
  let hooks = null;
  if (config.testHooks) {
    const { createTestHooks } = await import('./test-hooks.js');
    hooks = createTestHooks({ rooms: { get: (code) => rooms?.get(code) }, store, log });
    log('test hooks on: /__test/* answers loopback callers', {});
  }
  const limiter = new RateLimiter(now);
  // EMAIL_SENDER=resend: the service sends the sign-in email itself (tests inject a fake fetch, never Resend)
  const mailer = opts.mailer || (config.emailSender === 'resend'
    ? createResendMailer({ apiKey: config.resendApiKey, from: config.emailFrom, apiUrl: config.resendApiUrl || undefined, fetch: opts.mailFetch, log })
    : null);
  const accounts = new Accounts({
    gamesSecret: config.gamesSecret,
    emailLink: config.emailLink,
    emailSender: config.emailSender,
    emailFrom: config.emailFromAddress,
    emailDailyCap: config.emailDailyCap,
    mailer,
    verifier,
    now,
    log,
    tableInfo: (id) => (rooms ? rooms.tableInfo(id) : { seated: false, chips: 0 }),
    onChange: () => store.markDirty('accounts'),
    onAccount: (id) => rooms?.notifyAccount(id),
    onDelete: (id) => rooms?.dropAccount(id, 4001, 'account_changed'),
  });
  accounts.load(data.accounts);
  rooms = new Rooms({
    accounts, store, now, log,
    botThinkScale: config.botThinkScale,
    paceScale: config.paceScale,
    rng: opts.rng,
    botRng: opts.botRng,
    onLimit: (bucket, key) => limiter.note(bucket, key),
    onChange: hooks ? (t) => { hooks.onChange(t); opts.onChange?.(t); } : opts.onChange,
  });
  store.register('accounts', () => accounts.toJSON());
  store.register('tables', () => rooms.toJSON());
  rooms.restore(data.tables);
  accounts.sweep();

  warmup();

  const ipKey = makeIpKey(config.ipSalt);
  // only the listed proxy (Caddy) may say who the client is; names are resolved before the first request
  const trust = opts.proxyTrust || createProxyTrust(config.trustProxy, { log });
  await trust.refresh();
  const ipKeyOf = (req) => ipKey(clientIp(req, trust));
  const startedAt = Date.now();

  const server = http.createServer({ requestTimeout: 15_000, headersTimeout: 10_000 });
  const api = createHttpHandler({
    config, accounts, rooms, limiter, ipKeyOf, startedAt, log, store,
    closeToken: (hash) => wsLayer?.closeToken(hash),
  });
  server.on('request', hooks ? (req, res) => (req.url.startsWith('/__test/') ? hooks.handle(req, res) : api(req, res)) : api);
  wsLayer = attachWs(server, { config, accounts, rooms, limiter, ipKeyOf, log, now, helloMs: opts.helloMs });
  server.on('clientError', (err, socket) => { try { socket.destroy(); } catch (_) { /* gone */ } });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => { server.off('error', reject); resolve(); });
  });
  const port = server.address().port;

  const timers = [
    setInterval(() => { accounts.sweep(); limiter.sweep(); }, SWEEP_ACCOUNTS_MS),
    setInterval(() => rooms.sweep(), SWEEP_ROOMS_MS),
    // one line a minute while any limit refuses something: which limit, how often, from how many networks (no keys)
    setInterval(() => {
      const r = limiter.drain();
      if (Object.keys(r).length) log('rate limited', { refused: r });
    }, LIMIT_LOG_MS),
  ];
  log('dealer listening', { port, tables: rooms.stats().tables, accounts: accounts.accounts.size, emailLink: config.emailLink, emailSender: config.emailSender });

  let stopping = null;
  function stop() {
    if (stopping) return stopping;
    stopping = (async () => {
      for (const t of timers) clearInterval(t);
      trust.stop();
      server.close();
      wsLayer.closeAll(1012, 'restart');
      rooms.stop();
      store.close();
      // let the close frames go out, then drop whatever is left
      await new Promise((r) => setTimeout(r, 100));
      wsLayer.terminateAll();
      server.closeAllConnections?.();
      log('dealer stopped', {});
    })();
    return stopping;
  }

  return { port, url: `http://127.0.0.1:${port}`, accounts, rooms, store, ws: wsLayer, server, stop };
}

async function main() {
  const log = createLog();
  let config;
  try {
    config = loadConfig(process.env);
  } catch (e) {
    if (e instanceof ConfigError) { console.error(e.message); process.exit(1); }
    throw e;
  }
  let service;
  try {
    service = await startServer(config, { log });
  } catch (e) {
    if (e instanceof StoreError) { console.error(e.message); process.exit(1); }
    console.error(`startup failed: ${e.message}`);
    process.exit(1);
  }
  const quit = (signal) => {
    log('shutting down', { signal });
    service.stop().then(() => process.exit(0), () => process.exit(1));
  };
  process.on('SIGTERM', () => quit('SIGTERM'));
  process.on('SIGINT', () => quit('SIGINT'));
  // no flush here: memory may be half-way through a step; the last flushed batch (<= 200 ms old) is consistent
  process.on('uncaughtException', (e) => {
    log('uncaught exception, exiting without a flush', { error: e.message });
    process.exit(1);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
