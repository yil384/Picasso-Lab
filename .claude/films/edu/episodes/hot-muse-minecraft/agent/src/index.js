// src/index.js - starts the agent from config: the viewer channel (src/web.js) with one mineflayer body per guest
// session, the house bot and its brain for the "Ask our Muse" queue (only when a model is configured), the optional
// prismarine-viewer watch page on the house bot (loaded only if installed, held to WEB_HOST), the live-video stream of
// each guest game when STREAM_ENABLED (src/stream.js; nothing changes when it is off), the event loop's delay in the
// log every minute (loop_delay: p50, p99, max), and a graceful shutdown on SIGINT/SIGTERM. `npm start`;
// `npm start -- --fake-bot` puts every bot in the in-memory test world instead of a Minecraft server (a local demo with
// no Java and no server).

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { loadConfig, isLoopbackHost, facebookEmbedUrl } from './config.js';
import { createLogger } from './log.js';
import { createHourMeter } from './pricing.js';
import { createLLM } from './llm.js';
import { createBody } from './body.js';
import { createBrain } from './brain.js';
import { createWeb } from './web.js';
import { createStreamManager, createRemoteStreamManager, managerConfig } from './stream.js';
import { createCameraManager } from './camera.js';
import { consoleLine } from './stations.js';

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

const NAME_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
/**
 * A guest bot's name on a server that lets in only listed players (MC_WHITELIST): MC_USERNAME (its first 8
 * characters) and random letters and digits up to 16 characters ("Muse_" and 11: 65 bits; at least 7, 41 bits),
 * never the game id, so nobody who learns a game id (logs, a reply) can join under its bot's name and take it over
 * (the server runs in offline mode).
 */
export function privateName(base) {
  const head = String(base).slice(0, 8);
  const bytes = crypto.randomBytes(16 - head.length - 1);
  return `${head}_${[...bytes].map((b) => NAME_CHARS[b % NAME_CHARS.length]).join('')}`;
}

/** How long Paper gets to read a whitelist line from its console before the bot it lets in connects. */
const LIST_SETTLE_MS = 400;

/**
 * Run fn while every http server it starts listens on `host` only. prismarine-viewer calls listen(port, cb) itself and
 * has no host option, which would put the watch page on every network interface. Errors (a port in use) are passed to
 * onError instead of crashing the process; onListening(server) runs once a server really listens.
 */
export function listeningOn(host, fn, onError = () => {}, onListening = null) {
  const proto = http.Server.prototype;
  const own = Object.hasOwn(proto, 'listen');
  const original = proto.listen;
  proto.listen = function listen(port, ...rest) {
    this.on('error', onError);
    if (onListening) this.once('listening', () => onListening(this));
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
 * prismarine-viewer with its live views made read-only. Its WorldView registers an async 'mouseClick' handler on every
 * viewer's socket that trusts the payload: a missing one is an unhandled rejection (the process exits), a NaN
 * direction makes the raycast loop forever. Nothing here uses clicks, so that handler is removed before any view
 * exists (lib/mineflayer takes WorldView from ../viewer when it is first loaded, so the patch goes in first).
 */
export function loadViewer() {
  const viewerLib = require('prismarine-viewer/viewer');
  if (!viewerLib.WorldView.readOnly) {
    const Base = viewerLib.WorldView;
    class ReadOnlyWorldView extends Base {
      constructor(...args) {
        super(...args);
        this.emitter.removeAllListeners('mouseClick');
      }
    }
    ReadOnlyWorldView.readOnly = true;
    viewerLib.WorldView = ReadOnlyWorldView;
  }
  return { mineflayer: require('prismarine-viewer/lib/mineflayer') };
}

/**
 * The prismarine-viewer watch page for a bot, when MC_VIEWER_PORT is not 0 and the package is installed. Returns a
 * close function, or null.
 * @param {object} bot   a real mineflayer bot
 * @param {{config: object, log: object, load?: () => object}} opts
 */
export function startViewer(bot, { config, log, load = loadViewer }) {
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
 * The event loop's delay, logged every `everyMs` as a loop_delay row: p50, p99, max and mean in ms over that window, how
 * late the loop was beyond the histogram's sampling interval (resolutionMs, taken off: Node records whole intervals),
 * and samples (fewer than everyMs / resolutionMs when the loop was blocked). One stalled loop holds up every bot's
 * physics and every reply. Returns stop().
 */
export function watchEventLoop(log, { everyMs = 60_000, resolutionMs = 10 } = {}) {
  const h = monitorEventLoopDelay({ resolution: resolutionMs });
  h.enable();
  const ms = (ns) => Math.max(0, Math.round(ns / 1e4) / 100 - resolutionMs);
  const timer = setInterval(() => {
    if (!h.count) return;
    try {
      log.event('loop_delay', { p50Ms: ms(h.percentile(50)), p99Ms: ms(h.percentile(99)), maxMs: ms(h.max), meanMs: ms(h.mean), samples: h.count, windowS: Math.round(everyMs / 1000) });
    } catch { /* logging is best effort */ }
    h.reset();
  }, everyMs);
  timer.unref();
  return () => { clearInterval(timer); h.disable(); };
}

/** Local ports for the guests' live views: {watch, eyes} pairs (3101-3164 and 100 above), each pair once at a time. */
export function viewPorts(first = 3101, count = 64) {
  const used = new Set();
  let next = first;
  return {
    take() {
      for (let i = 0; i < count; i++) {
        const port = next;
        next = next + 1 >= first + count ? first : next + 1;
        if (!used.has(port)) { used.add(port); return { watch: port, eyes: port + 100 }; }
      }
      return null;
    },
    free(pair) { used.delete(pair.watch); },
  };
}

/**
 * The two live views of a guest bot, for people to watch (read-only): from behind under /watch/<view id>/ and
 * through its eyes under /eyes/<view id>/ (the game's unguessable view id; the session id without one), on local ports
 * src/web.js proxies. A port is set on the body (viewerPort, eyesPort) only once its view really listens; both views
 * close and their ports free up when the bot leaves (each mineflayer() call replaces bot.viewer, so each view's close is
 * kept right after it starts).
 * @param {object} body   a body whose bot has joined
 * @param {string} sessionId
 * @param {{log: object, ports: ReturnType<typeof viewPorts>, load?: () => object, onEyes?: (port: number, path: string) => void, viewId?: string}} opts
 *   onEyes runs once the first-person view listens (the live-video stream starts from it), with the view's path
 */
export function startGuestViews(body, sessionId, { log, ports, load = loadViewer, onEyes = null, viewId = null }) {
  if (body.connected === false) return; // it left before its views started
  let viewer;
  try { viewer = load(); } catch { return; }
  if (!viewer) return;
  const pair = ports.take();
  if (!pair) { log.event('viewer_error', { session: sessionId, message: 'no free port for the live views' }); return; }
  const closes = [];
  let ended = false;
  const onError = (err) => log.event('viewer_error', { session: sessionId, message: String(err?.message ?? err).slice(0, 200) });
  const view = (port, firstPerson, prefix, set) => {
    try {
      listeningOn('127.0.0.1', () => viewer.mineflayer(body.bot, { port, firstPerson, viewDistance: 4, prefix }), onError, () => { if (!ended) set(port); });
      const close = body.bot.viewer?.close;
      if (typeof close === 'function') closes.push(close);
    } catch (err) { onError(err); }
  };
  const id = viewId ?? sessionId;
  view(pair.watch, false, `/watch/${id}`, (port) => { body.viewerPort = port; });
  view(pair.eyes, true, `/eyes/${id}`, (port) => {
    body.eyesPort = port;
    try { onEyes?.(port, `/eyes/${id}/`); } catch (err) { onError(err); }
  });
  body.on('end', () => {
    ended = true;
    body.viewerPort = null;
    body.eyesPort = null;
    for (const close of closes) { try { close(); } catch { /* closed */ } }
    ports.free(pair);
  });
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
 * @param {object} [opts.streams]        a stream manager (tests; default: from STREAM_*, null when off)
 * @param {number} [opts.loopStatsMs]    how often the event loop's delay is logged (default 60 s; 0: never)
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

  // Guests' bots each get two live 3D views for people to watch (startGuestViews). With STREAM_ENABLED, the first-person
  // view of each guest game also goes out as a live video (in this process, or in the stream container when
  // STREAM_SERVICE_URL is set), from when the view listens until the game ends. With STREAM_SOURCE=client the video is
  // the real Minecraft client spectating the bot (src/camera.js), which needs the bot's player name.
  const ports = viewPorts();
  const streams = opts.streams !== undefined ? opts.streams : !config.stream.enabled ? null
    : config.stream.serviceUrl ? createRemoteStreamManager({ url: config.stream.serviceUrl, log })
      : config.stream.source === 'client' ? createCameraManager({ config, log })
        : createStreamManager({ config: managerConfig(config.stream), log });
  // player names: MC_USERNAME_<game id>, or with MC_WHITELIST a private one (privateName) kept for the game's life
  const names = new Map(); // session id -> player name
  const nameOf = (sessionId) => {
    if (!names.has(sessionId)) {
      names.set(sessionId, config.mc.whitelist && sessionId !== 'house' ? privateName(config.mc.username) : usernameFor(config.mc.username, sessionId));
    }
    return names.get(sessionId);
  };
  const consolePath = process.env.MC_CONSOLE || null;
  /** On a whitelisted server: put a player on the list (or take it off) through the console. Never throws. */
  const listPlayer = async (how, name) => {
    if (!config.mc.whitelist || !consolePath || createFakeBot) return;
    try { await consoleLine(consolePath, `whitelist ${how} ${name}`); } catch (err) {
      log.event('whitelist_error', { how, name, message: String(err?.message ?? err).slice(0, 200) });
    }
  };
  // the house bot (only with the Ask queue open: it needs the model) keeps MC_USERNAME and stays on the list
  if (llm && config.mc.whitelist && consolePath && !createFakeBot) await listPlayer('add', config.mc.username);
  const streamFrom = (body, sessionId) => (streams
    ? (port, eyesPath) => streams.start(sessionId, { source: `http://127.0.0.1:${port}${eyesPath}`, body, player: nameOf(sessionId) })
    : null);
  // live_view {format: "embed"}: the Facebook player of the live video a game's stream feeds (STREAM_VIDEO_URL, in the
  // order of the output URLs), while that stream runs
  const videoUrls = config.stream.videoUrls ?? [];
  const liveVideo = (sessionId) => {
    if (!streams?.has?.(sessionId) || !videoUrls.length) return null;
    const slot = streams.slot?.(sessionId);
    const videoUrl = videoUrls.length === 1 ? videoUrls[0] : Number.isInteger(slot) ? videoUrls[slot] : null;
    return videoUrl ? { videoUrl, embedUrl: facebookEmbedUrl(videoUrl) } : null;
  };
  function newBody(sessionId, { viewId = null } = {}) {
    const username = nameOf(sessionId);
    const cfg = Object.freeze({ ...config, mc: Object.freeze({ ...config.mc, username }) });
    if (createFakeBot) return createBody({ bot: createFakeBot({ scene: 'forest', username }), config: cfg, log });
    if (config.mc.whitelist && consolePath && sessionId !== 'house') {
      // on the list first, then join (Paper checks the list at login); off the list once the bot has left
      log.event('bot_name', { session: sessionId, username });
      return listPlayer('add', username)
        .then(() => new Promise((r) => { setTimeout(r, LIST_SETTLE_MS); }))
        .then(() => {
          const body = joinBody(sessionId, username, cfg, viewId);
          body.on('end', () => { names.delete(sessionId); listPlayer('remove', username); });
          return body;
        });
    }
    return joinBody(sessionId, username, cfg, viewId);
  }
  function joinBody(sessionId, username, cfg, viewId) {
    const body = createBody({ config: cfg, log });
    // Every guest bot starts on fresh ground: the server console (MC_CONSOLE, the FIFO server/start.sh makes) spreads
    // it to a random dry spot up to SPREAD_RANGE blocks from the world spawn, so earlier guests never leave a new one
    // at a stripped spawn. The session counts as ready only once the bot has landed and the chunks around it loaded.
    const consolePath = process.env.MC_CONSOLE;
    if (sessionId !== 'house' && consolePath) {
      const range = Number(process.env.SPREAD_RANGE) || 400;
      const joined = body.ready;
      body.ready = joined.then(async () => {
        const bot = body.bot;
        const sp = bot.spawnPoint ?? bot.entity.position;
        const landed = new Promise((resolve) => bot.once('forcedMove', resolve));
        try {
          await fs.promises.appendFile(consolePath, `spreadplayers ${Math.round(sp.x)} ${Math.round(sp.z)} 16 ${range} false ${username}\n`);
        } catch (err) {
          log.event('spread_error', { session: sessionId, message: String(err?.message ?? err).slice(0, 200) });
          return;
        }
        const pause = (ms) => new Promise((r) => setTimeout(r, ms));
        await Promise.race([landed, pause(5_000)]);
        await Promise.race([Promise.resolve(bot.waitForChunksToLoad?.()).catch(() => {}), pause(8_000)]);
        log.event('spread', { session: sessionId, at: bot.entity.position.floored().toString() });
      });
      body.ready.catch(() => {});
    }
    if (sessionId !== 'house') {
      body.ready.then(() => startGuestViews(body, sessionId, { log, ports, load: opts.loadViewer, onEyes: streamFrom(body, sessionId), viewId }), () => {});
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
    config, log, meter, makeBrain, askNotice, liveVideo,
    makeBody: (sessionId, o) => (sessionId === 'house' ? houseBody() : newBody(sessionId, o)),
  });
  const { url, publicUrl } = await web.start();
  const stopLoopWatch = (opts.loopStatsMs ?? 60_000) > 0 ? watchEventLoop(log, { everyMs: opts.loopStatsMs ?? 60_000 }) : () => {};

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
  if (streams && config.stream.enabled) {
    print(config.stream.serviceUrl
      ? `live video: on, every guest game through the stream service at ${config.stream.serviceUrl}`
      : `live video: on, up to ${config.stream.max} guest game(s) at once to ${config.stream.outputs.length ? `${config.stream.outputs.length} RTMP URL(s)` : config.stream.outDir}`);
  }
  if (!isLoopbackHost(config.web.host)) print(`note: WEB_HOST=${config.web.host} is reachable from the network; expose only this port`);
  if (!config.web.publicUrl) {
    print(config.web.trustProxy === 'off'
      ? `note: WEB_PUBLIC_URL is not set, so the agent prompt and openapi.json point at ${url}; set it to the tunnel's https URL before sharing the page`
      : 'note: WEB_PUBLIC_URL is not set; links use the host each request came in on (WEB_TRUST_PROXY)');
  }
  if (config.web.trustProxy === 'off' && isLoopbackHost(config.web.host)) {
    print('note: WEB_TRUST_PROXY=off, so behind a tunnel every visitor shares one address for the limits; set it to cloudflare or the number of proxies');
  }
  if (config.web.trustProxy !== 'off' && !config.web.trustedProxies.length && !config.web.proxySecret) {
    print('note: neither WEB_PROXY_SECRET nor WEB_TRUSTED_PROXIES is set, so forwarded headers are believed from any peer that reaches this port; give the proxy a secret to send (README, Deploy on picasso)');
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
      stopLoopWatch();
      await web.stop(); // closes the Ask queue, ends every session and closes its bot, closes the house bot it used
      if (streams) await within(streams.stopAll(reason), 12_000);
      for (const brain of brains) { try { brain.close(); } catch { /* notes are best effort */ } }
      if (house && !house.ended) await within(house.body.close().catch(() => {}), 5_000);
      house?.closeViewer?.();
      log.close();
    })();
    return stopping;
  }

  return { url, publicUrl, log, web, streams, stop };
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
  // one stray rejection (a library's async handler) must not take down every guest's bot: log it and go on
  process.on('unhandledRejection', (err) => {
    const message = String(err?.stack ?? err?.message ?? err).slice(0, 500);
    try { agent?.log.event('unhandled_rejection', { message }); } catch { /* logging is best effort */ }
    printErr(`unhandled rejection (the service goes on): ${message}`);
  });
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
