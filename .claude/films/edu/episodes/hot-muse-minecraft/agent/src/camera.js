// src/camera.js - the "real client" frame source for live video: a vanilla Minecraft Java client (deploy/
// Dockerfile.camera) on its own X server (Xvfb), joined to the Paper server as a spectator that rides along in a guest
// bot's head (/spectate through the server console), so the video is the game itself: block-break cracks, particles,
// lighting, sky, clouds. ffmpeg grabs the X display (x11grab) and encodes it like the viewer streams (src/stream.js:
// H.264 CBR, keyframe every 2 s, silent AAC, FLV to RTMP(S) or MP4 to a file, the same caption).
//
// A camera rig (createCameraRig) is long-lived: Xvfb plus the client, started once and kept in the world, so a game's
// stream begins within seconds instead of a 20-40 s client start. Between games the camera is parked high above the
// last spot looking at the sky, and after CAMERA_IDLE_MS without a game the client quits (a parked client still draws
// the sky: about 2 cores on llvmpipe) until the next game starts it again. The rig restarts a client that exits,
// disconnects or never joins, and Xvfb if it dies. createCameraStream is one game's stream on a rig, with the same interface as createStream, so the
// stream manager, the service and the agent drive it unchanged (STREAM_SOURCE=client). OpenGL runs on Mesa llvmpipe
// (CAMERA_GL=cpu, threads capped) or on a GPU through VirtualGL (CAMERA_GL=gpu; needs a GL driver with framebuffer
// objects, which picasso's H100s do not have).
//
// The account: tokens come from the camera's auth folder (scripts/camera-login.mjs, Microsoft device code), are
// refreshed silently, and reach the client through its environment, never its command line. CAMERA_AUTH=offline runs
// an unauthenticated client, for tests against our own offline-mode server only.

import { spawn, execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  STREAM_DEFAULTS, ffmpegArgs, findFfmpeg, findFont, maskOutput, scrubOutputs, cleanCaption, cleanPose, processTree,
  spawnNiced, spawnEncoder, createStreamManager, managerConfig, encoderEnv, childEnv,
} from './stream.js';
import { createGraph, createLiveChannel } from './fb-live.js';

const require = createRequire(import.meta.url);

export const CAMERA_DEFAULTS = Object.freeze({
  mcDir: '/opt/mc', // deploy/camera/install-client.mjs: the client, its libraries and launch.json
  home: path.join(os.tmpdir(), 'muse-camera'), // per rig: the game folder (options.txt, the client's own logs)
  authDir: '', // the account's tokens (scripts/camera-login.mjs)
  auth: 'msa', // 'msa' (the logged-in account) or 'offline' (tests on our own offline-mode server only)
  name: '', // offline: the camera's player name (default MuseCam); msa: the account's own name
  display: 99,
  width: 1280,
  height: 720,
  gl: 'cpu', // 'cpu': Mesa llvmpipe; 'gpu': VirtualGL on the first EGL device
  glThreads: 8, // llvmpipe's rasterizer threads (LP_NUM_THREADS): 8 beat 6 and 16
  javaThreads: 4, // what the JVM believes it has (its worker pools: chunk meshing, IO)
  heapMB: 2048,
  maxFps: 30,
  renderDistance: 5, // with Sodium, fast leaves and a 960x540 picture: a steady 24-25 fps on llvmpipe (README)
  graphics: 'fast', // 'fast' (opaque leaves: +45 % frames on llvmpipe) or 'fancy' (see-through leaves)
  gamma: 1.0, // brightness "Bright": caves stay readable on a small player
  server: '127.0.0.1:25565',
  console: '', // the Paper console FIFO (MC_CONSOLE)
  javaNice: 5, // the client below ffmpeg: a starved encoder stalls the broadcast, a slow client only drops frames
  joinTimeoutMs: 150_000, // a client that has not joined by then is restarted
  followMs: 5_000, // how often the camera checks it still rides the bot
  idleMs: 600_000, // a camera with no game for this long quits its client (Xvfb stays); the next game starts it again
  maxRestarts: 6, // client restarts within restartWindowMs before the rig rests for coolOffMs
  restartWindowMs: 600_000,
  coolOffMs: 120_000,
});

const NAME_RE = /^[A-Za-z0-9_]{3,16}$/;
/** A Minecraft player name (the only text that goes into a console command from outside). */
export const validName = (n) => NAME_RE.test(String(n ?? ''));

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms).unref?.(); });
const clip = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const alive = (child) => child && child.exitCode === null && child.signalCode === null;
const defined = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== undefined));

/** The UUID an offline-mode server gives a name (version 3 of "OfflinePlayer:<name>"), dashed. */
export function offlineUuid(name) {
  const h = crypto.createHash('md5').update(`OfflinePlayer:${name}`).digest();
  h[6] = (h[6] & 0x0f) | 0x30;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/**
 * The client's options.txt: 1280x720-friendly video settings, the HUD and chat off, no sound, no first-run screens,
 * no pause when the window has no focus, never throttled for inactivity.
 */
export function clientOptions(o = {}) {
  const c = { ...CAMERA_DEFAULTS, ...defined(o) };
  const v = {
    version: 4189, // 1.21.4's data version: read as current, no upgrade pass
    onboardAccessibility: false, skipMultiplayerWarning: true, joinedFirstServer: true, tutorialStep: 'none',
    hideBundleTutorial: true, realmsNotifications: false, allowServerListing: false, narrator: 0, lang: 'en_us',
    renderDistance: c.renderDistance, simulationDistance: 5, maxFps: c.maxFps, enableVsync: false,
    inactivityFpsLimit: '"minimized"', pauseOnLostFocus: false, fullscreen: false,
    graphicsMode: c.graphics === 'fast' ? 0 : 1, ao: true, renderClouds: c.graphics === 'fast' ? '"fast"' : '"true"',
    particles: 0, entityShadows: true, biomeBlendRadius: 2, mipmapLevels: 4, gamma: c.gamma, fov: '0.0', bobView: true,
    chatVisibility: 2, showAutosaveIndicator: false, darkMojangStudiosBackground: true, attackIndicator: 0,
    showSubtitles: false, soundCategory_master: '0.0',
  };
  return `${Object.entries(v).map(([k, x]) => `${k}:${x}`).join('\n')}\n`;
}

/** The installed client (deploy/camera/install-client.mjs writes launch.json). */
export function readLaunch(mcDir) {
  const l = JSON.parse(fs.readFileSync(path.join(mcDir, 'launch.json'), 'utf8'));
  if (!l.mainClass || !Array.isArray(l.classpath) || !l.assetIndex) throw new Error(`${mcDir}/launch.json is incomplete`);
  return l;
}

/**
 * The client's command (no token in it: the token goes into MC_ACCESS_TOKEN, which deploy/camera/CameraMain.java
 * hands to the client), its environment and folder. GPU mode wraps it in vglrun.
 * @param {object} c   CAMERA_DEFAULTS and overrides; c.java (default: java on PATH)
 * @param {{version: string, classpath: string[], assetsDir: string, assetIndex: string, nativesDir: string}} launch
 * @param {{name: string, uuid: string}} profile
 */
export function clientLaunch(c, launch, profile) {
  const gameDir = path.join(c.home, 'game');
  const tmp = path.join(c.home, 'tmp');
  // client mods (CAMERA_MODS): Fabric's launcher and libraries first, the chosen mods' jars added by path
  const mods = modJars(c, launch);
  const fabric = mods.length ? launch.fabric : null;
  const game0 = fabric ? launch.classpath.filter((p) => !(fabric.replaces ?? []).includes(p)) : launch.classpath;
  const classpath = [path.join(c.mcDir, 'camera-main'), ...(fabric?.classpath ?? []), ...game0].join(path.delimiter);
  // CAMERA_JVM_ARGS may name its own collector (two would stop the JVM); G1 otherwise
  const gc = (c.jvmArgs ?? []).some((a) => /^-XX:\+Use\w*GC$/.test(a)) ? [] : ['-XX:+UseG1GC'];
  const jvm = [
    '-Xms512m', `-Xmx${c.heapMB}m`, ...gc, `-XX:ActiveProcessorCount=${c.javaThreads}`, ...(c.jvmArgs ?? []),
    `-Djava.library.path=${launch.nativesDir}`, `-Dorg.lwjgl.librarypath=${launch.nativesDir}`,
    `-Djna.tmpdir=${tmp}`, `-Dio.netty.native.workdir=${tmp}`, `-Dorg.lwjgl.system.SharedLibraryExtractPath=${tmp}`,
    '-Dminecraft.launcher.brand=muse-camera', '-Dminecraft.launcher.version=1',
    ...(fabric ? [...fabric.jvmArgs, `-Dmuse.camera.main=${fabric.mainClass}`, `-Dfabric.addMods=${mods.join(path.delimiter)}`] : []),
    '-cp', classpath, 'muse.camera.CameraMain',
  ];
  const game = [
    '--username', profile.name, '--uuid', profile.uuid, '--userType', 'msa', '--version', launch.version,
    '--versionType', 'release', '--gameDir', gameDir, '--assetsDir', launch.assetsDir, '--assetIndex', String(launch.assetIndex),
    '--width', String(c.width), '--height', String(c.height), '--quickPlayMultiplayer', c.server,
  ];
  const env = { DISPLAY: `:${c.display}`, HOME: c.home, LIBGL_SHOW_FPS: '1' };
  const hudDir = path.join(c.home, 'hud');
  const java = c.java ?? 'java';
  if (c.gl === 'gpu') {
    Object.assign(env, { VGL_DISPLAY: c.vglDevice ?? 'egl', VGL_READBACK: 'pbo', __EGL_VENDOR_LIBRARY_FILENAMES: '/usr/share/glvnd/egl_vendor.d/10_nvidia.json' });
    return { file: c.vglrun ?? 'vglrun', args: [java, ...jvm, ...game], env, cwd: gameDir, gameDir, tmp, hudDir: null };
  }
  // Mesa's HUD, not drawn, writes the frames a second to <home>/hud/fps once a second (the rig's clientFps)
  Object.assign(env, {
    LIBGL_ALWAYS_SOFTWARE: '1', GALLIUM_DRIVER: 'llvmpipe', LP_NUM_THREADS: String(c.glThreads), __GLX_VENDOR_LIBRARY_NAME: 'mesa',
    GALLIUM_HUD: 'fps', GALLIUM_HUD_VISIBLE: 'false', GALLIUM_HUD_PERIOD: '1', GALLIUM_HUD_DUMP_DIR: hudDir,
  });
  return { file: java, args: [...jvm, ...game], env, cwd: gameDir, gameDir, tmp, hudDir };
}

/**
 * The jars of the client mods CAMERA_MODS names (comma-separated; 'off' or '' for the vanilla client), from the image's
 * launch.json; a name the image does not have is an error.
 */
export function modJars(c, launch) {
  const names = String(c.mods ?? '').split(',').map((x) => x.trim()).filter((x) => x && x !== 'off');
  if (!names.length) return [];
  if (!launch.fabric) throw new Error('CAMERA_MODS needs an image with Fabric (deploy/camera/mods.json)');
  return names.map((n) => {
    const m = launch.fabric.mods?.[n];
    if (!m) throw new Error(`no client mod "${n}" in the image (have: ${Object.keys(launch.fabric.mods ?? {}).join(', ')})`);
    return m.jar;
  });
}

/**
 * Sodium's options (config/sodium-options.json in the game folder), written before every start: the chunk builder
 * threads and the culling switches, the rest Sodium's defaults.
 */
export function sodiumOptions(c = {}) {
  return {
    quality: { weather_quality: 'DEFAULT', leaves_quality: c.graphics === 'fast' ? 'FAST' : 'DEFAULT', enable_vignette: true },
    advanced: { enable_memory_tracing: false, use_advanced_staging_buffers: true, cpu_render_ahead_limit: 3 },
    performance: {
      chunk_builder_threads: c.chunkThreads ?? 0, always_defer_chunk_updates_v2: true, animate_only_visible_textures: true,
      use_entity_culling: true, use_fog_occlusion: true, use_block_face_culling: true, use_no_error_g_l_context: true,
    },
    notifications: { has_cleared_donation_button: true, has_seen_donation_prompt: true },
  };
}

/** The x11grab input of a rig's display for ffmpegArgs. */
export const x11Input = (c) => ({ display: `:${c.display}.0+0,0`, width: c.width, height: c.height });

/**
 * One line to the server console (the FIFO Paper reads, MC_CONSOLE). Opened non-blocking: with no server reading, it
 * fails (ENXIO) instead of hanging. Lines under 4 KB are written whole, never mixed with the agent's own commands.
 */
export function consoleCommand(file, line) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('no server console (MC_CONSOLE)')); return; }
    if (!/^[a-z][A-Za-z0-9_ ~.@=,:[\]-]{0,200}$/.test(line)) { reject(new Error('refused console line')); return; }
    fs.open(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NONBLOCK, (err, fd) => {
      if (err) { reject(err); return; }
      fs.write(fd, `${line}\n`, (e) => { fs.close(fd, () => {}); if (e) reject(e); else resolve(); });
    });
  });
}

/**
 * The console lines that put a camera on a bot, in two steps: first next to it (spectator mode, any old ride ended),
 * then, once the client has the bot in its world, into its head. A client told to spectate an entity it has not loaded
 * yet ignores it, while the server still moves it along: it would film from inside the bot's head with its own view.
 */
export const followCommands = (camera, player) => [
  [`gamemode spectator ${camera}`, `execute as ${camera} run spectate`, `tp ${camera} ${player}`],
  [`spectate ${player} ${camera}`],
];
/**
 * The same, only when the camera is not at the bot any more (a respawn, a long teleport): a tag marks a lost camera,
 * so the lines say nothing on the console while it rides along.
 */
export const keepFollowingCommands = (camera, player) => {
  const lost = `@a[name=${camera},tag=muse_cam_lost]`;
  return [
    [`execute as ${camera} at @s unless entity @a[name=${player},distance=..3] run tag @s add muse_cam_lost`, `execute as ${lost} run tp @s ${player}`],
    [`execute as ${lost} run spectate ${player} @s`, `execute as ${lost} run tag @s remove muse_cam_lost`],
  ];
};
/** Between games: stop riding and float high above the spot looking at the sky (cheap to draw). */
export const parkCommands = (camera) => [`execute as ${camera} run spectate`, `execute as ${camera} at @s run tp @s ~ 250 ~ ~ -90`];

// ----- the account

/** prismarine-auth's device-code flow as mineflayer uses it for Java Edition (live.com, no Azure app of ours). */
export const AUTH_OPTIONS = Object.freeze({ flow: 'live', authTitle: '00000000441cc96b', deviceType: 'Nintendo' });
export const AUTH_CACHE_NAME = 'camera';

/** The auth folder 700 and every file in it 600 (prismarine-auth writes its caches with the default mode). */
export function tightenAuthDir(dir) {
  try {
    fs.chmodSync(dir, 0o700);
    for (const f of fs.readdirSync(dir)) {
      try { if (fs.statSync(path.join(dir, f)).isFile()) fs.chmodSync(path.join(dir, f), 0o600); } catch { /* gone */ }
    }
  } catch { /* no folder */ }
}

/**
 * The camera's player: {name, uuid, token}. msa: the Minecraft token from the auth folder's cached Microsoft login,
 * refreshed silently when it has expired; without a login it fails (a device code is only ever asked for by
 * scripts/camera-login.mjs, where someone waits for it). offline: a name with no token.
 */
export async function cameraProfile(c, { Authflow, fetchFn } = {}) {
  if (c.auth === 'offline') {
    const name = c.name || 'MuseCam';
    if (!validName(name)) throw new Error('CAMERA_NAME must be 3-16 letters, digits or _');
    return { name, uuid: offlineUuid(name), token: '', auth: 'offline' };
  }
  if (!c.authDir) throw new Error('no auth folder for the camera account (CAMERA_AUTH_DIR)');
  if (fs.existsSync(path.join(c.authDir, LAUNCHER_TOKEN_FILE))) return launcherProfile(c.authDir, { fetchFn });
  const Flow = Authflow ?? require('prismarine-auth').Authflow;
  const flow = new Flow(AUTH_CACHE_NAME, c.authDir, { ...AUTH_OPTIONS }, () => { throw new Error('the camera account is not logged in'); });
  const rt = await flow.msa.getRefreshToken?.();
  if (!rt?.token) throw new Error(`the camera account is not logged in: run scripts/camera-login.mjs (auth folder ${c.authDir})`);
  const r = await flow.getMinecraftJavaToken({ fetchProfile: true });
  tightenAuthDir(c.authDir);
  if (!r?.token || !r.profile?.name || r.profile.error) throw new Error('the camera account has no Minecraft Java profile');
  return { name: r.profile.name, uuid: r.profile.id, token: r.token, auth: 'msa' };
}

// ----- the account, second way: the Minecraft launcher's own sign-in (authorization code)
// Microsoft's device-code page refused the device flow for this account on 2026-10-07 ("The application is a first
// party application ... users are not permitted to consent"). The launcher's documented sign-in works without it: the
// owner signs in on login.live.com in a browser, lands on a blank page whose address carries a one-time code, and
// pastes that address once; the code becomes a refresh token kept here (file 600), and every later start refreshes
// silently. Chain: live.com token -> Xbox user token -> XSTS for Minecraft -> Minecraft token + profile.

export const LAUNCHER = Object.freeze({
  clientId: '00000000402b5328',
  redirect: 'https://login.live.com/oauth20_desktop.srf',
  scope: 'service::user.auth.xboxlive.com::MBI_SSL',
});
export const LAUNCHER_TOKEN_FILE = 'launcher-login.json';

/** The address the owner opens to sign in (select_account: never silently reuses another signed-in account). */
export function launcherSignInUrl() {
  const q = new URLSearchParams({ client_id: LAUNCHER.clientId, response_type: 'code', scope: LAUNCHER.scope, redirect_uri: LAUNCHER.redirect, prompt: 'select_account' });
  return `https://login.live.com/oauth20_authorize.srf?${q}`;
}

/** The one-time code from what the owner pasted: the blank page's whole address, or the bare code; null if neither. */
export function codeFromPaste(text) {
  const t = String(text ?? '').trim();
  try {
    const u = new URL(t);
    const err = u.searchParams.get('error');
    if (err) throw new Error(`Microsoft said: ${err}${u.searchParams.get('error_description') ? ` (${u.searchParams.get('error_description').slice(0, 160)})` : ''}`);
    return u.searchParams.get('code') || null;
  } catch (e) {
    if (/^Microsoft said/.test(e.message)) throw e;
  }
  return /^M\.[A-Za-z0-9_.!*$-]{10,}$/.test(t) ? t : null;
}

async function launcherCall(fetchFn, url, init, what) {
  const res = await fetchFn(url, { ...init, headers: { accept: 'application/json', ...(init.headers ?? {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    const why = body?.error_description || body?.error || body?.XErr || body?.errorMessage || text.slice(0, 160);
    throw new Error(`${what} failed (HTTP ${res.status}): ${String(why).replace(/[A-Za-z0-9_\-.]{40,}/g, '***').slice(0, 200)}`);
  }
  return body;
}

const formPost = (fetchFn, url, form, what) => launcherCall(fetchFn, url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() }, what);
const jsonPost = (fetchFn, url, json, what) => launcherCall(fetchFn, url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(json) }, what);

/** A live.com access token -> {token, expiresAt, name, uuid, ownsJava}. */
export async function launcherChain(msaAccessToken, { fetchFn = globalThis.fetch } = {}) {
  const user = await jsonPost(fetchFn, 'https://user.auth.xboxlive.com/user/authenticate', {
    Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `t=${msaAccessToken}` },
    RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT',
  }, 'Xbox sign-in');
  const xsts = await jsonPost(fetchFn, 'https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: { SandboxId: 'RETAIL', UserTokens: [user.Token] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT',
  }, 'Xbox authorization (XSTS; 2148916233 means the account has no Xbox profile yet)');
  const uhs = xsts?.DisplayClaims?.xui?.[0]?.uhs ?? user?.DisplayClaims?.xui?.[0]?.uhs;
  const mc = await jsonPost(fetchFn, 'https://api.minecraftservices.com/authentication/login_with_xbox', { identityToken: `XBL3.0 x=${uhs};${xsts.Token}` }, 'Minecraft sign-in');
  const auth = { headers: { authorization: `Bearer ${mc.access_token}` } };
  const ents = await launcherCall(fetchFn, 'https://api.minecraftservices.com/entitlements/mcstore', auth, 'Minecraft entitlements').catch(() => null);
  const ownsJava = Array.isArray(ents?.items) ? ents.items.some((i) => /game_minecraft|product_minecraft/.test(i.name)) : null;
  const profile = await launcherCall(fetchFn, 'https://api.minecraftservices.com/minecraft/profile', auth, 'Minecraft profile (does the account own Java Edition?)');
  if (!profile?.name || !profile?.id) throw new Error('signed in, but the account has no Minecraft Java profile (does it own Java Edition?)');
  return { token: mc.access_token, expiresAt: Date.now() + (Number(mc.expires_in) || 86_400) * 1000, name: profile.name, uuid: profile.id, ownsJava };
}

function saveLauncher(dir, data) {
  const file = path.join(dir, LAUNCHER_TOKEN_FILE);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(`${file}.tmp`, file);
  tightenAuthDir(dir);
}

/** Turns the pasted blank-page address (or code) into a stored login; returns {name, uuid, ownsJava}. */
export async function redeemLauncherCode(dir, pasted, { fetchFn = globalThis.fetch } = {}) {
  const code = codeFromPaste(pasted);
  if (!code) throw new Error('no sign-in code found: paste the whole address of the blank page you landed on after signing in (it contains "code=M.")');
  const t = await formPost(fetchFn, 'https://login.live.com/oauth20_token.srf', {
    client_id: LAUNCHER.clientId, code, grant_type: 'authorization_code', redirect_uri: LAUNCHER.redirect, scope: LAUNCHER.scope,
  }, 'redeeming the sign-in code (codes work once and only for a few minutes)');
  const mc = await launcherChain(t.access_token, { fetchFn });
  saveLauncher(dir, { refresh_token: t.refresh_token, mc });
  return { name: mc.name, uuid: mc.uuid, ownsJava: mc.ownsJava };
}

/** The camera's player from the stored launcher login, refreshing the Minecraft token (24 h) when it is near expiry. */
export async function launcherProfile(dir, { fetchFn = globalThis.fetch } = {}) {
  const file = path.join(dir, LAUNCHER_TOKEN_FILE);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  let mc = saved.mc;
  if (!mc?.token || !(mc.expiresAt - Date.now() > 10 * 60_000)) {
    if (!saved.refresh_token) throw new Error('the camera account is not logged in: run scripts/camera-login.mjs --url');
    const t = await formPost(fetchFn, 'https://login.live.com/oauth20_token.srf', {
      client_id: LAUNCHER.clientId, grant_type: 'refresh_token', refresh_token: saved.refresh_token, redirect_uri: LAUNCHER.redirect, scope: LAUNCHER.scope,
    }, 'refreshing the camera login (if this keeps failing, sign in again with scripts/camera-login.mjs --url)');
    mc = await launcherChain(t.access_token, { fetchFn });
    saveLauncher(dir, { refresh_token: t.refresh_token || saved.refresh_token, mc });
  }
  return { name: mc.name, uuid: mc.uuid, token: mc.token, auth: 'msa' };
}

// ----- the rig: Xvfb + the client, kept in the world

/**
 * @param {object} o   CAMERA_DEFAULTS overrides, plus:
 * @param {(kind: string, data: object) => void} [o.event]   log rows (camera_*)
 * @param {(c: object) => Promise<{name, uuid, token}>} [o.profile]   (tests) the account
 * @param {object} [o.launch]   (tests) launch.json
 */
export function createCameraRig(o = {}) {
  const c = { ...CAMERA_DEFAULTS, ...defined(o) };
  const emitter = new EventEmitter();
  const event = (kind, data = {}) => {
    try { c.event?.(kind, { camera: c.index ?? 0, ...data }); } catch { /* best effort */ }
    emitter.emit(kind, data);
  };
  let state = 'off'; // off -> starting -> joining -> ready; resting (too many restarts); asleep; stopped
  let xvfb = null;
  let client = null; // {child, startedAt, joined, hidden}
  let profile = null;
  let fps = null; // the client's frames a second (Mesa's LIBGL_SHOW_FPS, or its HUD file)
  let hudFile = null;
  let starting = null;
  let stopped = false;
  let restartTimer = null;
  const restarts = [];
  const tail = []; // the client's last lines (diagnostics; never the token, which no line carries)

  function note(line) {
    const t = profile?.token ? String(line).split(profile.token).join('***') : line; // never in a line; kept out anyway
    tail.push(clip(t, 300));
    if (tail.length > 40) tail.shift();
  }

  async function startX() {
    if (alive(xvfb)) return;
    const lock = `/tmp/.X${c.display}-lock`;
    for (const f of [lock, `/tmp/.X11-unix/X${c.display}`]) { try { fs.rmSync(f, { force: true }); } catch { /* not ours */ } }
    const child = spawn(c.xvfb ?? 'Xvfb', [`:${c.display}`, '-screen', '0', `${c.width}x${c.height}x24`, '-nolisten', 'tcp', '-br', '-noreset', '-dpi', '96'], { stdio: ['ignore', 'ignore', 'pipe'] });
    xvfb = child;
    let err = '';
    child.stderr.on('data', (d) => { err = (err + d).slice(-2_000); });
    child.on('error', (e) => { err += String(e?.message ?? e); });
    child.on('exit', (code, signal) => {
      if (xvfb !== child) return;
      xvfb = null;
      if (stopped) return;
      event('camera_xvfb_exit', { code, signal, detail: clip(err.split('\n').filter(Boolean).slice(-2).join(' | ')) });
      killClient();
      later(1_000);
    });
    const until = Date.now() + 10_000;
    while (Date.now() < until && alive(child)) {
      if (await xReady()) return;
      await sleep(200);
    }
    throw new Error(`Xvfb :${c.display} did not start: ${clip(err)}`);
  }

  function xReady() {
    return new Promise((resolve) => {
      execFile(c.xdpyinfo ?? 'xdpyinfo', ['-display', `:${c.display}`], { timeout: 3_000 }, (e) => resolve(!e));
    });
  }

  async function launchClient() {
    profile = await (c.profile ?? cameraProfile)(c);
    // a server that lets in only listed players (the Paper container, MC_WHITELIST) must list the camera first
    if (c.console) await command(`whitelist add ${profile.name}`);
    const launch = c.launch ?? readLaunch(c.mcDir);
    const cmd = clientLaunch(c, launch, profile);
    fs.mkdirSync(cmd.gameDir, { recursive: true });
    fs.mkdirSync(cmd.tmp, { recursive: true });
    hudFile = null;
    if (cmd.hudDir) {
      fs.rmSync(cmd.hudDir, { recursive: true, force: true });
      fs.mkdirSync(cmd.hudDir, { recursive: true });
      hudFile = path.join(cmd.hudDir, 'fps');
    }
    fs.writeFileSync(path.join(cmd.gameDir, 'options.txt'), clientOptions(c));
    if (modJars(c, launch).length) {
      fs.mkdirSync(path.join(cmd.gameDir, 'config'), { recursive: true });
      fs.writeFileSync(path.join(cmd.gameDir, 'config', 'sodium-options.json'), `${JSON.stringify(sodiumOptions(c), null, 2)}\n`);
    }
    const env = childEnv({ ...cmd.env, MC_ACCESS_TOKEN: profile.token || '' });
    const child = spawnNiced(cmd.file, cmd.args, c.javaNice, { cwd: cmd.cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const me = { child, startedAt: Date.now(), joined: false, hidden: false, connected: false };
    client = me;
    fps = null;
    state = 'joining';
    event('camera_client_start', { pid: child.pid, name: profile.name, auth: profile.auth, gl: c.gl, server: c.server });
    let buf = '';
    const onData = (d) => {
      buf += d;
      let at;
      while ((at = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, at);
        buf = buf.slice(at + 1);
        onLine(me, line);
      }
      if (buf.length > 16_384) buf = buf.slice(-4_096);
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (e) => note(`spawn error: ${e?.message ?? e}`));
    child.on('exit', (code, signal) => {
      if (client !== me) return;
      client = null;
      fps = null;
      if (stopped) return;
      event('camera_client_exit', { code, signal, joined: me.joined, last: tail.slice(-3) });
      restartClient('the client exited');
    });
    // a client that never joins (server down, stuck screen) is restarted
    setTimeout(() => { if (client === me && !me.joined) restartClient(`not in the world after ${Math.round(c.joinTimeoutMs / 1000)} s`); }, c.joinTimeoutMs).unref?.();
  }

  /** The last value Mesa's HUD wrote (a line a second, about 0.5 MB a day; a new client starts a new file). */
  function hudFps() {
    if (!hudFile || !client) return null;
    try {
      const size = fs.statSync(hudFile).size;
      if (!size) return null;
      const fd = fs.openSync(hudFile, 'r');
      const buf = Buffer.alloc(Math.min(64, size));
      fs.readSync(fd, buf, 0, buf.length, size - buf.length);
      fs.closeSync(fd);
      const v = Number(buf.toString('utf8').replace(/\0/g, '').trim().split('\n').pop());
      return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
    } catch { return null; }
  }

  function onLine(me, line) {
    const fpsMatch = line.match(/libGL: FPS = ([\d.]+)/);
    if (fpsMatch) { fps = Number(fpsMatch[1]); return; }
    if (/^ALSA lib|^\s+at /.test(line)) return;
    note(line);
    if (client !== me) return;
    if (/Connecting to \S+, \d+/.test(line)) { me.connected = true; event('camera_connecting', { afterMs: Date.now() - me.startedAt }); }
    if (!me.joined && /Loaded \d+ advancements/.test(line)) onJoined(me);
    const lost = line.match(/Client disconnected with reason: (.*)$/) ?? line.match(/(Couldn't connect to server.*)$/);
    if (lost) {
      event('camera_disconnected', { reason: clip(lost[1], 200) });
      setTimeout(() => { if (client === me) restartClient('disconnected'); }, 3_000).unref?.();
    }
  }

  async function onJoined(me) {
    me.joined = true;
    state = 'ready';
    event('camera_joined', { afterMs: Date.now() - me.startedAt, name: profile.name });
    // in order: a camera parked in the sky before it is a spectator would fall as a survival player
    for (const line of [`gamemode spectator ${profile.name}`, ...parkCommands(profile.name).slice(1)]) await command(line);
    emitter.emit('joined');
    // the HUD off (F1) once the loading screen has closed; spectators show almost none anyway
    await sleep(c.hideGuiDelayMs ?? 3_000);
    if (client === me && !me.hidden) {
      me.hidden = true;
      execFile(c.xdotool ?? 'xdotool', ['key', 'F1'], { env: { ...process.env, DISPLAY: `:${c.display}` }, timeout: 5_000 }, (e) => {
        if (e) event('camera_error', { message: `F1: ${clip(e.message, 150)}` });
      });
    }
  }

  /** Groups of console lines with a pause between groups (the client loads what the first group brought near). */
  async function steps(groups) {
    let ok = true;
    for (const [i, group] of groups.entries()) {
      if (i) await sleep(c.attachDelayMs ?? 2_000);
      for (const line of group) ok = (await command(line)) && ok;
    }
    return ok;
  }

  function command(line) {
    return consoleCommand(c.console, line).catch((err) => { event('camera_error', { message: `console: ${clip(err?.message ?? err, 150)}` }); return false; }).then((r) => r !== false);
  }

  function killClient() {
    const me = client;
    client = null;
    fps = null;
    if (!me || !alive(me.child)) return Promise.resolve();
    me.child.kill('SIGTERM');
    return Promise.race([new Promise((r) => me.child.once('exit', r)), sleep(5_000)]).then(() => { if (alive(me.child)) me.child.kill('SIGKILL'); });
  }

  function later(ms) {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => { restartTimer = null; if (!stopped) run().catch(() => {}); }, ms);
    restartTimer.unref?.();
  }

  async function restartClient(why) {
    if (stopped) return;
    await killClient();
    const now = Date.now();
    while (restarts.length && restarts[0] < now - c.restartWindowMs) restarts.shift();
    restarts.push(now);
    if (restarts.length > c.maxRestarts) {
      state = 'resting';
      event('camera_failed', { reason: clip(why, 200), restarts: restarts.length, retryInS: Math.round(c.coolOffMs / 1000) });
      restarts.length = 0;
      later(c.coolOffMs);
      return;
    }
    state = 'starting';
    event('camera_restart', { reason: clip(why, 200) });
    later(Math.min(30_000, 1_000 * 2 ** (restarts.length - 1)));
  }

  /** X up, then a client (once at a time). */
  function run() {
    starting ??= (async () => {
      try {
        if (stopped) return;
        if (!client) state = 'starting';
        await startX();
        if (!client && !stopped) await launchClient();
      } catch (err) {
        event('camera_error', { message: clip(err?.message ?? err) });
        if (!stopped) restartClient(clip(err?.message ?? err, 200));
      } finally {
        starting = null;
      }
    })();
    return starting;
  }

  const rig = {
    get state() { return state; },
    get ready() { return state === 'ready'; },
    get name() { return profile?.name ?? null; },
    get fps() { return fps ?? hudFps(); },
    options: c,
    /** Start Xvfb and the client (idempotent; failures are retried in the background). Wakes a sleeping rig. */
    start() { stopped = false; return run(); },
    /** No game for a while: the client quits, Xvfb stays; start() brings the client back (about 15 s to join). */
    async sleep() {
      if (stopped) return;
      stopped = true; // no restarts while asleep
      clearTimeout(restartTimer);
      await killClient();
      state = 'asleep';
      event('camera_sleep', {});
    },
    /** Resolves true once the client is in the world, false after ms. */
    waitReady(ms) {
      if (state === 'ready') return Promise.resolve(true);
      return new Promise((resolve) => {
        const t = setTimeout(() => { emitter.off('joined', on); resolve(state === 'ready'); }, ms);
        const on = () => { clearTimeout(t); resolve(true); };
        emitter.once('joined', on);
      });
    },
    /** Ride along in a player's head (console: spectator mode, next to it, then /spectate). */
    follow(player) {
      if (!validName(player) || !profile) return Promise.resolve(false);
      return steps(followCommands(profile.name, player));
    },
    /** Re-attach if the camera is not at the player any more (a respawn, a long teleport). Quiet when it is. */
    keepFollowing(player) {
      if (!validName(player) || !profile || state !== 'ready') return Promise.resolve(false);
      return steps(keepFollowingCommands(profile.name, player));
    },
    /** Between games: stop riding, float up and look at the sky. */
    async park() {
      if (!profile || state !== 'ready') return;
      for (const line of parkCommands(profile.name)) await command(line);
    },
    on: (e, fn) => { emitter.on(e, fn); return () => emitter.off(e, fn); },
    /** The client's numbers, and (resources) CPU seconds and RAM of the client and Xvfb. */
    async stats({ resources = false } = {}) {
      const out = { state, name: profile?.name ?? null, auth: profile?.auth ?? null, gl: c.gl, clientFps: fps ?? hudFps(), clientPid: client?.child.pid ?? null, restarts: restarts.length };
      if (resources) {
        out.clientTree = await processTree(client?.child.pid);
        out.xvfbTree = await processTree(xvfb?.pid);
      }
      return out;
    },
    /** The client's last log lines (diagnostics). */
    tail: () => tail.slice(),
    async stop() {
      stopped = true;
      state = 'stopped';
      clearTimeout(restartTimer);
      await killClient();
      const x = xvfb;
      xvfb = null;
      if (alive(x)) { x.kill('SIGTERM'); await Promise.race([new Promise((r) => x.once('exit', r)), sleep(3_000)]); }
    },
  };
  return rig;
}

// ----- one game's stream on a rig

/**
 * One stream: the rig's display through ffmpeg, while the camera rides along with `player`. The same interface as
 * createStream (state, start, stop, pose, caption, stats, finished, on).
 * @param {object} o   STREAM_DEFAULTS overrides, plus:
 * @param {ReturnType<typeof createCameraRig>} o.rig
 * @param {string} o.player   the bot's player name
 * @param {string} o.output   rtmp(s)://... or an .mp4 path
 * @param {number} [o.readyWaitMs]   how long a start waits for the client to be in the world (default 180 s)
 */
export function createCameraStream(o) {
  const opt = { ...STREAM_DEFAULTS, readyWaitMs: 180_000, settleMs: 1_500, ...defined(o) };
  const rig = opt.rig;
  const ffmpeg = opt.ffmpeg ?? findFfmpeg();
  const font = opt.font === undefined ? findFont() : opt.font;
  const emitter = new EventEmitter();
  const event = (kind, data = {}) => {
    try { opt.event?.(kind, data); } catch { /* logging is best effort */ }
    emitter.emit(kind, data);
  };
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-camera-stream-'));
  const captionFile = path.join(work, 'caption.txt');
  fs.writeFileSync(captionFile, '');
  let state = 'idle';
  let enc = null; // {child, startedAt, err, progress}
  let follower = null;
  let watchdog = null;
  let lastPose = null;
  let offJoined = null;
  const restarts = { ffmpeg: [] };
  const startedAt = Date.now();
  let liveAt = 0;
  let done;
  const finished = new Promise((r) => { done = r; });
  const running = () => state === 'starting' || state === 'live';

  function tooMany() {
    const now = Date.now();
    restarts.ffmpeg = restarts.ffmpeg.filter((t) => t > now - opt.restartWindowMs);
    restarts.ffmpeg.push(now);
    return restarts.ffmpeg.length > opt.maxRestarts;
  }

  function startEncoder() {
    const ro = rig.options;
    const args = ffmpegArgs({ ...opt, font, captionFile, x11: x11Input(ro), progress: true });
    const { child, failure } = spawnEncoder({
      ffmpeg, args, output: opt.output, nice: opt.encoderNice, stdio: ['ignore', 'pipe', 'pipe'],
      env: encoderEnv(opt, { DISPLAY: `:${ro.display}` }), event: (k, d) => event(k, d), createPublisher: opt.createPublisher,
    });
    const me = { child, startedAt: Date.now(), err: '', progress: {} };
    enc = me;
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
      let at;
      while ((at = out.indexOf('\n')) >= 0) {
        const [k, v] = out.slice(0, at).split('=');
        out = out.slice(at + 1);
        if (k && v !== undefined) me.progress[k.trim()] = v.trim();
      }
    });
    child.stderr.on('data', (d) => { me.err = (me.err + d).slice(-4_000); });
    child.on('error', (err) => { me.err += String(err?.message ?? err); });
    child.on('exit', (code, signal) => {
      if (enc === me) enc = null;
      if (!running()) return;
      const detail = clip(scrubOutputs(failure() ?? me.err, [opt.output]).split('\n').filter(Boolean).slice(-3).join(' | '));
      event('stream_ffmpeg_exit', { code, signal, detail });
      if (tooMany()) { fail(`ffmpeg failed ${opt.maxRestarts + 1} times in ${Math.round(opt.restartWindowMs / 60_000)} min: ${detail}`); return; }
      const wait = Math.min(30_000, 1_000 * 2 ** (restarts.ffmpeg.length - 1));
      setTimeout(() => { if (running() && !enc) startEncoder(); }, wait).unref?.();
    });
  }

  async function stopEncoder() {
    const e = enc;
    enc = null;
    if (!e || !alive(e.child)) return;
    e.child.kill('SIGINT'); // ffmpeg finishes the file (or the stream) on SIGINT
    await Promise.race([new Promise((r) => e.child.once('exit', r)), sleep(10_000)]);
    if (alive(e.child)) e.child.kill('SIGKILL');
  }

  function startFollowing() {
    follower = setInterval(() => { if (running()) rig.keepFollowing(opt.player); }, rig.options.followMs ?? 5_000);
    follower.unref?.();
    // a client that restarted mid-stream joins again: back into the bot's head
    offJoined = rig.on('joined', () => { if (running()) rig.follow(opt.player); });
  }

  function startWatchdog() {
    let last = null;
    let ticks = 0;
    watchdog = setInterval(async () => {
      if (state !== 'live') return;
      ticks += 1;
      if (ticks % 12 !== 1) return; // the first live tick sets the baseline, then a report every 60 s
      const s = await rig.stats({ resources: true });
      const f = await processTree(enc?.child.pid);
      const p = enc?.progress ?? {};
      const now = { at: Date.now(), c: s.clientTree?.cpuSec ?? 0, x: s.xvfbTree?.cpuSec ?? 0, f: f?.cpuSec ?? 0, frame: Number(p.frame) || 0 };
      if (last) {
        const sec = (now.at - last.at) / 1000;
        const pct = (a, b) => Math.round(((a - b) / sec) * 100);
        event('stream_stats', {
          clientFps: s.clientFps, captureFps: Math.round(((now.frame - last.frame) / sec) * 10) / 10, dup: Number(p.dup_frames) || 0, drop: Number(p.drop_frames) || 0,
          speed: p.speed ?? null, clientCpu: pct(now.c, last.c), clientMB: s.clientTree ? Math.round(s.clientTree.rssMB) : null,
          xvfbCpu: pct(now.x, last.x), ffmpegCpu: pct(now.f, last.f), ffmpegMB: f ? Math.round(f.rssMB) : null, camera: s.state,
        });
      }
      last = now;
    }, 5_000);
    watchdog.unref?.();
  }

  function fail(reason) {
    if (!running()) return;
    state = 'failed';
    event('stream_failed', { reason: clip(reason) });
    teardown().then(() => done({ ok: false, reason }));
  }

  async function teardown() {
    clearInterval(follower);
    clearInterval(watchdog);
    offJoined?.();
    await stopEncoder();
    await rig.park().catch(() => {});
    fs.rm(work, { recursive: true, force: true, maxRetries: 3 }, () => {});
  }

  return {
    get state() { return state; },
    /** Resolves once the camera rides along and ffmpeg runs (or the stream failed). */
    async start() {
      if (state !== 'idle') return;
      if (!ffmpeg) throw new Error('no ffmpeg found (set STREAM_FFMPEG)');
      if (!validName(opt.player)) throw new Error('the camera needs the bot\'s player name');
      state = 'starting';
      event('stream_start', { output: maskOutput(opt.output), size: `${opt.width}x${opt.height}`, fps: opt.fps, bitrateK: opt.bitrateK, caption: Boolean(font), source: 'client', player: opt.player });
      rig.start();
      const ready = await rig.waitReady(opt.readyWaitMs);
      if (!running()) return;
      if (!ready) { fail(`the camera client was not in the world after ${Math.round(opt.readyWaitMs / 1000)} s (${rig.state})`); return; }
      await rig.follow(opt.player);
      startFollowing();
      await sleep(opt.settleMs); // the chunks around the bot arrive before the first frame goes out
      if (!running()) return;
      state = 'live';
      liveAt = Date.now();
      startEncoder();
      startWatchdog();
      event('stream_live', { afterMs: liveAt - startedAt, camera: rig.name });
    },
    /** Stop: ffmpeg finishes the file or the stream, the camera parks. */
    async stop(reason = 'stopped') {
      if (state === 'idle') { state = 'stopped'; fs.rm(work, { recursive: true, force: true }, () => {}); done({ ok: true, reason }); }
      if (!running()) return finished;
      const was = state;
      state = 'stopping';
      const frames = Number(enc?.progress?.frame) || 0;
      await teardown();
      state = 'stopped';
      event('stream_stop', { reason: clip(reason, 200), wasLive: was === 'live', seconds: Math.round((Date.now() - startedAt) / 1000), frames });
      done({ ok: true, reason });
      return finished;
    },
    /**
     * Ride along with another player from now on (the live channel follows another game): the camera moves into that
     * bot's head, the caption is cleared, the broadcast goes on without a break.
     */
    async follow(player) {
      if (!validName(player)) throw new Error('the camera needs the bot\'s player name');
      if (player === opt.player) return;
      opt.player = player;
      lastPose = null;
      this.caption('');
      event('stream_follow', { player });
      if (state === 'live') await rig.follow(player);
    },
    get player() { return opt.player; },
    /** The bot's pose: a jump of more than 8 blocks (a respawn, a teleport) re-attaches the camera at once. */
    pose(p) {
      const q = cleanPose(p);
      if (!q) return;
      if (lastPose && Math.hypot(q.x - lastPose.x, q.y - lastPose.y, q.z - lastPose.z) > 8 && running()) rig.keepFollowing(opt.player);
      lastPose = q;
    },
    caption(text) {
      const tmp = `${captionFile}.tmp`;
      try { fs.writeFileSync(tmp, cleanCaption(text)); fs.renameSync(tmp, captionFile); } catch { /* the stream has ended */ }
    },
    async stats({ resources = false } = {}) {
      const p = enc?.progress ?? {};
      const out = {
        state, source: 'client', output: maskOutput(opt.output), video: `${opt.width}x${opt.height}@${opt.fps}`, player: opt.player,
        encoder: { frame: Number(p.frame) || 0, fps: Number(p.fps) || 0, dup: Number(p.dup_frames) || 0, drop: Number(p.drop_frames) || 0, speed: p.speed ?? null },
        restarts: { ffmpeg: restarts.ffmpeg.length }, camera: await rig.stats({ resources }), ffmpegPid: enc?.child.pid ?? null,
      };
      if (resources) out.ffmpegTree = await processTree(enc?.child.pid);
      return out;
    },
    finished,
    on: (e, fn) => emitter.on(e, fn),
    _killEncoder: () => enc?.child.kill('SIGKILL'),
  };
}

// ----- several cameras, and the manager that drives them

/** The camera options from config (config.stream.camera, config.mc). */
export function cameraOptions(config) {
  const { scale = 1, ...cam } = config?.stream?.camera ?? {};
  // the client draws at 1280x720 times CAMERA_SCALE (llvmpipe's cost); ffmpeg scales the video up to 1280x720
  const size = (n) => Math.round((n * scale) / 2) * 2;
  return defined({ ...cam, width: size(CAMERA_DEFAULTS.width), height: size(CAMERA_DEFAULTS.height), server: `${config?.mc?.host ?? '127.0.0.1'}:${config?.mc?.port ?? 25565}` });
}

/**
 * `count` rigs (one per stream that may run at once), each on its own display. A stream takes a free rig and gives it
 * back when it has finished. Rig i > 0 joins as <name><i+1>: a second client under the first one's name would kick it.
 */
export function createCameraPool({ count = 1, camera = {}, log, createRig = createCameraRig } = {}) {
  const event = (kind, data) => { try { log?.event(kind, data); } catch { /* best effort */ } };
  const idleMs = camera.idleMs ?? CAMERA_DEFAULTS.idleMs;
  const timers = new Map();
  /** A rig without a game sleeps after idleMs (0: never). */
  const idle = (rig) => {
    clearTimeout(timers.get(rig));
    if (!(idleMs > 0)) return;
    const t = setTimeout(() => { if (!busy.has(rig)) Promise.resolve(rig.sleep?.()).catch(() => {}); }, idleMs);
    t.unref?.();
    timers.set(rig, t);
  };
  const rigs = Array.from({ length: Math.max(0, count) }, (_, i) => createRig({
    ...camera, index: i, display: (camera.display ?? CAMERA_DEFAULTS.display) + i,
    home: path.join(camera.home ?? CAMERA_DEFAULTS.home, `cam${i}`), name: i && camera.name ? `${camera.name.slice(0, 15)}${i + 1}` : camera.name, event,
  }));
  const busy = new Set();
  return {
    rigs,
    /** Warm every camera: started now, in the world before the first game (asleep again after idleMs without one). */
    start() { for (const r of rigs) { Promise.resolve(r.start()).catch(() => {}); idle(r); } },
    /** The stream factory for createStreamManager. */
    create(opts) {
      const rig = rigs.find((r) => !busy.has(r));
      if (!rig) throw new Error('every camera is in use');
      busy.add(rig);
      clearTimeout(timers.get(rig));
      const s = createCameraStream({ ...opts, rig });
      s.finished.then(() => { busy.delete(rig); idle(rig); });
      return s;
    },
    stop: () => { for (const t of timers.values()) clearTimeout(t); return Promise.allSettled(rigs.map((r) => r.stop())); },
  };
}

/**
 * A stream manager whose streams are real-client cameras (STREAM_SOURCE=client); stopAll also stops the cameras. With
 * FB_LIVE=on it is the Facebook live channel instead (src/fb-live.js): one camera, every game on one channel, each
 * broadcast a live video of the Page. gameTtlMs: in the camera service, a game the agent stops reporting leaves the
 * channel after this long.
 */
export function createCameraManager({ config, log, createRig, graph = null, gameTtlMs = 0 } = {}) {
  if (config.fb?.live) {
    const pool = createCameraPool({ count: 1, camera: cameraOptions(config), log, createRig });
    const channel = createLiveChannel({
      graph: graph ?? createGraph({
        pageId: config.fb.target === 'me' ? 'me' : config.fb.pageId, privacy: config.fb.target === 'me' ? { value: config.fb.privacy } : null,
        tokenFile: config.fb.tokenFile, version: config.fb.graphVersion, base: config.fb.graphUrl, log,
      }),
      createStream: (opts) => pool.create(opts), streamOptions: managerConfig(config.stream).options, log,
      title: config.fb.title, stateFile: config.fb.stateFile, gameTtlMs, deleteAfter: config.fb.deleteAfter,
      privacy: config.fb.target === 'me' ? config.fb.privacy : null, maxPerHour: config.fb.maxPerHour, maxPerDay: config.fb.maxPerDay,
    });
    pool.start();
    const stopAll = channel.stopAll;
    channel.stopAll = async (reason) => { await stopAll(reason); await pool.stop(); };
    channel.pool = pool;
    return channel;
  }
  const pool = createCameraPool({ count: config.stream.max, camera: cameraOptions(config), log, createRig });
  const manager = createStreamManager({ config: managerConfig(config.stream), log, create: (opts) => pool.create(opts) });
  if (manager.enabled) pool.start();
  const stopAll = manager.stopAll;
  manager.stopAll = async (reason) => { await stopAll(reason); await pool.stop(); };
  manager.pool = pool;
  return manager;
}
