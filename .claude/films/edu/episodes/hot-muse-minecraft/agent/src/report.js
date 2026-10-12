// src/report.js - a game's goal, its plan and its report, kept by the server (the one-line prompt: the player no
// longer writes a long prompt or compiles a report itself). start_game and set_goal take a goal (src/goals.js: a
// preset with its milestone plan, or the parts read from the player's words, "kill 100 pigs", each with a count); the
// reply carries the plan for it, with the how-tos and the caps; every call, its why, the advice it was shown and what
// it did with it, the milestones, the counts (kills, items gained, crafts, builds, places reached, nights survived) and
// the deaths are recorded here, per goal while it was the goal; end_game and game_report return the report: the goal
// and its progress, every goal of the game with its time, milestones with times, deaths with causes, who acted, and a
// decision log built from the player's own why texts and the advice it followed or declined.
import { GOALS, GOAL_TITLES, describePart, partHow, sameGoal, mobsWord } from './goals.js';

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

export { GOALS, GOAL_NAMES, GOAL_TITLES, goalOf, lexiconFrom, describePart, partHow, sameGoal } from './goals.js';

/** The milestones of a goal, in order (free: all of them, as a guide). */
export function milestonesOf(key) {
  const last = GOALS[key];
  if (!last) return MILESTONES;
  return MILESTONES.slice(0, MILESTONES.findIndex((m) => m.key === last) + 1);
}

/**
 * The plan a goal's reply carries (start_game, set_goal): a preset's milestones with their how-tos; a counted goal's
 * parts with how to do each with these skills, the caps a big count meets and what the server counts; a plain text
 * goal says it is not counted.
 * @param {{key: string, text: string|null, title?: string, parts?: object[]|null, unclear?: string[]}} goal
 * @param {{lex?: object, leaseMin?: number}} [o]
 */
export function planText(goal, { lex, leaseMin = 30 } = {}) {
  const nights = 'Nights: shelter (or dig in) before dark; the advice says when and what to do meanwhile. Low health: stay enclosed and eat until food 18 so it heals.';
  if (goal.key === 'custom') {
    const parts = goal.parts.map((p) => ({ p, d: describePart(p) }));
    return [
      `Goal: ${goal.title}. The server counts it${parts.length > 1 ? ', part by part' : ''} (every reply's state says how far; game_report has it all):`,
      ...parts.map(({ p, d }, i) => `${i + 1}. ${d.title}: ${partHow(p, lex, { leaseMin })}`),
      ...(goal.unclear?.length ? [`Not counted (the words could mean several things): ${goal.unclear.join('; ')}. set_goal with the exact name counts it.`] : []),
      `Caps: one step collects, crafts, smelts or hunts at most 64; play_sequence runs up to 32 steps; go_to walks at most 256 blocks; the game lasts ${leaseMin} min. A big count takes many calls: split it and check the count in each reply.`,
      nights,
    ].join('\n');
  }
  if (goal.key === 'free' && goal.text) {
    return [
      `Goal: "${goal.text}" (shown as your goal; the server could not read a count from these words, so it does not count it${goal.unclear?.length ? `: ${goal.unclear.join('; ')}` : ''}). Counted goals read like "kill 100 pigs", "collect 64 cobblestone", "craft 20 torches", "reach y -59", "build a hut", "survive 2 nights".`,
      'The server watches these milestones anyway: wooden pickaxe, stone pickaxe, iron, iron pickaxe, diamonds, diamond pickaxe, a water bucket, 14 obsidian, flint and steel, the portal frame, the Nether, back in the Overworld.',
      nights,
    ].join('\n');
  }
  const list = milestonesOf(goal.key);
  const head = goal.key === 'free'
    ? 'Goal: free play. The server watches these milestones anyway, in this order:'
    : `Goal: ${GOAL_TITLES[goal.key]}${goal.text ? ` (${goal.text})` : ''}. The plan, milestone by milestone (the server tracks each one; game_report shows where you are):`;
  return [head, ...list.map((m, i) => `${i + 1}. ${m.name}: ${m.how}`), nights].join('\n');
}

const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// a step in a few words: the names and counts as they are ("collect birch_log 12"), other arguments with their key
const PLAIN = new Set(['block', 'item', 'n', 'mob', 'drop', 'blueprint', 'material', 'action', 'liquid', 'target', 'x', 'y', 'z', 'text']);
const brief = (st) => `${st.skill}${st.args && Object.keys(st.args).length ? ` ${Object.entries(st.args).map(([k, v]) => (typeof v === 'object' ? `${k}=${JSON.stringify(v)}` : PLAIN.has(k) ? `${v}` : `${k}=${v}`)).join(' ')}` : ''}`;
// a long game's log: the first entries and the latest, about 150 lines in all (a 2-hour game makes about 150 calls)
const DECISIONS_KEPT = 160;
const DECISIONS_HEAD = 30;

/** The skills whose steps make items a craft goal counts. */
const MAKERS = new Set(['craft', 'craft_batch', 'smelt', 'shield', 'armor']);
const isNight = (t) => Number.isFinite(t) && ((Math.floor(t) % 24_000) + 24_000) % 24_000 >= 13_000 && ((Math.floor(t) % 24_000) + 24_000) % 24_000 < 23_000;

/**
 * The tracker of one game.
 * @param {{goal: object, now?: () => number}} o
 */
export function createTracker({ goal: first = { key: 'free', text: null, title: GOAL_TITLES.free, parts: null }, now = Date.now } = {}) {
  const t0 = now();
  const reached = new Map(); // milestone key -> ms since start
  const deaths = [];
  const decisions = []; // {at, kind: 'call'|'advice'|'goal', ...}
  let dropped = 0; // entries left out of a long game's log (between the first ones and the latest)
  let shown = []; // the advice the last reply showed: [{kind, text, hint}]
  const declined = new Set(); // advice kinds logged as declined while they stay shown
  const view = { inventory: {}, dim: 'overworld', dims: new Set(['overworld']), portalBuilt: false, pos: null, night: null };
  const v = { has: (i) => (view.inventory[i] ?? 0) > 0, count: (i) => view.inventory[i] ?? 0, get portalBuilt() { return view.portalBuilt; }, get dims() { return view.dims; }, get dim() { return view.dim; } };
  const at = () => now() - t0;
  const kills = { muse: {}, reflex: {} }; // every kill of the game, by mob

  /** A goal while it is the goal: its parts with their counts. */
  const entry = (goal, by) => ({
    goal, by, fromMs: at(), toMs: null,
    parts: (goal.parts ?? []).map((p) => ({
      ...p, ...describePart(p), done: 0, atMs: null,
      seen: p.kind === 'collect' ? v.count(p.item) : undefined, gained: 0, // collect: what was carried when it was set
      nightFrom: null, dayFrom: null, wentNether: false,
    })),
  });
  let current = entry(first, 'start_game');
  const history = [current];

  const settle = (p) => { if (p.atMs === null && p.done >= (p.n ?? 1)) p.atMs = at(); };
  const check = () => {
    for (const m of MILESTONES) if (!reached.has(m.key) && m.test(v)) reached.set(m.key, at());
    for (const p of current.parts) {
      if (p.kind === 'collect') {
        const held = v.count(p.item);
        if (held > p.seen) p.gained += held - p.seen;
        p.seen = held;
        p.done = Math.max(held, p.gained);
      } else if (p.kind === 'reach') {
        if (p.dim) { if (view.dim === p.dim) p.done = 1; } else if (view.pos) {
          const near = p.x !== undefined
            ? view.dim === 'overworld' && Math.hypot(view.pos.x - p.x, view.pos.z - p.z) <= 5 && (p.y === undefined || Math.abs(view.pos.y - p.y) <= 3)
            : Math.abs(view.pos.y - p.y) <= 2;
          if (near) p.done = 1;
        }
      } else if (p.kind === 'back') {
        if (view.dim === 'the_nether') p.wentNether = true;
        if (p.wentNether && view.dim === 'overworld') p.done = 1;
      }
      settle(p);
    }
  };
  /** The goal's state in words: "pigs killed 37 of 100", a preset's milestones, or the plain text. */
  const statusOf = (e) => {
    if (e.goal.key === 'custom') return e.parts.map((p) => `${p.t} ${Math.min(p.done, p.n ?? 1)} of ${p.n ?? 1}`).join('; ');
    if (e.goal.key === 'free') return e.goal.text ? `"${e.goal.text}" (not counted)` : 'free play';
    const list = milestonesOf(e.goal.key);
    return `${list.filter((m) => reached.has(m.key)).length} of ${list.length} milestones`;
  };
  const reachedOf = (e) => {
    if (e.goal.key === 'custom') return e.parts.every((p) => p.atMs !== null) ? Math.max(...e.parts.map((p) => p.atMs)) : null;
    if (e.goal.key === 'free') return null;
    return reached.get(milestonesOf(e.goal.key).at(-1).key) ?? null;
  };
  const log = (d) => {
    decisions.push(d);
    while (decisions.length > DECISIONS_KEPT) { decisions.splice(DECISIONS_HEAD, 1); dropped += 1; }
  };

  return {
    get goal() { return current.goal; },
    /**
     * A new goal (set_goal, or start_game again with one): the one before ends now and stays in the history. The same
     * goal again changes nothing (false).
     */
    setGoal(g, by = 'set_goal') {
      if (sameGoal(g, current.goal)) return false;
      current.toMs = at();
      current = entry(g, by);
      history.push(current);
      log({ at: at(), kind: 'goal', title: g.title ?? g.key, text: g.text ?? null, by });
      check();
      return true;
    },
    startedAt: t0,
    /** What the body carries and wears, where it is, and the time of day (after every call and every step). */
    observe({ inventory = null, equipment = null, dimension = null, position = null, timeOfDay = null } = {}) {
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
      if (position && [position.x, position.y, position.z].every(Number.isFinite)) view.pos = { x: position.x, y: position.y, z: position.z };
      if (Number.isFinite(timeOfDay)) {
        const night = isNight(timeOfDay);
        const lastDeath = deaths.at(-1)?.at ?? -1;
        for (const p of current.parts.filter((x) => x.kind === 'survive')) {
          // a night counts at dawn when the bot did not die in it (since the goal was set, for a night under way); a
          // day, at each dawn with no death since the dawn before (or since the goal was set)
          if (view.night === false && night) p.nightFrom = at();
          if (view.night === true && !night) {
            const from = p.unit === 'night' ? (p.nightFrom ?? current.fromMs) : (p.dayFrom ?? current.fromMs);
            if (lastDeath < from) p.done += 1;
            p.dayFrom = at();
            p.nightFrom = null;
          }
        }
        view.night = night;
      }
      check();
    },
    /** Kills of the body: {mob: n}, by a step of the player's ('muse') or a reflex. */
    onKills(mobs, by = 'muse') {
      for (const [mob, n] of Object.entries(mobs ?? {})) {
        const k = Math.max(0, Math.round(Number(n) || 0));
        if (!k || !/^[a-z_]{1,40}$/.test(mob)) continue;
        const book = kills[by === 'reflex' ? 'reflex' : 'muse'];
        book[mob] = (book[mob] ?? 0) + k;
        for (const p of current.parts) if (p.kind === 'kill' && p.target === mob) { p.done += k; settle(p); }
      }
    },
    /** A step of the body ended (its skill event): what it made, built, killed. */
    onSkillEnd(e) {
      if (!e?.tool) return;
      if (e.kills) this.onKills(e.kills, 'muse');
      for (const p of current.parts) {
        if (p.kind === 'craft' && MAKERS.has(e.tool)) p.done += Math.max(0, Number(e.delta?.[p.item]) || 0);
        if (p.kind === 'build' && e.ok && ((e.tool === 'build' && e.args?.blueprint === p.blueprint) || (e.tool === 'shelter' && p.blueprint === 'shelter'))) p.done += 1;
        settle(p);
      }
      if (e.ok && e.tool === 'build' && e.args?.blueprint === 'nether_portal') view.portalBuilt = true;
      check();
    },
    /** A play or play_sequence call and its reply: the why, the steps and their outcome; the advice before it, followed or not. */
    onCall(tool, args, out) {
      if (tool !== 'play' && tool !== 'play_sequence') {
        if (tool === 'get_state' || tool === 'start_game') shown = out?.structuredContent?.advice ?? shown;
        return;
      }
      if (args?.dry_run === true) return; // only a check: nothing was decided
      const sc = out?.structuredContent ?? {};
      const steps = sc.steps ?? [];
      // the steps as they ran (the arguments as the server read them, crafts it added), else as they were sent
      const sent = steps.length && steps.every((st) => st.args && typeof st.args === 'object') ? steps.map((st) => ({ skill: st.skill, args: st.args }))
        : tool === 'play' ? [{ skill: args?.skill, args: args?.args ?? {} }] : (args?.steps ?? []).map((st) => ({ skill: st?.skill, args: st?.args ?? {} }));
      const t = at();
      // the advice the player saw before this call: followed when a step does what its hint said, else declined
      for (const a of shown) {
        if (!a.hint) continue;
        const did = sent.some((st) => st.skill === a.hint.skill && Object.entries(a.hint.args ?? {}).every(([k, val]) => typeof val === 'object' || st.args?.[k] === undefined || st.args[k] === val));
        const k = a.kind ?? a.text;
        if (did) { declined.delete(k); log({ at: t, kind: 'advice', followed: true, text: a.text, skill: a.hint.skill }); }
        else if (!declined.has(k)) { declined.add(k); log({ at: t, kind: 'advice', followed: false, text: a.text, skill: a.hint.skill }); }
      }
      const failed = steps.find((st) => st.status === 'failed');
      const words = (r) => String(r ?? '').replace(/^failed:\s*/i, '').split(/[;:(]|\. /)[0].trim().slice(0, 90);
      const outcome = out?.isError && !failed ? `refused (${sc.code ?? 'error'})`
        : failed ? `failed${failed.code && failed.code !== 'FAILED' ? ` (${failed.code})` : ''}${words(failed.result) ? `: ${words(failed.result)}` : ''}`
          : steps.length && steps.every((st) => st.status === 'confirmed') ? 'ok' : 'running';
      log({ at: t, kind: 'call', why: typeof args?.why === 'string' && args.why.trim() ? args.why.trim().slice(0, 200) : null, steps: sent.map(brief).join(', ').slice(0, 300), outcome });
      for (const st of steps) if (st.skill === 'build' && st.args?.blueprint === 'nether_portal' && st.status === 'confirmed') view.portalBuilt = true;
      shown = sc.advice ?? [];
      // a kind no longer advised can be declined again when it comes back
      for (const k of [...declined]) if (!shown.some((a) => (a.kind ?? a.text) === k)) declined.delete(k);
      check();
    },
    /** A step finished later (a get_state reported it): a frame built then counts for the milestones. */
    onStepDone(st) {
      if (st?.skill === 'build' && st.args?.blueprint === 'nether_portal' && st.status === 'confirmed') { view.portalBuilt = true; check(); }
    },
    /** A death: when, what killed the bot, where. */
    death({ cause = null, position = null } = {}) {
      deaths.push({ at: at(), cause: cause ? String(cause).replace(/^\S+ /, '') : null, position });
    },
    /** The goal in one line for every reply's state: "Goal: kill 100 pigs: pigs killed 37 of 100." */
    line() {
      const r = reachedOf(current);
      return `Goal: ${current.goal.key === 'free' && !current.goal.text ? 'free play (set_goal sets one)' : `${current.goal.title ?? current.goal.key}: ${statusOf(current)}${r !== null ? ` (reached at ${mmss(r)})` : ''}`}.`;
    },
    /**
     * The goal for the stream's checklist: {key, title, text, reached, list: [{k, t, atS, done?, of?}]}: a preset's
     * milestones, a counted goal's parts with their counts, nothing for a plain text goal (free play without one: every
     * milestone, as a guide).
     */
    progress() {
      const g = current.goal;
      const list = g.key === 'custom'
        ? current.parts.map((p) => ({ k: p.k, t: p.t, done: Math.min(p.done, p.n ?? 1), of: p.n ?? 1, atS: p.atMs !== null ? Math.round(p.atMs / 1000) : null }))
        : g.key === 'free' && g.text ? []
          : milestonesOf(g.key).map((m) => ({ k: m.key, t: m.short, atS: reached.has(m.key) ? Math.round(reached.get(m.key) / 1000) : null }));
      return { key: g.key, title: g.title ?? GOAL_TITLES[g.key] ?? g.key, text: g.text ?? null, reached: reachedOf(current) !== null, list };
    },
    /** The report (end_game, game_report): text and data. */
    report({ gameId = null, attribution = null, ended = null } = {}) {
      const goal = current.goal;
      const preset = goal.key !== 'custom' && goal.key !== 'free';
      const list = preset ? milestonesOf(goal.key) : MILESTONES;
      const done = MILESTONES.filter((m) => reached.has(m.key)).sort((a, b) => reached.get(a.key) - reached.get(b.key));
      const todo = preset ? list.filter((m) => !reached.has(m.key)) : [];
      const elapsed = at();
      const r = reachedOf(current);
      const title = (e) => (e.goal.key === 'free' && !e.goal.text ? 'free play' : e.goal.title ?? e.goal.key);
      const allKills = Object.entries(kills.muse).concat(Object.entries(kills.reflex)).reduce((o, [m, n]) => ({ ...o, [m]: (o[m] ?? 0) + n }), {});
      const lines = [
        `Report for game ${gameId ?? '?'}: goal ${title(current)}${preset && goal.text ? ` (${goal.text})` : ''}; ${mmss(elapsed)} played${ended ? `; ${ended}` : ''}.`,
        `Goal: ${goal.key === 'free' ? (goal.text ? `"${goal.text}", not counted (no count could be read from it)` : 'none set') : `${r !== null ? `reached at ${mmss(r)}` : 'not reached'}${goal.key === 'custom' ? `: ${statusOf(current)}` : ''}`}.`,
        history.length > 1 ? `Goals this game: ${history.map((e) => { const st = e.goal.key === 'free' ? '' : `: ${statusOf(e)}`; return `${mmss(e.fromMs)} ${title(e)}${e.toMs !== null ? ` (until ${mmss(e.toMs)}${st}${reachedOf(e) !== null ? ', reached' : ''})` : ' (now)'}`; }).join('; ')}.` : null,
        `${preset ? 'Milestones' : 'Milestones along the way'}: ${done.length ? done.map((m) => `${m.name} ${mmss(reached.get(m.key))}`).join(', ') : 'none yet'}${todo.length ? `; still to do: ${todo.map((m) => m.name).join(', ')}` : ''}.`,
        Object.keys(allKills).length ? `Kills: ${Object.entries(allKills).map(([m, n]) => `${n} ${mobsWord(m, n)}`).join(', ')}${Object.keys(kills.reflex).length ? ` (by reflexes: ${Object.entries(kills.reflex).map(([m, n]) => `${n} ${mobsWord(m, n)}`).join(', ')})` : ''}.` : null,
        `Deaths: ${deaths.length ? deaths.map((d) => `${mmss(d.at)} ${d.cause ?? 'died'}${d.position ? ` at ${Math.floor(d.position.x)} ${Math.floor(d.position.y)} ${Math.floor(d.position.z)}` : ''}`).join('; ') : 'none'}.`,
        attribution?.text ? `${attribution.text}.` : null,
        decisions.length ? 'Decision log (your own why, and the advice you followed or declined):' : 'Decision log: no calls yet.',
        ...decisions.flatMap((d, i) => [
          ...(dropped && i === DECISIONS_HEAD ? [`- ... ${dropped} more entries left out here ...`] : []),
          d.kind === 'call' ? `- ${mmss(d.at)} ${d.why ? `"${d.why}"` : '(no why given)'} -> ${d.steps}: ${d.outcome}`
            : d.kind === 'goal' ? `- ${mmss(d.at)} goal set (${d.by}): ${d.title}${d.text && d.text !== d.title ? ` ("${d.text}")` : ''}`
              : `- ${mmss(d.at)} advice ${d.followed ? 'followed' : 'declined'} (${d.skill}): ${d.text.slice(0, 160)}`,
        ]),
      ].filter(Boolean);
      const partsData = (e) => e.parts.map((p) => ({ k: p.k, kind: p.kind, label: p.t, done: Math.min(p.done, p.n ?? 1), of: p.n ?? 1, atS: p.atMs !== null ? Math.round(p.atMs / 1000) : null }));
      return {
        text: lines.join('\n'),
        data: {
          game: gameId, goal: goal.key, goalText: goal.text ?? null, goalTitle: title(current), goalReached: r !== null, elapsedS: Math.round(elapsed / 1000),
          parts: partsData(current),
          goals: history.map((e) => ({ goal: e.goal.key, title: title(e), text: e.goal.text ?? null, by: e.by, fromS: Math.round(e.fromMs / 1000), toS: e.toMs !== null ? Math.round(e.toMs / 1000) : null, reached: reachedOf(e) !== null, parts: partsData(e) })),
          milestones: list.map((m) => ({ key: m.key, name: m.name, atS: reached.has(m.key) ? Math.round(reached.get(m.key) / 1000) : null })),
          kills: { muse: { ...kills.muse }, reflex: { ...kills.reflex } },
          deaths: deaths.map((d) => ({ atS: Math.round(d.at / 1000), cause: d.cause })),
          attribution: attribution ? { muse: attribution.muse, reflex: attribution.reflex, care: attribution.care, musePct: attribution.musePct } : null,
          decisions: decisions.map((d) => ({ atS: Math.round(d.at / 1000), ...d, at: undefined })),
          decisionsLeftOut: dropped,
        },
      };
    },
  };
}
