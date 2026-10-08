// test/view-fx.test.js - the live-view extras: the body reports the block it is breaking ('dig', digging()), src/web.js
// serves the viewer's page with src/live-view-fx.js added and streams the digs to it, the script eases the
// first-person camera and draws the crack (run here on a stand-in THREE), and the log says why a live view closed
// and why a stop was pressed. No Minecraft server, no browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import { createFakeBot } from './fake-bot.js';
import { createBody } from '../src/body.js';
import { createWeb } from '../src/web.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { Vec3 } from '../src/mc.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('body: the block being broken is a "dig" event and digging(), by pathfinder or a skill', async () => {
  const bot = createFakeBot({ scene: 'flat' });
  const config = loadConfig({});
  const body = createBody({ bot, config, log: createLogger({ dir: null, config }) });
  await body.ready;
  const seen = [];
  body.on('dig', (d) => seen.push(d));
  bot.digTime = () => 7_500;
  bot.targetDigBlock = bot.blockAt(new Vec3(1, 59, 0));
  bot.emit('physicsTick');
  bot.emit('physicsTick'); // the same block: nothing new
  assert.deepEqual(seen, [{ x: 1, y: 59, z: 0, name: 'stone', ms: 7500 }]);
  await sleep(30);
  const now = body.digging();
  assert.equal(now.name, 'stone');
  assert.ok(now.elapsed >= 25 && now.elapsed < 1_000, `elapsed ${now.elapsed}`);
  bot.targetDigBlock = null;
  bot.emit('physicsTick');
  assert.deepEqual(seen.at(-1), null);
  assert.equal(body.digging(), null);
});

/** A stand-in body for the web channel: ready at once, live views on the given ports, 'dig' events on demand. */
function viewBody(ports) {
  const subs = new Map();
  let dig = null;
  const body = {
    ready: Promise.resolve(),
    viewerPort: ports.watch,
    eyesPort: ports.eyes,
    state: () => 'position 0 64 0',
    snapshot: () => ({ position: { x: 0, y: 64, z: 0 } }),
    inventory: () => ({}),
    setGoal() {},
    busy: false,
    async run() { return { ok: true, result: 'done', delta: {} }; },
    async stop() {},
    async close() { for (const fn of subs.get('end') ?? []) fn({ reason: 'closed' }); },
    digging: () => dig,
    on(ev, fn) {
      if (!subs.has(ev)) subs.set(ev, new Set());
      subs.get(ev).add(fn);
      return () => subs.get(ev).delete(fn);
    },
    dig(d) { dig = d && { ...d, elapsed: 0 }; for (const fn of subs.get('dig') ?? []) fn(d); },
  };
  return body;
}

test('web: the live views get the fx script, the dig stream, and a log line when a view closes', async (t) => {
  // a stand-in viewer: its files answer with their path; WebSocket upgrades are accepted and closed on request
  const upstream = http.createServer((req, res) => res.end(`viewer:${req.url}`));
  const upgraded = [];
  upstream.on('upgrade', (req, sock) => {
    sock.on('error', () => {});
    sock.write('HTTP/1.1 101 Switching Protocols\r\nupgrade: websocket\r\nconnection: Upgrade\r\n\r\n');
    upgraded.push(sock);
  });
  await new Promise((r) => upstream.listen(0, '127.0.0.1', r));
  t.after(() => { upstream.closeAllConnections?.(); upstream.close(); });
  const port = upstream.address().port;

  const config = loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0' });
  const log = createLogger({ dir: null, config });
  const bodies = new Map();
  const web = createWeb({ config, log, makeBody: (id) => { const b = viewBody({ watch: port, eyes: port }); bodies.set(id, b); return b; } });
  const { url } = await web.start();
  t.after(() => web.stop());
  const s = await (await fetch(`${url}/api/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"adult":true}' })).json();
  for (let i = 0; i < 100 && (await (await fetch(`${url}/api/${s.token}/state`)).json()).session.status !== 'ready'; i++) await sleep(5);
  const game = s.session;
  const body = bodies.get(game);
  const id = /href="\/eyes\/([A-Za-z0-9_-]{22})\/"/.exec(await (await fetch(s.playUrl)).text())[1]; // the view id

  // the page: the viewer's own, with the script after its client; the script with its settings in front
  const page = await (await fetch(`${url}/eyes/${id}/`)).text();
  assert.match(page, /<script type="text\/javascript" src="index\.js"><\/script>\s*<script type="text\/javascript" src="muse-fx\.js"><\/script>/);
  const js = await fetch(`${url}/watch/${id}/muse-fx.js`);
  assert.match(js.headers.get('content-type'), /^text\/javascript/);
  const src = await js.text();
  assert.match(src, /^window\.__museFx = \{"textures":"textures\/1\.21\.4\/blocks\/","events":"muse-fx\/events"\};\n\/\/ src\/live-view-fx\.js/);
  assert.equal(await (await fetch(`${url}/eyes/${id}/index.js`)).text(), `viewer:/eyes/${id}/index.js`, 'the rest is the viewer\'s');

  // the dig stream: what is being broken now, then each change; it ends with the session
  body.dig({ x: 1, y: 59, z: 0, name: 'stone', ms: 7500 });
  const res = await fetch(`${url}/eyes/${id}/muse-fx/events`);
  assert.match(res.headers.get('content-type'), /^text\/event-stream/);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const next = async () => {
    while (!buf.includes('\n\n')) {
      const { value, done } = await reader.read();
      if (done) return null;
      buf += dec.decode(value);
    }
    const i = buf.indexOf('\n\n');
    const msg = buf.slice(0, i);
    buf = buf.slice(i + 2);
    return msg;
  };
  assert.match(await next(), /^data: \{"x":1,"y":59,"z":0,"ms":7500,"elapsed":\d+\}$/);
  body.dig(null);
  assert.equal(await next(), 'data: null');
  body.dig({ x: 2, y: 63, z: 5, name: 'dirt', ms: 750 });
  assert.equal(await next(), 'data: {"x":2,"y":63,"z":5,"ms":750,"elapsed":0}');

  // a live view: its close is logged with why
  const ws = await new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: new URL(url).port, path: `/eyes/${id}/socket.io/?EIO=4&transport=websocket`, headers: { connection: 'Upgrade', upgrade: 'websocket' } });
    req.on('upgrade', (r, socket) => resolve(socket));
    req.on('error', reject);
    req.end();
  });
  ws.on('error', () => {});
  ws.end();
  for (let i = 0; i < 100 && !log.tail(50).some((r) => r.kind === 'view_close'); i++) await sleep(10);
  const closed = log.tail(50).find((r) => r.kind === 'view_close');
  assert.equal(closed.session, game, 'the log names the game, never the view id');
  assert.ok(!JSON.stringify(log.tail(200)).includes(id), 'the view id is not logged');
  assert.equal(closed.view, 'eyes');
  assert.equal(closed.why, 'the watcher left');

  // a stop says where it came from (it is not a live view stopping)
  await fetch(`${url}/api/${s.token}/stop`, { method: 'POST' });
  assert.deepEqual(log.tail(50).filter((r) => r.kind === 'viewer_stop').map((r) => [r.reason, r.wasRunning]), [['stopped through the API', false]]);

  await fetch(`${url}/api/${s.token}`, { method: 'DELETE' });
  assert.equal(await next(), null, 'the stream ends with the session');
});

/** A stand-in THREE with the parts the script uses, and a page clock. */
function fakeThree() {
  class Euler {
    constructor() { this.x = 0; this.y = 0; this.z = 0; this.order = 'XYZ'; }
    set(x, y, z, order) { Object.assign(this, { x, y, z, order: order ?? this.order }); return this; }
  }
  class Vec { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { Object.assign(this, { x, y, z }); return this; } }
  class Object3D {
    constructor() { this.rotation = new Euler(); this.position = new Vec(); this.children = []; this.visible = true; this.updates = 0; }
    add(o) { this.children.push(o); }
    updateMatrixWorld() { this.updates += 1; }
  }
  class Camera extends Object3D {
    constructor() { super(); this.isCamera = true; }
    updateMatrixWorld(force) { super.updateMatrixWorld(force); }
  }
  class PerspectiveCamera extends Camera { constructor() { super(); this.isPerspectiveCamera = true; } }
  class Scene extends Object3D {}
  class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; } }
  return {
    Euler, Object3D, Camera, PerspectiveCamera, Scene, Mesh,
    BoxGeometry: class { constructor(...a) { this.size = a; } },
    MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); } },
    TextureLoader: class { load(src) { return { src }; } },
    NearestFilter: 1003,
    MultiplyBlending: 4,
  };
}

test('fx script: a snapped look is turned to smoothly, under the turn cap; the crack follows the dig, stage by stage', () => {
  const THREE = fakeThree();
  let now = 1000;
  let source = null;
  const window = {
    THREE,
    __museFx: { textures: 'textures/1.21.4/blocks/', events: 'muse-fx/events' },
    EventSource: class { constructor(u) { this.url = u; this.readyState = 1; source = this; } },
  };
  window.window = window;
  const context = vm.createContext({ window, document: { addEventListener() {} }, performance: { now: () => now }, Math, Number, JSON });
  vm.runInContext(fs.readFileSync(new URL('../src/live-view-fx.js', import.meta.url), 'utf8'), context);
  assert.equal(source.url, 'muse-fx/events');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const frame = (ms) => { now += ms; scene.updateMatrixWorld(); camera.updateMatrixWorld(); };
  camera.rotation.set(0, 0, 0, 'ZYX'); // before the first frame: the viewer's own set goes through
  frame(16);
  assert.equal(camera.updates, 1, 'the real updateMatrixWorld still runs');

  // the bot snaps its head half a turn round and down
  camera.rotation.set(-0.8, Math.PI, 0, 'ZYX');
  assert.equal(camera.rotation.y, 0, 'not applied at once');
  const yaws = [];
  for (let i = 0; i < 90; i++) { frame(16); yaws.push(camera.rotation.y); }
  const steps = yaws.map((y, i) => Math.abs(y - (i ? yaws[i - 1] : 0)));
  const cap = ((360 * Math.PI) / 180) * 0.016 + 1e-9;
  assert.ok(steps.every((d) => d <= cap), `at most 360 deg/s (largest step ${Math.max(...steps)})`);
  assert.ok(Math.abs(Math.abs(yaws.at(-1)) - Math.PI) < 0.01, `arrives (${yaws.at(-1)})`);
  assert.ok(Math.abs(camera.rotation.x + 0.8) < 0.01, 'pitch too');
  const reached = yaws.findIndex((y) => Math.abs(Math.abs(y) - Math.PI) < 0.05);
  assert.ok(reached * 16 < 700, `half a turn in under 0.7 s (${reached * 16} ms)`);
  // other Euler sets (entities, the third-person camera) are left alone
  const e = new THREE.Euler().set(1, 2, 3, 'ZYX');
  assert.deepEqual([e.x, e.y, e.z], [1, 2, 3]);

  // the crack: a 1 s dig at 4 64 -2
  source.onmessage({ data: JSON.stringify({ x: 4, y: 64, z: -2, ms: 1000, elapsed: 0 }) });
  frame(16);
  const mesh = scene.children.find((c) => c.name === 'muse-crack');
  assert.ok(mesh && mesh.visible);
  assert.deepEqual([mesh.position.x, mesh.position.y, mesh.position.z], [4.5, 64.5, -1.5]);
  assert.equal(mesh.material.map.src, 'textures/1.21.4/blocks/destroy_stage_0.png');
  assert.equal(mesh.material.blending, THREE.MultiplyBlending);
  frame(500);
  assert.equal(mesh.material.map.src, 'textures/1.21.4/blocks/destroy_stage_5.png');
  frame(800);
  assert.equal(mesh.material.map.src, 'textures/1.21.4/blocks/destroy_stage_9.png', 'held at the last stage');
  source.onmessage({ data: 'null' });
  frame(16);
  assert.equal(mesh.visible, false);
  // a watcher who arrives mid-dig sees the stage it has reached
  source.onmessage({ data: JSON.stringify({ x: 0, y: 63, z: 0, ms: 2000, elapsed: 1500 }) });
  frame(16);
  assert.equal(mesh.material.map.src, 'textures/1.21.4/blocks/destroy_stage_7.png');

  // a dropped item the viewer has no model for (a magenta box) is hidden; other meshes are not
  const box = new THREE.Mesh(null, { color: { getHex: () => 0xff00ff } });
  const cow = new THREE.Mesh(null, { color: { getHex: () => 0x8b4513 } });
  scene.add(box);
  scene.add(cow);
  for (let i = 0; i < 10; i++) frame(16);
  assert.equal(box.visible, false);
  assert.equal(cow.visible, true);
});
