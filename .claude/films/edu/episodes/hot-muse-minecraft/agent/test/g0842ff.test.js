// test/g0842ff.test.js - what production game g0842ff (2026-10-14, the whole way in 20:19) still showed: the first
// frame stopped on birch leaves ("could not clear the cell at -181 106 214 (birch_leaves) ... Broke 1 matching block;
// inventory gained 0/1": leaves drop nothing most of the time); the stuck item fired for walks that were long past
// (two walks into a cavern at 7 min, "stuck" from 11 to 19 min) and for a 3-minute climb that was on its way and got
// there; and a walk straight down into a big cavern said only "no ground within 64 blocks below it".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS, blueprintCells } from '../src/mineai/skills.js';
import { createWeb } from '../src/web.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g0842ff-')), MC_PORT: '25944' });
const log = createLogger({ dir: null, config, keep: 500 });

async function bodyOf(gameId, inventory) {
  const hosts = fakeHosts(() => ({ inventory }));
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_rv_${gameId}`, careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  return { body, fake, hosts };
}

test('g0842ff: a frame site in birch leaves: a leaf that breaks and drops nothing is cleared, and the frame goes up', async () => {
  const { body, fake, hosts } = await bodyOf('g0842a', { obsidian: 14, diamond_pickaxe: 1 });
  try {
    fake.world.position = { x: -181.5, y: 107, z: 215.5 }; // walked to -182 107 215, facing east
    fake.world.heading = 90;
    await body.refresh();
    const feet = { x: -182, y: 107, z: 215 };
    fake.world.grid = new Map();
    // grass under, a birch's leaves in front at head height and above
    fake.world.boxAt = (x, y, z) => (y < feet.y ? 'grass_block' : x > feet.x && y >= feet.y + 1 ? 'birch_leaves' : 'air');
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /\(built facing east; cleared \d+ cells of (grass_block and birch_leaves|birch_leaves and grass_block) for it first\)$/);
    const cells = blueprintCells('nether_portal', 'obsidian', feet, 90).cells;
    assert.equal(cells.filter((c) => c.block_name === 'obsidian' && fake.world.grid.get(`${c.x},${c.y},${c.z}`) === 'obsidian').length, 12, 'the frame complete');
    assert.equal(fake.world.inventory.get('obsidian'), 2);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g0842ff: a walk straight down into a cavern says where to stand there, or that it is open as far as can be seen', async () => {
  const { body, fake, hosts } = await bodyOf('g0842b', { iron_pickaxe: 1 });
  try {
    fake.world.position = { x: -227.5, y: 90, z: 191.5 };
    await body.refresh();
    // their refusal of a point in the air of a cavern; its floor at y -12, 4 blocks east of the point
    fake.world.navigateFail = () => true;
    fake.calls.length = 0;
    const theirs = (a) => `[NAVIGATION_NO_FOOTING] No usable footing was observed within 2 blocks of ${a.x}, ${a.y}, ${a.z}. No ground was found within 64 blocks below it.`;
    fake.world.fail.navigate = { error: theirs({ x: -228, y: -8, z: 191 }) };
    fake.world.boxAt = (x, y, z) => (x === -224 && y <= -12 ? 'deepslate' : 'air');
    let r = await body.run('go_to', { x: -228, y: -8, z: 191 });
    assert.equal(r.ok, false);
    assert.match(r.result, /nothing to stand on at -228 -8 191, and no ground within 64 blocks below it \(open air or a deep drop\): pick a point just above the ground.*; the nearest place to stand near there: go_to -224 -11 191(; you are now at -?\d+ -?\d+ -?\d+)?$/, r.result);
    // nothing to stand on in sight either
    fake.world.boxAt = () => 'air';
    r = await body.run('go_to', { x: -228, y: -8, z: 191 });
    assert.match(r.result, /; around there is open air or liquid as far as can be seen: aim at a cave floor you can see, or let collect walk to its target/);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('g0842ff over /mcp: no stuck for a walk that gets closer, one still on its way, or walks long past; still stuck for walks that do not move', async () => {
  let clock = Date.now();
  const lcfg = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g0842ff-m-')), MC_PORT: '25945' });
  const mlog = createLogger({ dir: null, config: lcfg, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '' }), log: mlog, skills: MINEAI_SKILLS, now: () => clock, mcpCallMs: 1_500,
    makeBody: (gid, o) => createMineAiBody({ config: lcfg, log: mlog, hosts, gameId: gid, username: `Tst_rv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const why = { why: 'Climbing out of the cave.', plan: 'Up, then the frame.' };
  const go = async (x, y, z) => (await c.callTool({ name: 'play', arguments: { skill: 'go_to', args: { x, y, z }, ...why } })).structuredContent;
  const stuckIn = (sc, to = '') => (sc.advice ?? []).some((a) => a.kind === 'stuck' && a.text.includes(to));
  try {
    await c.callTool({ name: 'start_game', arguments: { goal: 'nether_and_back', rules: { defend: true, escape: true } } });
    const fake = hosts.started[0].fake;
    fake.world.position = { x: -182.5, y: -30, z: 215.5 };
    // the climb that stops on the way each time, 40 blocks higher: progress, never stuck
    fake.world.navigateFail = () => { fake.world.position = { ...fake.world.position, y: fake.world.position.y + 40 }; return true; };
    for (let k = 0; k < 3; k++) assert.equal(stuckIn(await go(-182, 108, 215)), false, `climb ${k + 1}: closer each time`);
    // then it stops getting closer: stuck by the third walk that does not move
    fake.world.navigateFail = () => true;
    assert.equal(stuckIn(await go(-182, 108, 215)), false);
    const fifth = await go(-182, 108, 215);
    assert.equal(fifth.advice?.[0]?.kind, 'stuck', JSON.stringify(fifth.advice));
    assert.match(fifth.advice[0].text, /^stuck: walking to -182 108 215 \(no progress for 3 calls/);

    // a walk still on its way is no try: two walks that failed, then one that takes its time and gets there
    fake.world.position = { x: -100.5, y: 70, z: 100.5 };
    assert.equal(stuckIn(await go(-60, 70, 100), 'walking to -60 70 100'), false);
    assert.equal(stuckIn(await go(-60, 70, 100), 'walking to -60 70 100'), false);
    fake.world.navigateFail = null;
    fake.world.durations.navigate = 2_500;
    const slow = await go(-60, 70, 100);
    assert.equal(slow.steps[0].status, 'pending');
    assert.equal(stuckIn(slow, 'walking to -60 70 100'), false, 'on its way: not stuck');
    await sleep(1_500);
    const after = (await c.callTool({ name: 'get_state', arguments: {} })).structuredContent;
    assert.deepEqual(after.earlier?.map((x) => [x.skill, x.status]), [['go_to', 'confirmed']]);
    assert.equal(stuckIn(after, 'walking to -60 70 100'), false, 'it got there');
    delete fake.world.durations.navigate;

    // two walks that failed, then the game goes on elsewhere for 5 minutes: not stuck (Muse moved on)
    fake.world.navigateFail = () => true;
    await go(-228, -8, 191);
    await go(-230, -8, 188);
    fake.world.navigateFail = null;
    for (let k = 0; k < 5; k++) {
      clock += 60_000;
      const st = (await c.callTool({ name: 'get_state', arguments: {} })).structuredContent;
      assert.equal(stuckIn(st, 'walking to -230 -8 188'), false, `${k + 1} min later`);
    }
    // and the first walk's stuck item has gone with the minutes too (Muse moved on)
    clock += 60_000;
    assert.equal(stuckIn((await c.callTool({ name: 'get_state', arguments: {} })).structuredContent), false);
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});
