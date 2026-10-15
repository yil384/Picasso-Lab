// src/config.js - settings from the environment. The broker is Alpaca's PAPER API, wired in here: no setting can point
// the server at live trading. With ALPACA_KEY_ID and ALPACA_SECRET_KEY set it talks to Alpaca's paper account and real
// market data; without them it starts its own mock of the Alpaca API on this machine (src/mock-alpaca.js) and says so
// on every page. The only other broker URL it accepts is a mock on this machine (tests).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');

/** Alpaca's paper trading API and its market data API (the same data for paper and live accounts). */
export const PAPER_BASE_URL = 'https://paper-api.alpaca.markets';
export const DATA_BASE_URL = 'https://data.alpaca.markets';

const isLocal = (u) => ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && u.protocol === 'http:';

/**
 * Is this URL one the server may send orders to? The paper API, or a mock on this machine. Anything else (Alpaca's
 * live API https://api.alpaca.markets above all) is refused.
 * @returns {[string|null, string|null]} [the URL without a trailing slash, null] or [null, why not]
 */
export function brokerUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return [null, `not a URL: ${String(raw).slice(0, 80)}`]; }
  if (u.username || u.password || u.search || u.hash) return [null, 'a broker URL has no user, query or fragment'];
  if (u.origin === PAPER_BASE_URL || isLocal(u)) return [u.origin, null];
  if (/(^|\.)alpaca\.markets$/.test(u.hostname)) return [null, `refused: ${u.origin} is not Alpaca's paper API (${PAPER_BASE_URL}); this server never trades real money`];
  return [null, `refused: ${u.origin} is neither Alpaca's paper API nor a mock on this machine`];
}

/**
 * The settings: [config, null] or [null, why the server cannot start].
 * @param {Record<string, string|undefined>} env
 */
export function loadConfig(env = process.env) {
  const keyId = String(env.ALPACA_KEY_ID ?? '').trim();
  const secret = String(env.ALPACA_SECRET_KEY ?? '').trim();
  if (Boolean(keyId) !== Boolean(secret)) return [null, 'set both ALPACA_KEY_ID and ALPACA_SECRET_KEY (paper keys), or neither (the mock)'];
  if (/^AK/.test(keyId)) return [null, 'ALPACA_KEY_ID starts with AK, the prefix of live-trading keys; use the keys of a paper account (they start with PK)'];
  // tests and the mock only: a broker on this machine (a live URL is refused, whatever the keys)
  let trading = PAPER_BASE_URL;
  let data = DATA_BASE_URL;
  if (env.ALPACA_BASE_URL) {
    const [u, err] = brokerUrl(env.ALPACA_BASE_URL);
    if (err) return [null, `ALPACA_BASE_URL ${err}`];
    trading = u;
    data = u; // the mock serves both
  }
  const mock = !keyId;
  const port = Number(env.PORT ?? env.WEB_PORT ?? 8790);
  if (!Number.isInteger(port) || port < 0 || port > 65535) return [null, `PORT ${env.PORT ?? env.WEB_PORT} is not a port`];
  return [{
    alpaca: { keyId, secret, trading, data, mock, feed: env.ALPACA_FEED || 'iex', localBroker: Boolean(env.ALPACA_BASE_URL) },
    web: {
      host: env.WEB_HOST || '127.0.0.1',
      port,
      publicUrl: String(env.WEB_PUBLIC_URL ?? '').replace(/\/+$/, ''),
      proxySecret: String(env.WEB_PROXY_SECRET ?? ''),
      trustProxy: env.WEB_TRUST_PROXY === '1',
    },
    ownerKey: String(env.MCP_OWNER_KEY ?? ''),
    dataDir: path.resolve(env.DATA_DIR || path.join(ROOT, 'run')),
    listsDir: path.resolve(env.LISTS_DIR || path.join(ROOT, 'data')),
    // how often the server looks at the account (fills, equity, outcomes), ms
    tickMs: Number(env.TICK_MS ?? 60_000),
    sourceUrl: String(env.SOURCE_URL ?? ''),
  }, null];
}
