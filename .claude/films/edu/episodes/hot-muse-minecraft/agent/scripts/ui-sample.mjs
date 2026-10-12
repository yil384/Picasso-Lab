#!/usr/bin/env node
// scripts/ui-sample.mjs - a sample of the live video in the UI layout (STREAM_LAYOUT=ui), made on this machine: a
// recorded clip stands in for the camera's X display, and a scripted Muse session (start_game, a portal, the Nether,
// results, advice, a reflex, a milestone) goes through the real formatter (src/terminal.js) to the camera stream's UI
// panel (src/ui-panel.js), exactly as the agent's replies would; the sound is the music bed over silence (no client
// here, so no game sound). No Minecraft, no Facebook.
//
//   node scripts/ui-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 30] [--size 1080x1080] [--music off]
//        [--pulse] [--tone]   (in the camera image: its own PulseAudio sink as the game's sound, as the rig makes it;
//                             --tone plays short beeps into it, standing in for the game's sound effects)

import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { createCameraStream, pulseScript, pulsePaths, PULSE_SOURCE } from '../src/camera.js';
import { createTermFeed } from '../src/terminal.js';

const { values: v } = parseArgs({ options: {
  clip: { type: 'string' }, out: { type: 'string' }, seconds: { type: 'string' }, size: { type: 'string' }, music: { type: 'string' },
  pulse: { type: 'boolean' }, tone: { type: 'boolean' },
} });
if (!v.clip || !v.out) { console.error('usage: node scripts/ui-sample.mjs --clip game.mp4 --out sample.mp4 [--seconds 30] [--size 1080x1080] [--music off]'); process.exit(2); }
const seconds = Number(v.seconds ?? 30);
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
const game = { id: 'g7a1c2e', body: { attribution: () => att, snapshot: () => ({ dimension: dim }) } };
const feed = createTermFeed({ send: (id, u) => stream.term(u) });
const state = (health, food, time) => ({ health, food, time, pos: { x: 12, y: 70, z: -40 } });
const step = (call, n, skill, args, status, result, ms, gained) => ({ call, n, step: n, skill, args, status, result, ms, ...(gained ? { gained } : {}) });
const reply = (structured) => ({ content: [{ type: 'text', text: '' }], structuredContent: structured });
const nether = (pos) => ({ kind: 'nether', text: `in the Nether: beds explode here and water boils away; the portal back is at ${pos} (portal enter with that pos)` });

const script = [
  [0.3, () => feed.reply(game, 'start_game', { adult: true }, reply({ steps: [], state: state(20, 20, 2_250) }))],
  [2.0, () => { feed.call(game, 'play', { skill: 'portal', args: { action: 'enter', pos: { x: -3, y: 75, z: -197 } } }); att = { muse: 1, reflex: 0, musePct: 100 }; }],
  [4.5, () => { stream.caption('Muse: walking into the portal'); }],
  [9.5, () => { stream.caption('Muse: entering a portal'); }],
  [15.0, () => {
    dim = 'the_nether';
    feed.reply(game, 'play', {}, reply({
      steps: [step(1, 1, 'portal', { action: 'enter' }, 'confirmed', 'went through the portal at 1 68 -25', 5_100)],
      state: state(20, 20, 2_900), advice: [nether('1 68 -25')],
    }));
  }],
  [17.0, () => { feed.call(game, 'play', { skill: 'go_to', args: { x: 6, y: 67, z: -25 } }); att = { muse: 2, reflex: 0, musePct: 100 }; }],
  [17.4, () => { stream.caption('Muse: walking to 6 67 -25'); }],
  [19.0, () => feed.reply(game, 'play', {}, reply({ steps: [step(2, 1, 'go_to', { x: 6, y: 67, z: -25 }, 'confirmed', 'walked to 5 67 -25', 1_100)], state: state(20, 20, 3_050), advice: [nether('1 68 -25')] }))],
  [20.5, () => feed.call(game, 'get_state', {})],
  [20.8, () => {
    att = { muse: 2, reflex: 1, musePct: 67 };
    feed.reply(game, 'get_state', {}, reply({
      steps: [], state: state(17, 19, 3_200),
      advice: [nether('1 68 -25'), { kind: 'food', text: 'food 19 and no food carried; nothing to hunt in sight' }],
      onItsOwn: [{ seq: 1, agoS: 1, source: 'reflex', kind: 'defend', ok: true, text: 'defending itself (piglin), then back to walking' }],
    }));
  }],
  [23.0, () => { feed.call(game, 'play_sequence', { steps: [{ skill: 'go_to', args: { x: 1, y: 68, z: -17 } }, { skill: 'go_to', args: { x: 1, y: 68, z: -24 } }] }); att = { muse: 3, reflex: 1, musePct: 75 }; }],
  [23.3, () => { stream.caption('Muse: walking to 1 68 -17'); }],
  [25.5, () => feed.reply(game, 'play_sequence', {}, reply({
    steps: [
      step(3, 1, 'go_to', { x: 1, y: 68, z: -17 }, 'confirmed', 'walked to 1 67 -17', 1_400),
      step(3, 2, 'go_to', { x: 1, y: 68, z: -24 }, 'confirmed', 'walked to 1 68 -23', 1_600),
    ],
    state: state(17, 19, 3_400), advice: [nether('1 68 -25'), { kind: 'food', text: 'food 19 and no food carried; nothing to hunt in sight' }],
  }))],
  [27.0, () => { feed.call(game, 'play', { skill: 'portal', args: { action: 'enter' } }); att = { muse: 4, reflex: 1, musePct: 80 }; }],
  [27.4, () => { stream.caption('Muse: entering a portal'); }],
];

const keepAlive = setInterval(() => {}, 1_000); // the stream's own timers do not hold the process open
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
for (const k of kids) k.kill('SIGTERM');
console.log(`wrote ${v.out}`);
