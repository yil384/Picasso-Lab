// test/g0a414c.test.js - what production game g0a414c (2026-10-13) showed: 11 obsidian, then nine minutes on a 12th,
// collect obsidian "pending, 0 of 1" for about 100 s a call ("5 routes in a row stopped without breaking or gaining
// anything"), formed obsidian beside the bot. Now: obsidian formed next to the bot is mined at its own cells first; a
// search that brings none in for 75 s is stopped and says why with what else to do; a frame needs 10 obsidian (its top
// corners may be cobblestone); the stuck detector puts a "stuck" item first in the Body advice by the third call that
// does not move, and the time left against the goal once; stop with nothing running answers without a code; and the
// session's end in the log has who acted by rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS, toTheirs } from '../src/mineai/skills.js';
import { createWeb } from '../src/web.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const text = (r) => r.content.map((x) => x.text).join('\n');

/** The pit where g0a414c's 12th obsidian would not come: a still pool beside, formed obsidian under water near. */
function pit(w, { obsidianAt = 3 } = {}) {
  const p = { x: Math.floor(w.position.x), y: Math.floor(w.position.y), z: Math.floor(w.position.z) };
  w.blocks = [
    { name: 'lava', found: 9, listed: [{ x: p.x + 4, y: p.y - 1, z: p.z, level: 0 }] },
    { name: 'obsidian', found: 1, listed: [{ x: p.x + obsidianAt, y: p.y - 1, z: p.z + 1 }] },
  ];
  // water over the formed obsidian (the water poured did not all go back into the bucket)
  w.boxAt = (x, y, z) => (x === p.x + obsidianAt && y === p.y && z === p.z + 1 ? 'water' : 'air');
  return p;
}

test('g0a414c: a frame needs 10 obsidian: with 10 or 11 and cobblestone, its top corners are cobblestone; with 12, obsidian', () => {
  const ctx = (inventory) => ({ position: { x: 0.5, y: 64, z: 0.5 }, heading: 0, inventory });
  const ten = toTheirs('build', { blueprint: 'nether_portal', material: 'obsidian' }, ctx({ obsidian: 10, cobblestone: 4 }));
  assert.equal(ten.calls[0].args.blocks.filter((c) => c.block_name === 'obsidian').length, 10);
  assert.equal(ten.calls[0].args.blocks.filter((c) => c.block_name === 'cobblestone').length, 2);
  assert.match(ten.note, /its top corners are cobblestone \(a frame needs 10 obsidian\)$/);
  const eleven = toTheirs('build', { blueprint: 'nether_portal', material: 'obsidian' }, ctx({ obsidian: 11, dirt: 1 }));
  assert.equal(eleven.calls[0].args.blocks.filter((c) => c.block_name === 'obsidian').length, 11);
  assert.equal(eleven.calls[0].args.blocks.filter((c) => c.block_name === 'dirt').length, 1);
  const twelve = toTheirs('build', { blueprint: 'nether_portal', material: 'obsidian' }, ctx({ obsidian: 12, cobblestone: 4 }));
  assert.equal(twelve.calls[0].args.blocks.filter((c) => c.block_name === 'obsidian').length, 12);
  assert.doesNotMatch(twelve.note, /corners/);
});

test('g0a414c: obsidian formed beside the bot is mined at its own cells first; a search that brings none in is stopped and says why', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g0a414c-')), MC_PORT: '25941' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 11, water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1 } }));
  const body = createMineAiBody({ config, log, hosts, gameId: 'gobs', username: 'Tst_rv_gobs', careTickMs: 30, careIdleMs: 50, obsidianStallMs: 400 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  try {
    fake.world.position = { x: -397.5, y: -53, z: 61.5 };
    const p = pit(fake.world);
    await body.refresh();
    let r = await body.run('collect', { block: 'obsidian', n: 1 });
    assert.equal(r.ok, true, r.result);
    const exact = fake.tools('collect_block').at(-1).args;
    assert.deepEqual({ x: exact.x, y: exact.y, z: exact.z, block_name: exact.block_name }, { x: p.x + 3, y: p.y - 1, z: p.z + 1, block_name: 'obsidian' }, 'the formed block at its cell');
    assert.equal(fake.tools('collect_block').filter((c) => c.args.x === undefined).length, 0, 'no search');
    // none formed within reach, and a search that brings nothing in: stopped within the stall time, why and what instead
    pit(fake.world, { obsidianAt: 8 });
    fake.world.durations = { ...(fake.world.durations ?? {}), collect_block: 5_000 };
    fake.world.progressFor = { collect_block: { requested: 3, gained: 0 } };
    const t0 = Date.now();
    r = await body.run('collect', { block: 'obsidian', n: 3 });
    assert.ok(Date.now() - t0 < 4_000, 'fails fast, not after the step\'s whole time');
    assert.equal(r.ok, false);
    assert.equal(r.code, 'FAILED');
    assert.match(r.result, /^no obsidian came in: the nearest formed obsidian is at -390 -54 62, \d+ blocks away, under or beside water \(the water poured did not all go back into the bucket\); the still lava pool at -394 -54 61, \d+ blocks away \(1 source: 1 obsidian at most\) is here, but no obsidian came from it \(their pour could not reach it from where it stood\)\. Instead: scoop the water: bucket fill water at -390 -53 62, then collect obsidian again; or stand right beside it: go_to -?\d+ -54 -?\d+, then collect obsidian 1; or build nether_portal now: 12 obsidian is enough/);
  } finally {
    await body.close?.();
    await hosts.closeAll();
  }
});

test('g0a414c over /mcp: the stuck advice fires by the third obsidian call that does not move, and goes once it moves; stop with nothing running has no code; the end has who acted by rule', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g0a414c-m-')), MC_PORT: '25942' });
  const log = createLogger({ dir: null, config, keep: 2000 });
  const hosts = fakeHosts(() => ({ inventory: { obsidian: 11, water_bucket: 1, cobblestone: 20, diamond_pickaxe: 1, flint_and_steel: 1 } }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '600000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_rv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50, obsidianStallMs: 300 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    await c.callTool({ name: 'start_game', arguments: { goal: 'nether_and_back', rules: { defend: true, escape: true, eat_below: 6 } } });
    const fake = hosts.started[0].fake;
    fake.world.position = { x: -405.5, y: -52, z: 62.5 };
    pit(fake.world, { obsidianAt: 9 });
    // their collect fails as in production: routes that stop without breaking anything
    fake.world.fail.collect_block = 'Collection stopped: 5 routes in a row stopped without breaking or gaining anything; the last: the walk there got stuck. Broke 0 matching blocks; inventory gained 0/3 requested items.';
    const why = { why: 'Mining the last obsidian for the frame.', plan: 'Obsidian, then the frame.' };
    const calls = [
      ['play_sequence', { steps: [{ skill: 'go_to', args: { x: -398, y: -54, z: 61 } }, { skill: 'collect', args: { block: 'obsidian', n: 3 } }], ...why }],
      ['play', { skill: 'collect', args: { block: 'obsidian', n: 3 }, ...why }],
      ['play', { skill: 'collect', args: { block: 'obsidian', n: 1 }, ...why }],
    ];
    const advice = [];
    for (const [name, args] of calls) {
      const r = await c.callTool({ name, arguments: args });
      advice.push(r.structuredContent.advice ?? []);
    }
    assert.equal(advice[0][0]?.kind === 'stuck', false);
    assert.equal(advice[1][0]?.kind === 'stuck', false);
    const stuck = advice[2][0];
    assert.equal(stuck?.kind, 'stuck', 'by the third call');
    assert.match(stuck.text, /^stuck: collecting obsidian \(obsidian 11, none more for 3 calls \/ \d+ min\); no obsidian came in: the nearest formed obsidian is at -397 -53 63, \d+ blocks away, under or beside water [^.]*\. Try: scoop the water: bucket fill water at -397 -52 63/);
    assert.ok(MINEAI_SKILLS.validate(stuck.hint.skill, stuck.hint.args).ok, JSON.stringify(stuck.hint));
    // on every reply until it moves (get_state too), first in the text's Body advice
    const st = await c.callTool({ name: 'get_state', arguments: {} });
    assert.equal(st.structuredContent.advice[0].kind, 'stuck');
    assert.match(text(st), /Body advice \(the body will not do these by itself; your call\):\n- stuck: collecting obsidian/);
    // stop with nothing running: no code (not an earlier step's FAILED)
    const stop = await c.callTool({ name: 'stop', arguments: {} });
    assert.equal(stop.structuredContent.code, null);
    assert.match(text(stop), /^Nothing was running/m);
    // it moves: an obsidian comes in, and the stuck item goes
    delete fake.world.fail.collect_block;
    await c.callTool({ name: 'play', arguments: { skill: 'collect', args: { block: 'obsidian', n: 1 }, ...why } });
    const after = await c.callTool({ name: 'get_state', arguments: {} });
    assert.equal((after.structuredContent.advice ?? []).some((a) => a.kind === 'stuck'), false);
    await c.callTool({ name: 'end_game', arguments: {} });
    const end = log.tail(2000).find((x) => x.kind === 'session_end');
    assert.deepEqual(Object.keys(end.attribution).sort(), ['byRule', 'body', 'care', 'decidedPct', 'muse', 'musePct', 'reflex', 'rule', 'rules', 'set'].sort());
    assert.equal(end.attribution.rules.defend, true);
    assert.equal(end.attribution.set.defend.via, 'start_game');
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});

test('g0a414c over /mcp: under 8 minutes left with the goal far: said once', async () => {
  const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'g0a414c-t-')), MC_PORT: '25943' });
  const log = createLogger({ dir: null, config, keep: 500 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '400000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_rv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  try {
    await c.callTool({ name: 'start_game', arguments: { goal: 'nether_and_back' } });
    const first = await c.callTool({ name: 'get_state', arguments: {} });
    const time = (first.structuredContent.advice ?? []).find((a) => a.kind === 'time');
    assert.ok(time, 'a lease under 8 minutes: told');
    assert.match(time.text, /^\d+ min left in this game; the goal still needs: wooden pickaxe, stone pickaxe, iron, /);
    const second = await c.callTool({ name: 'get_state', arguments: {} });
    assert.equal((second.structuredContent.advice ?? []).some((a) => a.kind === 'time'), false, 'once');
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
});
