// src/report.js - a game's goal, its milestone plan and its report, kept by the server (the one-line prompt: the
// player no longer writes a long prompt or compiles a report itself). start_game takes a goal; the reply carries the
// plan for it, with the how-tos a long prompt used to carry; every call, its why, the advice it was shown and what it
// did with it, the milestones as the body reaches them and the deaths are recorded here; end_game and game_report
// return the report: milestones with times, deaths with causes, who acted, and a decision log built from the
// player's own why texts and the advice it followed or declined.

/** The milestones the server watches, in the order of the way to the Nether and back. */
export const MILESTONES = Object.freeze([
  { key: 'wooden_pickaxe', short: 'wooden pickaxe', name: 'wooden pickaxe', how: 'collect logs, craft planks, sticks, a crafting table and a wooden_pickaxe (craft_batch does it in one step)', test: (v) => v.has('wooden_pickaxe') },
  { key: 'stone_pickaxe', short: 'stone pickaxe', name: 'stone pickaxe', how: 'collect cobblestone (stone drops it), craft a stone_pickaxe and a furnace', test: (v) => v.has('stone_pickaxe') },
  { key: 'iron_ingot', short: 'iron', name: 'iron', how: 'collect iron_ore (it needs the stone pickaxe) and coal_ore, smelt raw_iron', test: (v) => v.has('iron_ingot') || v.has('iron_pickaxe') },
  { key: 'iron_pickaxe', short: 'iron pickaxe', name: 'iron pickaxe', how: 'craft an iron_pickaxe (3 iron ingots)', test: (v) => v.has('iron_pickaxe') },
  { key: 'diamond', short: 'diamonds', name: 'diamonds', how: 'go deep (go_to straight down; most diamonds lie near y -59), collect deepslate_diamond_ore or diamond_ore with the iron pickaxe', test: (v) => v.has('diamond') || v.has('diamond_pickaxe') },
  { key: 'diamond_pickaxe', short: 'diamond pickaxe', name: 'diamond pickaxe', how: 'craft a diamond_pickaxe (3 diamonds)', test: (v) => v.has('diamond_pickaxe') },
  { key: 'water_bucket', short: 'water bucket', name: 'a water bucket', how: 'craft a bucket (3 iron ingots), then bucket fill water', test: (v) => v.has('water_bucket') || v.count('obsidian') >= 14 },
  { key: 'obsidian', short: 'obsidian', name: '14 obsidian', how: 'with the water bucket, the diamond pickaxe and some cobblestone, go next to a still lava pool (get_state lists lava; the refusal names the nearest pool) and collect obsidian 14: the body pours the water and mines what forms', test: (v) => v.count('obsidian') >= 14 || v.portalBuilt },
  { key: 'flint_and_steel', short: 'flint and steel', name: 'flint and steel', how: 'collect gravel (it drops flint now and then), craft flint_and_steel (1 iron ingot, 1 flint)', test: (v) => v.has('flint_and_steel') },
  { key: 'portal', short: 'portal', name: 'the portal frame', how: 'build nether_portal from obsidian on open, dry ground away from lava and water (go up to the surface first)', test: (v) => v.portalBuilt },
  { key: 'nether', short: 'Nether', name: 'the Nether', how: 'portal light, then portal enter', test: (v) => v.dims.has('the_nether') },
  { key: 'back', short: 'back', name: 'back in the Overworld', how: 'in the Nether, portal enter again (no pos needed: the portal you came out of)', test: (v) => v.dims.has('the_nether') && v.dim === 'overworld' },
]);

/** The goals start_game takes, each the milestones it ends with. */
export const GOALS = Object.freeze({
  free: null, // every milestone is watched; none is the goal
  iron_pickaxe: 'iron_pickaxe',
  diamonds: 'diamond_pickaxe',
  nether: 'nether',
  nether_and_back: 'back',
});
export const GOAL_NAMES = Object.freeze(Object.keys(GOALS));
/** Each goal in a few words (the stream's checklist title). */
export const GOAL_TITLES = Object.freeze({ free: 'Free play', iron_pickaxe: 'Iron pickaxe', diamonds: 'Diamonds', nether: 'The Nether', nether_and_back: 'Nether and back' });

/** A goal from start_game's argument: one of GOAL_NAMES, else a free text (kept, at most 120 characters) as free. */
export function goalOf(raw) {
  const g = String(raw ?? '').trim();
  if (!g) return { key: 'free', text: null };
  const key = g.toLowerCase().replace(/[\s-]+/g, '_');
  if (GOALS[key] !== undefined) return { key, text: null };
  // a free text naming one of the goals in words
  if (/nether/i.test(g) && /back|return/i.test(g)) return { key: 'nether_and_back', text: g.slice(0, 120) };
  if (/nether/i.test(g)) return { key: 'nether', text: g.slice(0, 120) };
  if (/diamond/i.test(g)) return { key: 'diamonds', text: g.slice(0, 120) };
  if (/iron/i.test(g)) return { key: 'iron_pickaxe', text: g.slice(0, 120) };
  return { key: 'free', text: g.slice(0, 120) };
}

/** The milestones of a goal, in order (free: all of them, as a guide). */
export function milestonesOf(key) {
  const last = GOALS[key];
  if (!last) return MILESTONES;
  return MILESTONES.slice(0, MILESTONES.findIndex((m) => m.key === last) + 1);
}

/** The plan start_game's reply carries for a goal: each milestone with its how-to, and the standing hints. */
export function planText(goal) {
  const list = milestonesOf(goal.key);
  const head = goal.key === 'free'
    ? `Goal: free play${goal.text ? ` (${goal.text})` : ''}. The server watches these milestones anyway, in this order:`
    : `Goal: ${GOAL_TITLES[goal.key]}${goal.text ? ` (${goal.text})` : ''}. The plan, milestone by milestone (the server tracks each one; game_report shows where you are):`;
  return [head, ...list.map((m, i) => `${i + 1}. ${m.name}: ${m.how}`),
    'Nights: shelter (or dig in) before dark; the advice says when and what to do meanwhile. Low health: stay enclosed and eat until food 18 so it heals.',
  ].join('\n');
}

const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// a step in a few words: the names and counts as they are ("collect birch_log 12"), other arguments with their key
const PLAIN = new Set(['block', 'item', 'n', 'mob', 'drop', 'blueprint', 'material', 'action', 'liquid', 'target', 'x', 'y', 'z', 'text']);
const brief = (st) => `${st.skill}${st.args && Object.keys(st.args).length ? ` ${Object.entries(st.args).map(([k, v]) => (typeof v === 'object' ? `${k}=${JSON.stringify(v)}` : PLAIN.has(k) ? `${v}` : `${k}=${v}`)).join(' ')}` : ''}`;
// a long game's log: the first entries and the latest, about 150 lines in all (a 2-hour game makes about 150 calls)
const DECISIONS_KEPT = 160;
const DECISIONS_HEAD = 30;

/**
 * The tracker of one game.
 * @param {{goal: {key: string, text: string|null}, now?: () => number}} o
 */
export function createTracker({ goal: first = { key: 'free', text: null }, now = Date.now } = {}) {
  let goal = first;
  const t0 = now();
  const reached = new Map(); // key -> ms since start
  const deaths = [];
  const decisions = []; // {at, kind: 'call'|'advice', ...}
  let dropped = 0; // entries left out of a long game's log (between the first ones and the latest)
  let shown = []; // the advice the last reply showed: [{kind, text, hint}]
  const declined = new Set(); // advice kinds logged as declined while they stay shown
  const view = { inventory: {}, dim: 'overworld', dims: new Set(['overworld']), portalBuilt: false };
  const v = { has: (i) => (view.inventory[i] ?? 0) > 0, count: (i) => view.inventory[i] ?? 0, get portalBuilt() { return view.portalBuilt; }, get dims() { return view.dims; }, get dim() { return view.dim; } };
  const check = () => {
    for (const m of MILESTONES) if (!reached.has(m.key) && m.test(v)) reached.set(m.key, now() - t0);
  };

  return {
    get goal() { return goal; },
    /** A new goal for the game (start_game again with a goal). */
    setGoal(g) { goal = g; },
    startedAt: t0,
    /** What the body carries and wears, and where it is (after every call). */
    observe({ inventory = null, equipment = null, dimension = null } = {}) {
      if (inventory) {
        const all = { ...inventory };
        // what it wears or holds in the off-hand: slot -> name (Mine AI) or {name, count}
        for (const e of Object.values(equipment ?? {})) {
          const name = typeof e === 'string' ? e : e?.name;
          if (name && name !== 'air') all[name] = (all[name] ?? 0) + (Number(e?.count) || 1);
        }
        view.inventory = all;
      }
      if (dimension) { view.dim = String(dimension).replace(/^minecraft:/, ''); view.dims.add(view.dim); }
      check();
    },
    /** A play or play_sequence call and its reply: the why, the steps and their outcome; the advice before it, followed or not. */
    onCall(tool, args, out) {
      if (tool !== 'play' && tool !== 'play_sequence') {
        if (tool === 'get_state' || tool === 'start_game') shown = out?.structuredContent?.advice ?? shown;
        return;
      }
      if (args?.dry_run === true) return; // only a check: nothing was decided
      const sent = tool === 'play' ? [{ skill: args?.skill, args: args?.args ?? {} }] : (args?.steps ?? []).map((st) => ({ skill: st?.skill, args: st?.args ?? {} }));
      const at = now() - t0;
      // the advice the player saw before this call: followed when a step does what its hint said, else declined
      for (const a of shown) {
        if (!a.hint) continue;
        const did = sent.some((st) => st.skill === a.hint.skill && Object.entries(a.hint.args ?? {}).every(([k, val]) => typeof val === 'object' || st.args?.[k] === undefined || st.args[k] === val));
        const k = a.kind ?? a.text;
        if (did) { declined.delete(k); decisions.push({ at, kind: 'advice', followed: true, text: a.text, skill: a.hint.skill }); }
        else if (!declined.has(k)) { declined.add(k); decisions.push({ at, kind: 'advice', followed: false, text: a.text, skill: a.hint.skill }); }
      }
      const sc = out?.structuredContent ?? {};
      const steps = sc.steps ?? [];
      const outcome = out?.isError ? `refused (${sc.code ?? 'error'})` : steps.some((st) => st.status === 'failed') ? `failed: ${steps.find((st) => st.status === 'failed').code ?? 'FAILED'}` : steps.every((st) => st.status === 'confirmed') ? 'ok' : 'running';
      decisions.push({ at, kind: 'call', why: typeof args?.why === 'string' && args.why.trim() ? args.why.trim().slice(0, 200) : null, steps: sent.map(brief).join(', ').slice(0, 300), outcome });
      while (decisions.length > DECISIONS_KEPT) { decisions.splice(DECISIONS_HEAD, 1); dropped += 1; }
      for (const st of steps) if (st.skill === 'build' && st.args?.blueprint === 'nether_portal' && st.status === 'confirmed') view.portalBuilt = true;
      shown = sc.advice ?? [];
      // a kind no longer advised can be declined again when it comes back
      for (const k of [...declined]) if (!shown.some((a) => (a.kind ?? a.text) === k)) declined.delete(k);
      check();
    },
    /** A step finished later (a get_state reported it): a frame built then counts. */
    onStepDone(st) {
      if (st?.skill === 'build' && st.args?.blueprint === 'nether_portal' && st.status === 'confirmed') { view.portalBuilt = true; check(); }
    },
    /** A death: when, what killed the bot, where. */
    death({ cause = null, position = null } = {}) {
      deaths.push({ at: now() - t0, cause: cause ? String(cause).replace(/^\S+ /, '') : null, position });
    },
    /**
     * The goal and its milestones for the stream's checklist: {key, title, text, reached, list: [{k, t, atS}]} (free
     * play: every milestone, as a guide).
     */
    progress() {
      const list = milestonesOf(goal.key);
      return {
        key: goal.key,
        title: GOAL_TITLES[goal.key] ?? goal.key,
        text: goal.text,
        reached: goal.key !== 'free' && reached.has(list.at(-1).key),
        list: list.map((m) => ({ k: m.key, t: m.short, atS: reached.has(m.key) ? Math.round(reached.get(m.key) / 1000) : null })),
      };
    },
    /** The report (end_game, game_report): text and data. */
    report({ gameId = null, attribution = null, ended = null } = {}) {
      const list = milestonesOf(goal.key);
      const done = list.filter((m) => reached.has(m.key)).sort((a, b) => reached.get(a.key) - reached.get(b.key));
      const todo = list.filter((m) => !reached.has(m.key));
      const elapsed = now() - t0;
      const goalReached = goal.key !== 'free' && reached.has(list.at(-1).key);
      const lines = [
        `Report for game ${gameId ?? '?'}: goal ${(GOAL_TITLES[goal.key] ?? goal.key).toLowerCase().replace(/nether/, 'Nether')}${goal.text ? ` (${goal.text})` : ''}; ${mmss(elapsed)} played${ended ? `; ${ended}` : ''}.`,
        `Goal: ${goal.key === 'free' ? 'none set' : goalReached ? `reached at ${mmss(reached.get(list.at(-1).key))}` : 'not reached'}.`,
        `Milestones: ${done.length ? done.map((m) => `${m.name} ${mmss(reached.get(m.key))}`).join(', ') : 'none yet'}${todo.length && goal.key !== 'free' ? `; still to do: ${todo.map((m) => m.name).join(', ')}` : ''}.`,
        `Deaths: ${deaths.length ? deaths.map((d) => `${mmss(d.at)} ${d.cause ?? 'died'}${d.position ? ` at ${Math.floor(d.position.x)} ${Math.floor(d.position.y)} ${Math.floor(d.position.z)}` : ''}`).join('; ') : 'none'}.`,
        attribution?.text ? `${attribution.text}.` : null,
        decisions.length ? 'Decision log (your own why, and the advice you followed or declined):' : 'Decision log: no calls yet.',
        ...decisions.flatMap((d, i) => [
          ...(dropped && i === DECISIONS_HEAD ? [`- ... ${dropped} more entries left out here ...`] : []),
          d.kind === 'call'
            ? `- ${mmss(d.at)} ${d.why ? `"${d.why}"` : '(no why given)'} -> ${d.steps}: ${d.outcome}`
            : `- ${mmss(d.at)} advice ${d.followed ? 'followed' : 'declined'} (${d.skill}): ${d.text.slice(0, 160)}`,
        ]),
      ].filter(Boolean);
      return {
        text: lines.join('\n'),
        data: {
          game: gameId, goal: goal.key, goalText: goal.text, goalReached, elapsedS: Math.round(elapsed / 1000),
          milestones: list.map((m) => ({ key: m.key, name: m.name, atS: reached.has(m.key) ? Math.round(reached.get(m.key) / 1000) : null })),
          deaths: deaths.map((d) => ({ atS: Math.round(d.at / 1000), cause: d.cause })),
          attribution: attribution ? { muse: attribution.muse, reflex: attribution.reflex, care: attribution.care, musePct: attribution.musePct } : null,
          decisions: decisions.map((d) => ({ atS: Math.round(d.at / 1000), ...d, at: undefined })),
          decisionsLeftOut: dropped,
        },
      };
    },
  };
}
