// src/terminal.js - the terminal under the live video (the agent's side): what the player called, what came back, the
// Body advice, the reflexes, deaths and milestones, as short ASCII lines, and a status line (health, food, the game
// clock, who acted). muse.ai's panel shows only Facebook's player, so this is drawn into the video by the camera
// (src/terminal-panel.js); the agent sends it over the camera service's loopback caption endpoint, for the filmed game
// only. Every line is ASCII, without tokens, keys, addresses or the names of other players.

export const KINDS = Object.freeze(['call', 'ok', 'fail', 'advice', 'reflex', 'body', 'milestone', 'info']);

/** A terminal update from outside (the camera service's caption endpoint): kinds checked, every text cleaned again. */
export function cleanTerm(u) {
  const lines = (Array.isArray(u?.lines) ? u.lines : []).slice(-40)
    .filter((l) => KINDS.includes(l?.k) && typeof l.t === 'string')
    .map((l) => ({ k: l.k, t: clean(l.t) })).filter((l) => l.t);
  return { lines, status: typeof u?.status === 'string' ? clean(u.status, 120) : '' };
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

const word = (v) => String(v ?? '').replace(/_/g, ' ');
const argText = (args) => Object.values(args ?? {}).filter((v) => v !== null && v !== undefined && typeof v !== 'object').map((v) => String(v)).join(' ');

/** One step as Muse wrote it, abbreviated: "collect oak_log 8". */
export function stepSummary(st) {
  if (!st || typeof st !== 'object') return '';
  const skill = st.skill ?? st.name ?? '';
  const args = st.args && typeof st.args === 'object' ? st.args : Object.fromEntries(Object.entries(st).filter(([k]) => !['skill', 'name', 'request_id'].includes(k)));
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
  return { k: 'call', t: clean(`> ${tool}${what ? `: ${what}` : ''}`) };
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
  if (st.status === 'confirmed') return { k: 'ok', t: clean(`ok  ${first || what}${secs(st.ms)}`) };
  if (st.status === 'failed') return { k: 'fail', t: clean(`FAIL ${what}${st.code ? ` ${st.code}` : ''}${first ? `: ${word(first)}` : ''}${secs(st.ms)}`) };
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

/**
 * The feed of one agent: call(game, tool, args) when a call comes in, reply(game, tool, result) when its reply goes
 * out. Each produces {lines: [{k, t}], status} for send(gameId, update), the lines new since the last update of that
 * game: results once, the reflexes and deaths once, the advice when it changes, milestones the first time.
 * @param {{send: (gameId: string, update: {lines: Array<{k: string, t: string}>, status: string}) => void, now?: () => number}} o
 */
export function createTermFeed(o) {
  const now = o.now ?? Date.now;
  const games = new Map(); // id -> {seen: Set, own: number, advice: string, got: Set, startedAt, state, dim}
  const of = (s) => {
    let g = games.get(s.id);
    if (!g) { g = { seen: new Set(), own: -1, advice: '', got: new Set(), startedAt: now(), state: null, dim: null }; games.set(s.id, g); }
    return g;
  };
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
    return statusText(g.state ? { ...g.state, dimension: g.dim ?? undefined } : null, attribution);
  };
  const emit = (s, lines, structured) => {
    try { o.send(s.id, { lines: lines.filter(Boolean).filter((l) => l.t), status: statusOf(s, structured) }); } catch { /* the video goes on without it */ }
  };
  const PLACES = { the_nether: 'entered the Nether', the_end: 'entered the End', overworld: 'back in the Overworld' };
  const elapsed = (g) => {
    const sec = Math.max(0, Math.round((now() - g.startedAt) / 1000));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };
  return {
    call(s, tool, args) {
      if (!s?.id) return;
      emit(s, [callLine(tool, args)], null);
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
        if (line) lines.push(line);
        if (step.status === 'confirmed') {
          for (const [item, n] of Object.entries(step.gained ?? step.delta ?? {})) {
            if (n > 0 && MILESTONES[item] && !g.got.has(item)) { g.got.add(item); lines.push({ k: 'milestone', t: clean(`milestone: ${MILESTONES[item]} at ${elapsed(g)}`) }); }
          }
        }
      }
      if (out?.isError && !(st.steps ?? []).length) {
        const first = String(out.content?.[0]?.text ?? '').split('\n')[0];
        lines.push({ k: 'fail', t: clean(`FAIL ${st.code ?? ''} ${first}`) });
      }
      for (const e of st.onItsOwn ?? []) {
        if (!(e.seq > g.own)) continue;
        g.own = e.seq;
        const death = /death|died/i.test(`${e.kind} ${e.text}`);
        lines.push({ k: death ? 'fail' : e.source === 'reflex' ? 'reflex' : 'body', t: clean(`${death ? 'death' : e.source === 'reflex' ? 'reflex' : 'body'}: ${e.text}`) });
      }
      const advice = (st.advice ?? []).map((a) => clean(a.text, 160)).filter(Boolean);
      const key = advice.join('|');
      if (key !== g.advice) {
        g.advice = key;
        for (const a of advice.slice(0, 3)) lines.push({ k: 'advice', t: `advice: ${a}` });
      }
      // a portal: the first line of the new world
      const dim = dimOf(s);
      if (dim && g.dim && dim !== g.dim) lines.push({ k: 'milestone', t: clean(`${PLACES[dim] ?? `entered ${word(dim)}`} at ${elapsed(g)}`) });
      if (dim) g.dim = dim;
      if (tool === 'end_game') { lines.push({ k: 'info', t: clean(`game over after ${elapsed(g)}`) }); emit(s, lines, st); games.delete(s.id); return; }
      emit(s, lines, st);
    },
    forget: (id) => games.delete(id),
  };
}
