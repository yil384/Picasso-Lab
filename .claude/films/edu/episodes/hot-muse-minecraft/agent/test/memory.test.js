// test/memory.test.js - the brain's memory on its own: short-term folding of old steps into summary lines, and the
// notes.json store (positions, lessons, atomic writes, reading back, refusing junk from a hand-edited or broken file).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createShortMemory, createNotes, summarizeStep, cleanText, deltaText, callText, STATIONS } from '../src/memory.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'muse-notes-'));
const turn = (i) => [
  { role: 'assistant', content: null, tool_calls: [{ id: `c${i}`, type: 'function', function: { name: 'eat', arguments: '{}' } }] },
  { role: 'tool', tool_call_id: `c${i}`, content: 'OK: ate' },
];

test('memory: short-term keeps keep..2*keep steps verbatim and folds older ones into summary lines', () => {
  const m = createShortMemory({ keep: 2, maxEarlier: 3 });
  for (let i = 1; i <= 4; i++) m.add(turn(i), `#${i} eat: OK`);
  assert.equal(m.size, 4);
  assert.equal(m.earlier(), '');
  assert.equal(m.messages().length, 8);

  m.add(turn(5), '#5 eat: OK');
  assert.equal(m.size, 2, 'folded down to keep');
  assert.deepEqual(m.messages().map((x) => x.tool_call_id ?? x.tool_calls[0].id), ['c4', 'c4', 'c5', 'c5']);
  assert.equal(m.earlier(), '#1 eat: OK\n#2 eat: OK\n#3 eat: OK');

  for (let i = 6; i <= 8; i++) m.add(turn(i), `#${i} eat: OK`);
  assert.equal(m.earlier(), '(3 older steps not shown)\n#4 eat: OK\n#5 eat: OK\n#6 eat: OK');
  m.add([], '#9 no tool call');
  assert.equal(m.size, 3);
  assert.equal(m.messages().length, 4, 'a step without messages adds none');
  m.clear();
  assert.equal(m.size, 0);
  assert.equal(m.earlier(), '');
  assert.equal(createShortMemory({ keep: 0 }).keep, 1, 'the last result always goes back as a tool message');
});

test('memory: summaries and text helpers', () => {
  assert.equal(cleanText('a\u0000b\n\tc  d\u2028e', 100), 'a b c d e');
  assert.equal(cleanText('x'.repeat(10), 5), 'xxxx…');
  assert.equal(deltaText({ oak_log: 4, oak_planks: -3 }), '+4 oak_log, -3 oak_planks');
  assert.equal(callText('get_state', {}), 'get_state');
  assert.equal(callText('collect', { block: 'oak_log', n: 4 }), 'collect {"block":"oak_log","n":4}');
  assert.equal(summarizeStep({ step: 2, tool: 'collect', args: { block: 'oak_log', n: 4 }, ok: true, result: 'got 4', delta: { oak_log: 4 } }),
    '#2 collect {"block":"oak_log","n":4}: OK (+4 oak_log)');
  assert.equal(summarizeStep({ step: 3, tool: 'eat', args: {}, ok: false, result: 'not hungry\nat all', delta: {} }), '#3 eat: FAILED: not hungry at all');
  assert.equal(summarizeStep({ step: 4, tool: null, args: null, ok: false, result: 'no tool call', delta: {} }), '#4 no tool call');
});

test('memory: notes remember stations and lessons, write atomically and read back', () => {
  const dir = tmp();
  const file = path.join(dir, 'sub', 'notes.json');
  try {
    const n = createNotes({ path: file, maxPlaces: 2, maxLessons: 3 });
    assert.equal(n.loadError, null, 'a missing file is not an error');
    assert.equal(n.placesText(), '');
    assert.equal(n.remember('crafting_table', { x: 3.7, y: 64, z: -2.2 }), true);
    assert.equal(n.remember('crafting_table', { x: 3, y: 64, z: -3 }), false, 'same block after flooring');
    assert.equal(n.remember('diamond_block', { x: 0, y: 64, z: 0 }), false, 'only stations');
    assert.equal(n.remember('furnace', { x: 0, y: 999, z: 0 }), false, 'out of the world');
    assert.equal(n.remember('furnace', { x: 'a', y: 64, z: 0 }), false);
    n.remember('furnace', { x: 1, y: 64, z: 1 });
    n.remember('furnace', { x: 2, y: 64, z: 2 });
    n.remember('furnace', { x: 3, y: 64, z: 3 });
    assert.deepEqual(n.places('furnace').map((p) => p.x), [3, 2], 'newest first, capped');
    assert.equal(n.placesText(), 'crafting_table at (3, 64, -3); furnace at (3, 64, 3), (2, 64, 2)');
    assert.equal(n.forget('furnace', { x: 2, y: 64, z: 2 }), true);
    assert.equal(n.forget('furnace', { x: 2, y: 64, z: 2 }), false);

    assert.equal(n.addLesson('Iron ore needs a stone pickaxe.'), true);
    assert.equal(n.addLesson('Iron ore needs a stone pickaxe.'), false, 'no duplicates');
    assert.equal(n.addLesson('first version', { key: 'k' }), true);
    assert.equal(n.addLesson('second version', { key: 'k' }), true, 'same key replaces');
    assert.equal(n.addLesson('  \u0000 '), false);
    assert.deepEqual(n.lessons().map((l) => l.text), ['Iron ore needs a stone pickaxe.', 'second version']);
    n.addLesson('c');
    n.addLesson('d');
    assert.deepEqual(n.lessons().map((l) => l.text), ['second version', 'c', 'd'], 'oldest lessons drop first');
    assert.equal(n.lessonsText(2), '- c\n- d');

    assert.equal(n.dirty, true);
    assert.deepEqual(n.flush(), { ok: true, written: true });
    assert.deepEqual(n.flush(), { ok: true, written: false }, 'nothing changed');
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['notes.json'], 'no temp file left behind');

    const back = createNotes({ path: file, maxPlaces: 2, maxLessons: 3 });
    assert.deepEqual(back.toJSON(), n.toJSON());
    back.clearPlaces();
    assert.deepEqual(STATIONS.map((s) => back.places(s).length), [0, 0, 0]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('memory: a broken or hand-edited notes file cannot put junk into the prompt', () => {
  const dir = tmp();
  try {
    const broken = path.join(dir, 'broken.json');
    fs.writeFileSync(broken, '{"places": ');
    const b = createNotes({ path: broken });
    assert.match(b.loadError, /unreadable, starting empty/);
    assert.equal(b.placesText(), '');

    const edited = path.join(dir, 'edited.json');
    const places = JSON.stringify({
      furnace: [{ x: 1, y: 64, z: 1 }, { x: 1, y: 64, z: 1 }, { x: '1e400', y: 64, z: 0 }, null, { x: 5, y: -100, z: 0 }],
      beacon: [{ x: 0, y: 64, z: 0 }],
    }).replace(/^\{/, '{"__proto__":{"polluted":true},');
    const lessons = JSON.stringify(['plain string lesson', { text: 'line one\nline two\u0007', key: 'k' }, { nope: 1 }, 42, { text: 'x'.repeat(500) }]);
    fs.writeFileSync(edited, `{"places":${places},"lessons":${lessons}}`);
    const e = createNotes({ path: edited });
    assert.equal(e.loadError, null);
    assert.deepEqual(e.places('furnace').map(({ x, y, z }) => [x, y, z]), [[1, 64, 1]]);
    assert.equal(e.places('beacon').length, 0);
    assert.deepEqual(Object.keys(e.places()), STATIONS);
    const texts = e.lessons().map((l) => l.text);
    assert.deepEqual(texts.slice(0, 2), ['plain string lesson', 'line one line two']);
    assert.equal(texts.length, 3, 'entries without text are dropped');
    assert.ok(texts.every((t) => t.length <= 240));
    assert.equal({}.polluted, undefined);

    const mem = createNotes();
    mem.addLesson('kept in memory');
    assert.deepEqual(mem.flush(), { ok: true, written: false });
    assert.equal(mem.dirty, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
