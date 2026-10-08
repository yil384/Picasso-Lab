// src/mineai/host.js - one Mine AI MCP host per guest game (BODY=mineai). Their host is one HTTP server (the
// supervisor) plus one child process with one mineflayer bot; this starts it from MINEAI_DIR on a loopback port of a
// private range (MINEAI_PORT_BASE, never 0.0.0.0) with a random token per host (MINEAI_HOST_TOKEN in its environment,
// never on a command line: our patch 0004 makes the host and its runtime refuse requests without it), passes the
// server, port and player name, waits for /health to report the bot connected, and watches it: a /health that fails
// MINEAI_HEARTBEAT_MISSES times in a row, a runtime their supervisor gave up on (their 5 s event-loop watchdog, widened
// by MINEAI_UNRESPONSIVE_MS through our patch 0003), a bot that lost its connection or a process that exited is a
// crash: the host is started again once, the second time it is down for good. It is killed when its game ends (the
// body's close: game end, lease end, the operator's end-everything kill switch) and with the agent; at most
// MINEAI_MAX_HOSTS run at once. Our environment's secrets never reach it.

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Runs inside their processes: ends the host with the agent, and serves the live views from the bot's process. */
export const PRELOAD = path.join(HERE, 'preload.mjs');
const KILL_GRACE_MS = 8_000; // their own stop gives the runtime 5 s before SIGKILL
const LINES_KEPT = 30;
/** Environment variables of ours a host never gets (keys, tokens, stream URLs). */
const SECRET = /KEY|TOKEN|SECRET|PASSWORD|RTMP|COOKIE|CREDENTIAL|AUTH/i;

/** Is a loopback TCP port free right now? */
export function portFree(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, host, () => s.close(() => resolve(true)));
  });
}

/** Their host's command line for one game (no token, no secret: those go through the environment). */
export function hostCommand(config, { port, username, instanceId, preload = PRELOAD }) {
  const m = config.mineai;
  const hostTs = path.join(m.dir, 'src', 'server', 'host.ts');
  const hostArgs = [
    '--minecraft-host', config.mc.host, '--minecraft-port', String(config.mc.port), '--version', config.mc.version,
    '--username', username, '--listen-host', '127.0.0.1', '--listen-port', String(port), '--instance-id', instanceId,
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

/**
 * @param {{config: object, log: object, spawnFn?: typeof spawn, fetchFn?: typeof fetch, isFree?: (port: number) => Promise<boolean>, preload?: string|null}} opts
 */
export function createHostManager({ config, log, spawnFn = spawn, fetchFn = globalThis.fetch, isFree = portFree, preload = PRELOAD }) {
  const m = config.mineai;
  const live = new Set();
  const slots = new Set(); // port indexes in use

  async function takeSlot() {
    for (let i = 0; i < m.ports; i++) {
      if (slots.has(i)) continue;
      slots.add(i);
      if (await isFree(m.portBase + i)) return i;
      // something else holds it: leave it marked for this host's life and try the next
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
    const slot = await takeSlot();
    if (slot === null) { live.delete(host); throw new Error('no free port for a Mine AI host'); }
    const port = m.portBase + slot;
    const token = crypto.randomBytes(24).toString('base64url');
    const viewPorts = views && m.views ? { watch: m.portBase + m.ports + slot, eyes: m.portBase + 2 * m.ports + slot } : null;
    const lines = [];
    let child = null;
    let closing = null;
    let timer = null;
    let misses = 0;
    let down = false;
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
    async function health(timeoutMs = Math.max(1_000, m.heartbeatMs)) {
      try {
        const r = await fetchFn(`http://127.0.0.1:${port}/health`, { headers: host.headers, signal: AbortSignal.timeout(timeoutMs) });
        const body = await r.json().catch(() => ({}));
        return { status: r.status, ...body };
      } catch { return null; }
    }
    host.health = health;
    const connected = (h) => h?.status === 200 && h.ok !== false && h.minecraft?.connected !== false;
    // their supervisor answers 503 with runtime.state while it starts, fails or has failed; their runtime answers 503
    // with minecraft.connected false once the bot lost its connection (a new connection needs a restart)
    const failed = (h) => h?.runtime?.state === 'failed' || h?.runtime?.state === 'failing' || (h?.minecraft?.connected === false && h?.runtime?.state !== 'starting');

    function launch() {
      const cmd = hostCommand(config, { port, username, instanceId, preload });
      const env = hostEnv(process.env, {
        MINEAI_HOST_TOKEN: token,
        MINEAI_UNRESPONSIVE_MS: String(m.unresponsiveMs),
        MINEAI_EXIT_WITH_PARENT: '1',
        ...(viewPorts ? { MINEAI_VIEWS: JSON.stringify({ watch: { port: viewPorts.watch, prefix: views.watch }, eyes: { port: viewPorts.eyes, prefix: views.eyes }, viewer: viewerDir() }) } : {}),
      });
      const c = spawnFn(cmd.exec, cmd.args, { cwd: m.dir, env, stdio: ['pipe', 'pipe', 'pipe'] });
      child = c;
      c.stdout?.on('data', keep);
      c.stderr?.on('data', keep);
      c.stdin?.on('error', () => {});
      c.on('error', (err) => keep(`spawn error: ${err.message}`));
      c.exited = new Promise((resolve) => c.once('exit', (code, signal) => resolve({ code, signal })));
      c.exited.then(({ code, signal }) => {
        if (child !== c || closing) return;
        event('mineai_host_exit', { code, signal, last: lines.slice(-3) });
        crashed(`its process exited (${signal ?? `code ${code}`})`);
      });
      event('mineai_host_start', { pid: c.pid ?? null, restart: host.restarts });
      return c;
    }

    /** Wait until /health says the bot is in the game (or the process exits, or startMs runs out). */
    async function waitReady(c) {
      const t0 = Date.now();
      let exited = null;
      c.exited.then((x) => { exited = x; });
      while (Date.now() - t0 < m.startMs) {
        if (closing) throw new Error('closed while starting');
        if (exited) throw new Error(`the Mine AI host exited while starting (${exited.signal ?? `code ${exited.code}`}): ${lines.slice(-2).join(' | ') || 'no output'}`);
        const h = await health(2_000);
        if (connected(h)) { host.lastHealth = h; event('mineai_host_ready', { ms: Date.now() - t0 }); return; }
        if (failed(h) && h?.runtime?.failure) throw new Error(`the Mine AI runtime failed while starting: ${String(h.runtime.failure.message ?? '').slice(0, 200)}`);
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
        if (failed(h)) { crashed(h?.runtime?.failure ? `its runtime stopped (${String(h.runtime.failure.code ?? 'failed')})` : 'its bot lost the connection to the server'); return; }
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
      if (host.restarts >= 1) { gone(`it crashed again: ${why}`); return; }
      host.restarts += 1;
      event('mineai_host_restart', { why });
      host.emit('crash', { why });
      recovering = (async () => {
        await kill(child);
        if (closing) return;
        const c = launch();
        try {
          await waitReady(c);
          misses = 0;
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
      clearTimeout(timer);
      event('mineai_host_down', { why });
      host.emit('down', { why });
      host.close(why).catch(() => {});
    }

    async function kill(c) {
      if (!c || c.exitCode !== null || c.signalCode !== null) return;
      try { c.kill('SIGTERM'); } catch { /* gone */ }
      const t = setTimeout(() => { try { c.kill('SIGKILL'); } catch { /* gone */ } }, KILL_GRACE_MS);
      await c.exited;
      clearTimeout(t);
    }

    host.close = (why = 'closed') => {
      closing ??= (async () => {
        clearTimeout(timer);
        await kill(child);
        live.delete(host);
        slots.delete(slot);
        event('mineai_host_close', { why: String(why).slice(0, 200), restarts: host.restarts });
        host.emit('closed', { why });
      })();
      return closing;
    };

    host.ready = (async () => {
      try {
        await waitReady(launch());
      } catch (err) {
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
    /** Close every host (the agent stops). */
    closeAll: (why = 'the agent stopped') => Promise.all([...live].map((h) => h.close(why))),
  };
}

/** Our prismarine-viewer package folder (the live views inside their bot process load it from here), or null. */
function viewerDir() {
  try {
    const url = import.meta.resolve('prismarine-viewer/package.json');
    return path.dirname(fileURLToPath(url));
  } catch { return null; }
}
