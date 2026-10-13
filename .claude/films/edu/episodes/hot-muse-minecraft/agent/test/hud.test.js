// test/hud.test.js - the stream's HUD drawn by src/hud.js (the design's own drawing code, ported to node-canvas) for
// the design's three states (ui-art/hud-final/states.json: g08370a polling with no why, the long sample, the smoke
// game): the layout the design measured (FINAL-SPEC.md section 2), no text overlapping another or leaving its column
// (the mock-up's QA), a draw well inside a frame once measured
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { drawHud } from '../src/hud.js';
import { createUiPanel } from '../src/ui-panel.js';
import { callerOf } from '../src/terminal.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');
const STATES = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'ui-art', 'hud-final', 'states.json'), 'utf8'));

test('HUD: the design\'s three states drawn as the design measured them, with no text problem', () => {
  createUiPanel({ width: 1080, height: 472, over: 72 }); // the fonts, registered once
  const want = {
    nowhy: { goal: [644, 60], thinking: [704, 30], columns: [744, 152], rawLines: 8, rawEntries: 5 },
    long: { goal: [644, 40], thinking: [684, 86], columns: [780, 112], rawLines: 8, rawEntries: 5 },
    fresh: { goal: [644, 40], thinking: [684, 86], columns: [780, 132], rawLines: 7, rawEntries: 5 },
  };
  const g = createCanvas(1080, 1080).getContext('2d');
  for (const [key, w] of Object.entries(want)) {
    const st = { ...STATES[key], caller: STATES[key].raw.entries[0]?.by === 'smoke-script' ? 'TEST SCRIPT' : 'MUSE' };
    const r = drawHud(g, st, {});
    assert.deepEqual({ goal: r.layout.goal, thinking: r.layout.thinking, columns: r.layout.columns, rawLines: r.layout.rawLines, rawEntries: r.layout.rawEntries }, w, key);
    assert.deepEqual(r.qa.problems, [], `${key}: no text overlaps, leaves the canvas or crosses its column`);
    // measured once: drawing it again is quick (the layout and the wraps are measured from cache)
    const t0 = process.hrtime.bigint();
    drawHud(g, st, {});
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    assert.ok(ms < 120, `${key}: ${ms.toFixed(1)} ms`);
  }
});

test('HUD: the caller is named from the MCP client; an empty game draws', () => {
  let t = 1_000_000;
  const p = createUiPanel({ width: 1080, height: 472, over: 72, now: () => t });
  p.term({ caller: 'TEST SCRIPT', lines: [{ k: 'call', t: '> start_game', say: 'Start a new game', tool: 'start_game', raw: '{}', rid: 1 }, { k: 'reply', t: '< New game g1: a new bot.', rid: 1 }], game: { id: 'g1', s: 0 } });
  t += 1000;
  p.render(t);
  const h = p.hud(t);
  assert.equal(h.state.caller, 'TEST SCRIPT');
  assert.equal(h.state.currentCall, null, 'no play call yet');
  assert.equal(h.state.thinking.hasWhy, false);
  assert.deepEqual(h.qa.problems, []);
  assert.deepEqual(['muse-minecraft-mcp', 'staging-check', 'muse-dec85ec-smoke', 'e2e-iron-switch', 'Claude Desktop', '', '#!'].map(callerOf), ['MUSE', 'TEST SCRIPT', 'TEST SCRIPT', 'TEST SCRIPT', 'CLAUDE DESKTOP', 'AGENT', 'AGENT']);
});
