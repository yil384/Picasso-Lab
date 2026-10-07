// src/index.js - starts the agent from config: the viewer channel (src/web.js) with one mineflayer body per guest
// session, the house bot and its brain for the "Ask our Muse" queue (only when a model is configured), the optional
// prismarine-viewer watch page on the house bot (loaded only if installed, held to WEB_HOST), and a graceful shutdown
// on SIGINT/SIGTERM. `npm start`; `npm start -- --fake-bot` puts every bot in the in-memory test world instead of a
// Minecraft server (a local demo with no Java and no server).

import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { loadConfig, isLoopbackHost } from './config.js';
import { createLogger } from './log.js';
import { createHourMeter } from './pricing.js';
import { createLLM } from './llm.js';
import { createBody } from './body.js';
import { createBrain } from './brain.js';
import { createWeb } from './web.js';

const require = createRequire(import.meta.url);

export const USAGE = `usage: npm start [-- --fake-bot]

  --fake-bot   every bot plays in the in-memory test world (test/fake-bot.js); no Minecraft server is needed
  -h, --help   this text

Everything else comes from the environment (README, "Configuration"). Ctrl-C stops: sessions end, bots leave the
server, notes and the log are written.`;

const runId = () => `serve-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(2).toString('hex')}`;

function within(promise, ms) {
  let timer;
  return Promise.race([Promise.resolve(promise), new Promise((resolve) => { timer = setTimeout(resolve, ms); })])
    .finally(() => clearTimeout(timer));
}

/** Minecraft username for a web session id: the house bot is MC_USERNAME, a guest is <name>_<id> (at most 16). */
export function usernameFor(base, sessionId) {
  if (sessionId === 'house') return base;
  const id = String(sessionId).replace(/[^A-Za-z0-9_]/g, '').slice(0, 7) || 'guest';
  return `${base.slice(0, 16 - id.length - 1)}_${id}`;
}

/**
 * Run fn while every http server it starts listens on `host` only. prismarine-viewer calls listen(port, cb) itself and
 * has no host option, which would put the watch page on every network interface. Errors (a port in use) are passed to
 * onError instead of crashing the process.
 */
export function listeningOn(host, fn, onError = () => {}) {
  const proto = http.Server.prototype;
  const own = Object.hasOwn(proto, 'listen');
  const original = proto.listen;
  proto.listen = function listen(port, ...rest) {
    this.on('error', onError);
    if (typeof port === 'number' && typeof rest[0] !== 'string') return original.call(this, port, host, ...rest);
    return original.call(this, port, ...rest);
  };
  try {
    return fn();
  } finally {
    if (own) proto.listen = original;
    else delete proto.listen;
  }
}

/**
 * The prismarine-viewer watch page for a bot, when MC_VIEWER_PORT is not 0 and the package is installed (it is not a
 * dependency: `npm install prismarine-viewer` to use it). Returns a close function, or null.
 * @param {object} bot   a real mineflayer bot
 * @param {{config: object, log: object, load?: () => object}} opts
 */
export function startViewer(bot, { config, log, load = () => ({ mineflayer: require('prismarine-viewer/lib/mineflayer') }) }) {
  const port = config.mc.viewerPort;
  if (!port) return null;
  let viewer;
  try {
    viewer = load();
  } catch (err) {
    const reason = err?.code === 'MODULE_NOT_FOUND' ? 'prismarine-viewer is not installed' : String(err?.message ?? err).slice(0, 200);
    log.event('viewer_off', { reason });
    return null;
  }
  const host = config.web.host;
  try {
    listeningOn(host, () => viewer.mineflayer(bot, { port, firstPerson: false, viewDistance: 6 }), (err) => {
      log.event('viewer_error', { message: String(err?.message ?? err).slice(0, 200) });
    });
  } catch (err) {
    log.event('viewer_error', { message: String(err?.message ?? err).slice(0, 200) });
    return null;
  }
  const url = `http://${host.includes(':') ? `[${host}]` : host}:${port}/`;
  log.event('viewer_start', { url });
  return () => { try { bot.viewer?.close?.(); } catch { /* already closed */ } };
}

/**
 * Start everything. Returns {url, publicUrl, log, web, stop}; stop(reason) is the graceful shutdown and may be called
 * more than once.
 * @param {object} [opts]
 * @param {object} [opts.config]         a loadConfig() result (default: from process.env)
 * @param {boolean} [opts.fakeBot]       bots play in the fake world instead of joining the Minecraft server
 * @param {object} [opts.log]            a Logger (default: a JSONL log in LOG_DIR)
 * @param {(line: string) => void} [opts.print]
 * @param {() => object} [opts.loadViewer]   how prismarine-viewer is loaded (tests)
 */
export async function startAgent(opts = {}) {
  const config = opts.config ?? loadConfig();
  const print = opts.print ?? console.log;
  const log = opts.log ?? createLogger({ config, runId: runId() });
  const meter = createHourMeter({ usdPerHour: config.caps.usdPerHour });
  const createFakeBot = opts.fakeBot ? (await import('../test/fake-bot.js')).createFakeBot : null;

  // The model is needed only by the Ask queue; guests drive their bots by hand or through their own agent. Viewer text
  // goes to the Standard tier only: on Contributor Meta may train on prompts, so that needs an explicit opt-in.
  let llm = null;
  let askOff = null;
  let askNotice = null;
  try { llm = createLLM({ config }); } catch (err) { askOff = err.message; }
  if (llm?.tier === 'contributor') {
    if (!config.web.askAllowContributor) {
      askOff = 'the model is on the Contributor tier, where Meta may train on prompts; set WEB_ASK_ALLOW_CONTRIBUTOR=true to open the queue anyway';
      llm = null;
    } else {
      askNotice = 'Requests here go to the Contributor tier of Meta\'s API, where Meta may use prompts and replies to train its models. Do not type anything personal.';
    }
  }

  // Guests' bots each get a live 3D view for people to watch (prismarine-viewer, if installed), on a local port that
  // src/web.js proxies under /watch/<session id>/ (read-only: watching never controls the bot).
  let nextViewerPort = 3101;
  function newBody(sessionId) {
    const username = usernameFor(config.mc.username, sessionId);
    const cfg = Object.freeze({ ...config, mc: Object.freeze({ ...config.mc, username }) });
    if (createFakeBot) return createBody({ bot: createFakeBot({ scene: 'forest', username }), config: cfg, log });
    const body = createBody({ config: cfg, log });
    if (sessionId !== 'house') {
      body.ready.then(() => {
        let viewer;
        try { viewer = (opts.loadViewer ?? (() => ({ mineflayer: require('prismarine-viewer/lib/mineflayer') })))(); } catch { return; }
        const port = nextViewerPort++;
        if (nextViewerPort > 3164) nextViewerPort = 3101;
        listeningOn('127.0.0.1', () => viewer.mineflayer(body.bot, { port, firstPerson: false, viewDistance: 4, prefix: `/watch/${sessionId}` }),
          (err) => log.event('viewer_error', { session: sessionId, message: String(err?.message ?? err).slice(0, 200) }));
        body.viewerPort = port;
        body.on('end', () => { try { body.bot.viewer?.close?.(); } catch { /* closed */ } });
      }, () => {});
    }
    return body;
  }

  // The house bot: joins at start when the Ask queue is open, comes back on the next request after a disconnect.
  let house = null;
  function houseBody() {
    if (house && !house.ended) return house.body;
    const h = { body: newBody('house'), ended: false, closeViewer: null };
    h.body.on('end', () => { h.ended = true; h.closeViewer?.(); });
    h.body.ready.then(() => {
      if (!h.ended && !createFakeBot) h.closeViewer = startViewer(h.body.bot, { config, log, load: opts.loadViewer });
    }, () => {});
    house = h;
    return h.body;
  }

  // One request may spend at most a fifth of the hourly cap, so one viewer cannot use up the hour for everyone. The
  // house brain keeps its own notes file: viewer-driven runs never write the notes the filmed runs read.
  const houseCaps = { ...config.caps, usdPerRun: Math.min(config.caps.usdPerRun, config.caps.usdPerHour / 5) };
  const brains = new Set();
  const makeBrain = llm ? (body) => {
    const brain = createBrain({
      body, llm, log, caps: houseCaps, meter, config,
      notes: createFakeBot ? null : config.memory.askNotesPath, // the fake world never teaches any notes
    });
    brains.add(brain);
    body.on?.('end', () => { brains.delete(brain); brain.close(); });
    return brain;
  } : undefined;

  const web = createWeb({
    config, log, meter, makeBrain, askNotice,
    makeBody: (sessionId) => (sessionId === 'house' ? houseBody() : newBody(sessionId)),
  });
  const { url, publicUrl } = await web.start();

  const world = createFakeBot ? 'the fake world (--fake-bot)' : `Minecraft ${config.mc.version} at ${config.mc.host}:${config.mc.port}`;
  log.event('serve_start', {
    url, publicUrl, world, ask: llm ? 'open' : 'closed', model: llm?.model ?? null, effort: llm?.effort ?? null,
    tier: llm?.tier ?? null, caps: { ...config.caps }, maxSessions: config.web.maxSessions, leaseMs: config.web.leaseMs,
  });
  print(`Muse plays Minecraft: ${url}/${publicUrl && publicUrl !== url ? ` (public: ${publicUrl}/)` : ''}`);
  print(`world: ${world}; guests get up to ${config.web.maxSessions} bots for ${Math.round(config.web.leaseMs / 60_000)} min each`);
  print(llm
    ? `Ask queue: open, ${llm.model} · ${llm.effort} · ${llm.tier} at ${llm.baseURL}; caps ${config.caps.steps} steps and $${config.caps.usdPerRun} per run, $${config.caps.usdPerHour} per hour`
    : `Ask queue: closed (${askOff})`);
  print(config.web.adminToken ? 'kill switch: POST /admin/stop with "Authorization: Bearer $WEB_ADMIN_TOKEN"' : 'kill switch: set WEB_ADMIN_TOKEN to enable POST /admin/stop');
  if (!isLoopbackHost(config.web.host)) print(`note: WEB_HOST=${config.web.host} is reachable from the network; expose only this port`);
  if (!config.web.publicUrl) {
    print(config.web.trustProxy === 'off'
      ? `note: WEB_PUBLIC_URL is not set, so the agent prompt and openapi.json point at ${url}; set it to the tunnel's https URL before sharing the page`
      : 'note: WEB_PUBLIC_URL is not set; links use the host each request came in on (WEB_TRUST_PROXY)');
  }
  if (config.web.trustProxy === 'off' && isLoopbackHost(config.web.host)) {
    print('note: WEB_TRUST_PROXY=off, so behind a tunnel every visitor shares one address for the limits; set it to cloudflare or the number of proxies');
  }
  if (log.path) {
    const rel = path.relative(process.cwd(), log.path);
    print(`log: ${rel && !rel.startsWith('..') ? rel : log.path}`);
  }

  if (makeBrain) {
    houseBody().ready.then(
      () => print(`house bot ${config.mc.username} is in the world`),
      (err) => print(`house bot could not join: ${err.message} (the Ask queue tries again on the next request)`),
    );
  }

  let stopping = null;
  function stop(reason = 'shutdown') {
    stopping ??= (async () => {
      log.event('serve_stop', { reason });
      await web.stop(); // closes the Ask queue, ends every session and closes its bot, closes the house bot it used
      for (const brain of brains) { try { brain.close(); } catch { /* notes are best effort */ } }
      if (house && !house.ended) await within(house.body.close().catch(() => {}), 5_000);
      house?.closeViewer?.();
      log.close();
    })();
    return stopping;
  }

  return { url, publicUrl, log, web, stop };
}

/** The CLI: start, then wait for SIGINT/SIGTERM. Returns an exit code. */
export async function main(argv = process.argv.slice(2), { print = console.log, printErr = console.error } = {}) {
  let values;
  try {
    ({ values } = parseArgs({ args: argv, strict: true, options: { 'fake-bot': { type: 'boolean' }, help: { type: 'boolean', short: 'h' } } }));
  } catch (err) {
    printErr(`${err.message}\n\n${USAGE}`);
    return 2;
  }
  if (values.help) { print(USAGE); return 0; }

  let agent;
  try {
    agent = await startAgent({ config: loadConfig(), fakeBot: Boolean(values['fake-bot']), print });
  } catch (err) {
    printErr(`could not start: ${err.message}`);
    return 1;
  }
  print('Ctrl-C stops everything.');

  const signal = await new Promise((resolve) => {
    process.once('SIGINT', () => resolve('SIGINT'));
    process.once('SIGTERM', () => resolve('SIGTERM'));
  });
  print(`\n${signal}: stopping (sessions end, bots leave, notes and the log are written)...`);
  const again = () => { printErr('second signal: exiting now'); process.exit(130); };
  process.once('SIGINT', again);
  process.once('SIGTERM', again);
  const late = setTimeout(() => { printErr('shutdown took longer than 15 s; exiting'); process.exit(1); }, 15_000);
  late.unref();
  await agent.stop(signal);
  clearTimeout(late);
  print('stopped.');
  return 0;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  process.exitCode = await main();
  // a real mineflayer connection can keep the event loop alive for a moment after quit()
  setTimeout(() => process.exit(process.exitCode), 1_000).unref();
}
