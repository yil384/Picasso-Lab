// src/mineai/preload.mjs - loaded (--import, or Bun's --preload) into the Mine AI MCP host's processes by
// src/mineai/host.js; their runtime child inherits the flag. No change to their code. Two jobs:
// 1. In the host process (it has no IPC channel): end it when the agent goes away. The agent holds the host's stdin
//    open; when that pipe closes (the agent stopped or crashed) the host gets SIGTERM and shuts down as it does on
//    Ctrl-C, taking its runtime and bot with it. MINEAI_EXIT_WITH_PARENT=1 turns this on.
// 2. In the runtime process (the one with the bot): the live views. With MINEAI_VIEWS set, once the bot has spawned,
//    two read-only prismarine-viewer servers (our copy of the package, from MINEAI_VIEWS.viewer) listen on 127.0.0.1
//    only, under the game's /watch/<view id> and /eyes/<view id> prefixes, so src/web.js proxies them exactly as it
//    proxies the views of a bot in its own process. Page clicks reach nothing (the viewer's click handler is removed).

import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';

const hasIpc = typeof process.send === 'function';

if (!hasIpc && process.env.MINEAI_EXIT_WITH_PARENT === '1' && process.stdin && !process.stdin.isTTY) {
  let ended = false;
  const end = () => { if (!ended) { ended = true; process.kill(process.pid, 'SIGTERM'); } };
  process.stdin.on('end', end);
  process.stdin.on('close', end);
  process.stdin.on('error', end);
  process.stdin.resume();
}

if (hasIpc && process.env.MINEAI_VIEWS) {
  try {
    const views = JSON.parse(process.env.MINEAI_VIEWS);
    if (views?.viewer) hookCreateBot(views);
  } catch (err) {
    process.stderr.write(`[muse-views] off: ${err?.message ?? err}\n`);
  }
}

/** Wrap their mineflayer's createBot (the copy their runtime imports, resolved from its folder) to start the views. */
function hookCreateBot(views) {
  const theirs = createRequire(path.join(process.cwd(), 'package.json'));
  const mineflayer = theirs('mineflayer');
  const original = mineflayer.createBot;
  mineflayer.createBot = function createBot(...args) {
    const bot = original.apply(this, args);
    bot.once('spawn', () => setImmediate(() => {
      try { startViews(bot, views); } catch (err) { process.stderr.write(`[muse-views] could not start: ${err?.message ?? err}\n`); }
    }));
    return bot;
  };
}

/** Run fn while every http server it starts listens on 127.0.0.1 only (prismarine-viewer has no host option). */
function onLoopback(fn) {
  const proto = http.Server.prototype;
  const own = Object.hasOwn(proto, 'listen');
  const original = proto.listen;
  proto.listen = function listen(port, ...rest) {
    this.on('error', (err) => process.stderr.write(`[muse-views] ${err?.message ?? err}\n`));
    if (typeof port === 'number' && typeof rest[0] !== 'string') return original.call(this, port, '127.0.0.1', ...rest);
    return original.call(this, port, ...rest);
  };
  try { return fn(); } finally { if (own) proto.listen = original; else delete proto.listen; }
}

function startViews(bot, views) {
  const ours = createRequire(path.join(views.viewer, 'package.json'));
  const lib = ours('./viewer');
  if (!lib.WorldView.readOnly) { // read-only: the viewer's click handler trusts its payload; nothing here uses clicks
    const Base = lib.WorldView;
    class ReadOnlyWorldView extends Base {
      constructor(...a) { super(...a); this.emitter.removeAllListeners('mouseClick'); }
    }
    ReadOnlyWorldView.readOnly = true;
    lib.WorldView = ReadOnlyWorldView;
  }
  const viewer = ours('./lib/mineflayer');
  for (const [v, firstPerson] of [[views.watch, false], [views.eyes, true]]) {
    if (!v?.port) continue;
    onLoopback(() => viewer(bot, { port: v.port, firstPerson, viewDistance: 4, prefix: v.prefix }));
  }
  process.stderr.write(`[muse-views] live views on 127.0.0.1:${views.watch?.port} and :${views.eyes?.port}\n`);
}
