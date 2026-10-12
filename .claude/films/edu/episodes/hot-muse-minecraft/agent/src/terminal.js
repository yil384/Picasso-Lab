// src/terminal.js - the terminal under the live video (the agent's side): what the player called, what came back, the
// Body advice, the reflexes, deaths and milestones, as short ASCII lines, and a status line (health, food, the game
// clock, who acted). muse.ai's panel shows only Facebook's player, so this is drawn into the video by the camera
// (src/terminal-panel.js); the agent sends it over the camera service's loopback caption endpoint, for the filmed game
// only. Every line is ASCII, without tokens, keys, addresses or the names of other players.

export const KINDS = Object.freeze(['call', 'ok', 'fail', 'advice', 'reflex', 'body', 'milestone', 'info', 'checked', 'follow']);
/** Why nothing runs, for the stream's status line: Muse sheltering or asleep for the night, looking, thinking. */
export const IDLE_REASONS = Object.freeze(['waiting', 'checking', 'shelter', 'shelter_body', 'sleep', 'nether']);
/** The kinds of the body's live sub-steps (src/mineai/body.js subStepOf). */
export const SUB_KINDS = Object.freeze(['walk', 'mine', 'build', 'bucket', 'smelt', 'fight', 'eat', 'sleep', 'explore', 'other']);

/** A terminal update from outside (the camera service's caption endpoint): kinds checked, every text cleaned again. */
export function cleanTerm(u) {
  const int = (v, lo, hi) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : undefined);
  const lines = (Array.isArray(u?.lines) ? u.lines : []).slice(-40)
    .filter((l) => KINDS.includes(l?.k) && typeof l.t === 'string')
    .map((l) => {
      const out = { k: l.k, t: clean(l.t) };
      const say = typeof l.say === 'string' ? clean(l.say, 120) : '';
      if (say) out.say = say;
      const why = typeof l.why === 'string' ? clean(l.why, 80) : '';
      if (why) out.why = why;
      const words = typeof l.words === 'string' ? cutWords(clean(l.words, 600), WORDS_MAX) : ''; // Muse's own words with a call
      if (words) out.words = words;
      // ms; the step's number in the reply (n of of); its call's number in the game (c) and Muse's own step number (s),
      // pre: a craft the check added before Muse's step s, pt of pts: a part of a step split in parts
      for (const [key, lo, hi] of [['ms', 0, 86_400_000], ['n', 1, 64], ['of', 1, 64], ['c', 1, 100_000], ['s', 1, 64], ['pt', 1, 64], ['pts', 1, 64]]) { const v = int(l[key], lo, hi); if (v !== undefined) out[key] = v; }
      if (l.pre) out.pre = 1;
      if (l.ok) out.ok = 1;
      if (typeof l.ak === 'string' && /^[a-z_]{1,24}$/.test(l.ak)) out.ak = l.ak;
      if (typeof l.tool === 'string' && /^[a-z_]{1,24}$/.test(l.tool)) out.tool = l.tool;
      if (Array.isArray(l.steps)) {
        // a call's steps, each in plain words and as Muse wrote it
        out.steps = l.steps.slice(0, 16).filter((x) => x && typeof x === 'object')
          .map((x) => ({ say: clean(x.say, 80), raw: clean(x.raw, 64) })).filter((x) => x.say || x.raw);
      }
      return out;
    }).filter((l) => l.t);
  const out = { lines, status: typeof u?.status === 'string' ? clean(u.status, 120) : '' };
  if (u?.st && typeof u.st === 'object') {
    const st = {};
    for (const [key, lo, hi] of [['hp', 0, 20], ['food', 0, 20], ['muse', 0, 1e6], ['reflex', 0, 1e6], ['pct', 0, 100], ['ticks', 0, 23_999]]) { const v = int(u.st[key], lo, hi); if (v !== undefined) st[key] = v; }
    const clock = typeof u.st.clock === 'string' ? clean(u.st.clock, 16) : '';
    if (/^(?:(?:DAY|NIGHT) \d\d:\d\d|NETHER|END)$/.test(clock)) st.clock = clock;
    out.st = st;
  }
  if (u?.live && typeof u.live === 'object') {
    const l = u.live;
    const live = { mode: l.mode === 'run' ? 'run' : 'idle' };
    if (live.mode === 'idle') live.reason = IDLE_REASONS.includes(l.reason) ? l.reason : 'waiting';
    const step = typeof l.step === 'string' ? clean(l.step, 120) : '';
    if (step) live.step = step;
    for (const [key, lo, hi] of [['sinceS', 0, 86_400], ['dawnS', 0, 1_200], ['c', 1, 100_000], ['s', 1, 64]]) { const v = int(l[key], lo, hi); if (v !== undefined) live[key] = v; }
    out.live = live;
  }
  if (u && 'sub' in u) {
    // the body's live sub-step for the running command (null: none now)
    const sb = u.sub;
    const text = sb && typeof sb.text === 'string' ? clean(sb.text, 80) : '';
    if (!text) out.sub = null;
    else {
      out.sub = { kind: SUB_KINDS.includes(sb.kind) ? sb.kind : 'other', text };
      for (const [key, lo, hi] of [['done', 0, 100_000], ['of', 1, 100_000], ['left', 0, 100_000]]) { const v = int(sb[key], lo, hi); if (v !== undefined) out.sub[key] = v; }
    }
  }
  if (u?.goal && typeof u.goal === 'object') {
    // the goal from start_game and its milestones with the time each was reached (src/report.js progress), for the
    // stream's checklist
    const g = u.goal;
    const goal = { key: /^[a-z_]{1,24}$/.test(String(g.key)) ? String(g.key) : 'free', title: clean(g.title, 40) || 'Goal', reached: g.reached === true };
    const words = typeof g.text === 'string' ? clean(g.text, 80) : '';
    if (words) goal.text = words;
    goal.list = (Array.isArray(g.list) ? g.list : []).slice(0, 16)
      .filter((m) => typeof m?.k === 'string' && /^[a-z_]{1,24}$/.test(m.k) && typeof m.t === 'string')
      .map((m) => ({ k: m.k, t: clean(m.t, 32), atS: int(m.atS, 0, 86_400) ?? null })).filter((m) => m.t);
    out.goal = goal;
  }
  // the call a reply answered: its number in the game (the steps' results name it)
  { const v = int(u?.bind, 1, 100_000); if (v !== undefined) out.bind = v; }
  if (u?.inv && typeof u.inv === 'object') {
    // the items that matter on the way, as counts; the best pickaxe by its material
    const inv = {};
    for (const k of INV_KEYS) { const v = int(u.inv[k], 0, 100_000); if (v !== undefined) inv[k] = v; }
    if (PICKS.includes(u.inv.pick)) inv.pick = u.inv.pick;
    out.inv = inv;
  }
  if (u?.pos && typeof u.pos === 'object') {
    const pos = {};
    const y = int(u.pos.y, -64, 320);
    if (y !== undefined) pos.y = y;
    const place = typeof u.pos.place === 'string' ? clean(u.pos.place, 40) : '';
    if (place) pos.place = place;
    out.pos = pos;
  }
  if (u?.game && typeof u.game === 'object') {
    // the game on camera and how long it has run, for the header
    const id = typeof u.game.id === 'string' && /^[A-Za-z0-9_-]{1,16}$/.test(u.game.id) ? u.game.id : '';
    const el = int(u.game.s, 0, 864_000);
    out.game = { ...(id ? { id } : {}), ...(el !== undefined ? { s: el } : {}) };
  }
  if (Array.isArray(u?.adv)) {
    out.adv = u.adv.slice(0, 6)
      .filter((a) => typeof a?.k === 'string' && /^[a-z_]{1,24}$/.test(a.k) && typeof a.t === 'string')
      .map((a) => ({ k: a.k, t: clean(a.t, 160), sev: int(a.sev, 1, 3) ?? 1 })).filter((a) => a.t);
  }
  return out;
}

/** Items whose first appearance in a game is a milestone line. */
const MILESTONES = Object.freeze({
  wooden_pickaxe: 'a wooden pickaxe', stone_pickaxe: 'a stone pickaxe', iron_ingot: 'the first iron', iron_pickaxe: 'an iron pickaxe',
  furnace: 'a furnace', shield: 'a shield', bed: 'a bed', diamond: 'the first diamond', diamond_pickaxe: 'a diamond pickaxe',
  bucket: 'a bucket', obsidian: 'obsidian', flint_and_steel: 'flint and steel', blaze_rod: 'a blaze rod', ender_pearl: 'an ender pearl',
  ender_eye: 'an eye of ender',
});

/**
 * A line safe to film: ASCII only, no other player's name (bots are "Name_XXXXXXX"), no address, no token-like run of
 * 20 or more letters and digits, one line, at most `max` characters.
 */
export function clean(text, max = 240) {
  return String(text ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '[addr]')
    .replace(/\bhttps?:\/\/\S+/gi, '[link]')
    // a bot's private name: a capitalised base, "_", and random letters and digits (item names are all lower case)
    .replace(/\b[A-Z][A-Za-z0-9]{1,7}_(?=[A-Za-z0-9]*[0-9A-Z])[A-Za-z0-9]{6,16}\b/g, 'a player')
    // a token or key: 20 or more letters and digits with both in it (item names are split by underscores)
    .replace(/(?=[A-Za-z0-9+/=-]*\d)(?=[A-Za-z0-9+/=-]*[A-Za-z])[A-Za-z0-9+/=-]{20,}/g, '***')
    .replace(/ {3,}/g, '  ')
    .trim()
    .slice(0, max);
}

/** Muse's own words with a call, at most this long on the stream. */
export const WORDS_MAX = 140;
/** At most max characters: cut at a word, with "...", when longer (never mid-word). */
export function cutWords(text, max) {
  const t = String(text ?? '').trim();
  if (t.length <= max) return t;
  const room = t.slice(0, max - 3);
  const at = room.lastIndexOf(' ');
  return `${(at > max / 2 ? room.slice(0, at) : room).replace(/[\s,;:.-]+$/, '')}...`;
}

/** The inventory counts the stream's HUD shows (src/ui-panel.js) and the pickaxes, best first. */
export const INV_KEYS = Object.freeze(['diamond', 'iron', 'raw_iron', 'obsidian', 'flint_and_steel', 'water_bucket', 'lava_bucket', 'bucket', 'food', 'shield']);
export const PICKS = Object.freeze(['diamond', 'iron', 'stone', 'wooden']);
const FOOD = /^(?:bread|apple|golden_apple|carrot|baked_potato|potato|cooked_[a-z_]+|beef|porkchop|chicken|mutton|rabbit|cod|salmon|melon_slice|sweet_berries|glow_berries|cookie|pumpkin_pie|beetroot|mushroom_stew|rabbit_stew|beetroot_soup|dried_kelp)$/;
/** The HUD's items from an inventory ({name: count}) and what is worn or held in the off-hand ({slot: "name n"}). */
export function invOf(inventory, equipment) {
  const inv = inventory && typeof inventory === 'object' ? inventory : {};
  const n = (k) => Math.max(0, Math.round(Number(inv[k]) || 0));
  const out = { diamond: n('diamond'), iron: n('iron_ingot'), raw_iron: n('raw_iron'), obsidian: n('obsidian'), flint_and_steel: n('flint_and_steel'), water_bucket: n('water_bucket'), lava_bucket: n('lava_bucket'), bucket: n('bucket') };
  out.food = Object.entries(inv).filter(([k]) => FOOD.test(k)).reduce((a, [, v]) => a + Math.max(0, Math.round(Number(v) || 0)), 0);
  out.shield = n('shield') + (Object.values(equipment && typeof equipment === 'object' ? equipment : {}).some((x) => /^shield\b/.test(String(x))) ? 1 : 0);
  const pick = PICKS.find((m) => n(`${m}_pickaxe`) > 0);
  if (pick) out.pick = pick;
  return out;
}
const WOODS = { birch: 'birch forest', oak: 'oak woods', spruce: 'spruce forest', dark_oak: 'dark forest', jungle: 'jungle', acacia: 'savanna', mangrove: 'swamp', cherry: 'cherry grove', pale_oak: 'pale garden' };
/**
 * Where the bot is, in a few plain words, from what the body knows cheaply: its dimension, its y and the trees around
 * (the body's block scan): "the Nether", "deep caves" (below y 0), "caves", "surface, birch forest", "underground,
 * under a birch forest" (well below the trees), "mountains".
 */
export function placeOf(dim, y, blocks) {
  if (dim === 'the_nether') return 'the Nether';
  if (dim === 'the_end') return 'the End';
  if (!Number.isFinite(y)) return '';
  if (y < 0) return 'deep caves';
  if (y < 40) return 'caves';
  const logs = (Array.isArray(blocks) ? blocks : []).filter((b) => /_log$/.test(String(b?.name)) && Number.isFinite(b?.nearest?.y) && Math.abs(b.nearest.y - y) <= 16);
  const log = logs.sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99))[0];
  if (log) {
    const w = String(log.name).replace(/_log$/, '');
    const wood = WOODS[w] ?? `${w.replace(/_/g, ' ')} trees`;
    return log.nearest.y - y > 4 ? `underground, under a ${wood}` : `surface, ${wood}`;
  }
  if (y > 110) return 'mountains';
  return y < 56 ? 'underground' : 'surface';
}

const word = (v) => String(v ?? '').replace(/_/g, ' ');
const argText = (args) => Object.values(args ?? {}).filter((v) => v !== null && v !== undefined && typeof v !== 'object').map((v) => String(v)).join(' ');

/** One step as Muse wrote it, abbreviated: "collect oak_log 8". */
export function stepSummary(st) {
  if (!st || typeof st !== 'object') return '';
  const skill = st.skill ?? st.name ?? '';
  const args = st.args && typeof st.args === 'object' ? st.args : Object.fromEntries(Object.entries(st).filter(([k]) => !['skill', 'name', 'request_id', 'why'].includes(k)));
  return `${skill}${argText(args) ? ` ${argText(args)}` : ''}`;
}

/** "> play_sequence: collect oak_log 8, craft wooden_pickaxe" (long sequences cut with "+N more"). */
export function callLine(tool, args = {}) {
  let what = '';
  if (tool === 'play_sequence' && Array.isArray(args?.steps)) {
    const parts = args.steps.map(stepSummary).filter(Boolean);
    what = parts.slice(0, 4).join(', ') + (parts.length > 4 ? `, +${parts.length - 4} more` : '');
  } else if (tool === 'play') what = stepSummary(args);
  else if (tool === 'live_view') what = args?.format ?? '';
  const words = typeof args?.why === 'string' ? cutWords(clean(args.why, 600), WORDS_MAX) : ''; // Muse's own words (why), cut at a word
  const list = tool === 'play_sequence' && Array.isArray(args?.steps) ? args.steps : tool === 'play' ? [args] : [];
  const of = list.length;
  // every step in plain words and as Muse wrote it (the stream's trace never hides one)
  const steps = list.slice(0, 16).map((st) => ({ say: plainStep(st), raw: clean(stepSummary(st), 64) }));
  return { k: 'call', t: clean(`> ${tool}${what ? `: ${what}` : ''}`), say: plainCall(tool, args), tool, ...(words ? { words } : {}), ...(of ? { of, steps } : {}) };
}

// ----- plain words for the stream's speech bubble ("Mine 3 oak logs"), never the raw call

const nounOf = (id) => word(String(id ?? '').replace(/^minecraft:/, '')).trim();
/** Mass nouns that take a number without a plural: "3 iron ore", "5 cobblestone". */
const MASS = /(?:ore|stone|dirt|sand|gravel|clay|obsidian|deepslate|andesite|diorite|granite|grass|leaves|planks|wool|glass|iron|gold|copper|coal|netherrack|quartz|wheat|beef|porkchop|mutton|cod|salmon|bread|charcoal|flint|string|leather|gunpowder|flesh|cane|bamboo|sheep|lava|water|food)$/;
const pluralOf = (w) => (/(?:s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`);
/** "a wooden pickaxe", "3 oak logs", "2 iron ore". */
export function countOf(n, id) {
  const w = nounOf(id);
  if (!w) return '';
  const k = Number.isFinite(Number(n)) ? Math.max(1, Math.round(Number(n))) : 1;
  if (MASS.test(w)) return `${k} ${w}`;
  if (k === 1) return `${/^[aeiou]/.test(w) ? 'an' : 'a'} ${w}`;
  return `${k} ${pluralOf(w)}`;
}
const listOf = (parts) => (parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`);
const STEP_WORDS = {
  get_state: () => 'Look around',
  go_to: (a) => `Walk to ${[a.x, a.y, a.z].map((v) => Math.round(Number(v))).filter(Number.isFinite).join(' ')}`,
  collect: (a) => `Mine ${countOf(a.n, a.block)}`,
  craft: (a) => `Craft ${countOf(a.n ?? 1, a.item)}`,
  craft_batch: (a) => `Craft ${listOf((Array.isArray(a.items) ? a.items : []).slice(0, 3).map((i) => countOf(i?.n ?? 1, i?.item)).filter(Boolean))}`,
  smelt: (a) => `Smelt ${countOf(a.n ?? 1, a.item)}`,
  place: (a) => `Place ${countOf(1, a.block)}`,
  build: (a) => ({ hut_3x3: 'Build a small hut', shelter: 'Build a shelter', wall_5x2: 'Build a wall', platform_3x3: 'Build a platform', nether_portal: 'Build a Nether portal frame' }[a.blueprint] ?? 'Build something'),
  attack: (a) => (a.target && a.target !== 'nearest_hostile' ? `Fight the ${nounOf(a.target)}` : 'Fight the nearest monster'),
  eat: () => 'Eat something',
  say: () => 'Say something in chat',
  equip: (a) => `Equip the ${nounOf(a.item) || 'item'}`,
  hunt: (a) => (a.mob ? `Hunt ${countOf(a.n ?? 1, a.mob)}` : 'Hunt for food'),
  sleep: () => 'Sleep in a bed',
  bucket: (a) => (a.action === 'pour' ? `Pour out the ${nounOf(a.liquid) || 'bucket'}` : `Fill a bucket with ${nounOf(a.liquid) || 'water'}`),
  chest: (a) => ({ inspect: 'Look in the chest', deposit: 'Put items in the chest', withdraw: 'Take items from the chest' }[a.action] ?? 'Use the chest'),
  explore: (a) => (a.biome ? `Explore to find a ${nounOf(a.biome)}` : a.heading ? `Explore ${nounOf(a.heading)}` : 'Explore'),
  policy: () => 'Adjust the body\'s reflexes',
  shelter: () => 'Build a shelter for the night',
  shield: () => 'Make a shield',
  portal: (a) => ({ light: 'Light the portal', enter: 'Go through the portal', dismantle: 'Take the portal frame down' }[a.action] ?? 'Use the portal'),
  armor: () => 'Make and wear armor',
  pick_up: () => 'Pick up the items',
  drop: (a) => `Drop ${countOf(a.n ?? 1, a.item)}`,
};
const TOOL_WORDS = { start_game: 'Start a new game', get_state: 'Look around', stop: 'Stop everything', end_game: 'End the game', live_view: 'Turn on the live view' };
const capital = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
/** One step in plain words: "Mine 3 oak logs". */
export function plainStep(st) {
  if (!st || typeof st !== 'object') return '';
  const skill = st.skill ?? st.name ?? '';
  const args = st.args && typeof st.args === 'object' ? st.args : Object.fromEntries(Object.entries(st).filter(([k]) => !['skill', 'name', 'request_id', 'why'].includes(k)));
  let t = '';
  try { t = STEP_WORDS[skill]?.(args) ?? ''; } catch { t = ''; }
  return clean(t || capital(word(skill)), 120);
}
/** A call in plain words: "Mine 3 oak logs, then craft a wooden pickaxe" (longer sequences: "and 2 more"). */
export function plainCall(tool, args = {}) {
  if (tool === 'play') return plainStep(args);
  if (tool === 'play_sequence' && Array.isArray(args?.steps)) {
    const parts = args.steps.map(plainStep).filter(Boolean);
    const head = parts.slice(0, 2).map((p, i) => (i ? p[0].toLowerCase() + p.slice(1) : p)).join(', then ');
    return clean(parts.length > 2 ? `${head}, and ${parts.length - 2} more` : head, 120);
  }
  return clean(TOOL_WORDS[tool] ?? capital(word(tool)), 120);
}
/** A failure's reason in a few words: "no iron ore within 64 blocks". */
export function shortWhy(result, max = 48) {
  const t = gist(result, max).replace(/\.\.\.$/, '').replace(/^failed:?\s*/i, '').trim();
  return clean(t ? t[0].toLowerCase() + t.slice(1) : '', 80);
}

const secs = (ms) => (Number.isFinite(ms) ? ` (${ms >= 10_000 ? Math.round(ms / 1000) : Math.round(ms / 100) / 10} s)` : '');

/** The first clause of a step's result, shortened to `max` characters at a word: "mined 8 oak log". */
function gist(result, max = 44) {
  let t = word(String(result ?? '').split(/;|\. | \(|\[/)[0].replace(/ and picked up .*$/, '').replace(/ at a crafting table.*$/, '').trim());
  if (t.length > max) t = `${t.slice(0, t.lastIndexOf(' ', max) > max / 2 ? t.lastIndexOf(' ', max) : max)}...`;
  return t;
}

/** A finished step: "ok  mined 8 oak log (12 s)" (the result says what it did), "FAIL collect iron ore 3 NOT_FOUND: ...". */
export function resultLine(st) {
  const what = word(stepSummary(st));
  const first = gist(st.result);
  const extra = { say: plainStep(st), ...(Number.isFinite(st.ms) ? { ms: st.ms } : {}) };
  if (st.status === 'confirmed') return { k: 'ok', t: clean(`ok  ${first || what}${secs(st.ms)}`), ...extra };
  if (st.status === 'failed') return { k: 'fail', t: clean(`FAIL ${what}${st.code ? ` ${st.code}` : ''}${first ? `: ${word(first)}` : ''}${secs(st.ms)}`), ...extra, why: shortWhy(st.result) };
  if (st.status === 'cancelled') return { k: 'info', t: clean(`skip ${what}${st.why ? `: ${st.why}` : ''}`) };
  return null;
}

/** The game clock from the time of day in ticks: "DAY 08:15" or "NIGHT 22:40" (6:00 at tick 0). */
export function clockText(ticks) {
  if (!Number.isFinite(ticks)) return '';
  const t = ((Math.floor(ticks) % 24_000) + 24_000) % 24_000;
  const h = Math.floor(t / 1000 + 6) % 24;
  const m = Math.floor(((t % 1000) * 60) / 1000);
  const night = t >= 13_000 && t < 23_000;
  return `${night ? 'NIGHT' : 'DAY'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "HP 18/20  FOOD 17/20  DAY 08:15  |  Muse 47 | Reflex 4 | 92% Muse" ("NETHER" or "END" in place of the clock there). */
export function statusText(state, attribution) {
  const parts = [];
  if (Number.isFinite(state?.health)) parts.push(`HP ${Math.round(state.health)}/20`);
  if (Number.isFinite(state?.food)) parts.push(`FOOD ${state.food}/20`);
  const dim = String(state?.dimension ?? 'overworld').replace(/^minecraft:/, '');
  const clock = dim === 'the_nether' ? 'NETHER' : dim === 'the_end' ? 'END' : clockText(state?.time);
  if (clock) parts.push(clock);
  const who = attribution && Number.isFinite(attribution.muse)
    ? `Muse ${attribution.muse} | Reflex ${attribution.reflex ?? 0}${attribution.musePct != null ? ` | ${attribution.musePct}% Muse` : ''}`
    : '';
  return clean([parts.join('  '), who].filter(Boolean).join('  |  '), 120);
}

/** Items worth naming when Muse looks (progress first): what it carries that matters for its way up. */
const NOTABLE = ['diamond_pickaxe', 'iron_pickaxe', 'stone_pickaxe', 'diamond', 'obsidian', 'flint_and_steel', 'water_bucket', 'lava_bucket', 'bucket',
  'iron_ingot', 'raw_iron', 'coal', 'shield', 'blaze_rod', 'ender_pearl', 'cooked_beef', 'bread', 'cobblestone'];
/**
 * What Muse saw when it looked (a get_state): "Muse checked: HP 20, food 14, 14 obsidian, 1 water bucket, dawn in
 * 2 min" (ASCII: the stream's cleaning keeps nothing else). The numbers from the state the reply carried; at most three notable items.
 */
export function checkedLine(state, dim) {
  if (!state || state.joining) return '';
  const parts = [];
  if (Number.isFinite(state.health)) parts.push(`HP ${Math.round(state.health)}`);
  if (Number.isFinite(state.food)) parts.push(`food ${state.food}`);
  const inv = state.inventory && typeof state.inventory === 'object' ? state.inventory : {};
  for (const item of NOTABLE.filter((x) => Number(inv[x]) > 0).slice(0, 3)) parts.push(countOf(Number(inv[item]), item).replace(/^an? /, '1 '));
  const t = Number.isFinite(state.time) ? ((Math.floor(state.time) % 24_000) + 24_000) % 24_000 : null;
  if (dim === 'the_nether') parts.push('in the Nether');
  else if (t !== null && t >= 13_000 && t < 23_000) parts.push(`dawn in ${Math.max(1, Math.round((23_000 - t) / 1200))} min`);
  else if (t !== null && t >= 11_000 && t < 13_000) parts.push(`dusk in ${Math.max(1, Math.round((13_000 - t) / 1200))} min`);
  return parts.length ? clean(`Muse checked: ${parts.join(', ')}`, 160) : '';
}

/** The status line as numbers for the stream's status row: {hp, food, clock, muse, reflex, pct}. */
export function statusData(state, attribution) {
  const st = {};
  if (Number.isFinite(state?.health)) st.hp = Math.round(state.health);
  if (Number.isFinite(state?.food)) st.food = Math.round(state.food);
  const dim = String(state?.dimension ?? 'overworld').replace(/^minecraft:/, '');
  const clock = dim === 'the_nether' ? 'NETHER' : dim === 'the_end' ? 'END' : clockText(state?.time);
  if (clock) st.clock = clock;
  if (Number.isFinite(state?.time) && clock !== 'NETHER' && clock !== 'END') st.ticks = ((Math.floor(state.time) % 24_000) + 24_000) % 24_000;
  if (attribution && Number.isFinite(attribution.muse)) {
    st.muse = attribution.muse;
    st.reflex = attribution.reflex ?? 0;
    if (Number.isFinite(attribution.musePct)) st.pct = attribution.musePct;
  }
  return st;
}

/** How pressing an advice is, 1 to 3: 3 for health, lava, drowning or starving, 2 for a night that has come, else 1. */
export function severityOf(a) {
  const t = String(a?.text ?? '').toLowerCase();
  if (/starving|lava|drown|low health|health \d|dying|burning|fire/.test(t) || /^(?:health|lava|air|fire)$/.test(String(a?.kind))) return 3;
  if (/^night \(|^night:|creeper|skeleton|zombie/.test(t)) return 2;
  return 1;
}

/**
 * The feed of one agent: call(game, tool, args) when a call comes in, reply(game, tool, result) when its reply goes
 * out. Each produces {lines: [{k, t}], status} for send(gameId, update), the lines new since the last update of that
 * game: results once, the reflexes and deaths once, the advice when it changes, milestones the first time.
 * @param {{send: (gameId: string, update: {lines: Array<{k: string, t: string}>, status: string}) => void, now?: () => number}} o
 */
export function createTermFeed(o) {
  const now = o.now ?? Date.now;
  const games = new Map(); // id -> {seen: Set, own: number, advice: Map(kind -> words), got: Set, startedAt, state, dim}
  const of = (s) => {
    let g = games.get(s.id);
    if (!g) { g = { seen: new Set(), own: -1, advice: new Map(), got: new Set(), startedAt: now(), state: null, dim: null, sub: null }; games.set(s.id, g); }
    if (!g.offProgress && typeof s.body?.on === 'function') {
      // the body's live sub-steps while a command runs (about once a second), at most 2 a second to the video
      try {
        g.offProgress = s.body.on('progress', (e) => {
          const sub = e?.sub ?? null;
          g.sub = sub;
          const t = now();
          if (sub && t - (g.subSentAt ?? 0) < 500) return;
          g.subSentAt = t;
          try { o.send(s.id, { lines: [], sub, live: liveInfo(s, g), ...hudOf(s, g, null) }); } catch { /* the video goes on without it */ }
        }) ?? (() => {});
      } catch { g.offProgress = () => {}; }
    }
    return g;
  };
  const drop = (id) => { const g = games.get(id); try { g?.offProgress?.(); } catch { /* gone */ } games.delete(id); };
  /** Health, food and the clock as the body knows them now, without a reply: the bot's, else the body's snapshot. */
  const liveState = (s) => {
    if (s?.status && s.status !== 'ready') return null;
    try {
      const bot = s.body?.bot;
      if (bot?.entity && Number.isFinite(bot.health)) return { health: bot.health, food: bot.food, ...(Number.isFinite(bot.time?.timeOfDay) ? { time: bot.time.timeOfDay } : {}) };
    } catch { /* not known */ }
    try {
      const snap = s.body?.snapshot?.();
      if (Number.isFinite(snap?.health) && snap.health > 0) return { health: snap.health, food: snap.food, ...(Number.isFinite(snap.timeOfDay) ? { time: snap.timeOfDay } : {}) };
    } catch { /* not known */ }
    return null;
  };
  /** The bot's dimension: Mine AI's status (its snapshot), else mineflayer's. */
  const dimOf = (s) => {
    let d = null;
    try { d = s.body?.snapshot?.()?.dimension ?? s.body?.bot?.game?.dimension ?? null; } catch { /* unknown */ }
    return d ? String(d).replace(/^minecraft:/, '') : null;
  };
  const statusOf = (s, structured) => {
    const g = of(s);
    // the state a reply carried, else the body's own now (start_game's reply carries none), else the last one known
    if (structured?.state && !structured.state.joining) g.state = structured.state;
    else g.state = liveState(s) ?? g.state;
    let attribution = null;
    try { attribution = typeof s.body?.attribution === 'function' ? s.body.attribution() : null; } catch { /* none */ }
    const state = g.state ? { ...g.state, dimension: g.dim ?? undefined } : null;
    return { text: statusText(state, attribution), st: statusData(state, attribution) };
  };
  /** The Body advice as it stands, one entry per kind (the stream's note cards update in place). */
  const adviceOf = (structured) => (Array.isArray(structured?.advice)
    ? structured.advice.slice(0, 4).map((a) => ({ k: /^[a-z_]{1,24}$/.test(String(a?.kind)) ? String(a.kind) : 'note', t: clean(a?.text, 160), sev: severityOf(a) })).filter((a) => a.t)
    : undefined);
  /**
   * What the bot is doing between calls, for the stream's status line: a skill running (its words), or why nothing
   * runs: sheltering or asleep for the night (with the seconds to dawn), Muse looking (get_state), in the Nether, or
   * waiting for Muse's next call; with the seconds since Muse's last call. From the MCP layer (o.liveOf: the queue, the
   * last call) and the last state.
   */
  const liveInfo = (s, g) => {
    let info = {};
    try { info = o.liveOf?.(s) ?? {}; } catch { info = {}; }
    const sinceS = Number.isFinite(info.lastCallAt) ? Math.max(0, Math.round((now() - info.lastCallAt) / 1000)) : undefined;
    if (info.busy) {
      // the step running now: its words, its call's number in the game and Muse's own step number (a craft the check
      // added runs for the step after it), so the stream's trace knows the steps before it are done before a reply says so
      const r = info.running;
      const c = Number.isInteger(r?.call?.no) ? r.call.no : undefined;
      const sn = Number.isInteger(r?.step) ? r.step : Number.isInteger(r?.before) ? r.before : undefined;
      return { mode: 'run', ...(r ? { step: plainStep(r) } : {}), ...(c !== undefined ? { c } : {}), ...(sn !== undefined ? { s: sn } : {}), ...(sinceS !== undefined ? { sinceS } : {}) };
    }
    const t = g.state?.time;
    const tod = Number.isFinite(t) ? ((Math.floor(t) % 24_000) + 24_000) % 24_000 : null;
    const night = tod !== null && tod >= 13_000 && tod < 23_000 && g.dim !== 'the_nether';
    let reason = 'waiting';
    if (night && g.lastSkill === 'sleep') reason = 'sleep';
    else if (night && g.lastSkill === 'shelter') reason = g.lastSkillBy === 'body' ? 'shelter_body' : 'shelter';
    else if (info.lastTool === 'get_state' && sinceS !== undefined && sinceS < 45) reason = 'checking';
    else if (g.dim === 'the_nether') reason = 'nether';
    const dawnS = ['sleep', 'shelter', 'shelter_body'].includes(reason) ? Math.round((23_000 - tod) / 20) : undefined;
    return { mode: 'idle', reason, ...(sinceS !== undefined ? { sinceS } : {}), ...(dawnS !== undefined ? { dawnS } : {}) };
  };
  /** The HUD's items, y and place, and the game's id and age, from the body now (else the last state a reply carried). */
  const hudOf = (s, g, structured) => {
    let snap = null;
    try { snap = s.body?.snapshot?.() ?? null; } catch { snap = null; }
    const state = structured?.state && !structured.state.joining ? structured.state : null;
    const inventory = snap?.inventory ?? state?.inventory ?? structured?.inventory ?? null;
    const equipment = snap?.equipment ?? structured?.equipment ?? state?.equipment ?? null;
    const out = { game: { id: String(s.id ?? ''), s: Math.max(0, Math.round((now() - g.startedAt) / 1000)) } };
    if (inventory) out.inv = invOf(inventory, equipment);
    const p = snap?.position ?? state?.position ?? null;
    const y = Number.isFinite(p?.y) ? Math.floor(p.y) : null;
    const place = placeOf(g.dim ?? snap?.dimension ?? 'overworld', y, snap?.nearbyBlocks ?? state?.nearbyBlocks);
    if (y !== null || place) out.pos = { ...(y !== null ? { y } : {}), ...(place ? { place } : {}) };
    return out;
  };
  const emit = (s, lines, structured, extra = null) => {
    try {
      const { text, st } = statusOf(s, structured);
      const adv = adviceOf(structured);
      const g = of(s);
      // the goal and its milestones, as the game's tracker has them (src/report.js; MCP games only)
      let goal = null;
      try { goal = s.tracker?.progress?.() ?? null; } catch { goal = null; }
      o.send(s.id, { lines: lines.filter(Boolean).filter((l) => l.t), status: text, st, live: liveInfo(s, g), sub: g.sub ?? null, ...(adv ? { adv } : {}), ...(goal ? { goal } : {}), ...hudOf(s, g, structured), ...(extra ?? {}) });
    } catch { /* the video goes on without it */ }
  };
  const PLACES = { the_nether: 'entered the Nether', the_end: 'entered the End', overworld: 'back in the Overworld' };
  /** A result line's place in its call: the call's number (c), Muse's step (s; a craft the check added: pre), a part. */
  const stepRef = (step) => [
    Number.isInteger(step.call) ? { c: step.call } : {},
    Number.isInteger(step.step) ? { s: step.step } : Number.isInteger(step.before) ? { s: step.before, pre: 1 } : {},
    step.parts > 1 && Number.isInteger(step.part) ? { pt: step.part, pts: step.parts } : {},
  ];
  const elapsed = (g) => {
    const sec = Math.max(0, Math.round((now() - g.startedAt) / 1000));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };
  return {
    call(s, tool, args) {
      if (!s?.id) return;
      const g = of(s);
      const lines = [callLine(tool, args)];
      // the advice the last reply gave: did this command take it? Said only when it is clear: the advised skill is in
      // the command, or a pressing advice (night, health) is left for something else
      if ((tool === 'play' || tool === 'play_sequence') && g.hints?.length) {
        const skills = tool === 'play' ? [args?.skill] : (Array.isArray(args?.steps) ? args.steps.map((x) => x?.skill) : []);
        const took = g.hints.find((h) => h.skill && skills.includes(h.skill));
        const pressing = g.hints.find((h) => h.sev >= 2);
        if (took) lines.push({ k: 'follow', t: clean(`Followed the body's advice: ${took.words}`, 120), ok: 1 });
        else if (pressing) lines.push({ k: 'follow', t: clean(`Went on without the body's advice: ${pressing.words}`, 120) });
        g.hints = [];
      }
      emit(s, lines, null);
    },
    reply(s, tool, args, out) {
      if (!s?.id) return;
      const g = of(s);
      const lines = [];
      // start_game's call is shown with its reply (the game exists only once it has answered); every other call was shown
      // as it came in, also when calls overlap
      if (tool === 'start_game') lines.push(callLine(tool, args));
      const st = out?.structuredContent ?? {};
      for (const step of [...(st.earlier ?? []), ...(st.steps ?? [])]) {
        const key = `${step.call ?? ''}:${step.n}`;
        if (!['confirmed', 'failed', 'cancelled'].includes(step.status) || g.seen.has(key)) continue;
        g.seen.add(key);
        const line = resultLine(step);
        const total = (st.steps ?? []).some((x) => x === step) ? (st.steps ?? []).length : null;
        if (line && Number.isInteger(step.n)) Object.assign(line, { n: step.n }, total ? { of: total } : {});
        if (line) Object.assign(line, ...stepRef(step));
        if (line) lines.push(line);
        if (step.status === 'confirmed') {
          // the last thing done, for the status line between calls (a shelter at night, a bed)
          const sk = step.skill === 'build' && step.args?.blueprint === 'shelter' ? 'shelter' : step.skill;
          Object.assign(g, { lastSkill: sk, lastSkillBy: 'muse', museShelterAt: sk === 'shelter' ? now() : g.museShelterAt });
          for (const [item, n] of Object.entries(step.gained ?? step.delta ?? {})) {
            if (n > 0 && MILESTONES[item] && !g.got.has(item)) { g.got.add(item); lines.push({ k: 'milestone', t: clean(`milestone: ${MILESTONES[item]} at ${elapsed(g)}`) }); }
          }
        }
      }
      if (out?.isError && !(st.steps ?? []).length) {
        const first = String(out.content?.[0]?.text ?? '').split('\n')[0];
        // the reason in words: "bad arguments: go_to.pos is not allowed" (not the step's number or the code)
        const bad = /bad arguments?:\s*([^;]+)/i.exec(first);
        const why = bad ? clean(`bad arguments: ${bad[1].trim()}`, 80) : shortWhy(first.replace(/^\d+\.\s*/, ''), 60);
        lines.push({ k: 'fail', t: clean(`FAIL ${st.code ?? ''} ${first}`), ...(why ? { why } : {}) });
      }
      for (const e of st.onItsOwn ?? []) {
        if (!(e.seq > g.own)) continue;
        g.own = e.seq;
        // the body sheltered by itself, unless Muse's own shelter came after it (this reply's steps, or later)
        const bodyAt = now() - (Number.isFinite(e.agoS) ? e.agoS * 1000 : 0);
        if (/shelter/i.test(`${e.kind} ${e.text}`) && !(g.museShelterAt >= bodyAt)) Object.assign(g, { lastSkill: 'shelter', lastSkillBy: 'body' });
        const death = /death|died/i.test(`${e.kind} ${e.text}`);
        lines.push({ k: death ? 'fail' : e.source === 'reflex' ? 'reflex' : 'body', t: clean(`${death ? 'death' : e.source === 'reflex' ? 'reflex' : 'body'}: ${e.text}`) });
      }
      // the advice: a line only for a kind that is new or whose words changed (the numbers in it, the time of day,
      // change on every reply and are not news), at most 3
      const kinds = new Map();
      let told = 0;
      for (const a of st.advice ?? []) {
        const k = /^[a-z_]{1,24}$/.test(String(a?.kind)) ? String(a.kind) : 'note';
        const t = clean(a?.text, 160);
        if (!t) continue;
        const shape = t.replace(/\d+/g, '#');
        kinds.set(k, shape);
        if (g.advice.get(k) !== shape && told < 3) { lines.push({ k: 'advice', t: `advice: ${t}`, ak: k }); told += 1; }
      }
      if (Array.isArray(st.advice)) {
        g.advice = kinds;
        g.hints = st.advice.slice(0, 4).map((a) => ({ skill: a?.hint?.skill ?? null, sev: severityOf(a), words: clean(String(a?.text ?? '').replace(/\s*\([^)]*\)/g, '').split(';')[0], 70) })).filter((h) => h.words);
      }
      if (tool === 'get_state') {
        const seen = checkedLine(st.state ?? null, dimOf(s) ?? g.dim);
        if (seen) lines.push({ k: 'checked', t: seen });
      }
      // a portal: the first line of the new world
      const dim = dimOf(s);
      if (dim && g.dim && dim !== g.dim) lines.push({ k: 'milestone', t: clean(`${PLACES[dim] ?? `entered ${word(dim)}`} at ${elapsed(g)}`) });
      if (dim) g.dim = dim;
      if (tool === 'end_game') { lines.push({ k: 'info', t: clean(`game over after ${elapsed(g)}`) }); emit(s, lines, st); drop(s.id); return; }
      // the call this reply answered, by its number in the game (its steps' results name it)
      const bind = (tool === 'play' || tool === 'play_sequence') ? (st.steps ?? []).find((x) => Number.isInteger(x?.call))?.call : undefined;
      emit(s, lines, st, bind !== undefined ? { bind } : null);
    },
    /** Every few seconds between calls: the status and what is happening now, with no lines (the picture lives). */
    tick(s) {
      if (!s?.id || !games.has(s.id)) return;
      emit(s, [], null);
    },
    forget: (id) => drop(id),
  };
}
