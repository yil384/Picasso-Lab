// test/descriptions.test.js - every number a tool or skill description gives as a bound of an argument ("1 to 64",
// "at most 24 a call", "up to 12 items") is that argument's bound in the schema the server checks, for every skill of
// both bodies (ours, and BODY=mineai's extra skills and descriptions) and every MCP tool as tools/list sends it. The Muse
// run on staging (2026-10-08) found smelt saying "at most 24 a call" while its schema took n from 1 to 64. And the
// skills a server offers are named, from one source, in the server instructions and in both play tools, so a client
// never has to guess one (Muse's own notes listed only some, and it had to trust start_game's reply to use hunt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { loadConfig } from '../src/config.js';
import { createWeb } from '../src/web.js';
import { skillSet, TOOLS, SMELT_PER_CALL, CRAFT_BATCH_MAX } from '../src/contracts.js';
import { MINEAI_SKILLS } from '../src/mineai/skills.js';
import { MAX_PARALLEL } from '../src/skills/smelt.js';

const num = (s) => Number(String(s).replace(/,/g, ''));
const RANGE = /(?<![\w.])(-?\d[\d,]*) to (-?\d[\d,]*)(?![\w.])/g;
const LIMIT = /\b(?:at most|up to|no more than|maximum(?: of)?)\s+(\d[\d,]*)/gi;

/**
 * Numbers in descriptions that are not argument bounds, each with where it comes from, so a new one is a decision
 * (and a stale entry fails too).
 */
const NOT_BOUNDS = [
  { where: 'smelt', claim: 'up to 3', value: MAX_PARALLEL, why: 'furnaces one load is shared over (src/skills/smelt.js)' },
  { where: 'get_state', claim: 'up to 1', why: 'the reply deadline in seconds (the test server answers within 1 s)' },
];

/** Every bound pair in a JSON Schema: [{path, lo, hi}] for integers, string lengths and list lengths. */
function bounds(schema, at = '', out = []) {
  if (!schema || typeof schema !== 'object') return out;
  if (schema.type === 'integer' || schema.type === 'number') out.push({ path: at, lo: schema.minimum, hi: schema.maximum });
  if (schema.type === 'string' && (schema.minLength !== undefined || schema.maxLength !== undefined)) out.push({ path: at, lo: schema.minLength ?? 0, hi: schema.maxLength });
  if (schema.type === 'array') out.push({ path: at, lo: schema.minItems ?? 0, hi: schema.maxItems });
  for (const [k, v] of Object.entries(schema.properties ?? {})) bounds(v, at ? `${at}.${k}` : k, out);
  if (schema.items) bounds(schema.items, `${at}[]`, out);
  return out;
}

/** Every description in a schema with the bound of the node it describes: [{path, text, own}]. */
function descriptions(schema, at = '', out = []) {
  if (!schema || typeof schema !== 'object') return out;
  if (schema.description) out.push({ path: at, text: schema.description, own: bounds({ ...schema, properties: undefined, items: undefined }, at)[0] ?? null });
  for (const [k, v] of Object.entries(schema.properties ?? {})) descriptions(v, at ? `${at}.${k}` : k, out);
  if (schema.items) descriptions(schema.items, `${at}[]`, out);
  return out;
}

/**
 * What a tool's descriptions claim that its schema does not hold: a range in an argument's description that is not
 * that argument's bounds, a range in the tool's description that no argument has, or a limit ("at most N") that is no
 * argument's maximum. used: the NOT_BOUNDS entries that excused a claim.
 */
function drift(name, description, schema, used) {
  const all = bounds(schema);
  const problems = [];
  const excused = (text) => {
    const hit = NOT_BOUNDS.find((x) => x.where === name && text.includes(x.claim) && (x.value === undefined || text.includes(`${x.claim.replace(/\d+$/, '')}${x.value}`)));
    if (hit) used.add(hit);
    return Boolean(hit);
  };
  const check = (text, own, where) => {
    for (const [, a, b] of text.matchAll(RANGE)) {
      const [lo, hi] = [num(a), num(b)];
      const ok = own ? own.lo === lo && own.hi === hi : all.some((x) => x.lo === lo && x.hi === hi);
      if (!ok) problems.push(`${name}${where}: says "${a} to ${b}", the schema has ${own ? `${own.lo} to ${own.hi}` : all.map((x) => `${x.path} ${x.lo} to ${x.hi}`).join(', ') || 'no bounds'}`);
    }
    for (const m of text.matchAll(LIMIT)) {
      const n = num(m[1]);
      if (all.some((x) => x.hi === n) || excused(m[0])) continue;
      problems.push(`${name}${where}: says "${m[0]}", but no argument has that maximum (${all.map((x) => `${x.path} ${x.hi}`).join(', ')})`);
    }
  };
  check(description, null, '');
  for (const d of descriptions(schema)) check(d.text, d.own, ` (${d.path})`);
  return problems;
}

test('descriptions: every bound a skill description states is the schema\'s, for both bodies', () => {
  const used = new Set();
  const problems = [];
  for (const [body, list] of [['ours', skillSet().mcpSkills], ['mineai', MINEAI_SKILLS.mcpSkills], ['brain', TOOLS]]) {
    for (const { function: f } of list) problems.push(...drift(f.name, f.description, f.parameters, used).map((p) => `${body}: ${p}`));
  }
  assert.deepEqual(problems, []);
  // the two the Muse run named, and the limit both smelt descriptions state
  const smelt = (list) => list.find((t) => t.function.name === 'smelt').function;
  for (const list of [skillSet().mcpSkills, MINEAI_SKILLS.mcpSkills]) {
    assert.equal(smelt(list).parameters.properties.n.maximum, SMELT_PER_CALL);
    assert.match(smelt(list).description, new RegExp(`at most ${SMELT_PER_CALL}`, 'i'));
    assert.equal(smelt(list).parameters.properties.n.description, `how many items to smelt, 1 to ${SMELT_PER_CALL}`);
  }
  assert.equal(MINEAI_SKILLS.schemas.craft_batch.properties.items.maxItems, CRAFT_BATCH_MAX);
  assert.ok(used.has(NOT_BOUNDS[0]), 'every exception is still needed');
});

test('descriptions: the checker itself finds the drift the Muse run found', () => {
  const used = new Set();
  const smelt64 = { type: 'object', properties: { n: { type: 'integer', description: 'how many items to smelt, 1 to 64', minimum: 1, maximum: 64 } } };
  assert.match(drift('smelt', 'Smelt n items. At most 24 a call; call again for the rest.', smelt64, used).join('\n'), /says "At most 24", but no argument has that maximum \(n 64\)/);
  const stale = { type: 'object', properties: { n: { type: 'integer', description: 'how many, 1 to 64', minimum: 1, maximum: 24 } } };
  assert.match(drift('x', 'At most 24 a call.', stale, used).join('\n'), /x \(n\): says "1 to 64", the schema has 1 to 24/);
  assert.deepEqual(drift('x', 'For 1 to 8 chunks; at most 8.', { type: 'object', properties: { c: { type: 'integer', minimum: 1, maximum: 8 } } }, used), []);
  assert.match(drift('x', 'Within 1 to 9 blocks.', { type: 'object', properties: { c: { type: 'integer', minimum: 1, maximum: 8 } } }, used).join('\n'), /says "1 to 9"/);
});

async function mcpOf(skills) {
  const web = createWeb({ config: loadConfig({ WEB_HOST: '127.0.0.1', WEB_PORT: '0', MODEL_API_KEY: '', LOG_DIR: '' }), log: { event: () => {}, tail: () => [] }, makeBody: () => { throw new Error('no bodies here'); }, mcpCallMs: 1_000, ...(skills ? { skills } : {}) });
  const { url } = await web.start();
  const c = new Client({ name: 'test', version: '1' });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  return { c, close: async () => { await c.close(); await web.stop(); } };
}

test('descriptions: every bound an MCP tool states is in the inputSchema tools/list sends', async () => {
  for (const skills of [null, MINEAI_SKILLS]) {
    const { c, close } = await mcpOf(skills);
    try {
      const used = new Set();
      const problems = [];
      for (const t of (await c.listTools()).tools) {
        // play's description carries the skill list, whose bounds are the skills' own (checked above) and rendered
        // from their schemas
        const own = t.description.split('\n').filter((l) => !l.startsWith('- ')).join('\n');
        problems.push(...drift(t.name, own, t.inputSchema, used));
      }
      assert.deepEqual(problems, []);
      assert.ok(used.has(NOT_BOUNDS[1]));
    } finally { await close(); }
  }
});

test('skills: the server instructions and both play tools name every skill the server offers, from one list', async () => {
  for (const skills of [skillSet(), MINEAI_SKILLS]) {
    const { c, close } = await mcpOf(skills === MINEAI_SKILLS ? skills : null);
    try {
      const names = [...skills.names];
      const listed = (text) => text.split(/[\s,:.()]+/).filter((w) => names.includes(w));
      const instructions = c.getInstructions();
      const inInstructions = /The skills this server offers \((\d+)\): ([a-z_, ]+)\./.exec(instructions);
      assert.ok(inInstructions, instructions);
      assert.equal(Number(inInstructions[1]), names.length);
      assert.deepEqual(inInstructions[2].split(', '), names, 'exactly the server\'s skills, in its order');
      const { tools } = await c.listTools();
      const play = tools.find((t) => t.name === 'play');
      const seq = tools.find((t) => t.name === 'play_sequence');
      assert.deepEqual(play.description.split('\n').filter((l) => l.startsWith('- ')).map((l) => /^- (\w+) \{/.exec(l)[1]), names, 'play: every skill with its arguments');
      assert.deepEqual(/the \d+ skills: ([a-z_, ]+)\./.exec(seq.description)[1].split(', '), names, 'play_sequence names them too');
      assert.deepEqual(play.inputSchema.properties.skill.enum, names);
      assert.deepEqual(seq.inputSchema.properties.steps.items.properties.skill.enum, names);
      assert.ok(listed(instructions).length >= names.length);
      if (skills === MINEAI_SKILLS) for (const extra of ['hunt', 'equip', 'sleep', 'bucket', 'chest', 'explore', 'policy', 'pick_up', 'drop']) assert.ok(inInstructions[2].includes(extra), extra);
      else assert.doesNotMatch(inInstructions[2], /\bhunt\b/, 'ours offers no hunt, and says so by not naming it');
    } finally { await close(); }
  }
});
