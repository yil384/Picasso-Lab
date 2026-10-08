// src/mineai/host.js - one Mine AI MCP host per guest game (BODY=mineai). Their host is one HTTP server (the
// supervisor) plus one child process with one mineflayer bot; this starts it from MINEAI_DIR on a loopback port of a
// private range (MINEAI_PORT_BASE, never 0.0.0.0) with a random token per host and the player name, both in its
// environment and never on a command line (every user of the machine can read command lines; on a whitelisted server
// the name is what keeps others out: our patch 0005 reads it from MINEAI_USERNAME, and 0004 makes the host and its
// runtime refuse requests without the token, which is checked once the host is up), passes the server and port,
// waits for /health to report the bot connected under that name, and watches it: a /health that fails
// MINEAI_HEARTBEAT_MISSES times in a row, a runtime their supervisor gave up on (their 5 s event-loop watchdog, widened
// by MINEAI_UNRESPONSIVE_MS through our patch 0003), a bot that lost its connection or a process that exited is a
// crash: the host is started again once, the second time it is down for good. It is stopped when its game ends (the
// body's close: game end, lease end, the operator's end-everything kill switch) and with the agent: the stdin pipe is
// closed (src/mineai/preload.mjs turns that into one SIGTERM, and nothing then holds the host open), and after their
// own stop's allowance the whole process group is killed, so a runtime its host could not stop never outlives it. At
// most MINEAI_MAX_HOSTS run at once. With MINEAI_DATA_DIR (a folder only this user can open) a game's bot data and
// incidents are deleted when it ends, except those of the last MINEAI_KEEP_FAILED games that crashed or failed to
// join; at start, game folders older than MINEAI_DATA_DAYS go. Our environment's secrets never reach a host.

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Runs inside their processes: ends the host with the agent, and serves the live views from the bot's process. */
export const PRELOAD = path.join(HERE, 'preload.mjs');
const LINES_KEPT = 30;
/** Environment variables of ours a host never gets (keys, tokens, stream URLs). */
const SECRET = /KEY|TOKEN|SECRET|PASSWORD|RTMP|COOKIE|CREDENTIAL|AUTH/i;

/**
 * How long a stopping host gets before its process group is killed: their stop gives the runtime
 * MINEAI_UNRESPONSIVE_MS before it kills it itself, then closes its server and writes its incidents.
 */
export const killGrace = (m) => (m.unresponsiveMs ?? 5_000) + 5_000;

/** Host process groups still alive in this agent: killed if the agent exits while any is (a last resort). */
const GROUPS = new Set();
let exitHook = false;
function trackGroup(c) {
  if (!Number.isInteger(c?.pid) || process.platform === 'win32') return;
  GROUPS.add(c);
  if (exitHook) return;
  exitHook = true;
  process.once('exit', () => { for (const g of GROUPS) { try { process.kill(-g.pid, 'SIGKILL'); } catch { /* gone */ } } });
}

/** Is a loopback TCP port free right now? */
export function portFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, host, () => s.close(() => resolve(true)));
  });
}

/** Their host's command line for one game (no player name, no token, no secret: those go through the environment). */
export function hostCommand(config, { port, instanceId, preload = PRELOAD }) {
  const m = config.mineai;
  const hostTs = path.join(m.dir, 'src', 'server', 'host.ts');
  const hostArgs = [
    '--minecraft-host', config.mc.host, '--minecraft-port', String(config.mc.port), '--version', config.mc.version,
    '--listen-host', '127.0.0.1', '--listen-port', String(port), '--instance-id', instanceId,
    ...(m.dataDir ? ['--data-root', m.dataDir, '--bot-data-persistence', 'persistent'] : ['--bot-data-persistence', 'temporary']),
  ];
  if (m.runtime === 'bun') return { exec: m.exec || 'bun', args: [...(preload ? ['--preload', preload] : []), hostTs, ...hostArgs] };
  // Node runs their TypeScript through tsx (their own dev dependency, resolved from MINEAI_DIR, the working directory);
  // the runtime child inherits these flags, so the preload runs there too
  return { exec: m.exec || process.execPath, args: ['--import', 'tsx', ...(preload ? ['--import', pathToFileURL(preload).href] : []), hostTs, ...hostArgs] };
}

/** Our environment without anything secret, plus the host's own settings. */
export function hostEnv(base, extra) {
  const env = {};
  for (const [k, v] of Object.entries(base)) if (!SECRET.test(k)) env[k] = v;
  return { ...env, ...extra };
}

/** The UUID an offline-mode server gives a player name (their bot data is filed under it). */
export function offlineUuid(name) {
  const b = crypto.createHash('md5').update(`OfflinePlayer:${name}`).digest();
  b[6] = (b[6] & 0x0f) | 0x30;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Their folder name for one identity (src/bot-data/sql-bot-data.ts identitySegment). */
function identitySegment(fallback, identity) {
  const readable = identity.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return `${readable || fallback}-${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 12)}`;
}

/**
 * The folders one game's runtime writes: its bot's folder under every world folder of the data root
 * (<root>/<world>/bots/<uuid>-<hash>: SQLite and incidents) and its host's incidents (<root>/host-incidents/<game>; in
 * the system's temporary folder without a data root).
 */
export function gameFolders(dataDir, { username, instanceId }) {
  const out = [];
  const root = dataDir || null;
  const incidents = path.join(root ?? path.join(os.tmpdir(), 'mine-ai'), 'host-incidents', encodeURIComponent(instanceId));
  if (fs.existsSync(incidents)) out.push(incidents);
  if (!root) return out;
  const bot = identitySegment('bot', offlineUuid(username).toLowerCase());
  let worlds = [];
  try { worlds = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== 'host-incidents'); } catch { /* none yet */ }
  for (const w of worlds) {
    const dir = path.join(root, w.name, 'bots', bot);
    if (fs.existsSync(dir)) out.push(dir);
  }
  return out;
}

/** The newest modification time of a folder and the files right in it (ms). */
function lastTouched(dir) {
  let t = 0;
  try {
    t = fs.statSync(dir).mtimeMs;
    for (const f of fs.readdirSync(dir)) {
      try { t = Math.max(t, fs.statSync(path.join(dir, f)).mtimeMs); } catch { /* gone */ }
    }
  } catch { /* gone */ }
  return t;
}

/** Every game folder under a data root (bots of every world, host incidents). */
function allGameFolders(root) {
  const out = [];
  const sub = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(dir, d.name)); } catch { return []; } };
  for (const w of sub(root)) {
    if (path.basename(w) === 'host-incidents') out.push(...sub(w));
    else out.push(...sub(path.join(w, 'bots')));
  }
  return out;
}

/**
 * @param {{config: object, log: object, spawnFn?: typeof spawn, fetchFn?: typeof fetch, isFree?: (port: number) => Promise<boolean>, preload?: string|null, now?: () => number}} opts
 */
export function createHostManager({ config, log, spawnFn = spawn, fetchFn = globalThis.fetch, isFree = portFree, preload = PRELOAD, now = Date.now }) {
  const m = config.mineai;
  const grace = killGrace(m);
  const live = new Set(); // hosts that count against MINEAI_MAX_HOSTS (a closing one no longer does)
  const all = new Set(); // every host not closed yet (the agent's stop waits for each)
  const slots = new Set(); // port indexes in use (a closing host keeps its ports until its processes are gone)
  const kept = []; // folders of failed games kept for diagnosis, oldest first: [{game, folders}]
  const managerEvent = (kind, data = {}) => { try { log.event(kind, data); } catch { /* best effort */ } };

  // the data root: a folder only this user can open (the bot's name, inventory and every action are in it), and at
  // start the game folders nobody touched for MINEAI_DATA_DAYS go
  if (m.dataDir) {
    try {
      fs.mkdirSync(m.dataDir, { recursive: true, mode: 0o700 });
      if ((fs.statSync(m.dataDir).mode & 0o077) !== 0) fs.chmodSync(m.dataDir, 0o700);
    } catch (err) { managerEvent('mineai_data_error', { message: String(err?.message ?? err).slice(0, 200) }); }
    const before = now() - m.dataDays * 86_400_000;
    let removed = 0;
    for (const dir of allGameFolders(m.dataDir)) {
      if (lastTouched(dir) >= before) continue;
      try { fs.rmSync(dir, { recursive: true, force: true }); removed++; } catch { /* next time */ }
    }
    if (removed) managerEvent('mineai_data_pruned', { removed, olderThanDays: m.dataDays });
  }

  /** After a game: delete its folders, or keep them (a failed game, one of the last keepFailed) and drop older ones. */
  function settleData(host, failed) {
    const folders = gameFolders(m.dataDir, host);
    const drop = (list) => { for (const dir of list) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } } };
    if (failed && m.keepFailed > 0) {
      if (folders.length) kept.push({ game: host.instanceId, folders });
      while (kept.length > m.keepFailed) drop(kept.shift().folders);
      return folders.length ? 'kept' : 'none';
    }
    drop(folders);
    return folders.length ? 'deleted' : 'none';
  }

  /** A slot whose host port (and, with views, both view ports) is free; a busy index is tried again next time. */
  async function takeSlot(withViews) {
    for (let i = 0; i < m.ports; i++) {
      if (slots.has(i)) continue;
      slots.add(i);
      const ports = withViews ? [m.portBase + i, m.portBase + m.ports + i, m.portBase + 2 * m.ports + i] : [m.portBase + i];
      let free = true;
      for (const p of ports) if (!(await isFree(p))) { free = false; break; }
      if (free) return i;
      slots.delete(i); // something else holds one of its ports now: try the next, and this one again later
    }
    return null;
  }

  /**
   * Start a host for one game.
   * @param {{instanceId: string, username: string, views?: {watch: string, eyes: string}|null}} opts
   *   views: the path prefixes the bot's live views listen under (null: none)
   */
  async function start({ instanceId, username, views = null }) {
    if (live.size >= m.maxHosts) throw new Error(`all ${m.maxHosts} Mine AI hosts are in use`);
    if (!fs.existsSync(path.join(m.dir, 'src', 'server', 'host.ts'))) throw new Error(`MINEAI_DIR has no Mine AI MCP runtime (${path.join(m.dir, 'src', 'server', 'host.ts')} is missing; run mineai/fetch-and-patch.sh <dir>)`);
    const host = new EventEmitter();
    live.add(host);
    all.add(host);
    const withViews = Boolean(views && m.views);
    const slot = await takeSlot(withViews);
    if (slot === null) { live.delete(host); all.delete(host); throw new Error('no free port for a Mine AI host'); }
    const port = m.portBase + slot;
    const token = crypto.randomBytes(24).toString('base64url');
    const viewPorts = withViews ? { watch: m.portBase + m.ports + slot, eyes: m.portBase + 2 * m.ports + slot } : null;
    const lines = [];
    let child = null;
    let closing = null;
    let timer = null;
    let misses = 0;
    let down = false;
    let failed = false; // crashed, down or never ready: its data is kept for diagnosis
    Object.assign(host, {
      instanceId, username, port, viewPorts, restarts: 0, lastHealth: null,
      url: `http://127.0.0.1:${port}/mcp`,
      headers: { authorization: `Bearer ${token}` },
      lines: () => [...lines],
    });

    const event = (kind, data = {}) => { try { log.event(kind, { game: instanceId, port, ...data }); } catch { /* best effort */ } };
    const keep = (chunk) => {
      for (const line of String(chunk).split('\n')) {
        const t = line.trim();
        if (!t) continue;
        lines.push(t.slice(0, 300));
        if (lines.length > LINES_KEPT) lines.shift();
      }
    };

    /** GET /health: the parsed body (with .status), or null when it does not answer. */
    async function health(timeoutMs = Math.max(1_000, m.heartbeatMs), headers = host.headers) {
      try {
        const r = await fetchFn(`http://127.0.0.1:${port}/health`, { headers, signal: AbortSignal.timeout(timeoutMs) });
        const body = await r.json().catch(() => ({}));
        return { status: r.status, ...body };
      } catch { return null; }
    }
    host.health = health;
    const connected = (h) => h?.status === 200 && h.ok !== false && h.minecraft?.connected !== false;
    // their supervisor answers 503 with runtime.state while it starts, fails or has failed; their runtime answers 503
    // with minecraft.connected false once the bot lost its connection (a new connection needs a restart)
    const isFailed = (h) => h?.runtime?.state === 'failed' || h?.runtime?.state === 'failing' || (h?.minecraft?.connected === false && h?.runtime?.state !== 'starting');

    function launch() {
      const cmd = hostCommand(config, { port, instanceId, preload });
      const env = hostEnv(process.env, {
        MINEAI_HOST_TOKEN: token,
        MINEAI_USERNAME: username,
        MINEAI_UNRESPONSIVE_MS: String(m.unresponsiveMs),
        MINEAI_EXIT_WITH_PARENT: '1',
        ...(viewPorts ? { MINEAI_VIEWS: JSON.stringify({ watch: { port: viewPorts.watch, prefix: views.watch }, eyes: { port: viewPorts.eyes, prefix: views.eyes }, viewer: viewerDir() }) } : {}),
      });
      // a process group of its own: the host and its runtime child are stopped together (kill)
      const c = spawnFn(cmd.exec, cmd.args, { cwd: m.dir, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
      child = c;
      c.stdout?.on('data', keep);
      c.stderr?.on('data', keep);
      c.stdin?.on('error', () => {});
      c.on('error', (err) => keep(`spawn error: ${err.message}`));
      c.exited = new Promise((resolve) => {
        c.once('exit', (code, signal) => resolve({ code, signal }));
        c.once('error', () => { if (c.pid === undefined) resolve({ code: null, signal: 'spawn error' }); }); // never started
      });
      c.exited.then(({ code, signal }) => {
        if (child !== c || closing) return;
        event('mineai_host_exit', { code, signal, last: lines.slice(-3) });
        crashed(`its process exited (${signal ?? `code ${code}`})`);
      });
      trackGroup(c);
      event('mineai_host_start', { pid: c.pid ?? null, restart: host.restarts });
      return c;
    }

    /**
     * Wait until /health says the bot is in the game under its name (or the process exits, or startMs runs out), then
     * check that the host refuses a request without its token: a runtime built without patch 0004 would let any local
     * process drive this guest's bot, and one without 0005 joins under another name.
     */
    async function waitReady(c) {
      const t0 = Date.now();
      let exited = null;
      c.exited.then((x) => { exited = x; });
      while (Date.now() - t0 < m.startMs) {
        if (closing) throw new Error('closed while starting');
        if (exited) throw new Error(`the Mine AI host exited while starting (${exited.signal ?? `code ${exited.code}`}): ${lines.slice(-2).join(' | ') || 'no output'}`);
        const h = await health(2_000);
        if (connected(h)) {
          const name = h.minecraft?.username;
          if (name && name !== username) throw new Error('the Mine AI runtime joined under another player name (patch 0005 missing: build it with mineai/fetch-and-patch.sh)');
          const open = await health(2_000, {});
          if (open?.status !== 401) throw new Error('the Mine AI runtime does not enforce its token (patch 0004 missing: build it with mineai/fetch-and-patch.sh)');
          host.lastHealth = h;
          event('mineai_host_ready', { ms: Date.now() - t0 });
          return;
        }
        if (isFailed(h) && h?.runtime?.failure) throw new Error(`the Mine AI runtime failed while starting: ${String(h.runtime.failure.message ?? '').slice(0, 200)}`);
        await new Promise((r) => { setTimeout(r, 500); });
      }
      throw new Error(`the Mine AI host was not ready within ${Math.round(m.startMs / 1000)} s: ${lines.slice(-2).join(' | ') || 'no output'}`);
    }

    function beat() {
      clearTimeout(timer);
      if (closing || down) return;
      timer = setTimeout(async () => {
        const h = await health();
        if (closing || down) return;
        if (connected(h)) { misses = 0; host.lastHealth = h; host.emit('health', h); beat(); return; }
        if (isFailed(h)) { crashed(h?.runtime?.failure ? `its runtime stopped (${String(h.runtime.failure.code ?? 'failed')})` : 'its bot lost the connection to the server'); return; }
        misses += 1;
        event('mineai_heartbeat_miss', { misses, of: m.heartbeatMisses });
        if (misses >= m.heartbeatMisses) { crashed(`no answer to ${misses} heartbeats in a row`); return; }
        beat();
      }, m.heartbeatMs);
      timer.unref?.();
    }

    let recovering = null;
    function crashed(why) {
      if (closing || down || recovering) return;
      clearTimeout(timer);
      failed = true;
      if (host.restarts >= 1) { gone(`it crashed again: ${why}`); return; }
      host.restarts += 1;
      host.restarting = true;
      event('mineai_host_restart', { why });
      host.emit('crash', { why });
      recovering = (async () => {
        await kill(child);
        if (closing) return;
        const c = launch();
        try {
          await waitReady(c);
          misses = 0;
          host.restarting = false;
          host.emit('restart', { why });
          beat();
        } catch (err) {
          gone(`it could not be started again: ${err.message}`);
        }
      })().finally(() => { recovering = null; });
    }

    function gone(why) {
      if (down) return;
      down = true;
      failed = true;
      host.restarting = false;
      clearTimeout(timer);
      event('mineai_host_down', { why });
      host.emit('down', { why });
      host.close(why).catch(() => {});
    }

    /** Send the process group a signal (the host and its runtime); false when it is gone. */
    function signalGroup(c, signal) {
      if (!Number.isInteger(c?.pid) || c.pid <= 1) return false;
      try { process.kill(process.platform === 'win32' ? c.pid : -c.pid, signal); return true; } catch { return false; }
    }

    /**
     * Stop one host process: close its stdin (the preload turns that into one SIGTERM, and the closed pipe lets the
     * host exit once their stop is done; without the preload, a SIGTERM), and after their stop's allowance (killGrace)
     * kill the whole group. Once the host is gone, whatever is left of its group (a runtime it could not stop) is
     * killed too, so it never keeps a core busy or the view ports of its slot.
     */
    async function kill(c) {
      if (!c) return;
      if (c.exitCode === null && c.signalCode === null) {
        if (preload && c.stdin && !c.stdin.destroyed) c.stdin.destroy();
        else { try { c.kill('SIGTERM'); } catch { /* gone */ } }
        const t = setTimeout(() => { if (!signalGroup(c, 'SIGKILL')) { try { c.kill('SIGKILL'); } catch { /* gone */ } } }, grace);
        await c.exited;
        clearTimeout(t);
      }
      signalGroup(c, 'SIGKILL');
      GROUPS.delete(c);
    }

    host.close = (why = 'closed') => {
      closing ??= (async () => {
        clearTimeout(timer);
        live.delete(host); // a new game may start now; this one's ports stay taken until its processes are gone
        const t0 = Date.now();
        await kill(child);
        slots.delete(slot);
        all.delete(host);
        const data = settleData(host, failed || host.restarts > 0);
        event('mineai_host_close', { why: String(why).slice(0, 200), restarts: host.restarts, ms: Date.now() - t0, data });
        host.emit('closed', { why });
      })();
      return closing;
    };

    host.ready = (async () => {
      try {
        await waitReady(launch());
      } catch (err) {
        failed = true;
        await host.close(`start failed: ${err.message}`);
        throw err;
      }
      beat();
    })();
    host.ready.catch(() => {});
    return host;
  }

  return {
    start,
    get count() { return live.size; },
    killGraceMs: grace,
    /** The folders of failed games kept for diagnosis (oldest first). */
    kept: () => kept.map((k) => ({ ...k })),
    /** Close every host (the agent stops), those already closing included. */
    closeAll: (why = 'the agent stopped') => Promise.all([...all].map((h) => h.close(why))),
  };
}

/** Our prismarine-viewer package folder (the live views inside their bot process load it from here), or null. */
function viewerDir() {
  try {
    const url = import.meta.resolve('prismarine-viewer/package.json');
    return path.dirname(fileURLToPath(url));
  } catch { return null; }
}
