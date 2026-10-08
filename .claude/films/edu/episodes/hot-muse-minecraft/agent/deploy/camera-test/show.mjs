// deploy/camera-test/show.mjs - the bot loop of a live camera test, on the TEST server only (inside the
// muse-camera-test agent container; fb-start.sh copies and starts it): one guest game whose Tst_cam_* bot keeps doing
// visible things (walk, chop, craft, mine, build) for SHOW_S seconds, then ends the game (the stream stops with it).
// Materials it cannot gather quickly are given through the test server's console only. Log: /tmp/show.log there.
import fs from 'node:fs';

const base = 'http://127.0.0.1:8787';
const SHOW_S = Number(process.env.SHOW_S || 1500);
const t0 = Date.now();
const deadline = t0 + SHOW_S * 1000;
const log = (...a) => fs.appendFileSync('/tmp/show.log', `[${((Date.now() - t0) / 1000).toFixed(0)}s ${new Date().toISOString()}] ${a.join(' ')}\n`);
const j = async (method, p, body) => {
  try {
    const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { error: e.message } }; }
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let tok = null;
let name = null;

async function newGame() {
  let s = await j('POST', '/api/session', { adult: true });
  while (s.status === 429 && Date.now() < deadline) { // one bot per address, a minute's wait after a game ends
    log('session 429, waiting');
    await pause(15_000);
    s = await j('POST', '/api/session', { adult: true });
  }
  tok = s.body.token;
  log('session', s.status, tok ? 'ok' : JSON.stringify(s.body).slice(0, 200));
  for (let i = 0; i < 60; i++) {
    const st = await j('GET', `/api/${tok}/state`);
    if (/position -?\d+/.test(String(st.body.state ?? ''))) break;
    await pause(2000);
  }
  name = null;
  for (let i = 0; i < 20 && !name; i++) {
    const list = await fetch('http://127.0.0.1:7862/streams').then((x) => x.json()).catch(() => null);
    const id = list?.streams?.[0]?.id;
    const info = id ? await fetch(`http://127.0.0.1:7862/streams/${id}`).then((x) => x.json()).catch(() => null) : null;
    if (/^Tst_cam_[A-Za-z0-9_]+$/.test(String(info?.player))) name = info.player;
    else await pause(1000);
  }
  log('bot', name);
}

function give(item, n) {
  if (!name) return;
  fs.appendFileSync('/console/console.in', `give ${name} ${item} ${n}\n`);
  log('gave', item, n);
}

async function state() { return String((await j('GET', `/api/${tok}/state`)).body.state ?? ''); }

/** One skill; waits for its end (or the deadline); returns the result text. */
async function run(tool, args) {
  if (Date.now() > deadline) return 'deadline';
  const r = await j('POST', `/api/${tok}/${tool}`, args);
  if (r.status === 410 || r.status === 404) { log(tool, 'game over:', r.status); await newGame(); return 'restarted'; }
  let result = String(r.body.result ?? r.body.error ?? r.body.message ?? '');
  if (r.status === 202) {
    for (let i = 0; i < 300 && Date.now() < deadline; i++) {
      await pause(1000);
      const q = await j('GET', `/api/${tok}/state`);
      if (q.status === 410 || q.status === 404) { log(tool, 'game over while running'); await newGame(); return 'restarted'; }
      if (!q.body.running) { result = String(q.body.last?.result ?? ''); break; }
    }
  }
  log(tool, JSON.stringify(args), '->', result.slice(0, 140));
  return result;
}

async function walk(dx, dz) {
  const m = (await state()).match(/position (-?\d+) (-?\d+) (-?\d+)/);
  if (m) await run('go_to', { x: Number(m[1]) + dx, y: Number(m[2]), z: Number(m[3]) + dz });
}

async function chop(n) {
  const kind = (await state()).match(/\b(\w+_log) \d/)?.[1] ?? 'oak_log';
  await run('collect', { block: kind, n });
  return kind;
}

await newGame();
let round = 0;
const dirs = [[18, 0], [0, 18], [-18, 0], [0, -18], [14, 14], [-14, 14], [-14, -14], [14, -14]];
while (Date.now() < deadline) {
  round += 1;
  log('round', round);
  const [dx, dz] = dirs[(round - 1) % dirs.length];
  await walk(dx, dz);
  const kind = await chop(4);
  const planks = kind.replace(/_log$/, '_planks');
  if (round === 1) {
    await run('craft', { item: planks, n: 12 });
    await run('craft', { item: 'stick', n: 4 });
    await run('craft', { item: 'crafting_table', n: 1 });
    await run('craft', { item: 'wooden_pickaxe', n: 1 });
  }
  await run('collect', { block: 'stone', n: 4 });
  if (round === 1) await run('craft', { item: 'stone_pickaxe', n: 1 });
  await walk(-dx / 3, -dz / 3); // back up to the surface, nearby
  const blueprint = ['hut_3x3', 'wall_5x2', 'platform_3x3'][(round - 1) % 3];
  give('cobblestone', 32);
  await run('build', { blueprint, material: 'cobblestone' });
  await run('collect', { block: 'dirt', n: 3 });
}
const e = await j('DELETE', `/api/${tok}`);
log('ended', e.status);
