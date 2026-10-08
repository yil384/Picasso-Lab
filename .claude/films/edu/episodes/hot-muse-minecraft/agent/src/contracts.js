// src/contracts.js - the interfaces between modules: the 10 whitelisted tools with strict JSON Schemas (TOOLS goes to
// the model as is), the MCP-only skills (craft_batch), the argument validator every caller runs before a skill, the
// typed result codes of MCP replies, and JSDoc types for Body, Brain, LLM, Logger, Web and the MCP reply. Nothing here
// executes model or viewer text: arguments are data, checked against a fixed schema.

import {
  COLLECTABLE_BLOCKS, CRAFTABLE_ITEMS, SMELTABLE_ITEMS, PLACEABLE_BLOCKS, BUILD_MATERIALS, BLUEPRINTS, BLUEPRINT_NAMES,
  ATTACK_TARGETS,
} from './game.js';

// ---------------------------------------------------------------------------------------------------------------
// Tool schemas

const obj = (properties) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const int = (description, minimum, maximum) => ({ type: 'integer', description, minimum, maximum });
const pick = (description, list) => ({ type: 'string', description, enum: [...list] });
const COUNT = (what, max = 64) => int(`how many ${what}, 1 to ${max}`, 1, max);
/**
 * Furnace items per smelt call: at about 10.5 s each, they fit in TOOL_TIMEOUTS_MS.smelt with time to spare. The
 * smelt schema's maximum, so the description and the schema say the same (test/descriptions.test.js).
 */
export const SMELT_PER_CALL = 24;
/**
 * Chat text: no command (a leading "/", also after spaces) and no "§" anywhere, which the server answers by kicking
 * the player ("illegal characters in chat").
 */
export const SAY_PATTERN = '^[^/\\s\u00a7][^\u00a7]*$';
const XYZ = {
  x: int('block x', -30_000_000, 30_000_000),
  y: int('block y (feet level), -64 to 320', -64, 320),
  z: int('block z', -30_000_000, 30_000_000),
};

const DEFS = [
  ['get_state',
    'Read your state as text: health, food, position, time of day, inventory, nearby blocks and mobs, current goal and the last result. Takes no game time.',
    obj({})],
  ['go_to',
    'Walk to a block position with pathfinding (it may dig or bridge small obstacles). A y below the ground at that spot makes it dig a staircase down there (how to reach ore underground; dig with a pickaxe: stone by hand takes 7.5 s a block). The target must be within 256 blocks. Seconds to a minute; a walk that stops getting closer ends after about 20 s and says why.',
    obj({ ...XYZ })],
  ['collect',
    'Find the nearest blocks of one type (searches 32 blocks around you), walk there, mine n of them with the best tool you carry and pick up the drops. stone drops cobblestone; iron_ore drops raw_iron and needs a stone pickaxe or better.',
    obj({ block: pick('block to mine', COLLECTABLE_BLOCKS), n: COUNT('blocks to mine') })],
  ['craft',
    'Craft n of an item from your inventory (rounded up to whole recipe batches). When the recipe needs a crafting table it uses your own table nearby, or puts down the one in your inventory (or makes one from 4 planks); a table you put down stays there for your later crafts.',
    obj({ item: pick('item to make', CRAFTABLE_ITEMS), n: COUNT('items you want') })],
  ['smelt',
    `Smelt n items in furnaces. item is the INPUT (raw_iron -> iron_ingot, oak_log -> charcoal, cobblestone -> stone). Loads up to 3 furnaces (yours nearby, ones you carry, or new ones from spare cobblestone), fuels them from your inventory (coal, charcoal, planks, logs) and returns at once; a furnace takes about 10 s per item. The output comes into your inventory with your next action near the furnaces, or when a craft needs it. One call loads at most ${SMELT_PER_CALL}; call again for the rest.`,
    obj({ item: pick('what to put in the furnace', SMELTABLE_ITEMS), n: COUNT('items to smelt', SMELT_PER_CALL) })],
  ['place',
    'Place one block from your inventory at an exact position: it must be air, next to a solid block and within reach after walking there.',
    obj({ block: pick('block to place', PLACEABLE_BLOCKS), pos: { ...obj({ ...XYZ }), description: 'where the block goes' } })],
  ['build',
    `Build a blueprint from blocks in your inventory, on flat ground just in front of you (shelter: around you). Blueprints: ${BLUEPRINT_NAMES.map((b) => `${b} = ${BLUEPRINTS[b].description}`).join('; ')}.`,
    obj({ blueprint: pick('what to build', BLUEPRINT_NAMES), material: pick('block to build with (must be in your inventory)', BUILD_MATERIALS) })],
  ['attack',
    'Fight one mob of this kind (the closest within 16 blocks) until it dies or gets away. nearest_hostile picks the closest hostile mob. Never players.',
    obj({ target: pick('mob to fight', ATTACK_TARGETS) })],
  ['eat',
    'Eat the best food in your inventory. Only works when your food bar is below 20; at 20/20 it fails with code NOT_HUNGRY, which is harmless (nothing is eaten or lost).',
    obj({})],
  ['say',
    'Send one chat message to the players on the server (1 to 200 characters, must not start with / or a space, no § sign).',
    obj({ text: { type: 'string', description: 'the message', minLength: 1, maxLength: 200, pattern: SAY_PATTERN } })],
];

/**
 * What eat answers at a full food bar (both bodies; code NOT_HUNGRY): a failure, but a harmless one, and the reply says
 * so, so a model does not take it for a problem to solve (the Muse run on staging, 2026-10-08, tried twice).
 */
export const NOT_HUNGRY_TEXT = 'not hungry: food is 20/20, and eat works only below 20. Harmless: nothing was eaten or used; eat again once food is below 20 (the body also eats on its own when it gets hungry)';

/** Items one craft_batch call may make (the MCP check may add planks, sticks or a table to the ones asked for). */
export const CRAFT_BATCH_MAX = 12;

/**
 * Skills only the MCP endpoint offers (ROADMAP M2, "recursive and batched craft"). They are not in TOOLS: the brain's
 * tool list (and its prompt cache), the web page's forms and openapi.json stay at the 10 skills above.
 */
const MCP_DEFS = [
  ['craft_batch',
    `Craft several items in order in ONE skill, all at one crafting table: your own table nearby, or the one in your inventory put down once (it stays there for your later crafts). Each item and n as in craft. Up to ${CRAFT_BATCH_MAX} items; stops at the first item that cannot be made and says what is missing.`,
    obj({
      items: {
        type: 'array', description: 'the items to make, in this order', minItems: 1, maxItems: CRAFT_BATCH_MAX,
        items: obj({ item: pick('item to make', CRAFTABLE_ITEMS), n: COUNT('items you want') }),
      },
    })],
];

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v);
  return Object.freeze(o);
}

/** The tool names, in a fixed order. */
export const TOOL_NAMES = Object.freeze(DEFS.map(([name]) => name));

/** name -> parameters JSON Schema. */
export const SCHEMAS = deepFreeze(Object.fromEntries(DEFS.map(([name, , params]) => [name, params])));

/** Every skill the body runs: the 10 tools, then the MCP-only skills (craft_batch). */
export const SKILL_NAMES = Object.freeze([...TOOL_NAMES, ...MCP_DEFS.map(([name]) => name)]);

/** name -> parameters JSON Schema for every skill the body runs (SCHEMAS plus the MCP-only skills). */
export const SKILL_SCHEMAS = deepFreeze({ ...SCHEMAS, ...Object.fromEntries(MCP_DEFS.map(([name, , params]) => [name, params])) });

/**
 * The tool list for chat.completions (OpenAI "function" nesting, strict: every object closes with
 * additionalProperties:false and lists every key in required). Send as is; never let the model or a viewer add tools.
 */
export const TOOLS = deepFreeze(DEFS.map(([name, description, parameters]) => ({
  type: 'function',
  function: { name, description, parameters, strict: true },
})));

/** TOOLS plus the MCP-only skills, in the same shape: what the MCP endpoint lists for play and play_sequence. */
export const MCP_SKILLS = deepFreeze([...TOOLS, ...MCP_DEFS.map(([name, description, parameters]) => ({
  type: 'function',
  function: { name, description, parameters, strict: true },
}))]);

const BOUND_KEYS = ['minimum', 'maximum', 'minLength', 'maxLength', 'pattern'];

/**
 * TOOLS for the API. 'full' (default) sends the schemas with numeric and length bounds; 'basic' strips
 * minimum/maximum/minLength/maxLength/pattern into the descriptions, for an endpoint whose strict mode rejects them
 * (MODEL_TOOL_SCHEMA=basic). validateArgs enforces the bounds either way.
 */
export function toolsForApi(level = 'full') {
  return level === 'full' ? TOOLS : basicTools(TOOLS);
}

/** Any tool list with minimum/maximum/minLength/maxLength/pattern moved into the descriptions (a no-op on basic tools). */
export function basicTools(tools) {
  const strip = (s) => {
    const out = {};
    const notes = [];
    for (const [k, v] of Object.entries(s)) {
      if (BOUND_KEYS.includes(k)) notes.push(`${k} ${v}`);
      else if (k === 'properties') out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, strip(pv)]));
      else out[k] = Array.isArray(v) ? [...v] : v;
    }
    if (notes.length) out.description = `${out.description ?? ''} (${notes.join(', ')})`.trim();
    return out;
  };
  return tools.map((t) => (t?.function?.parameters
    ? { ...t, function: { ...t.function, parameters: strip(t.function.parameters) } }
    : t));
}

/** Upper bound on one skill's run time; the body cancels the skill when it runs out. */
export const TOOL_TIMEOUTS_MS = Object.freeze({
  get_state: 5_000, go_to: 120_000, collect: 180_000, craft: 60_000, smelt: 300_000,
  place: 30_000, build: 300_000, attack: 60_000, eat: 10_000, say: 5_000,
  craft_batch: 150_000,
});

// ---------------------------------------------------------------------------------------------------------------
// Validation

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// control characters plus the two Unicode line separators
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029]');

function check(schema, value, at, errors) {
  if (schema.type === 'array') {
    if (!Array.isArray(value)) { errors.push(`${at} must be a list`); return undefined; }
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${at} needs at least ${schema.minItems} entries`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) { errors.push(`${at} has more than ${schema.maxItems} entries`); return undefined; }
    return value.map((v, i) => check(schema.items, v, `${at}[${i}]`, errors));
  }
  if (schema.type === 'object') {
    if (!isPlainObject(value)) { errors.push(`${at} must be an object`); return undefined; }
    const out = {};
    // every key is required unless the schema lists the required ones (only some MCP-only skills have optional keys)
    const required = schema.required ?? Object.keys(schema.properties);
    for (const k of Object.keys(value)) if (!Object.hasOwn(schema.properties, k)) errors.push(`${at}.${k} is not allowed`);
    for (const [k, s] of Object.entries(schema.properties)) {
      if (!Object.hasOwn(value, k)) { if (required.includes(k)) errors.push(`${at}.${k} is required`); continue; }
      out[k] = check(s, value[k], `${at}.${k}`, errors);
    }
    return out;
  }
  if (schema.type === 'integer') {
    if (!Number.isInteger(value)) { errors.push(`${at} must be an integer`); return undefined; }
    if (value < schema.minimum || value > schema.maximum) errors.push(`${at} must be from ${schema.minimum} to ${schema.maximum}`);
    return value;
  }
  if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') { errors.push(`${at} must be true or false`); return undefined; }
    return value;
  }
  if (schema.type === 'string') {
    if (typeof value !== 'string') { errors.push(`${at} must be a string`); return undefined; }
    if (schema.enum && !schema.enum.includes(value)) {
      const shown = schema.enum.length > 12 ? `${schema.enum.slice(0, 12).join(', ')}, ...` : schema.enum.join(', ');
      errors.push(`${at} "${value.slice(0, 40)}" is not allowed (one of: ${shown})`);
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${at} is too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${at} is longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${at} has a form that is not allowed`);
    if (CONTROL.test(value)) errors.push(`${at} contains control characters`);
    return value;
  }
  errors.push(`${at} has an unsupported schema`);
  return undefined;
}

/**
 * Check tool arguments against the tool's schema. Never throws.
 * @param {string} tool
 * @param {unknown} args  a parsed object
 * @returns {ArgCheck}  ok:true with a fresh copy holding only the allowed keys, or ok:false with a readable error
 */
export function validateArgs(tool, args, schemas = SKILL_SCHEMAS) {
  if (!Object.hasOwn(schemas, tool)) return { ok: false, error: `unknown tool "${String(tool).slice(0, 40)}" (allowed: ${schemas === SKILL_SCHEMAS ? TOOL_NAMES.join(', ') : Object.keys(schemas).join(', ')})` };
  const errors = [];
  const clean = check(schemas[tool], args ?? {}, tool, errors);
  return errors.length ? { ok: false, error: errors.join('; ') } : { ok: true, args: clean };
}

/**
 * The skills the MCP endpoint offers in play and play_sequence: the 10 tools and craft_batch, plus a body's own extra
 * skills (src/mineai/skills.js for BODY=mineai). The brain's tools, the web page and openapi.json keep the 10.
 * @param {Array<[string, string, object]>} [extra]  [name, description, parameters JSON Schema] per extra skill
 * @param {Record<string, string>} [descriptions]  other descriptions for some of the 10 skills and craft_batch
 * @returns {{names: string[], schemas: Record<string, object>, mcpSkills: object[], validate: (tool: string, args: unknown) => ArgCheck}}
 */
export function skillSet(extra = [], descriptions = {}) {
  if (!extra.length && !Object.keys(descriptions).length) return DEFAULT_SKILLS;
  const schemas = deepFreeze({ ...SKILL_SCHEMAS, ...Object.fromEntries(extra.map(([name, , params]) => [name, params])) });
  // a body whose skills work differently says so in their descriptions (the arguments stay the same)
  const base = MCP_SKILLS.map((t) => (descriptions[t.function.name] ? { ...t, function: { ...t.function, description: descriptions[t.function.name] } } : t));
  return Object.freeze({
    names: Object.freeze([...SKILL_NAMES, ...extra.map(([name]) => name)]),
    schemas,
    mcpSkills: deepFreeze([...base, ...extra.map(([name, description, parameters]) => ({ type: 'function', function: { name, description, parameters } }))]),
    validate: (tool, args) => validateArgs(tool, args, schemas),
  });
}
const DEFAULT_SKILLS = Object.freeze({ names: SKILL_NAMES, schemas: SKILL_SCHEMAS, mcpSkills: MCP_SKILLS, validate: (tool, args) => validateArgs(tool, args) });

/**
 * Parse the arguments string of a model tool call, then validate. Empty string means {} (some providers send it for
 * tools without parameters).
 * @returns {ArgCheck}
 */
export function parseArgs(tool, json) {
  if (typeof json !== 'string') return validateArgs(tool, json);
  if (json.length > 4_096) return { ok: false, error: `${tool}: arguments are too long` };
  let value;
  try { value = json.trim() === '' ? {} : JSON.parse(json); } catch { return { ok: false, error: `${tool}: arguments are not valid JSON` }; }
  return validateArgs(tool, value);
}

/**
 * Arguments from an HTML form or query string (all strings, nested fields as "pos.x"), coerced to the schema's types,
 * then validated. Fields the schema does not name (a submit button, a token) are ignored.
 * @param {string} tool
 * @param {Record<string, unknown>} fields
 * @returns {ArgCheck}
 */
export function coerceArgs(tool, fields = {}) {
  const schema = SCHEMAS[tool];
  if (!schema) return validateArgs(tool, {});
  const value = (s, v) => {
    if (s.type === 'integer' && typeof v === 'string' && /^\s*-?\d{1,9}\s*$/.test(v)) return Number(v);
    if (s.type === 'string' && typeof v === 'string') return v.trim();
    return v;
  };
  const out = {};
  for (const [k, s] of Object.entries(schema.properties)) {
    if (s.type === 'object') {
      const src = isPlainObject(fields[k]) ? fields[k] : null;
      const nested = {};
      for (const [sub, ss] of Object.entries(s.properties)) {
        const v = src ? src[sub] : fields[`${k}.${sub}`];
        if (v !== undefined) nested[sub] = value(ss, v);
      }
      out[k] = nested;
    } else if (fields[k] !== undefined) out[k] = value(s, fields[k]);
  }
  return validateArgs(tool, out);
}

/** Inventory change between two {name: count} maps: only non-zero entries, + gained, - spent. */
export function inventoryDelta(before = {}, after = {}) {
  const delta = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const d = (after[k] ?? 0) - (before[k] ?? 0);
    if (d !== 0) delta[k] = d;
  }
  return delta;
}

/**
 * Typed codes in MCP replies (structuredContent.code and each step's code), so a client can react without reading the
 * text (ROADMAP M2, "typed, compact replies"). The first seven are the roadmap's; the rest name the other ways a step
 * or a call ends. null means nothing went wrong.
 */
export const RESULT_CODES = Object.freeze([
  'NEED_ITEMS', // an ingredient, fuel, tool, station or block is missing (the dry-run check, or the skill itself)
  'HOSTILE_CONTACT', // a hostile mob's hit stopped the skill
  'RETREATED_LOW_HEALTH', // the body fled on its own because health ran low
  'INVENTORY_FULL',
  'DIED',
  'NOT_HUNGRY', // eat at a full food bar (20/20): harmless, nothing was eaten or used
  'NOT_STARTED', // no game (start_game first), the game ended, or the bot is not in the world yet
  'DUPLICATE', // a re-sent play / play_sequence: the first call's result (none of its steps failed), nothing run again
  'BAD_ARGS', // a step's skill or arguments are not valid: nothing was run
  'QUEUE_FULL', // too many steps waiting: nothing was run
  'TIMED_OUT', // the skill ran into its time limit
  'STOPPED', // stopped on request (stop, or the game ended)
  'FAILED', // any other failure; the result text says why
]);

// what the body and the skills say (src/body.js, src/skills/*); the first match wins
const CODE_RULES = [
  ['DIED', /\byou died\b/],
  ['NOT_HUNGRY', /^not hungry\b/],
  // reflexes off: "a zombie is attacking you"; on: a fight that cannot resume the skill, or too many fights in one
  ['HOSTILE_CONTACT', /\bis attacking you\b|^stopped: an? [a-z_]+ hit you\b|^stopped: mobs kept attacking\b/],
  ['RETREATED_LOW_HEALTH', /\b(retreated|fled)\b/i],
  ['INVENTORY_FULL', /\binventory is full\b/],
  ['NEED_ITEMS', /not enough ingredients|you are missing|\bmissing \d|\byou have no\b|you only had|\bno fuel\b|drops nothing without the right tool|\bneeds a crafting table\b|none in your inventory|\bno (safe )?food\b|\bneeds \d+ \w+ here\b/],
  ['TIMED_OUT', /\btimed out after\b/],
  ['STOPPED', /^stopped: /],
];

/**
 * The typed code of a skill result: null when it worked, else the first matching RESULT_CODES entry (FAILED if none).
 * @param {{ok: boolean, result?: string}|null|undefined} r
 * @returns {string|null}
 */
export function codeOf(r) {
  if (!r || r.ok) return null;
  if (typeof r.code === 'string' && RESULT_CODES.includes(r.code)) return r.code; // a body that names the code itself
  const text = String(r.result ?? '');
  for (const [code, re] of CODE_RULES) if (re.test(text)) return code;
  return 'FAILED';
}

/** Events a Body emits through on(). */
export const BODY_EVENTS = Object.freeze(['ready', 'skill', 'chat', 'death', 'end', 'error', 'dig']);

/** Why a brain run ended. */
export const STOP_REASONS = Object.freeze(['goal', 'step_cap', 'cost_cap', 'hour_cap', 'errors', 'stopped']);

// ---------------------------------------------------------------------------------------------------------------
// Module interfaces (JSDoc only). Each module exports exactly the factory named here.

/**
 * @typedef {'get_state'|'go_to'|'collect'|'craft'|'smelt'|'place'|'build'|'attack'|'eat'|'say'} ToolName
 * @typedef {ToolName|'craft_batch'} SkillName   what Body.run accepts: the tools plus the MCP-only skills
 *
 * @typedef {{ok: true, args: object, error?: undefined} | {ok: false, error: string, args?: undefined}} ArgCheck
 *
 * @typedef {Record<string, number>} InventoryDelta  item name -> change, e.g. {oak_planks: -3, wooden_pickaxe: 1}
 *
 * @typedef {object} SkillResult
 * @property {boolean} ok        false for bad arguments, busy, timeout, stopped or a game failure
 * @property {string} result     one or two plain sentences for the model and the viewer log
 * @property {InventoryDelta} delta
 * @property {number} [ms]       wall time of the skill
 * @property {Record<string, number>} [phases]  where that time went, in ms: path, dig, drop, sync, place, open, clicks,
 *   pickup, cook, reflex and other (src/body.js createPhases); they add up to ms
 * @property {string[]} [reflexes]  what the body did on its own during or before the skill (src/reflexes.js)
 * @property {string} [code]     a RESULT_CODES entry the body names itself (BODY=mineai maps the runtime's failure codes);
 *   without it codeOf reads the code from the result text
 * @property {InventoryDelta} [own]  what the skill itself used (-) and made or collected (+), apart from what else
 *   changed during it (blocks dug through or scaffolding placed on a walk, items lying nearby picked up, the drops of
 *   cells a build dug clear): delta minus own. Only when the body can tell (BODY=mineai, from the runtime's evidence)
 *
 * @typedef {object} StateSnapshot  the structured form of Body.state(), for /api/.../state and the HUD
 * @property {number} health                 0-20
 * @property {number} food                   0-20
 * @property {number} oxygen                 0-20 (below 20 only under water)
 * @property {{x:number,y:number,z:number}} position   block coordinates (floored)
 * @property {'north'|'south'|'east'|'west'} facing      build() puts blueprints on this side
 * @property {string} dimension
 * @property {number} timeOfDay              0-23999
 * @property {boolean} isDay
 * @property {Record<string, number>} inventory
 * @property {string|null} held
 * @property {Record<string, string>} [equipment]  what is worn and in the off-hand, by slot (head, torso, legs, feet,
 *   off-hand): BODY=mineai only; those items are not in inventory
 * @property {Array<{name:string, count:number, nearest:{x:number,y:number,z:number}, distance:number, capped?:true}>} nearbyBlocks
 *   notable blocks within 32 (wood, ores, stone, crafting_table, furnace, chest, water, lava); count stops at 64 and
 *   capped:true then means "64 or more"
 * @property {Array<{name:string, hostile:boolean, distance:number, position:{x:number,y:number,z:number}}>} mobs
 * @property {string|null} goal
 * @property {boolean} busy
 * @property {string|null} doing             the running call, e.g. "collect oak_log 4" (null when idle)
 * @property {string|null} lastResult        "<call> -> ok|failed: <result> (inventory: oak_log +4)"
 * @property {boolean} connected             false before spawn and after a disconnect
 * @property {string} [smelting]             what the bot's furnaces are working on (a background smelt), e.g.
 *   "3 iron_ingot ready in about 7 s in your furnaces at 1 64 2, 1 64 3"
 * @property {Array<{name: string, x: number, y: number, z: number}>} [stations]  crafting tables and furnaces the
 *   bot placed and owns (src/stations.js)
 *
 * @typedef {object} Body  src/body.js: export function createBody(opts): Body
 *   opts = { bot?: object, config?: Config, log?: Logger, timeouts?: Partial<TOOL_TIMEOUTS_MS>, timing?: object,
 *   reflexes?: boolean (default true), stations?: a registry from src/stations.js, console?: the server console FIFO }.
 *   With opts.bot (test/fake-bot.js) the body uses that bot as is and does not load plugins it already has; without
 *   it, it creates a mineflayer bot from config.mc (offline auth, username config.mc.username, localhost/LAN only:
 *   any other host throws) and loads mineflayer-pathfinder and mineflayer-tool. The body
 *   logs 'bot_ready', 'stop', 'death', 'attacked', 'reflex', 'reflex_idle', 'stations_retired', 'stations_removed',
 *   'disconnect' and 'bot_error' events to opts.log.
 * @property {Promise<void>} ready                       resolves once the bot has spawned (at once for an injected bot);
 *   rejects with "could not join the Minecraft server: ..." when the connection ends first
 * @property {() => string} state                        plain-text state for the model (src/state.js)
 * @property {() => StateSnapshot} snapshot
 * @property {() => Record<string, number>} inventory    {item name: count}
 * @property {() => Record<string, number>} [smelting]  what the bot's furnaces are still making for it (a background
 *   smelt), {item name: count}; the MCP check counts it as carried (a craft that needs it waits for it)
 * @property {(name: 'crafting_table'|'furnace') => boolean} [stationNear]  a station of that kind the bot may use (its
 *   own, or nobody's) stands within REUSE_RADIUS (src/stations.js); for the MCP check
 * @property {(goal: string|null) => void} setGoal       shown in the state as the current goal
 * @property {boolean} busy                              true while a skill runs
 * @property {(tool: ToolName, args: object) => Promise<SkillResult>} run
 *   Validates args with validateArgs (bad args resolve ok:false, never throw), runs one skill at a time (a call while
 *   busy resolves ok:false "busy", get_state included: read state()/snapshot() directly instead), enforces
 *   TOOL_TIMEOUTS_MS ("timed out after N s"), computes delta from the inventory before and after (on a real server
 *   both read after a resync of the player inventory, so late server updates land in the right call). Before spawn
 *   it answers "not in the game yet", after a disconnect "not connected to the game"; a death stops the running
 *   skill ("stopped: you died at x y z; ...") and the next one waits for the respawn. Reflexes (src/reflexes.js):
 *   a hit from a hostile mob during a skill (not attack, eat, get_state, say) or between skills is fought back, or run
 *   from below 8 health (the skill then ends "retreated: ..."), the bot eats at food 14 or less with no hostile mob
 *   near, and the interrupted skill goes on from where it was; what the reflexes did is appended to the next result
 *   (" [on its own: fought back a zombie and killed it (3 swings); ate bread (food 12 -> 17)]") and listed in
 *   SkillResult.reflexes. With reflexes off a hit stops the skill: "stopped: a zombie is attacking you (health
 *   14/20, ...); fight back with attack zombie, or go_to somewhere safe". SkillResult.phases: ms per part of the work
 *   (path, dig, pickup, sync, reflex...; see SkillResult).
 * @property {(reason?: string) => Promise<void>} stop    kill switch: cancels the running skill (pathfinder goal,
 *   digging, eating, controls, an open crafting or furnace window); the pending run() resolves ok:false
 *   "stopped: <reason>" (plus where a skill left things, e.g. items in a furnace). The bot stays connected.
 * @property {() => Promise<void>} close                  stop, then disconnect (safe to call twice)
 * @property {object} bot                                 the raw mineflayer (or fake) bot, e.g. for prismarine-viewer
 * @property {boolean} connected                          true between spawn and disconnect
 * @property {(event: string, fn: (data: object) => void) => () => void} on   BODY_EVENTS; returns an unsubscribe.
 *   'skill' data = {phase:'start'|'end', tool, args, ...SkillResult} (a reflex starts with reflex: true and tool
 *   attack, eat or flee; the skill it interrupted starts again with resumed: true); 'chat' = {username, message} from other
 *   players; 'end' = {reason}; 'error' = {message}; 'dig' = {x, y, z, name, ms} when the bot starts breaking a block
 *   (ms: how long it takes), null when it stops (for the live views' crack overlay).
 * @property {() => ({x: number, y: number, z: number, name: string, ms: number, elapsed: number}|null)} [digging]
 *   the block being broken right now, elapsed ms since it started
 *
 * @typedef {object} ToolCall
 * @property {string} id
 * @property {string} name
 * @property {string} arguments   raw JSON text as the model wrote it (parse with parseArgs)
 *
 * @typedef {object} ChatRequest
 * @property {Array<object>} messages      OpenAI chat messages (system, user, assistant with tool_calls, tool)
 * @property {Array<object>} [tools]       normally toolsForApi(config.model.toolSchema)
 * @property {string|null} [cacheKey]      prompt_cache_key; default config.model.cacheKey, null or '' sends none
 * @property {string} [effort]             reasoning_effort; default config.model.effort
 * @property {number} [maxTokens]          max_completion_tokens; default config.model.maxTokens (0 sends none)
 * @property {boolean} [stream]            default config.model.stream
 * @property {AbortSignal} [signal]
 * @property {object} [params]             only temperature, top_p, seed, response_format, safety_identifier pass
 *
 * @typedef {object} ChatResult
 * @property {{role:'assistant', content:string|null, tool_calls?:Array<object>}} message  push it to messages as is
 * @property {string} content
 * @property {ToolCall[]} toolCalls
 * @property {string|null} finishReason
 * @property {object} usage                raw usage block (estimated from text length if the server sent none)
 * @property {boolean} usageEstimated
 * @property {ReturnType<typeof import('./pricing.js').tokens>} tokens
 * @property {number} usd                  cost(usage, tier)
 * @property {number} ttftMs               first visible token (content or tool call)
 * @property {number|null} firstByteMs     first stream chunk of any kind
 * @property {number} latencyMs            whole call
 * @property {string|null} model           model id the server reported
 *
 * @typedef {object} LLM  src/llm.js: export function createLLM(opts): LLM
 * @property {string} model
 * @property {string} tier
 * @property {string} effort
 * @property {string} baseURL
 * @property {(req: ChatRequest) => Promise<ChatResult>} chat   throws LLMError {status, code, aborted}
 *
 * @typedef {object} DecisionRow  one JSONL line per model decision (src/log.js)
 * @property {'decision'} type
 * @property {string} time            ISO timestamp
 * @property {number} elapsedMs       since the logger started
 * @property {string} run
 * @property {number} step
 * @property {string} model
 * @property {string} effort
 * @property {string} tier
 * @property {string|null} goal
 * @property {number} promptTokens
 * @property {number} cachedTokens
 * @property {number} completionTokens  completion_tokens as reported
 * @property {number} reasoningTokens
 * @property {number} outputTokens      billed as output: completion, plus reasoning reported outside it
 * @property {number|null} ttftMs
 * @property {number|null} latencyMs
 * @property {string|null} tool
 * @property {object|null} args
 * @property {boolean} ok
 * @property {string} result
 * @property {InventoryDelta} delta
 * @property {number} costUsd
 * @property {number} totalUsd        running total for this logger
 * @property {boolean} [usageEstimated]
 * @property {string} [note]
 *
 * @typedef {object} Logger  src/log.js: export function createLogger(opts): Logger
 * @property {string} runId
 * @property {string|null} path        JSONL file, null for a memory-only logger
 * @property {(row: object) => DecisionRow} decision
 *   row = {step?, goal?, usage?, ttftMs?, latencyMs?, tool?, args?, ok?, result?, delta?, costUsd?, note?}
 * @property {(kind: string, data?: object) => object} event   e.g. run_start, run_end, milestone, stop, error.
 *   The row's type, time, elapsedMs, run and kind fields are set by the logger and overwrite the same keys in data,
 *   so event data must use other names (the brain uses `trigger` and `block`, not `kind`).
 * @property {(n?: number) => object[]} tail
 * @property {() => {decisions:number, usd:number, promptTokens:number, cachedTokens:number, completionTokens:number, outputTokens:number}} totals
 * @property {(fn: (row: object) => void) => () => void} subscribe
 * @property {() => void} close
 *
 * @typedef {object} StepResult
 * @property {number} step
 * @property {string} goal
 * @property {ToolName|null} tool       null when the model answered without a tool call
 * @property {object|null} args
 * @property {boolean} ok
 * @property {string} result
 * @property {InventoryDelta} delta
 * @property {number} usd
 * @property {number|null} ttftMs
 * @property {number|null} latencyMs
 * @property {string} text              assistant text, if any
 * @property {'model'|'invalid'} [error]  set when the step is not an answer: the model call failed ('model'), or the
 *   call named an unknown tool or arguments that do not parse or validate ('invalid'; nothing ran)
 * @property {string} [stop]            a STOP_REASONS value when this step ended the run
 *
 * @typedef {object} RunResult
 * @property {string} reason            a STOP_REASONS value
 * @property {number} steps
 * @property {number} usd
 * @property {number} ms
 * @property {StepResult|null} last
 *
 * @typedef {object} Caps  config.caps
 * @property {number} steps
 * @property {number} usdPerRun
 * @property {number} usdPerHour
 * @property {number} consecutiveErrors
 * @property {number} loopRepeat
 *
 * @typedef {object} Brain  src/brain.js: export function createBrain(opts): Brain
 *   opts = {body: Body, llm: LLM, log: Logger, caps?: Partial<Caps> (default config.caps), meter?: HourMeter
 *   (pricing.createHourMeter, shared per process), notes?: string|object|null (a notes.json path, a
 *   memory.createNotes() object, or null for memory only; default config.memory.notesPath, never a file under
 *   node --test), config?: Config, systemPrompt?: string (an evolved playbook; constant for the brain's life),
 *   cacheKey?: string|null (default `${MODEL_CACHE_KEY}-<hash of system prompt + tools>`), backoffMs?: number
 *   (pause after a model error, doubled per error in a row; default 1000)}
 *   Guards: STEP_CAP steps per run; COST_CAP_RUN and the shared COST_CAP_HOUR meter stop before a call that would
 *   likely cross them; ERROR_CAP errors in a row (model errors, invalid calls, replies without a tool call, failed
 *   skills) end the run as 'errors'. Loop guard: the same call failing LOOP_REPEAT times since it last worked, or
 *   succeeding LOOP_REPEAT times in a row without an inventory change, adds a hint to the next prompt and a lesson to
 *   the notes; a second trip on the same call ends the run as 'errors'.
 * @property {(goal: string) => Promise<StepResult>} step   one model call and at most one skill; the same goal again
 *   continues the run, a new goal starts a new one
 * @property {(goal: string, cond?: (r: StepResult, body: Body) => boolean|Promise<boolean>, opts?: {signal?: AbortSignal}) => Promise<RunResult>} runUntil
 *   steps until cond returns true ('goal') or a cap / stop / the signal ends the run. The default cond is
 *   reportedDone: the model called say with text starting "Done:" (the system prompt asks for that report)
 * @property {(reason?: string) => void} stop    aborts the model call in flight and calls body.stop()
 * @property {() => {steps:number, usd:number, errors:number, running:boolean, goal:string|null, run:object|null}} stats
 * @property {object} notes              the long-term notes (memory.createNotes): read for a /playbook page;
 *   addLesson / clearPlaces for the operator (clear places after a world reset)
 * @property {string} systemPrompt
 * @property {string|null} cacheKey
 * @property {() => void} close          stop anything running, stop listening to the body, write the notes
 *
 * @typedef {object} Web  src/web.js: export function createWeb(opts): Web
 *   opts = {config: Config, makeBody: (sessionId: string, opts?: {viewId: string}) => Body|Promise<Body>,
 *   makeBrain?: (body: Body) => Brain, log: Logger, meter?: HourMeter, trustProxy?: 'off'|'cloudflare'|number,
 *   trustedProxies?: string[], liveVideo?: (gameId) => {videoUrl, embedUrl}|null, ...timing and queue options (see web.js)}.
 *   makeBody is called with 'house' for the bot the /ask queue drives and with 'g' + 6 hex digits for each guest, plus
 *   the guest's view id (128 random bits, base64url) that its live views listen under.
 *   Without makeBrain the /ask queue is closed. An /ask request ends when the model reports "Done:" (reportedDone),
 *   answers in words without a tool call (web.askAnswered; a failed model call or an invalid call goes on), or after
 *   40 steps.
 * @property {() => Promise<{url: string, publicUrl: string}>} start
 * @property {() => Promise<void>} stop       closes the queue, ends every session (closing its bot) and the server
 * @property {() => void} sweep                ends sessions whose lease is over (also on a timer)
 *
 * @typedef {object} McpStepReport  one step in an MCP reply's structuredContent (src/mcp.js)
 * @property {number} n                  the order the call's steps run in, crafts added by the check included (a key;
 *   replies number the steps by the caller's step)
 * @property {number|null} step          the caller's step number; null for a craft the check added
 * @property {number} [before]           for a craft the check added: the caller's step it was added before
 * @property {SkillName} skill
 * @property {object} args
 * @property {'pending'|'confirmed'|'failed'|'cancelled'} status   pending = waiting in the queue or running
 * @property {boolean} [running]
 * @property {string} [result]           the skill's result text, once it ended
 * @property {InventoryDelta} [delta]    the whole inventory change while the step ran
 * @property {Record<string, number>} [used]    what the step itself used (counts), when the body can tell
 * @property {Record<string, number>} [gained]  what the step itself made or collected (counts)
 * @property {InventoryDelta} [other]    the rest of delta: blocks dug through or scaffolding placed on the way, items
 *   lying nearby picked up, the drops of cells a build dug clear
 * @property {string} [code]             a RESULT_CODES entry for a step that failed or was stopped
 * @property {string} [added]            why the check added this craft
 * @property {Array<{item: string, n: number, for?: string}>} [addedItems]   items the check put into a craft_batch
 * @property {string} [why]              why it was cancelled
 * @property {number} [ms]
 *
 * @typedef {object} McpReply  structuredContent of play, play_sequence, get_state and stop
 * @property {string|null} code          the typed outcome of the call (RESULT_CODES), null when nothing went wrong; for
 *   steps all cancelled, what cancelled them (the failed step's code, or STOPPED); for a repeat, the first call's
 *   failure code, else DUPLICATE
 * @property {string|null} game          the game id
 * @property {McpStepReport[]} steps     this call's steps
 * @property {McpStepReport[]} earlier   steps of earlier calls that finished since the last delivered reply
 * @property {{running: string|null, waiting: number}} queue
 * @property {InventoryDelta} changed    inventory change of every finished step this reply carries
 * @property {{timeLeftS: number, health?: number, food?: number, pos?: {x: number, y: number, z: number}, day?: boolean, inventory?: Record<string, number>, joining?: true}|null} state
 * @property {Array<{step: number, item: string, need: number, for?: string, anyWood?: true, note?: string}>} [missing]  NEED_ITEMS
 * @property {{ageS: number, by: 'request_id'|'same call'}} [duplicate]   a repeat of an earlier call (nothing ran again)
 * @property {Array<{step: number, text: string}>} [warnings]  what the check could not be sure of (a station or furnace
 *   output a go_to leaves far behind): the call was not refused for it
 * @property {Array<object>} [plan]      dry_run: the steps as they would run
 * @property {StateSnapshot} [full]      get_state {full: true}
 *
 * src/index.js wires these together: startAgent({config, fakeBot}) -> {url, publicUrl, log, web, stop}.
 *
 * @typedef {ReturnType<typeof import('./config.js').loadConfig>} Config
 * @typedef {ReturnType<typeof import('./pricing.js').createHourMeter>} HourMeter
 */
