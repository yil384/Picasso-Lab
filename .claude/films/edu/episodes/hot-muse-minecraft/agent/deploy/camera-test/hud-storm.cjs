// deploy/camera-test/hud-storm.cjs - a busy game's HUD for a camera stream on the muse-camera-test stack, to measure
// what concept B costs (src/hud-b.js): a new command every 3 s (a toast each, some cut short, a burst folded), the
// body's sub-step twice a second, an item every 1.5 s (a floater), a rule firing every 10 s (the action bar), a new
// goal, a split and a death (banners). Run inside the camera container while camera-bench.sh films:
//   docker exec -e ID=bench-<label> -e RUN_S=150 muse-camera-test-camera-1 node /tmp/hud-storm.cjs
const ID = process.env.ID;
const RUN_S = Number(process.env.RUN_S || 150);
const URL = `http://127.0.0.1:7862/streams/${ID}/caption`;
const post = (term) => fetch(URL, { method: 'POST', body: JSON.stringify({ term }) }).catch(() => {});
const KEYS = ['wooden_pickaxe', 'stone_pickaxe', 'iron_ingot', 'iron_pickaxe', 'diamond', 'diamond_pickaxe', 'water_bucket', 'obsidian', 'flint_and_steel', 'portal', 'nether', 'back'];
const goal = (done) => ({ key: 'nether_and_back', title: 'Nether and back', list: KEYS.map((k, i) => ({ k, t: k.replace(/_/g, ' '), atS: i < done ? 30 + i * 20 : null })) });
const CMDS = [
  ['play', [{ skill: 'collect', args: { block: 'oak_log', n: 5 } }], 'Wood first: logs for planks, a table and sticks.'],
  ['play_sequence', [{ skill: 'craft', args: { item: 'crafting_table', n: 1 } }, { skill: 'craft', args: { item: 'wooden_pickaxe', n: 1 } }], 'The table, then the wooden pickaxe.'],
  ['play', [{ skill: 'collect', args: { block: 'stone', n: 3 } }], 'Cobblestone for the stone pickaxe.'],
  ['play', [{ skill: 'collect', args: { block: 'stone', n: 3 } }], 'Cobblestone for the stone pickaxe.'],
  ['play', [{ skill: 'policy', args: { defend: 'on', escape: 'on', eat_below: 6 } }], 'Night soon: the body fights back and eats when low.'],
  ['play_sequence', [{ skill: 'collect', args: { block: 'iron_ore', n: 3 } }, { skill: 'smelt', args: { item: 'raw_iron', n: 3 } }, { skill: 'craft', args: { item: 'iron_pickaxe', n: 1 } }], 'Iron from the cave under the hill, smelted, then the iron pickaxe.'],
];
const t0 = Date.now();
let s = 0;
let rid = 100;
let n = 0;
const gs = () => Math.round((Date.now() - t0) / 1000) + 5;
post({ caller: 'TEST SCRIPT', game: { id: 'g0b5701', s: gs() }, goal: goal(0), rules: [{ n: 'defend', on: false }], st: { hp: 20, food: 20, clock: 'DAY 08:10', ticks: 2200, muse: 0, reflex: 0, rule: 0, body: 0 }, inv: {},
  lines: [{ k: 'call', t: '> start_game', tool: 'start_game', raw: '{"goal":"nether_and_back"}', rid: 1, src: 'muse' }, { k: 'reply', t: '< New game g0b5701: a new bot. Goal: Nether and back.', rid: 1 }] });
const timer = setInterval(() => {
  s += 0.5;
  const u = { game: { id: 'g0b5701', s: gs() }, sub: { kind: 'collect', text: 'mining', done: Math.floor(s) % 5, of: 5 }, lines: [] };
  if (s % 3 === 0) {
    const [tool, steps, why] = CMDS[n % CMDS.length];
    n += 1; rid += 1;
    u.lines.push({ k: 'call', t: `> ${tool}`, tool, words: why, of: steps.length, rid, raw: JSON.stringify(tool === 'play' ? { ...steps[0], why } : { steps, why }), src: 'muse',
      steps: steps.map((x) => ({ say: x.skill, raw: x.skill, skill: x.skill, args: JSON.stringify(x.args) })) });
    u.live = { mode: 'run', c: n, s: 1 };
    u.st = { muse: n * 2, reflex: Math.floor(n / 3), rule: Math.floor(n / 3), body: 1, hp: 20 - (n % 7), food: 18, ticks: (2200 + s * 400) % 24000, clock: 'DAY 10:00' };
  }
  if (s % 3 === 2) u.lines.push({ k: 'ok', t: 'ok  done (1.2 s)', s: 1, ms: 1200, src: 'muse' }, { k: 'reply', t: '< ok', rid });
  if (s % 1.5 === 0) u.lines.push({ k: 'world', who: 'body', t: s % 3 === 0 ? 'got 2 oak logs' : 'got 1 cobblestone' });
  if (s % 10 === 0) u.lines.push({ k: 'reflex', t: 'rule defend: fought a zombie (killed it)', src: 'rule', rule: 'defend', rs: 20, rc: 5, ago: 0 });
  if (s === 20) u.rules = [{ n: 'defend', on: true, setS: 20, call: 5 }, { n: 'escape', on: true, setS: 20, call: 5 }, { n: 'eat_below', on: true, v: 6, setS: 20, call: 5 }];
  if (s === 30) u.goal = goal(1);
  if (s === 45) u.adv = [{ k: 'stuck', t: 'stuck: 3 calls of collect stone failed the same way (NOT_FOUND); try explore first', sev: 3 }, { k: 'time', t: 'Night in about 90 s; a shelter before then', sev: 2 }];
  if (s === 60) u.goal = { key: 'custom', title: 'Kill 10 pigs', text: 'kill 10 pigs', list: [{ k: 'kill_pig', t: 'pigs killed', done: 2, of: 10, atS: null }] };
  if (s === 90) u.lines.push({ k: 'fail', t: 'death: died: slain by a zombie', ago: 0 });
  post(u);
  if (s >= RUN_S) { clearInterval(timer); console.log(`storm: ${n} commands in ${RUN_S} s`); }
}, 500);
