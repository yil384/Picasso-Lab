// src/goals.js - what a goal says, read from the player's words (the owner, 2026-10-12: users give Muse any goal,
// "kill 100 pigs", and change it mid-game). A goal is a preset (free, iron_pickaxe, diamonds, nether, nether_and_back:
// a milestone plan), or parts read from the text where they can be read one way only, each with a count the server
// can follow:
//   kill / hunt N <mob>                    pigs killed 37 of 100 (the body's kills: hunt, attack and its reflexes)
//   collect / mine / get N <item or block> cobblestone 12 of 64 (what came into the inventory; mine N stone counts its
//                                          drop, cobblestone)
//   craft / make / smelt N <item>          torches crafted 8 of 20 (what crafts and smelts made)
//   reach y <Y> | <x> <z> | <x> <y> <z> | the Nether | the End
//   build <blueprint>                      a hut_3x3, a shelter, a nether_portal ... (builds that were done)
//   survive N nights | days                (dawns reached with no death that night, or that day)
// Several parts may be joined with "and", "then" or commas. Text none of this reads stays a plain goal, shown as text
// and never counted. Number words (one to twenty, the tens, a hundred, a dozen) count as numbers; "a" or "an" as one.
import { registryFor } from './mc.js';
import { SMELT } from './game.js';
import { nameOf } from './tolerant.js';

/** The preset goals, each the milestone it ends with (src/report.js MILESTONES). */
export const GOALS = Object.freeze({
  free: null, // every milestone is watched; none is the goal
  iron_pickaxe: 'iron_pickaxe',
  diamonds: 'diamond_pickaxe',
  nether: 'nether',
  nether_and_back: 'back',
});
export const GOAL_NAMES = Object.freeze(Object.keys(GOALS));
/** Each preset in a few words (the stream's checklist title). */
export const GOAL_TITLES = Object.freeze({ free: 'Free play', iron_pickaxe: 'Iron pickaxe', diamonds: 'Diamonds', nether: 'The Nether', nether_and_back: 'Nether and back' });

/** The most per step: collect, craft, smelt and hunt take n up to 64. */
export const PER_STEP = 64;
/** The most a count goal may ask for. */
export const MAX_COUNT = 10_000;

const NUMBERS = Object.freeze({
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
});
const IRREGULAR = Object.freeze({ endermen: 'enderman', sheep: 'sheep', mice: 'mouse', wolves: 'wolf', fish: 'fish', cod: 'cod', salmon: 'salmon', squid: 'squid' });
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak'];

/**
 * The names a goal may use, from the server's skills and the game's item list.
 * @param {{schemas?: object}} [skills]  the skill set (its hunt, attack, collect, craft and build enums)
 * @param {{huntDrops?: Record<string, string[]>, dropOf?: (block: string) => string|null, version?: string}} [o]
 */
export function lexiconFrom(skills = null, { huntDrops = {}, dropOf = null, version = '1.21.4' } = {}) {
  const S = skills?.schemas ?? {};
  const en = (skill, key) => S[skill]?.properties?.[key]?.enum ?? [];
  const reg = (() => { try { return registryFor(version); } catch { return null; } })();
  const items = reg ? Object.keys(reg.itemsByName) : [];
  const hunt = en('hunt', 'mob');
  const attack = en('attack', 'target').filter((m) => m !== 'nearest_hostile');
  const smelted = [...new Set(Object.values(SMELT))];
  return Object.freeze({
    items,
    mobs: [...new Set([...hunt, ...attack])],
    huntable: hunt,
    attackable: attack,
    hostile: new Set(reg ? Object.values(reg.entitiesByName ?? {}).filter((e) => e.type === 'hostile').map((e) => e.name) : []),
    blocks: en('collect', 'block'),
    craftable: [...new Set([...en('craft', 'item'), ...smelted])],
    smeltFrom: Object.fromEntries(smelted.map((out) => [out, Object.keys(SMELT).filter((k) => SMELT[k] === out)])),
    blueprints: en('build', 'blueprint'),
    huntDrops,
    dropOf: dropOf ?? (() => null),
  });
}

let fallback = null;
/** The lexicon of the default skills (tests, and goalOf without one). */
const defaultLexicon = () => {
  if (!fallback) fallback = lexiconFrom(null);
  return fallback;
};

const words = (s) => s.replace(/_/g, ' ');
/** A mob's name for a count: pigs, sheep, endermen, zombified piglins. */
export function mobsWord(mob, n = 2) {
  const w = words(mob);
  if (n === 1) return w;
  const irr = Object.entries(IRREGULAR).find(([, one]) => one === mob)?.[0];
  if (irr) return words(irr);
  return /(ch|sh|x|ss)$/.test(w) ? `${w}es` : `${w}s`;
}
const itemWord = (item) => words(item);
// what is counted by the piece reads in the plural (torches, diamonds, oak logs); stuff does not (cobblestone, beef)
const MASS = /(stone|cobblestone|deepslate|dirt|sand|gravel|obsidian|clay|beef|porkchop|mutton|chicken|rabbit|cod|salmon|wool|glass|netherrack|iron|gold|copper|coal|redstone|flint|string|leather|bread|lapis_lazuli|wheat|steel|ink_sac|gunpowder|tuff|granite|diorite|andesite|grass|moss|ore)$/;
/** An item's name for a count: 20 torches, 64 cobblestone. */
export function itemsWord(item, n = 2) {
  const w = itemWord(item);
  if (n === 1 || MASS.test(item) || /s$/.test(item)) return w;
  return /(ch|sh|x)$/.test(w) ? `${w}es` : `${w}s`;
}

/** A count at tokens[i]: digits, number words ("twenty five", "a hundred", "a dozen"), or "a"/"an"/"one" when allowed. */
function countAt(tokens, i, { one = true } = {}) {
  const t = tokens[i];
  if (t === undefined) return null;
  if (/^\d{1,5}$/.test(t)) return { n: Number(t), used: 1 };
  if ((t === 'a' || t === 'an' || t === 'one') && tokens[i + 1] === 'hundred') return { n: 100, used: 2 };
  if ((t === 'a' || t === 'an') && tokens[i + 1] === 'dozen') return { n: 12, used: 2 };
  if (t === 'hundred') return { n: 100, used: 1 };
  if (NUMBERS[t] !== undefined) {
    if (NUMBERS[t] >= 20 && NUMBERS[tokens[i + 1]] !== undefined && NUMBERS[tokens[i + 1]] < 10) return { n: NUMBERS[t] + NUMBERS[tokens[i + 1]], used: 2 };
    if (tokens[i + 1] === 'hundred') return { n: NUMBERS[t] * 100, used: 2 };
    return { n: NUMBERS[t], used: 1 };
  }
  if (one && (t === 'a' || t === 'an' || t === 'the')) return { n: 1, used: 1 };
  return null;
}
// control characters plus the two Unicode line separators
const CONTROL = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029]+', 'g');
const isNum = (t) => /^[+-]?\d{1,6}$/.test(t ?? '');

/** The longest name (1 to 4 words) at tokens[i] that is one of `allowed` one way only. */
function nameAt(tokens, i, allowed, { inventory = null, singular = true } = {}) {
  for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
    const raw = tokens.slice(i, i + len).join('_');
    if (!/^[a-z][a-z0-9_]*$/.test(raw)) continue;
    const forms = [raw];
    if (singular) {
      const last = tokens[i + len - 1];
      if (IRREGULAR[last]) forms.push(tokens.slice(i, i + len - 1).concat(IRREGULAR[last]).join('_'));
    }
    for (const f of forms) {
      if (allowed.includes(f)) return { name: f, used: len };
      const r = nameOf(f, allowed, { inventory, byInventory: false });
      if (r.value) return { name: r.value, used: len };
      if (r.candidates) return { unclear: r.candidates, used: len };
    }
  }
  return null;
}

const KILL = new Set(['kill', 'hunt', 'slay', 'defeat', 'slaughter', 'murder', 'fight']);
const COLLECT = new Set(['collect', 'mine', 'get', 'gather', 'obtain', 'chop', 'dig', 'harvest', 'grab', 'farm', 'find', 'acquire', 'have']);
const CRAFT = new Set(['craft', 'make', 'smelt', 'cook', 'forge', 'create']);
const BUILD = new Set(['build', 'construct', 'make', 'erect', 'create']);
const REACH = new Set(['reach', 'go', 'get', 'walk', 'travel', 'head', 'climb', 'dig', 'descend', 'return']);
const FILLER = new Set(['please', 'then', 'first', 'also', 'finally', 'next', 'to', 'try', 'and', 'i', 'want', 'you', 'can', 'could', 'should', 'would', 'like', 'lets', "let's", 'let', 'us', 'go', 'and', 'some', 'at', 'least']);

/** One clause's part, or null (the clause says nothing the server can count), or {unclear} (a name that could be several). */
function partOf(tokens, lex, inventory) {
  // leading filler: "please", "then", "I want you to", "try to"
  let i = 0;
  while (i < tokens.length && FILLER.has(tokens[i]) && !(tokens[i] === 'go' && /^(to|down|up|back)$/.test(tokens[i + 1] ?? ''))) i++;
  const verb = tokens[i];
  const rest = (k) => tokens.slice(k);
  if (!verb) return null;

  // the way to the Nether and back (the word was joined before the split)
  if (tokens.includes('nether_and_back')) return { kind: 'back' };

  // reach: "reach y -59", "go down to y=-59", "go to 100 -200", "reach the end", "get to the nether"
  const reachAt = (() => {
    if (verb === 'reach') return i + 1;
    if (REACH.has(verb)) {
      let k = i + 1;
      while (/^(down|up|back|over|all|the|way)$/.test(tokens[k] ?? '')) k++;
      if (tokens[k] === 'to') return k + 1;
    }
    return null;
  })();
  if (reachAt !== null) {
    const r = reachOf(rest(reachAt));
    if (r) return r;
  }

  if (KILL.has(verb)) {
    const c = countAt(tokens, i + 1, { one: true });
    if (!c) return null;
    const nm = nameAt(tokens, i + 1 + c.used, lex.mobs);
    if (nm?.unclear) return { unclear: `which mob: ${nm.unclear.slice(0, 6).join(', ')}` };
    if (!nm) return null;
    return { kind: 'kill', target: nm.name, n: c.n };
  }
  // build before craft: "make a hut", "build 2 shelters"
  if (BUILD.has(verb)) {
    const c = countAt(tokens, i + 1, { one: true }) ?? { n: 1, used: 0 };
    const bp = blueprintAt(tokens, i + 1 + c.used, lex.blueprints);
    if (bp) return { kind: 'build', blueprint: bp, n: c.n };
  }
  if (CRAFT.has(verb)) {
    const c = countAt(tokens, i + 1, { one: true });
    if (!c) return null;
    const nm = nameAt(tokens, i + 1 + c.used, lex.craftable, { inventory });
    if (nm?.unclear) return { unclear: `which item: ${nm.unclear.slice(0, 6).join(', ')}` };
    if (!nm) return null;
    return { kind: 'craft', item: nm.name, n: c.n };
  }
  if (COLLECT.has(verb)) {
    const c = countAt(tokens, i + 1, { one: true });
    if (!c) return null;
    const at = i + 1 + c.used;
    // a block mined for what it drops: "mine 64 stone" counts cobblestone, "mine 10 iron ore" raw_iron
    if (verb === 'mine' || verb === 'dig') {
      const b = nameAt(tokens, at, lex.blocks);
      if (b?.name) {
        const drop = lex.dropOf(b.name);
        return { kind: 'collect', item: drop ?? b.name, n: c.n, ...(drop ? { block: b.name } : {}) };
      }
    }
    const nm = nameAt(tokens, at, lex.items);
    if (nm?.unclear) return { unclear: `which item: ${nm.unclear.slice(0, 6).join(', ')}` };
    if (!nm) return null;
    return { kind: 'collect', item: nm.name, n: c.n };
  }
  if (verb === 'survive' || verb === 'last' || (verb === 'stay' && tokens[i + 1] === 'alive')) {
    let k = verb === 'stay' ? i + 2 : i + 1;
    if (tokens[k] === 'for') k++;
    const c = countAt(tokens, k, { one: true });
    if (!c) return null;
    const unit = tokens[k + c.used];
    if (/^nights?$/.test(unit ?? '')) return { kind: 'survive', unit: 'night', n: c.n };
    if (/^days?$/.test(unit ?? '')) return { kind: 'survive', unit: 'day', n: c.n };
    return null;
  }
  return null;
}

/** Where to reach: y, x z, x y z, a dimension. */
function reachOf(t) {
  let k = 0;
  while (t[k] === 'the' || t[k] === 'a') k++;
  const w = t[k];
  if (w === 'nether') return { kind: 'reach', dim: 'the_nether' };
  if (w === 'end') return { kind: 'reach', dim: 'the_end' };
  if (/^(y|level|height|depth)$/.test(w ?? '') && isNum(t[k + 1])) return { kind: 'reach', y: Number(t[k + 1]) };
  if (w === 'x' && isNum(t[k + 1])) {
    const out = { kind: 'reach', x: Number(t[k + 1]) };
    let j = k + 2;
    if (t[j] === 'y' && isNum(t[j + 1])) { out.y = Number(t[j + 1]); j += 2; }
    if (t[j] === 'z' && isNum(t[j + 1])) { out.z = Number(t[j + 1]); return out; }
    return null;
  }
  if (isNum(w) && isNum(t[k + 1])) {
    if (isNum(t[k + 2])) return { kind: 'reach', x: Number(w), y: Number(t[k + 1]), z: Number(t[k + 2]) };
    return { kind: 'reach', x: Number(w), z: Number(t[k + 1]) };
  }
  return null;
}

/** A blueprint by its name or the start of it ("hut" is hut_3x3, "nether portal" and "portal" nether_portal). */
function blueprintAt(tokens, i, blueprints) {
  for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
    const raw = tokens.slice(i, i + len).join('_');
    const forms = [raw, raw.replace(/s$/, ''), raw.replace(/es$/, '')];
    for (const f of forms) {
      if (blueprints.includes(f)) return f;
      if (f === 'portal' && blueprints.includes('nether_portal')) return 'nether_portal';
      const starts = blueprints.filter((b) => b.startsWith(`${f}_`));
      if (starts.length === 1) return starts[0];
    }
  }
  return null;
}

/** A part's key, its label on the checklist, and its words in the goal's title. */
export function describePart(p) {
  switch (p.kind) {
    case 'kill': return { k: `kill_${p.target}`.slice(0, 24), t: `${mobsWord(p.target)} killed`, title: `kill ${p.n} ${mobsWord(p.target, p.n)}` };
    case 'collect': return { k: `get_${p.item}`.slice(0, 24), t: `${itemsWord(p.item)} collected`, title: p.block ? `mine ${p.n} ${itemsWord(p.block, p.n)}` : `collect ${p.n} ${itemsWord(p.item, p.n)}` };
    case 'craft': return { k: `make_${p.item}`.slice(0, 24), t: `${itemsWord(p.item)} made`, title: `craft ${p.n} ${itemsWord(p.item, p.n)}` };
    case 'build': return { k: `build_${p.blueprint}`.slice(0, 24), t: `${itemsWord(p.blueprint)} built`, title: `build ${p.n > 1 ? `${p.n} ${itemsWord(p.blueprint, p.n)}` : `a ${itemWord(p.blueprint)}`}` };
    case 'survive': return { k: `survive_${p.unit}`, t: `${p.unit}s survived`, title: `survive ${p.n} ${p.unit}${p.n === 1 ? '' : 's'}` };
    case 'back': return { k: 'nether_back', t: 'Nether and back', title: 'the Nether and back' };
    case 'reach':
      if (p.dim) return { k: `reach_${p.dim}`.slice(0, 24), t: p.dim === 'the_nether' ? 'the Nether' : 'the End', title: `reach ${p.dim === 'the_nether' ? 'the Nether' : 'the End'}` };
      if (p.x !== undefined) { const at = `${p.x}${p.y !== undefined ? ` ${p.y}` : ''} ${p.z}`; return { k: 'reach_xz', t: `reach ${at}`, title: `reach ${at}` }; }
      return { k: 'reach_y', t: `reach y ${p.y}`, title: `reach y ${p.y}` };
    default: return { k: 'part', t: 'part', title: 'part' };
  }
}

/**
 * A goal from start_game's or set_goal's argument: a preset key; else the parts its text says; else a preset named in
 * words ("go to the Nether and back"); else a plain text goal (shown, never counted).
 * @returns {{key: string, text: string|null, title: string, parts: object[]|null, unclear?: string[]}}
 */
export function goalOf(raw, lex = defaultLexicon(), { inventory = null } = {}) {
  const g = String(raw ?? '').replace(CONTROL, ' ').trim().slice(0, 120);
  if (!g) return { key: 'free', text: null, title: GOAL_TITLES.free, parts: null };
  const key = g.toLowerCase().replace(/[\s-]+/g, '_');
  if (GOALS[key] !== undefined) return { key, text: null, title: GOAL_TITLES[key], parts: null };

  // the words: lower case, "flint and steel" and "the Nether and back" one word each, coordinates kept together
  const norm = g.toLowerCase()
    .replace(/minecraft:/g, '')
    .replace(/flint\s*(?:and|&|n)\s*steel/g, 'flint_and_steel')
    .replace(/(?:the\s+)?nether\s+and\s+(?:then\s+)?(?:come\s+|get\s+|go\s+|make\s+it\s+)?back(?:\s+again)?/g, 'nether_and_back')
    .replace(/(?:the\s+)?nether\s+and\s+return/g, 'nether_and_back')
    .replace(/\b([xyz])\s*[=:]\s*/g, '$1 ')
    .replace(/(-?\d+)\s*,\s*(?=[xyz]\s|[+-]?\d)/g, '$1 ')
    .replace(/[()[\]{}"]/g, ' ');
  const clauses = norm.split(/\s*(?:[,;.!?]|\band then\b|\bthen\b|\band\b|\bafter that\b|\bplus\b)\s*/).map((c) => c.trim()).filter(Boolean);
  const parts = [];
  const unclear = [];
  let unread = 0;
  for (const c of clauses) {
    const tokens = c.split(/\s+/).filter(Boolean);
    const p = partOf(tokens, lex, inventory);
    if (p?.unclear) { unclear.push(p.unclear); unread += 1; continue; }
    if (p && p.n !== undefined && !(p.n >= 1 && p.n <= MAX_COUNT)) { unread += 1; continue; }
    if (p) parts.push(p);
    else if (tokens.some((t) => !FILLER.has(t))) unread += 1;
  }
  // one part that is a preset's way: the preset, with its milestone plan
  if (parts.length === 1 && !unread) {
    if (parts[0].kind === 'back') return { key: 'nether_and_back', text: g, title: GOAL_TITLES.nether_and_back, parts: null };
    if (parts[0].kind === 'reach' && parts[0].dim === 'the_nether') return { key: 'nether', text: g, title: GOAL_TITLES.nether, parts: null };
  }
  if (parts.length) {
    const seen = new Set();
    const uniq = parts.filter((p) => { const k = describePart(p).k; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
    const title = uniq.map((p) => describePart(p).title).join(', ');
    return { key: 'custom', text: g, title: title.length > 40 ? `${title.slice(0, 39)}~` : title, parts: uniq, ...(unclear.length ? { unclear } : {}) };
  }
  // a preset named in words, without a count
  if (/nether/i.test(g) && /back|return/i.test(g)) return { key: 'nether_and_back', text: g, title: GOAL_TITLES.nether_and_back, parts: null };
  if (/nether/i.test(g)) return { key: 'nether', text: g, title: GOAL_TITLES.nether, parts: null };
  if (/diamond/i.test(g) && !/\d/.test(g)) return { key: 'diamonds', text: g, title: GOAL_TITLES.diamonds, parts: null };
  if (/iron/i.test(g) && /pick/i.test(g) && !/\d/.test(g)) return { key: 'iron_pickaxe', text: g, title: GOAL_TITLES.iron_pickaxe, parts: null };
  return { key: 'free', text: g, title: g.length > 40 ? `${g.slice(0, 39)}~` : g, parts: null, ...(unclear.length ? { unclear } : {}) };
}

/** Two goals the same (set_goal with the goal already set changes nothing). */
export function sameGoal(a, b) {
  if (!a || !b || a.key !== b.key) return false;
  if (a.key === 'custom') return JSON.stringify(a.parts) === JSON.stringify(b.parts);
  if (a.key === 'free') return (a.text ?? '') === (b.text ?? '');
  return true;
}

/**
 * How to do one part with this server's skills, its caps and what the server counts: the plan's line for it.
 * @param {object} p  a part
 * @param {ReturnType<typeof lexiconFrom>} lex
 * @param {{leaseMin?: number}} [o]
 */
export function partHow(p, lex = defaultLexicon(), { leaseMin = 30 } = {}) {
  const split = (n, per = PER_STEP) => (n > per ? ` ${n} is more than one step takes (at most ${per}): split it across several calls (one step of up to ${per} each), and watch the count in each reply.` : '');
  switch (p.kind) {
    case 'kill': {
      const drops = lex.huntDrops?.[p.target] ?? [];
      const hostile = lex.hostile?.has?.(p.target);
      const shield = hostile ? ' A hostile mob needs a shield carried (or without_shield: true).' : '';
      if (lex.huntable.includes(p.target) && drops.length) {
        return `hunt {mob: ${p.target}, drop: ${drops[0]}, n} hunts ${mobsWord(p.target)} until n ${drops[0]} came in: n counts drops, not kills (one ${words(p.target)} drops about 1 to 3), at most ${PER_STEP} a step.${p.n > 20 ? ` ${p.n} ${mobsWord(p.target, p.n)} take several hunt steps: split them across calls (for example n 20 a step) and watch the count in each reply.` : ''} The server counts every ${words(p.target)} the bot kills (hunt, attack, or a reflex). When none are left near you the hunt says so: explore 1 to 3 chunks (explore {heading, chunks}) and hunt again; no skill here breeds animals.${shield}`;
      }
      if (lex.attackable.includes(p.target)) return `attack {target: ${p.target}} fights the nearest one until it dies: one kill a step (play_sequence takes up to 32 steps). The server counts every kill.${shield} When none are near, explore to find more.`;
      return `no skill here hunts ${mobsWord(p.target)} for you; the server still counts any the bot kills.`;
    }
    case 'collect': {
      const from = p.block ?? (lex.blocks.includes(p.item) ? p.item : lex.blocks.find((b) => lex.dropOf(b) === p.item) ?? null);
      const counted = `The server counts the ${words(p.item)} you carry or have gained since the goal was set, whichever is more.`;
      if (from) return `collect {block: ${from}, n} mines it${from !== p.item ? ` (it drops ${words(p.item)})` : ''}, at most ${PER_STEP} a step.${split(p.n)} ${counted}`;
      const mob = Object.entries(lex.huntDrops ?? {}).find(([, d]) => d.includes(p.item))?.[0];
      if (mob) return `hunt {mob: ${mob}, drop: ${p.item}, n} (at most ${PER_STEP} a step).${split(p.n)} ${counted}`;
      if (lex.craftable.includes(p.item)) return `craft or smelt it (craft {item: ${p.item}, n}, at most ${PER_STEP} a step).${split(p.n)} ${counted}`;
      return `no skill here gathers ${words(p.item)} directly (pick_up takes items lying near you). ${counted}`;
    }
    case 'craft': {
      const from = lex.smeltFrom?.[p.item];
      const how = from?.length ? `smelt {item: ${from[0]}, n} (it makes ${words(p.item)})` : `craft {item: ${p.item}, n}`;
      return `${how}, at most ${PER_STEP} a step; craft_batch makes up to 12 kinds in one step.${split(p.n)} The server counts what your crafts and smelts made since the goal was set.`;
    }
    case 'build':
      return `build {blueprint: ${p.blueprint}, material}${p.n > 1 ? `, ${p.n} times` : ''}${p.blueprint === 'nether_portal' ? ' (from 10 to 14 obsidian, on open, dry ground)' : ''}. The server counts the builds that were done.`;
    case 'survive': {
      const fit = Math.floor(leaseMin / 20);
      return `a night is about 8 minutes and a whole day 20; shelter or sleep before dark. A ${p.unit} counts at dawn when the bot did not die during it. This game lasts ${leaseMin} min: ${fit ? `about ${fit} ${p.unit}${fit === 1 ? '' : 's'} fit${fit === 1 ? 's' : ''}` : `less than a whole ${p.unit} fits, though a night that has begun can still be survived`}.`;
    }
    case 'back': return 'the way of goal nether_and_back: a portal (14 obsidian, flint and steel), portal light, portal enter, then portal enter again (set_goal nether_and_back gives the plan step by step).';
    case 'reach':
      if (p.dim === 'the_nether') return 'a portal: 14 obsidian (a water bucket and a still lava pool), flint and steel, build nether_portal, portal light, portal enter (set_goal nether gives the plan step by step).';
      if (p.dim) return 'no skill here reaches the End; the server watches for it all the same.';
      if (p.x !== undefined) return `go_to {x, y, z} walks at most 256 blocks a step: a longer way takes several go_to legs. It counts within 5 blocks of ${p.x} ${p.z}${p.y !== undefined ? ` and 3 of y ${p.y}` : ''}, in the Overworld.`;
      return `go_to the same x and z at y ${p.y} (y is the height of your feet; the body digs down or builds up). It counts within 2 blocks of y ${p.y}.`;
    default: return '';
  }
}
