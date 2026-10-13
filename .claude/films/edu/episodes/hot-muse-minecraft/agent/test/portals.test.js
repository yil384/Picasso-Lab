// test/portals.test.js - what production games g809e1b and g4ac86b (2026-10-13) showed about portals: collect obsidian
// was refused near "a lit portal" that was a leftover of our own earlier games (g0793f1's frame, and the portal every
// Nether trip comes back to); the Nether side led back to that older portal, far from the frame the bot built. Ended
// games' unlit frames are released (collect obsidian runs near them) and the registries are kept on disk across a
// restart; a lit portal's frame is never taken (runtime patch 0014), and the reply says so; and coming back far from its
// own frame says so. (Clearing a frame's site before building: test/nether.test.js.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const lit = (x, y, z) => ({ name: 'nether_portal', found: 6, listed: [{ x, y, z }] });
const pool = (x, y, z) => ({ name: 'lava', found: 1, listed: [{ x, y, z, level: 0 }] });

async function bodyAt(config, log, hosts, gameId, inventory, at) {
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_pt_${gameId}`, careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started.find((h) => h.username === `Tst_pt_${gameId}`));
  const fake = hosts.started.find((h) => h.username === `Tst_pt_${gameId}`).fake;
  await body.ready;
  for (const [k, n] of Object.entries(inventory)) fake.world.inventory.set(k, n);
  fake.world.position = { x: at.x + 0.5, y: 64, z: at.z + 0.5 };
  await body.refresh();
  return { body, fake };
}

test('portals: an ended game\'s frame and return portal are released; one a live game uses is named, with where to go', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'portals-')), MC_PORT: '25911' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const a = await bodyAt(config, log, hosts, 'gpa', { obsidian: 14, flint_and_steel: 1 }, { x: 400, z: 400 });
  const b = await bodyAt(config, log, hosts, 'gpb', { water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1 }, { x: 430, z: 400 });
  try {
    // a builds and lights a frame, goes to the Nether and back; it comes out where it went in
    let r = await a.body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.equal((await a.body.run('portal', { action: 'light' })).ok, true);
    assert.equal((await a.body.run('portal', { action: 'enter' })).ok, true);
    await sleep(300);
    r = await a.body.run('portal', { action: 'enter' });
    assert.equal(r.ok, true, r.result);
    assert.doesNotMatch(r.result, /your own portal is at/, 'back at its own portal');
    const back = a.fake.world.position;
    // b, near a's lit portal while a plays: refused, the portal named, and where to go
    b.fake.world.blocks = [pool(432, 63, 400), lit(Math.floor(back.x), Math.floor(back.y), Math.floor(back.z))];
    await b.body.rescan();
    r = await b.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.ok, false);
    assert.match(r.result, /^another player's obsidian \(a portal frame\) is at .* within 160 blocks/, 'a\'s frame, while a plays');
    // a ends: its frame and the portal it came back to are released; b's collect runs
    await a.body.close?.();
    a.body.end?.('test over');
    r = await b.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /its frame was left alone, the obsidian comes from lava or other obsidian/, 'the lit frame spared (runtime patch 0014)');
  } finally {
    await b.body.close?.();
    await hosts.closeAll();
  }
});

test('portals: a lit portal of unknown origin: its frame is left alone (runtime patch 0014), the collect runs, the reply says so', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'portals-u-')), MC_PORT: '25912' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const b = await bodyAt(config, log, hosts, 'gpu', { water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1 }, { x: 140, z: 311 });
  try {
    // g4ac86b: at 140 96 311, a lit portal loaded at 49 93 161
    b.fake.world.blocks = [pool(142, 63, 311), lit(49, 93, 161)];
    await b.body.rescan();
    const r = await b.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /\(a lit portal at 49 93 161 \(176 blocks away\) is loaded: its frame was left alone, the obsidian comes from lava or other obsidian\)$/);
    assert.ok(log.tail(500).some((x) => x.kind === 'portal_spared'));
  } finally {
    await b.body.close?.();
    await hosts.closeAll();
  }
});

test('portals: the registries outlive a restart (MINEAI_DATA_DIR/portals.json): a frame of a game from before is released', async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'portals-data-'));
  const server = '127.0.0.1:25913';
  // what a process before the restart wrote: g0793f1's frame near 270 88 66 (g809e1b's refusal: "a lit portal ... at 272 88 67")
  fs.writeFileSync(path.join(data, 'portals.json'), JSON.stringify({ [server]: { frames: [['overworld:270,88,66', 'g0793f1'], ['overworld:271,88,66', 'g0793f1']], returns: [['overworld:49,93,161', ['ga13a88']]] } }));
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'portals-r-')), MC_HOST: '127.0.0.1', MC_PORT: '25913', MINEAI_DATA_DIR: data });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const b = await bodyAt(config, log, hosts, 'gpr', { water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1 }, { x: 300, z: 100 });
  try {
    b.fake.world.blocks = [pool(302, 63, 100), lit(272, 88, 67)];
    await b.body.rescan();
    const r = await b.body.run('collect', { block: 'obsidian', n: 4 });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /a lit portal at 272 88 67 \(\d+ blocks away\) is loaded: its frame was left alone/);
    // and the file keeps what this process learns
    b.fake.world.inventory.set('obsidian', 14);
    assert.equal((await b.body.run('build', { blueprint: 'nether_portal', material: 'obsidian' })).ok, true);
    const saved = JSON.parse(fs.readFileSync(path.join(data, 'portals.json'), 'utf8'))[server];
    assert.ok(saved.frames.some(([, g]) => g === 'gpr'));
    assert.ok(saved.frames.some(([, g]) => g === 'g0793f1'), 'the old entries kept');
  } finally {
    await b.body.close?.();
    await hosts.closeAll();
  }
});

test('portals: back in the Overworld far from its own frame (the Nether side led to an older portal), the reply says so', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'portals-b-')), MC_PORT: '25914' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const a = await bodyAt(config, log, hosts, 'gpo', { obsidian: 14, flint_and_steel: 1 }, { x: 213, z: 117 });
  try {
    assert.equal((await a.body.run('build', { blueprint: 'nether_portal', material: 'obsidian' })).ok, true);
    assert.equal((await a.body.run('portal', { action: 'light' })).ok, true);
    a.fake.world.netherAt = { x: 12.5, y: 58, z: 18.5 };
    assert.equal((await a.body.run('portal', { action: 'enter' })).ok, true);
    a.fake.world.overworldAt = { x: 49.5, y: 93, z: 161.5 }; // g4ac86b came out there
    await sleep(300);
    const r = await a.body.run('portal', { action: 'enter' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /; your own portal is at -?\d+ \d+ -?\d+, 1[5-7]\d blocks away \(the Nether side led to an older portal, as the game links each Nether portal to the nearest one\)$/);
  } finally {
    await a.body.close?.();
    await hosts.closeAll();
  }
});
