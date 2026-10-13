// src/mc-ready.js - is the Minecraft server up for a new bot? Right after a restart the agent answers in about 5 s and
// Paper takes about 17 s (staging, 2026-10-13: a start_game in that window failed with "the Mine AI runtime failed
// while starting: Runtime exited: code=1", the bot could not reach the server). start_game asks this first: a status
// ping (the server answers it only once its world is loaded), again every second for a bounded time; a server that
// answered is believed for a while without asking again.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * @param {object} o
 * @param {string} o.host
 * @param {number} o.port
 * @param {string} [o.version]                  the game version for the ping's protocol
 * @param {(o: object) => Promise<any>} [o.ping] a status ping (minecraft-protocol's ping by default; tests pass their own)
 * @param {number} [o.trustMs]                   an answer is believed this long (15 s)
 * @param {number} [o.everyMs]                   between pings while waiting (1 s)
 * @param {() => number} [o.now]
 * @returns {(w: {waitMs: number, signal?: AbortSignal}) => Promise<{ok: boolean, waitedMs: number, error?: string}>}
 */
export function createServerReady(o) {
  const now = o.now ?? Date.now;
  const ping = o.ping ?? ((opts) => require('minecraft-protocol').ping(opts));
  const trustMs = o.trustMs ?? 15_000;
  const everyMs = o.everyMs ?? 1_000;
  let okAt = -Infinity;
  const once = async () => {
    try {
      await ping({ host: o.host, port: o.port, ...(o.version ? { version: o.version } : {}), closeTimeout: 3_000, noPongTimeout: 3_000 });
      okAt = now();
      return null;
    } catch (e) { return String(e?.code ?? e?.message ?? e).slice(0, 120); }
  };
  return async ({ waitMs, signal } = {}) => {
    const t0 = now();
    if (now() - okAt < trustMs) return { ok: true, waitedMs: 0 };
    let error = await once();
    if (!error) return { ok: true, waitedMs: 0 }; // up at the first ask: no wait (the ping's own time is not one)
    while (error && now() - t0 < (waitMs ?? 0) && !signal?.aborted) {
      await new Promise((r) => { const t = setTimeout(r, everyMs); t.unref?.(); });
      error = await once();
    }
    return error ? { ok: false, waitedMs: now() - t0, error } : { ok: true, waitedMs: now() - t0 };
  };
}
