// test/gd7540a.test.js - what production game gd7540a (2026-10-14) showed: three build nether_portal in a row, each
// in rock (the bot had walked into a mountain through a tunnel its walk dug), each stopped 3 to 5 s in with "could not
// clear the cell at 477 75 -7 (stone) where the portal frame goes: The requested cell at 477,75,-7 is air, not stone",
// no obsidian placed, and the game ran out with 14 obsidian carried. The world afterwards: the first cell of each
// site dug, the next one already clear (their drop recovery after the first dig went through it). Now a site cell that
// is already clear counts as cleared, another block fallen in is dug as that block, and the frame goes up.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMineAiBody } from '../src/mineai/body.js';
import { blueprintCells } from '../src/mineai/skills.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const until = async (fn, ms = 6000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(25); } return false; };
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'gd7540a-')), MC_PORT: '25942' });
const log = createLogger({ dir: null, config, keep: 500 });

async function bodyAt(gameId, inventory) {
  const hosts = fakeHosts(() => ({ inventory }));
  const body = createMineAiBody({ config, log, hosts, gameId, username: `Tst_rv_${gameId}`, careTickMs: 30, careIdleMs: 50 });
  await until(() => hosts.started[0]);
  const fake = hosts.started[0].fake;
  await body.ready;
  fake.world.position = { x: 477.5, y: 76, z: -7.5 }; // at 477 76 -8, as the second frame was built
  await body.refresh();
  fake.world.heading = 180; // facing south, as the second frame was built
  return { body, fake, hosts };
}
/** The frame's cells where the body builds it (the bot's feet and heading). */
const frameOf = (fake) => blueprintCells('nether_portal', 'obsidian', { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) }, fake.world.heading).cells;
const at = (fake, c) => fake.world.grid.get(`${c.x},${c.y},${c.z}`);

test('gd7540a: a portal site in rock whose next cell the first dig already cleared: the site counts as cleared and the frame goes up', async () => {
  const { body, fake, hosts } = await bodyAt('gd754a', { obsidian: 14, diamond_pickaxe: 1, flint_and_steel: 1 });
  try {
    // the bot in a one-wide tunnel in stone (its own two cells and the way it came are air), as at 477 76 -8
    const feet = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    fake.world.grid = new Map();
    fake.world.boxAt = (x, y, z) => (x === feet.x && z <= feet.z && (y === feet.y || y === feet.y + 1) ? 'air' : 'stone');
    // the first dig clears the cells beside it too (their drop recovery stepped through), once
    let first = true;
    fake.world.digAlso = (c) => { if (!first) return []; first = false; return [{ x: c.x + 1, y: c.y, z: c.z }, { x: c.x - 1, y: c.y, z: c.z }, { x: c.x, y: c.y, z: c.z + 1 }, { x: c.x, y: c.y, z: c.z - 1 }]; };
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.doesNotMatch(r.result, /could not clear/);
    assert.match(r.result, /\(built facing south; cleared 18 cells of stone for it first\)$/, r.result);
    const digs = fake.tools('collect_block');
    assert.ok(digs.length >= 2 && digs.length <= 18, `each cell dug once at most (${digs.length})`);
    assert.equal(fake.tools('build_structure').length, 1, 'the frame was built');
    // the frame complete: obsidian on its 12 cells, air inside, 2 obsidian left
    const cells = frameOf(fake);
    assert.equal(cells.filter((c) => c.block_name === 'obsidian' && at(fake, c) === 'obsidian').length, 12);
    assert.ok(cells.filter((c) => c.block_name === 'air').every((c) => at(fake, c) === 'air'));
    assert.equal(fake.world.inventory.get('obsidian'), 2);
    // and it lights
    const lit = await body.run('portal', { action: 'light' });
    assert.equal(lit.ok, true, lit.result);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('gd7540a: a whole build on a mixed site (dirt ground, stone, oak leaves): cleared, a block fallen into a dug cell dug as what it is, 12 obsidian placed, the frame complete', async () => {
  const { body, fake, hosts } = await bodyAt('gd754b', { obsidian: 14, diamond_pickaxe: 1 });
  try {
    const feet = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    fake.world.grid = new Map();
    // dirt ground, a stone outcrop at the bot's height, leaves of a tree above; the bot stands in the open
    fake.world.boxAt = (x, y, z) => (y < feet.y ? 'dirt' : x === feet.x && z === feet.z ? 'air' : y <= feet.y + 1 ? 'stone' : y <= feet.y + 3 ? 'oak_leaves' : 'air');
    // the first dig lets gravel fall into the next cell of the frame's inside
    const cells = frameOf(fake);
    const inside = cells.filter((c) => c.block_name === 'air');
    let once = true;
    fake.world.digAlso = () => { if (!once) return []; once = false; fake.world.grid.set(`${inside[0].x},${inside[0].y},${inside[0].z}`, 'gravel'); return []; };
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, true, r.result);
    assert.match(r.result, /cleared \d+ cells of (dirt|stone|oak_leaves)( and (dirt|stone|oak_leaves))+ for it first\)$/, r.result);
    const digs = fake.tools('collect_block').map((c) => c.args);
    assert.ok(digs.some((d) => d.block_name === 'gravel' && d.x === inside[0].x && d.y === inside[0].y && d.z === inside[0].z), 'the gravel fallen in, dug as gravel');
    assert.equal(cells.filter((c) => c.block_name === 'obsidian' && at(fake, c) === 'obsidian').length, 12, 'the frame complete');
    assert.ok(inside.every((c) => at(fake, c) === 'air'), 'its inside clear');
    assert.equal(fake.world.inventory.get('obsidian'), 2);
  } finally { await body.close(); await hosts.closeAll(); }
});

test('gd7540a: a site cell that will not clear (water, or a refused dig) still stops the build before any obsidian is placed', async () => {
  const { body, fake, hosts } = await bodyAt('gd754c', { obsidian: 14, diamond_pickaxe: 1 });
  try {
    const feet = { x: Math.floor(fake.world.position.x), y: Math.floor(fake.world.position.y), z: Math.floor(fake.world.position.z) };
    fake.world.grid = new Map();
    fake.world.boxAt = (x, y, z) => (x === feet.x && z === feet.z && y >= feet.y ? 'air' : 'stone');
    fake.world.fail.collect_block = 'The requested cell could not be dug: it is protected.';
    const r = await body.run('build', { blueprint: 'nether_portal', material: 'obsidian' });
    assert.equal(r.ok, false);
    assert.match(r.result, /^could not clear the cell at -?\d+ -?\d+ -?\d+ \(stone\) where the portal frame goes: .*; no obsidian was placed/);
    assert.equal(fake.tools('build_structure').length, 0);
    assert.equal(fake.world.inventory.get('obsidian'), 14);
  } finally { await body.close(); await hosts.closeAll(); }
});
