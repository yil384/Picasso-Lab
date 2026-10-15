// src/index.js - starts the server: the settings (src/config.js), the broker (Alpaca paper with keys; without them a
// mock on this machine, and the record kept apart in DATA_DIR/mock so made-up trades never mix with the real
// challenge in DATA_DIR/paper), the desk, the floor, the web server, and the tick that keeps the record.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './config.js';
import { createAlpaca } from './alpaca.js';
import { createMockAlpaca } from './mock-alpaca.js';
import { createStore } from './journal.js';
import { loadUniverse } from './universe.js';
import { createTrader } from './trader.js';
import { createFloor } from './floor.js';
import { createWeb } from './web.js';

/**
 * Start everything: [{server, url, trader, close}, null] or [null, why not].
 * @param {Record<string, string|undefined>} env
 * @param {{now?: () => number, tick?: boolean, settleMs?: number}} [o]
 */
export async function start(env = process.env, o = {}) {
  const [cfg, err] = loadConfig(env);
  if (err) return [null, err];
  let mock = null;
  let broker = cfg.alpaca;
  if (cfg.alpaca.mock && !cfg.alpaca.localBroker) {
    mock = createMockAlpaca({ now: o.now });
    const url = await mock.listen(0);
    broker = { ...broker, trading: url, data: url };
  }
  const now = o.now ?? (() => Date.now());
  const store = createStore(path.join(cfg.dataDir, cfg.alpaca.mock ? 'mock' : 'paper'), { now });
  const trader = createTrader({ alpaca: createAlpaca(broker), store, uni: loadUniverse(cfg.listsDir), now, mock: cfg.alpaca.mock, settleMs: o.settleMs ?? 1200 });
  const floor = createFloor(trader, { now });
  const server = createWeb({ cfg, trader, floor });
  await new Promise((ok, no) => { server.once('error', no); server.listen(cfg.web.port, cfg.web.host, ok); });
  const a = server.address();
  const url = `http://${a.address === '0.0.0.0' ? '127.0.0.1' : a.address}:${a.port}`;
  let timer = null;
  const tick = async () => {
    try { await trader.tick(); floor.forget(); } catch (e) { console.error(`tick: ${String(e?.message ?? e).slice(0, 200)}`); }
  };
  if (o.tick !== false) {
    await tick();
    timer = setInterval(tick, cfg.tickMs);
    timer.unref();
  }
  return [{
    server, url, trader, floor, mock, cfg,
    async close() {
      clearInterval(timer);
      server.closeAllConnections?.();
      await new Promise((ok) => server.close(() => ok()));
      if (mock) await mock.close();
    },
  }, null];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [app, err] = await start();
  if (err) { console.error(`muse-trader: ${err}`); process.exit(2); }
  console.log(`muse-trader on ${app.url} (${app.cfg.alpaca.mock ? 'MOCK broker: no ALPACA_KEY_ID/ALPACA_SECRET_KEY, prices are made up' : 'Alpaca PAPER account, real market data'}); MCP at ${app.url}/mcp${app.cfg.ownerKey ? ' (trading needs ?key=MCP_OWNER_KEY)' : ' (no MCP_OWNER_KEY: trading only from this machine)'}`);
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => app.close().then(() => process.exit(0)));
}
