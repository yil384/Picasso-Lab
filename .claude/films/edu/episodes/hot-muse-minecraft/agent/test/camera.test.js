// test/camera.test.js - the real-client camera (src/camera.js) without Minecraft, Java or an X server: the client's
// options and command line (the token never in it), offline UUIDs, console lines (validated, non-blocking on a FIFO,
// quiet while riding along), ffmpeg's x11grab input, the account (offline, not logged in, a stored login), a rig on
// stand-in programs (joins, spectator, park, F1, a client that dies is restarted), one stream's lifecycle on a
// stand-in rig and ffmpeg, the pool, the player name through the manager, the service and its client, the index hook,
// and the STREAM_SOURCE / CAMERA_* configuration.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  clientOptions, clientLaunch, modJars, sodiumOptions, offlineUuid, consoleCommand, followCommands, keepFollowingCommands, parkCommands, validName,
  cameraProfile, tightenAuthDir, createCameraRig, createCameraStream, createCameraPool, cameraOptions, x11Input, CAMERA_DEFAULTS,
} from '../src/camera.js';
import { ffmpegArgs, createStreamManager, createStreamService, createRemoteStreamManager, encoderEnv, managerConfig } from '../src/stream.js';
import { loadConfig } from '../src/config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8_000) {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > ms) throw new Error('timed out waiting');
    await sleep(20);
  }
}
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'muse-camera-test-'));
function script(dir, name, body) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return p;
}
const LAUNCH = { version: '1.21.4', mainClass: 'net.minecraft.client.main.Main', classpath: ['/opt/mc/a.jar', '/opt/mc/client.jar'], assetsDir: '/opt/mc/assets', assetIndex: '19', nativesDir: '/opt/mc/natives' };
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.secret-minecraft-token-0123456789';

test('client options: the video settings, no HUD chat, no sound, no first-run screens, no pause without focus', () => {
  const o = clientOptions({ renderDistance: 8, maxFps: 30 });
  const v = Object.fromEntries(o.trim().split('\n').map((l) => [l.slice(0, l.indexOf(':')), l.slice(l.indexOf(':') + 1)]));
  assert.equal(v.version, '4189');
  assert.deepEqual([v.renderDistance, v.maxFps, v.enableVsync, v.graphicsMode, v.particles], ['8', '30', 'false', '0', '0'], 'fast leaves by default');
  assert.deepEqual([v.chatVisibility, v.soundCategory_master, v.pauseOnLostFocus, v.onboardAccessibility, v.tutorialStep], ['2', '0.0', 'false', 'false', 'none']);
  assert.equal(v.inactivityFpsLimit, '"minimized"', 'never throttled as AFK');
  assert.equal(clientOptions({ graphics: 'fancy' }).includes('graphicsMode:1'), true);
});

test('offline UUIDs match what Paper gives the name', () => {
  assert.equal(offlineUuid('MuseCam'), '8d1e7eba-e911-34a8-ad44-808a90d34c14'); // from the test server's log
  assert.equal(validName('Muse_ab12cd'), true);
  for (const bad of ['ab', 'a'.repeat(17), 'x y', 'x\nop me', '@a', 'é_name']) assert.equal(validName(bad), false, bad);
});

test('client command: the wrapper class, quick play to the server, Mesa or VirtualGL; the token is never in it', () => {
  const c = { ...CAMERA_DEFAULTS, home: '/camera/cam0', server: '10.77.77.10:25565', glThreads: 6, javaThreads: 3 };
  const cpu = clientLaunch(c, LAUNCH, { name: 'MuseCam', uuid: offlineUuid('MuseCam') });
  assert.equal(cpu.file, 'java');
  const i = cpu.args.indexOf('muse.camera.CameraMain');
  assert.ok(i > 0 && cpu.args[i - 2] === '-cp' && cpu.args[i - 1].startsWith('/opt/mc/camera-main:'));
  assert.equal(cpu.args[cpu.args.indexOf('--quickPlayMultiplayer') + 1], '10.77.77.10:25565');
  assert.ok(cpu.args.includes('-XX:ActiveProcessorCount=3'));
  assert.deepEqual([cpu.env.LP_NUM_THREADS, cpu.env.LIBGL_ALWAYS_SOFTWARE, cpu.env.DISPLAY, cpu.cwd], ['6', '1', ':99', '/camera/cam0/game']);
  assert.equal(cpu.args.includes('--accessToken'), false, 'CameraMain adds it from MC_ACCESS_TOKEN');
  assert.equal(JSON.stringify(cpu).includes('MC_ACCESS_TOKEN'), false);
  const gpu = clientLaunch({ ...c, gl: 'gpu' }, LAUNCH, { name: 'MuseCam', uuid: 'u' });
  assert.deepEqual([gpu.file, gpu.args[0], gpu.env.VGL_DISPLAY], ['vglrun', 'java', 'egl']);
  assert.deepEqual(x11Input({ display: 99, width: 1280, height: 720 }), { display: ':99.0+0,0', width: 1280, height: 720 });
});

test('console: validated lines; a FIFO nobody reads fails at once instead of hanging; quiet re-attach lines', async () => {
  const dir = tmpdir();
  const file = path.join(dir, 'console.in');
  fs.writeFileSync(file, '');
  await consoleCommand(file, 'spectate Muse_ab12cd MuseCam');
  assert.equal(fs.readFileSync(file, 'utf8'), 'spectate Muse_ab12cd MuseCam\n');
  for (const bad of ['op x\nstop', 'say hi; stop', '/stop', '']) await assert.rejects(consoleCommand(file, bad), /refused/, JSON.stringify(bad));
  await assert.rejects(consoleCommand('', 'list'), /no server console/);
  const fifo = path.join(dir, 'fifo');
  execFileSync('mkfifo', [fifo]);
  const t0 = Date.now();
  await assert.rejects(consoleCommand(fifo, 'list'), /ENXIO/);
  assert.ok(Date.now() - t0 < 1_000);

  // the console only tags; the Paper datapack (deploy/paper-datapack/muse_cam) rides the eye or the head every tick
  assert.deepEqual(followCommands('MuseCam', 'Muse_g1'), [
    ['gamemode spectator MuseCam', 'execute as MuseCam run spectate', 'tag @a remove muse_cam_target', 'tag MuseCam add muse_cam', 'tag MuseCam add muse_cam_third',
      'tag MuseCam remove muse_cam_ineye', 'tag MuseCam remove muse_cam_inhead', 'effect give MuseCam minecraft:night_vision infinite 0 true', 'tp MuseCam Muse_g1'],
    ['tag Muse_g1 add muse_cam_target'],
  ]);
  assert.ok(followCommands('MuseCam', 'Muse_g1', 'first')[0].includes('tag MuseCam remove muse_cam_third'), 'CAMERA_VIEW=first: the bot\'s head');
  const keep = keepFollowingCommands('MuseCam', 'Muse_g1').flat();
  assert.deepEqual(keep, ['tag Muse_g1 add muse_cam_target']);
  assert.deepEqual(parkCommands('MuseCam'), ['tag @a remove muse_cam_target', 'kill @e[type=minecraft:item_display,tag=muse_cam_eye]', 'kill @e[type=minecraft:marker,tag=muse_cam_yaw]', 'tag MuseCam remove muse_cam_ineye',
    'tag MuseCam remove muse_cam_inhead', 'execute as MuseCam run spectate', 'execute as MuseCam at @s run tp @s ~ 250 ~ ~ -90']);
  for (const l of [...followCommands('MuseCam', 'Muse_g1').flat(), ...keep, ...parkCommands('MuseCam')]) await consoleCommand(file, l);
});

test('ffmpeg: the X display grabbed at the frame rate (no cursor), progress on stdout, the same encoding as the viewer streams', () => {
  const a = ffmpegArgs({ output: 'rtmps://live-api-s.facebook.com:443/rtmp/KEY', x11: { display: ':99.0+0,0', width: 960, height: 540 }, progress: true, fps: 30 });
  const i = a.indexOf('x11grab');
  assert.ok(i > 0 && a[i - 1] === '-f');
  assert.deepEqual(a.slice(i + 1, i + 8), ['-draw_mouse', '0', '-framerate', '30', '-video_size', '960x540', '-i']);
  assert.equal(a[i + 8], ':99.0+0,0');
  assert.equal(a.includes('image2pipe'), false);
  assert.ok(a.join(' ').includes('-progress pipe:1 -stats_period 5'));
  assert.ok(a.join(' ').includes('scale=1280:720'), 'scaled up to the video size');
  assert.equal(a[a.indexOf('-g') + 1], '60');
  assert.equal(a.at(-2), 'flv');
});

test('account: offline needs no token; msa without a login fails without asking for a code; a stored login gives the token, files 600', async () => {
  const off = await cameraProfile({ auth: 'offline', name: '' });
  assert.deepEqual(off, { name: 'MuseCam', uuid: offlineUuid('MuseCam'), token: '', auth: 'offline' });
  await assert.rejects(cameraProfile({ auth: 'offline', name: 'bad name' }), /CAMERA_NAME/);
  await assert.rejects(cameraProfile({ auth: 'msa', authDir: '' }), /no auth folder/);

  const dir = tmpdir();
  let asked = 0;
  class NoLogin {
    constructor(name, cache, opts, onCode) { this.onCode = onCode; this.msa = { getRefreshToken: async () => undefined }; assert.equal(opts.flow, 'live'); }
    async getMinecraftJavaToken() { asked += 1; this.onCode({}); }
  }
  await assert.rejects(cameraProfile({ auth: 'msa', authDir: dir }, { Authflow: NoLogin }), /not logged in: run scripts\/camera-login\.mjs/);
  assert.equal(asked, 0, 'no device code is requested by the camera');

  fs.writeFileSync(path.join(dir, 'abc_live-cache.json'), '{}', { mode: 0o644 });
  class LoggedIn {
    constructor() { this.msa = { getRefreshToken: async () => ({ token: 'rt' }) }; }
    async getMinecraftJavaToken(o) { assert.equal(o.fetchProfile, true); return { token: TOKEN, profile: { id: 'f1e2d3c4b5a69788', name: 'YichenMC' } }; }
  }
  const p = await cameraProfile({ auth: 'msa', authDir: dir }, { Authflow: LoggedIn });
  assert.deepEqual(p, { name: 'YichenMC', uuid: 'f1e2d3c4b5a69788', token: TOKEN, auth: 'msa' });
  assert.equal(fs.statSync(path.join(dir, 'abc_live-cache.json')).mode & 0o777, 0o600);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
  fs.chmodSync(dir, 0o755);
  tightenAuthDir(dir);
  assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
});

test('rig on stand-in programs: joins, spectator and park on the console, F1 once, the token only in the environment; a dead client is restarted', async () => {
  const dir = tmpdir();
  const out = path.join(dir, 'out');
  fs.mkdirSync(out);
  const consoleFile = path.join(dir, 'console.in');
  fs.writeFileSync(consoleFile, '');
  // a "client" that logs like Minecraft, records its arguments and whether it got the token, then stays up
  const java = script(dir, 'java', [
    `n=$(ls ${out} | grep -c '^args'); printf '%s\\n' "$@" > ${out}/args$n; [ "$MC_ACCESS_TOKEN" = "${TOKEN}" ] && echo yes > ${out}/token$n`,
    'echo "[12:00:00] [Render thread/INFO]: Setting user: MuseCam"', 'echo "[12:00:01] [Render thread/INFO]: Connecting to 10.77.77.10, 25565"',
    'echo "[12:00:02] [Render thread/INFO]: Loaded 2 advancements"', 'exec sleep 600',
  ].join('\n'));
  const xvfb = script(dir, 'Xvfb', 'exec sleep 600');
  const xdpyinfo = script(dir, 'xdpyinfo', 'exit 0');
  const xdotool = script(dir, 'xdotool', `echo "$@" >> ${out}/keys`);
  const rows = [];
  const rig = createCameraRig({
    java, xvfb, xdpyinfo, xdotool, display: 4242, home: path.join(dir, 'home'), console: consoleFile, launch: LAUNCH, javaNice: 0,
    hideGuiDelayMs: 50, attachDelayMs: 10, joinTimeoutMs: 20_000,
    profile: async () => ({ name: 'MuseCam', uuid: offlineUuid('MuseCam'), token: TOKEN, auth: 'msa' }),
    event: (kind, data) => rows.push({ kind, ...data }),
  });
  try {
    rig.start();
    assert.equal(await rig.waitReady(8_000), true);
    await until(() => fs.existsSync(path.join(out, 'keys')));
    assert.equal(fs.readFileSync(path.join(out, 'keys'), 'utf8'), 'key F1\n');
    const lines = () => fs.readFileSync(consoleFile, 'utf8').trim().split('\n');
    await until(() => lines().length >= 11);
    // on the server's whitelist before it joins (the Paper container lets in only listed players); then a spectator
    // with night vision, tagged as the camera, parked
    assert.deepEqual(lines(), ['whitelist add MuseCam', 'gamemode spectator MuseCam', 'tag MuseCam add muse_cam', 'effect give MuseCam minecraft:night_vision infinite 0 true', ...parkCommands('MuseCam')]);
    assert.equal(fs.readFileSync(path.join(out, 'token0'), 'utf8'), 'yes\n', 'the client got its token');
    assert.equal(fs.readFileSync(path.join(out, 'args0'), 'utf8').includes(TOKEN), false, 'and not on its command line');
    assert.match(fs.readFileSync(path.join(dir, 'home', 'game', 'options.txt'), 'utf8'), /renderDistance:5\n/);
    assert.equal(JSON.stringify(rows).includes(TOKEN), false, 'nor in the log rows');

    await rig.follow('Muse_g1');
    assert.deepEqual(lines().slice(-10), followCommands('MuseCam', 'Muse_g1').flat());
    assert.equal(await rig.follow('bad name; op'), false, 'never a console line from a bad name');

    const pid = (await rig.stats()).clientPid;
    process.kill(pid, 'SIGKILL');
    await until(() => rows.some((r) => r.kind === 'camera_restart'));
    await until(() => rows.filter((r) => r.kind === 'camera_joined').length === 2, 10_000);
    assert.notEqual((await rig.stats()).clientPid, pid);
    await until(() => fs.readFileSync(path.join(out, 'keys'), 'utf8') === 'key F1\nkey F1\n', 5_000);

    // no game for a while: the client quits and stays down; the next game wakes it
    await rig.sleep();
    assert.deepEqual([rig.state, (await rig.stats()).clientPid], ['asleep', null]);
    await sleep(1_500);
    assert.equal(rows.filter((r) => r.kind === 'camera_client_start').length, 2, 'no restart while asleep');
    rig.start();
    assert.equal(await rig.waitReady(8_000), true);
    assert.equal(rows.filter((r) => r.kind === 'camera_joined').length, 3);
  } finally {
    await rig.stop();
  }
  assert.equal(rig.state, 'stopped');
});

function fakeRig(name = 'MuseCam') {
  const e = new EventEmitter();
  const r = {
    calls: [], state: 'joining', options: { ...CAMERA_DEFAULTS, display: 4243, followMs: 30 }, name,
    start() { r.calls.push('start'); setTimeout(() => { r.state = 'ready'; e.emit('joined'); }, 30); },
    waitReady() { return r.state === 'ready' ? Promise.resolve(true) : new Promise((res) => e.once('joined', () => res(true))); },
    async follow(p) { r.calls.push(`follow ${p}`); return true; },
    async keepFollowing(p) { r.calls.push(`keep ${p}`); return true; },
    async park() { r.calls.push('park'); },
    on(ev, fn) { e.on(ev, fn); return () => e.off(ev, fn); },
    emit: (...a) => e.emit(...a),
    async stats() { return { state: r.state, clientFps: 24 }; },
    async sleep() { r.calls.push('sleep'); r.state = 'asleep'; },
    async stop() { r.calls.push('stop'); r.state = 'stopped'; },
  };
  return r;
}

test('stream on a stand-in rig and ffmpeg: rides along, encodes the display, re-attaches after a jump or a rejoin, finishes the file, parks', async () => {
  const dir = tmpdir();
  const argsFile = path.join(dir, 'ffargs');
  const ffmpeg = script(dir, 'ffmpeg', `printf '%s\\n' "$@" > ${argsFile}\ntrap 'echo done > ${dir}/finished; exit 0' INT TERM\nwhile :; do echo frame=42; echo dup_frames=0; echo progress=continue; sleep 0.1; done`);
  const rig = fakeRig();
  const rows = [];
  const s = createCameraStream({ rig, player: 'Muse_g1', output: path.join(dir, 'out.mp4'), ffmpeg, font: null, settleMs: 10, event: (k, d) => rows.push({ k, ...d }) });
  await s.start();
  assert.equal(s.state, 'live');
  assert.deepEqual(rig.calls.slice(0, 2), ['start', 'follow Muse_g1']);
  await until(() => fs.existsSync(argsFile));
  const args = fs.readFileSync(argsFile, 'utf8').trim().split('\n');
  assert.equal(args[args.indexOf('-i') + 1], ':4243.0+0,0');
  assert.equal(args.at(-1), path.join(dir, 'out.mp4'));
  await until(() => rig.calls.includes('keep Muse_g1'));
  s.pose({ x: 0, y: 64, z: 0 });
  const before = rig.calls.length;
  s.pose({ x: 40, y: 64, z: 0 }); // a respawn far away
  assert.equal(rig.calls[before], 'keep Muse_g1');
  rig.emit('joined'); // the client restarted and joined again
  await until(() => rig.calls.filter((c) => c === 'follow Muse_g1').length === 2);
  await until(async () => (await s.stats()).encoder.frame === 42);
  await s.stop('the game ended');
  assert.equal(fs.readFileSync(path.join(dir, 'finished'), 'utf8'), 'done\n', 'ffmpeg was asked to finish');
  assert.equal(rig.calls.at(-1), 'park');
  assert.deepEqual(rows.map((r) => r.k).filter((k) => /stream_(start|live|stop)/.test(k)), ['stream_start', 'stream_live', 'stream_stop']);
  assert.equal(rows[0].player, 'Muse_g1');

  const bad = createCameraStream({ rig: fakeRig(), player: 'not ok', output: 'x.mp4', ffmpeg });
  await assert.rejects(bad.start(), /player name/);
  const slow = { ...fakeRig(), start() {}, waitReady: async () => false, state: 'joining' };
  const late = createCameraStream({ rig: slow, player: 'Muse_g2', output: path.join(dir, 'late.mp4'), ffmpeg, readyWaitMs: 50 });
  await late.start();
  assert.deepEqual(await late.finished, { ok: false, reason: 'the camera client was not in the world after 0 s (joining)' });
});

test('pool: one rig per stream slot on its own display, the second under its own name; a finished stream frees its rig', async () => {
  const made = [];
  const pool = createCameraPool({ count: 2, camera: { name: 'MuseCam', display: 99, home: '/camera' }, createRig: (o) => { const r = fakeRig(o.name); r.o = o; made.push(r); return r; } });
  assert.deepEqual(made.map((r) => [r.o.display, r.o.home, r.o.name]), [[99, '/camera/cam0', 'MuseCam'], [100, '/camera/cam1', 'MuseCam2']]);
  const a = pool.create({ player: 'Muse_a1', output: '/tmp/a.mp4', ffmpeg: '/bin/true' });
  pool.create({ player: 'Muse_b1', output: '/tmp/b.mp4', ffmpeg: '/bin/true' });
  assert.throws(() => pool.create({ player: 'Muse_c1', output: '/tmp/c.mp4' }), /every camera is in use/);
  await a.stop();
  await sleep(0);
  assert.ok(pool.create({ player: 'Muse_c1', output: '/tmp/c.mp4', ffmpeg: '/bin/true' }), 'its rig is free again');

  // a rig with no game sleeps after idleMs; a game wakes it (its stream starts the rig) and keeps it awake
  const one = createCameraPool({ count: 1, camera: { idleMs: 40 }, createRig: () => fakeRig() });
  one.start();
  await until(() => one.rigs[0].calls.includes('sleep'));
  const s = one.create({ player: 'Muse_d1', output: '/tmp/d.mp4', ffmpeg: '/bin/true' });
  const n = one.rigs[0].calls.length;
  await sleep(80);
  assert.equal(one.rigs[0].calls.slice(n).includes('sleep'), false, 'no sleep during a game');
  await s.stop();
  await until(() => one.rigs[0].calls.slice(n).includes('sleep'));
  await one.stop();
  const opts = cameraOptions(loadConfig({ MC_HOST: '10.77.77.10', CAMERA_SCALE: '0.75', CAMERA_NAME: 'MuseCam' }));
  assert.deepEqual([opts.server, opts.width, opts.height, opts.name], ['10.77.77.10:25565', 960, 540, 'MuseCam']);
});

test('the bot\'s name goes from the agent through the service to the stream; a bad name is refused', async () => {
  const made = [];
  const create = (o) => {
    const st = { o, state: 'live', finished: new Promise(() => {}), async start() {}, async stop() { st.state = 'stopped'; }, caption() {}, pose() {}, async stats() { return {}; } };
    made.push(st);
    return st;
  };
  const manager = createStreamManager({ config: { enabled: true, outDir: '/tmp/streams', max: 2 }, create });
  const server = createStreamService({ manager });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const bad = await fetch(`${url}/streams/g1`, { method: 'PUT', body: JSON.stringify({ source: 'http://127.0.0.1:3201/eyes/g1/', player: 'x\nstop' }) });
    assert.equal(bad.status, 400);
    const client = createRemoteStreamManager({ url });
    client.start('g1', { source: 'http://127.0.0.1:3201/eyes/g1/', player: 'Muse_g1' });
    await until(() => made.length === 1);
    assert.equal(made[0].o.player, 'Muse_g1');
    await client.stopAll();
  } finally {
    server.close();
  }
});

test('config: STREAM_SOURCE viewer by default; the camera needs the console and its auth folder; CAMERA_* checked', () => {
  const c = loadConfig({});
  assert.equal(c.stream.source, 'viewer');
  assert.deepEqual([c.stream.camera.auth, c.stream.camera.gl, c.stream.camera.maxFps, c.stream.camera.renderDistance, c.stream.camera.graphics, c.stream.camera.scale, c.stream.camera.glThreads, c.stream.camera.mods], ['msa', 'cpu', 30, 5, 'fast', 0.75, 8, 'sodium']);
  const base = { STREAM_ENABLED: '1', STREAM_OUT_DIR: '/tmp/streams', STREAM_SOURCE: 'client' };
  assert.throws(() => loadConfig(base), /needs MC_CONSOLE/);
  assert.throws(() => loadConfig({ ...base, MC_CONSOLE: '/console/console.in' }), /needs CAMERA_AUTH_DIR/);
  const ok = loadConfig({ ...base, MC_CONSOLE: '/console/console.in', CAMERA_AUTH_DIR: '/auth' });
  assert.deepEqual([ok.stream.source, ok.stream.camera.authDir, ok.stream.camera.console], ['client', '/auth', '/console/console.in']);
  assert.equal(loadConfig({ ...base, MC_CONSOLE: '/c', CAMERA_AUTH: 'offline' }).stream.camera.auth, 'offline');
  assert.equal(loadConfig({ STREAM_ENABLED: '1', STREAM_SOURCE: 'client', STREAM_SERVICE_URL: 'http://127.0.0.1:7862' }).stream.source, 'client', 'the agent side needs neither');
  assert.throws(() => loadConfig({ STREAM_SOURCE: 'browser' }), /STREAM_SOURCE/);
  assert.throws(() => loadConfig({ CAMERA_NAME: 'no spaces' }), /CAMERA_NAME/);
  assert.throws(() => loadConfig({ CAMERA_GL: 'vulkan' }), /CAMERA_GL/);
  assert.throws(() => loadConfig({ CAMERA_SCALE: '2' }), /CAMERA_SCALE/);
});

test('test clock (STREAM_CLOCK): off by default; on, a large HH:MM:SS top right in the configured time zone', () => {
  assert.equal(loadConfig({}).stream.clock, false);
  const off = ffmpegArgs({ output: 'x.mp4', font: '/f.ttf' });
  assert.equal(off.join(' ').includes('localtime'), false);
  const vf = (a) => a[a.indexOf('-vf') + 1];
  const on = ffmpegArgs({ output: 'x.mp4', font: '/f.ttf', clock: true });
  assert.match(vf(on), /drawtext=fontfile='\/f\.ttf':text='%\{localtime\\:%T\}':fontsize=65:.*:x=w-tw-30:y=30,format=yuv420p$/);
  assert.equal(vf(ffmpegArgs({ output: 'x.mp4', font: null, clock: true })).includes('localtime'), false, 'no font, no clock');
  assert.equal(encoderEnv({ clock: true, clockTz: 'America/Los_Angeles' }).TZ, 'America/Los_Angeles');
  assert.equal(encoderEnv({}, { DISPLAY: ':99' }).DISPLAY, ':99');
  const mc = managerConfig(loadConfig({ STREAM_ENABLED: '1', STREAM_OUT_DIR: '/tmp/s', STREAM_CLOCK: '1' }).stream);
  assert.deepEqual([mc.options.clock, mc.options.clockTz], [true, 'America/Los_Angeles']);
});

test('client mods: Fabric first on the class path, its ASM instead of the game\'s, the chosen jars by path; vanilla when off', () => {
  const fabric = {
    loader: '0.19.5', mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient', jvmArgs: ['-DFabricMcEmu=net.minecraft.client.main.Main'],
    classpath: ['/opt/mc/libraries/org/ow2/asm/asm/9.10.1/asm-9.10.1.jar', '/opt/mc/libraries/net/fabricmc/fabric-loader/0.19.5/fabric-loader-0.19.5.jar'],
    replaces: ['/opt/mc/libraries/org/ow2/asm/asm/9.6/asm-9.6.jar'],
    mods: { sodium: { version: 'mc1.21.4-0.6.13-fabric', jar: '/opt/mc/mods/sodium.jar' }, ferritecore: { version: '7.1.3-fabric', jar: '/opt/mc/mods/ferritecore.jar' } },
  };
  const launch = { ...LAUNCH, classpath: ['/opt/mc/libraries/org/ow2/asm/asm/9.6/asm-9.6.jar', ...LAUNCH.classpath], fabric };
  const c = { ...CAMERA_DEFAULTS, home: '/camera/cam0', server: '10.0.0.1:25565', mods: 'sodium, ferritecore', jvmArgs: ['-XX:+AlwaysPreTouch'] };
  assert.deepEqual(modJars(c, launch), ['/opt/mc/mods/sodium.jar', '/opt/mc/mods/ferritecore.jar']);
  const cmd = clientLaunch(c, launch, { name: 'MuseCam', uuid: 'u' });
  const cp = cmd.args[cmd.args.indexOf('-cp') + 1].split(':');
  assert.deepEqual(cp.slice(0, 3), ['/opt/mc/camera-main', ...fabric.classpath]);
  assert.equal(cp.includes('/opt/mc/libraries/org/ow2/asm/asm/9.6/asm-9.6.jar'), false, 'one ASM only');
  assert.ok(cp.includes('/opt/mc/client.jar'));
  for (const a of ['-Dmuse.camera.main=net.fabricmc.loader.impl.launch.knot.KnotClient', '-Dfabric.addMods=/opt/mc/mods/sodium.jar:/opt/mc/mods/ferritecore.jar', '-DFabricMcEmu=net.minecraft.client.main.Main', '-XX:+AlwaysPreTouch']) {
    assert.ok(cmd.args.includes(a), a);
  }
  const vanilla = clientLaunch({ ...c, mods: 'off' }, launch, { name: 'MuseCam', uuid: 'u' });
  assert.equal(vanilla.args.some((a) => a.startsWith('-Dmuse.camera.main') || a.includes('fabric-loader')), false);
  assert.throws(() => modJars({ mods: 'optifine' }, launch), /no client mod "optifine"/);
  assert.throws(() => modJars({ mods: 'sodium' }, LAUNCH), /needs an image with Fabric/);
  const so = sodiumOptions({ chunkThreads: 2, graphics: 'fast' });
  assert.deepEqual([so.performance.chunk_builder_threads, so.quality.leaves_quality, so.performance.use_block_face_culling], [2, 'FAST', true]);
  const cfg = loadConfig({}).stream.camera;
  assert.deepEqual([cfg.mods, cfg.chunkThreads, cfg.jvmArgs], ['sodium', 0, []]);
  assert.deepEqual(loadConfig({ CAMERA_JVM_ARGS: '-XX:+UseZGC  -Xss2m' }).stream.camera.jvmArgs, ['-XX:+UseZGC', '-Xss2m']);
});
