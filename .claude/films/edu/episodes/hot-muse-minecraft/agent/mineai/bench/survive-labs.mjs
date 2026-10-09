// mineai/bench/survive-labs.mjs - the prepared labs of ROADMAP M4 ("the bot survives on its own"): one situation per
// lab, set up with server console commands (prepared evidence, never mixed with the natural runs of survive.mjs), each
// trial a new game through a running agent's /mcp with no model, and the body left alone to deal with it: no step is
// sent unless the lab is about a step (tool). What each lab sets up and what counts as a pass:
//   hunger   day; food drained to 14 or less (the Hunger effect), nothing to eat, two cows summoned near by: a hunt that
//            ends in a meal and food above where the drain left it, within 150 s
//   shelter  night; 16 cobblestone, three zombies summoned 10 blocks away: a closed shelter reported within 30 s and the
//            bot alive with health 14 or more 90 s later
//   bed      night; a white bed: it sleeps (the night passes when no other player is awake) or, when another player is
//            awake, it lies down and then shelters: either reported within 60 s
//   zombie, skeleton, creeper   night with the care's night off (policy night: off, so the reflexes are tested), a stone
//            sword, the mob summoned 4 blocks away: the bot alive 60 s later and the fight or flight reported
//   armor    day; 24 iron ingots and a crafting table: chestplate, leggings and boots worn within 90 s (3 ingots kept)
//   tool     day; a stone pickaxe with 5 uses left, 3 cobblestone, 2 sticks, a crafting table; the step collect stone 12:
//            it works, with a spare crafted on its own (while it waited for the step, or first thing in it)
//   death    day; 16 cobblestone, 5 bread, 3 iron ingots, then killed: the items back (at least 20 of the 24) within 5
//            minutes, reported
// A death the lab did not cause (the server log's death lines for the trial's bot) fails the trial. Reports n, passes,
// the rate, deaths and the p50 and p90 time to the outcome per lab; --out writes every trial.
//
//   node mineai/bench/survive-labs.mjs <agent URL> --console <FIFO> --agent-log <run-serve-*.jsonl> --server-log <latest.log>
//        --labs hunger,shelter,... [--n 20] [--parallel 8] [--spots "x z; x z"] [--label name] [--out dir]
//
// Labs that set the time (night or day) run one kind at a time: a group never shares the world clock with another.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { connect, stateOf, inventoryOf } from '../../test/e2e/mcp-iron.mjs';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    console: { type: 'string' }, 'agent-log': { type: 'string' }, 'server-log': { type: 'string' }, labs: { type: 'string' },
    n: { type: 'string', default: '20' }, parallel: { type: 'string', default: '8' }, spots: { type: 'string', default: '' },
    label: { type: 'string', default: 'labs' }, out: { type: 'string', default: '.' },
  },
});
const url = String(positionals[0] ?? '').replace(/\/+$/, '');
if (!url || !values.console || !values['agent-log'] || !values.labs) {
  console.error('usage: node mineai/bench/survive-labs.mjs <agent URL> --console <FIFO> --agent-log <file> --server-log <file> --labs a,b [--n 20] [--parallel 8] [--spots "x z; ..."]');
  process.exit(64);
}
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const pct = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
const spots = String(values.spots).split(';').map((x) => x.trim().split(/[ ,]+/).map(Number)).filter((x) => x.length === 2 && x.every(Number.isFinite));
const con = (line) => fs.appendFileSync(values.console, `${line}\n`);
const DEATH = /^(was |drowned|died|fell |hit the ground|burned|went up in flames|went off|tried to swim|walked into|suffocated|blew up|starved|froze|experienced|discovered|withered|didn't want to live)/;

/** The private name the agent gave a game's bot (its bot_name row). */
async function botOf(game) {
  for (let i = 0; i < 40; i++) {
    // the private name (MC_WHITELIST: its bot_name row), else the name the bot joined under (bot_ready)
    const rows = fs.readFileSync(values['agent-log'], 'utf8').split('\n').filter((l) => l.includes(game) && /"(bot_name|bot_ready)"/.test(l))
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const m = rows.find((r) => r.kind === 'bot_name' && r.session === game) ?? rows.find((r) => r.kind === 'bot_ready' && r.game === game);
    if (m?.username) return m.username;
    await sleep(250);
  }
  return null;
}
/** Death lines of a bot in the server log since a byte offset. */
function deathsOf(bot, from) {
  if (!values['server-log'] || !fs.existsSync(values['server-log'])) return [];
  const buf = fs.readFileSync(values['server-log']);
  return buf.subarray(Math.min(from, buf.length)).toString('utf8').split('\n')
    .map((l) => /\]: (\S+) (.*)$/.exec(l)).filter((m) => m && m[1] === bot && DEATH.test(m[2])).map((m) => m[2]);
}
const logSize = () => (values['server-log'] && fs.existsSync(values['server-log']) ? fs.statSync(values['server-log']).size : 0);
const vitals = (txt) => {
  const st = stateOf(txt);
  const hf = /^health ([\d.]+)\/20, food (\d+)\/20/m.exec(st);
  return { health: hf ? Number(hf[1]) : null, food: hf ? Number(hf[2]) : null, worn: /^wearing: ([^;\n]*)/m.exec(st)?.[1] ?? '' };
};

/** Each lab: when (day or night), its setup, the steps it sends, and its check on each reply. */
const LABS = {
  hunger: {
    time: 'day', limitS: 150, kinds: ['hunt', 'eat'],
    setup: (bot) => [`effect give ${bot} minecraft:hunger 8 99 true`, `clear ${bot}`],
    after: async (bot) => { await sleep(8_500); con(`effect clear ${bot} minecraft:hunger`); for (const dx of [4, -4]) con(`execute at ${bot} run summon cow ~${dx} ~ ~2`); },
    start: (g) => { g.food0 = g.v.food; },
    pass: (g) => g.food0 !== undefined && g.v.food > g.food0 && g.own.some((e) => e.kind === 'hunt' && e.ok && /ate /.test(e.text)),
  },
  shelter: {
    time: 'night', limitS: 90, holdS: 90, kinds: ['shelter'],
    setup: (bot) => [`clear ${bot}`, `give ${bot} cobblestone 16`, `effect give ${bot} minecraft:instant_health 1 5 true`],
    after: async (bot) => { for (const [dx, dz] of [[10, 0], [-10, 0], [0, 10]]) con(`execute at ${bot} run summon zombie ~${dx} ~ ~${dz}`); },
    done: (g) => g.own.some((e) => e.kind === 'shelter' && e.ok),
    pass: (g) => g.own.some((e) => e.kind === 'shelter' && e.ok && e.atS <= 30) && g.v.health >= 14,
  },
  bed: {
    time: 'night', limitS: 60, alone: true, kinds: ['sleep', 'shelter'],
    setup: (bot) => [`clear ${bot}`, `give ${bot} white_bed 1`, `give ${bot} cobblestone 12`],
    done: (g) => g.own.some((e) => e.kind === 'sleep'),
    pass: (g) => g.own.some((e) => e.kind === 'sleep' && e.ok) || (g.own.some((e) => e.kind === 'sleep') && g.own.some((e) => e.kind === 'shelter' && e.ok)),
  },
  ...Object.fromEntries(['zombie', 'skeleton', 'creeper'].map((mob) => [mob, {
    time: 'night', limitS: 60, holdS: 60, kinds: ['fight', 'flee', 'hide'], steps: [{ skill: 'policy', args: { night: 'off' } }],
    setup: (bot) => [`clear ${bot}`, `give ${bot} stone_sword 1`, `effect give ${bot} minecraft:instant_health 1 5 true`],
    after: async (bot) => { con(`execute at ${bot} run summon ${mob} ~4 ~ ~`); },
    pass: (g) => g.v.health > 0 && g.own.some((e) => ['fight', 'flee', 'hide'].includes(e.kind)),
  }])),
  armor: {
    time: 'day', limitS: 90, kinds: ['armor'],
    setup: (bot) => [`clear ${bot}`, `give ${bot} iron_ingot 24`, `give ${bot} crafting_table 1`],
    done: (g) => /iron_chestplate \(torso\)/.test(g.v.worn) && /iron_leggings \(legs\)/.test(g.v.worn) && /iron_boots \(feet\)/.test(g.v.worn),
    pass: (g) => LABS.armor.done(g) && g.own.some((e) => e.kind === 'armor' && e.ok),
  },
  tool: {
    time: 'day', limitS: 200,
    setup: (bot) => [`clear ${bot}`, `give ${bot} stone_pickaxe[damage=126] 1`, `give ${bot} cobblestone 3`, `give ${bot} stick 2`, `give ${bot} crafting_table 1`],
    steps: [{ skill: 'collect', args: { block: 'stone', n: 12 } }],
    // the spare comes on its own while the bot waits for the step, or first thing in the step
    pass: (g) => g.stepOk === true && (/spare|new stone_pickaxe/.test(g.stepText ?? '') || g.own.some((e) => e.kind === 'tools' && e.source === 'care' && e.ok)),
  },
  death: {
    time: 'day', limitS: 300, expectDeath: true, kinds: ['recover'],
    setup: (bot) => [`clear ${bot}`, `give ${bot} cobblestone 16`, `give ${bot} bread 5`, `give ${bot} iron_ingot 3`],
    after: async (bot) => { await sleep(1_500); con(`kill ${bot}`); },
    done: (g) => g.own.some((e) => e.kind === 'recover'),
    pass: (g) => { const inv = inventoryOf(g.text); return (inv.cobblestone ?? 0) + (inv.bread ?? 0) + (inv.iron_ingot ?? 0) >= 20 && g.own.some((e) => e.kind === 'recover' && e.ok); },
  },
};

const labs = String(values.labs).split(',').map((x) => x.trim()).filter(Boolean);
for (const l of labs) if (!LABS[l]) { console.error(`unknown lab ${l}; labs: ${Object.keys(LABS).join(', ')}`); process.exit(64); }
const n = Number(values.n);
const trials = [];
let spotNo = 0;

async function trial(lab, k) {
  const L = LABS[lab];
  const g = { lab, k, game: null, bot: null, ok: false, deaths: [], own: [], v: {}, text: '', error: null };
  const t0 = Date.now();
  const sec = () => Math.round((Date.now() - t0) / 100) / 10;
  let c;
  try {
    c = await connect(url, `${values.label}-${lab}-${k}`);
    const call = async (tool, args = {}) => {
      const r = await c.callTool({ name: tool, arguments: args }, undefined, { timeout: 120_000 });
      const text = r.content.map((x) => x.text ?? '').join('\n');
      // when it happened, from the setup on (the reply says how long ago)
      for (const e of r.structuredContent?.onItsOwn ?? []) g.own.push({ ...e, atS: g.t1 ? Math.round((Date.now() - g.t1) / 100) / 10 - (e.agoS ?? 0) : null });
      const v = vitals(text);
      if (v.health !== null) { g.v = v; g.text = text; }
      return { r, text };
    };
    let s = await call('start_game', { adult: true });
    while (/in the queue/.test(s.text)) { await sleep(10_000); s = await call('start_game', { adult: true }); }
    g.game = /game (g\w+)/.exec(s.text)?.[1] ?? null;
    g.bot = await botOf(g.game);
    if (!g.bot) throw new Error('no bot name in the agent log');
    const from = logSize();
    if (spots.length) { const [x, z] = spots[spotNo++ % spots.length]; con(`spreadplayers ${x} ${z} 0 1 false ${g.bot}`); await sleep(3_000); }
    for (const st of L.steps?.filter((x) => x.skill === 'policy') ?? []) await call('play', st);
    for (const line of L.setup(g.bot)) con(line);
    await sleep(1_000);
    await call('get_state');
    const t1 = Date.now();
    g.t1 = t1;
    await L.after?.(g.bot);
    if (L.start) { await call('get_state'); L.start(g); }
    for (const st of L.steps?.filter((x) => x.skill !== 'policy') ?? []) {
      let r = await call('play', st);
      let line = r.r.structuredContent?.steps?.find((x) => x.skill === st.skill) ?? null;
      for (let w = 0; w < 8 && line && !['confirmed', 'failed', 'cancelled'].includes(line.status); w++) {
        r = await call('get_state');
        line = r.r.structuredContent?.earlier?.find((x) => x.skill === st.skill) ?? line;
      }
      g.stepOk = line?.status === 'confirmed';
      g.stepText = line?.result ?? r.text.split('\n').slice(0, 3).join(' ').slice(0, 300);
    }
    const end = t1 + L.limitS * 1000;
    while (Date.now() < end) {
      await call('get_state');
      if (L.done?.(g) && !L.holdS) break;
      if (L.holdS && Date.now() - t1 >= L.holdS * 1000) break;
      if (!L.done && !L.holdS && L.pass(g)) break;
      await sleep(3_000);
    }
    g.seconds = Math.round((Date.now() - t1) / 100) / 10;
    g.deaths = deathsOf(g.bot, from);
    const unexpected = L.expectDeath ? g.deaths.slice(1) : g.deaths;
    g.ok = Boolean(L.pass(g)) && unexpected.length === 0;
    g.outcomeS = L.kinds ? g.own.find((e) => L.kinds.includes(e.kind) && e.ok)?.atS ?? null : g.seconds;
    await call('end_game').catch(() => {});
  } catch (err) {
    g.error = String(err?.message ?? err).slice(0, 300);
  } finally {
    await c?.close().catch(() => {});
  }
  console.log(`${lab} #${k}: ${g.ok ? 'PASS' : 'FAIL'} ${g.seconds ?? '?'} s, game ${g.game}, deaths ${g.deaths.length}${g.deaths.length ? ` (${g.deaths.join('; ')})` : ''}; health ${g.v.health}, food ${g.v.food}; on its own: ${g.own.map((e) => `${e.kind}${e.ok ? '' : '(failed)'}`).join(', ') || 'nothing'}${g.error ? `; error ${g.error}` : ''}`);
  if (g.stepText !== undefined) console.log(`    step: ${g.stepOk ? 'ok' : 'NOT ok'}: ${String(g.stepText).slice(0, 300)}`);
  for (const e of g.own) console.log(`    ${e.atS} s ${e.source} ${e.kind}: ${String(e.text).slice(0, 200)}`);
  trials.push(g);
  return g;
}

for (const lab of labs) {
  const L = LABS[lab];
  con(L.time === 'night' ? 'time set 13000' : 'time set 1000');
  const width = L.alone ? 1 : Number(values.parallel);
  for (let k = 0; k < n; k += width) {
    // keep the clock where the lab wants it for the whole group
    con(L.time === 'night' ? 'time set 13000' : 'time set 1000');
    await Promise.all(Array.from({ length: Math.min(width, n - k) }, (_, j) => sleep(j * 1500).then(() => trial(lab, k + j + 1))));
  }
}

const summary = {};
for (const lab of labs) {
  const list = trials.filter((t) => t.lab === lab);
  const times = list.filter((t) => t.ok && t.outcomeS !== null).map((t) => t.outcomeS);
  const deaths = list.reduce((a, t) => a + (LABS[lab].expectDeath ? Math.max(0, t.deaths.length - 1) : t.deaths.length), 0);
  summary[lab] = { n: list.length, pass: list.filter((t) => t.ok).length, rate: list.length ? Math.round((100 * list.filter((t) => t.ok).length) / list.length) : null, deaths, p50S: pct(times, 50), p90S: pct(times, 90), gate: list.length && list.filter((t) => t.ok).length / list.length >= 0.8 && deaths === 0 ? 'pass' : 'fail' };
  console.log(`LAB ${lab}: ${summary[lab].pass}/${summary[lab].n} (${summary[lab].rate}%), deaths ${deaths}, p50 ${summary[lab].p50S} s, p90 ${summary[lab].p90S} s: ${summary[lab].gate}`);
}
fs.mkdirSync(values.out, { recursive: true });
fs.writeFileSync(path.join(values.out, `${values.label}.json`), `${JSON.stringify({ summary, trials }, null, 1)}\n`);
