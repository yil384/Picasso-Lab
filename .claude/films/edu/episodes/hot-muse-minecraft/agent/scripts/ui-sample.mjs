#!/usr/bin/env node
// scripts/ui-sample.mjs - a sample of the live video in the UI layout (STREAM_LAYOUT=ui), made on this machine: a
// recorded clip stands in for the camera's X display, and a scripted Muse session (start_game, a portal, the Nether,
// results, advice, a reflex, a milestone) goes through the real formatter (src/terminal.js) to the camera stream's UI
// panel (src/ui-panel.js), exactly as the agent's replies would; the sound is the music bed over silence (no client
// here, so no game sound). No Minecraft, no Facebook.
//
//   node scripts/ui-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 30] [--size 1080x1080] [--music off]
//        [--story portal|shelter] [--pulse] [--tone]   (in the camera image: its own PulseAudio sink as the game's sound, as the rig makes it;
//                             --tone plays short beeps into it, standing in for the game's sound effects)

import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { createCameraStream, pulseScript, pulsePaths, PULSE_SOURCE } from '../src/camera.js';
import { createTermFeed } from '../src/terminal.js';

const { values: v } = parseArgs({ options: {
  clip: { type: 'string' }, out: { type: 'string' }, seconds: { type: 'string' }, size: { type: 'string' }, music: { type: 'string' },
  pulse: { type: 'boolean' }, tone: { type: 'boolean' }, story: { type: 'string' },
} });
if (!v.clip || !v.out) { console.error('usage: node scripts/ui-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 30] [--size 1080x1080] [--music off]'); process.exit(2); }
const seconds = Number(v.seconds ?? 20);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a camera rig that is always in the world (no sound server here)
const em = new EventEmitter();
const rig = {
  state: 'ready', name: 'MuseCam', options: { display: 4242, width: 960, height: 540, followMs: 60_000 },
  start() {}, waitReady: async () => true, follow: async () => true, keepFollowing: async () => true, park: async () => {},
  stats: async () => ({ state: 'ready' }), on: (e, fn) => { em.on(e, fn); return () => em.off(e, fn); },
};
// the game's sound as the camera rig records it: a PulseAudio server of our own with one null sink
const kids = [];
if (v.pulse) {
  const p = pulsePaths(fs.mkdtempSync('/tmp/muse-sample-'));
  fs.mkdirSync(p.runtime, { recursive: true, mode: 0o700 });
  fs.writeFileSync(p.script, pulseScript(p.socket));
  kids.push(spawn('pulseaudio', ['-n', `--file=${p.script}`, '--daemonize=no', '--exit-idle-time=-1', '--use-pid-file=no', '--realtime=no', '--high-priority=no', '--disable-shm=yes', '--log-target=stderr', '--log-level=error'], { env: { ...process.env, XDG_RUNTIME_DIR: p.runtime, PULSE_RUNTIME_PATH: p.runtime }, stdio: ['ignore', 'ignore', 'inherit'] }));
  for (let i = 0; i < 50 && !fs.existsSync(p.socket); i++) await sleep(100);
  rig.sound = { server: `unix:${p.socket}`, source: PULSE_SOURCE };
  if (v.tone) { // a beep of 0.3 s every 2 s into the sink
    kids.push(spawn('ffmpeg', ['-v', 'error', '-re', '-f', 'lavfi', '-i', 'sine=f=660:sample_rate=48000:duration=0.3,volume=4,apad=whole_dur=2,aloop=loop=-1:size=96000', '-ac', '2', '-f', 'pulse', 'tone'], { env: { ...process.env, PULSE_SERVER: rig.sound.server }, stdio: ['ignore', 'ignore', 'inherit'] }));
  }
}
const stream = createCameraStream({
  rig, player: 'Muse_sample1', output: v.out, fileSource: v.clip, settleMs: 10, layout: 'ui', uiSize: v.size ?? '1080x1080',
  music: v.music !== 'off', shmDir: '/tmp',
  event: (k, d) => { if (/error|failed|exit/.test(k)) console.error(k, JSON.stringify(d)); },
});

// the game as the MCP layer sees it, and the feed that turns calls and replies into the panel's updates
let dim = 'overworld';
let att = { muse: 0, reflex: 0, musePct: null };
// the body as the agent reads it between calls: the last state, its clock running at 20 ticks a second
let cur = { health: 20, food: 20, time: 2_250, at: Date.now() };
const game = { id: 'g7a1c2e', body: { attribution: () => att, snapshot: () => ({ dimension: dim, health: cur.health, food: cur.food, timeOfDay: Math.floor(cur.time + (Date.now() - cur.at) / 50) }) } };
// the MCP layer's side of the status line: what runs, when Muse last called and with what
let q = { busy: false, running: null, lastCallAt: Date.now(), lastTool: 'start_game' };
const feed = createTermFeed({ send: (id, u) => stream.term(u), liveOf: () => q });
const call = (tool, args) => { q = { busy: tool === 'play' || tool === 'play_sequence', running: tool === 'play' ? args : args?.steps?.[0] ?? null, lastCallAt: Date.now(), lastTool: tool }; feed.call(game, tool, args); };
const done = () => { q = { ...q, busy: false, running: null }; };
const state = (health, food, time) => { cur = { health, food, time, at: Date.now() }; return { health, food, time, pos: { x: 12, y: 70, z: -40 } }; };
const step = (call, n, skill, args, status, result, ms, gained) => ({ call, n, step: n, skill, args, status, result, ms, ...(gained ? { gained } : {}) });
const reply = (structured) => ({ content: [{ type: 'text', text: '' }], structuredContent: structured });
const nether = (pos) => ({ kind: 'nether', text: `in the Nether: beds explode here and water boils away; the portal back is at ${pos} (portal enter with that pos)` });

const stories = {
  // daylight, a portal: an action, waiting for Muse, the portal, the Nether, Muse looking
  portal: [
    [0.3, () => feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 20, 2_250) }))],
    [0.9, () => { call('play', { skill: 'collect', args: { block: 'oak_log', n: 2 } }); att = { muse: 1, reflex: 0, musePct: 100 }; }],
    [3.6, () => { done(); feed.reply(game, 'play', {}, reply({ steps: [step(1, 1, 'collect', { block: 'oak_log', n: 2 }, 'confirmed', 'mined 2 oak_log', 2_600)], state: state(20, 20, 2_300) })); }],
    [8.5, () => { call('play', { skill: 'portal', args: { action: 'enter', pos: { x: -3, y: 75, z: -197 } } }); att = { muse: 2, reflex: 0, musePct: 100 }; }],
    [15.0, () => {
      dim = 'the_nether';
      done();
      feed.reply(game, 'play', {}, reply({ steps: [step(2, 1, 'portal', { action: 'enter' }, 'confirmed', 'went through the portal at 1 68 -25', 5_100)], state: state(20, 20, 2_400), advice: [nether('1 68 -25')] }));
    }],
    [18.4, () => { att = { muse: 2, reflex: 1, musePct: 67 }; call('get_state', {}); feed.reply(game, 'get_state', {}, reply({ steps: [], state: state(17, 19, 2_480), onItsOwn: [{ seq: 1, agoS: 1, source: 'reflex', kind: 'defend', ok: true, text: 'fought a piglin, then back to waiting' }] })); }],
  ],
  // night: a shelter, then sheltering until morning
  shelter: [
    [0.3, () => feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 18, 13_420) }))],
    [0.8, () => { call('play', { skill: 'shelter', args: {} }); att = { muse: 1, reflex: 0, musePct: 100 }; }],
    [2.6, () => { done(); feed.reply(game, 'play', {}, reply({ steps: [step(1, 1, 'shelter', {}, 'confirmed', 'built a shelter of 13 dirt around you', 1_800)], state: state(20, 18, 13_460) })); }],
  ],
};
const script = stories[v.story ?? 'portal'];

const keepAlive = setInterval(() => {}, 1_000); // the stream's own timers do not hold the process open
const ticker = setInterval(() => feed.tick(game), 5_000); // the agent sends the status every 5 s between calls
await stream.start();
const t0 = Date.now();
for (const [at, fn] of script) {
  if (at > seconds) break;
  const wait = t0 + at * 1000 - Date.now();
  if (wait > 0) await sleep(wait);
  fn();
}
const left = t0 + seconds * 1000 - Date.now();
if (left > 0) await sleep(left);
await stream.stop('sample done');
clearInterval(keepAlive);
clearInterval(ticker);
for (const k of kids) k.kill('SIGTERM');
console.log(`wrote ${v.out}`);
