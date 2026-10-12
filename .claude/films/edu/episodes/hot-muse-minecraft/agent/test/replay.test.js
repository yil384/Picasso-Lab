// test/replay.test.js - Muse's real calls replayed (the log hunt's REPLAY): every step of production games gb1cfe3
// (2026-10-11, the iron pickaxe) and g64e8c5 (2026-10-12, the long run to the Nether), as Muse sent them, through our
// /mcp against the fake runtime, with the incidents of the real game played by the fake where they happened (the
// guard reflex equipping the fresh shield, the furnace hitch, a bag full of rock, no lava pool near the first time).
// What is checked, on every reply: no false failure (a step production did is ok here, a step that failed there gets
// the right code here), only known codes, no runtime jargon (entity ids, raw floats, "build: true"), Body advice with
// at most 5 items, one of each kind, every hint a valid call, and advice that changes with the game rather than the
// same list on every reply. Every future change must pass it.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createMineAiBody } from '../src/mineai/body.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { RESULT_CODES } from '../src/contracts.js';
import { fakeHosts } from './fake-mineai.js';
import { loadConfig } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createWeb } from '../src/web.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { games } = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'replay-prod.json'), 'utf8'));
const config = loadConfig({ MODEL_API_KEY: '', LOG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'replay-')) });
const JARGON = /#\d{2,}|\d\.\d{5,}|capability_limit|build: true|engagement minimum|NO_LOADED_MATCHING_TARGETS|consumption of/;

/** What the fake runtime does before a step, to play the real game's incidents (by the step's index in the game). */
const INCIDENTS = {
  g64e8c5: {
    // the shelter's dirt (production collected 11 dirt for its walls within the step; the fake build does not)
    // where the game played (its walks are within reach of there), and the shelter's dirt
    0: (w) => { w.position = { x: -55.5, y: 84, z: -275.5 }; w.inventory.set('dirt', 13); },
    // the furnace hitch: "The block appeared, but consumption of furnace was not observed"
    15: (w) => w.takeovers.push({ tool: 'smelt_item', made: false, error: 'The block appeared, but consumption of furnace was not observed (inventory 1 → 1).' }),
    19: (w) => { w.food = 9; },
    // the gravel gave 1 flint
    28: (w) => { w.inventory.set('flint', (w.inventory.get('flint') ?? 0) + 1); },
    // no lava pool within 16 blocks of the first try
    31: (w) => { w.blocks = []; },
    // the guard reflex put the fresh shield in the off-hand, the temporary table left standing
    36: (w) => w.takeovers.push({ tool: 'craft_item', made: true, offHand: 'shield', tableLeft: true, error: 'Equip an available shield before nearby hostiles require a guard.' }),
    // a lava pool next to the bot the second time
    37: (w) => { w.blocks = [{ name: 'lava', found: 9, listed: [{ x: Math.floor(w.position.x) + 4, y: Math.floor(w.position.y) - 1, z: Math.floor(w.position.z), level: 0 }] }]; },
    // a bag full of rock dug on the walks: "No free slot or matching stack space for mutton"
    39: (w) => {
      for (let k = 0; k < 24; k++) w.inventory.set(`junk_${k}`, 1);
      for (const [k, n] of [['cobbled_deepslate', 314], ['tuff', 73], ['gravel', 9], ['clay_ball', 16], ['azalea', 2], ['flowering_azalea', 1], ['moss_block', 5]]) w.inventory.set(k, n);
      w.fail.collect_mob_drop = 'No free slot or matching stack space for mutton.';
    },
    45: (w) => { delete w.fail.collect_mob_drop; for (let k = 0; k < 24; k++) w.inventory.delete(`junk_${k}`); },
    47: (w) => { w.food = 6; },
    // the Nether arrival where production's was
    51: (w) => { w.netherAt = { x: -2.5, y: 68, z: -30.5 }; },
  },
};
/** The code a step that failed in production gets here (by index); every other step is ok. */
const EXPECTED = {
  // 1: raw_chicken is refused before a hunt; 18: production smelted the mutton again after its hitch, but here the
  // hitch was tried again within step 15, so the mutton is already cooked and the repeat is refused by the check;
  // 31: no lava pool within 16 blocks; 39: the full bag
  g64e8c5: { 1: 'BAD_ARGS', 18: 'NEED_ITEMS', 31: 'LAVA', 39: 'INVENTORY_FULL' },
};

async function replay(id, steps) {
  const log = createLogger({ dir: null, config, keep: 2000 });
  const hosts = fakeHosts(() => ({ inventory: {} }));
  const web = createWeb({
    config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', WEB_LEASE_MS: '7200000' }), log, skills: MINEAI_SKILLS,
    makeBody: (gid, o) => createMineAiBody({ config, log, hosts, gameId: gid, username: `Tst_rv_${gid}`, viewId: o?.viewId, careTickMs: 30, careIdleMs: 50 }),
  });
  const { url } = await web.start();
  const c = new Client({ name: 'muse-minecraft-mcp', version: 'replay' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const out = [];
  try {
    const start = await c.callTool({ name: 'start_game', arguments: { adult: true } });
    assert.ok(!start.isError, start.content[0].text);
    const fake = hosts.started[0].fake;
    for (const [i, st] of steps.entries()) {
      INCIDENTS[id]?.[i]?.(fake.world);
      const r = await c.callTool({ name: 'play', arguments: { skill: st.tool, args: st.args } });
      const text = r.content.map((x) => x.text).join('\n');
      const step = r.structuredContent?.steps?.at(-1) ?? null;
      out.push({ i, st, text, code: r.structuredContent?.code ?? null, status: step?.status ?? (r.isError ? 'refused' : null), result: step?.result ?? text.split('\n')[0], advice: r.structuredContent?.advice ?? [] });
    }
    // what the game's replies were, together: the advice must change with the game
    return { out, rows: log.tail(2000) };
  } finally {
    await c.close();
    await web.stop?.();
    await hosts.closeAll();
  }
}

for (const [id, steps] of Object.entries(games)) {
  test(`replay ${id}: Muse's ${steps.length} real steps, no false failures, right codes, clean words, sane advice`, async () => {
    const { out, rows } = await replay(id, steps);
    const expected = EXPECTED[id] ?? {};
    for (const o of out) {
      const want = o.i in expected ? expected[o.i] : 'ok';
      const where = `${id} step ${o.i} ${o.st.tool} ${JSON.stringify(o.st.args)}: ${o.result}`;
      if (want === 'ok') assert.equal(o.status, 'confirmed', `no false failure: ${where}`);
      else if (want) assert.equal(o.code, want, `the right code: ${where}`);
      if (o.code) assert.ok(RESULT_CODES.includes(o.code), `a known code: ${where}`);
      assert.doesNotMatch(o.text, JARGON, `no runtime jargon: ${where}`);
      assert.ok(o.advice.length <= 5, `at most 5 advice items: ${where}`);
      assert.equal(new Set(o.advice.map((a) => a.kind)).size, o.advice.length, `one advice item of each kind: ${where}`);
      for (const a of o.advice) if (a.hint) assert.ok(MINEAI_SKILLS.validate(a.hint.skill, a.hint.args ?? {}).ok, `a valid hint (${a.hint.skill} ${JSON.stringify(a.hint.args)}): ${where}`);
    }
    // not the same advice on every reply: no advice text in more than 60% of the replies
    const counts = {};
    for (const o of out) for (const a of o.advice) counts[a.text] = (counts[a.text] ?? 0) + 1;
    for (const [text, n] of Object.entries(counts)) assert.ok(n <= Math.max(3, out.length * 0.6), `advice repeated on ${n} of ${out.length} replies: ${text}`);
    // the log has every call (F9)
    assert.equal(rows.filter((r) => r.kind === 'mcp_call' && r.tool === 'play').length, steps.length);
  });
}
