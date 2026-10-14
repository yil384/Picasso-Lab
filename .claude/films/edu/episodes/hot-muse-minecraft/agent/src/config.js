// src/config.js - every setting comes from an env var with a default, is checked once and frozen. The API key, the
// admin token and the stream URLs (they hold stream keys) are non-enumerable, so JSON.stringify(config) and
// console.log(config) never print them.

import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';
export const TIERS = Object.freeze(['standard', 'contributor']);
/** Muse Spark reasoning levels. 'none' returns HTTP 400; 'minimal' is the floor; 'max' is Standard tier only. */
export const EFFORTS = Object.freeze(['minimal', 'low', 'medium', 'high', 'xhigh', 'max']);

export class ConfigError extends Error {
  constructor(problems) {
    super(`bad configuration:\n- ${problems.join('\n- ')}`);
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

/** True for localhost / 127.x / ::1: the only hosts tests may talk to and where no key is needed. */
export function isLoopbackHost(host) {
  const h = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  return h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h);
}

/** True for loopback or a private LAN address: where the Minecraft server is allowed to live. */
export function isLanHost(host) {
  const h = String(host).replace(/^\[|\]$/g, '').toLowerCase();
  if (isLoopbackHost(h) || h.endsWith('.local')) return true;
  const m = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  return /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h);
}

/** True when a URL points at this machine (the mock LLM), false for any remote API. */
export function isLocalUrl(url) {
  try { return isLoopbackHost(new URL(url).hostname); } catch { return false; }
}

/** An IP address or an IP/prefix range (CIDR) such as 172.24.0.5 or 172.24.0.0/16: [address, prefix|null], or null. */
export function parseAddressRange(text) {
  const m = String(text ?? '').trim().match(/^([^/\s]+)(?:\/(\d{1,3}))?$/);
  if (!m) return null;
  const ip = m[1].replace(/^\[|\]$/g, '');
  const family = net.isIP(ip);
  if (!family) return null;
  if (m[2] === undefined) return [ip, null];
  const prefix = Number(m[2]);
  return prefix <= (family === 4 ? 32 : 128) ? [ip, prefix] : null;
}

/**
 * The Facebook video plugin URL that plays a live video (its public URL) inside another page's frame: the form the
 * owner saw play inside muse.ai's artifact panel on 2026-10-08.
 */
export function facebookEmbedUrl(videoUrl) {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&width=1280`;
}

/** True for an https URL on facebook.com (or fb.watch): the only live-video player the muse.ai panel frames. */
export function isFacebookVideoUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (/(^|\.)facebook\.com$/i.test(u.hostname) || /^fb\.watch$/i.test(u.hostname)) && !u.username;
  } catch { return false; }
}

function reader(env, problems) {
  const raw = (k) => {
    const v = env[k];
    return v === undefined || String(v).trim() === '' ? undefined : String(v).trim();
  };
  const bad = (k, want, v) => problems.push(`${k} must be ${want} (got "${v}")`);
  return {
    str: (k, def) => raw(k) ?? def,
    int(k, def, min, max) {
      const v = raw(k);
      if (v === undefined) return def;
      const n = Number(v);
      if (!Number.isInteger(n) || n < min || n > max) { bad(k, `an integer from ${min} to ${max}`, v); return def; }
      return n;
    },
    num(k, def, min, max) {
      const v = raw(k);
      if (v === undefined) return def;
      const n = Number(v);
      if (!Number.isFinite(n) || n < min || n > max) { bad(k, `a number from ${min} to ${max}`, v); return def; }
      return n;
    },
    bool(k, def) {
      const v = raw(k);
      if (v === undefined) return def;
      if (/^(1|true|yes|on)$/i.test(v)) return true;
      if (/^(0|false|no|off)$/i.test(v)) return false;
      bad(k, 'true or false', v);
      return def;
    },
    oneOf(k, def, list) {
      const v = raw(k);
      if (v === undefined) return def;
      if (!list.includes(v)) { bad(k, `one of ${list.join(', ')}`, v); return def; }
      return v;
    },
  };
}

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  return Object.freeze(o);
}

function hidden(obj, key, value) {
  Object.defineProperty(obj, key, { value, enumerable: false });
  return obj;
}

/** Build a frozen config from an env object (defaults to process.env). Throws ConfigError listing every problem. */
export function loadConfig(env = process.env) {
  const problems = [];
  const r = reader(env, problems);
  const fromRoot = (p) => path.resolve(ROOT, p);

  // Model. The tier decides the price table; on Meta's API the tier is chosen by the model id (-contributor).
  const baseURL = r.str('MODEL_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, '');
  try {
    const u = new URL(baseURL);
    if (!/^https?:$/.test(u.protocol)) problems.push('MODEL_BASE_URL must be http(s)');
    else if (u.protocol === 'http:' && !isLanHost(u.hostname)) problems.push('MODEL_BASE_URL must use https for a remote API');
  } catch { problems.push(`MODEL_BASE_URL is not a URL (got "${baseURL}")`); }
  const idEnv = r.str('MODEL_ID');
  const tier = r.oneOf('MODEL_TIER', idEnv?.endsWith('-contributor') ? 'contributor' : 'standard', TIERS);
  const id = idEnv ?? (tier === 'contributor' ? 'muse-spark-1.3-contributor' : 'muse-spark-1.3');
  if (tier === 'contributor' && !id.endsWith('-contributor')) {
    problems.push(`MODEL_TIER=contributor but MODEL_ID=${id} is billed at Standard prices, so the $ caps would under-count; use a -contributor model id or MODEL_TIER=standard`);
  }
  const effortRaw = r.str('MODEL_EFFORT', 'low');
  let effort = effortRaw;
  if (effortRaw === 'none') { problems.push('MODEL_EFFORT=none is rejected by Muse Spark (HTTP 400); minimal is the lowest'); effort = 'low'; }
  else effort = r.oneOf('MODEL_EFFORT', 'low', EFFORTS);
  if (effort === 'max' && tier === 'contributor') problems.push('MODEL_EFFORT=max is Standard tier only');
  const cacheRaw = r.str('MODEL_CACHE_KEY', 'muse-mc-v1');
  const model = {
    baseURL,
    id,
    tier,
    effort,
    cacheKey: /^(off|none|0|false)$/i.test(cacheRaw) ? '' : cacheRaw,
    stream: r.bool('MODEL_STREAM', true),
    toolSchema: r.oneOf('MODEL_TOOL_SCHEMA', 'full', ['full', 'basic']),
    maxTokens: r.int('MODEL_MAX_TOKENS', 8192, 0, 1_000_000),
    timeoutMs: r.int('MODEL_TIMEOUT_MS', 120_000, 1_000, 3_600_000),
    maxRetries: r.int('MODEL_MAX_RETRIES', 2, 0, 10),
  };
  const apiKey = r.str('MODEL_API_KEY', '');
  model.hasKey = apiKey.length > 0;
  hidden(model, 'apiKey', apiKey);

  // Minecraft: offline-mode server, so it must never be reachable from the internet.
  const mc = {
    host: r.str('MC_HOST', '127.0.0.1'),
    port: r.int('MC_PORT', 25565, 1, 65535),
    version: r.str('MC_VERSION', '1.21.4'),
    username: r.str('MC_USERNAME', 'Muse'),
    // the server lets in only listed players (the Paper container on picasso): each guest bot gets a name nobody can
    // guess and is put on the list through the console (MC_CONSOLE) just before it joins, and taken off when it leaves
    whitelist: r.bool('MC_WHITELIST', false),
    auth: 'offline',
    viewerPort: r.int('MC_VIEWER_PORT', 3007, 0, 65535),
  };
  if (!isLanHost(mc.host)) problems.push(`MC_HOST must be localhost or a LAN address, never a public host (got "${mc.host}")`);
  if (!/^[A-Za-z0-9_]{3,16}$/.test(mc.username)) problems.push(`MC_USERNAME must be 3-16 letters, digits or _ (got "${mc.username}")`);

  // Viewer channel: the only part meant to be exposed (through a tunnel).
  const trustRaw = r.str('WEB_TRUST_PROXY', 'off').toLowerCase();
  let trustProxy = 'off';
  if (trustRaw === 'cloudflare' || trustRaw === 'off') trustProxy = trustRaw;
  else if (/^[1-5]$/.test(trustRaw)) trustProxy = Number(trustRaw);
  else problems.push(`WEB_TRUST_PROXY must be off, cloudflare or a number of proxy hops from 1 to 5 (got "${trustRaw}")`);
  // The proxy's own address(es): forwarded headers count only on connections from there, and any other peer that is
  // not this machine is refused (on picasso: the Caddy container in front of the published port).
  const trustedProxies = r.str('WEB_TRUSTED_PROXIES', '').split(',').map((x) => x.trim()).filter(Boolean);
  for (const t of trustedProxies) if (!parseAddressRange(t)) problems.push(`WEB_TRUSTED_PROXIES must be IP addresses or ranges such as 172.24.0.5 or 172.24.0.0/16, separated by commas (got "${t}")`);
  if (trustedProxies.length && trustProxy === 'off') problems.push('WEB_TRUSTED_PROXIES needs WEB_TRUST_PROXY (cloudflare, or the number of proxies that append to X-Forwarded-For)');
  const maxSessions = r.int('WEB_MAX_SESSIONS', 4, 1, 64);
  const web = {
    host: r.str('WEB_HOST', '127.0.0.1'),
    port: r.int('WEB_PORT', 8787, 0, 65535),
    publicUrl: r.str('WEB_PUBLIC_URL', '').replace(/\/+$/, ''),
    trustProxy,
    trustedProxies,
    leaseMs: r.int('WEB_LEASE_MS', 600_000, 10_000, 86_400_000),
    // a test caller (TEST SCRIPT: the smoke and check scripts, by their MCP client name) gets no Facebook live from
    // live_view unless this is on: the live videos a day are few (FB_MAX_PER_DAY) and the owner's (2026-10-13: the
    // smoke games of one day used up 20 and the owner's game got none)
    testLives: r.bool('MCP_TEST_LIVE', false),
    // with it on, a test caller's live_view has the camera film its game for the recording only (RECORD on the camera
    // service), never on Facebook: how the recording is tested without spending a live video
    testRecord: r.bool('MCP_TEST_RECORD', false),
    maxSessions,
    // live MCP games one address may hold: connector users arrive from their agent's cloud, so many people can share an
    // address (probe T8 measures how many); set it to WEB_MAX_SESSIONS to cap MCP games only by the global limit
    mcpGamesPerAddress: r.int('WEB_MCP_GAMES_PER_ADDRESS', 3, 1, 64),
    // the public server's limits (the owner, 2026-10-14: play.picasso-lab.com/mcp opens to everyone at launch): new
    // games one address may start in an hour, the requests one MCP session may send in a minute, and a game's idle end
    mcpStartsPerHour: r.int('WEB_MCP_STARTS_PER_HOUR', 10, 1, 10_000),
    mcpRequestsPerMinute: r.int('WEB_MCP_REQUESTS_PER_MINUTE', 120, 10, 100_000),
    idleMs: r.int('WEB_IDLE_MS', 300_000, 30_000, 3_600_000),
    // PUBLIC_PLAY=off closes the server to new games (start_game answers CLOSED) except for the owner's key; the
    // operator's /admin/public does the same at once, without a restart. PUBLIC_CHAT=on lets every caller use say
    publicPlay: r.bool('PUBLIC_PLAY', true),
    publicChat: r.bool('PUBLIC_CHAT', false),
    // the open-source agent server, linked from the page a browser gets at /mcp (empty: no link)
    openSourceUrl: r.str('OPEN_SOURCE_URL', 'https://github.com/yil384/minecraft-agent-mcp'),
    // address hashes that may not play (the operator's /admin/games shows them): comma separated
    bannedIps: r.str('WEB_BANNED_IPS', '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
    askPerHour: r.int('WEB_ASK_PER_HOUR', 3, 1, 10_000),
    askMaxChars: r.int('WEB_ASK_MAX_CHARS', 300, 20, 4_000),
    askAllowContributor: r.bool('WEB_ASK_ALLOW_CONTRIBUTOR', false),
    maxBodyBytes: r.int('WEB_MAX_BODY', 8_192, 1_024, 1_048_576),
  };
  if (web.openSourceUrl && !/^https:\/\/[^\s"<>]+$/.test(web.openSourceUrl)) problems.push(`OPEN_SOURCE_URL must be an https URL (got "${web.openSourceUrl}")`);
  if (web.publicUrl) {
    try {
      if (!/^https?:$/.test(new URL(web.publicUrl).protocol)) problems.push('WEB_PUBLIC_URL must be http(s)');
    } catch { problems.push(`WEB_PUBLIC_URL is not a URL (got "${web.publicUrl}")`); }
  }
  const adminToken = r.str('WEB_ADMIN_TOKEN', '');
  if (adminToken && adminToken.length < 24) {
    problems.push('WEB_ADMIN_TOKEN must be at least 24 characters (make one with: openssl rand -base64 24)');
  }
  hidden(web, 'adminToken', adminToken);
  // the salt of the address hashes (logs and the operator see a hash, never an address); without it, one made from
  // the admin token (stable across restarts), else a random one for this process
  hidden(web, 'ipSalt', r.str('WEB_IP_SALT', ''));
  // A secret the proxy in front adds to every request it forwards (X-Muse-Proxy; Caddy: header_up). On picasso the
  // published port goes through docker-proxy, so every connection arrives from the bridge gateway, Caddy's and any
  // local user's alike: the address cannot tell them apart, the secret can.
  const proxySecret = r.str('WEB_PROXY_SECRET', '');
  if (proxySecret && (proxySecret.length < 24 || !/^[\x21-\x7e]+$/.test(proxySecret))) {
    problems.push('WEB_PROXY_SECRET must be at least 24 printable characters without spaces (make one with: openssl rand -hex 24)');
  }
  if (proxySecret && trustProxy === 'off') problems.push('WEB_PROXY_SECRET needs WEB_TRUST_PROXY (cloudflare, or the number of proxies that append to X-Forwarded-For)');
  hidden(web, 'proxySecret', proxySecret);
  // The owner's key (deploy/.env, never in code): an MCP connection that brings it (?owner=<key> on the /mcp URL, the
  // header X-Muse-Owner, or Authorization: Bearer) puts its games first in line for the camera (src/fb-live.js) and for
  // a bot, plays while public play is off, may use say, and is held to none of the per-address limits or bans
  const ownerKey = r.str('MCP_OWNER_KEY', '');
  if (ownerKey && (ownerKey.length < 16 || !/^[A-Za-z0-9_-]+$/.test(ownerKey))) problems.push('MCP_OWNER_KEY must be at least 16 letters, digits, _ or - (make one with: openssl rand -hex 16)');
  hidden(web, 'ownerKey', ownerKey);

  // Which body plays a guest game: ours (mineflayer in this process, src/body.js) or mineai (one Mine AI MCP host per
  // game in its own process, src/mineai/). Production keeps ours until the switch is flipped.
  const body = {
    kind: r.oneOf('BODY', 'ours', ['ours', 'mineai']),
    maxTravel: r.int('BODY_MAX_TRAVEL', 256, 8, 10_000),
  };
  // BODY=mineai: the Mine AI MCP runtime (built by mineai/fetch-and-patch.sh), one host per guest game on
  // a loopback port of a private range, with a random token per host (never on a command line)
  const mineaiDir = r.str('MINEAI_DIR', '');
  const mineaiData = r.str('MINEAI_DATA_DIR', '');
  const mineai = {
    dir: mineaiDir ? path.resolve(ROOT, mineaiDir) : '',
    runtime: r.oneOf('MINEAI_RUNTIME', 'node', ['node', 'bun']),
    exec: r.str('MINEAI_EXEC', ''), // the node (24.15 or newer) or bun binary; default: this node, or "bun" on the PATH
    portBase: r.int('MINEAI_PORT_BASE', 27100, 1024, 65_000),
    ports: r.int('MINEAI_PORTS', 64, 1, 512),
    maxHosts: r.int('MINEAI_MAX_HOSTS', maxSessions, 1, 64),
    startMs: r.int('MINEAI_START_MS', 90_000, 5_000, 600_000),
    heartbeatMs: r.int('MINEAI_HEARTBEAT_MS', 5_000, 200, 60_000),
    heartbeatMisses: r.int('MINEAI_HEARTBEAT_MISSES', 3, 1, 100),
    // the runtime's own watchdog (its child's event loop), patched to read this: 5 s upstream, more for a loaded host
    unresponsiveMs: r.int('MINEAI_UNRESPONSIVE_MS', 5_000, 5_000, 120_000),
    dataDir: mineaiData ? path.resolve(ROOT, mineaiData) : '', // per-bot SQLite; empty: temporary, gone with the host
    // a game's bot data and incidents are deleted when it ends, except the last keepFailed games that crashed or failed
    // to join (for diagnosis); at agent start, game folders older than dataDays go
    keepFailed: r.int('MINEAI_KEEP_FAILED', 10, 0, 1_000),
    dataDays: r.num('MINEAI_DATA_DAYS', 3, 0.01, 365),
    views: r.bool('MINEAI_VIEWS', true), // the live views (/eyes, /watch) from a viewer inside the host's bot process
    // the body and the player (src/mineai/care.js): advise (the default: the player plans its survival from the advice
    // in every reply; the body acts by itself only through its reflexes), full (it also shelters, eats, hunts, crafts
    // a shield, armor and spare tools and goes back after a death by itself, between the player's calls: for casual
    // guests), off (only their reflexes, as they come). true and false, the old values, are full and off.
    care: (() => {
      const v = String(r.str('MINEAI_CARE', '')).trim();
      if (/^(1|true|yes|on)$/i.test(v)) return 'full';
      if (/^(0|false|no)$/i.test(v)) return 'off';
      return r.oneOf('MINEAI_CARE', 'advise', ['advise', 'full', 'off']);
    })(),
  };
  if (body.kind === 'mineai' && !mineai.dir) problems.push('BODY=mineai needs MINEAI_DIR, the folder with the Mine AI MCP runtime (mineai/fetch-and-patch.sh <dir>)');
  if (mineai.portBase + 3 * mineai.ports > 65_535) problems.push('MINEAI_PORT_BASE + 3 x MINEAI_PORTS must stay under 65536 (each host takes a port and its two live views two more)');

  const caps = {
    steps: r.int('STEP_CAP', 300, 1, 100_000),
    usdPerRun: r.num('COST_CAP_RUN', 1.0, 0, 10_000),
    usdPerHour: r.num('COST_CAP_HOUR', 3.0, 0, 10_000),
    // 8, not 5: in real terrain the model explores (collect finds nothing, a walk settles short) before it finds ore
    consecutiveErrors: r.int('ERROR_CAP', 8, 1, 1_000),
    loopRepeat: r.int('LOOP_REPEAT', 3, 2, 100),
  };

  // The /ask house brain keeps notes of its own: viewer-driven runs never write the notes the filmed runs read.
  const memory = {
    notesPath: fromRoot(r.str('NOTES_PATH', 'notes.json')),
    askNotesPath: fromRoot(r.str('ASK_NOTES_PATH', 'notes-ask.json')),
    shortSteps: r.int('SHORT_MEMORY', 8, 0, 200),
  };
  if (memory.askNotesPath === memory.notesPath) problems.push('ASK_NOTES_PATH must differ from NOTES_PATH');

  const log = { dir: fromRoot(r.str('LOG_DIR', 'logs')) };

  // Live video of guest games (src/stream.js): off unless STREAM_ENABLED. The output URLs carry stream keys: hidden.
  const outputs = r.str('STREAM_RTMP_URL', '').split(',').map((x) => x.trim()).filter(Boolean);
  if (outputs.some((o) => !/^rtmps?:\/\/[^\s/]+\/\S+$/i.test(o))) problems.push('STREAM_RTMP_URL must be rtmp:// or rtmps:// URLs with their stream key, separated by commas');
  const outDir = r.str('STREAM_OUT_DIR', '');
  // the public URL of the live video each output feeds (same order as STREAM_RTMP_URL; one URL serves every output):
  // what live_view {format: "embed"} turns into the Facebook player's embed URL while a game's stream runs
  const videoUrls = r.str('STREAM_VIDEO_URL', '').split(',').map((x) => x.trim()).filter(Boolean);
  if (videoUrls.some((v) => !isFacebookVideoUrl(v))) problems.push('STREAM_VIDEO_URL must be https URLs of Facebook live videos (facebook.com or fb.watch), separated by commas');
  const stream = {
    enabled: r.bool('STREAM_ENABLED', false),
    videoUrls,
    serviceUrl: r.str('STREAM_SERVICE_URL', '').replace(/\/+$/, ''),
    outDir: outDir ? fromRoot(outDir) : '',
    max: r.int('STREAM_MAX', 1, 0, 16),
    fps: r.int('STREAM_FPS', 30, 10, 30),
    scale: r.num('STREAM_SCALE', 0.5, 0.25, 1),
    bitrateK: r.int('STREAM_BITRATE_K', 3000, 500, 8000),
    far: r.int('STREAM_FAR', 48, 16, 256),
    maxRssMB: r.int('STREAM_MAX_RSS_MB', 1600, 300, 16_000),
    noSandbox: r.bool('STREAM_NO_SANDBOX', false),
    // test only: a large wall clock (HH:MM:SS in STREAM_CLOCK_TZ) burned into the top-right corner, to read the
    // end-to-end delay against a clock on the viewer's screen
    clock: r.bool('STREAM_CLOCK', false),
    clockTz: r.str('STREAM_CLOCK_TZ', 'America/Los_Angeles'),
    // 'viewer': prismarine-viewer in headless Chromium (src/stream.js); 'client': the real Minecraft client as a
    // spectator in the bot's head (src/camera.js, the camera container)
    source: r.oneOf('STREAM_SOURCE', 'viewer', ['viewer', 'client']),
    // the real-client camera's picture: 'ui', square by default (it fills the width of muse.ai's panel, about
    // 1000x1050 on a desktop), the game on top and Muse's panel under it (src/ui-panel.js: the mascot, the command in
    // plain words, the advice, the status); 'terminal', vertical, the game over a terminal of Muse's calls; or
    // 'landscape', the game alone at 1280x720
    layout: r.oneOf('STREAM_LAYOUT', 'ui', ['ui', 'terminal', 'landscape']),
    uiSize: r.oneOf('STREAM_UI_SIZE', '1080x1080', ['1080x1080', '1080x1200', '1080x1350']),
    // the HUD's design in the ui layout: 'b' (concept B "Speedrun broadcast", src/hud-b.js) or 'final' (the one before)
    hud: r.oneOf('STREAM_HUD', 'b', ['b', 'final']),
    // the lab's logo at the top right of the video (B only; never in the clean recording): off, a light logo on a white
    // card (card), or a transparent light logo drawn as it is with a hard dark shadow (plain); STREAM_LOGO_FILE its PNG,
    // a name in assets/muse-ui or an absolute path (default: the official logo, assets/muse-ui/lab-logo-152.png)
    logo: r.oneOf('STREAM_LOGO', 'off', ['off', 'card', 'plain']),
    logoFile: r.str('STREAM_LOGO_FILE', ''),
    terminalSize: r.oneOf('STREAM_TERMINAL_SIZE', '1080x1920', ['1080x1920', '1080x1350']),
    // the sound (camera only): the game's own from the client (STREAM_GAME_AUDIO, its music off), and a soft CC0
    // music bed under it (STREAM_MUSIC, assets/muse-ui/music), ducked while the game is loud, then a limiter
    gameAudio: r.bool('STREAM_GAME_AUDIO', true),
    music: r.bool('STREAM_MUSIC', true),
    musicFile: r.str('STREAM_MUSIC_FILE', ''),
    musicDb: r.num('STREAM_MUSIC_DB', -15, -40, 6),
    gameDb: r.num('STREAM_GAME_DB', 12, -30, 24),
    camera: {
      mcDir: r.str('CAMERA_MC_DIR', '/opt/mc'),
      home: path.resolve(r.str('CAMERA_HOME', path.join(os.tmpdir(), 'muse-camera'))),
      authDir: r.str('CAMERA_AUTH_DIR', '') ? path.resolve(r.str('CAMERA_AUTH_DIR', '')) : '',
      auth: r.oneOf('CAMERA_AUTH', 'msa', ['msa', 'offline']),
      name: r.str('CAMERA_NAME', ''),
      gl: r.oneOf('CAMERA_GL', 'cpu', ['cpu', 'gpu']),
      // llvmpipe's threads: 8 at 960x540; the film's 1920x1080 wants 16 (and CAMERA_CPUS=24)
      glThreads: r.int('CAMERA_GL_THREADS', r.bool('CAMERA_FILM', false) ? 16 : 8, 1, 64),
      javaThreads: r.int('CAMERA_JAVA_THREADS', 4, 1, 64),
      heapMB: r.int('CAMERA_HEAP_MB', 2048, 512, 16_384),
      maxFps: r.int('CAMERA_MAX_FPS', 30, 10, 120),
      renderDistance: r.int('CAMERA_RENDER_DISTANCE', 5, 2, 32),
      graphics: r.oneOf('CAMERA_GRAPHICS', 'fast', ['fast', 'fancy']),
      display: r.int('CAMERA_DISPLAY', 99, 1, 900),
      scale: r.num('CAMERA_SCALE', 0.75, 0.5, 1),
      // the promo film (off by default): the client drawn at 1920x1080 for the clean recording (the live is scaled down
      // to its 1080 square as always); costs client frames on llvmpipe (README "Recordings")
      film: r.bool('CAMERA_FILM', false),
      javaNice: r.int('CAMERA_NICE', 5, 0, 19),
      idleMs: r.int('CAMERA_IDLE_MS', 600_000, 0, 86_400_000),
      // client mods from the image (deploy/camera/mods.json), comma-separated; 'off' runs the vanilla client
      mods: r.str('CAMERA_MODS', 'sodium'),
      // over the bot's shoulder (third, the default: its body, held tool and swing in view) or in its head (first)
      view: r.oneOf('CAMERA_VIEW', 'third', ['third', 'first']),
      chunkThreads: r.int('CAMERA_CHUNK_THREADS', 0, 0, 32),
      jvmArgs: r.str('CAMERA_JVM_ARGS', '').split(/\s+/).filter(Boolean),
      console: r.str('MC_CONSOLE', ''),
    },
  };
  hidden(stream, 'outputs', outputs);
  if (stream.camera.name && !/^[A-Za-z0-9_]{3,16}$/.test(stream.camera.name)) problems.push(`CAMERA_NAME must be 3-16 letters, digits or _ (got "${stream.camera.name}")`);
  if (stream.enabled && stream.source === 'client' && !stream.serviceUrl) {
    if (!stream.camera.console) problems.push('STREAM_SOURCE=client needs MC_CONSOLE: the camera is put in spectator mode through the server console');
    if (stream.camera.auth === 'msa' && !stream.camera.authDir) problems.push('STREAM_SOURCE=client needs CAMERA_AUTH_DIR, the folder with the camera account\'s login (scripts/camera-login.mjs)');
  }
  if (stream.serviceUrl && !(/^http:/.test(stream.serviceUrl) && isLocalUrl(stream.serviceUrl))) problems.push('STREAM_SERVICE_URL must be an http URL on this machine (loopback)');

  // Live video on a Facebook Page (src/fb-live.js): read by the process that runs the camera (the camera container, or
  // the agent itself without STREAM_SERVICE_URL). Each guest game goes live by itself; the Page token is a file (600),
  // never an environment variable, and never logged.
  const fbTarget = r.oneOf('FB_TARGET', 'page', ['page', 'me']);
  const fb = {
    live: r.bool('FB_LIVE', false),
    // 'page': the Page's live videos with the Page token (the long-term setup); 'me': the token owner's own profile with
    // a long-lived user token (about 60 days), public so the embed plays, each video deleted after its game
    target: fbTarget,
    privacy: r.oneOf('FB_PRIVACY', 'EVERYONE', ['EVERYONE', 'ALL_FRIENDS', 'SELF']),
    deleteAfter: r.bool('FB_DELETE_AFTER', fbTarget === 'me'),
    deleteDelayS: r.int('FB_DELETE_DELAY_S', 600, 0, 86_400),
    maxPerHour: r.int('FB_MAX_PER_HOUR', 6, 1, 60),
    maxPerDay: r.int('FB_MAX_PER_DAY', 20, 1, 500),
    pageId: r.str('FB_PAGE_ID', ''),
    tokenFile: r.str('FB_TOKEN_FILE', '') ? path.resolve(r.str('FB_TOKEN_FILE', '')) : '',
    graphVersion: r.str('FB_GRAPH_VERSION', 'v23.0'),
    graphUrl: r.str('FB_GRAPH_URL', 'https://graph.facebook.com').replace(/\/+$/, ''),
    stateFile: path.resolve(r.str('FB_STATE_FILE', path.join(log.dir, 'fb-live-state.json'))),
    title: r.str('FB_TITLE', 'Picasso Lab demo: an AI plays Minecraft'),
  };
  if (fb.pageId && !/^\d{5,25}$/.test(fb.pageId)) problems.push(`FB_PAGE_ID must be the Page's numeric id (got "${fb.pageId}")`);
  if (!/^v\d{1,2}\.\d$/.test(fb.graphVersion)) problems.push(`FB_GRAPH_VERSION must look like v23.0 (got "${fb.graphVersion}")`);
  try {
    const u = new URL(fb.graphUrl);
    if (!(u.protocol === 'https:' || (u.protocol === 'http:' && isLoopbackHost(u.hostname)))) problems.push('FB_GRAPH_URL must be https (http only on this machine, for tests)');
  } catch { problems.push(`FB_GRAPH_URL is not a URL (got "${fb.graphUrl}")`); }
  if (fb.title.length > 200 || /[\r\n]/.test(fb.title)) problems.push('FB_TITLE must be one line of at most 200 characters');
  if (fb.live) {
    if (!fb.pageId && fb.target === 'page') problems.push('FB_LIVE=on needs FB_PAGE_ID (scripts/fb-token.mjs prints it), or FB_TARGET=me');
    if (!fb.tokenFile) problems.push(`FB_LIVE=on needs FB_TOKEN_FILE, the file (600) with the ${fb.target === 'me' ? 'long-lived user' : 'Page'} token that scripts/fb-token.mjs writes`);
    if (!stream.serviceUrl && stream.source !== 'client') problems.push('FB_LIVE=on needs the real-client camera (STREAM_SOURCE=client) or the camera service (STREAM_SERVICE_URL)');
  }
  if (stream.enabled && !stream.serviceUrl && !outputs.length && !stream.outDir && !fb.live) {
    problems.push('STREAM_ENABLED needs STREAM_RTMP_URL (or STREAM_OUT_DIR to write files, FB_LIVE=on, or STREAM_SERVICE_URL for the stream container)');
  }

  if (problems.length) throw new ConfigError(problems);
  // the recordings of the games the camera films (the camera service; src/recorder.js): the clean game, the stream as it
  // went out, the HUD's timeline, per game under RECORD_DIR; old ones out by age and by the total size
  const record = {
    on: r.bool('RECORD', false),
    root: r.str('RECORD_DIR', '') ? path.resolve(r.str('RECORD_DIR', '')) : path.join(ROOT, 'recordings'),
    maxBytes: r.int('RECORD_MAX_GB', 150, 1, 10_000) * 2 ** 30,
    keepDays: r.int('RECORD_KEEP_DAYS', 30, 1, 3_650),
    crf: r.int('RECORD_CRF', 18, 10, 35),
    preset: r.oneOf('RECORD_PRESET', 'veryfast', ['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium']),
    nice: r.int('RECORD_NICE', 10, 0, 19),
  };
  return deepFreeze({ root: ROOT, model, mc, web, body, mineai, caps, memory, log, stream, fb, record });
}

/** The process-wide config, read from process.env at first import. */
export const config = loadConfig();
